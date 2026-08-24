import { cleanEmail, ensurePromoTables, getSql, validatePromoEntitlement } from "../lib/ajraz10.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Método no permitido." });
  }
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: "La validación de promociones no está configurada." });
  }
  try {
    const sql = getSql();
    await ensurePromoTables(sql);
    const result = await validatePromoEntitlement(sql, cleanEmail(req.body?.email), req.body?.code);
    return res.status(result.ok ? 200 : 403).json(result);
  } catch (error) {
    console.error("AJRAZ10 validate error", { message: error?.message });
    return res.status(500).json({ ok: false, error: "No pudimos validar el código en este momento." });
  }
}
