import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const AMAZON_KINDLE_URL = "#";
const AMAZON_PHYSICAL_URL = "#";
const CONTACT_EMAIL = "contacto@lallaveoficial.com";

const CITY_BG = "/assets/la-llave-ciudad-central-hero.png";
const KEY_IMG = "/assets/la-llave-066-key.png";
const HAZARD_STRIPE = "/assets/la-llave-hazard-stripe.png";
const MAP_IMG = "/assets/la-llave-mapa-universo.png";
const BOOK_MOCKUP = "/assets/la-llave-mockup-portada-original.png";

const SOCIAL_LINKS = {
  instagram: "#",
  tiktok: "#",
  youtube: "#",
};

const keyCells = [
  {
    id: "066",
    title: "066",
    icon: "◆",
    position: "left-[50%] top-[18%]",
    text: "No es un número. Es una entrada. Una advertencia. Una condena.",
  },
  {
    id: "conspiracion",
    title: "La conspiración",
    icon: "◉",
    position: "left-[50%] top-[37%]",
    text: "Las Ciudades Capitales prometieron orden. Lo que construyeron fue una jaula.",
  },
  {
    id: "ciudad",
    title: "Ciudad Central",
    icon: "⌾",
    position: "left-[50%] top-[56%]",
    text: "La capital administrativa de América Unida. Progreso, vigilancia y silencio.",
  },
  {
    id: "personajes",
    title: "Los involucrados",
    icon: "▣",
    position: "left-[50%] top-[75%]",
    text: "Issei, Karen y Paula no entran en una investigación. Entran en una maquinaria diseñada para devorarlos.",
  },
];

const dossierBlocks = [
  ["Estado", "Clasificado"],
  ["Ubicación", "Ciudad Central"],
  ["Amenaza", "Sistema de control no declarado"],
  ["Tiempo restante", "12 horas"],
];

const regions = [
  {
    title: "Ciudad Central",
    code: "CC-00",
    tag: "Centro de mando",
    text: "Chile / América Unida. Núcleo administrativo, vigilancia permanente y control de información.",
  },
  {
    title: "Ciudad Oeste",
    code: "CO-04",
    tag: "Zona industrial",
    text: "Alemania / Euroáfrica. Sector de tensión política, rutas cerradas y comunicaciones filtradas.",
  },
  {
    title: "Ciudad Este",
    code: "CE-09",
    tag: "Sector tecnológico",
    text: "China / Asia Pacífico. Red de monitoreo, laboratorios de datos y control satelital.",
  },
  {
    title: "Regiones Polares",
    code: "RP-N/S",
    tag: "Zona militar",
    text: "Norte y Sur. Territorios restringidos, soberanía fragmentada y protocolos de vigilancia extrema.",
  },
];

const characters = [
  {
    name: "Issei Garrido",
    role: "El portador accidental",
    text: "Un joven común arrastrado al centro de una conspiración imposible.",
  },
  {
    name: "Karen Ajraz",
    role: "La detective",
    text: "Fría, precisa, peligrosa. Sabe que todos mienten, incluso quienes piden ayuda.",
  },
  {
    name: "Paula Garrido",
    role: "La chispa",
    text: "Publicó el video que nadie debía ver. Después, la ciudad empezó a cerrarse sobre ella.",
  },
];

