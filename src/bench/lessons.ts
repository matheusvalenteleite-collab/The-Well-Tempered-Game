/**
 * The lessons with Herr Bach (D185, D188; D225: a track per platform). The computer's track teaches
 * HIGHWAY one step at a time, and what a fugue is on the way: the beat (TIMING); the line (DIRECTION:
 * right for up, left for down, on the home row's nine lanes); the same note and the free note; the
 * subject; the answer and the countersubject; the exposition and the episode; the leap (+ LEAPS); and a
 * whole fugue. The phone's track (phase 1): LADDER (waiting at each note) and SUBJECT. Fugues only.
 * The first lessons' passages are found in the fugues, not chosen by hand: the first stretch of a
 * voice whose moves hold only what has been taught (with what is new in it), no chords, notes between
 * a fifth of a second and a second and a half apart, each lesson its own fugue, searched in a fixed
 * list (Book I in Bach's order: D225, so that no change elsewhere moves a lesson). The lessons on the
 * fugue itself use the C minor fugue of Book I (alto subject, bar 1; soprano answer in G minor, bar 3;
 * an episode; bass, bar 7). D225: from the fourth lesson on, the crowd can leave (failure on).
 * Bach's words are in English, at most two lines before a lesson and one after, twenty words each.
 * His quotations are his title pages (the Well-Tempered Clavier, 1722; the Inventions and Sinfonias,
 * 1723), in translation; "the instrument plays itself" is told as hearsay, as it comes down to us.
 */
import { beatOf, fugueById, type TouchFugue } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { tempoOf } from "../touch/tempi.ts";
import { moves, type EasyLevel, type Move, type Platform, type ProtoId } from "./protos.ts";
import type { ProtoGame } from "./proto-game.ts";

/** A run's results (ProtoGame.results). */
export type Results = ReturnType<ProtoGame["results"]>;

export interface Run {
  /** D225: the mode the lesson is played in. */
  proto: ProtoId;
  /** D225: whether the crowd can leave (from the fourth lesson on). */
  fail: boolean;
  piece: string;
  voice: number;
  from: number;
  until: number;
  bpm: number;
  wait: boolean;
  solo: boolean;
  easy: EasyLevel;
}

/** A line of Bach's; `demo`: the subject played while it shows. */
export interface Line {
  text: string;
  demo?: "subject";
}

export interface Lesson {
  /** D225: kept by this (tb-tutorial-v1), unique in its track. */
  id: string;
  /** D225: the mode it teaches (the title card's LEARN THIS MODE). */
  mode: ProtoId;
  /** German, as he would name it; and in English. */
  title: string;
  english: string;
  /** At most two lines before, one after (D225). */
  intro: Line[];
  praise: Line[];
  again: Line[];
  run: () => Run;
  /** Passed (by default): the share right (of the notes, stray strikes half a note). */
  passAt: number;
  /** D225: passed or not, when the share right is not enough (the articulation, say). */
  pass?: (r: Results) => boolean;
}

/** The share right: of the notes, a stray strike half a note. */
export const accuracy = (r: Pick<Results, "right" | "of" | "stray">) => r.right / Math.max(1, r.of + r.stray / 2);
/** D225: a lesson passed: the run not lost, and its own rule (else the share right at `passAt`). */
export const passed = (l: Lesson, r: Results) => r.failedBar === null && (l.pass ? l.pass(r) : accuracy(r) >= l.passAt);

/** D225: where passages are looked for, in this order: the 24 fugues of Book I (fixed, so no change to the corpus moves a lesson). */
export const CANDIDATES = Array.from({ length: 24 }, (_, i) => `wtc1f${String(i + 1).padStart(2, "0")}`);

type Kind = "up" | "down" | "same" | "leap";
const kindOf = (m: Move): Kind => (m.dir === 0 || m.steps === 0 ? "same" : m.size >= 3 ? "leap" : m.dir > 0 ? "up" : "down");

interface Want {
  allow: Kind[];
  /** Each of these at least once. */
  need: Kind[];
  /** A free note (D217: after a rest of a beat or more) inside: needed, allowed, or not. */
  free: "need" | "allow" | "no";
  heads: number;
}

