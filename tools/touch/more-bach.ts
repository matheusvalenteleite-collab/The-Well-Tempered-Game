/**
 * D340 (WTC 1.54): writes data/touch/more-bach.json, the MORE BACH tab's pieces in the touch game's
 * shape (src/touch/fugue.ts TouchFugue), from the Mutopia Project's public-domain and CC BY-SA
 * editions (data/sources/{art-of-fugue,musical-offering,bach-inventions,bach-1043}/SOURCE.md):
 *   - the Art of Fugue, BWV 1080: Contrapunctus 1-11, the mirror fugues 12 (a 4) and 13 (a 3), each
 *     rectus and inversus, and the four canons (Contrapunctus 14, the unfinished fugue, stays in
 *     data/touch/pieces.json, from tools/touch/extract.ts, D169);
 *   - the two ricercars of the Musical Offering, BWV 1079;
 *   - the 15 Inventions and 15 Sinfonias, BWV 772-801;
 *   - the Concerto for Two Violins, BWV 1043, its three movements (the player: either solo violin).
 * Each piece is read from the edition's LilyPond file (tools/wtc/lily.py through lily_json.py: the
 * voices as typeset, the pitches as spelled, the bars), each \repeat volta once as printed; where that
 * reader cannot separate the voices (Contrapunctus 1's include files, the mirror fugues' tags) from the
 * edition's own MIDI file, a track a voice, spelled from the LilyPond notes where they agree. Either way
 * the LilyPond and the MIDI are checked against each other note by note (the share printed).
 * Computed as for the WTC (tools/touch/extract.ts, analysis.ts): a fugue's subject and answer (the
 * first two voices' openings, src/wtc/fugue.ts) and its entries (by the head, upright and inverted,
 * in augmentation and diminution), keyed, subject or answer by key; the cadences; the keys the music
 * reaches (entries, else cadences), brought home at the end (homeward). The canons and the concerto
 * have no entries (a canon's every bar is the subject; a concerto's ritornello is not a fugue's).
 * Run: node tools/touch/more-bach.ts   (needs python3 for the LilyPond reader)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { findEntriesByHead, findTransformed, line, subjectAndAnswer, type Note as Line } from "../../src/wtc/fugue.ts";
import { readMidi } from "./midi.ts";
import { buildEntries, findCadences, homeward, keySpeller, type Note, type RawEntry } from "./analysis.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SRC = `${ROOT}data/sources/`;

export type Collection = "aof" | "mo" | "inv" | "sin" | "concerto";

interface Spec {
  id: string;
  collection: Collection;
  /** Its place in the tab's section, from 1. */
  number: number;
  title: string;
  /** What the card says it is: "CONTRAPUNCTUS 1", "CANON ALLA OTTAVA"… */
  short: string;
  bwv: string;
  key: string;
  /** The Mutopia piece (data/sources/<dir>/mutopia/<mutopia>/). */
  dir: string;
  mutopia: number;
  /** The LilyPond file (and \score) read; the MIDI file read or checked against. */
  ly?: string;
  score?: number;
  mid?: string;
  /** Voices from the MIDI tracks (the LilyPond read for spelling and checking only). */
  fromMidi?: boolean;
  /** The LilyPond voices in score order (top first), where the reader names more than the piece has. */
  lyVoices?: string[];
  voiceNames: string[];
  /** Entries found (a fugue, an invention, a sinfonia); none for a canon or the concerto. */
  entries: boolean;
  /** The voices the player may take (all where unset). */
  playable?: number[];
  /** The edition's typesetter and licence, for the credit line. */
  credit: string;
}

const AOF_CREDIT = "MUTOPIA PROJECT · TYPESET BY ARNAUD GOSSART FROM BREITKOPF & HÄRTEL 1885 · PUBLIC DOMAIN";
const INV_PD = "MUTOPIA PROJECT · TYPESET BY ALLEN GARVIN FROM THE BACH-GESELLSCHAFT EDITION · PUBLIC DOMAIN";
const INV_BYSA = "MUTOPIA PROJECT · TYPESET BY JEFF COVEY FROM THE BACH-GESELLSCHAFT EDITION · CC BY-SA 3.0";
const SIN_PD = "MUTOPIA PROJECT · TYPESET BY OLIVIER VERMERSCH · PUBLIC DOMAIN";

