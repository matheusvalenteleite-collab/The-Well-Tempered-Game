import { DEFAULT_SYNTH, SYNTH_MODELS, SYNTH_PRESETS, WAVEFORMS, type SynthModel, type SynthSettings, type VoiceSynths } from "../audio/engine.ts";
import { Knob } from "./Knob.tsx";
import { t } from "./i18n.ts";

/** Which voice the rack edits: both, the counterpoint (the player's voice), or the cantus firmus. */
export type SynthTarget = "all" | "counterpoint" | "cantus";
const TARGETS: SynthTarget[] = ["all", "counterpoint", "cantus"];

interface Props {
  value: VoiceSynths;
  target: SynthTarget;
  onTarget(t: SynthTarget): void;
  onChange(v: VoiceSynths): void;
}

type NumKey = { [K in keyof SynthSettings]: SynthSettings[K] extends number ? K : never }[keyof SynthSettings];
interface KnobSpec { key: NumKey; min: number; max: number; log?: boolean; fmt(v: number): string }

const ms = (v: number) => (v < 1 ? `${Math.round(v * 1000)} ms` : `${v.toFixed(2)} s`);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const SHARED: KnobSpec[] = [
  { key: "attack", min: 0.003, max: 1.5, log: true, fmt: ms },
  { key: "decay", min: 0.01, max: 2.5, log: true, fmt: ms },
  { key: "sustain", min: 0, max: 1, fmt: pct },
  { key: "release", min: 0.01, max: 2.5, log: true, fmt: ms },
  { key: "tone", min: 200, max: 10000, log: true, fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`) },
  { key: "vibrato", min: 0, max: 40, fmt: (v) => `${Math.round(v)} ¢` },
];
const BY_MODEL: Record<SynthModel, KnobSpec[]> = {
  subtractive: [{ key: "detune", min: 0, max: 30, fmt: (v) => `${Math.round(v)} ¢` }],
  pluck: [
    { key: "pluckDamping", min: 0, max: 1, fmt: pct },
    { key: "pluckBrightness", min: 0, max: 1, fmt: pct },
  ],
  fm: [
    { key: "fmRatio", min: 0.5, max: 8, log: true, fmt: (v) => `${v.toFixed(2)}×` },
    { key: "fmIndex", min: 0, max: 10, fmt: (v) => v.toFixed(1) },
  ],
  additive: [
    { key: "addBrightness", min: 0, max: 1, fmt: pct },
    { key: "addEven", min: 0, max: 1, fmt: pct },
  ],
};

const same = (a: SynthSettings, b: SynthSettings) =>
  (Object.keys(a) as (keyof SynthSettings)[]).every((k) => (typeof a[k] === "number" ? Math.abs((a[k] as number) - (b[k] as number)) < 1e-6 : a[k] === b[k]));

/** Apply only the fields that changed to the voices being edited, so "All" never erases per-voice differences elsewhere. */
function apply(value: VoiceSynths, target: SynthTarget, shown: SynthSettings, next: SynthSettings): VoiceSynths {
  const changed = (Object.keys(next) as (keyof SynthSettings)[]).filter((k) => next[k] !== shown[k]);
  const patch = (s: SynthSettings) => ({ ...s, ...Object.fromEntries(changed.map((k) => [k, next[k]])) }) as SynthSettings;
  return {
    cantus: target === "counterpoint" ? value.cantus : patch(value.cantus),
    counterpoint: target === "cantus" ? value.counterpoint : patch(value.counterpoint),
  };
}

/** The synthesizer rack: voice and model switches with knobs on the left, presets on the right. */
export function SynthRack({ value, target, onTarget, onChange }: Props) {
  const shown = target === "cantus" ? value.cantus : value.counterpoint;
  const set = (next: SynthSettings) => onChange(apply(value, target, shown, next));
  const cycle = <T,>(list: T[], cur: T) => list[(list.indexOf(cur) + 1) % list.length];
  const differ = target === "all" && !same(value.cantus, value.counterpoint);
  const activePreset = SYNTH_PRESETS.find((p) => same(p.settings, shown) && (target !== "all" || !differ))?.id;
  const knob = (k: KnobSpec) => (
    <Knob key={k.key} id={`synth-${k.key}`} label={t(`ui.synth.${k.key}`)} value={shown[k.key]} min={k.min} max={k.max} log={k.log}
      defaultValue={DEFAULT_SYNTH[k.key]} format={k.fmt} onChange={(v) => set({ ...shown, [k.key]: v })} />
  );
  return (
    <section className="rack" aria-label={t("ui.synth.title")}>
      <div className="rack-main">
        <div className="rack-head">
          <span className="rack-title">{t("ui.synth.title")}</span>
          <button className="chipbtn target" tabIndex={-1} onClick={() => onTarget(cycle(TARGETS, target))} title={t("ui.synth.targetHelp")}>
            {t(`ui.synth.target.${target}`)}
            {differ ? " *" : ""}
          </button>
          <button className="chipbtn" tabIndex={-1} onClick={() => set({ ...shown, model: cycle(SYNTH_MODELS, shown.model) })} title={t("ui.synth.modelHelp")}>
            {t(`ui.synth.model.${shown.model}`)}
          </button>
          {shown.model === "subtractive" && (
            <button className="chipbtn wave" tabIndex={-1} onClick={() => set({ ...shown, waveform: cycle(WAVEFORMS, shown.waveform) })}>
              <WaveIcon wave={shown.waveform} /> {t(`ui.synth.wave.${shown.waveform}`)}
            </button>
          )}
        </div>
        <div className="rack-knobs">
          {SHARED.map(knob)}
          <span className="knob-sep" aria-hidden="true" />
          {BY_MODEL[shown.model].map(knob)}
        </div>
        {differ && <p className="rack-help">{t("ui.synth.differ")}</p>}
      </div>
      <ul className="presets" aria-label={t("ui.synth.presets")}>
        {SYNTH_PRESETS.map((p) => (
          <li key={p.id}>
            <button tabIndex={-1} aria-pressed={activePreset === p.id} onClick={() => set({ ...p.settings })}>{t(`ui.synth.preset.${p.id}`)}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WaveIcon({ wave }: { wave: string }) {
  const d: Record<string, string> = {
    sine: "M1 8 C 4 0, 8 0, 10 8 S 16 16, 19 8",
    triangle: "M1 8 L 5.5 2 L 14.5 14 L 19 8",
    square: "M1 13 L 1 3 L 10 3 L 10 13 L 19 13 L 19 3",
    sawtooth: "M1 13 L 10 3 L 10 13 L 19 3 L 19 13",
  };
  return (
    <svg viewBox="0 0 20 16" width="18" height="14" aria-hidden="true" className="wave-icon">
      <path d={d[wave]} />
    </svg>
  );
}
