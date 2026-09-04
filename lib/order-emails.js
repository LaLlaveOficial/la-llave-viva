const FROM_EMAIL =
  "La Llave Oficial <contacto@lallaveoficial.com>";

const REPLY_TO_EMAIL =
  "contacto@lallaveoficial.com";

const RESEND_EMAILS_URL =
  "https://api.resend.com/emails";

const RECOVERY_DELAY_MS =
  2 * 60 * 60 * 1000;

const CONFIRMATION_TYPE =
  "purchase_confirmation";

const RECOVERY_TYPE =
  "checkout_recovery";

function cleanText(value, maxLength = 500) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return cleanText(value, 2000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatClp(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function firstName(fullName) {
  return cleanText(fullName, 120).split(" ")[0] || "lector";
}

function addressLine(order) {
  return [
    cleanText(order.street, 160),
    cleanText(order.street_number, 20),
  ]
    .filter(Boolean)
    .join(" ");
}

function addressDetail(order) {
  return [
    cleanText(order.address_extra, 160),
    cleanText(order.commune, 100),
    cleanText(order.region_name, 100),
  ]
    .filter(Boolean)
    .join(" · ");
}

function safeCheckoutUrl(value, fallback) {
  try {
    const url = new URL(String(value || ""));

    if (
      url.protocol === "https:" &&
      (url.hostname === "www.mercadopago.cl" ||
        url.hostname.endsWith(".mercadopago.cl") ||
        url.hostname === "www.mercadopago.com" ||
        url.hostname.endsWith(".mercadopago.com"))
    ) {
      return url.toString();
    }
  } catch {
    // El enlace alternativo mantiene al usuario dentro del sitio oficial.
  }

  return `${String(fallback || "https://www.lallaveoficial.com").replace(
    /\/+$/,
    ""
  )}/comprar`;
}

function emailShell({ eyebrow, title, preview, body }) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#060606;color:#f3efe7;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
      preview
    )}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060606;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border:1px solid #5f4a22;background:#0b0a08;">
            <tr>
              <td style="padding:36px 34px 18px;text-align:center;border-bottom:1px solid #3d311b;">
                <div style="font-size:12px;letter-spacing:3px;color:#efb94f;font-weight:700;">${escapeHtml(
                  eyebrow
                )}</div>
                <div style="margin-top:14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.12;color:#f5f0e7;">${escapeHtml(
                  title
                )}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 34px 36px;">${body}</td>
            </tr>
            <tr>
              <td style="padding:22px 30px;border-top:1px solid #3d311b;text-align:center;font-size:12px;line-height:1.65;color:#918b80;">
                La Llave Oficial · Keloke SpA<br>
                <a href="mailto:${REPLY_TO_EMAIL}" style="color:#dca947;text-decoration:none;">${REPLY_TO_EMAIL}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildPurchaseConfirmationEmail(order) {
  const reference = cleanText(order.external_reference, 180);
  const name = firstName(order.buyer_name);
  const street = addressLine(order);
  const detail = addressDetail(order);
  const total = formatClp(order.total_amount);
  const bookPrice = formatClp(order.book_price);
  const shipping = formatClp(order.shipping_amount);

  const subject = `COMPRA CONFIRMADA · Pedido ${reference}`;

  const body = `
    <p style="margin:0 0 18px;font-size:17px;line-height:1.7;color:#d8d3ca;">Hola, <strong style="color:#ffffff;">${escapeHtml(
      name
    )}</strong>.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#bdb8ae;">Mercado Pago confirmó correctamente tu compra. Tu ejemplar de <strong style="color:#ffffff;">La Llave I: Ciudad Central</strong> ya está en preparación.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #4c3c20;background:#11100d;">
      <tr><td style="padding:18px 20px;font-size:13px;color:#8f897e;">NÚMERO DE PEDIDO</td><td style="padding:18px 20px;text-align:right;font-size:13px;color:#efb94f;font-weight:700;">${escapeHtml(
        reference
      )}</td></tr>
      <tr><td style="padding:0 20px 14px;font-size:14px;color:#bdb8ae;">Libro</td><td style="padding:0 20px 14px;text-align:right;font-size:14px;color:#f3efe7;">${bookPrice}</td></tr>
      <tr><td style="padding:0 20px 14px;font-size:14px;color:#bdb8ae;">Despacho</td><td style="padding:0 20px 14px;text-align:right;font-size:14px;color:#f3efe7;">${shipping}</td></tr>
      <tr><td style="padding:16px 20px;border-top:1px solid #3d311b;font-size:15px;color:#efb94f;font-weight:700;">TOTAL PAGADO</td><td style="padding:16px 20px;border-top:1px solid #3d311b;text-align:right;font-size:22px;color:#efb94f;font-weight:700;">${total}</td></tr>
    </table>

    <div style="margin:0 0 24px;padding:20px;border-left:3px solid #efb94f;background:#12100b;">
      <div style="margin-bottom:8px;font-size:12px;letter-spacing:2px;color:#efb94f;font-weight:700;">DIRECCIÓN REGISTRADA</div>
      <div style="font-size:16px;line-height:1.6;color:#f3efe7;">${escapeHtml(
        street
      )}<br>${escapeHtml(detail)}</div>
    </div>

    <p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:#bdb8ae;"><strong style="color:#ffffff;">Revisa cuidadosamente estos datos.</strong> Si vives en un edificio y omitiste el número de departamento, torre o block —o falta cualquier referencia importante— responde este correo indicando tu número de pedido.</p>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#bdb8ae;">Cuando el ejemplar sea despachado recibirás la información de seguimiento.</p>
  `;

  const html = emailShell({
    eyebrow: "OPERACIÓN VALIDADA · ARCHIVO 066",
    title: "Tu compra fue confirmada",
    preview: `Pago aprobado para el pedido ${reference}.`,
    body,
  });

  const text = `OPERACIÓN VALIDADA · ARCHIVO 066

Hola, ${name}.

Mercado Pago confirmó correctamente tu compra de La Llave I: Ciudad Central.

Número de pedido: ${reference}
Libro: ${bookPrice}
Despacho: ${shipping}
Total pagado: ${total}

Dirección registrada:
${street}
${detail}

Revisa cuidadosamente estos datos. Si vives en un edificio y omitiste el número de departamento, torre o block —o falta cualquier referencia importante— responde este correo indicando tu número de pedido.

Cuando el ejemplar sea despachado recibirás la información de seguimiento.

La Llave Oficial · Keloke SpA
${REPLY_TO_EMAIL}`;

  return { subject, html, text };
}

