/**
 * The testbench (D170; D175; D178; D179-D180): prototypes of the instrument tried on the game itself,
 * judged. ⚙ chooses the prototype (protos.ts), the piece (D192: a wheel of the fugues' cards,
 * FuguePicker.tsx), the ensemble
 * (sound.ts), the tuning (tuning.ts) and the sound's delay; the title the voice and where to start; ?
 * says how each is played. Each prototype lays the screen out its own way. A computer's keys and a MIDI
 * keyboard play too. D219: a phone's modes LADDER and SUBJECT, each WITH KIMIKO ISHIZAKA as a switch
 * (her recording the only accompaniment, the player's voice on its own sound); failing always on; TUNING
 * and LAB folded into one button each; every mode's rules drawn (ModeDiagram.tsx).
 */
import { ornamentMark, ornamentsOf } from "../touch/ornament-play.ts";
import { BachTalk } from "./Bach.tsx";
import { accuracy, passed, TRACKS, type Line, type Run } from "./lessons.ts";
import { answer, askFirst, nextLesson, recordLesson } from "./tutorial.ts";
import { LessonMap, PlayedBefore, TutorialButton } from "./LessonMap.tsx";
import { TEMPO, tempoOf } from "../touch/tempi.ts";
import { presetById, setPreset } from "../touch/sound.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { ladderGeometry, MusicBox, inkOf, type Frame } from "../touch/MusicBox.tsx";
import { AUTO, BOXV, variantRows } from "../touch/box-variants.ts";
import { uiRows } from "../touch/ui/index.ts";
import { InterfaceFold } from "./InterfaceFold.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "../touch/PlayArea.tsx";
import { Choice, loadDrums, Panel, SoundSetting, Tapper } from "../touch/Panels.tsx";
import { HeadphonesFold, useHeadphones } from "./Headphones.tsx";
import { Chip, voicing } from "../touch/chip.ts";
import { barAt, beatOf, fugueById, keyAt, keyName, type TouchFugue, fugueOnly, cadenceName } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { setTuning } from "../touch/tuning.ts";
import { accompaniment, startTick, stepRange, subjectMarks, entrySpans, voicesFrom } from "../touch/voice-mode.ts";
import { paintProto } from "./paint-proto.ts";
import { ProtoGame, type KeyPress } from "./proto-game.ts";
import { lineKey, subjectLine } from "./subject-line.ts";
import { FuguePicker, PieceButton } from "./FuguePicker.tsx";
import { LabSettings } from "./LabSettings.tsx";
import { TuningFold } from "./TuningFold.tsx";
import { ModeDiagram } from "./ModeDiagram.tsx";
import { herClock, herMap } from "./her-clock.ts";
import { Her, HER_FADE, herBuffer, herState, loadHer, releaseHer } from "./with-her.ts";
import { cardById, readBest, recordBest } from "./cards.ts";
import { judgeSeal, readSeals, recordSeal } from "./seals.ts";
import { earnFeats, type FeatId } from "./feats.ts";
import { AchButton, Achievements, FeatToast } from "./Achievements.tsx";
import { artLine, type ArtStats } from "./articulation.ts";
import { ARROW_KEYS, arrowOf, EASY_LEVELS, KEY_ROWS, type EasyLevel, keyId, keyRow, menuOf, midiId, moveOf, PROTOS, protoById, roadAlone, takesHer, type Platform, type ProtoId } from "./protos.ts";

