import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./ajraz10.css";
import "./attribution.js";
import "./ajraz10.js";

const DIRECT_PURCHASE_HASH = "#compra-directa";
const DIRECT_PURCHASE_CLASS = "llave-direct-purchase-entry";
const DIRECT_PURCHASE_STYLE_ID = "llave-direct-purchase-entry-style";

function ensureDirectPurchaseStyle() {
  if (document.getElementById(DIRECT_PURCHASE_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = DIRECT_PURCHASE_STYLE_ID;

  style.textContent = `
    html.${DIRECT_PURCHASE_CLASS} .intro {
      display: none !important;
      pointer-events: none !important;
    }
  `;

  document.head.appendChild(style);
}

function captureDirectPurchaseIntent() {
  if (window.location.hash !== DIRECT_PURCHASE_HASH) {
    return false;
  }

  document.documentElement.classList.add(DIRECT_PURCHASE_CLASS);

  return true;
}

function scrollToDirectPurchase() {
  if (
    !document.documentElement.classList.contains(
      DIRECT_PURCHASE_CLASS
    )
  ) {
    return false;
  }

  const target = document.getElementById("compra-directa");

  if (!target) {
    return false;
  }

  target.scrollIntoView({
    behavior: "auto",
    block: "start",
  });

  return true;
}

function stabilizeDirectPurchaseLanding() {
  const attempts = [0, 80, 220, 500, 900, 1500];

  attempts.forEach((delay) => {
    window.setTimeout(() => {
      scrollToDirectPurchase();
    }, delay);
  });
}

ensureDirectPurchaseStyle();

const isDirectPurchaseEntry =
  captureDirectPurchaseIntent();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (isDirectPurchaseEntry) {
  stabilizeDirectPurchaseLanding();
}

window.addEventListener("hashchange", () => {
  if (captureDirectPurchaseIntent()) {
    stabilizeDirectPurchaseLanding();
  }
});
