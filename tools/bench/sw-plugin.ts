// D195: writes bench-sw.js beside bench.html in the Pages build (vite.config.ts): tools/bench/sw.js
// with the files bench.html needs (its scripts, every chunk they import, their styles and the fonts the
// styles name, the manifest and icons from public/bench-app) and a version hashed from them.
// (public/bench-app, not public/bench: vite.bench.config.ts empties dist/bench when it builds.)
import type { Plugin, Rollup } from "vite";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Files of public/ the page links to (bench.html's head and the manifest). */
const PUBLIC_FILES = ["bench-app/manifest.webmanifest", "bench-app/icon-180.png", "bench-app/icon-192.png", "bench-app/icon-512.png", "bench-app/icon-maskable-512.png"];

export function benchServiceWorker(): Plugin {
  let outDir = "dist";
  let publicDir = "public";
  return {
    name: "bench-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      publicDir = config.publicDir;
    },
    writeBundle(_options, bundle) {
      const html = bundle["bench.html"];
      if (!html || html.type !== "asset") return;
      const list = pageFiles(bundle, "bench.html");
      const hash = createHash("sha256").update(String(html.source));
      for (const f of list) hash.update(f);
      for (const f of PUBLIC_FILES) hash.update(readFileSync(path.join(publicDir, f)));
      const version = hash.digest("hex").slice(0, 12);
      const template = readFileSync(fileURLToPath(new URL("./sw.js", import.meta.url)), "utf8");
      const sw = template
        .replace("__BENCH_VERSION__", version)
        .replace("self.__BENCH_PRECACHE__", JSON.stringify([...list, ...PUBLIC_FILES], null, 1));
      writeFileSync(path.join(outDir, "bench-sw.js"), sw);
      this.info?.(`bench-sw.js: ${list.length + PUBLIC_FILES.length} files, version ${version}`);
    },
  };
}

/**
 * The files a built page needs: the page, its scripts and every chunk they import (with `dynamic`, the
 * chunks they load on demand too), their styles and the fonts the styles name, sorted. D380: shared by
 * play.html's worker (tools/play-app/sw-plugin.ts), which takes only the small on-demand chunks.
 */
export function pageFiles(bundle: Rollup.OutputBundle, page: string, dynamic: boolean | ((name: string, item: Rollup.OutputChunk) => boolean) = true): string[] {
  const html = bundle[page];
  if (!html || html.type !== "asset") return [];
  const files = new Set<string>([page]);
  const add = (ref: string) => {
    const name = path.posix.normalize(ref.replace(/^\.\//, ""));
    const item = bundle[name];
    if (!item || files.has(name)) return;
    files.add(name);
    if (item.type === "chunk") {
      for (const i of item.imports) add(i);
      for (const i of item.dynamicImports) {
        const d = bundle[i];
        if (dynamic === true || (typeof dynamic === "function" && d?.type === "chunk" && dynamic(i, d))) add(i);
      }
      for (const c of item.viteMetadata?.importedCss ?? []) add(c);
      for (const a of item.viteMetadata?.importedAssets ?? []) add(a);
    } else if (name.endsWith(".css")) {
      for (const m of String(item.source).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g))
        if (!m[1].startsWith("data:")) add(path.posix.join(path.posix.dirname(name), m[1]));
    }
  };
  for (const m of String(html.source).matchAll(/\s(?:src|href)="([^"]+)"/g)) add(m[1]);
  return [...files].sort();
}
