import { useEffect, useMemo, useState } from "react";
import { Search, Satellite, Map as MapaIcono, Star, Clock, WifiOff, Info, Factory, X, Crosshair, UserRound, Layers, Share2 } from "lucide-react";
import { compartirWhatsApp } from "./lib/compartir";
import Mapa from "./components/Mapa";
import Ficha from "./components/Ficha";
import { useDatos, esPozo, nombreDe, type Datos, type Pozo, type Instalacion } from "./lib/datos";
import { buscarPorPartes, buscarAreas } from "./lib/buscar";
import { rutaMasCercana } from "./lib/geo";
import type { Linea } from "./components/Mapa";
import { useLista } from "./lib/guardado";
import type { Acceso } from "./lib/cuenta";
import Cuenta, { textoEstado } from "./components/Cuenta";

function useEnLinea() {
  const [en, setEn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setEn(true), b = () => setEn(false);
    addEventListener("online", a); addEventListener("offline", b);
    return () => { removeEventListener("online", a); removeEventListener("offline", b); };
  }, []);
  return en;
}

const fecha = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "sin dato");

function Fila({ x, onClick, derecha }: { x: Pozo | Instalacion; onClick: () => void; derecha?: React.ReactNode }) {
  return (
    <li className="flex items-center">
      <button onClick={onClick} className="flex-1 min-w-0 text-left px-3 py-2.5 flex items-center gap-3">
        {esPozo(x) ? <span className="w-2.5 h-2.5 rounded-full bg-pozo shrink-0" /> : <Factory className="w-4 h-4 text-instalacion shrink-0" />}
        <span className="min-w-0">
          <span className="num block text-[15px] truncate">{nombreDe(x)}</span>
          <span className="block text-[12px] text-tenue truncate">
            {esPozo(x) ? `${x.area} · ${x.tipo} · ${x.estado}` : `${x.tipo} · ${x.area}`}
          </span>
        </span>
      </button>
      {derecha}
    </li>
  );
}

function Inicio({ datos, favoritos, recientes, onElegir, onSacarFav }: { datos: Datos; favoritos: string[]; recientes: string[]; onElegir: (k: string) => void; onSacarFav: (k: string) => void }) {
  const fav = favoritos.map((k) => datos.porClave.get(k)).filter(Boolean) as (Pozo | Instalacion)[];
  const rec = recientes.filter((k) => !favoritos.includes(k)).map((k) => datos.porClave.get(k)).filter(Boolean).slice(0, 10) as (Pozo | Instalacion)[];
  const m = datos.meta?.fuentes;
  return (
    <div className="flex flex-col gap-4 pb-6">
      <section>
        <h2 className="flex items-center gap-2 text-[13px] uppercase tracking-wide text-tenue font-semibold mb-1.5"><Star className="w-4 h-4" /> Favoritos</h2>
        {fav.length ? (
          <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea">
            {fav.map((x) => <Fila key={x.k} x={x} onClick={() => onElegir(x.k)} derecha={<button aria-label="Quitar de favoritos" onClick={() => onSacarFav(x.k)} className="p-3"><X className="w-4 h-4 text-tenue" /></button>} />)}
          </ul>
        ) : <p className="text-[14px] text-tenue">Tocá la estrella en la ficha de un pozo para tenerlo a mano todas las mañanas.</p>}
      </section>
      {rec.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-[13px] uppercase tracking-wide text-tenue font-semibold mb-1.5"><Clock className="w-4 h-4" /> Recientes</h2>
          <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea">{rec.map((x) => <Fila key={x.k} x={x} onClick={() => onElegir(x.k)} />)}</ul>
        </section>
      )}
      <section className="rounded-lg border border-linea bg-panel p-3 text-[13px] leading-relaxed">
        <h2 className="flex items-center gap-2 font-semibold mb-1"><Info className="w-4 h-4" /> Datos cargados en este teléfono</h2>
        <ul className="text-tenue">
          <li>{(m?.pozos?.cantidad ?? datos.pozos.length).toLocaleString("es-AR")} pozos · padrón al {fecha(m?.pozos?.fecha)}
            {m?.pozos?.ultimo_inicio_perforacion && <> · el más nuevo empezó a perforarse el {fecha(m.pozos.ultimo_inicio_perforacion)} (las operadoras declaran con unos meses de atraso)</>}</li>
          <li>{datos.instalaciones.length.toLocaleString("es-AR")} instalaciones · {fecha(m?.instalaciones?.fecha)}</li>
          {m?.areas && <li>{m.areas.cantidad} áreas de concesión · {fecha(m.areas.fecha)}</li>}
          {m?.rutas && <li>{m.rutas.cantidad.toLocaleString("es-AR")} tramos de rutas · {fecha(m.rutas.fecha)}</li>}
          {m?.caminos && <li>{m.caminos.cantidad.toLocaleString("es-AR")} tramos de caminos de yacimiento · {fecha(m.caminos.fecha)}</li>}
        </ul>
        <p className="mt-2 text-tenue">Todo funciona sin señal una vez abierta la app con conexión. Para instalarla: en el menú del navegador, «Agregar a pantalla de inicio».</p>
        <p className="mt-2 text-tenue">Las coordenadas son las declaradas por las operadoras. Antes de salir, confirmá el acceso con la operadora. No uses la app mientras manejás.</p>
      </section>
    </div>
  );
}

