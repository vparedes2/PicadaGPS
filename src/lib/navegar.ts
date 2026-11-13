/** Enlaces a las apps de navegación del teléfono: el cálculo de la ruta lo hace Waze, Google Maps u otra app. */
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const esAndroid = () => /Android/i.test(navigator.userAgent);

/**
 * Waze: por defecto evita los caminos de tierra («avoid_trails»), y casi todo el acceso a las locaciones lo es,
 * por eso a veces decía que no hay ruta. Con avoid_trails=allow los usa.
 */
export const enlaceWaze = (lat: number, lon: number) =>
  `https://www.waze.com/ul?ll=${lat.toFixed(6)},${lon.toFixed(6)}&navigate=yes&zoom=17&avoid_trails=allow`;
export const enlaceGoogle = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
export const enlaceVer = (lat: number, lon: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

/** Otra app de mapas: en Android abre el selector (OsmAnd, Maps.me, Organic Maps); en iPhone, Apple Maps */
export function enlaceOtraApp(lat: number, lon: number, nombre: string) {
  if (esAndroid()) return `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(nombre)})`;
  if (esIOS()) return `https://maps.apple.com/?daddr=${lat},${lon}&q=${encodeURIComponent(nombre)}`;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
}
export const nombreOtraApp = () => (esAndroid() ? "Otra app" : esIOS() ? "Apple Maps" : "OpenStreetMap");

export function enlaceWhatsApp(nombre: string, lat: number, lon: number, extra = "") {
  const t = `${nombre}\nCoordenadas: ${lat.toFixed(6)}, ${lon.toFixed(6)}\n${enlaceVer(lat, lon)}${extra ? `\n${extra}` : ""}`;
  return `https://wa.me/?text=${encodeURIComponent(t)}`;
}

export async function copiar(texto: string) {
  try { await navigator.clipboard.writeText(texto); return true; }
  catch {
    const t = document.createElement("textarea");
    t.value = texto; document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    t.remove(); return ok;
  }
}

/** Guarda en el teléfono la imagen satelital alrededor de un punto (zoom 12 a 17, unos 800 m de radio) */
export const TESELA = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export async function guardarZona(lat: number, lon: number, radioM = 800, alProgreso?: (hechas: number, total: number) => void) {
  const urls: string[] = [];
  for (let z = 12; z <= 17; z++) {
    const n = 2 ** z;
    const dLat = radioM / 111320, dLon = radioM / (111320 * Math.cos((lat * Math.PI) / 180));
    const tx = (lo: number) => Math.floor(((lo + 180) / 360) * n);
    const ty = (la: number) => { const r = (la * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n); };
    for (let x = tx(lon - dLon); x <= tx(lon + dLon); x++)
      for (let y = ty(lat + dLat); y <= ty(lat - dLat); y++) urls.push(TESELA.replace("{z}", String(z)).replace("{y}", String(y)).replace("{x}", String(x)));
  }
  let hechas = 0;
  const lote = 6;
  for (let i = 0; i < urls.length; i += lote) {
    await Promise.all(urls.slice(i, i + lote).map((u) => fetch(u, { mode: "no-cors" }).catch(() => null)));
    hechas = Math.min(urls.length, i + lote);
    alProgreso?.(hechas, urls.length);
  }
  return urls.length;
}
