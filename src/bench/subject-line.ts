/**
 * D214, SUBJECT (the phone's experiment E2): the player follows not one voice but the subject, in all
 * of its entries, whichever voice it is in (every theme of a double or triple fugue, subject and answer
 * forms alike; not the countersubjects). Between entries the player rests while the fugue plays.
 *
 * Stretto rule: the newest entry wins. When an entry begins while another is still sounding, the
 * player leaves the older one at the new entry's first note (the new statement is the event) and the
 * older one's remaining notes go back to the accompaniment. Two entries beginning together: the
 * player takes the first subject's (theme 1 before 2 before 3), then the upper voice's; the other is
 * accompaniment throughout. Only entries beginning at or after the starting point are played (an entry
 * already under way there is accompaniment). Every entry's first note is free (any lane): it starts a
 * new contour.
 */
import type { TouchFugue } from "../touch/fugue.ts";

/** A note of the subject line: [onset, duration, MIDI, staff step, voice]. */
export type LineNote = [on: number, dur: number, midi: number, step: number, voice: number];

export interface LineEntry {
  /** The entry's index in f.entries. */
  index: number;
  voice: number;
  on: number;
  /** Where the player leaves it: its end, or the next entry's first note (stretto). */
  end: number;
  /** Its onsets the player plays. */
  ons: number[];
  theme: number;
  /** "SUBJECT · ALTO", "SUBJECT 2 · TENOR · INVERTED". */
  label: string;
}

export interface SubjectLine {
  notes: LineNote[];
  entries: LineEntry[];
  /** The player's notes, as "voice:onset:midi": taken out of the accompaniment. */
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

/** The subject's notes the player plays, from a tick (and up to one, the lessons' `until`), under the stretto rule. */
export function subjectLine(f: TouchFugue, from: number, until?: number): SubjectLine {
  // In time; on a tie the winner last (the later theme first, the lower voice first).
  const order = f.entries
    .map((e, index) => ({ e, index }))
    .filter(({ e }) => e.on >= from && (until === undefined || e.on < until))
    .sort((a, b) => a.e.on - b.e.on || (b.e.theme ?? 1) - (a.e.theme ?? 1) || b.e.voice - a.e.voice);
  const notes: LineNote[] = [];
  const entries: LineEntry[] = [];
  const keys = new Set<string>();
  order.forEach(({ e, index }, k) => {
    const next = order[k + 1];
    const cut = Math.min(next ? next.e.on : Infinity, until ?? Infinity);
    const voice = f.voices[e.voice];
    const ons: number[] = [];
    for (const [on, dur, midi] of e.notes) {
      if (on >= cut) continue;
      const v = voice.find((n) => n[0] === on && n[2] === midi);
      if (!v) continue;
      notes.push([on, Math.min(v[1], dur, cut - on), midi, v[3], e.voice]);
      keys.add(lineKey(e.voice, on, midi));
      ons.push(on);
    }
    if (ons.length) entries.push({ index, voice: e.voice, on: e.on, end: Math.min(e.end, cut), ons, theme: e.theme ?? 1, label: entryLabel(f, index) });
  });
  notes.sort((a, b) => a[0] - b[0] || b[2] - a[2]);
  return { notes, entries, keys };
}
