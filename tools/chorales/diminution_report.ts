/**
 * Step 5 of the chorale generator, diminution (src/chorale/generate/diminution.ts): how it compares
 * with Bach and Kittel.
 *
 *  1. Bach's chorales reduced (level6.ts `reduce`), each tune held out from what the model learns,
 *     read one chord per melody beat as the generator writes them: where does the generator
 *     embellish, how often, in what kinds, and with what surface, against Bach's own choices there?
 *  2. The four-part settings of step 4 (data/chorales/generator/satb.json): the generator's own and
 *     Kittel's basses with generated inner voices, embellished (Kittel's bass left as he wrote it).
 *
 * Output: docs/chorales/GENERATOR-DIMINUTION.md; data/chorales/generator/satb.json gains the
 * embellished voices ("dim"), which tools/chorales/generator_musicxml.py writes.
 * Run:  node tools/chorales/diminution_report.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { BACH } from "../../src/chorale/generate/corpus.ts";
import { VoiceModel } from "../../src/chorale/generate/voices.ts";
import { DiminutionModel, STUDY, bachRows, diminish, surfaceCost, type StudyChorale } from "../../src/chorale/generate/diminution.ts";
import { midiOf } from "../../src/chorale/generate/theory.ts";
import { bachAs, options, reduce, type Embellishment, type Note } from "../../src/chorale/level6.ts";
import { LEVEL5 } from "../../src/chorale/level5.ts";
import { rng } from "../../src/counterpoint/choices/cantus.ts";

const pct = (a: number, b: number) => `${b ? Math.round((100 * a) / b) : 0}%`;
const out: string[] = [];
const say = (s = "") => {
  out.push(s);
  console.log(s);
};
const KINDS: Embellishment[] = ["passing", "neighbourUp", "neighbourDown", "suspension", "anticipation"];
const VOICE = ["alto", "tenor", "bass"];

const vm = new VoiceModel(BACH);
const costs = { parallel: vm.parallel, augSecond: vm.augSecond };
const thirty = (t: string) => {
  const [a, b] = t.split("/").map(Number);
  return Math.round((32 * a) / (b ?? 1));
};

/** One of Bach's chorales reduced and read one chord per on-beat melody attack (as the generator
 *  writes), with his embellishments placed on those chords. */
function aligned(c: StudyChorale): { lines: Note[][]; bach: Record<number, Embellishment>[] } | null {
  const b = BACH.find((x) => x.no === c.n);
  if (!b) return null;
  const { voices, bach } = reduce(c, STUDY.kinds);
  const times = b.notes.map((n) => thirty(n.t));
  const end = c.length;
  const sounding = (line: Note[], t: number) => line.find((n) => n[0] <= t && t < n[0] + n[1]);
  const fermata = times.map((t) => !!sounding(c.voices[0], t)?.[3]);
  const lines: Note[][] = [];
  for (let v = 0; v < 4; v++) {
    const line: Note[] = [];
    for (let k = 0; k < times.length; k++) {
      const n = sounding(v === 0 ? c.voices[0] : voices[v], times[k]);
      if (!n) return null;
      const dur = (times[k + 1] ?? end) - times[k];
      line.push(fermata[k] ? [times[k], dur, n[2], 1] : [times[k], dur, n[2]]);
    }
    lines.push(line);
  }
  const chosen: Record<number, Embellishment>[] = [{}, {}, {}, {}];
  for (const p of bach) {
    const note = voices[p.voice][p.index];
    const kind = bachAs(p, voices[p.voice]);
    if (!kind) continue;
    const last = times.reduce((best, t, k) => (t < note[0] + note[1] ? k : best), -1);
    if (last >= 0 && options(lines[p.voice], last).includes(kind)) chosen[p.voice][last] = kind;
  }
  return { lines, bach: chosen };
}

