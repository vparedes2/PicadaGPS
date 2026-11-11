/** Cuenta del usuario: ingreso con Google (Supabase), estado de la prueba o del plan, pagos y administración. */
import { createClient, type Session } from "@supabase/supabase-js";

export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://azccpjhcafurltdndkam.supabase.co";
export const SUPA_CLAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_UFzi-mP-yeIThOiavE0n8Q_TEk0pRF9";

export const supabase = createClient(SUPA_URL, SUPA_CLAVE, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "picadagps.sesion" }
});

export type EstadoAcceso = "admin" | "activo" | "prueba" | "vencido" | "bloqueado" | "sin_sesion";
export interface Acceso {
  estado: EstadoAcceso; acceso: boolean; hasta: string | null; prueba_hasta?: string; activo_hasta?: string | null;
  plan?: string | null; rol?: string; email?: string; nombre?: string | null;
  revisado?: string; // cuándo se confirmó con el servidor (para el uso sin señal)
}

const CLAVE = "picadagps.acceso";
export const accesoGuardado = (): Acceso | null => {
  try { const v = localStorage.getItem(CLAVE); return v ? JSON.parse(v) : null; } catch { return null; }
};
const guardarAcceso = (a: Acceso | null) => {
  try { a ? localStorage.setItem(CLAVE, JSON.stringify(a)) : localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
};

/** Sin señal: vale lo último confirmado mientras no haya vencido la fecha. */
export const accesoSinSenal = (a: Acceso | null) => !!a && a.acceso && !!a.hasta && Date.parse(a.hasta) > Date.now();

export async function consultarAcceso(): Promise<Acceso> {
  const { data, error } = await supabase.rpc("picada_acceso");
  if (error) throw new Error(error.message);
  const a = { ...(data as Acceso), revisado: new Date().toISOString() };
  guardarAcceso(a);
  if (!a.acceso) await borrarDatosGuardados();
  return a;
}

export const ingresarConGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/`, queryParams: { prompt: "select_account" } } });

export async function salir() {
  await supabase.auth.signOut().catch(() => undefined);
  guardarAcceso(null);
  await borrarDatosGuardados();
}

export const CACHE_DATOS = "picada-datos";
export async function borrarDatosGuardados() {
  try { if ("caches" in self) await caches.delete(CACHE_DATOS); } catch { /* nada */ }
}

export async function token(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
export const sesionActual = async (): Promise<Session | null> => (await supabase.auth.getSession()).data.session;

async function funcion<T = any>(nombre: string, cuerpo: Record<string, unknown>): Promise<T> {
  const t = await token();
  const r = await fetch(`${SUPA_URL}/functions/v1/${nombre}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPA_CLAVE, Authorization: `Bearer ${t ?? SUPA_CLAVE}` },
    body: JSON.stringify(cuerpo)
  });
  let d: any = null;
  try { d = await r.json(); } catch { /* respuesta vacía */ }
  if (!r.ok) throw new Error(d?.error || `El servidor respondió ${r.status}.`);
  return d as T;
}

export interface Plan { usd: number; meses: number; ars: number }
export interface Precios { dolar: { tipo: string; venta: number; fecha: string; nombre: string }; dias_prueba: number; planes: { trimestral: Plan; anual: Plan } }
export const consultarPrecios = () => funcion<Precios>("picada-pagos", { accion: "precios" });
export const crearPago = (plan: "trimestral" | "anual") => funcion<{ url: string }>("picada-pagos", { accion: "crear", plan });
export const verificarPago = (payment_id: string) => funcion<{ estado: string }>("picada-pagos", { accion: "verificar", payment_id });
export const misPagos = () => funcion<{ pagos: any[] }>("picada-pagos", { accion: "mis_pagos" });
export const admin = <T = any>(accion: string, datos: Record<string, unknown> = {}) => funcion<T>("picada-admin", { accion, ...datos });

export const pesos = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const diaLargo = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—");
export const diasRestantes = (iso?: string | null) => (iso ? Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000)) : 0);
export const NOMBRE_DOLAR: Record<string, string> = {
  oficial: "Oficial (BNA, venta)", blue: "Blue", bolsa: "MEP (bolsa)", contadoconliqui: "Contado con liqui", tarjeta: "Tarjeta", mayorista: "Mayorista"
};
