/**
 * D237, the minimal page's only screen besides the game: Book I's pairs of the tiers shown as cards
 * side by side (each pair's prelude, then its fugue, both open), Prelude 1 in C major first and marked
 * START HERE; a ✓ on each piece finished; one line saying how many more open the next tier; a small ⚙.
 */
import { useMemo } from "react";
import { fugueById } from "../touch/fugue.ts";
import { Emblem } from "./FuguePicker.tsx";
import { keyLabel } from "./emblem.ts";
import { liteAll, liteLevel, startHere } from "./lite.ts";
import { popTitle } from "./PlayPop.tsx";

export function LiteGrid({ beaten, open, settings, fuguesOnly = false }: { beaten: readonly string[]; open: (id: string) => void; settings: () => void; fuguesOnly?: boolean }) {
  const won = useMemo(() => new Set(beaten), [beaten]);
  // D263: on a phone the fugues only. D264: all open from the start, in Bach's order, each card in its difficulty's colour.
  const start = startHere(fuguesOnly);
  return (
    <div className="tb-lite" role="main" aria-label="Pieces">
      <header className="tb-lite-head">
        <h1>THE WELL-TEMPERED GAME</h1>
        <button type="button" id="lite-settings" className="tg-x" aria-label="Settings" onClick={settings}>
          ⚙
        </button>
      </header>
      <div className="tb-lite-grid">
        {liteAll(fuguesOnly).map((id) => {
          const f = fugueById(id);
          const done = won.has(id);
          const here = id === start && !done;
          const lv = liteLevel(id);
          return (
            <button key={id} type="button" id={`card-${id}`} className={`tb-lite-card${here ? " tb-lite-here" : ""}${done ? " done" : ""}`} style={{ ["--tint" as string]: lv.ink }} onClick={() => open(id)}>
              {here && <span className="tb-lite-start">START HERE</span>}
              <Emblem id={id} label={keyLabel(f.key, f.kind === "prelude" ? "prelude" : "fugue")} className="tb-lite-pic" />
              <span className="tb-lite-title">{popTitle(id)}</span>
              <span className="tb-lite-level" style={{ color: lv.ink }}>
                {lv.label}
              </span>
              {done && <span className="tb-lite-done">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
