/**
 * The drum strip's editor (D99, D100), in columns that fit the dock without scrolling: the head
 * (on/off, loop length, tap tempo), the kits, the chosen kit's presets (its paradigm first), the
 * feel (swing, accent, A/B, auto fill), the fills and breaks, and a small display of the kit's
 * nine pads lighting up as the pattern rolls (a click mutes a pad). Columns are colour-coded.
 * Choosing a kit or a preset starts from its defaults. The level is on the mixer.
 */
import { useEffect, useRef, useState } from "react";
import { cyclePad, DRUM_CUES, DRUM_KITS, defaultLength, padState, freshDrums, kitOf, loopFraction, padsFor, patternById, presetsOf, stepLoop, SWING_STEPS, type DrumCue, type DrumSettings, type DrumVariation } from "../audio/drums.ts";
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

/** "2 bars", "¾ bar", and a polymetric length as loops over bars: 4/3 = "3 loops / 4 bars" (D107). */
const lengthText = (l: number) => {
  const f = loopFraction(l) ?? [l, 1];
  if (f[1] === 1) return t(l === 1 ? "ui.drums.bar" : "ui.drums.bars", { n: String(f[0]) });
  if (l < 1) return t("ui.drums.fraction", { n: `${f[0]}/${f[1]}` });
  return t("ui.drums.poly", { loops: f[1], bars: f[0] });
};
const swingText = (s: number) => (s <= 0.5 ? t("ui.drums.swing.off") : `${Math.round(s * 100)}%`);

