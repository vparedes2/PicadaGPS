import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Vista previa propia al compartir picadagps.ar/empresas (WhatsApp, LinkedIn, etc.):
// copia el index.html ya armado como empresas.html con sus propias etiquetas og:.
// Los bots no ejecutan JS, así que las etiquetas tienen que venir en el HTML. vercel.json sirve este archivo en /empresas.
function paginaEmpresas() {
  const meta: Record<string, string> = {
    title: "PicadaGPS Empresas · Plan para flotas y operadoras",
    description: "Plan Empresas de PicadaGPS: los pozos de la cuenca neuquina más los puntos propios de tu empresa, tus usuarios y tu marca. Funciona sin señal.",
    "og:url": "https://picadagps.ar/empresas",
    "og:title": "PicadaGPS · Plan Empresas: toda tu flota llega a la locación correcta",
    "og:description": "Puntos propios (tranqueras, bases, pads nuevos), carga de KML/GPX, usuarios por dominio de correo y tu marca. Para transportistas, servicios y operadoras.",
    "og:image": "https://picadagps.ar/compartir-empresas.jpg"
  };
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return {
    name: "pagina-empresas",
    apply: "build" as const,
    enforce: "post" as const,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generateBundle(this: any, _o: unknown, bundle: Record<string, any>) {
      const base = bundle["index.html"];
      if (!base) return;
      let html = String(base.source);
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
      html = html.replace(/(<meta name="description" content=")[^"]*/, `$1${esc(meta.description)}`);
      for (const k of ["og:url", "og:title", "og:description", "og:image"]) {
        html = html.replace(new RegExp(`(<meta property="${k}" content=")[^"]*`), `$1${esc(meta[k])}`);
      }
      this.emitFile({ type: "asset", fileName: "empresas.html", source: html });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    paginaEmpresas(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icono.svg", "icono-192.png", "icono-512.png"],
      manifest: {
        name: "PicadaGPS · Pozos de Neuquén",
        short_name: "PicadaGPS",
        description: "Ubicá pozos y locaciones de Neuquén sin señal.",
        lang: "es-AR",
        start_url: "/",
        display: "standalone",
        background_color: "#f4f1ea",
        theme_color: "#1f3a2e",
        icons: [
          { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // La app queda guardada en el teléfono. Los datos no son públicos: se bajan con la sesión
        // por /api/datos y la app los guarda aparte (src/lib/datos.ts) para usarlos sin señal.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Imagen satelital: lo que se miró (o se guardó para un favorito) queda disponible sin señal
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\//,
            handler: "CacheFirst",
            options: {
              cacheName: "satelite",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 6000, maxAgeSeconds: 60 * 60 * 24 * 180 }
            }
          }
        ]
      }
    })
  ]
});
