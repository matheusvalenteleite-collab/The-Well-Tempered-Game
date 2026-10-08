/**
 * The demo area (decision D51): ready-made exercises for trying the game's features. Each loads
 * Fux's own solution, already judged (so his line, the comparison and the trio are open), plus
 * an optional setup. Pure data; the UI applies it.
 */
import type { ContinuoSettings } from "./continuo-settings.ts";

export interface DemoEntry {
  id: string;
  /** Curriculum step. */
  stepId: string;
  /** Turn the continuo on with these settings. */
  continuo?: Partial<ContinuoSettings>;
  /** Number of "what to try" lines (ui.demo.<id>.try.1 ...). */
  tries: number;
}

export const DEMO_ENTRIES: DemoEntry[] = [
  { id: "first", stepId: "fux-mode.s1.01", tries: 3 },
  { id: "crossing", stepId: "fux-mode.s1.06", tries: 3 },
  { id: "second", stepId: "fux-mode.s2.01", tries: 3 },
  { id: "softB", stepId: "fux-mode.s2.06", tries: 3 },
  { id: "third", stepId: "fux-mode.s3.01", tries: 3 },
  { id: "fourth", stepId: "fux-mode.s4.01", continuo: { display: "both", preset: "cembalo" }, tries: 3 },
  { id: "continuo", stepId: "fux-mode.s2.03", continuo: { display: "both", preset: "cembalo", passingFill: true, finals: "organist" }, tries: 5 },
];
