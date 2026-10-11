/**
 * Chorale playback (task 3, P5): one entry point for every chorale screen and for the chorale
 * workbench to come. A chorale goes in as its voices of timed notes, in 32nds as `study.json` and
 * `level6.ts` have them ([onset, length, pitch, fermata?]); out come events for the engine's live
 * loop (`playAll`), so that tempo, voices switched on and off (channel gates), pause and volume
 * apply at once while it plays (D57, D78).
 *
 * For now the performance is strict (in time, as before). The expressive model (phrase-end
 * rallentandi, fermatas held or breathed, the final cadence, balance; docs/playback/
 * CHORALE-PERFORMANCE.md) waits for the owner's approval and will enter through `options`.
 */
import type { AudioEngine } from "./engine.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { restoreSound, type SoundState } from "./sound.ts";
import { SYNTH_PRESETS, type SynthSettings } from "./synth-settings.ts";
import type { VersionId } from "../game/versions.ts";
import fermataWordsData from "../../data/playback/chorale-fermatas.json" with { type: "json" };

/** A note: onset and length in 32nds from the first note, pitch, and a fermata flag. */
export type ChoraleNote = readonly [number, number, string, (0 | 1 | boolean)?];

/** The channels the four voices sound on, soprano to bass (each its own strip and gate). */
export const CHORALE_CHANNELS = ["counterpoint", "second", "third", "fux"] as const;
export type ChoraleChannel = (typeof CHORALE_CHANNELS)[number];

export interface Chorale {
  /** Soprano, alto, tenor, bass (or fewer): each voice's notes. */
  voices: readonly (readonly ChoraleNote[])[];
  /** 32nds in a bar. */
  barUnits: number;
  /** 32nds of an upbeat (0 or absent: none): the first bar is counted from where the upbeat begins in it. */
  pickup?: number;
  /** The cadences as the library reads them: [onset in 32nds, class ("authentic, perfect", "half" …), degree ("I", "V" …)]. */
  cadences?: readonly (readonly [number, string, string?])[];
  /** P14: the words at each soprano fermata, in order: the punctuation ending them in every stanza line ('.', ':', ',', '' none; null no words). */
  fermataWords?: readonly (readonly (string | null)[])[];
}

/** The bar (counted as the score draws it, the upbeat bar whole) of an onset in 32nds. */
export const barOf = (c: Chorale, at: number) => Math.floor((at + (c.pickup ? c.barUnits - c.pickup : 0)) / c.barUnits);

/** The second channel of each voice, for an ensemble that doubles it (P7: choir and orchestra). */
export const DOUBLING_CHANNELS: VersionId[] = ["inversion", "retrograde", "retroInversion", "canon"];

/** The events of a chorale: each note on its voice's channel; the slot is the bar it starts in. */
export function choraleEvents(c: Chorale): PlayEvent[] {
  const events: PlayEvent[] = [];
  c.voices.forEach((notes, v) => {
    const channel = CHORALE_CHANNELS[Math.min(v, CHORALE_CHANNELS.length - 1)];
    for (const [at, dur, pitch] of notes) events.push({ slot: barOf(c, at), at: at / 32, length: dur / 32, cantus: null, counterpoint: null, extra: [{ channel, pitch }] });
  });
  return events.sort((a, b) => a.at - b.at);
}

/** An event's notes, each also on its voice's doubling channel (the ensemble doubles the voices). */
export function doubled(events: PlayEvent[]): PlayEvent[] {
  return events.map((e) => {
    const versions: Partial<Record<VersionId, string>> = {};
    const lengths: Record<string, number> = { ...(e.lengths ?? {}) };
    for (const x of e.extra ?? []) {
      const v = (CHORALE_CHANNELS as readonly string[]).indexOf(x.channel);
      if (v >= 0) {
        versions[DOUBLING_CHANNELS[v]] = x.pitch;
        lengths[DOUBLING_CHANNELS[v]] = e.length;
      }
    }
    return Object.keys(versions).length ? { ...e, versions: { ...(e.versions ?? {}), ...versions }, lengths } : e;
  });
}

// ---- Ensembles (P7, the owner's presets): the instrument of each voice, soprano to bass.

export const ENSEMBLES = ["choir", "soloists", "organ", "strings", "synth", "reeds", "winds", "choirOrchestra"] as const;
export type Ensemble = (typeof ENSEMBLES)[number];

