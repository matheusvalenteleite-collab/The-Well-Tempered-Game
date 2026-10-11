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
import { Shell } from "./Shell.tsx";
import { WtcPage, type WtcScoreVoice } from "./notation/WtcScore.tsx";
import { pageRows, useRowBars } from "./notation/page-rows.ts";
import { useStudyData } from "../chorale/study-data.ts";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import type { Step } from "../music/pitch.ts";

/** 32nds of a whole note, as the data counts. */
const UNIT = 32;
const VOICE_NAMES = ["soprano", "alto", "tenor", "bass"] as const;
/** The voices' names in their mixer colours (on the controls); the notes are in the page's ink, so that the incidental notes' colours stand out. */
const INK = ["var(--trk-counterpoint)", "var(--trk-second)", "var(--trk-third)", "var(--trk-fux)"];
const NOTE_INK = "#1d1b17";

const CHANNEL = ["counterpoint", "second", "third", "fux"] as const;
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

  const stop = () => {
    audio.stop();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setCursor(-1);
  };
  useEffect(() => () => stop(), []);

  const view = useMemo(() => {
    if (!ch || !data) return null;
    const [num, den] = ch.meter.split("/").map(Number);
    const barUnits = (UNIT * num) / den;
    // The upbeat bar drawn whole: the music starts where the upbeat begins in it.
    const shift = ch.pickup ? barUnits - ch.pickup : 0;
    const quarters = (u: number) => (u + shift) / 8;
    const struck = new Map<string, number>();
    for (const h of ch.harmony) for (const [v, k] of h[4] ?? []) struck.set(`${v}|${h[0]}`, k);
    const cadAt = new Map(ch.cadences.map((c) => [c[0], c]));
    const voices: WtcScoreVoice[] = ch.voices.map((notes, v) => ({
      staff: v < 2 ? 0 : 1,
      ink: NOTE_INK,
      editable: false,
      notes: notes.map(([at, dur, pitch, fermata]) => {
        const kind = layers.incidental ? struck.get(`${v}|${at}`) : undefined;
        // The cadence named over the soprano's note at the phrase end.
        const cad = v === 0 && layers.cadences ? [...cadAt.values()].find((c) => c[0] >= at && c[0] < at + dur) : undefined;
        return {
          pitch,
          at: quarters(at),
          dur: dur / 8,
          // On the outer voices only: on all four they crowd between the staves.
          fermata: Boolean(fermata) && (v === 0 || v === 3),
          ...(kind !== undefined ? { ink: KIND_INK[kind] } : {}),
          ...(cad ? { label: `${t(`chorale.study.cad.${CADENCE_SHORT[cad[1]] ?? "other"}`)} ${cad[2]}`.trim() } : {}),
        };
      }),
    }));
    const under = layers.figures || layers.fundamental
      ? ch.harmony.map(([at, root, chord, figure]) => {
          // The figures stacked as a continuo part prints them (the highest on top), the root below on its own line.
          const fig = layers.figures && figure ? figure.split("/") : [];
          return { at: quarters(at), lines: [...fig, ...Array(3 - Math.min(3, fig.length)).fill(""), layers.fundamental && root ? `${root}${chord}` : ""] };
        })
      : undefined;
    // The page: rows of a few bars.
    const barQ = barUnits / 8;
    const bars = Math.ceil((ch.length + shift) / barUnits);
    const rows = pageRows({ voices, under, barQ, bars, rowBars, cursor, key: String(ch.n), label: (a, z) => t("chorale.study.rowLabel", { n: ch.n, title: ch.title, a: a + (ch.pickup ? 0 : 1), b: z - (ch.pickup ? 1 : 0) }) });
    return { rows, barQ, barUnits, shift };
  }, [ch, data, layers, cursor, rowBars]);

  const play = () => {
    if (playing || !ch || !view) return stop();
    const events: PlayEvent[] = [];
    ch.voices.forEach((notes, v) => {
      if (!heard[v]) return;
      for (const [at, dur, pitch] of notes) events.push({ slot: Math.floor((at + view.shift) / view.barUnits), at: at / UNIT, length: dur / UNIT, cantus: null, counterpoint: null, extra: [{ channel: CHANNEL[v], pitch }] });
    });
    events.sort((a, b) => a.at - b.at);
    if (!events.length) return;
    const whole = audio.barSeconds;
    setPlaying(true);
    const t0 = performance.now();
    timer.current = window.setInterval(() => setCursor(Math.floor((((performance.now() - t0) / 1000 / whole) * UNIT + view.shift) / view.barUnits)), 60);
    void audio.playSequence(events, whole).then(() => stop());
  };

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
            <WtcPage fitWidth rows={view.rows} keySig={MAJOR_BY_SIG[ch.sig] ?? "C"} signature={signatureOf(ch.sig)} time={ch.meter} barQuarters={view.barQ} selected={null} onSlot={() => undefined} />
          ) : (
            <p className="help">{t("ui.loading")}</p>
          )}
        </div>
      }
      transport={
        <div className="controls chorale-controls">
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
                <input type="checkbox" checked={heard[i]} onChange={(e) => { stop(); setHeard(heard.map((x, j) => (j === i ? e.target.checked : x))); }} /> {t(`chorale.study.voice.${v}`)}
              </label>
            ))}
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <button className="icon play" onClick={play} disabled={!ch} aria-label={t("chorale.play")} title={t("chorale.play")}>{playing ? "■" : "▶"}</button>
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
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
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
