import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    exclude: [
      "same-runtime/dist/jsx-dev-runtime",
      "same-runtime/dist/jsx-runtime",
    ],
  },

  server: {
    host: "0.0.0.0",
    port: 5173,

    // ✅ autorise le domaine cloudflare tunnel
    allowedHosts: true, // ou mets le tableau avec ton host

    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});