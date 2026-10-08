/** Synth settings, models, effect modes and presets (pure data; no audio nodes here). */

export type Waveform = "sine" | "triangle" | "square" | "sawtooth";
export const WAVEFORMS: Waveform[] = ["sine", "triangle", "square", "sawtooth"];

/**
 * Synthesis models. The first seven suit counterpoint (sustained, vocal or keyboard-like tones);
 * ring modulation and wavefolding are there for fun.
 */
export type SynthModel = "subtractive" | "pluck" | "fm" | "additive" | "formant" | "bowed" | "wavetable" | "ringmod" | "wavefold";
export const SYNTH_MODELS: SynthModel[] = ["subtractive", "pluck", "fm", "additive", "formant", "bowed", "wavetable", "ringmod", "wavefold"];

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
export interface SynthSettings {
  model: SynthModel;
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
}

export const DEFAULT_SYNTH: SynthSettings = {
  model: "subtractive", waveform: "triangle", attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.25, tone: 2500, vibrato: 0, detune: 0,
  pluckDamping: 0.6, pluckBrightness: 0.6, fmRatio: 2, fmIndex: 2, addBrightness: 0.5, addEven: 0.7,
  formantVowel: 0, formantBreath: 0.15, bowPressure: 0.5, bowBody: 0.6, wtPosition: 0.3, wtScan: 0.3,
  ringRatio: 1.5, ringMix: 0.7, foldDrive: 0.4, foldSymmetry: 0.5,
  reverbMode: "room", reverbMix: 0.2, delayMode: "off", delayTime: 0.375, delayFeedback: 0.35, delayMix: 0.25,
};

export type VoiceId = "cantus" | "counterpoint";
export type VoiceSynths = Record<VoiceId, SynthSettings>;

const p = (o: Partial<SynthSettings>): SynthSettings => ({ ...DEFAULT_SYNTH, ...o });

