import { WAVEFORMS, type SynthSettings } from "../audio/engine.ts";
import { t } from "./i18n.ts";

interface Props {
  value: SynthSettings;
  onChange(v: SynthSettings): void;
  onReset(): void;
}

const SLIDERS: { key: "attack" | "decay" | "sustain" | "release" | "tone"; min: number; max: number; step: number; fmt(v: number): string }[] = [
  { key: "attack", min: 0.003, max: 1, step: 0.001, fmt: (v) => `${Math.round(v * 1000)} ms` },
  { key: "decay", min: 0.01, max: 1.5, step: 0.01, fmt: (v) => `${Math.round(v * 1000)} ms` },
  { key: "sustain", min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)} %` },
  { key: "release", min: 0.01, max: 2, step: 0.01, fmt: (v) => `${Math.round(v * 1000)} ms` },
  { key: "tone", min: 200, max: 8000, step: 10, fmt: (v) => `${Math.round(v)} Hz` },
];

/** The synthesizer rack: waveform switch, ADSR envelope and a low-pass tone control. */
export function SynthRack({ value, onChange, onReset }: Props) {
  const next = WAVEFORMS[(WAVEFORMS.indexOf(value.waveform) + 1) % WAVEFORMS.length];
  return (
    <section className="rack" aria-label={t("ui.synth.title")}>
      <div className="rack-head">
        <span className="rack-title">{t("ui.synth.title")}</span>
        <button className="wave" onClick={() => onChange({ ...value, waveform: next })} title={t("ui.synth.waveNext", { next: t(`ui.synth.wave.${next}`) })}>
          {t("ui.synth.wave")}: <strong>{t(`ui.synth.wave.${value.waveform}`)}</strong>
        </button>
        <button onClick={onReset}>{t("ui.synth.reset")}</button>
      </div>
      <div className="rack-sliders">
        {SLIDERS.map((s) => (
          <label key={s.key} htmlFor={`synth-${s.key}`}>
            <span>{t(`ui.synth.${s.key}`)}</span>
            <input id={`synth-${s.key}`} type="range" min={s.min} max={s.max} step={s.step} value={value[s.key]}
              onChange={(e) => onChange({ ...value, [s.key]: Number(e.target.value) })} />
            <span className="value">{s.fmt(value[s.key])}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
