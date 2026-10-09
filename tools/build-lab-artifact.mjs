// Inline the choices lab's Vite build (vite.lab.config.ts, into dist/lab) into one HTML body
// fragment, as tools/build-artifact.mjs does for the game.
// Usage: npx vite build -c vite.lab.config.ts && node tools/build-lab-artifact.mjs <out.html>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const out = process.argv[2];
if (!out) throw new Error("usage: node tools/build-lab-artifact.mjs <out.html>");
const dir = "dist/lab/assets";
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith(".js"));
const css = files.filter((f) => f.endsWith(".css"));
if (js.length !== 1 || css.length !== 1) throw new Error(`expected one js and one css asset, got ${files.join(", ")}`);
const script = readFileSync(`${dir}/${js[0]}`, "utf8").replaceAll("</script", "<\\/script");
const style = readFileSync(`${dir}/${css[0]}`, "utf8").replaceAll("</style", "<\\/style");
writeFileSync(out, `<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Choices Lab</title>\n<style>${style}</style>\n<div id="root"></div>\n<script type="module">${script}</script>\n`);
console.log(`wrote ${out}`);
