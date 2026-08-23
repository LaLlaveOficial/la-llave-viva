(() => {
  const STYLE_ID = "la-llave-mobile-polish";

  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 720px) {
      /*
       * Pulido móvil:
       * El control de atmósfera conserva toda su función,
       * pero deja de ocupar casi todo el ancho de la pantalla.
       * Los deslizadores siguen disponibles en escritorio.
       */
      .site .audio-top {
        left: auto !important;
        right: 12px !important;
        top: auto !important;
        bottom: 12px !important;
        width: auto !important;
        max-width: calc(100vw - 24px) !important;
        display: block !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        z-index: 40 !important;
      }

      .site .audio-top label {
        display: none !important;
      }

      .site .audio-top button {
        position: relative;
        min-height: 44px;
        padding: 0 16px 0 38px;
        border: 1px solid rgba(241, 193, 90, 0.34);
        border-radius: 999px;
        color: #f1c15a;
        background: rgba(3, 4, 4, 0.88);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        box-shadow:
          0 12px 34px rgba(0, 0, 0, 0.48),
          inset 0 0 0 1px rgba(255,255,255,0.02);
        font-size: 9px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: 0.11em;
        white-space: nowrap;
      }

      .site .audio-top button::before {
        content: "";
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-52%);
        color: #f1c15a;
        font-size: 15px;
        line-height: 1;
      }

      .site .audio-top button:active {
        transform: translateY(1px);
      }
    }

    @media (max-width: 390px) {
      .site .audio-top {
        right: 8px !important;
        bottom: 8px !important;
      }

      .site .audio-top button {
        min-height: 42px;
        padding-right: 13px;
        padding-left: 34px;
        font-size: 8px;
        letter-spacing: 0.09em;
      }

      .site .audio-top button::before {
        left: 13px;
        font-size: 14px;
      }
    }
  `;

  document.head.appendChild(style);
})();
