import { useEffect, useRef, useState } from "react";
import "./landing.css";

const ASSETS = {
  hero: "/assets/ciudad-central-hero.webp",
  key: "/assets/llave-alpha.webp",
  map: "/assets/mapa-universo.webp",
  mockup: "/assets/mockup-portada-original.webp",
  stripe: "/assets/la-llave-hazard-stripe.png",
};

const AUDIO = {
  noir: "/audio/ambience-noir.mp3",
  rain: "/audio/rain-loop.mp3",
  thunder: "/audio/thunder-soft.mp3",
};

const LINKS = {
  ebook: "#",
  fisico: "#",
  instagram: "#",
  tiktok: "#",
  x: "#",
  youtube: "#",
};

export default function App() {
  const [introOpen, setIntroOpen] = useState(true);
  const [audioOn, setAudioOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [musicVol, setMusicVol] = useState(0.22);
  const [rainVol, setRainVol] = useState(0.2);

  const musicRef = useRef(null);
  const rainRef = useRef(null);
  const thunderRef = useRef(null);

  async function startAudio() {
    if (!musicRef.current || !rainRef.current) return;

    musicRef.current.volume = musicVol;
    rainRef.current.volume = rainVol;

    const result = await Promise.allSettled([
      musicRef.current.play(),
      rainRef.current.play(),
    ]);

    setAudioOn(result.some((r) => r.status === "fulfilled"));
  }

  function stopAudio() {
    [musicRef.current, rainRef.current, thunderRef.current].forEach((audio) => {
      if (!audio) return;
      audio.pause();
    });
    setAudioOn(false);
  }

  async function enterCity(withAudio) {
    setIntroOpen(false);
    if (withAudio) await startAudio();
  }

  async function toggleAudio() {
    if (audioOn) stopAudio();
    else await startAudio();
  }

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVol;
    if (rainRef.current) rainRef.current.volume = rainVol;
  }, [musicVol, rainVol]);

  useEffect(() => {
    if (!audioOn) return;

    let timeout;
    let flashTimeout;

    const loop = () => {
      timeout = window.setTimeout(() => {
        setFlash(true);

        if (thunderRef.current) {
          thunderRef.current.currentTime = 0;
          thunderRef.current.volume = 0.32;
          thunderRef.current.play().catch(() => {});
        }

        flashTimeout = window.setTimeout(() => setFlash(false), 350);
        loop();
      }, 15000 + Math.random() * 17000);
    };

    loop();

    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(flashTimeout);
    };
  }, [audioOn]);

  return (
    <main className={`site ${flash ? "storm-flash" : ""}`}>
      <audio ref={musicRef} src={AUDIO.noir} loop preload="metadata" />
      <audio ref={rainRef} src={AUDIO.rain} loop preload="metadata" />
      <audio ref={thunderRef} src={AUDIO.thunder} preload="none" />

      <Background />
      <HazardBorders />

      {introOpen && (
        <section className="intro">
          <div className="intro-card">
            <p className="kicker">Sistema 066 · Acceso restringido</p>
            <h1>Bienvenido a Ciudad Central</h1>
            <p>
              Doce horas. Una llave marcada con «066». Una memoria que no
              debería existir.
            </p>
            <div className="intro-actions">
              <button onClick={() => enterCity(true)}>Entrar con atmósfera</button>
              <button className="ghost" onClick={() => enterCity(false)}>
                Entrar en silencio
              </button>
            </div>
          </div>
        </section>
      )}

      <nav className="nav">
        <a className="brand" href="#inicio">
          <span className="brand-icon">066</span>
          <span>
            LA LLAVE I
            <small>CIUDAD CENTRAL</small>
          </span>
        </a>

        <div className="nav-links">
          <a href="#inicio">Inicio</a>
          <a href="#historia">La historia</a>
          <a href="#universo">El universo 066</a>
          <a href="#ediciones">Ediciones</a>
        </div>

        <div className="nav-socials">
          <Social href={LINKS.instagram} label="Instagram" icon="◎" />
          <Social href={LINKS.tiktok} label="TikTok" icon="♪" />
          <Social href={LINKS.x} label="X" icon="𝕏" />
          <Social href={LINKS.youtube} label="YouTube" icon="▶" />
        </div>
      </nav>

      <section id="inicio" className="hero-section">
        <div className="hero-copy">
          <p className="kicker spaced">Bienvenido a</p>
          <h2>Ciudad Central</h2>
          <div className="gold-line" />
          <p className="author">Un thriller distópico de Enrique G. Santibañez</p>
          <p className="lead">
            Doce horas. Una llave marcada con «066». Una memoria que no debería
            existir. La verdad abre la puerta… y también la tumba.
          </p>

          <div className="cta-row">
            <a className="cta primary" href={LINKS.ebook}>
              <span>▱</span> Compra versión e-book
            </a>
            <a className="cta secondary" href={LINKS.fisico}>
              <span>▱</span> Compra libro físico
            </a>
          </div>

          <div className="meta-line">
            <span>▣ Acceso restringido</span>
            <span>Sistema de vigilancia integral</span>
          </div>
        </div>

        <div className="hero-key">
          <div className="radar-ring" />
          <img src={ASSETS.key} alt="Llave 066" />
        </div>

        <aside className="system-panel">
          <h3>Sistema 066</h3>
          <p>Control total</p>
          <ul>
            <li>
              <span>Código:</span> <b>066</b>
            </li>
            <li>
              <span>Nivel:</span> <b>Ómega</b>
            </li>
            <li>
              <span>Estado:</span> <b>Activo</b>
            </li>
          </ul>
          <div className="mini-map" />
          <p className="sync">Sincronización global 98.7%</p>
          <div className="bars">
            {Array.from({ length: 18 }).map((_, i) => (
              <i key={i} />
            ))}
          </div>
        </aside>
      </section>

      <section id="historia" className="story-cards">
        <Card icon="▥" title="Noir urbano">
          Una ciudad húmeda, eléctrica y vigilada. Cada sombra parece esconder
          una respuesta.
        </Card>
        <Card icon="⚿" title="Código 066">
          Una llave marcada. Una memoria imposible. Una puerta que no debería
          existir.
        </Card>
        <Card icon="▣" title="Thriller distópico">
          Suspenso, conspiración y una verdad enterrada bajo las luces de Ciudad
          Central.
        </Card>
      </section>

      <section id="universo" className="universe-grid">
        <article className="map-card">
          <div className="map-card-head">
            <p className="kicker">Sistema de vigilancia integral</p>
            <h3>Visión global · Control total</h3>
          </div>
          <img src={ASSETS.map} alt="Mapa táctico del universo 066" />
          <a className="map-button" href={ASSETS.map} target="_blank" rel="noreferrer">
            Ver mapa táctico 066 →
          </a>
        </article>

        <article className="book-showcase">
          <img src={ASSETS.mockup} alt="Mockup La Llave I: Ciudad Central" />
        </article>

        <article id="ediciones" className="edition-card">
          <h3>Edición digital</h3>
          <h4>Versión e-book</h4>
          <ul>
            <li>Lectura inmediata</li>
            <li>Disponible para Kindle</li>
            <li>Ideal para entrar hoy a Ciudad Central</li>
          </ul>
          <a href={LINKS.ebook}>Compra versión e-book</a>
        </article>

        <article className="edition-card">
          <h3>Edición física</h3>
          <h4>Libro físico</h4>
          <ul>
            <li>Edición coleccionable</li>
            <li>Formato tapa blanda</li>
            <li>La experiencia completa en papel</li>
          </ul>
          <a href={LINKS.fisico}>Compra libro físico</a>
        </article>
      </section>

      <footer className="footer">
        <p>La verdad abre la puerta... y también la tumba.</p>
        <div className="footer-socials">
          <Social href={LINKS.instagram} label="Instagram" icon="◎" />
          <Social href={LINKS.tiktok} label="TikTok" icon="♪" />
          <Social href={LINKS.x} label="X" icon="𝕏" />
          <Social href={LINKS.youtube} label="YouTube" icon="▶" />
        </div>
      </footer>

      <aside className="audio-dock">
        <button onClick={toggleAudio}>
          <span>{audioOn ? "⏸" : "▶"}</span>
          {audioOn ? "Atmósfera noir" : "Activar atmósfera"}
        </button>

        <label>
          Música
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.01"
            value={musicVol}
            onChange={(e) => setMusicVol(Number(e.target.value))}
          />
        </label>

        <label>
          Lluvia
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.01"
            value={rainVol}
            onChange={(e) => setRainVol(Number(e.target.value))}
          />
        </label>
      </aside>
    </main>
  );
}

function Background() {
  return (
    <div className="background">
      <img src={ASSETS.hero} alt="" />
      <div className="shade" />
      <div className="rain" />
      <div className="lightning" />
      <div className="noise" />
    </div>
  );
}

function HazardBorders() {
  return (
    <>
      <div className="hazard hazard-left">
        <img src={ASSETS.stripe} alt="" />
      </div>
      <div className="hazard hazard-right">
        <img src={ASSETS.stripe} alt="" />
      </div>
    </>
  );
}

function Card({ icon, title, children }) {
  return (
    <article className="story-card">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}

function Social({ href, label, icon }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
      {icon}
    </a>
  );
}
