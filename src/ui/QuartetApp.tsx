/**
 * Four voices (Exercitium III, D148), on the pattern of the three-voice screen (D91, D113): the
 * player writes the three parts that are not the cantus, in any order, as Josephus does. Species
 * one to five, Fux's exercises and then the modes he leaves to private study; last the species
 * combined (Fig. 204). In species 2-5 every written part is kept in quaver slots, as the florid
 * voice in two voices (D82): a tap writes the part's value (a semibreve, a minim, a crotchet; the
 * florid part the value chosen), Hold (T) carries a note on.
 */
import { ModeSelect } from "./ModeSelect.tsx";
import type { Mode } from "./Root.tsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { barOfQuaver, normalise, partSlots, QUARTET_ALL, QUARTET_SPECIES, quartetInput, quartetPlayer, PART_CENTRE, snapSlot, template, valueAt as valueFor, type QuartetSpecies, type QuartetStep } from "../game/quartet.ts";
import { evaluateQuartet, type PartKind } from "../counterpoint/four-voice.ts";
import type { TrioEvaluation } from "../counterpoint/three-voice.ts";
import { applyAccidental, clear, clearSpan, holdSelected, initialState, letterNote, onsetOf, place, select, spanFromSelected, stepNote, type SessionState } from "../game/session.ts";
import { HOLD, REST, slotLayout, type PlayEvent } from "../counterpoint/layout.ts";
import { floridLayout } from "../game/trio.ts";
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
import { quartetStaves } from "./notation/trio-staves.ts";
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

const BY_SPECIES = QUARTET_ALL;
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th"];
const speciesLabel = (n: QuartetSpecies) => (n === 6 ? t("ui.quartet.speciesCombined") : t("ui.nav.speciesN", { n: ORDINAL[n] }));
const stepLabel = (s: QuartetStep) =>
  t("ui.quartet.step", { n: s.ordinal, final: s.modalFinal, where: `${t(`ui.quartet.cantus.${s.cantusIndex}`)} · ${s.figure ? t("ui.quartet.stepFux", { fig: s.figure }) : t("ui.quartet.stepPrivate")}` });
/** The player's three parts: Contra I, II, III on the counterpoint, second and third channels. */
const CHANNELS = ["counterpoint", "second", "third"] as const;
const INK = ["var(--trk-counterpoint)", "var(--trk-second)", "var(--trk-third)"];
const NAMES = ["ui.mixer.contra1", "ui.mixer.second", "ui.mixer.third"];
const MOVING: PartKind[] = ["minims", "crotchets", "ligatures", "florid"];

type Sessions = Record<number, SessionState>;
const freshSessions = (s: QuartetStep): Sessions =>
  Object.fromEntries(
    quartetPlayer(s).map((i) => {
      const st = initialState(partSlots(s));
      st.notes = template(s, i);
      st.selected = Math.max(0, st.notes.findIndex((x) => x === null));
      return [i, st];
    }),
  );
/** Where a part starts before anything is written: the middle line of its 1725 clef. */
const startPitch = (s: QuartetStep, staff: number) => {
  const m = /^([CFG])(\d)$/.exec(s.clefs1725[staff])!;
  const anchor = { C: "C4", F: "F3", G: "G4" }[m[1] as "C" | "F" | "G"];
  const d = parsePitch(anchor).diatonic + (3 - Number(m[2])) * 2;
  return `${"CDEFGAB"[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`;
};

