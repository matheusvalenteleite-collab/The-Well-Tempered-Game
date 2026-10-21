/**
 * The touch game. Step 3 (D160), one-voice mode: the player chooses a voice and plays it through the
 * exposition on its lanes (tap, hold, slide), on a steady 8-bit beat, and hears only what they play.
 * D161: three levels (rhythm, shape, notes) and the keyboard on a computer (space for a tap; the
 * arrows for higher and lower in shape). D162: SHAPE judged against the player's previous touch.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MusicBox, VOICE_INKS, type Frame } from "./MusicBox.tsx";
import { PlayArea, type ThumbEvents } from "./PlayArea.tsx";
import { Chip } from "./chip.ts";
import { FUGUE, keyAt, keyName } from "./fugue.ts";
import { easyLanes, fits, laneAt, LEVELS, points, release, SLIDE, stepInto, strike, sweep, type Level as Difficulty } from "./lanes.ts";
import { EARN, level, type Level } from "./voice-mode.ts";

const TEMPOS = [48, 60, 72];
const SECTION = 0;
const BEST_KEY = "tg-best-v2";
const DIFFICULTY: Record<Difficulty, { name: string; text: string }> = {
  rhythm: { name: "RHYTHM", text: "Only the time counts: tap anywhere when a note arrives, hold the long ones. Your voice plays its own notes." },
  shape: { name: "SHAPE", text: "Time and direction: tap a little higher than your last touch when the line goes up, lower when it goes down, about the same for a repeat. Or slide while holding." },
  notes: { name: "NOTES", text: "Each lane is a note of your voice: tap it in time, hold the long ones, slide to the next lane to slur." },
};
/** The keyboard on a computer: a tap, or (in shape) a step up or down. */
const KEYS: Record<string, -1 | 0 | 1> = { Space: 0, KeyJ: 0, KeyF: 0, KeyK: 0, KeyD: 0, ArrowRight: 0, ArrowLeft: 0, ArrowUp: 1, ArrowDown: -1 };

/** A key's pointer id, clear of the touches'. */
const keyId = (code: string) => 1000 + Object.keys(KEYS).indexOf(code);

type Phase = { kind: "title" } | { kind: "play" } | { kind: "result"; got: number; of: number };

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** A thumb on a lane: the note it is playing (or -1) and that note's sound. */
interface Held {
  lane: number;
  note: number;
  sound?: { stop: (at?: number) => void };
}

/** The live game, read by the pointer handlers and the frame loop alike. */
interface Live {
  lv: Level;
  tickAt: (audioTime: number) => number;
  tps: number;
  held: Map<number, Held>;
  flashes: { lane: number; at: number }[];
  /** The lane of the player's previous event (for the box). */
  lastLane: number | null;
  /** SHAPE: the height of the player's previous touch, as a share of the play area (0 at the top). */
  anchor: number | null;
}

