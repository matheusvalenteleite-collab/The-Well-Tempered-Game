/**
 * The touch game (D158 on). D169, pared down: the player chooses a piece (the picker), a voice, and
 * where in the piece to start (0 to 99%); plays that voice to the end of the piece while the other
 * voices play around it, every voice in view in the music box; and can quit at any moment. D173: the
 * instrument (the Synth upright, the Piano sideways), the level, the speed and the sound's delay are
 * under ⚙; how to play and how to put the game on the Home Screen under ?.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MusicBox, inkOf, type Frame } from "./MusicBox.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "./PlayArea.tsx";
import { PiecePicker } from "./PiecePicker.tsx";
import { Chip } from "./chip.ts";
import { Game, INSTRUMENTS, prepare, type Grade, type Instrument } from "./engine.ts";
import { paintPiano, pianoView } from "./paint-piano.ts";
import { paintSynth } from "./paint-synth.ts";
import { HelpPanel, SettingsPanel } from "./Panels.tsx";
import { barAt, beatOf, fugueById, keyAt, keyName, shortName, type TouchFugue } from "./fugue.ts";
import { LEVELS, type Level as Difficulty } from "./lanes.ts";
import { accompaniment, level, startTick, stepRange, subjectMarks, voicesFrom } from "./voice-mode.ts";

/** The speeds, as beats per minute of the felt beat (beatOf). */
const SPEEDS = { slow: 40, medium: 54, fast: 72 } as const;
type Speed = keyof typeof SPEEDS;
const PICK_KEY = "tg-pick-v2";
const LAG_KEY = "tg-lag";
const HELP: Record<Instrument, string> = {
  synth: "Right thumb: up. Left: down. Hold to sustain. ? for more.",
  piano: "Strike the lit key as its note lands. Hold to let it ring. ? for more.",
};

/** The keyboard on a computer (EASY): a key is a tap, held for a long note; D and F the left thumb, J and K the right, space either. */
const KEYS = ["Space", "KeyF", "KeyJ", "KeyD", "KeyK"];
const keyId = (code: string) => 1000 + KEYS.indexOf(code);
const keySide = (code: string) => (code === "KeyD" || code === "KeyF" ? "left" : code === "KeyJ" || code === "KeyK" ? "right" : null);

type Phase = { kind: "title" } | { kind: "play" } | { kind: "result"; got: number; of: number; maxCombo: number; perfect: number } | { kind: "picker" } | { kind: "settings" } | { kind: "help" };

interface Pick {
  piece: string;
  voice: number;
  inst: Instrument;
  diff: Difficulty;
  speed: Speed;
  /** Where to start, as a share of the piece (0 to 0.99). */
  share: number;
}
const DEFAULT_PICK: Pick = { piece: "wtc1f02", voice: 1, inst: "synth", diff: "easy", speed: "medium", share: 0 };

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
    /* no storage: it stays for this visit */
  }
}

/** A pick made sound: a voice that still sings from the start chosen. */
function sane(p: Pick): Pick {
  const f = fugueById(p.piece);
  const share = Math.min(0.99, Math.max(0, p.share || 0));
  const singing = voicesFrom(f, startTick(f, share));
  const voice = singing.includes(p.voice) ? p.voice : singing[f.kind === "prelude" ? 0 : Math.min(1, singing.length - 1)];
  return { ...DEFAULT_PICK, ...p, piece: f.id, share, voice, inst: INSTRUMENTS.includes(p.inst) ? p.inst : "synth", diff: LEVELS.includes(p.diff) ? p.diff : "easy", speed: p.speed in SPEEDS ? p.speed : "medium" };
}

const voiceName = (f: TouchFugue, v: number) => f.voiceNames[v].toUpperCase();
const pieceName = (f: TouchFugue) => (f.book ? `BOOK ${f.book === 1 ? "I" : "II"} · ${f.title.toUpperCase()}` : `ART OF FUGUE · ${f.title.toUpperCase()}`);

