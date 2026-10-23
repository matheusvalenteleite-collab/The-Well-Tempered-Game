/**
 * D219: TUNING folded into one button showing the choice ("TUNING · EQUAL · A440"); it opens a panel
 * of the pitches of A and the temperaments; a choice applies and closes it (settings-logic.ts).
 */
import { useState } from "react";
import { PITCHES, TEMPERAMENTS } from "../touch/tuning.ts";
import { chooseTuning, tuningLabel, type TuningChoice } from "./settings-logic.ts";

export function TuningFold({ id, a, set }: { id: string; a: number; set: (id: string, a: number) => void }) {
  const [open, setOpen] = useState(false);
  const choose = (c: TuningChoice) => {
    const t = chooseTuning({ id, a }, c);
    set(t.id, t.a);
    setOpen(t.open);
  };
  return (
    <>
      <button type="button" id="tuning-open" className="tb-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{tuningLabel(id, a)}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="tb-fold-panel" role="group" aria-label="Tuning">
          <p className="tb-fold-head">PITCH OF A</p>
          <div className="tg-seg">
            {PITCHES.map((p) => (
              <button key={p} type="button" id={`a-${p}`} className={p === a ? "on" : ""} aria-pressed={p === a} onClick={() => choose({ a: p })}>
                A{p} {p === 440 ? "· MODERN" : "· BAROQUE"}
              </button>
            ))}
          </div>
          <p className="tb-fold-head">TEMPERAMENT</p>
          <div className="tg-grid3">
            {TEMPERAMENTS.map((t) => (
              <button key={t.id} type="button" id={`temper-${t.id}`} className={t.id === id ? "on" : ""} aria-pressed={t.id === id} onClick={() => choose({ temper: t.id })}>
                {t.name}
              </button>
            ))}
          </div>
          <button type="button" id="tuning-done" className="tb-fold-done" onClick={() => setOpen(false)}>
            ✕ CLOSE
          </button>
        </div>
      )}
    </>
  );
}
