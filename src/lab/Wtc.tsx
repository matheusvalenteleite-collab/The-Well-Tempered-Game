/**
 * The Well-Tempered Clavier in the lab: Bach's 48 preludes and fugues, played in the tunings of the
 * period, each fugue drawn as a map (every voice, every entry of the subject marked), and a first
 * exercise, "write the answer", judged against Bach's own answer. A prototype for the game's WTC
 * mode: the analysis is src/wtc/, the data data/wtc/.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import fugueData from "../../data/wtc/fugues.json" with { type: "json" };
import preludeData from "../../data/wtc/preludes.json" with { type: "json" };
import inventionData from "../../data/wtc/inventions.json" with { type: "json" };
import { label, TPQ, type WtcPiece } from "../wtc/corpus.ts";
import { degree, findEntries, line, names, predictAnswer, subjectAndAnswer, transpose, type Entry, type Note } from "../wtc/fugue.ts";
import { TUNINGS, type TuningId } from "../wtc/tunings.ts";
import { entryKey } from "../wtc/keyplan.ts";
import { parsePitch } from "../music/pitch.ts";
import { playNotes, playPiece, stop } from "./keyboard.ts";
import { Markdown } from "./Habits.tsx";
import concept from "../../docs/wtc/CONCEPT.md?raw";
import answerStudy from "../../docs/wtc/answer-study.md?raw";
import csStudy from "../../docs/wtc/countersubject-study.md?raw";
import keyplanStudy from "../../docs/wtc/keyplan-study.md?raw";

const FUGUES = fugueData as unknown as WtcPiece[];
const PRELUDES = preludeData as unknown as WtcPiece[];
const INVENTIONS = inventionData as unknown as WtcPiece[];
const INK = ["#1f5fbf", "#c0392b", "#2e7d4f", "#a8761a", "#7b4fa0"];
const VOICE_NAMES: Record<number, string[]> = {
  2: ["upper", "lower"],
  3: ["soprano", "alto", "bass"],
  4: ["soprano", "alto", "tenor", "bass"],
  5: ["soprano I", "soprano II", "alto", "tenor", "bass"],
};
const nice = (k: string) => k.replace("b", "♭").replace("#", "♯");
const keyName = (p: WtcPiece) => `${nice(p.key)} ${p.mode}`;
const midi = (p: string) => parsePitch(p).midi;

/** An entry's label on the map: the key it stands in (Roman numeral against the home key), "inv." if inverted. */
function entryTag(e: Entry, subject: Note[], p: WtcPiece): string {
  const k = entryKey(p, e, subject).roman;
  return e.form === "inversion" ? `${k} inv.` : k;
}

interface Analysis {
  subject: Note[];
  answer: Note[];
  first: number;
  second: number;
  entries: Entry[];
  departures: number[];
}

function analyse(p: WtcPiece): Analysis | null {
  if (p.kind === "prelude") return null;
  const sa = subjectAndAnswer(p);
  const real = predictAnswer(sa.subject, p.key, p.mode, "real");
  const departures = real.map((x, i) => (x[0] !== sa.answer[i].pitch[0] ? i : -1)).filter((i) => i >= 0);
  return { ...sa, entries: findEntries(p, sa.subject), departures };
}

/* ---------------------------------------------------------------- the map */

interface Guess {
  voice: number;
  on: number;
  verdict?: "hit" | "false";
}

