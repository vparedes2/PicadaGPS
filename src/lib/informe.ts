/** Informe PDF del simulador de costos, para entregar al cliente. Se arma en el teléfono, sin servidor. */
import { jsPDF } from "jspdf";

export interface Cliente { empresa: string; contacto: string; mail: string; telefono: string }
export interface Resultado {
  errores: number; km: number; litros: number; horasPersona: number; eventosNpt: number;
  costos: { k: string; n: number }[]; total: number; personas: number; costoApp: number; ahorro: number; neto: number; veces: number;
}
export interface Supuesto { grupo: string; items: { etiqueta: string; valor: string }[] }

const C = {
  verde: [31, 58, 46] as const, acento: [31, 111, 74] as const, claro: [233, 243, 237] as const, naranja: [194, 65, 12] as const,
  texto: [40, 37, 32] as const, tenue: [110, 104, 94] as const, linea: [221, 213, 195] as const, fondo: [248, 246, 241] as const, blanco: [255, 255, 255] as const
};
const A4 = { w: 210, h: 297 }, M = 18, ANCHO = A4.w - 2 * M;

const pesos = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const num = (n: number, d = 0) => n.toLocaleString("es-AR", { maximumFractionDigits: d });

async function imagenDataURL(url: string): Promise<string | null> {
  try {
    const b = await (await fetch(url)).blob();
    return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ok(null); r.readAsDataURL(b); });
  } catch { return null; }
}

