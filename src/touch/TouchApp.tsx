/**
 * The touch game. Step 3 (D160), one-voice mode: the player chooses a voice and plays it through the
 * exposition on its lanes (tap, hold, slide), on a steady 8-bit beat, and hears only what they play.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MusicBox, VOICE_INKS, type Frame } from "./MusicBox.tsx";
import { PlayArea, type ThumbEvents } from "./PlayArea.tsx";
import { Chip } from "./chip.ts";
import { FUGUE, keyAt, keyName } from "./fugue.ts";
import { easyLanes, laneAt, points, release, strike, sweep } from "./lanes.ts";
import { EARN, level, type Level } from "./voice-mode.ts";

const TEMPOS = [48, 60, 72];
const SECTION = 0;
const BEST_KEY = "tg-best-v1";

type Phase = { kind: "title" } | { kind: "play" } | { kind: "result"; got: number; of: number };

function loadBest(): Record<number, number> {
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
}

export function TouchApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [voice, setVoice] = useState(1);
  const [bpm, setBpm] = useState(60);
  const [best, setBest] = useState<Record<number, number>>(loadBest);
  const [lit, setLit] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ lane: number; id: number } | null>(null);
  const lv = useMemo(() => level(FUGUE, SECTION, voice), [voice, phase.kind === "play"]);
  const frame = useRef<Frame>({ now: 0, tps: 1, key: "c", voice, notes: [], lanes: 0, touched: [], flashes: [] });
  const chip = useRef<Chip | null>(null);
  const live = useRef<Live | null>(null);
  const count = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  const opt = easyLanes(FUGUE.tpq, bpm);

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
    const g: Live = { lv, tickAt, tps, held: new Map(), flashes: [] };
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
          const next = { ...b, [lv.voice]: Math.max(b[lv.voice] ?? 0, pct) };
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
  }, [phase, lv, bpm]);

  const start = () => {
    // A touch starts the sound: browsers allow audio only after one.
    if (!chip.current) chip.current = new Chip();
    void chip.current.resume();
    if (performance.now() - shownAt.current < 350) return;
    setPhase({ kind: "play" });
  };

  // The thumbs: a landing or a slide into a lane is a strike; a lift or a slide away lets go.
  const events: ThumbEvents = {
    down: (id, y, h, ts) => {
      const g = live.current;
      if (!g || !chip.current) return start();
      play(g, id, laneAt(y, h, g.lv.lanes.length), ts);
    },
    move: (id, y, h, ts) => {
      const g = live.current;
      const cur = g?.held.get(id);
      if (!g || !cur) return;
      const lane = laneAt(y, h, g.lv.lanes.length);
      if (lane === cur.lane) return;
      letGo(g, id, ts);
      play(g, id, lane, ts);
    },
    up: (id, ts) => {
      const g = live.current;
      if (g) letGo(g, id, ts);
      g?.held.delete(id);
      setLit(g ? [...g.held.values()].map((x) => x.lane) : []);
    },
  };

  const tickOf = (g: Live, ts: number) => g.tickAt(chip.current!.heard() - (performance.now() - ts) / 1000);

  function play(g: Live, id: number, lane: number, ts: number) {
    const t = tickOf(g, ts);
    const i = strike(g.lv.notes, lane, t, opt);
    const held: Held = { lane, note: i };
    if (i >= 0) {
      const n = g.lv.notes[i];
      held.sound = chip.current!.note(n.midi, chip.current!.ctx.currentTime, Math.max(0.05, (n.on + n.dur - t) / g.tps));
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
        {phase.kind === "title" && <Title voice={voice} setVoice={setVoice} bpm={bpm} setBpm={setBpm} best={best} />}
        {phase.kind === "result" && <Result got={phase.got} of={phase.of} voice={voice} again={() => setPhase({ kind: "title" })} />}
      </MusicBox>
      <PlayArea events={events} lanes={lv.lanes} lit={lit} wrong={wrong} hint={playing ? "" : "TAP BELOW TO START"} />
      <div className="tg-upright" role="alert">
        Turn the phone upright
      </div>
    </div>
  );
}

function Title({ voice, setVoice, bpm, setBpm, best }: { voice: number; setVoice: (v: number) => void; bpm: number; setBpm: (n: number) => void; best: Record<number, number> }) {
  return (
    <div className="tg-card">
      <h1>{FUGUE.title.toUpperCase()}</h1>
      <p className="tg-card-sub">THE EXPOSITION · BARS 1–9 · CHOOSE A VOICE</p>
      <div className="tg-voices" role="group" aria-label="Voice">
        {FUGUE.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={i === voice ? "on" : ""} style={{ color: VOICE_INKS[i] }} onClick={() => setVoice(i)}>
            {name.toUpperCase()}
            <small>{best[i] !== undefined ? `${best[i]}%${best[i] >= EARN * 100 ? " ★" : ""}` : "—"}</small>
          </button>
        ))}
      </div>
      <p>Each lane is a note of your voice. Tap it to play the note, hold the long ones, slide to the next lane to slur. You hear only what you play.</p>
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
