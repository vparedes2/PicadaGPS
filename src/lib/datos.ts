/** Carga los datos guardados en el teléfono (los descarga la primera vez y quedan en caché). */
import { useEffect, useState } from "react";
import { compactar, normalizar, type Indexado } from "./buscar";
import type { Ruta } from "./geo";

export interface Pozo {
  k: string; sigla: string; area: string; empresa: string; yacimiento: string; tipo: string; estado: string;
  recurso: string; extraccion: string; lat: number; lon: number; idpozo: number | null; inicio: string | null;
}
export interface Instalacion { k: string; nombre: string; tipo: string; area: string; operador: string; lat: number; lon: number }
export interface Meta { generado: string; fuentes: Record<string, { fecha: string | null; cantidad: number; fuente: string; origen?: string }> }

export interface Datos {
  pozos: Pozo[]; instalaciones: Instalacion[]; rutas: Ruta[]; caminos: Ruta[];
  areas: GeoJSON.FeatureCollection | null; rutasGeo: GeoJSON.FeatureCollection | null; caminosGeo: GeoJSON.FeatureCollection | null; meta: Meta | null;
  indice: Indexado[]; // pozos primero, instalaciones después (i >= pozos.length)
  porClave: Map<string, Pozo | Instalacion>;
}

const ACTIVOS = /extracci|inyecci|perfor|termin|efectiv/i;
const json = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);

async function cargar(): Promise<Datos> {
  const [p, ins, areas, rutasGeo, caminosGeo, meta] = await Promise.all([
    json("/datos/pozos.json"), json("/datos/instalaciones.json"), json("/datos/areas.geojson"), json("/datos/rutas.geojson"),
    json("/datos/caminos.geojson"), json("/datos/meta.json")
  ]);
  if (!p) throw new Error("No se pudieron cargar los pozos. Conectate una vez para descargarlos.");
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