const FOUR = ["Soprano", "Alto", "Tenor", "Bass"];
const THREE = ["Soprano", "Alto", "Bass"];
const TWO_HANDS = ["Right hand", "Left hand"];
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX"];

/** The Art of Fugue in today's numbering (BWV 1080/1-17), from Mutopia's (the Bach-Gesellschaft's, 1878). */
const AOF: Spec[] = [
  ...[693, 719, 720, 721, 722, 734, 736, 739, 740, 744, 745].map((mutopia, i): Spec => {
    const n = i + 1;
    const file = `contrapunctus${ROMAN[n]}`;
    return {
      id: `bwv1080-${String(n).padStart(2, "0")}`,
      collection: "aof",
      number: n,
      title: `Contrapunctus ${n}`,
      short: `CONTRAPUNCTUS ${n}`,
      bwv: `1080/${n}`,
      key: "d",
      dir: "art-of-fugue",
      mutopia,
      ly: `${file}.ly`,
      mid: `${file}.mid`,
      // Contrapunctus 1's voices are include files the reader does not take apart (its "\part" commands).
      fromMidi: n === 1,
      voiceNames: n === 8 ? THREE : FOUR,
      entries: true,
      credit: n === 1 ? "MUTOPIA PROJECT · TYPESET BY PIERRE-LUC GAUTHIER FROM BREITKOPF & HÄRTEL 1885 · PUBLIC DOMAIN" : AOF_CREDIT,
    };
  }),
  // The mirror fugues: Mutopia's XVIII (a 4) and XVI (a 3), rectus and inversus each a piece, from the MIDI (the LilyPond keeps both forms in one file by tags).
  ...(
    [
      [12, "a 4", 764, FOUR],
      [13, "a 3", 751, THREE],
    ] as const
  ).flatMap(([n, a, mutopia, names]) =>
    (["rectus", "inversus"] as const).map(
      (form): Spec => ({
        id: `bwv1080-${n}${form[0]}`,
        collection: "aof",
        number: n,
        title: `Contrapunctus ${n} ${a}, ${form}`,
        short: `CONTRAPUNCTUS ${n} · ${form.toUpperCase()}`,
        bwv: `1080/${n}`,
        key: "d",
        dir: "art-of-fugue",
        mutopia,
        ly: `${form}.ly`,
        mid: `${form}.mid`,
        fromMidi: true,
        voiceNames: [...names],
        entries: true,
        credit: AOF_CREDIT,
      }),
    ),
  ),
  // The canons, in today's order (BWV 1080/14-17): Mutopia's XV, XII, XIV, XIII.
  ...(
    [
      [14, "per Augmentationem in Contrario Motu", "PER AUGMENTATIONEM", 750, "XV"],
      [15, "alla Ottava", "ALLA OTTAVA", 746, "XII"],
      [16, "alla Decima", "ALLA DECIMA", 749, "XIV"],
      [17, "alla Duodecima", "ALLA DUODECIMA", 748, "XIII"],
    ] as const
  ).map(
    ([n, name, short, mutopia, bg]): Spec => ({
      id: `bwv1080-c${n}`,
      collection: "aof",
      number: n,
      title: `Canon ${name}`,
      short: `CANON ${short}`,
      bwv: `1080/${n}`,
      key: "d",
      dir: "art-of-fugue",
      mutopia,
      ly: `contrapunctus${bg}.ly`,
      mid: `contrapunctus${bg}.mid`,
      voiceNames: ["Upper", "Lower"],
      entries: false,
      credit: AOF_CREDIT,
    }),
  ),
];

