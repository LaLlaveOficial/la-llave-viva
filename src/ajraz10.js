const STORAGE_SUBSCRIBED =
  "ajraz10_subscribed_v1";

const STORAGE_PENDING =
  "ajraz10_pending_email_v1";

const STORAGE_DISMISSED =
  "ajraz10_dismissed_at_v1";

const DISMISS_COOLDOWN_MS =
  12 * 60 * 60 * 1000;

const ORIGINAL_BOOK_PRICE = 15990;
const DISCOUNT_AMOUNT = 1599;
const DISCOUNTED_BOOK_PRICE = 14391;

let appliedPromo = null;
let originalFetch = null;

function chileClockKey(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Santiago",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ]
      )
    );

  return Number(
    `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`
  );
}

function campaignActive() {
  const key =
    chileClockKey();

  return (
    key >= 20260824000000 &&
    key <= 20260930235959
  );
}

function previewEnabled() {
  return (
    new URLSearchParams(
      window.location.search
    ).get(
      "ajraz10_preview"
    ) === "1"
  );
}

function formatCLP(value) {
  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function safeStorageSet(
  key,
  value
) {
  try {
    localStorage.setItem(
      key,
      String(value)
    );

    return true;
  } catch {
    return false;
  }
}

function safeStorageRemove(
  key
) {
  try {
    localStorage.removeItem(
      key
    );

    return true;
  } catch {
    return false;
  }
}

function markPromoPending(
  email
) {
  safeStorageSet(
    STORAGE_PENDING,
    email
  );
}

function markPromoActive(
  email
) {
  safeStorageRemove(
    STORAGE_PENDING
  );

  safeStorageSet(
    STORAGE_SUBSCRIBED,
    email
  );
}

function isPendingVerification(
  result
) {
  return Boolean(
    result?.pendingVerification ===
      true ||
      result?.verificationRequired ===
        true ||
      result?.status ===
        "pending" ||
      result?.entitlementStatus ===
        "pending"
  );
}

async function requestPromoAccess({
  name,
  email,
  consent,
  website = "",
}) {
  const response =
    await fetch(
      "/api/ajraz10-subscribe",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          name,
          email,
          consent,
          website,
        }),
      }
    );

  const result =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      result?.error ||
        "No pudimos solicitar el acceso."
    );
  }

  return result;
}

function closePopup(
  remember = true
) {
  const overlay =
    document.getElementById(
      "ajraz10-overlay"
    );

  if (overlay) {
    overlay.remove();
  }

  if (
    remember &&
    !previewEnabled()
  ) {
    safeStorageSet(
      STORAGE_DISMISSED,
      Date.now()
    );
  }
}

function bindPopupClose(
  overlay,
  remember = false
) {
  overlay
    ?.querySelector(
      ".ajraz10-close"
    )
    ?.addEventListener(
      "click",
      () =>
        closePopup(
          remember
        )
    );
}

