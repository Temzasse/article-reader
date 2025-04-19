import { defineConfig } from "vite";
import favicons from "@peterek/vite-plugin-favicons";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    favicons("public/vite.svg", {
      appName: "Arre",
      appShortName: "Arre",
      appDescription: "Article read-aloud app",
      developerName: "Teemu Taskula",
      developerURL: "https://github.com/Temzasse",
      lang: "en",
      background: "#ffffff",
      theme_color: "#002c6c",
      display: "standalone",
      start_url: ".",
      icons: {
        android: true,
        appleIcon: true,
        appleStartup: true,
        favicons: true,
        windows: false,
        yandex: false,
      },
    }),
  ],
});