// ---- 1. Bach held out ----
const tuneOf = new Map(BACH.map((b) => [b.no, b.tune]));
const byTune = new Map<string, StudyChorale[]>();
for (const c of STUDY.chorales) {
  const t = tuneOf.get(c.n) ?? `n${c.n}`;
  byTune.set(t, [...(byTune.get(t) ?? []), c]);
}
type Stat = { notes: number[]; emb: number[]; kinds: Record<string, number>[]; same: number; surface: number; chords: number };
const stat = (): Stat => ({ notes: [0, 0, 0], emb: [0, 0, 0], kinds: [{}, {}, {}], same: 0, surface: 0, chords: 0 });
const sBach = stat(),
  sDraw = stat(),
  sBest = stat();
let used = 0,
  skipped = 0;
for (const [t, cs] of byTune) {
  const dm = new DiminutionModel(STUDY.chorales.filter((c) => (tuneOf.get(c.n) ?? `n${c.n}`) !== t), costs);
  for (const c of cs) {
    const a = aligned(c);
    if (!a) {
      skipped++;
      continue;
    }
    used++;
    const sig = c.sig;
    const draw = diminish(dm, a.lines, sig, rng(c.n), 1);
    const best = diminish(dm, a.lines, sig);
    for (const [s, chosen] of [
      [sBach, a.bach],
      [sDraw, draw.chosen],
      [sBest, best.chosen],
    ] as const) {
      s.chords += a.lines[0].length;
      s.surface += surfaceCost(dm, a.lines, chosen, sig) > 0 ? surfaceCost(dm, a.lines, chosen, sig) / dm.parallel : 0;
      for (let v = 1; v < 4; v++) {
        for (let i = 0; i + 1 < a.lines[v].length; i++) {
          if (!options(a.lines[v], i).length) continue;
          s.notes[v - 1]++;
          const k = chosen[v][i];
          if (k) {
            s.emb[v - 1]++;
            s.kinds[v - 1][k] = (s.kinds[v - 1][k] ?? 0) + 1;
            if (a.bach[v][i] === k) s.same++;
          }
        }
      }
    }
  }
}

say("# The chorale generator, step 5: diminution");
say();
say("Generated by `node tools/chorales/diminution_report.ts`. Code: `src/chorale/generate/diminution.ts`; the kinds of");
say("embellishment, what a note can take and how it is written are the game's own (`src/chorale/level6.ts`); where Bach puts");
say("them is learnt from his 370 chorales reduced by `level6.ts reduce` (each tune held out below).");
say();
say("At every chord the alto's, tenor's and bass's choices are made together: each weighted by how often Bach makes it in");
say("that context (the voice, the move to the next note, the place in the phrase, the note's length), and the surface they");
say("make costed by its rarity in Bach (parallel fifths/octaves made by an incidental note, two incidental notes a second or");
say("seventh apart, an augmented second).");
say();
say(`## 1. Bach's chorales, reduced, each tune held out (${used} chorales; ${skipped} not read)`);
say();
say("Bach's chorales are read one chord per on-beat melody attack, as the generator writes, and his embellishments placed on");
say("those chords. *Embellished*: the share of the notes that can take an embellishment that take one.");
say();
const rows = bachRows(STUDY.chorales);
const own = (v: string) => pct(rows.filter((r) => r.voice === v && r.kind !== "none").length, rows.filter((r) => r.voice === v).length);
say(`On his own reduced voices (each voice in its own rhythm), Bach embellishes ${own("alto")} of the alto's notes that can take an`);
say(`embellishment, ${own("tenor")} of the tenor's, ${own("bass")} of the bass's. Read one chord per beat, as below, some of his are lost (an`);
say("embellishment after a note held over two beats, for instance), so his row below understates him a little.");
say();
say("| | alto embellished | tenor | bass | the same kind where Bach has one | surface rarities per 100 chords |");
say("|---|---|---|---|---|---|");
const row = (name: string, s: Stat) =>
  say(`| ${name} | ${pct(s.emb[0], s.notes[0])} | ${pct(s.emb[1], s.notes[1])} | ${pct(s.emb[2], s.notes[2])} | ${s === sBach ? "" : pct(s.same, sBach.emb.reduce((a, b) => a + b, 0))} | ${((100 * s.surface) / s.chords).toFixed(1)} |`);