function renderPendingPopup(
  overlay,
  result,
  fallbackEmail
) {
  const email =
    String(
      result?.email ||
        fallbackEmail ||
        ""
    );

  markPromoPending(
    email
  );

  const modal =
    overlay.querySelector(
      ".ajraz10-modal"
    );

  if (!modal) {
    return;
  }

  modal.innerHTML = `
    <button
      class="ajraz10-close"
      type="button"
      aria-label="Cerrar"
    >
      ×
    </button>

    <div class="ajraz10-eyebrow">
      ARCHIVO 066 · VERIFICACIÓN REQUERIDA
    </div>

    <div class="ajraz10-code-mark">
      CONFIRMACIÓN PENDIENTE
    </div>

    <h2>
      REVISA TU CORREO
    </h2>

    <p class="ajraz10-lead">
      Enviamos un enlace de confirmación a
      <strong>${email}</strong>.
      <br><br>
      El 10% todavía
      <strong>no está activo</strong>.
      Debes abrir el mensaje y confirmar
      que ese correo te pertenece.
    </p>

    <button
      class="ajraz10-go-buy"
      type="button"
    >
      VOLVER A LA COMPRA
    </button>

    <p class="ajraz10-terms">
      El enlace de verificación vence en
      24 horas. Sin confirmación del correo,
      AJRAZ10 no puede utilizarse.
    </p>
  `;

  bindPopupClose(
    overlay,
    false
  );

  modal
    .querySelector(
      ".ajraz10-go-buy"
    )
    ?.addEventListener(
      "click",
      () => {
        closePopup(
          false
        );

        document
          .getElementById(
            "compra-directa"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      }
    );
}

function renderGrantedPopup(
  overlay,
  result,
  fallbackEmail
) {
  const email =
    String(
      result?.email ||
        fallbackEmail ||
        ""
    );

  markPromoActive(
    email
  );

  const modal =
    overlay.querySelector(
      ".ajraz10-modal"
    );

  if (!modal) {
    return;
  }

  modal.innerHTML = `
    <button
      class="ajraz10-close"
      type="button"
      aria-label="Cerrar"
    >
      ×
    </button>

    <div class="ajraz10-eyebrow">
      ARCHIVO 066 · AUTORIZACIÓN COMPLETADA
    </div>

    <div class="ajraz10-code-mark">
      CÓDIGO ENVIADO
    </div>

    <h2>
      ACCESO CONCEDIDO
    </h2>

    <p class="ajraz10-lead">
      El beneficio del 10% quedó asociado a
      <strong>${email}</strong>.
      Te enviamos el código y las instrucciones
      a ese correo.
    </p>

    <button
      class="ajraz10-go-buy"
      type="button"
    >
      IR A COMPRAR
    </button>
  `;

  bindPopupClose(
    overlay,
    false
  );

  modal
    .querySelector(
      ".ajraz10-go-buy"
    )
    ?.addEventListener(
      "click",
      () => {
        closePopup(
          false
        );

        document
          .getElementById(
            "compra-directa"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      }
    );
}

function showPopup() {
  if (
    document.getElementById(
      "ajraz10-overlay"
    )
  ) {
    return;
  }

  if (
    !campaignActive() &&
    !previewEnabled()
  ) {
    return;
  }

  if (
    localStorage.getItem(
      STORAGE_SUBSCRIBED
    ) &&
    !previewEnabled()
  ) {
    return;
  }

  const dismissed =
    Number(
      localStorage.getItem(
        STORAGE_DISMISSED
      ) || 0
    );

  if (
    !previewEnabled() &&
    dismissed &&
    Date.now() -
      dismissed <
      DISMISS_COOLDOWN_MS
  ) {
    return;
  }

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "ajraz10-overlay";

  overlay.className =
    "ajraz10-overlay";

  overlay.innerHTML = `
    <section
      class="ajraz10-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ajraz10-title"
    >
      <button
        class="ajraz10-close"
        type="button"
        aria-label="Cerrar"
      >
        ×
      </button>

      <div class="ajraz10-eyebrow">
        ARCHIVO 066 · ACCESO ESPECIAL
      </div>

      <div class="ajraz10-code-mark">
        BENEFICIO PRIVADO
      </div>

      <h2 id="ajraz10-title">
        DESBLOQUEA UN 10%
      </h2>

      <p class="ajraz10-lead">
        Regístrate en el Archivo 066.
        Para proteger el beneficio,
        enviaremos un enlace a tu correo
        para confirmar que la dirección
        realmente te pertenece.
      </p>

      <form id="ajraz10-form">
        <input
          class="ajraz10-honeypot"
          name="website"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        >

        <label>
          <span>
            Nombre
            <small>
              (opcional)
            </small>
          </span>

          <input
            name="name"
            type="text"
            autocomplete="name"
            maxlength="80"
          >
        </label>

        <label>
          <span>
            Correo electrónico
          </span>

          <input
            name="email"
            type="email"
            autocomplete="email"
            required
          >
        </label>

        <label
          class="ajraz10-consent"
        >
          <input
            name="consent"
            type="checkbox"
            required
          >

          <span>
            Acepto recibir comunicaciones del
            Archivo 066 y esta promoción por
            correo.
          </span>
        </label>

        <button
          type="submit"
        >
          SOLICITAR MI 10%
        </button>

        <p
          class="ajraz10-form-status"
          aria-live="polite"
        ></p>
      </form>

      <p class="ajraz10-terms">
        El beneficio solo se activa después
        de confirmar el correo.
        Válido hasta el 30 de septiembre de
        2026. Despacho no incluido en el
        descuento.
      </p>
    </section>
  `;

  document.body.appendChild(
    overlay
  );

  bindPopupClose(
    overlay,
    true
  );

  overlay.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        overlay
      ) {
        closePopup(
          true
        );
      }
    }
  );

  const form =
    overlay.querySelector(
      "#ajraz10-form"
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const status =
        form.querySelector(
          ".ajraz10-form-status"
        );

      const button =
        form.querySelector(
          'button[type="submit"]'
        );

      const data =
        new FormData(
          form
        );

      button.disabled =
        true;

      status.className =
        "ajraz10-form-status";

      status.textContent =
        "Enviando verificación…";

      const submittedEmail =
        String(
          data.get(
            "email"
          ) || ""
        )
          .trim()
          .toLowerCase();

      try {
        const result =
          await requestPromoAccess({
            name:
              String(
                data.get(
                  "name"
                ) || ""
              ),

            email:
              submittedEmail,

            consent:
              data.get(
                "consent"
              ) === "on",

            website:
              String(
                data.get(
                  "website"
                ) || ""
              ),
          });

        if (
          isPendingVerification(
            result
          )
        ) {
          renderPendingPopup(
            overlay,
            result,
            submittedEmail
          );

          return;
        }

        /*
         * Compatibilidad temporal:
         * mientras el backend antiguo siga
         * desplegado, puede devolver una
         * autorización inmediata.
         *
         * Cuando instalemos el backend de
         * double opt-in, esta rama dejará
         * de usarse para solicitudes nuevas.
         */
        renderGrantedPopup(
          overlay,
          result,
          submittedEmail
        );
      } catch (error) {
        status.className =
          "ajraz10-form-status is-error";

        status.textContent =
          error?.message ||
          "No pudimos solicitar el acceso.";

        button.disabled =
          false;
      }
    }
  );
}

