import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import App from "./App";
import Acceso from "./components/Acceso";

// Enlace compartido a un pozo: se recuerda para abrirlo después de entrar con Google
try { const k = new URLSearchParams(location.search).get("p"); if (k) localStorage.setItem("picadagps.abrir", k); } catch { /* nada */ }

createRoot(document.getElementById("root")!).render(<StrictMode><Acceso>{(a) => <App acceso={a} />}</Acceso></StrictMode>);
