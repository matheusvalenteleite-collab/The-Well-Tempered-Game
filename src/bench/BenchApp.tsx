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
import { answer, askFirst, nextLesson, recordLesson, trackState } from "./tutorial.ts";
import { LessonMap, PlayedBefore } from "./LessonMap.tsx";
import { tempoOf } from "../touch/tempi.ts";
import { presetById, setPreset } from "../touch/sound.ts";
import { soundFor } from "../touch/piece-sound.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { ladderGeometry, MusicBox, inkOf, type Frame } from "../touch/MusicBox.tsx";
import { AUTO, BOXV, variantRows } from "../touch/box-variants.ts";
import { uiRows } from "../touch/ui/index.ts";
import { InterfaceFold } from "./InterfaceFold.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "../touch/PlayArea.tsx";
import { Choice, loadDrums, Panel, Tapper } from "../touch/Panels.tsx";
import { SoundFold } from "./SoundFold.tsx";
import { Home } from "./Home.tsx";
import { detectedPlatform, midiInputNames, platformOf, type PlatformPref } from "./home.ts";
import { HeadphonesFold, useHeadphones } from "./Headphones.tsx";
import { Chip, voicing } from "../touch/chip.ts";
import { barAt, beatOf, fugueById, keyAt, keyName, type TouchFugue, fugueOnly, cadenceName } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { setTuning } from "../touch/tuning.ts";
import { accompaniment, startTick, stepRange, subjectMarks, entrySpans, voicesFrom } from "../touch/voice-mode.ts";
import { paintProto } from "./paint-proto.ts";
import { laneLine, ProtoGame, type KeyPress } from "./proto-game.ts";
import { lineKey, subjectLine } from "./subject-line.ts";
import { FuguePicker } from "./FuguePicker.tsx";
import { TuningFold } from "./TuningFold.tsx";
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
import { chosenReading, readingsOf, type Reading } from "../touch/readings.ts";
import { TutorialSteps } from "./TutorialSteps.tsx";
import { LITE_HINT, liteAll, litePlatform, soundUnlocked, litePlatformPref, readLite, recordLite, recordLiteBest, RULES, saveLitePlatform, startHere, writeLite } from "./lite.ts";
import { LiteGrid } from "./LiteGrid.tsx";
import { PlayPop } from "./PlayPop.tsx";
import { tierCards } from "./tiers.ts";
import { bookCards } from "./cards.ts";
import { btOn, latencyOf } from "../touch/headphones.ts";
import { LagSetting } from "../touch/Panels.tsx";
import { ARROW_KEYS, arrowOf, dynamic, easyOf, KEY_ROWS, type KeysLayout, keyId, keyRow, menuOf, midiId, moveOf, offered, PROTOS, protoById, roadAlone, takesHer, type Platform, type ProtoId } from "./protos.ts";

const PICK_KEY = "tb-pick-v2";
/** D233: ⚙ PLAY ON: AUTO (from the pointer) or a platform chosen. */
const PLATFORM_KEY = "tb-platform-v1";
const LAG_KEY = "tg-lag";
// D203: a new key, so that every player starts on the fugue's own sound.
// D208: a new key, so every player starts on the sampled harpsichord.
// D246: each piece its own sound (piece-sound.ts), the player's choice kept per piece.
const SOUND_KEY = "tg-sound-by-piece-v1";
const DEFAULT_SOUND = "harpsichordSampled";
const TUNING_KEY = "tg-tuning";
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
function saveSessionLag(l: number | null) {
  try {
    if (l === null) sessionStorage.removeItem(LAG_KEY);
    else sessionStorage.setItem(LAG_KEY, JSON.stringify(l));
  } catch {
    /* this page only */
  }
}

