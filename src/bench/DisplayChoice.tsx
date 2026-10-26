/**
 * D298: ⚙ DISPLAY: what the round shows between the bars. DEFAULT (the music box as it is), CANTUS (to
 * come: the box meanwhile), SHEET · TWO STAVES (the fugue as an Urtext prints it, each voice in its
 * colour) and SHEET · ONE STAFF PER VOICE (open score). Kept on the device (sheet-format.ts).
 */
import { tr, trCanvas } from "../i18n/index.ts";
import type { TouchFugue } from "../touch/fugue.ts";
import { engraved, type DisplayMode } from "./sheet-format.ts";

export const DISPLAY_NAMES: Record<DisplayMode, string> = {
  default: "DEFAULT",
  cantus: "CANTUS",
  sheet2: "SHEET · TWO STAVES",
  sheetN: "SHEET · ONE STAFF PER VOICE",
};

export function DisplayChoice({ value, set, piece }: { value: DisplayMode; set: (m: DisplayMode) => void; piece: TouchFugue }) {
  const modes: DisplayMode[] = ["default", "cantus", "sheet2", "sheetN"];
  return (
    <div className="tg-set tb-display">
      <span>{tr("DISPLAY")}</span>
      <div className="tg-seg" role="group" aria-label="Display">
        {modes.map((m) => (
          <button key={m} type="button" id={`display-${m}`} className={m === value ? "on" : ""} onClick={() => set(m)} aria-pressed={m === value}>
            {trCanvas(DISPLAY_NAMES[m])}
          </button>
        ))}
      </div>
      {value === "cantus" && <p className="tg-panel-note">{tr("CANTUS is coming: the default display meanwhile.")}</p>}
      {(value === "sheet2" || value === "sheetN") && !engraved(piece.id) && <p className="tg-panel-note">{tr("The sheet is drawn for the fugues: this piece shows the default display.")}</p>}
    </div>
  );
}
