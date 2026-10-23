/**
 * The fugue selection screen (D192): Book I, Book II and a narrow XIV tab; a wheel of the book's 24
 * fugues, five rows seen, the chosen one large in the middle (its emblem, evocative and formal titles,
 * BWV, voices, metre, bars, stars, the seal, each voice's best grade). A touch drags the wheel (native
 * scroll-snap underneath, so a phone's own momentum); ↑/↓ or W/S move, ←/→ or A/D change the book,
 * Enter chooses, Escape closes; the mouse wheel moves a card a notch. Fugues only (D188). D219: Book I
 * first, the TESTBENCH tab dropped from the screen (the list kept in cards.ts), and the card's place in
 * the list shown ("7/24"). D229: Book I's cards are pairs, two stages each: the PRELUDE (always
 * playable; its own stars, on the preludes' scale) and the FUGUE, locked (🔒) until the prelude is
 * beaten (stages.ts). P and F (or a tap on the stage) choose the stage.
 */
import { readSeals } from "./seals.ts";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { keyTint } from "../touch/MusicBox.tsx";
import { fugueById } from "../touch/fugue.ts";
import { bookCards, cardById, NOT_OFFERED, readBest, SEAL_KINDS, TIERS, type FugueCard } from "./cards.ts";
import { drawEmblem, EMBLEM_H, EMBLEM_W } from "./emblem.ts";
import { difficultyOf } from "./difficulty.ts";
import { fugueOf, isPrelude, locked, preludeOf, readStages } from "./stages.ts";

type Stage = "prelude" | "fugue";

const urls = new Map<string, string>();
/** The emblem as an image (drawn once a piece, cached). */
export function emblemUrl(id: string): string {
  const hit = urls.get(id);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = EMBLEM_W;
  c.height = EMBLEM_H;
  const g = c.getContext("2d");
  if (!g) return "";
  drawEmblem(g, id);
  const url = c.toDataURL("image/png");
  urls.set(id, url);
  return url;
}

export function Emblem({ id, className }: { id: string; className?: string }) {
  return <img className={`tb-emblem${className ? ` ${className}` : ""}`} src={emblemUrl(id)} width={EMBLEM_W} height={EMBLEM_H} alt="" draggable={false} />;
}

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
type Book = 0 | 1 | 2;
const BOOKS: [Book, string][] = [
  [1, "BOOK I · 1722"],
  [2, "BOOK II · 1742"],
  [0, "XIV"],
];

/** The button in ⚙ that opens the wheel: the piece's emblem and titles. */
export function PieceButton({ id, open }: { id: string; open: () => void }) {
  const c = cardById(id);
  const f = fugueById(id);
  return (
    <>
      <div className="tg-set">
        <span>PIECE</span>
        <span className="tg-panel-val">{f.title.toUpperCase()}</span>
      </div>
      <button type="button" id="pick-piece" className="tb-piece-btn" onClick={open} style={{ borderColor: keyTint(f.key, 30) }}>
        <Emblem id={id} />
        <span className="tb-piece-btn-text">
          <b>{c?.title ?? f.title}</b>
          <small>{c ? `${c.formal} · ${c.bwv}` : f.title}</small>
          <em>CHOOSE A FUGUE ▸</em>
        </span>
      </button>
    </>
  );
}

