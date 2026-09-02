import {
  PROMO_CODE,
  SITE_URL,
  cleanText,
  createUnsubscribeToken,
  ensurePromoTables,
  getSql,
  schedulePromoSequence,
  sendPromoWelcome,
} from "../lib/ajraz10.js";

import {
  ensurePromoVerificationColumns,
  findPendingVerificationByToken,
  isValidVerificationToken,
} from "../lib/ajraz10-verification.js";

function sendHtml(res, statusCode, html) {
  res.setHeader(
    "Content-Type",
    "text/html; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  res.setHeader(
    "Pragma",
    "no-cache"
  );

  res.setHeader(
    "X-Robots-Tag",
    "noindex, nofollow"
  );

  return res
    .status(statusCode)
    .send(html);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pageShell({
  eyebrow,
  title,
  message,
  actionHtml = "",
}) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >

  <meta
    name="robots"
    content="noindex,nofollow"
  >

  <title>${escapeHtml(title)} · La Llave</title>
</head>

<body
  style="
    margin:0;
    background:#050606;
    color:#f5f0e6;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    style="
      min-height:100vh;
      background:#050606;
    "
  >
    <tr>
      <td
        align="center"
        style="padding:32px 14px;"
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
                padding:38px 32px 24px;
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
                ${escapeHtml(eyebrow)}
              </div>

              <div
                style="
                  margin-top:14px;
                  font:34px/1.1 Georgia,serif;
                  color:#fffaf0;
                "
              >
                ${escapeHtml(title)}
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:34px 32px 38px;
              "
            >
              <div
                style="
                  font-size:16px;
                  line-height:1.75;
                  color:#bdb8ae;
                  text-align:center;
                "
              >
                ${message}
              </div>

              ${actionHtml}

              <p
                style="
                  margin:34px 0 0;
                  text-align:center;
                  font-size:11px;
                  line-height:1.6;
                  color:#77736b;
                "
              >
                La Llave I: Ciudad Central ·
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
}

