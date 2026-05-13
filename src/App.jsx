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
  kindle: "#",
  fisico: "#",
  instagram: "#",
  tiktok: "#",
  x: "#",
  youtube: "#",
  contacto: "mailto:contacto@lallaveoficial.com",
};

function Icon({ type }) {
  const icons = {
    instagram: (
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" /></svg>
    ),
    tiktok: (
      <svg viewBox="0 0 24 24"><path d="M14 3v10.2a3.8 3.8 0 1 1-3-3.7V7.1a6.2 6.2 0 1 0 5.2 6.1V8.4c1.1.9 2.4 1.4 3.8 1.5V7.2A4.8 4.8 0 0 1 16.2 3H14Z" /></svg>
    ),
    x: (
      <svg viewBox="0 0 24 24"><path d="M4 4h3.4l5.1 6.8L18.1 4H21l-7.1 8.4L21.5 20h-3.4l-5.7-7.4L6.2 20H3.3l7.7-9.1L4 4Z" /></svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24"><path d="M21 8.2c0-1.6-1.2-2.8-2.7-3C16.7 5 14.4 5 12 5s-4.7 0-6.3.2C4.2 5.4 3 6.6 3 8.2v7.6c0 1.6 1.2 2.8 2.7 3 1.6.2 3.9.2 6.3.2s4.7 0 6.3-.2c1.5-.2 2.7-1.4 2.7-3V8.2ZM10 15.5v-7l6 3.5-6 3.5Z" /></svg>
    ),
  };
  return icons[type] || null;
}

