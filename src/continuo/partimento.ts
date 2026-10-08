/**
 * A6: the partimento player's devices, applied to the right hand after voicing (decision D56).
 * Each device is applied only where it is idiomatic and where it makes no second, seventh or
 * unison with a sung note (the accompaniment never rubs against the singers):
 *
 *   suspensions, prepared in the previous chord and resolved down by step over a held bass:
 *     4-3  over a bass that then rises a fourth (or falls a fifth): the cadence on the dominant
 *     7-6  over a bass falling by step (7-6 chains), and over the cadential bass 2 -> 1
 *     9-8  over a bass rising by step
 *   5-6    over a bass that then rises by step (the 5-6 sequence; it breaks the parallel fifths)
 *   6/5    rule of the octave: on the fourth degree rising to the fifth, and on the seventh rising
 *          to the final, the fifth above the bass is added, then resolved down by step
 *   trill  on the leading tone of the final cadence (the renderer plays it; the harpsichord only)
 *
 * Sources for the devices: F. Gasparini, L'armonico pratico al cimbalo (Venice, 1708);
 * F. Campion, Traité d'accompagnement ... selon la règle des octaves (Paris, 1716);
 * J. D. Heinichen, Der General-Bass in der Composition (Dresden, 1728).
 */
import { parsePitch } from "../music/pitch.ts";
import type { ModalFinal } from "../music/fux/types.ts";
import { frameAt, mod, pcDistance, spellAt, STEPS } from "./frame.ts";
import type { BarPlan, EnrichContext, Segment } from "./enrichment.ts";

export type Device = "43" | "76" | "98" | "56" | "65";

export interface PartimentoResult {
  segments: Segment[][];
  /** Per bar: the device applied (its figures replace the bar's), or null. */
  devices: (Device | null)[];
  /** Per bar: diagnostics. */
  notes: string[][];
}

const FINAL_PC: Record<ModalFinal, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9 };
const ACC = (a: number) => (a > 0 ? "#".repeat(a) : "b".repeat(-a));
const nameAt = (diatonic: number, alter: number) => `${STEPS[mod(diatonic, 7)]}${ACC(alter)}${Math.floor(diatonic / 7)}`;

export const FIGURES: Record<Device, string> = { "43": "4 3", "76": "7 6", "98": "9 8", "56": "5 6", "65": "6/5" };

