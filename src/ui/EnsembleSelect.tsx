/**
 * P7: the chorale's ensemble (the owner's presets): choir, one voice a part, organ, string
 * quartet, Wendy Carlos's synthesizer, reeds, winds, choir with orchestra; or the game's piano.
 * Kept in this browser; a change applies at once, even while the chorale plays (D57).
 */
import { useEffect, useState } from "react";
import { ENSEMBLES, prepareChoraleAudio, READINGS, setReading, type Ensemble, type Reading } from "../audio/chorale-performance.ts";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

const KEY = "wtg.choraleEnsemble";
const valid = (v: unknown) => v === "piano" || ENSEMBLES.includes(v as Ensemble);

/** The stored ensemble ("piano": the game's own sound). */
export const storedEnsemble = (): Ensemble | null => {
  const v = stored<string>(KEY, "piano", valid);
  return v === "piano" ? null : (v as Ensemble);
};

const READING_KEY = "wtg.choraleReading";
setReading(stored<Reading>(READING_KEY, "context", (v) => READINGS.includes(v as Reading)));

/** P14: how the fermatas are read (by context, historical, traditional, strict); applies from the next ▶ or restart. */
function ReadingSelect({ onChange }: { onChange?(): void }) {
  const [value, setValue] = useState<Reading>(() => stored<Reading>(READING_KEY, "context", (v) => READINGS.includes(v as Reading)));
  return (
    <select className="sel" value={value} onChange={(e) => { const r = e.target.value as Reading; setValue(r); setReading(r); store(READING_KEY, r); onChange?.(); }} aria-label={t("chorale.reading")} title={t("chorale.reading.help")}>
      {READINGS.map((r) => (
        <option key={r} value={r}>{t(`chorale.reading.${r}`)}</option>
      ))}
    </select>
  );
}

export function EnsembleSelect({ heard, onReading }: { heard?: readonly boolean[]; onReading?(): void }) {
  const [value, setValue] = useState<string>(() => stored<string>(KEY, "piano", valid));
  useEffect(() => {
    store(KEY, value);
    prepareChoraleAudio(audio, heard, value === "piano" ? null : (value as Ensemble));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <>
    <ReadingSelect onChange={onReading} />
    <select className="sel" value={value} onChange={(e) => setValue(e.target.value)} aria-label={t("chorale.ensemble")} title={t("chorale.ensemble.help")}>
      <option value="piano">{t("chorale.ensemble.piano")}</option>
      {ENSEMBLES.map((e) => (
        <option key={e} value={e}>{t(`chorale.ensemble.${e}`)}</option>
      ))}
    </select>
    </>
  );
}
