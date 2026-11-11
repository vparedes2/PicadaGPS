// PicadaGPS · administración. Solo responde a cuentas con rol admin en picada_cuentas.
// Acciones (POST JSON):
//   listar                                   → usuarios, pagos y configuración
//   cuenta     {user_id, cambios}            → activo_hasta, prueba_hasta, bloqueado, nota, plan
//   sumar_dias {user_id, dias, campo}        → suma días a la prueba o al plan
//   pago_manual {user_id, meses, ars, usd, nota} → registra un pago por transferencia/efectivo y extiende el plan
//   config     {dias_prueba, trimestral_usd, anual_usd, tipo_dolar}
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const TIPOS_DOLAR = ["oficial", "blue", "bolsa", "contadoconliqui", "tarjeta", "mayorista"];
const fechaOk = (v: unknown) => v === null || (typeof v === "string" && !Number.isNaN(Date.parse(v)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: ud } = await db.auth.getUser(token);
    if (!ud.user) return json({ error: "Ingresá con tu cuenta." }, 401);
    const { data: yo } = await db.from("picada_cuentas").select("rol").eq("user_id", ud.user.id).maybeSingle();
    if (yo?.rol !== "admin") return json({ error: "Solo el administrador puede hacer esto." }, 403);

    const b = await req.json().catch(() => ({}));

    if (b.accion === "listar") {
      const [cuentas, pagos, config] = await Promise.all([
        db.from("picada_cuentas").select("*").order("creado", { ascending: false }).limit(2000),
        db.from("picada_pagos").select("*").order("creado", { ascending: false }).limit(1000),
        db.from("picada_config").select("*").eq("id", 1).single(),
      ]);
      return json({ cuentas: cuentas.data ?? [], pagos: pagos.data ?? [], config: config.data });
    }

    if (b.accion === "cuenta") {
      const c = b.cambios ?? {};
      const permitido: Record<string, unknown> = {};
      if ("activo_hasta" in c && fechaOk(c.activo_hasta)) permitido.activo_hasta = c.activo_hasta;
      if ("prueba_hasta" in c && fechaOk(c.prueba_hasta) && c.prueba_hasta) permitido.prueba_hasta = c.prueba_hasta;
      if ("bloqueado" in c) permitido.bloqueado = !!c.bloqueado;
      if ("nota" in c) permitido.nota = c.nota ? String(c.nota).slice(0, 500) : null;
      if ("plan" in c) permitido.plan = c.plan ? String(c.plan).slice(0, 40) : null;
      if (b.user_id === ud.user.id && permitido.bloqueado) return json({ error: "No podés bloquear tu propia cuenta." }, 400);
      const { data, error } = await db.from("picada_cuentas").update(permitido).eq("user_id", b.user_id).select().single();
      if (error) throw error;
      return json({ cuenta: data });
    }

    if (b.accion === "sumar_dias") {
      const dias = Math.round(Number(b.dias));
      if (!Number.isFinite(dias) || Math.abs(dias) > 3650) return json({ error: "Cantidad de días no válida." }, 400);
      const campo = b.campo === "prueba_hasta" ? "prueba_hasta" : "activo_hasta";
      const { data: c } = await db.from("picada_cuentas").select("activo_hasta,prueba_hasta").eq("user_id", b.user_id).single();
      const actual = c?.[campo] ? Date.parse(c[campo]) : 0;
      const base = Math.max(Date.now(), actual);
      const nuevo = new Date(base + dias * 86400000).toISOString();
      const { data, error } = await db.from("picada_cuentas").update({ [campo]: nuevo, ...(campo === "activo_hasta" ? { plan: "cortesía" } : {}) }).eq("user_id", b.user_id).select().single();
      if (error) throw error;
      return json({ cuenta: data });
    }

    if (b.accion === "pago_manual") {
      const meses = Math.round(Number(b.meses));
      if (!(meses >= 1 && meses <= 36)) return json({ error: "Meses no válidos." }, 400);
      const { data: c } = await db.from("picada_cuentas").select("activo_hasta,prueba_hasta").eq("user_id", b.user_id).single();
      const base = new Date(Math.max(Date.now(), c?.activo_hasta ? Date.parse(c.activo_hasta) : 0, c?.prueba_hasta ? Date.parse(c.prueba_hasta) : 0));
      base.setMonth(base.getMonth() + meses);
      await db.from("picada_pagos").insert({
        user_id: b.user_id, plan: "manual", meses, usd: Number(b.usd) || 0, ars: Number(b.ars) || 0, cotizacion: 0, tipo_dolar: "-",
        medio: String(b.nota || "manual").slice(0, 80), estado: "aprobado",
      });
      const { data, error } = await db.from("picada_cuentas").update({ activo_hasta: base.toISOString(), plan: meses >= 12 ? "anual" : "trimestral", bloqueado: false }).eq("user_id", b.user_id).select().single();
      if (error) throw error;
      return json({ cuenta: data });
    }

    if (b.accion === "config") {
      const c: Record<string, unknown> = { actualizado: new Date().toISOString() };
      if (b.dias_prueba != null) { const d = Math.round(Number(b.dias_prueba)); if (d >= 0 && d <= 90) c.dias_prueba = d; }
      if (b.trimestral_usd != null && Number(b.trimestral_usd) > 0) c.trimestral_usd = Number(b.trimestral_usd);
      if (b.anual_usd != null && Number(b.anual_usd) > 0) c.anual_usd = Number(b.anual_usd);
      if (b.tipo_dolar && TIPOS_DOLAR.includes(b.tipo_dolar)) c.tipo_dolar = b.tipo_dolar;
      const { data, error } = await db.from("picada_config").update(c).eq("id", 1).select().single();
      if (error) throw error;
      return json({ config: data });
    }

    return json({ error: "Acción no válida." }, 400);
  } catch (e) {
    console.error("picada-admin", e);
    return json({ error: e instanceof Error ? e.message : "Error inesperado." }, 500);
  }
});
