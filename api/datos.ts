// Entrega los datos de la app solo a usuarios con la prueba o el plan vigentes.
// Los archivos viven en /datos (fuera de public/), así no se pueden bajar con un enlace directo.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const SUPA_URL = process.env.SUPABASE_URL || "https://azccpjhcafurltdndkam.supabase.co";
const SUPA_CLAVE = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_UFzi-mP-yeIThOiavE0n8Q_TEk0pRF9";
const PERMITIDOS = new Set(["pozos.json", "instalaciones.json", "areas.geojson", "rutas.geojson", "caminos.geojson", "meta.json"]);

const accesos = new Map<string, { t: number; ok: boolean }>();
async function tieneAcceso(token: string) {
  const c = accesos.get(token);
  if (c && Date.now() - c.t < 5 * 60000) return c.ok;
  let ok = false;
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/picada_acceso`, {
      method: "POST",
      headers: { apikey: SUPA_CLAVE, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(8000)
    });
    if (r.ok) ok = (await r.json())?.acceso === true;
  } catch { /* sin respuesta: se niega */ }
  accesos.set(token, { t: Date.now(), ok });
  if (accesos.size > 2000) accesos.delete(accesos.keys().next().value!);
  return ok;
}

const comprimidos = new Map<string, Buffer>();
async function archivo(nombre: string) {
  let b = comprimidos.get(nombre);
  if (!b) {
    b = gzipSync(await readFile(join(process.cwd(), "datos", nombre)), { level: 9 });
    comprimidos.set(nombre, b);
  }
  return b;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const nombre = String(req.query?.archivo || "");
  if (!PERMITIDOS.has(nombre)) return res.status(404).json({ error: "No existe." });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Ingresá con tu cuenta." });
  if (!(await tieneAcceso(token))) return res.status(403).json({ error: "Tu acceso no está vigente." });
  try {
    const b = await archivo(nombre);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Vary", "Authorization");
    return res.status(200).send(b);
  } catch (e) {
    console.error("datos", nombre, e);
    return res.status(500).json({ error: "No se pudo leer el archivo." });
  }
}
