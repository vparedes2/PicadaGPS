import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MLMap } from "maplibre-gl";
import type { Datos } from "../lib/datos";
import { TESELA } from "../lib/navegar";

export interface Marca { lat: number; lon: number }
export interface Linea { desde: Marca; tipo: "ruta" | "camino" | "instalacion"; n: number }
interface Props {
  datos: Datos;
  seleccion: Marca | null;
  linea: Linea | null;      // referencia elegida en la ficha: línea punteada hasta el pozo
  yo: Marca | null;         // ubicación del teléfono
  satelite: boolean;
  onElegir: (clave: string) => void;
  centrarEn: { lat: number; lon: number; zoom: number; n: number; caja?: [number, number, number, number] } | null;
}

const vacio: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** "RINCON DEL MANGRULLO" → "Rincón del Mangrullo" (sin tildes, pero legible) */
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase()).replace(/ (De|Del|La|Las|Los|El|Y) /g, (m) => m.toLowerCase())
  .replace(/\b(Ii|Iii|Iv|Vi|Vii)\b/g, (m) => m.toUpperCase());
/** "YPF.Nq.LACh-419(h)" → "LACh-419(h)": en el mapa sobra el prefijo de operadora y provincia */
const siglaCorta = (s: string) => s.replace(/^[^.]+\.Nq\./, "");

