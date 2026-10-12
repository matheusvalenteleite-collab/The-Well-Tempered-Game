/**
 * The composer (docs/wtc/COMPOSE.md, first milestone): a two-voice fugue on the player's own
 * subject, in four steps.
 *   1. The subject: written in its own rhythm, key and metre, read against Bach's subjects.
 *   2. The answer: real or tonal (the options by Bach's rules), any note mutated by hand; where it
 *      enters.
 *   3. The countersubject: written against the answer, judged where it stands, inverted, and
 *      against the subject at home.
 *   4. The fugue: the plan laid out (exposition, episode, the subject in the relative key, episode,
 *      the last entry, a close); the player writes the free passages and may retouch the entries;
 *      the whole is judged, and read back by the analysis of the 48. Played, saved, exported.
 * Nothing is composed for the player: the machine places what the earlier steps decided, and judges.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Mode } from "./Root.tsx";
import { ModeSelect } from "./ModeSelect.tsx";
import { keyBelongsToControl } from "./keys.ts";
import { Shell } from "./Shell.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { HFader } from "./HFader.tsx";
import { WtcScore, type WtcScoreNote, type WtcScoreVoice } from "./notation/WtcScore.tsx";
import { ZOOM_MAX, ZOOM_MIN } from "./notation/zoom.ts";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import { restoreSound } from "../audio/sound.ts";
import { SYNTH_PRESETS } from "../audio/synth-settings.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { parsePitch, type Step } from "../music/pitch.ts";
import { FUGUES, KEY_ORDER, keyName, keySignature, isMinor, type WtcNote } from "../wtc/fugues.ts";
import { answerOptions, answerNotes, answerWith, bachChoice, entryPoints, fourthsOf, placeAnswer, refreshAnswer, type AnswerOption } from "../wtc/compose/answer.ts";
import { barQuarters, emptyDraft, EPS, lengthOf, toNotes, type Ev, type FugueDraft } from "../wtc/compose/model.ts";
import { judgeSubject, type Remark } from "../wtc/compose/subject.ts";
import { placings, type PlacingResult } from "../wtc/compose/invertible.ts";
import { ready, realise, type Part } from "../wtc/compose/plan.ts";
import { judgeFugue } from "../wtc/compose/judge.ts";
import { fugueMidi } from "../wtc/compose/midi.ts";
import { asEvents, type Proposal } from "../wtc/compose/generate.ts";
import { proposeCodetta, proposeCountersubject, proposeFree } from "../wtc/compose/proposals.ts";
import { alterPitch, insert, isDotted, lengthen, letterPitch, nearBefore, remove, setDur, setPitch, stepPitch, toggleDot, VALUES, pretty } from "../wtc/compose/edit.ts";
import type { CpViolation } from "../wtc/counterpoint.ts";

type StepId = "subject" | "answer" | "counter" | "fugue";
const STEPS: StepId[] = ["subject", "answer", "counter", "fugue"];
/** What the editor is writing: a line of events, or the pitches of a planned entry. */
type Target = { kind: "subject" } | { kind: "cs" } | { kind: "free"; slot: string } | { kind: "entry"; slot: string };
const TIMES = ["4/4", "2/4", "3/4", "2/2", "3/2", "3/8", "6/8", "9/8", "12/8"];
const INK_GIVEN = "var(--trk-cantus, #222)";
const INK_EDIT = "var(--trk-counterpoint)";
const INK_OTHER = "var(--trk-second)";
const INK_BAD = "var(--bad-ink, #c62828)";
const VALUE_GLYPH = ["𝅘𝅥𝅯", "♪", "♩", "𝅗𝅥", "𝅝"];
const vexKey = (key: string) => (isMinor(key) ? `${key[0].toUpperCase()}${key.slice(1)}m` : key);
const sameTarget = (a: Target | null, b: Target) => !!a && a.kind === b.kind && ("slot" in a ? a.slot === (b as { slot: string }).slot : true);
const valid = (v: unknown): v is FugueDraft => typeof v === "object" && v !== null && (v as FugueDraft).version === 1 && Array.isArray((v as FugueDraft).subject);
interface Saved {
  name: string;
  at: number;
  draft: FugueDraft;
}

/** A starting subject: the head of Book I no. 2's (C minor), so the screen is never blank. */
function starter(): FugueDraft {
  const d = emptyDraft("c", "4/4");
  d.phase = 0.5;
  d.subject = [
    ["C5", 0.25], ["B4", 0.25], ["C5", 0.5], ["G4", 0.5], ["Ab4", 0.5], ["C5", 0.25], ["B4", 0.25], ["C5", 0.5], ["D5", 0.5],
    ["G4", 0.5], ["C5", 0.25], ["B4", 0.25], ["C5", 0.5], ["D5", 0.5], ["F4", 0.25], ["G4", 0.25], ["Ab4", 1], ["G4", 0.25], ["F4", 0.25], ["Eb4", 0.5],
  ].map(([pitch, dur]) => ({ pitch: pitch as string, dur: dur as number }));
  d.first = 0;
  return d;
}