const preset = (id: string) => ({ ...SYNTH_PRESETS.find((x) => x.id === id)!.settings });
const sampled = (sampleSet: SynthSettings["sampleSet"], o: Partial<SynthSettings> = {}): SynthSettings => ({ ...preset("violinSampled"), sampleSet, ...o });
/**
 * Voices by the formant synthesizer, until recorded voices are chosen (the owner asked for them;
 * the free sample libraries are being looked into). Each part its own vowel colour and vibrato.
 */
const sung = (vowel: number, vibrato: number, breath: number, tone: number, solo: boolean): SynthSettings => ({
  ...preset("choir"),
  formantVowel: vowel,
  formantBreath: breath,
  vibrato,
  tone,
  // A choir: several singers, slightly apart; one singer a part: clean, each a person.
  detune: solo ? 0 : 9,
  attack: solo ? 0.12 : 0.22,
  reverbMode: "hall",
  reverbMix: solo ? 0.18 : 0.3,
});
/** A recorded choir set, with the formant voice's settings beneath it as its fallback (P13). */
const choir = (sampleSet: SynthSettings["sampleSet"], fallback: SynthSettings): SynthSettings => ({ ...fallback, model: "sampled", sampleSet, attack: 0.09, decay: 0.05, sustain: 1, release: 0.35, tone: 12000, detune: 0 });
/** Wendy Carlos's Moog (Switched-On Bach, 1968): each voice its own patch. */
const moog = (waveform: SynthSettings["waveform"], tone: number, o: Partial<SynthSettings> = {}): SynthSettings => ({ ...preset("chip"), waveform, tone, attack: 0.02, decay: 0.2, sustain: 0.75, release: 0.12, ...o });

interface EnsembleSpec {
  /** The instrument of each voice. */
  voices: [SynthSettings, SynthSettings, SynthSettings, SynthSettings];
  /** Instruments doubling each voice (colla parte), on its second channel; and their level. */
  doubling?: [SynthSettings, SynthSettings, SynthSettings, SynthSettings];
  doublingLevel?: number;
}

export function ensembleSpec(e: Ensemble): EnsembleSpec {
  switch (e) {
    case "choir":
      // P13: recorded choirs (Sonatina's chorus for soprano, tenor and bass, FluidR3's choir for the
      // alto, whose range Sonatina's upper choir does not reach), the formant voices kept underneath
      // as the fallback where the samples cannot be loaded (the claude.ai page).
      return {
        voices: [
          choir("choirUpper", sung(0, 12, 0.18, 5200, false)),
          choir("choirAahs", sung(0.4, 11, 0.2, 4600, false)),
          choir("choirLower", sung(0.2, 10, 0.2, 4000, false)),
          choir("choirLower", sung(3.4, 9, 0.18, 3000, false)),
        ],
      };
    case "soloists":
      return { voices: [sung(0, 16, 0.08, 6500, true), sung(3.2, 13, 0.12, 5200, true), sung(1, 18, 0.1, 4800, true), sung(3.6, 11, 0.14, 3400, true)] };
    case "organ":
      return { voices: [preset("pipeOrgan"), preset("pipeOrgan"), preset("pipeOrgan"), { ...preset("pipeOrgan"), tone: 6000 }] };
    case "strings":
      return { voices: [preset("violinSampled"), preset("violinSampled"), sampled("violaSus"), preset("celloSampled")] };
    case "synth":
      return {
        voices: [
          moog("sawtooth", 2600, { vibrato: 5 }),
          moog("square", 1900),
          moog("triangle", 2400, { detune: 4 }),
          moog("sawtooth", 900, { attack: 0.01, decay: 0.3, sustain: 0.6 }),
        ],
      };
    case "reeds":
      return { voices: [sampled("oboe"), sampled("oboe"), preset("bassoonSampled"), preset("bassoonSampled")] };
    case "winds":
      return { voices: [preset("fluteSampled"), sampled("oboe"), sampled("clarinet"), preset("bassoonSampled")] };
    case "choirOrchestra": {
      const choir = ensembleSpec("choir").voices;
      return { voices: choir, doubling: [sampled("oboe"), preset("violinSampled"), sampled("violaSus"), preset("celloSampled")], doublingLevel: 0.55 };
    }
  }
}

/**
 * The chorale screens' sound (P5): every voice in the same instrument, at its own octave, all
 * channels open, nothing looping. The engine is shared, so whatever the last screen left (a line
 * switched off, Fux's octave, a loop) is reset here: a Fux screen's gated-off Contra II used to
 * silence the chorales' alto.
 */
