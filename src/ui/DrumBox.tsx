import { DRUM_FAMILIES, DRUM_KITS, DRUM_PATTERNS, kitOf, LOOP_FACTORS, loopFraction, scaleLoop, type DrumSettings } from "../audio/drums.ts";
import { t } from "./i18n.ts";

interface Props {
  on: boolean;
  onToggle(on: boolean): void;
  value: DrumSettings;
  onChange(v: DrumSettings): void;
  /** Called after a pattern is chosen (to let it be heard). */
  onPreview(): void;
}

const lengthText = (l: number) => {
  const f = loopFraction(l) ?? [l, 1];
  const n = f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`;
  return t(l === 1 ? "ui.drums.bar" : l > 1 ? "ui.drums.bars" : "ui.drums.fraction", { n });
};
const factorText = (f: number) => String(Math.round(f * 100) / 100);

/** Options for the drum track: on/off, loop length (÷2 ÷1.5 ×1.5 ×2, D70) and the pattern (its level is on the mixer). */
export function DrumBox({ on, onToggle, value, onChange, onPreview }: Props) {
  const scaled = (f: number) => scaleLoop(value.length, f);
  const factorButton = (f: number) => {
    const next = scaled(f);
    const label = f > 1 ? `×${factorText(f)}` : `÷${factorText(1 / f)}`;
    return (
      <button key={f} className="chipbtn" tabIndex={-1} disabled={next === null} onClick={() => next !== null && onChange({ ...value, length: next })} aria-label={t(f > 1 ? "ui.drums.longer" : "ui.drums.shorter", { f: factorText(f > 1 ? f : 1 / f) })}>
        {label}
      </button>
    );
  };
  return (
    <section className="drumbox" aria-label={t("ui.drums.title")}>
      <div className="drum-head">
        <span className="rack-title">{t("ui.drums.title")}</span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={on} onClick={() => onToggle(!on)}>
          {on ? t("ui.drums.on") : t("ui.drums.off")}
        </button>
        <span className="loop" title={t("ui.drums.loopHelp")}>
          {LOOP_FACTORS.map((f) => factorButton(1 / f))}
          <button className="chipbtn loop-len" tabIndex={-1} onClick={() => onChange({ ...value, length: 1 })} title={t("ui.drums.resetLoop")}>{lengthText(value.length)}</button>
          {[...LOOP_FACTORS].reverse().map((f) => factorButton(f))}
        </span>
      </div>
      <div className="drum-kits" role="group" aria-label={t("ui.drums.kit")}>
        <span className="kit-label">{t("ui.drums.kit")}</span>
        {DRUM_KITS.map((k) => (
          <button key={k} className="chipbtn" tabIndex={-1} aria-pressed={kitOf(value) === k} title={t(`ui.drums.kit.${k}.help`)} onClick={() => { onChange({ ...value, kit: k }); if (!on) onToggle(true); onPreview(); }}>
            {t(`ui.drums.kit.${k}`)}
          </button>
        ))}
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
                      onChange({ ...value, pattern: p.id, kit: undefined });
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
