const STORAGE_SUBSCRIBED = "ajraz10_subscribed_v1";
const STORAGE_DISMISSED = "ajraz10_dismissed_at_v1";
const DISMISS_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const ORIGINAL_BOOK_PRICE = 15990;
const DISCOUNT_AMOUNT = 1599;
const DISCOUNTED_BOOK_PRICE = 14391;
let appliedPromo = null;
let originalFetch = null;

function chileClockKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return Number(`${v.year}${v.month}${v.day}${v.hour}${v.minute}${v.second}`);
}

function campaignActive() {
  const key = chileClockKey();
  return key >= 20260824000000 && key <= 20260930235959;
}

function previewEnabled() {
  return new URLSearchParams(window.location.search).get("ajraz10_preview") === "1";
}

function formatCLP(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function closePopup(remember = true) {
  const overlay = document.getElementById("ajraz10-overlay");
  if (overlay) overlay.remove();

  if (remember && !previewEnabled()) {
    localStorage.setItem(STORAGE_DISMISSED, String(Date.now()));
  }
}

function showPopup() {
  if (document.getElementById("ajraz10-overlay")) return;
  if (!campaignActive() && !previewEnabled()) return;
  if (localStorage.getItem(STORAGE_SUBSCRIBED) && !previewEnabled()) return;

  const dismissed = Number(localStorage.getItem(STORAGE_DISMISSED) || 0);

  if (
    !previewEnabled() &&
    dismissed &&
    Date.now() - dismissed < DISMISS_COOLDOWN_MS
  ) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "ajraz10-overlay";
  overlay.className = "ajraz10-overlay";
  overlay.innerHTML = `
    <section class="ajraz10-modal" role="dialog" aria-modal="true" aria-labelledby="ajraz10-title">
      <button class="ajraz10-close" type="button" aria-label="Cerrar">×</button>
      <div class="ajraz10-eyebrow">ARCHIVO 066 · ACCESO ESPECIAL</div>
      <div class="ajraz10-code-mark">BENEFICIO PRIVADO</div>
      <h2 id="ajraz10-title">DESBLOQUEA UN 10%</h2>
      <p class="ajraz10-lead">Regístrate en el Archivo 066 y recibe en tu correo un código privado para la edición impresa de <strong>La Llave I: Ciudad Central</strong>.</p>
      <form id="ajraz10-form">
        <input class="ajraz10-honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label>
          <span>Nombre <small>(opcional)</small></span>
          <input name="name" type="text" autocomplete="name" maxlength="80">
        </label>
        <label>
          <span>Correo electrónico</span>
          <input name="email" type="email" autocomplete="email" required>
        </label>
        <label class="ajraz10-consent">
          <input name="consent" type="checkbox" required>
          <span>Acepto recibir comunicaciones del Archivo 066 y esta promoción por correo.</span>
        </label>
        <button type="submit">DESBLOQUEAR 10%</button>
        <p class="ajraz10-form-status" aria-live="polite"></p>
      </form>
      <p class="ajraz10-terms">Válido desde el 24 de agosto de 2026 a las 00:00 hasta el 30 de septiembre de 2026. 10% sobre el precio del libro. Despacho no incluido en el descuento.</p>
    </section>`;

  document.body.appendChild(overlay);

  overlay
    .querySelector(".ajraz10-close")
    .addEventListener("click", () => closePopup(true));

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePopup(true);
  });

  const form = overlay.querySelector("#ajraz10-form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = form.querySelector(".ajraz10-form-status");
    const button = form.querySelector("button[type=submit]");
    const data = new FormData(form);

    button.disabled = true;
    status.className = "ajraz10-form-status";
    status.textContent = "Autorizando acceso…";

    try {
      const response = await fetch("/api/ajraz10-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(data.get("name") || ""),
          email: String(data.get("email") || ""),
          consent: data.get("consent") === "on",
          website: String(data.get("website") || ""),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "No pudimos habilitar el acceso.");
      }

      localStorage.setItem(
        STORAGE_SUBSCRIBED,
        result.email || String(data.get("email") || "")
      );

      overlay.querySelector(".ajraz10-modal").innerHTML = `
        <button class="ajraz10-close" type="button" aria-label="Cerrar">×</button>
        <div class="ajraz10-eyebrow">ARCHIVO 066 · AUTORIZACIÓN COMPLETADA</div>
        <div class="ajraz10-code-mark">CÓDIGO ENVIADO</div>
        <h2>ACCESO CONCEDIDO</h2>
        <p class="ajraz10-lead">El beneficio del 10% quedó asociado a <strong>${result.email}</strong>. Te enviamos el código y las instrucciones a ese correo.</p>
        <button class="ajraz10-go-buy" type="button">IR A COMPRAR</button>`;

      overlay
        .querySelector(".ajraz10-close")
        .addEventListener("click", () => closePopup(false));

      overlay
        .querySelector(".ajraz10-go-buy")
        .addEventListener("click", () => {
          closePopup(false);
          document
            .getElementById("compra-directa")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    } catch (error) {
      status.className = "ajraz10-form-status is-error";
      status.textContent = error?.message || "No pudimos habilitar el acceso.";
      button.disabled = false;
    }
  });
}

