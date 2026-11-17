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
/** D862, TWO HANDS: the left hand warm, the right hand cool, everywhere the hands are drawn (the blocks, the bars). */
export const HAND_INK = { left: "#ff8c4a", right: "#5cb2ff" } as const;
/** D862: while a TWO HANDS run is on, its voices' inks (voice → ink), else null. */
let handInks: Map<number, string> | null = null;
export function setHandInks(hands: { lh: number; rh: number } | null) {
  handInks = hands ? new Map([[hands.lh, HAND_INK.left], [hands.rh, HAND_INK.right]]) : null;
}
export function inkOf(voice: number, count: number): string {
  return handInks?.get(voice) ?? (INKS[count] ?? INKS[4])[voice] ?? "#ecead9";
}
