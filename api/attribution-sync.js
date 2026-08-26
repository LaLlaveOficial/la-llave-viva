import { neon } from "@neondatabase/serverless";

function cleanText(value, maxLength = 160) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

function isValidEmail(email) {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function cleanExternalReference(value) {
  return cleanText(value, 140);
}

function isValidExternalReference(value) {
  return /^LLAVE-[A-Z0-9-]+$/i.test(value);
}

function cleanAttribution(raw) {
  const attribution = raw && typeof raw === "object" ? raw : {};

  return {
    utm_source: cleanText(attribution.utm_source, 120) || null,
    utm_medium: cleanText(attribution.utm_medium, 120) || null,
    utm_campaign: cleanText(attribution.utm_campaign, 180) || null,
    utm_content: cleanText(attribution.utm_content, 180) || null,
    utm_term: cleanText(attribution.utm_term, 180) || null,
    landing_path: cleanText(attribution.landing_path, 500) || null,
    referrer_host:
      cleanText(attribution.referrer_host, 255).toLowerCase() || null,
  };
}

function hasAttribution(attribution) {
  return Object.values(attribution).some(Boolean);
}

function cleanGa4(raw) {
  const source = raw && typeof raw === "object" ? raw : {};

  const clientId = cleanText(source.client_id, 100);
  const sessionId = cleanText(source.session_id, 40);

  return {
    client_id: /^\d+\.\d+$/.test(clientId) ? clientId : null,
    session_id: /^\d+$/.test(sessionId) ? sessionId : null,
  };
}

function hasGa4(ga4) {
  return Boolean(ga4.client_id || ga4.session_id);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return res.status(500).json({
      ok: false,
      error: "La base de datos no está configurada.",
    });
  }

  const body = req.body || {};
  const kind = cleanText(body.kind, 20).toLowerCase();
  const attribution = cleanAttribution(body.attribution);
  const ga4 = cleanGa4(body.ga4);

  if (
    !hasAttribution(attribution) &&
    !(kind === "order" && hasGa4(ga4))
  ) {
    return res.status(200).json({
      ok: true,
      stored: false,
      reason: "empty_attribution",
    });
  }

  const sql = neon(databaseUrl);

  try {
    if (kind === "subscriber") {
      const email = cleanEmail(body.email);

      if (!isValidEmail(email)) {
        return res.status(400).json({
          ok: false,
          error: "Correo inválido.",
        });
      }

      const rows = await sql`
        UPDATE mailing_subscribers
        SET
          utm_source = COALESCE(utm_source, ${attribution.utm_source}),
          utm_medium = COALESCE(utm_medium, ${attribution.utm_medium}),
          utm_campaign = COALESCE(utm_campaign, ${attribution.utm_campaign}),
          utm_content = COALESCE(utm_content, ${attribution.utm_content}),
          utm_term = COALESCE(utm_term, ${attribution.utm_term}),
          landing_path = COALESCE(landing_path, ${attribution.landing_path}),
          referrer_host = COALESCE(referrer_host, ${attribution.referrer_host}),
          updated_at = NOW()
        WHERE email = ${email}
          AND consent_at >= NOW() - INTERVAL '10 minutes'
        RETURNING id
      `;

      return res.status(200).json({
        ok: true,
        stored: rows.length > 0,
        target: "subscriber",
      });
    }

    if (kind === "order") {
      const externalReference = cleanExternalReference(
        body.external_reference
      );

      if (!isValidExternalReference(externalReference)) {
        return res.status(400).json({
          ok: false,
          error: "Referencia de pedido inválida.",
        });
      }

      const rows = await sql`
        UPDATE orders
        SET
          utm_source = COALESCE(utm_source, ${attribution.utm_source}),
          utm_medium = COALESCE(utm_medium, ${attribution.utm_medium}),
          utm_campaign = COALESCE(utm_campaign, ${attribution.utm_campaign}),
          utm_content = COALESCE(utm_content, ${attribution.utm_content}),
          utm_term = COALESCE(utm_term, ${attribution.utm_term}),
          landing_path = COALESCE(landing_path, ${attribution.landing_path}),
          referrer_host = COALESCE(referrer_host, ${attribution.referrer_host}),
          ga4_client_id = COALESCE(ga4_client_id, ${ga4.client_id}),
          ga4_session_id = COALESCE(ga4_session_id, ${ga4.session_id}),
          updated_at = NOW()
        WHERE external_reference = ${externalReference}
          AND created_at >= NOW() - INTERVAL '10 minutes'
        RETURNING id
      `;

      return res.status(200).json({
        ok: true,
        stored: rows.length > 0,
        target: "order",
        ga4_stored: Boolean(
          rows.length > 0 && (ga4.client_id || ga4.session_id)
        ),
      });
    }

    return res.status(400).json({
      ok: false,
      error: "Tipo de atribución no válido.",
    });
  } catch (error) {
    console.error("Attribution sync error:", {
      kind,
      message: error?.message,
    });

    return res.status(500).json({
      ok: false,
      error: "No se pudo guardar la atribución.",
    });
  }
}
