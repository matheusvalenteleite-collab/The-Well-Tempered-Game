/**
 * The composer's second step: the answer to the player's subject. The real answer (every note a
 * fifth up) and the tonal ones, from the rules read in Bach's 48 (docs/wtc/answer-study.md):
 *
 * - **Bach's head rule** (law-like in the 48: 17 of 17 subjects beginning on the dominant): a first
 *   note on ^5 is answered by ^1; a ^5 among the first four notes, leapt to from ^1, likewise.
 * - **The tail of a modulating subject**: a subject that ends in the dominant key (a raised ^4
 *   rising to ^5 in its last third) has its tail answered a fourth up, back to the tonic. (The 48's
 *   other sign, a last ^5 reached from ^4 or ^6, mutated subjects Bach answers real: 1/11, 1/17,
 *   1/22, 2/15 of the 29 expositions; it is left out.)
 * - **The whole head** (the wider rule of the treatises): every ^5 of the head (the notes before
 *   the subject leaves ^1 and ^5, within its first bar; a ^4 or ^6 between two ^5s stays in it)
 *   answered by ^1. Bach's answer in 1/21 (F G F Bb answered Bb D Bb F).
 *
 * Against the 29 expositions of the ASAP set: one of the options is Bach's answer, letter for
 * letter, in 24 (Bach's rule alone in 23); the other five are mutations of his own (1/18, 1/19,
 * 1/23, 2/1, 2/11; test/wtc-compose.test.ts). The player may also mutate any note by hand.
 *
 * Where the rules agree only one option is offered. The answer enters at the subject's metric
 * place, on its last note or after it.
 */
import { parsePitch } from "../../music/pitch.ts";
import { transpose, type WtcNote } from "../fugues.ts";
import { barQuarters, EPS, lengthOf, octave, place, toNotes, type FugueDraft } from "./model.ts";

export type AnswerKind = "real" | "tonal" | "textbook";

export interface AnswerOption {
  kind: AnswerKind;
  /** The answer's pitches, a fifth above the subject but for the mutated notes. */
  pitches: string[];
  /** Indices of the notes answered a fourth up (by ^1 for ^5, back to the tonic in the tail). */
  mutated: number[];
  /** Why each mutated note was mutated: "head" or "tail". */
  why: ("head" | "tail")[];
}

const fifth = (p: string) => transpose(p, 4, 7);
const fourth = (p: string) => transpose(p, 3, 5);
const isFive = (pl: { deg: number; alter: number }) => pl.deg === 4 && pl.alter === 0;
const isOne = (pl: { deg: number; alter: number }) => pl.deg === 0 && pl.alter === 0;

/** The notes answered a fourth up, by rule. */
export function mutations(subject: WtcNote[], key: string, time: string, rule: AnswerKind): { at: number; why: "head" | "tail" }[] {
  const n = subject.length;
  if (rule === "real" || n === 0) return [];
  const pl = subject.map((x) => place(x.pitch, key));
  const out = new Map<number, "head" | "tail">();
  if (rule === "tonal") {
    if (isFive(pl[0])) out.set(0, "head");
    for (let i = 1; i < Math.min(4, n); i++) {
      const leap = Math.abs(parsePitch(subject[i].pitch).diatonic - parsePitch(subject[i - 1].pitch).diatonic) >= 2;
      if (isFive(pl[i]) && isOne(pl[i - 1]) && leap) {
        out.set(i, "head");
        break;
      }
    }
  } else {
    const bar = barQuarters(time);
    const t0 = subject[0].at;
    for (let i = 0; i < n; i++) {
      if (subject[i].at - t0 >= bar - EPS && i > 0) break;
      // A neighbour of ^5 (^4 or ^6) between two of them stays in the head (F G F in 1/21).
      const neighbour = i > 0 && i + 1 < n && isFive(pl[i - 1]) && isFive(pl[i + 1]) && (pl[i].deg === 3 || pl[i].deg === 5);
      if (!isFive(pl[i]) && !isOne(pl[i]) && !neighbour) break;
      if (isFive(pl[i])) out.set(i, "head");
    }
  }
  // The tail of a subject that modulates to the dominant.
  let tail = -1;
  for (let i = Math.floor((2 * n) / 3); i + 1 < n; i++) if (pl[i].deg === 3 && pl[i].alter > 0 && isFive(pl[i + 1])) { tail = i; break; }
  if (tail >= 0) for (let i = tail; i < n; i++) out.set(i, "tail");
  return [...out.entries()].sort((a, b) => a[0] - b[0]).map(([at, why]) => ({ at, why }));
}

