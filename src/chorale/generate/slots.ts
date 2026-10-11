/**
 * The generator's settings, and Bach's chorales, as the slots of level 5 (src/chorale/level5.ts):
 * one chord over one bass note under the soprano, so that the game's judge and the voice search
 * (voices.ts) read them as they read Kittel's figured basses.
 */
import type { Slot } from "../level5.ts";
import type { BachChorale } from "./corpus.ts";
import type { Setting } from "./index.ts";
import { chordTones, figureText, type Key } from "./theory.ts";

/** A pitch's 32nds of a whole note from an offset in whole notes ("3/2"). */
const thirtySeconds = (offset: string) => {
  const [a, b] = offset.split("/").map(Number);
  return Math.round((32 * a) / (b ?? 1));
};

/** The slots of a generated setting: one per melody note; `notes` gives each note's pitch, onset and
 *  length (offsets in whole notes, as in data/chorales/level2.json; `end` the piece's end). */
export function settingSlots(s: Setting, k: Key, notes: { pitch: string; offset: string }[], end: string): Slot[] {
  return notes.map((n, i) => {
    const at = thirtySeconds(n.offset);
    const next = i + 1 < notes.length ? thirtySeconds(notes[i + 1].offset) : thirtySeconds(end);
    const ct = chordTones(s.bass.positions[i], s.bass.degrees[i], s.chords[i], k);
    return { at, dur: next - at, soprano: n.pitch, bass: s.bass.pitches[i], root: ct.root, kind: ct.kind, bassRole: ct.bassRole, printed: figureText(s.bass.figures[i]), above: ct.above };
  });
}

/** Intervals over the root of each chord kind as Kirnberger's reading names it (tools/chorales/kirnberger.py),
 *  by member: third, fifth, seventh (absent where the member does not sound). */
const KINDS: Record<string, [string, number][]> = {
  major: [["third", 4], ["fifth", 7]],
  minor: [["third", 3], ["fifth", 7]],
  diminished: [["third", 3], ["fifth", 6]],
  augmented: [["third", 4], ["fifth", 8]],
  "dominant seventh": [["third", 4], ["fifth", 7], ["seventh", 10]],
  "minor seventh": [["third", 3], ["fifth", 7], ["seventh", 10]],
  "half-diminished seventh": [["third", 3], ["fifth", 6], ["seventh", 10]],
  "diminished seventh": [["third", 3], ["fifth", 6], ["seventh", 9]],
  "major seventh": [["third", 4], ["fifth", 7], ["seventh", 11]],
  "minor-major seventh": [["third", 3], ["fifth", 7], ["seventh", 11]],
  "triad, third not sounding": [["fifth", 7]],
  "seventh chord, third not sounding (minor seventh)": [["fifth", 7], ["seventh", 10]],
  "seventh chord, third not sounding (major seventh)": [["fifth", 7], ["seventh", 11]],
  "seventh chord, third not sounding (diminished seventh)": [["fifth", 6], ["seventh", 9]],
  bare: [],
};
const STEPS = { third: 2, fifth: 4, seventh: 6 } as const;
const LETTERS = "CDEFGAB";
const NATURAL = [0, 2, 4, 5, 7, 9, 11];

/** A chord member's letter name: `steps` letters above the root, `semis` semitones above it. */
function member(root: string, steps: number, semis: number): string {
  const r = LETTERS.indexOf(root[0]);
  const rootPc = NATURAL[r] + [...root.slice(1)].reduce((a, c) => a + (c === "#" ? 1 : -1), 0);
  const l = (r + steps) % 7;
  const a = ((((rootPc + semis - NATURAL[l]) % 12) + 18) % 12) - 6;
  return LETTERS[l] + (a > 0 ? "#".repeat(a) : "b".repeat(-a));
}

/** The slots of one of Bach's chorales, one per on-beat melody attack, with Kirnberger's reading of
 *  each chord (where the bass is a passing or other incidental note, its role says so and every member
 *  of the chord stands above it). Null only where the reading is missing. */
export function bachSlots(c: BachChorale): Slot[] | null {
  const out: Slot[] = [];
  for (let i = 0; i < c.notes.length; i++) {
    const n = c.notes[i];
    const intervals = KINDS[n.kind];
    if (!intervals || !n.root || !n.role) return null;
    const members: [string, string][] = [[n.root, "root"], ...intervals.map(([role, semis]) => [member(n.root, STEPS[role as keyof typeof STEPS], semis), role] as [string, string])];
    const at = thirtySeconds(n.t);
    const dur = i + 1 < c.notes.length ? thirtySeconds(c.notes[i + 1].t) - at : 8;
    out.push({ at, dur, soprano: n.sp, bass: n.bp, root: n.root, kind: n.kind, bassRole: n.role, printed: "", above: members.filter(([, r]) => r !== n.role) });
  }
  return out;
}
