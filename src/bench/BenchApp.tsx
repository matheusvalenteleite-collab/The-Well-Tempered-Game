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
 */
import { ornamentMark, ornamentsOf } from "../touch/ornament-play.ts";
import { BachTalk } from "./Bach.tsx";
import { accuracy, passed, TRACKS, type Line, type Run } from "./lessons.ts";
import { answer, askFirst, nextLesson, recordLesson } from "./tutorial.ts";
import { LessonMap, PlayedBefore } from "./LessonMap.tsx";
import { TEMPO, tempoOf } from "../touch/tempi.ts";
import { presetById, setPreset } from "../touch/sound.ts";
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
import { ProtoGame, type KeyPress } from "./proto-game.ts";
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
import { AchButton, Achievements, FeatToast } from "./Achievements.tsx";
import { artLine, type ArtStats } from "./articulation.ts";
import { ARROW_KEYS, arrowOf, easyOf, KEY_ROWS, KEYS_LAYOUTS, type KeysLayout, keyId, keyRow, menuOf, midiId, moveOf, offered, PROTOS, protoById, roadAlone, takesHer, type Platform, type ProtoId } from "./protos.ts";

const PICK_KEY = "tb-pick-v2";
/** D233: ⚙ PLAY ON: AUTO (from the pointer) or a platform chosen. */
const PLATFORM_KEY = "tb-platform-v1";
const LAG_KEY = "tg-lag";
// D203: a new key, so that every player starts on the fugue's own sound.
// D208: a new key, so every player starts on the sampled harpsichord.
const SOUND_KEY = "tg-sound-v3";
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

function sane(p: Pick): Pick {
  const known = fugueById(p.piece).id === p.piece ? p.piece : DEFAULT.piece;
  // D229: Book I's preludes are stage 1 (stages.ts); a locked fugue gives its prelude; Book II's preludes still give their fugues.
  const pair = paired(known) && isPrelude(known) ? known : fugueOnly(known);
  // D232: a piece whose tier is closed gives I/1's prelude.
  const piece = locked(pair) ? (locked(preludeOf(pair)) ? "wtc1p01" : preludeOf(pair)) : pair;
  const f = fugueById(piece);
  const share = Math.min(0.99, Math.max(0, p.share || 0));
  const singing = voicesFrom(f, startTick(f, share));
  // A prelude's upper hand by default; a fugue's second voice.
  const voice = singing.includes(p.voice) ? p.voice : singing[f.kind === "prelude" ? 0 : Math.min(1, singing.length - 1)];
  // D219: a stored mode withdrawn (HIGHWAY, TWO VOICES, KIMIKO on a phone) falls back to LADDER; a stored KIMIKO as LADDER WITH KIMIKO.
  const was = p.proto as string;
  const proto = PROTOS.some((x) => x.id === was) ? p.proto : DEFAULT.proto;
  // D233: EASY's level no longer chosen (protos.ts easyOf).
  const { voice2: _v2, fail: _fail, easy: _easy, ...rest } = p as Pick & { voice2?: number; fail?: boolean; easy?: string };
  return { ...DEFAULT, ...rest, piece, share, voice, proto, legato: !!p.legato, her: was === "kimiko" || p.her === true, mine: p.mine in MINE ? p.mine : DEFAULT.mine, keys: p.keys === "scale" ? "scale" : "home" };
}

type Phase = { kind: "home" } | { kind: "title" } | { kind: "play" } | { kind: "result"; stage?: { won: boolean; fugue: string }; her?: boolean; right: number; wrong: number; missed: number; stray: number; of: number; score: number; grade: string; captured: number; entries: number; maxStreak: number; stars: number; failedBar: number | null; art?: ArtStats; seal: { kind: string; earned: boolean; why: string } | null; feats?: FeatId[]; opened?: Tier[] } | { kind: "settings" } | { kind: "achievements"; fresh?: FeatId[] } | { kind: "lessons"; focus?: ProtoId } | { kind: "help" } | { kind: "talk"; lines: Line[]; next: "play" | "again" | "advance" };

