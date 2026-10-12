/**
 * The plan of a two-voice fugue (the composer's first milestone, docs/wtc/COMPOSE.md section 5),
 * after Book I no. 10, Bach's fugue in two voices: the exposition (subject, answer against the
 * countersubject); a first episode; the subject in the relative key with the countersubject in the
 * other voice (so inverted); a second episode, back home; the subject in the tonic in the voice
 * that answered; a close. The entries and the countersubject are derived from the steps before;
 * everything else is a free passage for the player to write.
 *
 * Time 0 is the start of the first bar; the subject starts at the draft's phase, and so does every
 * later section (an entry at the subject's place in its bar, an episode a whole number of bars).
 */
import { parsePitch } from "../../music/pitch.ts";
import { TPQ, type WtcPiece } from "../corpus.ts";
import type { WtcNote } from "../fugues.ts";
import { answerNotes } from "./answer.ts";
import { across } from "./invertible.ts";
import { follower, STRETTO_INTERVALS } from "./stretto.ts";
import { keyOfRoman } from "./keys.ts";
import { barQuarters, dominantOf, EPS, lengthOf, modeOf, octave, relativeOf, toKey, toNotes, tonicOf, type Ev, type FugueDraft } from "./model.ts";

export type SectionKind = "exposition" | "episode" | "entry" | "close";
export type PartKind = "subject" | "answer" | "countersubject" | "free";

export interface Section {
  id: "expo" | "ep1" | "mid" | "ep2" | "final" | "close";
  kind: SectionKind;
  /** The key the section is in (an episode: the key it leads to). */
  key: string;
  from: number;
  to: number;
}

export interface Part {
  section: Section["id"];
  voice: 0 | 1;
  kind: PartKind;
  from: number;
  to: number;
  notes: WtcNote[];
  /** For a free passage, its key in the draft's `free` (section:voice:index); for an entry, its key in `touched`. */
  slot: string;
  /** A free passage written longer than its room: the notes cut off. */
  overflow?: boolean;
}

export interface Realised {
  sections: Section[];
  parts: Part[];
  voices: [WtcNote[], WtcNote[]];
  length: number;
}

const mean = (ns: WtcNote[]) => ns.reduce((a, n) => a + parsePitch(n.pitch).midi, 0) / Math.max(1, ns.length);
/** A line moved by octaves to lie nearest a register (a mean MIDI number). */
function near(ns: WtcNote[], target: number): WtcNote[] {
  const k = Math.round((target - mean(ns)) / 12);
  return k ? ns.map((n) => ({ ...n, pitch: octave(n.pitch, k) })) : ns;
}
const shift = (ns: WtcNote[], t: number) => ns.map((n) => ({ ...n, at: n.at + t }));
/** The free passage's events laid from `from`, cut at `to`. */
function freeNotes(evs: Ev[] | undefined, from: number, to: number): { notes: WtcNote[]; overflow: boolean } {
  const ns = toNotes(evs ?? [], from);
  const notes = ns.filter((n) => n.at < to - EPS).map((n) => ({ ...n, dur: Math.min(n.dur, to - n.at) }));
  return { notes, overflow: lengthOf(evs ?? []) > to - from + EPS };
}

/** Whether the draft has what the plan needs: a subject, an answer and a countersubject. */
export const ready = (d: FugueDraft) => toNotes(d.subject).length >= 3 && !!d.answer && toNotes(d.countersubject).length > 0;

