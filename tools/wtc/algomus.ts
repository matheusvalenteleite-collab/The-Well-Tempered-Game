// The Algomus reference analysis of WTC I's fugues (Giraud, Groult, Leguy, Levé, "Computational Fugue Analysis",
// Computer Music Journal 39/2, 2015, 77-96; data/sources/algomus/, ODbL 1.0 / DbCL 1.0) read into the project's
// units: every occurrence of a subject or countersubject, every cadence and pedal, as ticks of our encoding and
// our voice numbers (0 = top). Writes data/wtc/algomus.json. Usage: node tools/wtc/algomus.ts
//
// The file's units (www.algomus.fr/data, checked against the notes): a position is a bar number plus a fraction of
// the bar ("2.5" = halfway through bar 2); `start`, `end`, `resolution` and `changeafter` offsets are in whole notes;
// `length` is in bars. The file's voice letters (S, A, T, B, and C in the five-voice fugues) are matched to our
// voices by the notes: the voice in which the subject's occurrences begin with a note.
import { readFileSync, writeFileSync } from "node:fs";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { TPQ } from "../../src/wtc/fugue.ts";
import { parsePitch } from "../../src/music/pitch.ts";

const settled = (JSON.parse(readFileSync("data/wtc/subjects-settled.json", "utf8")) as { fugues: Record<string, { subject: [number, number, string][] }> }).fugues;
const midi = (s: string) => parsePitch(s).midi;

export interface AlgoOccurrence {
  /** The pattern: "S", "S-inc", "S-inv", "S-aug", "S2", "CS1", ... */
  pattern: string;
  /** Our voice (0 = top); a second voice where the occurrence changes voice. */
  voice: number;
  voice2?: number;
  /** The position as the file gives it (bar.fraction), and its onset in our ticks. */
  pos: number;
  on: number;
  /** Length in ticks (to the end of the pattern, before any resolution). */
  len: number;
  /** Labels: "varied", "inverted", "tonal_answer" ... */
  tags: string[];
}
export interface AlgoCadence {
  pos: number;
  on: number;
  /** Degree of the local key, as the file writes it ("V", "vi", "I"), and the kind (PAC, rIAC, IAC, HC, DC). */
  degree: string;
  kind: string;
}
export interface AlgoFugue {
  id: string;
  voices: string;
  /** The file's voice letters mapped to ours. */
  map: Record<string, number>;
  /** Alternative subject lengths the file records (with their authority). */
  alternatives: string[];
  occurrences: AlgoOccurrence[];
  cadences: AlgoCadence[];
  pedals: { voice: number; pos: number; on: number; degree: string; len: number }[];
}

const WHOLE = 4 * TPQ;
const frac = (s: string) => {
  const m = /^([-+]?\d+)(?:\/(\d+))?$/.exec(s.trim());
  return m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : Number(s);
};
const opts = (s: string) => {
  const o: Record<string, string> = {};
  const words = s.trim().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    if (/^[-+]?[\d./]+$/.test(words[i + 1] ?? "")) o[words[i]] = words[++i];
    else o[words[i]] = "";
  }
  return o;
};

