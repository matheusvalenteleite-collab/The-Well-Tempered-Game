// Inline the touch game's Vite build (vite.touch.config.ts, into dist/touch) into one HTML body
// fragment, as tools/build-artifact.mjs does for the game.
// Usage: npx vite build -c vite.touch.config.ts && node tools/touch/build-artifact.mjs <out.html>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const out = process.argv[2];
if (!out) throw new Error("usage: node tools/touch/build-artifact.mjs <out.html>");
const dir = "dist/touch/assets";
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith(".js"));
const css = files.filter((f) => f.endsWith(".css"));
if (js.length !== 1 || css.length !== 1) throw new Error(`expected one js and one css asset, got ${files.join(", ")}`);
const script = readFileSync(`${dir}/${js[0]}`, "utf8").replaceAll("</script", "<\\/script");
const style = readFileSync(`${dir}/${css[0]}`, "utf8").replaceAll("</style", "<\\/style");
const font = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">';
writeFileSync(out, `<title>Fugue Thumbs</title>\n<meta name="theme-color" content="#0b0d18">\n${font}\n<style>${style}</style>\n<div id="root"></div>\n<script type="module">${script}</script>\n`);
console.log(`wrote ${out}`);
