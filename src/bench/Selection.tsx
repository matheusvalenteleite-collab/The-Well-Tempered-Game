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
import { FugueAbout } from "./FugueAbout.tsx";
import { lang, partName, pieceName, tr, type Lang } from "../i18n/index.ts";
import { fugueById } from "../touch/fugue.ts";
import { fugueName } from "../touch/fugue-names.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { Portrait } from "./Bach.tsx";
import { Emblem } from "./FuguePicker.tsx";
import { versionLine, Wordmark } from "./Intro.tsx";
import { GRADE_INK, LangPick, LiteGrid, PixelGear, storedTab, storeTab } from "./LiteGrid.tsx";
import { popTitle } from "./PlayPop.tsx";
import { soundOptions } from "./SoundSelect.tsx";
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
  /** Design studio (D463): the chosen piece's TEMPO, one button cycling SLOW · DEFAULT · FAST; `locked` until an A opens it (D356). */
  tempo?: { word: string; beat: string; locked: boolean; cycle: () => void };
  /** Design studio (D463): the chosen piece's SOUND, a native list (the system's wheel on a phone). */
  sound?: { locked?: boolean; value: string; name: string; sounds: readonly (readonly [id: string, name: string])[]; own?: string; set: (id: string) => void };
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
            {tabs.map(([t, label]) => {
              // Design studio (D463): each book its share finished, "BOOK I  42%", a bar under it.
              const pct = t === "I" || t === "II" ? Math.round((100 * gridIds(t).filter((id) => won.has(id)).length) / Math.max(1, gridIds(t).length)) : null;
              return (
                <button key={t} type="button" role="tab" id={`tab-book-${t}`} aria-selected={tab === t} className={`sel-tab${tab === t ? " on" : ""}`} onClick={() => pick(t)}>
                  <span className="sel-tab-name">{t === "I" || t === "II" ? `${tr("BOOK")} ${t}` : tr(label)}</span>
                  {pct !== null && (
                    <span className="sel-tab-pct" id={`pct-book-${t}`}>
                      {pct}%
                    </span>
                  )}
                  {pct !== null && (
                    <span className="sel-tab-bar" aria-hidden="true">
                      <i style={{ width: `${pct}%` }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
        {/* Design studio (D463): the language, SETTINGS and TOOLS on the left (browse and set up); the right column is the piece's. */}
        <div className="sel-left-foot">
          {p.setLang && <LangPick value={lang()} set={p.setLang} />}
          <div className="sel-top-row">
            {p.beside}
            <button type="button" id="lite-settings" className="tb-settings-btn sel-settings" aria-label={tr("SETTINGS")} onClick={p.settings}>
              <PixelGear size={12} />
              <span>{tr("SETTINGS")}</span>
            </button>
          </div>
        </div>
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

/** A key ("c#", "Eb") in words: the tonic in capitals ("C♯", "E♭") and the mode, MAJOR or MINOR (translated). */
export function keyWords(key: string): { tonic: string; mode: string } {
  const tonic = key[0].toUpperCase() + key.slice(1).replace("#", "♯").replace("b", "♭");
  return { tonic, mode: tr(key[0] === key[0].toLowerCase() ? "MINOR" : "MAJOR") };
}

/** A tile of the grid: the picture, its number and key, its level; the best grade (or ✓); NEXT. */
function Tile({ id, on, done, next, grade, old, pick }: { id: string; on: boolean; done: boolean; next: boolean; grade?: string; old?: string; pick: (id: string) => void }) {
  const f = fugueById(id);
  const lv = liteLevel(id);
  const n = Number(id.slice(-2));
  // Design studio: the key in words, "C♯ major" / "C♯ minor", not the upper/lower-case convention.
  const key = keyWords(f.key);
  // Design studio (D463): the whole name on the tile, its article back ("THE IMP"), on up to two lines.
  const full = fugueName(id, lang());
  const nick = full;
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
        {/* Design studio (D463): the words in a block of their own, never squeezed: the picture gives way, not the lines. */}
        <span className="sel-tile-words">
          <span className="sel-tile-key">
            <b>{n}</b> {key.tonic} <i>{key.mode}</i>
          </span>
          {nick && (
            <span className={`sel-tile-name${nick.length > 17 ? " long" : ""}`} id={`name-${id}`}>
              {nick}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

/** The right column's piece: its picture (? opens ABOUT THIS FUGUE), name, one line of book · number · level ·
 * voices, its best (D463: no secrets for now), the voice to play, TEMPO and SOUND, HEAR THE SUBJECT (design studio, D463). */
function Chosen({ piece, voice, singing, setVoice, hear, options, best, scores, bestOld, scoresOld, tempo, sound }: SelectionProps & { best: Readonly<Record<string, string>>; scores: Readonly<Record<string, number>>; bestOld: Readonly<Record<string, string>>; scoresOld: Readonly<Record<string, number>> }) {
  const f = fugueById(piece);
  const lv = liteLevel(piece);
  const wtc = /^wtc[12][fp]\d\d$/.test(piece);
  const name = pieceTitle(piece);
  const nick = fugueName(piece, lang());
  const grade = best[piece] ?? bestOld[piece];
  const [about, setAbout] = useState(false);
  const score = scores[piece] ?? scoresOld[piece];
  return (
    <div className="sel-piece" id="sel-piece">
      <span className="sel-piece-pic">
        <Emblem id={piece} className="sel-piece-emblem" />
        {grade && (
          <span className={`sel-grade${best[piece] ? "" : " sel-old"}`} style={{ ["--grade" as string]: GRADE_INK[grade] ?? "var(--tg-shine)" }}>
            {grade}
          </span>
        )}
        {f.kind === "fugue" && wtc && (
          <button type="button" id="sel-about" className="sel-about" aria-label={tr("ABOUT THIS FUGUE")} onClick={() => setAbout(true)}>
            ?
          </button>
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
      <p className="sel-piece-meta" id="sel-piece-meta">
        {wtc && (
          <>
            <span className="sel-book-word">{tr("BOOK")} </span>
            {piece[3] === "1" ? "I" : "II"} · {Number(piece.slice(-2))} ·{" "}
          </>
        )}
        <span style={{ color: lv.ink }}>{tr(lv.label)}</span> ·{" "}
        {/* D463: the voices as dots in their inks (the buttons below in the same colours), so the line fits on one line. */}
        <span className="sel-piece-dots" aria-label={tr("{n} VOICES", { n: f.voices.length })}>
          {f.voiceNames.map((vn, i) => (
            <i key={vn} style={{ background: inkOf(i, f.voices.length) }} />
          ))}
        </span>
      </p>
      <p className="sel-best-row">
        <span className={`sel-best${scores[piece] === undefined ? " sel-old" : ""}`} id={`best-${piece}`}>
          {score !== undefined ? tr("BEST {n}", { n: score.toLocaleString("en") }) : tr("BEST —")}
        </span>
      </p>
      {f.kind !== "prelude" && (
        <>
          <p className="sel-ask">{tr("YOUR VOICE")}</p>
          <div className="sel-voices" data-n={f.voiceNames.length} role="group" aria-label="Voice">
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
      {(tempo || sound) && (
        <div className="sel-knobs">
          {tempo && (
            <button type="button" id="sel-tempo" className={`sel-knob${tempo.locked ? " locked" : ""}`} aria-label={`${tr("TEMPO")}: ${tempo.word}`} title={tempo.locked ? tr("A B ON THIS FUGUE UNLOCKS TEMPO") : undefined} onClick={tempo.cycle}>
              <span className="sel-knob-k">{tr("TEMPO")}</span>
              <b>
                {tempo.locked ? "🔒 " : ""}
                {tempo.word}
              </b>
            </button>
          )}
          {sound && (
            <label className={`sel-knob${sound.locked ? " locked" : ""}`} id="sel-sound-knob" title={sound.locked ? tr("A B ON THIS FUGUE UNLOCKS SOUND") : undefined}>
              <span className="sel-knob-k">{tr("SOUND")}</span>
              <b>
                {sound.locked ? "🔒 " : ""}
                {sound.name}
                {sound.locked ? "" : " ▾"}
              </b>
              <select disabled={sound.locked} id="sel-sound" value={sound.value} aria-label={tr("SOUND")} onChange={(e) => sound.set(e.target.value)}>
                {soundOptions(sound.sounds, sound.own).map(({ group, items }) => (
                  <optgroup key={group} label={tr(group)}>
                    {items.map(([sid, nm]) => (
                      <option key={sid} value={sid}>
                        {sid === sound.own ? `★ ${tr(nm)}` : tr(nm)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {hear && f.kind === "fugue" && (
        <button type="button" id={`hear-${piece}`} className="sel-hear" onClick={() => hear(piece)}>
          <span aria-hidden="true">♪</span> {tr("HEAR THE SUBJECT")}
        </button>
      )}
      {/* D463: the piece's pop-up kept within reach (how to play, the drums, the tuning, the display). */}
      <button type="button" id="sel-options" className="sel-link" onClick={options}>
        ? {tr("HOW TO PLAY")} · {tr("OPTIONS")}
      </button>
      {about && <FugueAbout id={piece} close={() => setAbout(false)} />}
    </div>
  );
}
