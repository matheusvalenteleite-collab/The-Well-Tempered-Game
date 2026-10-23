/**
 * EASY on a computer, the lessons (D188): Bach teaches EASY's levels one step at a time, and what a
 * fugue is on the way: the beat (TIMING); the line (DIRECTION: right for up, left for down); the same
 * note and the free note; the subject; the answer and the countersubject; the exposition and the
 * episode; the leap (+ LEAPS); and a whole fugue. Fugues only.
 * The first lessons' passages are found in the fugues, not chosen by hand: the first stretch of a
 * voice whose moves hold only what has been taught (with what is new in it), no chords, notes between
 * a fifth of a second and a second and a half apart, each lesson its own fugue. The lessons on the
 * fugue itself use the C minor fugue of Book I (alto subject, bar 1; soprano answer in G minor, bar 3;
 * an episode; bass, bar 7).
 * Bach's words are in English. His quotations are his title pages (the Well-Tempered Clavier, 1722;
 * the Inventions and Sinfonias, 1723), in translation; "the instrument plays itself" is told as
 * hearsay, as it comes down to us.
 */
import { beatOf, FUGUES, fugueById, type TouchFugue } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { tempoOf } from "../touch/tempi.ts";
import { moves, type EasyLevel, type Move } from "./protos.ts";

