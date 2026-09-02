import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const SITE_URL = "https://www.lallaveoficial.com";
export const BOOK_URL = `${SITE_URL}/comprar`;
export const PROMO_CODE = "AJRAZ10";
export const DISCOUNT_PERCENT = 10;
export const BOOK_PRICE = 15990;
export const DISCOUNT_AMOUNT = Math.round(
  (BOOK_PRICE * DISCOUNT_PERCENT) / 100
);
export const DISCOUNTED_BOOK_PRICE =
  BOOK_PRICE - DISCOUNT_AMOUNT;

export const PROMO_VALID_FROM = "2026-08-24";
export const PROMO_VALID_UNTIL = "2026-09-30";

export const FROM_EMAIL =
  "Archivo 066 · La Llave <contacto@lallaveoficial.com>";

export const REPLY_TO_EMAIL =
  "contacto@lallaveoficial.com";

const DAY_MS = 24 * 60 * 60 * 1000;

export function cleanText(
  value,
  maxLength = 120
) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

export function cleanEmail(value) {
  return cleanText(
    value,
    254
  ).toLowerCase();
}

export function isValidEmail(email) {
  return (
    Boolean(email) &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
      email
    )
  );
}

export function createUnsubscribeToken() {
  return randomBytes(32).toString("hex");
}

export function createSequenceRunId(
  subscriberId
) {
  return (
    `a066-promo-${subscriberId}-${Date.now()}-` +
    randomBytes(5).toString("hex")
  );
}

export function unsubscribeUrlFromToken(
  token
) {
  return (
    `${SITE_URL}/api/unsubscribe?token=` +
    encodeURIComponent(token)
  );
}

export function getChileClockKey(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Santiago",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23",
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ]
      )
    );

  return Number(
    `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`
  );
}

export function getChileDate(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Santiago",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ]
      )
    );

  return `${values.year}-${values.month}-${values.day}`;
}

export function isPromoCampaignActive(
  date = new Date()
) {
  const key =
    getChileClockKey(
      date
    );

  return (
    key >= 20260824000000 &&
    key <= 20260930235959
  );
}

export function normalizePromoCode(
  value
) {
  return cleanText(
    value,
    24
  )
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function getSql(
  databaseUrl =
    process.env.DATABASE_URL
) {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no está configurada."
    );
  }

  return neon(
    databaseUrl
  );
}

