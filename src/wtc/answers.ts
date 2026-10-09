/**
 * The WTC mode, level F2 (docs/wtc/CONCEPT.md): the answer. The player hears a fugue subject and
 * chooses how the second voice answers it in the dominant: the real answer (every interval kept),
 * the textbook tonal answer (the dominant at the head answered by the tonic), or, where Bach did
 * something else, his own. Compare shows which is Bach's and what he changed.
 *
 * Data: data/wtc/answers.json (tools/wtc/answers.py, from the fugue analysis: subjects and answers
 * as pitch names, facts about Bach's fugues).
 */
import raw from "../../data/wtc/answers.json" with { type: "json" };
import type { PlayEvent } from "../counterpoint/layout.ts";
import { frac } from "./prelude1.ts";

export type Kind = "real" | "textbook tonal" | "tonal, Bach's own mutation";
export interface Fugue {
  id: string;
  book: number;
  number: number;
  key: string;
  voices: number;
  subject: string[];
  durations: string[];
  subjectVoice: string;
  answerVoice: string;
  tonic: string;
  real: string[];
  textbook: string[];
  bach: string[];
  kind: Kind;
  head: number;
}
export interface Option {
  notes: string[];
  /** what this answer is: Bach's, real, textbook (an option may be several at once) */
  is: ("bach" | "real" | "textbook")[];
}

export const FUGUES: Fugue[] = (raw as unknown as { fugues: Fugue[] }).fugues;

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The distinct answers to choose from, in a fixed order that does not give Bach's away. */
export function options(f: Fugue): Option[] {
  const out: Option[] = [];
  const add = (notes: string[], tag: Option["is"][number]) => {
    const o = out.find((x) => same(x.notes, notes));
    if (o) o.is.push(tag);
    else out.push({ notes, is: [tag] });
  };
  add(f.real, "real");
  add(f.textbook, "textbook");
  add(f.bach, "bach");
  // a fixed order that does not follow the kind (a tonal mutation lowers a note, so pitch order
  // would put it first): shuffled by a hash of the fugue's id
  let h = [...f.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Where an answer departs from the real answer (the mutated notes), by index. */
export function mutated(f: Fugue, notes: string[]): number[] {
  return notes.map((n, i) => (n !== f.real[i] ? i : -1)).filter((i) => i >= 0);
}

/** The subject, then the answer, one after the other. */
export function events(f: Fugue, answer: string[] | null): PlayEvent[] {
  const ev: PlayEvent[] = [];
  let at = 0;
  f.subject.forEach((p, i) => {
    const d = frac(f.durations[i]);
    ev.push({ slot: ev.length, at, length: d, cantus: null, counterpoint: p });
    at += d;
  });
  if (answer) {
    at += 1 / 8;
    answer.forEach((p, i) => {
      const d = frac(f.durations[i] ?? "1/8");
      ev.push({ slot: ev.length, at, length: d, cantus: null, counterpoint: p });
      at += d;
    });
  }
  return ev;
}
