/**
 * The Well-Tempered Clavier mode (D119): the species' doctrine carried into Bach's fugues. For
 * each fugue of the dataset (29 expositions, 21 keys), three exercises on its exposition:
 *   1. the answer: write the comes against Bach's subject (real or tonal, the mutation found);
 *   2. the countersubject: write the dux's counterpoint against Bach's answer, in Bach's rhythm,
 *      judged by the tonal two-voice rules and then set beside Bach's own;
 *   3. study: Bach's exposition with its parts named and its mutations marked.
 * The keys are laid out in Bach's order; the temperament defaults to a circulating one, so that
 * every key sounds as itself (Werckmeister III, Kirnberger III, Vallotti, or equal).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { FUGUES, KEY_ORDER, keyName, keySignature, isMinor, realAnswer, type WtcFugue, type WtcNote } from "../wtc/fugues.ts";
import { degree, evaluateAnswer, type AnswerEvaluation } from "../wtc/answer.ts";
import { beatOf, evaluateCounterpoint, type CpEvaluation } from "../wtc/counterpoint.ts";
import { counterHint } from "../wtc/hints.ts";
import { findEntries, type Entry, type FullNote } from "../wtc/entries.ts";
import full from "../../data/bach/wtc/fugues-full.json" with { type: "json" };
import { PianoRoll } from "./notation/PianoRoll.tsx";
import { parsePitch, type Step } from "../music/pitch.ts";
import { WtcScore, type WtcScoreNote, type WtcScoreVoice } from "./notation/WtcScore.tsx";
import { restoreSound, type SoundState } from "../audio/sound.ts";
import { SYNTH_PRESETS } from "../audio/synth-settings.ts";
import { WELL, type TemperamentId } from "../audio/temperament.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { ZOOM_MAX, ZOOM_MIN } from "./notation/zoom.ts";
import { HFader } from "./HFader.tsx";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import { Shell } from "./Shell.tsx";
import { HeaderTools } from "./HeaderTools.tsx";

type Exercise = "mutation" | "answer" | "counter" | "study";
const EXERCISES: Exercise[] = ["mutation", "answer", "counter", "study"];
/** The exercises the player writes (and earns a star for). */
const WRITTEN: Exercise[] = ["mutation", "answer", "counter"];
const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const INSTRUMENTS = ["harpsichord", "fluteOrgan", "grandRoom"] as const;
type Instrument = (typeof INSTRUMENTS)[number];

/** VexFlow's name for a key signature: "C", "F#", "Bb" for major, "Am", "C#m" for minor. */
const vexKey = (key: string) => (isMinor(key) ? `${key[0].toUpperCase()}${key.slice(1)}m` : key);
const roman = (book: number) => (book === 1 ? "I" : "II");
const fugueLabel = (f: WtcFugue) => `${keyName(f.key)} · ${roman(f.book)}/${f.number} · BWV ${f.bwv}`;

