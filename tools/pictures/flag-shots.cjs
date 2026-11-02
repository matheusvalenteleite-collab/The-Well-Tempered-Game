// D493: photographs the entry flags of a few fugues (flag-harness.ts) in Chromium, at two phone widths.
// node tools/pictures/flag-shots.cjs OUT_DIR   (needs esbuild and playwright)
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const req = createRequire("/opt/node-tools/node_modules/");
const { chromium } = req("playwright");

const out = path.resolve(process.argv[2] || "flag-shots");
fs.mkdirSync(out, { recursive: true });
const root = path.resolve(__dirname, "../..");
const bundle = path.join(out, "flag-harness.js");
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(__dirname, "flag-harness.ts"), "--bundle", "--format=iife", `--outfile=${bundle}`, "--loader:.json=json", "--log-level=warning"], { stdio: "inherit" });
// [file, fugue, bar, quarters, title]
const SHOTS = [
  ["I-8-inversions", "wtc1f08", 54, 3, "I/8 b.54: stretto of the inverted subject"],
  ["I-8-augmentation", "wtc1f08", 63, 1, "I/8 b.63: bass augmented, soprano inverted"],
  ["I-8-augmented-soprano", "wtc1f08", 78, 0, "I/8 b.78: soprano augmented"],
  ["I-4-three-subjects", "wtc1f04", 52, 3, "I/4 b.52: SUBJECT 1, 2, 3"],
  ["II-9-diminution", "wtc2f09", 28, 7, "II/9 b.28: diminutions in stretto"],
  ["II-22-inversions", "wtc2f22", 74, 0, "II/22 b.74: inverted stretto"],
  ["II-22-thirds", "wtc2f22", 97, 0, "II/22 b.97: direct and inverted together"],
  ["II-3-diminution", "wtc2f03", 6, 0, "II/3 b.6: diminution, inverted diminution"],
];
const SIZES = [
  ["phone-small", 200, 110],
  ["phone-large", 300, 150],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<canvas id="c"></canvas><script>${fs.readFileSync(bundle, "utf8")}</script>`);
  for (const [file, id, bar, q, title] of SHOTS)
    for (const [size, w, h] of SIZES) {
      const url = await page.evaluate(
        ([id, bar, q, w, h, title]) => {
          const cv = document.getElementById("c");
          globalThis.flagShot(cv, id, bar, q, w, h, 3, title);
          return cv.toDataURL("image/png");
        },
        [id, bar, q, w, h, title],
      );
      fs.writeFileSync(path.join(out, `${file}-${size}.png`), Buffer.from(url.split(",")[1], "base64"));
    }
  await browser.close();
  console.log(`wrote ${SHOTS.length * SIZES.length} shots to ${out}`);
})();
