/**
 * D190, the recorded instruments of the bench and the touch game: a harpsichord (VCSL "Harpsichord,
 * Unk", Harpsi4: every key A1-F6, with its key-up "thunk") and an organ (VCSL Pipe Organ, Ivy Audio's
 * loud manual every minor third C1-C6 and its loud pedal C1-F#3, looped); D292, a grand piano
 * (Salamander Grand Piano V3, Alexander Holm, CC BY 3.0: every minor third A1-C7). chip.ts plays them
 * (`sampledNote`); this module says which recordings a piece needs, fetches and decodes only those, and
 * how to retune them.
 *
 * Why only some notes: a decoded second of stereo at 48 kHz is 384 KB, and Safari on an iPhone drops a
 * page that holds too much (research: about 150 MB of audio at most); the whole harpsichord would be
 * about 110 MB. So a piece loads the recordings of its own range (and a little either side, for bends
 * and wrong notes), the rest are let go, and a phone over budget keeps the harpsichord in mono.
 * Why per file and not the pack (D112): a file is a plain GET, which GitHub Pages serves with CORS and
 * which the browser caches; a Range request may need a CORS preflight the site does not answer.
 * Until a note's recording is decoded, the note is played by the synthesized patch (chip.ts), so a
 * piece never goes silent; a set that cannot be had at all stays synthesized (as P13's choirs).
 */
import { SAMPLE_MANIFEST } from "../audio/sample-manifest.ts";
import { SITE } from "../audio/site.ts";
import { SAMPLED_NOTES as HARPSI_ORGAN } from "./sampled-data.ts";

/**
 * D292: the Salamander Grand's notes (public/samples/grand: every minor third A1-C7, two velocity layers;
 * the game plays layer 12): each 7.03 s as trimmed, the highest shorter (measured with ffprobe); taken
 * as in tune (the set was tuned when recorded; the game retunes every note by its rate anyway).
 */
const GRAND_SHORT: Record<string, number> = { A6: 6.766, C6: 6.296, C7: 4.519, Ds6: 6.87, Fs6: 6.165 };
const GRAND_NOTES = Object.fromEntries((SAMPLE_MANIFEST.grand?.notes ?? []).map((n) => [n, { cents: 0, len: GRAND_SHORT[n] ?? 7.027 }]));

/** Every recorded note's measured tuning, length and loop (the harpsichord and organ's, D190; D288: the ensembles' withdrawn; D292: the grand piano's). */
const SAMPLED_NOTES: Record<string, Record<string, { cents: number; len: number; loop?: [number, number] }>> = { ...HARPSI_ORGAN, grand: GRAND_NOTES };

export type SampledId = "harpsichord" | "organ" | "piano";

export interface SampledInstrument {
  /** The recordings (a folder of public/samples). */
  set: string;
  /** The key-up noises, one per note of `set` (the harpsichord's jacks and dampers). */
  release?: string;
  /** The pedal's recordings, for ORGANO PLENO's octave below. */
  low?: string;
  /** Plucked: dies away by itself, damped at the written end; else held (looped) until let go. */
  plucked: boolean;
  /** Level against the synthesized patches (measured in a browser: equal RMS over a note's first second at C4). */
  gain: number;
  /** D292: the velocity layer played, where the set has several (its files named "C4-v12.mp3"). */
  layer?: number;
}

export const SAMPLED: Record<SampledId, SampledInstrument> = {
  harpsichord: { set: "harpsichord", release: "harpsichordRel", plucked: true, gain: 1.7 },
  organ: { set: "pipeOrgan", low: "pipePedal", plucked: false, gain: 5 },
  // D292: the grand piano, struck (it dies away by itself, damped at the written end), one layer only
  // (12 of Salamander's 16, forte: its hammer and overtones carry on a phone's speaker; layer 7 is 5 dB
  // softer and duller). Its gain set by measurement: II/22 rendered offline through chip.ts, all four
  // voices, as loud as CLASSIC CHIP and the harpsichord (about -22 LUFS) with the patches' level 0.3.
  piano: { set: "grand", plucked: true, gain: 3.5, layer: 12 },
};