export function TouchApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [voice, setVoice] = useState(1);
  const [bpm, setBpm] = useState(60);
  const [diff, setDiff] = useState<Difficulty>("rhythm");
  const [best, setBest] = useState<Record<string, number>>(loadBest);
  const [lit, setLit] = useState<number[]>([]);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [wrong, setWrong] = useState<{ lane: number; id: number } | null>(null);
  const lv = useMemo(() => level(FUGUE, SECTION, voice), [voice, phase.kind === "play"]);
  const frame = useRef<Frame>({ now: 0, tps: 1, key: "c", voice, notes: [], lanes: 0, touched: [], flashes: [] });
  const chip = useRef<Chip | null>(null);
  const live = useRef<Live | null>(null);
  const count = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  const opt = easyLanes(FUGUE.tpq, bpm, diff);
  const bestKey = `${voice}-${diff}`;

  // Away from play, the box shows the voice's opening.
  useEffect(() => {
    shownAt.current = performance.now();
    if (phase.kind === "title")
      frame.current = { now: lv.first - FUGUE.tpq, tps: 1, key: keyAt(FUGUE, lv.first), voice, notes: lv.notes, lanes: lv.lanes.length, touched: [], flashes: [] };
  }, [phase, lv, voice]);

  // Playing: the beat on the audio clock; misses swept and the box drawn every frame.
  useEffect(() => {
    if (phase.kind !== "play" || !chip.current) return;
    const ch = chip.current;
    const beat = FUGUE.tpq;
    const tps = (FUGUE.tpq * bpm) / 60;
    const T0 = ch.ctx.currentTime + 0.15;
    const tickAt = (t: number) => lv.start + (t - T0) * tps;
    const timeAt = (tick: number) => T0 + (tick - lv.start) / tps;
    const entry = lv.start + 4 * beat;
    const g: Live = { lv, tickAt, tps, held: new Map(), flashes: [], lastLane: null, anchor: null };
    live.current = g;
    let nextBeat = lv.start;
    let raf = 0;
    const loop = () => {
      while (nextBeat <= lv.end && timeAt(nextBeat) < ch.ctx.currentTime + 0.25) {
        ch.tick(timeAt(nextBeat), nextBeat % (4 * beat) === 0, nextBeat < entry ? 0.16 : 0.05);
        nextBeat += beat;
      }
      const now = tickAt(ch.heard());
      sweep(lv.notes, now, opt);
      g.flashes = g.flashes.filter((f) => now - f.at < tps);
      frame.current = {
        now,
        tps,
        key: keyAt(FUGUE, now),
        voice: lv.voice,
        notes: lv.notes,
        lanes: lv.lanes.length,
        touched: [...g.held.values()].map((h) => h.lane),
        flashes: g.flashes,
      };
      if (count.current) count.current.textContent = now < entry ? String(Math.min(4, Math.ceil((entry - now) / beat))) : "";
      if (now > lv.end) {
        for (const h of g.held.values()) h.sound?.stop();
        live.current = null;
        const p = points(lv.notes, opt);
        const pct = Math.round((100 * p.got) / p.of);
        setBest((b) => {
          const next = { ...b, [bestKey]: Math.max(b[bestKey] ?? 0, pct) };
          try {
            localStorage.setItem(BEST_KEY, JSON.stringify(next));
          } catch {
            /* no storage: the best stays for this visit */
          }
          return next;
        });
        setLit([]);
        setPhase({ kind: "result", got: p.got, of: p.of });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      live.current = null;
      if (count.current) count.current.textContent = "";
    };
  }, [phase, lv, bpm, diff]);

  // The keyboard: a key down is a landing, a key up a lift; on the title, space starts.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!(e.code in KEYS) || e.repeat) return;
      const g = live.current;
      if (!g) {
        if (e.code === "Space" && phase.kind !== "play") (e.preventDefault(), start());
        return;
      }
      e.preventDefault();
      if (diff === "notes") return;
      play(g, keyId(e.code), null, e.timeStamp, KEYS[e.code]);
    };
    const up = (e: KeyboardEvent) => {
      if (!(e.code in KEYS)) return;
      events.up(keyId(e.code), e.timeStamp);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const start = () => {
    // A touch starts the sound: browsers allow audio only after one.
    if (!chip.current) chip.current = new Chip();
    void chip.current.resume();
    if (performance.now() - shownAt.current < 350) return;
    setAnchor(null);
    setPhase({ kind: "play" });
  };

  // The thumbs. NOTES: a landing or a slide into a lane is a strike. SHAPE: a landing is judged against
  // the anchor (the player's previous touch); a held thumb sliding far enough from it plays the next
  // note if the line moves that way (a slur). RHYTHM: only landings count.
  const events: ThumbEvents = {
    down: (id, y, h, ts) => {
      const g = live.current;
      if (!g || !chip.current) return start();
      play(g, id, { lane: laneAt(y, h, g.lv.lanes.length), y: y / h }, ts);
    },
    move: (id, y, h, ts) => {
      const g = live.current;
      const cur = g?.held.get(id);
      if (!g || !cur) return;
      if (diff === "notes") {
        const lane = laneAt(y, h, g.lv.lanes.length);
        if (lane === cur.lane) return;
        letGo(g, id, ts);
        play(g, id, { lane, y: y / h }, ts);
      } else if (diff === "shape" && g.anchor !== null && Math.abs(g.anchor - y / h) >= SLIDE) {
        play(g, id, { lane: cur.lane, y: y / h }, ts, 0, true);
      }
    },
    up: (id, ts) => {
      const g = live.current;
      if (g) letGo(g, id, ts);
      g?.held.delete(id);
      setLit(g ? [...g.held.values()].map((x) => x.lane) : []);
    },
  };

  const tickOf = (g: Live, ts: number) => g.tickAt(chip.current!.heard() - (performance.now() - ts) / 1000);

  /**
   * An event: a thumb at `at` (its lane, and its height as a share of the play area, 0 at the top), or
   * a key (at null) with its direction. A slide that plays nothing changes nothing.
   */
  function play(g: Live, id: number, at: { lane: number; y: number } | null, ts: number, keyDir: -1 | 0 | 1 = 0, slide = false) {
    const t = tickOf(g, ts);
    const notes = g.lv.notes;
    const dy = at === null ? keyDir * 0.1 : g.anchor === null ? null : g.anchor - at.y;
    const i = strike(notes, at?.lane ?? 0, t, opt, (k) => (!slide || stepInto(notes, k) !== 0) && fits(diff, notes, k, at?.lane ?? notes[k].lane, dy, opt, at ? g.anchor : null));
    if (slide && i < 0) return;
    if (slide) letGo(g, id, ts);
    const n = g.lv.lanes.length;
    const last = g.lastLane ?? Math.floor(n / 2);
    const lane = diff === "notes" && at ? at.lane : i >= 0 ? notes[i].lane : Math.max(0, Math.min(n - 1, last + keyDir));
    g.lastLane = lane;
    if (at) g.anchor = at.y;
    setAnchor(g.anchor);
    const held: Held = { lane, note: i };
    if (i >= 0) {
      const note = notes[i];
      held.sound = chip.current!.note(note.midi, chip.current!.ctx.currentTime, Math.max(0.05, (note.on + note.dur - t) / g.tps));
    } else {
      g.flashes.push({ lane, at: t });
      setWrong({ lane, id: Math.random() });
    }
    g.held.set(id, held);
    setLit([...g.held.values()].map((x) => x.lane));
  }

  function letGo(g: Live, id: number, ts: number) {
    const cur = g.held.get(id);
    if (!cur) return;
    cur.sound?.stop();
    if (cur.note >= 0) release(g.lv.notes, cur.note, tickOf(g, ts));
  }

  const playing = phase.kind === "play";
  return (
    <div className="tg-app">
      <MusicBox
        fugue={FUGUE}
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">BARS 1–9 · {FUGUE.voiceNames[voice].toUpperCase()}</span>
            <span className="tg-hud-bar">{keyName(frame.current.key)}</span>
          </>
        }
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        {phase.kind === "title" && <Title voice={voice} setVoice={setVoice} bpm={bpm} setBpm={setBpm} diff={diff} setDiff={setDiff} best={best} />}
        {phase.kind === "result" && <Result got={phase.got} of={phase.of} voice={voice} again={() => setPhase({ kind: "title" })} />}
      </MusicBox>
      <PlayArea
        events={events}
        lanes={diff === "notes" ? lv.lanes : []}
        lit={lit}
        wrong={diff === "notes" ? wrong : null}
        anchor={diff === "shape" && playing ? anchor : null}
        hint={playing ? "" : "TAP HERE OR PRESS SPACE"}
      />
      <div className="tg-upright" role="alert">
        Turn the phone upright
      </div>
    </div>
  );
}

