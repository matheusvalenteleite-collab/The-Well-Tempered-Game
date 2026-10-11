/**
 * Level 5 of the chorale mode, the voices (C17; docs/chorales/CONCEPT.md section 3): over one of
 * Kittel's figured basses and under the melody, the player writes the alto (upper staff) and the
 * tenor (lower staff), one note to each of Kittel's harmonies. "Check" gives warnings of three
 * gravities (C21; nothing is an error), the figure as the task, and Bach's habit in the same
 * context, with his examples.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ModeSelect } from "./ModeSelect.tsx";
import type { Mode } from "./Root.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { HFader } from "./HFader.tsx";
import { TransportButtons } from "./TransportButtons.tsx";
import { EnsembleSelect } from "./EnsembleSelect.tsx";
import { CHORALE_CLEFS, setStaffLayout, useStaffLayout } from "./staff-layout.ts";
import { playChoraleEvents, prepareChoraleAudio } from "../audio/chorale-performance.ts";
import { Shell } from "./Shell.tsx";
import { WtcPage, type WtcScoreVoice } from "./notation/WtcScore.tsx";
import { pageRows, useRowBars } from "./notation/page-rows.ts";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import { BACH_REFS } from "../chorale/level1.ts";
import { HABITS, LEVEL5, compareBach, judge, share, type Finding } from "../chorale/level5.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { parsePitch, type Step } from "../music/pitch.ts";

const UNIT = 32;
const CHORALES = Object.values(LEVEL5).sort((a, b) => a.number - b.number);
const MAJOR_BY_SIG: Record<number, string> = { [-7]: "Cb", [-6]: "Gb", [-5]: "Db", [-4]: "Ab", [-3]: "Eb", [-2]: "Bb", [-1]: "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#" };
const signatureOf = (n: number): Record<Step, number> => {
  const sig: Record<Step, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  const order: Step[] = n > 0 ? ["F", "C", "G", "D", "A", "E", "B"] : ["B", "E", "A", "D", "G", "C", "F"];
  for (let i = 0; i < Math.abs(n); i++) sig[order[i]] += n > 0 ? 1 : -1;
  return sig;
};
const INK = { bach: "#1e6fd8", given: "#1d1b17", alto: "#c04fd8", tenor: "#c2410c" };
/** The warnings' colours by gravity (C21): grave, warning, note. */
const GRAVE_INK: Record<1 | 2 | 3, string> = { 3: "#c4473a", 2: "#d35400", 1: "#b7950b" };
type Written = Record<string, { alto: (string | null)[]; tenor: (string | null)[] }>;

