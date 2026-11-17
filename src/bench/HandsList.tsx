/**
 * D862, TWO HANDS (the prototype): play.html?proto=hands only. A small list over the selection screen, the
 * prototype's pieces, each starting at once in TWO HANDS (the left thumb the left hand, the right thumb the right).
 * The normal selection is untouched: without the flag this never shows, and preludes stay off the phone (D263).
 */
import { useEffect, useState } from "react";
import { extrasLoaded, loadExtras } from "../touch/fugue.ts";
import { TWO_HANDS_IDS } from "../touch/two-hands.ts";
import { HAND_INK } from "../touch/voice-inks.ts";

/** Each piece's card: its name and what each hand asks (L, R: notes a second at the game's tempo, D862's table). */
const CARD: Record<string, { name: string; key: string; lh: string; rh: string }> = {
  wtc1p13: { name: "PREL. I/13", key: "F♯ MAJOR", lh: "1.6", rh: "2.6" },
  wtc1p24: { name: "PREL. I/24", key: "B MINOR", lh: "2.6", rh: "1.4" },
  wtc2p08: { name: "PREL. II/8", key: "D♯ MINOR", lh: "2.0", rh: "2.6" },
  wtc2p10: { name: "PREL. II/10", key: "E MINOR", lh: "2.5", rh: "2.6" },
  bwv772: { name: "INV. 1", key: "C MAJOR", lh: "3.0", rh: "3.2" },
};

export function HandsList({ play, folded = false }: { play: (id: string) => void; folded?: boolean }) {
  const [open, setOpen] = useState(!folded);
  // The invention's notes are MORE BACH's chunk, fetched on demand: its button waits for them.
  const [extras, setExtras] = useState(extrasLoaded);
  useEffect(() => {
    if (!extras) loadExtras().then(() => setExtras(true), () => {});
  }, [extras]);
  const box: React.CSSProperties = {
    position: "fixed",
    left: "50%",
    bottom: "max(6px, env(safe-area-inset-bottom))",
    transform: "translateX(-50%)",
    zIndex: 60,
    width: "min(560px, calc(100vw - 32px))",
    boxSizing: "border-box",
    background: "rgba(11,13,24,0.96)",
    border: "2px solid #39405e",
    borderLeft: `6px solid ${HAND_INK.left}`,
    borderRight: `6px solid ${HAND_INK.right}`,
    borderRadius: 8,
    padding: "6px 8px",
    font: '7px "Press Start 2P", ui-monospace, monospace',
    color: "#ecead9",
    boxShadow: "0 4px 18px rgba(0,0,0,0.6)",
  };
  if (!open)
    return (
      <button
        type="button"
        id="hands-open"
        // D866: folded, a small tab at the right column's foot (over no card).
        style={{ ...box, left: "auto", right: "calc(8px + var(--tg-sar, 0px))", transform: "none", width: "auto", minHeight: 36, cursor: "pointer" }}
        onClick={() => setOpen(true)}
      >
        TWO HANDS ▲
      </button>
    );
  return (
    <section id="hands-list" aria-label="Two hands prototype" style={box}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ lineHeight: 1.6 }}>
          TWO HANDS (PROTOTYPE) · <span style={{ color: HAND_INK.left }}>LEFT THUMB: LEFT HAND</span> · <span style={{ color: HAND_INK.right }}>RIGHT THUMB: RIGHT HAND</span>
        </span>
        <button type="button" aria-label="Hide" onClick={() => setOpen(false)} style={{ font: "inherit", color: "#ecead9", background: "none", border: "none", padding: "4px 6px", cursor: "pointer" }}>
          ▼
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${TWO_HANDS_IDS.length}, 1fr)`, gap: 4 }}>
        {TWO_HANDS_IDS.map((id) => {
          const c = CARD[id];
          const waiting = !/^wtc/.test(id) && !extras;
          return (
            <button
              key={id}
              type="button"
              id={`hands-${id}`}
              disabled={waiting}
              onClick={() => play(id)}
              style={{ font: "inherit", lineHeight: 1.7, color: "#ecead9", background: "#1a2036", border: "1px solid #39405e", borderRadius: 6, padding: "4px 5px", minWidth: 0, minHeight: 44, cursor: "pointer", textAlign: "left", overflow: "hidden", whiteSpace: "nowrap" }}
            >
              <div>{c?.name ?? id}</div>
              <div style={{ color: "#9aa0b8" }}>{waiting ? "LOADING…" : (c?.key ?? "")}</div>
              <div>
                <span style={{ color: HAND_INK.left }}>L{c?.lh}</span> <span style={{ color: HAND_INK.right }}>R{c?.rh}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
