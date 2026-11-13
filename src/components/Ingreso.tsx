/** Pantalla de ingreso: demo de la app, 7 días gratis, precios de los planes y botón de Google. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, Route, WifiOff, Navigation, MessageCircle, Share2 } from "lucide-react";
import { ingresarConGoogle, montarBotonGoogle, consultarPrecios, pesos, type Precios } from "../lib/cuenta";
import { compartirWhatsApp } from "../lib/compartir";

const LOGO_GOOGLE = (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
);

/** Satélite y punto GPS flotando de fondo, con la señal punteada entre ambos. Solo decoración. */
function Flotantes() {
  return (
    <div className="flota-capa" aria-hidden="true">
      <svg className="flota-senal" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M88 22 Q 60 18 12 44" fill="none" stroke="var(--acento)" strokeWidth="0.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity=".55" />
      </svg>
      <svg className="flota-sat" viewBox="0 0 120 80">
        <g className="panel">
          <rect x="4" y="28" width="38" height="24" rx="2" fill="#2b5c8a" stroke="#1d3f60" strokeWidth="2" />
          <path d="M17 28v24M29 28v24M4 40h38" stroke="#7fb0dc" strokeWidth="1.2" />
          <rect x="78" y="28" width="38" height="24" rx="2" fill="#2b5c8a" stroke="#1d3f60" strokeWidth="2" />
          <path d="M91 28v24M103 28v24M78 40h38" stroke="#7fb0dc" strokeWidth="1.2" />
        </g>
        <path d="M42 40h8M70 40h8" stroke="#5f5a52" strokeWidth="3" />
        <rect x="50" y="26" width="20" height="28" rx="3" fill="#d9d3c7" stroke="#5f5a52" strokeWidth="2" />
        <path d="M60 54v8" stroke="#5f5a52" strokeWidth="2" />
        <path d="M52 68a8 6 0 0 0 16 0z" fill="#c2410c" />
        <circle cx="60" cy="20" r="3" fill="#f5c542" />
        <path d="M60 23v3" stroke="#5f5a52" strokeWidth="2" />
      </svg>
      <svg className="flota-pin" viewBox="0 0 56 80">
        <ellipse className="onda" cx="28" cy="70" rx="20" ry="7" fill="none" stroke="var(--acento)" strokeWidth="2" />
        <ellipse className="onda b" cx="28" cy="70" rx="20" ry="7" fill="none" stroke="var(--acento)" strokeWidth="2" />
        <path d="M28 4C16 4 8 13 8 24c0 15 20 42 20 42s20-27 20-42C48 13 40 4 28 4z" fill="#1f3a2e" />
        <circle cx="28" cy="24" r="8" fill="#c2410c" stroke="#f4f1ea" strokeWidth="3" />
      </svg>
    </div>
  );
}

const VENTAJAS = [
  { i: Search, t: "Buscá por sigla, pad, área u operadora" },
  { i: Route, t: "Cómo llegar desde la ruta y la instalación más cercana" },
  { i: Navigation, t: "Abrí Waze o Google Maps con un toque" },
  { i: WifiOff, t: "Funciona sin señal en el yacimiento" }
];

/** Botón oficial de Google; si no carga (bloqueador, sin red), queda el botón propio con redirección */
function BotonGoogle() {
  const ref = useRef<HTMLDivElement>(null);
  const [oficial, setOficial] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    montarBotonGoogle(d, d.parentElement?.clientWidth ?? 320, setError).then(setOficial).catch(() => setOficial(false));
  }, []);
  return (
    <>
      <div className={`relative flex justify-center py-2 rounded-xl border-2 border-acento bg-panel shadow-md ${oficial ? "" : "hidden"}`}>
        <div ref={ref} className="min-h-[44px]" />
      </div>
      {oficial === false && (
        <button onClick={() => ingresarConGoogle()} className="relative w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-acento bg-panel text-[17px] font-bold shadow-md">
          {LOGO_GOOGLE} Entrar con Google
        </button>
      )}
      {oficial === null && <div className="py-4 rounded-xl border-2 border-acento bg-panel text-center text-[15px] text-tenue">Cargando el ingreso con Google…</div>}
      {error && <p className="mt-2 text-[13px] text-alerta text-center">{error}</p>}
    </>
  );
}

