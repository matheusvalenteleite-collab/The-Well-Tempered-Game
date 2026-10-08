import type { PresetId } from "../continuo/types.ts";
import { CONTINUO_DISPLAYS, CONTINUO_PRESETS, FINALS_MODES, type ContinuoSettings } from "../game/continuo-settings.ts";
import { t } from "./i18n.ts";

interface Props {
  on: boolean;
  onToggle(on: boolean): void;
  value: ContinuoSettings;
  onChange(v: ContinuoSettings): void;
}

/** The continuo strip's editor: on/off, what the score shows, and how it plays (its level is the strip's fader). */
export function ContinuoBox({ on, onToggle, value, onChange }: Props) {
  const set = (change: Partial<ContinuoSettings>, turnOn = false) => {
    onChange({ ...value, ...change });
    if (turnOn && !on) onToggle(true);
  };
  const antico = value.preset === "stileAntico";
  return (
    <section className="drumbox continuobox" aria-label={t("ui.continuo.title")}>
      <div className="drum-head">
        <span className="rack-title">{t("ui.continuo.title")}</span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={on} onClick={() => onToggle(!on)}>
          {on ? t("ui.continuo.on") : t("ui.continuo.off")}
        </button>
      </div>
      <div className="drum-families">
        <div className="drum-family">
          <h4>{t("ui.continuo.display")}</h4>
          <div className="segmented" role="radiogroup" aria-label={t("ui.continuo.display")}>
            {CONTINUO_DISPLAYS.map((d) => (
              <button key={d} role="radio" className="chipbtn" tabIndex={-1} aria-checked={value.display === d} aria-pressed={value.display === d} disabled={!on} title={t(`ui.continuo.display.${d}.help`)} onClick={() => set({ display: d })}>
                {t(`ui.continuo.display.${d}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="drum-families">
        <div className="drum-family">
          <h4>{t("ui.continuo.instruments")}</h4>
          <ul className="presets">
            {CONTINUO_PRESETS.map((p: PresetId) => (
              <li key={p}>
                <button tabIndex={-1} aria-pressed={value.preset === p} title={t(`ui.continuo.preset.${p}.help`)} onClick={() => set({ preset: p }, true)}>
                  {t(`ui.continuo.preset.${p}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="drum-family">
          <h4>{t("ui.continuo.finals")}</h4>
          <ul className="presets">
            {FINALS_MODES.map((f) => (
              <li key={f}>
                <button tabIndex={-1} aria-pressed={value.finals === f} title={t(`ui.continuo.finals.${f}.help`)} onClick={() => set({ finals: f }, true)}>
                  {t(`ui.continuo.finals.${f}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="drum-family">
          <h4>{t("ui.continuo.options")}</h4>
          <ul className="presets">
            <li>
              <button tabIndex={-1} aria-pressed={value.passingFill} title={t("ui.continuo.passing.help")} onClick={() => set({ passingFill: !value.passingFill }, true)}>
                {t("ui.continuo.passing")}
              </button>
            </li>
            <li>
              <button tabIndex={-1} aria-pressed={value.inegal && !antico} disabled={antico} title={t(antico ? "ui.continuo.inegal.antico" : "ui.continuo.inegal.help")} onClick={() => set({ inegal: !value.inegal }, true)}>
                {t("ui.continuo.inegal")}
              </button>
            </li>
          </ul>
        </div>
      </div>
      <p className="rack-help">{t("ui.continuo.boxHelp")}</p>
    </section>
  );
}
