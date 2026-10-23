/**
 * D233: ⚙ SOUND folded like TUNING and INTERFACE: one button showing the choice ("SOUND ·
 * HARPSICHORD (SAMPLED)"); it opens the families and their presets; choosing one applies and closes.
 */
import { useState } from "react";
import { SoundChoices } from "../touch/Panels.tsx";
import { soundLabel } from "./settings-logic.ts";

export function SoundFold({ value, set }: { value: string; set: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" id="sound-open" className="tb-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{soundLabel(value)}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="tb-fold-panel" role="group" aria-label="Sound">
          <SoundChoices value={value} set={(id) => (set(id), setOpen(false))} />
          <button type="button" id="sound-done" className="tb-fold-done" onClick={() => setOpen(false)}>
            ✕ CLOSE
          </button>
        </div>
      )}
    </>
  );
}