export default function Ingreso({ aviso }: { aviso?: ReactNode }) {
  const [p, setP] = useState<Precios | null>(null);
  const [quieto] = useState(() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } });
  // Precios: se muestran los últimos conocidos mientras llega (o si falla) la consulta del día
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem("picadagps.precios") || "null"); if (v?.planes?.trimestral && v?.planes?.anual) setP(v); } catch { /* nada */ }
    consultarPrecios().then((x) => { if (!x?.planes?.trimestral || !x?.planes?.anual) return; setP(x); try { localStorage.setItem("picadagps.precios", JSON.stringify(x)); } catch { /* nada */ } }).catch(() => undefined);
  }, []);

  const tri = p?.planes?.trimestral, anu = p?.planes?.anual;
  // Ahorro del anual frente a 4 trimestres, en pesos
  const ahorro = tri && anu ? tri.ars * 4 - anu.ars : 0;
  const consultar = (plan: "trimestral" | "anual") => {
    const pl = plan === "anual" ? anu : tri;
    const nombre = plan === "anual" ? "anual (12 meses)" : "trimestral (3 meses)";
    const precio = pl ? ` (hoy ${pesos(pl.ars)})` : "";
    const texto = `Hola Víctor, quiero consultar por el plan ${nombre} de PicadaGPS${precio}. ¿Cómo pago?`;
    location.href = `https://wa.me/${p?.whatsapp || "5492994603071"}?text=${encodeURIComponent(texto)}`;
  };

  return (
    <div className="min-h-full bg-fondo overflow-y-auto relative">
      <Flotantes />
      <div className="relative z-10 w-full max-w-sm mx-auto p-4 flex flex-col gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/icono.svg" alt="" className="w-10 h-10" />
            <h1 className="text-[24px] font-bold tracking-tight">Picada<span className="text-acento">GPS</span></h1>
            <button onClick={compartirWhatsApp} aria-label="Compartir por WhatsApp" title="Compartir por WhatsApp" className="ml-1 p-2 rounded-full border border-linea bg-panel">
              <Share2 className="w-4 h-4 text-acento" />
            </button>
          </div>
          <p className="text-[15px] text-tenue mt-1">Encontrá cualquier pozo o locación de Neuquén y llegá, aunque no haya señal.</p>
        </div>

        {/* Demo: búsqueda de un pozo y el mapa que vuela hasta la locación */}
        <div className="relative mx-auto w-[185px] rounded-[22px] border-[5px] border-[#1c1a17] bg-[#1c1a17] shadow-xl overflow-hidden">
          <video
            className="block w-full aspect-[390/780] bg-[#ddd5c3]"
            poster="/demo/poster.jpg"
            autoPlay={!quieto} muted loop playsInline preload="metadata"
            aria-label="Demostración: se escribe la sigla de un pozo, se elige el resultado y el mapa se acerca hasta la locación con la línea desde la ruta"
          >
            <source src="/demo/picadagps-demo.webm" type="video/webm" />
            <source src="/demo/picadagps-demo.mp4" type="video/mp4" />
          </video>
        </div>

        <ul className="flex flex-col gap-2 text-[14px] px-1">
          {VENTAJAS.map(({ i: I, t }) => (
            <li key={t} className="flex items-center gap-2.5"><I className="w-4 h-4 text-acento shrink-0" /> {t}</li>
          ))}
        </ul>

        <div className="rounded-xl border-2 border-acento bg-panel p-3 text-center">
          <p className="text-[20px] font-bold text-acento">7 días gratis</p>
          <p className="text-[13px] text-tenue">Entrá con tu cuenta de Google y probala completa. No pedimos tarjeta.</p>
        </div>

        {aviso}
        {/* Botón principal con un brillo que late y una mano que invita a tocarlo */}
        <div className="relative mt-1">
          <span className="google-latido absolute inset-0 rounded-xl" aria-hidden="true" />
          <BotonGoogle />
          <svg className="google-mano absolute -bottom-7 right-6 w-11 h-11 pointer-events-none drop-shadow" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M19 6.5c-1.9 0-3.4 1.5-3.4 3.4v15.6l-2.6-2.7c-1.4-1.4-3.6-1.5-5-.2-1.3 1.3-1.4 3.4-.2 4.8l9.4 11.4c1.9 2.3 4.7 3.7 7.7 3.7h6.6c5 0 9-4 9-9V23.6c0-1.8-1.5-3.3-3.3-3.3-.8 0-1.6.3-2.2.9v-.2c0-1.8-1.5-3.3-3.3-3.3-.9 0-1.7.4-2.3 1-.3-1.6-1.7-2.8-3.3-2.8-.7 0-1.4.2-1.9.6V9.9C22.4 8 20.9 6.5 19 6.5z" fill="#fff" stroke="#1c1a17" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M22.4 16.5v8M29 18.3v7M35.5 21.2v5" stroke="#1c1a17" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>

        <section className="mt-28 pt-6 border-t border-linea">
          <h2 className="text-[13px] uppercase tracking-wide text-tenue font-semibold mb-1.5 text-center">Después de la prueba</h2>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => consultar("trimestral")} className="text-left rounded-xl border border-linea bg-panel p-3 active:scale-[.98] transition">
              <p className="text-[13px] font-semibold">Trimestral</p>
              <p className="num text-[20px] font-bold">{tri ? pesos(tri.ars) : "Consultar"}</p>
              <p className="text-[12px] text-tenue">3 meses</p>
              <p className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-acento"><MessageCircle className="w-3.5 h-3.5" /> Consultar</p>
            </button>
            <button onClick={() => consultar("anual")} className="text-left rounded-xl border border-acento bg-panel p-3 relative active:scale-[.98] transition">
              {ahorro > 0 && <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 rounded-md bg-acento text-acento-texto text-[11px] font-semibold">Ahorrás {pesos(ahorro)}</span>}
              <p className="text-[13px] font-semibold">Anual</p>
              <p className="num text-[20px] font-bold">{anu ? pesos(anu.ars) : "Consultar"}</p>
              <p className="text-[12px] text-tenue">12 meses</p>
              <p className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-acento"><MessageCircle className="w-3.5 h-3.5" /> Consultar</p>
            </button>
          </div>
          <p className="text-[12px] text-tenue text-center mt-1.5">Precio del día. Pago único por transferencia, sin renovación automática.
            Tocá un plan para consultarlo por WhatsApp; al terminar la prueba también lo pedís desde la app.</p>
        </section>


        <button onClick={compartirWhatsApp} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-linea bg-panel text-[15px] font-semibold">
          <Share2 className="w-4 h-4 text-acento" /> Compartir por WhatsApp
        </button>

        <div className="pb-4" />
      </div>
    </div>
  );
}
