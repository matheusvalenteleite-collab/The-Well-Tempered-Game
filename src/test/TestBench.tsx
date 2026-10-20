/**
 * P29: the owner's test bench: a light page to hear and judge the playback without the game around
 * it (the owner: "a lightweight artifact where I can test what I need to test, without all the
 * distractions"). Original pieces composed for it (three chorales on original hymns, a short fugue,
 * a four-voice Fuxian counterpoint on an original cantus; tools/playback/compose/) beside Bach's, each
 * played by the game's own engine: the ensembles (recorded choir and soloists from the website), the
 * fermata readings and choices, the dynamics, the ornaments.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import data from "../../data/playback/test-pieces.json" with { type: "json" };
import { audio, store, stored } from "../ui/shared.ts";
import { t } from "../ui/i18n.ts";
import { saveVerdict } from "./verdict-store.ts";
import { PianoKeys } from "../ui/PianoKeys.tsx";
import { EnsembleSelect } from "../ui/EnsembleSelect.tsx";
import { FermataList, FermataScale, fermataSign, useFermataEdits } from "../ui/FermataEditor.tsx";
import { HFader } from "../ui/HFader.tsx";
import { TransportButtons } from "../ui/TransportButtons.tsx";
import { WtcPage, planClefs, type WtcScoreVoice } from "../ui/notation/WtcScore.tsx";
import { pageRows, useRowBars } from "../ui/notation/page-rows.ts";
import { CHORALE_CLEFS } from "../ui/staff-layout.ts";
import { barOf, choraleEvents, currentReading, fermataLinesOf, fermataWordsOf, planFermatas, playChorale, playChoraleEvents, prepareChoraleAudio, choraleGates, setPerformanceDynamics, type Chorale, type ChoraleNote } from "../audio/chorale-performance.ts";
import { keySteps, ornamentUnit, ORNAMENT_STYLES, realise, type OrnamentStyle } from "../music/ornaments.ts";
import { parsePitch, type Step } from "../music/pitch.ts";
import type { ClefId } from "../ui/notation/clefs.ts";

type Kind = "chorale" | "fugue" | "fux" | "ornaments";
interface Piece {
  id: string;
  group: string;
  title: string;
  kind: Kind;
  chorale: Chorale;
  sig: number;
  meter: string;
  clefs: ClefId[];
  staffOf: number[];
  text?: string[];
  /** P30: the Bach piece (its id here) a composer's piece is to be heard blind against. */
  compare?: string;
  /** P31: the voices given (not the composer's), drawn in grey. */
  given?: number[];
  about: string;
  /** The ornaments piece: each note's signs and graces, by voice index and onset (32nds). */
  orn?: Map<string, { signs: string; grace: string[] }>;
}

const D = data as unknown as {
  chorales: { id: string; title: string; text: string[]; sig: number; meter: string; pickup: number; voices: ChoraleNote[][] }[];
  fugue: { title: string; sig: number; meter: string; voices: ChoraleNote[][]; plan: string[] };
  fux: { title: string; cantus: string[]; voices: string[][]; mode: string };
  bach: { n: number; title: string; bwv: string; sig: number; meter: string; pickup: number; voices: ChoraleNote[][]; cadences: [number, string, string][]; harmony: [number, string, string, string, [number, number][]?][] }[];
  bachFugues?: { id: string; title: string; meter: string; tpq: number; voices: [number, number, string][][] }[];
  ornaments: { title: string; bwv: string; meter: string; tpq: number; end: number; voices: [number, number, string, number?][][]; orn: [number, number, string, string, string[]?][] };
};

/** P30: the composer sessions' pieces (data/playback/bench/*.json; README there). */
interface BenchFile {
  id: string;
  title: string;
  kind: "chorale" | "fugue";
  by?: string;
  sig: number;
  meter: string;
  pickup?: number;
  voices: ChoraleNote[][];
  text?: string[];
  plan?: string[];
  compare?: number | string | { n?: number; id?: string; from?: number; to?: number };
  note?: string;
  part?: string;
  given?: number[];
  batch?: string;
}
/** A piece cut to the stretch [from, to) in 32nds, its onsets moved to start at 0 (an excerpt to compare). */
function excerpt(c: Chorale, from: number, to: number): Chorale {
  // P34: the excerpt keeps its place in the bar (an upbeat stays an upbeat), and the cadences,
  // suspensions, fermata words and the player's fermata choices that fall inside it.
  const shift = c.pickup ? c.barUnits - c.pickup : 0;
  const pos = (from + shift) % c.barUnits;
  const before = (c.voices[0] ?? []).filter((n) => n[3] && n[0] < from).length;
  const inside = (c.voices[0] ?? []).filter((n) => n[3] && n[0] >= from && n[0] < to).length;
  return {
    ...c,
    pickup: pos ? c.barUnits - pos : 0,
    voices: c.voices.map((v) => v.filter((n) => n[0] >= from && n[0] < to).map(([a, d, p, f]): ChoraleNote => (f ? [a - from, Math.min(d, to - a), p, 1] : [a - from, Math.min(d, to - a), p]))),
    cadences: c.cadences?.filter((x) => x[0] >= from && x[0] < to).map(([a, k, d]) => [a - from, k, d] as const),
    suspensions: c.suspensions?.filter(([a]) => a >= from && a < to).map(([a, v]) => [a - from, v] as const),
    fermataWords: c.fermataWords?.slice(before, before + inside),
    fermataEdits: c.fermataEdits?.slice(before, before + inside),
  };
}

