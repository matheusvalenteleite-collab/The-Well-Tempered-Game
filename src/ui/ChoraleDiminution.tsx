/**
 * Level 6 of the chorale mode, diminution (C19; docs/chorales/CONCEPT.md section 3): one of Bach's
 * chorales with its alto, tenor and bass reduced to chord tones, the soprano as he wrote it. Tap a
 * note of a lower voice and choose how it goes on to the next: a passing note, a neighbour, a
 * suspension, an anticipation (only those its next note allows). "Compare" sets the result beside
 * Bach's own diminution at the same places; an augmented second is a grave warning (C21: nothing is an error).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ModeSelect } from "./ModeSelect.tsx";
import type { Mode } from "./Root.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { HFader } from "./HFader.tsx";
import { TransportButtons } from "./TransportButtons.tsx";
import { CHORALE_CLEFS, setStaffLayout, useStaffLayout } from "./staff-layout.ts";
import { playChorale, prepareChoraleAudio } from "../audio/chorale-performance.ts";
import { Shell } from "./Shell.tsx";
import { WtcPage, type WtcScoreVoice } from "./notation/WtcScore.tsx";
import { pageRows, useRowBars } from "./notation/page-rows.ts";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import { useStudyData } from "../chorale/study-data.ts";
import { augmentedSeconds, bachAs, options, realise, reduce, type Embellishment, type Note } from "../chorale/level6.ts";
import type { Step } from "../music/pitch.ts";

const UNIT = 32;
const VOICES = ["soprano", "alto", "tenor", "bass"] as const;
const INK = { given: "#1d1b17", mine: "#c2410c", bach: "#1e6fd8", grave: "#c4473a" };
const MAJOR_BY_SIG: Record<number, string> = { [-7]: "Cb", [-6]: "Gb", [-5]: "Db", [-4]: "Ab", [-3]: "Eb", [-2]: "Bb", [-1]: "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#" };
const signatureOf = (n: number): Record<Step, number> => {
  const sig: Record<Step, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  const order: Step[] = n > 0 ? ["F", "C", "G", "D", "A", "E", "B"] : ["B", "E", "A", "D", "G", "C", "F"];
  for (let i = 0; i < Math.abs(n); i++) sig[order[i]] += n > 0 ? 1 : -1;
  return sig;
};
type Chosen = Record<number, Record<number, Record<number, Embellishment>>>;
/** A slot id: the voice and the reduced note's index. */
const slotOf = (v: number, i: number) => v * 1000 + i;

