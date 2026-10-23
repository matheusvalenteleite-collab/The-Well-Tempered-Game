/**
 * D224, ACHIEVEMENTS: the seals (each fugue's, per voice; D196), the best grades (per fugue, the best
 * voice; D192) and the twenty FEATS (feats.ts), in three tabs. Opened from the title card and, after a
 * run that earned something, from the result.
 */
import { useEffect, useMemo, useState } from "react";
import { fugueById } from "../touch/fugue.ts";
import { CARDS, NOT_OFFERED, readBest, TIERS, type Best, type FugueCard } from "./cards.ts";
import { readSeals } from "./seals.ts";
import { bestOf, FEATS, readFeats, type FeatId, type FeatStore } from "./feats.ts";
import { Emblem } from "./FuguePicker.tsx";

export type AchTab = "seals" | "best" | "feats";

/** A 7×7 pixel glyph ("#" lit), drawn in the text's colour. */
export function Glyph({ rows, className }: { rows: string[]; className?: string }) {
  return (
    <svg className={`tb-glyph${className ? ` ${className}` : ""}`} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  );
}

/** The trophy on the buttons that open this screen. */
export const TROPHY = ["#######", "#.###.#", ".#####.", "..###..", "...#...", "..###..", ".#####."];

const OFFERED = CARDS.filter((c) => !NOT_OFFERED.has(c.seal.kind));
const label = (c: FugueCard) => (c.book === 0 ? "XIV" : `${c.book === 1 ? "I" : "II"}/${c.number}`);
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const BOOKS: [0 | 1 | 2, string][] = [
  [1, "BOOK I"],
  [2, "BOOK II"],
  [0, "THE ART OF FUGUE"],
];
const short = (name: string) => name[0] + (name.match(/ (I+)$/)?.[1] ?? "");

export interface AchData {
  best: Best;
  seals: Record<string, true>;
  feats: FeatStore;
}

/** The pieces whose seal is earned (any voice). */
export function sealedPieces(seals: Record<string, true>): Set<string> {
  return new Set(Object.keys(seals).map((k) => k.split(":")[0]));
}

