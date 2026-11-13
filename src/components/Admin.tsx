/** Administración de PicadaGPS: usuarios, pagos y precios. Todo pasa por la función picada-admin (verifica el rol). */
import { useEffect, useMemo, useState } from "react";
import { X, Search, RefreshCw } from "lucide-react";
import { admin, pesos, NOMBRE_DOLAR } from "../lib/cuenta";
import Simulador from "./Simulador";

interface CuentaAdm {
  user_id: string; email: string; nombre: string | null; rol: string; creado: string; prueba_hasta: string;
  activo_hasta: string | null; plan: string | null; bloqueado: boolean; nota: string | null; ultimo_ingreso: string | null;
}
interface Pago { id: string; user_id: string; plan: string; meses: number; usd: number; ars: number; cotizacion: number; tipo_dolar: string; medio: string; estado: string; creado: string; mp_payment_id: string | null }
interface Config { dias_prueba: number; trimestral_usd: number; anual_usd: number; tipo_dolar: string; whatsapp: string; limite_dispositivos: number }
interface Disp { user_id: string; dispositivo: string; nombre: string | null; creado: string; ultimo: string }

const ahora = () => Date.now();
const estadoDe = (c: CuentaAdm) =>
  c.rol === "admin" ? "admin"
  : c.bloqueado ? "bloqueado"
  : c.activo_hasta && Date.parse(c.activo_hasta) > ahora() ? "activo"
  : Date.parse(c.prueba_hasta) > ahora() ? "prueba" : "vencido";
const COLOR: Record<string, string> = { admin: "text-acento", activo: "text-acento", prueba: "text-instalacion", vencido: "text-tenue", bloqueado: "text-alerta" };
const corta = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");
const Boton = ({ children, onClick, peligro }: { children: React.ReactNode; onClick: () => void; peligro?: boolean }) => (
  <button onClick={onClick} className={`px-2.5 py-1.5 rounded-md border text-[13px] ${peligro ? "border-alerta text-alerta" : "border-linea bg-fondo"}`}>{children}</button>
);

