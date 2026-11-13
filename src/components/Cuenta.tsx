/** Panel de la cuenta: estado del plan, renovar, pagos hechos, créditos, administración y salir. */
import { useEffect, useState } from "react";
import { X, LogOut, Shield, Share2 } from "lucide-react";
import { compartirWhatsApp } from "../lib/compartir";
import { misPagos, salir, diaLargo, diasRestantes, pesos, diasSinSenalRestantes, DIAS_SIN_SENAL, type Acceso } from "../lib/cuenta";
import { reiniciarDatos } from "../lib/datos";
import Planes from "./Planes";
import Admin from "./Admin";

export const textoEstado = (a: Acceso) =>
  a.estado === "admin" ? "Administrador"
  : a.estado === "prueba" ? (diasRestantes(a.hasta) <= 1 ? "Prueba gratis · último día" : `Prueba gratis · ${diasRestantes(a.hasta)} días`)
  : a.estado === "activo" ? `Plan ${a.plan ?? ""} · hasta ${new Date(a.hasta!).toLocaleDateString("es-AR")}`
  : "Sin acceso";

export default function Cuenta({ a, onCerrar, conAdmin = false }: { a: Acceso; onCerrar: () => void; conAdmin?: boolean }) {
  const [pagos, setPagos] = useState<any[] | null>(null);
  const [admin, setAdminEstado] = useState(conAdmin);
  const setAdmin = (si: boolean) => { setAdminEstado(si); history.replaceState(null, "", si ? "/admin" : "/cuenta"); };
  useEffect(() => { if (navigator.onLine) misPagos().then((r) => setPagos(r.pagos)).catch(() => setPagos([])); }, []);

  const cerrarSesion = async () => { await salir(); reiniciarDatos(); location.reload(); };
  const quedan = diasRestantes(a.hasta);

  return (
    <div className="fixed inset-0 z-40 bg-fondo overflow-y-auto">
      <div className="max-w-xl mx-auto p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-bold">Mi cuenta</h1>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-2"><X className="w-5 h-5" /></button>
        </div>

        <section className="rounded-lg border border-linea bg-panel p-3 text-[14px]">
          <p className="font-semibold">{a.nombre || a.email}</p>
          <p className="text-tenue">{a.email}</p>
          <p className="mt-2">{textoEstado(a)}</p>
          {a.estado !== "admin" && <p className="text-tenue">Acceso hasta el {diaLargo(a.hasta)}{quedan <= 7 && " · conviene renovar"}.</p>}
          {a.estado !== "admin" && (
            <p className="text-tenue mt-1">Sin señal podés usarla {Math.min(diasSinSenalRestantes(a), quedan)} días más; se renueva sola cada vez que abrís la app con conexión (máximo {DIAS_SIN_SENAL} días seguidos sin conectarte).
              {a.limite_dispositivos ? ` Tu cuenta se puede usar en hasta ${a.limite_dispositivos} teléfonos.` : ""}</p>
          )}
        </section>

        {a.estado !== "admin" && (
          <section>
            <h2 className="text-[13px] uppercase tracking-wide text-tenue font-semibold mb-1.5">{a.estado === "prueba" ? "Elegí un plan" : "Renovar"}</h2>
            {navigator.onLine ? <Planes email={a.email} /> : <p className="text-[14px] text-tenue">Necesitás señal para pagar.</p>}
          </section>
        )}

        {pagos && pagos.length > 0 && (
          <section>
            <h2 className="text-[13px] uppercase tracking-wide text-tenue font-semibold mb-1.5">Mis pagos</h2>
            <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea text-[14px]">
              {pagos.map((p) => (
                <li key={p.id} className="p-3 flex justify-between gap-2">
                  <span>{new Date(p.creado).toLocaleDateString("es-AR")} · {p.plan}</span>
                  <span className="num">{pesos(Number(p.ars))} · {p.estado}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-2">
          {a.rol === "admin" && (
            <button onClick={() => setAdmin(true)} className="flex items-center gap-2 py-2.5 px-3 rounded-lg border border-linea bg-panel font-semibold text-[15px]"><Shield className="w-4 h-4" /> Administración</button>
          )}
          <button onClick={compartirWhatsApp} className="flex items-center gap-2 py-2.5 px-3 rounded-lg border border-linea bg-panel text-[15px]"><Share2 className="w-4 h-4" /> Recomendar la app por WhatsApp</button>
          <button onClick={cerrarSesion} className="flex items-center gap-2 py-2.5 px-3 rounded-lg border border-linea bg-panel text-[15px]"><LogOut className="w-4 h-4" /> Cerrar sesión</button>
          <p className="text-[12px] text-tenue px-1">Al cerrar sesión se borran los pozos guardados en este teléfono, para que nadie los use sin cuenta. Se vuelven a bajar solos la próxima vez que entres (con señal).</p>
        </div>
      </div>
      {admin && <Admin onCerrar={() => setAdmin(false)} />}
    </div>
  );
}