const MO: Spec[] = [
  {
    id: "bwv1079-ric3",
    collection: "mo",
    number: 1,
    title: "Ricercar a 3",
    short: "RICERCAR A 3",
    bwv: "1079/1",
    key: "c",
    dir: "musical-offering",
    mutopia: 690,
    ly: "ricercare.ly",
    mid: "ricercare.mid",
    lyVoices: ["upper:1", "upper:2", "lower"],
    voiceNames: THREE,
    entries: true,
    credit: AOF_CREDIT,
  },
  {
    id: "bwv1079-ric6",
    collection: "mo",
    number: 2,
    title: "Ricercar a 6",
    short: "RICERCAR A 6",
    bwv: "1079/5",
    key: "c",
    dir: "musical-offering",
    mutopia: 702,
    ly: "ricercare6.ly",
    mid: "ricercare6.mid",
    lyVoices: ["staff1", "staff2", "staff3", "staff4", "staff5", "staff6"],
    voiceNames: ["Soprano", "Mezzo", "Alto", "Tenor", "Baritone", "Bass"],
    entries: true,
    credit: AOF_CREDIT,
  },
];

const KEYS = ["C", "c", "D", "d", "Eb", "E", "e", "F", "f", "G", "g", "A", "a", "Bb", "b"];
const INV_MUTOPIA = [40, 58, 70, 67, 55, 159, 73, 61, 171, 62, 71, 174, 59, 72, 68];
const SIN_MUTOPIA = [142, 140, 143, 172, 204, 173, 175, 176, 199, 205, 200, 144, 206, 213, 145];
const keyWords = (k: string) => `${k[0].toUpperCase()}${k.slice(1).replace("b", "♭").replace("#", "♯")} ${k[0] === k[0].toLowerCase() ? "minor" : "major"}`;

const INV: Spec[] = INV_MUTOPIA.map((mutopia, i) => {
  const n = i + 1;
  const bysa = [1, 6, 9, 12].includes(n);
  return {
    id: `bwv${772 + i}`,
    collection: "inv",
    number: n,
    title: `Invention ${n} in ${keyWords(KEYS[i])}`,
    short: `INVENTION ${n}`,
    bwv: String(772 + i),
    key: KEYS[i],
    dir: "bach-inventions",
    mutopia,
    ly: `bach-invention-${String(n).padStart(2, "0")}.ly`,
    mid: `bach-invention-${String(n).padStart(2, "0")}.mid`,
    lyVoices: ["upper", "lower"],
    voiceNames: TWO_HANDS,
    entries: true,
    credit: bysa ? INV_BYSA : INV_PD,
  };
});

const SIN: Spec[] = SIN_MUTOPIA.map((mutopia, i) => ({
  id: `bwv${787 + i}`,
  collection: "sin",
  number: i + 1,
  title: `Sinfonia ${i + 1} in ${keyWords(KEYS[i])}`,
  short: `SINFONIA ${i + 1}`,
  bwv: String(787 + i),
  key: KEYS[i],
  dir: "bach-inventions",
  mutopia,
  ly: `bwv${787 + i}.ly`,
  mid: `bwv${787 + i}.mid`,
  lyVoices: ["VA", "VB", "lower"],
  voiceNames: THREE,
  entries: true,
  credit: i + 1 === 5 ? "MUTOPIA PROJECT · TYPESET BY OLIVIER VERMERSCH FROM THE BACH-GESELLSCHAFT EDITION · PUBLIC DOMAIN" : SIN_PD,
}));

const CONCERTO: Spec[] = (
  [
    [1, "I. Vivace", "d", "score.mid"],
    [2, "II. Largo ma non tanto", "F", "score-1.mid"],
    [3, "III. Allegro", "d", "score-2.mid"],
  ] as const
).map(([n, name, key, mid]) => ({
  id: `bwv1043-${n}`,
  collection: "concerto",
  number: n,
  title: `Concerto for Two Violins, ${name}`,
  short: `CONCERTO · ${name.toUpperCase()}`,
  bwv: `1043/${n}`,
  key,
  dir: "bach-1043",
  mutopia: 3,
  ly: "score.ly",
  score: n - 1,
  mid,
  lyVoices: ["SoloViolinI", "SoloViolinII", "ViolinI", "ViolinII", "Viola", "Continuo"],
  voiceNames: ["Solo Violin I", "Solo Violin II", "Violin I", "Violin II", "Viola", "Continuo"],
  entries: false,
  playable: [0, 1],
  credit: "MUTOPIA PROJECT · TYPESET BY DAVID CHAN FROM THE BACH-GESELLSCHAFT EDITION (1874) · PUBLIC DOMAIN",
}));

