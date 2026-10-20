/**
 * P44: Contrapunctus XIV (the unfinished fugue of the Art of Fugue) for pianists practising it four
 * hands, one voice to each hand: primo RH soprano, primo LH alto, secondo RH tenor, secondo LH bass
 * (the owner's choice). The score with the subjects marked and coloured, editorial fingering,
 * articulation and dynamics (each switchable), the places where the hands meet, and playback to
 * practise with: either player's part alone or the other's ("play along"), any voices, a passage
 * looped, slow tempi, the subjects brought out. Data: data/aotf/cp14.json and cp14-analysis.json
 * (tools/aotf/).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import piece from "../../data/aotf/cp14.json" with { type: "json" };
import analysisData from "../../data/aotf/cp14-analysis.json" with { type: "json" };
import { audio } from "../ui/shared.ts";
import { WtcPage, planClefs, type WtcScoreVoice } from "../ui/notation/WtcScore.tsx";
import { pageRows } from "../ui/notation/page-rows.ts";
import { HFader } from "../ui/HFader.tsx";
import { choraleEvents, choraleGates, ENSEMBLES, playChoraleEvents, prepareChoraleAudio, setPerformanceDynamics, type Chorale, type ChoraleNote, type Ensemble } from "../audio/chorale-performance.ts";
import { t } from "../ui/i18n.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";

type Note = [number, number, string];
interface Entry { subject: "I" | "II" | "III"; form: "prime" | "inverted"; voice: number; from: number; to: number; at: number; end: number; bar: number; beat: number; notes: string[] }
interface Encounter { kind: "between" | "primo" | "secondo"; start: number; end: number; whats: string[]; min: number; bar: number; beat: number; toBar: number; advice: string }
interface Section { from: number; bar: number; title: string; text: string }
interface Analysis { entries: Entry[]; encounters: Encounter[]; fingers: number[][]; keyFingers: boolean[][]; artic: (string | null)[][]; sections: Section[]; dynamics: { bar: number; level: string; voices: number }[] }

const P = piece as unknown as { title: string; bars: number; end: number; voices: Note[][]; source: string };
const A = analysisData as unknown as Analysis;
const BAR = 32;
const HANDS = ["Primo RH", "Primo LH", "Secondo RH", "Secondo LH"];
const VOICE = ["soprano", "alto", "tenor", "bass"];
const INK = ["#2c4f9e", "#1d6b66", "#8a5a12", "#9a2a3a"];
const FAINT = ["#8fa3cf", "#86b3ae", "#c6a77a", "#cf929c"];
const SUBJECT_INK: Record<string, string> = { I: "#c0392b", II: "#1e7d4a", III: "#6b3fa0" };
const SUBJECT_NAME: Record<string, string> = { I: "Subject I", II: "Subject II", III: "B-A-C-H" };
const KIND: Record<string, string> = { between: "Primo LH and secondo RH", primo: "Primo's hands", secondo: "Secondo's hands" };
const WHAT: Record<string, string> = { cross: "cross", unison: "same key", second: "a second apart" };

const KEY = "wtg.cp14.";
const load = <T,>(k: string, d: T, ok: (v: unknown) => boolean): T => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY + k) ?? "null");
    return v !== null && ok(v) ? (v as T) : d;
  } catch {
    return d;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(KEY + k, JSON.stringify(v));
  } catch {
    // not kept
  }
};
function useStored<T>(k: string, d: T, ok: (v: unknown) => boolean): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => load(k, d, ok));
  return [v, (x: T) => { setV(x); save(k, x); }];
}
const isBool = (v: unknown) => typeof v === "boolean";

/** For each voice, the entry each note belongs to (or -1). */
const entryOf: number[][] = P.voices.map((v) => v.map(() => -1));
A.entries.forEach((e, i) => {
  for (let k = e.from; k <= e.to; k++) entryOf[e.voice][k] = i;
});