/** D292: the layer each layered set plays (its files' suffix). */
const LAYER = new Map(Object.values(SAMPLED).filter((i) => i.layer).map((i) => [i.set, i.layer!]));
/** A note's file in its set: "Cs4.mp3", or with the layer played "Cs4-v12.mp3". */
export const fileOf = (set: string, m: number) => `${nameOfMidi(m)}${LAYER.has(set) ? `-v${LAYER.get(set)}` : ""}.mp3`;

/** Sets recorded in stereo (the struck string's image); the rest are mono. */
const STEREO = new Set(["harpsichord", "grand"]);

const PCS: Record<string, number> = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
const NAMES = Object.keys(PCS);

/** "Cs4" (the files' names; C4 is middle C, MIDI 60) to its MIDI number. */
export function midiOfName(n: string): number {
  const m = /^([A-G]s?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`not a note name: ${n}`);
  return 12 * (Number(m[2]) + 1) + PCS[m[1]];
}
export const nameOfMidi = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

const midisOf = new Map<string, number[]>();
/** The MIDI numbers recorded in a set, low to high. */
export function sampledMidis(set: string): number[] {
  let list = midisOf.get(set);
  if (!list) midisOf.set(set, (list = (SAMPLE_MANIFEST[set]?.notes ?? []).map(midiOfName).sort((a, b) => a - b)));
  return list;
}

/** The recording nearest a pitch (the lower of two equally near), among those `have` allows. */
export function nearestSample(set: string, midi: number, have: (m: number) => boolean = () => true): number | null {
  let best: number | null = null;
  for (const m of sampledMidis(set)) if (have(m) && (best === null || Math.abs(m - midi) < Math.abs(best - midi))) best = m;
  return best;
}

/** The pitch a recording actually sounds (Hz): its name at A = 440, corrected by what was measured. */
export function sampleHz(set: string, m: number): number {
  const cents = SAMPLED_NOTES[set]?.[nameOfMidi(m)]?.cents ?? 0;
  return 440 * 2 ** ((m - 69) / 12 + cents / 1200);
}

/**
 * The playback rate that makes recording `m` sound `targetHz`. The target comes from tuning.ts's hz(),
 * so every temperament and A = 415 apply to the recordings as to the synthesizer.
 */
export const rateFor = (set: string, m: number, targetHz: number) => targetHz / sampleHz(set, m);

/** A recording's length (s) and, for a looped one, its loop (s from the onset). */
export const noteInfo = (set: string, m: number) => SAMPLED_NOTES[set]?.[nameOfMidi(m)];

/**
 * The recordings a piece needs: for every pitch it uses, those nearest it and nearest the pitches up to
 * `pad` semitones either side (a bend, a glide, a wrong note asked for: D178).
 */
