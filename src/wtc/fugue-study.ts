/**
 * A fugue for study: its moments (every entry, strettos, episodes and their sequences, pedal points,
 * cadences, the climax) and its sections (the exposition, then the stretches between cadences), each
 * a span of time that can be heard on its own, with a voice in the foreground.
 *
 * Everything here is read automatically from the notes (entries by src/wtc/fugue.ts, harmony by
 * src/wtc/trio.ts), so it is a first reading, to be corrected where it errs, not an analysis.
 */
import { parsePitch } from "../music/pitch.ts";
import { TPQ, type WtcPiece } from "./corpus.ts";
import { exposition, voiceNames } from "./exposition.ts";
import { findTransformed, line, type Entry, type Note } from "./fugue.ts";
import { laterSubjects } from "./subjects.ts";
import { entryKey } from "./keyplan.ts";
import { episodes, strettos, subjectLength } from "./structure.ts";
import { beatTicks as beatOf, harmonicWindow, harmonies, type Harmony } from "./trio.ts";

export type MomentKind = "entry" | "stretto" | "episode" | "pedal" | "cadence" | "climax";

export interface Moment {
  kind: MomentKind;
  on: number;
  end: number;
  /** The voice to bring forward when it is heard, if one. */
  voice: number | null;
  label: string;
  detail: string;
}

export interface Section {
  on: number;
  end: number;
  label: string;
  detail: string;
}

const P = parsePitch;
const pc = (p: string) => ((P(p).midi % 12) + 12) % 12;
const FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
/** Key names spelled as the home key's signature leans: flats in flat keys, sharps in sharp ones. */
const keyNames = (p: WtcPiece) => {
  const flatKey = p.key.includes("b") || (p.mode === "major" ? p.key === "F" : ["D", "G", "C", "F"].includes(p.key));
  return flatKey ? FLATS : SHARPS;
};
const MAJOR_ROMAN: Record<number, string> = { 0: "I", 1: "♭II", 2: "II", 3: "♭III", 4: "III", 5: "IV", 6: "♯IV", 7: "V", 8: "♭VI", 9: "VI", 10: "♭VII", 11: "VII" };
const MINOR_ROMAN: Record<number, string> = { 0: "I", 1: "♭II", 2: "II", 3: "III", 4: "♮III", 5: "IV", 6: "♯IV", 7: "V", 8: "VI", 9: "♮VI", 10: "VII", 11: "♯VII" };

/** A key's Roman numeral against the home key: the root's distance, upper case major, lower case minor. */
export function romanOf(p: WtcPiece, root: number, minor: boolean): string {
  const home = pc(`${p.key}4`);
  const r = (p.mode === "major" ? MAJOR_ROMAN : MINOR_ROMAN)[(root - home + 12) % 12];
  return minor ? r.toLowerCase() : r;
}

const barOf = (p: WtcPiece, t: number) => [...p.bars].reverse().find((b) => b.on <= t)?.n ?? 1;

/** Cadences: a dominant (major triad or dominant seventh) whose root falls a fifth to a triad on a strong beat, the bass leaping with it. */
export function cadences(p: WtcPiece, lines: Note[][], H: Harmony[], meter: string): { on: number; root: number; minor: boolean; perfect: boolean }[] {
  const w = harmonicWindow(meter);
  const [num, den] = meter.split("/").map(Number);
  const bar = (num * 4 * TPQ) / den;
  const strong = (t: number) => t % bar === 0 || (num % 2 === 0 && num >= 4 && t % (bar / 2) === 0) || (num === 2 && t % (bar / 2) === 0 && den <= 2);
  const lowest = (t: number) => {
    let m: Note | null = null;
    for (const l of lines) for (const n of l) if (n.on <= t && t < n.on + n.dur && (!m || P(n.pitch).midi < P(m.pitch).midi)) m = n;
    return m;
  };
  const highest = (t: number) => {
    let m: Note | null = null;
    for (const l of lines) for (const n of l) if (n.on <= t && t < n.on + n.dur && (!m || P(n.pitch).midi > P(m.pitch).midi)) m = n;
    return m;
  };
  const out: { on: number; root: number; minor: boolean; perfect: boolean }[] = [];
  for (let k = 1; k < H.length; k++) {
    const b = H[k];
    // The arrival: a triad (a passing seventh above it read as a major or minor seventh chord).
    const arrives = ["major", "minor", "major seventh", "minor seventh"].includes(b.name);
    if (!b.pcs.length || !strong(b.on) || !arrives) continue;
    // Within the bar, an arrival that at once becomes a dominant seventh is a step in a sequence, not a cadence.
    const next = H[k + 1];
    if (b.on % bar !== 0 && next && next.root === b.root && next.name === "dominant seventh") continue;
    // The dominant in one of the two windows before (a cadential 6/4 or a passing chord may stand between).
    const dom = [H[k - 1], H[k - 2]].some((a) => a && (a.name === "major" || a.name === "dominant seventh") && (a.root - b.root + 12) % 12 === 7);
    if (!dom) continue;
    // The bass: on the tonic at the arrival, on the dominant somewhere in the beat before.
    const bb = lowest(b.on);
    if (!bb || pc(bb.pitch) !== b.root) continue;
    let fromDominant = false;
    for (let t = b.on - w; t < b.on; t += w / 4) {
      const x = lowest(t);
      if (x && pc(x.pitch) === (b.root + 7) % 12) fromDominant = true;
    }
    if (!fromDominant) continue;
    const top = highest(b.on);
    out.push({ on: b.on, root: b.root, minor: b.name.startsWith("minor"), perfect: !!top && pc(top.pitch) === b.root });
  }
  // Drop those within two windows of the one before.
  return out.filter((c, i) => i === 0 || c.on - out[i - 1].on > 2 * w);
}