function schedulePopupAfterIntro() {
  if (
    window.location.pathname !==
    "/"
  ) {
    return;
  }

  let attempts = 0;

  const timer =
    setInterval(
      () => {
        attempts += 1;

        const intro =
          document.querySelector(
            ".intro"
          );

        const site =
          document.querySelector(
            ".site"
          );

        if (
          !intro &&
          site
        ) {
          clearInterval(
            timer
          );

          setTimeout(
            showPopup,
            2800
          );
        } else if (
          attempts > 120
        ) {
          clearInterval(
            timer
          );
        }
      },
      500
    );
}

function getCheckoutNameInput() {
  return document.querySelector(
    '#compra-directa .sale-form input[autocomplete="name"]'
  );
}

function getCheckoutEmailInput() {
  return document.querySelector(
    '#compra-directa .sale-form input[type="email"]'
  );
}

function getCheckoutRegionSelect() {
  return document.querySelector(
    "#compra-directa .sale-form select"
  );
}

async function validatePromoEntitlement(
  email,
  code
) {
  const response =
    await fetch(
      "/api/ajraz10-validate",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            email,
            code,
          }),
      }
    );

  const result =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      result?.error ||
        "Código no autorizado."
    );
  }

  return result;
}

function activatePromo(
  result,
  email
) {
  appliedPromo = {
    code:
      result.code,

    email,

    discountAmount:
      result.discountAmount,

    discountedBookPrice:
      result.discountedBookPrice,
  };

  markPromoActive(
    email
  );

  applyPromoToSummary();
}

