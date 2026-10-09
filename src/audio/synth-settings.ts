/** Synth settings, models, effect modes and presets (pure data; no audio nodes here). */

export type Waveform = "sine" | "triangle" | "square" | "sawtooth";
export const WAVEFORMS: Waveform[] = ["sine", "triangle", "square", "sawtooth"];

/**
 * Synthesis models. The piano (hammered strings, modelled) comes first and is the default; the next
 * seven suit counterpoint (sustained, vocal or keyboard-like tones); ring modulation and
 * wavefolding are there for fun.
 */
export type SynthModel = "sampled" | "sampledModern" | "piano" | "subtractive" | "pluck" | "fm" | "additive" | "formant" | "bowed" | "wavetable" | "ringmod" | "wavefold";
/** Recorded instruments first (classic, then modern: D54), then the synthesis models. */
export const SYNTH_MODELS: SynthModel[] = ["sampled", "sampledModern", "piano", "subtractive", "pluck", "fm", "additive", "formant", "bowed", "wavetable", "ringmod", "wavefold"];

export type ReverbMode = "off" | "room" | "hall" | "cathedral" | "plate" | "spring";
export const REVERB_MODES: ReverbMode[] = ["off", "room", "hall", "cathedral", "plate", "spring"];
export type DelayMode = "off" | "digital" | "analog" | "tape" | "slapback" | "pingpong";
export const DELAY_MODES: DelayMode[] = ["off", "digital", "analog", "tape", "slapback", "pingpong"];

/**
 * Shared: envelope (seconds; sustain 0..1), tone (low-pass Hz), vibrato (cents), effects.
 * Per model (0..1 unless noted): subtractive waveform + detune (cents); pluck damping, brightness;
 * FM ratio (x), index; additive brightness, even harmonics; formant vowel (0..4 = a e i o u), breath;
 * bowed pressure, body; wavetable position, scan (Hz); ring ratio (x), mix; wavefold drive, symmetry.
 */
/** Recorded instruments (files in public/samples, see sample-manifest.ts). */
export type SampleSet =
  | "grand" | "organ" | "sackbut" | "cello" | "violin" | "flute" | "bassoon" | "horn" | "trumpet" | "harp" | "contrabass" | "harmonium" | "guitar"
  | "eguitar" | "ebass" | "sax" | "xylophone"
  // D109: for the continuo's ensembles (VSCO 2 CE, Karoryfer; CC0).
  | "violinStac" | "violinPizz" | "violaSus" | "violaStac" | "violaPizz" | "celloStac" | "celloPizz" | "bassPizz" | "bassStac" | "oboe" | "clarinet" | "timpani" | "rickBass" | "cleanGuitar";
export const SAMPLE_SETS: SampleSet[] = ["grand", "organ", "sackbut", "cello", "violin", "flute", "bassoon", "horn", "trumpet", "harp", "contrabass", "harmonium", "guitar", "eguitar", "ebass", "sax", "xylophone"];
/** Is this a recorded-instrument model (classic or modern)? */
export const isSampled = (m: SynthModel) => m === "sampled" || m === "sampledModern";

export interface SynthSettings {
  model: SynthModel;
  /** Sampled model: which recorded instrument. */
  sampleSet: SampleSet;
  /** Piano: hammer hardness (brightness of the attack and spectrum), 0..1. */
  pianoHammer: number;
  /** Piano: detachment, 0 = legato, 1 = very detached (the key is released early). */
  pianoDetach: number;
  waveform: Waveform;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  tone: number;
  vibrato: number;
  detune: number;
  pluckDamping: number;
  pluckBrightness: number;
  fmRatio: number;
  fmIndex: number;
  addBrightness: number;
  addEven: number;
  formantVowel: number;
  formantBreath: number;
  bowPressure: number;
  bowBody: number;
  wtPosition: number;
  wtScan: number;
  ringRatio: number;
  ringMix: number;
  foldDrive: number;
  foldSymmetry: number;
  reverbMode: ReverbMode;
  reverbMix: number;
  delayMode: DelayMode;
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
  /** The preset these settings started from (D95): its name stays, "(edited)", after changes. */
  preset?: string;
}

