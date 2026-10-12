// The opening imitation of each Invention and Sinfonia, read from the notes and set beside Schulenberg's
// tables 10.2 and 10.3 (data/inventions/schulenberg.json): the number of bars, which voice leads, which
// voice imitates it, at what interval and distance, and for how long the imitation stays strict (a
// canon). A first check of the external reading and of the data, not a reading of the pieces.
// Usage: node tools/inventions/openings.ts
import { readFileSync } from "node:fs";
import { TPQ, type WtcPiece } from "../../src/wtc/corpus.ts";
import { line, type Note } from "../../src/wtc/fugue.ts";
import { parsePitch } from "../../src/music/pitch.ts";

const pieces = JSON.parse(readFileSync("data/wtc/inventions.json", "utf8")) as WtcPiece[];
const schul = JSON.parse(readFileSync("data/inventions/schulenberg.json", "utf8"));
const ext = new Map<string, any>([...schul.inventions, ...schul.sinfonias].map((r: any) => [r.id, r]));

const HEAD = 5; // notes compared to recognise the opening motive in another voice
const WINDOW = 40 * TPQ; // how far into the piece an imitating entry is looked for (40 quarter notes)
// The P 610 keys. data/wtc/inventions.json has four Sinfonias wrong (3, 4, 5, 14 given as C major).
const P610 = ["C", "c", "D", "d", "Eb", "E", "e", "F", "f", "G", "g", "A", "a", "Bb", "b"];
const keyOf = (id: string) => P610[Number(id.slice(5)) - 1];
const dia = (p: string) => parsePitch(p).diatonic;
const midi = (p: string) => parsePitch(p).midi;

/**
 * Does voice line b, from note j, repeat a's first `k` notes: the same inter-onset times and the same
 * letter-name intervals (the last note's length is free, so a tie at the end does not matter)? With
 * `loose`, the first note may differ (an upbeat, a shortened first note, or a tonal answer's first step).
 */
function matches(a: Note[], b: Note[], j: number, k: number, loose = false): boolean {
  if (j + k > b.length || k > a.length) return false;
  for (let i = loose ? 2 : 1; i < k; i++) {
    if (a[i].on - a[i - 1].on !== b[j + i].on - b[j + i - 1].on) return false;
    if (dia(a[i].pitch) - dia(a[i - 1].pitch) !== dia(b[j + i].pitch) - dia(b[j + i - 1].pitch)) return false;
  }
  return true;
}

/** The first entry of a's opening in b after a has begun, on a whole multiple of the beat (the tactus). */
function entry(a: Note[], b: Note[], first: number, tactus: number): { j: number; loose: boolean } | null {
  // A strict entry is preferred; a loose one (first note changed) only where the voice has no strict one,
  // and it must agree over more notes, since skipping the first interval admits chance likenesses.
  for (const loose of [false, true]) {
    const j = b.findIndex(
      (n, i) =>
        n.on > a[0].on &&
        n.on - first <= WINDOW &&
        // the lag is measured from the second note when the first may be changed
        (loose ? i + 1 < b.length && (b[i + 1].on - a[1].on) % tactus === 0 : (n.on - a[0].on) % tactus === 0) &&
        matches(a, b, i, loose ? HEAD + 3 : HEAD, loose),
    );
    if (j >= 0) return { j, loose };
  }
  return null;
}

/** How many notes, from the start of each, the follower keeps the leader's rhythm and letter intervals at a constant lag. */
function strictRun(a: Note[], b: Note[], j: number, lag: number): number {
  let n = 0;
  while (n < a.length && j + n < b.length) {
    if (b[j + n].on - a[n].on !== lag) break;
    if (n > 0 && dia(a[n].pitch) - dia(a[n - 1].pitch) !== dia(b[j + n].pitch) - dia(b[j + n - 1].pitch)) break;
    n++;
  }
  return n;
}

const NAMES = ["unison/octave", "2nd", "3rd", "4th", "5th", "6th", "7th"];

