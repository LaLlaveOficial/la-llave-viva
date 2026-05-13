import { useEffect, useRef, useState } from "react";
import "./landing.css";

const LANGS = {
  es: {
    inicio: "Inicio",
    historia: "La Historia",
    universo: "Universo",
    ediciones: "Ediciones",
    prensa: "Prensa",
    contacto: "Contacto",
    bienvenida: "Bienvenido a",
    titulo: "Ciudad Central",
    subtitulo: "Un thriller distópico de Enrique G. Santibañez",
    texto:
      "Doce horas. Una llave marcada con «066». Una memoria que no debería existir. La verdad abre la puerta... y también la tumba.",
    ebook: "Compra versión e-book",
    fisico: "Compra libro físico",
  },

  en: {
    inicio: "Home",
    historia: "Story",
    universo: "Universe",
    ediciones: "Editions",
    prensa: "Press",
    contacto: "Contact",
    bienvenida: "Welcome to",
    titulo: "Central City",
    subtitulo: "A dystopian thriller by Enrique G. Santibañez",
    texto:
      "Twelve hours. A key marked «066». A memory that should not exist.",
    ebook: "Buy e-book version",
    fisico: "Buy physical book",
  },

  fr: {
    inicio: "Accueil",
    historia: "Histoire",
    universo: "Univers",
    ediciones: "Éditions",
    prensa: "Presse",
    contacto: "Contact",
    bienvenida: "Bienvenue à",
    titulo: "Ville Centrale",
    subtitulo: "Un thriller dystopique",
    texto:
      "Douze heures. Une clé marquée «066». Une mémoire impossible.",
    ebook: "Acheter ebook",
    fisico: "Acheter livre physique",
  },
};

const WORDS = [
  "066",
  "OMEGA",
  "CONTROL",
  "VIGILANCIA",
  "MEMORIA",
  "ACCESO",
  "DISTOPÍA",
  "PUERTA",
];

export default function App() {
  const [lang, setLang] = useState("es");
  const t = LANGS[lang];

  const rainRef = useRef(null);
  const noirRef = useRef(null);

  const [musicVolume, setMusicVolume] = useState(0.28);
  const [rainVolume, setRainVolume] = useState(0.14);

  const [omegaText, setOmegaText] = useState("OMEGA");
  const [percent, setPercent] = useState(98);

  useEffect(() => {
    if (rainRef.current) rainRef.current.volume = rainVolume;
  }, [rainVolume]);

  useEffect(() => {
    if (noirRef.current) noirRef.current.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    const int = setInterval(() => {
      let txt = "";
      for (let i = 0; i < 5; i++) {
        txt += matrixChars[Math.floor(Math.random() * matrixChars.length)];
      }

      setOmegaText(txt);

      setTimeout(() => {
        setOmegaText("OMEGA");
      }, 350);

      setPercent(94 + Math.floor(Math.random() * 6));
    }, 2200);

    return () => clearInterval(int);
  }, []);

  return (
    <div className="site">

      {/* AUDIO */}
      <audio
        ref={rainRef}
        src="/audio/rain-thunder.mp3"
        autoPlay
        loop
      />

      <audio
        ref={noirRef}
        src="/audio/ambience-noir.mp3"
        autoPlay
        loop
      />

      {/* BACKGROUND */}
      <div className="background-wrap">
        <img
          src="/assets/ciudad-central-hero.webp"
          className="bg-city"
          alt=""
        />

        <div className="bg-overlay" />

        <div className="rain rain-1" />
        <div className="rain rain-2" />
        <div className="rain rain-3" />

        <div className="lightning lightning-1" />
        <div className="lightning lightning-2" />
      </div>

      {/* HAZARD */}
      <div className="hazard left" />
      <div className="hazard right" />

      {/* NAV */}
      <nav className="nav">
        <div className="logo">
          <span className="circle">066</span>

          <div>
            <h1>LA LLAVE I</h1>
            <p>CIUDAD CENTRAL</p>
          </div>
        </div>

        <div className="nav-links">
          <a href="#inicio">{t.inicio}</a>
          <a href="#historia">{t.historia}</a>
          <a href="#universo">{t.universo}</a>
          <a href="#ediciones">{t.ediciones}</a>
          <a href="#prensa">{t.prensa}</a>
          <a href="#contacto">{t.contacto}</a>
        </div>

        <div className="nav-right">
          <div className="socials">
            <a href="#"><i className="fab fa-instagram" /></a>
            <a href="#"><i className="fab fa-tiktok" /></a>
            <a href="#"><i className="fab fa-x-twitter" /></a>
            <a href="#"><i className="fab fa-youtube" /></a>
          </div>

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="lang-select"
          >
            <option value="es">ES</option>
            <option value="en">EN</option>
            <option value="fr">FR</option>
          </select>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="inicio">

        <div className="hero-left">

          <span className="mini">{t.bienvenida}</span>

          <h2>{t.titulo}</h2>

          <div className="line" />

          <p className="subtitle">{t.subtitulo}</p>

          <p className="hero-text">{t.texto}</p>

          <div className="hero-buttons">
            <a href="#" className="gold-btn">
              {t.ebook}
            </a>

            <a href="#" className="gold-btn">
              {t.fisico}
            </a>
          </div>

        </div>

        {/* KEY */}
        <div className="hero-center">

          <div className="word-loop w1">{WORDS[0]}</div>
          <div className="word-loop w2">{WORDS[1]}</div>
          <div className="word-loop w3">{WORDS[2]}</div>
          <div className="word-loop w4">{WORDS[3]}</div>

          <img
            src="/assets/llave-alpha.webp"
            className="main-key"
            alt=""
          />

        </div>

        {/* PANEL */}
        <div className="system-panel">

          <h3>SISTEMA 066</h3>

          <span>CONTROL TOTAL</span>

          <div className="panel-line" />

          <div className="panel-row">
            <p>CÓDIGO:</p>
            <b>066</b>
          </div>

          <div className="panel-row">
            <p>NIVEL:</p>
            <b className="omega">{omegaText}</b>
          </div>

          <div className="panel-row">
            <p>ESTADO:</p>
            <b>ACTIVO</b>
          </div>

          <div className="map-preview">
            <img src="/assets/mapa-universo.webp" alt="" />
          </div>

          <div className="sync">
            SINCRONIZACIÓN GLOBAL {percent}.7%
          </div>

          <div className="bars">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                style={{
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* AUDIO CONTROLS */}
      <div className="audio-box">
        <div>
          <label>MÚSICA</label>

          <input
            type="range"
            min="0"
            max="0.8"
            step="0.01"
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
          />
        </div>

        <div>
          <label>LLUVIA</label>

          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={rainVolume}
            onChange={(e) => setRainVolume(Number(e.target.value))}
          />
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        Saga La Llave © 2026 · Todos los derechos reservados.
      </footer>
    </div>
  );
}
