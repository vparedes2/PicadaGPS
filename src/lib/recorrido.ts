/**
 * Camino sugerido (prueba, solo administrador): arma una red con los caminos de yacimiento de OpenStreetMap
 * alrededor del pozo y busca, por el camino más corto, la salida de ruta más cercana medida por camino
 * (no en línea recta). Todo se calcula en el teléfono, sin señal.
 */
import { distM } from "./geo";
import type { Datos } from "./datos";

/** Quiénes ven la prueba del camino sugerido, además del administrador */
export const PRUEBA_CAMINO = ["gonzalesrigo04@gmail.com"];
export const veCaminoSugerido = (a: { rol?: string; email?: string }) =>
  a.rol === "admin" || (!!a.email && PRUEBA_CAMINO.includes(a.email.toLowerCase()));

export interface Sugerido {
  /** [lon, lat] desde la salida de la ruta hasta el pozo */
  traza: number[][];
  /** metros por caminos de yacimiento, desde la ruta hasta el punto del camino más cercano al pozo */
  porCamino: number;
  /** metros sin camino cargado, del último punto del camino al pozo */
  sinCamino: number;
  salida: { lat: number; lon: number; nombre: string };
}

const CAJA = 0.3;          // grados alrededor del pozo (~30 km)
const UNION = 25;          // m: puntas de camino que se tocan con otro camino
const SALTO = 150;         // m: hueco entre caminos que se puede cruzar (OpenStreetMap a veces deja tramos sueltos)
const CASTIGO = 3;         // un metro sin camino «vale» como 3 metros por camino
const CERCA_RUTA = 50;     // m: un punto del camino a menos de esto ya está sobre la ruta
const PASO = 40;           // m: largo máximo de cada tramo de la red
const MAX_SIN_CAMINO = 3000;
const G = 0.0005;          // celda de la grilla (~50 m)

