import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const SITE_URL = "https://www.lallaveoficial.com";
const BOOK_URL = `${SITE_URL}/#compra-directa`;
const FROM_EMAIL = "Archivo 066 · La Llave <contacto@lallaveoficial.com>";
const REPLY_TO_EMAIL = "contacto@lallaveoficial.com";
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SCHEDULE_LEAD_MS = 60 * 1000;

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

function unsubscribeUrlFromToken(unsubscribeToken) {
  return `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
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
  const unsubscribeUrl = unsubscribeUrlFromToken(unsubscribeToken);

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
  const unsubscribeUrl = unsubscribeUrlFromToken(unsubscribeToken);

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

function buildSenalInterceptadaEmail({ unsubscribeToken }) {
  const unsubscribeUrl = unsubscribeUrlFromToken(unsubscribeToken);

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SEÑAL INTERCEPTADA · CÓDIGO 066</title>
  </head>
  <body style="margin:0;padding:0;background:#050606;color:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">La transmisión duró apenas unos segundos. Fue suficiente.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#050606;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;border:1px solid #4a3714;background:#090a0a;">
            <tr>
              <td style="padding:38px 34px 24px;text-align:center;border-bottom:1px solid #3b2c11;">
                <div style="font-size:11px;letter-spacing:4px;color:#e5ad3c;font-weight:700;">ARCHIVO 066</div>
                <div style="margin-top:12px;font-size:12px;letter-spacing:3px;color:#8d887f;font-weight:700;">SEÑAL INTERCEPTADA</div>
                <div style="margin-top:18px;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.08;color:#fffaf0;">CÓDIGO 066</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#c6c0b5;">La transmisión apareció sin aviso.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#aaa59c;">No tenía remitente.<br>No tenía origen identificable.<br>Y permaneció activa durante <strong style="color:#f4ead7;">66 segundos</strong>.</p>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.75;color:#aaa59c;">Después desapareció.</p>

                <div style="margin:30px 0;padding:24px;border-left:3px solid #d69b29;background:#0d0e0e;">
                  <div style="font-size:11px;letter-spacing:3px;color:#d69b29;font-weight:700;margin-bottom:16px;">REGISTRO PARCIAL DE INTERCEPCIÓN</div>
                  <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.9;color:#b8b2a8;">…mantener el perímetro…<br>…no responder a la señal…<br>…repito: no responder…<br>…el acceso no estaba previsto…<br>…066…</p>
                  <div style="margin-top:18px;font-size:11px;letter-spacing:2px;color:#77736b;">[FIN DE TRANSMISIÓN]</div>
                </div>

                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Podría haber sido ruido.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Una interferencia.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#aaa59c;">Un error dentro de algún sistema de Ciudad Central.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#c6c0b5;">Eso sería lo más sencillo.</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#aaa59c;">Pero existe un problema.</p>
                <p style="margin:0 0 22px;font-size:16px;line-height:1.75;color:#aaa59c;">La cifra ya había aparecido antes.</p>
                <div style="margin:18px 0 26px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:54px;line-height:1;color:#e7b84e;">066</div>
                <p style="margin:0 0 30px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.45;color:#f4ead7;text-align:center;">Y cuando una coincidencia se repite demasiadas veces, deja de ser una coincidencia.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0;border-top:1px solid #2c2516;border-bottom:1px solid #2c2516;">
                  <tr><td style="padding:18px 0;font-size:11px;line-height:1.9;color:#8e897f;letter-spacing:1.3px;"><strong style="color:#d7b35d;">ANÁLISIS DEL ARCHIVO</strong><br><br>ORIGEN: DESCONOCIDO<br>DURACIÓN: 00:01:06<br>NIVEL DE ACCESO: NO REGISTRADO<br>REFERENCIA DETECTADA: <strong style="color:#d7b35d;">066</strong><br>ESTADO: <strong style="color:#d7b35d;">INTERCEPCIÓN INCOMPLETA</strong></td></tr>
                </table>

                <p style="margin:28px 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Alguien intentó cerrar la transmisión.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Alguien no quería que quedara registro.</p>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.75;color:#c6c0b5;">Pero quedó.</p>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.75;color:#c6c0b5;">Y ahora tú también sabes que existe.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">No necesitas comprenderlo todavía.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#aaa59c;">Solo recuerda una cosa:</p>
                <p style="margin:24px 0 34px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.45;color:#fffaf0;">si vuelves a encontrar el 066, probablemente no esté ahí por accidente.</p>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;">
                  <tr><td align="center" bgcolor="#d69b29" style="border-radius:4px;"><a href="${SITE_URL}/" style="display:inline-block;padding:16px 26px;color:#090909;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.6px;">ENTRAR A CIUDAD CENTRAL</a></td></tr>
                </table>

                <p style="margin:28px 0 8px;text-align:center;font-size:15px;line-height:1.7;color:#bdb8ae;">Hay historias que empiezan cuando alguien abre una puerta.</p>
                <p style="margin:0 0 28px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.45;color:#f4ead7;">Otras empiezan cuando descubre que esa puerta nunca debió estar ahí.</p>
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
SEÑAL INTERCEPTADA

CÓDIGO 066

La transmisión apareció sin aviso.

No tenía remitente.
No tenía origen identificable.
Y permaneció activa durante 66 segundos.

Después desapareció.

REGISTRO PARCIAL DE INTERCEPCIÓN

…mantener el perímetro…
…no responder a la señal…
…repito: no responder…
…el acceso no estaba previsto…
…066…

[FIN DE TRANSMISIÓN]

Podría haber sido ruido.
Una interferencia.
Un error dentro de algún sistema de Ciudad Central.

Eso sería lo más sencillo.

Pero existe un problema.
La cifra ya había aparecido antes.

066

Y cuando una coincidencia se repite demasiadas veces, deja de ser una coincidencia.

ANÁLISIS DEL ARCHIVO
ORIGEN: DESCONOCIDO
DURACIÓN: 00:01:06
NIVEL DE ACCESO: NO REGISTRADO
REFERENCIA DETECTADA: 066
ESTADO: INTERCEPCIÓN INCOMPLETA

Alguien intentó cerrar la transmisión.
Alguien no quería que quedara registro.
Pero quedó.

Y ahora tú también sabes que existe.

No necesitas comprenderlo todavía.
Solo recuerda una cosa:

si vuelves a encontrar el 066, probablemente no esté ahí por accidente.

ENTRAR A CIUDAD CENTRAL
${SITE_URL}/

Hay historias que empiezan cuando alguien abre una puerta.
Otras empiezan cuando descubre que esa puerta nunca debió estar ahí.

Enrique G. Santibáñez
LA LLAVE I · CIUDAD CENTRAL

Este mensaje forma parte del acceso que solicitaste al Archivo 066 en lallaveoficial.com.

Darte de baja:
${unsubscribeUrl}`;

  return { html, text, unsubscribeUrl };
}

