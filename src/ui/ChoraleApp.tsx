/**
 * The chorale mode: the workbench (C26, C27), one of Kittel's melodies harmonized from the top down
 * in six stages on one screen (ChoraleWorkbench); and Bach's chorales, to hear and read (C15) and to
 * diminish (C19).
 */
import { useEffect, useState } from "react";
import { ChoraleStudy } from "./ChoraleStudy.tsx";
import { ChoraleDiminution } from "./ChoraleDiminution.tsx";
import { ChoraleWorkbench, type Stage } from "./ChoraleWorkbench.tsx";
import { CHORALES } from "../chorale/level1.ts";
import { LEVEL2 } from "../chorale/level2.ts";
import { LEVEL3 } from "../chorale/level3.ts";
import { LEVEL4 } from "../chorale/level4.ts";
import { workbenchId } from "../chorale/workbench.ts";
import type { Mode } from "./Root.tsx";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

type Picks = Record<number, (string | null)[]>;

/** 1-6: the stages of the workbench on one of Kittel's melodies (C26); 0 and 7: Bach's chorales (to
 * hear and read; diminution on his own settings). */
type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 0, 7];

/** Whether the player has finished a stage on this melody (for the ✓ in the stage selector). */
function stageDone(stage: Level, number: number): boolean {
  const picks = (key: string) => stored<Picks>(key, {}, (v) => typeof v === "object" && v !== null);
  const full = (xs: (string | null)[] | undefined, n: number) => Boolean(xs && xs.length === n && xs.every(Boolean));
  const ch = CHORALES.find((c) => c.number === number);
  if (!ch) return false;
  const bassNo = Math.min(stored("wtg.choraleBass", 0, (v) => typeof v === "number"), LEVEL4[number].basses.length - 1);
  if (stage === 1) return full(picks("wtg.choralePicks")[number], ch.phrases.length);
  if (stage === 2) return full(picks("wtg.choralePicks2")[number], LEVEL2[number].notes.length);
  if (stage === 3) return full(picks("wtg.choralePicks3")[number], LEVEL3[number].notes.length);
  if (stage === 4) return full(picks("wtg.choralePicks4")[number * 100 + bassNo], LEVEL4[number].basses[bassNo].notes.length);
  if (stage === 5) {
    const w = stored<Record<string, { alto: (string | null)[]; tenor: (string | null)[] }>>("wtg.choraleVoices", {}, (v) => typeof v === "object" && v !== null)[`${number}-${bassNo}`];
    return Boolean(w && w.alto.every(Boolean) && w.tenor.every(Boolean));
  }
  if (stage === 6) {
    const d = stored<Record<string, Record<string, Record<string, string>>>>("wtg.choraleDim", {}, (v) => typeof v === "object" && v !== null)[String(workbenchId(number, bassNo))];
    return Boolean(d && Object.values(d).some((m) => Object.keys(m).length));
  }
  return false;
}

/** The chorale screen: the stage selector (✓ for each stage finished on the melody) and the screen it opens. */
export function ChoraleApp({ onMode, onTutorial }: { onMode(mode: Mode): void; onTutorial?: () => void }) {
  const [level, setLevel] = useState<Level>(() => stored<Level>("wtg.choraleLevel", 1, (v) => typeof v === "number" && v >= 0 && v <= 7));
  useEffect(() => store("wtg.choraleLevel", level), [level]);
  const levelSelect = (number: number) => (
    <select id="level" className="sel sel-species" value={level} aria-label={t("chorale.level")} onChange={(e) => setLevel(Number(e.target.value) as Level)}>
      {LEVELS.map((n) => (
        <option key={n} value={n}>{`${t(`chorale.level.${n}`)}${n >= 1 && n <= 6 && stageDone(n, number) ? ` ${t("chorale.stage.done")}` : ""}`}</option>
      ))}
    </select>
  );
  if (level === 7) return <ChoraleDiminution onMode={onMode} onTutorial={onTutorial} levelSelect={levelSelect(stored("wtg.chorale", 1, (v) => typeof v === "number"))} />;
  if (level === 0) return <ChoraleStudy onMode={onMode} onTutorial={onTutorial} levelSelect={levelSelect(stored("wtg.chorale", 1, (v) => typeof v === "number"))} />;
  return <ChoraleWorkbench onMode={onMode} onTutorial={onTutorial} stage={level as Stage} onStage={(s) => setLevel(s)} stageSelect={levelSelect} />;
}