export function buildCheckoutRecoveryEmail({ order, checkoutUrl, siteUrl }) {
  const reference = cleanText(order.external_reference, 180);
  const name = firstName(order.buyer_name);
  const total = formatClp(order.total_amount);
  const safeUrl = safeCheckoutUrl(checkoutUrl, siteUrl);
  const subject = "TU ACCESO QUEDÓ INCOMPLETO · Archivo 066";

  const body = `
    <p style="margin:0 0 18px;font-size:17px;line-height:1.7;color:#d8d3ca;">Hola, <strong style="color:#ffffff;">${escapeHtml(
      name
    )}</strong>.</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#bdb8ae;">Detectamos que el procedimiento se interrumpió antes de completar el pago. Tu solicitud para ingresar a <strong style="color:#ffffff;">Ciudad Central</strong> sigue registrada.</p>
    <div style="margin:0 0 26px;padding:20px;border:1px solid #4c3c20;background:#11100d;text-align:center;">
      <div style="font-size:12px;letter-spacing:2px;color:#8f897e;">PEDIDO ${escapeHtml(
        reference
      )}</div>
      <div style="margin-top:10px;font-size:28px;color:#efb94f;font-weight:700;">${total}</div>
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 26px;">
      <tr>
        <td style="border-radius:4px;background:#e2a62f;">
          <a href="${escapeHtml(
            safeUrl
          )}" style="display:inline-block;padding:17px 30px;color:#111111;font-size:15px;font-weight:800;letter-spacing:1.5px;text-decoration:none;">RETOMAR MI COMPRA</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#a8a298;text-align:center;">Si Mercado Pago no confirmó la operación, no se realizó ningún cobro.</p>
    <p style="margin:0;font-size:13px;line-height:1.7;color:#77736b;text-align:center;">Si ya completaste el pago, puedes ignorar este mensaje. No enviaremos más recordatorios de este pedido.</p>
  `;

  const html = emailShell({
    eyebrow: "PROTOCOLO INTERRUMPIDO · ARCHIVO 066",
    title: "Tu acceso quedó a un paso",
    preview: "Tu ejemplar todavía puede ser recuperado.",
    body,
  });

  const text = `PROTOCOLO INTERRUMPIDO · ARCHIVO 066

Hola, ${name}.

Detectamos que el procedimiento se interrumpió antes de completar el pago. Tu solicitud para ingresar a Ciudad Central sigue registrada.

Pedido: ${reference}
Total: ${total}

Retomar compra: ${safeUrl}

Si Mercado Pago no confirmó la operación, no se realizó ningún cobro. Si ya completaste el pago, puedes ignorar este mensaje. No enviaremos más recordatorios de este pedido.

La Llave Oficial · Keloke SpA
${REPLY_TO_EMAIL}`;

  return { subject, html, text };
}

