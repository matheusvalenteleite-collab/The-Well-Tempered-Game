/**
 * The pieces of the tutorial screen (D140): text with Aloysius's lines, clip buttons, the writable
 * two-voice and three-voice scores with their coach and judgement, the quiz, the choice and the
 * road map. The logic lives in tutorial/model.ts; these only draw it and wire it to the engine.
 */
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ScoreView } from "./notation/ScoreView.tsx";
import { Systems } from "./notation/Systems.tsx";
import { TrioScore, type TrioVoice } from "./notation/TrioScore.tsx";
import { trioStaves } from "./notation/trio-staves.ts";
import { VoiceRoll } from "./notation/VoiceRoll.tsx";
import { VOICE_COLORS } from "./voice-colors.ts";
import { LIBRARY } from "../wtc/library.ts";
import { buildOverlay, neutralOverlay } from "./notation/overlay.ts";
import { audio, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import { stepStudy } from "./study.ts";
import { HOLD, sounding, type PlayEvent, type Slot } from "../counterpoint/layout.ts";
import { harmonic, interval } from "../counterpoint/interval.ts";
import { applyAccidental, initialState, place, select, type Accidental, type SessionState } from "../game/session.ts";
import { parsePitch } from "../music/pitch.ts";
import { COURSES } from "../counterpoint/curriculum/index.ts";
import type { Violation } from "../counterpoint/rules/types.ts";
import type { Evaluation } from "../counterpoint/engine.ts";
import type { TrioEvaluation } from "../counterpoint/three-voice.ts";
import { coach, complete, freeScene, intervalWords, judge, judgeTrio, sceneEvents, slotsOf, type Clip, type QuizItem, type Scene, type TrioScene, type Verdict } from "../tutorial/model.ts";
import { tt } from "../tutorial/text.ts";

// ---------------------------------------------------------------- text

/** "**bold**" inside a paragraph. */
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="tut-prose">
      {paragraphs.map((p, i) => {
        const quote = /^@quote:(.+)$/.exec(p);
        if (quote) {
          const intro = stepStudy(quote[1]).intro;
          return (
            <blockquote key={i} className="tutor" lang="en">
              <span className="speaker">{t("tutor.speaker.aloysius")}.</span> “{intro.en}”
              <cite title={intro.la} lang="la">{t("ui.tutor.cite", { page: intro.page })}</cite>
            </blockquote>
          );
        }
        return <p key={i}>{inline(p)}</p>;
      })}
    </div>
  );
}

export const Inline = ({ text }: { text: string }) => <>{inline(text)}</>;

// ---------------------------------------------------------------- sound

/** One clip plays at a time; the cursor follows the slots of a scene clip. */
export function usePlayer() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [cursor, setCursor] = useState(-1);
  const timers = useRef<number[]>([]);
  const token = useRef(0);
  const clear = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };
  const stop = () => {
    token.current++;
    clear();
    audio.stop();
    setPlaying(null);
    setCursor(-1);
  };
  useEffect(() => stop, []);
  const play = (id: string, events: PlayEvent[], whole: number) => {
    if (playing === id) return stop();
    stop();
    const mine = ++token.current;
    setPlaying(id);
    const t0 = events[0]?.at ?? 0;
    for (const e of events) timers.current.push(window.setTimeout(() => token.current === mine && setCursor(e.slot), (0.05 + (e.at - t0) * whole) * 1000));
    void audio.playSequence(events, whole).then(() => {
      if (token.current !== mine) return;
      clear();
      setPlaying(null);
      setCursor(-1);
    });
  };
  /** A short sound (a note just written): stops whatever plays first, so nothing is left half-stopped. */
  const audition = (events: PlayEvent[], whole: number) => {
    stop();
    void audio.playSequence(events, whole);
  };
  return { playing, cursor, play, stop, audition };
}