export default function App({ acceso }: { acceso: Acceso }) {
  const { datos, error } = useDatos();
  // Direcciones propias: picadagps.ar/cuenta y picadagps.ar/admin abren esos paneles
  const ruta = location.pathname.replace(/\/+$/, "");
  const [verCuenta, setVerCuenta] = useState(ruta === "/cuenta" || ruta === "/admin");
  const abrirCuenta = (si: boolean) => { setVerCuenta(si); history.replaceState(null, "", si ? "/cuenta" : "/"); };
  const enLinea = useEnLinea();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [satelite, setSatelite] = useState(navigator.onLine);
  const [centrar, setCentrar] = useState<{ lat: number; lon: number; zoom: number; n: number; caja?: [number, number, number, number] } | null>(null);
  const [yo, setYo] = useState<{ lat: number; lon: number; precision: number } | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [avisoGps, setAvisoGps] = useState<string | null>(null);
  const favs = useLista("picadagps.favoritos", 100);
  const recs = useLista("picadagps.recientes", 30);

  const resultados = useMemo(() => {
    if (!datos || q.trim().length < 2) return [];
    return buscarPorPartes(datos.indice, q, 40).map((i) => (i < datos.pozos.length ? datos.pozos[i] : datos.instalaciones[i - datos.pozos.length]));
  }, [datos, q]);

  // Áreas de concesión que coinciden con la búsqueda: llevan el mapa al área completa
  const areasInfo = useMemo(() => {
    const m = new Map<string, { caja: [number, number, number, number]; operador: string; pozos: number }>();
    if (!datos?.areas) return m;
    for (const f of datos.areas.features) {
      const nombre = String((f.properties as any)?.nombre ?? ""); if (!nombre) continue;
      const g: any = f.geometry; const anillos: number[][][] = g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : [];
      let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
      for (const a of anillos) for (const [x, y] of a) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const previo = m.get(nombre);
      if (previo) { const c = previo.caja; previo.caja = [Math.min(c[0], x0), Math.min(c[1], y0), Math.max(c[2], x1), Math.max(c[3], y1)]; continue; }
      m.set(nombre, { caja: [x0, y0, x1, y1], operador: String((f.properties as any)?.operador ?? ""), pozos: 0 });
    }
    for (const p of datos.pozos) { const a = m.get(p.area); if (a) a.pozos++; }
    return m;
  }, [datos]);
  const areasHalladas = useMemo(() => (q.trim().length >= 3 ? buscarAreas([...areasInfo.keys()], q) : []), [areasInfo, q]);
  const irArea = (nombre: string) => {
    const a = areasInfo.get(nombre); if (!a) return;
    const [x0, y0, x1, y1] = a.caja;
    const lado = Math.max(x1 - x0, (y1 - y0) * 1.3, 0.005);
    setSel(null); setQ("");
    setCentrar({ lat: (y0 + y1) / 2, lon: (x0 + x1) / 2, zoom: Math.min(14, Math.max(8, Math.log2(360 / lado) - 1.2)), n: Date.now(), caja: a.caja });
  };

  const x = sel && datos ? datos.porClave.get(sel) ?? null : null;
  const salida = useMemo(() => (x && datos ? rutaMasCercana(x.lat, x.lon, datos.rutas) : null), [x, datos]);
  // Referencia dibujada en el mapa: por defecto la salida de la ruta; cambia al tocar otra en la ficha
  const [linea, setLinea] = useState<Linea | null>(null);
  useEffect(() => { setLinea(salida ? { desde: { lat: salida.lat, lon: salida.lon }, tipo: "ruta", n: 0 } : null); }, [salida]);

  // Enlace compartido (?p=clave): abre ese pozo apenas están los datos. Se guarda por si antes tiene que entrar con Google.
  useEffect(() => {
    if (!datos) return;
    let k: string | null = null;
    try { k = new URLSearchParams(location.search).get("p") || localStorage.getItem("picadagps.abrir"); localStorage.removeItem("picadagps.abrir"); } catch { /* nada */ }
    if (new URLSearchParams(location.search).has("p")) history.replaceState(null, "", location.pathname);
    if (k && datos.porClave.has(k)) elegir(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos]);

  const elegir = (k: string, volar = true) => {
    if (!datos) return;
    const y = datos.porClave.get(k);
    if (!y) return;
    setSel(k); setQ(""); recs.poner(k);
    if (volar) setCentrar({ lat: y.lat, lon: y.lon, zoom: 15.5, n: Date.now() });
  };

  const ubicarme = (centrarAlFinal = false) => {
    if (!("geolocation" in navigator)) { setAvisoGps("Este navegador no da la ubicación."); return; }
    setUbicando(true); setAvisoGps(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setYo({ lat: p.coords.latitude, lon: p.coords.longitude, precision: p.coords.accuracy }); setUbicando(false);
        if (centrarAlFinal) setCentrar({ lat: p.coords.latitude, lon: p.coords.longitude, zoom: 14, n: Date.now() });
      },
      (e) => { setUbicando(false); setAvisoGps(e.code === 1 ? "Sin permiso de ubicación: habilitalo en el navegador." : "No se pudo obtener la posición. Probá a cielo abierto."); },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 15000 }
    );
  };

  if (error) return <div className="p-6 text-[15px] flex flex-col gap-3">{error}<button onClick={() => location.reload()} className="self-start underline">Reintentar</button></div>;

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Panel: abajo en el celular, a la izquierda en pantallas grandes */}
      <aside className="order-2 md:order-1 md:w-[420px] md:h-full h-[48%] flex flex-col bg-fondo border-t md:border-t-0 md:border-r border-linea">
        <div className="p-3 pb-2 flex flex-col gap-2 border-b border-linea">
          <div className="flex items-center justify-between">
            <h1 className="text-[18px] font-bold tracking-tight">Picada<span className="text-acento">GPS</span> <span className="hidden sm:inline text-[12px] font-normal text-tenue">· pozos de Neuquén</span></h1>
            <span className="flex items-center gap-2">
              {!enLinea && <span className="flex items-center gap-1 text-[12px] text-tenue"><WifiOff className="w-4 h-4" /> Sin señal</span>}
              <button onClick={compartirWhatsApp} aria-label="Compartir la app por WhatsApp" title="Compartir por WhatsApp" className="p-1.5 rounded-md border border-linea text-acento">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={() => abrirCuenta(true)} className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[12px] ${acceso.estado === "prueba" ? "border-acento text-acento" : "border-linea text-tenue"}`}>
                <UserRound className="w-4 h-4" /> {textoEstado(acceso)}
              </button>
            </span>
          </div>
          <label className="relative block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-tenue" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder={datos ? "Sigla, pad, área u operadora: lach 419, bds, orejano…" : "Cargando pozos…"}
              disabled={!datos} inputMode="search" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-linea bg-panel text-[16px] outline-none focus:border-acento" aria-label="Buscar pozo o instalación" />
            {q && <button onClick={() => setQ("")} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5"><X className="w-5 h-5 text-tenue" /></button>}
          </label>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {!datos ? <p className="text-[14px] text-tenue">Cargando los datos en el teléfono…</p>
            : q.trim().length >= 2 ? (
              resultados.length || areasHalladas.length ? (
                <div className="flex flex-col gap-2">
                  {areasHalladas.length > 0 && (
                    <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea">
                      {areasHalladas.map((n) => (
                        <li key={n}>
                          <button onClick={() => irArea(n)} className="w-full text-left px-3 py-2.5 flex items-center gap-3">
                            <Layers className="w-4 h-4 text-acento shrink-0" />
                            <span className="min-w-0">
                              <span className="block text-[15px] font-medium truncate">Área {n}</span>
                              <span className="block text-[12px] text-tenue truncate">{areasInfo.get(n)?.pozos.toLocaleString("es-AR")} pozos · {areasInfo.get(n)?.operador} · ver en el mapa</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {resultados.length > 0 && <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea">{resultados.map((r) => <Fila key={r.k} x={r} onClick={() => elegir(r.k)} />)}</ul>}
                </div>
              ) : <p className="text-[14px] text-tenue">Sin coincidencias. Probá con menos letras o con el área.</p>
            ) : x ? (
              <Ficha x={x} datos={datos} favorito={favs.lista.includes(x.k)} onFavorito={() => favs.alternar(x.k)} onCerrar={() => setSel(null)}
                onElegir={(k) => elegir(k)} onVer={(lat, lon, zoom) => setCentrar({ lat, lon, zoom, n: Date.now() })}
                yo={yo} onUbicarme={() => ubicarme()} ubicando={ubicando}
                linea={linea} onLinea={(desde, tipo) => setLinea({ desde, tipo, n: Date.now() })} />
            ) : <Inicio datos={datos} favoritos={favs.lista} recientes={recs.lista} onElegir={(k) => elegir(k)} onSacarFav={favs.sacar} />}
          {avisoGps && <p className="text-[13px] text-alerta mt-2">{avisoGps}</p>}
        </div>
      </aside>

      <main className="order-1 md:order-2 relative flex-1 min-h-0">
        {datos && (
          <Mapa datos={datos} seleccion={x ? { lat: x.lat, lon: x.lon } : null} linea={linea}
            yo={yo} satelite={satelite} onElegir={(k) => elegir(k, false)} centrarEn={centrar} />
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-2 z-10">
          <button onClick={() => setSatelite(!satelite)} aria-pressed={satelite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-panel border border-linea shadow text-[13px] font-medium">
            {satelite ? <MapaIcono className="w-4 h-4" /> : <Satellite className="w-4 h-4" />} {satelite ? "Mapa simple" : "Satélite"}
          </button>
          <button onClick={() => ubicarme(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-panel border border-linea shadow text-[13px] font-medium">
            <Crosshair className="w-4 h-4" /> Mi ubicación
          </button>
        </div>
      </main>
      {verCuenta && <Cuenta a={acceso} conAdmin={ruta === "/admin" && acceso.rol === "admin"} onCerrar={() => abrirCuenta(false)} />}
    </div>
  );
}
