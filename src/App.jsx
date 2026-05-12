import React from "react";

const ASSETS = {
  hero: "/assets/la-llave-ciudad-central-hero.png",
  key: "/assets/la-llave-066-key.png",
  map: "/assets/la-llave-mapa-universo.png",
  book: "/assets/la-llave-mockup-portada-original.png",
  stripe: "/assets/la-llave-hazard-stripe.png",
};

const LINKS = {
  amazon: "#",
  fisico: "#",
  instagram: "#",
  youtube: "#",
  tiktok: "#",
  spotify: "#",
};

export default function App() {
  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <style>{`
        @keyframes rain {
          from { transform: translateY(-20vh) translateX(0); }
          to { transform: translateY(120vh) translateX(-40px); }
        }
        @keyframes floatStripe {
          0%,100% { transform: translateY(0) skewY(0deg); opacity:.55; }
          50% { transform: translateY(-18px) skewY(-1.5deg); opacity:.85; }
        }
        @keyframes pulseGlow {
          0%,100% { filter: drop-shadow(0 0 18px rgba(245,190,36,.25)); }
          50% { filter: drop-shadow(0 0 45px rgba(245,190,36,.55)); }
        }
        .rain span {
          position:absolute;
          top:-20vh;
          width:1px;
          height:110px;
          background:linear-gradient(transparent,rgba(255,255,255,.42),transparent);
          animation:rain linear infinite;
        }
      `}</style>

      <HazardBorders />

      <section id="inicio" className="relative min-h-screen">
        <HeroBackground />
        <Navbar />

        <div className="relative z-20 mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 pt-28 pb-20 lg:grid-cols-2 lg:px-10">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.55em] text-yellow-400">
              Acceso restringido
            </p>

            <h1 className="font-serif text-6xl font-black uppercase leading-[.92] tracking-[.08em] text-stone-100 sm:text-7xl lg:text-8xl">
              Ciudad
              <br />
              Central
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-stone-300">
              La experiencia oscura, elegante y adictiva de{" "}
              <span className="font-bold text-yellow-300">
                La Llave I: Ciudad Central
              </span>{" "}
              ya está en línea.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a className="rounded bg-yellow-400 px-7 py-4 text-center text-sm font-black uppercase tracking-[.2em] text-black shadow-[0_0_35px_rgba(245,190,36,.35)] hover:bg-yellow-300" href="#libro">
                Entrar a Ciudad Central
              </a>
              <a className="rounded border border-white/30 px-7 py-4 text-center text-sm font-bold uppercase tracking-[.2em] text-white/90 hover:border-yellow-300 hover:text-yellow-300" href="#universo">
                Explorar mapa
              </a>
            </div>

            <div className="mt-14 text-xs uppercase tracking-[.38em] text-stone-400">
              <span className="text-yellow-400">066</span>
              <span className="mx-4">|</span>
              Proyecto La Llave
              <span className="mx-4">|</span>
              Nivel 4 de acceso
            </div>
          </div>

          <div className="relative hidden min-h-[620px] lg:block">
            <img
              src={ASSETS.key}
              alt="Llave 066"
              className="absolute right-8 top-1/2 max-h-[650px] -translate-y-1/2 object-contain"
              style={{ animation: "pulseGlow 4s ease-in-out infinite" }}
            />
          </div>
        </div>
      </section>

      <section id="universo" className="relative bg-[#050505] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.35fr_.65fr]">
          <div className="relative z-10">
            <p className="mb-4 text-xs uppercase tracking-[.55em] text-yellow-400">
              El universo
            </p>
            <h2 className="font-serif text-4xl font-black uppercase leading-tight tracking-[.1em] sm:text-5xl">
              Ciudades
              <br />y regiones
            </h2>
            <div className="mt-8 h-px w-20 bg-yellow-400" />
            <p className="mt-8 max-w-sm text-lg leading-8 text-stone-400">
              La civilización se divide en ciudades capitales y regiones bajo
              un sistema de vigilancia integral.
            </p>
            <p className="mt-5 font-medium text-yellow-400">
              Conoce su ubicación.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <img
              src={ASSETS.map}
              alt="Mapa táctico de La Llave I: Ciudad Central"
              className="w-full object-cover opacity-95"
            />
          </div>
        </div>
      </section>

      <section id="libro" className="relative bg-[#060606] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.42fr_.58fr]">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-yellow-400/10 blur-3xl" />
            <img
              src={ASSETS.book}
              alt="Mockup La Llave I: Ciudad Central"
              className="relative mx-auto max-h-[560px] object-contain"
            />
          </div>

          <div>
            <p className="mb-4 text-xs uppercase tracking-[.55em] text-yellow-400">
              El libro
            </p>
            <h2 className="font-serif text-4xl font-black uppercase leading-tight tracking-[.1em] sm:text-6xl">
              La Llave I:
              <br />
              Ciudad Central
            </h2>
            <div className="mt-6 h-px w-20 bg-yellow-400" />
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-300">
              Una historia que atrapa desde la primera página. Disponible en
              Kindle y libro físico.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a href={LINKS.amazon} className="rounded border border-white/25 px-7 py-4 text-center text-sm font-black uppercase tracking-[.2em] hover:border-yellow-400">
                Comprar en Amazon
              </a>
              <a href={LINKS.fisico} className="rounded bg-yellow-400 px-7 py-4 text-center text-sm font-black uppercase tracking-[.2em] text-black hover:bg-yellow-300">
                Comprar libro físico
              </a>
            </div>

            <div className="mt-10 grid gap-4 text-sm text-stone-400 sm:grid-cols-3">
              <Feature text="Entrega segura y garantizada" />
              <Feature text="Edición de alta calidad" />
              <Feature text="Envíos a todo el mundo" />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-serif text-2xl font-bold uppercase tracking-[.18em]">
              La Llave I
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              © 2026 La Llave Oficial. Todos los derechos reservados.
            </p>
          </div>

          <div className="flex gap-5 text-sm uppercase tracking-[.2em] text-stone-300">
            <a href={LINKS.instagram}>Instagram</a>
            <a href={LINKS.youtube}>YouTube</a>
            <a href={LINKS.tiktok}>TikTok</a>
            <a href={LINKS.spotify}>Spotify</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Navbar() {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 px-6 py-6 lg:px-10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <a href="#inicio" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-yellow-400 text-yellow-400">
            ✚
          </span>
          <span className="font-serif text-xl font-bold uppercase tracking-[.2em]">
            La Llave
            <small className="block text-[10px] tracking-[.45em] text-yellow-400">
              Ciudad Central
            </small>
          </span>
        </a>

        <div className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[.18em] text-stone-300 lg:flex">
          <a href="#inicio" className="text-yellow-400">Inicio</a>
          <a href="#libro">El libro</a>
          <a href="#universo">El universo</a>
          <a href="#libro">Comprar</a>
          <a href="mailto:contacto@lallaveoficial.com">Contacto</a>
        </div>
      </nav>
    </header>
  );
}

function HeroBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ASSETS.hero})` }}
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_45%,transparent_0%,rgba(0,0,0,.45)_45%,rgba(0,0,0,.95)_100%)]" />
      <div className="rain pointer-events-none absolute inset-0 overflow-hidden opacity-60">
        {Array.from({ length: 55 }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 19) % 100}%`,
              animationDuration: `${0.7 + (i % 8) * 0.13}s`,
              animationDelay: `${(i % 17) * 0.12}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function HazardBorders() {
  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 right-0 z-30 hidden md:block">
      <img
        src={ASSETS.stripe}
        alt=""
        className="absolute left-0 top-0 h-full w-20 object-cover opacity-60 lg:w-28"
        style={{ animation: "floatStripe 6s ease-in-out infinite" }}
      />
      <img
        src={ASSETS.stripe}
        alt=""
        className="absolute right-0 top-0 h-full w-20 scale-x-[-1] object-cover opacity-60 lg:w-28"
        style={{ animation: "floatStripe 6.4s ease-in-out infinite reverse" }}
      />
    </div>
  );
}

function Feature({ text }) {
  return (
    <div className="rounded border border-yellow-400/20 bg-black/40 px-5 py-4">
      <span className="text-yellow-400">▣</span>
      <p className="mt-2">{text}</p>
    </div>
  );
}
