import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  // Relative asset paths, so the built game works from any folder (e.g. GitHub Pages).
  base: "./",
  plugins: [react()],
  json: { stringify: true },
  // `vite build --mode artifact`: one script, no chunks loaded on demand, for the single-file page
  // published on claude.ai (tools/build-artifact.mjs), whose file count is limited.
  // `--mode bench` (P29): the owner's test bench (test.html) alone, inlined the same way.
  // `--mode aotf` (P44): Contrapunctus XIV for four hands (aotf.html), inlined the same way.
  build:
    mode === "artifact"
      ? { outDir: "dist-artifact", rollupOptions: { output: { inlineDynamicImports: true } } }
      : mode === "bench"
        ? { outDir: "dist-bench", rollupOptions: { input: "test.html", output: { inlineDynamicImports: true } } }
        : mode === "aotf"
          ? { outDir: "dist-aotf", rollupOptions: { input: "aotf.html", output: { inlineDynamicImports: true } } }
          : {},
}));
