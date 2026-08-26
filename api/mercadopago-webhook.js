import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const SHIPPING_RM = 3000;
const SHIPPING_REGIONS = 4500;
const GA4_DEFAULT_MEASUREMENT_ID = "G-G17WQELH77";

const VALID_SHIPPING_AMOUNTS = new Set([
  SHIPPING_RM,
  SHIPPING_REGIONS,
]);

function firstValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getHeader(req, name) {
  const direct = req.headers?.[name];
  if (direct) return firstValue(direct);

  const lowerName = name.toLowerCase();
  const foundKey = Object.keys(req.headers || {}).find(
    (key) => key.toLowerCase() === lowerName
  );

  return foundKey ? firstValue(req.headers[foundKey]) : "";
}

function cleanId(value) {
  return String(value || "").trim();
}

function parseSignature(signatureHeader) {
  const result = {};

  String(signatureHeader || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) return;

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      if (key && value) result[key] = value;
    });

  return {
    ts: result.ts || "",
    v1: result.v1 || "",
  };
}

function safeHexEqual(a, b) {
  const left = String(a || "").toLowerCase();
  const right = String(b || "").toLowerCase();

  if (!/^[a-f0-9]+$/.test(left) || !/^[a-f0-9]+$/.test(right)) {
    return false;
  }

  if (left.length !== right.length || left.length % 2 !== 0) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(left, "hex"),
    Buffer.from(right, "hex")
  );
}

function verifyWebhookSignature({
  secret,
  dataId,
  requestId,
  signatureHeader,
}) {
  const { ts, v1 } = parseSignature(signatureHeader);

  if (!secret || !ts || !v1) {
    return false;
  }

  const manifestParts = [];

  if (dataId) manifestParts.push(`id:${dataId};`);
  if (requestId) manifestParts.push(`request-id:${requestId};`);
  manifestParts.push(`ts:${ts};`);

  const manifest = manifestParts.join("");

  const calculated = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return safeHexEqual(calculated, v1);
}

async function getPayment(paymentId, accessToken) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      "No fue posible consultar el pago en Mercado Pago."
    );
    error.status = response.status;
    error.details = {
      message: data?.message,
      error: data?.error,
      status: response.status,
    };
    throw error;
  }

  return data;
}

function isOurOrder(payment) {
  const reference = String(payment?.external_reference || "");
  const currency = String(payment?.currency_id || "");
  const productAmount = Number(payment?.transaction_amount);
  const shippingAmount = Number(payment?.shipping_amount);

  return (
    /^LLAVE-\d+-[A-Z0-9]+$/.test(reference) &&
    currency === "CLP" &&
    Number.isFinite(productAmount) &&
    productAmount > 0 &&
    Number.isFinite(shippingAmount) &&
    VALID_SHIPPING_AMOUNTS.has(shippingAmount)
  );
}