const PICK_KEY = "tb-pick-v2";
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
  /** EASY's level (D187). */
  easy: EasyLevel;
  /** D219: WITH KIMIKO ISHIZAKA (LADDER and SUBJECT, where her recording exists). */
  her: boolean;
  /** D216, KIMIKO: the player's own notes over her recording: a little under her, softer, or silent (judged only). */
  mine: Mine;
}
type Mine = "on" | "soft" | "off";
/** D216: YOUR VOICE's levels (the player's notes' gain; 1 elsewhere). */
const MINE: Record<Mine, number> = { on: 0.75, soft: 0.4, off: 0 };
const DEFAULT: Pick = { proto: "ladder", piece: "wtc1f02", voice: 1, share: 0, legato: false, easy: "direction", her: false, mine: "on" };

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
  const piece = fugueOnly(fugueById(p.piece).id === p.piece ? p.piece : DEFAULT.piece);
  const f = fugueById(piece);
  const share = Math.min(0.99, Math.max(0, p.share || 0));
  const singing = voicesFrom(f, startTick(f, share));
  const voice = singing.includes(p.voice) ? p.voice : singing[Math.min(1, singing.length - 1)];
  // D219: a stored mode withdrawn (HIGHWAY, TWO VOICES, KIMIKO on a phone) falls back to LADDER; a stored KIMIKO as LADDER WITH KIMIKO.
  const was = p.proto as string;
  const proto = PROTOS.some((x) => x.id === was) ? p.proto : DEFAULT.proto;
  const { voice2: _v2, fail: _fail, ...rest } = p as Pick & { voice2?: number; fail?: boolean };
  return { ...DEFAULT, ...rest, piece, share, voice, proto, legato: !!p.legato, easy: EASY_LEVELS.some(([l]) => l === p.easy) ? p.easy : DEFAULT.easy, her: was === "kimiko" || p.her === true, mine: p.mine in MINE ? p.mine : DEFAULT.mine };
}

type Phase = { kind: "title" } | { kind: "play" } | { kind: "result"; her?: boolean; right: number; wrong: number; missed: number; stray: number; of: number; score: number; grade: string; captured: number; entries: number; maxStreak: number; stars: number; failedBar: number | null; art?: ArtStats; seal: { kind: string; earned: boolean; why: string } | null; feats?: FeatId[] } | { kind: "settings" } | { kind: "achievements"; fresh?: FeatId[] } | { kind: "lessons"; focus?: ProtoId } | { kind: "help" } | { kind: "talk"; lines: Line[]; next: "play" | "again" | "advance" };

/** The computer's keys (D182: a computer's prototypes only): PIANO a keyboard's rows (A W S E D F T G Y H U J K O L P ;), Z and X the octave; EASY every row (protos.ts KEY_ROWS) and space, Shift the pedal, the arrows a bend. */
const PIANO_KEYS = ["KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG", "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK", "KeyO", "KeyL", "KeyP", "Semicolon"];

