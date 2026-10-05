import { readFileSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH="/mijote/" en déploiement GitHub Pages (voir .github/workflows/pages.yml).
const base = process.env.BASE_PATH ?? "/";
// Une seule version pour toute l'appli : celle du package.json à la racine (affichée dans Réglages → À propos).
const { version } = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../package.json"), "utf8")) as { version: string };

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Mijoté",
        short_name: "Mijoté",
        description: "Les repas de saison de la semaine, à partager avec bébé.",
        lang: "fr",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "portrait",
        background_color: "#f7f1e5",
        theme_color: "#f7f1e5",
        // Partager un texte vers Mijoté (depuis Gemini, Keep, Messages…) l'ajoute à la liste de courses.
        share_target: { action: base, method: "GET", params: { title: "titre", text: "t", url: "lien" } },
        shortcuts: [
          { name: "Ajouter aux courses", short_name: "Courses", url: `${base}#/courses/ajouter`, icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
          { name: "Scanner un produit", short_name: "Scanner", url: `${base}#/scanner`, icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
        ],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: `${base}index.html`,
        // Serveur du foyer : l'API n'est jamais servie par le cache.
        navigateFallbackDenylist: [/\/api\//],
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // `npm run dev:server` à côté : l'appli en dev parle au serveur du foyer (sinon, c'est la vitrine).
  server: { fs: { allow: ["../.."] }, proxy: { "/api": { target: "http://localhost:8080", changeOrigin: false } } },
  // Vitrine : tout le contenu (recettes, ingrédients) est embarqué dans le bundle.
  build: { chunkSizeWarningLimit: 1200 },
});
