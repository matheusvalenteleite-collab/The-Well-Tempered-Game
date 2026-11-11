/**
 * D635, THE STRETCH AUDIT: every note of every voice of the 48 fugues, on every sound (the octave audit's walk:
 * tools/touch/octaves/audit.ts, the line-ups, doublings, continuo and stage parts, registrations, stops and unisons; the
 * player's voice is one of them), read from the recording the engine plays it from (the nearest of the set as the fugue's
 * plan leaves it: D540's sparse zones, D631's extensions), and counted where that recording is more than STRETCH_MAX
 * semitones from the written pitch. II/15 is reported apart (its voice data is under review).
 *
 *   node tools/touch/stretch/audit.ts              the table, sound by sound
 *   node tools/touch/stretch/audit.ts salsa -v     one sound, every stretched read listed
 */
import { auditSound, AUDIT_SOUNDS } from "../octaves/audit.ts";
import { nameOfMidi, STRETCH_MAX } from "../../../src/touch/sampled.ts";
export const APART = "wtc2f15";

export interface Stretch {
  sound: string;
  piece: string;
  voice: number;
  patch: string;
  inst: string;
  written: number;
  from: number;
  shift: number;
  n: number;
}

export function stretches(sound: string, max = STRETCH_MAX): Stretch[] {
  return auditSound(sound)
    .reads.filter((r) => Math.abs(r.shift) > max)
    .map((r) => ({ sound, piece: r.piece, voice: r.voice, patch: r.patch, inst: r.inst, written: r.written, from: r.from, shift: r.shift, n: r.n }));
}

export function row(list: readonly Stretch[]) {
  const notes = list.reduce((a, s) => a + s.n, 0);
  const fugues = new Set(list.map((s) => s.piece)).size;
  let worst: Stretch | null = null;
  for (const s of list) if (!worst || Math.abs(s.shift) > Math.abs(worst.shift)) worst = s;
  return { notes, fugues, worst };
}

const fmt = (s: Stretch | null) => (s ? `${s.shift > 0 ? "+" : ""}${s.shift} ${s.piece} v${s.voice} ${s.patch} ${nameOfMidi(s.written)} from ${nameOfMidi(s.from)}` : "-");

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2] && !process.argv[2].startsWith("-") ? [process.argv[2]] : AUDIT_SOUNDS;
  const verbose = process.argv.includes("-v");
  console.log("sound                notes fugues  worst                                              | II/15 notes  worst");
  for (const id of only) {
    const all = stretches(id);
    const main = row(all.filter((s) => s.piece !== APART));
    const apart = row(all.filter((s) => s.piece === APART));
    console.log(`${id.padEnd(20)} ${String(main.notes).padStart(5)} ${String(main.fugues).padStart(6)}  ${fmt(main.worst).padEnd(50)} | ${String(apart.notes).padStart(5)}  ${fmt(apart.worst)}`);
    if (verbose) {
      const g = new Map<string, { n: number; lo: number; hi: number; shift: number; inst: string }>();
      for (const s of all) {
        const k = `${s.piece} v${s.voice} ${s.patch}`;
        const e = g.get(k) ?? { n: 0, lo: 999, hi: -999, shift: 0, inst: s.inst };
        e.n += s.n;
        e.lo = Math.min(e.lo, s.written);
        e.hi = Math.max(e.hi, s.written);
        if (Math.abs(s.shift) > Math.abs(e.shift)) e.shift = s.shift;
        g.set(k, e);
      }
      for (const [k, e] of g) console.log(`   ${k} [${e.inst}]: ${e.n} notes ${nameOfMidi(e.lo)}-${nameOfMidi(e.hi)}, worst ${e.shift > 0 ? "+" : ""}${e.shift}`);
    }
  }
}
