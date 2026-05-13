import { useEffect, useMemo, useRef, useState } from "react";
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
  rain: "/audio/rain-thunder.mp3",
};

const LINKS = {
  kindle: "#",
  physical: "#",
  instagram: "#",
  tiktok: "#",
  x: "#",
  youtube: "#",
  email: "contacto@lallaveoficial.com",
};

const TRANSLATIONS = {
  es: {
    label: "Español",
    nav: ["Inicio", "La historia", "Universo", "Ediciones", "Prensa", "Contacto"],
    gateTitle: "Bienvenido a Ciudad Central",
    gateCopy: "Doce horas. Una llave marcada con «066». Una memoria que no debería existir.",
    enterSound: "Entrar con atmósfera",
    enterSilent: "Entrar en silencio",
    welcome: "Bienvenido a",
    city: "Ciudad Central",
    subtitle: "Un thriller distópico de Enrique G. Santibañez",
    hero: "Doce horas. Una llave marcada con «066». Una memoria que no debería existir. La verdad abre la puerta… y también la tumba.",
    ebook: "Compra versión e-book",
    physical: "Compra libro físico",
    storyTitle: "La primera puerta de una saga que recién comienza.",
    story1: "Cuando Paula Garrido desaparece tras filtrar un video prohibido, su hermano Issei entra en una ciudad donde cada pista parece diseñada para hundirlo más.",
    story2: "Junto a la detective Karen Ajraz, descubrirá que Ciudad Central no solo vigila: recuerda, castiga y borra.",
    story3: "La Llave I: Ciudad Central es el inicio de una saga distópica chilena donde la verdad no se publica: se filtra, se persigue y se paga caro.",
    universe: "Mapa táctico global",
    openMap: "Abrir mapa táctico",
    firstBook: "Primera edición · Primer umbral",
    locked: "LOCKED",
    lockedText: "Para desbloquear esta puerta, primero debes leer Ciudad Central.",
    digital: "Edición digital",
    print: "Edición física",
    press1: "La Llave I ya está disponible en formato físico",
    press1Text: "La edición física llega como una pieza coleccionable para lectores que quieren entrar a Ciudad Central en papel.",
    press2: "Disponible en Kindle",
    press2Text: "La versión e-book permite iniciar la experiencia de inmediato desde Amazon Kindle.",
    press3: "La novela chilena que abre una nueva puerta",
    press3Text: "Una propuesta distópica, oscura y cinematográfica que busca llevar el thriller chileno a nuevas audiencias.",
    press4: "Camino a la internacionalización",
    press4Text: "El universo 066 se prepara para cruzar fronteras, idiomas y lectores.",
    contactTitle: "Abre comunicación con Ciudad Central",
    name: "Tu nombre",
    email: "Tu correo",
    message: "Mensaje",
    send: "Enviar mensaje",
    music: "Música",
    rain: "Lluvia",
    audioOn: "Pausar atmósfera",
    audioOff: "Activar atmósfera",
    close: "Cerrar",
    footer: "Saga La Llave © 2026 · Todos los derechos reservados.",
  },
  en: {
    label: "English",
    nav: ["Home", "Story", "Universe", "Editions", "Press", "Contact"],
    gateTitle: "Welcome to Central City",
    gateCopy: "Twelve hours. A key marked «066». A memory that should not exist.",
    enterSound: "Enter with atmosphere",
    enterSilent: "Enter in silence",
    welcome: "Welcome to",
    city: "Central City",
    subtitle: "A dystopian thriller by Enrique G. Santibañez",
    hero: "Twelve hours. A key marked «066». A memory that should not exist. Truth opens the door… and also the grave.",
    ebook: "Buy e-book version",
    physical: "Buy physical book",
    storyTitle: "The first door of a saga that has just begun.",
    story1: "When Paula Garrido disappears after leaking a forbidden video, her brother Issei enters a city where every clue seems designed to pull him deeper.",
    story2: "Alongside detective Karen Ajraz, he discovers that Central City does not only watch: it remembers, punishes and erases.",
    story3: "La Llave I: Ciudad Central begins a Chilean dystopian saga where truth is leaked, hunted and paid for.",
    universe: "Global tactical map",
    openMap: "Open tactical map",
    firstBook: "First edition · First threshold",
    locked: "LOCKED",
    lockedText: "To unlock this door, you must first read Central City.",
    digital: "Digital edition",
    print: "Physical edition",
    press1: "La Llave I is now available in physical format",
    press1Text: "The physical edition arrives as a collectible piece for readers who want to enter Central City on paper.",
    press2: "Available on Kindle",
    press2Text: "The e-book version lets readers begin the experience immediately on Amazon Kindle.",
    press3: "The Chilean novel opening a new door",
    press3Text: "A dark, cinematic dystopian proposal bringing Chilean thriller fiction to new audiences.",
    press4: "On the road to internationalization",
    press4Text: "The 066 universe is preparing to cross borders, languages and readers.",
    contactTitle: "Open communication with Central City",
    name: "Your name",
    email: "Your email",
    message: "Message",
    send: "Send message",
    music: "Music",
    rain: "Rain",
    audioOn: "Pause atmosphere",
    audioOff: "Activate atmosphere",
    close: "Close",
    footer: "Saga La Llave © 2026 · All rights reserved.",
  },
};

