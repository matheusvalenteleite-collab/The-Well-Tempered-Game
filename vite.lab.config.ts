// The choices lab: a page of its own beside the game (src/lab). Build: npx vite build -c vite.lab.config.ts; single file: node tools/build-lab-artifact.mjs <out.html>.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  json: { stringify: true },
  base: "./",
  publicDir: false,
  build: { outDir: "dist/lab", emptyOutDir: true, rollupOptions: { input: fileURLToPath(new URL("./lab/index.html", import.meta.url)) } },
});
