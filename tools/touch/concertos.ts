/**
 * D348: writes data/touch/concertos.json, MORE BACH's HARPSICHORD CONCERTOS (BWV 1052-1058, 1060-1065,
 * every movement: 39 pieces) in the touch game's shape (src/touch/fugue.ts TouchFugue), from MuseScore
 * editions released as CC0 (and one as public domain), as kept in the PDMX dataset (Long et al. 2024:
 * each score's licence from MuseScore's own metadata): data/sources/bach-harpsichord-concertos/SOURCE.md.
 *   - BWV 1052, 1060, 1061, 1062: verits99's full scores (strings and the harpsichord(s) on two staves);
 *   - BWV 1053, 1054, 1055, 1057, 1058, 1063, 1064, 1065: verits99's "keyboard" scores, the strings set on
 *     keyboard staves: each string part a staff (the viola an octave low; read back up), the solo
 *     concertos at A = 415 Hz written a semitone low (read back up: transpose);
 *   - BWV 1056: Andrey Ronzhin's score (strings and the solo on a piano's two staves).
 * The pieces' voices: each harpsichord's top line (its right hand's highest notes: the note sounding
 * highest at each onset, held until the next, a note under a held higher one left out) and its bass line
 * (the left hand's lowest notes, likewise), each one note at a time, the parts the player may take;
 * every other note of the harpsichord(s) is the band's ("inner notes": the right hand's chords and inner
 * voice, the left hand's upper notes); then the winds (BWV 1057's recorders), the violins, the viola and
 * the continuo, the band (Violin I playable too, where it has a melodic line of its own, one note at a
 * time: a double stop's lower note goes to Violin II). The bars as written, counted from 1 in each
 * movement (an upbeat bar 0); no repeat taken. Cadences and keys as for the WTC (analysis.ts); no entries
 * (a concerto's ritornello is not a fugue's subject, as BWV 1043, D340).
 * D351: BWV 1059 (a fragment of nine bars) added as verits99's reconstruction from Cantata 35, labelled so.
 * Run: node tools/touch/concertos.ts   (needs python3 for .mxl), then node tools/touch/extras-index.ts
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import { readMusicXml, type Transpose, type XmlScore } from "./musicxml.ts";
import { findCadences, homeward, keySpeller, type Note } from "./analysis.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const DIR = `${ROOT}data/sources/bach-harpsichord-concertos/musescore/`;

/** A part's staff: [part index, staff] (staff 1 the upper of two). */
type Src = readonly [part: number, staff: number];
/** A band line: its name, where it is written, octaves to read it up by (a viola written an octave low). */
type Line = readonly [name: string, src: Src, octaves?: number];

export interface Movement {
  /** "I. Allegro" */
  name: string;
  /** Its measures (indices in the file, from 0; `to` not included). */
  from: number;
  to: number;
  key: string;
  /** Violin I offered to the player: where it has a melodic line of its own (not where it accompanies in repeated notes or pizzicato chords, or rests: the slow movements of BWV 1054, 1056, 1060-1065, BWV 1065's first; few repeated notes, tools/touch/concertos.ts's report). */
  violin: boolean;
  /** D351: where this movement's staves differ from the concerto's (BWV 1059's reconstruction: each movement from another number of Cantata 35, set on the four keyboard parts differently). */
  harpsichords?: Concerto["harpsichords"];
  band?: readonly Line[];
}
export interface Concerto {
  bwv: number;
  /** "Harpsichord Concerto No. 1 in D minor" */
  title: string;
  /** The MuseScore score id (data/sources/bach-harpsichord-concertos/musescore/<id>.mxl). */
  score: string;
  /** MuseScore's page and the arranger's name as credited. */
  page: string;
  credit: string;
  transpose?: Transpose;
  /** Each harpsichord's right hand and left hand. */
  harpsichords: readonly (readonly [rh: Src, lh: Src])[];
  /** The other parts, top down: winds, Violin I (the first string line, always), Violin II, Viola, Continuo. */
  band: readonly Line[];
  movements: readonly Movement[];
  /** D351: not Bach's concerto as it survives but an editor's reconstruction (BWV 1059: nine bars by Bach; verits99's from Cantata 35): said on its card, pop-up and credits. */
  reconstruction?: string;
}

