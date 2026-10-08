import {
  DEFAULT_SYNTH,
  DELAY_MODES,
  firstPreset,
  RANGES,
  REVERB_MODES,
  SYNTH_MODELS,
  SYNTH_PRESETS,
  WAVEFORMS,
  type NumericKey,
  type SynthModel,
  type SynthSettings,
} from "../audio/synth-settings.ts";
import { Knob } from "./Knob.tsx";
import { t } from "./i18n.ts";

interface Props {
  /** Heading: which voice (or linked voices) this edits. */
  title: string;
  value: SynthSettings;
  onChange(v: SynthSettings): void;
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
  sampled: [],
  piano: ["pianoHammer", "pianoDetach"],
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

export const same = (a: SynthSettings, b: SynthSettings) =>
  (Object.keys(a) as (keyof SynthSettings)[]).every((k) => (typeof a[k] === "number" ? Math.abs((a[k] as number) - (b[k] as number)) < 1e-6 : a[k] === b[k]));

/** The name of the preset these settings match, or null (custom). */
export function presetName(v: SynthSettings): string | null {
  const p = SYNTH_PRESETS.find((x) => same(x.settings, v));
  return p ? t(`ui.synth.preset.${p.id}`) : null;
}

/** The synth editor for one voice (or one group of linked voices): family and preset, each with arrows; knobs; effects. */
export function SynthRack({ title, value, onChange }: Props) {
  const shown = value;
  const set = (next: SynthSettings) => onChange(next);
  const cycle = <T,>(list: T[], cur: T, step = 1) => list[(list.indexOf(cur) + step + list.length) % list.length];
  const knob = (k: NumericKey) => (
    <Knob key={k} id={`synth-${k}`} label={t(`ui.synth.${k}`)} value={shown[k]} min={RANGES[k].min} max={RANGES[k].max} log={RANGES[k].log}
      defaultValue={firstPreset(shown.model).settings[k] ?? DEFAULT_SYNTH[k]} format={fmt(k)} onChange={(v) => set({ ...shown, [k]: v })} />
  );
  const choice = (label: React.ReactNode, onClick: () => void) => (
    <button className="chipbtn" tabIndex={-1} onClick={onClick}>
      {label}
    </button>
  );
  const presets = SYNTH_PRESETS.filter((p) => p.settings.model === shown.model);
  const active = presets.findIndex((p) => same(p.settings, shown));
  /** Choosing a model loads its first preset, which is always clean (no reverb, no delay). */
  const setModel = (m: SynthModel) => set({ ...firstPreset(m).settings });
  const stepPreset = (d: number) => {
    const from = active < 0 ? (d > 0 ? -1 : 0) : active;
    set({ ...presets[(from + d + presets.length) % presets.length].settings });
  };

  return (
    <section className="rack" aria-label={t("ui.synth.title")}>
      <div className="rack-main">
        <div className="rack-head">
          <span className="rack-title">{title}</span>
          <span className="stepper">
            <button className="chipbtn" tabIndex={-1} onClick={() => setModel(cycle(SYNTH_MODELS, shown.model, -1))} aria-label={t("ui.synth.prevModel")}>‹</button>
            <select className="model" aria-label={t("ui.synth.modelHelp")} value={shown.model} title={t("ui.synth.modelHelp")} onChange={(e) => setModel(e.target.value as SynthModel)}>
              {SYNTH_MODELS.map((m) => (
                <option key={m} value={m}>{t(`ui.synth.model.${m}`)}</option>
              ))}
            </select>
            <button className="chipbtn" tabIndex={-1} onClick={() => setModel(cycle(SYNTH_MODELS, shown.model, 1))} aria-label={t("ui.synth.nextModel")}>›</button>
          </span>
          <span className="stepper">
            <button className="chipbtn" tabIndex={-1} onClick={() => stepPreset(-1)} aria-label={t("ui.synth.prevPreset")}>‹</button>
            <select
              className="model preset"
              aria-label={t("ui.synth.presets")}
              title={t("ui.synth.presets")}
              value={active >= 0 ? presets[active].id : ""}
              onChange={(e) => {
                const q = presets.find((x) => x.id === e.target.value);
                if (q) set({ ...q.settings });
              }}
            >
              {active < 0 && <option value="">{t("ui.synth.custom")}</option>}
              {presets.map((q) => (
                <option key={q.id} value={q.id}>{t(`ui.synth.preset.${q.id}`)}</option>
              ))}
            </select>
            <button className="chipbtn" tabIndex={-1} onClick={() => stepPreset(1)} aria-label={t("ui.synth.nextPreset")}>›</button>
          </span>
          {shown.model === "subtractive" && choice(<><WaveIcon wave={shown.waveform} /> {t(`ui.synth.wave.${shown.waveform}`)}</>, () => set({ ...shown, waveform: cycle(WAVEFORMS, shown.waveform) }))}
        </div>
        <div className="rack-knobs">
          {SHARED.map(knob)}
          <span className="knob-sep" aria-hidden="true" />
          {BY_MODEL[shown.model].map(knob)}
        </div>
        <div className="rack-fx">
          <div className="fx">
            {choice(<>{t("ui.synth.reverb")}: <strong>{t(`ui.synth.reverbMode.${shown.reverbMode}`)}</strong></>, () => set({ ...shown, reverbMode: cycle(REVERB_MODES, shown.reverbMode) }))}
            {shown.reverbMode !== "off" && knob("reverbMix")}
          </div>
          <div className="fx">
            {choice(<>{t("ui.synth.delay")}: <strong>{t(`ui.synth.delayMode.${shown.delayMode}`)}</strong></>, () => set({ ...shown, delayMode: cycle(DELAY_MODES, shown.delayMode) }))}
            {shown.delayMode !== "off" && (
              <>
                {knob("delayTime")}
                {shown.delayMode !== "slapback" && knob("delayFeedback")}
                {knob("delayMix")}
              </>
            )}
          </div>
        </div>
        <p className="rack-help">{t("ui.synth.help")}</p>
      </div>
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
