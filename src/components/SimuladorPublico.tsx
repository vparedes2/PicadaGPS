/**
 * Simulador público (picadagps.ar/simulador): costo mensual de los errores de ubicación de una flota.
 * Viene precargado con la empresa de ejemplo del informe (10 camiones y 5 camionetas) y cada uno cambia sus valores.
 * Los valores modificados viajan en el enlace (?v=…) para compartir el cálculo propio.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EJEMPLO, calcular, type V } from "../lib/costos";
import { Share2, RotateCcw, MessageCircle, ChevronDown, Truck, Clock, Users, Fuel, ShieldAlert, FileSignature, Sparkles, Mail } from "lucide-react";

const WHATSAPP = "5492994603071";

type Campo = [keyof V, string, string?, string?];
const GRUPOS: { titulo: string; icono: ReactNode; campos: Campo[] }[] = [
  { titulo: "Flota y llegadas a locación", icono: <Truck className="w-4 h-4" />, campos: [
    ["camiones", "Camiones"], ["viajesCamion", "Viajes a locación por camión", "por mes", "Carretones y equipos pesados suelen hacer menos"], ["personasCamion", "Personas por camión"],
    ["camionetas", "Camionetas de soporte"], ["salidasCamioneta", "Salidas por camioneta", "por mes", "3 a 4 por semana ≈ 15"], ["puntosSalida", "Puntos que visita en cada salida"], ["personasCamioneta", "Personas por camioneta"]] },
  { titulo: "Errores de ubicación", icono: <Clock className="w-4 h-4" />, campos: [
    ["pctError", "Llegadas con error de ubicación", "%"], ["minCamion", "Tiempo por desvío, camión", "min ida y vuelta"], ["minCamioneta", "Tiempo por desvío, camioneta", "min ida y vuelta"],
    ["kmhCamion", "Velocidad en picada, camión", "km/h"], ["kmhCamioneta", "Velocidad en picada, camioneta", "km/h"]] },
  { titulo: "Sueldos", icono: <Users className="w-4 h-4" />, campos: [
    ["brutoChofer", "Bruto mensual chofer", "$", "Camioneros CCT 40/89, rama petrolera, con adicionales"], ["brutoTecnico", "Bruto mensual técnico", "$", "Petroleros Privados NQN-RN-LP"],
    ["cargas", "Cargas sociales, SAC y vacaciones", "%"], ["horasMes", "Horas trabajadas por mes", "h"]] },
  { titulo: "Vehículo", icono: <Fuel className="w-4 h-4" />, campos: [
    ["gasoil", "Gasoil", "$/L"], ["consumoCamion", "Consumo camión", "L/100 km"], ["consumoCamioneta", "Consumo camioneta", "L/100 km"],
    ["desgasteCamion", "Desgaste camión en ripio", "$/km", "Cubiertas, suspensión, mantenimiento"], ["desgasteCamioneta", "Desgaste camioneta en ripio", "$/km"],
    ["equipoCamion", "Equipo parado, camión", "$/h", "Amortización, seguro, rastreo"], ["equipoCamioneta", "Equipo parado, camioneta", "$/h"]] },
  { titulo: "Esperas del cliente y HSE", icono: <ShieldAlert className="w-4 h-4" />, campos: [
    ["pctEspera", "Desvíos de camión que hacen esperar al cliente", "%"], ["costoEspera", "Costo de equipo o cuadrilla esperando", "$/h"],
    ["hseKm", "Costo de exposición HSE por km en picada", "$/km", "Valor esperado de incidentes: vuelcos, choques, fatiga"]] },
  { titulo: "Imagen y contrato", icono: <FileSignature className="w-4 h-4" />, campos: [
    ["factCamion", "Facturación de un camión con chofer", "$/mes"], ["factCamioneta", "Facturación de una camioneta con técnicos", "$/mes"],
    ["pctRiesgo", "Aumento del riesgo de no renovar", "%"], ["baseRiesgo", "Calcular sobre esta parte de la facturación", "%", "100 % = facturación; 20 % ≈ margen de ganancia (más prudente)"]] },
  { titulo: "Con PicadaGPS", icono: <Sparkles className="w-4 h-4" />, campos: [["reduccion", "Errores que se evitan", "%"]] }
];

const millon = (x: number, d = 1) => `$ ${(x / 1e6).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d })} M`;
const pesos = (x: number) => `$ ${Math.round(x).toLocaleString("es-AR")}`;
const n1 = (x: number, d = 0) => x.toLocaleString("es-AR", { maximumFractionDigits: d });

const leerEnlace = (): Partial<V> => {
  try { const q = new URLSearchParams(location.search).get("v"); return q ? JSON.parse(decodeURIComponent(escape(atob(q)))) : {}; } catch { return {}; }
};

export default function SimuladorPublico() {
  const [v, setV] = useState<V>(() => ({ ...EJEMPLO, ...leerEnlace() }));
  const [abierto, setAbierto] = useState<number | null>(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const r = useMemo(() => calcular(v), [v]);
  useEffect(() => { document.title = "Simulador · ¿Cuánto cuesta no encontrar la locación? · PicadaGPS"; }, []);
  const cambiar = (k: keyof V, x: string) => setV({ ...v, [k]: Number(x.replace(/\./g, "").replace(",", ".")) || 0 });
  const esEjemplo = (Object.keys(EJEMPLO) as (keyof V)[]).every((k) => v[k] === EJEMPLO[k]);

  const enlace = () => {
    const dif = Object.fromEntries((Object.keys(EJEMPLO) as (keyof V)[]).filter((k) => v[k] !== EJEMPLO[k]).map((k) => [k, v[k]]));
    return `${location.origin}/simulador${Object.keys(dif).length ? `?v=${btoa(unescape(encodeURIComponent(JSON.stringify(dif))))}` : ""}`;
  };
  const texto = () => `¿Cuánto cuesta no encontrar la locación? Con ${v.camiones} camiones y ${v.camionetas} camionetas, y ${v.pctError} % de errores de ubicación, el costo estimado es de ${millon(r.total)} por mes (${millon(r.anual, 0)} por año). Hacé tu cálculo:`;
  const compartir = async () => {
    const url = enlace();
    try { if (navigator.share) { await navigator.share({ title: "Simulador PicadaGPS", text: texto(), url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(`${texto()} ${url}`); setAviso("Enlace copiado: pegalo donde quieras."); } catch { setAviso(url); }
  };

  const filas: [string, number, string, string][] = [
    ["Horas-hombre", r.c.mo + r.t.mo, "#2563aa", `${n1(r.c.hh + r.t.hh, 1)} h-h · chofer ${pesos(r.hChofer)}/h · técnico ${pesos(r.hTecnico)}/h`],
    ["Combustible", r.c.comb + r.t.comb, "#d6681e", `${n1(r.c.km + r.t.km)} km extra en picada`],
    ["Desgaste del vehículo", r.c.des + r.t.des, "#8c5a28", "Cubiertas, suspensión, mantenimiento"],
    ["Equipo parado", r.c.eq + r.t.eq, "#6e767e", `${n1(r.c.horas + r.t.horas, 1)} h de vehículo perdidas`],
    ["Esperas del cliente", r.espera, "#d6681e", `${n1(r.c.desv * v.pctEspera / 100 * v.minCamion / 60, 1)} h de equipo esperando`],
    ["Riesgo HSE", r.hse, "#c4302b", "Más kilómetros en picada = más exposición"],
    ["Imagen y contrato", r.riesgo, "#782878", `${v.pctRiesgo} % de ${millon(r.facturacion * v.baseRiesgo / 100, 0)} por mes`]
  ];
  const max = Math.max(...filas.map((f) => f[1]), 1);

  return (
    <div className="h-full bg-fondo overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <header className="flex items-center justify-between py-3">
          <a href="/" className="text-[20px] font-bold tracking-tight">Picada<span className="text-acento">GPS</span> <span className="text-[14px] font-semibold text-tenue">Simulador</span></a>
          <a href="/" className="text-[13px] font-semibold text-acento">Probar la app</a>
        </header>

        <h1 className="text-[28px] leading-tight font-bold">¿Cuánto le cuesta a tu flota no encontrar la locación?</h1>
        <p className="text-[15px] text-tenue mt-1">Viene cargado con una empresa de ejemplo de Vaca Muerta: {EJEMPLO.camiones} camiones y {EJEMPLO.camionetas} camionetas de soporte. Cambiá los valores por los de tu empresa y el resultado se actualiza al instante.</p>

        <section className="sticky top-0 z-10 mt-4 rounded-2xl p-4 text-white shadow-lg" style={{ background: "linear-gradient(135deg,#0e1b2a,#1d3a5c)" }}>
          <p className="text-[12px] font-semibold uppercase tracking-wide opacity-75">Costo mensual estimado</p>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <p className="text-[40px] leading-none font-bold">{millon(r.total)}</p>
            <p className="text-[15px] text-[#ffbe78] font-semibold">{millon(r.anual, 0)} por año</p>
          </div>
          <p className="mt-2 text-[14px]"><span className="opacity-80">Directos {millon(r.directo, 2)} · Indirectos {millon(r.indirecto, 2)} · </span><b className="text-[#6fe39a]">Con PicadaGPS ahorrás {millon(r.ahorro)} por mes</b></p>
        </section>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[13px]">
          {[["Llegadas por mes", n1(r.c.llegadas + r.t.llegadas)], ["Desvíos por mes", n1(r.c.desv + r.t.desv)], ["Horas perdidas", `${n1(r.c.horas + r.t.horas, 1)} h`], ["Km extra", `${n1(r.c.km + r.t.km)} km`]].map(([a, b]) => (
            <div key={a} className="rounded-xl border border-linea bg-panel p-3"><p className="text-tenue">{a}</p><p className="text-[20px] font-bold">{b}</p></div>
          ))}
        </div>

        <section className="mt-4 rounded-xl border border-linea bg-panel p-4">
          <h2 className="text-[16px] font-bold mb-2">De dónde sale el costo</h2>
          <ul className="flex flex-col gap-3">
            {filas.map(([a, x, col, de]) => (
              <li key={a}>
                <div className="flex justify-between gap-2 text-[14px]"><span className="font-semibold">{a}</span><span className="font-bold">{pesos(x)}</span></div>
                <div className="h-2 rounded-full bg-fondo mt-1"><div className="h-2 rounded-full" style={{ width: `${(x / max) * 100}%`, background: col }} /></div>
                <p className="text-[12px] text-tenue mt-0.5">{de}</p>
              </li>
            ))}
          </ul>
        </section>

        <h2 className="mt-6 mb-2 text-[16px] font-bold">Tus valores</h2>
        <div className="flex flex-col gap-2">
          {GRUPOS.map((g, i) => (
            <section key={g.titulo} className="rounded-xl border border-linea bg-panel">
              <button onClick={() => setAbierto(abierto === i ? null : i)} className="w-full flex items-center justify-between gap-2 p-3 text-left">
                <span className="flex items-center gap-2 font-semibold text-[15px]"><span className="text-acento">{g.icono}</span>{g.titulo}</span>
                <ChevronDown className={`w-5 h-5 text-tenue transition-transform ${abierto === i ? "rotate-180" : ""}`} />
              </button>
              {abierto === i && (
                <div className="px-3 pb-3 grid sm:grid-cols-2 gap-3">
                  {g.campos.map(([k, et, un, ay]) => (
                    <label key={k} className="flex flex-col gap-1 text-[13px] text-tenue">
                      <span>{et}{un ? <span className="opacity-70"> ({un})</span> : null}</span>
                      <input inputMode="decimal" className={`rounded-lg border px-3 py-2 text-[15px] bg-fondo text-texto ${v[k] !== EJEMPLO[k] ? "border-acento" : "border-linea"}`}
                        value={v[k].toLocaleString("es-AR")} onChange={(e) => cambiar(k, e.target.value)} />
                      {ay && <span className="text-[12px]">{ay}</span>}
                    </label>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={compartir} className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-3 rounded-xl bg-acento text-acento-texto font-semibold text-[15px]"><Share2 className="w-5 h-5" /> Compartir mi cálculo</button>
          {!esEjemplo && <button onClick={() => setV(EJEMPLO)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-linea bg-panel text-[15px]"><RotateCcw className="w-4 h-4" /> Volver al ejemplo</button>}
        </div>
        {aviso && <p className="mt-2 text-[13px] text-tenue break-all">{aviso}</p>}

        <section className="mt-6 rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg,#123826,#1f6f4a)" }}>
          <h2 className="text-[20px] font-bold">Que tu flota llegue a la primera</h2>
          <p className="text-[14px] opacity-90 mt-1">PicadaGPS tiene más de 33.000 pozos, instalaciones, áreas y caminos de yacimiento de Neuquén, Río Negro, Mendoza y La Pampa, y funciona sin señal. Con el Plan Empresa sumás los puntos propios de tu empresa (bases, tranqueras, pads nuevos) para toda la flota.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/" className="px-4 py-2.5 rounded-lg bg-white text-[#123826] font-bold text-[15px]">Probar 7 días gratis</a>
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, hice el cálculo en el simulador de PicadaGPS (${millon(r.total)} por mes) y quiero consultar por el Plan Empresa. ${enlace()}`)}`} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/60 font-semibold text-[15px]"><MessageCircle className="w-4 h-4" /> Plan Empresa por WhatsApp</a>
            <a href={`mailto:empresas@picadagps.ar?subject=${encodeURIComponent("Plan Empresa PicadaGPS")}&body=${encodeURIComponent(`Hice el cálculo en el simulador (${millon(r.total)} por mes): ${enlace()}`)}`} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/60 font-semibold text-[15px]"><Mail className="w-4 h-4" /> empresas@picadagps.ar</a>
          </div>
        </section>

        <section className="mt-6 text-[13px] text-tenue flex flex-col gap-1.5">
          <h2 className="text-[14px] font-bold text-texto">Cómo se calcula</h2>
          <p>Desvíos = llegadas a locación × % de error. Cada desvío suma horas de la gente (bruto × cargas ÷ horas del mes), combustible, desgaste por km y costo del vehículo parado. Los km salen del tiempo del desvío por la velocidad en picada.</p>
          <p>Esperas del cliente = desvíos de camión × % que hace esperar × tiempo del desvío × costo por hora de equipo parado. Riesgo HSE = km extra × costo por km.</p>
          <p>Imagen y contrato = facturación de la flota × parte considerada × aumento del riesgo de no renovar. Es el valor más incierto: si querés un cálculo prudente, usá el 20 % (≈ margen de ganancia) en lugar del 100 %.</p>
          <p>Valores de referencia de noviembre de 2026: básico chofer de 1ra categoría (CCT 40/89) $ 1.132.833 más adicionales; mínimo garantizado de Petroleros Privados $ 4.130.864 más asignación Vaca Muerta. Son estimaciones con fines ilustrativos; reemplazalas por los valores de tu empresa.</p>
          <p className="mt-2">Consultá el mapa siempre con el vehículo detenido.</p>
        </section>
      </div>
    </div>
  );
}