/** The events and the length of a whole note for a clip. */
export function clipEvents(c: Clip): { events: PlayEvent[]; whole: number } {
  if (c.kind === "scene") return { events: sceneEvents(c.scene, c.notes ?? c.scene.answer ?? c.scene.start, c.from, c.to), whole: audio.barSeconds };
  if (c.kind === "poly") {
    // Each voice its own sound: the mixer's voice channels, as the study plays a fugue (D123).
    const CH = ["counterpoint", "second", "fux"] as const;
    const VERSION = ["inversion", "retrograde", "retroInversion"];
    return {
      events: c.notes.map((n, k) => {
        // The slot is the bar of the piece where there is one: the roll's cursor follows it (D146).
        const e: PlayEvent = { slot: n.bar ?? k, at: n.at, length: n.len, cantus: null, counterpoint: null };
        if (n.voice < CH.length) e.extra = [{ channel: CH[n.voice], pitch: n.pitch }];
        else (e.versions = { [VERSION[(n.voice - CH.length) % VERSION.length]]: n.pitch }), (e.lengths = { [VERSION[(n.voice - CH.length) % VERSION.length]]: n.len });
        return e;
      }),
      whole: c.seconds,
    };
  }
  if (c.kind === "melody") return { events: c.notes.map((p, k) => ({ slot: k, at: k, length: 1, cantus: null, counterpoint: p })), whole: c.seconds ?? 0.6 };
  return {
    events: c.columns.map((col, k) => {
      const ps = [...col].sort((a, b) => parsePitch(a).midi - parsePitch(b).midi);
      return { slot: k, at: k, length: 1, cantus: ps[0] ?? null, counterpoint: ps[1] ?? null, extra: ps.slice(2).map((p) => ({ channel: "counterpoint" as const, pitch: p })) };
    }),
    whole: c.seconds ?? 1.5,
  };
}

