/**
 * Three-voice counterpoint, fifth species (Exercitium II, Lectio V, 1725 pp. 111-114): one voice
 * florid, the other two (the cantus among them) in semibreves.
 *
 * Fux's text: florid counterpoint is the composition of all five species, ordered with a beautiful
 * way of singing; how the concords of the two semibreve parts are to be made "I do not doubt you
 * know from the three-voice exercises discussed so far, so that it would be superfluous to dwell on
 * it here" (pp. 111-112); and, after the examples, "oblique motion, as much as possible in each bar,
 * will make this labour much easier" (p. 114, a counsel).
 *
 * So: the two-voice florid rules (rules/fifth-species.ts, D82) for the florid voice against the
 * lower semibreve of each bar — the bass, or, where the florid voice is the bass, its partner
 * above — and against the upper semibreve for the true dissonances only (a fourth or a false fifth
 * between upper voices stands, as in first species); the three-voice first-species rules on the
 * sonority each bar opens with (the florid voice's note at the downbeat, or the note a tied
 * dissonance resolves to).
 */
import { analyse, evaluate } from "./engine.ts";
import { harmonic, interval, isConsonant, isPerfectConsonance, motion } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ModalFinal } from "../music/fux/types.ts";
import { HOLD, REST, slotLayout } from "./layout.ts";
import { downbeatConsonance, limping, ligature, quavers, suspension, weakDissonance } from "./rules/fifth-species.ts";
import type { Violation } from "./rules/types.ts";
import { analyseTrio, consonanceWithBass, falseFifth, finalChord, imperfectInEachBar, melodicLeaps, openingOnFinal, parallelPerfect, upperDissonance, type TrioEvaluation, type TrioViolation } from "./three-voice.ts";

export interface TrioFifthInput {
  modalFinal: ModalFinal;
  cantusIndex: number;
  /** The staff of the florid voice. */
  movingIndex: number;
  /** One line per staff, top first: semibreves one a bar; the florid voice in eighth-note slots (REST, HOLD). */
  voices: string[][];
}

const midi = (p: string) => parsePitch(p).midi;
const pc = (p: string) => parsePitch(p).step;
const isFalseFifth = (i: { quality: string; simple: number }) => (i.quality === "d" && i.simple === 5) || (i.quality === "A" && i.simple === 4);
/** "d12", "P11" -> quality and simple number. */
const intervalOfName = (n: string) => {
  const m = /^([A-Za-z]+)(\d+)$/.exec(n);
  return m ? { quality: m[1], simple: ((Number(m[2]) - 1) % 7) + 1 } : {};
};

