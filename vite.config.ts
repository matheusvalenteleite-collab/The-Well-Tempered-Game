import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths, so the built game works from any folder (e.g. GitHub Pages).
  base: "./",
  plugins: [react()],
  json: { stringify: true },
});
