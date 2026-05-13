import { useEffect, useMemo, useRef, useState } from "react";
import "./landing.css";

const BG_SOURCES = [
  "/assets/ciudad-central-hero.webp",
  "/assets/Ciudad-oscura-hero.png",
  "/assets/ciudad-central-hero.png",
  "/Ciudad-oscura-hero.png",
];

const ASSETS = {
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

const LANGS = {
  es: {
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
    system: "Sistema 066",
    control: "Control total",
    code: "Código",
    level: "Nivel",
    status: "Estado",
    active: "Activo",
    sync: "Sincronización global",
    storyTitle: "La primera puerta de una saga que recién comienza.",
    story1: "Cuando Paula Garrido desaparece tras filtrar un video prohibido, su hermano Issei entra en una ciudad donde cada pista parece diseñada para hundirlo más.",
    story2: "Junto a la detective Karen Ajraz, descubrirá que Ciudad Central no solo vigila: recuerda, castiga y borra.",
    story3: "La Llave I: Ciudad Central es el inicio de una saga distópica chilena donde la verdad no se publica: se filtra, se persigue y se paga caro.",
    universeTitle: "Mapa táctico global",
    openMap: "Abrir mapa táctico",
    firstBook: "Primera edición · Primer umbral",
    locked: "LOCKED",
    lockedText: "Para desbloquear esta puerta, primero debes leer Ciudad Central.",
    digitalEdition: "Edición digital",
    physicalEdition: "Edición física",
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
    words: ["066", "OMEGA", "PUERTA", "MEMORIA", "CONTROL", "VIGILANCIA", "ACCESO", "LLAVE"],
  },

  en: {
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
    system: "System 066",
    control: "Total control",
    code: "Code",
    level: "Level",
    status: "Status",
    active: "Active",
    sync: "Global synchronization",
    storyTitle: "The first door of a saga that has just begun.",
    story1: "When Paula Garrido disappears after leaking a forbidden video, her brother Issei enters a city where every clue seems designed to pull him deeper.",
    story2: "Alongside detective Karen Ajraz, he discovers that Central City does not only watch: it remembers, punishes and erases.",
    story3: "La Llave I: Ciudad Central begins a Chilean dystopian saga where truth is leaked, hunted and paid for.",
    universeTitle: "Global tactical map",
    openMap: "Open tactical map",
    firstBook: "First edition · First threshold",
    locked: "LOCKED",
    lockedText: "To unlock this door, you must first read Central City.",
    digitalEdition: "Digital edition",
    physicalEdition: "Physical edition",
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
    words: ["066", "OMEGA", "DOOR", "MEMORY", "CONTROL", "WATCHED", "ACCESS", "KEY"],
  },

  pt: {
    nav: ["Início", "A história", "Universo", "Edições", "Imprensa", "Contato"],
    gateTitle: "Bem-vindo à Cidade Central",
    gateCopy: "Doze horas. Uma chave marcada com «066». Uma memória que não deveria existir.",
    enterSound: "Entrar com atmosfera",
    enterSilent: "Entrar em silêncio",
    welcome: "Bem-vindo à",
    city: "Cidade Central",
    subtitle: "Um thriller distópico de Enrique G. Santibañez",
    hero: "Doze horas. Uma chave marcada com «066». Uma memória que não deveria existir. A verdade abre a porta… e também a tumba.",
    ebook: "Comprar versão e-book",
    physical: "Comprar livro físico",
    system: "Sistema 066",
    control: "Controle total",
    code: "Código",
    level: "Nível",
    status: "Estado",
    active: "Ativo",
    sync: "Sincronização global",
    storyTitle: "A primeira porta de uma saga que está apenas começando.",
    story1: "Quando Paula Garrido desaparece após divulgar um vídeo proibido, seu irmão Issei entra em uma cidade onde cada pista parece feita para afundá-lo ainda mais.",
    story2: "Ao lado da detetive Karen Ajraz, ele descobrirá que a Cidade Central não apenas vigia: ela lembra, pune e apaga.",
    story3: "La Llave I: Ciudad Central inicia uma saga distópica chilena onde a verdade não é publicada: ela é vazada, perseguida e paga caro.",
    universeTitle: "Mapa tático global",
    openMap: "Abrir mapa tático",
    firstBook: "Primeira edição · Primeiro limiar",
    locked: "LOCKED",
    lockedText: "Para desbloquear esta porta, primeiro você deve ler Cidade Central.",
    digitalEdition: "Edição digital",
    physicalEdition: "Edição física",
    press1: "La Llave I já está disponível em formato físico",
    press1Text: "A edição física chega como peça colecionável para leitores que querem entrar na Cidade Central em papel.",
    press2: "Disponível no Kindle",
    press2Text: "A versão e-book permite iniciar a experiência imediatamente no Amazon Kindle.",
    press3: "O romance chileno que abre uma nova porta",
    press3Text: "Uma proposta distópica, sombria e cinematográfica para levar o thriller chileno a novas audiências.",
    press4: "Rumo à internacionalização",
    press4Text: "O universo 066 se prepara para cruzar fronteiras, idiomas e leitores.",
    contactTitle: "Abra comunicação com Cidade Central",
    name: "Seu nome",
    email: "Seu e-mail",
    message: "Mensagem",
    send: "Enviar mensagem",
    music: "Música",
    rain: "Chuva",
    audioOn: "Pausar atmosfera",
    audioOff: "Ativar atmosfera",
    close: "Fechar",
    footer: "Saga La Llave © 2026 · Todos os direitos reservados.",
    words: ["066", "ÔMEGA", "PORTA", "MEMÓRIA", "CONTROLE", "VIGIA", "ACESSO", "CHAVE"],
  },

  fr: {
    nav: ["Accueil", "Histoire", "Univers", "Éditions", "Presse", "Contact"],
    gateTitle: "Bienvenue à Ville Centrale",
    gateCopy: "Douze heures. Une clé marquée «066». Une mémoire qui ne devrait pas exister.",
    enterSound: "Entrer avec atmosphère",
    enterSilent: "Entrer en silence",
    welcome: "Bienvenue à",
    city: "Ville Centrale",
    subtitle: "Un thriller dystopique d'Enrique G. Santibañez",
    hero: "Douze heures. Une clé marquée «066». Une mémoire qui ne devrait pas exister. La vérité ouvre la porte… et aussi la tombe.",
    ebook: "Acheter l'e-book",
    physical: "Acheter le livre papier",
    system: "Système 066",
    control: "Contrôle total",
    code: "Code",
    level: "Niveau",
    status: "État",
    active: "Actif",
    sync: "Synchronisation globale",
    storyTitle: "La première porte d'une saga qui commence à peine.",
    story1: "Quand Paula Garrido disparaît après avoir diffusé une vidéo interdite, son frère Issei entre dans une ville où chaque indice semble conçu pour l'enfoncer davantage.",
    story2: "Avec la détective Karen Ajraz, il découvrira que Ville Centrale ne fait pas que surveiller : elle se souvient, punit et efface.",
    story3: "La Llave I: Ciudad Central lance une saga dystopique chilienne où la vérité n'est pas publiée : elle est divulguée, traquée et payée cher.",
    universeTitle: "Carte tactique mondiale",
    openMap: "Ouvrir la carte tactique",
    firstBook: "Première édition · Premier seuil",
    locked: "LOCKED",
    lockedText: "Pour déverrouiller cette porte, vous devez d'abord lire Ville Centrale.",
    digitalEdition: "Édition numérique",
    physicalEdition: "Édition physique",
    press1: "La Llave I est disponible en format papier",
    press1Text: "L'édition physique arrive comme une pièce de collection pour les lecteurs qui veulent entrer dans Ville Centrale sur papier.",
    press2: "Disponible sur Kindle",
    press2Text: "La version e-book permet de commencer immédiatement l'expérience sur Amazon Kindle.",
    press3: "Le roman chilien qui ouvre une nouvelle porte",
    press3Text: "Une proposition dystopique, sombre et cinématographique qui porte le thriller chilien vers de nouveaux publics.",
    press4: "Vers l'internationalisation",
    press4Text: "L'univers 066 se prépare à franchir frontières, langues et lecteurs.",
    contactTitle: "Ouvrir la communication avec Ville Centrale",
    name: "Votre nom",
    email: "Votre e-mail",
    message: "Message",
    send: "Envoyer",
    music: "Musique",
    rain: "Pluie",
    audioOn: "Pause atmosphère",
    audioOff: "Activer atmosphère",
    close: "Fermer",
    footer: "Saga La Llave © 2026 · Tous droits réservés.",
    words: ["066", "OMEGA", "PORTE", "MÉMOIRE", "CONTRÔLE", "VEILLE", "ACCÈS", "CLÉ"],
  },

  de: {
    nav: ["Start", "Geschichte", "Universum", "Ausgaben", "Presse", "Kontakt"],
    gateTitle: "Willkommen in Central City",
    gateCopy: "Zwölf Stunden. Ein Schlüssel mit der Markierung «066». Eine Erinnerung, die nicht existieren dürfte.",
    enterSound: "Mit Atmosphäre eintreten",
    enterSilent: "Still eintreten",
    welcome: "Willkommen in",
    city: "Central City",
    subtitle: "Ein dystopischer Thriller von Enrique G. Santibañez",
    hero: "Zwölf Stunden. Ein Schlüssel mit der Markierung «066». Eine Erinnerung, die nicht existieren dürfte. Die Wahrheit öffnet die Tür… und auch das Grab.",
    ebook: "E-Book kaufen",
    physical: "Gedrucktes Buch kaufen",
    system: "System 066",
    control: "Totale Kontrolle",
    code: "Code",
    level: "Stufe",
    status: "Status",
    active: "Aktiv",
    sync: "Globale Synchronisierung",
    storyTitle: "Die erste Tür einer Saga, die gerade erst beginnt.",
    story1: "Als Paula Garrido nach der Veröffentlichung eines verbotenen Videos verschwindet, betritt ihr Bruder Issei eine Stadt, in der jede Spur ihn tiefer hinabzieht.",
    story2: "Zusammen mit Detective Karen Ajraz entdeckt er, dass Central City nicht nur überwacht: sie erinnert, bestraft und löscht.",
    story3: "La Llave I: Ciudad Central eröffnet eine chilenische dystopische Saga, in der Wahrheit nicht veröffentlicht, sondern geleakt, gejagt und teuer bezahlt wird.",
    universeTitle: "Globale taktische Karte",
    openMap: "Taktische Karte öffnen",
    firstBook: "Erste Ausgabe · Erste Schwelle",
    locked: "LOCKED",
    lockedText: "Um diese Tür zu entsperren, musst du zuerst Central City lesen.",
    digitalEdition: "Digitale Ausgabe",
    physicalEdition: "Physische Ausgabe",
    press1: "La Llave I ist jetzt als gedrucktes Buch erhältlich",
    press1Text: "Die physische Ausgabe ist ein Sammlerstück für Leser, die Central City auf Papier betreten wollen.",
    press2: "Auf Kindle erhältlich",
    press2Text: "Die E-Book-Version ermöglicht den sofortigen Einstieg über Amazon Kindle.",
    press3: "Der chilenische Roman, der eine neue Tür öffnet",
    press3Text: "Ein dunkler, cineastischer dystopischer Thriller für neue internationale Leser.",
    press4: "Auf dem Weg zur Internationalisierung",
    press4Text: "Das Universum 066 bereitet sich darauf vor, Grenzen, Sprachen und Leser zu überschreiten.",
    contactTitle: "Kommunikation mit Central City öffnen",
    name: "Dein Name",
    email: "Deine E-Mail",
    message: "Nachricht",
    send: "Senden",
    music: "Musik",
    rain: "Regen",
    audioOn: "Atmosphäre pausieren",
    audioOff: "Atmosphäre aktivieren",
    close: "Schließen",
    footer: "Saga La Llave © 2026 · Alle Rechte vorbehalten.",
    words: ["066", "OMEGA", "TÜR", "ERINNERUNG", "KONTROLLE", "WACHE", "ZUGANG", "SCHLÜSSEL"],
  },

  it: {
    nav: ["Home", "Storia", "Universo", "Edizioni", "Stampa", "Contatto"],
    gateTitle: "Benvenuto a Città Centrale",
    gateCopy: "Dodici ore. Una chiave marcata «066». Una memoria che non dovrebbe esistere.",
    enterSound: "Entra con atmosfera",
    enterSilent: "Entra in silenzio",
    welcome: "Benvenuto a",
    city: "Città Centrale",
    subtitle: "Un thriller distopico di Enrique G. Santibañez",
    hero: "Dodici ore. Una chiave marcata «066». Una memoria che non dovrebbe esistere. La verità apre la porta… e anche la tomba.",
    ebook: "Compra versione e-book",
    physical: "Compra libro fisico",
    system: "Sistema 066",
    control: "Controllo totale",
    code: "Codice",
    level: "Livello",
    status: "Stato",
    active: "Attivo",
    sync: "Sincronizzazione globale",
    storyTitle: "La prima porta di una saga appena iniziata.",
    story1: "Quando Paula Garrido scompare dopo aver diffuso un video proibito, suo fratello Issei entra in una città dove ogni indizio sembra spingerlo più a fondo.",
    story2: "Con la detective Karen Ajraz, scoprirà che Città Centrale non solo sorveglia: ricorda, punisce e cancella.",
    story3: "La Llave I: Ciudad Central inaugura una saga distopica cilena in cui la verità non viene pubblicata: viene filtrata, perseguita e pagata a caro prezzo.",
    universeTitle: "Mappa tattica globale",
    openMap: "Apri mappa tattica",
    firstBook: "Prima edizione · Prima soglia",
    locked: "LOCKED",
    lockedText: "Per sbloccare questa porta, devi prima leggere Città Centrale.",
    digitalEdition: "Edizione digitale",
    physicalEdition: "Edizione fisica",
    press1: "La Llave I è disponibile in formato fisico",
    press1Text: "L'edizione fisica arriva come pezzo da collezione per i lettori che vogliono entrare a Città Centrale su carta.",
    press2: "Disponibile su Kindle",
    press2Text: "La versione e-book permette di iniziare subito l'esperienza su Amazon Kindle.",
    press3: "Il romanzo cileno che apre una nuova porta",
    press3Text: "Una proposta distopica, oscura e cinematografica che porta il thriller cileno a nuovi lettori.",
    press4: "Verso l'internazionalizzazione",
    press4Text: "L'universo 066 si prepara ad attraversare confini, lingue e lettori.",
    contactTitle: "Apri comunicazione con Città Centrale",
    name: "Il tuo nome",
    email: "La tua email",
    message: "Messaggio",
    send: "Invia",
    music: "Musica",
    rain: "Pioggia",
    audioOn: "Pausa atmosfera",
    audioOff: "Attiva atmosfera",
    close: "Chiudi",
    footer: "Saga La Llave © 2026 · Tutti i diritti riservati.",
    words: ["066", "OMEGA", "PORTA", "MEMORIA", "CONTROLLO", "VIGILA", "ACCESSO", "CHIAVE"],
  },

  ru: {
    nav: ["Главная", "История", "Вселенная", "Издания", "Пресса", "Контакт"],
    gateTitle: "Добро пожаловать в Центральный город",
    gateCopy: "Двенадцать часов. Ключ с меткой «066». Память, которой не должно существовать.",
    enterSound: "Войти с атмосферой",
    enterSilent: "Войти в тишине",
    welcome: "Добро пожаловать в",
    city: "Центральный город",
    subtitle: "Антиутопический триллер Энрике Г. Сантибаньеса",
    hero: "Двенадцать часов. Ключ с меткой «066». Память, которой не должно существовать. Правда открывает дверь… и могилу тоже.",
    ebook: "Купить e-book",
    physical: "Купить печатную книгу",
    system: "Система 066",
    control: "Полный контроль",
    code: "Код",
    level: "Уровень",
    status: "Статус",
    active: "Активно",
    sync: "Глобальная синхронизация",
    storyTitle: "Первая дверь саги, которая только начинается.",
    story1: "Когда Паула Гарридо исчезает после утечки запрещенного видео, ее брат Иссей входит в город, где каждая улика ведет его глубже.",
    story2: "Вместе с детективом Карен Ажрас он узнает, что Центральный город не просто следит: он помнит, наказывает и стирает.",
    story3: "La Llave I: Ciudad Central начинает чилийскую антиутопическую сагу, где правда не публикуется: она просачивается, преследуется и стоит дорого.",
    universeTitle: "Глобальная тактическая карта",
    openMap: "Открыть тактическую карту",
    firstBook: "Первое издание · Первый порог",
    locked: "LOCKED",
    lockedText: "Чтобы открыть эту дверь, сначала прочитайте Центральный город.",
    digitalEdition: "Цифровое издание",
    physicalEdition: "Печатное издание",
    press1: "La Llave I теперь доступна в печатном формате",
    press1Text: "Печатное издание создано как коллекционная вещь для тех, кто хочет войти в Центральный город на бумаге.",
    press2: "Доступно на Kindle",
    press2Text: "Версия e-book позволяет начать путешествие сразу через Amazon Kindle.",
    press3: "Чилийский роман, открывающий новую дверь",
    press3Text: "Темная, кинематографичная антиутопия выводит чилийский триллер к новым читателям.",
    press4: "Путь к международной аудитории",
    press4Text: "Вселенная 066 готовится пересечь границы, языки и рынки.",
    contactTitle: "Связаться с Центральным городом",
    name: "Ваше имя",
    email: "Ваш e-mail",
    message: "Сообщение",
    send: "Отправить",
    music: "Музыка",
    rain: "Дождь",
    audioOn: "Пауза атмосферы",
    audioOff: "Включить атмосферу",
    close: "Закрыть",
    footer: "Saga La Llave © 2026 · Все права защищены.",
    words: ["066", "ОМЕГА", "ДВЕРЬ", "ПАМЯТЬ", "КОНТРОЛЬ", "НАДЗОР", "ДОСТУП", "КЛЮЧ"],
  },

  "zh-CN": {
    nav: ["首页", "故事", "宇宙", "版本", "新闻", "联系"],
    gateTitle: "欢迎来到中央城",
    gateCopy: "十二小时。一把刻着「066」的钥匙。一段不该存在的记忆。",
    enterSound: "带氛围进入",
    enterSilent: "静默进入",
    welcome: "欢迎来到",
    city: "中央城",
    subtitle: "恩里克·G·桑蒂巴涅斯的反乌托邦惊悚小说",
    hero: "十二小时。一把刻着「066」的钥匙。一段不该存在的记忆。真相会打开门……也会打开坟墓。",
    ebook: "购买电子书版本",
    physical: "购买纸质书",
    system: "系统 066",
    control: "全面控制",
    code: "代码",
    level: "等级",
    status: "状态",
    active: "运行中",
    sync: "全球同步",
    storyTitle: "这是一部长篇传奇的第一扇门。",
    story1: "Paula Garrido 在泄露一段禁忌视频后失踪，她的哥哥 Issei 进入一座每条线索都把他拖得更深的城市。",
    story2: "他与侦探 Karen Ajraz 一起发现，中央城不仅监视：它记忆、惩罚并抹除。",
    story3: "La Llave I: Ciudad Central 开启了一部智利反乌托邦传奇，在这里真相不会被公开，只会被泄露、追捕，并付出代价。",
    universeTitle: "全球战术地图",
    openMap: "打开战术地图",
    firstBook: "第一版 · 第一门槛",
    locked: "LOCKED",
    lockedText: "要解锁这扇门，你必须先阅读《中央城》。",
    digitalEdition: "数字版",
    physicalEdition: "纸质版",
    press1: "La Llave I 已推出纸质版本",
    press1Text: "纸质版是一件收藏级作品，让读者以纸本形式进入中央城。",
    press2: "Kindle 版本已上线",
    press2Text: "电子书版本可让读者通过 Amazon Kindle 立即开始体验。",
    press3: "一部打开新门的智利小说",
    press3Text: "黑暗、电影感、反乌托邦的叙事，将智利惊悚小说带向新读者。",
    press4: "走向国际化",
    press4Text: "066 宇宙正准备跨越边界、语言与读者。",
    contactTitle: "与中央城建立联系",
    name: "你的名字",
    email: "你的邮箱",
    message: "信息",
    send: "发送信息",
    music: "音乐",
    rain: "雨声",
    audioOn: "暂停氛围",
    audioOff: "开启氛围",
    close: "关闭",
    footer: "Saga La Llave © 2026 · 版权所有。",
    words: ["066", "欧米伽", "门", "记忆", "控制", "监视", "访问", "钥匙"],
  },

  "zh-TW": {
    nav: ["首頁", "故事", "宇宙", "版本", "新聞", "聯絡"],
    gateTitle: "歡迎來到中央城",
    gateCopy: "十二小時。一把刻著「066」的鑰匙。一段不該存在的記憶。",
    enterSound: "帶著氛圍進入",
    enterSilent: "安靜進入",
    welcome: "歡迎來到",
    city: "中央城",
    subtitle: "恩里克·G·桑蒂巴涅斯的反烏托邦驚悚小說",
    hero: "十二小時。一把刻著「066」的鑰匙。一段不該存在的記憶。真相會開門……也會打開墳墓。",
    ebook: "購買電子書版本",
    physical: "購買紙本書",
    system: "系統 066",
    control: "全面控制",
    code: "代碼",
    level: "等級",
    status: "狀態",
    active: "啟動",
    sync: "全球同步",
    storyTitle: "這是一部傳奇的第一扇門。",
    story1: "Paula Garrido 在洩露禁忌影片後失蹤，她的哥哥 Issei 進入一座每條線索都將他拖得更深的城市。",
    story2: "他與偵探 Karen Ajraz 一起發現，中央城不只監視：它記得、懲罰並抹除。",
    story3: "La Llave I: Ciudad Central 開啟一部智利反烏托邦傳奇，真相不會被公開，只會被洩露、追捕並付出代價。",
    universeTitle: "全球戰術地圖",
    openMap: "開啟戰術地圖",
    firstBook: "第一版 · 第一門檻",
    locked: "LOCKED",
    lockedText: "若要解鎖這扇門，你必須先閱讀《中央城》。",
    digitalEdition: "數位版",
    physicalEdition: "紙本版",
    press1: "La Llave I 已推出紙本版本",
    press1Text: "紙本版是一件收藏級作品，讓讀者以紙張進入中央城。",
    press2: "Kindle 版本已上線",
    press2Text: "電子書版本可讓讀者透過 Amazon Kindle 立即開始。",
    press3: "一部打開新門的智利小說",
    press3Text: "黑暗、電影感、反烏托邦的提案，將智利驚悚小說帶向新讀者。",
    press4: "走向國際化",
    press4Text: "066 宇宙正準備跨越邊界、語言與讀者。",
    contactTitle: "與中央城建立聯絡",
    name: "你的名字",
    email: "你的電子郵件",
    message: "訊息",
    send: "送出訊息",
    music: "音樂",
    rain: "雨聲",
    audioOn: "暫停氛圍",
    audioOff: "啟動氛圍",
    close: "關閉",
    footer: "Saga La Llave © 2026 · 保留所有權利。",
    words: ["066", "歐米伽", "門", "記憶", "控制", "監視", "通行", "鑰匙"],
  },

  yue: {
    nav: ["首頁", "故事", "宇宙", "版本", "新聞", "聯絡"],
    gateTitle: "歡迎嚟到中央城",
    gateCopy: "十二個鐘。一條刻住「066」嘅鎖匙。一段唔應該存在嘅記憶。",
    enterSound: "有氣氛咁進入",
    enterSilent: "靜靜進入",
    welcome: "歡迎嚟到",
    city: "中央城",
    subtitle: "Enrique G. Santibañez 嘅反烏托邦驚悚小說",
    hero: "十二個鐘。一條刻住「066」嘅鎖匙。一段唔應該存在嘅記憶。真相會開門……亦會打開墳墓。",
    ebook: "買電子書版本",
    physical: "買實體書",
    system: "系統 066",
    control: "全面控制",
    code: "代碼",
    level: "級別",
    status: "狀態",
    active: "啟動",
    sync: "全球同步",
    storyTitle: "呢個係一個傳奇嘅第一道門。",
    story1: "Paula Garrido 洩露禁忌影片之後失蹤，佢阿哥 Issei 進入一座每條線索都令佢愈陷愈深嘅城市。",
    story2: "佢同偵探 Karen Ajraz 發現，中央城唔單止監視：佢會記住、懲罰同抹除。",
    story3: "La Llave I: Ciudad Central 開啟一部智利反烏托邦傳奇，真相唔係公開，而係被洩露、被追捕、被付出代價。",
    universeTitle: "全球戰術地圖",
    openMap: "開啟戰術地圖",
    firstBook: "第一版 · 第一門檻",
    locked: "LOCKED",
    lockedText: "要解鎖呢道門，你要先讀《中央城》。",
    digitalEdition: "數碼版",
    physicalEdition: "實體版",
    press1: "La Llave I 已有實體書",
    press1Text: "實體版係畀想用紙本進入中央城嘅讀者收藏。",
    press2: "Kindle 已上架",
    press2Text: "電子書版本可以即刻透過 Amazon Kindle 開始。",
    press3: "打開新門嘅智利小說",
    press3Text: "黑暗、電影感、反烏托邦嘅驚悚作品，帶智利敘事去新讀者面前。",
    press4: "走向國際",
    press4Text: "066 宇宙準備跨越邊界、語言同讀者。",
    contactTitle: "同中央城建立聯絡",
    name: "你嘅名",
    email: "你嘅電郵",
    message: "訊息",
    send: "送出訊息",
    music: "音樂",
    rain: "雨聲",
    audioOn: "暫停氣氛",
    audioOff: "啟動氣氛",
    close: "關閉",
    footer: "Saga La Llave © 2026 · 保留所有權利。",
    words: ["066", "奧米加", "門", "記憶", "控制", "監視", "通行", "鎖匙"],
  },

  ar: {
    nav: ["الرئيسية", "القصة", "العالم", "الإصدارات", "الصحافة", "اتصال"],
    gateTitle: "مرحباً بك في المدينة المركزية",
    gateCopy: "اثنتا عشرة ساعة. مفتاح يحمل الرمز «066». ذاكرة لا ينبغي أن توجد.",
    enterSound: "ادخل مع الأجواء",
    enterSilent: "ادخل بصمت",
    welcome: "مرحباً بك في",
    city: "المدينة المركزية",
    subtitle: "رواية إثارة ديستوبية بقلم إنريكي ج. سانتيبانييز",
    hero: "اثنتا عشرة ساعة. مفتاح يحمل الرمز «066». ذاكرة لا ينبغي أن توجد. الحقيقة تفتح الباب… وتفتح القبر أيضاً.",
    ebook: "اشترِ نسخة الكتاب الإلكتروني",
    physical: "اشترِ الكتاب الورقي",
    system: "النظام 066",
    control: "تحكم كامل",
    code: "الرمز",
    level: "المستوى",
    status: "الحالة",
    active: "نشط",
    sync: "مزامنة عالمية",
    storyTitle: "الباب الأول في ملحمة بدأت للتو.",
    story1: "عندما تختفي باولا غاريدو بعد تسريب فيديو محظور، يدخل أخوها إيسي مدينة يبدو أن كل دليل فيها صُمم ليغرقه أكثر.",
    story2: "مع المحققة كارين أجراز، سيكتشف أن المدينة المركزية لا تراقب فقط: إنها تتذكر، تعاقب وتمحو.",
    story3: "La Llave I: Ciudad Central تبدأ ملحمة ديستوبية تشيلية لا تُنشر فيها الحقيقة، بل تُسرّب وتُطارد ويُدفع ثمنها غالياً.",
    universeTitle: "خريطة تكتيكية عالمية",
    openMap: "افتح الخريطة التكتيكية",
    firstBook: "الطبعة الأولى · العتبة الأولى",
    locked: "LOCKED",
    lockedText: "لفتح هذا الباب، عليك أولاً قراءة المدينة المركزية.",
    digitalEdition: "الإصدار الرقمي",
    physicalEdition: "الإصدار الورقي",
    press1: "La Llave I متاحة الآن بصيغة ورقية",
    press1Text: "الإصدار الورقي قطعة قابلة للاقتناء للقراء الذين يريدون دخول المدينة المركزية على الورق.",
    press2: "متاحة على Kindle",
    press2Text: "نسخة الكتاب الإلكتروني تتيح بدء التجربة فوراً عبر Amazon Kindle.",
    press3: "الرواية التشيلية التي تفتح باباً جديداً",
    press3Text: "عمل ديستوبي مظلم وسينمائي يأخذ الإثارة التشيلية إلى قراء جدد.",
    press4: "نحو العالمية",
    press4Text: "عالم 066 يستعد لعبور الحدود واللغات والقراء.",
    contactTitle: "افتح الاتصال مع المدينة المركزية",
    name: "اسمك",
    email: "بريدك الإلكتروني",
    message: "رسالة",
    send: "إرسال الرسالة",
    music: "الموسيقى",
    rain: "المطر",
    audioOn: "إيقاف الأجواء",
    audioOff: "تشغيل الأجواء",
    close: "إغلاق",
    footer: "Saga La Llave © 2026 · جميع الحقوق محفوظة.",
    words: ["066", "أوميغا", "باب", "ذاكرة", "تحكم", "مراقبة", "دخول", "مفتاح"],
  },

  hi: {
    nav: ["मुखपृष्ठ", "कहानी", "ब्रह्मांड", "संस्करण", "प्रेस", "संपर्क"],
    gateTitle: "सेंट्रल सिटी में आपका स्वागत है",
    gateCopy: "बारह घंटे। «066» अंकित एक चाबी। एक स्मृति जिसे अस्तित्व में नहीं होना चाहिए।",
    enterSound: "वातावरण के साथ प्रवेश करें",
    enterSilent: "शांति से प्रवेश करें",
    welcome: "स्वागत है",
    city: "सेंट्रल सिटी",
    subtitle: "एनरिके जी. सान्तिबान्येज़ का एक डिस्टोपियन थ्रिलर",
    hero: "बारह घंटे। «066» अंकित एक चाबी। एक स्मृति जिसे अस्तित्व में नहीं होना चाहिए। सच दरवाज़ा खोलता है… और कब्र भी।",
    ebook: "ई-बुक संस्करण खरीदें",
    physical: "भौतिक पुस्तक खरीदें",
    system: "सिस्टम 066",
    control: "पूर्ण नियंत्रण",
    code: "कोड",
    level: "स्तर",
    status: "स्थिति",
    active: "सक्रिय",
    sync: "वैश्विक समन्वय",
    storyTitle: "एक शुरू होती गाथा का पहला द्वार।",
    story1: "जब पाउला गारिदो एक निषिद्ध वीडियो लीक करने के बाद गायब हो जाती है, उसका भाई इस्सेई ऐसी शहर में प्रवेश करता है जहाँ हर सुराग उसे और गहरा खींचता है।",
    story2: "डिटेक्टिव करेन अज्राज़ के साथ, वह जानेगा कि सेंट्रल सिटी केवल निगरानी नहीं करती: वह याद रखती है, दंड देती है और मिटा देती है।",
    story3: "La Llave I: Ciudad Central एक चिली डिस्टोपियन गाथा की शुरुआत है जहाँ सच प्रकाशित नहीं होता: वह लीक होता है, पीछा किया जाता है और महँगा पड़ता है।",
    universeTitle: "वैश्विक सामरिक मानचित्र",
    openMap: "सामरिक मानचित्र खोलें",
    firstBook: "प्रथम संस्करण · प्रथम दहलीज़",
    locked: "LOCKED",
    lockedText: "इस द्वार को खोलने के लिए पहले सेंट्रल सिटी पढ़नी होगी।",
    digitalEdition: "डिजिटल संस्करण",
    physicalEdition: "भौतिक संस्करण",
    press1: "La Llave I अब भौतिक प्रारूप में उपलब्ध है",
    press1Text: "भौतिक संस्करण उन पाठकों के लिए संग्रहणीय वस्तु है जो काग़ज़ पर सेंट्रल सिटी में प्रवेश करना चाहते हैं।",
    press2: "Kindle पर उपलब्ध",
    press2Text: "ई-बुक संस्करण Amazon Kindle पर तुरंत अनुभव शुरू करने देता है।",
    press3: "एक नई दहलीज़ खोलने वाला चिली उपन्यास",
    press3Text: "एक अंधेरा, सिनेमाई डिस्टोपियन प्रस्ताव जो चिली थ्रिलर को नए पाठकों तक ले जाता है।",
    press4: "अंतरराष्ट्रीय विस्तार की ओर",
    press4Text: "066 ब्रह्मांड सीमाएँ, भाषाएँ और पाठक पार करने की तैयारी कर रहा है।",
    contactTitle: "सेंट्रल सिटी से संपर्क खोलें",
    name: "आपका नाम",
    email: "आपका ईमेल",
    message: "संदेश",
    send: "संदेश भेजें",
    music: "संगीत",
    rain: "बारिश",
    audioOn: "वातावरण रोकें",
    audioOff: "वातावरण चालू करें",
    close: "बंद करें",
    footer: "Saga La Llave © 2026 · सर्वाधिकार सुरक्षित।",
    words: ["066", "ओमेगा", "द्वार", "स्मृति", "नियंत्रण", "निगरानी", "प्रवेश", "चाबी"],
  },

  he: {
    nav: ["בית", "הסיפור", "יקום", "מהדורות", "עיתונות", "צור קשר"],
    gateTitle: "ברוכים הבאים לעיר המרכזית",
    gateCopy: "שתים־עשרה שעות. מפתח המסומן «066». זיכרון שלא אמור להתקיים.",
    enterSound: "כניסה עם אווירה",
    enterSilent: "כניסה בשקט",
    welcome: "ברוכים הבאים אל",
    city: "העיר המרכזית",
    subtitle: "מותחן דיסטופי מאת אנריקה ג. סנטיבאנייס",
    hero: "שתים־עשרה שעות. מפתח המסומן «066». זיכרון שלא אמור להתקיים. האמת פותחת את הדלת… וגם את הקבר.",
    ebook: "קניית גרסת e-book",
    physical: "קניית ספר מודפס",
    system: "מערכת 066",
    control: "שליטה מלאה",
    code: "קוד",
    level: "רמה",
    status: "מצב",
    active: "פעיל",
    sync: "סנכרון גלובלי",
    storyTitle: "הדלת הראשונה של סאגה שרק מתחילה.",
    story1: "כאשר פאולה גארידו נעלמת לאחר הדלפת סרטון אסור, אחיה איסיי נכנס לעיר שבה כל רמז מושך אותו עמוק יותר.",
    story2: "יחד עם הבלשית קארן אג'ראז, הוא יגלה שהעיר המרכזית לא רק צופה: היא זוכרת, מענישה ומוחקת.",
    story3: "La Llave I: Ciudad Central פותחת סאגה דיסטופית צ'יליאנית שבה האמת אינה מתפרסמת: היא מודלפת, נרדפת ועולה ביוקר.",
    universeTitle: "מפה טקטית גלובלית",
    openMap: "פתיחת המפה הטקטית",
    firstBook: "מהדורה ראשונה · סף ראשון",
    locked: "LOCKED",
    lockedText: "כדי לפתוח את הדלת הזאת, עליך לקרוא קודם את העיר המרכזית.",
    digitalEdition: "מהדורה דיגיטלית",
    physicalEdition: "מהדורה מודפסת",
    press1: "La Llave I זמין כעת בפורמט מודפס",
    press1Text: "המהדורה המודפסת היא פריט אספנות לקוראים שרוצים להיכנס לעיר המרכזית על נייר.",
    press2: "זמין ב-Kindle",
    press2Text: "גרסת ה-e-book מאפשרת להתחיל מיד דרך Amazon Kindle.",
    press3: "הרומן הצ'יליאני שפותח דלת חדשה",
    press3Text: "הצעה דיסטופית, אפלה וקולנועית שמביאה את המותחן הצ'יליאני לקהלים חדשים.",
    press4: "בדרך לבינלאומיות",
    press4Text: "יקום 066 מתכונן לחצות גבולות, שפות וקוראים.",
    contactTitle: "פתיחת תקשורת עם העיר המרכזית",
    name: "השם שלך",
    email: "האימייל שלך",
    message: "הודעה",
    send: "שליחת הודעה",
    music: "מוזיקה",
    rain: "גשם",
    audioOn: "השהיית אווירה",
    audioOff: "הפעלת אווירה",
    close: "סגור",
    footer: "Saga La Llave © 2026 · כל הזכויות שמורות.",
    words: ["066", "אומגה", "דלת", "זיכרון", "שליטה", "מעקב", "גישה", "מפתח"],
  },

  pl: {
    nav: ["Start", "Historia", "Uniwersum", "Edycje", "Prasa", "Kontakt"],
    gateTitle: "Witamy w Mieście Centralnym",
    gateCopy: "Dwanaście godzin. Klucz oznaczony «066». Pamięć, która nie powinna istnieć.",
    enterSound: "Wejdź z atmosferą",
    enterSilent: "Wejdź w ciszy",
    welcome: "Witamy w",
    city: "Mieście Centralnym",
    subtitle: "Dystopijny thriller Enrique G. Santibañeza",
    hero: "Dwanaście godzin. Klucz oznaczony «066». Pamięć, która nie powinna istnieć. Prawda otwiera drzwi… i także grób.",
    ebook: "Kup wersję e-book",
    physical: "Kup książkę drukowaną",
    system: "System 066",
    control: "Pełna kontrola",
    code: "Kod",
    level: "Poziom",
    status: "Status",
    active: "Aktywny",
    sync: "Synchronizacja globalna",
    storyTitle: "Pierwsze drzwi sagi, która dopiero się zaczyna.",
    story1: "Kiedy Paula Garrido znika po ujawnieniu zakazanego filmu, jej brat Issei wchodzi do miasta, w którym każdy trop wciąga go głębiej.",
    story2: "Wraz z detektyw Karen Ajraz odkryje, że Miasto Centralne nie tylko obserwuje: ono pamięta, karze i wymazuje.",
    story3: "La Llave I: Ciudad Central rozpoczyna chilijską sagę dystopijną, w której prawda nie jest publikowana: wycieka, jest ścigana i kosztuje drogo.",
    universeTitle: "Globalna mapa taktyczna",
    openMap: "Otwórz mapę taktyczną",
    firstBook: "Pierwsze wydanie · Pierwszy próg",
    locked: "LOCKED",
    lockedText: "Aby odblokować te drzwi, najpierw przeczytaj Miasto Centralne.",
    digitalEdition: "Edycja cyfrowa",
    physicalEdition: "Edycja drukowana",
    press1: "La Llave I jest już dostępna w formacie drukowanym",
    press1Text: "Wydanie fizyczne to kolekcjonerski egzemplarz dla czytelników, którzy chcą wejść do Miasta Centralnego na papierze.",
    press2: "Dostępne na Kindle",
    press2Text: "Wersja e-book pozwala rozpocząć doświadczenie natychmiast przez Amazon Kindle.",
    press3: "Chilijska powieść, która otwiera nowe drzwi",
    press3Text: "Mroczna, filmowa propozycja dystopijna niosąca chilijski thriller do nowych odbiorców.",
    press4: "Droga do internacjonalizacji",
    press4Text: "Uniwersum 066 przygotowuje się do przekraczania granic, języków i czytelników.",
    contactTitle: "Nawiąż kontakt z Miastem Centralnym",
    name: "Twoje imię",
    email: "Twój e-mail",
    message: "Wiadomość",
    send: "Wyślij wiadomość",
    music: "Muzyka",
    rain: "Deszcz",
    audioOn: "Pauza atmosfery",
    audioOff: "Włącz atmosferę",
    close: "Zamknij",
    footer: "Saga La Llave © 2026 · Wszelkie prawa zastrzeżone.",
    words: ["066", "OMEGA", "DRZWI", "PAMIĘĆ", "KONTROLA", "NADZÓR", "DOSTĘP", "KLUCZ"],
  },

  nl: {
    nav: ["Home", "Het verhaal", "Universum", "Edities", "Pers", "Contact"],
    gateTitle: "Welkom in Central City",
    gateCopy: "Twaalf uur. Een sleutel gemarkeerd met «066». Een herinnering die niet zou mogen bestaan.",
    enterSound: "Binnenkomen met sfeer",
    enterSilent: "Binnenkomen in stilte",
    welcome: "Welkom in",
    city: "Central City",
    subtitle: "Een dystopische thriller van Enrique G. Santibañez",
    hero: "Twaalf uur. Een sleutel gemarkeerd met «066». Een herinnering die niet zou mogen bestaan. De waarheid opent de deur… en ook het graf.",
    ebook: "Koop e-book versie",
    physical: "Koop fysiek boek",
    system: "Systeem 066",
    control: "Totale controle",
    code: "Code",
    level: "Niveau",
    status: "Status",
    active: "Actief",
    sync: "Globale synchronisatie",
    storyTitle: "De eerste deur van een saga die net begint.",
    story1: "Wanneer Paula Garrido verdwijnt na het lekken van een verboden video, betreedt haar broer Issei een stad waar elk spoor hem dieper naar binnen trekt.",
    story2: "Samen met detective Karen Ajraz ontdekt hij dat Central City niet alleen observeert: het onthoudt, straft en wist.",
    story3: "La Llave I: Ciudad Central begint een Chileense dystopische saga waarin waarheid niet wordt gepubliceerd: ze wordt gelekt, opgejaagd en duur betaald.",
    universeTitle: "Globale tactische kaart",
    openMap: "Open tactische kaart",
    firstBook: "Eerste editie · Eerste drempel",
    locked: "LOCKED",
    lockedText: "Om deze deur te ontgrendelen, moet je eerst Central City lezen.",
    digitalEdition: "Digitale editie",
    physicalEdition: "Fysieke editie",
    press1: "La Llave I is nu beschikbaar als fysiek boek",
    press1Text: "De fysieke editie is een verzamelstuk voor lezers die Central City op papier willen betreden.",
    press2: "Beschikbaar op Kindle",
    press2Text: "De e-bookversie laat lezers direct beginnen via Amazon Kindle.",
    press3: "De Chileense roman die een nieuwe deur opent",
    press3Text: "Een donkere, filmische dystopische thriller die Chileense fictie naar nieuwe lezers brengt.",
    press4: "Op weg naar internationalisering",
    press4Text: "Het 066-universum bereidt zich voor om grenzen, talen en lezers te overstijgen.",
    contactTitle: "Open communicatie met Central City",
    name: "Je naam",
    email: "Je e-mail",
    message: "Bericht",
    send: "Verstuur bericht",
    music: "Muziek",
    rain: "Regen",
    audioOn: "Sfeer pauzeren",
    audioOff: "Sfeer activeren",
    close: "Sluiten",
    footer: "Saga La Llave © 2026 · Alle rechten voorbehouden.",
    words: ["066", "OMEGA", "DEUR", "GEHEUGEN", "CONTROLE", "WACHT", "TOEGANG", "SLEUTEL"],
  },

  ko: {
    nav: ["홈", "이야기", "유니버스", "에디션", "프레스", "연락"],
    gateTitle: "중앙도시에 오신 것을 환영합니다",
    gateCopy: "열두 시간. «066»이 새겨진 열쇠. 존재해서는 안 되는 기억.",
    enterSound: "분위기와 함께 입장",
    enterSilent: "조용히 입장",
    welcome: "환영합니다",
    city: "중앙도시",
    subtitle: "엔리케 G. 산티바녜스의 디스토피아 스릴러",
    hero: "열두 시간. «066»이 새겨진 열쇠. 존재해서는 안 되는 기억. 진실은 문을 열고… 무덤도 연다.",
    ebook: "전자책 구매",
    physical: "종이책 구매",
    system: "시스템 066",
    control: "완전 통제",
    code: "코드",
    level: "레벨",
    status: "상태",
    active: "활성",
    sync: "글로벌 동기화",
    storyTitle: "이제 막 시작되는 사가의 첫 번째 문.",
    story1: "파울라 가리도가 금지된 영상을 유출한 뒤 사라지고, 그녀의 오빠 이세이는 모든 단서가 더 깊은 곳으로 끌어들이는 도시로 들어간다.",
    story2: "형사 카렌 아즈라즈와 함께 그는 중앙도시가 단지 감시하는 것이 아니라 기억하고, 처벌하고, 지운다는 것을 알게 된다.",
    story3: "La Llave I: Ciudad Central은 진실이 공개되지 않고 유출되고 추적되며 큰 대가를 치르는 칠레 디스토피아 사가의 시작이다.",
    universeTitle: "글로벌 전술 지도",
    openMap: "전술 지도 열기",
    firstBook: "초판 · 첫 번째 문턱",
    locked: "LOCKED",
    lockedText: "이 문을 열려면 먼저 중앙도시를 읽어야 합니다.",
    digitalEdition: "디지털 에디션",
    physicalEdition: "실물 에디션",
    press1: "La Llave I가 실물 도서로 출시되었습니다",
    press1Text: "실물판은 종이로 중앙도시에 들어가고 싶은 독자를 위한 수집용 에디션입니다.",
    press2: "Kindle에서 이용 가능",
    press2Text: "전자책 버전은 Amazon Kindle에서 즉시 경험을 시작할 수 있습니다.",
    press3: "새로운 문을 여는 칠레 소설",
    press3Text: "어둡고 영화적인 디스토피아 스릴러가 칠레 스토리텔링을 새로운 독자에게 전합니다.",
    press4: "국제화로 가는 길",
    press4Text: "066 유니버스는 국경, 언어, 독자를 넘어설 준비를 하고 있습니다.",
    contactTitle: "중앙도시와 연락하기",
    name: "이름",
    email: "이메일",
    message: "메시지",
    send: "메시지 보내기",
    music: "음악",
    rain: "비",
    audioOn: "분위기 일시정지",
    audioOff: "분위기 켜기",
    close: "닫기",
    footer: "Saga La Llave © 2026 · 모든 권리 보유.",
    words: ["066", "오메가", "문", "기억", "통제", "감시", "접근", "열쇠"],
  },

  th: {
    nav: ["หน้าแรก", "เรื่องราว", "จักรวาล", "ฉบับ", "ข่าว", "ติดต่อ"],
    gateTitle: "ยินดีต้อนรับสู่เมืองกลาง",
    gateCopy: "สิบสองชั่วโมง กุญแจที่มีรหัส «066» ความทรงจำที่ไม่ควรมีอยู่",
    enterSound: "เข้าสู่บรรยากาศ",
    enterSilent: "เข้าสู่ความเงียบ",
    welcome: "ยินดีต้อนรับสู่",
    city: "เมืองกลาง",
    subtitle: "ทริลเลอร์ดิสโทเปียโดย Enrique G. Santibañez",
    hero: "สิบสองชั่วโมง กุญแจที่มีรหัส «066» ความทรงจำที่ไม่ควรมีอยู่ ความจริงเปิดประตู… และเปิดหลุมศพด้วย",
    ebook: "ซื้อเวอร์ชันอีบุ๊ก",
    physical: "ซื้อหนังสือเล่ม",
    system: "ระบบ 066",
    control: "ควบคุมทั้งหมด",
    code: "รหัส",
    level: "ระดับ",
    status: "สถานะ",
    active: "ทำงาน",
    sync: "การซิงก์ทั่วโลก",
    storyTitle: "ประตูแรกของมหากาพย์ที่เพิ่งเริ่มต้น",
    story1: "เมื่อ Paula Garrido หายตัวไปหลังปล่อยวิดีโอต้องห้าม Issei พี่ชายของเธอเข้าสู่เมืองที่ทุกเบาะแสดึงเขาลึกลงไป",
    story2: "ร่วมกับนักสืบ Karen Ajraz เขาจะพบว่าเมืองกลางไม่ได้แค่เฝ้ามอง แต่มันจดจำ ลงโทษ และลบล้าง",
    story3: "La Llave I: Ciudad Central คือจุดเริ่มต้นของมหากาพย์ดิสโทเปียชิลี ที่ความจริงไม่ได้ถูกเผยแพร่ แต่ถูกรั่วไหล ถูกไล่ล่า และต้องจ่ายแพง",
    universeTitle: "แผนที่ยุทธวิธีระดับโลก",
    openMap: "เปิดแผนที่ยุทธวิธี",
    firstBook: "ฉบับแรก · ธรณีแรก",
    locked: "LOCKED",
    lockedText: "เพื่อปลดล็อกประตูนี้ คุณต้องอ่านเมืองกลางก่อน",
    digitalEdition: "ฉบับดิจิทัล",
    physicalEdition: "ฉบับหนังสือเล่ม",
    press1: "La Llave I พร้อมจำหน่ายในรูปแบบหนังสือเล่ม",
    press1Text: "ฉบับพิมพ์เป็นของสะสมสำหรับผู้อ่านที่ต้องการเข้าสู่เมืองกลางบนกระดาษ",
    press2: "พร้อมบน Kindle",
    press2Text: "เวอร์ชันอีบุ๊กช่วยให้เริ่มประสบการณ์ได้ทันทีผ่าน Amazon Kindle",
    press3: "นวนิยายชิลีที่เปิดประตูใหม่",
    press3Text: "ข้อเสนอแบบดิสโทเปีย มืด และเหมือนภาพยนตร์ ที่พาทริลเลอร์ชิลีสู่ผู้อ่านใหม่",
    press4: "สู่ความเป็นสากล",
    press4Text: "จักรวาล 066 เตรียมข้ามพรมแดน ภาษา และผู้อ่าน",
    contactTitle: "เปิดการติดต่อกับเมืองกลาง",
    name: "ชื่อของคุณ",
    email: "อีเมลของคุณ",
    message: "ข้อความ",
    send: "ส่งข้อความ",
    music: "ดนตรี",
    rain: "ฝน",
    audioOn: "หยุดบรรยากาศ",
    audioOff: "เปิดบรรยากาศ",
    close: "ปิด",
    footer: "Saga La Llave © 2026 · สงวนลิขสิทธิ์ทั้งหมด",
    words: ["066", "โอเมกา", "ประตู", "ความทรงจำ", "ควบคุม", "เฝ้าระวัง", "เข้าถึง", "กุญแจ"],
  },

  mn: {
    nav: ["Нүүр", "Түүх", "Ертөнц", "Хэвлэл", "Мэдээ", "Холбоо"],
    gateTitle: "Төв хотод тавтай морил",
    gateCopy: "Арван хоёр цаг. «066» тэмдэгтэй түлхүүр. Байх ёсгүй дурсамж.",
    enterSound: "Уур амьсгалтай нэвтрэх",
    enterSilent: "Чимээгүй нэвтрэх",
    welcome: "Тавтай морил",
    city: "Төв хот",
    subtitle: "Энрике Г. Сантибаньезийн дистопи триллер",
    hero: "Арван хоёр цаг. «066» тэмдэгтэй түлхүүр. Байх ёсгүй дурсамж. Үнэн хаалгыг нээнэ… мөн булшийг ч нээнэ.",
    ebook: "Цахим ном худалдаж авах",
    physical: "Хэвлэмэл ном худалдаж авах",
    system: "Систем 066",
    control: "Бүрэн хяналт",
    code: "Код",
    level: "Түвшин",
    status: "Төлөв",
    active: "Идэвхтэй",
    sync: "Дэлхийн синхрончлол",
    storyTitle: "Дөнгөж эхэлж буй сагийн эхний хаалга.",
    story1: "Паула Гарридо хориглосон бичлэг задруулсны дараа алга болж, ах Иссей нь бүх мөр түүнийг улам гүн татах хотод орно.",
    story2: "Мөрдөгч Карен Ажразтай хамт тэр Төв хот зөвхөн ажигладаггүй: санаж, шийтгэж, устгадаг гэдгийг мэднэ.",
    story3: "La Llave I: Ciudad Central нь үнэнийг нийтэлдэггүй, харин задруулж, мөрдөж, өндөр үнээр төлдөг Чилийн дистопи сагийн эхлэл юм.",
    universeTitle: "Дэлхийн тактикийн газрын зураг",
    openMap: "Тактикийн газрын зураг нээх",
    firstBook: "Анхны хэвлэл · Эхний босго",
    locked: "LOCKED",
    lockedText: "Энэ хаалгыг нээхийн тулд эхлээд Төв хотыг унших хэрэгтэй.",
    digitalEdition: "Цахим хэвлэл",
    physicalEdition: "Хэвлэмэл хэвлэл",
    press1: "La Llave I хэвлэмэл хэлбэрээр гарлаа",
    press1Text: "Хэвлэмэл хувилбар нь Төв хот руу цаасан дээр орохыг хүссэн уншигчдад зориулсан цуглуулгын бүтээл юм.",
    press2: "Kindle дээр боломжтой",
    press2Text: "Цахим хувилбар Amazon Kindle дээр шууд эхлэх боломж олгоно.",
    press3: "Шинэ хаалга нээж буй Чилийн роман",
    press3Text: "Харанхуй, кино мэт дистопи триллер Чилийн өгүүлэмжийг шинэ уншигчдад хүргэнэ.",
    press4: "Олон улсын замд",
    press4Text: "066 ертөнц хил, хэл, уншигчдыг давахад бэлтгэж байна.",
    contactTitle: "Төв хоттой холбогдох",
    name: "Таны нэр",
    email: "Таны имэйл",
    message: "Мессеж",
    send: "Мессеж илгээх",
    music: "Хөгжим",
    rain: "Бороо",
    audioOn: "Уур амьсгалыг түр зогсоох",
    audioOff: "Уур амьсгалыг асаах",
    close: "Хаах",
    footer: "Saga La Llave © 2026 · Бүх эрх хуулиар хамгаалагдсан.",
    words: ["066", "ОМЕГА", "ХААЛГА", "ДУРСАМЖ", "ХЯНАЛТ", "АЖИГЛАЛТ", "НЭВТРЭХ", "ТҮЛХҮҮР"],
  },

  ja: {
    nav: ["ホーム", "物語", "宇宙", "版", "プレス", "連絡"],
    gateTitle: "中央都市へようこそ",
    gateCopy: "十二時間。«066»と刻まれた鍵。存在してはならない記憶。",
    enterSound: "音響付きで入る",
    enterSilent: "静かに入る",
    welcome: "ようこそ",
    city: "中央都市",
    subtitle: "エンリケ・G・サンティバニェスによるディストピア・スリラー",
    hero: "十二時間。«066»と刻まれた鍵。存在してはならない記憶。真実は扉を開く…そして墓も。",
    ebook: "電子書籍を購入",
    physical: "紙の本を購入",
    system: "システム 066",
    control: "完全制御",
    code: "コード",
    level: "レベル",
    status: "状態",
    active: "作動中",
    sync: "グローバル同期",
    storyTitle: "始まったばかりのサーガ、その最初の扉。",
    story1: "パウラ・ガリードが禁じられた映像を流した後に消え、兄イッセイはすべての手がかりが彼を深く引き込む都市へ入る。",
    story2: "刑事カレン・アジュラスと共に、彼は中央都市が監視するだけではなく、記憶し、罰し、消去することを知る。",
    story3: "La Llave I: Ciudad Central は、真実が公開されず、漏洩され、追われ、高く支払われるチリ発ディストピア・サーガの始まり。",
    universeTitle: "グローバル戦術マップ",
    openMap: "戦術マップを開く",
    firstBook: "初版 · 最初の境界",
    locked: "LOCKED",
    lockedText: "この扉を開くには、まず中央都市を読む必要があります。",
    digitalEdition: "デジタル版",
    physicalEdition: "紙版",
    press1: "La Llave I が紙の本で登場",
    press1Text: "紙の版は、中央都市を紙で体験したい読者のためのコレクターズアイテムです。",
    press2: "Kindleで利用可能",
    press2Text: "電子書籍版なら Amazon Kindle ですぐに体験を始められます。",
    press3: "新しい扉を開くチリ小説",
    press3Text: "暗く映画的なディストピア・スリラーが新たな読者へ向かいます。",
    press4: "国際展開へ",
    press4Text: "066の宇宙は国境、言語、読者を越える準備をしています。",
    contactTitle: "中央都市へ通信を開く",
    name: "お名前",
    email: "メール",
    message: "メッセージ",
    send: "送信",
    music: "音楽",
    rain: "雨",
    audioOn: "音響を停止",
    audioOff: "音響を開始",
    close: "閉じる",
    footer: "Saga La Llave © 2026 · All rights reserved.",
    words: ["066", "オメガ", "扉", "記憶", "制御", "監視", "アクセス", "鍵"],
  },
};

const LANGUAGE_OPTIONS = [
  ["es", "ES"], ["en", "EN"], ["pt", "PT"], ["fr", "FR"], ["de", "DE"], ["it", "IT"],
  ["ru", "RU"], ["zh-CN", "简"], ["zh-TW", "繁"], ["yue", "粵"], ["ar", "AR"],
  ["hi", "HI"], ["he", "HE"], ["pl", "PL"], ["nl", "NL"], ["ko", "KO"],
  ["th", "TH"], ["mn", "MN"], ["ja", "JA"],
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" />
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
  const [lang, setLang] = useState("es");
  const t = LANGS[lang] || LANGS.es;
  const dir = ["ar", "he"].includes(lang) ? "rtl" : "ltr";

  const [introOpen, setIntroOpen] = useState(true);
  const [audioOn, setAudioOn] = useState(false);
  const [musicVol, setMusicVol] = useState(0.28);
  const [rainVol, setRainVol] = useState(0.18);
  const [mapOpen, setMapOpen] = useState(false);
  const [omegaText, setOmegaText] = useState("OMEGA");
  const [percent, setPercent] = useState(98.7);
  const [bgIndex, setBgIndex] = useState(0);

  const noirRef = useRef(null);
  const rainRef = useRef(null);

  const rainDrops = useMemo(
    () =>
      Array.from({ length: 130 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 23) * 0.11}s`,
        duration: `${0.52 + (i % 9) * 0.08}s`,
        height: `${46 + (i % 9) * 16}px`,
        opacity: 0.18 + (i % 6) * 0.045,
      })),
    []
  );

  useEffect(() => {
    if (noirRef.current) noirRef.current.volume = musicVol;
  }, [musicVol]);

  useEffect(() => {
    if (rainRef.current) rainRef.current.volume = rainVol;
  }, [rainVol]);

  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const id = window.setInterval(() => {
      const random = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      setOmegaText(random);
      setPercent(Number((94 + Math.random() * 5.8).toFixed(1)));
      window.setTimeout(() => setOmegaText("OMEGA"), 420);
    }, 2200);

    return () => window.clearInterval(id);
  }, []);

  async function startAudio() {
    const results = await Promise.allSettled([
      noirRef.current?.play(),
      rainRef.current?.play(),
    ]);

    setAudioOn(results.some((r) => r.status === "fulfilled"));
  }

  function stopAudio() {
    [noirRef.current, rainRef.current].forEach((audio) => {
      if (!audio) return;
      audio.pause();
    });

    setAudioOn(false);
  }

  function toggleAudio() {
    if (audioOn) stopAudio();
    else startAudio();
  }

  async function enterCity(withAudio) {
    setIntroOpen(false);
    if (withAudio) await startAudio();
  }

  return (
    <main className="site" lang={lang} dir={dir}>
      <audio ref={noirRef} src={AUDIO.noir} loop preload="metadata" />
      <audio ref={rainRef} src={AUDIO.rain} loop preload="metadata" />

      <Background
        rainDrops={rainDrops}
        bgSrc={BG_SOURCES[bgIndex]}
        onBgError={() => setBgIndex((current) => current + 1)}
        hideBg={bgIndex >= BG_SOURCES.length}
      />

      <HazardBorders />

      {introOpen && (
        <section className="intro" aria-label={t.gateTitle}>
          <div className="intro-card">
            <p className="kicker">{t.system} · 066</p>
            <h1>{t.gateTitle}</h1>
            <p>{t.gateCopy}</p>

            <div className="intro-actions">
              <button onClick={() => enterCity(true)}>{t.enterSound}</button>
              <button className="ghost" onClick={() => enterCity(false)}>{t.enterSilent}</button>
            </div>
          </div>
        </section>
      )}

      <nav className="nav" aria-label="Navegación principal">
        <a className="brand" href="#inicio">
          <span className="brand-icon">066</span>
          <span>
            LA LLAVE I
            <small>CIUDAD CENTRAL</small>
          </span>
        </a>

        <div className="nav-links">
          <a href="#inicio">{t.nav[0]}</a>
          <a href="#historia">{t.nav[1]}</a>
          <a href="#universo">{t.nav[2]}</a>
          <a href="#ediciones">{t.nav[3]}</a>
          <a href="#prensa">{t.nav[4]}</a>
          <a href="#contacto">{t.nav[5]}</a>
        </div>

        <div className="nav-right">
          <div className="nav-socials">
            <Social href={LINKS.instagram} label="Instagram"><InstagramIcon /></Social>
            <Social href={LINKS.tiktok} label="TikTok"><TikTokIcon /></Social>
            <Social href={LINKS.x} label="X"><XIcon /></Social>
            <Social href={LINKS.youtube} label="YouTube"><YouTubeIcon /></Social>
          </div>

          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Idioma">
            {LANGUAGE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </nav>

      <aside className="audio-top" aria-label="Controles de sonido">
        <button onClick={toggleAudio}>{audioOn ? t.audioOn : t.audioOff}</button>

        <label>
          {t.music}
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.01"
            value={musicVol}
            onChange={(e) => setMusicVol(Number(e.target.value))}
          />
        </label>

        <label>
          {t.rain}
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={rainVol}
            onChange={(e) => setRainVol(Number(e.target.value))}
          />
        </label>
      </aside>

      <section id="inicio" className="hero-section">
        <div className="hero-copy">
          <p className="kicker spaced">{t.welcome}</p>
          <h2>{t.city}</h2>
          <div className="gold-line" />
          <p className="author">{t.subtitle}</p>
          <p className="lead">{t.hero}</p>

          <div className="cta-row">
            <a className="cta primary" href={LINKS.kindle}>{t.ebook}</a>
            <a className="cta primary" href={LINKS.physical}>{t.physical}</a>
          </div>
        </div>

        <div className="hero-key">
          <img src={ASSETS.key} alt="Llave 066" />

          {t.words.map((word, index) => (
            <span key={`${word}-${index}`} className={`cryptic word-${index + 1}`}>
              {word}
            </span>
          ))}
        </div>

        <aside className="system-panel" aria-label={t.system}>
          <h3>{t.system}</h3>
          <p>{t.control}</p>

          <ul>
            <li><span>{t.code}:</span><b>066</b></li>
            <li><span>{t.level}:</span><b className="omega">{omegaText}</b></li>
            <li><span>{t.status}:</span><b>{t.active}</b></li>
          </ul>

          <div className="mini-map" />
          <p className="sync">{t.sync} {percent}%</p>

          <div className="bars">
            {Array.from({ length: 18 }).map((_, i) => (
              <i key={i} style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        </aside>
      </section>

      <section id="historia" className="history-section panel">
        <p className="kicker">{t.nav[1]}</p>
        <h2>{t.storyTitle}</h2>
        <p>{t.story1}</p>
        <p>{t.story2}</p>
        <p><strong>{t.story3}</strong></p>
      </section>

      <section id="universo" className="universe-section">
        <article className="map-card panel">
          <p className="kicker">{t.nav[2]}</p>
          <h2>{t.universeTitle}</h2>
          <img src={ASSETS.map} alt="Mapa táctico del universo 066" />
          <button className="map-button" onClick={() => setMapOpen(true)}>{t.openMap}</button>
        </article>

        <article className="saga-card panel">
          <h3>La Llave I: Ciudad Central</h3>
          <img src={ASSETS.mockup} alt="Mockup La Llave I: Ciudad Central" />
          <p>{t.firstBook}</p>
        </article>

        <LockedBook title={t.locked} copy={t.lockedText} />
        <LockedBook title={t.locked} copy={t.lockedText} />
      </section>

      <section id="ediciones" className="editions-section">
        <article className="edition-card panel">
          <h3>{t.digitalEdition}</h3>
          <h4>{t.ebook}</h4>
          <p>{t.press2Text}</p>
          <a href={LINKS.kindle}>{t.ebook}</a>
        </article>

        <article className="edition-card panel">
          <h3>{t.physicalEdition}</h3>
          <h4>{t.physical}</h4>
          <p>{t.press1Text}</p>
          <a href={LINKS.physical}>{t.physical}</a>
        </article>
      </section>

      <section id="prensa" className="press-section">
        <Press title={t.press1} img={ASSETS.mockup}>{t.press1Text}</Press>
        <Press title={t.press2} img={ASSETS.key}>{t.press2Text}</Press>
        <Press title={t.press3} img={ASSETS.map}>{t.press3Text}</Press>
        <Press title={t.press4} img={BG_SOURCES[0]}>{t.press4Text}</Press>
      </section>

      <section id="contacto" className="contact-section panel">
        <p className="kicker">{t.nav[5]}</p>
        <h2>{t.contactTitle}</h2>

        <form action={`mailto:${LINKS.email}`} method="post" encType="text/plain">
          <input name="nombre" placeholder={t.name} />
          <input name="email" placeholder={t.email} />
          <textarea name="mensaje" placeholder={t.message} rows="5" />
          <button>{t.send}</button>
        </form>
      </section>

      <footer className="footer">
        <p>{t.footer}</p>

        <div className="footer-socials">
          <Social href={LINKS.instagram} label="Instagram"><InstagramIcon /></Social>
          <Social href={LINKS.tiktok} label="TikTok"><TikTokIcon /></Social>
          <Social href={LINKS.x} label="X"><XIcon /></Social>
          <Social href={LINKS.youtube} label="YouTube"><YouTubeIcon /></Social>
        </div>
      </footer>

      {mapOpen && (
        <div className="modal" onClick={() => setMapOpen(false)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMapOpen(false)}>{t.close}</button>
            <img src={ASSETS.map} alt="Mapa táctico completo del universo 066" />
          </div>
        </div>
      )}
    </main>
  );
}

function Background({ rainDrops, bgSrc, onBgError, hideBg }) {
  return (
    <div className="background">
      <div className="city-fallback" />

      {!hideBg && (
        <img
          className="city-bg"
          src={bgSrc}
          alt=""
          onError={onBgError}
          loading="eager"
          decoding="async"
        />
      )}

      <div className="shade" />

      <div className="rain-field" aria-hidden="true">
        {rainDrops.map((drop, index) => (
          <span
            key={index}
            style={{
              left: drop.left,
              animationDelay: drop.delay,
              animationDuration: drop.duration,
              height: drop.height,
              opacity: drop.opacity,
            }}
          />
        ))}
      </div>

      <div className="lightning lightning-a" />
      <div className="lightning lightning-b" />
      <div className="lightning lightning-c" />
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

function LockedBook({ title, copy }) {
  return (
    <article className="locked-book panel">
      <div className="locked-cover">?</div>
      <h3>{title}</h3>
      <p>{copy}</p>
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
