/**
 * Level 3 of the chorale mode (docs/chorales/CONCEPT.md): the bass. Under every melody note the
 * player chooses the bass, as a scale degree of the chorale's key; it sounds in the octave nearest
 * the bass before. Compared, as at levels 1-2, with Kittel's basses, Bach's settings of the tune and
 * Bach's habit.
 *
 * Data: data/chorales/level3.json, written by tools/chorales/bass_plans.py.
 */
import raw from "../../data/chorales/level3.json" with { type: "json" };
import type { L2Chorale } from "./level2.ts";

export const LEVEL3: Record<number, L2Chorale> = Object.fromEntries((raw as unknown as { chorales: L2Chorale[] }).chorales.map((c) => [c.number, c]));

const STEPS = "CDEFGAB";
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** The bass pitch of a degree ("#4", "b7", "5") in the key of `tonic`, nearest `prev` (MIDI) within
 * E2..E4; spelled from the degree's letter. */
export function bassPitch(deg: string, tonic: string, prev: number | null): string {
  const m = /^([#b]*)(\d)$/.exec(deg);
  if (!m) return "C3";
  const d = Number(m[2]) - 1;
  const alter = [...m[1]].reduce((a, c) => a + (c === "#" ? 1 : -1), 0);
  const tAlter = [...tonic.slice(1)].reduce((a, c) => a + (c === "#" ? 1 : c === "b" ? -1 : 0), 0);
  const letter = STEPS[(STEPS.indexOf(tonic[0]) + d) % 7];
  const pc = (((PC[tonic[0]] + tAlter + MAJOR[d] + alter) % 12) + 12) % 12;
  const acc = (((pc - PC[letter]) % 12) + 18) % 12 - 6;
  const target = prev ?? 48;
  let best = 0;
  let bestMidi = 1e9;
  for (let oct = 1; oct <= 4; oct++) {
    const midi = 12 * (oct + 1) + PC[letter] + acc;
    if (midi < 40 || midi > 64) continue;
    if (Math.abs(midi - target) < Math.abs(bestMidi - target)) {
      bestMidi = midi;
      best = oct;
    }
  }
  return letter + (acc > 0 ? "#".repeat(acc) : "b".repeat(-acc)) + best;
}