async function parseResendResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.id) {
    const error = new Error(
      data?.message || `Resend respondió con estado ${response.status}.`
    );

    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function sendResendEmail({
  apiKey,
  idempotencyKey,
  to,
  subject,
  html,
  text,
  scheduledAt,
  type,
}) {
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      reply_to: REPLY_TO_EMAIL,
      subject,
      html,
      text,
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      tags: [
        { name: "category", value: "orders" },
        { name: "type", value: type },
      ],
    }),
  });

  return parseResendResponse(response);
}

async function claimEmail({
  sql,
  externalReference,
  emailType,
  recipientEmail,
  scheduledFor = null,
}) {
  const rows = await sql`
    INSERT INTO order_email_events (
      external_reference,
      email_type,
      recipient_email,
      status,
      scheduled_for,
      attempt_count,
      created_at,
      updated_at
    ) VALUES (
      ${externalReference},
      ${emailType},
      ${recipientEmail},
      'processing',
      ${scheduledFor},
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (external_reference, email_type)
    DO UPDATE SET
      recipient_email = EXCLUDED.recipient_email,
      status = 'processing',
      scheduled_for = EXCLUDED.scheduled_for,
      error_message = NULL,
      attempt_count = order_email_events.attempt_count + 1,
      updated_at = NOW()
    WHERE order_email_events.status IN ('failed', 'cancel_failed')
    RETURNING id
  `;

  return rows[0] || null;
}

async function markEmailFailure(sql, externalReference, emailType, error) {
  await sql`
    UPDATE order_email_events
    SET
      status = 'failed',
      error_message = ${cleanText(error?.message || "email_failed", 1000)},
      updated_at = NOW()
    WHERE external_reference = ${externalReference}
      AND email_type = ${emailType}
  `;
}

