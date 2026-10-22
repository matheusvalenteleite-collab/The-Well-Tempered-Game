/**
 * LADDER on a computer, the lessons (D185): Bach teaches the keys, one at a time, on his own music.
 * Each lesson's passage is found in the pieces, not chosen by hand: the first stretch of a voice whose
 * moves use only the keys taught so far (with each new key in it), no chords, nothing quicker than a
 * quarter of a second at the lesson's tempo. Lessons 1 and 2 wait for each note (time given, never
 * the note); from lesson 3 the music keeps its time; from lesson 4 the other voices play.
 * What Bach says is in English; the two quotations are his title pages (the Well-Tempered Clavier,
 * 1722; the Inventions and Sinfonias, 1723), in translation; the remark that the instrument plays
 * itself is told as hearsay, as it comes down to us.
 */
import { beatOf, FUGUES, fugueById, PRELUDES, type TouchFugue } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import type { Arrow } from "../touch/MusicBox.tsx";
import { defaultBpm } from "../touch/tempi.ts";
import { arrowOf, moves } from "./protos.ts";

export interface Run {
  piece: string;
  voice: number;
  from: number;
  until: number;
  bpm: number;
  wait: boolean;
  solo: boolean;
  keys: Arrow[];
}

/** A line of Bach's; `demo`: the subject played while it shows. */
export interface Line {
  text: string;
  demo?: "subject";
}

export interface Lesson {
  /** German, as he would name it; and in English. */
  title: string;
  english: string;
  intro: Line[];
  pass: Line[];
  again: Line[];
  run: () => Run;
  /** Passed: the share right (of the notes, stray strikes half a note). */
  passAt: number;
}

const STEPS: Arrow[] = ["same", "left", "right"];
const ALL: Arrow[] = ["same", "left", "right", "up", "down", "rise", "fall"];

interface Want {
  keys: Arrow[];
  /** Each of these at least once. */
  need: Arrow[];
  heads: number;
  /** The tempo: the piece's own times this. */
  pace: number;
  /** The quickest note allowed, and the longest wait between two, in seconds. */
  gap: number;
  slow?: number;
  /** Pieces already used by a lesson before (each lesson its own music). */
  skip?: string[];
}

/** The first passage that teaches what is wanted (fugues first, in Bach's order; then the preludes). */
export function findPassage(w: Want): { f: TouchFugue; voice: number; from: number; until: number; bpm: number } {
  for (const f of [...FUGUES, ...PRELUDES]) {
    if (w.skip?.includes(f.id)) continue;
    const beat = beatOf(f).ticks;
    const bpm = Math.max(30, Math.round(defaultBpm(f.id) * w.pace));
    const tps = (f.tpq * bpm) / 60;
    for (let v = 0; v < f.voices.length; v++) {
      const notes = laneNotes(f.voices[v], beat, v);
      const ms = moves(notes, beat);
      for (let i = 0; i + w.heads <= notes.length; i++) {
        const win = notes.slice(i, i + w.heads);
        if (win.some((n, k) => k > 0 && n.on === win[k - 1].on) || (i > 0 && notes[i - 1].on === win[0].on)) continue;
        if (i + w.heads < notes.length && notes[i + w.heads].on === win.at(-1)!.on) continue;
        if (win.some((n, k) => k > 0 && ((n.on - win[k - 1].on) / tps < w.gap || (n.on - win[k - 1].on) / tps > (w.slow ?? 1.5)))) continue;
        const arrows = ms.slice(i + 1, i + w.heads).map(arrowOf);
        if (!arrows.every((a) => a && w.keys.includes(a))) continue;
        if (!w.need.every((a) => arrows.includes(a))) continue;
        const last = win.at(-1)!;
        return { f, voice: v, from: win[0].on, until: last.on + last.dur, bpm };
      }
    }
  }
  throw new Error(`no passage for ${w.need.join(" ")}`);
}

function passage(w: Want, wait: boolean, solo: boolean): Run {
  const p = findPassage(w);
  return { piece: p.f.id, voice: p.voice, from: p.from, until: p.until, bpm: p.bpm, wait, solo, keys: w.keys };
}

/** The C minor fugue (Book I no. 2): its alto, which begins, to the start of its third entry; the exposition, to the bass's entry. */
function cMinor(upTo: number, voice: number): Run {
  const f = fugueById("wtc1f02");
  const until = f.entries.map((e) => e.on).sort((a, b) => a - b)[upTo] ?? f.length;
  return { piece: f.id, voice, from: 0, until, bpm: defaultBpm(f.id), wait: false, solo: false, keys: ALL };
}

/** The exam: the easiest whole piece by the playability audit (Book I no. 22, B flat minor), its voice with the fewest notes. */
function exam(): Run {
  const f = fugueById("wtc1f22");
  const voice = f.voices.map((v, i) => [v.length, i]).sort((a, b) => a[0] - b[0])[0][1];
  return { piece: f.id, voice, from: 0, until: f.length, bpm: defaultBpm(f.id), wait: false, solo: false, keys: ALL };
}