const VERITS = (id: string) => `https://musescore.com/user/13172/scores/${id}`;
const VERITS_CREDIT = "HARPSICHORD CONCERTOS: VERITS99 ON MUSESCORE (PDMX) · CC0 1.0";
const UP: Transpose = { chromatic: 1, diatonic: 0 };
const UP_STEP: Transpose = { chromatic: 1, diatonic: 1 };
/** The strings of verits99's keyboard scores: Violin I | Viola (8vb) on one keyboard part, Violin II | Continuo on the next. */
const KEYBOARD_STRINGS = (p: number): Line[] => [
  ["Violin I", [p, 1]],
  ["Violin II", [p + 1, 1]],
  ["Viola", [p, 2], 1],
  ["Continuo", [p + 1, 2]],
];
const FULL_STRINGS: Line[] = [
  ["Violin I", [0, 1]],
  ["Violin II", [1, 1]],
  ["Viola", [2, 1]],
  ["Continuo", [3, 1]],
];
/** D351: a line that rests throughout a movement (BWV 1059's aria has no strings). */
const NONE: Src = [-1, 0];
const m = (name: string, from: number, to: number, key: string, violin = true): Movement => ({ name, from, to, key, violin });

export const CONCERTOS: Concerto[] = [
  {
    bwv: 1052, title: "Harpsichord Concerto No. 1 in D minor", score: "4275331", page: VERITS("4275331"), credit: VERITS_CREDIT,
    harpsichords: [[[4, 1], [4, 2]]], band: FULL_STRINGS,
    movements: [m("I. Allegro", 0, 190, "d"), m("II. Adagio", 190, 278, "g"), m("III. Allegro", 278, 564, "d")],
  },
  {
    bwv: 1053, title: "Harpsichord Concerto No. 2 in E major", score: "130205", page: VERITS("130205"), credit: VERITS_CREDIT, transpose: UP,
    harpsichords: [[[0, 1], [0, 2]]], band: KEYBOARD_STRINGS(1),
    movements: [m("I. (Allegro)", 0, 177, "E"), m("II. Siciliano", 177, 214, "c#"), m("III. Allegro", 214, 609, "E")],
  },
  {
    bwv: 1054, title: "Harpsichord Concerto No. 3 in D major", score: "132205", page: VERITS("132205"), credit: VERITS_CREDIT, transpose: UP,
    harpsichords: [[[0, 1], [0, 2]]], band: KEYBOARD_STRINGS(1),
    movements: [m("I. (Allegro)", 0, 175, "D"), m("II. Adagio e piano sempre", 175, 233, "b", false), m("III. Allegro", 233, 393, "D")],
  },
  {
    bwv: 1055, title: "Harpsichord Concerto No. 4 in A major", score: "130218", page: VERITS("130218"), credit: VERITS_CREDIT, transpose: UP,
    harpsichords: [[[0, 1], [0, 2]]], band: KEYBOARD_STRINGS(1),
    movements: [m("I. Allegro", 0, 105, "A"), m("II. Larghetto", 105, 144, "f#"), m("III. Allegro ma non tanto", 144, 345, "A")],
  },
  {
    bwv: 1056, title: "Harpsichord Concerto No. 5 in F minor", score: "53191", page: "https://musescore.com/user/27726/scores/53191",
    credit: "HARPSICHORD CONCERTO NO. 5: ANDREY RONZHIN ON MUSESCORE (PDMX) · CC0 1.0",
    harpsichords: [[[4, 1], [4, 2]]], band: FULL_STRINGS,
    // The Largo's strings play pizzicato chords under the solo's cantilena: no line of their own.
    movements: [m("I. (Allegro)", 0, 116, "f"), m("II. Largo", 116, 137, "Ab", false), m("III. Presto", 137, 361, "f")],
  },
  {
    bwv: 1057, title: "Harpsichord Concerto No. 6 in F major", score: "136395", page: VERITS("136395"), credit: VERITS_CREDIT, transpose: UP_STEP,
    harpsichords: [[[0, 1], [0, 2]]],
    band: [["Recorder I", [1, 1]], ["Recorder II", [2, 1]], ["Violin I", [3, 1]], ["Violin II", [4, 1]], ["Viola", [1, 2], 1], ["Continuo", [2, 2]]],
    movements: [m("I. (Allegro)", 0, 428, "F"), m("II. Andante", 428, 500, "d"), m("III. Allegro assai", 500, 744, "F")],
  },
  {
    bwv: 1058, title: "Harpsichord Concerto No. 7 in G minor", score: "132209", page: VERITS("132209"), credit: VERITS_CREDIT, transpose: UP_STEP,
    harpsichords: [[[0, 1], [0, 2]]],
    // Here Violin I's keyboard part carries the continuo, Violin II's the viola.
    band: [["Violin I", [1, 1]], ["Violin II", [2, 1]], ["Viola", [2, 2], 1], ["Continuo", [1, 2]]],
    movements: [m("I. (Allegro)", 0, 173, "g"), m("II. Andante", 173, 220, "Bb"), m("III. Allegro assai", 220, 641, "g")],
  },
  {
    // D351: BWV 1059, a reconstruction. Bach left nine bars of a harpsichord concerto in D minor (the opening of Cantata 35's first
    // sinfonia); verits99's "trial reconstruction based on BWV 35" completes it from the cantata: I. its first Sinfonia, II. the aria
    // "Gott hat alles wohlgemacht" (alto, organ obbligato, continuo), III. its second Sinfonia (Presto). A keyboard score at A = 415 Hz
    // (written in C-sharp minor: read up a step, D minor), four keyboard parts named only "harp", the parts differently in each movement
    // (found by register, texture and doubling: SOURCE.md): I. part 1 the solo; Violin I | Viola (8vb) on part 2, Violin II's
    // doubling of Violin I (85% of its attacks) | the continuo on part 3, Violin II's own line | the continuo again (96%) on part 4 (the
    // doublings not read); II. the aria's alto line on part 1's upper staff (the harpsichord's right hand) and the organ's obbligato on
    // part 2's (its left hand), the continuo below (part 1's lower staff the same notes: not read), the strings resting; III. Violin I |
    // Viola (8vb) on part 1, Violin II | Continuo on part 2, the solo on part 3 (its left hand the continuo an octave lower).
    bwv: 1059, title: "Harpsichord Concerto in D minor (reconstruction from Cantata 35)", score: "853226", page: VERITS("853226"),
    credit: "HARPSICHORD CONCERTO BWV 1059, A RECONSTRUCTION FROM CANTATA 35 (BACH LEFT NINE BARS): VERITS99 ON MUSESCORE (PDMX) · CC0 1.0",
    reconstruction: "A RECONSTRUCTION: BACH LEFT ONLY NINE BARS; VERITS99 COMPLETED IT FROM CANTATA 35",
    transpose: UP_STEP,
    harpsichords: [[[0, 1], [0, 2]]],
    band: [["Violin I", [1, 1]], ["Violin II", [3, 1]], ["Viola", [1, 2], 1], ["Continuo", [2, 2]]],
    movements: [
      m("I. (Allegro)", 0, 133, "d"),
      { ...m("II. (Andante)", 133, 205, "F", false), harpsichords: [[[0, 1], [1, 1]]], band: [["Violin I", NONE], ["Violin II", NONE], ["Viola", NONE], ["Continuo", [1, 2]]] },
      { ...m("III. Presto", 205, 437, "d"), harpsichords: [[[2, 1], [2, 2]]], band: KEYBOARD_STRINGS(0) },
    ],
  },
  {
    bwv: 1060, title: "Concerto for Two Harpsichords in C minor", score: "3512851", page: VERITS("3512851"), credit: VERITS_CREDIT,
    harpsichords: [[[4, 1], [4, 2]], [[5, 1], [5, 2]]], band: FULL_STRINGS,
    movements: [m("I. Allegro", 0, 110, "c"), m("II. Adagio", 110, 148, "Eb", false), m("III. Allegro", 148, 327, "c")],
  },
  {
    bwv: 1061, title: "Concerto for Two Harpsichords in C major", score: "3513726", page: VERITS("3513726"), credit: VERITS_CREDIT,
    harpsichords: [[[4, 1], [4, 2]], [[5, 1], [5, 2]]], band: FULL_STRINGS,
    // The Adagio is for the two harpsichords alone (the strings rest).
    movements: [m("I. (Allegro)", 0, 167, "C"), m("II. Adagio ovvero Largo", 167, 231, "a", false), m("III. Fuga", 231, 371, "C")],
  },
  {
    bwv: 1062, title: "Concerto for Two Harpsichords in C minor", score: "3519861", page: VERITS("3519861"), credit: VERITS_CREDIT,
    harpsichords: [[[4, 1], [4, 2]], [[5, 1], [5, 2]]], band: FULL_STRINGS,
    movements: [m("I. (Allegro)", 0, 88, "c"), m("II. Andante", 88, 139, "Eb", false), m("III. Allegro assai", 139, 294, "c")],
  },
  {
    bwv: 1063, title: "Concerto for Three Harpsichords in D minor", score: "836896", page: VERITS("836896"), credit: VERITS_CREDIT,
    harpsichords: [[[0, 1], [0, 2]], [[1, 1], [1, 2]], [[2, 1], [2, 2]]], band: KEYBOARD_STRINGS(3),
    movements: [m("I. (Allegro)", 0, 290, "d"), m("II. Alla Siciliana", 290, 359, "F", false), m("III. Allegro", 359, 583, "d")],
  },
  {
    bwv: 1064, title: "Concerto for Three Harpsichords in C major", score: "130435", page: VERITS("130435"), credit: VERITS_CREDIT,
    harpsichords: [[[0, 1], [0, 2]], [[1, 1], [1, 2]], [[2, 1], [2, 2]]], band: KEYBOARD_STRINGS(3),
    movements: [m("I. (Allegro)", 0, 141, "C"), m("II. Adagio", 141, 188, "a", false), m("III. Allegro", 188, 380, "C")],
  },
  {
    bwv: 1065, title: "Concerto for Four Harpsichords in A minor", score: "418001", page: VERITS("418001"), credit: VERITS_CREDIT,
    harpsichords: [[[0, 1], [0, 2]], [[1, 1], [1, 2]], [[2, 1], [2, 2]], [[3, 1], [3, 2]]], band: KEYBOARD_STRINGS(4),
    movements: [m("I. (Allegro)", 0, 103, "a", false), m("II. Largo", 103, 145, "a", false), m("III. Allegro", 145, 268, "a")],
  },
];

