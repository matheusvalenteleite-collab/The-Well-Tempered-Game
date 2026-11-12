/**
 * D722, RECORD YOUR FUGUE (phase 3): MY FUGUE (or one take) made into an MP3 on the device, faster than
 * real time: the game plays it into an offline audio context (the same engine and sound as heard, the
 * game's frame every 512 samples, as the Instruments' measurements render it), every recording the piece
 * and the takes need loaded before the first sample (else a stand-in synth note the run never had), then
 * the sound encoded block by block (the MP3 encoder the game already ships, D74) so the page answers
 * as it works. Everything is measured for the owner's iPhone test: the length, the rate, the memory the
 * render's output takes, how long loading, rendering and encoding took, the file's size.
 */
import { Mp3Encoder } from "@breezystack/lamejs";
import { Chip, openingOf } from "../../touch/chip.ts";
import { fugueById } from "../../touch/fugue.ts";
import { playReading, readingsOf } from "../../touch/readings.ts";
import { ProtoGame } from "../proto-game.ts";
import { easyOf, protoById } from "../protos.ts";
import { silentChip } from "../lab/replay.ts";
import { toInt16 } from "../../audio/export.ts";
import { TakePlayer, type Take } from "./take.ts";

/** Frames between the game's steps (as the measurements render). */
const STEP_FRAMES = 512;
/** Seconds of sound after the last note (the room's tail). */
const TAIL_S = 3;
/** D722: the rate: a phone's memory for the output (stereo, 4 bytes a sample) kept near 60 MB for 4 minutes; longer pieces lower. */
export function rateFor(seconds: number): number {
  return seconds <= 300 ? 32000 : 24000;
}
/** The MP3's bit rate (kbit/s): about a megabyte a minute, what WhatsApp takes as audio. */
export const MP3_KBPS = 128;

export interface RenderStats {
  seconds: number;
  sampleRate: number;
  /** The render's output in memory at its peak (MB): the longest part's length × channels × 4 bytes (D724). */
  outputMb: number;
  /** D724: the parts it was rendered in. */
  parts: number;
  loadMs: number;
  renderMs: number;
  encodeMs: number;
  /** Rendering speed (seconds of sound a second). */
  speed: number;
  mp3Kb: number;
  /** The browser's own heap readings (Chrome only; null elsewhere, Safari among them). */
  heapMb: number | null;
}

export interface RenderJob {
  piece: string;
  /** The takes, one a voice (the first the "player's", the others behind it), all heard together. */
  takes: readonly Take[];
  bpm: number;
  /** A level a voice (the mixer's, `gains`). */
  mix: readonly number[];
}

type Progress = (stage: "load" | "render" | "encode", share: number) => void;

const heap = (): number | null => {
  const m = (performance as { memory?: { usedJSHeapSize: number } }).memory;
  return m ? Math.round(m.usedJSHeapSize / 1e5) / 10 : null;
};

/** How long the set lasts (s), as the game times it (its tempo, ritardando, fermatas), with the tail. */
export function lengthOf(job: RenderJob): number {
  const g = gameFor(job, silentChip({ t: 0 }));
  return g.timeAt(g.end) - g.timeAt(g.start) + TAIL_S;
}

function gameFor(job: RenderJob, chip: Chip, from = 0, until?: number): ProtoGame {
  const f = fugueById(job.piece);
  const main = job.takes[0];
  const reading = main.reading === "busoni" ? (playReading(f.id) ?? readingsOf(f.id).find((r) => r.id === main.reading) ?? null) : main.reading ? (readingsOf(f.id).find((r) => r.id === main.reading) ?? null) : null;
  const proto = protoById("ladder");
  const backing = job.takes.slice(1);
  const last = backing.length ? f.length : main.until;
  const g = new ProtoGame(f, [main.voice], from, proto, { bpm: job.bpm, legato: false, easy: easyOf(proto.id), fail: false, bt: false, reading, ornHint: false, scale: false, until: Math.min(last, until ?? last), ...(from > 0 ? { countBeats: 1 } : {}), ...(backing.length ? { mute: backing.map((t) => t.voice) } : {}) }, chip);
  g.wall = () => 0;
  g.listen = new TakePlayer(main, from > 0 ? from : -Infinity);
  g.backing = backing.map((t) => new TakePlayer(t, from > 0 ? from : -Infinity));
  g.mix = job.mix;
  g.labGain = job.mix;
  return g;
}

const yieldNow = () => new Promise<void>((r) => setTimeout(r, 0));

/** D724: a part's length (s of music): the render's peak memory is a part's, not the piece's. */
export const PART_S = 30;
/** D724: each part begins this many bars early (their sound let ring into the part, then dropped), and overlaps the next by a short crossfade. */
export const PRE_BARS = 2;
export const XFADE_S = 0.03;

/** The parts: bar-aligned ticks [from, to), about PART_S each. */
export function partsOf(job: RenderJob): { from: number; to: number }[] {
  const f = fugueById(job.piece);
  const g = gameFor(job, silentChip({ t: 0 }));
  const end = g.end;
  const barS = Math.max(0.2, g.timeAt(f.barTicks) - g.timeAt(0));
  const per = Math.max(2, Math.round(PART_S / barS)) * f.barTicks;
  const out: { from: number; to: number }[] = [];
  for (let a = 0; a < end; a += per) out.push({ from: a, to: Math.min(end, a + per) });
  return out;
}

