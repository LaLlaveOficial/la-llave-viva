(() => {
  const SECTION_ID = "instagram-showcase";
  const STYLE_ID = "instagram-showcase-styles";
  const PROFILE_URL = "https://www.instagram.com/lallavesagaoficial/";
  const GRID_IMAGE = "/assets/instagram-grid-source.svg";
  const POST_URLS = [
    "https://www.instagram.com/p/DcM9ntqCrcX/",
    "https://www.instagram.com/p/DYuY8KNIOUo/",
    "https://www.instagram.com/reel/Da1MyKMETvA/",
    "https://www.instagram.com/reel/DcT0wn0Bi2S/",
    "https://www.instagram.com/reel/Db4JRXNBnnW/",
    "https://www.instagram.com/p/DZBOHDxjtab/",
    "https://www.instagram.com/reel/DYzwU1-DpCX/",
    "https://www.instagram.com/reel/DYnXeWOArxM/",
    "https://www.instagram.com/p/DY-3JaImhZI/",
  ];

  if (document.getElementById(SECTION_ID)) return;

  const COPY = {
    es: {
      eyebrow: "ARCHIVO SOCIAL · 066",
      title: "ENCUENTRA MÁS SEÑALES EN INSTAGRAM",
      subtitle: "Reels, fragmentos y secretos de Ciudad Central.",
      follow: "SEGUIR @LALLAVESAGAOFICIAL",
      open: "Ver en Instagram",
      label: "Abrir Instagram de La Llave Saga Oficial",
    },
    en: {
      eyebrow: "SOCIAL ARCHIVE · 066",
      title: "FIND MORE SIGNALS ON INSTAGRAM",
      subtitle: "Reels, fragments and secrets from Central City.",
      follow: "FOLLOW @LALLAVESAGAOFICIAL",
      open: "View on Instagram",
      label: "Open La Llave Saga Oficial on Instagram",
    },
    pt: {
      eyebrow: "ARQUIVO SOCIAL · 066",
      title: "ENCONTRE MAIS SINAIS NO INSTAGRAM",
      subtitle: "Reels, fragmentos e segredos da Cidade Central.",
      follow: "SEGUIR @LALLAVESAGAOFICIAL",
      open: "Ver no Instagram",
      label: "Abrir La Llave Saga Oficial no Instagram",
    },
    fr: {
      eyebrow: "ARCHIVE SOCIALE · 066",
      title: "RETROUVEZ PLUS DE SIGNAUX SUR INSTAGRAM",
      subtitle: "Reels, fragments et secrets de Ville Centrale.",
      follow: "SUIVRE @LALLAVESAGAOFICIAL",
      open: "Voir sur Instagram",
      label: "Ouvrir La Llave Saga Oficial sur Instagram",
    },
    de: {
      eyebrow: "SOZIALARCHIV · 066",
      title: "MEHR SIGNALE AUF INSTAGRAM",
      subtitle: "Reels, Fragmente und Geheimnisse aus Central City.",
      follow: "@LALLAVESAGAOFICIAL FOLGEN",
      open: "Auf Instagram ansehen",
      label: "La Llave Saga Oficial auf Instagram öffnen",
    },
    it: {
      eyebrow: "ARCHIVIO SOCIAL · 066",
      title: "TROVA ALTRI SEGNALI SU INSTAGRAM",
      subtitle: "Reel, frammenti e segreti di Ciudad Central.",
      follow: "SEGUI @LALLAVESAGAOFICIAL",
      open: "Vedi su Instagram",
      label: "Apri La Llave Saga Oficial su Instagram",
    },
  };

  const fallback = COPY.es;

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${SECTION_ID} {
        position: relative;
        width: min(820px, calc(100% - 40px));
        margin: 92px auto 76px;
        padding: 0;
        color: #f3eadb;
        font-family: inherit;
        isolation: isolate;
      }

      #${SECTION_ID}::before {
        content: "";
        position: absolute;
        inset: -34px -26px;
        z-index: -1;
        border: 1px solid rgba(197, 145, 63, 0.16);
        background:
          radial-gradient(circle at 50% 0%, rgba(159, 102, 30, 0.12), transparent 48%),
          linear-gradient(180deg, rgba(12, 15, 18, 0.82), rgba(4, 6, 8, 0.94));
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.35);
        pointer-events: none;
      }

      #${SECTION_ID} .ig-showcase-head {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: end;
        gap: 28px;
        margin-bottom: 28px;
      }

      #${SECTION_ID} .ig-showcase-copy {
        max-width: 640px;
      }

      #${SECTION_ID} .ig-showcase-eyebrow {
        margin: 0 0 10px;
        color: #c9954d;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      #${SECTION_ID} .ig-showcase-title {
        margin: 0;
        color: #f3eadb;
        font-size: clamp(1.55rem, 3vw, 2.65rem);
        line-height: 1.04;
        letter-spacing: 0.035em;
        text-transform: uppercase;
        text-wrap: balance;
      }

      #${SECTION_ID} .ig-showcase-subtitle {
        margin: 12px 0 0;
        color: rgba(243, 234, 219, 0.66);
        font-size: clamp(0.92rem, 1.6vw, 1.08rem);
        line-height: 1.55;
      }

      #${SECTION_ID} .ig-showcase-follow,
      #${SECTION_ID} .ig-showcase-bottom-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 46px;
        padding: 0 18px;
        border: 1px solid rgba(205, 151, 72, 0.58);
        background: rgba(15, 18, 21, 0.9);
        color: #f0d7ae;
        text-decoration: none;
        font-size: 0.76rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
      }

      #${SECTION_ID} .ig-showcase-follow:hover,
      #${SECTION_ID} .ig-showcase-follow:focus-visible,
      #${SECTION_ID} .ig-showcase-bottom-link:hover,
      #${SECTION_ID} .ig-showcase-bottom-link:focus-visible {
        transform: translateY(-2px);
        border-color: rgba(224, 176, 102, 0.95);
        background: rgba(36, 27, 18, 0.94);
        outline: none;
      }

      #${SECTION_ID} .ig-showcase-icon {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
      }

      #${SECTION_ID} .ig-showcase-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        width: min(686px, 100%);
        margin: 0 auto;
      }

      #${SECTION_ID} .ig-showcase-card {
        --ig-x: 0%;
        --ig-y: 0%;
        position: relative;
        display: block;
        aspect-ratio: 3 / 4;
        overflow: hidden;
        background-image: url("${GRID_IMAGE}");
        background-repeat: no-repeat;
        background-size: 300% 300%;
        background-position: var(--ig-x) var(--ig-y);
        image-rendering: auto;
        border: 1px solid rgba(255,255,255,0.055);
        text-decoration: none;
        transform: translateZ(0);
      }

      #${SECTION_ID} .ig-showcase-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 48%, rgba(0,0,0,0.76));
        opacity: 0;
        transition: opacity 180ms ease;
      }

      #${SECTION_ID} .ig-showcase-card::after {
        content: "↗  " attr(data-open);
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 13px;
        color: #fff7e9;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 180ms ease, transform 180ms ease;
      }

      #${SECTION_ID} .ig-showcase-card:hover::before,
      #${SECTION_ID} .ig-showcase-card:focus-visible::before,
      #${SECTION_ID} .ig-showcase-card:hover::after,
      #${SECTION_ID} .ig-showcase-card:focus-visible::after {
        opacity: 1;
      }

      #${SECTION_ID} .ig-showcase-card:hover::after,
      #${SECTION_ID} .ig-showcase-card:focus-visible::after {
        transform: translateY(0);
      }

      #${SECTION_ID} .ig-showcase-card:hover,
      #${SECTION_ID} .ig-showcase-card:focus-visible {
        outline: 1px solid rgba(221, 167, 84, 0.72);
        outline-offset: -1px;
      }

      #${SECTION_ID} .ig-showcase-bottom {
        display: none;
        margin-top: 18px;
        text-align: center;
      }

      #${SECTION_ID}.ig-showcase-visible {
        animation: igShowcaseIn 620ms cubic-bezier(.22,.8,.3,1) both;
      }

      @keyframes igShowcaseIn {
        from { opacity: 0; transform: translateY(22px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 760px) {
        #${SECTION_ID} {
          width: calc(100% - 22px);
          margin: 64px auto 54px;
        }

        #${SECTION_ID}::before {
          inset: -24px -10px;
        }

        #${SECTION_ID} .ig-showcase-head {
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 18px;
        }

        #${SECTION_ID} .ig-showcase-head > .ig-showcase-follow {
          display: none;
        }

        #${SECTION_ID} .ig-showcase-grid {
          gap: 3px;
        }

        #${SECTION_ID} .ig-showcase-card::before,
        #${SECTION_ID} .ig-showcase-card::after {
          display: none;
        }

        #${SECTION_ID} .ig-showcase-bottom {
          display: block;
        }

        #${SECTION_ID} .ig-showcase-bottom-link {
          width: 100%;
          min-height: 48px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${SECTION_ID},
        #${SECTION_ID} * {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const instagramIcon = `
    <svg class="ig-showcase-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="4.15" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17.45" cy="6.65" r="1.05" fill="currentColor"/>
    </svg>
  `;

  const positions = [
    ["0%", "0%"], ["50%", "0%"], ["100%", "0%"],
    ["0%", "50%"], ["50%", "50%"], ["100%", "50%"],
    ["0%", "100%"], ["50%", "100%"], ["100%", "100%"],
  ];

  const buildSection = () => {
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.setAttribute("aria-labelledby", "instagram-showcase-title");

    const cards = positions.map(([x, y], index) => `
      <a
        class="ig-showcase-card"
        href="${POST_URLS[index]}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir publicación ${index + 1} de La Llave Saga Oficial en Instagram"
        data-open="Ver publicación"
        style="--ig-x:${x};--ig-y:${y}"
      ></a>
    `).join("");

    section.innerHTML = `
      <div class="ig-showcase-head">
        <div class="ig-showcase-copy">
          <p class="ig-showcase-eyebrow"></p>
          <h2 class="ig-showcase-title" id="instagram-showcase-title"></h2>
          <p class="ig-showcase-subtitle"></p>
        </div>
        <a class="ig-showcase-follow" href="${PROFILE_URL}" target="_blank" rel="noopener noreferrer">
          ${instagramIcon}<span></span>
        </a>
      </div>
      <div class="ig-showcase-grid" aria-label="Selección de publicaciones de Instagram">
        ${cards}
      </div>
      <div class="ig-showcase-bottom">
        <a class="ig-showcase-bottom-link" href="${PROFILE_URL}" target="_blank" rel="noopener noreferrer">
          ${instagramIcon}<span></span>
        </a>
      </div>
    `;

    return section;
  };

  const currentLang = () => {
    const selector = document.querySelector('select[aria-label="Idioma"]');
    return selector?.value || "es";
  };

  const applyCopy = (section) => {
    const lang = currentLang();
    const copy = COPY[lang] || fallback;
    section.querySelector(".ig-showcase-eyebrow").textContent = copy.eyebrow;
    section.querySelector(".ig-showcase-title").textContent = copy.title;
    section.querySelector(".ig-showcase-subtitle").textContent = copy.subtitle;
    section.querySelector(".ig-showcase-follow span").textContent = copy.follow;
    section.querySelector(".ig-showcase-bottom-link span").textContent = copy.follow;
    section.querySelectorAll(".ig-showcase-card").forEach((card, index) => {
      card.dataset.open = copy.open;
      card.setAttribute("aria-label", `${copy.label} · ${index + 1}`);
    });
  };

  const mount = () => {
    if (location.pathname.startsWith("/press-kit") || location.pathname.startsWith("/presskit")) return false;
    if (location.pathname.startsWith("/compra-confirmada") || location.pathname.startsWith("/pago-") || location.pathname.startsWith("/payment")) return false;
    if (document.getElementById(SECTION_ID)) return true;

    const footer = document.querySelector("footer.footer");
    if (!footer) return false;

    injectStyles();
    const section = buildSection();
    footer.parentNode.insertBefore(section, footer);
    applyCopy(section);

    const langSelector = document.querySelector('select[aria-label="Idioma"]');
    if (langSelector) {
      langSelector.addEventListener("change", () => {
        requestAnimationFrame(() => applyCopy(section));
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          section.classList.add("ig-showcase-visible");
          observer.disconnect();
        }
      });
    }, { threshold: 0.12 });
    observer.observe(section);

    return true;
  };

  if (mount()) return;

  const domObserver = new MutationObserver(() => {
    if (mount()) domObserver.disconnect();
  });

  domObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
