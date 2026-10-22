import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => ({
  // Relative asset paths, so the built game works from any folder (e.g. GitHub Pages).
  base: "./",
  plugins: [react()],
  json: { stringify: true },
  // `vite build --mode artifact`: one script, no chunks loaded on demand, for the single-file page
  // published on claude.ai (tools/build-artifact.mjs), whose file count is limited.
  // The Pages build also carries the touch game's page (touch.html, D158) and its instrument bench (bench.html, D170).
  build:
    mode === "artifact"
      ? { outDir: "dist-artifact", rollupOptions: { output: { inlineDynamicImports: true } } }
      : { rollupOptions: { input: { main: fileURLToPath(new URL("./index.html", import.meta.url)), touch: fileURLToPath(new URL("./touch.html", import.meta.url)), bench: fileURLToPath(new URL("./bench.html", import.meta.url)) } } },
}));
