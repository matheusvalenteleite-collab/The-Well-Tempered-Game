/**
 * D485, OBBLIGATO's buttons: while an offer stands (obbligato.ts, ProtoGame.offer), a glowing button at
 * the foot of each thumb's bar (D487, the owner: "obbligato at bottom of buttons instead"; D485 had them at
 * the outer top corners), naming the instrument offered ("OBBLIGATO · CELLO"; an octave away, "↑8" or
 * "↓8"). A tap on either takes it. The buttons sit under the music box's roll's lowest row, stacked just
 * above the registration stops where those stand at the bars' feet (bench.css), and lie over the play area
 * outside it in the page (as the stops do): a touch on them is the button's and never reaches the bars, so
 * it is never judged as a note. An offer not taken by the entry's first note lapses (the game clears it),
 * with no penalty.
 */
import { useEffect, useState, type MutableRefObject } from "react";
import { tr } from "../i18n/index.ts";
import { OBBLIGATO } from "./obbligato.ts";
import type { ProtoGame } from "./proto-game.ts";

/** The button's words: the boost's name and the instrument (and its octave, where it is not unison). */
export function offerLabel(name: string, octave: number): string {
  return `${tr(OBBLIGATO)} · ${instrumentLabel(name, octave)}`;
}
/** The instrument's words: its name, and "↑8", "↓15" an octave or two away. */
export function instrumentLabel(name: string, octave: number): string {
  const n = Math.abs(octave);
  return `${tr(name)}${octave === 0 ? "" : ` ${octave > 0 ? "↑" : "↓"}${7 * n + 1}`}`;
}

/** D487: the most characters the instrument shows on one line (9 px, the narrowest bar: 667 px wide, 22%). */
export const LONG_NAME = 13;

export function ObbligatoOffer({ game }: { game: MutableRefObject<ProtoGame | null> }) {
  const [offer, setOffer] = useState<{ name: string; octave: number; on: number } | null>(null);
  useEffect(() => {
    let raf = 0;
    let last = "";
    const loop = () => {
      const o = game.current?.offer ?? null;
      const key = o ? `${o.entryOn}:${o.layer.id}:${o.octave}` : "";
      if (key !== last) {
        last = key;
        setOffer(o ? { name: o.layer.name, octave: o.octave, on: o.entryOn } : null);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);
  if (!offer) return null;
  const take = (e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (game.current?.acceptOffer()) setOffer(null);
  };
  const label = offerLabel(offer.name, offer.octave);
  // D487: a name too long for one line at 9 px (13 characters on the narrowest bar) goes to two lines at 8 px, in full.
  const inst = instrumentLabel(offer.name, offer.octave);
  const long = inst.length > LONG_NAME;
  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <button key={side} type="button" className={`tb-obbligato tb-obbligato-${side}${long ? " tb-obbligato-long" : ""}`} onPointerDown={take} onClick={take} aria-label={label}>
          <span className="tb-obbligato-name">{tr(OBBLIGATO)}</span>
          <span className="tb-obbligato-inst">{inst}</span>
        </button>
      ))}
    </>
  );
}
