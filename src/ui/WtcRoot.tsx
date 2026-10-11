/** The WTC mode (C6): its levels, each a screen of its own. */
import { useEffect, useState } from "react";
import type { Mode } from "./Root.tsx";
import { PreludeApp } from "./PreludeApp.tsx";
import { AnswerApp } from "./AnswerApp.tsx";
import { PlanApp } from "./PlanApp.tsx";
import { PIECES } from "../wtc/preludes.ts";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

export type WtcLevel = "p1" | "p2" | "f2" | `plan:${string}`;
const LEVELS: WtcLevel[] = ["p1", "p2", ...PIECES.map((p) => `plan:${p.id}` as WtcLevel), "f2"];

export function WtcRoot({ onMode }: { onMode(mode: Mode): void }) {
  const [level, setLevel] = useState<WtcLevel>(() => stored<WtcLevel>("wtg.wtcLevel", "p1", (v) => LEVELS.includes(v as WtcLevel)));
  useEffect(() => store("wtg.wtcLevel", level), [level]);
  if (level === "f2") return <AnswerApp onMode={onMode} level={level} onLevel={setLevel} />;
  if (level.startsWith("plan:")) return <PlanApp key={level} onMode={onMode} level={level} onLevel={setLevel} piece={PIECES.find((p) => `plan:${p.id}` === level)!} />;
  return <PreludeApp onMode={onMode} level={level} onLevel={setLevel} />;
}

/** The level selector, shared by the WTC screens. */
export function WtcLevelSelect({ level, onLevel, onChange }: { level: WtcLevel; onLevel(l: WtcLevel): void; onChange?(): void }) {
  return (
    <select id="level" className="sel sel-species" value={level} aria-label={t("chorale.level")} onChange={(e) => { onChange?.(); onLevel(e.target.value as WtcLevel); }}>
      <option value="p1">{t("wtcp.piece.p1")}</option>
      <option value="p2">{t("wtcp.level.p2")}</option>
      {PIECES.map((p) => (
        <option key={p.id} value={`plan:${p.id}`}>{t("wtcp.level.plan", { title: p.title.replace(/, BWV.*/, "") })}</option>
      ))}
      <option value="f2">{t("wtcp.level.f2")}</option>
    </select>
  );
}