export async function ensurePromoTables(
  sql
) {
  await sql`
    CREATE TABLE IF NOT EXISTS promo_entitlements (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      source TEXT NOT NULL DEFAULT 'popup_ajraz10',
      valid_from DATE NOT NULL,
      valid_until DATE NOT NULL,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      email_sent_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (email, code)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS promo_entitlements_email_idx
    ON promo_entitlements (email)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS promo_order_audit (
      id BIGSERIAL PRIMARY KEY,
      external_reference TEXT NOT NULL UNIQUE,
      buyer_email TEXT NOT NULL,
      code TEXT NOT NULL,
      original_book_price INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL,
      discounted_book_price INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function getPromoEntitlement(
  sql,
  email,
  code = PROMO_CODE
) {
  const rows =
    await sql`
      SELECT
        id,
        email,
        code,
        status,
        valid_from::text AS valid_from,
        valid_until::text AS valid_until,
        granted_at,
        email_sent_at
      FROM promo_entitlements
      WHERE email = ${email}
        AND code = ${code}
      LIMIT 1
    `;

  return rows[0] || null;
}

export async function validatePromoEntitlement(
  sql,
  email,
  codeValue
) {
  const code =
    normalizePromoCode(
      codeValue
    );

  if (
    code !==
    PROMO_CODE
  ) {
    return {
      ok: false,

      reason:
        "invalid_code",

      error:
        "El código ingresado no es válido.",
    };
  }

  if (
    !isValidEmail(
      email
    )
  ) {
    return {
      ok: false,

      reason:
        "invalid_email",

      error:
        "Ingresa el mismo correo con el que desbloqueaste AJRAZ10.",
    };
  }

  if (
    !isPromoCampaignActive()
  ) {
    const before =
      getChileClockKey() <
      20260824000000;

    return {
      ok: false,

      reason:
        before
          ? "not_started"
          : "expired",

      error:
        before
          ? "AJRAZ10 se activa el 24 de agosto de 2026 a las 00:00, hora de Chile."
          : "La campaña AJRAZ10 finalizó el 30 de septiembre de 2026.",
    };
  }

  const entitlement =
    await getPromoEntitlement(
      sql,
      email,
      code
    );

  if (
    !entitlement ||
    entitlement.status !==
      "active"
  ) {
    return {
      ok: false,

      reason:
        "not_authorized",

      error:
        "Este correo todavía no tiene acceso a AJRAZ10. Suscríbete para desbloquear el 10%.",
    };
  }

  const chileDate =
    getChileDate();

  const validFrom =
    String(
      entitlement.valid_from
    ).slice(
      0,
      10
    );

  const validUntil =
    String(
      entitlement.valid_until
    ).slice(
      0,
      10
    );

  if (
    chileDate <
      validFrom ||
    chileDate >
      validUntil
  ) {
    return {
      ok: false,

      reason:
        "outside_entitlement",

      error:
        "Este acceso AJRAZ10 no está vigente.",
    };
  }

  await sql`
    UPDATE promo_entitlements
    SET updated_at = NOW()
    WHERE id = ${entitlement.id}
  `;

  return {
    ok: true,

    code:
      PROMO_CODE,

    discountPercent:
      DISCOUNT_PERCENT,

    originalBookPrice:
      BOOK_PRICE,

    discountAmount:
      DISCOUNT_AMOUNT,

    discountedBookPrice:
      DISCOUNTED_BOOK_PRICE,

    validUntil:
      PROMO_VALID_UNTIL,
  };
}

async function parseResendResponse(
  response
) {
  const text =
    await response.text();

  let data = null;

  try {
    data =
      text
        ? JSON.parse(
            text
          )
        : null;
  } catch {
    data = {
      raw:
        text,
    };
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.message ||
          data?.error?.message ||
          `Resend respondió con estado ${response.status}.`
      );

    error.status =
      response.status;

    error.details =
      data;

    throw error;
  }

  return data;
}

function escapeHtml(
  value
) {
  return String(
    value || ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function mailShell({
  eyebrow,
  title,
  preheader = "",
  bodyHtml,
  unsubscribeUrl,
}) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
  <title>${title}</title>
</head>

<body
  style="
    margin:0;
    background:#050606;
    color:#f5f0e6;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <div
    style="
      display:none;
      max-height:0;
      overflow:hidden;
      opacity:0;
      color:transparent;
    "
  >
    ${preheader}
  </div>

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    style="background:#050606"
  >
    <tr>
      <td
        align="center"
        style="padding:30px 14px"
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            max-width:640px;
            background:#090a0a;
            border:1px solid #4a3714;
          "
        >
          <tr>
            <td
              style="
                padding:36px 32px 24px;
                text-align:center;
                border-bottom:1px solid #3b2c11;
              "
            >
              <div
                style="
                  font-size:11px;
                  letter-spacing:4px;
                  color:#e5ad3c;
                  font-weight:700;
                "
              >
                ${eyebrow}
              </div>

              <div
                style="
                  margin-top:14px;
                  font:32px/1.1 Georgia,serif;
                  color:#fffaf0;
                "
              >
                ${title}
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:34px 32px 18px;
              "
            >
              ${bodyHtml}
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:24px 32px 32px;
                border-top:1px solid #26200f;
                text-align:center;
              "
            >
              <p
                style="
                  margin:0 0 8px;
                  font-size:11px;
                  line-height:1.6;
                  color:#77736b;
                "
              >
                Recibes este correo porque solicitaste
                acceso al Archivo 066 en
                lallaveoficial.com.
              </p>

              <p
                style="
                  margin:0;
                  font-size:11px;
                  line-height:1.6;
                  color:#77736b;
                "
              >
                Si no deseas recibir futuras
                comunicaciones,
                <a
                  href="${unsubscribeUrl}"
                  style="color:#c9a456"
                >
                  puedes darte de baja aquí
                </a>.
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

export function buildPromoWelcomeEmail({
  name,
  unsubscribeToken,
  existingSubscriber = false,
}) {
  const unsubscribeUrl =
    unsubscribeUrlFromToken(
      unsubscribeToken
    );

  const firstName =
    cleanText(
      name,
      80
    )
      .split(/\s+/)
      .filter(Boolean)[0] ||
    "";

  const greeting =
    firstName
      ? `${escapeHtml(
          firstName
        )},`
      : "Acceso autorizado.";

  const intro =
    existingSubscriber
      ? "Tu correo ya pertenecía al Archivo 066. Acabamos de habilitar un nuevo permiso comercial asociado a tu registro."
      : "Tu acceso al Archivo 066 ha sido autorizado. Desde ahora recibirás documentos, avances y material clasificado del universo de La Llave.";

  const bodyHtml = `
    <p
      style="
        margin:0 0 18px;
        font-size:17px;
        line-height:1.7;
        color:#d8d3c8;
      "
    >
      ${greeting}
    </p>

    <p
      style="
        margin:0 0 24px;
        font-size:16px;
        line-height:1.75;
        color:#bdb8ae;
      "
    >
      ${intro}
    </p>

    <div
      style="
        margin:28px 0;
        padding:24px;
        border:1px solid #6b4b16;
        border-left:3px solid #d69b29;
        background:#0d0e0e;
        text-align:center;
      "
    >
      <div
        style="
          font-size:11px;
          letter-spacing:3px;
          color:#d69b29;
          font-weight:700;
        "
      >
        AUTORIZACIÓN COMERCIAL · AJRAZ10
      </div>

      <div
        style="
          margin-top:16px;
          font:36px/1 Georgia,serif;
          color:#fffaf0;
        "
      >
        10% DE DESCUENTO
      </div>

      <div
        style="
          margin:20px auto 8px;
          display:inline-block;
          padding:13px 24px;
          border:1px dashed #d69b29;
          font:700 24px/1 monospace;
          letter-spacing:4px;
          color:#e7b84e;
        "
      >
        AJRAZ10
      </div>

      <p
        style="
          margin:16px 0 0;
          font-size:13px;
          line-height:1.7;
          color:#99938a;
        "
      >
        Válido desde el 24 de agosto hasta
        el 30 de septiembre de 2026.
        El beneficio se aplica al precio del
        libro; el despacho mantiene su tarifa
        normal.
      </p>
    </div>

    <p
      style="
        margin:0 0 18px;
        font-size:15px;
        line-height:1.7;
        color:#bdb8ae;
      "
    >
      Para usarlo, compra con
      <strong style="color:#fffaf0">
        este mismo correo
      </strong>
      e ingresa AJRAZ10 en el campo de código
      de acceso.
    </p>

    <table
      role="presentation"
      cellspacing="0"
      cellpadding="0"
      style="margin:28px auto"
    >
      <tr>
        <td
          bgcolor="#d69b29"
          style="border-radius:4px"
        >
          <a
            href="${BOOK_URL}"
            style="
              display:inline-block;
              padding:16px 26px;
              color:#090909;
              text-decoration:none;
              font-size:12px;
              font-weight:800;
              letter-spacing:1.5px;
            "
          >
            USAR MI ACCESO
          </a>
        </td>
      </tr>
    </table>

    <p
      style="
        margin:28px 0 8px;
        font-size:15px;
        line-height:1.7;
        color:#bdb8ae;
      "
    >
      Hay información que no se publica
      en redes.
    </p>

    <p
      style="
        margin:0;
        font:17px Georgia,serif;
        color:#f0e4ce;
      "
    >
      Enrique G. Santibáñez
    </p>
  `;

  const html =
    mailShell({
      eyebrow:
        "ARCHIVO 066",

      title:
        "ACCESO CONCEDIDO · AJRAZ10",

      preheader:
        "Tu acceso privado del 10% ya está habilitado.",

      bodyHtml,

      unsubscribeUrl,
    });

  const text =
    `${
      firstName
        ? `${firstName},`
        : "Acceso autorizado."
    }\n\n` +
    `${intro}\n\n` +
    `AUTORIZACIÓN COMERCIAL · AJRAZ10\n` +
    `10% DE DESCUENTO\n` +
    `Código: AJRAZ10\n` +
    `Vigencia: 24 de agosto al 30 de septiembre de 2026.\n` +
    `El descuento se aplica al precio del libro; el despacho mantiene su tarifa normal.\n\n` +
    `Usa el mismo correo al comprar: ${BOOK_URL}\n\n` +
    `Darte de baja: ${unsubscribeUrl}`;

  return {
    subject:
      "ACCESO CONCEDIDO · Tu código AJRAZ10",

    html,

    text,

    unsubscribeUrl,
  };
}

function buildSequenceEmail(
  step,
  unsubscribeToken
) {
  const unsubscribeUrl =
    unsubscribeUrlFromToken(
      unsubscribeToken
    );

  const common = {
    expediente_001: {
      eyebrow:
        "ARCHIVO 066 · EXPEDIENTE 001",

      title:
        "HAY ALGO QUE NO ENCAJA.",

      preheader:
        "Ciudad Central parece funcionar perfectamente. Ese es precisamente el problema.",

      body: `
        <p
          style="
            font-size:16px;
            line-height:1.75;
            color:#c6c0b5;
          "
        >
          Ciudad Central funciona.
        </p>

        <p
          style="
            font-size:16px;
            line-height:1.75;
            color:#aaa59c;
          "
        >
          Las calles siguen su curso.
          Las oficinas abren a la hora indicada.
          La gente llega, trabaja y vuelve a casa.
        </p>

        <p
          style="
            font:22px/1.45 Georgia,serif;
            color:#f4ead7;
          "
        >
          Todo parece normal.
          <br>
          Demasiado normal.
        </p>

        <div
          style="
            margin:28px 0;
            padding:22px;
            border-left:3px solid #d69b29;
            background:#0d0e0e;
          "
        >
          <p
            style="
              margin:0;
              color:#b8b2a8;
              line-height:1.7;
            "
          >
            Hay puertas que nadie mira dos veces.
            Hasta que alguien encuentra una razón
            para hacerlo.
          </p>

          <div
            style="
              margin-top:18px;
              text-align:center;
              font:52px Georgia,serif;
              color:#e7b84e;
            "
          >
            066
          </div>

          <p
            style="
              text-align:center;
              color:#918c83;
            "
          >
            No necesitas entenderla todavía.
            Solo recordar que la viste.
          </p>
        </div>

        <p
          style="
            text-align:center;
            font:22px/1.4 Georgia,serif;
            color:#fffaf0;
          "
        >
          Ahora empieza lo difícil:
          decidir cuánto quieres saber.
        </p>
      `,
    },

    senal_interceptada_066: {
      eyebrow:
        "ARCHIVO 066 · SEÑAL INTERCEPTADA",

      title:
        "CÓDIGO 066",

      preheader:
        "La transmisión duró apenas unos segundos. Fue suficiente.",

      body: `
        <p
          style="
            font-size:16px;
            line-height:1.75;
            color:#bdb8ae;
          "
        >
          La transmisión duró apenas unos segundos.
          Fue suficiente.
        </p>

        <div
          style="
            margin:26px 0;
            padding:24px;
            background:#0d0e0e;
            border:1px solid #33280f;
            font-family:monospace;
            color:#d8d3c8;
            line-height:1.9;
          "
        >
          …mantener el perímetro…
          <br>
          …no responder a la señal…
          <br>
          …el acceso no estaba previsto…
          <br>
          …066…
        </div>

        <p
          style="
            font-size:16px;
            line-height:1.75;
            color:#aaa59c;
          "
        >
          No sabemos quién emitió el mensaje.
          Tampoco por qué el código aparece justo
          antes de que la señal se corte.
        </p>

        <p
          style="
            font:22px/1.4 Georgia,serif;
            color:#e7b84e;
            text-align:center;
          "
        >
          Hay archivos que se encuentran.
          Otros parecen estar esperando.
        </p>
      `,
    },

    detras_de_la_llave: {
      eyebrow:
        "ARCHIVO 066 · DETRÁS DE LA LLAVE",

      title:
        "ESTO EMPEZÓ MUCHO ANTES DEL ARCHIVO 066",

      preheader:
        "Antes del código hubo una historia que necesitaba existir.",

      body: `
        <p
          style="
            font-size:16px;
            line-height:1.75;
            color:#bdb8ae;
          "
        >
          Antes del código, antes de Ciudad Central
          y antes del Archivo 066, hubo una historia
          que necesitaba existir.
        </p>

        <p
          style="
            font-size:16px;
            line-height:1.75;
            color:#aaa59c;
          "
        >
          La Llave nació como un proyecto personal:
          una pregunta sobre memoria, vigilancia,
          pérdida y la clase de verdad que puede
          cambiar una vida cuando finalmente aparece.
        </p>

        <p
          style="
            font:22px/1.45 Georgia,serif;
            color:#f4ead7;
          "
        >
          No quería construir solo una ciudad.
          Quería construir una puerta.
        </p>

        <p
          style="
            font-size:16px;
            line-height:1.75;
            color:#bdb8ae;
          "
        >
          Gracias por haberla abierto.
        </p>

        <p
          style="
            font:17px Georgia,serif;
            color:#f0e4ce;
          "
        >
          Enrique G. Santibáñez
        </p>
      `,
    },

    acceso_edicion_completa: {
      eyebrow:
        "ARCHIVO 066 · ACCESO",

      title:
        "LA PUERTA ESTÁ ABIERTA",

      preheader:
        "Ya conoces parte del archivo. Ahora puedes entrar a la edición completa.",

      body: `
        <p
          style="
            font-size:16px;
            line-height:1.75;
            color:#bdb8ae;
          "
        >
          Ya conoces parte del archivo.
          Ahora puedes entrar a la edición completa de
          <strong style="color:#fffaf0">
            La Llave I: Ciudad Central
          </strong>.
        </p>

        <p
          style="
            font:24px/1.4 Georgia,serif;
            color:#e7b84e;
            text-align:center;
          "
        >
          Edición impresa oficial · $15.990 CLP
        </p>

        <table
          role="presentation"
          cellspacing="0"
          cellpadding="0"
          style="margin:28px auto"
        >
          <tr>
            <td
              bgcolor="#d69b29"
              style="border-radius:4px"
            >
              <a
                href="${BOOK_URL}"
                style="
                  display:inline-block;
                  padding:16px 26px;
                  color:#090909;
                  text-decoration:none;
                  font-size:12px;
                  font-weight:800;
                  letter-spacing:1.5px;
                "
              >
                ACCEDER A LA EDICIÓN COMPLETA
              </a>
            </td>
          </tr>
        </table>

        <p
          style="
            font-size:15px;
            line-height:1.7;
            color:#aaa59c;
            text-align:center;
          "
        >
          La verdad abre la puerta.
          Lo que ocurra después depende de ti.
        </p>
      `,
    },
  }[step.emailKey];

  const html =
    mailShell({
      eyebrow:
        common.eyebrow,

      title:
        common.title,

      preheader:
        common.preheader,

      bodyHtml:
        common.body,

      unsubscribeUrl,
    });

  const text =
    `${common.title}\n\n` +
    `${common.preheader}\n\n` +
    `${SITE_URL}\n\n` +
    `Darte de baja: ${unsubscribeUrl}`;

  return {
    html,

    text,

    unsubscribeUrl,
  };
}

const SEQUENCE_STEPS = [
  {
    stepNumber: 2,

    emailKey:
      "expediente_001",

    subject:
      "EXPEDIENTE 001 · Hay algo que no encaja",

    delayMs:
      2 * DAY_MS,

    typeTag:
      "expediente",
  },

  {
    stepNumber: 3,

    emailKey:
      "senal_interceptada_066",

    subject:
      "SEÑAL INTERCEPTADA · CÓDIGO 066",

    delayMs:
      5 * DAY_MS,

    typeTag:
      "senal",
  },

  {
    stepNumber: 4,

    emailKey:
      "detras_de_la_llave",

    subject:
      "DETRÁS DE LA LLAVE · Esto empezó mucho antes del Archivo 066",

    delayMs:
      9 * DAY_MS,

    typeTag:
      "autor",
  },

  {
    stepNumber: 5,

    emailKey:
      "acceso_edicion_completa",

    subject:
      "ACCESO A LA EDICIÓN COMPLETA · La puerta está abierta",

    delayMs:
      14 * DAY_MS,

    typeTag:
      "conversion",
  },
];

export async function sendPromoWelcome({
  apiKey,
  subscriber,
  existingSubscriber,
}) {
  const mail =
    buildPromoWelcomeEmail({
      name:
        subscriber.name,

      unsubscribeToken:
        subscriber
          .unsubscribe_token,

      existingSubscriber,
    });

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",

          "Idempotency-Key":
            `ajraz10-welcome-${subscriber.id}`,
        },

        body:
          JSON.stringify({
            from:
              FROM_EMAIL,

            to: [
              subscriber.email,
            ],

            reply_to:
              REPLY_TO_EMAIL,

            subject:
              mail.subject,

            html:
              mail.html,

            text:
              mail.text,

            headers: {
              "List-Unsubscribe":
                `<${mail.unsubscribeUrl}>`,

              "List-Unsubscribe-Post":
                "List-Unsubscribe=One-Click",
            },

            tags: [
              {
                name:
                  "category",

                value:
                  "archivo066",
              },

              {
                name:
                  "type",

                value:
                  "promo_ajraz10",
              },
            ],
          }),
      }
    );

  return parseResendResponse(
    response
  );
}

export async function schedulePromoSequence({
  apiKey,
  sql,
  subscriber,
}) {
  const sequenceRunId =
    createSequenceRunId(
      subscriber.id
    );

  const baseTimeMs =
    Date.now();

  const results = [];

  for (
    const step of
    SEQUENCE_STEPS
  ) {
    const scheduledAt =
      new Date(
        baseTimeMs +
          step.delayMs
      ).toISOString();

    const mail =
      buildSequenceEmail(
        step,
        subscriber
          .unsubscribe_token
      );

    try {
      const response =
        await fetch(
          "https://api.resend.com/emails",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${apiKey}`,

              "Content-Type":
                "application/json",

              "Idempotency-Key":
                `archivo066-${step.emailKey}-${sequenceRunId}`,
            },

            body:
              JSON.stringify({
                from:
                  FROM_EMAIL,

                to: [
                  subscriber.email,
                ],

                reply_to:
                  REPLY_TO_EMAIL,

                subject:
                  step.subject,

                html:
                  mail.html,

                text:
                  mail.text,

                scheduled_at:
                  scheduledAt,

                headers: {
                  "List-Unsubscribe":
                    `<${mail.unsubscribeUrl}>`,

                  "List-Unsubscribe-Post":
                    "List-Unsubscribe=One-Click",
                },

                tags: [
                  {
                    name:
                      "category",

                    value:
                      "archivo066",
                  },

                  {
                    name:
                      "type",

                    value:
                      step.typeTag,
                  },

                  {
                    name:
                      "sequence",

                    value:
                      step.emailKey,
                  },
                ],
              }),
          }
        );

      const resend =
        await parseResendResponse(
          response
        );

      await sql`
        INSERT INTO mailing_sequence_emails (
          subscriber_id,
          sequence_run_id,
          step_number,
          email_key,
          subject,
          scheduled_for,
          resend_email_id,
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
          ${resend?.id || null},
          'scheduled',
          NULL,
          NOW(),
          NOW()
        )
      `;

      results.push({
        step:
          step.stepNumber,

        status:
          "scheduled",

        id:
          resend?.id ||
          null,
      });
    } catch (error) {
      console.error(
        "AJRAZ10 sequence scheduling error",
        {
          subscriberId:
            subscriber.id,

          step:
            step.stepNumber,

          message:
            error?.message,
        }
      );

      results.push({
        step:
          step.stepNumber,

        status:
          "failed",
      });
    }
  }

  return {
    sequenceRunId,
    results,
  };
}