export function evaluateTrioFifth(input: TrioFifthInput): TrioEvaluation {
  const m = input.movingIndex;
  const others = [0, 1, 2].filter((x) => x !== m);
  const bars = input.voices[others[0]].length;
  const layout = slotLayout("fifth", bars).map((s) => ({ ...s, restAllowed: true }));
  const line = input.voices[m];
  const sem = (x: number, b: number) => input.voices[x][b];
  const low = (b: number) => (midi(sem(others[0], b)) <= midi(sem(others[1], b)) ? others[0] : others[1]);
  const high = (b: number) => (low(b) === others[0] ? others[1] : others[0]);
  const counterpoint = line.map((p, k) => ({ pitch: p === REST ? null : p, duration: layout[k].duration }));
  const notes = analyse({ species: "fifth", modalFinal: input.modalFinal, cantusVoice: "lower", cantus: input.voices[others[0]].map((p) => ({ pitch: p, duration: "1/1" })), counterpoint }).events;
  const pitchAt = (slot: number) => {
    for (let k = slot; k >= 0; k--) if (line[k] !== HOLD) return line[k] === REST ? null : line[k];
    return null;
  };
  const barOf = (slot: number) => layout[slot].bar;

  // The florid voice against a partner line (two-voice rules). Which side the partner lies on, for
  // the forbidden ligature kinds, is taken from the florid voice's average place against it.
  const against = (partner: string[], rules: typeof RULES_LOW) => {
    const sounding = notes.map((e) => midi(e.counterpoint));
    const mean = sounding.reduce((a, b) => a + b, 0) / Math.max(1, sounding.length);
    const pm = partner.reduce((a, p) => a + midi(p), 0) / partner.length;
    return evaluate({ species: "fifth", modalFinal: input.modalFinal, cantusVoice: mean >= pm ? "lower" : "upper", cantus: partner.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint }, [...rules]).violations;
  };
  const RULES_LOW = [downbeatConsonance, suspension, weakDissonance, quavers, ligature, limping] as const;
  const lowLine = Array.from({ length: bars }, (_, b) => sem(low(b), b));
  const highLine = Array.from({ length: bars }, (_, b) => sem(high(b), b));
  const toTrio = (v: Violation, partnerOf: (b: number) => number): TrioViolation => {
    const b = barOf(v.positions[0]);
    return { ...v, positions: [...new Set(v.positions.map(barOf))], voices: [m, partnerOf(b)] };
  };
  const out: TrioViolation[] = [];
  out.push(...against(lowLine, RULES_LOW).map((v) => toTrio(v, low)));
  // Against the upper semibreve, only the true dissonances: a fourth or a false fifth between upper
  // voices is a consonance of the trio (when the florid voice is above the lower semibreve).
  const trueDissonance = (v: Violation) => {
    const slot = v.positions[v.positions.length - 1];
    const p = pitchAt(slot);
    const b = barOf(slot);
    if (!p) return true;
    if (b === bars - 2 && cadentialFalseFifth && (isFalseFifth(asIs(v)) || asIs(v).simple === 4)) return false;
    if (midi(p) < midi(sem(low(b), b))) return true; // the florid voice is the bass
    const i = harmonic(midi(p) < midi(sem(high(b), b)) ? p : sem(high(b), b), midi(p) < midi(sem(high(b), b)) ? sem(high(b), b) : p);
    return !(i.simple === 4 || (i.quality === "d" && i.simple === 5) || (i.quality === "A" && i.simple === 4));
  };
  // The close (as in species 2-4, D114, D116): the florid voice's last note in the penultimate bar a
  // false fifth with the upper semibreve, resolving inward (the lower note up a semitone, the upper
  // down a step), as Fig. 156, where the bass's suspended fourth resolves into it.
  const asIs = (v: Violation) => ({ simple: 0, quality: "", ...(v.detail?.interval ? intervalOfName(String(v.detail.interval)) : {}) });
  const cadentialFalseFifth = (() => {
    const last = [...notes].reverse().find((e) => e.bar === bars - 2 && !e.tied);
    const after = notes.find((e) => e.bar === bars - 1)?.counterpoint;
    if (!last || !after) return false;
    const h = high(bars - 2);
    const [lo, loNext, hi, hiNext] = midi(last.counterpoint) < midi(sem(h, bars - 2)) ? [last.counterpoint, after, sem(h, bars - 2), sem(h, bars - 1)] : [sem(h, bars - 2), sem(h, bars - 1), last.counterpoint, after];
    if (!isFalseFifth(harmonic(lo, hi))) return false;
    const up = interval(lo, loNext);
    const down = interval(hi, hiNext);
    return up.direction === "up" && up.semitones === 1 && down.direction === "down" && down.number === 2;
  })();
  const seen = new Set(out.map((v) => `${v.ruleId}@${v.positions.join(",")}`));
  for (const v of against(highLine, [downbeatConsonance, weakDissonance, suspension] as unknown as typeof RULES_LOW)) {
    if (!trueDissonance(v)) continue;
    const t = toTrio(v, high);
    const key = `${t.ruleId}@${t.positions.join(",")}`;
    if (!seen.has(key)) (seen.add(key), out.push(t));
  }

  // The sonority each bar opens with: the florid note at the downbeat (held or struck), or, if it is
  // a tied dissonance, the note it resolves to; after an opening rest, the first note sung.
  const opening = Array.from({ length: bars }, (_, b) => {
    const inBar = notes.filter((e) => e.bar === b);
    const first = inBar[0];
    if (!first) return null;
    const dissonantWith = (p: string, x: number) => !isConsonant(harmonic(midi(p) < midi(sem(x, b)) ? p : sem(x, b), midi(p) < midi(sem(x, b)) ? sem(x, b) : p));
    if (first.tied && (dissonantWith(first.counterpoint, low(b)) || midi(first.counterpoint) < midi(sem(low(b), b)))) {
      const res = inBar.find((e) => !e.tied && interval(first.counterpoint, e.counterpoint).number === 2 && interval(first.counterpoint, e.counterpoint).direction === "down");
      if (res) return res.counterpoint;
    }
    return first.counterpoint;
  });
  for (let b = 0; b < bars; b++) if (!opening[b]) opening[b] = opening[b - 1] ?? opening.find(Boolean)!;
  const skeleton = [0, 1, 2].map((x) => (x === m ? (opening as string[]) : input.voices[x]));
  const sk = analyseTrio({ modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, voices: skeleton });
  const skeletonFaults = [consonanceWithBass, upperDissonance, openingOnFinal, finalChord, falseFifth, imperfectInEachBar].flatMap((r) => r.check(sk)).filter((v) => !(v.voices.includes(m) && v.ruleId === "t1.false-fifth"));
  // The two-voice passes already judge the florid voice's dissonances; the skeleton keeps the rest.
  out.push(...skeletonFaults.filter((v) => !(v.ruleId === "t1.consonance-bass" && v.voices.includes(m))));
  out.push(...parallelPerfect.check(sk).filter((v) => !v.voices.includes(m)));
  out.push(...melodicLeaps.check(sk).filter((v) => !v.voices.includes(m)));

  // Perfect consonances in a row across the bar line (both voices moving).
  const onsets = notes.filter((e) => !e.tied);
  for (const x of others)
    for (let b = 0; b < bars - 1; b++) {
      const last = [...onsets].reverse().find((e) => e.bar === b);
      const first = notes.find((e) => e.bar === b + 1);
      if (!last || !first || first.tied) continue;
      const i0 = harmonic(last.counterpoint, sem(x, b));
      const i1 = harmonic(first.counterpoint, sem(x, b + 1));
      if (!isPerfectConsonance(i0) || !isPerfectConsonance(i1) || i0.simple !== i1.simple) continue;
      const mv = motion(sem(x, b), last.counterpoint, sem(x, b + 1), first.counterpoint);
      if (mv === "parallel" || mv === "similar") out.push({ ruleId: "t5.parallel-perfect", positions: [b, b + 1], voices: [m, x], severity: "error", messageKey: "rule.t1.parallel-perfect", detail: { from: i0.name, to: i1.name } });
    }

  // The florid melody: no augmented leap, no major sixth, no seventh.
  for (let i = 1; i < onsets.length; i++) {
    const it = interval(onsets[i - 1].counterpoint, onsets[i].counterpoint);
    if (it.number >= 3 && (it.quality === "A" || it.quality === "AA" || (it.quality === "M" && it.number === 6) || it.number === 7))
      out.push({ ruleId: "t1.melodic", positions: [onsets[i - 1].bar, onsets[i].bar], voices: [m], severity: "error", messageKey: "rule.t1.melodic", detail: { interval: it.name } });
  }

  // The close: one voice reaches the final by a semitone.
  {
    const k = bars - 1;
    const ok = [0, 1, 2].some((x) => {
      if (x === m) {
        const [a, b] = onsets.slice(-2);
        return !!a && !!b && pc(b.counterpoint) === input.modalFinal && interval(a.counterpoint, b.counterpoint).semitones === 1;
      }
      return pc(sem(x, k)) === input.modalFinal && interval(sem(x, k - 1), sem(x, k)).semitones === 1;
    });
    if (!ok) out.push({ ruleId: "t1.cadence", positions: [k - 1, k], voices: [0, 1, 2], severity: "error", messageKey: "rule.t1.cadence" });
  }

  const errors = out.filter((x) => x.severity === "error");
  return { violations: out, errors, warnings: out.filter((x) => x.severity === "warning"), passed: errors.length === 0 };
}