const rad = (g: number) => (g * Math.PI) / 180;
function proyectar(lat: number, lon: number, a: number[], b: number[]) {
  const kx = Math.cos(rad(lat));
  const ax = (a[0] - lon) * kx, ay = a[1] - lat, bx = (b[0] - lon) * kx, by = b[1] - lat;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function sugerirCamino(d: Datos, lat: number, lon: number): Sugerido | null {
  const enCaja = (c: [number, number, number, number]) => c[2] > lon - CAJA && c[0] < lon + CAJA && c[3] > lat - CAJA && c[1] < lat + CAJA;
  const dist = (a: number[], b: number[]) => distM(a[1], a[0], b[1], b[0]);

  // 1. Red de caminos: un nodo por punto (redondeado a ~1 m), unidos por cada tramo
  const id = new Map<string, number>();
  const pts: number[][] = [], ady: number[][] = [], pes: number[][] = [];
  const nodo = (p: number[]) => {
    const k = `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
    let i = id.get(k);
    if (i === undefined) { i = pts.length; id.set(k, i); pts.push([p[0], p[1]]); ady.push([]); pes.push([]); }
    return i;
  };
  const unir = (a: number, b: number, w: number) => { if (a === b) return; ady[a].push(b); pes[a].push(w); ady[b].push(a); pes[b].push(w); };
  const segs: [number, number][] = [];
  const lineaDe: number[] = [];
  const lineaDePunta = new Map<number, number>();
  const puntas: number[] = [];
  let nl = 0;
  for (const c of d.caminos) {
    if (!enCaja(c.caja) || c.coords.length < 2) continue;
    // Los tramos largos se cortan cada ~40 m: así se detecta dónde un camino cruza una ruta
    let prev = -1;
    for (let q = 0; q < c.coords.length; q++) {
      const p = c.coords[q];
      const partes = q === 0 ? 1 : Math.max(1, Math.ceil(dist(c.coords[q - 1], p) / PASO));
      for (let s = 1; s <= partes; s++) {
        const o = q === 0 ? p : [c.coords[q - 1][0] + ((p[0] - c.coords[q - 1][0]) * s) / partes, c.coords[q - 1][1] + ((p[1] - c.coords[q - 1][1]) * s) / partes];
        const i = nodo(o);
        if (prev >= 0 && prev !== i) { unir(prev, i, dist(pts[prev], pts[i])); segs.push([prev, i]); lineaDe.push(nl); }
        prev = i;
      }
    }
    for (const e of [nodo(c.coords[0]), nodo(c.coords[c.coords.length - 1])]) { puntas.push(e); lineaDePunta.set(e, nl); }
    nl++;
  }
  if (!segs.length) return null;

  // 2. Las puntas que quedan a pocos metros de otro camino se unen a ese camino (OpenStreetMap a veces no comparte
  //    el nodo, y al simplificar las líneas el cruce puede quedar a mitad de un tramo)
  const gk = (x: number, y: number) => `${Math.floor(x / G)},${Math.floor(y / G)}`;
  const segGr = new Map<string, number[]>();
  segs.forEach(([a, b], k) => {
    const pa = pts[a], pb = pts[b];
    for (let x = Math.floor(Math.min(pa[0], pb[0]) / G); x <= Math.floor(Math.max(pa[0], pb[0]) / G); x++)
      for (let y = Math.floor(Math.min(pa[1], pb[1]) / G); y <= Math.floor(Math.max(pa[1], pb[1]) / G); y++) {
        const c = `${x},${y}`; const l = segGr.get(c); if (l) l.push(k); else segGr.set(c, [k]);
      }
  });
  const R = Math.ceil(SALTO / 40);   // celdas alrededor (una celda tiene ~45 m de ancho a esta latitud)
  const segsCerca = (p: number[]) => {
    const cx = Math.floor(p[0] / G), cy = Math.floor(p[1] / G), vistos = new Set<number>();
    for (let x = cx - R; x <= cx + R; x++) for (let y = cy - R; y <= cy + R; y++) for (const k of segGr.get(`${x},${y}`) ?? []) vistos.add(k);
    return vistos;
  };
  // Para no saltar a un camino que ya está unido al mismo tramo, se anota de qué línea es cada segmento

  for (const e of new Set(puntas)) {
    const p = pts[e];
    for (const k of segsCerca(p)) {
      const [a, b] = segs[k];
      if (a === e || b === e) continue;
      if (lineaDe[k] === lineaDePunta.get(e)) continue;
      const q = proyectar(p[1], p[0], pts[a], pts[b]), w = dist(p, q);
      if (w > SALTO) continue;
      const c = w <= UNION ? w : w * CASTIGO;
      unir(e, a, c + dist(q, pts[a]));
      unir(e, b, c + dist(q, pts[b]));
    }
  }

  // 3. Rutas cercanas, en puntos cada ~50 m, para saber cuándo un camino ya llegó a la ruta
  const rutaGr = new Map<string, { p: number[]; n: string }[]>();
  for (const r of d.rutas) {
    if (!enCaja(r.caja)) continue;
    for (let i = 1; i < r.coords.length; i++) {
      const a = r.coords[i - 1], b = r.coords[i], n = Math.max(1, Math.ceil(dist(a, b) / PASO));
      for (let s = 0; s <= n; s++) {
        const p = [a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n];
        const k = gk(p[0], p[1]); const l = rutaGr.get(k); const v = { p, n: r.nombre };
        if (l) l.push(v); else rutaGr.set(k, [v]);
      }
    }
  }
  const sobreRuta = (p: number[]) => {
    const cx = Math.floor(p[0] / G), cy = Math.floor(p[1] / G);
    let mejor: { p: number[]; n: string; d: number } | null = null;
    for (let x = cx - R; x <= cx + R; x++) for (let y = cy - R; y <= cy + R; y++)
      for (const v of rutaGr.get(`${x},${y}`) ?? []) {
        const w = dist(p, v.p);
        if (w <= SALTO && (!mejor || w < mejor.d)) mejor = { ...v, d: w };
      }
    return mejor;
  };

  // 4. Puntos de llegada: los caminos más cercanos al pozo (no solo el primero: a veces el más cercano es un tramo suelto)
  const llegadas: { a: number; b: number; p: number[]; d: number }[] = [];
  for (const [a, b] of segs) {
    const pa = pts[a], pb = pts[b];
    if (Math.min(pa[0], pb[0]) > lon + 0.04 || Math.max(pa[0], pb[0]) < lon - 0.04 || Math.min(pa[1], pb[1]) > lat + 0.03 || Math.max(pa[1], pb[1]) < lat - 0.03) continue;
    const p = proyectar(lat, lon, pa, pb), w = distM(lat, lon, p[1], p[0]);
    if (w <= MAX_SIN_CAMINO) llegadas.push({ a, b, p, d: w });
  }
  if (!llegadas.length) return null;
  llegadas.sort((x, y) => x.d - y.d);
  const tope = Math.min(MAX_SIN_CAMINO, llegadas[0].d + 600);
  const sinCaminoDe = new Map<number, number>();
  for (const l of llegadas) {
    if (l.d > tope) break;
    const t = pts.length;
    pts.push(l.p); ady.push([]); pes.push([]);
    unir(t, l.a, dist(l.p, pts[l.a]));
    unir(t, l.b, dist(l.p, pts[l.b]));
    sinCaminoDe.set(t, l.d);
  }

  // 5. Dijkstra desde el pozo hacia afuera: la primera ruta que aparece es la salida más corta por camino
  const n = pts.length;
  const dd = new Float64Array(n).fill(Infinity), padre = new Int32Array(n).fill(-1);
  const heap: [number, number][] = [];
  const subir = (x: [number, number]) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; } };
  const sacar = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  // Caminar sin camino cuesta el doble que andar por camino: así prefiere llegar por un camino conectado
  for (const [t, w] of sinCaminoDe) { dd[t] = w * 2; subir([w * 2, t]); }
  // La salida más barata: llegar a la ruta por camino, o cruzar a pie un hueco corto hasta la ruta (con castigo)
  let fin = -1, ruta: { p: number[]; n: string } | null = null, mejor = Infinity;
  while (heap.length) {
    const [w, i] = sacar();
    if (w > dd[i]) continue;
    if (w >= mejor || w > 80000) break;
    const r = sobreRuta(pts[i]);
    if (r) {
      const c = w + (r.d <= CERCA_RUTA ? 0 : r.d * CASTIGO);
      if (c < mejor) { mejor = c; fin = i; ruta = r; }
    }
    for (let k = 0; k < ady[i].length; k++) {
      const j = ady[i][k], nw = w + pes[i][k];
      if (nw < dd[j]) { dd[j] = nw; padre[j] = i; subir([nw, j]); }
    }
  }
  if (fin < 0 || !ruta) return null;

  const traza: number[][] = [ruta.p];
  let inicio = fin;
  for (let i = fin; i >= 0; i = padre[i]) { traza.push(pts[i]); inicio = i; }
  traza.push([lon, lat]);
  const sinCamino = sinCaminoDe.get(inicio) ?? 0;
  return { traza, porCamino: dd[fin] - sinCamino * 2, sinCamino, salida: { lat: ruta.p[1], lon: ruta.p[0], nombre: ruta.n } };
}
