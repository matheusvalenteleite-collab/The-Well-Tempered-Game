/** The study content (Fux's text, commentary, Mann's notes) per exercise and per mode. */
import study from "../content/study.en.json" with { type: "json" };

export type Block =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "fux"; latin: string; english: string; page: string }
  | { type: "mann"; text: string; page: string; note?: string }
  | { type: "dialogue"; lines: { who: string; text: string }[] };

export interface StepStudy {
  name: string;
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