function normalizeTimestamp(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function validGa4ClientId(value) {
  const text = String(value || "").trim();
  return /^\d+\.\d+$/.test(text) ? text : "";
}

function validGa4SessionId(value) {
  const text = String(value || "").trim();
  return /^\d+$/.test(text) ? text : "";
}

function buildGa4Item(price) {
  return {
    item_id: "la-llave-i-ciudad-central-physical",
    item_name: "La Llave I: Ciudad Central",
    item_category: "Libro",
    item_variant: "Edición impresa",
    price,
    quantity: 1,
  };
}

async function sendGa4Purchase({
  apiSecret,
  measurementId,
  order,
  payment,
}) {
  const clientId = validGa4ClientId(order.ga4_client_id);
  const sessionId = validGa4SessionId(order.ga4_session_id);

  if (!apiSecret) {
    return {
      sent: false,
      reason: "missing_api_secret",
    };
  }

  if (!clientId) {
    return {
      sent: false,
      reason: "missing_client_id",
    };
  }

  if (order.ga4_purchase_sent_at) {
    return {
      sent: false,
      reason: "already_sent",
    };
  }

  const bookPrice = Number(order.book_price);
  const shippingAmount = Number(order.shipping_amount);

  const params = {
    transaction_id: String(payment.id),
    currency: String(order.currency || "CLP"),
    value: bookPrice,
    shipping: shippingAmount,
    payment_provider: "mercado_pago",
    payment_status: "approved",
    engagement_time_msec: 1,
    items: [buildGa4Item(bookPrice)],
  };

  if (sessionId) {
    params.session_id = sessionId;
  }

  const url = new URL(
    "https://www.google-analytics.com/mp/collect"
  );

  url.searchParams.set("measurement_id", measurementId);
  url.searchParams.set("api_secret", apiSecret);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      events: [
        {
          name: "purchase",
          params,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const error = new Error(
      `GA4 Measurement Protocol respondió ${response.status}.`
    );
    error.details = details.slice(0, 500);
    throw error;
  }

  return {
    sent: true,
    transactionId: String(payment.id),
    clientId,
    sessionId: sessionId || null,
  };
}

async function persistGa4Result(sql, orderId, result) {
  if (result?.sent) {
    await sql`
      UPDATE orders
      SET
        ga4_purchase_sent_at = NOW(),
        ga4_purchase_error = NULL,
        updated_at = NOW()
      WHERE id = ${orderId}
    `;
    return;
  }

  if (
    result?.reason &&
    result.reason !== "already_sent"
  ) {
    await sql`
      UPDATE orders
      SET
        ga4_purchase_error = ${String(result.reason).slice(0, 500)},
        updated_at = NOW()
      WHERE id = ${orderId}
    `;
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "mercadopago-webhook",
      webhook_secret_configured: Boolean(
        process.env.MERCADOPAGO_WEBHOOK_SECRET
      ),
      access_token_configured: Boolean(
        process.env.MERCADOPAGO_ACCESS_TOKEN
      ),
      database_configured: Boolean(process.env.DATABASE_URL),
      ga4_measurement_id:
        process.env.GA4_MEASUREMENT_ID ||
        GA4_DEFAULT_MEASUREMENT_ID,
      ga4_api_secret_configured: Boolean(
        process.env.GA4_API_SECRET
      ),
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  const ga4ApiSecret = process.env.GA4_API_SECRET || "";
  const ga4MeasurementId =
    process.env.GA4_MEASUREMENT_ID ||
    GA4_DEFAULT_MEASUREMENT_ID;

  if (!accessToken || !webhookSecret || !databaseUrl) {
    console.error(
      "Mercado Pago webhook: faltan variables de entorno."
    );

    return res.status(500).json({
      error:
        "Webhook todavía no configurado completamente en el servidor.",
    });
  }

  const signatureHeader = getHeader(req, "x-signature");
  const requestId = cleanId(getHeader(req, "x-request-id"));

  const queryDataId = cleanId(
    firstValue(req.query?.["data.id"]) ||
      firstValue(req.query?.data_id) ||
      firstValue(req.query?.id)
  );

  const bodyDataId = cleanId(req.body?.data?.id);
  const paymentId = queryDataId || bodyDataId;

  if (!signatureHeader || !requestId || !paymentId) {
    console.warn(
      "Mercado Pago webhook: solicitud incompleta.",
      {
        hasSignature: Boolean(signatureHeader),
        hasRequestId: Boolean(requestId),
        hasPaymentId: Boolean(paymentId),
      }
    );

    return res.status(400).json({
      error: "Notificación incompleta.",
    });
  }

  const signatureValid = verifyWebhookSignature({
    secret: webhookSecret,
    dataId: paymentId,
    requestId,
    signatureHeader,
  });

  if (!signatureValid) {
    console.warn(
      "Mercado Pago webhook: firma inválida.",
      {
        paymentId,
        requestId,
      }
    );

    return res.status(401).json({
      error: "Firma de webhook inválida.",
    });
  }

  const notificationType = String(
    firstValue(req.query?.type) ||
      req.body?.type ||
      ""
  ).toLowerCase();

  if (notificationType && notificationType !== "payment") {
    console.info(
      "Mercado Pago webhook: evento ignorado.",
      {
        type: notificationType,
        paymentId,
      }
    );

    return res.status(200).json({
      received: true,
      ignored: true,
    });
  }

  try {
    const payment = await getPayment(paymentId, accessToken);

    if (String(payment?.id) !== String(paymentId)) {
      console.error(
        "Mercado Pago webhook: ID de pago no coincide.",
        {
          notifiedPaymentId: paymentId,
          fetchedPaymentId: payment?.id,
        }
      );

      return res.status(409).json({
        error:
          "El pago consultado no coincide con la notificación.",
      });
    }

    if (!isOurOrder(payment)) {
      console.error(
        "Mercado Pago webhook: pago no corresponde a La Llave.",
        {
          paymentId: payment?.id,
          externalReference: payment?.external_reference,
          currency: payment?.currency_id,
          productAmount: payment?.transaction_amount,
          shippingAmount: payment?.shipping_amount,
        }
      );

      return res.status(409).json({
        error:
          "El pago no corresponde a un pedido válido de La Llave.",
      });
    }

    const externalReference = String(
      payment.external_reference
    );
    const productAmount = Number(payment.transaction_amount);
    const shippingAmount = Number(payment.shipping_amount);
    const expectedTotal = productAmount + shippingAmount;
    const status = String(payment.status || "unknown");
    const statusDetail = String(
      payment.status_detail || ""
    );
    const approvedAt = normalizeTimestamp(
      payment.date_approved
    );
    const lastUpdatedAt = normalizeTimestamp(
      payment.date_last_updated
    );

    const sql = neon(databaseUrl);

    const existingOrders = await sql`
      SELECT
        id,
        external_reference,
        book_price,
        shipping_amount,
        total_amount,
        currency,
        ga4_client_id,
        ga4_session_id,
        ga4_purchase_sent_at,
        ga4_purchase_error
      FROM orders
      WHERE external_reference = ${externalReference}
      LIMIT 1
    `;

    if (!existingOrders.length) {
      console.warn(
        "Mercado Pago webhook: pedido histórico o no registrado.",
        {
          paymentId: payment.id,
          externalReference,
        }
      );

      return res.status(200).json({
        received: true,
        verified: true,
        persisted: false,
        reason: "order_not_found",
      });
    }

    const order = existingOrders[0];

    if (
      Number(order.book_price) !== productAmount ||
      Number(order.shipping_amount) !== shippingAmount ||
      Number(order.total_amount) !== expectedTotal ||
      String(order.currency) !== String(payment.currency_id)
    ) {
      console.error(
        "Mercado Pago webhook: montos no coinciden con el pedido.",
        {
          paymentId: payment.id,
          externalReference,
          databaseBookPrice: order.book_price,
          databaseShipping: order.shipping_amount,
          databaseTotal: order.total_amount,
          paymentBookPrice: productAmount,
          paymentShipping: shippingAmount,
          paymentTotal: expectedTotal,
        }
      );

      return res.status(409).json({
        error:
          "Los montos del pago no coinciden con el pedido registrado.",
      });
    }

    const updatedOrders = await sql`
      UPDATE orders
      SET
        mercadopago_payment_id = ${String(payment.id)},
        payment_status = ${status},
        payment_status_detail = ${statusDetail || null},
        live_mode = ${Boolean(payment.live_mode)},
        mercado_pago_approved_at = ${approvedAt},
        mercado_pago_updated_at = ${lastUpdatedAt},
        updated_at = NOW()
      WHERE external_reference = ${externalReference}
      RETURNING
        id,
        external_reference,
        mercadopago_payment_id,
        payment_status,
        payment_status_detail,
        total_amount,
        currency,
        mercado_pago_approved_at,
        mercado_pago_updated_at,
        updated_at
    `;

    if (!updatedOrders.length) {
      throw new Error(
        "El pedido desapareció antes de poder actualizarse."
      );
    }

    const verifiedPayment = {
      paymentId: String(payment.id),
      status,
      statusDetail,
      externalReference,
      productAmount,
      shippingAmount,
      expectedTotal,
      currency: String(payment.currency_id || ""),
      liveMode: Boolean(payment.live_mode),
      dateApproved: approvedAt,
      dateLastUpdated: lastUpdatedAt,
    };

    console.info(
      "MERCADOPAGO_PAYMENT_PERSISTED",
      JSON.stringify(verifiedPayment)
    );

    let ga4Result = {
      sent: false,
      reason: "not_approved",
    };

    if (status === "approved") {
      try {
        ga4Result = await sendGa4Purchase({
          apiSecret: ga4ApiSecret,
          measurementId: ga4MeasurementId,
          order,
          payment,
        });

        await persistGa4Result(
          sql,
          order.id,
          ga4Result
        );

        console.info(
          "GA4_PURCHASE_RESULT",
          JSON.stringify({
            externalReference,
            paymentId: String(payment.id),
            sent: Boolean(ga4Result.sent),
            reason: ga4Result.reason || null,
          })
        );
      } catch (ga4Error) {
        const message = String(
          ga4Error?.message || "ga4_purchase_send_failed"
        ).slice(0, 500);

        try {
          await sql`
            UPDATE orders
            SET
              ga4_purchase_error = ${message},
              updated_at = NOW()
            WHERE id = ${order.id}
          `;
        } catch (persistError) {
          console.error(
            "GA4 purchase error persistence failed:",
            {
              orderId: order.id,
              message: persistError?.message,
            }
          );
        }

        ga4Result = {
          sent: false,
          reason: "send_failed",
        };

        console.error(
          "GA4 purchase send failed:",
          {
            externalReference,
            paymentId: String(payment.id),
            message: ga4Error?.message,
            details: ga4Error?.details,
          }
        );
      }
    }

    return res.status(200).json({
      received: true,
      verified: true,
      persisted: true,
      payment: verifiedPayment,
      ga4: {
        sent: Boolean(ga4Result.sent),
        reason: ga4Result.reason || null,
      },
    });
  } catch (error) {
    console.error(
      "Mercado Pago webhook: error verificando o guardando pago.",
      {
        paymentId,
        message: error?.message,
        status: error?.status,
        details: error?.details,
      }
    );

    return res.status(502).json({
      error:
        "La notificación fue válida, pero no pudimos verificar o guardar el pago.",
    });
  }
}
