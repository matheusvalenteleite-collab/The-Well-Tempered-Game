/** The study content (Fux's text, commentary, Mann's notes) per exercise and per mode. */
import study from "../content/study.en.json" with { type: "json" };
import lectio34 from "../content/lectio34.en.json" with { type: "json" };

export type Block =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "fux"; latin: string; english: string; page: string }
  | { type: "mann"; text: string; page: string; note?: string }
  | { type: "dialogue"; lines: { who: string; text: string }[] };

export interface StepStudy {
  name: string;
  /** Aloysius's line that opens the exercise: Fux's Latin and our translation. */
  intro: { la: string; en: string; page: string };
  specific: string[];
  study: Block[];
}

const S = study as unknown as { modes: Record<string, { name: string; body: Block[] }>; steps: Record<string, StepStudy> };

export function stepStudy(id: string): StepStudy {
  const s = S.steps[id];
  if (!s) throw new Error(`no study content for step ${id}`);
  return s;
}

export function modeStudy(final: string) {
  const m = S.modes[final];
  if (!m) throw new Error(`no study content for the mode on ${final}`);
  return m;
}

const L = lectio34 as unknown as Record<"three" | "four", Record<string, { name: string; pages: string; study: Block[] }>>;

/** The lesson of a species in three or four voices (D153): "1"-"5", "c" (three voices combined), "6" (four voices combined). */
export function lectioFor(voices: 3 | 4, lesson: string) {
  const l = L[voices === 3 ? "three" : "four"][lesson];
  if (!l) throw new Error(`no lectio for ${voices} voices, lesson ${lesson}`);
  return l;
}
