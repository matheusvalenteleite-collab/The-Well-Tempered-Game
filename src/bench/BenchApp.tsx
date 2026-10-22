/**
 * The testbench (D170; D175; D178; D179-D180): prototypes of the instrument tried on the game itself,
 * judged. ⚙ chooses the prototype (protos.ts), the piece (Contrapunctus XIV, Book I's C minor fugue,
 * and four prelude-and-fugue pairs), the tempo (20 to 200), SIDEWAYS's level, the ensemble
 * (sound.ts), the tuning (tuning.ts) and the sound's delay; the title the voice (TWO VOICES: two, as
 * an arcade's 1P and 2P) and where to start; ? says how each is played. Each prototype lays the screen
 * out its own way. A computer's keys and a MIDI keyboard play too.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ladderGeometry, MusicBox, inkOf, type Frame } from "../touch/MusicBox.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "../touch/PlayArea.tsx";
import { BpmSetting, Choice, LagSetting, Panel, saneBpm, SoundSetting, TuningSetting } from "../touch/Panels.tsx";
import { Chip } from "../touch/chip.ts";
import { barAt, beatOf, fugueById, keyAt, keyName, type TouchFugue } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { setPreset } from "../touch/sound.ts";
import { setTuning } from "../touch/tuning.ts";
import { accompaniment, startTick, stepRange, subjectMarks, voicesFrom } from "../touch/voice-mode.ts";
import { paintProto } from "./paint-proto.ts";
import { ProtoGame, type KeyPress } from "./proto-game.ts";
import { PROTOS, protoById, type ProtoId } from "./protos.ts";

/** The pieces: Contrapunctus XIV, the C minor fugue, and four pairs drawn at random (D179). */
const PIECES = [
  ["bwv1080-14", "CONTRA­PUNCTUS XIV"],
  ["wtc1f02", "I · C MINOR F"],
  ["wtc1p07", "I · E♭ MAJOR P"],
  ["wtc1f07", "I · E♭ MAJOR F"],
  ["wtc1p10", "I · E MINOR P"],
  ["wtc1f10", "I · E MINOR F"],
  ["wtc2p10", "II · E MINOR P"],
  ["wtc2f10", "II · E MINOR F"],
  ["wtc2p23", "II · B MAJOR P"],
  ["wtc2f23", "II · B MAJOR F"],
] as const;
const PICK_KEY = "tb-pick-v2";
const LAG_KEY = "tg-lag";
const SOUND_KEY = "tg-sound";
const TUNING_KEY = "tg-tuning";

interface Pick {
  proto: ProtoId;
  piece: string;
  voice: number;
  /** TWO VOICES: the second (2P). */
  voice2: number;
  bpm: number;
  share: number;
  /** SIDEWAYS: the hard level, every note joined. */
  legato: boolean;
}
const DEFAULT: Pick = { proto: "ladder", piece: "wtc1f02", voice: 1, voice2: 0, bpm: 46, share: 0, legato: false };

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
  const piece = PIECES.some(([id]) => id === p.piece) ? p.piece : DEFAULT.piece;
  const f = fugueById(piece);
  const share = Math.min(0.99, Math.max(0, p.share || 0));
  const singing = voicesFrom(f, startTick(f, share));
  const voice = singing.includes(p.voice) ? p.voice : singing[Math.min(1, singing.length - 1)];
  const voice2 = singing.includes(p.voice2) && p.voice2 !== voice ? p.voice2 : (singing.find((v) => v !== voice) ?? voice);
  return { ...DEFAULT, ...p, piece, share, voice, voice2, proto: protoById(p.proto).id, bpm: saneBpm(p.bpm), legato: !!p.legato };
}

type Phase = { kind: "title" } | { kind: "play" } | { kind: "result"; right: number; wrong: number; missed: number; of: number } | { kind: "settings" } | { kind: "help" };

