/**
 * Tips for one exercise (D103), found by reading its cantus and by test-driving it: in first
 * species every correct line under the main rules is counted (a search over the notes each bar
 * allows), which shows how much freedom the exercise leaves and where it is tight. Pure.
 *
 * The search keeps to the main rules of first species (consonance, perfect consonances reached
 * only by contrary or oblique motion, the opening, the cadence and the ending, unisons only at the
 * ends, no tritone, major sixth, seventh or leap beyond the octave), to the notes Fux uses: the
 * naturals and B♭ anywhere, F♯, C♯ and G♯ in the last four bars only (where all of his sharps
 * stand), from a sixth across the cantus to a twelfth away from it. It is a guide, not the judge:
 * the evaluation applies every rule. All twelve of Fux's first-species lines are among those counted.
 */
import { cadenceNote } from "../counterpoint/cadence.ts";
import { harmonic, interval, isConsonant, isOctaveClass, isPerfectConsonance, isUnison, motion, simpleName } from "../counterpoint/interval.ts";
import { parsePitch } from "../music/pitch.ts";

export type Tip =
  | { kind: "freedom"; lines: number }
  | { kind: "tight"; bar: number; usable: string[]; consonant: number }
  | { kind: "forced"; bar: number; note: string }
  | { kind: "openings"; notes: string[] }
  | { kind: "leap"; bar: number; size: string; up: boolean }
  | { kind: "peak"; bar: number; note: string }
  | { kind: "tritone"; bars: number[]; cantusNote: string; avoid: string };

const LETTERS = "CDEFGAB";
/** The forms of a degree Fux writes: the natural; B♭; and near the end F♯, C♯, G♯. */
const forms = (diatonic: number, nearEnd: boolean) => {
  const letter = LETTERS[((diatonic % 7) + 7) % 7];
  const octave = Math.floor(diatonic / 7);
  const out = [`${letter}${octave}`];
  if (letter === "B") out.push(`Bb${octave}`);
  if (nearEnd && "FCG".includes(letter)) out.push(`${letter}#${octave}`);
  return out;
};

function melodicOk(a: string, b: string): boolean {
  const i = interval(a, b);
  if (i.number > 8) return false;
  if (i.quality === "A" || i.quality === "d" || i.quality === "AA" || i.quality === "dd") return false;
  if (i.number === 7) return false;
  if (i.number === 6 && i.quality === "M") return false;
  return true;
}

/** Candidate notes of each bar: consonant, on the counterpoint's side, within a twelfth. */
function candidates(cantus: string[], below: boolean): string[][] {
  const n = cantus.length;
  const cad = cadenceNote(cantus, below ? "upper" : "lower");
  return cantus.map((cf, k) => {
    if (k === n - 2) return [cad];
    const d = parsePitch(cf).diatonic;
    const out: string[] = [];
    // The voices may cross in the middle (Fux crosses by a third), never at the opening or the end.
    const lowest = k === 0 || k >= n - 2 ? 0 : -5;
    for (let s = lowest; s <= 11; s++) for (const note of forms(below ? d - s : d + s, k >= n - 4)) {
      const h = harmonic(below ? note : cf, below ? cf : note);
      if (!isConsonant(h)) continue;
      const first = k === 0;
      const last = k === n - 1;
      if (isUnison(h) && !first && !last) continue;
      if (first && !(isPerfectConsonance(h) && (!below || isOctaveClass(h)))) continue;
      if (last && !isOctaveClass(h)) continue;
      out.push(note);
    }
    return out;
  });
}

function stepOk(cantus: string[], k: number, a: string, b: string, below: boolean): boolean {
  if (!melodicOk(a, b)) return false;
  const h = below ? harmonic(b, cantus[k + 1]) : harmonic(cantus[k + 1], b);
  if (isPerfectConsonance(h)) {
    const m = below ? motion(a, cantus[k], b, cantus[k + 1]) : motion(cantus[k], a, cantus[k + 1], b);
    if (m === "similar" || m === "parallel") return false;
  }
  return true;
}