/** P34: a piece's segments to hear one at a time: a chorale's phrases (each up to its soprano fermata), otherwise four bars at a time. */
function segmentsOf(c: Chorale): { from: number; to: number; label: string }[] {
  const end = Math.max(0, ...c.voices.flatMap((v) => v.map((n) => n[0] + n[1])));
  const shown = (at: number) => barOf(c, at) + (c.pickup ? 0 : 1);
  const cuts = (c.voices[0] ?? []).filter((n) => n[3]).map((n) => n[0] + n[1]);
  if (!cuts.length) {
    const out = [];
    for (let a = 0; a < end; a += 4 * c.barUnits) out.push({ from: a, to: Math.min(end, a + 4 * c.barUnits), label: "" });
    return out.map((x) => ({ ...x, label: `bars ${shown(x.from)}-${shown(x.to - 1)}` }));
  }
  if (end - cuts[cuts.length - 1] >= 8) cuts.push(end);
  else cuts[cuts.length - 1] = end;
  return cuts.map((to, k) => ({ from: k ? cuts[k - 1] : 0, to, label: "" })).map((x) => ({ ...x, label: `bars ${shown(x.from)}-${shown(x.to - 1)}` }));
}
const BENCH = Object.values(import.meta.glob("../../data/playback/bench/*.json", { eager: true, import: "default" })) as BenchFile[];

const barUnitsOf = (meter: string) => {
  const [n, d] = meter.split("/").map(Number);
  return (32 * n) / d;
};

