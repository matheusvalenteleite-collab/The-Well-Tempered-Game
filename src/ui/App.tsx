import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { repository } from "../music/fux/load-browser.ts";
import { FUX_FIRST_SPECIES_CURRICULUM, rulesForStep, validateCurriculum } from "../counterpoint/curriculum/fux-first-species.ts";
import { evaluate, type Evaluation } from "../counterpoint/engine.ts";
import { compareWithOriginal } from "../music/fux/player.ts";
import { exerciseView } from "../game/exercise-view.ts";
import { applyAccidental, clear, initialState, letterNote, place, select, stepNote, toPlayerSolution, type SessionState } from "../game/session.ts";
import { AudioEngine, type AudioStatus, type SoundId } from "../audio/engine.ts";
import { ScoreView } from "./notation/ScoreView.tsx";
import { Credits } from "./Credits.tsx";
import { t } from "./i18n.ts";
import type { Step } from "../music/pitch.ts";

validateCurriculum(repository);
// M2: one canonical exercise, the first of the book (Fig. 5).
const STEP = FUX_FIRST_SPECIES_CURRICULUM[0];
const VIEW = exerciseView(repository, STEP);
const audio = new AudioEngine();
const VOLUME_KEY = "wtg.volume";
function storedVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return localStorage.getItem(VOLUME_KEY) !== null && v >= 0 && v <= 100 ? v : 70;
  } catch {
    return 70;
  }
}

const SOUND_KEY = "wtg.sound";
/** Owner decision D15: 8-bit only for now; the piano option is hidden until its samples are verified. */
const PIANO_ENABLED = false;
function storedSound(): SoundId {
  if (!PIANO_ENABLED) return "chip";
  try {
    return localStorage.getItem(SOUND_KEY) === "piano" ? "piano" : "chip";
  } catch {
    return "chip";
  }
}
audio.sound = storedSound();

