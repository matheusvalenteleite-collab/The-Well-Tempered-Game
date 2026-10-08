import { useEffect, useRef, useState } from "react";
import { Fader, formatDb, posOfDb } from "./Fader.tsx";
import { linkedGroup, linkEnds, linkNeedsConfirm, setLink, setMix, editSynth, editVersionSynth, setVersionFollows, versionSettings, type Channel, type Link, type SoundState, type Strip } from "../audio/sound.ts";
import { patternById, type DrumSettings } from "../audio/drums.ts";
import { TEMPERAMENTS, type TemperamentId } from "../audio/temperament.ts";
import { Knob } from "./Knob.tsx";
import { SynthRack, presetName } from "./SynthRack.tsx";
import { DrumBox } from "./DrumBox.tsx";
import { ContinuoBox } from "./ContinuoBox.tsx";
import { CONTINUO_DISPLAYS, type ContinuoSettings } from "../game/continuo-settings.ts";
import { VERSION_IDS, type VersionId, type Versions } from "../game/versions.ts";
import { t } from "./i18n.ts";

interface Props {
  value: SoundState;
  onChange(v: SoundState): void;
  /** Fux's channel is live once the exercise is cleared (it can be set up before). */
  fuxOpen: boolean;
  drums: boolean;
  onDrums(on: boolean): void;
  drumKit: DrumSettings;
  onDrumKit(v: DrumSettings): void;
  onPreviewDrums(): void;
  master: number;
  onMaster(v: number): void;
  tuning: TemperamentId;
  onTuning(v: TemperamentId): void;
  continuo: boolean;
  onContinuo(on: boolean): void;
  continuoSettings: ContinuoSettings;
  onContinuoSettings(v: ContinuoSettings): void;
  /** Versions of the player's line (D47): toggles on the Contrapunctus strip, one strip each. */
  versions: Versions;
  onVersions(v: Versions): void;
  /** Slots in the exercise (the canon's displacement wraps round them). */
  slots: number;
  /** Fux's solution on the score (only once the exercise is cleared). */
  showFux: boolean;
  onShowFux(show: boolean): void;
  /** Fux heard along with the player's lines (his strip's activator, D80). */
  fuxHeard: boolean;
  onFuxHeard(on: boolean): void;
  /** Peak levels for the meters (D80). */
  levels?: () => Partial<Record<Strip | "master", number>>;
  /** Folded to a single line. */
  open: boolean;
  onOpen(open: boolean): void;
}

const VOICES: Channel[] = ["cantus", "counterpoint", "fux"];

/**
 * Mixer & synth: a mixing desk with one strip per voice, the drums, the continuo and the master.
 * Click a strip (anywhere but its controls) to edit it below; chain buttons between voices link
 * their sounds (decision D40). The box folds to one line.
 */
