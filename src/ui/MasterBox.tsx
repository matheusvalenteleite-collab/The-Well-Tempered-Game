/** The master's own settings (D95): a reverb and a delay over the whole mix, after the strips. */
import { DELAY_MODES, REVERB_MODES } from "../audio/synth-settings.ts";
import type { MasterFx } from "../audio/sound.ts";
import { Knob } from "./Knob.tsx";
import { t } from "./i18n.ts";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const ms = (v: number) => `${Math.round(v * 1000)} ms`;

export function MasterBox({ value, onChange }: { value: MasterFx; onChange(v: MasterFx): void }) {
  const set = (c: Partial<MasterFx>) => onChange({ ...value, ...c });
  return (
    <div className="rack master-rack">
      <div className="rack-title">{t("ui.master.title")}</div>
      <div className="drum-family">
        <h4>{t("ui.synth.reverb")}</h4>
        <ul className="presets">
          {REVERB_MODES.map((m) => (
            <li key={m}>
              <button aria-pressed={value.reverbMode === m} onClick={() => set({ reverbMode: m })}>{t(`ui.synth.reverbMode.${m}`)}</button>
            </li>
          ))}
        </ul>
        {value.reverbMode !== "off" && <Knob id="master-reverb" label={t("ui.synth.reverbMix")} value={value.reverbMix} min={0} max={1} defaultValue={0.2} format={pct} onChange={(v) => set({ reverbMix: v })} />}
      </div>
      <div className="drum-family">
        <h4>{t("ui.synth.delay")}</h4>
        <ul className="presets">
          {DELAY_MODES.map((m) => (
            <li key={m}>
              <button aria-pressed={value.delayMode === m} onClick={() => set({ delayMode: m })}>{t(`ui.synth.delayMode.${m}`)}</button>
            </li>
          ))}
        </ul>
        {value.delayMode !== "off" && (
          <div className="rack-knobs">
            <Knob id="master-delay-time" label={t("ui.synth.delayTime")} value={value.delayTime} min={0.05} max={1.2} log defaultValue={0.375} format={ms} onChange={(v) => set({ delayTime: v })} />
            {value.delayMode !== "slapback" && <Knob id="master-delay-fb" label={t("ui.synth.delayFeedback")} value={value.delayFeedback} min={0} max={0.9} defaultValue={0.3} format={pct} onChange={(v) => set({ delayFeedback: v })} />}
            <Knob id="master-delay-mix" label={t("ui.synth.delayMix")} value={value.delayMix} min={0} max={1} defaultValue={0.18} format={pct} onChange={(v) => set({ delayMix: v })} />
          </div>
        )}
      </div>
      <p className="rack-help">{t("ui.master.help")}</p>
    </div>
  );
}
