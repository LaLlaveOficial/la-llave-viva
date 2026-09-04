import { neon } from "@neondatabase/serverless";
import { scheduleCheckoutRecovery } from "../lib/order-emails.js";

const BOOK_PRICE = 15990;
const SHIPPING_RM = 3000;
const SHIPPING_REGIONS = 4500;

const REGION_NAMES = {
  AP: "Arica y Parinacota",
  TA: "Tarapacá",
  AN: "Antofagasta",
  AT: "Atacama",
  CO: "Coquimbo",
  VS: "Valparaíso",
  RM: "Región Metropolitana",
  LI: "O'Higgins",
  ML: "Maule",
  NB: "Ñuble",
  BI: "Biobío",
  AR: "La Araucanía",
  LR: "Los Ríos",
  LL: "Los Lagos",
  AI: "Aysén",
  MA: "Magallanes y de la Antártica Chilena",
};

function cleanText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").slice(0, 20);
}

function splitName(fullName) {
  const parts = cleanText(fullName, 120).split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      name: parts[0] || "",
      surname: "",
    };
  }

  return {
    name: parts[0],
    surname: parts.slice(1).join(" "),
  };
}

function buildReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LLAVE-${Date.now()}-${random}`;
}

async function updateOrderStatus(sql, externalReference, status) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status = ${status},
        updated_at = NOW()
      WHERE external_reference = ${externalReference}
    `;
  } catch (error) {
    console.error("Order status update error:", {
      externalReference,
      status,
      message: error?.message,
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;

  if (!accessToken) {
    return res.status(500).json({
      error: "Mercado Pago todavía no está configurado en el servidor.",
    });
  }

  if (!databaseUrl) {
    return res.status(500).json({
      error: "La base de datos de pedidos todavía no está configurada.",
    });
  }

  const buyer = req.body?.buyer || {};

  const fullName = cleanText(buyer.fullName, 120);
  const email = cleanText(buyer.email, 160).toLowerCase();
  const phone = cleanPhone(buyer.phone);
  const regionCode = cleanText(buyer.region, 4).toUpperCase();
  const commune = cleanText(buyer.commune, 100);
  const street = cleanText(buyer.street, 160);
  const numberText = cleanText(buyer.number, 20);
  const extra = cleanText(buyer.extra, 160);

  if (
    !fullName ||
    !email ||
    !phone ||
    !REGION_NAMES[regionCode] ||
    !commune ||
    !street ||
    !numberText
  ) {
    return res.status(400).json({
      error: "Faltan datos obligatorios para preparar el pago.",
    });
  }

  const streetNumber = Number.parseInt(numberText.replace(/\D/g, ""), 10);

  if (!Number.isFinite(streetNumber) || streetNumber <= 0) {
    return res.status(400).json({
      error: "El número de dirección no es válido.",
    });
  }

  const shippingCost =
    regionCode === "RM" ? SHIPPING_RM : SHIPPING_REGIONS;

  const totalAmount = BOOK_PRICE + shippingCost;
  const { name, surname } = splitName(fullName);

  const siteUrl = (
    process.env.PUBLIC_SITE_URL || "https://www.lallaveoficial.com"
  ).replace(/\/+$/, "");

  const externalReference = buildReference();
  const sql = neon(databaseUrl);

  try {
    await sql`
      INSERT INTO orders (
        external_reference,
        payment_status,
        buyer_name,
        buyer_email,
        buyer_phone,
        region_code,
        region_name,
        commune,
        street,
        street_number,
        address_extra,
        book_price,
        shipping_amount,
        total_amount,
        currency
      )
      VALUES (
        ${externalReference},
        'pending',
        ${fullName},
        ${email},
        ${phone},
        ${regionCode},
        ${REGION_NAMES[regionCode]},
        ${commune},
        ${street},
        ${numberText},
        ${extra || null},
        ${BOOK_PRICE},
        ${shippingCost},
        ${totalAmount},
        'CLP'
      )
    `;
  } catch (error) {
    console.error("Order insert error:", {
      externalReference,
      message: error?.message,
    });

    return res.status(500).json({
      error:
        "No pudimos registrar tu pedido antes del pago. No se realizó ningún cobro. Intenta nuevamente.",
    });
  }

  const preference = {
    items: [
      {
        id: "LA-LLAVE-I-CIUDAD-CENTRAL",
        title: "La Llave I: Ciudad Central — Edición impresa",
        description:
          "Edición impresa oficial de La Llave I: Ciudad Central, de Enrique G. Santibañez.",
        picture_url: `${siteUrl}/assets/la-llave-edicion-fisica.png`,
        category_id: "books",
        quantity: 1,
        currency_id: "CLP",
        unit_price: BOOK_PRICE,
      },
    ],
    payer: {
      name,
      surname,
      email,
      phone: {
        number: phone,
      },
    },
    shipments: {
      cost: shippingCost,
      mode: "not_specified",
      local_pickup: false,
      receiver_address: {
        street_name: street,
        street_number: streetNumber,
        city_name: commune,
        state_name: REGION_NAMES[regionCode],
        country_name: "Chile",
      },
    },
    back_urls: {
      success: `${siteUrl}/compra-confirmada`,
      pending: `${siteUrl}/pago-pendiente`,
      failure: `${siteUrl}/pago-rechazado`,
    },
    auto_return: "approved",
    external_reference: externalReference,
    statement_descriptor: "KELOKE LLAVE",
    additional_info: [
      "Pedido web La Llave I",
      `Región: ${REGION_NAMES[regionCode]}`,
      `Comuna: ${commune}`,
      extra ? `Referencia de despacho: ${extra}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  };

  try {
    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preference),
      }
    );

    const data = await mpResponse.json().catch(() => ({}));

    if (!mpResponse.ok) {
      console.error("Mercado Pago preference error:", {
        externalReference,
        status: mpResponse.status,
        cause: data?.cause,
        message: data?.message,
      });

      await updateOrderStatus(sql, externalReference, "preference_error");

      return res.status(502).json({
        error:
          "Mercado Pago no pudo crear el pago en este momento. No se realizó ningún cobro. Intenta nuevamente.",
      });
    }

    if (!data?.id || !data?.init_point) {
      console.error("Mercado Pago response incomplete:", {
        externalReference,
        hasId: Boolean(data?.id),
        hasInitPoint: Boolean(data?.init_point),
      });

      await updateOrderStatus(sql, externalReference, "preference_error");

      return res.status(502).json({
        error:
          "Mercado Pago respondió sin los datos necesarios para continuar. No se realizó ningún cobro. Intenta nuevamente.",
      });
    }

    try {
      await sql`
        UPDATE orders
        SET
          mercadopago_preference_id = ${String(data.id)},
          updated_at = NOW()
        WHERE external_reference = ${externalReference}
      `;
    } catch (error) {
      console.error("Preference ID persistence error:", {
        externalReference,
        preferenceId: String(data.id),
        message: error?.message,
      });

      return res.status(500).json({
        error:
          "El pago fue preparado, pero no pudimos terminar de registrar el pedido. No continúes con el pago e intenta nuevamente.",
      });
    }

    try {
      const recoveryResult = await scheduleCheckoutRecovery({
        apiKey: process.env.RESEND_API_KEY || "",
        sql,
        order: {
          external_reference: externalReference,
          buyer_name: fullName,
          buyer_email: email,
          book_price: BOOK_PRICE,
          shipping_amount: shippingCost,
          total_amount: totalAmount,
        },
        checkoutUrl: data.init_point,
        siteUrl,
      });

      console.info("CHECKOUT_RECOVERY_RESULT", {
        externalReference,
        scheduled: Boolean(recoveryResult.scheduled),
        reason: recoveryResult.reason || null,
      });
    } catch (error) {
      console.error("Checkout recovery scheduling failed:", {
        externalReference,
        message: error?.message,
      });
    }

    return res.status(200).json({
      preference_id: data.id,
      init_point: data.init_point,
      external_reference: externalReference,
    });
  } catch (error) {
    console.error("Create preference exception:", {
      externalReference,
      message: error?.message,
    });

    await updateOrderStatus(sql, externalReference, "preference_error");

    return res.status(500).json({
      error:
        "No fue posible conectar con Mercado Pago. No se realizó ningún cobro. Intenta nuevamente en unos minutos.",
    });
  }
}
