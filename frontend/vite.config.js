import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendProxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/tickets": backendProxyTarget,
      "/tool-actions": backendProxyTarget,
      "/evaluation": backendProxyTarget,
    },
  },
});
