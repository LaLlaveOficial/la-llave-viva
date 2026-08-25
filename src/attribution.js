const STORAGE_KEY = "llave066_ga4_attribution_v1";
const PATCH_FLAG = "__llave066AttributionFetchPatched";

const LEAD_ENDPOINTS = new Set([
  "/api/subscribe",
  "/api/ajraz10-subscribe",
]);

const ORDER_ENDPOINTS = new Set([
  "/api/create-preference",
  "/api/create-promo-preference",
]);

function readStoredAttribution() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStoredAttribution(value) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // La atribución no debe bloquear nunca la experiencia principal.
  }
}

function captureAttribution() {
  if (typeof window === "undefined") return {};

  const existing = readStoredAttribution();
  const params = new URLSearchParams(window.location.search);

  let referrerHost = existing.referrer_host || "";

  if (!referrerHost && document.referrer) {
    try {
      referrerHost = new URL(document.referrer).hostname;
    } catch {
      referrerHost = "";
    }
  }

  const attribution = {
    utm_source: params.get("utm_source") || existing.utm_source || "",
    utm_medium: params.get("utm_medium") || existing.utm_medium || "",
    utm_campaign: params.get("utm_campaign") || existing.utm_campaign || "",
    utm_content: params.get("utm_content") || existing.utm_content || "",
    utm_term: params.get("utm_term") || existing.utm_term || "",
    landing_path: existing.landing_path || window.location.pathname || "/",
    referrer_host: referrerHost,
  };

  writeStoredAttribution(attribution);

  return Object.fromEntries(
    Object.entries(attribution).filter(([, value]) => value !== "")
  );
}

function endpointPath(input) {
  try {
    const rawUrl =
      typeof input === "string"
        ? input
        : input?.url || "";

    return new URL(rawUrl, window.location.origin).pathname;
  } catch {
    return "";
  }
}

function requestJsonBody(init) {
  if (typeof init?.body !== "string") return null;

  try {
    return JSON.parse(init.body);
  } catch {
    return null;
  }
}

function installAttributionTracking() {
  if (
    typeof window === "undefined" ||
    typeof window.fetch !== "function" ||
    window[PATCH_FLAG]
  ) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);

  function syncAttribution(payload) {
    nativeFetch("/api/attribution-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch(() => {
      // Fallar al guardar atribución nunca debe bloquear leads, checkout ni pagos.
    });
  }

  window.fetch = async function attributionFetch(input, init) {
    const path = endpointPath(input);
    const attribution = captureAttribution();
    const requestBody = requestJsonBody(init);

    const response = await nativeFetch(input, init);

    if (!response?.ok) {
      return response;
    }

    if (LEAD_ENDPOINTS.has(path)) {
      const email = String(requestBody?.email || "")
        .trim()
        .toLowerCase();

      if (email) {
        syncAttribution({
          kind: "subscriber",
          email,
          attribution,
        });
      }

      return response;
    }

    if (ORDER_ENDPOINTS.has(path)) {
      response
        .clone()
        .json()
        .then((data) => {
          const externalReference = String(
            data?.external_reference || ""
          ).trim();

          if (!externalReference) return;

          syncAttribution({
            kind: "order",
            external_reference: externalReference,
            attribution,
          });
        })
        .catch(() => {
          // La respuesta comercial conserva su comportamiento original.
        });
    }

    return response;
  };

  window[PATCH_FLAG] = true;
}

if (typeof window !== "undefined") {
  captureAttribution();
  installAttributionTracking();
}

export { captureAttribution };