export function App() {
  const [session, setSession] = useState<SessionState>(() => initialState(VIEW.cantus.length));
  const [clefMode, setClefMode] = useState<"modern" | "original">("modern");
  const [tempo, setTempo] = useState(60);
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [showCredits, setShowCredits] = useState(false);
  const [sound, setSound] = useState<SoundId>(audio.sound);
  const [volume, setVolumeState] = useState(storedVolume);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [showFux, setShowFux] = useState(false);
  useEffect(() => audio.setVolume(volume / 100), [volume]);
  const setVolume = (v: number) => {
    setVolumeState(v);
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      /* not persisted */
    }
  };
  const scoreRef = useRef<HTMLDivElement>(null);
  audio.onStatus = setAudioStatus;

  const column = (k: number, notes = session.notes) => ({ cantus: VIEW.cantus[k], counterpoint: notes[k] });

  const update = useCallback(
    (next: SessionState, sound = true) => {
      setSession(next);
      if (next.notes.some((n, k) => n !== session.notes[k])) {
        setResult(null);
        setShowFux(false);
      }
      const changed = next.notes[next.selected] !== session.notes[next.selected];
      if (sound && changed && next.notes[next.selected]) void audio.playColumn(column(next.selected, next.notes));
    },
    [session],
  );

  const chooseSound = (s: SoundId) => {
    setSound(s);
    audio.setSound(s);
    setPlaying(false);
    setCursor(-1);
    try {
      localStorage.setItem(SOUND_KEY, s);
    } catch {
      /* preference not persisted */
    }
  };

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
  const marks = result ? result.violations.flatMap((v) => v.positions.map((column) => ({ column, severity: v.severity }))) : undefined;
  const barsText = (positions: number[]) => {
    const bars = [...new Set(positions)].sort((a, b) => a - b).map((p) => p + 1);
    return t(bars.length > 1 ? "ui.result.bars" : "ui.result.bar", { bars: bars.join(", ") });
  };

  const play = () => {
    if (playing) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    setPlaying(true);
    void audio.playAll(VIEW.cantus.map((_, k) => column(k)), tempo, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    });
  };

  // A reasonable starting pitch for keyboard entry: the cantus note an octave above or below.
  const startPitch = (k: number) => {
    const cf = VIEW.cantus[k];
    const oct = Number(cf.slice(-1)) + (VIEW.cantusVoice === "lower" ? 1 : -1);
    return cf.slice(0, -1) + oct;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    const s = session;
    if (k === "ArrowRight") update(select(s, s.selected + 1), false);
    else if (k === "ArrowLeft") update(select(s, s.selected - 1), false);
    else if (k === "ArrowUp") update(stepNote(s, 1, startPitch(s.selected)));
    else if (k === "ArrowDown") update(stepNote(s, -1, startPitch(s.selected)));
    else if (/^[a-gA-G]$/.test(k)) update(letterNote(s, k.toUpperCase() as Step, s.notes[s.selected] ?? s.notes[s.selected - 1] ?? startPitch(s.selected)));
    else if (k === "#") update(applyAccidental(s, 1));
    else if (k === "-") update(applyAccidental(s, -1));
    else if (k === "n") update(applyAccidental(s, 0));
    else if (k === "Delete" || k === "Backspace") update(clear(s), false);
    else if (k === " ") void audio.playColumn(column(s.selected));
    else if (k === "p" || k === "P") play();
    else return;
    e.preventDefault();
  };

  useEffect(() => scoreRef.current?.focus(), []);

  const clefs = clefMode === "modern" ? VIEW.clefs.modern : VIEW.clefs.original;
  const figure = VIEW.figure ? t("ui.exercise.figure", { figure: VIEW.figure }) : "";
  const label = useMemo(() => `${figure} ${t("ui.exercise.mode", { final: VIEW.modalFinal })}`, [figure]);

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
        <div className="score-wrap" ref={scoreRef} tabIndex={0} onKeyDown={onKey} data-notes={JSON.stringify(session.notes)} data-audio-notes={audio.notesStarted} aria-label={t("ui.keyboard.help")}>
          <ScoreView
            cantus={VIEW.cantus}
            counterpoint={session.notes}
            cantusVoice={VIEW.cantusVoice}
            clefs={clefs}
            selected={session.selected}
            cursor={cursor}
            label={label}
            marks={marks}
            onPlace={(col, natural) => update(place(session, col, natural))}
            onSelect={(col) => update(select(session, col), false)}
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
          </div>
          <div className="group">
            <button className="primary" onClick={runEvaluation} disabled={missing > 0} title={missing > 0 ? t("ui.evaluate.incomplete", { missing }) : undefined}>
              {t("ui.evaluate")}
            </button>
          </div>
          <div className="group">
            <button onClick={play}>{playing ? t("ui.stop") : t("ui.play")}</button>
            <label className="tempo">
              {t("ui.tempo", { bpm: tempo })}
              <input id="tempo" type="range" min={30} max={120} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
            </label>
            <label className="volume">
              {t("ui.volume")}
              <input id="volume" type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
            </label>
          </div>
          {PIANO_ENABLED && <div className="group" role="group" aria-label="sound">
            <button aria-pressed={sound === "piano"} onClick={() => chooseSound("piano")}>{t("ui.sound.piano")}</button>
            <button aria-pressed={sound === "chip"} onClick={() => chooseSound("chip")}>{t("ui.sound.chip")}</button>
          </div>}
          <div className="group">
            <button aria-pressed={clefMode === "modern"} onClick={() => setClefMode("modern")}>{t("ui.clefs.modern")}</button>
            <button aria-pressed={clefMode === "original"} onClick={() => setClefMode("original")}>{t("ui.clefs.original")}</button>
          </div>
        </div>
        {missing > 0 && <p className="help">{t("ui.evaluate.incomplete", { missing })}</p>}
        {result && (
          <section className="feedback" aria-live="polite">
            <div className={result.passed ? "verdict ok" : "verdict bad"}>{result.passed ? t("ui.result.cleared") : t("ui.result.notCleared")}</div>
            <blockquote className="tutor">
              <span className="speaker">{t("tutor.speaker.aloysius")}.</span>{" "}
              {t(!result.passed ? "tutor.result.notCleared" : result.warnings.length ? "tutor.result.clearedWithWarnings" : "tutor.result.cleared")}
            </blockquote>
            {result.violations.length > 0 && (
              <ul>
                {[...result.errors, ...result.warnings].map((v, i) => (
                  <li key={i} className={v.severity}>
                    <div className="where">
                      {barsText(v.positions)} · {t(v.severity === "error" ? "ui.result.error" : "ui.result.warning")}
                    </div>
                    <div>{t(`tutor.${v.messageKey}`)}</div>
                    {v.detail && <div className="detail">{Object.entries(v.detail).map(([k, x]) => `${k}: ${x}`).join(" · ")}</div>}
                  </li>
                ))}
              </ul>
            )}
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
        {audioStatus === "loading" && <p className="status">{t("ui.audio.loading")}</p>}
        {audioStatus === "failed" && <p className="status error">{t("ui.audio.failed")}</p>}
        <p className="help">{t("ui.keyboard.help")}</p>
      </main>
      <footer>
        {VIEW.exerciseId
          ? t("ui.source.exercise", { figure, page: VIEW.page, license: VIEW.attribution.license })
          : t("ui.source.cantusOnly", { final: VIEW.modalFinal })}{" "}
        <a href={VIEW.attribution.urls.kern ?? VIEW.attribution.repository} target="_blank" rel="noreferrer">source</a>
      </footer>
      {showCredits && <Credits onClose={() => setShowCredits(false)} />}
    </div>
  );
}
