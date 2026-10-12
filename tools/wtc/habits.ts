// Bach's habits in the fugues (docs/wtc/HABITS.md, D160 R3): counts over the 61 fugues (the 48, the Art of
// Fugue I-X, the Musical Offering's ricercars, BWV 903), each with the pieces that show it, never a number
// alone (as the chorales' PRINCIPLES.md). This first part rests on the subjects settled by hand (R1): the
// subject, the answer, the opening of the exposition. Usage: node tools/wtc/habits.ts
import { readFileSync, writeFileSync } from "node:fs";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { interval } from "../../src/counterpoint/interval.ts";
import { parsePitch } from "../../src/music/pitch.ts";
import { entryOrder, TPQ } from "../../src/wtc/fugue.ts";
import { place } from "../../src/wtc/compose/model.ts";
import { settled, type Settled } from "../../src/wtc/settled.ts";

const pieces = [...(JSON.parse(readFileSync("data/wtc/fugues.json", "utf8")) as WtcPiece[]), ...(JSON.parse(readFileSync("data/wtc/more.json", "utf8")) as WtcPiece[])];
const TITLE: Record<string, string> = {
  aof01: "AoF I", aof02: "AoF II", aof03: "AoF III", aof04: "AoF IV", aof05: "AoF V", aof06: "AoF VI", aof07: "AoF VII", aof08: "AoF VIII", aof09: "AoF IX", aof10: "AoF X", mo3: "MO a 3", mo6: "MO a 6", bwv903f: "BWV 903",
};
const name = (id: string) => TITLE[id] ?? `${id[3] === "1" ? "I" : "II"}/${Number(id.slice(5))}`;
const setOf = (id: string) => (id.startsWith("wtc1") ? "WTC I" : id.startsWith("wtc2") ? "WTC II" : id.startsWith("aof") ? "Art of Fugue" : id.startsWith("mo") ? "Musical Offering" : "BWV 903");
const SETS = ["WTC I", "WTC II", "Art of Fugue", "Musical Offering", "BWV 903"];
const keyOf = (p: WtcPiece) => (p.mode === "minor" ? p.key.toLowerCase() : p.key);
const DEG = ["1", "2", "3", "4", "5", "6", "7"];
const degName = (pitch: string, key: string) => {
  const pl = place(pitch, key);
  return `${pl.alter > 0 ? "♯" : pl.alter < 0 ? "♭" : ""}${DEG[pl.deg]}${pl.raised ? "↑" : ""}`;
};
const midi = (p: string) => parsePitch(p).midi;
const dia = (p: string) => parsePitch(p).diatonic;

interface Row {
  id: string;
  set: string;
  p: WtcPiece;
  s: Settled;
  key: string;
  bar: number;
  /** Subject: bars, notes, range, first and last degree, upbeat, chromatic notes, leaps. */
  bars: number;
  notes: number;
  range: number;
  first: string;
  last: string;
  upbeat: boolean;
  chromatic: number;
  augLeaps: string[];
  biggest: number;
  modulates: boolean;
  headTail: boolean;
  answerUp: boolean;
  answerSteps: number;
}

const rows: Row[] = [];
for (const p of pieces) {
  const s = settled(p.id);
  if (!s) continue;
  const key = keyOf(p);
  const [n, d] = p.meter.split("/").map(Number);
  const bar = (n * 4 * TPQ) / d;
  const sub = s.subject;
  const first1 = p.bars.find((b) => b.n === 1)?.on ?? 0;
  const span = sub[sub.length - 1].on + sub[sub.length - 1].dur - sub[0].on;
  const pls = sub.map((x) => place(x.pitch, key));
  const leaps = sub.slice(1).map((x, i) => interval(sub[i].pitch, x.pitch));
  const augLeaps = leaps.filter((iv) => ["A", "AA", "d", "dd"].includes(iv.quality) && iv.number > 1).map((iv) => iv.name);
  const from = Math.floor(sub.length / 2);
  const modulates = pls.some((pl, i) => i >= from && i + 1 < sub.length && pl.deg === 3 && pl.alter > 0 && pls[i + 1].deg === 4);
  const durs = sub.map((x) => x.dur);
  const half = Math.ceil(sub.length / 2);
  const meanDur = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  // The answer's interval: the commonest letter distance from the subject's notes, mutated notes aside.
  const tally = new Map<number, number>();
  s.answer.forEach((a, i) => {
    if (s.mutated.includes(i) || i >= sub.length) return;
    const k = dia(a.pitch) - dia(sub[i].pitch);
    tally.set(k, (tally.get(k) ?? 0) + 1);
  });
  const steps = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  rows.push({
    id: p.id,
    set: setOf(p.id),
    p,
    s,
    key,
    bar,
    bars: span / bar,
    notes: sub.length,
    range: Math.max(...sub.map((x) => midi(x.pitch))) - Math.min(...sub.map((x) => midi(x.pitch))),
    first: degName(sub[0].pitch, key),
    last: degName(sub[sub.length - 1].pitch, key),
    upbeat: ((sub[0].on - first1) % bar + bar) % bar !== 0,
    chromatic: pls.filter((pl) => pl.alter !== 0).length,
    augLeaps,
    biggest: Math.max(...leaps.map((iv) => iv.number)),
    modulates,
    headTail: meanDur(durs.slice(0, half)) >= 1.75 * meanDur(durs.slice(half)),
    answerUp: steps > 0,
    answerSteps: steps,
  });
}

