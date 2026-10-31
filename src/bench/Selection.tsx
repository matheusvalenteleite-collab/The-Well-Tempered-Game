/**
 * D371 (Mario and Luigi's report, 2, option B): play.html's selection screen on a phone held sideways,
 * laid out as the play screen is (the hands already know it): three columns, 20% · 60% · 20%. LEFT, learn
 * and browse: the wordmark (wordmark.ts) and the version, the big TUTORIAL button (Herr Bach, the lessons
 * done, BEGIN or CONTINUE) and the collections play.html shows (Book I alone for the friends; all four
 * once unlocked). CENTRE: Book I's 24 fugues at once, 6 × 4 in Bach's order (C, c, C♯, c♯ …), no
 * scrolling, each tile its picture (emblem.ts, for now), number and key, level, grade or ✓, and D's NEXT
 * ribbon on the piece to play next (lite.ts liteSuggested); MORE BACH and CHORALES keep their scrolling
 * lists (LiteGrid, bare). RIGHT, do: SETTINGS and the language, the chosen piece (its picture, name,
 * level, voices, best), the voice to play, HEAR THE SUBJECT, OPTIONS (the pop-up: drums, tempo, how to
 * play) and a big ▶ PLAY under the right thumb. The first visit (nothing played, no lesson done): the
 * TUTORIAL glows, the grid is dimmed but works, and the right column says in one sentence where to start.
 */
import { useState, type ReactNode } from "react";
import { lang, partName, pieceName, tr, type Lang } from "../i18n/index.ts";
import { fugueById } from "../touch/fugue.ts";
import { fugueName } from "../touch/fugue-names.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { Portrait } from "./Bach.tsx";
import { Emblem } from "./FuguePicker.tsx";
import { keyLabel } from "./emblem.ts";
import { versionLine, Wordmark } from "./Intro.tsx";
import { GRADE_INK, LangPick, LiteGrid, PixelGear, storedTab, storeTab } from "./LiteGrid.tsx";
import { popTitle } from "./PlayPop.tsx";
import { BEFORE_JUDGING, liteAll, liteFirstVisit, liteLevel, liteSuggested, liteTabs, liteTabOf, type LiteTab } from "./lite.ts";

/** A piece named as the list names it (D283: in the language chosen; no BWV, D343). */
export function pieceTitle(id: string): string {
  const f = fugueById(id);
  if (/^wtc[12][fp]\d\d$/.test(id)) return lang() === "en" ? (popTitle(id).split(" · ").at(-1) ?? "") : pieceName(f.kind, f.key);
  return f.short ?? popTitle(id).split(" · ").at(-1) ?? f.title.toUpperCase();
}

/** The grid's pieces for a book tab (on a phone the fugues only). */
export const gridIds = (tab: LiteTab): string[] => liteAll(true).filter((id) => (id.startsWith("wtc2") ? "II" : "I") === tab);

export interface SelectionProps {
  /** The piece chosen (BenchApp's pick), its voice and the voices that may be taken. */
  piece: string;
  voice: number;
  singing: readonly number[];
  setVoice: (v: number) => void;
  select: (id: string) => void;
  play: () => void;
  /** The pop-up (DRUMS, TEMPO, HOW TO PLAY, the credits). */
  options: () => void;
  /** A MORE BACH or CHORALES card: the pop-up straight away, as before. */
  open: (id: string) => void;
  hear?: (id: string) => void;
  beaten: readonly string[];
  best?: Readonly<Record<string, string>>;
  scores?: Readonly<Record<string, number>>;
  bestOld?: Readonly<Record<string, string>>;
  scoresOld?: Readonly<Record<string, number>>;
  soundOf?: (id: string) => string;
  settings: () => void;
  setLang?: (l: Lang) => void;
  tutorial?: { done: number; of: number; start: () => void };
  /** TOOLS, once unlocked. */
  beside?: ReactNode;
  /** The piece last opened this visit (D295): back from it, it stays chosen. */
  current?: string;
  /** A line under the piece (the headphone delay in force, D260). */
  note?: ReactNode;
  /** D382: Book II just earned: the note is shown; called once it is seen (tapped, or BOOK II opened). */
  bookTwo?: () => void;
}