function PianoRoll({ p, a, tick, showEntries, onSeek, voicesOn, guesses, onPick, missed }: { p: WtcPiece; a: Analysis | null; tick: number; showEntries: boolean; onSeek: (t: number) => void; voicesOn: boolean[]; guesses?: Guess[]; onPick?: (tick: number, midi: number) => void; missed?: Entry[] }) {
  const pxq = 22; // pixels per quarter note
  const all = p.voices.flat();
  const lo = Math.min(...all.map((n) => midi(n[2]))) - 1;
  const hi = Math.max(...all.map((n) => midi(n[2]))) + 1;
  const ph = 5;
  const W = (p.length / TPQ) * pxq + 40;
  const H = (hi - lo + 1) * ph + 24;
  const x = (t: number) => 20 + (t / TPQ) * pxq;
  const y = (m: number) => 18 + (hi - m) * ph;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el || tick < 0) return;
    const px = x(tick);
    if (px < el.scrollLeft + 40 || px > el.scrollLeft + el.clientWidth - 80) el.scrollTo({ left: Math.max(0, px - el.clientWidth * 0.2) });
  }, [tick]);
  const entryNotes = useMemo(() => {
    const set = new Set<string>();
    if (a && showEntries) for (const e of a.entries) for (let i = 0; i < e.length; i++) set.add(`${e.voice}:${e.at + i}`);
    return set;
  }, [a, showEntries]);
  // The notes, drawn once per piece and view (the playhead alone moves while playing).
  const notes = useMemo(
    () =>
      p.voices.map((v, vi) => {
        if (voicesOn[vi] === false) return null;
        let main = -1;
        return v.map(([on, dur, pitch, sub], k) => {
          if (sub === 0) main++;
          const inEntry = sub === 0 && entryNotes.has(`${vi}:${main}`);
          return (
            <rect key={`${vi}-${k}`} x={x(on)} y={y(midi(pitch))} width={Math.max(2, (dur / TPQ) * pxq - 1)} height={ph - 0.5} rx={1.5} fill={INK[vi % INK.length]} opacity={showEntries ? (inEntry ? 1 : 0.38) : 0.85}>
              <title>{`${pitch} (${VOICE_NAMES[p.voices.length]?.[vi] ?? `voice ${vi + 1}`})`}</title>
            </rect>
          );
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p, entryNotes, voicesOn, showEntries],
  );
  return (
    <div className="wtc-roll" ref={scroller}>
      <svg width={W} height={H} onClick={(ev) => {
        const r = (ev.currentTarget as SVGSVGElement).getBoundingClientRect();
        const t = Math.max(0, ((ev.clientX - r.left - 20) / pxq) * TPQ);
        if (onPick) onPick(t, hi - (ev.clientY - r.top - 18) / ph);
        else onSeek(t);
      }}>
        {/* C lines, as on a keyboard */}
        {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((m) => m % 12 === 0).map((m) => (
          <g key={m}>
            <line x1={0} x2={W} y1={y(m) + ph} y2={y(m) + ph} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={2} y={y(m) + ph - 1} fontSize={8} fill="var(--ink-muted, #888)">C{Math.floor(m / 12) - 1}</text>
          </g>
        ))}
        {p.bars.map((b) => (
          <g key={`${b.n}-${b.on}`}>
            <line x1={x(b.on)} x2={x(b.on)} y1={12} y2={H} stroke="var(--line)" />
            {b.n % 2 === 1 && <text x={x(b.on) + 2} y={10} fontSize={9} fill="var(--ink-muted, #888)">{b.n}</text>}
          </g>
        ))}
        {showEntries && a?.entries.map((e, i) => {
          const l = line(p.voices[e.voice]);
          const end = l[e.at + e.length - 1];
          const ms = l.slice(e.at, e.at + e.length).map((n) => midi(n.pitch));
          return (
            <g key={i}>
              <rect x={x(e.on) - 1} y={y(Math.max(...ms)) - 2} width={x(end.on + end.dur) - x(e.on) + 2} height={(Math.max(...ms) - Math.min(...ms) + 1) * ph + 4} fill={INK[e.voice % INK.length]} opacity={0.1} rx={3} />
              <text x={x(e.on)} y={y(Math.max(...ms)) - 4} fontSize={9} fontWeight={700} fill={INK[e.voice % INK.length]}>{entryTag(e, a.subject, p)}</text>
            </g>
          );
        })}
        {notes}
        {guesses?.map((g, i) => {
          const l = line(p.voices[g.voice]);
          const n = l.find((m) => m.on === g.on);
          const yy = n ? y(midi(n.pitch)) : 20;
          const col = g.verdict === "hit" ? "#2e7d4f" : g.verdict === "false" ? "#c0392b" : "var(--ink, #222)";
          return <g key={`g${i}`}><circle cx={x(g.on)} cy={yy + ph / 2} r={6} fill="none" stroke={col} strokeWidth={2} /><text x={x(g.on) - 3} y={yy - 5} fontSize={10} fontWeight={700} fill={col}>{g.verdict === "hit" ? "✓" : g.verdict === "false" ? "✗" : "?"}</text></g>;
        })}
        {missed?.map((e, i) => {
          const l = line(p.voices[e.voice]);
          return <circle key={`m${i}`} cx={x(e.on)} cy={y(midi(l[e.at].pitch)) + ph / 2} r={7} fill="none" stroke="#a8761a" strokeWidth={2} strokeDasharray="3 2" />;
        })}
        {tick >= 0 && <line x1={x(tick)} x2={x(tick)} y1={0} y2={H} stroke="var(--ink, #222)" strokeWidth={1.5} />}
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------- the exercise */

function AnswerExercise({ p, a, tuning }: { p: WtcPiece; a: Analysis; tuning: TuningId }) {
  // For each note of the subject: answered a fifth up (real) or a fourth up (tonal).
  const [fourth, setFourth] = useState<boolean[]>(() => a.subject.map(() => false));
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setFourth(a.subject.map(() => false));
    setChecked(false);
  }, [a]);
  const mine = a.subject.map((n, i) => (fourth[i] ? transpose(n.pitch, 3, 5) : transpose(n.pitch, 4, 7)));
  const bach = a.answer.map((n) => n.pitch);
  const wrong = mine.map((m, i) => m[0] !== bach[i][0]);
  const nWrong = wrong.filter(Boolean).length;
  const ruled = predictAnswer(a.subject, p.key, p.mode, "bach");
  const degs = a.subject.map((n) => degree(n.pitch, p.key, p.mode));
  return (
    <fieldset className="lab-panel">
      <legend>Exercise: write the answer</legend>
      <p className="lab-prose">
        The second voice answers the subject in the dominant. Each note is answered a fifth higher (a <b>real</b> answer), unless it must be answered a fourth higher to keep the answer in the key (a <b>tonal</b> answer: the dominant of the subject answered by the tonic). Click a note to switch it between a fifth and a fourth up, then check against Bach.
      </p>
      <div className="wtc-answer">
        <div className="wtc-row">
          <span className="wtc-rowname">subject</span>
          {a.subject.map((n, i) => (
            <span key={i} className="wtc-note">
              {nice(n.pitch.replace(/-?\d+$/, ""))}
              <small>^{degs[i].alter > 0 ? "♯" : degs[i].alter < 0 ? "♭" : ""}{degs[i].deg}</small>
            </span>
          ))}
          <button onClick={() => playNotes(a.subject, tuning)}>▶</button>
        </div>
        <div className="wtc-row">
          <span className="wtc-rowname">your answer</span>
          {mine.map((m, i) => (
            <button key={i} className={`wtc-note wtc-pick${fourth[i] ? " wtc-fourth" : ""}${checked && wrong[i] ? " wtc-wrong" : ""}`} title={fourth[i] ? "a fourth up (tonal)" : "a fifth up (real)"} onClick={() => (setFourth((f) => f.map((x, j) => (j === i ? !x : x))), setChecked(false))}>
              {nice(m.replace(/-?\d+$/, ""))}
              <small>{fourth[i] ? "4th" : "5th"}</small>
            </button>
          ))}
          <button onClick={() => playNotes(a.subject.map((n, i) => ({ ...n, pitch: mine[i] })), tuning)}>▶</button>
        </div>
        {checked && (
          <div className="wtc-row">
            <span className="wtc-rowname">Bach</span>
            {bach.map((b, i) => (
              <span key={i} className={`wtc-note${wrong[i] ? " wtc-wrong" : ""}`}>{nice(b.replace(/-?\d+$/, ""))}</span>
            ))}
            <button onClick={() => playNotes(a.answer, tuning)}>▶</button>
          </div>
        )}
      </div>
      <div className="lab-actions">
        <button className="primary" onClick={() => setChecked(true)}>Check against Bach</button>
        <button onClick={() => (setFourth(a.subject.map((n, i) => ruled[i][0] !== transpose(n.pitch, 4, 7)[0])), setChecked(false))}>Apply the rule</button>
        <button onClick={() => (setFourth(a.subject.map(() => false)), setChecked(false))}>All real</button>
        {checked && (
          <span className={nWrong ? "lab-bad" : ""}>
            {nWrong ? `${nWrong} note${nWrong > 1 ? "s" : ""} differ${nWrong > 1 ? "" : "s"} from Bach's answer (letters compared; accidentals follow the dominant key).` : "Every letter as Bach wrote it."}
          </span>
        )}
      </div>
      <p className="lab-note">
        The rule (Bach's practice in the 48, docs/wtc/answer-study.md): a subject beginning on ^5 is answered from ^1 (17 of 17); an early ^5 leapt to from ^1 is answered by ^1 (7 of 7); a tail that reaches the dominant key is answered a fourth up, where exactly varying from fugue to fugue.
      </p>
    </fieldset>
  );
}

/* ---------------------------------------------------------------- the tab */

const ORDER = ["C major", "C minor", "C# major", "C# minor", "D major", "D minor", "Eb major", "D# minor", "E major", "E minor", "F major", "F minor", "F# major", "F# minor", "G major", "G minor", "Ab major", "G# minor", "A major", "A minor", "Bb major", "Bb minor", "B major", "B minor"];

export function WtcTab() {
  const [kind, setKind] = useState<"fugue" | "prelude" | "inventions">("fugue");
  const [id, setId] = useState("wtc1f01");
  const [tuning, setTuning] = useState<TuningId>("werckmeister3");
  const [bpm, setBpm] = useState(72);
  const [tick, setTick] = useState(-1);
  const [from, setFrom] = useState(0);
  const [showEntries, setShowEntries] = useState(true);
  const pool = kind === "fugue" ? FUGUES : kind === "prelude" ? PRELUDES : INVENTIONS;
  const p = pool.find((x) => x.id === id) ?? pool[0];
  const [voicesOn, setVoicesOn] = useState<boolean[]>([]);
  useEffect(() => (setVoicesOn(p.voices.map(() => true)), stop(), setTick(-1), setFrom(0)), [p]);
  const a = useMemo(() => analyse(p), [p]);
  // Level 1: find the entries (the marks hidden; clicks mark guesses).
  const [finding, setFinding] = useState(false);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [checked, setChecked] = useState(false);
  useEffect(() => (setGuesses([]), setChecked(false)), [p, finding]);
  const nearest = (t: number, m: number) => {
    let best: { voice: number; on: number; d: number } | null = null;
    p.voices.forEach((v, voice) => {
      if (voicesOn[voice] === false) return;
      for (const n of line(v)) {
        const d = Math.abs(n.on - t) / TPQ + Math.abs(midi(n.pitch) - m) / 3;
        if (!best || d < best.d) best = { voice, on: n.on, d };
      }
    });
    return best as { voice: number; on: number; d: number } | null;
  };
  const near = (g: Guess, e: Entry) => g.voice === e.voice && Math.abs(g.on - e.on) <= TPQ;
  const judged: Guess[] = checked && a ? guesses.map((g) => ({ ...g, verdict: a.entries.some((e) => near(g, e)) ? "hit" : "false" })) : guesses;
  const missedEntries = checked && a ? a.entries.filter((e) => !guesses.some((g) => near(g, e))) : [];
  const pick = (book: number, idx: number) => setId(`wtc${book}${kind === "fugue" ? "f" : "p"}${String(idx + 1).padStart(2, "0")}`);
  const tuningNote = TUNINGS.find((t) => t.id === tuning)?.note;
  return (
    <section className="lab-gen">
      <fieldset className="lab-panel">
        <legend>The 48</legend>
        <div className="lab-fields">
          <span className="lab-group">
            <button className={kind === "fugue" ? "primary" : ""} onClick={() => (setKind("fugue"), setId(id.startsWith("wtc") ? id.replace("p", "f") : "wtc1f01"))}>Fugues</button>
            <button className={kind === "prelude" ? "primary" : ""} onClick={() => (setKind("prelude"), setId(id.startsWith("wtc") ? id.replace("f", "p") : "wtc1p01"))}>Preludes</button>
            <button className={kind === "inventions" ? "primary" : ""} onClick={() => (setKind("inventions"), setId("inven01"))} title="The two-part inventions and three-part sinfonias: the way from two voices to the fugue">Inventions & Sinfonias</button>
          </span>
          <label className="lab-group" title={tuningNote}>
            Tuning
            <select value={tuning} onChange={(e) => setTuning(e.target.value as TuningId)}>
              {TUNINGS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="lab-group">
            Tempo <input type="range" min={30} max={140} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} /> <b>{bpm}</b>
          </label>
        </div>
        {kind === "inventions" ? (
          <div className="wtc-grid">
            {INVENTIONS.filter((x) => x.kind === "invention").map((inv, i) => {
              const sin = INVENTIONS.find((x) => x.kind === "sinfonia" && x.number === inv.number);
              return (
                <div key={inv.id} className="wtc-key">
                  <span className="wtc-keyname">{nice(inv.key)}{inv.mode === "minor" ? "m" : ""}</span>
                  <button className={`wtc-chip${inv.id === p.id ? " wtc-sel" : ""}`} title={`Invention ${i + 1} (two voices)`} onClick={() => setId(inv.id)}>2</button>
                  {sin && <button className={`wtc-chip${sin.id === p.id ? " wtc-sel" : ""}`} title={`Sinfonia ${i + 1} (three voices)`} onClick={() => setId(sin.id)}>3</button>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="wtc-grid">
          {ORDER.map((k, i) => (
            <div key={k} className="wtc-key">
              <span className="wtc-keyname">{nice(k.replace(" major", "").replace(" minor", "m"))}</span>
              {[1, 2].map((book) => {
                const pid = `wtc${book}${kind === "fugue" ? "f" : "p"}${String(i + 1).padStart(2, "0")}`;
                return (
                  <button key={book} className={`wtc-chip${pid === p.id ? " wtc-sel" : ""}`} title={`Book ${book === 1 ? "I" : "II"}`} onClick={() => pick(book, i)}>
                    {book === 1 ? "I" : "II"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        )}
        <p className="lab-note">{tuningNote}. {kind === "inventions" ? "The fifteen keys of the Inventions (2: two voices) and Sinfonias (3: three voices)." : "The keys in Bach's order, each in Book I and Book II."}</p>
      </fieldset>

      <div className="lab-box">
        <div className="lab-box-head">
          <button className="primary" onClick={() => playPiece(p, { tuning, bpm, from, voices: voicesOn, onTick: setTick })}>▶ Play{from > 0 ? " from here" : ""}</button>
          <button onClick={() => stop()} aria-label="Stop">■</button>
          <b>{label(p)}</b>
          <span className="lab-note">{p.voices.length} voices · {p.meter}</span>
          {a && (
            <label className="lab-group">
              <input type="checkbox" checked={showEntries} onChange={(e) => setShowEntries(e.target.checked)} /> mark the entries ({a.entries.length})
            </label>
          )}
          <span className="lab-group">
            {p.voices.map((_, vi) => (
              <label key={vi} style={{ color: INK[vi % INK.length] }}>
                <input type="checkbox" checked={voicesOn[vi] !== false} onChange={(e) => setVoicesOn((v) => v.map((x, j) => (j === vi ? e.target.checked : x)))} /> {VOICE_NAMES[p.voices.length]?.[vi] ?? vi + 1}
              </label>
            ))}
          </span>
        </div>
        {a && (
          <div className="lab-actions" style={{ padding: "6px 10px" }}>
            <label className="lab-group" title="Level 1: the marks are hidden; click the first note of every entry of the subject you hear or see">
              <input type="checkbox" checked={finding} onChange={(e) => setFinding(e.target.checked)} /> exercise: find the entries
            </label>
            {finding && (
              <>
                <span className="lab-note">Click the first note of each entry ({guesses.length} marked). Click a mark again to remove it.</span>
                <button className="primary" onClick={() => setChecked(true)}>Check</button>
                <button onClick={() => (setGuesses([]), setChecked(false))}>Clear</button>
                {checked && (
                  <span>
                    <b>{judged.filter((g) => g.verdict === "hit").length}</b> of {a.entries.length} entries found, <b>{judged.filter((g) => g.verdict === "false").length}</b> marks where no entry begins; the dashed circles show the ones missed.
                  </span>
                )}
              </>
            )}
          </div>
        )}
        <PianoRoll
          p={p}
          a={a}
          tick={tick}
          showEntries={showEntries && !finding}
          onSeek={(t) => setFrom(Math.round(t))}
          voicesOn={voicesOn}
          guesses={finding ? judged : undefined}
          missed={finding ? missedEntries : undefined}
          onPick={
            finding
              ? (t, m) => {
                  const n = nearest(t, m);
                  if (!n) return;
                  setChecked(false);
                  setGuesses((gs) => (gs.some((g) => g.voice === n.voice && g.on === n.on) ? gs.filter((g) => !(g.voice === n.voice && g.on === n.on)) : [...gs, { voice: n.voice, on: n.on }]));
                }
              : undefined
          }
        />
        <p className="lab-note" style={{ padding: "0 10px 8px" }}>
          Click the map to choose where playback starts. {a ? "Each entry is labelled with its key against the home key (I the tonic, V the dominant: the answer; vi, IV, III ... the middle entries; upper case major, lower case minor); inv.: inverted." : ""}
        </p>
      </div>

      {a && (
        <fieldset className="lab-panel">
          <legend>Subject and answer</legend>
          <p className="lab-prose">
            Subject in the {VOICE_NAMES[p.voices.length]?.[a.first] ?? `voice ${a.first + 1}`}: <b>{names(a.subject.map((n) => n.pitch)).map(nice).join(" ")}</b>{" "}
            <button onClick={() => playNotes(a.subject, tuning)}>▶</button>
            <br />
            Answer in the {VOICE_NAMES[p.voices.length]?.[a.second] ?? `voice ${a.second + 1}`}: <b>{names(a.answer.map((n) => n.pitch)).map(nice).join(" ")}</b>{" "}
            <button onClick={() => playNotes(a.answer, tuning)}>▶</button>
            <br />
            {p.kind !== "fugue" ? "In the inventions and sinfonias the second voice usually imitates at the octave, not at the fifth." : a.departures.length ? `A tonal answer: note${a.departures.length > 1 ? "s" : ""} ${a.departures.map((i) => i + 1).join(", ")} answered a fourth up instead of a fifth.` : "A real answer: every note a fifth up."}
          </p>
        </fieldset>
      )}
      {a && p.kind === "fugue" && <AnswerExercise p={p} a={a} tuning={tuning} />}
      <details className="lab-panel wtc-docs">
        <summary><b>The plan for the WTC mode</b> (a proposal: docs/wtc/CONCEPT.md)</summary>
        <div className="lab-habits"><Markdown text={concept} /></div>
      </details>
      <details className="lab-panel wtc-docs">
        <summary><b>Studies</b>: Bach's answers; the countersubjects; the key plans</summary>
        <div className="lab-habits">
          <Markdown text={answerStudy} />
          <h2 className="lab-part">Key plans</h2>
          <Markdown text={keyplanStudy} />
          <h2 className="lab-part">Countersubjects</h2>
          <Markdown text={csStudy} />
        </div>
      </details>
    </section>
  );
}