/** Count the correct first-species lines, and which notes of each bar lie on one. */
export function searchFirstSpecies(cantus: string[], cantusVoice: "upper" | "lower") {
  const below = cantusVoice === "upper";
  const c = candidates(cantus, below);
  const n = cantus.length;
  const fwd: number[][] = c.map((xs) => xs.map(() => 0));
  c[0].forEach((_, i) => (fwd[0][i] = 1));
  for (let k = 1; k < n; k++)
    c[k].forEach((b, j) => {
      fwd[k][j] = c[k - 1].reduce((s, a, i) => s + (fwd[k - 1][i] && stepOk(cantus, k - 1, a, b, below) ? fwd[k - 1][i] : 0), 0);
    });
  const bwd: number[][] = c.map((xs) => xs.map(() => 0));
  c[n - 1].forEach((_, i) => (bwd[n - 1][i] = 1));
  for (let k = n - 2; k >= 0; k--)
    c[k].forEach((a, i) => {
      bwd[k][i] = c[k + 1].reduce((s, b, j) => s + (bwd[k + 1][j] && stepOk(cantus, k, a, b, below) ? bwd[k + 1][j] : 0), 0);
    });
  const lines = fwd[n - 1].reduce((s, x) => s + x, 0);
  const usable = c.map((xs, k) => xs.filter((_, i) => fwd[k][i] > 0 && bwd[k][i] > 0));
  return { lines, candidates: c, usable };
}

/** Notes of the counterpoint's range around a cantus note (crossing allowed by up to a sixth in the middle). */
function rangeOf(cf: string, below: boolean, crossing: boolean, nearEnd: boolean): string[] {
  const d = parsePitch(cf).diatonic;
  const out: string[] = [];
  for (let s = crossing ? -5 : 0; s <= 11; s++) out.push(...forms(below ? d - s : d + s, nearEnd));
  return out;
}
const pc = (x: string) => parsePitch(x).midi % 12;
const consonant = (cp: string, cf: string) => isConsonant(harmonic(cp, cf));
const perfect = (cp: string, cf: string) => isPerfectConsonance(harmonic(cp, cf));
const isStep = (a: string, b: string) => interval(a, b).number === 2;

/**
 * Second species (D107): count the correct lines under its main rules, bar by bar over the
 * downbeats, trying every upbeat between them. Downbeats consonant (a unison only at the ends);
 * an upbeat consonant, or dissonant only as a passing note (by step, on in the same direction);
 * no note struck twice in a bar; perfect consonances on a downbeat reached by contrary or oblique
 * motion; no two fifths or octaves on successive downbeats bridged by a step or a third; the
 * cadence (the major sixth or minor third on the last upbeat, after any consonance: Fux's own
 * downbeats there vary);
 * the ending on the octave or unison; a half rest at the start allowed.
 */
export function searchSecondSpecies(cantus: string[], cantusVoice: "upper" | "lower") {
  const below = cantusVoice === "upper";
  const n = cantus.length;
  const cad = cadenceNote(cantus, below ? "upper" : "lower");
  const firstOk = (note: string) => perfect(note, cantus[0]) && (!below || isOctaveClass(harmonic(note, cantus[0])));
  const down = cantus.map((cf, b) => {
    const xs = rangeOf(cf, below, b > 0 && b < n - 2, b >= n - 4);
    if (b === n - 1) return xs.filter((x) => isOctaveClass(harmonic(x, cf)));
    if (b === n - 2) return xs.filter((x) => consonant(x, cf) && !isUnison(harmonic(x, cf)));
    return xs.filter((x) => consonant(x, cf) && (b === 0 || !isUnison(harmonic(x, cf))));
  });
  const ups = cantus.map((cf, b) => (b === n - 2 ? rangeOf(cf, below, false, true).filter((x) => pc(x) === pc(cad)) : rangeOf(cf, below, b > 0, b >= n - 4)));
  /** May upbeat u stand between downbeats d (bar b, or the rest if null) and e (bar b + 1)? */
  const bridge = (b: number, d: string | null, u: string, e: string) => {
    const cf = cantus[b];
    const next = cantus[b + 1];
    if (d !== null && (u === d || !melodicOk(d, u))) return false;
    if (!melodicOk(u, e)) return false;
    if (d === null && !firstOk(u)) return false;
    if (!consonant(u, cf)) {
      if (d === null || !isStep(d, u) || !isStep(u, e)) return false;
      if (interval(d, u).direction !== interval(u, e).direction) return false;
    }
    if (perfect(e, next)) {
      const m = below ? motion(u, cf, e, next) : motion(cf, u, next, e);
      if (m === "similar" || m === "parallel") return false;
      if (d !== null && perfect(d, cf) && harmonic(d, cf).simple === harmonic(e, next).simple && interval(d, u).number <= 3) return false;
    }
    return true;
  };
  // Lines into each downbeat (forward) and from it to the end (backward); a rest may open bar 1.
  const fwd = down.map((xs) => xs.map(() => 0));
  down[0].forEach((x, i) => (fwd[0][i] = firstOk(x) ? 1 : 0));
  let restStarts = 0;
  for (let b = 0; b < n - 1; b++)
    down[b + 1].forEach((e, j) => {
      let sum = 0;
      down[b].forEach((d, i) => {
        if (fwd[b][i]) sum += fwd[b][i] * ups[b].filter((u) => bridge(b, d, u, e)).length;
      });
      if (b === 0) {
        const r = ups[0].filter((u) => bridge(0, null, u, e)).length;
        sum += r;
        restStarts += r;
      }
      fwd[b + 1][j] = sum;
    });
  const bwd = down.map((xs) => xs.map(() => 0));
  down[n - 1].forEach((_, i) => (bwd[n - 1][i] = 1));
  for (let b = n - 2; b >= 0; b--)
    down[b].forEach((d, i) => {
      bwd[b][i] = down[b + 1].reduce((sum, e, j) => sum + (bwd[b + 1][j] ? bwd[b + 1][j] * ups[b].filter((u) => bridge(b, d, u, e)).length : 0), 0);
    });
  const lines = fwd[n - 1].reduce((a, x) => a + x, 0);
  const usable = down.map((xs, b) => xs.filter((_, i) => (b === 0 ? fwd[0][i] > 0 : fwd[b][i] > 0) && bwd[b][i] > 0));
  // Openings: a downbeat note of bar 1 that leads on, or (after the rest) an upbeat that does.
  const restOpenings = ups[0].filter((u) => down[1].some((e, j) => bwd[1][j] > 0 && bridge(0, null, u, e)));
  return { lines, usable, candidates: down, restOpenings, restStarts };
}

