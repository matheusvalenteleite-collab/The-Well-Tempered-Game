/**
 * The study's library (D126): all 48 preludes and fugues from the lab's corpus (data/wtc, Humdrum
 * encoding, true voices; src/wtc/corpus.ts), in the shape the study screen reads: notes in quarters
 * from the start of the first bar (a pickup bar padded to a full bar), each fugue note with its voice
 * as Bach wrote it, the subject (the first voice's opening, as long as the second voice repeats it:
 * fugue.ts) and its entries in every voice, each with its transposition: those of fugue.ts's finder by
 * the subject's head (voice by voice, by intervals and rhythm, a varied tail allowed), and those of
 * entries.ts's (exact rhythm, inversions) that lie in one voice and overlap none of the first. The preludes are encoded as one keyboard stream, so their
 * strands are inferred (voices.ts), as before.
 * D137: the later subjects of double and triple fugues (subjects.ts: where each first enters is
 * Ledbetter's, its shape and its other entries are found in the notes), and Ledbetter's sections
 * (data/wtc/ledbetter-sections.json, from his claims checked against the score).
 */
import fuguesData from "../../data/wtc/fugues.json" with { type: "json" };
import preludesData from "../../data/wtc/preludes.json" with { type: "json" };
import laterData from "../../data/wtc/later-subjects.json" with { type: "json" };
import sectionsData from "../../data/wtc/ledbetter-sections.json" with { type: "json" };
import { laterSubjects } from "./subjects.ts";
import type { WtcPiece } from "./corpus.ts";
import { findEntriesByHead, line, subjectAndAnswer, TPQ } from "./fugue.ts";
import { findEntries, type Entry, type FullNote } from "./entries.ts";
import { separateVoices } from "./voices.ts";
import { parsePitch } from "../music/pitch.ts";

export interface LibPiece {
  time: string;
  barQuarters: number;
  /** 1 if bar 1 is a pickup padded to a full bar (the roll's first bar is then Bach's bar 0). */
  pickup: 0 | 1;
  notes: FullNote[];
  /** Spelled pitches of the notes, as encoded. */
  spelled: string[];
  voice: number[];
  count: number;
  /** Ledbetter's sections, in Bach's bars (a half bar as .5), where he gives them. */
  given: { from: number; to: number; label: string }[];
}

export interface LibFugue extends LibPiece {
  subject: { pitch: string; at: number; dur: number }[];
  /** Where the subject starts within its bar, in quarters. */
  phase: number;
  entries: Entry[];
  /** Entries of the later subjects (each with `subject`: 2, 3), in time order. */
  later: Entry[];
}

export interface LibEntry {
  /** "wtc1.01" … "wtc2.24", as the exercises' fugues. */
  id: string;
  book: 1 | 2;
  number: number;
  /** "C", "c#", "Eb", "d#": minor in lower case (fugues.ts's convention). */
  key: string;
  bwv: string;
  /** The prelude's key where it differs (Book I no. 8: E♭ minor prelude, D♯ minor fugue). */
  preludeKey: string;
  fugue: () => LibFugue;
  prelude: () => LibPiece;
}

const PIECES = [...(fuguesData as unknown as WtcPiece[]), ...(preludesData as unknown as WtcPiece[])];
const byId = new Map(PIECES.map((p) => [p.id, p]));

const meterQuarters = (m: string) => {
  const [n, d] = m.split("/").map(Number);
  return (n * 4) / d;
};
const keyOf = (p: WtcPiece) => (p.mode === "minor" ? p.key[0].toLowerCase() + p.key.slice(1) : p.key);

function base(p: WtcPiece): { piece: LibPiece; index: Map<string, number>; pad: number } {
  const barQ = meterQuarters(p.meter);
  const b1 = (p.bars.find((b) => b.n === 1)?.on ?? 0) / TPQ;
  const pad = b1 > 1e-6 ? barQ - b1 : 0;
  const notes: FullNote[] = [];
  const spelled: string[] = [];
  const voice: number[] = [];
  const index = new Map<string, number>();
  p.voices.forEach((v, vi) =>
    v.forEach(([on, dur, pitch, sub]) => {
      if (dur <= 0) return;
      index.set(`${vi}:${sub}:${on}:${pitch}`, notes.length);
      notes.push({ midi: parsePitch(pitch).midi, at: on / TPQ + pad, dur: dur / TPQ });
      spelled.push(pitch);
      voice.push(vi);
    }),
  );
  const given = (sectionsData as { pieces: Record<string, LibPiece["given"]> }).pieces[p.id] ?? [];
  return { piece: { time: p.meter, barQuarters: barQ, pickup: pad > 0 ? 1 : 0, notes, spelled, voice, count: p.voices.length, given }, index, pad };
}

