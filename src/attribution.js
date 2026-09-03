const STORAGE_KEY =
  "llave066_ga4_attribution_v1";

const GA4_IDS_STORAGE_KEY =
  "llave066_ga4_ids_v1";

const GA4_MEASUREMENT_ID =
  "G-G17WQELH77";

const PATCH_FLAG =
  "__llave066AttributionFetchPatched";

const LEAD_ENDPOINTS =
  new Set([
    "/api/subscribe",
    "/api/ajraz10-subscribe",
  ]);

const ORDER_ENDPOINTS =
  new Set([
    "/api/create-preference",
    "/api/create-promo-preference",
  ]);

function readStoredAttribution() {
  try {
    const raw =
      window.sessionStorage.getItem(
        STORAGE_KEY
      );

    return raw
      ? JSON.parse(raw)
      : {};
  } catch {
    return {};
  }
}

function writeStoredAttribution(
  value
) {
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {
    /*
     * La atribución nunca debe
     * bloquear la experiencia
     * principal.
     */
  }
}

function readStoredGa4Ids() {
  try {
    const raw =
      window.sessionStorage.getItem(
        GA4_IDS_STORAGE_KEY
      );

    return raw
      ? JSON.parse(raw)
      : {};
  } catch {
    return {};
  }
}

function writeStoredGa4Ids(
  value
) {
  try {
    window.sessionStorage.setItem(
      GA4_IDS_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {
    /*
     * La telemetría nunca debe
     * bloquear la navegación
     * ni el checkout.
     */
  }
}

function cleanGa4ClientId(
  value
) {
  const text =
    String(
      value || ""
    ).trim();

  return /^\d+\.\d+$/.test(
    text
  )
    ? text.slice(
        0,
        100
      )
    : "";
}

function cleanGa4SessionId(
  value
) {
  const text =
    String(
      value || ""
    ).trim();

  return /^\d+$/.test(
    text
  )
    ? text.slice(
        0,
        40
      )
    : "";
}

function validStoredGa4Ids() {
  const stored =
    readStoredGa4Ids();

  return {
    client_id:
      cleanGa4ClientId(
        stored.client_id
      ),

    session_id:
      cleanGa4SessionId(
        stored.session_id
      ),
  };
}

function getGtagValue(
  field,
  timeoutMs = 900
) {
  return new Promise(
    (resolve) => {
      if (
        typeof window ===
          "undefined" ||
        typeof window.gtag !==
          "function"
      ) {
        resolve("");
        return;
      }

      let settled =
        false;

      const finish = (
        value
      ) => {
        if (settled) {
          return;
        }

        settled = true;

        resolve(
          String(
            value || ""
          ).trim()
        );
      };

      const timer =
        window.setTimeout(
          () =>
            finish(""),
          timeoutMs
        );

      try {
        window.gtag(
          "get",
          GA4_MEASUREMENT_ID,
          field,
          (value) => {
            window.clearTimeout(
              timer
            );

            finish(
              value
            );
          }
        );
      } catch {
        window.clearTimeout(
          timer
        );

        finish("");
      }
    }
  );
}

async function captureGa4Identifiers() {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  const existing =
    validStoredGa4Ids();

  if (
    existing.client_id &&
    existing.session_id
  ) {
    return existing;
  }

  const [
    clientIdRaw,
    sessionIdRaw,
  ] =
    await Promise.all([
      getGtagValue(
        "client_id"
      ),

      getGtagValue(
        "session_id"
      ),
    ]);

  const next = {
    client_id:
      cleanGa4ClientId(
        clientIdRaw
      ) ||
      existing.client_id ||
      "",

    session_id:
      cleanGa4SessionId(
        sessionIdRaw
      ) ||
      existing.session_id ||
      "",
  };

  if (
    next.client_id ||
    next.session_id
  ) {
    writeStoredGa4Ids(
      next
    );
  }

  return Object.fromEntries(
    Object.entries(
      next
    ).filter(
      ([, value]) =>
        value !== ""
    )
  );
}

function captureAttribution() {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  const existing =
    readStoredAttribution();

  const params =
    new URLSearchParams(
      window.location.search
    );

  let referrerHost =
    existing.referrer_host ||
    "";

  if (
    !referrerHost &&
    document.referrer
  ) {
    try {
      referrerHost =
        new URL(
          document.referrer
        ).hostname;
    } catch {
      referrerHost =
        "";
    }
  }

  const attribution = {
    utm_source:
      params.get(
        "utm_source"
      ) ||
      existing.utm_source ||
      "",

    utm_medium:
      params.get(
        "utm_medium"
      ) ||
      existing.utm_medium ||
      "",

    utm_campaign:
      params.get(
        "utm_campaign"
      ) ||
      existing.utm_campaign ||
      "",

    utm_content:
      params.get(
        "utm_content"
      ) ||
      existing.utm_content ||
      "",

    utm_term:
      params.get(
        "utm_term"
      ) ||
      existing.utm_term ||
      "",

    landing_path:
      existing.landing_path ||
      window.location.pathname ||
      "/",

    referrer_host:
      referrerHost,
  };

  writeStoredAttribution(
    attribution
  );

  return Object.fromEntries(
    Object.entries(
      attribution
    ).filter(
      ([, value]) =>
        value !== ""
    )
  );
}

function endpointPath(
  input
) {
  try {
    const rawUrl =
      typeof input ===
      "string"
        ? input
        : input?.url ||
          "";

    return new URL(
      rawUrl,
      window.location.origin
    ).pathname;
  } catch {
    return "";
  }
}

function requestJsonBody(
  init
) {
  if (
    typeof init?.body !==
    "string"
  ) {
    return null;
  }

  try {
    return JSON.parse(
      init.body
    );
  } catch {
    return null;
  }
}

function waitAtMost(
  promise,
  timeoutMs
) {
  return Promise.race([
    promise,

    new Promise(
      (resolve) => {
        window.setTimeout(
          () =>
            resolve(
              null
            ),
          timeoutMs
        );
      }
    ),
  ]);
}

function installAttributionTracking() {
  if (
    typeof window ===
      "undefined" ||
    typeof window.fetch !==
      "function" ||
    window[PATCH_FLAG]
  ) {
    return;
  }

  const nativeFetch =
    window.fetch.bind(
      window
    );

  /*
   * Devuelve la promesa para poder
   * esperar brevemente su resultado
   * cuando se trata de una orden.
   *
   * keepalive conserva además la
   * posibilidad de terminar la
   * solicitud durante navegación.
   */
  function syncAttribution(
    payload
  ) {
    return nativeFetch(
      "/api/attribution-sync",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "same-origin",

        keepalive:
          true,

        body:
          JSON.stringify(
            payload
          ),
      }
    ).catch(
      () => null
    );
  }

  window.fetch =
    async function attributionFetch(
      input,
      init
    ) {
      const path =
        endpointPath(
          input
        );

      /*
       * Capturamos las UTM exactamente
       * en el momento en que se realiza
       * esta solicitud.
       */
      const attribution =
        captureAttribution();

      const requestBody =
        requestJsonBody(
          init
        );

      /*
       * Antes de crear una preferencia,
       * iniciamos anticipadamente la
       * captura de IDs de GA4.
       *
       * No bloqueamos la creación
       * comercial del pago.
       */
      if (
        ORDER_ENDPOINTS.has(
          path
        )
      ) {
        captureGa4Identifiers()
          .catch(
            () => {}
          );
      }

      const response =
        await nativeFetch(
          input,
          init
        );

      if (
        !response?.ok
      ) {
        return response;
      }

      /*
       * LEADS
       *
       * Mantienen comportamiento
       * no bloqueante porque su
       * atribución no interviene
       * en una salida inmediata
       * hacia Mercado Pago.
       */
      if (
        LEAD_ENDPOINTS.has(
          path
        )
      ) {
        const email =
          String(
            requestBody?.email ||
              ""
          )
            .trim()
            .toLowerCase();

        if (email) {
          syncAttribution({
            kind:
              "subscriber",

            email,

            attribution,
          });
        }

        return response;
      }

      /*
       * ÓRDENES
       *
       * Antes:
       * la sincronización se lanzaba
       * después de recibir la orden,
       * pero el navegador podía salir
       * inmediatamente hacia Mercado
       * Pago sin esperar su término.
       *
       * Ahora:
       * obtenemos external_reference,
       * sincronizamos atribución/GA4
       * y esperamos solamente un
       * máximo controlado antes de
       * devolver la respuesta al
       * checkout.
       *
       * Así reducimos la ventana en
       * que una navegación inmediata
       * puede dejar UTM nulas.
       */
      if (
        ORDER_ENDPOINTS.has(
          path
        )
      ) {
        let data =
          null;

        try {
          data =
            await response
              .clone()
              .json();
        } catch {
          data =
            null;
        }

        const externalReference =
          String(
            data
              ?.external_reference ||
              ""
          ).trim();

        if (
          externalReference
        ) {
          const ga4 =
            await captureGa4Identifiers()
              .catch(
                () => ({})
              );

          /*
           * Esperamos hasta 1,2 s
           * como máximo.
           *
           * En condiciones normales
           * la llamada termina mucho
           * antes.
           *
           * Si Analytics/DB demora,
           * jamás impedimos que el
           * comprador continúe a
           * Mercado Pago.
           */
          await waitAtMost(
            syncAttribution({
              kind:
                "order",

              external_reference:
                externalReference,

              attribution,

              ga4,
            }),
            1200
          );
        }

        return response;
      }

      return response;
    };

  window[PATCH_FLAG] =
    true;
}

if (
  typeof window !==
  "undefined"
) {
  /*
   * Captura temprana:
   * conserva la atribución del
   * primer ingreso aunque luego
   * cambie la navegación interna.
   */
  captureAttribution();

  installAttributionTracking();

  /*
   * Captura anticipada de GA4:
   * evita depender del instante
   * exacto del checkout.
   */
  captureGa4Identifiers()
    .catch(
      () => {}
    );

  window.setTimeout(
    () => {
      captureGa4Identifiers()
        .catch(
          () => {}
        );
    },
    1500
  );
}

export {
  captureAttribution,
  captureGa4Identifiers,
};