const ROMAN = ["", "I", "II", "III", "IV"];

/**
 * Reference tempi, quarter notes a minute (the movement's beat in the comment): moderate, historically
 * informed, about what period-instrument recordings take (Pinnock and the English Concert, Koopman and
 * the Amsterdam Baroque Orchestra, Haugsand, Staier and the Freiburger Barockorchester, Christophers'
 * and Hantaï's ensembles), a little under their usual speed, as BWV 1043's (D340). What is played is
 * lower still where the busiest line the player may take would pass 5.5 notes a second
 * (tools/tempi/more-bach.ts; here, no floor: the cap holds).
 */
export const REFERENCE: Record<string, number> = {
  "bwv1052-1": 100, "bwv1052-2": 46, "bwv1052-3": 126,
  "bwv1053-1": 100, "bwv1053-2": 66 /* ♩. = 44 */, "bwv1053-3": 108 /* ♩. = 72 */,
  "bwv1054-1": 104, "bwv1054-2": 48, "bwv1054-3": 120 /* ♩. = 80 */,
  "bwv1055-1": 104, "bwv1055-2": 60 /* ♩. = 40 */, "bwv1055-3": 99 /* ♩. = 66 */,
  "bwv1056-1": 92, "bwv1056-2": 50, "bwv1056-3": 132 /* ♩. = 88 */,
  "bwv1057-1": 112 /* ♩. = 75 */, "bwv1057-2": 60, "bwv1057-3": 160 /* 𝅗𝅥 = 80 */,
  "bwv1058-1": 96, "bwv1058-2": 56, "bwv1058-3": 144 /* ♩. = 96 */,
  // D351: BWV 1059R as the cantata's numbers are played (Sinfonia ♩ 100; the aria's moving ♩ 72; the Presto ♪ 264, ♩. = 88).
  "bwv1059-1": 100, "bwv1059-2": 72, "bwv1059-3": 132 /* ♩. = 88 */,
  "bwv1060-1": 96, "bwv1060-2": 54 /* ♩. = 36 */, "bwv1060-3": 112,
  "bwv1061-1": 100, "bwv1061-2": 50 /* ♩. = 33 */, "bwv1061-3": 104,
  "bwv1062-1": 96, "bwv1062-2": 60 /* ♩. = 40 */, "bwv1062-3": 126,
  "bwv1063-1": 108 /* ♩. = 72 */, "bwv1063-2": 72 /* ♩. = 48 */, "bwv1063-3": 104,
  "bwv1064-1": 100, "bwv1064-2": 52, "bwv1064-3": 108,
  "bwv1065-1": 104, "bwv1065-2": 46, "bwv1065-3": 108 /* ♩. = 72 */,
};
/** The game's load (D312): the busiest line the player takes at most 5.5 notes a second. */
export const GAME_LOAD = 5.5;
/** A line that would hold the movement under 40% of its reference tempo is not offered (the band plays it). */
export const PLAYABLE_FLOOR = 0.4;

