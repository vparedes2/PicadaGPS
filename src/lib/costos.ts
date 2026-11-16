/** Cálculo del costo de los errores de ubicación de una flota (lo usan el simulador y la presentación). */
export const EJEMPLO = {
  camiones: 10, viajesCamion: 25, personasCamion: 1,
  camionetas: 5, salidasCamioneta: 15, puntosSalida: 5, personasCamioneta: 2,
  pctError: 8, minCamion: 40, minCamioneta: 25, kmhCamion: 20, kmhCamioneta: 30,
  brutoChofer: 3058649, brutoTecnico: 5227590, cargas: 45, horasMes: 180,
  gasoil: 1650, consumoCamion: 42, consumoCamioneta: 14, desgasteCamion: 1450, desgasteCamioneta: 380, equipoCamion: 38000, equipoCamioneta: 12000,
  pctEspera: 25, costoEspera: 1150000, hseKm: 950,
  factCamion: 48000000, factCamioneta: 21000000, pctRiesgo: 2, baseRiesgo: 100,
  reduccion: 75
};
export type V = typeof EJEMPLO;

export function calcular(v: V) {
  const hChofer = v.brutoChofer * (1 + v.cargas / 100) / v.horasMes, hTecnico = v.brutoTecnico * (1 + v.cargas / 100) / v.horasMes;
  const bloque = (llegadas: number, personas: number, hPersona: number, minutos: number, kmh: number, L100: number, desg: number, equipo: number) => {
    const desv = llegadas * v.pctError / 100, horas = desv * minutos / 60, km = horas * kmh;
    const mo = horas * hPersona * personas, comb = km * L100 / 100 * v.gasoil, des = km * desg, eq = horas * equipo;
    return { llegadas, desv, horas, hh: horas * personas, km, mo, comb, des, eq, total: mo + comb + des + eq };
  };
  const c = bloque(v.camiones * v.viajesCamion, v.personasCamion, hChofer, v.minCamion, v.kmhCamion, v.consumoCamion, v.desgasteCamion, v.equipoCamion);
  const t = bloque(v.camionetas * v.salidasCamioneta * v.puntosSalida, v.personasCamioneta, hTecnico, v.minCamioneta, v.kmhCamioneta, v.consumoCamioneta, v.desgasteCamioneta, v.equipoCamioneta);
  const directo = c.total + t.total;
  const espera = c.desv * v.pctEspera / 100 * v.minCamion / 60 * v.costoEspera;
  const hse = (c.km + t.km) * v.hseKm;
  const facturacion = v.camiones * v.factCamion + v.camionetas * v.factCamioneta;
  const riesgo = facturacion * v.baseRiesgo / 100 * v.pctRiesgo / 100;
  const indirecto = espera + hse + riesgo, total = directo + indirecto;
  return { hChofer, hTecnico, c, t, directo, espera, hse, facturacion, riesgo, indirecto, total, anual: total * 12, ahorro: total * v.reduccion / 100 };
}


/** Enlace al simulador con los valores que difieren del ejemplo */
export function enlaceSimulador(v: V, origen = location.origin) {
  const dif = Object.fromEntries((Object.keys(EJEMPLO) as (keyof V)[]).filter((k) => v[k] !== EJEMPLO[k]).map((k) => [k, v[k]]));
  return `${origen}/simulador${Object.keys(dif).length ? `?v=${btoa(unescape(encodeURIComponent(JSON.stringify(dif))))}` : ""}`;
}
