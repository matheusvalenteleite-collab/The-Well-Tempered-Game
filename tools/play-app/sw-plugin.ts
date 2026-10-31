// D380: writes play-sw.js beside play.html in the Pages build (vite.config.ts): tools/play-app/sw.js
// with play.html's app shell (its scripts and every chunk they import, Book I's data among them; the
// small chunks loaded on demand, under SMALL_CHUNK; their styles and fonts; the manifest and icons from
// public/play-app) and a version: VERSION (src/bench/version.ts) and a hash of the build, so every
// deploy is a new worker with a new cache. The large on-demand chunks (MORE BACH, the chorales, the
// concertos: behind the unlock) are cached by the worker when first loaded instead.
import type { Plugin } from "vite";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pageFiles } from "../bench/sw-plugin.ts";
import { VERSION } from "../../src/bench/version.ts";

/** Files of public/ the page links to (play.html's head and the manifest). */
export const PLAY_PUBLIC = ["play-app/manifest.webmanifest", "play-app/icon-180.png", "play-app/icon-192.png", "play-app/icon-512.png", "play-app/icon-maskable-512.png"];
/** An on-demand chunk at most this long (bytes) is cached with the shell. */
export const SMALL_CHUNK = 256 * 1024;

/** The worker's version: "wtc-1.84-" and twelve hex digits of the build's hash. */
export const playVersion = (hash: string, version = VERSION): string => `${version.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}-${hash.slice(0, 12)}`;

export function playServiceWorker(): Plugin {
  let outDir = "dist";
  let publicDir = "public";
  return {
    name: "play-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      publicDir = config.publicDir;
    },
    writeBundle(_options, bundle) {
      const html = bundle["play.html"];
      if (!html || html.type !== "asset") return;
      const list = pageFiles(bundle, "play.html", (_name, chunk) => chunk.code.length <= SMALL_CHUNK);
      const hash = createHash("sha256").update(VERSION).update(String(html.source));
      for (const f of list) hash.update(f);
      for (const f of PLAY_PUBLIC) hash.update(readFileSync(path.join(publicDir, f)));
      const version = playVersion(hash.digest("hex"));
      const template = readFileSync(fileURLToPath(new URL("./sw.js", import.meta.url)), "utf8");
      const sw = template.replace("__PLAY_VERSION__", version).replace("self.__PLAY_PRECACHE__", JSON.stringify([...list, ...PLAY_PUBLIC], null, 1));
      writeFileSync(path.join(outDir, "play-sw.js"), sw);
      this.info?.(`play-sw.js: ${list.length + PLAY_PUBLIC.length} files, version ${version}`);
    },
  };
}
