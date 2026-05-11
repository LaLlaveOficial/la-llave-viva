import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const AMAZON_KINDLE_URL = "#";
const AMAZON_PAPERBACK_URL = "#";
const CONTACT_EMAIL = "contacto@lallaveoficial.com";

const CITY_BG = "/assets/la-llave-ciudad-central-hero.png";
const KEY_IMG = "/assets/la-llave-066-key.png";
const HAZARD_STRIPE = "/assets/la-llave-hazard-stripe.png";

const phrases = ["DOCE HORAS.", "UNA LLAVE.", "UNA CIUDAD QUE MIENTE."];

const keyCells = [
  {
    id: "066",
    title: "066",
    icon: "◆",
    position: "left-[48%] top-[16%]",
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
    position: "left-[49%] top-[55%]",
    text: "La capital administrativa de América Unida. Progreso, vigilancia y silencio.",
  },
  {
    id: "personajes",
    title: "Los involucrados",
    icon: "▣",
    position: "left-[50%] top-[74%]",
    text: "Issei, Karen y Paula no entran en una investigación. Entran en una maquinaria diseñada para devorarlos.",
  },
];

const dossierBlocks = [
  ["Estado", "Clasificado"],
  ["Ubicación", "Ciudad Central"],
  ["Amenaza", "Sistema de control no declarado"],
  ["Tiempo restante", "12 horas"],
];

const worldBlocks = [
  {
    title: "América Unida",
    text: "Un bloque continental bajo una capital que administra el orden y define la verdad oficial.",
  },
  {
    title: "Ciudad Central",
    text: "La sede del poder. Luces, cámaras, propaganda y una puerta que nadie debía abrir.",
  },
  {
    title: "Ciudad Oeste",
    text: "El otro eje del tablero. Un nombre que aparece cuando la mentira empieza a mostrar sus costuras.",
  },
  {
    title: "Regiones Polares",
    text: "Territorios bajo vigilancia militar internacional. El margen del mapa también tiene dueño.",
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

function useStormAudio() {
  const ctxRef = useRef(null);
  const rainGainRef = useRef(null);
  const intervalRef = useRef(null);

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (rainGainRef.current) {
      try {
        rainGainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.4);
      } catch {}
    }
  };

  const start = async () => {
    if (ctxRef.current) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "bandpass";
    rainFilter.frequency.value = 920;
    rainFilter.Q.value = 0.7;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.045;
    rainGainRef.current = rainGain;

    noise.connect(rainFilter).connect(rainGain).connect(ctx.destination);
    noise.start();

    const thunder = () => {
      if (!ctxRef.current) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 1.1);
      filter.type = "lowpass";
      filter.frequency.value = 140;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.5);
    };

    intervalRef.current = setInterval(() => {
      if (Math.random() > 0.46) thunder();
    }, 6500);
  };

  return { start, stop };
}

