// The touch game (touch.html, src/touch): a page of its own beside the game. Build: npx vite build -c vite.touch.config.ts;
// single file: node tools/touch/build-artifact.mjs <out.html>.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  json: { stringify: true },
  base: "./",
  publicDir: false,
  build: {
    outDir: "dist/touch",
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL("./touch.html", import.meta.url)), output: { inlineDynamicImports: true } },
  },
});
