import { DRUM_FAMILIES, DRUM_PATTERNS, LOOP_LENGTHS, type DrumSettings } from "../audio/drums.ts";
import { Knob } from "./Knob.tsx";
import { t } from "./i18n.ts";

interface Props {
  on: boolean;
  onToggle(on: boolean): void;
  value: DrumSettings;
  onChange(v: DrumSettings): void;
  /** Called after a pattern is chosen (to let it be heard). */
  onPreview(): void;
}

const lengthText = (l: number) => (l >= 1 ? t(l === 1 ? "ui.drums.bar" : "ui.drums.bars", { n: l }) : t("ui.drums.fraction", { n: `1/${1 / l}` }));

/** Options for the drum track: on/off, loop length (×2, ÷2), level, and the pattern. */
export function DrumBox({ on, onToggle, value, onChange, onPreview }: Props) {
  const k = LOOP_LENGTHS.indexOf(value.length);
  const setLength = (i: number) => onChange({ ...value, length: LOOP_LENGTHS[Math.max(0, Math.min(LOOP_LENGTHS.length - 1, i))] });
  return (
    <section className="drumbox" aria-label={t("ui.drums.title")}>
      <div className="drum-head">
        <span className="rack-title">{t("ui.drums.title")}</span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={on} onClick={() => onToggle(!on)}>
          {on ? t("ui.drums.on") : t("ui.drums.off")}
        </button>
        <span className="loop" title={t("ui.drums.loopHelp")}>
          <button className="chipbtn" tabIndex={-1} disabled={k <= 0} onClick={() => setLength(k - 1)} aria-label={t("ui.drums.halve")}>÷2</button>
          <span className="loop-len">{lengthText(value.length)}</span>
          <button className="chipbtn" tabIndex={-1} disabled={k >= LOOP_LENGTHS.length - 1} onClick={() => setLength(k + 1)} aria-label={t("ui.drums.double")}>×2</button>
        </span>
        <Knob id="drum-level" label={t("ui.drums.level")} value={value.level} min={0} max={1} defaultValue={0.55} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onChange({ ...value, level: v })} />
      </div>
      <div className="drum-families">
        {DRUM_FAMILIES.map((f) => (
          <div key={f} className="drum-family">
            <h4>{t(`ui.drums.family.${f}`)}</h4>
            <ul className="presets">
              {DRUM_PATTERNS.filter((p) => p.family === f).map((p) => (
                <li key={p.id}>
                  <button
                    tabIndex={-1}
                    aria-pressed={value.pattern === p.id}
                    title={t(`ui.drums.pattern.${p.id}.help`)}
                    onClick={() => {
                      onChange({ ...value, pattern: p.id });
                      if (!on) onToggle(true);
                      onPreview();
                    }}
                  >
                    {t(`ui.drums.pattern.${p.id}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="rack-help">{t("ui.drums.boxHelp")}</p>
    </section>
  );
}
