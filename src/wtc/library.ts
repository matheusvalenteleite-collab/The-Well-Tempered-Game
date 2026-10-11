/**
 * The study's library (D126): all 48 preludes and fugues from the lab's corpus (data/wtc, Humdrum
 * encoding, true voices; src/wtc/corpus.ts), in the shape the study screen reads: notes in quarters
 * from the start of the first bar (a pickup bar padded to a full bar), each fugue note with its voice
 * as Bach wrote it, the subject (the first voice's opening, as long as the second voice repeats it:
 * fugue.ts) and its entries in every voice, each with its transposition: those of fugue.ts's finder by
 * the subject's head (voice by voice, by intervals and rhythm, a varied tail allowed), and those of
 * entries.ts's (exact rhythm, inversions) that lie in one voice and overlap none of the first. The preludes are encoded as one keyboard stream, so their
 * strands are inferred (voices.ts), as before.
 */
import fuguesData from "../../data/wtc/fugues.json" with { type: "json" };
import preludesData from "../../data/wtc/preludes.json" with { type: "json" };
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
  /**
   * Where each bar begins, in quarters, and where the last ends (bars + 1 entries), from the
   * encoding's bar lines: the bars are not all `barQuarters` long where the metre changes (Book II
   * no. 3's prelude goes from 4/4 to 3/8 for its fughetta) or a bar is irregular.
   */
  barStarts: number[];
  /** Each bar's metre ("4/4"; the declared one unless the bar's length says otherwise). */
  meters: string[];
}

export interface LibFugue extends LibPiece {
  subject: { pitch: string; at: number; dur: number }[];
  /** Where the subject starts within its bar, in quarters. */
  phase: number;
  entries: Entry[];
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
  const { barStarts, meters } = barsOf(p, barQ, pad, notes);
  return { piece: { time: p.meter, barQuarters: barQ, pickup: pad > 0 ? 1 : 0, notes, spelled, voice, count: p.voices.length, barStarts, meters }, index, pad };
}

/** Metres a bar of another length may be in (the shortest name that fits). */
const OTHER_METERS = ["3/8", "2/4", "3/4", "4/4", "6/8", "9/8", "12/8", "6/4", "3/2", "2/2", "4/2", "12/16", "6/16", "24/16"];

/** The bars of a piece: from its bar lines (a pickup padded to a full bar, as the notes are). */
function barsOf(p: WtcPiece, barQ: number, pad: number, notes: FullNote[]): { barStarts: number[]; meters: string[] } {
  const end = Math.max(p.length / TPQ + pad, ...notes.map((n) => n.at + n.dur));
  const lines = [...new Set(p.bars.map((b) => Math.round((b.on / TPQ + pad) * 960) / 960))].filter((q) => q > 1e-6 && q < end - 1e-6).sort((a, b) => a - b);
  // A pickup bar starts where its music does (the notes are padded to a full bar; the score shows the bar short).
  const starts = [pad > 1e-6 ? pad : 0, ...lines];
  // The last bar is drawn a full bar long (a final chord held longer, or an incomplete bar).
  const last = starts[starts.length - 1];
  const lastOnset = Math.max(...notes.map((n) => n.at));
  const lastLen = starts.length > 1 ? last - starts[starts.length - 2] : barQ;
  starts.push(Math.max(last + lastLen, Math.ceil((lastOnset + 1e-6 - last) / lastLen) * lastLen + last));
  const [, den] = p.meter.split("/").map(Number);
  const meterOf = (len: number) => {
    if (Math.abs(len - barQ) < 1e-6) return p.meter;
    const fits = OTHER_METERS.filter((m) => {
      const [n, d] = m.split("/").map(Number);
      return Math.abs((n * 4) / d - len) < 1e-6;
    });
    return fits.find((m) => Number(m.split("/")[1]) === den) ?? fits[0] ?? null;
  };
  const lens = starts.slice(0, -1).map((a, k) => starts[k + 1] - a);
  // The first bar (a padded pickup) and the last take the metre of the bar next to them.
  const meters = lens.map((len, k) => {
    const own = k === 0 || k === lens.length - 1 ? null : meterOf(len);
    if (own) return own;
    const near = lens.length > 2 ? meterOf(lens[k === 0 ? 1 : k - 1]) : null;
    return near ?? p.meter;
  });
  return { barStarts: starts, meters };
}

function fugueOf(p: WtcPiece): LibFugue {
  const { piece, index, pad } = base(p);
  const { subject } = subjectAndAnswer(p);
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
  const entries = [...lab, ...more].sort((a, b) => a.at - b.at);
  return {
    ...piece,
    subject: subject.map((n) => ({ pitch: n.pitch, at: (n.on - s0) / TPQ, dur: n.dur / TPQ })),
    phase: (s0 / TPQ + pad) % piece.barQuarters,
    entries,
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
