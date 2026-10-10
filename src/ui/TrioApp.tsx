/**
 * Three voices (Exercitium II, D90): the player writes both voices that are not the cantus, in
 * any order. One engine and one mixer with the two-voice screen; no versions here (D89).
 * D113: the voices on two staves by register, voice chips (Cantus, Contra I, Contra II) in the
 * track colours, one mixer strip per written voice, the styles, and a comparison with Fux.
 */
import { ModeSelect } from "./ModeSelect.tsx";
import type { Mode } from "./Root.tsx";
import { useEffect, useMemo, useRef, useState } from "react";
import data from "../../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { barOfSlot, floridLayout, playerStaves, slotOfBar, TRIO_SPECIES, trioSteps, voiceSlots, type TrioSpecies, type TrioStep } from "../game/trio.ts";
import { evaluateTrio2 } from "../counterpoint/three-voice-second.ts";
import { evaluateTrioFlorid } from "../counterpoint/three-voice-florid.ts";
import { evaluateTrioFifth } from "../counterpoint/three-voice-fifth.ts";
import { evaluateTrio, type TrioEvaluation } from "../counterpoint/three-voice.ts";
import { applyAccidental, clear, clearSpan, holdSelected, initialState, letterNote, onsetOf, place, select, spanFromSelected, stepNote, type SessionState } from "../game/session.ts";
import { HOLD, REST, slotLayout, type PlayEvent } from "../counterpoint/layout.ts";
import { NoteIcon } from "./NoteIcon.tsx";
import { restoreSound, setMix as changeMix, type SoundState } from "../audio/sound.ts";
import { DEFAULT_DRUMS, type DrumSettings } from "../audio/drums.ts";
import { TEMPERAMENTS, type TemperamentId } from "../audio/temperament.ts";
import { DEFAULT_CONTINUO_SETTINGS, validContinuoSettings, type ContinuoSettings } from "../game/continuo-settings.ts";
import { continuoInput, continuoOptions } from "../game/continuo-input.ts";
import { realizeContinuo } from "../continuo/realize.ts";
import { playContinuo } from "../continuo/audio.ts";
import { DEFAULT_VERSIONS, type Versions } from "../game/versions.ts";
import { parsePitch, type Step } from "../music/pitch.ts";
import { TrioScore, type TrioVoice } from "./notation/TrioScore.tsx";
import { trioStaves } from "./notation/trio-staves.ts";
import { applyStyle, type StyleId } from "../audio/styles.ts";
import { ZOOM_MAX, ZOOM_MIN } from "./notation/zoom.ts";
import { SoundDesk, trackOrder } from "./SoundDesk.tsx";
import { HFader } from "./HFader.tsx";
import { audio, store, stored, validDrumKit } from "./shared.ts";
import { t } from "./i18n.ts";
import { Shell } from "./Shell.tsx";
import { Guide } from "./Guide.tsx";
import { BarRef } from "./BarRef.tsx";
import { useHighlight } from "./highlight.ts";
import { ScoreTools } from "./ScoreTools.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import type { GameLink } from "./App.tsx";
import { LearnLink } from "./LearnLink.tsx";
import { tt } from "../tutorial/text.ts";
import { useBeta } from "./beta.ts";
import { keyBelongsToControl, trackKey } from "./keys.ts";
import { exerciseOpen, furthestOpen } from "../game/unlock.ts";
import type { NameStyle } from "../music/names.ts";

/** Fux's three-voice exercises by species (D114, D116, D117: first to fifth). */
const BY_SPECIES = Object.fromEntries(TRIO_SPECIES.map((n) => [n, trioSteps(data as never, n)])) as Record<TrioSpecies, TrioStep[]>;
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th"];
const stepLabel = (s: TrioStep) => t("ui.trio3.step", { n: s.ordinal, fig: s.figure, final: s.modalFinal, where: t(`ui.trio3.cantus.${s.cantusIndex}`) });

type Sessions = Record<number, SessionState>;
const freshSessions = (s: TrioStep): Sessions =>
  Object.fromEntries(
    playerStaves(s).map((i) => {
      const st = initialState(voiceSlots(s, i));
      // The moving voice opens with Fux's half rest in second and fourth species (a note may replace it).
      if (i === s.movingIndex && s.per === 2) {
        st.notes[0] = REST;
        st.selected = 1;
      }
      // Fifth species: the half rest as in two voices (D82), one rest held over four quaver slots.
      if (i === s.movingIndex && s.per === 8) {
        for (let k = 0; k < 4; k++) st.notes[k] = k === 0 ? REST : HOLD;
        st.selected = 4;
      }
      return [i, st];
    }),
  );
/** Where a voice starts before anything is written: the middle line of its 1725 clef. */
const startPitch = (s: TrioStep, staff: number) => {
  const m = /^([CFG])(\d)$/.exec(s.clefs1725[staff])!;
  const anchor = { C: "C4", F: "F3", G: "G4" }[m[1] as "C" | "F" | "G"];
  const d = parsePitch(anchor).diatonic + (3 - Number(m[2])) * 2;
  return `${"CDEFGAB"[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`;
};

