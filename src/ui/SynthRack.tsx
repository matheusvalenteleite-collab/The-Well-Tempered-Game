import {
  applyEdit,
  DEFAULT_SYNTH,
  DELAY_MODES,
  RANGES,
  REVERB_MODES,
  sharedChoice,
  SYNTH_MODELS,
  SYNTH_PRESETS,
  WAVEFORMS,
  type ChoiceKey,
  type NumericKey,
  type SynthModel,
  type SynthSettings,
  type SynthTarget,
  type VoiceSynths,
} from "../audio/synth-settings.ts";
import { Knob } from "./Knob.tsx";
import { t } from "./i18n.ts";

export type { SynthTarget };
const TARGETS: SynthTarget[] = ["all", "counterpoint", "cantus"];

interface Props {
  value: VoiceSynths;
  target: SynthTarget;
  onTarget(t: SynthTarget): void;
  onChange(v: VoiceSynths): void;
}

const ms = (v: number) => (v < 1 ? `${Math.round(v * 1000)} ms` : `${v.toFixed(2)} s`);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);
const FORMAT: Partial<Record<NumericKey, (v: number) => string>> = {
  attack: ms, decay: ms, release: ms, delayTime: ms, tone: hz,
  vibrato: (v) => `${Math.round(v)} ¢`, detune: (v) => `${Math.round(v)} ¢`,
  fmRatio: (v) => `${v.toFixed(2)}×`, ringRatio: (v) => `${v.toFixed(2)}×`, fmIndex: (v) => v.toFixed(1),
  wtScan: (v) => `${v.toFixed(1)} Hz`,
  formantVowel: (v) => "a e i o u".split(" ")[Math.round(v)] ?? "",
};
const fmt = (k: NumericKey) => FORMAT[k] ?? pct;

const SHARED: NumericKey[] = ["attack", "decay", "sustain", "release", "tone", "vibrato"];
const BY_MODEL: Record<SynthModel, NumericKey[]> = {
  subtractive: ["detune"],
  pluck: ["pluckDamping", "pluckBrightness"],
  fm: ["fmRatio", "fmIndex"],
  additive: ["addBrightness", "addEven"],
  formant: ["formantVowel", "formantBreath"],
  bowed: ["bowPressure", "bowBody"],
  wavetable: ["wtPosition", "wtScan"],
  ringmod: ["ringRatio", "ringMix"],
  wavefold: ["foldDrive", "foldSymmetry"],
};

/** The synthesizer rack: voice, model and effects on the left; the model's presets on the right. */
export function SynthRack({ value, target, onTarget, onChange }: Props) {
  const shown = target === "cantus" ? value.cantus : value.counterpoint;
  const set = (next: SynthSettings) => onChange(applyEdit(value, target, shown, next));
  const cycle = <T,>(list: T[], cur: T) => list[(list.indexOf(cur) + 1) % list.length];
  const locked = (k: ChoiceKey) => target === "all" && !sharedChoice(value, k);
  const differ = target === "all" && (Object.keys(shown) as (keyof SynthSettings)[]).some((k) => value.cantus[k] !== value.counterpoint[k]);
  const knob = (k: NumericKey) => (
    <Knob key={k} id={`synth-${k}`} label={t(`ui.synth.${k}`)} value={shown[k]} min={RANGES[k].min} max={RANGES[k].max} log={RANGES[k].log}
      defaultValue={DEFAULT_SYNTH[k]} format={fmt(k)} onChange={(v) => set({ ...shown, [k]: v })} />
  );
  const choice = (k: ChoiceKey, label: React.ReactNode, onClick: () => void) => (
    <button className="chipbtn" tabIndex={-1} disabled={locked(k)} onClick={onClick} title={locked(k) ? t("ui.synth.locked") : undefined}>
      {label}
    </button>
  );
  const presets = SYNTH_PRESETS.filter((p) => p.settings.model === shown.model);
  const applyPreset = (s: SynthSettings) =>
    onChange({ cantus: target === "counterpoint" ? value.cantus : { ...s }, counterpoint: target === "cantus" ? value.counterpoint : { ...s } });
  const isActive = (s: SynthSettings) =>
    (target === "cantus" ? [value.cantus] : target === "counterpoint" ? [value.counterpoint] : [value.cantus, value.counterpoint]).every((v) =>
      (Object.keys(s) as (keyof SynthSettings)[]).every((k) => (typeof s[k] === "number" ? Math.abs((s[k] as number) - (v[k] as number)) < 1e-6 : s[k] === v[k])),
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
          <select
            className="model"
            aria-label={t("ui.synth.modelHelp")}
            value={shown.model}
            disabled={locked("model")}
            title={locked("model") ? t("ui.synth.locked") : t("ui.synth.modelHelp")}
            onChange={(e) => set({ ...shown, model: e.target.value as SynthModel })}
          >
            {SYNTH_MODELS.map((m) => (
              <option key={m} value={m}>{t(`ui.synth.model.${m}`)}</option>
            ))}
          </select>
          {shown.model === "subtractive" &&
            choice("waveform", <><WaveIcon wave={shown.waveform} /> {t(`ui.synth.wave.${shown.waveform}`)}</>, () => set({ ...shown, waveform: cycle(WAVEFORMS, shown.waveform) }))}
        </div>
        <div className="rack-knobs">
          {SHARED.map(knob)}
          <span className="knob-sep" aria-hidden="true" />
          {BY_MODEL[shown.model].map(knob)}
        </div>
        <div className="rack-fx">
          <div className="fx">
            {choice("reverbMode", <>{t("ui.synth.reverb")}: <strong>{t(`ui.synth.reverbMode.${shown.reverbMode}`)}</strong></>, () => set({ ...shown, reverbMode: cycle(REVERB_MODES, shown.reverbMode) }))}
            {shown.reverbMode !== "off" && knob("reverbMix")}
          </div>
          <div className="fx">
            {choice("delayMode", <>{t("ui.synth.delay")}: <strong>{t(`ui.synth.delayMode.${shown.delayMode}`)}</strong></>, () => set({ ...shown, delayMode: cycle(DELAY_MODES, shown.delayMode) }))}
            {shown.delayMode !== "off" && (
              <>
                {knob("delayTime")}
                {shown.delayMode !== "slapback" && knob("delayFeedback")}
                {knob("delayMix")}
              </>
            )}
          </div>
        </div>
        <p className="rack-help">{t(differ ? "ui.synth.differ" : "ui.synth.help")}</p>
      </div>
      <ul className="presets" aria-label={t("ui.synth.presets")}>
        {presets.map((p) => (
          <li key={p.id}>
            <button tabIndex={-1} aria-pressed={isActive(p.settings)} onClick={() => applyPreset(p.settings)}>{t(`ui.synth.preset.${p.id}`)}</button>
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
