/**
 * Three voices (Exercitium II, D90): the player writes both voices that are not the cantus, in
 * any order. One engine and one mixer with the two-voice screen; no versions here (D89).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import data from "../../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { playerStaves, trioSteps, type TrioStep } from "../game/trio.ts";
import { evaluateTrio, type TrioEvaluation } from "../counterpoint/three-voice.ts";
import { applyAccidental, clear, initialState, letterNote, place, select, stepNote, type SessionState } from "../game/session.ts";
import { slotLayout, type PlayEvent } from "../counterpoint/layout.ts";
import { restoreSound, setMix as changeMix, type SoundState } from "../audio/sound.ts";
import { DEFAULT_DRUMS, type DrumSettings } from "../audio/drums.ts";
import { TEMPERAMENTS, type TemperamentId } from "../audio/temperament.ts";
import { DEFAULT_CONTINUO_SETTINGS, validContinuoSettings, type ContinuoSettings } from "../game/continuo-settings.ts";
import { continuoInput, continuoOptions } from "../game/continuo-input.ts";
import { realizeContinuo } from "../continuo/realize.ts";
import { playContinuo } from "../continuo/audio.ts";
import { DEFAULT_VERSIONS, type Versions } from "../game/versions.ts";
import { parsePitch, type Step } from "../music/pitch.ts";
import { TrioScore, type TrioStaff } from "./notation/TrioScore.tsx";
import { ZOOM_MAX, ZOOM_MIN } from "./notation/zoom.ts";
import { SoundDesk, trackOrder } from "./SoundDesk.tsx";
import { Knob } from "./Knob.tsx";
import { audio, store, stored, validDrumKit } from "./shared.ts";
import { t } from "./i18n.ts";
import { Shell } from "./Shell.tsx";
import { ScoreTools } from "./ScoreTools.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import type { NameStyle } from "../music/names.ts";

const STEPS: TrioStep[] = trioSteps(data as never);
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th"];
const stepLabel = (s: TrioStep) => t("ui.trio3.step", { n: s.ordinal, fig: s.figure, final: s.modalFinal, where: t(`ui.trio3.cantus.${s.cantusIndex}`) });

type Sessions = Record<number, SessionState>;
const freshSessions = (s: TrioStep): Sessions => Object.fromEntries(playerStaves(s).map((i) => [i, initialState(s.cantus.length)]));
/** Where a voice starts before anything is written: the middle line of its 1725 clef. */
const startPitch = (s: TrioStep, staff: number) => {
  const m = /^([CFG])(\d)$/.exec(s.clefs1725[staff])!;
  const anchor = { C: "C4", F: "F3", G: "G4" }[m[1] as "C" | "F" | "G"];
  const d = parsePitch(anchor).diatonic + (3 - Number(m[2])) * 2;
  return `${"CDEFGAB"[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`;
};

