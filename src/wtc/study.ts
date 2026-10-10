/**
 * The study of a whole fugue (D123): its sections and its moments, found from the notes, the
 * voices (voices.ts) and the subject's entries (entries.ts), each with where it starts and ends so
 * that it can be heard alone. Descriptive, never graded:
 *   - sections: the exposition (the first entries, one for each voice), then middle entries and
 *     episodes in turn, and the close (from the last entry);
 *   - moments: each entry (its voice, the degree it starts on, upside down or not), strettos
 *     (an entry beginning before the one before it has ended), episodes (a bar or more without
 *     the subject), pedal points (a bass note held, or struck again, for two bars or more), the
 *     highest and the lowest notes, and the final cadence.
 */
import type { Entry, FullNote } from "./entries.ts";

export type MomentKind = "entry" | "stretto" | "episode" | "pedal" | "highest" | "lowest" | "cadence" | "arrival" | "figure";

export interface Moment {
  kind: MomentKind;
  /** Quarters from the start of the first bar. */
  from: number;
  to: number;
  /** The voices concerned (0 = the highest). */
  voices: number[];
  /** Details for the text: degrees, distances, pitches. */
  detail: Record<string, string | number | boolean>;
}

export interface Section {
  kind: "exposition" | "episode" | "entries" | "close";
  from: number;
  to: number;
  /** Entries in it (indices into the entries). */
  entries: number[];
}

/** Degree names of a transposition (semitones above the tonic) in major or minor, Roman. */
const DEG_MAJOR: Record<number, string> = { 0: "I", 2: "II", 4: "III", 5: "IV", 7: "V", 9: "VI", 11: "VII", 1: "♭II", 3: "♭III", 6: "♯IV", 8: "♭VI", 10: "♭VII" };
const DEG_MINOR: Record<number, string> = { 0: "I", 2: "II", 3: "III", 5: "IV", 7: "V", 8: "VI", 10: "VII", 1: "♭II", 4: "♮III", 6: "♯IV", 9: "♮VI", 11: "♮VII" };
export const degreeOf = (shift: number, minor: boolean) => (minor ? DEG_MINOR : DEG_MAJOR)[((shift % 12) + 12) % 12];

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export const pitchName = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

/** Voice names by the number of voices: soprano down to bass. */
export function voiceNames(count: number): string[] {
  if (count === 2) return ["upper", "lower"];
  if (count === 3) return ["soprano", "alto", "bass"];
  if (count === 4) return ["soprano", "alto", "tenor", "bass"];
  if (count === 5) return ["soprano I", "soprano II", "alto", "tenor", "bass"];
  return Array.from({ length: count }, (_, i) => (i === 0 ? "soprano" : i === count - 1 ? "bass" : `voice ${i + 1}`));
}

/** The voice an entry is in: the voice of its first note. */
export const entryVoice = (e: Entry, voice: number[]) => voice[e.notes[0]];

