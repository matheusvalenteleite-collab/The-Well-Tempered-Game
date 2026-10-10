/**
 * BETA or the real setup (owner, D141): one switch for the whole game, kept in this browser. In
 * BETA everything is open, for testing; in the real setup what is learnt unlocks progressively
 * (so far: the tutorial's lessons, one after another). BETA by default during the beta phase.
 */
import { useSyncExternalStore } from "react";
import { store, stored } from "./shared.ts";

const KEY = "wtg.beta";
let beta = stored(KEY, true, (v) => typeof v === "boolean");
const listeners = new Set<() => void>();

export function setBeta(on: boolean) {
  beta = on;
  store(KEY, on);
  for (const l of listeners) l();
}

export function useBeta(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => beta,
  );
}