export function BenchApp() {
  // D233: the game opens on HOME.
  const [phase, setPhase] = useState<Phase>({ kind: "home" });
  /** Where the panels (⚙, ?, ACHIEVEMENTS, the LESSON MAP) close to: HOME or the title card they were opened from. */
  const origin = useRef<"home" | "title">("home");
  if (phase.kind === "home" || phase.kind === "title") origin.current = phase.kind;
  const back = () => setPhase({ kind: origin.current });
  const [pick, setPickRaw] = useState<Pick>(() => sane(load(PICK_KEY, DEFAULT)));
  const setPick = (p: Partial<Pick>) =>
    setPickRaw((cur) => {
      // A new piece starts at its own tempo (D184; the slider moves it after).
      const next = sane({ ...cur, ...p });
      save(PICK_KEY, next);
      return next;
    });
  const [lag, setLagRaw] = useState<number | null>(() => load<number | null>(LAG_KEY, null));
  const applyLag = (l: number | null) => {
    setLagRaw(l);
    save(LAG_KEY, l);
    if (chip.current) chip.current.lag = l;
  };
  // D223: a delay tapped is kept for the listening setup it was tapped with.
  const setLag = (l: number | null) => {
    applyLag(l);
    hp.record(l);
  };
  const [sound, setSoundRaw] = useState<string>(() => load<string>(SOUND_KEY, DEFAULT_SOUND));
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
  const platform = platformOf(pref === "mobile" || pref === "computer" ? pref : "auto", detected);
  const setPref = (p: PlatformPref) => {
    setPrefRaw(p);
    save(PLATFORM_KEY, p);
  };
  // D225: Herr Bach's HAVE YOU PLAYED BEFORE?, right after opening, until answered on this platform.
  const [asking, setAsking] = useState(() => askFirst(platform));
  const [note, setNote] = useState("");
  // D192: the fugue wheel. D233: opened from HOME (CHOOSE PIECE); a piece chosen goes to its title card.
  const [wheel, setWheel] = useState(false);
  // D188: a lesson with Herr Bach plays its own passage, on EASY at the lesson's level.
  // D225: a lesson of a platform's track (TRACKS), in its own mode.
  const [lesson, setLesson] = useState<{ pl: Platform; n: number; run: Run } | null>(null);
  const run = lesson?.run;
  const f = fugueById(run?.piece ?? pick.piece);
  // D229: a prelude on HIGHWAY (a phone's five lanes, a computer's keys), a fugue in the mode chosen.
  const proto = protoById(run ? run.proto : stageMode(f, platform, offered(pick.proto, platform, midi.length > 0)));
  const prelude = !run && f.kind === "prelude";
  const from = run ? run.from : startTick(f, pick.share);
  const voice = run ? run.voice : pick.voice;
  const bpm = run ? run.bpm : tempoOf(f.id);
  // D216, KIMIKO (D219: WITH KIMIKO ISHIZAKA, a switch in LADDER and SUBJECT): the player over Kimiko
  // Ishizaka's recording, the game on her time; only where she is timed (whatever pieces
  // data/recordings/ishizaka-ticks.json holds); her track let go when the switch or the piece is left.
  // D233: once unlocked (the feat KIMIKO ISHIZAKA: all 24 Book I fugues beaten).
  const unlockedHer = useMemo(() => herUnlocked(), [phase.kind]);
  const herHere = unlockedHer && takesHer(proto.id) && !run && !!herMap(f.id);
  const kimiko = herHere && pick.her;
  const hm = kimiko ? herMap(f.id) : null;
  // D219: the sound playing: WITH KIMIKO, the player's voice's own (TRAVERSO unless changed in ⚙ SOUND).
  const soundNow = kimiko ? herSound : sound;
  const setSound = (id: string) => {
    if (kimiko) {
      setHerSoundRaw(id);
      save(HER_SOUND_KEY, id);
    } else {
      setSoundRaw(id);
      save(SOUND_KEY, id);
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
  // LADDER: the box fills its height with the voice's range, so its rows are as tall as can be.
  const range = useMemo(() => {
    if (proto.id !== "ladder") return stepRange(f);
    const steps = f.voices[voice].map((n) => n[3]);
    return { lo: Math.min(...steps) - 1, hi: Math.max(...steps) + 1 };
  }, [f, proto.id, voice]);
  // The design study (box-variants.ts, `?boxv=N`): each voice's range, for the staves.
  const study = useMemo(() => (BOXV ? { ranges: f.voices.map((ns) => ({ lo: Math.min(...ns.map((n) => n[3])), hi: Math.max(...ns.map((n) => n[3])) })) } : {}), [f]);
  // A lesson's passage: only the entries it holds (alone: only the voice's own).
  const marks = useMemo(() => {
    const spans = entrySpans(f).filter((e) => !run || (e.on < run.until && e.end > run.from && (!run.solo || e.voice === run.voice)));
    const cadences = (f.cadences ?? []).filter((c) => !run || (c.on >= run.from && c.on <= run.until)).map((c) => ({ on: c.on, text: cadenceName(c) }));
    const ornaments = new Map([...ornamentsOf(f)].map(([k, o]) => [k, ornamentMark(o)]));
    return { ...subjectMarks(f), spans, names: f.voiceNames, cadences, ornaments };
  }, [f, run]);
  const chip = useRef<Chip | null>(null);
  // D223: other headphones noticed (a setup seen before gets its delay back), BLUETOOTH MODE, the screen's delay.
  const hp = useHeadphones(chip, applyLag);
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
    const g = new ProtoGame(f, played, from, proto, { bpm, legato: pick.legato, easy: run?.easy ?? easyOf(proto.id), fail: run ? run.fail : true, her: kimiko, bt: hp.btFor(lag), scale: !run && proto.id === "keys" && pick.keys === "scale", ...(run ? { until: run.until, wait: run.wait, solo: run.solo } : {}), ...(clock ? { clock } : {}) }, ch);
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
      if (count.current) count.current.textContent = g.countIn() ? String(g.countIn()) : g.combo >= 5 && !AUTO ? `×${g.combo}` : "";
      if (done) {
        // D216: a lost run: she fades out over a second; the end: her last chord rings on.
        h?.stop(g.failedAt !== null ? HER_FADE.fail : HER_FADE.end);
        game.current = null;
        paint.current = null;
        const r = g.results();
        if (lesson) {
          // A lesson passed (its rule: by default the share right, a stray strike half a note) goes on; else once more.
          const l = TRACKS[lesson.pl][lesson.n];
          const ok = passed(l, r);
          recordLesson(lesson.pl, l.id, accuracy(r), ok);
          setPhase({ kind: "talk", lines: ok ? l.praise : l.again, next: ok ? "advance" : "again" });
        } else {
          // D214: SUBJECT's grade is not any one voice's.
          if (r.failedBar === null && !subjectMode) recordBest(f.id, played, r.grade);
          // D229: a prelude reached to its end is beaten: its fugue unlocked (no seal, no feats: those are the fugues').
          if (prelude) {
            const won = recordPrelude(f.id, r.grade, r.failedBar !== null);
            setPhase({ kind: "result", ...r, seal: null, stage: { won, fugue: fugueOf(f.id) } });
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
          setPhase({ kind: "result", ...r, her: !!h, seal: card && seal ? { kind: card.seal.kind, ...seal } : null, feats, opened });
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

  const start = () => {
    if (performance.now() - shownAt.current < 350) return;
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
  const quit = () => ((waitingHer.current = null), setLesson(null), setPhase({ kind: "title" }));
  const home = () => ((waitingHer.current = null), setLesson(null), setPhase({ kind: "home" }));
  /** D233: a piece chosen (HOME's CONTINUE, the wheel): its title card (from its start unless it is the piece already chosen). */
  const open = (piece: string) => {
    if (piece !== pick.piece) setPick({ piece, share: 0, voice: -1 });
    setWheel(false);
    setPhase({ kind: "title" });
  };
  const beginLesson = (pl: Platform, n: number) => {
    const l = TRACKS[pl][n];
    // D225: the lesson's mode (D233: the platform stays as guessed or set; the lesson's mode decides the play).
    setAsking(false);
    if (pl === platform) setPick({ proto: l.mode });
    setLesson({ pl, n, run: l.run() });
    setPhase({ kind: "talk", lines: l.intro, next: "play" });
  };
  const talkDone = (next: "play" | "again" | "advance") => {
    if (next !== "advance") return start();
    if (lesson && lesson.n + 1 < TRACKS[lesson.pl].length) return beginLesson(lesson.pl, lesson.n + 1);
    quit();
  };
  /** The subject, played to be heard (lesson 5): the piece's first entry, at the lesson's tempo. */
  const demo = (l: Line) => {
    if (l.demo !== "subject") return;
    const ch = ensureChip();
    const e = f.entries[0];
    if (!e) return;
    const tps = (f.tpq * bpm) / 60;
    const t0 = ch.ctx.currentTime + 0.3;
    for (const [on, dur, midi] of e.notes) ch.note(midi, t0 + (on - e.on) / tps, (dur / tps) * 0.95, voicing(e.voice, f.voices.length, true), { lead: true });
  };

  const events: ThumbEvents = {
    down: (id, side, x, y, w, h, ts) => game.current?.down(id, { side, x, y, w, h }, ts),
    move: (id, x, y, w, h, ts) => game.current?.move(id, { side: "left", x, y, w, h }, ts),
    up: (id, ts, cancelled) => {
      const g = game.current;
      if (g) return g.up(id, ts);
      // A touch the system took back (pointercancel) starts nothing (D191: nor sound outside a gesture on iOS).
      if (!cancelled && (phase.kind === "title" || phase.kind === "result")) start();
    },
  };

  // A MIDI keyboard (where the browser has Web MIDI: Chrome, Edge, Firefox; not Safari).
  const keyDownRef = useRef<(id: number, k: KeyPress, ts: number) => void>(() => {});
  keyDownRef.current = (id, k, ts) => {
    const g = game.current;
    if (g) g.keyDown(id, k, ts);
    else if (phase.kind === "title" || phase.kind === "result") start();
  };
  useEffect(() => {
    const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> };
    // MIDI: a computer's (D182).
    if (!nav.requestMIDIAccess || platform !== "computer") return setMidi([]);
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
      if (asking || phase.kind === "home" || wheel || tgt?.closest("input, select, textarea") || (phase.kind !== "play" && tgt?.closest("button") && (e.code === "Space" || e.code === "Enter"))) return;
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
      if (!g && phase.kind !== "title" && phase.kind !== "result") return;
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
  const scaleOn = proto.id === "keys" && pick.keys === "scale";
  const away = phase.kind === "title" || phase.kind === "result";
  const layout = proto.layout;
  const wide = layout === "wide" || layout === "bars" || layout === "desk";
  const own = (playing && (layout === "full" || layout === "bars") ? ` tb-${layout}` : "") + ` tb-proto-${proto.id}` + (roadAlone(proto, playing) ? " tb-road" : "");

  return (
    <div className={`tg-app${wide ? " tg-wide" : ""}${own}${playing ? "" : " tg-away"}`}>
      <MusicBox
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">{lesson ? `LESSON ${lesson.n + 1} · ${TRACKS[lesson.pl][lesson.n].english}` : `BENCH · ${proto.name}`}</span>
            <span className="tg-hud-bar">{keyName(frame.current.key)}</span>
            {(playing || lesson) && (
              <button type="button" id="quit" className="tg-x" aria-label="Quit" onClick={quit}>
                ✕
              </button>
            )}
          </>
        }
        legend={f.voiceNames.map((name, i) => (
          <span key={name} style={{ color: inkOf(i, f.voices.length), opacity: played.includes(i) ? 1 : 0.55 }}>
            ■ {name.toUpperCase()}
          </span>
        ))}
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        {phase.kind === "title" && (
          <Title
            f={f}
            pick={pick}
            setPick={setPick}
            from={from}
            note={note}
            herHere={herHere}
            her={kimiko ? herLine(hm ? herState(hm) : null) : undefined}
            play={start}
            to={{ home, settings: () => setPhase({ kind: "settings" }), help: () => setPhase({ kind: "help" }), learn: TRACKS[platform].some((l) => l.mode === proto.id) ? () => setPhase({ kind: "lessons", focus: proto.id }) : undefined }}
          />
        )}
        {phase.kind === "talk" && lesson && (
          <BachTalk key={`${lesson.n}-${phase.next}-${phase.lines[0]?.text}`} title={`${TRACKS[lesson.pl][lesson.n].title} · ${TRACKS[lesson.pl][lesson.n].english}`} lines={phase.lines} onLine={demo} onDone={() => talkDone(phase.next)} />
        )}
        {phase.kind === "result" && (
          <div className="tg-card tg-card-low tb-result">
            {phase.failedBar !== null ? (
              <h1 className="tb-grade tb-failed">THE CROWD LEFT</h1>
            ) : (
              <h1 className={`tb-grade${phase.grade === "S" || phase.grade === "A" ? " tg-gold" : ""}`}>{phase.grade}</h1>
            )}
            {phase.failedBar !== null ? <p className="tg-card-sub">BAR {phase.failedBar}</p> : <p className="tb-stars">{"★".repeat(phase.stars) + "☆".repeat(5 - phase.stars)}</p>}
            <p className="tb-score">{phase.score.toLocaleString("en")}</p>
            <div className="tb-tally" aria-label="Notes">
              <span>
                <b>{Math.round((100 * phase.right) / Math.max(1, phase.of))}%</b>
                <small>
                  {phase.right}/{phase.of}
                </small>
              </span>
              <span className="tb-tally-bad">
                <b>✕ {phase.wrong}</b>
                <small>WRONG</small>
              </span>
              <span className="tb-tally-bad">
                <b>{phase.missed}</b>
                <small>MISSED</small>
              </span>
              {phase.entries > 0 && (
                <span>
                  <b>◆ {phase.captured}/{phase.entries}</b>
                  <small>ENTRIES</small>
                </span>
              )}
              <span>
                <b>{phase.maxStreak}</b>
                <small>BEST RUN</small>
              </span>
            </div>
            {phase.art && <p className="tg-card-sub">{artLine(phase.art)}</p>}
            {phase.seal && (
              <p className={`tb-result-seal${phase.seal.earned ? " earned" : ""}`}>
                {phase.seal.earned ? `◆ SEAL EARNED · ${phase.seal.kind}` : `◇ ${phase.seal.kind} · ${phase.seal.why.toUpperCase()}`}
              </p>
            )}
            {phase.her && <p className="tg-card-sub tb-her-credit">{HER_CREDIT}</p>}
            {phase.stage && (
              <p className={`tb-result-seal tb-stage-line${phase.stage.won ? " earned" : ""}`}>{phase.stage.won ? "PRELUDE BEATEN · FUGUE UNLOCKED" : "🔒 BEAT THE PRELUDE TO UNLOCK ITS FUGUE"}</p>
            )}
            {phase.stage?.won && (
              <button type="button" id="to-fugue" className="tb-play tb-to-fugue" onClick={() => (setPick({ piece: phase.stage!.fugue, share: 0, voice: -1 }), setPhase({ kind: "title" }))}>
                PLAY THE FUGUE ▶
              </button>
            )}
            {phase.opened?.map((t) => (
              <p key={t} id={`tier-toast-${t.toLowerCase()}`} className={`tb-tier-toast tb-tier-${t.toLowerCase()}`} role="status">
                {t} UNLOCKED!
              </p>
            ))}
            {phase.feats && <FeatToast fresh={phase.feats} open={() => setPhase({ kind: "achievements", fresh: phase.feats })} />}
            {(phase.feats?.length || phase.seal?.earned) && <AchButton id="result-achievements" open={() => setPhase({ kind: "achievements", fresh: phase.feats })} />}
            <div className="tb-result-nav">
              <button type="button" id="again" className="tb-menu" onClick={quit}>
                MENU
              </button>
              <button type="button" id="result-home" className="tb-menu" onClick={home}>
                ⌂ HOME
              </button>
            </div>
          </div>
        )}
      </MusicBox>
      <PlayArea events={events} paint={paint} hint={away ? (proto.platform === "computer" ? "▶ PRESS ANY KEY" : phase.kind === "result" ? "▶ TAP TO PLAY AGAIN" : "▶ TAP TO START") : ""} />
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
      {phase.kind === "settings" && (
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
          {proto.id === "keys" && <Choice id="keys" label="KEYS" options={KEYS_LAYOUTS} value={pick.keys} set={(keys) => setPick({ keys })} />}
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
      {phase.kind === "home" && !asking && (
        <Home
          current={pick.piece}
          on={{ play: open, choose: () => setWheel(true), tutorial: () => setPhase({ kind: "lessons" }), achievements: () => setPhase({ kind: "achievements" }), settings: () => setPhase({ kind: "settings" }) }}
        />
      )}
      {wheel && <FuguePicker current={pick.piece} close={() => setWheel(false)} pick={open} />}
      {phase.kind === "help" && (
        <Panel title={`HOW TO PLAY · ${proto.name}`} close={back}>
          <section className="tg-help tb-help">
            <ModeHow id={proto.id} scale={scaleOn} />
            <ul className="tb-always">
              <li>
                <b>HOLD</b> the note lasts while you hold
              </li>
              <li>
                <b>✕</b> a wrong note sounds muffled
              </li>
              <li>
                <b>CROWD</b> too many slips and it leaves
              </li>
            </ul>
          </section>
        </Panel>
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
        {wide ? "Turn the phone sideways" : "Turn the phone upright"}
      </div>
    </div>
  );
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

/** D233: the title card, trimmed: the stage, the piece and its tempo, the voices, PLAY; ⌂ ⚙ ? as icons, LEARN THIS MODE where it has lessons; KIMIKO once unlocked. */
function Title({ f, pick, setPick, from, note, herHere, her, play, to }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number; note: string; herHere: boolean; her?: string; play: () => void; to: { home: () => void; settings: () => void; help: () => void; learn?: () => void } }) {
  const singing = voicesFrom(f, from);
  return (
    <div className="tg-card tg-title tb-title">
      <nav className="tb-title-icons" aria-label="Menu">
        <button type="button" id="home" className="tg-x" aria-label="Home" onClick={to.home}>
          ⌂
        </button>
        <span className="tb-stage-tag">{f.kind === "prelude" ? "STAGE 1 · PRELUDE" : paired(f.id) ? "STAGE 2 · FUGUE" : "FUGUE"}</span>
        <button type="button" id="settings" className="tg-x" aria-label="Settings" onClick={to.settings}>
          ⚙
        </button>
        <button type="button" id="help" className="tg-x" aria-label="How to play" onClick={to.help}>
          ?
        </button>
      </nav>
      <h1 className="tb-title-piece">{f.title.toUpperCase()}</h1>
      <p className="tg-card-sub">{tempoLabel(f.id)}{pick.share > 0 ? ` · FROM BAR ${barAt(f, from)}` : ""}</p>
      <div className="tg-voices" role="group" aria-label="Voice">
        {f.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={i === pick.voice ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i)} onClick={() => setPick({ voice: i })} aria-pressed={i === pick.voice}>
            {name.toUpperCase()}
          </button>
        ))}
      </div>
      {herHere && <HerSwitch pick={pick} setPick={setPick} />}
      {her && <p className="tg-card-sub tb-her">{her}</p>}
      {her && <p className="tg-card-sub tb-her-credit">{HER_CREDIT}</p>}
      {note && <p className="tg-note">{note}</p>}
      <button type="button" id="play" className="tb-play tb-title-play" onClick={play}>
        ▶ PLAY
      </button>
      {to.learn && (
        <button type="button" id="learn" className="tb-learn" onClick={to.learn}>
          LEARN THIS MODE
        </button>
      )}
    </div>
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

/** "♩. = 53": a fugue's tempo in its own beat (D199, D204). */
function tempoLabel(id: string): string {
  const t = TEMPO[id];
  return t ? `${t.unit} = ${t.unitBpm.normal}` : `♩ = ${tempoOf(id)}`;
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