export function Achievements({ close, tab: first = "seals", fresh = [], data }: { close: () => void; tab?: AchTab; fresh?: FeatId[]; data?: AchData }) {
  const [tab, setTab] = useState<AchTab>(first);
  const d = useMemo(() => data ?? { best: readBest(), seals: readSeals(), feats: readFeats() }, [data]);
  const sealed = sealedPieces(d.seals);
  const sealsN = OFFERED.filter((c) => sealed.has(c.id)).length;
  const bestN = CARDS.filter((c) => bestOf(d.best, c.id)).length;
  const featsN = FEATS.filter((f) => d.feats.earned[f.id]).length;
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.code === "Escape") return close();
      const order: AchTab[] = ["seals", "best", "feats"];
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") setTab((t) => order[(order.indexOf(t) + (e.code === "ArrowLeft" ? 2 : 1)) % 3]);
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [close]);
  const tabs: [AchTab, string][] = [
    ["seals", `SEALS ${sealsN}/${OFFERED.length}`],
    ["best", `BEST ${bestN}/${CARDS.length}`],
    ["feats", `FEATS ${featsN}/${FEATS.length}`],
  ];
  return (
    <div className="tg-picker tb-ach" role="dialog" aria-label="Achievements">
      <header>
        <h1>
          <Glyph rows={TROPHY} className="tb-ach-trophy" /> ACHIEVEMENTS
        </h1>
        <button type="button" id="ach-close" className="tg-x" aria-label="Close" onClick={close}>
          ✕
        </button>
      </header>
      <nav className="tg-tabs" role="tablist">
        {tabs.map(([t, text]) => (
          <button key={t} type="button" role="tab" id={`ach-tab-${t}`} className={t === tab ? "on" : ""} aria-selected={t === tab} onClick={() => setTab(t)}>
            {text}
          </button>
        ))}
      </nav>
      {tab === "seals" && (
        <div className="tb-ach-list" role="tabpanel" aria-label="Seals">
          <p className="tb-ach-note">A seal is earned playing a whole fugue, first bar to last; kept per voice.</p>
          {BOOKS.map(([b, name]) => (
            <section key={b}>
              <h2>{name}</h2>
              {CARDS.filter((c) => c.book === b).map((c) => {
                const off = NOT_OFFERED.has(c.seal.kind);
                const got = sealed.has(c.id);
                const f = fugueById(c.id);
                return (
                  <div key={c.id} className={`tb-ach-row${off ? " tb-ach-seal-off" : " tb-ach-seal"}${got ? " earned" : ""}`} data-piece={c.id}>
                    {typeof document !== "undefined" ? <Emblem id={c.id} className="tb-ach-pic" /> : <span className="tb-ach-pic" />}
                    <div className="tb-ach-text">
                      <b>
                        {label(c)} · {c.title}
                      </b>
                      <span className="tb-ach-kind">
                        {got ? "◆" : "◇"} {c.seal.kind}
                      </span>
                      <small>{off ? "NOT OFFERED (needed TWO VOICES)." : !c.ready ? "SEAL COMING: its entries are not mapped yet." : got ? c.seal.line : `NEEDED: ${c.seal.line}`}</small>
                      {!off && (
                        <span className="tb-ach-voices" aria-label="Seal per voice">
                          {f.voiceNames.map((name, v) => (
                            <span key={name} className={d.seals[`${c.id}:${v}`] ? "earned" : ""} title={name}>
                              {short(name)}
                              {d.seals[`${c.id}:${v}`] ? "◆" : "◇"}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
      {tab === "best" && (
        <div className="tb-ach-list" role="tabpanel" aria-label="Best grades">
          <p className="tb-ach-note">The best grade of each fugue, over its voices (SUBJECT runs are not graded per voice).</p>
          {BOOKS.map(([b, name]) => (
            <section key={b}>
              <h2>{name}</h2>
              {CARDS.filter((c) => c.book === b).map((c) => {
                const top = bestOf(d.best, c.id);
                const f = fugueById(c.id);
                return (
                  <div key={c.id} className={`tb-ach-row tb-ach-best${top ? " earned" : ""}`}>
                    <span className={`tb-ach-grade${top && (top.grade === "S" || top.grade === "A") ? " tg-gold" : ""}`}>{top?.grade ?? "·"}</span>
                    <div className="tb-ach-text">
                      <b>
                        {label(c)} · {c.title}
                      </b>
                      <span className="tb-ach-stars" aria-label={`Difficulty ${c.stars} of 5`}>
                        <span className="tg-gold">{stars(c.stars)}</span> {TIERS[c.stars - 1]}
                      </span>
                      <small>{top ? `BY THE ${f.voiceNames[top.voice]?.toUpperCase() ?? "?"} · ${top.voices}/${f.voices.length} VOICES GRADED` : "NOT PLAYED TO THE END YET"}</small>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
      {tab === "feats" && (
        <div className="tb-ach-feats" role="tabpanel" aria-label="Feats">
          {FEATS.map((f) => {
            const day = d.feats.earned[f.id];
            return (
              <div key={f.id} className={`tb-ach-feat${day ? " earned" : ""}${fresh.includes(f.id) ? " fresh" : ""}`} data-feat={f.id}>
                <Glyph rows={f.glyph} />
                <div className="tb-ach-text">
                  <b>{f.name}</b>
                  <small>{f.line}</small>
                  <span className="tb-ach-day">{fresh.includes(f.id) ? "NEW!" : day ? day : "LOCKED"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The result's toast: the feats just earned. */
export function FeatToast({ fresh, open }: { fresh: FeatId[]; open: () => void }) {
  if (!fresh.length) return null;
  return (
    <button type="button" id="ach-toast" className="tb-ach-toast" onClick={open}>
      <span className="tb-ach-toast-head">ACHIEVEMENT!</span>
      {fresh.map((id) => {
        const f = FEATS.find((x) => x.id === id)!;
        return (
          <span key={id} className="tb-ach-toast-feat">
            <Glyph rows={f.glyph} /> {f.name}
          </span>
        );
      })}
    </button>
  );
}

/** The button on the title card and the result. */
export function AchButton({ open, id = "achievements" }: { open: () => void; id?: string }) {
  return (
    <button type="button" id={id} className="tb-lessons tb-ach-btn" onClick={open}>
      <Glyph rows={TROPHY} /> ACHIEVEMENTS
    </button>
  );
}
