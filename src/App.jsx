import { useEffect, useRef, useState } from "react";
import "./landing.css";

const CTA_LINKS = {
  ebook: "https://TU-LINK-EBOOK.com",
  physical: "https://TU-LINK-LIBRO-FISICO.com",
};

const SOCIALS = [
  { name: "Instagram", href: "https://instagram.com/TU_CUENTA", icon: "instagram" },
  { name: "TikTok", href: "https://www.tiktok.com/@TU_CUENTA", icon: "tiktok" },
  { name: "X", href: "https://x.com/TU_CUENTA", icon: "x" },
  { name: "YouTube", href: "https://www.youtube.com/@TU_CUENTA", icon: "youtube" },
];

const STORY_CARDS = [
  {
    title: "Noir urbano",
    copy: "Una ciudad húmeda, eléctrica y vigilada. Cada sombra parece esconder una respuesta.",
  },
  {
    title: "Código 066",
    copy: "Una llave marcada. Una memoria imposible. Una puerta que no debería existir.",
  },
  {
    title: "Thriller distópico",
    copy: "Suspenso, conspiración y una verdad enterrada bajo las luces de Ciudad Central.",
  },
];

const EDITIONS = [
  {
    title: "Versión e-book",
    lines: ["Lectura inmediata", "Disponible para Kindle", "Ideal para entrar hoy a Ciudad Central"],
    href: CTA_LINKS.ebook,
    cta: "Compra versión e-book",
  },
  {
    title: "Libro físico",
    lines: ["Edición coleccionable", "Formato tapa blanda", "La experiencia completa en papel"],
    href: CTA_LINKS.physical,
    cta: "Compra libro físico",
  },
];

function BrandIcon({ type }) {
  switch (type) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.2" cy="6.8" r="1.2" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 3v10.2a3.9 3.9 0 1 1-2.8-3.74V7.1l7-1.4v4.05a5.75 5.75 0 0 0 3.3 1.1V13a8.43 8.43 0 0 1-4.5-1.23v1.46a5.9 5.9 0 1 1-4.2-5.63V3h1.2Z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h3.2l5.02 6.68L17.4 4H20l-6.48 7.76L20.5 20H17.3l-5.32-7.02L6.1 20H3.5l6.94-8.35L4 4Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 8.2c0-1.54-1.15-2.76-2.62-2.95C16.77 5 14.4 5 12 5s-4.77 0-6.38.25C4.15 5.44 3 6.66 3 8.2v7.6c0 1.54 1.15 2.76 2.62 2.95 1.61.25 3.98.25 6.38.25s4.77 0 6.38-.25c1.47-.19 2.62-1.41 2.62-2.95V8.2ZM10 15.6V8.4l6 3.6-6 3.6Z" />
        </svg>
      );
    default:
      return null;
  }
}

function SoundIcon({ active }) {
  return active ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 14H2v-4h3l5-4v12l-5-4Zm8.5-7.5a7 7 0 0 1 0 11m3-14a11 11 0 0 1 0 17" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 14H2v-4h3l5-4v12l-5-4Zm8.75-4.75 7.25 7.25m0-7.25-7.25 7.25" />
    </svg>
  );
}

