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
import { BACH, melodyOf, type BachChorale } from "../../src/chorale/generate/corpus.ts";
import { phraseEnds, trainModels } from "../../src/chorale/generate/index.ts";
import { placeOf } from "../../src/chorale/generate/bass.ts";
import { VoiceModel, voiceSurprise } from "../../src/chorale/generate/voices.ts";
import { DiminutionModel, STUDY, type StudyChorale } from "../../src/chorale/generate/diminution.ts";
import { bachSlots } from "../../src/chorale/generate/slots.ts";
import { midiOf } from "../../src/chorale/generate/theory.ts";
import { bachAs, options, reduce, type Note } from "../../src/chorale/level6.ts";

type Level = "cadence" | "chord" | "bass" | "voices" | "embellishment";
const LEVELS: Level[] = ["cadence", "chord", "bass", "voices", "embellishment"];
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
}

const thirty = (t: string) => {
  const [a, b] = t.split("/").map(Number);
  return Math.round((32 * a) / (b ?? 1));
};
const bitsOf = (p: number | undefined) => -Math.log2(Math.max(p ?? 0, 1e-6));
const pc = (p: number) => (p < 0.005 ? "<1%" : `${Math.round(100 * p)}%`);
/** Bach's choice, marked where the model has not seen it at all without this tune. */
const never = (d: Map<string, number>, k: string) => (d.has(k) ? "" : " (found nowhere else in the chorales)");
const top = (d: Map<string, number>, n = 3) => [...d].sort((a, b) => b[1] - a[1]).slice(0, n);
const POS: Record<string, string> = { "5/3": "5/3", "6": "6", "6/4": "6/4", "7": "7", "6/5": "6/5", "4/3": "4/3", "4/2": "4/2" };
const deg = (d: string) => d.replace("#", "♯").replace("b", "♭");
const chordName = (c: string) => c.replace(/^b/, "♭").replace(/^#/, "♯");
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
  const dm = new DiminutionModel(
    STUDY.chorales.filter((c) => trainNos.has(c.n)),
    { parallel: vm.parallel, augSecond: vm.augSecond },
  );
  for (const c of BACH.filter((x) => x.tune === t)) {
    const s = study.get(c.no);
    if (!s) continue;
    const m = melodyOf(c);
    const at = (i: number) => thirty(c.notes[i].t);
    const add = (level: Level, i: number, bits: number, voice: number | null, did: string, expected: string, pattern: string, time = at(i)) =>
      moments.push({ id: `${c.no}-${level}-${time}-${voice ?? "c"}`, no: c.no, level, at: time, bar: barAt(c, time), bits, voice, did, expected, pattern });
    // the time base: Bach's events against the study's soprano
    for (let i = 0; i < c.notes.length; i++) {
      checked++;
      const sop = s.voices[0].find((n) => n[0] <= at(i) && at(i) < n[0] + n[1]);
      if (sop && midiOf(sop[2]) === c.notes[i].sm) aligned++;
    }
    // cadence
    for (const e of phraseEnds(m)) {
      const d = models.plan.model.dist({ mode: m.mode, close: e.close, position: e.position });
      const ch = c.notes[e.index].chord;
      add("cadence", e.index, bitsOf(d.get(ch)), null, `the ${e.position} phrase ends on ${chordName(ch)} (melody ${e.close.split("-").map(deg).join("–")})${never(d, ch)}`, top(d).map(([k, p]) => `${chordName(k)} ${pc(p)}`).join(", "), ch);
    }
    // chord, bass
    c.notes.forEach((n, i) => {
      const prev = i ? c.notes[i - 1].chord : "start";
      const d = models.harmony.model.dist({ mode: m.mode, deg: n.deg, prev });
      add("chord", i, bitsOf(d.get(n.chord)), null, `${chordName(n.chord)} under melody degree ${deg(n.deg)}${i ? `, after ${chordName(prev)}` : ""}${never(d, n.chord)}`, top(d).map(([k, p]) => `${chordName(k)} ${pc(p)}`).join(", "), n.chord);
      if (!n.pos) return;
      const prevBass = i ? c.notes[i - 1].bass : "start";
      const db = models.bass.model.dist({ mode: m.mode, place: placeOf(m, i), chord: n.chord, deg: n.deg, prev: prevBass });
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
        const v = voiceSurprise(vm, slots, i, A, T);
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
        expected: top(d as Map<string, number>).map(([k, q]) => `${KIND[k]} ${pc(q)}`).join(", "),
      });
    }
  }
}

function barAt(c: BachChorale, time: number): number {
  let bar = c.notes[0].m;
  for (const n of c.notes) if (thirty(n.t) <= time) bar = n.m;
  return bar;
}

// ---- choosing the moments to rate: the most surprising at each level, at most one per chorale per
// level and two per chorale in all, and at most two of one pattern (the same chord, position, kind)
// per level, so that one rare kind does not fill a level ----
const PER_LEVEL: Record<Level, number> = { cadence: 10, chord: 12, bass: 10, voices: 12, embellishment: 10 };
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