function injectCheckoutPromo() {
  if (
    !campaignActive() &&
    !previewEnabled()
  ) {
    return;
  }

  const form =
    document.querySelector(
      "#compra-directa .sale-form"
    );

  if (
    !form ||
    form.querySelector(
      "#ajraz10-checkout"
    )
  ) {
    return;
  }

  const shippingNote =
    form.querySelector(
      ".sale-shipping-note"
    );

  if (!shippingNote) {
    return;
  }

  const block =
    document.createElement(
      "div"
    );

  block.id =
    "ajraz10-checkout";

  block.className =
    "ajraz10-checkout";

  block.innerHTML = `
    <div
      class="ajraz10-checkout-label"
    >
      ¿Tienes un código de acceso?
    </div>

    <div
      class="ajraz10-checkout-row"
    >
      <input
        id="ajraz10-code-input"
        type="text"
        maxlength="24"
        autocomplete="off"
        placeholder="Ingresa tu código"
        aria-label="Código de acceso"
      >

      <button
        id="ajraz10-apply"
        type="button"
      >
        APLICAR
      </button>
    </div>

    <p
      id="ajraz10-checkout-status"
      aria-live="polite"
    >
      Los códigos privados se validan con
      el correo confirmado utilizado en
      la compra.
    </p>

    <div
      class="ajraz10-unlock"
    >
      <p
        class="ajraz10-unlock-copy"
      >
        <span
          class="ajraz10-unlock-title"
        >
          ¿AÚN NO TIENES UN CÓDIGO?
        </span>

        <span
          class="ajraz10-unlock-text"
        >
          Regístrate gratis en
          <strong>
            Archivo 066
          </strong>
          y solicita tu
          <strong>
            10% de descuento
          </strong>
          para esta compra.
        </span>
      </p>

      <div
        class="ajraz10-inline-panel"
      >
        <p
          class="ajraz10-inline-note"
        >
          Usaremos el
          <strong>
            nombre y correo
          </strong>
          que ingresaste arriba.
          Te enviaremos un enlace de
          confirmación. El descuento
          solo se activa después de
          confirmar tu correo.
        </p>

        <label
          class="ajraz10-inline-consent"
        >
          <input
            id="ajraz10-inline-consent"
            type="checkbox"
          >

          <span>
            Acepto recibir comunicaciones del
            Archivo 066 y esta promoción por
            correo.
          </span>
        </label>

        <button
          id="ajraz10-inline-submit"
          class="ajraz10-inline-submit"
          type="button"
        >
          OBTENER MI CÓDIGO
        </button>

        <p
          id="ajraz10-inline-status"
          class="ajraz10-inline-status"
          aria-live="polite"
        ></p>
      </div>
    </div>
  `;

  form.insertBefore(
    block,
    shippingNote
  );

  const codeInput =
    block.querySelector(
      "#ajraz10-code-input"
    );

  const apply =
    block.querySelector(
      "#ajraz10-apply"
    );

  const status =
    block.querySelector(
      "#ajraz10-checkout-status"
    );

  const consent =
    block.querySelector(
      "#ajraz10-inline-consent"
    );

  const unlockButton =
    block.querySelector(
      "#ajraz10-inline-submit"
    );

  const unlockStatus =
    block.querySelector(
      "#ajraz10-inline-status"
    );

  const emailInput =
    getCheckoutEmailInput();

  const nameInput =
    getCheckoutNameInput();

  if (
    !codeInput ||
    !apply ||
    !status ||
    !consent ||
    !unlockButton ||
    !unlockStatus
  ) {
    return;
  }

  codeInput.addEventListener(
    "input",
    () => {
      codeInput.value =
        codeInput.value
          .toUpperCase()
          .replace(
            /\s+/g,
            ""
          );

      appliedPromo =
        null;

      status.className =
        "";

      status.textContent =
        "Los códigos privados se validan con el correo confirmado utilizado en la compra.";

      restoreSummary();
    }
  );

  emailInput?.addEventListener(
    "input",
    () => {
      const currentEmail =
        emailInput.value
          .trim()
          .toLowerCase();

      if (
        appliedPromo &&
        currentEmail !==
          appliedPromo.email
      ) {
        appliedPromo =
          null;

        status.className =
          "is-error";

        status.textContent =
          "El correo cambió. Vuelve a aplicar el código.";

        unlockStatus.className =
          "ajraz10-inline-status is-error";

        unlockStatus.textContent =
          "El beneficio estaba asociado al correo anterior.";

        restoreSummary();
      }
    }
  );

  apply.addEventListener(
    "click",
    async () => {
      const email =
        emailInput?.value
          .trim()
          .toLowerCase() ||
        "";

      const code =
        codeInput.value
          .trim()
          .toUpperCase();

      if (!email) {
        status.className =
          "is-error";

        status.textContent =
          "Ingresa primero el correo que usarás para comprar.";

        emailInput?.focus();

        return;
      }

      if (
        emailInput &&
        !emailInput.checkValidity()
      ) {
        emailInput.reportValidity();

        return;
      }

      if (!code) {
        status.className =
          "is-error";

        status.textContent =
          "Ingresa tu código de acceso.";

        codeInput.focus();

        return;
      }

      apply.disabled =
        true;

      status.className =
        "";

      status.textContent =
        "Validando acceso…";

      try {
        const result =
          await validatePromoEntitlement(
            email,
            code
          );

        activatePromo(
          result,
          email
        );

        status.className =
          "is-success";

        status.textContent =
          "✓ CORREO CONFIRMADO · 10% aplicado al precio del libro.";

        unlockStatus.className =
          "ajraz10-inline-status is-success";

        unlockStatus.textContent =
          "✓ BENEFICIO ACTIVO. Puedes continuar con la compra.";
      } catch (error) {
        appliedPromo =
          null;

        status.className =
          "is-error";

        status.textContent =
          error?.message ||
          "Código no autorizado.";

        restoreSummary();
      } finally {
        apply.disabled =
          false;
      }
    }
  );

  unlockButton.addEventListener(
    "click",
    async () => {
      const email =
        emailInput?.value
          .trim()
          .toLowerCase() ||
        "";

      const name =
        nameInput?.value
          .trim() ||
        "";

      unlockStatus.className =
        "ajraz10-inline-status";

      if (!email) {
        unlockStatus.className =
          "ajraz10-inline-status is-error";

        unlockStatus.textContent =
          "Ingresa primero tu correo electrónico arriba.";

        emailInput?.focus();

        return;
      }

      if (
        emailInput &&
        !emailInput.checkValidity()
      ) {
        unlockStatus.className =
          "ajraz10-inline-status is-error";

        unlockStatus.textContent =
          "Revisa que el correo electrónico sea válido.";

        emailInput.reportValidity();

        return;
      }

      if (!consent.checked) {
        unlockStatus.className =
          "ajraz10-inline-status is-error";

        unlockStatus.textContent =
          "Debes aceptar recibir las comunicaciones para solicitar el beneficio.";

        consent.focus();

        return;
      }

      unlockButton.disabled =
        true;

      unlockButton.textContent =
        "ENVIANDO…";

      unlockStatus.className =
        "ajraz10-inline-status";

      unlockStatus.textContent =
        "Preparando la verificación de tu correo…";

      try {
        const subscribeResult =
          await requestPromoAccess({
            name,
            email,
            consent: true,
            website: "",
          });

        /*
         * NUEVO FLUJO SEGURO:
         * solicitud guardada como PENDING.
         *
         * No ponemos AJRAZ10 en el campo.
         * No llamamos a validate.
         * No mostramos descuento.
         */
        if (
          isPendingVerification(
            subscribeResult
          )
        ) {
          appliedPromo =
            null;

          restoreSummary();

          codeInput.value =
            "";

          markPromoPending(
            subscribeResult
              ?.email ||
              email
          );

          status.className =
            "";

          status.textContent =
            "El descuento aún no está activo. Confirma primero tu correo.";

          unlockStatus.className =
            "ajraz10-inline-status is-success";

          unlockStatus.textContent =
            "✓ CORREO ENVIADO. Abre el mensaje y pulsa “CONFIRMAR MI CORREO”. Recién entonces AJRAZ10 quedará habilitado.";

          unlockButton.textContent =
            "REVISA TU CORREO";

          unlockButton.disabled =
            true;

          consent.disabled =
            true;

          return;
        }

        /*
         * COMPATIBILIDAD TEMPORAL:
         * backend antiguo.
         *
         * Esta rama desaparecerá de uso
         * para nuevas solicitudes apenas
         * despleguemos double opt-in.
         */
        const promoCode =
          String(
            subscribeResult
              ?.code ||
              "AJRAZ10"
          )
            .trim()
            .toUpperCase();

        codeInput.value =
          promoCode;

        unlockStatus.textContent =
          "Código concedido. Validando beneficio…";

        const validationResult =
          await validatePromoEntitlement(
            email,
            promoCode
          );

        activatePromo(
          validationResult,
          email
        );

        status.className =
          "is-success";

        status.textContent =
          "✓ ACCESO AUTORIZADO · 10% aplicado al precio del libro.";

        unlockStatus.className =
          "ajraz10-inline-status is-success";

        unlockStatus.textContent =
          "✓ ACCESO CONCEDIDO · 10% APLICADO.";

        unlockButton.textContent =
          "CÓDIGO ACTIVADO";

        consent.disabled =
          true;

        unlockButton.disabled =
          true;
      } catch (error) {
        appliedPromo =
          null;

        restoreSummary();

        unlockStatus.className =
          "ajraz10-inline-status is-error";

        unlockStatus.textContent =
          error?.message ||
          "No pudimos solicitar el beneficio en este momento.";

        unlockButton.disabled =
          false;

        unlockButton.textContent =
          "OBTENER MI CÓDIGO";
      }
    }
  );
}