function pieces(): Piece[] {
  const out: Piece[] = [];
  for (const c of D.chorales)
    out.push({
      id: c.id,
      group: "Baseline (retired): chorales",
      title: c.title,
      kind: "chorale",
      chorale: { voices: c.voices, barUnits: barUnitsOf(c.meter), pickup: c.pickup },
      sig: c.sig,
      meter: c.meter,
      clefs: ["treble", "bass"],
      staffOf: [0, 0, 1, 1],
      text: c.text,
      about: "The retired baseline (the playback session's first attempt): original words and melody; harmony chosen by hand, voiced under the part-writing rules. The composers' pieces have to beat it.",
    });
  for (const b of D.bach)
    out.push({
      id: `bach-${b.n}`,
      group: "Chorales: Bach, to compare",
      title: `${b.title} (BWV ${b.bwv})`,
      kind: "chorale",
      chorale: {
        voices: b.voices,
        barUnits: barUnitsOf(b.meter),
        pickup: b.pickup,
        cadences: b.cadences,
        fermataWords: fermataWordsOf(b.n),
        suspensions: b.harmony.flatMap((h) => (h[4] ?? []).filter(([, k]) => k === 2).map(([v]) => [h[0], v] as [number, number])),
      },
      sig: b.sig,
      meter: b.meter,
      clefs: ["treble", "bass"],
      staffOf: [0, 0, 1, 1],
      text: (fermataLinesOf(b.n) ?? []).filter((x): x is string => !!x),
      about: `Bach's setting (No. ${b.n} of the game's chorales), with its words read at the fermatas.`,
    });
  const f = D.fugue;
  out.push({
    id: "fugue",
    group: "Baseline (retired): fugue and Fux",
    title: f.title,
    kind: "fugue",
    chorale: { voices: [f.voices[0], f.voices[1], [], f.voices[2]], barUnits: barUnitsOf(f.meter), pickup: 0 },
    sig: f.sig,
    meter: f.meter,
    clefs: ["treble", "treble", "bass"],
    staffOf: [0, 1, 1, 2],
    about: `Original. ${f.plan.join("; ")}.`,
  });
  if (D.fux) {
    const x = D.fux;
    const line = (l: string[]): ChoraleNote[] => l.map((p, k) => [k * 32, 32, p]);
    out.push({
      id: "fux",
      group: "Baseline (retired): fugue and Fux",
      title: x.title,
      kind: "fux",
      chorale: { voices: x.voices.map(line), barUnits: 32, pickup: 0 },
      sig: 0,
      meter: "4/4",
      clefs: CHORALE_CLEFS,
      staffOf: [0, 1, 2, 3],
      about: `Original cantus (alto): ${x.cantus.join(" ")}. First species in four voices; passes the game's own four-voice judgement (Fux, Gradus, Lectio I).`,
    });
  }
  const o = D.ornaments;
  const U = o.tpq / 8; // ticks in a 32nd
  // The encoding's two staves (right hand 0, left hand 1), as Bach wrote them.
  const hand = (h: number) => o.voices.flat().filter((n) => (n[3] ?? 0) === h).map(([on, dur, p]) => [on / U, dur / U, p] as ChoraleNote);
  const upper = hand(0);
  const lower = hand(1);
  out.push({
    id: "ornaments",
    group: "Ornaments",
    title: `Bach, ${o.title}`,
    kind: "ornaments",
    chorale: { voices: [upper, [], [], lower], barUnits: barUnitsOf(o.meter), pickup: 0 },
    sig: 4,
    meter: o.meter,
    clefs: ["treble", "bass"],
    staffOf: [0, 0, 0, 1],
    orn: new Map(o.orn.map(([, on, p, signs, g]) => [`${on / U}|${p}`, { signs, grace: g ?? [] }])),
    about: "20 ornaments as the encoding marks them (trills, mordents, appoggiaturas), played by Bach's Explication or by C. P. E. Bach.",
  });
  // Bach's fugues asked for by a composer's piece, to compare.
  for (const bf of D.bachFugues ?? []) {
    const U = bf.tpq / 8;
    const vs = bf.voices.map((v) => v.map(([on, dur, p]) => [on / U, dur / U, p] as ChoraleNote));
    const four = vs.length >= 4 ? vs.slice(0, 4) : [vs[0], vs[1] ?? [], vs.length === 3 ? [] : [], vs[vs.length - 1]];
    out.push({ id: bf.id, group: "Fugues: Bach, to compare", title: bf.title, kind: "fugue", chorale: { voices: four, barUnits: barUnitsOf(bf.meter), pickup: 0 }, sig: 0, meter: bf.meter, clefs: ["treble", "treble", "bass", "bass"], staffOf: [0, 1, 2, 3], about: "Bach's fugue, the composer's piece is heard against." });
  }
  // The composers' pieces (P31: parts of pieces too, batches, excerpts of Bach to compare).
  for (const b of BENCH) {
    const n = b.voices.length;
    // A subject (one voice) on the top channel; three voices fill soprano, alto and bass.
    const voices = b.kind === "chorale" || n >= 4 ? b.voices.slice(0, 4) : n === 1 ? [b.voices[0], [], [], []] : [b.voices[0], b.voices[1] ?? [], [], b.voices[n - 1]];
    const c = b.compare;
    const cn = typeof c === "object" && c ? (c.n !== undefined ? `bach-${c.n}` : c.id) : typeof c === "number" ? `bach-${c}` : c;
    let cmp = cn;
    if (typeof c === "object" && c && cn && (c.from !== undefined || c.to !== undefined)) {
      const src = out.find((p) => p.id === cn);
      if (src) {
        const from = c.from ?? 0;
        const to = c.to ?? Infinity;
        cmp = `${cn}@${from}-${to}`;
        if (!out.some((p) => p.id === cmp)) out.push({ ...src, id: cmp, group: src.group, title: `${src.title}, excerpt`, chorale: excerpt(src.chorale, from, to) });
      }
    }
    out.push({
      id: b.id,
      group: b.batch ? `Batch: ${b.batch}` : b.kind === "chorale" ? "Composers: chorales" : "Composers: fugues",
      title: b.part && b.part !== "whole" ? `${b.title} (${b.part})` : b.title,
      // The file's voice indexes as placed on the four channels (three voices: the third is the bass).
      given: b.given?.map((i) => (n === 3 && i === 2 ? 3 : i)),
      kind: b.kind,
      chorale: { voices, barUnits: barUnitsOf(b.meter), pickup: b.pickup ?? 0 },
      sig: b.sig,
      meter: b.meter,
      clefs: b.kind === "chorale" ? ["treble", "bass"] : n >= 4 ? ["treble", "treble", "bass", "bass"] : ["treble", "treble", "bass"],
      staffOf: b.kind === "chorale" ? [0, 0, 1, 1] : n >= 4 ? [0, 1, 2, 3] : [0, 1, 1, 2],
      text: b.text,
      ...(cmp && out.some((p) => p.id === cmp) ? { compare: cmp } : {}),
      about: [`By the ${b.by ?? "composer"} session.`, b.note ?? "", b.plan ? `Plan: ${b.plan.join("; ")}.` : ""].filter(Boolean).join(" "),
    });
  }
  return out;
}

const MAJOR_BY_SIG: Record<number, string> = { [-3]: "Eb", [-2]: "Bb", [-1]: "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E" };
const signatureOf = (n: number): Record<Step, number> => {
  const sig: Record<Step, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  const order: Step[] = n > 0 ? ["F", "C", "G", "D", "A", "E", "B"] : ["B", "E", "A", "D", "G", "C", "F"];
  for (let i = 0; i < Math.abs(n); i++) sig[order[i]] += n > 0 ? 1 : -1;
  return sig;
};