/** The busiest of some voices' 90th-percentile onsets a second (2-second windows, every 0.5 s) at ♩ = 60 (compute.ts's, D312). */
export function busiest60(f: { tpq: number; voices: Note[][] }, which: number[] = f.voices.map((_, i) => i)): number {
  let worst = 0;
  for (const i of which) {
    const ons = [...new Set(f.voices[i].map((n) => n[0]))].sort((a, b) => a - b).map((t) => t / f.tpq);
    if (ons.length < 2) continue;
    const d: number[] = [];
    let a = 0;
    let b = 0;
    for (let t = ons[0]; t < ons[ons.length - 1]; t += 0.5) {
      while (a < ons.length && ons[a] < t) a++;
      while (b < ons.length && ons[b] < t + 2) b++;
      d.push((b - a) / 2);
    }
    const s = d.sort((x, y) => x - y);
    worst = Math.max(worst, s[Math.min(s.length - 1, Math.floor(0.9 * s.length))]);
  }
  return worst;
}

/**
 * A trill written out (the editions' playback) back to its note: a run of four or more notes of a
 * demisemiquaver or less, one after another, alternating between two pitches a tone or a semitone
 * apart, as one note of the run's length on the lower pitch (the main note: Bach's trills begin on the
 * upper). Its closing turn, if any, stays. Only in the lines the player may take (so they sound plain as the band's too).
 */
