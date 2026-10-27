/**
 * D270: writes data/touch/tutorial.json, the pieces the TUTORIAL teaches with (not in the game's
 * lists): Bach's Invention No. 1 in C major, BWV 772 (data/wtc/inventions.json, from the Humdrum
 * encoding), in the touch game's shape (src/touch/fugue.ts TouchFugue), as a two-voice "fugue": its
 * subject the opening figure of seven semiquavers (C D E F D E C), found in both voices, in its
 * original form and inverted (the steps' letters: up 1, 1, 1, down 2, up 1, down 2; the inversion
 * mirrored), keyed as the fugues' entries are (tools/touch/analysis.ts); its cadences as theirs.
 * Run: node tools/touch/tutorial.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { buildEntries, findCadences, keySpeller, type RawEntry } from "./analysis.ts";

type Note = [number, number, number, number];
// D340: from the Mutopia Project's edition (Jeff Covey, CC BY-SA 3.0; data/touch/more-bach.json, tools/touch/more-bach.ts),
// no longer from the Humdrum encoding (Huron 1994: its rights statement reserves derivative electronic formats).
// The notes, bars and spelling are the same (tools/touch/more-bach-check.ts: 22 bars, 100% of the attacks).
type Touch = { id: string; number: number; key: string; bwv: string; meter: string; length: number; bars: { n: number; on: number }[]; voices: Note[][]; spell: Record<string, string> };
const mutopia: Touch[] = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/touch/more-bach.json", import.meta.url)), "utf8"));
const inv: WtcPiece[] = mutopia
  .filter((f) => f.id === "bwv772")
  .map((f) => ({ id: "inven01", book: 0, number: f.number, kind: "invention", key: "C", mode: "major", bwv: f.bwv, meter: f.meter, length: f.length, bars: f.bars, voices: f.voices.map((v) => v.map(([on, dur, midi]) => [on, dur, f.spell[midi], 0])) }));
const SUBJECT_STEPS = [1, 1, 1, -2, 1, -2];
const SIXTEENTH = TPQ / 4;

function invention(id: string) {
  const p = inv.find((x) => x.id === id)!;
  const spell: Record<number, string> = {};
  const voices: Note[][] = p.voices.map((v) =>
    v
      .filter(([, dur]) => dur > 0)
      .map(([on, dur, pitch]) => {
        const sp = parsePitch(pitch);
        spell[sp.midi] ??= pitch;
        return [on, dur, sp.midi, sp.diatonic] as Note;
      })
      .sort((a, b) => a[0] - b[0] || b[2] - a[2]),
  );
  const key = p.mode === "minor" ? p.key.toLowerCase() : p.key;
  const piece = { tpq: TPQ, meter: p.meter, bars: p.bars, length: p.length, voices, key };
  const speller = keySpeller(p.voices.flatMap((v) => v.map((n) => n[2])));
  // The subject's statements: seven semiquavers in a row, one after another, the steps the subject's (or mirrored).
  const raw: RawEntry[] = [];
  let first: number | null = null;
  voices.forEach((v, voice) => {
    for (let i = 0; i + 7 <= v.length; i++) {
      const w = v.slice(i, i + 7);
      if (w.some((n, k) => n[1] !== SIXTEENTH || (k > 0 && n[0] !== w[k - 1][0] + SIXTEENTH))) continue;
      const steps = w.slice(1).map((n, k) => n[3] - w[k][3]);
      const plain = steps.every((s, k) => s === SUBJECT_STEPS[k]);
      const mirror = steps.every((s, k) => s === -SUBJECT_STEPS[k]);
      if (!plain && !mirror) continue;
      first ??= w[0][2];
      raw.push({ voice, on: w[0][0], len: 7 * SIXTEENTH, shift: w[0][2] - first, inverted: mirror, scale: 1, theme: 1 });
    }
  });
  const entries = buildEntries(piece, raw, speller);
  const cadences = findCadences(piece, speller);
  const barTicks = ((Number(p.meter.split("/")[0]) * 4) / Number(p.meter.split("/")[1])) * TPQ;
  const lastBar = p.bars.at(-1)!.n;
  return {
    id: "inv01",
    kind: "fugue",
    book: 0,
    number: p.number,
    title: `Invention ${p.number} in ${p.key} ${p.mode}`,
    key,
    bwv: p.bwv,
    meter: p.meter,
    tpq: TPQ,
    length: p.length,
    barTicks,
    bars: p.bars,
    voiceNames: ["Right hand", "Left hand"],
    voices,
    entries,
    keys: entries.map((e) => ({ on: e.on, key: e.key })),
    spell,
    sections: [{ name: "The whole invention", fromBar: 1, toBar: lastBar, from: 0, to: p.length }],
    cadences,
    countersubject: [],
  };
}

const out = [invention("inven01")];
writeFileSync(fileURLToPath(new URL("../../data/touch/tutorial.json", import.meta.url)), JSON.stringify(out));
for (const f of out) console.log(f.id, f.title, f.voices.map((v) => v.length), "entries", f.entries.length, f.entries.filter((e) => e.inverted).length, "inverted; cadences", f.cadences.length);
