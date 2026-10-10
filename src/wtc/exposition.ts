/**
 * The exposition of a fugue: each voice's first entry, in the order the voices come in, with its key
 * (subject in the tonic, answer in the dominant, or elsewhere), and the link before it (a codetta:
 * free material between the end of the previous entry and this one).
 */
import { TPQ, type WtcPiece } from "./corpus.ts";
import { entryOrder, findEntriesByHead, type Entry, type Note } from "./fugue.ts";
import { entryKey, entryOffset } from "./keyplan.ts";
import { subjectLength } from "./structure.ts";

/** The voices' names, top first, by how many there are. */
export function voiceNames(n: number): string[] {
  return n === 2 ? ["upper", "lower"] : n === 3 ? ["S", "A", "B"] : n === 4 ? ["S", "A", "T", "B"] : n === 5 ? ["S1", "S2", "A", "T", "B"] : Array.from({ length: n }, (_, i) => `${i + 1}`);
}

export interface ExpoEntry {
  voice: number;
  on: number;
  /** "subject" in the tonic, "answer" in the dominant, "other" in another key, "free" if the voice does not begin with the subject. */
  role: "subject" | "answer" | "other" | "free";
  roman: string;
  /** Ticks between the end of the previous entry and this one (0 or less: no link). */
  link: number;
}

/**
 * The exposition: one entry per voice, in the order they enter. Entries are sought as the subject and
 * as the answer (a tonal answer's mutations can hide it from a search by the subject); an entry is the
 * subject if it lies at the subject's letters (or octaves of them), the answer if at the answer's.
 */
export function exposition(p: WtcPiece, subject: Note[], answer: Note[], entries: Entry[]): ExpoEntry[] {
  const len = subjectLength(subject);
  const [num, den] = p.meter.split("/").map(Number);
  const bar = (num * 4 * TPQ) / den;
  const asAnswer = findEntriesByHead(p, answer).entries;
  const minor = p.mode === "minor";
  let prevEnd = 0;
  return entryOrder(p)
    .filter(([, on]) => Number.isFinite(on))
    .map(([voice, first], i) => {
      // The voice's first entry: one beginning within a bar of its first note (a voice may come in
      // with a note or two before the subject).
      const near = (x: Entry) => x.voice === voice && x.form === "subject" && x.on >= first && x.on <= first + bar;
      const e = [...entries.filter(near), ...asAnswer.filter(near)].sort((a, b) => a.on - b.on)[0];
      const on = e?.on ?? first;
      let role: ExpoEntry["role"] = "free";
      let roman = "–";
      if (e) {
        if (entryOffset(p, e, subject) === 0) [role, roman] = ["subject", minor ? "i" : "I"];
        else if (entryOffset(p, e, answer) === 0) [role, roman] = ["answer", minor ? "v" : "V"];
        else [role, roman] = ["other", entryKey(p, e, subject).roman];
      }
      const link = i === 0 ? 0 : on - prevEnd;
      prevEnd = Math.max(prevEnd, on + len);
      return { voice, on, role, roman, link };
    });
}

/** The order of entry as voice names, e.g. "A S B". */
export const orderName = (p: WtcPiece, expo: ExpoEntry[]) => expo.map((e) => voiceNames(p.voices.length)[e.voice]).join(" ");

