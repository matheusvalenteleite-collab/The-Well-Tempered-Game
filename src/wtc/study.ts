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
 * D137 (Ledbetter's claims, checked against the score, and the lab's rules): a stretto only where the
 * next voice enters before the one before is halfway through the subject (a long subject's ordinary
 * exposition is no stretto); in a fugue, a pedal point is the lowest sounding note held, or struck
 * again after rests of a beat at most, for a bar and four beats at least, or, above the bass, the
 * tonic or the dominant held for two bars and eight beats; entries of later subjects; Ledbetter's
 * sections where he gives them (mergeSections). D138: entries in augmentation and diminution, which
 * also take part in strettos (Book II no. 9's low strettos in diminution, bb. 23–5).
 */
import type { Entry, FullNote } from "./entries.ts";

export type MomentKind = "entry" | "later" | "transformed" | "stretto" | "episode" | "pedal" | "highest" | "lowest" | "cadence" | "arrival" | "figure";

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
  kind: "exposition" | "episode" | "entries" | "close" | "given" | "subject";
  /** A given section's label (Ledbetter's words), or a later subject's number. */
  label?: string;
  n?: number;
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

/**
 * `fugue`, for a fugue (absent for a prelude, whose strands are guesses): the beat in quarters, the
 * tonic's pitch class, the entries of later subjects and the subject's length in quarters.
 */
export function studyMoments(notes: FullNote[], voice: number[], count: number, entries: Entry[], bar: number, minor: boolean, fugue?: { beat: number; tonicPc: number; later: Entry[]; subjectLength: number; transformed?: Entry[] }): { moments: Moment[]; sections: Section[] } {
  const end = Math.max(...notes.map((n) => n.at + n.dur));
  const first = entries.find((e) => e.shift === 0 && !e.inverted) ?? entries[0];
  const moments: Moment[] = [];
  // Entries.
  entries.forEach((e, k) => {
    moments.push({ kind: "entry", from: e.at, to: e.end, voices: [entryVoice(e, voice)], detail: { index: k, degree: degreeOf(e.shift - (first?.shift ?? 0), minor), start: pitchName(notes[e.notes[0]].midi), inverted: e.inverted } });
  });
  // Entries of the later subjects.
  const later = fugue?.later ?? [];
  later.forEach((e, k) => {
    const first = !later.slice(0, k).some((x) => x.subject === e.subject);
    moments.push({ kind: "later", from: e.at, to: e.end, voices: [entryVoice(e, voice)], detail: { n: e.subject ?? 2, first, start: pitchName(notes[e.notes[0]].midi) } });
  });
  // Entries in augmentation and diminution.
  const transformed = fugue?.transformed ?? [];
  for (const e of transformed) moments.push({ kind: "transformed", from: e.at, to: e.end, voices: [entryVoice(e, voice)], detail: { scale: e.scale ?? 2, inverted: e.inverted, start: pitchName(notes[e.notes[0]].midi), degree: degreeOf(e.shift - (first?.shift ?? 0), minor) } });
  // Strettos: an entry beginning before the previous one is halfway through (in another voice), the
  // subject's length scaled for an augmentation or diminution.
  const statements = [...entries, ...transformed].sort((a, b) => a.at - b.at);
  for (let k = 1; k < statements.length; k++) {
    const a = statements[k - 1];
    const b = statements[k];
    if (b.at - a.at < Math.max(a.end - a.at, (fugue?.subjectLength ?? 0) * (a.scale ?? 1)) / 2 - 1e-6 && entryVoice(a, voice) !== entryVoice(b, voice)) {
      moments.push({ kind: "stretto", from: a.at, to: Math.max(a.end, b.end), voices: [entryVoice(a, voice), entryVoice(b, voice)], detail: { distance: +(b.at - a.at).toFixed(3), beats: +((b.at - a.at) / 1).toFixed(2) } });
    }
  }
  // Episodes: a bar or more with no entry sounding.
  const covered = [...entries, ...later, ...transformed].map((e) => [e.at, e.end] as [number, number]).sort((a, b) => a[0] - b[0]);
  let t = covered.length ? covered[0][1] : 0;
  for (const [a, b] of covered.slice(1)) {
    if (a - t >= bar - 1e-6) moments.push({ kind: "episode", from: t, to: a, voices: [], detail: { bars: +((a - t) / bar).toFixed(1) } });
    t = Math.max(t, b);
  }
  if (end - t >= 2 * bar) moments.push({ kind: "episode", from: t, to: end - bar, voices: [], detail: { bars: +((end - bar - t) / bar).toFixed(1), last: true } });
  if (fugue) pedalsOfFugue(notes, voice, count, bar, fugue.beat, fugue.tonicPc, moments);
  // Pedal points (a prelude): the bass holding (or striking again) one pitch for two bars or more.
  const bassV = count - 1;
  const bass = notes.map((n, i) => ({ n, i })).filter(({ i }) => voice[i] === bassV).sort((x, y) => x.n.at - y.n.at);
  for (let k = 0; !fugue && k < bass.length; ) {
    let j = k;
    while (j + 1 < bass.length && bass[j + 1].n.midi === bass[k].n.midi && bass[j + 1].n.at <= bass[j].n.at + bass[j].n.dur + 1e-6) j++;
    const from = bass[k].n.at;
    const to = bass[j].n.at + bass[j].n.dur;
    if (to - from >= 2 * bar - 1e-6) moments.push({ kind: "pedal", from, to, voices: [bassV], detail: { pitch: pitchName(bass[k].n.midi), pc: ((bass[k].n.midi % 12) + 12) % 12, bars: +((to - from) / bar).toFixed(1) } });
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

/** A fugue's pedal points (D137): see the head of this file. */
function pedalsOfFugue(notes: FullNote[], voice: number[], count: number, bar: number, beat: number, tonicPc: number, moments: Moment[]) {
  for (let v = 0; v < count; v++) {
    const line = notes.map((n, i) => ({ n, i })).filter(({ i }) => voice[i] === v).sort((x, y) => x.n.at - y.n.at);
    for (let k = 0; k < line.length; ) {
      let j = k;
      while (j + 1 < line.length && line[j + 1].n.midi === line[k].n.midi && line[j + 1].n.at <= line[j].n.at + line[j].n.dur + beat + 1e-6) j++;
      const from = line[k].n.at;
      const to = line[j].n.at + line[j].n.dur;
      const midi = line[k].n.midi;
      const pc = ((midi % 12) + 12) % 12;
      const degree = (pc - tonicPc + 12) % 12;
      if (to - from >= Math.max(bar, 4 * beat) - 1e-6) {
        const lowest = notes.every((n, i) => voice[i] === v || n.at + n.dur <= from + 1e-6 || n.at >= to - 1e-6 || n.midi >= midi);
        const high = !lowest && to - from >= Math.max(2 * bar, 8 * beat) - 1e-6 && (degree === 0 || degree === 7);
        if (lowest || high) moments.push({ kind: "pedal", from, to, voices: [v], detail: { pitch: pitchName(midi), pc, bars: +((to - from) / bar).toFixed(1), place: lowest ? "bass" : v === 0 ? "upper" : "inner" } });
      }
      k = j + 1;
    }
  }
}

/**
 * The sections shown (D137): Ledbetter's where he gives them (`given`, in Bach's bars), the game's own
 * in the gaps between them (cut where a later subject first enters, unless one of his sections
 * starts within a bar of it); a remnant shorter than a bar joins the section before it.
 */
export function mergeSections<S extends Omit<Section, "kind"> & { kind: string }>(own: S[], given: { from: number; to: number; label: string }[], later: Entry[], bar: number, pickup: number, end: number): (S | Section)[] {
  type X = S | Section;
  const q = (b: number) => Math.min(end, Math.max(0, (b - 1 + pickup) * bar));
  // His ranges take in their last bar (bb. 19–27 runs to the end), unless the next starts there (bb. 7–14, 14–19).
  const his: Section[] = given.map((g) => ({ kind: "given" as const, from: q(g.from), to: q(Number.isInteger(g.to) ? g.to + 1 : g.to), entries: [], label: g.label })).filter((g) => g.to > g.from);
  his.forEach((g, k) => { if (k + 1 < his.length) g.to = Math.min(g.to, his[k + 1].from); });
  // The game's own sections, cut where a later subject first enters.
  const mine: X[] = own.map((x) => ({ ...x }));
  for (const e of later) {
    if (later.some((x) => x.subject === e.subject && x.at < e.at)) continue;
    if (his.some((g) => Math.abs(g.from - e.at) < bar)) continue;
    const k = mine.findIndex((x) => x.from < e.at - 1e-6 && e.at < x.to - 1e-6);
    if (k >= 0) mine.splice(k, 1, { ...mine[k], to: e.at }, { kind: "subject", from: e.at, to: mine[k].to, entries: [], n: e.subject } as Section);
    else { const at = mine.findIndex((x) => Math.abs(x.from - e.at) < 1e-6); if (at >= 0) mine[at] = { ...mine[at], kind: "subject", n: e.subject } as Section; }
  }
  const pieces: X[] = [];
  const gaps: [number, number][] = [];
  let cursor = 0;
  for (const g of his) { if (g.from > cursor + 1e-6) gaps.push([cursor, g.from]); cursor = Math.max(cursor, g.to); }
  if (end > cursor + 1e-6) gaps.push([cursor, end]);
  for (const [a, b] of gaps) for (const x of mine) { const from = Math.max(a, x.from), to = Math.min(b, x.to); if (to > from + 1e-6) pieces.push({ ...x, from, to }); }
  const all: X[] = [...his, ...pieces].sort((x, y) => x.from - y.from);
  const out: X[] = [];
  for (const x of all) {
    if (x.kind !== "given" && x.to - x.from < bar - 1e-6 && out.length) { out[out.length - 1].to = Math.max(out[out.length - 1].to, x.to); continue; }
    out.push(x);
  }
  if (out.length) { out[0].from = 0; out[out.length - 1].to = end; }
  for (let k = 1; k < out.length; k++) out[k - 1].to = out[k].from;
  return out;
}