export function choraleSound(ensemble: Ensemble | null = null): SoundState {
  const s = restoreSound(null);
  if (!ensemble) {
    s.synth.second = { ...s.synth.counterpoint };
    s.synth.third = { ...s.synth.counterpoint };
    s.synth.fux = { ...s.synth.counterpoint };
  } else {
    const spec = ensembleSpec(ensemble);
    CHORALE_CHANNELS.forEach((ch, v) => (s.synth[ch] = { ...spec.voices[v] }));
    DOUBLING_CHANNELS.forEach((id, v) => {
      s.versionSynth[id] = { ...(spec.doubling?.[v] ?? spec.voices[v]) };
      s.versionFollows[id] = false;
      s.mix[id].volume = spec.doublingLevel ?? 0.6;
    });
  }
  // The melody forward (P14): the lower voices about 3 dB under the soprano.
  for (const ch of ["second", "third", "fux"] as const) s.mix[ch].volume = 0.71;
  s.fuxOctave = 0;
  for (const k of ["cantusOctave", "counterpointOctave"] as const) if (k in s) (s as unknown as Record<string, number>)[k] = 0;
  return s;
}

/** The ensemble chosen on the chorale screens (P7), kept in this browser; null: the game's piano. */
let ensembleNow: Ensemble | null = null;
export const currentEnsemble = () => ensembleNow;

export function prepareChoraleAudio(audio: AudioEngine, heard: readonly boolean[] = [true, true, true, true], ensemble: Ensemble | null = ensembleNow) {
  ensembleNow = ensemble;
  audio.setSoundState(choraleSound(ensemble));
  audio.loop = false;
  audio.drums = false;
  audio.setGates(choraleGates(heard, ensemble));
}

/** The voices heard as channel gates (live: switching a voice restarts nothing); a doubling follows its voice. */
export function choraleGates(heard: readonly boolean[], ensemble: Ensemble | null = ensembleNow) {
  const g: Partial<Record<"cantus" | "continuo" | ChoraleChannel | VersionId, boolean>> = { cantus: true, continuo: false };
  const doubles = ensemble !== null && !!ensembleSpec(ensemble).doubling;
  CHORALE_CHANNELS.forEach((ch, v) => {
    g[ch] = heard[v] !== false;
    g[DOUBLING_CHANNELS[v]] = doubles && heard[v] !== false;
  });
  return g;
}

/**
 * Play events through the live loop from bar `fromBar`; `onBar(b)` as bar b sounds, -1 at the end.
 * Events whose slot is not a bar may pass `barOfEvent`.
 */
export function playChoraleEvents(audio: AudioEngine, events: PlayEvent[], onBar: (bar: number) => void, fromBar = 0, barOfEvent: (e: PlayEvent) => number = (e) => e.slot): void {
  // Every note also on its doubling channel; the gates decide whether the doubling is heard (P7).
  const sorted = doubled([...events].sort((a, b) => a.at - b.at));
  audio.loop = false;
  const start = Math.max(0, sorted.findIndex((e) => barOfEvent(e) >= fromBar));
  const bars = sorted.map(barOfEvent);
  // The engine reports an event's slot as it sounds: here its index, turned into its bar.
  const indexed = sorted.map((e, k) => ({ ...e, slot: k }));
  void audio.playAll(indexed, (k) => onBar(k < 0 ? -1 : bars[k]), undefined, start);
}

// ---- The performance (P14; docs/playback/CHORALE-PERFORMANCE.md, revision 2, approved by the owner).

/**
 * How the fermatas are read: "context" (the default) decides fermata by fermata; "historical" takes
 * them as line marks (a breath out of the note, in time; Koopman, Rudolf, Demaree); "traditional"
 * holds them (about twice their value, then a breath; Marple); "strict" plays the notes as written.
 */
export const READINGS = ["context", "historical", "traditional", "strict"] as const;
export type Reading = (typeof READINGS)[number];
/** The practice follows the ensemble (owner): the organ leading a congregation, else a choir's. */
export type Practice = "choir" | "organ";

export interface FermataPlan {
  /** The fermata note's onset and end, in 32nds. */
  at: number;
  end: number;
  kind: "hold" | "breath" | "through" | "final";
  /** Its length multiplied by `hold`; `breath` 32nds taken out of its end; `gap` 32nds of silence added after it. */
  hold: number;
  breath: number;
  gap: number;
  /** The slowing into it (a fraction of the tempo lost at its onset). */
  rit: number;
  /** Why (for the screen): the cadence's class, the words' punctuation, a voice moving under it. */
  why: string;
}