function buyButton(
  label = "VOLVER A LA COMPRA"
) {
  return `
    <div
      style="
        margin-top:28px;
        text-align:center;
      "
    >
      <a
        href="${SITE_URL}/comprar"
        style="
          display:inline-block;
          padding:16px 26px;
          border-radius:4px;
          background:#d69b29;
          color:#090909;
          text-decoration:none;
          font-size:12px;
          font-weight:800;
          letter-spacing:1.5px;
        "
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

function successPage({
  email,
  emailWarning = false,
}) {
  const safeEmail =
    escapeHtml(email);

  const message = `
    <p
      style="
        margin:0 0 18px;
      "
    >
      Confirmamos que tienes acceso a
      <strong
        style="color:#fffaf0;"
      >
        ${safeEmail}
      </strong>.
    </p>

    <p
      style="
        margin:0 0 24px;
      "
    >
      Tu beneficio quedó activado.
      Para usarlo, vuelve a la compra
      con este mismo correo e ingresa:
    </p>

    <div
      style="
        margin:26px auto;
        padding:22px;
        border:1px solid #6b4b16;
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
        CÓDIGO PRIVADO ACTIVO
      </div>

      <div
        style="
          margin-top:14px;
          font:700 30px/1 monospace;
          letter-spacing:4px;
          color:#e7b84e;
        "
      >
        ${PROMO_CODE}
      </div>

      <div
        style="
          margin-top:12px;
          font-size:14px;
          color:#bdb8ae;
        "
      >
        10% de descuento sobre
        el precio del libro.
      </div>
    </div>

    ${
      emailWarning
        ? `
          <p
            style="
              margin:20px 0 0;
              color:#d7b35d;
            "
          >
            El acceso ya está activo,
            aunque el correo final con el
            código no pudo enviarse en este
            momento. Puedes usar
            ${PROMO_CODE} igualmente desde
            esta página.
          </p>
        `
        : `
          <p
            style="
              margin:20px 0 0;
            "
          >
            También enviamos la confirmación
            final a tu correo.
          </p>
        `
    }
  `;

  return pageShell({
    eyebrow:
      "ARCHIVO 066 · CORREO CONFIRMADO",

    title:
      "ACCESO ACTIVADO",

    message,

    actionHtml:
      buyButton("USAR MI 10%"),
  });
}

function expiredPage() {
  return pageShell({
    eyebrow:
      "ARCHIVO 066 · ENLACE VENCIDO",

    title:
      "CONFIRMACIÓN EXPIRADA",

    message:
      "Este enlace ya no puede activar AJRAZ10. Vuelve a la página de compra y solicita un nuevo correo de confirmación.",

    actionHtml:
      buyButton(
        "SOLICITAR OTRO ENLACE"
      ),
  });
}

function invalidPage() {
  return pageShell({
    eyebrow:
      "ARCHIVO 066 · CONTROL DE ACCESO",

    title:
      "ENLACE NO VÁLIDO",

    message:
      "No pudimos validar este enlace. Puede haber sido utilizado anteriormente, haber vencido o no corresponder a una solicitud vigente.",

    actionHtml:
      buyButton(),
  });
}

async function ensureVerificationNameColumn(
  sql
) {
  await sql`
    ALTER TABLE promo_entitlements
    ADD COLUMN IF NOT EXISTS
    verification_name TEXT
  `;
}

async function activateSubscriber({
  sql,
  email,
  name,
}) {
  const rows =
    await sql`
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

  const existing =
    rows[0] || null;

  if (!existing) {
    const unsubscribeToken =
      createUnsubscribeToken();

    const inserted =
      await sql`
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
          'popup_ajraz10',
          'es',
          'double_opt_in',
          'archivo066-ajraz10-double-opt-in-v1',
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

    return {
      subscriber:
        inserted[0],

      shouldScheduleSequence:
        true,

      existingSubscriber:
        false,
    };
  }

  if (
    existing.status === "active"
  ) {
    const updated =
      await sql`
        UPDATE mailing_subscribers
        SET
          name =
            COALESCE(
              ${name || null},
              name
            ),

          source =
            'popup_ajraz10',

          language =
            'es',

          consent_method =
            'double_opt_in',

          consent_version =
            'archivo066-ajraz10-double-opt-in-v1',

          consent_at =
            NOW(),

          updated_at =
            NOW()

        WHERE id =
          ${existing.id}

        RETURNING
          id,
          email,
          name,
          status,
          unsubscribe_token,
          last_email_sent_at
      `;

    return {
      subscriber:
        updated[0],

      shouldScheduleSequence:
        false,

      existingSubscriber:
        true,
    };
  }

  if (
    existing.status ===
    "unsubscribed"
  ) {
    const unsubscribeToken =
      createUnsubscribeToken();

    const reactivated =
      await sql`
        UPDATE mailing_subscribers
        SET
          name =
            COALESCE(
              ${name || null},
              name
            ),

          status =
            'active',

          source =
            'popup_ajraz10',

          language =
            'es',

          consent_method =
            'double_opt_in',

          consent_version =
            'archivo066-ajraz10-double-opt-in-v1',

          consent_at =
            NOW(),

          unsubscribe_token =
            ${unsubscribeToken},

          unsubscribed_at =
            NULL,

          last_email_sent_at =
            NULL,

          updated_at =
            NOW()

        WHERE id =
          ${existing.id}

        RETURNING
          id,
          email,
          name,
          status,
          unsubscribe_token,
          last_email_sent_at
      `;

    return {
      subscriber:
        reactivated[0],

      shouldScheduleSequence:
        true,

      existingSubscriber:
        false,
    };
  }

  throw new Error(
    `Este correo tiene un estado de suscripción que requiere revisión manual: ${existing.status}`
  );
}

async function activateEntitlementOnce(
  sql,
  pendingId
) {
  const rows =
    await sql`
      UPDATE promo_entitlements
      SET
        status =
          'active',

        verified_at =
          NOW(),

        granted_at =
          NOW(),

        verification_token_hash =
          NULL,

        verification_expires_at =
          NULL,

        updated_at =
          NOW()

      WHERE id =
        ${pendingId}

        AND status =
          'pending'

      RETURNING
        id,
        email,
        code,
        status,
        valid_from::text
          AS valid_from,
        valid_until::text
          AS valid_until,
        verified_at,
        email_sent_at
    `;

  return rows[0] || null;
}

export default async function handler(
  req,
  res
) {
  if (
    req.method !== "GET"
  ) {
    res.setHeader(
      "Allow",
      "GET"
    );

    return sendHtml(
      res,
      405,
      pageShell({
        eyebrow:
          "ARCHIVO 066",

        title:
          "MÉTODO NO PERMITIDO",

        message:
          "Este enlace solo puede abrirse desde el correo de confirmación.",

        actionHtml:
          buyButton(),
      })
    );
  }

  if (
    !process.env.DATABASE_URL
  ) {
    return sendHtml(
      res,
      500,
      pageShell({
        eyebrow:
          "ARCHIVO 066 · SISTEMA",

        title:
          "SERVICIO NO DISPONIBLE",

        message:
          "No pudimos procesar la confirmación en este momento. Intenta nuevamente en unos minutos.",

        actionHtml:
          buyButton(),
      })
    );
  }

  const token =
    cleanText(
      req.query?.token,
      128
    );

  if (
    !isValidVerificationToken(
      token
    )
  ) {
    return sendHtml(
      res,
      400,
      invalidPage()
    );
  }

  const sql =
    getSql();

  try {
    await ensurePromoTables(
      sql
    );

    await ensurePromoVerificationColumns(
      sql
    );

    await ensureVerificationNameColumn(
      sql
    );

    const pending =
      await findPendingVerificationByToken(
        sql,
        token
      );

    if (
      !pending ||
      pending.status !==
        "pending"
    ) {
      return sendHtml(
        res,
        404,
        invalidPage()
      );
    }

    const expiresAt =
      new Date(
        pending
          .verification_expires_at
      ).getTime();

    if (
      !Number.isFinite(
        expiresAt
      ) ||
      expiresAt <=
        Date.now()
    ) {
      await sql`
        UPDATE promo_entitlements
        SET
          status =
            'expired',

          verification_token_hash =
            NULL,

          verification_expires_at =
            NULL,

          updated_at =
            NOW()

        WHERE id =
          ${pending.id}

          AND status =
            'pending'
      `;

      return sendHtml(
        res,
        410,
        expiredPage()
      );
    }

    const nameRows =
      await sql`
        SELECT
          verification_name
        FROM promo_entitlements
        WHERE id =
          ${pending.id}
        LIMIT 1
      `;

    const requestedName =
      cleanText(
        nameRows[0]
          ?.verification_name,
        80
      );

    const {
      subscriber,
      shouldScheduleSequence,
      existingSubscriber,
    } =
      await activateSubscriber({
        sql,

        email:
          pending.email,

        name:
          requestedName,
      });

    const entitlement =
      await activateEntitlementOnce(
        sql,
        pending.id
      );

    if (!entitlement) {
      return sendHtml(
        res,
        409,
        invalidPage()
      );
    }

    let emailWarning =
      false;

    const resendApiKey =
      process.env
        .RESEND_API_KEY;

    if (!resendApiKey) {
      emailWarning =
        true;
    } else if (
      !entitlement
        .email_sent_at
    ) {
      try {
        await sendPromoWelcome({
          apiKey:
            resendApiKey,

          subscriber,

          existingSubscriber,
        });

        await sql`
          UPDATE promo_entitlements
          SET
            email_sent_at =
              NOW(),

            updated_at =
              NOW()

          WHERE id =
            ${entitlement.id}
        `;

        await sql`
          UPDATE mailing_subscribers
          SET
            last_email_sent_at =
              NOW(),

            updated_at =
              NOW()

          WHERE id =
            ${subscriber.id}
        `;
      } catch (
        emailError
      ) {
        emailWarning =
          true;

        console.error(
          "AJRAZ10 confirmed welcome email error",
          {
            email:
              entitlement.email,

            subscriberId:
              subscriber.id,

            message:
              emailError
                ?.message,

            status:
              emailError
                ?.status,

            details:
              emailError
                ?.details,
          }
        );
      }
    }

    if (
      resendApiKey &&
      shouldScheduleSequence
    ) {
      try {
        await schedulePromoSequence({
          apiKey:
            resendApiKey,

          sql,

          subscriber,
        });
      } catch (
        sequenceError
      ) {
        console.error(
          "AJRAZ10 confirmed sequence scheduling error",
          {
            email:
              entitlement.email,

            subscriberId:
              subscriber.id,

            message:
              sequenceError
                ?.message,
          }
        );
      }
    }

    return sendHtml(
      res,
      200,
      successPage({
        email:
          entitlement.email,

        emailWarning,
      })
    );
  } catch (error) {
    console.error(
      "AJRAZ10 confirmation error",
      {
        message:
          error?.message,

        details:
          error?.details,
      }
    );

    return sendHtml(
      res,
      500,
      pageShell({
        eyebrow:
          "ARCHIVO 066 · SISTEMA",

        title:
          "NO PUDIMOS CONFIRMAR",

        message:
          "La confirmación encontró un problema técnico. Intenta abrir nuevamente el enlace en unos minutos. Si el acceso ya quedó confirmado, podrás usar AJRAZ10 con el mismo correo en la página de compra.",

        actionHtml:
          buyButton(),
      })
    );
  }
}