/** Neutral values of every parameter (an 8-bit-like triangle, no effects). */
const BASE: SynthSettings = {
  model: "subtractive", sampleSet: "grand", pianoHammer: 0.6, pianoDetach: 0.3, waveform: "triangle", attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.25, tone: 2500, vibrato: 0, detune: 0,
  pluckDamping: 0.6, pluckBrightness: 0.6, fmRatio: 2, fmIndex: 2, addBrightness: 0.5, addEven: 0.7,
  formantVowel: 0, formantBreath: 0.15, bowPressure: 0.5, bowBody: 0.6, wtPosition: 0.3, wtScan: 0.3,
  ringRatio: 1.5, ringMix: 0.7, foldDrive: 0.4, foldSymmetry: 0.5,
  reverbMode: "off", reverbMix: 0.2, delayMode: "off", delayTime: 0.375, delayFeedback: 0.35, delayMix: 0.25,
};

export type VoiceId = "cantus" | "counterpoint";
export type VoiceSynths = Record<VoiceId, SynthSettings>;

const p = (o: Partial<SynthSettings>): SynthSettings => ({ ...BASE, ...o });

/**
 * Glenn Gould at the piano: a close, dry, clear sound for counterpoint; bright light hammers,
 * almost no pedal, detached touch, no added room. The default sound of the game.
 */
const GOULD = p({ model: "piano", pianoHammer: 0.62, pianoDetach: 0.45, attack: 0.003, decay: 0.05, sustain: 1, release: 0.07, tone: 9000 });
/** Salamander Grand Piano (Yamaha C5, recorded by Alexander Holm): the default sound. */
const GRAND = p({ model: "sampled", sampleSet: "grand", attack: 0.002, decay: 0.05, sustain: 1, release: 0.25, tone: 12000 });
export const DEFAULT_SYNTH: SynthSettings = GRAND;
/** The voices' default (owner, D95): the recorded grand piano with a little room, no delay. */
export const GRAND_ROOM: SynthSettings = { ...GRAND, reverbMode: "room", reverbMix: 0.16, preset: "grandRoom" };

/**
 * Presets, each belonging to one model (the rack shows the presets of the current model).
 * The first preset of every model is clean (no reverb, no delay): choosing a model loads it.
 */
