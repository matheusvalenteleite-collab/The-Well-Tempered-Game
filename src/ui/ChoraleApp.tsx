/**
 * The chorale mode (docs/chorales/CONCEPT.md, C4), level 1: the cadence plan. The player chooses
 * the chord on which each phrase of one of Kittel's melodies cadences; "Compare" lays each choice
 * beside Kittel's basses, Bach's settings of the tune, and Bach's habit in the same context. No
 * choice is marked wrong: the masters' choices are the feedback.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BACH_REFS, CHORALES, comparePoints, frac, soundingMelody, voiceChord, type PhraseVerdict } from "../chorale/level1.ts";
import { LEVEL2, noteIndices } from "../chorale/level2.ts";
import { LEVEL3, bassPitch } from "../chorale/level3.ts";
import { LEVEL4, POSITIONS, bassChorale, points as points4, realise } from "../chorale/level4.ts";
import { parsePitch } from "../music/pitch.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import type { Mode } from "./Root.tsx";
import { MelodyScore, type MarkerState } from "./notation/MelodyScore.tsx";
import { HFader } from "./HFader.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { Shell } from "./Shell.tsx";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

type Picks = Record<number, (string | null)[]>;

export function ChoraleApp({ onMode }: { onMode(mode: Mode): void }) {
  const [index, setIndex] = useState(() => Math.max(0, CHORALES.findIndex((c) => c.number === stored("wtg.chorale", 1, (v) => typeof v === "number"))));
  const ch = CHORALES[index];
  useEffect(() => store("wtg.chorale", ch.number), [ch.number]);
  type Level = 1 | 2 | 3 | 4;
  const [level, setLevel] = useState<Level>(() => stored<Level>("wtg.choraleLevel", 1, (v) => v === 1 || v === 2 || v === 3 || v === 4));
  const [bassIdx, setBassIdx] = useState(() => stored("wtg.choraleBass", 0, (v) => typeof v === "number" && v >= 0 && v < 9));
  useEffect(() => store("wtg.choraleBass", bassIdx), [bassIdx]);
  useEffect(() => store("wtg.choraleLevel", level), [level]);
  const picksKey = level === 1 ? "wtg.choralePicks" : `wtg.choralePicks${level}`;
  const [picks, setPicksState] = useState<Picks>(() => stored<Picks>(picksKey, {}, (v) => typeof v === "object" && v !== null));
  useEffect(() => setPicksState(stored<Picks>(picksKey, {}, (v) => typeof v === "object" && v !== null)), [picksKey]);
  const setPicks = (v: Picks) => {
    setPicksState(v);
    store(picksKey, v);
  };
  const l2 = level === 3 ? LEVEL3[ch.number] : LEVEL2[ch.number];
  const l4 = LEVEL4[ch.number];
  const bassNo = Math.min(bassIdx, l4.basses.length - 1);
  const l4bass = l4.basses[bassNo];
  /** the points the player decides: phrase ends (level 1), melody notes (levels 2-3), the notes of
   * one of Kittel's basses (level 4) */
  const points = level === 1 ? ch.phrases : level === 4 ? points4(l4bass.notes, l4bass.label) : l2.notes;
  const scoreCh = useMemo(() => (level === 4 ? bassChorale(ch, l4bass.notes) : ch), [level, ch, l4bass]);
  const markerAt = useMemo(() => (level === 4 ? l4bass.notes.map((_, i) => i) : level > 1 ? noteIndices(ch, l2) : undefined), [level, ch, l2, l4bass]);
  const pickKey = level === 4 ? ch.number * 100 + bassNo : ch.number;
  const mine = picks[pickKey] ?? points.map(() => null);
  const [selected, setSelected] = useState(0);
  const [compared, setCompared] = useState<number | null>(null);
  const [tab, setTab] = useState("compare");
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
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
  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.tempo", tempo);
  }, [tempo]);
  useEffect(() => () => stop(), []);

  const showCompare = compared === pickKey;
  const verdicts = useMemo(() => comparePoints(points, mine), [points, mine]);
  const states: MarkerState[] = verdicts.map((v) =>
    !v.chosen ? "empty" : !showCompare ? "chosen" : v.bach.some((b) => b.same) ? "bach" : v.kittel.length ? (level === 4 ? "bach" : "kittel") : level === 4 && v.habitRank === 1 ? "kittel" : "other",
  );
  const done = mine.filter(Boolean).length;

  const choose = (label: string) => {
    const next = [...mine];
    next[selected] = label;
    setPicks({ ...picks, [pickKey]: next });
    if (selected < points.length - 1 && !next[selected + 1]) setSelected(selected + 1);
  };
  const goTo = (i: number) => {
    stop();
    setIndex(i);
    setSelected(0);
  };

  function stop() {
    audio.stop();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setCursor(null);
  }
  /** The melody, with the chosen chord sounding under each fermata (a plain root-position chord). */
  function play(withChords = true) {
    if (playing) return stop();
    const mel = soundingMelody(ch.melody);
    const events: PlayEvent[] = mel.map((n, i) => ({ slot: i, at: n.at, length: n.length, cantus: null, counterpoint: n.pitch }));
    if (withChords && level === 4) {
      // Kittel's bass, and over each note the chosen figure realised in the key
      l4bass.notes.forEach((n, i) => {
        const at = frac(n.offset);
        const end = i + 1 < l4bass.notes.length ? frac(l4bass.notes[i + 1].offset) : frac(ch.length);
        const pos = mine[i];
        const inner = pos ? realise(pos, n.pitch, l4.tonic, l4.mode) : [];
        events.push({ slot: 1000 + i, at, length: end - at, cantus: null, counterpoint: null, extra: [{ channel: "fux" as const, pitch: n.pitch }, ...inner.map((pitch) => ({ channel: "counterpoint" as const, pitch }))] });
      });
    } else if (withChords) {
      // the sounding note each chosen chord goes under: the fermatas (level 1), every note (level 2)
      const at = level === 1 ? mel.filter((n) => n.fermata) : l2.notes.map((n) => mel.find((m) => Math.abs(m.at - frac(n.offset)) < 1e-9));
      let prevBass: number | null = null;
      points.forEach((_, i) => {
        const end = at[i];
        const label = mine[i];
        if (!end || !label) return;
        if (level === 3) {
          // the bass line: each degree in the octave nearest the bass before
          const b = bassPitch(label, l2.tonic, prevBass);
          prevBass = parsePitch(b).midi;
          events.push({ slot: 1000 + i, at: end.at, length: end.length, cantus: null, counterpoint: null, extra: [{ channel: "fux", pitch: b }] });
          return;
        }
        const [bass, ...inner] = voiceChord(label, ch.tonic, end.pitch);
        // the cantus channel holds a whole bar: right for a cadence chord (level 1), too long under
        // every note (level 2), where the bass sounds as long as its melody note
        if (bass && level === 1) events.push({ slot: 1000 + i, at: end.at, length: end.length, cantus: bass, counterpoint: null, extra: inner.map((pitch) => ({ channel: "counterpoint" as const, pitch })) });
        else if (bass) events.push({ slot: 1000 + i, at: end.at, length: end.length, cantus: null, counterpoint: null, extra: [{ channel: "fux" as const, pitch: bass }, ...inner.map((pitch) => ({ channel: "counterpoint" as const, pitch }))] });
      });
    }
    events.sort((a, b) => a.at - b.at);
    const whole = audio.barSeconds;
    setPlaying(true);
    const t0 = performance.now();
    timer.current = window.setInterval(() => setCursor((performance.now() - t0) / 1000 / whole), 60);
    void audio.playSequence(events, whole).then(() => stop());
  }

  const p = level === 1 ? ch.phrases[Math.min(selected, ch.phrases.length - 1)] : null;
  const q = level === 2 || level === 3 ? l2.notes[Math.min(selected, l2.notes.length - 1)] : null;
  const b4 = level === 4 ? l4bass.notes[Math.min(selected, l4bass.notes.length - 1)] : null;
  const choicesNow = p ? p.choices : b4 ? POSITIONS : q!.options;
  const ref = (no: number, bar?: number | string) => {
    const r = BACH_REFS[String(no)];
    const label = `${no}${bar !== undefined ? `/${bar}` : ""}`;
    return r?.scan ? <a key={label} href={r.scan} target="_blank" rel="noreferrer" title={`BWV ${r.bwv}, ${r.title}`}>{label}</a> : <span key={label}>{label}</span>;
  };
  const verdictText = (v: PhraseVerdict, i: number) => {
    const ph = points[i];
    const l1 = level === 1 ? ch.phrases[i] : null;
    const n2 = level === 2 || level === 3 ? l2.notes[i] : null;
    const n4 = level === 4 ? l4bass.notes[i] : null;
    return (
      <li key={i} className={`verdict verdict-${states[i]}`}>
        {l1 ? (
          <>
            <button className="link" onClick={() => setSelected(i)}>{t("chorale.phrase", { n: i + 1, bar: l1.measure })}</button>{" "}
            <span className="muted">{t("chorale.close", { close: l1.melodyClose, pos: t(`chorale.pos.${l1.position}`) })}</span>
          </>
        ) : n4 ? (
          <>
            <button className="link" onClick={() => setSelected(i)}>{t("chorale.bassNote", { n: i + 1, bar: n4.measure })}</button>{" "}
            <span className="muted">{t("chorale.bassUnder", { pitch: n4.pitch, degree: n4.degree, melody: n4.melody ?? "—" })}</span>
          </>
        ) : (
          <>
            <button className="link" onClick={() => setSelected(i)}>{t("chorale.note", { n: i + 1, bar: n2!.measure })}</button>{" "}
            <span className="muted">{t("chorale.degree", { pitch: n2!.pitch, degree: n2!.degree })}</span>
          </>
        )}
        <div>
          {t(level === 1 ? "chorale.yours" : level === 2 ? "chorale.l2.yours" : level === 3 ? "chorale.l3.yours" : "chorale.l4.yours")}: <strong>{v.chosen ?? "—"}</strong>
        </div>
        <div>
          {t("chorale.kittel")}:{" "}
          {v.kittelOptions.map(([c, basses]) => (
            <span key={c} className={c === v.chosen ? "hit" : undefined}>
              <strong>{c}</strong> {basses.join(" ")}{"; "}
            </span>
          ))}
        </div>
        {level !== 4 && (
        <div>
            {t("chorale.bach")}:{" "}
            {v.bach.length ? v.bach.map((b) => (
              <span key={b.no} className={b.same ? "hit" : undefined}>
                <strong>{b.chord}</strong> ({ref(b.no, b.bar)}){" "}
              </span>
            )) : <span className="muted">{t("chorale.noBach")}</span>}
          </div>
        )}
        <div>
          {t(level === 1 ? "chorale.habit" : level === 2 ? "chorale.l2.habit" : level === 3 ? "chorale.l3.habit" : "chorale.l4.habit", { n: ph.habit.n })}:{" "}
          {ph.habit.options.map((o) => (
            <span key={o.chord} className={o.chord === v.chosen ? "hit" : undefined}>
              <strong>{o.chord}</strong> {Math.round((100 * o.count) / Math.max(1, ph.habit.n))}% ({o.examples.map((e) => ref(e.no, e.bar)).reduce<ReactNode[]>((a, x, k) => (k ? [...a, ", ", x] : [x]), [])}){"; "}
            </span>
          ))}
          {v.chosen && v.habitShare === 0 && <em> {t(level === 1 ? "chorale.rare" : "chorale.rare2")}</em>}
        </div>
      </li>
    );
  };

  const agreeBach = verdicts.filter((v) => v.bach.some((b) => b.same)).length;
  const agreeKittel = verdicts.filter((v) => v.kittel.length > 0).length;
  const withBach = verdicts.filter((v) => v.bach.length > 0).length;

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <button className="icon" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={t("ui.nav.prev")}>‹</button>
            <select id="voices" className="sel sel-voices" value="chorale" aria-label={t("ui.nav.voices")} onChange={(e) => { stop(); const v = e.target.value; onMode(v === "chorale" || v === "preludes" ? v : (Number(v) as 2 | 3)); }}>
              <option value={2}>{t("ui.nav.voicesN", { n: 2 })}</option>
              <option value={3}>{t("ui.nav.voicesN", { n: 3 })}</option>
              <option value="chorale">{t("chorale.mode")}</option>
              <option value="preludes">{t("wtcp.mode")}</option>
            </select>
            <select id="level" className="sel sel-species" value={level} aria-label={t("chorale.level")} onChange={(e) => { stop(); setLevel(Number(e.target.value) as Level); setSelected(0); setCompared(null); }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n} disabled={n > 4}>{t(`chorale.level.${n}`)}</option>
              ))}
            </select>
            <select id="exercise" className="sel sel-exercise" value={index} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
              {CHORALES.map((c, k) => (
                <option key={c.number} value={k}>{`${(picks[c.number] ?? []).filter(Boolean).length === (level === 1 ? c.phrases.length : level === 4 ? -1 : (level === 3 ? LEVEL3 : LEVEL2)[c.number].notes.length) ? "● " : ""}${c.number}. ${c.title.replace(/ etc\.$/, "").replace(/ \[etc\.\]$/, "")}`}</option>
              ))}
            </select>
            {level === 4 && (
              <select id="bass" className="sel sel-species" value={bassNo} aria-label={t("chorale.whichBass")} onChange={(e) => { stop(); setBassIdx(Number(e.target.value)); setSelected(0); setCompared(null); }}>
                {l4.basses.map((b, k) => (
                  <option key={b.label} value={k}>{t("chorale.bassN", { label: b.label })}</option>
                ))}
              </select>
            )}
            <button className="icon" onClick={() => goTo(index + 1)} disabled={index === CHORALES.length - 1} aria-label={t("ui.nav.next")}>›</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} />
        </>
      }
      score={
        <div className="score-wrap chorale-score">
          <MelodyScore chorale={scoreCh} picks={mine} selected={selected} states={states} cursor={cursor} onSelect={setSelected} markerAt={markerAt} clef={level === 4 ? "bass" : "treble"} />
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          <div className="group write" role="group" aria-label={t("chorale.choose")}>
            <span className="prompt">{p ? t("chorale.prompt", { n: selected + 1, bar: p.measure }) : b4 ? t("chorale.prompt4", { n: selected + 1, bar: b4.measure, pitch: b4.pitch, melody: b4.melody ?? "—" }) : t(level === 2 ? "chorale.prompt2" : "chorale.prompt3", { n: selected + 1, bar: q!.measure, pitch: q!.pitch })}</span>
            {choicesNow.map((c) => (
              <button key={c} className={mine[selected] === c ? "chord primary" : "chord"} onClick={() => choose(c)}>{c}</button>
            ))}
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={showCompare} disabled={done === 0} onClick={() => { setCompared(showCompare ? null : pickKey); setTab("compare"); }}>
              {t("chorale.compare")}
              {done < points.length && <span className="badge">{points.length - done}</span>}
            </button>
            <button className="btn-edit" onClick={() => { setPicks({ ...picks, [pickKey]: points.map(() => null) }); setCompared(null); setSelected(0); }}>{t("ui.clearAll")}</button>
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <button className="icon play" onClick={() => play(true)} aria-label={t("chorale.play")} title={t("chorale.play")}>{playing ? "■" : "▶"}</button>
            <button onClick={() => play(false)} disabled={playing} title={t("chorale.playMelody")}>{t("chorale.melodyOnly")}</button>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
            </div>
          </div>
        </div>
      }
      summary={showCompare && (
        <div className="eval-summary ok" role="status">
          <span className="verdict">
            {withBach ? t(level === 1 ? "chorale.summary.bach" : "chorale.l2.summary.bach", { n: agreeBach, of: withBach }) + " · " : ""}
            {t(level === 1 ? "chorale.summary.kittel" : level === 4 ? "chorale.l4.summary" : "chorale.l2.summary.kittel", { n: agreeKittel, of: points.length })}
          </span>
          <button className="link" onClick={() => setTab("compare")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={t("chorale.source", { n: ch.number })}
      tabs={[
        {
          id: "compare",
          label: t("chorale.tab.compare"),
          text: true,
          content: showCompare ? <ol className="chorale-verdicts">{verdicts.map(verdictText)}</ol> : <p className="muted">{t("chorale.beforeCompare")}</p>,
        },
        {
          id: "about",
          label: t("chorale.tab.about"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("chorale.about.1")}</p>
              <p>{t("chorale.about.2")}</p>
              <p>{t("chorale.about.3")}</p>
              <p className="muted">{t("chorale.about.4")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
