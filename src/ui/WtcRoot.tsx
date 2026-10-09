/** The WTC mode (C6): its levels, each a screen of its own. */
import { useEffect, useState } from "react";
import type { Mode } from "./Root.tsx";
import { PreludeApp } from "./PreludeApp.tsx";
import { AnswerApp } from "./AnswerApp.tsx";
import { store, stored } from "./shared.ts";

export type WtcLevel = "p1" | "f2";

export function WtcRoot({ onMode }: { onMode(mode: Mode): void }) {
  const [level, setLevel] = useState<WtcLevel>(() => stored<WtcLevel>("wtg.wtcLevel", "p1", (v) => v === "p1" || v === "f2"));
  useEffect(() => store("wtg.wtcLevel", level), [level]);
  return level === "f2" ? <AnswerApp onMode={onMode} level={level} onLevel={setLevel} /> : <PreludeApp onMode={onMode} level={level} onLevel={setLevel} />;
}