const CADENCE_RIT: [RegExp, number][] = [[/authentic, perfect/, 0.12], [/authentic/, 0.09], [/Phrygian/, 0.09], [/half/, 0.07], [/deceptive/, 0.06]];
const fullClose = (cls: string) => /authentic/.test(cls);

/** Each fermata's treatment under a reading (pure; the soprano's fermatas, else any voice's). */
export function planFermatas(c: Chorale, reading: Reading): FermataPlan[] {
  if (reading === "strict") return [];
  const sop = c.voices[0] ?? [];
  const marks = sop.filter((n) => n[3]).map((n) => [n[0], n[0] + n[1]] as [number, number]);
  const pieceEnd = Math.max(...c.voices.flatMap((v) => v.map((n) => n[0] + n[1])));
  const cadenceAt = (a: number, e: number) => c.cadences?.find((x) => x[0] >= a && x[0] < e);
  // The most important internal cadence: a full close in another key, else on the tonic, nearest the middle.
  const internal = marks.filter(([, e]) => e < pieceEnd - 1e-9);
  const full = internal.map(([a, e]) => ({ a, cad: cadenceAt(a, e) })).filter((x) => x.cad && fullClose(x.cad[1]));
  const away = full.filter((x) => x.cad![2] && x.cad![2] !== "I" && x.cad![2] !== "i");
  const pool = away.length ? away : full;
  const strongest = pool.sort((x, y) => Math.abs(x.a - pieceEnd / 2) - Math.abs(y.a - pieceEnd / 2))[0]?.a;
  return marks.map(([a, e], k) => {
    const d = e - a;
    const breathLen = Math.min(d / 2, d > 8 ? 8 : 4); // an eighth in quarter-note motion, a quarter after a half note or longer (Heller)
    const cad = cadenceAt(a, e);
    const cls = cad?.[1] ?? "";
    const rit = CADENCE_RIT.find(([re]) => re.test(cls))?.[1] ?? 0.06;
    const final = e >= pieceEnd - 1e-9;
    // A voice moving under the fermata: kept moving, no hold and no breath (Koopman's evidence).
    const moving = c.voices.slice(1).some((v) => v.some((n) => n[0] > a + 1e-9 && n[0] < e - 1e-9));
    const words = c.fermataWords?.[k]?.find((x) => x !== null && x !== undefined);
    const plan = (kind: FermataPlan["kind"], hold: number, breath: number, gap: number, r: number, why: string): FermataPlan => ({ at: a, end: e, kind, hold, breath, gap, rit: r, why });
    if (final) return plan("final", 1 + c.barUnits / Math.max(1, d), 0, 0, reading === "historical" ? 0.2 : reading === "traditional" ? 0.4 : 0.3, "the final cadence");
    if (moving) return plan("through", 1, 0, 0, 0.02, "a voice moves on under it");
    if (reading === "historical") return plan("breath", 1, breathLen, 0, 0.03, "a line's end: a breath, in time");
    if (reading === "traditional") return plan("hold", 2, 0, breathLen, rit, "held, then a breath");
    // By context.
    if (words !== undefined) {
      if (words === "") return plan("through", 1, 0, 0, 0.02, "the words run on");
      if (words === ",") return plan("breath", 1, breathLen, 0, Math.min(rit, 0.06), "a comma: a breath");
      // A sentence's end or a colon.
      if (fullClose(cls)) return plan("hold", a === strongest ? 1.75 : 1.5, 0, breathLen, rit, `the words end (${words}) on a full close`);
      return plan("breath", 1, breathLen, 0, rit, `the words end (${words}); a ${cls || "close"}`);
    }
    if (k === 0) return plan("breath", 1, breathLen, 0, Math.min(rit, 0.06), "the first line");
    if (fullClose(cls)) return plan("hold", a === strongest ? 1.75 : 1.5, 0, breathLen, rit, `a full close${a === strongest ? ", the most important inside" : ""}`);
    return plan("breath", 1, breathLen, 0, rit, cls ? `a ${cls} cadence: a breath` : "a breath");
  });
}

/**
 * The chorale performed: its notes moved to their performed places (still in whole notes at the
 * written tempo, so the live tempo scales them all). Into each fermata the tempo eases over two
 * beats by its cadence's weight, the last line over three (Friberg and Sundberg's final ritardando);
 * a held fermata lasts `hold` times its value; a breath is taken out of the last note, or added
 * after a hold; repeated notes are re-struck with a small lift (the organ ties them in the inner voices).
 */
