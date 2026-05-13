import { useEffect, useRef, useState } from "react";
import "./landing.css";

const ASSETS = {
  hero: "/assets/ciudad-central-hero.webp",
  key: "/assets/llave-alpha.webp",
  map: "/assets/mapa-universo.webp",
  mockup: "/assets/mockup-portada-original.webp",
  stripe: "/assets/la-llave-hazard-stripe.png",
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
  const [musicVol, setMusicVol] = useState(0.18);
  const [rainVol, setRainVol] = useState(0.22);

  const audioCtxRef = useRef(null);
  const nodesRef = useRef([]);

  function stopAudio() {
    nodesRef.current.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {}
    });
    nodesRef.current = [];

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    setAudioOn(false);
  }

  function startAudio() {
    stopAudio();

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.75;
    master.connect(ctx.destination);
    nodesRef.current.push(master);

    createRain(ctx, master, rainVol);
    createNoirDrone(ctx, master, musicVol);
    createThunderLoop(ctx, master, setFlash);

    setAudioOn(true);
  }

  function toggleAudio() {
    if (audioOn) stopAudio();
    else startAudio();
  }

  function enterCity(withAudio) {
    setIntroOpen(false);
    if (withAudio) startAudio();
  }

  useEffect(() => {
    return () => stopAudio();
  }, []);

  return (
    <main className={`site ${flash ? "storm-flash" : ""}`}>
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
            <li><span>Código:</span> <b>066</b></li>
            <li><span>Nivel:</span> <b>Ómega</b></li>
            <li><span>Estado:</span> <b>Activo</b></li>
          </ul>
          <div className="mini-map" />
          <p className="sync">Sincronización global 98.7%</p>
          <div className="bars">
            {Array.from({ length: 18 }).map((_, i) => <i key={i} />)}
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

function createRain(ctx, destination, volume) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.28;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();

  nodesPush(source, filter, gain);
}

function createNoirDrone(ctx, destination, volume) {
  const gain = ctx.createGain();
  gain.gain.value = volume;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 520;

  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 55;

  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.value = 82.41;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.08;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.05;

  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc1.start();
  osc2.start();
  lfo.start();

  nodesPush(osc1, osc2, lfo, lfoGain, filter, gain);
}

function createThunderLoop(ctx, destination, setFlash) {
  let cancelled = false;

  const trigger = () => {
    if (cancelled) return;

    const wait = 14000 + Math.random() * 18000;

    setTimeout(() => {
      if (cancelled) return;

      setFlash(true);
      setTimeout(() => setFlash(false), 420);

      const bufferSize = ctx.sampleRate * 1.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const decay = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * decay * decay;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 140;

      const gain = ctx.createGain();
      gain.gain.value = 0.38;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start();

      trigger();
    }, wait);
  };

  trigger();

  const stopper = { stop: () => { cancelled = true; } };
  nodesPush(stopper);
}

function nodesPush(...nodes) {
  window.__llaveAudioNodes = window.__llaveAudioNodes || [];
  window.__llaveAudioNodes.push(...nodes);
}
