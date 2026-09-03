(() => {
  const SCRIPT_FLAG = "__laLlavePurchaseTrust";
  const TRUST_ID = "purchase-trust-066";
  const SALES_ID = "purchase-sales-066";
  const CHECKOUT_HEADING_ID = "purchase-checkout-heading-066";
  const STYLE_ID = "purchase-trust-066-styles";
  const PURCHASE_PATH = "/comprar";

  if (window[SCRIPT_FLAG]) {
    return;
  }

  window[SCRIPT_FLAG] = true;

  const isDedicatedPurchase = () =>
    window.location.pathname.replace(/\/+$/, "") === PURCHASE_PATH;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* =========================================================
       * LANDING COMERCIAL /COMPRAR
       * Se inyecta dentro de #compra-directa para conservar
       * intactos React, checkout y Mercado Pago.
       * ======================================================= */
      #${SALES_ID} {
        display: none;
      }

      html.llave-dedicated-purchase #${SALES_ID} {
        position: relative;
        z-index: 12;
        display: block;
        grid-column: 1 / -1;
        width: 100%;
        margin: 0 0 clamp(34px, 5vw, 66px);
        color: #f3efe4;
      }

      #${SALES_ID} * {
        box-sizing: border-box;
      }

      #${SALES_ID} .ps-hero {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 0.92fr) minmax(320px, 0.78fr);
        align-items: center;
        gap: clamp(30px, 5vw, 76px);
        min-height: 540px;
        padding: clamp(34px, 5vw, 68px);
        overflow: hidden;
        border: 1px solid rgba(241, 193, 90, 0.26);
        background:
          radial-gradient(circle at 78% 24%, rgba(217, 155, 36, 0.15), transparent 31%),
          radial-gradient(circle at 14% 88%, rgba(85, 109, 110, 0.10), transparent 34%),
          linear-gradient(135deg, rgba(10, 11, 11, 0.97), rgba(2, 3, 3, 0.94));
        box-shadow: 0 34px 90px rgba(0, 0, 0, 0.40);
      }

      #${SALES_ID} .ps-hero::after {
        content: "066";
        position: absolute;
        right: -0.04em;
        top: -0.19em;
        color: rgba(241, 193, 90, 0.026);
        font: 900 clamp(190px, 30vw, 430px)/1 Georgia, serif;
        pointer-events: none;
      }

      #${SALES_ID} .ps-copy,
      #${SALES_ID} .ps-book {
        position: relative;
        z-index: 2;
      }

      #${SALES_ID} .ps-eyebrow {
        margin: 0 0 13px;
        color: #e0a846;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      #${SALES_ID} .ps-hook {
        margin: 0;
        max-width: 760px;
        color: #f5f0e4;
        font: 800 clamp(34px, 5.3vw, 66px)/0.98 Georgia, "Times New Roman", serif;
        letter-spacing: 0.005em;
        text-transform: uppercase;
        text-wrap: balance;
      }

      #${SALES_ID} .ps-hook span {
        display: block;
        margin-top: 7px;
        color: #f1c15a;
      }

      #${SALES_ID} .ps-title {
        margin: 25px 0 0;
        color: rgba(243, 239, 228, 0.88);
        font-size: clamp(16px, 1.7vw, 20px);
        font-weight: 850;
        letter-spacing: 0.03em;
      }

      #${SALES_ID} .ps-subtitle {
        margin: 7px 0 0;
        color: rgba(243, 239, 228, 0.62);
        font-size: 13px;
        font-weight: 750;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      #${SALES_ID} .ps-lead {
        margin: 22px 0 0;
        max-width: 650px;
        color: rgba(243, 239, 228, 0.76);
        font-size: clamp(15px, 1.55vw, 18px);
        line-height: 1.72;
      }

      #${SALES_ID} .ps-price-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 18px;
        margin-top: 26px;
      }

      #${SALES_ID} .ps-price {
        color: #f3efe4;
        font-size: clamp(29px, 3vw, 38px);
        font-weight: 950;
        letter-spacing: -0.02em;
      }

      #${SALES_ID} .ps-shipping {
        color: rgba(243, 239, 228, 0.58);
        font-size: 12px;
        line-height: 1.55;
      }

      #${SALES_ID} .ps-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 26px;
      }

      #${SALES_ID} .ps-primary,
      #${SALES_ID} .ps-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 22px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        text-decoration: none;
        cursor: pointer;
        transition: transform 170ms ease, filter 170ms ease, border-color 170ms ease;
      }

      #${SALES_ID} .ps-primary {
        border: 1px solid rgba(241, 193, 90, 0.78);
        color: #171109;
        background: linear-gradient(180deg, #f0c264, #b97a1b);
        box-shadow: 0 14px 42px rgba(217, 155, 36, 0.20);
      }

      #${SALES_ID} .ps-secondary {
        border: 1px solid rgba(243, 239, 228, 0.20);
        color: rgba(243, 239, 228, 0.80);
        background: rgba(255, 255, 255, 0.025);
      }

      #${SALES_ID} .ps-primary:hover,
      #${SALES_ID} .ps-primary:focus-visible,
      #${SALES_ID} .ps-secondary:hover,
      #${SALES_ID} .ps-secondary:focus-visible {
        transform: translateY(-2px);
        filter: brightness(1.06);
        outline: none;
      }

      #${SALES_ID} .ps-microtrust {
        margin: 14px 0 0;
        color: rgba(243, 239, 228, 0.48);
        font-size: 11px;
        line-height: 1.6;
      }

      #${SALES_ID} .ps-book {
        display: grid;
        place-items: center;
        min-height: 390px;
      }

      #${SALES_ID} .ps-book img {
        display: block;
        width: min(400px, 86%);
        max-height: 480px;
        object-fit: contain;
        filter: drop-shadow(28px 34px 32px rgba(0, 0, 0, 0.58));
      }

      #${SALES_ID} .ps-story {
        display: grid;
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        gap: clamp(28px, 5vw, 70px);
        margin-top: clamp(28px, 4vw, 50px);
        padding: clamp(30px, 4.4vw, 54px);
        border: 1px solid rgba(241, 193, 90, 0.16);
        background: rgba(4, 5, 5, 0.86);
      }

      #${SALES_ID} .ps-story h3,
      #${SALES_ID} .ps-fit h3,
      #${SALES_ID} .ps-sample h3 {
        margin: 0;
        color: #f3efe4;
        font: 800 clamp(25px, 3.2vw, 40px)/1.08 Georgia, "Times New Roman", serif;
        text-transform: uppercase;
        text-wrap: balance;
      }

      #${SALES_ID} .ps-story h3 span {
        color: #f1c15a;
      }

      #${SALES_ID} .ps-story p {
        margin: 17px 0 0;
        color: rgba(243, 239, 228, 0.70);
        font-size: 15px;
        line-height: 1.75;
      }

      #${SALES_ID} .ps-story strong {
        color: #f3efe4;
      }

      #${SALES_ID} .ps-fit {
        display: grid;
        align-content: start;
      }

      #${SALES_ID} .ps-fit-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 20px;
      }

      #${SALES_ID} .ps-fit-card {
        min-height: 112px;
        padding: 17px;
        border: 1px solid rgba(241, 193, 90, 0.12);
        background: rgba(255, 255, 255, 0.018);
        color: rgba(243, 239, 228, 0.70);
        font-size: 13px;
        line-height: 1.58;
      }

      #${SALES_ID} .ps-fit-card b {
        display: block;
        margin-bottom: 6px;
        color: #e5b552;
        font-size: 11px;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }

      #${SALES_ID} .ps-sample {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 24px;
        margin-top: 18px;
        padding: 26px 30px;
        border: 1px solid rgba(241, 193, 90, 0.18);
        background:
          linear-gradient(110deg, rgba(217, 155, 36, 0.07), transparent 44%),
          rgba(3, 4, 4, 0.92);
      }

      #${SALES_ID} .ps-sample p {
        margin: 9px 0 0;
        color: rgba(243, 239, 228, 0.62);
        font-size: 13px;
        line-height: 1.65;
      }

      #${CHECKOUT_HEADING_ID} {
        margin: 0 0 22px;
        padding: 0 0 20px;
        border-bottom: 1px solid rgba(241, 193, 90, 0.16);
      }

      #${CHECKOUT_HEADING_ID} .pch-kicker {
        margin: 0 0 8px;
        color: #e0a846;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      #${CHECKOUT_HEADING_ID} h2 {
        margin: 0;
        color: #f3efe4;
        font: 800 clamp(24px, 3vw, 34px)/1.08 Georgia, "Times New Roman", serif;
        text-transform: uppercase;
      }

      #${CHECKOUT_HEADING_ID} p:last-child {
        margin: 9px 0 0;
        color: rgba(243, 239, 228, 0.58);
        font-size: 12px;
        line-height: 1.55;
      }

      html.llave-dedicated-purchase
        #compra-directa .sale-content > .kicker,
      html.llave-dedicated-purchase
        #compra-directa .sale-content > h2,
      html.llave-dedicated-purchase
        #compra-directa .sale-content > .sale-lead,
      html.llave-dedicated-purchase
        #compra-directa .sale-content > .sale-price-block {
        display: none !important;
      }

      html.llave-dedicated-purchase
        #compra-directa .sale-form {
        scroll-margin-top: 18px;
      }

      html.llave-dedicated-purchase
        #compra-directa .checkout-button {
        min-height: 54px;
        font-weight: 950;
        letter-spacing: 0.06em;
      }

      /* =========================================================
       * AJRAZ10 COMPACTO EN /COMPRAR
       * Mantiene intacta toda la lógica de validación,
       * double opt-in y descuento. Solo reduce fricción visual.
       * ======================================================= */
      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout {
        padding: 14px 16px !important;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-checkout-label {
        margin-bottom: 8px !important;
        font-size: 10px !important;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        #ajraz10-checkout-status {
        margin: 7px 0 0 !important;
        font-size: 10px !important;
        line-height: 1.45 !important;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock {
        margin-top: 10px !important;
        padding-top: 10px !important;
        border-top: 1px solid rgba(241, 193, 90, 0.12) !important;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock-copy {
        position: relative;
        display: grid !important;
        grid-template-columns: auto 1fr auto;
        gap: 8px;
        align-items: center;
        margin: 0 !important;
        padding: 8px 10px !important;
        border: 1px solid rgba(241, 193, 90, 0.12);
        background: rgba(255, 255, 255, 0.015);
        cursor: pointer;
        user-select: none;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock-copy:hover,
      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock-copy:focus-visible {
        border-color: rgba(241, 193, 90, 0.34);
        background: rgba(217, 155, 36, 0.045);
        outline: none;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock-title {
        display: inline !important;
        margin: 0 !important;
        color: rgba(243, 239, 228, 0.72) !important;
        font-size: 10px !important;
        letter-spacing: 0.06em !important;
        white-space: nowrap;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock-text {
        display: inline !important;
        margin: 0 !important;
        color: #e0a846 !important;
        font-size: 10px !important;
        font-weight: 850 !important;
        line-height: 1.4 !important;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock-toggle {
        color: #e0a846;
        font-size: 16px;
        font-weight: 900;
        line-height: 1;
        transition: transform 160ms ease;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-inline-panel {
        display: none !important;
        margin-top: 10px !important;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock.is-open
        .ajraz10-inline-panel {
        display: block !important;
      }

      html.llave-dedicated-purchase
        #compra-directa #ajraz10-checkout
        .ajraz10-unlock.is-open
        .ajraz10-unlock-toggle {
        transform: rotate(45deg);
      }

      @media (max-width: 720px) {
        html.llave-dedicated-purchase
          #compra-directa #ajraz10-checkout
          .ajraz10-unlock-copy {
          grid-template-columns: 1fr auto;
          gap: 4px 8px;
        }

        html.llave-dedicated-purchase
          #compra-directa #ajraz10-checkout
          .ajraz10-unlock-title {
          grid-column: 1;
          white-space: normal;
        }

        html.llave-dedicated-purchase
          #compra-directa #ajraz10-checkout
          .ajraz10-unlock-text {
          grid-column: 1;
        }

        html.llave-dedicated-purchase
          #compra-directa #ajraz10-checkout
          .ajraz10-unlock-toggle {
          grid-column: 2;
          grid-row: 1 / span 2;
        }
      }

      /* =========================================================
       * BLOQUE INDEPENDIENTE DE CONFIANZA
       * ======================================================= */
      #${TRUST_ID} {
        position: relative;
        z-index: 10;
        width: min(1060px, calc(100% - 40px));
        margin: 26px auto 64px;
        padding: 24px 26px;
        border: 1px solid rgba(241, 193, 90, 0.24);
        background:
          radial-gradient(circle at 10% 10%, rgba(217, 155, 36, 0.08), transparent 32%),
          linear-gradient(180deg, rgba(9, 9, 8, 0.96), rgba(2, 3, 3, 0.96));
        color: rgba(243, 239, 228, 0.78);
        box-shadow: 0 22px 55px rgba(0, 0, 0, 0.28);
      }

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
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
        border-top: 1px solid rgba(241, 193, 90, 0.15);
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

      @media (max-width: 820px) {
        #${SALES_ID} .ps-hero,
        #${SALES_ID} .ps-story {
          grid-template-columns: 1fr;
        }

        #${SALES_ID} .ps-hero {
          min-height: 0;
          padding: 28px 22px;
        }

        #${SALES_ID} .ps-book {
          order: -1;
          min-height: 265px;
        }

        #${SALES_ID} .ps-book img {
          width: min(310px, 76vw);
          max-height: 330px;
        }

        #${SALES_ID} .ps-hook {
          font-size: clamp(32px, 10vw, 48px);
        }

        #${SALES_ID} .ps-story {
          padding: 28px 22px;
        }

        #${SALES_ID} .ps-sample {
          grid-template-columns: 1fr;
          padding: 24px 22px;
        }
      }

      @media (max-width: 560px) {
        #${SALES_ID} {
          margin-bottom: 32px;
        }

        #${SALES_ID} .ps-hero {
          padding: 22px 17px 26px;
        }

        #${SALES_ID} .ps-book {
          min-height: 225px;
        }

        #${SALES_ID} .ps-book img {
          width: min(270px, 80vw);
          max-height: 285px;
        }

        #${SALES_ID} .ps-title {
          margin-top: 20px;
        }

        #${SALES_ID} .ps-actions {
          display: grid;
          grid-template-columns: 1fr;
        }

        #${SALES_ID} .ps-primary,
        #${SALES_ID} .ps-secondary {
          width: 100%;
          padding-left: 14px;
          padding-right: 14px;
        }

        #${SALES_ID} .ps-fit-grid {
          grid-template-columns: 1fr;
        }

        #${SALES_ID} .ps-fit-card {
          min-height: 0;
        }

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

  function createSalesLanding() {
    const block = document.createElement("div");
    block.id = SALES_ID;

    block.innerHTML = `
      <section class="ps-hero" aria-label="La Llave I: Ciudad Central — edición física">
        <div class="ps-copy">
          <p class="ps-eyebrow">EDICIÓN FÍSICA OFICIAL · DESPACHO EN CHILE</p>
          <h1 class="ps-hook">
            UNA LLAVE MARCADA 066.
            <span>UNA MEMORIA QUE NO DEBERÍA EXISTIR.</span>
          </h1>
          <p class="ps-title">LA LLAVE I: CIUDAD CENTRAL</p>
          <p class="ps-subtitle">Thriller distópico chileno · Enrique G. Santibáñez</p>
          <p class="ps-lead">
            Paula Garrido filtró un video prohibido. Después desapareció.
            Su hermano Issei entra a buscarla y descubre una ciudad donde
            cada pista parece conducirlo hacia una verdad que alguien está
            dispuesto a borrar.
          </p>
          <div class="ps-price-row">
            <strong class="ps-price">$15.990</strong>
            <span class="ps-shipping">
              Despacho: $3.000 RM · $4.500 otras regiones
            </span>
          </div>
          <div class="ps-actions">
            <button class="ps-primary" type="button" data-ps-checkout>
              QUIERO MI EJEMPLAR
            </button>
            <button class="ps-secondary" type="button" data-ps-sample>
              LEER PRIMERAS PÁGINAS
            </button>
          </div>
          <p class="ps-microtrust">
            Pago seguro mediante Mercado Pago · Venta directa en Chile
          </p>
        </div>

        <div class="ps-book" aria-hidden="true">
          <img
            src="/assets/la-llave-edicion-fisica.png"
            alt=""
            loading="eager"
            decoding="async"
          />
        </div>
      </section>

      <section class="ps-story" aria-label="Qué encontrarás en Ciudad Central">
        <div>
          <p class="ps-eyebrow">ENTRA A CIUDAD CENTRAL</p>
          <h3>CIUDAD CENTRAL NO SOLO VIGILA. <span>RECUERDA. CASTIGA. BORRA.</span></h3>
          <p>
            Issei tiene pocas certezas: su hermana desapareció, existe una
            llave marcada con el número <strong>066</strong> y alguien necesita
            que olvide lo que está a punto de descubrir.
          </p>
          <p>
            Junto a la detective Karen Ajraz seguirá una cadena de pistas,
            archivos y secretos donde cada respuesta abre una puerta más
            peligrosa que la anterior.
          </p>
          <p><strong>La verdad no se publica. Se filtra, se persigue y se paga caro.</strong></p>
        </div>

        <div class="ps-fit">
          <p class="ps-eyebrow">ESTE LIBRO PUEDE SER PARA TI SI…</p>
          <h3>BUSCAS UNA HISTORIA QUE TE OBLIGUE A SEGUIR ABRIENDO PUERTAS.</h3>
          <div class="ps-fit-grid">
            <div class="ps-fit-card">
              <b>Conspiración</b>
              Thrillers donde cada pista cambia lo que creías saber.
            </div>
            <div class="ps-fit-card">
              <b>Distopía</b>
              Vigilancia, memoria, poder, manipulación y control.
            </div>
            <div class="ps-fit-card">
              <b>Misterio</b>
              Respuestas que abren preguntas más peligrosas.
            </div>
            <div class="ps-fit-card">
              <b>Atmósfera</b>
              Una novela oscura, visual y de ritmo cinematográfico.
            </div>
          </div>
        </div>
      </section>

      <section class="ps-sample" aria-label="Muestra de lectura">
        <div>
          <p class="ps-eyebrow">NO COMPRES A CIEGAS</p>
          <h3>ABRE EL LIBRO. LEE LAS PRIMERAS PÁGINAS.</h3>
          <p>
            Revisa una muestra real de la edición impresa antes de decidir.
          </p>
        </div>
        <button class="ps-primary" type="button" data-ps-sample>
          LEER MUESTRA
        </button>
      </section>
    `;

    return block;
  }

  function createCheckoutHeading() {
    const heading = document.createElement("div");
    heading.id = CHECKOUT_HEADING_ID;
    heading.innerHTML = `
      <p class="pch-kicker">COMPRA DIRECTA · DESPACHO EN CHILE</p>
      <h2>¿DÓNDE ENVIAMOS TU EJEMPLAR?</h2>
      <p>
        Completa tus datos para calcular el despacho y continuar al pago seguro.
      </p>
    `;
    return heading;
  }

  function openSampleReader() {
    const opener = document.querySelector(
      "#book-sample-showcase .bs-open"
    );

    if (opener instanceof HTMLElement) {
      opener.click();
      return true;
    }

    return false;
  }

  function scrollToCheckout() {
    const form = document.querySelector(
      "#compra-directa .sale-form"
    );

    if (!form) {
      return;
    }

    form.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.setTimeout(() => {
      const firstInput = form.querySelector(
        'input:not([type="hidden"]), select, textarea'
      );

      if (firstInput instanceof HTMLElement) {
        firstInput.focus({ preventScroll: true });
      }
    }, 520);
  }

  function bindSalesActions(block) {
    if (!block || block.dataset.psBound === "true") {
      return;
    }

    block.dataset.psBound = "true";

    block.addEventListener("click", (event) => {
      const target =
        event.target instanceof Element
          ? event.target
          : null;

      if (!target) {
        return;
      }

      if (target.closest("[data-ps-checkout]")) {
        scrollToCheckout();
        return;
      }

      if (target.closest("[data-ps-sample]")) {
        if (!openSampleReader()) {
          const checkout = document.querySelector(
            "#compra-directa .sale-form"
          );

          checkout?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    });
  }

  function ensureSalesLanding() {
    if (!isDedicatedPurchase()) {
      return false;
    }

    const purchaseSection =
      document.getElementById("compra-directa");

    if (!purchaseSection) {
      return false;
    }

    let landing = document.getElementById(SALES_ID);

    if (!landing) {
      landing = createSalesLanding();
      purchaseSection.insertAdjacentElement("afterbegin", landing);
    } else if (purchaseSection.firstElementChild !== landing) {
      purchaseSection.insertAdjacentElement("afterbegin", landing);
    }

    bindSalesActions(landing);

    const saleContent = purchaseSection.querySelector(".sale-content");
    const saleForm = saleContent?.querySelector(".sale-form");

    if (saleContent && saleForm) {
      let heading = document.getElementById(CHECKOUT_HEADING_ID);

      if (!heading) {
        heading = createCheckoutHeading();
      }

      if (saleForm.previousElementSibling !== heading) {
        saleContent.insertBefore(heading, saleForm);
      }
    }

    return true;
  }

  function syncCheckoutCta() {
    if (!isDedicatedPurchase()) {
      return;
    }

    const button = document.querySelector(
      "#compra-directa .checkout-button"
    );

    const total = document.querySelector(
      "#compra-directa .sale-summary .sale-total strong"
    );

    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      return;
    }

    const totalText = String(total?.textContent || "").trim();

    if (!totalText) {
      return;
    }

    const desired = `CONTINUAR A MERCADO PAGO · ${totalText}`;

    if (button.textContent?.trim() !== desired) {
      button.textContent = desired;
    }
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
          <span class="pt-icon" aria-hidden="true">🔒</span>
          <p class="pt-copy">
            <strong>Pago seguro</strong><br />
            Pago procesado mediante Mercado Pago.
          </p>
        </div>

        <div class="pt-item">
          <span class="pt-icon" aria-hidden="true">🚚</span>
          <p class="pt-copy">
            <strong>Región Metropolitana</strong><br />
            Entrega estimada de 1 a 4 días hábiles.
          </p>
        </div>

        <div class="pt-item">
          <span class="pt-icon" aria-hidden="true">📦</span>
          <p class="pt-copy">
            <strong>Otras regiones</strong><br />
            Entrega estimada de 3 a 9 días hábiles.
          </p>
        </div>

        <div class="pt-item">
          <span class="pt-icon" aria-hidden="true">📍</span>
          <p class="pt-copy">
            <strong>Seguimiento</strong><br />
            Recibirás información de seguimiento cuando tu pedido sea despachado.
          </p>
        </div>
      </div>

      <p class="pt-note">
        Plazos estimados desde la confirmación del pago.
        Despachos mediante Blue Express u operadores logísticos asociados,
        según cobertura y operación. Zonas rurales o extremas pueden requerir
        plazo adicional. Tus derechos de garantía y retracto se rigen por la
        normativa chilena vigente. Consultas:
        <a href="mailto:contacto@lallaveoficial.com">contacto@lallaveoficial.com</a>
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

    let block = document.getElementById(TRUST_ID);

    if (!block) {
      block = createTrustBlock();
    }

    if (purchaseSection.nextElementSibling !== block) {
      purchaseSection.insertAdjacentElement("afterend", block);
    }

    return true;
  }

  function compactPromoUI() {
    if (!isDedicatedPurchase()) {
      return;
    }

    const checkout = document.getElementById("ajraz10-checkout");
    const unlock = checkout?.querySelector(".ajraz10-unlock");
    const trigger = unlock?.querySelector(".ajraz10-unlock-copy");
    const panel = unlock?.querySelector(".ajraz10-inline-panel");

    if (!checkout || !unlock || !trigger || !panel) {
      return;
    }

    if (trigger.dataset.compactAjraz10 !== "true") {
      trigger.dataset.compactAjraz10 = "true";
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-controls", "ajraz10-inline-panel-compact");
      panel.id = "ajraz10-inline-panel-compact";

      trigger.innerHTML = `
        <span class="ajraz10-unlock-title">¿NO TIENES CÓDIGO?</span>
        <span class="ajraz10-unlock-text">Obtén 10% con Archivo 066</span>
        <span class="ajraz10-unlock-toggle" aria-hidden="true">+</span>
      `;

      const toggle = () => {
        const open = unlock.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", String(open));
      };

      trigger.addEventListener("click", toggle);
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });
    }
  }

  function ensureAll() {
    ensureSalesLanding();
    ensureTrustBlock();
    compactPromoUI();
    syncCheckoutCta();
  }

  function start() {
    injectStyles();
    ensureAll();

    let scheduled = false;

    const observer = new MutationObserver(() => {
      if (scheduled) {
        return;
      }

      scheduled = true;

      window.requestAnimationFrame(() => {
        scheduled = false;
        ensureAll();
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled", "class"],
    });

    [250, 750, 1500, 3000].forEach((delay) => {
      window.setTimeout(ensureAll, delay);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
