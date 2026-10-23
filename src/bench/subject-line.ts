/**
 * D214, SUBJECT (the phone's experiment E2): the player follows not one voice but the subject, in all
 * of its entries, whichever voice it is in (every theme of a double or triple fugue, subject and answer
 * forms alike; not the countersubjects). Between entries the player rests while the fugue plays.
 *
 * D217, stretto in two rows: at any moment the entries sounding are ranked, the newest first (two
 * beginning together: the first subject's, theme 1 before 2 before 3, then the upper voice's). The
 * newest is the main line (`notes`: the upper row, or either row when it sounds alone); the next
 * newest, while it still sounds, is the second line (`second`: the lower row, reduced to its "special
 * moves" by the game); a third or older entry goes back to the accompaniment. When the newer entry
 * ends first, the older one becomes the main line again (a voice holds one entry at a time: its newest). Each stretch where two entries are played
 * together is a stretto (`strettos`). Only entries beginning at or after the starting point are
 * played (an entry already under way there is accompaniment). Every entry's first note, and the first
 * note of each stretto's second line, is free (any lane): it starts a new contour.
 */
import type { TouchFugue } from "../touch/fugue.ts";

/** A note of the subject line: [onset, duration, MIDI, staff step, voice]. */
export type LineNote = [on: number, dur: number, midi: number, step: number, voice: number];

export interface LineEntry {
  /** The entry's index in f.entries. */
  index: number;
  voice: number;
  on: number;
  /** Where the player leaves it: its end, or where it goes back to the accompaniment. */
  end: number;
  /** Its onsets the player plays (either line). */
  ons: number[];
  theme: number;
  /** "SUBJECT · ALTO", "SUBJECT 2 · TENOR · INVERTED". */
  label: string;
}

/** D217: two entries played at once: the newer in the upper row, the older (its remaining notes) in the lower. */
export interface Stretto {
  on: number;
  end: number;
  /** Indices into SubjectLine.entries. */
  upper: number;
  lower: number;
}

export interface SubjectLine {
  notes: LineNote[];
  /** D217: the second line (the older entry during a stretto), in time. */
  second: LineNote[];
  /** D217: the onsets where the second line starts anew (each stretto's first lower-row note). */
  secondHeads: number[];
  strettos: Stretto[];
  entries: LineEntry[];
  /** The player's notes (both lines), as "voice:onset:midi": taken out of the accompaniment. */
  keys: Set<string>;
}

export const lineKey = (voice: number, on: number, midi: number) => `${voice}:${on}:${midi}`;

/** The banner's words for an entry. */
export function entryLabel(f: TouchFugue, i: number): string {
  const e = f.entries[i];
  const theme = e.theme ?? 1;
  const name = (f.voiceNames[e.voice] ?? `VOICE ${e.voice + 1}`).toUpperCase();
  const how = [e.inverted ? "INVERTED" : "", e.scale === 2 ? "AUGMENTED" : e.scale === 0.5 ? "DIMINISHED" : ""].filter(Boolean);
  return [theme > 1 ? `SUBJECT ${theme}` : "SUBJECT", name, ...how].join(" · ");
}

/** The subject's notes the player plays, from a tick (and up to one, the lessons' `until`), in two lines. */
export function subjectLine(f: TouchFugue, from: number, until?: number): SubjectLine {
  const lim = until ?? Infinity;
  const es = f.entries
    .map((e, index) => ({ e, index, stop: Math.min(lim, Math.max(...e.notes.map(([on, dur]) => on + dur))) }))
    .filter(({ e }) => e.on >= from && e.on < lim);
  // The ranking: the newest first; a tie the first subject, then the upper voice.
  const before = (a: (typeof es)[number], b: (typeof es)[number]) => b.e.on - a.e.on || (a.e.theme ?? 1) - (b.e.theme ?? 1) || a.e.voice - b.e.voice;
  // A voice has one entry at a time: its newest (I/4's entries in one voice overlap by a note or two).
  const active = (t: number) =>
    es
      .filter((x) => x.e.on <= t && t < x.stop)
      .sort(before)
      .filter((x, k, all) => all.findIndex((y) => y.e.voice === x.e.voice) === k);
  const rank = (x: (typeof es)[number], t: number) => active(t).indexOf(x);
  // The moments the ranking may change.
  const events = [...new Set(es.flatMap((x) => [x.e.on, x.stop]))].sort((a, b) => a - b);
  const changeAfter = (x: (typeof es)[number], t: number) => {
    const r = rank(x, t);
    for (const ev of events) if (ev > t && rank(x, ev) !== r) return ev;
    return Infinity;
  };
  const notes: LineNote[] = [];
  const second: LineNote[] = [];
  const keys = new Set<string>();
  const ons = new Map<number, number[]>();
  const ends = new Map<number, number>();
  for (const x of es) {
    const voice = f.voices[x.e.voice];
    for (const [on, dur, midi] of x.e.notes) {
      if (on >= lim) continue;
      const r = rank(x, on);
      if (r < 0 || r > 1) continue;
      const v = voice.find((n) => n[0] === on && n[2] === midi);
      if (!v) continue;
      const d = Math.min(v[1], dur, changeAfter(x, on) - on, lim - on);
      (r === 0 ? notes : second).push([on, d, midi, v[3], x.e.voice]);
      keys.add(lineKey(x.e.voice, on, midi));
      ons.set(x.index, [...(ons.get(x.index) ?? []), on]);
      ends.set(x.index, Math.max(ends.get(x.index) ?? 0, on + d));
    }
  }
  const byTime = (a: LineNote, b: LineNote) => a[0] - b[0] || b[2] - a[2];
  notes.sort(byTime);
  second.sort(byTime);
  const entries: LineEntry[] = es
    .filter((x) => ons.has(x.index))
    .sort((a, b) => a.e.on - b.e.on || -before(a, b))
    .map((x) => ({ index: x.index, voice: x.e.voice, on: x.e.on, end: ends.get(x.index)!, ons: [...new Set(ons.get(x.index))].sort((a, b) => a - b), theme: x.e.theme ?? 1, label: entryLabel(f, x.index) }));
  // The strettos: the stretches where the same two entries are played at once (from the second line's notes).
  const strettos: Stretto[] = [];
  const secondHeads: number[] = [];
  const at = (index: number) => entries.findIndex((e) => e.index === index);
  for (const [on, dur, , , voice] of second) {
    const lower = active(on)[1];
    const upper = active(on)[0];
    if (!lower || lower.e.voice !== voice) continue;
    const last = strettos.at(-1);
    const [u, l] = [at(upper.index), at(lower.index)];
    if (last && last.upper === u && last.lower === l) {
      last.end = Math.max(last.end, on + dur);
      continue;
    }
    // From the newer entry's arrival (or the change of pair), as far as the second line goes.
    const start = Math.max(upper.e.on, lower.e.on, last ? last.end : -Infinity);
    strettos.push({ on: Math.min(start, on), end: on + dur, upper: u, lower: l });
    if (secondHeads.at(-1) !== on) secondHeads.push(on);
  }
  return { notes, second, secondHeads, strettos, entries, keys };
}
