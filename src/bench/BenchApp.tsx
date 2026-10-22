/**
 * The instrument testbench (D170): free play on six two-thumb instruments (instruments.ts), with
 * Contrapunctus XIV in the music box. The fugue plays when started (SLOW, MEDIUM, FAST; from any point);
 * a voice can be taken (tap its name below the box): it falls silent and stays outlined, for the
 * player to play it, or anything else; what the player sounds is traced in the box against the music.
 * Nothing is judged.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MusicBox, inkOf, type Frame } from "../touch/MusicBox.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "../touch/PlayArea.tsx";
import { Chip, voicing } from "../touch/chip.ts";
import { barAt, beatOf, fugueById, keyName } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { startTick, stepRange } from "../touch/voice-mode.ts";
import { INSTRUMENTS, type Instrument, type Touch } from "./instruments.ts";
import { Mono } from "./mono.ts";

const SPEEDS = { slow: 40, medium: 54, fast: 72 } as const;
type Speed = keyof typeof SPEEDS;
const PIECE = "bwv1080-14";
const FONT = '"Press Start 2P", ui-monospace, monospace';

/** A MIDI pitch as a staff step, fractions between (C sharp half way from C to D), for the trace. */
const STEP_OF_PC = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
function stepOf(midi: number): number {
  const m = Math.floor(midi);
  const f = midi - m;
  const s = (x: number) => 7 * (Math.floor(x / 12) - 1) + STEP_OF_PC[((x % 12) + 12) % 12];
  return s(m) + (s(m + 1) - s(m)) * f;
}

