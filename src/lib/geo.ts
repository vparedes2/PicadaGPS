/** Cálculos geográficos simples: distancias, rumbos y el punto más cercano de una línea. */
const R = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;

export function distM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Rumbo en grados (0 = norte) para ir del punto 1 al punto 2 */
export function rumbo(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const PUNTOS = ["norte", "noreste", "este", "sudeste", "sur", "sudoeste", "oeste", "noroeste"];
export const cardinal = (g: number) => PUNTOS[Math.round(g / 45) % 8];

export function textoDist(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toLocaleString("es-AR", { maximumFractionDigits: m < 10000 ? 1 : 0 })} km`;
}

export function aDMS(v: number, esLat: boolean) {
  const h = esLat ? (v < 0 ? "S" : "N") : v < 0 ? "O" : "E";
  const a = Math.abs(v), g = Math.floor(a), mf = (a - g) * 60, m = Math.floor(mf), s = (mf - m) * 60;
  return `${g}°${String(m).padStart(2, "0")}'${s.toFixed(1).padStart(4, "0")}" ${h}`;
}

/** Punto más cercano a (lat, lon) sobre un segmento a-b, en coordenadas planas locales */
function proyectar(lat: number, lon: number, a: number[], b: number[]) {
  const kx = Math.cos(rad(lat));
  const ax = (a[0] - lon) * kx, ay = a[1] - lat, bx = (b[0] - lon) * kx, by = b[1] - lat;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export interface Ruta { nombre: string; coords: number[][]; caja: [number, number, number, number] }

/** La ruta más cercana y el punto de la ruta donde conviene salir hacia el pozo */
export function rutaMasCercana(lat: number, lon: number, rutas: Ruta[]) {
  let mejor: { nombre: string; lat: number; lon: number; d: number } | null = null;
  const margen = 0.6; // grados: ninguna ruta principal de Neuquén queda más lejos que esto
  for (const r of rutas) {
    const [w, s, e, n] = r.caja;
    if (lon < w - margen || lon > e + margen || lat < s - margen || lat > n + margen) continue;
    for (let i = 1; i < r.coords.length; i++) {
      const p = proyectar(lat, lon, r.coords[i - 1], r.coords[i]);
      const d = distM(lat, lon, p[1], p[0]);
      if (!mejor || d < mejor.d) mejor = { nombre: r.nombre, lat: p[1], lon: p[0], d };
    }
  }
  return mejor;
}
