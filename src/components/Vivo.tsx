/** Piezas animadas de la presentación: aparición al bajar, contadores, ilustración del problema y mini simulador. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Calculator } from "lucide-react";
import { EJEMPLO, calcular, enlaceSimulador } from "../lib/costos";

const quieto = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

/** true cuando el elemento entra en pantalla (una sola vez) */
function useVisto<T extends Element>(margen = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (quieto() || !("IntersectionObserver" in window)) { setVisto(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect(); } }, { rootMargin: margen, threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, [margen]);
  return [ref, visto] as const;
}

/** Aparece con un deslizamiento suave; `demora` en ms para escalonar tarjetas */
export function Aparece({ children, demora = 0, className = "", as: Tag = "div" }: { children: ReactNode; demora?: number; className?: string; as?: "div" | "li" | "article" }) {
  const [ref, visto] = useVisto<HTMLDivElement>();
  return <Tag ref={ref as any} className={`aparece ${visto ? "visto" : ""} ${className}`} style={{ transitionDelay: `${demora}ms` }}>{children}</Tag>;
}

/** Número que sube de 0 al valor al entrar en pantalla */
export function Contador({ valor, duracion = 1400 }: { valor: number; duracion?: number }) {
  const [ref, visto] = useVisto<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!visto) return;
    if (quieto()) { setN(valor); return; }
    let raf = 0; const t0 = performance.now();
    const paso = (t: number) => { const u = Math.min(1, (t - t0) / duracion); setN(Math.round(valor * (1 - (1 - u) ** 3))); if (u < 1) raf = requestAnimationFrame(paso); };
    raf = requestAnimationFrame(paso); return () => cancelAnimationFrame(raf);
  }, [visto, valor, duracion]);
  return <span ref={ref}>{n.toLocaleString("es-AR")}</span>;
}

/**
 * Ilustración del problema, en loop de 9 s: Waze sigue la ruta y termina lejos del pozo (✕);
 * PicadaGPS traza la picada desde la salida de ruta y el pozo se enciende con un haz de luz.
 */
