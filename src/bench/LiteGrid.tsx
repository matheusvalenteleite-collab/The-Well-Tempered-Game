/**
 * D237, the minimal page's only screen besides the game: Book I's pairs of the tiers shown as cards
 * side by side (each pair's prelude, then its fugue, both open), Prelude 1 in C major first and marked
 * START HERE; a ✓ on each piece finished; one line saying how many more open the next tier; a small ⚙.
 */
import { lang, LANGS, pieceName, tr, type Lang } from "../i18n/index.ts";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { extrasLoaded, fugueById, loadExtras } from "../touch/fugue.ts";
import { PIECE_SOUND } from "../touch/piece-sound.ts";
import { presetById } from "../touch/sound.ts";
import { Emblem } from "./FuguePicker.tsx";
import { keyLabel } from "./emblem.ts";
import { BEFORE_JUDGING, CHORALE_IDS, liteAll, liteExtra, liteLevel, liteTabOf, liteTabs, MORE_SECTIONS, startHere, type LiteTab } from "./lite.ts";
import { popTitle } from "./PlayPop.tsx";
import { keyTint } from "../touch/MusicBox.tsx";

/** D265: a sound's name as the list shows it. */
export const soundName = (id: string): string => presetById(id).name.replace(/ \(SAMPLED\)$/, "");

/** D276: the book tab shown, kept on the device (D340: and the MORE BACH and CHORALES tabs). */
const TAB_KEY = "tb-lite-book-v1";
function storedTab(): LiteTab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return liteTabs().some(([t]) => t === v) ? (v as LiteTab) : "I";
  } catch {
    return "I";
  }
}

/**
 * D340: the editions the MORE BACH and CHORALES tabs are made from, as their licences ask (CC BY-SA 3.0
 * for Inventions 1, 6, 9 and 12; CC BY-NC-SA 4.0 for the chorales: credit, and the note data derived
 * from them under the same licence). Each piece's own line is on its pop-up.
 */
export const MORE_CREDITS: readonly string[] = [
  "SCORES: THE MUTOPIA PROJECT (MUTOPIAPROJECT.ORG). THE ART OF FUGUE, THE RICERCARS: ARNAUD GOSSART (CONTRAPUNCTUS 1: PIERRE-LUC GAUTHIER), FROM BREITKOPF & HÄRTEL 1885, PUBLIC DOMAIN.",
  "INVENTIONS 1, 6, 9, 12: JEFF COVEY, FROM THE BACH-GESELLSCHAFT EDITION, CC BY-SA 3.0 (CREATIVECOMMONS.ORG/LICENSES/BY-SA/3.0); THE GAME'S NOTE DATA FOR THEM IS SHARED UNDER THE SAME LICENCE. INVENTIONS 2-5, 7, 8, 10, 11, 13-15: ALLEN GARVIN, PUBLIC DOMAIN. SINFONIAS: OLIVIER VERMERSCH, PUBLIC DOMAIN.",
  "CONCERTO FOR TWO VIOLINS, BWV 1043: DAVID CHAN, FROM THE BACH-GESELLSCHAFT EDITION (1874), PUBLIC DOMAIN.",
  // D341.
  "MOTET BWV 228, FÜRCHTE DICH NICHT: FRITZ BRODERSEN, WIMA EDITION (IMSLP.ORG), CC BY-NC 3.0 (CREATIVECOMMONS.ORG/LICENSES/BY-NC/3.0), FOR NON-COMMERCIAL USE.",
  "CANTATA BWV 54, WIDERSTEHE DOCH DER SÜNDE: RAMON CASADESUS-MASANELL (IMSLP.ORG, 2021), CC BY-NC-SA 4.0 (CREATIVECOMMONS.ORG/LICENSES/BY-NC-SA/4.0); THE GAME'S NOTE DATA FOR IT IS SHARED UNDER THE SAME LICENCE, FOR NON-COMMERCIAL USE.",
];
export const CHORALE_CREDITS: readonly string[] = [
  "THE 370 CHORALES: CRAIG STUART SAPP, BACH-370-CHORALES (GITHUB.COM/CRAIGSAPP/BACH-370-CHORALES), AFTER DÖRFFEL'S EDITION (BREITKOPF & HÄRTEL, C. 1875), CC BY-NC-SA 4.0 (CREATIVECOMMONS.ORG/LICENSES/BY-NC-SA/4.0). THE GAME'S NOTE DATA FOR THEM (FERMATAS HELD A BEAT) IS SHARED UNDER THE SAME LICENCE, FOR NON-COMMERCIAL USE.",
];

/** D308: a best grade's colour on its card (as the result's: S and A in gold, then down to red). */
export const GRADE_INK: Record<string, string> = { S: "#ffd23f", A: "#f3c246", B: "#5fdc6a", C: "#7fd6e8", D: "#ec5a4a" };