export function QuartetApp({ onVoices, suspended, command, onTutorial }: { onVoices(n: Mode): void } & GameLink) {
  const [species, setSpecies] = useState<QuartetSpecies>(() => stored<QuartetSpecies>("wtg.quartetSpecies", 1, (v) => QUARTET_SPECIES.includes(v as QuartetSpecies)));
  useEffect(() => store("wtg.quartetSpecies", species), [species]);
  const STEPS = BY_SPECIES[species];
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, STEPS.findIndex((s) => s.id === stored("wtg.quartetStep", STEPS[0].id))));
  const STEP = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  useEffect(() => store("wtg.quartetStep", STEP.id), [STEP.id]);
  const BARS = STEP.cantus.length;
  const GRID = STEP.species !== 1;
  const layout = useMemo(() => floridLayout(BARS), [BARS]);
  const [all, setAll] = useState<Record<string, Sessions>>({});
  const sessions = all[STEP.id] ?? freshSessions(STEP);
  const mine = quartetPlayer(STEP);
  const [active, setActive] = useState(mine[0]);
  const activeStaff = mine.includes(active) ? active : mine[0];
  const session = sessions[activeStaff];
  const setSessions = (next: Sessions) => setAll((xs) => ({ ...xs, [STEP.id]: next }));
  const activeBar = barOfQuaver(STEP, session.selected);
  const activePart: number | null = GRID && activeBar < BARS - 1 ? session.selected % 8 : null;
  const [result, setResult] = useState<TrioEvaluation | null>(null);
  const [stars, setStars] = useState<string[]>(() => stored<string[]>("wtg.stars", [], (v) => Array.isArray(v)));
  const [gold, setGold] = useState<string[]>(() => stored<string[]>("wtg.starsGold", [], (v) => Array.isArray(v)));
  useEffect(() => store("wtg.starsGold", gold), [gold]);
  useEffect(() => store("wtg.stars", stars), [stars]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const hasFux = STEP.fux !== null;
  const fuxOpen = hasFux && Boolean(result?.passed || unlocked.includes(STEP.id) || stars.includes(STEP.id));

  // Settings shared with the other screens.
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number" && v >= 0 && v <= 100));
  const [sound, setSound] = useState<SoundState>(() => restoreSound(stored<unknown>("wtg.sound4", stored<unknown>("wtg.sound3", null))));
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
  const [secondOn, setSecondOn] = useState(true);
  const [thirdOn, setThirdOn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);
  /** The florid part's value, in quaver slots (1, 2, 3, 4, 6, 8). */
  const [noteValue, setNoteValue] = useState(2);

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
    store("wtg.sound4", sound);
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
  const gates = () => ({ counterpoint: versions.original, second: secondOn, third: thirdOn, fux: fuxHeard && fuxOpen, continuo });
  useEffect(() => {
    audio.setGates(gates());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.original, secondOn, thirdOn, fuxHeard, fuxOpen, continuo]);
  useEffect(() => () => audio.stop(), []);
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
    audio.setGates(gates());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspended]);

  /** The note a part sounds at the start of bar k (after an opening rest, the first one sung). */
  const downOf = (line: (string | null)[], voice: number, k: number): string | null => {
    if (voice === STEP.cantusIndex) return STEP.cantus[k];
    if (!GRID) return line[k];
    const from = 8 * k;
    const to = k === BARS - 1 ? from + 1 : from + 8;
    for (let s = from; s < to; s++) {
      const d = line[s] === HOLD ? line[onsetOf(line, s)] : line[s];
      if (d && d !== REST && d !== HOLD) return d;
    }
    return null;
  };
  const missing = mine.reduce((n, i) => n + sessions[i].notes.filter((x) => x === null).length, 0);

  // The real setup (D142): a star on an exercise opens the next; in BETA all is open.
  const beta = useBeta();
  const isOpen = (k: number) => k >= 0 && k < STEPS.length && exerciseOpen(STEPS[k].id, stars, beta);
  const reset = () => {
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setResult(null);
    setShowFux(false);
  };
  const goTo = (k: number) => {
    if (k < 0 || k >= STEPS.length || !isOpen(k)) return;
    reset();
    setStepIndex(k);
    setActive(quartetPlayer(STEPS[k])[0]);
  };
  const goToSpecies = (n: QuartetSpecies) => {
    if (n === species || !exerciseOpen(BY_SPECIES[n][0].id, stars, beta)) return;
    reset();
    setSpecies(n);
    setStepIndex(0);
    setActive(quartetPlayer(BY_SPECIES[n][0])[0]);
  };
  /** Any four-voice exercise by id (the real setup, a command). */
  const jumpTo = (id: string) => {
    const n = Number(/\.q(\d)\./.exec(id)?.[1]) as QuartetSpecies;
    const k = BY_SPECIES[n]?.findIndex((x) => x.id === id) ?? -1;
    if (k < 0 || (n === species && k === stepIndex)) return;
    reset();
    setSpecies(n);
    setStepIndex(k);
    setActive(quartetPlayer(BY_SPECIES[n][k])[0]);
  };
  useEffect(() => {
    if (isOpen(stepIndex)) return;
    const id = furthestOpen(stars, beta);
    if (id.startsWith("fux-mode.q")) jumpTo(id);
    else onVoices(id.startsWith("fux-mode.t") ? 3 : 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beta, stepIndex, species]);
  useEffect(() => {
    if (command && command.stepId.startsWith("fux-mode.q")) jumpTo(command.stepId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command?.n]);

  const update = (staff: number, next: SessionState) => {
    setSessions({ ...sessions, [staff]: { ...next, notes: normalise(STEP, staff, next.notes) } });
    setResult(null);
  };
  const audition = (k: number, override?: { staff: number; pitch: string | null }) => {
    const ps = [0, 1, 2, 3].map((i) => (override && i === override.staff ? (override.pitch === REST ? null : override.pitch) : i === STEP.cantusIndex ? STEP.cantus[k] : downOf(sessions[i].notes, i, k)));
    const extra = mine.slice(1).flatMap((i, j) => (ps[i] ? [{ channel: CHANNELS[j + 1], pitch: ps[i]! }] : []));
    void audio.playSequence([{ slot: k, at: 0, length: 1, cantus: STEP.cantus[k], counterpoint: ps[mine[0]] ?? null, extra }]);
  };
  /** Where a part is entered in bar b: its first slot, or the first one to write (after the opening rest). */
  const entry = (i: number, b: number) => {
    if (!GRID) return b;
    const notes = sessions[i].notes;
    let k = Math.min(8 * b, notes.length - 1);
    while (k < notes.length - 1 && (notes[k] === HOLD || (b === 0 && notes[k] === REST))) k++;
    return k;
  };
  /** The value written at slot k of a part, in quaver slots. */
  const valueAt = (i: number, k: number) => valueFor(STEP, i, sessions[i].notes, k, noteValue);
  /** A tap at quaver `part` of a bar: the slot where the part's value there begins. */
  const snap = (i: number, bar: number, part: number) => snapSlot(STEP, i, bar, part);
  const moveTo = (staff: number, base: SessionState, k: number) => {
    const slot = Math.max(0, Math.min(partSlots(STEP) - 1, k));
    const bar = barOfQuaver(STEP, slot);
    return Object.fromEntries(mine.map((i) => [i, i === staff ? select(base, slot) : select(sessions[i], entry(i, bar))]));
  };
  const write = (staff: number, raw: SessionState, advance: boolean) => {
    const k = raw.selected;
    const spanned = GRID ? spanFromSelected(raw, slotLayout("fifth", BARS), valueAt(staff, k)) : raw;
    const next = { ...spanned, notes: normalise(STEP, staff, spanned.notes) };
    let to = k + 1;
    while (GRID && to < next.notes.length - 1 && next.notes[to] === HOLD) to++;
    setSessions(moveTo(staff, next, advance ? to : k));
    setResult(null);
    audition(barOfQuaver(STEP, k), { staff, pitch: next.notes[k] === HOLD ? next.notes[onsetOf(next.notes, k)] : next.notes[k] });
  };
  const hold = () => {
    if (!GRID) return;
    const n = valueAt(activeStaff, session.selected);
    write(activeStaff, holdSelected(session, slotLayout("fifth", BARS), n), true);
  };
  const browse = (delta: number) => {
    let j = session.selected + delta;
    while (GRID && j > 0 && j < session.notes.length - 1 && session.notes[j] === HOLD) j += delta;
    setSessions(moveTo(activeStaff, session, j));
  };
  const browseBar = (b: number) => {
    const bar = Math.max(0, Math.min(BARS - 1, b));
    setSessions(Object.fromEntries(mine.map((i) => [i, select(sessions[i], entry(i, bar))])));
  };

  const play = (from = 0) => {
    if (playing) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    const events: PlayEvent[] = [];
    for (let k = 0; k < BARS; k++) events.push({ slot: k, at: k, length: 1, cantus: STEP.cantus[k], counterpoint: null, extra: [] });
    const lines: [(string | null)[], "counterpoint" | "second" | "third" | "fux"][] = mine.map((i, j) => [sessions[i].notes, CHANNELS[j]]);
    if (fuxOpen && STEP.fux) for (const i of mine) lines.push([STEP.fux[i], "fux"]);
    for (const [line, ch] of lines) {
      if (!GRID) {
        line.forEach((p, k) => p && events[k].extra!.push({ channel: ch, pitch: p }));
        continue;
      }
      // Each note from its onset for its held length (the last bar whole).
      const at = (slot: number) => (slot >= 8 * (BARS - 1) ? BARS - 1 : slot / 8);
      line.forEach((p, slot) => {
        if (!p || p === REST || p === HOLD) return;
        let end = slot + 1;
        while (line[end] === HOLD) end++;
        const length = (end >= line.length ? BARS : at(end)) - at(slot);
        events.push({ slot: Math.min(BARS - 1, Math.floor(slot / 8)), at: at(slot), length, cantus: null, counterpoint: null, extra: [{ channel: ch, pitch: p }] });
      });
    }
    let onCycle: ((startTime: number, fromBeat: number) => void) | undefined;
    if (continuo) {
      const fuxOnly = !versions.original && fuxHeard && fuxOpen && STEP.fux;
      const heard = mine.map((i) => Array.from({ length: BARS }, (_, k) => downOf(fuxOnly ? STEP.fux![i] : sessions[i].notes, i, k)));
      try {
        const view = { species: "first" as const, modalFinal: STEP.modalFinal, cantusVoice: "upper" as const, cantus: STEP.cantus, layout: slotLayout("first", BARS), fux: null };
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
    audio.setGates(gates());
    setPlaying(true);
    void audio.playAll(events, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    }, onCycle, from);
  };

  const evaluateNow = () => {
    if (result) return setResult(null);
    if (missing > 0) return;
    const lines = [0, 1, 2, 3].map((i) => (i === STEP.cantusIndex ? STEP.cantus : (sessions[i].notes as string[])));
    const ev = evaluateQuartet(quartetInput(STEP, lines));
    setResult(ev);
    setTab("evaluation");
    if (ev.passed) {
      if (!stars.includes(STEP.id)) setStars([...stars, STEP.id]);
      if (ev.violations.length === 0 && !gold.includes(STEP.id)) setGold([...gold, STEP.id]);
      if (!unlocked.includes(STEP.id)) setUnlocked([...unlocked, STEP.id]);
    }
  };

  const isMoving = (i: number) => MOVING.includes(STEP.kinds[i]);
  const onKey = (e: KeyboardEvent) => {
    if (suspended) return;
    if (keyBelongsToControl(e)) return;
    if (e.ctrlKey || e.metaKey || (e.altKey && trackKey(e) === null) || e.isComposing) return;
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    const k = e.key;
    const digit = trackKey(e);
    const s = session;
    const florid = STEP.kinds[activeStaff] === "florid";
    if (digit !== null) {
      const track = trackOrder(false, true, true)[digit - 1];
      if (track === "cantus") setSound(changeMix(sound, "cantus", { mute: !sound.mix.cantus.mute }));
      else if (track === "counterpoint") setVersions({ ...versions, original: !versions.original });
      else if (track === "second") setSecondOn(!secondOn);
      else if (track === "third") setThirdOn(!thirdOn);
      else if (track === "fux") fuxOpen && setFuxHeard(!fuxHeard);
      else if (track === "drums") setDrums(!drums);
      else if (track === "continuo") setContinuo(!continuo);
    } else if (florid && ["8", "4", "3", "2", "6", "1"].includes(k)) setNoteValue({ "8": 1, "4": 2, "3": 3, "2": 4, "6": 6, "1": 8 }[k]!);
    else if (GRID && (k === "t" || k === "T" || k === "+")) hold();
    else if (k === "v" || k === "V") setActive(mine[(mine.indexOf(activeStaff) + (e.shiftKey ? mine.length - 1 : 1)) % mine.length]);
    else if (k === "ArrowRight") browse(1);
    else if (k === "ArrowLeft") browse(-1);
    else if ((k === "r" || k === "R") && isMoving(activeStaff)) write(activeStaff, { ...s, notes: s.notes.map((q, j) => (j === s.selected ? REST : q)) }, true);
    else if (k === "ArrowUp" || k === "ArrowDown") write(activeStaff, stepNote(GRID ? select(s, onsetOf(s.notes, s.selected)) : s, (k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 7 : 1), startPitch(STEP, activeStaff)), false);
    else if (/^[a-gA-G]$/.test(k)) {
      const cur = s.notes[s.selected];
      write(activeStaff, letterNote(s, k.toUpperCase() as Step, cur && cur !== REST && cur !== HOLD ? cur : (s.lastWritten ?? startPitch(STEP, activeStaff))), true);
    } else if (k === "#") update(activeStaff, applyAccidental(s, 1));
    else if (k === "-") update(activeStaff, applyAccidental(s, -1));
    else if (k === "n") update(activeStaff, applyAccidental(s, 0));
    else if (k === "Delete" || k === "Backspace") update(activeStaff, florid ? clearSpan(s) : clear(s));
    else if (k === " ") play(barOfQuaver(STEP, s.selected));
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

  // Two staves, two parts each (D148), placed by Fux's lines (or, without them, each part's middle).
  const mean = (line: (string | null)[]) => {
    const ms = line.filter((x): x is string => !!x && x !== REST && x !== HOLD).map((x) => parsePitch(x).midi);
    return ms.reduce((a, b) => a + b, 0) / Math.max(1, ms.length);
  };
  const means = [0, 1, 2, 3].map((i) => (i === STEP.cantusIndex ? mean(STEP.cantus) : STEP.fux ? mean(STEP.fux[i]) : PART_CENTRE[i]));
  const staves = quartetStaves(means);
  const stemOf = (i: number): 1 | -1 => {
    const mates = [0, 1, 2, 3].filter((x) => x !== i && staves.staff[x] === staves.staff[i]);
    if (mates.length) return means[i] >= Math.max(...mates.map((x) => means[x])) ? 1 : -1;
    const middle = staves.clefs[staves.staff[i]] === "bass" ? 50 : 71;
    return means[i] < middle ? 1 : -1;
  };
  const voices: TrioVoice[] = [0, 1, 2, 3].map((i) => {
    const isCantus = i === STEP.cantusIndex;
    // In species 2-5 the cantus, like the others, is drawn from quaver slots: one semibreve a bar.
    const cantusLine = GRID ? STEP.cantus.flatMap((p, k) => (k === BARS - 1 ? [p] : [p, ...Array(7).fill(HOLD)])) : STEP.cantus;
    return {
      notes: isCantus ? cantusLine : sessions[i].notes,
      editable: !isCantus,
      staff: staves.staff[i],
      ...(GRID ? { per: 8 as const, stem: stemOf(i) } : {}),
      ...(isCantus ? {} : { ink: INK[mine.indexOf(i)] }),
      ...(!isCantus && showFux && fuxOpen && STEP.fux ? { fux: STEP.fux[i] } : {}),
    };
  });
  const partName = (i: number) => (i === STEP.cantusIndex ? t("ui.trio3.chip.cantus") : t(NAMES[mine.indexOf(i)]));
  const voiceName = (i: number) => `${partName(i)} (${t(`ui.quartet.voice.${i}`)})`;
  const chooseStyle = (id: StyleId) => {
    const next = applyStyle(id, { sound, drumsOn: drums, drumKit, continuoOn: continuo, continuo: continuoSettings, tuning, tempo }, staves.staff[STEP.cantusIndex] === 0, {
      counterpointHigh: staves.staff[mine[0]] === 0,
      secondHigh: staves.staff[mine[1]] === 0,
      thirdHigh: staves.staff[mine[2]] === 0,
    });
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
  const florid = STEP.kinds[activeStaff] === "florid";
  const kindLabel = (i: number) => (MOVING.includes(STEP.kinds[i]) || STEP.kinds[i] === "divisible" ? ` · ${t(`ui.quartet.kind.${STEP.kinds[i]}`)}` : "");
  const what = STEP.figure ? `Fux #${STEP.figure}` : `${STEP.modalFinal}, ${t("ui.quartet.stepPrivate")}`;

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <button className="icon" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} aria-label={t("ui.nav.prev")}>‹</button>
            <ModeSelect value={4} stars={stars} onMode={(m) => (audio.stop(), onVoices(m))} />
            <select id="species" className="sel sel-species" value={species} aria-label={t("ui.nav.species")} onChange={(e) => goToSpecies(Number(e.target.value) as QuartetSpecies)}>
              {QUARTET_SPECIES.map((n) => {
                const open = exerciseOpen(BY_SPECIES[n][0].id, stars, beta);
                return (
                  <option key={n} value={n} disabled={!open}>
                    {open ? "" : "🔒 "}
                    {speciesLabel(n)}
                    {` · ${BY_SPECIES[n].filter((x) => stars.includes(x.id)).length}/${BY_SPECIES[n].length}`}
                  </option>
                );
              })}
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
        <div className="score-wrap trio quartet" data-notes={JSON.stringify(mine.map((i) => sessions[i].notes))}>
          <span className={gold.includes(STEP.id) ? "star earned gold" : stars.includes(STEP.id) ? "star earned" : "star"} aria-label={tt(gold.includes(STEP.id) ? "ui.starGold" : stars.includes(STEP.id) ? "ui.starPlain" : "ui.starNone")} title={tt(gold.includes(STEP.id) ? "ui.starGold" : stars.includes(STEP.id) ? "ui.starPlain" : "ui.starNone")}>
            {gold.includes(STEP.id) ? "🌟" : stars.includes(STEP.id) ? "★" : "☆"}
          </span>
          <TrioScore
            pulse={highlight ?? undefined}
            voices={voices}
            clefs={staves.clefs}
            active={activeStaff}
            selected={activeBar}
            selectedPart={activePart}
            selectedSpan={activePart === null ? 1 : valueAt(activeStaff, session.selected)}
            cursor={cursor}
            marks={marks}
            figures={figures}
            harmony={harmony ? { final: STEP.modalFinal } : null}
            names={names}
            nameStyle={nameStyle}
            label={t("ui.quartet.name", { what })}
            onPlace={(staff, bar, natural, part) => {
              setActive(staff);
              const slot = snap(staff, bar, part);
              write(staff, place(select(sessions[staff], slot), slot, natural), false);
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
          <div className="voice-chips" role="radiogroup" aria-label={t("ui.trio3.chips")}>
            {[0, 1, 2, 3].map((i) => {
              const isCantus = i === STEP.cantusIndex;
              const colour = isCantus ? "var(--trk-cantus)" : INK[mine.indexOf(i)];
              return (
                <button key={i} role="radio" className={`voice-chip${isCantus ? " cantus" : ""}`} aria-checked={i === activeStaff} disabled={isCantus} style={{ ["--chip" as string]: colour }} onClick={() => setActive(i)} title={isCantus ? t("ui.trio3.chip.cantusHelp") : t("ui.trio3.chip.help", { voice: voiceName(i) })}>
                  <span className="dot" aria-hidden="true" />
                  {partName(i)} <span className="where">{t(`ui.quartet.voice.${i}`)}{kindLabel(i)}</span>
                </button>
              );
            })}
          </div>
          <div className="controls">
            <div className="group write" role="group">
              <button className="btn-acc" onClick={() => update(activeStaff, applyAccidental(session, -1))} aria-label="flat" title={t("ui.accidental.flat.help")}>♭</button>
              <button className="btn-acc" onClick={() => update(activeStaff, applyAccidental(session, 0))} aria-label="natural" title={t("ui.accidental.natural.help")}>♮</button>
              <button className="btn-acc" onClick={() => update(activeStaff, applyAccidental(session, 1))} aria-label="sharp" title={t("ui.accidental.sharp.help")}>♯</button>
              {florid && (
                <span className="values" role="radiogroup" aria-label={t("ui.value")}>
                  {([[1, "8"], [2, "4"], [3, "3"], [4, "2"], [6, "6"], [8, "1"]] as const).map(([n, key]) => (
                    <button key={n} className="btn-val" role="radio" aria-checked={noteValue === n} aria-pressed={noteValue === n} onClick={() => setNoteValue(n)} title={t(`ui.value.${n}`, { key })} aria-label={t(`ui.value.${n}`, { key })}>
                      <NoteIcon slots={n} />
                    </button>
                  ))}
                </span>
              )}
              {GRID && (
                <button className="btn-hold" onClick={hold} disabled={session.selected === 0 || session.notes[session.selected - 1] === null} title={t("ui.quartet.holdHelp")}>
                  {t("ui.quartet.hold")}
                </button>
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
      idle={STEP.figure ? `J. J. Fux, Gradus ad Parnassum (Vienna, 1725), Fux #${STEP.figure}, p. ${STEP.page}. Encoding: Four Score and More / Open Music Theory (Mark Gotham), CC0-1.0.` : `J. J. Fux, Gradus ad Parnassum (Vienna, 1725), p. ${STEP.page}: left to private study. Cantus firmus: Fux's.`}
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
            slots={BARS}
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
            trio={{ secondOn, onSecond: setSecondOn, thirdOn, onThird: setThirdOn }}
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
            {fuxOpen && STEP.fux && missing === 0 && (
              <section className="trio-with-fux">
                <h4>{t("ui.trio3.withFux")}</h4>
                <ul>
                  {mine.map((i) => {
                    const fux = STEP.fux![i];
                    const onsets = fux.map((x, k) => k).filter((k) => fux[k] !== HOLD);
                    const same = onsets.filter((k) => sessions[i].notes[k] === fux[k]).length;
                    const n = onsets.length;
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
            {hasFux && !fuxOpen && <p className="help">{t("ui.trio3.fuxLocked")}</p>}
            {!hasFux && <p className="help">{t("ui.quartet.private", { page: STEP.page })}</p>}
          </>
        ) },
        { id: "guide", text: true, label: t("ui.howtoTab"), content: (
          <Guide exercise={<>
            <blockquote className="tutor" lang="en">
              <span className="speaker">{t("tutor.speaker.aloysius")}.</span> “{t(`ui.quartet.intro${species}`)}”
              <cite title={t(`ui.quartet.introLa${species}`)} lang="la">{t(`ui.quartet.cite${species}`)}</cite>
            </blockquote>
            <p className="help trio-help">{t("ui.quartet.help")}</p>
            <p className="help trio-help">{t(`ui.quartet.help${species}`)}</p>
            {!hasFux && <p className="help trio-help">{t("ui.quartet.private", { page: STEP.page })}</p>}
          </>} />
        ) },
      ]}
    />
  );
}