export function notesFor(set: string, pitches: Iterable<number>, pad = 2): number[] {
  const out = new Set<number>();
  for (const p of new Set(pitches)) {
    for (let d = -pad; d <= pad; d++) {
      const n = nearestSample(set, p + d);
      if (n !== null) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** What to load, set by set. */
export type Plan = { set: string; notes: number[] }[];

/**
 * The plan for an instrument: every voice's pitches (`pitches`), and the player's own (`lead`) also an
 * octave either side, for ORGANO PLENO's doubling (D181); the harpsichord's key-up noises for the same
 * notes; the organ's pedal for the octave below the player's lowest notes.
 */
export function planFor(inst: SampledInstrument, pitches: Iterable<number>, lead: Iterable<number> = []): Plan {
  const all = [...pitches];
  const own = [...lead];
  const notes = notesFor(inst.set, [...all, ...own.flatMap((m) => [m - 12, m + 12])]);
  const plan: Plan = [{ set: inst.set, notes }];
  if (inst.release) plan.push({ set: inst.release, notes: notes.filter((m) => sampledMidis(inst.release!).includes(m)) });
  if (inst.low) {
    const lows = sampledMidis(inst.low);
    const below = own.map((m) => m - 12).filter((m) => m >= lows[0] - 2 && m <= lows[lows.length - 1] + 2);
    if (below.length) plan.push({ set: inst.low, notes: notesFor(inst.low, below) });
  }
  return plan;
}

/** Bytes the plan's recordings take once decoded (Float32 at the context's rate), stereo where recorded so unless `mono`. */
export function decodedBytes(plan: Plan, sampleRate = 48000, mono = false): number {
  let total = 0;
  for (const { set, notes } of plan) {
    const ch = STEREO.has(set) && !mono ? 2 : 1;
    for (const m of notes) total += Math.ceil((noteInfo(set, m)?.len ?? 0) * sampleRate) * ch * 4;
  }
  return total;
}

/** How much decoded audio a page may hold (bytes): a phone (research: an iPhone's page is killed past roughly 1-1.5 GB in all), a computer. */
export const BUDGET = { phone: 96e6, computer: 320e6 };

/** Keep the stereo recordings in stereo when the plan fits the budget, else fold them to mono. */
export const monoFor = (plan: Plan, sampleRate: number, budget: number) => decodedBytes(plan, sampleRate) > budget;

/**
 * Where the recording begins in a decoded buffer (s): the first sample above 1% of the opening's peak,
 * less a millisecond. Measured, not assumed: decoders differ in whether they remove the MP3 encoder's
 * delay (LAME: 1105 samples), so the same file can begin 0 or 25 ms in.
 */
export function onsetOf(data: Float32Array, sampleRate: number): number {
  const n = Math.min(data.length, Math.floor(sampleRate * 0.5));
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
  const at = peak * 0.01;
  for (let i = 0; i < n; i++) if (Math.abs(data[i]) > at) return Math.max(0, i / sampleRate - 0.001);
  return 0;
}

// ---- Loading (the browser only).

export interface Loaded {
  buffer: AudioBuffer;
  /** Where the recording begins (s). */
  onset: number;
}
const banks = new Map<string, Map<number, Loaded>>();
const inFlight = new Map<string, Promise<void>>();
/** Notes whose file could not be had: not asked again for a while. */
const failedAt = new Map<string, number>();
/** Sets folded to mono on this device (decided once, at the first plan over budget). */
const monoSets = new Set<string>();
/** Each set's base that answered (the page's own folder, or the website). */
const baseOf = new Map<string, string>();
/** Sets that could not be had from anywhere (three notes failed, none came): synthesized (as P13). */
const unreachable = new Set<string>();
const failures = new Map<string, number>();

/** The decoded recording of a note, if it is ready. */
export const loaded = (set: string, m: number): Loaded | undefined => banks.get(set)?.get(m);
export const setUnreachable = (set: string) => unreachable.has(set);

/** Every decoded recording of a set, for picking the nearest one ready. */
export const loadedMidis = (set: string): number[] => [...(banks.get(set)?.keys() ?? [])];

let decoding = 0;
const queue: (() => void)[] = [];
/** At most four decodes at once (iOS decodes slowly, and each decode holds its whole file twice). */
async function slot<T>(f: () => Promise<T>): Promise<T> {
  if (decoding >= 4) await new Promise<void>((r) => queue.push(r));
  decoding++;
  try {
    return await f();
  } finally {
    decoding--;
    queue.shift()?.();
  }
}

/** A note's file: from the browser's cache, else the page's own folder, else the website (P13). */
async function fileBytes(set: string, m: number): Promise<ArrayBuffer | null> {
  const file = fileOf(set, m);
  // The file's length versions the URL: a re-made recording is fetched anew, past the site's own cache.
  const v = SAMPLE_MANIFEST[set]?.pack[file]?.[1] ?? 0;
  const here = typeof document !== "undefined" ? document.baseURI : SITE;
  const bases = [...new Set([baseOf.get(set), here, SITE].filter((b): b is string => !!b))];
  let cache: Cache | null = null;
  try {
    cache = typeof caches !== "undefined" ? await caches.open("wtg-samples-v1") : null;
  } catch {
    cache = null; // a private window, or no Cache Storage
  }
  for (const base of bases) {
    const url = new URL(`samples/${set}/${file}?v=${v}`, base).href;
    try {
      const hit = cache ? await cache.match(url) : undefined;
      if (hit) return (baseOf.set(set, base), await hit.arrayBuffer());
    } catch {
      /* the cache refused: fetch it */
    }
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) continue;
    const bytes = await res.arrayBuffer();
    // A page that serves its own index for a missing file (some hosts) is not a recording.
    if (bytes.byteLength < 256 || /^\s*</.test(new TextDecoder().decode(bytes.slice(0, 16)))) continue;
    baseOf.set(set, base);
    if (cache) cache.put(url, new Response(bytes.slice(0), { headers: { "content-type": "audio/mpeg" } })).catch(() => {});
    return bytes;
  }
  return null;
}

/** An AudioBuffer folded to one channel (half the memory). */
function toMono(ctx: BaseAudioContext, b: AudioBuffer): AudioBuffer {
  if (b.numberOfChannels === 1) return b;
  const out = ctx.createBuffer(1, b.length, b.sampleRate);
  const d = out.getChannelData(0);
  const l = b.getChannelData(0);
  const r = b.getChannelData(1);
  for (let i = 0; i < d.length; i++) d[i] = 0.5 * (l[i] + r[i]);
  return out;
}

function loadNote(ctx: BaseAudioContext, set: string, m: number): Promise<void> {
  const key = `${set}:${m}`;
  const busy = inFlight.get(key);
  if (busy) return busy;
  if (banks.get(set)?.has(m) || unreachable.has(set)) return Promise.resolve();
  if (Date.now() - (failedAt.get(key) ?? -Infinity) < 20000) return Promise.resolve();
  const p = (async () => {
    const bytes = await fileBytes(set, m);
    if (!bytes) {
      failedAt.set(key, Date.now());
      failures.set(set, (failures.get(set) ?? 0) + 1);
      // Nothing answered for this set: the page has no route to the recordings.
      if ((failures.get(set) ?? 0) >= 3 && !banks.get(set)?.size && !baseOf.has(set)) unreachable.add(set);
      return;
    }
    const decoded = await slot(() => ctx.decodeAudioData(bytes));
    const buffer = monoSets.has(set) ? toMono(ctx, decoded) : decoded;
    let bank = banks.get(set);
    if (!bank) banks.set(set, (bank = new Map()));
    bank.set(m, { buffer, onset: onsetOf(buffer.getChannelData(0), buffer.sampleRate) });
  })()
    .catch(() => void failedAt.set(key, Date.now()))
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

/**
 * Load a plan's recordings, and let go of the ones it no longer needs (a sounding note keeps its own
 * buffer until it ends). Over the budget, the stereo sets are folded to mono as they are decoded.
 */
export function loadPlan(ctx: BaseAudioContext, plan: Plan, phone: boolean): Promise<void> {
  if (monoFor(plan, ctx.sampleRate, phone ? BUDGET.phone : BUDGET.computer)) for (const { set } of plan) if (STEREO.has(set)) monoSets.add(set);
  for (const { set, notes } of plan) {
    const bank = banks.get(set);
    if (bank) for (const m of [...bank.keys()]) if (!notes.includes(m)) bank.delete(m);
  }
  return Promise.all(plan.flatMap(({ set, notes }) => notes.map((m) => loadNote(ctx, set, m)))).then(() => {});
}

/** Ask for one note's recording (a note played before the plan reached it). */
export const loadOne = (ctx: BaseAudioContext, set: string, m: number) => void loadNote(ctx, set, m);