function RainLayer() {
  const drops = useMemo(
    () =>
      Array.from({ length: 110 }, (_, i) => ({
        id: i,
        left: `${(i * 29) % 100}%`,
        delay: (i % 23) * 0.13,
        duration: 0.72 + (i % 9) * 0.09,
        height: 34 + (i % 7) * 18,
        opacity: 0.13 + (i % 5) * 0.04,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden opacity-80">
      {drops.map((drop) => (
        <motion.span
          key={drop.id}
          className="absolute top-[-18%] w-px bg-gradient-to-b from-transparent via-yellow-100/40 to-transparent"
          style={{ left: drop.left, height: drop.height, opacity: drop.opacity }}
          animate={{ y: [0, 1200], x: [0, -40] }}
          transition={{ duration: drop.duration, delay: drop.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function NoiseLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 opacity-[0.05] mix-blend-screen">
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

function CityBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${CITY_BG})` }}
        animate={{
          scale: [1.02, 1.055, 1.02],
          filter: ["brightness(.62) contrast(1.14)", "brightness(.86) contrast(1.22)", "brightness(.62) contrast(1.14)"],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-0 bg-white"
        animate={{ opacity: [0, 0, 0.24, 0, 0.08, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, repeatDelay: 4.2, ease: "easeInOut" }}
      />

      <motion.img
        src={HAZARD_STRIPE}
        alt=""
        className="pointer-events-none absolute left-0 top-0 h-full w-24 object-cover opacity-55 mix-blend-screen sm:w-32 lg:w-40"
        animate={{ x: [0, 5, -2, 0], rotate: [0, 0.45, -0.25, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src={HAZARD_STRIPE}
        alt=""
        className="pointer-events-none absolute right-0 top-0 h-full w-24 scale-x-[-1] object-cover opacity-55 mix-blend-screen sm:w-32 lg:w-40"
        animate={{ x: [0, -5, 2, 0], rotate: [0, -0.45, 0.25, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-y-0 left-0 w-[34%] bg-[radial-gradient(ellipse_at_left,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.78)_42%,transparent_72%)]" />
      <div className="absolute inset-y-0 right-0 w-[34%] bg-[radial-gradient(ellipse_at_right,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.78)_42%,transparent_72%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[56%] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.75)_38%,rgba(0,0,0,0.98))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,rgba(0,0,0,0.05)_30%,rgba(0,0,0,0.78)_86%)]" />
    </div>
  );
}

function IntroPhrase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % phrases.length), 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-16 sm:h-20">
      <AnimatePresence mode="wait">
        <motion.p
          key={phrases[index]}
          className="text-sm font-black uppercase tracking-[0.5em] text-yellow-300/80 sm:text-base"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
          transition={{ duration: 0.75 }}
        >
          {phrases[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function LivingKey({ active, setActive }) {
  return (
    <div className="relative mx-auto h-[560px] w-full max-w-[620px] sm:h-[680px]">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, y: 34, scale: 0.92 }}
        animate={{ opacity: 1, y: [0, -12, 0], scale: 1 }}
        transition={{ opacity: { duration: 1.2 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
      >
        <motion.img
          src={KEY_IMG}
          alt="Llave 066"
          className="h-[92%] max-h-[670px] object-contain drop-shadow-[0_0_42px_rgba(212,166,61,0.48)]"
          animate={{ filter: ["contrast(1.08) brightness(.86)", "contrast(1.18) brightness(1.08)", "contrast(1.08) brightness(.86)"] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute left-1/2 top-[14%] z-30 -translate-x-1/2 rounded-full bg-yellow-200/20 px-8 py-2 text-4xl font-black tracking-[0.18em] text-yellow-100 blur-[0.2px] drop-shadow-[0_0_18px_rgba(255,220,120,0.9)]"
        initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
        animate={{
          opacity: [0, 1, 0.78],
          clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0% 0 0)"],
          textShadow: ["0 0 0px #fff", "0 0 18px #facc15", "0 0 8px #facc15"],
        }}
        transition={{ duration: 2.8, delay: 1.1, ease: "easeInOut" }}
      >
        066
      </motion.div>

      {keyCells.map((cell) => (
        <motion.button
          key={cell.id}
          onClick={() => setActive(cell)}
          onMouseEnter={() => setActive(cell)}
          className={`key-hotspot absolute ${cell.position} z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-yellow-300/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-[0.22em] text-yellow-100 backdrop-blur-md transition hover:border-yellow-200 hover:bg-yellow-950/30`}
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
        href={AMAZON_PAPERBACK_URL}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-stone-500/50 bg-stone-950/65 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-stone-100 backdrop-blur transition hover:border-yellow-300/60 hover:text-yellow-200 sm:w-auto"
      >
        <span className="text-sm">◆</span>
        Comprar tapa blanda
      </a>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState(keyCells[0]);
  const [entered, setEntered] = useState(false);
  const { start, stop } = useStormAudio();

  useEffect(() => () => stop(), []);

  const enter = async () => {
    setEntered(true);
    await start();
  };

  return (
    <main className="min-h-screen overflow-hidden bg-black text-stone-100 selection:bg-yellow-300 selection:text-black">
      <RainLayer />
      <NoiseLayer />

      <AnimatePresence>
        {!entered && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black px-6"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
          >
            <CityBackdrop />
            <div className="absolute inset-0 bg-black/72" />
            <motion.div
              className="relative z-10 max-w-2xl text-center"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <p className="mb-5 text-xs uppercase tracking-[0.6em] text-yellow-300/70">Acceso restringido</p>
              <h1 className="font-serif text-4xl font-black uppercase tracking-[0.15em] sm:text-6xl">Ciudad Central</h1>
              <p className="mx-auto mt-6 max-w-xl text-stone-300">La experiencia sonora requiere tu autorización. Al entrar, se activan lluvia, tensión y relámpagos.</p>
              <button
                onClick={enter}
                className="mt-9 rounded-full border border-yellow-300/50 bg-yellow-300 px-8 py-4 text-sm font-black uppercase tracking-[0.25em] text-black shadow-[0_0_44px_rgba(251,191,36,0.28)] transition hover:scale-[1.02]"
              >
                Entrar a Ciudad Central
              </button>
              <button
                onClick={() => setEntered(true)}
                className="mt-5 block w-full text-xs uppercase tracking-[0.25em] text-stone-500 transition hover:text-stone-300"
              >
                Entrar sin sonido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="scanline relative min-h-screen overflow-hidden">
        <CityBackdrop />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(0,0,0,0.2)_38%,rgba(0,0,0,0.9)_88%)]" />
        <div className="relative z-40 mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-8 px-5 py-24 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
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
              Expediente clasificado
            </motion.div>

            <IntroPhrase />
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

        <div className="absolute bottom-0 left-0 right-0 z-40 h-20 bg-gradient-to-t from-black to-transparent" />
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

      <section className="relative bg-black px-5 py-24 lg:px-8">
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionTitle kicker="Propaganda rota" title="Ciudad Central">
            El mapa cambió. Los países se volvieron bloques. La verdad se volvió trámite.
          </SectionTitle>
          <div className="grid gap-5 md:grid-cols-2">
            {worldBlocks.map((block, index) => (
              <motion.article
                key={block.title}
                className="group relative overflow-hidden rounded-3xl border border-stone-800 bg-[linear-gradient(145deg,rgba(23,23,23,.94),rgba(3,3,3,.9))] p-7 shadow-2xl shadow-black/40"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.08 }}
              >
                <div className="absolute right-0 top-0 h-full w-2 bg-yellow-300/70 opacity-70" />
                <p className="mb-4 text-xs uppercase tracking-[0.34em] text-red-300/70">Bloque {String(index + 1).padStart(2, "0")}</p>
                <h3 className="font-serif text-2xl font-black uppercase tracking-[0.16em] text-yellow-200">{block.title}</h3>
                <p className="mt-4 leading-8 text-stone-400">{block.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

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

      <section className="scanline relative min-h-[70vh] overflow-hidden px-5 py-24 text-center lg:px-8">
        <CityBackdrop />
        <div className="absolute inset-0 bg-black/72" />
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
              <span className="text-lg">◎</span>
              <span className="text-lg">▶</span>
              <span className="text-lg">⌾</span>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs uppercase tracking-[0.28em] text-stone-600">© 2026 La Llave Oficial. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
