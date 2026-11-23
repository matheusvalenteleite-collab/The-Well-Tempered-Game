/**
 * D645, THE BASS-ON-A-PHONE DATA (src/touch/bass-phone-data.ts) from the renders (render.cjs, measure.py --json): for each
 * of the 48 fugues on its own sound, two runs (the player on the top voice: the bass in the band; the player on the
 * bass), each voice alone through the phone model (integrated LUFS) with the balance's gain on it then (D508: the
 * player's level `l` on the player's voice, the band's trim `t` on the others: player-lift.ts liftDb, bandTrimDb), so the
 * test follows a re-measured balance; the bass's patch as measured (its phone path: `sig`); where the bass has an exciter
 * (Patch.phoneExcite), the bass alone at other mixes of it too ("@x<db>", "@xoff"), fitted by least squares in energy:
 * E(db) = E0 + Ex·10^(db/10) (the dry note and the exciter's harmonics), so the test reads the bass at the exciter's mix now.
 * usage: node tools/touch/bass-phone/fit.ts <measure.json> > src/touch/bass-phone-data.ts
 *        node tools/touch/bass-phone/fit.ts <measure.json> --aof > src/touch/bass-phone-aof.ts   (D711: the Art of Fugue's 20)
 *        node tools/touch/bass-phone/fit.ts <measure.json> --inv > src/touch/bass-phone-inv.ts   (D734: the Inventions and Sinfonias)
 *        node tools/touch/bass-phone/fit.ts <measure.json> --duet > src/touch/bass-phone-duet.ts   (D745: the Four Duets)
 *        node tools/touch/bass-phone/fit.ts <measure.json> --903 > src/touch/bass-phone-903.ts   (D775: the Chromatic Fugue)
 *        node tools/touch/bass-phone/fit.ts <measure.json> --906 > src/touch/bass-phone-906.ts   (D785: BWV 906 and 998)
 *        node tools/touch/bass-phone/fit.ts <measure.json> --988 > src/touch/bass-phone-988.ts   (D904: the Goldberg Variations)
 *        node tools/touch/bass-phone/fit.ts <measure.json> --1079 > src/touch/bass-phone-1079.ts   (D1045: the Musical Offering's canons and trio sonata)
 *        (D984: and the ready preludes, wtc1pNN, into bass-phone-data.ts beside their fugues)
 *        ONLY=<id,...> node tools/touch/bass-phone/fit.ts <measure.json> [--aof|--inv|...]   (D893: those pieces' rows alone, to splice)
 */
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../../../src/touch/fugue.ts";
import { PIECE_SOUND } from "../../../src/touch/piece-sound.ts";
import { bandTrimDb, liftDb } from "../../../src/touch/player-lift.ts";
import { bassSig, bassPatchOf } from "../../../src/touch/bass-phone.ts";
import { playerSound } from "../../../src/touch/sound.ts";
import { preludeReady } from "../../../src/touch/prelude-plan.ts";

type M = { piece: string; player: number; solo: number | "mix"; x: string | null; ph: number; full: number };
const ms: M[] = JSON.parse(readFileSync(process.argv[2], "utf8"));
const r1 = (x: number) => Math.round(x * 10) / 10;
const e = (db: number) => 10 ** (db / 10);
const dB = (x: number) => 10 * Math.log10(x);
// D711: the Art of Fugue's 20 (MORE BACH's, registered by loadExtras) into a file of their own.
const AOF = process.argv.includes("--aof");
// D734: the Inventions and Sinfonias' 30 (BWV 772-801) into a file of their own (--inv).
const INV = process.argv.includes("--inv");
// D745: the Four Duets (BWV 802-805) into a file of their own (--duet).
const DUET = process.argv.includes("--duet");
// D775: the Chromatic Fugue (BWV 903-2) into a file of its own (--903); D779: and the Albinoni Fugue (BWV 951).
const F903 = process.argv.includes("--903");
// D785: BWV 906's two movements and 998's three into a file of their own (--906).
const F906 = process.argv.includes("--906");
// D904: the Goldberg Variations' 31 into a file of their own (--988).
const F988 = process.argv.includes("--988");
// D1045: the Musical Offering's canons, Fuga canonica and trio sonata (bwv1079-2 to -9; the ricercars not) into a file of their own (--1079).
const F1079 = process.argv.includes("--1079");
if (AOF || INV || DUET || F903 || F906 || F988 || F1079) await loadExtras();
const isInv = (k: string) => /^bwv(7[789]\d|80[01])$/.test(k) && +k.slice(3) >= 772 && +k.slice(3) <= 801;
const ids = Object.keys(PIECE_SOUND).filter((k) => (F1079 ? /^bwv1079-\d[a-e]?$/.test(k) : F988 ? /^bwv988-\d\d$/.test(k) : F906 ? /^bwv(906|998)-\d$/.test(k) : F903 ? k === "bwv903-2" || k === "bwv951" : DUET ? /^bwv80[2-5]$/.test(k) : INV ? isInv(k) : AOF ? /^bwv1080-/.test(k) : /^wtc\df\d\d$/.test(k) || preludeReady(k))).sort();
const out: Record<string, unknown> = {};
const errs: string[] = [];
// D893: ONLY=<id,...> fits those pieces alone (their rows spliced into the group's file, the others' rows kept as measured).
const only = (process.env.ONLY ?? "").split(",").filter(Boolean);
for (const id of only.length ? ids.filter((k) => only.includes(k)) : ids) {
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
 * ${F1079 ? "D1045, THE MUSICAL OFFERING'S BASS ON A PHONE (D645's measure for its canons, Fuga canonica and trio sonata, each on its own sound). " : F988 ? "D904, THE GOLDBERG VARIATIONS' BASS ON A PHONE (D645's measure for its 31, each on its own sound). " : F906 ? "D785, BWV 906'S AND 998'S BASS ON A PHONE (D645's measure for their five movements, each on its own sound). " : F903 ? "D775, THE FANTASIAS AND FUGUES' BASS ON A PHONE (D645's measure for BWV 903-2 and, D779, BWV 951, each on its own sound). " : DUET ? "D745, THE FOUR DUETS' BASS ON A PHONE (D645's measure for BWV 802-805, each on its own sound). " : INV ? "D734, THE INVENTIONS' AND SINFONIAS' BASS ON A PHONE (D645's measure for their 30 pieces, each on its own sound). " : AOF ? "D711, THE ART OF FUGUE'S BASS ON A PHONE (D645's measure for its 20 pieces, each on its own sound). " : ""}D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: \`band\` the player on the top voice (the bass in the band), \`player\` the player on the
 * bass; \`lu\` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * \`at\` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * \`mix\` the whole (LUFS); \`sig\` the bass's patch as measured, \`db\` its exciter's mix then (Patch.phoneExcite); \`x\`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * ${errs.join("; ") || "none"}.
 */
import type { BassRun } from "./bass-phone.ts";

export const ${F1079 ? "BASS_PHONE_1079" : F988 ? "BASS_PHONE_988" : F906 ? "BASS_PHONE_906" : F903 ? "BASS_PHONE_903" : DUET ? "BASS_PHONE_DUET" : INV ? "BASS_PHONE_INV" : AOF ? "BASS_PHONE_AOF" : "BASS_PHONE"}: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
${Object.entries(out).map(([k, v]) => `  ${/^\w+$/.test(k) ? k : JSON.stringify(k)}: ${fmt(v)},`).join("\n")}
};`);
