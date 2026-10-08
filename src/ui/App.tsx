import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { repository } from "../music/fux/load-browser.ts";
import { FUX_FIRST_SPECIES_CURRICULUM, validateCurriculum } from "../counterpoint/curriculum/fux-first-species.ts";
import { exerciseView } from "../game/exercise-view.ts";
import { applyAccidental, clear, initialState, letterNote, place, select, stepNote, type SessionState } from "../game/session.ts";
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

const SOUND_KEY = "wtg.sound";
function storedSound(): SoundId {
  try {
    return localStorage.getItem(SOUND_KEY) === "chip" ? "chip" : "piano";
  } catch {
    return "piano";
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
  const scoreRef = useRef<HTMLDivElement>(null);
  audio.onStatus = setAudioStatus;

  const column = (k: number, notes = session.notes) => ({ cantus: VIEW.cantus[k], counterpoint: notes[k] });

  const update = useCallback(
    (next: SessionState, sound = true) => {
      setSession(next);
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
            <button className="primary" onClick={play}>{playing ? t("ui.stop") : t("ui.play")}</button>
            <label className="tempo">
              {t("ui.tempo", { bpm: tempo })}
              <input type="range" min={30} max={120} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
            </label>
          </div>
          <div className="group" role="group" aria-label="sound">
            <button aria-pressed={sound === "piano"} onClick={() => chooseSound("piano")}>{t("ui.sound.piano")}</button>
            <button aria-pressed={sound === "chip"} onClick={() => chooseSound("chip")}>{t("ui.sound.chip")}</button>
          </div>
          <div className="group">
            <button aria-pressed={clefMode === "modern"} onClick={() => setClefMode("modern")}>{t("ui.clefs.modern")}</button>
            <button aria-pressed={clefMode === "original"} onClick={() => setClefMode("original")}>{t("ui.clefs.original")}</button>
          </div>
        </div>
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
