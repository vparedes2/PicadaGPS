// PicadaGPS · precios y pedidos de pago.
// El cobro es manual: el usuario pide el alias por WhatsApp, paga por transferencia y el administrador lo confirma.
// - POST {accion:"precios"}          → precios en USD y en pesos al dólar del día, y el WhatsApp para pedir el alias
// - POST {accion:"solicitar", plan}  → registra el pedido (queda "solicitado" hasta que el administrador lo confirme)
// - POST {accion:"mis_pagos"}        → pedidos y pagos del usuario
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const TIPOS_DOLAR = ["oficial", "blue", "bolsa", "contadoconliqui", "tarjeta", "mayorista"];
async function cotizacion(tipo: string) {
  const t = TIPOS_DOLAR.includes(tipo) ? tipo : "oficial";
  const r = await fetch(`https://dolarapi.com/v1/dolares/${t}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("No se pudo consultar la cotización del dólar. Probá en unos minutos.");
  const d = await r.json();
  const venta = Number(d.venta);
  if (!(venta > 0)) throw new Error("La cotización del dólar no está disponible ahora.");
  return { tipo: t, venta, fecha: d.fechaActualizacion as string, nombre: d.nombre as string };
}

async function precios() {
  const { data: cfg } = await db.from("picada_config").select("*").eq("id", 1).single();
  const c = await cotizacion(cfg.tipo_dolar);
  const plan = (usd: number, meses: number) => ({ usd: Number(usd), meses, ars: Math.ceil(Number(usd) * c.venta) });
  return { dolar: c, dias_prueba: cfg.dias_prueba, whatsapp: cfg.whatsapp, planes: { trimestral: plan(cfg.trimestral_usd, 3), anual: plan(cfg.anual_usd, 12) } };
}

async function usuario(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const b = await req.json().catch(() => ({}));
    if (b.accion === "precios") return json(await precios());

    const u = await usuario(req);
    if (!u) return json({ error: "Ingresá con tu cuenta de Google." }, 401);

    if (b.accion === "solicitar") {
      if (b.plan !== "trimestral" && b.plan !== "anual") return json({ error: "Plan no válido." }, 400);
      const { data: cuenta } = await db.from("picada_cuentas").select("user_id").eq("user_id", u.id).maybeSingle();
      if (!cuenta) return json({ error: "Cuenta no encontrada. Volvé a abrir la app." }, 400);
      const pr = await precios();
      const pl = pr.planes[b.plan as "trimestral" | "anual"];
      const fila = { plan: b.plan, meses: pl.meses, usd: pl.usd, ars: pl.ars, cotizacion: pr.dolar.venta, tipo_dolar: pr.dolar.tipo, medio: "whatsapp", actualizado: new Date().toISOString() };
      // Un solo pedido abierto por usuario: si ya hay uno, se actualiza con el plan y el precio de hoy
      const { data: abierto } = await db.from("picada_pagos").select("id").eq("user_id", u.id).eq("estado", "solicitado").maybeSingle();
      const { data: pago, error } = abierto
        ? await db.from("picada_pagos").update(fila).eq("id", abierto.id).select().single()
        : await db.from("picada_pagos").insert({ ...fila, user_id: u.id, estado: "solicitado" }).select().single();
      if (error) throw error;
      return json({ pago, whatsapp: pr.whatsapp, dolar: pr.dolar });
    }

    if (b.accion === "mis_pagos") {
      const { data } = await db.from("picada_pagos").select("id,plan,usd,ars,cotizacion,tipo_dolar,medio,estado,creado").eq("user_id", u.id).order("creado", { ascending: false }).limit(20);
      return json({ pagos: data ?? [] });
    }

    return json({ error: "Acción no válida." }, 400);
  } catch (e) {
    console.error("picada-pagos", e);
    return json({ error: e instanceof Error ? e.message : "Error inesperado." }, 500);
  }
});
