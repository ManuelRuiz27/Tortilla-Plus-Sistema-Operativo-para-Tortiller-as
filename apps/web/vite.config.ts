import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const useMocksFlag = process.env.VITE_USE_MOCKS ?? env.VITE_USE_MOCKS;

  if (mode === "production" && useMocksFlag !== "false") {
    throw new Error('Production build requires VITE_USE_MOCKS="false".');
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "Tortilla Plus",
          short_name: "Tortilla Plus",
          description: "PWA operativa para POS y gerencia de tortillerias.",
          theme_color: "#b56b1f",
          background_color: "#faf7ef",
          display: "standalone",
          start_url: "/login",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        }
      })
    ]
  };
});
