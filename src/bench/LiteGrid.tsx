/**
 * D237, the minimal page's only screen besides the game: Book I's pairs of the tiers shown as cards
 * side by side (each pair's prelude, then its fugue, both open), Prelude 1 in C major first and marked
 * START HERE; a ✓ on each piece finished; one line saying how many more open the next tier; a small ⚙.
 */
import { useMemo } from "react";
import { fugueById } from "../touch/fugue.ts";
import { PIECE_SOUND } from "../touch/piece-sound.ts";
import { presetById } from "../touch/sound.ts";
import { Emblem } from "./FuguePicker.tsx";
import { keyLabel } from "./emblem.ts";
import { liteAll, liteLevel, startHere } from "./lite.ts";
import { popTitle } from "./PlayPop.tsx";

/** D265: a sound's name as the list shows it. */
export const soundName = (id: string): string => presetById(id).name.replace(/ \(SAMPLED\)$/, "");

export function LiteGrid({ beaten, open, settings, fuguesOnly = false }: { beaten: readonly string[]; open: (id: string) => void; settings: () => void; fuguesOnly?: boolean }) {
  const won = useMemo(() => new Set(beaten), [beaten]);
  // D263: on a phone the fugues only. D264: all open, each in its difficulty's colour. D265: a list from
  // the first to the last, numbered, the card on the left and what the piece is on the right (its voices,
  // its difficulty, its sound).
  const start = startHere(fuguesOnly);
  return (
    <div className="tb-lite" role="main" aria-label="Pieces">
      <header className="tb-lite-head">
        <h1>THE WELL-TEMPERED GAME</h1>
        <button type="button" id="lite-settings" className="tg-x" aria-label="Settings" onClick={settings}>
          ⚙
        </button>
      </header>
      <ol className="tb-lite-list">
        {liteAll(fuguesOnly).map((id) => {
          const f = fugueById(id);
          const done = won.has(id);
          const here = id === start && !done;
          const lv = liteLevel(id);
          const n = Number(id.slice(-2));
          const title = popTitle(id);
          const [bwv, name] = title.includes(" · ") ? title.split(" · ") : ["", title];
          return (
            <li key={id}>
              <button type="button" id={`card-${id}`} className={`tb-lite-card${here ? " tb-lite-here" : ""}${done ? " done" : ""}`} style={{ ["--tint" as string]: lv.ink }} onClick={() => open(id)}>
                <span className="tb-lite-pic-wrap">
                  <Emblem id={id} label={keyLabel(f.key, f.kind === "prelude" ? "prelude" : "fugue")} className="tb-lite-pic" />
                  <span className="tb-lite-num">{n}</span>
                  {done && <span className="tb-lite-done">✓</span>}
                </span>
                <span className="tb-lite-info">
                  {here && <span className="tb-lite-start">START HERE</span>}
                  <span className="tb-lite-title">{name}</span>
                  <span className="tb-lite-meta">
                    {bwv}
                    {bwv ? " · " : ""}
                    {f.voices.length} VOICES
                  </span>
                  <span className="tb-lite-level" style={{ color: lv.ink }}>
                    {lv.label}
                  </span>
                  <span className="tb-lite-meta">SOUND: {soundName(PIECE_SOUND[id] ?? "harpsichordSampled")}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
