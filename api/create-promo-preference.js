import { neon } from "@neondatabase/serverless";
import {
  BOOK_PRICE,
  DISCOUNT_AMOUNT,
  DISCOUNTED_BOOK_PRICE,
  PROMO_CODE,
  cleanEmail,
  cleanText,
  ensurePromoTables,
  normalizePromoCode,
  validatePromoEntitlement,
} from "../lib/ajraz10.js";

const SHIPPING_RM = 3000;
const SHIPPING_REGIONS = 4500;
const REGION_NAMES = {
  AP: "Arica y Parinacota", TA: "Tarapacá", AN: "Antofagasta", AT: "Atacama", CO: "Coquimbo",
  VS: "Valparaíso", RM: "Región Metropolitana", LI: "O'Higgins", ML: "Maule", NB: "Ñuble",
  BI: "Biobío", AR: "La Araucanía", LR: "Los Ríos", LL: "Los Lagos", AI: "Aysén",
  MA: "Magallanes y de la Antártica Chilena",
};

function cleanPhone(value) { return String(value || "").replace(/[^\d+]/g, "").slice(0, 20); }
function splitName(fullName) {
  const parts = cleanText(fullName, 120).split(/\s+/).filter(Boolean);
  return parts.length <= 1 ? { name: parts[0] || "", surname: "" } : { name: parts[0], surname: parts.slice(1).join(" ") };
}
function buildReference() { return `LLAVE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }
async function updateOrderStatus(sql, externalReference, status) {
  try { await sql`UPDATE orders SET payment_status = ${status}, updated_at = NOW() WHERE external_reference = ${externalReference}`; }
  catch (error) { console.error("Promo order status update error", { externalReference, status, message: error?.message }); }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;
  if (!accessToken || !databaseUrl) {
    return res.status(500).json({ error: "El pago promocional todavía no está configurado en el servidor." });
  }

  const buyer = req.body?.buyer || {};
  const fullName = cleanText(buyer.fullName, 120);
  const email = cleanEmail(buyer.email);
  const phone = cleanPhone(buyer.phone);
  const regionCode = cleanText(buyer.region, 4).toUpperCase();
  const commune = cleanText(buyer.commune, 100);
  const street = cleanText(buyer.street, 160);
  const numberText = cleanText(buyer.number, 20);
  const extra = cleanText(buyer.extra, 160);
  const promoCode = normalizePromoCode(req.body?.promoCode);

  if (!fullName || !email || !phone || !REGION_NAMES[regionCode] || !commune || !street || !numberText) {
    return res.status(400).json({ error: "Faltan datos obligatorios para preparar el pago." });
  }
  const streetNumber = Number.parseInt(numberText.replace(/\D/g, ""), 10);
  if (!Number.isFinite(streetNumber) || streetNumber <= 0) {
    return res.status(400).json({ error: "El número de dirección no es válido." });
  }

  const sql = neon(databaseUrl);
  await ensurePromoTables(sql);
  const promo = await validatePromoEntitlement(sql, email, promoCode);
  if (!promo.ok) {
    return res.status(403).json({ error: promo.error, promo_required: true, reason: promo.reason });
  }

  const shippingCost = regionCode === "RM" ? SHIPPING_RM : SHIPPING_REGIONS;
  const totalAmount = DISCOUNTED_BOOK_PRICE + shippingCost;
  const { name, surname } = splitName(fullName);
  const siteUrl = (process.env.PUBLIC_SITE_URL || "https://www.lallaveoficial.com").replace(/\/+$/, "");
  const externalReference = buildReference();

  try {
    await sql`
      INSERT INTO orders (
        external_reference, payment_status, buyer_name, buyer_email, buyer_phone,
        region_code, region_name, commune, street, street_number, address_extra,
        book_price, shipping_amount, total_amount, currency
      ) VALUES (
        ${externalReference}, 'pending', ${fullName}, ${email}, ${phone},
        ${regionCode}, ${REGION_NAMES[regionCode]}, ${commune}, ${street}, ${numberText}, ${extra || null},
        ${DISCOUNTED_BOOK_PRICE}, ${shippingCost}, ${totalAmount}, 'CLP'
      )
    `;
    await sql`
      INSERT INTO promo_order_audit (
        external_reference, buyer_email, code, original_book_price, discount_amount, discounted_book_price
      ) VALUES (
        ${externalReference}, ${email}, ${PROMO_CODE}, ${BOOK_PRICE}, ${DISCOUNT_AMOUNT}, ${DISCOUNTED_BOOK_PRICE}
      )
    `;
  } catch (error) {
    console.error("Promo order insert error", { externalReference, message: error?.message });
    return res.status(500).json({ error: "No pudimos registrar tu pedido promocional. No se realizó ningún cobro." });
  }

  const preference = {
    items: [{
      id: "LA-LLAVE-I-CIUDAD-CENTRAL-AJRAZ10",
      title: "La Llave I: Ciudad Central — Edición impresa",
      description: "Edición impresa oficial de La Llave I: Ciudad Central · Acceso AJRAZ10 aplicado.",
      picture_url: `${siteUrl}/assets/la-llave-edicion-fisica.png`,
      category_id: "books", quantity: 1, currency_id: "CLP", unit_price: DISCOUNTED_BOOK_PRICE,
    }],
    payer: { name, surname, email, phone: { number: phone } },
    shipments: {
      cost: shippingCost, mode: "not_specified", local_pickup: false,
      receiver_address: { street_name: street, street_number: streetNumber, city_name: commune, state_name: REGION_NAMES[regionCode], country_name: "Chile" },
    },
    back_urls: {
      success: `${siteUrl}/compra-confirmada`, pending: `${siteUrl}/pago-pendiente`, failure: `${siteUrl}/pago-rechazado`,
    },
    auto_return: "approved",
    external_reference: externalReference,
    statement_descriptor: "KELOKE LLAVE",
    additional_info: [
      "Pedido web La Llave I", `Promoción: ${PROMO_CODE}`, `Descuento libro: $${DISCOUNT_AMOUNT} CLP`,
      `Región: ${REGION_NAMES[regionCode]}`, `Comuna: ${commune}`, extra ? `Referencia de despacho: ${extra}` : "",
    ].filter(Boolean).join(" | "),
  };

  try {
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(preference),
    });
    const data = await mpResponse.json().catch(() => ({}));
    if (!mpResponse.ok || !data?.id || !data?.init_point) {
      await updateOrderStatus(sql, externalReference, "preference_error");
      console.error("Mercado Pago promo preference error", { externalReference, status: mpResponse.status, message: data?.message, cause: data?.cause });
      return res.status(502).json({ error: "Mercado Pago no pudo crear el pago promocional. No se realizó ningún cobro." });
    }
    try {
      await sql`UPDATE orders SET mercadopago_preference_id = ${String(data.id)}, updated_at = NOW() WHERE external_reference = ${externalReference}`;
    } catch (error) {
      console.error("Promo preference persistence error", { externalReference, message: error?.message });
      return res.status(500).json({ error: "El pago fue preparado, pero no pudimos terminar de registrar el pedido. No continúes con el pago." });
    }
    return res.status(200).json({
      preference_id: data.id, init_point: data.init_point, external_reference: externalReference,
      promo: { code: PROMO_CODE, original_book_price: BOOK_PRICE, discount_amount: DISCOUNT_AMOUNT, book_price: DISCOUNTED_BOOK_PRICE, total_amount: totalAmount },
    });
  } catch (error) {
    await updateOrderStatus(sql, externalReference, "preference_error");
    console.error("Create promo preference exception", { externalReference, message: error?.message });
    return res.status(500).json({ error: "No fue posible conectar con Mercado Pago. No se realizó ningún cobro." });
  }
}