function restoreSummary() {
  const summary =
    document.querySelector(
      "#compra-directa .sale-summary"
    );

  if (!summary) {
    return;
  }

  summary
    .querySelector(
      ".ajraz10-summary-discount"
    )
    ?.remove();

  const rows =
    summary.querySelectorAll(
      ":scope > div"
    );

  if (
    rows[0]?.querySelector(
      "strong"
    )
  ) {
    rows[0]
      .querySelector(
        "strong"
      )
      .textContent =
      formatCLP(
        ORIGINAL_BOOK_PRICE
      );
  }

  const region =
    getCheckoutRegionSelect()
      ?.value ||
    "RM";

  const shipping =
    region === "RM"
      ? 3000
      : 4500;

  /*
   * Estructura actual sin descuento:
   * 0 Libro
   * 1 Envío
   * 2 Total
   */
  const total =
    summary.querySelector(
      ".sale-total strong"
    );

  if (total) {
    total.textContent =
      formatCLP(
        ORIGINAL_BOOK_PRICE +
          shipping
      );
  }
}

function applyPromoToSummary() {
  if (!appliedPromo) {
    return;
  }

  const summary =
    document.querySelector(
      "#compra-directa .sale-summary"
    );

  if (!summary) {
    return;
  }

  const rows =
    summary.querySelectorAll(
      ":scope > div"
    );

  const region =
    getCheckoutRegionSelect()
      ?.value ||
    "RM";

  const shipping =
    region === "RM"
      ? 3000
      : 4500;

  if (
    rows[0]?.querySelector(
      "strong"
    )
  ) {
    rows[0]
      .querySelector(
        "strong"
      )
      .textContent =
      formatCLP(
        ORIGINAL_BOOK_PRICE
      );
  }

  let discountRow =
    summary.querySelector(
      ".ajraz10-summary-discount"
    );

  if (!discountRow) {
    discountRow =
      document.createElement(
        "div"
      );

    discountRow.className =
      "ajraz10-summary-discount";

    discountRow.innerHTML = `
      <span>
        Descuento promocional
      </span>

      <strong>
        −${formatCLP(
          DISCOUNT_AMOUNT
        )}
      </strong>
    `;

    const totalRow =
      summary.querySelector(
        ".sale-total"
      );

    summary.insertBefore(
      discountRow,
      totalRow || null
    );
  }

  const total =
    summary.querySelector(
      ".sale-total strong"
    );

  if (total) {
    total.textContent =
      formatCLP(
        DISCOUNTED_BOOK_PRICE +
          shipping
      );
  }
}

