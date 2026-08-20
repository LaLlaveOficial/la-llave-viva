import crypto from "node:crypto";

const BOOK_PRICE = 15990;
const SHIPPING_RM = 3000;
const SHIPPING_REGIONS = 4500;

const VALID_TOTALS = new Set([
  BOOK_PRICE + SHIPPING_RM,
  BOOK_PRICE + SHIPPING_REGIONS,
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
    const error = new Error("No fue posible consultar el pago en Mercado Pago.");
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
  const amount = Number(payment?.transaction_amount);

  return (
    /^LLAVE-\d+-[A-Z0-9]+$/.test(reference) &&
    currency === "CLP" &&
    Number.isFinite(amount) &&
    VALID_TOTALS.has(amount)
  );
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

  if (!accessToken || !webhookSecret) {
    console.error("Mercado Pago webhook: faltan variables de entorno.");

    return res.status(500).json({
      error: "Webhook todavía no configurado en el servidor.",
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
    console.warn("Mercado Pago webhook: solicitud incompleta.", {
      hasSignature: Boolean(signatureHeader),
      hasRequestId: Boolean(requestId),
      hasPaymentId: Boolean(paymentId),
    });

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
    console.warn("Mercado Pago webhook: firma inválida.", {
      paymentId,
      requestId,
    });

    return res.status(401).json({
      error: "Firma de webhook inválida.",
    });
  }

  const notificationType = String(
    firstValue(req.query?.type) || req.body?.type || ""
  ).toLowerCase();

  if (notificationType && notificationType !== "payment") {
    console.info("Mercado Pago webhook: evento ignorado.", {
      type: notificationType,
      paymentId,
    });

    return res.status(200).json({
      received: true,
      ignored: true,
    });
  }

  try {
    const payment = await getPayment(paymentId, accessToken);

    if (String(payment?.id) !== String(paymentId)) {
      console.error("Mercado Pago webhook: ID de pago no coincide.", {
        notifiedPaymentId: paymentId,
        fetchedPaymentId: payment?.id,
      });

      return res.status(409).json({
        error: "El pago consultado no coincide con la notificación.",
      });
    }

    if (!isOurOrder(payment)) {
      console.error("Mercado Pago webhook: pago no corresponde a La Llave.", {
        paymentId: payment?.id,
        externalReference: payment?.external_reference,
        currency: payment?.currency_id,
        amount: payment?.transaction_amount,
      });

      return res.status(409).json({
        error: "El pago no corresponde a un pedido válido de La Llave.",
      });
    }

    const verifiedPayment = {
      paymentId: String(payment.id),
      status: String(payment.status || ""),
      statusDetail: String(payment.status_detail || ""),
      externalReference: String(payment.external_reference || ""),
      amount: Number(payment.transaction_amount),
      currency: String(payment.currency_id || ""),
      liveMode: Boolean(payment.live_mode),
      dateApproved: payment.date_approved || null,
      dateLastUpdated: payment.date_last_updated || null,
    };

    console.info(
      "MERCADOPAGO_PAYMENT_VERIFIED",
      JSON.stringify(verifiedPayment)
    );

    return res.status(200).json({
      received: true,
      verified: true,
      payment: verifiedPayment,
    });
  } catch (error) {
    console.error("Mercado Pago webhook: error consultando pago.", {
      paymentId,
      message: error?.message,
      status: error?.status,
      details: error?.details,
    });

    return res.status(502).json({
      error:
        "La notificación fue válida, pero no pudimos verificar el pago en Mercado Pago.",
    });
  }
}
