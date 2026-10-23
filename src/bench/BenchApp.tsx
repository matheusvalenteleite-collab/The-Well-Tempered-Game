/**
 * The testbench (D170; D175; D178; D179-D180): prototypes of the instrument tried on the game itself,
 * judged. ⚙ chooses the prototype (protos.ts), the piece (D192: a wheel of the fugues' cards,
 * FuguePicker.tsx), the ensemble
 * (sound.ts), the tuning (tuning.ts) and the sound's delay; the title the voice (TWO VOICES: two, as
 * an arcade's 1P and 2P) and where to start; ? says how each is played. Each prototype lays the screen
 * out its own way. A computer's keys and a MIDI keyboard play too.
 */
import { ornamentMark, ornamentsOf } from "../touch/ornament-play.ts";
import { BachTalk } from "./Bach.tsx";
import { LESSONS, lessonsPassed, passLesson, type Line, type Run } from "./lessons.ts";
import { TEMPO, tempoOf } from "../touch/tempi.ts";
import { presetById, setPreset } from "../touch/sound.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { ladderGeometry, MusicBox, inkOf, type Frame } from "../touch/MusicBox.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "../touch/PlayArea.tsx";
import { Choice, LagSetting, loadDrums, Panel, SoundSetting, TuningSetting } from "../touch/Panels.tsx";
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
import { lab } from "../touch/subject-fx.ts";
import { herClock, herMap } from "./her-clock.ts";
import { Her, herState, loadHer, releaseHer } from "./with-her.ts";
import { cardById, recordBest } from "./cards.ts";
import { judgeSeal, recordSeal } from "./seals.ts";
import { ARROW_KEYS, arrowOf, EASY_LEVELS, KEY_ROWS, type EasyLevel, keyId, keyRow, midiId, moveOf, PROTOS, protoById, type Platform, type ProtoId } from "./protos.ts";

const PICK_KEY = "tb-pick-v2";
const LAG_KEY = "tg-lag";
// D203: a new key, so that every player starts on the fugue's own sound.
// D208: a new key, so every player starts on the sampled harpsichord.
const SOUND_KEY = "tg-sound-v3";
const DEFAULT_SOUND = "harpsichordSampled";
const TUNING_KEY = "tg-tuning";

interface Pick {
  proto: ProtoId;
  piece: string;
  voice: number;
  /** TWO VOICES: the second (2P). */
  voice2: number;
  share: number;
  /** Unused since D208 (SIDEWAYS withdrawn). */
  legato: boolean;
  /** EASY's level (D187). */
  easy: EasyLevel;
  /** D198: a run fails when the crowd is lost. */
  fail: boolean;
}
const DEFAULT: Pick = { proto: "ladder", piece: "wtc1f02", voice: 1, voice2: 0, share: 0, legato: false, easy: "direction", fail: true };

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
  const voice2 = singing.includes(p.voice2) && p.voice2 !== voice ? p.voice2 : (singing.find((v) => v !== voice) ?? voice);
  return { ...DEFAULT, ...p, piece, share, voice, voice2, proto: protoById(p.proto).id, legato: !!p.legato, easy: EASY_LEVELS.some(([l]) => l === p.easy) ? p.easy : DEFAULT.easy, fail: p.fail !== false };
}