const CHECKS: Record<Kind, string[]> = {
  chorale: [
    "Ensembles: the recorded Choir and Four soloists (from the website), and the others.",
    "Fermatas: each reading; then choose a fermata's treatment and make it longer or shorter (Fermatas list); the slider for all.",
    "Dynamics: each line swelling toward its highest note, off for comparison.",
  ],
  fugue: ["Each entry audible; the voices balanced in each ensemble.", "Dynamics: dissonances a little louder, the piece shaped as one phrase (switch off to compare)."],
  fux: ["Four whole-note parts; the ensemble's balance; dynamics on and off."],
  ornaments: ["Trills, mordents and appoggiaturas: Bach's Explication against C. P. E. Bach; off for the plain notes.", "Speed of the ornaments at different tempos."],
};

/** P34: the chorale's melody alone, on one staff (the soprano as the piece has it). */
function MelodyScore({ piece, rowBars }: { piece: Piece; rowBars: number }) {
  const view = useMemo(() => {
    const c = piece.chorale;
    const shift = c.pickup ? c.barUnits - c.pickup : 0;
    const voices: WtcScoreVoice[] = [{ staff: 0, ink: "#1d1b17", editable: false, notes: (c.voices[0] ?? []).map(([at, dur, pitch, f]) => ({ pitch, at: (at + shift) / 8, dur: dur / 8, fermata: Boolean(f) })) }];
    const end = Math.max(...(c.voices[0] ?? []).map((n) => n[0] + n[1]));
    const bars = Math.ceil((end + shift) / c.barUnits);
    const barQ = c.barUnits / 8;
    const rows = pageRows({ voices, barQ, bars, rowBars: rowBars * 2, cursor: -1, key: `${piece.id}-melody`, label: (a, z) => `Melody, bars ${a + (c.pickup ? 0 : 1)}-${z - (c.pickup ? 1 : 0)}` });
    return { rows, barQ, clefPlan: planClefs(voices, ["treble"], barQ) };
  }, [piece, rowBars]);
  return (
    <div className="bench-score bench-melody">
      <WtcPage fitWidth clefs={["treble"]} clefPlan={view.clefPlan} rows={view.rows} keySig={MAJOR_BY_SIG[piece.sig] ?? "C"} signature={signatureOf(piece.sig)} time={piece.meter} barQuarters={view.barQ} selected={null} onSlot={() => undefined} />
    </div>
  );
}

const VOICE_NAMES = ["S", "A", "T", "B"];

