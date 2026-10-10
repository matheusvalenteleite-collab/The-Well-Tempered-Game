import { useEffect, useState } from "react";
import { App } from "./App.tsx";
import { TrioApp } from "./TrioApp.tsx";
import { WtcApp } from "./WtcApp.tsx";
import { WtcStudy } from "./WtcStudy.tsx";
import { store, stored } from "./shared.ts";

/**
 * Two voices (Exercitium I), three (Exercitium II, D90), or the Well-Tempered Clavier (D119):
 * separate screens over one engine.
 */
export function Root() {
  const [voices, setVoices] = useState<2 | 3 | "wtc">(() => stored<2 | 3 | "wtc">("wtg.voices", 2, (v) => v === 2 || v === 3 || v === "wtc"));
  useEffect(() => store("wtg.voices", voices), [voices]);
  // The Well-Tempered Clavier opens on the study (D123); the exercises are one button away.
  const [wtcView, setWtcView] = useState<"study" | "exercises">(() => stored<"study" | "exercises">("wtg.wtcView", "study", (v) => v === "study" || v === "exercises"));
  useEffect(() => store("wtg.wtcView", wtcView), [wtcView]);
  if (voices === "wtc")
    return wtcView === "study" ? <WtcStudy onVoices={setVoices} onExercises={() => setWtcView("exercises")} /> : <WtcApp onVoices={setVoices} onStudy={() => setWtcView("study")} />;
  return voices === 3 ? <TrioApp onVoices={setVoices} /> : <App onVoices={setVoices} />;
}