const prettyNote = (p: string) => p.replace("#", "♯").replace(/^([A-G])b/, "$1♭");

/** The tips of an exercise, most useful first. */
export function exerciseTips(cantus: string[], cantusVoice: "upper" | "lower", species: string): Tip[] {
  const tips: Tip[] = [];
  const n = cantus.length;
  const below = cantusVoice === "upper";
  if (species === "first") {
    const s = searchFirstSpecies(cantus, cantusVoice);
    tips.push({ kind: "freedom", lines: s.lines });
    if (s.lines > 0) {
      let tight = -1;
      for (let k = 1; k < n - 2; k++) if (tight < 0 || s.usable[k].length < s.usable[tight].length) tight = k;
      if (tight > 0) {
        const usable = s.usable[tight];
        if (usable.length === 1) tips.push({ kind: "forced", bar: tight + 1, note: prettyNote(usable[0]) });
        else tips.push({ kind: "tight", bar: tight + 1, usable: usable.map(prettyNote), consonant: s.candidates[tight].length });
      }
      tips.push({ kind: "openings", notes: s.usable[0].map(prettyNote) });
    }
  }
  if (species === "second") {
    const s = searchSecondSpecies(cantus, cantusVoice);
    tips.push({ kind: "freedom", lines: s.lines });
    if (s.lines > 0) {
      let tight = -1;
      for (let k = 1; k < n - 2; k++) if (tight < 0 || s.usable[k].length < s.usable[tight].length) tight = k;
      if (tight > 0) {
        const usable = s.usable[tight];
        if (usable.length === 1) tips.push({ kind: "forced", bar: tight + 1, note: prettyNote(usable[0]) });
        else tips.push({ kind: "tight", bar: tight + 1, usable: usable.map(prettyNote), consonant: s.candidates[tight].length });
      }
      tips.push({ kind: "openings", notes: [...s.usable[0], ...s.restOpenings.map((x) => `𝄼 ${x}`)].map(prettyNote) });
    }
  }
  // The cantus's leaps: the counterpoint answers them best by a step the other way.
  for (let k = 0; k < n - 1; k++) {
    const i = interval(cantus[k], cantus[k + 1]);
    if (i.number >= 4) tips.push({ kind: "leap", bar: k + 1, size: simpleName(i), up: i.direction === "up" });
  }
  // The peak (cantus above) or the low point (cantus below), where the voices are closest.
  const ds = cantus.map((p) => parsePitch(p).midi);
  const target = below ? Math.min(...ds) : Math.max(...ds);
  const at = ds.indexOf(target);
  if (at > 0 && at < n - 1) tips.push({ kind: "peak", bar: at + 1, note: prettyNote(cantus[at]) });
  // Tritone traps: against B the F above (a diminished fifth); against F the B above (an augmented fourth).
  for (const [letter, avoid] of below ? ([["F", "B"], ["B", "F"]] as const) : ([["B", "F"], ["F", "B"]] as const)) {
    const bars = cantus.map((p, k) => (p[0] === letter && p[1] !== "#" && p[1] !== "b" ? k + 1 : 0)).filter((b) => b > 0 && b < n - 1);
    if (bars.length) tips.push({ kind: "tritone", bars, cantusNote: letter, avoid });
  }
  return tips;
}
