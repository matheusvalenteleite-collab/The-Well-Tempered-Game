import { useEffect, useMemo, useRef, useState } from "react";
import { repository } from "../music/fux/load-browser.ts";
import { ALL_STEPS, COURSES, courseOf, rulesForStep, validateCurriculum } from "../counterpoint/curriculum/index.ts";
import { HOLD, REST, slotLength, sounding, timeline } from "../counterpoint/layout.ts";
import { evaluate, type Evaluation } from "../counterpoint/engine.ts";
import { exerciseView } from "../game/exercise-view.ts";
import { applyAccidental, clear, clearSpan, holdSelected, initialState, letterNote, moveNote, onsetOf, place, repeatPrevious, select, setRest, spanFromSelected, stepNote, type SessionState } from "../game/session.ts";
import { AudioEngine, renderLevel, SYNTH_PRESETS, type AudioStatus } from "../audio/engine.ts";
import { restoreSound, setMix as changeMix, shiftOctave, type SoundState } from "../audio/sound.ts";
import { encode, EXPORT_FORMATS, saveFile, type ExportFormat } from "../audio/export.ts";
import { loadSamples } from "../audio/voice.ts";
import { TEMPERAMENTS, type TemperamentId } from "../audio/temperament.ts";
import { SoundDesk, trackOrder } from "./SoundDesk.tsx";
import { DEFAULT_DRUMS, DRUM_PATTERNS, DRUM_KITS, DrumMachine, validLoopLength, type DrumSettings } from "../audio/drums.ts";
import { ExerciseNotes, RuleBasics } from "./Hints.tsx";
import { Study } from "./Study.tsx";
import { stepStudy } from "./study.ts";
import { Feedback } from "./Feedback.tsx";
import { HFader } from "./HFader.tsx";
import { NoteIcon } from "./NoteIcon.tsx";
import { Systems, ZOOM_MAX, ZOOM_MIN } from "./notation/Systems.tsx";
import { buildOverlay, neutralOverlay } from "./notation/overlay.ts";
import { Credits } from "./Credits.tsx";
import { FuxComparison } from "./FuxComparison.tsx";
import { realizeContinuo } from "../continuo/realize.ts";
import { playContinuo } from "../continuo/audio.ts";
import { continuoInput, continuoKey, continuoOptions, type PlayMode } from "../game/continuo-input.ts";
import { activeVersions, deriveVersion, heardLines, validVersions, VERSION_IDS, type VersionId, type Versions } from "../game/versions.ts";
import { trioFindings, trioVerdict } from "../game/trio-verdict.ts";
import { TrioReading } from "./TrioReading.tsx";
import { gatesOf, modeOf, startPasses, startPlayback, type PlaySetup } from "./playback.ts";
import { SavedPieces } from "./SavedPieces.tsx";
import { makePiece, restorePieces, type Piece, type Setup } from "../game/saved.ts";
import { DEFAULT_CONTINUO_SETTINGS, validContinuoSettings, type ContinuoSettings } from "../game/continuo-settings.ts";
import { CONTINUO_DEMO_MODE } from "../config.ts";
import { t } from "./i18n.ts";
import { Shell } from "./Shell.tsx";
import { Guide } from "./Guide.tsx";
import { BarRef } from "./BarRef.tsx";
import { useHighlight } from "./highlight.ts";
import { ScoreTools } from "./ScoreTools.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import type { NameStyle } from "../music/names.ts";
import { audio, store, stored, validDrumKit } from "./shared.ts";
import type { Step } from "../music/pitch.ts";

validateCurriculum(repository);
const STEPS = ALL_STEPS;
const VIEWS = STEPS.map((s) => exerciseView(repository, s));
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th"];
/** A fresh session: empty slots, except that a rest stands where the layout allows one (Fux's usual opening). */
const freshSession = (k: number) => {
  const v = VIEWS[k];
  const s = initialState(v.layout.length, v.signature);
  // Fifth species: Fux's opening half rest is one rest held over four quaver slots (D82).
  if (v.species === "fifth") return { ...s, notes: v.layout.map((sl, j) => (j === 0 ? REST : sl.restAllowed ? HOLD : null)) };
  return { ...s, notes: v.layout.map((sl) => (sl.restAllowed ? REST : null)) };
};

/** Milliseconds a bar must stay selected while browsing before it sounds. */
const DWELL_MS = 150;

const stepLabel = (k: number) => {
  const s = STEPS[k];
  const v = VIEWS[k];
  return `${s.ordinal} · ${v.modalFinal} · ${t(s.cantus_voice === "lower" ? "ui.nav.cfBelow" : "ui.nav.cfAbove")}`;
};
/** Ink of each derived version of the player's line (score and mixer). */
const VERSION_INK: Record<VersionId, string> = {
  inversion: "var(--ink-inversion)",
  retrograde: "var(--ink-retrograde)",
  retroInversion: "var(--ink-retro-inversion)",
  canon: "var(--ink-canon)",
};
const stepIndexOf = (id: string) => STEPS.findIndex((s) => s.id === id);

