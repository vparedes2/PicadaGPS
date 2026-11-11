/**
 * Puerta de entrada: ingreso con Google, 7 días de prueba, después pide un plan.
 * Sin señal deja usar la app hasta la fecha confirmada la última vez que hubo conexión.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LogOut, ShieldAlert, WifiOff } from "lucide-react";
import {
  supabase, consultarAcceso, accesoGuardado, accesoSinSenal, ingresarConGoogle, salir, verificarPago, diaLargo, type Acceso as TAcceso
} from "../lib/cuenta";
import { reiniciarDatos } from "../lib/datos";
import Planes from "./Planes";
import Creditos from "./Creditos";

type Vista = { tipo: "cargando" } | { tipo: "ingresar" } | { tipo: "ok"; a: TAcceso } | { tipo: "sin_acceso"; a: TAcceso } | { tipo: "sin_senal" } | { tipo: "error"; msj: string };

function Marco({ children, pie }: { children: ReactNode; pie?: ReactNode }) {
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
    // Vuelta desde Mercado Pago: ?pago=ok&payment_id=…
    const q = new URLSearchParams(location.search);
    const pago = q.get("pago");
    const id = q.get("payment_id") || q.get("collection_id");
    const limpiar = () => history.replaceState(null, "", location.pathname);
    (async () => {
      if (pago) {
        limpiar();
        if (pago === "ok" && id) {
          setAviso("Confirmando el pago…");
          try {
            const r = await verificarPago(id);
            setAviso(r.estado === "aprobado" ? "¡Pago acreditado! Ya tenés el plan activo." : "El pago quedó pendiente. Se habilita apenas Mercado Pago lo acredite.");
          } catch { setAviso("No se pudo confirmar el pago todavía. Si lo hiciste, se habilita en unos minutos."); }
        } else if (pago === "pendiente") setAviso("El pago quedó pendiente. Se habilita apenas Mercado Pago lo acredite.");
        else setAviso("El pago no se completó. Podés intentarlo de nuevo.");
      }
      await revisar();
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") revisar(); });
    const enLinea = () => revisar();
    addEventListener("online", enLinea);
    return () => { sub.subscription.unsubscribe(); removeEventListener("online", enLinea); };
  }, [revisar]);

  const cerrarSesion = async () => { await salir(); reiniciarDatos(); setVista({ tipo: "ingresar" }); };
  const avisoUI = aviso && <p className="rounded-lg border border-linea bg-panel p-3 text-[14px]">{aviso}</p>;

  if (vista.tipo === "cargando") return <Marco><p className="text-center text-[14px] text-tenue">Revisando tu cuenta…</p></Marco>;

  if (vista.tipo === "ingresar")
    return (
      <Marco>
        {avisoUI}
        <button onClick={() => ingresarConGoogle()} className="flex items-center justify-center gap-3 py-3 rounded-xl border border-linea bg-panel text-[16px] font-semibold shadow-sm">
          <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Entrar con Google
        </button>
        <p className="text-center text-[13px] text-tenue">Los primeros 7 días son gratis. Después elegís un plan trimestral o anual.</p>
      </Marco>
    );

  if (vista.tipo === "sin_senal")
    return (
      <Marco>
        <p className="flex items-start gap-2 rounded-lg border border-linea bg-panel p-3 text-[14px]"><WifiOff className="w-5 h-5 shrink-0" />
          Necesitás señal para entrar por primera vez o para renovar el acceso. Después la app funciona sin conexión.</p>
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
      <Marco pie={<button onClick={cerrarSesion} className="flex items-center gap-1 underline"><LogOut className="w-4 h-4" /> Salir ({a.email})</button>}>
        {avisoUI}
        {a.estado === "bloqueado" ? (
          <p className="flex items-start gap-2 rounded-lg border border-linea bg-panel p-3 text-[14px]"><ShieldAlert className="w-5 h-5 shrink-0 text-alerta" />
            Tu cuenta está suspendida. Escribí al administrador para revisarla.</p>
        ) : (
          <>
            <div className="rounded-lg border border-linea bg-panel p-3 text-[14px]">
              <p className="font-semibold">{a.activo_hasta ? `Tu plan venció el ${diaLargo(a.activo_hasta)}.` : `Terminó tu prueba gratis (${diaLargo(a.prueba_hasta)}).`}</p>
              <p className="text-tenue">Elegí un plan para seguir usando PicadaGPS.</p>
            </div>
            <Planes />
          </>
        )}
      </Marco>
    );
  }

  return <>{avisoUI && <div className="fixed top-2 inset-x-2 z-50 max-w-md mx-auto" onClick={() => setAviso(null)}>{avisoUI}</div>}{children(vista.a, revisar)}</>;
}