// ---- excerpts: from the bar before to the bar after, in ABC notation and as notes to play ----
const LETTERS = "CDEFGAB";
const ORDER = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
function sigAlter(sig: number, letter: string) {
  const order = sig > 0 ? "FCGDAEB" : "BEADGCF";
  return order.slice(0, Math.abs(sig)).includes(letter) ? Math.sign(sig) : 0;
}
function barStarts(c: BachChorale, s: StudyChorale): Map<number, number> {
  const out = new Map<number, number>();
  for (const n of c.notes) if (!out.has(n.m)) out.set(n.m, thirty(n.t));
  // bars where no melody note starts (a held note over the bar line) are filled from the meter
  const [num, den] = s.meter.split("/").map(Number);
  const len = (32 * num) / den;
  const bars = [...out.keys()].sort((a, b) => a - b);
  for (let k = bars[0]; k <= bars[bars.length - 1] + 1; k++) if (!out.has(k)) out.set(k, (out.get(k - 1) ?? 0) + len);
  return out;
}
function abcPitch(p: string, state: Map<string, number>, sig: number): string {
  const m = /^([A-G])([#b]*)(-?\d+)$/.exec(p)!;
  const alter = [...m[2]].reduce((a, ch) => a + (ch === "#" ? 1 : -1), 0);
  const key = m[1] + m[3];
  const current = state.has(key) ? state.get(key)! : sigAlter(sig, m[1]);
  let acc = "";
  if (current !== alter) {
    acc = alter === 0 ? "=" : alter > 0 ? "^".repeat(alter) : "_".repeat(-alter);
    state.set(key, alter);
  }
  const oct = Number(m[3]);
  const letter = oct >= 5 ? m[1].toLowerCase() + "'".repeat(oct - 5) : m[1] + ",".repeat(4 - oct);
  return acc + letter;
}
/** A length in 32nds as written note values (dotted where they fit), largest first. */
function values(d: number): number[] {
  const out: number[] = [];
  for (const v of [32, 28, 24, 16, 14, 12, 8, 7, 6, 4, 3, 2, 1])
    while (d >= v) {
      out.push(v);
      d -= v;
    }
  return out;
}
const len = (v: number) => (v === 1 ? "" : String(v));

function excerpt(c: BachChorale, s: StudyChorale, x: Moment) {
  const starts = barStarts(c, s);
  const first = Math.max(Math.min(...starts.keys()), x.bar - 1);
  const from = starts.get(first)!;
  const to = Math.min(starts.get(x.bar + 2) ?? s.length, s.length);
  const lines = [...starts.entries()].filter(([, t]) => t > from && t < to).map(([, t]) => t);
  const cuts = [...new Set([...lines, x.at])].sort((a, b) => a - b);
  const play: [number, number, number, number][] = [];
  const voiceAbc = s.voices.map((line: Note[], v) => {
    let out = "";
    let t = from;
    let state = new Map<string, number>();
    const notes = line.filter((n) => n[0] + n[1] > from && n[0] < to);
    const piece = (start: number, end: number, body: string, tie: boolean) => {
      // split at bar lines and at the moment, tied
      let a = start;
      const bounds = cuts.filter((u) => u > start && u < end);
      for (const b of [...bounds, end]) {
        if (lines.includes(a) && a !== from) {
          out += " | ";
          state = new Map();
        }
        const mark = a === x.at && (x.voice === null ? v === 0 : x.voice === v) ? '"^▼"' : "";
        out += mark + values(b - a).map((v) => body.replace("@", len(v))).join(" ") + (b < end || tie ? "-" : "") + " ";
        a = b;
      }
    };
    for (const n of notes) {
      const on = Math.max(n[0], from),
        off = Math.min(n[0] + n[1], to);
      if (on > t) piece(t, on, "z@", false);
      const head = (n[3] && v === 0 ? "!fermata!" : "") + abcPitch(n[2], state, s.sig);
      // a new note after a bar line re-reads its accidental: written per piece
      let a = on;
      const bounds = cuts.filter((u) => u > on && u < off);
      for (const b of [...bounds, off]) {
        if (lines.includes(a) && a !== from) {
          out += " | ";
          state = new Map();
        }
        const mark = a === x.at && (x.voice === null ? v === 0 : x.voice === v) ? '"^▼"' : "";
        const ph = a === on ? head : abcPitch(n[2], state, s.sig);
        const plain = ph.replace("!fermata!", "");
        out += mark + values(b - a).map((v, k) => (k ? plain : ph) + len(v)).join("- ") + (b < off ? "-" : "") + " ";
        a = b;
      }
      play.push([v, on - from, off - on, midiOf(n[2])]);
      t = off;
    }
    if (t < to) piece(t, to, "z@", false);
    return out.trim() + " |]";
  });
  const key = ORDER[s.sig + 7] ?? "C";
  const abc = [
    "X:1",
    `M:${s.meter}`,
    "L:1/32",
    `K:${key}`,
    "%%score (S A) (T B)",
    "V:S clef=treble stem=up",
    "V:A clef=treble stem=down",
    "V:T clef=bass stem=up",
    "V:B clef=bass stem=down",
    ...["S", "A", "T", "B"].map((name, v) => `[V:${name}] ${voiceAbc[v]}`),
  ].join("\n");
  return { abc, play, mark: x.at - from, length: to - from, fromBar: first };
}

const out = chosen.map((x) => {
  const c = BACH.find((y) => y.no === x.no)!;
  const s = study.get(x.no)!;
  return { ...x, bits: Number(x.bits.toFixed(1)), title: s.title, bwv: s.bwv, key: `${s.tonic} ${s.mode}`, scan: (s as unknown as { scan?: string }).scan ?? null, ...excerpt(c, s, x) };
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
say("Embellishments are measured only where Bach embellishes (how surprising his choice of kind and place is).");
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

// ---- the rating page: the template with the moments filled in ----
const template = (await import("node:fs")).readFileSync(new URL("./exceptions-page.html", import.meta.url), "utf8");
const page = template.replace("/*__MOMENTS__*/[]", JSON.stringify(out.map(({ abc, play, mark, length, id, no, bar, level, bits, voice, did, expected, title, bwv, key, scan }) => ({ id, no, bar, level, bits, voice, did, expected, title, bwv, key, scan, abc, play, mark, length }))));
writeFileSync(new URL("../../data/chorales/generator/exceptions.html", import.meta.url), page);