export function ChoraleDiminution({ onMode, onTutorial, levelSelect }: { onMode(mode: Mode): void; onTutorial?: () => void; levelSelect: ReactNode }) {
  const data = useStudyData();
  const [number, setNumber] = useState(() => stored("wtg.choraleStudy", 1, (v) => typeof v === "number"));
  useEffect(() => store("wtg.choraleStudy", number), [number]);
  const [all, setAll] = useState<Chosen>(() => stored<Chosen>("wtg.choraleDim", {}, (v) => typeof v === "object" && v !== null));
  useEffect(() => store("wtg.choraleDim", all), [all]);
  const [selected, setSelected] = useState<number | null>(null);
  const [compared, setCompared] = useState<number | null>(null);
  const [showBach, setShowBach] = useState(false);
  const [tab, setTab] = useState("compare");
  const [onlyKittel, setOnlyKittel] = useState(false);
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

  const list = data ? data.chorales.filter((c) => !onlyKittel || c.kittel) : [];
  const ch = data ? data.chorales.find((c) => c.n === number) ?? data.chorales[0] : null;
  const red = useMemo(() => (ch && data ? reduce(ch, data.kinds) : null), [ch, data]);
  const mine = (ch && all[ch.n]) || {};
  const lines: Note[][] = useMemo(() => (red && ch ? red.voices.map((l, v) => (v === 0 ? l : realise(l, mine[v] ?? {}, ch.sig))) : []), [red, ch, mine]);
  const showCompare = ch !== null && compared === ch.n;
  const errors = useMemo(() => (showCompare ? [1, 2, 3].flatMap((v) => augmentedSeconds(lines[v]).map((k) => ({ v, at: lines[v][k][0] }))) : []), [showCompare, lines]);

  const view = useMemo(() => {
    if (!ch || !red) return null;
    const [num, den] = ch.meter.split("/").map(Number);
    const barUnits = (UNIT * num) / den;
    const shift = ch.pickup ? barUnits - ch.pickup : 0;
    const quarters = (u: number) => (u + shift) / 8;
    const shown = showBach ? ch.voices : lines;
    const voices: WtcScoreVoice[] = shown.map((notes, v) => {
      const base = red.voices[v];
      return {
        staff: openScore ? v : v < 2 ? 0 : 1,
        ink: v === 0 ? INK.given : showBach ? INK.bach : INK.given,
        editable: v > 0 && !showBach,
        notes: notes.map(([at, dur, pitch, f]) => {
          // A reduced note keeps its slot (it starts where it did); an added note is the player's colour.
          const i = base.findIndex((b) => b[0] === at);
          const added = !showBach && v > 0 && i < 0;
          const bad = errors.some((e) => e.v === v && e.at === at);
          return { pitch, at: quarters(at), dur: dur / 8, fermata: Boolean(f) && (openScore || v === 0 || v === 3), ...(i >= 0 && v > 0 && !showBach ? { slot: slotOf(v, i) } : {}), ...(bad ? { ink: INK.grave } : added ? { ink: INK.mine } : {}) };
        }),
      };
    });
    const bars = Math.ceil((ch.length + shift) / barUnits);
    const rows = pageRows({ voices, barQ: barUnits / 8, bars, rowBars, cursor, key: `${ch.n}-${showBach}`, label: (a, z) => t("chorale.l6.rowLabel", { n: ch.n, title: ch.title, a: a + (ch.pickup ? 0 : 1), b: z - (ch.pickup ? 1 : 0) }) });
    return { rows, barUnits, shift };
  }, [ch, red, lines, showBach, errors, rowBars, cursor, openScore]);

  const sel = selected === null || !red ? null : { v: Math.floor(selected / 1000), i: selected % 1000 };
  const opts = sel && red ? options(red.voices[sel.v], sel.i) : [];
  const choose = (e: Embellishment | null) => {
    if (!sel || !ch) return;
    const forVoice = { ...(mine[sel.v] ?? {}) };
    if (e) forVoice[sel.i] = e;
    else delete forVoice[sel.i];
    setAll({ ...all, [ch.n]: { ...mine, [sel.v]: forVoice } });
  };
  // P5: through the live loop (tempo applies at once), with a pause; a choice made while it plays,
  // or Bach's original shown, restarts it from the bar under the cursor.
  const play = (from = pausedAt ?? 0, fresh = false) => {
    if (!ch || !view) return;
    if (playing && !fresh) {
      audio.stop();
      setPlaying(false);
      return setPausedAt(Math.max(0, cursor));
    }
    prepareChoraleAudio(audio);
    setPlaying(true);
    setPausedAt(null);
    playChorale(audio, { voices: showBach ? ch.voices : lines, barUnits: view.barUnits, pickup: ch.pickup }, (b) => {
      if (b < 0) return stop();
      setCursor(b);
    }, from);
  };
  const liveKey = JSON.stringify([ch?.n, showBach, mine]);
  const lastLive = useRef(liveKey);
  useEffect(() => {
    if (lastLive.current === liveKey) return;
    lastLive.current = liveKey;
    if (playing) play(Math.max(0, cursor), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);
  const goTo = (n: number) => {
    stop();
    setNumber(n);
    setSelected(null);
    setShowBach(false);
  };
  const idx = list.findIndex((c) => c.n === ch?.n);
  const barOf = (u: number) => (view ? Math.floor((u + view.shift) / view.barUnits) + (ch?.pickup ? 0 : 1) : 0);

  // The comparison with Bach, place by place.
  const compare = useMemo(() => {
    if (!red || !showCompare) return null;
    const bachAt = new Map<number, { kind: Embellishment | null; raw: string; pitch: string | null }>();
    for (const p of red.bach) bachAt.set(slotOf(p.voice, p.index), { kind: bachAs(p, red.voices[p.voice]), raw: p.kind, pitch: p.pitch });
    const yours = new Map<number, Embellishment>();
    for (const [v, m] of Object.entries(mine)) for (const [i, e] of Object.entries(m)) if (options(red.voices[+v], +i).includes(e)) yours.set(slotOf(+v, +i), e);
    const places = new Set([...bachAt.keys(), ...yours.keys()]);
    let both = 0;
    let sameKind = 0;
    const rows: { slot: number; yours: Embellishment | null; bach: { kind: Embellishment | null; raw: string; pitch: string | null } | null }[] = [];
    for (const s of [...places].sort((a, b) => red.voices[Math.floor(a / 1000)][a % 1000][0] - red.voices[Math.floor(b / 1000)][b % 1000][0] || a - b)) {
      const y = yours.get(s) ?? null;
      const b = bachAt.get(s) ?? null;
      if (y && b) {
        both++;
        if (b.kind === y) sameKind++;
      }
      rows.push({ slot: s, yours: y, bach: b });
    }
    return { rows, both, sameKind, yours: yours.size, bach: bachAt.size };
  }, [red, mine, showCompare]);

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <button className="icon" onClick={() => idx > 0 && goTo(list[idx - 1].n)} disabled={idx <= 0} aria-label={t("ui.nav.prev")}>‹</button>
            <ModeSelect value="chorale" onMode={(m) => { stop(); onMode(m); }} />
            {levelSelect}
            <select id="exercise" className="sel sel-exercise" value={ch?.n ?? 1} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("chorale.study.choose")} disabled={!data}>
              {list.map((c) => (
                <option key={c.n} value={c.n}>{`${all[c.n] && Object.values(all[c.n]).some((m) => Object.keys(m).length) ? "● " : ""}${c.n}. ${c.title} (BWV ${c.bwv})`}</option>
              ))}
            </select>
            <button className="icon" onClick={() => idx >= 0 && idx < list.length - 1 && goTo(list[idx + 1].n)} disabled={idx < 0 || idx >= list.length - 1} aria-label={t("ui.nav.next")}>›</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} onTutorial={onTutorial} />
        </>
      }
      score={
        <div className="score-wrap chorale-score">
          {ch && view ? (
            <WtcPage fitWidth clefs={openScore ? CHORALE_CLEFS : undefined} rows={view.rows} keySig={MAJOR_BY_SIG[ch.sig] ?? "C"} signature={signatureOf(ch.sig)} time={ch.meter} barQuarters={view.barUnits / 8} selected={selected} onSlot={(s) => !showBach && setSelected(s)} />
          ) : (
            <p className="help">{t("ui.loading")}</p>
          )}
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          <div className="group write" role="group" aria-label={t("chorale.l6.choose")}>
            <span className="prompt">
              {sel && red && ch ? t("chorale.l6.prompt", { voice: t(`chorale.l6.voice.${VOICES[sel.v]}`), bar: barOf(red.voices[sel.v][sel.i][0]) }) : t("chorale.l6.promptNone")}
            </span>
            {sel && (
              <>
                <button className={!mine[sel.v]?.[sel.i] ? "chord primary" : "chord"} onClick={() => choose(null)}>{t("chorale.l6.none")}</button>
                {opts.map((e) => (
                  <button key={e} className={mine[sel.v]?.[sel.i] === e ? "chord primary" : "chord"} onClick={() => choose(e)}>{t(`chorale.l6.emb.${e}`)}</button>
                ))}
                {opts.length === 0 && <span className="help">{t("chorale.l6.noOptions")}</span>}
              </>
            )}
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={showCompare} disabled={!ch} onClick={() => { if (ch) setCompared(showCompare ? null : ch.n); setTab("compare"); }}>{t("chorale.l6.compare")}</button>
            <label className="check">
              <input type="checkbox" checked={showBach} onChange={(e) => { setShowBach(e.target.checked); setSelected(null); }} /> {t("chorale.l6.showBach")}
            </label>
            <button className="btn-edit" onClick={() => { if (ch) setAll({ ...all, [ch.n]: {} }); setCompared(null); }}>{t("ui.clearAll")}</button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <span className="play-split">
              <TransportButtons playing={playing} pausedAt={pausedAt} onPlay={() => play()} onStop={stop} label={t("chorale.play")} />
            </span>
            <label className="check" title={t("ui.view.staves.open.help")}>
              <input type="checkbox" checked={openScore} onChange={(e) => setStaffLayout(e.target.checked ? "open" : "compact")} /> {t("ui.view.staves.open")}
            </label>
            <label className="check">
              <input type="checkbox" checked={onlyKittel} onChange={(e) => setOnlyKittel(e.target.checked)} /> {t("chorale.study.onlyKittel")}
            </label>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
          </div>
        </div>
      }
      summary={compare && (
        <div className="eval-summary ok" role="status">
          <span className="verdict">{t("chorale.l6.summary", { yours: compare.yours, bach: compare.bach, both: compare.both, same: compare.sameKind, grave: errors.length })}</span>
          <button className="link" onClick={() => setTab("compare")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={ch ? t("chorale.study.source", { n: ch.n, bwv: ch.bwv }) : ""}
      tabs={[
        {
          id: "compare",
          label: t("chorale.l6.tab.compare"),
          text: true,
          content:
            compare && red ? (
              <div className="chorale-about">
                {errors.length > 0 && <p><strong>{t("chorale.l5.gravity.3")}</strong> {t("chorale.l6.augSecond", { bars: [...new Set(errors.map((e) => barOf(e.at)))].join(", ") })}</p>}
                <ol className="chorale-verdicts">
                  {compare.rows.map((r) => {
                    const v = Math.floor(r.slot / 1000);
                    const i = r.slot % 1000;
                    const state = r.yours && r.bach ? (r.bach.kind === r.yours ? "bach" : "kittel") : r.yours ? "other" : "empty";
                    return (
                      <li key={r.slot} className={`verdict verdict-${state}`}>
                        <button className="link" onClick={() => { setShowBach(false); setSelected(r.slot); }}>{t("chorale.l6.place", { voice: t(`chorale.l6.voice.${VOICES[v]}`), bar: barOf(red.voices[v][i][0]) })}</button>{" "}
                        {t("chorale.l6.yours")}: <strong>{r.yours ? t(`chorale.l6.emb.${r.yours}`) : "—"}</strong> · {t("chorale.l6.bach")}:{" "}
                        <strong>{r.bach ? `${t(`chorale.study.kind.${r.bach.raw}`)}${r.bach.pitch ? ` (${r.bach.pitch})` : ""}` : "—"}</strong>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <p className="muted">{t("chorale.l6.before")}</p>
            ),
        },
        {
          id: "about",
          label: t("chorale.l6.tab.about"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("chorale.l6.about.1")}</p>
              <p>{t("chorale.l6.about.2")}</p>
              <p className="muted">{t("chorale.l6.about.3")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
