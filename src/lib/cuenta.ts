/** Cuenta del usuario: ingreso con Google (Supabase), estado de la prueba o del plan, pagos y administración. */
import { createClient, type Session } from "@supabase/supabase-js";

export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://azccpjhcafurltdndkam.supabase.co";
export const SUPA_CLAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_UFzi-mP-yeIThOiavE0n8Q_TEk0pRF9";

export const supabase = createClient(SUPA_URL, SUPA_CLAVE, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "picadagps.sesion" }
});

export type EstadoAcceso = "admin" | "activo" | "prueba" | "vencido" | "bloqueado" | "limite_dispositivos" | "sin_sesion";
export interface Acceso {
  estado: EstadoAcceso; acceso: boolean; hasta: string | null; prueba_hasta?: string; activo_hasta?: string | null;
  plan?: string | null; rol?: string; email?: string; nombre?: string | null; limite_dispositivos?: number;
  revisado?: string; // cuándo se confirmó con el servidor (para el uso sin señal)
}

const CLAVE = "picadagps.acceso";
export const accesoGuardado = (): Acceso | null => {
  try { const v = localStorage.getItem(CLAVE); return v ? JSON.parse(v) : null; } catch { return null; }
};
const guardarAcceso = (a: Acceso | null) => {
  try { a ? localStorage.setItem(CLAVE, JSON.stringify(a)) : localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
};

/** Identificador de esta instalación de la app (cuenta para el límite de teléfonos por cuenta). */
export function dispositivo(): string {
  try {
    let id = localStorage.getItem("picadagps.dispositivo");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("picadagps.dispositivo", id); }
    return id;
  } catch { return "sin-almacenamiento-" + navigator.userAgent.length; }
}
export function nombreDispositivo(): string {
  const ua = navigator.userAgent;
  const so = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone/iPad" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "Otro";
  const nav = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "navegador";
  return `${so} · ${nav}`;
}

/** Sin señal se pide volver a conectarse cada tantos días, aunque el plan siga vigente. */
export const DIAS_SIN_SENAL = 15;
const VISTO = "picadagps.visto";
/** Guarda la fecha más adelantada que vio la app: si el reloj del teléfono se atrasa, se nota. */
function marcarVisto() {
  try { const v = Number(localStorage.getItem(VISTO) || 0); if (Date.now() > v) localStorage.setItem(VISTO, String(Date.now())); } catch { /* nada */ }
}
export function relojAtrasado(): boolean {
  try { return Date.now() < Number(localStorage.getItem(VISTO) || 0) - 60 * 60 * 1000; } catch { return false; }
}
/** Sin señal: vale lo último confirmado si no venció, si se confirmó hace menos de 15 días y si el reloj no se atrasó. */
export function accesoSinSenal(a: Acceso | null): boolean {
  if (!a || !a.acceso || !a.hasta || !a.revisado) return false;
  if (relojAtrasado()) return false;
  const ahora = Date.now();
  const ok = Date.parse(a.hasta) > ahora && ahora - Date.parse(a.revisado) < DIAS_SIN_SENAL * 86400000;
  if (ok) marcarVisto();
  return ok;
}
export const diasSinSenalRestantes = (a: Acceso | null) =>
  a?.revisado ? Math.max(0, Math.ceil((Date.parse(a.revisado) + DIAS_SIN_SENAL * 86400000 - Date.now()) / 86400000)) : 0;

/** Corta una espera: con señal débil una consulta puede quedar colgada sin error. */
export function conTiempo<T>(p: PromiseLike<T>, ms: number, msj = "La conexión está muy lenta."): Promise<T> {
  return new Promise<T>((ok, mal) => {
    const t = setTimeout(() => mal(new Error(msj)), ms);
    Promise.resolve(p).then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); mal(e); });
  });
}

/** ¿Hay una sesión guardada en este teléfono? (sin red: no intenta renovarla) */
export function haySesionGuardada(): boolean {
  try { return !!localStorage.getItem("picadagps.sesion"); } catch { return false; }
}

export async function consultarAcceso(): Promise<Acceso> {
  const { data, error } = await conTiempo(supabase.rpc("picada_acceso", { p_dispositivo: dispositivo(), p_nombre: nombreDispositivo() }), 10000);
  if (error) throw new Error(error.message);
  const a = { ...(data as Acceso), revisado: new Date().toISOString() };
  guardarAcceso(a);
  // La hora del servidor manda: se reinicia la marca del reloj con la fecha real de esta verificación
  try { localStorage.setItem(VISTO, String(Date.now())); } catch { /* nada */ }
  if (!a.acceso) await borrarDatosGuardados();
  return a;
}

