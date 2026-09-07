const PAYMENT_TRACKER_FLAG = "__llave066PaymentHandoffAnalytics";
const CHECKOUT_STORAGE_KEY = "llave066_ga4_checkout_v1";
const PRODUCT_ID = "la-llave-i-ciudad-central-physical";
const PRODUCT_NAME = "La Llave I: Ciudad Central";
const DEFAULT_BOOK_PRICE = 15990;

if (typeof window !== "undefined" && !window[PAYMENT_TRACKER_FLAG]) {
  window[PAYMENT_TRACKER_FLAG] = true;

  function readCheckoutSnapshot() {
    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function buildBookItem(price) {
    return {
      item_id: PRODUCT_ID,
      item_name: PRODUCT_NAME,
      item_category: "Libro",
      item_variant: "Edición impresa",
      price,
      quantity: 1,
    };
  }

  function sendPaymentInfoEvent() {
    return new Promise((resolve) => {
      if (typeof window.gtag !== "function") {
        resolve(false);
        return;
      }

      const snapshot = readCheckoutSnapshot() || {};
      const bookPrice = Number(snapshot.bookPrice) || DEFAULT_BOOK_PRICE;
      const shippingCost = Number(snapshot.shippingCost) || 0;
      const total = Number(snapshot.total) || bookPrice + shippingCost;

      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        resolve(true);
      };

      window.gtag("event", "add_payment_info", {
        currency: "CLP",
        value: bookPrice,
        coupon: snapshot.promoCode || undefined,
        payment_type: "Mercado Pago",
        items: [buildBookItem(bookPrice)],
        shipping: shippingCost,
        checkout_total: total,
        checkout_type: snapshot.checkoutType || "direct",
        region: snapshot.region || undefined,
        payment_stage: "mercadopago_handoff",
        event_callback: finish,
        event_timeout: 800,
      });

      window.setTimeout(finish, 900);
    });
  }

  const previousFetch = window.fetch.bind(window);

  window.fetch = async function paymentAwareFetch(input, init) {
    const rawUrl =
      typeof input === "string"
        ? input
        : input?.url || "";

    const response = await previousFetch(input, init);

    const isCreatePreference =
      rawUrl === "/api/create-preference" ||
      rawUrl.endsWith("/api/create-preference");

    if (isCreatePreference && response?.ok) {
      try {
        const data = await response.clone().json();

        if (data?.init_point) {
          await sendPaymentInfoEvent();
        }
      } catch {
        // Nunca bloqueamos el checkout por un fallo de analítica.
      }
    }

    return response;
  };
}
