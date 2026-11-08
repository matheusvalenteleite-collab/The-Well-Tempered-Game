/**
 * D540: the decoded audio held over a real switch of sounds (piano, band A, band B, piano), each loaded for its piece as
 * the game loads it (Chip.prepare: every other sound's recordings let go), read after each from sampled.ts residentBytes.
 *   PORT=5199 node tools/playback/cpu/switch-resident.mjs [a,b,c,d] [piece]
 */
import { LAUNCH, openProbe, playwright } from "./pw.mjs";

const seq = (process.argv[2] ?? "pianoSampled,krautrock,salsa,pianoSampled").split(",");
const piece = process.argv[3] ?? "wtc1f01";
const { chromium } = await playwright();
const browser = await chromium.launch(LAUNCH);
const { page } = await openProbe(browser);
const steps = [];
for (const sound of seq) {
  const r = await page.evaluate((o) => window.__load(o), { sound, piece });
  // (Decodes still landing after prepare settles: read again a moment later.)
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => window.__resident());
  steps.push({ sound, mb: after });
  console.log(`${sound.padEnd(20)} resident ${after.toFixed(1)} MB (at the context's ${r.rate} Hz)`);
}
await browser.close();
console.log(JSON.stringify(steps));
