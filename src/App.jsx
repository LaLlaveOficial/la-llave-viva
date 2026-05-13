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
  fisico: "#",
  instagram: "#",
  tiktok: "#",
  x: "#",
  youtube: "#",
  email: "contacto@lallaveoficial.com",
};

const LANGS = {
  es: {
    inicio: "Inicio",
    historia: "La Historia",
    universo: "Universo",
    ediciones: "Ediciones",
    prensa: "Prensa",
    contacto: "Contacto",
    gateTitle: "Bienvenido a Ciudad Central",
    gateCopy: "Doce horas. Una llave marcada con «066». Una memoria que no debería existir.",
    enterSound: "Entrar con atmósfera",
    enterSilent: "Entrar en silencio",
    welcome: "Bienvenido a",
    city: "Ciudad Central",
    subtitle: "Un thriller distópico de Enrique G. Santibañez",
    heroText: "Doce horas. Una llave marcada con «066». Una memoria que no debería existir. La verdad abre la puerta… y también la tumba.",
    ebook: "Compra versión e-book",
    fisico: "Compra libro físico",
    storyTitle: "La primera puerta de una saga que recién comienza.",
    story1: "Cuando Paula Garrido desaparece tras filtrar un video prohibido, su hermano Issei entra en una ciudad donde cada pista parece diseñada para hundirlo más.",
    story2: "Junto a la detective Karen Ajraz, descubrirá que Ciudad Central no solo vigila: recuerda, castiga y borra.",
    story3: "La Llave I: Ciudad Central es el inicio de una saga distópica chilena donde la verdad no se publica: se filtra, se persigue y se paga caro.",
    mapTitle: "Mapa táctico global",
    mapBtn: "Abrir mapa táctico",
    firstBook: "Primera edición · Primer umbral",
    locked: "LOCKED",
    lockedText: "Para desbloquear esta puerta, primero debes leer Ciudad Central.",
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
    inicio: "Home",
    historia: "Story",
    universo: "Universe",
    ediciones: "Editions",
    prensa: "Press",
    contacto: "Contact",
    gateTitle: "Welcome to Central City",
    gateCopy: "Twelve hours. A key marked «066». A memory that should not exist.",
    enterSound: "Enter with atmosphere",
    enterSilent: "Enter in silence",
    welcome: "Welcome to",
    city: "Central City",
    subtitle: "A dystopian thriller by Enrique G. Santibañez",
    heroText: "Twelve hours. A key marked «066». A memory that should not exist. Truth opens the door… and also the grave.",
    ebook: "Buy e-book version",
    fisico: "Buy physical book",
    storyTitle: "The first door of a saga that has just begun.",
    story1: "When Paula Garrido disappears after leaking a forbidden video, her brother Issei enters a city where every clue seems designed to pull him deeper.",
    story2: "Alongside detective Karen Ajraz, he discovers that Central City does not only watch: it remembers, punishes and erases.",
    story3: "La Llave I: Ciudad Central begins a Chilean dystopian saga where truth is leaked, hunted and paid for.",
    mapTitle: "Global tactical map",
    mapBtn: "Open tactical map",
    firstBook: "First edition · First threshold",
    locked: "LOCKED",
    lockedText: "To unlock this door, you must first read Central City.",
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
  pt: {
    inicio: "Início", historia: "A História", universo: "Universo", ediciones: "Edições", prensa: "Imprensa", contacto: "Contato",
    gateTitle: "Bem-vindo à Cidade Central", gateCopy: "Doze horas. Uma chave marcada com «066». Uma memória que não deveria existir.", enterSound: "Entrar com atmosfera", enterSilent: "Entrar em silêncio",
    welcome: "Bem-vindo à", city: "Cidade Central", subtitle: "Um thriller distópico de Enrique G. Santibañez", heroText: "Doze horas. Uma chave marcada com «066». A verdade abre a porta… e também a tumba.",
    ebook: "Comprar versão e-book", fisico: "Comprar livro físico", storyTitle: "A primeira porta de uma saga que está apenas começando.", story1: "Paula Garrido desaparece após divulgar um vídeo proibido.", story2: "Issei e Karen entram em uma cidade que vigia, lembra, pune e apaga.", story3: "O início de uma saga distópica chilena.", mapTitle: "Mapa tático global", mapBtn: "Abrir mapa tático", firstBook: "Primeira edição · Primeiro limiar", locked: "LOCKED", lockedText: "Para desbloquear esta porta, primeiro leia Cidade Central.", press1: "Disponível em formato físico", press1Text: "Uma edição colecionável em papel.", press2: "Disponível no Kindle", press2Text: "Comece imediatamente em e-book.", press3: "O romance chileno que abre uma nova porta", press3Text: "Thriller distópico escuro e cinematográfico.", press4: "Rumo à internacionalização", press4Text: "O universo 066 cruza fronteiras.", contactTitle: "Contato com Cidade Central", name: "Seu nome", email: "Seu e-mail", message: "Mensagem", send: "Enviar", music: "Música", rain: "Chuva", audioOn: "Pausar atmosfera", audioOff: "Ativar atmosfera", close: "Fechar", footer: "Saga La Llave © 2026 · Todos os direitos reservados."
  },
  fr: {
    inicio: "Accueil", historia: "Histoire", universo: "Univers", ediciones: "Éditions", prensa: "Presse", contacto: "Contact",
    gateTitle: "Bienvenue à Ville Centrale", gateCopy: "Douze heures. Une clé marquée «066». Une mémoire impossible.", enterSound: "Entrer avec atmosphère", enterSilent: "Entrer en silence",
    welcome: "Bienvenue à", city: "Ville Centrale", subtitle: "Un thriller dystopique d'Enrique G. Santibañez", heroText: "Douze heures. Une clé marquée «066». La vérité ouvre la porte… et aussi la tombe.",
    ebook: "Acheter l'e-book", fisico: "Acheter le livre papier", storyTitle: "La première porte d'une saga qui commence.", story1: "Paula Garrido disparaît après une vidéo interdite.", story2: "Issei et Karen entrent dans une ville qui surveille et efface.", story3: "Le début d'une saga dystopique chilienne.", mapTitle: "Carte tactique mondiale", mapBtn: "Ouvrir la carte", firstBook: "Première édition · Premier seuil", locked: "LOCKED", lockedText: "Pour déverrouiller cette porte, lisez d'abord Ville Centrale.", press1: "Disponible en format papier", press1Text: "Une édition physique de collection.", press2: "Disponible sur Kindle", press2Text: "Commencez immédiatement en e-book.", press3: "Le roman chilien qui ouvre une nouvelle porte", press3Text: "Un thriller sombre et cinématographique.", press4: "Vers l'internationalisation", press4Text: "L'univers 066 franchit les frontières.", contactTitle: "Contact avec Ville Centrale", name: "Votre nom", email: "Votre e-mail", message: "Message", send: "Envoyer", music: "Musique", rain: "Pluie", audioOn: "Pause atmosphère", audioOff: "Activer atmosphère", close: "Fermer", footer: "Saga La Llave © 2026 · Tous droits réservés."
  },
  de: {
    inicio: "Start", historia: "Geschichte", universo: "Universum", ediciones: "Ausgaben", prensa: "Presse", contacto: "Kontakt",
    gateTitle: "Willkommen in Central City", gateCopy: "Zwölf Stunden. Ein Schlüssel mit «066». Eine Erinnerung, die nicht existieren dürfte.", enterSound: "Mit Atmosphäre eintreten", enterSilent: "Still eintreten",
    welcome: "Willkommen in", city: "Central City", subtitle: "Ein dystopischer Thriller von Enrique G. Santibañez", heroText: "Zwölf Stunden. Ein Schlüssel mit «066». Die Wahrheit öffnet die Tür… und auch das Grab.",
    ebook: "E-Book kaufen", fisico: "Gedrucktes Buch kaufen", storyTitle: "Die erste Tür einer Saga, die gerade beginnt.", story1: "Paula Garrido verschwindet nach einem verbotenen Video.", story2: "Issei und Karen betreten eine Stadt, die überwacht und löscht.", story3: "Der Beginn einer chilenischen dystopischen Saga.", mapTitle: "Globale taktische Karte", mapBtn: "Karte öffnen", firstBook: "Erste Ausgabe · Erste Schwelle", locked: "LOCKED", lockedText: "Um diese Tür zu entsperren, lies zuerst Central City.", press1: "Jetzt als gedrucktes Buch erhältlich", press1Text: "Eine physische Sammlerausgabe.", press2: "Auf Kindle erhältlich", press2Text: "Sofort als E-Book beginnen.", press3: "Der chilenische Roman, der eine neue Tür öffnet", press3Text: "Ein dunkler, filmischer Thriller.", press4: "Auf dem Weg zur Internationalisierung", press4Text: "Das Universum 066 überschreitet Grenzen.", contactTitle: "Kontakt mit Central City", name: "Dein Name", email: "Deine E-Mail", message: "Nachricht", send: "Senden", music: "Musik", rain: "Regen", audioOn: "Atmosphäre pausieren", audioOff: "Atmosphäre aktivieren", close: "Schließen", footer: "Saga La Llave © 2026 · Alle Rechte vorbehalten."
  },
  it: {
    inicio: "Home", historia: "Storia", universo: "Universo", ediciones: "Edizioni", prensa: "Stampa", contacto: "Contatto",
    gateTitle: "Benvenuto a Città Centrale", gateCopy: "Dodici ore. Una chiave marcata «066». Una memoria impossibile.", enterSound: "Entra con atmosfera", enterSilent: "Entra in silenzio",
    welcome: "Benvenuto a", city: "Città Centrale", subtitle: "Un thriller distopico di Enrique G. Santibañez", heroText: "Dodici ore. Una chiave marcata «066». La verità apre la porta… e anche la tomba.",
    ebook: "Compra versione e-book", fisico: "Compra libro fisico", storyTitle: "La prima porta di una saga appena iniziata.", story1: "Paula Garrido scompare dopo un video proibito.", story2: "Issei e Karen entrano in una città che sorveglia e cancella.", story3: "L'inizio di una saga distopica cilena.", mapTitle: "Mappa tattica globale", mapBtn: "Apri mappa", firstBook: "Prima edizione · Prima soglia", locked: "LOCKED", lockedText: "Per sbloccare questa porta, leggi prima Città Centrale.", press1: "Disponibile in formato fisico", press1Text: "Un'edizione fisica da collezione.", press2: "Disponibile su Kindle", press2Text: "Inizia subito in e-book.", press3: "Il romanzo cileno che apre una nuova porta", press3Text: "Un thriller oscuro e cinematografico.", press4: "Verso l'internazionalizzazione", press4Text: "L'universo 066 attraversa confini.", contactTitle: "Contatto con Città Centrale", name: "Il tuo nome", email: "La tua email", message: "Messaggio", send: "Invia", music: "Musica", rain: "Pioggia", audioOn: "Pausa atmosfera", audioOff: "Attiva atmosfera", close: "Chiudi", footer: "Saga La Llave © 2026 · Tutti i diritti riservati."
  },
  ja: {
    inicio: "ホーム", historia: "物語", universo: "宇宙", ediciones: "版", prensa: "プレス", contacto: "連絡",
    gateTitle: "中央都市へようこそ", gateCopy: "十二時間。«066»と刻まれた鍵。存在してはならない記憶。", enterSound: "音響付きで入る", enterSilent: "静かに入る",
    welcome: "ようこそ", city: "中央都市", subtitle: "エンリケ・G・サンティバニェスによるディストピア・スリラー", heroText: "十二時間。«066»と刻まれた鍵。真実は扉を開く…そして墓も。",
    ebook: "電子書籍を購入", fisico: "紙の本を購入", storyTitle: "始まったばかりのサーガ、その最初の扉。", story1: "パウラが禁じられた映像の後に消える。", story2: "イッセイとカレンは監視し消去する都市に入る。", story3: "チリ発ディストピア・サーガの始まり。", mapTitle: "グローバル戦術マップ", mapBtn: "マップを開く", firstBook: "初版 · 最初の境界", locked: "LOCKED", lockedText: "この扉を開くには、まず中央都市を読んでください。", press1: "紙の本で登場", press1Text: "コレクター向けの物理版。", press2: "Kindleで利用可能", press2Text: "電子書籍ですぐに開始。", press3: "新しい扉を開くチリ小説", press3Text: "暗く映画的なスリラー。", press4: "国際展開へ", press4Text: "066の宇宙は国境を越える。", contactTitle: "中央都市へ通信を開く", name: "お名前", email: "メール", message: "メッセージ", send: "送信", music: "音楽", rain: "雨", audioOn: "音響を停止", audioOff: "音響を開始", close: "閉じる", footer: "Saga La Llave © 2026 · All rights reserved."
  }
};

const WORDS = ["066", "OMEGA", "PUERTA", "MEMORIA", "CONTROL", "VIGILANCIA", "ACCESO", "LLAVE"];

function InstagramIcon(){return <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1"/></svg>}
function TikTokIcon(){return <svg viewBox="0 0 24 24"><path d="M14 3v10.2a3.8 3.8 0 1 1-3-3.7V7.1a6.2 6.2 0 1 0 5.2 6.1V8.4c1.1.9 2.4 1.4 3.8 1.5V7.2A4.8 4.8 0 0 1 16.2 3H14Z"/></svg>}
function XIcon(){return <svg viewBox="0 0 24 24"><path d="M4 4h3.4l5.1 6.8L18.1 4H21l-7.1 8.4L21.5 20h-3.4l-5.7-7.4L6.2 20H3.3l7.7-9.1L4 4Z"/></svg>}
function YouTubeIcon(){return <svg viewBox="0 0 24 24"><path d="M21 8.2c0-1.6-1.2-2.8-2.7-3C16.7 5 14.4 5 12 5s-4.7 0-6.3.2C4.2 5.4 3 6.6 3 8.2v7.6c0 1.6 1.2 2.8 2.7 3 1.6.2 3.9.2 6.3.2s4.7 0 6.3-.2c1.5-.2 2.7-1.4 2.7-3V8.2ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg>}

function Social({href,label,children}){return <a href={href} target="_blank" rel="noreferrer noopener" aria-label={label}>{children}</a>}

export default function App() {
  const [lang,setLang]=useState("es");
  const t=LANGS[lang] || LANGS.es;
  const [intro,setIntro]=useState(true);
  const [audioOn,setAudioOn]=useState(false);
  const [musicVol,setMusicVol]=useState(0.28);
  const [rainVol,setRainVol]=useState(0.14);
  const [mapOpen,setMapOpen]=useState(false);
  const [omega,setOmega]=useState("OMEGA");
  const [percent,setPercent]=useState(98.7);
  const noirRef=useRef(null);
  const rainRef=useRef(null);

  const drops=useMemo(()=>Array.from({length:90},(_,i)=>({
    left:`${(i*37)%100}%`,
    delay:`${(i%19)*0.13}s`,
    duration:`${0.75+(i%8)*0.11}s`,
    height:`${42+(i%8)*16}px`,
    opacity:0.13+(i%5)*0.05
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
  function stopAudio(){
    [noirRef.current,rainRef.current].forEach(a=>a&&a.pause());
    setAudioOn(false);
  }
  function toggleAudio(){ audioOn ? stopAudio() : startAudio(); }
  async function enter(withAudio){ setIntro(false); if(withAudio) await startAudio(); }

  return (
    <main className="site" lang={lang}>
      <audio ref={noirRef} src={AUDIO.noir} loop preload="metadata" />
      <audio ref={rainRef} src={AUDIO.rain} loop preload="metadata" />

      <Background drops={drops}/>
      <HazardBorders/>

      {intro && (
        <section className="intro">
          <div className="intro-card">
            <p className="kicker">Sistema 066 · Acceso restringido</p>
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
          <a href="#inicio">{t.inicio}</a><a href="#historia">{t.historia}</a><a href="#universo">{t.universo}</a><a href="#ediciones">{t.ediciones}</a><a href="#prensa">{t.prensa}</a><a href="#contacto">{t.contacto}</a>
        </div>
        <div className="nav-right">
          <div className="nav-socials">
            <Social href={LINKS.instagram} label="Instagram"><InstagramIcon/></Social>
            <Social href={LINKS.tiktok} label="TikTok"><TikTokIcon/></Social>
            <Social href={LINKS.x} label="X"><XIcon/></Social>
            <Social href={LINKS.youtube} label="YouTube"><YouTubeIcon/></Social>
          </div>
          <select value={lang} onChange={e=>setLang(e.target.value)} aria-label="Idioma">
            <option value="es">ES</option><option value="en">EN</option><option value="pt">PT</option><option value="fr">FR</option><option value="de">DE</option><option value="it">IT</option><option value="ja">JA</option>
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
          <p className="lead">{t.heroText}</p>
          <div className="cta-row">
            <a className="cta primary" href={LINKS.kindle}>{t.ebook}</a>
            <a className="cta primary" href={LINKS.fisico}>{t.fisico}</a>
          </div>
        </div>

        <div className="hero-key">
          <img src={ASSETS.key} alt="Llave 066"/>
          {WORDS.map((w,i)=><span key={w} className={`cryptic word-${i+1}`}>{w}</span>)}
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
        <p className="kicker">{t.historia}</p>
        <h2>{t.storyTitle}</h2>
        <p>{t.story1}</p><p>{t.story2}</p><p><strong>{t.story3}</strong></p>
      </section>

      <section id="universo" className="universe-section">
        <article className="map-card panel">
          <p className="kicker">{t.universo}</p><h2>{t.mapTitle}</h2>
          <img src={ASSETS.map} alt="Mapa táctico del universo 066"/>
          <button className="map-button" onClick={()=>setMapOpen(true)}>{t.mapBtn}</button>
        </article>
        <article className="saga-card panel">
          <h3>La Llave I: Ciudad Central</h3><img src={ASSETS.mockup} alt="Mockup La Llave I: Ciudad Central"/><p>{t.firstBook}</p>
        </article>
        <LockedBook title={t.locked} copy={t.lockedText}/>
        <LockedBook title={t.locked} copy={t.lockedText}/>
      </section>

      <section id="ediciones" className="editions-section">
        <article className="edition-card panel"><h3>{t.ediciones}</h3><h4>{t.ebook}</h4><p>{t.press2Text}</p><a href={LINKS.kindle}>{t.ebook}</a></article>
        <article className="edition-card panel"><h3>{t.ediciones}</h3><h4>{t.fisico}</h4><p>{t.press1Text}</p><a href={LINKS.fisico}>{t.fisico}</a></article>
      </section>

      <section id="prensa" className="press-section">
        <Press title={t.press1} img={ASSETS.mockup}>{t.press1Text}</Press>
        <Press title={t.press2} img={ASSETS.key}>{t.press2Text}</Press>
        <Press title={t.press3} img={ASSETS.map}>{t.press3Text}</Press>
        <Press title={t.press4} img={ASSETS.hero}>{t.press4Text}</Press>
      </section>

      <section id="contacto" className="contact-section panel">
        <p className="kicker">{t.contacto}</p><h2>{t.contactTitle}</h2>
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

function Background({drops}){return <div className="background"><img src={ASSETS.hero} alt=""/><div className="shade"/><div className="rain-field">{drops.map((d,i)=><span key={i} style={{left:d.left,animationDelay:d.delay,animationDuration:d.duration,height:d.height,opacity:d.opacity}}/>)}</div><div className="lightning lightning-a"/><div className="lightning lightning-b"/></div>}
function HazardBorders(){return <><div className="hazard hazard-left"><img src={ASSETS.stripe} alt=""/></div><div className="hazard hazard-right"><img src={ASSETS.stripe} alt=""/></div></>}
function LockedBook({title,copy}){return <article className="locked-book panel"><div className="locked-cover">?</div><h3>{title}</h3><p>{copy}</p></article>}
function Press({title,img,children}){return <article className="press-card panel"><img src={img} alt=""/><div><h3>{title}</h3><p>{children}</p></div></article>}