row("*Bach*", sBach);
row("**generator, drawn** (as often as Bach)", sDraw);
row("generator, the most likely choice at every note", sBest);
say();
say("Kinds, by voice (share of the embellishments):");
say();
say(`| | ${VOICE.flatMap((v) => KINDS.map((k) => `${v} ${k}`)).join(" | ")} |`);
say(`|---|${VOICE.flatMap(() => KINDS.map(() => "---")).join("|")}|`);
const kindRow = (name: string, s: Stat) => say(`| ${name} | ${[0, 1, 2].flatMap((v) => KINDS.map((k) => pct(s.kinds[v][k] ?? 0, s.emb[v]))).join(" | ")} |`);
kindRow("*Bach*", sBach);
kindRow("**generator, drawn**", sDraw);
say();
say("*Surface rarities*: the surface cost in units of one pair of parallel fifths/octaves (a clash of two incidental notes");
say("counts half). Bach's own row is measured the same way on his reduced and re-embellished voices.");
say();

// ---- 2. The four-part settings of step 4 ----
const satbPath = new URL("../../data/chorales/generator/satb.json", import.meta.url);
const satb = JSON.parse(readFileSync(satbPath, "utf8")) as {
  chorales: {
    number: number;
    generated: { label: string; alto: [number, number, string][]; tenor: [number, number, string][]; bass: [number, number, string][]; dim?: unknown }[];
    kittel: { label: string; alto: [number, number, string][]; tenor: [number, number, string][]; bass: [number, number, string][]; dim?: unknown }[];
  }[];
};
const dmAll = new DiminutionModel(STUDY.chorales, costs);
const steps = (line: Note[]) => {
  let s = 0,
    m = 0;
  for (let i = 1; i < line.length; i++) {
    const d = Math.abs(midiOf(line[i][2]) - midiOf(line[i - 1][2]));
    if (!d) continue;
    m++;
    if (d <= 2) s++;
  }
  return [s, m];
};
const g = { notes: [0, 0, 0], emb: [0, 0, 0], bassSteps: [0, 0], plainSteps: [0, 0] },
  k = { notes: [0, 0, 0], emb: [0, 0, 0], kittelSteps: [0, 0] };
for (const ch of satb.chorales) {
  const l5 = LEVEL5[ch.number];
  const sig = l5.sig;
  const sopAt = (t: number) => l5.melody.find(([at, d]) => at <= t && t < at + d)!;
  const four = (v: { alto: [number, number, string][]; tenor: [number, number, string][]; bass: [number, number, string][] }): Note[][] => {
    const sop: Note[] = v.alto.map(([at, d]) => {
      const m = sopAt(at);
      return m[3] ? [at, d, m[2], 1] : [at, d, m[2]];
    });
    const mark = (l: [number, number, string][]) => l.map(([at, d, p], i) => (sop[i][3] ? [at, d, p, 1] : [at, d, p]) as Note);
    return [sop, mark(v.alto), mark(v.tenor), mark(v.bass)];
  };
  for (const v of ch.generated) {
    const lines = four(v);
    const d = diminish(dmAll, lines, sig, rng(3000 + ch.number), 1);
    v.dim = { alto: d.lines[1], tenor: d.lines[2], bass: d.lines[3] };
    for (let j = 0; j < 3; j++) {
      g.notes[j] += lines[j + 1].length;
      g.emb[j] += d.count[j];
    }
    const [s, m] = steps(d.lines[3]);
    g.bassSteps[0] += s;
    g.bassSteps[1] += m;
    const [s0, m0] = steps(lines[3]);
    g.plainSteps[0] += s0;
    g.plainSteps[1] += m0;
  }
  for (const v of ch.kittel) {
    // one bass note per chord: the bass of each of Kittel's harmonies (his passing notes are his own)
    const b0 = l5.basses.find((x) => `Kittel ${x.label}` === v.label)!;
    const lines = four({ alto: v.alto, tenor: v.tenor, bass: b0.slots.map((s) => [s.at, s.dur, s.bass] as [number, number, string]) });
    const d = diminish(dmAll, lines, sig, rng(4000 + ch.number), 1, [true, true, false]);
    v.dim = { alto: d.lines[1], tenor: d.lines[2], bass: v.bass };
    for (let j = 0; j < 2; j++) {
      k.notes[j] += lines[j + 1].length;
      k.emb[j] += d.count[j];
    }
    const b = l5.basses.find((x) => `Kittel ${x.label}` === v.label)!;
    const [s, m] = steps(b.bass.map(([at, du, p]) => [at, du, p] as Note));
    k.kittelSteps[0] += s;
    k.kittelSteps[1] += m;
  }
}
writeFileSync(satbPath, JSON.stringify(satb) + "\n");