export const SYNTH_PRESETS: { id: string; settings: SynthSettings }[] = [
  // Sampled instruments
  { id: "grand", settings: GRAND },
  { id: "grandRoom", settings: { ...GRAND, reverbMode: "room", reverbMix: 0.16 } },
  // Fux's default (D52): the organ samples darkened to a stopped-flute colour, a softer speech, a church's air.
  { id: "fluteOrgan", settings: p({ model: "sampled", sampleSet: "organ", attack: 0.045, decay: 0.05, sustain: 1, release: 0.35, tone: 2400, reverbMode: "hall", reverbMix: 0.22 }) },
  { id: "pipeOrgan", settings: p({ model: "sampled", sampleSet: "organ", attack: 0.01, decay: 0.05, sustain: 1, release: 0.18, tone: 12000 }) },
  { id: "sackbut", settings: p({ model: "sampled", sampleSet: "sackbut", attack: 0.02, decay: 0.05, sustain: 1, release: 0.15, tone: 12000 }) },
  { id: "celloSampled", settings: p({ model: "sampled", sampleSet: "cello", attack: 0.03, decay: 0.05, sustain: 1, release: 0.2, tone: 12000 }) },
  { id: "violinSampled", settings: p({ model: "sampled", sampleSet: "violin", attack: 0.04, decay: 0.05, sustain: 1, release: 0.25, tone: 12000 }) },
  { id: "fluteSampled", settings: p({ model: "sampled", sampleSet: "flute", attack: 0.03, decay: 0.05, sustain: 1, release: 0.2, tone: 12000 }) },
  { id: "bassoonSampled", settings: p({ model: "sampled", sampleSet: "bassoon", attack: 0.03, decay: 0.05, sustain: 1, release: 0.18, tone: 12000 }) },
  { id: "hornSampled", settings: p({ model: "sampled", sampleSet: "horn", attack: 0.05, decay: 0.05, sustain: 1, release: 0.25, tone: 12000 }) },
  { id: "trumpetSampled", settings: p({ model: "sampled", sampleSet: "trumpet", attack: 0.02, decay: 0.05, sustain: 1, release: 0.15, tone: 12000 }) },
  { id: "harpSampled", settings: p({ model: "sampled", sampleSet: "harp", attack: 0.002, decay: 0.05, sustain: 1, release: 0.6, tone: 12000 }) },
  { id: "contrabassSampled", settings: p({ model: "sampled", sampleSet: "contrabass", attack: 0.04, decay: 0.05, sustain: 1, release: 0.2, tone: 12000 }) },
  { id: "harmoniumSampled", settings: p({ model: "sampled", sampleSet: "harmonium", attack: 0.05, decay: 0.05, sustain: 1, release: 0.2, tone: 12000 }) },
  { id: "guitarSampled", settings: p({ model: "sampled", sampleSet: "guitar", attack: 0.002, decay: 0.05, sustain: 1, release: 0.4, tone: 12000 }) },
  // Modern recorded instruments
  { id: "eguitarSampled", settings: p({ model: "sampledModern", sampleSet: "eguitar", attack: 0.002, decay: 0.05, sustain: 1, release: 0.3, tone: 12000 }) },
  { id: "ebassSampled", settings: p({ model: "sampledModern", sampleSet: "ebass", attack: 0.002, decay: 0.05, sustain: 1, release: 0.2, tone: 12000 }) },
  { id: "saxSampled", settings: p({ model: "sampledModern", sampleSet: "sax", attack: 0.02, decay: 0.05, sustain: 1, release: 0.18, tone: 12000 }) },
  { id: "xylophoneSampled", settings: p({ model: "sampledModern", sampleSet: "xylophone", attack: 0.002, decay: 0.05, sustain: 1, release: 0.5, tone: 12000 }) },
  // Piano (modelled)
  { id: "gould", settings: GOULD },
  { id: "concertGrand", settings: p({ model: "piano", pianoHammer: 0.45, pianoDetach: 0, attack: 0.003, decay: 0.05, sustain: 1, release: 0.6, tone: 7000, reverbMode: "hall", reverbMix: 0.25 }) },
  { id: "fortepiano", settings: p({ model: "piano", pianoHammer: 0.8, pianoDetach: 0.25, attack: 0.002, decay: 0.05, sustain: 1, release: 0.25, tone: 5000, reverbMode: "room", reverbMix: 0.15 }) },
  // Analog (subtractive)
  { id: "chip", settings: p({ waveform: "triangle", attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.15, tone: 4000 }) },
  // Analog (subtractive), with the effects doing much of the work
  { id: "analogPad", settings: p({ waveform: "sawtooth", attack: 0.35, decay: 0.4, sustain: 0.8, release: 0.9, tone: 1800, detune: 12, vibrato: 5, reverbMode: "hall", reverbMix: 0.35, delayMode: "analog", delayTime: 0.375, delayFeedback: 0.35, delayMix: 0.22 }) },
  { id: "spaceEcho", settings: p({ waveform: "square", attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3, tone: 2200, detune: 6, reverbMode: "spring", reverbMix: 0.3, delayMode: "tape", delayTime: 0.33, delayFeedback: 0.55, delayMix: 0.32 }) },
  { id: "slapback", settings: p({ waveform: "sawtooth", attack: 0.005, decay: 0.25, sustain: 0.55, release: 0.15, tone: 3200, detune: 8, reverbMode: "room", reverbMix: 0.15, delayMode: "slapback", delayTime: 0.11, delayFeedback: 0, delayMix: 0.4 }) },
  { id: "pingPong", settings: p({ waveform: "triangle", attack: 0.005, decay: 0.35, sustain: 0.3, release: 0.25, tone: 4000, reverbMode: "plate", reverbMix: 0.25, delayMode: "pingpong", delayTime: 0.25, delayFeedback: 0.5, delayMix: 0.4 }) },
  // Plucked string. "Fux's harpsichord": the default sound of Fux's voice, an instrument of his
  // time, bright and quick to speak, so it stands apart from the player's piano in trio playback.
  { id: "fuxHarpsichord", settings: p({ model: "pluck", attack: 0.002, decay: 0.05, sustain: 1, release: 0.12, tone: 6500, pluckDamping: 0.5, pluckBrightness: 0.9 }) },
  { id: "harpsichord", settings: p({ model: "pluck", attack: 0.003, decay: 0.05, sustain: 1, release: 0.15, tone: 7000, pluckDamping: 0.55, pluckBrightness: 0.95 }) },
  { id: "lute", settings: p({ model: "pluck", attack: 0.003, decay: 0.05, sustain: 1, release: 0.3, tone: 3000, pluckDamping: 0.75, pluckBrightness: 0.45, reverbMode: "hall", reverbMix: 0.25 }) },
  { id: "dubPluck", settings: p({ model: "pluck", attack: 0.003, decay: 0.05, sustain: 1, release: 0.2, tone: 2500, pluckDamping: 0.65, pluckBrightness: 0.7, reverbMode: "spring", reverbMix: 0.25, delayMode: "analog", delayTime: 0.375, delayFeedback: 0.6, delayMix: 0.45 }) },
  // FM
  { id: "epiano", settings: p({ model: "fm", attack: 0.004, decay: 1.2, sustain: 0.15, release: 0.5, tone: 6000, fmRatio: 1, fmIndex: 3 }) },
  { id: "bells", settings: p({ model: "fm", attack: 0.003, decay: 1.8, sustain: 0, release: 1.2, tone: 9000, fmRatio: 3.5, fmIndex: 4, reverbMode: "cathedral", reverbMix: 0.35 }) },
  { id: "brass", settings: p({ model: "fm", attack: 0.06, decay: 0.2, sustain: 0.8, release: 0.15, tone: 4000, vibrato: 6, fmRatio: 1, fmIndex: 5, reverbMode: "hall", reverbMix: 0.25 }) },
  // Additive
  { id: "organ", settings: p({ model: "additive", attack: 0.03, decay: 0.05, sustain: 1, release: 0.25, tone: 6000, addBrightness: 0.55, addEven: 0.8 }) },
  { id: "organCathedral", settings: p({ model: "additive", attack: 0.03, decay: 0.05, sustain: 1, release: 0.25, tone: 6000, addBrightness: 0.55, addEven: 0.8, reverbMode: "cathedral", reverbMix: 0.4 }) },
  { id: "flute", settings: p({ model: "additive", attack: 0.09, decay: 0.1, sustain: 0.9, release: 0.2, tone: 4000, vibrato: 10, addBrightness: 0.1, addEven: 0.3, reverbMode: "hall", reverbMix: 0.3 }) },
  { id: "clarinet", settings: p({ model: "additive", attack: 0.05, decay: 0.1, sustain: 0.85, release: 0.15, tone: 3500, vibrato: 4, addBrightness: 0.6, addEven: 0.05, reverbMode: "room", reverbMix: 0.2 }) },
  // Formant (voices)
  { id: "choir", settings: p({ model: "formant", attack: 0.25, decay: 0.3, sustain: 0.9, release: 0.6, tone: 5000, vibrato: 14, formantVowel: 0, formantBreath: 0.2 }) },
  { id: "monks", settings: p({ model: "formant", attack: 0.3, decay: 0.3, sustain: 0.95, release: 0.8, tone: 3000, vibrato: 4, formantVowel: 3.6, formantBreath: 0.1, reverbMode: "cathedral", reverbMix: 0.55 }) },
  // Bowed (body model)
  { id: "viol", settings: p({ model: "bowed", attack: 0.18, decay: 0.3, sustain: 0.85, release: 0.35, tone: 4500, vibrato: 9, bowPressure: 0.45, bowBody: 0.7 }) },
  { id: "cello", settings: p({ model: "bowed", attack: 0.25, decay: 0.3, sustain: 0.9, release: 0.5, tone: 3000, vibrato: 14, bowPressure: 0.6, bowBody: 0.9, reverbMode: "room", reverbMix: 0.25 }) },
  // Wavetable
  { id: "glass", settings: p({ model: "wavetable", attack: 0.01, decay: 0.8, sustain: 0.4, release: 0.8, tone: 7000, wtPosition: 0.1, wtScan: 0.4 }) },
  { id: "drift", settings: p({ model: "wavetable", attack: 0.4, decay: 0.5, sustain: 0.8, release: 1, tone: 3000, wtPosition: 0.6, wtScan: 1.2, vibrato: 6, reverbMode: "hall", reverbMix: 0.35, delayMode: "tape", delayTime: 0.45, delayFeedback: 0.45, delayMix: 0.3 }) },
  // Ring modulation (wacky)
  { id: "robot", settings: p({ model: "ringmod", attack: 0.005, decay: 0.2, sustain: 0.7, release: 0.1, tone: 5000, ringRatio: 1.41, ringMix: 0.85 }) },
  { id: "spaceBells", settings: p({ model: "ringmod", attack: 0.003, decay: 1.2, sustain: 0.1, release: 1, tone: 8000, ringRatio: 2.76, ringMix: 0.6, reverbMode: "cathedral", reverbMix: 0.4, delayMode: "pingpong", delayTime: 0.33, delayFeedback: 0.55, delayMix: 0.35 }) },
  // Wavefolder (wacky)
  { id: "buzz", settings: p({ model: "wavefold", attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.15, tone: 4500, foldDrive: 0.55, foldSymmetry: 0.5 }) },
  { id: "acidFold", settings: p({ model: "wavefold", attack: 0.005, decay: 0.25, sustain: 0.45, release: 0.15, tone: 3200, foldDrive: 0.85, foldSymmetry: 0.7, reverbMode: "spring", reverbMix: 0.2, delayMode: "analog", delayTime: 0.375, delayFeedback: 0.55, delayMix: 0.35 }) },
];