export function TrioApp({ onVoices }: { onVoices(n: 2 | 3): void }) {
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, STEPS.findIndex((s) => s.id === stored("wtg.trioStep", STEPS[0].id))));
  const STEP = STEPS[stepIndex];
  useEffect(() => store("wtg.trioStep", STEP.id), [STEP.id]);
  const [all, setAll] = useState<Sessions[]>(() => STEPS.map(freshSessions));
  const sessions = all[stepIndex];
  const mine = playerStaves(STEP);
  const [active, setActive] = useState(mine[0]);
  const activeStaff = mine.includes(active) ? active : mine[0];
  const session = sessions[activeStaff];
  const setSessions = (next: Sessions) => setAll((xs) => xs.map((x, i) => (i === stepIndex ? next : x)));
  const [result, setResult] = useState<TrioEvaluation | null>(null);
  const [stars, setStars] = useState<string[]>(() => stored<string[]>("wtg.stars", [], (v) => Array.isArray(v)));
  useEffect(() => store("wtg.stars", stars), [stars]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const fuxOpen = Boolean(result?.passed || unlocked.includes(STEP.id) || stars.includes(STEP.id));

  // Settings shared with the two-voice screen.
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number" && v >= 0 && v <= 100));
  const [sound, setSound] = useState<SoundState>(() => restoreSound(stored<unknown>("wtg.sound2", null)));
  const [look, setLook] = useState<"retro" | "classic">(() => stored("wtg.look", "retro", (v) => v === "retro" || v === "classic"));
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(() => stored("wtg.theme", "auto", (v) => v === "auto" || v === "light" || v === "dark"));
  const [drums, setDrums] = useState(() => stored("wtg.drums", false, (v) => typeof v === "boolean"));
  const [drumKit, setDrumKit] = useState<DrumSettings>(() => validDrumKit(stored<unknown>("wtg.drumkit", DEFAULT_DRUMS)));
  const [continuo, setContinuo] = useState(() => stored("wtg.continuo", false, (v) => typeof v === "boolean"));
  const [continuoSettings, setContinuoSettings] = useState<ContinuoSettings>(() => validContinuoSettings(stored<unknown>("wtg.continuoSettings", DEFAULT_CONTINUO_SETTINGS)));
  const [tuning, setTuning] = useState<TemperamentId>(() => stored("wtg.tuning", "equal" as TemperamentId, (v) => TEMPERAMENTS.includes(v as TemperamentId)));
  const [loop, setLoop] = useState(() => stored("wtg.loop", true, (v) => typeof v === "boolean"));
  const [names, setNames] = useState(() => stored("wtg.names", false, (v) => typeof v === "boolean"));
  const [figures, setFigures] = useState(() => stored("wtg.intervals", false, (v) => typeof v === "boolean"));
  const [zoom, setZoom] = useState(() => stored("wtg.zoom", 1, (v) => typeof v === "number" && v >= ZOOM_MIN && v <= ZOOM_MAX));
  const [fuxHeard, setFuxHeard] = useState(() => stored("wtg.fuxHeard", false, (v) => typeof v === "boolean"));
  const [showFux, setShowFux] = useState(false);
  const [tab, setTab] = useState<string>(() => stored("wtg.dock", "mixer", (v) => typeof v === "string"));
  useEffect(() => store("wtg.dock", tab), [tab]);
  const [nameStyle, setNameStyle] = useState<NameStyle>(() => stored("wtg.nameStyle", "letters" as NameStyle, (v) => v === "letters" || v === "solfege"));
  useEffect(() => store("wtg.nameStyle", nameStyle), [nameStyle]);
  const [versions, setVersions] = useState<Versions>({ ...DEFAULT_VERSIONS, original: true });
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);

  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.tempo", tempo);
  }, [tempo]);
  useEffect(() => {
    audio.setVolume(volume / 100);
    store("wtg.volume", volume);
  }, [volume]);
  useEffect(() => {
    audio.setSoundState(sound);
    store("wtg.sound2", sound);
  }, [sound]);
  useEffect(() => {
    document.documentElement.dataset.look = look;
    store("wtg.look", look);
  }, [look]);
  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    store("wtg.theme", theme);
  }, [theme]);
  useEffect(() => {
    audio.drums = drums;
    store("wtg.drums", drums);
  }, [drums]);
  useEffect(() => {
    audio.setDrums(drumKit, STEP.modalFinal);
    store("wtg.drumkit", drumKit);
  }, [drumKit, STEP.modalFinal]);
  useEffect(() => store("wtg.continuo", continuo), [continuo]);
  useEffect(() => store("wtg.continuoSettings", continuoSettings), [continuoSettings]);
  useEffect(() => {
    audio.temperament = tuning;
    store("wtg.tuning", tuning);
  }, [tuning]);
  useEffect(() => {
    audio.loop = loop;
    store("wtg.loop", loop);
  }, [loop]);
  useEffect(() => store("wtg.names", names), [names]);
  useEffect(() => store("wtg.intervals", figures), [figures]);
  useEffect(() => store("wtg.zoom", zoom), [zoom]);
  useEffect(() => store("wtg.fuxHeard", fuxHeard), [fuxHeard]);
  useEffect(() => {
    audio.setGates({ counterpoint: versions.original, fux: fuxHeard && fuxOpen, continuo });
  }, [versions.original, fuxHeard, fuxOpen, continuo]);
  useEffect(() => () => audio.stop(), []);

  const lines = (k: number) => [0, 1, 2].map((i) => (i === STEP.cantusIndex ? STEP.cantus[k] : sessions[i].notes[k]));
  const missing = mine.reduce((n, i) => n + sessions[i].notes.filter((x) => x === null).length, 0);

  const goTo = (k: number) => {
    if (k < 0 || k >= STEPS.length) return;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setResult(null);
    setShowFux(false);
    setStepIndex(k);
    setActive(playerStaves(STEPS[k])[0]);
  };

  // Editing: every change withdraws the evaluation (as in two voices).
  const update = (staff: number, next: SessionState) => {
    setSessions({ ...sessions, [staff]: next });
    setResult(null);
  };
  const audition = (k: number, override?: { staff: number; pitch: string | null }) => {
    const ps = lines(k).map((p, i) => (override && i === override.staff ? override.pitch : p));
    const [a, b] = mine.map((i) => ps[i]);
    void audio.playSequence([{ slot: k, at: 0, length: 1, cantus: STEP.cantus[k], counterpoint: a ?? null, extra: b ? [{ channel: "counterpoint", pitch: b }] : [] }]);
  };
  const write = (staff: number, next: SessionState, advance: boolean) => {
    const k = next.selected;
    const bar = advance ? Math.min(STEP.cantus.length - 1, k + 1) : k;
    // Both voices keep the same bar selected.
    setSessions(Object.fromEntries(mine.map((i) => [i, select(i === staff ? next : sessions[i], bar)])));
    setResult(null);
    audition(k, { staff, pitch: next.notes[k] });
  };
  const browse = (k: number) => {
    const bar = Math.max(0, Math.min(STEP.cantus.length - 1, k));
    setSessions(Object.fromEntries(mine.map((i) => [i, select(sessions[i], bar)])));
  };

  const play = (from = 0) => {
    if (playing) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    const n = STEP.cantus.length;
    const fuxLines = mine.map((i) => STEP.fux[i]);
    const events: PlayEvent[] = Array.from({ length: n }, (_, k) => {
      const [a, b] = mine.map((i) => sessions[i].notes[k]);
      return {
        slot: k,
        at: k,
        length: 1,
        cantus: STEP.cantus[k],
        counterpoint: a ?? null,
        fux: fuxOpen ? fuxLines[0][k] : null,
        extra: [...(b ? [{ channel: "counterpoint" as const, pitch: b }] : []), ...(fuxOpen ? [{ channel: "fux" as const, pitch: fuxLines[1][k] }] : [])],
      };
    });
    // The continuo plays under the lines heard: the player's two, or Fux's when only his are on.
    let onCycle: ((startTime: number, fromBeat: number) => void) | undefined;
    if (continuo) {
      const fuxOnly = !versions.original && fuxHeard && fuxOpen;
      const heard = fuxOnly ? fuxLines : mine.map((i) => sessions[i].notes);
      try {
        const view = { species: "first" as const, modalFinal: STEP.modalFinal, cantusVoice: "upper" as const, cantus: STEP.cantus, layout: slotLayout("first", n), fux: null };
        const input = continuoInput(view, heard, "player");
        const realization = realizeContinuo(input, continuoOptions("player", continuoSettings));
        onCycle = (startTime, fromBeat) => {
          const graph = audio.graph;
          const destination = audio.continuoInput();
          if (!graph || !destination) return;
          audio.attach(playContinuo(input, realization, { preset: continuoSettings.preset, audio: { ctx: graph.ctx, destination }, includeSungVoices: false, startTime, fromBeat, getTempo: () => audio.tempo, temperament: tuning, inegal: continuoSettings.inegal && continuoSettings.preset !== "stileAntico" }));
        };
      } catch {
        onCycle = undefined;
      }
    }
    audio.setGates({ counterpoint: versions.original, fux: fuxHeard && fuxOpen, continuo });
    setPlaying(true);
    void audio.playAll(events, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    }, onCycle, from);
  };

  const evaluateNow = () => {
    if (result) return setResult(null);
    if (missing > 0) return;
    const ev = evaluateTrio({ modalFinal: STEP.modalFinal, cantusIndex: STEP.cantusIndex, voices: [0, 1, 2].map((i) => (i === STEP.cantusIndex ? STEP.cantus : (sessions[i].notes as string[]))) });
    setResult(ev);
    setTab("evaluation");
    if (ev.passed) {
      if (!stars.includes(STEP.id)) setStars([...stars, STEP.id]);
      if (!unlocked.includes(STEP.id)) setUnlocked([...unlocked, STEP.id]);
    }
  };

  // Keys (as in two voices), plus Tab for the other voice and F1-F5 for the tracks.
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    const k = e.key;
    const s = session;
    if (/^F[1-5]$/.test(k)) {
      const track = trackOrder(false)[Number(k.slice(1)) - 1];
      if (track === "cantus") setSound(changeMix(sound, "cantus", { mute: !sound.mix.cantus.mute }));
      else if (track === "counterpoint") setVersions({ ...versions, original: !versions.original });
      else if (track === "fux") fuxOpen && setFuxHeard(!fuxHeard);
      else if (track === "drums") setDrums(!drums);
      else if (track === "continuo") setContinuo(!continuo);
    } else if (k === "Tab") setActive(mine[(mine.indexOf(activeStaff) + (e.shiftKey ? mine.length - 1 : 1)) % mine.length]);
    else if (k === "ArrowRight") browse(s.selected + 1);
    else if (k === "ArrowLeft") browse(s.selected - 1);
    else if (k === "ArrowUp" || k === "ArrowDown") write(activeStaff, stepNote(s, (k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 7 : 1), startPitch(STEP, activeStaff)), false);
    else if (/^[a-gA-G]$/.test(k)) write(activeStaff, letterNote(s, k.toUpperCase() as Step, s.notes[s.selected] ?? s.lastWritten ?? startPitch(STEP, activeStaff)), true);
    else if (k === "#") update(activeStaff, applyAccidental(s, 1));
    else if (k === "-") update(activeStaff, applyAccidental(s, -1));
    else if (k === "n") update(activeStaff, applyAccidental(s, 0));
    else if (k === "Delete" || k === "Backspace") update(activeStaff, clear(s));
    else if (k === " ") play(s.selected);
    else if (k === "p" || k === "P") play();
    else return;
    e.preventDefault();
  };
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const marks = useMemo(() => {
    if (!result) return [];
    const out = new Map<number, "error" | "warning">();
    for (const v of result.violations) for (const b of v.positions) if (out.get(b) !== "error") out.set(b, v.severity);
    return [...out].map(([bar, severity]) => ({ bar, severity }));
  }, [result]);

  const staves: TrioStaff[] = [0, 1, 2].map((i) => ({
    clef: STEP.clefs[i],
    notes: i === STEP.cantusIndex ? STEP.cantus : sessions[i].notes,
    editable: i !== STEP.cantusIndex,
    ...(i !== STEP.cantusIndex && showFux && fuxOpen ? { fux: STEP.fux[i] } : {}),
  }));
  const voiceName = (i: number) => t(`ui.trio3.voice.${i}`);
  const describe = (vs: number[]) => vs.map(voiceName).join(", ");
  const errors = result?.errors ?? [];
  const warnings = result?.warnings ?? [];

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
          <button className="icon" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} aria-label={t("ui.nav.prev")}>‹</button>
          <select id="voices" className="sel sel-voices" value={3} aria-label={t("ui.nav.voices")} onChange={(e) => Number(e.target.value) === 2 && (audio.stop(), onVoices(2))}>
            {[2, 3, 4].map((n) => (
              <option key={n} value={n} disabled={n === 4}>{t("ui.nav.voicesN", { n })}</option>
            ))}
          </select>
          <select id="species" className="sel sel-species" value={1} aria-label={t("ui.nav.species")} onChange={() => undefined}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n} disabled={n !== 1}>
                {t("ui.nav.speciesN", { n: ORDINAL[n] })}
                {n === 1 ? ` · ${STEPS.filter((x) => stars.includes(x.id)).length}/${STEPS.length}` : ""}
              </option>
            ))}
          </select>
          <select id="exercise" className="sel sel-exercise" value={stepIndex} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
            {STEPS.map((s, k) => (
              <option key={s.id} value={k}>
                {stars.includes(s.id) ? "★ " : ""}
                {stepLabel(s)}
              </option>
            ))}
          </select>
          <button className="icon" onClick={() => goTo(stepIndex + 1)} disabled={stepIndex === STEPS.length - 1} aria-label={t("ui.nav.next")}>›</button>
        </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("rules")} />
        </>
      }
      score={
        <div className="score-wrap trio" data-notes={JSON.stringify(mine.map((i) => sessions[i].notes))}>
          <span className={stars.includes(STEP.id) ? "star earned" : "star"} aria-label={t(stars.includes(STEP.id) ? "ui.star.earned" : "ui.star.none")}>
            {stars.includes(STEP.id) ? "★" : "☆"}
          </span>
          <TrioScore
            staves={staves}
            active={activeStaff}
            selected={session.selected}
            cursor={cursor}
            marks={marks}
            figures={figures}
            names={names}
            nameStyle={nameStyle}
            label={t("ui.trio3.name", { fig: STEP.figure })}
            onPlace={(staff, bar, natural) => {
              setActive(staff);
              const s = sessions[staff];
              write(staff, place(select(s, bar), bar, natural), false);
            }}
            onSelect={(staff, bar) => {
              if (mine.includes(staff)) setActive(staff);
              browse(bar);
              audition(bar);
            }}
            zoom={zoom}
            onZoom={setZoom}
            zoomLabels={{ in: t("ui.zoom.in"), out: t("ui.zoom.out"), reset: t("ui.zoom.reset") }}
            tools={<ScoreTools view={{ names: names ? nameStyle : "off", intervals: figures }} onView={(v) => { setNames(v.names !== "off"); if (v.names !== "off") setNameStyle(v.names); setFigures(v.intervals); }} fux={{ open: fuxOpen, shown: showFux, onShow: setShowFux }} />}
          />
        </div>
      }
      transport={
        <>
        <p className="trio-writing">
          <strong>{t("ui.trio3.writing", { voice: voiceName(activeStaff) })}</strong>{" "}
          <button className="chipbtn" onClick={() => setActive(mine[(mine.indexOf(activeStaff) + 1) % mine.length])} title={t("ui.trio3.switch")}>{t("ui.trio3.other")} ⇥</button>
        </p>
        <div className="controls">
          <div className="group write" role="group">
            <button onClick={() => update(activeStaff, applyAccidental(session, -1))} aria-label="flat">♭</button>
            <button onClick={() => update(activeStaff, applyAccidental(session, 0))} aria-label="natural">♮</button>
            <button onClick={() => update(activeStaff, applyAccidental(session, 1))} aria-label="sharp">♯</button>
            <button onClick={() => { setSessions(freshSessions(STEP)); setResult(null); }}>{t("ui.clearAll")}</button>
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={result !== null} onClick={evaluateNow} disabled={missing > 0 && !result} title={missing > 0 ? t("ui.evaluate.incomplete", { missing }) : undefined}>
              {t("ui.evaluate")}
              {missing > 0 && !result && <span className="badge">{missing}</span>}
            </button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <div className="play-split">
              <button className="icon play" onClick={() => play()} aria-label={t("ui.play.player")} title={t("ui.play.player")}>{playing ? "■" : "▶"}</button>
              <button className="loop" aria-pressed={loop} onClick={() => setLoop(!loop)} aria-label={t("ui.loop")} title={t(loop ? "ui.loop.on" : "ui.loop.off")}>⟲</button>
            </div>
            <Knob id="tempo" label={t("ui.tempo")} value={tempo} min={30} max={240} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            <Knob id="volume" label={t("ui.volume")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
          </div>
        </div>
        </>
      }
      summary={result && (
        <div className={result.passed ? "eval-summary ok" : "eval-summary bad"} role="status">
          <span className="verdict">{result.passed ? `✓ ${t("ui.summary.passed")}` : `✗ ${t("ui.summary.failed", { n: result.errors.length })}`}</span>
          <button className="link" onClick={() => setTab("evaluation")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={`J. J. Fux, Gradus ad Parnassum (Vienna, 1725), Fux #${STEP.figure}, p. ${STEP.page}. Encoding: Four Score and More / Open Music Theory (Mark Gotham), CC0-1.0.`}
      tabs={[
        { id: "mixer", label: t("ui.dock.mixer"), content: (
          <SoundDesk
          advanced={false}
          open
          onOpen={() => undefined}
          continuo={continuo}
          onContinuo={setContinuo}
          continuoSettings={continuoSettings}
          onContinuoSettings={setContinuoSettings}
          versions={versions}
          onVersions={setVersions}
          slots={STEP.cantus.length}
          showFux={showFux && fuxOpen}
          onShowFux={setShowFux}
          fuxHeard={fuxHeard}
          onFuxHeard={setFuxHeard}
          levels={() => audio.levels()}
          value={sound}
          onChange={setSound}
          fuxOpen={fuxOpen}
          drums={drums}
          onDrums={setDrums}
          drumKit={drumKit}
          onDrumKit={setDrumKit}
          onPreviewDrums={() => !playing && void audio.previewDrums()}
          master={volume}
          onMaster={setVolume}
          tuning={tuning}
          onTuning={setTuning}
        />
        ) },
        { id: "evaluation", text: true, label: t("ui.dock.evaluation"), content: (
          <>
          {result ? (
          <section className="feedback trio-feedback" aria-live="polite">
            <p className={result.passed ? "verdict ok" : "verdict bad"}>{result.passed ? t("ui.trio3.passed") : t("ui.trio3.failed", { n: errors.length })}</p>
            <ul>
              {errors.map((v, i) => (
                <li key={`e${i}`} className="error">
                  <span className="where">{t("ui.trio3.bar", { bars: v.positions.map((p) => p + 1).join("–") })} {t("ui.trio3.voices", { voices: describe(v.voices) })}</span> {t(`hints.${v.messageKey}`)}
                </li>
              ))}
            </ul>
            {warnings.length > 0 && (
              <>
                <h4>{t("ui.trio3.notes")}</h4>
                <ul>
                  {warnings.map((v, i) => (
                    <li key={`w${i}`} className="warning">
                      <span className="where">{t("ui.trio3.bar", { bars: v.positions.map((p) => p + 1).join("–") })} {t("ui.trio3.voices", { voices: describe(v.voices) })}</span> {t(`hints.${v.messageKey}`)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ) : (
          <p className="dock-empty">{t("ui.dock.noEvaluation")}</p>
        )}
          {!fuxOpen && <p className="help">{t("ui.trio3.fuxLocked")}</p>}
          </>
        ) },
        { id: "rules", text: true, label: t("ui.hints"), content: (
          <>
            <blockquote className="tutor" lang="en">
              <span className="speaker">{t("tutor.speaker.aloysius")}.</span> “{t("ui.trio3.intro")}”
              <cite title={t("ui.trio3.introLa")} lang="la">{t("ui.trio3.cite")}</cite>
            </blockquote>
            <p className="help trio-help">{t("ui.trio3.help")}</p>
          </>
        ) },
      ]}
    />
  );
}
