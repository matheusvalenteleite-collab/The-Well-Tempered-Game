/**
 * D237, the minimal page's only screen besides the game: Book I's pairs of the tiers shown as cards
 * side by side (each pair's prelude, then its fugue, both open), Prelude 1 in C major first and marked
 * START HERE; a ✓ on each piece finished; one line saying how many more open the next tier; a small ⚙.
 */
import { lang, pieceName, tr } from "../i18n/index.ts";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { fugueById } from "../touch/fugue.ts";
import { PIECE_SOUND } from "../touch/piece-sound.ts";
import { presetById } from "../touch/sound.ts";
import { Emblem } from "./FuguePicker.tsx";
import { keyLabel } from "./emblem.ts";
import { liteAll, liteLevel, startHere } from "./lite.ts";
import { popTitle } from "./PlayPop.tsx";

/** D265: a sound's name as the list shows it. */
export const soundName = (id: string): string => presetById(id).name.replace(/ \(SAMPLED\)$/, "");

/** D276: the book tab shown, kept on the device. */
const TAB_KEY = "tb-lite-book-v1";
function storedTab(): "I" | "II" {
  try {
    return localStorage.getItem(TAB_KEY) === "II" ? "II" : "I";
  } catch {
    return "I";
  }
}

/** D308: a best grade's colour on its card (as the result's: S and A in gold, then down to red). */
export const GRADE_INK: Record<string, string> = { S: "#ffd23f", A: "#f3c246", B: "#5fdc6a", C: "#7fd6e8", D: "#ec5a4a" };