/** The computer's keys: PIANO a keyboard's row (A W S E D F T G Y H U J K O L P;), Z and X the octave; the others the hands' moves (WASD the left, the arrows the right; space a repeat). */
const PIANO_KEYS = ["KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG", "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK", "KeyO", "KeyL", "KeyP", "Semicolon"];
const MOVE_KEYS: Record<string, { side: "left" | "right"; dir: number; big: boolean }> = {
  KeyA: { side: "left", dir: -1, big: false },
  KeyD: { side: "left", dir: 1, big: false },
  KeyS: { side: "left", dir: -1, big: true },
  KeyW: { side: "left", dir: 1, big: true },
  ArrowLeft: { side: "right", dir: -1, big: false },
  ArrowRight: { side: "right", dir: 1, big: false },
  ArrowDown: { side: "right", dir: -1, big: true },
  ArrowUp: { side: "right", dir: 1, big: true },
  Space: { side: "right", dir: 0, big: false },
};

export function BenchApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [pick, setPickRaw] = useState<Pick>(() => sane(load(PICK_KEY, DEFAULT)));
  const setPick = (p: Partial<Pick>) =>
    setPickRaw((cur) => {
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
  const [sound, setSoundRaw] = useState<string>(() => load<string>(SOUND_KEY, "bossa"));
  const setSound = (id: string) => {
    setSoundRaw(id);
    save(SOUND_KEY, id);
    setPreset(id);
  };
  const [tuning, setTuningRaw] = useState<{ id: string; a: number }>(() => load(TUNING_KEY, { id: "equal", a: 440 }));
  const changeTuning = (id: string, a: number) => {
    setTuningRaw({ id, a });
    save(TUNING_KEY, { id, a });
    setTuning(id, a);
  };
  useEffect(() => {
    setPreset(sound);
    setTuning(tuning.id, tuning.a);
  }, []);
  const [midi, setMidi] = useState("");
  const [note, setNote] = useState("");
  const f = fugueById(pick.piece);
  const proto = protoById(pick.proto);
  const from = startTick(f, pick.share);
  const duo = proto.id === "duo";
  const played = duo ? [pick.voice, pick.voice2] : [pick.voice];
  // LADDER: the box fills its height with the voice's range, so its rows are as tall as can be.
  const range = useMemo(() => {
    if (proto.id !== "ladder") return stepRange(f);
    const steps = f.voices[pick.voice].map((n) => n[3]);
    return { lo: Math.min(...steps) - 1, hi: Math.max(...steps) + 1 };
  }, [f, proto.id, pick.voice]);
  const marks = useMemo(() => subjectMarks(f), [f]);
  const chip = useRef<Chip | null>(null);
  const game = useRef<ProtoGame | null>(null);
  const paint = useRef<Painter | null>(null);
  const frame = useRef<Frame>(preview());
  const count = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  const octave = useRef(0);

  function preview(): Frame {
    const b = beatOf(f);
    const lane = (v: number) =>
      laneNotes(
        f.voices[v].filter(([on]) => on >= from),
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
      voice: pick.voice,
      notes: lane(pick.voice),
      ...(duo ? { voice2: pick.voice2, notes2: lane(pick.voice2) } : {}),
      others: accompaniment(f, from, pick.voice).filter((n) => !played.includes(n.voice)),
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
    }
    void chip.current.resume();
    return chip.current;
  }

  useEffect(() => {
    if (phase.kind !== "play" || !chip.current) return;
    const g = new ProtoGame(f, played, from, proto, { bpm: pick.bpm, legato: pick.legato }, chip.current);
    game.current = g;
    paint.current = (ctx, w, h) => paintProto(ctx, w, h, g, marks.subject);
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
        voice: pick.voice,
        notes: g.notes,
        ...(duo ? { voice2: g.tracks[1].voice, notes2: g.tracks[1].notes } : {}),
        others: g.others,
        ...marks,
        marks: g.marks,
        arrows: proto.id === "thumbs" ? g.moves : undefined,
      };
      if (proto.layout === "bars") g.rows = boxRows(f.barTicks, g.now);
      if (count.current) count.current.textContent = g.countIn() ? String(g.countIn()) : g.combo >= 5 ? `×${g.combo}` : "";
      if (done) {
        game.current = null;
        paint.current = null;
        setPhase({ kind: "result", ...g.results() });
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
    const go = () => (setNote(""), setPhase({ kind: "play" }));
    if (ch.ctx.state === "running") return go();
    ch.resume()
      .then(() => (ch.ctx.state === "running" ? go() : setNote("The sound is still off: tap once more.")))
      .catch(() => setNote("The sound is still off: tap once more."));
  };
  const quit = () => setPhase({ kind: "title" });

  const events: ThumbEvents = {
    down: (id, side, x, y, w, h, ts) => game.current?.down(id, { side, x, y, w, h }, ts),
    move: (id, x, y, w, h, ts) => game.current?.move(id, { side: "left", x, y, w, h }, ts),
    up: (id, ts) => {
      const g = game.current;
      if (g) return g.up(id, ts);
      if (phase.kind === "title" || phase.kind === "result") start();
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
    if (!nav.requestMIDIAccess) return;
    let access: MIDIAccess | null = null;
    const listen = () => {
      const names: string[] = [];
      access?.inputs.forEach((input) => {
        names.push(input.name ?? "MIDI");
        input.onmidimessage = (e: MIDIMessageEvent) => {
          const [st, n, vel] = e.data ?? [];
          const kind = st & 0xf0;
          if (kind === 0x90 && vel > 0) keyDownRef.current(5000 + n, { midi: n, velocity: vel / 127, side: n < 60 ? "left" : "right" }, e.timeStamp);
          else if (kind === 0x80 || (kind === 0x90 && vel === 0)) game.current?.keyUp(5000 + n, e.timeStamp);
        };
      });
      setMidi(names.join(", "));
    };
    nav
      .requestMIDIAccess()
      .then((a) => {
        access = a;
        listen();
        a.onstatechange = listen;
      })
      .catch(() => setMidi(""));
    return () => access?.inputs.forEach((i) => (i.onmidimessage = null));
  }, []);

  // The computer's keys; Escape quits.
  useEffect(() => {
    const press = (e: KeyboardEvent): KeyPress | null => {
      if (proto.id === "piano") {
        const i = PIANO_KEYS.indexOf(e.code);
        if (i < 0) return null;
        const g = game.current;
        const base = g ? g.kb.lo - (((g.kb.lo % 12) + 12) % 12) : 60;
        return { midi: base + 12 * octave.current + i, velocity: 0.6 };
      }
      const mv = MOVE_KEYS[e.code];
      return mv ? { side: mv.side, move: { dir: mv.dir, big: mv.big }, velocity: 0.6 } : null;
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape" && phase.kind === "play") return quit();
      if (proto.id === "piano" && (e.code === "KeyZ" || e.code === "KeyX")) return void (octave.current += e.code === "KeyZ" ? -1 : 1);
      const k = press(e);
      if (!k || e.repeat) return;
      if (!game.current && phase.kind !== "title" && phase.kind !== "result") return;
      e.preventDefault();
      keyDownRef.current(7000 + e.keyCode, k, e.timeStamp);
    };
    const up = (e: KeyboardEvent) => game.current?.keyUp(7000 + e.keyCode, e.timeStamp);
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
  const wide = layout === "wide" || layout === "bars";
  const own = playing && (layout === "full" || layout === "bars") ? ` tb-${layout}` : "";
  const pieceName = PIECES.find(([id]) => id === pick.piece)![1];
  return (
    <div className={`tg-app${wide ? " tg-wide" : ""}${own}${playing ? "" : " tg-away"}`}>
      <MusicBox
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">BENCH · {proto.name}</span>
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
          <span key={name} style={{ color: inkOf(i, f.voices.length), opacity: played.includes(i) ? 1 : 0.55 }}>
            ■ {name.toUpperCase()}
          </span>
        ))}
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        {phase.kind === "title" && (duo ? <Arcade f={f} pick={pick} setPick={setPick} from={from} note={note} /> : <Title f={f} pick={pick} setPick={setPick} from={from} note={note} />)}
        {phase.kind === "result" && (
          <div className="tg-card tg-card-low">
            <h1 className={phase.right >= 0.8 * phase.of ? "tg-gold" : ""}>{Math.round((100 * phase.right) / Math.max(1, phase.of))}%</h1>
            <p className="tg-card-sub">
              {proto.name}: {phase.right} RIGHT · {phase.wrong} WRONG · {phase.missed} MISSED · OF {phase.of}
            </p>
            <button type="button" id="again" className="tg-link" onClick={quit}>
              Back
            </button>
          </div>
        )}
      </MusicBox>
      <PlayArea events={events} paint={paint} hint={away ? "TAP HERE TO START" : ""} />
      {(layout === "full" || layout === "bars") && playing && (
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
            {PROTOS.map((p) => (
              <button key={p.id} type="button" id={`proto-${p.id}`} className={p.id === pick.proto ? "on" : ""} onClick={() => setPick({ proto: p.id })} aria-pressed={p.id === pick.proto}>
                {p.name}
              </button>
            ))}
          </div>
          <p className="tg-panel-note">{proto.how}</p>
          {proto.id === "sideways" && <Choice id="level" label="SIDEWAYS" options={[["easy", "EASY"], ["legato", "LEGATO"]]} value={pick.legato ? "legato" : "easy"} set={(v) => setPick({ legato: v === "legato" })} />}
          <div className="tg-set">
            <span>PIECE</span>
            <span className="tg-panel-val">{pieceName}</span>
          </div>
          <div className="tg-grid3" role="group" aria-label="Piece">
            {PIECES.map(([id, name]) => (
              <button key={id} type="button" id={`piece-${id}`} className={id === pick.piece ? "on" : ""} onClick={() => setPick({ piece: id, share: 0, voice: -1, voice2: -1 })} aria-pressed={id === pick.piece}>
                {name}
              </button>
            ))}
          </div>
          <BpmSetting bpm={pick.bpm} set={(bpm) => setPick({ bpm })} />
          <SoundSetting value={sound} set={setSound} />
          <TuningSetting id={tuning.id} a={tuning.a} set={changeTuning} />
          <LagSetting lag={lag} setLag={setLag} chip={ensureChip} />
          <div className="tg-set">
            <span>MIDI</span>
            <span className="tg-panel-val">{midi || "NONE FOUND"}</span>
          </div>
        </Panel>
      )}
      {phase.kind === "help" && (
        <Panel title="THE PROTOTYPES" close={quit}>
          <section className="tg-help">
            <p>Every note needs its own touch, or a held thumb slid on to it. The time picks the note; the place judges it. Right: Bach's note. Wrong: what you asked for, muffled, not counted: you hear your mistake.</p>
            <p>Everywhere: a note lasts while the thumb is down (a quick tap is staccato); tapping while the other thumb still holds joins the notes (legato); moving a held thumb along the dynamic axis swells or fades the note; flick upwards as you let go: swoosh.</p>
            {PROTOS.map((p) => (
              <div key={p.id}>
                <h2>{p.name}</h2>
                <p>{p.how}</p>
              </div>
            ))}
            <h2>KEYS AND MIDI</h2>
            <p>A MIDI keyboard plays the pitches (Chrome, Edge or Firefox on a computer). The computer's keys: on the PIANO a keyboard's row (A W S E D F T G Y H U J K O L P), Z and X the octave; elsewhere the left hand A and D a step down and up, S and W a bigger move; the right hand the arrows likewise; space a repeat. TWO VOICES: the left hand plays 1P, the right 2P.</p>
            <h2>SOUND, TUNING, DELAY</h2>
            <p>⚙: an ensemble for the voices (the bands bring a rhythm section); a temperament and the pitch of A; the sound's delay, set by tapping (headphones).</p>
          </section>
        </Panel>
      )}
      <div className="tg-upright" role="alert">
        {wide ? "Turn the phone sideways" : "Turn the phone upright"}
      </div>
    </div>
  );
}

function Title({ f, pick, setPick, from, note }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number; note: string }) {
  const singing = voicesFrom(f, from);
  const proto = protoById(pick.proto);
  return (
    <div className="tg-card tg-title">
      <h1>{proto.name}</h1>
      <p className="tg-card-sub">
        {f.title.toUpperCase()} · {pick.bpm} BPM
      </p>
      <div className="tg-voices" role="group" aria-label="Voice">
        {f.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={i === pick.voice ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i)} onClick={() => setPick({ voice: i })} aria-pressed={i === pick.voice}>
            {name.toUpperCase()}
          </button>
        ))}
      </div>
      <From f={f} pick={pick} setPick={setPick} from={from} />
      {note && <p className="tg-note">{note}</p>}
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
function Arcade({ f, pick, setPick, from, note }: { f: TouchFugue; pick: Pick; setPick: (p: Partial<Pick>) => void; from: number; note: string }) {
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
      <p className="tb-arcade-go">PRESS START</p>
      {note && <p className="tg-note">{note}</p>}
    </div>
  );
}
