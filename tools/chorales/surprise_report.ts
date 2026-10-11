/**
 * X1, Bach's exceptions: a map of surprise over his 370 chorales (docs/chorales/PLAN.md). Every
 * choice of his is measured by the generator's models trained without its tune: how many bits of
 * surprise it carries, and what the model expected instead, at five levels: the cadence at a phrase
 * end, the chord under a melody note, the bass and its position, the alto and tenor, the
 * embellishment of a lower voice.
 *
 * Rarity is not yet beauty: the surprising moments are the candidates, to be heard and rated by the
 * owner (the rating page, X3), and only then sorted into the avoided, the marked, the merely rare
 * opportunity and the slip.
 *
 * Output: docs/chorales/EXCEPTIONS.md (the report), data/chorales/generator/surprise.json (every
 * moment's surprise, compact), data/chorales/generator/exceptions-moments.json (the moments chosen
 * for rating, with their excerpts in ABC notation and as notes to play), and the rating page
 * data/chorales/generator/exceptions.html (tools/chorales/exceptions-page.html with the moments in it).
 * Run:  node tools/chorales/surprise_report.ts
 */
import { writeFileSync } from "node:fs";
import { BACH, melodyOf } from "../../src/chorale/generate/corpus.ts";
import { phraseEnds, trainModels } from "../../src/chorale/generate/index.ts";
import { placeOf } from "../../src/chorale/generate/bass.ts";
import { CALIBRATED, VoiceModel, voiceSurprise } from "../../src/chorale/generate/voices.ts";
import { Backoff, type Ctx } from "../../src/chorale/generate/model.ts";
import { DiminutionModel, STUDY } from "../../src/chorale/generate/diminution.ts";
import { bachSlots } from "../../src/chorale/generate/slots.ts";
import { midiOf } from "../../src/chorale/generate/theory.ts";
import { bachAs, options, reduce } from "../../src/chorale/level6.ts";
import { barAt, excerpt, thirty, writePage } from "./exceptions_lib.ts";

type Level = "cadence" | "chord" | "bass" | "sonority" | "voices" | "embellishment";
const LEVELS: Level[] = ["cadence", "chord", "bass", "sonority", "voices", "embellishment"];
interface Moment {
  id: string;
  no: number;
  level: Level;
  /** Onset in 32nds of a whole note, and the bar. */
  at: number;
  bar: number;
  bits: number;
  /** The voice concerned (0 soprano ... 3 bass), or null for the whole chord. */
  voice: number | null;
  did: string;
  expected: string;
  /** What kind of choice it is, so that the moments chosen for rating are not all of one kind. */
  pattern: string;
  /** The chorale's modal context where it is not plain major or minor (a modal idiom may be at work). */
  modal: string | null;
}

