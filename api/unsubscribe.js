import { neon } from "@neondatabase/serverless";

const SITE_URL = "https://www.lallaveoficial.com";

function isValidToken(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || "").trim());
}

function sendHtml(res, statusCode, html) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(statusCode).send(html);
}

function pageShell({
  eyebrow = "ARCHIVO 066",
  title,
  message,
  actionHtml = "",
}) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} · La Llave</title>
    <meta name="robots" content="noindex,nofollow">
  </head>
  <body style="margin:0;background:#050606;color:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="min-height:100vh;background:#050606;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                 style="max-width:640px;border:1px solid #4a3714;background:#090a0a;">
            <tr>
              <td style="padding:38px 34px 24px 34px;text-align:center;border-bottom:1px solid #3b2c11;">
                <div style="font-size:12px;letter-spacing:4px;color:#e5ad3c;font-weight:700;">
                  ${eyebrow}
                </div>
                <div style="margin-top:14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.1;color:#fffaf0;">
                  ${title}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px;">
                <p style="margin:0 0 28px 0;font-size:16px;line-height:1.75;color:#bdb8ae;text-align:center;">
                  ${message}
                </p>

                ${actionHtml}

                <p style="margin:34px 0 0 0;text-align:center;font-size:12px;line-height:1.6;color:#77736b;">
                  La Llave I: Ciudad Central · ${SITE_URL.replace("https://", "")}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function confirmationPage(token) {
  const safeToken = String(token).replace(/[^a-f0-9]/gi, "");

  const actionHtml = `
    <form method="POST" action="/api/unsubscribe?token=${safeToken}" style="margin:0;text-align:center;">
      <input type="hidden" name="confirm" value="1">
      <button type="submit"
        style="appearance:none;border:0;border-radius:4px;background:#d69b29;color:#090909;
               padding:16px 24px;font-size:13px;font-weight:800;letter-spacing:1.5px;cursor:pointer;">
        CONFIRMAR BAJA
      </button>
    </form>

    <div style="margin-top:16px;text-align:center;">
      <a href="${SITE_URL}/"
         style="color:#c9a456;text-decoration:none;font-size:12px;letter-spacing:1px;">
        VOLVER A CIUDAD CENTRAL
      </a>
    </div>
  `;

  return pageShell({
    eyebrow: "ARCHIVO 066 · CONTROL DE ACCESO",
    title: "CONFIRMAR BAJA",
    message:
      "Si confirmas, dejarás de recibir comunicaciones del Archivo 066. Podrás volver a registrarte en el futuro desde lallaveoficial.com.",
    actionHtml,
  });
}

function successPage() {
  const actionHtml = `
    <div style="text-align:center;">
      <a href="${SITE_URL}/"
         style="display:inline-block;border-radius:4px;background:#d69b29;color:#090909;
                padding:16px 24px;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:1.5px;">
        VOLVER A CIUDAD CENTRAL
      </a>
    </div>
  `;

  return pageShell({
    eyebrow: "ARCHIVO 066 · ACCESO ACTUALIZADO",
    title: "BAJA CONFIRMADA",
    message:
      "Tu dirección fue retirada de las comunicaciones del Archivo 066. No recibirás futuros correos de marketing mientras permanezcas dado de baja.",
    actionHtml,
  });
}

function alreadyUnsubscribedPage() {
  const actionHtml = `
    <div style="text-align:center;">
      <a href="${SITE_URL}/"
         style="display:inline-block;border:1px solid #5b461c;border-radius:4px;color:#d7b35d;
                padding:14px 22px;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.4px;">
        VOLVER AL SITIO
      </a>
    </div>
  `;

  return pageShell({
    eyebrow: "ARCHIVO 066",
    title: "ACCESO YA RETIRADO",
    message:
      "Esta dirección ya estaba dada de baja. No necesitas hacer nada más.",
    actionHtml,
  });
}

