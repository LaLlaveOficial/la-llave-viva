import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const SITE_URL = "https://www.lallaveoficial.com";
const FROM_EMAIL = "Archivo 066 · La Llave <contacto@lallaveoficial.com>";
const REPLY_TO_EMAIL = "contacto@lallaveoficial.com";
const EXPEDIENTE_001_DELAY_MS = 48 * 60 * 60 * 1000;

function cleanText(value, maxLength = 120) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

function cleanSource(value) {
  const source = cleanText(value, 60)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");

  return source || "archivo_066";
}

function cleanLanguage(value) {
  const language = cleanText(value, 8)
    .toLowerCase()
    .replace(/[^a-z-]/g, "");

  return language || "es";
}

function isValidEmail(email) {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function createUnsubscribeToken() {
  return randomBytes(32).toString("hex");
}

function createSequenceRunId(subscriberId) {
  return `a066-${subscriberId}-${Date.now()}-${randomBytes(6).toString("hex")}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstNameFrom(name) {
  return cleanText(name, 80).split(/\s+/).filter(Boolean)[0] || "";
}

async function parseResendResponse(response) {
  const responseText = await response.text();
  let data = null;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error?.message ||
        `Resend respondió con estado ${response.status}.`
    );

    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

function buildWelcomeEmail({ name, unsubscribeToken }) {
  const firstName = firstNameFrom(name);
  const safeFirstName = escapeHtml(firstName);
  const greeting = safeFirstName ? `${safeFirstName}, tu acceso` : "Tu acceso";
  const unsubscribeUrl =
    `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Acceso concedido · Archivo 066</title>
  </head>
  <body style="margin:0;padding:0;background:#050606;color:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#050606;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;border:1px solid #4a3714;background:#090a0a;">
            <tr>
              <td style="padding:38px 34px 24px;text-align:center;border-bottom:1px solid #3b2c11;">
                <div style="font-size:12px;letter-spacing:4px;color:#e5ad3c;font-weight:700;">ARCHIVO 066</div>
                <div style="margin-top:14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;color:#fffaf0;">ACCESO CONCEDIDO</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 22px;font-size:17px;line-height:1.7;color:#d8d3c8;">${greeting} al Archivo 066 ha sido autorizado.</p>
                <p style="margin:0 0 22px;font-size:16px;line-height:1.75;color:#bdb8ae;">Desde ahora podrás recibir documentos, avances, material clasificado y novedades del universo de <strong style="color:#f4ead7;">La Llave I: Ciudad Central</strong>.</p>
                <div style="margin:30px 0;padding:22px;border-left:3px solid #d69b29;background:#0d0e0e;">
                  <div style="font-size:11px;letter-spacing:3px;color:#d69b29;font-weight:700;margin-bottom:12px;">PRIMER EXPEDIENTE DISPONIBLE</div>
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.25;color:#fffaf0;margin-bottom:10px;">Abre el libro. Lee las primeras páginas.</div>
                  <div style="font-size:14px;line-height:1.65;color:#9f9b93;">La muestra oficial ya está disponible en el sitio de La Llave.</div>
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;">
                  <tr><td align="center" bgcolor="#d69b29" style="border-radius:4px;"><a href="${SITE_URL}/" style="display:inline-block;padding:16px 26px;color:#090909;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:1.6px;">ENTRAR A CIUDAD CENTRAL</a></td></tr>
                </table>
                <p style="margin:28px 0 8px;font-size:15px;line-height:1.7;color:#bdb8ae;">Hay información que no se publica en redes.</p>
                <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#bdb8ae;">Nos vemos dentro.</p>
                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#f0e4ce;">Enrique G. Santibáñez</p>
                <p style="margin:5px 0 0;font-size:12px;letter-spacing:1.5px;color:#8c867c;">LA LLAVE · CIUDAD CENTRAL</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 34px 34px;border-top:1px solid #26200f;text-align:center;">
                <p style="margin:0 0 10px;font-size:11px;line-height:1.6;color:#77736b;">Recibes este correo porque solicitaste acceso al Archivo 066 en lallaveoficial.com.</p>
                <p style="margin:0;font-size:11px;line-height:1.6;color:#77736b;">Si no deseas recibir futuras comunicaciones, <a href="${unsubscribeUrl}" style="color:#c9a456;text-decoration:underline;">puedes darte de baja aquí</a>.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${firstName ? `${firstName}, tu` : "Tu"} acceso al Archivo 066 ha sido autorizado.

Desde ahora podrás recibir documentos, avances, material clasificado y novedades del universo de La Llave I: Ciudad Central.

PRIMER EXPEDIENTE DISPONIBLE
Abre el libro. Lee las primeras páginas.

Entra a Ciudad Central:
${SITE_URL}/

Hay información que no se publica en redes.

Nos vemos dentro.

Enrique G. Santibáñez
LA LLAVE · CIUDAD CENTRAL

Recibes este correo porque solicitaste acceso al Archivo 066 en lallaveoficial.com.

Darte de baja:
${unsubscribeUrl}`;

  return { html, text, unsubscribeUrl };
}

function buildExpediente001Email({ unsubscribeToken }) {
  const unsubscribeUrl =
    `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>EXPEDIENTE 001 · Hay algo que no encaja</title>
  </head>
  <body style="margin:0;padding:0;background:#050606;color:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Ciudad Central parece funcionar perfectamente. Ese es precisamente el problema.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#050606;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;border:1px solid #4a3714;background:#090a0a;">
            <tr>
              <td style="padding:38px 34px 24px;text-align:center;border-bottom:1px solid #3b2c11;">
                <div style="font-size:11px;letter-spacing:4px;color:#e5ad3c;font-weight:700;">ARCHIVO 066</div>
                <div style="margin-top:12px;font-size:12px;letter-spacing:3px;color:#8d887f;font-weight:700;">EXPEDIENTE 001</div>
                <div style="margin-top:18px;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.08;color:#fffaf0;">HAY ALGO QUE NO ENCAJA.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#c6c0b5;">Ciudad Central funciona.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#aaa59c;">Las calles siguen su curso.<br>Las oficinas abren a la hora indicada.<br>Los edificios permanecen encendidos.<br>La gente llega, trabaja, vuelve a casa.</p>
                <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.45;color:#f4ead7;">Todo parece normal.<br>Demasiado normal.</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#aaa59c;">Porque cuando una ciudad necesita recordarte constantemente que todo está bajo control, quizá la pregunta correcta no sea:</p>
                <p style="margin:24px 0;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.4;color:#fffaf0;">¿Quién mantiene el orden?</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#aaa59c;">Sino:</p>
                <p style="margin:24px 0 34px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.4;color:#e7b84e;">¿Qué ocurriría si alguien descubriera aquello que el orden necesita ocultar?</p>

                <div style="margin:30px 0;padding:24px;border-left:3px solid #d69b29;background:#0d0e0e;">
                  <div style="font-size:11px;letter-spacing:3px;color:#d69b29;font-weight:700;margin-bottom:16px;">REGISTRO PARCIAL</div>
                  <p style="margin:0 0 13px;font-size:15px;line-height:1.75;color:#b8b2a8;">Hay números que parecen números.</p>
                  <p style="margin:0 0 13px;font-size:15px;line-height:1.75;color:#b8b2a8;">Hay símbolos que parecen decoración.</p>
                  <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#b8b2a8;">Hay puertas que nadie mira dos veces.</p>
                  <p style="margin:0 0 8px;font-size:15px;line-height:1.75;color:#b8b2a8;">Hasta que alguien encuentra una razón para hacerlo.</p>
                  <p style="margin:0;font-size:15px;line-height:1.75;color:#b8b2a8;">Y entonces aparece una cifra.</p>
                  <div style="margin-top:22px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:54px;line-height:1;color:#e7b84e;">066</div>
                  <p style="margin:20px 0 0;text-align:center;font-size:14px;line-height:1.7;color:#918c83;">No necesitas entenderla todavía.<br>Solo recordar que la viste.</p>
                </div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0;border-top:1px solid #2c2516;border-bottom:1px solid #2c2516;">
                  <tr><td style="padding:18px 0;font-size:11px;line-height:1.8;color:#8e897f;letter-spacing:1.4px;"><strong style="color:#d7b35d;">ESTADO DEL EXPEDIENTE:</strong> PARCIAL<br><strong style="color:#d7b35d;">NIVEL DE ACCESO:</strong> AUTORIZADO<br><strong style="color:#d7b35d;">SIGUIENTE REGISTRO:</strong> PENDIENTE</td></tr>
                </table>

                <p style="margin:28px 0 8px;text-align:center;font-size:16px;line-height:1.75;color:#bdb8ae;">Porque ya abriste la primera puerta.</p>
                <p style="margin:0 0 28px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.45;color:#fffaf0;">Ahora empieza lo difícil:<br>decidir cuánto quieres saber.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;">
                  <tr><td align="center" bgcolor="#d69b29" style="border-radius:4px;"><a href="${SITE_URL}/" style="display:inline-block;padding:16px 26px;color:#090909;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.6px;">VOLVER A CIUDAD CENTRAL</a></td></tr>
                </table>
                <p style="margin:0 0 5px;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#f0e4ce;">Enrique G. Santibáñez</p>
                <p style="margin:0;font-size:12px;letter-spacing:1.5px;color:#8c867c;">LA LLAVE I · CIUDAD CENTRAL</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 34px 34px;border-top:1px solid #26200f;text-align:center;">
                <p style="margin:0 0 10px;font-size:11px;line-height:1.6;color:#77736b;">Este mensaje forma parte del acceso que solicitaste al Archivo 066 en lallaveoficial.com.</p>
                <p style="margin:0;font-size:11px;line-height:1.6;color:#77736b;">Si no deseas recibir futuras comunicaciones, <a href="${unsubscribeUrl}" style="color:#c9a456;text-decoration:underline;">puedes darte de baja aquí</a>.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `ARCHIVO 066
EXPEDIENTE 001

HAY ALGO QUE NO ENCAJA.

Ciudad Central funciona.

Las calles siguen su curso.
Las oficinas abren a la hora indicada.
Los edificios permanecen encendidos.
La gente llega, trabaja, vuelve a casa.

Todo parece normal.
Demasiado normal.

Porque cuando una ciudad necesita recordarte constantemente que todo está bajo control, quizá la pregunta correcta no sea:

¿Quién mantiene el orden?

Sino:

¿Qué ocurriría si alguien descubriera aquello que el orden necesita ocultar?

REGISTRO PARCIAL

Hay números que parecen números.
Hay símbolos que parecen decoración.
Hay puertas que nadie mira dos veces.

Hasta que alguien encuentra una razón para hacerlo.

Y entonces aparece una cifra.

066

No necesitas entenderla todavía.
Solo recordar que la viste.

ESTADO DEL EXPEDIENTE: PARCIAL
NIVEL DE ACCESO: AUTORIZADO
SIGUIENTE REGISTRO: PENDIENTE

Porque ya abriste la primera puerta.

Ahora empieza lo difícil:
decidir cuánto quieres saber.

VOLVER A CIUDAD CENTRAL
${SITE_URL}/

Enrique G. Santibáñez
LA LLAVE I · CIUDAD CENTRAL

Este mensaje forma parte del acceso que solicitaste al Archivo 066 en lallaveoficial.com.

Darte de baja:
${unsubscribeUrl}`;

  return { html, text, unsubscribeUrl };
}

async function sendWelcomeEmail({ apiKey, email, name, subscriberId, unsubscribeToken }) {
  const { html, text, unsubscribeUrl } = buildWelcomeEmail({ name, unsubscribeToken });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `archivo066-welcome-${subscriberId}-${unsubscribeToken.slice(0, 16)}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      reply_to: REPLY_TO_EMAIL,
      subject: "ACCESO CONCEDIDO · ARCHIVO 066",
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "category", value: "archivo066" },
        { name: "type", value: "welcome" },
      ],
    }),
  });

  return parseResendResponse(response);
}

async function cancelScheduledResendEmail({ apiKey, emailId }) {
  if (!emailId) return;

  const response = await fetch(
    `https://api.resend.com/emails/${encodeURIComponent(emailId)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    }
  );

  return parseResendResponse(response);
}