export function DrumBox({ on, onToggle, value, onChange, onPreview, onTempo }: Props) {
  const set = (patch: Partial<DrumSettings>) => onChange({ ...value, ...patch });
  const choose = (pattern: string) => {
    onChange(freshDrums(pattern, value.level));
    if (!on) onToggle(true);
    onPreview();
  };
  const pattern = patternById(value.pattern);
  const kit = kitOf(value);
  const pads = padsFor(value);
  const mutes = value.mutes ?? [];
  const padRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const padsRef = useRef(pads);
  padsRef.current = pads;
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

  const swingIndex = Math.max(0, SWING_STEPS.findIndex((s) => Math.abs(s - (value.swing ?? 0.5)) < 1e-6));
  const prev = stepLoop(value.length, -1);
  const next = stepLoop(value.length, 1);
  const tap = () => {
    const now = performance.now();
    const recent = [...taps.current.filter((x) => now - x < 2500), now].slice(-6);
    taps.current = recent;
    if (recent.length >= 2 && onTempo) {
      const gaps = recent.slice(1).map((x, i) => x - recent[i]);
      onTempo(Math.max(30, Math.min(240, Math.round(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)))));
    }
  };

  return (
    <section className="drumbox" aria-label={t("ui.drums.title")}>
      <div className="dcol grp-head">
        <div className="dhead">
          <span className="rack-title">{t("ui.drums.title")}</span>
          <button className="chipbtn" tabIndex={-1} aria-pressed={on} onClick={() => onToggle(!on)}>{on ? t("ui.drums.on") : t("ui.drums.off")}</button>
        </div>
        <span className="dlabel">{t("ui.drums.loop")}</span>
        <span className="stepper" title={t("ui.drums.loopHelp")}>
          <button className="chipbtn" tabIndex={-1} disabled={prev === null} onClick={() => prev !== null && set({ length: prev })} aria-label={t("ui.drums.shorter")}>‹</button>
          <button className="chipbtn loop-len" tabIndex={-1} onClick={() => set({ length: defaultLength(pattern) })} title={t("ui.drums.resetLoop", { n: lengthText(defaultLength(pattern)) })}>{lengthText(value.length)}</button>
          <button className="chipbtn" tabIndex={-1} disabled={next === null} onClick={() => next !== null && set({ length: next })} aria-label={t("ui.drums.longer")}>›</button>
        </span>
        {onTempo && <button className="chipbtn tap" tabIndex={-1} onClick={tap} title={t("ui.drums.tap.help")}>{t("ui.drums.tap")}</button>}
      </div>
      <div className="dcol grp-kit" role="group" aria-label={t("ui.drums.kit")}>
        <span className="dlabel">{t("ui.drums.kit")}</span>
        <div className="kit-grid">
          {DRUM_KITS.map((k) => (
            <button key={k} className="chipbtn" tabIndex={-1} aria-pressed={kit === k} title={t(`ui.drums.kit.${k}.help`)} onClick={() => kit !== k && choose(presetsOf(k)[0].id)}>
              {t(`ui.drums.kit.${k}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="dcol grp-preset" role="group" aria-label={t("ui.drums.presets")}>
        <span className="dlabel">{t("ui.drums.presetsOf", { kit: t(`ui.drums.kit.${kit}`) })}</span>
        {presetsOf(kit).map((p, i) => (
          <button key={p.id} className="chipbtn" tabIndex={-1} aria-pressed={value.pattern === p.id} title={t(`ui.drums.pattern.${p.id}.help`)} onClick={() => choose(p.id)}>
            {t(`ui.drums.pattern.${p.id}`)}{i === 0 && <span className="paradigm" title={t("ui.drums.paradigm")}> ★</span>}
          </button>
        ))}
      </div>
      <div className="dcol grp-feel" role="group" aria-label={t("ui.drums.feel")}>
        <span className="dlabel">{t("ui.drums.feel")}</span>
        <span className="stepper" title={t("ui.drums.swing.help")}>
          <button className="chipbtn" tabIndex={-1} disabled={swingIndex === 0} onClick={() => set({ swing: SWING_STEPS[swingIndex - 1] })} aria-label={t("ui.drums.swing")}>‹</button>
          <span className="feel-value">{t("ui.drums.swing")} {swingText(SWING_STEPS[swingIndex])}</span>
          <button className="chipbtn" tabIndex={-1} disabled={swingIndex === SWING_STEPS.length - 1} onClick={() => set({ swing: SWING_STEPS[swingIndex + 1] })} aria-label={t("ui.drums.swing")}>›</button>
        </span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={!!value.accent} onClick={() => set({ accent: !value.accent })} title={t("ui.drums.accent.help")}>{t("ui.drums.accent")}</button>
        <span className="ab" role="group" title={t("ui.drums.variation.help")}>
          {(["A", "B", "AB"] as DrumVariation[]).map((v) => (
            <button key={v} className="chipbtn" tabIndex={-1} aria-pressed={(value.variation ?? "A") === v} onClick={() => set({ variation: v })}>{v === "AB" ? "A↔B" : v}</button>
          ))}
        </span>
        <button className="chipbtn" tabIndex={-1} aria-pressed={value.autoFill !== false} onClick={() => set({ autoFill: value.autoFill === false })} title={t("ui.drums.autoFill.help")}>{t("ui.drums.autoFill")}</button>
      </div>
      <div className="dcol grp-fills" role="group" aria-label={t("ui.drums.fills")}>
        <span className="dlabel">{t("ui.drums.fills")}</span>
        {DRUM_CUES.map((c) => (
          <button key={c} className={`chipbtn cue cue-${c}`} tabIndex={-1} aria-pressed={waiting === c} onClick={() => void audio.drumCue(c)} title={t(`ui.drums.cue.${c}.help`)}>
            {t(`ui.drums.cue.${c}`)}
          </button>
        ))}
      </div>
      <div className="dcol grp-pads">
        <span className="dlabel">{t("ui.drums.pads")}</span>
        <div className="minipads" title={t("ui.drums.pads.help")}>
          {pads.map((p, i) => {
            const state = padState(value, p);
            const muted = state.kind === "off";
            const name = t(`ui.drums.voice.${p.voice}`);
            const now = state.kind === "part" ? t("ui.drums.pad.part", { name, part: state.part ?? "" }) : t(state.kind === "off" ? "ui.drums.pad.off" : "ui.drums.pad.original", { name });
            return (
              <span
                key={`${p.voice}-${i}`}
                ref={(el) => { padRefs.current[i] = el; }}
                className={`minipad kind-${p.kind}${muted ? " muted" : ""}${state.kind === "part" ? " added" : ""}`}
                role="button"
                aria-pressed={!muted}
                title={`${now} ${t("ui.drums.pad.next")}`}
                onClick={() => onChange(cyclePad(value, p))}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
