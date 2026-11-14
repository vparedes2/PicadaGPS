/**
 * Simulador de costos por errores de ubicación en campo (herramienta comercial para Administración).
 * Todos los valores son supuestos editables; se guardan en este navegador.
 */
import { useMemo, useState } from "react";
import { Copy, RotateCcw, FileDown, Share2 } from "lucide-react";
import { pesos } from "../lib/cuenta";
import type { Cliente } from "../lib/informe";

const BASE = {
  pesados: 10, livianos: 5,
  viajesPesado: 40, viajesLiviano: 30,          // viajes a locación por vehículo por mes
  pctError: 8,                                   // % de viajes con error o demora para encontrar la locación
  kmPesado: 15, kmLiviano: 20,                   // km extra por error
  horasError: 0.75,                              // horas perdidas por error
  consumoPesado: 45, consumoLiviano: 14,         // L/100 km
  gasoil: 1500,                                  // $/L
  horaHombre: 9000, personasPesado: 1, personasLiviano: 2,
  desgastePesado: 600, desgasteLiviano: 250,     // $/km (neumáticos, suspensión, mantenimiento en ripio)
  pctNpt: 15, horasNpt: 1, costoNpt: 1200000,    // % de errores que demoran una operación, horas y costo por hora de equipo parado
  tasaIncidente: 2, costoIncidente: 15000000,    // incidentes vehiculares por millón de km y costo medio
  penalidad: 0,                                  // $ por llegada tarde (multas o descuentos del cliente)
  reduccion: 70,                                 // % de errores que evita PicadaGPS
  precioMes: 8604                                // costo de PicadaGPS por persona por mes (anual / 12)
};
type Vals = typeof BASE;
const CLAVE = "picadagps.simulador";

const CAMPOS: { titulo: string; items: [keyof Vals, string, string?][] }[] = [
  { titulo: "Flota y viajes", items: [["pesados", "Vehículos pesados"], ["livianos", "Vehículos livianos"], ["viajesPesado", "Viajes a locación por pesado por mes"], ["viajesLiviano", "Viajes a locación por liviano por mes"]] },
  { titulo: "Errores de ubicación", items: [["pctError", "Viajes con error o demora", "%"], ["kmPesado", "Km de más por error (pesado)", "km"], ["kmLiviano", "Km de más por error (liviano)", "km"], ["horasError", "Horas perdidas por error", "h"]] },
  { titulo: "Combustible y desgaste", items: [["consumoPesado", "Consumo pesado", "L/100 km"], ["consumoLiviano", "Consumo liviano", "L/100 km"], ["gasoil", "Precio del gasoil", "$/L"], ["desgastePesado", "Desgaste y mantenimiento pesado", "$/km"], ["desgasteLiviano", "Desgaste y mantenimiento liviano", "$/km"]] },
  { titulo: "Horas hombre", items: [["horaHombre", "Costo hora hombre (con cargas)", "$/h"], ["personasPesado", "Personas por pesado"], ["personasLiviano", "Personas por liviano"]] },
  { titulo: "Tiempo no productivo (NPT)", items: [["pctNpt", "Errores que demoran una operación", "%"], ["horasNpt", "Horas de demora por evento", "h"], ["costoNpt", "Costo de equipo o set parado", "$/h"]] },
  { titulo: "Riesgo HSE e imagen", items: [["tasaIncidente", "Incidentes vehiculares por millón de km", ""], ["costoIncidente", "Costo medio de un incidente", "$"], ["penalidad", "Penalidad del cliente por llegada tarde", "$"]] },
  { titulo: "Con PicadaGPS", items: [["reduccion", "Errores que se evitan", "%"], ["precioMes", "Costo por persona por mes", "$"]] }
];

const CLAVE_CLI = "picadagps.simulador.cliente";