export function performChorale(c: Chorale, reading: Reading, practice: Practice = "choir", wholeSeconds = 2): PlayEvent[] {
  const plans = planFermatas(c, reading);
  const L = Math.ceil(Math.max(1, ...c.voices.flatMap((v) => v.map((n) => n[0] + n[1]))));
  const factor = new Array<number>(L + 1).fill(1);
  const gapAfter = new Map<number, number>();
  for (const f of plans) {
    const span = f.kind === "final" ? 24 : 16;
    for (let u = Math.max(0, Math.floor(f.at - span)); u < f.at; u++) {
      const x = (u - (f.at - span)) / span;
      // Friberg and Sundberg (1999): tempo v(x) = (1 + (w^q - 1) x)^(1/q), here q = 2, w the tempo reached.
      const w = 1 - f.rit;
      const v = f.kind === "final" ? Math.sqrt(1 + (w * w - 1) * x) : 1 - f.rit * x;
      factor[u] *= 1 / Math.max(0.3, v);
    }
    for (let u = Math.floor(f.at); u < f.end && u < L; u++) factor[u] *= f.hold;
    if (f.gap) gapAfter.set(f.end, (gapAfter.get(f.end) ?? 0) + f.gap);
  }
  const P = new Array<number>(L + 2).fill(0);
  for (let u = 0; u <= L; u++) P[u + 1] = P[u] + (u < L ? factor[u] : 1) + (gapAfter.get(u + 1) ?? 0);
  const at = (u: number) => {
    const i = Math.max(0, Math.min(L, Math.floor(u)));
    return P[i] + (u - i) * (factor[i] ?? 1);
  };
  const breathAt = new Map(plans.filter((f) => f.breath).map((f) => [f.end, f.breath * (factor[Math.max(0, Math.floor(f.end) - 1)] ?? 1)]));
  const lift = (0.045 / wholeSeconds) * 32; // a re-struck note's lift, about 45 ms, in 32nds
  const events: PlayEvent[] = [];
  c.voices.forEach((notes, v) => {
    const channel = CHORALE_CHANNELS[Math.min(v, CHORALE_CHANNELS.length - 1)];
    for (let k = 0; k < notes.length; k++) {
      const [a, d, pitch] = notes[k];
      let end = a + d;
      // The organ's inner voices tie a repeated note (Heller); everyone else re-strikes it.
      while (practice === "organ" && (v === 1 || v === 2) && notes[k + 1] && notes[k + 1][2] === pitch && Math.abs(notes[k + 1][0] - end) < 1e-9 && !breathAt.has(end)) end = notes[++k][0] + notes[k][1];
      const start = at(a);
      let stop = at(end) - (breathAt.get(end) ?? 0);
      const next = notes[k + 1];
      if (next && next[2] === pitch && Math.abs(next[0] - end) < 1e-9) stop -= lift;
      stop = Math.max(start + (stop - start) * 0.5, stop);
      events.push({ slot: barOf(c, a), at: start / 32, length: Math.max(1 / 64, (stop - start) / 32), cantus: null, counterpoint: null, extra: [{ channel, pitch }] });
    }
  });
  return events.sort((x, y) => x.at - y.at);
}

/** P14: the words at the fermatas of Bach's chorale no. `n` (1–370, the game's numbering), where known. */
export function fermataWordsOf(n: number): (string | null)[][] | undefined {
  const c = (fermataWordsData as unknown as { chorales: Record<string, { fermatas: { punct: (string | null)[] }[] }> }).chorales[`chor${String(n).padStart(3, "0")}`];
  return c?.fermatas.map((f) => f.punct);
}

/** The reading chosen on the chorale screens (P14), set by its menu; "context" by default. */
let readingNow: Reading = "context";
export const currentReading = () => readingNow;
export const setReading = (r: Reading) => (readingNow = r);

/** A chorale from its voices, performed, played from bar `fromBar` (the screens and the workbench). */
export function playChorale(audio: AudioEngine, c: Chorale, onBar: (bar: number) => void, fromBar = 0, reading: Reading = readingNow): void {
  const practice: Practice = ensembleNow === "organ" ? "organ" : "choir";
  playChoraleEvents(audio, performChorale(c, reading, practice, audio.barSeconds), onBar, fromBar);
}
