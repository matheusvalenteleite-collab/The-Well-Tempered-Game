/**
 * The chorale workbench (C26, C27): one of Kittel's melodies harmonized from the top down on one
 * screen, in six stages whose answers stay in the score as it grows: the chord each phrase ends on
 * (1) and the chord under every note (2), written under the melody; the bass (3); Kittel's bass
 * nearest the player's, figured (4); the alto and tenor (5); their diminution (6). Each stage starts
 * from the answers before it, and each is compared with Kittel and Bach as the old levels were
 * (C4, C10-C12, C17-C19, C21): nothing is an error.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ModeSelect } from "./ModeSelect.tsx";
import type { Mode } from "./Root.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { HFader } from "./HFader.tsx";
import { TransportButtons } from "./TransportButtons.tsx";
import { EnsembleSelect } from "./EnsembleSelect.tsx";
import { CHORALE_CLEFS, setStaffLayout, useStaffLayout } from "./staff-layout.ts";
import { playChorale, playChoraleEvents, prepareChoraleAudio, type ChoraleNote } from "../audio/chorale-performance.ts";
import { Shell } from "./Shell.tsx";
import { WtcPage, planClefs, type WtcScoreVoice } from "./notation/WtcScore.tsx";
import { pageRows, useRowBars } from "./notation/page-rows.ts";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import { figureLabel } from "../counterpoint/interval.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { parsePitch, type Step } from "../music/pitch.ts";
import { BACH_REFS, CHORALES, comparePoints, frac, parseChord, pcOf, voiceChord, type Phrase, type PhraseVerdict } from "../chorale/level1.ts";
import { LEVEL2 } from "../chorale/level2.ts";
import { LEVEL3, bassPitch } from "../chorale/level3.ts";
import { LEVEL4, POSITIONS, points as points4, realise as realiseFigure } from "../chorale/level4.ts";
import { HABITS, LEVEL5, compareBach, judge, share, type Finding } from "../chorale/level5.ts";
import { augmentedSeconds, options as embOptions, realise as realiseLine, type Embellishment, type Note } from "../chorale/level6.ts";
import { workbenchId } from "../chorale/workbench.ts";

export type Stage = 1 | 2 | 3 | 4 | 5 | 6;
type Picks = Record<number, (string | null)[]>;
type Written = Record<string, { alto: (string | null)[]; tenor: (string | null)[] }>;
type Dim = Record<number, Record<number, Record<number, Embellishment>>>;

const UNIT = 32;
const MAJOR_BY_SIG: Record<number, string> = { [-7]: "Cb", [-6]: "Gb", [-5]: "Db", [-4]: "Ab", [-3]: "Eb", [-2]: "Bb", [-1]: "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#" };
const signatureOf = (n: number): Record<Step, number> => {
  const sig: Record<Step, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  const order: Step[] = n > 0 ? ["F", "C", "G", "D", "A", "E", "B"] : ["B", "E", "A", "D", "G", "C", "F"];
  for (let i = 0; i < Math.abs(n); i++) sig[order[i]] += n > 0 ? 1 : -1;
  return sig;
};
/** The inks: the given notes, the player's, Kittel's and Bach's, the warnings by gravity (C21). */
const INK = { given: "#1d1b17", mine: "#c2410c", alto: "#c04fd8", tenor: "#c2410c", kittel: "#5b6b2f", bach: "#1e6fd8", muted: "#8a8478" };
const GRAVE_INK: Record<1 | 2 | 3, string> = { 3: "#c4473a", 2: "#d35400", 1: "#b7950b" };
const VOICES6 = ["soprano", "alto", "tenor", "bass"] as const;
const isObj = (v: unknown) => typeof v === "object" && v !== null;

/** A stored object, kept in step with the store. */
function useStored<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => stored<T>(key, fallback, isObj));
  return [v, (x: T) => (setV(x), store(key, x))];
}