export async function scheduleCheckoutRecovery({
  apiKey,
  sql,
  order,
  checkoutUrl,
  siteUrl,
}) {
  if (!apiKey) {
    return { scheduled: false, reason: "resend_not_configured" };
  }

  const scheduledAt = new Date(Date.now() + RECOVERY_DELAY_MS).toISOString();
  const claim = await claimEmail({
    sql,
    externalReference: order.external_reference,
    emailType: RECOVERY_TYPE,
    recipientEmail: order.buyer_email,
    scheduledFor: scheduledAt,
  });

  if (!claim) {
    return { scheduled: false, reason: "already_processed" };
  }

  let resendId = null;

  try {
    const mail = buildCheckoutRecoveryEmail({ order, checkoutUrl, siteUrl });
    const data = await sendResendEmail({
      apiKey,
      idempotencyKey: `order-recovery-${order.external_reference}`,
      to: order.buyer_email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      scheduledAt,
      type: RECOVERY_TYPE,
    });

    resendId = data.id;

    await sql`
      UPDATE order_email_events
      SET
        resend_email_id = ${resendId},
        status = 'scheduled',
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ${claim.id}
    `;

    return { scheduled: true, resendId, scheduledAt };
  } catch (error) {
    if (resendId) {
      try {
        await fetch(`${RESEND_EMAILS_URL}/${encodeURIComponent(resendId)}/cancel`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });
      } catch {
        // El error original queda registrado y el checkout continúa disponible.
      }
    }

    await markEmailFailure(sql, order.external_reference, RECOVERY_TYPE, error);

    return {
      scheduled: false,
      reason: "schedule_failed",
      error: cleanText(error?.message, 500),
    };
  }
}

export async function cancelCheckoutRecovery({ apiKey, sql, externalReference }) {
  if (!apiKey) {
    return { canceled: false, reason: "resend_not_configured" };
  }

  const rows = await sql`
    SELECT id, resend_email_id, status
    FROM order_email_events
    WHERE external_reference = ${externalReference}
      AND email_type = ${RECOVERY_TYPE}
    LIMIT 1
  `;

  const event = rows[0];

  if (!event) {
    return { canceled: false, reason: "not_scheduled" };
  }

  if (event.status === "canceled") {
    return { canceled: true, reason: "already_canceled" };
  }

  if (event.status !== "scheduled" || !event.resend_email_id) {
    return { canceled: false, reason: `status_${event.status}` };
  }

  try {
    const response = await fetch(
      `${RESEND_EMAILS_URL}/${encodeURIComponent(event.resend_email_id)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(
        data?.message || `Resend respondió con estado ${response.status}.`
      );
      throw error;
    }

    await sql`
      UPDATE order_email_events
      SET
        status = 'canceled',
        canceled_at = NOW(),
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ${event.id}
    `;

    return { canceled: true, reason: "payment_approved" };
  } catch (error) {
    await sql`
      UPDATE order_email_events
      SET
        status = 'cancel_failed',
        error_message = ${cleanText(error?.message || "cancel_failed", 1000)},
        updated_at = NOW()
      WHERE id = ${event.id}
    `;

    return {
      canceled: false,
      reason: "cancel_failed",
      error: cleanText(error?.message, 500),
    };
  }
}

export async function sendPurchaseConfirmation({ apiKey, sql, order }) {
  if (!apiKey) {
    return { sent: false, reason: "resend_not_configured" };
  }

  const claim = await claimEmail({
    sql,
    externalReference: order.external_reference,
    emailType: CONFIRMATION_TYPE,
    recipientEmail: order.buyer_email,
  });

  if (!claim) {
    return { sent: false, reason: "already_processed" };
  }

  try {
    const mail = buildPurchaseConfirmationEmail(order);
    const data = await sendResendEmail({
      apiKey,
      idempotencyKey: `order-confirmation-${order.external_reference}`,
      to: order.buyer_email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      type: CONFIRMATION_TYPE,
    });

    await sql`
      UPDATE order_email_events
      SET
        resend_email_id = ${data.id},
        status = 'sent',
        sent_at = NOW(),
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ${claim.id}
    `;

    return { sent: true, resendId: data.id };
  } catch (error) {
    await markEmailFailure(
      sql,
      order.external_reference,
      CONFIRMATION_TYPE,
      error
    );

    return {
      sent: false,
      reason: "send_failed",
      error: cleanText(error?.message, 500),
    };
  }
}
