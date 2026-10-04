import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH="/mijote/" en déploiement GitHub Pages (voir .github/workflows/pages.yml).
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
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
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: { fs: { allow: ["../.."] } },
  // Vitrine : tout le contenu (recettes, ingrédients) est embarqué dans le bundle.
  build: { chunkSizeWarningLimit: 1200 },
});