export function TouchApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [pick, setPickRaw] = useState<Pick>(() => sane(load(PICK_KEY, DEFAULT_PICK)));
  const setPick = (p: Partial<Pick>) =>
    setPickRaw((cur) => {
      const next = sane({ ...cur, ...p });
      save(PICK_KEY, next);
      return next;
    });
  const [note, setNote] = useState("");
  const f = fugueById(pick.piece);
  const { voice, diff, speed, share, inst } = pick;
  const [lag, setLagRaw] = useState<number | null>(() => load<number | null>(LAG_KEY, null));
  const setLag = (l: number | null) => {
    setLagRaw(l);
    save(LAG_KEY, l);
    if (chip.current) chip.current.lag = l;
  };
  const marks = useMemo(() => subjectMarks(f), [f]);
  const from = startTick(f, share);
  const range = useMemo(() => stepRange(f), [f]);
  const lv = useMemo(() => level(f, voice, from), [f, voice, from, phase.kind === "play"]);
  const frame = useRef<Frame>(preview());
  const chip = useRef<Chip | null>(null);
  const game = useRef<Game | null>(null);
  const count = useRef<HTMLDivElement>(null);
  const gradeEl = useRef<HTMLDivElement>(null);
  const paint = useRef<Painter | null>(null);
  const shownAt = useRef(0);

  /** The music box before play: everything from the starting bar, a beat before it. */
  function preview(): Frame {
    const b = beatOf(f);
    return {
      now: from - b.ticks,
      tps: 1,
      key: keyAt(f, from),
      barTicks: f.barTicks,
      beatTicks: b.ticks,
      count: f.voices.length,
      lo: range.lo,
      hi: range.hi,
      voice,
      notes: lv.notes,
      others: accompaniment(f, from, voice),
      ...marks,
    };
  }

  // Phones start a page's sound only on a finished tap (or a click, or a key): every such gesture
  // anywhere unlocks it, so the first tap on START is never lost.
  useEffect(() => {
    const unlock = () => ensureChip();
    for (const ev of ["touchend", "pointerup", "click", "keydown"]) window.addEventListener(ev, unlock, true);
    return () => {
      for (const ev of ["touchend", "pointerup", "click", "keydown"]) window.removeEventListener(ev, unlock, true);
    };
  }, []);

  // A screen just shown ignores a tap for a moment (the tap that ended a game must not start another).
  useEffect(() => {
    shownAt.current = performance.now();
  }, [phase]);

  // Away from play, the box shows the music from where play would start.
  useEffect(() => {
    if (phase.kind !== "play" && phase.kind !== "result") {
      prepare(f, [lv], diff);
      frame.current = preview();
    }
  }, [phase, lv, diff]);

  // Playing: the engine steps every frame; at the end, the result.
  useEffect(() => {
    if (phase.kind !== "play" || !chip.current) return;
    const g = new Game(f, [lv], { difficulty: diff, bpm: SPEEDS[speed], instrument: inst }, chip.current);
    game.current = g;
    paint.current = inst === "piano" ? (ctx, w, h) => paintPiano(ctx, w, h, pianoView(g), marks.subject) : (ctx, w, h) => paintSynth(ctx, w, h, g);
    const b = beatOf(f);
    let raf = 0;
    const loop = () => {
      const done = g.step();
      frame.current = {
        now: g.now,
        tps: g.tps,
        key: g.keyNow(),
        barTicks: f.barTicks,
        beatTicks: b.ticks,
        count: f.voices.length,
        lo: range.lo,
        hi: range.hi,
        voice,
        notes: lv.notes,
        others: g.others,
        ...marks,
      };
      if (count.current) count.current.textContent = g.countIn() ? String(g.countIn()) : "";
      showGrade(gradeEl.current, g.grade, g.combo);
      if (done) {
        game.current = null;
        paint.current = null;
        const [r] = g.results();
        setPhase({ kind: "result", got: r.got, of: r.of, maxCombo: g.maxCombo, perfect: g.perfect });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      g.stopAll();
      game.current = null;
      paint.current = null;
      if (count.current) count.current.textContent = "";
      showGrade(gradeEl.current, null, 0);
    };
  }, [phase]);

  function ensureChip() {
    if (!chip.current) {
      chip.current = new Chip();
      chip.current.lag = lag;
    }
    void chip.current.resume();
    return chip.current;
  }

  /** Begins once the sound is on: the game runs on the sound's clock, which stands still until then. */
  const start = () => {
    if (performance.now() - shownAt.current < 350) return;
    ensureChip();
    const ch = chip.current!;
    const go = () => {
      setNote("");
      setPhase({ kind: "play" });
    };
    if (ch.ctx.state === "running") return go();
    ch.resume()
      .then(() => (ch.ctx.state === "running" ? go() : setNote("The sound is still off: tap once more.")))
      .catch(() => setNote("The sound is still off: tap once more."));
  };

  const quit = () => setPhase({ kind: "title" });

  // A tap lands: in play it is judged; away from play, the finished tap (the lift) starts the game,
  // as phones start sound only then.
  const events: ThumbEvents = {
    down: (id, side, x, y, w, h, ts) => game.current?.down(id, { side, x, y, w, h }, ts),
    move: (id, x, y, w, h, ts) => {
      const g = game.current;
      if (g) g.move(id, { side: "left", x, y, w, h }, ts);
    },
    up: (id, ts) => {
      const g = game.current;
      if (g) return g.up(id, ts);
      if (phase.kind === "title" || phase.kind === "result") start();
    },
  };

  // The keyboard: a key down is a landing, a key up a lift; away from play, space starts; Escape quits.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape" && phase.kind === "play") return quit();
      if (!KEYS.includes(e.code) || e.repeat) return;
      const g = game.current;
      if (!g) {
        if (e.code === "Space" && (phase.kind === "title" || phase.kind === "result")) (e.preventDefault(), start());
        return;
      }
      e.preventDefault();
      g.press(keyId(e.code), keySide(e.code), e.timeStamp);
    };
    const up = (e: KeyboardEvent) => {
      const g = game.current;
      if (!KEYS.includes(e.code) || !g) return;
      g.up(keyId(e.code), e.timeStamp);
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
  return (
    <div className={`tg-app${inst === "piano" ? " tg-wide" : ""}${playing ? "" : " tg-away"}`}>
      <MusicBox
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">
              {shortName(f)} · {voiceName(f, voice)}
            </span>
            <span className="tg-hud-bar">{keyName(frame.current.key)}</span>
            {playing ? (
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
          <span key={name} style={{ color: inkOf(i, f.voices.length), opacity: i === voice ? 1 : 0.55 }}>
            ■ {name.toUpperCase()}
          </span>
        ))}
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        <div className="tg-grade" ref={gradeEl} aria-live="polite" />
        {phase.kind === "title" && <Title f={f} pick={pick} setPick={setPick} from={from} open={() => setPhase({ kind: "picker" })} note={note} />}
        {phase.kind === "result" && (
          <div className="tg-card tg-card-low">
            <h1 className={phase.got >= 0.8 * phase.of ? "tg-gold" : ""}>{Math.round((100 * phase.got) / Math.max(1, phase.of))}%</h1>
            <p className="tg-card-sub">
              {voiceName(f, voice)}: {phase.got} OF {phase.of} NOTES · MAX COMBO {phase.maxCombo} · PERFECT {phase.perfect}
            </p>
            <button type="button" id="again" className="tg-link" onClick={() => setPhase({ kind: "title" })}>
              Back
            </button>
          </div>
        )}
      </MusicBox>
      <PlayArea events={events} paint={paint} hint={away ? "TAP HERE TO START" : ""} />
      {phase.kind === "picker" && (
        <PiecePicker
          current={f}
          pick={(id) => {
            setPick({ piece: id, share: 0, voice: -1 });
            setPhase({ kind: "title" });
          }}
          close={() => setPhase({ kind: "title" })}
        />
      )}
      {phase.kind === "settings" && (
        <SettingsPanel settings={pick} set={(s) => setPick(s)} lag={lag} setLag={setLag} chip={ensureChip} close={() => setPhase({ kind: "title" })} />
      )}
      {phase.kind === "help" && <HelpPanel close={() => setPhase({ kind: "title" })} />}
      <div className="tg-upright" role="alert">
        {inst === "piano" ? "Turn the phone sideways for the piano" : "Turn the phone upright"}
      </div>
    </div>
  );
}