function buildDetrasDeLaLlaveEmail({ unsubscribeToken }) {
  const unsubscribeUrl = unsubscribeUrlFromToken(unsubscribeToken);

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>DETRÁS DE LA LLAVE</title>
  </head>
  <body style="margin:0;padding:0;background:#050606;color:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Antes de Ciudad Central, antes del 066, hubo una idea que se negó a desaparecer.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#050606;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;border:1px solid #4a3714;background:#090a0a;">
            <tr>
              <td style="padding:38px 34px 24px;text-align:center;border-bottom:1px solid #3b2c11;">
                <div style="font-size:11px;letter-spacing:4px;color:#e5ad3c;font-weight:700;">ARCHIVO 066</div>
                <div style="margin-top:12px;font-size:12px;letter-spacing:3px;color:#8d887f;font-weight:700;">REGISTRO DE ORIGEN</div>
                <div style="margin-top:18px;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.08;color:#fffaf0;">DETRÁS DE LA LLAVE</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Hasta ahora te he hablado desde Ciudad Central.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">De expedientes.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">De señales.</p>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.75;color:#aaa59c;">De una cifra que aparece donde quizá no debería.</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#c6c0b5;">Pero detrás de todo eso hay algo mucho más simple.</p>
                <p style="margin:24px 0 34px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.45;color:#f4ead7;">Una historia que necesitaba existir.</p>

                <div style="margin:30px 0;padding:24px;border-left:3px solid #d69b29;background:#0d0e0e;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#b8b2a8;"><em>La Llave</em> no comenzó con una campaña.</p>
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#b8b2a8;">Tampoco con una estrategia.</p>
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#b8b2a8;">Comenzó con una idea.</p>
                  <p style="margin:0;font-size:16px;line-height:1.75;color:#b8b2a8;">Una de esas que aparecen, se quedan dando vueltas y, por más que uno intente seguir con su vida normal, <strong style="color:#f4ead7;">se niegan a desaparecer</strong>.</p>
                </div>

                <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#aaa59c;">Ciudad Central empezó a crecer de esa forma.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Primero fue una imagen.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Después una pregunta.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#aaa59c;">Luego aparecieron lugares, personajes, reglas, secretos.</p>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.75;color:#aaa59c;">Y en algún momento dejó de sentirse como una idea.</p>
                <p style="margin:22px 0 32px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.45;color:#fffaf0;">Empezó a sentirse como un lugar.</p>

                <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#aaa59c;">Durante mucho tiempo trabajé en silencio.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Escribiendo.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Reescribiendo.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Eliminando páginas.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Volviendo a empezar.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#aaa59c;">Preguntándome si aquello que tenía en la cabeza conseguiría algún día transformarse en algo que otra persona pudiera abrir, leer y recorrer.</p>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.75;color:#c6c0b5;">Hasta que finalmente ocurrió.</p>
                <p style="margin:24px 0 34px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.45;color:#e7b84e;">LA LLAVE I: CIUDAD CENTRAL</p>

                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Hay algo extraño en publicar una historia.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Durante años pertenece solamente a quien la escribe.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Uno conoce los pasillos. Las conversaciones. Los secretos. Sabe qué puerta conduce a dónde.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Pero en cuanto alguien abre el libro, eso cambia.</p>
                <p style="margin:24px 0 30px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.45;color:#fffaf0;">La historia deja de ser solamente tuya.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Ahora existe también dentro de otra persona.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Y esa es probablemente la parte que más me interesa de todo esto.</p>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.75;color:#aaa59c;">No simplemente que leas <em>La Llave</em>. Sino descubrir qué ves tú cuando entras en Ciudad Central.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0;border-top:1px solid #2c2516;border-bottom:1px solid #2c2516;">
                  <tr><td style="padding:18px 0;font-size:11px;line-height:1.9;color:#8e897f;letter-spacing:1.3px;"><strong style="color:#d7b35d;">REGISTRO DEL AUTOR</strong><br><br>AUTOR: Enrique G. Santibáñez<br>PROYECTO: La Llave<br>ARCHIVO: 066<br>ESTADO: <strong style="color:#d7b35d;">EN EXPANSIÓN</strong></td></tr>
                </table>

                <p style="margin:28px 0 14px;text-align:center;font-size:16px;line-height:1.75;color:#bdb8ae;">Si llegaste hasta este correo, ya conoces una pequeña parte del mundo.</p>
                <p style="margin:0 0 14px;text-align:center;font-size:16px;line-height:1.75;color:#bdb8ae;">Pero todavía estás mirando desde afuera.</p>
                <p style="margin:24px 0 30px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.45;color:#fffaf0;">La puerta sigue abierta.</p>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;">
                  <tr><td align="center" bgcolor="#d69b29" style="border-radius:4px;"><a href="${SITE_URL}/" style="display:inline-block;padding:16px 26px;color:#090909;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.6px;">VOLVER A CIUDAD CENTRAL</a></td></tr>
                </table>

                <p style="margin:28px 0 20px;text-align:center;font-size:16px;line-height:1.75;color:#bdb8ae;">Gracias por estar al otro lado.</p>
                <p style="margin:0 0 5px;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#f0e4ce;">Enrique G. Santibáñez</p>
                <p style="margin:0;font-size:12px;letter-spacing:1.5px;color:#8c867c;">AUTOR · LA LLAVE I: CIUDAD CENTRAL</p>
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
REGISTRO DE ORIGEN

DETRÁS DE LA LLAVE

Hasta ahora te he hablado desde Ciudad Central.
De expedientes.
De señales.
De una cifra que aparece donde quizá no debería.

Pero detrás de todo eso hay algo mucho más simple.

Una historia que necesitaba existir.

La Llave no comenzó con una campaña.
Tampoco con una estrategia.
Comenzó con una idea.

Una de esas que aparecen, se quedan dando vueltas y, por más que uno intente seguir con su vida normal, se niegan a desaparecer.

Ciudad Central empezó a crecer de esa forma.

Primero fue una imagen.
Después una pregunta.
Luego aparecieron lugares, personajes, reglas, secretos.

Y en algún momento dejó de sentirse como una idea.
Empezó a sentirse como un lugar.

Durante mucho tiempo trabajé en silencio.
Escribiendo.
Reescribiendo.
Eliminando páginas.
Volviendo a empezar.

Preguntándome si aquello que tenía en la cabeza conseguiría algún día transformarse en algo que otra persona pudiera abrir, leer y recorrer.

Hasta que finalmente ocurrió.

LA LLAVE I: CIUDAD CENTRAL

Hay algo extraño en publicar una historia.
Durante años pertenece solamente a quien la escribe.
Uno conoce los pasillos. Las conversaciones. Los secretos. Sabe qué puerta conduce a dónde.

Pero en cuanto alguien abre el libro, eso cambia.
La historia deja de ser solamente tuya.
Ahora existe también dentro de otra persona.

Y esa es probablemente la parte que más me interesa de todo esto.

No simplemente que leas La Llave.
Sino descubrir qué ves tú cuando entras en Ciudad Central.

REGISTRO DEL AUTOR
AUTOR: Enrique G. Santibáñez
PROYECTO: La Llave
ARCHIVO: 066
ESTADO: EN EXPANSIÓN

Si llegaste hasta este correo, ya conoces una pequeña parte del mundo.
Pero todavía estás mirando desde afuera.

La puerta sigue abierta.

VOLVER A CIUDAD CENTRAL
${SITE_URL}/

Gracias por estar al otro lado.

Enrique G. Santibáñez
AUTOR · LA LLAVE I: CIUDAD CENTRAL

Este mensaje forma parte del acceso que solicitaste al Archivo 066 en lallaveoficial.com.

Darte de baja:
${unsubscribeUrl}`;

  return { html, text, unsubscribeUrl };
}

function buildAccesoEdicionCompletaEmail({ unsubscribeToken }) {
  const unsubscribeUrl = unsubscribeUrlFromToken(unsubscribeToken);

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ACCESO A LA EDICIÓN COMPLETA</title>
  </head>
  <body style="margin:0;padding:0;background:#050606;color:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Has visto los primeros registros. Ahora puedes entrar por completo en Ciudad Central.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#050606;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;border:1px solid #4a3714;background:#090a0a;">
            <tr>
              <td style="padding:38px 34px 24px;text-align:center;border-bottom:1px solid #3b2c11;">
                <div style="font-size:11px;letter-spacing:4px;color:#e5ad3c;font-weight:700;">ARCHIVO 066</div>
                <div style="margin-top:12px;font-size:12px;letter-spacing:3px;color:#8d887f;font-weight:700;">AUTORIZACIÓN FINAL</div>
                <div style="margin-top:18px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;color:#fffaf0;">ACCESO A LA EDICIÓN COMPLETA</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Durante los últimos días has recibido fragmentos.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Un expediente.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Una señal.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Una cifra.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#aaa59c;">Parte del origen de este mundo.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#c6c0b5;">Pero todo eso sigue siendo apenas el borde.</p>
                <p style="margin:24px 0 34px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.45;color:#f4ead7;">Porque Ciudad Central no fue construida para ser observada desde afuera.<br><br><strong>Fue construida para entrar.</strong></p>

                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Hay preguntas que el Archivo 066 no puede responderte.</p>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.75;color:#aaa59c;">No todavía.</p>
                <div style="margin:30px 0;padding:24px;border-left:3px solid #d69b29;background:#0d0e0e;">
                  <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.5;color:#f4ead7;">¿Por qué aparece el 066?</p>
                  <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.5;color:#f4ead7;">¿Qué existe realmente detrás del orden de Ciudad Central?</p>
                  <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.5;color:#f4ead7;">¿Quién conoce aquello que los demás ni siquiera saben que deben buscar?</p>
                  <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.5;color:#f4ead7;">¿Y qué ocurre cuando alguien encuentra una puerta que nunca debió abrir?</p>
                </div>
                <p style="margin:0 0 30px;text-align:center;font-size:16px;line-height:1.75;color:#c6c0b5;">Las respuestas están dentro.</p>

                <div style="margin:34px 0;padding:28px 24px;border:1px solid #5b461c;background:#0d0e0e;text-align:center;">
                  <div style="font-size:11px;letter-spacing:3px;color:#d69b29;font-weight:700;margin-bottom:16px;">ARCHIVO COMPLETO DISPONIBLE</div>
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:#fffaf0;">LA LLAVE I</div>
                  <div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;color:#f4ead7;">CIUDAD CENTRAL</div>
                  <div style="margin-top:18px;font-size:13px;letter-spacing:1.8px;color:#9c978e;">EDICIÓN FÍSICA</div>
                  <div style="margin-top:14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;color:#e7b84e;">$15.990 CLP</div>
                </div>

                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Hasta ahora has seguido las señales.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#aaa59c;">Desde aquí, la decisión es tuya.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Puedes cerrar el Archivo 066.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#aaa59c;">Volver a tu rutina.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#aaa59c;">Olvidar el número.</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#c6c0b5;">O puedes hacer lo que hacen quienes empiezan a sospechar que algo no encaja:</p>
                <p style="margin:24px 0 34px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.45;color:#fffaf0;">seguir mirando.</p>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;">
                  <tr><td align="center" bgcolor="#d69b29" style="border-radius:4px;"><a href="${BOOK_URL}" style="display:inline-block;padding:16px 26px;color:#090909;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.6px;">ACCEDER A LA EDICIÓN COMPLETA</a></td></tr>
                </table>

                <p style="margin:28px 0 12px;text-align:center;font-size:16px;line-height:1.75;color:#bdb8ae;">Hay puertas que se abren con una llave.</p>
                <p style="margin:0 0 24px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.45;color:#f4ead7;">Otras se abren simplemente porque alguien decide cruzarlas.</p>
                <p style="margin:0 0 28px;text-align:center;font-size:16px;line-height:1.75;color:#bdb8ae;">Nos vemos en Ciudad Central.</p>
                <p style="margin:0 0 5px;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#f0e4ce;">Enrique G. Santibáñez</p>
                <p style="margin:0;font-size:12px;letter-spacing:1.5px;color:#8c867c;">AUTOR · LA LLAVE I: CIUDAD CENTRAL</p>
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
AUTORIZACIÓN FINAL

ACCESO A LA EDICIÓN COMPLETA

Durante los últimos días has recibido fragmentos.

Un expediente.
Una señal.
Una cifra.
Parte del origen de este mundo.

Pero todo eso sigue siendo apenas el borde.

Porque Ciudad Central no fue construida para ser observada desde afuera.
Fue construida para entrar.

Hay preguntas que el Archivo 066 no puede responderte.
No todavía.

¿Por qué aparece el 066?
¿Qué existe realmente detrás del orden de Ciudad Central?
¿Quién conoce aquello que los demás ni siquiera saben que deben buscar?
¿Y qué ocurre cuando alguien encuentra una puerta que nunca debió abrir?

Las respuestas están dentro.

ARCHIVO COMPLETO DISPONIBLE
LA LLAVE I
CIUDAD CENTRAL
Edición física
$15.990 CLP

Hasta ahora has seguido las señales.
Desde aquí, la decisión es tuya.

Puedes cerrar el Archivo 066.
Volver a tu rutina.
Olvidar el número.

O puedes hacer lo que hacen quienes empiezan a sospechar que algo no encaja:

seguir mirando.

ACCEDER A LA EDICIÓN COMPLETA
${BOOK_URL}

Hay puertas que se abren con una llave.
Otras se abren simplemente porque alguien decide cruzarlas.

Nos vemos en Ciudad Central.

Enrique G. Santibáñez
AUTOR · LA LLAVE I: CIUDAD CENTRAL

Este mensaje forma parte del acceso que solicitaste al Archivo 066 en lallaveoficial.com.

Darte de baja:
${unsubscribeUrl}`;

  return { html, text, unsubscribeUrl };
}

