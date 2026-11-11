# PicadaGPS

Ubicador de pozos y locaciones de Neuquén pensado para usar **sin señal** en el yacimiento.

- **Buscador por partes:** `lach 419`, `bds`, `adv x1 orejano`. Busca en los 19.656 pozos del padrón nacional y en las 550 instalaciones del registro provincial.
- **Ficha del pozo:** estado, operadora, área, sistema de extracción y coordenadas en decimal y en grados, minutos y segundos, con un toque para copiar. También se puede enviar por WhatsApp.
- **Cómo llegar:**
  - ruta principal más cercana, con el punto de salida y la distancia hasta el pozo;
  - las tres instalaciones con nombre más cercanas ("a 1,2 km al noreste de Batería X");
  - los otros pozos de la misma locación.
- **Navegación:** botones a Waze, Google Maps y otra app de mapas (OsmAnd u Organic Maps en Android, Apple Maps en iPhone).
- **Desde mi ubicación:** distancia y rumbo desde el GPS del teléfono, que funciona sin señal de celular.
- **Favoritos y recientes,** guardados en el teléfono.
- **Mapa:**
  - sin conexión: áreas de concesión, rutas, pozos e instalaciones;
  - con conexión: imagen satelital;
  - para usar la imagen sin señal: botón para guardar la de la zona de un pozo.

Todas las distancias son en línea recta. El último tramo por picada no está mapeado.

## Cómo funciona sin señal

Es una aplicación web instalable (PWA). La primera vez que se abre con conexión, la aplicación y los datos (unos 2 MB comprimidos) quedan guardados en el teléfono. Para instalarla: menú del navegador → «Agregar a pantalla de inicio».

## Datos

| Archivo | Fuente |
|---|---|
| `public/datos/pozos.json` | Secretaría de Energía de la Nación, padrón de pozos Capítulo IV (`data/fuente/pozos-capitulo-iv.csv`) |
| `public/datos/instalaciones.json` | SIG Hidrocarburos, Subsecretaría de Energía de Neuquén, a través del monitor ambiental |
| `public/datos/areas.geojson` | SIG Hidrocarburos, Subsecretaría de Energía de Neuquén |
| `public/datos/rutas.geojson` | Red vial del IGN; si no responde, OpenStreetMap |

`python3 scripts/preparar_datos.py` vuelve a descargar las fuentes y regenera `public/datos/`. Si una descarga falla, usa la última copia guardada en `data/fuente/`. La acción **Actualizar datos** lo corre una vez por mes y se puede lanzar a mano desde la pestaña Actions.

Para actualizar el padrón de pozos, reemplazá `data/fuente/pozos-capitulo-iv.csv` por una versión nueva del dataset de Nación (mismas columnas) y corré el script.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/ con el service worker
```

Se puede publicar como sitio estático en Vercel, Netlify o Cloudflare Pages. El comando de build es `npm run build` y la carpeta de salida es `dist`.

## Aviso

Las coordenadas son las declaradas por las operadoras a los organismos públicos. Antes de salir, confirmá el acceso con la operadora. No uses la aplicación mientras manejás.

## Cuentas, prueba y pagos

- Ingreso con Google (Supabase Auth). La primera vez se crea la cuenta con 7 días de prueba; `vparedes2@gmail.com` queda como administrador.
- Al vencer la prueba o el plan, la app pide pagar: trimestral US$ 20 o anual US$ 70, en pesos al dólar del día (dolarapi.com, oficial BNA venta por defecto; se cambia en Administración → Precios). El cobro es manual: el usuario toca «Pedir alias por WhatsApp», queda un pedido registrado y se abre WhatsApp con el plan, el monto y su cuenta. Paga por transferencia y el administrador confirma el pedido en Administración (eso habilita el plan).
- Los datos están en `datos/` (no en `public/`): los entrega `api/datos.ts` solo con sesión y acceso vigente. La app los guarda en el teléfono para usarlos sin señal hasta la fecha de vencimiento; al salir o al vencer se borran.
- Base de datos: `supabase/migrations/`. Funciones: `supabase/functions/picada-pagos` y `picada-admin` (ambas sin verificación JWT de la plataforma: cada una valida la sesión por su cuenta).
- El número de WhatsApp se cambia en Administración → Precios.
