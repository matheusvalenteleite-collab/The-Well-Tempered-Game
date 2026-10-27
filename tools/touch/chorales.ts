/**
 * D340 (WTC 1.54): writes data/touch/chorales.json, the CHORALES tab's pieces: Bach's 370 four-part
 * chorales as the chorale mode reads them (data/chorales/bach/chorales/bach_NNN.json, from Craig Stuart
 * Sapp's Humdrum edition, CC BY-NC-SA 4.0: data/sources/bach-370-chorales/SOURCE.md), in the touch
 * game's shape (src/touch/fugue.ts TouchFugue): the four voices (any may be played), tied notes joined,
 * as written (repeats not taken).
 * THE FERMATAS: each pause is held one beat longer than written (the chord under it held, the music
 * after it moved a beat later, the bar it ends kept one beat long), and the tick where the music goes
 * on after it is kept (`fermatas`): there the band waits for the player's next note (BAND TIME's WAITS,
 * band-time.ts, D328; `bandTime: "waits"`). The final fermata is held a beat too.
 * Computed as for the other pieces: the cadences, the keys they reach (brought home at the end).
 * Run: node tools/touch/chorales.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import { findCadences, homeward, keySpeller, type Note } from "./analysis.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = `${ROOT}data/chorales/bach/chorales/`;

interface CNote {
  pitch?: string;
  midi?: number;
  duration: string;
  offset: string;
  measure: number;
  tie?: "start" | "continue" | "stop";
  fermata?: boolean;
  rest?: boolean;
}
interface Chorale {
  id: string;
  number: number;
  bwv: string | null;
  title: { de: string | null; en: string | null };
  key: { tonic: string; mode: "major" | "minor" };
  meters: { meter: string; offset: string; measure: number }[];
  measures: { number: number; offset: string }[];
  length: string;
  voices: Record<"soprano" | "alto" | "tenor" | "bass", CNote[]>;
}

const ticks = (f: string) => {
  const [n, d] = f.split("/").map(Number);
  return Math.round((n / d) * 4 * TPQ);
};
export const CHORALE_CREDIT = "CHORALE: CRAIG STUART SAPP, BACH-370-CHORALES (DÖRFFEL, BREITKOPF & HÄRTEL C. 1875) · CC BY-NC-SA 4.0";

export function chorale(c: Chorale) {
  const meter = c.meters[0].meter;
  const [num, den] = meter.split("/").map(Number);
  const beat = (4 * TPQ) / den;
  const spelled: string[] = [];
  const spell: Record<number, string> = {};
  // Each voice: [on, dur, midi, step], ties joined; the fermatas' ends.
  const ends = new Set<number>();
  const voices: Note[][] = (["soprano", "alto", "tenor", "bass"] as const).map((name) => {
    const out: Note[] = [];
    let open: Note | null = null;
    for (const n of c.voices[name]) {
      const on = ticks(n.offset);
      const dur = ticks(n.duration);
      if (n.fermata) ends.add(on + dur);
      if (n.rest || !n.pitch || n.midi === undefined) {
        open = null;
        continue;
      }
      if (open && (n.tie === "stop" || n.tie === "continue") && open[2] === n.midi && open[0] + open[1] === on) {
        open[1] += dur;
        if (n.tie === "stop") open = null;
        continue;
      }
      const note: Note = [on, dur, n.midi, parsePitch(n.pitch).diatonic];
      spell[n.midi] ??= n.pitch;
      spelled.push(n.pitch);
      out.push(note);
      open = n.tie === "start" ? note : null;
    }
    return out;
  });
  // A fermata's end: where some voice's fermata note ends; a cluster of them (the voices' fermatas a
  // little apart) counts once, at the latest.
  const marks = [...ends].sort((a, b) => a - b).filter((t, i, a) => !(i + 1 < a.length && a[i + 1] - t < beat));
  // Hold each one a beat: every note from its end on moves a beat later (all the earlier holds too),
  // the notes sounding into it are held a beat longer.
  const shiftAt = (t: number) => marks.filter((m) => m <= t).length * beat;
  for (const v of voices)
    for (const n of v) {
      const end = n[0] + n[1];
      const held = marks.some((m) => m === end);
      n[0] += shiftAt(n[0]);
      n[1] = end + shiftAt(end - 1) + (held ? beat : 0) - n[0];
    }
  const fermatas = marks.map((m) => m + shiftAt(m));
  const lengthAsWritten = ticks(c.length);
  const length = lengthAsWritten + shiftAt(lengthAsWritten);
  const bars = c.measures.map((m) => ({ n: m.number, on: ticks(m.offset) + shiftAt(ticks(m.offset)) })).filter((b) => b.on < length);
  const key = c.key.mode === "minor" ? c.key.tonic.toLowerCase() : c.key.tonic;
  const piece = { tpq: TPQ, meter, bars, length, voices, key };
  const speller = keySpeller(spelled);
  const cadences = findCadences(piece, speller);
  const name = c.title.de ?? c.title.en ?? `Chorale ${c.number}`;
  const f = {
    id: `chor${String(c.number).padStart(3, "0")}`,
    kind: "fugue" as const,
    book: 4,
    number: c.number,
    title: name,
    key,
    bwv: c.bwv ?? "",
    meter,
    tpq: TPQ,
    length,
    barTicks: (num * 4 * TPQ) / den,
    bars,
    voiceNames: ["Soprano", "Alto", "Tenor", "Bass"],
    voices,
    entries: [],
    keys: cadences.map((x) => ({ on: x.on, key: x.key })),
    spell,
    sections: [{ name: "Whole", fromBar: bars[0]?.n ?? 0, toBar: bars.at(-1)?.n ?? 1, from: 0, to: length }],
    cadences,
    countersubject: [],
    collection: "chorale",
    short: `CHORALE ${c.number}`,
    credit: CHORALE_CREDIT,
    source: `https://github.com/craigsapp/bach-370-chorales/blob/main/kern/chor${String(c.number).padStart(3, "0")}.krn`,
    fermatas,
    bandTime: "waits",
    defaultVoice: 0,
  };
  homeward(f);
  if (!f.keys.length) f.keys = [{ on: 0, key }];
  return f;
}

export function allChorales() {
  return readdirSync(DIR)
    .filter((f) => /^bach_\d+\.json$/.test(f))
    .sort()
    .map((f) => chorale(JSON.parse(readFileSync(`${DIR}${f}`, "utf8"))));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = allChorales();
  writeFileSync(`${ROOT}data/touch/chorales.json`, JSON.stringify(out) + "\n");
  const n = out.reduce((t, f) => t + f.voices.flat().length, 0);
  console.log(`wrote data/touch/chorales.json: ${out.length} chorales, ${n} notes, ${out.reduce((t, f) => t + f.fermatas.length, 0)} fermatas held`);
  for (const f of out.slice(0, 3)) console.log(`  ${f.id} ${f.title} ${f.key} ${f.meter} bars ${f.bars.length} fermatas ${f.fermatas.length} cadences ${f.cadences.length}`);
}
