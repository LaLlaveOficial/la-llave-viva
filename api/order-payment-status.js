import { neon } from "@neondatabase/serverless";

function cleanReference(value) {
  const reference =
    String(value || "").trim();

  if (
    reference.length < 12 ||
    reference.length > 80 ||
    !/^LLAVE-[A-Z0-9-]+$/i.test(
      reference
    )
  ) {
    return "";
  }

  return reference;
}

function cleanPaymentId(value) {
  const paymentId =
    String(value || "").trim();

  return /^\d{4,30}$/.test(
    paymentId
  )
    ? paymentId
    : "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res
      .status(405)
      .json({
        error:
          "Método no permitido.",
      });
  }

  res.setHeader(
    "Cache-Control",
    "private, no-store, max-age=0"
  );

  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    return res
      .status(503)
      .json({
        approved: false,
      });
  }

  const externalReference =
    cleanReference(
      req.query
        ?.external_reference
    );

  const paymentId =
    cleanPaymentId(
      req.query?.payment_id
    );

  if (
    !externalReference ||
    !paymentId
  ) {
    return res
      .status(400)
      .json({
        approved: false,
      });
  }

  try {
    const sql = neon(databaseUrl);

    const rows =
      await sql`
        SELECT 1
        FROM orders
        WHERE
          external_reference = ${externalReference}
          AND mercadopago_payment_id = ${paymentId}
          AND payment_status = 'approved'
        LIMIT 1
      `;

    return res
      .status(200)
      .json({
        approved:
          rows.length === 1,
      });
  } catch (error) {
    console.error(
      "Order payment status lookup failed:",
      {
        message:
          error?.message,
      }
    );

    return res
      .status(503)
      .json({
        approved: false,
      });
  }
}
