/**
 * The WTC mode, level P1 for the figuration preludes after Prelude 1 (1/2, 1/5, 1/6; C13): for
 * each figured bar the player chooses its harmony (Bach's bar, or a neighbouring bar's right hand
 * over this bar's left hand), hears it in Bach's figuration, and compares the plan with Bach's.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { barEvents, chordNames, figuredBars, pieceEvents, type PlanPiece } from "../wtc/preludes.ts";
import { frac } from "../wtc/prelude1.ts";
import type { Mode } from "./Root.tsx";
import { WtcLevelSelect, type WtcLevel } from "./WtcRoot.tsx";
import { HFader } from "./HFader.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { Shell } from "./Shell.tsx";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

type Picks = (number | null)[];
const LETTERS = "ABCD";

export function PlanApp({ onMode, level, onLevel, piece }: { onMode(mode: Mode): void; level: WtcLevel; onLevel(l: WtcLevel): void; piece: PlanPiece }) {
  const bars = useMemo(() => figuredBars(piece), [piece]);
  const key = `wtg.plan.${piece.id}`;
  const [picks, setPicksState] = useState<Picks>(() => stored<Picks>(key, bars.map(() => null), (v) => Array.isArray(v) && v.length === bars.length));
  const setPicks = (v: Picks) => {
    setPicksState(v);
    store(key, v);
  };
  const [selected, setSelected] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [tab, setTab] = useState("compare");
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const [look, setLook] = useState<"retro" | "classic">(() => stored("wtg.look", "retro", (v) => v === "retro" || v === "classic"));
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(() => stored("wtg.theme", "auto", (v) => v === "auto" || v === "light" || v === "dark"));
  useEffect(() => {
    document.documentElement.dataset.look = look;
    store("wtg.look", look);
  }, [look]);
  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    store("wtg.theme", theme);
  }, [theme]);
  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.tempo", tempo);
  }, [tempo]);
  useEffect(() => () => stop(), []);

  function stop() {
    audio.stop();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setCursor(null);
  }
  function run(events: ReturnType<typeof pieceEvents>) {
    stop();
    if (!events.length) return;
    const whole = audio.barSeconds;
    const from = events[0].at;
    setPlaying(true);
    const t0 = performance.now();
    timer.current = window.setInterval(() => setCursor(from + (performance.now() - t0) / 1000 / whole), 60);
    void audio.playSequence(events, whole).then(() => stop());
  }
  const bachPicks = bars.map((b) => b.choices!.findIndex((c) => c.bach));
  const choose = (k: number) => {
    const next = [...picks];
    next[selected] = k;
    setPicks(next);
    run(barEvents(piece, bars[selected], bars[selected].choices![k].pitches));
  };
  const done = picks.filter((x) => x !== null).length;
  const bar = bars[selected];
  const same = (i: number) => picks[i] !== null && bars[i].choices![picks[i]!].bach;
  const sameRoot = (i: number) => {
    if (picks[i] === null) return false;
    const c = bars[i].choices![picks[i]!].fundamental;
    const b = bars[i].choices!.find((x) => x.bach)!.fundamental;
    return c.root === b.root && c.chord === b.chord;
  };
  const state = (i: number) => (picks[i] === null ? "empty" : !showCompare ? "chosen" : same(i) ? "bach" : sameRoot(i) ? "root" : "other");
  const fund = (f: { root: string; chord: string }) => `${f.root} ${t(`wtcp.chord.${f.chord}`)}`;
  const agree = bars.filter((_, i) => same(i)).length;
  const agreeRoot = bars.filter((_, i) => !same(i) && sameRoot(i)).length;
  const soundingBar = cursor === null ? null : piece.bars.find((b) => cursor >= frac(b.onset) && cursor < frac(b.onset) + frac(b.length))?.bar;

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <select id="voices" className="sel sel-voices" value="preludes" aria-label={t("ui.nav.voices")} onChange={(e) => { stop(); const v = e.target.value; onMode(v === "chorale" || v === "preludes" || v === "wtc" ? v : (Number(v) as 2 | 3)); }}>
              <option value={2}>{t("ui.nav.voicesN", { n: 2 })}</option>
              <option value={3}>{t("ui.nav.voicesN", { n: 3 })}</option>
              <option value="wtc">{t("ui.wtc.mode")}</option>
              <option value="chorale">{t("chorale.mode")}</option>
              <option value="preludes">{t("wtcp.mode")}</option>
            </select>
            <WtcLevelSelect level={level} onLevel={onLevel} onChange={() => stop()} />
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} />
        </>
      }
      score={
        <div className="score-wrap wtc-score">
          <ol className="wtc-plan" aria-label={t("wtcp.plan")}>
            {piece.bars.map((b) => {
              const i = bars.indexOf(b);
              if (i < 0) {
                return (
                  <li key={b.bar}>
                    <span className={`wtc-bar wtc-coda${soundingBar === b.bar ? " sounding" : ""}`}>
                      <span className="wtc-n">{b.bar}</span>
                      <span className="wtc-notes">{t("wtcp.free")}</span>
                    </span>
                  </li>
                );
              }
              const c = picks[i] === null ? null : b.choices![picks[i]!];
              return (
                <li key={b.bar}>
                  <button className={`wtc-bar wtc-${state(i)}${i === selected ? " selected" : ""}${soundingBar === b.bar ? " sounding" : ""}`} onClick={() => setSelected(i)} aria-label={t("wtcp.barN", { n: b.bar })}>
                    <span className="wtc-n">{b.bar}</span>
                    <span className="wtc-notes">{c ? chordNames(c.pitches, "all", piece).split(" ").reverse().map((p, j) => <span key={j}>{p}</span>) : <span>?</span>}</span>
                    {c && showCompare && <span className="wtc-fig">{c.fundamental.root}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          <div className="group write" role="group" aria-label={t("wtcp.choose")}>
            <span className="prompt">{t("wtcp.plan.prompt", { n: bar.bar })}</span>
            {bar.choices!.map((c, k) => (
              <button key={k} className={picks[selected] === k ? "chord primary" : "chord"} onClick={() => choose(k)} title={c.pitches.join(" ")}>
                {LETTERS[k]}
                <small> {chordNames(c.pitches, "upper", piece)}</small>
              </button>
            ))}
            <button className="icon" onClick={() => setSelected(Math.min(bars.length - 1, selected + 1))} disabled={selected === bars.length - 1} aria-label={t("ui.nav.next")}>›</button>
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={showCompare} disabled={done === 0} onClick={() => { setShowCompare(!showCompare); setTab("compare"); }}>
              {t("chorale.compare")}
              {done < bars.length && <span className="badge">{bars.length - done}</span>}
            </button>
            <button className="btn-edit" onClick={() => { setPicks(bars.map(() => null)); setShowCompare(false); setSelected(0); }}>{t("ui.clearAll")}</button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <button className="icon play" onClick={() => (playing ? stop() : run(pieceEvents(piece, picks)))} aria-label={t("wtcp.play")} title={t("wtcp.play")}>{playing ? "■" : "▶"}</button>
            <button onClick={() => run(pieceEvents(piece, bachPicks))} disabled={playing || !showCompare} title={t("wtcp.playBach")}>{t("wtcp.bachs")}</button>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
          </div>
        </div>
      }
      summary={showCompare && (
        <div className="eval-summary ok" role="status">
          <span className="verdict">{t("wtcp.summary", { n: agree, root: agreeRoot, of: done })}</span>
          <button className="link" onClick={() => setTab("compare")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={piece.source.replace(/;.*/, "")}
      tabs={[
        {
          id: "compare",
          label: t("chorale.tab.compare"),
          text: true,
          content: showCompare ? (
            <ol className="chorale-verdicts">
              {bars.map((b, i) => {
                const c = picks[i] === null ? null : b.choices![picks[i]!];
                const bach = b.choices!.find((x) => x.bach)!;
                return (
                  <li key={b.bar} className={`verdict wtc-${state(i)}`}>
                    <button className="link" onClick={() => setSelected(i)}>{t("wtcp.barN", { n: b.bar })}</button>
                    <div>{t("wtcp.yours")}: {c ? <>{chordNames(c.pitches, "upper", piece)} · {fund(c.fundamental)}</> : "—"}</div>
                    <div>
                      {t("wtcp.bach")}: {chordNames(bach.pitches, "upper", piece)} · {fund(bach.fundamental)}{" "}
                      <button className="link" onClick={() => run(barEvents(piece, b, bach.pitches))}>▶</button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : <p className="muted">{t("wtcp.beforeCompare")}</p>,
        },
        {
          id: "about",
          label: t("wtcp.plan.tab"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("wtcp.plan.about.1", { title: piece.title })}</p>
              <p>{t("wtcp.plan.about.2")}</p>
              <p className="muted">{t("wtcp.plan.about.3")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