export function BenchApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
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
  const [midi, setMidi] = useState("");
  // D182: mobile or computer, chosen on the first screen (and in the settings).
  // D211: asked every time the game opens (not remembered): one person plays on both.
  const [platform, setPlatformRaw] = useState<Platform | null>(null);
  const setPlatform = (pl: Platform) => {
    setPlatformRaw(pl);
    if (protoById(pick.proto).platform !== pl) setPick({ proto: menuOf(pl)[0].id });
  };
  // D225: Herr Bach's HAVE YOU PLAYED BEFORE?, right after the platform, until answered on it.
  const [asking, setAsking] = useState(false);
  const choosePlatform = (pl: Platform) => {
    setPlatform(pl);
    setAsking(askFirst(pl));
  };
  const [note, setNote] = useState("");
  // D192: the fugue wheel, opened from ⚙. D226: and on opening the game, once the platform is
  // chosen (and Herr Bach's question answered): no piece is chosen for the player.
  const [wheel, setWheel] = useState(false);
  const [choosing, setChoosing] = useState(true);
  // D188: a lesson with Herr Bach plays its own passage, on EASY at the lesson's level.
  // D225: a lesson of a platform's track (TRACKS), in its own mode.
  const [lesson, setLesson] = useState<{ pl: Platform; n: number; run: Run } | null>(null);
  const run = lesson?.run;
  const f = fugueById(run?.piece ?? pick.piece);
  const proto = protoById(run ? run.proto : pick.proto);
  const from = run ? run.from : startTick(f, pick.share);
  const voice = run ? run.voice : pick.voice;
  const bpm = run ? run.bpm : tempoOf(f.id);
  // D216, KIMIKO (D219: WITH KIMIKO ISHIZAKA, a switch in LADDER and SUBJECT): the player over Kimiko
  // Ishizaka's recording, the game on her time; only where she is timed (whatever pieces
  // data/recordings/ishizaka-ticks.json holds); her track let go when the switch or the piece is left.
  const herHere = takesHer(proto.id) && !run && !!herMap(f.id);
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
  const octave = useRef(0);

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

  useEffect(wantHer, [phase.kind, f.id, hm, platform]);

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
    const g = new ProtoGame(f, played, from, proto, { bpm, legato: pick.legato, easy: run?.easy ?? pick.easy, fail: run ? run.fail : true, her: kimiko, bt: hp.btFor(lag), ...(run ? { until: run.until, wait: run.wait, solo: run.solo } : {}), ...(clock ? { clock } : {}) }, ch);
    const h = hm && herBuf ? new Her(ch, hm) : null;
    if (h && herBuf) h.begin(g, herBuf);
    // For the measurements (the bench's own checks): the game and her playing.
    (globalThis as { __kimiko?: unknown }).__kimiko = h ? { g, her: h, ctx: ch.ctx, map: hm } : undefined;
    g.octave = octave.current;
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
          // D196: the fugue's seal, judged over the whole run.
          const card = cardById(f.id);
          const seal = card
            ? judgeSeal(card, { f, tracks: subjectMode ? played.map((v) => ({ voice: v, notes: g.tracks.flatMap((t) => t.notes).filter((n) => n.voice === v).sort((a, c) => a.on - c.on) })) : g.tracks.map((t) => ({ voice: t.voice, notes: t.notes })), entries: g.entries, beat: b.ticks, grade: r.grade, tuning: tuning.id, whole: from === 0 && r.failedBar === null })
            : null;
          if (seal?.earned) recordSeal(f.id, played);
          // D224: the feats, judged over the run and what is kept.
          const feats = earnFeats({ piece: f.id, mode: proto.id, whole: from === 0 && r.failedBar === null, ...r, strettos: g.strettoState.filter((s) => s === "cleared").length, her: !!h, tuning: hm ? "equal" : tuning.id }, readBest(), readSeals());
          setPhase({ kind: "result", ...r, her: !!h, seal: card && seal ? { kind: card.seal.kind, ...seal } : null, feats });
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
  const beginLesson = (pl: Platform, n: number) => {
    const l = TRACKS[pl][n];
    // D225: the lesson's platform and mode (the title card after it is that mode's).
    setPlatformRaw(pl);
    setAsking(false);
    setPick({ proto: l.mode });
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
    if (!nav.requestMIDIAccess || platform !== "computer") return;
    let access: MIDIAccess | null = null;
    // D191: a promise resolving after the effect is gone (StrictMode, a quick switch of platform)
    // attaches nothing, and a device plugged in later re-attaches nothing.
    let alive = true;
    const listen = () => {
      if (!alive) return;
      const names: string[] = [];
      access?.inputs.forEach((input) => {
        names.push(input.name ?? "MIDI");
        input.onmidimessage = (e: MIDIMessageEvent) => {
          const [st, n, vel] = e.data ?? [];
          const kind = st & 0xf0;
          if (kind === 0x90 && vel > 0) keyDownRef.current(midiId(n), { midi: n, velocity: vel / 127, side: n < 60 ? "left" : "right" }, e.timeStamp);
          else if (kind === 0x80 || (kind === 0x90 && vel === 0)) game.current?.keyUp(midiId(n), e.timeStamp);
        };
      });
      setMidi(names.join(", "));
    };
    nav
      .requestMIDIAccess()
      .then((a) => {
        if (!alive) return;
        access = a;
        listen();
        a.onstatechange = listen;
      })
      .catch(() => alive && setMidi(""));
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
    if (platform !== "mobile") return;
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
  }, [platform, proto.layout, phase.kind]);

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
      if (proto.id === "piano") {
        const i = PIANO_KEYS.indexOf(e.code);
        if (i < 0) return null;
        const g = game.current;
        const base = g ? g.kb.lo - (((g.kb.lo % 12) + 12) % 12) : 60;
        return { midi: base + 12 * octave.current + i, velocity: 0.6 };
      }
      if (proto.id === "arrows") {
        const a = ARROW_KEYS[e.code];
        return a ? { side: e.code.startsWith("Key") ? "left" : "right", move: moveOf(a), velocity: 0.6 } : null;
      }
      if (e.code === "Space") return { velocity: 0.5, code: "Space" };
      const r = keyRow(e.code);
      return r < 0 ? null : { velocity: KEY_ROWS[r].dyn, trill: KEY_ROWS[r].trill, code: e.code };
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape" && phase.kind === "play") return quit();
      // Keys meant for a control (the FROM slider; space or enter on a button off the game) or the
      // first screen are theirs (D184).
      const tgt = e.target instanceof Element ? e.target : null;
      if (!platform || asking || (choosing && phase.kind === "title") || (wheel && phase.kind === "settings") || tgt?.closest("input, select, textarea") || (phase.kind !== "play" && tgt?.closest("button") && (e.code === "Space" || e.code === "Enter"))) return;
      const g = game.current;
      if (proto.id === "piano" && (e.code === "KeyZ" || e.code === "KeyX")) {
        octave.current += e.code === "KeyZ" ? -1 : 1;
        if (g) g.octave = octave.current;
        return;
      }
      if (proto.id === "keys" && g) {
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") return g.pedal(true);
        if (e.code === "ArrowUp" || e.code === "ArrowDown") return (e.preventDefault(), g.bendHeld(e.code === "ArrowUp" ? 60 : -60));
        // TIMING: space a note, or the swoosh while one sounds; DIRECTION: space the repeated note.
        if (e.code === "Space" && phase.kind === "play" && !e.repeat && (run?.easy ?? pick.easy) === "timing") {
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
            {playing || lesson ? (
              <button type="button" id="quit" className="tg-x" aria-label="Quit" onClick={quit}>
                ✕
              </button>
            ) : (
              <>
                <button type="button" id="settings" className="tg-x" aria-label="Settings" onClick={() => setPhase({ kind: "settings" })}>
                  ⚙
                </button>
                <button type="button" id="help" className="tg-x" aria-label="How to play" onClick={() => setPhase({ kind: "help" })}>
                  ?
                </button>
              </>
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
        {phase.kind === "title" && <Title f={f} pick={pick} setPick={setPick} from={from} note={note} herHere={herHere} her={kimiko ? herLine(hm ? herState(hm) : null) : undefined} learn={platform && TRACKS[platform].some((l) => l.mode === proto.id) ? () => setPhase({ kind: "lessons", focus: proto.id }) : undefined} achievements={() => setPhase({ kind: "achievements" })} />}
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
              <span>
                <b>◆ {phase.captured}/{phase.entries}</b>
                <small>ENTRIES</small>
              </span>
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
            {phase.feats && <FeatToast fresh={phase.feats} open={() => setPhase({ kind: "achievements", fresh: phase.feats })} />}
            {(phase.feats?.length || phase.seal?.earned) && <AchButton id="result-achievements" open={() => setPhase({ kind: "achievements", fresh: phase.feats })} />}
            <button type="button" id="again" className="tb-menu" onClick={quit}>
              MENU
            </button>
          </div>
        )}
      </MusicBox>
      <PlayArea events={events} paint={paint} hint={away ? (platform === "computer" ? "▶ PRESS ANY KEY" : phase.kind === "result" ? "▶ TAP TO PLAY AGAIN" : "▶ TAP TO START") : ""} />
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
        <Panel title="SETTINGS" close={quit}>
          <div className="tg-grid3 tb-modes" role="group" aria-label="Mode">
            {menuOf(platform ?? "mobile").map((p) => (
              <button key={p.id} type="button" id={`proto-${p.id}`} className={p.id === pick.proto ? "on" : ""} onClick={() => setPick({ proto: p.id })} aria-pressed={p.id === pick.proto}>
                {p.name}
              </button>
            ))}
          </div>
          <div className="tb-how">
            <ModeDiagram id={proto.id} />
            <ol className="tb-rules">
              {proto.how.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ol>
          </div>
          <TutorialButton id="settings-tutorial" open={() => setPhase({ kind: "lessons" })} />
          <Choice id="platform" label="PLAY ON" options={[["mobile", "MOBILE"], ["computer", "COMPUTER"]]} value={platform ?? "mobile"} set={(pl) => setPlatform(pl)} />
          {(proto.id === "keys" || proto.id === "subject") && <Choice id="easy" label="LEVEL" options={EASY_LEVELS} value={pick.easy} set={(easy) => setPick({ easy })} />}
          {(proto.id === "keys" || proto.id === "subject") && <p className="tg-panel-note tb-note">{EASY_NOTE[pick.easy]}</p>}
          {herHere && <HerSwitch pick={pick} setPick={setPick} />}
          <PieceButton id={pick.piece} open={() => setWheel(true)} />
          <SoundSetting key={kimiko ? "her" : "all"} value={soundNow} set={setSound} />
          {kimiko && <p className="tg-panel-note tb-note">WITH KIMIKO: this sets your voice only (TRAVERSO by default).</p>}
          <InterfaceFold frame={frame.current} />
          <TuningFold id={tuning.id} a={tuning.a} set={changeTuning} />
          {kimiko && <p className="tg-panel-note tb-note">WITH KIMIKO: equal temperament at her A during the game.</p>}
          <LabSettings />
          <HeadphonesFold hp={hp} lag={lag} setLag={setLag} chip={ensureChip} />
          {platform === "computer" && (
            <div className="tg-set">
              <span>MIDI</span>
              <span className="tg-panel-val">{midi || "NONE FOUND"}</span>
            </div>
          )}
        </Panel>
      )}
      {choosing && platform && !asking && !lesson && phase.kind === "title" && (
        <FuguePicker
          current={pick.piece}
          pick={(piece) => {
            setPick({ piece, share: 0, voice: -1 });
            setChoosing(false);
          }}
        />
      )}
      {wheel && phase.kind === "settings" && (
        <FuguePicker
          current={pick.piece}
          close={() => setWheel(false)}
          pick={(piece) => {
            setPick({ piece, share: 0, voice: -1 });
            setWheel(false);
            quit();
          }}
        />
      )}
      {phase.kind === "help" && (
        <Panel title="HOW TO PLAY" close={quit}>
          <section className="tg-help tb-help">
            <ul className="tb-always">
              <li>
                <b>HOLD</b> the note lasts while you hold
              </li>
              <li>
                <b>NEXT BEFORE LETTING GO</b> legato · more points
              </li>
              <li>
                <b>✕</b> a wrong note sounds muffled · not counted
              </li>
              <li>
                <b>CROWD</b> too many slips and it leaves
              </li>
            </ul>
            {menuOf(platform ?? "mobile").map((p) => (
              <div key={p.id} className="tb-help-mode">
                <h2>{p.name}</h2>
                <ModeDiagram id={p.id} />
                <ol className="tb-rules">
                  {p.how.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ol>
              </div>
            ))}
            {platform !== "computer" && (
              <div className="tb-help-mode">
                <h2>WITH KIMIKO ISHIZAKA</h2>
                <ol className="tb-rules">
                  <li>A switch in LADDER and SUBJECT, on the Book I fugues she recorded.</li>
                  <li>Her piano is the only accompaniment; the notes land when she plays them.</li>
                  <li>YOUR VOICE: ON, SOFT, or OFF (silent, still scored).</li>
                </ol>
              </div>
            )}
            <h2>⚙</h2>
            <ol className="tb-rules">
              <li>SOUND · TUNING · LAB · SOUND DELAY</li>
              <li>Late with headphones? SOUND DELAY → SET BY TAPPING.</li>
            </ol>
          </section>
        </Panel>
      )}
      {phase.kind === "achievements" && <Achievements close={quit} tab={phase.fresh?.length ? "feats" : "seals"} fresh={phase.fresh} />}
      {phase.kind === "lessons" && <LessonMap platform={platform ?? guessPlatform()} focus={phase.focus} play={beginLesson} close={quit} />}
      {platform && asking && (
        <PlayedBefore
          answer={(yes) => {
            answer(platform, yes);
            setAsking(false);
            if (!yes) beginLesson(platform, nextLesson(platform));
          }}
        />
      )}
      {!platform && phase.kind !== "lessons" && (
        <div className="tb-platform" role="dialog" aria-label="Play on">
          <h1>THE WELL-TEMPERED BENCH</h1>
          <p className="tb-platform-q">PLAY ON</p>
          <div className="tb-platform-choices">
            <button type="button" id="platform-mobile" onClick={() => choosePlatform("mobile")}>
              <span className="tb-platform-icon">▯</span>
              MOBILE
              <small>LADDER · SUBJECT</small>
            </button>
            <button type="button" id="platform-computer" onClick={() => choosePlatform("computer")}>
              <span className="tb-platform-icon">⌨</span>
              COMPUTER
              <small>HIGHWAY · LADDER · PIANO</small>
            </button>
          </div>
          <TutorialButton open={() => setPhase({ kind: "lessons" })} />
        </div>
      )}
      <div className="tg-upright" role="alert">
        {wide ? "Turn the phone sideways" : "Turn the phone upright"}
      </div>
    </div>
  );
}

