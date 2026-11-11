/** Pantalla de ingreso: demo de la app, 7 días gratis, precios de los planes y botón de Google. */
import { useEffect, useState, type ReactNode } from "react";
import { Search, Route, WifiOff, Navigation } from "lucide-react";
import { ingresarConGoogle, consultarPrecios, pesos, type Precios } from "../lib/cuenta";
import Creditos from "./Creditos";

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

export default function Ingreso({ aviso }: { aviso?: ReactNode }) {
  const [p, setP] = useState<Precios | null>(null);
  const [creditos, setCreditos] = useState(false);
  const [quieto] = useState(() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } });
  useEffect(() => { consultarPrecios().then(setP).catch(() => setP(null)); }, []);

  const tri = p?.planes.trimestral, anu = p?.planes.anual;
  const ahorro = tri && anu ? tri.usd * 4 - anu.usd : 0;

  return (
    <div className="min-h-full bg-fondo overflow-y-auto relative">
      <Flotantes />
      <div className="relative z-10 w-full max-w-sm mx-auto p-4 flex flex-col gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/icono.svg" alt="" className="w-10 h-10" />
            <h1 className="text-[24px] font-bold tracking-tight">Picada<span className="text-acento">GPS</span></h1>
          </div>
          <p className="text-[15px] text-tenue mt-1">Encontrá cualquier pozo o locación de Neuquén y llegá, aunque no haya señal.</p>
        </div>

        {/* Demo: búsqueda de un pozo y el mapa que vuela hasta la locación */}
        <div className="relative mx-auto w-[210px] rounded-[24px] border-[5px] border-[#1c1a17] bg-[#1c1a17] shadow-xl overflow-hidden">
          <video
            className="block w-full aspect-[390/780] bg-[#ddd5c3]"
            src="/demo/picadagps-demo.mp4" poster="/demo/poster.jpg"
            autoPlay={!quieto} muted loop playsInline preload="metadata"
            aria-label="Demostración: se escribe la sigla de un pozo, se elige el resultado y el mapa se acerca hasta la locación con la línea desde la ruta"
          />
        </div>

        <div className="rounded-xl border-2 border-acento bg-panel p-3 text-center">
          <p className="text-[20px] font-bold text-acento">7 días gratis</p>
          <p className="text-[13px] text-tenue">Entrá con tu cuenta de Google y probala completa. No pedimos tarjeta.</p>
        </div>

        {aviso}
        <button onClick={() => ingresarConGoogle()} className="flex items-center justify-center gap-3 py-3.5 rounded-xl border border-linea bg-panel text-[16px] font-semibold shadow-sm">
          {LOGO_GOOGLE} Entrar con Google
        </button>

        <section>
          <h2 className="text-[13px] uppercase tracking-wide text-tenue font-semibold mb-1.5 text-center">Después de la prueba</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-linea bg-panel p-3">
              <p className="text-[13px] font-semibold">Trimestral</p>
              <p className="num text-[20px] font-bold">US$ {tri?.usd ?? "…"}</p>
              <p className="num text-[12px] text-tenue">{tri ? `${pesos(tri.ars)} hoy` : " "}</p>
              <p className="text-[12px] text-tenue">3 meses</p>
            </div>
            <div className="rounded-xl border border-acento bg-panel p-3 relative">
              {ahorro > 0 && <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 rounded-md bg-acento text-acento-texto text-[11px] font-semibold">Ahorrás US$ {ahorro}</span>}
              <p className="text-[13px] font-semibold">Anual</p>
              <p className="num text-[20px] font-bold">US$ {anu?.usd ?? "…"}</p>
              <p className="num text-[12px] text-tenue">{anu ? `${pesos(anu.ars)} hoy` : " "}</p>
              <p className="text-[12px] text-tenue">12 meses</p>
            </div>
          </div>
          <p className="text-[12px] text-tenue text-center mt-1.5">Pesos al dólar oficial del día. Pago único por transferencia, sin renovación automática.</p>
        </section>

        <ul className="flex flex-col gap-2 text-[14px]">
          {VENTAJAS.map(({ i: I, t }) => (
            <li key={t} className="flex items-center gap-2.5"><I className="w-4 h-4 text-acento shrink-0" /> {t}</li>
          ))}
        </ul>

        <div className="text-center text-[13px] text-tenue pb-2">
          <button onClick={() => setCreditos(true)} className="underline">Créditos</button>
        </div>
      </div>
      {creditos && <Creditos onCerrar={() => setCreditos(false)} />}
    </div>
  );
}
