(() => {
  const SECTION_ID = "archivo-066-mailing";
  const STYLE_ID = "archivo-066-mailing-styles";

  if (document.getElementById(SECTION_ID)) return;

  const COPY = {
    es: {
      eyebrow: "ARCHIVO 066 · ACCESO PRIVADO",
      title: "HAY INFORMACIÓN QUE NO SE PUBLICA EN REDES.",
      lead:
        "Recibe expedientes, avances, material clasificado y novedades de La Llave directamente en tu correo.",
      name: "Tu nombre (opcional)",
      email: "Tu correo electrónico",
      consent:
        "Acepto recibir comunicaciones del Archivo 066 y entiendo que puedo darme de baja en cualquier momento.",
      button: "ACCEDER AL ARCHIVO",
      sending: "SOLICITANDO ACCESO…",
      success: "ACCESO CONCEDIDO. REVISA TU CORREO.",
      already: "TU ACCESO AL ARCHIVO 066 YA ESTÁ ACTIVO.",
      error: "NO PUDIMOS COMPLETAR EL ACCESO. INTENTA NUEVAMENTE.",
      fine:
        "Sin spam. Solo comunicaciones relacionadas con La Llave y el universo de Ciudad Central.",
    },
    en: {
      eyebrow: "FILE 066 · PRIVATE ACCESS",
      title: "SOME INFORMATION IS NEVER PUBLISHED ON SOCIAL MEDIA.",
      lead:
        "Receive files, previews, classified material and news from La Llave directly in your inbox.",
      name: "Your name (optional)",
      email: "Your email address",
      consent:
        "I agree to receive File 066 communications and understand that I can unsubscribe at any time.",
      button: "ACCESS THE FILE",
      sending: "REQUESTING ACCESS…",
      success: "ACCESS GRANTED. CHECK YOUR EMAIL.",
      already: "YOUR FILE 066 ACCESS IS ALREADY ACTIVE.",
      error: "WE COULD NOT COMPLETE ACCESS. PLEASE TRY AGAIN.",
      fine:
        "No spam. Only communications related to La Llave and the Central City universe.",
    },
    pt: {
      eyebrow: "ARQUIVO 066 · ACESSO PRIVADO",
      title: "HÁ INFORMAÇÕES QUE NÃO SÃO PUBLICADAS NAS REDES.",
      lead:
        "Receba arquivos, avanços, material classificado e novidades de La Llave diretamente no seu e-mail.",
      name: "Seu nome (opcional)",
      email: "Seu e-mail",
      consent:
        "Aceito receber comunicações do Arquivo 066 e entendo que posso cancelar a inscrição a qualquer momento.",
      button: "ACESSAR O ARQUIVO",
      sending: "SOLICITANDO ACESSO…",
      success: "ACESSO CONCEDIDO. VERIFIQUE SEU E-MAIL.",
      already: "SEU ACESSO AO ARQUIVO 066 JÁ ESTÁ ATIVO.",
      error: "NÃO FOI POSSÍVEL CONCLUIR O ACESSO. TENTE NOVAMENTE.",
      fine:
        "Sem spam. Apenas comunicações relacionadas a La Llave e ao universo de Ciudad Central.",
    },
    fr: {
      eyebrow: "DOSSIER 066 · ACCÈS PRIVÉ",
      title: "CERTAINES INFORMATIONS NE SONT JAMAIS PUBLIÉES SUR LES RÉSEAUX.",
      lead:
        "Recevez dossiers, aperçus, matériel classifié et nouvelles de La Llave directement par e-mail.",
      name: "Votre nom (facultatif)",
      email: "Votre adresse e-mail",
      consent:
        "J’accepte de recevoir les communications du Dossier 066 et je peux me désinscrire à tout moment.",
      button: "ACCÉDER AU DOSSIER",
      sending: "DEMANDE D’ACCÈS…",
      success: "ACCÈS ACCORDÉ. CONSULTEZ VOTRE E-MAIL.",
      already: "VOTRE ACCÈS AU DOSSIER 066 EST DÉJÀ ACTIF.",
      error: "IMPOSSIBLE DE FINALISER L’ACCÈS. RÉESSAYEZ.",
      fine:
        "Pas de spam. Uniquement des communications liées à La Llave et à l’univers de Ciudad Central.",
    },
    de: {
      eyebrow: "AKTE 066 · PRIVATER ZUGANG",
      title: "NICHT ALLE INFORMATIONEN WERDEN IN SOZIALEN MEDIEN VERÖFFENTLICHT.",
      lead:
        "Erhalte Akten, Vorschauen, klassifiziertes Material und Neuigkeiten zu La Llave direkt per E-Mail.",
      name: "Dein Name (optional)",
      email: "Deine E-Mail-Adresse",
      consent:
        "Ich stimme dem Erhalt von Mitteilungen aus Akte 066 zu und kann mich jederzeit abmelden.",
      button: "AKTE ÖFFNEN",
      sending: "ZUGANG WIRD ANGEFORDERT…",
      success: "ZUGANG GEWÄHRT. PRÜFE DEINE E-MAIL.",
      already: "DEIN ZUGANG ZU AKTE 066 IST BEREITS AKTIV.",
      error: "DER ZUGANG KONNTE NICHT ABGESCHLOSSEN WERDEN. BITTE ERNEUT VERSUCHEN.",
      fine:
        "Kein Spam. Nur Mitteilungen zu La Llave und dem Universum von Ciudad Central.",
    },
    it: {
      eyebrow: "FASCICOLO 066 · ACCESSO PRIVATO",
      title: "CI SONO INFORMAZIONI CHE NON VENGONO PUBBLICATE SUI SOCIAL.",
      lead:
        "Ricevi fascicoli, anteprime, materiale classificato e novità di La Llave direttamente via e-mail.",
      name: "Il tuo nome (opzionale)",
      email: "La tua e-mail",
      consent:
        "Accetto di ricevere comunicazioni dal Fascicolo 066 e posso annullare l’iscrizione in qualsiasi momento.",
      button: "ACCEDI AL FASCICOLO",
      sending: "RICHIESTA DI ACCESSO…",
      success: "ACCESSO CONCESSO. CONTROLLA LA TUA E-MAIL.",
      already: "IL TUO ACCESSO AL FASCICOLO 066 È GIÀ ATTIVO.",
      error: "IMPOSSIBILE COMPLETARE L’ACCESSO. RIPROVA.",
      fine:
        "Niente spam. Solo comunicazioni relative a La Llave e all’universo di Ciudad Central.",
    },
  };

  const getLang = () => {
    const selector = document.querySelector('select[aria-label="Idioma"]');
    return selector?.value || document.documentElement.lang || "es";
  };

  const getCopy = () => COPY[getLang()] || COPY.es;

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${SECTION_ID} {
        position: relative;
        z-index: 10;
        width: min(1040px, calc(100% - 40px));
        margin: 78px auto 74px;
        color: #f3efe4;
        font-family: inherit;
      }

      #${SECTION_ID} .a066-shell {
        position: relative;
        overflow: hidden;
        padding: clamp(30px, 5vw, 58px);
        border: 1px solid rgba(241, 193, 90, 0.24);
        background:
          radial-gradient(circle at 84% 14%, rgba(217,155,36,.13), transparent 27%),
          linear-gradient(135deg, rgba(8,10,11,.96), rgba(2,3,3,.92));
        box-shadow: 0 34px 90px rgba(0,0,0,.42);
      }

      #${SECTION_ID} .a066-shell::before {
        content: "066";
        position: absolute;
        right: -0.02em;
        top: -0.28em;
        color: rgba(241,193,90,.026);
        font: 900 clamp(180px, 29vw, 390px)/1 Georgia, serif;
        pointer-events: none;
      }

      #${SECTION_ID} .a066-grid {
        position: relative;
        z-index: 2;
        display: grid;
        grid-template-columns: minmax(0, .95fr) minmax(320px, .75fr);
        gap: clamp(28px, 6vw, 74px);
        align-items: center;
      }

      #${SECTION_ID} .a066-eyebrow {
        margin: 0 0 14px;
        color: #e2aa46;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .24em;
        text-transform: uppercase;
      }

      #${SECTION_ID} .a066-title {
        margin: 0;
        max-width: 700px;
        color: #f5f0e6;
        font: clamp(34px, 5vw, 58px)/1 Georgia, "Times New Roman", serif;
        letter-spacing: .01em;
        text-transform: uppercase;
        text-wrap: balance;
      }

      #${SECTION_ID} .a066-lead {
        margin: 20px 0 0;
        max-width: 620px;
        color: rgba(243,239,228,.68);
        font-size: clamp(15px, 1.7vw, 18px);
        line-height: 1.7;
      }

      #${SECTION_ID} .a066-form-wrap {
        padding: 24px;
        border: 1px solid rgba(241,193,90,.14);
        background: rgba(0,0,0,.34);
        backdrop-filter: blur(10px);
      }

      #${SECTION_ID} .a066-form {
        display: grid;
        gap: 13px;
      }

      #${SECTION_ID} .a066-input {
        width: 100%;
        min-height: 50px;
        padding: 0 15px;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 4px;
        outline: none;
        background: rgba(255,255,255,.035);
        color: #f5f0e6;
        font-size: 14px;
        transition: border-color .18s ease, background .18s ease;
      }

      #${SECTION_ID} .a066-input::placeholder {
        color: rgba(243,239,228,.38);
      }

      #${SECTION_ID} .a066-input:focus {
        border-color: rgba(241,193,90,.55);
        background: rgba(255,255,255,.055);
      }

      #${SECTION_ID} .a066-consent {
        display: grid;
        grid-template-columns: 18px 1fr;
        gap: 10px;
        align-items: start;
        margin-top: 3px;
        color: rgba(243,239,228,.57);
        font-size: 11px;
        line-height: 1.55;
      }

      #${SECTION_ID} .a066-consent input {
        width: 16px;
        height: 16px;
        margin: 1px 0 0;
        accent-color: #d99b24;
      }

      #${SECTION_ID} .a066-submit {
        min-height: 50px;
        margin-top: 3px;
        padding: 0 18px;
        border: 1px solid rgba(241,193,90,.75);
        border-radius: 4px;
        background: linear-gradient(180deg, #f0c264, #b97a1b);
        color: #171109;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: .15em;
        text-transform: uppercase;
        cursor: pointer;
        transition: transform .18s ease, filter .18s ease, box-shadow .18s ease;
      }

      #${SECTION_ID} .a066-submit:hover,
      #${SECTION_ID} .a066-submit:focus-visible {
        transform: translateY(-1px);
        filter: brightness(1.05);
        box-shadow: 0 14px 34px rgba(217,155,36,.18);
        outline: none;
      }

      #${SECTION_ID} .a066-submit:disabled {
        opacity: .58;
        cursor: wait;
        transform: none;
      }

      #${SECTION_ID} .a066-fine {
        margin: 3px 0 0;
        color: rgba(243,239,228,.34);
        font-size: 10px;
        line-height: 1.5;
        text-align: center;
      }

      #${SECTION_ID} .a066-status {
        display: none;
        margin: 6px 0 0;
        padding: 12px 13px;
        border: 1px solid rgba(241,193,90,.18);
        color: #ddc68d;
        background: rgba(217,155,36,.055);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: .08em;
        line-height: 1.45;
        text-align: center;
        text-transform: uppercase;
      }

      #${SECTION_ID} .a066-status.is-visible {
        display: block;
      }

      #${SECTION_ID} .a066-status.is-error {
        border-color: rgba(255,115,92,.26);
        color: #ffb09f;
        background: rgba(255,115,92,.055);
      }

      #${SECTION_ID} .a066-hp {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
      }

      @media (max-width: 760px) {
        #${SECTION_ID} {
          width: calc(100% - 22px);
          margin: 58px auto 54px;
        }

        #${SECTION_ID} .a066-shell {
          padding: 28px 18px;
        }

        #${SECTION_ID} .a066-grid {
          grid-template-columns: 1fr;
          gap: 26px;
        }

        #${SECTION_ID} .a066-copy {
          text-align: center;
        }

        #${SECTION_ID} .a066-title {
          font-size: clamp(30px, 9.6vw, 44px);
        }

        #${SECTION_ID} .a066-lead {
          margin-inline: auto;
        }

        #${SECTION_ID} .a066-form-wrap {
          padding: 18px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${SECTION_ID} * {
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  };

  const buildSection = () => {
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.setAttribute("aria-labelledby", `${SECTION_ID}-title`);

    section.innerHTML = `
      <div class="a066-shell">
        <div class="a066-grid">
          <div class="a066-copy">
            <p class="a066-eyebrow"></p>
            <h2 class="a066-title" id="${SECTION_ID}-title"></h2>
            <p class="a066-lead"></p>
          </div>

          <div class="a066-form-wrap">
            <form class="a066-form" novalidate>
              <label>
                <span class="a066-hp">Nombre</span>
                <input class="a066-input a066-name" type="text" name="name" autocomplete="name">
              </label>

              <label>
                <span class="a066-hp">Correo</span>
                <input class="a066-input a066-email" type="email" name="email" autocomplete="email" required>
              </label>

              <label class="a066-consent">
                <input type="checkbox" name="consent" required>
                <span class="a066-consent-copy"></span>
              </label>

              <div class="a066-hp" aria-hidden="true">
                <label>
                  Website
                  <input type="text" name="website" tabindex="-1" autocomplete="off">
                </label>
              </div>

              <button class="a066-submit" type="submit"></button>

              <p class="a066-fine"></p>
              <div class="a066-status" role="status" aria-live="polite"></div>
            </form>
          </div>
        </div>
      </div>
    `;

    return section;
  };

  const applyCopy = (section) => {
    const copy = getCopy();

    section.querySelector(".a066-eyebrow").textContent = copy.eyebrow;
    section.querySelector(".a066-title").textContent = copy.title;
    section.querySelector(".a066-lead").textContent = copy.lead;
    section.querySelector(".a066-name").placeholder = copy.name;
    section.querySelector(".a066-email").placeholder = copy.email;
    section.querySelector(".a066-consent-copy").textContent = copy.consent;
    section.querySelector(".a066-submit").textContent = copy.button;
    section.querySelector(".a066-fine").textContent = copy.fine;
  };

  const showStatus = (section, message, isError = false) => {
    const status = section.querySelector(".a066-status");
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.classList.add("is-visible");
  };

  const bindForm = (section) => {
    const form = section.querySelector(".a066-form");
    const button = section.querySelector(".a066-submit");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const copy = getCopy();
      const formData = new FormData(form);

      const email = String(formData.get("email") || "").trim();
      const name = String(formData.get("name") || "").trim();
      const website = String(formData.get("website") || "").trim();
      const consent = formData.get("consent") === "on";

      if (!email || !form.querySelector(".a066-email").checkValidity()) {
        form.querySelector(".a066-email").reportValidity();
        return;
      }

      if (!consent) {
        form.querySelector('input[name="consent"]').reportValidity();
        return;
      }

      button.disabled = true;
      button.textContent = copy.sending;

      try {
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            name,
            website,
            consent: true,
            source: "website_archivo_066",
            language: getLang(),
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || copy.error);
        }

        showStatus(
          section,
          data?.alreadySubscribed ? copy.already : copy.success,
          false
        );

        if (!data?.alreadySubscribed) {
          form.reset();
        }
      } catch (error) {
        showStatus(section, error?.message || copy.error, true);
      } finally {
        button.disabled = false;
        button.textContent = getCopy().button;
      }
    });
  };

  const mount = () => {
    if (location.pathname.startsWith("/press-kit") || location.pathname.startsWith("/presskit")) return false;
    if (location.pathname.startsWith("/compra-confirmada") || location.pathname.startsWith("/pago-") || location.pathname.startsWith("/payment")) return false;
    if (document.getElementById(SECTION_ID)) return true;

    const instagramSection = document.getElementById("instagram-showcase");
    const footer = document.querySelector("footer.footer");
    const anchor = instagramSection || footer;

    if (!anchor?.parentNode) return false;

    injectStyles();

    const section = buildSection();
    anchor.parentNode.insertBefore(section, anchor);

    applyCopy(section);
    bindForm(section);

    const langSelector = document.querySelector('select[aria-label="Idioma"]');
    if (langSelector) {
      langSelector.addEventListener("change", () => {
        requestAnimationFrame(() => applyCopy(section));
      });
    }

    return true;
  };

  if (mount()) return;

  const observer = new MutationObserver(() => {
    if (mount()) observer.disconnect();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
