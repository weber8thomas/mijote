import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Partage entrant (manifest share_target, Android) : /mijote/?titre=…&t=…&lien=… → ajout aux courses.
{
  const params = new URLSearchParams(window.location.search);
  const shared = [params.get("titre"), params.get("t"), params.get("lien")].filter(Boolean).join("\n");
  if (shared) {
    history.replaceState(null, "", `${window.location.pathname}#/courses/ajouter?t=${encodeURIComponent(shared)}`);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Appli installable et utilisable hors ligne (service worker Workbox) ; uniquement sur la version publiée.
if (import.meta.env.PROD) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
}
