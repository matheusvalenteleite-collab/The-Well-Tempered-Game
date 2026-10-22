/**
 * The testbench (D170; D175): prototypes of the instrument tried on the game itself, judged, on
 * Contrapunctus XIV or the C minor fugue of Book I. ⚙ chooses the prototype (protos.ts), the piece,
 * the speed and the sound's delay; the title the voice and where to start; ? says how each is played.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MusicBox, inkOf, type Frame } from "../touch/MusicBox.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "../touch/PlayArea.tsx";
import { Choice, LagSetting, Panel } from "../touch/Panels.tsx";
import { Chip } from "../touch/chip.ts";
import { barAt, beatOf, fugueById, keyAt, keyName, type TouchFugue } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { accompaniment, startTick, stepRange, subjectMarks, voicesFrom } from "../touch/voice-mode.ts";
import { paintProto } from "./paint-proto.ts";
import { ProtoGame } from "./proto-game.ts";
import { PROTOS, protoById, type ProtoId } from "./protos.ts";

const SPEEDS = { slow: 40, medium: 54, fast: 72 } as const;
type Speed = keyof typeof SPEEDS;
const PIECES = [
  ["bwv1080-14", "CONTRAPUNCTUS XIV"],
  ["wtc1f02", "BOOK I · C MINOR"],
] as const;
type PieceId = (typeof PIECES)[number][0];
const PICK_KEY = "tb-pick-v1";
const LAG_KEY = "tg-lag";

interface Pick {
  proto: ProtoId;
  relative: boolean;
  piece: PieceId;
  voice: number;
  speed: Speed;
  share: number;
}
const DEFAULT: Pick = { proto: "bow", relative: false, piece: "wtc1f02", voice: 1, speed: "slow", share: 0 };

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
  return {
    ...DEFAULT,
    ...p,
    piece,
    share,
    proto: protoById(p.proto).id,
    speed: p.speed in SPEEDS ? p.speed : "slow",
    voice: singing.includes(p.voice) ? p.voice : singing[Math.min(1, singing.length - 1)],
  };
}

type Phase = { kind: "title" } | { kind: "play" } | { kind: "result"; right: number; wrong: number; missed: number; of: number } | { kind: "settings" } | { kind: "help" };

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
  const [note, setNote] = useState("");
  const f = fugueById(pick.piece);
  const proto = protoById(pick.proto);
  const from = startTick(f, pick.share);
  const range = useMemo(() => stepRange(f), [f]);
  const marks = useMemo(() => subjectMarks(f), [f]);
  const chip = useRef<Chip | null>(null);
  const game = useRef<ProtoGame | null>(null);
  const paint = useRef<Painter | null>(null);
  const frame = useRef<Frame>(preview());
  const count = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);

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
      voice: pick.voice,
      notes: laneNotes(
        f.voices[pick.voice].filter(([on]) => on >= from),
        b.ticks,
        pick.voice,
      ),
      others: accompaniment(f, from, pick.voice),
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
    const g = new ProtoGame(f, pick.voice, from, proto, { bpm: SPEEDS[pick.speed], relative: pick.relative }, chip.current);
    game.current = g;
    paint.current = (ctx, w, h) => paintProto(ctx, w, h, g);
    const b = beatOf(f);
    let raf = 0;
    const loop = () => {
      const done = g.step();
      frame.current = { now: g.now, tps: g.tps, key: g.keyNow(), barTicks: f.barTicks, beatTicks: b.ticks, count: f.voices.length, lo: range.lo, hi: range.hi, voice: pick.voice, notes: g.notes, others: g.others, ...marks };
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

  // On a computer: F and J are the left and right thumbs at mid height; Escape quits.
  useEffect(() => {
    const keys: Record<string, "left" | "right"> = { KeyF: "left", KeyJ: "right" };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape" && phase.kind === "play") return quit();
      const g = game.current;
      if (!g || !keys[e.code] || e.repeat) return;
      e.preventDefault();
      g.down(e.code === "KeyF" ? 9001 : 9002, { side: keys[e.code], x: e.code === "KeyF" ? 90 : 300, y: 200, w: 390, h: 400 }, e.timeStamp);
    };
    const up = (e: KeyboardEvent) => keys[e.code] && game.current?.up(e.code === "KeyF" ? 9001 : 9002, e.timeStamp);
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
    <div className="tg-app">
      <MusicBox
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">
              BENCH · {proto.name}
              {proto.id === "thumbs" && pick.relative ? " REL" : ""}
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
          <span key={name} style={{ color: inkOf(i, f.voices.length), opacity: i === pick.voice ? 1 : 0.55 }}>
            ■ {name.toUpperCase()}
          </span>
        ))}
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        {phase.kind === "title" && <Title f={f} pick={pick} setPick={setPick} from={from} note={note} />}
        {phase.kind === "result" && (
          <div className="tg-card tg-card-low">
            <h1 className={phase.right >= 0.8 * phase.of ? "tg-gold" : ""}>{Math.round((100 * phase.right) / Math.max(1, phase.of))}%</h1>
            <p className="tg-card-sub">
              {proto.name}: {phase.right} RIGHT · {phase.wrong} WRONG SHAPE · {phase.missed} MISSED · OF {phase.of}
            </p>
            <button type="button" id="again" className="tg-link" onClick={quit}>
              Back
            </button>
          </div>
        )}
      </MusicBox>
      <PlayArea events={events} paint={paint} hint={away ? "TAP HERE TO START" : ""} />
      {phase.kind === "settings" && (
        <Panel title="TESTBENCH" close={quit}>
          <div className="tg-set">
            <span>PROTOTYPE</span>
          </div>
          <div className="tb-protos" role="group" aria-label="Prototype">
            {PROTOS.map((p) => (
              <button key={p.id} type="button" id={`proto-${p.id}`} className={p.id === pick.proto ? "on" : ""} onClick={() => setPick({ proto: p.id })} aria-pressed={p.id === pick.proto}>
                {p.name}
              </button>
            ))}
          </div>
          <p className="tg-panel-note">{proto.how}</p>
          <Choice id="rule" label="THUMBS RULE" options={[["abs", "RIGHT = UP"], ["rel", "RELATIVE"]]} value={pick.relative ? "rel" : "abs"} set={(v) => setPick({ relative: v === "rel" })} />
          <Choice id="piece" label="PIECE" options={PIECES.map(([id, name]) => [id, name] as [PieceId, string])} value={pick.piece} set={(piece) => setPick({ piece, share: 0, voice: -1 })} />
          <Choice id="speed" label="SPEED" options={[["slow", "SLOW"], ["medium", "MEDIUM"], ["fast", "FAST"]]} value={pick.speed} set={(speed) => setPick({ speed })} />
          <LagSetting lag={lag} setLag={setLag} chip={ensureChip} />
        </Panel>
      )}
      {phase.kind === "help" && (
        <Panel title="THE PROTOTYPES" close={quit}>
          <section className="tg-help">
            <p>Every note needs its own touch, or a held thumb slid on (up or down, about a finger's width: the next note, glided into). The time picks the note; the prototype judges the gesture. Right: Bach's note, clear. Wrong: Bach's note, muffled, not counted.</p>
            <p>Everywhere: a note lasts while the thumb is down (a quick tap is staccato); tapping while the other thumb still holds joins the notes (legato); wobble sideways for vibrato.</p>
            {PROTOS.map((p) => (
              <div key={p.id}>
                <h2>{p.name}</h2>
                <p>{p.how}</p>
              </div>
            ))}
            <h2>SOUND DELAY</h2>
            <p>Late with headphones? ⚙ → SET BY TAPPING.</p>
          </section>
        </Panel>
      )}
      <div className="tg-upright" role="alert">
        Turn the phone upright
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
        {PIECES.find(([id]) => id === pick.piece)![1]} · {pick.speed.toUpperCase()}
      </p>
      <div className="tg-voices" role="group" aria-label="Voice">
        {f.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={i === pick.voice ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i)} onClick={() => setPick({ voice: i })} aria-pressed={i === pick.voice}>
            {name.toUpperCase()}
          </button>
        ))}
      </div>
      <label className="tg-from">
        <span>
          FROM {Math.round(pick.share * 100)}% · BAR {barAt(f, from)}
        </span>
        <input type="range" id="from" min={0} max={99} step={1} value={Math.round(pick.share * 100)} onChange={(e) => setPick({ share: Number(e.target.value) / 100 })} />
      </label>
      <p className="tg-title-help">{proto.how}</p>
      {note && <p className="tg-note">{note}</p>}
    </div>
  );
}