export function LiteGrid({ beaten, best = {}, scores = {}, open, settings, fuguesOnly = false, tutorial, hear, book: asked, current }: { beaten: readonly string[]; best?: Readonly<Record<string, string>>; scores?: Readonly<Record<string, number>>; open: (id: string) => void; hear?: (id: string) => void; book?: "I" | "II"; settings: () => void; fuguesOnly?: boolean; tutorial?: { done: number; of: number; start: () => void }; current?: string }) {
  const won = useMemo(() => new Set(beaten), [beaten]);
  // D263: on a phone the fugues only. D264: all open, each in its difficulty's colour. D265: a list from
  // the first to the last, numbered, the card on the left and what the piece is on the right (its voices,
  // its difficulty, its sound).
  // D270: THE TUTORIAL first (a phone's), START HERE until it is passed.
  const learning = !!tutorial && tutorial.done < tutorial.of;
  // D276: Book I and Book II in two tabs at the top (the tutorial on Book I's).
  // D295: back from a piece, the list opens on it (its book's tab, the card in view), not at the top.
  const last = current && liteAll(fuguesOnly).includes(current) ? current : null;
  const [tab, setTab] = useState<"I" | "II">(() => asked ?? (last ? (last.startsWith("wtc2") ? "II" : "I") : storedTab()));
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!last) return;
    const card = document.getElementById(`card-${last}`);
    const box = list.current;
    if (card && box) box.scrollTop = Math.max(0, card.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight / 2 + card.clientHeight / 2);
  }, []);
  const pick = (t: "I" | "II") => {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* this visit only */
    }
  };
  const start = learning ? null : startHere(fuguesOnly);
  return (
    <div className="tb-lite" role="main" aria-label="Pieces" ref={list}>
      <header className="tb-lite-head">
        <h1>{tr("THE WELL-TEMPERED GAME")}</h1>
        <button type="button" id="lite-settings" className="tg-x" aria-label="Settings" onClick={settings}>
          ⚙
        </button>
      </header>
      <div className="tb-lite-tabs" role="tablist" aria-label="Books">
        {(["I", "II"] as const).map((t) => (
          <button key={t} type="button" role="tab" id={`tab-book-${t}`} aria-selected={tab === t} className={`tb-lite-tab${tab === t ? " on" : ""}`} onClick={() => pick(t)}>
            {tr("BOOK")} {t}
          </button>
        ))}
      </div>
      <ol className="tb-lite-list">
        {tutorial && tab === "I" && (
          <li key="tutorial">
            <button type="button" id="card-tutorial" className={`tb-lite-card tb-lite-tutorial${learning ? " tb-lite-here" : " done"}`} style={{ ["--tint" as string]: "#7fd6e8" }} onClick={tutorial.start}>
              <span className="tb-lite-pic-wrap">
                <span className="tb-lite-pic tb-lite-tutorial-pic" aria-hidden="true">
                  ♪
                </span>
                {!learning && <span className="tb-lite-done">✓</span>}
              </span>
              <span className="tb-lite-info">
                {learning && <span className="tb-lite-start">{tr("START HERE")}</span>}
                <span className="tb-lite-title">{tr("TUTORIAL")}</span>
                <span className="tb-lite-meta">{tr("INVENTION 1 · BWV 772 · 2 VOICES")}</span>
                <span className="tb-lite-level" style={{ color: "#7fd6e8" }}>
                  {tutorial.done ? tr("{n} OF {m} STEPS", { n: tutorial.done, m: tutorial.of }) : tr("{m} STEPS", { m: tutorial.of })}
                </span>
                <span className="tb-lite-meta">{tr("WITH HERR BACH")}</span>
              </span>
            </button>
          </li>
        )}
        {liteAll(fuguesOnly)
          .filter((id) => (id.startsWith("wtc2") ? "II" : "I") === tab)
          .map((id) => {
          const f = fugueById(id);
          const done = won.has(id);
          const here = id === start && !done;
          const lv = liteLevel(id);
          const n = Number(id.slice(-2));
          const title = popTitle(id);
          const [bwv, en] = title.includes(" · ") ? title.split(" · ") : ["", title];
          // D283: the piece named in the language chosen.
          const name = lang() === "en" ? en : pieceName(f.kind, f.key);
          return (
            <li key={id}>
              <button type="button" id={`card-${id}`} className={`tb-lite-card${here ? " tb-lite-here" : ""}${done ? " done" : ""}`} style={{ ["--tint" as string]: lv.ink }} onClick={() => open(id)}>
                <span className="tb-lite-pic-wrap">
                  <Emblem id={id} label={keyLabel(f.key, f.kind === "prelude" ? "prelude" : "fugue")} className="tb-lite-pic" />
                  <span className="tb-lite-num">{n}</span>
                  {/* D308: the best grade stamped on the picture (in place of the ✓ where there is one). */}
                  {best[id] ? (
                    <span className="tb-lite-grade" id={`grade-${id}`} style={{ ["--grade" as string]: GRADE_INK[best[id]] ?? "var(--tg-shine)" }} aria-label={tr("BEST GRADE {g}", { g: best[id] })}>
                      {best[id]}
                    </span>
                  ) : (
                    done && <span className="tb-lite-done">✓</span>
                  )}
                </span>
                <span className="tb-lite-info">
                  {here && <span className="tb-lite-start">{tr("START HERE")}</span>}
                  <span className="tb-lite-title">{name}</span>
                  <span className="tb-lite-meta">
                    {bwv}
                    {bwv ? " · " : ""}
                    {tr("{n} VOICES", { n: f.voices.length })}
                  </span>
                  <span className="tb-lite-level" style={{ color: lv.ink }}>
                    {tr(lv.label)}
                  </span>
                  <span className="tb-lite-meta">{tr("SOUND")}: {tr(soundName(PIECE_SOUND[id] ?? "harpsichordSampled"))}</span>
                  {/* D308: the best score (a whole piece finished). */}
                  {scores[id] !== undefined && (
                    <span className="tb-lite-best" id={`best-${id}`}>
                      {tr("BEST {n}", { n: scores[id].toLocaleString("en") })}
                    </span>
                  )}
                </span>
              </button>
              {hear && f.kind === "fugue" && (
                // D272: the subject as the chosen reading plays it.
                <button type="button" id={`hear-${id}`} className="tb-hear-btn" onClick={() => hear(id)}>
                  ♪ {tr("HEAR THE SUBJECT")}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
