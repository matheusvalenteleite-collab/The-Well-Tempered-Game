/**
 * The subjects settled by hand from the score (D160, docs/wtc/SUBJECTS.md): where a fugue has one, it
 * replaces the machine's reading (`subjectAndAnswer`, whose subject's end was doubtful in 22 of the 48).
 */
import data from "../../data/wtc/subjects-settled.json" with { type: "json" };
import type { Note } from "./fugue.ts";

export interface Settled {
  voice: number;
  subject: Note[];
  answerVoice: number;
  answer: Note[];
  answerKind: string;
  mutated: number[];
  codettaBeforeAnswer: number | null;
  codettaBeforeThird: number | null;
  confidence: "sure" | "unsure";
  reason: string;
  note: string;
}

type Raw = { voice: number; subject: [number, number, string][]; answerVoice: number; answer: [number, number, string][] } & Omit<Settled, "voice" | "subject" | "answerVoice" | "answer">;
const notes = (xs: [number, number, string][]): Note[] => xs.map(([on, dur, pitch]) => ({ on, dur, pitch }));
const RAW = (data as unknown as { fugues: Record<string, Raw> }).fugues;

export function settled(id: string): Settled | null {
  const r = RAW[id];
  return r ? { ...r, subject: notes(r.subject), answer: notes(r.answer) } : null;
}