/** The file's blocks, one per fugue of WTC I (the Shostakovich fugues left out). */
export function readAlgomus(text: string, pieces: WtcPiece[]): AlgoFugue[] {
  const blocks = text.split(/^==== /m).slice(1).filter((b) => b.startsWith("wtc-i-"));
  return blocks.map((b) => {
    const lines = b.split("\n");
    const num = Number(/wtc-i-(\d+)/.exec(lines[0])![1]);
    const id = `wtc1f${String(num).padStart(2, "0")}`;
    const p = pieces.find((x) => x.id === id)!;
    const [n, d] = p.meter.split("/").map(Number);
    const bar = (n * WHOLE) / d;
    const barOn = (k: number) => p.bars.find((x) => x.n === k)?.on ?? (p.bars.find((x) => x.n === 1)?.on ?? 0) + (k - 1) * bar;
    const at = (pos: number) => barOn(Math.floor(pos)) + (pos - Math.floor(pos)) * bar;
    const voices = /\(([SATBC]+)\)/.exec(lines[1])?.[1] ?? "SATB";
    const raw: { pattern: string; letters: string; pos: number; o: Record<string, string>; tags: string[]; base: Record<string, string> }[] = [];
    const cadences: AlgoCadence[] = [];
    const pedalsRaw: { letter: string; pos: number; degree: string; len: number }[] = [];
    const alternatives: string[] = [];
    let pattern = "";
    let base: Record<string, string> = {};
    for (const line of lines.slice(2)) {
      const l = line.replace(/#.*$/, "").trimEnd();
      const head = /^\s*== (\S+)(.*)$/.exec(l);
      if (head) {
        if (/alternative/.test(head[2])) {
          alternatives.push(line.trim());
          pattern = "";
          continue;
        }
        pattern = head[1];
        base = opts(/\[([^\]]*)\]/.exec(head[2])?.[1] ?? "");
        continue;
      }
      const row = /^\s+([SATBC*]+)\s+(.*)$/.exec(l);
      if (!row || !pattern) continue;
      const items = row[2].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
      for (const it of items) {
        const m = /^([\d.]+)\s*(.*)$/.exec(it);
        if (!m) continue;
        const pos = Number(m[1]);
        const rest = m[2];
        if (pattern === "cadences") {
          const c = /\(([^:]+):([A-Za-z]+)\)/.exec(rest);
          if (c) cadences.push({ pos, on: Math.round(at(pos)), degree: c[1], kind: c[2] });
        } else if (pattern === "pedals") {
          const deg = /\(([^)]+)\)/.exec(rest)?.[1] ?? "";
          const len = Number(/length ([\d.]+)/.exec(rest)?.[1] ?? 1);
          pedalsRaw.push({ letter: row[1], pos, degree: deg, len });
        } else {
          const o = opts(/\[([^\]]*)\]/.exec(rest)?.[1] ?? "");
          const tags = [...rest.matchAll(/\(([^)]+)\)/g)].map((x) => x[1]);
          raw.push({ pattern, letters: row[1], pos, o, tags, base });
        }
      }
    }
    // The occurrence's onset and length, the occurrence's own options over its pattern's.
    const onOf = (r: (typeof raw)[0]) => Math.round(at(r.pos) + frac(r.o.start ?? r.base.start ?? "0") * WHOLE);
    const lenOf = (r: (typeof raw)[0]) => Math.round(Number(r.o.length ?? r.base.length ?? "1") * bar + frac(r.o.end ?? "0") * WHOLE);
    // Our voice for each letter: the one with a note beginning at most of the subject's onsets.
    const map: Record<string, number> = {};
    const used = new Set<number>();
    const letters = [...voices];
    // A voice carries an occurrence if a note begins there and the next notes keep the subject's intervals
    // (from the second note on, so that a tonal answer's head does not count against it; a semitone's licence
    // for the mode).
    const subj = settled[id]?.subject.map((x) => midi(x[2])) ?? [];
    const steps = [2, 3, 4].map((i) => subj[i] - subj[i - 1]).filter((x) => !Number.isNaN(x));
    const carries = (v: number, on: number) => {
      const k = p.voices[v]?.findIndex((x) => Math.abs(x[0] - on) <= TPQ / 8) ?? -1;
      if (k < 0) return false;
      const ms = p.voices[v].slice(k + 1, k + 2 + steps.length).map((x) => midi(x[2]));
      return ms.length === steps.length + 1 && steps.every((st, i) => Math.abs(ms[i + 1] - ms[i] - st) <= 1);
    };
    const score = (letter: string, v: number) => raw.filter((r) => r.letters === letter && r.pattern === "S").filter((r) => carries(v, onOf(r))).length;
    const pairs = letters
      .flatMap((L, i) => p.voices.map((_, v) => ({ L, v, s: score(L, v), d: Math.abs(i - v) })))
      .sort((a, b) => b.s - a.s || a.d - b.d);
    for (const { L, v } of pairs) if (!(L in map) && !used.has(v)) ((map[L] = v), used.add(v));
    letters.forEach((L, i) => (L in map ? 0 : (map[L] = i)));
    const occurrences: AlgoOccurrence[] = raw.map((r) => ({
      pattern: r.pattern,
      voice: map[r.letters[0]],
      ...(r.letters.length > 1 ? { voice2: map[r.letters[1]] } : {}),
      pos: r.pos,
      on: onOf(r),
      len: lenOf(r),
      tags: r.tags,
    }));
    const pedals = pedalsRaw.map((x) => ({ voice: map[x.letter], pos: x.pos, on: Math.round(at(x.pos)), degree: x.degree, len: Math.round(x.len * bar) }));
    return { id, voices, map, alternatives, occurrences, cadences, pedals };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pieces = JSON.parse(readFileSync("data/wtc/fugues.json", "utf8")) as WtcPiece[];
  const fugues = readAlgomus(readFileSync("data/sources/algomus/fugues.ref", "utf8"), pieces);
  const about =
    "The Algomus reference analysis of WTC I's fugues (Giraud, Groult, Leguy, Levé, Computer Music Journal 39/2, 2015, 77-96; " +
    "http://www.algomus.fr/data), converted by tools/wtc/algomus.ts to ticks (1920 a quarter) and our voices (0 = top). " +
    "Open Database License 1.0 (contents: Database Contents License 1.0): this derived database is under the same licence.";
  writeFileSync("data/wtc/algomus.json", JSON.stringify({ about, fugues }) + "\n");
  for (const f of fugues) console.log(f.id, f.voices, JSON.stringify(f.map), f.occurrences.length, f.cadences.length);
}
