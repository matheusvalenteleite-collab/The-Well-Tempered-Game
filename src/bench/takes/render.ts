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
  /** The render's output in memory (MB): length × channels × 4 bytes. */
  outputMb: number;
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

function gameFor(job: RenderJob, chip: Chip): ProtoGame {
  const f = fugueById(job.piece);
  const main = job.takes[0];
  const reading = main.reading === "busoni" ? (playReading(f.id) ?? readingsOf(f.id).find((r) => r.id === main.reading) ?? null) : main.reading ? (readingsOf(f.id).find((r) => r.id === main.reading) ?? null) : null;
  const proto = protoById("ladder");
  const backing = job.takes.slice(1);
  const g = new ProtoGame(f, [main.voice], 0, proto, { bpm: job.bpm, legato: false, easy: easyOf(proto.id), fail: false, bt: false, reading, ornHint: false, scale: false, until: backing.length ? f.length : main.until, ...(backing.length ? { mute: backing.map((t) => t.voice) } : {}) }, chip);
  g.wall = () => 0;
  g.listen = new TakePlayer(main);
  g.backing = backing.map((t) => new TakePlayer(t));
  g.mix = job.mix;
  g.labGain = job.mix;
  return g;
}

const yieldNow = () => new Promise<void>((r) => setTimeout(r, 0));

/** The set rendered and encoded: the MP3 and the measurements. */
export async function renderMp3(job: RenderJob, progress: Progress = () => {}): Promise<{ mp3: Blob; stats: RenderStats }> {
  const f = fugueById(job.piece);
  const seconds = lengthOf(job);
  const sampleRate = rateFor(seconds);
  const frames = Math.ceil(seconds * sampleRate);
  const ac = new OfflineAudioContext(2, frames, sampleRate);
  const t0 = performance.now();
  progress("load", 0);
  const ch = new Chip(ac);
  ch.lag = 0;
  // Every recording the piece needs, and every pitch the takes sounded (their wrong notes too), loaded first.
  const pitches = [...new Set([...f.voices.flat().map((n) => n[2]), ...job.takes.flatMap((t) => t.notes.map((n) => n[2]))])];
  await ch.prepare(pitches, job.takes[0].notes.map((n) => n[2]), openingOf(f));
  await ch.openingReady;
  const loadMs = performance.now() - t0;
  const g = gameFor(job, ch);
  // The music only: no count-in clicks, no game sounds.
  ch.tick = () => {};
  ch.swoosh = () => {};
  // The silence before the first bar (the count-in's time) left out of the file.
  const first = Math.max(0, Math.floor((g.timeAt(0) - 0.05) * sampleRate));
  // The take heard alone sounds on the player's own bus, lifted as when it was played.
  if (job.takes.length === 1) ch.mine.gain.value = g.lift;
  const t1 = performance.now();
  const dt = STEP_FRAMES / sampleRate;
  let k = 1;
  let done = false;
  const tick = () => {
    if (!done) done = g.step();
    progress("render", Math.min(1, (k * dt) / seconds));
    k++;
    if (k * dt < seconds - dt) void ac.suspend(k * dt).then(tick);
    void ac.resume();
  };
  void ac.suspend(dt).then(tick);
  const out = await ac.startRendering();
  const renderMs = performance.now() - t1;
  const heapMb = heap();
  g.stopAll();
  // Encoded block by block, the page answering between blocks.
  const t2 = performance.now();
  const enc = new Mp3Encoder(2, sampleRate, MP3_KBPS);
  const L = out.getChannelData(0);
  const R = out.getChannelData(1);
  const parts: Uint8Array[] = [];
  const BLOCK = 1152 * 32;
  for (let i = first; i < L.length; i += BLOCK) {
    const chunk = enc.encodeBuffer(toInt16(L.subarray(i, i + BLOCK)), toInt16(R.subarray(i, i + BLOCK)));
    if (chunk.length) parts.push(chunk.slice());
    if ((i / BLOCK) % 8 === 0) {
      progress("encode", i / L.length);
      await yieldNow();
    }
  }
  const end = enc.flush();
  if (end.length) parts.push(end.slice());
  const mp3 = new Blob(parts as BlobPart[], { type: "audio/mpeg" });
  const encodeMs = performance.now() - t2;
  progress("encode", 1);
  return {
    mp3,
    stats: { seconds: Math.round(seconds * 10) / 10, sampleRate, outputMb: Math.round((frames * 2 * 4) / 1e5) / 10, loadMs: Math.round(loadMs), renderMs: Math.round(renderMs), encodeMs: Math.round(encodeMs), speed: Math.round((seconds / Math.max(0.001, renderMs / 1000)) * 10) / 10, mp3Kb: Math.round(mp3.size / 1024), heapMb },
  };
}