export function Selection(p: SelectionProps) {
  const { piece, beaten, best = {}, scores = {}, bestOld = {}, scoresOld = {}, tutorial } = p;
  const tabs = liteTabs();
  const shown = (t: LiteTab) => tabs.some(([x]) => x === t);
  const [tab, setTab] = useState<LiteTab>(() => (shown(liteTabOf(piece)) && (liteTabOf(piece) === "I" || liteTabOf(piece) === "II") ? liteTabOf(piece) : storedTab()));
  const pick = (t: LiteTab) => (setTab(t), storeTab(t), t === "II" && p.bookTwo?.());
  const won = new Set(beaten);
  const first = !!tutorial && liteFirstVisit(beaten, tutorial.done);
  // The first visit: the right column says where to start until a tile is tapped.
  const [chosen, setChosen] = useState(!first || !!p.current);
  const grid = tab === "I" || tab === "II";
  const ids = grid ? gridIds(tab) : [];
  const next = grid ? liteSuggested(ids, won, first) : null;
  const choose = (id: string) => (setChosen(true), p.select(id));
  const learning = !!tutorial && tutorial.done < tutorial.of;
  return (
    <div className={`tb-sel${first ? " tb-sel-first" : ""}`} id="selection" role="main" aria-label="Pieces">
      <aside className="sel-col sel-left" id="sel-left">
        <div className="sel-brand">
          <h1 className="sel-title">
            <Wordmark big={12} scale={1} className="sel-mark sel-mark-wide" />
            <Wordmark big={10} scale={1} className="sel-mark sel-mark-narrow" />
          </h1>
          <p className="sel-version" id="sel-version">
            {versionLine()}
          </p>
        </div>
        {tutorial && (
          <button type="button" id="card-tutorial" className={`sel-tutorial${first ? " sel-glow" : ""}`} onClick={tutorial.start}>
            <span className="sel-tut-head">
              <span className="sel-tut-face" aria-hidden="true">
                <Portrait talking={false} />
              </span>
              <span className="sel-tut-words">
                <span className="sel-tut-title">{tr("TUTORIAL")}</span>
                <span className="sel-tut-sub">{tr("LEARN TO PLAY WITH HERR BACH")}</span>
              </span>
            </span>
            <span className="sel-tut-bar" aria-hidden="true">
              <i style={{ width: `${Math.round((100 * tutorial.done) / Math.max(1, tutorial.of))}%` }} />
            </span>
            <span className="sel-tut-line">{first ? tr("NEW HERE? START HERE") : tr("{n} OF {m} LESSONS", { n: tutorial.done, m: tutorial.of })}</span>
            <span className="sel-tut-go">▶ {tutorial.done === 0 ? tr("BEGIN") : learning ? tr("CONTINUE") : tr("AGAIN")}</span>
          </button>
        )}
        <nav className="sel-tabs" aria-label={tr("COLLECTIONS")}>
          <p className="sel-tabs-head">{tr("COLLECTIONS")}</p>
          <div role="tablist">
            {tabs.map(([t, label]) => (
              <button key={t} type="button" role="tab" id={`tab-book-${t}`} aria-selected={tab === t} className={`sel-tab${tab === t ? " on" : ""}`} onClick={() => pick(t)}>
                {t === "I" || t === "II" ? `${tr("BOOK")} ${t}${tabs.length === 1 ? ` · ${tr("{n} FUGUES", { n: 24 })}` : ""}` : tr(label)}
              </button>
            ))}
          </div>
        </nav>
      </aside>
      <section className="sel-col sel-centre" id="sel-centre" aria-label={tr("BOOK")}>
        {p.bookTwo && (
          // D382: Book II opened by finishing every Book I fugue: a short celebration; a tap opens it.
          <button type="button" id="book2-news" className="sel-news" onClick={() => pick("II")}>
            <span className="sel-news-title">★ {tr("BOOK II UNLOCKED!")} ★</span>
            <span className="sel-news-line">{tr("You finished all 24 fugues of Book I. 24 more await.")}</span>
            <span className="sel-news-go">▶ {tr("OPEN BOOK II")}</span>
          </button>
        )}
        {grid ? (
          <>
            <header className="sel-strip">
              <h2 className="sel-strip-title" id="lite-book-head">
                {tr("BOOK")} {tab} · {tr("{n} FUGUES", { n: ids.length })}
              </h2>
              <span className="sel-strip-order">{tr("MAJOR · MINOR, BY KEY")}</span>
            </header>
            <ol className="sel-grid" id="sel-grid">
              {ids.map((id) => (
                <Tile key={id} id={id} on={chosen && id === piece} done={won.has(id)} next={id === next} grade={best[id]} old={bestOld[id]} pick={choose} />
              ))}
            </ol>
          </>
        ) : (
          <LiteGrid key={tab} bare book={tab} soundOf={p.soundOf} beaten={beaten} best={best} scores={scores} bestOld={bestOld} scoresOld={scoresOld} open={p.open} hear={p.hear} settings={p.settings} fuguesOnly />
        )}
      </section>
      <aside className="sel-col sel-right" id="sel-right">
        <div className="sel-top">
          {p.setLang && <LangPick value={lang()} set={p.setLang} />}
          <div className="sel-top-row">
            {p.beside}
            <button type="button" id="lite-settings" className="tb-settings-btn sel-settings" aria-label={tr("SETTINGS")} onClick={p.settings}>
              <PixelGear size={12} />
              <span>{tr("SETTINGS")}</span>
            </button>
          </div>
        </div>
        {chosen ? (
          <Chosen {...p} scores={scores} scoresOld={scoresOld} best={best} bestOld={bestOld} />
        ) : (
          <p className="sel-hint" id="sel-hint">
            {tr("Pick a fugue in the middle, or learn first with the TUTORIAL on the left.")}
          </p>
        )}
        {chosen && p.note}
        {chosen && (
          <button type="button" id="sel-play" className="tb-play sel-play" onClick={p.play}>
            ▶ {tr("PLAY")}
          </button>
        )}
      </aside>
    </div>
  );
}

