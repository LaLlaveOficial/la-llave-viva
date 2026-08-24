import {
  PROMO_CODE,
  PROMO_VALID_FROM,
  PROMO_VALID_UNTIL,
  cleanEmail,
  cleanText,
  createUnsubscribeToken,
  ensurePromoTables,
  getPromoEntitlement,
  getSql,
  isPromoCampaignActive,
  isValidEmail,
  sendPromoWelcome,
  schedulePromoSequence,
} from "../lib/ajraz10.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Método no permitido." });
  }

  const body = req.body || {};
  if (cleanText(body.website, 200)) {
    return res.status(200).json({ ok: true, message: "Acceso solicitado." });
  }

  if (!isPromoCampaignActive()) {
    return res.status(403).json({
      ok: false,
      error: "AJRAZ10 se activa el 24 de agosto de 2026 a las 00:00, hora de Chile, y estará disponible hasta el 30 de septiembre.",
    });
  }

  const email = cleanEmail(body.email);
  const name = cleanText(body.name, 80);
  const consent = body.consent === true;

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "Ingresa un correo electrónico válido." });
  }
  if (!consent) {
    return res.status(400).json({ ok: false, error: "Debes aceptar recibir comunicaciones del Archivo 066 para desbloquear el beneficio." });
  }
  if (!process.env.DATABASE_URL || !process.env.RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: "El sistema de acceso todavía no está completamente configurado." });
  }

  const sql = getSql();

  try {
    await ensurePromoTables(sql);

    const existingRows = await sql`
      SELECT id, email, name, status, unsubscribe_token, last_email_sent_at
      FROM mailing_subscribers
      WHERE email = ${email}
      LIMIT 1
    `;
    const existing = existingRows[0] || null;
    let subscriber = null;
    let isNewOrReactivated = false;

    if (!existing) {
      const token = createUnsubscribeToken();
      const rows = await sql`
        INSERT INTO mailing_subscribers (
          email, name, status, source, language, consent_method, consent_version,
          consent_at, unsubscribe_token, created_at, updated_at
        ) VALUES (
          ${email}, ${name || null}, 'active', 'popup_ajraz10', 'es', 'web_form',
          'archivo066-ajraz10-v1', NOW(), ${token}, NOW(), NOW()
        )
        RETURNING id, email, name, status, unsubscribe_token, last_email_sent_at
      `;
      subscriber = rows[0];
      isNewOrReactivated = true;
    } else if (existing.status === "unsubscribed") {
      const token = createUnsubscribeToken();
      const rows = await sql`
        UPDATE mailing_subscribers
        SET name = COALESCE(${name || null}, name), status = 'active', source = 'popup_ajraz10',
            language = 'es', consent_method = 'web_form', consent_version = 'archivo066-ajraz10-v1',
            consent_at = NOW(), unsubscribe_token = ${token}, unsubscribed_at = NULL, updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING id, email, name, status, unsubscribe_token, last_email_sent_at
      `;
      subscriber = rows[0];
      isNewOrReactivated = true;
    } else {
      const rows = await sql`
        UPDATE mailing_subscribers
        SET name = COALESCE(${name || null}, name), consent_at = NOW(), updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING id, email, name, status, unsubscribe_token, last_email_sent_at
      `;
      subscriber = rows[0];
    }

    const previousEntitlement = await getPromoEntitlement(sql, email, PROMO_CODE);
    const entitlementRows = await sql`
      INSERT INTO promo_entitlements (
        email, code, status, source, valid_from, valid_until, granted_at, updated_at
      ) VALUES (
        ${email}, ${PROMO_CODE}, 'active', 'popup_ajraz10', ${PROMO_VALID_FROM}, ${PROMO_VALID_UNTIL}, NOW(), NOW()
      )
      ON CONFLICT (email, code)
      DO UPDATE SET status = 'active', source = 'popup_ajraz10', valid_from = EXCLUDED.valid_from,
                    valid_until = EXCLUDED.valid_until, updated_at = NOW()
      RETURNING id, email, code, status, email_sent_at
    `;
    const entitlement = entitlementRows[0];

    let emailSent = Boolean(entitlement.email_sent_at);
    if (!emailSent) {
      await sendPromoWelcome({
        apiKey: process.env.RESEND_API_KEY,
        subscriber,
        existingSubscriber: Boolean(existing && existing.status === "active"),
      });
      await sql`UPDATE promo_entitlements SET email_sent_at = NOW(), updated_at = NOW() WHERE id = ${entitlement.id}`;
      await sql`UPDATE mailing_subscribers SET last_email_sent_at = NOW(), updated_at = NOW() WHERE id = ${subscriber.id}`;
      emailSent = true;
    }

    let sequence = null;
    if (isNewOrReactivated) {
      sequence = await schedulePromoSequence({ apiKey: process.env.RESEND_API_KEY, sql, subscriber });
    }

    return res.status(200).json({
      ok: true,
      code: PROMO_CODE,
      email,
      emailSent,
      alreadyGranted: Boolean(previousEntitlement?.status === "active" && previousEntitlement?.email_sent_at),
      sequenceScheduled: Boolean(sequence),
      message: "Acceso AJRAZ10 autorizado. Revisa tu correo.",
    });
  } catch (error) {
    console.error("AJRAZ10 subscribe error", { email, message: error?.message, details: error?.details });
    return res.status(500).json({ ok: false, error: "No pudimos habilitar AJRAZ10 en este momento. Intenta nuevamente en unos minutos." });
  }
}