export default function App() {
  const [introOpen, setIntroOpen] = useState(true);
  const [audioOn, setAudioOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [musicVol, setMusicVol] = useState(0.28);
  const [rainVol, setRainVol] = useState(0.08);

  const musicRef = useRef(null);
  const audioCtxRef = useRef(null);
  const nodesRef = useRef([]);

  function stopGeneratedAudio() {
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
  }

  function stopAudio() {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
    stopGeneratedAudio();
    setAudioOn(false);
  }

  async function startAudio() {
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
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      nodesRef.current.push(master);

      createSoftRain(ctx, master, rainVol, nodesRef);
      createSoftThunder(ctx, master, setFlash, nodesRef);
    }

    setAudioOn(true);
  }

  function enter(withAudio) {
    setIntroOpen(false);
    if (withAudio) startAudio();
  }

  function toggleAudio() {
    audioOn ? stopAudio() : startAudio();
  }

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVol;
  }, [musicVol]);

  useEffect(() => () => stopAudio(), []);

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
              <button onClick={() => enter(true)}>Entrar con atmósfera</button>
              <button className="ghost" onClick={() => enter(false)}>Entrar en silencio</button>
            </div>
          </div>
        </section>
      )}

      <nav className="nav">
        <a className="brand" href="#inicio">
          <span className="brand-icon">066</span>
          <span>LA LLAVE I<small>CIUDAD CENTRAL</small></span>
        </a>

        <div className="nav-links">
          <a href="#inicio">Inicio</a>
          <a href="#historia">La historia</a>
          <a href="#universo">Universo</a>
          <a href="#ediciones">Ediciones</a>
          <a href="#prensa">Prensa</a>
          <a href="#contacto">Contacto</a>
        </div>

        <div className="nav-socials">
          <a href={LINKS.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon type="instagram" /></a>
          <a href={LINKS.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><Icon type="tiktok" /></a>
          <a href={LINKS.x} target="_blank" rel="noreferrer" aria-label="X"><Icon type="x" /></a>
          <a href={LINKS.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><Icon type="youtube" /></a>
        </div>
      </nav>

      <aside className="audio-top">
        <button onClick={toggleAudio}>{audioOn ? "Pausar atmósfera" : "Activar atmósfera"}</button>
        <label>Música <input type="range" min="0" max="0.8" step="0.01" value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} /></label>
        <label>Lluvia <input type="range" min="0" max="0.35" step="0.01" value={rainVol} onChange={(e) => setRainVol(Number(e.target.value))} /></label>
      </aside>

      <section id="inicio" className="hero-section">
        <div className="hero-copy">
          <p className="kicker spaced">Bienvenido a</p>
          <h2>Ciudad Central</h2>
          <div className="gold-line" />
          <p className="author">Un thriller distópico de Enrique G. Santibañez</p>
          <p className="lead">Doce horas. Una llave marcada con «066». Una memoria que no debería existir. La verdad abre la puerta… y también la tumba.</p>

          <div className="cta-row">
            <a className="cta primary" href={LINKS.kindle}>Compra versión e-book</a>
            <a className="cta secondary" href={LINKS.fisico}>Compra libro físico</a>
          </div>
        </div>

        <div className="hero-key">
          <img src={ASSETS.key} alt="Llave 066" />
          <p className="cryptic c1">No todas las puertas deben abrirse.</p>
          <p className="cryptic c2">La memoria también puede ser una condena.</p>
          <p className="cryptic c3">066 no es un número. Es una advertencia.</p>
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

      <section id="historia" className="history-section panel">
        <p className="kicker">La historia</p>
        <h2>La primera puerta de una saga que recién comienza.</h2>
        <p>
          Cuando Paula Garrido desaparece tras filtrar un video prohibido, su hermano Issei entra en una ciudad donde cada pista parece diseñada para hundirlo más. Junto a la detective Karen Ajraz, descubrirá que Ciudad Central no solo vigila: recuerda, castiga y borra.
        </p>
        <p>
          <strong>La Llave I: Ciudad Central</strong> es el inicio de una saga distópica chilena donde la verdad no se publica: se filtra, se persigue y se paga caro.
        </p>
      </section>

      <section id="universo" className="universe-section">
        <div className="panel map-card">
          <p className="kicker">Universo 066</p>
          <h2>Mapa táctico global</h2>
          <img src={ASSETS.map} alt="Mapa táctico del universo 066" />
          <button className="map-button" onClick={() => setMapOpen(true)}>Abrir mapa táctico</button>
        </div>

        <div className="saga-card panel">
          <h3>La Llave I: Ciudad Central</h3>
          <img src={ASSETS.mockup} alt="Mockup La Llave I Ciudad Central" />
          <p>Primera edición · Primer umbral</p>
        </div>

        <LockedBook title="LOCKED" />
        <LockedBook title="LOCKED" />
      </section>

      <section id="ediciones" className="editions-section">
        <article className="edition-card">
          <h3>Edición digital</h3>
          <h4>Versión e-book</h4>
          <p>Lectura inmediata para entrar hoy a Ciudad Central.</p>
          <a href={LINKS.kindle}>Compra versión e-book</a>
        </article>

        <article className="edition-card">
          <h3>Edición física</h3>
          <h4>Libro físico</h4>
          <p>Edición coleccionable en tapa blanda.</p>
          <a href={LINKS.fisico}>Compra libro físico</a>
        </article>
      </section>

      <section id="prensa" className="press-section">
        <Press title="La Llave I ya está disponible en formato físico" img={ASSETS.mockup}>
          La edición física llega como una pieza coleccionable para lectores que quieren entrar a Ciudad Central en papel.
        </Press>
        <Press title="Disponible en Kindle" img={ASSETS.key}>
          La versión e-book permite iniciar la experiencia de inmediato desde Amazon Kindle.
        </Press>
        <Press title="La novela chilena que abre una nueva puerta" img={ASSETS.map}>
          Una propuesta distópica, oscura y cinematográfica que busca llevar el thriller chileno a nuevas audiencias.
        </Press>
        <Press title="Camino a la internacionalización" img={ASSETS.hero}>
          El universo 066 se prepara para cruzar fronteras, idiomas y lectores.
        </Press>
      </section>

      <section id="contacto" className="contact-section panel">
        <p className="kicker">Contacto</p>
        <h2>Abre comunicación con Ciudad Central</h2>
        <form action={`mailto:${LINKS.contacto.replace("mailto:", "")}`} method="post" encType="text/plain">
          <input name="nombre" placeholder="Tu nombre" />
          <input name="email" placeholder="Tu correo" />
          <textarea name="mensaje" placeholder="Mensaje" rows="5" />
          <button>Enviar mensaje</button>
        </form>
      </section>

      <footer className="footer">
        <p>Saga La Llave © 2026 · Todos los derechos reservados.</p>
      </footer>

      {mapOpen && (
        <div className="modal" onClick={() => setMapOpen(false)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMapOpen(false)}>Cerrar</button>
            <img src={ASSETS.map} alt="Mapa táctico completo" />
          </div>
        </div>
      )}
    </main>
  );
}

function Background() {
  return (
    <div className="background">
      <img src={ASSETS.hero} alt="" />
      <div className="shade" />
      <div className="rain-layer r1" />
      <div className="rain-layer r2" />
      <div className="lightning" />
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

function LockedBook({ title }) {
  return (
    <article className="locked-book panel">
      <div className="locked-cover">?</div>
      <h3>{title}</h3>
      <p>Para desbloquear esta puerta, primero debes leer Ciudad Central.</p>
    </article>
  );
}

function Press({ title, img, children }) {
  return (
    <article className="press-card panel">
      <img src={img} alt="" />
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}

function createSoftRain(ctx, destination, volume, nodesRef) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.12;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1400;
  filter.Q.value = 0.45;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();

  nodesRef.current.push(source, filter, gain);
}

function createSoftThunder(ctx, destination, setFlash, nodesRef) {
  let active = true;

  const trigger = () => {
    if (!active) return;

    window.setTimeout(() => {
      if (!active) return;

      setFlash(true);
      window.setTimeout(() => setFlash(false), 420);

      const bufferSize = ctx.sampleRate * 1.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const decay = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * decay * decay * 0.45;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 110;

      const gain = ctx.createGain();
      gain.gain.value = 0.2;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start();

      nodesRef.current.push(source, filter, gain);
      trigger();
    }, 18000 + Math.random() * 18000);
  };

  trigger();

  nodesRef.current.push({ stop: () => { active = false; } });
}
