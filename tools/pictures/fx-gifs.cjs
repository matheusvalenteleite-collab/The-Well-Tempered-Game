// D383: films each subject effect (fx-harness.ts) in Chromium and writes a GIF of each.
// node tools/pictures/fx-gifs.cjs OUT_DIR   (needs esbuild and playwright; python3 with PIL joins the frames)
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const req = createRequire("/opt/node-tools/node_modules/");
const { chromium } = req("playwright");

const out = path.resolve(process.argv[2] || "fx-gifs");
fs.mkdirSync(out, { recursive: true });
const root = path.resolve(__dirname, "../..");
const bundle = path.join(out, "fx-harness.js");
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(__dirname, "fx-harness.ts"), "--bundle", "--format=iife", `--outfile=${bundle}`, "--loader:.json=json", "--log-level=warning"], { stdio: "inherit" });
const FX = ["FIRE", "GLINT", "SMOKE", "EMBERS", "SHIMMER", "RIPPLE", "PULSE", "RAYS", "HOP", "TEARS"];
const N = 48;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<canvas id="c"></canvas><script>${fs.readFileSync(bundle, "utf8")}</script>`);
  for (const fx of FX) {
    const dir = path.join(out, `frames-${fx}`);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < N; i++) {
      const url = await page.evaluate(([fx, i]) => {
        const cv = document.getElementById("c");
        globalThis.fxFrame(cv, fx, i, 3);
        return cv.toDataURL("image/png");
      }, [fx, i]);
      fs.writeFileSync(path.join(dir, `${String(i).padStart(3, "0")}.png`), Buffer.from(url.split(",")[1], "base64"));
    }
    const gif = path.join(out, `fx-${fx.toLowerCase()}.gif`);
    execFileSync("python3", ["-c", `
import glob,sys
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/*.png'))
ims=[Image.open(f).convert('RGB').quantize(colors=128, method=Image.Quantize.MEDIANCUT) for f in fs]
ims[0].save(sys.argv[2], save_all=True, append_images=ims[1:], duration=42, loop=0, disposal=1)
`, dir, gif]);
    fs.rmSync(dir, { recursive: true });
    console.log(gif);
  }
  await browser.close();
  fs.rmSync(bundle);
})();
