/**
 * Portal de empresas (empresas.picadagps.ar o picadagps.ar/empresas):
 * presentación, solicitud de alta y panel del administrador de cada empresa
 * (marca, usuarios y roles, puntos propios con importación de KML, GPX o planilla).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Building2, MapPin, Users, Palette, Upload, Download, Check, Trash2, LogOut, Plus, ExternalLink, WifiOff, ShieldCheck, Search, Share2, Mail } from "lucide-react";
import { supabase, salir, diaLargo, conTiempo } from "../lib/cuenta";
import {
  empresaMia, solicitarEmpresa, guardarEmpresa, guardarMiembro, quitarMiembro, listarPuntos, guardarPunto, importarPuntos, accionPunto,
  leerArchivoPuntos, leerCoordenadas, descargarCsv, prepararLogo, empresasAdmin, elegirEmpresa, crearEmpresa, TIPOS_PUNTO, ROLES, type Rol, type PuntoPropio, type PuntoNuevo
} from "../lib/empresa";
import { BotonGoogle } from "./Ingreso";
import { Leido } from "./PuntoNuevo";

// Texto para compartir la página de empresas (WhatsApp arma la vista previa con el link)
const TEXTO_COMPARTIR = "🚛 PicadaGPS Plan Empresas: que toda tu flota llegue a la locación correcta. Los pozos de la cuenca neuquina + los puntos propios de tu empresa (tranqueras, bases, pads nuevos) en el teléfono de cada chofer, aunque no haya señal.\n\nhttps://picadagps.ar/empresas";

const WHATSAPP = "5492994603071";
const campo = "w-full rounded-lg border border-linea bg-panel px-3 py-2.5 text-[15px] outline-none focus:border-acento";
const boton = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-semibold disabled:opacity-50";
const principal = `${boton} bg-acento text-acento-texto`;
const secundario = `${boton} border border-linea bg-panel`;

function Etiqueta({ t, children }: { t: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1 text-[13px] text-tenue">{t}{children}</label>;
}
function Tarjeta({ titulo, icono, children }: { titulo: string; icono?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-linea bg-panel p-4 flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-[16px] font-bold">{icono}{titulo}</h2>
      {children}
    </section>
  );
}
function Encabezado({ derecha }: { derecha?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 py-3">
      <a href="/" className="text-[20px] font-bold tracking-tight">Picada<span className="text-acento">GPS</span> <span className="text-[14px] font-semibold text-tenue">Empresas</span></a>
      {derecha}
    </header>
  );
}

// ------------------------------------------------------------ presentación
function Presentacion() {
  const ventajas: [ReactNode, string, string][] = [
    [<MapPin className="w-5 h-5" />, "Puntos propios", "Tranqueras, pads nuevos, bases, puntos de encuentro y picadas que no figuran en ningún mapa. Los cargan tus administradores o tus choferes desde el campo."],
    [<Upload className="w-5 h-5" />, "Importás lo que ya tenés", "Subí tu KML de Google Earth, un GPX o una planilla con coordenadas y en un minuto está en el teléfono de toda la flota."],
    [<Users className="w-5 h-5" />, "Usuarios y roles", "Habilitás por dominio de correo (@tuempresa.com.ar) o por lista. Administrador, carga o solo consulta."],
    [<ShieldCheck className="w-5 h-5" />, "Privado", "Tus puntos los ve solo tu gente. Ninguna otra empresa tiene acceso."],
    [<WifiOff className="w-5 h-5" />, "Sin señal", "Los puntos de la empresa se guardan en el teléfono junto con los 33.000 pozos, instalaciones y caminos."],
    [<Palette className="w-5 h-5" />, "Con tu marca", "Nombre, color y mensaje de bienvenida de la empresa dentro de la app."]
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg,#123826,#1f6f4a)" }}>
        <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">Plan Empresa</p>
        <h1 className="text-[28px] leading-tight font-bold mt-1">Toda tu flota llega a la locación correcta.</h1>
        <p className="mt-2 text-[15px] opacity-90">PicadaGPS con los puntos propios de tu empresa, tus usuarios y tu marca. Para transportistas, servicios especiales, mantenimiento y operadoras.</p>
        <a className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-4 py-2.5 text-[15px] font-semibold" href={`https://wa.me/?text=${encodeURIComponent(TEXTO_COMPARTIR)}`} target="_blank" rel="noopener"><Share2 className="w-4 h-4" /> Compartir por WhatsApp</a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ventajas.map(([ic, t, d]) => (
          <div key={t} className="rounded-xl border border-linea bg-panel p-4 flex gap-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-acento text-acento-texto flex items-center justify-center">{ic}</span>
            <span><b className="block text-[15px]">{t}</b><span className="text-[14px] text-tenue">{d}</span></span>
          </div>
        ))}
      </div>
      <Tarjeta titulo="Entrá para pedir el alta o administrar tu empresa">
        <p className="text-[14px] text-tenue">Usá la cuenta de Google del responsable. Después completás los datos de la empresa y te habilitamos.</p>
        <BotonGoogle />
        <a className="text-[14px] text-acento underline text-center" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola Víctor, quiero consultar por el Plan Empresa de PicadaGPS.")}`}>Consultar por WhatsApp</a>
        <a className="text-[14px] text-acento underline text-center inline-flex items-center justify-center gap-1.5" href={`mailto:empresas@picadagps.ar?subject=${encodeURIComponent("Plan Empresa PicadaGPS")}`}><Mail className="w-4 h-4" /> empresas@picadagps.ar</a>
      </Tarjeta>
    </div>
  );
}

// ------------------------------------------------------------ solicitud de alta
function Solicitud({ email, alListo }: { email: string; alListo: () => void }) {
  const [f, setF] = useState({ nombre: "", slug: "", cuit: "", contacto_nombre: "", contacto_tel: "", dominio_email: email.split("@")[1]?.match(/gmail|hotmail|yahoo|outlook|live/) ? "" : email.split("@")[1] ?? "", usuarios_max: "10" });
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState(false);
  const pon = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const slugDe = (n: string) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(s\.?a\.?|s\.?r\.?l\.?|sa|srl|sociedad anonima|transporte[s]?)\b/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  const enviar = async () => {
    setYendo(true); setError(null);
    try { await solicitarEmpresa({ ...f, usuarios_max: Number(f.usuarios_max) || 10 }); alListo(); }
    catch (e) { setError((e as Error).message); }
    setYendo(false);
  };
  return (
    <Tarjeta titulo="Solicitar el alta de tu empresa" icono={<Building2 className="w-5 h-5 text-acento" />}>
      <p className="text-[14px] text-tenue">Quedás como administrador. Revisamos la solicitud y te contactamos para habilitarla.</p>
      <Etiqueta t="Nombre de la empresa"><input className={campo} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value, slug: f.slug && f.slug !== slugDe(f.nombre) ? f.slug : slugDe(e.target.value) })} /></Etiqueta>
      <Etiqueta t="Nombre corto (dirección propia)">
        <div className="flex items-center gap-1"><input className={campo} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /><span className="text-[14px] whitespace-nowrap">.picadagps.ar</span></div>
      </Etiqueta>
      <div className="grid grid-cols-2 gap-3">
        <Etiqueta t="CUIT"><input className={campo} value={f.cuit} onChange={pon("cuit")} inputMode="numeric" /></Etiqueta>
        <Etiqueta t="Usuarios estimados"><input className={campo} value={f.usuarios_max} onChange={pon("usuarios_max")} inputMode="numeric" /></Etiqueta>
      </div>
      <Etiqueta t="Responsable"><input className={campo} value={f.contacto_nombre} onChange={pon("contacto_nombre")} /></Etiqueta>
      <Etiqueta t="Teléfono"><input className={campo} value={f.contacto_tel} onChange={pon("contacto_tel")} inputMode="tel" /></Etiqueta>
      <Etiqueta t="Dominio de correo de la empresa (opcional)">
        <input className={campo} value={f.dominio_email} onChange={pon("dominio_email")} placeholder="tuempresa.com.ar" />
        <span className="text-[12px]">Todos los que entren con un correo de ese dominio quedan habilitados como «solo consulta».</span>
      </Etiqueta>
      {error && <p className="text-[14px] text-alerta">{error}</p>}
      <button className={principal} disabled={yendo || !f.nombre || !f.slug} onClick={enviar}>{yendo ? "Enviando…" : "Enviar solicitud"}</button>
    </Tarjeta>
  );
}

// ------------------------------------------------------------ puntos
function Puntos({ rol }: { rol: Rol }) {
  const [puntos, setPuntos] = useState<PuntoPropio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", tipo: TIPOS_PUNTO[0], coords: "", nota: "" });
  const [import_, setImport] = useState<{ puntos: PuntoNuevo[]; descartados: number; archivo: string } | null>(null);
  const [yendo, setYendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const cargar = useCallback(() => listarPuntos().then((d) => setPuntos(d.puntos)).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);
  const filtrados = useMemo(() => {
    const t = q.toLowerCase().trim();
    return (puntos ?? []).filter((p) => !t || `${p.nombre} ${p.tipo} ${p.nota ?? ""}`.toLowerCase().includes(t));
  }, [puntos, q]);
  const pendientes = (puntos ?? []).filter((p) => p.estado === "pendiente").length;

  const agregar = async () => {
    const c = leerCoordenadas(nuevo.coords);
    if (!c) { setError("Coordenadas no válidas. Pegalas como «-38.1234, -68.5678» o como las copia Google Earth: 38°29'4.21\" S 68°31'34.97\" O."); return; }
    setYendo(true); setError(null);
    try {
      const r = await guardarPunto({ nombre: nuevo.nombre, tipo: nuevo.tipo, nota: nuevo.nota || null, lat: c[0], lon: c[1] });
      setAviso(r.estado === "pendiente" ? "Punto cargado. Queda pendiente hasta que lo apruebe un administrador." : "Punto cargado. Ya lo ve toda la empresa.");
      setNuevo({ ...nuevo, nombre: "", coords: "", nota: "" }); cargar();
    } catch (e) { setError((e as Error).message); }
    setYendo(false);
  };
  const elegirArchivo = async (f?: File) => {
    if (!f) return; setError(null); setAviso(null);
    try { const r = await leerArchivoPuntos(f); setImport({ ...r, archivo: f.name }); }
    catch (e) { setError((e as Error).message); }
    if (archivo.current) archivo.current.value = "";
  };
  const confirmarImport = async () => {
    if (!import_) return; setYendo(true); setError(null);
    try {
      let n = 0;
      for (let i = 0; i < import_.puntos.length; i += 1000) n += (await importarPuntos(import_.puntos.slice(i, i + 1000))).importados;
      setAviso(`Se importaron ${n.toLocaleString("es-AR")} puntos de ${import_.archivo}.`); setImport(null); cargar();
    } catch (e) { setError((e as Error).message); }
    setYendo(false);
  };
  const accion = async (p: PuntoPropio, a: "aprobar" | "borrar") => {
    if (a === "borrar" && !confirm(`¿Borrar «${p.nombre}»?`)) return;
    try { await accionPunto(p.id, a); cargar(); } catch (e) { setError((e as Error).message); }
  };

  if (rol === "lectura") return <p className="text-[14px] text-tenue">Tu usuario es de solo consulta: los puntos de la empresa los ves en la app.</p>;
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta titulo="Agregar un punto" icono={<Plus className="w-5 h-5 text-acento" />}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Etiqueta t="Nombre"><input className={campo} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Tranquera norte Loma Campana" /></Etiqueta>
          <Etiqueta t="Tipo"><select className={campo} value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}>{TIPOS_PUNTO.map((t) => <option key={t}>{t}</option>)}</select></Etiqueta>
        </div>
        <Etiqueta t="Coordenadas: decimales o de Google Earth (grados, minutos y segundos)"><input className={campo} value={nuevo.coords} onChange={(e) => setNuevo({ ...nuevo, coords: e.target.value })} placeholder={`-38.4845, -68.5264  o  38°29'4.21" S 68°31'34.97" O`} /><Leido t={nuevo.coords} /></Etiqueta>
        <Etiqueta t="Nota para el chofer (opcional)"><input className={campo} value={nuevo.nota} onChange={(e) => setNuevo({ ...nuevo, nota: e.target.value })} placeholder="Entrar por la picada que sale del km 12, pedir llave en la base" /></Etiqueta>
        <button className={principal} disabled={yendo || !nuevo.nombre || !nuevo.coords} onClick={agregar}>Guardar punto</button>
        <p className="text-[12px] text-tenue">Desde el campo también se cargan en la app con «Agregar punto acá», usando el GPS del teléfono.</p>
      </Tarjeta>

      <Tarjeta titulo="Importar desde un archivo" icono={<Upload className="w-5 h-5 text-acento" />}>
        <p className="text-[14px] text-tenue">KML de Google Earth, GPX, GeoJSON o planilla CSV con columnas <b>nombre</b>, <b>lat</b>, <b>lon</b> (y si querés <b>tipo</b> y <b>nota</b>). Las carpetas del KML se usan como tipo.</p>
        <input ref={archivo} type="file" accept=".kml,.gpx,.geojson,.json,.csv,.txt,.kmz" className="hidden" onChange={(e) => elegirArchivo(e.target.files?.[0])} />
        {!import_ && <button className={secundario} onClick={() => archivo.current?.click()}><Upload className="w-4 h-4" /> Elegir archivo</button>}
        {import_ && (
          <div className="rounded-lg border border-linea p-3 flex flex-col gap-2 text-[14px]">
            <p><b>{import_.puntos.length.toLocaleString("es-AR")}</b> puntos para importar de <b>{import_.archivo}</b>{import_.descartados > 0 && <> · {import_.descartados} descartados por coordenadas fuera de la zona</>}.</p>
            <ul className="text-tenue text-[13px]">{import_.puntos.slice(0, 5).map((p, i) => <li key={i}>{p.nombre} · {p.tipo} · {p.lat.toFixed(5)}, {p.lon.toFixed(5)}</li>)}{import_.puntos.length > 5 && <li>…</li>}</ul>
            <div className="flex gap-2"><button className={principal} disabled={yendo || !import_.puntos.length} onClick={confirmarImport}>{yendo ? "Importando…" : "Importar"}</button><button className={secundario} onClick={() => setImport(null)}>Cancelar</button></div>
          </div>
        )}
      </Tarjeta>

      {error && <p className="text-[14px] text-alerta">{error}</p>}
      {aviso && <p className="rounded-lg border border-acento bg-panel p-3 text-[14px]">{aviso}</p>}

      <Tarjeta titulo={`Puntos de la empresa${puntos ? ` (${puntos.length.toLocaleString("es-AR")})` : ""}`} icono={<MapPin className="w-5 h-5 text-acento" />}>
        {pendientes > 0 && rol === "admin" && <p className="text-[14px] text-[#b37a00] font-semibold">{pendientes} pendientes de aprobación</p>}
        <div className="flex gap-2">
          <label className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-tenue" /><input className={`${campo} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" /></label>
          {puntos && puntos.length > 0 && <button className={secundario} onClick={() => descargarCsv(puntos, "puntos-empresa.csv")} title="Descargar planilla"><Download className="w-4 h-4" /></button>}
        </div>
        {!puntos ? <p className="text-[14px] text-tenue">Cargando…</p> : !filtrados.length ? <p className="text-[14px] text-tenue">{puntos.length ? "Sin coincidencias." : "Todavía no hay puntos cargados."}</p> : (
          <ul className="divide-y divide-linea">
            {filtrados.slice(0, 300).map((p) => (
              <li key={p.id} className="py-2.5 flex items-start gap-3">
                <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.estado === "pendiente" ? "#e0a100" : "var(--acento)" }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold">{p.nombre}{p.estado === "pendiente" && <span className="ml-2 text-[12px] font-semibold text-[#b37a00]">pendiente</span>}</span>
                  <span className="block text-[13px] text-tenue">{p.tipo} · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}>{p.lat.toFixed(5)}, {p.lon.toFixed(5)}</a>{p.creado_por ? ` · ${p.creado_por}` : ""}</span>
                  {p.nota && <span className="block text-[13px]">{p.nota}</span>}
                </span>
                {rol === "admin" && p.estado === "pendiente" && <button className="p-2 text-acento" title="Aprobar" onClick={() => accion(p, "aprobar")}><Check className="w-5 h-5" /></button>}
                <button className="p-2 text-tenue" title="Borrar" onClick={() => accion(p, "borrar")}><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {filtrados.length > 300 && <p className="text-[13px] text-tenue">Se muestran 300 de {filtrados.length.toLocaleString("es-AR")}. Usá el buscador o descargá la planilla.</p>}
      </Tarjeta>
    </div>
  );
}

// ------------------------------------------------------------ usuarios
function Usuarios({ d, recargar }: { d: any; recargar: () => void }) {
  const [email, setEmail] = useState(""); const [rol, setRol] = useState<Rol>("lectura");
  const [dominio, setDominio] = useState<string>(d.empresa.dominio_email ?? "");
  const [error, setError] = useState<string | null>(null);
  const hacer = async (f: () => Promise<unknown>) => { setError(null); try { await f(); recargar(); } catch (e) { setError((e as Error).message); } };
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta titulo="Habilitar por dominio de correo" icono={<ShieldCheck className="w-5 h-5 text-acento" />}>
        <p className="text-[14px] text-tenue">Si tu empresa tiene correo propio, todos los que entren con ese dominio quedan habilitados como «solo consulta», sin cargarlos uno por uno.</p>
        <div className="flex gap-2"><span className="self-center text-[15px]">@</span><input className={campo} value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="tuempresa.com.ar" />
          <button className={principal} onClick={() => hacer(() => guardarEmpresa({ dominio_email: dominio }))}>Guardar</button></div>
      </Tarjeta>
      <Tarjeta titulo={`Usuarios (${d.miembros.length} de ${d.empresa.usuarios_max})`} icono={<Users className="w-5 h-5 text-acento" />}>
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
          <input className={campo} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@gmail.com" inputMode="email" />
          <select className={campo} value={rol} onChange={(e) => setRol(e.target.value as Rol)}>{(Object.keys(ROLES) as Rol[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}</select>
          <button className={principal} disabled={!email} onClick={() => hacer(async () => { await guardarMiembro(email, rol); setEmail(""); })}>Agregar</button>
        </div>
        <p className="text-[12px] text-tenue">Cada usuario entra a picadagps.ar con ese correo de Google. Administrador: todo. Carga puntos: agrega puntos que quedan pendientes hasta que los aprueba un administrador. Solo consulta: ve los puntos en la app.</p>
        {error && <p className="text-[14px] text-alerta">{error}</p>}
        <ul className="divide-y divide-linea">
          {d.miembros.map((m: any) => (
            <li key={m.email} className="py-2.5 flex items-center gap-2 flex-wrap">
              <span className="flex-1 min-w-[180px]"><span className="block text-[15px] break-all">{m.email}</span>
                <span className="block text-[12px] text-tenue">{m.ultimo_ingreso ? `Último ingreso: ${diaLargo(m.ultimo_ingreso)}` : "Todavía no entró"}</span></span>
              <select className="rounded-lg border border-linea bg-panel px-2 py-1.5 text-[14px]" value={m.rol} onChange={(e) => hacer(() => guardarMiembro(m.email, e.target.value as Rol))}>
                {(Object.keys(ROLES) as Rol[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}</select>
              {m.email !== d.email && <button className="p-2 text-tenue" title="Quitar" onClick={() => confirm(`¿Quitar a ${m.email}?`) && hacer(() => quitarMiembro(m.email))}><Trash2 className="w-4 h-4" /></button>}
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}

// ------------------------------------------------------------ marca y datos
function Marca({ d, recargar }: { d: any; recargar: () => void }) {
  const e = d.empresa;
  const [logo, setLogo] = useState<string | null>(e.logo ?? null);
  const [f, setF] = useState({ nombre: e.nombre ?? "", color: e.color ?? "#1f7a4d", bienvenida: e.bienvenida ?? "", cuit: e.cuit ?? "", contacto_nombre: e.contacto_nombre ?? "", contacto_tel: e.contacto_tel ?? "" });
  const [ok, setOk] = useState<string | null>(null);
  const pon = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: ev.target.value });
  const guardar = async () => { setOk(null); try { await guardarEmpresa({ ...f, logo }); setOk("Guardado. Tu gente lo ve la próxima vez que abra la app con señal."); recargar(); } catch (er) { setOk((er as Error).message); } };
  const elegirLogo = async (fl?: File) => { if (!fl) return; setOk(null); try { setLogo(await prepararLogo(fl)); } catch (er) { setOk((er as Error).message); } };
  return (
    <Tarjeta titulo="Marca y datos de la empresa" icono={<Palette className="w-5 h-5 text-acento" />}>
      <Etiqueta t="Nombre que ve tu gente en la app"><input className={campo} value={f.nombre} onChange={pon("nombre")} /></Etiqueta>
      <Etiqueta t="Logo (PNG, JPG o SVG; mejor cuadrado o apaisado y con fondo transparente)">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="w-16 h-16 rounded-lg border border-linea bg-white flex items-center justify-center overflow-hidden">{logo ? <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" /> : <Building2 className="w-6 h-6 text-tenue" />}</span>
          <label className={`${secundario} cursor-pointer`}><Upload className="w-4 h-4" /> {logo ? "Cambiar logo" : "Subir logo"}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(ev) => elegirLogo(ev.target.files?.[0])} /></label>
          {logo && <button className="text-[13px] underline" onClick={() => setLogo(null)}>Quitar</button>}
        </div>
      </Etiqueta>
      <Etiqueta t="Color"><div className="flex items-center gap-3"><input type="color" value={f.color} onChange={pon("color")} className="w-14 h-10 rounded border border-linea" /><span className="flex items-center gap-2 px-2 py-1 rounded-lg text-white text-[14px] font-semibold" style={{ background: f.color }}>{logo && <img src={logo} alt="" className="h-6 w-auto rounded bg-white p-0.5" />}{f.nombre || "Tu empresa"}</span></div></Etiqueta>
      <Etiqueta t="Mensaje de bienvenida (se ve al abrir la app)"><textarea className={campo} rows={2} maxLength={280} value={f.bienvenida} onChange={pon("bienvenida")} placeholder="Antes de salir, confirmá el acceso con la base. Usá EPP en la locación." /></Etiqueta>
      <div className="grid sm:grid-cols-3 gap-3">
        <Etiqueta t="CUIT"><input className={campo} value={f.cuit} onChange={pon("cuit")} /></Etiqueta>
        <Etiqueta t="Responsable"><input className={campo} value={f.contacto_nombre} onChange={pon("contacto_nombre")} /></Etiqueta>
        <Etiqueta t="Teléfono"><input className={campo} value={f.contacto_tel} onChange={pon("contacto_tel")} /></Etiqueta>
      </div>
      <button className={principal} onClick={guardar}>Guardar</button>
      {ok && <p className="text-[14px]">{ok}</p>}
    </Tarjeta>
  );
}

// ------------------------------------------------------------ administrador general: todas las empresas
const ESTADO_COLOR: Record<string, string> = { activa: "#1f7a4d", pendiente: "#b37a00", suspendida: "#b3261e", rechazada: "#777" };
function TodasLasEmpresas({ alGestionar }: { alGestionar: (id: string) => void }) {
  const [lista, setLista] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [f, setF] = useState({ nombre: "", slug: "", admin_email: "", contacto_nombre: "", contacto_tel: "", cuit: "", dominio_email: "", usuarios_max: "10", dias: "30" });
  const [q, setQ] = useState("");
  const cargar = useCallback(() => empresasAdmin().then(setLista).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);
  const slugDe = (n: string) => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(s\.?a\.?|s\.?r\.?l\.?|sa|srl|transporte[s]?)\b/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  const pon = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const crear = async () => {
    setError(null);
    try { const r = await crearEmpresa({ ...f, usuarios_max: Number(f.usuarios_max) || 10, dias: Number(f.dias) || 0 }); setNueva(false); alGestionar(r.id); }
    catch (e) { setError((e as Error).message); }
  };
  const filtradas = (lista ?? []).filter((e) => !q.trim() || `${e.nombre} ${e.slug} ${e.contacto_email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const acc = (p: Record<string, unknown>) => empresasAdmin(p).then(setLista).catch((e) => setError(e.message));
  const dias = (iso: string | null, d: number) => new Date(Math.max(Date.now(), iso ? Date.parse(iso) : 0) + d * 86400000).toISOString();
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg,#0e1b2a,#1d3a5c)" }}>
        <p className="text-[13px] opacity-80">Administrador general</p>
        <h1 className="text-[26px] font-bold leading-tight">Empresas</h1>
        <p className="text-[14px] opacity-90">{lista ? `${lista.length} empresas · ${lista.filter((e) => e.estado === "activa").length} activas · ${lista.filter((e) => e.estado === "pendiente").length} pendientes` : "Cargando…"}</p>
      </div>
      <div className="flex gap-2">
        <label className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-tenue" /><input className={`${campo} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa" /></label>
        <button className={principal} onClick={() => setNueva(!nueva)}><Plus className="w-4 h-4" /> Nueva empresa</button>
      </div>
      {nueva && (
        <Tarjeta titulo="Alta de empresa" icono={<Building2 className="w-5 h-5 text-acento" />}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Etiqueta t="Nombre de la empresa"><input className={campo} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value, slug: f.slug && f.slug !== slugDe(f.nombre) ? f.slug : slugDe(e.target.value) })} /></Etiqueta>
            <Etiqueta t="Nombre corto"><input className={campo} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /></Etiqueta>
            <Etiqueta t="Correo de Google del responsable (queda como administrador)"><input className={campo} value={f.admin_email} onChange={pon("admin_email")} inputMode="email" placeholder="opcional" /></Etiqueta>
            <Etiqueta t="Responsable"><input className={campo} value={f.contacto_nombre} onChange={pon("contacto_nombre")} /></Etiqueta>
            <Etiqueta t="Teléfono"><input className={campo} value={f.contacto_tel} onChange={pon("contacto_tel")} inputMode="tel" /></Etiqueta>
            <Etiqueta t="CUIT"><input className={campo} value={f.cuit} onChange={pon("cuit")} /></Etiqueta>
            <Etiqueta t="Dominio de correo (opcional)"><input className={campo} value={f.dominio_email} onChange={pon("dominio_email")} placeholder="empresa.com.ar" /></Etiqueta>
            <div className="grid grid-cols-2 gap-3">
              <Etiqueta t="Usuarios máx."><input className={campo} value={f.usuarios_max} onChange={pon("usuarios_max")} inputMode="numeric" /></Etiqueta>
              <Etiqueta t="Días de vigencia"><input className={campo} value={f.dias} onChange={pon("dias")} inputMode="numeric" /></Etiqueta>
            </div>
          </div>
          <p className="text-[12px] text-tenue">Con 0 días queda pendiente; con más días queda activa desde hoy.</p>
          <div className="flex gap-2"><button className={principal} disabled={!f.nombre || !f.slug} onClick={crear}>Crear y gestionar</button><button className={secundario} onClick={() => setNueva(false)}>Cancelar</button></div>
        </Tarjeta>
      )}
      {error && <p className="text-[14px] text-alerta">{error}</p>}
      <ul className="flex flex-col gap-2">
        {filtradas.map((e) => (
          <li key={e.id} className="rounded-xl border border-linea bg-panel p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {e.logo ? <img src={e.logo} alt="" className="h-8 w-auto max-w-[4rem] rounded bg-white p-0.5 object-contain" /> : <span className="w-3 h-3 rounded-full shrink-0" style={{ background: e.color }} />}
                <span className="min-w-0"><b className="block text-[15px] truncate">{e.nombre}</b><span className="block text-[12px] text-tenue truncate">{e.contacto_email || "sin responsable"}{e.contacto_tel ? ` · ${e.contacto_tel}` : ""}</span></span>
              </div>
              <span className="text-[12px] font-semibold uppercase shrink-0" style={{ color: ESTADO_COLOR[e.estado] }}>{e.estado}</span>
            </div>
            <p className="text-[13px] text-tenue">{e.miembros} usuarios de {e.usuarios_max}{e.dominio_email ? ` + @${e.dominio_email}` : ""} · {e.puntos} puntos · {e.activo_hasta ? `hasta el ${diaLargo(e.activo_hasta)}` : "sin vigencia"}</p>
            <div className="flex flex-wrap gap-2 text-[14px]">
              <button className="px-3 py-1.5 rounded-lg bg-acento text-acento-texto font-semibold" onClick={() => alGestionar(e.id)}>Gestionar</button>
              {e.estado !== "activa" && <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => acc({ id: e.id, estado: "activa", activo_hasta: e.activo_hasta && Date.parse(e.activo_hasta) > Date.now() ? e.activo_hasta : dias(null, 30) })}>Activar 30 días</button>}
              {e.estado === "activa" && <>
                <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => acc({ id: e.id, activo_hasta: dias(e.activo_hasta, 30) })}>+30 días</button>
                <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => acc({ id: e.id, activo_hasta: dias(e.activo_hasta, 365) })}>+1 año</button>
                <button className="px-3 py-1.5 rounded-lg border border-linea text-alerta" onClick={() => confirm(`¿Suspender ${e.nombre}?`) && acc({ id: e.id, estado: "suspendida" })}>Suspender</button>
              </>}
              {e.estado === "pendiente" && <button className="px-3 py-1.5 rounded-lg border border-linea" onClick={() => confirm(`¿Rechazar ${e.nombre}?`) && acc({ id: e.id, estado: "rechazada" })}>Rechazar</button>}
            </div>
          </li>
        ))}
        {lista && !filtradas.length && <p className="text-[14px] text-tenue">{lista.length ? "Sin coincidencias." : "Todavía no hay empresas."}</p>}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------ portal
export default function PortalEmpresas() {
  const [d, setD] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"resumen" | "puntos" | "usuarios" | "marca">("resumen");
  const cargar = useCallback(async () => {
    setError(null);
    try {
      const s = (await conTiempo(supabase.auth.getSession(), 10000)).data.session;
      if (!s) { setD({ sesion: false }); return; }
      setD(await empresaMia());
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    document.title = "PicadaGPS Empresas";
    cargar();
    const { data } = supabase.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") setTimeout(cargar, 0); });
    return () => data.subscription.unsubscribe();
  }, [cargar]);
  const cerrar = async () => { await salir(); setD({ sesion: false }); };
  const derecha = d?.sesion ? <button onClick={cerrar} className="flex items-center gap-1.5 text-[13px] text-tenue"><LogOut className="w-4 h-4" /> Salir</button> : null;

  const gestionar = async (id: string | null) => { setError(null); try { await elegirEmpresa(id); setPestana("resumen"); await cargar(); } catch (e) { setError((e as Error).message); } };
  let cuerpo: ReactNode;
  if (error) cuerpo = <div className="flex flex-col gap-3"><p className="text-[15px] text-alerta">{error}</p><button className={secundario} onClick={cargar}>Reintentar</button></div>;
  else if (!d) cuerpo = <p className="text-[15px] text-tenue">Cargando…</p>;
  else if (!d.sesion) cuerpo = <Presentacion />;
  else if (d.superadmin && !d.empresa) cuerpo = <TodasLasEmpresas alGestionar={gestionar} />;
  else if (!d.empresa) cuerpo = (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-tenue">Entraste como <b>{d.email}</b>. Esta cuenta todavía no pertenece a ninguna empresa.</p>
      <Solicitud email={d.email} alListo={cargar} />
      <p className="text-[13px] text-tenue">¿Tu empresa ya usa PicadaGPS? Pedile a su administrador que te agregue con este correo.</p>
    </div>
  );
  else {
    const e = d.empresa; const rol: Rol = d.rol;
    const estado = e.estado === "activa" ? (e.activo_hasta ? `Activa hasta el ${diaLargo(e.activo_hasta)}` : "Activa") : e.estado === "pendiente" ? "Pendiente de aprobación" : e.estado === "suspendida" ? "Suspendida" : "Rechazada";
    const pestanas = (rol === "admin" ? ["resumen", "puntos", "usuarios", "marca"] : rol === "carga" ? ["resumen", "puntos"] : ["resumen"]) as typeof pestana[];
    cuerpo = (
      <div className="flex flex-col gap-4">
        {d.superadmin && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-linea bg-panel px-3 py-2 text-[13px]">
            <span className="text-tenue">Administrador general · gestionando esta empresa</span>
            <button className="font-semibold text-acento" onClick={() => gestionar(null)}>← Todas las empresas</button>
          </div>
        )}
        <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${e.color}, #0f1f17)` }}>
          <p className="text-[13px] opacity-80">{ROLES[rol]} · {d.email}</p>
          <h1 className="text-[26px] font-bold leading-tight flex items-center gap-3">{e.logo && <img src={e.logo} alt="" className="h-10 w-auto rounded-lg bg-white p-1" />}{e.nombre}</h1>
          <p className="text-[14px] opacity-90">{estado}</p>
        </div>
        <nav className="flex gap-1 border-b border-linea overflow-x-auto">
          {pestanas.map((p) => <button key={p} onClick={() => setPestana(p)} className={`px-3 py-2 text-[15px] capitalize whitespace-nowrap ${pestana === p ? "border-b-2 border-acento font-semibold" : "text-tenue"}`}>{p}</button>)}
        </nav>
        {pestana === "resumen" && (
          <div className="flex flex-col gap-4">
            {e.estado === "pendiente" && (
              <Tarjeta titulo="Solicitud recibida">
                <p className="text-[14px]">Ya podés ir cargando los puntos de la empresa y los usuarios. Tu gente los va a ver en la app cuando la empresa quede activa.</p>
                <a className={principal} href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola Víctor, pedí el alta de ${e.nombre} en PicadaGPS Empresas (${d.email}).`)}`}>Avisar por WhatsApp</a>
              </Tarjeta>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["Puntos", d.puntos], ["Pendientes", d.pendientes], ["Usuarios", d.miembros ? `${d.miembros.length} / ${e.usuarios_max}` : "—"], ["Dominio", e.dominio_email ? `@${e.dominio_email}` : "—"]].map(([t, v]) => (
                <div key={t} className="rounded-xl border border-linea bg-panel p-3"><p className="text-[12px] text-tenue">{t}</p><p className="text-[20px] font-bold break-all">{v}</p></div>
              ))}
            </div>
            <Tarjeta titulo="Cómo lo usa tu gente">
              <ol className="list-decimal pl-5 text-[14px] flex flex-col gap-1">
                <li>Entran a <b>picadagps.ar</b> con su cuenta de Google (la que cargaste en Usuarios o una del dominio de la empresa).</li>
                <li>Ven arriba el nombre de {e.nombre} y los puntos de la empresa en el mapa, con color propio, además de todos los pozos e instalaciones.</li>
                <li>Buscan por nombre del punto igual que un pozo, y lo tienen sin señal.</li>
                <li>Con permiso de carga, agregan puntos desde el campo con «Agregar punto acá».</li>
              </ol>
              <a className={secundario} href="https://www.picadagps.ar" target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Abrir la app</a>
            </Tarjeta>
          </div>
        )}
        {pestana === "puntos" && <Puntos rol={rol} />}
        {pestana === "usuarios" && rol === "admin" && <Usuarios d={d} recargar={cargar} />}
        {pestana === "marca" && rol === "admin" && <Marca d={d} recargar={cargar} />}
      </div>
    );
  }
  return (
    <div className="min-h-full bg-fondo overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 pb-10">
        <Encabezado derecha={derecha} />
        {cuerpo}
        <p className="mt-8 text-center text-[12px] text-tenue">Las coordenadas de los puntos propios son responsabilidad de cada empresa. Consultá el mapa siempre con el vehículo detenido.</p>
      </div>
    </div>
  );
}