function FilaUsuario({ c, pagos, disps, onCambio, onPago, onDisps }: { c: CuentaAdm; pagos: Pago[]; disps: Disp[]; onCambio: (c: CuentaAdm) => void; onPago: (p: Pago) => void; onDisps: (user_id: string, quedan: Disp[]) => void }) {
  const [abierta, setAbierta] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState((c.activo_hasta ?? "").slice(0, 10));
  const [nota, setNota] = useState(c.nota ?? "");
  const e = estadoDe(c);
  const hacer = async (accion: string, datos: Record<string, unknown>) => {
    setOcupado(true); setError(null);
    try {
      const r = await admin<{ cuenta?: CuentaAdm; pago?: Pago; dispositivos?: Disp[] }>(accion, { user_id: c.user_id, ...datos });
      if (r.cuenta) { onCambio(r.cuenta); setFecha((r.cuenta.activo_hasta ?? "").slice(0, 10)); }
      if (r.pago) onPago(r.pago);
      if (r.dispositivos) onDisps(c.user_id, r.dispositivos);
    }
    catch (x) { setError((x as Error).message); }
    setOcupado(false);
  };
  const manual = (meses: number) => {
    const ars = prompt(`Plan de ${meses} meses cobrado aparte (transferencia, efectivo). ¿Cuántos pesos se cobraron?`, "0");
    if (ars === null) return;
    hacer("pago_manual", { meses, ars: Number(ars.replace(/\./g, "").replace(",", ".")) || 0, nota: "manual" });
  };
  const suyos = pagos.filter((p) => p.user_id === c.user_id);
  const pendiente = suyos.find((p) => p.estado === "solicitado");
  const misDisps = disps.filter((x) => x.user_id === c.user_id);

  return (
    <li className="text-[14px]">
      <button onClick={() => setAbierta(!abierta)} className="w-full text-left p-3 flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{c.nombre || c.email}</span>
          <span className="block truncate text-[12px] text-tenue">{c.email} · desde {corta(c.creado)} · último ingreso {corta(c.ultimo_ingreso)}</span>
        </span>
        <span className="text-right shrink-0">
          <span className={`block text-[13px] font-semibold ${COLOR[e]}`}>{e}</span>
          <span className="block text-[12px] text-tenue num">{e === "prueba" ? corta(c.prueba_hasta) : corta(c.activo_hasta)}</span>
          {pendiente && <span className="block text-[11px] font-semibold text-pozo">pidió plan</span>}
        </span>
      </button>
      {abierta && (
        <div className={`px-3 pb-3 flex flex-col gap-2 ${ocupado ? "opacity-60 pointer-events-none" : ""}`}>
          <p className="text-[12px] text-tenue">Prueba hasta {corta(c.prueba_hasta)} · plan {c.plan ?? "—"} hasta {corta(c.activo_hasta)}</p>
          {pendiente && (
            <div className="rounded-md border border-pozo p-2 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="flex-1 min-w-[180px]">Pidió el plan <b>{pendiente.plan}</b> el {corta(pendiente.creado)}: {pesos(Number(pendiente.ars))} (US$ {pendiente.usd})</span>
              <Boton onClick={() => confirm(`¿Confirmás que recibiste ${pesos(Number(pendiente.ars))} de ${c.email}?`) && hacer("confirmar_pago", { pago_id: pendiente.id })}>Confirmar pago</Boton>
              <Boton peligro onClick={() => hacer("rechazar_pago", { pago_id: pendiente.id })}>Rechazar</Boton>
            </div>
          )}
          {c.rol !== "admin" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                <Boton onClick={() => hacer("sumar_dias", { dias: 7, campo: "prueba_hasta" })}>+7 días de prueba</Boton>
                <Boton onClick={() => hacer("sumar_dias", { dias: 30, campo: "activo_hasta" })}>+30 días de cortesía</Boton>
                <Boton onClick={() => manual(3)}>Cobré 3 meses</Boton>
                <Boton onClick={() => manual(12)}>Cobré 12 meses</Boton>
                {c.bloqueado
                  ? <Boton onClick={() => hacer("cuenta", { cambios: { bloqueado: false } })}>Desbloquear</Boton>
                  : <Boton peligro onClick={() => confirm(`¿Bloquear a ${c.email}? No va a poder usar la app.`) && hacer("cuenta", { cambios: { bloqueado: true } })}>Bloquear</Boton>}
              </div>
              <label className="flex items-center gap-2 text-[13px]">Acceso hasta
                <input type="date" value={fecha} onChange={(x) => setFecha(x.target.value)} className="px-2 py-1 rounded-md border border-linea bg-fondo" />
                <Boton onClick={() => hacer("cuenta", { cambios: { activo_hasta: fecha ? new Date(`${fecha}T23:59:00-03:00`).toISOString() : null } })}>Guardar</Boton>
              </label>
            </>
          )}
          <div className="text-[13px]">
            <span className="text-tenue">Teléfonos ({misDisps.length}):</span>
            {misDisps.length ? (
              <ul className="mt-1 flex flex-col gap-1">
                {misDisps.map((x) => (
                  <li key={x.dispositivo} className="flex items-center gap-2">
                    <span className="flex-1">{x.nombre || "Teléfono"} · último uso {corta(x.ultimo)}</span>
                    <Boton onClick={() => hacer("liberar_dispositivo", { dispositivo: x.dispositivo })}>Liberar</Boton>
                  </li>
                ))}
              </ul>
            ) : <span className="text-tenue"> ninguno todavía</span>}
          </div>
          <label className="flex items-center gap-2 text-[13px]">Nota
            <input value={nota} onChange={(x) => setNota(x.target.value)} placeholder="empresa, teléfono…" className="flex-1 px-2 py-1 rounded-md border border-linea bg-fondo" />
            <Boton onClick={() => hacer("cuenta", { cambios: { nota } })}>Guardar</Boton>
          </label>
          {suyos.length > 0 && (
            <ul className="text-[12px] text-tenue">
              {suyos.map((p) => <li key={p.id}>{corta(p.creado)} · {p.plan} · {pesos(Number(p.ars))} · {p.medio} · {p.estado}</li>)}
            </ul>
          )}
          {error && <p className="text-[13px] text-alerta">{error}</p>}
        </div>
      )}
    </li>
  );
}

