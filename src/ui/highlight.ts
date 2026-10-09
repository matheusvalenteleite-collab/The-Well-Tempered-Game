/**
 * Bars pointed at in a text (D96): hovering "bar 4" anywhere makes bar 4 pulse on the score.
 * A tiny shared store (0-based bar numbers), read by the screens and drawn by the scores.
 */
import { useSyncExternalStore } from "react";

let current: number[] | null = null;
const listeners = new Set<() => void>();
export function setHighlight(bars: number[] | null) {
  current = bars && bars.length ? bars : null;
  for (const l of listeners) l();
}
export function useHighlight(): number[] | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