export type NumericKey = { [K in keyof SynthSettings]-?: SynthSettings[K] extends number ? K : never }[keyof SynthSettings];
export type ChoiceKey = Exclude<keyof SynthSettings, NumericKey | "preset">;

/** Knob ranges; `log` knobs move by ratios (times, frequencies), the others by offsets. */
export const RANGES: Record<NumericKey, { min: number; max: number; log?: boolean }> = {
  pianoHammer: { min: 0, max: 1 },
  pianoDetach: { min: 0, max: 1 },
  attack: { min: 0.003, max: 1.5, log: true },
  decay: { min: 0.01, max: 2.5, log: true },
  sustain: { min: 0, max: 1 },
  release: { min: 0.01, max: 2.5, log: true },
  tone: { min: 200, max: 10000, log: true },
  vibrato: { min: 0, max: 40 },
  detune: { min: 0, max: 30 },
  pluckDamping: { min: 0, max: 1 },
  pluckBrightness: { min: 0, max: 1 },
  fmRatio: { min: 0.5, max: 8, log: true },
  fmIndex: { min: 0, max: 10 },
  addBrightness: { min: 0, max: 1 },
  addEven: { min: 0, max: 1 },
  formantVowel: { min: 0, max: 4 },
  formantBreath: { min: 0, max: 1 },
  bowPressure: { min: 0, max: 1 },
  bowBody: { min: 0, max: 1 },
  wtPosition: { min: 0, max: 1 },
  wtScan: { min: 0, max: 6 },
  ringRatio: { min: 0.25, max: 8, log: true },
  ringMix: { min: 0, max: 1 },
  foldDrive: { min: 0, max: 1 },
  foldSymmetry: { min: 0, max: 1 },
  reverbMix: { min: 0, max: 1 },
  delayTime: { min: 0.04, max: 1.2, log: true },
  delayFeedback: { min: 0, max: 0.9 },
  delayMix: { min: 0, max: 1 },
};

export type SynthTarget = "all" | "counterpoint" | "cantus";

/** The first (clean) preset of a model. */
export const firstPreset = (model: SynthModel) => SYNTH_PRESETS.find((x) => x.settings.model === model)!;

/** Do the two voices have identical settings? */
export const sameSettings = (v: VoiceSynths) => (Object.keys(v.cantus) as (keyof SynthSettings)[]).every((k) => v.cantus[k] === v.counterpoint[k]);

/**
 * Apply an edit made on the rack: to the targeted voice, or to both (which in "Both voices" mode
 * always share one configuration, decision D36).
 */
export function applyEdit(value: VoiceSynths, target: SynthTarget, next: SynthSettings): VoiceSynths {
  return {
    cantus: target === "counterpoint" ? value.cantus : { ...next },
    counterpoint: target === "cantus" ? value.counterpoint : { ...next },
  };
}

/** Leaving a single-voice target for "Both voices": both take the Contrapunctus settings. */
export function joinVoices(value: VoiceSynths): VoiceSynths {
  return { cantus: { ...value.counterpoint }, counterpoint: { ...value.counterpoint } };
}
