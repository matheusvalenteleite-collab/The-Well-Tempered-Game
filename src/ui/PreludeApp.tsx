/**
 * The WTC mode (docs/wtc/PLAN.md, C6) on Prelude 1 in C, two levels on one screen.
 * P1, the harmonic plan: for each bar the player chooses one of four five-note chords over Bach's
 * bass, hears it in Bach's figuration, and compares the plan with Bach's (chord, figures,
 * fundamental). P2, the figured bass: the bass and Bach's figures are given; the player voices
 * each chord (C9), and the comparison adds the voice-leading: parallel fifths and octaves from the
 * bar before, and how far the voices move. As in the chorale mode, Bach's choice is the feedback;
 * only the parallels are marked as faults, the boundary Fux's rules already draw.
 */
import { ModeSelect } from "./ModeSelect.tsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { BARS, VOICES, barEvents, compare, figureLabel, figuredLabel, motion, parallels, pieceEvents, type Choice } from "../wtc/prelude1.ts";
import type { Mode } from "./Root.tsx";
import { WtcLevelSelect, type WtcLevel } from "./WtcRoot.tsx";
import { HFader } from "./HFader.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { Shell } from "./Shell.tsx";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

type Picks = (number | null)[];

const fund = (c: Choice) => `${c.fundamental.root} ${t(`wtcp.chord.${c.fundamental.chord}`)}`;

