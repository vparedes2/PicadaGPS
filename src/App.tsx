import { useEffect, useMemo, useState } from "react";
import { Search, Satellite, Map as MapaIcono, Star, Clock, WifiOff, Info, Factory, X, Crosshair, UserRound } from "lucide-react";
import Mapa from "./components/Mapa";
import Ficha from "./components/Ficha";
import { useDatos, esPozo, nombreDe, type Datos, type Pozo, type Instalacion } from "./lib/datos";
import { buscarPorPartes } from "./lib/buscar";
import { rutaMasCercana } from "./lib/geo";
import type { Linea } from "./components/Mapa";
import { useLista } from "./lib/guardado";
import type { Acceso } from "./lib/cuenta";
import Cuenta, { textoEstado } from "./components/Cuenta";
import Creditos from "./components/Creditos";

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

function Inicio({ datos, favoritos, recientes, onElegir, onSacarFav, onCreditos }: { datos: Datos; favoritos: string[]; recientes: string[]; onElegir: (k: string) => void; onSacarFav: (k: string) => void; onCreditos: () => void }) {
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
        <button onClick={onCreditos} className="mt-2 underline text-tenue">Créditos</button>
      </section>
    </div>
  );
}

export default function App({ acceso }: { acceso: Acceso }) {
  const { datos, error } = useDatos();
  const [verCuenta, setVerCuenta] = useState(false);
  const [verCreditos, setVerCreditos] = useState(false);
  const enLinea = useEnLinea();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [satelite, setSatelite] = useState(navigator.onLine);
  const [centrar, setCentrar] = useState<{ lat: number; lon: number; zoom: number; n: number } | null>(null);
  const [yo, setYo] = useState<{ lat: number; lon: number; precision: number } | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [avisoGps, setAvisoGps] = useState<string | null>(null);
  const favs = useLista("picadagps.favoritos", 100);
  const recs = useLista("picadagps.recientes", 30);

  const resultados = useMemo(() => {
    if (!datos || q.trim().length < 2) return [];
    return buscarPorPartes(datos.indice, q, 40).map((i) => (i < datos.pozos.length ? datos.pozos[i] : datos.instalaciones[i - datos.pozos.length]));
  }, [datos, q]);

  const x = sel && datos ? datos.porClave.get(sel) ?? null : null;
  const salida = useMemo(() => (x && datos ? rutaMasCercana(x.lat, x.lon, datos.rutas) : null), [x, datos]);
  // Referencia dibujada en el mapa: por defecto la salida de la ruta; cambia al tocar otra en la ficha
  const [linea, setLinea] = useState<Linea | null>(null);
  useEffect(() => { setLinea(salida ? { desde: { lat: salida.lat, lon: salida.lon }, tipo: "ruta", n: 0 } : null); }, [salida]);

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
              <button onClick={() => setVerCuenta(true)} className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[12px] ${acceso.estado === "prueba" ? "border-acento text-acento" : "border-linea text-tenue"}`}>
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
              resultados.length ? (
                <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea">{resultados.map((r) => <Fila key={r.k} x={r} onClick={() => elegir(r.k)} />)}</ul>
              ) : <p className="text-[14px] text-tenue">Sin coincidencias. Probá con menos letras o con el área.</p>
            ) : x ? (
              <Ficha x={x} datos={datos} favorito={favs.lista.includes(x.k)} onFavorito={() => favs.alternar(x.k)} onCerrar={() => setSel(null)}
                onElegir={(k) => elegir(k)} onVer={(lat, lon, zoom) => setCentrar({ lat, lon, zoom, n: Date.now() })}
                yo={yo} onUbicarme={() => ubicarme()} ubicando={ubicando}
                linea={linea} onLinea={(desde, tipo) => setLinea({ desde, tipo, n: Date.now() })} />
            ) : <Inicio datos={datos} favoritos={favs.lista} recientes={recs.lista} onElegir={(k) => elegir(k)} onSacarFav={favs.sacar} onCreditos={() => setVerCreditos(true)} />}
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
      {verCuenta && <Cuenta a={acceso} onCerrar={() => setVerCuenta(false)} />}
      {verCreditos && <Creditos onCerrar={() => setVerCreditos(false)} />}
    </div>
  );
}
