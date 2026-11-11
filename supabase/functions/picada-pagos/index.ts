// PicadaGPS · precios y pagos con Mercado Pago (Checkout Pro).
// - POST {accion:"precios"}            → precios en USD y en pesos al dólar del día
// - POST {accion:"crear", plan}         → crea el pago y devuelve el enlace de Mercado Pago
// - POST {accion:"verificar", payment_id} → revisa un pago al volver de Mercado Pago
// - POST ?webhook=1                     → aviso de Mercado Pago (se consulta el pago a su API; nunca se confía en el cuerpo)
// Secretos (Edge Functions → Secrets): MP_ACCESS_TOKEN. Opcional: PICADA_APP_URL.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SUPA = Deno.env.get("SUPABASE_URL")!;
const db = createClient(URL_SUPA, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const MP = Deno.env.get("MP_ACCESS_TOKEN") ?? "";
const APP = (Deno.env.get("PICADA_APP_URL") ?? "https://picadagps.victorparedes.ar").replace(/\/$/, "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
  return { dolar: c, dias_prueba: cfg.dias_prueba, planes: { trimestral: plan(cfg.trimestral_usd, 3), anual: plan(cfg.anual_usd, 12) } };
}

async function usuario(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user ?? null;
}

const sumarMeses = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };

/** Extiende el acceso a partir de la fecha más lejana entre hoy, el plan vigente y la prueba. */
async function extender(user_id: string, meses: number, plan: string) {
  const { data: c } = await db.from("picada_cuentas").select("activo_hasta,prueba_hasta").eq("user_id", user_id).single();
  const base = new Date(Math.max(Date.now(), c?.activo_hasta ? Date.parse(c.activo_hasta) : 0, c?.prueba_hasta ? Date.parse(c.prueba_hasta) : 0));
  const hasta = sumarMeses(base, meses).toISOString();
  await db.from("picada_cuentas").update({ activo_hasta: hasta, plan, bloqueado: false }).eq("user_id", user_id);
  return hasta;
}

/** Consulta el pago en Mercado Pago y, si está aprobado y coincide, habilita el plan (una sola vez). */
async function procesarPago(paymentId: string) {
  if (!MP) throw new Error("Falta configurar MP_ACCESS_TOKEN.");
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${MP}` }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) return { estado: "desconocido" };
  const p = await r.json();
  const ref = String(p.external_reference ?? "");
  const { data: pago } = await db.from("picada_pagos").select("*").eq("id", ref).maybeSingle();
  if (!pago) return { estado: "desconocido" };
  if (pago.estado === "aprobado") return { estado: "aprobado", pago_id: pago.id };

  const coincide = p.currency_id === "ARS" && Number(p.transaction_amount) >= Number(pago.ars) - 1;
  if (p.status === "approved" && coincide) {
    // Marca aprobado solo si todavía no lo estaba: evita sumar dos veces si llegan dos avisos juntos
    const { data: marcado } = await db.from("picada_pagos")
      .update({ estado: "aprobado", mp_payment_id: String(p.id), actualizado: new Date().toISOString() })
      .eq("id", pago.id).neq("estado", "aprobado").select("id");
    if (marcado?.length) await extender(pago.user_id, pago.meses, pago.plan);
    return { estado: "aprobado", pago_id: pago.id };
  }
  const estado = p.status === "approved" ? "revisar_monto" : String(p.status ?? "pendiente");
  await db.from("picada_pagos").update({ estado, mp_payment_id: String(p.id), actualizado: new Date().toISOString() }).eq("id", pago.id);
  return { estado, pago_id: pago.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  try {
    // Aviso de Mercado Pago: llega como ?type=payment&data.id=… o ?topic=payment&id=… o en el cuerpo
    if (url.searchParams.has("webhook")) {
      let cuerpo: any = {};
      try { cuerpo = await req.json(); } catch { /* sin cuerpo */ }
      const tipo = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? cuerpo.type ?? cuerpo.topic;
      const id = url.searchParams.get("data.id") ?? cuerpo?.data?.id ?? url.searchParams.get("id");
      if (tipo === "payment" && id) await procesarPago(String(id));
      return json({ ok: true });
    }

    const b = await req.json().catch(() => ({}));
    if (b.accion === "precios") return json(await precios());

    const u = await usuario(req);
    if (!u) return json({ error: "Ingresá con tu cuenta de Google." }, 401);

    if (b.accion === "crear") {
      if (!MP) return json({ error: "Los pagos todavía no están habilitados. Escribí al administrador." }, 503);
      if (b.plan !== "trimestral" && b.plan !== "anual") return json({ error: "Plan no válido." }, 400);
      const { data: cuenta } = await db.from("picada_cuentas").select("user_id,email").eq("user_id", u.id).maybeSingle();
      if (!cuenta) return json({ error: "Cuenta no encontrada. Volvé a abrir la app." }, 400);
      const pr = await precios();
      const pl = pr.planes[b.plan as "trimestral" | "anual"];
      const { data: pago, error } = await db.from("picada_pagos").insert({
        user_id: u.id, plan: b.plan, meses: pl.meses, usd: pl.usd, ars: pl.ars, cotizacion: pr.dolar.venta, tipo_dolar: pr.dolar.tipo,
      }).select().single();
      if (error) throw error;
      const titulo = b.plan === "anual" ? "PicadaGPS · plan anual (12 meses)" : "PicadaGPS · plan trimestral (3 meses)";
      const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { Authorization: `Bearer ${MP}`, "Content-Type": "application/json", "X-Idempotency-Key": pago.id },
        body: JSON.stringify({
          items: [{ id: b.plan, title: titulo, quantity: 1, currency_id: "ARS", unit_price: pl.ars }],
          payer: { email: cuenta.email },
          external_reference: pago.id,
          notification_url: `${URL_SUPA}/functions/v1/picada-pagos?webhook=1`,
          back_urls: { success: `${APP}/?pago=ok`, failure: `${APP}/?pago=error`, pending: `${APP}/?pago=pendiente` },
          auto_return: "approved",
          statement_descriptor: "PICADAGPS",
        }),
        signal: AbortSignal.timeout(10000),
      });
      const pref = await r.json();
      if (!r.ok) { console.error("mp-preferencia", r.status, JSON.stringify(pref).slice(0, 300)); return json({ error: "Mercado Pago no respondió. Probá de nuevo en unos minutos." }, 502); }
      await db.from("picada_pagos").update({ mp_preference_id: pref.id }).eq("id", pago.id);
      return json({ url: pref.init_point, pago_id: pago.id, ars: pl.ars, usd: pl.usd, dolar: pr.dolar });
    }

    if (b.accion === "verificar") {
      if (!b.payment_id) return json({ error: "Falta el número de pago." }, 400);
      const res = await procesarPago(String(b.payment_id));
      return json(res);
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
