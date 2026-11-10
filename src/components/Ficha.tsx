import { useMemo, useState } from "react";
import { Copy, Check, Star, Share2, Navigation, MapPin, Crosshair, Download, X, Route, Factory, Layers } from "lucide-react";
import { esPozo, nombreDe, type Datos, type Instalacion, type Pozo } from "../lib/datos";
import { aDMS, cardinal, distM, rumbo, rutaMasCercana, textoDist } from "../lib/geo";
import { copiar, enlaceGoogle, enlaceOtraApp, enlaceWaze, enlaceWhatsApp, guardarZona, nombreOtraApp } from "../lib/navegar";

interface Props {
  x: Pozo | Instalacion;
  datos: Datos;
  favorito: boolean;
  onFavorito: () => void;
  onCerrar: () => void;
  onElegir: (clave: string) => void;
  onVer: (lat: number, lon: number, zoom: number) => void;
  yo: { lat: number; lon: number; precision: number } | null;
  onUbicarme: () => void;
  ubicando: boolean;
}

function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={async () => { if (await copiar(texto)) { setOk(true); setTimeout(() => setOk(false), 1600); } }}
      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 border border-linea rounded-lg bg-fondo active:scale-[.99]" aria-label={`Copiar ${etiqueta}`}>
      <span className="text-left">
        <span className="block text-[11px] text-tenue">{etiqueta}</span>
        <span className="num text-[15px]">{texto}</span>
      </span>
      {ok ? <Check className="w-5 h-5 text-acento shrink-0" /> : <Copy className="w-5 h-5 text-tenue shrink-0" />}
    </button>
  );
}

