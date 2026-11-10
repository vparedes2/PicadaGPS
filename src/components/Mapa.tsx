import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MLMap } from "maplibre-gl";
import type { Datos } from "../lib/datos";
import { TESELA } from "../lib/navegar";

export interface Marca { lat: number; lon: number }
interface Props {
  datos: Datos;
  seleccion: Marca | null;
  salida: Marca | null;     // punto de la ruta más cercano al pozo
  yo: Marca | null;         // ubicación del teléfono
  satelite: boolean;
  onElegir: (clave: string) => void;
  centrarEn: { lat: number; lon: number; zoom: number; n: number } | null;
}

const vacio: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#888";

export default function Mapa({ datos, seleccion, salida, yo, satelite, onElegir, centrarEn }: Props) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<MLMap | null>(null);
  const listo = useRef(false);
  const marcas = useRef<{ sel?: maplibregl.Marker; yo?: maplibregl.Marker }>({});
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
          { id: "rutas-borde", type: "line", source: "rutas", paint: { "line-color": "#5b4a1e", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 2.5, 14, 6] } },
          { id: "rutas", type: "line", source: "rutas", paint: { "line-color": "#f5c542", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.2, 14, 4] } },
          { id: "salida", type: "line", source: "salida", paint: { "line-color": "#b3261e", "line-width": 2.5, "line-dasharray": [2, 1.5] } },
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
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; listo.current = false; };
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
    const poner = () => (m.getSource("salida") as GeoJSONSource | undefined)?.setData(seleccion && salida
      ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[seleccion.lon, seleccion.lat], [salida.lon, salida.lat]] } }] }
      : vacio);
    if (listo.current) poner(); else m.once("load", poner);
  }, [seleccion, salida]);

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
    if (centrarEn) mapa.current?.flyTo({ center: [centrarEn.lon, centrarEn.lat], zoom: centrarEn.zoom, duration: 900 });
  }, [centrarEn]);

  // MapLibre pone position:relative en su contenedor: por eso va dentro de una caja absoluta
  return <div className="absolute inset-0"><div ref={div} className="w-full h-full" aria-label="Mapa de pozos" /></div>;
}
