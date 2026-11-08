/**
 * D542, D542 (BRIEF-BANDS2: "a preset's samples ready in ≤3 s on throttled 4G"): each sound's recordings loaded from nothing
 * (a new browser context: no cache) for its worst fugue (src/touch/budget.ts), timed to the first notes with real samples
 * (the opening's zones) and to everything; over two profiles (CDP Network.emulateNetworkConditions): Lighthouse's slow 4G
 * (150 ms round trip, 1.6 Mbit/s down) and a mid 4G (85 ms, 9 Mbit/s); "before" (MP3 only, every fetch at once, no opening
 * first: sampled.ts setLoadPolicy) and "after" (the smallest decodable copy, the opening first, six at once).
 *   PORT=5199 node tools/playback/cpu/load-cost.mjs [sounds,comma,separated|""] [out.json] [modes: before,after] [profiles: slow,mid]
 */
import fs from "node:fs";
import { LAUNCH, openProbe, playwright } from "./pw.mjs";
import { presetBudget } from "../../../src/touch/budget.ts";
import { PRESETS } from "../../../src/touch/sound.ts";

export const PROFILES = {
  slow: { offline: false, latency: 150, downloadThroughput: (1.6e6 / 8) | 0, uploadThroughput: (750e3 / 8) | 0 },
  mid: { offline: false, latency: 85, downloadThroughput: (9e6 / 8) | 0, uploadThroughput: (2e6 / 8) | 0 },
};
const sounds = process.argv[2] ? process.argv[2].split(",") : PRESETS.map((p) => p.id);
const out = process.argv[3];
const modes = (process.argv[4] ?? "before,after").split(",");
const profiles = (process.argv[5] ?? "slow,mid").split(",");
const { chromium } = await playwright();
const browser = await chromium.launch(LAUNCH);
const jobs = [];
for (const sound of sounds) {
  const b = presetBudget(sound);
  if (b.mb === 0) continue;
  for (const profile of profiles) for (const mode of modes) jobs.push({ sound, profile, mode, piece: b.piece, voice: b.voice, mb: b.mb });
}
const rows = [];
let next = 0;
await Promise.all(
  Array.from({ length: Number(process.env.WORKERS ?? 3) }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      const { ctx, page, cdp } = await openProbe(browser);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", PROFILES[j.profile]);
      const r = await page.evaluate((o) => window.__load(o), { sound: j.sound, piece: j.piece, voice: j.voice, before: j.mode === "before" });
      await ctx.close();
      const row = { ...j, firstS: r.firstMs / 1000, allS: r.ms / 1000, wireMB: r.wireMB, files: r.files, formats: r.formats };
      rows.push(row);
      console.log(`${j.sound.padEnd(20)} ${j.profile.padEnd(4)} ${j.mode.padEnd(6)} first ${row.firstS.toFixed(1).padStart(5)} s  all ${row.allS.toFixed(1).padStart(5)} s  ${row.wireMB.toFixed(2)} MB in ${r.files} files (${r.formats.join("/")})`);
    }
  }),
);
await browser.close();
if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
