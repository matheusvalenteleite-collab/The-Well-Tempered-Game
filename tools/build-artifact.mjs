// Inline the Vite build into one HTML body fragment (for publishing as a single-file page).
// Usage: npm run build:artifact && node tools/build-artifact.mjs <out.html> [dist folder] [title]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const out = process.argv[2];
if (!out) throw new Error("usage: node tools/build-artifact.mjs <out.html>");
const dir = `${process.argv[3] ?? "dist-artifact"}/assets`;
const title = process.argv[4] ?? "The Well-Tempered Game";
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith(".js"));
const css = files.filter((f) => f.endsWith(".css"));
if (js.length !== 1 || css.length !== 1) throw new Error(`expected one js and one css asset, got ${files.join(", ")}`);
const script = readFileSync(`${dir}/${js[0]}`, "utf8").replaceAll("</script", "<\\/script");
const style = readFileSync(`${dir}/${css[0]}`, "utf8").replaceAll("</style", "<\\/style");
writeFileSync(out, `<meta charset="utf-8">\n<title>${title}</title>\n<style>${style}</style>\n<div id="root"></div>\n<script type="module">${script}</script>\n`);
console.log(`wrote ${out}`);
