import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import App from "./App";
import Acceso from "./components/Acceso";

// Enlace compartido a un pozo: se recuerda para abrirlo después de entrar con Google
try { const k = new URLSearchParams(location.search).get("p"); if (k) localStorage.setItem("picadagps.abrir", k); } catch { /* nada */ }

// Portal de empresas: empresas.picadagps.ar (o picadagps.ar/empresas) — se carga aparte, no pesa en la app
const esPortal = location.hostname.startsWith("empresas.") || /^\/empresas\/?$/.test(location.pathname);
const PortalEmpresas = lazy(() => import("./components/PortalEmpresas"));
// Simulador público de costos: picadagps.ar/simulador (sin cuenta)
const esSimulador = /^\/simulador\/?$/.test(location.pathname);
const SimuladorPublico = lazy(() => import("./components/SimuladorPublico"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>{esSimulador ? <Suspense fallback={null}><SimuladorPublico /></Suspense> : esPortal ? <Suspense fallback={null}><PortalEmpresas /></Suspense> : <Acceso>{(a) => <App acceso={a} />}</Acceso>}</StrictMode>
);
