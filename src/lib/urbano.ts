/**
 * Zonas urbanas de la región: ahí Waze y Google Maps conocen todas las calles, así que no tienen sentido
 * las referencias de campo (salida de ruta, camino de yacimiento, baterías a varios km) ni los caminos de OpenStreetMap
 * dibujados como picadas. Círculos aproximados por ciudad: [nombre, lat, lon, radio en km].
 */
const ZONAS: [string, number, number, number][] = [
  ["Neuquén", -38.9516, -68.0791, 10],
  ["Centenario", -38.8295, -68.1340, 4],
  ["Plottier", -38.9655, -68.2330, 4],
  ["Cipolletti", -38.9340, -67.9900, 5],
  ["Cinco Saltos", -38.8230, -68.0640, 3],
  ["Fernández Oro", -38.9550, -67.9250, 2.5],
  ["Allen", -38.9780, -67.8270, 3.5],
  ["General Roca", -39.0330, -67.5830, 5],
  ["Villa Regina", -39.0960, -67.0840, 3.5],
  ["Senillosa", -39.0120, -68.4330, 2.5],
  ["Vista Alegre", -38.7350, -68.1630, 2.5],
  ["Añelo", -38.3540, -68.7880, 3],
  ["Rincón de los Sauces", -37.3900, -68.9300, 3.5],
  ["Catriel", -37.8790, -67.7940, 3],
  ["25 de Mayo", -37.7700, -67.7150, 3],
  ["Cutral Có y Plaza Huincul", -38.9300, -69.2200, 3.5],
  ["Zapala", -38.8990, -70.0650, 4],
  ["Chos Malal", -37.3780, -70.2700, 3],
  ["Las Lajas", -38.5300, -70.3700, 2],
  ["Buta Ranquil", -37.0500, -69.8700, 2],
  ["Picún Leufú", -39.5200, -69.2900, 2],
  ["Malargüe", -35.4750, -69.5850, 4],
  ["San Rafael", -34.6170, -68.3300, 7],
  ["General Alvear", -34.9800, -67.6900, 3],
  ["Gran Mendoza", -32.9200, -68.8300, 12],
  ["Santa Rosa", -36.6200, -64.2900, 6],
  ["General Acha", -37.3800, -64.6000, 2.5],
];

/** Nombre de la ciudad si el punto cae dentro de una zona urbana, si no null */
export function zonaUrbana(lat: number, lon: number): string | null {
  for (const [n, la, lo, r] of ZONAS) {
    const dy = (lat - la) * 111.2, dx = (lon - lo) * 111.2 * Math.cos((la * Math.PI) / 180);
    if (dx * dx + dy * dy <= r * r) return n;
  }
  return null;
}

/** Grilla de pozos para saber rápido si hay pozos cerca (los bordes de ciudad con yacimiento siguen siendo campo) */
export function grillaPozos(pts: { lat: number; lon: number }[]) {
  const g = new Map<string, { lat: number; lon: number }[]>();
  for (const p of pts) { const k = `${Math.floor(p.lat * 100)},${Math.floor(p.lon * 100)}`; (g.get(k) ?? g.set(k, []).get(k)!).push(p); }
  return (lat: number, lon: number, m: number) => {
    const y = Math.floor(lat * 100), x = Math.floor(lon * 100), r = Math.ceil(m / 900);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (const p of g.get(`${y + i},${x + j}`) ?? []) {
      const dy = (p.lat - lat) * 111200, dx = (p.lon - lon) * 111200 * Math.cos((lat * Math.PI) / 180);
      if (dx * dx + dy * dy <= m * m) return true;
    }
    return false;
  };
}