const bitsOf = (p: number | undefined) => -Math.log2(Math.max(p ?? 0, 1e-6));
const pc = (p: number) => (p < 0.005 ? "<1%" : `${Math.round(100 * p)}%`);
/** Bach's choice, marked where the model has not seen it at all without this tune. */
const never = (d: Map<string, number>, k: string) => (d.has(k) ? "" : " (found nowhere else in the chorales)");
const top = (d: Map<string, number>, n = 3) => [...d].sort((a, b) => b[1] - a[1]).slice(0, n);
const POS: Record<string, string> = { "5/3": "5/3", "6": "6", "6/4": "6/4", "7": "7", "6/5": "6/5", "4/3": "4/3", "4/2": "4/2" };
const deg = (d: string) => d.replace("#", "♯").replace("b", "♭");
const chordName = (c: string) => c.replace(/^b/, "♭").replace(/^#/, "♯");
const acc = (n: string) => n.replace(/#/g, "♯").replace(/b/g, "♭");
/** A chord as heard: its spelled root and kind, beside the label by pitch class. */
const spelled = (n: { chord: string; root: string; kind: string }) => `${chordName(n.chord)} (${acc(n.root)} ${n.kind})`;
/** A sonority counts as dissonant when it holds a second, fourth, seventh or ninth over the bass, a
 *  tritone (♯4, ♭5), an augmented sixth (♯6), or an incidental note. */
/** A sonority's distinct intervals over the bass, plain octaves and unisons (doublings) left out:
 *  "8/#6/3" and "#6/3" are one sonority. */
const sonorityOf = (lit: string) => [...new Set(lit.split("/").filter((x) => !/^(8|1)$/.test(x)))].join("/") || "8";
const dissonant = (n: { lit: string; inc: string }) => !!n.inc || /(^|\/)([#bn]?[2479]|#[46]|b5)(\/|$)/.test(n.lit);
const KIND: Record<string, string> = { passing: "a passing note", neighbourUp: "an upper neighbour", neighbourDown: "a lower neighbour", suspension: "a suspension", anticipation: "an anticipation", none: "no embellishment" };
const VOICES = ["soprano", "alto", "tenor", "bass"];

const study = new Map(STUDY.chorales.map((c) => [c.n, c]));
const tunes = [...new Set(BACH.map((c) => c.tune))];
const moments: Moment[] = [];
let aligned = 0,
  checked = 0;

for (const t of tunes) {
  const train = BACH.filter((c) => c.tune !== t);
  const models = trainModels(train);
  const vm = new VoiceModel(train);
  const trainNos = new Set(train.map((c) => c.no));
  // the sonority: the bass degree and every distinct interval over it (accidentals against the key),
  // given the mode, the place in the phrase and the melody degree
  const sonorityRows: Ctx[] = [];
  for (const c of train) {
    const cm = melodyOf(c);
    c.notes.forEach((n, i) => {
      if (dissonant(n)) sonorityRows.push({ mode: c.mode, place: placeOf(cm, i), deg: n.deg, s: `${n.bass}:${sonorityOf(n.lit)}` });
    });
  }
  // among Bach's dissonant sonorities only: how rare this one is among his dissonances there
  const sonority = new Backoff(sonorityRows, ["mode", "place", "deg"], "s");
  const dm = new DiminutionModel(
    STUDY.chorales.filter((c) => trainNos.has(c.n)),
    { parallel: vm.parallel, augSecond: vm.augSecond },
  );
  for (const c of BACH.filter((x) => x.tune === t)) {
    const s = study.get(c.no);
    if (!s) continue;
    const m = melodyOf(c);
    const at = (i: number) => thirty(c.notes[i].t);
    const modal = m.modal !== m.mode ? m.modal : null;
    const add = (level: Level, i: number, bits: number, voice: number | null, did: string, expected: string, pattern: string, time = at(i)) =>
      moments.push({ id: `${c.no}-${level}-${time}-${voice ?? "c"}`, no: c.no, level, at: time, bar: barAt(c, time), bits, voice, did, expected, pattern, modal });
    // the time base: Bach's events against the study's soprano
    for (let i = 0; i < c.notes.length; i++) {
      checked++;
      const sop = s.voices[0].find((n) => n[0] <= at(i) && at(i) < n[0] + n[1]);
      if (sop && midiOf(sop[2]) === c.notes[i].sm) aligned++;
    }
    // cadence
    for (const e of phraseEnds(m)) {
      const d = models.plan.model.dist({ mode: m.mode, modal: m.modal, close: e.close, position: e.position });
      const ch = c.notes[e.index].chord;
      add("cadence", e.index, bitsOf(d.get(ch)), null, `the ${e.position} phrase ends on ${spelled(c.notes[e.index])} (melody ${e.close.split("-").map(deg).join("–")})${never(d, ch)}`, top(d).map(([k, p]) => `${chordName(k)} ${pc(p)}`).join(", "), ch);
    }
    // chord, bass
    c.notes.forEach((n, i) => {
      const prev = i ? c.notes[i - 1].chord : "start";
      const d = models.harmony.model.dist({ mode: m.mode, modal: m.modal, deg: n.deg, prev });
      add("chord", i, bitsOf(d.get(n.chord)), null, `${spelled(n)} under melody degree ${deg(n.deg)}${i ? `, after ${chordName(prev)}` : ""}${never(d, n.chord)}`, top(d).map(([k, p]) => `${chordName(k)} ${pc(p)}`).join(", "), n.chord);
      if (dissonant(n)) {
        const ds = sonority.dist({ mode: m.mode, place: placeOf(m, i), deg: n.deg });
        const k = `${n.bass}:${sonorityOf(n.lit)}`;
        const name = (x: string) => {
          const [b, l] = x.split(":");
          return `${acc(l)} over bass degree ${deg(b)}`;
        };
        const inc = [...n.inc].map((v) => ({ S: "soprano", A: "alto", T: "tenor", B: "bass" })[v as "S"]).join(", ");
        add("sonority", i, bitsOf(ds.get(k)), null, `${name(k)}: ${spelled(n)}${inc ? `, incidental in the ${inc}` : ""}${never(ds, k)}`, top(ds).map(([x, p]) => `${name(x)} ${pc(p)}`).join(", "), sonorityOf(n.lit));
      }
      if (!n.pos) return;
      const prevBass = i ? c.notes[i - 1].bass : "start";
      const db = models.bass.model.dist({ mode: m.mode, modal: m.modal, place: placeOf(m, i), chord: n.chord, deg: n.deg, prev: prevBass });
      const name = (x: string) => {
        const [b, p] = x.split(":");
        return `${deg(b)} with ${POS[p] ?? p}`;
      };
      const k = `${n.bass}:${n.pos}`;
      add("bass", i, bitsOf(db.get(k)), 3, `bass on degree ${name(k)} under ${chordName(n.chord)}${never(db, k)}`, top(db).map(([x, p]) => `${name(x)} ${pc(p)}`).join(", "), n.pos);
    });
    // inner voices
    const slots = bachSlots(c);
    if (slots) {
      const A = c.notes.map((n) => n.a),
        T = c.notes.map((n) => n.tn);
      for (let i = 1; i < slots.length; i++) {
        const v = voiceSurprise(vm, slots, i, A, T, CALIBRATED);
        if (v) add("voices", i, v.bits, null, `alto ${A[i]}, tenor ${T[i]} (from ${A[i - 1]}, ${T[i - 1]})`, `alto ${v.expected.alto}, tenor ${v.expected.tenor} ${pc(v.expected.p)}`, `${Math.sign(midiOf(A[i]!) - midiOf(A[i - 1]!))}${Math.sign(midiOf(T[i]!) - midiOf(T[i - 1]!))}`);
      }
    }
    // embellishments: where Bach embellishes, how surprising his choice is
    const { voices, bach } = reduce(s, STUDY.kinds);
    for (const p of bach) {
      const line = voices[p.voice];
      const kind = bachAs(p, line);
      if (!kind || !options(line, p.index).includes(kind)) continue;
      const d = dm.choices(line, p.index, p.voice, 1);
      const note = line[p.index];
      moments.push({
        id: `${c.no}-embellishment-${note[0]}-${p.voice}`,
        no: c.no,
        level: "embellishment",
        at: note[0],
        bar: barAt(c, note[0]),
        bits: bitsOf(d.get(kind)),
        voice: p.voice,
        did: `${VOICES[p.voice]}: ${KIND[kind]} on ${note[2]}`,
        pattern: kind,
        modal: m.modal !== m.mode ? m.modal : null,
        expected: top(d as Map<string, number>).map(([k, q]) => `${KIND[k]} ${pc(q)}`).join(", "),
      });
    }
  }
}


// ---- choosing the moments to rate: the most surprising at each level, at most one per chorale per
// level and two per chorale in all, and at most two of one pattern (the same chord, position, kind)
// per level, so that one rare kind does not fill a level ----
const PER_LEVEL: Record<Level, number> = { cadence: 10, chord: 12, bass: 10, sonority: 10, voices: 12, embellishment: 10 };
const chosen: Moment[] = [];
const perChorale = new Map<number, number>();
for (const level of LEVELS) {
  const seen = new Set<number>();
  const patterns = new Map<string, number>();
  for (const x of moments.filter((y) => y.level === level).sort((a, b) => b.bits - a.bits)) {
    if (chosen.filter((y) => y.level === level).length >= PER_LEVEL[level]) break;
    if (seen.has(x.no) || (perChorale.get(x.no) ?? 0) >= 2 || (patterns.get(x.pattern) ?? 0) >= 2) continue;
    seen.add(x.no);
    patterns.set(x.pattern, (patterns.get(x.pattern) ?? 0) + 1);
    perChorale.set(x.no, (perChorale.get(x.no) ?? 0) + 1);
    chosen.push(x);
  }
}

const out = chosen.map((x) => {
  const c = BACH.find((y) => y.no === x.no)!;
  const s = study.get(x.no)!;
  return { ...x, bits: Number(x.bits.toFixed(1)), title: s.title, bwv: s.bwv, key: `${s.tonic} ${s.mode}`, scan: s.scan ?? null, ...excerpt(c, s, x) };
});
writeFileSync(new URL("../../data/chorales/generator/exceptions-moments.json", import.meta.url), JSON.stringify({ generated_by: "tools/chorales/surprise_report.ts", unit: "1/32 whole note", moments: out }) + "\n");
writeFileSync(
  new URL("../../data/chorales/generator/surprise.json", import.meta.url),
  JSON.stringify({
    generated_by: "tools/chorales/surprise_report.ts",
    note: "Every choice of Bach's measured by the generator's models trained without its tune: [chorale, level, onset in 32nds, bar, bits, voice or null].",
    levels: LEVELS,
    moments: moments.map((x) => [x.no, LEVELS.indexOf(x.level), x.at, x.bar, Number(x.bits.toFixed(2)), x.voice]),
  }) + "\n",
);

// ---- the report ----
const lines: string[] = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};
say("# Bach's exceptions, X1: a map of surprise");
say();
say("Generated by `node tools/chorales/surprise_report.ts`. Every choice in Bach's 370 chorales is measured by the generator's");
say("models trained without its tune (`src/chorale/generate/`): its surprise in bits (-log2 of the probability the model gave it;");
say("1 bit is a coin toss, 7 bits about 1 in 128) and what the model expected. Rarity is not yet beauty: the most surprising");
say("moments are candidates, to be heard and rated (the rating page), then sorted into the avoided, the marked, the merely rare");
say("opportunity and the slip (docs/chorales/PLAN.md, X2-X4).");
say();
say(`Time base checked: Bach's on-beat events and the study's soprano agree at ${pc(aligned / checked)} of ${checked} onsets.`);
say();
say("| level | choices measured | median bits | 90th percentile | 99th | most surprising |");
say("|---|---|---|---|---|---|");
for (const level of LEVELS) {
  const b = moments.filter((x) => x.level === level).map((x) => x.bits).sort((a, b) => a - b);
  const q = (f: number) => b[Math.min(b.length - 1, Math.floor(f * b.length))].toFixed(1);
  say(`| ${level} | ${b.length} | ${q(0.5)} | ${q(0.9)} | ${q(0.99)} | ${b[b.length - 1].toFixed(1)} |`);
}
say();
say("Embellishments are measured only where Bach embellishes (how surprising his choice of kind and place is); sonorities");
say("only where the sonority is dissonant (a second, fourth, seventh or ninth over the bass, a tritone, an augmented sixth,");
say("or an incidental note), and against Bach's dissonant sonorities only: the whole stack over the bass (its distinct intervals),");
say("given the melody degree and the place in the phrase. The inner voices");
say("are measured with the search's calibrated weights (src/chorale/generate/voices.ts CALIBRATED).");
say();
say("## The chorales with the most surprise");
say();
say("Mean bits per melody note over the chord and bass levels: the chorales where Bach departs most from his own habit.");
say();
say("| chorale | title | key | mean bits (chord) | mean bits (bass) | moments over 7 bits |");
say("|---|---|---|---|---|---|");
const per = BACH.map((c) => {
  const mine = moments.filter((x) => x.no === c.no);
  const mean = (l: Level) => {
    const b = mine.filter((x) => x.level === l).map((x) => x.bits);
    return b.reduce((a, y) => a + y, 0) / Math.max(1, b.length);
  };
  return { c, chord: mean("chord"), bass: mean("bass"), big: mine.filter((x) => x.bits > 7).length };
}).sort((a, b) => b.chord + b.bass - (a.chord + a.bass));
for (const r of per.slice(0, 20)) {
  const s = study.get(r.c.no)!;
  say(`| ${r.c.no} | ${s.title} | ${s.tonic} ${s.mode} | ${r.chord.toFixed(2)} | ${r.bass.toFixed(2)} | ${r.big} |`);
}
say();
say(`## The ${chosen.length} moments chosen for rating`);
say();
say("The most surprising at each level, at most one per chorale per level, two per chorale in all, and two of one pattern");
say("(the same chord, bass position or kind of embellishment) per level; on the rating page,");
say("each with its excerpt to read and hear.");
say();
say("| # | chorale | bar | level | bits | Bach | the model expected |");
say("|---|---|---|---|---|---|---|");
out.forEach((x, k) => say(`| ${k + 1} | ${x.no} | ${x.bar} | ${x.level} | ${x.bits} | ${x.did} | ${x.expected} |`));
writeFileSync(new URL("../../docs/chorales/EXCEPTIONS.md", import.meta.url), lines.join("\n") + "\n");

// ---- the rating page ----
writePage(
  new URL("../../data/chorales/generator/exceptions.html", import.meta.url),
  out.map(({ abc, play, mark, length, id, no, bar, level, bits, voice, did, expected, title, bwv, key, scan }) => ({ id, no, bar, level, bits, voice, did, expected, title, bwv, key, scan, abc, play, mark, length })),
);