export function untrill(line: Note[], tpq: number): { line: Note[]; trills: number } {
  const short = tpq / 8;
  const out: Note[] = [];
  let trills = 0;
  for (let i = 0; i < line.length; ) {
    const [a, b] = [line[i], line[i + 1]];
    let j = i + 1;
    if (b && a[1] <= short && Math.abs(b[2] - a[2]) >= 1 && Math.abs(b[2] - a[2]) <= 2)
      while (j < line.length && line[j][1] <= short && line[j][0] === line[j - 1][0] + line[j - 1][1] && line[j][2] === ((j - i) % 2 ? b[2] : a[2])) j++;
    if (j - i >= 4) {
      const last = line[j - 1];
      const low = a[2] < b[2] ? a : b;
      out.push([a[0], last[0] + last[1] - a[0], low[2], low[3]]);
      trills++;
      i = j;
    } else {
      out.push(a);
      i++;
    }
  }
  return { line: out, trills };
}

/** A line one note at a time: the highest (or lowest) note at each onset, held until the next; one under a higher note still held (over a lower one) left out. */
export function outline(notes: Note[], high: boolean): { line: Note[]; rest: Note[] } {
  const sorted = [...notes].sort((a, b) => a[0] - b[0] || (high ? b[2] - a[2] : a[2] - b[2]));
  const line: Note[] = [];
  const rest: Note[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j < sorted.length && sorted[j][0] === sorted[i][0]) j++;
    const best = sorted[i];
    const prev = line.at(-1);
    if (prev && prev[0] + prev[1] > best[0] && (high ? prev[2] > best[2] : prev[2] < best[2])) {
      rest.push(...sorted.slice(i, j));
    } else {
      if (prev && prev[0] + prev[1] > best[0]) prev[1] = best[0] - prev[0];
      line.push([...best] as Note);
      rest.push(...sorted.slice(i + 1, j));
    }
    i = j;
  }
  return { line, rest };
}

const byOnset = (v: Note[]) => v.sort((a, b) => a[0] - b[0] || b[2] - a[2]);

export interface Read {
  voices: Note[][];
  voiceNames: string[];
  playable: number[];
  spell: Record<number, string>;
  spelled: string[];
  bars: { n: number; on: number }[];
  meter: string;
  length: number;
}

const scores = new Map<string, XmlScore>();
export function scoreOf(c: Concerto): XmlScore {
  if (!scores.has(c.score)) scores.set(c.score, readMusicXml(`${DIR}${c.score}.mxl`, c.transpose));
  return scores.get(c.score)!;
}