async function hasActiveExpediente001({ sql, subscriberId }) {
  const rows = await sql`
    SELECT id
    FROM mailing_sequence_emails
    WHERE subscriber_id = ${subscriberId}
      AND step_number = 2
      AND status IN ('scheduled', 'sent')
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return Boolean(rows[0]);
}

async function scheduleExpediente001({ apiKey, sql, subscriber }) {
  const subject = "EXPEDIENTE 001 · Hay algo que no encaja";
  const scheduledAt = new Date(Date.now() + EXPEDIENTE_001_DELAY_MS).toISOString();
  const sequenceRunId = createSequenceRunId(subscriber.id);
  const { html, text, unsubscribeUrl } = buildExpediente001Email({
    unsubscribeToken: subscriber.unsubscribe_token,
  });

  const rows = await sql`
    INSERT INTO mailing_sequence_emails (
      subscriber_id,
      sequence_run_id,
      step_number,
      email_key,
      subject,
      scheduled_for,
      status,
      error_message,
      created_at,
      updated_at
    )
    VALUES (
      ${subscriber.id},
      ${sequenceRunId},
      2,
      'expediente_001',
      ${subject},
      ${scheduledAt},
      'failed',
      'Pendiente de programación en Resend',
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const sequenceRow = rows[0];
  let resendData = null;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `archivo066-exp001-${sequenceRunId}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [subscriber.email],
        reply_to: REPLY_TO_EMAIL,
        subject,
        html,
        text,
        scheduled_at: scheduledAt,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "category", value: "archivo066" },
          { name: "type", value: "sequence_02" },
          { name: "sequence", value: "expediente_001" },
        ],
      }),
    });

    resendData = await parseResendResponse(response);
  } catch (error) {
    await sql`
      UPDATE mailing_sequence_emails
      SET
        status = 'failed',
        error_message = ${cleanText(error?.message || "Error al programar en Resend", 500)},
        updated_at = NOW()
      WHERE id = ${sequenceRow.id}
    `;

    throw error;
  }

  try {
    await sql`
      UPDATE mailing_sequence_emails
      SET
        resend_email_id = ${resendData?.id || null},
        status = 'scheduled',
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ${sequenceRow.id}
    `;
  } catch (error) {
    if (resendData?.id) {
      try {
        await cancelScheduledResendEmail({
          apiKey,
          emailId: resendData.id,
        });
      } catch (cancelError) {
        console.error("Sequence emergency cancellation error:", {
          resendEmailId: resendData.id,
          message: cancelError?.message,
        });
      }
    }

    throw error;
  }

  return {
    sequenceRunId,
    scheduledAt,
    resendEmailId: resendData?.id || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Método no permitido." });
  }

  const databaseUrl = process.env.DATABASE_URL;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!databaseUrl) {
    return res.status(500).json({ ok: false, error: "La base de datos de mailing no está configurada." });
  }

  if (!resendApiKey) {
    return res.status(500).json({ ok: false, error: "El servicio de correo todavía no está configurado." });
  }

  const body = req.body || {};

  if (cleanText(body.website, 200)) {
    return res.status(200).json({ ok: true, message: "Acceso solicitado." });
  }

  const email = cleanEmail(body.email);
  const name = cleanText(body.name, 80);
  const source = cleanSource(body.source);
  const language = cleanLanguage(body.language);
  const consent = body.consent === true;

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "Ingresa un correo electrónico válido." });
  }

  if (!consent) {
    return res.status(400).json({
      ok: false,
      error: "Debes aceptar recibir comunicaciones del Archivo 066 para continuar.",
    });
  }

  const sql = neon(databaseUrl);
  let subscriber = null;
  let shouldSendWelcome = false;
  let shouldEnsureSequence = false;

  try {
    const existingRows = await sql`
      SELECT
        id,
        email,
        name,
        status,
        unsubscribe_token,
        last_email_sent_at
      FROM mailing_subscribers
      WHERE email = ${email}
      LIMIT 1
    `;

    const existing = existingRows[0] || null;

    if (!existing) {
      const unsubscribeToken = createUnsubscribeToken();

      const insertedRows = await sql`
        INSERT INTO mailing_subscribers (
          email,
          name,
          status,
          source,
          language,
          consent_method,
          consent_version,
          consent_at,
          unsubscribe_token,
          created_at,
          updated_at
        )
        VALUES (
          ${email},
          ${name || null},
          'active',
          ${source},
          ${language},
          'web_form',
          'archivo066-v1',
          NOW(),
          ${unsubscribeToken},
          NOW(),
          NOW()
        )
        RETURNING
          id,
          email,
          name,
          status,
          unsubscribe_token,
          last_email_sent_at
      `;

      subscriber = insertedRows[0];
      shouldSendWelcome = true;
      shouldEnsureSequence = true;
    } else if (existing.status === "active") {
      const updatedRows = await sql`
        UPDATE mailing_subscribers
        SET
          name = COALESCE(${name || null}, name),
          source = ${source},
          language = ${language},
          consent_method = 'web_form',
          consent_version = 'archivo066-v1',
          consent_at = NOW(),
          updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING
          id,
          email,
          name,
          status,
          unsubscribe_token,
          last_email_sent_at
      `;

      subscriber = updatedRows[0];
      shouldSendWelcome = !subscriber.last_email_sent_at;
      shouldEnsureSequence = true;
    } else if (existing.status === "unsubscribed") {
      const unsubscribeToken = createUnsubscribeToken();

      const reactivatedRows = await sql`
        UPDATE mailing_subscribers
        SET
          name = COALESCE(${name || null}, name),
          status = 'active',
          source = ${source},
          language = ${language},
          consent_method = 'web_form',
          consent_version = 'archivo066-v1',
          consent_at = NOW(),
          unsubscribe_token = ${unsubscribeToken},
          unsubscribed_at = NULL,
          last_email_sent_at = NULL,
          updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING
          id,
          email,
          name,
          status,
          unsubscribe_token,
          last_email_sent_at
      `;

      subscriber = reactivatedRows[0];
      shouldSendWelcome = true;
      shouldEnsureSequence = true;
    } else {
      return res.status(409).json({
        ok: false,
        error: "Este correo no puede reactivarse automáticamente. Escríbenos a contacto@lallaveoficial.com para revisarlo.",
      });
    }
  } catch (error) {
    console.error("Mailing subscriber database error:", { email, message: error?.message });

    return res.status(500).json({
      ok: false,
      error: "No pudimos registrar tu acceso al Archivo 066. Intenta nuevamente.",
    });
  }

  if (!subscriber) {
    return res.status(500).json({ ok: false, error: "No pudimos completar el registro." });
  }

  if (!shouldSendWelcome) {
    let sequenceScheduled = false;

    if (shouldEnsureSequence) {
      try {
        const exists = await hasActiveExpediente001({
          sql,
          subscriberId: subscriber.id,
        });

        if (!exists) {
          await scheduleExpediente001({
            apiKey: resendApiKey,
            sql,
            subscriber,
          });
        }

        sequenceScheduled = true;
      } catch (error) {
        console.error("Sequence recovery error:", {
          subscriberId: subscriber.id,
          email: subscriber.email,
          message: error?.message,
          status: error?.status,
          details: error?.details,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      alreadySubscribed: true,
      sequenceScheduled,
      message: "Tu acceso al Archivo 066 ya está activo.",
    });
  }

  try {
    const resendData = await sendWelcomeEmail({
      apiKey: resendApiKey,
      email: subscriber.email,
      name: subscriber.name,
      subscriberId: subscriber.id,
      unsubscribeToken: subscriber.unsubscribe_token,
    });

    await sql`
      UPDATE mailing_subscribers
      SET
        last_email_sent_at = NOW(),
        updated_at = NOW()
      WHERE id = ${subscriber.id}
    `;

    let sequenceData = null;

    try {
      sequenceData = await scheduleExpediente001({
        apiKey: resendApiKey,
        sql,
        subscriber,
      });
    } catch (sequenceError) {
      console.error("Expediente 001 scheduling error:", {
        subscriberId: subscriber.id,
        email: subscriber.email,
        message: sequenceError?.message,
        status: sequenceError?.status,
        details: sequenceError?.details,
      });
    }

    return res.status(200).json({
      ok: true,
      alreadySubscribed: false,
      message: "Acceso concedido. Revisa tu correo.",
      emailId: resendData?.id || null,
      sequenceScheduled: Boolean(sequenceData),
      expediente001ScheduledAt: sequenceData?.scheduledAt || null,
    });
  } catch (error) {
    console.error("Resend welcome email error:", {
      subscriberId: subscriber.id,
      email: subscriber.email,
      status: error?.status,
      message: error?.message,
      details: error?.details,
    });

    return res.status(502).json({
      ok: false,
      subscribed: true,
      error: "Tu registro quedó guardado, pero no pudimos enviar el correo de bienvenida. Intenta nuevamente en unos minutos.",
    });
  }
}
