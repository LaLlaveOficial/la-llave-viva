(function () {
  "use strict";
  if (typeof window.oaiq !== "function") return;
  const consentKey = "llave066_openai_measurement_consent_v1";
  let consentOverride = null;
  function denied() {
    if (consentOverride !== null) return !consentOverride;
    try { return localStorage.getItem(consentKey) === "denied"; } catch (_) { return false; }
  }
  function measure(name, data, options) {
    if (denied()) return false;
    window.oaiq("measure", name, data, options || {});
    return true;
  }
  const path = location.pathname.replace(/\/+$/, "") || "/";
  measure("page_viewed", {type: "contents"});
  if (path === "/comprar") measure("contents_viewed", {type: "contents", contents: [{
    id: "la-llave-i-ciudad-central-physical", name: "La Llave I: Ciudad Central", content_type: "product"
  }]});
  const notice = document.createElement("footer");
  notice.id = "openai-measurement-notice";
  notice.style.cssText = "padding:16px 24px;text-align:center;font:13px/1.6 system-ui;color:#bbb;background:#0e1115";
  const policy = document.createElement("a");
  policy.href = "/privacidad-medicion.html";
  policy.textContent = "Información sobre medición publicitaria";
  policy.style.color = "#d9c995";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.style.cssText = "margin-left:12px;border:0;background:none;color:#d9c995;text-decoration:underline;cursor:pointer;font:inherit";
  function refreshLabel() { toggle.textContent = denied() ? "Activar medición de OpenAI" : "Desactivar medición de OpenAI"; }
  toggle.addEventListener("click", function () {
    const enable = denied(); consentOverride = enable;
    try { localStorage.setItem(consentKey, enable ? "granted" : "denied"); } catch (_) {}
    window.oaiq("consent", enable); refreshLabel();
  });
  refreshLabel(); notice.append(policy, toggle); document.body.append(notice);
  // A success URL is not payment proof. Validate the approved order on the
  // server and use its amount, never an amount supplied in a return URL.
  if (path !== "/compra-confirmada" || denied()) return;
  const params = new URLSearchParams(location.search);
  const status = (params.get("status") || params.get("collection_status") || "").toLowerCase();
  const paymentId = params.get("payment_id") || params.get("collection_id") || "";
  const reference = params.get("external_reference") || "";
  if (status !== "approved" || !/^\d{4,30}$/.test(paymentId) || reference.length < 12 || reference.length > 80 || !/^LLAVE-[A-Z0-9-]+$/i.test(reference)) return;
  const eventId = "mp_" + paymentId;
  const dedupeKey = "llave066_openai_purchase_" + paymentId;
  function alreadySent() {
    try { return Boolean(localStorage.getItem(dedupeKey)); } catch (_) { return false; }
  }
  async function verifyPurchase() {
    const query = new URLSearchParams({payment_id: paymentId, external_reference: reference});
    for (let attempt = 0; attempt < 10; attempt++) {
      if (denied() || alreadySent()) return;
      try {
        const response = await fetch("/api/order-payment-status?" + query, {cache: "no-store"});
        const data = await response.json();
        if (response.ok && data.approved === true) {
          const amount = Number(data.book_amount);
          if (data.live_mode !== true || data.currency !== "CLP" || !Number.isSafeInteger(amount) || amount <= 0) return;
          if (measure("order_created", {type: "contents", amount, currency: "CLP", contents: [{
            id: "la-llave-i-ciudad-central-physical", name: "La Llave I: Ciudad Central", content_type: "product", quantity: 1, amount, currency: "CLP"
          }]}, {event_id: eventId})) {
            try { localStorage.setItem(dedupeKey, new Date().toISOString()); } catch (_) {}
          }
          return;
        }
      } catch (_) { /* Analytics must never interrupt the order page. */ }
      if (attempt < 9) await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  void verifyPurchase();
})();