/** A movement's voices, names, playable lines and bars. */
export function readMovement(c: Concerto, mv: Movement): Read {
  const x = scoreOf(c);
  // Empty measures opening or closing a movement (a bar of rests left between movements) are not its bars.
  const sounding = (k: number) => {
    const [a, b] = [x.measures[k].on, k + 1 < x.measures.length ? x.measures[k + 1].on : x.length];
    return x.parts.some((p) => p.notes.some((nn) => nn[0] < b && nn[0] + nn[1] > a));
  };
  let begin = mv.from;
  while (begin + 1 < mv.to && !sounding(begin)) begin++;
  let end = mv.to;
  while (end - 1 > begin && !sounding(end - 1)) end--;
  const start = x.measures[begin].on;
  // An upbeat written as a whole bar, rests then the upbeat (its first note half a bar in or later): the movement begins on that note (bar 0).
  const next = x.measures[begin + 1]?.on ?? x.length;
  const first = Math.min(...x.parts.flatMap((p) => p.notes.filter((nn) => nn[0] >= start && nn[0] < next).map((nn) => nn[0])), next);
  const lead = first > start && first < next && first - start >= (next - start) / 2 ? first - start : 0;
  const from = start + lead;
  const to = end < x.measures.length ? x.measures[end].on : x.length;
  const spell: Record<number, string> = {};
  const spelled: string[] = [];
  const take = ([part, staff]: Src, octaves = 0): Note[] =>
    (x.parts[part]?.notes ?? [])
      .filter((n) => n[3] === staff && n[0] >= from && n[0] < to)
      .map(([on, dur, pitch]) => {
        const p = parsePitch(pitch);
        const midi = p.midi + 12 * octaves;
        const name = octaves ? pitch.replace(/-?\d+$/, (o) => String(Number(o) + octaves)) : pitch;
        spell[midi] ??= name;
        spelled.push(name);
        return [on - from, Math.min(dur, to - on), midi, p.diatonic + 7 * octaves] as Note;
      });
  const hs = mv.harpsichords ?? c.harpsichords;
  const n = hs.length;
  const tops: Note[][] = [];
  const basses: Note[][] = [];
  const inners: Note[][] = [];
  hs.forEach(([rh, lh]) => {
    const t = outline(take(rh), true);
    const b = outline(take(lh), false);
    tops.push(untrill(t.line, TPQ).line);
    basses.push(untrill(b.line, TPQ).line);
    inners.push(byOnset([...t.rest, ...b.rest]));
  });
  const voices: Note[][] = [];
  const names: string[] = [];
  const playable: number[] = [];
  const who = (h: number) => (n === 1 ? "Harpsichord" : `Harpsichord ${ROMAN[h + 1]}`);
  for (let h = 0; h < n; h++) {
    playable.push(voices.length, voices.length + 1);
    voices.push(tops[h], basses[h]);
    names.push(`${who(h)}, right hand`, `${who(h)}, left hand`);
  }
  // One inner voice for each of one or two harpsichords; for three or four, one for all (fewer voices to sound).
  if (n <= 2)
    inners.forEach((v, h) => {
      voices.push(v);
      names.push(`${who(h)}, inner notes`);
    });
  else {
    voices.push(byOnset(inners.flat()));
    names.push("Harpsichords, inner notes");
  }
  const lines = (mv.band ?? c.band).map(([name, src, oct]) => ({ name, notes: take(src, oct) }));
  const v1 = lines.findIndex((l) => l.name === "Violin I");
  const v2 = lines.findIndex((l) => l.name === "Violin II");
  // Violin I one note at a time (its double stops' lower notes to Violin II).
  const o = outline(lines[v1].notes, true);
  lines[v1].notes = mv.violin ? untrill(o.line, TPQ).line : o.line;
  lines[v2].notes = byOnset([...lines[v2].notes, ...o.rest]);
  for (const [i, l] of lines.entries()) {
    if (i === v1 && mv.violin) playable.push(voices.length);
    voices.push(byOnset(l.notes));
    names.push(l.name);
  }
  // The bars: from 1 in the movement (an upbeat, a short first measure, bar 0); a measure marked implicit not counted.
  const ms = x.measures.slice(begin, end);
  const meter = x.measures.slice(0, begin + 1).reverse().find((q) => q.time)?.time ?? x.meter;
  const barLen = ((Number(meter.split("/")[0]) * 4) / Number(meter.split("/")[1])) * TPQ;
  const firstLen = (ms[1]?.on ?? to) - ms[0].on;
  let bar = ms[0].implicit || firstLen < barLen || lead ? 0 : 1;
  const bars = ms.map((q, i) => ({ n: i === 0 ? bar : q.implicit ? bar : ++bar, on: i === 0 ? 0 : q.on - from }));
  return { voices, voiceNames: names, playable, spell, spelled, bars, meter, length: to - from };
}

