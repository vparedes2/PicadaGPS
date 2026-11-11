/** Créditos y licencias de los datos de terceros (atribución exigida por cada licencia). */
import { X } from "lucide-react";

const CREDITOS: { que: string; quien: string; licencia: string }[] = [
  { que: "Padrón de pozos", quien: "Secretaría de Energía de la Nación · datos.energia.gob.ar", licencia: "CC BY 4.0" },
  { que: "Instalaciones y áreas de concesión", quien: "Subsecretaría de Energía, Minería e Hidrocarburos de Neuquén · SIG Hidrocarburos", licencia: "Datos públicos, con cita de la fuente" },
  { que: "Rutas nacionales y provinciales", quien: "Instituto Geográfico Nacional (IGN)", licencia: "CC BY 4.0" },
  { que: "Caminos de yacimiento", quien: "© colaboradores de OpenStreetMap", licencia: "ODbL 1.0" },
  { que: "Imagen satelital", quien: "© Esri, Maxar, Earthstar Geographics y la comunidad de usuarios de SIG", licencia: "Términos de uso de Esri" }
];

export default function Creditos({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-fondo overflow-y-auto">
      <div className="max-w-xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[20px] font-bold">Créditos</h1>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-2"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-[14px] text-tenue mb-3">PicadaGPS combina, ordena y simplifica datos abiertos de estas fuentes. Las fuentes no son responsables del uso que hace la app.</p>
        <ul className="rounded-lg border border-linea bg-panel divide-y divide-linea">
          {CREDITOS.map((c) => (
            <li key={c.que} className="p-3 text-[14px]">
              <span className="block font-semibold">{c.que}</span>
              <span className="block">{c.quien}</span>
              <span className="block text-[12px] text-tenue">Licencia: {c.licencia}</span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-tenue mt-3">Las coordenadas son las declaradas por las operadoras. Antes de salir, confirmá el acceso con la operadora. No uses la app mientras manejás.</p>
      </div>
    </div>
  );
}
