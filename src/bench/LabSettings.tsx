/**
 * D213, the bench's ⚙ LAB: experiment E1's switches (subject-fx.ts): the subject's sound (brighter and
 * crisper, the others duller during an entry), its per-fugue effect, a vibrato, the stereo move (D215's WITH ISHIZAKA withdrawn in D216: its stored switch is
 * ignored). Kept on this device; a game takes them as it begins.
 */
import { useState } from "react";
import { Choice } from "../touch/Panels.tsx";
import { lab, LAB_DEFAULT, setLab, type Lab } from "../touch/subject-fx.ts";

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

const ROWS: [keyof Lab, string][] = [
  ["subject", "SUBJECT SOUND"],
  ["effect", "EFFECT"],
  ["vibrato", "VIBRATO"],
  ["stereo", "STEREO"],
];

export function LabSettings() {
  const [l, setL] = useState<Lab>(lab);
  const set = (k: keyof Lab, on: boolean) => {
    const next = { ...l, [k]: on };
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
      <div className="tg-set">
        <span>⚙ LAB</span>
      </div>
      {ROWS.map(([k, label]) => (
        <Choice key={k} id={`lab-${k}`} label={label} options={[["on", "ON"], ["off", "OFF"]]} value={l[k] ? "on" : "off"} set={(v) => set(k, v === "on")} />
      ))}
    </>
  );
}
