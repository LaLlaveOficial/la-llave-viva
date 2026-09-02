import { createHash, randomBytes } from "node:crypto";
import {
  BOOK_PRICE,
  DISCOUNT_AMOUNT,
  DISCOUNT_PERCENT,
  DISCOUNTED_BOOK_PRICE,
  FROM_EMAIL,
  PROMO_CODE,
  PROMO_VALID_FROM,
  PROMO_VALID_UNTIL,
  REPLY_TO_EMAIL,
  SITE_URL,
  cleanEmail,
  cleanText,
  getChileDate,
  getChileClockKey,
  isPromoCampaignActive,
  isValidEmail,
  normalizePromoCode,
} from "./ajraz10.js";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function ensurePromoVerificationColumns(sql) {
  await sql`
    ALTER TABLE promo_entitlements
    ADD COLUMN IF NOT EXISTS verification_token_hash TEXT
  `;

  await sql`
    ALTER TABLE promo_entitlements
    ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ
  `;

  await sql`
    ALTER TABLE promo_entitlements
    ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ
  `;

  await sql`
    ALTER TABLE promo_entitlements
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS promo_entitlements_verification_token_hash_idx
    ON promo_entitlements (verification_token_hash)
  `;
}

export function createPromoVerificationToken() {
  return randomBytes(32).toString("hex");
}