/** The notes of bars [a, b) as a chorale starting at 0 (for a looped passage). */
function passage(a: number, b: number, voices: readonly (readonly ChoraleNote[])[]): Chorale {
  const from = a * BAR;
  const to = b * BAR;
  return { barUnits: BAR, pickup: 0, voices: voices.map((v) => v.filter((n) => n[0] >= from && n[0] < to).map((n): ChoraleNote => [n[0] - from, Math.min(n[1], to - n[0]), n[2]])) };
}

/** Bars to a system: six on a wide screen, four on a narrower one, two on a phone. */
function useRowBars(): number {
  const pick = () => (window.innerWidth >= 1100 ? 6 : window.innerWidth >= 700 ? 4 : 2);
  const [n, setN] = useState(pick);
  useEffect(() => {
    const on = () => setN(pick());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
}

/** The first onset in a bar (where the text under the staves can stand). */
const firstOnset = (bar: number) => Math.min(...P.voices.flatMap((v) => v.filter((n) => n[0] >= (bar - 1) * BAR && n[0] < bar * BAR).map((n) => n[0])));

const barLabel = (bar: number, beat: number) => (beat === 1 ? `bar ${bar}` : `bar ${bar}, beat ${beat}`);

export function Cp14() {
  const rowBars = useRowBars();
  const perPage = rowBars * 3;
  const [page, setPage] = useState(0);
  const pages = Math.ceil(P.bars / perPage);
  const [showFingers, setShowFingers] = useStored<"off" | "key" | "all">("fingers", "key", (v) => ["off", "key", "all"].includes(v as string));
  const [showArtic, setShowArtic] = useStored("artic", true, isBool);
  const [showDyn, setShowDyn] = useStored("dyn", true, isBool);
  const [showSubjects, setShowSubjects] = useStored("subjects", true, isBool);
  const [heard, setHeard] = useStored<boolean[]>("heard", [true, true, true, true], (v) => Array.isArray(v) && v.length === 4);
  const [voicing, setVoicing] = useStored("voicing", true, isBool);
  const [tempo, setTempo] = useStored("tempo", 48, (v) => typeof v === "number" && v >= 20 && v <= 90);
  const [ensemble, setEnsemble] = useStored<string>("ensemble", "clear", (v) => v === "piano" || ENSEMBLES.includes(v as Ensemble));
  const [tab, setTab] = useStored<"guide" | "entries" | "encounters" | "editing">("tab", "guide", (v) => ["guide", "entries", "encounters", "editing"].includes(v as string));
  const [loop, setLoop] = useState<{ a: number; b: number } | null>(null);
  const [fromBar, setFromBar] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const playingRef = useRef(false);

  useEffect(() => {
    audio.tempo = tempo;
  }, [tempo]);
  useEffect(() => {
    prepareChoraleAudio(audio, heard, ensemble === "piano" ? null : (ensemble as Ensemble));
    // Flat dynamics: the plan is the players' (and marked); the engine's phrase shaping stays off here.
    audio.dynamics = false;
    setPerformanceDynamics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensemble]);
  useEffect(() => {
    audio.setGates(choraleGates(heard, ensemble === "piano" ? null : (ensemble as Ensemble)));
  }, [heard, ensemble]);
  useEffect(() => () => audio.stop(), []);

  const stop = () => {
    playingRef.current = false;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
  };
  /** The events of a chorale, the subjects a little louder than the rest when voicing is on. */
  const events = (c: Chorale, offset: number): PlayEvent[] => {
    const ev = choraleEvents(c);
    if (!voicing) return ev;
    const index = new Map<string, number>();
    P.voices.forEach((v, vi) => v.forEach((n, k) => index.set(`${vi}|${n[0]}`, entryOf[vi][k])));
    const CH = ["counterpoint", "second", "third", "fux"];
    return ev.map((e) => {
      const x = e.extra?.[0];
      if (!x) return e;
      const vi = CH.indexOf(x.channel);
      const inSubject = (index.get(`${vi}|${Math.round(e.at * 32) + offset}`) ?? -1) >= 0;
      return { ...e, db: { [x.channel]: inSubject ? 3 : -2 } };
    });
  };
  const start = (bar0: number) => {
    stop();
    prepareChoraleAudio(audio, heard, ensemble === "piano" ? null : (ensemble as Ensemble));
    audio.dynamics = false;
    audio.tempo = tempo;
    playingRef.current = true;
    setPlaying(true);
    if (loop) {
      const run = () => {
        const c = passage(loop.a - 1, loop.b, P.voices);
        playChoraleEvents(audio, events(c, (loop.a - 1) * BAR), (b) => {
          if (b < 0) {
            if (playingRef.current) run();
          } else {
            setCursor(loop.a - 1 + b);
          }
        }, 0);
      };
      run();
      return;
    }
    const c: Chorale = { barUnits: BAR, pickup: 0, voices: P.voices };
    playChoraleEvents(audio, events(c, 0), (b) => (b < 0 ? stop() : setCursor(b)), bar0 - 1);
  };
  // The page follows the music.
  useEffect(() => {
    if (cursor >= 0) setPage(Math.floor(cursor / perPage));
  }, [cursor, perPage]);

  const goTo = (bar: number, play = false) => {
    setFromBar(bar);
    setPage(Math.floor((bar - 1) / perPage));
    document.querySelector(".cp14-pages")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (play) start(bar);
  };

  const view = useMemo(() => {
    const voices: WtcScoreVoice[] = P.voices.map((v, vi) => ({
      staff: vi,
      ink: INK[vi],
      editable: false,
      notes: v.map(([at, dur, pitch], k) => {
        const e = entryOf[vi][k];
        const ent = e >= 0 ? A.entries[e] : null;
        const f = A.fingers[vi][k];
        const label = showFingers === "all" || (showFingers === "key" && A.keyFingers[vi][k]) ? String(f) : undefined;
        const mark = showSubjects && ent && ent.from === k ? `${SUBJECT_NAME[ent.subject]}${ent.form === "inverted" ? " inv." : ""}` : undefined;
        const ink = showSubjects ? (ent ? SUBJECT_INK[ent.subject] : FAINT[vi]) : INK[vi];
        const artic = showArtic ? (A.artic[vi][k] as "." | "-" | null) : null;
        return { pitch, at: at / 8, dur: dur / 8, ink, ...(label ? { label } : {}), ...(mark ? { mark } : {}), ...(artic ? { artic } : {}) };
      }),
    }));
    const under = showDyn ? A.dynamics.map((d) => ({ at: firstOnset(d.bar) / 8, lines: [d.level] })).filter((u) => Number.isFinite(u.at)) : undefined;
    const sectionAt = new Map(A.sections.map((s) => [s.bar, s.title]));
    const rows = pageRows({ voices, under, barQ: 4, bars: P.bars, rowBars, cursor, key: "cp14", label: (a, z) => `${sectionAt.get(a + 1) ? sectionAt.get(a + 1) + " · " : ""}bars ${a + 1}-${z}` });
    const clefPlan = planClefs(voices, ["treble", "treble", "bass", "bass"], 4);
    return { rows, clefPlan };
  }, [showFingers, showArtic, showDyn, showSubjects, rowBars, cursor]);
  const shown = view.rows.slice(page * 3, page * 3 + 3);

  const playerRole = heard.every(Boolean) ? "all" : heard[0] && heard[1] && !heard[2] && !heard[3] ? "primo" : !heard[0] && !heard[1] && heard[2] && heard[3] ? "secondo" : "custom";
  const section = [...A.sections].reverse().find((s) => s.bar <= (cursor >= 0 ? cursor + 1 : page * perPage + 1));

  return (
    <div className="cp14">
      <header className="cp14-head">
        <h1>Contrapunctus XIV <span className="muted">for four hands</span></h1>
        <p className="muted">J. S. Bach, Die Kunst der Fuge, BWV 1080: the unfinished fugue on three subjects. One voice to each hand.</p>
      </header>

      <section className="cp14-controls">
        <div className="cp14-row">
          <button className="icon play" onClick={() => (playing ? stop() : start(fromBar))} aria-label={playing ? "Stop" : "Play"} title={playing ? "Stop" : loop ? `Loop bars ${loop.a}-${loop.b}` : `Play from bar ${fromBar}`}>
            {playing ? "■" : "▶"}
          </button>
          <label className="cp14-field">
            from bar <input type="number" min={1} max={P.bars} value={fromBar} onChange={(e) => setFromBar(Math.max(1, Math.min(P.bars, Number(e.target.value) || 1)))} />
          </label>
          {loop ? (
            <span className="cp14-loop">
              looping bars {loop.a}-{loop.b} <button className="chipbtn" onClick={() => { setLoop(null); stop(); }}>end loop</button>
            </span>
          ) : (
            <button className="chipbtn" onClick={() => setLoop({ a: fromBar, b: Math.min(P.bars, fromBar + 3) })} title="Repeat four bars from the bar chosen">loop 4 bars</button>
          )}
          <select className="sel" value={ensemble} onChange={(e) => setEnsemble(e.target.value)} aria-label="Sound">
            <option value="clear">{t("chorale.ensemble.clear")}</option>
            <option value="piano">{t("chorale.ensemble.piano")}</option>
            <option value="organ">{t("chorale.ensemble.organ")}</option>
            <option value="strings">{t("chorale.ensemble.strings")}</option>
          </select>
        </div>
        <div className="cp14-row">
          <span className="cp14-group" role="group" aria-label="Who plays">
            <strong>Hear</strong>
            <button className={playerRole === "all" ? "chipbtn on" : "chipbtn"} aria-pressed={playerRole === "all"} onClick={() => setHeard([true, true, true, true])}>both players</button>
            <button className={playerRole === "secondo" ? "chipbtn on" : "chipbtn"} aria-pressed={playerRole === "secondo"} onClick={() => setHeard([false, false, true, true])} title="Hear the secondo and play the primo yourself">secondo only (I play primo)</button>
            <button className={playerRole === "primo" ? "chipbtn on" : "chipbtn"} aria-pressed={playerRole === "primo"} onClick={() => setHeard([true, true, false, false])} title="Hear the primo and play the secondo yourself">primo only (I play secondo)</button>
          </span>
          <span className="cp14-group" role="group" aria-label="Voices heard">
            {HANDS.map((h, k) => (
              <label key={h} className="check" style={{ color: INK[k] }} title={`${h}: ${VOICE[k]}`}>
                <input type="checkbox" checked={heard[k]} onChange={(e) => setHeard(heard.map((x, i) => (i === k ? e.target.checked : x)))} /> {"SATB"[k]}
              </label>
            ))}
          </span>
          <label className="check" title="The subjects 3 dB louder, the other notes 2 dB softer">
            <input type="checkbox" checked={voicing} onChange={(e) => setVoicing(e.target.checked)} /> bring out the subjects
          </label>
          <div className="hfaders">
            <HFader label="𝅗𝅥 =" help="Half notes per minute" value={tempo} min={20} max={90} defaultValue={48} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
          </div>
        </div>
        <div className="cp14-row">
          <span className="cp14-group" role="group" aria-label="Shown in the score">
            <strong>Show</strong>
            <select className="sel" value={showFingers} onChange={(e) => setShowFingers(e.target.value as "off" | "key" | "all")} aria-label="Fingering">
              <option value="key">fingering: where it matters</option>
              <option value="all">fingering: every note</option>
              <option value="off">fingering: off</option>
            </select>
            <label className="check"><input type="checkbox" checked={showArtic} onChange={(e) => setShowArtic(e.target.checked)} /> articulation</label>
            <label className="check"><input type="checkbox" checked={showDyn} onChange={(e) => setShowDyn(e.target.checked)} /> dynamics</label>
            <label className="check"><input type="checkbox" checked={showSubjects} onChange={(e) => setShowSubjects(e.target.checked)} /> subjects in colour</label>
          </span>
        </div>
      </section>

      <div className="cp14-legend">
        {HANDS.map((h, k) => (
          <span key={h}><i style={{ background: INK[k] }} /> {h} · {VOICE[k]}</span>
        ))}
        {showSubjects && (["I", "II", "III"] as const).map((s) => (
          <span key={s}><i style={{ background: SUBJECT_INK[s] }} /> {SUBJECT_NAME[s]}</span>
        ))}
      </div>

      <nav className="cp14-pages">
        <button className="chipbtn" disabled={page === 0} onClick={() => setPage(page - 1)}>◀ {page === 0 ? "start" : `bars ${(page - 1) * perPage + 1}-${page * perPage}`}</button>
        <span>bars {page * perPage + 1}-{Math.min(P.bars, (page + 1) * perPage)} of {P.bars}{section ? ` · ${section.title}` : ""}</span>
        <button className="chipbtn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{page >= pages - 1 ? "end" : `bars ${(page + 1) * perPage + 1}-${Math.min(P.bars, (page + 2) * perPage)}`} ▶</button>
      </nav>
      <div className="cp14-score">
        <WtcPage key={page} fitWidth clefs={["treble", "treble", "bass", "bass"]} clefPlan={view.clefPlan} rows={shown} keySig="F" signature={{ C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: -1 }} time="4/4" barQuarters={4} selected={null} onSlot={() => undefined} />
      </div>

      <nav className="cp14-tabs" role="tablist">
        {(["guide", "entries", "encounters", "editing"] as const).map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className={tab === x ? "chipbtn on" : "chipbtn"} onClick={() => setTab(x)}>
            {{ guide: "Guide", entries: `Subject entries (${A.entries.length})`, encounters: `Where the hands meet (${A.encounters.length})`, editing: "About the markings" }[x]}
          </button>
        ))}
      </nav>
      <section className="cp14-panel">
        {tab === "guide" && <Guide goTo={goTo} />}
        {tab === "entries" && (
          <table className="cp14-table">
            <thead><tr><th>Bar</th><th>Subject</th><th>Hand</th><th>Notes</th><th /></tr></thead>
            <tbody>
              {A.entries.map((e, i) => (
                <tr key={i}>
                  <td>{barLabel(e.bar, e.beat)}</td>
                  <td style={{ color: SUBJECT_INK[e.subject] }}>{SUBJECT_NAME[e.subject]}{e.form === "inverted" ? ", inverted" : ""}</td>
                  <td style={{ color: INK[e.voice] }}>{HANDS[e.voice]} ({VOICE[e.voice]})</td>
                  <td className="muted">{e.notes.slice(0, 8).join(" ")}{e.notes.length > 8 ? " …" : ""}</td>
                  <td><button className="link" onClick={() => goTo(e.bar)}>show</button> <button className="link" onClick={() => goTo(e.bar, true)}>play</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "encounters" && (
          <>
            <p className="muted">Each hand plays one voice, so the hands meet wherever two neighbouring voices come within a second of each other, touch or cross. The meetings between the two players (primo LH and secondo RH share the middle of the keyboard) are the ones to agree on in advance.</p>
            <table className="cp14-table">
              <thead><tr><th>Bars</th><th>Who</th><th>What</th><th>Suggestion</th><th /></tr></thead>
              <tbody>
                {A.encounters.map((g, i) => (
                  <tr key={i} className={g.kind === "between" ? "between" : ""}>
                    <td>{g.bar === g.toBar ? barLabel(g.bar, g.beat) : `${g.bar}-${g.toBar}`}</td>
                    <td>{KIND[g.kind]}</td>
                    <td>{g.whats.map((w) => WHAT[w]).join(", ")}</td>
                    <td>{g.advice}</td>
                    <td><button className="link" onClick={() => goTo(g.bar)}>show</button> <button className="link" onClick={() => { setLoop({ a: g.bar, b: Math.min(P.bars, g.toBar + 1) }); setFromBar(g.bar); setPage(Math.floor((g.bar - 1) / perPage)); }}>loop</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {tab === "editing" && <Editing />}
      </section>
      <footer className="cp14-foot muted">Text: {P.source}. Fingering, articulation and dynamics are editorial suggestions, computed and marked as such; see "About the markings".</footer>
    </div>
  );
}

function Guide({ goTo }: { goTo(bar: number, play?: boolean): void }) {
  return (
    <div className="cp14-guide">
      <p>
        The fugue has three subjects, each first worked in a fugue of its own and then combined with
        the others. The third spells the composer's name in German note names: B (B flat), A, C, H (B
        natural). The manuscript breaks off in bar {P.bars}, just after all three subjects have sounded
        together for the first time. Gustav Nottebohm showed (1881) that they also combine with the main
        theme of the Art of Fugue, which suggests a quadruple fugue was planned.
      </p>
      <p>
        <strong>Four hands, one voice each.</strong> The primo plays soprano (RH) and alto (LH), the secondo
        tenor (RH) and bass (LH). Every line is one hand's whole responsibility, so each can be shaped
        horizontally, as a singer would: its own breathing, its own climax, its own dynamic, regardless of
        the bar lines. The cost is that the hands meet: the primo's left and the secondo's right share the
        middle of the keyboard (see "Where the hands meet").
      </p>
      <h3>Sections</h3>
      <ol className="cp14-sections">
        {A.sections.map((s) => (
          <li key={s.bar}>
            <button className="link" onClick={() => goTo(s.bar)}>bar {s.bar}</button> <strong>{s.title}.</strong> {s.text}
          </li>
        ))}
      </ol>
      <h3>How to practise with this page</h3>
      <ul>
        <li><strong>Each line alone first.</strong> Switch on one voice (S, A, T or B) and play or sing it with the page until its shape is clear: where it goes, where it rests, where it leans.</li>
        <li><strong>Your part against the other.</strong> "Secondo only" lets the primo practise against the secondo, and the reverse; the tempo can go as slow as 20 half notes a minute.</li>
        <li><strong>The meetings.</strong> Loop each place where the hands meet until both players have agreed who goes where.</li>
        <li><strong>Voicing.</strong> With "bring out the subjects" the subjects sound louder than the other voices: listen to the balance, then make it with your fingers. With colour on, the subjects are drawn in their colour, the other notes faint.</li>
      </ul>
    </div>
  );
}

function Editing() {
  return (
    <div className="cp14-guide">
      <p>The source has no fingering, articulation or dynamics. Everything marked here is a suggestion, and each kind can be switched off.</p>
      <h3>Fingering</h3>
      <p>
        One line per hand, so each hand's fingering is chosen for legato in its own line: the costs of
        stretches, crossings and thumbs on black keys are added up along each phrase, and the cheapest
        fingering is taken (a simplified form of the rules in Parncutt, Sloboda, Clarke, Raekallio and
        Desain, "An ergonomic model of keyboard fingering for melodic fragments", Music Perception 14/4,
        1997). "Where it matters" shows the finger after a rest, at a thumb passing or a finger crossing,
        at a stretch beyond the relaxed span and on a thumb on a black key; the rest follow. It does not
        know your hand, nor the other player's: check it at the meetings and pencil in your own.
      </p>
      <h3>Articulation</h3>
      <p>
        The default touch is legato within a line. Two signs only: a dot for a note slightly detached
        (not short, about three quarters of its value) before a leap of a fourth or more and on the first
        of two repeated notes; a dash for a note leaned on, a suspension held over the beat that becomes
        a second, seventh or ninth against another voice before falling by step. The keyboard treatises of
        the period (C. P. E. Bach's Versuch über die wahre Art das Clavier zu spielen, 1753; Türk's
        Klavierschule, 1789) describe an ordinary touch between legato and staccato, and dissonances
        played somewhat louder than their resolutions; these signs apply that sparingly, for a modern
        piano.
      </p>
      <h3>Dynamics</h3>
      <p>
        Under the bass: a level for each change in the number of voices sounding (two voices p, three
        mp, four mf). They are a starting point for the overall level, not a shape. The shape comes from
        the subjects: whoever has a subject leads, the others accompany, and that changes from entry to
        entry rather than from bar to bar.
      </p>
      <h3>Subjects and meetings</h3>
      <p>
        Found by their rhythm and intervals (subject I with its tonal answer and its inversion, subject
        II's semiquavers, B-A-C-H as its four notes), so a free passage that happens to share a subject's
        head may be marked too, and a varied entry missed. The meetings are every place where two
        neighbouring voices, and so two hands, come within a whole tone, touch or cross.
      </p>
    </div>
  );
}