export function SoundDesk(p: Props) {
  const [selected, setSelected] = useState<Strip>("counterpoint");
  const [ask, setAsk] = useState<Link | null>(null);
  const s = p.value;
  // The meters (D80), drawn at animation-frame rate straight into the DOM, with a gentle fall.
  const meterEls = useRef<Partial<Record<Strip | "master", HTMLDivElement | null>>>({});
  const held = useRef<Partial<Record<string, number>>>({});
  useEffect(() => {
    if (!p.open || !p.levels) return;
    let id = 0;
    const frame = () => {
      const lv = p.levels!();
      for (const [x, el] of Object.entries(meterEls.current)) {
        if (!el) continue;
        const now = posOfDb(lv[x as Strip] ?? -Infinity);
        const shown = Math.max(now, (held.current[x] ?? 0) - 0.02);
        held.current[x] = shown;
        el.style.height = `${(1 - shown) * 100}%`;
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [p.open, p.levels]);

  const toggleVersion = (k: "original" | VersionId) => {
    const next = { ...p.versions, [k]: !p.versions[k] };
    // Something is always heard: switching the last line off brings the original back.
    if (!next.original && !VERSION_IDS.some((id) => next[id])) next.original = true;
    p.onVersions(next);
  };
  const canonStepper = (
    <div className="octave canon-shift" title={t("ui.mixer.canonShift", { n: p.versions.canonShift })}>
      <button className="chipbtn" tabIndex={-1} disabled={!p.versions.canon || p.versions.canonShift <= 0} onClick={() => p.onVersions({ ...p.versions, canonShift: p.versions.canonShift - 1 })} aria-label={t("ui.mixer.canonEarlier")}>‹</button>
      <span>C+{p.versions.canonShift}</span>
      <button className="chipbtn" tabIndex={-1} disabled={!p.versions.canon || p.versions.canonShift >= p.slots - 1} onClick={() => p.onVersions({ ...p.versions, canonShift: p.versions.canonShift + 1 })} aria-label={t("ui.mixer.canonLater")}>›</button>
    </div>
  );
  /** Octave transposition of a line in playback, -3..3 (Fux's, and each version's: D66). */
  const octaveStepper = (n: number, set: (n: number) => void) => (
    <div className="octave" title={t("ui.mixer.octaveHelp")}>
      <button className="chipbtn" tabIndex={-1} disabled={n <= -3} onClick={() => set(n - 1)} aria-label={t("ui.mixer.octaveDown")}>‹</button>
      <span>{t("ui.mixer.octave", { n: n > 0 ? `+${n}` : String(n) })}</span>
      <button className="chipbtn" tabIndex={-1} disabled={n >= 3} onClick={() => set(n + 1)} aria-label={t("ui.mixer.octaveUp")}>›</button>
    </div>
  );
  // Track colours (D80): one per strip, as in Ableton's mixer; the voices' match their inks.
  const COLOR: Record<Strip | "master", string> = {
    cantus: "var(--trk-cantus)", counterpoint: "var(--trk-counterpoint)", fux: "var(--trk-fux)",
    inversion: "var(--trk-inversion)", retrograde: "var(--trk-retrograde)", retroInversion: "var(--trk-retro-inversion)", canon: "var(--trk-canon)",
    drums: "var(--trk-drums)", continuo: "var(--trk-continuo)", master: "var(--trk-master)",
  };
  const ORDER: Strip[] = ["cantus", "counterpoint", "fux", ...VERSION_IDS, "drums", "continuo"];
  /** The track activator (D80): every track switches on and off with one press. */
  const active = (x: Strip): boolean =>
    x === "cantus" ? !s.mix.cantus.mute
    : x === "counterpoint" ? p.versions.original
    : x === "fux" ? p.fuxOpen && p.fuxHeard
    : x === "drums" ? p.drums
    : x === "continuo" ? p.continuo
    : p.versions[x as VersionId];
  const activate = (x: Strip) => {
    if (x === "cantus") p.onChange(setMix(s, "cantus", { mute: !s.mix.cantus.mute }));
    else if (x === "counterpoint") toggleVersion("original");
    else if (x === "fux") p.onFuxHeard(!p.fuxHeard);
    else if (x === "drums") p.onDrums(!p.drums);
    else if (x === "continuo") p.onContinuo(!p.continuo);
    else toggleVersion(x as VersionId);
  };
  const strip = (x: Strip) => {
    const m = s.mix[x];
    const isVoice = VOICES.includes(x as Channel);
    const isVersion = VERSION_IDS.includes(x as VersionId);
    const instrument = isVoice || isVersion
      ? (presetName(isVersion ? versionSettings(s, x as VersionId) : s.synth[x as Channel]) ?? t("ui.synth.custom"))
      : x === "drums"
        ? t(`ui.drums.pattern.${patternById(p.drumKit.pattern).id}`)
        : t(`ui.continuo.preset.${p.continuoSettings.preset}`);
    const on = active(x);
    // Clicking anywhere on a strip that is not one of its controls selects it.
    const pick = (e: React.MouseEvent) => {
      if (!(e.target as HTMLElement).closest("button, input, select, .knob, .fader2")) setSelected(x);
    };
    const cd = p.continuoSettings.display;
    return (
      <div key={x} className={`strip ${selected === x ? "selected" : ""} ${on ? "" : "dim"}`} style={{ ["--track" as string]: COLOR[x] }} role="group" aria-label={t(`ui.mixer.${x}`)} onClick={pick}>
        <div className="strip-name" title={t(`ui.mixer.${x}`)}>{t(`ui.mixer.short.${x}`)}</div>
        <button className="instrument" aria-pressed={selected === x} onClick={() => setSelected(x)} title={t("ui.mixer.editHelp")}>
          {instrument}
        </button>
        <Knob id={`pan-${x}`} label={t("ui.mixer.pan")} value={m.pan} min={-1} max={1} defaultValue={0}
          format={(v) => (Math.abs(v) < 0.02 ? "C" : `${v < 0 ? "L" : "R"}${Math.round(Math.abs(v) * 100)}`)} onChange={(v) => p.onChange(setMix(s, x, { pan: v }))} />
        <Fader value={m.volume} label={t("ui.mixer.volume")} color={COLOR[x]} disabled={!on} meterRef={(el) => (meterEls.current[x] = el)} onChange={(v) => p.onChange(setMix(s, x, { volume: v }))} />
        <div className="db-readout">{formatDb(m.volume)}</div>
        <div className="act-row">
          <button className="activator" tabIndex={-1} aria-pressed={on} disabled={x === "fux" && !p.fuxOpen} title={t(x === "fux" && !p.fuxOpen ? "ui.play.locked" : "ui.mixer.activatorHelp")} onClick={() => activate(x)}>
            {ORDER.indexOf(x) + 1}
          </button>
          <button className="solo" tabIndex={-1} aria-pressed={m.solo} title={t("ui.mixer.solo")} onClick={() => p.onChange(setMix(s, x, { solo: !m.solo }))}>S</button>
        </div>
        {x === "fux" && octaveStepper(s.fuxOctave, (n) => p.onChange({ ...s, fuxOctave: n }))}
        {x === "cantus" && octaveStepper(s.cantusOctave, (n) => p.onChange({ ...s, cantusOctave: n }))}
        {x === "counterpoint" && octaveStepper(s.counterpointOctave, (n) => p.onChange({ ...s, counterpointOctave: n }))}
        {isVersion && octaveStepper(s.versionOctave[x as VersionId], (n) => p.onChange({ ...s, versionOctave: { ...s.versionOctave, [x]: n } }))}
        {x === "canon" && canonStepper}
        {x === "fux" && (
          <button className="chipbtn" tabIndex={-1} aria-pressed={p.showFux} disabled={!p.fuxOpen} title={t(p.fuxOpen ? "ui.mixer.fuxScoreHelp" : "ui.play.locked")} onClick={() => p.onShowFux(!p.showFux)}>
            {p.showFux ? t("ui.mixer.fuxHide") : t("ui.mixer.fuxShow")}
          </button>
        )}
        {x === "continuo" && (
          <button
            className="chipbtn bc"
            tabIndex={-1}
            disabled={!p.continuo}
            title={`${t("ui.continuo.display")}: ${t(`ui.continuo.display.${cd}.help`)}`}
            onClick={() => p.onContinuoSettings({ ...p.continuoSettings, display: CONTINUO_DISPLAYS[(CONTINUO_DISPLAYS.indexOf(cd) + 1) % CONTINUO_DISPLAYS.length] })}
          >
            {t(`ui.continuo.display.${cd}.short`)}
          </button>
        )}
      </div>
    );
  };

  const chain = (l: Link) => (
    <button
      key={l}
      className={`chain ${s.links[l] ? "on" : ""}`}
      aria-pressed={s.links[l]}
      title={t(s.links[l] ? "ui.mixer.unlink" : "ui.mixer.link")}
      onClick={() => {
        if (s.links[l]) p.onChange(setLink(s, l, false));
        else if (linkNeedsConfirm(s, l)) setAsk(l);
        else p.onChange(setLink(s, l, true));
      }}
    >
      <svg viewBox="0 0 28 14" width="28" height="14" aria-hidden="true">
        {s.links[l] ? (
          <>
            <rect x="2" y="3" width="13" height="8" rx="4" />
            <rect x="13" y="3" width="13" height="8" rx="4" />
          </>
        ) : (
          <>
            <rect x="0" y="3" width="11" height="8" rx="4" />
            <rect x="17" y="3" width="11" height="8" rx="4" />
          </>
        )}
      </svg>
    </button>
  );

  // A version strip has its own sound (D69): editing it never changes the Contrapunctus.
  const voice = VOICES.includes(selected as Channel) ? (selected as Channel) : null;
  const version = VERSION_IDS.includes(selected as VersionId) ? (selected as VersionId) : null;
  const group = voice ? linkedGroup(s, voice) : [];
  const title = voice ? `${t("ui.synth.title")} · ${group.map((c) => t(`ui.mixer.${c}`)).join(" + ")}` : "";

  if (!p.open)
    return (
      <section className="sound folded" aria-label={t("ui.sound")}>
        <button className="fold" aria-expanded={false} onClick={() => p.onOpen(true)} title={t("ui.sound.unfold")}>▸ {t("ui.sound")}</button>
        <span className="fold-line" aria-hidden="true" />
      </section>
    );
  return (
    <section className="sound" aria-label={t("ui.sound")}>
      <div className="fold-head">
        <button className="fold" aria-expanded={true} onClick={() => p.onOpen(false)} title={t("ui.sound.fold")}>▾ {t("ui.sound")}</button>
      </div>
      <div className="desk">
        {strip("cantus")}
        {chain("cantusCounterpoint")}
        {strip("counterpoint")}
        {chain("counterpointFux")}
        {strip("fux")}
        <span className="desk-gap" />
        {VERSION_IDS.map((id) => strip(id))}
        <span className="desk-gap" />
        {strip("drums")}
        {strip("continuo")}
        <div className="strip master" role="group" aria-label={t("ui.mixer.master")} style={{ ["--track" as string]: COLOR.master }}>
          <div className="strip-name">{t("ui.mixer.master")}</div>
          <button className="chipbtn tuning" tabIndex={-1} onClick={() => p.onTuning(TEMPERAMENTS[(TEMPERAMENTS.indexOf(p.tuning) + 1) % TEMPERAMENTS.length])} title={t("ui.tuning.help")}>
            {t("ui.tuning.label", { name: t(`ui.tuning.${p.tuning}`) })}
          </button>
          <Fader value={p.master / 100} label={t("ui.volume")} color={COLOR.master} meterRef={(el) => (meterEls.current.master = el)} onChange={(v) => p.onMaster(Math.round(Math.min(1, v) * 100))} />
          <div className="db-readout">{formatDb(p.master / 100)}</div>
        </div>
      </div>
      {ask && (
        <div className="confirm" role="alertdialog">
          <span>{t("ui.mixer.linkQuestion", { other: t(`ui.mixer.${linkEnds(ask).find((c) => c !== "counterpoint")}`) })}</span>
          <button className="chipbtn" tabIndex={-1} onClick={() => { p.onChange(setLink(s, ask, true)); setAsk(null); }}>{t("ui.synth.yes")}</button>
          <button className="chipbtn" tabIndex={-1} onClick={() => setAsk(null)}>{t("ui.synth.no")}</button>
        </div>
      )}
      <div className="editor">
        {voice && <SynthRack title={title} value={s.synth[voice]} onChange={(next) => p.onChange(editSynth(s, voice, next))} />}
        {version && (
          <>
            <div className="follows">
              <button className="chipbtn" tabIndex={-1} aria-pressed={s.versionFollows[version]} title={t("ui.synth.followsHelp")} onClick={() => p.onChange(setVersionFollows(s, version, !s.versionFollows[version]))}>
                {t("ui.synth.follows")}
              </button>
            </div>
            <SynthRack title={`${t("ui.synth.title")} · ${t(`ui.mixer.${version}`)}`} value={versionSettings(s, version)} onChange={(next) => p.onChange(editVersionSynth(s, version, next))} />
          </>
        )}
        {selected === "drums" && <DrumBox on={p.drums} onToggle={p.onDrums} value={p.drumKit} onChange={p.onDrumKit} onPreview={p.onPreviewDrums} />}
        {selected === "continuo" && <ContinuoBox on={p.continuo} onToggle={p.onContinuo} value={p.continuoSettings} onChange={p.onContinuoSettings} />}
      </div>
    </section>
  );
}
