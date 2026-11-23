/**
 * D970, D972: node tools/touch/canon-perf/run.cjs  (esbuild and Playwright): the ribbon's paint time a frame for each canon of
 * batch 1, the CPU throttled 4x (the phone model of D540), in Chromium.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "../../..");
const out = path.join(os.tmpdir(), "canon-perf.js");
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(__dirname, "harness.ts"), "--bundle", "--format=iife", `--outfile=${out}`, "--loader:.json=json", "--log-level=error"], { stdio: "inherit" });
const IDS = ["bwv988-03", "bwv988-06", "bwv988-09", "bwv988-12", "bwv988-15", "bwv988-18", "bwv988-21", "bwv988-24", "bwv988-27", "bwv773", "bwv779", "wtc1f08", "wtc1f15", "wtc1f20", "wtc2f02", "wtc2f03", "wtc2f09", "wtc2f22", "bwv1080-14", "wtc1f02", "wtc2f05", "bwv1079-3b", "bwv1079-3c", "bwv1079-2", "bwv1079-4", "bwv1079-7", "bwv1079-3d", "bwv1079-6", "bwv1079-3e", "bwv1079-9"];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(`<script>${fs.readFileSync(out, "utf8")}</script>`);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  let worst = 0;
  for (const id of IDS) {
    const r = await p.evaluate((id) => globalThis.canonPerf(id), id);
    worst = Math.max(worst, r.p95);
    console.log(`${id.padEnd(10)} frames ${r.frames}  mean ${r.mean} ms  p95 ${r.p95} ms  max ${r.max} ms`);
  }
  console.log(worst < 0.5 ? `canon-perf: ok (p95 under 0.5 ms at 4x)` : `canon-perf: OVER 0.5 ms (p95 ${worst})`);
  await b.close();
  process.exit(worst < 0.5 ? 0 : 1);
})();
