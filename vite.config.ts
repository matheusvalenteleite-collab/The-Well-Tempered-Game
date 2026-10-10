import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  // Relative asset paths, so the built game works from any folder (e.g. GitHub Pages).
  base: "./",
  plugins: [react()],
  json: { stringify: true },
  // `vite build --mode artifact`: one script, no chunks loaded on demand, for the single-file page
  // published on claude.ai (tools/build-artifact.mjs), whose file count is limited.
  build: mode === "artifact" ? { outDir: "dist-artifact", rollupOptions: { output: { inlineDynamicImports: true } } } : {},
}));
