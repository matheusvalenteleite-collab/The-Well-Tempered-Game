/**
 * The voices' colours, top voice first, for two to five voices: the box's notes (MusicBox.tsx) and, D670, the
 * birds of the Inventions and Sinfonias' setting (stage-bg.ts), so each bird is its voice's own colour.
 */
const INKS: Record<number, string[]> = {
  2: ["#5cb2ff", "#5fe08a"],
  3: ["#5cb2ff", "#ff8c4a", "#5fe08a"],
  4: ["#5cb2ff", "#ff8c4a", "#c78bff", "#5fe08a"],
  5: ["#5cb2ff", "#7fe3e0", "#ff8c4a", "#c78bff", "#5fe08a"],
};
export function inkOf(voice: number, count: number): string {
  return (INKS[count] ?? INKS[4])[voice] ?? "#ecead9";
}