export const SPECS: Spec[] = [...AOF, ...MO, ...INV, ...SIN, ...CONCERTO];

// --- Reading --------------------------------------------------------------------------------------

interface LyNote {
  on: string;
  dur: string;
  pitch: string;
  midi: number;
  voice: string;
  staff: string;
  grace: boolean;
}
interface LyScore {
  notes: LyNote[];
  measures: { n: number; on: string }[];
  times: { on: string; text: string }[];
  partial: string | null;
  length: string;
  warnings: string[];
}

/** Whole notes as "n/d" to ticks. */
const ticks = (f: string) => {
  const [n, d] = f.split("/").map(Number);
  return Math.round((n / d) * 4 * TPQ);
};

export function readLy(path: string, score = 0, asWritten = true): LyScore {
  const args = ["-I", `${ROOT}tools/touch/lily_json.py`, path, String(score)];
  if (asWritten) args.push("--as-written");
  return JSON.parse(execFileSync("python3", args, { encoding: "utf8", maxBuffer: 64 << 20 }));
}

/** The bars from the time signatures (a MIDI file's), bar 1 at the first downbeat after an upbeat of `partial` ticks. */
function barsFrom(times: { tick: number; num: number; den: number }[], length: number, partial = 0) {
  const bars: { n: number; on: number }[] = [];
  const sig = (t: number) => times.filter((x) => x.tick <= t).at(-1) ?? { tick: 0, num: 4, den: 4 };
  let t = 0;
  let n = 1;
  if (partial) {
    bars.push({ n: 0, on: 0 });
    t = partial;
  }
  while (t < length - 1) {
    bars.push({ n, on: t });
    const s = sig(t);
    t += (s.num * 4 * TPQ) / s.den;
    n++;
  }
  return bars;
}

const mean = (v: Note[]) => v.reduce((t, n) => t + n[2], 0) / Math.max(1, v.length);
const sortVoice = (v: Note[]) => v.sort((a, b) => a[0] - b[0] || b[2] - a[2]);

export interface Read {
  voices: Note[][];
  spell: Record<number, string>;
  spelled: string[];
  bars: { n: number; on: number }[];
  meter: string;
  length: number;
  /** The share of the MIDI file's attacks (onset, pitch) the LilyPond notes hold, and the other way round. */
  agree: { midiInLy: number; lyInMidi: number; midiNotes: number; lyNotes: number };
}

