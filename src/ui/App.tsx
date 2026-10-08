import { useEffect, useMemo, useRef, useState } from "react";
import { repository } from "../music/fux/load-browser.ts";
import { FUX_FIRST_SPECIES_CURRICULUM, rulesForStep, validateCurriculum } from "../counterpoint/curriculum/fux-first-species.ts";
import { evaluate, type Evaluation } from "../counterpoint/engine.ts";
import { compareWithOriginal } from "../music/fux/player.ts";
import { exerciseView } from "../game/exercise-view.ts";
import { applyAccidental, clear, initialState, letterNote, place, select, stepNote, toPlayerSolution, type SessionState } from "../game/session.ts";
import { AudioEngine, DEFAULT_SYNTH, type AudioStatus, type SynthSettings } from "../audio/engine.ts";
import { SynthRack } from "./SynthRack.tsx";
import { Hints } from "./Hints.tsx";
import { Feedback } from "./Feedback.tsx";
import { Knob } from "./Knob.tsx";
import { ScoreView } from "./notation/ScoreView.tsx";
import { buildOverlay } from "./notation/overlay.ts";
import { Credits } from "./Credits.tsx";
import { t } from "./i18n.ts";
import type { Step } from "../music/pitch.ts";

validateCurriculum(repository);
// One canonical exercise so far: the first of the book (Fig. 5).
const STEP = FUX_FIRST_SPECIES_CURRICULUM[0];
const VIEW = exerciseView(repository, STEP);
const audio = new AudioEngine();
// Owner decision D15: synthesized sound only for now (the sampled piano stays in the engine, unused).
audio.sound = "chip";
(window as unknown as { wtgAudio: AudioEngine }).wtgAudio = audio; // read by the browser tests

/** Seconds a bar must stay selected while browsing before it sounds. */
const DWELL_MS = 1000;

/** Per-viewer conveniences in localStorage; the game works the same without them. */
function stored<T>(key: string, fallback: T, valid: (v: unknown) => boolean = () => true): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = JSON.parse(raw) as unknown;
    return valid(v) ? (typeof fallback === "object" ? { ...fallback, ...(v as object) } : (v as T)) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* not persisted */
  }
}