type Phase = { kind: "title" } | { kind: "play" } | { kind: "result"; her?: boolean; right: number; wrong: number; missed: number; stray: number; of: number; score: number; grade: string; captured: number; entries: number; maxStreak: number; stars: number; failedBar: number | null; seal: { kind: string; earned: boolean; why: string } | null } | { kind: "settings" } | { kind: "help" } | { kind: "talk"; lines: Line[]; next: "play" | "again" | "advance" };

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
  const setLag = (l: number | null) => {
    setLagRaw(l);
    save(LAG_KEY, l);
    if (chip.current) chip.current.lag = l;
  };
  const [sound, setSoundRaw] = useState<string>(() => load<string>(SOUND_KEY, DEFAULT_SOUND));
  const setSound = (id: string) => {
    setSoundRaw(id);
    save(SOUND_KEY, id);
  };
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
    if (protoById(pick.proto).platform !== pl) setPick({ proto: PROTOS.find((p) => p.platform === pl)!.id });
  };
  const [note, setNote] = useState("");
  // D192: the fugue wheel, opened from ⚙.
  const [wheel, setWheel] = useState(false);
  // D188: a lesson with Herr Bach plays its own passage, on EASY at the lesson's level.
  const [lesson, setLesson] = useState<{ n: number; run: Run } | null>(null);
  const run = lesson?.run;
  const f = fugueById(run?.piece ?? pick.piece);
  const proto = protoById(run ? "keys" : pick.proto);
  const from = run ? run.from : startTick(f, pick.share);
  const voice = run ? run.voice : pick.voice;
  const bpm = run ? run.bpm : tempoOf(f.id);
  // D215, E3 WITH ISHIZAKA (⚙ LAB): her recording under a good run, the game on her time; not in the
  // lessons (they wait for each note); only where she is timed (the seven Book I fugues of the testbench).
  const herAsked = lab().ishizaka && !run;
  const hm = herAsked ? herMap(f.id) : null;
  const [, herLoaded] = useState(0);
  const her = useRef<Her | null>(null);
  /** Her track fetched and decoded (once a sound exists to decode it into); the title card follows. */
  const wantHer = () => {
    const ch = chip.current;
    if (!hm) return releaseHer();
    if (!ch) return;
    if (herState(hm) === "none") herLoaded((n) => n + 1);
    void loadHer(hm, ch.ctx).then(() => herLoaded((n) => n + 1));
  };
  useEffect(() => {
    setPreset(presetById(sound).id);
  }, [sound]);

  const duo = proto.id === "duo";
  // D214, SUBJECT: every voice has the subject in turn.
  const subjectMode = proto.id === "subject";
  const played = duo ? [voice, pick.voice2] : subjectMode ? f.voices.map((_, i) => i) : [voice];
  // LADDER: the box fills its height with the voice's range, so its rows are as tall as can be.
  const range = useMemo(() => {
    if (proto.id !== "ladder") return stepRange(f);
    const steps = f.voices[voice].map((n) => n[3]);
    return { lo: Math.min(...steps) - 1, hi: Math.max(...steps) + 1 };
  }, [f, proto.id, voice]);
  // A lesson's passage: only the entries it holds (alone: only the voice's own).
  const marks = useMemo(() => {
    const spans = entrySpans(f).filter((e) => !run || (e.on < run.until && e.end > run.from && (!run.solo || e.voice === run.voice)));
    const cadences = (f.cadences ?? []).filter((c) => !run || (c.on >= run.from && c.on <= run.until)).map((c) => ({ on: c.on, text: cadenceName(c) }));
    const ornaments = new Map([...ornamentsOf(f)].map(([k, o]) => [k, ornamentMark(o)]));
    return { ...subjectMarks(f), spans, names: f.voiceNames, cadences, ornaments };
  }, [f, run]);
  const chip = useRef<Chip | null>(null);
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
      ...(proto.id === "ladder" ? { spill: stepRange(f) } : {}),
      voice,
      notes: line ? line.notes.map(([on, dur, midi, step, v]) => ({ on, dur, midi, step, long: dur >= b.ticks, state: "pending" as const, voice: v })) : lane(voice),
      ...(duo ? { voice2: pick.voice2, notes2: lane(pick.voice2) } : {}),
      others: run?.solo ? [] : line ? accompaniment(f, from, -1).filter((n) => !line.keys.has(lineKey(n.voice, n.on, n.midi))) : accompaniment(f, from, voice).filter((n) => !played.includes(n.voice) && (!run || n.on < run.until)),
      ...marks,
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
  useEffect(prepareSound, [sound, f, voice, pick.voice2]);

  useEffect(wantHer, [phase.kind, f.id, hm, platform]);

  useEffect(() => {
    if (phase.kind !== "play" || !chip.current) return;
    // D215: on her time and at her pitch (equal temperament, her A), restored after.
    const ch = chip.current;
    const withHer = hm && herState(hm) !== "failed" ? hm : null;
    const clock = withHer ? herClock(withHer, f, from) : undefined;
    if (withHer) setTuning("equal", withHer.a);
    const g = new ProtoGame(f, played, from, proto, { bpm, legato: pick.legato, easy: run?.easy ?? pick.easy, fail: !run && pick.fail, ...(run ? { until: run.until, wait: run.wait, solo: run.solo } : {}), ...(clock ? { clock } : {}) }, ch);
    const h = withHer ? new Her(ch, withHer) : null;
    her.current = h;
    let herBuf: AudioBuffer | null = null;
    if (withHer) void loadHer(withHer, ch.ctx).then((b) => (herBuf = b));
    // For the measurements (the bench's own checks): the game and her playing.
    (globalThis as { __withHer?: unknown }).__withHer = h ? { g, her: h, ctx: ch.ctx } : undefined;
    g.octave = octave.current;
    const arrows = proto.id === "arrows" ? g.moves.map(arrowOf) : g.cues;
    game.current = g;
    paint.current = (ctx, w, h) => paintProto(ctx, w, h, g, marks.subject);
    const b = beatOf(f);
    let raf = 0;
    const loop = () => {
      const done = g.step();
      h?.frame(g, herBuf);
      frame.current = {
        now: g.now,
        tps: g.tps,
        key: g.keyNow(),
        barTicks: f.barTicks,
        beatTicks: b.ticks,
        count: f.voices.length,
        lo: range.lo,
        hi: range.hi,
        ...(proto.id === "ladder" ? { spill: stepRange(f) } : {}),
        voice,
        notes: g.notes,
        ...(duo ? { voice2: g.tracks[1].voice, notes2: g.tracks[1].notes } : {}),
        others: g.others,
        ...marks,
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
      if (count.current) count.current.textContent = g.countIn() ? String(g.countIn()) : g.combo >= 5 ? `×${g.combo}` : "";
      if (done) {
        game.current = null;
        paint.current = null;
        const r = g.results();
        if (lesson) {
          // A lesson passed (the share right, a stray strike half a note) goes on; else once more.
          const l = LESSONS[lesson.n];
          const ok = r.right / Math.max(1, r.of + r.stray / 2) >= l.passAt;
          if (ok) passLesson(lesson.n);
          setPhase({ kind: "talk", lines: ok ? l.pass : l.again, next: ok ? "advance" : "again" });
        } else {
          // D214: SUBJECT's grade is not any one voice's.
          if (r.failedBar === null && !subjectMode) recordBest(f.id, played, r.grade);
          // D196: the fugue's seal, judged over the whole run.
          const card = cardById(f.id);
          const seal = card
            ? judgeSeal(card, { f, tracks: subjectMode ? played.map((v) => ({ voice: v, notes: g.notes.filter((n) => n.voice === v) })) : g.tracks.map((t) => ({ voice: t.voice, notes: t.notes })), entries: g.entries, beat: b.ticks, grade: r.grade, tuning: tuning.id, duo, whole: from === 0 && r.failedBar === null })
            : null;
          if (seal?.earned) recordSeal(f.id, played);
          setPhase({ kind: "result", ...r, her: !!h?.startedAt, seal: card && seal ? { kind: card.seal.kind, ...seal } : null });
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
      her.current = null;
      if (withHer) setTuning(tuning.id, tuning.a);
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
    const geo = ladderGeometry(range.lo, range.hi, r.height);
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
    if (ch.ctx.state === "running") return go();
    ch.resume()
      .then(() => (ch.ctx.state === "running" ? go() : setNote("The sound is still off: tap once more.")))
      .catch(() => setNote("The sound is still off: tap once more."));
  };
  // D215: her decoded track let go on quitting (kept for a game played again from the result).
  const quit = () => (phase.kind === "play" && releaseHer(), setLesson(null), setPhase({ kind: "title" }));
  const beginLesson = (n: number) => {
    const l = LESSONS[n];
    setLesson({ n, run: l.run() });
    setPhase({ kind: "talk", lines: l.intro, next: "play" });
  };
  const talkDone = (next: "play" | "again" | "advance") => {
    if (next !== "advance") return start();
    if (lesson && lesson.n + 1 < LESSONS.length) return beginLesson(lesson.n + 1);
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
        if (game.current) her.current?.hush(game.current);
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
        if (game.current) her.current?.hush(game.current);
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
      if (!platform || tgt?.closest("input, select, textarea") || (phase.kind !== "play" && tgt?.closest("button") && (e.code === "Space" || e.code === "Enter"))) return;
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
  const own = (playing && (layout === "full" || layout === "bars") ? ` tb-${layout}` : "") + ` tb-proto-${proto.id}`;

  return (
    <div className={`tg-app${wide ? " tg-wide" : ""}${own}${playing ? "" : " tg-away"}`}>
      <MusicBox
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">{lesson ? `LESSON ${lesson.n + 1} · ${LESSONS[lesson.n].english}` : `BENCH · ${proto.name}`}</span>
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
        {phase.kind === "title" && (duo ? <Arcade f={f} pick={pick} setPick={setPick} from={from} note={note} her={herAsked ? herLine(hm ? herState(hm) : null) : undefined} /> : <Title f={f} pick={pick} setPick={setPick} from={from} note={note} her={herAsked ? herLine(hm ? herState(hm) : null) : undefined} lessons={proto.id === "keys" ? beginLesson : undefined} />)}
        {phase.kind === "talk" && lesson && (
          <BachTalk key={`${lesson.n}-${phase.next}-${phase.lines[0]?.text}`} title={`${LESSONS[lesson.n].title} · ${LESSONS[lesson.n].english}`} lines={phase.lines} onLine={demo} onDone={() => talkDone(phase.next)} />
        )}
        {phase.kind === "result" && (
          <div className="tg-card tg-card-low tb-result">
            {phase.failedBar !== null ? (
              <h1 className="tb-grade tb-failed">THE CROWD LEFT</h1>
            ) : (
              <h1 className={`tb-grade${phase.grade === "S" || phase.grade === "A" ? " tg-gold" : ""}`}>{phase.grade}</h1>
            )}
            {phase.failedBar !== null ? <p className="tg-card-sub">AT BAR {phase.failedBar} · TRY AGAIN</p> : <p className="tb-stars">{"★".repeat(phase.stars) + "☆".repeat(5 - phase.stars)}</p>}
            <p className="tb-score">{phase.score.toLocaleString("en")}</p>
            <p className="tg-card-sub">
              {Math.round((100 * phase.right) / Math.max(1, phase.of))}% · {phase.right} RIGHT · {phase.wrong} WRONG · {phase.missed} MISSED · OF {phase.of}
              {phase.stray > 0 ? ` · ${phase.stray} STRAY` : ""}
            </p>
            <p className="tg-card-sub">
              ◆ {phase.captured} OF {phase.entries} ENTRIES CAPTURED · BEST RUN {phase.maxStreak}
            </p>
            {phase.seal && (
              <p className={`tb-result-seal${phase.seal.earned ? " earned" : ""}`}>
                {phase.seal.earned ? "◆" : "◇"} SEAL · {phase.seal.kind}: {phase.seal.earned ? "EARNED" : phase.seal.why.toUpperCase()}
              </p>
            )}
            {phase.her && <p className="tg-card-sub tb-her-credit">WITH KIMIKO ISHIZAKA · THE OPEN WELL-TEMPERED CLAVIER (2015) · CC0</p>}
            <button type="button" id="again" className="tb-menu" onClick={quit}>
              MENU
            </button>
          </div>
        )}
      </MusicBox>
      <PlayArea events={events} paint={paint} hint={phase.kind === "result" ? "TAP TO PLAY AGAIN" : away ? (platform === "computer" ? "CLICK OR PRESS A KEY TO START" : "TAP HERE TO START") : ""} />
      {layout === "full" && playing && (
        <button type="button" id="quit-full" className="tg-x tb-quit" aria-label="Quit" onClick={quit}>
          ✕
        </button>
      )}
      {phase.kind === "settings" && (
        <Panel title="TESTBENCH" close={quit}>
          <div className="tg-set">
            <span>PROTOTYPE</span>
          </div>
          <div className="tg-grid3" role="group" aria-label="Prototype">
            {PROTOS.filter((p) => p.platform === (platform ?? "mobile")).map((p) => (
              <button key={p.id} type="button" id={`proto-${p.id}`} className={p.id === pick.proto ? "on" : ""} onClick={() => setPick({ proto: p.id })} aria-pressed={p.id === pick.proto}>
                {p.name}
              </button>
            ))}
          </div>
          <p className="tg-panel-note">{proto.how}</p>
          <Choice id="platform" label="PLAY ON" options={[["mobile", "MOBILE"], ["computer", "COMPUTER"]]} value={platform ?? "mobile"} set={(pl) => setPlatform(pl)} />
          <Choice id="fail" label="FAIL" options={[["on", "ON"], ["off", "NO FAIL"]]} value={pick.fail ? "on" : "off"} set={(v) => setPick({ fail: v === "on" })} />
          {(proto.id === "keys" || proto.id === "highway" || proto.id === "subject") && <Choice id="easy" label="EASY" options={EASY_LEVELS} value={pick.easy} set={(easy) => setPick({ easy })} />}
          <PieceButton id={pick.piece} open={() => setWheel(true)} />
          <SoundSetting value={sound} set={setSound} />
          <TuningSetting id={tuning.id} a={tuning.a} set={changeTuning} />
          <LagSetting lag={lag} setLag={setLag} chip={ensureChip} />
          <LabSettings />
          <div className="tg-set">
            <span>MIDI</span>
            <span className="tg-panel-val">{midi || "NONE FOUND"}</span>
          </div>
        </Panel>
      )}
      {wheel && phase.kind === "settings" && (
        <FuguePicker
          current={pick.piece}
          close={() => setWheel(false)}
          pick={(piece) => {
            setPick({ piece, share: 0, voice: -1, voice2: -1 });
            setWheel(false);
            quit();
          }}
        />
      )}
      {phase.kind === "help" && (
        <Panel title="THE PROTOTYPES" close={quit}>
          <section className="tg-help">
            <p>Every note needs its own touch, or a held thumb slid on to it. The time picks the note; the place judges it. Right: Bach's note. Wrong: what you asked for, muffled, not counted: you hear your mistake.</p>
            <p>Everywhere: a note lasts while the thumb is down (a quick tap is staccato); tapping while the other thumb still holds joins the notes (legato); moving a held thumb along the dynamic axis swells or fades the note; flick upwards as you let go: swoosh.</p>
            {PROTOS.filter((p) => p.platform === (platform ?? "mobile")).map((p) => (
              <div key={p.id}>
                <h2>{p.name}</h2>
                <p>{p.how}</p>
              </div>
            ))}
            <h2>KEYS AND MIDI</h2>
            <p>A MIDI keyboard plays the pitches (Chrome, Edge or Firefox on a computer). The computer's keys: on the PIANO a keyboard's row (A W S E D F T G Y H U J K O L P), Z and X the octave; on LADDER WASD or the arrows (D or → a step up, A or ← a step down, W or ↑ a leap up, S or ↓ a leap down, space the same note); on EASY every row of keys.</p>
            <h2>SOUND, TUNING, DELAY</h2>
            <p>⚙: an ensemble for the voices (the bands bring a rhythm section); a temperament and the pitch of A; the sound's delay, set by tapping (headphones).</p>
          </section>
        </Panel>
      )}
      {!platform && (
        <div className="tb-platform" role="dialog" aria-label="Play on">
          <h1>THE WELL-TEMPERED BENCH</h1>
          <p className="tb-platform-q">PLAY ON</p>
          <div className="tb-platform-choices">
            <button type="button" id="platform-mobile" onClick={() => setPlatform("mobile")}>
              <span className="tb-platform-icon">▯</span>
              MOBILE
              <small>TWO THUMBS ON A PHONE</small>
            </button>
            <button type="button" id="platform-computer" onClick={() => setPlatform("computer")}>
              <span className="tb-platform-icon">⌨</span>
              COMPUTER
              <small>KEYS · MIDI</small>
            </button>
          </div>
        </div>
      )}
      <div className="tg-upright" role="alert">
        {wide ? "Turn the phone sideways" : "Turn the phone upright"}
      </div>
    </div>
  );
}

/** D215: the title card's line for WITH ISHIZAKA (null: no recording of this piece). */
function herLine(state: "none" | "loading" | "ready" | "failed" | null): string {
  if (state === null) return "WITH KIMIKO ISHIZAKA · NO RECORDING OF THIS PIECE";
  if (state === "failed") return "WITH KIMIKO ISHIZAKA · HER RECORDING CANNOT BE REACHED";
  return `WITH KIMIKO ISHIZAKA · TEMPO HERS${state === "ready" ? "" : " · LOADING…"}`;
}

function Title({ f, pick, setPick, from, note, her, lessons }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number; note: string; her?: string; lessons?: (n: number) => void }) {
  const singing = voicesFrom(f, from);
  const proto = protoById(pick.proto);
  return (
    <div className="tg-card tg-title">
      <h1>{proto.name}</h1>
      <p className="tb-short">{proto.short}</p>
      {proto.platform === "mobile" && <p className="tb-hold">{proto.layout === "full" ? "▯ HOLD THE PHONE UPRIGHT" : "▭ HOLD THE PHONE SIDEWAYS"}</p>}
      <p className="tg-card-sub">
        {f.title.toUpperCase()} · {tempoLabel(f.id)}
      </p>
      {proto.id === "subject" ? (
        <p className="tg-card-sub">
          EVERY ENTRY OF THE SUBJECT · {subjectLine(f, from).entries.length} FROM HERE
        </p>
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
      {her && <p className="tg-card-sub tb-her">{her}</p>}
      {note && <p className="tg-note">{note}</p>}
      {lessons && (
        <button type="button" id="lessons" className="tb-lessons" onClick={() => lessons(Math.min(lessonsPassed(), LESSONS.length - 1))}>
          LESSONS WITH HERR BACH {lessonsPassed() ? `· ${lessonsPassed()}/${LESSONS.length}` : ""}
        </button>
      )}
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

/** TWO VOICES: choosing the voices as an old arcade chooses its players, 1P and 2P. */
function Arcade({ f, pick, setPick, from, note, her }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number; note: string; her?: string }) {
  const singing = voicesFrom(f, from);
  const row = (who: "1P" | "2P", value: number, set: (v: number) => void, other: number) => (
    <div className={`tb-arcade-row tb-${who.toLowerCase()}`}>
      <span className="tb-arcade-who">{who}</span>
      <div className="tb-arcade-voices" role="group" aria-label={`${who} voice`}>
        {f.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`${who.toLowerCase()}-${i}`} className={i === value ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i) || i === other} onClick={() => set(i)} aria-pressed={i === value}>
            {i === value ? "▶ " : ""}
            {name.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="tg-card tg-title tb-arcade">
      <h1>SELECT PLAYERS</h1>
      {row("1P", pick.voice, (v) => setPick({ voice: v }), pick.voice2)}
      {row("2P", pick.voice2, (v) => setPick({ voice2: v }), pick.voice)}
      <From f={f} pick={pick} setPick={setPick} from={from} />
      {her && <p className="tg-card-sub tb-her">{her}</p>}
      <p className="tb-arcade-go">PRESS START</p>
      {note && <p className="tg-note">{note}</p>}
    </div>
  );
}

/** "♩. = 53": a fugue's tempo in its own beat (D199, D204). */
function tempoLabel(id: string): string {
  const t = TEMPO[id];
  return t ? `${t.unit} = ${t.unitBpm.normal}` : `♩ = ${tempoOf(id)}`;
}