/** D225: the LESSON MAP opened before a platform is chosen: a touch screen's, else a computer's. */
function guessPlatform(): Platform {
  try {
    return window.matchMedia("(pointer: coarse)").matches ? "mobile" : "computer";
  } catch {
    return "computer";
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

/** D219: EASY's levels, one line each. */
const EASY_NOTE: Record<EasyLevel, string> = {
  timing: "TIMING: any lane, on time.",
  direction: "DIRECTION: right when the tune rises, left when it falls.",
  leaps: "+ LEAPS: and a leap skips a lane.",
  exact: "EXACT LANES: only the lane drawn.",
};

/** D219: WITH KIMIKO ISHIZAKA (LADDER, SUBJECT; where her recording exists), and then YOUR VOICE. */
function HerSwitch({ pick, setPick }: { pick: Pick; setPick: (p: Partial<Pick>) => void }) {
  return (
    <>
      <Choice id="her" label="WITH KIMIKO ISHIZAKA" options={[["on", "ON"], ["off", "OFF"]]} value={pick.her ? "on" : "off"} set={(v) => setPick({ her: v === "on" })} />
      {pick.her && <Choice id="mine" label="YOUR VOICE" options={[["on", "ON"], ["soft", "SOFT"], ["off", "OFF"]]} value={pick.mine} set={(mine) => setPick({ mine })} />}
    </>
  );
}

function Title({ f, pick, setPick, from, note, herHere, her, learn, achievements }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number; note: string; herHere: boolean; her?: string; learn?: () => void; achievements: () => void }) {
  const singing = voicesFrom(f, from);
  const proto = protoById(pick.proto);
  return (
    <div className="tg-card tg-title">
      <h1>{proto.name}</h1>
      <p className="tb-short">{proto.short}</p>
      <ModeDiagram id={proto.id} />
      {proto.platform === "mobile" && <p className="tb-hold">{proto.layout === "full" ? "▯ UPRIGHT" : "▭ SIDEWAYS"}</p>}
      <p className="tg-card-sub">
        {f.title.toUpperCase()} · {tempoLabel(f.id)}
      </p>
      {proto.id === "subject" ? (
        <p className="tg-card-sub">◆ {subjectLine(f, from).entries.length} ENTRIES FROM HERE</p>
      ) : (
      <div className="tg-voices" role="group" aria-label="Voice">
        {f.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={i === pick.voice ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i)} onClick={() => setPick({ voice: i })} aria-pressed={i === pick.voice}>
            {name.toUpperCase()}
          </button>
        ))}
      </div>
      )}
      <From f={f} pick={pick} setPick={setPick} from={from} />
      {herHere && <HerSwitch pick={pick} setPick={setPick} />}
      {her && <p className="tg-card-sub tb-her">{her}</p>}
      {her && <p className="tg-card-sub tb-her-credit">{HER_CREDIT}</p>}
      {note && <p className="tg-note">{note}</p>}
      {learn && (
        <button type="button" id="learn" className="tb-learn" onClick={learn}>
          LEARN THIS MODE
        </button>
      )}
      <AchButton open={achievements} />
    </div>
  );
}

function From({ f, pick, setPick, from }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number }) {
  return (
    <label className="tg-from">
      <span>
        FROM {Math.round(pick.share * 100)}% · BAR {barAt(f, from)}
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