export function ChoraleWorkbench({ onMode, onTutorial, stage, onStage, stageSelect }: { onMode(mode: Mode): void; onTutorial?: () => void; stage: Stage; onStage(s: Stage): void; stageSelect(number: number): ReactNode }) {
  // The melody and Kittel's bass the player works on.
  const [number, setNumber] = useState(() => stored("wtg.chorale", 1, (v) => typeof v === "number" && CHORALES.some((c) => c.number === v)));
  useEffect(() => store("wtg.chorale", number), [number]);
  const ch = CHORALES.find((c) => c.number === number) ?? CHORALES[0];
  const l2 = LEVEL2[ch.number];
  const l3 = LEVEL3[ch.number];
  const l4 = LEVEL4[ch.number];
  const c5 = LEVEL5[ch.number];
  const [bassIdx, setBassIdx] = useState(() => stored("wtg.choraleBass", 0, (v) => typeof v === "number" && v >= 0 && v < 9));
  useEffect(() => store("wtg.choraleBass", bassIdx), [bassIdx]);
  const bassNo = Math.min(bassIdx, l4.basses.length - 1, c5.basses.length - 1);
  const b4 = l4.basses[bassNo];
  const B = c5.basses[bassNo];

  // The answers, stage by stage (the old levels' stores, so that nothing written is lost).
  const [p1, setP1] = useStored<Picks>("wtg.choralePicks", {});
  const [p2, setP2] = useStored<Picks>("wtg.choralePicks2", {});
  const [p3, setP3] = useStored<Picks>("wtg.choralePicks3", {});
  const [p4, setP4] = useStored<Picks>("wtg.choralePicks4", {});
  const [written, setWritten] = useStored<Written>("wtg.choraleVoices", {});
  const [dim, setDim] = useStored<Dim>("wtg.choraleDim", {});

  const mine1 = ch.phrases.map((_, k) => p1[ch.number]?.[k] ?? null);
  // Stage 2 starts from the cadence plan: the chord chosen at each phrase end stands under its note.
  const carried = useMemo(() => {
    const out = new Map<number, string>();
    ch.phrases.forEach((ph, k) => {
      const i = l2.notes.findIndex((n) => n.offset === ph.offset);
      if (i >= 0 && mine1[k]) out.set(i, mine1[k]!);
    });
    return out;
  }, [ch, l2, mine1]);
  const mine2 = l2.notes.map((_, i) => p2[ch.number]?.[i] ?? carried.get(i) ?? null);
  const mine3 = l3.notes.map((_, i) => p3[ch.number]?.[i] ?? null);
  const key4 = ch.number * 100 + bassNo;
  const mine4 = b4.notes.map((_, i) => p4[key4]?.[i] ?? null);
  const vkey = `${ch.number}-${bassNo}`;
  const nSlots = B.slots.length;
  const voices5 = written[vkey] && written[vkey].alto.length === nSlots ? written[vkey] : { alto: Array<string | null>(nSlots).fill(null), tenor: Array<string | null>(nSlots).fill(null) };
  const complete5 = voices5.alto.every(Boolean) && voices5.tenor.every(Boolean);
  const dimId = workbenchId(ch.number, bassNo);
  const mine6 = dim[dimId] ?? {};

  // Stage 4 starts, once per melody, on Kittel's bass closest to the player's own (stage 3).
  const closest = useMemo(() => {
    const chosen = l3.notes.map((n, i) => [n, mine3[i]] as const).filter(([, d]) => d);
    if (!chosen.length) return null;
    const score = l4.basses.map((b) => chosen.filter(([n, d]) => [...b.notes].reverse().find((x) => frac(x.offset) <= frac(n.offset) + 1e-9)?.degree === d).length);
    const best = score.indexOf(Math.max(...score));
    return { index: best, k: score[best], n: chosen.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l3, l4, JSON.stringify(mine3)]);
  useEffect(() => {
    if (stage !== 4 || !closest) return;
    const done = stored<number[]>("wtg.choraleBassAuto", [], Array.isArray);
    if (done.includes(ch.number)) return;
    store("wtg.choraleBassAuto", [...done, ch.number]);
    setBassIdx(closest.index);
  }, [stage, closest, ch.number]);

  // Time: the level-5 grid (32nds of a whole note), the score in quarters from the first full bar.
  const [num, den] = c5.meter.split("/").map(Number);
  const barUnits = (UNIT * num) / den;
  const shift = c5.pickup ? barUnits - c5.pickup : 0;
  const quarters = (u: number) => (u + shift) / 8;
  const unitsOf = (offset: string) => Math.round(frac(offset) * UNIT);
  const barOfUnits = (u: number) => Math.floor((u + shift) / barUnits);
  const barLabel = (u: number) => barOfUnits(u) + (c5.pickup ? 0 : 1);

  // The bass the player wrote (stage 3), each degree nearest the bass before, as long as its note.
  const myBass = useMemo(() => {
    let prev: number | null = null;
    return l3.notes.map((n, i) => {
      const d = mine3[i];
      const at = unitsOf(n.offset);
      const end = i + 1 < l3.notes.length ? unitsOf(l3.notes[i + 1].offset) : c5.length;
      if (!d) return { at, dur: end - at, pitch: null as string | null };
      const p = bassPitch(d, l3.tonic, prev);
      prev = parsePitch(p).midi;
      return { at, dur: end - at, pitch: p };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l3, JSON.stringify(mine3), c5.length]);
  // Kittel's bass. A small note (printed at the onset of the note it leads to) sounds in the second
  // half of the note before, as in the melody (level1.ts soundingMelody).
  const kittelBass = useMemo(() => {
    const at = b4.notes.map((n) => unitsOf(n.offset));
    for (let i = 1; i + 1 < at.length; i++) if (at[i] === at[i + 1] && at[i - 1] < at[i]) at[i] = at[i - 1] + Math.floor((at[i] - at[i - 1]) / 2);
    return b4.notes.map((n, i) => ({ at: at[i], dur: (i + 1 < at.length ? at[i + 1] : c5.length) - at[i], pitch: n.pitch }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b4, c5.length, shift]);

  // Stage 6: the player's voices of stage 5 over Kittel's bass, embellished.
  const base6: Note[][] = useMemo(
    () => (complete5 ? [c5.melody as Note[], B.slots.map((s, i) => [s.at, s.dur, voices5.alto[i]!] as Note), B.slots.map((s, i) => [s.at, s.dur, voices5.tenor[i]!] as Note), B.bass as Note[]] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [complete5, c5, B, JSON.stringify(voices5)],
  );
  const lines6: Note[][] = useMemo(() => base6.map((l, v) => (v === 0 ? l : realiseLine(l, mine6[v] ?? {}, c5.sig))), [base6, mine6, c5.sig]);

  // UI state.
  const [selected, setSelected] = useState<number | null>(0);
  const [compared, setCompared] = useState<string | null>(null);
  const [tab, setTab] = useState("compare");
  const [bachShown, setBachShown] = useState<number | null>(null);
  const bach = stage === 5 && bachShown !== null ? c5.bach[bachShown] ?? null : null;
  const rowBars = useRowBars();
  const openScore = useStaffLayout() === "open";
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
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const stop = () => {
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setPausedAt(null);
  };
  useEffect(() => () => stop(), []);
  useEffect(() => prepareChoraleAudio(audio), []);
  useEffect(() => {
    setSelected(stage === 6 ? null : 0);
    setCompared(null);
    setBachShown(null);
  }, [stage, ch.number, bassNo]);

  const cmpKey = `${stage}-${ch.number}-${bassNo}`;
  const showCompare = compared === cmpKey;

  // The points decided at stages 1-4, in level 1's shape, and the player's answers there.
  const points: Pick<Phrase, "kittel" | "bach" | "habit">[] = stage === 1 ? ch.phrases : stage === 2 ? l2.notes : stage === 3 ? l3.notes : stage === 4 ? points4(b4.notes, b4.label) : [];
  const mineNow = stage === 1 ? mine1 : stage === 2 ? mine2 : stage === 3 ? mine3 : stage === 4 ? mine4 : [];
  const verdicts = useMemo(() => comparePoints(points, mineNow), [points, mineNow]);
  const findings = useMemo(() => (stage === 5 && showCompare ? judge(B.slots, voices5.alto, voices5.tenor) : []), [stage, showCompare, B, voices5]);
  const worst = useMemo(() => {
    const m = new Map<number, Finding["gravity"]>();
    for (const f of findings) for (const s of f.slots) if (!m.has(s) || f.gravity > m.get(s)!) m.set(s, f.gravity);
    return m;
  }, [findings]);
  const aug6 = useMemo(() => (stage === 6 && showCompare ? [1, 2, 3].flatMap((v) => augmentedSeconds(lines6[v] ?? []).map((k) => ({ v, at: lines6[v][k][0] }))) : []), [stage, showCompare, lines6]);
  /** The marker colour of a stage 1-4 answer once compared (as the old levels drew them). */
  const pointInk = (i: number): string | undefined => {
    const v = verdicts[i];
    if (!v?.chosen) return undefined;
    if (!showCompare) return INK.mine;
    if (v.bach.some((b) => b.same)) return INK.bach;
    if (v.kittel.length) return INK.kittel;
    return GRAVE_INK[1];
  };

  // The score, as it stands at this stage.
  const view = useMemo(() => {
    const [S, A, T, Bs] = openScore ? [0, 1, 2, 3] : [0, 0, 1, 1];
    const voices: WtcScoreVoice[] = [];
    const under: { at: number; lines: string[]; ink?: string }[] = [];
    // The melody: the points of stages 1-3 are its notes.
    const pointAt = new Map<number, number>();
    if (stage === 1) ch.phrases.forEach((ph, k) => pointAt.set(unitsOf(ph.offset), k));
    if (stage === 2 || stage === 3) (stage === 2 ? l2 : l3).notes.forEach((n, i) => pointAt.set(unitsOf(n.offset), i));
    const melodySrc = stage === 6 && lines6.length ? lines6[0] : (c5.melody as Note[]);
    voices.push({
      staff: S,
      ink: INK.given,
      editable: stage <= 3,
      notes: melodySrc.map(([at, dur, pitch, f]) => {
        const k = pointAt.get(at);
        return { pitch, at: quarters(at), dur: dur / 8, fermata: Boolean(f), ...(k !== undefined ? { slot: k, ...(pointInk(k) ? { ink: pointInk(k) } : {}) } : {}) };
      }),
    });
    // The chords under the melody (stages 1-3): the harmony, or at phrase ends the cadence plan.
    if (stage <= 3) {
      if (stage === 1) ch.phrases.forEach((ph, k) => mine1[k] && under.push({ at: quarters(unitsOf(ph.offset)), lines: [mine1[k]!], ink: INK.mine }));
      else l2.notes.forEach((n, i) => mine2[i] && under.push({ at: quarters(unitsOf(n.offset)), lines: [mine2[i]!], ink: stage === 2 ? INK.mine : INK.muted }));
    }
    // The bass: the player's (stage 3), then Kittel's nearest it.
    if (stage === 3) {
      voices.push({ staff: Bs, ink: INK.mine, editable: false, notes: myBass.map((b) => ({ pitch: b.pitch, at: quarters(b.at), dur: b.dur / 8 })) });
    }
    if (stage === 4 || (stage === 5 && !bach)) {
      voices.push({
        staff: Bs,
        ink: INK.given,
        editable: stage === 4,
        notes: kittelBass.map((b, i) => ({ pitch: b.pitch, at: quarters(b.at), dur: b.dur / 8, ...(stage === 4 ? { slot: i, ...(pointInk(i) ? { ink: pointInk(i) } : {}) } : {}) })),
      });
    }
    if (stage === 4) {
      b4.notes.forEach((n, i) => {
        const lines = [mine4[i] ? mine4[i]!.split("/").map(figureLabel).join(" ") : "·"];
        if (showCompare) lines.push(n.printed ? n.printed.split("/").map(figureLabel).join(" ") : "–");
        under.push({ at: quarters(kittelBass[i].at), lines, ink: mine4[i] ? INK.mine : INK.muted });
      });
    }
    // The inner voices (stage 5), or Bach's setting in their place (C18).
    if (stage === 5) {
      if (bach) {
        const part = (v: 0 | 1 | 2) => c5.melody.flatMap(([at, dur], i) => (bach.inner[i] ? [{ pitch: bach.inner[i]![v], at: quarters(at), dur: dur / 8 }] : []));
        voices.push({ staff: A, ink: INK.bach, editable: false, notes: part(0) }, { staff: T, ink: INK.bach, editable: false, notes: part(1) }, { staff: Bs, ink: INK.bach, editable: false, notes: part(2) });
      } else {
        const slotNotes = (line: (string | null)[], base: number, ink: string) =>
          B.slots.map((s, i) => ({ pitch: line[i], at: quarters(s.at), dur: s.dur / 8, slot: base + i, ...(worst.has(i) && line[i] ? { ink: GRAVE_INK[worst.get(i)!] } : {}) }));
        voices.push({ staff: A, ink: INK.alto, editable: true, notes: slotNotes(voices5.alto, 0, INK.alto) }, { staff: T, ink: INK.tenor, editable: true, notes: slotNotes(voices5.tenor, nSlots, INK.tenor) });
        B.slots.filter((s) => s.printed).forEach((s) => under.push({ at: quarters(s.at), lines: s.printed.split("/").map(figureLabel) }));
      }
    }
    // The diminution (stage 6): the player's lines, a reduced note keeping its slot.
    if (stage === 6 && lines6.length) {
      [1, 2, 3].forEach((v) => {
        const baseLine = base6[v];
        voices.push({
          staff: [S, A, T, Bs][v],
          ink: INK.given,
          editable: true,
          notes: lines6[v].map(([at, dur, pitch]) => {
            const i = baseLine.findIndex((b) => b[0] === at);
            const bad = aug6.some((e) => e.v === v && e.at === at);
            return { pitch, at: quarters(at), dur: dur / 8, ...(i >= 0 ? { slot: v * 1000 + i } : {}), ...(bad ? { ink: GRAVE_INK[3] } : i < 0 ? { ink: INK.mine } : {}) };
          }),
        });
      });
    }
    const bars = Math.ceil((c5.length + shift) / barUnits);
    const rows = pageRows({ voices, under, barQ: barUnits / 8, bars, rowBars, cursor, key: `${cmpKey}-${bachShown}`, label: (a, z) => t("chorale.wb.scoreLabel", { n: ch.number, title: ch.title, a: a + 1, b: z }) });
    // P15: one clef plan for the whole piece in the open score.
    const clefPlan = openScore ? planClefs(voices, CHORALE_CLEFS, barUnits / 8) : undefined;
    return { rows, bars, clefPlan };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, ch, l2, l3, c5, b4, B, openScore, JSON.stringify([mine1, mine2, mine4, voices5]), myBass, lines6, base6, aug6, worst, showCompare, bach, rowBars, cursor, verdicts]);

  // Choosing, stage by stage.
  const setPick = (store: Picks, set: (v: Picks) => void, key: number, all: (string | null)[], i: number, value: string | null) => {
    const next = [...all];
    next[i] = value;
    set({ ...store, [key]: next });
  };
  const choose = (value: string) => {
    if (selected === null) return;
    const i = selected;
    if (stage === 1) setPick(p1, setP1, ch.number, mine1, i, value);
    if (stage === 2) setPick(p2, setP2, ch.number, mine2, i, value);
    if (stage === 3) setPick(p3, setP3, ch.number, mine3, i, value);
    if (stage === 4) setPick(p4, setP4, key4, mine4, i, value);
    const count = stage === 1 ? ch.phrases.length : stage === 2 ? l2.notes.length : stage === 3 ? l3.notes.length : b4.notes.length;
    if (i + 1 < count) setSelected(i + 1);
  };
  const write5 = (slot: number, pitch: string | null) => {
    const voice = slot < nSlots ? "alto" : "tenor";
    const i = slot % nSlots;
    setSelected(slot);
    if (pitch === null) return;
    const line = [...voices5[voice]];
    line[i] = pitch;
    setWritten({ ...written, [vkey]: { ...voices5, [voice]: line } });
    if (!playing) {
      const col = [B.slots[i].soprano, voice === "alto" ? pitch : voices5.alto[i], voice === "tenor" ? pitch : voices5.tenor[i], B.slots[i].bass].filter((x): x is string => !!x);
      void audio.playSequence([{ slot: 0, at: 0, length: 0.5, cantus: null, counterpoint: null, extra: col.map((p) => ({ channel: "counterpoint" as const, pitch: p })) }], audio.barSeconds);
    }
    if (i + 1 < nSlots) setSelected(slot + 1);
  };
  const alter5 = (a: -1 | 0 | 1) => {
    if (selected === null || stage !== 5) return;
    const voice = selected < nSlots ? "alto" : "tenor";
    const i = selected % nSlots;
    const p = voices5[voice][i];
    if (!p) return;
    const q = parsePitch(p);
    const line = [...voices5[voice]];
    line[i] = `${q.step}${a === 1 ? "#" : a === -1 ? "b" : ""}${q.octave}`;
    setWritten({ ...written, [vkey]: { ...voices5, [voice]: line } });
  };
  const sel6 = stage === 6 && selected !== null ? { v: Math.floor(selected / 1000), i: selected % 1000 } : null;
  const opts6 = sel6 && base6[sel6.v] ? embOptions(base6[sel6.v], sel6.i) : [];
  const choose6 = (e: Embellishment | null) => {
    if (!sel6) return;
    const forVoice = { ...(mine6[sel6.v] ?? {}) };
    if (e) forVoice[sel6.i] = e;
    else delete forVoice[sel6.i];
    setDim({ ...dim, [dimId]: { ...mine6, [sel6.v]: forVoice } });
  };
  const onSlot = (slot: number, pitch: string | null) => {
    if (stage === 5) return write5(slot, pitch);
    setSelected(slot);
  };
  const clearStage = () => {
    if (stage === 1) setP1({ ...p1, [ch.number]: ch.phrases.map(() => null) });
    if (stage === 2) setP2({ ...p2, [ch.number]: l2.notes.map(() => null) });
    if (stage === 3) setP3({ ...p3, [ch.number]: l3.notes.map(() => null) });
    if (stage === 4) setP4({ ...p4, [key4]: b4.notes.map(() => null) });
    if (stage === 5) setWritten({ ...written, [vkey]: { alto: Array(nSlots).fill(null), tenor: Array(nSlots).fill(null) } });
    if (stage === 6) setDim({ ...dim, [dimId]: {} });
    setCompared(null);
  };

  // Listening: what the score shows, with plain chords under the chosen harmony at stages 1-2 and
  // the figures realised at stage 4.
  const play = (from = pausedAt ?? 0, fresh = false) => {
    if (playing && !fresh) {
      audio.stop();
      setPlaying(false);
      return setPausedAt(Math.max(0, cursor));
    }
    // Stages 5 and 6: four voices, performed (P14: fermatas and phrase ends as the reading chosen
    // beside the ensemble); stages 1-4 strictly in time, the harmony as plain chords.
    if (stage >= 5) {
      const four: ChoraleNote[][] =
        stage === 6 && lines6.length
          ? (lines6 as ChoraleNote[][])
          : bach
            ? [c5.melody as ChoraleNote[], ...([0, 1, 2] as const).map((v) => c5.melody.flatMap(([at, dur], i) => (bach.inner[i] ? [[at, dur, bach.inner[i]![v]] as ChoraleNote] : [])))]
            : [c5.melody as ChoraleNote[], ...(["alto", "tenor"] as const).map((v) => B.slots.flatMap((sl, i) => (voices5[v][i] ? [[sl.at, sl.dur, voices5[v][i]!] as ChoraleNote] : []))), B.bass as ChoraleNote[]];
      prepareChoraleAudio(audio);
      setPlaying(true);
      setPausedAt(null);
      playChorale(audio, { voices: four, barUnits, pickup: c5.pickup }, (b) => (b < 0 ? stop() : setCursor(b)), from);
      return;
    }
    const events: PlayEvent[] = [];
    const ev = (at: number, dur: number, extra: NonNullable<PlayEvent["extra"]>) => extra.length && events.push({ slot: barOfUnits(at), at: at / UNIT, length: dur / UNIT, cantus: null, counterpoint: null, extra });
    for (const [at, dur, pitch] of c5.melody) ev(at, dur, [{ channel: "counterpoint", pitch }]);
    const noteAt = (u: number) => c5.melody.find(([at]) => at === u);
    if (stage <= 2) {
      const chords: [number, string][] = stage === 1 ? ch.phrases.map((ph, k) => [unitsOf(ph.offset), mine1[k]] as [number, string | null]).filter((x): x is [number, string] => !!x[1]) : l2.notes.map((n, i) => [unitsOf(n.offset), mine2[i]] as [number, string | null]).filter((x): x is [number, string] => !!x[1]);
      for (const [u, label] of chords) {
        const m = noteAt(u);
        if (!m) continue;
        const [bass, ...inner] = voiceChord(label, ch.tonic, m[2]);
        if (bass) ev(u, m[1], [{ channel: "fux", pitch: bass }, ...inner.map((pitch) => ({ channel: "third" as const, pitch }))]);
      }
    }
    if (stage === 3) for (const b of myBass) if (b.pitch) ev(b.at, b.dur, [{ channel: "fux", pitch: b.pitch }]);
    if (stage === 4)
      kittelBass.forEach((b, i) => {
        const inner = mine4[i] ? realiseFigure(mine4[i]!, b.pitch, l4.tonic, l4.mode) : [];
        ev(b.at, b.dur, [{ channel: "fux", pitch: b.pitch }, ...inner.map((pitch) => ({ channel: "third" as const, pitch }))]);
      });
    prepareChoraleAudio(audio);
    setPlaying(true);
    setPausedAt(null);
    playChoraleEvents(audio, events, (b) => (b < 0 ? stop() : setCursor(b)), from);
  };
  const liveKey = JSON.stringify([stage, ch.number, bassNo, mine1, mine2, mine3, mine4, voices5, mine6, bachShown]);
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
  };

  // The choices offered at the selected point.
  const idx = selected ?? 0;
  const chordHere = stage === 3 ? (() => {
    const n = l3.notes[idx];
    const j = n ? l2.notes.findIndex((m) => m.offset === n.offset) : -1;
    return j >= 0 ? mine2[j] : null;
  })() : null;
  const fitsChord = (deg: string) => {
    const c = chordHere ? parseChord(chordHere, ch.tonic) : null;
    if (!c) return false;
    const pcs = [c.root, (c.root + (c.quality === "major" ? 4 : 3)) % 12, (c.root + (c.quality === "diminished" ? 6 : 7)) % 12];
    return pcs.includes(pcOf(bassPitch(deg, l3.tonic, null).replace(/\d+$/, "")));
  };
  const offered: string[] = (() => {
    if (stage === 1) return ch.phrases[idx]?.choices ?? [];
    if (stage === 2) {
      const o = l2.notes[idx]?.options ?? [];
      return mine2[idx] && !o.includes(mine2[idx]!) ? [...o, mine2[idx]!] : o;
    }
    if (stage === 3) return l3.notes[idx]?.options ?? [];
    if (stage === 4) return POSITIONS;
    return [];
  })();
  const prompt = (() => {
    if (stage === 1) {
      const ph = ch.phrases[idx];
      return ph ? t("chorale.prompt", { n: idx + 1, bar: ph.measure }) : "";
    }
    if (stage === 2 || stage === 3) {
      const n = (stage === 2 ? l2 : l3).notes[idx];
      return n ? t(stage === 2 ? "chorale.prompt2" : "chorale.prompt3", { n: idx + 1, bar: n.measure, pitch: n.pitch }) : "";
    }
    if (stage === 4) {
      const n = b4.notes[idx];
      return n ? t("chorale.prompt4", { n: idx + 1, bar: n.measure, pitch: n.pitch, melody: n.melody ?? "—" }) : "";
    }
    if (stage === 5) return selected !== null ? t("chorale.l5.prompt", { voice: t(`chorale.l5.voice.${selected < nSlots ? "alto" : "tenor"}`), bar: barLabel(B.slots[selected % nSlots].at) }) : t("chorale.l5.promptNone");
    if (stage === 6) return sel6 && base6[sel6.v] ? t("chorale.l6.prompt", { voice: t(`chorale.l6.voice.${VOICES6[sel6.v]}`), bar: barLabel(base6[sel6.v][sel6.i][0]) }) : t("chorale.l6.promptNone");
    return "";
  })();
  const total = stage <= 4 ? mineNow.length : stage === 5 ? 2 * nSlots : 0;
  const done = stage <= 4 ? mineNow.filter(Boolean).length : stage === 5 ? voices5.alto.filter(Boolean).length + voices5.tenor.filter(Boolean).length : 0;

  // The comparison, stage by stage.
  const ref = (no: number, bar?: number | string) => {
    const r = BACH_REFS[String(no)];
    const label = `${no}${bar !== undefined ? `/${bar}` : ""}`;
    return r?.scan ? <a key={label} href={r.scan} target="_blank" rel="noreferrer" title={`BWV ${r.bwv}, ${r.title}`}>{label}</a> : <span key={label}>{label}</span>;
  };
  const join = (xs: ReactNode[]) => xs.reduce<ReactNode[]>((a, x, k) => (k ? [...a, ", ", x] : [x]), []);
  const verdictItem = (v: PhraseVerdict, i: number) => {
    const head =
      stage === 1 ? <>{t("chorale.phrase", { n: i + 1, bar: ch.phrases[i].measure })} <span className="muted">{t("chorale.close", { close: ch.phrases[i].melodyClose, pos: t(`chorale.pos.${ch.phrases[i].position}`) })}</span></>
      : stage === 4 ? <>{t("chorale.bassNote", { n: i + 1, bar: b4.notes[i].measure })} <span className="muted">{t("chorale.bassUnder", { pitch: b4.notes[i].pitch, degree: b4.notes[i].degree, melody: b4.notes[i].melody ?? "—" })}</span></>
      : <>{t("chorale.note", { n: i + 1, bar: (stage === 2 ? l2 : l3).notes[i].measure })} <span className="muted">{t("chorale.degree", { pitch: (stage === 2 ? l2 : l3).notes[i].pitch, degree: (stage === 2 ? l2 : l3).notes[i].degree })}</span></>;
    const state = !v.chosen ? "empty" : v.bach.some((b) => b.same) ? "bach" : v.kittel.length ? "kittel" : "other";
    const habit = points[i].habit;
    return (
      <li key={i} className={`verdict verdict-${state}`}>
        <button className="link" onClick={() => setSelected(i)}>{head}</button>
        <div>{t(stage === 1 ? "chorale.yours" : stage === 2 ? "chorale.l2.yours" : stage === 3 ? "chorale.l3.yours" : "chorale.l4.yours")}: <strong>{v.chosen ?? "—"}</strong></div>
        <div>
          {t("chorale.kittel")}: {v.kittelOptions.map(([c, basses]) => <span key={c} className={c === v.chosen ? "hit" : undefined}><strong>{c}</strong> {basses.join(" ")}{"; "}</span>)}
        </div>
        {stage !== 4 && (
          <div>
            {t("chorale.bach")}: {v.bach.length ? v.bach.map((b) => <span key={b.no} className={b.same ? "hit" : undefined}><strong>{b.chord}</strong> ({ref(b.no, b.bar)}){" "}</span>) : <span className="muted">{t("chorale.noBach")}</span>}
          </div>
        )}
        <div>
          {t(stage === 1 ? "chorale.habit" : stage === 2 ? "chorale.l2.habit" : stage === 3 ? "chorale.l3.habit" : "chorale.l4.habit", { n: habit.n })}:{" "}
          {habit.options.map((o) => <span key={o.chord} className={o.chord === v.chosen ? "hit" : undefined}><strong>{o.chord}</strong> {Math.round((100 * o.count) / Math.max(1, habit.n))}% ({join(o.examples.map((e) => ref(e.no, e.bar)))}){"; "}</span>)}
          {v.chosen && v.habitShare === 0 && <em> {t(stage === 1 ? "chorale.rare" : "chorale.rare2")}</em>}
        </div>
      </li>
    );
  };
  const finding = (f: Finding, k: number) => {
    const sh = f.habit ? share(f.habit.table, f.habit.ctx, f.habit.outcome) : null;
    const commonest = f.habit ? HABITS[f.habit.table][f.habit.ctx]?.options[0] : undefined;
    return (
      <li key={k} className={`verdict verdict-grave${f.gravity}`}>
        <button className="link" onClick={() => setSelected(f.slots[0])}>{t("chorale.l5.at", { bar: barLabel(B.slots[f.slots[0]].at) })}</button> <strong>{t(`chorale.l5.gravity.${f.gravity}`)}</strong> {t(`chorale.l5.${f.key}`, f.vars)}
        {sh && (
          <div className="muted">
            {t("chorale.l5.bach", { k: sh.k, n: sh.n })} {sh.examples.length > 0 && <>({join(sh.examples.map(([no, bar]) => ref(no, bar)))})</>}
            {commonest && commonest[0] !== f.habit!.outcome && <> {t("chorale.l5.commonest", { outcome: commonest[0], k: commonest[1] })} ({join(commonest[2].map(([no, bar]) => ref(no, bar)))})</>}
          </div>
        )}
      </li>
    );
  };
  const summary = (() => {
    if (!showCompare) return null;
    if (stage <= 4) {
      const withBach = verdicts.filter((v) => v.bach.length > 0).length;
      const agreeBach = verdicts.filter((v) => v.bach.some((b) => b.same)).length;
      const agreeKittel = verdicts.filter((v) => v.kittel.length > 0).length;
      return `${withBach ? t(stage === 1 ? "chorale.summary.bach" : "chorale.l2.summary.bach", { n: agreeBach, of: withBach }) + " · " : ""}${t(stage === 1 ? "chorale.summary.kittel" : stage === 4 ? "chorale.l4.summary" : "chorale.l2.summary.kittel", { n: agreeKittel, of: points.length })}`;
    }
    if (stage === 5) return t("chorale.l5.summary", { grave: findings.filter((f) => f.gravity === 3).length, warnings: findings.filter((f) => f.gravity === 2).length, notes: findings.filter((f) => f.gravity === 1).length });
    const yours = Object.values(mine6).reduce((a, m) => a + Object.keys(m).length, 0);
    return t("chorale.l6w.summary", { yours, grave: aug6.length });
  })();
  const compareTab = (() => {
    if (!showCompare) return <p className="muted">{t(`chorale.wb.before.${stage}`)}</p>;
    if (stage <= 4) return <ol className="chorale-verdicts">{verdicts.map(verdictItem)}</ol>;
    if (stage === 5)
      return (
        <>
          {findings.length ? <ol className="chorale-verdicts">{findings.map(finding)}</ol> : <p>{t("chorale.l5.clean")}</p>}
          {c5.bach.length > 0 && (
            <div className="chorale-about">
              <h4>{t("chorale.l5.bachTitle")}</h4>
              {c5.bach.map((b, k) => {
                const c = compareBach(c5, B.slots, voices5.alto, voices5.tenor, b);
                return (
                  <p key={b.no}>
                    <button className="link" onClick={() => setBachShown(k)}>{t("chorale.l5.bachN", { no: b.no, bwv: b.bwv })}</button> {t("chorale.l5.bachCompare", { aligned: c.aligned, sameBass: c.sameBass, same: c.same })}
                    {c.differ.length > 0 && <> {t("chorale.l5.bachDiffer", { bars: [...new Set(c.differ.map((i) => barLabel(B.slots[i].at)))].join(", ") })}</>}
                  </p>
                );
              })}
            </div>
          )}
        </>
      );
    return (
      <div className="chorale-about">
        {aug6.length > 0 && <p><strong>{t("chorale.l5.gravity.3")}</strong> {t("chorale.l6.augSecond", { bars: [...new Set(aug6.map((e) => barLabel(e.at)))].join(", ") })}</p>}
        <ol className="chorale-verdicts">
          {[1, 2, 3].flatMap((v) =>
            Object.entries(mine6[v] ?? {}).map(([i, e]) => (
              <li key={`${v}-${i}`} className="verdict verdict-other">
                <button className="link" onClick={() => setSelected(v * 1000 + Number(i))}>{t("chorale.l6.place", { voice: t(`chorale.l6.voice.${VOICES6[v]}`), bar: barLabel(base6[v][Number(i)][0]) })}</button> {t("chorale.l6.yours")}: <strong>{t(`chorale.l6.emb.${e}`)}</strong>
              </li>
            )),
          )}
        </ol>
        <p className="muted">{c5.bach.length ? t("chorale.l6w.bachTune", { list: c5.bach.map((b) => `${b.no} (BWV ${b.bwv})`).join(", ") }) : t("chorale.l6w.noBachTune")}</p>
      </div>
    );
  })();

  const canCompare = stage <= 5 ? done > 0 : lines6.length > 0;
  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <ModeSelect value="chorale" onMode={(m) => { stop(); onMode(m); }} />
            {stageSelect(ch.number)}
            <select id="exercise" className="sel sel-exercise" value={ch.number} onChange={(e) => goTo(Number(e.target.value))} aria-label={t("ui.nav.choose")}>
              {CHORALES.map((c) => (
                <option key={c.number} value={c.number}>{`${c.number}. ${c.title.replace(/ etc\.$/, "").replace(/ \[etc\.\]$/, "")}`}</option>
              ))}
            </select>
            {stage >= 4 && (
              <select id="bass" className="sel sel-species" value={bassNo} aria-label={t("chorale.whichBass")} onChange={(e) => { stop(); setBassIdx(Number(e.target.value)); }}>
                {l4.basses.map((b, k) => (
                  <option key={b.label} value={k}>{t("chorale.bassN", { label: b.label })}</option>
                ))}
              </select>
            )}
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("about")} onTutorial={onTutorial} />
        </>
      }
      score={
        <div className="score-wrap chorale-score">
          {stage === 6 && !complete5 ? (
            <div className="help">
              <p>{t("chorale.l6w.need", { label: B.label })}</p>
              <button className="primary" onClick={() => onStage(5)}>{t("chorale.l6w.go5")}</button>
            </div>
          ) : (
            <WtcPage fitWidth clefs={openScore ? CHORALE_CLEFS : undefined} clefPlan={view.clefPlan} rows={view.rows} keySig={MAJOR_BY_SIG[c5.sig] ?? "C"} signature={signatureOf(c5.sig)} time={c5.meter} barQuarters={barUnits / 8} selected={selected} onSlot={onSlot} />
          )}
        </div>
      }
      transport={
        <div className="controls chorale-controls">
          <div className="group write" role="group" aria-label={t("chorale.choose")}>
            <span className="prompt">{prompt}</span>
            {stage <= 4 &&
              offered.map((c) => {
                const fits = stage === 3 && fitsChord(c);
                return (
                  <button key={c} className={mineNow[idx] === c ? "chord primary" : "chord"} title={fits ? t("chorale.fits") : undefined} onClick={() => choose(c)}>
                    {stage === 4 ? c.split("/").map(figureLabel).join("/") : c}
                    {fits ? " •" : ""}
                  </button>
                );
              })}
            {stage === 2 && carried.has(idx) && !p2[ch.number]?.[idx] && <span className="help">{t("chorale.carried.cadence")}</span>}
            {stage === 3 && chordHere && <span className="help">{t("chorale.carried.chord", { chord: chordHere })}</span>}
            {stage === 4 && closest && <span className="help">{t("chorale.closest", { label: l4.basses[closest.index].label, k: closest.k, n: closest.n })}</span>}
            {stage === 5 && !bach && (
              <>
                <button className="btn-acc" onClick={() => alter5(-1)} aria-label={t("chorale.l5.flat")}>♭</button>
                <button className="btn-acc" onClick={() => alter5(0)} aria-label={t("chorale.l5.natural")}>♮</button>
                <button className="btn-acc" onClick={() => alter5(1)} aria-label={t("chorale.l5.sharp")}>♯</button>
              </>
            )}
            {stage === 6 && sel6 && (
              <>
                <button className={!mine6[sel6.v]?.[sel6.i] ? "chord primary" : "chord"} onClick={() => choose6(null)}>{t("chorale.l6.none")}</button>
                {opts6.map((e) => (
                  <button key={e} className={mine6[sel6.v]?.[sel6.i] === e ? "chord primary" : "chord"} onClick={() => choose6(e)}>{t(`chorale.l6.emb.${e}`)}</button>
                ))}
                {opts6.length === 0 && <span className="help">{t("chorale.l6.noOptions")}</span>}
              </>
            )}
          </div>
          <div className="group judge">
            <button className="primary" aria-pressed={showCompare} disabled={!canCompare} onClick={() => { setCompared(showCompare ? null : cmpKey); setTab("compare"); }}>
              {t(stage === 5 ? "chorale.l5.check" : stage === 6 ? "chorale.l6w.compare" : "chorale.compare")}
              {total > 0 && done < total && <span className="badge">{total - done}</span>}
            </button>
            <button className="btn-edit" onClick={clearStage}>{t("ui.clearAll")}</button>
            {stage < 6 && (
              <button onClick={() => { stop(); onStage((stage + 1) as Stage); }}>{t("chorale.stage.next")} ›</button>
            )}
          </div>
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <span className="play-split">
              <TransportButtons playing={playing} pausedAt={pausedAt} onPlay={() => play()} onStop={stop} label={t("chorale.play")} />
            </span>
            <EnsembleSelect />
            <label className="check" title={t("ui.view.staves.open.help")}>
              <input type="checkbox" checked={openScore} onChange={(e) => setStaffLayout(e.target.checked ? "open" : "compact")} /> {t("ui.view.staves.open")}
            </label>
            {stage === 5 && c5.bach.length > 0 && (
              <select className="sel" value={bachShown ?? ""} aria-label={t("chorale.l5.bachShow")} title={t("chorale.l5.bachShowHelp")} onChange={(e) => setBachShown(e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">{t("chorale.l5.yours")}</option>
                {c5.bach.map((b, k) => (
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
      summary={summary && (
        <div className="eval-summary ok" role="status">
          <span className="verdict">{summary}</span>
          <button className="link" onClick={() => setTab("compare")}>{t("ui.summary.open")} ▸</button>
        </div>
      )}
      tab={tab}
      onTab={setTab}
      idle={t("chorale.wb.idle", { n: ch.number, label: b4.label })}
      tabs={[
        { id: "compare", label: t("chorale.tab.compare"), text: true, content: compareTab },
        {
          id: "about",
          label: t("chorale.wb.tab.about"),
          text: true,
          content: (
            <div className="chorale-about">
              <p>{t("chorale.wb.about.1")}</p>
              <p>{t(`chorale.wb.about.stage.${stage}`)}</p>
              <p className="muted">{t("chorale.wb.about.2")}</p>
            </div>
          ),
        },
      ]}
    />
  );
}