for (const p of pieces) {
  const [num, den] = p.meter.split("/").map(Number);
  const barLen = (num * 4 * TPQ) / den;
  const beat = (4 * TPQ) / den;
  const first = p.bars.find((x) => x.n === 1)?.on ?? p.bars[0].on;
  const bars = Math.max(...p.bars.map((x) => x.n));
  const where = (t: number) => {
    const k = Math.floor((t - first) / barLen);
    return `${k + 1}:${+(1 + (t - first - k * barLen) / beat).toFixed(2)}`;
  };
  const lines = p.voices.map(line);
  // The tactus: the quarter in x/4, the half in x/2, the dotted quarter (or dotted eighth in x/16) in
  // compound metres, the whole bar in 3/8. An imitation is looked for only at a whole number of tactus.
  const tactus = den === 8 && num === 3 ? barLen : num % 3 === 0 && num > 3 ? 3 * beat : beat;
  // The leader: the voice whose opening is imitated earliest by another voice.
  let best: { a: number; b: number; j: number } | null = null;
  for (let a = 0; a < lines.length; a++)
    for (let b = 0; b < lines.length; b++) {
      if (a === b || !lines[a].length) continue;
      const e = entry(lines[a], lines[b], first, tactus);
      if (e && !e.loose && (!best || lines[b][e.j].on < lines[best.b][best.j].on)) best = { a, b, j: e.j };
    }
  const r = ext.get(p.id);
  const extLen = r?.length ?? "?";
  if (!best) {
    console.log(`${p.id} ${keyOf(p.id)} ${p.meter} bars ${bars} (S: ${extLen}) — no imitation of a voice's first ${HEAD} notes found`);
    continue;
  }
  const lead = lines[best.a];
  const entries: string[] = [];
  for (let b = 0; b < lines.length; b++) {
    if (b === best.a) continue;
    const e = entry(lead, lines[b], first, tactus);
    if (!e) {
      entries.push(`v${b}: no entry`);
      continue;
    }
    const { j, loose } = e;
    const f = lines[b][j];
    // With a changed first note, the interval is measured from the second.
    const k = loose ? 1 : 0;
    const steps = dia(lines[b][j + k].pitch) - dia(lead[k].pitch);
    const semis = midi(lines[b][j + k].pitch) - midi(lead[k].pitch);
    const name = `${NAMES[((steps % 7) + 7) % 7]} ${steps > 0 ? "above" : steps < 0 ? "below" : ""}`.trim();
    const lag = loose ? lines[b][j + 1].on - lead[1].on : f.on - lead[0].on;
    const run = loose ? 1 + strictRun(lead.slice(1), lines[b], j + 1, lag) : strictRun(lead, lines[b], j, lag);
    const runEnd = lead[Math.max(0, run - 1)];
    // Voice exchange or canon: while the follower restates the leader's opening, does the leader take over
    // the follower's own opening line (double counterpoint, Dreyfus's ROTATE), or go on with new material?
    const own = lines[b].filter((n) => n.on < f.on);
    // The follower's opening may begin with a few lone notes before its figure: try its notes from the 1st
    // to the 4th, and allow the leader to take them over a little later than the exact lag.
    const exchange =
      own.length > HEAD + 1 &&
      [0, 1, 2, 3].some((s0) => {
        const o = own.slice(s0);
        return lead.some((n, li) => n.on >= o[0].on + lag && n.on <= o[0].on + lag + 4 * beat && matches(o, lead, li, HEAD + 1));
      });
    entries.push(
      `${exchange ? "[exchange] " : ""}v${b} at ${where(f.on)} ${f.pitch}${loose ? " (head altered)" : ""}: ${name} (${semis} semitones), after ${+(lag / beat).toFixed(2)} beats; strict for ${run} notes, to ${where(runEnd.on + runEnd.dur + lag)}`,
    );
  }
  const extImit = r ? (r.initial_imitation ?? `${r.entries} ${r.intervals}`) : "?";
  console.log(`${p.id} ${keyOf(p.id)} ${p.meter} bars ${bars} (S: ${extLen}); leader v${best.a} ${lead[0].pitch} at ${where(lead[0].on)}; S: ${extImit}`);
  for (const e of entries) console.log(`   ${e}`);
}
