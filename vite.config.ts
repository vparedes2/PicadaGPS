import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
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