export function TestBench() {
  const all = useMemo(pieces, []);
  const [id, setId] = useState(() => stored("wtg.test.piece", all[0].id, (v) => typeof v === "string" && all.some((p) => p.id === v)));
  useEffect(() => store("wtg.test.piece", id), [id]);
  const piece = all.find((p) => p.id === id) ?? all[0];
  // P30: the blind comparison: a composer's piece and the Bach it names, in random order, unnamed.
  const pairs = useMemo(() => {
    const real = all.filter((p) => p.compare).map((p) => ({ a: p.id, b: p.compare!, practice: false }));
    const practice = [
      { a: "hymn-evening", b: "bach-89", practice: true },
      { a: "hymn-morning", b: "bach-216", practice: true },
    ].filter((x) => all.some((p) => p.id === x.a) && all.some((p) => p.id === x.b));
    return [...real, ...practice];
  }, [all]);
  type Blind = { sid: string; pair: number; order: [string, string]; at: 0 | 1; ratings: [number, number]; guess: 0 | 1 | null; revealed: boolean; notes: [string, string, string] };
  // P36: the test in progress survives a reload (kept in this browser as it is written).
  const [blind, setBlind] = useState<Blind | null>(() => {
    const d = stored<Blind | null>("wtg.test.draft", null, (v) => !!v && typeof v === "object" && "sid" in (v as object) && Array.isArray((v as Blind).notes));
    // A draft whose pieces have since been replaced (a newer version on the bench) is dropped.
    const same = d && pairs[d.pair] && [pairs[d.pair].a, pairs[d.pair].b].sort().join() === [...d.order].sort().join();
    return same ? d : null;
  });
  const [saved, setSaved] = useState<"" | "saving" | "db" | "local">("");
  useEffect(() => {
    if (blind) setId(blind.order[blind.at]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    store("wtg.test.draft", blind);
    if (!blind) return;
    setSaved("saving");
    // P36: each change saved to the bench's record (the database) a moment after it is made.
    const timer = setTimeout(() => {
      const bachAt = blind.order.findIndex((x) => x.startsWith("bach-") || /^wtc/.test(x));
      const rec = {
        updated: new Date().toISOString(),
        pair: pairs[blind.pair],
        heard: blind.order,
        ratings: { [blind.order[0]]: blind.ratings[0], [blind.order[1]]: blind.ratings[1] },
        guessedBach: blind.guess === null ? null : blind.order[blind.guess],
        revealed: blind.revealed,
        ...(blind.revealed ? { right: blind.guess === bachAt } : {}),
        comments: { [blind.order[0]]: blind.notes[0], [blind.order[1]]: blind.notes[1], pair: blind.notes[2] },
      };
      void saveVerdict(blind.sid, rec).then((ok) => setSaved(ok ? "db" : "local"));
    }, 700);
    return () => clearTimeout(timer);
  }, [blind, pairs]);
  const deal = (pair: number) => {
    const pr = pairs[pair];
    const order: [string, string] = Math.random() < 0.5 ? [pr.a, pr.b] : [pr.b, pr.a];
    setBlind({ sid: `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 6)}`, pair, order, at: 0, ratings: [0, 0], guess: null, revealed: false, notes: ["", "", ""] });
    setId(order[0]);
  };
  const [results, setResults] = useState<object[]>(() => stored<object[]>("wtg.test.blind", [], (v) => Array.isArray(v)));
  /** P35: the owner's written commentary, by piece (A's and B's) and on the pair. */
  const commentary = (order: [string, string], notes: [string, string, string]) => ({ comments: { [order[0]]: notes[0].trim(), [order[1]]: notes[1].trim(), pair: notes[2].trim() } });
  const setNote = (k: 0 | 1 | 2, text: string) => {
    if (!blind) return;
    const notes = blind.notes.map((x, i) => (i === k ? text : x)) as [string, string, string];
    setBlind({ ...blind, notes });
    // After the answer, the verdict already kept follows the commentary as it is written.
    if (blind.revealed && results.length) {
      const next = [...results.slice(0, -1), { ...results[results.length - 1], ...commentary(blind.order, notes) }];
      setResults(next);
      store("wtg.test.blind", next);
    }
  };
  const reveal = () => {
    if (!blind) return;
    const bachAt = blind.order.findIndex((x) => x.startsWith("bach-") || /^wtc/.test(x));
    const r = { when: new Date().toISOString(), pair: pairs[blind.pair], heard: blind.order, ratings: { [blind.order[0]]: blind.ratings[0], [blind.order[1]]: blind.ratings[1] }, guessedBach: blind.guess === null ? null : blind.order[blind.guess], right: blind.guess === bachAt, ...commentary(blind.order, blind.notes) };
    const next = [...results, r];
    setResults(next);
    store("wtg.test.blind", next);
    setBlind({ ...blind, revealed: true });
  };
  const [playing, setPlaying] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [cursor, setCursor] = useState(-1);
  const [tempo, setTempo] = useState(() => stored("wtg.tempo", 60, (v) => typeof v === "number" && v >= 30 && v <= 240));
  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.tempo", tempo);
  }, [tempo]);
  const [dynamics, setDynamics] = useState(() => stored("wtg.test.dynamics", true, (v) => typeof v === "boolean"));
  useEffect(() => {
    audio.dynamics = dynamics;
    setPerformanceDynamics(dynamics);
    store("wtg.test.dynamics", dynamics);
  }, [dynamics]);
  // P34: the voices heard (any of S, A, T, B), applied at once while playing.
  const [heard, setHeard] = useState<boolean[]>(() => stored<boolean[]>("wtg.test.heard", [true, true, true, true], (v) => Array.isArray(v) && v.length === 4));
  useEffect(() => {
    store("wtg.test.heard", heard);
    audio.setGates(choraleGates(heard));
  }, [heard]);
  const [pianoOpen, setPianoOpen] = useState(() => stored("wtg.test.piano", false, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.test.piano", pianoOpen), [pianoOpen]);
  const [ornOn, setOrnOn] = useState(true);
  const [style, setStyle] = useState<OrnamentStyle>(() => stored<OrnamentStyle>("wtg.ornamentStyle", "explication", (v) => ORNAMENT_STYLES.includes(v as OrnamentStyle)));
  useEffect(() => store("wtg.ornamentStyle", style), [style]);
  const [edits, setEdit] = useFermataEdits(`test-${piece.id}`);
  const [replan, setReplan] = useState(0);
  const rowBars = useRowBars();
  useEffect(() => prepareChoraleAudio(audio), []);

  // The chorale as it sounds: the player's fermatas; the ornaments realised (the ornaments piece).
  const sounding = useMemo((): Chorale => {
    const c: Chorale = { ...piece.chorale, fermataEdits: edits };
    if (piece.kind !== "ornaments" || !ornOn || !piece.orn) return c;
    const steps = keySteps(signatureOf(piece.sig));
    const unit = ornamentUnit(tempo);
    const voices = c.voices.map((v) =>
      v.flatMap(([at, dur, p], k): ChoraleNote[] => {
        const o = piece.orn!.get(`${at}|${p}`);
        if (!o) return [[at, dur, p]];
        const prev = k > 0 ? parsePitch(v[k - 1][2]).midi : undefined;
        const graces = o.grace.map((g) => ({ kind: g[0] as "q" | "Q", midi: parsePitch(g.slice(1)).midi }));
        const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        return realise({ midi: parsePitch(p).midi, at: at / 8, dur: dur / 8 }, o.signs, graces, { unit, prevMidi: prev, ...steps, style }).map((x) => [Math.round(x.at * 8 * 100) / 100, Math.max(0.25, x.dur * 8), `${NAMES[((x.midi % 12) + 12) % 12]}${Math.floor(x.midi / 12) - 1}`]);
      }),
    );
    return { ...c, voices };
  }, [piece, edits, ornOn, style, tempo]);

  // P34: a part heard on its own (a phrase of A or B, the melody alone): its key while it plays.
  const [part, setPart] = useState<string | null>(null);
  const stop = () => {
    audio.stop();
    setPlaying(false);
    setCursor(-1);
    setPausedAt(null);
    setPart(null);
  };
  useEffect(() => () => audio.stop(), []);
  const start = (from: number) => {
    prepareChoraleAudio(audio, heard);
    audio.dynamics = dynamics;
    setPlaying(true);
    setPausedAt(null);
    setPart(null);
    const onBar = (b: number) => (b < 0 ? stop() : setCursor(b));
    // Chorales: the performance (fermatas, phrase arch); the others as the Fux and WTC screens play them (P25 shaping).
    if (piece.kind === "chorale") playChorale(audio, sounding, onBar, from);
    else playChoraleEvents(audio, choraleEvents(sounding), onBar, from);
  };
  /** P34: one piece's segment (or the whole) on its own; `melody`: the soprano alone. Pressed again, it stops. */
  const hearPart = (key: string, pieceId: string, seg: { from: number; to: number } | null, melody = false) => {
    const was = part;
    stop();
    if (was === key) return;
    const p = all.find((x) => x.id === pieceId);
    if (!p) return;
    const base: Chorale = p.id === piece.id ? sounding : p.chorale;
    let c = seg ? excerpt(base, seg.from, seg.to) : base;
    if (melody) c = { ...c, voices: [c.voices[0] ?? []] };
    prepareChoraleAudio(audio, melody ? [true, true, true, true] : heard);
    audio.dynamics = dynamics;
    setPlaying(true);
    setPart(key);
    const onBar = (b: number) => b < 0 && stop();
    if (p.kind === "chorale") playChorale(audio, c, onBar, 0);
    else playChoraleEvents(audio, choraleEvents(c), onBar, 0);
  };
  const play = () => {
    if (part) return stop();
    if (playing) {
      audio.stop();
      setPlaying(false);
      return setPausedAt(Math.max(0, cursor));
    }
    start(pausedAt ?? 0);
  };
  // A change while playing goes on from the bar it is in.
  const live = useRef<() => void>(() => undefined);
  live.current = () => {
    if (playing && !part) start(Math.max(0, cursor));
  };
  useEffect(() => {
    live.current();
  }, [sounding, replan]);
  useEffect(() => {
    stop();
  }, [id]);

  const view = useMemo(() => {
    const c = piece.chorale;
    const shift = c.pickup ? c.barUnits - c.pickup : 0;
    const q = (u: number) => (u + shift) / 8;
    const plans = piece.kind === "chorale" ? planFermatas({ ...c, fermataEdits: edits }, currentReading()) : [];
    const voices: WtcScoreVoice[] = c.voices
      .map((notes, v) => ({
        staff: piece.staffOf[v],
        // P31: voices given (Bach's, around a generated part) in grey.
        ink: piece.given?.includes(v) ? "#9a9488" : "#1d1b17",
        editable: false,
        notes: notes.map(([at, dur, pitch, f]) => {
          const o = piece.orn?.get(`${at}|${pitch}`);
          const sign = v === 0 && f ? fermataSign(plans.find((p) => p.at === at)) : "";
          return { pitch, at: q(at), dur: dur / 8, fermata: Boolean(f), ...(sign ? { label: sign } : {}), ...(o && ornOn ? { orn: o.signs, grace: o.grace.map((g) => g.slice(1)) } : {}) };
        }),
      }))
      .filter((v) => v.notes.length);
    const end = Math.max(...c.voices.flatMap((v) => v.map((n) => n[0] + n[1])));
    const bars = Math.ceil((end + shift) / c.barUnits);
    const barQ = c.barUnits / 8;
    const rows = pageRows({ voices, barQ, bars, rowBars, cursor, key: piece.id, label: (a, z) => `${piece.title}, bars ${a + (c.pickup ? 0 : 1)}-${z - (c.pickup ? 1 : 0)}` });
    const clefPlan = planClefs(voices, piece.clefs, barQ);
    const fermataRows = (c.voices[0] ?? []).filter((n) => n[3]).map((n, k) => ({ plan: plans.find((p) => p.at === n[0]), bar: barOf(c, n[0]) + (c.pickup ? 0 : 1), word: piece.text?.[k]?.split(/\s+/).pop() ?? null }));
    return { rows, barQ, clefPlan, fermataRows };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece, edits, cursor, rowBars, ornOn, replan]);

  const groups = [...new Set(all.map((p) => p.group))];
  return (
    <div className="bench">
      <header className="bench-head">
        <h1>Playback test bench</h1>
        {blind ? (
          <span className="blind-head">
            <strong>Blind test</strong>
            {([0, 1] as const).map((k) => (
              <button key={k} className={blind.at === k ? "chipbtn on" : "chipbtn"} aria-pressed={blind.at === k} onClick={() => { stop(); setBlind({ ...blind, at: k }); setId(blind.order[k]); }}>
                Hear {k ? "B" : "A"}
              </button>
            ))}
            <button className="chipbtn" onClick={() => { stop(); setBlind(null); }}>Leave</button>
          </span>
        ) : (
          <span className="blind-head">
            <select className="sel" defaultValue="" onChange={(e) => e.target.value !== "" && (stop(), deal(Number(e.target.value)))} aria-label="Blind test">
              <option value="">Blind test…</option>
              {pairs.map((p, k) => (
                <option key={k} value={k}>{p.practice ? "Practice: baseline against Bach" : `${all.find((x) => x.id === p.a)?.title} against Bach`}</option>
              ))}
            </select>
          </span>
        )}
        {!blind && <select className="sel" value={piece.id} onChange={(e) => setId(e.target.value)} aria-label="Piece">
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {all.filter((p) => p.group === g).map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </optgroup>
          ))}
        </select>}
      </header>
      <section className="bench-controls">
        <TransportButtons playing={playing} pausedAt={pausedAt} onPlay={play} onStop={stop} label="Play" />
        <EnsembleSelect heard={heard} storeKey="wtg.test.ensemble" fallback="clear" onReading={() => setReplan((x) => x + 1)} />
        <label className="check"><input type="checkbox" checked={dynamics} onChange={(e) => setDynamics(e.target.checked)} /> Dynamics</label>
        <span className="bench-voices" role="group" aria-label="Voices heard">
          {VOICE_NAMES.map((v, k) => (
            <label key={v} className="check" title={`Hear the ${["soprano", "alto", "tenor", "bass"][k]}`}>
              <input type="checkbox" checked={heard[k]} onChange={(e) => setHeard(heard.map((x, i) => (i === k ? e.target.checked : x)))} /> {v}
            </label>
          ))}
          <button className="link" onClick={() => setHeard([true, true, true, true])} disabled={heard.every(Boolean)}>all</button>
        </span>
        {piece.kind === "ornaments" && (
          <>
            <label className="check"><input type="checkbox" checked={ornOn} onChange={(e) => setOrnOn(e.target.checked)} /> Ornaments</label>
            <select className="sel" value={style} onChange={(e) => setStyle(e.target.value as OrnamentStyle)} aria-label={t("ui.study.ornamentStyle")} disabled={!ornOn}>
              {ORNAMENT_STYLES.map((x) => (
                <option key={x} value={x}>{t(`ui.study.ornamentStyle.${x}`)}</option>
              ))}
            </select>
          </>
        )}
        <div className="hfaders">
          <HFader label={t("ui.tempo")} help={t("ui.tempo.help")} value={tempo} min={30} max={120} defaultValue={60} format={(v) => String(Math.round(v))} onChange={(v) => setTempo(Math.round(v))} />
          {piece.kind === "chorale" && <FermataScale onChange={() => setReplan((x) => x + 1)} />}
        </div>
      </section>
      <PartsPanel
        rows={blind ? (["A", "B"] as const).map((n, k) => ({ name: n, pieceId: blind.order[k] })) : [{ name: "Piece", pieceId: piece.id }]}
        all={all}
        part={part}
        onHear={hearPart}
        showMelody={blind !== null && !blind.revealed}
        rowBars={rowBars}
      />
      <details className="bench-piano" open={pianoOpen} onToggle={(e) => setPianoOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Piano (play along with the mouse or the computer keys)</summary>
        {pianoOpen && <PianoKeys storeKey="wtg.test.pianoAnchor" />}
      </details>
      {blind && (
        <section className="blind-panel">
          {([0, 1] as const).map((k) => (
            <div key={k} className="blind-rate">
              <strong>{k ? "B" : "A"}</strong>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={blind.ratings[k] >= n ? "bench-star on" : "bench-star"} aria-label={`${k ? "B" : "A"}: ${n} of 5`} onClick={() => !blind.revealed && setBlind({ ...blind, ratings: (k ? [blind.ratings[0], n] : [n, blind.ratings[1]]) as [number, number] })}>★</button>
              ))}
              <label className="check"><input type="radio" name="bach" checked={blind.guess === k} disabled={blind.revealed} onChange={() => setBlind({ ...blind, guess: k })} /> this is Bach</label>
            </div>
          ))}
          <div className="blind-notes">
            {(["A", "B", "Both"] as const).map((n, k) => (
              <label key={n}>
                <span>{k < 2 ? `Commentary on ${n}` : "On the comparison"}</span>
                <textarea rows={3} value={blind.notes[k]} onChange={(e) => setNote(k as 0 | 1 | 2, e.target.value)} placeholder={k < 2 ? "What works, what fails, where (phrase, bar, voice)…" : "Which is better and why…"} />
              </label>
            ))}
          </div>
          {!blind.revealed ? (
            <button className="primary" disabled={!blind.ratings[0] || !blind.ratings[1] || blind.guess === null} onClick={reveal}>Reveal</button>
          ) : (
            <p className="blind-answer">
              A was <strong>{all.find((x) => x.id === blind.order[0])?.title}</strong>; B was <strong>{all.find((x) => x.id === blind.order[1])?.title}</strong>.{" "}
              {(results[results.length - 1] as { right?: boolean })?.right ? "Your guess was right." : "Your guess was wrong."}{" "}
              <button className="chipbtn" onClick={() => deal(blind.pair)}>Again</button>
            </p>
          )}
          {[blind.order[0], blind.order[1]].some((x) => all.find((p) => p.id === x)?.given?.length) && <p className="muted">In one of the two, some voices are given (Bach's) and only the rest is generated.</p>}
          <p className="muted" role="status">
            {saved === "db" ? "Saved: ratings and commentary are kept in the bench's record, where the playback session reads them." : saved === "local" ? "Kept in this browser only (no bench record here): use Copy results before leaving." : saved === "saving" ? "Saving…" : ""}
          </p>
          <p className="muted">
            {results.length} verdict{results.length === 1 ? "" : "s"} kept in this browser.{" "}
            <button className="link" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(results, null, 1))}>Copy results</button> (to paste to the composer sessions)
          </p>
        </section>
      )}
      {!(blind && !blind.revealed) && <div className="bench-score">
        <WtcPage fitWidth clefs={piece.clefs} clefPlan={view.clefPlan} rows={view.rows} keySig={MAJOR_BY_SIG[piece.sig] ?? "C"} signature={signatureOf(piece.sig)} time={piece.meter} barQuarters={view.barQ} selected={null} onSlot={() => undefined} />
      </div>}
      {!(blind && !blind.revealed) && <section className="bench-notes">
        <div>
          <h2>What to listen for</h2>
          <ul>
            {CHECKS[piece.kind].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="muted">{piece.about}</p>
          {piece.text && piece.text.length > 0 && (
            <ol className="bench-text">
              {piece.text.map((l, k) => (
                <li key={k}>{l}</li>
              ))}
            </ol>
          )}
        </div>
        {piece.kind === "chorale" && (
          <div>
            <h2>Fermatas</h2>
            <FermataList rows={view.fermataRows} edits={edits} onEdit={setEdit} selected={null} onSelect={() => undefined} tap={false} />
          </div>
        )}
      </section>}
    </div>
  );
}

