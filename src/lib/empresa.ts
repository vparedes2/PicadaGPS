/**
 * Plan Empresa: cada empresa tiene sus usuarios (admin, carga, lectura) y sus puntos propios
 * (tranqueras, pads, bases…). Todo pasa por funciones de Supabase que validan la empresa del usuario:
 * ninguna empresa puede ver ni tocar lo de otra.
 */
import { supabase, conTiempo, CACHE_DATOS } from "./cuenta";

export type Rol = "admin" | "carga" | "lectura";
export interface EmpresaInfo { nombre: string; slug: string; color: string; rol: Rol; estado: string; bienvenida?: string | null; hasta?: string | null; logo?: string | null }
export interface PuntoPropio { id: string; nombre: string; tipo: string; nota: string | null; lat: number; lon: number; estado: "aprobado" | "pendiente"; creado_por?: string; actualizado?: string }
export interface PuntoNuevo { id?: string; nombre: string; tipo?: string; nota?: string | null; lat: number; lon: number }

export const TIPOS_PUNTO = ["Acceso / tranquera", "Locación / pad", "Base / obrador", "Punto de encuentro", "Carga y descarga", "Pozo de agua", "Zona de riesgo", "Picada sin mapa", "Otro"];
export const ROLES: Record<Rol, string> = { admin: "Administrador", carga: "Carga puntos", lectura: "Solo consulta" };