export function readPiece(s: Spec): Read {
  const dir = `${SRC}${s.dir}/mutopia/${s.mutopia}/`;
  const ly = s.ly ? readLy(`${dir}${s.ly}`, s.score ?? 0) : null;
  const m = s.mid ? readMidi(readFileSync(`${dir}${s.mid}`)) : null;
  const k = m ? TPQ / m.division : 1;
  const midiNotes = m ? m.tracks.filter((t) => t.notes.length).map((t) => t.notes.map(([on, dur, midi]) => [Math.round(on * k), Math.round(dur * k), midi] as const)) : [];
  const lyNotes = ly ? ly.notes.filter((n) => !n.grace && n.dur !== "0/1") : [];
  // Spelling: the LilyPond's, by onset and pitch (then by pitch alone, the commonest).
  const byAttack = new Map<string, string>();
  const byMidi = new Map<number, Map<string, number>>();
  for (const n of lyNotes) {
    byAttack.set(`${ticks(n.on)}:${n.midi}`, n.pitch);
    if (!byMidi.has(n.midi)) byMidi.set(n.midi, new Map());
    const c = byMidi.get(n.midi)!;
    c.set(n.pitch, (c.get(n.pitch) ?? 0) + 1);
  }
  const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
  const spellOf = (on: number, midi: number) =>
    byAttack.get(`${on}:${midi}`) ?? [...(byMidi.get(midi)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
  const spell: Record<number, string> = {};
  const spelled: string[] = [];
  const note = (on: number, dur: number, midi: number, name: string): Note => {
    spell[midi] ??= name;
    spelled.push(name);
    return [on, dur, midi, parsePitch(name).diatonic];
  };

  let voices: Note[][];
  if (s.fromMidi) {
    if (!m) throw new Error(`${s.id}: no MIDI`);
    voices = midiNotes.map((t) => sortVoice(t.map(([on, dur, midi]) => note(on, dur, midi, spellOf(on, midi)))));
    voices.sort((a, b) => mean(b) - mean(a));
  } else {
    if (!ly) throw new Error(`${s.id}: no LilyPond`);
    // The voices: those named, else those holding 3% of the notes or more; a few notes in a voice of
    // their own within a staff (a chord split for a bar, "staff1/v2", "staff1:1") go to the staff's voice.
    const count = new Map<string, number>();
    for (const n of lyNotes) count.set(n.voice, (count.get(n.voice) ?? 0) + 1);
    const ids = s.lyVoices ?? [...count].filter(([, c]) => c >= 0.03 * lyNotes.length).map(([v]) => v);
    const home = (v: string) => (ids.includes(v) ? v : ids.includes(v.split(/[:/]/)[0]) ? v.split(/[:/]/)[0] : null);
    const unknown = [...count.keys()].filter((v) => !home(v));
    if (unknown.length) throw new Error(`${s.id}: LilyPond voices ${unknown.join(", ")} not in ${ids.join(", ")}`);
    voices = ids.map((id) => sortVoice(lyNotes.filter((n) => home(n.voice) === id).map((n) => note(ticks(n.on), ticks(n.dur), n.midi, n.pitch))));
    if (!s.lyVoices) voices.sort((a, b) => mean(b) - mean(a));
  }
  if (voices.length !== s.voiceNames.length) throw new Error(`${s.id}: ${voices.length} voices, ${s.voiceNames.length} names`);
  const length = Math.max(...voices.flat().map((n) => n[0] + n[1]));

  let bars: { n: number; on: number }[];
  let meter: string;
  // The bars: the LilyPond's where it is read as the MIDI plays (its length the same), else from the MIDI's time signatures.
  if (ly && (!s.fromMidi || Math.abs(ticks(ly.length) - length) < TPQ / 8)) {
    bars = ly.measures.map((b) => ({ n: b.n, on: ticks(b.on) })).filter((b) => b.on < length);
    meter = ly.times[0]?.text ?? "4/4";
  } else {
    const t = m!.times.map((x) => ({ ...x, tick: Math.round(x.tick * k) }));
    bars = barsFrom(t, length);
    meter = `${t[0]?.num ?? 4}/${t[0]?.den ?? 4}`;
  }

  // The check: the MIDI's attacks against the LilyPond's (the LilyPond unfolded where the MIDI plays the repeats).
  const agreeWith = (lns: LyNote[]) => {
    const a = new Set(lns.filter((n) => !n.grace && n.dur !== "0/1").map((n) => `${ticks(n.on)}:${n.midi}`));
    const b = new Set(midiNotes.flat().map(([on, , midi]) => `${on}:${midi}`));
    const inter = [...b].filter((x) => a.has(x)).length;
    return { midiInLy: b.size ? inter / b.size : 0, lyInMidi: a.size ? inter / a.size : 0, midiNotes: b.size, lyNotes: a.size };
  };
  let agree = ly && m ? agreeWith(ly.notes) : { midiInLy: 0, lyInMidi: 0, midiNotes: 0, lyNotes: 0 };
  if (ly && m && agree.midiInLy < 0.9 && s.ly) {
    const unfolded = agreeWith(readLy(`${dir}${s.ly}`, s.score ?? 0, false).notes);
    if (unfolded.midiInLy > agree.midiInLy) agree = unfolded;
  }
  return { voices, spell, spelled, bars, meter, length, agree };
}

// --- Analysis -------------------------------------------------------------------------------------

/** A fugue's (an invention's, a sinfonia's) entries, as Contrapunctus XIV's first subject's (extract.ts contrapunctusAnalysis). */
function entriesOf(s: Spec, r: Read, piece: { tpq: number; meter: string; bars: { n: number; on: number }[]; length: number; voices: Note[][]; key: string }, speller: (pc: number, minor: boolean) => string) {
  const minor = s.key[0] === s.key[0].toLowerCase();
  const wp: WtcPiece = {
    id: s.id,
    book: 0,
    number: s.number,
    kind: "fugue",
    key: s.key[0].toUpperCase() + s.key.slice(1),
    mode: minor ? "minor" : "major",
    bwv: s.bwv,
    meter: r.meter,
    voices: r.voices.map((v) => v.filter((n, i) => !(i > 0 && v[i - 1][0] === n[0])).map(([on, dur, midi]) => [on, dur, r.spell[midi], 0])),
    bars: r.bars,
    length: r.length,
  };
  // The subject: the first two voices' openings (as the WTC's), kept where it has six notes or more and
  // is found in every voice; else (a bass entering with the first voice, an answer inverted, in
  // diminution or entering late) the first imitation (`imitation`), where it is found twice or more.
  const sa = subjectAndAnswer(wp);
  const byOpening = sa.subject.length >= 4 ? rawEntries(wp, sa.subject, sa.answer, false) : [];
  if (sa.subject.length >= 6 && new Set(byOpening.map((e) => e.voice)).size === wp.voices.length) return buildEntries(piece, byOpening, speller);
  const im = imitation(wp);
  const byImitation = im ? rawEntries(wp, im.subject, im.answer, im.inverted || im.scale !== 1) : [];
  const raw = byImitation.length >= 2 ? byImitation : byOpening;
  return raw.length >= 2 ? buildEntries(piece, raw, speller) : [];
}

/** The entries of a subject (and of its answer, where it is not inverted or rescaled), by the head and transformed. */
function rawEntries(wp: WtcPiece, subject: Line[], answer: Line[], answerInverted: boolean): RawEntry[] {
  const midi = (p: string) => parsePitch(p).midi;
  const span = subject[subject.length - 1].on + subject[subject.length - 1].dur - subject[0].on;
  const level = midi(answer[0].pitch) - midi(subject[0].pitch);
  const raw: RawEntry[] = [];
  const models: [Line[], number][] = answerInverted ? [[subject, 0]] : [
    [subject, 0],
    [answer, level],
  ];
  for (const [model, lv] of models) {
    for (const e of findEntriesByHead(wp, [...model]).entries) {
      if (raw.some((x) => x.voice === e.voice && Math.abs(x.on - e.on) < span)) continue;
      raw.push({ voice: e.voice, on: e.on, len: span, shift: midi(e.pitch) - midi(model[0].pitch) + lv, inverted: e.form === "inversion", scale: 1, theme: 1 });
    }
  }
  for (const e of findTransformed(wp, [...subject])) {
    if (raw.some((x) => x.voice === e.voice && Math.abs(x.on - e.on) < span * e.scale)) continue;
    raw.push({ voice: e.voice, on: e.on, len: Math.round(span * e.scale), shift: midi(e.pitch) - midi(subject[0].pitch), inverted: e.form === "inversion", scale: e.scale, theme: 1 });
  }
  return raw;
}

/**
 * The first imitation in a piece: a voice's opening that another voice takes up, at the same rhythm
 * (or twice as fast or slow) and the same steps by letter (or mirrored), the first four steps free of
 * one change (a tonal answer); the earliest such entry of six notes or more, then the longest. The
 * subject: the opening as far as the imitation follows it (at most 24 notes); the answer: the imitation.
 */
export function imitation(wp: WtcPiece): { subject: Line[]; answer: Line[]; inverted: boolean; scale: number } | null {
  const lines = wp.voices.map((v) => line(v)).filter((l) => l.length);
  const dia = (p: string) => parsePitch(p).diatonic;
  const barQ = ((Number(wp.meter.split("/")[0]) * 4) / Number(wp.meter.split("/")[1])) * TPQ;
  let best: { on: number; k: number; subject: Line[]; answer: Line[]; inverted: boolean; scale: number } | null = null;
  for (const a of lines)
    for (const b of lines) {
      if (a === b) continue;
      for (let j = 0; j < b.length && b[j].on <= a[0].on + 12 * barQ; j++) {
        if (b[j].on <= a[0].on) continue;
        for (const scale of [1, 0.5, 2])
          for (const inv of [false, true]) {
            let k = 0;
            let misses = 0;
            for (let i = 0; i + 1 < a.length && j + i + 1 < b.length && k < 23; i++) {
              const rhythm = (a[i + 1].on - a[i].on) * scale === b[j + i + 1].on - b[j + i].on;
              const step = (dia(a[i + 1].pitch) - dia(a[i].pitch)) * (inv ? -1 : 1) === dia(b[j + i + 1].pitch) - dia(b[j + i].pitch);
              // The head's first note may be held longer or shorter in the answer (one change in all).
              if ((rhythm || i === 0) && (step || i < 4) && (rhythm && step ? true : misses++ < 1)) k = i + 1;
              else break;
            }
            if (k + 1 < 6) continue;
            if (!best || b[j].on < best.on || (b[j].on === best.on && k > best.k))
              best = { on: b[j].on, k, subject: a.slice(0, k + 1), answer: b.slice(j, j + k + 1), inverted: inv, scale };
          }
      }
    }
  return best;
}

export function build(s: Spec) {
  const r = readPiece(s);
  const barTicks = ((Number(r.meter.split("/")[0]) * 4) / Number(r.meter.split("/")[1])) * TPQ;
  const piece = { tpq: TPQ, meter: r.meter, bars: r.bars, length: r.length, voices: r.voices, key: s.key };
  const speller = keySpeller(r.spelled);
  const entries = s.entries ? entriesOf(s, r, piece, speller) : [];
  const cadences = findCadences(piece, speller);
  const f = {
    id: s.id,
    kind: "fugue" as const,
    book: 3,
    number: s.number,
    title: s.title,
    key: s.key,
    bwv: s.bwv,
    meter: r.meter,
    tpq: TPQ,
    length: r.length,
    barTicks,
    bars: r.bars,
    voiceNames: s.voiceNames,
    voices: r.voices,
    entries,
    keys: (entries.length ? entries : cadences).map((e) => ({ on: e.on, key: e.key })).sort((a, b) => a.on - b.on),
    spell: r.spell,
    sections: [{ name: "Whole", fromBar: r.bars[0]?.n ?? 1, toBar: r.bars.at(-1)?.n ?? 1, from: 0, to: r.length }],
    cadences,
    countersubject: [],
    collection: s.collection,
    short: s.short,
    credit: s.credit,
    source: `https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=${s.mutopia}`,
    ...(s.playable ? { playable: s.playable } : {}),
  };
  homeward(f);
  // A piece where nothing is read (the Canon per Augmentationem: no cadence found) is in its home key throughout.
  if (!f.keys.length) f.keys = [{ on: 0, key: s.key }];
  return { f, agree: r.agree };
}

// --- Write ------------------------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = [];
  for (const s of SPECS) {
    const { f, agree } = build(s);
    out.push(f);
    const lastBar = f.bars.at(-1)?.n ?? 0;
    console.log(
      `${f.id.padEnd(14)} ${f.voices.length} voices ${String(lastBar).padStart(3)} bars ${f.meter.padEnd(5)} notes ${f.voices.map((v) => v.length).join("/")} entries ${f.entries.length} cadences ${f.cadences.length} · MIDI in LilyPond ${(agree.midiInLy * 100).toFixed(1)}%, LilyPond in MIDI ${(agree.lyInMidi * 100).toFixed(1)}%`,
    );
  }
  writeFileSync(`${ROOT}data/touch/more-bach.json`, JSON.stringify(out) + "\n");
  console.log(`wrote data/touch/more-bach.json: ${out.length} pieces, ${out.reduce((t, f) => t + f.voices.flat().length, 0)} notes`);
}
