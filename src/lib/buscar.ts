/**
 * Búsqueda por partes (no exacta). "lach 419" encuentra YPF.Nq.LACh-419(h);
 * "adv x1 orejano" encuentra TEC.Nq.ADV.x-1 en El Orejano. Cada palabra suma puntos
 * según aparezca en la sigla o en el resto del texto, y se devuelven los mejores.
 */
export const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const compactar = (s: string) => normalizar(s).replace(/ /g, "");
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "en", "y", "pozo", "pozos", "area", "planta", "yacimiento"]);
const PISTAS: Record<string, string> = { sumidero: "Sumidero", swd: "Sumidero", inyector: "Inyección de Agua", gas: "Gasífero", gasifero: "Gasífero", petrolero: "Petrolífero", petrolifero: "Petrolífero" };

export interface Indexado { i: number; codigo: string; texto: string; tipo?: string; activo: boolean }

export function buscarPorPartes(idx: Indexado[], consulta: string, max = 30) {
  const palabras = normalizar(consulta).split(" ").filter((p) => p && !VACIAS.has(p));
  if (!palabras.length) return [];
  const pista = palabras.map((p) => PISTAS[p]).find(Boolean);
  const utiles = palabras.filter((p) => !PISTAS[p]);
  const junto = utiles.join("");
  const necesarias = Math.max(1, Math.ceil(utiles.length / 2));
  const res: { r: Indexado; puntos: number }[] = [];
  for (const r of idx) {
    let puntos = 0, acertadas = 0, enCodigo = 0;
    for (const p of utiles) {
      if (r.codigo.includes(p)) { puntos += p.length >= 2 ? 3 : 1; acertadas++; enCodigo++; }
      else if (r.texto.includes(p)) { puntos += 1.5; acertadas++; }
    }
    const pegado = junto.length >= 3 && r.codigo.includes(junto);
    if (pegado) puntos += 5;
    if (acertadas < necesarias && !pegado) continue;
    if (enCodigo === 0 && utiles.length > 1 && acertadas < utiles.length) continue;
    if (pista && r.tipo === pista) puntos += 1;
    if (r.activo) puntos += 0.3;
    // Una sigla que termina justo en lo buscado ("419" → LACh-419) va primero que LACh-4190
    if (utiles.length && new RegExp(`${utiles.at(-1)}(h|d)?$`).test(r.codigo)) puntos += 1;
    res.push({ r, puntos });
  }
  return res.sort((a, b) => b.puntos - a.puntos).slice(0, max).map((x) => x.r.i);
}

export { compactar };
