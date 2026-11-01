/**
 * D441: a film of Glenn's (films.ts) played live: his lines with the box blank and Glenn at the piano;
 * excerpts drawn in the music box's manner (the player's voice white-bordered, the others in their inks,
 * flags riding on the notes he talks about, Busoni's signs where asked), sounded on the game's own
 * instrument; the second chapter on the game's screen (the strips, the thumbs taking turns). Pause, play,
 * a scrub bar from start to end, its second chapter marked and a button to jump there; Herr Bach's cameos.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { fugueById, type TouchFugue } from "../touch/fugue.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { readingsOf } from "../touch/readings.ts";
import { voicing, type Chip, type Sounding } from "../touch/chip.ts";
import { dynamic } from "./protos.ts";
import { Portrait } from "./Bach.tsx";
import { GlennAtPiano, GlennFace } from "./GlennFace.tsx";
import { AHEAD_S, RING_S, tickOf, timeline, type Cue, type Film, type Seg } from "./films.ts";

/** The last index where `ok` holds (−1: none). */
function lastIndex<T>(xs: readonly T[], ok: (x: T) => boolean): number {
  for (let i = xs.length - 1; i >= 0; i--) if (ok(xs[i])) return i;
  return -1;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function GlennFilm({ film, chip, close }: { film: Film; chip: () => Chip; close: () => void }) {
  const f = useMemo(() => fugueById(film.piece), [film.piece]);
  const { segs, total, chapter2 } = useMemo(() => timeline(film), [film]);
  const busoni = useMemo(() => readingsOf(film.piece).find((r) => r.id === "busoni")?.whole ?? null, [film.piece]);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const tRef = useRef(0);
  const sounding = useRef<Sounding[]>([]);
  const scheduled = useRef<number | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const seg = segs[lastIndex(segs, (s) => s.t0 <= t)] ?? segs[0];

  // The page's corner badges out of the way while the film is up (lab.css).
  useEffect(() => {
    document.documentElement.classList.add("glenn-film-open");
    return () => document.documentElement.classList.remove("glenn-film-open");
  }, []);
  // The instrument's samples for every note the film plays, loaded first.
  useEffect(() => {
    const ch = chip();
    const pitches = new Set<number>();
    for (const s of segs) if (s.clock) for (const v of f.voices) for (const n of v) if (n[0] < s.clock.to && n[0] + n[1] > s.clock.from) pitches.add(n[2]);
    void ch.prepare([...pitches], [...pitches]).then(() => setReady(true));
    return () => silence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const silence = () => {
    const ch = chip();
    for (const s of sounding.current) s.stop(ch.ctx.currentTime);
    sounding.current = [];
    scheduled.current = null;
  };

  /** A play cue sounded from its local second `tau` on. */
  const sound = (s: Seg, tau: number) => {
    const c = s.clock!;
    const cue = s.cue as Extract<Cue, { kind: "play" }>;
    const ch = chip();
    const now = ch.ctx.currentTime + 0.06;
    const voices = cue.voices ?? f.voices.map((_, i) => i);
    for (const v of voices)
      for (const [on, dur, midi] of f.voices[v]) {
        if (on >= c.to || on + dur <= c.from) continue;
        const a = c.at(Math.max(on, c.from));
        const endT = on + dur >= c.to ? c.end + RING_S : c.at(on + dur);
        if (endT <= tau) continue;
        const start = Math.max(a, tau);
        const lead = v === cue.lead;
        sounding.current.push(ch.note(midi, now + (start - tau), Math.max(0.05, endT - start), voicing(v, f.voices.length, lead), { ...dynamic(lead ? 0.55 : 0.4), ...(lead ? { lead: true } : {}) }));
      }
  };

  // The clock: the film's second advanced each frame while it plays; an excerpt sounded as it is reached.
  useEffect(() => {
    if (!playing) return void silence();
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const nt = Math.min(total, tRef.current + dt);
      tRef.current = nt;
      const k = lastIndex(segs, (s) => s.t0 <= nt);
      const s = segs[k];
      if (s?.clock && scheduled.current !== k) {
        silence();
        scheduled.current = k;
        sound(s, nt - s.t0);
      } else if (!s?.clock && scheduled.current !== null) scheduled.current = null;
      setT(nt);
      if (nt >= total) return setPlaying(false);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const seek = (to: number) => {
    const was = playing;
    silence();
    tRef.current = Math.max(0, Math.min(total, to));
    setT(tRef.current);
    if (was) {
      setPlaying(false);
      requestAnimationFrame(() => setPlaying(true));
    }
  };
  const toggle = () => {
    if (!ready) return;
    void chip().resume();
    if (tRef.current >= total) seek(0);
    setPlaying((p) => !p);
  };

  // The box: drawn each time the film's second changes.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !seg.clock) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) (cv.width = Math.round(W * dpr)), (cv.height = Math.round(H * dpr));
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBox(c, W, H, f, seg, t - seg.t0, busoni);
  }, [t, seg]);

  const cue = seg.cue;
  const game = (cue.kind === "say" || cue.kind === "play") && cue.screen === "game";
  const line = cue.kind === "say" ? cue.text : cue.kind === "play" ? (cue.say ?? "") : cue.kind === "chapter" ? cue.title : "";
  return (
    <div className={`glenn-film${game ? " glenn-film-game" : ""}`} id="glenn-film" role="dialog" aria-label={`Glenn: ${film.title}`}>
      <header className="glenn-film-head">
        <b>GLENN · {film.title}</b>
        <span>{seg.chapter === 2 ? "CHAPTER 2 · HOW TO PLAY IT" : "CHAPTER 1 · THE FUGUE"}</span>
        <button type="button" id="glenn-film-close" onClick={() => (silence(), close())}>
          ✕
        </button>
      </header>
      <div className="glenn-film-stage">
        {cue.kind === "play" ? (
          <>
            <canvas ref={canvas} className="glenn-film-box" id="glenn-film-box" />
            {line && (
              <div className="glenn-film-sub" id="glenn-film-sub">
                <GlennFace talking />
                <p>{line}</p>
              </div>
            )}
          </>
        ) : cue.kind === "cameo" ? (
          <div className="glenn-film-talk glenn-film-cameo" id="glenn-film-cameo">
            <Portrait talking who="bach" />
            <p>
              <small>HERR BACH</small>
              {cue.text}
            </p>
          </div>
        ) : cue.kind === "chapter" ? (
          <div className="glenn-film-talk glenn-film-chapter">
            <p>{cue.title}</p>
          </div>
        ) : game ? (
          <div className="glenn-film-talk glenn-film-gametalk">
            <div className="glenn-film-mock" aria-hidden="true">
              <i />
              <span />
              <i />
            </div>
            <div className="glenn-film-sub">
              <GlennFace talking />
              <p>{line}</p>
            </div>
          </div>
        ) : (
          <div className="glenn-film-talk">
            <GlennAtPiano talking className="glenn-film-scene" />
            <p id="glenn-film-line">{line}</p>
          </div>
        )}
      </div>
      <footer className="glenn-film-bar">
        <button type="button" id="glenn-film-play" className="glenn-film-btn" onClick={toggle} disabled={!ready}>
          {!ready ? "…" : playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          id="glenn-film-scrub"
          className="glenn-film-scrub"
          min={0}
          max={total}
          step={0.1}
          value={t}
          aria-label="Position in the film"
          style={{ ["--ch2" as string]: `${(100 * chapter2) / total}%`, ["--at" as string]: `${(100 * t) / total}%` }}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span className="glenn-film-time">
          {mmss(t)} / {mmss(total)}
        </span>
        <button type="button" id="glenn-film-howto" className="glenn-film-btn glenn-film-jump" onClick={() => seek(chapter2)}>
          ▶▶ HOW TO PLAY IT
        </button>
      </footer>
    </div>
  );
}

/** The excerpt as the box shows it at its local second `tau`. */
function drawBox(c: CanvasRenderingContext2D, W: number, H: number, f: TouchFugue, s: Seg, tau: number, busoni: ReturnType<typeof readingsOf>[number]["whole"] | null) {
  const clock = s.clock!;
  const cue = s.cue as Extract<Cue, { kind: "play" }>;
  const game = cue.screen === "game";
  const strip = game ? Math.round(W * 0.13) : 0;
  const bx = strip;
  const bw = W - 2 * strip;
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#0e1428";
  c.fillRect(0, 0, W, H);
  // The strips (the second chapter: the game's screen).
  if (game)
    for (const x of [0, W - strip]) {
      c.fillStyle = "#24181c";
      c.fillRect(x, 0, strip, H);
      c.fillStyle = inkOf(cue.lead, f.voices.length);
      c.fillRect(x === 0 ? strip - 3 : x, 0, 3, H);
    }
  const voices = cue.voices ?? f.voices.map((_, i) => i);
  const notes = voices.flatMap((v) => f.voices[v].filter((n) => n[0] < clock.to && n[0] + n[1] > clock.from).map((n) => ({ v, on: n[0], dur: n[1], midi: n[2] })));
  if (!notes.length) return;
  const lo = Math.min(...notes.map((n) => n.midi)) - 2;
  const hi = Math.max(...notes.map((n) => n.midi)) + 2;
  const top = 26;
  const yOf = (m: number) => top + ((hi - m) / Math.max(1, hi - lo)) * (H - top - 16);
  const lineX = bx + bw * 0.22;
  const pps = (bw * 0.78) / AHEAD_S;
  // The gold line.
  c.fillStyle = "#e8c94a";
  c.fillRect(lineX - 1, 0, 2, H);
  const lead = cue.lead;
  const leadNotes = notes.filter((n) => n.v === lead).sort((a, b) => a.on - b.on);
  for (const n of notes) {
    const a = clock.at(Math.max(n.on, clock.from));
    const e = n.on + n.dur >= clock.to ? clock.end : clock.at(n.on + n.dur);
    const x = lineX + (a - tau) * pps;
    const w = Math.max(3, (e - a) * pps - 2);
    if (x > W || x + w < bx) continue;
    const y = yOf(n.midi);
    const ink = inkOf(n.v, f.voices.length);
    const mine = n.v === lead;
    c.globalAlpha = mine ? 1 : 0.55;
    c.fillStyle = ink;
    c.fillRect(Math.max(bx, x), y - 4, w - Math.max(0, bx - x), mine ? 8 : 5);
    if (mine) {
      c.strokeStyle = "#ffffff";
      c.lineWidth = 1.5;
      c.strokeRect(Math.max(bx, x), y - 4, w - Math.max(0, bx - x), 8);
    }
    c.globalAlpha = 1;
    // Busoni's signs over the player's notes (the second chapter).
    if (cue.marks && mine && busoni && x > bx) {
      const m = busoni.marks.find((k) => k.v === lead && k.on === n.on);
      if (m) {
        c.fillStyle = "#f2eee0";
        if (m.art.includes("tenuto")) c.fillRect(x, y - 10, Math.min(12, w), 2);
        else if (m.art.includes("staccato")) c.fillRect(x + 2, y - 11, 3, 3);
      }
    }
  }
  // The thumbs: the note at the line taken by the thumb its turn gives (left, right, left…).
  if (cue.thumbs && game) {
    const k = lastIndex(leadNotes, (n) => clock.at(Math.max(n.on, clock.from)) <= tau);
    const n = leadNotes[k];
    if (n && tau < clock.end) {
      const left = k % 2 === 0;
      const y = yOf(n.midi);
      const cx = left ? strip / 2 : W - strip / 2;
      c.fillStyle = left ? "#e8c94a" : "#6fb3ff";
      c.beginPath();
      c.arc(cx, y, 11, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#0e1428";
      c.font = "bold 11px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText(left ? "L" : "R", cx, y + 4);
    }
  }
  // The flags: a pole on the note, the words above it, riding with it.
  c.font = "12px Georgia, serif";
  c.textAlign = "left";
  for (const fl of cue.flags ?? []) {
    const on = tickOf(f, fl.at);
    const n = notes.find((x) => x.v === fl.voice && Math.abs(x.on - on) < f.tpq / 8);
    if (!n) continue;
    const x = lineX + (clock.at(Math.max(n.on, clock.from)) - tau) * pps;
    if (x < bx - 40 || x > W) continue;
    const y = yOf(n.midi);
    const ty = Math.max(14, y - 30);
    const tw = c.measureText(fl.text).width + 10;
    c.fillStyle = "#e8c94a";
    c.fillRect(x, ty, 1.5, y - ty - 4);
    c.fillStyle = "rgba(14,20,40,0.9)";
    c.fillRect(x, ty - 14, tw, 16);
    c.strokeStyle = "#e8c94a";
    c.lineWidth = 1;
    c.strokeRect(x, ty - 14, tw, 16);
    c.fillStyle = "#f2eee0";
    c.fillText(fl.text, x + 5, ty - 2);
  }
}
