// Calibrates src/wtc/trio.ts on the 48: every voice of every fugue in three or more voices judged
// against the others, over the whole fugue. Counts what the rules still flag in Bach (each should
// be rare, and each case is listed for inspection), which exemptions his voices need, and what
// the rules catch when single notes of his are altered (a step or a third, in the key).
// Writes docs/wtc/trio-calibration.md. Usage: node tools/wtc/trio-calibration.ts
import { readFileSync, writeFileSync } from "node:fs";
import { findEntriesByHead, line, subjectAndAnswer, type Note } from "../../src/wtc/fugue.ts";
import { exposition } from "../../src/wtc/exposition.ts";
import { subjectLength } from "../../src/wtc/structure.ts";
import { evaluateTrio, harmonicWindow, harmonies, type TrioIssue } from "../../src/wtc/trio.ts";
import { label, TPQ, type WtcPiece } from "../../src/wtc/corpus.ts";
import { parsePitch } from "../../src/music/pitch.ts";

const fugues: WtcPiece[] = JSON.parse(readFileSync("data/wtc/fugues.json", "utf8"));
const LETTERS = "CDEFGAB";
const SHARPS = "FCGDAEB";
const FIFTHS: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6 };
function signature(key: string, mode: string): Record<string, number> {
  // The relative major's signature for a minor key.
  const rel: Record<string, string> = { a: "C", e: "G", b: "D", "f#": "A", "c#": "E", "g#": "B", "d#": "F#", "a#": "C#", d: "F", g: "Bb", c: "Eb", f: "Ab", bb: "Db", eb: "Gb" };
  const k = mode === "minor" ? rel[key.toLowerCase()] : key;
  const n = FIFTHS[k] ?? 0;
  const sig: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (n > 0) for (const l of SHARPS.slice(0, n)) sig[l] = 1;
  if (n < 0) for (const l of [...SHARPS].reverse().slice(0, -n)) sig[l] = -1;
  return sig;
}
/** Move a pitch by `steps` letters, in the key's signature. */
function move(pitch: string, steps: number, sig: Record<string, number>): string {
  const p = parsePitch(pitch);
  const d = LETTERS.indexOf(p.step) + steps;
  const letter = LETTERS[((d % 7) + 7) % 7];
  const octave = p.octave + Math.floor(d / 7);
  const a = sig[letter];
  return `${letter}${a > 0 ? "#".repeat(a) : "b".repeat(-a)}${octave}`;
}

let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648);

const counts: Record<string, number> = {};
const trace = new Map<string, number>();
let judgedNotes = 0;
const examples: string[] = [];
const perFugue: string[] = [];
let altered = 0;
let caught = 0;
const caughtBy: Record<string, number> = {};
for (const p of fugues) {
  if (p.voices.length < 3) continue;
  const lines = p.voices.map(line);
  const [num, den] = p.meter.split("/").map(Number);
  const bar = (num * 4 * TPQ) / den;
  let flagged = 0;
  let notes = 0;
  lines.forEach((l, v) => {
    const issues = evaluateTrio(lines, p.meter, v, {}, trace);
    judgedNotes += l.length;
    notes += l.length;
    flagged += issues.length;
    for (const x of issues) {
      counts[x.rule] = (counts[x.rule] ?? 0) + 1;
      if (examples.length < 400) examples.push(`| ${label(p).replace(/ \(.*/, "")} (${p.book === 1 ? "I" : "II"}) | ${Math.floor(x.on / bar) + 1} | ${v + 1} | ${l[x.note].pitch} | ${x.rule} | ${x.detail} |`);
    }
    // Faults: alter 1 note in 40 by a step or a third, in the key; caught if a new issue names it or its neighbours.
    const sig = signature(p.key, p.mode);
    for (let i = 1; i < l.length - 1; i++) {
      if (rand() > 1 / 40) continue;
      const steps = [1, -1, 2, -2][Math.floor(rand() * 4)];
      const changed: Note[] = l.map((n, j) => (j === i ? { ...n, pitch: move(n.pitch, steps, sig) } : n));
      const ls = lines.map((x, w) => (w === v ? changed : x));
      const win = { from: l[i].on - bar, to: l[i].on + l[i].dur + bar };
      const H0 = harmonies(lines, p.meter, p.length);
      const H1 = harmonies(ls, p.meter, p.length);
      const w = harmonicWindow(p.meter);
      const G0 = harmonies(lines, p.meter, p.length, w / 2);
      const G1 = harmonies(ls, p.meter, p.length, w / 2);
      const key = (w: number, x: TrioIssue) => `${w}:${x.note}:${x.rule}:${x.on}`;
      const was = new Set(lines.flatMap((_, w) => evaluateTrio(lines, p.meter, w, { ...win, harmony: H0, halves: G0 }).map((x) => key(w, x))));
      const fresh = ls.flatMap((_, w) => evaluateTrio(ls, p.meter, w, { ...win, harmony: H1, halves: G1 }).filter((x) => !was.has(key(w, x))));
      altered++;
      if (fresh.length) {
        caught++;
        caughtBy[fresh[0].rule] = (caughtBy[fresh[0].rule] ?? 0) + 1;
      }
    }
  });
  perFugue.push(`| ${label(p).replace(/ \(.*/, "")} (${p.book === 1 ? "I" : "II"}) | ${p.voices.length} | ${notes} | ${flagged} | ${((1000 * flagged) / notes).toFixed(1)} |`);
}

