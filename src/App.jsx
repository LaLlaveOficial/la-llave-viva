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
};

const LINKS = {
  ebook: "#",
  fisico: "#",
  instagram: "#",
  tiktok: "#",
  x: "#",
  youtube: "#",
};

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3v10.2a3.8 3.8 0 1 1-3-3.7V7.1a6.2 6.2 0 1 0 5.2 6.1V8.4c1.1.9 2.4 1.4 3.8 1.5V7.2A4.8 4.8 0 0 1 16.2 3H14Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h3.4l5.1 6.8L18.1 4H21l-7.1 8.4L21.5 20h-3.4l-5.7-7.4L6.2 20H3.3l7.7-9.1L4 4Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 8.2c0-1.6-1.2-2.8-2.7-3C16.7 5 14.4 5 12 5s-4.7 0-6.3.2C4.2 5.4 3 6.6 3 8.2v7.6c0 1.6 1.2 2.8 2.7 3 1.6.2 3.9.2 6.3.2s4.7 0 6.3-.2c1.5-.2 2.7-1.4 2.7-3V8.2ZM10 15.5v-7l6 3.5-6 3.5Z" />
    </svg>
  );
}

function Social({ href, label, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" aria-label={label} title={label}>
      {children}
    </a>
  );
}

export default function App() {
  const [introOpen, setIntroOpen] = useState(true);
  const [audioOn, setAudioOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [musicVol, setMusicVol] = useState(0.35);
  const [rainVol, setRainVol] = useState(0.22);

  const musicRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioNodesRef = useRef([]);

  const stopGeneratedAudio = () => {
    audioNodesRef.current.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {}
    });
    audioNodesRef.current = [];

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const stopAudio = () => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }

    stopGeneratedAudio();
    setAudioOn(false);
  };

  const startAudio = async () => {
    stopGeneratedAudio();

    if (musicRef.current) {
      musicRef.current.volume = musicVol;
      await musicRef.current.play().catch(() => {});
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(ctx.destination);
      audioNodesRef.current.push(master);

      createRain(ctx, master, rainVol, audioNodesRef);
      createThunder(ctx, master, setFlash, audioNodesRef);
    }

    setAudioOn(true);
  };

  const toggleAudio = async () => {
    if (audioOn) stopAudio();
    else await startAudio();
  };

  const enterCity = async (withAudio) => {
    setIntroOpen(false);
    if (withAudio) await startAudio();
  };

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVol;
  }, [musicVol]);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  return (
    <main className={`site ${flash ? "storm-flash" : ""}`}>
      <audio ref={musicRef} src={AUDIO.noir} loop preload="metadata" />

      <Background />
      <HazardBorders />

      {introOpen && (
        <section className="intro">
          <div className="intro-card">
            <p className="kicker">Sistema 066 · Acceso restringido</p>
            <h1>Bienvenido a Ciudad Central</h1>
            <p>Doce horas. Una llave marcada con «066». Una memoria que no debería existir.</p>
            <div className="intro-actions">
              <button onClick={() => enterCity(true)}>Entrar con atmósfera</button>
              <button className="ghost" onClick={() => enterCity(false)}>Entrar en silencio</button>
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
          <Social href={LINKS.instagram} label="Instagram"><InstagramIcon /></Social>
          <Social href={LINKS.tiktok} label="TikTok"><TikTokIcon /></Social>
          <Social href={LINKS.x} label="X"><XIcon /></Social>
          <Social href={LINKS.youtube} label="YouTube"><YouTubeIcon /></Social>
        </div>
      </nav>

      <section id="inicio" className="hero-section">
        <div className="hero-copy">
          <p className="kicker spaced">Bienvenido a</p>
          <h2>Ciudad Central</h2>
          <div className="gold-line" />
          <p className="author">Un thriller distópico de Enrique G. Santibañez</p>
          <p className="lead">
            Doce horas. Una llave marcada con «066». Una memoria que no debería existir.
            La verdad abre la puerta… y también la tumba.
          </p>

          <div className="cta-row">
            <a className="cta primary" href={LINKS.ebook}>Compra versión e-book</a>
            <a className="cta secondary" href={LINKS.fisico}>Compra libro físico</a>
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
            <li><span>Código:</span><b>066</b></li>
            <li><span>Nivel:</span><b>Ómega</b></li>
            <li><span>Estado:</span><b>Activo</b></li>
          </ul>
          <div className="mini-map" />
          <p className="sync">Sincronización global 98.7%</p>
          <div className="bars">{Array.from({ length: 18 }).map((_, i) => <i key={i} />)}</div>
        </aside>
      </section>

      <section id="historia" className="story-cards">
        <Card icon="▥" title="Noir urbano">Una ciudad húmeda, eléctrica y vigilada. Cada sombra parece esconder una respuesta.</Card>
        <Card icon="⚿" title="Código 066">Una llave marcada. Una memoria imposible. Una puerta que no debería existir.</Card>
        <Card icon="▣" title="Thriller distópico">Suspenso, conspiración y una verdad enterrada bajo las luces de Ciudad Central.</Card>
      </section>

      <section id="universo" className="universe-grid">
        <article className="map-card">
          <p className="kicker">Sistema de vigilancia integral</p>
          <h3>Visión global · Control total</h3>
          <img src={ASSETS.map} alt="Mapa táctico del universo 066" />
          <a className="map-button" href={ASSETS.map} target="_blank" rel="noreferrer">Ver mapa táctico 066 →</a>
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
          <Social href={LINKS.instagram} label="Instagram"><InstagramIcon /></Social>
          <Social href={LINKS.tiktok} label="TikTok"><TikTokIcon /></Social>
          <Social href={LINKS.x} label="X"><XIcon /></Social>
          <Social href={LINKS.youtube} label="YouTube"><YouTubeIcon /></Social>
        </div>
      </footer>

      <aside className="audio-dock">
        <button onClick={toggleAudio}>
          <span>{audioOn ? "⏸" : "▶"}</span>
          {audioOn ? "Atmósfera noir" : "Activar atmósfera"}
        </button>

        <label>
          Música
          <input type="range" min="0" max="0.8" step="0.01" value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} />
        </label>

        <label>
          Lluvia
          <input type="range" min="0" max="0.8" step="0.01" value={rainVol} onChange={(e) => setRainVol(Number(e.target.value))} />
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
      <div className="rain rain-a" />
      <div className="rain rain-b" />
      <div className="lightning" />
      <div className="noise" />
    </div>
  );
}

function HazardBorders() {
  return (
    <>
      <div className="hazard hazard-left"><img src={ASSETS.stripe} alt="" /></div>
      <div className="hazard hazard-right"><img src={ASSETS.stripe} alt="" /></div>
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

function createRain(ctx, destination, volume, audioNodesRef) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.35;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 850;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();

  audioNodesRef.current.push(source, filter, gain);
}

function createThunder(ctx, destination, setFlash, audioNodesRef) {
  let active = true;

  const trigger = () => {
    if (!active) return;

    const wait = 11000 + Math.random() * 13000;

    window.setTimeout(() => {
      if (!active) return;

      setFlash(true);
      window.setTimeout(() => setFlash(false), 520);

      const bufferSize = ctx.sampleRate * 1.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const decay = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * decay * decay * 0.9;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 160;

      const gain = ctx.createGain();
      gain.gain.value = 0.42;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start();

      audioNodesRef.current.push(source, filter, gain);
      trigger();
    }, wait);
  };

  trigger();

  audioNodesRef.current.push({
    stop: () => {
      active = false;
    },
  });
}
