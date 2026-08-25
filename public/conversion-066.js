(() => {
  const SCRIPT_FLAG = "__laLlaveConversion066";
  const ARIZAKI_ID = "arizaki-proof";
  const STYLE_ID = "conversion-066-styles";
  const SAMPLE_ID = "book-sample-showcase";
  const ARCHIVE_ID = "archivo-066-mailing";
  const ARIZAKI_URL =
    "https://heyzine.com/flip-book/d4dcc61e75.html#page/129";
  const ARIZAKI_IMAGE = "/assets/arizaki-destacado-mes.png";
  const KINDLE_URL = "https://www.amazon.com/dp/B0GX31SRTT";

  if (window[SCRIPT_FLAG]) return;
  window[SCRIPT_FLAG] = true;

  const COPY = {
    es: {
      sample: "LEER MUESTRA GRATIS",
      buy: "CONSEGUIR LA LLAVE · $15.990",
      noteLead: "Venta directa en Chile · Pago seguro con Mercado Pago",
      kindle: "Disponible también en Kindle",
      mediaEyebrow: "LA LLAVE EN LOS MEDIOS",
      mediaName: "REVISTA ARIZAKI",
      mediaTitle: "NUESTRO DESTACADO DEL MES",
      mediaText:
        "Revista Arizaki presentó La Llave I: Ciudad Central como su “Destacado del mes” y dedicó un espacio al origen del proyecto, su universo y el código 066.",
      mediaButton: "LEER EN REVISTA ARIZAKI",
      mediaSource: "Publicación externa · Revista Arizaki",
    },
    en: {
      sample: "READ FREE SAMPLE",
      buy: "GET LA LLAVE · CLP $15,990",
      noteLead: "Direct sale in Chile · Secure Mercado Pago checkout",
      kindle: "Also available on Kindle",
      mediaEyebrow: "LA LLAVE IN THE MEDIA",
      mediaName: "ARIZAKI MAGAZINE",
      mediaTitle: "OUR FEATURED BOOK OF THE MONTH",
      mediaText:
        "Arizaki Magazine presented La Llave I: Ciudad Central as its “Featured Book of the Month” and devoted space to the project's origin, universe and code 066.",
      mediaButton: "READ IN ARIZAKI MAGAZINE",
      mediaSource: "Independent publication · Arizaki Magazine",
    },
    pt: {
      sample: "LER AMOSTRA GRÁTIS",
      buy: "CONSEGUIR LA LLAVE · CLP $15.990",
      noteLead: "Venda direta no Chile · Pagamento seguro com Mercado Pago",
      kindle: "Também disponível no Kindle",
      mediaEyebrow: "LA LLAVE NA MÍDIA",
      mediaName: "REVISTA ARIZAKI",
      mediaTitle: "NOSSO DESTAQUE DO MÊS",
      mediaText:
        "A Revista Arizaki apresentou La Llave I: Ciudad Central como seu “Destaque do mês” e dedicou espaço à origem do projeto, ao seu universo e ao código 066.",
      mediaButton: "LER NA REVISTA ARIZAKI",
      mediaSource: "Publicação externa · Revista Arizaki",
    },
    fr: {
      sample: "LIRE L’EXTRAIT GRATUIT",
      buy: "OBTENIR LA LLAVE · 15 990 CLP",
      noteLead: "Vente directe au Chili · Paiement sécurisé Mercado Pago",
      kindle: "Également disponible sur Kindle",
      mediaEyebrow: "LA LLAVE DANS LES MÉDIAS",
      mediaName: "REVUE ARIZAKI",
      mediaTitle: "NOTRE SÉLECTION DU MOIS",
      mediaText:
        "La revue Arizaki a présenté La Llave I: Ciudad Central comme sa « sélection du mois » et a consacré un espace à l’origine du projet, à son univers et au code 066.",
      mediaButton: "LIRE DANS LA REVUE ARIZAKI",
      mediaSource: "Publication externe · Revue Arizaki",
    },
    de: {
      sample: "KOSTENLOSE LESEPROBE",
      buy: "LA LLAVE HOLEN · CLP $15.990",
      noteLead: "Direktverkauf in Chile · Sichere Zahlung mit Mercado Pago",
      kindle: "Auch auf Kindle erhältlich",
      mediaEyebrow: "LA LLAVE IN DEN MEDIEN",
      mediaName: "ARIZAKI MAGAZIN",
      mediaTitle: "UNSER HIGHLIGHT DES MONATS",
      mediaText:
        "Das Arizaki Magazin stellte La Llave I: Ciudad Central als „Highlight des Monats“ vor und widmete dem Ursprung des Projekts, seinem Universum und dem Code 066 einen eigenen Beitrag.",
      mediaButton: "IM ARIZAKI MAGAZIN LESEN",
      mediaSource: "Externe Veröffentlichung · Arizaki Magazin",
    },
    it: {
      sample: "LEGGI L’ANTEPRIMA GRATIS",
      buy: "OTTIENI LA LLAVE · CLP $15.990",
      noteLead: "Vendita diretta in Cile · Pagamento sicuro con Mercado Pago",
      kindle: "Disponibile anche su Kindle",
      mediaEyebrow: "LA LLAVE SUI MEDIA",
      mediaName: "RIVISTA ARIZAKI",
      mediaTitle: "IL NOSTRO DESTAQUE DEL MESE",
      mediaText:
        "La rivista Arizaki ha presentato La Llave I: Ciudad Central come “Destacado del mes”, dedicando spazio all’origine del progetto, al suo universo e al codice 066.",
      mediaButton: "LEGGI SU RIVISTA ARIZAKI",
      mediaSource: "Pubblicazione esterna · Rivista Arizaki",
    },
  };

  function currentLang() {
    const selector = document.querySelector('select[aria-label="Idioma"]');
    const lang =
      selector?.value ||
      document.querySelector("main.site")?.getAttribute("lang") ||
      document.documentElement.lang ||
      "es";

    return COPY[lang] ? lang : "en";
  }

  function getCopy() {
    return COPY[currentLang()] || COPY.es;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .hero-section .conversion-kindle-note {
        margin-top: 12px;
      }

      .hero-section .conversion-kindle-link {
        color: rgba(243, 239, 228, 0.78);
        font-weight: 700;
        text-decoration: underline;
        text-decoration-color: rgba(224, 168, 70, 0.48);
        text-underline-offset: 4px;
      }

      .hero-section .conversion-kindle-link:hover,
      .hero-section .conversion-kindle-link:focus-visible {
        color: #f0c264;
        outline: none;
      }

      #${ARIZAKI_ID} {
        position: relative;
        z-index: 10;
        width: min(1060px, calc(100% - 40px));
        margin: 58px auto 76px;
        color: #f3efe4;
        font-family: inherit;
      }

      #${ARIZAKI_ID} .az-shell {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
        gap: clamp(28px, 5vw, 68px);
        align-items: center;
        padding: clamp(28px, 5vw, 58px);
        border: 1px solid rgba(241, 193, 90, 0.22);
        background:
          radial-gradient(circle at 12% 20%, rgba(217, 155, 36, 0.13), transparent 28%),
          linear-gradient(135deg, rgba(7, 9, 10, 0.96), rgba(2, 3, 3, 0.92));
        box-shadow: 0 32px 90px rgba(0, 0, 0, 0.38);
      }

      #${ARIZAKI_ID} .az-media-visual {
        position: relative;
        display: block;
        overflow: hidden;
        border: 1px solid rgba(241, 193, 90, 0.22);
        background: rgba(0, 0, 0, 0.28);
        box-shadow: 0 22px 54px rgba(0, 0, 0, 0.38);
        text-decoration: none;
      }

      #${ARIZAKI_ID} .az-media-visual img {
        display: block;
        width: 100%;
        height: auto;
        max-height: 620px;
        object-fit: contain;
        background: #0a0a0a;
        transition: transform 220ms ease, filter 220ms ease;
      }

      #${ARIZAKI_ID} .az-media-visual:hover img,
      #${ARIZAKI_ID} .az-media-visual:focus-visible img {
        transform: scale(1.012);
        filter: brightness(1.04);
      }

      #${ARIZAKI_ID} .az-media-visual:focus-visible {
        outline: 1px solid rgba(241, 193, 90, 0.78);
        outline-offset: 4px;
      }

      #${ARIZAKI_ID} .az-copy {
        position: relative;
        z-index: 2;
      }

      #${ARIZAKI_ID} .az-eyebrow {
        margin: 0 0 12px;
        color: #e0a846;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      #${ARIZAKI_ID} .az-title {
        margin: 0;
        color: #f5f0e6;
        font: clamp(34px, 5vw, 58px)/1 Georgia, "Times New Roman", serif;
        text-transform: uppercase;
        text-wrap: balance;
      }

      #${ARIZAKI_ID} .az-text {
        margin: 20px 0 0;
        max-width: 680px;
        color: rgba(243, 239, 228, 0.72);
        font-size: clamp(15px, 1.6vw, 18px);
        line-height: 1.72;
      }

      #${ARIZAKI_ID} .az-source {
        margin: 15px 0 0;
        color: rgba(243, 239, 228, 0.42);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      #${ARIZAKI_ID} .az-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 50px;
        margin-top: 26px;
        padding: 0 22px;
        border: 1px solid rgba(241, 193, 90, 0.76);
        border-radius: 4px;
        color: #171109;
        background: linear-gradient(180deg, #f0c264, #b97a1b);
        box-shadow: 0 12px 40px rgba(217, 155, 36, 0.16);
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.14em;
        text-decoration: none;
        text-transform: uppercase;
        transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease;
      }

      #${ARIZAKI_ID} .az-button:hover,
      #${ARIZAKI_ID} .az-button:focus-visible {
        transform: translateY(-2px);
        filter: brightness(1.06);
        box-shadow: 0 16px 48px rgba(217, 155, 36, 0.24);
        outline: none;
      }

      @media (max-width: 760px) {
        #${ARIZAKI_ID} {
          width: calc(100% - 22px);
          margin: 44px auto 58px;
        }

        #${ARIZAKI_ID} .az-shell {
          grid-template-columns: 1fr;
          gap: 24px;
          padding: 22px 18px 26px;
        }

        #${ARIZAKI_ID} .az-media-visual img {
          max-height: none;
        }

        #${ARIZAKI_ID} .az-copy {
          text-align: center;
        }

        #${ARIZAKI_ID} .az-title {
          font-size: clamp(30px, 9.5vw, 44px);
        }

        #${ARIZAKI_ID} .az-text {
          margin-inline: auto;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${ARIZAKI_ID} *,
        .hero-section .conversion-kindle-link {
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function setLink(anchor, { href, text, target = "", rel = "" }) {
    if (!anchor) return;

    if (anchor.getAttribute("href") !== href) {
      anchor.setAttribute("href", href);
    }

    if (anchor.textContent.trim() !== text) {
      anchor.textContent = text;
    }

    if (target) {
      if (anchor.getAttribute("target") !== target) {
        anchor.setAttribute("target", target);
      }
    } else {
      anchor.removeAttribute("target");
    }

    if (rel) {
      if (anchor.getAttribute("rel") !== rel) {
        anchor.setAttribute("rel", rel);
      }
    } else {
      anchor.removeAttribute("rel");
    }
  }

  function applyHero() {
    const hero = document.querySelector(".hero-section");
    const row = hero?.querySelector(".cta-row");
    if (!row) return false;

    const anchors = Array.from(row.querySelectorAll("a"));
    if (anchors.length < 2) return false;

    const copy = getCopy();
    const sampleLink = anchors[0];
    const buyLink = anchors[1];

    sampleLink.classList.add("primary", "hero-sample-cta");
    sampleLink.classList.remove("hero-buy-cta");

    setLink(sampleLink, {
      href: `#${SAMPLE_ID}`,
      text: copy.sample,
    });

    buyLink.classList.add("hero-buy-cta");
    buyLink.classList.remove("primary");

    setLink(buyLink, {
      href: "#compra-directa",
      text: copy.buy,
    });

    const note = hero.querySelector(".hero-sale-note");
    if (note) {
      const lang = currentLang();
      const existingKindle = note.querySelector(".conversion-kindle-link");

      if (
        note.dataset.conversionLang !== lang ||
        !existingKindle
      ) {
        note.replaceChildren();

        const text = document.createTextNode(`${copy.noteLead} · `);
        const kindle = document.createElement("a");
        kindle.className = "conversion-kindle-link";
        kindle.href = KINDLE_URL;
        kindle.target = "_blank";
        kindle.rel = "noreferrer noopener";
        kindle.textContent = copy.kindle;

        note.append(text, kindle);
        note.classList.add("conversion-kindle-note");
        note.dataset.conversionLang = lang;
      }
    }

    return true;
  }

  function buildArizakiSection() {
    let section = document.getElementById(ARIZAKI_ID);

    if (!section) {
      section = document.createElement("section");
      section.id = ARIZAKI_ID;
      section.setAttribute("aria-labelledby", `${ARIZAKI_ID}-title`);

      section.innerHTML = `
        <div class="az-shell">
          <a
            class="az-media-visual"
            href="${ARIZAKI_URL}"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Abrir publicación de Revista Arizaki"
          >
            <img
              src="${ARIZAKI_IMAGE}"
              alt="Revista Arizaki presenta La Llave I: Ciudad Central como Nuestro destacado del mes"
              loading="lazy"
              decoding="async"
            />
          </a>

          <div class="az-copy">
            <p class="az-eyebrow"></p>
            <h2 class="az-title" id="${ARIZAKI_ID}-title"></h2>
            <p class="az-text"></p>
            <p class="az-source"></p>
            <a
              class="az-button"
              href="${ARIZAKI_URL}"
              target="_blank"
              rel="noreferrer noopener"
            ></a>
          </div>
        </div>
      `;
    }

    return section;
  }

  function updateArizakiCopy(section) {
    if (!section) return;

    const lang = currentLang();
    if (section.dataset.lang === lang) return;

    const copy = getCopy();

    const setText = (selector, value) => {
      const el = section.querySelector(selector);
      if (el && el.textContent !== value) el.textContent = value;
    };

    setText(".az-eyebrow", copy.mediaEyebrow);
    setText(".az-title", copy.mediaTitle);
    setText(".az-text", copy.mediaText);
    setText(".az-source", copy.mediaSource);
    setText(".az-button", copy.mediaButton);

    section.dataset.lang = lang;
  }

  function arrangeConversionFlow() {
    const sample = document.getElementById(SAMPLE_ID);
    const archive = document.getElementById(ARCHIVE_ID);
    const directSale = document.querySelector(".direct-sale-section");

    if (!sample || !archive || !directSale) return false;
    if (!sample.parentNode || sample.parentNode !== directSale.parentNode) {
      return false;
    }

    if (sample.nextElementSibling !== archive) {
      sample.insertAdjacentElement("afterend", archive);
    }

    let arizaki = document.getElementById(ARIZAKI_ID);
    if (!arizaki) {
      arizaki = buildArizakiSection();
    }

    updateArizakiCopy(arizaki);

    if (archive.nextElementSibling !== arizaki) {
      archive.insertAdjacentElement("afterend", arizaki);
    }

    return true;
  }

  let applyScheduled = false;

  function applyAll() {
    applyScheduled = false;
    injectStyles();
    applyHero();
    arrangeConversionFlow();
  }

  function scheduleApply() {
    if (applyScheduled) return;
    applyScheduled = true;

    window.requestAnimationFrame(() => {
      applyAll();
    });
  }

  const observer = new MutationObserver(scheduleApply);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  document.addEventListener("change", (event) => {
    if (
      event.target instanceof HTMLSelectElement &&
      event.target.matches('select[aria-label="Idioma"]')
    ) {
      window.setTimeout(applyAll, 0);
      window.setTimeout(applyAll, 80);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAll, { once: true });
  } else {
    applyAll();
  }

  window.setTimeout(applyAll, 250);
  window.setTimeout(applyAll, 900);
  window.setTimeout(applyAll, 1800);
})();
