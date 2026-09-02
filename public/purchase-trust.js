(() => {
  const SCRIPT_FLAG =
    "__laLlavePurchaseTrust";

  const TRUST_ID =
    "purchase-trust-066";

  const STYLE_ID =
    "purchase-trust-066-styles";

  if (window[SCRIPT_FLAG]) {
    return;
  }

  window[SCRIPT_FLAG] = true;

  function injectStyles() {
    if (
      document.getElementById(
        STYLE_ID
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id = STYLE_ID;

    style.textContent = `
      #${TRUST_ID} {
        width: 100%;
        margin-top: 30px;
        padding: 22px 24px;
        border: 1px solid rgba(241, 193, 90, 0.22);
        background:
          linear-gradient(
            180deg,
            rgba(241, 193, 90, 0.045),
            rgba(0, 0, 0, 0.20)
          );
        color: rgba(243, 239, 228, 0.78);
        text-align: left;
      }

      #${TRUST_ID} .pt-title {
        margin: 0 0 18px;
        color: #f1c15a;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      #${TRUST_ID} .pt-grid {
        display: grid;
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
        gap: 14px 24px;
      }

      #${TRUST_ID} .pt-item {
        display: grid;
        grid-template-columns:
          24px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }

      #${TRUST_ID} .pt-icon {
        display: block;
        padding-top: 1px;
        color: #f1c15a;
        font-size: 16px;
        line-height: 1.4;
        text-align: center;
      }

      #${TRUST_ID} .pt-copy {
        margin: 0;
        color: rgba(
          243,
          239,
          228,
          0.70
        );
        font-size: 13px;
        line-height: 1.55;
      }

      #${TRUST_ID} .pt-copy strong {
        color: #f3efe4;
        font-weight: 850;
      }

      #${TRUST_ID} .pt-note {
        margin:
          18px 0 0;
        padding-top: 16px;
        border-top:
          1px solid
          rgba(
            241,
            193,
            90,
            0.14
          );
        color:
          rgba(
            243,
            239,
            228,
            0.48
          );
        font-size: 11px;
        line-height: 1.55;
      }

      #${TRUST_ID} a {
        color: #f1c15a;
        text-decoration: none;
      }

      #${TRUST_ID} a:hover,
      #${TRUST_ID} a:focus-visible {
        text-decoration: underline;
        text-underline-offset: 3px;
        outline: none;
      }

      @media (
        max-width: 720px
      ) {
        #${TRUST_ID} {
          margin-top: 24px;
          padding: 20px 18px;
        }

        #${TRUST_ID}
          .pt-grid {
          grid-template-columns:
            1fr;
          gap: 14px;
        }

        #${TRUST_ID}
          .pt-title {
          text-align: center;
          font-size: 11px;
        }

        #${TRUST_ID}
          .pt-copy {
          font-size: 13px;
        }

        #${TRUST_ID}
          .pt-note {
          text-align: center;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function buildTrustBlock() {
    if (
      document.getElementById(
        TRUST_ID
      )
    ) {
      return true;
    }

    const saleContent =
      document.querySelector(
        "#compra-directa .sale-content"
      );

    if (!saleContent) {
      return false;
    }

    const block =
      document.createElement(
        "aside"
      );

    block.id = TRUST_ID;

    block.setAttribute(
      "aria-label",
      "Despacho y compra segura"
    );

    block.innerHTML = `
      <p class="pt-title">
        COMPRA SEGURA · DESPACHO CHILE
      </p>

      <div class="pt-grid">
        <div class="pt-item">
          <span
            class="pt-icon"
            aria-hidden="true"
          >
            🔒
          </span>

          <p class="pt-copy">
            <strong>
              Pago seguro
            </strong><br />
            Pago procesado mediante
            Mercado Pago.
          </p>
        </div>

        <div class="pt-item">
          <span
            class="pt-icon"
            aria-hidden="true"
          >
            🚚
          </span>

          <p class="pt-copy">
            <strong>
              Región Metropolitana
            </strong><br />
            Entrega estimada de
            1 a 4 días hábiles.
          </p>
        </div>

        <div class="pt-item">
          <span
            class="pt-icon"
            aria-hidden="true"
          >
            📦
          </span>

          <p class="pt-copy">
            <strong>
              Otras regiones
            </strong><br />
            Entrega estimada de
            3 a 9 días hábiles.
          </p>
        </div>

        <div class="pt-item">
          <span
            class="pt-icon"
            aria-hidden="true"
          >
            📍
          </span>

          <p class="pt-copy">
            <strong>
              Seguimiento
            </strong><br />
            Recibirás información
            de seguimiento cuando
            tu pedido sea despachado.
          </p>
        </div>
      </div>

      <p class="pt-note">
        Plazos estimados desde la
        confirmación del pago.
        Despachos mediante
        Blue Express u operadores
        logísticos asociados,
        según cobertura y operación.
        Zonas rurales o extremas
        pueden requerir plazo
        adicional.
        Tus derechos de garantía
        y retracto se rigen por la
        normativa chilena vigente.
        Consultas:
        <a
          href="mailto:contacto@lallaveoficial.com"
        >
          contacto@lallaveoficial.com
        </a>
      </p>
    `;

    saleContent.appendChild(
      block
    );

    return true;
  }

  function start() {
    injectStyles();

    if (
      buildTrustBlock()
    ) {
      return;
    }

    const observer =
      new MutationObserver(
        () => {
          if (
            buildTrustBlock()
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