/** The first passage in the candidates that teaches what is wanted (Bach's order; each lesson its own fugue). */
export function findPassage(w: Want, skip: string[] = []): { f: TouchFugue; voice: number; from: number; until: number; bpm: number } {
  for (const id of CANDIDATES) {
    const f = fugueById(id);
    if (skip.includes(f.id) || f.id !== id) continue;
    const beat = beatOf(f).ticks;
    const bpm = tempoOf(f.id);
    const tps = (f.tpq * bpm) / 60;
    for (let v = 0; v < f.voices.length; v++) {
      const notes = laneNotes(f.voices[v], beat, v);
      const ms = moves(notes, beat);
      // D217: as ProtoGame.isFree: a rest of a beat (half a bar where a beat passes in under half a second).
      const restMin = beat / tps < 0.5 ? Math.max(beat, f.barTicks / 2) : beat;
      const free = (i: number) => notes[i].on - (notes[i - 1].on + notes[i - 1].dur) >= restMin;
      for (let i = 1; i + w.heads <= notes.length; i++) {
        const win = notes.slice(i, i + w.heads);
        if (win.some((n, k) => k > 0 && n.on === win[k - 1].on) || notes[i - 1].on === win[0].on) continue;
        if (i + w.heads < notes.length && notes[i + w.heads].on === win.at(-1)!.on) continue;
        if (win.some((n, k) => k > 0 && ((n.on - win[k - 1].on) / tps < 0.2 || (n.on - win[k - 1].on) / tps > 1.5))) continue;
        const inner = Array.from({ length: w.heads - 1 }, (_, k) => i + 1 + k);
        const frees = inner.filter(free).length;
        if ((w.free === "no" && frees) || (w.free === "need" && !frees)) continue;
        const kinds = inner.filter((j) => !free(j)).map((j) => kindOf(ms[j]));
        if (!kinds.every((k) => w.allow.includes(k)) || !w.need.every((k) => kinds.includes(k))) continue;
        const last = win.at(-1)!;
        return { f, voice: v, from: win[0].on, until: last.on + last.dur, bpm };
      }
    }
  }
  throw new Error(`no passage for ${w.need.join(" ")}`);
}

function passage(w: Want, easy: EasyLevel, wait: boolean, skip: string[], fail = false, proto: ProtoId = "keys"): Run {
  const p = findPassage(w, skip);
  return { proto, fail, piece: p.f.id, voice: p.voice, from: p.from, until: p.until, bpm: p.bpm, wait, solo: true, easy };
}

/** The C minor fugue (Book I no. 2): a voice from the start to the start of the entry `upTo` (in order of time). */
const C_MINOR = "wtc1f02";
function cMinor(voice: number, upTo: number, solo: boolean): Run {
  const f = fugueById(C_MINOR);
  const until = f.entries.map((e) => e.on).sort((a, b) => a - b)[upTo] ?? f.length;
  return { proto: "keys", fail: true, piece: f.id, voice, from: 0, until, bpm: tempoOf(f.id), wait: false, solo, easy: "direction" };
}
/** The C minor fugue's voice that has its first entry (the alto), and its second (the soprano). */
const entryVoice = (k: number) => [...fugueById(C_MINOR).entries].sort((a, b) => a.on - b.on)[k].voice;

/**
 * The exam (D225): the D sharp minor fugue of Book I, one star (D222) and of the testbench (with Kimiko
 * Ishizaka's recording), its voice with the fewest notes.
 */
export const EXAM = "wtc1f08";
function exam(): Run {
  const f = fugueById(EXAM);
  const voice = f.voices.map((v, i) => [v.length, i]).sort((a, b) => a[0] - b[0])[0][1];
  return { proto: "keys", fail: true, piece: f.id, voice, from: 0, until: f.length, bpm: tempoOf(f.id), wait: false, solo: false, easy: "direction" };
}

/** The fugues the found passages must not take: the C minor (kept for its lessons), the exam's, and those before. */
function before(n: number): string[] {
  return [C_MINOR, EXAM, ...LESSONS.slice(0, n).map((l) => l.run().piece)];
}