const limpiar = (m: string) => m.replace(/^.*?ERROR:\s*/i, "").replace(/\s*\(SQLSTATE.*$/, "");
async function rpc<T>(fn: string, args?: Record<string, unknown>, ms = 15000): Promise<T> {
  const { data, error } = await conTiempo(supabase.rpc(fn, args), ms);
  if (error) throw new Error(limpiar(error.message));
  return data as T;
}

export const empresaMia = () => rpc<any>("picada_empresa_mia");
export const solicitarEmpresa = (p: Record<string, unknown>) => rpc<any>("picada_empresa_solicitar", { p });
export const guardarEmpresa = (p: Record<string, unknown>) => rpc<any>("picada_empresa_guardar", { p });
export const guardarMiembro = (email: string, rol: Rol) => rpc<any>("picada_empresa_miembro", { p_email: email, p_rol: rol, p_quitar: false });
export const quitarMiembro = (email: string) => rpc<any>("picada_empresa_miembro", { p_email: email, p_rol: "lectura", p_quitar: true });
export const listarPuntos = () => rpc<{ empresa: EmpresaInfo | null; puntos: PuntoPropio[] }>("picada_puntos_listar");
export const guardarPunto = (p: PuntoNuevo) => rpc<{ ok: boolean; id: string; estado: string }>("picada_punto_guardar", { p });
export const importarPuntos = (p: PuntoNuevo[]) => rpc<{ importados: number; total: number }>("picada_puntos_importar", { p }, 60000);
export const accionPunto = (id: string, accion: "aprobar" | "borrar") => rpc<{ ok: boolean }>("picada_punto_accion", { p_id: id, p_accion: accion });
export const empresasAdmin = (p?: Record<string, unknown>) => rpc<any[]>("picada_empresas_admin", { p: p ?? null });
/** Administrador general: elegir qué empresa gestionar en el portal (null = volver a la lista) */
export const elegirEmpresa = (id: string | null) => rpc<any>("picada_empresa_elegir", { p_id: id });
export const crearEmpresa = (p: Record<string, unknown>) => rpc<{ ok: boolean; id: string }>("picada_empresa_crear", { p });

/** Dirección del portal de empresas (el subdominio, o /empresas si se entra por otra dirección) */
// Mientras no esté autorizado el subdominio en Google y Supabase, el portal se abre en la misma dirección (misma sesión)
export const urlPortal = () => `${location.origin}/empresas`;

// ---------- puntos para la app (con copia en el teléfono para usarlos sin señal)
const CLAVE_PUNTOS = "/datos-guardados/puntos-empresa.json";
export async function puntosParaApp(forzar = false): Promise<{ empresa: EmpresaInfo | null; puntos: PuntoPropio[] } | null> {
  let c: Cache | null = null;
  try { c = "caches" in self ? await caches.open(CACHE_DATOS) : null; } catch { /* sin caché */ }
  const leer = async () => { try { const r = await c?.match(CLAVE_PUNTOS); return r ? await r.json() : null; } catch { return null; } };
  const bajar = async () => {
    const d = await listarPuntos();
    await c?.put(CLAVE_PUNTOS, new Response(JSON.stringify(d), { headers: { "Content-Type": "application/json" } })).catch(() => undefined);
    return d;
  };
  const guardado = await leer();
  if (!navigator.onLine) return guardado;
  // Con copia guardada abre al instante y actualiza por detrás (salvo que se pida la versión nueva)
  if (guardado && !forzar) { bajar().catch(() => undefined); return guardado; }
  try { return await bajar(); } catch { return guardado; }
}

// ---------- importación de archivos: KML, GPX, GeoJSON y planillas CSV
const num = (s: unknown) => {
  if (typeof s === "number") return s;
  const t = String(s ?? "").trim().replace(/\s/g, "");
  return t ? Number(t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t) : NaN;
};
const valido = (p: PuntoNuevo) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.lat > -56 && p.lat < -21 && p.lon > -74 && p.lon < -53;

/**
 * Acepta coordenadas como las copia la gente:
 *  - decimales: "-38.1234, -68.5678", "-38,1234 -68,5678" (también lon, lat)
 *  - Google Earth / GPS en grados, minutos y segundos: 38°29'4.21"S 68°31'34.97"O, o sin S/O: 38°29'4.21", 68°31'34.97"
 *  - grados y minutos: 38°29.070' S, 68°31.583' W
 * Toda la zona está en el hemisferio sur y al oeste, así que sin letra se toman como S y O.
 */
export function leerCoordenadas(t: string): [number, number] | null {
  const txt = t.trim().replace(/[′’´`]/g, "'").replace(/[″“”]/g, '"').replace(/''/g, '"').replace(/º|˚/g, "°");
  let par: [number, number] | null = null;
  if (/[°'"]/.test(txt) || /\b[NSEOW]\b/i.test(txt.replace(/\d/g, " "))) {
    // grados, minutos y segundos (o grados y minutos)
    const re = /([NSEOW])?\s*(\d{1,3}(?:[.,]\d+)?)\s*°?\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*'\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*"\s*)?([NSEOW])?/gi;
    const vals: number[] = [];
    for (const m of txt.matchAll(re)) {
      if (!m[2] || (!m[3] && !m[4] && !/°/.test(m[0]))) continue;
      const v = num(m[2]) + (m[3] ? num(m[3]) / 60 : 0) + (m[4] ? num(m[4]) / 3600 : 0);
      if (Number.isFinite(v)) vals.push(-Math.abs(v)); // hemisferio sur y oeste
      if (vals.length === 2) break;
    }
    if (vals.length === 2) par = [vals[0], vals[1]];
  }
  if (!par) {
    const m = txt.match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    let a = num(m[1]), b = num(m[2]);
    // sin signo: en la zona siempre son negativas
    if (a > 0 && b > 0) { a = -a; b = -b; }
    par = [a, b];
  }
  let [a, b] = par;
  if (a < -60 && b > -60) [a, b] = [b, a]; // vino lon, lat
  return valido({ nombre: "x", lat: a, lon: b }) ? [a, b] : null;
}

function texto(el: Element | null | undefined, sel: string) { return el?.getElementsByTagName(sel)[0]?.textContent?.trim() ?? ""; }

function desdeKml(xml: string): PuntoNuevo[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const out: PuntoNuevo[] = [];
  for (const pm of Array.from(doc.getElementsByTagName("Placemark"))) {
    const pt = pm.getElementsByTagName("Point")[0];
    const co = texto(pt, "coordinates").split(/\s+/)[0]?.split(",");
    if (!co || co.length < 2) continue;
    const carpeta = pm.parentElement?.tagName === "Folder" ? texto(pm.parentElement, "name") : "";
    out.push({ nombre: texto(pm, "name") || "Punto", tipo: carpeta || "Punto", nota: (texto(pm, "description") || "").replace(/<[^>]+>/g, " ").trim().slice(0, 500) || null, lat: num(co[1]), lon: num(co[0]) });
  }
  return out;
}
function desdeGpx(xml: string): PuntoNuevo[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("wpt")).map((w) => ({
    nombre: texto(w, "name") || "Punto", tipo: texto(w, "type") || texto(w, "sym") || "Punto", nota: texto(w, "desc") || texto(w, "cmt") || null,
    lat: num(w.getAttribute("lat")), lon: num(w.getAttribute("lon"))
  }));
}
function desdeGeojson(t: string): PuntoNuevo[] {
  const g = JSON.parse(t);
  const fs: any[] = g.type === "FeatureCollection" ? g.features : g.type === "Feature" ? [g] : [];
  return fs.filter((f) => f.geometry?.type === "Point").map((f) => {
    const p = f.properties || {};
    return { nombre: p.nombre || p.name || p.Name || "Punto", tipo: p.tipo || p.type || "Punto", nota: p.nota || p.descripcion || p.description || null, lat: num(f.geometry.coordinates[1]), lon: num(f.geometry.coordinates[0]) };
  });
}
function desdeCsv(t: string): PuntoNuevo[] {
  const lineas = t.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return [];
  const sep = [";", "\t", ","].find((s) => lineas[0].split(s).length >= 3) ?? ",";
  const partir = (l: string) => {
    const out: string[] = []; let cur = "", q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ""; } else cur += ch; }
    out.push(cur); return out.map((x) => x.trim());
  };
  const cab = partir(lineas[0]).map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const col = (...ns: string[]) => cab.findIndex((h) => ns.some((n) => h === n || h.startsWith(n)));
  const iLat = col("lat", "latitud", "y"), iLon = col("lon", "lng", "long", "longitud", "x");
  const iNom = col("nombre", "name", "sigla", "punto", "descripcion"), iTipo = col("tipo", "type", "categoria"), iNota = col("nota", "observ", "comentario", "detalle");
  const iCoord = col("coord", "ubicacion", "gps");
  return lineas.slice(1).map((l) => {
    const c = partir(l);
    let lat = iLat >= 0 ? num(c[iLat]) : NaN, lon = iLon >= 0 ? num(c[iLon]) : NaN;
    if ((!Number.isFinite(lat) || !Number.isFinite(lon)) && iCoord >= 0) { const r = leerCoordenadas(c[iCoord]); if (r) [lat, lon] = r; }
    return { nombre: (iNom >= 0 ? c[iNom] : "") || "Punto", tipo: (iTipo >= 0 ? c[iTipo] : "") || "Punto", nota: (iNota >= 0 ? c[iNota] : "") || null, lat, lon };
  });
}

/** Lee el archivo y devuelve los puntos válidos y cuántos se descartaron por coordenadas fuera de la zona */
export async function leerArchivoPuntos(f: File): Promise<{ puntos: PuntoNuevo[]; descartados: number }> {
  const n = f.name.toLowerCase();
  if (n.endsWith(".kmz")) throw new Error("El KMZ viene comprimido: abrilo en Google Earth y guardalo como KML («Guardar lugar como… › KML»).");
  const t = await f.text();
  const todos = n.endsWith(".kml") || t.includes("<kml") ? desdeKml(t)
    : n.endsWith(".gpx") || t.includes("<gpx") ? desdeGpx(t)
    : n.endsWith(".geojson") || n.endsWith(".json") ? desdeGeojson(t)
    : desdeCsv(t);
  const puntos = todos.filter(valido).map((p) => ({ ...p, nombre: p.nombre.slice(0, 120), tipo: (p.tipo || "Punto").slice(0, 40) }));
  return { puntos, descartados: todos.length - puntos.length };
}

/** Achica la imagen del logo (máx. 256 px) y la devuelve como data URL liviana */
export function prepararLogo(f: File): Promise<string> {
  return new Promise((ok, mal) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) return mal(new Error("Elegí una imagen PNG, JPG, WEBP o SVG."));
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 256 / Math.max(img.width || 256, img.height || 256));
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round((img.width || 256) * k)); c.height = Math.max(1, Math.round((img.height || 256) * k));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let d = c.toDataURL("image/webp", 0.9);
      if (!d.startsWith("data:image/webp")) d = c.toDataURL("image/png");
      d.length < 190000 ? ok(d) : mal(new Error("La imagen quedó muy pesada: probá con una más simple."));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("No se pudo leer la imagen.")); };
    img.src = url;
  });
}

export function descargarCsv(puntos: PuntoPropio[], nombre: string) {
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const filas = [["nombre", "tipo", "lat", "lon", "nota", "estado", "cargado_por"].join(";"),
    ...puntos.map((p) => [esc(p.nombre), esc(p.tipo), p.lat, p.lon, esc(p.nota), p.estado, esc(p.creado_por)].join(";"))];
  const url = URL.createObjectURL(new Blob(["﻿" + filas.join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