function Precios({ config, onGuardado }: { config: Config; onGuardado: (c: Config) => void }) {
  const [c, setC] = useState(config);
  const [msj, setMsj] = useState<string | null>(null);
  const guardar = async () => {
    setMsj(null);
    try { const r = await admin<{ config: Config }>("config", { ...c }); onGuardado(r.config); setMsj("Guardado."); }
    catch (e) { setMsj((e as Error).message); }
  };
  const campo = (k: keyof Config, etiqueta: string) => (
    <label className="flex items-center justify-between gap-3 text-[14px]">{etiqueta}
      <input type="number" min={0} value={c[k] as number} onChange={(e) => setC({ ...c, [k]: Number(e.target.value) })}
        className="w-28 px-2 py-1.5 rounded-md border border-linea bg-fondo text-right num" />
    </label>
  );
  return (
    <div className="rounded-lg border border-linea bg-panel p-3 flex flex-col gap-3">
      {campo("dias_prueba", "Días de prueba gratis")}
      {campo("trimestral_usd", "Plan trimestral (US$)")}
      {campo("anual_usd", "Plan anual (US$)")}
      {campo("limite_dispositivos", "Teléfonos por cuenta")}
      <label className="flex items-center justify-between gap-3 text-[14px]">Dólar para pasar a pesos
        <select value={c.tipo_dolar} onChange={(e) => setC({ ...c, tipo_dolar: e.target.value })} className="px-2 py-1.5 rounded-md border border-linea bg-fondo">
          {Object.entries(NOMBRE_DOLAR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 text-[14px]">WhatsApp para pedir el alias
        <input value={c.whatsapp} onChange={(e) => setC({ ...c, whatsapp: e.target.value })} inputMode="tel" placeholder="5492994603071"
          className="w-40 px-2 py-1.5 rounded-md border border-linea bg-fondo text-right num" />
      </label>
      <p className="text-[12px] text-tenue">El WhatsApp va con código de país y sin el 15: 549 + característica + número.</p>
      <p className="text-[12px] text-tenue">Los cambios valen para pagos y cuentas nuevas. La prueba de los usuarios que ya entraron no cambia.</p>
      <button onClick={guardar} className="py-2.5 rounded-lg bg-acento text-acento-texto font-semibold">Guardar precios</button>
      {msj && <p className="text-[13px]">{msj}</p>}
    </div>
  );
}

type Est = {
  nuevosHoy: number; nuevos7: number; nuevos30: number; activos24: number; activos7: number;
  porDia: { dia: Date; n: number }[]; ultimoIngreso: { k: string; n: number }[]; vencenPronto: CuentaAdm[]; fin: (c: CuentaAdm) => number;
  conversion: number | null; pagaron: number; terminaron: number; sinPagar: number; ticket: number; telefonos: number; usuarios: number;
};

function Barras({ datos, etiqueta }: { datos: { k: string; n: number }[]; etiqueta?: (i: number) => boolean }) {
  const max = Math.max(1, ...datos.map((x) => x.n));
  return (
    <div className="flex items-end gap-1 h-36 pt-4">
      {datos.map((x, i) => (
        <div key={x.k + i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1">
          <span className="num text-[11px] text-tenue">{x.n || ""}</span>
          <div className="w-full rounded-t bg-acento" style={{ height: `${(x.n / max) * 100}%`, minHeight: x.n ? 3 : 1, opacity: x.n ? 1 : 0.25 }} />
          <span className="text-[10px] text-tenue truncate w-full text-center">{!etiqueta || etiqueta(i) ? x.k : "\u00a0"}</span>
        </div>
      ))}
    </div>
  );
}

function Estadisticas({ e, alVer }: { e: Est; alVer: (filtro: string) => void }) {
  const tarjeta = (k: string, v: string | number, sub?: string) => (
    <div key={k} className="rounded-lg border border-linea bg-panel p-2.5">
      <span className="block text-[12px] text-tenue">{k}</span>
      <span className="block num text-[18px] font-semibold">{v}</span>
      {sub && <span className="block text-[11px] text-tenue">{sub}</span>}
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tarjeta("Nuevos hoy", e.nuevosHoy)}
        {tarjeta("Nuevos 7 días", e.nuevos7)}
        {tarjeta("Nuevos 30 días", e.nuevos30)}
        {tarjeta("Activos últimas 24 h", e.activos24, `de ${e.usuarios} usuarios`)}
        {tarjeta("Activos 7 días", e.activos7)}
        {tarjeta("Conversión", e.conversion == null ? "—" : `${e.conversion} %`, e.terminaron ? `${e.pagaron} ${e.pagaron === 1 ? "pagó" : "pagaron"} · ${e.sinPagar} ${e.sinPagar === 1 ? "venció" : "vencieron"} sin pagar` : "todavía no terminó ninguna prueba")}
        {tarjeta("Pago promedio", e.ticket ? pesos(Math.round(e.ticket)) : "—")}
        {tarjeta("Celulares en uso", e.telefonos, "dispositivos con la app")}
        {tarjeta("Vencen en 2 días", e.vencenPronto.length)}
      </div>

      <section className="rounded-lg border border-linea bg-panel p-3">
        <h3 className="text-[14px] font-semibold">Usuarios nuevos por día</h3>
        <p className="text-[12px] text-tenue">Últimos 14 días</p>
        <Barras datos={e.porDia.map((x) => ({ k: x.dia.toLocaleDateString("es-AR", { day: "numeric", month: "numeric" }), n: x.n }))} etiqueta={(i) => i % 2 === 1 || i === 13} />
      </section>

      <section className="rounded-lg border border-linea bg-panel p-3">
        <h3 className="text-[14px] font-semibold">Último ingreso</h3>
        <p className="text-[12px] text-tenue">Hace cuánto abrió la app cada usuario</p>
        <Barras datos={e.ultimoIngreso} />
      </section>

      <section className="rounded-lg border border-linea bg-panel p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold">Vencen en los próximos 2 días</h3>
          {e.vencenPronto.length > 0 && <button onClick={() => alVer("vencen pronto")} className="text-[13px] underline">Ver en usuarios</button>}
        </div>
        {e.vencenPronto.length ? (
          <ul className="mt-1 divide-y divide-linea text-[13px]">
            {e.vencenPronto.slice(0, 15).map((c) => (
              <li key={c.user_id} className="py-1.5 flex justify-between gap-2">
                <span className="truncate">{c.nombre || c.email}</span>
                <span className="num text-tenue shrink-0">{new Date(e.fin(c)).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-[13px] text-tenue mt-1">Nadie por ahora.</p>}
        <p className="text-[12px] text-tenue mt-2">A ellos la app ya les muestra el aviso de vencimiento.</p>
      </section>
    </div>
  );
}

export default function Admin({ onCerrar }: { onCerrar: () => void }) {
  const [d, setD] = useState<{ cuentas: CuentaAdm[]; pagos: Pago[]; config: Config; dispositivos: Disp[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"estadísticas" | "usuarios" | "pagos" | "precios" | "simulador">("estadísticas");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const cargar = () => { setError(null); admin("listar").then(setD).catch((e) => setError(e.message)); };
  useEffect(cargar, []);

  const resumen = useMemo(() => {
    if (!d) return null;
    const n: Record<string, number> = { prueba: 0, activo: 0, vencido: 0, bloqueado: 0, admin: 0 };
    d.cuentas.forEach((c) => n[estadoDe(c)]++);
    const aprobados = d.pagos.filter((p) => p.estado === "aprobado");
    const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
    return {
      n, total: d.cuentas.length,
      cobrado: aprobados.reduce((s, p) => s + Number(p.ars), 0),
      pedidos: d.pagos.filter((p) => p.estado === "solicitado").length,
      cobradoMes: aprobados.filter((p) => Date.parse(p.creado) >= +mes).reduce((s, p) => s + Number(p.ars), 0)
    };
  }, [d]);

  // Estadísticas de uso: altas por día, actividad, vencimientos próximos y conversión
  const est = useMemo(() => {
    if (!d) return null;
    const DIA = 86400000, ahora = Date.now();
    const inicioDia = (t: number) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return +x; };
    const hoy0 = inicioDia(ahora);
    const usuarios = d.cuentas.filter((c) => c.rol !== "admin");
    const nuevos = (dias: number) => usuarios.filter((c) => Date.parse(c.creado) >= hoy0 - (dias - 1) * DIA).length;
    const activos = (h: number) => usuarios.filter((c) => c.ultimo_ingreso && ahora - Date.parse(c.ultimo_ingreso) < h * 3600000).length;
    const porDia = Array.from({ length: 14 }, (_, i) => {
      const desde = hoy0 - (13 - i) * DIA;
      return { dia: new Date(desde), n: usuarios.filter((c) => { const t = Date.parse(c.creado); return t >= desde && t < desde + DIA; }).length };
    });
    const tramos = [["Hoy", 0, 1], ["1 a 3 días", 1, 4], ["4 a 7 días", 4, 8], ["Más de 7 días", 8, 99999]] as const;
    const ultimoIngreso = tramos.map(([k, a, b]) => ({ k, n: usuarios.filter((c) => { const dd = c.ultimo_ingreso ? Math.floor((hoy0 + DIA - Date.parse(c.ultimo_ingreso)) / DIA) : 99999; return dd >= a && dd < b; }).length }));
    const fin = (c: CuentaAdm) => (c.activo_hasta && Date.parse(c.activo_hasta) > ahora ? Date.parse(c.activo_hasta) : Date.parse(c.prueba_hasta));
    const vencenPronto = usuarios.filter((c) => !c.bloqueado && fin(c) > ahora && fin(c) - ahora <= 2 * DIA).sort((a, b) => fin(a) - fin(b));
    const pagaron = new Set(d.pagos.filter((p) => p.estado === "aprobado").map((p) => p.user_id));
    // Decidieron: pagaron (en cualquier momento) o se les terminó la prueba sin pagar
    const sinPagar = usuarios.filter((c) => Date.parse(c.prueba_hasta) <= ahora && !pagaron.has(c.user_id)).length;
    const terminaron = { length: pagaron.size + sinPagar };
    const aprobados = d.pagos.filter((p) => p.estado === "aprobado" && Number(p.ars) > 0);
    return {
      nuevosHoy: nuevos(1), nuevos7: nuevos(7), nuevos30: nuevos(30), activos24: activos(24), activos7: activos(24 * 7),
      porDia, ultimoIngreso, vencenPronto, fin,
      conversion: terminaron.length ? Math.round((pagaron.size / terminaron.length) * 100) : null,
      pagaron: pagaron.size, terminaron: terminaron.length, sinPagar,
      ticket: aprobados.length ? aprobados.reduce((x, p) => x + Number(p.ars), 0) / aprobados.length : 0,
      telefonos: d.dispositivos.length, usuarios: usuarios.length
    };
  }, [d]);

  const lista = useMemo(() => {
    if (!d) return [];
    const t = q.trim().toLowerCase();
    const pronto = new Set(est?.vencenPronto.map((c) => c.user_id) ?? []);
    return d.cuentas.filter((c) => (filtro === "todos" || (filtro === "vencen pronto" ? pronto.has(c.user_id) : estadoDe(c) === filtro)) && (!t || `${c.email} ${c.nombre ?? ""} ${c.nota ?? ""}`.toLowerCase().includes(t)));
  }, [d, q, filtro, est]);

  const email = (id: string) => d?.cuentas.find((c) => c.user_id === id)?.email ?? id.slice(0, 8);
  const cambio = (nueva: CuentaAdm) => setD((x) => x && { ...x, cuentas: x.cuentas.map((c) => (c.user_id === nueva.user_id ? nueva : c)) });
  const cambioDisps = (user_id: string, quedan: Disp[]) => setD((x) => x && { ...x, dispositivos: [...x.dispositivos.filter((y) => y.user_id !== user_id), ...quedan] });
  const cambioPago = (p: Pago) => setD((x) => x && { ...x, pagos: x.pagos.map((y) => (y.id === p.id ? p : y)) });
  const [ocupado, setOcupado] = useState<string | null>(null);
  const accionPago = async (accion: "confirmar_pago" | "rechazar_pago", p: Pago) => {
    if (accion === "confirmar_pago" && !confirm(`¿Confirmás que recibiste ${pesos(Number(p.ars))} de ${email(p.user_id)}?`)) return;
    setOcupado(p.id);
    try { const r = await admin<{ cuenta?: CuentaAdm; pago: Pago }>(accion, { pago_id: p.id }); cambioPago(r.pago); if (r.cuenta) cambio(r.cuenta); }
    catch (e) { alert((e as Error).message); }
    setOcupado(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-fondo overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-bold">Administración</h1>
          <div className="flex items-center">
            <button onClick={cargar} aria-label="Actualizar" className="p-2"><RefreshCw className="w-5 h-5" /></button>
            <button onClick={onCerrar} aria-label="Cerrar" className="p-2"><X className="w-5 h-5" /></button>
          </div>
        </div>
        {error && <p className="text-[14px] text-alerta">{error}</p>}
        {!d && !error && <p className="text-[14px] text-tenue">Cargando…</p>}
        {d && resumen && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[["Pedidos por confirmar", resumen.pedidos], ["Usuarios", resumen.total.toLocaleString("es-AR")], ["En prueba", resumen.n.prueba], ["Con plan", resumen.n.activo], ["Vencidos", resumen.n.vencido],
                ["Cobrado este mes", pesos(resumen.cobradoMes)], ["Cobrado total", pesos(resumen.cobrado)], ["Bloqueados", resumen.n.bloqueado]].map(([k, v]) => (
                <div key={k as string} className="rounded-lg border border-linea bg-panel p-2.5">
                  <span className="block text-[12px] text-tenue">{k}</span><span className="block num text-[18px] font-semibold">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1 border-b border-linea overflow-x-auto">
              {(["estadísticas", "usuarios", "pagos", "precios", "simulador"] as const).map((p) => (
                <button key={p} onClick={() => setPestana(p)} className={`px-3 py-2 text-[14px] capitalize whitespace-nowrap ${pestana === p ? "border-b-2 border-acento font-semibold" : "text-tenue"}`}>{p}</button>
              ))}
            </div>
            {pestana === "simulador" && <Simulador />}
            {pestana === "estadísticas" && est && <Estadisticas e={est} alVer={(f) => { setFiltro(f); setPestana("usuarios"); }} />}
            {pestana === "usuarios" && (
              <>
                <div className="flex gap-2">
                  <label className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-tenue" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por mail, nombre o nota" className="w-full pl-8 pr-2 py-2 rounded-lg border border-linea bg-panel text-[14px]" />
                  </label>
                  <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-2 rounded-lg border border-linea bg-panel text-[14px]">
                    {["todos", "vencen pronto", "prueba", "activo", "vencido", "bloqueado", "admin"].map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea">
                  {lista.map((c) => <FilaUsuario key={c.user_id} c={c} pagos={d.pagos} disps={d.dispositivos ?? []} onCambio={cambio} onPago={cambioPago} onDisps={cambioDisps} />)}
                  {!lista.length && <li className="p-3 text-[14px] text-tenue">Sin usuarios con ese filtro.</li>}
                </ul>
              </>
            )}
            {pestana === "pagos" && (
              <div className="rounded-lg border border-linea bg-panel overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="text-left text-tenue"><tr>{["Fecha", "Usuario", "Plan", "US$", "Pesos", "Dólar", "Medio", "Estado"].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-linea">
                    {d.pagos.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2 whitespace-nowrap">{corta(p.creado)}</td><td className="p-2">{email(p.user_id)}</td><td className="p-2">{p.plan}</td>
                        <td className="p-2 num">{p.usd}</td><td className="p-2 num whitespace-nowrap">{pesos(Number(p.ars))}</td>
                        <td className="p-2 num whitespace-nowrap">{p.cotizacion ? `${p.tipo_dolar} ${pesos(Number(p.cotizacion))}` : "—"}</td>
                        <td className="p-2">{p.medio}</td>
                        <td className={`p-2 ${p.estado === "aprobado" ? "text-acento font-semibold" : p.estado === "solicitado" ? "text-pozo font-semibold" : ""}`}>
                          {p.estado}
                          {p.estado === "solicitado" && (
                            <span className={`flex gap-1 mt-1 ${ocupado === p.id ? "opacity-50 pointer-events-none" : ""}`}>
                              <Boton onClick={() => accionPago("confirmar_pago", p)}>Confirmar</Boton>
                              <Boton peligro onClick={() => accionPago("rechazar_pago", p)}>Rechazar</Boton>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!d.pagos.length && <tr><td colSpan={8} className="p-3 text-tenue">Todavía no hay pagos.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {pestana === "precios" && <Precios config={d.config} onGuardado={(config) => setD({ ...d, config })} />}
          </>
        )}
      </div>
    </div>
  );
}
