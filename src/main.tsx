import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import App from "./App";
import Acceso from "./components/Acceso";

createRoot(document.getElementById("root")!).render(<StrictMode><Acceso>{(a) => <App acceso={a} />}</Acceso></StrictMode>);