export default function Simulador({ whatsapp = "5492994603071" }: { whatsapp?: string }) {
  const [cli, setCli] = useState<Cliente>(() => {
    try { return { empresa: "", contacto: "", mail: "", telefono: "", ...JSON.parse(localStorage.getItem(CLAVE_CLI) || "{}") }; } catch { return { empresa: "", contacto: "", mail: "", telefono: "" }; }
  });
  const [pdf, setPdf] = useState<"" | "armando" | "listo" | string>("");
  const cambiarCli = (k: keyof Cliente, x: string) => { const n = { ...cli, [k]: x }; setCli(n); try { localStorage.setItem(CLAVE_CLI, JSON.stringify(n)); } catch { /* nada */ } };
  const mailOk = !cli.mail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cli.mail);
  const [v, setV] = useState<Vals>(() => {
    try { return { ...BASE, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") }; } catch { return BASE; }
  });
  const [copiado, setCopiado] = useState(false);
  const cambiar = (k: keyof Vals, x: string) => {
    const n = { ...v, [k]: Number(x.replace(",", ".")) || 0 };
    setV(n); try { localStorage.setItem(CLAVE, JSON.stringify(n)); } catch { /* nada */ }
  };
  const restablecer = () => { setV(BASE); try { localStorage.removeItem(CLAVE); } catch { /* nada */ } };

  const r = useMemo(() => {
    const errP = v.pesados * v.viajesPesado * v.pctError / 100;
    const errL = v.livianos * v.viajesLiviano * v.pctError / 100;
    const errores = errP + errL;
    const km = errP * v.kmPesado + errL * v.kmLiviano;
    const litros = errP * v.kmPesado * v.consumoPesado / 100 + errL * v.kmLiviano * v.consumoLiviano / 100;
    const horasPersona = (errP * v.personasPesado + errL * v.personasLiviano) * v.horasError;
    const eventosNpt = errores * v.pctNpt / 100;
    const costos = [
      { k: "Combustible", n: litros * v.gasoil },
      { k: "Horas hombre", n: horasPersona * v.horaHombre },
      { k: "Desgaste y mantenimiento", n: errP * v.kmPesado * v.desgastePesado + errL * v.kmLiviano * v.desgasteLiviano },
      { k: "Tiempo no productivo (NPT)", n: eventosNpt * v.horasNpt * v.costoNpt },
      { k: "Riesgo HSE (esperado)", n: km / 1e6 * v.tasaIncidente * v.costoIncidente },
      { k: "Penalidades e imagen", n: eventosNpt * v.penalidad }
    ];
    const total = costos.reduce((s, c) => s + c.n, 0);
    const personas = v.pesados * v.personasPesado + v.livianos * v.personasLiviano;
    const costoApp = personas * v.precioMes;
    const ahorro = total * v.reduccion / 100;
    return { errores, km, litros, horasPersona, eventosNpt, costos, total, personas, costoApp, ahorro, neto: ahorro - costoApp, veces: costoApp ? ahorro / costoApp : 0 };
  }, [v]);

  const num = (n: number, d = 0) => n.toLocaleString("es-AR", { maximumFractionDigits: d });
  const max = Math.max(1, ...r.costos.map((c) => c.n));

  const resumen = [
    `*Costo estimado de errores de ubicación en campo*`,
    `Flota: ${v.pesados} pesados y ${v.livianos} livianos · ${num(r.errores)} errores por mes (${v.pctError} % de los viajes)`,
    ...r.costos.filter((c) => c.n > 0).map((c) => `• ${c.k}: ${pesos(Math.round(c.n))}`),
    `*Total por mes: ${pesos(Math.round(r.total))}* · por año: ${pesos(Math.round(r.total * 12))}`,
    `Además: ${num(r.km)} km de más, ${num(r.litros)} L de gasoil, ${num(r.horasPersona)} horas hombre y ${num(r.eventosNpt, 1)} llegadas tarde a operaciones por mes.`,
    ``,
    `Con PicadaGPS (${r.personas} usuarios, ${pesos(Math.round(r.costoApp))} por mes), evitando el ${v.reduccion} % de los errores: ahorro estimado de *${pesos(Math.round(r.ahorro))} por mes*.`,
    `picadagps.ar`
  ].join("\n");
  const informe = async (compartir: boolean) => {
    if (!cli.empresa.trim() && !cli.contacto.trim()) { setPdf("Completá al menos la empresa o el nombre del contacto."); return; }
    if (!mailOk) { setPdf("Revisá el mail del cliente."); return; }
    setPdf("armando");
    try {
      const { crearInforme } = await import("../lib/informe");
      const supuestos = CAMPOS.map((g) => ({ grupo: g.titulo, items: g.items.map(([k, etiqueta, unidad]) => ({ etiqueta, valor: `${(["gasoil", "horaHombre", "desgastePesado", "desgasteLiviano", "costoNpt", "costoIncidente", "penalidad", "precioMes"] as (keyof Vals)[]).includes(k) ? pesos(v[k]) : num(v[k], 2)}${unidad && !unidad.startsWith("$") ? " " + unidad : ""}` })) }));
      const { blob, nombre } = await crearInforme(cli, r, supuestos, v.reduccion, whatsapp);
      const archivo = new File([blob], nombre, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (compartir && nav.share && nav.canShare?.({ files: [archivo] })) {
        await nav.share({ files: [archivo], title: "Informe PicadaGPS", text: `Informe de costos por errores de ubicación · ${cli.empresa || cli.contacto}` }).catch(() => undefined);
      } else {
        const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      }
      setPdf("listo");
    } catch (e) { setPdf("No se pudo armar el PDF: " + (e as Error).message); }
  };

  const copiar = async () => { try { await navigator.clipboard.writeText(resumen); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* nada */ } };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-tenue">Estimación de lo que le cuesta a una empresa no encontrar las locaciones a la primera. Todos los valores son supuestos: cambialos con los datos del cliente. Se guardan en este navegador.</p>

      <section className="rounded-xl border border-linea bg-panel p-3 flex flex-col gap-2">
        <h3 className="text-[14px] font-semibold">Datos del cliente</h3>
        {([["empresa", "Empresa", "text", "Transportes del Sur S.R.L."], ["contacto", "Nombre del contacto", "text", "Juan Pérez"], ["mail", "Mail", "email", "juan@empresa.com"], ["telefono", "Teléfono", "tel", "299 123 4567"]] as [keyof Cliente, string, string, string][]).map(([k, etq, tipo, ej]) => (
          <label key={k} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="shrink-0">{etq}</span>
            <input type={tipo} value={cli[k]} onChange={(e) => cambiarCli(k, e.target.value)} placeholder={ej}
              className={`w-full max-w-[220px] px-2 py-1.5 rounded-md border bg-fondo ${k === "mail" && !mailOk ? "border-alerta" : "border-linea"}`} />
          </label>
        ))}
        <div className="flex gap-2 mt-1">
          <button onClick={() => informe(false)} disabled={pdf === "armando"} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-acento text-acento-texto font-semibold text-[14px] disabled:opacity-60">
            <FileDown className="w-4 h-4" /> {pdf === "armando" ? "Armando el PDF…" : "Descargar informe PDF"}
          </button>
          <button onClick={() => informe(true)} disabled={pdf === "armando"} title="Compartir el PDF (WhatsApp, mail…)" className="px-3 rounded-lg border border-linea disabled:opacity-60"><Share2 className="w-4 h-4" /></button>
        </div>
        {pdf && pdf !== "armando" && <p className={`text-[12px] ${pdf === "listo" ? "text-acento" : "text-alerta"}`}>{pdf === "listo" ? "Informe listo." : pdf}</p>}
      </section>

      <section className="rounded-xl border-2 border-acento bg-panel p-3">
        <p className="text-[13px] text-tenue">Costo mensual de los errores de ubicación</p>
        <p className="num text-[30px] font-bold leading-tight">{pesos(Math.round(r.total))}</p>
        <p className="text-[13px] text-tenue">Por año: <b className="num">{pesos(Math.round(r.total * 12))}</b> · por error: <b className="num">{pesos(Math.round(r.errores ? r.total / r.errores : 0))}</b></p>
        <div className="mt-3 flex flex-col gap-1.5">
          {r.costos.map((c) => (
            <div key={c.k} className="text-[13px]">
              <div className="flex justify-between gap-2"><span>{c.k}</span><span className="num">{pesos(Math.round(c.n))}</span></div>
              <div className="h-2 rounded bg-linea overflow-hidden"><div className="h-full bg-acento" style={{ width: `${(c.n / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[["Errores por mes", num(r.errores)], ["Km de más", num(r.km)], ["Litros de gasoil", num(r.litros)], ["Horas hombre", num(r.horasPersona)],
          ["Llegadas tarde a operaciones", num(r.eventosNpt, 1)], ["Exposición extra en ripio", `${num(r.km)} km`]].map(([k, x]) => (
          <div key={k} className="rounded-lg border border-linea bg-panel p-2.5"><span className="block text-[12px] text-tenue">{k}</span><span className="block num text-[17px] font-semibold">{x}</span></div>
        ))}
      </div>

      <section className="rounded-xl border border-linea bg-panel p-3">
        <h3 className="text-[14px] font-semibold">Con PicadaGPS</h3>
        <div className="grid grid-cols-2 gap-2 mt-2 text-[13px]">
          <div><span className="block text-tenue">Costo de la app ({r.personas} usuarios)</span><b className="num text-[17px]">{pesos(Math.round(r.costoApp))}/mes</b></div>
          <div><span className="block text-tenue">Ahorro estimado ({v.reduccion} % menos errores)</span><b className="num text-[17px] text-acento">{pesos(Math.round(r.ahorro))}/mes</b></div>
          <div><span className="block text-tenue">Ahorro neto</span><b className="num text-[17px]">{pesos(Math.round(r.neto))}/mes</b></div>
          <div><span className="block text-tenue">Retorno</span><b className="num text-[17px]">{r.veces ? `${num(r.veces, 1)} veces lo que cuesta` : "—"}</b></div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={copiar} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-acento text-acento-texto font-semibold text-[14px]"><Copy className="w-4 h-4" /> {copiado ? "Copiado" : "Copiar resumen para el cliente"}</button>
          <button onClick={restablecer} title="Volver a los valores de ejemplo" className="px-3 rounded-lg border border-linea"><RotateCcw className="w-4 h-4" /></button>
        </div>
      </section>

      {CAMPOS.map((g) => (
        <details key={g.titulo} className="rounded-lg border border-linea bg-panel" open={g.titulo === "Flota y viajes"}>
          <summary className="px-3 py-2.5 text-[14px] font-semibold cursor-pointer">{g.titulo}</summary>
          <div className="px-3 pb-3 flex flex-col gap-2">
            {g.items.map(([k, etiqueta, unidad]) => (
              <label key={k} className="flex items-center justify-between gap-3 text-[13px]">
                <span>{etiqueta}{unidad ? <span className="text-tenue"> ({unidad})</span> : null}</span>
                <input type="number" inputMode="decimal" min={0} value={v[k]} onChange={(e) => cambiar(k, e.target.value)}
                  className="w-28 px-2 py-1.5 rounded-md border border-linea bg-fondo text-right num" />
              </label>
            ))}
          </div>
        </details>
      ))}
      <p className="text-[12px] text-tenue">El riesgo HSE es un costo esperado: kilómetros de más por la tasa de incidentes y el costo medio de un incidente. La imagen ante el cliente se refleja en las llegadas tarde y en las penalidades, si el contrato las tiene.</p>
    </div>
  );
}