const Nav = ({ href, children, principal }: { href: string; children: React.ReactNode; principal?: boolean }) => (
  <a href={href} target="_blank" rel="noopener"
    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 rounded-lg text-[15px] font-semibold ${principal ? "bg-acento text-acento-texto" : "border border-linea bg-panel"}`}>
    {children}
  </a>
);

export default function Ficha({ x, datos, favorito, onFavorito, onCerrar, onElegir, onVer, yo, onUbicarme, ubicando }: Props) {
  const nombre = nombreDe(x);
  const { lat, lon } = x;
  const [guardando, setGuardando] = useState<string | null>(null);

  const ref = useMemo(() => {
    // Instalaciones con nombre más cercanas: así se orienta la gente en el campo
    const inst = datos.instalaciones
      .filter((i) => i.k !== x.k)
      .map((i) => ({ i, d: distM(i.lat, i.lon, lat, lon) }))
      .sort((a, b) => a.d - b.d).slice(0, 3);
    // Pozos en la misma locación (a menos de 80 m): sirve para confirmar que es el pad correcto
    const vecinos = esPozo(x)
      ? datos.pozos.filter((p) => p.k !== x.k && Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lon - lon) < 0.0013 && distM(p.lat, p.lon, lat, lon) < 80)
      : [];
    const ruta = rutaMasCercana(lat, lon, datos.rutas);
    return { inst, vecinos, ruta };
  }, [x, datos, lat, lon]);

  const desdeYo = yo ? { d: distM(yo.lat, yo.lon, lat, lon), r: rumbo(yo.lat, yo.lon, lat, lon) } : null;
  const dec = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  const dms = `${aDMS(lat, true)}, ${aDMS(lon, false)}`;

  return (
    <article className="flex flex-col gap-4 pb-6">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] uppercase tracking-wide text-tenue">{esPozo(x) ? `Pozo ${x.tipo.toLowerCase()}` : x.tipo || "Instalación"}</p>
          <h2 className="num text-[22px] leading-tight font-semibold break-words">{nombre}</h2>
          <p className="text-[14px] text-tenue mt-0.5">{x.area}{esPozo(x) && x.yacimiento && x.yacimiento !== x.area ? ` · ${x.yacimiento}` : ""}</p>
        </div>
        <button onClick={onFavorito} aria-pressed={favorito} aria-label={favorito ? "Quitar de favoritos" : "Guardar en favoritos"} className="p-2 -m-1">
          <Star className={`w-7 h-7 ${favorito ? "fill-[#e6a700] text-[#e6a700]" : "text-tenue"}`} />
        </button>
        <button onClick={onCerrar} aria-label="Cerrar ficha" className="p-2 -m-1"><X className="w-7 h-7 text-tenue" /></button>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
        {esPozo(x) ? (
          <>
            <div><dt className="text-tenue text-[12px]">Estado</dt><dd>{x.estado}</dd></div>
            <div><dt className="text-tenue text-[12px]">Operadora</dt><dd>{x.empresa}</dd></div>
            <div><dt className="text-tenue text-[12px]">Extracción</dt><dd>{x.extraccion}</dd></div>
            <div><dt className="text-tenue text-[12px]">Recurso</dt><dd>{x.recurso}{x.inicio ? ` · perforado ${x.inicio.slice(0, 4)}` : ""}</dd></div>
          </>
        ) : (
          <div className="col-span-2"><dt className="text-tenue text-[12px]">Operadora</dt><dd>{x.operador || "Sin dato"}</dd></div>
        )}
      </dl>

      <section className="flex gap-2" aria-label="Navegar">
        <Nav href={enlaceWaze(lat, lon)} principal><Navigation className="w-5 h-5" /> Waze</Nav>
        <Nav href={enlaceGoogle(lat, lon)}><MapPin className="w-5 h-5" /> Google Maps</Nav>
        <Nav href={enlaceOtraApp(lat, lon, nombre)}>{nombreOtraApp()}</Nav>
      </section>
      <p className="text-[12px] text-tenue -mt-2 leading-snug">
        Sin señal, Google Maps solo traza la ruta si descargaste la zona en «Mapas sin conexión», y en general no conoce las picadas. Para el último tramo usá las referencias de abajo.
      </p>

      <section className="flex flex-col gap-2" aria-label="Coordenadas">
        <BotonCopiar etiqueta="Coordenadas (decimal) · tocar para copiar" texto={dec} />
        <BotonCopiar etiqueta="Grados, minutos y segundos (GPS de la camioneta)" texto={dms} />
        <a href={enlaceWhatsApp(nombre, lat, lon, ref.ruta ? `Salida de ${ref.ruta.nombre}: ${ref.ruta.lat.toFixed(6)}, ${ref.ruta.lon.toFixed(6)}` : "")}
          target="_blank" rel="noopener" className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-linea bg-panel text-[15px] font-medium">
          <Share2 className="w-5 h-5" /> Enviar ubicación por WhatsApp
        </a>
      </section>

      <section aria-label="Cómo llegar" className="flex flex-col gap-2">
        <h3 className="text-[13px] uppercase tracking-wide text-tenue font-semibold">Cómo llegar</h3>
        {ref.ruta ? (
          <div className="rounded-lg border border-linea bg-panel p-3">
            <p className="flex items-start gap-2 text-[15px]"><Route className="w-5 h-5 shrink-0 mt-0.5 text-[#b88a00]" />
              <span>La ruta más cercana es <b>{ref.ruta.nombre}</b>. Desde el punto más cercano de la ruta, el {esPozo(x) ? "pozo" : "lugar"} queda a <b>{textoDist(ref.ruta.d)}</b> al {cardinal(rumbo(ref.ruta.lat, ref.ruta.lon, lat, lon))}.</span>
            </p>
            <p className="num text-[12px] text-tenue mt-1.5">Punto de salida: {ref.ruta.lat.toFixed(5)}, {ref.ruta.lon.toFixed(5)}</p>
            <div className="flex gap-2 mt-2">
              <a href={enlaceWaze(ref.ruta.lat, ref.ruta.lon)} target="_blank" rel="noopener" className="flex-1 text-center text-[14px] py-2 rounded-md border border-linea">Ir a la salida (Waze)</a>
              <button onClick={() => onVer(ref.ruta!.lat, ref.ruta!.lon, 13)} className="flex-1 text-[14px] py-2 rounded-md border border-linea">Ver en el mapa</button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-tenue">Las rutas todavía no están cargadas en esta versión de los datos.</p>
        )}
        {ref.inst.length > 0 && (
          <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea">
            {ref.inst.map(({ i, d }) => (
              <li key={i.k}>
                <button onClick={() => onElegir(i.k)} className="w-full text-left flex items-start gap-2 p-3">
                  <Factory className="w-5 h-5 shrink-0 mt-0.5 text-instalacion" />
                  <span className="text-[15px] leading-snug">
                    A <b>{textoDist(d)}</b> al {cardinal(rumbo(i.lat, i.lon, lat, lon))} de <b>{i.nombre}</b>
                    <span className="block text-[12px] text-tenue">{i.tipo}{i.operador ? ` · ${i.operador}` : ""}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {ref.vecinos.length > 0 && (
          <div className="rounded-lg border border-linea bg-panel p-3">
            <p className="flex items-center gap-2 text-[14px] font-medium"><Layers className="w-4 h-4" /> En la misma locación: {ref.vecinos.length} pozo{ref.vecinos.length > 1 ? "s" : ""} más</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ref.vecinos.slice(0, 12).map((p) => (
                <button key={p.k} onClick={() => onElegir(p.k)} className="num text-[12px] px-2 py-1 rounded border border-linea bg-fondo">{p.sigla}</button>
              ))}
            </div>
          </div>
        )}
        <p className="text-[12px] text-tenue leading-snug">Distancias en línea recta, no por camino: por picada puede ser bastante más. Verificá el acceso con la operadora.</p>
      </section>

      <section aria-label="Desde mi ubicación" className="rounded-lg border border-linea bg-panel p-3">
        {desdeYo ? (
          <p className="text-[15px]">Estás a <b>{textoDist(desdeYo.d)}</b>: el {esPozo(x) ? "pozo" : "lugar"} queda al <b>{cardinal(desdeYo.r)}</b> ({Math.round(desdeYo.r)}°) de tu posición.
            <span className="block text-[12px] text-tenue mt-1">Precisión del GPS: unos {Math.round(yo!.precision)} m. El GPS funciona sin señal de celular.</span></p>
        ) : (
          <button onClick={onUbicarme} disabled={ubicando} className="w-full flex items-center justify-center gap-2 text-[15px] py-1">
            <Crosshair className="w-5 h-5" /> {ubicando ? "Buscando tu posición…" : "¿A cuánto estoy? Usar mi ubicación"}
          </button>
        )}
      </section>

      <button
        onClick={async () => { setGuardando("0"); const n = await guardarZona(lat, lon, 800, (h, t) => setGuardando(`${h}/${t}`)); setGuardando(`listo:${n}`); }}
        disabled={guardando !== null && !guardando.startsWith("listo")}
        className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-linea bg-panel text-[14px]">
        <Download className="w-5 h-5" />
        {guardando === null ? "Guardar imagen satelital de la zona para usar sin señal"
          : guardando.startsWith("listo") ? "Imagen de la zona guardada en el teléfono" : `Guardando imagen… ${guardando}`}
      </button>
    </article>
  );
}
