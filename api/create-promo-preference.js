import {
  BOOK_PRICE,
  DISCOUNT_AMOUNT,
  DISCOUNTED_BOOK_PRICE,
  PROMO_CODE,
  cleanEmail,
  cleanText,
  ensurePromoTables,
  getSql,
  normalizePromoCode,
} from "../lib/ajraz10.js";

import {
  ensurePromoVerificationColumns,
  validateVerifiedPromoEntitlement,
} from "../lib/ajraz10-verification.js";

import {
  scheduleCheckoutRecovery,
} from "../lib/order-emails.js";

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

function noStore(res) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  res.setHeader(
    "Pragma",
    "no-cache"
  );
}

function cleanPhone(value) {
  return String(
    value || ""
  )
    .replace(
      /[^\d+]/g,
      ""
    )
    .slice(
      0,
      20
    );
}

function splitName(
  fullName
) {
  const parts =
    cleanText(
      fullName,
      120
    )
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length <= 1
  ) {
    return {
      name:
        parts[0] || "",

      surname:
        "",
    };
  }

  return {
    name:
      parts[0],

    surname:
      parts
        .slice(1)
        .join(" "),
  };
}

function buildReference() {
  return (
    `LLAVE-${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()
  );
}

async function updateOrderStatus(
  sql,
  externalReference,
  status
) {
  try {
    await sql`
      UPDATE orders
      SET
        payment_status =
          ${status},

        updated_at =
          NOW()

      WHERE external_reference =
        ${externalReference}
    `;
  } catch (error) {
    console.error(
      "Promo order status update error",
      {
        externalReference,
        status,
        message:
          error?.message,
      }
    );
  }
}

export default async function handler(
  req,
  res
) {
  noStore(res);

  if (
    req.method !== "POST"
  ) {
    res.setHeader(
      "Allow",
      "POST"
    );

    return res
      .status(405)
      .json({
        error:
          "Método no permitido.",
      });
  }

  const accessToken =
    process.env
      .MERCADOPAGO_ACCESS_TOKEN;

  const databaseUrl =
    process.env
      .DATABASE_URL;

  if (
    !accessToken ||
    !databaseUrl
  ) {
    return res
      .status(500)
      .json({
        error:
          "El pago promocional todavía no está configurado en el servidor.",
      });
  }

  const buyer =
    req.body?.buyer ||
    {};

  const fullName =
    cleanText(
      buyer.fullName,
      120
    );

  const email =
    cleanEmail(
      buyer.email
    );

  const phone =
    cleanPhone(
      buyer.phone
    );

  const regionCode =
    cleanText(
      buyer.region,
      4
    ).toUpperCase();

  const commune =
    cleanText(
      buyer.commune,
      100
    );

  const street =
    cleanText(
      buyer.street,
      160
    );

  const numberText =
    cleanText(
      buyer.number,
      20
    );

  const extra =
    cleanText(
      buyer.extra,
      160
    );

  const promoCode =
    normalizePromoCode(
      req.body?.promoCode
    );

  if (
    !fullName ||
    !email ||
    !phone ||
    !REGION_NAMES[
      regionCode
    ] ||
    !commune ||
    !street ||
    !numberText
  ) {
    return res
      .status(400)
      .json({
        error:
          "Faltan datos obligatorios para preparar el pago.",
      });
  }

  const streetNumber =
    Number.parseInt(
      numberText.replace(
        /\D/g,
        ""
      ),
      10
    );

  if (
    !Number.isFinite(
      streetNumber
    ) ||
    streetNumber <= 0
  ) {
    return res
      .status(400)
      .json({
        error:
          "El número de dirección no es válido.",
      });
  }

  const sql =
    getSql(
      databaseUrl
    );

  try {
    /*
     * Antes de considerar siquiera
     * un precio promocional,
     * garantizamos la estructura
     * de double opt-in.
     */
    await ensurePromoTables(
      sql
    );

    await ensurePromoVerificationColumns(
      sql
    );
  } catch (error) {
    console.error(
      "Promo verification schema error",
      {
        email,
        message:
          error?.message,
      }
    );

    return res
      .status(500)
      .json({
        error:
          "No pudimos verificar la autorización promocional. No se realizó ningún cobro.",
      });
  }

  /*
   * ======================================================
   * BARRERA PRINCIPAL DE SEGURIDAD
   * ======================================================
   *
   * El navegador NO decide si obtiene descuento.
   *
   * Mercado Pago NO se crea hasta comprobar:
   *
   * - código AJRAZ10 correcto;
   * - correo válido;
   * - entitlement existente;
   * - campaña vigente;
   * - status = active;
   * - verified_at existente.
   *
   * Por lo tanto:
   *
   * escribir un correo inventado,
   * conocer AJRAZ10,
   * manipular JavaScript,
   * o llamar directamente este endpoint
   *
   * NO basta para obtener el precio rebajado.
   */
  let promo;

  try {
    promo =
      await validateVerifiedPromoEntitlement(
        sql,
        email,
        promoCode
      );
  } catch (error) {
    console.error(
      "Promo verified entitlement check error",
      {
        email,
        message:
          error?.message,
      }
    );

    return res
      .status(500)
      .json({
        error:
          "No pudimos comprobar tu autorización AJRAZ10. No se realizó ningún cobro.",
      });
  }

  if (
    !promo.ok
  ) {
    return res
      .status(403)
      .json({
        error:
          promo.error,

        promo_required:
          true,

        verification_required:
          promo.reason ===
            "email_not_verified" ||
          promo.reason ===
            "not_authorized",

        reason:
          promo.reason,
      });
  }

  /*
   * Solo llegamos aquí si la
   * verificación del correo fue
   * satisfactoria.
   */

  const shippingCost =
    regionCode === "RM"
      ? SHIPPING_RM
      : SHIPPING_REGIONS;

  /*
   * Precio libro:
   * $15.990
   *
   * 10%:
   * 15.990 × 0,10
   * = 1.599
   *
   * Libro con descuento:
   * 15.990 − 1.599
   * = 14.391
   */
  const totalAmount =
    DISCOUNTED_BOOK_PRICE +
    shippingCost;

  const {
    name,
    surname,
  } =
    splitName(
      fullName
    );

  const siteUrl =
    (
      process.env
        .PUBLIC_SITE_URL ||
      "https://www.lallaveoficial.com"
    ).replace(
      /\/+$/,
      ""
    );

  const externalReference =
    buildReference();

  /*
   * Registramos el pedido solamente
   * después de superar la barrera
   * de verificación.
   */
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
        ${REGION_NAMES[
          regionCode
        ]},
        ${commune},
        ${street},
        ${numberText},
        ${extra || null},
        ${DISCOUNTED_BOOK_PRICE},
        ${shippingCost},
        ${totalAmount},
        'CLP'
      )
    `;

    await sql`
      INSERT INTO promo_order_audit (
        external_reference,
        buyer_email,
        code,
        original_book_price,
        discount_amount,
        discounted_book_price
      )
      VALUES (
        ${externalReference},
        ${email},
        ${PROMO_CODE},
        ${BOOK_PRICE},
        ${DISCOUNT_AMOUNT},
        ${DISCOUNTED_BOOK_PRICE}
      )
    `;
  } catch (error) {
    console.error(
      "Promo order insert error",
      {
        externalReference,
        email,
        message:
          error?.message,
      }
    );

    return res
      .status(500)
      .json({
        error:
          "No pudimos registrar tu pedido promocional. No se realizó ningún cobro.",
      });
  }

  const preference = {
    items: [
      {
        id:
          "LA-LLAVE-I-CIUDAD-CENTRAL-AJRAZ10",

        title:
          "La Llave I: Ciudad Central — Edición impresa",

        description:
          "Edición impresa oficial de La Llave I: Ciudad Central · Acceso AJRAZ10 confirmado y aplicado.",

        picture_url:
          `${siteUrl}/assets/la-llave-edicion-fisica.png`,

        category_id:
          "books",

        quantity:
          1,

        currency_id:
          "CLP",

        unit_price:
          DISCOUNTED_BOOK_PRICE,
      },
    ],

    payer: {
      name,

      surname,

      email,

      phone: {
        number:
          phone,
      },
    },

    shipments: {
      cost:
        shippingCost,

      mode:
        "not_specified",

      local_pickup:
        false,

      receiver_address: {
        street_name:
          street,

        street_number:
          streetNumber,

        city_name:
          commune,

        state_name:
          REGION_NAMES[
            regionCode
          ],

        country_name:
          "Chile",
      },
    },

    back_urls: {
      success:
        `${siteUrl}/compra-confirmada`,

      pending:
        `${siteUrl}/pago-pendiente`,

      failure:
        `${siteUrl}/pago-rechazado`,
    },

    auto_return:
      "approved",

    external_reference:
      externalReference,

    statement_descriptor:
      "KELOKE LLAVE",

    additional_info: [
      "Pedido web La Llave I",

      `Promoción: ${PROMO_CODE}`,

      "Correo promocional verificado: sí",

      `Descuento libro: $${DISCOUNT_AMOUNT} CLP`,

      `Región: ${
        REGION_NAMES[
          regionCode
        ]
      }`,

      `Comuna: ${commune}`,

      extra
        ? `Referencia de despacho: ${extra}`
        : "",
    ]
      .filter(Boolean)
      .join(" | "),
  };

  try {
    const mpResponse =
      await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              preference
            ),
        }
      );

    const data =
      await mpResponse
        .json()
        .catch(
          () => ({})
        );

    if (
      !mpResponse.ok ||
      !data?.id ||
      !data?.init_point
    ) {
      await updateOrderStatus(
        sql,
        externalReference,
        "preference_error"
      );

      console.error(
        "Mercado Pago promo preference error",
        {
          externalReference,

          status:
            mpResponse.status,

          message:
            data?.message,

          cause:
            data?.cause,
        }
      );

      return res
        .status(502)
        .json({
          error:
            "Mercado Pago no pudo crear el pago promocional. No se realizó ningún cobro.",
        });
    }

    try {
      await sql`
        UPDATE orders
        SET
          mercadopago_preference_id =
            ${String(
              data.id
            )},

          updated_at =
            NOW()

        WHERE external_reference =
          ${externalReference}
      `;
    } catch (error) {
      console.error(
        "Promo preference persistence error",
        {
          externalReference,

          message:
            error?.message,
        }
      );

      return res
        .status(500)
        .json({
          error:
            "El pago fue preparado, pero no pudimos terminar de registrar el pedido. No continúes con el pago.",
        });
    }

    try {
      const recoveryResult =
        await scheduleCheckoutRecovery({
          apiKey:
            process.env
              .RESEND_API_KEY ||
            "",

          sql,

          order: {
            external_reference:
              externalReference,

            buyer_name:
              fullName,

            buyer_email:
              email,

            book_price:
              DISCOUNTED_BOOK_PRICE,

            shipping_amount:
              shippingCost,

            total_amount:
              totalAmount,
          },

          checkoutUrl:
            data.init_point,

          siteUrl,
        });

      console.info(
        "CHECKOUT_RECOVERY_RESULT",
        {
          externalReference,

          scheduled:
            Boolean(
              recoveryResult
                .scheduled
            ),

          reason:
            recoveryResult
              .reason ||
            null,
        }
      );
    } catch (error) {
      console.error(
        "Promo checkout recovery scheduling failed:",
        {
          externalReference,

          message:
            error?.message,
        }
      );
    }

    return res
      .status(200)
      .json({
        preference_id:
          data.id,

        init_point:
          data.init_point,

        external_reference:
          externalReference,

        promo: {
          code:
            PROMO_CODE,

          verified:
            true,

          original_book_price:
            BOOK_PRICE,

          discount_amount:
            DISCOUNT_AMOUNT,

          book_price:
            DISCOUNTED_BOOK_PRICE,

          shipping_amount:
            shippingCost,

          total_amount:
            totalAmount,
        },
      });
  } catch (error) {
    await updateOrderStatus(
      sql,
      externalReference,
      "preference_error"
    );

    console.error(
      "Create verified promo preference exception",
      {
        externalReference,

        message:
          error?.message,
      }
    );

    return res
      .status(500)
      .json({
        error:
          "No fue posible conectar con Mercado Pago. No se realizó ningún cobro.",
      });
  }
}
