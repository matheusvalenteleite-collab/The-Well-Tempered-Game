/**
 * Versions of the player's line (decision D47): the original, its inversion, retrograde,
 * retrograde inversion, and a canon at the unison displaced by x slots. Only the original is
 * written; every other version is derived from it, so an edit to the original re-derives them. Pure.
 */
import { parsePitch, type Step } from "../music/pitch.ts";
import type { ModalFinal } from "../music/fux/types.ts";
import { REST, sounding } from "../counterpoint/layout.ts";

export type VersionId = "inversion" | "retrograde" | "retroInversion" | "canon";
export const VERSION_IDS: VersionId[] = ["inversion", "retrograde", "retroInversion", "canon"];

export interface Versions {
  /** The written line; when off it is hidden and silent, and the derived versions take its place. */
  original: boolean;
  inversion: boolean;
  retrograde: boolean;
  retroInversion: boolean;
  canon: boolean;
  /** Canon: the original displaced forward by this many slots, wrapping round to the first bars. */
  canonShift: number;
}

export const DEFAULT_VERSIONS: Versions = { original: true, inversion: false, retrograde: false, retroInversion: false, canon: false, canonShift: 1 };

export function validVersions(raw: unknown): Versions {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const b = (k: keyof Versions) => (typeof r[k] === "boolean" ? (r[k] as boolean) : (DEFAULT_VERSIONS[k] as boolean));
  const shift = typeof r.canonShift === "number" && Number.isInteger(r.canonShift) && r.canonShift >= 0 ? r.canonShift : DEFAULT_VERSIONS.canonShift;
  const v = { original: b("original"), inversion: b("inversion"), retrograde: b("retrograde"), retroInversion: b("retroInversion"), canon: b("canon"), canonShift: shift };
  // At least one line is always heard.
  if (!v.original && !VERSION_IDS.some((id) => v[id])) v.original = true;
  return v;
}

/** The active derived versions, in display order. */
export const activeVersions = (v: Versions): VersionId[] => VERSION_IDS.filter((id) => v[id]);

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const STEP_PC: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const mod = (a: number, n: number) => ((a % n) + n) % n;
const ACC = (alter: number) => (alter > 0 ? "#".repeat(alter) : "b".repeat(-alter));

/**
 * Tonal mirror (Bach's inversion as in the Art of Fugue, by our reading): the final and the fifth
 * trade places and the third maps onto itself (in D: D↔A, E↔G, F↔F, C↔B). Natural notes stay
 * natural (letters are mirrored, as in a tonal answer); an inflected note keeps its exact semitone
 * relation, mirrored: the leading tone a semitone below the final becomes the semitone above the
 * fifth (C♯ → B♭ in D). The result is moved by octaves to sit in the original's register.
 */
export function tonalMirror(notes: (string | null)[], final: ModalFinal): (string | null)[] {
  const pitches = notes.filter(sounding).map((p) => parsePitch(p));
  if (!pitches.length) return notes;
  const finalIdx = STEPS.indexOf(final);
  const axis2 = 2 * finalIdx + 4; // final + fifth, in diatonic steps: reflection d' = axis2 - d (mod octaves)
  const finalPc = STEP_PC[final];
  const fifthPc = mod(finalPc + 7, 12);
  const image = (p: ReturnType<typeof parsePitch>, octaveShift: number) => {
    const d = axis2 - p.diatonic + 7 * octaveShift;
    const octave = Math.floor(d / 7);
    const step = STEPS[d - 7 * octave];
    let alter = 0;
    if (p.alter !== 0) {
      const want = mod(fifthPc - (mod(STEP_PC[p.step] + p.alter, 12) - finalPc), 12);
      alter = mod(want - STEP_PC[step] + 6, 12) - 6;
    }
    return { name: `${step}${ACC(alter)}${octave}`, midi: 12 * (octave + 1) + STEP_PC[step] + alter };
  };
  // Octave placement: the shift whose mean pitch is nearest the original's.
  const mean = pitches.reduce((s, p) => s + p.midi, 0) / pitches.length;
  let best = 0;
  let bestD = Infinity;
  for (let k = -20; k <= 20; k++) {
    const m = pitches.reduce((s, p) => s + image(p, k).midi, 0) / pitches.length;
    if (Math.abs(m - mean) < bestD - 1e-9) {
      bestD = Math.abs(m - mean);
      best = k;
    }
  }
  return notes.map((n) => (sounding(n) ? image(parsePitch(n), best).name : n));
}

/** The sounding notes in reverse order, on the same slots (rests and empty slots stay in place). */
export function retrograde(notes: (string | null)[]): (string | null)[] {
  const idx = notes.map((n, k) => (sounding(n) ? k : -1)).filter((k) => k >= 0);
  const out = [...notes];
  const rev = idx.map((k) => notes[k]).reverse();
  idx.forEach((k, i) => (out[k] = rev[i]));
  return out;
}

/** The line displaced forward by `shift` slots; what runs past the end fills the first slots. */
export function canon(notes: (string | null)[], shift: number): (string | null)[] {
  const n = notes.length;
  if (!n) return notes;
  const s = mod(shift, n);
  return notes.map((_, k) => notes[mod(k - s, n)] ?? null);
}

export function deriveVersion(id: VersionId, notes: (string | null)[], final: ModalFinal, canonShift: number): (string | null)[] {
  switch (id) {
    case "inversion":
      return tonalMirror(notes, final);
    case "retrograde":
      return retrograde(notes);
    case "retroInversion":
      return retrograde(tonalMirror(notes, final));
    case "canon":
      return canon(notes, canonShift);
  }
}

/** The lines heard and shown, in order: the original (if on), then each active version. */
export function heardLines(v: Versions, notes: (string | null)[], final: ModalFinal): { id: "original" | VersionId; notes: (string | null)[] }[] {
  const out: { id: "original" | VersionId; notes: (string | null)[] }[] = [];
  if (v.original) out.push({ id: "original", notes });
  for (const id of activeVersions(v)) out.push({ id, notes: deriveVersion(id, notes, final, v.canonShift) });
  if (!out.length) out.push({ id: "original", notes });
  return out;
}

export { REST };
