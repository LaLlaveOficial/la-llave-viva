import {
  ensurePromoTables,
  getSql,
} from "../lib/ajraz10.js";

import {
  ensurePromoVerificationColumns,
  validateVerifiedPromoEntitlement,
} from "../lib/ajraz10-verification.js";

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

  if (
    !process.env
      .DATABASE_URL
  ) {
    return res
      .status(500)
      .json({
        ok: false,

        error:
          "La validación de promociones no está configurada.",
      });
  }

  const email =
    req.body?.email;

  const code =
    req.body?.code;

  try {
    const sql =
      getSql();

    /*
     * Garantizamos que la estructura
     * promocional y las columnas del
     * double opt-in existan.
     */
    await ensurePromoTables(
      sql
    );

    await ensurePromoVerificationColumns(
      sql
    );

    /*
     * Esta es ahora la ÚNICA validación
     * permitida para AJRAZ10.
     *
     * Requiere simultáneamente:
     *
     * 1. Código correcto.
     * 2. Correo correcto.
     * 3. Campaña vigente.
     * 4. Entitlement existente.
     * 5. status = active.
     * 6. verified_at existente.
     *
     * Es decir:
     * conocer AJRAZ10 no basta.
     */
    const result =
      await validateVerifiedPromoEntitlement(
        sql,
        email,
        code
      );

    return res
      .status(
        result.ok
          ? 200
          : 403
      )
      .json(
        result
      );
  } catch (error) {
    console.error(
      "AJRAZ10 verified validation error",
      {
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
          "No pudimos validar el código en este momento.",
      });
  }
}