function Title(p: {
  voice: number;
  setVoice: (v: number) => void;
  bpm: number;
  setBpm: (n: number) => void;
  diff: Difficulty;
  setDiff: (d: Difficulty) => void;
  best: Record<string, number>;
}) {
  const { voice, setVoice, bpm, setBpm, diff, setDiff, best } = p;
  const b = (i: number) => best[`${i}-${diff}`];
  return (
    <div className="tg-card">
      <h1>{FUGUE.title.toUpperCase()}</h1>
      <p className="tg-card-sub">THE EXPOSITION · BARS 1–9 · CHOOSE A VOICE</p>
      <div className="tg-voices" role="group" aria-label="Voice">
        {FUGUE.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={i === voice ? "on" : ""} style={{ color: VOICE_INKS[i] }} onClick={() => setVoice(i)}>
            {name.toUpperCase()}
            <small>{b(i) !== undefined ? `${b(i)}%${b(i) >= EARN * 100 ? " ★" : ""}` : "—"}</small>
          </button>
        ))}
      </div>
      <div className="tg-voices" role="group" aria-label="Level">
        {LEVELS.map((d) => (
          <button key={d} type="button" id={`level-${d}`} className={d === diff ? "on tg-level" : "tg-level"} onClick={() => setDiff(d)}>
            {DIFFICULTY[d].name}
          </button>
        ))}
      </div>
      <p>{DIFFICULTY[diff].text} You hear only what you play.</p>
      <p className="tg-card-sub">{diff === "notes" ? "COMPUTER: THE MOUSE ON THE LANES" : diff === "shape" ? "COMPUTER: ↑ HIGHER · ↓ LOWER · SPACE THE SAME" : "COMPUTER: SPACE BAR"}</p>
      <div className="tg-tempo" role="group" aria-label="Tempo">
        {TEMPOS.map((t) => (
          <button key={t} type="button" id={`tempo-${t}`} className={t === bpm ? "on" : ""} onClick={() => setBpm(t)}>
            <span className="tg-q">♩</span>={t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Result({ got, of, voice, again }: { got: number; of: number; voice: number; again: () => void }) {
  const ok = got >= EARN * of;
  return (
    <div className="tg-card tg-card-low">
      <h1 className={ok ? "tg-gold" : ""}>{ok ? `${FUGUE.voiceNames[voice].toUpperCase()} EARNED` : "NOT YET"}</h1>
      <p className="tg-card-sub">
        {got} OF {of} NOTES · {Math.round((100 * got) / of)}% · {Math.round(EARN * 100)}% TO EARN IT
      </p>
      <button type="button" id="again" className="tg-link" onClick={again}>
        Choose a voice or tempo
      </button>
    </div>
  );
}
