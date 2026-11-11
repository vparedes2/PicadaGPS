/**
 * Puerta de entrada: ingreso con Google, 7 días de prueba, después pide un plan.
 * Sin señal deja usar la app hasta la fecha confirmada la última vez que hubo conexión,
 * con un máximo de 15 días sin conectarse. Cada cuenta se puede usar en un número limitado de teléfonos.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LogOut, ShieldAlert, WifiOff, Smartphone } from "lucide-react";
import {
  supabase, consultarAcceso, accesoGuardado, accesoSinSenal, relojAtrasado, salir, diaLargo, DIAS_SIN_SENAL, type Acceso as TAcceso
} from "../lib/cuenta";
import Ingreso from "./Ingreso";
import { reiniciarDatos } from "../lib/datos";
import Planes from "./Planes";
import Creditos from "./Creditos";

type Vista = { tipo: "cargando" } | { tipo: "ingresar" } | { tipo: "ok"; a: TAcceso } | { tipo: "sin_acceso"; a: TAcceso } | { tipo: "sin_senal" } | { tipo: "error"; msj: string };

export function Marco({ children, pie }: { children: ReactNode; pie?: ReactNode }) {
  const [creditos, setCreditos] = useState(false);
  return (
    <div className="min-h-full bg-fondo flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="text-center">
          <img src="/icono.svg" alt="" className="w-16 h-16 mx-auto mb-2" />
          <h1 className="text-[24px] font-bold tracking-tight">Picada<span className="text-acento">GPS</span></h1>
          <p className="text-[14px] text-tenue">Pozos y locaciones de Neuquén, sin señal.</p>
        </div>
        {children}
        <div className="flex items-center justify-center gap-4 text-[13px] text-tenue">
          {pie}
          <button onClick={() => setCreditos(true)} className="underline">Créditos</button>
        </div>
      </div>
      {creditos && <Creditos onCerrar={() => setCreditos(false)} />}
    </div>
  );
}

export default function Acceso({ children }: { children: (a: TAcceso, recargar: () => void) => ReactNode }) {
  const [vista, setVista] = useState<Vista>({ tipo: "cargando" });
  const [aviso, setAviso] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);

  const revisar = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const guardado = accesoGuardado();
    if (!navigator.onLine) {
      if (data.session && accesoSinSenal(guardado)) setVista({ tipo: "ok", a: guardado! });
      else setVista({ tipo: "sin_senal" });
      return;
    }
    if (!data.session) { setVista({ tipo: "ingresar" }); return; }
    try {
      const a = await consultarAcceso();
      if (!a.acceso) reiniciarDatos();
      setVista(a.acceso ? { tipo: "ok", a } : { tipo: "sin_acceso", a });
    } catch (e) {
      // Servidor caído: si había acceso confirmado, se sigue usando lo guardado
      if (accesoSinSenal(guardado)) setVista({ tipo: "ok", a: guardado! });
      else setVista({ tipo: "error", msj: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    revisar();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") revisar(); });
    const enLinea = () => revisar();
    addEventListener("online", enLinea);
    return () => { sub.subscription.unsubscribe(); removeEventListener("online", enLinea); };
  }, [revisar]);

  const cerrarSesion = async () => { await salir(); reiniciarDatos(); setVista({ tipo: "ingresar" }); };
  const avisoUI = aviso && <p className="rounded-lg border border-linea bg-panel p-3 text-[14px]">{aviso}</p>;

  if (vista.tipo === "cargando") return <Marco><p className="text-center text-[14px] text-tenue">Revisando tu cuenta…</p></Marco>;

  if (vista.tipo === "ingresar") return <Ingreso aviso={avisoUI} />;

  if (vista.tipo === "sin_senal")
    return (
      <Marco>
        <p className="flex items-start gap-2 rounded-lg border border-linea bg-panel p-3 text-[14px]"><WifiOff className="w-5 h-5 shrink-0" />
          {relojAtrasado()
            ? "La fecha del teléfono parece atrasada. Corregila (fecha y hora automáticas) y conectate una vez para seguir."
            : `Conectate a internet un momento para seguir. La app funciona sin señal, pero pide conectarse al menos una vez cada ${DIAS_SIN_SENAL} días para confirmar tu cuenta.`}</p>
        <button onClick={() => revisar()} className="py-2.5 rounded-lg border border-linea bg-panel font-semibold">Reintentar</button>
      </Marco>
    );

  if (vista.tipo === "error")
    return (
      <Marco pie={<button onClick={cerrarSesion} className="underline">Salir</button>}>
        <p className="rounded-lg border border-linea bg-panel p-3 text-[14px]">No se pudo revisar tu cuenta: {vista.msj}</p>
        <button onClick={() => revisar()} className="py-2.5 rounded-lg border border-linea bg-panel font-semibold">Reintentar</button>
      </Marco>
    );

  if (vista.tipo === "sin_acceso") {
    const a = vista.a;
    return (
      <Marco pie={<button onClick={cerrarSesion} className="flex items-center gap-1 underline"><LogOut className="w-4 h-4" /> Cerrar sesión ({a.email})</button>}>
        {avisoUI}
        {a.estado === "limite_dispositivos" ? (
          <div className="flex items-start gap-2 rounded-lg border border-linea bg-panel p-3 text-[14px]"><Smartphone className="w-5 h-5 shrink-0 text-alerta" />
            <div>
              <p className="font-semibold">Tu cuenta ya se usa en {a.limite_dispositivos ?? 2} teléfonos.</p>
              <p className="text-tenue">Cerrá sesión en alguno de ellos (Mi cuenta → Cerrar sesión) y volvé a intentar acá. Si perdiste el teléfono, escribí al administrador para liberarlo.</p>
              <button onClick={() => revisar()} className="mt-2 py-2 px-3 rounded-lg border border-linea font-semibold">Volver a intentar</button>
            </div>
          </div>
        ) : a.estado === "bloqueado" ? (
          <p className="flex items-start gap-2 rounded-lg border border-linea bg-panel p-3 text-[14px]"><ShieldAlert className="w-5 h-5 shrink-0 text-alerta" />
            Tu cuenta está suspendida. Escribí al administrador para revisarla.</p>
        ) : (
          <>
            <div className="rounded-lg border border-linea bg-panel p-3 text-[14px]">
              <p className="font-semibold">{a.activo_hasta ? `Tu plan venció el ${diaLargo(a.activo_hasta)}.` : `Terminó tu prueba gratis (${diaLargo(a.prueba_hasta)}).`}</p>
              <p className="text-tenue">Elegí un plan para seguir usando PicadaGPS.</p>
            </div>
            <Planes email={a.email} onRevisar={async () => { setRevisando(true); await revisar(); setRevisando(false); if (!accesoGuardado()?.acceso) setAviso("Todavía no figura el pago confirmado. Si ya transferiste, esperá la confirmación por WhatsApp."); }} />
            {revisando && <p className="text-center text-[13px] text-tenue">Revisando…</p>}
          </>
        )}
      </Marco>
    );
  }

  return <>{avisoUI && <div className="fixed top-2 inset-x-2 z-50 max-w-md mx-auto" onClick={() => setAviso(null)}>{avisoUI}</div>}{children(vista.a, revisar)}</>;
}
