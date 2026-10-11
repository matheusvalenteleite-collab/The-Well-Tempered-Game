/**
 * Bach's settings laid open (C15; the chorale mode's "hear and read", docs/chorales/CONCEPT.md
 * section 5.1): any of the 370 chorales in four voices, heard voice by voice, with what the library
 * reads in it shown on the score at will: the cadences at the fermatas, the figures derived from
 * Bach's voices, the fundamental bass (Kirnberger's reading, C3) and the incidental notes by kind.
 * The readings are the library's, not Bach's text, and the screen says so.
 *
 * Data: data/chorales/study.json (tools/chorales/study_data.py), loaded when the screen opens.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ModeSelect } from "./ModeSelect.tsx";
import type { Mode } from "./Root.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { HFader } from "./HFader.tsx";
import { TransportButtons } from "./TransportButtons.tsx";
import { figureLabel } from "../counterpoint/interval.ts";
import { EnsembleSelect } from "./EnsembleSelect.tsx";
import { CHORALE_CLEFS, setStaffLayout, useStaffLayout } from "./staff-layout.ts";
import { choraleGates, currentReading, fermataLinesOf, fermataWordsOf, planFermatas, playChorale, prepareChoraleAudio, type Chorale } from "../audio/chorale-performance.ts";
import { FermataList, FermataScale, fermataSign, useFermataEdits } from "./FermataEditor.tsx";
import { notesFor, useListeningNotes } from "../chorale/listening-notes.ts";
import { commentaryFor, mergeGuide } from "./chorale-commentary.ts";
import { useFold } from "./FoldControls.tsx";
import { GuideCaption, GuideList, GuideModeSelect, marker, useGuideMode } from "./ListeningGuide.tsx";
import { Shell } from "./Shell.tsx";
import { WtcPage, type WtcScoreVoice, planClefs } from "./notation/WtcScore.tsx";
import { pageRows, useRowBars } from "./notation/page-rows.ts";
import { useStudyData } from "../chorale/study-data.ts";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import type { Step } from "../music/pitch.ts";

/** 32nds of a whole note, as the data counts. */
const UNIT = 32;
const VOICE_NAMES = ["soprano", "alto", "tenor", "bass"] as const;
/** The voices' names in their mixer colours (on the controls); the notes are in the page's ink, so that the incidental notes' colours stand out. */
const INK = ["var(--trk-counterpoint)", "var(--trk-second)", "var(--trk-third)", "var(--trk-fux)"];
const NOTE_INK = "#1d1b17";

/** The incidental notes' colours, by kind (in the order of the data's `kinds`). */
const KIND_INK = ["#1f8a4c", "#2a7fb8", "#c0392b", "#d35400", "#8e44ad", "#b7950b", "#7f8c8d", "#5d4037"];
const MAJOR_BY_SIG: Record<number, string> = { [-7]: "Cb", [-6]: "Gb", [-5]: "Db", [-4]: "Ab", [-3]: "Eb", [-2]: "Bb", [-1]: "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#" };
const signatureOf = (n: number): Record<Step, number> => {
  const sig: Record<Step, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  const order: Step[] = n > 0 ? ["F", "C", "G", "D", "A", "E", "B"] : ["B", "E", "A", "D", "G", "C", "F"];
  for (let i = 0; i < Math.abs(n); i++) sig[order[i]] += n > 0 ? 1 : -1;
  return sig;
};
/** The short name of a cadence class (the library's words, CADENCE-PLANS.md). */
const CADENCE_SHORT: Record<string, string> = {
  "authentic, perfect": "pac",
  "authentic, imperfect": "iac",
  "authentic, dominant inverted (leading tone in the bass)": "inv",
  half: "half",
  "Phrygian half": "phr",
  deceptive: "dec",
  "bass up a fifth: plagal, or a half cadence in another key": "up5",
  "other: bass repeated": "rep",
  "authentic, penultimate inverted": "chg",
  "resting point on a major triad (a half cadence in the key reached?)": "restMaj",
  "resting point on a minor triad": "restMin",
  other: "other",
};

