/**
 * The WTC mode (docs/wtc/CONCEPT.md, C6), level 1: the harmonic plan of Prelude 1 in C. For each
 * bar the player chooses one of four five-note chords over Bach's bass, hears it in Bach's
 * figuration, and compares the whole plan with Bach's. As in the chorale mode, no choice is
 * marked wrong: Bach's chord, its figures and its fundamental are the feedback.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { BARS, barEvents, compare, figureLabel, pieceEvents, type Choice } from "../wtc/prelude1.ts";
import type { Mode } from "./Root.tsx";
import { HFader } from "./HFader.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { Shell } from "./Shell.tsx";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

type Picks = (number | null)[];

const fund = (c: Choice) => `${c.fundamental.root} ${t(`wtc.chord.${c.fundamental.chord}`)}`;

export function PreludeApp({ onMode }: { onMode(mode: Mode): void }) {
  const [picks, setPicks] = useState<Picks>(() => stored<Picks>("wtg.prelude1", BARS.map(() => null), (v) => Array.isArray(v) && v.length === BARS.length));
  useEffect(() => store("wtg.prelude1", picks), [picks]);
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

  const verdicts = useMemo(() => compare(picks), [picks]);
  const done = picks.filter((x) => x !== null).length;
  const bar = BARS[selected];

  function stop() {
    audio.stop();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setCursor(null);
  }
  function run(events: ReturnType<typeof pieceEvents>, from = 0) {
    stop();
    const whole = audio.barSeconds;
    setPlaying(true);
    const t0 = performance.now();
    timer.current = window.setInterval(() => setCursor(from + (performance.now() - t0) / 1000 / whole), 60);
    void audio.playSequence(events, whole).then(() => stop());
  }
  const playAll = (bach = false) => (playing ? stop() : run(pieceEvents(bach ? BARS.map((b) => b.choices.findIndex((c) => c.bach)) : picks)));
  const audition = (pitches: string[], i: number) => run(barEvents(pitches, i), i);
  const choose = (k: number) => {
    const next = [...picks];
    next[selected] = k;
    setPicks(next);
    audition(BARS[selected].choices[k].pitches, selected);
  };
  const next = () => setSelected(Math.min(BARS.length - 1, selected + 1));

  const state = (i: number) => {
    const v = verdicts[i];
    if (!v.chosen) return "empty";
    if (!showCompare) return "chosen";
    return v.same ? "bach" : v.sameRoot ? "root" : "other";
  };
  const agree = verdicts.filter((v) => v.same).length;
  const agreeRoot = verdicts.filter((v) => v.sameRoot && !v.same).length;

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <select id="voices" className="sel sel-voices" value="wtc" aria-label={t("ui.nav.voices")} onChange={(e) => { stop(); const v = e.target.value; onMode(v === "chorale" || v === "wtc" ? v : (Number(v) as 2 | 3)); }}>
              <option value={2}>{t("ui.nav.voicesN", { n: 2 })}</option>
              <option value={3}>{t("ui.nav.voicesN", { n: 3 })}</option>
              <option value="chorale">{t("chorale.mode")}</option>
              <option value="wtc">{t("wtc.mode")}</option>
            </select>
            <select id="exercise" className="sel sel-exercise" value={1} aria-label={t("ui.nav.choose")} onChange={() => undefined}>
              <option value={1}>{t("wtc.piece.p1")}</option>
            </select>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} />
        </>
      }
      score={
        <div className="score-wrap wtc-score">
          <ol className="wtc-plan" aria-label={t("wtc.plan")}>
            {BARS.map((b, i) => {
              const k = picks[i];
              const c = k === null ? null : b.choices[k];
              const sounding = cursor !== null && Math.floor(cursor) === i;
              return (
                <li key={b.bar}>
                  <button className={`wtc-bar wtc-${state(i)}${i === selected ? " selected" : ""}${sounding ? " sounding" : ""}`} onClick={() => setSelected(i)} aria-label={t("wtc.barN", { n: b.bar })}>
                    <span className="wtc-n">{b.bar}</span>
                    <span className="wtc-notes">
                      {(c ? c.pitches : [b.pitches[0]]).slice().reverse().map((p, j) => <span key={j}>{p}</span>)}
                    </span>
                    <span className="wtc-fig">{c ? figureLabel(c.figures) : "?"}</span>
                  </button>
                </li>
              );
            })}
            <li><span className="wtc-bar wtc-coda">{t("wtc.coda")}</span></li>
          </ol>
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          <div className="group write" role="group" aria-label={t("wtc.choose")}>
            <span className="prompt">{t("wtc.prompt", { n: bar.bar, bass: bar.pitches[0] })}</span>
            {bar.choices.map((c, k) => (
              <button key={k} className={picks[selected] === k ? "chord primary" : "chord"} onClick={() => choose(k)} title={c.pitches.join(" ")}>
                {figureLabel(c.figures)}
                <small> {c.pitches.slice(1).join(" ")}</small>
              </button>
            ))}
            <button className="icon" onClick={next} disabled={selected === BARS.length - 1} aria-label={t("ui.nav.next")}>›</button>
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={showCompare} disabled={done === 0} onClick={() => { setShowCompare(!showCompare); setTab("compare"); }}>
              {t("chorale.compare")}
              {done < BARS.length && <span className="badge">{BARS.length - done}</span>}
            </button>
            <button className="btn-edit" onClick={() => { setPicks(BARS.map(() => null)); setShowCompare(false); setSelected(0); }}>{t("ui.clearAll")}</button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <button className="icon play" onClick={() => playAll(false)} aria-label={t("wtc.play")} title={t("wtc.play")}>{playing ? "■" : "▶"}</button>
            <button onClick={() => playAll(true)} disabled={playing || !showCompare} title={t("wtc.playBach")}>{t("wtc.bachs")}</button>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
          </div>
        </div>
      }
      summary={showCompare && (
        <div className="eval-summary ok" role="status">
          <span className="verdict">{t("wtc.summary", { n: agree, root: agreeRoot, of: done })}</span>
          <button className="link" onClick={() => setTab("compare")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={t("wtc.source")}
      tabs={[
        {
          id: "compare",
          label: t("chorale.tab.compare"),
          text: true,
          content: showCompare ? (
            <ol className="chorale-verdicts">
              {verdicts.map((v, i) => (
                <li key={v.bar} className={`verdict wtc-${state(i)}`}>
                  <button className="link" onClick={() => setSelected(i)}>{t("wtc.barN", { n: v.bar })}</button>{" "}
                  <span className="muted">{t("wtc.bass", { bass: BARS[i].pitches[0] })}</span>
                  <div>{t("wtc.yours")}: {v.chosen ? <><strong>{figureLabel(v.chosen.figures)}</strong> {v.chosen.pitches.slice(1).join(" ")} · {fund(v.chosen)}</> : "—"}</div>
                  <div>
                    {t("wtc.bach")}: <strong>{figureLabel(v.bach.figures)}</strong> {v.bach.pitches.slice(1).join(" ")} · {fund(v.bach)}{" "}
                    <button className="link" onClick={() => audition(v.bach.pitches, i)}>▶</button>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="muted">{t("wtc.beforeCompare")}</p>,
        },
        {
          id: "about",
          label: t("wtc.tab.about"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("wtc.about.1")}</p>
              <p>{t("wtc.about.2")}</p>
              <p>{t("wtc.about.3")}</p>
              <p className="muted">{t("wtc.about.4")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
