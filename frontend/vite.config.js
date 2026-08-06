import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendProxyTarget = process.env.VITE_PROXY_TARGET || "https://trustdesk-capstone-airtribe.onrender.com/";

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