const SEQUENCE_STEPS = [
  {
    stepNumber: 2,
    emailKey: "expediente_001",
    subject: "EXPEDIENTE 001 · Hay algo que no encaja",
    delayMs: 2 * DAY_MS,
    typeTag: "sequence_02",
    buildEmail: buildExpediente001Email,
  },
  {
    stepNumber: 3,
    emailKey: "senal_interceptada_066",
    subject: "SEÑAL INTERCEPTADA · CÓDIGO 066",
    delayMs: 5 * DAY_MS,
    typeTag: "sequence_03",
    buildEmail: buildSenalInterceptadaEmail,
  },
  {
    stepNumber: 4,
    emailKey: "detras_de_la_llave",
    subject: "DETRÁS DE LA LLAVE · Esto empezó mucho antes del Archivo 066",
    delayMs: 9 * DAY_MS,
    typeTag: "sequence_04",
    buildEmail: buildDetrasDeLaLlaveEmail,
  },
  {
    stepNumber: 5,
    emailKey: "acceso_edicion_completa",
    subject: "ACCESO A LA EDICIÓN COMPLETA · La puerta está abierta",
    delayMs: 14 * DAY_MS,
    typeTag: "sequence_05",
    buildEmail: buildAccesoEdicionCompletaEmail,
  },
];

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