/** Presets, each belonging to one model (the rack shows the presets of the current model). */
export const SYNTH_PRESETS: { id: string; settings: SynthSettings }[] = [
  // Analog (subtractive), with the effects doing much of the work
  { id: "analogPad", settings: p({ waveform: "sawtooth", attack: 0.35, decay: 0.4, sustain: 0.8, release: 0.9, tone: 1800, detune: 12, vibrato: 5, reverbMode: "hall", reverbMix: 0.35, delayMode: "analog", delayTime: 0.375, delayFeedback: 0.35, delayMix: 0.22 }) },
  { id: "spaceEcho", settings: p({ waveform: "square", attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3, tone: 2200, detune: 6, reverbMode: "spring", reverbMix: 0.3, delayMode: "tape", delayTime: 0.33, delayFeedback: 0.55, delayMix: 0.32 }) },
  { id: "slapback", settings: p({ waveform: "sawtooth", attack: 0.005, decay: 0.25, sustain: 0.55, release: 0.15, tone: 3200, detune: 8, reverbMode: "room", reverbMix: 0.15, delayMode: "slapback", delayTime: 0.11, delayFeedback: 0, delayMix: 0.4 }) },
  { id: "pingPong", settings: p({ waveform: "triangle", attack: 0.005, decay: 0.35, sustain: 0.3, release: 0.25, tone: 4000, reverbMode: "plate", reverbMix: 0.25, delayMode: "pingpong", delayTime: 0.25, delayFeedback: 0.5, delayMix: 0.4 }) },
  // Plucked string
  { id: "harpsichord", settings: p({ model: "pluck", attack: 0.003, decay: 0.05, sustain: 1, release: 0.15, tone: 7000, pluckDamping: 0.55, pluckBrightness: 0.95, reverbMode: "room", reverbMix: 0.25 }) },
  { id: "lute", settings: p({ model: "pluck", attack: 0.003, decay: 0.05, sustain: 1, release: 0.3, tone: 3000, pluckDamping: 0.75, pluckBrightness: 0.45, reverbMode: "hall", reverbMix: 0.25 }) },
  { id: "dubPluck", settings: p({ model: "pluck", attack: 0.003, decay: 0.05, sustain: 1, release: 0.2, tone: 2500, pluckDamping: 0.65, pluckBrightness: 0.7, reverbMode: "spring", reverbMix: 0.25, delayMode: "analog", delayTime: 0.375, delayFeedback: 0.6, delayMix: 0.45 }) },
  // FM
  { id: "epiano", settings: p({ model: "fm", attack: 0.004, decay: 1.2, sustain: 0.15, release: 0.5, tone: 6000, fmRatio: 1, fmIndex: 3, reverbMode: "plate", reverbMix: 0.2, delayMode: "pingpong", delayTime: 0.3, delayFeedback: 0.3, delayMix: 0.15 }) },
  { id: "bells", settings: p({ model: "fm", attack: 0.003, decay: 1.8, sustain: 0, release: 1.2, tone: 9000, fmRatio: 3.5, fmIndex: 4, reverbMode: "cathedral", reverbMix: 0.35 }) },
  { id: "brass", settings: p({ model: "fm", attack: 0.06, decay: 0.2, sustain: 0.8, release: 0.15, tone: 4000, vibrato: 6, fmRatio: 1, fmIndex: 5, reverbMode: "hall", reverbMix: 0.25 }) },
  // Additive
  { id: "organ", settings: p({ model: "additive", attack: 0.03, decay: 0.05, sustain: 1, release: 0.25, tone: 6000, addBrightness: 0.55, addEven: 0.8, reverbMode: "cathedral", reverbMix: 0.4 }) },
  { id: "flute", settings: p({ model: "additive", attack: 0.09, decay: 0.1, sustain: 0.9, release: 0.2, tone: 4000, vibrato: 10, addBrightness: 0.1, addEven: 0.3, reverbMode: "hall", reverbMix: 0.3 }) },
  { id: "clarinet", settings: p({ model: "additive", attack: 0.05, decay: 0.1, sustain: 0.85, release: 0.15, tone: 3500, vibrato: 4, addBrightness: 0.6, addEven: 0.05, reverbMode: "room", reverbMix: 0.2 }) },
  // Formant (voices)
  { id: "choir", settings: p({ model: "formant", attack: 0.25, decay: 0.3, sustain: 0.9, release: 0.6, tone: 5000, vibrato: 14, formantVowel: 0, formantBreath: 0.2, reverbMode: "cathedral", reverbMix: 0.45 }) },
  { id: "monks", settings: p({ model: "formant", attack: 0.3, decay: 0.3, sustain: 0.95, release: 0.8, tone: 3000, vibrato: 4, formantVowel: 3.6, formantBreath: 0.1, reverbMode: "cathedral", reverbMix: 0.55 }) },
  // Bowed (body model)
  { id: "viol", settings: p({ model: "bowed", attack: 0.18, decay: 0.3, sustain: 0.85, release: 0.35, tone: 4500, vibrato: 9, bowPressure: 0.45, bowBody: 0.7, reverbMode: "hall", reverbMix: 0.3 }) },
  { id: "cello", settings: p({ model: "bowed", attack: 0.25, decay: 0.3, sustain: 0.9, release: 0.5, tone: 3000, vibrato: 14, bowPressure: 0.6, bowBody: 0.9, reverbMode: "room", reverbMix: 0.25 }) },
  // Wavetable
  { id: "glass", settings: p({ model: "wavetable", attack: 0.01, decay: 0.8, sustain: 0.4, release: 0.8, tone: 7000, wtPosition: 0.1, wtScan: 0.4, reverbMode: "plate", reverbMix: 0.35, delayMode: "digital", delayTime: 0.25, delayFeedback: 0.3, delayMix: 0.2 }) },
  { id: "drift", settings: p({ model: "wavetable", attack: 0.4, decay: 0.5, sustain: 0.8, release: 1, tone: 3000, wtPosition: 0.6, wtScan: 1.2, vibrato: 6, reverbMode: "hall", reverbMix: 0.35, delayMode: "tape", delayTime: 0.45, delayFeedback: 0.45, delayMix: 0.3 }) },
  // Ring modulation (wacky)
  { id: "robot", settings: p({ model: "ringmod", attack: 0.005, decay: 0.2, sustain: 0.7, release: 0.1, tone: 5000, ringRatio: 1.41, ringMix: 0.85, reverbMode: "room", reverbMix: 0.15, delayMode: "slapback", delayTime: 0.09, delayFeedback: 0, delayMix: 0.35 }) },
  { id: "spaceBells", settings: p({ model: "ringmod", attack: 0.003, decay: 1.2, sustain: 0.1, release: 1, tone: 8000, ringRatio: 2.76, ringMix: 0.6, reverbMode: "cathedral", reverbMix: 0.4, delayMode: "pingpong", delayTime: 0.33, delayFeedback: 0.55, delayMix: 0.35 }) },
  // Wavefolder (wacky)
  { id: "buzz", settings: p({ model: "wavefold", attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.15, tone: 4500, foldDrive: 0.55, foldSymmetry: 0.5, reverbMode: "room", reverbMix: 0.15 }) },
  { id: "acidFold", settings: p({ model: "wavefold", attack: 0.005, decay: 0.25, sustain: 0.45, release: 0.15, tone: 3200, foldDrive: 0.85, foldSymmetry: 0.7, reverbMode: "spring", reverbMix: 0.2, delayMode: "analog", delayTime: 0.375, delayFeedback: 0.55, delayMix: 0.35 }) },
];

