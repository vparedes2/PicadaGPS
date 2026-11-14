/** Novedades para el usuario (Mi cuenta) y registro técnico con fecha y hora (Administración). */
import { useState } from "react";
import { VERSIONES, TECNICO } from "../lib/cambios";

const dia = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

export function Novedades() {
  const [todas, setTodas] = useState(false);
  const lista = todas ? VERSIONES : VERSIONES.slice(0, 1);
  return (
    <section>
      <h2 className="text-[13px] uppercase tracking-wide text-tenue font-semibold mb-1.5">Novedades</h2>
      <div className="rounded-lg border border-linea bg-panel divide-y divide-linea text-[14px]">
        {lista.map((v) => (
          <div key={v.version} className="p-3">
            <p className="font-semibold">{v.titulo}</p>
            <p className="text-[12px] text-tenue">Versión {v.version} · {dia(v.fecha)}</p>
            <ul className="mt-1.5 flex flex-col gap-1 list-disc pl-5">
              {v.usuario.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        ))}
        {VERSIONES.length > 1 && (
          <button onClick={() => setTodas(!todas)} className="w-full p-2.5 text-[13px] text-acento font-semibold">
            {todas ? "Ver solo la última" : `Ver versiones anteriores (${VERSIONES.length - 1})`}
          </button>
        )}
      </div>
    </section>
  );
}

export function RegistroCambios() {
  const dias = Object.keys(TECNICO).sort().reverse();
  const version = (d: string) => VERSIONES.find((v) => v.fecha === d);
  const total = dias.reduce((n, d) => n + TECNICO[d].length, 0);
  return (
    <div className="flex flex-col gap-3 text-[14px]">
      <p className="text-tenue text-[13px]">{total} cambios subidos desde el {dia(dias.at(-1)!)}. Cada uno queda también en el historial del repositorio (GitHub › Commits), desde donde se puede volver a cualquier versión.</p>
      {dias.map((d) => (
        <section key={d} className="rounded-lg border border-linea bg-panel">
          <div className="px-3 py-2 border-b border-linea flex justify-between gap-2">
            <span className="font-semibold">{dia(d)}</span>
            {version(d) && <span className="text-[12px] text-acento font-semibold whitespace-nowrap">v{version(d)!.version}</span>}
          </div>
          <ul className="divide-y divide-linea">
            {[...TECNICO[d]].reverse().map(([h, t], i) => (
              <li key={i} className="px-3 py-1.5 flex gap-3"><span className="num text-tenue shrink-0">{h}</span><span>{t}</span></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
