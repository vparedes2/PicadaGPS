/**
 * Carga los datos. No están en la carpeta pública: se piden a /api/datos con la sesión del usuario
 * (solo responde si la prueba o el plan están vigentes) y se guardan en el teléfono para usarlos sin señal.
 */
import { useEffect, useState } from "react";
import { CACHE_DATOS, token } from "./cuenta";
import { compactar, normalizar, type Indexado } from "./buscar";
import type { Ruta } from "./geo";

export interface Pozo {
  k: string; sigla: string; area: string; empresa: string; yacimiento: string; tipo: string; estado: string;
  recurso: string; extraccion: string; lat: number; lon: number; idpozo: number | null; inicio: string | null;
}
export interface Instalacion { k: string; nombre: string; tipo: string; area: string; operador: string; lat: number; lon: number }
export interface Meta { generado: string; fuentes: Record<string, { fecha: string | null; cantidad: number; origen?: string; ultimo_inicio_perforacion?: string | null }> }

export interface Datos {
  pozos: Pozo[]; instalaciones: Instalacion[]; rutas: Ruta[]; caminos: Ruta[];
  areas: GeoJSON.FeatureCollection | null; rutasGeo: GeoJSON.FeatureCollection | null; caminosGeo: GeoJSON.FeatureCollection | null; meta: Meta | null;
  indice: Indexado[]; // pozos primero, instalaciones después (i >= pozos.length)
  porClave: Map<string, Pozo | Instalacion>;
}

const ACTIVOS = /extracci|inyecci|perfor|termin|efectiv/i;
const ARCHIVOS = ["pozos.json", "instalaciones.json", "areas.geojson", "rutas.geojson", "caminos.geojson"] as const;
const clave = (a: string) => `/datos-guardados/${a}`;

async function abrirCache(): Promise<Cache | null> {
  try { return "caches" in self ? await caches.open(CACHE_DATOS) : null; } catch { return null; }
}
async function leerGuardado(c: Cache | null, a: string) {
  try { const r = await c?.match(clave(a)); return r ? await r.json() : null; } catch { return null; }
}
async function pedir(a: string, t: string | null): Promise<{ texto: string; datos: any } | null> {
  if (!t || !navigator.onLine) return null;
  try {
    const r = await fetch(`/api/datos?archivo=${encodeURIComponent(a)}`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    if (r.status === 401 || r.status === 403) throw new Error("sin-acceso");
    if (!r.ok) return null;
    const texto = await r.text();
    return { texto, datos: JSON.parse(texto) };
  } catch (e) {
    if (e instanceof Error && e.message === "sin-acceso") throw e;
    return null;
  }
}
const guardar = (c: Cache | null, a: string, texto: string) =>
  c?.put(clave(a), new Response(texto, { headers: { "Content-Type": "application/json" } })).catch(() => undefined);

/** Baja los archivos solo si cambió la versión (meta.generado); si no hay señal usa lo guardado. */
async function traerTodo() {
  const c = await abrirCache();
  const t = await token();
  const metaLocal = await leerGuardado(c, "meta.json");
  let meta = metaLocal;
  let nuevo: Awaited<ReturnType<typeof pedir>> = null;
  try { nuevo = await pedir("meta.json", t); } catch { throw new Error("Tu acceso no está vigente. Volvé a abrir la app con señal."); }
  const cambio = !!nuevo && nuevo.datos?.generado !== metaLocal?.generado;
  const res: Record<string, any> = {};
  await Promise.all(ARCHIVOS.map(async (a) => {
    let d = cambio ? null : await leerGuardado(c, a);
    if (!d) {
      const r = await pedir(a, t).catch(() => null);
      if (r) { d = r.datos; await guardar(c, a, r.texto); }
      else d = await leerGuardado(c, a);
    }
    res[a] = d;
  }));
  if (nuevo && res["pozos.json"]) { meta = nuevo.datos; await guardar(c, "meta.json", nuevo.texto); }
  return { res, meta };
}

async function cargar(): Promise<Datos> {
  const { res, meta } = await traerTodo();
  const [p, ins, areas, rutasGeo, caminosGeo] = ARCHIVOS.map((a) => res[a]);
  if (!p) throw new Error(navigator.onLine ? "No se pudieron descargar los datos. Probá de nuevo en un rato." : "Todavía no hay datos guardados en este teléfono. Abrí la app una vez con señal.");
  const d = p.dic;
  const pozos: Pozo[] = p.filas.map((f: any[]) => ({
    k: `p${f[10] ?? f[0]}`, sigla: f[0], area: d.area[f[1]], empresa: d.empresa[f[2]], yacimiento: d.yacimiento[f[3]],
    tipo: d.tipo[f[4]], estado: d.estado[f[5]], recurso: d.recurso[f[6]], extraccion: d.extraccion[f[7]],
    lat: f[8], lon: f[9], idpozo: f[10], inicio: f[11]
  }));
  const instalaciones: Instalacion[] = (ins?.filas || []).map((f: any[], i: number) => ({
    k: `i${i}`, nombre: f[0], tipo: f[1], area: f[2], operador: f[3], lat: f[4], lon: f[5]
  }));
  const aLineas = (fc: any, sinNombre: string): Ruta[] => (fc?.features || []).map((f: any) => {
    const c: number[][] = f.geometry.coordinates;
    const xs = c.map((x) => x[0]), ys = c.map((x) => x[1]);
    return { nombre: f.properties.nombre || f.properties.tipo || sinNombre, coords: c, caja: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
  });
  const rutas = aLineas(rutasGeo, "Ruta");
  const caminos = aLineas(caminosGeo, "Camino de yacimiento");
  const indice: Indexado[] = [
    ...pozos.map((x, i) => ({ i, codigo: compactar(x.sigla), texto: normalizar(`${x.area} ${x.yacimiento} ${x.empresa} ${x.tipo}`), tipo: x.tipo, activo: ACTIVOS.test(x.estado) })),
    ...instalaciones.map((x, j) => ({ i: pozos.length + j, codigo: compactar(x.nombre), texto: normalizar(`${x.tipo} ${x.area} ${x.operador}`), tipo: "Instalación", activo: true }))
  ];
  const porClave = new Map<string, Pozo | Instalacion>();
  pozos.forEach((x) => porClave.set(x.k, x));
  instalaciones.forEach((x) => porClave.set(x.k, x));
  return { pozos, instalaciones, rutas, caminos, areas, rutasGeo, caminosGeo, meta, indice, porClave };
}

let promesa: Promise<Datos> | null = null;
export const reiniciarDatos = () => { promesa = null; };
export function useDatos() {
  const [estado, setEstado] = useState<{ datos?: Datos; error?: string }>({});
  useEffect(() => {
    promesa ??= cargar();
    promesa.then((datos) => setEstado({ datos })).catch((e) => { promesa = null; setEstado({ error: e.message }); });
  }, []);
  return estado;
}

export const esPozo = (x: Pozo | Instalacion): x is Pozo => "sigla" in x;
export const nombreDe = (x: Pozo | Instalacion) => (esPozo(x) ? x.sigla : x.nombre);