export async function crearInforme(cli: Cliente, r: Resultado, supuestos: Supuesto[], reduccion: number, whatsapp: string): Promise<{ blob: Blob; nombre: string }> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await imagenDataURL("/icono-192.png");
  const fecha = new Date();
  const fechaTxt = fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const nro = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}${String(fecha.getDate()).padStart(2, "0")}-${String(fecha.getHours()).padStart(2, "0")}${String(fecha.getMinutes()).padStart(2, "0")}`;
  const tel = whatsapp.replace(/^549/, "").replace(/^(\d{3})(\d{3})(\d+)$/, "$1 $2 $3");

  const color = (c: readonly number[], tipo: "fill" | "text" | "draw" = "text") =>
    tipo === "fill" ? doc.setFillColor(c[0], c[1], c[2]) : tipo === "draw" ? doc.setDrawColor(c[0], c[1], c[2]) : doc.setTextColor(c[0], c[1], c[2]);
  const t = (s: string, x: number, y: number, o: { tam?: number; negrita?: boolean; c?: readonly number[]; der?: boolean; centro?: boolean; ancho?: number } = {}) => {
    doc.setFont("helvetica", o.negrita ? "bold" : "normal"); doc.setFontSize(o.tam ?? 10); color(o.c ?? C.texto);
    const lineas = o.ancho ? doc.splitTextToSize(s, o.ancho) : s;
    doc.text(lineas, x, y, { align: o.der ? "right" : o.centro ? "center" : "left" });
    return Array.isArray(lineas) ? lineas.length : 1;
  };
  const titulo = (s: string, y: number) => {
    color(C.acento, "fill"); doc.rect(M, y - 3.6, 1.4, 4.6, "F");
    t(s.toUpperCase(), M + 4, y, { tam: 9.5, negrita: true, c: C.verde });
    color(C.linea, "draw"); doc.setLineWidth(0.2); doc.line(M + 4 + doc.getTextWidth(s.toUpperCase()) + 3, y - 1.2, A4.w - M, y - 1.2);
  };
  const pie = (pag: number, total: number) => {
    color(C.linea, "draw"); doc.setLineWidth(0.2); doc.line(M, A4.h - 16, A4.w - M, A4.h - 16);
    t("PicadaGPS · picadagps.ar · WhatsApp " + tel, M, A4.h - 11, { tam: 8, c: C.tenue });
    t(`Informe ${nro} · página ${pag} de ${total}`, A4.w - M, A4.h - 11, { tam: 8, c: C.tenue, der: true });
  };

  // ---------- Página 1 ----------
  color(C.verde, "fill"); doc.rect(0, 0, A4.w, 46, "F");
  color(C.acento, "fill"); doc.rect(0, 46, A4.w, 1.6, "F");
  if (logo) doc.addImage(logo, "PNG", M, 11, 15, 15);
  t("PicadaGPS", M + 19, 18.5, { tam: 16, negrita: true, c: C.blanco });
  t("Ubicación de pozos y locaciones sin señal", M + 19, 24, { tam: 9, c: [190, 214, 200] });
  t("Informe de costos por", A4.w - M, 16.5, { tam: 10, c: [190, 214, 200], der: true });
  t("errores de ubicación en campo", A4.w - M, 22.5, { tam: 13, negrita: true, c: C.blanco, der: true });
  t(fechaTxt, A4.w - M, 29, { tam: 9, c: [190, 214, 200], der: true });
  t("PREPARADO PARA", M, 36.5, { tam: 7.5, negrita: true, c: [150, 190, 170] });
  t(cli.empresa || "—", M, 41.5, { tam: 12, negrita: true, c: C.blanco });
  const datosCli = [cli.contacto, cli.mail, cli.telefono].filter(Boolean).join("  ·  ");
  if (datosCli) t(datosCli, A4.w - M, 41.5, { tam: 9, c: [214, 230, 221], der: true });

  let y = 60;
  t("Este informe estima cuánto le cuesta por mes a la flota no llegar a la locación a la primera: kilómetros de más, combustible, horas de personal, desgaste, equipos esperando y exposición a riesgos en caminos de ripio. Los valores surgen de los supuestos detallados en la página 2 y pueden ajustarse con datos reales de la operación.", M, y, { tam: 9.5, c: C.tenue, ancho: ANCHO });

  // Tarjetas principales
  y = 74;
  const tarj = [
    { k: "Costo mensual estimado", v: pesos(r.total), s: `${num(r.errores)} errores de ubicación por mes`, fondo: C.fondo, c: C.texto },
    { k: "Costo anual estimado", v: pesos(r.total * 12), s: `${pesos(r.errores ? r.total / r.errores : 0)} por cada error`, fondo: C.fondo, c: C.texto },
    { k: "Ahorro mensual con PicadaGPS", v: pesos(r.ahorro), s: `evitando el ${num(reduccion)} % de los errores`, fondo: C.claro, c: C.acento }
  ];
  const tw = (ANCHO - 8) / 3;
  tarj.forEach((x, i) => {
    const tx = M + i * (tw + 4);
    color(x.fondo, "fill"); doc.roundedRect(tx, y, tw, 25, 2.5, 2.5, "F");
    if (i === 2) { color(C.acento, "draw"); doc.setLineWidth(0.5); doc.roundedRect(tx, y, tw, 25, 2.5, 2.5, "S"); }
    t(x.k, tx + 4, y + 6.5, { tam: 8, c: C.tenue });
    t(x.v, tx + 4, y + 15, { tam: 15, negrita: true, c: x.c });
    t(x.s, tx + 4, y + 21, { tam: 7.5, c: C.tenue });
  });

  // Desglose
  y = 110; titulo("Desglose del costo mensual", y);
  y += 8;
  const orden = [...r.costos].sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...orden.map((c) => c.n));
  const xBar = M + 56, wBar = 78;
  orden.forEach((c, i) => {
    const yy = y + i * 8;
    const pct = r.total ? (c.n / r.total) * 100 : 0;
    t(c.k, M, yy + 3.2, { tam: 9 });
    color(C.fondo, "fill"); doc.roundedRect(xBar, yy, wBar, 4.6, 1.2, 1.2, "F");
    if (c.n > 0) { color(i === 0 ? C.acento : [96, 150, 120], "fill"); doc.roundedRect(xBar, yy, Math.max(1.5, (c.n / max) * wBar), 4.6, 1.2, 1.2, "F"); }
    t(pesos(c.n), A4.w - M - 16, yy + 3.4, { tam: 9, negrita: true, der: true });
    t(`${num(pct)} %`, A4.w - M, yy + 3.4, { tam: 8.5, c: C.tenue, der: true });
  });
  y += orden.length * 8 + 1;
  color(C.linea, "draw"); doc.setLineWidth(0.2); doc.line(M, y, A4.w - M, y);
  t("Total mensual", M, y + 6, { tam: 10, negrita: true });
  t(pesos(r.total), A4.w - M - 16, y + 6, { tam: 10, negrita: true, der: true });
  t("100 %", A4.w - M, y + 6, { tam: 8.5, c: C.tenue, der: true });

  // Indicadores
  y += 15; titulo("Indicadores operativos por mes", y);
  y += 6;
  const ind = [
    ["Errores de ubicación", num(r.errores)], ["Kilómetros de más", `${num(r.km)} km`], ["Gasoil extra", `${num(r.litros)} L`],
    ["Horas de personal", `${num(r.horasPersona)} h`], ["Llegadas tarde a operaciones", num(r.eventosNpt, 1)], ["Exposición extra en ripio", `${num(r.km)} km`]
  ];
  const iw = (ANCHO - 10) / 3;
  ind.forEach(([k, v], i) => {
    const ix = M + (i % 3) * (iw + 5), iy = y + Math.floor(i / 3) * 15.5;
    color(C.linea, "draw"); doc.setLineWidth(0.25); doc.roundedRect(ix, iy, iw, 14, 2, 2, "S");
    t(k, ix + 3.5, iy + 5, { tam: 7.5, c: C.tenue });
    t(v, ix + 3.5, iy + 11, { tam: 12, negrita: true });
  });

  // Retorno
  y += 36; titulo("Retorno de PicadaGPS", y);
  y += 7;
  color(C.claro, "fill"); doc.roundedRect(M, y, ANCHO, 33, 2.5, 2.5, "F");
  const maxR = Math.max(r.ahorro, r.costoApp, 1), wR = 92, xR = M + 46;
  t(`Costo de la app (${r.personas} usuarios)`, M + 4, y + 9, { tam: 8.5, c: C.tenue });
  color(C.linea, "fill"); doc.roundedRect(xR, y + 5.5, Math.max(1.5, (r.costoApp / maxR) * wR), 5, 1.2, 1.2, "F");
  t(pesos(r.costoApp) + " / mes", A4.w - M - 4, y + 9.4, { tam: 9, negrita: true, der: true });
  t("Ahorro estimado", M + 4, y + 19, { tam: 8.5, c: C.tenue });
  color(C.acento, "fill"); doc.roundedRect(xR, y + 15.5, Math.max(1.5, (r.ahorro / maxR) * wR), 5, 1.2, 1.2, "F");
  t(pesos(r.ahorro) + " / mes", A4.w - M - 4, y + 19.4, { tam: 9, negrita: true, c: C.acento, der: true });
  t(r.veces ? `Recupera ${num(r.veces, 1)} veces su costo` : "—", M + 4, y + 28.5, { tam: 12, negrita: true, c: C.verde });
  t(`Ahorro neto anual: ${pesos(r.neto * 12)}`, A4.w - M - 4, y + 28.5, { tam: 10, negrita: true, c: C.verde, der: true });

  // ---------- Página 2 ----------
  doc.addPage();
  color(C.verde, "fill"); doc.rect(0, 0, A4.w, 14, "F");
  if (logo) doc.addImage(logo, "PNG", M, 3.5, 7, 7);
  t("PicadaGPS · Informe de costos por errores de ubicación", M + 10, 8.8, { tam: 9, negrita: true, c: C.blanco });
  t(cli.empresa || "", A4.w - M, 8.8, { tam: 9, c: [190, 214, 200], der: true });

  y = 28; titulo("Supuestos utilizados", y);
  y += 6;
  const colW = (ANCHO - 8) / 2;
  const cols = [M, M + colW + 8]; const yCol = [y, y];
  supuestos.forEach((g) => {
    const ci = yCol[0] <= yCol[1] ? 0 : 1;
    let yy = yCol[ci]; const x = cols[ci];
    t(g.grupo, x, yy + 4, { tam: 8.5, negrita: true, c: C.acento });
    yy += 6.5;
    g.items.forEach((it, j) => {
      if (j % 2 === 0) { color(C.fondo, "fill"); doc.rect(x, yy - 0.2, colW, 6, "F"); }
      t(it.etiqueta, x + 2, yy + 3.9, { tam: 8 });
      t(it.valor, x + colW - 2, yy + 3.9, { tam: 8, negrita: true, der: true });
      yy += 6;
    });
    yCol[ci] = yy + 5;
  });

  y = Math.max(yCol[0], yCol[1]) + 4; titulo("Cómo se calcula", y);
  y += 6;
  const notas = [
    "Errores por mes: viajes a locación de cada vehículo por el porcentaje de viajes en los que no se encuentra la locación a la primera.",
    "Combustible y desgaste: kilómetros de más por el consumo, el precio del gasoil y el costo de mantenimiento por kilómetro en ripio.",
    "Horas de personal: tiempo perdido por error multiplicado por las personas a bordo y el costo de la hora hombre con cargas.",
    "Tiempo no productivo: parte de los errores demora una operación (equipo, set de fractura o servicio esperando) y se valoriza por hora parada.",
    "Riesgo HSE: costo esperado según los kilómetros de más, la tasa de incidentes vehiculares por millón de km y el costo medio de un incidente.",
    "Imagen ante el cliente: llegadas tarde a operaciones y penalidades contractuales, si el contrato las prevé."
  ];
  notas.forEach((n) => {
    color(C.acento, "fill"); doc.circle(M + 1.2, y + 1.6, 0.8, "F");
    const l = t(n, M + 5, y + 2.6, { tam: 8.5, c: C.texto, ancho: ANCHO - 5 });
    y += l * 4.2 + 2.2;
  });

  y += 6; titulo("Próximos pasos", y);
  y += 7;
  color(C.verde, "fill"); doc.roundedRect(M, y, ANCHO, 30, 2.5, 2.5, "F");
  t("Probá PicadaGPS 7 días gratis con tu equipo", M + 6, y + 9, { tam: 12, negrita: true, c: C.blanco });
  t("Búsqueda por sigla, pad, área u operadora · cómo llegar desde la ruta · funciona sin señal · ubicación compartida por WhatsApp con foto satelital.", M + 6, y + 15.5, { tam: 8.5, c: [214, 230, 221], ancho: ANCHO - 12 });
  t(`picadagps.ar   ·   WhatsApp ${tel}   ·   Plan para empresas a medida`, M + 6, y + 25.5, { tam: 9, negrita: true, c: [159, 216, 184] });

  t("Estimación basada en los supuestos indicados. No constituye una garantía de ahorro; los resultados dependen de cada operación. Recordá usar el celular solo con el vehículo detenido.", M, A4.h - 24, { tam: 7.5, c: C.tenue, ancho: ANCHO });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); pie(i, total); }

  const limpio = (cli.empresa || "cliente").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
  return { blob: doc.output("blob"), nombre: `PicadaGPS_informe_${limpio}_${nro}.pdf` };
}