export function ComposeApp({ onVoices, onStudy, onExercises, onTutorial }: { onVoices(n: Mode): void; onStudy(): void; onExercises(): void; onTutorial?: (lessonId?: string) => void }) {
  const [d, setD] = useState<FugueDraft>(() => stored<FugueDraft>("wtg.composeDraft", starter(), valid));
  useEffect(() => store("wtg.composeDraft", d), [d]);
  const [saved, setSaved] = useState<Saved[]>(() => stored<Saved[]>("wtg.composeSaved", [], (v) => Array.isArray(v)));
  useEffect(() => store("wtg.composeSaved", saved), [saved]);
  const [step, setStep] = useState<StepId>(() => stored<StepId>("wtg.composeStep", "subject", (v) => STEPS.includes(v as StepId)));
  useEffect(() => store("wtg.composeStep", step), [step]);
  const [target, setTarget] = useState<Target | null>({ kind: "subject" });
  const [sel, setSel] = useState(0);
  const [dur, setDurValue] = useState(0.5);
  const [tab, setTab] = useState("guide");
  const [tempo, setTempo] = useState(() => stored("wtg.wtcTempo", 36, (v) => typeof v === "number" && v >= 15 && v <= 120));
  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.wtcTempo", tempo);
  }, [tempo]);
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
  /** The machine's proposals for the line being written (M2), and the player's own line to go back to. */
  const [offer, setOffer] = useState<{ key: string; seed: number; list: { evs: Ev[]; faults: number }[]; mine: Ev[] } | null>(null);
  /** In the fugue: one section on the staff (the one being written), or the whole. */
  const [whole, setWhole] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);
  useEffect(() => {
    audio.loop = false;
    audio.drums = false;
    const s = restoreSound(null);
    const preset = SYNTH_PRESETS.find((p) => p.id === "harpsichord")!.settings;
    for (const c of ["cantus", "counterpoint", "second", "fux"] as const) s.synth[c] = { ...preset };
    s.mix.counterpoint.pan = -0.15;
    s.mix.second.pan = 0.15;
    audio.setSoundState(s);
    audio.setGates({ counterpoint: true, second: true, fux: true, continuo: false });
    return () => audio.stop();
  }, []);

  const bar = barQuarters(d.time);
  const subject = useMemo(() => toNotes(d.subject), [d.subject]);
  const remarks = useMemo(() => judgeSubject(d), [d]);
  const subjectOk = !remarks.some((r) => r.severity === "error");
  const options = useMemo<AnswerOption[]>(() => (subjectOk ? answerOptions(subject, d.key, d.time) : []), [subjectOk, subject, d.key, d.time]);
  const points = useMemo(() => entryPoints(d), [d]);
  const placed = useMemo<PlacingResult[]>(() => placings(d), [d]);
  const realised = useMemo(() => (ready(d) ? realise(d) : null), [d]);
  const report = useMemo(() => (realised ? judgeFugue(d, realised) : null), [d, realised]);
  const allowed = (s: StepId) => s === "subject" || (s === "answer" && subjectOk) || (s === "counter" && subjectOk && !!d.answer) || (s === "fugue" && ready(d));

  /** Change the draft; a changed subject carries its answer along (or drops it). */
  const change = (next: FugueDraft) => {
    audio.stop();
    setPlaying(false);
    setD(next.subject !== d.subject ? refreshAnswer(next, subject) : next);
  };

  // ---- The editor: the events of the target, where they start, and the planned entry's notes.
  const codettaSlot = `expo:${d.first}:0`;
  const codettaFrom = d.phase + lengthOf(d.subject);
  const freePart = (slot: string): Part | undefined => realised?.parts.find((p) => p.slot === slot && p.kind === "free");
  const eventsOf = (tg: Target): Ev[] => (tg.kind === "subject" ? d.subject : tg.kind === "cs" ? d.countersubject : tg.kind === "free" ? d.free[tg.slot] ?? [] : []);
  /** Where the target's first event stands, and how much room it has (the codetta's before the plan exists). */
  const originOf = (tg: Target): number => {
    if (tg.kind === "subject") return d.phase;
    if (tg.kind === "cs") return d.phase + (d.answer?.at ?? 0);
    return freePart(tg.slot)?.from ?? (tg.slot === codettaSlot ? codettaFrom : 0);
  };
  const roomOf = (tg: Target): number => {
    if (tg.kind === "cs") return lengthOf(d.subject);
    if (tg.kind !== "free") return Infinity;
    const p = freePart(tg.slot);
    if (p) return p.to - p.from;
    return tg.slot === codettaSlot && d.answer ? d.phase + d.answer.at - codettaFrom : Infinity;
  };
  const writeEvents = (tg: Target, evs: Ev[]) => {
    if (tg.kind === "subject") change({ ...d, subject: evs });
    else if (tg.kind === "cs") change({ ...d, countersubject: evs });
    else if (tg.kind === "free") change({ ...d, free: { ...d.free, [tg.slot]: evs } });
  };
  /** The planned entry's notes (derived, with the player's retouches). */
  const entryPart = target?.kind === "entry" ? realised?.parts.find((p) => p.slot === target.slot && p.kind !== "free") : undefined;
  const retouch = (i: number, pitch: string | null) => {
    if (!entryPart || target?.kind !== "entry") return;
    const cur = d.touched[target.slot] ?? entryPart.notes.map(() => null);
    const next = cur.map((x, k) => (k === i ? pitch : x));
    change({ ...d, touched: { ...d.touched, [target.slot]: next } });
  };
  const evs = target ? eventsOf(target) : [];
  /** Where a first letter lands: near the voice's last note before the passage. */
  const fallback = (() => {
    if (!target || target.kind === "subject") return d.first === 0 ? "C5" : "C3";
    if (target.kind === "cs") return subject[subject.length - 1]?.pitch ?? "C4";
    const p = freePart(target.slot);
    const before = p && realised ? realised.voices[p.voice].filter((n) => n.at < p.from + EPS) : [];
    return before.length ? before[before.length - 1].pitch : target.slot === codettaSlot ? subject[subject.length - 1]?.pitch ?? "C4" : "C4";
  })();

  const audition = (pitch: string | null) => {
    if (!pitch) return;
    void audio.playSequence([{ slot: 0, at: 0, length: Math.min(1, dur) / 4, cantus: null, counterpoint: null, extra: [{ channel: "counterpoint", pitch }] }]);
  };
  const editAt = (i: number, f: (evs: Ev[]) => Ev[], advance = false, sound?: string | null) => {
    if (!target || target.kind === "entry") return;
    const next = f(eventsOf(target));
    writeEvents(target, next);
    if (sound !== undefined) audition(sound);
    setSel(advance ? Math.min(next.length, i + 1) : Math.min(i, next.length));
  };
  const writeLetter = (step: Step) => {
    if (!target) return;
    if (target.kind === "entry") {
      if (!entryPart) return;
      const p = letterPitch(step, keyOfPart(entryPart), entryPart.notes[sel]?.pitch ?? "C4");
      retouch(sel, p);
      audition(p);
      setSel(Math.min(entryPart.notes.length - 1, sel + 1));
      return;
    }
    const cur = evs[sel]?.pitch ?? null;
    const p = letterPitch(step, d.key, cur ?? nearBefore(evs, sel, fallback));
    editAt(sel, (e) => setPitch(e, sel, p, dur), true, p);
  };
  const keyOfPart = (p: Part) => realised?.sections.find((s) => s.id === p.section)?.key ?? d.key;
  const modify = (f: (p: string) => string) => {
    if (target?.kind === "entry") {
      const cur = entryPart?.notes[sel]?.pitch;
      if (cur) {
        retouch(sel, f(cur));
        audition(f(cur));
      }
      return;
    }
    const cur = evs[sel]?.pitch;
    if (cur) editAt(sel, (e) => setPitch(e, sel, f(cur), dur), false, f(cur));
  };
  const chooseValue = (v: number) => {
    setDurValue(v);
    if (target && target.kind !== "entry" && sel < evs.length) editAt(sel, (e) => setDur(e, sel, v));
  };

  // ---- Keys: letters write, digits choose the value, arrows move and correct.
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const tg = e.target as HTMLElement | null;
    if (tg && /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)) return;
    if (keyBelongsToControl(e)) return;
    const k = e.key;
    const len = target?.kind === "entry" ? (entryPart?.notes.length ?? 0) : evs.length + 1;
    if (k === " ") play();
    else if (!target) return;
    else if (k === "ArrowRight") setSel(Math.min(len - 1, sel + 1));
    else if (k === "ArrowLeft") setSel(Math.max(0, sel - 1));
    else if (/^[a-gA-G]$/.test(k)) writeLetter(k.toUpperCase() as Step);
    else if (k === "ArrowUp" || k === "ArrowDown") modify((p) => stepPitch(p, (k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 7 : 1), target.kind === "entry" && entryPart ? keyOfPart(entryPart) : d.key));
    else if (k === "#") modify((p) => alterPitch(p, 1));
    else if (k === "-") modify((p) => alterPitch(p, -1));
    else if (k === "n") modify((p) => alterPitch(p, 0));
    else if (target.kind === "entry") {
      if (k === "Backspace" || k === "Delete") retouch(sel, null);
      else return;
    } else if (/^[1-5]$/.test(k)) chooseValue(VALUES[Number(k) - 1]);
    else if (k === ".") editAt(sel, (x) => toggleDot(x, sel));
    else if (k === "t" || k === "T") editAt(sel, (x) => lengthen(x, sel, dur));
    else if (k === "r" || k === "R") editAt(sel, (x) => setPitch(x, sel, null, dur), true);
    else if (k === "i" || k === "I") editAt(sel, (x) => insert(x, sel));
    else if (k === "Backspace") editAt(Math.max(0, sel - (sel >= evs.length ? 1 : 0)), (x) => remove(x, sel >= evs.length ? evs.length - 1 : sel));
    else if (k === "Delete") editAt(sel, (x) => remove(x, sel));
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

  // ---- What the score shows at each step.
  /** A voice's staff: the upper voice on the treble staff; the lower on the bass staff unless it lies high (both then share the treble). */
  const staffOf = (notes: WtcScoreNote[], voice: 0 | 1): 0 | 1 => {
    const ps = notes.filter((n) => n.pitch).map((n) => parsePitch(n.pitch!).midi);
    if (!ps.length || voice === 0) return voice;
    return ps.reduce((a, b) => a + b, 0) / ps.length >= 62 ? 0 : 1;
  };
  const voice = (notes: WtcScoreNote[], v: 0 | 1, ink: string, editable: boolean): WtcScoreVoice => ({ notes, staff: staffOf(notes, v), ink, editable });
  const lineNotes = (ns: WtcNote[], ink?: string, label?: string): WtcScoreNote[] => ns.map((n, i) => ({ pitch: n.pitch, at: n.at, dur: n.dur, ...(ink ? { ink } : {}), ...(i === 0 && label ? { label } : {}) }));
  /** The target's events as slots (rests as gaps), and a grey slot where the next note goes. */
  const editableNotes = (tg: Target): WtcScoreNote[] => {
    const evs = eventsOf(tg);
    const o = originOf(tg);
    const out: WtcScoreNote[] = [];
    let at = o;
    evs.forEach((e, i) => {
      if (e.pitch) out.push({ pitch: e.pitch, at, dur: e.dur, slot: i, ink: INK_EDIT });
      at += e.dur;
    });
    if (at - o < roomOf(tg) - EPS) out.push({ pitch: null, at, dur: Math.min(dur, roomOf(tg) - (at - o)), slot: evs.length });
    return out;
  };
  /** The stretch of the fugue on the staff: the section being written, from its first bar line. */
  const view = useMemo(() => {
    if (step !== "fugue" || !realised || whole) return { from: 0, to: Infinity };
    const part = target && "slot" in target ? realised.parts.find((p) => p.slot === target.slot) : undefined;
    const sec = realised.sections.find((x) => x.id === (part?.section ?? "expo"))!;
    return { from: Math.floor(sec.from / bar + EPS) * bar, to: sec.to };
  }, [step, realised, whole, target, bar]);
  const faultAt = (vs: CpViolation[], at: number) => vs.some((v) => v.severity === "error" && Math.abs(v.at - at) < EPS);
  const voices: WtcScoreVoice[] = useMemo(() => {
    const first = d.first;
    const other = (1 - first) as 0 | 1;
    const editing = (tg: Target) => sameTarget(target, tg);
    /** Within a shared staff the higher voice first (stems up): the first-stated voice's order by register. */
    const order = (vs: WtcScoreVoice[]) => (first === 1 ? [vs[1], vs[0]] : vs);
    const subj: WtcScoreNote[] = step === "subject" ? editableNotes({ kind: "subject" }) : lineNotes(toNotes(d.subject, d.phase), INK_GIVEN, t("ui.wtc.part.subject"));
    if (step === "subject") return [voice(subj, first, INK_EDIT, true)];
    const ans = answerNotes(d).map((n) => ({ ...n, at: n.at + d.phase }));
    const fourths = d.answer ? fourthsOf(subject, d.answer.pitches) : new Set<number>();
    const ansNotes: WtcScoreNote[] = ans.map((n, i) => ({ pitch: n.pitch, at: n.at, dur: n.dur, ...(step === "answer" ? { slot: i, ink: INK_EDIT } : { ink: INK_OTHER }), ...(fourths.has(i) ? { mark: t("ui.wtc.mutationMark") } : {}), ...(i === 0 ? { label: t("ui.wtc.part.answer") } : {}) }));
    if (step === "answer") return order([voice(subj, first, INK_GIVEN, false), voice(ansNotes, other, INK_EDIT, true)]);
    if (step === "counter") {
      const written = placed.find((p) => p.placing === "written");
      const cs = (editing({ kind: "cs" }) ? editableNotes({ kind: "cs" }) : lineNotes(toNotes(d.countersubject, d.phase + d.answer!.at), INK_OTHER)).map((n) => ({ ...n, ...(n.pitch && written && faultAt(written.violations, n.at - d.phase - d.answer!.at) ? { ink: INK_BAD, mark: "✗" } : {}) }));
      const codettaRoom = d.answer!.at - lengthOf(d.subject);
      const codetta = codettaRoom > EPS ? (editing({ kind: "free", slot: codettaSlot }) ? editableNotes({ kind: "free", slot: codettaSlot }) : lineNotes(toNotes(d.free[codettaSlot] ?? [], codettaFrom), INK_OTHER)) : [];
      if (cs[0]) cs[0] = { ...cs[0], label: t("ui.wtc.part.countersubject") };
      return order([voice([...subj, ...codetta, ...cs], first, INK_EDIT, true), voice(ansNotes, other, INK_GIVEN, false)]);
    }
    // The fugue: every part; the one being written with its slots.
    if (!realised) return [];
    const faults = report?.faults ?? [];
    return ([0, 1] as const).map((v) => {
      const notes: WtcScoreNote[] = [];
      for (const p of realised.parts.filter((x) => x.voice === v)) {
        const tg: Target = p.kind === "free" ? { kind: "free", slot: p.slot } : { kind: "entry", slot: p.slot };
        if (editing(tg) && p.kind === "free") {
          notes.push(...editableNotes(tg));
          continue;
        }
        const ink = editing(tg) ? INK_EDIT : p.kind === "free" ? INK_OTHER : INK_GIVEN;
        p.notes.forEach((n, i) => {
          const bad = faults.some((f) => f.voice === v && f.severity === "error" && Math.abs(f.at - n.at) < EPS);
          const label = i === 0 && p.kind !== "free" ? t(`ui.compose.part.${p.kind}`) : undefined;
          notes.push({ pitch: n.pitch, at: n.at, dur: n.dur, ink: bad ? INK_BAD : ink, ...(bad ? { mark: "✗" } : {}), ...(editing(tg) ? { slot: i } : {}), ...(label ? { label } : {}) });
        });
      }
      const shown = notes
        .filter((n) => n.at < view.to - EPS && n.at + n.dur > view.from + EPS)
        .map((n) => ({ ...n, at: Math.max(n.at, view.from) - view.from, dur: Math.min(n.at + n.dur, view.to) - Math.max(n.at, view.from) }));
      return voice(shown.sort((a, b) => a.at - b.at), v, INK_GIVEN, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, step, target, dur, placed, realised, report, sel, view]);

  const onSlot = (slot: number, pitch: string | null) => {
    setSel(slot);
    if (step === "answer") {
      // A tap on a note of the answer: a fifth up or a fourth up.
      if (!d.answer) return;
      const f = fourthsOf(subject, d.answer.pitches);
      if (f.has(slot)) f.delete(slot);
      else f.add(slot);
      const pitches = placeAnswer(answerWith(subject, f), d);
      change({ ...d, answer: { ...d.answer, pitches } });
      audition(pitches[slot]);
      return;
    }
    if (!target) return;
    if (target.kind === "entry") {
      if (pitch) {
        retouch(slot, pitch);
        audition(pitch);
      }
      return;
    }
    if (pitch) editAt(slot, (e) => setPitch(e, slot, pitch, dur), false, pitch);
    else audition(evs[slot]?.pitch ?? null);
  };

  // ---- Playback.
  const scoreLines = (): WtcNote[][] => {
    if (step === "fugue" && realised) return realised.voices;
    const v: WtcNote[][] = [[], []];
    v[d.first] = toNotes(d.subject, d.phase);
    if (step !== "subject" && d.answer) {
      v[1 - d.first] = answerNotes(d).map((n) => ({ ...n, at: n.at + d.phase }));
      if (step === "counter") v[d.first] = [...v[d.first], ...(d.answer.at > lengthOf(d.subject) + EPS ? toNotes(d.free[codettaSlot] ?? [], codettaFrom) : []), ...toNotes(d.countersubject, d.phase + d.answer.at)];
    }
    return v;
  };
  const playLines = (lines: WtcNote[][]) => {
    if (playing) {
      audio.stop();
      setPlaying(false);
      setCursor(-1);
      return;
    }
    const events: PlayEvent[] = [];
    lines.forEach((l, v) => l.forEach((n) => events.push({ slot: Math.floor(n.at / bar + EPS), at: n.at / 4, length: n.dur / 4, cantus: null, counterpoint: null, extra: [{ channel: v === 0 ? "counterpoint" : "second", pitch: n.pitch }] })));
    events.sort((a, b) => a.at - b.at);
    if (!events.length) return;
    const t0 = events[0].at;
    for (const e of events) e.at -= t0;
    setPlaying(true);
    void audio.playAll(events, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    });
  };
  const play = () => playLines(scoreLines());

  // ---- Saving and export.
  const title = () => t("ui.compose.title", { key: keyName(d.key) });
  const saveAs = () => {
    const name = window.prompt(t("ui.compose.saveName"), title());
    if (!name) return;
    setSaved([{ name, at: Date.now(), draft: d }, ...saved.filter((s) => s.name !== name)]);
  };
  const download = (data: BlobPart, type: string, name: string) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportMidi = () => {
    if (!realised) return;
    download(fugueMidi(realised.voices, { key: d.key, time: d.time, tempo: tempo * 2, title: title() }).buffer as ArrayBuffer, "audio/midi", `fugue-${d.key.replace("#", "s")}.mid`);
  };

  const go = (s: StepId) => {
    if (!allowed(s)) return;
    audio.stop();
    setPlaying(false);
    setStep(s);
    setSel(0);
    setTarget(s === "subject" ? { kind: "subject" } : s === "counter" ? { kind: "cs" } : null);
    if (s === "answer" && !d.answer && options.length) {
      const at = points[0];
      if (at !== undefined) change({ ...d, answer: { pitches: placeAnswer(bachChoice(options).pitches, d), at } });
    }
    setTab("guide");
  };

  // ---- The panels.
  const message = (v: CpViolation) => (
    <>
      {t(`ui.${v.messageKey}`, { interval: v.detail?.interval ?? "" })}
      {v.detail?.bach && <> {t(Number(v.detail.bachCount) > 1 ? "ui.wtc.licence" : "ui.wtc.licenceOnce", { where: v.detail.bach, n: v.detail.bachCount })}</>}
    </>
  );
  const barNo = (abs: number) => Math.floor(abs / bar + EPS) + 1;
  const fugueOf = (id: string) => {
    const f = FUGUES.find((x) => x.id === id);
    return f ? `${f.book === 1 ? "I" : "II"}/${f.number} (${keyName(f.key)})` : id;
  };
  const remark = (r: Remark, i: number) => (
    <li key={i} className={r.severity === "error" ? "bad" : r.severity === "advice" ? "warn" : undefined}>
      {r.severity === "error" ? "✗ " : r.severity === "advice" ? "! " : "· "}
      {t(`ui.${r.key}`, r.vars)}
      {r.examples.length > 0 && <span className="help"> {t("ui.compose.examples", { list: r.examples.map(fugueOf).join(", ") })}</span>}
    </li>
  );
  const valuePalette = (
    <span className="values" role="radiogroup" aria-label={t("ui.compose.value")}>
      {VALUES.map((v, i) => (
        <button key={v} className="chipbtn" role="radio" aria-checked={Math.abs(dur - v) < EPS} aria-pressed={Math.abs(dur - v) < EPS} onClick={() => chooseValue(v)} title={t("ui.compose.valueKey", { k: i + 1 })}>{VALUE_GLYPH[i]}</button>
      ))}
      <button className="chipbtn" aria-pressed={sel < evs.length && isDotted(evs[sel]?.dur ?? 0)} onClick={() => editAt(sel, (x) => toggleDot(x, sel))} title={t("ui.compose.dot")}>·</button>
      <button className="chipbtn" onClick={() => editAt(sel, (x) => setPitch(x, sel, null, dur), true)} title={t("ui.compose.rest")}>𝄽</button>
      <button className="chipbtn" onClick={() => editAt(sel, (x) => lengthen(x, sel, dur))} title={t("ui.compose.tie")}>⁀</button>
    </span>
  );
  const editTools = target && (
    <div className="group write" role="group">
      <button className="btn-acc" onClick={() => modify((p) => alterPitch(p, -1))} aria-label="flat" title={t("ui.accidental.flat.help")}>♭</button>
      <button className="btn-acc" onClick={() => modify((p) => alterPitch(p, 0))} aria-label="natural" title={t("ui.accidental.natural.help")}>♮</button>
      <button className="btn-acc" onClick={() => modify((p) => alterPitch(p, 1))} aria-label="sharp" title={t("ui.accidental.sharp.help")}>♯</button>
      <button className="btn-acc" onClick={() => modify((p) => stepPitch(p, 7, d.key))} title={t("ui.compose.octaveUp")}>8va</button>
      <button className="btn-acc" onClick={() => modify((p) => stepPitch(p, -7, d.key))} title={t("ui.compose.octaveDown")}>8vb</button>
      {target.kind !== "entry" && valuePalette}
      {target.kind !== "entry" && <button className="btn-edit" onClick={() => editAt(sel, (x) => remove(x, sel))} title={t("ui.compose.deleteHelp")}>{t("ui.compose.delete")}</button>}
      {target.kind === "entry" && <button className="btn-edit" onClick={() => change({ ...d, touched: Object.fromEntries(Object.entries(d.touched).filter(([k]) => k !== target.slot)) })}>{t("ui.compose.restore")}</button>}
    </div>
  );

  const setup = (
    <div className="compose-setup">
      <label>{t("ui.compose.key")} <select className="sel" value={d.key} onChange={(e) => change({ ...d, key: e.target.value })}>{KEY_ORDER.map((k) => <option key={k} value={k}>{keyName(k)}</option>)}</select></label>{" "}
      <label>{t("ui.compose.time")} <select className="sel" value={d.time} onChange={(e) => change({ ...d, time: e.target.value, phase: 0 })}>{TIMES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>{" "}
      <label>{t("ui.compose.upbeat")} <select className="sel" value={d.phase} onChange={(e) => change({ ...d, phase: Number(e.target.value) })}>{Array.from({ length: Math.round(bar / 0.25) }, (_, i) => i * 0.25).map((x) => <option key={x} value={x}>{x === 0 ? t("ui.compose.downbeat") : t("ui.compose.after", { q: x })}</option>)}</select></label>{" "}
      <label>{t("ui.compose.firstVoice")} <select className="sel" value={d.first} onChange={(e) => change({ ...d, first: Number(e.target.value) as 0 | 1 })}><option value={0}>{t("ui.compose.upper")}</option><option value={1}>{t("ui.compose.lower")}</option></select></label>{" "}
      <label>{t("ui.compose.load")} <select className="sel" value="" onChange={(e) => {
        const f = FUGUES.find((x) => x.id === e.target.value);
        if (!f) return;
        const s0 = f.subject[0].at;
        const evs: Ev[] = [];
        let at = s0;
        for (const n of f.subject) {
          if (n.at > at + EPS) evs.push({ pitch: null, dur: n.at - at });
          evs.push({ pitch: n.pitch, dur: n.dur });
          at = n.at + n.dur;
        }
        setD({ ...emptyDraft(f.key, f.time), phase: f.phase, subject: evs, first: f.answerAbove ? 1 : 0 });
        setSel(0);
      }}>
        <option value="">—</option>
        {FUGUES.map((f) => <option key={f.id} value={f.id}>{fugueOf(f.id)}</option>)}
      </select></label>{" "}
      <button className="chipbtn" onClick={() => (window.confirm(t("ui.compose.newConfirm")) ? (setD({ ...emptyDraft(d.key, d.time), first: d.first }), setSel(0), setStep("subject"), setTarget({ kind: "subject" })) : undefined)}>{t("ui.compose.new")}</button>
    </div>
  );

  const answerPanel = (
    <div>
      <p>{t("ui.compose.answer.intro")}</p>
      <div className="values" role="radiogroup">
        {options.map((o) => {
          const on = !!d.answer && placeAnswer(o.pitches, d).join() === d.answer.pitches.join();
          return (
            <button key={o.kind} className="chipbtn" role="radio" aria-checked={on} aria-pressed={on} onClick={() => change({ ...d, answer: { pitches: placeAnswer(o.pitches, d), at: d.answer?.at ?? points[0] } })} title={t(`ui.compose.answer.${o.kind}Help`)}>
              {t(`ui.compose.answer.${o.kind}`)}
            </button>
          );
        })}
      </div>
      {d.answer && (
        <p className="help">
          {(() => {
            const f = [...fourthsOf(subject, d.answer.pitches)].sort((a, b) => a - b);
            return f.length ? t("ui.compose.answer.mutated", { notes: f.map((i) => `${i + 1} (${pretty(subject[i].pitch.replace(/-?\d+$/, ""))} → ${pretty(d.answer!.pitches[i].replace(/-?\d+$/, ""))})`).join(", ") }) : t("ui.compose.answer.isReal");
          })()}
        </p>
      )}
      <label>{t("ui.compose.answer.enters")} <select className="sel" value={d.answer?.at ?? ""} onChange={(e) => d.answer && change({ ...d, answer: { ...d.answer, at: Number(e.target.value) } })}>
        {points.map((p) => <option key={p} value={p}>{t("ui.compose.answer.bar", { n: Math.round(p / bar) + 1, gap: p < lengthOf(d.subject) - EPS ? t("ui.compose.answer.onLast") : p > lengthOf(d.subject) + EPS ? t("ui.compose.answer.codetta") : "" })}</option>)}
      </select></label>
      <p className="help">{t("ui.compose.answer.how")}</p>
    </div>
  );

  // ---- Proposals (M2): for the countersubject, the codetta, a free passage.
  const offerKey = target ? (target.kind === "free" || target.kind === "entry" ? target.slot : target.kind) : "";
  const canOffer = !!target && (target.kind === "cs" || target.kind === "free");
  const ask = () => {
    if (!target || !canOffer) return;
    const seed = offer && offer.key === offerKey ? offer.seed + 1 : 1;
    let list: Proposal[] = [];
    let from = 0;
    if (target.kind === "cs") list = proposeCountersubject(d, seed);
    else if (target.kind === "free" && target.slot === codettaSlot && d.answer && d.answer.at > lengthOf(d.subject) + EPS) {
      list = proposeCodetta(d, seed);
      from = lengthOf(d.subject);
    } else if (target.kind === "free" && realised) {
      const part = freePart(target.slot);
      if (part) {
        list = proposeFree(d, realised, part, seed);
        from = part.from;
      }
    }
    const mine = offer && offer.key === offerKey ? offer.mine : eventsOf(target);
    setOffer({ key: offerKey, seed, list: list.map((p) => ({ evs: asEvents(p.notes, from), faults: p.faults })), mine });
  };
  const offerPanel = canOffer && (
    <div className="compose-offer">
      <button className="chipbtn" onClick={ask} title={t("ui.compose.proposeHelp")}>{offer && offer.key === offerKey ? t("ui.compose.proposeMore") : t("ui.compose.propose")}</button>{" "}
      {offer && offer.key === offerKey && (
        <>
          {offer.list.map((p, i) => (
            <button key={i} className="chipbtn" aria-pressed={JSON.stringify(eventsOf(target!)) === JSON.stringify(p.evs)} onClick={() => (writeEvents(target!, p.evs), setSel(0))} title={t("ui.compose.proposalHelp", { n: p.faults })}>
              {t("ui.compose.proposal", { n: i + 1 })}{p.faults ? ` (${p.faults} ✗)` : " ✓"}
            </button>
          ))}{" "}
          <button className="chipbtn" aria-pressed={JSON.stringify(eventsOf(target!)) === JSON.stringify(offer.mine)} onClick={() => writeEvents(target!, offer.mine)}>{t("ui.compose.yours")}</button>
          {!offer.list.length && <span className="help"> {t("ui.compose.noProposal")}</span>}
          <p className="help">{t("ui.compose.proposalNote")}</p>
        </>
      )}
    </div>
  );

  const counterPanel = (
    <div>
      <p>{t("ui.compose.counter.intro")}</p>
      {d.answer && d.answer.at > lengthOf(d.subject) + EPS && (
        <p>
          <button className="chipbtn" aria-pressed={target?.kind === "free"} onClick={() => (setTarget({ kind: "free", slot: codettaSlot }), setSel(0))}>{t("ui.compose.counter.codetta")}</button>{" "}
          <button className="chipbtn" aria-pressed={target?.kind === "cs"} onClick={() => (setTarget({ kind: "cs" }), setSel(0))}>{t("ui.wtc.part.countersubject")}</button>
        </p>
      )}
      {offerPanel}
      {placed.map((p) => (
        <section key={p.placing}>
          <h4>
            {t(`ui.compose.placing.${p.placing}`, { where: t(p.above ? "ui.compose.above" : "ui.compose.below") })}{" "}
            {p.violations.some((v) => v.severity === "error") ? "✗" : p.violations.length ? "!" : "✓"}{" "}
            <button className="chipbtn" onClick={() => playLines(p.above ? [p.line, p.given] : [p.given, p.line])}>{t("ui.compose.hear")}</button>
          </h4>
          <ul>
            {p.violations.map((v, i) => <li key={i} className={v.severity === "error" ? "bad" : "warn"}>{t("ui.compose.atNote", { n: v.note + 1 })} {message(v)}</li>)}
            {!p.violations.length && <li>{t("ui.compose.placing.clean")}</li>}
          </ul>
        </section>
      ))}
      <p className="help">{t("ui.compose.counter.why")}</p>
    </div>
  );

  const partLabel = (p: Part) => {
    const sec = realised!.sections.find((s) => s.id === p.section)!;
    return `${t(`ui.compose.section.${p.section}`, { key: keyName(sec.key) })} · ${t(p.voice === 0 ? "ui.compose.upper" : "ui.compose.lower")} · ${t(`ui.compose.part.${p.kind}`)} (${t("ui.compose.bars", { a: barNo(p.from), b: barNo(p.to - EPS) })})`;
  };
  const fuguePanel = realised && report && (
    <div>
      <p>
        {t("ui.compose.fugue.intro")}{" "}
        <button className="chipbtn" aria-pressed={whole} onClick={() => setWhole(!whole)} title={t("ui.compose.wholeHelp")}>{t("ui.compose.whole")}</button>
      </p>
      {!whole && view.from > 0 && <p className="help">{t("ui.compose.window", { bar: Math.round(view.from / bar) + 1 })}</p>}
      <ol className="compose-parts">
        {realised.sections.map((s) => (
          <li key={s.id}>
            <strong>{t(`ui.compose.section.${s.id}`, { key: keyName(s.key) })}</strong> <span className="help">{t("ui.compose.bars", { a: barNo(s.from), b: barNo(s.to - EPS) })}</span>
            {(s.id === "ep1" || s.id === "ep2" || s.id === "close") && (
              <select className="sel" value={s.id === "ep1" ? d.lengths.episode1 : s.id === "ep2" ? d.lengths.episode2 : d.lengths.close} aria-label={t("ui.compose.length")} onChange={(e) => change({ ...d, lengths: { ...d.lengths, [s.id === "ep1" ? "episode1" : s.id === "ep2" ? "episode2" : "close"]: Number(e.target.value) } })}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{t("ui.compose.nBars", { n })}</option>)}
              </select>
            )}
            <ul>
              {realised.parts.filter((p) => p.section === s.id).map((p) => {
                const tg: Target = p.kind === "free" ? { kind: "free", slot: p.slot } : { kind: "entry", slot: p.slot };
                const status = p.kind === "free" ? (report.overflow.includes(p) ? t("ui.compose.tooLong") : report.empty.includes(p) ? t("ui.compose.empty") : t("ui.compose.written")) : d.touched[p.slot] ? t("ui.compose.retouched") : "";
                return (
                  <li key={`${p.slot}:${p.from}`}>
                    <button className="link" aria-pressed={sameTarget(target, tg)} onClick={() => (setTarget(tg), setSel(0))}>{partLabel(p)}</button> <span className="help">{status}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      {target?.kind === "free" && offerPanel}
      <p className="help">{t("ui.compose.fugue.how")}</p>
    </div>
  );

  const evaluation = (
    <div className="feedback">
      {step === "subject" && <ul>{remarks.map(remark)}</ul>}
      {step === "answer" && answerPanel}
      {step === "counter" && counterPanel}
      {step === "fugue" && report && (
        <>
          <h4>{t("ui.compose.report.faults", { n: report.faults.filter((f) => f.severity === "error").length })}</h4>
          <ul>
            {report.faults.map((f, i) => (
              <li key={i} className={f.severity === "error" ? "bad" : "warn"}>
                <button className="link" onClick={() => f.part && (setTarget(f.part.kind === "free" ? { kind: "free", slot: f.part.slot } : { kind: "entry", slot: f.part.slot }), setSel(0))}>
                  {t("ui.compose.report.where", { bar: barNo(f.at), voice: t(f.voice === 0 ? "ui.compose.upper" : "ui.compose.lower") })}
                </button>{" "}
                {message(f)}
              </li>
            ))}
          </ul>
          {report.close.length > 0 && (
            <>
              <h4>{t("ui.compose.close.title")}</h4>
              <ul>{report.close.map(remark)}</ul>
            </>
          )}
          {report.empty.length > 0 && <p className="warn">{t("ui.compose.report.empty", { n: report.empty.length })}</p>}
          {report.overflow.length > 0 && <p className="warn">{t("ui.compose.report.overflow", { n: report.overflow.length })}</p>}
          <h4>{t("ui.compose.report.heard")}</h4>
          <p className="help">{t("ui.compose.report.heardHow")}</p>
          <ul>
            {report.heard.map((h, i) => (
              <li key={i}>{t(h.planned ? "ui.compose.report.planned" : "ui.compose.report.unplanned", { bar: barNo(h.at), voice: t(h.voice === 0 ? "ui.compose.upper" : "ui.compose.lower"), key: keyName(h.key), form: t(`ui.compose.form.${h.form}`) })}</li>
            ))}
            {report.missed.map((p, i) => <li key={`m${i}`} className="warn">{t("ui.compose.report.missed", { what: partLabel(p) })}</li>)}
          </ul>
        </>
      )}
    </div>
  );

  const savedPanel = (
    <div>
      <p>
        <button className="chipbtn" onClick={saveAs}>{t("ui.compose.save")}</button>{" "}
        <button className="chipbtn" onClick={exportMidi} disabled={!realised}>{t("ui.compose.midi")}</button>{" "}
        <button className="chipbtn" onClick={() => download(JSON.stringify(d, null, 1), "application/json", "fugue.json")}>{t("ui.compose.json")}</button>
      </p>
      <ul>
        {saved.map((s) => (
          <li key={s.name}>
            <button className="link" onClick={() => (setD(s.draft), setStep("subject"), setTarget({ kind: "subject" }), setSel(0))}>{s.name}</button>{" "}
            <span className="help">{new Date(s.at).toLocaleString()}</span>{" "}
            <button className="link" onClick={() => window.confirm(t("ui.compose.deleteSaved", { name: s.name })) && setSaved(saved.filter((x) => x !== s))}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );

  const guide = (
    <div className="guide">
      <h3>{t(`ui.compose.step.${step}`)}</h3>
      <p>{t(`ui.compose.intro.${step}`)}</p>
      {step === "subject" && setup}
      {step === "fugue" ? fuguePanel : step === "answer" ? answerPanel : step === "counter" ? counterPanel : null}
      <p className="help">{t(step === "answer" ? "ui.compose.keysAnswer" : step === "fugue" && target?.kind === "entry" ? "ui.compose.keysEntry" : "ui.compose.keys")}</p>
    </div>
  );

  const selInfo = target && target.kind !== "entry" && (
    <span className="help" aria-live="polite">
      {sel < evs.length ? t("ui.compose.selected", { n: sel + 1, what: evs[sel].pitch ? pretty(evs[sel].pitch!) : t("ui.compose.restName"), q: evs[sel].dur }) : t("ui.compose.appending", { n: sel + 1 })}
    </span>
  );

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <ModeSelect value="wtc" onMode={(m) => (audio.stop(), onVoices(m))} />
            <span className="values compose-steps" role="tablist" aria-label={t("ui.compose.steps")}>
              {STEPS.map((s, i) => (
                <button key={s} className="chipbtn" role="tab" aria-selected={step === s} aria-pressed={step === s} disabled={!allowed(s)} onClick={() => go(s)}>{`${i + 1} · ${t(`ui.compose.step.${s}`)}`}</button>
              ))}
            </span>
            <button className="chipbtn" onClick={() => (audio.stop(), onStudy())} title={t("ui.study.studyHelp")}>{t("ui.study.study")}</button>
            <button className="chipbtn" onClick={() => (audio.stop(), onExercises())} title={t("ui.study.exercisesHelp")}>{t("ui.study.exercises")}</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("guide")} onTutorial={onTutorial} onSave={saveAs} />
        </>
      }
      score={
        <div className="score-wrap wtc compose">
          {voices.length > 0 && voices.some((v) => v.notes.length) ? (
            <WtcScore
              voices={voices}
              keySig={vexKey(d.key)}
              signature={keySignature(d.key)}
              time={d.time}
              barQuarters={bar}
              selected={target || step === "answer" ? sel : null}
              cursor={cursor < 0 ? -1 : cursor - Math.round(view.from / bar)}
              label={title()}
              onSlot={onSlot}
              zoom={zoom}
              onZoom={setZoom}
              zoomLabels={{ in: t("ui.zoom.in"), out: t("ui.zoom.out"), reset: t("ui.zoom.reset") }}
            />
          ) : (
            <p className="help">{t("ui.compose.emptyScore")}</p>
          )}
        </div>
      }
      transport={
        <div className="controls">
          {editTools}
          {selInfo}
          <div className="group judge">
            {step !== "fugue" && (
              <button className="primary" disabled={!allowed(STEPS[STEPS.indexOf(step) + 1])} onClick={() => go(STEPS[STEPS.indexOf(step) + 1])}>{t("ui.compose.next")} ▸</button>
            )}
            {step === "fugue" && <button className="primary" onClick={exportMidi}>{t("ui.compose.midi")}</button>}
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <button className="icon play" onClick={play} aria-label={t("ui.play.player")} title={t("ui.play.player")}>{playing ? "■" : "▶"}</button>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.wtc.tempoHelp")} value={tempo} min={15} max={120} defaultValue={36} format={(v) => `♩=${Math.round(v * 2)}`} onChange={(v) => setTempo(Math.round(v))} />
            </div>
          </div>
        </div>
      }
      summary={
        step === "fugue" && report ? (
          <div className={report.faults.some((f) => f.severity === "error") || report.empty.length ? "eval-summary bad" : "eval-summary ok"} role="status">
            <span className="verdict">{t("ui.compose.summary", { faults: report.faults.filter((f) => f.severity === "error").length, empty: report.empty.length, heard: report.heard.filter((h) => h.planned).length, planned: report.heard.filter((h) => h.planned).length + report.missed.length })}</span>
            <button className="link" onClick={() => setTab("evaluation")}>{t("ui.summary.open")} ▸</button>
          </div>
        ) : undefined
      }
      tab={tab}
      onTab={setTab}
      idle={t("ui.compose.idle")}
      tabs={[
        { id: "guide", text: true, label: t("ui.howtoTab"), content: guide },
        { id: "evaluation", text: true, label: t("ui.dock.evaluation"), content: evaluation },
        { id: "saved", text: true, label: t("ui.compose.savedTab"), content: savedPanel },
      ]}
    />
  );
}
