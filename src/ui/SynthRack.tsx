import { DEFAULT_SYNTH, SYNTH_PRESETS, WAVEFORMS, type SynthSettings } from "../audio/engine.ts";
import { Knob } from "./Knob.tsx";
import { t } from "./i18n.ts";

interface Props {
  value: SynthSettings;
  onChange(v: SynthSettings): void;
}

type NumKey = Exclude<keyof SynthSettings, "waveform">;
const ms = (v: number) => (v < 1 ? `${Math.round(v * 1000)} ms` : `${v.toFixed(2)} s`);
const KNOBS: { key: NumKey; min: number; max: number; log?: boolean; fmt(v: number): string }[] = [
  { key: "attack", min: 0.003, max: 1.5, log: true, fmt: ms },
  { key: "decay", min: 0.01, max: 2, log: true, fmt: ms },
  { key: "sustain", min: 0, max: 1, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "release", min: 0.01, max: 2.5, log: true, fmt: ms },
  { key: "tone", min: 200, max: 10000, log: true, fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`) },
  { key: "detune", min: 0, max: 30, fmt: (v) => `${Math.round(v)} ¢` },
  { key: "vibrato", min: 0, max: 40, fmt: (v) => `${Math.round(v)} ¢` },
];

const same = (a: SynthSettings, b: SynthSettings) =>
  a.waveform === b.waveform && KNOBS.every((k) => Math.abs(a[k.key] - b[k.key]) < 1e-6);

/** The synthesizer rack: waveform switch and knobs on the left, presets on the right. */
export function SynthRack({ value, onChange }: Props) {
  const next = WAVEFORMS[(WAVEFORMS.indexOf(value.waveform) + 1) % WAVEFORMS.length];
  const active = SYNTH_PRESETS.find((p) => same(p.settings, value))?.id;
  return (
    <section className="rack" aria-label={t("ui.synth.title")}>
      <div className="rack-main">
        <div className="rack-head">
          <span className="rack-title">{t("ui.synth.title")}</span>
          <button className="wave" tabIndex={-1} onClick={() => onChange({ ...value, waveform: next })} title={t("ui.synth.waveNext", { next: t(`ui.synth.wave.${next}`) })}>
            <WaveIcon wave={value.waveform} /> {t(`ui.synth.wave.${value.waveform}`)}
          </button>
        </div>
        <div className="rack-knobs">
          {KNOBS.map((k) => (
            <Knob key={k.key} id={`synth-${k.key}`} label={t(`ui.synth.${k.key}`)} value={value[k.key]} min={k.min} max={k.max} log={k.log}
              defaultValue={DEFAULT_SYNTH[k.key]} format={k.fmt} onChange={(v) => onChange({ ...value, [k.key]: v })} />
          ))}
        </div>
        <p className="rack-help">{t("ui.synth.help")}</p>
      </div>
      <ul className="presets" aria-label={t("ui.synth.presets")}>
        {SYNTH_PRESETS.map((p) => (
          <li key={p.id}>
            <button tabIndex={-1} aria-pressed={active === p.id} onClick={() => onChange({ ...p.settings })}>{t(`ui.synth.preset.${p.id}`)}</button>
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
    <svg viewBox="0 0 20 16" width="20" height="16" aria-hidden="true" className="wave-icon">
      <path d={d[wave]} />
    </svg>
  );
}