/**
 * P34 (the owner: "buttons which allow you to listen to only certain segments of the chorale in
 * both versions … the melody … in sheet music notation, with the possibility of listening to it in
 * isolation"): each version's phrases (up to each soprano fermata; four bars at a time in a fugue)
 * to hear one at a time, the whole, and the melody alone, phrase by phrase too. In the blind test,
 * before the answer, the melody is drawn (the score itself stays hidden).
 */
function PartsPanel({ rows, all, part, onHear, showMelody, rowBars }: { rows: { name: string; pieceId: string }[]; all: Piece[]; part: string | null; onHear(key: string, pieceId: string, seg: { from: number; to: number } | null, melody?: boolean): void; showMelody: boolean; rowBars: number }) {
  const found = rows.map((r) => ({ ...r, piece: all.find((p) => p.id === r.pieceId)! })).filter((r) => r.piece);
  if (!found.length) return null;
  const sopranoKey = (p: Piece) => JSON.stringify((p.chorale.voices[0] ?? []).map((n) => [n[0], n[2]]));
  // One melody row when the versions share it (a generated setting of Bach's melody); else one each.
  const melodies = found.filter((r, k) => found.findIndex((x) => sopranoKey(x.piece) === sopranoKey(r.piece)) === k);
  const chorale = found[0].piece.kind === "chorale";
  const btn = (key: string, label: string, title: string, go: () => void) => (
    <button key={key} className={part === key ? "chipbtn on" : "chipbtn"} aria-pressed={part === key} title={title} onClick={go}>
      {part === key ? "■" : label}
    </button>
  );
  const line = (name: string, pieceId: string, piece: Piece, melody: boolean) => {
    const segs = segmentsOf(piece.chorale);
    const tag = melody ? `${name} melody` : name;
    return (
      <div key={tag} className="parts-row">
        <strong>{melody ? (melodies.length > 1 ? `Melody ${name}` : "Melody") : name}</strong>
        {btn(`${tag}|all`, "whole", `${tag}: the whole`, () => onHear(`${tag}|all`, pieceId, null, melody))}
        {segs.map((sg, k) => btn(`${tag}|${k}`, String(k + 1), `${tag}: ${chorale ? "phrase" : "segment"} ${k + 1} (${sg.label})`, () => onHear(`${tag}|${k}`, pieceId, sg, melody)))}
      </div>
    );
  };
  return (
    <section className="parts-panel">
      <p className="muted">{chorale ? "Phrase by phrase (each up to its fermata)" : "Four bars at a time"}; pressed again, a button stops.</p>
      {found.map((r) => line(r.name, r.pieceId, r.piece, false))}
      {chorale && melodies.map((r) => line(r.name, r.pieceId, r.piece, true))}
      {showMelody && chorale && melodies.map((r) => <MelodyScore key={r.pieceId} piece={r.piece} rowBars={rowBars} />)}
    </section>
  );
}