function schedulePopupAfterIntro() {
  if (window.location.pathname !== "/") return;

  let attempts = 0;

  const timer = setInterval(() => {
    attempts += 1;

    const intro = document.querySelector(".intro");
    const site = document.querySelector(".site");

    if (!intro && site) {
      clearInterval(timer);
      setTimeout(showPopup, 2800);
    } else if (attempts > 120) {
      clearInterval(timer);
    }
  }, 500);
}

function getCheckoutEmailInput() {
  return document.querySelector(
    "#compra-directa .sale-form input[type='email']"
  );
}

function getCheckoutRegionSelect() {
  return document.querySelector("#compra-directa .sale-form select");
}

function injectCheckoutPromo() {
  if (!campaignActive() && !previewEnabled()) return;

  const form = document.querySelector("#compra-directa .sale-form");

  if (!form || form.querySelector("#ajraz10-checkout")) return;

  const shippingNote = form.querySelector(".sale-shipping-note");
  if (!shippingNote) return;

  const block = document.createElement("div");
  block.id = "ajraz10-checkout";
  block.className = "ajraz10-checkout";
  block.innerHTML = `
    <div class="ajraz10-checkout-label">¿Tienes un código de acceso?</div>
    <div class="ajraz10-checkout-row">
      <input id="ajraz10-code-input" type="text" maxlength="24" autocomplete="off" placeholder="Ingresa tu código" aria-label="Código de acceso">
      <button id="ajraz10-apply" type="button">APLICAR</button>
    </div>
    <p id="ajraz10-checkout-status" aria-live="polite">Los códigos privados se validan con el correo utilizado en la compra.</p>`;

  form.insertBefore(block, shippingNote);

  const codeInput = block.querySelector("#ajraz10-code-input");
  const apply = block.querySelector("#ajraz10-apply");
  const status = block.querySelector("#ajraz10-checkout-status");
  const emailInput = getCheckoutEmailInput();

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/\s+/g, "");
    appliedPromo = null;
    status.className = "";
    status.textContent =
      "Los códigos privados se validan con el correo utilizado en la compra.";
    restoreSummary();
  });

  emailInput?.addEventListener("input", () => {
    if (
      appliedPromo &&
      emailInput.value.trim().toLowerCase() !== appliedPromo.email
    ) {
      appliedPromo = null;
      status.className = "is-error";
      status.textContent = "El correo cambió. Vuelve a aplicar el código.";
      restoreSummary();
    }
  });

  apply.addEventListener("click", async () => {
    const email = emailInput?.value.trim().toLowerCase() || "";
    const code = codeInput.value.trim().toUpperCase();

    if (!email) {
      status.className = "is-error";
      status.textContent =
        "Ingresa primero el correo que usarás para comprar.";
      return;
    }

    apply.disabled = true;
    status.className = "";
    status.textContent = "Validando acceso…";

    try {
      const response = await fetch("/api/ajraz10-validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result?.error || "Código no autorizado.");
      }

      appliedPromo = {
        code: result.code,
        email,
        discountAmount: result.discountAmount,
        discountedBookPrice: result.discountedBookPrice,
      };

      status.className = "is-success";
      status.textContent =
        "✓ ACCESO AUTORIZADO · 10% aplicado al precio del libro.";

      applyPromoToSummary();
    } catch (error) {
      appliedPromo = null;
      status.className = "is-error";
      status.textContent = error?.message || "Código no autorizado.";
      restoreSummary();
    } finally {
      apply.disabled = false;
    }
  });
}

