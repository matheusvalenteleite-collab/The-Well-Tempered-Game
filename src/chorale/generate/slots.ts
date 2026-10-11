/**
 * The generator's settings, and Bach's chorales, as the slots of level 5 (src/chorale/level5.ts):
 * one chord over one bass note under the soprano, so that the game's judge and the voice search
 * (voices.ts) read them as they read Kittel's figured basses.
 */
import type { Slot } from "../level5.ts";
import type { BachChorale } from "./corpus.ts";
import type { Setting } from "./index.ts";
import { chordTones, degreePitches, figureText, type Key } from "./theory.ts";

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

/** The slots of one of Bach's chorales as the generator reads it (one per on-beat melody attack), or
 *  null where a bass is not a chord tone (no position) somewhere. */
export function bachSlots(c: BachChorale): Slot[] | null {
  if (c.notes.some((n) => !n.pos)) return null;
  const k: Key = { tonic: c.tonic, mode: c.mode };
  const spell = (deg: string, m: number) => degreePitches(deg, k, m, m)[0]?.name ?? null;
  const out: Slot[] = [];
  for (let i = 0; i < c.notes.length; i++) {
    const n = c.notes[i];
    const soprano = spell(n.deg, n.sm),
      bass = spell(n.bass, n.bm);
    if (!soprano || !bass) return null;
    const at = thirtySeconds(n.t);
    const dur = i + 1 < c.notes.length ? thirtySeconds(c.notes[i + 1].t) - at : 8;
    const ct = chordTones(n.pos!, n.bass, n.chord, k);
    out.push({ at, dur, soprano, bass, root: ct.root, kind: ct.kind, bassRole: ct.bassRole, printed: "", above: ct.above });
  }
  return out;
}