const out: string[] = [];
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");
const list = (rs: Row[], k = 8) => rs.slice(0, k).map((r) => name(r.id)).join(", ") + (rs.length > k ? ` … (${rs.length})` : "");
/** A distribution of a feature, with the pieces of each value. */
function dist(title: string, f: (r: Row) => string, rs = rows) {
  const m = new Map<string, Row[]>();
  for (const r of rs) m.set(f(r), [...(m.get(f(r)) ?? []), r]);
  out.push(`${title}:`, "");
  for (const [k, v] of [...m.entries()].sort((a, b) => b[1].length - a[1].length)) out.push(`- **${k}**: ${v.length} (${pct(v.length, rs.length)}): ${list(v)}`);
  out.push("");
}
/** The same split by set: one line per set. */
function bySet(title: string, f: (r: Row) => boolean) {
  out.push(`${title}, by set:`, "");
  for (const set of SETS) {
    const rs = rows.filter((r) => r.set === set);
    const yes = rs.filter(f);
    out.push(`- ${set}: ${yes.length} of ${rs.length}${yes.length && yes.length < rs.length ? ` (${list(yes, 6)})` : ""}`);
  }
  out.push("");
}

out.push(
  "# Bach's habits in the fugues",
  "",
  "Generated by `node tools/wtc/habits.ts` (D160, docs/wtc/RESEARCH.md step R3). Counts over 61 fugues: the 48",
  "(WTC I, II), the Art of Fugue's Contrapuncti I-X, the Musical Offering's ricercars a 3 and a 6, the fugue of",
  "BWV 903. Every count names its pieces, to be looked at in the score. These are **observations**, not",
  "rules: which (if any) become precepts of the game is the owner's decision, as with Fux (D39) and the",
  "chorales (C1, C4).",
  "",
  "This first part rests on the subjects settled by hand from the score (docs/wtc/SUBJECTS.md): the subject,",
  "the answer, the opening of the exposition. Episodes, the key plan, strettos, cadences and the treatment of",
  "dissonance follow when the analysis is run over the 61 with these subjects (step R2).",
  "",
  "Degrees: in minor, ↑ marks the raised sixth or seventh (the melodic minor's), which belong to the key;",
  "♯ and ♭ mark notes outside it.",
  "",
  "## What stands out",
  "",
  "A first reading of the counts below; each point is to be checked in the pieces named.",
  "",
  "1. **The head rule holds without exception.** Every subject that begins on ^5 (20 of the 61) is",
  "   answered from ^1: the tonic answers the dominant at the head, in the 48 as in the late works.",
  "   It is the one candidate for a boundary that the corpus offers without a counter-example.",
  "2. **The tonal answer is a matter of the head.** 35 answers are tonal; in 30 of them the first",
  "   mutated note is the first or second. Beyond the head the answer is a transposition.",
  "3. **Subjects begin on ^1 or ^5** (58 of 61; II/13 on ^7, II/21 on ^2, the new subject of AoF X",
  "   on the raised seventh) **and end on ^1, ^3 or ^5** (57 of 61). A subject states its key.",
  "4. **Links come before the third entry, not before the answer.** A codetta between subject and",
  "   answer in 8 of 61; before the third entry in 37 of 60. The answer follows at once; the third",
  "   entry is prepared.",
  "5. **The late works differ from the 48 in two habits.** Their subjects begin on the downbeat (all",
  "   but the three new subjects of AoF VIII-X, and both ricercars), where the 48's mostly begin",
  "   after it (34 of 48); and their answers are tonal (AoF I-IV, both ricercars, BWV 903), where the",
  "   48 are divided (28 tonal, 20 real). The stile antico's long notes and the old answer within",
  "   the mode, on one side; the keyboard fugue's upbeat subjects, on the other.",
  "",
  "## 1. The subject",
  "",
);
const sorted = [...rows].sort((a, b) => a.bars - b.bars);
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
out.push(
  `**Length.** From ${sorted[0].bars.toFixed(2)} bars (${name(sorted[0].id)}) to ${sorted[sorted.length - 1].bars.toFixed(2)} (${name(sorted[sorted.length - 1].id)}); half are ${med(rows.map((r) => r.bars)).toFixed(2)} bars or shorter. In notes, from ${Math.min(...rows.map((r) => r.notes))} to ${Math.max(...rows.map((r) => r.notes))} (median ${med(rows.map((r) => r.notes))}).`,
  "",
);
dist("**Length in bars**, rounded up", (r) => `${Math.ceil(r.bars - 1e-6)} bar${Math.ceil(r.bars - 1e-6) > 1 ? "s" : ""}`);
out.push(`**Range.** From ${Math.min(...rows.map((r) => r.range))} semitones to ${Math.max(...rows.map((r) => r.range))} (median ${med(rows.map((r) => r.range))}); within an octave (12 or fewer) in ${rows.filter((r) => r.range <= 12).length} of ${rows.length}. Wider than an octave: ${list(rows.filter((r) => r.range > 12), 20)}.`, "");
dist("**The first note**, as a degree of the key", (r) => `^${r.first}`);
dist("**The last note**", (r) => `^${r.last}`);
bySet("**Beginning off the downbeat** (after a rest or on an upbeat)", (r) => r.upbeat);
bySet("**Modulating to the dominant** (a raised ^4 rising to ^5 in the second half)", (r) => r.modulates);
bySet("**Chromatic notes** (outside the key, the minor's raised ^6 and ^7 aside): at least one", (r) => r.chromatic > 0);
out.push(`Most chromatic: ${[...rows].sort((a, b) => b.chromatic - a.chromatic).slice(0, 6).map((r) => `${name(r.id)} (${r.chromatic})`).join(", ")}.`, "");
bySet("**An augmented or diminished leap**", (r) => r.augLeaps.length > 0);
out.push(`The leaps: ${rows.filter((r) => r.augLeaps.length).map((r) => `${name(r.id)} ${r.augLeaps.join(", ")}`).join("; ")}.`, "");
dist("**The widest leap**", (r) => (r.biggest <= 2 ? "a step at most" : r.biggest === 8 ? "an octave" : r.biggest > 8 ? "beyond the octave" : `a ${["", "", "", "third", "fourth", "fifth", "sixth", "seventh"][r.biggest]}`));
bySet("**Head and tail** (the first half's notes on average at least 1.75 times as long as the second half's: a theme then its spinning-out)", (r) => r.headTail);