export function BenchApp() {
  const f = fugueById(PIECE);
  const [which, setWhich] = useState(0);
  const [taken, setTaken] = useState(1);
  const [speed, setSpeed] = useState<Speed>("medium");
  const [share, setShare] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [help, setHelp] = useState(true);
  const [portrait, setPortrait] = useState(() => window.matchMedia("(orientation: portrait)").matches);
  const chip = useRef<Chip | null>(null);
  const mono = useRef<Mono | null>(null);
  const inst = useRef<Instrument | null>(null);
  const paint = useRef<Painter | null>(null);
  const touches = useRef(new Map<number, Touch & { last: number }>());
  const trace = useRef<{ tick: number; step: number; on: boolean }[]>([]);
  const range = useMemo(() => stepRange(f), [f]);
  const from = startTick(f, share);
  const beat = beatOf(f).ticks;
  const tps = (beat * SPEEDS[speed]) / 60;
  const voiceRange = useMemo(() => {
    const ms = f.voices[taken].map((n) => n[2]);
    return { lo: Math.min(...ms), hi: Math.max(...ms) };
  }, [taken]);
  const clock = useRef({ anchorAt: 0, anchorTick: 0, now: 0, next: 0 });
  const frame = useRef<Frame>(frameAt(from));

  function frameAt(now: number): Frame {
    return {
      now,
      tps,
      key: "d",
      barTicks: f.barTicks,
      beatTicks: beat,
      count: f.voices.length,
      lo: range.lo,
      hi: range.hi,
      voice: taken,
      notes: laneNotes(f.voices[taken], beat, taken),
      others: f.voices.flatMap((ns, v) => (v === taken ? [] : ns.map(([on, dur, midi, step]) => ({ on, dur, midi, step, voice: v })))).sort((a, b) => a.on - b.on),
      trace: trace.current,
    };
  }

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const on = () => setPortrait(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Phones start a page's sound only on a finished tap: every such gesture unlocks it.
  useEffect(() => {
    const unlock = () => ensure();
    for (const ev of ["touchend", "pointerup", "click", "keydown"]) window.addEventListener(ev, unlock, true);
    return () => {
      for (const ev of ["touchend", "pointerup", "click", "keydown"]) window.removeEventListener(ev, unlock, true);
    };
  }, []);

  function ensure() {
    if (!chip.current) chip.current = new Chip();
    void chip.current.resume();
    if (!mono.current) mono.current = new Mono(chip.current, "pulse25");
    if (!inst.current) build();
  }

  function build() {
    if (!mono.current) return;
    mono.current.stop();
    const i = INSTRUMENTS[which](mono.current, voiceRange);
    inst.current = i;
    paint.current = (g, w, h) => {
      const css = getComputedStyle(document.documentElement);
      const tok = (n: string) => css.getPropertyValue(n).trim();
      i.draw(g, w, h, { fg: tok("--tg-fg"), muted: tok("--tg-muted"), grid: tok("--tg-grid"), shine: tok("--tg-shine"), voice: inkOf(taken, f.voices.length), font: FONT });
    };
  }
  useEffect(() => {
    touches.current.clear();
    inst.current = null;
    if (mono.current) build();
    else paint.current = null;
  }, [which, taken]);

  // Every frame: the instrument's own changes, the fugue scheduled ahead (when it plays), the trace.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = () => {
      const t = performance.now();
      const dt = (t - last) / 1000;
      last = t;
      inst.current?.tick?.(dt);
      const ch = chip.current;
      const c = clock.current;
      if (playing && ch) {
        c.now = c.anchorTick + (ch.heard() - c.anchorAt) * tps;
        const horizon = c.anchorTick + (ch.ctx.currentTime + 0.25 - c.anchorAt) * tps;
        const others = frame.current.others;
        while (c.next < others.length && others[c.next].on <= horizon) {
          const n = others[c.next++];
          if (n.on < c.now - beat) continue;
          ch.note(n.midi, c.anchorAt + (n.on - c.anchorTick) / tps, n.dur / tps, voicing(n.voice, f.voices.length));
        }
        const m = mono.current;
        if (m) trace.current.push({ tick: c.now, step: stepOf(m.pitch), on: m.on || m.level > 0.02 });
        if (trace.current.length > 4000) trace.current.splice(0, 1000);
        frame.current = { ...frame.current, now: c.now, tps, trace: trace.current };
        if (c.now > f.length + beat) setPlaying(false);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // The box redrawn for what is chosen while stopped.
  useEffect(() => {
    if (!playing) frame.current = frameAt(from);
  }, [taken, share, speed, playing]);

  const play = () => {
    ensure();
    const ch = chip.current!;
    const go = () => {
      const others = frameAt(from).others;
      clock.current = { anchorAt: ch.ctx.currentTime + 0.2, anchorTick: from, now: from, next: others.findIndex((n) => n.on >= from) };
      if (clock.current.next < 0) clock.current.next = others.length;
      trace.current = [];
      frame.current = frameAt(from);
      setHelp(false);
      setPlaying(true);
    };
    if (ch.ctx.state === "running") go();
    else void ch.resume().then(go);
  };

  const events: ThumbEvents = {
    down: (id, _side, x, y, w, h) => {
      ensure();
      const t = { x: x / w, y: y / h, x0: x / w, y0: y / h, t0: performance.now() / 1000, last: performance.now() };
      touches.current.set(id, t);
      inst.current?.down(id, t);
    },
    move: (id, x, y, w, h) => {
      const t = touches.current.get(id);
      if (!t) return;
      const now = performance.now();
      const dt = (now - t.last) / 1000;
      t.x = x / w;
      t.y = y / h;
      t.last = now;
      inst.current?.move(id, t, dt);
    },
    up: (id) => {
      const t = touches.current.get(id);
      touches.current.delete(id);
      if (t) inst.current?.up(id, t);
    },
  };

  const i = INSTRUMENTS[which];
  const sample = useMemo(() => i(({ setPitch() {}, attack() {}, setLevel() {}, pluck() {}, release() {}, vibrato() {}, stop() {}, pitch: 0, level: 0, on: false } as unknown) as Mono, voiceRange), [which, voiceRange]);
  const wrongWay = sample.landscape ? portrait : !portrait;
  return (
    <div className={`tg-app bench${sample.landscape ? " bench-wide" : ""}`}>
      <MusicBox
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">BENCH · CONTRAPUNCTUS XIV</span>
            <span className="tg-hud-bar">{keyName("d")}</span>
            <button type="button" id="transport" className="tg-x" aria-label={playing ? "Stop" : "Play"} onClick={() => (playing ? setPlaying(false) : play())}>
              {playing ? "■" : "▶"}
            </button>
          </>
        }
        legend={f.voiceNames.map((name, v) => (
          <button key={name} type="button" id={`take-${v}`} className={`bench-take${v === taken ? " on" : ""}`} style={{ color: inkOf(v, f.voices.length) }} onClick={() => setTaken(v)} aria-pressed={v === taken}>
            ■ {name.toUpperCase()}
          </button>
        ))}
      >
        {!playing && (
          <div className="tg-card bench-card">
            <h1>{sample.name}</h1>
            {help && <p>{sample.how}</p>}
            <p className="tg-card-sub">THE VOICE OUTLINED IS YOURS: TAP A NAME BELOW TO TAKE ANOTHER</p>
            <div className="tg-row">
              <div className="tg-seg" role="group" aria-label="Speed">
                {(Object.keys(SPEEDS) as Speed[]).map((s) => (
                  <button key={s} type="button" id={`speed-${s}`} className={s === speed ? "on" : ""} onClick={() => setSpeed(s)}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
              <button type="button" id="play" className="tg-piece" onClick={play}>
                ▶ PLAY THE FUGUE
              </button>
            </div>
            <label className="tg-from">
              <span>
                FROM {Math.round(share * 100)}% · BAR {barAt(f, from)}
              </span>
              <input type="range" id="from" min={0} max={99} value={Math.round(share * 100)} onChange={(e) => setShare(Number(e.target.value) / 100)} />
            </label>
          </div>
        )}
      </MusicBox>
      <nav className="bench-bar" aria-label="Instrument">
        {INSTRUMENTS.map((mk, k) => (
          <button key={k} type="button" id={`inst-${k + 1}`} className={k === which ? "on" : ""} onClick={() => (setWhich(k), setHelp(!playing))}>
            {k + 1}
          </button>
        ))}
        <span>{sample.name}</span>
        <button type="button" id="help" onClick={() => setHelp(!help)} aria-pressed={help}>
          ?
        </button>
      </nav>
      <PlayArea events={events} paint={paint} hint={wrongWay ? (sample.landscape ? "TURN THE PHONE SIDEWAYS" : "TURN THE PHONE UPRIGHT") : ""} />
      {help && playing && <p className="bench-help">{sample.how}</p>}
    </div>
  );
}
