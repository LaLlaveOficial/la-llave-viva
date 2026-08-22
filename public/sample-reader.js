(() => {
  const SECTION_ID = "book-sample-showcase";
  const MODAL_ID = "book-sample-modal";
  const STYLE_ID = "book-sample-reader-styles";
  const BUY_TARGET = "#compra-directa";
  const MOBILE_BREAKPOINT = 760;

  const ASSETS = {
    coverFront: "/assets/muestra/muestra-cover-front.webp",
    coverBack: "/assets/muestra/muestra-cover-back.webp",
    coverSpine: "/assets/muestra/muestra-cover-spine.webp",
    contact: "/assets/muestra/muestra-contacto.png",
    title: "/assets/muestra/muestra-titulo.png",
    chapterArt: "/assets/muestra/muestra-cap1-ilustracion.webp",
    page1: "/assets/muestra/muestra-cap1-pagina-1.png",
    page2: "/assets/muestra/muestra-cap1-pagina-2.png",
    cta: "/assets/muestra/muestra-cta.webp",
  };

  const COPY = {
    es: {
      eyebrow: "ARCHIVO 066 · MUESTRA DE LECTURA",
      title: "ABRE EL LIBRO. LEE LAS PRIMERAS PÁGINAS.",
      lead: "Una muestra real de la edición impresa de La Llave I: Ciudad Central.",
      edition: "Edición original en español",
      open: "LEER MUESTRA",
      close: "Cerrar muestra",
      prev: "Página anterior",
      next: "Página siguiente",
      readerLabel: "ARCHIVO 066 · MUESTRA",
      opening: "ABRIENDO EXPEDIENTE 066…",
      restricted: "ACCESO RESTRINGIDO",
      endTitle: "LA MUESTRA TERMINA AQUÍ",
      endCopy: "La siguiente página permanece clasificada.",
      ctaKicker: "HAS ABIERTO LA PRIMERA PUERTA",
      ctaTitle: "¿QUIERES SABER QUÉ HAY DETRÁS?",
      ctaCopy: "Continúa la historia en la edición impresa oficial.",
      buy: "COMPRAR AHORA · $15.990",
      back: "VOLVER A LA MUESTRA",
      hint: "Usa las flechas o desliza para pasar página",
      page: "PÁGINA",
      pages: "PÁGINAS",
    },
    en: {
      eyebrow: "FILE 066 · READING SAMPLE",
      title: "OPEN THE BOOK. READ THE FIRST PAGES.",
      lead: "A real sample from the printed edition of La Llave I: Ciudad Central.",
      edition: "Original Spanish edition",
      open: "READ SAMPLE",
      close: "Close sample",
      prev: "Previous page",
      next: "Next page",
      readerLabel: "FILE 066 · SAMPLE",
      opening: "OPENING FILE 066…",
      restricted: "RESTRICTED ACCESS",
      endTitle: "THE SAMPLE ENDS HERE",
      endCopy: "The next page remains classified.",
      ctaKicker: "YOU OPENED THE FIRST DOOR",
      ctaTitle: "DO YOU WANT TO KNOW WHAT IS BEHIND IT?",
      ctaCopy: "Continue the story in the official printed edition.",
      buy: "BUY NOW · CLP $15,990",
      back: "BACK TO SAMPLE",
      hint: "Use the arrows or swipe to turn pages",
      page: "PAGE",
      pages: "PAGES",
    },
    pt: {
      eyebrow: "ARQUIVO 066 · AMOSTRA DE LEITURA",
      title: "ABRA O LIVRO. LEIA AS PRIMEIRAS PÁGINAS.",
      lead: "Uma amostra real da edição impressa de La Llave I: Ciudad Central.",
      edition: "Edição original em espanhol",
      open: "LER AMOSTRA",
      close: "Fechar amostra",
      prev: "Página anterior",
      next: "Próxima página",
      readerLabel: "ARQUIVO 066 · AMOSTRA",
      opening: "ABRINDO ARQUIVO 066…",
      restricted: "ACESSO RESTRITO",
      endTitle: "A AMOSTRA TERMINA AQUI",
      endCopy: "A próxima página permanece classificada.",
      ctaKicker: "VOCÊ ABRIU A PRIMEIRA PORTA",
      ctaTitle: "QUER DESCOBRIR O QUE HÁ ATRÁS DELA?",
      ctaCopy: "Continue a história na edição impressa oficial.",
      buy: "COMPRAR AGORA · CLP $15.990",
      back: "VOLTAR À AMOSTRA",
      hint: "Use as setas ou deslize para virar a página",
      page: "PÁGINA",
      pages: "PÁGINAS",
    },
    fr: {
      eyebrow: "DOSSIER 066 · EXTRAIT DE LECTURE",
      title: "OUVREZ LE LIVRE. LISEZ LES PREMIÈRES PAGES.",
      lead: "Un extrait réel de l’édition imprimée de La Llave I: Ciudad Central.",
      edition: "Édition originale en espagnol",
      open: "LIRE L’EXTRAIT",
      close: "Fermer l’extrait",
      prev: "Page précédente",
      next: "Page suivante",
      readerLabel: "DOSSIER 066 · EXTRAIT",
      opening: "OUVERTURE DU DOSSIER 066…",
      restricted: "ACCÈS RESTREINT",
      endTitle: "L’EXTRAIT S’ARRÊTE ICI",
      endCopy: "La page suivante reste classifiée.",
      ctaKicker: "VOUS AVEZ OUVERT LA PREMIÈRE PORTE",
      ctaTitle: "VOULEZ-VOUS SAVOIR CE QU’IL Y A DERRIÈRE ?",
      ctaCopy: "Poursuivez l’histoire dans l’édition imprimée officielle.",
      buy: "ACHETER · CLP $15 990",
      back: "REVENIR À L’EXTRAIT",
      hint: "Utilisez les flèches ou balayez pour tourner la page",
      page: "PAGE",
      pages: "PAGES",
    },
    de: {
      eyebrow: "AKTE 066 · LESEPROBE",
      title: "ÖFFNE DAS BUCH. LIES DIE ERSTEN SEITEN.",
      lead: "Eine echte Leseprobe aus der gedruckten Ausgabe von La Llave I: Ciudad Central.",
      edition: "Spanische Originalausgabe",
      open: "LESEPROBE ÖFFNEN",
      close: "Leseprobe schließen",
      prev: "Vorherige Seite",
      next: "Nächste Seite",
      readerLabel: "AKTE 066 · LESEPROBE",
      opening: "AKTE 066 WIRD GEÖFFNET…",
      restricted: "ZUGANG BESCHRÄNKT",
      endTitle: "DIE LESEPROBE ENDET HIER",
      endCopy: "Die nächste Seite bleibt unter Verschluss.",
      ctaKicker: "DU HAST DIE ERSTE TÜR GEÖFFNET",
      ctaTitle: "WILLST DU WISSEN, WAS DAHINTER LIEGT?",
      ctaCopy: "Lies die Geschichte in der offiziellen Printausgabe weiter.",
      buy: "JETZT KAUFEN · CLP $15.990",
      back: "ZURÜCK ZUR LESEPROBE",
      hint: "Mit Pfeilen oder Wischen Seiten umblättern",
      page: "SEITE",
      pages: "SEITEN",
    },
    it: {
      eyebrow: "FASCICOLO 066 · ANTEPRIMA",
      title: "APRI IL LIBRO. LEGGI LE PRIME PAGINE.",
      lead: "Un’anteprima reale dell’edizione cartacea di La Llave I: Ciudad Central.",
      edition: "Edizione originale in spagnolo",
      open: "LEGGI L’ANTEPRIMA",
      close: "Chiudi anteprima",
      prev: "Pagina precedente",
      next: "Pagina successiva",
      readerLabel: "FASCICOLO 066 · ANTEPRIMA",
      opening: "APERTURA FASCICOLO 066…",
      restricted: "ACCESSO LIMITATO",
      endTitle: "L’ANTEPRIMA FINISCE QUI",
      endCopy: "La pagina successiva resta classificata.",
      ctaKicker: "HAI APERTO LA PRIMA PORTA",
      ctaTitle: "VUOI SAPERE COSA C’È DIETRO?",
      ctaCopy: "Continua la storia nell’edizione cartacea ufficiale.",
      buy: "ACQUISTA ORA · CLP $15.990",
      back: "TORNA ALL’ANTEPRIMA",
      hint: "Usa le frecce o scorri per girare pagina",
      page: "PAGINA",
      pages: "PAGINE",
    },
  };

  let section;
  let modal;
  let currentStep = 0;
  let openingTimer = null;
  let pointerStartX = null;
  let copy = COPY.es;

  const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const currentLang = () => {
    const selector = document.querySelector('select[aria-label="Idioma"]');
    return selector?.value || document.documentElement.lang || "es";
  };

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html.sample-reader-lock,
      html.sample-reader-lock body {
        overflow: hidden !important;
      }

      #${SECTION_ID} {
        position: relative;
        z-index: 10;
        width: min(1180px, calc(100% - 40px));
        margin: 72px auto 86px;
        color: #f3efe4;
        font-family: inherit;
      }

      #${SECTION_ID} .bs-shell {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 0.92fr) minmax(320px, 0.78fr);
        align-items: center;
        gap: clamp(32px, 6vw, 86px);
        min-height: 520px;
        padding: clamp(34px, 5vw, 72px);
        overflow: hidden;
        border: 1px solid rgba(241, 193, 90, 0.25);
        background:
          radial-gradient(circle at 77% 25%, rgba(217,155,36,.14), transparent 30%),
          linear-gradient(135deg, rgba(10,12,14,.94), rgba(2,3,3,.90));
        box-shadow: 0 36px 110px rgba(0,0,0,.48);
      }

      #${SECTION_ID} .bs-shell::before {
        content: "066";
        position: absolute;
        right: -0.04em;
        top: -0.18em;
        color: rgba(241,193,90,.028);
        font: 900 clamp(180px, 30vw, 430px)/1 Georgia, serif;
        pointer-events: none;
      }

      #${SECTION_ID} .bs-copy {
        position: relative;
        z-index: 2;
        max-width: 610px;
      }

      #${SECTION_ID} .bs-eyebrow {
        margin: 0 0 14px;
        color: #e0a846;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .24em;
        text-transform: uppercase;
      }

      #${SECTION_ID} .bs-title {
        margin: 0;
        font: clamp(34px, 5vw, 64px)/.98 Georgia, "Times New Roman", serif;
        letter-spacing: .015em;
        text-transform: uppercase;
        text-wrap: balance;
      }

      #${SECTION_ID} .bs-lead {
        margin: 20px 0 0;
        max-width: 540px;
        color: rgba(243,239,228,.72);
        font-size: clamp(15px, 1.6vw, 18px);
        line-height: 1.7;
      }

      #${SECTION_ID} .bs-edition {
        display: inline-flex;
        margin-top: 18px;
        padding: 7px 10px;
        border: 1px solid rgba(241,193,90,.18);
        color: rgba(241,193,90,.82);
        background: rgba(217,155,36,.055);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      #${SECTION_ID} .bs-open {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        min-height: 50px;
        margin-top: 28px;
        padding: 0 22px;
        border: 1px solid rgba(241,193,90,.76);
        border-radius: 4px;
        color: #171109;
        background: linear-gradient(180deg, #f0c264, #b97a1b);
        box-shadow: 0 12px 40px rgba(217,155,36,.18);
        font-size: 11px;
        font-weight: 950;
        letter-spacing: .16em;
        text-transform: uppercase;
        transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease;
      }

      #${SECTION_ID} .bs-open:hover,
      #${SECTION_ID} .bs-open:focus-visible {
        transform: translateY(-2px);
        filter: brightness(1.06);
        box-shadow: 0 16px 48px rgba(217,155,36,.28);
        outline: none;
      }

      #${SECTION_ID} .bs-open svg {
        width: 18px;
        height: 18px;
      }

      #${SECTION_ID} .bs-visual {
        position: relative;
        z-index: 2;
        display: grid;
        place-items: center;
        min-height: 390px;
        perspective: 1400px;
      }

      .bs-closed-book {
        --book-w: min(300px, 70vw);
        position: relative;
        width: var(--book-w);
        aspect-ratio: 0.68;
        transform-style: preserve-3d;
        transform: rotateY(-20deg) rotateX(3deg) rotateZ(1deg);
        filter: drop-shadow(26px 34px 28px rgba(0,0,0,.62));
        animation: bsBookFloat 5.6s ease-in-out infinite;
      }

      .bs-closed-book .bs-cover-front,
      .bs-closed-book .bs-cover-back {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 2px 5px 5px 2px;
        backface-visibility: hidden;
      }

      .bs-closed-book .bs-cover-front {
        z-index: 4;
        transform: translateZ(15px);
      }

      .bs-closed-book .bs-cover-back {
        z-index: 1;
        transform: translateZ(-14px) rotateY(180deg);
      }

      .bs-closed-book .bs-page-block {
        position: absolute;
        z-index: 2;
        inset: 5px -9px 5px 7px;
        transform: translateZ(0);
        border-radius: 0 5px 5px 0;
        background: repeating-linear-gradient(90deg, #f3f0e7 0 2px, #ddd7cb 2px 3px);
        box-shadow: inset -8px 0 10px rgba(50,40,30,.20);
      }

      .bs-closed-book .bs-spine {
        position: absolute;
        z-index: 6;
        left: -17px;
        top: 1px;
        width: 26px;
        height: calc(100% - 2px);
        object-fit: cover;
        transform: rotateY(76deg) translateZ(3px);
        transform-origin: right center;
        filter: brightness(.74);
      }

      .bs-closed-book::after {
        content: "";
        position: absolute;
        inset: -18px -32px -28px;
        z-index: -1;
        border-radius: 50%;
        background: radial-gradient(ellipse, rgba(0,0,0,.70), transparent 65%);
        transform: translateY(64%);
        filter: blur(13px);
      }

      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: none;
        color: #f3efe4;
        font-family: inherit;
      }

      #${MODAL_ID}.is-visible {
        display: grid;
        place-items: center;
      }

      #${MODAL_ID} .bs-backdrop {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 50% 18%, rgba(57,72,82,.20), transparent 38%),
          rgba(0,0,0,.93);
        backdrop-filter: blur(14px);
      }

      #${MODAL_ID} .bs-dialog {
        position: relative;
        z-index: 2;
        width: min(1480px, 100vw);
        height: min(960px, 100svh);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        padding: clamp(12px, 2vw, 26px);
        outline: none;
      }

      #${MODAL_ID} .bs-toolbar {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px;
        min-height: 56px;
        border-bottom: 1px solid rgba(241,193,90,.18);
      }

      #${MODAL_ID} .bs-reader-label {
        color: #dba64a;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .23em;
        text-transform: uppercase;
      }

      #${MODAL_ID} .bs-page-indicator {
        color: rgba(243,239,228,.60);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .18em;
        text-align: center;
        text-transform: uppercase;
      }

      #${MODAL_ID} .bs-close {
        justify-self: end;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 50%;
        color: #f4ecde;
        background: rgba(0,0,0,.45);
        transition: border-color 160ms ease, color 160ms ease, transform 160ms ease;
      }

      #${MODAL_ID} .bs-close:hover,
      #${MODAL_ID} .bs-close:focus-visible {
        color: #f0bd58;
        border-color: rgba(240,189,88,.55);
        transform: rotate(4deg);
        outline: none;
      }

      #${MODAL_ID} .bs-reader-stage {
        position: relative;
        min-height: 0;
        display: grid;
        place-items: center;
        overflow: hidden;
        perspective: 2200px;
      }

      #${MODAL_ID} .bs-opening-scene {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        opacity: 0;
        pointer-events: none;
      }

      #${MODAL_ID}.is-opening .bs-opening-scene {
        opacity: 1;
      }

      #${MODAL_ID}.is-opening .bs-opening-scene .bs-closed-book {
        animation: bsOpenBook 980ms cubic-bezier(.2,.75,.25,1) both;
      }

      #${MODAL_ID} .bs-opening-status {
        position: absolute;
        bottom: clamp(18px, 4vh, 46px);
        left: 50%;
        transform: translateX(-50%);
        color: rgba(240,194,100,.74);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .20em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      #${MODAL_ID} .bs-reader-content {
        position: relative;
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        opacity: 1;
      }

      #${MODAL_ID}.is-opening .bs-reader-content {
        opacity: 0;
        pointer-events: none;
      }

      #${MODAL_ID} .bs-spread {
        --page-h: min(75vh, 720px);
        position: relative;
        display: grid;
        grid-template-columns: auto auto;
        align-items: stretch;
        justify-content: center;
        gap: 2px;
        height: var(--page-h);
        max-width: calc(var(--page-h) * 1.37);
        transform-style: preserve-3d;
        filter: drop-shadow(0 36px 38px rgba(0,0,0,.58));
      }

      #${MODAL_ID} .bs-spread::before {
        content: "";
        position: absolute;
        z-index: 8;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 30px;
        transform: translateX(-50%);
        pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(0,0,0,.22) 42%, rgba(255,255,255,.06) 51%, rgba(0,0,0,.25) 58%, transparent);
        mix-blend-mode: multiply;
      }

      #${MODAL_ID} .bs-page {
        position: relative;
        height: 100%;
        aspect-ratio: .68;
        overflow: hidden;
        background: #f5f2ea;
        box-shadow: inset 0 0 22px rgba(64,47,29,.10);
        transform-style: preserve-3d;
      }

      #${MODAL_ID} .bs-page-left {
        border-radius: 5px 1px 1px 5px;
        transform-origin: right center;
      }

      #${MODAL_ID} .bs-page-right {
        border-radius: 1px 5px 5px 1px;
        transform-origin: left center;
      }

      #${MODAL_ID} .bs-page img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #fff;
        user-select: none;
        -webkit-user-drag: none;
      }

      #${MODAL_ID} .bs-restricted {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        padding: 34px;
        text-align: center;
        color: #e7dcc9;
        background:
          repeating-linear-gradient(-45deg, rgba(205,143,38,.06) 0 14px, transparent 14px 28px),
          radial-gradient(circle at 50% 42%, rgba(185,122,27,.15), transparent 34%),
          #070808;
      }

      #${MODAL_ID} .bs-restricted-inner {
        max-width: 280px;
      }

      #${MODAL_ID} .bs-restricted span {
        color: #d6a44f;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .22em;
        text-transform: uppercase;
      }

      #${MODAL_ID} .bs-restricted strong {
        display: block;
        margin-top: 14px;
        font: 700 clamp(22px, 3vw, 34px)/1.05 Georgia, serif;
        letter-spacing: .04em;
      }

      #${MODAL_ID} .bs-restricted p {
        margin: 14px 0 0;
        color: rgba(231,220,201,.58);
        font-size: 13px;
        line-height: 1.55;
      }

      #${MODAL_ID} .bs-cta-screen {
        position: relative;
        width: min(940px, 92vw);
        height: min(72vh, 690px);
        overflow: hidden;
        border: 1px solid rgba(241,193,90,.22);
        background: #050606;
        box-shadow: 0 36px 100px rgba(0,0,0,.66);
      }

      #${MODAL_ID} .bs-cta-screen img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(.62) contrast(1.08) saturate(.86);
      }

      #${MODAL_ID} .bs-cta-screen::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(0,0,0,.80), rgba(0,0,0,.30) 54%, rgba(0,0,0,.54)),
          linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.72));
      }

      #${MODAL_ID} .bs-cta-copy {
        position: relative;
        z-index: 2;
        width: min(590px, 82%);
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: clamp(28px, 6vw, 72px);
      }

      #${MODAL_ID} .bs-cta-kicker {
        margin: 0 0 14px;
        color: #e0aa4f;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .22em;
        text-transform: uppercase;
      }

      #${MODAL_ID} .bs-cta-title {
        margin: 0;
        font: clamp(34px, 5vw, 66px)/.95 Georgia, serif;
        text-transform: uppercase;
        text-wrap: balance;
      }

      #${MODAL_ID} .bs-cta-text {
        margin: 18px 0 0;
        max-width: 480px;
        color: rgba(243,239,228,.72);
        font-size: 16px;
        line-height: 1.65;
      }

      #${MODAL_ID} .bs-cta-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 28px;
      }

      #${MODAL_ID} .bs-buy,
      #${MODAL_ID} .bs-back {
        min-height: 48px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 18px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      #${MODAL_ID} .bs-buy {
        border: 1px solid rgba(241,193,90,.76);
        color: #171109;
        background: linear-gradient(180deg, #f0c264, #b97a1b);
      }

      #${MODAL_ID} .bs-back {
        border: 1px solid rgba(255,255,255,.17);
        color: #eee6d8;
        background: rgba(0,0,0,.42);
      }

      #${MODAL_ID} .bs-bottom {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px;
        min-height: 64px;
        border-top: 1px solid rgba(241,193,90,.16);
      }

      #${MODAL_ID} .bs-nav {
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(241,193,90,.28);
        border-radius: 50%;
        color: #e6b251;
        background: rgba(0,0,0,.42);
        transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      }

      #${MODAL_ID} .bs-nav:hover,
      #${MODAL_ID} .bs-nav:focus-visible {
        transform: scale(1.05);
        border-color: rgba(241,193,90,.70);
        background: rgba(217,155,36,.10);
        outline: none;
      }

      #${MODAL_ID} .bs-nav[disabled] {
        opacity: .20;
        cursor: default;
        transform: none;
      }

      #${MODAL_ID} .bs-prev { justify-self: start; }
      #${MODAL_ID} .bs-next { justify-self: end; }

      #${MODAL_ID} .bs-hint {
        color: rgba(243,239,228,.42);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .13em;
        text-align: center;
        text-transform: uppercase;
      }

      #${MODAL_ID} .bs-reader-content.turn-next .bs-spread,
      #${MODAL_ID} .bs-reader-content.turn-next .bs-mobile-page {
        animation: bsTurnNext 260ms ease both;
      }

      #${MODAL_ID} .bs-reader-content.turn-prev .bs-spread,
      #${MODAL_ID} .bs-reader-content.turn-prev .bs-mobile-page {
        animation: bsTurnPrev 260ms ease both;
      }

      #${MODAL_ID} .bs-mobile-page {
        display: none;
      }

      @keyframes bsBookFloat {
        0%, 100% { transform: rotateY(-20deg) rotateX(3deg) rotateZ(1deg) translateY(0); }
        50% { transform: rotateY(-16deg) rotateX(1deg) rotateZ(.4deg) translateY(-7px); }
      }

      @keyframes bsOpenBook {
        0% { transform: rotateY(-20deg) rotateX(3deg) scale(.92); opacity: .92; }
        48% { transform: rotateY(-8deg) rotateX(1deg) scale(1.04); opacity: 1; }
        100% { transform: rotateY(-72deg) rotateX(0) translateX(-38%) scale(.86); opacity: 0; }
      }

      @keyframes bsTurnNext {
        0% { opacity: 1; transform: perspective(1600px) rotateY(0deg) translateX(0); }
        46% { opacity: .62; transform: perspective(1600px) rotateY(-4deg) translateX(-12px); }
        100% { opacity: 1; transform: perspective(1600px) rotateY(0deg) translateX(0); }
      }

      @keyframes bsTurnPrev {
        0% { opacity: 1; transform: perspective(1600px) rotateY(0deg) translateX(0); }
        46% { opacity: .62; transform: perspective(1600px) rotateY(4deg) translateX(12px); }
        100% { opacity: 1; transform: perspective(1600px) rotateY(0deg) translateX(0); }
      }

      @media (max-width: ${MOBILE_BREAKPOINT}px) {
        #${SECTION_ID} {
          width: calc(100% - 22px);
          margin: 48px auto 58px;
        }

        #${SECTION_ID} .bs-shell {
          grid-template-columns: 1fr;
          gap: 22px;
          min-height: 0;
          padding: 28px 20px 34px;
        }

        #${SECTION_ID} .bs-copy {
          text-align: center;
        }

        #${SECTION_ID} .bs-title {
          font-size: clamp(30px, 10vw, 46px);
        }

        #${SECTION_ID} .bs-edition {
          margin-inline: auto;
        }

        #${SECTION_ID} .bs-visual {
          min-height: 330px;
          order: -1;
        }

        #${SECTION_ID} .bs-open {
          width: 100%;
        }

        #${SECTION_ID} .bs-closed-book {
          --book-w: min(220px, 58vw);
        }

        #${MODAL_ID} .bs-dialog {
          width: 100vw;
          height: 100svh;
          padding: 8px 10px 10px;
        }

        #${MODAL_ID} .bs-toolbar {
          grid-template-columns: 1fr auto;
          min-height: 52px;
        }

        #${MODAL_ID} .bs-page-indicator {
          grid-row: 2;
          grid-column: 1 / -1;
          padding-bottom: 7px;
        }

        #${MODAL_ID} .bs-reader-stage {
          padding: 6px 0;
        }

        #${MODAL_ID} .bs-spread {
          display: none;
        }

        #${MODAL_ID} .bs-mobile-page {
          display: block;
          position: relative;
          width: min(86vw, 460px);
          height: min(74vh, 690px);
          overflow: hidden;
          border-radius: 4px;
          background: #fff;
          box-shadow: 0 28px 60px rgba(0,0,0,.62);
        }

        #${MODAL_ID} .bs-mobile-page img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #fff;
          user-select: none;
          -webkit-user-drag: none;
        }

        #${MODAL_ID} .bs-cta-screen {
          width: min(94vw, 620px);
          height: min(72vh, 680px);
        }

        #${MODAL_ID} .bs-cta-copy {
          width: 100%;
          justify-content: flex-end;
          padding: 28px 22px 32px;
          background: linear-gradient(180deg, transparent 12%, rgba(0,0,0,.78) 54%, rgba(0,0,0,.94));
        }

        #${MODAL_ID} .bs-cta-title {
          font-size: clamp(30px, 9vw, 48px);
        }

        #${MODAL_ID} .bs-cta-actions {
          display: grid;
          grid-template-columns: 1fr;
        }

        #${MODAL_ID} .bs-bottom {
          min-height: 58px;
        }

        #${MODAL_ID} .bs-hint {
          max-width: 180px;
          line-height: 1.4;
        }

        #${MODAL_ID} .bs-opening-scene .bs-closed-book {
          --book-w: min(240px, 62vw);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${SECTION_ID} *,
        #${MODAL_ID} * {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const bookMarkup = () => `
    <div class="bs-closed-book" aria-hidden="true">
      <img class="bs-cover-back" src="${ASSETS.coverBack}" alt="" />
      <div class="bs-page-block"></div>
      <img class="bs-spine" src="${ASSETS.coverSpine}" alt="" />
      <img class="bs-cover-front" src="${ASSETS.coverFront}" alt="" />
    </div>
  `;

  const buildSection = () => {
    const el = document.createElement("section");
    el.id = SECTION_ID;
    el.setAttribute("aria-labelledby", `${SECTION_ID}-title`);
    el.innerHTML = `
      <div class="bs-shell">
        <div class="bs-copy">
          <p class="bs-eyebrow"></p>
          <h2 class="bs-title" id="${SECTION_ID}-title"></h2>
          <p class="bs-lead"></p>
          <span class="bs-edition"></span>
          <br />
          <button class="bs-open" type="button" data-bs-open>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 5.5c2.7-.8 5.3-.5 8 1.3v12c-2.7-1.8-5.3-2.1-8-1.3v-12Z" stroke="currentColor" stroke-width="1.7"/>
              <path d="M20 5.5c-2.7-.8-5.3-.5-8 1.3v12c2.7-1.8 5.3-2.1 8-1.3v-12Z" stroke="currentColor" stroke-width="1.7"/>
            </svg>
            <span></span>
          </button>
        </div>
        <div class="bs-visual">
          ${bookMarkup()}
        </div>
      </div>
    `;
    return el;
  };

  const buildModal = () => {
    const el = document.createElement("div");
    el.id = MODAL_ID;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="bs-backdrop" data-bs-close></div>
      <div class="bs-dialog" role="dialog" aria-modal="true" aria-labelledby="bs-reader-label" tabindex="-1">
        <div class="bs-toolbar">
          <div class="bs-reader-label" id="bs-reader-label"></div>
          <div class="bs-page-indicator"></div>
          <button class="bs-close" type="button" data-bs-close aria-label="">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8"/>
            </svg>
          </button>
        </div>
        <div class="bs-reader-stage" data-bs-stage>
          <div class="bs-opening-scene">
            ${bookMarkup()}
            <div class="bs-opening-status"></div>
          </div>
          <div class="bs-reader-content"></div>
        </div>
        <div class="bs-bottom">
          <button class="bs-nav bs-prev" type="button" data-bs-prev aria-label="">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 5-7 7 7 7" stroke="currentColor" stroke-width="1.8"/></svg>
          </button>
          <div class="bs-hint"></div>
          <button class="bs-nav bs-next" type="button" data-bs-next aria-label="">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.8"/></svg>
          </button>
        </div>
      </div>
    `;
    return el;
  };

  const mobilePages = [ASSETS.contact, ASSETS.title, ASSETS.chapterArt, ASSETS.page1, ASSETS.page2];

  const pageImage = (src, alt = "") => `<img src="${src}" alt="${escapeHtml(alt)}" draggable="false" />`;

  const renderDesktop = () => {
    if (currentStep === 1) {
      return `
        <div class="bs-spread">
          <div class="bs-page bs-page-left">${pageImage(ASSETS.contact, "Página de contacto y redes sociales")}</div>
          <div class="bs-page bs-page-right">${pageImage(ASSETS.title, "Portadilla de La Llave I: Ciudad Central")}</div>
        </div>
      `;
    }

    if (currentStep === 2) {
      return `
        <div class="bs-spread">
          <div class="bs-page bs-page-left">${pageImage(ASSETS.chapterArt, "Ilustración de apertura del capítulo 1")}</div>
          <div class="bs-page bs-page-right">${pageImage(ASSETS.page1, "Primera página del capítulo 1")}</div>
        </div>
      `;
    }

    if (currentStep === 3) {
      return `
        <div class="bs-spread">
          <div class="bs-page bs-page-left">${pageImage(ASSETS.page2, "Segunda página del capítulo 1")}</div>
          <div class="bs-page bs-page-right">
            <div class="bs-restricted">
              <div class="bs-restricted-inner">
                <span>${escapeHtml(copy.restricted)}</span>
                <strong>${escapeHtml(copy.endTitle)}</strong>
                <p>${escapeHtml(copy.endCopy)}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return renderCta();
  };

  const renderMobile = () => {
    if (currentStep >= 1 && currentStep <= 5) {
      const src = mobilePages[currentStep - 1];
      return `<div class="bs-mobile-page">${pageImage(src, `Página ${currentStep} de la muestra`)}</div>`;
    }
    return renderCta();
  };

  const renderCta = () => `
    <div class="bs-cta-screen">
      <img src="${ASSETS.cta}" alt="" aria-hidden="true" />
      <div class="bs-cta-copy">
        <p class="bs-cta-kicker">${escapeHtml(copy.ctaKicker)}</p>
        <h3 class="bs-cta-title">${escapeHtml(copy.ctaTitle)}</h3>
        <p class="bs-cta-text">${escapeHtml(copy.ctaCopy)}</p>
        <div class="bs-cta-actions">
          <a class="bs-buy" href="${BUY_TARGET}" data-bs-buy>${escapeHtml(copy.buy)}</a>
          <button class="bs-back" type="button" data-bs-back>${escapeHtml(copy.back)}</button>
        </div>
      </div>
    </div>
  `;

  const maxStep = () => isMobile() ? 6 : 4;

  const indicatorText = () => {
    if (currentStep === maxStep()) return "066 · ACCESO";
    if (isMobile()) return `${copy.page} ${String(currentStep).padStart(2, "0")} / 05`;
    if (currentStep === 1) return `${copy.pages} 01–02 / 05`;
    if (currentStep === 2) return `${copy.pages} 03–04 / 05`;
    return `${copy.page} 05 / 05`;
  };

  const updateControls = () => {
    if (!modal) return;
    const prev = modal.querySelector("[data-bs-prev]");
    const next = modal.querySelector("[data-bs-next]");
    const indicator = modal.querySelector(".bs-page-indicator");
    indicator.textContent = indicatorText();
    prev.disabled = currentStep <= 1;
    next.disabled = currentStep >= maxStep();
    prev.setAttribute("aria-label", copy.prev);
    next.setAttribute("aria-label", copy.next);
  };

  const renderReader = (direction = null) => {
    if (!modal) return;
    const content = modal.querySelector(".bs-reader-content");
    if (direction) content.classList.add(direction === "next" ? "turn-next" : "turn-prev");

    const commit = () => {
      content.innerHTML = isMobile() ? renderMobile() : renderDesktop();
      updateControls();

      const back = content.querySelector("[data-bs-back]");
      if (back) back.addEventListener("click", () => {
        currentStep = isMobile() ? 5 : 3;
        renderReader("prev");
      });

      const buy = content.querySelector("[data-bs-buy]");
      if (buy) buy.addEventListener("click", () => {
        closeReader();
        requestAnimationFrame(() => {
          const target = document.querySelector(BUY_TARGET);
          if (target) target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        });
      });
    };

    if (!direction || prefersReducedMotion()) {
      content.classList.remove("turn-next", "turn-prev");
      commit();
      return;
    }

    window.setTimeout(() => {
      content.classList.remove("turn-next", "turn-prev");
      commit();
    }, 125);
  };

  const nextPage = () => {
    if (!modal?.classList.contains("is-visible") || modal.classList.contains("is-opening")) return;
    if (currentStep >= maxStep()) return;
    currentStep += 1;
    renderReader("next");
  };

  const prevPage = () => {
    if (!modal?.classList.contains("is-visible") || modal.classList.contains("is-opening")) return;
    if (currentStep <= 1) return;
    currentStep -= 1;
    renderReader("prev");
  };

  const openReader = () => {
    if (!modal) return;
    window.clearTimeout(openingTimer);
    document.documentElement.classList.add("sample-reader-lock");
    modal.classList.add("is-visible", "is-opening");
    modal.setAttribute("aria-hidden", "false");
    currentStep = 1;
    applyCopy();
    updateControls();
    modal.querySelector(".bs-reader-content").innerHTML = "";
    modal.querySelector(".bs-dialog").focus({ preventScroll: true });

    const delay = prefersReducedMotion() ? 80 : 900;
    openingTimer = window.setTimeout(() => {
      modal.classList.remove("is-opening");
      renderReader();
    }, delay);
  };

  const closeReader = () => {
    if (!modal) return;
    window.clearTimeout(openingTimer);
    modal.classList.remove("is-visible", "is-opening");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("sample-reader-lock");
  };

  const applyCopy = () => {
    const lang = currentLang();
    copy = COPY[lang] || COPY.es;
    if (!section || !modal) return;

    section.querySelector(".bs-eyebrow").textContent = copy.eyebrow;
    section.querySelector(".bs-title").textContent = copy.title;
    section.querySelector(".bs-lead").textContent = copy.lead;
    section.querySelector(".bs-edition").textContent = copy.edition;
    section.querySelector(".bs-open span").textContent = copy.open;

    modal.querySelector(".bs-reader-label").textContent = copy.readerLabel;
    modal.querySelector(".bs-opening-status").textContent = copy.opening;
    modal.querySelector(".bs-close").setAttribute("aria-label", copy.close);
    modal.querySelector(".bs-hint").textContent = copy.hint;

    if (modal.classList.contains("is-visible") && !modal.classList.contains("is-opening")) {
      renderReader();
    } else {
      updateControls();
    }
  };

  const bindEvents = () => {
    section.querySelector("[data-bs-open]").addEventListener("click", openReader);
    modal.querySelectorAll("[data-bs-close]").forEach((el) => el.addEventListener("click", closeReader));
    modal.querySelector("[data-bs-prev]").addEventListener("click", prevPage);
    modal.querySelector("[data-bs-next]").addEventListener("click", nextPage);

    const stage = modal.querySelector("[data-bs-stage]");
    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      pointerStartX = event.clientX;
    }, { passive: true });

    stage.addEventListener("pointerup", (event) => {
      if (pointerStartX == null) return;
      const delta = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(delta) < 42) return;
      if (delta < 0) nextPage();
      else prevPage();
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
      if (!modal.classList.contains("is-visible")) return;
      if (event.key === "Escape") closeReader();
      if (event.key === "ArrowRight") nextPage();
      if (event.key === "ArrowLeft") prevPage();
    });

    window.addEventListener("resize", () => {
      if (!modal.classList.contains("is-visible") || modal.classList.contains("is-opening")) return;
      const limit = maxStep();
      if (currentStep > limit) currentStep = limit;
      if (isMobile() && currentStep <= 3) {
        // Preserve the closest equivalent reading position when moving to mobile.
        currentStep = currentStep === 1 ? 1 : currentStep === 2 ? 3 : 5;
      } else if (!isMobile() && currentStep > 4) {
        currentStep = currentStep === 5 ? 3 : 4;
      }
      renderReader();
    }, { passive: true });

    const langSelector = document.querySelector('select[aria-label="Idioma"]');
    if (langSelector) {
      langSelector.addEventListener("change", () => requestAnimationFrame(applyCopy));
    }
  };

  const mount = () => {
    if (location.pathname.startsWith("/press-kit") || location.pathname.startsWith("/presskit")) return false;
    if (location.pathname.startsWith("/compra-confirmada") || location.pathname.startsWith("/pago-") || location.pathname.startsWith("/payment")) return false;
    if (document.getElementById(SECTION_ID)) return true;

    const directSale = document.querySelector(".direct-sale-section");
    const footer = document.querySelector("footer.footer");
    const anchor = directSale || footer;
    if (!anchor?.parentNode) return false;

    injectStyles();
    section = buildSection();
    modal = buildModal();

    anchor.parentNode.insertBefore(section, anchor);
    document.body.appendChild(modal);

    applyCopy();
    bindEvents();

    return true;
  };

  if (mount()) return;

  const observer = new MutationObserver(() => {
    if (mount()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
