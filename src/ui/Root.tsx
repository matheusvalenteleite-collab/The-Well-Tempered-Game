import { useEffect, useState } from "react";
import { App } from "./App.tsx";
import { TrioApp } from "./TrioApp.tsx";
import { store, stored } from "./shared.ts";

/** Two voices (Exercitium I) or three (Exercitium II, D90): separate screens over one engine. */
export function Root() {
  const [voices, setVoices] = useState<2 | 3>(() => stored("wtg.voices", 2, (v) => v === 2 || v === 3));
  useEffect(() => store("wtg.voices", voices), [voices]);
  return voices === 3 ? <TrioApp onVoices={setVoices} /> : <App onVoices={setVoices} />;
}