const LANGUAGE_NAMES = {
  es: "ES", en: "EN", pt: "PT", fr: "FR", de: "DE", it: "IT",
  ru: "RU", "zh-CN": "简", "zh-TW": "繁", "zh-HK": "粵",
  ar: "AR", hi: "HI", he: "HE", pl: "PL", nl: "NL", ko: "KO", th: "TH", mn: "MN"
};

const EXTRA_TRANSLATIONS = {
  pt: ["Bem-vindo à Cidade Central","Comprar versão e-book","Comprar livro físico","Mapa tático global","Contato"],
  fr: ["Bienvenue à Ville Centrale","Acheter l'e-book","Acheter le livre papier","Carte tactique mondiale","Contact"],
  de: ["Willkommen in Central City","E-Book kaufen","Gedrucktes Buch kaufen","Globale taktische Karte","Kontakt"],
  it: ["Benvenuto a Città Centrale","Compra versione e-book","Compra libro fisico","Mappa tattica globale","Contatto"],
  ru: ["Добро пожаловать в Центральный город","Купить e-book","Купить печатную книгу","Глобальная тактическая карта","Контакт"],
  "zh-CN": ["欢迎来到中央城","购买电子书","购买纸质书","全球战术地图","联系"],
  "zh-TW": ["歡迎來到中央城","購買電子書","購買紙本書","全球戰術地圖","聯絡"],
  "zh-HK": ["歡迎嚟到中央城","買電子書版本","買實體書","全球戰術地圖","聯絡"],
  ar: ["مرحباً بك في المدينة المركزية","اشترِ نسخة الكتاب الإلكتروني","اشترِ الكتاب الورقي","الخريطة التكتيكية العالمية","اتصال"],
  hi: ["सेंट्रल सिटी में आपका स्वागत है","ई-बुक संस्करण खरीदें","भौतिक पुस्तक खरीदें","वैश्विक सामरिक मानचित्र","संपर्क"],
  he: ["ברוכים הבאים לעיר המרכזית","קניית גרסת e-book","קניית ספר מודפס","מפה טקטית גלובלית","יצירת קשר"],
  pl: ["Witamy w Mieście Centralnym","Kup wersję e-book","Kup książkę drukowaną","Globalna mapa taktyczna","Kontakt"],
  nl: ["Welkom in Central City","Koop e-book versie","Koop fysiek boek","Globale tactische kaart","Contact"],
  ko: ["중앙도시에 오신 것을 환영합니다","전자책 구매","종이책 구매","글로벌 전술 지도","연락"],
  th: ["ยินดีต้อนรับสู่เมืองกลาง","ซื้อเวอร์ชันอีบุ๊ก","ซื้อหนังสือเล่ม","แผนที่ยุทธวิธีระดับโลก","ติดต่อ"],
  mn: ["Төв хотод тавтай морил","Цахим ном худалдаж авах","Хэвлэмэл ном худалдаж авах","Дэлхийн тактикийн газрын зураг","Холбоо барих"],
};