/**
 * The set rendered and encoded (D722), in parts (D724): each part played into its own short offline
 * context from two bars before it (the notes and the room already sounding at its start), its own
 * stretch kept and joined to the last by a 30 ms crossfade, encoded at once and let go, so the memory a
 * render needs at its peak is one part's (about 9 MB at 32 kHz), whatever the piece's length.
 */
export async function renderMp3(job: RenderJob, progress: Progress = () => {}): Promise<{ mp3: Blob; stats: RenderStats }> {
  const f = fugueById(job.piece);
  const seconds = lengthOf(job);
  const sampleRate = rateFor(seconds);
  const t0 = performance.now();
  progress("load", 0);
  // Every recording the piece needs, and every pitch the takes sounded (their wrong notes too), loaded first
  // (the recordings are kept by the page, not by a context: every part's context plays the same ones).
  {
    const probe = new Chip(new OfflineAudioContext(2, sampleRate, sampleRate));
    const pitches = [...new Set([...f.voices.flat().map((n) => n[2]), ...job.takes.flatMap((t) => t.notes.map((n) => n[2]))])];
    await probe.prepare(pitches, job.takes[0].notes.map((n) => n[2]), openingOf(f));
    await probe.openingReady;
  }
  const loadMs = performance.now() - t0;
  const parts = partsOf(job);
  const enc = new Mp3Encoder(2, sampleRate, MP3_KBPS);
  const mp3: Uint8Array[] = [];
  const xf = Math.round(XFADE_S * sampleRate);
  let carry: [Float32Array, Float32Array] | null = null;
  let renderMs = 0;
  let encodeMs = 0;
  let peakFrames = 0;
  let heapMb: number | null = null;
  const push = async (l: Float32Array, r: Float32Array) => {
    const t = performance.now();
    const B = 1152 * 32;
    for (let i = 0; i < l.length; i += B) {
      const c = enc.encodeBuffer(toInt16(l.subarray(i, i + B)), toInt16(r.subarray(i, i + B)));
      if (c.length) mp3.push(c.slice());
    }
    encodeMs += performance.now() - t;
    await yieldNow();
  };
  for (const [pi, part] of parts.entries()) {
    const last = pi === parts.length - 1;
    const from = Math.max(0, part.from - PRE_BARS * f.barTicks);
    // Its own context, long enough for the part, its lead-in and (the last) the room's tail. Every part's game
    // runs to the piece's end (so its tempo, ritardando and fermatas are the whole piece's); the context stops it.
    const probe = gameFor(job, silentChip({ t: 0 }), from);
    const stop = (last ? probe.timeAt(probe.end) + TAIL_S : probe.timeAt(part.to) + XFADE_S + 0.05) + 0.02;
    const frames = Math.ceil(stop * sampleRate);
    peakFrames = Math.max(peakFrames, frames);
    const ac = new OfflineAudioContext(2, frames, sampleRate);
    const ch = new Chip(ac);
    ch.lag = 0;
    const g = gameFor(job, ch, from);
    // The music only: no count-in clicks, no game sounds.
    ch.tick = () => {};
    ch.swoosh = () => {};
    // The take heard alone sounds on the player's own bus, lifted as when it was played.
    if (job.takes.length === 1) ch.mine.gain.value = g.lift;
    const t1 = performance.now();
    const dt = STEP_FRAMES / sampleRate;
    let k = 1;
    let over = false;
    const tick = () => {
      if (!over) over = g.step();
      progress("render", (pi + Math.min(1, (k * dt) / stop)) / parts.length);
      k++;
      if (k * dt < stop - dt) void ac.suspend(k * dt).then(tick);
      void ac.resume();
    };
    void ac.suspend(dt).then(tick);
    const out = await ac.startRendering();
    renderMs += performance.now() - t1;
    heapMb = Math.max(heapMb ?? 0, heap() ?? 0) || heapMb;
    g.stopAll();
    // The part's own stretch: from its first bar (less the crossfade's overlap) to the next part's first bar (and the overlap).
    const a = Math.max(0, Math.round((g.timeAt(part.from) - (pi === 0 ? 0.05 : 0)) * sampleRate));
    const b = last ? out.length : Math.min(out.length, Math.round(g.timeAt(part.to) * sampleRate) + xf);
    let L = out.getChannelData(0).slice(a, b);
    let R = out.getChannelData(1).slice(a, b);
    if (carry) {
      const n = Math.min(xf, carry[0].length, L.length);
      for (let i = 0; i < n; i++) {
        const w = (i + 0.5) / n;
        L[i] = carry[0][i] * (1 - w) + L[i] * w;
        R[i] = carry[1][i] * (1 - w) + R[i] * w;
      }
    }
    if (!last && L.length > xf) {
      carry = [L.slice(L.length - xf), R.slice(R.length - xf)];
      L = L.subarray(0, L.length - xf);
      R = R.subarray(0, R.length - xf);
    } else carry = null;
    await push(L, R);
    progress("encode", (pi + 1) / parts.length);
  }
  const end = enc.flush();
  if (end.length) mp3.push(end.slice());
  const blob = new Blob(mp3 as BlobPart[], { type: "audio/mpeg" });
  progress("encode", 1);
  return {
    mp3: blob,
    stats: { seconds: Math.round(seconds * 10) / 10, sampleRate, outputMb: Math.round((peakFrames * 2 * 4) / 1e5) / 10, parts: parts.length, loadMs: Math.round(loadMs), renderMs: Math.round(renderMs), encodeMs: Math.round(encodeMs), speed: Math.round((seconds / Math.max(0.001, renderMs / 1000)) * 10) / 10, mp3Kb: Math.round(blob.size / 1024), heapMb },
  };
}