export function hashPromoVerificationToken(token) {
  return createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

export function isValidVerificationToken(token) {
  return /^[a-f0-9]{64}$/i.test(String(token || ""));
}

export function verificationExpiresAt() {
  return new Date(Date.now() + VERIFICATION_TTL_MS);
}

export function canResendVerification(lastSentAt) {
  if (!lastSentAt) return true;

  const value = new Date(lastSentAt).getTime();

  if (!Number.isFinite(value)) return true;

  return Date.now() - value >= RESEND_COOLDOWN_MS;
}

export async function getPromoVerificationState(
  sql,
  email,
  code = PROMO_CODE
) {
  const rows = await sql`
    SELECT
      id,
      email,
      code,
      status,
      valid_from::text AS valid_from,
      valid_until::text AS valid_until,
      granted_at,
      email_sent_at,
      verification_expires_at,
      verification_sent_at,
      verified_at
    FROM promo_entitlements
    WHERE email = ${cleanEmail(email)}
      AND code = ${normalizePromoCode(code)}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function createPendingPromoVerification(
  sql,
  email,
  source = "checkout_ajraz10_double_opt_in"
) {
  const normalizedEmail = cleanEmail(email);

  const token = createPromoVerificationToken();
  const tokenHash = hashPromoVerificationToken(token);
  const expiresAt = verificationExpiresAt();

  const rows = await sql`
    INSERT INTO promo_entitlements (
      email,
      code,
      status,
      source,
      valid_from,
      valid_until,
      granted_at,
      verification_token_hash,
      verification_expires_at,
      verification_sent_at,
      verified_at,
      updated_at
    ) VALUES (
      ${normalizedEmail},
      ${PROMO_CODE},
      'pending',
      ${source},
      ${PROMO_VALID_FROM},
      ${PROMO_VALID_UNTIL},
      NOW(),
      ${tokenHash},
      ${expiresAt},
      NULL,
      NULL,
      NOW()
    )
    ON CONFLICT (email, code)
    DO UPDATE SET
      status = 'pending',
      source = EXCLUDED.source,
      valid_from = EXCLUDED.valid_from,
      valid_until = EXCLUDED.valid_until,
      verification_token_hash = EXCLUDED.verification_token_hash,
      verification_expires_at = EXCLUDED.verification_expires_at,
      verification_sent_at = NULL,
      verified_at = NULL,
      updated_at = NOW()
    RETURNING
      id,
      email,
      code,
      status,
      verification_expires_at,
      verification_sent_at,
      verified_at
  `;

  return {
    entitlement: rows[0],
    token,
  };
}

export async function markVerificationSent(
  sql,
  entitlementId
) {
  await sql`
    UPDATE promo_entitlements
    SET
      verification_sent_at = NOW(),
      updated_at = NOW()
    WHERE id = ${entitlementId}
  `;
}

export async function findPendingVerificationByToken(
  sql,
  token
) {
  if (!isValidVerificationToken(token)) {
    return null;
  }

  const tokenHash =
    hashPromoVerificationToken(token);

  const rows = await sql`
    SELECT
      id,
      email,
      code,
      status,
      valid_from::text AS valid_from,
      valid_until::text AS valid_until,
      verification_expires_at,
      verification_sent_at,
      verified_at
    FROM promo_entitlements
    WHERE verification_token_hash = ${tokenHash}
      AND code = ${PROMO_CODE}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function activateVerifiedEntitlement(
  sql,
  entitlementId
) {
  const rows = await sql`
    UPDATE promo_entitlements
    SET
      status = 'active',
      verified_at = NOW(),
      granted_at = NOW(),
      verification_token_hash = NULL,
      verification_expires_at = NULL,
      updated_at = NOW()
    WHERE id = ${entitlementId}
    RETURNING
      id,
      email,
      code,
      status,
      valid_from::text AS valid_from,
      valid_until::text AS valid_until,
      verified_at,
      email_sent_at
  `;

  return rows[0] || null;
}

export async function validateVerifiedPromoEntitlement(
  sql,
  emailValue,
  codeValue
) {
  const email = cleanEmail(emailValue);
  const code = normalizePromoCode(codeValue);

  if (code !== PROMO_CODE) {
    return {
      ok: false,
      reason: "invalid_code",
      error: "El código ingresado no es válido.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      reason: "invalid_email",
      error:
        "Ingresa el mismo correo que confirmaste para desbloquear AJRAZ10.",
    };
  }

  if (!isPromoCampaignActive()) {
    const before =
      getChileClockKey() < 20260824000000;

    return {
      ok: false,
      reason: before
        ? "not_started"
        : "expired",
      error: before
        ? "AJRAZ10 se activa el 24 de agosto de 2026 a las 00:00, hora de Chile."
        : "La campaña AJRAZ10 finalizó el 30 de septiembre de 2026.",
    };
  }

  const entitlement =
    await getPromoVerificationState(
      sql,
      email,
      code
    );

  if (!entitlement) {
    return {
      ok: false,
      reason: "not_authorized",
      error:
        "Este correo todavía no tiene acceso a AJRAZ10. Solicita el beneficio y confirma tu correo.",
    };
  }

  if (
    !entitlement.verified_at ||
    entitlement.status !== "active"
  ) {
    return {
      ok: false,
      reason: "email_not_verified",
      error:
        "Primero debes confirmar tu correo desde el enlace que enviamos para activar el 10%.",
    };
  }

  const chileDate = getChileDate();

  const validFrom = String(
    entitlement.valid_from
  ).slice(0, 10);

  const validUntil = String(
    entitlement.valid_until
  ).slice(0, 10);

  if (
    chileDate < validFrom ||
    chileDate > validUntil
  ) {
    return {
      ok: false,
      reason: "outside_entitlement",
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
    code: PROMO_CODE,
    discountPercent: DISCOUNT_PERCENT,
    originalBookPrice: BOOK_PRICE,
    discountAmount: DISCOUNT_AMOUNT,
    discountedBookPrice:
      DISCOUNTED_BOOK_PRICE,
    validUntil: PROMO_VALID_UNTIL,
    verifiedAt: entitlement.verified_at,
  };
}

async function parseResendResponse(response) {
  const text = await response.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = {
      raw: text,
    };
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildPromoVerificationEmail({
  email,
  name,
  token,
}) {
  const normalizedEmail =
    cleanEmail(email);

  const firstName =
    cleanText(name, 80)
      .split(/\s+/)
      .filter(Boolean)[0] || "";

  const greeting = firstName
    ? `${escapeHtml(firstName)},`
    : "Solicitud recibida.";

  const confirmUrl =
    `${SITE_URL}/api/ajraz10-confirm?token=` +
    encodeURIComponent(token);

  const subject =
    "CONFIRMA TU CORREO · Activa tu 10% en Archivo 066";

  const preheader =
    "Confirma que este correo te pertenece para activar AJRAZ10.";

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
  <title>${subject}</title>
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
    style="background:#050606;"
  >
    <tr>
      <td
        align="center"
        style="padding:30px 14px;"
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
                ARCHIVO 066
              </div>

              <div
                style="
                  margin-top:14px;
                  font:32px/1.1 Georgia,serif;
                  color:#fffaf0;
                "
              >
                CONFIRMA TU ACCESO
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:34px 32px 18px;
              "
            >
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
                  margin:0 0 20px;
                  font-size:16px;
                  line-height:1.75;
                  color:#bdb8ae;
                "
              >
                Solicitaste el beneficio privado del
                <strong style="color:#fffaf0;">
                  10% de descuento
                </strong>
                para la edición impresa de
                <strong style="color:#fffaf0;">
                  La Llave I: Ciudad Central
                </strong>.
              </p>

              <p
                style="
                  margin:0 0 24px;
                  font-size:16px;
                  line-height:1.75;
                  color:#bdb8ae;
                "
              >
                Para impedir que alguien use un correo
                inventado o ajeno, el código
                <strong style="color:#e7b84e;">
                  no se activa hasta que confirmes que
                  controlas esta dirección
                </strong>.
              </p>

              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                style="margin:30px auto;"
              >
                <tr>
                  <td
                    bgcolor="#d69b29"
                    style="border-radius:4px;"
                  >
                    <a
                      href="${confirmUrl}"
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
                      CONFIRMAR MI CORREO
                    </a>
                  </td>
                </tr>
              </table>

              <p
                style="
                  margin:24px 0 0;
                  font-size:13px;
                  line-height:1.7;
                  color:#918c83;
                "
              >
                Este enlace vence en 24 horas.
                Si tú no solicitaste este acceso para
                ${escapeHtml(normalizedEmail)},
                puedes ignorar este mensaje y el
                descuento no será habilitado.
              </p>
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
                  margin:0;
                  font-size:11px;
                  line-height:1.6;
                  color:#77736b;
                "
              >
                La Llave · Archivo 066 ·
                lallaveoficial.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text =
    `${firstName ? `${firstName},` : "Solicitud recibida."}\n\n` +
    `Solicitaste el beneficio privado del 10% para La Llave I: Ciudad Central.\n\n` +
    `Para activarlo, confirma que este correo te pertenece:\n` +
    `${confirmUrl}\n\n` +
    `El enlace vence en 24 horas. ` +
    `Si no solicitaste este acceso, ignora este mensaje y el descuento no será habilitado.`;

  return {
    subject,
    html,
    text,
    confirmUrl,
  };
}

export async function sendPromoVerificationEmail({
  apiKey,
  email,
  name,
  token,
}) {
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no está configurada."
    );
  }

  const message =
    buildPromoVerificationEmail({
      email,
      name,
      token,
    });

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          from: FROM_EMAIL,

          to: [
            cleanEmail(email),
          ],

          reply_to:
            REPLY_TO_EMAIL,

          subject:
            message.subject,

          html:
            message.html,

          text:
            message.text,
        }),
      }
    );

  return parseResendResponse(
    response
  );
}