/** The answer options for a subject, without duplicates: real, Bach's tonal rule, the textbook's. */
export function answerOptions(subject: WtcNote[], key: string, time: string): AnswerOption[] {
  const out: AnswerOption[] = [];
  for (const kind of ["real", "tonal", "textbook"] as AnswerKind[]) {
    const m = mutations(subject, key, time, kind);
    const set = new Set(m.map((x) => x.at));
    const pitches = answerWith(subject, set);
    if (out.some((o) => o.pitches.join() === pitches.join())) continue;
    out.push({ kind, pitches, mutated: m.map((x) => x.at), why: m.map((x) => x.why) });
  }
  return out;
}

/** The answer with the given notes a fourth up and the rest a fifth up. */
export const answerWith = (subject: WtcNote[], fourths: Set<number>) => subject.map((x, i) => (fourths.has(i) ? fourth(x.pitch) : fifth(x.pitch)));

/** Bach's choice by rule: the tonal answer (the real one when nothing calls for a mutation). */
export const bachChoice = (opts: AnswerOption[]) => opts.find((o) => o.kind === "tonal") ?? opts[0];

/**
 * Where the answer may enter: at the subject's metric place, from its last note on (an entry on the
 * subject's last note is common in the 48), up to a bar after its end.
 */
export function entryPoints(d: FugueDraft): number[] {
  const len = lengthOf(d.subject);
  if (!len) return [];
  const bar = barQuarters(d.time);
  const notes = toNotes(d.subject);
  const last = notes[notes.length - 1];
  const earliest = last ? last.at : len;
  const out: number[] = [];
  for (let k = 1; k * bar <= len + bar + EPS; k++) if (k * bar >= earliest - EPS) out.push(k * bar);
  return out;
}

/**
 * The answer placed in the other voice: a fifth above when the subject is in the lower voice, a
 * fourth below (the fifth less an octave) when in the upper; moved by octaves so that it lies
 * where the voice lies (a register at least a third away from the subject's mean).
 */
export function placeAnswer(pitches: string[], d: FugueDraft): string[] {
  const subject = toNotes(d.subject);
  if (!subject.length) return pitches;
  const mean = (ps: string[]) => ps.reduce((a, p) => a + parsePitch(p).midi, 0) / ps.length;
  const ms = mean(subject.map((n) => n.pitch));
  let k = 0;
  const above = d.first === 1;
  let ps = pitches;
  for (let i = 0; i < 4; i++) {
    const m = mean(ps);
    if (above && m < ms + 3) k = 1;
    else if (!above && m > ms - 3) k = -1;
    else break;
    ps = ps.map((p) => octave(p, k));
  }
  return ps;
}

/** The answer's notes in the subject's rhythm, from its entry. */
export function answerNotes(d: FugueDraft): WtcNote[] {
  if (!d.answer) return [];
  const subject = toNotes(d.subject);
  return subject.map((n, i) => ({ pitch: d.answer!.pitches[i] ?? n.pitch, at: n.at + d.answer!.at, dur: n.dur }));
}

/** Which notes of an answer are a fourth above the subject's (the mutated ones), by letter. */
export function fourthsOf(subject: WtcNote[], pitches: string[]): Set<number> {
  const pc = (p: string) => p.replace(/-?\d+$/, "");
  return new Set(subject.map((n, i) => (pitches[i] && pc(pitches[i]) === pc(fourth(n.pitch)) && pc(fourth(n.pitch)) !== pc(fifth(n.pitch)) ? i : -1)).filter((i) => i >= 0));
}

/**
 * The answer kept in step with a changed subject: the same notes mutated, re-placed in the other
 * voice's register; dropped if the subject has gained or lost notes, or no longer allows the entry.
 */
export function refreshAnswer(d: FugueDraft, before: WtcNote[]): FugueDraft {
  if (!d.answer) return d;
  const subject = toNotes(d.subject);
  if (subject.length !== before.length || !entryPoints(d).some((t) => Math.abs(t - d.answer!.at) < EPS)) return { ...d, answer: null };
  try {
    const pitches = placeAnswer(answerWith(subject, fourthsOf(before, d.answer.pitches)), d);
    return { ...d, answer: { ...d.answer, pitches } };
  } catch {
    return { ...d, answer: null };
  }
}