export function App({ onVoices }: { onVoices(n: 2 | 3): void }) {
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
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number" && v >= 0 && v <= 100));
  const [sound, setSound] = useState<SoundState>(() => restoreSound(stored<unknown>("wtg.sound3", null)));
  // The look (D81): the 1990s look by default, the classic one a click away.
  const [look, setLook] = useState<"retro" | "classic">(() => stored("wtg.look", "retro", (v) => v === "retro" || v === "classic"));
  useEffect(() => {
    document.documentElement.dataset.look = look;
    store("wtg.look", look);
  }, [look]);
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(() => stored("wtg.theme", "auto", (v) => v === "auto" || v === "light" || v === "dark"));
  const [drums, setDrums] = useState(() => stored("wtg.drums", false, (v) => typeof v === "boolean"));
  const [drumKit, setDrumKit] = useState<DrumSettings>(() => validDrumKit(stored<unknown>("wtg.drumkit", DEFAULT_DRUMS)));
  const [pieces, setPieces] = useState<Piece[]>(() => restorePieces(stored<unknown>("wtg.saved", []), validDrumKit));
  const [showSaved, setShowSaved] = useState(false);
  const [savedPlaying, setSavedPlaying] = useState<{ id: string; slot: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** Zoom of the score (D87): 1 is the size the screen chooses; pinch, Ctrl + wheel or − / +. */
  const [zoom, setZoom] = useState(() => stored("wtg.zoom", 1, (v) => typeof v === "number" && v >= ZOOM_MIN && v <= ZOOM_MAX));
  useEffect(() => store("wtg.zoom", zoom), [zoom]);
  const [fuxHeard, setFuxHeard] = useState(() => stored("wtg.fuxHeard", false, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.fuxHeard", fuxHeard), [fuxHeard]);
  const [storedVersions, setVersions] = useState<Versions>(() => validVersions(stored<unknown>("wtg.versions", null)));
  /** Advanced settings (D89): the versions (I, R, RI, C) are offered, and heard, only then. */
  const [advanced, setAdvanced] = useState(() => stored("wtg.advanced", false, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.advanced", advanced), [advanced]);
  const versions = useMemo<Versions>(() => (advanced ? storedVersions : { ...storedVersions, inversion: false, retrograde: false, retroInversion: false, canon: false }), [advanced, storedVersions]);
  const [continuo, setContinuo] = useState(() => stored("wtg.continuo", false, (v) => typeof v === "boolean"));
  const [continuoSettings, setContinuoSettings] = useState<ContinuoSettings>(() => validContinuoSettings(stored<unknown>("wtg.continuoSettings", DEFAULT_CONTINUO_SETTINGS)));
  const [loop, setLoop] = useState(() => stored("wtg.loop", true, (v) => typeof v === "boolean"));
  const [showNames, setShowNames] = useState(() => stored("wtg.names", false, (v) => typeof v === "boolean"));
  const [showIntervals, setShowIntervals] = useState(() => stored("wtg.intervals", false, (v) => typeof v === "boolean"));
  const [tuning, setTuning] = useState<TemperamentId>(() => stored<TemperamentId>("wtg.tuning", "equal", (v) => TEMPERAMENTS.includes(v as TemperamentId)));
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [showCredits, setShowCredits] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [showFux, setShowFux] = useState(false);
  /** The study area below: the rules of this exercise, or the Lectio (Fux's text and commentary). */
  /** The dock's tab (D94): the mixer, the evaluation, the rules, the lectio. */
  const [tab, setTab] = useState<string>(() => { const v: string = stored<string>("wtg.dock", "mixer", (x) => typeof x === "string"); return v === "rules" ? "guide" : v; });
  useEffect(() => store("wtg.dock", tab), [tab]);
  const [nameStyle, setNameStyle] = useState<NameStyle>(() => stored("wtg.nameStyle", "letters" as NameStyle, (v) => v === "letters" || v === "solfege"));
  useEffect(() => store("wtg.nameStyle", nameStyle), [nameStyle]);
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
    audio.setSoundState(sound);
    store("wtg.sound3", sound);
  }, [sound]);
  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    store("wtg.theme", theme);
  }, [theme]);
  useEffect(() => store("wtg.stepId", STEP.id), [stepIndex]);
  useEffect(() => {
    audio.loop = loop;
    store("wtg.loop", loop);
  }, [loop]);
  useEffect(() => store("wtg.names", showNames), [showNames]);
  useEffect(() => store("wtg.intervals", showIntervals), [showIntervals]);
  useEffect(() => {
    audio.drums = drums;
    store("wtg.drums", drums);
  }, [drums]);
  useEffect(() => {
    audio.setDrums(drumKit, VIEW.modalFinal);
    store("wtg.drumkit", drumKit);
  }, [drumKit, VIEW.modalFinal]);
  useEffect(() => store("wtg.continuo", continuo), [continuo]);
  useEffect(() => store("wtg.versions", storedVersions), [storedVersions]);
  useEffect(() => store("wtg.saved", pieces), [pieces]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => store("wtg.continuoSettings", continuoSettings), [continuoSettings]);
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
    setStepIndex(k);
  };

  /** The sonority of slot k: its bar's cantus note and the counterpoint note (if any). */
  const column = (k: number, notes = session.notes) => ({ cantus: VIEW.cantus[VIEW.layout[k].bar], counterpoint: sounding(notes[k]) ? notes[k] : null });
  const audition = (k: number, notes = session.notes) => void audio.playColumn(column(k, notes), audio.barSeconds * slotLength(VIEW.layout[k]));

  /** Undo/redo (D59): the written line's history, per exercise. */
  const history = useRef(new Map<number, { past: (string | null)[][]; future: (string | null)[][] }>());
  const hist = () => {
    let h = history.current.get(stepIndex);
    if (!h) history.current.set(stepIndex, (h = { past: [], future: [] }));
    return h;
  };
  const remember = (notes: (string | null)[]) => {
    const h = hist();
    h.past.push(notes);
    if (h.past.length > 200) h.past.shift();
    h.future = [];
  };
  const restore = (dir: "undo" | "redo") => {
    const h = hist();
    const from = dir === "undo" ? h.past : h.future;
    const to = dir === "undo" ? h.future : h.past;
    const notes = from.pop();
    if (!notes) return;
    to.push(session.notes);
    setSession({ ...session, notes });
    setResult(null);
  };

  const update = (next: SessionState, sound = true) => {
    if (next.notes.some((n, k) => n !== session.notes[k])) remember(session.notes);
    setSession(next);
    if (next.notes.some((n, k) => n !== session.notes[k])) {
      setResult(null);
    }
    const changed = next.notes[next.selected] !== session.notes[next.selected];
    if (sound && changed && sounding(next.notes[next.selected])) audition(next.selected, next.notes);
  };

  const FIFTH = VIEW.species === "fifth";
  /** Fifth species: the value written next, in quaver slots (1, 2, 3, 4, 6, 8: quaver to whole bar). */
  const [noteValue, setNoteValue] = useState(2);
  /** The slot written by the last letter (the selection has moved past it), for the arrows to correct. */
  const justWrote = useRef<number | null>(null);
  /** Keyboard entry: write the selected slot, sound it, and move on to the next slot. */
  const writeAndAdvance = (raw: SessionState, hold = false) => {
    // Fifth species (D82): the note lasts the chosen value; the selection moves past it.
    const next = FIFTH ? spanFromSelected(raw, VIEW.layout, noteValue) : raw;
    const w = next.selected;
    if (!hold && next.notes[w] === session.notes[w] && !sounding(next.notes[w])) return;
    const last = next.notes.length - 1;
    let to = w + 1;
    if (FIFTH) while (to <= last && next.notes[to] === HOLD) to++;
    update(w < last ? select(next, Math.min(last, to)) : next, false);
    if (!hold) audition(w, next.notes);
    justWrote.current = w < last ? w : null;
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
  (window as unknown as { wtgFux: string[] | null }).wtgFux = VIEW.fux;

  /** Judge a line for step k (the same evaluation as the Evaluate button). */
  const judge = (k: number, notes: (string | null)[]) => {
    const v = VIEWS[k];
    return evaluate(
      {
        species: v.species,
        modalFinal: v.modalFinal,
        cantusVoice: v.cantusVoice,
        cantus: v.cantus.map((p) => ({ pitch: p, duration: "1/1" })),
        counterpoint: notes.map((p, i) => ({ pitch: p === HOLD ? HOLD : sounding(p) ? p : null, duration: v.layout[i].duration })),
      },
      rulesForStep(STEPS[k].id),
    );
  };
  const missing = session.notes.filter((n, k) => n === null && !VIEW.layout[k].restAllowed).length;
  const toggleEvaluation = () => {
    if (result) {
      setResult(null);
      return;
    }
    if (missing > 0) return;
    const ev = evaluate(
      {
        species: VIEW.species,
        modalFinal: VIEW.modalFinal,
        cantusVoice: VIEW.cantusVoice,
        cantus: VIEW.cantus.map((p) => ({ pitch: p, duration: "1/1" })),
        counterpoint: session.notes.map((p, k) => ({ pitch: p === HOLD ? HOLD : sounding(p) ? p : null, duration: VIEW.layout[k].duration })),
      },
      rulesForStep(STEP.id),
    );
    setResult(ev);
    setTab("evaluation");
    // A star needs a clean result: no rule and no recommendation broken (owner decision D25).
    if (ev.violations.length === 0 && !stars.includes(STEP.id)) setStars([...stars, STEP.id]);
  };
  // Evaluate also judges each active version of the line against the cantus (D47).
  const versionResults = useMemo(() => {
    if (!result) return [];
    return activeVersions(versions).map((id) => {
      const notes = deriveVersion(id, session.notes, VIEW.modalFinal, versions.canonShift);
      const ev = evaluate(
        {
          species: VIEW.species,
          modalFinal: VIEW.modalFinal,
          cantusVoice: VIEW.cantusVoice,
          cantus: VIEW.cantus.map((p) => ({ pitch: p, duration: "1/1" })),
          counterpoint: notes.map((p, k) => ({ pitch: p === HOLD ? HOLD : sounding(p) ? p : null, duration: VIEW.layout[k].duration })),
        },
        rulesForStep(STEP.id),
      );
      return { id, notes, ev };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, versions, session.notes, STEP.id]);
  const fuxSolution = VIEW.exerciseId ? repository.getSolution(VIEW.exerciseId) : undefined;
  const marks = result ? result.violations.flatMap((v) => v.positions.map((c) => ({ column: c, severity: v.severity }))) : undefined;
  // After Evaluate: judged intervals and links; before, optionally the bare intervals (no colours).
  const overlay = useMemo(
    () => (result ? buildOverlay(result.violations, VIEW.cantus, session.notes, VIEW.layout) : showIntervals ? neutralOverlay(VIEW.cantus, session.notes, VIEW.layout) : undefined),
    [result, showIntervals, session.notes, VIEW],
  );

  // Fux's solution (overlay, comparison, playback) opens once the exercise is cleared, and then
  // stays open (D68): editing the line, undoing or switching the evaluation off never closes it;
  // only the player hides it. An exercise starred earlier is open from the start.
  const [unlocked, setUnlocked] = useState<string[]>([]);
  useEffect(() => {
    if (result?.passed && !unlocked.includes(STEP.id)) setUnlocked([...unlocked, STEP.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
  const fuxOpen = Boolean(VIEW.fux && (result?.passed || unlocked.includes(STEP.id) || stars.includes(STEP.id)));
  // What plays follows the activators (D88): Fux alone, the trio, or the player's lines.
  const playMode: PlayMode = modeOf(versions, fuxHeard, fuxOpen);
  /** An older setup's "fux" / "trio" becomes the switches it meant. */
  const setPlayMode = (m: PlayMode) => {
    setFuxHeard(m !== "player");
    if (m === "fux") setVersions((v) => ({ ...v, original: false, inversion: false, retrograde: false, retroInversion: false, canon: false }));
  };
  // While Fux's line plays alone, it is shown and the player's own line fades to a trace (D76).
  const fuxPlaying = playing && playMode === "fux" && fuxOpen;

  // Basso continuo (decision D44): generated for pleasure from whatever is written (demo mode),
  // realized for the player's line or Fux's, doubled colla parte for the trio. No part in grading.
  // The lines heard and shown: the written one (if on) and its active versions (D47).
  const lines = useMemo(() => heardLines(versions, session.notes, VIEW.modalFinal), [versions, session.notes, VIEW.modalFinal]);
  const heard = useMemo(() => lines.map((l) => l.notes), [lines]);
  const derived = (ln: typeof lines) => Object.fromEntries(ln.filter((l) => l.id !== "original").map((l) => [l.id, l.notes]));
  const shownLines = lines;
  /** The written line is on the score (switched on, or nothing else is): it can be edited. */
  const editable = shownLines[0].id === "original";
  // Octave moves (D79): the lines are drawn where they sound; what is written (and judged) is not moved.
  const octaveOf = (id: "original" | VersionId) => (id === "original" ? sound.counterpointOctave : sound.versionOctave[id]);
  /** A pitch clicked on the drawn (moved) line, back to where it is written. */
  const unmove = (natural: string) => (sound.counterpointOctave ? shiftOctave(natural, -sound.counterpointOctave) : natural);
  const moved = <T extends string | null>(notes: T[], n: number): T[] => (n ? notes.map((q) => (sounding(q) ? (shiftOctave(q, n) as T) : q)) : notes);
  const originalHeard = versions.original ? session.notes : session.notes.map(() => null);
  const continuoAllowed = CONTINUO_DEMO_MODE || Boolean(result?.passed);
  const continuoAvailable = continuo && continuoAllowed;
  const continuoMode: PlayMode = playMode !== "player" && fuxOpen ? playMode : "player";
  const cOpts = continuoOptions(continuoMode, continuoSettings);
  const cKey = continuoKey(STEP.id, continuoMode === "fux" ? VIEW.fux ?? [] : heard, continuoMode, cOpts);
  const continuoPlan = useMemo(() => {
    if (!continuoAvailable) return null;
    const input = continuoInput(VIEW, continuoMode === "fux" ? VIEW.fux! : heard, continuoMode);
    return { input, realization: realizeContinuo(input, cOpts) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuoAvailable, cKey]);
  const realizationFor = (mode: PlayMode) => {
    if (mode === continuoMode) return continuoPlan;
    const input = continuoInput(VIEW, mode === "fux" ? VIEW.fux! : heard, mode);
    return { input, realization: realizeContinuo(input, continuoOptions(mode, continuoSettings)) };
  };

  // Saved pieces (D49). A saved piece plays with its own sound set on the engine; the live
  // setup is put back when it stops.
  const applyAudio = (x: Pick<Piece, "sound" | "drums" | "drumKit" | "tuning" | "tempo" | "volume">, final: string) => {
    audio.setSoundState(x.sound);
    audio.drums = x.drums;
    audio.setDrums(x.drumKit, final);
    audio.temperament = x.tuning;
    audio.tempo = x.tempo;
    audio.setVolume(x.volume / 100);
  };
  const restoreAudio = () => {
    applyAudio({ sound, drums, drumKit, tuning, tempo, volume }, VIEW.modalFinal);
    audio.setGates(gatesOf({ versions, continuoOn: continuo, fuxHeard: fuxHeard && fuxOpen }));
    audio.loop = loop;
  };
  const stopSaved = () => {
    if (!savedPlaying) return;
    audio.stop();
    setSavedPlaying(null);
    restoreAudio();
  };
  const savePiece = () => {
    const when = new Date().toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const piece = makePiece(
      { stepId: STEP.id, notes: session.notes, versions, mode: playMode, sound, drums, drumKit, continuo: continuoAvailable, continuoSettings, tuning, tempo, volume },
      `${name} · ${when}`,
    );
    setPieces([piece, ...pieces]);
    setToast(t("ui.saved.done", { name: piece.name }));
  };
  const playPiece = (p: Piece) => {
    const same = savedPlaying?.id === p.id;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    if (same) {
      setSavedPlaying(null);
      restoreAudio();
      return;
    }
    const k = stepIndexOf(p.stepId);
    if (k < 0) return;
    const view = VIEWS[k];
    applyAudio(p, view.modalFinal);
    audio.loop = false;
    setSavedPlaying({ id: p.id, slot: -1 });
    const mode = p.mode !== "player" && !view.fux ? "player" : p.mode;
    startPlayback(audio, view, { notes: p.notes, versions: p.versions, mode, continuo: p.continuo, continuoSettings: p.continuoSettings, tuning: p.tuning }, (slot) => {
      if (slot < 0) {
        setSavedPlaying(null);
        restoreAudio();
      } else setSavedPlaying({ id: p.id, slot });
    });
  };
  /** Load a saved piece into the game: its exercise, line, versions and every setting. */
  const openPiece = (p: Piece) => {
    stopSaved();
    const k = stepIndexOf(p.stepId);
    if (k < 0) return;
    if (k !== stepIndex) goTo(k);
    setSessions((all) => all.map((x, i) => (i === k ? { ...x, notes: [...p.notes] } : x)));
    setResult(null);
    setVersions(p.versions);
    if (VERSION_IDS.some((id) => p.versions[id])) setAdvanced(true);
    setSound(structuredClone(p.sound));
    setDrums(p.drums);
    setDrumKit(p.drumKit);
    setContinuo(p.continuo);
    setContinuoSettings(p.continuoSettings);
    setTuning(p.tuning);
    setTempo(p.tempo);
    setVolume(p.volume);
    setPlayMode(p.mode);
    setShowSaved(false);
    setToast(t("ui.saved.opened", { name: p.name }));
  };

  /** Play all, or from slot `from` to the end (Space: from the selected bar, D93); loops start again at bar 1. */
  const play = (from = 0) => {
    if (savedPlaying) stopSaved();
    if (playing) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    setPlaying(true);
    startPlayback(audio, VIEW, { notes: session.notes, versions, mode: "player", continuo: continuoAllowed, continuoOn: continuo, continuoSettings, tuning, fuxAlong: fuxOpen, fuxHeard }, onLiveSlot, from, liveSetup);
  };
  function onLiveSlot(k: number) {
    setCursor(k);
    if (k < 0) setPlaying(false);
  }

  // Mix mode (D77): the export plays N loops in succession, each with its own setup (sounds and
  // mix, versions, line, drums, continuo, tempo, and which lines play), as one
  // continuous piece. The player sets the loops up one by one; ‹ › move between them.
  type Scene = Setup;
  const [mix, setMix] = useState<{ count: number; index: number; scenes: (Scene | null)[] } | null>(null);
  const [mixCount, setMixCount] = useState(4);
  const currentScene = (): Scene => ({
    stepId: STEP.id,
    notes: [...session.notes],
    versions: { ...versions },
    mode: playMode,
    sound: structuredClone(sound),
    drums,
    drumKit: { ...drumKit },
    continuo: continuoAvailable,
    continuoSettings: { ...continuoSettings },
    tuning,
    tempo,
    volume,
  });
  const loadScene = (x: Scene) => {
    setSessions((all) => all.map((ss, i) => (i === stepIndex ? { ...ss, notes: [...x.notes] } : ss)));
    setVersions(x.versions);
    if (VERSION_IDS.some((id) => x.versions[id])) setAdvanced(true);
    setSound(structuredClone(x.sound));
    setDrums(x.drums);
    setDrumKit(x.drumKit);
    setContinuo(x.continuo);
    setContinuoSettings(x.continuoSettings);
    setTuning(x.tuning);
    setTempo(x.tempo);
    setVolume(x.volume);
    setPlayMode(x.mode);
  };
  const startMix = (count: number) => {
    setMix({ count, index: 0, scenes: Array.from({ length: count }, () => null) });
    setExportPhase(null);
  };
  /** Keep the current setup as loop `index`, then show loop `to` (a new loop starts as a copy). */
  const mixGo = (to: number) => {
    if (!mix) return;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    const scenes = [...mix.scenes];
    scenes[mix.index] = currentScene();
    if (scenes[to]) loadScene(scenes[to]!);
    setMix({ ...mix, index: to, scenes });
  };
  const mixScenes = (): Scene[] => {
    if (!mix) return [];
    const scenes = [...mix.scenes];
    scenes[mix.index] = currentScene();
    // Loops never visited take the setup of the loop before them.
    for (let i = 0; i < scenes.length; i++) scenes[i] ??= scenes[i - 1] ?? currentScene();
    return scenes as Scene[];
  };

  // Export (D74, D75): what plays, as set up now, captured from the speakers' feed and saved as MP3
  // or WAV. The player chooses how many passes and how it ends: seamlessly (cut where the next pass
  // would start, so the file loops) or with the final cadence (the drums' ending and the reverb's
  // tail). The recording is live: everything played with meanwhile (faders, mute and solo, sounds,
  // versions, drums, continuo, tempo) is recorded as heard.
  const [exportPhase, setExportPhase] = useState<null | "choose" | "recording" | "encoding">(null);
  const [exportPasses, setExportPasses] = useState(1);
  const [exportEnding, setExportEnding] = useState<"seamless" | "final">(() => (loop ? "seamless" : "final"));
  const [exportPass, setExportPass] = useState(1);
  const [exportTotal, setExportTotal] = useState(1);
  /** The export dialog's step: one setup or mix mode? then the number of loops, or the options. */
  const [exportStep, setExportStep] = useState<"kind" | "mixCount" | "options">("kind");
  const exportTimer = useRef<number | null>(null);
  const exportStop = useRef<null | (() => void)>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const endExportTimer = () => {
    if (exportTimer.current !== null) window.clearInterval(exportTimer.current);
    exportTimer.current = null;
    exportStop.current = null;
    restoreAudio();
  };
  const cancelExport = async () => {
    endExportTimer();
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    await audio.stopCapture();
    setExportPhase(null);
  };
  const startExport = async (format: ExportFormat) => {
    stopSaved();
    audio.stop();
    setPlaying(false);
    try {
      await audio.startCapture();
    } catch {
      setToast(t("ui.export.failed"));
      setExportPhase(null);
      return;
    }
    const scenes = mix ? mixScenes() : null;
    const passes = scenes ? scenes.length : exportPasses;
    const ending = exportEnding;
    setExportPass(1);
    setExportTotal(passes);
    setExportPhase("recording");
    setPlaying(true);
    // Loop through the passes; the last one ends with the cadence when asked.
    audio.loop = passes > 1 || ending === "seamless";
    if (scenes) {
      // Mix mode: each pass is set up on the engine just before it is scheduled.
      const lastLoop = (i: number) => i < passes - 1 || ending === "seamless";
      startPasses(
        audio,
        VIEW,
        scenes.map((x) => ({ notes: x.notes, versions: x.versions, mode: x.mode, continuo: x.continuo, continuoOn: x.continuo, continuoSettings: x.continuoSettings, tuning: x.tuning })),
        (i) => {
          const x = scenes[i % passes];
          applyAudio(x, VIEW.modalFinal);
          audio.loop = lastLoop(i);
        },
        onLiveSlot,
      );
    } else startPlayback(audio, VIEW, { notes: session.notes, versions, mode: "player", continuo: continuoAllowed, continuoOn: continuo, continuoSettings, tuning, fuxAlong: fuxOpen, fuxHeard }, onLiveSlot, 0, liveSetup);
    const TAIL = 2.5;
    const finish = (span: [number, number] | null) => {
      endExportTimer();
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      setExportPhase("encoding");
      void audio.stopCapture(span?.[0], span?.[1]).then((data) => {
        // Let the "encoding" notice paint before the (synchronous) encoder runs.
        window.setTimeout(() => {
          if (data && data.channels[0].length > 0) {
            const base = `${stepStudy(STEP.id).name} ${VIEW.modalFinal}`.replace(/[^\p{L}\p{N} -]+/gu, "").trim() || "counterpoint";
            void saveFile(encode(format, data.channels, data.sampleRate), `${base}.${format}`).then((r) => {
              setToast(t(`ui.export.${r}`, { format: format.toUpperCase() }));
              setExportPhase(null);
            });
            return;
          }
          setToast(t("ui.export.failed"));
          setExportPhase(null);
        }, 30);
      });
    };
    // Stop now and keep what was recorded (the player's own "stop and save", or the play button).
    exportStop.current = () => {
      const c = audio.captureCycles;
      finish(c.length ? [c[0], audio.now] : null);
    };
    exportTimer.current = window.setInterval(() => {
      const c = audio.captureCycles;
      if (c.length) setExportPass(Math.min(passes, c.filter((x) => x <= audio.now).length || 1));
      // The last pass has started: let it end with the cadence.
      if (!scenes && ending === "final" && c.length >= passes) audio.loop = false;
      if (c.length > passes && audio.now >= c[passes] + 0.05) return finish([c[0], c[passes]]);
      if (ending === "final" && c.length >= passes && audio.playEnd !== null && audio.now >= audio.playEnd + TAIL) return finish([c[0], audio.playEnd + TAIL]);
      // The play button stopped it (not the piece ending on its own): keep what was recorded.
      if (!playingRef.current && audio.playEnd === null) exportStop.current?.();
    }, 100);
  };

  // Live changes (D57): what is heard follows the score while it plays. A change of the line, of the
  // versions or of the continuo restarts the playback at once, from the bar under the cursor.
  // Switching lines on and off (the versions, the original, the continuo) restarts nothing: it opens
  // or closes their channels (D78). Only what changes the notes themselves restarts.
  const liveSetupRef = useRef<PlaySetup | null>(null);
  liveSetupRef.current = { notes: session.notes, versions, mode: "player", continuo: continuoAllowed, continuoOn: continuo, continuoSettings, tuning, fuxAlong: fuxOpen, fuxHeard };
  const liveSetup = () => liveSetupRef.current!;
  const levels = useMemo(() => () => audio.levels(), [audio]);
  useEffect(() => {
    if (savedPlaying || exportPhase === "recording") return;
    audio.setGates(gatesOf({ versions, continuoOn: continuo, fuxHeard: fuxHeard && fuxOpen }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions, continuo, fuxHeard, fuxOpen]);
  // The continuo's notation only changes the score: it restarts nothing (D93).
  const liveKey = JSON.stringify([versions.canonShift, session.notes, continuoAllowed, { ...continuoSettings, display: null }, tuning, fuxOpen]);
  const lastLiveKey = useRef(liveKey);
  useEffect(() => {
    if (lastLiveKey.current === liveKey) return;
    lastLiveKey.current = liveKey;
    if (!playing || savedPlaying || exportPhase === "recording") return;
    startPlayback(audio, VIEW, { notes: session.notes, versions, mode: "player", continuo: continuoAllowed, continuoOn: continuo, continuoSettings, tuning, fuxAlong: fuxOpen, fuxHeard }, onLiveSlot, Math.max(0, cursor), liveSetup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  // Starting pitch for keyboard entry before anything is written: the cantus note an octave away.
  const startPitch = (k: number) => {
    const cf = VIEW.cantus[VIEW.layout[k].bar];
    const oct = Number(cf.slice(-1)) + (VIEW.cantusVoice === "lower" ? 1 : -1);
    return cf.slice(0, -1) + oct;
  };

  /** Keys drive the score wherever focus is (buttons, knobs), except in form fields and dialogs. */
  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && ["TEXTAREA", "SELECT", "INPUT"].includes(target.tagName)) return;
    if (!showCredits && !showSaved && (e.ctrlKey || e.metaKey) && !e.altKey && editable) {
      const key = e.key.toLowerCase();
      if (key === "z" || key === "y") {
        restore(key === "y" || e.shiftKey ? "redo" : "undo");
        e.preventDefault();
        return;
      }
    }
    // F1-F9 switch the numbered tracks on and off, as Ableton's F1-F8 switch its track activators (D85).
    if (/^F[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !showCredits && !showSaved && exportPhase === null) {
      const track = trackOrder(advanced)[Number(e.key.slice(1)) - 1];
      const n = track === undefined ? 0 : track === "cantus" ? 1 : track === "counterpoint" ? 2 : track === "fux" ? 3 : track === "drums" ? 8 : track === "continuo" ? 9 : 4 + VERSION_IDS.indexOf(track as VersionId);
      if (n === 1) setSound(changeMix(sound, "cantus", { mute: !sound.mix.cantus.mute }));
      else if (n === 2) {
        const next = { ...versions, original: !versions.original };
        setVersions(next);
      }
      else if (n === 3) fuxOpen && setFuxHeard(!fuxHeard);
      else if (n >= 4 && n <= 7) {
        const id = VERSION_IDS[n - 4];
        const next = { ...versions, [id]: !versions[id] };
        setVersions(next);
      } else if (n === 8) setDrums(!drums);
      else if (n === 9) setContinuo(!continuo);
      e.preventDefault();
      return;
    }
    if (showCredits || showSaved || (exportPhase !== null && (exportPhase !== "recording" || ["p", "P", " "].includes(e.key))) || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const k = e.key;
    const s = session;
    // Only the written line is editable; while it is hidden (D47) the keys only browse and play.
    if (!editable && !["ArrowRight", "ArrowLeft", " ", "p", "P", "?"].includes(k)) return;
    const wrote = justWrote.current;
    justWrote.current = null;
    // Fifth species: the arrows step from note to note, over held slots (D82).
    const skipHolds = (from: number, d: number) => {
      let j = from + d;
      while (FIFTH && j > 0 && j < s.notes.length - 1 && s.notes[j] === HOLD) j += d;
      return j;
    };
    if (FIFTH && ["8", "4", "3", "2", "6", "1"].includes(k)) setNoteValue({ "8": 1, "4": 2, "3": 3, "2": 4, "6": 6, "1": 8 }[k]!);
    else if (k === "ArrowRight") browse(skipHolds(s.selected, 1));
    else if (k === "ArrowLeft") browse(skipHolds(s.selected, -1));
    else if (k === "ArrowUp" || k === "ArrowDown") {
      // Right after a letter the selection has moved on: the arrows correct the note just written
      // (the selection stays where it is). Shift moves by an octave.
      const delta = (k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 7 : 1);
      if (wrote !== null && wrote === s.selected - 1 && s.notes[s.selected] === null) {
        const fixed = stepNote(select(s, wrote), delta, startPitch(wrote));
        update(select(fixed, s.selected), false);
        audition(wrote, fixed.notes);
        justWrote.current = wrote;
      } else update(stepNote(FIFTH ? select(s, onsetOf(s.notes, s.selected)) : s, delta, startPitch(s.selected)));
    } else if (/^[a-gA-G]$/.test(k)) {
      const cur = s.notes[s.selected];
      writeAndAdvance(letterNote(s, k.toUpperCase() as Step, (sounding(cur) ? cur : null) ?? s.lastWritten ?? startPitch(s.selected)));
    } else if (k === "t" || k === "T" || k === "+") writeAndAdvance(FIFTH ? holdSelected(s, VIEW.layout, noteValue) : repeatPrevious(s), FIFTH);
    else if (k === "r" || k === "R") (FIFTH ? writeAndAdvance(setRest(s, VIEW.layout), true) : update(setRest(s, VIEW.layout), false));
    else if (k === "#") update(applyAccidental(s, 1));
    else if (k === "-") update(applyAccidental(s, -1));
    else if (k === "n") update(applyAccidental(s, 0));
    else if (k === "Delete" || k === "Backspace") update(FIFTH ? clearSpan(s) : VIEW.layout[s.selected].restAllowed ? setRest(s, VIEW.layout) : clear(s), false);
    else if (k === " ") play(VIEW.layout.findIndex((sl) => sl.bar === VIEW.layout[s.selected].bar));
    else if (k === "p" || k === "P") play();
    else if (k === "?") setTab("guide");
    else return;
    e.preventDefault();
  };
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const clefs = VIEW.clefs.modern;
  // Exercises are named, not numbered by figure; the figure stays in the source line below.
  const name = stepStudy(STEP.id).name;
  const figure = VIEW.figure ? t("ui.exercise.figure", { figure: VIEW.figure }) : t("ui.nav.fuxCantus");
  const label = `${name} ${t("ui.exercise.mode", { final: VIEW.modalFinal })}`;
  const starred = stars.includes(STEP.id);
  const highlight = useHighlight();

  // The evaluation in one line under the transport (D94); the details are in the dock.
  const barsOf = (v: { positions: number[] }) => [...new Set(v.positions.map((k) => (VIEW.layout[k]?.bar ?? 0) + 1))];
  const gist = (key: string) => t(key).split(/(?<=[.;:])\s/)[0].replace(/[.;:]$/, "");
  const summary = result && (
    <div className={result.passed ? "eval-summary ok" : "eval-summary bad"} role="status">
      <span className="verdict">{result.passed ? `✓ ${t("ui.summary.passed")}` : `✗ ${t("ui.summary.failed", { n: result.errors.length })}`}</span>
      {result.errors.slice(0, 2).map((v, i) => (
        <span key={i} className="summary-item">
          {" · "}
          <BarRef bars={barsOf(v).map((b) => b - 1)}>{t("ui.summary.bars", { bars: barsOf(v).join(", ") })}</BarRef> {gist(`hints.${v.messageKey}`)}
        </span>
      ))}
      {result.errors.length > 2 && <span className="summary-item"> · …</span>}
      <button className="link" onClick={() => setTab("evaluation")}>{t("ui.summary.open")} ▸</button>
    </div>
  );
  const exerciseSource = VIEW.exerciseId ? t("ui.source.exercise", { figure, page: VIEW.page, license: VIEW.attribution.license }) : t("ui.source.cantusOnly", { final: VIEW.modalFinal });

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
          <button className="icon" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} aria-label={t("ui.nav.prev")}>‹</button>
          <select
            id="voices"
            className="sel sel-voices"
            value={COURSE.voices}
            aria-label={t("ui.nav.voices")}
            onChange={(e) => {
              if (Number(e.target.value) === 3) {
                audio.stop();
                onVoices(3);
                return;
              }
              const c = COURSES.find((x) => x.voices === Number(e.target.value) && x.steps.length > 0);
              if (c) goTo(stepIndexOf(c.steps[0].id));
            }}
          >
            {[2, 3, 4].map((n) => (
              <option key={n} value={n} disabled={n !== 3 && !COURSES.some((c) => c.voices === n && c.steps.length > 0)}>
                {t("ui.nav.voicesN", { n })}
              </option>
            ))}
          </select>
          <select
            id="species"
            className="sel sel-species"
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
                  {c.steps.length > 0 ? ` · ${c.steps.filter((x) => stars.includes(x.id)).length}/${c.steps.length}` : ""}
                </option>
              );
            })}
          </select>
          <select id="exercise" className="sel sel-exercise" value={stepIndex} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
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
        </nav>
          <HeaderTools
            onSave={savePiece}
            onExport={() => {
              if (exportPhase === null) {
                setExportEnding(loop ? "seamless" : "final");
                setExportStep(mix ? "options" : "kind");
                setExportPhase("choose");
              } else if (exportPhase === "recording") exportStop.current?.();
            }}
            exporting={exportPhase !== null}
            onSaved={() => setShowSaved(true)}
            saved={pieces.length}
            advanced={advanced}
            onAdvanced={() => setAdvanced(!advanced)}
            look={look}
            onLook={() => setLook(look === "retro" ? "classic" : "retro")}
            theme={theme}
            onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")}
            onCredits={() => setShowCredits(true)}
            onHelp={() => setTab("guide")}
          />
        </>
      }
      score={
        <div className="score-wrap" ref={scoreRef} data-notes={JSON.stringify(session.notes)} aria-label={t("ui.help.short")}>
          <span className={starred ? "star earned" : "star"} aria-label={t(starred ? "ui.star.earned" : "ui.star.none")} title={t(starred ? "ui.star.earned" : "ui.star.none")}>
            {starred ? "★" : "☆"}
          </span>
          <Systems
            pulse={highlight ?? undefined}
            zoom={zoom}
            onZoom={setZoom}
            zoomLabels={{ in: t("ui.zoom.in"), out: t("ui.zoom.out"), reset: t("ui.zoom.reset") }}
            tools={
              <ScoreTools
                view={{ names: showNames ? nameStyle : "off", intervals: showIntervals }}
                onView={(v) => {
                  setShowNames(v.names !== "off");
                  if (v.names !== "off") setNameStyle(v.names);
                  setShowIntervals(v.intervals);
                }}
                fux={VIEW.fux ? { open: fuxOpen, shown: showFux, onShow: setShowFux } : undefined}
              />
            }
            cantus={moved(VIEW.cantus, sound.cantusOctave)}
            counterpoint={moved(shownLines[0].notes, octaveOf(shownLines[0].id))}
            readOnly={!editable}
            playerInk={editable ? undefined : VERSION_INK[shownLines[0].id as VersionId]}
            playerLabel={editable ? (shownLines.length > 1 ? t("ui.versions.original") : undefined) : t(`ui.versions.${shownLines[0].id}`, { n: versions.canonShift })}
            extraLines={shownLines.slice(1).map((l) => ({ label: t(`ui.versions.${l.id}`, { n: versions.canonShift }), notes: moved(l.notes, octaveOf(l.id)), ink: VERSION_INK[l.id as VersionId] }))}
            extraIntervals={showIntervals}
            layout={VIEW.layout}
            cantusVoice={VIEW.cantusVoice}
            clefs={clefs}
            signature={VIEW.signature}
            selected={session.selected}
            cursor={cursor}
            label={label}
            marks={editable ? marks : undefined}
            overlay={editable ? overlay : undefined}
            fux={(showFux || fuxPlaying) && fuxOpen ? moved(VIEW.fux!, sound.fuxOctave) : undefined}
            fadePlayer={fuxPlaying}
            ties={VIEW.species === "fourth"}
            continuo={continuoPlan && continuoSettings.display !== "none" ? { realization: continuoPlan.realization, display: continuoSettings.display } : undefined}
            showNames={showNames}
            nameStyle={nameStyle}
            showGhost
            onPlace={(col, natural) => update(FIFTH ? spanFromSelected(place(session, col, unmove(natural)), VIEW.layout, noteValue) : place(session, col, unmove(natural)))}
            onSelect={(col) => browse(col)}
            onDrag={FIFTH ? undefined : (from, to, natural) => {
              if (!dragBase.current) remember(session.notes);
              dragBase.current ??= session;
              const next = moveNote(dragBase.current, from, to, unmove(natural));
              setSession(next);
              setResult(null);
            }}
            onDragEnd={() => {
              if (!dragBase.current) return;
              dragBase.current = null;
              const k = session.selected;
              if (sounding(session.notes[k])) audition(k);
            }}
          />
        </div>
      }
      transport={
        <>
        <div className="controls">
          <div className="group write" role="group" aria-label={t("ui.group.write")}>
            {([[-1, "ui.accidental.flat"], [0, "ui.accidental.natural"], [1, "ui.accidental.sharp"]] as const).map(([a, key]) => (
              <button key={a} className="btn-acc" aria-pressed={session.accidental === a && !sounding(session.notes[session.selected])} onClick={() => update(applyAccidental(session, a))} title={t(`${key}.help`)}>
                {t(key)}
              </button>
            ))}
            {VIEW.layout.some((sl) => sl.restAllowed) && (
              <button className="btn-rest" aria-pressed={session.notes[session.selected] === REST} disabled={!VIEW.layout[session.selected]?.restAllowed} onClick={() => update(setRest(session, VIEW.layout), false)} title={t("ui.rest.help")}>
                {t("ui.rest")}
              </button>
            )}
            {VIEW.species === "fourth" && (
              <button className="btn-hold" onClick={() => writeAndAdvance(repeatPrevious(session))} disabled={!sounding(session.notes[session.selected - 1])} title={t("ui.tie.help")}>
                {t("ui.tie")}
              </button>
            )}
            {FIFTH && (
              <span className="values" role="radiogroup" aria-label={t("ui.value")}>
                {([[1, "8"], [2, "4"], [3, "3"], [4, "2"], [6, "6"], [8, "1"]] as const).map(([n, key]) => (
                  <button key={n} className="btn-val" role="radio" aria-checked={noteValue === n} aria-pressed={noteValue === n} onClick={() => setNoteValue(n)} title={t(`ui.value.${n}`, { key })} aria-label={t(`ui.value.${n}`, { key })}>
                    <NoteIcon slots={n} />
                  </button>
                ))}
                <button className="btn-hold" onClick={() => writeAndAdvance(holdSelected(session, VIEW.layout, noteValue), true)} disabled={session.selected === 0 || session.notes[session.selected - 1] === null} title={t("ui.hold.help")}>
                  {t("ui.hold")}
                </button>
              </span>
            )}
            <button className="btn-edit" onClick={() => update(freshSession(stepIndex), false)} title={t("ui.clearAll.help")}>{t("ui.clearAll")}</button>
            <button className="icon btn-edit" onClick={() => restore("undo")} disabled={!editable || hist().past.length === 0} aria-label={t("ui.undo")} title={t("ui.undoHelp")}>↶</button>
            <button className="icon btn-edit" onClick={() => restore("redo")} disabled={!editable || hist().future.length === 0} aria-label={t("ui.redo")} title={t("ui.redoHelp")}>↷</button>
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={result !== null} onClick={toggleEvaluation} disabled={missing > 0 && !result} title={missing > 0 ? t("ui.evaluate.incomplete", { missing }) : undefined}>
              {t("ui.evaluate")}
              {missing > 0 && !result && <span className="badge" aria-label={t("ui.evaluate.incomplete", { missing })}>{missing}</span>}
            </button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <div className="play-split">
              <button className="icon play" onClick={() => play()} aria-label={t("ui.play.player")} title={t("ui.play.player")}>
                {playing ? "■" : "▶"}
              </button>
              <button className="from-bar" onClick={() => play(VIEW.layout.findIndex((sl) => sl.bar === VIEW.layout[session.selected].bar))} aria-label={t("ui.play.fromBar")} title={t("ui.play.fromBar")}>
                ▶|
              </button>
              <button className="loop" aria-pressed={loop} onClick={() => setLoop(!loop)} aria-label={t("ui.loop")} title={t(loop ? "ui.loop.on" : "ui.loop.off")}>⟲</button>
            </div>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={240} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
              <HFader label={t("ui.volume")} help={t("ui.volume.help")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
            </div>
          </div>
        </div>
        {audioStatus === "failed" && <p className="status error">{t("ui.audio.failed")}</p>}
        </>
      }
      summary={summary}
      tab={tab}
      onTab={setTab}
      idle={exerciseSource}
      tabs={[
        { id: "mixer", label: t("ui.dock.mixer"), content: (
          <SoundDesk
            advanced={advanced}
            open
            onOpen={() => undefined}
            continuo={continuo}
            onContinuo={setContinuo}
            continuoSettings={continuoSettings}
            onContinuoSettings={setContinuoSettings}
            versions={versions}
            onVersions={setVersions}
            slots={VIEW.layout.length}
            showFux={showFux && fuxOpen}
            onShowFux={setShowFux}
            fuxHeard={fuxHeard}
            onFuxHeard={setFuxHeard}
            levels={levels}
            value={sound}
            onChange={setSound}
            fuxOpen={fuxOpen}
            drums={drums}
            onDrums={setDrums}
            drumKit={drumKit}
            onDrumKit={setDrumKit}
            onPreviewDrums={() => !playing && void audio.previewDrums()}
            onTempo={setTempo}
            master={volume}
            onMaster={setVolume}
            tuning={tuning}
            onTuning={setTuning}
          />
        ) },
        { id: "evaluation", text: true, label: t("ui.dock.evaluation"), content: (
          <>
        {result ? (
          <section className="feedback" aria-live="polite">
            <Feedback
              result={result} cantus={VIEW.cantus} counterpoint={session.notes} cantusVoice={VIEW.cantusVoice} clefs={clefs} signature={VIEW.signature} layout={VIEW.layout} ties={VIEW.species === "fourth"} audio={audio}
              actions={result.passed && stepIndex < STEPS.length - 1 ? <button className="next" onClick={() => goTo(stepIndex + 1)}>{t("ui.nav.nextExercise")} ›</button> : undefined}
            />
            {versionResults.length > 0 && <h3 className="eval-h">{t("ui.result.versionsTitle")}</h3>}
            {versionResults.map((v) => (
              <div key={v.id} className="version-eval">
                <h4 style={{ color: VERSION_INK[v.id] }}>{t(`ui.versions.${v.id}`, { n: versions.canonShift })}</h4>
                <Feedback compact result={v.ev} cantus={VIEW.cantus} counterpoint={v.notes} cantusVoice={VIEW.cantusVoice} clefs={clefs} signature={VIEW.signature} layout={VIEW.layout} ties={VIEW.species === "fourth"} audio={audio} />
              </div>
            ))}
            {fuxSolution && VIEW.fux && (
              <div className="with-fux">
                <h3 className="eval-h">
                  {t("ui.withFux.title")}
                  {fuxOpen && <button className="btn-view" aria-pressed={showFux} onClick={() => setShowFux(!showFux)}>{showFux ? t("ui.fux.hide") : t("ui.fux.show")}</button>}
                </h3>
                {!fuxOpen ? (
                  <p className="help">{t("ui.withFux.locked")}</p>
                ) : missing > 0 ? (
                  <p className="help">{t("ui.withFux.incomplete")}</p>
                ) : (
                  (() => {
                    const v = trioVerdict(VIEW.cantus, session.notes, VIEW.fux!, VIEW.layout);
                    const pct = v.places ? Math.round((100 * v.same) / v.places) : 0;
                    const args = { pct, same: v.same, n: v.places, clean: v.clean, bad: v.places - v.clean };
                    return (
                      <>
                        <div className={`with-fux-verdict ${v.grade}`}>
                          <span className="with-fux-badge" data-info={t("ui.withFux.badgeHelp", args)}>{v.grade === "identical" ? t("ui.withFux.badge.identical") : t("ui.withFux.badge", args)}</span>
                          <p>{t(`ui.withFux.${v.grade}`, args)}</p>
                        </div>
                        {v.grade !== "identical" && <FuxComparison cantus={VIEW.cantus} player={session.notes} fux={VIEW.fux!} layout={VIEW.layout} />}
                        {v.grade !== "identical" && COURSE.voices === 2 && <TrioReading findings={trioFindings(VIEW.cantus, session.notes, VIEW.fux!, VIEW.layout)} layout={VIEW.layout} />}
                      </>
                    );
                  })()
                )}
              </div>
            )}
          </section>
        ) : (
          <p className="dock-empty">{t("ui.dock.noEvaluation")}</p>
        )}
          </>
        ) },
        { id: "guide", text: true, label: t("ui.howtoTab"), content: (
          <Guide basics={<RuleBasics step={STEP} cantus={VIEW.cantus} />} exercise={<>
            <blockquote className="tutor" lang="en">
              <span className="speaker">{t("tutor.speaker.aloysius")}.</span> “{stepStudy(STEP.id).intro.en}”
              <cite title={stepStudy(STEP.id).intro.la} lang="la">{t("ui.tutor.cite", { page: stepStudy(STEP.id).intro.page })}</cite>
            </blockquote>
            <ExerciseNotes step={STEP} cantus={VIEW.cantus} />
          </>} />
        ) },
        { id: "lectio", text: true, label: t("ui.study"), content: (
          <>
            <Study step={STEP} />
            <p className="source">
              {exerciseSource} <a href={VIEW.attribution.urls.kern ?? VIEW.attribution.repository} target="_blank" rel="noreferrer">source</a>
            </p>
          </>
        ) },
      ]}
      overlays={
        <>
      {showCredits && <Credits onClose={() => setShowCredits(false)} />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {showSaved && (
        <SavedPieces
          pieces={pieces}
          playing={savedPlaying}
          viewOf={(id) => VIEWS[stepIndexOf(id)] ?? null}
          stepName={(id) => (stepIndexOf(id) >= 0 ? stepStudy(id).name : id)}
          onPlay={playPiece}
          onOpen={openPiece}
          onRename={(id, n) => setPieces(pieces.map((x) => (x.id === id ? { ...x, name: n } : x)))}
          onDelete={(id) => {
            if (savedPlaying?.id === id) stopSaved();
            setPieces(pieces.filter((x) => x.id !== id));
          }}
          onClose={() => {
            stopSaved();
            setShowSaved(false);
          }}
        />
      )}
      {(exportPhase === "choose" || exportPhase === "encoding") && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={t("ui.export")} onClick={() => exportPhase === "choose" && setExportPhase(null)}>
          <div className="dialog export-card" onClick={(e) => e.stopPropagation()}>
            <h2>{t("ui.export")}</h2>
            {exportPhase === "choose" && exportStep === "kind" && (
              <>
                <p>{t("ui.export.kindQuestion")}</p>
                <div className="export-formats">
                  <button onClick={() => setExportStep("options")}>
                    <strong>{t("ui.export.kind.single")}</strong> <span className="help">{t("ui.export.kind.single.help")}</span>
                  </button>
                  <button className="primary" onClick={() => setExportStep("mixCount")}>
                    <strong>{t("ui.export.kind.mix")}</strong> <span className="help">{t("ui.export.kind.mix.help")}</span>
                  </button>
                </div>
                <button onClick={() => setExportPhase(null)}>{t("ui.close")}</button>
              </>
            )}
            {exportPhase === "choose" && exportStep === "mixCount" && (
              <>
                <p>{t("ui.export.mixCountQuestion")}</p>
                <div className="export-options">
                  <label>{t("ui.export.loops")}</label>
                  <span className="octave">
                    <button className="chipbtn" disabled={mixCount <= 2} onClick={() => setMixCount(mixCount - 1)} aria-label={t("ui.export.fewer")}>‹</button>
                    <span>{t("ui.export.passMany", { n: mixCount })}</span>
                    <button className="chipbtn" disabled={mixCount >= 16} onClick={() => setMixCount(mixCount + 1)} aria-label={t("ui.export.more")}>›</button>
                  </span>
                </div>
                <p className="help">{t("ui.export.mixHow")}</p>
                <div className="export-formats">
                  <button className="primary" onClick={() => startMix(mixCount)}>{t("ui.export.mixStart")}</button>
                </div>
                <button onClick={() => setExportStep("kind")}>{t("ui.export.back")}</button>
              </>
            )}
            {exportPhase === "choose" && exportStep === "options" && (
              <>
                <p>{t(mix ? "ui.export.mixIntro" : "ui.export.intro", { n: mix?.count ?? 0 })}</p>
                <div className="export-options">
                  {!mix && (
                    <>
                      <label>{t("ui.export.passes")}</label>
                      <span className="octave">
                        <button className="chipbtn" disabled={exportPasses <= 1} onClick={() => setExportPasses(exportPasses - 1)} aria-label={t("ui.export.fewer")}>‹</button>
                        <span>{t(exportPasses === 1 ? "ui.export.passOne" : "ui.export.passMany", { n: exportPasses })}</span>
                        <button className="chipbtn" disabled={exportPasses >= 16} onClick={() => setExportPasses(exportPasses + 1)} aria-label={t("ui.export.more")}>›</button>
                      </span>
                    </>
                  )}
                  <label>{t("ui.export.ending")}</label>
                  <span className="segmented">
                    {(["seamless", "final"] as const).map((k) => (
                      <button key={k} className="chipbtn" aria-pressed={exportEnding === k} title={t(`ui.export.ending.${k}.help`)} onClick={() => setExportEnding(k)}>
                        {t(`ui.export.ending.${k}`)}
                      </button>
                    ))}
                  </span>
                </div>
                {!mix && <p className="help">{t("ui.export.live")}</p>}
                <div className="export-formats">
                  {EXPORT_FORMATS.map((f) => (
                    <button key={f} className={f === "mp3" ? "primary" : undefined} onClick={() => void startExport(f)}>
                      <strong>{f.toUpperCase()}</strong> <span className="help">{t(`ui.export.${f}`)}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => (mix ? setExportPhase(null) : setExportStep("kind"))}>{t(mix ? "ui.close" : "ui.export.back")}</button>
              </>
            )}
            {exportPhase === "encoding" && <p>{t("ui.export.encoding")}</p>}
          </div>
        </div>
      )}
      {exportPhase === "recording" && mix && <div className="recording-shield" aria-hidden="true" />}
      {mix && exportPhase === null && (
        <div className="recording-bar mix-bar" role="group" aria-label={t("ui.export.kind.mix")}>
          <strong>{t("ui.export.mixLoop", { n: mix.index + 1, total: mix.count })}</strong>
          <span className="help">{t(mix.scenes[mix.index] ? "ui.export.mixEditing" : "ui.export.mixSetUp")}</span>
          <button className="chipbtn" disabled={mix.index === 0} onClick={() => mixGo(mix.index - 1)} aria-label={t("ui.export.mixPrev")}>‹</button>
          <span className="mix-dots" aria-hidden="true">{mix.scenes.map((x, i) => (i === mix.index ? "●" : x ? "◉" : "○")).join(" ")}</span>
          <button className="chipbtn" disabled={mix.index === mix.count - 1} onClick={() => mixGo(mix.index + 1)} aria-label={t("ui.export.mixNext")}>›</button>
          <button className="primary" onClick={() => { setExportEnding(loop ? "seamless" : "final"); setExportStep("options"); setExportPhase("choose"); }}>{t("ui.export.mixExport")}</button>
          <button onClick={() => setMix(null)}>{t("ui.export.mixLeave")}</button>
        </div>
      )}
      {exportPhase === "recording" && (
        // Not modal: the desk, the score and the transport stay live while it records (one setup);
        // in mix mode the loops play as set up, so the page is shielded.
        <div className="recording-bar" role="status">
          <span className="rec-dot" aria-hidden="true">●</span>
          <span>{t("ui.export.recordingPass", { n: exportPass, total: exportTotal })}</span>
          <span className="help">{t(mix ? "ui.export.mixPlaying" : "ui.export.mixLive")}</span>
          <button onClick={() => exportStop.current?.()}>{t("ui.export.stopSave")}</button>
          <button onClick={() => void cancelExport()}>{t("ui.export.cancel")}</button>
        </div>
      )}
        </>
      }
    />
  );
}
