/**
 * D327: ⚙ TUNING, one dropdown (as SOUND's, D303): INSTRUMENT DEFAULT first (the sound's own tuning,
 * instrument-tuning.ts, named beside it), then each temperament at A = 415 and at A = 440. Replaces
 * D219's folded TUNING on the bench; on play.html new.
 */
import { tr, trCanvas } from "../i18n/index.ts";
import { PITCHES, TEMPERAMENTS } from "../touch/tuning.ts";
import { tuningOfValue, tuningShort, tuningValue, type TuningAt, type TuningPref } from "../touch/instrument-tuning.ts";

export function TuningSelect({ value, set, own }: { value: TuningPref; set: (p: TuningPref) => void; own: TuningAt }) {
  return (
    <label className="tb-sound-select tb-tuning-select">
      <span>{tr("TUNING")}</span>
      <span className="tb-sound-pick">
        <select id="tuning" value={tuningValue(value)} onChange={(e) => set(tuningOfValue(e.target.value))}>
          <option value="instrument">{`${tr("INSTRUMENT DEFAULT")} · ${trCanvas(tuningShort(own))}`}</option>
          {[...PITCHES].reverse().map((a) => (
            <optgroup key={a} label={`A = ${a}${a === 415 ? ` · ${tr("BAROQUE")}` : ` · ${tr("MODERN")}`}`}>
              {TEMPERAMENTS.map((t) => (
                <option key={t.id} value={`${t.id}@${a}`}>
                  {trCanvas(tuningShort({ id: t.id, a }))}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span aria-hidden="true">▾</span>
      </span>
    </label>
  );
}
