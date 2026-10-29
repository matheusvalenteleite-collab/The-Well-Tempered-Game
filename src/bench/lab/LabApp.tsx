/**
 * D317, THE LAB (lab.html): a testbench for the game's mechanics, for the owner and for the sessions
 * tuning them. The real engine and drawing (the music box and the bars of play.html, LADDER on a phone,
 * the keys on a computer) on any passage, at any tempo, with every judging parameter live (MECH,
 * mechanics.ts); each thumb's trace and every verdict with its reason and numbers; every run recorded
 * as a log to copy, share, keep and replay with other parameters (replay.ts; offline:
 * tools/lab/replay.ts); ready-made drills. English only.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MusicBox, ladderGeometry, inkOf, type Frame } from "../../touch/MusicBox.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "../../touch/PlayArea.tsx";
import { Chip } from "../../touch/chip.ts";
import { PIECES, TUTORIAL_PIECES, beatOf, cadenceName, fugueById, keyAt, keyName, type TouchFugue, everyNote } from "../../touch/fugue.ts";
import { laneNotes } from "../../touch/lanes.ts";
import { ornamentMark, ornamentsOf } from "../../touch/ornament-play.ts";
import { markOf, readingsOf, type MarkNote, type Reading } from "../../touch/readings.ts";
import { tempoOf } from "../../touch/tempi.ts";
import { presetById, setPreset } from "../../touch/sound.ts";
import { PIECE_SOUND } from "../../touch/piece-sound.ts";
import { accompaniment, entrySpans, stepRange, subjectMarks, voicesFrom } from "../../touch/voice-mode.ts";
import { btOn, latencyOf, type BtMode } from "../../touch/headphones.ts";
import { uiRows } from "../../touch/ui/index.ts";
import { STRONG_SIDE } from "../../touch/touch-expr.ts";
import { LagSetting, loadDrums } from "../../touch/Panels.tsx";
import type { Side } from "../../touch/thumbs.ts";
import { paintProto } from "../paint-proto.ts";
import type { KeyPress, ProtoGame } from "../proto-game.ts";
import { KEY_ROWS, keyId, keyRow, protoById } from "../protos.ts";
import { detectedPlatform } from "../home.ts";
import { SoundSelect } from "../SoundSelect.tsx";
import { POP_SOUNDS } from "../PlayPop.tsx";
import { VERSION } from "../version.ts";
import { MECH, MECH_DEFAULTS, MECH_SPEC, REL_KEYS, asRecorded, mechChanges, mechPhrase, resetMech, setMech, type Mech, type MechKey, type MechSpec } from "../mechanics.ts";
import type { LabEvent } from "./events.ts";
import { labGame, passageSpan } from "./game.ts";
import { LabRecorder, logText, parseLog, type LabLog, type LabPassage } from "./log.ts";
import { describe } from "./describe.ts";
import { FreePlay, freeRows, KB_DEFAULT, whiteNames, whitePcs, whiteShare, type FreeOptions, type FreeScale, type WhiteMode } from "./free.ts";
import { loadTable, TableStage, TableTab } from "./TableStage.tsx";
import { MotionHub, stampOf, strengthFrom, type SenseSource, type TouchInfo } from "./sensor.ts";
import { SensorTab } from "./SensorTab.tsx";
import { AdaptiveCal, DYN_MODES, loadDynCal, logStrength, refsText, saveDynCal, zoneReport, type DynMode } from "./dynamics.ts";
import { PassageDynamics, type StrikeReader } from "./passage-dyn.ts";
import { pitchName } from "./replay.ts";
import { RegistrationStops } from "../../touch/RegistrationStops.tsx";
import { hasStops, voicePatch } from "../../touch/registration.ts";
import { BreathPlay } from "./breath.ts";
import { BreathTab, loadBreath, micProblem, openBreathMic } from "./breath-tab.tsx";
import { diff, replay, tally, type Diff, type Tally } from "./replay.ts";
import { CONFIGS, DEFAULT_CONFIG, MECH_BASE, configById, configEdits, configLabel, storedSetting } from "./presets.ts";
import { StudyCard, StudyTab, useStudy, type StudyHost } from "./StudyTab.tsx";
import { holdSettings, releaseSettings, STUDY_SOUND } from "./study.ts";
import { rushLine } from "./rush.ts";

const STORE = "tb-lab-v1";
const RUNS = "tb-lab-runs-v1";
/** D329: the CONFIG preset last chosen (presets.ts). */
const CONFIG = "tb-lab-config-v1";
const MAX_RUNS = 20;
/** Verdict lines over the box, and kept for SEE. */
const FEED_SHOWN = 4;
const FEED_KEPT = 400;
/** A finished trace fades over this long (ms). */
const TRACE_FADE_MS = 4000;

interface Setup {
  piece: string;
  voice: number;
  fromBar: number;
  toBar: number;
  tempoPct: number;
  proto: "ladder" | "keys";
  wait: boolean;
  bt: BtMode;
  /** A reading's id, "" for none. */
  reading: string;
  /** A sound's id, "" for the piece's own. */
  sound: string;
  loop: boolean;
  traces: boolean;
  /** D320: FREE PLAY's lines over the box (nothing to follow there). */
  feed: boolean;
  /** D320: while a passage plays, the latest verdict in the title bar (never over the music); off by default. */
  feedBar: boolean;
  lag: number | null;
  drill?: string;
  /** D320: what START plays: the passage, or FREE PLAY (free.ts). */
  mode: "passage" | "free";
  freeScale: FreeScale;
  freeOctaves: number;
  /** D330, FREE PLAY's KEYBOARD: which notes are white, the zone split, the black keys' height, their tips' slant, the names on the keys. */
  kbWhite: WhiteMode;
  kbSplit: number;
  kbBlack: number;
  kbSlant: number;
  kbLabels: boolean;
  /** FREE PLAY's tempo (the metronome; the ornaments' speed), ♩ per minute. */
  freeBpm: number;
  click: boolean;
  /** D321, SENSOR's PLAY WITH IT: FREE PLAY's attacks from the tap's strength (the motion sensor). */
  sensePlay: boolean;
  /** ...read from the contact's size (the default: the stronger probe on iPhone) or the motion sensor. */
  senseSource: SenseSource;
  /** D335: DYNAMICS on the sampled piano (dynamics.ts): off, A place × strike, B pedal + strike, C strike only; D336: FREE PLAY and PASSAGE (passage-dyn.ts) alike. */
  dynMode: DynMode;
  /** D336: the strike's references learned from the recent strikes (on by default), else the stored calibration alone. */
  dynAdaptive: boolean;
}

interface Drill {
  id: string;
  name: string;
  look: string;
  piece: string;
  voice: number;
  fromBar: number;
  toBar: number;
  reading?: string;
  tempoPct?: number;
}
/** Passages for testing one mechanic each (the owner's list, D317). */
export const DRILLS: readonly Drill[] = [
  { id: "slur-slow", name: "Slurred pairs, slow", look: "I/2's subject as Keller marks it: two notes joined, then apart. Land the second thumb before (or just as) the first lifts.", piece: "wtc1f02", voice: 1, fromBar: 1, toBar: 3, reading: "keller" },
  { id: "slur-fast", name: "Slurred pairs, fast", look: "II/12's opening: quick pairs under one slur. Watch NOT JOINED lines and the gaps they report.", piece: "wtc2f12", voice: 0, fromBar: 1, toBar: 6, reading: "bodky" },
  { id: "legato", name: "Legato line", look: "I/22's long notes in the old style: every note joined to the next, thumbs handing over.", piece: "wtc1f22", voice: 0, fromBar: 1, toBar: 5 },
  { id: "leaps", name: "Leaps", look: "I/20's subject: leaps of a fourth and more need a clear move the right way.", piece: "wtc1f20", voice: 1, fromBar: 1, toBar: 4 },
  { id: "ornaments", name: "Ornaments", look: "I/6's subject with its trill: touch the note, then shake the thumb up and down.", piece: "wtc1f06", voice: 0, fromBar: 1, toBar: 4 },
  { id: "repeats", name: "Repeated notes", look: "II/5's subject: the same note struck again, the thumb about level.", piece: "wtc2f05", voice: 2, fromBar: 1, toBar: 3 },
  { id: "staccato", name: "Staccato", look: "I/9's subject: short notes, lift quickly; see HELD and SHORT.", piece: "wtc1f09", voice: 1, fromBar: 1, toBar: 3 },
];

const ALL: TouchFugue[] = [...PIECES, ...TUTORIAL_PIECES];
const roman = (b: number) => (b === 1 ? "I" : b === 2 ? "II" : String(b));
export function pieceLabel(f: TouchFugue): string {
  if (f.id.startsWith("inv")) return `${f.title} (tutorial)`;
  return `${roman(f.book)}/${f.number} ${f.kind === "fugue" ? "fugue" : "prelude"} · ${keyName(f.key).toLowerCase()}`;
}

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const firstBar = (f: TouchFugue) => f.bars[0]?.n ?? 1;
const lastBar = (f: TouchFugue) => f.bars.at(-1)?.n ?? 1;

function sane(s: Partial<Setup>, platform: "mobile" | "computer"): Setup {
  const f = fugueById(s.piece ?? "wtc2f12");
  const piece = ALL.some((x) => x.id === s.piece) ? s.piece! : "wtc2f12";
  const voice = s.voice !== undefined && s.voice >= 0 && s.voice < f.voices.length ? s.voice : 0;
  const lo = firstBar(f);
  const hi = lastBar(f);
  const fromBar = Math.max(lo, Math.min(hi, s.fromBar ?? lo));
  const toBar = Math.max(fromBar, Math.min(hi, s.toBar ?? Math.min(hi, fromBar + 7)));
  return {
    piece,
    voice,
    fromBar,
    toBar,
    tempoPct: Math.max(50, Math.min(130, s.tempoPct ?? 100)),
    proto: s.proto === "keys" || s.proto === "ladder" ? s.proto : platform === "computer" ? "keys" : "ladder",
    wait: !!s.wait,
    bt: s.bt === "on" || s.bt === "off" ? s.bt : "auto",
    reading: s.reading !== undefined && (s.reading === "" || readingsOf(piece).some((r) => r.id === s.reading)) ? s.reading : (readingsOf(piece)[0]?.id ?? ""),
    sound: s.sound ?? "",
    loop: s.loop ?? true,
    traces: s.traces ?? true,
    feed: s.feed ?? true,
    feedBar: s.feedBar ?? false,
    lag: s.lag ?? null,
    drill: s.drill,
    mode: s.mode === "free" ? "free" : "passage",
    freeScale: s.freeScale === "chromatic" || s.freeScale === "keyboard" ? s.freeScale : "key",
    freeOctaves: s.freeOctaves === 1 || s.freeOctaves === 3 ? s.freeOctaves : 2,
    kbWhite: s.kbWhite === "piano" ? "piano" : "key",
    kbSplit: Math.max(0.3, Math.min(0.85, s.kbSplit ?? KB_DEFAULT.split)),
    kbBlack: Math.max(0.35, Math.min(0.9, s.kbBlack ?? KB_DEFAULT.black)),
    kbSlant: Math.max(0, Math.min(0.6, s.kbSlant ?? KB_DEFAULT.slant)),
    kbLabels: s.kbLabels ?? true,
    freeBpm: Math.max(40, Math.min(180, Math.round(s.freeBpm ?? 80))),
    click: !!s.click,
    sensePlay: !!s.sensePlay,
    senseSource: s.senseSource === "motion" ? "motion" : "size",
    dynMode: DYN_MODES.some(([m]) => m === s.dynMode) ? s.dynMode! : "off",
    dynAdaptive: s.dynAdaptive !== false,
  };
}