export function IlustracionProblema() {
  const [ref, visto] = useVisto<HTMLDivElement>();
  // pozos de fondo (fijos, pseudoaleatorios)
  const pozos = useMemo(() => {
    let x = 7; const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 46 }, () => [30 + r() * 540, 30 + r() * 260, r()]);
  }, []);
  const picada = "M470 232 C 430 228, 410 196, 372 190 S 318 150, 300 128 S 262 96, 228 92";
  return (
    <div ref={ref} className={`ilus ${visto ? "corre" : ""} relative rounded-2xl overflow-hidden border border-linea`} aria-label="Waze te deja en la ruta lejos del pozo; PicadaGPS te lleva por el camino de yacimiento hasta la locación" role="img">
      <svg viewBox="0 0 600 320" className="block w-full h-auto">
        <defs>
          <radialGradient id="suelo" cx="50%" cy="40%" r="75%"><stop offset="0" stopColor="#6b5a3e" /><stop offset="1" stopColor="#2d261b" /></radialGradient>
          <linearGradient id="haz" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#7cf2a8" stopOpacity=".9" /><stop offset="1" stopColor="#7cf2a8" stopOpacity="0" /></linearGradient>
          <filter id="brillo"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <rect width="600" height="320" fill="url(#suelo)" />
        {/* relieve: líneas de barda */}
        {[60, 120, 175, 250].map((y, i) => <path key={y} d={`M0 ${y} Q 150 ${y - 25 + i * 6} 300 ${y + 8} T 600 ${y - 4}`} stroke="#8a7650" strokeOpacity=".25" strokeWidth="1.2" fill="none" />)}
        {/* caminos internos tenues */}
        <path d="M120 300 L 180 210 L 228 92 M228 92 L 330 60 M300 128 L 420 110 L 520 70" stroke="#e8dcc0" strokeOpacity=".22" strokeWidth="2" fill="none" />
        {/* pozos de fondo */}
        {pozos.map(([x, y, d], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#e46a2c" className="pozo-fondo" style={{ animationDelay: `${(d * 3).toFixed(2)}s` }} />)}
        {/* ruta provincial */}
        <path d="M600 250 L 470 232 L 330 270 L 0 300" stroke="#f2b632" strokeWidth="7" strokeLinecap="round" fill="none" />
        <text x="520" y="272" fill="#f2b632" fontSize="13" fontWeight="700">RP 7</text>
        {/* Waze: sigue la ruta y termina lejos */}
        <path d="M600 250 L 470 232 L 330 270" stroke="#33ccff" strokeWidth="4" fill="none" className="waze" pathLength={100} />
        <g className="waze-x" transform="translate(330 270)"><circle r="13" fill="#d33" /><path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></g>
        <g className="waze-x"><rect x="248" y="282" width="148" height="24" rx="12" fill="#000" fillOpacity=".55" /><text x="322" y="299" textAnchor="middle" fill="#fff" fontSize="12">Waze: «llegaste»… a 3 km</text></g>
        {/* PicadaGPS: la picada hasta el pozo */}
        <circle cx="470" cy="232" r="6" fill="#fff" className="salida" />
        <path d={picada} stroke="#5be08f" strokeWidth="9" strokeOpacity=".35" fill="none" filter="url(#brillo)" className="picada" pathLength={100} />
        <path d={picada} stroke="#5be08f" strokeWidth="4.5" strokeLinecap="round" fill="none" className="picada" pathLength={100} />
        {/* haz de luz y pozo */}
        <g className="haz" transform="translate(228 92)">
          <polygon points="-5,0 5,0 24,-92 -24,-92" fill="url(#haz)" />
          <circle r="22" fill="#5be08f" fillOpacity=".25" className="anillo" />
          <circle r="9" fill="#fff" /><circle r="6" fill="#1f8f4e" />
        </g>
        <g className="etiqueta"><rect x="160" y="104" width="136" height="24" rx="12" fill="#1f8f4e" /><text x="228" y="121" textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="700">PicadaGPS: llegaste</text></g>
      </svg>
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1 text-[11px] sm:text-[12px] font-semibold">
        <span className="px-2 py-0.5 rounded-full bg-black/55 text-[#7fdcff]">— — Waze / Google Maps</span>
        <span className="px-2 py-0.5 rounded-full bg-black/55 text-[#7cf2a8]">━ PicadaGPS</span>
      </div>
    </div>
  );
}

/** Mini simulador: camiones y camionetas → costo anual, con enlace al cálculo completo */
export function MiniSimulador() {
  const [cam, setCam] = useState(EJEMPLO.camiones);
  const [cta, setCta] = useState(EJEMPLO.camionetas);
  const v = { ...EJEMPLO, camiones: cam, camionetas: cta };
  const r = calcular(v);
  const mill = (x: number) => `$ ${Math.round(x / 1e6).toLocaleString("es-AR")} M`;
  const Barra = ({ t, val, set, max }: { t: string; val: number; set: (n: number) => void; max: number }) => (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-[14px]"><span>{t}</span><b className="text-[18px]">{val}</b></span>
      <input type="range" min={0} max={max} value={val} onChange={(e) => set(Number(e.target.value))} className="rango w-full" />
    </label>
  );
  return (
    <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-center">
      <div className="flex flex-col gap-4">
        <Barra t="Camiones" val={cam} set={setCam} max={60} />
        <Barra t="Camionetas de soporte" val={cta} set={setCta} max={30} />
        <p className="text-[12px] opacity-75">8 % de errores de ubicación, 40 min por desvío en camión y 25 en camioneta, sueldos de convenio de Neuquén.</p>
      </div>
      <div className="rounded-xl bg-white/10 p-4 text-center min-w-[220px]">
        <p className="text-[12px] uppercase tracking-wide opacity-80">Costo estimado por año</p>
        <p key={Math.round(r.anual / 1e6)} className="text-[40px] leading-tight font-bold latido-num">{mill(r.anual)}</p>
        <p className="text-[14px] text-[#6fe39a] font-semibold">Ahorro posible: {mill(r.ahorro * 12)}</p>
        <a href={enlaceSimulador(v)} className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#0e1b2a] font-bold text-[14px]"><Calculator className="w-4 h-4" /> Ver el cálculo completo</a>
      </div>
    </div>
  );
}
