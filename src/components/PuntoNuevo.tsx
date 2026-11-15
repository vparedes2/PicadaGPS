/**
 * Cargar un punto propio desde el campo con el GPS del teléfono.
 * Sin señal queda en una cola en el teléfono y se envía solo cuando vuelve la conexión.
 */
import { useEffect, useState } from "react";
import { X, Crosshair, MapPin } from "lucide-react";
import { guardarPunto, TIPOS_PUNTO, leerCoordenadas, type PuntoNuevo as TPunto } from "../lib/empresa";
import { recargarDatos } from "../lib/datos";

const COLA = "picadagps.puntos-cola";
const leerCola = (): TPunto[] => { try { return JSON.parse(localStorage.getItem(COLA) || "[]"); } catch { return []; } };
const guardarCola = (c: TPunto[]) => { try { c.length ? localStorage.setItem(COLA, JSON.stringify(c)) : localStorage.removeItem(COLA); } catch { /* nada */ } };
export const puntosEnCola = () => leerCola().length;

/** Envía los puntos que quedaron guardados sin señal. Devuelve cuántos se enviaron. */
export async function enviarCola(): Promise<number> {
  if (!navigator.onLine) return 0;
  const cola = leerCola(); if (!cola.length) return 0;
  const quedan: TPunto[] = []; let n = 0;
  for (const p of cola) { try { await guardarPunto(p); n++; } catch { quedan.push(p); } }
  guardarCola(quedan);
  if (n) recargarDatos();
  return n;
}

/** Muestra cómo se interpretaron las coordenadas pegadas */
export function Leido({ t }: { t: string }) {
  if (!t.trim()) return null;
  const c = leerCoordenadas(t);
  return c ? <span className="text-[12px] text-acento">✓ {c[0].toFixed(6)}, {c[1].toFixed(6)}</span>
    : <span className="text-[12px] text-alerta">No reconozco esas coordenadas</span>;
}

export default function PuntoNuevo({ empresa, color, rol, yo, onCerrar }: {
  empresa: string; color: string; rol: string; yo: { lat: number; lon: number; precision: number } | null; onCerrar: (msj?: string) => void
}) {
  const [nombre, setNombre] = useState(""); const [tipo, setTipo] = useState(TIPOS_PUNTO[0]); const [nota, setNota] = useState("");
  const [pos, setPos] = useState<{ lat: number; lon: number; precision?: number } | null>(yo);
  const [coords, setCoords] = useState(""); const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null); const [yendo, setYendo] = useState(false);

  const medir = () => {
    if (!("geolocation" in navigator)) { setError("Este navegador no da la ubicación."); return; }
    setBuscando(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lon: p.coords.longitude, precision: p.coords.accuracy }); setBuscando(false); },
      (e) => { setBuscando(false); setError(e.code === 1 ? "Sin permiso de ubicación: habilitalo en el navegador." : "No se pudo obtener la posición. Probá a cielo abierto."); },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  };
  useEffect(() => { if (!yo) medir(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    const c = coords.trim() ? leerCoordenadas(coords) : pos ? [pos.lat, pos.lon] as [number, number] : null;
    if (!c) { setError("Falta la ubicación: usá el GPS o pegá las coordenadas."); return; }
    const p: TPunto = { nombre: nombre.trim(), tipo, nota: nota.trim() || null, lat: c[0], lon: c[1] };
    setYendo(true); setError(null);
    if (!navigator.onLine) { guardarCola([...leerCola(), p]); onCerrar("Sin señal: el punto quedó guardado en el teléfono y se envía solo cuando vuelva la conexión."); return; }
    try {
      const r = await guardarPunto(p);
      recargarDatos();
      onCerrar(r.estado === "pendiente" ? "Punto cargado. Lo ve la empresa cuando lo apruebe un administrador." : "Punto cargado. Ya lo ve toda la empresa.");
    } catch (e) {
      const m = (e as Error).message;
      if (/conexi|fetch|network|lenta/i.test(m)) { guardarCola([...leerCola(), p]); onCerrar("Señal débil: el punto quedó guardado en el teléfono y se envía solo cuando mejore la conexión."); }
      else { setError(m); setYendo(false); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={() => onCerrar()}>
      <div className="w-full max-w-md rounded-2xl bg-fondo p-4 flex flex-col gap-3 shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div><p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color }}>{empresa}</p><h2 className="text-[20px] font-bold">Agregar punto acá</h2></div>
          <button onClick={() => onCerrar()} aria-label="Cerrar" className="p-1"><X className="w-6 h-6 text-tenue" /></button>
        </div>
        <div className="rounded-lg border border-linea bg-panel p-3 text-[14px] flex items-center gap-3">
          <MapPin className="w-5 h-5 shrink-0" style={{ color }} />
          <span className="flex-1">{buscando ? "Buscando tu posición…" : pos ? <><span className="num">{pos.lat.toFixed(6)}, {pos.lon.toFixed(6)}</span>{pos.precision ? <span className="text-tenue"> · ±{Math.round(pos.precision)} m</span> : null}</> : "Sin posición"}</span>
          <button onClick={medir} className="flex items-center gap-1 text-[13px] font-semibold text-acento"><Crosshair className="w-4 h-4" /> GPS</button>
        </div>
        {pos?.precision && pos.precision > 50 && <p className="text-[12px] text-[#b37a00]">La precisión es baja. Si podés, esperá unos segundos a cielo abierto y tocá GPS de nuevo.</p>}
        <label className="flex flex-col gap-1 text-[13px] text-tenue">O pegá coordenadas (opcional): decimales o de Google Earth
          <input className="rounded-lg border border-linea bg-panel px-3 py-2.5 text-[15px]" value={coords} onChange={(e) => setCoords(e.target.value)} placeholder={`-38.4845, -68.5264  o  38°29'4.21" S 68°31'34.97" O`} />
          <Leido t={coords} /></label>
        <label className="flex flex-col gap-1 text-[13px] text-tenue">Nombre
          <input className="rounded-lg border border-linea bg-panel px-3 py-2.5 text-[15px]" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tranquera norte" /></label>
        <label className="flex flex-col gap-1 text-[13px] text-tenue">Tipo
          <select className="rounded-lg border border-linea bg-panel px-3 py-2.5 text-[15px]" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS_PUNTO.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-[13px] text-tenue">Nota para los demás (opcional)
          <input className="rounded-lg border border-linea bg-panel px-3 py-2.5 text-[15px]" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Entrar por la picada del km 12" /></label>
        {rol === "carga" && <p className="text-[12px] text-tenue">Queda pendiente hasta que lo apruebe un administrador de la empresa.</p>}
        {error && <p className="text-[14px] text-alerta">{error}</p>}
        <button disabled={yendo || !nombre.trim()} onClick={guardar} className="py-3 rounded-xl text-white text-[16px] font-bold disabled:opacity-50" style={{ background: color }}>{yendo ? "Guardando…" : "Guardar punto"}</button>
        <p className="text-[12px] text-tenue text-center">Cargá el punto con el vehículo detenido.</p>
      </div>
    </div>
  );
}
