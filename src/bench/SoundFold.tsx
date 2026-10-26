/**
 * D233: ⚙ SOUND folded like TUNING and INTERFACE: one button showing the choice ("SOUND ·
 * HARPSICHORD (SAMPLED)"); it opens the sounds (D292: five); choosing one applies and closes.
 * D303: now one dropdown (SoundSelect.tsx), the piece's own sound first and starred; DRUMS beside it
 * where the sound has them.
 */
import { DrumsToggle } from "../touch/Panels.tsx";
import { creditFor } from "../touch/sound.ts";
import { POP_SOUNDS } from "./PlayPop.tsx";
import { SoundSelect } from "./SoundSelect.tsx";

export function SoundFold({ value, set, own }: { value: string; set: (id: string) => void; own?: string }) {
  return (
    <div className="tb-sound-fold">
      <SoundSelect id="sound-select" value={value} set={set} sounds={POP_SOUNDS} own={own} />
      <DrumsToggle sound={value} />
      {creditFor(value) && <p className="tg-credit">{creditFor(value)}</p>}
    </div>
  );
}
