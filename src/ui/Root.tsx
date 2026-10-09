import { useEffect, useState } from "react";
import { App } from "./App.tsx";
import { TrioApp } from "./TrioApp.tsx";
import { ChoraleApp } from "./ChoraleApp.tsx";
import { WtcRoot } from "./WtcRoot.tsx";
import { store, stored } from "./shared.ts";

export type Mode = 2 | 3 | "chorale" | "wtc";

/**
 * Two voices (Exercitium I), three (Exercitium II, D90), the chorales (C4, a conception of
 * their own), or the Well-Tempered Clavier (C6): separate screens over one engine.
 */
export function Root() {
  const [mode, setMode] = useState<Mode>(() => stored<Mode>("wtg.voices", 2, (v) => v === 2 || v === 3 || v === "chorale" || v === "wtc"));
  useEffect(() => store("wtg.voices", mode), [mode]);
  if (mode === "chorale") return <ChoraleApp onMode={setMode} />;
  if (mode === "wtc") return <WtcRoot onMode={setMode} />;
  return mode === 3 ? <TrioApp onVoices={setMode} /> : <App onVoices={setMode} />;
}