const keyWords = (k: string) => `${k[0].toUpperCase()}${k.slice(1).replace("b", "♭").replace("#", "♯")} ${k[0] === k[0].toLowerCase() ? "minor" : "major"}`;
export const idOf = (c: Concerto, i: number) => `bwv${c.bwv}-${i + 1}`;

export function build(c: Concerto, i: number, number: number) {
  const mv = c.movements[i];
  const r = readMovement(c, mv);
  const barTicks = ((Number(r.meter.split("/")[0]) * 4) / Number(r.meter.split("/")[1])) * TPQ;
  const piece = { tpq: TPQ, meter: r.meter, bars: r.bars, length: r.length, voices: r.voices, key: mv.key };
  const cadences = findCadences(piece, keySpeller(r.spelled));
  // A line too busy to be played near the movement's pace stays with the band (PLAYABLE_FLOOR).
  const ref = REFERENCE[idOf(c, i)];
  const cap = (v: number) => (GAME_LOAD / Math.max(1e-9, busiest60({ tpq: TPQ, voices: r.voices }, [v]))) * 60;
  const offered = r.playable.filter((v) => cap(v) >= PLAYABLE_FLOOR * ref);
  const playable = offered.length ? offered : [r.playable.reduce((a, b) => (cap(b) > cap(a) ? b : a))];
  const f = {
    id: idOf(c, i),
    kind: "fugue" as const,
    book: 3,
    number,
    title: `${c.title}, BWV ${c.bwv}${c.reconstruction ? "R" : ""}: ${mv.name}`,
    key: mv.key,
    bwv: `${c.bwv}/${i + 1}`,
    meter: r.meter,
    tpq: TPQ,
    length: r.length,
    barTicks,
    bars: r.bars,
    voiceNames: r.voiceNames,
    voices: r.voices,
    entries: [],
    keys: cadences.map((e) => ({ on: e.on, key: e.key })).sort((a, b) => a.on - b.on),
    spell: r.spell,
    sections: [{ name: "Whole", fromBar: r.bars[0]?.n ?? 1, toBar: r.bars.at(-1)?.n ?? 1, from: 0, to: r.length }],
    cadences,
    countersubject: [],
    collection: "hconcerto" as const,
    short: `BWV ${c.bwv} · ${mv.name.toUpperCase()}${c.reconstruction ? " · RECONSTRUCTION" : ""}`,
    // D351: a reconstruction says so (its card, its pop-up).
    ...(c.reconstruction ? { reconstruction: c.reconstruction } : {}),
    credit: c.credit,
    source: c.page,
    // The first harpsichord's right hand offered first.
    defaultVoice: playable[0],
    playable,
  };
  homeward(f);
  if (!f.keys.length) f.keys = [{ on: 0, key: mv.key }];
  return f;
}

/** For the card's line and the report: `keyWords` of a movement's key. */
export const movementKey = (k: string) => keyWords(k);

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = [];
  let n = 0;
  for (const c of CONCERTOS)
    for (let i = 0; i < c.movements.length; i++) {
      const f = build(c, i, ++n);
      out.push(f);
      console.log(
        `${f.id.padEnd(11)} ${f.meter.padEnd(5)} bars ${f.bars[0].n}-${f.bars.at(-1)!.n} voices ${f.voices.length} notes ${f.voices.map((v) => v.length).join("/")} playable ${f.playable.join(",")} (busiest at ♩=60: ${f.playable.map((v) => busiest60(f, [v]).toFixed(1)).join("/")}) cadences ${f.cadences.length}`,
      );
    }
  writeFileSync(`${ROOT}data/touch/concertos.json`, JSON.stringify(out) + "\n");
  console.log(`wrote data/touch/concertos.json: ${out.length} pieces, ${out.reduce((t, f) => t + f.voices.flat().length, 0)} notes`);
}
