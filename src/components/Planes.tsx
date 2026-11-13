/**
 * Planes en pesos (se calculan con el dólar del día, pero al usuario solo se le muestran pesos).
 * El pago es por transferencia: el usuario pide el alias por WhatsApp y el administrador confirma el pago.
 */
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { consultarPrecios, solicitarPlan, pesos, type Precios } from "../lib/cuenta";

export default function Planes({ email, onRevisar }: { email?: string; onRevisar?: () => void }) {
  const [p, setP] = useState<Precios | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState<string | null>(null);
  const [pedido, setPedido] = useState<string | null>(null);

  useEffect(() => { consultarPrecios().then(setP).catch((e) => setError(e.message)); }, []);

  const pedir = async (plan: "trimestral" | "anual") => {
    if (!p) return;
    setYendo(plan); setError(null);
    try {
      const r = await solicitarPlan(plan);
      const nombre = plan === "anual" ? "anual (12 meses)" : "trimestral (3 meses)";
      const texto = `Hola Víctor, quiero el plan ${nombre} de PicadaGPS: ${pesos(Number(r.pago.ars))}. Mi cuenta: ${email ?? ""}. ¿Me pasás el alias para transferir?`;
      setPedido(plan);
      location.href = `https://wa.me/${r.whatsapp}?text=${encodeURIComponent(texto)}`;
    } catch (e) { setError((e as Error).message); }
    setYendo(null);
  };

  if (error && !p) return <p className="text-[14px] text-alerta">{error}</p>;
  if (!p) return <p className="text-[14px] text-tenue">Consultando el precio de hoy…</p>;

  const mensualAnual = p.planes.anual.ars / 12;
  const tarjeta = (id: "trimestral" | "anual", titulo: string, detalle: string) => {
    const pl = p.planes[id];
    return (
      <div className={`rounded-xl border p-3 bg-panel flex flex-col gap-1 ${id === "anual" ? "border-acento" : "border-linea"}`}>
        <span className="font-semibold text-[15px]">{titulo}</span>
        <span className="num text-[22px] font-bold">{pesos(pl.ars)}</span>
        <span className="text-[12px] text-tenue">{detalle}</span>
        <button onClick={() => pedir(id)} disabled={!!yendo}
          className="mt-1 py-2.5 rounded-lg bg-acento text-acento-texto font-semibold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4" /> {yendo === id ? "Abriendo WhatsApp…" : "Pedir alias por WhatsApp"}
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {pedido && (
        <div className="rounded-lg border border-acento bg-panel p-3 text-[14px]">
          <p className="font-semibold">Pedido registrado.</p>
          <p className="text-tenue">Transferí al alias que te pasen por WhatsApp y mandá el comprobante. Cuando se confirme el pago, se habilita tu plan.</p>
          {onRevisar && <button onClick={onRevisar} className="mt-2 py-2 px-3 rounded-lg border border-linea font-semibold">Ya me confirmaron: revisar</button>}
        </div>
      )}
      {tarjeta("trimestral", "Trimestral · 3 meses", "Un solo pago por transferencia, sin renovación automática.")}
      {tarjeta("anual", "Anual · 12 meses", `Equivale a ${pesos(Math.round(mensualAnual))} por mes. Un solo pago.`)}
      <p className="text-[12px] text-tenue">
        Precio de hoy, en pesos. Puede variar de un día a otro.
        Si ya tenés días disponibles, se suman.
      </p>
      {error && <p className="text-[13px] text-alerta">{error}</p>}
    </div>
  );
}
