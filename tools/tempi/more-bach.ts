/**
 * D340 (WTC 1.54): the MORE BACH and CHORALES tabs' tempi, in data/tempi/more-bach.json (read by
 * src/touch/tempi.ts beside tempi.json).
 *
 *   node tools/tempi/more-bach.ts
 *
 * The WTC's tempi come from MusicBrainz track lengths (compute.ts, D199). The new pieces have no such
 * sample yet (one request a second for hundreds of releases); their REFERENCE is editorial: a moderate,
 * historically informed tempo for each, about what harpsichord, organ and period-instrument recordings
 * take (the Art of Fugue: Leonhardt, Koopman, Musica Antiqua Köln, Akademie für Alte Musik; the
 * Inventions and Sinfonias: harpsichordists' usual pace; the concerto: period bands, a little under
 * their usual speed; the chorales: the chorale mode's own tempo, ♩ = 60, src/ui/ChoraleStudy.tsx).
 * NORMAL, the tempo played, is then made as compute.ts makes it (D312): the reference, lowered so that
 * the busiest voice keeps to 5.5 notes a second, but never under 75% of the reference (standing in for
 * "never under the slowest recording"). SLOW as compute.ts. `median` holds the reference (difficulty
 * and stars are measured at it, as the WTC's at the recordings' median). `n` is 0: no recordings.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
type Piece = { id: string; meter: string; tpq: number; voices: [number, number, number, number][][] };
const load = (f: string): Piece[] => JSON.parse(readFileSync(new URL(`data/touch/${f}`, ROOT), "utf8"));
const pieces = [...load("more-bach.json"), ...load("chorales.json")];

/** Reference tempi, quarter notes a minute (in the meter's beat in the comment). */
const REFERENCE: Record<string, number> = {
  // The Art of Fugue.
  "bwv1080-01": 72, "bwv1080-02": 76, "bwv1080-03": 72, "bwv1080-04": 96, "bwv1080-05": 80,
  "bwv1080-06": 56, "bwv1080-07": 56, "bwv1080-08": 88, "bwv1080-09": 100, "bwv1080-10": 84, "bwv1080-11": 80,
  "bwv1080-12r": 84, "bwv1080-12i": 84, // 𝅗𝅥 = 42
  "bwv1080-13r": 96, "bwv1080-13i": 96,
  "bwv1080-c14": 72, "bwv1080-c15": 63 /* ♪. = 84 */, "bwv1080-c16": 75 /* ♩. = 50 */, "bwv1080-c17": 96,
  // The Musical Offering.
  "bwv1079-ric3": 88, "bwv1079-ric6": 72,
  // The Inventions.
  bwv772: 72, bwv773: 66, bwv774: 69 /* ♩. = 46 */, bwv775: 75 /* ♩. = 50 */, bwv776: 72, bwv777: 66 /* ♩. = 44 */,
  bwv778: 60, bwv779: 112, bwv780: 72, bwv781: 90 /* ♩. = 60 */, bwv782: 60, bwv783: 84 /* ♩. = 56 */,
  bwv784: 72, bwv785: 56, bwv786: 72,
  // The Sinfonias.
  bwv787: 76, bwv788: 69 /* ♩. = 46 */, bwv789: 72, bwv790: 60, bwv791: 50, bwv792: 75 /* ♩. = 50 */,
  bwv793: 56, bwv794: 80, bwv795: 46, bwv796: 96, bwv797: 60 /* ♩. = 40 */, bwv798: 80,
  bwv799: 66 /* ♩. = 44 */, bwv800: 60, bwv801: 63 /* ♪. = 84 */,
  // The Concerto for Two Violins: moderate, historically informed (period bands play I at about ♩ = 100-112,
  // II at ♩. = 40-46, III at ♩ = 126-144).
  "bwv1043-1": 96, "bwv1043-2": 60 /* ♩. = 40 */, "bwv1043-3": 120,
  // D341: the motet BWV 228 (choirs' usual pace: the double-choir opening ♩ 84, the fugue under the chorale ♩ 72);
  // the cantata BWV 54 (the first aria's slow ♩ 56; the fugal aria alla breve, 𝅗𝅥 = 56).
  "bwv228-1": 84, "bwv228-2": 72, "bwv54-1": 56, "bwv54-3": 112,
};
/** The chorales: the chorale mode's ♩ = 60; a chorale in 3/2 at 𝅗𝅥 = 40. */
const choraleRef = (p: Piece) => (p.meter === "3/2" ? 80 : 60);