function fugueOf(p: WtcPiece): LibFugue {
  const { piece, index, pad } = base(p);
  const { subject, answer } = subjectAndAnswer(p);
  const sMidi = subject.map((n) => parsePitch(n.pitch).midi);
  const s0 = subject[0].on;
  const lab: Entry[] = findEntriesByHead(p, subject).entries.map((e) => {
    const l = line(p.voices[e.voice]).slice(e.at, e.at + e.length);
    const ids = l.map((n) => index.get(`${e.voice}:0:${n.on}:${n.pitch}`)!).filter((i) => i !== undefined);
    // The transposition: the commonest distance from the subject's notes (a tonal answer's mutated head aside).
    const diffs = l.map((n, i) => parsePitch(n.pitch).midi - (e.form === "inversion" ? 2 * sMidi[0] - sMidi[i] : sMidi[i]));
    const tally = new Map<number, number>();
    for (const d of diffs) tally.set(d, (tally.get(d) ?? 0) + 1);
    const shift = [...tally.entries()].sort((a, b) => b[1] - a[1] || Math.abs(a[0]) - Math.abs(b[0]))[0][0];
    const last = l[l.length - 1];
    return { at: l[0].on / TPQ + pad, end: (last.on + last.dur) / TPQ + pad, shift, inverted: e.form === "inversion", notes: ids };
  });
  const voiceOf = (e: Entry) => piece.voice[e.notes[0]];
  const more = findEntries(piece.notes, subject.map((n) => ({ midi: parsePitch(n.pitch).midi, at: n.on / TPQ + pad, dur: n.dur / TPQ }))).filter(
    (e) => new Set(e.notes.map((i) => piece.voice[i])).size === 1 && !lab.some((x) => voiceOf(x) === voiceOf(e) && x.at < e.end - 1e-6 && e.at < x.end - 1e-6),
  );
  // findEntries' shift is from the subject's first note as found in the piece; the lab's from the subject itself (the same, the first entry being the subject).
  // Within a voice entries do not overlap (a subject of even notes matches a few notes on, in sequences):
  // the lab's kept first, then mine in time order.
  const kept: Entry[] = [];
  for (const e of [...lab.sort((a, b) => a.at - b.at), ...more.sort((a, b) => a.at - b.at)]) if (!kept.some((x) => voiceOf(x) === voiceOf(e) && x.at < e.end - 1e-6 && e.at < x.end - 1e-6)) kept.push(e);
  const entries = kept.sort((a, b) => a.at - b.at);
  // The later subjects, each from the bar where Ledbetter has it enter; its entries' notes as encoded.
  const later: Entry[] = [];
  for (const { n, bar } of (laterData as { fugues: Record<string, { n: number; bar: number }[]> }).fugues[p.id] ?? []) {
    const [ls] = laterSubjects(p, subject, answer, [bar]);
    if (!ls) continue;
    let first = -1;
    for (const o of ls.occurrences) {
      const ids = p.voices[o.voice].filter(([on, dur, , sub]) => sub === 0 && dur > 0 && on >= o.on && on < o.end).map(([on, , pitch]) => index.get(`${o.voice}:0:${on}:${pitch}`)!).filter((i) => i !== undefined);
      if (!ids.length) continue;
      if (first < 0) first = piece.notes[ids[0]].midi;
      later.push({ at: o.on / TPQ + pad, end: o.end / TPQ + pad, shift: piece.notes[ids[0]].midi - first, inverted: false, notes: ids, subject: n });
    }
  }
  // Within a voice, occurrences do not overlap (the first kept), and a figure carried on in sequence
  // (each occurrence beginning where the one before ends: Book I no. 4's second subject, a step lower
  // bar after bar) is one statement.
  later.sort((a, b) => a.at - b.at);
  const vOf = (e: Entry) => piece.voice[e.notes[0]];
  for (let k = later.length - 1; k > 0; k--) if (later.slice(0, k).some((x) => vOf(x) === vOf(later[k]) && x.subject === later[k].subject && x.end > later[k].at + 1e-6)) later.splice(k, 1);
  for (let k = later.length - 1; k > 0; k--) {
    const prev = later.slice(0, k).reverse().find((x) => vOf(x) === vOf(later[k]) && x.subject === later[k].subject);
    if (prev && Math.abs(prev.end - later[k].at) < 1e-6) {
      prev.end = later[k].end;
      prev.notes = [...prev.notes, ...later[k].notes];
      later.splice(k, 1);
    }
  }
  return {
    ...piece,
    subject: subject.map((n) => ({ pitch: n.pitch, at: (n.on - s0) / TPQ, dur: n.dur / TPQ })),
    phase: (s0 / TPQ + pad) % piece.barQuarters,
    entries,
    later,
  };
}

function preludeOf(p: WtcPiece): LibPiece {
  const { piece } = base(p);
  const { voice, count } = separateVoices(piece.notes, []);
  return { ...piece, voice, count };
}

const memo = <T,>(f: () => T) => {
  let v: T | undefined;
  return () => (v ??= f());
};

/** The 48, by key (C, c, C♯, c♯ …), Book I before Book II. */
export const LIBRARY: LibEntry[] = [1, 2]
  .flatMap((book) =>
    Array.from({ length: 24 }, (_, k) => {
      const nn = String(k + 1).padStart(2, "0");
      const f = byId.get(`wtc${book}f${nn}`)!;
      const pr = byId.get(`wtc${book}p${nn}`)!;
      return {
        id: `wtc${book}.${nn}`,
        book: book as 1 | 2,
        number: k + 1,
        key: keyOf(f),
        bwv: String(845 + (book - 1) * 24 + k + 1),
        preludeKey: keyOf(pr),
        fugue: memo(() => fugueOf(f)),
        prelude: memo(() => preludeOf(pr)),
      };
    }),
  )
  .sort((a, b) => a.number - b.number || a.book - b.book);
