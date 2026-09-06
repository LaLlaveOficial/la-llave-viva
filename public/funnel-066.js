(() => {
  const SCRIPT_FLAG =
    "__laLlaveFunnel066";

  const PRODUCT_ID =
    "la-llave-i-ciudad-central-physical";

  const PRODUCT_NAME =
    "La Llave I: Ciudad Central";

  const FULL_PRICE = 15990;
  const PROMO_PRICE = 14391;

  const SHIPPING_RM = 3000;
  const SHIPPING_REGIONS = 4500;

  const ATTRIBUTION_STORAGE_KEY =
    "llave066_ga4_attribution_v1";

  const VERIFIED_PROMO_LEAD_STORAGE_KEY =
    "llave066_ajraz10_verified_lead_v1";

  if (window[SCRIPT_FLAG]) {
    return;
  }

  window[SCRIPT_FLAG] = true;

  const state = {
    productViewed: false,
    ga4BeginCheckoutSent: false,
    metaInitiateCheckoutSent: false,
    tiktokInitiateCheckoutSent: false,
    shippingInfoSent: false,
    gtagWrapped: false,
    verifiedPromoLeadObserverInstalled:
      false,
  };

  function safeJsonParse(value) {
    try {
      return value
        ? JSON.parse(value)
        : null;
    } catch {
      return null;
    }
  }

  function getAttributionContext() {
    let stored = {};

    try {
      stored =
        safeJsonParse(
          window.sessionStorage.getItem(
            ATTRIBUTION_STORAGE_KEY
          )
        ) || {};
    } catch {
      stored = {};
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    let referrerHost =
      stored.referrer_host || "";

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
        referrerHost = "";
      }
    }

    const context = {
      utm_source:
        params.get("utm_source") ||
        stored.utm_source ||
        "",

      utm_medium:
        params.get("utm_medium") ||
        stored.utm_medium ||
        "",

      utm_campaign:
        params.get("utm_campaign") ||
        stored.utm_campaign ||
        "",

      utm_content:
        params.get("utm_content") ||
        stored.utm_content ||
        "",

      utm_term:
        params.get("utm_term") ||
        stored.utm_term ||
        "",

      landing_path:
        stored.landing_path ||
        window.location.pathname ||
        "/",

      referrer_host:
        referrerHost,
    };

    return Object.fromEntries(
      Object.entries(
        context
      ).filter(
        ([, value]) =>
          value !== ""
      )
    );
  }

  function currentLanguage() {
    return (
      document
        .querySelector(
          "main.site"
        )
        ?.getAttribute(
          "lang"
        ) ||
      document.documentElement
        .lang ||
      "es"
    );
  }

  function getLandingVariant() {
    const path =
      window.location.pathname
        .replace(
          /\/+$/,
          ""
        );

    if (
      path === "/comprar"
    ) {
      return "dedicated_purchase";
    }

    if (
      window.location.hash ===
      "#compra-directa"
    ) {
      return "direct_hash";
    }

    return "home";
  }

  function getPromoState() {
    const discountRow =
      document.querySelector(
        "#compra-directa .ajraz10-summary-discount"
      );

    const codeInput =
      document.getElementById(
        "ajraz10-code-input"
      );

    const code =
      String(
        codeInput?.value || ""
      )
        .trim()
        .toUpperCase();

    const applied =
      Boolean(
        discountRow &&
        code
      );

    return {
      applied,

      code:
        applied
          ? code
          : "",

      bookPrice:
        applied
          ? PROMO_PRICE
          : FULL_PRICE,
    };
  }

  function getCheckoutEmail() {
    const emailInput =
      document.querySelector(
        '#compra-directa .sale-form input[type="email"]'
      );

    const email =
      String(
        emailInput?.value || ""
      )
        .trim()
        .toLowerCase();

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
        email
      )
    ) {
      return "";
    }

    return email;
  }

  function readVerifiedPromoLeadEmail() {
    try {
      return String(
        window.localStorage.getItem(
          VERIFIED_PROMO_LEAD_STORAGE_KEY
        ) || ""
      )
        .trim()
        .toLowerCase();
    } catch {
      return "";
    }
  }

  function writeVerifiedPromoLeadEmail(
    email
  ) {
    try {
      window.localStorage.setItem(
        VERIFIED_PROMO_LEAD_STORAGE_KEY,
        email
      );

      return true;
    } catch {
      return false;
    }
  }

  function getRegion(form) {
    const regionSelect =
      form?.querySelector(
        "select[required]"
      );

    return String(
      regionSelect?.value ||
      "RM"
    );
  }

  function getShippingCost(
    region
  ) {
    return region === "RM"
      ? SHIPPING_RM
      : SHIPPING_REGIONS;
  }

  function buildBookItem(
    price
  ) {
    return {
      item_id:
        PRODUCT_ID,

      item_name:
        PRODUCT_NAME,

      item_category:
        "Libro",

      item_variant:
        "Edición impresa",

      price,

      quantity: 1,
    };
  }

  function installGtagGuard() {
    if (
      state.gtagWrapped
    ) {
      return true;
    }

    const originalGtag =
      window.gtag;

    if (
      typeof originalGtag !==
      "function"
    ) {
      return false;
    }

    if (
      originalGtag
        .__llave066FunnelGuard
    ) {
      state.gtagWrapped =
        true;

      return true;
    }

    function guardedGtag(
      ...args
    ) {
      const command =
        args[0];

      const eventName =
        args[1];

      const eventParams =
        args[2] &&
        typeof args[2] ===
          "object"
          ? args[2]
          : {};

      /*
       * AJRAZ10 ahora usa
       * DOUBLE OPT-IN.
       *
       * App.jsx conserva una
       * llamada antigua a
       * generate_lead cuando
       * /api/ajraz10-subscribe
       * responde OK.
       *
       * Hoy ese OK puede significar
       * solamente:
       *
       * status = pending
       *
       * Por lo tanto NO corresponde
       * contarlo como lead real.
       *
       * Bloqueamos SOLAMENTE ese
       * evento antiguo.
       *
       * El lead verdadero se enviará
       * cuando AJRAZ10 haya sido
       * verificado y aplicado.
       */
      if (
        command === "event" &&
        eventName ===
          "generate_lead" &&
        eventParams.lead_type ===
          "archivo_066_promo"
      ) {
        return;
      }

      /*
       * Conservamos el guard existente
       * contra duplicados de
       * begin_checkout.
       */
      if (
        command ===
          "event" &&
        eventName ===
          "begin_checkout"
      ) {
        if (
          state
            .ga4BeginCheckoutSent
        ) {
          return;
        }

        state
          .ga4BeginCheckoutSent =
          true;
      }

      return originalGtag.apply(
        window,
        args
      );
    }

    guardedGtag
      .__llave066FunnelGuard =
      true;

    guardedGtag
      .__llave066Original =
      originalGtag;

    window.gtag =
      guardedGtag;

    state.gtagWrapped =
      true;

    return true;
  }

  function trackGA4(
    eventName,
    params = {}
  ) {
    installGtagGuard();

    if (
      typeof window.gtag !==
      "function"
    ) {
      return false;
    }

    window.gtag(
      "event",
      eventName,
      {
        ...getAttributionContext(),
        ...params,
      }
    );

    return true;
  }

  function trackMeta(
    eventName,
    params = {}
  ) {
    if (
      typeof window.fbq !==
      "function"
    ) {
      return false;
    }

    window.fbq(
      "track",
      eventName,
      params
    );

    return true;
  }

  function trackTikTok(
    eventName,
    params = {}
  ) {
    if (
      !window.ttq ||
      typeof window.ttq.track !==
        "function"
    ) {
      return false;
    }

    window.ttq.track(
      eventName,
      params
    );

    return true;
  }

  function trackVerifiedPromoLeadIfReady() {
    const promo =
      getPromoState();

    /*
     * La fila de descuento solo
     * aparece después de una
     * validación AJRAZ10 exitosa.
     *
     * Una solicitud PENDING nunca
     * llega hasta aquí.
     */
    if (
      !promo.applied ||
      promo.code !== "AJRAZ10"
    ) {
      return false;
    }

    const email =
      getCheckoutEmail();

    if (!email) {
      return false;
    }

    /*
     * Evitamos volver a enviar
     * generate_lead para el mismo
     * correo desde este navegador.
     */
    if (
      readVerifiedPromoLeadEmail() ===
      email
    ) {
      return false;
    }

    const sent =
      trackGA4(
        "generate_lead",
        {
          lead_type:
            "archivo_066_promo_verified",

          form_name:
            "ajraz10",

          verification_status:
            "verified",

          coupon:
            "AJRAZ10",

          landing_variant:
            getLandingVariant(),

          language:
            currentLanguage(),
        }
      );

    if (sent) {
      writeVerifiedPromoLeadEmail(
        email
      );
    }

    return sent;
  }

  function getCheckoutData(
    form
  ) {
    const promo =
      getPromoState();

    const region =
      getRegion(form);

    const shipping =
      getShippingCost(
        region
      );

    const bookPrice =
      promo.bookPrice;

    return {
      promo,
      region,
      shipping,
      bookPrice,

      total:
        bookPrice +
        shipping,

      checkoutType:
        promo.applied
          ? "promo_ajraz10"
          : "direct",
    };
  }

  function trackProductView() {
    if (
      state.productViewed
    ) {
      return;
    }

    state.productViewed =
      true;

    const promo =
      getPromoState();

    const bookPrice =
      promo.bookPrice;

    trackGA4(
      "view_item",
      {
        currency: "CLP",

        value:
          bookPrice,

        items: [
          buildBookItem(
            bookPrice
          ),
        ],

        landing_variant:
          getLandingVariant(),

        language:
          currentLanguage(),
      }
    );

    trackMeta(
      "ViewContent",
      {
        content_ids: [
          PRODUCT_ID,
        ],

        content_type:
          "product",

        content_name:
          PRODUCT_NAME,

        currency:
          "CLP",

        value:
          bookPrice,

        num_items: 1,
      }
    );

    trackTikTok(
      "ViewContent",
      {
        content_ids: [
          PRODUCT_ID,
        ],

        content_type:
          "product",

        description:
          PRODUCT_NAME,

        currency:
          "CLP",

        value:
          bookPrice,

        quantity: 1,
      }
    );
  }

  function getCtaVariant(
    anchor
  ) {
    if (
      anchor.classList.contains(
        "hero-buy-cta"
      )
    ) {
      return "hero";
    }

    if (
      anchor.classList.contains(
        "nav-buy"
      )
    ) {
      return "navigation";
    }

    return "other";
  }

  function trackPurchaseCta(
    anchor
  ) {
    const promo =
      getPromoState();

    trackGA4(
      "purchase_cta_click",
      {
        cta_variant:
          getCtaVariant(
            anchor
          ),

        landing_variant:
          getLandingVariant(),

        currency:
          "CLP",

        value:
          promo.bookPrice,

        language:
          currentLanguage(),
      }
    );
  }

  function ensureCheckoutStarted(
    form
  ) {
    const data =
      getCheckoutData(
        form
      );

    const commonGA4 = {
      currency:
        "CLP",

      value:
        data.bookPrice,

      shipping:
        data.shipping,

      checkout_total:
        data.total,

      checkout_type:
        data.checkoutType,

      region:
        data.region,

      items: [
        buildBookItem(
          data.bookPrice
        ),
      ],

      language:
        currentLanguage(),
    };

    if (
      data.promo.code
    ) {
      commonGA4.coupon =
        data.promo.code;
    }

    if (
      !state
        .ga4BeginCheckoutSent
    ) {
      trackGA4(
        "begin_checkout",
        commonGA4
      );
    }

    if (
      !state
        .metaInitiateCheckoutSent
    ) {
      const sent =
        trackMeta(
          "InitiateCheckout",
          {
            content_ids: [
              PRODUCT_ID,
            ],

            content_type:
              "product",

            content_name:
              PRODUCT_NAME,

            currency:
              "CLP",

            value:
              data.bookPrice,

            num_items: 1,
          }
        );

      if (sent) {
        state
          .metaInitiateCheckoutSent =
          true;
      }
    }

    if (
      !state
        .tiktokInitiateCheckoutSent
    ) {
      const sent =
        trackTikTok(
          "InitiateCheckout",
          {
            content_ids: [
              PRODUCT_ID,
            ],

            content_type:
              "product",

            description:
              PRODUCT_NAME,

            currency:
              "CLP",

            value:
              data.bookPrice,

            quantity: 1,
          }
        );

      if (sent) {
        state
          .tiktokInitiateCheckoutSent =
          true;
      }
    }
  }

  function trackShippingInfo(
    form
  ) {
    if (
      state.shippingInfoSent
    ) {
      return;
    }

    if (
      !form ||
      !form.checkValidity()
    ) {
      return;
    }

    const data =
      getCheckoutData(
        form
      );

    const params = {
      currency:
        "CLP",

      value:
        data.bookPrice,

      shipping:
        data.shipping,

      checkout_total:
        data.total,

      shipping_tier:
        data.region === "RM"
          ? "region_metropolitana"
          : "otras_regiones",

      region:
        data.region,

      checkout_type:
        data.checkoutType,

      items: [
        buildBookItem(
          data.bookPrice
        ),
      ],

      language:
        currentLanguage(),
    };

    if (
      data.promo.code
    ) {
      params.coupon =
        data.promo.code;
    }

    const sent =
      trackGA4(
        "add_shipping_info",
        params
      );

    if (sent) {
      state.shippingInfoSent =
        true;
    }
  }

  function bindForm(
    form
  ) {
    if (
      !form ||
      form.dataset
        .funnel066Bound ===
        "true"
    ) {
      return;
    }

    form.dataset
      .funnel066Bound =
      "true";

    form.addEventListener(
      "focusin",
      (event) => {
        const target =
          event.target;

        if (
          !target?.matches?.(
            "input, select, textarea"
          )
        ) {
          return;
        }

        ensureCheckoutStarted(
          form
        );
      },
      true
    );

    form.addEventListener(
      "submit",
      () => {
        /*
         * Capturamos antes del
         * onSubmit de React.
         *
         * Si el usuario llegó al
         * botón con autofill y nunca
         * enfocó un campo,
         * garantizamos también
         * begin_checkout.
         */
        ensureCheckoutStarted(
          form
        );

        trackShippingInfo(
          form
        );
      },
      true
    );
  }

  function bindVerifiedPromoLeadObserver(
    section
  ) {
    if (
      !section ||
      state
        .verifiedPromoLeadObserverInstalled
    ) {
      return;
    }

    state
      .verifiedPromoLeadObserverInstalled =
      true;

    /*
     * Por si el descuento ya estaba
     * aplicado cuando el observer
     * se instaló.
     */
    trackVerifiedPromoLeadIfReady();

    /*
     * AJRAZ10 inserta dinámicamente
     * la fila de descuento una vez
     * validado.
     *
     * Observamos ese cambio y recién
     * entonces contabilizamos el lead.
     */
    const observer =
      new MutationObserver(
        () => {
          trackVerifiedPromoLeadIfReady();
        }
      );

    observer.observe(
      section,
      {
        childList: true,
        subtree: true,
        characterData: true,
      }
    );
  }

  function bindProductObserver(
    section
  ) {
    if (
      !section ||
      section.dataset
        .funnel066Observed ===
        "true"
    ) {
      return;
    }

    section.dataset
      .funnel066Observed =
      "true";

    const directLanding =
      window.location.hash ===
        "#compra-directa" ||
      window.location.pathname
        .replace(
          /\/+$/,
          ""
        ) ===
        "/comprar";

    /*
     * En /comprar el producto es
     * visible desde el primer
     * momento.
     */
    if (
      directLanding
    ) {
      trackProductView();
    }

    if (
      !(
        "IntersectionObserver" in
        window
      )
    ) {
      if (
        !directLanding
      ) {
        trackProductView();
      }

      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visible =
            entries.some(
              (entry) =>
                entry.isIntersecting
            );

          if (!visible) {
            return;
          }

          trackProductView();

          observer.disconnect();
        },
        {
          threshold: 0.01,
        }
      );

    observer.observe(
      section
    );
  }

  function bindGlobalClicks() {
    document.addEventListener(
      "click",
      (event) => {
        const target =
          event.target instanceof
          Element
            ? event.target
            : event.target
                ?.parentElement;

        if (!target) {
          return;
        }

        const purchaseAnchor =
          target.closest(
            'a[href="#compra-directa"], a[href$="#compra-directa"]'
          );

        if (
          purchaseAnchor
        ) {
          trackPurchaseCta(
            purchaseAnchor
          );
        }
      },
      true
    );
  }

  function findAndBind() {
    const section =
      document.getElementById(
        "compra-directa"
      );

    const form =
      section?.querySelector(
        ".sale-form"
      );

    if (section) {
      bindProductObserver(
        section
      );

      bindVerifiedPromoLeadObserver(
        section
      );
    }

    if (form) {
      bindForm(
        form
      );
    }

    return Boolean(
      section &&
      form
    );
  }

  function start() {
    /*
     * Primero instalamos el guard,
     * antes de cualquier interacción
     * del usuario con AJRAZ10.
     */
    installGtagGuard();

    bindGlobalClicks();

    if (
      findAndBind()
    ) {
      return;
    }

    const observer =
      new MutationObserver(
        () => {
          if (
            findAndBind()
          ) {
            observer.disconnect();
          }
        }
      );

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true,
      }
    );

    window.setTimeout(
      () => {
        observer.disconnect();
      },
      15000
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true,
      }
    );
  } else {
    start();
  }
})();