/** The computer's track: HIGHWAY (D188's lessons, D225's words). */
export const LESSONS: Lesson[] = [
  {
    id: "beat",
    mode: "keys",
    title: "DER TAKT",
    english: "THE BEAT",
    intro: [{ text: "So. You wish to play my fugues. First, time: strike any key as the note reaches the line." }, { text: "One voice, alone. Not before, not after." }],
    praise: [{ text: "They say the instrument plays itself, if you strike the right key at the right time. The time, you have." }],
    again: [{ text: "Early, late. Let the note come to you. Again." }],
    run: () => passage({ allow: ["up", "down", "same", "leap"], need: [], free: "allow", heads: 8 }, "timing", false, before(0)),
    passAt: 0.85,
  },
  {
    id: "line",
    mode: "keys",
    title: "DIE LINIE",
    english: "THE LINE",
    intro: [{ text: "Now the keys mean something. The home row is a line: to the right is higher, to the left lower." }, { text: "Hands on the home row, A to L. Follow each arrow; I will wait at every note." }],
    praise: [{ text: "Recht. You did not play notes; you played a line. That is the whole art." }],
    again: [{ text: "You went left; the voice went up. Look at the arrow, then strike. Again." }],
    run: () => passage({ allow: ["up", "down", "leap"], need: ["up", "down"], free: "no", heads: 10 }, "direction", true, before(1)),
    passAt: 0.9,
  },
  {
    id: "same",
    mode: "keys",
    title: "DIESELBE NOTE",
    english: "THE SAME NOTE",
    intro: [{ text: "A note struck again: the same key, or SPACE. G belongs to both index fingers." }, { text: "After a rest, any key will do; a square marks it. Now I will not wait." }],
    praise: [{ text: "So. Now nothing in a line can surprise you." }],
    again: [{ text: "The same note wants the same key. Again." }],
    run: () => passage({ allow: ["up", "down", "same", "leap"], need: ["same", "up", "down"], free: "need", heads: 12 }, "direction", false, before(2)),
    passAt: 0.85,
  },
  {
    id: "subject",
    mode: "keys",
    title: "DAS THEMA",
    english: "THE SUBJECT",
    intro: [
      { text: "A fugue is voices conversing about one melody: the subject. Listen; this is my C minor.", demo: "subject" },
      { text: "The box draws it in gold. Play it as the alto does, alone. From now on, the crowd can leave." },
    ],
    praise: [{ text: "That is the subject. Greet it each time you meet it." }],
    again: [{ text: "The subject must be said whole, or it is not the subject. Again." }],
    run: () => cMinor(entryVoice(0), 1, true),
    passAt: 0.85,
  },
  {
    id: "answer",
    mode: "keys",
    title: "DIE ANTWORT",
    english: "THE ANSWER",
    intro: [{ text: "A second voice answers the subject a fifth higher, in G minor: the answer." }, { text: "The first voice goes on against it: the countersubject. You take the soprano; wait for your entry." }],
    praise: [{ text: "Recht. Subject, answer, countersubject: the grammar of a fugue." }],
    again: [{ text: "Wait for your entry; then answer clearly. Again." }],
    run: () => cMinor(entryVoice(1), 2, false),
    passAt: 0.8,
  },
  {
    id: "exposition",
    mode: "keys",
    title: "DIE EXPOSITION",
    english: "THE EXPOSITION",
    intro: [{ text: "When every voice has said the subject once, that is the exposition: alto, soprano, then bass." }, { text: "Before the bass, an episode: the subject's pieces, moving from key to key. Take the alto again." }],
    praise: [{ text: "So. The rest of a fugue is this: entries in new keys, and episodes between them." }],
    again: [{ text: "In the episode, keep your line; it is music too. Again." }],
    run: () => cMinor(entryVoice(0), 3, false),
    passAt: 0.8,
  },
  {
    id: "leap",
    mode: "keys",
    title: "DER SPRUNG",
    english: "THE LEAP",
    intro: [{ text: "One more rule: a leap of a fourth or more must skip a key." }, { text: "The box draws it as a double arrow. In ⚙ this level is + LEAPS." }],
    praise: [{ text: "Good. Your hands now draw the line as it is drawn on the page." }],
    again: [{ text: "A step is not a leap. Skip a key. Again." }],
    run: () => ({ ...passage({ allow: ["up", "down", "same", "leap"], need: ["leap", "up", "down"], free: "allow", heads: 12 }, "leaps", false, before(6), true), easy: "leaps" }),
    passAt: 0.85,
  },
  {
    id: "exam",
    mode: "keys",
    title: "DIE PROBE",
    english: "THE EXAM",
    intro: [{ text: "Now a whole fugue: the D sharp minor, Book I. You take the voice with the fewest notes." }, { text: "Its entries are your battles, the last the boss. I will say nothing until the end." }],
    praise: [{ text: "As I wrote for my Inventions: a cantabile manner of playing. Every fugue is open to you now." }],
    again: [{ text: "Again. Slower, if you must; but again." }],
    run: exam,
    passAt: 0.9,
  },
];

/** D225, the phone's SUBJECT lesson: the C minor fugue's first three entries, the episode before the bass a rest. */
function subjectLesson(): Run {
  const f = fugueById(C_MINOR);
  const third = [...f.entries].sort((a, b) => a.on - b.on)[2];
  return { proto: "subject", fail: false, piece: f.id, voice: 0, from: 0, until: third.end, bpm: tempoOf(f.id), wait: false, solo: false, easy: "timing" };
}

/** D225: the phone's track (phase 1): LADDER, waiting at each note; SUBJECT. Full mobile lessons come later. */
export const MOBILE_LESSONS: Lesson[] = [
  {
    id: "ladder",
    mode: "ladder",
    title: "DIE LEITER",
    english: "THE LADDER",
    intro: [{ text: "Hold the phone sideways. Touch either bar at the note's height: higher as the tune rises, lower as it falls." }, { text: "Follow the glow. I will wait at every note." }],
    praise: [{ text: "Recht. Your thumb drew the line." }],
    again: [{ text: "Higher when it rises, lower when it falls. Again." }],
    run: () => passage({ allow: ["up", "down"], need: ["up", "down"], free: "no", heads: 10 }, "direction", true, [C_MINOR, EXAM], false, "ladder"),
    passAt: 0.9,
  },
  {
    id: "subject",
    mode: "subject",
    title: "DAS THEMA",
    english: "THE SUBJECT",
    intro: [{ text: "Hold the phone upright. A fugue's voices take turns with one melody: the subject." }, { text: "Tap its lane as each note lands. Between entries, rest; the others play." }],
    praise: [{ text: "That is the subject, in every voice that says it. Now choose a fugue." }],
    again: [{ text: "Each entry whole; then rest until the next. Again." }],
    run: subjectLesson,
    passAt: 0.85,
  },
];

/** D225: each platform's track. */
export const TRACKS: Record<Platform, Lesson[]> = { computer: LESSONS, mobile: MOBILE_LESSONS };
