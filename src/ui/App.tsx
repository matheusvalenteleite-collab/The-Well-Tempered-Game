import { useEffect, useMemo, useRef, useState } from "react";
import { repository } from "../music/fux/load-browser.ts";
import { ALL_STEPS, COURSES, courseOf, rulesForStep, validateCurriculum } from "../counterpoint/curriculum/index.ts";
import { REST, slotLength, sounding, timeline } from "../counterpoint/layout.ts";
import { evaluate, type Evaluation } from "../counterpoint/engine.ts";
import { compareWithOriginal } from "../music/fux/player.ts";
import { exerciseView } from "../game/exercise-view.ts";
import { applyAccidental, clear, initialState, letterNote, moveNote, place, select, setRest, stepNote, toPlayerSolution, type SessionState } from "../game/session.ts";
import { AudioEngine, DEFAULT_SYNTH, renderLevel, sameSettings, SYNTH_PRESETS, type AudioStatus, type VoiceSynths } from "../audio/engine.ts";
import { TEMPERAMENTS, type TemperamentId } from "../audio/temperament.ts";
import { SynthRack, type SynthTarget } from "./SynthRack.tsx";
import { DrumBox } from "./DrumBox.tsx";
import { DEFAULT_DRUMS, DRUM_PATTERNS, DrumMachine, LOOP_LENGTHS, type DrumSettings } from "../audio/drums.ts";
import { Hints } from "./Hints.tsx";
import { Feedback } from "./Feedback.tsx";
import { Knob } from "./Knob.tsx";
import { ScoreView } from "./notation/ScoreView.tsx";
import { buildOverlay } from "./notation/overlay.ts";
import { Credits } from "./Credits.tsx";
import { FuxComparison } from "./FuxComparison.tsx";
import { t } from "./i18n.ts";
import type { Step } from "../music/pitch.ts";

validateCurriculum(repository);
const STEPS = ALL_STEPS;
const VIEWS = STEPS.map((s) => exerciseView(repository, s));
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th"];
/** A fresh session: empty slots, except that a rest stands where the layout allows one (Fux's usual opening). */
const freshSession = (k: number) => {
  const v = VIEWS[k];
  const s = initialState(v.layout.length);
  return { ...s, notes: v.layout.map((sl) => (sl.restAllowed ? REST : null)) };
};
const audio = new AudioEngine();
// Owner decision D15: synthesized sound only for now (the sampled piano stays in the engine, unused).
audio.sound = "chip";
// Read by the browser tests.
Object.assign(window as object, { wtgAudio: audio, wtgRenderLevel: renderLevel, wtgPresets: SYNTH_PRESETS, wtgDrumMachine: DrumMachine });

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
const stepIndexOf = (id: string) => STEPS.findIndex((s) => s.id === id);

