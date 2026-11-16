/**
 * Presentación debajo del ingreso (solo la ve quien no tiene sesión): el problema, ventajas para el chofer
 * y para la empresa, cómo funciona, Plan Empresa y simulador, preguntas frecuentes.
 */
import type { ReactNode } from "react";
import { Aparece, Contador, IlustracionProblema, MiniSimulador } from "./Vivo";
import { MapPin, WifiOff, Star, Share2, Navigation, Search, Building2, Clock, Users, ShieldCheck, MessageCircle, ChevronDown } from "lucide-react";

const WA = "5492994603071";
const wa = (t: string) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
// Cifras de la versión actual de los datos (noviembre 2026)
const CIFRAS: [number, string][] = [[33125, "pozos"], [1040, "instalaciones"], [21783, "tramos de camino"], [4, "provincias"]];

function Seccion({ id, eyebrow, titulo, children, alt = false }: { id?: string; eyebrow: string; titulo: string; children: ReactNode; alt?: boolean }) {
  return (
    <section id={id} className={`px-4 py-12 ${alt ? "bg-panel border-y border-linea" : ""}`}>
      <div className="max-w-4xl mx-auto">
        <Aparece>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-acento">{eyebrow}</p>
          <h2 className="text-[26px] sm:text-[30px] leading-tight font-bold mt-1 mb-5">{titulo}</h2>
        </Aparece>
        <Aparece demora={120}>{children}</Aparece>
      </div>
    </section>
  );
}
function Item({ i: I, t, d }: { i: typeof MapPin; t: string; d: string }) {
  return (
    <li className="flex gap-3">
      <span className="w-9 h-9 shrink-0 rounded-full bg-acento/15 text-acento flex items-center justify-center"><I className="w-[18px] h-[18px]" /></span>
      <span><b className="block text-[15px]">{t}</b><span className="text-[14px] text-tenue">{d}</span></span>
    </li>
  );
}

const PREGUNTAS: [string, string][] = [
  ["¿Funciona sin señal?", "Sí. La primera vez que entrás con conexión, los pozos, instalaciones, áreas y caminos quedan guardados en el teléfono. Después la usás sin internet hasta 15 días seguidos."],
  ["¿Por qué no alcanza con Google Maps o Waze?", "No conocen los caminos de yacimiento ni las siglas de los pozos, y te dejan en el punto más cercano que ellos conocen. PicadaGPS te lleva hasta la salida de la ruta con Waze o Maps y te da las referencias del último tramo."],
  ["¿Hay que bajarla de una tienda?", "No. Es una aplicación web: entrás a picadagps.ar desde el navegador del celular y, si querés, la agregás a la pantalla de inicio desde el menú del navegador. Queda como cualquier app."],
  ["¿Necesito cuenta?", "Sí: entrás con tu cuenta de Google. Así guardamos tu prueba de 7 días, tu plan y tus favoritos. La cuenta se puede usar en hasta 2 teléfonos."],
  ["¿Qué zonas cubre?", "Neuquén, Río Negro, Mendoza y La Pampa: pozos, instalaciones (baterías, plantas, puntos de medición), áreas de concesión, rutas y caminos de yacimiento."],
  ["¿Cuánto cuesta y cómo se paga?", "La prueba dura 7 días y no pide tarjeta. Después elegís el plan trimestral o el anual, con precio en pesos del día. Se paga por transferencia, en un solo pago y sin renovación automática."],
  ["¿Y para una empresa?", "Con el Plan Empresa toda la flota entra con su correo, ve la marca de la empresa y los puntos propios que carga la empresa: bases, tranqueras, pads nuevos, picadas que no figuran en ningún mapa."]
];

