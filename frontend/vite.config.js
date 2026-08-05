import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/tickets": "http://localhost:3000",
      "/tool-actions": "http://localhost:3000",
      "/evaluation": "http://localhost:3000",
    },
  },
});