/** A tile of the grid: the picture, its number and key, its level; the best grade (or ✓); NEXT. */
function Tile({ id, on, done, next, grade, old, pick }: { id: string; on: boolean; done: boolean; next: boolean; grade?: string; old?: string; pick: (id: string) => void }) {
  const f = fugueById(id);
  const lv = liteLevel(id);
  const n = Number(id.slice(-2));
  const key = keyLabel(f.key, "fugue").split(" · ")[0];
  const nick = fugueName(id, lang(), "short");
  const full = fugueName(id, lang());
  const name = full ? `${full} · ${pieceTitle(id)}` : pieceTitle(id);
  return (
    <li>
      <button type="button" id={`tile-${id}`} className={`sel-tile${on ? " on" : ""}${done ? " done" : ""}${next ? " next" : ""}`} style={{ ["--tint" as string]: lv.ink }} aria-pressed={on} aria-label={name} onClick={() => pick(id)}>
        <span className="sel-pic">
          <Emblem id={id} className="sel-emblem" />
          {grade ? (
            <span className="sel-grade" id={`grade-${id}`} style={{ ["--grade" as string]: GRADE_INK[grade] ?? "var(--tg-shine)" }} aria-label={tr("BEST GRADE {g}", { g: grade })}>
              {grade}
            </span>
          ) : old ? (
            <span className="sel-grade sel-old" id={`grade-${id}`} style={{ ["--grade" as string]: GRADE_INK[old] ?? "var(--tg-shine)" }} title={tr(BEFORE_JUDGING)} aria-label={`${tr("BEST GRADE {g}", { g: old })} · ${tr(BEFORE_JUDGING)}`}>
              {old}
            </span>
          ) : (
            done && <span className="sel-done">✓</span>
          )}
          {next && (
            <span className="sel-next" id={`next-${id}`}>
              {tr("NEXT")}
            </span>
          )}
        </span>
        <span className="sel-tile-key">
          <b>{n}</b> {key}
        </span>
        {nick && (
          <span className="sel-tile-name" id={`name-${id}`}>
            {nick}
          </span>
        )}
        <span className="sel-tile-level" style={{ color: lv.ink }}>
          {tr(lv.label)}
        </span>
      </button>
    </li>
  );
}