export function realise(d: FugueDraft): Realised {
  const bar = barQuarters(d.time);
  const subject = toNotes(d.subject);
  const sBars = Math.max(1, Math.ceil((lengthOf(d.subject) - EPS) / bar));
  const answer = answerNotes(d);
  const A = d.answer?.at ?? sBars * bar;
  const cs = toNotes(d.countersubject);
  const first = d.first;
  const other = (1 - first) as 0 | 1;
  // The middle entry's key: the player's choice among Bach's first keys away (keys.ts), else the relative.
  const relative = d.middle ? keyOfRoman(d.key, d.middle) : relativeOf(d.key);
  const sections: Section[] = [];
  let t = 0;
  const add = (id: Section["id"], kind: SectionKind, key: string, len: number) => {
    sections.push({ id, kind, key, from: t, to: t + len });
    t += len;
  };
  // The exposition ends where the answer's last bar ends.
  add("expo", "exposition", d.key, d.phase + A + sBars * bar);
  add("ep1", "episode", relative, d.lengths.episode1 * bar);
  add("mid", "entry", relative, sBars * bar);
  add("ep2", "episode", d.key, d.lengths.episode2 * bar);
  // In stretto the last entry lasts until the second voice's entry ends.
  const st = d.stretto ? STRETTO_INTERVALS.find((x) => x.id === d.stretto!.interval) : undefined;
  const finalLen = st ? Math.max(sBars, Math.ceil((d.stretto!.delay + lengthOf(d.subject) - EPS) / bar)) * bar : sBars * bar;
  add("final", "entry", d.key, finalLen);
  // The close ends on a bar line: an upbeat's time is taken from its last bar.
  add("close", "close", d.key, Math.max(1, d.lengths.close) * bar - d.phase);

  const subjMean = mean(subject);
  const ansMean = answer.length ? mean(answer) : subjMean + (first === 1 ? 7 : -5);
  /** Each voice's register: the first voice's is the subject's, the other's the answer's. */
  const register = (v: 0 | 1) => (v === first ? subjMean : ansMean);
  const parts: Part[] = [];
  const derived = (section: Section, voice: 0 | 1, kind: PartKind, notes: WtcNote[]) => {
    const touched = d.touched[`${section.id}:${voice}`];
    const ns = touched ? notes.map((n, i) => ({ ...n, pitch: touched[i] ?? n.pitch })) : notes;
    if (ns.length) parts.push({ section: section.id, voice, kind, from: ns[0].at, to: ns[ns.length - 1].at + ns[ns.length - 1].dur, notes: ns, slot: `${section.id}:${voice}` });
  };
  const S = (id: Section["id"]) => sections.find((s) => s.id === id)!;

  // Exposition: the subject in the first voice, the answer in the other, the countersubject against it.
  const expo = S("expo");
  // An answer entering on the subject's last note cuts it short: the countersubject takes over there.
  const cut = subject.map((n) => (n.at + n.dur > A + EPS ? { ...n, dur: A - n.at } : n)).filter((n) => n.dur > EPS);
  derived(expo, first, "subject", shift(d.answer ? cut : subject, d.phase));
  if (d.answer) {
    derived(expo, other, "answer", shift(answer, d.phase));
    derived(expo, first, "countersubject", shift(cs, d.phase + A));
  }
  /** An entry of the subject in a key, in a voice, with the countersubject in the other. */
  const entry = (sec: Section, voice: 0 | 1) => {
    const start = sec.from; // every section after the exposition begins at the subject's place in the bar
    const s = near(toKey(subject, d.key, sec.key), register(voice));
    derived(sec, voice, "subject", shift(s, start));
    if (cs.length) {
      const c = across(near(toKey(cs, dominantOf(d.key), sec.key), register((1 - voice) as 0 | 1)), s, voice === 1);
      derived(sec, (1 - voice) as 0 | 1, "countersubject", shift(c, start));
    }
  };
  // The middle entry in the first voice (the countersubject changes voice: inverted).
  entry(S("mid"), first);
  // The last entry in the voice that answered, the countersubject where it was in the exposition;
  // or in stretto, the first voice entering with the subject after the chosen delay.
  if (st) {
    const sec = S("final");
    const lead = near(subject, register(other));
    derived(sec, other, "subject", shift(lead, sec.from));
    const f = follower(lead, d.stretto!.delay, st);
    // The interval as chosen (the table judged it so): the second voice lies above when the first
    // voice is the upper one (the screen offers those intervals only).
    if (f) derived(sec, first, "subject", shift(f, sec.from));
  } else entry(S("final"), other);

  // Free passages: every stretch of a voice within a section not taken by the plan.
  for (const sec of sections) {
    for (const voice of [0, 1] as const) {
      const taken = parts.filter((p) => p.section === sec.id && p.voice === voice).sort((a, b) => a.from - b.from);
      const gaps: [number, number][] = [];
      let at = sec.from;
      // Before the answer the second voice is silent: its first free passage begins after the exposition.
      if (sec.id === "expo" && voice === other) at = taken.length ? taken[taken.length - 1].to : sec.to;
      for (const p of taken) {
        if (p.from > at + EPS) gaps.push([at, p.from]);
        at = Math.max(at, p.to);
      }
      if (sec.to > at + EPS) gaps.push([at, sec.to]);
      // The first voice's rests before the subject's upbeat are no passage.
      const passages = gaps.filter(([, b]) => !(sec.id === "expo" && voice === first && b <= d.phase + EPS));
      passages.forEach(([a, b], k) => {
        const slot = `${sec.id}:${voice}:${k}`;
        const f = freeNotes(d.free[slot], a, b);
        parts.push({ section: sec.id, voice, kind: "free", from: a, to: b, notes: f.notes, slot, overflow: f.overflow });
      });
    }
  }
  parts.sort((a, b) => a.from - b.from || a.voice - b.voice);
  const voices: [WtcNote[], WtcNote[]] = [0, 1].map((v) => parts.filter((p) => p.voice === v).flatMap((p) => p.notes).sort((a, b) => a.at - b.at)) as [WtcNote[], WtcNote[]];
  return { sections, parts, voices, length: t };
}

/** The realised fugue as a piece of the 48, for the analysis to read back (src/wtc/fugue.ts). */
export function asPiece(d: FugueDraft, r: Realised): WtcPiece {
  const tick = (x: number) => Math.round(x * TPQ);
  const bar = barQuarters(d.time);
  return {
    id: "composed",
    book: 0,
    number: 0,
    kind: "fugue",
    key: tonicOf(d.key),
    mode: modeOf(d.key),
    bwv: "",
    meter: d.time,
    voices: r.voices.map((v) => v.map((n) => [tick(n.at), tick(n.dur), n.pitch, 0])),
    bars: Array.from({ length: Math.ceil(r.length / bar) }, (_, i) => ({ n: i + 1, on: tick(i * bar) })),
    length: tick(r.length),
  };
}
