import { useEffect, useMemo, useRef, useState } from "react";
import { repository } from "../music/fux/load-browser.ts";
import { FUX_FIRST_SPECIES_CURRICULUM, rulesForStep, validateCurriculum } from "../counterpoint/curriculum/fux-first-species.ts";
import { evaluate, type Evaluation } from "../counterpoint/engine.ts";
import { compareWithOriginal } from "../music/fux/player.ts";
import { exerciseView } from "../game/exercise-view.ts";
import { applyAccidental, clear, initialState, letterNote, moveNote, place, select, stepNote, toPlayerSolution, type SessionState } from "../game/session.ts";
import { AudioEngine, DEFAULT_SYNTH, renderLevel, SYNTH_PRESETS, type AudioStatus, type VoiceSynths } from "../audio/engine.ts";
import { SynthRack, type SynthTarget } from "./SynthRack.tsx";
import { Hints } from "./Hints.tsx";
import { Feedback } from "./Feedback.tsx";
import { Knob } from "./Knob.tsx";
import { ScoreView } from "./notation/ScoreView.tsx";
import { buildOverlay } from "./notation/overlay.ts";
import { Credits } from "./Credits.tsx";
import { t } from "./i18n.ts";
import type { Step } from "../music/pitch.ts";

validateCurriculum(repository);
const STEPS = FUX_FIRST_SPECIES_CURRICULUM;
const VIEWS = STEPS.map((s) => exerciseView(repository, s));
const audio = new AudioEngine();
// Owner decision D15: synthesized sound only for now (the sampled piano stays in the engine, unused).
audio.sound = "chip";
// Read by the browser tests.
Object.assign(window as object, { wtgAudio: audio, wtgRenderLevel: renderLevel, wtgPresets: SYNTH_PRESETS });

/** Milliseconds a bar must stay selected while browsing before it sounds. */
const DWELL_MS = 1000;

/** Per-viewer conveniences in localStorage; the game works the same without them. */
function stored<T>(key: string, fallback: T, valid: (v: unknown) => boolean = () => true): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = JSON.parse(raw) as unknown;
    if (!valid(v)) return fallback;
    return typeof fallback === "object" && !Array.isArray(fallback) ? { ...fallback, ...(v as object) } : (v as T);
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

const stepLabel = (k: number) => {
  const s = STEPS[k];
  const v = VIEWS[k];
  const where = v.figure ? t("ui.exercise.figure", { figure: v.figure }) : t("ui.nav.fuxCantus");
  return `${s.ordinal}. ${where} · ${v.modalFinal} · ${t(s.cantus_voice === "lower" ? "ui.nav.cfBelow" : "ui.nav.cfAbove")}`;
};