export function sane(p: Pick): Pick {
  const known = fugueById(p.piece).id === p.piece ? p.piece : DEFAULT.piece;
  // D229: Book I's preludes are stage 1 (stages.ts); a locked fugue gives its prelude; Book II's preludes still give their fugues.
  const pair = paired(known) && isPrelude(known) ? known : fugueOnly(known);
  // D232: a piece whose tier is closed gives I/1's prelude. D237: the minimal page has its own unlocking (lite.ts), Book I only.
  // D263: on a phone the minimal page has no preludes: a prelude gives its fugue.
  const mob = APP.lite && litePlatform() === "mobile";
  // D275: and Book II's fugues.
  const piece = APP.lite ? (paired(pair) ? (mob && isPrelude(pair) ? fugueOf(pair) : pair) : /^wtc2f\d\d$/.test(pair) ? pair : startHere(mob)) : locked(pair) ? (locked(preludeOf(pair)) ? "wtc1p01" : preludeOf(pair)) : pair;
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
type Phase = { kind: "home" } | { kind: "title" } | { kind: "play" } | { kind: "result"; stage?: { won: boolean; fugue: string }; her?: boolean; right: number; wrong: number; missed: number; stray: number; of: number; score: number; grade: string; captured: number; entries: number; maxStreak: number; stars: number; failedBar: number | null; lastBar?: number; progress?: number; sheet?: Sheet; best?: { before: number | null; fresh: boolean } | null; art?: ArtStats; lanes?: { exact: number; relative: number }; report?: string; seal: { kind: string; earned: boolean; why: string } | null; feats?: FeatId[]; opened?: Tier[]; next?: string | null } | { kind: "settings" } | { kind: "achievements"; fresh?: FeatId[] } | { kind: "lessons"; focus?: ProtoId } | { kind: "talk"; lines: Line[]; next: "play" | "again" | "advance" | "watch" };

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
  const applyLag = (l: number | null) => {
    setLagRaw(l);
    if (APP.lite) saveSessionLag(l);
    else save(LAG_KEY, l);
    if (chip.current) chip.current.lag = l;
  };
  // D223: a delay tapped is kept for the listening setup it was tapped with (not on the minimal page).
  const setLag = (l: number | null) => {
    applyLag(l);
    if (!APP.lite) hp.record(l);
  };
  const [chosen, setChosen] = useState<Record<string, string>>(() => load<Record<string, string>>(SOUND_KEY, {}));
  const [herSound, setHerSoundRaw] = useState<string>(() => load<string>(HER_SOUND_KEY, HER_SOUND));
  const [tuning, setTuningRaw] = useState<{ id: string; a: number }>(() => load(TUNING_KEY, { id: "equal", a: 440 }));
  const changeTuning = (id: string, a: number) => {
    setTuningRaw({ id, a });
    save(TUNING_KEY, { id, a });
    setTuning(id, a);
  };
  useEffect(() => {
    setTuning(tuning.id, tuning.a);
    loadDrums();
  }, []);
  // D233: the MIDI inputs connected (MIDI CONTROLLER offered while there is one).
  const [midi, setMidi] = useState<string[]>([]);
  // D182: mobile or computer. D233: guessed from the pointer (a finger and no hover: the phone's), ⚙ PLAY ON overrides it.
  const [detected] = useState(detectedPlatform);
  const [pref, setPrefRaw] = useState<PlatformPref>(() => load<PlatformPref>(PLATFORM_KEY, "auto"));
  // D263: the minimal page its own (⚙ PLAY ON, kept apart from the bench's).
  const platform = APP.lite ? platformOf(litePlatformPref(), detected) : platformOf(pref === "mobile" || pref === "computer" ? pref : "auto", detected);
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
  const run = lesson?.run;
  const f = fugueById(run?.piece ?? pick.piece);
  // D229: a prelude on HIGHWAY (a phone's five lanes, a computer's keys), a fugue in the mode chosen.
  // D237: the minimal page: a phone's prelude on HIGHWAY, its fugue on LADDER; a computer's both on HIGHWAY (keys).
  const proto = protoById(run ? run.proto : stageMode(f, platform, APP.lite ? (platform === "computer" ? "keys" : "ladder") : offered(pick.proto, platform, midi.length > 0)));
  const prelude = !run && f.kind === "prelude";
  const from = run ? run.from : startTick(f, pick.share);
  const voice = run ? run.voice : pick.voice;
  // D272: on play.html a fugue is played by its chosen reading (D274: at the recordings' tempo, never the
  // book's: the owner, "fugues should not be too fast").
  // D282: a tutorial step may name its reading.
  const reading = run?.reading ? (readingsOf(run.piece).find((x) => x.id === run.reading) ?? null) : APP.lite && !run && f.kind === "fugue" ? chosenReading(f.id, lite.beaten.includes(f.id)) : null;
  const bpm = run ? run.bpm : tempoOf(f.id);
  // D216, KIMIKO (D219: WITH KIMIKO ISHIZAKA, a switch in LADDER and SUBJECT): the player over Kimiko
  // Ishizaka's recording, the game on her time; only where she is timed (whatever pieces
  // data/recordings/ishizaka-ticks.json holds); her track let go when the switch or the piece is left.
  // D233: once unlocked (the feat KIMIKO ISHIZAKA: all 24 Book I fugues beaten).
  const unlockedHer = useMemo(() => !APP.lite && herUnlocked(), [phase.kind]);
  const herHere = unlockedHer && takesHer(proto.id) && !run && !!herMap(f.id);
  const kimiko = herHere && pick.her;
  const hm = kimiko ? herMap(f.id) : null;
  // D219: the sound playing: WITH KIMIKO, the player's voice's own (TRAVERSO unless changed in ⚙ SOUND).
  // D265: on play.html a piece plays its own sound until it is finished with a high grade (A or S).
  const soundOpen = !APP.lite || soundUnlocked(f.id, lite);
  const sound = soundOpen ? soundFor(f.id, chosen, DEFAULT_SOUND) : soundFor(f.id, {}, DEFAULT_SOUND);
  const soundNow = kimiko ? herSound : sound;
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
  // D223: other headphones noticed (a setup seen before gets its delay back), BLUETOOTH MODE, the screen's delay.
  const hp = useHeadphones(chip, APP.lite ? () => {} : applyLag);
  const [calib, setCalib] = useState(false);
  const game = useRef<ProtoGame | null>(null);
  const paint = useRef<Painter | null>(null);
  const frame = useRef<Frame>(preview());
  const count = useRef<HTMLDivElement>(null);
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
    const herBuf = herBuffer(hm);
    if (kimiko && (!hm || !herBuf)) return setPhase({ kind: "title" });
    const clock = hm && herBuf ? herClock(hm, f, from) : undefined;
    if (hm) setTuning("equal", hm.a);
    ch.mine.gain.value = kimiko ? MINE[pick.mine] : 1;
    // D219: failing always on (D225: in the lessons from the fourth on); WITH KIMIKO, the game sounds only the player's voice.
    const g = new ProtoGame(f, played, from, proto, { bpm, legato: pick.legato, easy: run?.easy ?? easyOf(proto.id), fail: run ? run.fail : true, her: kimiko, bt: APP.lite ? btOn("auto", lag, latencyOf(ch.ctx) ?? 0) : hp.btFor(lag), scale: false, ...(run ? { until: run.until, wait: run.wait, solo: run.solo, coach: run.coach, demo: watching, guide: !watching && run.proto === "ladder" && lesson?.pl === "mobile" } : {}), reading, ...(clock ? { clock } : {}) }, ch);
    const h = hm && herBuf ? new Her(ch, hm) : null;
    if (h && herBuf) h.begin(g, herBuf);
    // For the measurements (the bench's own checks): the game and her playing.
    (globalThis as { __kimiko?: unknown }).__kimiko = h ? { g, her: h, ctx: ch.ctx, map: hm } : undefined;
    const arrows = proto.id === "arrows" ? g.moves.map(arrowOf) : g.cues;
    game.current = g;
    // D220: the game under way, for the bench's own checks (driving the keys in a browser).
    (globalThis as { __bench?: unknown }).__bench = g;
    // D223: drawn with the screen's delay taken in.
    paint.current = (ctx, w, h) => g.view(() => paintProto(ctx, w, h, g, marks.subject));
    const b = beatOf(f);
    const auto = { id: 9000, held: null as { id: number; end: number } | null, last: -1 };
    let raf = 0;
    const loop = () => {
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
      };
      if (proto.layout === "bars") g.rows = boxRows(f.barTicks, g.now);
      if (AUTO) autoplay(g, auto);
      // D249: the centre holds the count-in only; the combo is by the score (paint-proto.ts scoreboard).
      if (count.current) count.current.textContent = g.countIn() ? String(g.countIn()) : "";
      if (done) {
        // D216: a lost run: she fades out over a second; the end: her last chord rings on.
        h?.stop(g.failedAt !== null ? HER_FADE.fail : HER_FADE.end);
        game.current = null;
        paint.current = null;
        const r = g.results();
        if (lesson && watching) {
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
          recordLite(f.id, r.failedBar !== null, platform === "mobile", r.grade);
          const opened: Tier[] = [];
          const st = readLite();
          setLite(st);
          // D268: a whole piece finished: its final score against the best.
          const best = r.failedBar === null && from === 0 ? recordLiteBest(f.id, r.sheet.final) : null;
          setPhase({ kind: "result", ...r, best, seal: null, opened, next: nextIn(liteAll(platform === "mobile"), f.id) });
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
  const phaseNow = useRef(phase.kind);
  phaseNow.current = phase.kind;
  // D237: ✕ goes back to the cards (HOME, the wheel as it was left, the minimal page's grid).
  const home = () => ((waitingHer.current = null), setLesson(null), setPhase({ kind: "home" }));
  const quit = home;
  /** D237: a card chosen (the wheel, the grid): the pop-up over it (from its start unless it is the piece already chosen). */
  const open = (piece: string) => {
    if (piece !== pick.piece) setPick({ piece, share: 0, voice: -1 });
    setPhase({ kind: "title" });
  };
  /** D237: CONTINUE, NEXT: straight into the count-in, no pop-up. */
  const begin = (piece: string) => {
    if (piece !== pick.piece) setPick({ piece, share: 0, voice: -1 });
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
  const hintLine = tr(phase.kind === "play" && lesson ? (watching ? "WATCH THE THUMBS" : (TRACKS[lesson.pl][lesson.n].goal ?? "")) : phase.kind === "play" && !hintSeen.includes(proto.id) ? (LITE_HINT[proto.id] ?? "") : "");
  const seen = () => {
    if (!hintLine) return;
    if (APP.lite) setLite(writeLite({ seen: [...lite.seen, proto.id] }));
    else {
      const next = [...benchSeen, proto.id];
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
  const talkDone = (next: "play" | "again" | "advance" | "watch") => {
    if (next === "watch") return setWatching(true), start(true);
    if (next !== "advance") return setWatching(false), start();
    if (lesson && lesson.n + 1 < TRACKS[lesson.pl].length) return beginLesson(lesson.pl, lesson.n + 1);
    quit();
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
    for (const [on, dur, midi] of e.notes) ch.note(midi, t0 + (on - e.on) / tps, (dur / tps) * 0.95, voicing(e.voice, f.voices.length, true), { lead: true });
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
  const playSubject = async (notes: Performed, v: number): Promise<number> => {
    const ch = ensureChip();
    await ch.prepare(notes.map((n) => n.midi), notes.map((n) => n.midi));
    const t0 = ch.ctx.currentTime + 0.15;
    for (const n of notes) ch.note(n.midi, t0 + n.at, n.len, voicing(v, f.voices.length, true), { ...dynamic(n.d), lead: true });
    return performance.now() / 1000 + 0.15 + (ch.lag ?? 0);
  };
  const events: ThumbEvents = {
    // D280: during the demonstration the game's thumbs play; the player's touches wait.
    down: (id, side, x, y, w, h, ts) => (watching ? undefined : (seen(), game.current?.down(id, { side, x, y, w, h }, ts))),
    move: (id, x, y, w, h, ts) => game.current?.move(id, { side: "left", x, y, w, h }, ts),
    // D249: a touch the system took back (pointercancel) stops its note unjudged: no early let-go.
    up: (id, ts, cancelled) => game.current?.up(id, ts, cancelled),
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
          if (kind === 0x90 && vel > 0) keyDownRef.current(midiId(n), { midi: n, velocity: vel / 127, side: n < 60 ? "left" : "right" }, e.timeStamp);
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
            <span className="tg-hud-title">{lesson ? `${tr("LESSON")} ${lesson.n + 1} · ${tr(TRACKS[lesson.pl][lesson.n].english)}` : APP.lite ? (lang() === "en" ? f.title.toUpperCase() : pieceName(f.kind, f.key, f.number)) : `BENCH · ${proto.name}`}</span>
            <span className="tg-hud-bar">{APP.lite && lang() !== "en" ? keyWordsIn(frame.current.key) : keyName(frame.current.key)}</span>
            {(playing || lesson) && (
              <button type="button" id="quit" className="tg-x" aria-label="Quit" onClick={quit}>
                ✕
              </button>
            )}
          </>
        }
        legend={f.voiceNames.map((name, i) => (
          <span key={name} style={{ color: inkOf(i, f.voices.length), opacity: played.includes(i) ? 1 : 0.55 }}>
            ■ {voiceName(name)}
            {played.includes(i) && <b className="tb-you"> · {tr("YOU")}</b>}
          </span>
        ))}
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        {phase.kind === "talk" && lesson && (
          <BachTalk key={`${lesson.n}-${phase.next}-${phase.lines[0]?.text}`} title={`${TRACKS[lesson.pl][lesson.n].title} · ${tr(TRACKS[lesson.pl][lesson.n].english)}`} lines={phase.lines} onLine={demo} onDone={() => talkDone(phase.next)} />
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
              />
            ) : (
              <>
                {phase.failedBar !== null ? <h1 className="tb-grade tb-failed">{tr("THE CROWD LEFT")}</h1> : <h1 className={`tb-grade${phase.grade === "S" || phase.grade === "A" ? " tg-gold" : ""}`}>{phase.grade}</h1>}
                {phase.failedBar !== null && <p className="tg-card-sub">BAR {phase.failedBar}</p>}
                <p className="tb-score">{phase.score.toLocaleString("en")}</p>
              </>
            )}
            {phase.lanes && laneLine(phase.lanes) && (
              <p className="tb-lane-line" id="lane-line" title="LANE: the note's own lane (full points) · DIRECTION: another lane the right way (half)">
                {laneLine(phase.lanes)}
              </p>
            )}
            {phase.stage?.won && <p className="tb-result-seal tb-stage-line earned">PRELUDE BEATEN · FUGUE UNLOCKED</p>}
            {phase.opened?.map((t) => (
              <p key={t} id={`tier-toast-${t.toLowerCase()}`} className={`tb-tier-toast tb-tier-${t.toLowerCase()}`} role="status">
                {t} UNLOCKED!
              </p>
            ))}
            {!APP.lite && phase.feats && phase.feats.length > 0 && <FeatToast fresh={phase.feats} open={() => setPhase({ kind: "achievements", fresh: phase.feats })} />}
            {phase.report && (
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
      {hintLine && (
        <p className="tb-lite-hint" id="lite-hint" role="status">
          {hintLine}
        </p>
      )}
      {(layout === "full" || roadAlone(proto, playing)) && playing && (
        <button type="button" id="quit-full" className="tg-x tb-quit" aria-label="Quit" onClick={quit}>
          ✕
        </button>
      )}
      {hp.changed && !playing && !calib && (
        <div className="tb-hp-banner" role="status">
          <button type="button" id="hp-recalibrate" onClick={() => setCalib(true)}>
            HEADPHONES CHANGED? · RECALIBRATE (5 s)
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
        <Panel title="SETTINGS" close={back}>
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
          {/* D283: the language (the page re-renders in it). */}
          <Choice id="lang" label="LANGUAGE" options={LANGS} value={lang()} set={(l: Lang) => (setLang(l), setLite(readLite()))} />
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
          {/* D265: one look (CLASSIC): the other interfaces withdrawn on play.html. */}
          <LagSetting lag={lag} setLag={setLag} chip={ensureChip} />
          <p className="tg-panel-note">{tr("With headphones on, tap along to the clicks so the music and your taps line up.")}</p>
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
          <SoundFold key={kimiko ? "her" : "all"} value={soundNow} set={setSound} />
          {kimiko && <p className="tg-panel-note tb-note">WITH KIMIKO: this sets your voice only; equal temperament at her A.</p>}
          <InterfaceFold frame={frame.current} />
          <TuningFold id={tuning.id} a={tuning.a} set={changeTuning} />
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
      {APP.lite && (phase.kind === "home" || phase.kind === "title") && <LiteGrid beaten={lite.beaten} open={open} hear={(id) => (setPick({ piece: id, share: 0, voice: -1 }), setHearing(id))} settings={() => setPhase({ kind: "settings" })} fuguesOnly={platform === "mobile"} tutorial={platform === "mobile" ? { done: TRACKS.mobile.filter((l) => trackState("mobile").passed[l.id]).length, of: TRACKS.mobile.length, start: () => setSteps(true) } : undefined} />}
      {APP.lite && steps && phase.kind === "home" && <TutorialSteps play={(n) => beginLesson("mobile", n)} close={() => setSteps(false)} />}
      {APP.lite && hearing && phase.kind === "home" && <HearSubject id={hearing} open={lite.beaten.includes(hearing)} play={playSubject} close={() => setHearing(null)} />}
      {phase.kind === "title" && (
        <PlayPop id={f.id} voice={pick.voice} singing={voicesFrom(f, from)} setVoice={(v) => setPick({ voice: v })} play={() => start()} close={home} rules={RULES[proto.id]} {...(APP.lite ? { sound, setSound, soundLocked: !soundOpen } : {})} learn={APP.dev && TRACKS[platform].some((l) => l.mode === proto.id) ? () => setPhase({ kind: "lessons", focus: proto.id }) : undefined}>
          {herHere && <HerSwitch pick={pick} setPick={setPick} />}
          {kimiko && <p className="tg-card-sub tb-her">{herLine(hm ? herState(hm) : null)}</p>}
          {kimiko && <p className="tg-card-sub tb-her-credit">{HER_CREDIT}</p>}
          {note && <p className="tg-note">{note}</p>}
          {lag !== null && lag > 0.02 && (
            // D260: a delay in force is never hidden: shown where the game is started, with a way out.
            <p className="tg-note tb-lag-note" id="lag-note">
              HEADPHONE DELAY {Math.round(lag * 1000)} MS IS ON ·{" "}
              <button type="button" id="lag-off" className="tg-link" onClick={() => setLag(null)}>
                TURN OFF
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
          <p className="tb-upright-title">{wide ? "TURN THE PHONE SIDEWAYS" : "TURN THE PHONE UPRIGHT"}</p>
          <p className="tb-upright-why">{wide ? (proto.layout === "bars" ? "This piece is played on two bars, a thumb on each." : "This mode needs the phone held sideways.") : "This mode needs the phone held upright."}</p>
          {phase.kind !== "home" && (
            <button type="button" id="upright-back" className="tb-upright-back" onClick={home}>
              ✕ BACK TO THE CARDS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** D239: the bench's modes whose first-game rule has been played past. */
const HINTS_KEY = "tb-hints-v1";
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
