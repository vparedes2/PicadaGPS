/** Mensaje flotante de novedades: se muestra una vez por teléfono cuando se suman provincias al mapa. */
import { useState } from "react";
import { X, MapPinned } from "lucide-react";
import type { Datos } from "../lib/datos";

const CLAVE = "picadagps.novedad.provincias-2025e";

export default function Novedad({ datos }: { datos: Datos }) {
  const otras = datos.meta?.fuentes?.pozos_otras;
  const [visto, setVisto] = useState(() => { try { return localStorage.getItem(CLAVE) === "1"; } catch { return false; } });
  if (!otras?.provincias || visto) return null;
  const cerrar = () => { setVisto(true); try { localStorage.setItem(CLAVE, "1"); } catch { /* nada */ } };
  const provs = Object.entries(otras.provincias).sort((a, b) => b[1] - a[1]);
  const nq = datos.meta?.fuentes?.pozos?.cantidad ?? 0;
  const inst = datos.meta?.fuentes?.instalaciones?.cantidad ?? datos.instalaciones.length;
  const otrasInst = (datos.meta?.fuentes as any)?.instalaciones_otras?.cantidad ?? 0;
  const n = (x: number) => x.toLocaleString("es-AR");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3" onClick={cerrar}>
      <div role="dialog" aria-labelledby="novedad-titulo" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-panel border border-linea shadow-2xl p-4 relative animate-[aparecer_.35s_ease-out]">
        <button onClick={cerrar} aria-label="Cerrar" className="absolute top-2.5 right-2.5 p-1.5"><X className="w-5 h-5 text-tenue" /></button>
        <div className="flex items-center gap-2 text-acento"><MapPinned className="w-6 h-6" /><span className="text-[12px] font-bold uppercase tracking-wide">Novedad</span></div>
        <h2 id="novedad-titulo" className="mt-1 text-[20px] font-bold leading-tight">Sumamos {n(otras.cantidad)} pozos de {provs.length} provincias</h2>
        <ul className="mt-3 flex flex-col gap-1.5 text-[14px]">
          {provs.map(([p, c]) => (
            <li key={p} className="flex justify-between rounded-lg bg-fondo px-3 py-2"><span>{p}</span><b className="num">{n(c)} pozos</b></li>
          ))}
          <li className="px-3 pt-1 text-[13px] text-tenue">Y siguen Neuquén con {n(nq)} pozos y {n(inst)} instalaciones.</li>
        </ul>
        <p className="mt-3 text-[13px] text-tenue leading-snug">
          Los pozos nuevos vienen del listado oficial de las operadoras (datos 2025). También sumamos las áreas de concesión de las tres provincias y los caminos de yacimiento de las tres provincias (OpenStreetMap). Y sumamos {n(otrasInst)} baterías, plantas y puntos de medición de las tres provincias (Secretaría de Energía).
        </p>
        <button onClick={cerrar} className="mt-4 w-full py-3 rounded-xl bg-acento text-acento-texto font-semibold text-[15px]">Ver el mapa</button>
      </div>
    </div>
  );
}
