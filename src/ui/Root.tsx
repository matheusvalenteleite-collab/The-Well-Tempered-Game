import { useEffect, useState } from "react";
import { App } from "./App.tsx";
import { TrioApp } from "./TrioApp.tsx";
import { ChoraleApp } from "./ChoraleApp.tsx";
import { store, stored } from "./shared.ts";

export type Mode = 2 | 3 | "chorale";

/**
 * Two voices (Exercitium I), three (Exercitium II, D90), or the chorales (C4, a conception of
 * their own): separate screens over one engine.
 */
export function Root() {
  const [mode, setMode] = useState<Mode>(() => stored<Mode>("wtg.voices", 2, (v) => v === 2 || v === 3 || v === "chorale"));
  useEffect(() => store("wtg.voices", mode), [mode]);
  if (mode === "chorale") return <ChoraleApp onMode={setMode} />;
  return mode === 3 ? <TrioApp onVoices={setMode} /> : <App onVoices={setMode} />;
}
