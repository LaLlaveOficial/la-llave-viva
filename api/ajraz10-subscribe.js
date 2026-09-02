import {
  PROMO_CODE,
  cleanEmail,
  cleanText,
  ensurePromoTables,
  getSql,
  isPromoCampaignActive,
  isValidEmail,
} from "../lib/ajraz10.js";

import {
  canResendVerification,
  createPendingPromoVerification,
  ensurePromoVerificationColumns,
  getPromoVerificationState,
  markVerificationSent,
  sendPromoVerificationEmail,
} from "../lib/ajraz10-verification.js";

const SOURCE =
  "checkout_ajraz10_double_opt_in";

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

async function ensureVerificationNameColumn(
  sql
) {
  await sql`
    ALTER TABLE promo_entitlements
    ADD COLUMN IF NOT EXISTS
    verification_name TEXT
  `;
}

async function saveVerificationName(
  sql,
  entitlementId,
  name
) {
  await sql`
    UPDATE promo_entitlements
    SET
      verification_name =
        ${name || null},

      updated_at =
        NOW()

    WHERE id =
      ${entitlementId}
  `;
}

function pendingResponse({
  email,
  verificationSent,
  alreadyPending = false,
}) {
  return {
    ok: true,

    status:
      "pending",

    entitlementStatus:
      "pending",

    pendingVerification:
      true,

    verificationRequired:
      true,

    verificationSent:
      Boolean(
        verificationSent
      ),

    alreadyPending:
      Boolean(
        alreadyPending
      ),

    email,

    message:
      verificationSent
        ? "Te enviamos un enlace para confirmar tu correo. El 10% se activará únicamente después de confirmar la dirección."
        : "Ya enviamos recientemente un enlace de confirmación. Revisa tu correo antes de solicitar otro.",

    /*
     * IMPORTANTE:
     * aquí deliberadamente NO devolvemos
     * el código AJRAZ10.
     */
  };
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
        ok: false,
        error:
          "Método no permitido.",
      });
  }

  const body =
    req.body || {};

  /*
   * Honeypot.
   *
   * Si un bot rellena este campo
   * invisible, respondemos de forma
   * neutra pero NO creamos autorización,
   * NO enviamos correo y NO activamos
   * descuento.
   */
  if (
    cleanText(
      body.website,
      200
    )
  ) {
    return res
      .status(200)
      .json({
        ok: true,

        status:
          "pending",

        pendingVerification:
          true,

        verificationRequired:
          true,

        message:
          "Solicitud recibida.",
      });
  }

  if (
    !isPromoCampaignActive()
  ) {
    return res
      .status(403)
      .json({
        ok: false,

        error:
          "AJRAZ10 se activa el 24 de agosto de 2026 a las 00:00, hora de Chile, y estará disponible hasta el 30 de septiembre.",
      });
  }

  const email =
    cleanEmail(
      body.email
    );

  const name =
    cleanText(
      body.name,
      80
    );

  const consent =
    body.consent === true;

  if (
    !isValidEmail(
      email
    )
  ) {
    return res
      .status(400)
      .json({
        ok: false,

        error:
          "Ingresa un correo electrónico válido.",
      });
  }

  if (!consent) {
    return res
      .status(400)
      .json({
        ok: false,

        error:
          "Debes aceptar recibir comunicaciones del Archivo 066 para solicitar el beneficio.",
      });
  }

  if (
    !process.env
      .DATABASE_URL
  ) {
    return res
      .status(500)
      .json({
        ok: false,

        error:
          "La base de datos del sistema de acceso no está configurada.",
      });
  }

  if (
    !process.env
      .RESEND_API_KEY
  ) {
    return res
      .status(500)
      .json({
        ok: false,

        error:
          "El servicio de verificación por correo todavía no está configurado.",
      });
  }

  const sql =
    getSql();

  try {
    /*
     * Garantizamos primero que existan
     * la tabla promocional y las columnas
     * necesarias para double opt-in.
     */
    await ensurePromoTables(
      sql
    );

    await ensurePromoVerificationColumns(
      sql
    );

    await ensureVerificationNameColumn(
      sql
    );

    /*
     * Consultamos el estado actual
     * antes de generar un token nuevo.
     */
    const existing =
      await getPromoVerificationState(
        sql,
        email,
        PROMO_CODE
      );

    /*
     * CASO 1:
     * Esta dirección YA fue confirmada
     * anteriormente.
     *
     * No exigimos una nueva verificación.
     * Es seguro devolver el código porque
     * el servidor ya tiene verified_at.
     */
    if (
      existing &&
      existing.status ===
        "active" &&
      existing.verified_at
    ) {
      return res
        .status(200)
        .json({
          ok: true,

          status:
            "active",

          entitlementStatus:
            "active",

          pendingVerification:
            false,

          verificationRequired:
            false,

          alreadyVerified:
            true,

          email,

          code:
            PROMO_CODE,

          message:
            "Este correo ya está confirmado y tiene acceso activo a AJRAZ10.",
        });
    }

    /*
     * CASO 2:
     * Ya existe una verificación pendiente
     * y acabamos de enviar el email.
     *
     * Evitamos que alguien pueda bombardear
     * una dirección pulsando el botón muchas
     * veces consecutivas.
     *
     * IMPORTANTE:
     * no generamos otro token en este caso,
     * porque invalidaría el enlace que ya
     * está en el correo del usuario.
     */
    if (
      existing &&
      existing.status ===
        "pending" &&
      existing
        .verification_expires_at &&
      new Date(
        existing
          .verification_expires_at
      ).getTime() >
        Date.now() &&
      !canResendVerification(
        existing
          .verification_sent_at
      )
    ) {
      return res
        .status(200)
        .json(
          pendingResponse({
            email,

            verificationSent:
              false,

            alreadyPending:
              true,
          })
        );
    }

    /*
     * CASO 3:
     * Dirección nueva,
     * autorización antigua no verificada,
     * enlace vencido,
     * o reenvío permitido.
     *
     * Creamos NUEVA verificación.
     *
     * createPendingPromoVerification
     * deja expresamente el entitlement
     * en estado PENDING.
     */
    const {
      entitlement,
      token,
    } =
      await createPendingPromoVerification(
        sql,
        email,
        SOURCE
      );

    if (
      !entitlement ||
      !token
    ) {
      throw new Error(
        "No fue posible crear la solicitud de verificación."
      );
    }

    /*
     * Guardamos el nombre solamente
     * asociado a esta solicitud pendiente.
     *
     * Todavía NO insertamos ni reactivamos
     * mailing_subscribers.
     *
     * Eso ocurrirá únicamente después del
     * clic real en CONFIRMAR MI CORREO.
     */
    await saveVerificationName(
      sql,
      entitlement.id,
      name
    );

    /*
     * Enviamos el único elemento que
     * demuestra control real del buzón:
     * un enlace con token secreto de
     * confirmación.
     */
    try {
      await sendPromoVerificationEmail({
        apiKey:
          process.env
            .RESEND_API_KEY,

        email,

        name,

        token,
      });
    } catch (
      emailError
    ) {
      console.error(
        "AJRAZ10 verification email error",
        {
          email,

          entitlementId:
            entitlement.id,

          status:
            emailError
              ?.status,

          message:
            emailError
              ?.message,

          details:
            emailError
              ?.details,
        }
      );

      /*
       * La solicitud puede quedar PENDING
       * en la base de datos, pero como el
       * email no salió NO concedemos nada.
       *
       * Tampoco marcamos verification_sent_at,
       * de modo que el usuario podrá volver
       * a intentarlo.
       */
      return res
        .status(502)
        .json({
          ok: false,

          status:
            "pending",

          pendingVerification:
            true,

          verificationRequired:
            true,

          email,

          error:
            "No pudimos enviar el correo de confirmación. El descuento NO fue activado. Intenta nuevamente en unos minutos.",
        });
    }

    /*
     * Solo después de que Resend aceptó
     * correctamente el mensaje registramos
     * que la verificación fue enviada.
     */
    await markVerificationSent(
      sql,
      entitlement.id
    );

    /*
     * Respuesta para el frontend.
     *
     * Observa que NO existe:
     *
     * code: "AJRAZ10"
     *
     * porque todavía no queremos que el
     * navegador pueda tratar esta solicitud
     * como una autorización.
     */
    return res
      .status(200)
      .json(
        pendingResponse({
          email,

          verificationSent:
            true,

          alreadyPending:
            false,
        })
      );
  } catch (error) {
    console.error(
      "AJRAZ10 double opt-in subscribe error",
      {
        email,

        message:
          error?.message,

        details:
          error?.details,
      }
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          "No pudimos preparar la verificación de AJRAZ10 en este momento. No se activó ningún descuento.",
      });
  }
}