function installFetchInterceptor() {
  if (originalFetch) {
    return;
  }

  originalFetch =
    window.fetch.bind(
      window
    );

  window.fetch =
    async function ajraz10Fetch(
      input,
      init = {}
    ) {
      const rawUrl =
        typeof input ===
        "string"
          ? input
          : input?.url ||
            "";

      const isCheckout =
        rawUrl ===
          "/api/create-preference" ||
        rawUrl.endsWith(
          "/api/create-preference"
        );

      if (!isCheckout) {
        return originalFetch(
          input,
          init
        );
      }

      const codeInput =
        document.getElementById(
          "ajraz10-code-input"
        );

      const code =
        String(
          codeInput?.value ||
            ""
        )
          .trim()
          .toUpperCase();

      /*
       * Sin código:
       * checkout normal sin descuento.
       */
      if (!code) {
        return originalFetch(
          input,
          init
        );
      }

      let body = {};

      try {
        body =
          init?.body
            ? JSON.parse(
                init.body
              )
            : {};
      } catch {
        body = {};
      }

      body.promoCode =
        code;

      /*
       * Con código:
       * el servidor promocional será
       * responsable de verificar también
       * que el correo haya sido confirmado.
       *
       * Nunca confiamos únicamente en
       * el descuento visual del navegador.
       */
      return originalFetch(
        "/api/create-promo-preference",
        {
          ...init,

          body:
            JSON.stringify(
              body
            ),
        }
      );
    };
}

function maintainPromoUI() {
  const observer =
    new MutationObserver(
      () => {
        injectCheckoutPromo();

        if (
          appliedPromo
        ) {
          requestAnimationFrame(
            applyPromoToSummary
          );
        }
      }
    );

  observer.observe(
    document.documentElement,
    {
      subtree: true,
      childList: true,
      characterData: true,
    }
  );

  injectCheckoutPromo();

  document.addEventListener(
    "change",
    (event) => {
      if (
        event.target ===
          getCheckoutRegionSelect() &&
        appliedPromo
      ) {
        requestAnimationFrame(
          applyPromoToSummary
        );
      }
    }
  );
}

if (
  typeof window !==
  "undefined"
) {
  installFetchInterceptor();

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        maintainPromoUI();
        schedulePopupAfterIntro();
      },
      {
        once: true,
      }
    );
  } else {
    maintainPromoUI();
    schedulePopupAfterIntro();
  }
}
