// The instrument testbench (bench.html, src/bench): a page of its own beside the touch game. Build:
// npx vite build -c vite.bench.config.ts; single file: node tools/touch/build-artifact.mjs <out.html> dist/bench "Instrument Bench".
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  json: { stringify: true },
  base: "./",
  publicDir: false,
  build: {
    outDir: "dist/bench",
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL("./bench.html", import.meta.url)), output: { inlineDynamicImports: true } },
  },
});