/** D343: a gear drawn in pixels (the font has none; the ⚙ glyph fell back to the system's). */
const GEAR = ["....X....", ".X.XXX.X.", "..XXXXX..", ".XXX.XXX.", "XXX...XXX", ".XXX.XXX.", "..XXXXX..", ".X.XXX.X.", "....X...."];
export function PixelGear({ size = 18 }: { size?: number }) {
  return (
    <svg className="tb-gear" width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
      {GEAR.flatMap((row, y) => [...row].map((c, x) => (c === "X" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}

/** D343: the language, on the first screen: a short code each, its own name as the label (the full names in ⚙ SETTINGS). */
export const LANG_CODES: Record<Lang, string> = { en: "EN", pt: "PT", es: "ES" };
export function LangPick({ value, set }: { value: Lang; set: (l: Lang) => void }) {
  return (
    <div className="tb-lang-pick" role="group" aria-label="Language · Idioma">
      {LANGS.map(([l, name]) => (
        <button key={l} type="button" id={`head-lang-${l}`} className={l === value ? "on" : ""} aria-pressed={l === value} aria-label={name} title={name} onClick={() => set(l)}>
          {LANG_CODES[l]}
        </button>
      ))}
    </div>
  );
}

export function LiteGrid({ beaten, best = {}, scores = {}, bestOld = {}, scoresOld = {}, open, settings, fuguesOnly = false, tutorial, hear, book: asked, current, beside, setLang }: { beaten: readonly string[]; best?: Readonly<Record<string, string>>; scores?: Readonly<Record<string, number>>; bestOld?: Readonly<Record<string, string>>; scoresOld?: Readonly<Record<string, number>>; open: (id: string) => void; hear?: (id: string) => void; book?: LiteTab; settings: () => void; fuguesOnly?: boolean; tutorial?: { done: number; of: number; start: () => void }; current?: string; beside?: ReactNode; setLang?: (l: Lang) => void }) {
  const won = useMemo(() => new Set(beaten), [beaten]);
  // D263: on a phone the fugues only. D264: all open, each in its difficulty's colour. D265: a list from
  // the first to the last, numbered, the card on the left and what the piece is on the right (its voices,
  // its difficulty, its sound).
  // D270: THE TUTORIAL first (a phone's), START HERE until it is passed.
  const learning = !!tutorial && tutorial.done < tutorial.of;
  // D276: Book I and Book II in two tabs at the top (the tutorial on Book I's).
  // D295: back from a piece, the list opens on it (its book's tab, the card in view), not at the top.
  // D343: the tabs shown (Book I alone for the friends: no tab bar at all; all four once unlocked).
  const tabs = liteTabs();
  const shown = (t: LiteTab) => tabs.some(([x]) => x === t);
  const last = current && (liteAll(fuguesOnly).includes(current) || liteExtra(current)) && shown(liteTabOf(current)) ? current : null;
  const [tab, setTab] = useState<LiteTab>(() => (asked && shown(asked) ? asked : last ? liteTabOf(last) : storedTab()));
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!last) return;
    const card = document.getElementById(`card-${last}`);
    const box = list.current;
    if (card && box) box.scrollTop = Math.max(0, card.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight / 2 + card.clientHeight / 2);
  }, []);
  const pick = (t: LiteTab) => {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* this visit only */
    }
  };
  const start = learning ? null : startHere(fuguesOnly);
  // D343: the MORE BACH and CHORALES notes come only when one of their tabs is open (a chunk of their own).
  const extra = tab === "MORE" || tab === "CHORALES";
  const [, loaded] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!extra || extrasLoaded()) return;
    setFailed(false);
    loadExtras().then(
      () => loaded((n) => n + 1),
      () => setFailed(true),
    );
  }, [extra]);
  const waiting = extra && !extrasLoaded();
  return (
    <div className="tb-lite" role="main" aria-label="Pieces" ref={list}>
      <header className="tb-lite-head">
        <h1>{tr("THE WELL-TEMPERED GAME")}</h1>
        {/* D343: the language at hand (EN · PT · ES), then SETTINGS, labelled. D326: TOOLS (once unlocked) before them. */}
        {beside}
        {setLang && <LangPick value={lang()} set={setLang} />}
        <button type="button" id="lite-settings" className="tb-settings-btn" aria-label={tr("SETTINGS")} onClick={settings}>
          <PixelGear />
          <span>{tr("SETTINGS")}</span>
        </button>
      </header>
      {tabs.length > 1 ? (
        <div className="tb-lite-tabs" role="tablist" aria-label="Books">
          {tabs.map(([t, label]) => (
            <button key={t} type="button" role="tab" id={`tab-book-${t}`} aria-selected={tab === t} className={`tb-lite-tab${tab === t ? " on" : ""}`} onClick={() => pick(t)}>
              {t === "I" || t === "II" ? `${tr("BOOK")} ${t}` : tr(label)}
            </button>
          ))}
        </div>
      ) : null}
      {waiting && (
        <p className="tb-lite-line" id="extras-loading" role="status">
          {failed ? "COULD NOT LOAD · CHECK THE CONNECTION AND OPEN THE TAB AGAIN" : "LOADING…"}
        </p>
      )}
      {tab === "MORE" && !waiting && (
        // D340: MORE BACH, in sections; each card as Book I's (the picture, the name, the voices, the level, the sound).
        <>
          {MORE_SECTIONS.map((s) => (
            <section key={s.id} className="tb-lite-section" aria-label={s.title}>
              <h2 className="tb-lite-book" id={`section-${s.id}`}>
                {tr(s.title)}
              </h2>
              <ol className="tb-lite-list">
                {s.ids.map((id, i) => (
                  <ExtraCard key={id} id={id} n={i + 1} done={won.has(id)} grade={best[id]} score={scores[id]} open={open} hear={hear} />
                ))}
              </ol>
            </section>
          ))}
          <Credits lines={MORE_CREDITS} />
        </>
      )}
      {tab === "CHORALES" && !waiting && (
        // D340: the 370 chorales, compact (no picture: a chip in the key's colour), in Sapp's (Breitkopf's) numbering.
        <>
          <p className="tb-lite-line tb-lite-chorale-note">{tr("ANY VOICE · THE BAND WAITS FOR YOU AFTER EACH FERMATA")}</p>
          <ol className="tb-lite-list tb-lite-chorales">
            {CHORALE_IDS.map((id) => (
              <ExtraCard key={id} id={id} n={fugueById(id).number} done={won.has(id)} grade={best[id]} score={scores[id]} open={open} compact />
            ))}
          </ol>
          <Credits lines={CHORALE_CREDITS} />
        </>
      )}
      {(tab === "I" || tab === "II") && (
      <ol className="tb-lite-list">
        {tutorial && tab === "I" && (
          <li key="tutorial">
            <button type="button" id="card-tutorial" className={`tb-lite-card tb-lite-tutorial${learning ? " tb-lite-here" : " done"}`} style={{ ["--tint" as string]: "#7fd6e8" }} onClick={tutorial.start}>
              <span className="tb-lite-pic-wrap">
                <span className="tb-lite-pic tb-lite-tutorial-pic" aria-hidden="true">
                  <span>♪</span>
                  {/* D343: what to tap first, said on the picture itself. */}
                  {learning && <span className="tb-lite-go">▶ {tr("BEGIN")}</span>}
                </span>
                {!learning && <span className="tb-lite-done">✓</span>}
              </span>
              <span className="tb-lite-info">
                {learning && <span className="tb-lite-start">{tr("START HERE")}</span>}
                <span className="tb-lite-title">{tr("TUTORIAL")}</span>
                <span className="tb-lite-meta">{tr("LEARN TO PLAY WITH TWO THUMBS")}</span>
                <span className="tb-lite-level" style={{ color: "#7fd6e8" }}>
                  {tutorial.done ? tr("{n} OF {m} LESSONS", { n: tutorial.done, m: tutorial.of }) : tr("{m} LESSONS", { m: tutorial.of })}
                </span>
                <span className="tb-lite-meta">{tr("WITH HERR BACH")}</span>
              </span>
            </button>
          </li>
        )}
        {tabs.length === 1 && (
          // D343: one book, so no tab bar: a plain heading between the tutorial and the pieces.
          <li key="head" className="tb-lite-list-head">
            <h2 className="tb-lite-book" id="lite-book-head">
              {tr("BOOK")} I · {fuguesOnly ? tr("{n} FUGUES", { n: 24 }) : tr("{n} PIECES", { n: 48 })}
            </h2>
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
          const en = title.includes(" · ") ? title.split(" · ")[1] : title;
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
                  ) : bestOld[id] ? (
                    // D337: a grade from before 1.52 (another judging), dimmed, until today's judging gives one.
                    <span className="tb-lite-grade tb-lite-old" id={`grade-${id}`} style={{ ["--grade" as string]: GRADE_INK[bestOld[id]] ?? "var(--tg-shine)" }} aria-label={`${tr("BEST GRADE {g}", { g: bestOld[id] })} · ${tr(BEFORE_JUDGING)}`} title={tr(BEFORE_JUDGING)}>
                      {bestOld[id]}
                    </span>
                  ) : (
                    done && <span className="tb-lite-done">✓</span>
                  )}
                </span>
                <span className="tb-lite-info">
                  {here && <span className="tb-lite-start">{tr("START HERE")}</span>}
                  <span className="tb-lite-title">{name}</span>
                  {/* D343: the level and the voices only (the BWV number and the sound's name were clutter for a newcomer). */}
                  <span className="tb-lite-level" style={{ color: lv.ink }}>
                    {tr(lv.label)}
                  </span>
                  <span className="tb-lite-meta">{tr("{n} VOICES", { n: f.voices.length })}</span>
                  {/* D308: the best score (a whole piece finished). */}
                  {scores[id] !== undefined && (
                    <span className="tb-lite-best" id={`best-${id}`}>
                      {tr("BEST {n}", { n: scores[id].toLocaleString("en") })}
                    </span>
                  )}
                  {/* D337: the best from before 1.52 (another judging), apart. */}
                  {scoresOld[id] !== undefined && (
                    <span className="tb-lite-best tb-lite-old" id={`best-old-${id}`}>
                      {tr("BEST {n} · BEFORE 1.52", { n: scoresOld[id].toLocaleString("en") })}
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
      )}
    </div>
  );
}

/** D340: a MORE BACH or CHORALES card: as Book I's, or (a chorale) compact, a chip in the key's colour for the picture. */
function ExtraCard({ id, n, done, grade, score, open, hear, compact = false }: { id: string; n: number; done: boolean; grade?: string; score?: number; open: (id: string) => void; hear?: (id: string) => void; compact?: boolean }) {
  const f = fugueById(id);
  const lv = liteLevel(id);
  // The unfinished fugue (pieces.json, D169) has a card of its own: its formal title.
  const name = f.short ?? popTitle(id).split(" · ").at(-1) ?? f.title.toUpperCase();
  const sub = !f.short ? "FUGA A 3 SOGGETTI · UNFINISHED" : f.title.toUpperCase() !== f.short ? f.title.toUpperCase() : "DIE KUNST DER FUGE";
  const stamp = grade ? (
    <span className="tb-lite-grade" id={`grade-${id}`} style={{ ["--grade" as string]: GRADE_INK[grade] ?? "var(--tg-shine)" }} aria-label={tr("BEST GRADE {g}", { g: grade })}>
      {grade}
    </span>
  ) : (
    done && <span className="tb-lite-done">✓</span>
  );
  return (
    <li>
      <button type="button" id={`card-${id}`} className={`tb-lite-card${done ? " done" : ""}${compact ? " tb-lite-compact" : ""}`} style={{ ["--tint" as string]: lv.ink }} onClick={() => open(id)}>
        <span className="tb-lite-pic-wrap">
          {compact ? <span className="tb-lite-chip" style={{ background: keyTint(f.key, 30) }} aria-hidden="true" /> : <Emblem id={id} label={keyLabel(f.key, "fugue")} className="tb-lite-pic" />}
          <span className="tb-lite-num">{n}</span>
          {stamp}
        </span>
        <span className="tb-lite-info">
          <span className="tb-lite-title">{name}</span>
          <span className="tb-lite-meta">{sub}</span>
          <span className="tb-lite-meta">
            BWV {f.bwv.split("/")[0] || "—"} · {keyLabel(f.key, "fugue").split(" · ")[0]} · {f.collection === "concerto" ? tr("{n} SOLO PARTS", { n: f.playable?.length ?? 2 }) : tr("{n} VOICES", { n: f.playable?.length ?? f.voices.length })}
          </span>
          <span className="tb-lite-level" style={{ color: lv.ink }}>
            {tr(lv.label)}
          </span>
          {!compact && <span className="tb-lite-meta">{tr("SOUND")}: {tr(soundName(PIECE_SOUND[id] ?? "harpsichordSampled"))}</span>}
          {score !== undefined && (
            <span className="tb-lite-best" id={`best-${id}`}>
              {tr("BEST {n}", { n: score.toLocaleString("en") })}
            </span>
          )}
        </span>
      </button>
      {hear && f.entries.length > 0 && (
        <button type="button" id={`hear-${id}`} className="tb-hear-btn" onClick={() => hear(id)}>
          ♪ {tr("HEAR THE SUBJECT")}
        </button>
      )}
    </li>
  );
}

/** D340: the editions' credits under a tab, as their licences ask. */
function Credits({ lines }: { lines: readonly string[] }) {
  return (
    <section className="tb-lite-credits" id="lite-credits" aria-label="Sources and credits">
      <h2 className="tb-lite-book">{tr("SOURCES & CREDITS")}</h2>
      {lines.map((l) => (
        <p key={l} className="tb-lite-meta">
          {l}
        </p>
      ))}
    </section>
  );
}