export const LESSONS: Lesson[] = [
  {
    title: "DER TAKT",
    english: "THE BEAT",
    intro: [
      { text: "So. You wish to play my music. Good: I wrote it, as I put on its title page, for the profit and use of musical youth desirous of learning." },
      { text: "Music is first of all time. Before you choose a note, learn to strike when the beat falls, and not before." },
      { text: "Here the line stays on one note. Press SPACE for each, on its beat. Nothing else yet." },
    ],
    pass: [{ text: "So. They say I once remarked that there is nothing to it: you strike the right key at the right time, and the instrument plays itself. The time, at least, you have." }],
    again: [{ text: "Early, late. Listen to the beat before you strike. Again." }],
    run: () => passage({ keys: ["same"], need: ["same"], heads: 6, pace: 0.8, gap: 0.3 }, false, true),
    passAt: 0.85,
  },
  {
    title: "DER SCHRITT",
    english: "THE STEP",
    intro: [
      { text: "Now the line moves. Most of it moves by step, to the next note above or below." },
      { text: "A step up: → or D. A step down: ← or A. The same note again: SPACE. The key each note wants is drawn over it in the box." },
      { text: "I will wait for you at each note. Take your time; but strike the right key." },
    ],
    pass: [{ text: "Recht. A line that goes by step sings. Remember how it felt under your hand." }],
    again: [{ text: "You went down; the line went up. Look at the arrow, then strike. Again." }],
    run: () => passage({ keys: STEPS, need: ["left", "right"], heads: 10, pace: 0.8, gap: 0.25, skip: before(1) }, true, true),
    passAt: 0.9,
  },
  {
    title: "DER SPRUNG",
    english: "THE LEAP",
    intro: [
      { text: "A leap is a decision. Make it boldly, or not at all." },
      { text: "A leap up, a fourth or more: ↑ or W. A leap down: ↓ or S." },
      { text: "A third lies between: drawn slanting, it takes the step or the leap, as your hand prefers. I will still wait for you." },
    ],
    pass: [{ text: "So. Now you have all the keys. The rest is practice, and listening." }],
    again: [{ text: "A step is not a leap, and a leap is not a step. Again." }],
    run: () => passage({ keys: ALL, need: ["up", "down"], heads: 12, pace: 0.8, gap: 0.25, skip: before(2) }, true, true),
    passAt: 0.9,
  },
  {
    title: "BEIDE HÄNDE",
    english: "BOTH HANDS",
    intro: [
      { text: "A clavier has two hands; so have you. WASD and the arrows are the same keys: use both." },
      { text: "Let the left take the descents if you like, the right the ascents. I do not care which hand; I care that the line is right." },
      { text: "Now I will not wait for you." },
    ],
    pass: [{ text: "Recht. Two hands share the work, and neither tires." }],
    again: [{ text: "One hand alone is too slow for this. Share it between them. Again." }],
    run: () => passage({ keys: ALL, need: ["left", "right", "up", "down"], heads: 16, pace: 0.9, gap: 0.2, skip: before(3) }, false, true),
    passAt: 0.85,
  },
  {
    title: "MIT DEN ANDEREN",
    english: "WITH THE OTHERS",
    intro: [
      { text: "Now you are not alone. This is my fugue in C minor, from the first book: you take the alto, which begins." },
      { text: "Listen to the others, and do not shout over them. A note you miss leaves a silence: the others will not fill it for you." },
    ],
    pass: [{ text: "So. Three voices, and one of them yours." }],
    again: [{ text: "You played against them, not with them. Listen first. Again." }],
    run: () => cMinor(2, 1),
    passAt: 0.8,
  },
  {
    title: "DAS THEMA",
    english: "THE SUBJECT",
    intro: [
      { text: "This is the subject. Everything in a fugue is said about it. Listen.", demo: "subject" },
      { text: "When you hear it again, in another voice, in another key, greet it: the box draws it in gold." },
      { text: "Now you take the soprano, which answers. Play its entry through without a fault, and the organ will open all its stops for you." },
    ],
    pass: [{ text: "Organo pleno. That is what a voice earns when it says the subject rightly." }],
    again: [{ text: "The subject must be said whole. One wrong note and it is someone else's. Again." }],
    run: () => cMinor(3, 0),
    passAt: 0.8,
  },
  {
    title: "DIE PROBE",
    english: "THE EXAM",
    intro: [
      { text: "Now a whole fugue: the B flat minor, from the first book. Five voices; you take the one with the fewest notes, which is not to say the easiest." },
      { text: "I will say nothing until the end." },
    ],
    pass: [{ text: "…and above all, as I wrote for my Inventions, to acquire a cantabile manner of playing, and with it a strong foretaste of composition." }, { text: "You may go on alone now. Every prelude and fugue is open to you." }],
    again: [{ text: "Again. Slower, if you must; but again." }],
    run: exam,
    passAt: 0.9,
  },
];

/** The pieces the lessons before lesson n play (so that each has its own music). */
function before(n: number): string[] {
  // The C minor fugue kept for lessons 4 and 5.
  return ["wtc1f02", ...LESSONS.slice(0, n).map((l) => l.run().piece)];
}

const PROGRESS_KEY = "tb-lessons";
/** How many lessons are passed (kept in the browser). */
export function lessonsPassed(): number {
  try {
    return Math.max(0, Math.min(LESSONS.length, Number(localStorage.getItem(PROGRESS_KEY)) || 0));
  } catch {
    return 0;
  }
}
export function passLesson(n: number) {
  try {
    if (n + 1 > lessonsPassed()) localStorage.setItem(PROGRESS_KEY, String(n + 1));
  } catch {
    /* not kept */
  }
}
