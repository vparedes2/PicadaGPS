/** Planes con precio en dólares y su equivalente en pesos al dólar del día; el pago sigue en Mercado Pago. */
import { useEffect, useState } from "react";
import { consultarPrecios, crearPago, pesos, NOMBRE_DOLAR, type Precios } from "../lib/cuenta";

export default function Planes() {
  const [p, setP] = useState<Precios | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState<string | null>(null);

  useEffect(() => { consultarPrecios().then(setP).catch((e) => setError(e.message)); }, []);

  const pagar = async (plan: "trimestral" | "anual") => {
    setYendo(plan); setError(null);
    try { const r = await crearPago(plan); location.href = r.url; }
    catch (e) { setError((e as Error).message); setYendo(null); }
  };

  if (error && !p) return <p className="text-[14px] text-alerta">{error}</p>;
  if (!p) return <p className="text-[14px] text-tenue">Consultando el precio del dólar de hoy…</p>;

  const mensualAnual = p.planes.anual.usd / 12;
  const tarjeta = (id: "trimestral" | "anual", titulo: string, detalle: string) => {
    const pl = p.planes[id];
    return (
      <div className={`rounded-xl border p-3 bg-panel flex flex-col gap-1 ${id === "anual" ? "border-acento" : "border-linea"}`}>
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-[15px]">{titulo}</span>
          <span className="num text-[13px] text-tenue">US$ {pl.usd}</span>
        </div>
        <span className="num text-[22px] font-bold">{pesos(pl.ars)}</span>
        <span className="text-[12px] text-tenue">{detalle}</span>
        <button onClick={() => pagar(id)} disabled={!!yendo}
          className="mt-1 py-2.5 rounded-lg bg-acento text-acento-texto font-semibold text-[15px] disabled:opacity-60">
          {yendo === id ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {tarjeta("trimestral", "Trimestral · 3 meses", "Un solo pago, sin renovación automática.")}
      {tarjeta("anual", "Anual · 12 meses", `Equivale a US$ ${mensualAnual.toFixed(2).replace(".", ",")} por mes. Un solo pago.`)}
      <p className="text-[12px] text-tenue">
        Pesos calculados con el dólar {NOMBRE_DOLAR[p.dolar.tipo] ?? p.dolar.tipo} de hoy: {pesos(p.dolar.venta)}
        {p.dolar.fecha && <> (actualizado {new Date(p.dolar.fecha).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})</>}.
        Si ya tenés días disponibles, se suman.
      </p>
      {error && <p className="text-[13px] text-alerta">{error}</p>}
    </div>
  );
}
