import type { PresetId } from "../continuo/types.ts";
import { CONTINUO_DISPLAYS, CONTINUO_PRESET_FAMILIES, FINALS_MODES, type ContinuoSettings } from "../game/continuo-settings.ts";
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
  const COLOURS = ["#b7791f", "#3b6fd8", "#8b5cf6"];
  return (
    <section className="drumbox continuobox cols" aria-label={t("ui.continuo.title")} title={t("ui.continuo.boxHelp")}>
      <div className="dcol grp-head">
        <div className="dhead">
          <span className="rack-title">{t("ui.continuo.title")}</span>
          <button className="chipbtn" tabIndex={-1} aria-pressed={on} onClick={() => onToggle(!on)}>{on ? t("ui.continuo.on") : t("ui.continuo.off")}</button>
        </div>
        <span className="dlabel">{t("ui.continuo.display")}</span>
        {CONTINUO_DISPLAYS.map((d) => (
          <button key={d} role="radio" className="chipbtn" tabIndex={-1} aria-checked={value.display === d} aria-pressed={value.display === d} disabled={!on} title={t(`ui.continuo.display.${d}.help`)} onClick={() => set({ display: d })}>
            {t(`ui.continuo.display.${d}`)}
          </button>
        ))}
      </div>
      {CONTINUO_PRESET_FAMILIES.map((fam, i) => (
        <div key={fam.id} className="dcol" style={{ ["--g" as string]: COLOURS[i % COLOURS.length] }} role="group">
          <span className="dlabel">{t(`ui.continuo.family.${fam.id}`)}</span>
          {fam.presets.map((p: PresetId) => (
            <button key={p} className="chipbtn" tabIndex={-1} aria-pressed={value.preset === p} title={t(`ui.continuo.preset.${p}.help`)} onClick={() => set({ preset: p }, true)}>
              {t(`ui.continuo.preset.${p}`)}
            </button>
          ))}
        </div>
      ))}
      <div className="dcol grp-feel">
        <span className="dlabel">{t("ui.continuo.finals")}</span>
        {FINALS_MODES.map((f) => (
          <button key={f} className="chipbtn" tabIndex={-1} aria-pressed={value.finals === f} title={t(`ui.continuo.finals.${f}.help`)} onClick={() => set({ finals: f }, true)}>
            {t(`ui.continuo.finals.${f}`)}
          </button>
        ))}
        <span className="dlabel">{t("ui.continuo.options")}</span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={value.passingFill} title={t("ui.continuo.passing.help")} onClick={() => set({ passingFill: !value.passingFill }, true)}>{t("ui.continuo.passing")}</button>
        <button className="chipbtn" tabIndex={-1} aria-pressed={value.inegal && !antico} disabled={antico} title={t(antico ? "ui.continuo.inegal.antico" : "ui.continuo.inegal.help")} onClick={() => set({ inegal: !value.inegal }, true)}>{t("ui.continuo.inegal")}</button>
        <button className="chipbtn" tabIndex={-1} aria-pressed={value.accidentals} title={t("ui.continuo.accidentals.help")} onClick={() => set({ accidentals: !value.accidentals }, true)}>{t("ui.continuo.accidentals")}</button>
      </div>
    </section>
  );
}