export interface Study {
  moments: Moment[];
  sections: Section[];
}

/** The moments and sections of a fugue, from its subject, answer and entries. */
export interface GivenSection {
  from: number;
  to: number;
  label: string;
}

/**
 * `later`: where later subjects of a double or triple fugue first enter (data/wtc/later-subjects.json).
 * `given`: sections as the literature reads them (data/wtc/ledbetter-sections.json); where given, they
 * replace the sections read from the cadences (the analysis's weakest reading).
 */
export function study(p: WtcPiece, subject: Note[], answer: Note[], entries: Entry[], later: { n: number; bar: number }[] = [], given: GivenSection[] = []): Study {
  const lines = p.voices.map(line);
  const names = voiceNames(p.voices.length);
  const longNames: Record<string, string> = { S: "soprano", A: "alto", T: "tenor", B: "bass", S1: "first soprano", S2: "second soprano", upper: "upper voice", lower: "lower voice" };
  const vname = (v: number) => longNames[names[v]] ?? names[v];
  const len = subjectLength(subject);
  const [num, den] = p.meter.split("/").map(Number);
  const bar = (num * 4 * TPQ) / den;
  const moments: Moment[] = [];

  const straight = entries;
  const inStretto = new Set(strettos(p, straight, subject).map(([, b]) => b));
  const expo = exposition(p, subject, answer, entries);
  const answers = new Set(expo.filter((x) => x.role === "answer").map((x) => x.on));
  for (const e of straight) {
    const k = entryKey(p, e, subject);
    const isAnswer = answers.has(e.on) && expo.some((x) => x.on === e.on && x.voice === e.voice);
    moments.push({
      kind: "entry",
      on: e.on,
      end: e.on + len,
      voice: e.voice,
      label: `${e.form === "inversion" ? "Inverted entry" : isAnswer ? "Answer" : "Entry"} in the ${vname(e.voice)}, ${isAnswer ? (p.mode === "minor" ? "v" : "V") : k.roman}`,
      detail: `bar ${barOf(p, e.on)}, in ${k.name[0].toUpperCase() + k.name.slice(1).replace("b", "♭").replace("#", "♯")} ${k.name[0] === k.name[0].toUpperCase() ? "major" : "minor"}${inStretto.has(e) ? ", in stretto" : ""}${e.changed && !isAnswer ? `, ${e.changed} interval${e.changed > 1 ? "s" : ""} altered` : isAnswer && e.changed ? ", a tonal answer" : ""}`,
    });
  }
  // Entries of the later subjects.
  const ORD = ["", "first", "second", "third", "fourth"];
  laterSubjects(p, subject, answer, later.map((l) => l.bar)).forEach((ls, i) => {
    const n = later[i]?.n ?? i + 2;
    ls.occurrences.forEach((o, k) => {
      moments.push({
        kind: "entry",
        on: o.on,
        end: o.end,
        voice: o.voice,
        label: `${k === 0 ? "The " + ORD[n] + " subject enters" : "Entry of the " + ORD[n] + " subject"}, in the ${vname(o.voice)}`,
        detail: `bar ${barOf(p, o.on)}`,
      });
    });
  });
  // Entries in augmentation and diminution.
  for (const e of findTransformed(p, subject)) {
    const span = e.scale * len;
    moments.push({
      kind: "entry",
      on: e.on,
      end: e.on + span,
      voice: e.voice,
      label: `Entry in ${e.scale === 2 ? "augmentation" : "diminution"}${e.form === "inversion" ? " and inversion" : ""}, in the ${vname(e.voice)}`,
      detail: `bar ${barOf(p, e.on)}, every value ${e.scale === 2 ? "doubled" : "halved"}`,
    });
  }
  // Stretto passages: chains of entries, each beginning before the one before it has ended.
  const beats = (t: number) => {
    const x = Math.round((t / TPQ) * 2) / 2;
    return `${x} beat${x === 1 ? "" : "s"}`;
  };
  const sorted = [...straight].sort((a, b) => a.on - b.on);
  for (let i = 0; i < sorted.length; i++) {
    const chain = [sorted[i]];
    let end = sorted[i].on + len;
    let j = i + 1;
    // In stretto the next voice enters before the one before is halfway through the subject (a long
    // subject's ordinary exposition, the answer entering on its last notes, is no stretto).
    while (j < sorted.length && sorted[j].on - chain[chain.length - 1].on < len / 2 && sorted[j].voice !== chain[chain.length - 1].voice) {
      chain.push(sorted[j]);
      end = Math.max(end, sorted[j].on + len);
      j++;
    }
    if (chain.length < 2) continue;
    moments.push({
      kind: "stretto",
      on: chain[0].on,
      end,
      voice: chain[1].voice,
      label: `Stretto in ${chain.length} voices: ${chain.map((e, k) => (k ? `the ${vname(e.voice)} ${beats(e.on - chain[k - 1].on)} later` : `the ${vname(e.voice)}`)).join(", ")}`,
      detail: `bars ${barOf(p, chain[0].on)}–${barOf(p, end - 1)}`,
    });
    i = j - 1;
  }
  for (const ep of episodes(p, straight, subject)) {
    const s = ep.sequence;
    moments.push({
      kind: "episode",
      on: ep.on,
      end: ep.end,
      voice: s ? s.voice : null,
      label: s ? `Episode on a sequence (${vname(s.voice)}, a ${s.notes}-note figure ${s.times} times, ${s.step > 0 ? "rising" : "falling"} by ${Math.abs(s.step) === 1 ? "step" : `${Math.abs(s.step) + 1}ths`.replace("3ths", "thirds").replace("4ths", "fourths").replace("5ths", "fifths")})` : "Episode",
      detail: `bars ${barOf(p, ep.on)}–${barOf(p, ep.end - 1)}${ep.fromSubject ? "; its figure comes from the subject" : ""}`,
    });
  }
  // Pedal points: the lowest voice holding (or repeating) one pitch for a bar or more.
  lines.forEach((l, v) => {
    for (let i = 0; i < l.length; i++) {
      let j = i;
      // Held, or repeated (with rests between of no more than a beat: a drum-bass pedal).
      while (j + 1 < l.length && l[j + 1].pitch === l[i].pitch && l[j + 1].on <= l[j].on + l[j].dur + beatOf(p.meter)) j++;
      const on = l[i].on;
      const end = l[j].on + l[j].dur;
      // A bar at least, and four beats (in alla breve, four minims: a whole note held across a short
      // bar is a suspension, not a pedal).
      if (end - on >= Math.max(bar, 4 * beatOf(p.meter))) {
        const lowest = lines.every((x, u) => u === v || x.every((n) => n.on + n.dur <= on || n.on >= end || P(n.pitch).midi >= P(l[i].pitch).midi));
        // Above the bass, an inner or upper pedal must last longer (two bars and eight beats at least: a
        // long note in an old-style fugue is not a pedal), and the tonic or dominant.
        const degree = (pc(l[i].pitch) - pc(`${p.key}4`) + 12) % 12;
        const high = !lowest && end - on >= Math.max(2 * bar, 8 * beatOf(p.meter)) && (degree === 0 || degree === 7);
        if ((lowest || high) && !moments.some((m) => m.kind === "pedal" && m.on === on && m.end === end)) {
          const where = lowest ? "" : v === 0 ? "Upper " : "Inner ";
          const what = `${degree === 0 ? "tonic" : degree === 7 ? "dominant" : ""} pedal point on ${l[i].pitch.replace(/-?\d+$/, "").replace("b", "♭").replace("#", "♯")}`.trim();
          moments.push({ kind: "pedal", on, end, voice: v, label: where ? `${where}${what}` : what[0].toUpperCase() + what.slice(1), detail: `bars ${barOf(p, on)}–${barOf(p, end - 1)}, in the ${vname(v)}` });
        }
      }
      i = j;
    }
  });
  // The climax: the highest note, its first appearance.
  let top: [number, Note] | null = null;
  lines.forEach((l, v) => l.forEach((n) => (!top || P(n.pitch).midi > P(top[1].pitch).midi) && (top = [v, n])));
  if (top) {
    const [v, n] = top as [number, Note];
    moments.push({ kind: "climax", on: Math.max(0, n.on - bar), end: n.on + n.dur + bar / 2, voice: v, label: `The highest note: ${n.pitch.replace("b", "♭").replace("#", "♯")}`, detail: `bar ${barOf(p, n.on)}, in the ${vname(v)}` });
  }
  // Cadences.
  const H = harmonies(lines, p.meter, p.length);
  const cads = cadences(p, lines, H, p.meter);
  const [bn, bd] = p.meter.split("/").map(Number);
  const barLen = (bn * 4 * TPQ) / bd;
  // A cadence worth hearing: the top voice arrives on the key's tonic, or the arrival falls on a downbeat.
  const real = cads.filter((c) => c.perfect || c.on % barLen === 0);
  for (const c of real) {
    const roman = romanOf(p, c.root, c.minor);
    moments.push({
      kind: "cadence",
      on: Math.max(0, c.on - bar),
      end: c.on + bar / 2,
      voice: null,
      label: `${c.perfect ? "Perfect cadence" : "Cadence"} in ${roman} (${keyNames(p)[c.root]} ${c.minor ? "minor" : "major"})`,
      detail: `bar ${barOf(p, c.on)}${c.perfect ? ", the top voice on the key's tonic" : ""}`,
    });
  }
  moments.sort((a, b) => a.on - b.on || a.kind.localeCompare(b.kind));

  // Sections: the exposition (to the end of its last entry), then from cadence to cadence (at least
  // two bars apart), the last running to the end.
  const expoEnd = expo.length ? Math.max(...expo.map((e) => e.on)) + len : len;
  const cuts = [0, expoEnd];
  // Sections end at perfect cadences (the top voice on the tonic), at least two bars apart.
  for (const c of cads) if (c.perfect && c.on > cuts[cuts.length - 1] + 2 * bar && p.length - c.on > 2 * bar) cuts.push(c.on);
  // A later subject's first entry opens a section of its own.
  for (const m of moments) if (m.kind === "entry" && m.label.startsWith("The ") && m.label.includes("subject enters")) cuts.push(m.on);
  cuts.sort((a, b) => a - b);
  for (let i = cuts.length - 1; i > 0; i--) if (cuts[i] - cuts[i - 1] < 2 * bar) cuts.splice(cuts[i] > expoEnd ? i - 1 : i, 1);
  cuts.push(p.length);
  const sections: Section[] = [];
  // Sections given by the literature: the outermost spans (an episode inside a section is not a
  // section), the gaps between them filled.
  const outer = given.filter((g) => !/episode|interlude|codetta|link/i.test(g.label)).filter((g, _, all) => !all.some((h) => h !== g && h.from <= g.from && h.to >= g.to && h.to - h.from > g.to - g.from)).sort((a, b) => a.from - b.from);
  if (outer.length >= 2 || (outer.length === 1 && outer[0].from > 1)) {
    const bars = p.bars.length;
    const onOf = (n: number) => p.bars.find((b) => b.n === n)?.on ?? p.length;
    const spans: GivenSection[] = [];
    let at = 1;
    for (const g of outer) {
      // His ranges end inclusively (bb. 9–15, 16–22) or share a bar (bb. 7–14, 14–19): a gap is a
      // missing bar or more.
      if (g.from > at + 1) spans.push({ from: at === 1 ? 1 : at + 1, to: g.from, label: at === 1 ? "Opening" : "" });
      spans.push(g);
      at = Math.max(at, g.to);
    }
    if (at + 1 < bars) spans.push({ from: at + 1, to: bars, label: "" });
    spans.forEach((g, i) => {
      const on = onOf(g.from);
      const end = i + 1 < spans.length ? onOf(spans[i + 1].from) : p.length;
      if (end <= on) return;
      const inside = moments.filter((m) => m.kind === "entry" && m.on >= on && m.on < end);
      const label = g.label ? g.label[0].toUpperCase() + g.label.slice(1) : `Section ${i + 1}`;
      sections.push({ on, end, label, detail: `bars ${g.from}–${barOf(p, end - 1)}: ${inside.length} entr${inside.length === 1 ? "y" : "ies"} (as Ledbetter divides it)` });
    });
    return { moments, sections };
  }
  for (let i = 0; i + 1 < cuts.length; i++) {
    const on = cuts[i];
    const end = cuts[i + 1];
    const inside = moments.filter((m) => m.kind === "entry" && m.on >= on && m.on < end);
    const keys = [...new Set(inside.map((m) => m.label.split(", ").pop()!))];
    const cad = cads.find((c) => c.on === end);
    sections.push({
      on,
      end,
      label: i === 0 ? "Exposition" : i === cuts.length - 2 ? "Final section" : `Section ${i + 1}`,
      detail: `bars ${barOf(p, on)}–${barOf(p, end - 1)}: ${inside.length} entr${inside.length === 1 ? "y" : "ies"}${keys.length ? ` (${keys.join(", ")})` : ""}${cad ? `; closes with a cadence in ${romanOf(p, cad.root, cad.minor)}` : ""}`,
    });
  }
  return { moments, sections };
}