/** A saved run: its log and a line for the list. */
interface Saved {
  at: string;
  title: string;
  log: LabLog;
}

type Tab = "passage" | "free" | "breath" | "table" | "drills" | "mechanics" | "sensor" | "see" | "runs" | "study" | "help";

interface Trace {
  id: number;
  side: Side;
  pts: number[];
  end?: number;
  cancelled?: boolean;
  ink: string;
  label: string;
}

export function LabApp() {
  const [platform] = useState(detectedPlatform);
  const [setup, setSetupRaw] = useState<Setup>(() => {
    // D333: the page closed during a STUDY session: the owner's settings put back first.
    releaseSettings();
    const st = load<(Partial<Setup> & { mech?: Record<string, unknown>; mechBase?: string }) | null>(STORE, null);
    // D337: a setting kept before WTC 1.52 read against WTC 1.51's defaults (storedSetting).
    setMech(storedSetting(st, load<string | null>(CONFIG, null)).mech);
    return sane(st ?? {}, platform);
  });
  const [mechTick, setMechTick] = useState(0);
  const setSetup = (p: Partial<Setup>) =>
    setSetupRaw((cur) => {
      const next = sane({ ...cur, ...p }, platform);
      save(STORE, { ...next, mech: mechChanges(), mechBase: MECH_BASE });
      return next;
    });
  // D329: the CONFIG preset chosen (its parameters are MECH's; edited afterwards, it shows "(changed)").
  const [config, setConfig] = useState<string>(() => storedSetting(load(STORE, null), load<string | null>(CONFIG, null)).config);
  const configRef = useRef(config);
  configRef.current = config;
  const changeMech = (values: Partial<Record<MechKey, unknown>> | null) => {
    if (values === null) resetMech();
    else setMech(values);
    save(STORE, { ...setup, mech: mechChanges(), mechBase: MECH_BASE });
    if (values === null) {
      save(CONFIG, DEFAULT_CONFIG);
      setConfig(DEFAULT_CONFIG);
    }
    setMechTick((n) => n + 1);
  };
  const pickConfig = (id: string) => {
    const c = configById(id);
    if (!c) return;
    resetMech();
    setMech(c.values);
    save(STORE, { ...setup, mech: mechChanges(), mechBase: MECH_BASE });
    save(CONFIG, c.id);
    setConfig(c.id);
    setMechTick((n) => n + 1);
  };
  const f = fugueById(setup.piece);
  const reading: Reading | null = setup.reading ? (readingsOf(f.id).find((r) => r.id === setup.reading) ?? null) : null;
  const sound = setup.sound || PIECE_SOUND[f.id] || "chip";
  const bpm = Math.round(tempoOf(f.id) * setup.tempoPct) / 100;
  const proto = protoById(setup.proto);
  const span = passageSpan(f, setup);

  const [panel, setPanel] = useState<Tab | null>("passage");
  // D324: TABLE's settings, and its whole screen while it plays (TableStage.tsx).
  const [tableOpts, setTableOpts] = useState(loadTable);
  const [tableOn, setTableOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [, setFeedTick] = useState(0);
  const feed = useRef<string[]>([]);
  const [last, setLast] = useState<LabLog | null>(null);
  const [runs, setRuns] = useState<Saved[]>(() => load<Saved[]>(RUNS, []));
  const [note, setNote] = useState("");
  const [replayed, setReplayed] = useState<{ title: string; d: Diff; lines: string[] } | null>(null);

  useEffect(() => {
    setPreset(presetById(sound).id);
  }, [sound]);
  useEffect(() => {
    loadDrums();
    // The game's own page shows a LAB link in ⚙ from now on (play.html, D317).
    try {
      localStorage.setItem("tb-lab", "1");
    } catch {
      /* this visit */
    }
  }, []);

  // The box's range and marks, as play.html draws them (BenchApp).
  const range = useMemo(() => {
    const r = stepRange(f);
    return proto.id === "ladder" ? { lo: r.lo - 1, hi: r.hi + 1 } : r;
  }, [f, proto.id]);
  const marks = useMemo(() => {
    const spans = entrySpans(f).filter((e) => e.on < span.until && e.end > span.from);
    const cadences = (f.cadences ?? []).filter((c) => c.on >= span.from && c.on <= span.until).map((c) => ({ on: c.on, text: cadenceName(c) }));
    const ornaments = new Map([...ornamentsOf(f)].map(([k, o]) => [k, ornamentMark(o)]));
    const readingMarks = new Map<string, MarkNote>();
    if (reading) for (const e of f.entries) if (!e.theme && e.voice === setup.voice) e.notes.forEach(([on], j) => reading.notes[j] && readingMarks.set(`${e.voice}:${on}`, markOf(reading, j)!));
    return { ...subjectMarks(f), spans, names: f.voiceNames, cadences, ornaments, readingMarks };
  }, [f, span.from, span.until, reading?.id, setup.voice]);

  // D321: the motion sensor (SENSOR tab), kept for the visit; its taps go into the sensor log and the runs' logs.
  const hub = useRef<MotionHub>(null as unknown as MotionHub);
  hub.current ??= new MotionHub(VERSION);
  // D336: the strike's references (one calibration, adapting to the recent strikes), kept for the visit.
  const adapt = useRef<AdaptiveCal>(null as unknown as AdaptiveCal);
  adapt.current ??= new AdaptiveCal(loadDynCal(), setup.dynAdaptive);
  adapt.current.on = setup.dynAdaptive;
  /** D336: the adaptive references kept on the device (the next session starts from them). */
  const keepRefs = () => {
    const r = adapt.current.refs();
    if (r.from === "adaptive") saveDynCal(r);
  };
  /** D335/D336: the strike's peak after a landing (the motion sensor; null when it is off). */
  const strikeReader = (): StrikeReader | null => {
    const h = hub.current;
    if (!h.live) return null;
    return (ts, zone, waitMs, done) => {
      const now = performance.now();
      const t = Number.isFinite(ts) && ts <= now + 50 && ts > now - 10000 ? ts : now;
      h.measure(t, "play", { t, ...(zone ? { zone } : {}) }, (rec) => done(rec.peak), Math.min(MECH.tapWindowMs, waitMs), waitMs);
    };
  };
  useEffect(() => () => hub.current.stop(), []);
  // D321: every contact on the page (capture phase, before the play area): its size for PLAY WITH IT by
  // contact size, and (playing so in FREE PLAY) each touch kept as a "play" tap in the sensor log. The
  // SENSOR tab's pad handles its own.
  useEffect(() => {
    const h = hub.current;
    const mine = (e: PointerEvent) => e.target instanceof Element && !!e.target.closest("#lab-pad");
    const taps = new Map<number, TouchInfo>();
    const onDown = (e: PointerEvent) => {
      if (mine(e)) return;
      const info = h.pointerDown(e);
      const s = setupRef.current;
      if (free.current && s.sensePlay && s.senseSource === "size") (taps.set(e.pointerId, info), h.measure(info.t, "play", info));
    };
    const onMove = (e: PointerEvent) => !mine(e) && h.pointerMove(e, taps.get(e.pointerId));
    const onUp = (e: PointerEvent) => {
      if (mine(e)) return;
      h.pointerUp(e, taps.get(e.pointerId));
      taps.delete(e.pointerId);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
  }, []);

  const chip = useRef<Chip | null>(null);
  const ensureChip = (): Chip => {
    if (!chip.current) chip.current = new Chip();
    chip.current.lag = setup.lag;
    void chip.current.resume();
    return chip.current;
  };
  useEffect(() => {
    if (chip.current) chip.current.lag = setup.lag;
  }, [setup.lag]);

  const frame = useRef<Frame>(preview());
  function preview(): Frame {
    const b = beatOf(f);
    return {
      now: span.from - b.ticks,
      tps: 1,
      key: keyAt(f, span.from),
      barTicks: f.barTicks,
      beatTicks: b.ticks,
      count: f.voices.length,
      lo: range.lo,
      hi: range.hi,
      ...(proto.id === "ladder" ? { spill: stepRange(f) } : {}),
      voice: setup.voice,
      notes: laneNotes(f.voices[setup.voice].filter(([on]) => on >= span.from && on < span.until), b.ticks, setup.voice),
      others: accompaniment(f, span.from, setup.voice).filter((n) => (n.band || n.voice !== setup.voice) && n.on < span.until),
      ...marks,
      piece: f.id,
    };
  }
  useEffect(() => {
    if (!playing) frame.current = preview();
  }, [setup, playing, marks]);

  /** The box's rows in the play area's coordinates (BenchApp boxRows), and their (y0, rowH) for the log. */
  function boxRows(now: number) {
    const roll = document.querySelector(".tg-roll");
    const area = document.querySelector(".tg-play");
    if (!roll || !area) return null;
    const r = roll.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    const geo = uiRows(f.id, setup.voice, range, r.height) ?? ladderGeometry(range.lo, range.hi, r.height);
    const y0 = r.top - a.top + geo.yOf(0);
    const spanT = 3 * f.barTicks;
    return { y0, rowH: geo.rowH, rows: { yOf: (step: number) => y0 - step * geo.rowH, stepAt: (y: number) => Math.round((y0 - y) / geo.rowH), rowH: geo.rowH, xOf: (tick: number) => r.left - a.left + ((tick - (now - 0.25 * spanT)) / spanT) * r.width } };
  }

  // The thumbs' traces (play-area px), drawn over the game.
  const traces = useRef<Trace[]>([]);
  const touching = useRef<number | null>(null);
  const paint = useRef<Painter | null>(null);
  const drawTraces = (ctx: CanvasRenderingContext2D) => {
    if (!setupRef.current.traces) return;
    const now = performance.now();
    traces.current = traces.current.filter((t) => t.end === undefined || now - t.end < TRACE_FADE_MS);
    for (const t of traces.current) {
      const alpha = t.end === undefined ? 1 : Math.max(0, 1 - (now - t.end) / TRACE_FADE_MS);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = t.ink;
      ctx.fillStyle = t.ink;
      ctx.lineWidth = 2;
      const [x0, y0] = t.pts;
      ctx.beginPath();
      ctx.arc(x0, y0, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let i = 2; i < t.pts.length; i += 2) ctx.lineTo(t.pts[i], t.pts[i + 1]);
      ctx.stroke();
      if (t.end !== undefined && t.pts.length >= 2) {
        const xe = t.pts[t.pts.length - 2];
        const ye = t.pts[t.pts.length - 1];
        ctx.beginPath();
        ctx.moveTo(xe - 5, ye - 5);
        ctx.lineTo(xe + 5, ye + 5);
        ctx.moveTo(xe + 5, ye - 5);
        ctx.lineTo(xe - 5, ye + 5);
        ctx.stroke();
      }
      ctx.font = "10px ui-monospace, Menlo, monospace";
      ctx.textAlign = t.side === "left" ? "left" : "right";
      ctx.fillText(`${t.label}${t.cancelled ? " CANCEL" : ""}`, x0 + (t.side === "left" ? 13 : -13), y0 - 11);
      ctx.restore();
    }
  };
  const idlePaint: Painter = (ctx) => drawTraces(ctx);
  paint.current ??= idlePaint;
  const setupRef = useRef(setup);
  setupRef.current = setup;

  const onEvent = (e: LabEvent) => {
    const lines = describe(f.id, e);
    feed.current.push(...lines);
    if (feed.current.length > FEED_KEPT) feed.current.splice(0, feed.current.length - FEED_KEPT);
    setFeedTick((n) => n + 1);
    // The trace of the touch being handled takes the verdict's colour and note.
    const t = touching.current !== null ? traces.current.find((x) => x.id === touching.current) : undefined;
    if (!t) return;
    if (e.kind === "note") (t.ink = e.ok ? "#8fe3b0" : "#ff6b6b"), (t.label = `${lines[0].split(" ")[2] ?? ""} ${e.ok ? "✓" : "✕"}`);
    else if (e.kind === "stray") (t.ink = "#ffb36b"), (t.label = "STRAY");
    else if (e.kind === "double") (t.ink = "#7d84b3"), (t.label = "DOUBLE");
    else if (e.kind === "slide") t.label += " SLIDE";
    else if (e.kind === "drag") t.label += ` ${e.how.toUpperCase()}`;
    else if (e.kind === "shake") t.label += ` ${e.ornament.toUpperCase()}`;
  };

  // The run under way.
  const run = useRef<{ g: ProtoGame; rec: LabRecorder; raf: number; study?: { listen: boolean } } | null>(null);
  const count = useRef<HTMLDivElement>(null);
  const stopRun = (keep: boolean) => {
    const r = run.current;
    if (!r) return;
    cancelAnimationFrame(r.raf);
    r.g.stopAll();
    run.current = null;
    paint.current = idlePaint;
    if (count.current) count.current.textContent = "";
    if (keep) finishRun(r.rec, true, r.study);
  };
  const finishRun = (rec: LabRecorder, stopped = false, forStudy?: { listen: boolean }) => {
    const log = rec.finish(stopped);
    keepRefs();
    // D333: a STUDY take (or its HEAR IT FIRST) goes to the study, not to RUNS.
    if (forStudy) {
      if (!stopped) studyRef.current.ended(log, forStudy.listen);
      return;
    }
    // D321: the sensor session (if any taps were measured) travels with the run's log.
    if (hub.current.taps.length) log.sensor = sensorExport(hub.current, adapt.current);
    const t = tally(log.verdicts);
    feed.current.push(`— RUN OVER: right ${t.right} · wrong ${t.wrong} · missed ${t.missed} · stray ${t.stray} · joined ${t.joined} of ${t.joined + t.notJoined} · slides ${t.slides} · ${timingLine(log.verdicts)}`);
    setFeedTick((n) => n + 1);
    setLast(log);
    // D320: every run kept on the device by itself, the newest 20 (the oldest overwritten).
    keep(log);
  };
  const begin = (forStudy?: { listen: boolean }) => {
    stopRun(false);
    stopFree();
    const ch = ensureChip();
    const s = setupRef.current;
    const ff = fugueById(s.piece);
    const pp = protoById(s.proto);
    const passage: LabPassage = { piece: s.piece, voice: s.voice, fromBar: s.fromBar, toBar: s.toBar, bpm, tempoPct: s.tempoPct, proto: s.proto, wait: s.wait, bt: btOn(s.bt, ch.lag, latencyOf(ch.ctx)), reading: s.reading || null, sound, loop: s.loop, ...(s.drill ? { drill: s.drill } : {}) };
    const g = labGame(passage, ch, forStudy?.listen ? { demo: true } : undefined);
    const area = document.querySelector(".tg-play")?.getBoundingClientRect();
    const br = pp.layout === "bars" ? boxRows(g.now) : null;
    if (br) g.rows = br.rows;
    const lat = ch.ctx as AudioContext & { outputLatency?: number };
    const rec = new LabRecorder(
      g,
      () => ch.heard(),
      {
        app: VERSION,
        at: new Date().toISOString(),
        passage,
        device: { w: screen.width, h: screen.height, dpr: devicePixelRatio || 1, ua: navigator.userAgent, outputLatency: lat.outputLatency, baseLatency: lat.baseLatency, lag: ch.lag, platform },
        area: { w: Math.round(area?.width ?? 0), h: Math.round(area?.height ?? 0) },
        rows: br ? { y0: br.y0, rowH: br.rowH } : null,
        preset: configLabel(configRef.current),
      },
      onEvent,
    );
    // D336: DYNAMICS on the player's own notes (the sampled piano; never in a STUDY, never in BLUETOOTH MODE): the sound only.
    const dynOn = !forStudy && s.dynMode !== "off" && presetById(sound).id === "pianoSampled" && !passage.bt;
    let dynHead = "";
    if (dynOn) {
      const pd = new PassageDynamics({
        mode: s.dynMode,
        adapt: adapt.current,
        read: strikeReader(),
        name: (m) => pitchName(ff.id, m),
        audioNow: () => ch.ctx.currentTime,
        say: (l) => {
          if (run.current?.rec !== rec) return;
          feed.current.push(l);
          if (feed.current.length > FEED_KEPT) feed.current.splice(0, feed.current.length - FEED_KEPT);
          rec.log.dynamics?.lines.push(l);
          setFeedTick((n) => n + 1);
        },
      });
      g.noteDyn = pd.ask;
      const refs = adapt.current.refs();
      rec.log.dynamics = { mode: s.dynMode, adaptive: s.dynAdaptive, refs, lines: [] };
      dynHead = ` · DYNAMICS ${DYN_MODES.find(([m]) => m === s.dynMode)![1]} · refs ${refsText(refs)}${s.dynAdaptive ? "" : " (adaptive off)"}${hub.current.live ? "" : " · the motion sensor is off (SENSOR › START SENSOR): the strike stays neutral"}`;
    } else if (!forStudy && s.dynMode !== "off") dynHead = ` · DYNAMICS off here (${passage.bt ? "BLUETOOTH MODE" : "the sampled piano only"})`;
    feed.current.push(`— ${pieceLabel(ff)} · ${ff.voiceNames[s.voice]} · bars ${s.fromBar}–${s.toBar} · ♩ ${Math.round(bpm)} (${s.tempoPct}%)${passage.bt ? " · BLUETOOTH" : ""}${s.wait ? " · WAITING" : ""}${MECH.bandTime !== "fixed" ? ` · BAND ${MECH.bandTime.toUpperCase()}${g.bandT ? "" : " (off here)"}` : ""}${configLabel(configRef.current) ? ` · CONFIG ${configById(configRef.current)?.name}${configEdits(configById(configRef.current)!).length ? " (changed)" : ""}` : ""}${Object.keys(mechChanges()).length ? ` · ${Object.keys(mechChanges()).length} parameters changed` : ""}${dynHead}`);
    setFeedTick((n) => n + 1);
    paint.current = (ctx, w, h) => {
      g.view(() => paintProto(ctx, w, h, g, marks.subject));
      drawTraces(ctx);
    };
    const b = beatOf(ff);
    const r = { g, rec, raf: 0, study: forStudy };
    run.current = r;
    // For checks driven from outside (a browser test): the run under way.
    (globalThis as { __lab?: unknown }).__lab = r;
    const loop = () => {
      if (run.current !== r) return;
      rec.frame();
      const done = g.step();
      frame.current = {
        now: g.viewNow,
        tps: g.tps,
        key: g.keyNow(),
        barTicks: ff.barTicks,
        beatTicks: b.ticks,
        count: ff.voices.length,
        lo: range.lo,
        hi: range.hi,
        ...(pp.id === "ladder" ? { spill: stepRange(ff) } : {}),
        voice: s.voice,
        notes: g.notes,
        others: g.others,
        ...marks,
        piece: ff.id,
        marks: g.marks,
        entryState: new Map(g.entries.map((e) => [`${e.voice}:${e.on}`, e.state])),
        bossFight: false,
        pops: g.pops,
        bursts: g.bursts,
        performed: g.overlay(),
        zone: g.zone,
      };
      if (pp.layout === "bars") {
        const nb = boxRows(g.now);
        if (nb) (g.rows = nb.rows), rec.rows(nb.y0, nb.rowH);
      }
      if (count.current) count.current.textContent = g.countIn() ? String(g.countIn()) : "";
      if (done) {
        run.current = null;
        paint.current = idlePaint;
        if (count.current) count.current.textContent = "";
        finishRun(rec, false, forStudy);
        if (!forStudy && setupRef.current.loop && !setupRef.current.wait) begin();
        else setPlaying(false);
        return;
      }
      r.raf = requestAnimationFrame(loop);
    };
    r.raf = requestAnimationFrame(loop);
    setPlaying(true);
  };
  // D320: FREE PLAY under way (free.ts): no score, the bars play the sound chosen.
  const free = useRef<{ fp: FreePlay; raf: number } | null>(null);
  const stopFree = () => {
    const fr = free.current;
    if (!fr) return;
    cancelAnimationFrame(fr.raf);
    fr.fp.stop();
    free.current = null;
    keepRefs();
    paint.current = idlePaint;
    feed.current.push("— FREE PLAY OVER");
    setFeedTick((n) => n + 1);
  };
  const beginFree = () => {
    stopRun(false);
    stopFree();
    const ch = ensureChip();
    const s = setupRef.current;
    const ff = fugueById(s.piece);
    // D321, PLAY WITH IT: each touch's strength from the motion sensor's spike (sensor.ts).
    const h = hub.current;
    const calName = (c: { from: string } | null) => (c ? (c.from === "session" ? "learned on this device" : "the recent taps' calibration") : "");
    const sense: FreeOptions["sense"] = s.sensePlay
      ? {
          source: s.senseSource,
          motion: (ts, waitMs, done) => {
            const t = stampOf(ts, performance.now());
            h.measure(
              t,
              "play",
              { t },
              (rec) => {
                const cal = h.calibration("motion");
                done({ peak: rec.peak, strength: rec.peak !== null && cal ? strengthFrom(rec.peak, cal) : null, cal: calName(cal) });
              },
              MECH.tapWindowMs,
              waitMs,
            );
          },
          size: (id) => {
            const c = h.contacts.get(id);
            const size = c?.size ?? null;
            const cal = h.calibration("size");
            return { size, strength: size !== null && cal ? strengthFrom(size, cal) : null, cal: calName(cal) };
          },
        }
      : undefined;
    const kb = { white: s.kbWhite, shape: { split: s.kbSplit, black: s.kbBlack, slant: s.kbSlant }, labels: s.kbLabels };
    // D335, DYNAMICS: the strike's peak (the motion sensor); D336: its strength by the one calibration, adapting (adapt).
    // D336: one calibration for the bar (inner and outer read alike), adapting to the recent strikes.
    const dynamics: FreeOptions["dynamics"] =
      s.dynMode === "off"
        ? undefined
        : {
            mode: s.dynMode,
            strike: (ts, zone, waitMs, done) => {
              const t = stampOf(ts, performance.now());
              h.measure(
                t,
                "play",
                { t, zone },
                (rec) => {
                  const refs = adapt.current.refs();
                  adapt.current.add(rec.peak);
                  done({ peak: rec.peak, strength: rec.peak === null ? null : logStrength(rec.peak, refs), cal: `refs ${refs.soft.toFixed(2)}/${refs.hard.toFixed(2)}` });
                },
                Math.min(MECH.tapWindowMs, waitMs),
                waitMs,
              );
            },
          };
    const fp = new FreePlay(ff, s.voice, ch, { scale: s.freeScale, octaves: s.freeOctaves, bpm: s.freeBpm, click: s.click, sense, kb, dynamics }, (l) => {
      feed.current.push(l);
      if (feed.current.length > FEED_KEPT) feed.current.splice(0, feed.current.length - FEED_KEPT);
      setFeedTick((n) => n + 1);
    });
    const fr = { fp, raf: 0 };
    free.current = fr;
    // For checks driven from outside (a browser test).
    (globalThis as { __labFree?: unknown }).__labFree = fp;
    const changes = Object.keys(mechChanges()).length;
    if (s.dynMode !== "off") feed.current.push(sound !== "pianoSampled" ? "— DYNAMICS: the sampled piano only (PIANO (SAMPLED)): off for this sound" : `— DYNAMICS ${DYN_MODES.find(([m]) => m === s.dynMode)![1]}${h.live ? "" : " · the motion sensor is off (SENSOR › START SENSOR): the strike stays neutral"} · refs ${refsText(adapt.current.refs())}${s.dynAdaptive ? "" : " (adaptive off)"}${MECH.dynWait ? ` · the attack waits for the strike (≤ ${MECH.dynWaitMs} ms)` : ` · corrected over ${MECH.dynRampMs} ms`}`);
    if (s.sensePlay && !h.live) feed.current.push(h.permission === "unasked" ? "— PLAY WITH IT is on but the sensor is off: SENSOR › START SENSOR first" : "— PLAY WITH IT: no motion samples (no sensor here, or access denied): attacks stay neutral");
    feed.current.push(`— FREE PLAY · ${keyName(ff.key)} · ${s.freeScale === "key" ? "the key's notes" : s.freeScale === "keyboard" ? `KEYBOARD (white keys ${s.kbWhite === "piano" ? "PIANO" : "IN THE KEY"}: ${whiteNames(ff, fp.whites, s.kbWhite)}; split ${s.kbSplit.toFixed(2)}, black ${s.kbBlack.toFixed(2)}, slant ${s.kbSlant.toFixed(2)})` : "chromatic"} · ${fp.name(fp.rows[0])}–${fp.name(fp.rows.at(-1)!)} · ${presetById(sound).name}${s.click ? ` · click ♩ ${s.freeBpm}` : ""}${s.sensePlay ? " · PLAY WITH IT (tap strength)" : ""}${MECH.dragMeaning === "connect" ? " · DRAG: CONNECT" : ""}${changes ? ` · ${changes} parameters changed` : ""}`);
    setFeedTick((n) => n + 1);
    frame.current = { ...preview(), notes: [], others: [], spans: [], cadences: [], entries: [], subject: undefined, ornaments: undefined, readingMarks: undefined };
    paint.current = (ctx, w, h) => {
      fp.paint(ctx, w, h);
      drawTraces(ctx);
    };
    const loop = () => {
      if (free.current !== fr) return;
      fp.frame();
      fr.raf = requestAnimationFrame(loop);
    };
    fr.raf = requestAnimationFrame(loop);
    setPlaying(true);
  };
  // D323: BREATH under way (breath.ts): the thumbs finger, the microphone's breath sounds.
  const breath = useRef<BreathPlay | null>(null);
  const stopBreath = () => {
    const bp = breath.current;
    if (!bp) return;
    breath.current = null;
    bp.stop();
    paint.current = idlePaint;
    feed.current.push("— BREATH OVER");
    setFeedTick((n) => n + 1);
  };
  const startBreath = async () => {
    stopRun(false);
    stopFree();
    stopBreath();
    setPanel(null);
    setNote("");
    const ch = ensureChip();
    await ch.resume().catch(() => {});
    const mic = await openBreathMic(ch);
    if (mic.state !== "on") {
      setPanel("breath");
      setNote(micProblem(mic));
      return;
    }
    const s = setupRef.current;
    const ff = fugueById(s.piece);
    const b = loadBreath();
    const sp = passageSpan(ff, s);
    const bp = new BreathPlay(ff, s.voice, ch, mic, { kind: b.kind, pitch: b.pitch, scale: s.freeScale, octaves: s.freeOctaves, rise: b.rise, from: sp.from, until: sp.until }, (l) => {
      feed.current.push(l);
      if (feed.current.length > FEED_KEPT) feed.current.splice(0, feed.current.length - FEED_KEPT);
      setFeedTick((n) => n + 1);
    });
    breath.current = bp;
    (globalThis as { __labBreath?: unknown }).__labBreath = bp;
    feed.current.push(`— BREATH · ${bp.voice.spec.name} · ${b.pitch === "rows" ? `rows ${bp.name(bp.rows[0])}–${bp.name(bp.rows.at(-1)!)}` : `${ff.voiceNames[s.voice] ?? ""}'s ${bp.notes.length} notes, bars ${s.fromBar}–${s.toBar}`} · mic ${mic.path}`);
    setFeedTick((n) => n + 1);
    frame.current = { ...preview(), notes: [], others: [], spans: [], cadences: [], entries: [], subject: undefined, ornaments: undefined, readingMarks: undefined };
    paint.current = (ctx, w, h) => {
      bp.paint(ctx, w, h);
      drawTraces(ctx);
    };
    setPlaying(true);
  };
  const start = (mode: Setup["mode"] = setupRef.current.mode, forStudy?: { listen: boolean }) => {
    stopBreath();
    const ch = ensureChip();
    setPanel(null);
    setNote("");
    if (mode !== setupRef.current.mode) {
      setSetup({ mode });
      setupRef.current = { ...setupRef.current, mode };
    }
    if (mode === "free") {
      const cur = setupRef.current;
      const cf = fugueById(cur.piece);
      const rows = freeRows(cf, cur.voice, cur.freeScale, cur.freeOctaves, whitePcs(cf, cur.voice, cur.kbWhite));
      const go = () => void ch.prepare(rows, rows).finally(() => beginFree());
      if (ch.ctx.state === "running") return go();
      ch.resume()
        .then(() => (ch.ctx.state === "running" ? go() : setNote("The sound is still off: tap START once more.")))
        .catch(() => setNote("The sound is still off: tap START once more."));
      return;
    }
    const go = () => {
      void ch.prepare(everyNote(f).map((n) => n[2]), (f.voices[setup.voice] ?? []).map((n) => n[2])).finally(() => begin(forStudy));
    };
    if (ch.ctx.state === "running") return go();
    ch.resume()
      .then(() => (ch.ctx.state === "running" ? go() : setNote("The sound is still off: tap START once more.")))
      .catch(() => setNote("The sound is still off: tap START once more."));
  };
  const stop = () => {
    // D333: during a STUDY, STOP (and Escape) pause it: the take under way is discarded.
    if (studyRef.current.active) return studyRef.current.pause();
    stopRun(true);
    stopFree();
    stopBreath();
    setPlaying(false);
  };
  useEffect(
    () => () => {
      stopRun(false);
      stopFree();
      stopBreath();
    },
    [],
  );

  // D333, STUDY (StudyTab.tsx): its settings applied in memory (the owner's put back after), each take a run.
  const [studyGo, setStudyGo] = useState<{ listen: boolean } | null>(null);
  const studyHost: StudyHost = {
    unlock: () => void ensureChip(),
    play: (it, mech, presetId, listen) => {
      holdSettings([STORE, CONFIG]);
      resetMech();
      setMech(mech);
      setMechTick((n) => n + 1);
      configRef.current = presetId;
      setConfig(presetId);
      setSetupRaw((cur) => sane({ ...cur, piece: it.piece, voice: it.voice, fromBar: it.fromBar, toBar: it.toBar, tempoPct: 100, proto: "ladder", wait: false, bt: "off", reading: "", sound: STUDY_SOUND, loop: false, drill: undefined, mode: "passage", dynMode: "off" }, platform));
      setStudyGo({ listen });
    },
    halt: () => {
      stopRun(false);
      setPlaying(false);
    },
    restore: () => {
      if (!releaseSettings()) return;
      const st = load<(Partial<Setup> & { mech?: Record<string, unknown>; mechBase?: string }) | null>(STORE, null);
      const kept = storedSetting(st, load<string | null>(CONFIG, null));
      resetMech();
      setMech(kept.mech);
      setSetupRaw(sane(st ?? {}, platform));
      setConfig(kept.config);
      setMechTick((n) => n + 1);
    },
    show: (open) => setPanel(open ? "study" : null),
  };
  const study = useStudy(studyHost, VERSION, tempoOf);
  const studyRef = useRef(study);
  studyRef.current = study;
  useEffect(() => {
    if (studyGo) start("passage", studyGo);
  }, [studyGo]);

  // Touches: recorded and handed to the game; their traces kept.
  const events: ThumbEvents = {
    down: (id, side, x, y, w, h, ts) => {
      traces.current.push({ id, side, pts: [x, y], ink: "#ecead9", label: "" });
      if (traces.current.length > 16) traces.current.shift();
      if (breath.current) {
        breath.current.down(id, side, x, y, w, h);
        traces.current.at(-1)!.ink = "#ffd23f";
        return;
      }
      const fr = free.current;
      if (fr) {
        fr.fp.down(id, side, x, y, w, h, ts);
        const t = traces.current.at(-1)!;
        t.ink = "#ffd23f";
        t.label = fr.fp.name(fr.fp.pitchAt(x, y, w, h));
        return;
      }
      const r = run.current;
      if (!r) return;
      touching.current = id;
      r.rec.down(id, side, x, y, w, h, ts);
      touching.current = null;
    },
    move: (id, x, y, w, h, ts) => {
      const t = traces.current.find((q) => q.id === id && q.end === undefined);
      if (t && t.pts.length < 400) t.pts.push(x, y);
      if (breath.current) return breath.current.move(id, x, y, w, h);
      if (free.current) return free.current.fp.move(id, x, y, w, h, ts);
      const r = run.current;
      if (!r) return;
      touching.current = id;
      r.rec.move(id, x, y, w, h, ts);
      touching.current = null;
    },
    up: (id, ts, cancelled) => {
      const t = traces.current.find((q) => q.id === id && q.end === undefined);
      if (t) (t.end = performance.now()), (t.cancelled = !!cancelled);
      if (breath.current) return breath.current.up(id);
      if (free.current) return free.current.fp.up(id, ts, !!cancelled);
      const r = run.current;
      if (!r) return;
      touching.current = id;
      r.rec.up(id, ts, !!cancelled);
      touching.current = null;
    },
  };

  // A computer's keys (KEYS): the game's rows of keys; Escape stops; Space starts when stopped.
  useEffect(() => {
    const press = (e: KeyboardEvent): KeyPress | null => {
      if (e.code === "Space") return { velocity: 0.5, code: "Space" };
      const r = keyRow(e.code);
      return r < 0 ? null : { velocity: KEY_ROWS[r].dyn, trill: KEY_ROWS[r].trill, code: e.code };
    };
    const tgt = (e: KeyboardEvent) => (e.target instanceof Element ? e.target.closest("input, select, textarea, button") : null);
    const down = (e: KeyboardEvent) => {
      if (tgt(e)) return;
      if (e.code === "Escape" && (run.current || free.current || breath.current)) return stop();
      const r = run.current;
      if (free.current || breath.current) return;
      if (!r) {
        if ((e.code === "Enter" || e.code === "Space") && !panel) (e.preventDefault(), start());
        return;
      }
      if (setupRef.current.proto !== "keys") return;
      const k = press(e);
      if (!k) return;
      e.preventDefault();
      if (e.repeat) return;
      r.g.keysDown.add(e.code);
      r.rec.keyDown(keyId(e.keyCode), k, e.timeStamp);
    };
    const up = (e: KeyboardEvent) => {
      const r = run.current;
      if (!r || setupRef.current.proto !== "keys") return;
      r.g.keysDown.delete(e.code);
      r.rec.keyUp(keyId(e.keyCode), e.timeStamp);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  // RUNS: copy, share, keep, replay.
  const runTitle = (log: LabLog) => {
    const t = tally(log.verdicts);
    const p = log.passage;
    const ch = Object.keys(mechChanges(asRecorded(log.mech) as Partial<Mech>)).length;
    return `${pieceLabel(fugueById(p.piece))} · bars ${p.fromBar}–${p.toBar} · ${p.tempoPct}% · ${t.right}/${t.right + t.wrong + t.missed} right · ${t.joined} joined · ${timingLine(log.verdicts, true)}${ch ? ` · ${ch} changed` : ""}`;
  };
  const keep = (log: LabLog) => {
    // D320: saved as each run ends (from the stored list, not this render's: the run loop's closure is old).
    const stored = load<Saved[]>(RUNS, []);
    let next = [{ at: log.at, title: runTitle(log), log }, ...stored.filter((r) => r.at !== log.at)].slice(0, MAX_RUNS);
    // Too much for the device's storage: the oldest go first.
    while (next.length && !save(RUNS, next)) next = next.slice(0, -1);
    setRuns(next);
    if (!next.some((r) => r.at === log.at)) setNote("Could not save the run: the device's storage is full.");
  };
  const copy = (log: LabLog) => {
    const text = `WTC LAB LOG · ${runTitle(log)}\n${logText(log)}`;
    const done = () => setNote("Log copied. Paste it in a message to the developer.");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => window.prompt("Copy the log:", text));
    else window.prompt("Copy the log:", text);
  };
  /** D321: the sensor session as text for the lead (its taps, the separation, every tap's raw samples). */
  const copySensor = () => {
    const x = sensorExport(hub.current, adapt.current);
    const sep = x.sep ? ` · AUC ${x.sep.auc.toFixed(2)} (${x.sep.verdict})` : "";
    const text = `WTC LAB SENSOR LOG · ${x.taps.length} taps${sep} · ${x.permission}\n${JSON.stringify(x)}`;
    const done = () => setNote("Sensor log copied. Paste it in a message to the developer.");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => window.prompt("Copy the sensor log:", text));
    else window.prompt("Copy the sensor log:", text);
  };
  const share = (log: LabLog) => {
    const text = logText(log);
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const file = typeof File !== "undefined" ? new File([text], `wtc-lab-${log.passage.piece}-${log.at.replace(/[:.]/g, "-")}.json`, { type: "application/json" }) : null;
    if (file && nav.canShare?.({ files: [file] })) return void nav.share({ files: [file], title: "WTC lab log", text: runTitle(log) }).catch(() => {});
    if (nav.share) return void nav.share({ title: "WTC lab log", text: `WTC LAB LOG · ${runTitle(log)}\n${text}` }).catch(() => {});
    copy(log);
  };
  const doReplay = (log: LabLog) => {
    const r = replay(log, { ...MECH });
    const d = diff(log, log.verdicts, r.events, r.mech);
    setReplayed({ title: runTitle(log), d, lines: r.events.flatMap((e) => describe(log.passage.piece, e)) });
    setPanel("runs");
  };
  const [paste, setPaste] = useState("");

  const changed = Object.keys(mechChanges()).length;
  const voices = voicesFrom(f, span.from);
  const freeOn = setup.mode === "free";
  const hudTitle = freeOn
    ? `LAB · FREE PLAY · ${keyName(f.key)} · ${f.voiceNames[setup.voice] ?? ""} · ${setup.freeScale === "key" ? "key" : setup.freeScale === "keyboard" ? `keyboard (${setup.kbWhite === "piano" ? "piano" : "in the key"})` : "chromatic"} · ${setup.freeOctaves} oct`
    : `LAB · ${pieceLabel(f)} · ${f.voiceNames[setup.voice] ?? ""} · b${setup.fromBar}–${setup.toBar} · ${setup.tempoPct}%`;
  // D320: lines over the box only in FREE PLAY (nothing to follow there); while a passage plays, at most the latest in the title bar.
  const breathOn = !!breath.current;
  const shown = (freeOn || breathOn) && playing ? feed.current.slice(-FEED_SHOWN) : [];
  const barLine = !freeOn && playing && setup.feedBar ? feed.current.at(-1) : undefined;
  void mechTick;

  // The panel's START: FREE PLAY from its tab, the passage from PASSAGE and DRILLS, else what was played last.
  const startMode: Setup["mode"] = panel === "free" ? "free" : panel === "passage" || panel === "drills" ? "passage" : setup.mode;

  return (
    <div className={`tg-app tg-wide lab-app tb-proto-${proto.id}${proto.layout === "bars" ? " tb-bars" : ""}`}>
      <MusicBox
        frame={frame}
        hud={
          <>
            {barLine ? (
              <span className={`tg-hud-title lab-barline ${lineClass(barLine)}`} id="lab-barline">
                {barLine}
              </span>
            ) : (
              <span className="tg-hud-title">{study.active ? `STUDY · ${study.progress}` : hudTitle}</span>
            )}
            {/* D322: the stops for the voice played (kept per piece, as in the game). */}
            {hasStops(presetById(sound).id) && <RegistrationStops presetId={presetById(sound).id} patch={voicePatch(sound, setup.voice, f.voices.length)} piece={f.id} />}
            {changed > 0 && (
              <button type="button" className="lab-badge" onClick={() => setPanel("mechanics")} title="Parameters changed from the game's">
                {changed} CHANGED
              </button>
            )}
            <button type="button" id="lab-go" className="lab-hud-btn" onClick={study.active ? study.pause : playing ? stop : () => start()}>
              {study.active ? "❚❚ PAUSE" : playing ? "■ STOP" : "▶ START"}
            </button>
            <button type="button" id="lab-open" className="lab-hud-btn" onClick={() => setPanel(panel ? null : "passage")}>
              LAB
            </button>
          </>
        }
        legend={f.voiceNames.map((name, i) => (
          <span key={name} style={{ color: inkOf(i, f.voices.length), opacity: i === setup.voice ? 1 : 0.55 }}>
            ■ {name}
            {i === setup.voice && <b className="tb-you"> · YOU</b>}
          </span>
        ))}
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        <StudyCard st={study} />
        {setup.feed && (freeOn || breathOn) && shown.length > 0 && (
          <div className="lab-feed" aria-live="polite">
            {shown.map((l, i) => (
              <p key={feed.current.length - shown.length + i} className={lineClass(l)}>
                {l}
              </p>
            ))}
          </div>
        )}
      </MusicBox>
      <PlayArea events={events} paint={paint} hint="" />
      {tableOn && (
        <TableStage
          f={f}
          voice={setup.voice}
          chip={chip.current ?? ensureChip()}
          o={tableOpts}
          line={(l) => {
            feed.current.push(l);
            if (feed.current.length > FEED_KEPT) feed.current.splice(0, feed.current.length - FEED_KEPT);
            setFeedTick((n) => n + 1);
          }}
          close={() => (setTableOn(false), setPanel("table"))}
        />
      )}
      {panel && (
        <div className="lab-panel" role="dialog" aria-label="Lab">
          <header className="lab-tabs">
            {/* D376: THE EXPRESSION LAB: the game's selection screen (lab.html?glenn=1). D378: Glenn's mechanics the
                game's; the same page with the old ones, MECHANICS: CLASSIC (lab.html?glenn=0), for comparison. */}
            <a className="lab-glenn" id="lab-glenn" href="?glenn=1">
              PLAY ALL PIECES
            </a>
            <a className="lab-glenn" id="lab-classic" href="?glenn=0">
              MECHANICS: CLASSIC
            </a>
            {(["passage", "free", "breath", "table", "drills", "mechanics", "sensor", "see", "runs", "study", "help"] as Tab[]).map((t) => (
              <button key={t} type="button" id={`lab-tab-${t}`} className={t === panel ? "on" : ""} onClick={() => setPanel(t)}>
                {t === "see" ? "WHAT HAPPENED" : t === "free" ? "FREE PLAY" : t.toUpperCase()}
              </button>
            ))}
            {panel === "study" ? null : panel === "breath" ? (
              <button type="button" className="lab-start" id="lab-start" onClick={() => void startBreath()}>
                ▶ PLAY BREATH
              </button>
            ) : (
              <button type="button" className="lab-start" id="lab-start" onClick={() => start(startMode)}>
                ▶ {startMode === "free" ? "PLAY FREELY" : "START"}
              </button>
            )}
            <button type="button" className="tg-x" aria-label="Close" onClick={() => setPanel(null)}>
              ✕
            </button>
          </header>
          {note && <p className="lab-note">{note}</p>}
          <div className="lab-body">
            {panel === "passage" && (
              <PassageTab config={<ConfigPick id={config} pick={pickConfig} />} setup={setup} setSetup={setSetup} f={f} voices={voices} bpm={bpm} sound={sound} ensureChip={ensureChip} drag={<><DragSeg change={changeMech} /><BandSeg change={changeMech} /></>} />
            )}
            {panel === "free" && <FreeTab setup={setup} setSetup={setSetup} f={f} sound={sound} drag={<DragSeg change={changeMech} />} />}
            {panel === "table" && (
              <TableTab
                f={f}
                voice={setup.voice}
                o={tableOpts}
                set={setTableOpts}
                play={() => {
                  stop();
                  const ch = ensureChip();
                  void ch.resume().finally(() => setTableOn(true));
                  setPanel(null);
                }}
              />
            )}
            {panel === "breath" && <BreathTab ensureChip={ensureChip} />}
            {panel === "drills" && (
              <div className="lab-drills">
                {DRILLS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    id={`drill-${d.id}`}
                    className={`lab-drill${setup.drill === d.id ? " on" : ""}`}
                    onClick={() => {
                      const ff = fugueById(d.piece);
                      setSetup({ piece: d.piece, voice: d.voice, fromBar: d.fromBar, toBar: d.toBar, reading: d.reading ?? readingsOf(ff.id)[0]?.id ?? "", tempoPct: d.tempoPct ?? 100, drill: d.id, sound: "" });
                    }}
                  >
                    <b>{d.name}</b>
                    <span>{pieceLabel(fugueById(d.piece))} · {fugueById(d.piece).voiceNames[d.voice]} · bars {d.fromBar}–{d.toBar}</span>
                    <span className="lab-dim">{d.look}</span>
                  </button>
                ))}
                <p className="lab-dim">A drill sets the passage; tap ▶ START. Loop is {setup.loop ? "on" : "off"} (PASSAGE).</p>
              </div>
            )}
            {panel === "mechanics" && <MechanicsTab config={<ConfigPick id={config} pick={pickConfig} />} change={changeMech} />}
            {panel === "sensor" && <SensorTab hub={hub.current} play={setup.sensePlay} setPlay={(v) => setSetup({ sensePlay: v })} source={setup.senseSource} setSource={(v) => setSetup({ senseSource: v })} copy={copySensor} adapt={adapt.current} adaptive={setup.dynAdaptive} setAdaptive={(v) => setSetup({ dynAdaptive: v })} />}
            {panel === "see" && (
              <div className="lab-see">
                <div className="lab-row">
                  <Toggle id="lab-traces" label="Thumb traces" on={setup.traces} set={(v) => setSetup({ traces: v })} />
                  <Toggle id="lab-feedbar" label="Latest verdict in the title bar while playing" on={setup.feedBar} set={(v) => setSetup({ feedBar: v })} />
                  <Toggle id="lab-feed" label="FREE PLAY: lines over the box" on={setup.feed} set={(v) => setSetup({ feed: v })} />
                  <button type="button" className="lab-btn" onClick={() => ((feed.current = []), setFeedTick((n) => n + 1))}>
                    CLEAR
                  </button>
                </div>
                <div className="lab-lines">
                  {feed.current.length ? [...feed.current].reverse().map((l, i) => <p key={i} className={lineClass(l)}>{l}</p>) : <p className="lab-dim">Nothing yet: play a passage.</p>}
                </div>
              </div>
            )}
            {panel === "runs" && (
              <div className="lab-runs">
                {last ? (
                  <div className="lab-run lab-run-last">
                    <p>
                      <b>LAST RUN</b> {runTitle(last)}
                    </p>
                    <div className="lab-row">
                      <button type="button" id="lab-copy" className="lab-btn" onClick={() => copy(last)}>COPY LOG</button>
                      <button type="button" id="lab-share" className="lab-btn" onClick={() => share(last)}>SHARE</button>
                      <button type="button" id="lab-replay" className="lab-btn" onClick={() => doReplay(last)}>REPLAY WITH CURRENT PARAMETERS</button>
                    </div>
                  </div>
                ) : (
                  <p className="lab-dim">Play a passage: each run is recorded and saved here by itself (the newest {MAX_RUNS}). Its log can be copied for the developer and replayed with other parameters.</p>
                )}
                {replayed && (
                  <div className="lab-replay" id="lab-replay-out">
                    <p>
                      <b>REPLAY</b> {replayed.title}
                    </p>
                    <p className="lab-diff">{replayed.d.line}</p>
                    <p className="lab-dim">
                      before: {tallyLine(replayed.d.before)}
                      <br />
                      after: {tallyLine(replayed.d.after)}
                    </p>
                    {replayed.d.notes.length > 0 && (
                      <details open>
                        <summary>{replayed.d.notes.length} notes changed</summary>
                        {replayed.d.notes.map((n, i) => (
                          <p key={i} className="lab-line">{n}</p>
                        ))}
                      </details>
                    )}
                    <details>
                      <summary>the replay's verdicts</summary>
                      {replayed.lines.map((l, i) => (
                        <p key={i} className={lineClass(l)}>{l}</p>
                      ))}
                    </details>
                  </div>
                )}
                <p className="lab-sub">SAVED ON THIS DEVICE BY ITSELF ({runs.length} of {MAX_RUNS}: the newest kept, the oldest overwritten)</p>
                {runs.map((r) => (
                  <div key={r.at} className="lab-run">
                    <p>
                      <span className="lab-dim">{new Date(r.at).toLocaleString()}</span> {r.title}
                      {r.log.preset ? <span className="lab-dim"> · {r.log.preset}</span> : null}
                    </p>
                    <div className="lab-row">
                      <button type="button" className="lab-btn" onClick={() => doReplay(r.log)}>REPLAY</button>
                      <button type="button" className="lab-btn" onClick={() => copy(r.log)}>COPY</button>
                      <button type="button" className="lab-btn" onClick={() => share(r.log)}>SHARE</button>
                      <button
                        type="button"
                        className="lab-btn"
                        onClick={() => {
                          const p = r.log.passage;
                          setSetup({ piece: p.piece, voice: p.voice, fromBar: p.fromBar, toBar: p.toBar, tempoPct: p.tempoPct, proto: p.proto, wait: p.wait, reading: p.reading ?? "" });
                          setNote("The run's passage is set (its parameters are not: see MECHANICS).");
                        }}
                      >
                        USE PASSAGE
                      </button>
                      <button type="button" className="lab-btn" onClick={() => (setRuns(runs.filter((x) => x.at !== r.at)), save(RUNS, runs.filter((x) => x.at !== r.at)))}>
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
                <p className="lab-sub">REPLAY A LOG FROM ELSEWHERE</p>
                <textarea className="lab-paste" placeholder="Paste a lab log here" value={paste} onChange={(e) => setPaste(e.target.value)} />
                <div className="lab-row">
                  <button
                    type="button"
                    className="lab-btn"
                    onClick={() => {
                      try {
                        const log = parseLog(paste);
                        setLast(log);
                        doReplay(log);
                      } catch (err) {
                        setNote(`Not a lab log: ${(err as Error).message}`);
                      }
                    }}
                  >
                    REPLAY PASTED LOG
                  </button>
                </div>
              </div>
            )}
            {panel === "study" && <StudyTab st={study} />}
            {panel === "help" && <HelpTab />}
          </div>
        </div>
      )}
    </div>
  );
}

function lineClass(l: string): string {
  return `lab-line${/ WRONG|STRAY|NOT JOINED|MISSED|CANCEL| ✕/.test(l) ? " bad" : / RIGHT|LEGATO ✓|JOINED|SLIDE|SHAKE|HELD|DRAG|TAP/.test(l) ? " good" : ""}${l.startsWith("—") ? " head" : ""}`;
}
function tallyLine(t: Tally): string {
  return `right ${t.right} · wrong ${t.wrong} · missed ${t.missed} · stray ${t.stray} · joined ${t.joined} (not ${t.notJoined}) · slides ${t.slides} · shakes ${t.shakes}`;
}

function Toggle({ id, label, on, set }: { id: string; label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="lab-toggle" htmlFor={id}>
      <input type="checkbox" id={id} checked={on} onChange={(e) => set(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Seg<T extends string>({ id, label, value, options, set }: { id: string; label: string; value: T; options: readonly (readonly [T, string])[]; set: (v: T) => void }) {
  return (
    <div className="lab-field">
      <span>{label}</span>
      <div className="lab-seg" role="group" aria-label={label}>
        {options.map(([v, t]) => (
          <button key={v} type="button" id={`${id}-${v}`} className={v === value ? "on" : ""} aria-pressed={v === value} onClick={() => set(v)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/** D328: the band's time, here as in MECHANICS › BAND TIME (the game's: FIXED). */
function BandSeg({ change }: { change: (v: Partial<Record<MechKey, unknown>>) => void }) {
  return (
    <div className="lab-field">
      <Seg id="lab-band-time" label="Band time" value={MECH.bandTime} options={[["fixed", "FIXED (THE GAME'S)"], ["waits", "WAITS"], ["follows", "FOLLOWS"]]} set={(v) => change({ bandTime: v })} />
      <span className="lab-dim">
        WAITS: at a cadence, the final chord and after your breath (a lift at a rest) the band holds until your next note, up to {MECH.bandWaitMaxMs} ms. FOLLOWS: that, and its tempo follows yours, at most ±{MECH.bandBoundPct}%, pulled back past {MECH.bandDriftMaxMs} ms of drift. Not with BLUETOOTH MODE or WAIT FOR ME (MECHANICS › BAND TIME has the rest).
      </span>
    </div>
  );
}

/** How early or late the player's right notes were on average (the owner: "how do I know if I'm less or more early?"). */
export function timingLine(verdicts: readonly LabEvent[], short = false): string {
  const offs = verdicts.flatMap((v) => (v.kind === "note" && v.ok && typeof v.offMs === "number" ? [v.offMs] : []));
  if (!offs.length) return short ? "timing —" : "timing: no right notes";
  const mean = offs.reduce((a, b) => a + b, 0) / offs.length;
  const sd = Math.sqrt(offs.reduce((a, b) => a + (b - mean) ** 2, 0) / offs.length);
  const m = Math.round(Math.abs(mean));
  const word = Math.abs(mean) < 5 ? "on time" : mean < 0 ? `${m} ms early` : `${m} ms late`;
  // D338: and how it moved through the passage (first, middle, last third): rushing or dragging.
  const rush = rushLine(verdicts, short);
  return short ? `${word} ±${Math.round(sd)}${rush ? ` · ${rush}` : ""}` : `on average ${word} (spread ±${Math.round(sd)} ms, ${offs.length} notes)${rush ? ` · ${rush}` : ""}`;
}

/** D321: what a drag means, here as in MECHANICS › DRAG (the game's: JOIN). */
function DragSeg({ change }: { change: (v: Partial<Record<MechKey, unknown>>) => void }) {
  return (
    <div className="lab-field">
      <Seg id="lab-drag" label="A drag (a held thumb slid on to the next note) means" value={MECH.dragMeaning} options={[["join", "JOIN (THE GAME'S)"], ["connect", "CONNECT"]]} set={(v) => change({ dragMeaning: v })} />
      <span className="lab-dim">Connect: a sound that bends glides with the thumb; a harpsichord, piano or organ plays the passing note across a third, the Schleifer into a note from below (D321).</span>
    </div>
  );
}

function PassageTab({ config, setup, setSetup, f, voices, bpm, sound, ensureChip, drag }: { config: React.ReactNode; setup: Setup; setSetup: (p: Partial<Setup>) => void; f: TouchFugue; voices: number[]; bpm: number; sound: string; ensureChip: () => Chip; drag: React.ReactNode }) {
  const lo = firstBar(f);
  const hi = lastBar(f);
  const books = [
    ["BOOK I", PIECES.filter((p) => p.book === 1)],
    ["BOOK II", PIECES.filter((p) => p.book === 2)],
    ["TUTORIAL", TUTORIAL_PIECES],
  ] as const;
  const readings = readingsOf(f.id);
  return (
    <div className="lab-form">
      {config}
      <label className="lab-field">
        <span>Piece</span>
        <select id="lab-piece" value={setup.piece} onChange={(e) => setSetup({ piece: e.target.value, voice: 0, fromBar: 1, toBar: 8, reading: readingsOf(e.target.value)[0]?.id ?? "", sound: "", drill: undefined })}>
          {books.map(([name, list]) => (
            <optgroup key={name} label={name}>
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {pieceLabel(p)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="lab-field">
        <span>Voice</span>
        <select id="lab-voice" value={setup.voice} onChange={(e) => setSetup({ voice: Number(e.target.value), drill: undefined })}>
          {f.voiceNames.map((n, i) => (
            <option key={n} value={i}>
              {n}
              {voices.includes(i) ? "" : " (silent here)"}
            </option>
          ))}
        </select>
      </label>
      <div className="lab-field">
        <span>Bars</span>
        <span className="lab-bars">
          <input type="number" id="lab-from" inputMode="numeric" min={lo} max={hi} value={setup.fromBar} onChange={(e) => setSetup({ fromBar: Number(e.target.value), drill: undefined })} />
          to
          <input type="number" id="lab-to" inputMode="numeric" min={lo} max={hi} value={setup.toBar} onChange={(e) => setSetup({ toBar: Number(e.target.value), drill: undefined })} />
          <span className="lab-dim">of {hi}</span>
        </span>
      </div>
      <label className="lab-field">
        <span>
          Tempo {setup.tempoPct}% · ♩ {Math.round(bpm)}
        </span>
        <input type="range" id="lab-tempo" min={50} max={130} step={5} value={setup.tempoPct} onChange={(e) => setSetup({ tempoPct: Number(e.target.value) })} />
      </label>
      <div className="lab-row">
        <Toggle id="lab-loop" label="Loop" on={setup.loop} set={(v) => setSetup({ loop: v })} />
        <Toggle id="lab-wait" label="Wait for me" on={setup.wait} set={(v) => setSetup({ wait: v })} />
      </div>
      <label className="lab-field">
        <span>Reading (articulation marks)</span>
        <select id="lab-reading" value={setup.reading} onChange={(e) => setSetup({ reading: e.target.value })}>
          <option value="">None</option>
          {readings.map((r) => (
            <option key={r.id} value={r.id}>
              {r.author}
            </option>
          ))}
        </select>
      </label>
      <SoundSelect id="lab-sound" value={sound} set={(id) => setSetup({ sound: id })} sounds={POP_SOUNDS} own={PIECE_SOUND[f.id]} />
      <DynPick id="lab-passage-dyn" setup={setup} setSetup={setSetup} sound={sound} where="PASSAGE" />
      <Seg id="lab-bt" label="Bluetooth mode" value={setup.bt} options={[["auto", "AUTO"], ["on", "ON"], ["off", "OFF"]]} set={(v) => setSetup({ bt: v })} />
      <Seg id="lab-proto" label="Played on" value={setup.proto} options={[["ladder", "LADDER (phone)"], ["keys", "KEYS (computer)"]]} set={(v) => setSetup({ proto: v })} />
      {drag}
      <LagSetting lag={setup.lag} setLag={(l) => setSetup({ lag: l })} chip={ensureChip} />
    </div>
  );
}

/** D321, D335, D336: the sensor session for a log, with inner against outer taps and the strike's calibration (stored, and the adaptive references now). */
function sensorExport(h: MotionHub, adapt?: AdaptiveCal) {
  const x = h.export();
  return { ...x, zones: zoneReport(x.taps), dynCal: { stored: loadDynCal(), now: adapt?.refs() ?? null, adaptive: adapt?.on ?? null } };
}

/** D320: FREE PLAY's settings (the piece gives the key and the voice its range; the sound is PASSAGE's). */
function FreeTab({ setup, setSetup, f, sound, drag }: { setup: Setup; setSetup: (p: Partial<Setup>) => void; f: TouchFugue; sound: string; drag: React.ReactNode }) {
  const whites = whitePcs(f, setup.voice, setup.kbWhite);
  const rows = freeRows(f, setup.voice, setup.freeScale, setup.freeOctaves, whites);
  const kbOn = setup.freeScale === "keyboard";
  const share = (m: WhiteMode) => Math.round(whiteShare(f, setup.voice, whitePcs(f, setup.voice, m)) * 100);
  return (
    <div className="lab-form">
      <p className="lab-dim" style={{ gridColumn: "1 / -1", margin: 0 }}>
        Play the sound freely on the two bars: the pitch is the row under the thumb (high at the top), every gesture works as in the game (where you land across the bar, sideways while holding, slides, shakes into mordents and trills, the other thumb still down to join) and MECHANICS applies. Each event is a line over the box and in WHAT HAPPENED. ▶ PLAY FREELY starts; ■ STOP ends.
      </p>
      <label className="lab-field">
        <span>Key and range from</span>
        <select id="lab-free-piece" value={setup.piece} onChange={(e) => setSetup({ piece: e.target.value, voice: 0, reading: readingsOf(e.target.value)[0]?.id ?? "", drill: undefined })}>
          {ALL.map((p) => (
            <option key={p.id} value={p.id}>
              {pieceLabel(p)}
            </option>
          ))}
        </select>
      </label>
      <label className="lab-field">
        <span>Voice (its range)</span>
        <select id="lab-free-voice" value={setup.voice} onChange={(e) => setSetup({ voice: Number(e.target.value) })}>
          {f.voiceNames.map((n, i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <Seg id="lab-free-scale" label="Notes" value={setup.freeScale} options={[["key", `${keyName(f.key).toUpperCase()}`], ["chromatic", "CHROMATIC"], ["keyboard", "KEYBOARD"]]} set={(v) => setSetup({ freeScale: v })} />
      {kbOn && (
        <>
          <p className="lab-dim" style={{ gridColumn: "1 / -1", margin: 0 }}>
            KEYBOARD (D330): a piano stood on end on each bar, high at the top, mirrored: white keys run the whole bar, black keys sit toward the inner edge (by the box), so a chromatic run stays inner and an all-white run can relax outward. A touch goes to the nearest key, weighing across and along (the black keys' tips taper: a touch there is decided by both). Across picks the key here, so it shapes no attack; slides, shakes and drags work as before.
          </p>
          <Seg
            id="lab-kb-white"
            label={`White keys: ${whiteNames(f, whites, setup.kbWhite)} (${share(setup.kbWhite)}% of the ${f.voiceNames[setup.voice] ?? "voice"}'s notes)`}
            value={setup.kbWhite}
            options={[["key", `IN THE KEY (${share("key")}%)`], ["piano", `PIANO (${share("piano")}%)`]]}
            set={(v) => setSetup({ kbWhite: v })}
          />
          <label className="lab-field">
            <span>Inner zone (black keys): {Math.round(setup.kbSplit * 100)}% of the bar</span>
            <input type="range" id="lab-kb-split" min={0.3} max={0.85} step={0.05} value={setup.kbSplit} onChange={(e) => setSetup({ kbSplit: Number(e.target.value) })} />
          </label>
          <label className="lab-field">
            <span>Black key height: {setup.kbBlack.toFixed(2)} of a white's</span>
            <input type="range" id="lab-kb-black" min={0.35} max={0.9} step={0.01} value={setup.kbBlack} onChange={(e) => setSetup({ kbBlack: Number(e.target.value) })} />
          </label>
          <label className="lab-field">
            <span>Slant (the weighting): black tips taper over {Math.round(setup.kbSlant * 100)}% of the bar{setup.kbSlant === 0 ? " (hard edges)" : ""}</span>
            <input type="range" id="lab-kb-slant" min={0} max={0.6} step={0.05} value={setup.kbSlant} onChange={(e) => setSetup({ kbSlant: Number(e.target.value) })} />
          </label>
          <div className="lab-row">
            <Toggle id="lab-kb-labels" label="Pitch names on the keys" on={setup.kbLabels} set={(v) => setSetup({ kbLabels: v })} />
            <button type="button" className="lab-btn" onClick={() => setSetup({ kbSplit: KB_DEFAULT.split, kbBlack: KB_DEFAULT.black, kbSlant: KB_DEFAULT.slant })}>
              SHAPE: DEFAULTS
            </button>
          </div>
        </>
      )}
      <Seg id="lab-free-oct" label={kbOn ? `Range: ${rows.length} keys (${rows.filter((m) => whites.includes(((m % 12) + 12) % 12)).length} white)` : `Range: ${rows.length} rows`}value={String(setup.freeOctaves) as "1" | "2" | "3"} options={[["1", "1 OCTAVE"], ["2", "2 OCTAVES"], ["3", "3 OCTAVES"]]} set={(v) => setSetup({ freeOctaves: Number(v) })} />
      <label className="lab-field">
        <span>
          Tempo ♩ {setup.freeBpm} (the click; the ornaments' speed)
        </span>
        <input type="range" id="lab-free-bpm" min={40} max={180} step={2} value={setup.freeBpm} onChange={(e) => setSetup({ freeBpm: Number(e.target.value) })} />
      </label>
      <div className="lab-row">
        <Toggle id="lab-click" label="Metronome click" on={setup.click} set={(v) => setSetup({ click: v })} />
      </div>
      <SoundSelect id="lab-free-sound" value={sound} set={(id) => setSetup({ sound: id })} sounds={POP_SOUNDS} own={PIECE_SOUND[f.id]} />
      {drag}
      <DynPick id="lab-free-dyn" setup={setup} setSetup={setSetup} sound={sound} where="FREE PLAY" />
    </div>
  );
}

/**
 * D329: CONFIG, the named presets (presets.ts) at the top of PASSAGE and MECHANICS: one chosen sets every
 * parameter (the game's defaults with its own on top); what it feels like under it; "(changed)" once a
 * slider is moved after, with what.
 */
function ConfigPick({ id, pick }: { id: string; pick: (id: string) => void }) {
  const c = configById(id) ?? CONFIGS[0];
  const edits = configEdits(c);
  return (
    <div className="lab-field lab-config">
      <label className="lab-field">
        <span>
          Config <b>{c.name}</b>
          {edits.length ? <span className="lab-changed"> (changed)</span> : null}
        </span>
        <select id="lab-config" value={c.id} onChange={(e) => pick(e.target.value)}>
          {CONFIGS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <span className="lab-dim" id="lab-config-feel">
        {c.feel}
      </span>
      {edits.length ? (
        <span className="lab-dim">
          Changed since: {edits.map((k) => mechPhrase(k)).join(" · ")}. Choose it again to put it back.
        </span>
      ) : null}
    </div>
  );
}

function MechanicsTab({ config, change }: { config: React.ReactNode; change: (v: Partial<Record<MechKey, unknown>> | null) => void }) {
  const groups = [...new Set(MECH_SPEC.map((s) => s.group))];
  return (
    <div className="lab-mech">
      {config}
      <div className="lab-row">
        <button type="button" id="lab-reset" className="lab-btn" onClick={() => change(null)}>
          RESET TO GAME DEFAULTS
        </button>
        <span className="lab-dim">{Object.keys(mechChanges()).length ? Object.keys(mechChanges()).map((k) => mechPhrase(k as MechKey)).join(" · ") : "All at the game's values."}</span>
      </div>
      <p className="lab-dim">Changes apply at once, except the TIMING windows (from the next START). Sizes in rows are multiples of the judging row (the box's step height, at least "Smallest row").</p>
      {groups.map((g) => (
        <section key={g} className="lab-group">
          <h2>{g}</h2>
          {MECH_SPEC.filter((s) => s.group === g).map((s) => (
            <MechControl key={s.key} s={s} change={change} />
          ))}
        </section>
      ))}
      <section className="lab-group">
        <h2>STRONG SIDE</h2>
        <p className="lab-dim">
          The strong side of the bars is {STRONG_SIDE === "outer" ? "the outer edge (by the phone's edge)" : "the inner edge (by the box)"} (touch-expr.ts STRONG_SIDE, D314). Read only here for now: it becomes a switch with the STRONG_SIDE work.
        </p>
      </section>
    </div>
  );
}

function MechControl({ s, change }: { s: MechSpec; change: (v: Partial<Record<MechKey, unknown>>) => void }) {
  const v = MECH[s.key];
  const d = MECH_DEFAULTS[s.key];
  const off = v !== d;
  if (s.kind === "bool")
    return (
      <div className={`lab-mrow${off ? " off" : ""}`} title={s.help}>
        <Toggle id={`mech-${s.key}`} label={s.label} on={!!v} set={(x) => change({ [s.key]: x })} />
        <span className="lab-dim">{s.help}</span>
      </div>
    );
  if (s.kind === "choice")
    return (
      <div className={`lab-mrow${off ? " off" : ""}`}>
        <label className="lab-field">
          <span>{s.label}</span>
          <select id={`mech-${s.key}`} value={String(v)} disabled={s.options.length < 2} onChange={(e) => change({ [s.key]: e.target.value })}>
            {s.options.map(([o, t]) => (
              <option key={o} value={o}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <span className="lab-dim">{s.help}{s.options.length < 2 ? " (more options will appear as the engine offers them)" : ""}</span>
      </div>
    );
  return (
    <div className={`lab-mrow${off ? " off" : ""}`}>
      <label className="lab-field">
        <span>
          {s.label} <b>{String(v)}{s.unit ? ` ${s.unit}` : ""}</b>
          {off && <span className="lab-dim"> (game: {String(d)})</span>}
          {MECH.timing === "relative" && REL_KEYS.includes(s.key) && <span className="lab-changed"> RELATIVE ↔</span>}
        </span>
        <input type="range" id={`mech-${s.key}`} min={s.min} max={s.max} step={s.step} value={Number(v)} onChange={(e) => change({ [s.key]: Number(e.target.value) })} />
      </label>
      <span className="lab-dim">{s.help}</span>
    </div>
  );
}

function HelpTab() {
  return (
    <div className="lab-help">
      <h2>HOW TO USE THE LAB</h2>
      <p>The lab is the real game with its insides showing. Pick a passage, play it, and read why every touch counted or not. Change how the game judges, then play again, or replay a run you already played with the new settings.</p>
      <h3>1 · Pick a passage</h3>
      <p>PASSAGE: the piece, your voice, the bars, the tempo (100% is the game's), and the sound. LOOP plays it again and again. WAIT FOR ME stops the music at each note until you play it. DRILLS: ready-made passages, one mechanic each (slurs, legato, leaps, ornaments, repeated notes, staccato).</p>
      <h3>2 · Play</h3>
      <p>▶ START (top right). Hold the phone sideways and play on the two bars as in the game. ■ STOP ends the run. Each thumb leaves a trace: a circle where it landed, its path while held, an X where it lifted, green when the note was right, red when wrong, orange for a touch on no note.</p>
      <h3>3 · See what happened</h3>
      <p>WHAT HAPPENED lists every line, newest first (nothing is written over the music while you play; WHAT HAPPENED can put the latest line in the title bar). Each line gives the bar and beat, the note, the verdict, how early or late (ms), and the reason with numbers: how far your thumb moved from its last touch and what was needed; for joined notes, whether the other thumb was still down, or the gap between lifting and the next touch and the gap allowed.</p>
      <h3>4 · Change the rules</h3>
      <p>MECHANICS: every timing window, the legato gap, the slide threshold, the LADDER distances (in rows: one row is the height of one step in the box), ornaments, expression and what happens when the phone cancels a touch. RESET TO GAME DEFAULTS puts everything back. The game itself (play.html) is never changed by the lab.</p>
      <p>CONFIG (at the top of PASSAGE and MECHANICS) sets everything at once to a named way of playing, so you can try them one after another and say which feels right: A · CLASSIC is the game as it was up to WTC 1.51; B · CLEAN STRIKES makes every landing a strike; B+ · PREPARED (the game since WTC 1.52, and the default here) is B where a thumb may rest early on its next note while the other holds, sounded when the other lifts (a pull-off; a landing while the other holds is a hammer-on), never by itself; C · HAND-OVER lets a thumb rest on its next note while the other still holds and sounds it at its time; D · LIFT TO SOUND sounds it when the other thumb lifts; E · GENEROUS is C with wider windows. Moving a slider afterwards marks it "(changed)"; every run records the config it was played with. TIMING UNITS: RELATIVE scales the windows with the time between the notes (as set at 360 ms between notes, II/18's quavers; never narrower than at 250 ms, nor than a few touch frames).</p>
      <h3>Drags (try: CONNECT)</h3>
      <p>A drag is a held thumb slid on to the next note. In the game it only joins (no bonus, the legato chain broken). CONNECT (in FREE PLAY, PASSAGE or MECHANICS › DRAG) gives it a meaning per instrument: voices, synths and chips glide, the pitch following your thumb; harpsichord, piano and organ play the passing note when you drag across a third (coulé) and the Schleifer (two quick notes from a third below) when you drag up into a note. In a passage it then counts as joined for the chain, but earns nothing more. Each one is a "↝ DRAG:" line.</p>
      <p>BAND TIME (PASSAGE, or MECHANICS › BAND TIME) is a prototype: should the band follow you in time? FIXED is the game's. WAITS keeps the pulse but holds the band at a cadence, the final chord and after your breath (a lift at a rest) until your next note, at most a set time; each is a "⏸ BAND WAITED" line. FOLLOWS also lets the band's tempo follow your notes, a few per cent at most, changed only at a beat, and pulled back to the written tempo before it drifts far; each change is a "♩ BAND TEMPO" line. Your timing is judged against where the band is.</p>
      <h3>Sensor: how hard you tap</h3>
      <p>SENSOR: START SENSOR (allow motion access when asked), then LEARN: ten soft taps, ten hard taps on the pad, and PRESS AND FLATTEN (hold, flatten the thumb, lift). It shows how well soft and hard separate by the contact's size and by the motion sensor's spike. Do it held as you play, then with the phone on a table. COPY SENSOR LOG and paste it to the developer. PLAY WITH IT makes FREE PLAY's attacks follow your tap (by contact size or by the motion sensor).</p>
      <h3>Dynamics (the sampled piano)</h3>
      <p>DYNAMICS (in PASSAGE and FREE PLAY, one setting): A · PLACE × STRIKE, B · PEDAL + STRIKE, C · STRIKE ONLY. In PASSAGE it shapes your own notes with the band (a pull-off has no strike: its place or pedal level only); it never changes what is judged or scored, and a STUDY always plays without it. Start the sensor first (SENSOR › START SENSOR). It needs no calibration each time: ADAPTIVE (on, in SENSOR) learns your soft and hard taps from your last 60 strikes, starting from your last session's (or a LEARN's). A firm tap is trusted more than a soft one: a tap read soft takes off 2 dB at most. Each note's level is a ♩ line in WHAT HAPPENED; the references in use are in the run's first line.</p>
      <h3>Free play</h3>
      <p>FREE PLAY: no music to follow; the two bars play the sound chosen, the pitch the row under your thumb (the piece's key or every semitone, one to three octaves round the voice's range). Everything works as in the game: where you land across the bar, moving sideways while holding, sliding to another row, shaking into a mordent or a trill, landing while the other thumb holds to join. Each event is a line over the box. A metronome click if you want one. MECHANICS applies.</p>
      <p>KEYBOARD (Notes › KEYBOARD): a piano stood on end on each bar, mirrored, black keys toward the box, white keys running the whole bar. WHITE KEYS: IN THE KEY makes white the seven notes the voice plays most (in G♯ minor almost everything would be black on a piano), PIANO a real piano's. The sliders set the inner zone's width, the black keys' height and how much their tips taper (a touch near a tip is decided by where it is both across and along). Across picks the key here, so it shapes no attack.</p>
      <h3>Study: ten excerpts, ten times each</h3>
      <p>STUDY (D333): ten short excerpts from the fugues, each played ten times in a row, so the developer can see what you learn, what stays hard and which mistakes come back. START STUDY; before each excerpt a screen says what it tests, with ▶ PLAY and HEAR IT FIRST (the excerpt played once by itself, not counted). Each take starts after the count-in; the next starts by itself 2 s later, after its tally. ❚❚ PAUSE (top right) at any moment: the take stopped is played again. One setting for everything (preset B, piano, no reading marks, band time fixed, the game's tempo); your own settings come back afterwards. It is saved on the phone after every take, so you can stop and go on another day. SAVE FILE sends the whole study as one file (wtc-study-date.json) to upload to the developer; COPY copies it as text.</p>
      <h3>5 · Share and replay</h3>
      <p>RUNS: every run is recorded (your touches with their exact times, the settings, your phone's screen and sound delay, and every verdict). COPY LOG or SHARE sends it (paste it in a message to the developer). Each run is kept on this phone by itself (the newest 20; the oldest is overwritten). REPLAY plays a run again through the game with the current MECHANICS, without sound, and says what would have changed: for example, "with Legato gap 120 ms: 7 more joined, 2 fewer wrong".</p>
      <h3>For the developer</h3>
      <p>
        <code>node tools/lab/replay.ts log.json --set legatoGapMs=120 --verdicts</code> replays a pasted log offline (<code>--keys</code> lists the parameters).
      </p>
    </div>
  );
}

/** D335/D336: the DYNAMICS selector (FREE PLAY and PASSAGE; one setting for both) and what it does. */
function DynPick({ id, setup, setSetup, sound, where }: { id: string; setup: Setup; setSetup: (p: Partial<Setup>) => void; sound: string; where: "FREE PLAY" | "PASSAGE" }) {
  return (
    <>
      <Seg id={id} label="Dynamics (piano)" value={setup.dynMode} options={DYN_MODES} set={(v) => setSetup({ dynMode: v })} />
      <p className="lab-dim" id={`${id}-help`} style={{ gridColumn: "1 / -1", margin: 0 }}>
        {setup.dynMode === "off"
          ? "OFF: as today (where you land across the bar shapes the attack, D311)."
          : setup.dynMode === "place"
            ? "A · PLACE × STRIKE: the place across (by the box loud, by the edge soft: ±4 dB) shifted by how hard you tap (a firm tap +4 dB, a soft one −2 dB at most)."
            : setup.dynMode === "pedal"
              ? "B · PEDAL + STRIKE: where your thumbs land over the last second sets a running level (±6 dB, an expression pedal); how hard you tap adds an accent (a firm tap +4 dB, a soft one −2 dB at most)."
              : "C · STRIKE ONLY: how hard you tap alone (a firm tap +8 dB, a soft one −4 dB at most)."}
        {setup.dynMode !== "off"
          ? ` ${where === "PASSAGE" ? "Your own notes with the band (struck, hammer-ons; a pull-off has no strike: its place or pedal level only). Not in a STUDY or in BLUETOOTH MODE. The same setting as FREE PLAY's. " : "The same setting as PASSAGE's. "}Never more than 16 dB in all; nothing is judged or scored by it. The tap's strength needs SENSOR › START SENSOR; it learns your soft and hard taps as you play (ADAPTIVE, in SENSOR). ${sound === "pianoSampled" ? "" : "The sampled piano only: choose PIANO (SAMPLED)."}`
          : ""}
      </p>
    </>
  );
}
