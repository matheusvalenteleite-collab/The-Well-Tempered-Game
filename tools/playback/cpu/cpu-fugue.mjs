/**
 * D540 (BRIEF-BANDS2: "no audio dropouts at 4× CPU throttle in Playwright, with a full four-voice fugue"): each sound plays
 * I/1's bars (all four voices sounding) through the game's engine with the CPU throttled 4× (CDP Emulation.setCPUThrottlingRate,
 * set once its recordings are loaded), and reports the audio clock's underruns (playbackStats), the scheduler's late notes,
 * long tasks and the frame rate. Usage, with the dev server up (`npx vite --port 5199 --strictPort`):
 *   PORT=5199 node tools/playback/cpu/cpu-fugue.mjs [sounds,comma,separated] [out.json]
 */
import fs from "node:fs";
import { LAUNCH, openProbe, playwright } from "./pw.mjs";

const DEFAULT = ["chip", "pianoSampled", "harpsichordSampled", "baroqueBand", "oboeTrio", "bachBrass", "jazzQuartet", "salsa", "chorinho", "abbeyRoad", "krautrock", "bossaNova", "petSounds", "krautrockV2", "abbeyRoadV2", "salsaV2", "bossaNovaV2", "chorinhoV2", "jazzQuartetV2", "baroqueBandV2", "bachBrassV2", "oboeTrioV2", "petSoundsV2"];
const sounds = process.argv[2] ? process.argv[2].split(",") : DEFAULT;
const out = process.argv[3];
const job = { piece: "wtc1f01", voice: 0, fromBar: 7, toBar: 14 };
const rate = Number(process.env.THROTTLE ?? 4);
const { chromium } = await playwright();
const browser = await chromium.launch(LAUNCH);
const rows = [];
for (const sound of sounds) {
  const { ctx, page, cdp } = await openProbe(browser, { phone: !!process.env.PHONE });
  await page.evaluate((o) => window.__load(o), { sound, piece: job.piece, voice: job.voice });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  const r = await page.evaluate((o) => window.__play(o), { ...job, sound });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  rows.push({ throttle: rate, ...r });
  console.log(`${sound.padEnd(20)} underruns ${String(r.underrunEvents).padStart(3)} (${(r.underrunMs ?? 0).toFixed(0)} ms)  late notes ${r.lateNotes}/${r.notes} (worst ${r.worstLateMs.toFixed(0)} ms)  long tasks ${r.longTasks} (longest ${r.longestTaskMs.toFixed(0)} ms)  ${r.fps.toFixed(0)} fps  clock lag ${r.clockLagMs.toFixed(0)} ms  ${r.residentMB.toFixed(1)} MB`);
  await ctx.close();
}
await browser.close();
if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const bad = rows.filter((r) => r.underrunEvents > 0);
console.log(bad.length ? `DROPOUTS: ${bad.map((r) => r.sound).join(", ")}` : "no dropouts");