export function TrioApp({ onVoices, suspended, command, onTutorial }: { onVoices(n: Mode): void } & GameLink) {
  const [species, setSpecies] = useState<TrioSpecies>(() => stored<TrioSpecies>("wtg.trioSpecies", 1, (v) => TRIO_SPECIES.includes(v as TrioSpecies)));
  useEffect(() => store("wtg.trioSpecies", species), [species]);
  const STEPS = BY_SPECIES[species];
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, STEPS.findIndex((s) => s.id === stored("wtg.trioStep", STEPS[0].id))));
  const STEP = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  useEffect(() => store("wtg.trioStep", STEP.id), [STEP.id]);
  const [all, setAll] = useState<Record<string, Sessions>>({});
  const sessions = all[STEP.id] ?? freshSessions(STEP);
  const mine = playerStaves(STEP);
  const [active, setActive] = useState(mine[0]);
  const activeStaff = mine.includes(active) ? active : mine[0];
  const session = sessions[activeStaff];
  const setSessions = (next: Sessions) => setAll((xs) => ({ ...xs, [STEP.id]: next }));
  /** The bar being written, and which of its notes for the moving voice. */
  const activeBar = barOfSlot(STEP, activeStaff, session.selected);
  const activePart: number | null = activeStaff === STEP.movingIndex && activeBar < STEP.cantus.length - 1 ? session.selected % STEP.per : null;
  const [result, setResult] = useState<TrioEvaluation | null>(null);
  const [stars, setStars] = useState<string[]>(() => stored<string[]>("wtg.stars", [], (v) => Array.isArray(v)));
  /** Gold stars (D143): cleared with no advice broken either. */
  const [gold, setGold] = useState<string[]>(() => stored<string[]>("wtg.starsGold", [], (v) => Array.isArray(v)));
  useEffect(() => store("wtg.starsGold", gold), [gold]);
  useEffect(() => store("wtg.stars", stars), [stars]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const fuxOpen = Boolean(result?.passed || unlocked.includes(STEP.id) || stars.includes(STEP.id));

  // Settings shared with the two-voice screen.
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number" && v >= 0 && v <= 100));
  const [sound, setSound] = useState<SoundState>(() => restoreSound(stored<unknown>("wtg.sound3", null)));
  const [look, setLook] = useState<"retro" | "classic">(() => stored("wtg.look", "retro", (v) => v === "retro" || v === "classic"));
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(() => stored("wtg.theme", "auto", (v) => v === "auto" || v === "light" || v === "dark"));
  const [drums, setDrums] = useState(() => stored("wtg.drums", false, (v) => typeof v === "boolean"));
  const [drumKit, setDrumKit] = useState<DrumSettings>(() => validDrumKit(stored<unknown>("wtg.drumkit", DEFAULT_DRUMS)));
  const [continuo, setContinuo] = useState(() => stored("wtg.continuo", false, (v) => typeof v === "boolean"));
  const [continuoSettings, setContinuoSettings] = useState<ContinuoSettings>(() => validContinuoSettings(stored<unknown>("wtg.continuoSettings", DEFAULT_CONTINUO_SETTINGS)));
  const [tuning, setTuning] = useState<TemperamentId>(() => stored("wtg.tuning", "equal" as TemperamentId, (v) => TEMPERAMENTS.includes(v as TemperamentId)));
  const [loop, setLoop] = useState(() => stored("wtg.loop", true, (v) => typeof v === "boolean"));
  const [names, setNames] = useState(() => stored("wtg.names2", true, (v) => typeof v === "boolean"));
  const [figures, setFigures] = useState(() => stored("wtg.intervals2", true, (v) => typeof v === "boolean"));
  const [harmony, setHarmony] = useState(() => stored("wtg.harmony", false, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.harmony", harmony), [harmony]);
  const [zoom, setZoom] = useState(() => stored("wtg.zoom", 1, (v) => typeof v === "number" && v >= ZOOM_MIN && v <= ZOOM_MAX));
  const [fuxHeard, setFuxHeard] = useState(() => stored("wtg.fuxHeard", false, (v) => typeof v === "boolean"));
  const [showFux, setShowFux] = useState(false);
  const [tab, setTab] = useState<string>(() => stored("wtg.dock", "guide", (v) => typeof v === "string"));
  useEffect(() => store("wtg.dock", tab), [tab]);
  const [nameStyle, setNameStyle] = useState<NameStyle>(() => stored("wtg.nameStyle2", "solfege" as NameStyle, (v) => v === "letters" || v === "solfege"));
  useEffect(() => store("wtg.nameStyle2", nameStyle), [nameStyle]);
  const [versions, setVersions] = useState<Versions>({ ...DEFAULT_VERSIONS, original: true });
  /** Contra II's activator on the mixer (D113); Contra I's is the Contrapunctus's (versions.original). */
  const [secondOn, setSecondOn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);

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
    document.documentElement.dataset.look = look;
    store("wtg.look", look);
  }, [look]);
  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    store("wtg.theme", theme);
  }, [theme]);
  useEffect(() => {
    audio.drums = drums;
    store("wtg.drums", drums);
  }, [drums]);
  useEffect(() => {
    audio.setDrums(drumKit, STEP.modalFinal);
    store("wtg.drumkit", drumKit);
  }, [drumKit, STEP.modalFinal]);
  useEffect(() => store("wtg.continuo", continuo), [continuo]);
  useEffect(() => store("wtg.continuoSettings", continuoSettings), [continuoSettings]);
  useEffect(() => {
    audio.temperament = tuning;
    store("wtg.tuning", tuning);
  }, [tuning]);
  useEffect(() => {
    audio.loop = loop;
    store("wtg.loop", loop);
  }, [loop]);
  useEffect(() => store("wtg.names2", names), [names]);
  useEffect(() => store("wtg.intervals2", figures), [figures]);
  useEffect(() => store("wtg.zoom", zoom), [zoom]);
  useEffect(() => store("wtg.fuxHeard", fuxHeard), [fuxHeard]);
  useEffect(() => {
    audio.setGates({ counterpoint: versions.original, second: secondOn, fux: fuxHeard && fuxOpen, continuo });
  }, [versions.original, secondOn, fuxHeard, fuxOpen, continuo]);
  useEffect(() => () => audio.stop(), []);
  // The tutorial (D140): silent while it is open; the screen's own sound back on return.
  useEffect(() => {
    if (suspended) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    audio.setSoundState(sound);
    audio.drums = drums;
    audio.setDrums(drumKit, STEP.modalFinal);
    audio.loop = loop;
    audio.setGates({ counterpoint: versions.original, fux: fuxHeard && fuxOpen, continuo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspended]);

  /** The note each voice sounds at the start of bar k (the minim voice: its thesis, or its arsis after the rest). */
  const downOf = (line: (string | null)[], voice: number, k: number) => {
    if (voice !== STEP.movingIndex) return line[k];
    if (STEP.per === 8) {
      // Florid: the note sounding at the downbeat (held over the bar line), or the first one sung after a rest.
      const from = 8 * k;
      for (let s = from; s < (k === STEP.cantus.length - 1 ? from + 1 : from + 8); s++) {
        const d = line[s] === HOLD ? line[onsetOf(line, s)] : line[s];
        if (d && d !== REST && d !== HOLD) return d;
      }
      return null;
    }
    for (let j = 0; j < (k === STEP.cantus.length - 1 ? 1 : STEP.per); j++) {
      const d = line[STEP.per * k + j];
      if (d && d !== REST) return d;
    }
    return null;
  };
  const lines = (k: number) => [0, 1, 2].map((i) => (i === STEP.cantusIndex ? STEP.cantus[k] : downOf(sessions[i].notes, i, k)));
  const missing = mine.reduce((n, i) => n + sessions[i].notes.filter((x) => x === null).length, 0);

  // The real setup (D142): a star on an exercise opens the next; in BETA all is open.
  const beta = useBeta();
  const isOpen = (k: number) => k >= 0 && k < STEPS.length && exerciseOpen(STEPS[k].id, stars, beta);
  const goTo = (k: number) => {
    if (k < 0 || k >= STEPS.length || !isOpen(k)) return;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setResult(null);
    setShowFux(false);
    setStepIndex(k);
    setActive(playerStaves(STEPS[k])[0]);
  };
  const goToSpecies = (n: TrioSpecies) => {
    if (n === species || !exerciseOpen(BY_SPECIES[n][0].id, stars, beta)) return;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setResult(null);
    setShowFux(false);
    setSpecies(n);
    setStepIndex(0);
    setActive(playerStaves(BY_SPECIES[n][0])[0]);
  };
  /** Any three-voice exercise by id, whatever its species (the tutorial, the real setup). */
  const jumpTo = (id: string) => {
    const n = Number(/\.t(\d)\./.exec(id)?.[1]) as TrioSpecies;
    const k = BY_SPECIES[n]?.findIndex((x) => x.id === id) ?? -1;
    if (k < 0 || (n === species && k === stepIndex)) return;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setResult(null);
    setShowFux(false);
    setSpecies(n);
    setStepIndex(k);
    setActive(playerStaves(BY_SPECIES[n][k])[0]);
  };
  // On a locked exercise (the real setup switched on): where the learner stands, or back to two voices.
  useEffect(() => {
    if (isOpen(stepIndex)) return;
    const id = furthestOpen(stars, beta);
    if (id.startsWith("fux-mode.t")) jumpTo(id);
    else onVoices(id.startsWith("fux-mode.q") ? 4 : 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beta, stepIndex, species]);
  useEffect(() => {
    if (command) jumpTo(command.stepId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command?.n]);

  // Editing: every change withdraws the evaluation (as in two voices).
  const update = (staff: number, next: SessionState) => {
    setSessions({ ...sessions, [staff]: next });
    setResult(null);
  };
  const audition = (k: number, override?: { staff: number; pitch: string | null }) => {
    const ps = lines(k).map((p, i) => (override && i === override.staff ? (override.pitch === REST ? null : override.pitch) : p));
    const [a, b] = mine.map((i) => ps[i]);
    void audio.playSequence([{ slot: k, at: 0, length: 1, cantus: STEP.cantus[k], counterpoint: a ?? null, extra: b ? [{ channel: "second", pitch: b }] : [] }]);
  };
  /** Where a voice is entered in bar b: its first slot, or after the opening rest (held, in fifth species). */
  const entry = (i: number, b: number) => {
    if (!(i === STEP.movingIndex && b === 0 && sessions[i].notes[0] === REST)) return slotOfBar(STEP, i, b);
    let k = 1;
    while (sessions[i].notes[k] === HOLD) k++;
    return k;
  };
  const FLORID = STEP.per === 8;
  /** Fifth species: the value written next, in quaver slots (1, 2, 3, 4, 6, 8: quaver to whole bar). */
  const [noteValue, setNoteValue] = useState(2);
  /** Move the voice to slot k; the other voice follows to the same bar. */
  const moveTo = (staff: number, base: SessionState, k: number) => {
    const slot = Math.max(0, Math.min(voiceSlots(STEP, staff) - 1, k));
    const bar = barOfSlot(STEP, staff, slot);
    return Object.fromEntries(mine.map((i) => [i, i === staff ? select(base, slot) : select(sessions[i], entry(i, bar))]));
  };
  const write = (staff: number, raw: SessionState, advance: boolean) => {
    // Fifth species (D82): the note lasts the chosen value; the selection moves past it.
    const florid = FLORID && staff === STEP.movingIndex;
    const next = florid ? spanFromSelected(raw, floridLayout(STEP.cantus.length), noteValue) : raw;
    const k = next.selected;
    let to = k + 1;
    while (florid && to < next.notes.length - 1 && next.notes[to] === HOLD) to++;
    setSessions(moveTo(staff, next, advance ? to : k));
    setResult(null);
    audition(barOfSlot(STEP, staff, k), { staff, pitch: next.notes[k] === HOLD ? next.notes[onsetOf(next.notes, k)] : next.notes[k] });
  };
  /** One slot of the active voice to the left or right (over held slots, in fifth species). */
  const browse = (delta: number) => {
    let j = session.selected + delta;
    while (FLORID && activeStaff === STEP.movingIndex && j > 0 && j < session.notes.length - 1 && session.notes[j] === HOLD) j += delta;
    setSessions(moveTo(activeStaff, session, j));
  };
  /** Every voice to bar b (a click above or below the staves). */
  const browseBar = (b: number) => {
    const bar = Math.max(0, Math.min(STEP.cantus.length - 1, b));
    setSessions(Object.fromEntries(mine.map((i) => [i, select(sessions[i], entry(i, bar))])));
  };

  const play = (from = 0) => {
    if (playing) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    const n = STEP.cantus.length;
    const fuxLines = mine.map((i) => STEP.fux[i]);
    // One event a bar for the semibreves; the moving voice (D114, D116) on its own events,
    // a tied note held through the bar line.
    const channelOf = (i: number) => (mine.indexOf(i) === 0 ? "counterpoint" : "second");
    const events: PlayEvent[] = [];
    for (let k = 0; k < n; k++) {
      const whole = mine.filter((i) => i !== STEP.movingIndex);
      const sem = (i: number) => sessions[i].notes[k] ?? null;
      const ev: PlayEvent = { slot: k, at: k, length: 1, cantus: STEP.cantus[k], counterpoint: null, extra: [] };
      for (const i of whole) {
        const p = sem(i);
        if (!p) continue;
        if (channelOf(i) === "counterpoint") ev.counterpoint = p;
        else ev.extra!.push({ channel: "second", pitch: p });
      }
      if (fuxOpen) {
        for (const i of mine.filter((x) => x !== STEP.movingIndex)) ev.extra!.push({ channel: "fux", pitch: STEP.fux[i][k] });
      }
      events.push(ev);
      const m = STEP.movingIndex;
      if (m === null || STEP.per === 8) continue;
      const per = STEP.per;
      const parts = k === n - 1 ? [0] : Array.from({ length: per }, (_, j) => j);
      for (const h of parts) {
        const slot = per * k + h;
        const len = k === n - 1 ? 1 : 1 / per;
        for (const [line, ch] of [[sessions[m].notes, channelOf(m)], ...(fuxOpen ? [[STEP.fux[m], "fux"]] : [])] as [(string | null)[], "counterpoint" | "second" | "fux"][]) {
          const p = line[slot];
          if (!p || p === REST) continue;
          const ties = species !== 3;
          if (ties && h === 0 && slot > 0 && line[slot - 1] === p) continue; // tied over the bar line
          const held = ties && h === per - 1 && line[slot + 1] === p ? len * 2 : len;
          events.push({ slot: k, at: k + h / per, length: held, cantus: null, counterpoint: null, extra: [{ channel: ch, pitch: p }] });
        }
      }
    }
    // Fifth species: each note from its onset for its held length (quaver slots; the last bar whole).
    const m = STEP.movingIndex;
    if (m !== null && STEP.per === 8) {
      const at = (slot: number) => (slot >= 8 * (n - 1) ? n - 1 : slot / 8);
      for (const [line, ch] of [[sessions[m].notes, channelOf(m)], ...(fuxOpen ? [[STEP.fux[m], "fux"]] : [])] as [(string | null)[], "counterpoint" | "second" | "fux"][]) {
        line.forEach((p, slot) => {
          if (!p || p === REST || p === HOLD) return;
          let end = slot + 1;
          while (line[end] === HOLD) end++;
          const length = (end >= line.length ? n : at(end)) - at(slot);
          events.push({ slot: Math.min(n - 1, Math.floor(slot / 8)), at: at(slot), length, cantus: null, counterpoint: null, extra: [{ channel: ch, pitch: p }] });
        });
      }
    }
    // The continuo plays under the lines heard: the player's two, or Fux's when only his are on.
    let onCycle: ((startTime: number, fromBeat: number) => void) | undefined;
    if (continuo) {
      const fuxOnly = !versions.original && fuxHeard && fuxOpen;
      // The continuo harmonises the downbeats (the minim voice's thesis notes).
      const heard = (fuxOnly ? fuxLines : mine.map((i) => sessions[i].notes)).map((line, j) => Array.from({ length: n }, (_, k) => downOf(line, mine[j], k)));
      try {
        const view = { species: "first" as const, modalFinal: STEP.modalFinal, cantusVoice: "upper" as const, cantus: STEP.cantus, layout: slotLayout("first", n), fux: null };
        const input = continuoInput(view, heard, "player");
        const realization = realizeContinuo(input, continuoOptions("player", continuoSettings));
        onCycle = (startTime, fromBeat) => {
          const graph = audio.graph;
          const destination = audio.continuoInput();
          if (!graph || !destination) return;
          audio.attach(playContinuo(input, realization, { preset: continuoSettings.preset, audio: { ctx: graph.ctx, destination }, includeSungVoices: false, startTime, fromBeat, getTempo: () => audio.tempo, temperament: tuning, inegal: continuoSettings.inegal && continuoSettings.preset !== "stileAntico", figuration: continuoSettings.figure ? continuoSettings.figuration : null }));
        };
      } catch {
        onCycle = undefined;
      }
    }
    audio.setGates({ counterpoint: versions.original, second: secondOn, fux: fuxHeard && fuxOpen, continuo });
    setPlaying(true);
    void audio.playAll(events, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    }, onCycle, from);
  };

  const evaluateNow = () => {
    if (result) return setResult(null);
    if (missing > 0) return;
    const voicesNow = [0, 1, 2].map((i) => (i === STEP.cantusIndex ? STEP.cantus : (sessions[i].notes as string[])));
    const ev =
      STEP.movingIndex === null
        ? evaluateTrio({ modalFinal: STEP.modalFinal, cantusIndex: STEP.cantusIndex, voices: voicesNow })
        : STEP.species === 2
          ? evaluateTrio2({ modalFinal: STEP.modalFinal, cantusIndex: STEP.cantusIndex, minimIndex: STEP.movingIndex, voices: voicesNow })
          : STEP.species === 5
            ? evaluateTrioFifth({ modalFinal: STEP.modalFinal, cantusIndex: STEP.cantusIndex, movingIndex: STEP.movingIndex, voices: voicesNow })
            : evaluateTrioFlorid({ species: STEP.species as 3 | 4, modalFinal: STEP.modalFinal, cantusIndex: STEP.cantusIndex, movingIndex: STEP.movingIndex, voices: voicesNow, ligatureAllowance: Math.max(1, STEP.untied) });
    setResult(ev);
    setTab("evaluation");
    if (ev.passed) {
      if (!stars.includes(STEP.id)) setStars([...stars, STEP.id]);
      if (ev.violations.length === 0 && !gold.includes(STEP.id)) setGold([...gold, STEP.id]);
      if (!unlocked.includes(STEP.id)) setUnlocked([...unlocked, STEP.id]);
    }
  };

  // Keys (as in two voices), plus V for the next voice and Alt + 1-6 for the tracks (D149).
  const onKey = (e: KeyboardEvent) => {
    if (suspended) return;
    if (keyBelongsToControl(e)) return;
    if (e.ctrlKey || e.metaKey || (e.altKey && trackKey(e) === null) || e.isComposing) return;
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    const k = e.key;
    const digit = trackKey(e);
    const s = session;
    if (digit !== null) {
      const track = trackOrder(false, true)[digit - 1];
      if (track === "cantus") setSound(changeMix(sound, "cantus", { mute: !sound.mix.cantus.mute }));
      else if (track === "counterpoint") setVersions({ ...versions, original: !versions.original });
      else if (track === "second") setSecondOn(!secondOn);
      else if (track === "fux") fuxOpen && setFuxHeard(!fuxHeard);
      else if (track === "drums") setDrums(!drums);
      else if (track === "continuo") setContinuo(!continuo);
    } else if (FLORID && activeStaff === STEP.movingIndex && ["8", "4", "3", "2", "6", "1"].includes(k)) setNoteValue({ "8": 1, "4": 2, "3": 3, "2": 4, "6": 6, "1": 8 }[k]!);
    else if (FLORID && activeStaff === STEP.movingIndex && (k === "t" || k === "T" || k === "+")) write(activeStaff, holdSelected(s, floridLayout(STEP.cantus.length), noteValue), true);
    else if (k === "v" || k === "V") setActive(mine[(mine.indexOf(activeStaff) + (e.shiftKey ? mine.length - 1 : 1)) % mine.length]);
    else if (k === "ArrowRight") browse(1);
    else if (k === "ArrowLeft") browse(-1);
    else if ((k === "r" || k === "R") && activeStaff === STEP.movingIndex) {
      const rested = { ...s, notes: s.notes.map((q, j) => (j === s.selected ? REST : q)) };
      if (FLORID) write(activeStaff, rested, true);
      else update(activeStaff, rested);
    } else if (k === "ArrowUp" || k === "ArrowDown") write(activeStaff, stepNote(FLORID && activeStaff === STEP.movingIndex ? select(s, onsetOf(s.notes, s.selected)) : s, (k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 7 : 1), startPitch(STEP, activeStaff)), false);
    else if (/^[a-gA-G]$/.test(k)) {
      const cur = s.notes[s.selected];
      write(activeStaff, letterNote(s, k.toUpperCase() as Step, cur && cur !== REST && cur !== HOLD ? cur : (s.lastWritten ?? startPitch(STEP, activeStaff))), true);
    }
    else if (k === "#") update(activeStaff, applyAccidental(s, 1));
    else if (k === "-") update(activeStaff, applyAccidental(s, -1));
    else if (k === "n") update(activeStaff, applyAccidental(s, 0));
    else if (k === "Delete" || k === "Backspace") update(activeStaff, FLORID && activeStaff === STEP.movingIndex ? clearSpan(s) : clear(s));
    else if (k === " ") play(s.selected);
    else if (k === "p" || k === "P") play();
    else return;
    e.preventDefault();
  };
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const highlight = useHighlight();
  const marks = useMemo(() => {
    if (!result) return [];
    const out = new Map<number, "error" | "warning">();
    for (const v of result.violations) for (const b of v.positions) if (out.get(b) !== "error") out.set(b, v.severity);
    return [...out].map(([bar, severity]) => ({ bar, severity }));
  }, [result]);

  // Two staves (D113): each voice by register; the player's two in their mixer colours.
  const mean = (line: (string | null)[]) => {
    const ms = line.filter((x): x is string => !!x && x !== REST && x !== HOLD).map((x) => parsePitch(x).midi);
    return ms.reduce((a, b) => a + b, 0) / Math.max(1, ms.length);
  };
  // Placed by Fux's own lines (and the cantus), so that the staves do not change as the player writes.
  const means = [0, 1, 2].map((i) => mean(i === STEP.cantusIndex ? STEP.cantus : STEP.fux[i]));
  const layoutTwo = trioStaves(means);
  /** The moving voice's stems: up for the upper of two voices on a staff, down for the lower; alone, by register. */
  const stemOf = (i: number): 1 | -1 => {
    const mates = [0, 1, 2].filter((x) => x !== i && layoutTwo.staff[x] === layoutTwo.staff[i]);
    if (mates.length) return means[i] >= means[mates[0]] ? 1 : -1;
    const middle = layoutTwo.clefs[layoutTwo.staff[i]] === "bass" ? 50 : 71;
    return means[i] < middle ? 1 : -1;
  };
  const INK = ["var(--trk-counterpoint)", "var(--trk-second)"];
  const voices: TrioVoice[] = [0, 1, 2].map((i) => ({
    notes: i === STEP.cantusIndex ? STEP.cantus : sessions[i].notes,
    editable: i !== STEP.cantusIndex,
    staff: layoutTwo.staff[i],
    ...(i === STEP.movingIndex ? { per: STEP.per as 2 | 4 | 8, stem: stemOf(i) } : {}),
    ...(i === STEP.cantusIndex ? {} : { ink: INK[mine.indexOf(i)] }),
    ...(i !== STEP.cantusIndex && showFux && fuxOpen ? { fux: STEP.fux[i] } : {}),
  }));
  /** "Contra I", "Contra II" or "Cantus", with the voice's place (upper, middle, lower). */
  const partName = (i: number) => (i === STEP.cantusIndex ? t("ui.trio3.chip.cantus") : t(mine.indexOf(i) === 0 ? "ui.mixer.contra1" : "ui.mixer.second"));
  const voiceName = (i: number) => `${partName(i)} (${t(`ui.trio3.voice.${i}`)})`;
  const chooseStyle = (id: StyleId) => {
    const next = applyStyle(id, { sound, drumsOn: drums, drumKit, continuoOn: continuo, continuo: continuoSettings, tuning, tempo }, layoutTwo.staff[STEP.cantusIndex] === 0, { counterpointHigh: layoutTwo.staff[mine[0]] === 0, secondHigh: layoutTwo.staff[mine[1]] === 0 });
    setSound(next.sound);
    setDrums(next.drumsOn);
    setDrumKit(next.drumKit);
    setContinuo(next.continuoOn);
    setContinuoSettings({ ...continuoSettings, ...next.continuo });
    setTuning(next.tuning);
    setTempo(next.tempo);
  };
  const describe = (vs: number[]) => vs.map(voiceName).join(", ");
  const errors = result?.errors ?? [];
  const warnings = result?.warnings ?? [];

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
          <button className="icon" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} aria-label={t("ui.nav.prev")}>‹</button>
          <ModeSelect value={3} stars={stars} onMode={(m) => (audio.stop(), onVoices(m))} />
          <select id="species" className="sel sel-species" value={species} aria-label={t("ui.nav.species")} onChange={(e) => goToSpecies(Number(e.target.value) as TrioSpecies)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n} disabled={!exerciseOpen(BY_SPECIES[n as TrioSpecies][0].id, stars, beta)}>
                {exerciseOpen(BY_SPECIES[n as TrioSpecies][0].id, stars, beta) ? "" : "🔒 "}
                {t("ui.nav.speciesN", { n: ORDINAL[n] })}
                {` · ${BY_SPECIES[n as TrioSpecies].filter((x) => stars.includes(x.id)).length}/${BY_SPECIES[n as TrioSpecies].length}`}
              </option>
            ))}
          </select>
          <select id="exercise" className="sel sel-exercise" value={stepIndex} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
            {STEPS.map((s, k) => (
              <option key={s.id} value={k} disabled={!isOpen(k)}>
                {gold.includes(s.id) ? "🌟 " : stars.includes(s.id) ? "★ " : isOpen(k) ? "" : "🔒 "}
                {stepLabel(s)}
              </option>
            ))}
          </select>
          <button className="icon" onClick={() => goTo(stepIndex + 1)} disabled={stepIndex === STEPS.length - 1 || !isOpen(stepIndex + 1)} aria-label={t("ui.nav.next")}>›</button>
        </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("guide")} onTutorial={onTutorial} />
        </>
      }
      score={
        <div className="score-wrap trio" data-notes={JSON.stringify(mine.map((i) => sessions[i].notes))}>
          <span className={gold.includes(STEP.id) ? "star earned gold" : stars.includes(STEP.id) ? "star earned" : "star"} aria-label={tt(gold.includes(STEP.id) ? "ui.starGold" : stars.includes(STEP.id) ? "ui.starPlain" : "ui.starNone")} title={tt(gold.includes(STEP.id) ? "ui.starGold" : stars.includes(STEP.id) ? "ui.starPlain" : "ui.starNone")}>
            {gold.includes(STEP.id) ? "🌟" : stars.includes(STEP.id) ? "★" : "☆"}
          </span>
          <TrioScore
            pulse={highlight ?? undefined}
            voices={voices}
            clefs={layoutTwo.clefs}
            active={activeStaff}
            selected={activeBar}
            selectedPart={activePart}
            cursor={cursor}
            marks={marks}
            figures={figures}
            harmony={harmony ? { final: STEP.modalFinal } : null}
            names={names}
            nameStyle={nameStyle}
            label={t("ui.trio3.name", { fig: STEP.figure })}
            onPlace={(staff, bar, natural, part) => {
              setActive(staff);
              const s = sessions[staff];
              const slot = Math.min(voiceSlots(STEP, staff) - 1, slotOfBar(STEP, staff, bar) + (staff === STEP.movingIndex ? part : 0));
              write(staff, place(select(s, slot), slot, natural), false);
            }}
            onSelect={(staff, bar) => {
              if (staff !== null && mine.includes(staff)) setActive(staff);
              browseBar(bar);
              audition(bar);
            }}
            zoom={zoom}
            onZoom={setZoom}
            zoomLabels={{ in: t("ui.zoom.in"), out: t("ui.zoom.out"), reset: t("ui.zoom.reset") }}
            tools={<ScoreTools view={{ names: names ? nameStyle : "off", intervals: figures, harmony }} onView={(v) => { setNames(v.names !== "off"); if (v.names !== "off") setNameStyle(v.names); setFigures(v.intervals); setHarmony(!!v.harmony); }} fux={{ open: fuxOpen, shown: showFux, onShow: setShowFux }} />}
          />
        </div>
      }
      transport={
        <>
        {/* Voice chips (D113): the voice being written, in its colour; Tab moves to the other. */}
        <div className="voice-chips" role="radiogroup" aria-label={t("ui.trio3.chips")}>
          {[0, 1, 2].map((i) => {
            const isCantus = i === STEP.cantusIndex;
            const colour = isCantus ? "var(--trk-cantus)" : INK[mine.indexOf(i)];
            return (
              <button key={i} role="radio" className={`voice-chip${isCantus ? " cantus" : ""}`} aria-checked={i === activeStaff} disabled={isCantus} style={{ ["--chip" as string]: colour }} onClick={() => setActive(i)} title={isCantus ? t("ui.trio3.chip.cantusHelp") : t("ui.trio3.chip.help", { voice: voiceName(i) })}>
                <span className="dot" aria-hidden="true" />
                {partName(i)} <span className="where">{t(`ui.trio3.voice.${i}`)}{i === STEP.movingIndex ? ` · ${t(`ui.trio3.moving${STEP.species}`)}` : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="controls">
          <div className="group write" role="group">
            <button className="btn-acc" onClick={() => update(activeStaff, applyAccidental(session, -1))} aria-label="flat" title={t("ui.accidental.flat.help")}>♭</button>
            <button className="btn-acc" onClick={() => update(activeStaff, applyAccidental(session, 0))} aria-label="natural" title={t("ui.accidental.natural.help")}>♮</button>
            <button className="btn-acc" onClick={() => update(activeStaff, applyAccidental(session, 1))} aria-label="sharp" title={t("ui.accidental.sharp.help")}>♯</button>
            {FLORID && activeStaff === STEP.movingIndex && (
              <span className="values" role="radiogroup" aria-label={t("ui.value")}>
                {([[1, "8"], [2, "4"], [3, "3"], [4, "2"], [6, "6"], [8, "1"]] as const).map(([n, key]) => (
                  <button key={n} className="btn-val" role="radio" aria-checked={noteValue === n} aria-pressed={noteValue === n} onClick={() => setNoteValue(n)} title={t(`ui.value.${n}`, { key })} aria-label={t(`ui.value.${n}`, { key })}>
                    <NoteIcon slots={n} />
                  </button>
                ))}
                <button className="btn-hold" onClick={() => write(activeStaff, holdSelected(session, floridLayout(STEP.cantus.length), noteValue), true)} disabled={session.selected === 0 || session.notes[session.selected - 1] === null} title={t("ui.hold.help")}>
                  {t("ui.hold")}
                </button>
              </span>
            )}
            <button className="btn-edit" onClick={() => { setSessions(freshSessions(STEP)); setResult(null); }} title={t("ui.clearAll.help")}>{t("ui.clearAll")}</button>
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={result !== null} onClick={evaluateNow} disabled={missing > 0 && !result} title={missing > 0 ? t("ui.evaluate.incomplete", { missing }) : undefined}>
              {t("ui.evaluate")}
              {missing > 0 && !result && <span className="badge">{missing}</span>}
            </button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <div className="play-split">
              <button className="icon play" onClick={() => play()} aria-label={t("ui.play.player")} title={t("ui.play.player")}>{playing ? "■" : "▶"}</button>
              <button className="loop" aria-pressed={loop} onClick={() => setLoop(!loop)} aria-label={t("ui.loop")} title={t(loop ? "ui.loop.on" : "ui.loop.off")}>⟲</button>
            </div>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={240} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
              <HFader label={t("ui.volume")} help={t("ui.volume.help")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
            </div>
          </div>
        </div>
        </>
      }
      summary={result && (
        <div className={result.passed ? "eval-summary ok" : "eval-summary bad"} role="status">
          <span className="verdict">{result.passed ? `✓ ${t("ui.summary.passed")}` : `✗ ${t("ui.summary.failed", { n: new Set(result.errors.map((v) => v.ruleId)).size })}`}</span>
          <button className="link" onClick={() => setTab("evaluation")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={`J. J. Fux, Gradus ad Parnassum (Vienna, 1725), Fux #${STEP.figure}, p. ${STEP.page}. Encoding: Four Score and More / Open Music Theory (Mark Gotham), CC0-1.0.`}
      tabs={[
        { id: "mixer", label: t("ui.dock.mixer"), content: (
          <SoundDesk
          advanced={false}
          open
          onOpen={() => undefined}
          continuo={continuo}
          onContinuo={setContinuo}
          continuoSettings={continuoSettings}
          onContinuoSettings={setContinuoSettings}
          versions={versions}
          onVersions={setVersions}
          slots={STEP.cantus.length}
          showFux={showFux && fuxOpen}
          onShowFux={setShowFux}
          fuxHeard={fuxHeard}
          onFuxHeard={setFuxHeard}
          levels={() => audio.levels()}
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
          onStyle={chooseStyle}
          trio={{ secondOn, onSecond: setSecondOn }}
        />
        ) },
        { id: "evaluation", text: true, label: t("ui.dock.evaluation"), content: (
          <>
          {result ? (
          <section className="feedback trio-feedback" aria-live="polite">
            <p className={result.passed ? "verdict ok" : "verdict bad"}>{result.passed ? t("ui.trio3.passed") : t("ui.trio3.failed", { n: new Set(errors.map((v) => v.ruleId)).size })}</p>
            <ul>
              {errors.map((v, i) => (
                <li key={`e${i}`} className="error">
                  <span className="where"><BarRef bars={v.positions}>{t("ui.trio3.bar", { bars: v.positions.map((p) => p + 1).join("–") })}</BarRef> {t("ui.trio3.voices", { voices: describe(v.voices) })}</span> {t(`hints.${v.messageKey}`)} <LearnLink ruleId={v.ruleId} onLearn={onTutorial} />
                </li>
              ))}
            </ul>
            {warnings.length > 0 && (
              <>
                <h4>{t("ui.trio3.notes")}</h4>
                <ul>
                  {warnings.map((v, i) => (
                    <li key={`w${i}`} className="warning">
                      <span className="where"><BarRef bars={v.positions}>{t("ui.trio3.bar", { bars: v.positions.map((p) => p + 1).join("–") })}</BarRef> {t("ui.trio3.voices", { voices: describe(v.voices) })}</span> {t(`hints.${v.messageKey}`)} <LearnLink ruleId={v.ruleId} onLearn={onTutorial} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ) : (
          <p className="dock-empty">{t("ui.dock.noEvaluation")}</p>
        )}
          {fuxOpen && missing === 0 && (
            // D113: each written voice beside Fux's own (the same note in the same bar).
            <section className="trio-with-fux">
              <h4>{t("ui.trio3.withFux")}</h4>
              <ul>
                {mine.map((i) => {
                  const same = sessions[i].notes.filter((x, k) => x === STEP.fux[i][k]).length;
                  const n = voiceSlots(STEP, i);
                  return (
                    <li key={i} style={{ ["--chip" as string]: INK[mine.indexOf(i)] }}>
                      <span className="dot" aria-hidden="true" /> <strong>{partName(i)}</strong>{" "}
                      {t(same === n ? "ui.trio3.fuxSame" : same >= n * 0.6 ? "ui.trio3.fuxClose" : "ui.trio3.fuxOwn", { same, n })}
                    </li>
                  );
                })}
              </ul>
              <button className="chipbtn" onClick={() => setShowFux(!showFux)}>{t(showFux ? "ui.trio3.fuxHide" : "ui.trio3.fuxShow")}</button>
            </section>
          )}
          {!fuxOpen && <p className="help">{t("ui.trio3.fuxLocked")}</p>}
          </>
        ) },
        { id: "guide", text: true, label: t("ui.howtoTab"), content: (
          <Guide exercise={<>
            <blockquote className="tutor" lang="en">
              <span className="speaker">{t("tutor.speaker.aloysius")}.</span> “{t(species === 1 ? "ui.trio3.intro" : `ui.trio3.intro${species}`)}”
              <cite title={t(species === 1 ? "ui.trio3.introLa" : `ui.trio3.introLa${species}`)} lang="la">{t(species === 1 ? "ui.trio3.cite" : `ui.trio3.cite${species}`)}</cite>
            </blockquote>
            <p className="help trio-help">{t("ui.trio3.help")}</p>
            {species > 1 && <p className="help trio-help">{t(`ui.trio3.help${species}`)}</p>}
          </>} />
        ) },
      ]}
    />
  );
}