export function PreludeApp({ onMode, onTutorial, level, onLevel }: { onMode(mode: Mode): void; onTutorial?: () => void; level: WtcLevel; onLevel(l: WtcLevel): void }) {
  const p2 = level === "p2";
  const key = p2 ? "wtg.prelude1p2" : "wtg.prelude1";
  const load = (k: string) => stored<Picks>(k, BARS.map(() => null), (v) => Array.isArray(v) && v.length === BARS.length);
  const [picks, setPicksState] = useState<Picks>(() => load(key));
  useEffect(() => setPicksState(load(key)), [key]);
  const setPicks = (v: Picks) => {
    setPicksState(v);
    store(key, v);
  };
  /** the options of a bar at this level, as five-pitch chords */
  const opts = (i: number): { pitches: string[]; bach: boolean }[] => (p2 ? BARS[i].realisations : BARS[i].choices);
  const chordAt = (i: number): string[] | null => (picks[i] === null || picks[i] === undefined ? null : opts(i)[picks[i]!]?.pitches ?? null);
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

  const verdicts = useMemo(() => (p2 ? null : compare(picks)), [picks, p2]);
  const bachChords = BARS.map((b) => b.pitches);
  const faults = (chords: (string[] | null)[]) =>
    chords.map((c, i) => (i > 0 && c && chords[i - 1] ? parallels(chords[i - 1]!, c) : []));
  const mine = BARS.map((_, i) => chordAt(i));
  const myFaults = useMemo(() => faults(mine), [picks, p2]);
  const bachFaults = useMemo(() => faults(bachChords), []);
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
  const playAll = (bach = false) => (playing ? stop() : run(pieceEvents(bach ? bachChords : mine)));
  const audition = (pitches: string[], i: number) => run(barEvents(pitches, i), i);
  const choose = (k: number) => {
    const next = [...picks];
    next[selected] = k;
    setPicks(next);
    audition(opts(selected)[k].pitches, selected);
  };
  const next = () => setSelected(Math.min(BARS.length - 1, selected + 1));

  const state = (i: number) => {
    if (picks[i] === null || picks[i] === undefined) return "empty";
    if (!showCompare) return "chosen";
    if (p2) return myFaults[i].length ? "other" : opts(i)[picks[i]!].bach ? "bach" : "root";
    const v = verdicts![i];
    return v.same ? "bach" : v.sameRoot ? "root" : "other";
  };
  const agree = p2 ? BARS.filter((_, i) => picks[i] !== null && opts(i)[picks[i]!].bach).length : verdicts!.filter((v) => v.same).length;
  const agreeRoot = p2 ? 0 : verdicts!.filter((v) => v.sameRoot && !v.same).length;
  const nFaults = myFaults.reduce((a, f) => a + f.length, 0);
  const nBachFaults = bachFaults.reduce((a, f) => a + f.length, 0);
  const faultText = (f: ReturnType<typeof parallels>) => f.map((x) => t(`wtcp.p2.${x.interval}`, { a: t(`wtcp.voice.${VOICES[x.voices[0]]}`), b: t(`wtcp.voice.${VOICES[x.voices[1]]}`) })).join("; ");

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <ModeSelect value="preludes" onMode={(m) => { stop(); onMode(m); }} />
            <WtcLevelSelect level={level} onLevel={onLevel} onChange={() => stop()} />
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} onTutorial={onTutorial} />
        </>
      }
      score={
        <div className="score-wrap wtc-score">
          <ol className="wtc-plan" aria-label={t("wtcp.plan")}>
            {BARS.map((b, i) => {
              const c = chordAt(i);
              const sounding = cursor !== null && Math.floor(cursor) === i;
              return (
                <li key={b.bar}>
                  <button className={`wtc-bar wtc-${state(i)}${i === selected ? " selected" : ""}${sounding ? " sounding" : ""}`} onClick={() => setSelected(i)} aria-label={t("wtcp.barN", { n: b.bar })}>
                    <span className="wtc-n">{b.bar}</span>
                    <span className="wtc-notes">
                      {(c ?? [b.pitches[0]]).slice().reverse().map((p, j) => <span key={j}>{p}</span>)}
                    </span>
                    <span className="wtc-fig">{p2 ? figuredLabel(b.figured) : c ? figureLabel(BARS[i].choices[picks[i]!].figures) : "?"}</span>
                  </button>
                </li>
              );
            })}
            <li><span className="wtc-bar wtc-coda">{t("wtcp.coda")}</span></li>
          </ol>
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          <div className="group write" role="group" aria-label={t("wtcp.choose")}>
            <span className="prompt">{p2 ? t("wtcp.p2.prompt", { n: bar.bar, bass: bar.pitches[0], figures: figuredLabel(bar.figured) }) : t("wtcp.prompt", { n: bar.bar, bass: bar.pitches[0] })}</span>
            {p2
              ? bar.realisations.map((c, k) => (
                  <button key={k} className={picks[selected] === k ? "chord primary" : "chord"} onClick={() => choose(k)} title={c.pitches.join(" ")}>
                    <small>{c.pitches.slice(1).join(" ")}</small>
                  </button>
                ))
              : bar.choices.map((c, k) => (
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
            <button className="icon play" onClick={() => playAll(false)} aria-label={t("wtcp.play")} title={t("wtcp.play")}>{playing ? "■" : "▶"}</button>
            <button onClick={() => playAll(true)} disabled={playing || !showCompare} title={t("wtcp.playBach")}>{t("wtcp.bachs")}</button>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
          </div>
        </div>
      }
      summary={showCompare && (
        <div className="eval-summary ok" role="status">
          <span className="verdict">{p2 ? t("wtcp.p2.summary", { n: agree, of: done, faults: nFaults, bach: nBachFaults }) : t("wtcp.summary", { n: agree, root: agreeRoot, of: done })}</span>
          <button className="link" onClick={() => setTab("compare")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={t("wtcp.source")}
      tabs={[
        {
          id: "compare",
          label: t("chorale.tab.compare"),
          text: true,
          content: showCompare ? (
            <ol className="chorale-verdicts">
              {BARS.map((b, i) => {
                const c = chordAt(i);
                const bachC = BARS[i].choices.find((x) => x.bach)!;
                const prev = i > 0 ? mine[i - 1] : null;
                return (
                  <li key={b.bar} className={`verdict wtc-${state(i)}`}>
                    <button className="link" onClick={() => setSelected(i)}>{t("wtcp.barN", { n: b.bar })}</button>{" "}
                    <span className="muted">{t("wtcp.bass", { bass: b.pitches[0] })}{p2 ? ` · ${figuredLabel(b.figured)}` : ""}</span>
                    <div>
                      {t("wtcp.yours")}:{" "}
                      {c ? (
                        p2 ? <>{c.slice(1).join(" ")}{prev && <span className="muted"> · {t("wtcp.p2.motion", { n: motion(prev, c) })}</span>}</>
                          : <><strong>{figureLabel(BARS[i].choices[picks[i]!].figures)}</strong> {c.slice(1).join(" ")} · {fund(BARS[i].choices[picks[i]!])}</>
                      ) : "—"}
                    </div>
                    {p2 && myFaults[i].length > 0 && <div className="fault">✗ {faultText(myFaults[i])}</div>}
                    <div>
                      {t("wtcp.bach")}:{" "}
                      {p2 ? <>{b.pitches.slice(1).join(" ")}{i > 0 && <span className="muted"> · {t("wtcp.p2.motion", { n: motion(bachChords[i - 1], b.pitches) })}</span>}</>
                        : <><strong>{figureLabel(bachC.figures)}</strong> {bachC.pitches.slice(1).join(" ")} · {fund(bachC)}</>}{" "}
                      <button className="link" onClick={() => audition(b.pitches, i)}>▶</button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : <p className="muted">{t("wtcp.beforeCompare")}</p>,
        },
        {
          id: "about",
          label: t("wtcp.tab.about"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("wtcp.about.1")}</p>
              <p>{t(p2 ? "wtcp.p2.about.2" : "wtcp.about.2")}</p>
              <p>{t(p2 ? "wtcp.p2.about.3" : "wtcp.about.3")}</p>
              <p className="muted">{t("wtcp.about.4")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