export interface Run {
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

type Kind = "up" | "down" | "same" | "leap";
const kindOf = (m: Move): Kind => (m.dir === 0 || m.steps === 0 ? "same" : m.size >= 3 ? "leap" : m.dir > 0 ? "up" : "down");

interface Want {
  allow: Kind[];
  /** Each of these at least once. */
  need: Kind[];
  /** A free note (after a rest or a long note) inside: needed, allowed, or not. */
  free: "need" | "allow" | "no";
  heads: number;
}

/** The first passage in the fugues that teaches what is wanted (Bach's order; each lesson its own fugue). */
export function findPassage(w: Want, skip: string[] = []): { f: TouchFugue; voice: number; from: number; until: number; bpm: number } {
  for (const f of FUGUES) {
    if (skip.includes(f.id)) continue;
    const beat = beatOf(f).ticks;
    const bpm = tempoOf(f.id);
    const tps = (f.tpq * bpm) / 60;
    for (let v = 0; v < f.voices.length; v++) {
      const notes = laneNotes(f.voices[v], beat, v);
      const ms = moves(notes, beat);
      const free = (i: number) => notes[i - 1].dur >= beat || notes[i].on - (notes[i - 1].on + notes[i - 1].dur) >= beat / 4;
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

function passage(w: Want, easy: EasyLevel, wait: boolean, skip: string[]): Run {
  const p = findPassage(w, skip);
  return { piece: p.f.id, voice: p.voice, from: p.from, until: p.until, bpm: p.bpm, wait, solo: true, easy };
}

/** The C minor fugue (Book I no. 2): a voice from the start to the start of the entry `upTo` (in order of time). */
const C_MINOR = "wtc1f02";
function cMinor(voice: number, upTo: number, solo: boolean): Run {
  const f = fugueById(C_MINOR);
  const until = f.entries.map((e) => e.on).sort((a, b) => a - b)[upTo] ?? f.length;
  return { piece: f.id, voice, from: 0, until, bpm: tempoOf(f.id), wait: false, solo, easy: "direction" };
}
/** The C minor fugue's voice that has its first entry (the alto), and its second (the soprano). */
const entryVoice = (k: number) => [...fugueById(C_MINOR).entries].sort((a, b) => a.on - b.on)[k].voice;

/** The exam: the B flat minor fugue of Book I (the easiest whole fugue by the playability audit), its voice with the fewest notes. */
function exam(): Run {
  const f = fugueById("wtc1f22");
  const voice = f.voices.map((v, i) => [v.length, i]).sort((a, b) => a[0] - b[0])[0][1];
  return { piece: f.id, voice, from: 0, until: f.length, bpm: tempoOf(f.id), wait: false, solo: false, easy: "direction" };
}

/** The fugues the found passages must not take: the C minor (kept for its lessons) and those before. */
function before(n: number): string[] {
  return [C_MINOR, "wtc1f22", ...LESSONS.slice(0, n).map((l) => l.run().piece)];
}

export const LESSONS: Lesson[] = [
  {
    title: "DER TAKT",
    english: "THE BEAT",
    intro: [
      { text: "So. You wish to play my fugues. Good: I wrote them, as I put on the title page, for the profit and use of musical youth desirous of learning." },
      { text: "Music is first of all time. Strike any key at all, but strike it when the note falls: not before, not after." },
      { text: "You will play one voice alone. Watch the box: when a note reaches the line, strike." },
    ],
    pass: [{ text: "So. They say I once remarked that there is nothing to it: you strike the right key at the right time, and the instrument plays itself. The time, at least, you have." }],
    again: [{ text: "Early, late. Let the note come to you. Again." }],
    run: () => passage({ allow: ["up", "down", "same", "leap"], need: [], free: "allow", heads: 8 }, "timing", false, before(0)),
    passAt: 0.85,
  },
  {
    title: "DIE LINIE",
    english: "THE LINE",
    intro: [
      { text: "Now the keys mean something. Your keyboard is a line, like the music: to the right is higher, to the left is lower." },
      { text: "When the voice goes up, strike a key to the right of the last one. When it goes down, to the left. How far does not matter yet; only which way." },
      { text: "The box shows the way over each note: → or ←. Rest your hands on the middle row. I will wait for you at each note." },
    ],
    pass: [{ text: "Recht. You did not play notes; you played a line. That is the whole art." }],
    again: [{ text: "You went left; the voice went up. Look at the arrow, then strike. Again." }],
    run: () => passage({ allow: ["up", "down", "leap"], need: ["up", "down"], free: "no", heads: 10 }, "direction", true, before(1)),
    passAt: 0.9,
  },
  {
    title: "DIESELBE NOTE",
    english: "THE SAME NOTE",
    intro: [
      { text: "Two more things. When a note is struck again, strike the same key again, or the space bar with a thumb." },
      { text: "And after a rest, or a long note, you are free: strike anywhere. The box draws such a note in a little square. Use it to bring your hands back to the middle." },
      { text: "At the end of a row there is no further to go: strike the last key again. Now I will not wait." },
    ],
    pass: [{ text: "So. Now nothing in a line can surprise you." }],
    again: [{ text: "The same note wants the same key. Again." }],
    run: () => passage({ allow: ["up", "down", "same", "leap"], need: ["same", "up", "down"], free: "need", heads: 12 }, "direction", false, before(2)),
    passAt: 0.85,
  },
  {
    title: "DAS THEMA",
    english: "THE SUBJECT",
    intro: [
      { text: "Now, what is a fugue? A conversation of voices about one melody: the subject. Here is the subject of my fugue in C minor. Listen.", demo: "subject" },
      { text: "A fugue begins with one voice alone, saying the subject. Then the others come in, one by one, each saying it in turn, while the ones before go on." },
      { text: "The box draws the subject in gold wherever it is: its shape, its beginning, its end. Play it now, alone, as the alto does at the beginning." },
    ],
    pass: [{ text: "That is the subject. You will meet it again many times; greet it each time." }],
    again: [{ text: "The subject must be said whole, or it is not the subject. Again." }],
    run: () => cMinor(entryVoice(0), 1, true),
    passAt: 0.85,
  },
  {
    title: "DIE ANTWORT",
    english: "THE ANSWER",
    intro: [
      { text: "When the first voice has said the subject, a second voice answers it: the same melody, a fifth higher. Here it is in G minor. That is the answer." },
      { text: "And the first voice does not fall silent: it goes on with a second melody against the answer, the countersubject. Two melodies at once, each its own." },
      { text: "You take the soprano, which answers. Listen to the alto's subject first; then come in." },
    ],
    pass: [{ text: "Recht. Subject, answer, countersubject: you have heard the grammar of a fugue." }],
    again: [{ text: "Wait for your entry; then answer clearly. Again." }],
    run: () => cMinor(entryVoice(1), 2, false),
    passAt: 0.8,
  },
  {
    title: "DIE EXPOSITION",
    english: "THE EXPOSITION",
    intro: [
      { text: "When every voice has said the subject once, that is the exposition: here the alto, the soprano, and last the bass." },
      { text: "Before the bass comes in, there are two bars with no subject at all: an episode. It is made of the subject's pieces, carried through a sequence from key to key." },
      { text: "You take the alto again, from the beginning: the subject, the countersubject, the episode, and on, against the bass's entry." },
    ],
    pass: [{ text: "So. The rest of a fugue is this, again and again: entries, in new keys, and episodes between them." }],
    again: [{ text: "In the episode, keep your line; it is no less music for having no subject. Again." }],
    run: () => cMinor(entryVoice(0), 3, false),
    passAt: 0.8,
  },
  {
    title: "DER SPRUNG",
    english: "THE LEAP",
    intro: [
      { text: "One last rule, for when you are ready: a leap must look like one. A leap of a fourth or more must skip a key." },
      { text: "This is the level + LEAPS (you will find it under ⚙). The box draws a leap as a double arrow." },
    ],
    pass: [{ text: "Good. Your hands now draw the line as it is drawn on the page." }],
    again: [{ text: "A step is not a leap. Skip a key. Again." }],
    run: () => ({ ...passage({ allow: ["up", "down", "same", "leap"], need: ["leap", "up", "down"], free: "allow", heads: 12 }, "leaps", false, before(6)), easy: "leaps" }),
    passAt: 0.85,
  },
  {
    title: "DIE PROBE",
    english: "THE EXAM",
    intro: [
      { text: "Now a whole fugue: the B flat minor, from the first book. Five voices; you take the one with the fewest notes, which is not to say the easiest." },
      { text: "Your voice's entries are your battles; its last is the boss. If an entry comes before the last has ended, the box marks it: a stretto." },
      { text: "I will say nothing until the end." },
    ],
    pass: [
      { text: "…and above all, as I wrote for my Inventions, to acquire a cantabile manner of playing, and with it a strong foretaste of composition." },
      { text: "You may go on alone now. Every fugue is open to you." },
    ],
    again: [{ text: "Again. Slower, if you must; but again." }],
    run: exam,
    passAt: 0.9,
  },
];

const PROGRESS_KEY = "tb-lessons-easy";
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