function buildLanguage(code) {
  if (TRANSLATIONS[code]) return TRANSLATIONS[code];
  const base = TRANSLATIONS.en;
  const extra = EXTRA_TRANSLATIONS[code] || EXTRA_TRANSLATIONS.en;
  return {
    ...base,
    gateTitle: extra[0],
    ebook: extra[1],
    physical: extra[2],
    universe: extra[3],
    contactTitle: extra[4],
    nav: base.nav,
  };
}

const CRYPTIC_WORDS = ["066", "OMEGA", "PUERTA", "MEMORIA", "CONTROL", "VIGILANCIA", "ACCESO", "LLAVE"];

function InstagramIcon(){return <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1"/></svg>}
function TikTokIcon(){return <svg viewBox="0 0 24 24"><path d="M14 3v10.2a3.8 3.8 0 1 1-3-3.7V7.1a6.2 6.2 0 1 0 5.2 6.1V8.4c1.1.9 2.4 1.4 3.8 1.5V7.2A4.8 4.8 0 0 1 16.2 3H14Z"/></svg>}
function XIcon(){return <svg viewBox="0 0 24 24"><path d="M4 4h3.4l5.1 6.8L18.1 4H21l-7.1 8.4L21.5 20h-3.4l-5.7-7.4L6.2 20H3.3l7.7-9.1L4 4Z"/></svg>}
function YouTubeIcon(){return <svg viewBox="0 0 24 24"><path d="M21 8.2c0-1.6-1.2-2.8-2.7-3C16.7 5 14.4 5 12 5s-4.7 0-6.3.2C4.2 5.4 3 6.6 3 8.2v7.6c0 1.6 1.2 2.8 2.7 3 1.6.2 3.9.2 6.3.2s4.7 0 6.3-.2c1.5-.2 2.7-1.4 2.7-3V8.2ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg>}
function Social({href,label,children}){return <a href={href} target="_blank" rel="noreferrer noopener" aria-label={label}>{children}</a>}

export default function App() {
  const [lang,setLang]=useState("es");
  const t=buildLanguage(lang);
  const [intro,setIntro]=useState(true);
  const [audioOn,setAudioOn]=useState(false);
  const [musicVol,setMusicVol]=useState(0.28);
  const [rainVol,setRainVol]=useState(0.18);
  const [mapOpen,setMapOpen]=useState(false);
  const [omega,setOmega]=useState("OMEGA");
  const [percent,setPercent]=useState(98.7);
  const noirRef=useRef(null);
  const rainRef=useRef(null);

  const drops=useMemo(()=>Array.from({length:115},(_,i)=>({
    left:`${(i*37)%100}%`,
    delay:`${(i%23)*0.11}s`,
    duration:`${0.55+(i%9)*0.085}s`,
    height:`${46+(i%9)*16}px`,
    opacity:0.16+(i%6)*0.045
  })),[]);

  useEffect(()=>{ if(noirRef.current) noirRef.current.volume=musicVol; },[musicVol]);
  useEffect(()=>{ if(rainRef.current) rainRef.current.volume=rainVol; },[rainVol]);

  useEffect(()=>{
    const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const id=setInterval(()=>{
      setOmega(Array.from({length:5},()=>chars[Math.floor(Math.random()*chars.length)]).join(""));
      setPercent(Number((94+Math.random()*5.8).toFixed(1)));
      setTimeout(()=>setOmega("OMEGA"),420);
    },2200);
    return()=>clearInterval(id);
  },[]);

  async function startAudio(){
    const results=await Promise.allSettled([noirRef.current?.play(),rainRef.current?.play()]);
    setAudioOn(results.some(r=>r.status==="fulfilled"));
  }
  function stopAudio(){ [noirRef.current,rainRef.current].forEach(a=>a&&a.pause()); setAudioOn(false); }
  function toggleAudio(){ audioOn ? stopAudio() : startAudio(); }
  async function enter(withAudio){ setIntro(false); if(withAudio) await startAudio(); }

  return (
    <main className="site" lang={lang} dir={["ar","he"].includes(lang) ? "rtl" : "ltr"}>
      <audio ref={noirRef} src={AUDIO.noir} loop preload="metadata" />
      <audio ref={rainRef} src={AUDIO.rain} loop preload="metadata" />

      <Background drops={drops}/>
      <HazardBorders/>

      {intro && (
        <section className="intro">
          <div className="intro-card">
            <p className="kicker">Sistema 066 · Access</p>
            <h1>{t.gateTitle}</h1>
            <p>{t.gateCopy}</p>
            <div className="intro-actions">
              <button onClick={()=>enter(true)}>{t.enterSound}</button>
              <button className="ghost" onClick={()=>enter(false)}>{t.enterSilent}</button>
            </div>
          </div>
        </section>
      )}

      <nav className="nav">
        <a className="brand" href="#inicio"><span className="brand-icon">066</span><span>LA LLAVE I<small>CIUDAD CENTRAL</small></span></a>
        <div className="nav-links">
          <a href="#inicio">{t.nav[0]}</a><a href="#historia">{t.nav[1]}</a><a href="#universo">{t.nav[2]}</a><a href="#ediciones">{t.nav[3]}</a><a href="#prensa">{t.nav[4]}</a><a href="#contacto">{t.nav[5]}</a>
        </div>
        <div className="nav-right">
          <div className="nav-socials">
            <Social href={LINKS.instagram} label="Instagram"><InstagramIcon/></Social>
            <Social href={LINKS.tiktok} label="TikTok"><TikTokIcon/></Social>
            <Social href={LINKS.x} label="X"><XIcon/></Social>
            <Social href={LINKS.youtube} label="YouTube"><YouTubeIcon/></Social>
          </div>
          <select value={lang} onChange={e=>setLang(e.target.value)} aria-label="Idioma">
            {Object.keys(LANGUAGE_NAMES).map(code => <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>)}
          </select>
        </div>
      </nav>

      <aside className="audio-top">
        <button onClick={toggleAudio}>{audioOn ? t.audioOn : t.audioOff}</button>
        <label>{t.music}<input type="range" min="0" max="0.8" step="0.01" value={musicVol} onChange={e=>setMusicVol(Number(e.target.value))}/></label>
        <label>{t.rain}<input type="range" min="0" max="0.5" step="0.01" value={rainVol} onChange={e=>setRainVol(Number(e.target.value))}/></label>
      </aside>

      <section id="inicio" className="hero-section">
        <div className="hero-copy">
          <p className="kicker spaced">{t.welcome}</p>
          <h2>{t.city}</h2>
          <div className="gold-line"/>
          <p className="author">{t.subtitle}</p>
          <p className="lead">{t.hero}</p>
          <div className="cta-row">
            <a className="cta primary" href={LINKS.kindle}>{t.ebook}</a>
            <a className="cta primary" href={LINKS.physical}>{t.physical}</a>
          </div>
        </div>

        <div className="hero-key">
          <img src={ASSETS.key} alt="Llave 066"/>
          {CRYPTIC_WORDS.map((w,i)=><span key={w} className={`cryptic word-${i+1}`}>{w}</span>)}
        </div>

        <aside className="system-panel">
          <h3>Sistema 066</h3>
          <p>Control total</p>
          <ul>
            <li><span>Código:</span><b>066</b></li>
            <li><span>Nivel:</span><b className="omega">{omega}</b></li>
            <li><span>Estado:</span><b>Activo</b></li>
          </ul>
          <div className="mini-map"/>
          <p className="sync">Sincronización global {percent}%</p>
          <div className="bars">{Array.from({length:18}).map((_,i)=><i key={i} style={{animationDelay:`${i*.07}s`}} />)}</div>
        </aside>
      </section>

      <section id="historia" className="history-section panel">
        <p className="kicker">{t.nav[1]}</p>
        <h2>{t.storyTitle}</h2>
        <p>{t.story1}</p><p>{t.story2}</p><p><strong>{t.story3}</strong></p>
      </section>

      <section id="universo" className="universe-section">
        <article className="map-card panel">
          <p className="kicker">{t.nav[2]}</p><h2>{t.universe}</h2>
          <img src={ASSETS.map} alt="Mapa táctico del universo 066"/>
          <button className="map-button" onClick={()=>setMapOpen(true)}>{t.openMap}</button>
        </article>
        <article className="saga-card panel">
          <h3>La Llave I: Ciudad Central</h3><img src={ASSETS.mockup} alt="Mockup La Llave I: Ciudad Central"/><p>{t.firstBook}</p>
        </article>
        <LockedBook title={t.locked} copy={t.lockedText}/>
        <LockedBook title={t.locked} copy={t.lockedText}/>
      </section>

      <section id="ediciones" className="editions-section">
        <article className="edition-card panel"><h3>{t.digital}</h3><h4>{t.ebook}</h4><p>{t.press2Text}</p><a href={LINKS.kindle}>{t.ebook}</a></article>
        <article className="edition-card panel"><h3>{t.print}</h3><h4>{t.physical}</h4><p>{t.press1Text}</p><a href={LINKS.physical}>{t.physical}</a></article>
      </section>

      <section id="prensa" className="press-section">
        <Press title={t.press1} img={ASSETS.mockup}>{t.press1Text}</Press>
        <Press title={t.press2} img={ASSETS.key}>{t.press2Text}</Press>
        <Press title={t.press3} img={ASSETS.map}>{t.press3Text}</Press>
        <Press title={t.press4} img={ASSETS.hero}>{t.press4Text}</Press>
      </section>

      <section id="contacto" className="contact-section panel">
        <p className="kicker">{t.nav[5]}</p><h2>{t.contactTitle}</h2>
        <form action={`mailto:${LINKS.email}`} method="post" encType="text/plain">
          <input name="nombre" placeholder={t.name}/><input name="email" placeholder={t.email}/><textarea name="mensaje" placeholder={t.message} rows="5"/><button>{t.send}</button>
        </form>
      </section>

      <footer className="footer">
        <p>{t.footer}</p>
        <div className="footer-socials"><Social href={LINKS.instagram} label="Instagram"><InstagramIcon/></Social><Social href={LINKS.tiktok} label="TikTok"><TikTokIcon/></Social><Social href={LINKS.x} label="X"><XIcon/></Social><Social href={LINKS.youtube} label="YouTube"><YouTubeIcon/></Social></div>
      </footer>

      {mapOpen && <div className="modal" onClick={()=>setMapOpen(false)}><div className="modal-inner" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setMapOpen(false)}>{t.close}</button><img src={ASSETS.map} alt="Mapa táctico completo"/></div></div>}
    </main>
  );
}

function Background({drops}){return <div className="background"><img src={ASSETS.hero} alt="" onError={(e)=>{e.currentTarget.style.display="none"}}/><div className="city-fallback"/><div className="shade"/><div className="rain-field">{drops.map((d,i)=><span key={i} style={{left:d.left,animationDelay:d.delay,animationDuration:d.duration,height:d.height,opacity:d.opacity}}/>)}</div><div className="lightning lightning-a"/><div className="lightning lightning-b"/></div>}
function HazardBorders(){return <><div className="hazard hazard-left"><img src={ASSETS.stripe} alt=""/></div><div className="hazard hazard-right"><img src={ASSETS.stripe} alt=""/></div></>}
function LockedBook({title,copy}){return <article className="locked-book panel"><div className="locked-cover">?</div><h3>{title}</h3><p>{copy}</p></article>}
function Press({title,img,children}){return <article className="press-card panel"><img src={img} alt=""/><div><h3>{title}</h3><p>{children}</p></div></article>}