function invalidPage() {
  const actionHtml = `
    <div style="text-align:center;">
      <a href="${SITE_URL}/"
         style="display:inline-block;border:1px solid #5b461c;border-radius:4px;color:#d7b35d;
                padding:14px 22px;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.4px;">
        IR A LALLAVEOFICIAL.COM
      </a>
    </div>
  `;

  return pageShell({
    eyebrow: "ARCHIVO 066",
    title: "ENLACE NO VÁLIDO",
    message:
      "Este enlace de baja no es válido o ya no corresponde a un registro disponible.",
    actionHtml,
  });
}

function errorPage() {
  return pageShell({
    eyebrow: "ARCHIVO 066",
    title: "NO PUDIMOS COMPLETAR LA SOLICITUD",
    message:
      "Ocurrió un problema al procesar la baja. Intenta nuevamente en unos minutos o escribe a contacto@lallaveoficial.com.",
    actionHtml: "",
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    if (req.method === "POST") {
      return res.status(500).json({
        ok: false,
        error: "La base de datos no está configurada.",
      });
    }

    return sendHtml(res, 500, errorPage());
  }

  const token = String(req.query?.token || "").trim();

  if (!isValidToken(token)) {
    if (req.method === "POST") {
      return res.status(400).json({
        ok: false,
        error: "Token de baja no válido.",
      });
    }

    return sendHtml(res, 400, invalidPage());
  }

  const sql = neon(databaseUrl);

  let subscriber = null;

  try {
    const rows = await sql`
      SELECT
        id,
        email,
        status,
        unsubscribed_at
      FROM mailing_subscribers
      WHERE unsubscribe_token = ${token}
      LIMIT 1
    `;

    subscriber = rows[0] || null;
  } catch (error) {
    console.error("Unsubscribe lookup error:", {
      message: error?.message,
    });

    if (req.method === "POST") {
      return res.status(500).json({
        ok: false,
        error: "No pudimos procesar la solicitud.",
      });
    }

    return sendHtml(res, 500, errorPage());
  }

  if (!subscriber) {
    if (req.method === "POST") {
      return res.status(404).json({
        ok: false,
        error: "Registro no encontrado.",
      });
    }

    return sendHtml(res, 404, invalidPage());
  }

  /*
   * GET NO elimina la suscripción.
   *
   * Esto es deliberado: algunos sistemas de seguridad y previsualización
   * abren enlaces automáticamente. En GET mostramos una confirmación.
   *
   * El POST sí ejecuta la baja. Esto también permite que los clientes de
   * correo que soportan List-Unsubscribe-Post hagan la baja con un clic.
   */
  if (req.method === "GET") {
    if (subscriber.status === "unsubscribed") {
      return sendHtml(res, 200, alreadyUnsubscribedPage());
    }

    return sendHtml(res, 200, confirmationPage(token));
  }

  // POST: ejecutar la baja real.
  if (subscriber.status === "unsubscribed") {
    const acceptsHtml = String(req.headers.accept || "").includes("text/html");

    if (acceptsHtml) {
      return sendHtml(res, 200, alreadyUnsubscribedPage());
    }

    return res.status(200).json({
      ok: true,
      alreadyUnsubscribed: true,
      message: "La dirección ya estaba dada de baja.",
    });
  }

  try {
    await sql`
      UPDATE mailing_subscribers
      SET
        status = 'unsubscribed',
        unsubscribed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${subscriber.id}
    `;
  } catch (error) {
    console.error("Unsubscribe update error:", {
      subscriberId: subscriber.id,
      message: error?.message,
    });

    const acceptsHtml = String(req.headers.accept || "").includes("text/html");

    if (acceptsHtml) {
      return sendHtml(res, 500, errorPage());
    }

    return res.status(500).json({
      ok: false,
      error: "No pudimos completar la baja.",
    });
  }

  const acceptsHtml = String(req.headers.accept || "").includes("text/html");

  if (acceptsHtml) {
    return sendHtml(res, 200, successPage());
  }

  return res.status(200).json({
    ok: true,
    alreadyUnsubscribed: false,
    message: "Baja confirmada.",
  });
}
