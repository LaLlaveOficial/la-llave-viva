import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const SITE_URL = "https://www.lallaveoficial.com";
const FROM_EMAIL = "Archivo 066 · La Llave <contacto@lallaveoficial.com>";
const REPLY_TO_EMAIL = "contacto@lallaveoficial.com";

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
              <td style="padding:38px 34px 24px 34px;text-align:center;border-bottom:1px solid #3b2c11;">
                <div style="font-size:12px;letter-spacing:4px;color:#e5ad3c;font-weight:700;">
                  ARCHIVO 066
                </div>
                <div style="margin-top:14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;color:#fffaf0;">
                  ACCESO CONCEDIDO
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px 10px 34px;">
                <p style="margin:0 0 22px 0;font-size:17px;line-height:1.7;color:#d8d3c8;">
                  ${greeting} al Archivo 066 ha sido autorizado.
                </p>

                <p style="margin:0 0 22px 0;font-size:16px;line-height:1.75;color:#bdb8ae;">
                  Desde ahora podrás recibir documentos, avances, material clasificado
                  y novedades del universo de <strong style="color:#f4ead7;">La Llave I: Ciudad Central</strong>.
                </p>

                <div style="margin:30px 0;padding:22px;border-left:3px solid #d69b29;background:#0d0e0e;">
                  <div style="font-size:11px;letter-spacing:3px;color:#d69b29;font-weight:700;margin-bottom:12px;">
                    PRIMER EXPEDIENTE DISPONIBLE
                  </div>
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.25;color:#fffaf0;margin-bottom:10px;">
                    Abre el libro. Lee las primeras páginas.
                  </div>
                  <div style="font-size:14px;line-height:1.65;color:#9f9b93;">
                    La muestra oficial ya está disponible en el sitio de La Llave.
                  </div>
                </div>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;">
                  <tr>
                    <td align="center" bgcolor="#d69b29" style="border-radius:4px;">
                      <a href="${SITE_URL}/"
                         style="display:inline-block;padding:16px 26px;color:#090909;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:1.6px;">
                        ENTRAR A CIUDAD CENTRAL
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 8px 0;font-size:15px;line-height:1.7;color:#bdb8ae;">
                  Hay información que no se publica en redes.
                </p>

                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.7;color:#bdb8ae;">
                  Nos vemos dentro.
                </p>

                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#f0e4ce;">
                  Enrique G. Santibáñez
                </p>
                <p style="margin:5px 0 0 0;font-size:12px;letter-spacing:1.5px;color:#8c867c;">
                  LA LLAVE · CIUDAD CENTRAL
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 34px 34px 34px;border-top:1px solid #26200f;text-align:center;">
                <p style="margin:0 0 10px 0;font-size:11px;line-height:1.6;color:#77736b;">
                  Recibes este correo porque solicitaste acceso al Archivo 066 en lallaveoficial.com.
                </p>
                <p style="margin:0;font-size:11px;line-height:1.6;color:#77736b;">
                  Si no deseas recibir futuras comunicaciones,
                  <a href="${unsubscribeUrl}" style="color:#c9a456;text-decoration:underline;">puedes darte de baja aquí</a>.
                </p>
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

async function sendWelcomeEmail({
  apiKey,
  email,
  name,
  subscriberId,
  unsubscribeToken,
}) {
  const { html, text, unsubscribeUrl } = buildWelcomeEmail({
    name,
    unsubscribeToken,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key":
        `archivo066-welcome-${subscriberId}-${unsubscribeToken.slice(0, 16)}`,
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  const databaseUrl = process.env.DATABASE_URL;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!databaseUrl) {
    return res.status(500).json({
      ok: false,
      error: "La base de datos de mailing no está configurada.",
    });
  }

  if (!resendApiKey) {
    return res.status(500).json({
      ok: false,
      error: "El servicio de correo todavía no está configurado.",
    });
  }

  const body = req.body || {};

  // Honeypot: los usuarios reales nunca completan este campo.
  if (cleanText(body.website, 200)) {
    return res.status(200).json({
      ok: true,
      message: "Acceso solicitado.",
    });
  }

  const email = cleanEmail(body.email);
  const name = cleanText(body.name, 80);
  const source = cleanSource(body.source);
  const language = cleanLanguage(body.language);
  const consent = body.consent === true;

  if (!isValidEmail(email)) {
    return res.status(400).json({
      ok: false,
      error: "Ingresa un correo electrónico válido.",
    });
  }

  if (!consent) {
    return res.status(400).json({
      ok: false,
      error:
        "Debes aceptar recibir comunicaciones del Archivo 066 para continuar.",
    });
  }

  const sql = neon(databaseUrl);

  let subscriber = null;
  let shouldSendWelcome = false;

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
    } else {
      return res.status(409).json({
        ok: false,
        error:
          "Este correo no puede reactivarse automáticamente. Escríbenos a contacto@lallaveoficial.com para revisarlo.",
      });
    }
  } catch (error) {
    console.error("Mailing subscriber database error:", {
      email,
      message: error?.message,
    });

    return res.status(500).json({
      ok: false,
      error:
        "No pudimos registrar tu acceso al Archivo 066. Intenta nuevamente.",
    });
  }

  if (!subscriber) {
    return res.status(500).json({
      ok: false,
      error: "No pudimos completar el registro.",
    });
  }

  if (!shouldSendWelcome) {
    return res.status(200).json({
      ok: true,
      alreadySubscribed: true,
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

    return res.status(200).json({
      ok: true,
      alreadySubscribed: false,
      message: "Acceso concedido. Revisa tu correo.",
      emailId: resendData?.id || null,
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
      error:
        "Tu registro quedó guardado, pero no pudimos enviar el correo de bienvenida. Intenta nuevamente en unos minutos.",
    });
  }
}