export function App() {
  const [session, setSession] = useState<SessionState>(() => initialState(VIEW.cantus.length));
  const [clefMode, setClefMode] = useState<"modern" | "original">("modern");
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 120));
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number" && v >= 0 && v <= 100));
  const [synth, setSynth] = useState<SynthSettings>(() => stored("wtg.synth", { ...DEFAULT_SYNTH }, (v) => typeof v === "object" && v !== null));
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [showCredits, setShowCredits] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [showFux, setShowFux] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showSynth, setShowSynth] = useState(false);
  /** The score is "active" after it was clicked or played from the keyboard; a click elsewhere deactivates it. */
  const [active, setActive] = useState(true);
  const scoreRef = useRef<HTMLDivElement>(null);
  const browsing = useRef(false);
  audio.onStatus = setAudioStatus;

  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.tempo", tempo);
  }, [tempo]);
  useEffect(() => {
    audio.setVolume(volume / 100);
    store("wtg.volume", volume);
  }, [volume]);
  useEffect(() => {
    audio.setSynth(synth);
    store("wtg.synth", synth);
  }, [synth]);

  const column = (k: number, notes = session.notes) => ({ cantus: VIEW.cantus[k], counterpoint: notes[k] });

  const update = (next: SessionState, sound = true) => {
    setSession(next);
    if (next.notes.some((n, k) => n !== session.notes[k])) {
      setResult(null);
      setShowFux(false);
    }
    const changed = next.notes[next.selected] !== session.notes[next.selected];
    if (sound && changed && next.notes[next.selected]) void audio.playColumn(column(next.selected, next.notes));
  };

  /** Selecting a bar without writing: it sounds if the player stays on it for DWELL_MS. */
  const browse = (column: number) => {
    browsing.current = true;
    update(select(session, column), false);
  };
  useEffect(() => {
    if (!browsing.current) return;
    browsing.current = false;
    const k = session.selected;
    const timer = window.setTimeout(() => void audio.playColumn(column(k)), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [session.selected, session]);

  const missing = session.notes.filter((n) => n === null).length;
  const runEvaluation = () => {
    if (missing > 0) return;
    setResult(
      evaluate(
        {
          species: "first",
          modalFinal: VIEW.modalFinal,
          cantusVoice: VIEW.cantusVoice,
          cantus: VIEW.cantus.map((p) => ({ pitch: p, duration: "1/1" })),
          counterpoint: session.notes.map((p) => ({ pitch: p, duration: "1/1" })),
        },
        rulesForStep(STEP.id),
      ),
    );
  };
  const fuxSolution = VIEW.exerciseId ? repository.getSolution(VIEW.exerciseId) : undefined;
  const marks = result ? result.violations.flatMap((v) => v.positions.map((c) => ({ column: c, severity: v.severity }))) : undefined;
  const overlay = useMemo(() => (result ? buildOverlay(result.violations, VIEW.cantus, session.notes) : undefined), [result, session.notes]);

  const play = () => {
    if (playing) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    setPlaying(true);
    void audio.playAll(VIEW.cantus.map((_, k) => column(k)), (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    });
  };

  // Starting pitch for keyboard entry before anything is written: the cantus note an octave away.
  const startPitch = (k: number) => {
    const cf = VIEW.cantus[k];
    const oct = Number(cf.slice(-1)) + (VIEW.cantusVoice === "lower" ? 1 : -1);
    return cf.slice(0, -1) + oct;
  };

  /** Keys drive the score wherever focus is (buttons, knobs), except in text fields and dialogs. */
  const onKey = (e: KeyboardEvent) => {
    if (showCredits || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "TEXTAREA" || target.tagName === "SELECT" || (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "range"))) return;
    const k = e.key;
    const s = session;
    if (k === "ArrowRight") browse(s.selected + 1);
    else if (k === "ArrowLeft") browse(s.selected - 1);
    else if (k === "ArrowUp") update(stepNote(s, 1, startPitch(s.selected)));
    else if (k === "ArrowDown") update(stepNote(s, -1, startPitch(s.selected)));
    else if (/^[a-gA-G]$/.test(k)) update(letterNote(s, k.toUpperCase() as Step, s.notes[s.selected] ?? s.lastWritten ?? startPitch(s.selected)));
    else if (k === "#") update(applyAccidental(s, 1));
    else if (k === "-") update(applyAccidental(s, -1));
    else if (k === "n") update(applyAccidental(s, 0));
    else if (k === "Delete" || k === "Backspace") update(clear(s), false);
    else if (k === " ") void audio.playColumn(column(s.selected));
    else if (k === "p" || k === "P") play();
    else return;
    e.preventDefault();
    setActive(true);
  };
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyRef.current(e);
    const outside = (e: PointerEvent) => {
      if (!scoreRef.current?.contains(e.target as Node)) setActive(false);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("pointerdown", outside, true);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("pointerdown", outside, true);
    };
  }, []);

  const clefs = clefMode === "modern" ? VIEW.clefs.modern : VIEW.clefs.original;
  const figure = VIEW.figure ? t("ui.exercise.figure", { figure: VIEW.figure }) : "";
  const label = `${figure} ${t("ui.exercise.mode", { final: VIEW.modalFinal })}`;

  return (
    <div className="app">
      <header>
        <h1>{t("ui.title")}</h1>
        <button className="link" onClick={() => setShowCredits(true)}>{t("ui.credits")}</button>
      </header>
      <main>
        <p className="meta">
          {t("ui.mode.fux")} · {t("ui.species.first")} · {figure} · {t("ui.exercise.mode", { final: VIEW.modalFinal })} ·{" "}
          {VIEW.cantusVoice === "lower" ? t("ui.exercise.cantusBelow") : t("ui.exercise.cantusAbove")}
        </p>
        <blockquote className="tutor">
          <span className="speaker">{t("tutor.speaker.aloysius")}.</span> {t(`tutor.step.${STEP.id}.intro`)}
        </blockquote>
        <div
          className={active ? "score-wrap active" : "score-wrap"}
          ref={scoreRef}
          data-notes={JSON.stringify(session.notes)}
          data-active={active}
          aria-label={t("ui.keyboard.help")}
          title={active ? undefined : t("ui.score.inactive")}
        >
          <ScoreView
            cantus={VIEW.cantus}
            counterpoint={session.notes}
            cantusVoice={VIEW.cantusVoice}
            clefs={clefs}
            selected={session.selected}
            cursor={cursor}
            label={label}
            marks={marks}
            overlay={overlay}
            onPlace={(col, natural) => {
              // An inactive score only takes a bar-selecting click.
              if (!active) {
                setActive(true);
                browse(col);
                return;
              }
              update(place(session, col, natural));
            }}
            onSelect={(col) => {
              setActive(true);
              browse(col);
            }}
          />
        </div>
        <div className="controls">
          <div className="group" role="group" aria-label="accidental">
            {([[-1, "ui.accidental.flat"], [0, "ui.accidental.natural"], [1, "ui.accidental.sharp"]] as const).map(([a, key]) => (
              <button key={a} aria-pressed={session.accidental === a && session.notes[session.selected] === null} onClick={() => update(applyAccidental(session, a))}>
                {t(key)}
              </button>
            ))}
            <button onClick={() => update(clear(session), false)}>{t("ui.clear")}</button>
            <button onClick={() => update({ ...initialState(VIEW.cantus.length) }, false)}>{t("ui.clearAll")}</button>
          </div>
          <div className="group">
            <button className="primary" onClick={runEvaluation} disabled={missing > 0} title={missing > 0 ? t("ui.evaluate.incomplete", { missing }) : undefined}>
              {t("ui.evaluate")}
            </button>
          </div>
          <div className="group transport">
            <button onClick={play}>{playing ? t("ui.stop") : t("ui.play")}</button>
            <Knob id="tempo" label={t("ui.tempo")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => t("ui.tempo.value", { bpm: Math.round(v) })} onChange={(v) => setTempo(Math.round(v))} />
            <Knob id="volume" label={t("ui.volume")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
          </div>
          <div className="group">
            <button aria-pressed={showSynth} onClick={() => setShowSynth(!showSynth)}>{t("ui.synth")}</button>
            <button aria-pressed={showHints} onClick={() => setShowHints(!showHints)}>{t("ui.hints")}</button>
          </div>
          <div className="group">
            <button aria-pressed={clefMode === "modern"} onClick={() => setClefMode("modern")}>{t("ui.clefs.modern")}</button>
            <button aria-pressed={clefMode === "original"} onClick={() => setClefMode("original")}>{t("ui.clefs.original")}</button>
          </div>
        </div>
        {missing > 0 && <p className="help">{t("ui.evaluate.incomplete", { missing })}</p>}
        {showSynth && <SynthRack value={synth} onChange={setSynth} />}
        {result && (
          <section className="feedback" aria-live="polite">
            <Feedback result={result} cantus={VIEW.cantus} counterpoint={session.notes} cantusVoice={VIEW.cantusVoice} clefs={clefs} />
            {fuxSolution && (
              <div>
                <button onClick={() => setShowFux(!showFux)}>{showFux ? t("ui.fux.hide") : t("ui.fux.show")}</button>
                {showFux && (
                  <div className="fux">
                    <h3>{t("ui.fux.title", { figure: VIEW.figure ?? "" })}</h3>
                    <ScoreView
                      cantus={VIEW.cantus}
                      counterpoint={fuxSolution.counterpoint.notes.map((n) => n.pitch)}
                      cantusVoice={VIEW.cantusVoice}
                      clefs={clefs}
                      selected={-1}
                      cursor={-1}
                      label={t("ui.fux.title", { figure: VIEW.figure ?? "" })}
                      onPlace={() => {}}
                      onSelect={() => {}}
                      readOnly
                    />
                    <p className="help">
                      {(() => {
                        const cmp = compareWithOriginal(toPlayerSolution(session, repository.getExercise(VIEW.exerciseId!)!), fuxSolution);
                        return t("ui.fux.agreement", { same: cmp.points.filter((p) => p.same_pitch).length, total: cmp.points.length });
                      })()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        {audioStatus === "failed" && <p className="status error">{t("ui.audio.failed")}</p>}
        <p className="help">{t("ui.keyboard.help")}</p>
      </main>
      <footer>
        {showHints && <Hints step={STEP} cantus={VIEW.cantus} />}
        <p className="source">
          {VIEW.exerciseId
            ? t("ui.source.exercise", { figure, page: VIEW.page, license: VIEW.attribution.license })
            : t("ui.source.cantusOnly", { final: VIEW.modalFinal })}{" "}
          <a href={VIEW.attribution.urls.kern ?? VIEW.attribution.repository} target="_blank" rel="noreferrer">source</a>
        </p>
      </footer>
      {showCredits && <Credits onClose={() => setShowCredits(false)} />}
    </div>
  );
}