/** Centro aproximado del polígono más grande del área, para poner el nombre */
function centroArea(g: GeoJSON.Geometry): [number, number] | null {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  let mejor: number[][] | null = null, maxN = 0;
  for (const p of polys) if (p[0].length > maxN) { maxN = p[0].length; mejor = p[0]; }
  if (!mejor) return null;
  const xs = mejor.map((c) => c[0]), ys = mejor.map((c) => c[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/** Etiquetas como HTML: no dependen de fuentes descargadas, así se ven también sin señal */
function etiqueta(texto: string, clase: "area" | "pozo" | "inst") {
  const el = document.createElement("div");
  el.textContent = texto;
  const base = "pointer-events:none;white-space:nowrap;font-family:system-ui,sans-serif;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 2px #fff;";
  el.style.cssText = base + (clase === "area"
    ? "font-size:11px;font-weight:700;color:#174f35;text-align:center;max-width:140px;white-space:normal;line-height:1.15"
    : clase === "inst" ? "font-size:11.5px;font-weight:600;color:#1d3f9e;transform:translate(10px,0)"
    : "font-size:11px;font-weight:600;color:#7c2d12;transform:translate(9px,0)");
  return el;
}
const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#888";

const COLOR_LINEA = { ruta: "#b3261e", camino: "#7a4b00", instalacion: "#1d4ed8" };

export default function Mapa({ datos, seleccion, linea, yo, satelite, onElegir, centrarEn }: Props) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<MLMap | null>(null);
  const listo = useRef(false);
  const marcas = useRef<{ sel?: maplibregl.Marker; yo?: maplibregl.Marker }>({});
  const textos = useRef<{ areas: maplibregl.Marker[]; puntos: maplibregl.Marker[] }>({ areas: [], puntos: [] });
  const elegir = useRef(onElegir);
  elegir.current = onElegir;

  useEffect(() => {
    if (!div.current) return;
    const m = new maplibregl.Map({
      container: div.current,
      center: [-68.9, -38.4], zoom: 7.2, maxZoom: 18.5, attributionControl: false,
      style: {
        version: 8,
        sources: {
          sat: { type: "raster", tiles: [TESELA], tileSize: 256, maxzoom: 18, attribution: "Imágenes © Esri, Maxar, Earthstar Geographics" },
          areas: { type: "geojson", data: datos.areas ?? vacio },
          rutas: { type: "geojson", data: datos.rutasGeo ?? vacio },
          caminos: { type: "geojson", data: datos.caminosGeo ?? vacio },
          pozos: {
            type: "geojson",
            data: { type: "FeatureCollection", features: datos.pozos.map((p) => ({ type: "Feature", properties: { k: p.k }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } })) }
          },
          inst: {
            type: "geojson",
            data: { type: "FeatureCollection", features: datos.instalaciones.map((p) => ({ type: "Feature", properties: { k: p.k }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } })) }
          },
          salida: { type: "geojson", data: vacio }
        },
        layers: [
          { id: "fondo", type: "background", paint: { "background-color": "#ddd5c3" } },
          { id: "sat", type: "raster", source: "sat", layout: { visibility: "none" } },
          { id: "areas-relleno", type: "fill", source: "areas", paint: { "fill-color": "#1f6f4a", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.06, 13, 0.02] } },
          { id: "areas-borde", type: "line", source: "areas", paint: { "line-color": "#1f6f4a", "line-width": 1, "line-opacity": 0.6 } },
          {
            // Caminos de yacimiento (OpenStreetMap): se ven al acercarse
            id: "caminos", type: "line", source: "caminos", minzoom: 10,
            paint: { "line-color": "#fffaf0", "line-opacity": 0.95, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 15, 3] }
          },
          {
            id: "caminos-borde", type: "line", source: "caminos", minzoom: 10,
            paint: { "line-color": "#7a4b00", "line-opacity": 0.55, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 15, 1], "line-gap-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 15, 3] }
          },
          { id: "rutas-borde", type: "line", source: "rutas", paint: { "line-color": "#5b4a1e", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 2.5, 14, 6] } },
          { id: "rutas", type: "line", source: "rutas", paint: { "line-color": "#f5c542", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.2, 14, 4] } },
          { id: "salida", type: "line", source: "salida", paint: { "line-color": ["get", "color"], "line-width": 3, "line-dasharray": [2, 1.5] } },
          { id: "salida-punto", type: "circle", source: "salida", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": ["get", "color"], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } },
          {
            id: "pozos", type: "circle", source: "pozos",
            paint: {
              "circle-color": "#c2410c", "circle-stroke-color": "#ffffff",
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 1.6, 12, 3.2, 16, 6.5],
              "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0, 14, 1]
            }
          },
          {
            id: "inst", type: "circle", source: "inst",
            paint: { "circle-color": "#1d4ed8", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5, "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2.5, 14, 7] }
          }
        ]
      }
    });
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    m.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), "top-right");
    m.on("load", () => { listo.current = true; m.resize(); });
    // Tocar un pozo o una instalación abre su ficha
    const tocar = (e: maplibregl.MapLayerMouseEvent) => { const k = e.features?.[0]?.properties?.k; if (k) elegir.current(String(k)); };
    m.on("click", "pozos", tocar);
    m.on("click", "inst", tocar);
    for (const capa of ["pozos", "inst"]) {
      m.on("mouseenter", capa, () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", capa, () => { m.getCanvas().style.cursor = ""; });
    }
    // Nombres de las áreas (yacimientos), de la más grande a la más chica
    const areas: { c: [number, number]; n: string; tam: number }[] = [];
    for (const f of datos.areas?.features ?? []) {
      const c = centroArea(f.geometry);
      const n = (f.properties as any)?.nombre;
      if (!c || !n) continue;
      const anillo = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates[0][0] : f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : [];
      const xs = anillo.map((q) => q[0]), ys = anillo.map((q) => q[1]);
      areas.push({ c, n: titulo(n), tam: (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) });
    }
    areas.sort((a, b) => b.tam - a.tam);
    const porClave = datos.porClave;
    // Se dibujan solo las etiquetas que no se pisan con otra ya puesta (cajas en píxeles de pantalla)
    const refrescar = () => {
      for (const mk of [...textos.current.areas, ...textos.current.puntos]) mk.remove();
      textos.current = { areas: [], puntos: [] };
      if (!listo.current) return;
      const z = m.getZoom(), W = m.getContainer().clientWidth, H = m.getContainer().clientHeight;
      const cajas: number[][] = [];
      const libre = (x: number, y: number, w: number, h: number) => {
        if (x + w < 0 || y + h < 0 || x > W || y > H) return false;
        for (const c of cajas) if (x < c[2] && x + w > c[0] && y < c[3] && y + h > c[1]) return false;
        cajas.push([x - 4, y - 3, x + w + 4, y + h + 3]);
        return true;
      };
      const ancho = (t: string, px: number) => t.length * px * 0.56;
      // 1) Instalaciones y pozos (lo que se busca) tienen prioridad sobre el nombre del área
      const capas = z >= 14.5 ? ["inst", "pozos"] : z >= 11.5 ? ["inst"] : [];
      if (capas.length) {
        const grupos: { x: number; y: number; nombres: string[]; esP: boolean; lng: number; lat: number }[] = [];
        const vistos = new Set<string>();
        for (const f of m.queryRenderedFeatures({ layers: capas })) {
          const k = String(f.properties?.k ?? "");
          if (!k || vistos.has(k)) continue;
          vistos.add(k);
          const x = porClave.get(k);
          if (!x) continue;
          const esP = "sigla" in x;
          const pt = m.project([x.lon, x.lat]);
          // Pozos de una misma locación (a menos de 16 px) van en una sola etiqueta
          const g = esP ? grupos.find((q) => q.esP && Math.hypot(q.x - pt.x, q.y - pt.y) < 16) : undefined;
          const nombre = esP ? siglaCorta((x as any).sigla) : (x as any).nombre;
          if (g) g.nombres.push(nombre);
          else grupos.push({ x: pt.x, y: pt.y, nombres: [nombre], esP, lng: x.lon, lat: x.lat });
        }
        grupos.sort((a, b) => Number(a.esP) - Number(b.esP));
        for (const g of grupos.slice(0, 150)) {
          const t = g.nombres.length > 1 ? `${g.nombres.sort()[0]} y ${g.nombres.length - 1} más` : g.nombres[0];
          if (!libre(g.x + 9, g.y - 7, ancho(t, 11.5), 14)) continue;
          textos.current.puntos.push(new maplibregl.Marker({ element: etiqueta(t, g.esP ? "pozo" : "inst"), anchor: "left" }).setLngLat([g.lng, g.lat]).addTo(m));
          if (textos.current.puntos.length >= 70) break;
        }
      }
      // 2) Nombres de áreas: hasta zoom 14, sin pisarse
      if (z < 14) {
        for (const a of areas) {
          const pt = m.project(a.c);
          const w = Math.min(140, ancho(a.n, 11)), h = a.n.length * 11 * 0.56 > 140 ? 28 : 14;
          if (!libre(pt.x - w / 2, pt.y - h / 2, w, h)) continue;
          textos.current.areas.push(new maplibregl.Marker({ element: etiqueta(a.n, "area"), anchor: "center" }).setLngLat(a.c).addTo(m));
          if (textos.current.areas.length >= 60) break;
        }
      }
    };
    m.on("load", refrescar);
    m.on("moveend", refrescar);
    mapa.current = m;
    return () => {
      for (const mk of [...textos.current.areas, ...textos.current.puntos]) mk.remove();
      textos.current = { areas: [], puntos: [] };
      m.remove(); mapa.current = null; listo.current = false;
    };
  }, [datos]);

  // Satélite encendido o apagado
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const aplicar = () => m.setLayoutProperty("sat", "visibility", satelite ? "visible" : "none");
    if (listo.current) aplicar(); else m.once("load", aplicar);
  }, [satelite]);

  // Marca del pozo elegido y línea hasta la ruta
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    marcas.current.sel?.remove();
    if (seleccion) {
      const el = document.createElement("div");
      el.style.cssText = `width:22px;height:22px;border-radius:50%;border:4px solid ${css("--alerta")};background:rgba(255,255,255,.85);box-shadow:0 0 0 2px #fff,0 2px 8px rgba(0,0,0,.4)`;
      marcas.current.sel = new maplibregl.Marker({ element: el }).setLngLat([seleccion.lon, seleccion.lat]).addTo(m);
    }
    const color = linea ? COLOR_LINEA[linea.tipo] : "#b3261e";
    const poner = () => (m.getSource("salida") as GeoJSONSource | undefined)?.setData(seleccion && linea
      ? { type: "FeatureCollection", features: [
          { type: "Feature", properties: { color }, geometry: { type: "LineString", coordinates: [[seleccion.lon, seleccion.lat], [linea.desde.lon, linea.desde.lat]] } },
          { type: "Feature", properties: { color }, geometry: { type: "Point", coordinates: [linea.desde.lon, linea.desde.lat] } }
        ] }
      : vacio);
    if (listo.current) poner(); else m.once("load", poner);
  }, [seleccion, linea]);

  // Al tocar una referencia en la ficha, se encuadran la referencia y el pozo
  useEffect(() => {
    const m = mapa.current;
    if (!m || !seleccion || !linea || linea.n === 0) return;
    const b = new maplibregl.LngLatBounds([seleccion.lon, seleccion.lat], [seleccion.lon, seleccion.lat]).extend([linea.desde.lon, linea.desde.lat]);
    m.fitBounds(b, { padding: 60, maxZoom: 15.5, duration: 900 });
  }, [linea?.n]);

  // Ubicación del teléfono
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    marcas.current.yo?.remove();
    if (yo) {
      const el = document.createElement("div");
      el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)";
      marcas.current.yo = new maplibregl.Marker({ element: el }).setLngLat([yo.lon, yo.lat]).addTo(m);
    }
  }, [yo]);

  useEffect(() => {
    if (!centrarEn) return;
    if (centrarEn.caja) mapa.current?.fitBounds([[centrarEn.caja[0], centrarEn.caja[1]], [centrarEn.caja[2], centrarEn.caja[3]]], { padding: 30, duration: 900, maxZoom: 14 });
    else mapa.current?.flyTo({ center: [centrarEn.lon, centrarEn.lat], zoom: centrarEn.zoom, duration: 900 });
  }, [centrarEn]);

  // MapLibre pone position:relative en su contenedor: por eso va dentro de una caja absoluta
  return <div className="absolute inset-0"><div ref={div} className="w-full h-full" aria-label="Mapa de pozos" /></div>;
}
