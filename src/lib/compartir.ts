/** Compartir la app por WhatsApp con el enlace y una descripción corta. */
export const URL_APP = "https://picadagps.victorparedes.ar";
export const TEXTO_COMPARTIR =
  "📍 *PicadaGPS*: encontrá cualquier pozo o locación de Neuquén y cómo llegar desde la ruta, aunque no haya señal. " +
  "Buscás por sigla, pad, área u operadora y te abre Waze o Google Maps.\n\n" +
  `✅ Probala *7 días gratis* 👉 ${URL_APP}`;

export function compartirWhatsApp() {
  location.href = `https://wa.me/?text=${encodeURIComponent(TEXTO_COMPARTIR)}`;
}