/** The right column's piece: its picture, name, book and number, level, voices; its best; the voice to play. */
function Chosen({ piece, voice, singing, setVoice, hear, options, best, scores, bestOld, scoresOld }: SelectionProps & { best: Readonly<Record<string, string>>; scores: Readonly<Record<string, number>>; bestOld: Readonly<Record<string, string>>; scoresOld: Readonly<Record<string, number>> }) {
  const f = fugueById(piece);
  const lv = liteLevel(piece);
  const wtc = /^wtc[12][fp]\d\d$/.test(piece);
  const name = pieceTitle(piece);
  const nick = fugueName(piece, lang());
  const where = wtc ? `${tr("BOOK")} ${piece[3] === "1" ? "I" : "II"} · ${Number(piece.slice(-2))}` : "";
  const grade = best[piece] ?? bestOld[piece];
  return (
    <div className="sel-piece" id="sel-piece">
      <span className="sel-piece-pic">
        <Emblem id={piece} label={keyLabel(f.key, f.kind === "prelude" ? "prelude" : "fugue")} className="sel-piece-emblem" />
        {grade && (
          <span className={`sel-grade${best[piece] ? "" : " sel-old"}`} style={{ ["--grade" as string]: GRADE_INK[grade] ?? "var(--tg-shine)" }}>
            {grade}
          </span>
        )}
      </span>
      {nick && (
        <p className="sel-piece-nick" id="sel-piece-nick">
          {nick}
        </p>
      )}
      <p className="sel-piece-name" id="sel-piece-name">
        {name}
      </p>
      <p className="sel-piece-meta">
        {where && <>{where} · </>}
        <span style={{ color: lv.ink }}>{tr(lv.label)}</span> · {tr("{n} VOICES", { n: f.voices.length })}
      </p>
      {scores[piece] !== undefined && (
        <p className="sel-best" id={`best-${piece}`}>
          {tr("BEST {n}", { n: scores[piece].toLocaleString("en") })}
        </p>
      )}
      {scores[piece] === undefined && scoresOld[piece] !== undefined && (
        <p className="sel-best sel-old" id={`best-old-${piece}`}>
          {tr("BEST {n} · BEFORE 1.52", { n: scoresOld[piece].toLocaleString("en") })}
        </p>
      )}
      {f.kind !== "prelude" && (
        <>
          <p className="sel-ask">{tr("YOUR VOICE")}</p>
          <div className="sel-voices" role="group" aria-label="Voice">
            {f.voiceNames.map((vn, i) => {
              const ink = inkOf(i, f.voices.length);
              const on = i === voice;
              return (
                <button key={vn} type="button" id={`sel-voice-${i}`} className={on ? "on" : ""} style={{ color: on ? "#14101a" : ink, background: on ? ink : undefined, borderColor: ink }} disabled={!singing.includes(i)} aria-pressed={on} onClick={() => setVoice(i)}>
                  {partName(f.kind, vn)}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="sel-links">
        {hear && f.kind === "fugue" && (
          <button type="button" id={`hear-${piece}`} className="sel-link" onClick={() => hear(piece)}>
            ♪ {tr("HEAR THE SUBJECT")}
          </button>
        )}
        <button type="button" id="sel-options" className="sel-link" onClick={options}>
          ? {tr("HOW TO PLAY")} · {tr("OPTIONS")}
        </button>
      </div>
    </div>
  );
}