// The third entry: the two voices already in, judged against each other and the entering voice,
// for as long as the third voice states the subject (the exposition's voices only).
const thirdRows: string[] = [];
let passages = 0;
let clean = 0;
let withErrors = 0;
for (const p of fugues) {
  if (p.voices.length < 3) continue;
  const { subject, answer } = subjectAndAnswer(p);
  const ex = exposition(p, subject, answer, findEntriesByHead(p, subject).entries);
  const third = ex[2];
  if (!third || third.role === "free") continue;
  const len = subjectLength(subject);
  const lines = p.voices.map((v, w) => (ex.slice(0, 3).some((e) => e.voice === w) ? line(v) : []));
  const [num, den] = p.meter.split("/").map(Number);
  const bar = (num * 4 * TPQ) / den;
  const issues = [ex[0].voice, ex[1].voice].flatMap((v) => evaluateTrio(lines, p.meter, v, { from: third.on, to: third.on + len }).map((x) => ({ ...x, v })));
  passages++;
  if (!issues.length) clean++;
  if (issues.some((x) => x.severity === "error")) withErrors++;
  thirdRows.push(`| ${label(p).replace(/ \(.*/, "")} (${p.book === 1 ? "I" : "II"}) | ${Math.floor(third.on / bar) + 1} | ${issues.map((x) => `${x.severity === "error" ? "**error**" : "warning"}: ${x.detail} (voice ${x.v + 1}, bar ${Math.floor(x.on / bar) + 1})`).join("; ") || "clean"} |`);
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const out = [
  "# Three-voice tonal counterpoint calibrated on the 48",
  "",
  "Generated by `node tools/wtc/trio-calibration.ts` (`src/wtc/trio.ts`). Every voice of every fugue in",
  "three or more voices is judged against the others over the whole fugue (not only the third entry).",
  "What the rules flag in Bach is either a gap in the rules or a licence of his; what they catch when",
  "single notes are altered (one in forty, moved a step or a third in the key) is their power.",
  "",
  `## Bach against the rules`,
  "",
  `Notes judged: ${judgedNotes}. Flagged: ${total} (${((1000 * total) / judgedNotes).toFixed(1)} per thousand notes): ${Object.entries(counts).map(([k, c]) => `${k} ${c}`).join(", ")}.`,
  "",
  "Exemptions used (how many dissonances each explained):",
  "",
  ...[...trace].sort((a, b) => b[1] - a[1]).map(([k, c]) => `- ${k}: ${c}`),
  "",
  "**Reading.** The rules read dissonance against the harmony of each beat (or half beat), not voice",
  "against voice: a first version that judged each pair of voices separately let one voice's passing",
  "note excuse anything the other did, and flagged Bach on 4% of his notes while catching a third of",
  "the altered ones. Read harmonically, Bach is flagged on under 1% of his notes, most of them",
  "sevenths that leave by leap (a seventh passed to another voice, or a chord the window misreads);",
  "consecutives are flagged eight times in the 48 (each counted from both voices), mostly in final",
  "cadences where the texture thickens. Hence the severities: consecutives are errors, the rest",
  "warnings to be shown beside Bach's practice. Altered notes are caught far less often than one",
  "would like (about one in six): most single-step alterations of running lines give another",
  "passing note or another chord tone, which no rule of dissonance can or should object to. What",
  "these rules cannot judge is whether a line is good: the countersubject's character, its rhythmic",
  "independence from the subject, its invertibility. Those belong to the comparison with Bach.",
  "",
  "## Altered notes",
  "",
  `Notes altered: ${altered}. Caught: ${caught} (${Math.round((100 * caught) / altered)}%): ${Object.entries(caughtBy).map(([k, c]) => `${k} ${c}`).join(", ")}. An alteration can be harmless (a step to another chord tone, a passing note moved to another passing note), so 100% is not the aim.`,
  "",
  "## The third entries",
  "",
  `The two voices already sounding, judged while the third voice enters with the subject: ${passages} expositions. Clean: ${clean}. With an error (consecutives): ${withErrors}. The warnings left are mostly misreadings of the harmony (a held note read against a chord the next beat clarifies) and are listed so that each can be checked.`,
  "",
  "| fugue | bar | what the rules say |",
  "|---|---|---|",
  ...thirdRows,
  "",
  "## By fugue",
  "",
  "| fugue | voices | notes | flagged | per thousand |",
  "|---|---|---|---|---|",
  ...perFugue,
  "",
  "## The cases flagged in Bach (first 400)",
  "",
  "| fugue | bar | voice | note | rule | detail |",
  "|---|---|---|---|---|---|",
  ...examples,
  "",
];
writeFileSync("docs/wtc/trio-calibration.md", out.join("\n"));
console.log(out.slice(8, 28).join("\n"));