export function App() {
  const [stepIndex, setStepIndex] = useState(() => stored("wtg.step", 0, (v) => typeof v === "number" && v >= 0 && v < STEPS.length));
  const STEP = STEPS[stepIndex];
  const VIEW = VIEWS[stepIndex];
  const [sessions, setSessions] = useState<SessionState[]>(() => VIEWS.map((v) => initialState(v.cantus.length)));
  const session = sessions[stepIndex];
  const setSession = (s: SessionState) => setSessions((all) => all.map((x, i) => (i === stepIndex ? s : x)));
  const [stars, setStars] = useState<string[]>(() => stored<string[]>("wtg.stars", [], (v) => Array.isArray(v)));
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 120));
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number" && v >= 0 && v <= 100));
  const [synth, setSynth] = useState<VoiceSynths>(() => {
    const v = stored<Partial<VoiceSynths>>("wtg.synth2", {}, (x) => typeof x === "object" && x !== null);
    return { cantus: { ...DEFAULT_SYNTH, ...v.cantus }, counterpoint: { ...DEFAULT_SYNTH, ...v.counterpoint } };
  });
  const [synthTarget, setSynthTarget] = useState<SynthTarget>("all");
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
  const dragBase = useRef<SessionState | null>(null);
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
    store("wtg.synth2", synth);
  }, [synth]);
  useEffect(() => store("wtg.step", stepIndex), [stepIndex]);
  useEffect(() => store("wtg.stars", stars), [stars]);

  const goTo = (k: number) => {
    if (k < 0 || k >= STEPS.length || k === stepIndex) return;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setResult(null);
    setShowFux(false);
    setStepIndex(k);
  };

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
  const browse = (col: number) => {
    browsing.current = true;
    update(select(session, col), false);
  };
  useEffect(() => {
    if (!browsing.current) return;
    browsing.current = false;
    const k = session.selected;
    const timer = window.setTimeout(() => void audio.playColumn(column(k)), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [session]);

  const missing = session.notes.filter((n) => n === null).length;
  const toggleEvaluation = () => {
    if (result) {
      setResult(null);
      setShowFux(false);
      return;
    }
    if (missing > 0) return;
    const ev = evaluate(
      {
        species: "first",
        modalFinal: VIEW.modalFinal,
        cantusVoice: VIEW.cantusVoice,
        cantus: VIEW.cantus.map((p) => ({ pitch: p, duration: "1/1" })),
        counterpoint: session.notes.map((p) => ({ pitch: p, duration: "1/1" })),
      },
      rulesForStep(STEP.id),
    );
    setResult(ev);
    if (ev.passed && !stars.includes(STEP.id)) setStars([...stars, STEP.id]);
  };
  const fuxSolution = VIEW.exerciseId ? repository.getSolution(VIEW.exerciseId) : undefined;
  const marks = result ? result.violations.flatMap((v) => v.positions.map((c) => ({ column: c, severity: v.severity }))) : undefined;
  const overlay = useMemo(() => (result ? buildOverlay(result.violations, VIEW.cantus, session.notes) : undefined), [result, session.notes, VIEW]);

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

  /** Keys drive the score wherever focus is (buttons, knobs), except in form fields and dialogs. */
  const onKey = (e: KeyboardEvent) => {
    if (showCredits || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const target = e.target as HTMLElement | null;
    if (target && ["TEXTAREA", "SELECT", "INPUT"].includes(target.tagName)) return;
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

  const clefs = VIEW.clefs.modern;
  const figure = VIEW.figure ? t("ui.exercise.figure", { figure: VIEW.figure }) : t("ui.nav.fuxCantus");
  const label = `${figure} ${t("ui.exercise.mode", { final: VIEW.modalFinal })}`;
  const starred = stars.includes(STEP.id);

  return (
    <div className="app">
      <header>
        <h1>{t("ui.title")}</h1>
        <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
          <button className="icon" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} aria-label={t("ui.nav.prev")}>‹</button>
          <select id="exercise" value={stepIndex} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
            {STEPS.map((s, k) => (
              <option key={s.id} value={k}>
                {stars.includes(s.id) ? "★ " : ""}
                {stepLabel(k)}
              </option>
            ))}
          </select>
          <button className="icon" onClick={() => goTo(stepIndex + 1)} disabled={stepIndex === STEPS.length - 1} aria-label={t("ui.nav.next")}>›</button>
          <button className="link" onClick={() => setShowCredits(true)}>{t("ui.credits")}</button>
        </nav>
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
          <span className={starred ? "star earned" : "star"} aria-label={t(starred ? "ui.star.earned" : "ui.star.none")} title={t(starred ? "ui.star.earned" : "ui.star.none")}>
            {starred ? "★" : "☆"}
          </span>
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
            onDrag={(from, to, natural) => {
              setActive(true);
              dragBase.current ??= session;
              const next = moveNote(dragBase.current, from, to, natural);
              setSession(next);
              setResult(null);
              setShowFux(false);
            }}
            onDragEnd={() => {
              if (!dragBase.current) return;
              dragBase.current = null;
              const k = session.selected;
              if (session.notes[k]) void audio.playColumn(column(k));
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
            <button onClick={() => update({ ...initialState(VIEW.cantus.length) }, false)}>{t("ui.clearAll")}</button>
          </div>
          <button className="primary" aria-pressed={result !== null} onClick={toggleEvaluation} disabled={missing > 0 && !result} title={missing > 0 ? t("ui.evaluate.incomplete", { missing }) : undefined}>
            {t("ui.evaluate")}
          </button>
          <div className="group transport">
            <button className="icon play" onClick={play} aria-label={playing ? t("ui.stop") : t("ui.play")} title={playing ? t("ui.stop") : t("ui.play")}>
              {playing ? "■" : "▶"}
            </button>
            <Knob id="tempo" label={t("ui.tempo")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            <Knob id="volume" label={t("ui.volume")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
          </div>
          <div className="group">
            <button aria-pressed={showSynth} onClick={() => setShowSynth(!showSynth)}>{t("ui.synth")}</button>
            <button aria-pressed={showHints} onClick={() => setShowHints(!showHints)}>{t("ui.hints")}</button>
          </div>
        </div>
        {missing > 0 && !result && <p className="help">{t("ui.evaluate.incomplete", { missing })}</p>}
        {showSynth && <SynthRack value={synth} target={synthTarget} onTarget={setSynthTarget} onChange={setSynth} />}
        {result && (
          <section className="feedback" aria-live="polite">
            <Feedback result={result} cantus={VIEW.cantus} counterpoint={session.notes} cantusVoice={VIEW.cantusVoice} clefs={clefs} audio={audio} />
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