export function FuguePicker({ current, pick, close }: { current: string; pick: (id: string) => void; close?: () => void }) {
  const start = cardById(fugueOf(current)) ?? bookCards(1)[0];
  const stages = useMemo(readStages, []);
  // D229: the stage shown on Book I's cards: the prelude until its fugue is unlocked (or chosen).
  const [stage, setStage] = useState<Stage>(isPrelude(current) || locked(fugueOf(current), stages) ? "prelude" : "fugue");
  const [book, setBook] = useState<Book>(start.book);
  // The wheel's position (rows, fractional while it moves) in the book shown.
  const [pos, setPos] = useState(start.book === 0 ? 0 : start.number - 1);
  const lastNumber = useRef(start.book === 0 ? 0 : start.number - 1);
  const [why, setWhy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState(34);
  const cards = bookCards(book);
  const n = cards.length;
  const sel = Math.max(0, Math.min(n - 1, Math.round(pos)));
  const card = cards[sel];
  const best = useMemo(readBest, []);
  const pairs = book === 1;
  const isLocked = pairs && locked(card.id, stages);
  const onPrelude = pairs && stage === "prelude";
  const choose = () => {
    if (onPrelude) return pick(preludeOf(card.id));
    if (!isLocked) pick(card.id);
  };
  const seals = useMemo(readSeals, []);

  // The row's height from the CSS (shorter on a phone held sideways).
  useLayoutEffect(() => {
    const measure = () => {
      const v = wheel.current ? parseFloat(getComputedStyle(wheel.current).getPropertyValue("--row")) : 34;
      setRowH(Number.isFinite(v) && v > 0 ? v : 34);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // A new book (or row height): the scroller put at the row, without animation.
  useLayoutEffect(() => {
    const s = scroller.current;
    if (s) s.scrollTop = Math.round(pos) * rowH;
  }, [book, rowH]);

  const go = (i: number, smooth = true) => {
    const s = scroller.current;
    const to = ((i % n) + n) % n;
    lastNumber.current = book === 1 || book === 2 ? to : lastNumber.current;
    setWhy(false);
    if (!s) return setPos(to);
    // A wrap (24 → 1) jumps; a step glides.
    s.scrollTo({ top: to * rowH, behavior: smooth && Math.abs(to - Math.round(pos)) === 1 ? "smooth" : "auto" });
    setPos(to);
  };
  const switchBook = (b: Book) => {
    if (b === book) return;
    setWhy(false);
    setBook(b);
    // Switching keeps the wheel's number (II/7 → I/7).
    setPos(b === 0 ? 0 : lastNumber.current);
  };
  const stepBook = (d: number) => {
    const i = BOOKS.findIndex(([b]) => b === book);
    switchBook(BOOKS[(i + d + BOOKS.length) % BOOKS.length][0]);
  };

  const onScroll = () => {
    const s = scroller.current;
    if (!s) return;
    const p = Math.max(0, Math.min(n - 1, s.scrollTop / rowH));
    setPos(p);
    if (book === 1 || book === 2) lastNumber.current = Math.round(p);
  };

  // The mouse wheel: a card a notch (a trackpad's small deltas added up to a row).
  useEffect(() => {
    const el = wheel.current;
    if (!el) return;
    let acc = 0;
    let lastAt = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now - lastAt > 250) acc = 0;
      lastAt = now;
      acc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      if (Math.abs(acc) >= 40) {
        const d = Math.sign(acc);
        acc = 0;
        const s = scroller.current;
        const cur = s ? Math.round(s.scrollTop / rowH) : sel;
        const to = Math.max(0, Math.min(n - 1, cur + d));
        if (s) s.scrollTo({ top: to * rowH, behavior: "auto" });
        setPos(to);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [n, rowH, sel]);

  // The keys, before anything else hears them (the panel's Escape, the game's keys).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.code;
      const handled = (fn: () => void) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        fn();
      };
      if (k === "Escape") return close ? handled(close) : undefined;
      if (k === "ArrowUp" || k === "KeyW") return handled(() => go(sel - 1));
      if (k === "ArrowDown" || k === "KeyS") return handled(() => go(sel + 1));
      if (k === "PageUp") return handled(() => go(Math.max(0, sel - 4)));
      if (k === "PageDown") return handled(() => go(Math.min(n - 1, sel + 4)));
      if (k === "Home") return handled(() => go(0));
      if (k === "End") return handled(() => go(n - 1));
      if (k === "ArrowLeft" || k === "KeyA") return handled(() => stepBook(-1));
      if (k === "ArrowRight" || k === "KeyD") return handled(() => stepBook(1));
      if (k === "Enter" || k === "Space" || k === "NumpadEnter") {
        // A focused tab or ✕ keeps its own Enter.
        const t = e.target instanceof Element ? e.target.closest("button") : null;
        if (t && !t.classList.contains("tb-play")) return;
        return handled(choose);
      }
      if (pairs && k === "KeyP") return handled(() => setStage("prelude"));
      if (pairs && k === "KeyF") return handled(() => setStage("fugue"));
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  });

  // A tap on the wheel: a row above or below the card brings it to the middle.
  const tap = (e: React.MouseEvent) => {
    const el = wheel.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const y = e.clientY - r.top;
    if (y < 2 * rowH) go(sel - (y < rowH ? 2 : 1));
    else if (y > r.height - 2 * rowH) go(sel + (y > r.height - rowH ? 2 : 1));
  };

  const frac = pos - sel;
  const f = fugueById(card.id);
  const pf = pairs ? fugueById(preludeOf(card.id)) : null;
  const pStars = pf ? difficultyOf(pf).stars : 0;
  const pLast = pf ? (pf.bars[pf.bars.length - 1]?.n ?? pf.bars.length) : 0;
  const pBeat = pf ? stages[pf.id] : undefined;
  const lastBar = f.bars[f.bars.length - 1]?.n ?? f.bars.length;
  const row = (k: number) => {
    const c: FugueCard | undefined = cards[sel + k];
    if (!c) return <div key={k} className="tb-wheel-row tb-wheel-empty" />;
    return (
      <div key={k} className={`tb-wheel-row tb-wheel-d${Math.abs(k)}`} style={{ transform: `translateY(${-frac * rowH}px)` }} aria-hidden="true">
        <span className="tb-wheel-chip" style={{ background: keyTint(fugueById(c.id).key, 10) }} />
        <span className="tb-wheel-no">{c.book === 0 ? "XIV" : c.number}</span>
        <span className="tb-wheel-name">
          {c.book === 1 ? c.formal.replace(/^Fugue \d+ in /, "Prelude & Fugue in ") : c.formal}
          {c.book === 1 && <span className="tb-wheel-lock">{locked(c.id, stages) ? " 🔒" : " ✓"}</span>}
        </span>
      </div>
    );
  };

  return (
    <div className="tg-picker tb-wheel-screen" role="dialog" aria-label="Choose a fugue">
      <header>
        <div>
          <h1>DAS WOHLTEMPERIRTE CLAVIER</h1>
          <p>{book === 1 ? "prelude, then fugue · ↑↓ choose · P/F stage · ←→ book · ⏎ play" : "the fugues · ↑↓ choose · ←→ book · ⏎ play"}</p>
        </div>
        {close && <button type="button" id="wheel-close" className="tg-x" aria-label="Close" onClick={close}>
          ✕
        </button>}
      </header>
      <nav className="tg-tabs tb-wheel-tabs" role="tablist">
        {BOOKS.map(([b, label]) => (
          <button key={b} type="button" role="tab" id={`wheel-book-${b}`} className={`${b === book ? "on" : ""}${b === 0 ? " tb-tab-xiv" : ""}`} aria-selected={b === book} onClick={() => switchBook(b)} style={b === book ? { boxShadow: `inset 0 -3px 0 ${keyTint(f.key, 25)}` } : undefined}>
            {label}
          </button>
        ))}
      </nav>
      <div className="tb-wheel" ref={wheel} onClick={tap} role="listbox" aria-label={book === 0 ? "The Art of Fugue" : `Book ${book === 1 ? "I" : "II"}`} aria-activedescendant={`opt-${card.id}`}>
        <div className="tb-wheel-scroll" ref={scroller} onScroll={onScroll} tabIndex={-1}>
          {cards.map((c) => (
            <div key={c.id} className="tb-wheel-snap" />
          ))}
          <div className="tb-wheel-tail" />
        </div>
        <div className="tb-wheel-above">{[-2, -1].map(row)}</div>
        <div key={card.id} id={`opt-${card.id}`} role="option" aria-selected="true" className="tb-fcard" style={{ ["--tint" as string]: keyTint(f.key, 8), ["--tint-hi" as string]: keyTint(f.key, 30) }}>
          <span className="tb-fcard-pos" aria-label={`${sel + 1} of ${n}`}>
            {sel + 1}/{n}
          </span>
          <Emblem id={card.id} className="tb-fcard-pic" />
          <div className="tb-fcard-text">
            {pairs && (
              <div className="tb-stages" role="group" aria-label="Stage">
                <button type="button" id="stage-prelude" className={onPrelude ? "on" : ""} aria-pressed={onPrelude} onClick={(e) => (e.stopPropagation(), setStage("prelude"))}>
                  1 · PRELUDE{pBeat ? " ✓" : ""}
                </button>
                <button type="button" id="stage-fugue" className={`${onPrelude ? "" : "on"}${isLocked ? " tb-stage-locked" : ""}`} aria-pressed={!onPrelude} onClick={(e) => (e.stopPropagation(), setStage("fugue"))}>
                  2 · FUGUE{isLocked ? " 🔒" : ""}
                </button>
              </div>
            )}
            {onPrelude && pf ? (
              <>
                <h2 className="tb-fcard-title">{pf.title}</h2>
                <p className="tb-fcard-formal">{card.bwv} · STAGE 1</p>
                <p className="tb-fcard-stats">
                  {pf.voices.length === 2 ? "2 HANDS" : `${pf.voices.length} PARTS`} · {pf.meter} · {pLast} BARS
                </p>
                <p className="tb-fcard-stars" aria-label={`Difficulty ${pStars} of 5`}>
                  <span className="tg-gold">{stars(pStars)}</span> {TIERS[pStars - 1]}
                </p>
                <p className={`tb-fcard-seal${pBeat ? "" : " tb-seal-soon"}`}>
                  {pBeat ? <><b>✓ BEATEN</b> · BEST {pBeat.best} · THE FUGUE IS OPEN</> : <><b>BEAT IT</b> Play it to the end to unlock the fugue.</>}
                </p>
                <button type="button" id="wheel-play" className="tb-play" onClick={(e) => (e.stopPropagation(), choose())}>
                  PLAY PRELUDE ▶
                </button>
              </>
            ) : (
              <>
            <h2 className="tb-fcard-title">{card.title}</h2>
            <p className="tb-fcard-formal">
              {card.formal} · {card.bwv}
            </p>
            <p className="tb-fcard-stats">
              {f.voices.length} VOICES · {f.meter} · {lastBar} BARS
            </p>
            <p className="tb-fcard-stars" aria-label={`Difficulty ${card.stars} of 5`}>
              <span className="tg-gold">{stars(card.stars)}</span> {TIERS[card.stars - 1]}
            </p>
            <p className={`tb-fcard-seal${card.ready ? "" : " tb-seal-soon"}`}>
              <b>◆ {card.seal.kind}</b> {card.ready ? card.seal.line : NOT_OFFERED.has(card.seal.kind) ? "Not offered." : "Seal coming: its entries are not mapped yet."}
              <button type="button" className="tb-why" aria-expanded={why} aria-label="Why" onClick={(e) => (e.stopPropagation(), setWhy(!why))}>
                ⓘ
              </button>
            </p>
            {why && (
              <p className="tb-fcard-why">
                {card.why}
                {!card.ready && <> The seal will be: {card.seal.line}</>}
                {card.ready && <> {SEAL_KINDS[card.seal.kind]}</>}
              </p>
            )}
            <p className="tb-fcard-voices" aria-label="Best grade per voice">
              {f.voiceNames.map((name, v) => {
                const g = best[`${card.id}:${v}`];
                return (
                  <span key={name} title={`${name}: ${g ? `best ${g}` : "not played"}`}>
                    {name[0]}
                    {name.match(/ (I+)$/)?.[1] ?? ""}:<b className={g === "S" || g === "A" ? "tg-gold" : ""}>{g ?? "·"}</b>
                    <span className={`tb-seal-pip${seals[`${card.id}:${v}`] ? " earned" : ""}`}>{seals[`${card.id}:${v}`] ? "◆" : "◇"}</span>
                  </span>
                );
              })}
            </p>
            {isLocked ? (
              <button type="button" id="wheel-play" className="tb-play tb-play-locked" disabled aria-disabled="true">
                🔒 BEAT THE PRELUDE TO UNLOCK
              </button>
            ) : (
              <button type="button" id="wheel-play" className="tb-play" onClick={(e) => (e.stopPropagation(), choose())}>
                PLAY ▶
              </button>
            )}
              </>
            )}
          </div>
        </div>
        <div className="tb-wheel-below">{[1, 2].map(row)}</div>
      </div>
    </div>
  );
}