/** The busiest voice's 90th-percentile onsets a second (2-second window, every 0.5 s) at ♩ = 60 (compute.ts's). */
function busiest60(f: Piece): number {
  let worst = 0;
  for (const v of f.voices) {
    const ons = [...new Set(v.map((n) => n[0]))].sort((a, b) => a - b).map((t) => t / f.tpq);
    if (ons.length < 2) continue;
    const d: number[] = [];
    let a = 0;
    let b = 0;
    for (let t = ons[0]; t < ons[ons.length - 1]; t += 0.5) {
      while (a < ons.length && ons[a] < t) a++;
      while (b < ons.length && ons[b] < t + 2) b++;
      d.push((b - a) / 2);
    }
    const s = d.sort((x, y) => x - y);
    worst = Math.max(worst, s[Math.min(s.length - 1, Math.floor(0.9 * s.length))]);
  }
  return worst;
}

/** The conventional beat of a meter (compute.ts's beatUnit; 12/8, 9/16 added). */
function beatUnit(meter: string): { unit: string; perQuarter: number } {
  const [n, d] = meter.split("/").map(Number);
  if (d === 2) return { unit: "𝅗𝅥", perQuarter: 0.5 };
  if (d === 4) return n === 6 ? { unit: "𝅗𝅥.", perQuarter: 1 / 3 } : { unit: "♩", perQuarter: 1 };
  if (d === 8) return n % 3 === 0 && n > 3 ? { unit: "♩.", perQuarter: 2 / 3 } : { unit: "♪", perQuarter: 2 };
  if (d === 16) return { unit: "♪.", perQuarter: 4 / 3 };
  throw new Error(meter);
}

const GAME_LOAD = 5.5, FLOOR_SHARE = 0.75;
const SLOW_SHARE = 0.62, MIN_SHARE = 0.45, LOAD = 3.0, FLOOR = 30;
const even = (x: number) => Math.round(x / 2) * 2;

const out: string[] = [];
for (const f of pieces) {
  const ref = f.id.startsWith("chor") ? choraleRef(f) : REFERENCE[f.id];
  if (!ref) throw new Error(`no reference tempo for ${f.id}`);
  const l = busiest60(f);
  const normal = Math.round(Math.max(FLOOR_SHARE * ref, Math.min(ref, (GAME_LOAD / l) * 60)));
  const slow = Math.max(FLOOR, even(Math.max(MIN_SHARE * normal, Math.min(SLOW_SHARE * normal, (LOAD / l) * 60))));
  const { unit, perQuarter } = beatUnit(f.meter);
  const t = {
    normal, median: ref, slow, unit, unitBpm: { normal: Math.round(normal * perQuarter), slow: Math.round(slow * perQuarter) },
    n: 0, iqr: [ref, ref], range: [ref, ref], busiest: Math.round(l * (normal / 60) * 10) / 10, flag: "editorial",
  };
  out.push(`  ${JSON.stringify(f.id)}: ${JSON.stringify(t)}`);
  if (!f.id.startsWith("chor") || f.id === "chor001") console.log(`${f.id.padEnd(14)} ${f.meter.padEnd(5)} ref ${ref} normal ${normal} slow ${slow} (${unit} ${t.unitBpm.normal}) busiest ${t.busiest}/s`);
}
writeFileSync(new URL("data/tempi/more-bach.json", ROOT), `{\n${out.join(",\n")}\n}\n`);
console.log(`wrote data/tempi/more-bach.json: ${out.length} pieces`);
