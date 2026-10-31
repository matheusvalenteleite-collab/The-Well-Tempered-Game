import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { benchServiceWorker } from "./tools/bench/sw-plugin.ts";
import { playServiceWorker } from "./tools/play-app/sw-plugin.ts";

export default defineConfig(({ mode }) => ({
  // Relative asset paths, so the built game works from any folder (e.g. GitHub Pages).
  base: "./",
  // bench-sw.js, the bench's offline cache for the Home Screen (D195).
  // D380: play-sw.js, play.html's (installed from the home screen, offline).
  plugins: [react(), benchServiceWorker(), playServiceWorker()],
  json: { stringify: true },
  // `vite build --mode artifact`: one script, no chunks loaded on demand, for the single-file page
  // published on claude.ai (tools/build-artifact.mjs), whose file count is limited.
  // The Pages build also carries the touch game's page (touch.html, D158) and its instrument bench (bench.html, D170), and the minimal page for friends (play.html, D237).
  // D317: and THE LAB (lab.html), the mechanics laid open.
  build:
    mode === "artifact"
      ? { outDir: "dist-artifact", rollupOptions: { output: { inlineDynamicImports: true } } }
      : { rollupOptions: { input: { main: fileURLToPath(new URL("./index.html", import.meta.url)), touch: fileURLToPath(new URL("./touch.html", import.meta.url)), bench: fileURLToPath(new URL("./bench.html", import.meta.url)), play: fileURLToPath(new URL("./play.html", import.meta.url)), lab: fileURLToPath(new URL("./lab.html", import.meta.url)) } } },
}));