say("## 2. The four-part settings of Kittel's melodies");
say();
say("The generator's eight settings of each of Kittel's 24 melodies (steps 1-4), and Kittel's own basses with generated");
say("inner voices (his bass left as he wrote it), embellished as drawn above. Kittel's melodies move in minims; the");
say("embellishments then move in crotchets, as his basses' passing notes do.");
say();
say("| | alto embellished (per note) | tenor | bass |");
say("|---|---|---|---|");
say(`| generator's settings | ${pct(g.emb[0], g.notes[0])} | ${pct(g.emb[1], g.notes[1])} | ${pct(g.emb[2], g.notes[2])} |`);
say(`| Kittel's basses | ${pct(k.emb[0], k.notes[0])} | ${pct(k.emb[1], k.notes[1])} | (his own) |`);
say();
say(`The bass moves by step in ${pct(g.bassSteps[0], g.bassSteps[1])} of its moves once embellished (${pct(g.plainSteps[0], g.plainSteps[1])} before);`);
say(`Kittel's basses, with their own passing notes, in ${pct(k.kittelSteps[0], k.kittelSteps[1])}.`);
say();
say("## Reading");
say();
say("- **The most likely choice is the same choice every time.** Where Bach usually embellishes (a third in the bass, filled");
say("  by a passing note more often than not), the most likely setting always does; where he sometimes does, it never does.");
say("  It embellishes about as much as the drawn settings, but without their variety: blandness here is sameness, not");
say("  plainness. The drawn settings vary as Bach does, note by note.");
say("- **Density.** Drawn, the generator embellishes somewhat more than Bach in this reading, most in the bass, partly because");
say("  the reading loses some of Bach's (above). The proportions of kind follow his by voice, with fewer suspensions in the");
say("  alto and tenor: his suspensions depend on the rhythm of the other voices, which this context does not see.");
say("- **The surface is cleaner than Bach's** (fewer parallel fifths/octaves made by passing notes, fewer clashes): the cost of");
say("  a rarity keeps the generator off it, where Bach sometimes goes. A case for the owner's distinction between rare and");
say("  bad and rare and good (see the plan for Bach's exceptions).");
say("- **Where** it embellishes agrees with Bach only in part (the column *the same kind where Bach has one*): Bach's choice");
say("  at a note depends on more than its context here (the text, the line's shape over several notes, the other voices'");
say("  rhythm). A finer context is the next refinement, measured here.");
say("- Not yet: embellishment of the soprano (the melody is given); escapes, appoggiaturas and free notes (Bach's rarer kinds,");
say("  not among the game's level-6 kinds); repeated notes tied, as Bach often writes them.");

writeFileSync(new URL("../../docs/chorales/GENERATOR-DIMINUTION.md", import.meta.url), out.join("\n") + "\n");