/** ID público del cliente de Google (no es un secreto: Google lo muestra en cada inicio de sesión) */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1084191561715-la6njhvdgdv7od0834nkgatrhrahdrlj.apps.googleusercontent.com";

async function sha256hex(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Botón oficial de Google en la propia página (Google Identity Services): la ventana dice
 * «Ir a picadagps.ar» en lugar de la dirección técnica de Supabase. El token se valida en Supabase.
 */
export async function montarBotonGoogle(div: HTMLElement, ancho: number, alError: (m: string) => void): Promise<boolean> {
  const g = await new Promise<any>((ok) => {
    const w = window as any;
    if (w.google?.accounts?.id) return ok(w.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => ok(w.google); s.onerror = () => ok(null);
    document.head.appendChild(s);
    setTimeout(() => ok(w.google ?? null), 8000);
  });
  if (!g?.accounts?.id) return false;
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  g.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce: await sha256hex(nonce),
    ux_mode: "popup",
    use_fedcm_for_button: true,
    callback: async (r: { credential?: string }) => {
      if (!r.credential) return;
      const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: r.credential, nonce });
      if (error) alError("No se pudo entrar con Google: " + error.message);
    }
  });
  div.innerHTML = "";
  g.accounts.id.renderButton(div, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", logo_alignment: "center", width: Math.min(400, Math.max(220, Math.round(ancho))), locale: "es-419" });
  return true;
}

/** Ingreso de respaldo por redirección (si el botón de Google no carga) */
export const ingresarConGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}${location.pathname}`, queryParams: { prompt: "select_account" } } });

export async function salir() {
  // Libera este teléfono para que la cuenta pueda usarse en otro
  if (navigator.onLine) await supabase.rpc("picada_soltar_dispositivo", { p_dispositivo: dispositivo() }).then(() => undefined, () => undefined);
  await supabase.auth.signOut().catch(() => undefined);
  guardarAcceso(null);
  await borrarDatosGuardados();
}

export const CACHE_DATOS = "picada-datos";
export async function borrarDatosGuardados() {
  try { if ("caches" in self) await caches.delete(CACHE_DATOS); } catch { /* nada */ }
}

export async function token(): Promise<string | null> {
  try {
    const { data } = await conTiempo(supabase.auth.getSession(), 10000);
    return data.session?.access_token ?? null;
  } catch { return null; }
}
export const sesionActual = async (): Promise<Session | null> => (await supabase.auth.getSession()).data.session;

async function funcion<T = any>(nombre: string, cuerpo: Record<string, unknown>): Promise<T> {
  const t = await token();
  const r = await fetch(`${SUPA_URL}/functions/v1/${nombre}`, {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json", apikey: SUPA_CLAVE, Authorization: `Bearer ${t ?? SUPA_CLAVE}` },
    body: JSON.stringify(cuerpo)
  });
  let d: any = null;
  try { d = await r.json(); } catch { /* respuesta vacía */ }
  if (!r.ok) throw new Error(d?.error || `El servidor respondió ${r.status}.`);
  return d as T;
}

export interface Plan { usd: number; meses: number; ars: number }
export interface Precios { dolar: { tipo: string; venta: number; fecha: string; nombre: string }; dias_prueba: number; whatsapp: string; planes: { trimestral: Plan; anual: Plan } }
export const consultarPrecios = () => funcion<Precios>("picada-pagos", { accion: "precios" });
/** Registra el pedido del plan; el pago se hace por transferencia y lo confirma el administrador. */
export const solicitarPlan = (plan: "trimestral" | "anual") => funcion<{ pago: { id: string; ars: number; usd: number }; whatsapp: string }>("picada-pagos", { accion: "solicitar", plan });
export const misPagos = () => funcion<{ pagos: any[] }>("picada-pagos", { accion: "mis_pagos" });
export const admin = <T = any>(accion: string, datos: Record<string, unknown> = {}) => funcion<T>("picada-admin", { accion, ...datos });

export const pesos = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const diaLargo = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—");
export const diasRestantes = (iso?: string | null) => (iso ? Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000)) : 0);
export const NOMBRE_DOLAR: Record<string, string> = {
  oficial: "Oficial (BNA, venta)", blue: "Blue", bolsa: "MEP (bolsa)", contadoconliqui: "Contado con liqui", tarjeta: "Tarjeta", mayorista: "Mayorista"
};
