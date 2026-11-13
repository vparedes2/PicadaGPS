/** Aviso dentro de la app cuando a la prueba o al plan le quedan 2 días o menos. Se puede cerrar; vuelve al día siguiente. */
import { useState } from "react";
import { X, Hourglass, AlertTriangle } from "lucide-react";
import { diasRestantes, type Acceso } from "../lib/cuenta";

const hoy = () => new Date().toISOString().slice(0, 10);

export default function AvisoVence({ a, onPlanes }: { a: Acceso; onPlanes: () => void }) {
  const clave = `picadagps.aviso.${a.hasta?.slice(0, 10)}`;
  const [cerrado, setCerrado] = useState(() => { try { return localStorage.getItem(clave) === hoy(); } catch { return false; } });
  if (!a.hasta || (a.estado !== "prueba" && a.estado !== "activo")) return null;
  const quedan = diasRestantes(a.hasta);
  if (quedan > 2 || cerrado) return null;

  const prueba = a.estado === "prueba";
  const f = new Date(a.hasta);
  const cuando = `${f.toLocaleDateString("es-AR", { weekday: "long" })} ${f.getDate()}/${f.getMonth() + 1} a las ${f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  const ultimo = quedan <= 1;
  const titulo = ultimo
    ? (prueba ? "Último día de prueba gratis" : "Último día de tu plan")
    : (prueba ? "Te quedan 2 días de prueba gratis" : "Tu plan vence en 2 días");
  const texto = ultimo
    ? `Termina el ${cuando}. Después la app se bloquea hasta que elijas un plan.`
    : prueba ? "Elegí tu plan para seguir usando PicadaGPS sin cortes." : "Renovalo ahora y los días que te quedan se suman.";
  const cerrar = () => { setCerrado(true); try { localStorage.setItem(clave, hoy()); } catch { /* nada */ } };

  return (
    <div role="status" className={`relative rounded-lg border px-3 py-2 pr-9 text-[13px] leading-snug ${ultimo ? "border-alerta bg-[#fdecea] text-[#7a1d0e]" : "border-[#e0a100] bg-[#fff6dc] text-[#5c4300]"}`}>
      <p className="flex items-center gap-1.5 font-semibold">
        {ultimo ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Hourglass className="w-4 h-4 shrink-0" />} {titulo}
      </p>
      <p className="mt-0.5">{texto}</p>
      <button onClick={onPlanes} className="mt-1.5 px-3 py-1.5 rounded-md bg-acento text-acento-texto text-[13px] font-semibold">
        {prueba ? "Ver planes" : "Renovar"}
      </button>
      <button onClick={cerrar} aria-label="Cerrar aviso" className="absolute top-1.5 right-1.5 p-1"><X className="w-4 h-4" /></button>
    </div>
  );
}