export default function Presentacion() {
  return (
    <div className="relative z-10 w-full">
      <a href="#problema" className="flex flex-col items-center gap-0.5 text-[13px] text-tenue pb-6">Conocé más <ChevronDown className="w-4 h-4 animate-bounce" /></a>

      <div className="px-4 pb-10">
        <ul className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CIFRAS.map(([n, t], i) => (
            <Aparece as="li" key={t} demora={i * 90} className="tarjeta-viva rounded-xl border border-linea bg-panel p-3 text-center"><b className="block text-[24px] text-acento"><Contador valor={n} /></b><span className="text-[13px] text-tenue">{t}</span></Aparece>
          ))}
        </ul>
      </div>

      <Seccion id="problema" eyebrow="El problema" titulo="El pozo está a 40 km. El acceso, a otros 2." alt>
        <p className="text-[15px] text-tenue mb-4 max-w-2xl">Los caminos de yacimiento no están en Google Maps ni en Waze, y en la zona casi no hay señal. Cada salida a un pozo que no conocés termina en vueltas, llamadas y tiempo perdido.</p>
        <div className="mb-6"><IlustracionProblema /></div>
        <ul className="grid sm:grid-cols-2 gap-4">
          <Item i={MapPin} t="El mapa te deja en el lugar equivocado" d="No conoce la picada, así que te marca el punto más cercano que sí conoce, que puede estar a kilómetros." />
          <Item i={WifiOff} t="Sin señal no hay mapa" d="La cobertura aparece y desaparece varias veces en cada viaje." />
          <Item i={Search} t="Siglas en lugar de direcciones" d="Te mandan a «YPF.Nq.LLL-324» y ningún mapa comercial sabe qué es." />
          <Item i={Clock} t="El tiempo perdido es de todos" d="El chofer da vueltas, el equipo espera y el cliente reprograma." />
        </ul>
      </Seccion>

      <Seccion id="ventajas" eyebrow="Ventajas" titulo="Le sirve al chofer. Le sirve a la empresa.">
        <div className="grid sm:grid-cols-2 gap-4">
          <article className="tarjeta-viva rounded-2xl border border-linea bg-panel p-5">
            <h3 className="text-[18px] font-bold mb-3">Para el chofer y el técnico</h3>
            <ul className="flex flex-col gap-3">
              <Item i={Search} t="Buscás por sigla, área o yacimiento" d="«lc 10», «loma campana», «vacas muertas»." />
              <Item i={Navigation} t="Cómo llegar en pasos" d="Salida de ruta, camino de yacimiento más cercano e instalaciones de referencia, con la línea punteada en el mapa." />
              <Item i={WifiOff} t="Funciona sin señal" d="Todo queda guardado en el teléfono." />
              <Item i={Star} t="Tus pozos de siempre a mano" d="Favoritos y recientes para la salida de mañana." />
              <Item i={Share2} t="Compartís la ubicación" d="Por WhatsApp, con foto satelital, coordenadas y referencias." />
            </ul>
          </article>
          <article className="tarjeta-viva rounded-2xl border-2 border-acento bg-panel p-5">
            <h3 className="text-[18px] font-bold mb-3">Para la empresa</h3>
            <ul className="flex flex-col gap-3">
              <Item i={Clock} t="Menos horas perdidas" d="Menos desvíos, menos gasoil y desgaste, y el equipo del cliente no espera." />
              <Item i={MapPin} t="Puntos propios de la empresa" d="Bases, tranqueras, pads nuevos y accesos difíciles, para toda la flota." />
              <Item i={Users} t="Usuarios y roles" d="Por correo o por dominio de la empresa: administrador, carga de puntos o solo consulta." />
              <Item i={ShieldCheck} t="Menos kilómetros en picada" d="Menos exposición a riesgos viales en cada viaje." />
              <Item i={Building2} t="Con la marca de tu empresa" d="Logo, color y mensaje de bienvenida dentro de la app." />
            </ul>
          </article>
        </div>
      </Seccion>

      <Seccion eyebrow="Cómo funciona" titulo="Tres pasos y estás en el pozo" alt>
        <ol className="grid sm:grid-cols-3 gap-4">
          {[["Entrás con Google", "Desde el navegador del celular, en picadagps.ar. Si querés, la agregás a la pantalla de inicio."],
            ["Buscás el pozo", "Por sigla, área o yacimiento, o desde tus favoritos. Mirás cómo llegar antes de salir."],
            ["Seguís las referencias", "Waze o Maps hasta la salida de la ruta y, desde ahí, el camino de yacimiento hasta la locación."]].map(([t, d], i) => (
            <li key={t} className="tarjeta-viva rounded-2xl border border-linea bg-fondo p-5">
              <span className="w-8 h-8 rounded-full bg-acento text-acento-texto font-bold flex items-center justify-center">{i + 1}</span>
              <b className="block text-[16px] mt-3">{t}</b><span className="text-[14px] text-tenue">{d}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-tenue">Consultá el mapa siempre con el vehículo detenido.</p>
      </Seccion>

      <Seccion id="empresas" eyebrow="Plan Empresa" titulo="¿Cuánto le cuesta a tu flota no encontrar la locación?">
        <div className="rounded-2xl p-5 sm:p-6 text-white" style={{ background: "linear-gradient(135deg,#0e1b2a,#1d3a5c)" }}>
          <p className="text-[15px] opacity-90 max-w-2xl mb-5">Horas, gasoil, desgaste, esperas del cliente y riesgo de contrato: un costo que casi ninguna empresa mide. Mové la flota y mirá cuánto suma.</p>
          <MiniSimulador />
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap gap-2">
            <a href="/empresa" className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/60 font-semibold text-[15px]"><Building2 className="w-4 h-4" /> Portal de empresas</a>
            <a href={wa("Hola Víctor, quiero consultar por el Plan Empresa de PicadaGPS.")} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/60 font-semibold text-[15px]"><MessageCircle className="w-4 h-4" /> Consultar por WhatsApp</a>
          </div>
        </div>
      </Seccion>

      <Seccion id="preguntas" eyebrow="Preguntas" titulo="Lo que más nos preguntan" alt>
        <div className="flex flex-col gap-2 max-w-3xl">
          {PREGUNTAS.map(([q, r]) => (
            <details key={q} className="group rounded-xl border border-linea bg-fondo px-4 py-3">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-semibold text-[15px]">{q}<ChevronDown className="w-4 h-4 text-tenue shrink-0 transition-transform group-open:rotate-180" /></summary>
              <p className="mt-2 text-[14px] text-tenue">{r}</p>
            </details>
          ))}
        </div>
      </Seccion>

      <section className="px-4 py-12 text-center">
        <h2 className="text-[28px] font-bold">La próxima salida, sin adivinar</h2>
        <p className="text-[15px] text-tenue mt-1">Probala 7 días gratis en tu próximo viaje. Si te sirve, seguís con el plan trimestral o el anual.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <a href="#top" className="px-5 py-3 rounded-xl bg-acento text-acento-texto font-bold text-[15px]">Probar gratis</a>
          <a href={wa("Hola Víctor, quiero información sobre PicadaGPS.")} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-linea bg-panel font-semibold text-[15px]"><MessageCircle className="w-4 h-4" /> WhatsApp +54 9 299 460 3071</a>
        </div>
      </section>

      <footer className="px-4 py-6 border-t border-linea text-center text-[12px] text-tenue">
        <p>Picada<span className="text-acento font-semibold">GPS</span> · El GPS de los yacimientos</p>
        <p className="mt-1">Verificá el acceso con la operadora antes de salir. No uses la app mientras manejás.</p>
        <p className="mt-1">Imágenes © Esri, Maxar, Earthstar Geographics</p>
      </footer>
    </div>
  );
}
