/** Favoritos y recientes: quedan en este teléfono. Si el navegador no deja guardar, la app sigue igual. */
import { useCallback, useState } from "react";

const leer = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const escribir = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

export function useLista(clave: string, max = 50) {
  const [lista, setLista] = useState<string[]>(() => leer(clave));
  const poner = useCallback((id: string) => setLista((l) => { const n = [id, ...l.filter((x) => x !== id)].slice(0, max); escribir(clave, n); return n; }), [clave, max]);
  const sacar = useCallback((id: string) => setLista((l) => { const n = l.filter((x) => x !== id); escribir(clave, n); return n; }), [clave]);
  const alternar = useCallback((id: string) => setLista((l) => { const n = l.includes(id) ? l.filter((x) => x !== id) : [id, ...l].slice(0, max); escribir(clave, n); return n; }), [clave, max]);
  return { lista, poner, sacar, alternar };
}