export function ClipButtons({ clips, labels, heard, onHeard, player }: { clips: Clip[]; labels?: Record<string, string>; heard?: string[]; onHeard?: (id: string) => void; player: ReturnType<typeof usePlayer> }) {
  return (
    <div className="tut-clips">
      {clips.map((c) => {
        const on = player.playing === c.id;
        const was = heard?.includes(c.id);
        return (
          <button
            key={c.id}
            className={was ? "tut-clip heard" : "tut-clip"}
            aria-pressed={on}
            onClick={() => {
              const { events, whole } = clipEvents(c);
              player.play(c.id, events, whole);
              onHeard?.(c.id);
            }}
          >
            {on ? "■" : "▶"} {labels?.[c.id] ?? c.id}
            {was && !on && <span className="tut-heard" aria-label={tt("ui.heard")}> ✓</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- the two-voice score

/** The bars of a scene drawn, renumbered from 0, and the map back to the scene's slots. */
function windowOf(s: Scene) {
  const [lo, hi] = s.window ?? [0, s.cantus.length - 1];
  const slots = slotsOf(s, lo, hi);
  const layout: Slot[] = slots.map((k) => ({ ...s.layout[k], bar: s.layout[k].bar - lo }));
  return { lo, hi, slots, layout, cantus: s.cantus.slice(lo, hi + 1) };
}

/** Violations moved onto the drawn window (positions outside it dropped). */
const toWindow = (vs: Violation[], slots: number[]): Violation[] =>
  vs.map((v) => ({ ...v, positions: v.positions.map((p) => slots.indexOf(p)).filter((p) => p >= 0) })).filter((v) => v.positions.length > 0);

/** The note a line holds into the first drawn slot (fifth species, a window starting mid-note). */
function carryOf(notes: (string | null)[], first: number): string | null {
  if (notes[first] !== HOLD) return null;
  for (let j = first - 1; j >= 0; j--) if (notes[j] !== HOLD) return sounding(notes[j]) ? notes[j] : null;
  return null;
}

export function SceneScore(p: {
  scene: Scene;
  notes: (string | null)[];
  selected?: number;
  cursor?: number;
  names: boolean;
  intervals: boolean;
  result?: Evaluation | null;
  onPlace?: (slot: number, natural: string) => void;
  onSelect?: (slot: number) => void;
  label: string;
  compact?: boolean;
}) {
  const w = windowOf(p.scene);
  const shown = w.slots.map((k) => p.notes[k]);
  const overlay = p.result ? buildOverlay(toWindow(p.result.violations, w.slots), w.cantus, shown, w.layout) : p.intervals ? neutralOverlay(w.cantus, shown, w.layout) : undefined;
  const marks = p.result ? toWindow(p.result.violations, w.slots).flatMap((v) => v.positions.map((c) => ({ column: c, severity: v.severity }))) : undefined;
  const readOnly = !p.onPlace || p.scene.open.length === 0;
  // The bars still waiting for the learner pulse (the game's pointer, D96).
  const waiting = readOnly ? [] : [...new Set(w.slots.filter((k) => p.scene.open.includes(k) && p.notes[k] === null).map((k) => p.scene.layout[k].bar - w.lo))];
  // On a narrow screen a long score breaks into systems, as in the game (D83); a fifth-species
  // excerpt (read-only, three bars) is drawn whole, its held note carried in.
  const Score = p.scene.species === "fifth" ? ScoreView : Systems;
  return (
    <div className={p.compact ? "tut-score compact" : "tut-score"}>
      <Score
        cantus={w.cantus}
        counterpoint={shown}
        layout={w.layout}
        cantusVoice={p.scene.cantusVoice}
        clefs={p.scene.clefs}
        selected={readOnly ? -1 : w.slots.indexOf(p.selected ?? -1)}
        cursor={w.slots.indexOf(p.cursor ?? -1)}
        firstBar={w.lo + 1}
        overlay={overlay}
        marks={marks}
        pulse={waiting.length ? waiting : undefined}
        ties={p.scene.species === "fourth"}
        showNames={p.names}
        nameStyle="letters"
        showGhost={!readOnly}
        carry={{ counterpoint: carryOf(p.notes, w.slots[0]) }}
        readOnly={readOnly}
        label={p.label}
        onPlace={(col, natural) => {
          const k = w.slots[col];
          if (k !== undefined && p.scene.open.includes(k)) p.onPlace?.(k, natural);
        }}
        onSelect={(col) => {
          const k = w.slots[col];
          if (k !== undefined) p.onSelect?.(k);
        }}
      />
    </div>
  );
}

const ACCIDENTALS: [Accidental, string][] = [[-1, "ui.accidental.flat"], [0, "ui.accidental.natural"], [1, "ui.accidental.sharp"]];

/** Bars of the violations, 1-based, as text. */
const barsText = (layout: Slot[], positions: number[]) => [...new Set(positions.map((k) => (layout[k]?.bar ?? 0) + 1))].join(", ");

export function Judgement({ result, layout, bars }: { result: Evaluation | TrioEvaluation; layout?: Slot[]; bars?: (positions: number[]) => string }) {
  const where = (v: Violation) => (bars ? bars(v.positions) : layout ? barsText(layout, v.positions) : v.positions.map((x) => x + 1).join(", "));
  return (
    <div className={result.errors.length === 0 ? "tut-judgement ok" : "tut-judgement bad"} role="status">
      <p className="verdict">{tt(result.errors.length === 0 ? "ui.passed" : "ui.failed")}</p>
      {result.errors.length > 0 && (
        <ul className="violations">
          {result.errors.map((v, i) => (
            <li key={i}>
              <span className="where">{tt("ui.bars", { bars: where(v) })}</span> <span className="text">{t(`hints.${v.messageKey}`)}</span>
            </li>
          ))}
        </ul>
      )}
      {result.warnings.length > 0 && (
        <>
          <p className="help-line">{tt("ui.warnings")}</p>
          <ul className="violations">
            {result.warnings.map((v, i) => (
              <li key={i} className="warning">
                <span className="where">{tt("ui.bars", { bars: where(v) })}</span> <span className="text">{t(`hints.${v.messageKey}`)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * A writable scene: the score, accidentals, the coach on the note just written, and — for
 * "judge" tasks, once every open place is written — Aloysius's verdict from the game's engine.
 */
export function WriteScene(p: {
  scene: Scene;
  mode: "judge" | "write";
  check?: (notes: (string | null)[], scene: Scene) => Verdict;
  names: boolean;
  intervals: boolean;
  onDone(done: boolean): void;
  player: ReturnType<typeof usePlayer>;
  hint?: string;
  label: string;
}) {
  const s = p.scene;
  const fresh = (): SessionState => ({ ...initialState(Math.max(2, s.start.length)), notes: [...s.start], selected: s.open[0] ?? 0 });
  const [session, setSession] = useState<SessionState>(fresh);
  const [last, setLast] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const notes = session.notes;

  const result = useMemo(() => (p.mode === "judge" && complete(s, notes) ? judge(s, notes) : null), [notes, s, p.mode]);
  const verdict = p.mode === "write" && p.check ? p.check(notes, s) : null;
  const done = p.mode === "judge" ? Boolean(result && result.errors.length === 0) : Boolean(verdict?.done);
  useEffect(() => p.onDone(done), [done]);

  const audition = (k: number, ns: (string | null)[]) => {
    const sl = s.layout[k];
    const n = ns[k];
    if (!sounding(n)) return;
    p.player.audition([{ slot: k, at: 0, length: 1, cantus: s.cantus[sl.bar], counterpoint: n }], 0.9);
  };
  /** The next empty open slot after k (or k itself when none). */
  const nextOpen = (ns: (string | null)[], k: number) => s.open.find((j) => j > k && ns[j] === null) ?? s.open.find((j) => ns[j] === null) ?? k;
  const write = (k: number, natural: string) => {
    const placed = place(select(session, k), k, natural);
    setSession(select(placed, nextOpen(placed.notes, k)));
    setLast(k);
    audition(k, placed.notes);
  };
  const accidental = (a: Accidental) => {
    const target = last !== null && session.notes[session.selected] === null ? select(session, last) : session;
    const next = applyAccidental(target, a);
    if (next.notes !== session.notes && next.notes[target.selected] !== target.notes[target.selected]) {
      setSession(select(next, session.selected));
      setLast(target.selected);
      audition(target.selected, next.notes);
    } else setSession({ ...session, accidental: next.accidental });
  };
  // The coach speaks in intervals: only once they are taught (the judged lessons), never in the first ones.
  const lines = last !== null && p.mode === "judge" && s.species !== "fifth" ? coach(s, notes, last) : [];
  const hasAnswer = Boolean(s.answer && s.open.length);

  return (
    <div className="tut-write">
      <SceneScore scene={s} notes={notes} selected={session.selected} cursor={p.player.playing === "line" ? p.player.cursor : -1} names={p.names} intervals={p.intervals} result={result} label={p.label} onPlace={write} onSelect={(k) => s.open.includes(k) && setSession(select(session, k))} />
      <div className="tut-tools">
        <span className="group" role="group" aria-label={tt("ui.accidentals")}>
          {ACCIDENTALS.map(([a, key]) => (
            <button key={a} className="btn-acc" aria-pressed={session.accidental === a} onClick={() => accidental(a)} title={t(`${key}.help`)}>
              {t(key)}
            </button>
          ))}
        </span>
        <button onClick={() => p.player.play("line", sceneEvents(s, notes.map((n) => n ?? null)), audio.barSeconds)} aria-pressed={p.player.playing === "line"}>
          {p.player.playing === "line" ? tt("ui.stop") : tt("ui.playAll")}
        </button>
        <span className="tool-gap" />
        {p.hint && (
          <button aria-pressed={showHint} onClick={() => setShowHint(!showHint)}>
            {tt("ui.hint")}
          </button>
        )}
        {hasAnswer && (
          <button
            title={tt("ui.showMeHelp")}
            onClick={() => {
              setSession({ ...session, notes: [...s.answer!], accidental: null });
              setLast(null);
            }}
          >
            {tt("ui.showMe")}
          </button>
        )}
        <button
          onClick={() => {
            setSession(fresh());
            setLast(null);
          }}
        >
          {tt("ui.reset")}
        </button>
      </div>
      {showHint && p.hint && <p className="tut-hint"><Inline text={p.hint} /></p>}
      {lines.length > 0 && (
        <ul className="tut-coach" aria-live="polite">
          {lines.map((l, i) => (
            <li key={i} className={l.tone}>
              {tt(l.key, l.vars ?? {})}
            </li>
          ))}
        </ul>
      )}
      {verdict && verdict.key !== "wellDone" && <p className={`tut-say ${verdict.tone}`}>{tt(`say.${verdict.key}`, verdict.vars ?? {})}</p>}
      {p.mode === "judge" && !complete(s, notes) && <p className="tut-say info">{tt("ui.fillLeft", { n: s.open.filter((k) => notes[k] === null).length })}</p>}
      {result && <Judgement result={result} layout={s.layout} />}
    </div>
  );
}

// ---------------------------------------------------------------- three voices

const withAccidental = (natural: string, a: Accidental | null) => {
  if (a === null) return natural;
  const q = parsePitch(natural);
  return `${q.step}${a === 1 ? "#" : a === -1 ? "b" : ""}${q.octave}`;
};

export function TrioPane(p: {
  scene: TrioScene;
  names: boolean;
  /** Bars to pulse (the quiz's bar). */
  pulse?: number[];
  writable: boolean;
  onDone?: (done: boolean) => void;
  player: ReturnType<typeof usePlayer>;
  hint?: string;
  label: string;
  /** A clip of the lesson that plays this very scene (its cursor is shown). */
  cursorClip?: string;
}) {
  const s = p.scene;
  const [voices, setVoices] = useState<(string | null)[][]>(() => s.start.map((l) => [...l]));
  const [sel, setSel] = useState<[number, number] | null>(s.open[0] ?? null);
  const [pending, setPending] = useState<Accidental | null>(null);
  const [showHint, setShowHint] = useState(false);
  const isOpen = (staff: number, bar: number) => s.open.some(([a, b]) => a === staff && b === bar);
  const full = voices.every((l) => l.every((n) => n !== null));
  const result = useMemo(() => (p.writable && full ? judgeTrio(s, voices) : null), [voices, full, p.writable, s]);
  const done = Boolean(result && result.errors.length === 0);
  useEffect(() => p.onDone?.(done), [done]);

  const audition = (bar: number, vs: (string | null)[][]) => {
    const col = vs.map((l) => l[bar]).filter((n): n is string => n !== null);
    const { events } = clipEvents({ id: "col", kind: "columns", columns: [col] });
    p.player.audition(events, 1);
  };
  const write = (staff: number, bar: number, pitch: string) => {
    const next = voices.map((l, i) => (i === staff ? l.map((n, b) => (b === bar ? pitch : n)) : l));
    setVoices(next);
    setSel([staff, bar]);
    audition(bar, next);
  };
  const accidental = (a: Accidental) => {
    const cur = sel ? voices[sel[0]][sel[1]] : null;
    if (sel && cur) {
      const q = parsePitch(cur);
      write(sel[0], sel[1], withAccidental(`${q.step}${q.octave}`, q.alter === a ? null : a));
    } else setPending(pending === a ? null : a);
  };
  const playAll = () => {
    const events: PlayEvent[] = s.answer[0].map((_, k) => {
      const col = voices.map((l) => l[k]).filter((n): n is string => n !== null).sort((a, b) => parsePitch(a).midi - parsePitch(b).midi);
      return { slot: k, at: k, length: 1, cantus: col[0] ?? null, counterpoint: col[1] ?? null, extra: col.slice(2).map((x) => ({ channel: "counterpoint" as const, pitch: x })) };
    });
    p.player.play("trio", events, audio.barSeconds);
  };
  const playerStaves = [0, 1, 2].filter((x) => x !== s.cantusIndex);
  // Two staves, as in the game (D113): each voice by the register of Fux's line, the player's in their colours.
  const mean = (line: (string | null)[]) => {
    const ms = line.filter((x): x is string => !!x).map((x) => parsePitch(x).midi);
    return ms.reduce((a, b) => a + b, 0) / Math.max(1, ms.length);
  };
  const staves = trioStaves(s.answer.map(mean));
  const INK = ["var(--trk-counterpoint)", "var(--trk-second)"];
  const drawn: TrioVoice[] = voices.map((notes, i) => ({
    notes,
    editable: p.writable && s.open.some(([a]) => a === i),
    staff: staves.staff[i],
    ...(i === s.cantusIndex ? {} : { ink: INK[playerStaves.indexOf(i)] }),
  }));
  return (
    <div className="tut-write">
      <div className="tut-score trio">
        <TrioScore
          voices={drawn}
          clefs={staves.clefs}
          active={sel?.[0] ?? playerStaves[0]}
          selected={sel?.[1] ?? -1}
          cursor={p.player.playing === "trio" || p.player.playing === p.cursorClip ? p.player.cursor : -1}
          marks={result ? result.violations.flatMap((v) => v.positions.map((bar) => ({ bar, severity: v.severity }))) : undefined}
          pulse={p.pulse ?? (p.writable ? [...new Set(s.open.filter(([a, b]) => voices[a][b] === null).map(([, b]) => b))] : undefined)}
          figures
          names={p.names}
          nameStyle="letters"
          label={p.label}
          onPlace={(staff, bar, natural) => {
            if (!p.writable || !isOpen(staff, bar)) return;
            write(staff, bar, withAccidental(natural, pending));
            setPending(null);
          }}
          onSelect={(staff, bar) => staff !== null && isOpen(staff, bar) && setSel([staff, bar])}
          zoom={1}
          onZoom={() => undefined}
          zoomLabels={{ in: t("ui.zoom.in"), out: t("ui.zoom.out"), reset: t("ui.zoom.reset") }}
        />
      </div>
      <div className="tut-tools">
        {p.writable && (
          <span className="group" role="group" aria-label={tt("ui.accidentals")}>
            {ACCIDENTALS.map(([a, key]) => (
              <button key={a} className="btn-acc" aria-pressed={pending === a} onClick={() => accidental(a)} title={t(`${key}.help`)}>
                {t(key)}
              </button>
            ))}
          </span>
        )}
        <button onClick={playAll} aria-pressed={p.player.playing === "trio"}>{p.player.playing === "trio" ? tt("ui.stop") : tt("ui.playAll")}</button>
        {p.writable && (
          <>
            <span className="tool-gap" />
            {p.hint && <button aria-pressed={showHint} onClick={() => setShowHint(!showHint)}>{tt("ui.hint")}</button>}
            <button title={tt("ui.showMeHelp")} onClick={() => setVoices(s.answer.map((l) => [...l]))}>{tt("ui.showMe")}</button>
            <button onClick={() => setVoices(s.start.map((l) => [...l]))}>{tt("ui.reset")}</button>
          </>
        )}
      </div>
      {showHint && p.hint && <p className="tut-hint"><Inline text={p.hint} /></p>}
      {p.writable && !full && <p className="tut-say info">{tt("ui.fillLeft", { n: voices.flat().filter((n) => n === null).length })}</p>}
      {result && <Judgement result={result} bars={(ps) => ps.map((x) => x + 1).join(", ")} />}
    </div>
  );
}

// ---------------------------------------------------------------- quiz

const STEP_LETTERS = "CDEFGAB";
/** "D, E, F" — the letters from the lower note up to the upper, both counted (an octave at most). */
function lettersBetween(lower: string, upper: string): string {
  const a = parsePitch(lower).diatonic;
  const b = parsePitch(upper).diatonic;
  const span = b - a;
  const reduced = span > 7 ? ((span - 1) % 7) + 1 : span;
  return Array.from({ length: reduced + 1 }, (_, k) => STEP_LETTERS[(a + k) % 7]).join(", ");
}

const pitchName = (p: string) => p.replace("#", "♯").replace(/b(?=-?\d)/, "♭").replace(/-?\d+$/, "");

/** Why the answer is what it is, in words, from the notes themselves. */
function why(quiz: string, item: QuizItem): string {
  const [c0, c1] = item.columns;
  if (quiz === "interval") {
    const i = harmonic(c0[0], c0[1]);
    return tt("quiz.why.interval", { letters: lettersBetween(c0[0], c0[1]), n: item.answer + (i.number > 8 && i.simple !== 1 ? ` (${i.number}, counted as ${item.answer})` : "") });
  }
  if (quiz === "class") return tt("quiz.why.class", { interval: intervalWords(harmonic(c0[0], c0[1])) });
  if (quiz === "motion") {
    const dir = (a: string, b: string) => {
      const d = interval(a, b).direction;
      return tt(d === "up" ? "quiz.up" : d === "down" ? "quiz.down" : "quiz.stays");
    };
    return tt("quiz.why.motion", { lo: dir(c0[0], c1[0]), up: dir(c0[1], c1[1]) });
  }
  const ps = [...c0].sort((a, b) => parsePitch(a).midi - parsePitch(b).midi);
  return tt("quiz.why.chord", { bass: pitchName(ps[0]), figures: ps.slice(1).map((x) => intervalWords(harmonic(ps[0], x))).join(" and ") });
}

const midi = (p: string) => parsePitch(p).midi;
/** A small scene to draw a quiz item: lower notes on the lower staff, upper on the upper. */
function itemScene(item: QuizItem): Scene {
  const lows = item.columns.map((c) => c[0]);
  const highs = item.columns.map((c) => c[1]);
  const lowClef = Math.min(...lows.map(midi)) >= 57 ? "treble" : "bass";
  return freeScene(lows, { start: highs, open: [], clefs: ["treble", lowClef] });
}

export function Quiz(p: {
  quiz: "interval" | "class" | "motion" | "chord";
  items: QuizItem[];
  choices: string[];
  labels?: Record<string, string>;
  names: boolean;
  onDone(): void;
  player: ReturnType<typeof usePlayer>;
  /** Chord quiz: the bar of the item, to point at in the trio scene drawn above. */
  onBar?: (bar: number | null) => void;
}) {
  const [k, setK] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [right, setRight] = useState(false);
  const item = p.items[k];
  useEffect(() => p.onBar?.(p.items[k]?.bar ?? null), [k]);
  useEffect(() => () => p.onBar?.(null), []);
  const label = (c: string) => p.labels?.[c] ?? (p.quiz === "interval" ? c : tt(`quiz.choice.${c}`));
  const finished = k >= p.items.length;
  if (finished) return null;
  const clip: Clip = { id: `q${k}`, kind: "columns", columns: item.columns };
  const prompt =
    p.quiz === "chord"
      ? tt("quiz.chord", { bar: (item.bar ?? 0) + 1 })
      : p.quiz === "motion"
        ? tt("quiz.motion", { a: item.columns[0].map(pitchName).join("–"), b: item.columns[1].map(pitchName).join("–") })
        : tt(p.quiz === "interval" ? "quiz.interval" : "quiz.class", { lower: pitchName(item.columns[0][0]), upper: pitchName(item.columns[0][1]) });
  return (
    <div className="tut-quiz">
      <p className="tut-quiz-count">{tt("ui.quizProgress", { n: k + 1, total: p.items.length })}</p>
      {p.quiz !== "chord" && (
        <SceneScore scene={itemScene(item)} notes={item.columns.map((c) => c[1])} names={p.names} intervals={false} label={prompt} compact />
      )}
      <div className="tut-quiz-row">
        <button className="tut-clip" onClick={() => { const { events, whole } = clipEvents(clip); p.player.play(clip.id, events, whole); }} aria-pressed={p.player.playing === clip.id}>
          {p.player.playing === clip.id ? "■" : "▶"}
        </button>
        <span className="tut-quiz-prompt">{prompt}</span>
      </div>
      <div className="tut-choices" role="group">
        {p.choices.map((c) => (
          <button
            key={c}
            disabled={right}
            className={right && c === item.answer ? "right" : wrong === c ? "wrong" : undefined}
            onClick={() => {
              if (c === item.answer) {
                setRight(true);
                setWrong(null);
              } else setWrong(c);
            }}
          >
            {label(c)}
          </button>
        ))}
      </div>
      {wrong && <p className="tut-say bad">{tt("ui.quizAgain")} {why(p.quiz, item)}</p>}
      {right && (
        <p className="tut-say ok">
          {tt("ui.quizRight")} {why(p.quiz, item)}{" "}
          <button
            className="primary"
            onClick={() => {
              setRight(false);
              setWrong(null);
              if (k + 1 >= p.items.length) p.onDone();
              setK(k + 1);
            }}
          >
            {k + 1 >= p.items.length ? tt("ui.done") : tt("ui.quizNext")}
          </button>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- road map

export function RoadMap({ trio }: { trio: { species: number; ids: string[] }[] }) {
  const stars = stored<string[]>("wtg.stars", [], (v) => Array.isArray(v));
  const two = COURSES.filter((c) => c.voices === 2);
  const ord = ["", "1st", "2nd", "3rd", "4th", "5th"];
  const row = (species: number, ids: string[]) => (
    <tr key={species}>
      <td>{tt("road.species", { n: ord[species] })}</td>
      <td>{tt("road.exercises", { n: ids.length })}</td>
      <td>{tt("road.stars", { n: ids.filter((id) => stars.includes(id)).length, total: ids.length })}</td>
    </tr>
  );
  return (
    <table className="tut-road">
      <tbody>
        <tr>
          <th colSpan={3}>{tt("road.head", { voices: 2 })}</th>
        </tr>
        {two.map((c) => row(c.species, c.steps.map((s) => s.id)))}
        <tr>
          <th colSpan={3}>{tt("road.head", { voices: 3 })}</th>
        </tr>
        {trio.map((x) => row(x.species, x.ids))}
        <tr>
          <th colSpan={3}>{tt("road.head", { voices: 4 })}</th>
        </tr>
        <tr>
          <td colSpan={3} className="help-line">{tt("road.soon")}</td>
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- the fugue as a picture (D146)

/**
 * The whole fugue as the study draws it (D123): each note a bar of its length at its pitch, each voice
 * in its colour, each entry of the subject outlined (S). The clip playing, or the last one played,
 * shades its passage, scrolls to it and fades the voices it leaves out; the cursor follows its bars.
 */
export function FugueRoll({ fugueId, clips, player }: { fugueId: string; clips: Clip[]; player: ReturnType<typeof usePlayer> }) {
  const F = useMemo(() => LIBRARY.find((x) => x.id === fugueId)!.fugue(), [fugueId]);
  const [focus, setFocus] = useState<Clip | null>(null);
  useEffect(() => {
    const c = clips.find((x) => x.id === player.playing);
    if (c) setFocus(c);
  }, [player.playing]);
  const span = focus?.kind === "poly" ? (focus.span ?? null) : null;
  const heard = focus?.kind === "poly" ? focus.voices : undefined;
  const faint = new Set(heard ? [...new Set(F.voice)].filter((v) => !heard.includes(v)) : []);
  const own = clips.some((c) => c.id === player.playing);
  return (
    <div className="tut-roll">
      <VoiceRoll
        notes={F.notes}
        voice={F.voice}
        colors={VOICE_COLORS}
        faint={faint}
        entries={F.entries}
        showEntries
        barQuarters={F.barQuarters}
        cursor={own ? player.cursor : -1}
        span={span}
        extra={[]}
        onSeek={() => undefined}
        follow={false}
        marker={null}
        label={tt("ui.rollLabel")}
        firstBar={1 - F.pickup}
      />
      <p className="help-line">{tt("ui.rollHelp")}</p>
    </div>
  );
}
