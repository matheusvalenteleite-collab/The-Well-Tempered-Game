/**
 * D540 (BRIEF-BANDS2: "a preset's samples ready in ≤3 s on throttled 4G"): each sound's recordings loaded from nothing (a new
 * browser context: no cache) over Lighthouse's slow 4G (150 ms round trip, 1.6 Mbit/s down: CDP Network.emulateNetworkConditions),
 * for its worst fugue (src/touch/budget.ts), as it is and slimmed (V2_SLIM), with its decoded MB (budget.ts, at a phone's 48 kHz).
 *   PORT=5199 node tools/playback/cpu/load-cost.mjs [sounds,comma,separated] [out.json]
 */
import fs from "node:fs";
import { LAUNCH, openProbe, playwright } from "./pw.mjs";
import { presetBudget } from "../../../src/touch/budget.ts";
import { PRESETS, V2_SLIM } from "../../../src/touch/sound.ts";

const sounds = process.argv[2] ? process.argv[2].split(",") : PRESETS.map((p) => p.id);
const out = process.argv[3];
const NET = { offline: false, latency: 150, downloadThroughput: (1.6e6 / 8) | 0, uploadThroughput: (750e3 / 8) | 0 };
const { chromium } = await playwright();
const browser = await chromium.launch(LAUNCH);
const rows = [];
for (const sound of sounds) {
  const now = presetBudget(sound);
  const slim = presetBudget(sound, undefined, V2_SLIM);
  const row = { sound, mbNow: now.mb, mbSlim: slim.mb, piece: now.piece, voice: now.voice };
  for (const [key, isSlim] of [["now", false], ["slim", true]]) {
    if (now.mb === 0) {
      row[`load_${key}`] = 0;
      continue;
    }
    const { ctx, page, cdp } = await openProbe(browser);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", NET);
    const r = await page.evaluate((o) => window.__load(o), { sound, piece: now.piece, voice: now.voice, slim: isSlim });
    row[`load_${key}`] = r.ms / 1000;
    row[`files_${key}`] = r.files;
    await ctx.close();
  }
  rows.push(row);
  console.log(`${sound.padEnd(20)} ${row.mbNow.toFixed(1).padStart(6)} MB → ${row.mbSlim.toFixed(1).padStart(5)} MB   ${row.load_now.toFixed(1).padStart(5)} s → ${row.load_slim.toFixed(1).padStart(5)} s  (${row.files_now ?? 0} → ${row.files_slim ?? 0} files)`);
}
await browser.close();
if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