/** The grade of the last tap and the combo, drawn over the box without React. */
function showGrade(el: HTMLDivElement | null, grade: Grade | null, combo: number) {
  if (!el) return;
  const age = grade ? performance.now() - grade.at : Infinity;
  if (age > 600) {
    el.textContent = combo >= 5 ? `×${combo}` : "";
    el.className = "tg-grade";
    return;
  }
  const lean = grade!.lean ? (grade!.lean < 0 ? " EARLY" : " LATE") : "";
  el.textContent = `${grade!.text}${lean}${combo >= 5 ? ` ×${combo}` : ""}`;
  el.className = `tg-grade tg-grade-${grade!.text === "PERFECT" ? "perfect" : grade!.text === "GOOD" ? "good" : "miss"}`;
}

function Title({ f, pick, setPick, from, open, note }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number; open: () => void; note: string }) {
  const singing = voicesFrom(f, from);
  return (
    <div className="tg-card tg-title">
      <button type="button" id="piece" className="tg-piece" onClick={open}>
        {pieceName(f)} <span aria-hidden="true">▾</span>
      </button>
      <div className="tg-voices" role="group" aria-label="Voice">
        {f.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={i === pick.voice ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i)} onClick={() => setPick({ voice: i })} aria-pressed={i === pick.voice}>
            {name.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="tg-card-sub">
        {pick.inst.toUpperCase()} · {pick.diff.toUpperCase()} · {pick.speed.toUpperCase()}
      </p>
      <label className="tg-from">
        <span>
          FROM {Math.round(pick.share * 100)}% · BAR {barAt(f, from)}
        </span>
        <input type="range" id="from" min={0} max={99} step={1} value={Math.round(pick.share * 100)} onChange={(e) => setPick({ share: Number(e.target.value) / 100 })} />
      </label>
      <p className="tg-title-help">{HELP[pick.inst]}</p>
      {note && <p className="tg-note">{note}</p>}
    </div>
  );
}