function sequenceStepByNumber(stepNumber) {
  return SEQUENCE_STEPS.find((step) => step.stepNumber === Number(stepNumber)) || null;
}

async function findActiveSequenceAnchor({ sql, subscriberId }) {
  const rows = await sql`
    SELECT
      sequence_run_id,
      step_number,
      scheduled_for
    FROM mailing_sequence_emails
    WHERE subscriber_id = ${subscriberId}
      AND step_number BETWEEN 2 AND 5
      AND status IN ('scheduled', 'sent')
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const row = rows[0] || null;
  if (!row) return null;

  const step = sequenceStepByNumber(row.step_number);
  const scheduledMs = new Date(row.scheduled_for).getTime();

  if (!step || !row.sequence_run_id || !Number.isFinite(scheduledMs)) {
    return null;
  }

  return {
    sequenceRunId: row.sequence_run_id,
    baseTimeMs: scheduledMs - step.delayMs,
  };
}

async function getActiveSequenceSteps({ sql, subscriberId, sequenceRunId }) {
  const rows = await sql`
    SELECT
      step_number,
      email_key,
      scheduled_for,
      resend_email_id,
      status
    FROM mailing_sequence_emails
    WHERE subscriber_id = ${subscriberId}
      AND sequence_run_id = ${sequenceRunId}
      AND step_number BETWEEN 2 AND 5
      AND status IN ('scheduled', 'sent')
    ORDER BY step_number ASC
  `;

  return rows;
}

async function scheduleSequenceStep({
  apiKey,
  sql,
  subscriber,
  sequenceRunId,
  baseTimeMs,
  step,
}) {
  const scheduledAt = new Date(baseTimeMs + step.delayMs).toISOString();
  const { html, text, unsubscribeUrl } = step.buildEmail({
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
      ${step.stepNumber},
      ${step.emailKey},
      ${step.subject},
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
        "Idempotency-Key": `archivo066-${step.emailKey}-${sequenceRunId}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [subscriber.email],
        reply_to: REPLY_TO_EMAIL,
        subject: step.subject,
        html,
        text,
        scheduled_at: scheduledAt,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "category", value: "archivo066" },
          { name: "type", value: step.typeTag },
          { name: "sequence", value: step.emailKey },
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
          subscriberId: subscriber.id,
          sequenceEmailId: sequenceRow.id,
          resendEmailId: resendData.id,
          message: cancelError?.message,
        });
      }
    }

    throw error;
  }

  return {
    stepNumber: step.stepNumber,
    emailKey: step.emailKey,
    subject: step.subject,
    scheduledAt,
    resendEmailId: resendData?.id || null,
    status: "scheduled",
  };
}

