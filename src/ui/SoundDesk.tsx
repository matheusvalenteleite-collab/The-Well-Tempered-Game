import { useState } from "react";
import { linkedGroup, linkEnds, linkNeedsConfirm, setLink, setMix, editSynth, type Channel, type Link, type SoundState, type Strip } from "../audio/sound.ts";
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
  const strip = (x: Strip) => {
    const m = s.mix[x];
    const isVoice = VOICES.includes(x as Channel);
    const isVersion = VERSION_IDS.includes(x as VersionId);
    const instrument = isVoice || isVersion
      ? (presetName(s.synth[isVersion ? "counterpoint" : (x as Channel)]) ?? t("ui.synth.custom"))
      : x === "drums"
        ? t(`ui.drums.pattern.${patternById(p.drumKit.pattern).id}`)
        : t(`ui.continuo.preset.${p.continuoSettings.preset}`);
    const dim = (x === "counterpoint" && !p.versions.original) || (isVersion && !p.versions[x as VersionId]) || (x === "fux" && !p.fuxOpen) || (x === "drums" && !p.drums) || (x === "continuo" && !p.continuo);
    // Clicking anywhere on a strip that is not one of its controls selects it.
    const pick = (e: React.MouseEvent) => {
      if (!(e.target as HTMLElement).closest("button, input, select, .knob")) setSelected(x);
    };
    const cd = p.continuoSettings.display;
    return (
      <div key={x} className={`strip ${selected === x ? "selected" : ""} ${dim ? "dim" : ""}`} role="group" aria-label={t(`ui.mixer.${x}`)} onClick={pick}>
        <div className="strip-name">{t(`ui.mixer.${x}`)}</div>
        <button className="instrument" aria-pressed={selected === x} onClick={() => setSelected(x)} title={t("ui.mixer.editHelp")}>
          {instrument}
        </button>
        <input
          className="fader"
          type="range"
          min={0}
          max={1.5}
          step={0.01}
          value={m.volume}
          aria-label={t("ui.mixer.volume")}
          title={`${t("ui.mixer.volume")}: ${Math.round(m.volume * 100)}%`}
          onChange={(e) => p.onChange(setMix(s, x, { volume: Number(e.target.value) }))}
          onDoubleClick={() => p.onChange(setMix(s, x, { volume: 1 }))}
        />
        <Knob id={`pan-${x}`} label={t("ui.mixer.pan")} value={m.pan} min={-1} max={1} defaultValue={0}
          format={(v) => (Math.abs(v) < 0.02 ? "C" : `${v < 0 ? "L" : "R"}${Math.round(Math.abs(v) * 100)}`)} onChange={(v) => p.onChange(setMix(s, x, { pan: v }))} />
        <div className="ms">
          <button className="chipbtn" tabIndex={-1} aria-pressed={m.mute} title={t("ui.mixer.mute")} onClick={() => p.onChange(setMix(s, x, { mute: !m.mute }))}>M</button>
          <button className="chipbtn" tabIndex={-1} aria-pressed={m.solo} title={t("ui.mixer.solo")} onClick={() => p.onChange(setMix(s, x, { solo: !m.solo }))}>S</button>
        </div>
        {x === "fux" && (
          <div className="octave" title={t("ui.mixer.octaveHelp")}>
            <button className="chipbtn" tabIndex={-1} disabled={s.fuxOctave <= -3} onClick={() => p.onChange({ ...s, fuxOctave: s.fuxOctave - 1 })} aria-label={t("ui.mixer.octaveDown")}>‹</button>
            <span>{t("ui.mixer.octave", { n: s.fuxOctave > 0 ? `+${s.fuxOctave}` : String(s.fuxOctave) })}</span>
            <button className="chipbtn" tabIndex={-1} disabled={s.fuxOctave >= 3} onClick={() => p.onChange({ ...s, fuxOctave: s.fuxOctave + 1 })} aria-label={t("ui.mixer.octaveUp")}>›</button>
          </div>
        )}
        {x === "counterpoint" && (
          <div className="versions" role="group" aria-label={t("ui.mixer.versionsHelp")} title={t("ui.mixer.versionsHelp")}>
            {(["original", ...VERSION_IDS] as const).map((k) => (
              <button
                key={k}
                className="chipbtn"
                tabIndex={-1}
                aria-pressed={p.versions[k]}
                title={t(`ui.versions.help.${k}`)}
                onClick={() => toggleVersion(k)}
              >
                {t(`ui.versions.short.${k}`)}
              </button>
            ))}
          </div>
        )}
        {(x === "canon" || x === "counterpoint") && canonStepper}
        {isVersion && (
          <button className="chipbtn" tabIndex={-1} aria-pressed={p.versions[x as VersionId]} onClick={() => toggleVersion(x as VersionId)}>
            {p.versions[x as VersionId] ? t("ui.continuo.on") : t("ui.continuo.off")}
          </button>
        )}
        {x === "fux" && (
          <button className="chipbtn" tabIndex={-1} aria-pressed={p.showFux} disabled={!p.fuxOpen} title={t(p.fuxOpen ? "ui.mixer.fuxScoreHelp" : "ui.play.locked")} onClick={() => p.onShowFux(!p.showFux)}>
            {p.showFux ? t("ui.mixer.fuxHide") : t("ui.mixer.fuxShow")}
          </button>
        )}
        {x === "drums" && (
          <button className="chipbtn" tabIndex={-1} aria-pressed={p.drums} onClick={() => p.onDrums(!p.drums)}>{p.drums ? t("ui.drums.on") : t("ui.drums.off")}</button>
        )}
        {x === "continuo" && (
          <>
            <button className="chipbtn" tabIndex={-1} aria-pressed={p.continuo} onClick={() => p.onContinuo(!p.continuo)}>{p.continuo ? t("ui.continuo.on") : t("ui.continuo.off")}</button>
            <button
              className="chipbtn bc"
              tabIndex={-1}
              disabled={!p.continuo}
              title={`${t("ui.continuo.display")}: ${t(`ui.continuo.display.${cd}.help`)}`}
              onClick={() => p.onContinuoSettings({ ...p.continuoSettings, display: CONTINUO_DISPLAYS[(CONTINUO_DISPLAYS.indexOf(cd) + 1) % CONTINUO_DISPLAYS.length] })}
            >
              {t(`ui.continuo.display.${cd}.short`)}
            </button>
          </>
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

  // A version strip shares the Contrapunctus sound: selecting it edits that synth.
  const voice = VOICES.includes(selected as Channel) ? (selected as Channel) : VERSION_IDS.includes(selected as VersionId) ? "counterpoint" : null;
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
        <div className="strip master" role="group" aria-label={t("ui.mixer.master")}>
          <div className="strip-name">{t("ui.mixer.master")}</div>
          <input className="fader" type="range" min={0} max={100} step={1} value={p.master} aria-label={t("ui.volume")} title={`${t("ui.volume")}: ${p.master}%`} onChange={(e) => p.onMaster(Number(e.target.value))} />
          <button className="chipbtn tuning" tabIndex={-1} onClick={() => p.onTuning(TEMPERAMENTS[(TEMPERAMENTS.indexOf(p.tuning) + 1) % TEMPERAMENTS.length])} title={t("ui.tuning.help")}>
            {t("ui.tuning.label", { name: t(`ui.tuning.${p.tuning}`) })}
          </button>
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
        {selected === "drums" && <DrumBox on={p.drums} onToggle={p.onDrums} value={p.drumKit} onChange={p.onDrumKit} onPreview={p.onPreviewDrums} />}
        {selected === "continuo" && <ContinuoBox on={p.continuo} onToggle={p.onContinuo} value={p.continuoSettings} onChange={p.onContinuoSettings} />}
      </div>
    </section>
  );
}