export type NumericKey = { [K in keyof SynthSettings]: SynthSettings[K] extends number ? K : never }[keyof SynthSettings];
export type ChoiceKey = Exclude<keyof SynthSettings, NumericKey>;

/** Knob ranges; `log` knobs move by ratios (times, frequencies), the others by offsets. */
export const RANGES: Record<NumericKey, { min: number; max: number; log?: boolean }> = {
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

/** True when the two voices share this choice (so it may be changed for both at once). */
export function sharedChoice(value: VoiceSynths, key: ChoiceKey): boolean {
  return value.cantus[key] === value.counterpoint[key];
}

/**
 * Apply an edit made on the rack. With a single voice targeted, only that voice changes.
 * With both voices targeted, every changed knob moves both voices together, by the same ratio
 * (log knobs) or offset (others), clamped to its range, so per-voice differences survive;
 * a changed choice (model, waveform, effect mode) applies to both only when they already agree.
 * `shown` is what the rack displayed (the counterpoint's settings in "all" mode).
 */
export function applyEdit(value: VoiceSynths, target: SynthTarget, shown: SynthSettings, next: SynthSettings): VoiceSynths {
  const keys = (Object.keys(next) as (keyof SynthSettings)[]).filter((k) => next[k] !== shown[k]);
  const edit = (s: SynthSettings): SynthSettings => {
    const out = { ...s } as Record<string, unknown>;
    for (const k of keys) {
      if (k in RANGES) {
        const nk = k as NumericKey;
        const r = RANGES[nk];
        const from = shown[nk];
        const to = next[nk];
        let v: number;
        if (target !== "all") v = to;
        else if (r.log && from > 0) v = s[nk] * (to / from);
        else v = s[nk] + (to - from);
        out[nk] = Math.min(r.max, Math.max(r.min, v));
      } else if (target !== "all" || sharedChoice(value, k as ChoiceKey)) {
        out[k] = next[k];
      }
    }
    return out as unknown as SynthSettings;
  };
  return {
    cantus: target === "counterpoint" ? value.cantus : edit(value.cantus),
    counterpoint: target === "cantus" ? value.counterpoint : edit(value.counterpoint),
  };
}
