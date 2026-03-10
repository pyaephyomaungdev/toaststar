import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      toaststar: resolve(__dirname, "../src/index.ts"),
    },
  },
  server: {
    fs: {
      allow: [resolve(__dirname, "..")],
    },
  },
});