async function ensureArchiveSequence({
  apiKey,
  sql,
  subscriber,
  forceNewRun = false,
}) {
  let sequenceRunId = null;
  let baseTimeMs = null;

  if (!forceNewRun) {
    const anchor = await findActiveSequenceAnchor({
      sql,
      subscriberId: subscriber.id,
    });

    if (anchor) {
      sequenceRunId = anchor.sequenceRunId;
      baseTimeMs = anchor.baseTimeMs;
    }
  }

  if (!sequenceRunId || !Number.isFinite(baseTimeMs)) {
    sequenceRunId = createSequenceRunId(subscriber.id);
    baseTimeMs = Date.now();
  }

  const existingRows = await getActiveSequenceSteps({
    sql,
    subscriberId: subscriber.id,
    sequenceRunId,
  });

  const existingSteps = new Map(
    existingRows.map((row) => [Number(row.step_number), row])
  );

  const items = [];
  let scheduledCount = 0;
  let existingCount = 0;
  let skippedPastCount = 0;
  let failedCount = 0;

  for (const step of SEQUENCE_STEPS) {
    const existing = existingSteps.get(step.stepNumber);

    if (existing) {
      existingCount += 1;
      items.push({
        stepNumber: step.stepNumber,
        emailKey: step.emailKey,
        subject: step.subject,
        scheduledAt: existing.scheduled_for,
        resendEmailId: existing.resend_email_id || null,
        status: existing.status,
        result: "existing",
      });
      continue;
    }

    const targetMs = baseTimeMs + step.delayMs;

    if (targetMs <= Date.now() + MIN_SCHEDULE_LEAD_MS) {
      skippedPastCount += 1;
      items.push({
        stepNumber: step.stepNumber,
        emailKey: step.emailKey,
        subject: step.subject,
        scheduledAt: new Date(targetMs).toISOString(),
        resendEmailId: null,
        status: "skipped",
        result: "past_due",
      });
      continue;
    }

    try {
      const scheduled = await scheduleSequenceStep({
        apiKey,
        sql,
        subscriber,
        sequenceRunId,
        baseTimeMs,
        step,
      });

      scheduledCount += 1;
      items.push({ ...scheduled, result: "scheduled" });
    } catch (error) {
      failedCount += 1;

      console.error("Archive 066 sequence step scheduling error:", {
        subscriberId: subscriber.id,
        email: subscriber.email,
        sequenceRunId,
        stepNumber: step.stepNumber,
        emailKey: step.emailKey,
        status: error?.status,
        message: error?.message,
        details: error?.details,
      });

      items.push({
        stepNumber: step.stepNumber,
        emailKey: step.emailKey,
        subject: step.subject,
        scheduledAt: new Date(targetMs).toISOString(),
        resendEmailId: null,
        status: "failed",
        result: "failed",
        error: cleanText(error?.message || "Error al programar", 500),
      });
    }
  }

  return {
    sequenceRunId,
    baseTime: new Date(baseTimeMs).toISOString(),
    scheduledCount,
    existingCount,
    skippedPastCount,
    failedCount,
    items,
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
    let sequenceData = null;

    if (shouldEnsureSequence) {
      try {
        sequenceData = await ensureArchiveSequence({
          apiKey: resendApiKey,
          sql,
          subscriber,
          forceNewRun: false,
        });
      } catch (error) {
        console.error("Archive 066 sequence recovery error:", {
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
      sequenceScheduled: Boolean(sequenceData) && sequenceData.failedCount === 0,
      sequence: sequenceData,
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
      sequenceData = await ensureArchiveSequence({
        apiKey: resendApiKey,
        sql,
        subscriber,
        forceNewRun: true,
      });
    } catch (sequenceError) {
      console.error("Archive 066 full sequence scheduling error:", {
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
      sequenceScheduled: Boolean(sequenceData) && sequenceData.failedCount === 0,
      sequence: sequenceData,
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