export function App() {
  const [stepIndex, setStepIndex] = useState(() => {
    const id = stored<string>("wtg.stepId", STEPS[0].id, (v) => typeof v === "string" && stepIndexOf(v) >= 0);
    return stepIndexOf(id);
  });
  const STEP = STEPS[stepIndex];
  const VIEW = VIEWS[stepIndex];
  const COURSE = courseOf(STEP.id);
  const [sessions, setSessions] = useState<SessionState[]>(() => VIEWS.map((_, k) => freshSession(k)));
  const session = sessions[stepIndex];
  const setSession = (s: SessionState) => setSessions((all) => all.map((x, i) => (i === stepIndex ? s : x)));
  const [stars, setStars] = useState<string[]>(() => stored<string[]>("wtg.stars", [], (v) => Array.isArray(v)));
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 120));
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number" && v >= 0 && v <= 100));
  const [synth, setSynth] = useState<VoiceSynths>(() => {
    const v = stored<Partial<VoiceSynths>>("wtg.synth3", {}, (x) => typeof x === "object" && x !== null);
    return { cantus: { ...DEFAULT_SYNTH, ...v.cantus }, counterpoint: { ...DEFAULT_SYNTH, ...v.counterpoint } };
  });
  // "Both voices" by default; a stored pair of different settings opens on the Contrapunctus.
  const [synthTarget, setSynthTarget] = useState<SynthTarget>(() => (sameSettings(synth) ? "all" : "counterpoint"));
  const [drums, setDrums] = useState(() => stored("wtg.drums", false, (v) => typeof v === "boolean"));
  const [drumKit, setDrumKit] = useState<DrumSettings>(() => {
    const v = stored<DrumSettings>("wtg.drumkit", DEFAULT_DRUMS, (x) => typeof x === "object" && x !== null);
    const ok = DRUM_PATTERNS.some((p) => p.id === v.pattern) && LOOP_LENGTHS.includes(v.length) && typeof v.level === "number";
    return ok ? v : { ...DEFAULT_DRUMS };
  });
  const [showDrums, setShowDrums] = useState(false);
  const [tuning, setTuning] = useState<TemperamentId>(() => stored<TemperamentId>("wtg.tuning", "equal", (v) => TEMPERAMENTS.includes(v as TemperamentId)));
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
    store("wtg.synth3", synth);
  }, [synth]);
  useEffect(() => store("wtg.stepId", STEP.id), [stepIndex]);
  useEffect(() => {
    audio.drums = drums;
    store("wtg.drums", drums);
  }, [drums]);
  useEffect(() => {
    audio.setDrums(drumKit, VIEW.modalFinal);
    store("wtg.drumkit", drumKit);
  }, [drumKit, VIEW.modalFinal]);
  useEffect(() => {
    audio.temperament = tuning;
    store("wtg.tuning", tuning);
  }, [tuning]);
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

  /** The sonority of slot k: its bar's cantus note and the counterpoint note (if any). */
  const column = (k: number, notes = session.notes) => ({ cantus: VIEW.cantus[VIEW.layout[k].bar], counterpoint: sounding(notes[k]) ? notes[k] : null });
  const audition = (k: number, notes = session.notes) => void audio.playColumn(column(k, notes), audio.barSeconds * slotLength(VIEW.layout[k]));

  const update = (next: SessionState, sound = true) => {
    setSession(next);
    if (next.notes.some((n, k) => n !== session.notes[k])) {
      setResult(null);
      setShowFux(false);
    }
    const changed = next.notes[next.selected] !== session.notes[next.selected];
    if (sound && changed && sounding(next.notes[next.selected])) audition(next.selected, next.notes);
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
    const timer = window.setTimeout(() => audition(k), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [session]);

  // An empty slot where a rest is allowed counts as the rest.
  // Test hook: write a whole counterpoint at once (browser tests only).
  (window as unknown as { wtgSetNotes: (n: (string | null)[]) => void }).wtgSetNotes = (n) => update({ ...session, notes: n }, false);

  const missing = session.notes.filter((n, k) => n === null && !VIEW.layout[k].restAllowed).length;
  const toggleEvaluation = () => {
    if (result) {
      setResult(null);
      setShowFux(false);
      return;
    }
    if (missing > 0) return;
    const ev = evaluate(
      {
        species: VIEW.species,
        modalFinal: VIEW.modalFinal,
        cantusVoice: VIEW.cantusVoice,
        cantus: VIEW.cantus.map((p) => ({ pitch: p, duration: "1/1" })),
        counterpoint: session.notes.map((p, k) => ({ pitch: sounding(p) ? p : null, duration: VIEW.layout[k].duration })),
      },
      rulesForStep(STEP.id),
    );
    setResult(ev);
    // A star needs a clean result: no rule and no recommendation broken (owner decision D25).
    if (ev.violations.length === 0 && !stars.includes(STEP.id)) setStars([...stars, STEP.id]);
  };
  const fuxSolution = VIEW.exerciseId ? repository.getSolution(VIEW.exerciseId) : undefined;
  const marks = result ? result.violations.flatMap((v) => v.positions.map((c) => ({ column: c, severity: v.severity }))) : undefined;
  const overlay = useMemo(() => (result ? buildOverlay(result.violations, VIEW.cantus, session.notes, VIEW.layout) : undefined), [result, session.notes, VIEW]);

  // Fux's solution (overlay, comparison, playback) opens only once the exercise is cleared.
  const fuxOpen = Boolean(result?.passed && VIEW.fux);
  const [playMode, setPlayMode] = useState<"player" | "fux" | "trio">("player");
  const play = (mode: "player" | "fux" | "trio" = "player") => {
    if (playing) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      if (mode === playMode) return;
    }
    if (mode !== "player" && !fuxOpen) return;
    setPlayMode(mode);
    setPlaying(true);
    const events =
      mode === "player"
        ? timeline(VIEW.cantus, VIEW.layout, session.notes)
        : mode === "fux"
          ? timeline(VIEW.cantus, VIEW.layout, VIEW.fux!)
          : timeline(VIEW.cantus, VIEW.layout, session.notes, undefined, undefined, VIEW.fux!);
    void audio.playAll(events, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    });
  };

  // Starting pitch for keyboard entry before anything is written: the cantus note an octave away.
  const startPitch = (k: number) => {
    const cf = VIEW.cantus[VIEW.layout[k].bar];
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
    else if (/^[a-gA-G]$/.test(k)) {
      const cur = s.notes[s.selected];
      update(letterNote(s, k.toUpperCase() as Step, (sounding(cur) ? cur : null) ?? s.lastWritten ?? startPitch(s.selected)));
    } else if (k === "r" || k === "R") update(setRest(s, VIEW.layout), false);
    else if (k === "#") update(applyAccidental(s, 1));
    else if (k === "-") update(applyAccidental(s, -1));
    else if (k === "n") update(applyAccidental(s, 0));
    else if (k === "Delete" || k === "Backspace") update(VIEW.layout[s.selected].restAllowed ? setRest(s, VIEW.layout) : clear(s), false);
    else if (k === " ") audition(s.selected);
    else if (k === "p" || k === "P") play("player");
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
          <select
            id="voices"
            value={COURSE.voices}
            aria-label={t("ui.nav.voices")}
            onChange={(e) => {
              const c = COURSES.find((x) => x.voices === Number(e.target.value) && x.steps.length > 0);
              if (c) goTo(stepIndexOf(c.steps[0].id));
            }}
          >
            {[2, 3, 4].map((n) => (
              <option key={n} value={n} disabled={!COURSES.some((c) => c.voices === n && c.steps.length > 0)}>
                {t("ui.nav.voicesN", { n })}
              </option>
            ))}
          </select>
          <select
            id="species"
            value={COURSE.species}
            aria-label={t("ui.nav.species")}
            onChange={(e) => {
              const c = COURSES.find((x) => x.voices === COURSE.voices && x.species === Number(e.target.value));
              if (c && c.steps.length) goTo(stepIndexOf(c.steps[0].id));
            }}
          >
            {COURSES.filter((c) => c.voices === COURSE.voices).map((c) => {
              const done = c.steps.length > 0 && c.steps.every((x) => stars.includes(x.id));
              return (
                <option key={c.species} value={c.species} disabled={c.steps.length === 0}>
                  {done ? "★ " : ""}
                  {t("ui.nav.speciesN", { n: ORDINAL[c.species] })}
                </option>
              );
            })}
          </select>
          <select id="exercise" value={stepIndex} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
            {COURSE.steps.map((s) => {
              const k = stepIndexOf(s.id);
              return (
                <option key={s.id} value={k}>
                  {stars.includes(s.id) ? "★ " : ""}
                  {stepLabel(k)}
                </option>
              );
            })}
          </select>
          <button className="icon" onClick={() => goTo(stepIndex + 1)} disabled={stepIndex === STEPS.length - 1} aria-label={t("ui.nav.next")}>›</button>
          <button className="link" onClick={() => setShowCredits(true)}>{t("ui.credits")}</button>
        </nav>
      </header>
      <main>
        <p className="meta">
          {t("ui.mode.fux")} · {t("ui.nav.voicesN", { n: COURSE.voices })} · {t(`ui.species.${VIEW.species}`)} · {figure} · {t("ui.exercise.mode", { final: VIEW.modalFinal })} ·{" "}
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
            layout={VIEW.layout}
            cantusVoice={VIEW.cantusVoice}
            clefs={clefs}
            selected={session.selected}
            cursor={cursor}
            label={label}
            marks={marks}
            overlay={overlay}
            fux={showFux && fuxOpen ? VIEW.fux! : undefined}
            showGhost={active}
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
              if (sounding(session.notes[k])) audition(k);
            }}
          />
        </div>
        <div className="controls">
          <div className="group" role="group" aria-label="accidental">
            {([[-1, "ui.accidental.flat"], [0, "ui.accidental.natural"], [1, "ui.accidental.sharp"]] as const).map(([a, key]) => (
              <button key={a} aria-pressed={session.accidental === a && !sounding(session.notes[session.selected])} onClick={() => update(applyAccidental(session, a))}>
                {t(key)}
              </button>
            ))}
            {VIEW.layout.some((sl) => sl.restAllowed) && (
              <button
                aria-pressed={session.notes[session.selected] === REST}
                disabled={!VIEW.layout[session.selected]?.restAllowed}
                onClick={() => update(setRest(session, VIEW.layout), false)}
                title={t("ui.rest.help")}
              >
                {t("ui.rest")}
              </button>
            )}
            <button onClick={() => update(freshSession(stepIndex), false)}>{t("ui.clearAll")}</button>
          </div>
          <button className="primary" aria-pressed={result !== null} onClick={toggleEvaluation} disabled={missing > 0 && !result} title={missing > 0 ? t("ui.evaluate.incomplete", { missing }) : undefined}>
            {t("ui.evaluate")}
          </button>
          <div className="group transport">
            <div className="play-split">
              <button className="icon play" onClick={() => play("player")} aria-label={t("ui.play.player")} title={t("ui.play.player")}>
                {playing && playMode === "player" ? "■" : "▶"}
              </button>
              <div className="play-small">
                <button onClick={() => play("fux")} disabled={!fuxOpen} aria-label={t("ui.play.fux")} title={t(fuxOpen ? "ui.play.fux" : "ui.play.locked")}>
                  {playing && playMode === "fux" ? "■" : t("ui.play.fuxShort")}
                </button>
                <button onClick={() => play("trio")} disabled={!fuxOpen} aria-label={t("ui.play.trio")} title={t(fuxOpen ? "ui.play.trio" : "ui.play.locked")}>
                  {playing && playMode === "trio" ? "■" : t("ui.play.trioShort")}
                </button>
              </div>
            </div>
            <Knob id="tempo" label={t("ui.tempo")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            <Knob id="volume" label={t("ui.volume")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
            <button aria-pressed={drums} aria-expanded={showDrums} onClick={() => setShowDrums(!showDrums)} title={t("ui.drums.help")}>
              {t("ui.drums")}
              {drums ? " ●" : ""}
            </button>
            <button className="tuning" onClick={() => setTuning(TEMPERAMENTS[(TEMPERAMENTS.indexOf(tuning) + 1) % TEMPERAMENTS.length])} title={t("ui.tuning.help")}>
              {t(`ui.tuning.${tuning}`)}
            </button>
          </div>
          <div className="group">
            <button aria-pressed={showSynth} onClick={() => setShowSynth(!showSynth)}>{t("ui.synth")}</button>
            <button aria-pressed={showHints} onClick={() => setShowHints(!showHints)}>{t("ui.hints")}</button>
          </div>
        </div>
        {missing > 0 && !result && <p className="help">{t("ui.evaluate.incomplete", { missing })}</p>}
        {showDrums && <DrumBox on={drums} onToggle={setDrums} value={drumKit} onChange={setDrumKit} onPreview={() => !playing && void audio.previewDrums()} />}
        {showSynth && <SynthRack value={synth} target={synthTarget} onTarget={setSynthTarget} onChange={setSynth} />}
        {result && (
          <section className="feedback" aria-live="polite">
            <Feedback result={result} cantus={VIEW.cantus} counterpoint={session.notes} cantusVoice={VIEW.cantusVoice} clefs={clefs} layout={VIEW.layout} audio={audio} />
            {fuxSolution && VIEW.fux && !fuxOpen && <p className="help">{t("ui.fux.locked")}</p>}
            {fuxSolution && VIEW.fux && fuxOpen && (
              <div>
                <button aria-pressed={showFux} onClick={() => setShowFux(!showFux)}>{showFux ? t("ui.fux.hide") : t("ui.fux.show")}</button>
                {showFux && (
                  <div className="fux">
                    <p className="help">{t("ui.fux.overlayHelp")}</p>
                    <p className="help">
                      {(() => {
                        const filled = { ...session, notes: session.notes.map((n, k) => (n === null && VIEW.layout[k].restAllowed ? REST : n)) };
                        const cmp = compareWithOriginal(toPlayerSolution(filled, repository.getExercise(VIEW.exerciseId!)!, VIEW.layout), fuxSolution);
                        const key = VIEW.species === "first" ? "ui.fux.agreement" : "ui.fux.agreementNotes";
                        return t(key, { same: cmp.points.filter((p) => p.same_pitch).length, total: cmp.points.length });
                      })()}
                    </p>
                    {missing === 0 && (
                      <FuxComparison cantus={VIEW.cantus} player={session.notes} fux={VIEW.fux} layout={VIEW.layout} />
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        {audioStatus === "failed" && <p className="status error">{t("ui.audio.failed")}</p>}
        <p className="help">{t("ui.keyboard.help")}{VIEW.layout.some((sl) => sl.restAllowed) ? ` · ${t("ui.keyboard.rest")}` : ""}</p>
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
