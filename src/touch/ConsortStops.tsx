/**
 * Design studio (D472; Instruments' D512 API, consort-stops.ts): STRING CONSORT's five articulation stops (ARCO,
 * SPICCATO, PIZZICATO, CON SORDINO, TREMOLO) at each bar's foot, as the organ's and the harpsichord's pistons stand
 * there (D420, D471): all five on both bars, so whichever thumb is free reaches them, three over two in the
 * pistons' height, each name in full in the short form, fitting inside its button. The stop in force lit; a press
 * acts on pointerdown (a thumb holding a note never stops the other pressing one) and sounds from the next note
 * (chip.ts reads the stop as each note starts). The piece opens on the stop kept for it. Not scored.
 */
import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { lang, tr } from "../i18n/index.ts";
import { CONSORT_STOPS, chooseConsortStop, consortStop, consortStopLabel, hasConsortStops, onConsortStop, openConsortPiece, type ConsortStop } from "./consort-stops.ts";

/** The floor the bars' rows keep over the stops (bench.css --tb-stop-rows: the pistons' 58 px in 47 px rows). */
const CONSORT_ROWS = Math.round(((58 + 2) / 47) * 100) / 100;

export function ConsortStops({ presetId, piece }: { presetId: string; piece: string }) {
  const [stop, setStop] = useState<ConsortStop>(() => consortStop(presetId).stop);
  useEffect(() => {
    if (!hasConsortStops(presetId)) return;
    openConsortPiece(piece, presetId);
    setStop(consortStop(presetId).stop);
    return onConsortStop((p, st) => p === presetId && setStop(st.stop));
  }, [piece, presetId]);
  if (!hasConsortStops(presetId)) return null;
  const press = (s: ConsortStop) => (e: ReactPointerEvent) => {
    if (e.button > 0) return;
    e.preventDefault();
    chooseConsortStop(piece, presetId, s);
  };
  return (
    <>
      <style>{`.tb-has-side-stops { --tb-stop-rows: ${CONSORT_ROWS}; --tb-stop-rows-right: ${CONSORT_ROWS}; }`}</style>
      {(["left", "right"] as const).map((side) => (
        <span key={side} className={`tg-reg tb-stops-side tb-consort tb-stops-${side}`} id={`consort-${side}`} role="group" aria-label={tr("STOPS")}>
          {CONSORT_STOPS.map((s) => (
            <button
              key={s}
              type="button"
              id={`consort-${side}-${s}`}
              className={`tg-piston${stop === s ? " on" : ""}`}
              aria-pressed={stop === s}
              aria-label={consortStopLabel(s, lang())}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={press(s)}
              onClick={(e) => e.detail === 0 && chooseConsortStop(piece, presetId, s)}
            >
              <span className="tg-piston-name">{consortStopLabel(s, lang(), true)}</span>
            </button>
          ))}
        </span>
      ))}
    </>
  );
}