export function partimento(segments: Segment[][], plans: BarPlan[], ctx: EnrichContext, modalFinal: ModalFinal): PartimentoResult {
  const n = plans.length;
  const segs = segments.map((s) => s.map((x) => ({ ...x })));
  const devices: (Device | null)[] = new Array(n).fill(null);
  const notes: string[][] = plans.map(() => []);
  const lh = (b: number) => {
    const f = plans[b]?.frame;
    return f ? f.bass.pitch.midi - 12 * ctx.shift : null;
  };
  const bassDia = (b: number) => plans[b]!.frame!.bass.pitch.diatonic - 7 * ctx.shift;
  const finalPc = FINAL_PC[modalFinal];
  /** No unison, second or seventh with a sung upper voice sounding in [from, to). */
  const free = (midi: number, from: number, to: number) => {
    for (const t of [from, ...ctx.notes.filter((x) => x.start > from && x.start < to).map((x) => x.start)]) {
      const f = frameAt(ctx.notes, t);
      if (f && f.uppers.some((u) => pcDistance(u.pitch.midi, midi) <= 2)) return false;
    }
    return true;
  };
  /** The sung bass is held through the bar (no new bass note on the upbeat). */
  const bassHeld = (b: number) => {
    const a = frameAt(ctx.notes, 2 * b);
    const c = frameAt(ctx.notes, 2 * b + 1);
    return !!a && !!c && a.bass === c.bass;
  };
  const usable = (b: number) => b >= 0 && b < n && !!plans[b].frame && !!plans[b].chord && !plans[b].fallback;

  for (let b = 1; b < n - 1; b++) {
    if (!usable(b) || !usable(b - 1) || !bassHeld(b)) continue;
    const t0 = 2 * b;
    const up = t0 + 1;
    const bass = lh(b)!;
    const prevBass = lh(b - 1)!;
    const nextBass = usable(b + 1) ? lh(b + 1) : null;
    const rh = segs[b].filter((s) => s.role === "rh" && s.start === t0 && s.end >= up).sort((a, c) => c.midi - a.midi);
    if (rh.length === 0) continue;
    const rise = nextBass === null ? 0 : nextBass - bass;
    const fromPrev = bass - prevBass;

    // Suspensions: a note of the previous chord held into this downbeat, a step above a chord tone.
    const prepared = segs[b - 1].filter((s) => s.role === "rh" && s.end === t0 && s.start <= t0 - 1 && s.label !== "pass");
    const tryDevice = (want: Device, interval: number) => {
      for (const x of rh) {
        const px = parsePitch(x.pitch);
        if (mod(px.diatonic - bassDia(b), 7) !== interval) continue;
        const s = prepared.find((p) => parsePitch(p.pitch).diatonic === px.diatonic + 1 && p.midi - x.midi >= 1 && p.midi - x.midi <= 2);
        if (!s) continue;
        if (!free(s.midi, t0, up)) continue;
        if (segs[b].some((o) => o !== x && o.start <= t0 && o.end > t0 && o.midi === s.midi)) continue;
        s.end = up; // held over the bar line: the suspension
        x.start = up; // the chord tone arrives as its resolution
        x.label = FIGURES[want];
        devices[b] = want;
        return true;
      }
      return false;
    };
    // Whatever the previous chord holds that becomes a fourth, seventh or ninth over the new bass,
    // with its resolution a step below in the new chord, is suspended: 4-3 first (the cadential
    // suspension), then 7-6 (chains over falling 6/3s), then 9-8. Never twice in a row on the same
    // figure unless the bass falls by step (a chain), so that the texture breathes.
    const shape = plans[b].chord!.shape;
    const chain = fromPrev === -1 || fromPrev === -2;
    const again = (d: Device) => devices[b - 1] === d && !chain;
    if (shape === "53" && !again("43") && tryDevice("43", 2)) continue;
    if (shape === "63" && !again("76") && tryDevice("76", 5)) continue;
    if (shape === "53" && !again("98") && tryDevice("98", 0)) continue;

    // Rule of the octave: 6/5 on the fourth degree rising to the fifth, on the seventh rising to the final.
    const degree = mod(bass - finalPc, 12);
    if (plans[b].chord!.shape === "63" && (rise === 1 || rise === 2) && (degree === 5 || degree === 11 || degree === 10)) {
      const fifthDia = bassDia(b) + 4;
      const forms = plans[b].forms;
      const step = STEPS[mod(fifthDia, 7)];
      const alter = forms.get(step) ?? 0;
      // Replace the voice that doubles a pitch class, by the nearest fifth above the bass.
      const pcs = rh.map((s) => mod(s.midi, 12));
      const dup = rh.find((s, i) => pcs.indexOf(mod(s.midi, 12)) !== i || mod(s.midi, 12) === mod(bass, 12));
      if (dup && dup.end === t0 + 2) {
        let m = parsePitch(nameAt(fifthDia, alter)).midi;
        while (m < dup.midi - 6) m += 12;
        while (m > dup.midi + 6) m -= 12;
        const resolves = segs[b + 1]?.some((s) => s.role === "rh" && s.start === t0 + 2 && (m - s.midi === 1 || m - s.midi === 2));
        if (Math.abs(m - dup.midi) <= 2 && m > bass && resolves && free(m, t0, t0 + 2) && !rh.some((s) => s.midi === m)) {
          dup.midi = m;
          dup.pitch = spellAt({ step, alter }, m);
          dup.label = FIGURES["65"];
          devices[b] = "65";
          continue;
        }
      }
    }

    // 5-6 over a bass about to rise by step: the fifth moves up to the sixth on the upbeat.
    if (plans[b].chord!.shape === "53" && (rise === 1 || rise === 2) && !segs[b].some((s) => s.start === up)) {
      const fifth = rh.find((s) => mod(parsePitch(s.pitch).diatonic - bassDia(b), 7) === 4 && s.end === t0 + 2);
      if (fifth) {
        const dia = parsePitch(fifth.pitch).diatonic + 1;
        const step = STEPS[mod(dia, 7)];
        const alter = plans[b].forms.get(step) ?? 0;
        const name = nameAt(dia, alter);
        const midi = parsePitch(name).midi;
        if (midi - fifth.midi >= 1 && midi - fifth.midi <= 2 && free(midi, up, t0 + 2) && !rh.some((s) => s.midi === midi)) {
          fifth.end = up;
          segs[b].push({ bar: b, start: up, end: t0 + 2, midi, pitch: name, role: "rh", label: FIGURES["56"] });
          devices[b] = "56";
        }
      }
    }
  }

  // The cadential trill: the leading tone in the right hand over the penultimate bass.
  if (n >= 2 && usable(n - 2)) {
    const lead = segs[n - 2].filter((s) => s.role === "rh" && mod(s.midi, 12) === mod(finalPc - 1, 12) && s.end === 2 * (n - 1) && s.end - s.start >= 1);
    const top = lead.sort((a, c) => c.midi - a.midi)[0];
    if (top) {
      top.ornament = "trill";
      notes[n - 2].push("cadential trill on the leading tone");
    }
  }
  return { segments: segs, devices, notes };
}
