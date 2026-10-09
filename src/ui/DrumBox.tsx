/**
 * The drum strip's editor (D99), after the vintage machines: a head (on/off, the loop length with
 * ‹ › arrows, tap tempo), the sound (kit), the patterns by family, the feel (swing, accent, A/B,
 * auto fill), and the nine pads of the kit with the fills and the break. Groups are colour-coded.
 * The level is on the mixer.
 */
import { useEffect, useRef, useState } from "react";
import { DRUM_CUES, DRUM_FAMILIES, DRUM_KITS, DRUM_PATTERNS, kitOf, loopFraction, padsFor, patternById, stepLoop, SWING_STEPS, type DrumCue, type DrumSettings, type DrumVariation } from "../audio/drums.ts";
import { audio } from "./shared.ts";
import { t } from "./i18n.ts";

interface Props {
  on: boolean;
  onToggle(on: boolean): void;
  value: DrumSettings;
  onChange(v: DrumSettings): void;
  /** Called after a pattern is chosen (to let it be heard). */
  onPreview(): void;
  /** Tap tempo: the tempo found, in half notes a minute. */
  onTempo?(bpm: number): void;
}

const lengthText = (l: number) => {
  const f = loopFraction(l) ?? [l, 1];
  const n = f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`;
  return t(l === 1 ? "ui.drums.bar" : l > 1 ? "ui.drums.bars" : "ui.drums.fraction", { n });
};
const swingText = (s: number) => (s <= 0.5 ? t("ui.drums.swing.off") : `${Math.round(s * 100)}%`);

export function DrumBox({ on, onToggle, value, onChange, onPreview, onTempo }: Props) {
  const set = (patch: Partial<DrumSettings>) => onChange({ ...value, ...patch });
  const pattern = patternById(value.pattern);
  const pads = padsFor(value);
  const mutes = value.mutes ?? [];
  const padRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [waiting, setWaiting] = useState<DrumCue | null>(null);
  const taps = useRef<number[]>([]);

  // The pads light up as they sound; a cue lights its button until it starts.
  useEffect(() => {
    const timers = new Set<number>();
    audio.onDrums(
      (v, at) => {
        const i = padsRef.current.findIndex((p) => p.group.includes(v));
        if (i < 0) return;
        const id = window.setTimeout(() => {
          timers.delete(id);
          const el = padRefs.current[i];
          if (!el) return;
          el.classList.add("lit");
          window.setTimeout(() => el.classList.remove("lit"), 110);
        }, Math.max(0, (at - audio.now) * 1000));
        timers.add(id);
      },
      (c) => setWaiting(c),
    );
    return () => {
      audio.onDrums(null, null);
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);
  const padsRef = useRef(pads);
  padsRef.current = pads;

  const swingIndex = Math.max(0, SWING_STEPS.findIndex((s) => Math.abs(s - (value.swing ?? 0.5)) < 1e-6));
  const prev = stepLoop(value.length, -1);
  const next = stepLoop(value.length, 1);
  const tap = () => {
    const now = performance.now();
    const recent = [...taps.current.filter((x) => now - x < 2500), now].slice(-6);
    taps.current = recent;
    if (recent.length >= 2 && onTempo) {
      const gaps = recent.slice(1).map((x, i) => x - recent[i]);
      const bpm = Math.round(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length));
      onTempo(Math.max(30, Math.min(240, bpm)));
    }
  };

  return (
    <section className="drumbox" aria-label={t("ui.drums.title")}>
      <div className="drum-head drum-grp grp-head">
        <span className="rack-title">{t("ui.drums.title")}</span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={on} onClick={() => onToggle(!on)}>
          {on ? t("ui.drums.on") : t("ui.drums.off")}
        </button>
        <span className="loop" title={t("ui.drums.loopHelp")}>
          <button className="chipbtn" tabIndex={-1} disabled={prev === null} onClick={() => prev !== null && set({ length: prev })} aria-label={t("ui.drums.shorter")}>‹</button>
          <button className="chipbtn loop-len" tabIndex={-1} onClick={() => set({ length: pattern.bars ?? 1 })} title={t("ui.drums.resetLoop", { n: lengthText(pattern.bars ?? 1) })}>{lengthText(value.length)}</button>
          <button className="chipbtn" tabIndex={-1} disabled={next === null} onClick={() => next !== null && set({ length: next })} aria-label={t("ui.drums.longer")}>›</button>
        </span>
        {onTempo && <button className="chipbtn tap" tabIndex={-1} onClick={tap} title={t("ui.drums.tap.help")}>{t("ui.drums.tap")}</button>}
      </div>
      <div className="drum-kits drum-grp grp-kit" role="group" aria-label={t("ui.drums.kit")}>
        <span className="kit-label">{t("ui.drums.kit")}</span>
        {DRUM_KITS.map((k) => (
          <button key={k} className="chipbtn" tabIndex={-1} aria-pressed={kitOf(value) === k} title={t(`ui.drums.kit.${k}.help`)} onClick={() => { set({ kit: k }); if (!on) onToggle(true); onPreview(); }}>
            {t(`ui.drums.kit.${k}`)}
          </button>
        ))}
      </div>
      <div className="drum-feel drum-grp grp-feel" role="group" aria-label={t("ui.drums.feel")}>
        <span className="kit-label">{t("ui.drums.feel")}</span>
        <span className="loop" title={t("ui.drums.swing.help")}>
          <span className="feel-label">{t("ui.drums.swing")}</span>
          <button className="chipbtn" tabIndex={-1} disabled={swingIndex === 0} onClick={() => set({ swing: SWING_STEPS[swingIndex - 1] })}>‹</button>
          <span className="feel-value">{swingText(SWING_STEPS[swingIndex])}</span>
          <button className="chipbtn" tabIndex={-1} disabled={swingIndex === SWING_STEPS.length - 1} onClick={() => set({ swing: SWING_STEPS[swingIndex + 1] })}>›</button>
        </span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={!!value.accent} onClick={() => set({ accent: !value.accent })} title={t("ui.drums.accent.help")}>{t("ui.drums.accent")}</button>
        <span className="ab" role="group" title={t("ui.drums.variation.help")}>
          {(["A", "B", "AB"] as DrumVariation[]).map((v) => (
            <button key={v} className="chipbtn" tabIndex={-1} aria-pressed={(value.variation ?? "A") === v} onClick={() => set({ variation: v })}>{v === "AB" ? "A↔B" : v}</button>
          ))}
        </span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={value.autoFill !== false} onClick={() => set({ autoFill: value.autoFill === false })} title={t("ui.drums.autoFill.help")}>{t("ui.drums.autoFill")}</button>
      </div>
      <div className="drum-families">
        {DRUM_FAMILIES.map((f) => (
          <div key={f} className={`drum-family drum-grp fam-${f}`}>
            <h4>{t(`ui.drums.family.${f}`)}</h4>
            <ul className="presets">
              {DRUM_PATTERNS.filter((p) => p.family === f).map((p) => (
                <li key={p.id}>
                  <button
                    tabIndex={-1}
                    aria-pressed={value.pattern === p.id}
                    title={t(`ui.drums.pattern.${p.id}.help`)}
                    onClick={() => {
                      onChange({ ...value, pattern: p.id, kit: undefined, length: p.bars ?? 1 });
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
      <div className="drum-machine">
        <div className="pads" role="group" aria-label={t("ui.drums.pads")} title={t("ui.drums.pads.help")}>
          {pads.map((p, i) => {
            const muted = p.group.every((v) => mutes.includes(v));
            return (
              <div key={`${p.voice}-${i}`} className={`pad-cell kind-${p.kind}${muted ? " muted" : ""}`}>
                <button ref={(el) => { padRefs.current[i] = el; }} className="pad" tabIndex={-1} onPointerDown={() => void audio.drumPad(p.voice)} title={t("ui.drums.pad.help", { name: t(`ui.drums.voice.${p.voice}`) })}>
                  <span className="pad-name">{t(`ui.drums.voice.${p.voice}`)}</span>
                </button>
                <button
                  className="pad-mute"
                  tabIndex={-1}
                  aria-pressed={muted}
                  title={t(muted ? "ui.drums.unmute" : "ui.drums.mute", { name: t(`ui.drums.voice.${p.voice}`) })}
                  onClick={() => set({ mutes: muted ? mutes.filter((m) => !p.group.includes(m)) : [...new Set([...mutes, ...p.group])] })}
                >
                  M
                </button>
              </div>
            );
          })}
        </div>
        <div className="cues" role="group" aria-label={t("ui.drums.fills")}>
          <span className="kit-label">{t("ui.drums.fills")}</span>
          {DRUM_CUES.map((c) => (
            <button key={c} className={`chipbtn cue cue-${c}`} tabIndex={-1} aria-pressed={waiting === c} onClick={() => void audio.drumCue(c)} title={t(`ui.drums.cue.${c}.help`)}>
              {t(`ui.drums.cue.${c}`)}
            </button>
          ))}
        </div>
      </div>
      <p className="rack-help">{t("ui.drums.boxHelp")}</p>
    </section>
  );
}
