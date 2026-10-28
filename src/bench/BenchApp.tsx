/**
 * The testbench (D170; D175; D178; D179-D180): prototypes of the instrument tried on the game itself,
 * judged. ⚙ chooses the prototype (protos.ts), the piece (D192: a wheel of the fugues' cards,
 * FuguePicker.tsx), the ensemble
 * (sound.ts), the tuning (tuning.ts) and the sound's delay; the title the voice and where to start; ?
 * says how each is played. Each prototype lays the screen out its own way. A computer's keys and a MIDI
 * keyboard play too. D219: a phone's modes LADDER and SUBJECT, each WITH KIMIKO ISHIZAKA as a switch
 * (her recording the only accompaniment, the player's voice on its own sound); failing always on; TUNING
 * and LAB folded into one button each; every mode's rules drawn (ModeDiagram.tsx).
 * D233: opens on HOME (Home.tsx); the platform guessed from the pointer (home.ts; ⚙ PLAY ON overrides
 * it); the title card trimmed (the piece, the stage, the voices, PLAY; ⚙ ? and LEARN as icons); no
 * levels, no LAB; SOUND folded; WITH KIMIKO an unlockable (the feat KIMIKO ISHIZAKA); MIDI CONTROLLER
 * offered while a MIDI input is connected.
 * D237: streamlined: a piece chosen opens a small pop-up over the cards (its formal title, the voice,
 * ▶ PLAY straight into the count-in); CONTINUE and ▶ NEXT start at once; the result is the grade, the
 * score, AGAIN, NEXT and ✕. The tutorial's entry points only with `?dev=1`. The minimal page for
 * friends (play.html, `APP.lite`): the card grid (LiteGrid.tsx) instead of HOME, the platform as
 * detected, its own progress (lite.ts), ⚙ with the volume, the sound's delay and (phone only) the interface.
 */
import { keyWordsIn, lang, LANGS, pieceName, setLang, tr, voiceName, type Lang } from "../i18n/index.ts";
import { ornamentMark, ornamentsOf } from "../touch/ornament-play.ts";
import { BachTalk } from "./Bach.tsx";
import { accuracy, passed, TRACKS, type Line, type Run } from "./lessons.ts";
import { answer, askFirst, nextLesson, recordLesson, skipLesson, triesAt, tutorialDone } from "./tutorial.ts";
import { LessonMap, PlayedBefore } from "./LessonMap.tsx";
import { tempoOf } from "../touch/tempi.ts";
import { presetById, setPreset } from "../touch/sound.ts";
import { PIECE_SOUND, soundFor } from "../touch/piece-sound.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { ladderGeometry, MusicBox, inkOf, setBoxPainter, type Frame } from "../touch/MusicBox.tsx";
import { displayFor, engraved, layoutOf, saveDisplay, saveDisplayFor, type DisplayMode } from "./sheet-format.ts";
import { blankPage, loadSheet, paperInk, sheetView, unmountSheets } from "./sheet-view.ts";
import { DisplayChoice } from "./DisplayChoice.tsx";
import { AUTO, BOXV, variantRows } from "../touch/box-variants.ts";
import { uiRows } from "../touch/ui/index.ts";
import { InterfaceFold } from "./InterfaceFold.tsx";
import { PlayArea, setTargetsDpr, type Painter, type ThumbEvents } from "../touch/PlayArea.tsx";
import { Choice, loadDrums, Panel, Tapper } from "../touch/Panels.tsx";
import { SoundFold } from "./SoundFold.tsx";
import { Home } from "./Home.tsx";
import { detectedPlatform, midiInputNames, platformOf, type PlatformPref } from "./home.ts";
import { BtLite, HeadphonesFold, keepBtLag, useHeadphones } from "./Headphones.tsx";
import { Chip, voicing, type Sounding } from "../touch/chip.ts";
import { barAt, beatOf, fugueById, keyAt, keyName, type TouchFugue, fugueOnly, cadenceName } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { setTuning } from "../touch/tuning.ts";
import { accompaniment, startTick, stepRange, subjectMarks, entrySpans, voicesFrom } from "../touch/voice-mode.ts";
import { paintProto, setPaperLook } from "./paint-proto.ts";
import { laneLine, ProtoGame, type KeyPress } from "./proto-game.ts";
import { lineKey, subjectLine } from "./subject-line.ts";
import { FuguePicker } from "./FuguePicker.tsx";
import { TuningSelect } from "./TuningSelect.tsx";
import { resolveTuning, tuningPrefOf, tuningShort, type TuningPref } from "../touch/instrument-tuning.ts";
import { SideHint, SideLegend } from "./SideNotes.tsx";
import { ModeHow } from "./ModeDiagram.tsx";
import { herClock, herMap } from "./her-clock.ts";
import { Her, HER_FADE, herBuffer, herState, loadHer, releaseHer } from "./with-her.ts";
import { cardById, readBest, recordBest } from "./cards.ts";
import { beatenFugues, fugueOf, herUnlocked, isPrelude, locked, paired, preludeOf, recordFugue, recordPrelude, stageMode } from "./stages.ts";
import type { Tier } from "./tiers.ts";
import { judgeSeal, readSeals, recordSeal } from "./seals.ts";
import { earnFeats, type FeatId } from "./feats.ts";
import { Achievements, FeatToast } from "./Achievements.tsx";
import type { ArtStats } from "./articulation.ts";
import { VERSION } from "./version.ts";
import { APP } from "./config.ts";
import { defaultVoice, nextIn } from "./flow.ts";
import { SheetCard } from "./SheetCard.tsx";
import type { Sheet } from "./score-sheet.ts";
import { HearSubject, type Performed } from "./HearSubject.tsx";
import { applyLiteDrums, liteDrums, LiteDrumsSwitch } from "./LiteDrums.tsx";
import { ornamented } from "./hear-sound.ts";
import { bestReading, chosenReading, readingsOf, type Reading } from "../touch/readings.ts";
import { ManualMap } from "./manual/ManualMap.tsx";
import { AskScreen, GripScreen, LensSheet, PlacementScreen } from "./manual/Screens.tsx";
import { lessonById, runOf, SOUND_PRESET, soundOf, stagePassed, checkpointOf, type DemoStyle, type ManualLesson, type Material, type PartId } from "./manual/lessons.ts";
import { LensTally } from "./manual/lens.ts";
import { paintAids } from "./manual/aids.ts";
import { PLACEMENT, PLACEMENT_SOUND, place, worst, type Placement, type PlacementTake } from "./manual/placement.ts";
import { applyPlacement, markSeen, nextLesson as nextManual, progress as manualProgress, readManual, recordTake, setAnswer, setAside, testOut as manualTestOut, triesOf, type Answer } from "./manual/store.ts";
import { LabRecorder } from "./lab/log.ts";
import type { ReactNode } from "react";
import { LITE_HINT, liteAll, liteExtra, liteNextOrder, litePlatform, litePlatformPref, readLite, saveLitePlatform, recordLite, recordLiteBest, recordLiteSlow, RULE_LEVELS, tempoEarned, startHere, writeLite } from "./lite.ts";
import { LiteGrid } from "./LiteGrid.tsx";
import { setUnlocked, unlocked } from "./unlock.ts";
import { VersionTap } from "./Secret.tsx";
import { PlayPop } from "./PlayPop.tsx";
import { isWtcFugue, nextStep, readSteps, saveStep, stepBeat, stepSound, stepTempi, stepWord, tempoOpen, type TempoStep } from "./tempo-steps.ts";
import { ToolsButton, ToolsPanel } from "./ToolsPanel.tsx";
import { mineGain, practiceOptions, practiceRun, readTools, type PracticeRun, type ToolsState } from "./practice.ts";
import { tt } from "./tools-i18n.ts";
import { tierCards } from "./tiers.ts";
import { bookCards } from "./cards.ts";
import { btAuto, driftOf, latencyOf, setupKey } from "../touch/headphones.ts";
import { LagSetting } from "../touch/Panels.tsx";
import { RegistrationStops } from "../touch/RegistrationStops.tsx";
import { hasStops, voicePatch } from "../touch/registration.ts";
import { ARROW_KEYS, arrowOf, dynamic, easyOf, KEY_ROWS, type KeysLayout, keyId, keyRow, menuOf, midiId, moveOf, offered, PROTOS, protoById, roadAlone, takesHer, type Platform, type ProtoId } from "./protos.ts";

/** D314: how long (s, from the start of play) the reading's marks are explained in the box. */
const LEGEND_S = 6;
const PICK_KEY = "tb-pick-v2";
/** D233: ⚙ PLAY ON: AUTO (from the pointer) or a platform chosen. */
const PLATFORM_KEY = "tb-platform-v1";
const LAG_KEY = "tg-lag";
const LAG_SETUP_KEY = "tg-lag-setup";
// D203: a new key, so that every player starts on the fugue's own sound.
// D208: a new key, so every player starts on the sampled harpsichord.
// D246: each piece its own sound (piece-sound.ts), the player's choice kept per piece.
const SOUND_KEY = "tg-sound-by-piece-v1";
const DEFAULT_SOUND = "harpsichordSampled";
const TUNING_KEY = "tg-tuning";
/** D327: play.html's ⚙ TUNING (INSTRUMENT DEFAULT where nothing is kept). */
const LITE_TUNING_KEY = "tb-lite-tuning-v1";
// D219: WITH KIMIKO ISHIZAKA, the player's voice has its own sound (over her piano), kept apart.
const HER_SOUND_KEY = "tb-her-sound-v1";
/**
 * D219: the player's voice over her piano: TRAVERSO (sound.ts), a breathy, sustained baroque flute (an
 * organ's stopped flute for the lower voices). A piano's note is struck and dies away; a flute's holds
 * steady with no hammer, so the player hears their own line apart from hers without covering her, and
 * a note held (or let go too soon) is heard as such; its sine-like tone adds few partials to clash
 * with hers. ⚙ SOUND overrides it.
 */
const HER_SOUND = "traverso";