out.push("## 2. The answer", "");
dist("**Real or tonal**", (r) => r.s.answerKind);
bySet("**Tonal**", (r) => r.s.answerKind === "tonal");
const onFive = rows.filter((r) => r.first === "5");
const fiveToOne = onFive.filter((r) => r.s.answer[0] && place(r.s.answer[0].pitch, r.key).deg === 0);
out.push(
  `**The head rule.** Of the ${onFive.length} subjects beginning on ^5, ${fiveToOne.length} are answered from ^1 (the tonic answering the dominant): ${list(fiveToOne, 30)}.${onFive.length > fiveToOne.length ? ` Not: ${list(onFive.filter((r) => !fiveToOne.includes(r)), 10)}.` : ""} Fux states the same exchange of the mode's fifth and fourth (Exercitium V; docs/fux/fugue.md when read).`,
  "",
);
const tonal = rows.filter((r) => r.s.answerKind === "tonal");
dist("**Where the tonal answer departs** (the first mutated note: 1st, 2nd …)", (r) => (r.s.mutated.length ? `note ${r.s.mutated[0] + 1}` : "none listed"), tonal);
dist(
  "**The answer's interval** (from the subject, mutated notes aside)",
  (r) => {
    if (r.s.answerKind === "inverted") return "inverted (a stretto exposition)";
    const k = r.answerSteps;
    const names: Record<number, string> = { 4: "a fifth above", "-3": "a fourth below", 3: "a fourth above", "-4": "a fifth below", 11: "a twelfth above", "-10": "an eleventh below", "-11": "a twelfth below", 10: "an eleventh above", 0: "the unison", 7: "an octave above", "-7": "an octave below" } as unknown as Record<number, string>;
    return names[k] ?? `${k} steps`;
  },
);

out.push("## 3. The opening of the exposition", "");
const pos = (r: Row, v: number) => (v === 0 ? "top" : v === r.p.voices.length - 1 ? "bottom" : "middle");
dist("**The voice that begins**", (r) => `${pos(r, r.s.voice)} (of ${r.p.voices.length})`);
dist("**The answer above or below the subject**", (r) => (r.s.answerVoice < r.s.voice ? "above" : "below"));
dist("**A link (codetta) between subject and answer**", (r) => (r.s.codettaBeforeAnswer ? "yes" : "no"));
dist("**A link before the third entry**", (r) => (r.s.codettaBeforeThird === null ? "two voices" : r.s.codettaBeforeThird ? "yes" : "no"));
const order = (r: Row) => entryOrder(r.p).map(([v]) => pos(r, v)[0].toUpperCase()).join("");
dist("**The order of entry** (T top, M middle, B bottom)", order);

writeFileSync("docs/wtc/HABITS.md", out.join("\n") + "\n");
console.log(out.slice(0, 40).join("\n"));
