// Inline the touch game's Vite build (vite.touch.config.ts, into dist/touch) into one HTML body
// fragment, as tools/build-artifact.mjs does for the game.
// Usage: npx vite build -c vite.touch.config.ts && node tools/touch/build-artifact.mjs <out.html> [dist dir] [title]
// (the testbench: dist/bench "Instrument Bench").
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const out = process.argv[2];
if (!out) throw new Error("usage: node tools/touch/build-artifact.mjs <out.html>");
const dir = `${process.argv[3] ?? "dist/touch"}/assets`;
const title = process.argv[4] ?? "Fugue Thumbs";
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith(".js"));
const css = files.filter((f) => f.endsWith(".css"));
if (js.length !== 1 || css.length !== 1) throw new Error(`expected one js and one css asset, got ${files.join(", ")}`);
const script = readFileSync(`${dir}/${js[0]}`, "utf8").replaceAll("</script", "<\\/script");
const style = readFileSync(`${dir}/${css[0]}`, "utf8").replaceAll("</style", "<\\/style");
// The bench carries the font in its styles (D195); the touch game still links Google Fonts.
const selfHosted = /@font-face\s*\{[^}]*Press Start 2P/.test(style);
const font = selfHosted ? "" : '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">\n';
writeFileSync(out, `<title>${title}</title>\n<meta name="theme-color" content="#0b0d18">\n${font}<style>${style}</style>\n<div id="root"></div>\n<script type="module">${script}</script>\n`);
console.log(`wrote ${out}`);