export function ChoraleStudy({ onMode, onTutorial, levelSelect }: { onMode(mode: Mode): void; onTutorial?: () => void; levelSelect: ReactNode }) {
  const data = useStudyData();
  const [number, setNumber] = useState(() => stored("wtg.choraleStudy", 1, (v) => typeof v === "number"));
  useEffect(() => store("wtg.choraleStudy", number), [number]);
  const [layers, setLayers] = useState(() => stored("wtg.choraleLayers", { cadences: true, figures: true, fundamental: false, incidental: true }, (v) => typeof v === "object" && v !== null));
  useEffect(() => store("wtg.choraleLayers", layers), [layers]);
  const [heard, setHeard] = useState([true, true, true, true]);
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
  const [tab, setTab] = useState("phrases");
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const timer = useRef<number | null>(null);
  const [onlyKittel, setOnlyKittel] = useState(false);
  const rowBars = useRowBars();

  const list = data ? data.chorales.filter((c) => !onlyKittel || c.kittel) : [];
  const ch = data ? data.chorales.find((c) => c.n === number) ?? data.chorales[0] : null;

  /** The bar a pause left the playback at (P2, P5): ▶ goes on from there. */
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  // P17: the listening guide (captions while playing, markers, or none).
  const [guideMode, setGuideMode] = useGuideMode();
  const listening = useListeningNotes();
  // P20: the player's fermatas for this chorale; the one chosen on the score; a change re-plans them.
  const [fermataEdits, setFermataEdit] = useFermataEdits(`bach-${number}`);
  const [fermataSel, setFermataSel] = useState<number | null>(null);
  const [replan, setReplan] = useState(0);
  const stop = () => {
    audio.stop();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setCursor(-1);
    setPausedAt(null);
  };
  useEffect(() => () => stop(), []);
  // P5: the engine as the chorales need it (whatever the last screen left), the voices as gates.
  useEffect(() => prepareChoraleAudio(audio, heard), []);
  useEffect(() => audio.setGates(choraleGates(heard)), [heard]);
  const staffLayout = useStaffLayout();
  const openScore = staffLayout === "open";
  // P26: on a phone, the controls but ▶/■ folded behind "Options".
  const fold = useFold();

  const view = useMemo(() => {
    if (!ch || !data) return null;
    const [num, den] = ch.meter.split("/").map(Number);
    const barUnits = (UNIT * num) / den;
    // The chorale as it is performed (P14, P19, P20): its cadences, words, suspensions and the player's fermatas.
    const SUSPENSION = data.kinds.indexOf("suspension");
    const perf: Chorale = {
      voices: ch.voices,
      barUnits,
      pickup: ch.pickup,
      cadences: ch.cadences,
      fermataWords: fermataWordsOf(ch.n),
      suspensions: ch.harmony.flatMap((h) => (h[4] ?? []).filter(([, k]) => k === SUSPENSION).map(([v]) => [h[0], v] as [number, number])),
      fermataEdits,
    };
    const plans = planFermatas(perf, currentReading());
    const fermataWordList = fermataLinesOf(ch.n) ?? [];
    let fk = -1;
    // The upbeat bar drawn whole: the music starts where the upbeat begins in it.
    const shift = ch.pickup ? barUnits - ch.pickup : 0;
    const quarters = (u: number) => (u + shift) / 8;
    const struck = new Map<string, number>();
    for (const h of ch.harmony) for (const [v, k] of h[4] ?? []) struck.set(`${v}|${h[0]}`, k);
    const cadAt = new Map(ch.cadences.map((c) => [c[0], c]));
    // P17: the guide's moments, placed in their bars; the line sung from each phrase start.
    const drawnBar = (u: number) => Math.floor((u + shift) / barUnits);
    const shownBar = (u: number) => drawnBar(u) + (ch.pickup ? 0 : 1);
    const moments = mergeGuide(listening ? notesFor(listening, ch.n) : [], commentaryFor(ch.n, barUnits, ch.pickup)).map((item, index) => ({ item, index, bar: drawnBar(item.at), shown: shownBar(item.at) }));
    const ends = ch.voices[0].filter((n) => n[3]).map((n) => n[0] + n[1]);
    const lines = (fermataLinesOf(ch.n) ?? []).map((item, index) => {
      const at = index ? ends[index - 1] ?? 0 : 0;
      return { item, index, bar: drawnBar(at), shown: shownBar(at) };
    });
    const voices: WtcScoreVoice[] = ch.voices.map((notes, v) => ({
      staff: openScore ? v : v < 2 ? 0 : 1,
      ink: NOTE_INK,
      // P20: the soprano's fermatas answer a tap (they open their choices); nothing else is editable.
      editable: v === 0,
      notes: notes.map(([at, dur, pitch, fermata]) => {
        const k = v === 0 && fermata ? ++fk : -1;
        const kind = layers.incidental ? struck.get(`${v}|${at}`) : undefined;
        // The cadence named over the soprano's note at the phrase end.
        const cad = v === 0 && layers.cadences ? [...cadAt.values()].find((c) => c[0] >= at && c[0] < at + dur) : undefined;
        // P17: the guide's markers over the soprano's note sounding at each moment.
        const marks = v === 0 && guideMode !== "off" ? moments.filter((m) => m.item.at >= at && m.item.at < at + dur).map((m) => marker(m.index)).join("") : "";
        // P20: the fermata's treatment beside its cadence (→ through, ’ breath, // caesura, ×n held).
        const sign = v === 0 && fermata ? fermataSign(plans.find((p) => p.at === at)) : "";
        const label = [marks, cad ? `${t(`chorale.study.cad.${CADENCE_SHORT[cad[1]] ?? "other"}`)} ${cad[2]}`.trim() : "", sign].filter(Boolean).join(" ");
        return {
          pitch,
          at: quarters(at),
          dur: dur / 8,
          // On the outer voices only: on all four they crowd between the staves.
          fermata: Boolean(fermata) && (openScore || v === 0 || v === 3),
          ...(kind !== undefined ? { ink: KIND_INK[kind] } : {}),
          ...(label ? { label } : {}),
          // P20: the fermata's index as the slot a tap reports.
          ...(k >= 0 ? { slot: k } : {}),
        };
      }),
    }));
    const under = layers.figures || layers.fundamental
      ? ch.harmony.map(([at, root, chord, figure]) => {
          // The figures stacked as a continuo part prints them (the highest on top), the root below on its own line.
          const fig = layers.figures && figure ? figure.split("/").map(figureLabel) : [];
          return { at: quarters(at), lines: [...fig, ...Array(3 - Math.min(3, fig.length)).fill(""), layers.fundamental && root ? `${root}${chord}` : ""] };
        })
      : undefined;
    // The page: rows of a few bars.
    const barQ = barUnits / 8;
    const bars = Math.ceil((ch.length + shift) / barUnits);
    const rows = pageRows({ voices, under, barQ, bars, rowBars, cursor, key: String(ch.n), label: (a, z) => t("chorale.study.rowLabel", { n: ch.n, title: ch.title, a: a + (ch.pickup ? 0 : 1), b: z - (ch.pickup ? 1 : 0) }) });
    // P15: one clef plan for the whole chorale, so that the clefs hold across the rows.
    const clefPlan = openScore ? planClefs(voices, CHORALE_CLEFS, barQ) : undefined;
    // One row a soprano fermata (a strict reading plans none: they are sung as written).
    const fermataRows = ch.voices[0].filter((n) => n[3]).map((n, k) => {
      const line = fermataWordList[k];
      return { plan: plans.find((p) => p.at === n[0]), bar: shownBar(n[0]), word: line ? line.split(/\s+/).pop() : null };
    });
    return { rows, barQ, barUnits, shift, clefPlan, moments, lines, perf, fermataRows };
  }, [ch, data, layers, cursor, rowBars, openScore, guideMode, listening, fermataEdits, replan]);

  // P5: through the live loop (tempo and the voices heard apply at once), with a pause.
  const play = () => {
    if (!ch || !view) return;
    if (playing) {
      audio.stop();
      setPlaying(false);
      return setPausedAt(Math.max(0, cursor));
    }
    prepareChoraleAudio(audio, heard);
    setPlaying(true);
    const from = pausedAt ?? 0;
    setPausedAt(null);
    playChorale(audio, view.perf, (b) => {
      if (b < 0) return stop();
      setCursor(b);
    }, from);
  };
  // P20: a fermata changed while the chorale plays: it goes on from the bar it is in, re-planned (D57).
  const restart = useRef<() => void>(() => undefined);
  restart.current = () => {
    if (!playing || !view) return;
    audio.stop();
    playChorale(audio, view.perf, (b) => {
      if (b < 0) return stop();
      setCursor(b);
    }, Math.max(0, cursor));
  };
  useEffect(() => restart.current(), [fermataEdits, replan]);

  // The row playing kept in sight.
  const row = cursor >= 0 ? Math.floor(cursor / rowBars) : -1;
  useEffect(() => {
    if (row >= 0) document.querySelector(".chorale-study .wtc-sys.playing")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [row]);
  const goTo = (n: number) => {
    stop();
    setNumber(n);
  };
  const idx = list.findIndex((c) => c.n === ch?.n);
  const kinds = data?.kinds ?? [];
  const kindCounts = ch ? kinds.map((_, k) => ch.harmony.reduce((a, h) => a + (h[4] ?? []).filter(([, x]) => x === k).length, 0)) : [];
  const barOf = (u: number) => (view ? Math.floor((u + view.shift) / view.barUnits) + (ch?.pickup ? 0 : 1) : 0);

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
                <option key={c.n} value={c.n}>{`${c.n}. ${c.title} (BWV ${c.bwv})${c.kittel ? " · Kittel" : ""}`}</option>
              ))}
            </select>
            <button className="icon" onClick={() => idx >= 0 && idx < list.length - 1 && goTo(list[idx + 1].n)} disabled={idx < 0 || idx >= list.length - 1} aria-label={t("ui.nav.next")}>›</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} onTutorial={onTutorial} />
        </>
      }
      score={
        <div className="score-wrap chorale-score chorale-study">
          {ch && view ? (
            <WtcPage fitWidth clefs={openScore ? CHORALE_CLEFS : undefined} clefPlan={view.clefPlan} rows={view.rows} keySig={MAJOR_BY_SIG[ch.sig] ?? "C"} signature={signatureOf(ch.sig)} time={ch.meter} barQuarters={view.barQ} selected={fermataSel} onSlot={(slot) => { setFermataSel(slot); setTab("fermatas"); }} />
          ) : (
            <p className="help">{t("ui.loading")}</p>
          )}
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          {guideMode === "captions" && view && <GuideCaption moments={view.moments} lines={view.lines} cursor={playing || pausedAt !== null ? Math.max(0, cursor) : -1} />}
          {fold.show && (
            <>
          <div className="group" role="group" aria-label={t("chorale.study.layers")}>
            {(["cadences", "figures", "fundamental", "incidental"] as const).map((k) => (
              <label key={k} className="check" title={t(`chorale.study.layer.${k}.help`)}>
                <input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} /> {t(`chorale.study.layer.${k}`)}
              </label>
            ))}
          </div>
          <div className="group" role="group" aria-label={t("chorale.study.voices")}>
            {VOICE_NAMES.map((v, i) => (
              <label key={v} className="check" style={{ color: INK[i] }}>
                <input type="checkbox" checked={heard[i]} onChange={(e) => setHeard(heard.map((x, j) => (j === i ? e.target.checked : x)))} /> {t(`chorale.study.voice.${v}`)}
              </label>
            ))}
          </div>
            </>
          )}
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <span className="play-split">
              <TransportButtons playing={playing} pausedAt={pausedAt} onPlay={play} onStop={stop} label={t("chorale.play")} />
            </span>
            {fold.button}
            {fold.show && (
              <>
            <EnsembleSelect heard={heard} onReading={() => setReplan((x) => x + 1)} />
            <GuideModeSelect mode={guideMode} onMode={setGuideMode} />
            <label className="check" title={t("ui.view.staves.open.help")}>
              <input type="checkbox" checked={openScore} onChange={(e) => setStaffLayout(e.target.checked ? "open" : "compact")} /> {t("ui.view.staves.open")}
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={onlyKittel}
                onChange={(e) => {
                  setOnlyKittel(e.target.checked);
                  // Kittel's tunes only: from a chorale of another tune, to the first of his.
                  const first = data?.chorales.find((c) => c.kittel);
                  if (e.target.checked && !ch?.kittel && first) goTo(first.n);
                }}
              />{" "}
              {t("chorale.study.onlyKittel")}
            </label>
            <div className="hfaders">
              <FermataScale onChange={() => setReplan((x) => x + 1)} />
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
              </>
            )}
          </div>
        </div>
      }
      tab={tab}
      onTab={setTab}
      idle={ch ? t("chorale.study.source", { n: ch.n, bwv: ch.bwv }) : ""}
      tabs={[
        {
          id: "phrases",
          label: t("chorale.study.tab.phrases"),
          text: true,
          content: ch ? (
            <div className="chorale-about">
              <p>
                {t("chorale.study.keyLine", { tonic: ch.tonic, mode: ch.mode, meter: ch.meter, n: ch.cadences.length })}{" "}
                {ch.scan && <a href={ch.scan} target="_blank" rel="noreferrer">{t("chorale.study.scan")}</a>}
              </p>
              <ol className="chorale-verdicts">
                {ch.cadences.map(([at, cls, deg], i) => (
                  <li key={i}>
                    <strong>{t("chorale.study.phrase", { n: i + 1, bar: barOf(at) })}</strong> {cls}
                    {deg ? ` · ${t("chorale.study.onDegree", { degree: deg })}` : ""}
                  </li>
                ))}
              </ol>
              {ch.kittel && <p className="help">{t("chorale.study.kittel", { list: ch.kittel.join(", ") })}</p>}
            </div>
          ) : null,
        },
        {
          id: "fermatas",
          label: t("fermata.tab"),
          text: true,
          content: view ? <FermataList rows={view.fermataRows} edits={fermataEdits} onEdit={setFermataEdit} selected={fermataSel} onSelect={setFermataSel} /> : null,
        },
        {
          id: "guide",
          label: t("listen.tab"),
          text: true,
          content: view ? <GuideList moments={view.moments} lines={view.lines} /> : null,
        },
        {
          id: "about",
          label: t("chorale.study.tab.about"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("chorale.study.about.1")}</p>
              <p>{t("chorale.study.about.2")}</p>
              <ul className="nct-legend">
                {kinds.map((k, i) => (
                  <li key={k}>
                    <span className="nct-swatch" style={{ background: KIND_INK[i] }} aria-hidden="true" /> <strong>{t(`chorale.study.kind.${k}`)}</strong> ({kindCounts[i] ?? 0}): {t(`chorale.study.kind.${k}.help`)}
                  </li>
                ))}
              </ul>
              <p className="muted">{t("chorale.study.about.3")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
