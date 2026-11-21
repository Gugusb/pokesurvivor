import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2020",
    outDir: "../js/ui/homepage-lib",
    emptyOutDir: true,
    lib: {
      entry: "src/main.tsx",
      name: "PokeHomepage",
      formats: ["iife"],
      fileName: () => "homepage.bundle.js",
      cssFileName: "homepage",
    },
    rollupOptions: { output: { assetFileNames: "[name][extname]" } },
  },
});
