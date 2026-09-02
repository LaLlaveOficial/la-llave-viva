(() => {
  const SCRIPT_FLAG = "__laLlavePurchaseTrust";
  const TRUST_ID = "purchase-trust-066";
  const STYLE_ID = "purchase-trust-066-styles";

  if (window[SCRIPT_FLAG]) {
    return;
  }

  window[SCRIPT_FLAG] = true;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /*
       * Bloque independiente de confianza.
       * Se ubica inmediatamente después de #compra-directa.
       * No modifica formulario, checkout ni lógica de compra.
       */
      #${TRUST_ID} {
        position: relative;
        z-index: 10;
        width: min(1060px, calc(100% - 40px));
        margin: 26px auto 64px;
        padding: 24px 26px;
        border: 1px solid rgba(241, 193, 90, 0.24);
        background:
          radial-gradient(
            circle at 10% 10%,
            rgba(217, 155, 36, 0.08),
            transparent 32%
          ),
          linear-gradient(
            180deg,
            rgba(9, 9, 8, 0.96),
            rgba(2, 3, 3, 0.96)
          );
        color: rgba(243, 239, 228, 0.78);
        box-shadow: 0 22px 55px rgba(0, 0, 0, 0.28);
      }

      /*
       * /comprar oculta los demás hijos directos de .site.
       * Este override garantiza que el bloque de confianza
       * permanezca visible en la landing dedicada.
       */
      html.llave-dedicated-purchase
        .site > #${TRUST_ID} {
        display: block !important;
      }

      #${TRUST_ID} .pt-title {
        margin: 0 0 20px;
        color: #f1c15a;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        text-align: center;
      }

      #${TRUST_ID} .pt-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 16px 28px;
      }

      #${TRUST_ID} .pt-item {
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr);
        gap: 11px;
        align-items: start;
        padding: 4px 0;
      }

      #${TRUST_ID} .pt-icon {
        display: block;
        color: #f1c15a;
        font-size: 18px;
        line-height: 1.4;
        text-align: center;
      }

      #${TRUST_ID} .pt-copy {
        margin: 0;
        color: rgba(243, 239, 228, 0.70);
        font-size: 13px;
        line-height: 1.55;
      }

      #${TRUST_ID} .pt-copy strong {
        color: #f3efe4;
        font-weight: 850;
      }

      #${TRUST_ID} .pt-note {
        margin: 20px 0 0;
        padding-top: 17px;
        border-top:
          1px solid rgba(241, 193, 90, 0.15);
        color: rgba(243, 239, 228, 0.50);
        font-size: 11px;
        line-height: 1.65;
        text-align: center;
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

      @media (max-width: 720px) {
        #${TRUST_ID} {
          width: calc(100% - 40px);
          margin: 22px auto 38px;
          padding: 21px 18px;
        }

        #${TRUST_ID} .pt-title {
          margin-bottom: 18px;
          font-size: 11px;
          line-height: 1.5;
        }

        #${TRUST_ID} .pt-grid {
          grid-template-columns: 1fr;
          gap: 15px;
        }

        #${TRUST_ID} .pt-item {
          grid-template-columns: 28px minmax(0, 1fr);
        }

        #${TRUST_ID} .pt-copy {
          font-size: 13px;
        }

        #${TRUST_ID} .pt-note {
          font-size: 10.5px;
          line-height: 1.65;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createTrustBlock() {
    const block = document.createElement("aside");

    block.id = TRUST_ID;

    block.setAttribute(
      "aria-label",
      "Compra segura y despacho en Chile"
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
            Pago procesado mediante Mercado Pago.
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
            Entrega estimada de 1 a 4 días hábiles.
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
            Entrega estimada de 3 a 9 días hábiles.
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
            Recibirás información de seguimiento
            cuando tu pedido sea despachado.
          </p>
        </div>
      </div>

      <p class="pt-note">
        Plazos estimados desde la confirmación del pago.
        Despachos mediante Blue Express u operadores
        logísticos asociados, según cobertura y operación.
        Zonas rurales o extremas pueden requerir plazo
        adicional. Tus derechos de garantía y retracto
        se rigen por la normativa chilena vigente.
        Consultas:
        <a href="mailto:contacto@lallaveoficial.com">
          contacto@lallaveoficial.com
        </a>
      </p>
    `;

    return block;
  }

  function ensureTrustBlock() {
    const purchaseSection =
      document.getElementById("compra-directa");

    if (!purchaseSection) {
      return false;
    }

    let block =
      document.getElementById(TRUST_ID);

    if (!block) {
      block = createTrustBlock();
    }

    /*
     * Siempre lo dejamos inmediatamente después
     * de la sección de compra.
     */
    if (
      purchaseSection.nextElementSibling !== block
    ) {
      purchaseSection.insertAdjacentElement(
        "afterend",
        block
      );
    }

    return true;
  }

  function start() {
    injectStyles();

    ensureTrustBlock();

    /*
     * React puede actualizar el árbol de la página.
     * Este observer garantiza que, si la sección
     * externa desaparece durante una actualización,
     * vuelva a colocarse sin tocar el checkout.
     */
    let scheduled = false;

    const observer =
      new MutationObserver(() => {
        if (scheduled) {
          return;
        }

        scheduled = true;

        window.requestAnimationFrame(() => {
          scheduled = false;
          ensureTrustBlock();
        });
      });

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true,
      }
    );

    /*
     * Reintentos iniciales por si React todavía
     * no terminó de montar #compra-directa.
     */
    [250, 750, 1500, 3000].forEach(
      (delay) => {
        window.setTimeout(
          ensureTrustBlock,
          delay
        );
      }
    );
  }

  if (
    document.readyState === "loading"
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
