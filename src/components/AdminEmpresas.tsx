/** Administración › Empresas: aprobar solicitudes, vigencia del plan y cantidad de usuarios. */
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { empresasAdmin, urlPortal } from "../lib/empresa";
import { diaLargo } from "../lib/cuenta";

const COLOR: Record<string, string> = { activa: "#1f7a4d", pendiente: "#b37a00", suspendida: "#b3261e", rechazada: "#777" };
const sumarDias = (iso: string | null, d: number) => new Date(Math.max(Date.now(), iso ? Date.parse(iso) : 0) + d * 86400000).toISOString();

export default function AdminEmpresas() {
  const [lista, setLista] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = (p?: Record<string, unknown>) => empresasAdmin(p).then(setLista).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, []);
  if (error) return <p className="text-[14px] text-alerta">{error}</p>;
  if (!lista) return <p className="text-[14px] text-tenue">Cargando…</p>;
  return (
    <div className="flex flex-col gap-3 text-[14px]">
      <p className="text-tenue text-[13px]">Las empresas piden el alta en <a className="underline" href={urlPortal()} target="_blank" rel="noreferrer">empresas.picadagps.ar</a>. Mientras la empresa esté activa y vigente, todos sus usuarios entran con plan Empresa.</p>
      {!lista.length && <p className="text-tenue">Todavía no hay empresas.</p>}
      {lista.map((e) => (
        <section key={e.id} className="rounded-lg border border-linea bg-panel p-3 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-[15px]"><span className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle" style={{ background: e.color }} />{e.nombre}</p>
              <p className="text-tenue text-[12px]">{e.slug}.picadagps.ar · {e.contacto_email}{e.contacto_tel ? ` · ${e.contacto_tel}` : ""}{e.cuit ? ` · CUIT ${e.cuit}` : ""}</p>
            </div>
            <span className="text-[12px] font-semibold uppercase" style={{ color: COLOR[e.estado] }}>{e.estado}</span>
          </div>
          <p className="text-[13px]">{e.miembros} usuarios de {e.usuarios_max}{e.dominio_email ? ` + todo @${e.dominio_email}` : ""} · {e.puntos} puntos · {e.activo_hasta ? `vigente hasta el ${diaLargo(e.activo_hasta)}` : "sin vigencia"}</p>
          {e.nota && <p className="text-[12px] text-tenue">Nota: {e.nota}</p>}
          <div className="flex flex-wrap gap-2">
            {e.estado !== "activa" && <button className="px-3 py-1.5 rounded-lg bg-acento text-acento-texto font-semibold" onClick={() => cargar({ id: e.id, estado: "activa", activo_hasta: e.activo_hasta && Date.parse(e.activo_hasta) > Date.now() ? e.activo_hasta : sumarDias(null, 30) })}>Activar (30 días)</button>}
            {e.estado === "activa" && <>
              <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => cargar({ id: e.id, activo_hasta: sumarDias(e.activo_hasta, 30) })}>+30 días</button>
              <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => cargar({ id: e.id, activo_hasta: sumarDias(e.activo_hasta, 90) })}>+90 días</button>
              <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => cargar({ id: e.id, activo_hasta: sumarDias(e.activo_hasta, 365) })}>+1 año</button>
              <button className="px-3 py-1.5 rounded-lg border border-linea text-alerta" onClick={() => confirm(`¿Suspender ${e.nombre}?`) && cargar({ id: e.id, estado: "suspendida" })}>Suspender</button>
            </>}
            {e.estado === "pendiente" && <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => confirm(`¿Rechazar ${e.nombre}?`) && cargar({ id: e.id, estado: "rechazada" })}>Rechazar</button>}
            <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => { const n = prompt("Máximo de usuarios", String(e.usuarios_max)); if (n && Number(n) > 0) cargar({ id: e.id, usuarios_max: Number(n) }); }}>Usuarios máx.</button>
            <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => { const n = prompt("Nota interna", e.nota ?? ""); if (n !== null) cargar({ id: e.id, nota: n }); }}>Nota</button>
            {e.contacto_tel && <a className="px-3 py-1.5 rounded-lg border border-linea inline-flex items-center gap-1" target="_blank" rel="noreferrer" href={`https://wa.me/${String(e.contacto_tel).replace(/\D/g, "").replace(/^0/, "54")}`}><ExternalLink className="w-3.5 h-3.5" /> WhatsApp</a>}
          </div>
        </section>
      ))}
    </div>
  );
}