function RainLayer() {
  const drops = useMemo(
    () =>
      Array.from({ length: 92 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        delay: (i % 19) * 0.16,
        duration: 0.72 + (i % 8) * 0.13,
        height: 34 + (i % 7) * 17,
        opacity: 0.1 + (i % 5) * 0.045,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden opacity-90">
      {drops.map((drop) => (
        <motion.span
          key={drop.id}
          className="absolute top-[-15%] w-px bg-gradient-to-b from-transparent via-yellow-100/45 to-transparent"
          style={{ left: drop.left, height: drop.height, opacity: drop.opacity }}
          animate={{ y: [0, 1200], x: [0, -38] }}
          transition={{ duration: drop.duration, delay: drop.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function NoiseLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 opacity-[0.05] mix-blend-screen">
      <div
        className="h-full w-full"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, white 0 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 0 1px, transparent 1px)",
          backgroundSize: "9px 9px, 13px 13px",
        }}
      />
    </div>
  );
}

function HazardBorders() {
  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 right-0 z-30 hidden overflow-hidden md:block">
      <motion.img
        src={HAZARD_STRIPE}
        alt=""
        className="absolute left-0 top-0 h-full w-20 object-cover opacity-60 mix-blend-screen lg:w-28"
        animate={{ x: [0, 5, -3, 0], rotate: [0, 0.24, -0.18, 0], filter: ["brightness(.75)", "brightness(1.04)", "brightness(.75)"] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src={HAZARD_STRIPE}
        alt=""
        className="absolute right-0 top-0 h-full w-20 scale-x-[-1] object-cover opacity-60 mix-blend-screen lg:w-28"
        animate={{ x: [0, -5, 3, 0], rotate: [0, -0.24, 0.18, 0], filter: ["brightness(.75)", "brightness(1.04)", "brightness(.75)"] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function CityBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${CITY_BG})` }}
        animate={{ scale: [1.02, 1.055, 1.02], filter: ["brightness(.6)", "brightness(.92)", "brightness(.6)"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 bg-white/0"
        animate={{ opacity: [0, 0, 0.22, 0, 0.08, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, repeatDelay: 3.8, ease: "easeInOut" }}
      />
      <div className="absolute inset-y-0 left-0 w-[38%] bg-[radial-gradient(ellipse_at_left,rgba(0,0,0,0.97)_0%,rgba(0,0,0,0.78)_42%,transparent_76%)]" />
      <div className="absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(ellipse_at_right,rgba(0,0,0,0.97)_0%,rgba(0,0,0,0.78)_42%,transparent_76%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.72)_38%,rgba(0,0,0,0.98))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,rgba(0,0,0,0.08)_30%,rgba(0,0,0,0.76)_86%)]" />
    </div>
  );
}

function LivingKey({ active, setActive }) {
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[620px] sm:h-[680px]">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, y: 34, scale: 0.92 }}
        animate={{ opacity: 1, y: [0, -12, 0], scale: 1 }}
        transition={{ opacity: { duration: 1.2 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
      >
        <motion.img
          src={KEY_IMG}
          alt="Llave 066"
          className="h-[88%] max-h-[660px] object-contain drop-shadow-[0_0_42px_rgba(212,166,61,0.48)]"
          animate={{ filter: ["contrast(1.08) brightness(.88)", "contrast(1.18) brightness(1.06)", "contrast(1.08) brightness(.88)"] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {keyCells.map((cell) => (
        <motion.button
          key={cell.id}
          onClick={() => setActive(cell)}
          onMouseEnter={() => setActive(cell)}
          className={`absolute ${cell.position} z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-yellow-300/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-[0.22em] text-yellow-100 shadow-[0_0_24px_rgba(250,190,60,0.16)] backdrop-blur-md transition hover:border-yellow-200 hover:bg-yellow-950/30`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>{cell.icon}</span>
          <span className="hidden sm:inline">{cell.title}</span>
        </motion.button>
      ))}

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.id}
            className="absolute bottom-4 left-1/2 z-30 w-[92%] max-w-[460px] -translate-x-1/2 rounded-2xl border border-yellow-300/20 bg-black/80 p-5 shadow-2xl shadow-black/70 backdrop-blur-xl"
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          >
            <div className="mb-2 flex items-center gap-2 text-yellow-300">
              <span>{active.icon}</span>
              <h3 className="font-serif text-lg uppercase tracking-[0.25em]">{active.title}</h3>
            </div>
            <p className="text-sm leading-7 text-stone-300">{active.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionTitle({ kicker, title, children }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="mb-3 text-xs uppercase tracking-[0.45em] text-yellow-400/70">{kicker}</p>
      <h2 className="font-serif text-3xl font-black uppercase tracking-[0.12em] text-stone-100 sm:text-5xl">{title}</h2>
      {children && <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-stone-400">{children}</p>}
    </div>
  );
}

function CTAButtons() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
      <a
        href={AMAZON_KINDLE_URL}
        className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-yellow-300/45 bg-yellow-300 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-black shadow-[0_0_44px_rgba(251,191,36,0.28)] transition hover:scale-[1.02] sm:w-auto"
      >
        <span className="absolute inset-0 -translate-x-full bg-white/40 transition duration-700 group-hover:translate-x-full" />
        <span className="text-sm">▸</span>
        Leer en Kindle
      </a>
      <a
        href={AMAZON_PHYSICAL_URL}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-stone-500/50 bg-stone-950/65 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-stone-100 backdrop-blur transition hover:border-yellow-300/60 hover:text-yellow-200 sm:w-auto"
      >
        <span className="text-sm">◆</span>
        Comprar libro físico
      </a>
    </div>
  );
}

function UniverseMap() {
  return (
    <section id="universo" className="relative overflow-hidden bg-black px-5 py-24 lg:px-8">
      <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[0.36fr_0.64fr]">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.45em] text-yellow-400/70">El universo</p>
            <h2 className="font-serif text-4xl font-black uppercase leading-tight tracking-[0.12em] text-stone-100 sm:text-5xl">Ciudades y regiones</h2>
            <p className="mt-6 max-w-md text-base leading-8 text-stone-400">
              La civilización se divide en ciudades capitales y regiones bajo una vigilancia que nunca duerme.
            </p>
            <div className="mt-8 grid gap-3 text-xs uppercase tracking-[0.25em] text-stone-400">
              <span><b className="text-yellow-300">●</b> Ciudad Central</span>
              <span><b className="text-yellow-300">▲</b> Ciudad Este</span>
              <span><b className="text-yellow-300">◆</b> Ciudad Oeste</span>
              <span><b className="text-yellow-300">◇</b> Regiones Polares</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-yellow-300/15 bg-stone-950/70 p-2 shadow-2xl shadow-black/60">
            <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_55%_45%,transparent_0%,rgba(0,0,0,0.22)_48%,rgba(0,0,0,0.72)_100%)]" />
            <div className="absolute inset-0 z-20 bg-[linear-gradient(90deg,rgba(250,204,21,0.08),transparent_14%,transparent_86%,rgba(250,204,21,0.08))]" />
            <motion.img
              src={MAP_IMG}
              alt="Mapa del universo de La Llave I: Ciudad Central"
              className="relative z-0 aspect-[16/10] w-full min-w-[760px] rounded-2xl object-cover opacity-90 saturate-0 md:min-w-0"
              animate={{ scale: [1, 1.018, 1], filter: ["brightness(.78) contrast(1.12)", "brightness(.96) contrast(1.22)", "brightness(.78) contrast(1.12)"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {regions.map((region) => (
            <motion.article
              key={region.title}
              className="rounded-2xl border border-stone-800 bg-black/70 p-5 shadow-xl shadow-black/40 backdrop-blur"
              whileHover={{ y: -5, borderColor: "rgba(253,224,71,0.42)" }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-yellow-400/70">{region.code}</p>
              <h3 className="mt-3 font-serif text-xl font-black uppercase tracking-[0.12em] text-stone-100">{region.title}</h3>
              <p className="mt-2 text-xs uppercase tracking-[0.26em] text-red-200/70">{region.tag}</p>
              <p className="mt-4 text-sm leading-7 text-stone-400">{region.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookSection() {
  return (
    <section id="libro" className="relative overflow-hidden bg-[linear-gradient(180deg,#050505,#0d0905,#020202)] px-5 py-24 lg:px-8">
      <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-red-700/10 blur-3xl" />
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.42fr_0.58fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto w-full max-w-[420px]">
          <div className="rounded-3xl border border-yellow-300/20 bg-black/60 p-4 shadow-[0_0_70px_rgba(212,166,61,0.16)] backdrop-blur">
            <img src={BOOK_MOCKUP} alt="Mockup de La Llave I: Ciudad Central" className="w-full rounded-2xl object-cover" />
          </div>
        </motion.div>

        <div className="text-center lg:text-left">
          <p className="mb-4 text-xs uppercase tracking-[0.45em] text-yellow-400/70">El libro</p>
          <h2 className="font-serif text-4xl font-black uppercase leading-tight tracking-[0.12em] text-stone-100 sm:text-6xl">La Llave I: Ciudad Central</h2>
          <p className="mt-7 max-w-2xl text-lg leading-9 text-stone-300 lg:mx-0">
            Una historia que atrapa desde la primera página. Disponible en Kindle y libro físico.
          </p>
          <div className="mt-9">
            <CTAButtons />
          </div>
          <div className="mt-8 grid gap-4 text-sm text-stone-400 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-800 bg-black/50 p-4">Entrega segura y garantizada</div>
            <div className="rounded-2xl border border-stone-800 bg-black/50 p-4">Edición de alta calidad</div>
            <div className="rounded-2xl border border-stone-800 bg-black/50 p-4">Envíos a todo el mundo</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LaLlaveLanding() {
  const [active, setActive] = useState(keyCells[0]);

  return (
    <main className="min-h-screen overflow-hidden bg-black text-stone-100 selection:bg-yellow-300 selection:text-black">
      <RainLayer />
      <NoiseLayer />
      <HazardBorders />

      <section id="inicio" className="relative min-h-screen overflow-hidden">
        <CityBackdrop />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(0,0,0,0.2)_38%,rgba(0,0,0,0.86)_88%)]" />
        <div className="relative z-30 mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-8 px-5 py-20 sm:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
          <motion.div
            initial={{ opacity: 0, x: -34 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="mx-auto max-w-2xl text-center lg:text-left"
          >
            <motion.div
              className="mb-8 inline-flex items-center gap-3 rounded-full border border-red-500/25 bg-red-950/20 px-4 py-2 text-xs uppercase tracking-[0.32em] text-red-200 backdrop-blur"
              animate={{ opacity: [0.72, 1, 0.72] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              <span className="text-sm">⚠</span>
              Acceso restringido
            </motion.div>

            <motion.p className="mb-5 text-sm font-bold uppercase tracking-[0.5em] text-yellow-300/75" animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 5, repeat: Infinity, repeatDelay: 1 }}>
              Doce horas. Una llave. Una ciudad que miente.
            </motion.p>
            <h1 className="font-serif text-5xl font-black uppercase leading-[0.92] tracking-[0.08em] text-stone-100 sm:text-7xl xl:text-8xl">
              La Llave <span className="block text-yellow-300">I</span>
            </h1>
            <h2 className="mt-5 text-xl font-black uppercase tracking-[0.32em] text-stone-300 sm:text-3xl">Ciudad Central</h2>
            <p className="mt-8 max-w-xl text-lg leading-9 text-stone-300 lg:mx-0">
              La verdad abre la puerta. <span className="text-yellow-300">Y también la tumba.</span>
            </p>
            <div className="mt-10">
              <CTAButtons />
            </div>
          </motion.div>

          <LivingKey active={active} setActive={setActive} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-30 h-20 bg-gradient-to-t from-black to-transparent" />
      </section>

      <section className="relative border-y border-yellow-300/10 bg-[linear-gradient(180deg,#050505,#0d0905,#050505)] px-5 py-24 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,166,61,0.12),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(127,29,29,0.14),transparent_30%)]" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionTitle kicker="Caso 066" title="El expediente">
            Cuando Paula Garrido desaparece tras revelar un video prohibido, su hermano Issei y la detective Karen Ajraz descienden al subsuelo de Ciudad Central.
          </SectionTitle>

          <div className="grid gap-4 md:grid-cols-4">
            {dossierBlocks.map(([label, value]) => (
              <motion.div
                key={label}
                className="rounded-2xl border border-yellow-300/15 bg-black/50 p-5 shadow-xl shadow-black/30 backdrop-blur"
                whileHover={{ y: -5, borderColor: "rgba(253,224,71,0.45)" }}
              >
                <p className="text-xs uppercase tracking-[0.32em] text-stone-500">{label}</p>
                <p className="mt-3 font-serif text-xl font-bold text-yellow-200">{value}</p>
              </motion.div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-stone-700/50 bg-stone-950/60 p-6 text-center shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
            <p className="font-serif text-2xl leading-10 text-stone-200 sm:text-3xl">
              Allí descubrirán que la llave no abre una puerta: <span className="text-yellow-300">abre un destino.</span>
            </p>
          </div>
        </div>
      </section>

      <UniverseMap />

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#050505,#110b05,#030303)] px-5 py-24 lg:px-8">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-red-700/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionTitle kicker="Involucrados" title="Los nombres del expediente" />
          <div className="grid gap-5 md:grid-cols-3">
            {characters.map((character) => (
              <motion.article
                key={character.name}
                className="rounded-3xl border border-yellow-300/15 bg-black/60 p-7 shadow-2xl shadow-black/40 backdrop-blur"
                whileHover={{ y: -7, rotateX: 2 }}
              >
                <p className="text-xs uppercase tracking-[0.35em] text-stone-500">{character.role}</p>
                <h3 className="mt-4 font-serif text-2xl font-black uppercase tracking-[0.12em] text-stone-100">{character.name}</h3>
                <p className="mt-5 leading-8 text-stone-400">{character.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <BookSection />

      <section className="relative min-h-[70vh] overflow-hidden px-5 py-24 text-center lg:px-8">
        <CityBackdrop />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="mb-5 text-xs uppercase tracking-[0.5em] text-yellow-300/75">La puerta ya está abierta</p>
          <h2 className="font-serif text-4xl font-black uppercase leading-tight tracking-[0.12em] text-stone-100 sm:text-6xl">
            ¿Vas a entrar?
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-9 text-stone-300">
            Un thriller distópico de conspiración, poder y verdad. Una saga donde cada llave puede abrir una puerta o cavar una tumba.
          </p>
          <div className="mt-10">
            <CTAButtons />
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-800 bg-black px-5 py-12 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.2fr_.8fr]">
          <div>
            <h3 className="font-serif text-2xl font-black uppercase tracking-[0.18em] text-yellow-200">Enrique G. Santibañez</h3>
            <p className="mt-4 max-w-2xl leading-8 text-stone-400">
              Autor chileno de <span className="text-stone-200">La Llave I: Ciudad Central</span>, una historia de conspiración, poder y verdad nacida de una pregunta brutal: ¿qué ocurre cuando la llave correcta cae en las manos equivocadas?
            </p>
          </div>
          <div className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-stone-500">Contacto oficial</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 flex items-center gap-3 text-yellow-200 transition hover:text-yellow-100">
              <span className="text-sm">✉</span> {CONTACT_EMAIL}
            </a>
            <div className="mt-6 flex gap-3 text-stone-400">
              <a href={SOCIAL_LINKS.instagram} className="transition hover:text-yellow-200" aria-label="Instagram">◎</a>
              <a href={SOCIAL_LINKS.youtube} className="transition hover:text-yellow-200" aria-label="YouTube">▶</a>
              <a href={SOCIAL_LINKS.tiktok} className="transition hover:text-yellow-200" aria-label="TikTok">♪</a>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs uppercase tracking-[0.28em] text-stone-600">© 2026 La Llave Oficial. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