function restoreSummary() {
  const summary = document.querySelector("#compra-directa .sale-summary");
  if (!summary) return;

  summary.querySelector(".ajraz10-summary-discount")?.remove();

  const rows = summary.querySelectorAll(":scope > div");

  if (rows[0]?.querySelector("strong")) {
    rows[0].querySelector("strong").textContent = formatCLP(
      ORIGINAL_BOOK_PRICE
    );
  }

  const region = getCheckoutRegionSelect()?.value || "RM";
  const shipping = region === "RM" ? 3000 : 4500;

  if (rows[2]?.querySelector("strong")) {
    rows[2].querySelector("strong").textContent = formatCLP(
      ORIGINAL_BOOK_PRICE + shipping
    );
  }
}

function applyPromoToSummary() {
  if (!appliedPromo) return;

  const summary = document.querySelector("#compra-directa .sale-summary");
  if (!summary) return;

  const rows = summary.querySelectorAll(":scope > div");
  const region = getCheckoutRegionSelect()?.value || "RM";
  const shipping = region === "RM" ? 3000 : 4500;

  if (rows[0]?.querySelector("strong")) {
    rows[0].querySelector("strong").textContent = formatCLP(
      DISCOUNTED_BOOK_PRICE
    );
  }

  let discountRow = summary.querySelector(".ajraz10-summary-discount");

  if (!discountRow) {
    discountRow = document.createElement("div");
    discountRow.className = "ajraz10-summary-discount";
    discountRow.innerHTML = `<span>Descuento promocional</span><strong>−${formatCLP(
      DISCOUNT_AMOUNT
    )}</strong>`;

    const total = summary.querySelector(".sale-total");
    summary.insertBefore(discountRow, total || null);
  }

  const total = summary.querySelector(".sale-total strong");

  if (total) {
    total.textContent = formatCLP(DISCOUNTED_BOOK_PRICE + shipping);
  }
}

function installFetchInterceptor() {
  if (originalFetch) return;

  originalFetch = window.fetch.bind(window);

  window.fetch = async function ajraz10Fetch(input, init = {}) {
    const rawUrl = typeof input === "string" ? input : input?.url || "";
    const isCheckout =
      rawUrl === "/api/create-preference" ||
      rawUrl.endsWith("/api/create-preference");

    if (!isCheckout) {
      return originalFetch(input, init);
    }

    const codeInput = document.getElementById("ajraz10-code-input");
    const code = String(codeInput?.value || "")
      .trim()
      .toUpperCase();

    if (!code) {
      return originalFetch(input, init);
    }

    let body = {};

    try {
      body = init?.body ? JSON.parse(init.body) : {};
    } catch {
      body = {};
    }

    body.promoCode = code;

    return originalFetch("/api/create-promo-preference", {
      ...init,
      body: JSON.stringify(body),
    });
  };
}

function maintainPromoUI() {
  const observer = new MutationObserver(() => {
    injectCheckoutPromo();

    if (appliedPromo) {
      requestAnimationFrame(applyPromoToSummary);
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  injectCheckoutPromo();

  document.addEventListener("change", (event) => {
    if (
      event.target === getCheckoutRegionSelect() &&
      appliedPromo
    ) {
      requestAnimationFrame(applyPromoToSummary);
    }
  });
}

if (typeof window !== "undefined") {
  installFetchInterceptor();

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        maintainPromoUI();
        schedulePopupAfterIntro();
      },
      { once: true }
    );
  } else {
    maintainPromoUI();
    schedulePopupAfterIntro();
  }
}
