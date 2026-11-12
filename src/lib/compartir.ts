/** Compartir la app por WhatsApp con el enlace y una descripción corta. */
export const URL_APP = "https://picadagps.ar";
export const TEXTO_COMPARTIR =
  "📍 *PicadaGPS*: encontrá cualquier pozo o locación de Neuquén y cómo llegar desde la ruta, aunque no haya señal. " +
  "Buscás por sigla, pad, área u operadora y te abre Waze o Google Maps.\n\n" +
  `✅ Probala *7 días gratis* 👉 ${URL_APP}`;

export function compartirWhatsApp() {
  location.href = `https://wa.me/?text=${encodeURIComponent(TEXTO_COMPARTIR)}`;
}

/** Enlace que abre la app directo en ese pozo o instalación (si no tiene cuenta, ve la prueba gratis) */
export const enlaceApp = (clave: string) => `${URL_APP}/?p=${encodeURIComponent(clave)}`;
export const enlaceSatelite = (lat: number, lon: number) => `https://maps.google.com/?q=${lat},${lon}&t=k&z=17`;

/**
 * Comparte una ubicación: en el celular, con la foto satelital adjunta (elegís WhatsApp en el menú);
 * si el navegador no permite adjuntar, abre WhatsApp solo con el texto.
 */
export async function compartirUbicacion(texto: string, foto: (() => Promise<Blob | null>) | null, nombreArchivo: string): Promise<"foto" | "texto" | "cancelado"> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (foto && nav.share && nav.canShare) {
    try {
      const b = await foto();
      if (b) {
        const archivo = new File([b], `${nombreArchivo.replace(/[^\w.-]+/g, "_")}.jpg`, { type: "image/jpeg" });
        const datos: ShareData = { files: [archivo], text: texto };
        if (nav.canShare(datos)) { await nav.share(datos); return "foto"; }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelado";
    }
  }
  location.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  return "texto";
}
