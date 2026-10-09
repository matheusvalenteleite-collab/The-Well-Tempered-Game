import { useEffect, useState } from "react";
import { App } from "./App.tsx";
import { TrioApp } from "./TrioApp.tsx";
import { WtcApp } from "./WtcApp.tsx";
import { store, stored } from "./shared.ts";

/**
 * Two voices (Exercitium I), three (Exercitium II, D90), or the Well-Tempered Clavier (D119):
 * separate screens over one engine.
 */
export function Root() {
  const [voices, setVoices] = useState<2 | 3 | "wtc">(() => stored<2 | 3 | "wtc">("wtg.voices", 2, (v) => v === 2 || v === 3 || v === "wtc"));
  useEffect(() => store("wtg.voices", voices), [voices]);
  return voices === "wtc" ? <WtcApp onVoices={setVoices} /> : voices === 3 ? <TrioApp onVoices={setVoices} /> : <App onVoices={setVoices} />;
}
