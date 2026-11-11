/**
 * D645, THE BASS-ON-A-PHONE DATA (src/touch/bass-phone-data.ts) from the renders (render.cjs, measure.py --json): for each
 * of the 48 fugues on its own sound, two runs (the player on the top voice: the bass in the band; the player on the
 * bass), each voice alone through the phone model (integrated LUFS) with the balance's gain on it then (D508: the
 * player's level `l` on the player's voice, the band's trim `t` on the others: player-lift.ts liftDb, bandTrimDb), so the
 * test follows a re-measured balance; the bass's patch as measured (its phone path: `sig`); where the bass has an exciter
 * (Patch.phoneExcite), the bass alone at other mixes of it too ("@x<db>", "@xoff"), fitted by least squares in energy:
 * E(db) = E0 + Ex·10^(db/10) (the dry note and the exciter's harmonics), so the test reads the bass at the exciter's mix now.
 * usage: node tools/touch/bass-phone/fit.ts <measure.json> > src/touch/bass-phone-data.ts
 */
import { readFileSync } from "node:fs";
import { fugueById } from "../../../src/touch/fugue.ts";
import { PIECE_SOUND } from "../../../src/touch/piece-sound.ts";
import { bandTrimDb, liftDb } from "../../../src/touch/player-lift.ts";
import { bassSig, bassPatchOf } from "../../../src/touch/bass-phone.ts";
import { playerSound } from "../../../src/touch/sound.ts";

type M = { piece: string; player: number; solo: number | "mix"; x: string | null; ph: number; full: number };
const ms: M[] = JSON.parse(readFileSync(process.argv[2], "utf8"));
const r1 = (x: number) => Math.round(x * 10) / 10;
const e = (db: number) => 10 ** (db / 10);
const dB = (x: number) => 10 * Math.log10(x);
const ids = Object.keys(PIECE_SOUND).filter((k) => /^wtc\df\d\d$/.test(k)).sort();
const out: Record<string, unknown> = {};
const errs: string[] = [];
for (const id of ids) {
  const f = fugueById(id);
  const nv = f.voices.length, b = nv - 1;
  const s = playerSound(PIECE_SOUND[id]);
  const pt = bassPatchOf(s, f);
  const db = pt?.phoneExcite?.db ?? null;
  const row: Record<string, unknown> = { s, sig: bassSig(pt) , db };
  for (const [key, pv] of [["band", 0], ["player", b]] as const) {
    const of = (u: number | "mix", x: string | null = null) => ms.find((m) => m.piece === id && m.player === pv && m.solo === u && m.x === x);
    const lu = Array.from({ length: nv }, (_, u) => of(u)?.ph);
    if (lu.some((x) => x === undefined)) throw new Error(`${id} p${pv}: a voice not rendered`);
    const at = Array.from({ length: nv }, (_, u) => r1(u === pv ? liftDb(id, s, u, nv, true) : bandTrimDb(id, s, u, nv, true)));
    const run: Record<string, unknown> = { lu, at, mix: of("mix")?.ph ?? null };
    // the exciter's fit: the bass alone at its mixes (the render at the patch's own and the variants)
    const pts = ms.filter((m) => m.piece === id && m.player === pv && m.solo === b && m.x !== null).map((m) => ({ g: m.x === "off" ? 0 : e(+m.x!), E: e(m.ph) }));
    if (db !== null && pts.length) {
      pts.push({ g: e(db), E: e(lu[b]!) });
      // least squares for E0, Ex (E = E0 + Ex g), each point weighted by 1/E (a relative error)
      let a11 = 0, a12 = 0, a22 = 0, y1 = 0, y2 = 0;
      for (const p of pts) { const w = 1 / (p.E * p.E); a11 += w; a12 += w * p.g; a22 += w * p.g * p.g; y1 += w * p.E; y2 += w * p.E * p.g; }
      const det = a11 * a22 - a12 * a12;
      const E0 = (y1 * a22 - y2 * a12) / det, Ex = (a11 * y2 - a12 * y1) / det;
      run.x = [r1(dB(E0)), r1(dB(Ex))];
      errs.push(`${id} ${key} ${pts.map((p) => `${r1(dB(p.E))}/${r1(dB(E0 + Ex * p.g))}`).join(" ")}`);
    }
    row[key] = run;
  }
  out[id] = row;
}
const fmt = (o: unknown) => JSON.stringify(o);
console.log(`/**
 * D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: \`band\` the player on the top voice (the bass in the band), \`player\` the player on the
 * bass; \`lu\` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * \`at\` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * \`mix\` the whole (LUFS); \`sig\` the bass's patch as measured, \`db\` its exciter's mix then (Patch.phoneExcite); \`x\`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * ${errs.join("; ") || "none"}.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
${Object.entries(out).map(([k, v]) => `  ${k}: ${fmt(v)},`).join("\n")}
};`);