interface Pick {
  proto: ProtoId;
  piece: string;
  voice: number;
  share: number;
  /** Unused since D208 (SIDEWAYS withdrawn). */
  legato: boolean;
  /** D219: WITH KIMIKO ISHIZAKA (D233: once unlocked; LADDER and the computer's modes, where her recording exists). */
  her: boolean;
  /** D216, KIMIKO: the player's own notes over her recording: a little under her, softer, or silent (judged only). */
  mine: Mine;
  /** D230: the computer HIGHWAY's keys: the home row's lanes, or SCALE KEYS (the experiment). */
  keys: KeysLayout;
}
type Mine = "on" | "soft" | "off";
/** D216: YOUR VOICE's levels (the player's notes' gain; 1 elsewhere). */
const MINE: Record<Mine, number> = { on: 0.75, soft: 0.4, off: 0 };
const DEFAULT: Pick = { proto: "ladder", piece: "wtc1f02", voice: 1, share: 0, legato: false, her: false, mine: "on", keys: "home" };

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no storage */
  }
}
/** D260: the minimal page's headphones' delay, for this visit only (sessionStorage). */
function sessionLag(): number | null {
  try {
    localStorage.removeItem(LAG_KEY);
    const v = sessionStorage.getItem(LAG_KEY);
    return v === null ? null : (JSON.parse(v) as number | null);
  } catch {
    return null;
  }
}
function saveSessionLag(l: number | null, setup?: string) {
  try {
    if (l === null) sessionStorage.removeItem(LAG_KEY);
    else sessionStorage.setItem(LAG_KEY, JSON.stringify(l));
    // D308: the output it was tapped with (BLUETOOTH MODE's AUTO counts it only there: headphones.ts btAuto).
    if (l === null || setup === undefined) sessionStorage.removeItem(LAG_SETUP_KEY);
    else sessionStorage.setItem(LAG_SETUP_KEY, setup);
  } catch {
    /* this page only */
  }
}
function sessionLagSetup(): string | undefined {
  try {
    return sessionStorage.getItem(LAG_SETUP_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function sane(p: Pick): Pick {
  const known = fugueById(p.piece).id === p.piece ? p.piece : DEFAULT.piece;
  // D229: Book I's preludes are stage 1 (stages.ts); a locked fugue gives its prelude; Book II's preludes still give their fugues.
  const pair = paired(known) && isPrelude(known) ? known : fugueOnly(known);
  // D232: a piece whose tier is closed gives I/1's prelude. D237: the minimal page has its own unlocking (lite.ts), Book I only.
  // D263: on a phone the minimal page has no preludes: a prelude gives its fugue.
  const mob = APP.lite && litePlatform() === "mobile";
  // D275: and Book II's fugues. D343: those and the MORE BACH and CHORALES pieces only once unlocked (unlock.ts).
  const piece = APP.lite ? (paired(pair) ? (mob && isPrelude(pair) ? fugueOf(pair) : pair) : unlocked() && (/^wtc2f\d\d$/.test(pair) || liteExtra(pair)) ? pair : startHere(mob)) : locked(pair) ? (locked(preludeOf(pair)) ? "wtc1p01" : preludeOf(pair)) : pair;
  const f = fugueById(piece);
  const share = Math.min(0.99, Math.max(0, p.share || 0));
  const singing = voicesFrom(f, startTick(f, share));
  // D237: a fugue's voice of the first entry by default (flow.ts). D251: a prelude always its own part
  // (stages.ts `preludePart`), whatever was chosen or kept before.
  const voice = f.kind !== "prelude" && singing.includes(p.voice) ? p.voice : defaultVoice(f, singing);
  // D219: a stored mode withdrawn (HIGHWAY, TWO VOICES, KIMIKO on a phone) falls back to LADDER; a stored KIMIKO as LADDER WITH KIMIKO.
  const was = p.proto as string;
  const proto = PROTOS.some((x) => x.id === was) ? p.proto : DEFAULT.proto;
  // D233: EASY's level no longer chosen (protos.ts easyOf).
  const { voice2: _v2, fail: _fail, easy: _easy, ...rest } = p as Pick & { voice2?: number; fail?: boolean; easy?: string };
  return { ...DEFAULT, ...rest, piece, share, voice, proto, legato: !!p.legato, her: was === "kimiko" || p.her === true, mine: p.mine in MINE ? p.mine : DEFAULT.mine, keys: p.keys === "scale" ? "scale" : "home" };
}

/** D237: "title" is the pop-up over the cards (HOME, the wheel, the minimal page's grid). */
type Phase = { kind: "home" } | { kind: "title" } | { kind: "play" } | { kind: "result"; stage?: { won: boolean; fugue: string }; her?: boolean; right: number; wrong: number; missed: number; stray: number; of: number; score: number; grade: string; captured: number; entries: number; maxStreak: number; stars: number; failedBar: number | null; lastBar?: number; free?: { mordents: number; shorts: number; trills: number }; progress?: number; sheet?: Sheet; best?: { before: number | null; fresh: boolean; old?: number | null } | null; art?: ArtStats; lanes?: { exact: number; relative: number }; report?: string; seal: { kind: string; earned: boolean; why: string } | null; tempo?: { step: TempoStep; beat: string; apart: boolean }; feats?: FeatId[]; opened?: Tier[]; next?: string | null } | { kind: "settings" } | { kind: "achievements"; fresh?: FeatId[] } | { kind: "lessons"; focus?: ProtoId } | { kind: "talk"; lines: Line[]; next: "play" | "again" | "advance" | "watch" } | { kind: "mtalk"; title: string; lines: Line[]; choices?: { label: string; act: () => void }[]; extra?: ReactNode; done?: () => void };

/**
 * D342, THE MANUAL under way: a lesson's step (its stage: a material), as HEAR (Herr Bach's
 * demonstration, in a manner, the manners still to come queued), a TAKE, a checkpoint played to test out
 * of a part, or a placement passage.
 */
type ManRun = { id: string; stage: number; mode: "hear" | "take" | "test" | "placement"; style?: DemoStyle; queue?: DemoStyle[]; alt?: boolean; place?: string; part?: PartId; takes: number; retake?: boolean };

export function BenchApp() {
  // D233: the game opens on HOME.
  const [phase, setPhase] = useState<Phase>({ kind: "home" });
  /** Where the panels (⚙, ?, ACHIEVEMENTS, the LESSON MAP) close to: HOME or the title card they were opened from. */
  const origin = useRef<"home" | "title">("home");
  if (phase.kind === "home" || phase.kind === "title") origin.current = phase.kind;
  const back = () => setPhase({ kind: origin.current });
  // D237: the minimal page keeps no pick (it opens on its grid; Prelude 1 its first card).
  const [pick, setPickRaw] = useState<Pick>(() => sane(APP.lite ? { ...DEFAULT, piece: startHere(litePlatform() === "mobile"), voice: -1 } : load(PICK_KEY, DEFAULT)));
  const setPick = (p: Partial<Pick>) =>
    setPickRaw((cur) => {
      // A new piece starts at its own tempo (D184; the slider moves it after).
      const next = sane({ ...cur, ...p, ...(APP.lite ? { share: 0, her: false } : {}) });
      if (!APP.lite) save(PICK_KEY, next);
      return next;
    });
  // D237, the minimal page: its own progress, instruction lines seen and volume (lite.ts).
  const [lite, setLite] = useState(readLite);
  // D239: the bench shows the first game's one-line rule per mode too (START plays at once: no other place to read it).
  const [benchSeen, setBenchSeen] = useState<string[]>(() => load<string[]>(HINTS_KEY, []));
  // D260: on the minimal page the headphones' delay lasts for the visit only (a phone does not tell the
  // speaker from headphones: a delay tapped once stayed on without them, and every note was judged late:
  // the owner: "headphone delay was on even though I have no headphones on, that's maybe why I was failing").
  const [lag, setLagRaw] = useState<number | null>(() => (APP.lite ? sessionLag() : load<number | null>(LAG_KEY, null)));
  /** D308: a delay tapped since the page loaded (one restored from the visit is not, for BLUETOOTH MODE's AUTO). */
  const lagFresh = useRef(false);
  const applyLag = (l: number | null) => {
    setLagRaw(l);
    if (APP.lite) {
      lagFresh.current = l !== null;
      saveSessionLag(l, setupKey(chip.current ? latencyOf(chip.current.ctx) : undefined));
    }
    else save(LAG_KEY, l);
    if (chip.current) chip.current.lag = l;
  };
  // D223: a delay tapped is kept for the listening setup it was tapped with (not on the minimal page).
  const setLag = (l: number | null) => {
    applyLag(l);
    if (!APP.lite) hp.record(l);
    // D299: a Bluetooth delay kept on the device, to be offered again (never applied by itself).
    keepBtLag(l);
  };
  // D299: the sound's delay retuned after a run in BLUETOOTH MODE (from, to: s), shown on the result.
  const [retuned, setRetuned] = useState<{ from: number; to: number } | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>(() => load<Record<string, string>>(SOUND_KEY, {}));
  // D351: the tempo step chosen for each MORE BACH and CHORALES piece (tempo-steps.ts), kept on the device.
  const [tempoSteps, setTempoSteps] = useState<Record<string, TempoStep>>(readSteps);
  const [herSound, setHerSoundRaw] = useState<string>(() => load<string>(HER_SOUND_KEY, HER_SOUND));
  // D327: ⚙ TUNING: INSTRUMENT DEFAULT (the sound's own, instrument-tuning.ts) or a temperament at a pitch; applied below, once the sound is known.
  const [tuningPref, setTuningPrefRaw] = useState<TuningPref>(() => tuningPrefOf(load<unknown>(APP.lite ? LITE_TUNING_KEY : TUNING_KEY, null)));
  const changeTuning = (p: TuningPref) => {
    setTuningPrefRaw(p);
    save(APP.lite ? LITE_TUNING_KEY : TUNING_KEY, p);
  };
  useEffect(() => {
    // D344: the friends' DRUMS (a backing track, off by default) on play.html; the full pages' as before.
    if (APP.lite && !unlocked()) applyLiteDrums();
    else loadDrums();
  }, []);
  // D233: the MIDI inputs connected (MIDI CONTROLLER offered while there is one).
  const [midi, setMidi] = useState<string[]>([]);
  // D182: mobile or computer. D233: guessed from the pointer (a finger and no hover: the phone's), ⚙ PLAY ON overrides it.
  const [detected] = useState(detectedPlatform);
  const [pref, setPrefRaw] = useState<PlatformPref>(() => load<PlatformPref>(PLATFORM_KEY, "auto"));
  // D263: the minimal page its own (⚙ PLAY ON, kept apart from the bench's).
  const platform = APP.lite ? litePlatform() : platformOf(pref === "mobile" || pref === "computer" ? pref : "auto", detected);
  // D343: play.html for the friends (Book I, no TOOLS, the fewest choices) unless unlocked on this device (unlock.ts); the bench always full.
  const [full] = useState(() => !APP.lite || unlocked());
  const setPref = (p: PlatformPref) => {
    setPrefRaw(p);
    save(PLATFORM_KEY, p);
  };
  // D225: Herr Bach's HAVE YOU PLAYED BEFORE?, right after opening, until answered on this platform.
  // D237: only with `?dev=1` (the tutorial withdrawn for now), never on the minimal page.
  const [asking, setAsking] = useState(() => APP.dev && !APP.lite && askFirst(platform));
  const [note, setNote] = useState("");
  // D192: the fugue wheel. D233: opened from HOME (CHOOSE PIECE); a piece chosen goes to its title card.
  const [wheel, setWheel] = useState(false);
  // D188: a lesson with Herr Bach plays its own passage, on EASY at the lesson's level.
  // D225: a lesson of a platform's track (TRACKS), in its own mode.
  const [lesson, setLesson] = useState<{ pl: Platform; n: number; run: Run } | null>(null);
  // D280: the tutorial's demonstration under way (the game plays the step, the thumbs shown).
  const [watching, setWatching] = useState(false);
  // D280: the tutorial's steps to choose from (play.html).
  const [steps, setSteps] = useState(false);
  // D326, TOOLS: the panel open; the practice run under way (null: a scored run); the last practice's tally.
  const [toolsOpen, setToolsOpen] = useState(false);
  const practice = useRef<PracticeRun | null>(null);
  const [practiced, setPracticed] = useState<{ piece: string; right: number; of: number } | null>(null);
  // D342, THE MANUAL (play.html's phone tutorial): the step under way, its Part 0 screens, the placement's takes.
  const [man, setMan] = useState<ManRun | null>(null);
  const [manScreen, setManScreen] = useState<null | "grip" | "ask" | { placement: Placement; retake: string | null }>(null);
  const placementTakes = useRef<PlacementTake[]>([]);
  const recRef = useRef<LabRecorder | null>(null);
  const manLesson: ManualLesson | undefined = man && man.mode !== "placement" ? lessonById(man.id) : undefined;
  const manMat: Material | undefined = man ? (man.mode === "placement" ? PLACEMENT.find((e) => e.id === man.place)?.m : man.alt && manLesson?.alt ? manLesson.alt : manLesson?.stages[man.stage]?.m) : undefined;
  const manRun = manMat ? runOf(manMat, man?.mode === "hear" ? man.style : undefined) : undefined;
  const run = lesson?.run ?? manRun;
  const f = fugueById(run?.piece ?? pick.piece);
  // D229: a prelude on HIGHWAY (a phone's five lanes, a computer's keys), a fugue in the mode chosen.
  // D237: the minimal page: a phone's prelude on HIGHWAY, its fugue on LADDER; a computer's both on HIGHWAY (keys).
  const proto = protoById(run ? run.proto : stageMode(f, platform, APP.lite ? (platform === "computer" ? "keys" : "ladder") : offered(pick.proto, platform, midi.length > 0)));
  const prelude = !run && f.kind === "prelude";
  // D298: ⚙ DISPLAY: the box (DEFAULT), CANTUS (to come: the box meanwhile), or the fugue's sheet
  // (SHEET · TWO STAVES, SHEET · ONE STAFF PER VOICE) where it is engraved (the 48 fugues); kept on the device.
  // D327: kept per piece; never chosen for a piece: one staff per voice for four and five voices once the tutorial is passed, else the last choice.
  const [, displayChanged] = useState(0);
  const display = displayFor(f.id, f.voices.length, tutorialDone(platform));
  const setDisplay = (m: DisplayMode) => (saveDisplayFor(f.id, m), saveDisplay(m), displayChanged((n) => n + 1));
  const sheetLayout = layoutOf(display);
  // D342: THE MANUAL's lessons on the box (their aids are drawn over it).
  const sheetOn = !man && !!sheetLayout && engraved(f.id) && proto.layout === "bars";
  useEffect(() => {
    if (!sheetOn || !sheetLayout) {
      setBoxPainter(null);
      unmountSheets();
      setPaperLook(false);
      setTargetsDpr(2);
      document.documentElement.classList.remove("tb-paper");
      return;
    }
    void loadSheet(f.id, sheetLayout);
    setPaperLook(true);
    setTargetsDpr(1);
    document.documentElement.classList.add("tb-paper");
    // While the engraving loads: the white page alone.
    setBoxPainter((c, w, h, fr) => {
      const v = sheetView(f.id, sheetLayout);
      if (v) v.paint(c, w, h, fr);
      else blankPage(c, w, h);
      return true;
    });
    return () => {
      setBoxPainter(null);
      unmountSheets();
      setPaperLook(false);
      setTargetsDpr(2);
      document.documentElement.classList.remove("tb-paper");
    };
  }, [sheetOn, sheetLayout, f.id]);
  const from = run ? run.from : startTick(f, pick.share);
  const voice = run ? run.voice : pick.voice;
  // D272: on play.html a fugue is played by its chosen reading (D274: at the recordings' tempo, never the
  // book's: the owner, "fugues should not be too fast").
  // D282: a tutorial step may name its reading.
  const reading = run?.reading ? (readingsOf(run.piece).find((x) => x.id === run.reading) ?? null) : APP.lite && !run && f.kind === "fugue" ? (full ? chosenReading(f.id) : bestReading(f.id)) : null;
  // D351: a MORE BACH or CHORALES piece at the tempo chosen on its pop-up (SLOW · DEFAULT · FAST, kept per piece), once unlocked.
  // D356: a WTC fugue's too, in the friends' view once finished with an A or better (tempoEarned), in the unlocked view always.
  const opensTempo = (id: string) => APP.lite && tempoOpen(id, full, tempoEarned(id, lite));
  const stepOf = (id: string): TempoStep => (opensTempo(id) ? (tempoSteps[id] ?? "default") : "default");
  const tempi = opensTempo(f.id) ? stepTempi(f.id) : null;
  const step = stepOf(f.id);
  const bpm = run ? run.bpm : tempi ? tempi[step] : tempoOf(f.id);
  // D216, KIMIKO (D219: WITH KIMIKO ISHIZAKA, a switch in LADDER and SUBJECT): the player over Kimiko
  // Ishizaka's recording, the game on her time; only where she is timed (whatever pieces
  // data/recordings/ishizaka-ticks.json holds); her track let go when the switch or the piece is left.
  // D233: once unlocked (the feat KIMIKO ISHIZAKA: all 24 Book I fugues beaten).
  const unlockedHer = useMemo(() => !APP.lite && herUnlocked(), [phase.kind]);
  const herHere = unlockedHer && takesHer(proto.id) && !run && !!herMap(f.id);
  const kimiko = herHere && pick.her;
  const hm = kimiko ? herMap(f.id) : null;
  // D219: the sound playing: WITH KIMIKO, the player's voice's own (TRAVERSO unless changed in ⚙ SOUND).
  // D265's lock (a piece's own sound until an A or S) lifted by D327: every sound open from the start.
  // D342 (the owner's decision 4): a lesson sounds on the instrument that makes its rudiment audible; the placement on the sampled piano.
  // D351: each tempo step its own sound (tempo-steps.ts), unless the player chose one for the piece (kept at every tempo).
  // D356: in the friends' view too, where a WTC fugue's tempo is open (no sound chosen there).
  const soundAt = (id: string) => {
    const mine = full ? chosen : {};
    const st = !mine[id] ? stepSound(id, stepOf(id)) : undefined;
    return soundFor(id, st ? { ...mine, [id]: st } : mine, DEFAULT_SOUND);
  };
  const sound = man ? (man.mode === "placement" ? PLACEMENT_SOUND : SOUND_PRESET[soundOf(manLesson!, manMat)]) : soundAt(f.id);
  const soundNow = kimiko ? herSound : sound;
  // D327: the tuning in force: the sound's own (INSTRUMENT DEFAULT) or the one chosen; the samples retuned by tuning.ts hz() (sampled.ts rateFor).
  const tuning = resolveTuning(tuningPref, soundNow);
  useEffect(() => {
    // (WITH KIMIKO her pitch is set while she plays; this one put back after.)
    if (phase.kind !== "play" || !hm) setTuning(tuning.id, tuning.a);
  }, [tuning.id, tuning.a]);
  const setSound = (id: string) => {
    if (kimiko) {
      setHerSoundRaw(id);
      save(HER_SOUND_KEY, id);
    } else {
      const next = { ...chosen, [f.id]: id };
      setChosen(next);
      save(SOUND_KEY, next);
    }
  };
  const [, herLoaded] = useState(0);
  /** A start asked for while her track loads: the game begins once it is ready (this piece's key). */
  const waitingHer = useRef<string | null>(null);
  /** Her track fetched and decoded (once a sound exists to decode it into); the title card follows. */
  const wantHer = () => {
    const ch = chip.current;
    if (!hm) return releaseHer();
    if (!ch) return;
    if (herState(hm) === "none") herLoaded((n) => n + 1);
    void loadHer(hm, ch.ctx).then(() => herLoaded((n) => n + 1));
  };
  useEffect(() => {
    setPreset(presetById(soundNow).id);
  }, [soundNow]);

  // D214, SUBJECT: every voice has the subject in turn.
  const subjectMode = proto.id === "subject";
  const played = subjectMode ? f.voices.map((_, i) => i) : [voice];
  // D247: LADDER: the box holds the whole piece's range at one scale, whatever the voice (the voice's
  // own range, D211's margins squeezing the rest, lost the fugue's architecture with the soprano or
  // the bass); the touches judged on rows no smaller than LADDER_ROW_MIN (proto-game.ts).
  const range = useMemo(() => {
    const r = stepRange(f);
    return proto.id === "ladder" ? { lo: r.lo - 1, hi: r.hi + 1 } : r;
  }, [f, proto.id]);
  // The design study (box-variants.ts, `?boxv=N`): each voice's range, for the staves.
  const study = useMemo(() => (BOXV ? { ranges: f.voices.map((ns) => ({ lo: Math.min(...ns.map((n) => n[3])), hi: Math.max(...ns.map((n) => n[3])) })) } : {}), [f]);
  // A lesson's passage: only the entries it holds (alone: only the voice's own).
  const marks = useMemo(() => {
    const spans = entrySpans(f).filter((e) => !run || (e.on < run.until && e.end > run.from && (!run.solo || e.voice === run.voice)));
    const cadences = (f.cadences ?? []).filter((c) => !run || (c.on >= run.from && c.on <= run.until)).map((c) => ({ on: c.on, text: lang() === "en" ? cadenceName(c) : `${tr(cadenceName(c).split(" · ")[0])} · ${keyWordsIn(c.key)}` }));
    const ornaments = new Map([...ornamentsOf(f)].map(([k, o]) => [k, ornamentMark(o)]));
    // D272: the reading's marks on every entry of the subject in the voice played (each note by its place in the subject).
    const readingMarks = new Map<string, Reading["notes"][number]>();
    if (reading) for (const e of f.entries) if (!e.theme && played.includes(e.voice)) e.notes.forEach(([on], j) => reading.notes[j] && readingMarks.set(`${e.voice}:${on}`, reading.notes[j]));
    return { ...subjectMarks(f), spans, names: f.voiceNames, cadences, ornaments, readingMarks };
  }, [f, run, reading?.id, voice]);
  const chip = useRef<Chip | null>(null);
  /** D308: BLUETOOTH MODE on AUTO (the minimal page): the reported latency, or the delay tapped for this output (btAuto). */
  const btLite = (ctx = chip.current?.ctx) => btAuto(lag, ctx ? latencyOf(ctx) : undefined, { setup: sessionLagSetup(), fresh: lagFresh.current });
  // D223: other headphones noticed (a setup seen before gets its delay back), BLUETOOTH MODE, the screen's delay.
  const hp = useHeadphones(chip, APP.lite ? () => {} : applyLag);
  const [calib, setCalib] = useState(false);
  const game = useRef<ProtoGame | null>(null);
  const paint = useRef<Painter | null>(null);
  const frame = useRef<Frame>(preview());
  const count = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);

  function preview(): Frame {
    const b = beatOf(f);
    // D214: SUBJECT's line, and the fugue without it.
    const line = subjectMode ? subjectLine(f, from, run?.until) : null;
    const lane = (v: number) =>
      laneNotes(
        f.voices[v].filter(([on]) => on >= from && (!run || on < run.until)),
        b.ticks,
        v,
      );
    return {
      now: from - b.ticks,
      tps: 1,
      key: keyAt(f, from),
      barTicks: f.barTicks,
      beatTicks: b.ticks,
      count: f.voices.length,
      lo: range.lo,
      hi: range.hi,
      ...(proto.id === "ladder" ? { spill: stepRange(f), ...study } : {}),
      voice,
      notes: line ? [...line.notes, ...line.second].sort((a, c) => a[0] - c[0] || c[2] - a[2]).map(([on, dur, midi, step, v]) => ({ on, dur, midi, step, long: dur >= b.ticks, state: "pending" as const, voice: v })) : lane(voice),
      others: run?.solo || kimiko ? [] : line ? accompaniment(f, from, -1).filter((n) => !line.keys.has(lineKey(n.voice, n.on, n.midi))) : accompaniment(f, from, voice).filter((n) => !played.includes(n.voice) && (!run || n.on < run.until)),
      ...marks,
      piece: f.id,
    };
  }

  useEffect(() => {
    const unlock = () => ensureChip();
    for (const ev of ["touchend", "pointerup", "click", "keydown"]) window.addEventListener(ev, unlock, true);
    return () => {
      for (const ev of ["touchend", "pointerup", "click", "keydown"]) window.removeEventListener(ev, unlock, true);
    };
  }, []);

  useEffect(() => {
    shownAt.current = performance.now();
    if (phase.kind !== "play" && phase.kind !== "result") frame.current = preview();
  }, [phase, pick]);

  function ensureChip(): Chip {
    if (!chip.current) {
      chip.current = new Chip();
      chip.current.lag = lag;
      hp.attach(chip.current);
      // D237: the minimal page's volume.
      if (APP.lite) chip.current.setVolume(readLite().volume);
      prepared.current();
    }
    void chip.current.resume();
    return chip.current;
  }

  // D190: a recorded ensemble loads the piece's recordings (every voice's pitches; the player's an
  // octave either side for ORGANO PLENO) once there is a sound to decode them into.
  function prepareSound() {
    void chip.current?.prepare(
      f.voices.flat().map((n) => n[2]),
      played.flatMap((v) => (f.voices[v] ?? []).map((n) => n[2])),
    );
  }
  // (ensureChip may run from the first render's listener: it reaches this render's piece through a ref.)
  const prepared = useRef(prepareSound);
  prepared.current = prepareSound;
  useEffect(prepareSound, [soundNow, f, voice]);

  useEffect(wantHer, [phase.kind, f.id, hm]);

  useEffect(() => {
    if (phase.kind !== "play" || !chip.current) return;
    // D216, KIMIKO: on her time and at her pitch (equal temperament, her A), her track from the
    // count-in; the player's notes at YOUR VOICE's level; all restored after.
    const ch = chip.current;
    const prac = practice.current;
    const herBuf = herBuffer(hm);
    if (kimiko && (!hm || !herBuf)) return setPhase({ kind: "title" });
    const clock = hm && herBuf ? herClock(hm, f, from) : undefined;
    if (hm) setTuning("equal", hm.a);
    ch.mine.gain.value = kimiko ? MINE[pick.mine] : mineGain(readTools(f).balance, prac);
    // D219: failing always on (D225: in the lessons from the fourth on); WITH KIMIKO, the game sounds only the player's voice.
    setPaused(false);
    // D344: the friends' backing drums on a piece only (never in a lesson, a drill's click, the placement or TOOLS practice).
    if (APP.lite && !full) applyLiteDrums(liteDrums() && !run && !prac);
    const g = new ProtoGame(f, played, prac ? prac.from : from, proto, { bpm, legato: pick.legato, easy: run?.easy ?? easyOf(proto.id), fail: run ? run.fail : true, her: kimiko, bt: APP.lite ? btLite(ch.ctx) : hp.btFor(lag), scale: false, ...(run ? { until: run.until, wait: run.wait, solo: run.solo, coach: run.coach, demo: watching, guide: !watching && run.proto === "ladder" && (lesson?.pl === "mobile" || !!manLesson?.guide), ...(run.click ? { click: run.click } : {}), ...(run.demoStyle ? { demoStyle: run.demoStyle } : {}) } : {}), reading, ornHint: !run && !hintSeen.includes("ornament"), ...(clock ? { clock } : {}), ...(prac ? practiceOptions(prac) : {}) }, ch);
    const h = hm && herBuf ? new Her(ch, hm) : null;
    if (h && herBuf) h.begin(g, herBuf);
    // For the measurements (the bench's own checks): the game and her playing.
    (globalThis as { __kimiko?: unknown }).__kimiko = h ? { g, her: h, ctx: ch.ctx, map: hm } : undefined;
    const arrows = proto.id === "arrows" ? g.moves.map(arrowOf) : g.cues;
    game.current = g;
    // D220: the game under way, for the bench's own checks (driving the keys in a browser).
    (globalThis as { __bench?: unknown }).__bench = g;
    // D223: drawn with the screen's delay taken in.
    // D342: THE MANUAL's lens watching the run (its figures added to the results), each take a lab log
    // (as the STUDY's), and the lesson's visual aids drawn over the game's picture.
    const lens = man ? new LensTally(g) : null;
    const rec = man && !watching ? new LabRecorder(g, () => ch.heard(), { app: VERSION, at: new Date().toISOString(), passage: { piece: f.id, voice, fromBar: manMat?.fromBar ?? 1, toBar: manMat?.toBar ?? 1, bpm, tempoPct: 100, proto: "ladder", wait: !!run?.wait, bt: false, reading: null, sound: soundNow }, device: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1, ua: navigator.userAgent, lag: ch.lag }, area: { w: 0, h: 0 } }, lens?.feed) : null;
    if (lens) {
      g.lens = lens;
      if (!rec) g.tap = lens.feed;
    }
    recRef.current = rec;
    const aids = man && manLesson ? manLesson.aids : [];
    const firstTake = !!man && man.takes === 0;
    paint.current = (ctx, w, h) =>
      g.view(() => {
        paintProto(ctx, w, h, g, marks.subject);
        if (lens && aids.length) paintAids(ctx, w, h, g, lens, { aids, firstTake });
      });
    const b = beatOf(f);
    const auto = { id: 9000, held: null as { id: number; end: number } | null, last: -1 };
    let raf = 0;
    const loop = () => {
      rec?.frame();
      const done = g.step();
      frame.current = {
        now: g.viewNow,
        tps: g.tps,
        key: g.keyNow(),
        barTicks: f.barTicks,
        beatTicks: b.ticks,
        count: f.voices.length,
        lo: range.lo,
        hi: range.hi,
        ...(proto.id === "ladder" ? { spill: stepRange(f), ...study } : {}),
        voice,
        notes: g.notes,
        others: g.others,
        ...marks,
        piece: f.id,
        marks: g.marks,
        entryState: new Map(g.entries.map((e) => [`${e.voice}:${e.on}`, e.state])),
        arrows,
        // D208: no bosses in LADDER for now.
        bossFight: proto.id !== "ladder",
        pops: g.pops,
        bursts: g.bursts,
        zone: g.zone,
        // D314: the ornament's first-time hint as one comes; the reading's marks explained at the start.
        banner: g.ornHintOn && g.ornamentNear() ? tr("A SIGN OVER A NOTE: TOUCH IT, THEN SHAKE YOUR THUMB") : undefined,
        // D327: on the two bars the legend stands in the right side bar (SideLegend), off the first subject.
        ...(proto.layout === "bars" ? {} : { legendUntil: from + LEGEND_S * g.tps }),
      };
      if (legendRef.current) legendRef.current.style.opacity = String(Math.max(0, Math.min(1, (from + LEGEND_S * g.tps - g.now) / (2 * g.tps))));
      if (proto.layout === "bars") g.rows = boxRows(f.barTicks, g.now);
      if (rec && g.rows) rec.rows(g.rows.yOf(0), g.rows.rowH);
      if (AUTO) autoplay(g, auto);
      // D249: the centre holds the count-in only; the combo is by the score (paint-proto.ts scoreboard).
      if (count.current) count.current.textContent = g.countIn() ? String(g.countIn()) : "";
      if (done) {
        // D216: a lost run: she fades out over a second; the end: her last chord rings on.
        h?.stop(g.failedAt !== null ? HER_FADE.fail : HER_FADE.end);
        game.current = null;
        paint.current = null;
        if (prac) {
          // D326: a practice run keeps nothing (no grade, no best, no retuned delay): again at once (LOOP), else back to TOOLS with its tally.
          if (prac.loop) return void setPhase({ kind: "play" });
          const t = g.results();
          if (!prac.listen) setPracticed({ piece: f.id, right: t.right, of: t.of });
          practice.current = null;
          setPhase({ kind: "home" });
          setToolsOpen(true);
          return;
        }
        const r = g.results();
        // D314: an ornament shaken: its first-time hint is done.
        if (r.shakes.hit > 0 && !run) seenId("ornament");
        // D299: every run in BLUETOOTH MODE retunes a tapped delay a little by how late or early its notes were.
        const was = ch.lag;
        const drift = g.bt && was !== null && !lesson && !man ? driftOf(g.btOffsets) : 0;
        if (drift && was !== null) {
          const to = Math.round((was + drift) * 1000) / 1000;
          setLag(to);
          setRetuned({ from: was, to });
        } else setRetuned(null);
        if (man) {
          // D342: THE MANUAL's step over: its lens read, the next step chosen.
          recRef.current = null;
          manualDone(r, rec ? rec.finish() : undefined);
        } else if (lesson && watching) {
          // D280: the demonstration over: now the player, guided.
          setWatching(false);
          setPhase({ kind: "talk", lines: [{ text: "Now you. A thumb on the bars shows where each note lands, and which thumb." }], next: "play" });
        } else if (lesson) {
          // A lesson passed (its rule: by default the share right, a stray strike half a note) goes on; else once more.
          const l = TRACKS[lesson.pl][lesson.n];
          const ok = passed(l, r);
          recordLesson(lesson.pl, l.id, accuracy(r), ok);
          // D282: a step not passed says what fell short, in numbers.
          setPhase({ kind: "talk", lines: ok ? l.praise : [...l.again, ...(l.short ? [{ text: l.short(r) }] : [])], next: ok ? "advance" : "again" });
        } else if (APP.lite) {
          // D237: the minimal page keeps only the pieces finished (its own key), nothing of the bench's.
          // D264: nothing to unlock (all open): the piece kept as finished, no toast.
          // D356: a WTC fugue at SLOW: kept as finished, its grade and score apart (never its best, never what opens the tempo).
          const apart = step === "slow" && isWtcFugue(f.id);
          recordLite(f.id, r.failedBar !== null, platform === "mobile", apart ? undefined : r.grade);
          const opened: Tier[] = [];
          // D268: a whole piece finished: its final score against the best.
          const whole = r.failedBar === null && from === 0;
          const best = whole ? (apart ? recordLiteSlow(f.id, r.grade, r.sheet.final) : recordLiteBest(f.id, r.sheet.final)) : null;
          // D356: the tempo played, on the result.
          const tempo = tempi ? { step, beat: stepBeat(f.id, tempi[step]), apart } : undefined;
          // D308: read after the best score is kept (the cards show it; it was read before, so they did not until a reload).
          setLite(readLite());
          setPhase({ kind: "result", ...r, best, seal: null, tempo, opened, next: nextIn(liteNextOrder(f.id, platform === "mobile"), f.id) });
        } else {
          // D214: SUBJECT's grade is not any one voice's.
          if (r.failedBar === null && !subjectMode) recordBest(f.id, played, r.grade);
          // D229: a prelude reached to its end is beaten: its fugue unlocked (no seal, no feats: those are the fugues').
          if (prelude) {
            const won = recordPrelude(f.id, r.grade, r.failedBar !== null);
            setPhase({ kind: "result", ...r, seal: null, stage: { won, fugue: fugueOf(f.id) }, next: benchNext(f.id) });
            return;
          }
          // D196: the fugue's seal, judged over the whole run.
          const card = cardById(f.id);
          const seal = card
            ? judgeSeal(card, { f, tracks: subjectMode ? played.map((v) => ({ voice: v, notes: g.tracks.flatMap((t) => t.notes).filter((n) => n.voice === v).sort((a, c) => a.on - c.on) })) : g.tracks.map((t) => ({ voice: t.voice, notes: t.notes })), entries: g.entries, beat: b.ticks, grade: r.grade, tuning: tuning.id, whole: from === 0 && r.failedBar === null })
            : null;
          if (seal?.earned) recordSeal(f.id, played);
          // D232: a Book I fugue beaten (whole, to its end) is kept; the tiers it opened toasted (before the feats, which remember it too).
          const opened = recordFugue(f.id, r.grade, r.failedBar !== null, from === 0);
          // D224: the feats, judged over the run and what is kept.
          const feats = earnFeats({ piece: f.id, mode: proto.id, whole: from === 0 && r.failedBar === null, ...r, strettos: g.strettoState.filter((s) => s === "cleared").length, her: !!h, tuning: hm ? "equal" : tuning.id }, readBest(), readSeals(), [...beatenFugues()]);
          setPhase({ kind: "result", ...r, her: !!h, seal: card && seal ? { kind: card.seal.kind, ...seal } : null, feats, opened, next: benchNext(f.id) });
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      recRef.current = null;
      g.stopAll();
      h?.stop();
      if (hm) setTuning(tuning.id, tuning.a);
      ch.mine.gain.value = 1;
      game.current = null;
      paint.current = null;
      if (count.current) count.current.textContent = "";
    };
  }, [phase]);

  /** The music box's rows and time, in the play area's coordinates (the bars line up with them). */
  function boxRows(barTicks: number, now: number) {
    const roll = document.querySelector(".tg-roll");
    const area = document.querySelector(".tg-play");
    if (!roll || !area) return null;
    const r = roll.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    const geo = uiRows(f.id, voice, range, r.height) ?? (BOXV ? variantRows({ lo: range.lo, hi: range.hi, spill: stepRange(f), ranges: study.ranges, voice }, r.height) : null) ?? ladderGeometry(range.lo, range.hi, r.height);
    const top = r.top - a.top;
    const y0 = top + geo.yOf(0);
    const span = 3 * barTicks;
    return {
      yOf: (step: number) => y0 - step * geo.rowH,
      stepAt: (y: number) => Math.round((y0 - y) / geo.rowH),
      rowH: geo.rowH,
      xOf: (tick: number) => r.left - a.left + ((tick - (now - 0.25 * span)) / span) * r.width,
    };
  }

  /** PLAY (the pop-up, AGAIN); `now`: CONTINUE and NEXT, which start at once (no guard against a double tap). */
  const start = (now = false) => {
    practice.current = null;
    stopHearing();
    if (!now && performance.now() - shownAt.current < 350) return;
    const ch = ensureChip();
    wantHer();
    const go = () => (setNote(""), setPhase({ kind: "play" }));
    // D216, KIMIKO: only with her track (loading: the game begins once it is ready; not to be had: tap to try again).
    if (kimiko && hm) {
      if (herState(hm) === "failed") releaseHer();
      if (herState(hm) !== "ready") {
        waitingHer.current = hm.key;
        herLoaded((n) => n + 1);
        void ch.resume();
        void loadHer(hm, ch.ctx).then((b) => {
          if (waitingHer.current !== hm.key) return;
          waitingHer.current = null;
          herLoaded((n) => n + 1);
          if (b && phaseNow.current === "title") go();
        });
        return;
      }
    }
    if (ch.ctx.state === "running") return go();
    ch.resume()
      .then(() => (ch.ctx.state === "running" ? go() : setNote("The sound is still off: tap once more.")))
      .catch(() => setNote("The sound is still off: tap once more."));
  };
  /** D326, TOOLS: PRACTICE (unscored) or HEAR THE OTHERS, straight into the run. */
  const practise = (s: ToolsState, listen: boolean) => {
    stopHearing();
    const ch = ensureChip();
    setLesson(null);
    practice.current = practiceRun(f, s, pick.voice, bpm, listen);
    setToolsOpen(false);
    setNote("");
    void ch.resume().catch(() => {});
    setPhase({ kind: "play" });
  };
  const phaseNow = useRef(phase.kind);
  phaseNow.current = phase.kind;
  // D237: ✕ goes back to the cards (HOME, the wheel as it was left, the minimal page's grid).
  const home = () => ((waitingHer.current = null), setLesson(null), setMan(null), setWatching(false), setPhase({ kind: "home" }));
  const quit = () => (setPaused(false), practice.current && setToolsOpen(true), home());
  /** D308: PAUSE (not with KIMIKO: her recording keeps the time; not in a lesson's step, which waits anyway). */
  const [paused, setPaused] = useState(false);
  const canPause = !kimiko && !lesson && !man;
  const pauseNow = () => {
    const g = game.current;
    if (!g || g.paused || !canPause) return;
    g.pause();
    setPaused(true);
  };
  const resumeNow = () => {
    const ch = chip.current;
    if (ch && ch.ctx.state !== "running" && ch.ctx.state !== "closed") void ch.resume();
    game.current?.resume();
    setPaused(false);
  };
  /** D237: a card chosen (the wheel, the grid): the pop-up over it (from its start unless it is the piece already chosen). */
  // D295: the piece last opened this visit, for the list to come back to.
  const [opened, setOpened] = useState<string | undefined>(undefined);
  const open = (piece: string) => {
    if (piece !== pick.piece) setPick({ piece, share: 0, voice: -1 });
    setOpened(piece);
    setPhase({ kind: "title" });
  };
  /** D237: CONTINUE, NEXT: straight into the count-in, no pop-up. */
  const begin = (piece: string) => {
    if (piece !== pick.piece) setPick({ piece, share: 0, voice: -1 });
    setOpened(piece);
    start(true);
  };
  /** D237: the bench's NEXT: a prelude's fugue, then the next pair (the wheel's order), skipping what is locked; Book II in order. */
  function benchNext(id: string): string | null {
    const order = paired(id) ? tierCards().flatMap((c) => [preludeOf(c.id), c.id]) : bookCards(cardById(id)?.book ?? 2).map((c) => c.id);
    return nextIn(order, id, (x) => !locked(x));
  }
  /** D237: the minimal page's one-line instruction, at the start of the first game in each mode (played past: gone). */
  const hintSeen = APP.lite ? lite.seen : benchSeen;
  // D282: in a tutorial step, its goal (the demonstration: WATCH).
  const hintLine = tr(phase.kind === "play" && man ? (watching ? "WATCH THE THUMBS" : (manMat?.label ?? "")) : phase.kind === "play" && lesson ? (watching ? "WATCH THE THUMBS" : (TRACKS[lesson.pl][lesson.n].goal ?? "")) : phase.kind === "play" && !hintSeen.includes(proto.id) ? (LITE_HINT[proto.id] ?? "") : "");
  const seen = () => {
    if (!hintLine) return;
    seenId(proto.id);
  };
  /** D314: a hint seen for good (a mode's line; "ornament": the first ornament shaken in a piece). */
  const seenId = (id: string) => {
    if (hintSeen.includes(id)) return;
    if (APP.lite) setLite(writeLite({ seen: [...readLite().seen, id] }));
    else {
      const next = [...benchSeen, id];
      setBenchSeen(next);
      try {
        localStorage.setItem(HINTS_KEY, JSON.stringify(next));
      } catch {
        /* this visit only */
      }
    }
  };
  const beginLesson = (pl: Platform, n: number) => {
    const l = TRACKS[pl][n];
    // D225: the lesson's mode (D233: the platform stays as guessed or set; the lesson's mode decides the play).
    setAsking(false);
    if (pl === platform) setPick({ proto: l.mode });
    setLesson({ pl, n, run: l.run() });
    setSteps(false);
    setWatching(false);
    // D280: the phone's tutorial shows each step first.
    setPhase({ kind: "talk", lines: l.intro, next: pl === "mobile" && l.id !== "t-whole" ? "watch" : "play" });
  };
  // D342, THE MANUAL's flow: a lesson's Herr Bach (at most two lines before: none for a keyboard player),
  // HEAR (his demonstration, in each manner the lesson asks), its DRILL stages (each may be left after one
  // take), its PLAY (passing it passes the lesson); after each take his line and the lens.
  const mTitle = (l: ManualLesson) => `${l.id} · ${l.title} · ${tr(l.english)}`;
  const startStep = (m: ManRun) => {
    setMan(m);
    setWatching(m.mode === "hear");
    start(true);
  };
  const talk = (title: string, lines: Line[], o: { choices?: { label: string; act: () => void }[]; extra?: ReactNode; done?: () => void } = {}) => setPhase({ kind: "mtalk", title, lines, ...o });
  function beginManual(id: string, o: { skip?: boolean } = {}) {
    const l = lessonById(id);
    if (!l) return;
    setSteps(false);
    setLesson(null);
    if (l.screen === "grip") return setManScreen("grip");
    if (l.screen === "placement") return setManScreen("ask");
    setManScreen(null);
    markSeen(l.id);
    const playAt = l.stages.findIndex((st) => st.kind === "play");
    const terse = readManual().answer === "keyboard";
    const styles = l.hear?.styles ?? [];
    const hearStage = l.hear?.stage ?? playAt;
    const afterIntro = () => (o.skip ? beginStage(l, playAt, 0) : styles.length ? startStep({ id, stage: hearStage, mode: "hear", style: styles[0], queue: styles.slice(1), takes: 0 }) : beginStage(l, 0, 0));
    // (Set before his lines: the sound-only pair, detached then joined, plays the hear stage's notes.)
    setMan({ id, stage: hearStage, mode: "hear", takes: 0 });
    setWatching(false);
    const lines: Line[] = terse && !l.hear?.pair ? [] : l.before.map((text, k) => ({ text, ...(l.hear?.pair?.[k] ? { demo: l.hear.pair[k] } : {}) }));
    if (!lines.length) return afterIntro();
    talk(mTitle(l), lines, { done: afterIntro });
  }
  function beginStage(l: ManualLesson, k: number, takes: number, alt = false) {
    const st = l.stages[k];
    const m: ManRun = { id: l.id, stage: k, mode: "take", takes, ...(alt ? { alt: true } : {}) };
    setMan(m);
    setWatching(false);
    const label = alt && l.alt ? l.alt.label : st.m.label;
    talk(mTitle(l), [{ text: label }], { choices: [{ label: "PLAY", act: () => startStep(m) }] });
  }
  function beginTest(p: PartId) {
    const cp = checkpointOf(p);
    if (!cp) return;
    setSteps(false);
    const k = cp.stages.length - 1;
    const m: ManRun = { id: cp.id, stage: k, mode: "test", part: p, takes: 0 };
    setMan(m);
    setWatching(false);
    talk(mTitle(cp), [{ text: "Play the checkpoint once. Pass it, and the part is yours." }, { text: cp.stages[k].m.label }], { choices: [{ label: "PLAY", act: () => startStep(m) }] });
  }
  const toMap = () => (setMan(null), setWatching(false), setPhase({ kind: "home" }), setSteps(true));
  function manualDone(r: ReturnType<ProtoGame["results"]>, log?: ReturnType<LabRecorder["finish"]>) {
    const m = man;
    const x = r.lens;
    if (!m || !x) return toMap();
    if (m.mode === "placement") {
      placementTakes.current = [...placementTakes.current, { id: m.place!, x, ...(log ? { log } : {}) }];
      const k = PLACEMENT.findIndex((e) => e.id === m.place);
      if (!m.retake && k + 1 < PLACEMENT.length) return placementStep(k + 1);
      return placementShow(!m.retake);
    }
    const l = lessonById(m.id)!;
    if (m.mode === "hear") {
      const rest = m.queue ?? [];
      if (rest.length) return startStep({ ...m, style: rest[0], queue: rest.slice(1) });
      const k0 = 0;
      setMan({ id: l.id, stage: k0, mode: "take", takes: 0 });
      setWatching(false);
      return talk(mTitle(l), [{ text: "Now you." }, { text: l.stages[k0].m.label }], { choices: [{ label: "PLAY", act: () => startStep({ id: l.id, stage: k0, mode: "take", takes: 0 }) }] });
    }
    const st = l.stages[m.stage];
    const failed = r.failedBar !== null;
    if (m.mode === "test") {
      const ok = !failed && stagePassed(l, "play", x);
      if (ok) manualTestOut(m.part!);
      return talk(mTitle(l), [{ text: ok ? "So. The part is yours: its lessons stay open to you." : "Not yet. Its lessons are open to you when you are ready." }], { extra: <LensSheet l={l} x={x} kind="play" />, choices: [{ label: "THE MANUAL", act: toMap }] });
    }
    const again = { label: "TRY AGAIN", act: () => startStep({ ...m, takes: m.takes + 1 }) };
    if (st.kind === "drill" && !m.alt) {
      const ok = !failed && stagePassed(l, "drill", x);
      const on = { label: "GO ON", act: () => beginStage(l, m.stage + 1, m.takes + 1) };
      return talk(mTitle(l), [{ text: ok ? "Good. On to the next." : "Once more, or go on: the drill is yours to leave." }], { extra: <LensSheet l={l} x={x} kind="drill" />, choices: ok ? [on, again] : [again, on] });
    }
    const ok = !failed && stagePassed(l, "play", x);
    const s = recordTake(l.id, x.accuracy, ok);
    const told = l.told?.(x);
    const toldLine: Line[] = told ? [{ text: tr(told.text, told.vars) }] : [];
    const next = nextManual(s);
    const alt = l.alt && !m.alt ? [{ label: "THE LEFT HAND INSTEAD", act: () => beginStage(l, m.stage, m.takes + 1, true) }] : [];
    if (ok)
      return talk(mTitle(l), [...toldLine, ...l.after.map((text) => ({ text }))], {
        extra: <LensSheet l={l} x={x} kind="play" />,
        choices: [...(next ? [{ label: "NEXT LESSON", act: () => beginManual(next) }] : []), ...alt, { label: "THE MANUAL", act: toMap }],
      });
    const tries = triesOf(s, l.id);
    const hear = l.hear?.styles.length ? [{ label: "WATCH AGAIN", act: () => startStep({ id: l.id, stage: l.hear?.stage ?? m.stage, mode: "hear", style: l.hear!.styles[0], queue: l.hear!.styles.slice(1), takes: m.takes + 1 }) }] : [];
    const skip =
      tries >= 3
        ? [
            {
              label: "SKIP FOR NOW",
              act: () => {
                const after = setAside(l.id);
                const n = nextManual(after);
                return n ? beginManual(n) : toMap();
              },
            },
          ]
        : [];
    return talk(mTitle(l), [...l.again.map((text) => ({ text })), ...toldLine], { extra: <LensSheet l={l} x={x} kind="play" />, choices: [again, ...hear, ...skip, ...alt, { label: "THE MANUAL", act: toMap }] });
  }
  // 0.1: a thumb on each bar sounds the lesson's instrument (the harpsichord); done, on to 0.2 if not answered.
  const gripSound = (side: "left" | "right") => {
    const ch = ensureChip();
    setPreset(SOUND_PRESET.harpsichord);
    ch.note(side === "left" ? 60 : 67, ch.ctx.currentTime + 0.01, 0.6, voicing(0, 2, true), { lead: true });
  };
  const gripDone = () => {
    recordTake("0.1", 1, true);
    setPreset(presetById(soundNow).id);
    if (readManual().answer === null) return setManScreen("ask");
    setManScreen(null);
    setSteps(true);
  };
  // 0.2: NO starts at I.1; another instrument or a keyboard: the placement, or (skipped) every part open.
  const answered = (a: Answer, test: boolean | null) => {
    setAnswer(a, test === false);
    setManScreen(null);
    if (test === null) return beginManual("I.1");
    if (!test) return (setSteps(true), undefined);
    placementTakes.current = [];
    placementStep(0);
  };
  function placementStep(k: number, retake = false) {
    const e = PLACEMENT[k];
    if (!e) return;
    setManScreen(null);
    const m: ManRun = { id: "0.2", stage: k, mode: "placement", place: e.id, takes: 0, ...(retake ? { retake: true } : {}) };
    setMan(m);
    setWatching(false);
    talk(`0.2 · PROBESPIEL · ${tr("THE PLACEMENT")}`, [{ text: `${k + 1}/${PLACEMENT.length} · ${tr(e.m.label)}` }], { choices: [{ label: "PLAY", act: () => startStep(m) }] });
  }
  function placementShow(offerRetake: boolean) {
    const p = place(placementTakes.current);
    setMan(null);
    setPhase({ kind: "home" });
    setManScreen({ placement: p, retake: offerRetake ? worst(placementTakes.current) : null });
  }
  function placementDone() {
    const sc = manScreen;
    if (!sc || typeof sc !== "object") return;
    const p = sc.placement;
    applyPlacement(p.lessons, p.opened, p.results);
    setManScreen(null);
    if (p.start) beginManual(p.start);
    else setSteps(true);
  }
  const talkDone = (next: "play" | "again" | "advance" | "watch") => {
    if (next === "watch") return setWatching(true), start(true);
    if (next !== "advance") return setWatching(false), start();
    if (lesson && lesson.n + 1 < TRACKS[lesson.pl].length) return beginLesson(lesson.pl, lesson.n + 1);
    quit();
  };
  /**
   * D289: a step not passed: TRY AGAIN, WATCH AGAIN (the demonstration, on a phone), and after three tries
   * SKIP FOR NOW (the step set aside, open to come back to; the next one opens).
   */
  const againChoices = () => {
    if (!lesson) return undefined;
    const l = TRACKS[lesson.pl][lesson.n];
    const out = [{ label: "TRY AGAIN", act: () => talkDone("again") }];
    if (lesson.pl === "mobile" && l.id !== "t-whole") out.push({ label: "WATCH AGAIN", act: () => talkDone("watch") });
    if (triesAt(lesson.pl, l.id) >= 3)
      out.push({ label: "SKIP FOR NOW", act: () => (skipLesson(lesson.pl, l.id), lesson.n + 1 < TRACKS[lesson.pl].length ? beginLesson(lesson.pl, lesson.n + 1) : quit()) });
    return out;
  };
  /** The subject, played to be heard (lesson 5): the piece's first entry, at the lesson's tempo. */
  const demo = (l: Line) => {
    if (l.demo === "detached" || l.demo === "legato") return demoLine(l.demo);
    if (l.demo !== "subject") return;
    const ch = ensureChip();
    const e = f.entries[0];
    if (!e) return;
    const tps = (f.tpq * bpm) / 60;
    const t0 = ch.ctx.currentTime + 0.3;
    // D284: with its ornaments, as the game plays them.
    for (const [on, dur, midi] of ornamented(f, e.voice, e.notes, bpm)) ch.note(midi, t0 + (on - e.on) / tps, (dur / tps) * 0.95, voicing(e.voice, f.voices.length, true), { lead: true });
  };

  /** D271: the lesson's first notes (two bars at most), each detached (a third of its length) or joined (a touch over it). */
  const demoLine = (how: "detached" | "legato") => {
    if (!run) return;
    const ch = ensureChip();
    const tps = (f.tpq * bpm) / 60;
    const t0 = ch.ctx.currentTime + 0.3;
    const ns = f.voices[run.voice].filter(([on]) => on >= run.from && on < Math.min(run.until, run.from + 2 * f.barTicks));
    for (const [on, dur, midi] of ns) ch.note(midi, t0 + (on - run.from) / tps, (dur / tps) * (how === "legato" ? 1.08 : 0.35), voicing(run.voice, f.voices.length, true), { lead: true });
  };
  /** D272, HEAR THE SUBJECT: the subject played as performed (its samples loaded first); returns when it starts, on the page's clock (s). */
  const [hearing, setHearing] = useState<string | null>(null);
  // D301: what HEAR THE SUBJECT has scheduled, stopped by anything that starts or changes the sound (the owner:
  // "it keeps on playing" when the round starts or another reading is chosen); `hearGen` drops a playback
  // whose samples were still loading when it was superseded.
  const hearSounds = useRef<Sounding[]>([]);
  const hearGen = useRef(0);
  const stopHearing = () => {
    hearGen.current++;
    const now = chip.current?.ctx.currentTime ?? 0;
    for (const sd of hearSounds.current) sd.stop(now);
    hearSounds.current = [];
  };
  const playSubject = async (notes: Performed, v: number): Promise<number> => {
    stopHearing();
    const gen = hearGen.current;
    const ch = ensureChip();
    await ch.prepare(notes.map((n) => n.midi), notes.map((n) => n.midi));
    if (gen !== hearGen.current) return performance.now() / 1000;
    const t0 = ch.ctx.currentTime + 0.15;
    // D302: joined notes joined (no gap, no new attack), as the reading asks.
    for (const n of notes) hearSounds.current.push(ch.note(n.midi, t0 + n.at, n.len, voicing(v, f.voices.length, true), { ...dynamic(n.d), lead: true, ...(n.legato ? { legato: true, from: n.from } : {}), ...(n.tie ? { tie: n.tie } : {}), ...(n.final ? { final: true } : {}), ...(n.apart ? { apart: true } : {}) }));
    return performance.now() / 1000 + 0.15 + (ch.lag ?? 0);
  };
  useEffect(() => {
    if (!hearing) stopHearing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hearing]);
  const events: ThumbEvents = {
    // D280: during the demonstration the game's thumbs play; the player's touches wait.
    // D342: a manual take's touches go through its recorder (the take's lab log), which hands them on to the game.
    down: (id, side, x, y, w, h, ts) => (watching || practice.current?.listen ? undefined : (seen(), recRef.current && game.current ? recRef.current.down(id, side, x, y, w, h, ts) : game.current?.down(id, { side, x, y, w, h }, ts))),
    move: (id, x, y, w, h, ts) => (recRef.current && game.current ? recRef.current.move(id, x, y, w, h, ts) : game.current?.move(id, { side: "left", x, y, w, h }, ts)),
    // D249: a touch the system took back (pointercancel) stops its note unjudged: no early let-go.
    up: (id, ts, cancelled) => (recRef.current && game.current ? recRef.current.up(id, ts, cancelled) : game.current?.up(id, ts, cancelled)),
  };

  // A MIDI keyboard (where the browser has Web MIDI: Chrome, Edge, Firefox; not Safari).
  const keyDownRef = useRef<(id: number, k: KeyPress, ts: number) => void>(() => {});
  keyDownRef.current = (id, k, ts) => {
    const g = game.current;
    if (g) (seen(), g.keyDown(id, k, ts));
    else if (phase.kind === "title" || phase.kind === "result") start();
  };
  useEffect(() => {
    const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> };
    // MIDI: a computer's (D182).
    // D237: not on the minimal page (no permission asked of a friend).
    if (!nav.requestMIDIAccess || platform !== "computer" || APP.lite) return setMidi([]);
    let access: MIDIAccess | null = null;
    // D191: a promise resolving after the effect is gone (StrictMode, a quick switch of platform)
    // attaches nothing, and a device plugged in later re-attaches nothing.
    let alive = true;
    const listen = () => {
      if (!alive) return;
      access?.inputs.forEach((input) => {
        input.onmidimessage = (e: MIDIMessageEvent) => {
          const [st, n, vel] = e.data ?? [];
          const kind = st & 0xf0;
          if (kind === 0x90 && vel > 0) keyDownRef.current(midiId(n), { midi: n, velocity: vel / 127, touch: vel / 127, side: n < 60 ? "left" : "right" }, e.timeStamp);
          else if (kind === 0x80 || (kind === 0x90 && vel === 0)) game.current?.keyUp(midiId(n), e.timeStamp);
        };
      });
      // D233: MIDI CONTROLLER shown or hidden as inputs come and go.
      setMidi(midiInputNames(access));
    };
    nav
      .requestMIDIAccess()
      .then((a) => {
        if (!alive) return;
        access = a;
        listen();
        a.onstatechange = listen;
      })
      .catch(() => alive && setMidi([]));
    return () => {
      alive = false;
      if (!access) return;
      access.onstatechange = null;
      access.inputs.forEach((i) => (i.onmidimessage = null));
    };
  }, [platform]);

  // The phone held the wrong way while playing (the notice up): the game paused with its sound, until
  // it is turned (D184).
  useEffect(() => {
    if (proto.platform !== "mobile") return;
    const q = window.matchMedia(proto.layout !== "full" ? "(orientation: portrait) and (max-width: 500px)" : "(orientation: landscape) and (max-height: 500px)");
    const check = () => {
      const ch = chip.current;
      if (!ch || phase.kind !== "play") return;
      if (q.matches) {
        game.current?.releaseAll(performance.now());
        void ch.ctx.suspend();
      } else if (ch.ctx.state !== "running" && ch.ctx.state !== "closed" && !document.hidden) void ch.resume();
    };
    check();
    q.addEventListener("change", check);
    return () => q.removeEventListener("change", check);
  }, [proto.platform, proto.layout, phase.kind]);

  // The window lost: every key let go (a key released elsewhere never sends its keyup); a hidden tab
  // pauses the game with the sound (the game's clock is the audio clock), and it resumes on return.
  useEffect(() => {
    const away = () => game.current?.releaseAll(performance.now());
    const shown = () => {
      const ch = chip.current;
      if (document.hidden) {
        // D308: a round paused (RESUME, a bar of count-in, on return), not taken up again mid-bar.
        if (phase.kind === "play") pauseNow();
        away();
        if (ch && phase.kind === "play") void ch.ctx.suspend();
      } else if (ch && ch.ctx.state !== "closed") void ch.resume(); // D191: also the iPhone's silent <audio>, paused by an interruption
    };
    window.addEventListener("blur", away);
    document.addEventListener("visibilitychange", shown);
    return () => {
      window.removeEventListener("blur", away);
      document.removeEventListener("visibilitychange", shown);
    };
  }, [phase.kind]);

  // The computer's keys; Escape quits.
  useEffect(() => {
    const press = (e: KeyboardEvent): KeyPress | null => {
      if (proto.platform !== "computer") return e.code === "Space" ? {} : null;
      // D233, MIDI CONTROLLER: the MIDI keyboard plays (the letters no longer a piano); any key starts.
      if (proto.id === "piano") return game.current ? null : { velocity: 0.6 };
      if (proto.id === "arrows") {
        const a = ARROW_KEYS[e.code];
        return a ? { side: e.code.startsWith("Key") ? "left" : "right", move: moveOf(a), velocity: 0.6 } : null;
      }
      if (e.code === "Space") return { velocity: 0.5, code: "Space" };
      const r = keyRow(e.code);
      // D230, SCALE KEYS: the rows are degrees, not dynamics (one level; no trill row).
      if (r >= 0 && game.current?.scale) return r === 0 ? null : { velocity: 0.6, code: e.code };
      return r < 0 ? null : { velocity: KEY_ROWS[r].dyn, trill: KEY_ROWS[r].trill, code: e.code };
    };
    const down = (e: KeyboardEvent) => {
      // D308: paused, the keys are the overlay's (Escape quits, Enter or Space resumes); playing, Enter or Pause pauses.
      if (phase.kind === "play" && paused) {
        if (e.code === "Escape") return quit();
        if (e.code === "Enter" || e.code === "Space" || e.code === "Pause") return (e.preventDefault(), resumeNow());
        return;
      }
      if (phase.kind === "play" && (e.code === "Enter" || e.code === "Pause") && canPause && !e.repeat) return (e.preventDefault(), pauseNow());
      if (e.code === "Escape" && phase.kind === "play") return quit();
      // Keys meant for a control (the FROM slider; space or enter on a button off the game) or the
      // first screen are theirs (D184).
      const tgt = e.target instanceof Element ? e.target : null;
      if (asking || (phase.kind !== "play" && (phase.kind === "home" || wheel)) || tgt?.closest("input, select, textarea") || (phase.kind !== "play" && tgt?.closest("button") && (e.code === "Space" || e.code === "Enter"))) return;
      const g = game.current;
      if (proto.id === "keys" && g) {
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") return g.pedal(true);
        if (e.code === "ArrowUp" || e.code === "ArrowDown") return (e.preventDefault(), g.bendHeld(e.code === "ArrowUp" ? 60 : -60));
        // TIMING: space a note, or the swoosh while one sounds; DIRECTION: space the repeated note.
        if (e.code === "Space" && phase.kind === "play" && !e.repeat && run?.easy === "timing") {
          e.preventDefault();
          // Space: a note if none sounds, else the swoosh.
          if (g.keysDown.size) return g.swooshNow();
        }
      }
      const k = press(e);
      if (!k) return;
      // A key held repeats: nothing more to play, but a game's keys (space, the arrows) must not scroll the page (D191).
      if (e.repeat) return void (g && e.preventDefault());
      // D237: off the game the keys start nothing (the pop-up's PLAY, the result's AGAIN take Enter).
      if (!g) return;
      e.preventDefault();
      // A phone's prototype: the keys only start it.
      if (proto.platform !== "computer") return void (g ? null : keyDownRef.current(0, k, e.timeStamp));
      if (proto.id === "piano" && !g) return void keyDownRef.current(0, k, e.timeStamp);
      g?.keysDown.add(e.code);
      keyDownRef.current(keyId(e.keyCode), k, e.timeStamp);
    };
    const up = (e: KeyboardEvent) => {
      const g = game.current;
      if (!g) return;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") return g.pedal(false);
      if (e.code === "ArrowUp" || e.code === "ArrowDown") return g.bendHeld(0);
      g.keysDown.delete(e.code);
      g.keyUp(keyId(e.keyCode), e.timeStamp);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const playing = phase.kind === "play";
  /** D230: SCALE KEYS chosen for the computer's HIGHWAY. */
  // D236: SCALE KEYS withdrawn from play (the owner: "a complete failure"); the home row only.
  const scaleOn = false;
  const layout = proto.layout;
  const wide = layout === "wide" || layout === "bars" || layout === "desk";
  const own = (playing && (layout === "full" || layout === "bars") ? ` tb-${layout}` : "") + ` tb-proto-${proto.id}` + (roadAlone(proto, playing) ? " tb-road" : "");

  return (
    <div className={`tg-app${wide ? " tg-wide" : ""}${own}${playing ? "" : " tg-away"}`}>
      <MusicBox
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">{man ? `${man.mode === "placement" ? "0.2" : man.id} · ${man.mode === "placement" ? tr("THE PLACEMENT") : tr(manLesson?.english ?? "")}` : lesson ? `${tr("LESSON")} ${lesson.n + 1} · ${tr(TRACKS[lesson.pl][lesson.n].english)}` : APP.lite ? (lang() === "en" ? f.title.toUpperCase() : pieceName(f.kind, f.key, f.number)) : `BENCH · ${proto.name}`}</span>
            <span className="tg-hud-bar">{APP.lite && lang() !== "en" ? keyWordsIn(frame.current.key) : keyName(frame.current.key)}</span>
            {playing && practice.current && (
              // D326: a practice run (or THE OTHERS) named in the title bar.
              <span className="tb-tools-tag" id="tools-tag">
                {tt(practice.current.listen ? "THE OTHERS · BARS {bars}" : "PRACTICE · BARS {bars}", { bars: practice.current.bars })}
              </span>
            )}
            {/* D322: the stops for the player's voice (the harpsichord's, the organ's), beside ❚❚ and ✕. */}
            {hasStops(presetById(soundNow).id) && !lesson && !man && full && <RegistrationStops presetId={presetById(soundNow).id} patch={voicePatch(soundNow, played[0] ?? 0, f.voices.length)} piece={f.id} />}
            {playing && canPause && (
              // D308: PAUSE, beside ✕.
              <button type="button" id="pause" className="tg-x tb-pause" aria-label={tr("Pause")} onClick={pauseNow}>
                ❚❚
              </button>
            )}
            {(playing || lesson || man) && (
              <button type="button" id="quit" className="tg-x" aria-label="Quit" onClick={quit}>
                ✕
              </button>
            )}
          </>
        }
        legend={f.voiceNames.map((name, i) => (
          <span key={name} style={{ color: sheetOn ? (sheetLayout === "open" && !played.includes(i) ? "#4a4540" : paperInk(i, f.voices.length)) : inkOf(i, f.voices.length), opacity: played.includes(i) ? 1 : sheetOn ? 0.75 : 0.55 }}>
            ■ {voiceName(name)}
            {played.includes(i) && <b className="tb-you"> · {tr("YOU")}</b>}
          </span>
        ))}
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        {phase.kind === "talk" && lesson && (
          <BachTalk key={`${lesson.n}-${phase.next}-${phase.lines[0]?.text}`} title={`${TRACKS[lesson.pl][lesson.n].title} · ${tr(TRACKS[lesson.pl][lesson.n].english)}`} lines={phase.lines} onLine={demo} onDone={() => talkDone(phase.next)} choices={phase.next === "again" ? againChoices() : undefined} />
        )}
        {phase.kind === "mtalk" && (
          <BachTalk key={`m-${phase.title}-${phase.lines.map((l) => l.text).join("|")}`} title={phase.title} lines={phase.lines} onLine={demo} onDone={() => phase.done?.()} choices={phase.choices} extra={phase.extra} />
        )}
        {phase.kind === "result" && (
          // D237: the result, minimal: the grade (or where the crowd left), the score, AGAIN, NEXT, ✕ back to the cards.
          <div className="tg-card tg-card-low tb-result" role="dialog" aria-label="Result">
            <button type="button" id="result-close" className="tg-x tb-result-x" aria-label="Back to the cards" onClick={home}>
              ✕
            </button>
            {phase.sheet ? (
              <SheetCard
                head={phase.failedBar !== null ? <h1 className="tb-grade tb-failed">{tr("THE CROWD LEFT")}</h1> : <h1 className={`tb-grade${phase.grade === "S" || phase.grade === "A" ? " tg-gold" : ""}`}>{phase.grade}</h1>}
                sheet={phase.sheet}
                score={phase.score}
                failed={phase.failedBar !== null}
                failedBar={phase.failedBar}
                lastBar={phase.lastBar ?? 0}
                progress={phase.progress ?? 1}
                maxStreak={phase.maxStreak}
                best={phase.best}
                free={phase.free}
              />
            ) : (
              <>
                {phase.failedBar !== null ? <h1 className="tb-grade tb-failed">{tr("THE CROWD LEFT")}</h1> : <h1 className={`tb-grade${phase.grade === "S" || phase.grade === "A" ? " tg-gold" : ""}`}>{phase.grade}</h1>}
                {phase.failedBar !== null && <p className="tg-card-sub">{tr("BAR {n}", { n: phase.failedBar })}</p>}
                <p className="tb-score">{phase.score.toLocaleString("en")}</p>
              </>
            )}
            {phase.lanes && laneLine(phase.lanes) && (
              <p className="tb-lane-line" id="lane-line" title="LANE: the note's own lane (full points) · DIRECTION: another lane the right way (half)">
                {laneLine(phase.lanes)}
              </p>
            )}
            {phase.tempo && (
              // D356: the tempo the run was played at; at SLOW (a WTC fugue) its best kept apart.
              <p className={`tb-lane-line tb-result-tempo tb-pop-tempo-${phase.tempo.step}`} id="result-tempo">
                {tr("TEMPO")} · {stepWord(phase.tempo.step)} · {phase.tempo.beat}
                {phase.tempo.apart ? ` · ${tr("KEPT APART FROM YOUR BEST")}` : ""}
              </p>
            )}
            {retuned && (
              <p className="tb-lane-line" id="bt-retune">
                {tr("SOUND DELAY {from} → {to} MS (TUNED TO YOUR PLAYING)", { from: Math.round(retuned.from * 1000), to: Math.round(retuned.to * 1000) })}
              </p>
            )}
            {phase.stage?.won && <p className="tb-result-seal tb-stage-line earned">PRELUDE BEATEN · FUGUE UNLOCKED</p>}
            {phase.opened?.map((t) => (
              <p key={t} id={`tier-toast-${t.toLowerCase()}`} className={`tb-tier-toast tb-tier-${t.toLowerCase()}`} role="status">
                {tr("{tier} UNLOCKED!", { tier: tr(t) })}
              </p>
            ))}
            {!APP.lite && phase.feats && phase.feats.length > 0 && <FeatToast fresh={phase.feats} open={() => setPhase({ kind: "achievements", fresh: phase.feats })} />}
            {phase.report && full && (
              // D259: what went wrong, to copy and send (the owner's reports from the phone).
              <button
                type="button"
                id="copy-report"
                className="tb-report"
                onClick={(e) => {
                  const btn = e.currentTarget;
                  const text = `${VERSION} · ${navigator.userAgent}\n${phase.report}`;
                  navigator.clipboard?.writeText(text).then(
                    () => (btn.textContent = tr("REPORT COPIED")),
                    () => window.prompt("Copy the report:", text),
                  ) ?? window.prompt("Copy the report:", text);
                }}
              >
                {tr("COPY REPORT")}
              </button>
            )}
            <div className="tb-result-nav">
              <button type="button" id="again" className="tb-play" autoFocus onClick={() => start()}>
                ▶ {tr("AGAIN")}
              </button>
              {phase.next && (
                <button type="button" id="next" className="tb-play" onClick={() => begin(phase.next!)}>
                  ▶ {tr("NEXT")}
                </button>
              )}
            </div>
          </div>
        )}
      </MusicBox>
      <PlayArea events={events} paint={paint} hint="" />
      {hintLine && (layout === "bars" ? <SideHint text={hintLine} /> : (
        <p className="tb-lite-hint" id="lite-hint" role="status">
          {hintLine}
        </p>
      ))}
      {playing && layout === "bars" && marks.readingMarks.size > 0 && <SideLegend marks={marks.readingMarks.values()} legendRef={legendRef} />}
      {(layout === "full" || roadAlone(proto, playing)) && playing && (
        <button type="button" id="quit-full" className="tg-x tb-quit" aria-label="Quit" onClick={quit}>
          ✕
        </button>
      )}
      {(layout === "full" || roadAlone(proto, playing)) && playing && canPause && (
        <button type="button" id="pause-full" className="tg-x tb-quit tb-pause-full" aria-label={tr("Pause")} onClick={pauseNow}>
          ❚❚
        </button>
      )}
      {playing && paused && (
        // D308: the round paused: RESUME (a bar of count-in, then on from the beat it stopped in) or QUIT.
        <div className="tb-pop-veil tb-pause-veil" role="dialog" aria-label={tr("PAUSED")}>
          <div className="tb-pop tb-pause-box">
            <h1 className="tb-pause-title">{tr("PAUSED")}</h1>
            <button type="button" id="resume" className="tb-play" autoFocus onClick={resumeNow}>
              ▶ {tr("RESUME")}
            </button>
            <button type="button" id="pause-quit" className="tb-pause-quit" onClick={quit}>
              ✕ {tr("QUIT")}
            </button>
          </div>
        </div>
      )}
      {hp.changed && !playing && !calib && (
        <div className="tb-hp-banner" role="status">
          <button type="button" id="hp-recalibrate" onClick={() => setCalib(true)}>
            {tr("HEADPHONES CHANGED? · RECALIBRATE (5 s)")}
          </button>
          <button type="button" id="hp-dismiss" className="tg-x" aria-label="Dismiss" onClick={hp.dismiss}>
            ✕
          </button>
        </div>
      )}
      {calib && (
        <Panel title="SOUND DELAY" close={() => (setCalib(false), hp.dismiss())}>
          <p className="tg-panel-note">With the headphones on: tap on each click, eight times.</p>
          <Tapper chip={ensureChip} done={(l) => (l !== null && setLag(l), setCalib(false), hp.dismiss())} />
        </Panel>
      )}
      {phase.kind === "settings" && APP.lite && (
        // D237: the minimal page's ⚙: the volume, on a phone the interface (D241), and the sound's delay (headphones); BLUETOOTH MODE on AUTO, unseen.
        // D343: ordered by need: the language first (each named in its own tongue), the volume, the headphones'
        // delay; the owner's items (PLAY ON, DISPLAY, TUNING, THE LAB, LOCK AGAIN) only once unlocked; the
        // version last (seven taps on it: unlock.ts, Secret.tsx).
        <Panel title="SETTINGS" close={back} className="tb-lite-settings">
          <div className="tg-set tb-lang-set">
            <span>{tr("LANGUAGE")}</span>
            <div className="tg-seg" role="group" aria-label="Language">
              {LANGS.map(([l, name]) => (
                <button key={l} type="button" id={`lang-${l}`} className={l === lang() ? "on" : ""} aria-pressed={l === lang()} onClick={() => (setLang(l), setLite(readLite()))}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <label className="tg-from tb-volume">
            <span>{tr("VOLUME")} {Math.round(lite.volume * 100)}%</span>
            <input
              type="range"
              id="volume"
              min={0}
              max={100}
              step={5}
              value={Math.round(lite.volume * 100)}
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                setLite(writeLite({ volume: v }));
                chip.current?.setVolume(v);
              }}
            />
          </label>
          {/* D265: one look (CLASSIC): the other interfaces withdrawn on play.html. */}
          <LagSetting lag={lag} setLag={setLag} chip={ensureChip} />
          <p className="tg-panel-note">{tr("With headphones on, tap along to the clicks so the music and your taps line up.")}</p>
          {/* D299: BLUETOOTH MODE explained when on, the clearest sounds, the check, the last Bluetooth delay. */}
          <BtLite lag={lag} setLag={setLag} chip={ensureChip} on={btLite()} />
          {full && (
            // D343: the owner's (unlocked on this device): left in English.
            <section className="tb-owner-set" id="owner-settings" aria-label="Unlocked">
              <p className="tb-owner-head">UNLOCKED ON THIS DEVICE</p>
              {/* D263: the platform, should the guess be wrong (the page reloads in the other's modes). */}
              <Choice
                id="lite-platform"
                label="PLAY ON"
                options={[["auto", `AUTO · ${detected === "mobile" ? "MOBILE" : "COMPUTER"}`], ["mobile", "MOBILE"], ["computer", "COMPUTER"]]}
                value={litePlatformPref()}
                set={(p: PlatformPref) => {
                  saveLitePlatform(p);
                  window.location.reload();
                }}
              />
              {/* D298: the picture in the round: the box, CANTUS (to come), the fugue's sheet. */}
              <DisplayChoice value={display} set={setDisplay} piece={f} />
              {/* D327: the tuning, INSTRUMENT DEFAULT first. */}
              <TuningSelect value={tuningPref} set={changeTuning} own={resolveTuning("instrument", soundNow)} />
              {/* D317: THE LAB, for the owner only (once opened, or ?lab in the address). */}
              {labLinkOn() && (
                <a className="tb-lab-link" id="lab-link" href="./lab.html">
                  LAB
                </a>
              )}
              <button type="button" id="lock-again" className="tb-lock-again" onClick={() => (setUnlocked(false), window.location.reload())}>
                LOCK AGAIN · THE FRIENDS' VIEW
              </button>
            </section>
          )}
          <p className="tb-set-version">
            <VersionTap className="tb-version-tap">{VERSION}</VersionTap>
          </p>
        </Panel>
      )}
      {phase.kind === "settings" && !APP.lite && (
        <Panel title="SETTINGS" close={back}>
          <Choice id="platform" label="PLAY ON" options={[["auto", `AUTO · ${detected === "mobile" ? "PHONE" : "COMPUTER"}`], ["mobile", "PHONE"], ["computer", "COMPUTER"]]} value={pref} set={setPref} />
          {menuOf(platform, midi.length > 0).length > 1 && !prelude && (
            <div className="tg-grid3 tb-modes" role="group" aria-label="Mode">
              {menuOf(platform, midi.length > 0).map((p) => (
                <button key={p.id} type="button" id={`proto-${p.id}`} className={p.id === proto.id ? "on" : ""} onClick={() => setPick({ proto: p.id })} aria-pressed={p.id === proto.id}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {prelude && <p className="tg-panel-note tb-note">PRELUDE · PLAYED ON HIGHWAY</p>}
          <ModeHow id={proto.id} scale={scaleOn} />
          <From f={f} pick={pick} setPick={setPick} from={from} />
          <SoundFold key={kimiko ? "her" : "all"} value={soundNow} set={setSound} own={kimiko ? undefined : PIECE_SOUND[f.id]} />
          {kimiko && <p className="tg-panel-note tb-note">WITH KIMIKO: this sets your voice only; equal temperament at her A.</p>}
          <DisplayChoice value={display} set={setDisplay} piece={f} />
          <InterfaceFold frame={frame.current} />
          <TuningSelect value={tuningPref} set={changeTuning} own={resolveTuning("instrument", soundNow)} />
          <HeadphonesFold hp={hp} lag={lag} setLag={setLag} chip={ensureChip} />
          {platform === "computer" && (
            <div className="tg-set">
              <span>MIDI</span>
              <span className="tg-panel-val">{midi.join(", ") || "NONE FOUND"}</span>
            </div>
          )}
        </Panel>
      )}
      {(phase.kind === "home" || phase.kind === "title") && !asking && !APP.lite && !wheel && (
        <Home
          current={pick.piece}
          on={{ play: begin, choose: () => setWheel(true), tutorial: APP.dev ? () => setPhase({ kind: "lessons" }) : undefined, achievements: () => setPhase({ kind: "achievements" }), settings: () => setPhase({ kind: "settings" }) }}
        />
      )}
      {wheel && !APP.lite && (phase.kind === "home" || phase.kind === "title") && <FuguePicker current={pick.piece} close={() => setWheel(false)} pick={open} paused={phase.kind === "title"} />}
      {/* D308: ⚙ opens over the cards, which stay behind it (not the music box). */}
      {APP.lite && (phase.kind === "home" || phase.kind === "title" || phase.kind === "settings") && <LiteGrid soundOf={soundAt} beaten={lite.beaten} best={lite.best} scores={lite.scores} bestOld={lite.bestOld} scoresOld={lite.scoresOld} current={opened && pick.piece} open={open} hear={(id) => (setPick({ piece: id, share: 0, voice: -1 }), setHearing(id))} settings={() => setPhase({ kind: "settings" })} setLang={(l: Lang) => (setLang(l), setLite(readLite()))} beside={full ? <ToolsButton open={() => (setPhase({ kind: "home" }), setToolsOpen(true))} /> : undefined} fuguesOnly={platform === "mobile"} tutorial={platform === "mobile" ? { ...manualProgress(readManual()), start: () => setSteps(true) } : undefined} />}
      {APP.lite && full && toolsOpen && phase.kind === "home" && <ToolsPanel f={f} voice={pick.voice} pieces={liteAll(platform === "mobile")} setPiece={(id) => setPick({ piece: id, share: 0, voice: -1 })} setVoice={(v) => setPick({ voice: v })} practice={practise} close={() => setToolsOpen(false)} last={practiced?.piece === f.id ? practiced : null} />}
      {/* D342: THE MANUAL's map (in place of the old tutorial's steps), and its Part 0 screens. */}
      {APP.lite && steps && phase.kind === "home" && !manScreen && <ManualMap begin={beginManual} testOut={beginTest} close={() => setSteps(false)} />}
      {APP.lite && manScreen === "grip" && phase.kind === "home" && <GripScreen chip={ensureChip} sound={gripSound} lag={lag} setLag={setLag} done={gripDone} close={() => (setManScreen(null), setSteps(true))} />}
      {APP.lite && manScreen === "ask" && phase.kind === "home" && <AskScreen answer={answered} close={() => (setManScreen(null), setSteps(true))} />}
      {APP.lite && manScreen && typeof manScreen === "object" && phase.kind === "home" && <PlacementScreen p={manScreen.placement} takes={placementTakes.current} retake={manScreen.retake} onRetake={() => placementStep(PLACEMENT.findIndex((e) => e.id === manScreen.retake), true)} done={placementDone} close={() => (placementDone(), setSteps(true))} />}
      {APP.lite && hearing && phase.kind === "home" && <HearSubject id={hearing} play={playSubject} close={() => setHearing(null)} single={!full} />}
      {phase.kind === "title" && (
        <PlayPop id={f.id} voice={pick.voice} singing={voicesFrom(f, from)} setVoice={(v) => setPick({ voice: v })} play={() => start()} close={home} rules={RULE_LEVELS[proto.id]} {...(APP.lite ? { sound, setSound, tuning: tuningShort(tuning), plain: !full } : {})} learn={APP.dev && TRACKS[platform].some((l) => l.mode === proto.id) ? () => setPhase({ kind: "lessons", focus: proto.id }) : undefined}>
          {APP.lite && !full && <LiteDrumsSwitch />}
          {tempi && (
            // D351: SLOW · DEFAULT · FAST, one button cycling them; the sound follows (unless one was chosen).
            <button type="button" id="pop-tempo" className={`tb-pop-tempo tb-pop-tempo-${step}`} aria-label={`${tr("TEMPO")}: ${stepWord(step)}`} onClick={() => setTempoSteps(saveStep(f.id, nextStep(step)))}>
              <span className="tb-pop-tempo-k">{tr("TEMPO")}</span> <b>{stepWord(step)}</b> <span className="tb-pop-tempo-v">{stepBeat(f.id, tempi[step])}</span>
            </button>
          )}
          {APP.lite && !tempi && isWtcFugue(f.id) && lite.beaten.includes(f.id) && (
            // D356: a WTC fugue finished but not with an A: the one quiet line saying what opens its tempo.
            <p className="tg-card-sub tb-pop-tempo-hint" id="pop-tempo-hint">
              {tr("AN A ON THIS FUGUE UNLOCKS TEMPO")}
            </p>
          )}
          {herHere && <HerSwitch pick={pick} setPick={setPick} />}
          {kimiko && <p className="tg-card-sub tb-her">{herLine(hm ? herState(hm) : null)}</p>}
          {kimiko && <p className="tg-card-sub tb-her-credit">{HER_CREDIT}</p>}
          {note && <p className="tg-note">{note}</p>}
          {lag !== null && lag > 0.02 && (
            // D260: a delay in force is never hidden: shown where the game is started, with a way out.
            <p className="tg-note tb-lag-note" id="lag-note">
              {tr("HEADPHONE DELAY {ms} MS IS ON", { ms: Math.round(lag * 1000) })}
              {(APP.lite ? btLite() : hp.btFor(lag)) ? ` · ${tr("BLUETOOTH MODE")}` : ""} ·{" "}
              <button type="button" id="lag-off" className="tg-link" onClick={() => setLag(null)}>
                {tr("TURN OFF")}
              </button>
            </p>
          )}
        </PlayPop>
      )}
      {phase.kind === "achievements" && <Achievements close={back} tab={phase.fresh?.length ? "feats" : "seals"} fresh={phase.fresh} />}
      {phase.kind === "lessons" && <LessonMap platform={platform} focus={phase.focus} play={beginLesson} close={back} />}
      {asking && (
        <PlayedBefore
          answer={(yes) => {
            answer(platform, yes);
            setAsking(false);
            if (!yes) beginLesson(platform, nextLesson(platform));
          }}
        />
      )}
      <div className="tg-upright" role="alert">
        {/* D239: why, and a way back (a newcomer sent to a fugue on LADDER by NEXT, the phone upright). */}
        <div className="tb-upright-box">
          <p className="tb-upright-title">{wide ? tr("TURN THE PHONE SIDEWAYS") : tr("TURN THE PHONE UPRIGHT")}</p>
          <p className="tb-upright-why">{wide ? (proto.layout === "bars" ? tr("This piece is played on two bars, a thumb on each.") : tr("This mode needs the phone held sideways.")) : tr("This mode needs the phone held upright.")}</p>
          {phase.kind !== "home" && (
            <button type="button" id="upright-back" className="tb-upright-back" onClick={home}>
              ✕ {tr("BACK TO THE CARDS")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** D239: the bench's modes whose first-game rule has been played past. */
const HINTS_KEY = "tb-hints-v1";
/** D317: the lab's link in ⚙: where the lab has been opened on this device (`tb-lab`), or `?lab` is in the address (kept from then on). */
function labLinkOn(): boolean {
  try {
    if (new URLSearchParams(location.search).has("lab")) localStorage.setItem("tb-lab", "1");
    return localStorage.getItem("tb-lab") === "1";
  } catch {
    return false;
  }
}
/** D216, KIMIKO: the credit, on the title card and the result. */
const HER_CREDIT = "KIMIKO ISHIZAKA, THE OPEN WELL-TEMPERED CLAVIER (2015), CC0";
/** D216: KIMIKO's title-card line (null: no recording of this piece). */
function herLine(state: "none" | "loading" | "ready" | "failed" | null): string {
  if (state === null) return "NO RECORDING OF THIS PIECE";
  if (state === "failed") return "HER RECORDING CANNOT BE REACHED · TAP TO TRY AGAIN";
  if (state === "ready") return "♪ READY · HER TEMPO, HER A";
  return "LOADING HER RECORDING…";
}

/** D219: WITH KIMIKO ISHIZAKA (D233: once unlocked; where her recording exists), and then YOUR VOICE. */
function HerSwitch({ pick, setPick }: { pick: Pick; setPick: (p: Partial<Pick>) => void }) {
  return (
    <>
      <Choice id="her" label="WITH KIMIKO ISHIZAKA" options={[["on", "ON"], ["off", "OFF"]]} value={pick.her ? "on" : "off"} set={(v) => setPick({ her: v === "on" })} />
      {pick.her && <Choice id="mine" label="YOUR VOICE" options={[["on", "ON"], ["soft", "SOFT"], ["off", "OFF"]]} value={pick.mine} set={(mine) => setPick({ mine })} />}
    </>
  );
}

function From({ f, pick, setPick, from }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number }) {
  return (
    <label className="tg-from">
      <span>
        PRACTICE FROM {Math.round(pick.share * 100)}% · BAR {barAt(f, from)}
      </span>
      <input type="range" id="from" min={0} max={99} step={1} value={Math.round(pick.share * 100)} onChange={(e) => setPick({ share: Number(e.target.value) / 100 })} />
    </label>
  );
}

/**
 * The design study's `&auto=1` (screenshots only): the voice plays itself on the bars, each note touched
 * at its row as it comes and let go near its end.
 */
function autoplay(g: ProtoGame, st: { id: number; held: { id: number; end: number } | null; last: number }) {
  const area = document.querySelector(".tg-play")?.getBoundingClientRect();
  if (!g.rows || !area) return;
  const ts = performance.now();
  if (st.held && g.now >= st.held.end) {
    g.up(st.held.id, ts);
    st.held = null;
  }
  const i = g.next();
  if (i < 0 || i === st.last) return;
  const n = g.notes[i];
  if (g.now < n.on) return;
  if (st.held) g.up(st.held.id, ts);
  st.last = i;
  st.id++;
  g.down(st.id, { side: st.id % 2 ? "left" : "right", x: st.id % 2 ? 20 : area.width - 20, y: g.rows.yOf(n.step), w: area.width, h: area.height }, ts);
  st.held = { id: st.id, end: n.on + n.dur * 0.85 };
}