/** A pitch for a letter, with the key signature, nearest to `near`. */
function letterPitch(step: Step, signature: Record<Step, number>, near: string): string {
  const n = parsePitch(near);
  const alter = signature[step];
  const acc = alter > 0 ? "#".repeat(alter) : "b".repeat(-alter);
  const options = [n.octave - 1, n.octave, n.octave + 1].map((o) => `${step}${acc}${o}`);
  return options.reduce((a, b) => (Math.abs(parsePitch(b).midi - n.midi) < Math.abs(parsePitch(a).midi - n.midi) ? b : a));
}
/** A diatonic step up or down (the key signature's alteration), or an octave. */
function stepPitch(p: string, delta: number, signature: Record<Step, number>): string {
  const x = parsePitch(p);
  if (Math.abs(delta) === 7) return `${p.replace(/-?\d+$/, "")}${x.octave + Math.sign(delta)}`;
  const d = x.diatonic + delta;
  const step = STEPS[((d % 7) + 7) % 7];
  const alter = signature[step];
  return `${step}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${Math.floor(d / 7)}`;
}
/** The same pitch with another alteration (+1 sharpen, -1 flatten, 0 natural). */
function alterPitch(p: string, how: number): string {
  const x = parsePitch(p);
  const alter = how === 0 ? 0 : Math.max(-2, Math.min(2, x.alter + how));
  return `${x.step}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${x.octave}`;
}
/** A MIDI number spelled with sharps, or with flats in a flat key (for the sound only). */
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const midiName = (m: number, flats: boolean) => `${(flats ? FLATS : SHARPS)[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const FULL = (full as unknown as { notes: Record<string, number[][]> }).notes;
const mean = (xs: WtcNote[]) => xs.reduce((a, n) => a + parsePitch(n.pitch).midi, 0) / Math.max(1, xs.length);

export function WtcApp({ onVoices }: { onVoices(n: 2 | 3 | "wtc"): void }) {
  const [index, setIndex] = useState(() => Math.max(0, FUGUES.findIndex((f) => f.id === stored("wtg.wtcFugue", FUGUES[0].id))));
  const F = FUGUES[index];
  useEffect(() => store("wtg.wtcFugue", F.id), [F.id]);
  const [exercise, setExercise] = useState<Exercise>(() => stored<Exercise>("wtg.wtcExercise", "answer", (v) => EXERCISES.includes(v as Exercise)));
  useEffect(() => store("wtg.wtcExercise", exercise), [exercise]);
  const [written, setWritten] = useState<Record<string, (string | null)[]>>(() => stored("wtg.wtcWritten", {}, (v) => typeof v === "object" && v !== null));
  useEffect(() => store("wtg.wtcWritten", written), [written]);
  const [stars, setStars] = useState<string[]>(() => stored<string[]>("wtg.wtcStars", [], (v) => Array.isArray(v)));
  useEffect(() => store("wtg.wtcStars", stars), [stars]);
  const [selected, setSelected] = useState(0);
  const [result, setResult] = useState<{ kind: "answer"; ev: AnswerEvaluation } | { kind: "counter"; ev: CpEvaluation } | { kind: "mutation"; ev: { passed: boolean; marked: number[] } } | null>(null);
  const [hintOn, setHintOn] = useState(false);
  /** In the study: the exposition on the staff, or the whole fugue as a roll (D121). */
  const [whole, setWhole] = useState(() => stored("wtg.wtcWhole", false, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.wtcWhole", whole), [whole]);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [showBach, setShowBach] = useState(false);
  const [tab, setTab] = useState<string>(() => stored("wtg.wtcTab", "guide", (v) => typeof v === "string"));
  useEffect(() => store("wtg.wtcTab", tab), [tab]);
  const [tempo, setTempo] = useState(() => stored("wtg.wtcTempo", 36, (v) => typeof v === "number" && v >= 15 && v <= 120));
  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.wtcTempo", tempo);
  }, [tempo]);
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number"));
  useEffect(() => audio.setVolume(volume / 100), [volume]);
  const [tuning, setTuning] = useState<TemperamentId>(() => stored("wtg.wtcTuning", "werckmeister3" as TemperamentId, (v) => WELL.includes(v as TemperamentId)));
  useEffect(() => {
    audio.temperament = tuning;
    store("wtg.wtcTuning", tuning);
  }, [tuning]);
  const [instrument, setInstrument] = useState<Instrument>(() => stored("wtg.wtcInstrument", "harpsichord" as Instrument, (v) => INSTRUMENTS.includes(v as Instrument)));
  const sound = useMemo<SoundState>(() => {
    const s = restoreSound(null);
    const preset = SYNTH_PRESETS.find((p) => p.id === instrument)!.settings;
    for (const c of ["cantus", "counterpoint", "second", "fux"] as const) s.synth[c] = { ...preset };
    s.mix.counterpoint.pan = -0.15;
    s.mix.second.pan = 0.15;
    return s;
  }, [instrument]);
  useEffect(() => {
    audio.setSoundState(sound);
    store("wtg.wtcInstrument", instrument);
  }, [sound, instrument]);
  const [zoom, setZoom] = useState(() => stored("wtg.wtcZoom", 1, (v) => typeof v === "number" && v >= ZOOM_MIN && v <= ZOOM_MAX));
  useEffect(() => store("wtg.wtcZoom", zoom), [zoom]);
  const [look, setLook] = useState<"retro" | "classic">(() => stored("wtg.look", "retro", (v) => v === "retro" || v === "classic"));
  useEffect(() => {
    document.documentElement.dataset.look = look;
    store("wtg.look", look);
  }, [look]);
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(() => stored("wtg.theme", "auto", (v) => v === "auto" || v === "light" || v === "dark"));
  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    store("wtg.theme", theme);
  }, [theme]);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);
  useEffect(() => {
    audio.loop = false;
    audio.drums = false;
    audio.setGates({ counterpoint: true, second: true, fux: true, continuo: false });
    return () => audio.stop();
  }, []);

  const signature = useMemo(() => keySignature(F.key), [F.key]);
  const flats = Object.values(signature).some((x) => x < 0);
  const allNotes: FullNote[] = useMemo(() => (FULL[F.id] ?? []).map(([m, o, d]) => ({ midi: m, at: o / 96, dur: d / 96 })), [F.id]);
  const entries: Entry[] = useMemo(() => findEntries(allNotes, F.subject.map((n) => ({ midi: parsePitch(n.pitch).midi, at: n.at, dur: n.dur }))), [allNotes, F]);
  const showWhole = exercise === "study" && whole && allNotes.length > 0;
  const ex: Exercise = exercise;
  const key = `${F.id}:${ex}`;
  const target = ex === "answer" ? F.answer : ex === "counter" ? F.countersubject : ex === "mutation" ? F.subject : [];
  const line: (string | null)[] = written[key] && written[key].length === target.length ? written[key] : target.map(() => null);
  const missing = ex === "mutation" ? 0 : line.filter((x) => !x).length;
  const solved = stars.includes(key);
  const bachOpen = solved || (attempts[key] ?? 0) > 0;
  const setLine = (next: (string | null)[]) => {
    setWritten({ ...written, [key]: next });
    setResult(null);
  };

  // Times from the start of the first bar.
  const off = F.phase;
  const toAnswer = F.phase + F.answerAt;
  const barOf = (abs: number) => Math.floor(abs / F.barQuarters + 1e-6);
  const dux = [...F.subject.map((n) => ({ ...n, at: n.at + off })), ...F.countersubject.map((n) => ({ ...n, at: n.at + toAnswer }))];
  const comes = F.answer.map((n) => ({ ...n, at: n.at + toAnswer }));
  const duxHigh = mean([...F.subject, ...F.countersubject]) >= mean(F.answer);
  const staffOf = (notes: WtcNote[], other: WtcNote[], high: boolean): 0 | 1 => {
    const m = mean(notes);
    const o = mean(other);
    if (m >= 60 && o >= 60) return 0;
    if (m < 60 && o < 60) return 1;
    return high ? 0 : 1;
  };
  const duxStaff = staffOf([...F.subject, ...F.countersubject], F.answer, duxHigh);
  const comesStaff = staffOf(F.answer, [...F.subject, ...F.countersubject], !duxHigh);

  // The verdicts, for colouring the written notes.
  const verdictInk = (i: number): string | undefined => {
    if (!result) return undefined;
    if (result.kind === "mutation") return (line[i] === "x") === F.mutations.includes(i) ? "var(--ok-ink, #2e7d32)" : "var(--bad-ink, #c62828)";
    if (result.kind === "answer") {
      const v = result.ev.notes[i]?.verdict;
      return v === "bach" || v === "enharmonic" ? "var(--ok-ink, #2e7d32)" : v === "missing" ? undefined : "var(--bad-ink, #c62828)";
    }
    const bad = result.ev.errors.some((e) => e.note - F.subject.length === i);
    return bad ? "var(--bad-ink, #c62828)" : "var(--ok-ink, #2e7d32)";
  };
  const INK_GIVEN = "var(--trk-cantus, #222)";
  /** In the study, the dux and the comes each in a colour of their own. */
  const INK_COMES = "var(--trk-second)";
  const INK_PLAYER = "var(--trk-counterpoint)";
  const INK_BACH = "var(--ink-fux)";
  const voices: WtcScoreVoice[] = useMemo(() => {
    const subjectNotes: WtcScoreNote[] = F.subject.map((n, i) => ({ pitch: n.pitch, at: n.at + off, dur: n.dur, ...(ex === "counter" ? { ink: INK_GIVEN } : {}), ...(i === 0 ? { label: t("ui.wtc.part.subject") } : {}) }));
    const csNotes: WtcScoreNote[] = F.countersubject.map((n, i) => {
      const mine = ex === "counter";
      const pitch = mine ? (showBach ? n.pitch : line[i]) : n.pitch;
      return { pitch, at: n.at + toAnswer, dur: n.dur, ...(mine ? { slot: i, ink: showBach ? INK_BACH : verdictInk(i) } : {}), ...(i === 0 ? { label: t("ui.wtc.part.countersubject") } : {}) };
    });
    const answerNotes: WtcScoreNote[] = F.answer.map((n, i) => {
      const mine = ex === "answer";
      const pitch = mine ? (showBach ? n.pitch : line[i]) : n.pitch;
      const mark = (ex === "study" || showBach || (result?.kind === "answer" && solved)) && F.mutations.includes(i) ? t("ui.wtc.mutationMark") : undefined;
      return { pitch, at: n.at + toAnswer, dur: n.dur, ...(mine ? { slot: i, ink: showBach ? INK_BACH : verdictInk(i) } : {}), ...(mark ? { mark } : {}), ...(i === 0 ? { label: t("ui.wtc.part.answer") } : {}) };
    });
    if (ex === "mutation") {
      const marked: WtcScoreNote[] = F.subject.map((n, i) => ({ pitch: n.pitch, at: n.at + off, dur: n.dur, slot: i, ink: verdictInk(i) ?? (line[i] === "x" ? INK_PLAYER : INK_GIVEN), ...(line[i] === "x" ? { mark: t("ui.wtc.mutationMark") } : {}), ...(i === 0 ? { label: t("ui.wtc.part.subject") } : {}) }));
      return [{ notes: marked, staff: duxStaff, ink: INK_GIVEN, editable: true }];
    }
    const dv: WtcScoreVoice = { notes: [...subjectNotes, ...csNotes], staff: duxStaff, ink: ex === "counter" ? INK_PLAYER : INK_GIVEN, editable: ex === "counter" && !showBach };
    const cv: WtcScoreVoice = { notes: answerNotes, staff: comesStaff, ink: ex === "answer" ? INK_PLAYER : ex === "study" ? INK_COMES : INK_GIVEN, editable: ex === "answer" && !showBach };
    // Within a shared staff the higher voice comes first (stems up).
    return duxHigh ? [dv, cv] : [cv, dv];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [F, ex, line, showBach, result, solved]);
  const ordered = voices;

  /** Where a letter lands for slot i: near the previous written note, else in the voice's staff. */
  const nearFor = (i: number) => {
    for (let k = i - 1; k >= 0; k--) if (line[k]) return line[k]!;
    if (ex === "counter") return F.subject[F.subject.length - 1].pitch;
    return (ex === "answer" ? comesStaff : duxStaff) === 0 ? "B4" : "D3";
  };
  /**
   * The octave of a typed letter: in the answer, the one that moves from the previous note as the
   * subject moves (up where it goes up); elsewhere, nearest the previous note.
   */
  const placeLetter = (step: Step, i: number, cur: string | null): string => {
    const near = cur ?? nearFor(i);
    const p0 = letterPitch(step, signature, near);
    if (ex !== "answer" || i === 0 || !line[i - 1] || cur) return p0;
    const dir = Math.sign(parsePitch(F.subject[i].pitch).midi - parsePitch(F.subject[i - 1].pitch).midi);
    const prev = parsePitch(line[i - 1]!).midi;
    const cands = [-12, 0, 12].map((d) => stepPitch(p0, Math.sign(d) * 7, signature)).map((x, k) => ([-12, 0, 12][k] === 0 ? p0 : x));
    const fit = cands.filter((c) => Math.sign(parsePitch(c).midi - prev) === dir);
    return fit.length ? fit.reduce((a, b) => (Math.abs(parsePitch(b).midi - prev) < Math.abs(parsePitch(a).midi - prev) ? b : a)) : p0;
  };
  /** Sound slot i with what the other voice sounds then. */
  const audition = (i: number, pitch: string | null) => {
    if (!pitch) return;
    const n = target[i];
    const abs = n.at + toAnswer;
    const other = (ex === "answer" ? dux : comes).find((x) => x.at <= abs + 1e-6 && abs < x.at + x.dur - 1e-6);
    const len = Math.min(1, n.dur) / 4;
    void audio.playSequence([{ slot: 0, at: 0, length: len * 2, cantus: null, counterpoint: null, extra: [{ channel: "counterpoint", pitch }, ...(other ? [{ channel: "second" as const, pitch: other.pitch }] : [])] }]);
  };
  const toggle = (i: number) => {
    const next = [...line];
    next[i] = next[i] === "x" ? null : "x";
    setLine(next);
    void audio.playSequence([{ slot: 0, at: 0, length: Math.min(1, F.subject[i].dur) / 2, cantus: null, counterpoint: null, extra: [{ channel: "counterpoint", pitch: F.subject[i].pitch }] }]);
  };
  const write = (i: number, pitch: string | null, advance: boolean) => {
    const next = [...line];
    next[i] = pitch;
    setLine(next);
    audition(i, pitch);
    if (advance) setSelected(Math.min(target.length - 1, i + 1));
  };

  const go = (k: number) => {
    if (k < 0 || k >= FUGUES.length) return;
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setResult(null);
    setShowBach(false);
    setSelected(0);
    setIndex(k);
  };
  const choose = (e: Exercise) => {
    audio.stop();
    setPlaying(false);
    setResult(null);
    setShowBach(false);
    setSelected(0);
    setExercise(e);
  };

  const play = (fromQ = 0, restart = false) => {
    if (playing && !restart) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    if (showWhole) {
      const inEntry = new Set(entries.flatMap((e) => e.notes));
      const evs: PlayEvent[] = allNotes
        .map((n, i) => ({ n, i }))
        .filter(({ n }) => n.at >= fromQ - 1e-6)
        .map(({ n, i }) => ({ slot: barOf(n.at), at: (n.at - fromQ) / 4, length: n.dur / 4, cantus: null, counterpoint: null, extra: [{ channel: inEntry.has(i) ? ("counterpoint" as const) : ("second" as const), pitch: midiName(n.midi, flats) }] }));
      if (!evs.length) return;
      audio.setGates({ counterpoint: true, second: true, fux: true, continuo: false });
      setPlaying(true);
      void audio.playAll(evs, (k) => {
        setCursor(k);
        if (k < 0) setPlaying(false);
      });
      return;
    }
    const events: PlayEvent[] = [];
    const add = (notes: { pitch: string | null; at: number; dur: number }[], channel: "counterpoint" | "second" | "fux") => {
      for (const n of notes) if (n.pitch) events.push({ slot: barOf(n.at), at: n.at / 4, length: n.dur / 4, cantus: null, counterpoint: null, extra: [{ channel, pitch: n.pitch }] });
    };
    for (const v of ordered) add(v.notes, v.ink === INK_PLAYER ? "counterpoint" : "second");
    events.sort((a, b) => a.at - b.at);
    if (!events.length) return;
    // Start at the first note, not at the bar line.
    const t0 = events[0].at;
    for (const e of events) e.at -= t0;
    audio.setGates({ counterpoint: true, second: true, fux: true, continuo: false });
    setPlaying(true);
    void audio.playAll(events, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    });
  };

  const evaluate = () => {
    if (result) return setResult(null);
    if (ex === "study" || missing > 0) return;
    setAttempts({ ...attempts, [key]: (attempts[key] ?? 0) + 1 });
    if (ex === "mutation") {
      const marked = line.map((x, i) => (x === "x" ? i : -1)).filter((i) => i >= 0);
      const passed = marked.length === F.mutations.length && marked.every((i) => F.mutations.includes(i));
      setResult({ kind: "mutation", ev: { passed, marked } });
      if (passed && !stars.includes(key)) setStars([...stars, key]);
    } else if (ex === "answer") {
      const ev = evaluateAnswer(F, line);
      setResult({ kind: "answer", ev });
      if (ev.passed && !stars.includes(key)) setStars([...stars, key]);
    } else {
      const tail = F.subject.map((n) => ({ ...n, at: n.at - F.answerAt }));
      const mine = F.countersubject.map((n, i) => ({ ...n, pitch: line[i]! }));
      const all = [...tail, ...mine];
      const ev = evaluateCounterpoint({ line: all, given: F.answer, bar: F.barQuarters, beat: beatOf(F.time), phase: toAnswer % F.barQuarters, judged: new Set(mine.map((_, i) => i + tail.length)) });
      setResult({ kind: "counter", ev });
      if (ev.passed && !stars.includes(key)) setStars([...stars, key]);
    }
    setTab("evaluation");
  };

  // Keys: letters write (with the key signature), arrows move and correct, # - n alter.
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const tg = e.target as HTMLElement | null;
    if (tg && /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)) return;
    const k = e.key;
    const editable = ex !== "study" && !showBach;
    const cur = line[selected];
    if (k === " " || k === "p" || k === "P") play();
    else if ((k === "w" || k === "W") && ex === "study") setWhole(!whole);
    else if (k === "Enter") evaluate();
    else if (!editable) return;
    else if (k === "ArrowRight") setSelected(Math.min(target.length - 1, selected + 1));
    else if (k === "ArrowLeft") setSelected(Math.max(0, selected - 1));
    else if (ex === "mutation") {
      if (k === "x" || k === "X" || k === "m" || k === "M") toggle(selected);
      else return;
    } else if ((k === "h" || k === "H") && ex === "counter") setHintOn(!hintOn);
    else if (/^[a-gA-G]$/.test(k)) write(selected, placeLetter(k.toUpperCase() as Step, selected, cur), true);
    else if ((k === "ArrowUp" || k === "ArrowDown") && cur) write(selected, stepPitch(cur, (k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 7 : 1), signature), false);
    else if (k === "#" && cur) write(selected, alterPitch(cur, 1), false);
    else if (k === "-" && cur) write(selected, alterPitch(cur, -1), false);
    else if (k === "n" && cur) write(selected, alterPitch(cur, 0), false);
    else if ((k === "Backspace" || k === "Delete") && cur) write(selected, null, false);
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

  // The hint (H): the notes the rules allow at the selected place of the countersubject.
  const hint = useMemo(() => (hintOn && ex === "counter" && !showBach && target.length ? counterHint(F, line, Math.min(selected, target.length - 1)) : null), [hintOn, ex, showBach, F, line, selected, target.length]);
  // Messages for the evaluation.
  const barOfAnswerNote = (i: number) => barOf(F.answer[i].at + toAnswer) + 1;
  const barOfCs = (at: number) => barOf(at + toAnswer) + 1;
  const name = (p: string) => p.replace(/#/g, "♯").replace(/b(?=-?\d)/g, "♭").replace(/(?<=[A-G])b/g, "♭");
  const ORD: Record<string, string> = { "3": "third", "4": "fourth", "5": "fifth", "6": "sixth", "7": "seventh", "8": "octave" };
  const intervalText = (d?: string) => {
    if (!d) return "";
    if (d === "same") return t("ui.wtc.interval.same");
    const [size, dir] = d.split("-");
    return t(`ui.wtc.interval.${dir}`, { size: size === "step" ? t("ui.wtc.step") : t("ui.wtc.size", { n: ORD[size] ?? `${size}th` }) });
  };
  const feedback = () => {
    if (!result) return <p className="dock-empty">{t("ui.dock.noEvaluation")}</p>;
    if (result.kind === "mutation") {
      const real = realAnswer(F);
      const all = [...new Set([...result.ev.marked, ...F.mutations])].sort((a, b) => a - b);
      const deg = (i: number) => ({ n: i + 1, sd: degree(F.subject[i].pitch, F.key), bd: degree(F.answer[i].pitch, F.key), rd: degree(real[i], F.key), bach: name(F.answer[i].pitch), real: name(real[i]) });
      return (
        <section className="feedback" aria-live="polite">
          <p className={result.ev.passed ? "verdict ok" : "verdict bad"}>{t(result.ev.passed ? (F.mutations.length ? "ui.wtc.mut.passedTonal" : "ui.wtc.mut.passedReal") : "ui.wtc.mut.failed")}</p>
          <ul>
            {all.map((i) => {
              const k2 = result.ev.marked.includes(i) ? (F.mutations.includes(i) ? "right" : "extra") : "missed";
              return (
                <li key={i} className={k2 === "right" ? "ok" : "error"}>
                  {t(`ui.wtc.mut.${k2}`, deg(i))}
                </li>
              );
            })}
          </ul>
          {result.ev.passed && <p className="help">{t("ui.wtc.mut.next")}</p>}
        </section>
      );
    }
    if (result.kind === "answer") {
      const ev = result.ev;
      const bad = ev.notes.filter((n) => n.verdict !== "bach");
      return (
        <section className="feedback" aria-live="polite">
          <p className={ev.passed ? "verdict ok" : "verdict bad"}>{ev.passed ? t("ui.wtc.answer.passed", { kind: t(F.mutations.length ? "ui.wtc.tonal" : "ui.wtc.real") }) : t("ui.wtc.answer.failed", { right: ev.right, n: ev.notes.length })}</p>
          <ul>
            {bad.map((n) => (
              <li key={n.index} className={n.verdict === "enharmonic" ? "warning" : "error"}>
                <span className="where">{t("ui.wtc.noteAt", { n: n.index + 1, bar: barOfAnswerNote(n.index) })}</span>{" "}
                {t(`ui.wtc.verdict.${n.verdict}`, { bach: name(n.detail.bach), real: name(n.detail.real), sd: n.detail.subjectDegree ?? "", bd: n.detail.bachDegree ?? "", rd: n.detail.realDegree ?? "", interval: intervalText(n.detail.interval) })}
              </li>
            ))}
          </ul>
        </section>
      );
    }
    const ev = result.ev;
    return (
      <section className="feedback" aria-live="polite">
        <p className={ev.passed ? "verdict ok" : "verdict bad"}>{ev.passed ? t("ui.wtc.counter.passed") : t("ui.wtc.counter.failed", { n: ev.errors.length })}</p>
        <ul>
          {ev.violations.map((v, k) => (
            <li key={k} className={v.severity}>
              <span className="where">{t("ui.wtc.barOnly", { bar: barOfCs(v.at) })}</span> {t(`ui.${v.messageKey}`, { interval: v.detail?.interval ?? "", kind: v.detail?.interval ?? "" })}
            </li>
          ))}
        </ul>
        {ev.passed && <p className="help">{t("ui.wtc.counter.compare", { same: F.countersubject.filter((n, i) => line[i] === n.pitch).length, n: F.countersubject.length })}</p>}
      </section>
    );
  };

  // The keys in Bach's order: majors above, minors below; a star where an exercise is solved.
  const keyGrid = (
    <section className="wtc-keys" aria-label={t("ui.wtc.keys")}>
      <p className="help">{t("ui.wtc.keysHelp")}</p>
      <div className="wtc-grid">
        {[0, 1].map((row) => (
          <div key={row} className="wtc-row">
            {KEY_ORDER.filter((_, i) => i % 2 === row).map((k) => {
              const fs = FUGUES.filter((f) => f.key === k);
              return (
                <div key={k} className={`wtc-key${fs.some((f) => f.id === F.id) ? " current" : ""}${fs.length ? "" : " empty"}`}>
                  <span className="wtc-keyname" title={keyName(k)}>{k.replace("#", "♯").replace(/(?<=.)b$/, "♭")}</span>
                  {fs.map((f) => (
                    <button key={f.id} className="chipbtn" onClick={() => go(FUGUES.indexOf(f))} title={fugueLabel(f)}>
                      {roman(f.book)}
                      {WRITTEN.every((e) => stars.includes(`${f.id}:${e}`)) ? "★" : WRITTEN.some((e) => stars.includes(`${f.id}:${e}`)) ? "☆" : ""}
                    </button>
                  ))}
                  {!fs.length && <span className="wtc-none" title={t("ui.wtc.noFugue")}>–</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );

  const facts = (
    <ul className="wtc-facts">
      <li>{t("ui.wtc.fact.key", { key: keyName(F.key), time: F.time })}</li>
      <li>{t(F.mutations.length ? "ui.wtc.fact.tonal" : "ui.wtc.fact.real", { n: F.mutations.length, interval: t(F.answerShift % 12 === 7 || F.answerShift % 12 === -5 ? (F.answerShift > 0 ? "ui.wtc.fifthUp" : "ui.wtc.fourthDown") : F.answerShift > 0 ? "ui.wtc.fourthUp" : "ui.wtc.fifthDown") })}</li>
      <li>{t("ui.wtc.fact.subject", { n: F.subject.length })}</li>
      <li>{t("ui.wtc.fact.entries", { n: entries.length, inv: entries.filter((e) => e.inverted).length, bars: Math.ceil(Math.max(0, ...allNotes.map((n) => n.at + n.dur)) / F.barQuarters) })}</li>
    </ul>
  );

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <button className="icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("ui.nav.prev")}>‹</button>
            <select id="voices" className="sel sel-voices" value="wtc" aria-label={t("ui.nav.voices")} onChange={(e) => (audio.stop(), onVoices(e.target.value === "wtc" ? "wtc" : (Number(e.target.value) as 2 | 3)))}>
              <option value={2}>{t("ui.nav.voicesN", { n: 2 })}</option>
              <option value={3}>{t("ui.nav.voicesN", { n: 3 })}</option>
              <option value="wtc">{t("ui.wtc.mode")}</option>
            </select>
            <select id="wtc-exercise" className="sel sel-species" value={ex} aria-label={t("ui.wtc.exercise")} onChange={(e) => choose(e.target.value as Exercise)}>
              {EXERCISES.map((x, i) => (
                <option key={x} value={x}>{`${i + 1} · ${t(`ui.wtc.ex.${x}`)}`}</option>
              ))}
            </select>
            <select id="exercise" className="sel sel-exercise" value={index} onChange={(e) => go(Number(e.target.value))} aria-label={t("ui.wtc.fugue")}>
              {FUGUES.map((f, k) => (
                <option key={f.id} value={k}>
                  {WRITTEN.every((e) => stars.includes(`${f.id}:${e}`)) ? "★ " : ""}
                  {fugueLabel(f)}
                </option>
              ))}
            </select>
            <button className="icon" onClick={() => go(index + 1)} disabled={index === FUGUES.length - 1} aria-label={t("ui.nav.next")}>›</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("guide")} />
        </>
      }
      score={
        <div className="score-wrap wtc" data-written={JSON.stringify(line)}>
          {ex !== "study" && (
            <span className={solved ? "star earned" : "star"} aria-label={t(solved ? "ui.star.earned" : "ui.star.none")}>{solved ? "★" : "☆"}</span>
          )}
          {showWhole ? (
            <PianoRoll notes={allNotes} entries={entries} barQuarters={F.barQuarters} cursor={cursor} label={fugueLabel(F)} onEntry={(e) => play(e.at, true)} />
          ) : (
          <WtcScore
            voices={ordered}
            keySig={vexKey(F.key)}
            signature={signature}
            time={F.time}
            barQuarters={F.barQuarters}
            selected={ex === "study" || showBach ? null : selected}
            cursor={cursor}
            label={fugueLabel(F)}
            onSlot={(slot, pitch) => {
              setSelected(slot);
              if (ex === "mutation") return toggle(slot);
              if (pitch && ex !== "study" && !showBach) write(slot, pitch, false);
              else audition(slot, line[slot]);
            }}
            zoom={zoom}
            onZoom={setZoom}
            zoomLabels={{ in: t("ui.zoom.in"), out: t("ui.zoom.out"), reset: t("ui.zoom.reset") }}
          />
          )}
        </div>
      }
      transport={
        <>
        {hint && (
          <div className="hint-bar" role="status" aria-live="polite">
            <span className="hint-tag">{t("ui.hint.tag")}</span>
            <span className="hint-body">
              <strong>{t("ui.wtc.hint.where", { n: selected + 1, bar: barOf(F.countersubject[selected].at + toAnswer) + 1 })}</strong>{" "}
              {hint.allowed.length ? t("ui.wtc.hint.allowed", { n: hint.allowed.length, notes: hint.allowed.map(name).join(", ") }) : t("ui.wtc.hint.none")}{" "}
              {hint.written && (hint.faults.length ? <span className="hint-bad">{t("ui.wtc.hint.yoursBad", { note: name(hint.written) })} {t(`ui.${hint.faults[0].messageKey}`, { interval: hint.faults[0].detail?.interval ?? "" })}</span> : <span className="hint-ok">{t("ui.wtc.hint.yoursOk", { note: name(hint.written) })}</span>)}
            </span>
            <button className="hint-close" onClick={() => setHintOn(false)} aria-label={t("ui.close")} title={t("ui.close")}>×</button>
          </div>
        )}
        <div className="controls">
          <div className="group write" role="group">
            <button className="btn-acc" onClick={() => line[selected] && write(selected, alterPitch(line[selected]!, -1), false)} aria-label="flat" title={t("ui.accidental.flat.help")} disabled={ex === "study" || ex === "mutation"}>♭</button>
            <button className="btn-acc" onClick={() => line[selected] && write(selected, alterPitch(line[selected]!, 0), false)} aria-label="natural" title={t("ui.accidental.natural.help")} disabled={ex === "study" || ex === "mutation"}>♮</button>
            <button className="btn-acc" onClick={() => line[selected] && write(selected, alterPitch(line[selected]!, 1), false)} aria-label="sharp" title={t("ui.accidental.sharp.help")} disabled={ex === "study" || ex === "mutation"}>♯</button>
            <button className="btn-edit" onClick={() => setLine(target.map(() => null))} disabled={ex === "study"} title={t("ui.clearAll.help")}>{t("ui.clearAll")}</button>
          </div>
          <div className="group judge">
            {ex !== "study" && (
              <button className="primary" aria-pressed={result !== null} onClick={evaluate} disabled={missing > 0 && !result} title={missing > 0 ? t("ui.evaluate.incomplete", { missing }) : undefined}>
                {t("ui.evaluate")}
                {missing > 0 && !result && <span className="badge">{missing}</span>}
              </button>
            )}
            {ex !== "study" && ex !== "mutation" && (
              <button className="chipbtn" aria-pressed={showBach} disabled={!bachOpen} onClick={() => setShowBach(!showBach)} title={t(bachOpen ? "ui.wtc.bachHelp" : "ui.wtc.bachLocked")}>
                {t(showBach ? "ui.wtc.bachHide" : "ui.wtc.bachShow")}
              </button>
            )}
            {ex === "study" && (
              <span className="values" role="radiogroup" aria-label={t("ui.wtc.view")}>
                <button className="chipbtn" role="radio" aria-checked={!whole} aria-pressed={!whole} onClick={() => (audio.stop(), setPlaying(false), setWhole(false))}>{t("ui.wtc.view.exposition")}</button>
                <button className="chipbtn" role="radio" aria-checked={whole} aria-pressed={whole} onClick={() => (audio.stop(), setPlaying(false), setWhole(true))} title={t("ui.wtc.view.wholeHelp")}>{t("ui.wtc.view.whole")}</button>
              </span>
            )}
            {ex === "counter" && (
              <button className="chipbtn" aria-pressed={hintOn} onClick={() => setHintOn(!hintOn)} title={t("ui.wtc.hint.help")}>{t("ui.hint.tool")}</button>
            )}
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <div className="play-split">
              <button className="icon play" onClick={() => play()} aria-label={t("ui.play.player")} title={t("ui.play.player")}>{playing ? "■" : "▶"}</button>
            </div>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.wtc.tempoHelp")} value={tempo} min={15} max={120} defaultValue={36} format={(v) => `♩=${Math.round(v * 2)}`} onChange={(v) => setTempo(Math.round(v))} />
              <HFader label={t("ui.volume")} help={t("ui.volume.help")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
            </div>
            <select className="sel" value={tuning} onChange={(e) => setTuning(e.target.value as TemperamentId)} aria-label={t("ui.tuning")} title={t("ui.wtc.tuningHelp")}>
              {WELL.map((x) => (
                <option key={x} value={x}>{t(`ui.tuning.${x}`)}</option>
              ))}
            </select>
            <select className="sel" value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)} aria-label={t("ui.wtc.instrument")}>
              {INSTRUMENTS.map((x) => (
                <option key={x} value={x}>{t(`ui.wtc.instrument.${x}`)}</option>
              ))}
            </select>
          </div>
        </div>
        </>
      }
      summary={result && (
        <div className={result.ev.passed ? "eval-summary ok" : "eval-summary bad"} role="status">
          <span className="verdict">{result.ev.passed ? `✓ ${t("ui.summary.passed")}` : `✗ ${t("ui.wtc.summaryFailed")}`}</span>
          <button className="link" onClick={() => setTab("evaluation")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={`J. S. Bach, Das wohltemperirte Clavier, ${roman(F.book)}, Fuga ${F.number} (BWV ${F.bwv}). Encoding: ASAP dataset (Foscarin et al. 2020), CC BY-NC-SA 4.0.`}
      tabs={[
        { id: "keys", text: true, label: t("ui.wtc.keys"), content: keyGrid },
        { id: "evaluation", text: true, label: t("ui.dock.evaluation"), content: feedback() },
        {
          id: "guide",
          text: true,
          label: t("ui.howtoTab"),
          content: (
            <div className="guide wtc-guide">
              <h3>{fugueLabel(F)}</h3>
              {facts}
              <p>{t(`ui.wtc.intro.${ex}`)}</p>
              <p className="help">{t(`ui.wtc.how.${ex}`)}</p>
              <p className="help">{t("ui.wtc.keysHow")}</p>
              <h4>{t("ui.wtc.bridgeTitle")}</h4>
              <p>{t("ui.wtc.bridge")}</p>
              <p className="help">{t("ui.wtc.temperaments")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
