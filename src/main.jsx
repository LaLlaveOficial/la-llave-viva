import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./ajraz10.css";
import "./attribution.js";
import "./ajraz10.js";

const DIRECT_PURCHASE_HASH =
  "#compra-directa";

const DEDICATED_PURCHASE_PATH =
  "/comprar";

const DIRECT_PURCHASE_CLASS =
  "llave-direct-purchase-entry";

const DEDICATED_PURCHASE_CLASS =
  "llave-dedicated-purchase";

const PURCHASE_STYLE_ID =
  "llave-purchase-entry-style";

function normalizePath(pathname) {
  const normalized =
    String(pathname || "/")
      .replace(/\/+$/, "");

  return normalized || "/";
}

function ensurePurchaseStyle() {
  if (
    document.getElementById(
      PURCHASE_STYLE_ID
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    PURCHASE_STYLE_ID;

  style.textContent = `
    /*
     * Entrada directa antigua:
     * /#compra-directa
     *
     * Conservamos el comportamiento
     * existente: elimina solamente
     * la pantalla inicial y baja al
     * checkout.
     */
    html.${DIRECT_PURCHASE_CLASS} .intro {
      display: none !important;
      pointer-events: none !important;
    }

    /*
     * Landing dedicada:
     * /comprar
     *
     * Aquí eliminamos cualquier
     * fricción y dejamos únicamente
     * el checkout existente.
     */
    html.${DEDICATED_PURCHASE_CLASS},
    html.${DEDICATED_PURCHASE_CLASS} body {
      margin: 0 !important;
      min-height: 100% !important;
      background: #020303 !important;
    }

    html.${DEDICATED_PURCHASE_CLASS} {
      scroll-behavior: auto !important;
    }

    html.${DEDICATED_PURCHASE_CLASS} body {
      overflow-x: hidden !important;
    }

    html.${DEDICATED_PURCHASE_CLASS} .site {
      min-height: 100svh !important;
      background: #020303 !important;
      overflow: visible !important;
    }

    /*
     * Ocultamos todos los bloques
     * principales de la experiencia
     * narrativa.
     *
     * El checkout se vuelve a mostrar
     * inmediatamente después.
     */
    html.${DEDICATED_PURCHASE_CLASS} .site > * {
      display: none !important;
    }

    html.${DEDICATED_PURCHASE_CLASS}
      .site > #compra-directa {
      display: grid !important;
      width: min(
        1360px,
        calc(100% - 48px)
      ) !important;
      min-height: 100svh !important;
      margin: 0 auto !important;
      scroll-margin-top: 0 !important;
      position: relative !important;
      z-index: 10 !important;
    }

    /*
     * Conservamos el diseño responsive
     * original del checkout.
     */
    @media (max-width: 1220px) {
      html.${DEDICATED_PURCHASE_CLASS}
        .site > #compra-directa {
        grid-template-columns:
          1fr !important;
      }
    }

    @media (max-width: 720px) {
      html.${DEDICATED_PURCHASE_CLASS}
        .site > #compra-directa {
        width:
          calc(100% - 24px)
          !important;

        margin:
          0 auto
          !important;

        min-height:
          100svh
          !important;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}

function isDedicatedPurchasePath() {
  return (
    normalizePath(
      window.location.pathname
    ) ===
    DEDICATED_PURCHASE_PATH
  );
}

function capturePurchaseIntent() {
  const dedicated =
    isDedicatedPurchasePath();

  const hashEntry =
    window.location.hash ===
    DIRECT_PURCHASE_HASH;

  document.documentElement
    .classList.toggle(
      DEDICATED_PURCHASE_CLASS,
      dedicated
    );

  document.documentElement
    .classList.toggle(
      DIRECT_PURCHASE_CLASS,
      !dedicated &&
        hashEntry
    );

  return {
    dedicated,
    hashEntry,
  };
}

function getPurchaseTarget() {
  return document.getElementById(
    "compra-directa"
  );
}

function positionDedicatedPurchase() {
  if (
    !document.documentElement
      .classList.contains(
        DEDICATED_PURCHASE_CLASS
      )
  ) {
    return false;
  }

  const target =
    getPurchaseTarget();

  if (!target) {
    return false;
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });

  return true;
}

function scrollToHashPurchase() {
  if (
    !document.documentElement
      .classList.contains(
        DIRECT_PURCHASE_CLASS
      )
  ) {
    return false;
  }

  const target =
    getPurchaseTarget();

  if (!target) {
    return false;
  }

  target.scrollIntoView({
    behavior: "auto",
    block: "start",
  });

  return true;
}

function stabilizePurchaseLanding(
  dedicated
) {
  const attempts = [
    0,
    80,
    220,
    500,
    900,
    1500,
  ];

  attempts.forEach(
    (delay) => {
      window.setTimeout(
        () => {
          if (dedicated) {
            positionDedicatedPurchase();
          } else {
            scrollToHashPurchase();
          }
        },
        delay
      );
    }
  );
}

ensurePurchaseStyle();

const purchaseIntent =
  capturePurchaseIntent();

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (
  purchaseIntent.dedicated
) {
  stabilizePurchaseLanding(
    true
  );
} else if (
  purchaseIntent.hashEntry
) {
  stabilizePurchaseLanding(
    false
  );
}

window.addEventListener(
  "hashchange",
  () => {
    const intent =
      capturePurchaseIntent();

    if (
      intent.dedicated
    ) {
      stabilizePurchaseLanding(
        true
      );

      return;
    }

    if (
      intent.hashEntry
    ) {
      stabilizePurchaseLanding(
        false
      );
    }
  }
);
