/**
 * D237, the minimal page's only screen besides the game: Book I's pairs of the tiers shown as cards
 * side by side (each pair's prelude, then its fugue, both open), Prelude 1 in C major first and marked
 * START HERE; a ✓ on each piece finished; one line saying how many more open the next tier; a small ⚙.
 */
import { useMemo } from "react";
import { fugueById } from "../touch/fugue.ts";
import { keyTint } from "../touch/MusicBox.tsx";
import { Emblem } from "./FuguePicker.tsx";
import { keyLabel } from "./emblem.ts";
import { liteLine, litePieces, liteTiers, START_HERE } from "./lite.ts";
import { popTitle } from "./PlayPop.tsx";

export function LiteGrid({ beaten, open, settings }: { beaten: readonly string[]; open: (id: string) => void; settings: () => void }) {
  const won = useMemo(() => new Set(beaten), [beaten]);
  const tiers = liteTiers(won);
  const line = liteLine(won);
  return (
    <div className="tb-lite" role="main" aria-label="Pieces">
      <header className="tb-lite-head">
        <h1>THE WELL-TEMPERED GAME</h1>
        <button type="button" id="lite-settings" className="tg-x" aria-label="Settings" onClick={settings}>
          ⚙
        </button>
      </header>
      {tiers.map((t) => (
        <section key={t} className="tb-lite-tier" aria-label={t}>
          <h2 className={`tb-lite-tier-name tb-tier-${t.toLowerCase()}`}>{t}</h2>
          <div className="tb-lite-grid">
            {litePieces(t).map((id) => {
              const f = fugueById(id);
              const done = won.has(id);
              const here = id === START_HERE && !done;
              return (
                <button key={id} type="button" id={`card-${id}`} className={`tb-lite-card${here ? " tb-lite-here" : ""}${done ? " done" : ""}`} style={{ ["--tint" as string]: keyTint(f.key, 30) }} onClick={() => open(id)}>
                  {here && <span className="tb-lite-start">START HERE</span>}
                  <Emblem id={id} label={keyLabel(f.key, f.kind === "prelude" ? "prelude" : "fugue")} className="tb-lite-pic" />
                  <span className="tb-lite-title">{popTitle(id)}</span>
                  {done && <span className="tb-lite-done">✓</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {line && <p className="tb-lite-line" id="lite-line">{line}</p>}
    </div>
  );
}