export function ChoraleVoices({ onMode, onTutorial, levelSelect }: { onMode(mode: Mode): void; onTutorial?: () => void; levelSelect: ReactNode }) {
  const [number, setNumber] = useState(() => stored("wtg.chorale", 1, (v) => typeof v === "number"));
  const ch = LEVEL5[number] ?? CHORALES[0];
  useEffect(() => store("wtg.chorale", ch.number), [ch.number]);
  const [bassIdx, setBassIdx] = useState(() => stored("wtg.choraleBass", 0, (v) => typeof v === "number" && v >= 0 && v < 9));
  useEffect(() => store("wtg.choraleBass", bassIdx), [bassIdx]);
  const bassNo = Math.min(bassIdx, ch.basses.length - 1);
  const B = ch.basses[bassNo];
  const n = B.slots.length;
  const key = `${ch.number}-${bassNo}`;
  const [written, setWritten] = useState<Written>(() => stored<Written>("wtg.choraleVoices", {}, (v) => typeof v === "object" && v !== null));
  useEffect(() => store("wtg.choraleVoices", written), [written]);
  const mine = written[key] && written[key].alto.length === n ? written[key] : { alto: Array<string | null>(n).fill(null), tenor: Array<string | null>(n).fill(null) };
  const [selected, setSelected] = useState<number | null>(0);
  /** Bach's setting shown and heard in place of the player's voices and Kittel's bass (C18), by its index, or null. */
  const [bachShown, setBachShown] = useState<number | null>(null);
  const bach = bachShown !== null ? ch.bach[bachShown] ?? null : null;
  const [checked, setChecked] = useState<string | null>(null);
  const [tab, setTab] = useState("check");
  const rowBars = useRowBars();
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.tempo", tempo);
  }, [tempo]);
  const [look, setLook] = useState<"retro" | "classic">(() => stored("wtg.look", "retro", (v) => v === "retro" || v === "classic"));
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(() => stored("wtg.theme", "auto", (v) => v === "auto" || v === "light" || v === "dark"));
  useEffect(() => {
    document.documentElement.dataset.look = look;
    store("wtg.look", look);
  }, [look]);
  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    store("wtg.theme", theme);
  }, [theme]);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const timer = useRef<number | null>(null);
  /** The bar a pause left the playback at (P2, P5): ▶ goes on from there. */
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const stop = () => {
    audio.stop();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setCursor(-1);
    setPausedAt(null);
  };
  useEffect(() => () => stop(), []);
  // P5: the engine as the chorales need it, whatever the last screen left.
  useEffect(() => prepareChoraleAudio(audio), []);
  const openScore = useStaffLayout() === "open";

  const [num, den] = ch.meter.split("/").map(Number);
  const barUnits = (UNIT * num) / den;
  const shift = ch.pickup ? barUnits - ch.pickup : 0;
  const quarters = (u: number) => (u + shift) / 8;
  const showCheck = checked === key;
  const findings = useMemo(() => (showCheck ? judge(B.slots, mine.alto, mine.tenor) : []), [showCheck, B, mine]);
  const worst = useMemo(() => {
    const m = new Map<number, Finding["gravity"]>();
    for (const f of findings) for (const s of f.slots) if (!m.has(s) || f.gravity > m.get(s)!) m.set(s, f.gravity);
    return m;
  }, [findings]);

  const voices: WtcScoreVoice[] = useMemo(() => {
    const slotNotes = (line: (string | null)[], base: number, ink: string) =>
      B.slots.map((s, i) => ({ pitch: line[i], at: quarters(s.at), dur: s.dur / 8, slot: base + i, ...(worst.has(i) && line[i] ? { ink: GRAVE_INK[worst.get(i)!] } : {}) }));
    // P4: one staff a voice (soprano, alto, tenor, bass), or the two staves.
    const [A, T, Bs] = openScore ? [1, 2, 3] : [0, 1, 1];
    const melody = { staff: 0, ink: INK.given, editable: false, notes: ch.melody.map(([at, dur, pitch, f]) => ({ pitch, at: quarters(at), dur: dur / 8, fermata: Boolean(f) })) };
    if (bach) {
      // Bach's alto, tenor and bass, one chord to each melody note his setting matches.
      const part = (v: 0 | 1 | 2) => ch.melody.flatMap(([at, dur], i) => (bach.inner[i] ? [{ pitch: bach.inner[i]![v], at: quarters(at), dur: dur / 8 }] : []));
      return [melody, { staff: A, ink: INK.bach, editable: false, notes: part(0) }, { staff: T, ink: INK.bach, editable: false, notes: part(1) }, { staff: Bs, ink: INK.bach, editable: false, notes: part(2) }];
    }
    return [
      melody,
      { staff: A, ink: INK.alto, editable: true, notes: slotNotes(mine.alto, 0, INK.alto) },
      { staff: T, ink: INK.tenor, editable: true, notes: slotNotes(mine.tenor, n, INK.tenor) },
      { staff: Bs, ink: INK.given, editable: false, notes: B.bass.map(([at, dur, pitch]) => ({ pitch, at: quarters(at), dur: dur / 8 })) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [B, ch, mine, worst, shift, bach, openScore]);
  const under = useMemo(() => (bach ? [] : B.slots.filter((s) => s.printed).map((s) => ({ at: quarters(s.at), lines: s.printed.split("/") }))), [B, shift, bach]);
  const bars = Math.ceil((ch.length + shift) / barUnits);
  const rows = useMemo(
    () => pageRows({ voices, under, barQ: barUnits / 8, bars, rowBars, cursor, key: key, label: (a, z) => t("chorale.l5.scoreLabel", { n: ch.number, title: ch.title, bass: B.label }) + ` (${a + 1}-${z})` }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voices, under, bars, rowBars, cursor, key],
  );

  const write = (slot: number, pitch: string | null) => {
    const voice = slot < n ? "alto" : "tenor";
    const i = slot % n;
    setSelected(slot);
    if (pitch === null) return;
    const line = [...mine[voice]];
    line[i] = pitch;
    setWritten({ ...written, [key]: { ...mine, [voice]: line } });
    const col = [B.slots[i].soprano, voice === "alto" ? pitch : mine.alto[i], voice === "tenor" ? pitch : mine.tenor[i], B.slots[i].bass].filter((x): x is string => !!x);
    // While the chorale plays, the note is heard in it (P5: the playback restarts from its bar); a
    // one-off chord would stop it.
    if (!playing) void audio.playSequence([{ slot: 0, at: 0, length: 0.5, cantus: null, counterpoint: null, extra: col.map((p) => ({ channel: "counterpoint" as const, pitch: p })) }], audio.barSeconds);
    // On to the next empty slot of the same voice.
    if (i + 1 < n) setSelected(slot + 1);
  };
  const alter = (a: -1 | 0 | 1) => {
    if (selected === null) return;
    const voice = selected < n ? "alto" : "tenor";
    const i = selected % n;
    const p = mine[voice][i];
    if (!p) return;
    const q = parsePitch(p);
    const line = [...mine[voice]];
    line[i] = `${q.step}${a === 1 ? "#" : a === -1 ? "b" : ""}${q.octave}`;
    setWritten({ ...written, [key]: { ...mine, [voice]: line } });
  };
  const clearNote = () => {
    if (selected === null) return;
    const voice = selected < n ? "alto" : "tenor";
    const line = [...mine[voice]];
    line[selected % n] = null;
    setWritten({ ...written, [key]: { ...mine, [voice]: line } });
  };
  const barOfUnits = (at: number) => Math.floor((at + shift) / barUnits);
  // P5: through the live loop (tempo applies at once), with a pause; a note written while it plays
  // restarts it from the bar under the cursor.
  const play = (from = pausedAt ?? 0, fresh = false) => {
    if (playing && !fresh) {
      audio.stop();
      setPlaying(false);
      return setPausedAt(Math.max(0, cursor));
    }
    const events: PlayEvent[] = [];
    const ev = (at: number, dur: number, extra: PlayEvent["extra"]) => events.push({ slot: barOfUnits(at), at: at / UNIT, length: dur / UNIT, cantus: null, counterpoint: null, extra });
    for (const [at, dur, pitch] of ch.melody) ev(at, dur, [{ channel: "counterpoint", pitch }]);
    if (bach)
      ch.melody.forEach(([at, dur], i) => {
        const b = bach.inner[i];
        if (b) ev(at, dur, [{ channel: "second", pitch: b[0] }, { channel: "third", pitch: b[1] }, { channel: "fux", pitch: b[2] }]);
      });
    else for (const [at, dur, pitch] of B.bass) ev(at, dur, [{ channel: "fux", pitch }]);
    if (!bach) B.slots.forEach((s, i) => {
      const extra = [mine.alto[i] && { channel: "second" as const, pitch: mine.alto[i]! }, mine.tenor[i] && { channel: "third" as const, pitch: mine.tenor[i]! }].filter((x): x is { channel: "second" | "third"; pitch: string } => !!x);
      if (extra.length) ev(s.at, s.dur, extra);
    });
    prepareChoraleAudio(audio);
    setPlaying(true);
    setPausedAt(null);
    playChoraleEvents(audio, events, (b) => {
      if (b < 0) return stop();
      setCursor(b);
    }, from);
  };
  const liveKey = JSON.stringify([key, mine, bachShown]);
  const lastLive = useRef(liveKey);
  useEffect(() => {
    if (lastLive.current === liveKey) return;
    lastLive.current = liveKey;
    if (playing) play(Math.max(0, cursor), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);
  const goTo = (num: number) => {
    stop();
    setNumber(num);
    setSelected(0);
  };
  const idx = CHORALES.findIndex((c) => c.number === ch.number);
  const done = mine.alto.filter(Boolean).length + mine.tenor.filter(Boolean).length;
  const ref = (no: number, bar: number) => {
    const r = BACH_REFS[String(no)];
    const label = `${no}/${bar}`;
    return r?.scan ? <a key={label} href={r.scan} target="_blank" rel="noreferrer" title={`BWV ${r.bwv}, ${r.title}`}>{label}</a> : <span key={label}>{label}</span>;
  };
  const barOf = (i: number) => Math.floor((B.slots[i].at + shift) / barUnits) + (ch.pickup ? 0 : 1);
  const item = (f: Finding, k: number) => {
    const sh = f.habit ? share(f.habit.table, f.habit.ctx, f.habit.outcome) : null;
    const commonest = f.habit ? HABITS[f.habit.table][f.habit.ctx]?.options[0] : undefined;
    return (
      <li key={k} className={`verdict verdict-grave${f.gravity}`}>
        <button className="link" onClick={() => setSelected(f.slots[0])}>{t("chorale.l5.at", { bar: barOf(f.slots[0]) })}</button>{" "}
        <strong>{t(`chorale.l5.gravity.${f.gravity}`)}</strong> {t(`chorale.l5.${f.key}`, f.vars)}
        {sh && (
          <div className="muted">
            {t("chorale.l5.bach", { k: sh.k, n: sh.n })} {sh.examples.length > 0 && <>({sh.examples.map(([no, bar]) => ref(no, bar)).reduce<ReactNode[]>((a, x, i) => (i ? [...a, ", ", x] : [x]), [])})</>}
            {commonest && commonest[0] !== f.habit!.outcome && (
              <> {t("chorale.l5.commonest", { outcome: commonest[0], k: commonest[1] })} ({commonest[2].map(([no, bar]) => ref(no, bar)).reduce<ReactNode[]>((a, x, i) => (i ? [...a, ", ", x] : [x]), [])})</>
            )}
          </div>
        )}
      </li>
    );
  };
  const grave = findings.filter((f) => f.gravity === 3).length;
  const warnings = findings.filter((f) => f.gravity === 2).length;
  const notes = findings.filter((f) => f.gravity === 1).length;
  const sel = selected === null ? null : { voice: selected < n ? "alto" : "tenor", bar: barOf(selected % n) };

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <button className="icon" onClick={() => idx > 0 && goTo(CHORALES[idx - 1].number)} disabled={idx <= 0} aria-label={t("ui.nav.prev")}>‹</button>
            <ModeSelect value="chorale" onMode={(m) => { stop(); onMode(m); }} />
            {levelSelect}
            <select id="exercise" className="sel sel-exercise" value={ch.number} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
              {CHORALES.map((c) => (
                <option key={c.number} value={c.number}>{`${c.number}. ${c.title.replace(/ etc\.$/, "").replace(/ \[etc\.\]$/, "")}`}</option>
              ))}
            </select>
            <select id="bass" className="sel sel-species" value={bassNo} aria-label={t("chorale.whichBass")} onChange={(e) => { stop(); setBassIdx(Number(e.target.value)); setSelected(0); }}>
              {ch.basses.map((b, k) => (
                <option key={b.label} value={k}>{t("chorale.bassN", { label: b.label })}</option>
              ))}
            </select>
            <button className="icon" onClick={() => idx < CHORALES.length - 1 && goTo(CHORALES[idx + 1].number)} disabled={idx >= CHORALES.length - 1} aria-label={t("ui.nav.next")}>›</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} onTutorial={onTutorial} />
        </>
      }
      score={
        <div className="score-wrap chorale-score">
          <WtcPage fitWidth clefs={openScore ? CHORALE_CLEFS : undefined} autoClefs={openScore} rows={rows} keySig={MAJOR_BY_SIG[ch.sig] ?? "C"} signature={signatureOf(ch.sig)} time={ch.meter} barQuarters={barUnits / 8} selected={selected} onSlot={write} />
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          <div className="group write" role="group" aria-label={t("chorale.l5.write")}>
            <span className="prompt">{sel ? t("chorale.l5.prompt", { voice: t(`chorale.l5.voice.${sel.voice}`), bar: sel.bar }) : t("chorale.l5.promptNone")}</span>
            <button className="btn-acc" onClick={() => alter(-1)} aria-label={t("chorale.l5.flat")}>♭</button>
            <button className="btn-acc" onClick={() => alter(0)} aria-label={t("chorale.l5.natural")}>♮</button>
            <button className="btn-acc" onClick={() => alter(1)} aria-label={t("chorale.l5.sharp")}>♯</button>
            <button onClick={clearNote}>{t("chorale.l5.clearNote")}</button>
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={showCheck} disabled={done === 0} onClick={() => { setChecked(showCheck ? null : key); setTab("check"); }}>
              {t("chorale.l5.check")}
              {done < 2 * n && <span className="badge">{2 * n - done}</span>}
            </button>
            <button className="btn-edit" onClick={() => { setWritten({ ...written, [key]: { alto: Array(n).fill(null), tenor: Array(n).fill(null) } }); setChecked(null); setSelected(0); }}>{t("ui.clearAll")}</button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <span className="play-split">
              <TransportButtons playing={playing} pausedAt={pausedAt} onPlay={() => play()} onStop={stop} label={t("chorale.play")} />
            </span>
            <EnsembleSelect />
            <label className="check" title={t("ui.view.staves.open.help")}>
              <input type="checkbox" checked={openScore} onChange={(e) => setStaffLayout(e.target.checked ? "open" : "compact")} /> {t("ui.view.staves.open")}
            </label>
            {ch.bach.length > 0 && (
              <select className="sel" value={bachShown ?? ""} aria-label={t("chorale.l5.bachShow")} title={t("chorale.l5.bachShowHelp")} onChange={(e) => { setBachShown(e.target.value === "" ? null : Number(e.target.value)); }}>
                <option value="">{t("chorale.l5.yours")}</option>
                {ch.bach.map((b, k) => (
                  <option key={b.no} value={k}>{t("chorale.l5.bachN", { no: b.no, bwv: b.bwv })}</option>
                ))}
              </select>
            )}
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
          </div>
        </div>
      }
      summary={showCheck && (
        <div className="eval-summary ok" role="status">
          <span className="verdict">{t("chorale.l5.summary", { grave, warnings, notes })}</span>
          <button className="link" onClick={() => setTab("check")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={t("chorale.source", { n: ch.number })}
      tabs={[
        {
          id: "check",
          label: t("chorale.l5.tab.check"),
          text: true,
          content: (
            <>
              {showCheck ? (findings.length ? <ol className="chorale-verdicts">{findings.map(item)}</ol> : <p>{t("chorale.l5.clean")}</p>) : <p className="muted">{t("chorale.l5.before")}</p>}
              {showCheck && ch.bach.length > 0 && (
                <div className="chorale-about">
                  <h4>{t("chorale.l5.bachTitle")}</h4>
                  {ch.bach.map((b, k) => {
                    const c = compareBach(ch, B.slots, mine.alto, mine.tenor, b);
                    return (
                      <p key={b.no}>
                        <button className="link" onClick={() => setBachShown(k)}>{t("chorale.l5.bachN", { no: b.no, bwv: b.bwv })}</button>{" "}
                        {t("chorale.l5.bachCompare", { aligned: c.aligned, sameBass: c.sameBass, same: c.same })}
                        {c.differ.length > 0 && <> {t("chorale.l5.bachDiffer", { bars: [...new Set(c.differ.map(barOf))].join(", ") })}</>}
                      </p>
                    );
                  })}
                </div>
              )}
            </>
          ),
        },
        {
          id: "about",
          label: t("chorale.l5.tab.about"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("chorale.l5.about.1")}</p>
              <p>{t("chorale.l5.about.2")}</p>
              <p className="muted">{t("chorale.l5.about.3")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
