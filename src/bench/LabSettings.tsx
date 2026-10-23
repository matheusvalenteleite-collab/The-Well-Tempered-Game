/**
 * D213, the bench's ⚙ LAB: experiment E1's switches (subject-fx.ts): the subject's sound (brighter and
 * crisper, the others duller during an entry), its per-fugue effect, a vibrato, the stereo move (D215's WITH ISHIZAKA withdrawn in D216: its stored switch is
 * ignored). Kept on this device; a game takes them as it begins. D219: folded into one button showing
 * what is on; it opens a panel, each switch with a line on what it does, ✕ DONE closes.
 */
import { useState } from "react";
import { lab, LAB_DEFAULT, setLab, type Lab } from "../touch/subject-fx.ts";
import { LAB_ROWS, labLabel, toggleLab } from "./settings-logic.ts";

const LAB_KEY = "tb-lab-v1";

function loadLab(): Lab {
  try {
    const v = localStorage.getItem(LAB_KEY);
    if (v === null) return LAB_DEFAULT;
    // D216: WITH ISHIZAKA withdrawn: its switch, if stored, left out.
    const { ishizaka: _gone, ...rest } = JSON.parse(v) as Partial<Lab> & { ishizaka?: boolean };
    return { ...LAB_DEFAULT, ...rest };
  } catch {
    return LAB_DEFAULT;
  }
}

// The switches as stored, in force from the first game (whether or not ⚙ is opened).
setLab(loadLab());

export function LabSettings() {
  const [l, setL] = useState<Lab>(lab);
  const [open, setOpen] = useState(false);
  const flip = (k: keyof Lab) => {
    const next = toggleLab(l, k);
    setL(next);
    setLab(next);
    try {
      localStorage.setItem(LAB_KEY, JSON.stringify(next));
    } catch {
      /* no storage */
    }
  };
  return (
    <>
      <button type="button" id="lab-open" className="tb-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{labLabel(l)}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="tb-fold-panel" role="group" aria-label="Lab">
          {LAB_ROWS.map(([k, name, what]) => (
            <button key={k} type="button" id={`lab-${k}`} className={`tb-switch${l[k] ? " on" : ""}`} aria-pressed={l[k]} onClick={() => flip(k)}>
              <span className="tb-switch-pip" aria-hidden="true">{l[k] ? "■" : "□"}</span>
              <span className="tb-switch-name">{name}</span>
              <span className="tb-switch-what">{what}</span>
            </button>
          ))}
          <button type="button" id="lab-done" className="tb-fold-done" onClick={() => setOpen(false)}>
            ✕ DONE
          </button>
        </div>
      )}
    </>
  );
}