export function studyMoments(notes: FullNote[], voice: number[], count: number, entries: Entry[], bar: number, minor: boolean): { moments: Moment[]; sections: Section[] } {
  const end = Math.max(...notes.map((n) => n.at + n.dur));
  const first = entries.find((e) => e.shift === 0 && !e.inverted) ?? entries[0];
  const moments: Moment[] = [];
  // Entries.
  entries.forEach((e, k) => {
    moments.push({ kind: "entry", from: e.at, to: e.end, voices: [entryVoice(e, voice)], detail: { index: k, degree: degreeOf(e.shift - (first?.shift ?? 0), minor), start: pitchName(notes[e.notes[0]].midi), inverted: e.inverted } });
  });
  // Strettos: an entry beginning before the previous one has ended (in another voice).
  for (let k = 1; k < entries.length; k++) {
    const a = entries[k - 1];
    const b = entries[k];
    if (b.at < a.end - 1e-6 && entryVoice(a, voice) !== entryVoice(b, voice)) {
      moments.push({ kind: "stretto", from: a.at, to: Math.max(a.end, b.end), voices: [entryVoice(a, voice), entryVoice(b, voice)], detail: { distance: +(b.at - a.at).toFixed(3), beats: +((b.at - a.at) / 1).toFixed(2) } });
    }
  }
  // Episodes: a bar or more with no entry sounding.
  const covered = entries.map((e) => [e.at, e.end] as [number, number]).sort((a, b) => a[0] - b[0]);
  let t = covered.length ? covered[0][1] : 0;
  for (const [a, b] of covered.slice(1)) {
    if (a - t >= bar - 1e-6) moments.push({ kind: "episode", from: t, to: a, voices: [], detail: { bars: +((a - t) / bar).toFixed(1) } });
    t = Math.max(t, b);
  }
  if (end - t >= 2 * bar) moments.push({ kind: "episode", from: t, to: end - bar, voices: [], detail: { bars: +((end - bar - t) / bar).toFixed(1), last: true } });
  // Pedal points: the bass holding (or striking again) one pitch for two bars or more.
  const bassV = count - 1;
  const bass = notes.map((n, i) => ({ n, i })).filter(({ i }) => voice[i] === bassV).sort((x, y) => x.n.at - y.n.at);
  for (let k = 0; k < bass.length; ) {
    let j = k;
    while (j + 1 < bass.length && bass[j + 1].n.midi === bass[k].n.midi && bass[j + 1].n.at <= bass[j].n.at + bass[j].n.dur + 1e-6) j++;
    const from = bass[k].n.at;
    const to = bass[j].n.at + bass[j].n.dur;
    if (to - from >= 2 * bar - 1e-6) moments.push({ kind: "pedal", from, to, voices: [bassV], detail: { pitch: pitchName(bass[k].n.midi), bars: +((to - from) / bar).toFixed(1) } });
    k = j + 1;
  }
  // The highest and the lowest note.
  const hi = notes.reduce((a, n, i) => (n.midi > notes[a].midi ? i : a), 0);
  const lo = notes.reduce((a, n, i) => (n.midi < notes[a].midi ? i : a), 0);
  moments.push({ kind: "highest", from: Math.max(0, notes[hi].at - bar), to: notes[hi].at + notes[hi].dur + bar / 2, voices: [voice[hi]], detail: { pitch: pitchName(notes[hi].midi), at: notes[hi].at } });
  moments.push({ kind: "lowest", from: Math.max(0, notes[lo].at - bar), to: notes[lo].at + notes[lo].dur + bar / 2, voices: [voice[lo]], detail: { pitch: pitchName(notes[lo].midi), at: notes[lo].at } });
  // The close.
  moments.push({ kind: "cadence", from: Math.max(0, end - 2 * bar), to: end, voices: [], detail: {} });
  moments.sort((a, b) => a.from - b.from || a.kind.localeCompare(b.kind));

  // Sections: the exposition (until each voice has entered once), then entries and episodes, the close.
  const sections: Section[] = [];
  // The exposition: one entry for each voice, the first `count` entries.
  let expoEnd = 0;
  const expo: number[] = [];
  for (let k = 0; k < entries.length && expo.length < count; k++) {
    if (entries[k].inverted) continue;
    expo.push(k);
    expoEnd = Math.max(expoEnd, entries[k].end);
  }
  if (expo.length) sections.push({ kind: "exposition", from: 0, to: expoEnd, entries: expo });
  let cursor = expoEnd;
  const rest = entries.map((_, k) => k).filter((k) => !expo.includes(k));
  const lastEntry = rest.length ? rest[rest.length - 1] : -1;
  let group: number[] = [];
  const flush = () => {
    if (!group.length) return;
    sections.push({ kind: k2kind(group, lastEntry), from: Math.min(...group.map((k) => entries[k].at)), to: Math.max(...group.map((k) => entries[k].end)), entries: group });
    cursor = Math.max(...group.map((k) => entries[k].end));
    group = [];
  };
  const k2kind = (g: number[], last: number): Section["kind"] => (g.includes(last) ? "close" : "entries");
  for (const k of rest) {
    const e = entries[k];
    if (e.at - cursor >= bar - 1e-6) {
      flush();
      sections.push({ kind: "episode", from: cursor, to: e.at, entries: [] });
    }
    group.push(k);
    cursor = Math.max(cursor, e.end);
  }
  flush();
  if (sections.length && sections[sections.length - 1].kind !== "close") sections.push({ kind: "close", from: cursor, to: end, entries: [] });
  else if (sections.length) sections[sections.length - 1].to = end;
  return { moments, sections };
}