export default function App() {
  const [introOpen, setIntroOpen] = useState(true);
  const [ambienceOn, setAmbienceOn] = useState(false);
  const [musicVol, setMusicVol] = useState(0.24);
  const [rainVol, setRainVol] = useState(0.18);
  const [flash, setFlash] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const musicRef = useRef(null);
  const rainRef = useRef(null);
  const thunderRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mediaQuery.matches);
    sync();

    if (mediaQuery.addEventListener) mediaQuery.addEventListener("change", sync);
    else mediaQuery.addListener(sync);

    return () => {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener("change", sync);
      else mediaQuery.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVol;
    if (rainRef.current) rainRef.current.volume = rainVol;
  }, [musicVol, rainVol]);

  const startAmbience = async () => {
    const music = musicRef.current;
    const rain = rainRef.current;
    if (!music || !rain) return;

    music.volume = musicVol;
    rain.volume = rainVol;

    const results = await Promise.allSettled([music.play(), rain.play()]);
    setAmbienceOn(results.some((r) => r.status === "fulfilled"));
  };

  const stopAmbience = () => {
    [musicRef.current, rainRef.current, thunderRef.current].forEach((audio) => {
      if (!audio) return;
      audio.pause();
      if (audio !== thunderRef.current) audio.currentTime = 0;
    });
    setAmbienceOn(false);
  };

  const toggleAmbience = async () => {
    if (ambienceOn) stopAmbience();
    else await startAmbience();
  };

  useEffect(() => {
    if (!ambienceOn || reducedMotion) return;

    let cancelled = false;
    let thunderTimeoutId;
    let flashTimeoutId;

    const scheduleThunder = () => {
      const wait = 16000 + Math.random() * 16000;

      thunderTimeoutId = window.setTimeout(() => {
        if (cancelled) return;

        setFlash(true);

        const thunder = thunderRef.current;
        if (thunder) {
          thunder.currentTime = 0;
          thunder.volume = Math.min(0.36, Math.max(rainVol, musicVol) + 0.08);
          thunder.play().catch(() => {});
        }

        flashTimeoutId = window.setTimeout(() => setFlash(false), 420);
        scheduleThunder();
      }, wait);
    };

    scheduleThunder();

    return () => {
      cancelled = true;
      window.clearTimeout(thunderTimeoutId);
      window.clearTimeout(flashTimeoutId);
      setFlash(false);
    };
  }, [ambienceOn, reducedMotion, musicVol, rainVol]);

  const enterCity = async (withSound) => {
    setIntroOpen(false);
    if (withSound) await startAmbience();
    else stopAmbience();
  };

  return (
    <div className={`landing-shell ${flash ? "is-flashing" : ""}`}>
      <div className="bg-stack" aria-hidden="true">
        <img
          className="bg-image"
          src="/assets/ciudad-central-hero.webp"
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="bg-gradient" />
        <div className="bg-vignette" />
        <div className="bg-noise" />
        <div className="bg-rain" />
        <div className="bg-lightning" />
      </div>

      {introOpen && (
        <section className="intro-gate" aria-label="Entrada a Ciudad Central">
          <div className="intro-panel glass">
            <p className="eyebrow">Bienvenido a Ciudad Central</p>
            <h1 className="intro-title">
              La ciudad no te abre la puerta.
              <span>Te reconoce.</span>
            </h1>
            <p className="intro-copy">
              Doce horas. Una llave marcada con «066». Una memoria que no debería existir.
            </p>

            <div className="intro-actions">
              <button className="btn btn-primary" onClick={() => enterCity(true)}>
                Entrar con atmósfera
              </button>
              <button className="btn btn-secondary" onClick={() => enterCity(false)}>
                Entrar en silencio
              </button>
            </div>

            <p className="intro-note">
              Lluvia, tormenta y música noir bajo control del visitante.
            </p>
          </div>
        </section>
      )}

      <main className={`content ${introOpen ? "content--locked" : ""}`}>
        <section className="section hero">
          <div className="hero-copy">
            <p className="eyebrow">Acceso restringido</p>

            <h2 className="hero-title">
              <span className="hero-kicker">La Llave I</span>
              Ciudad Central
            </h2>

            <p className="hero-lead">
              Un thriller distópico de misterio, vigilancia y memoria prohibida.
              La verdad abre la puerta… y también la tumba.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href={CTA_LINKS.ebook} target="_blank" rel="noreferrer noopener">
                Compra versión e-book
              </a>
              <a className="btn btn-secondary" href={CTA_LINKS.physical} target="_blank" rel="noreferrer noopener">
                Compra libro físico
              </a>
            </div>

            <div className="micro-meta" aria-label="Características de la obra">
              <span>Thriller distópico</span>
              <span>Misterio urbano</span>
              <span>Código 066</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="key-stage" aria-hidden="true">
              <div className="key-glow" />
              <img
                className="key-image"
                src="/assets/llave-alpha.webp"
                alt=""
                loading="eager"
                decoding="async"
              />
            </div>

            <div className="glass side-note">
              <p className="side-note-label">Sistema 066</p>
              <p className="side-note-title">
                Una llave no aparece dos veces por accidente.
              </p>
              <p className="side-note-copy">
                Si el archivo tiene transparencia real, la llave flotará sin cuadro visible.
              </p>
            </div>
          </div>
        </section>

        <section className="section story-strip">
          {STORY_CARDS.map((card) => (
            <article key={card.title} className="glass card">
              <p className="card-label">Archivo</p>
              <h3 className="card-title">{card.title}</h3>
              <p className="card-copy">{card.copy}</p>
            </article>
          ))}
        </section>

        <section className="section editions">
          <div className="section-head">
            <p className="eyebrow">Compra</p>
            <h3 className="section-title">Dos formatos. Una sola puerta.</h3>
            <p className="section-copy">
              Entra a Ciudad Central desde Kindle o con la edición física.
            </p>
          </div>

          <div className="edition-grid">
            {EDITIONS.map((edition) => (
              <article key={edition.title} className="glass edition-card">
                <p className="edition-label">Edición disponible</p>
                <h4 className="edition-title">{edition.title}</h4>
                <ul className="edition-list">
                  {edition.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <a className="btn btn-primary edition-btn" href={edition.href} target="_blank" rel="noreferrer noopener">
                  {edition.cta}
                </a>
              </article>
            ))}
          </div>
        </section>

        <footer className="section footer">
          <div className="footer-copy">
            <p className="eyebrow">La Llave Oficial</p>
            <p className="footer-title">Ciudad Central ya está esperando.</p>
            <p className="footer-text">
              Síguenos para novedades, avances y contenido exclusivo del universo 066.
            </p>
          </div>

          <nav className="socials" aria-label="Redes sociales oficiales">
            {SOCIALS.map((social) => (
              <a key={social.name} className="social-link" href={social.href} target="_blank" rel="noreferrer noopener" aria-label={social.name} title={social.name}>
                <BrandIcon type={social.icon} />
              </a>
            ))}
          </nav>
        </footer>
      </main>

      <aside className="glass ambience-dock" aria-label="Controles de atmósfera">
        <button className="sound-toggle" aria-pressed={ambienceOn} onClick={toggleAmbience}>
          <SoundIcon active={ambienceOn} />
          <span>{ambienceOn ? "Atmósfera activada" : "Activar atmósfera"}</span>
        </button>

        <div className="slider-group">
          <label htmlFor="musicVol">Volumen música</label>
          <input id="musicVol" type="range" min="0" max="0.6" step="0.01" value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} />
        </div>

        <div className="slider-group">
          <label htmlFor="rainVol">Volumen lluvia</label>
          <input id="rainVol" type="range" min="0" max="0.6" step="0.01" value={rainVol} onChange={(e) => setRainVol(Number(e.target.value))} />
        </div>
      </aside>

      <audio ref={musicRef} src="/audio/ambience-noir.mp3" loop preload="metadata" />
      <audio ref={rainRef} src="/audio/rain-loop.mp3" loop preload="metadata" />
      <audio ref={thunderRef} src="/audio/thunder-soft.mp3" preload="none" />
    </div>
  );
}
