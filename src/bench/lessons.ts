/**
 * The lessons with Herr Bach (D185, D188; D225: a track per platform). The computer's track teaches
 * HIGHWAY one step at a time, and what a fugue is on the way: the beat (TIMING); the line (DIRECTION:
 * right for up, left for down, on the home row's nine lanes); the same note and the free note; the
 * subject; the answer and the countersubject; the exposition and the episode; the leap (+ LEAPS); and a
 * whole fugue. The phone's track (phase 1): LADDER (waiting at each note; D229: SUBJECT withdrawn). Fugues only.
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
import { tr } from "../i18n/index.ts";
import { beatOf, fugueById, type TouchFugue } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { standardTempo, tempoOf } from "../touch/tempi.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";
import { moves, type DemoManner, type EasyLevel, type Move, type Options, type Platform, type ProtoId } from "./protos.ts";
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
  /** D271: the tutorial's coaching over the play (Options.coach). */
  coach?: "thumbs" | "dynamics" | "slide";
  /** D282: a reading the step is played by (readings.ts id: the subject's articulation asked). */
  reading?: string;
  /** D342, THE MANUAL: a drill's click (Options.click), the demonstration's manner (Options.demoStyle). */
  click?: { full: number; gone: number; gain?: number };
  demoStyle?: DemoManner;
  /** D360 (Part V): the ornament's first-time hint (Options.ornHint: a guide thumb shaking as a sign comes). */
  ornHint?: boolean;
  /** D359: THE MANUAL's practice room (Options.quiet). */
  quiet?: Options["quiet"];
  /** D373: THE TUTORIAL's options (one thumb, the windows widened, the count-in, its own marks, model A's thumbs). */
  tut?: Pick<Options, "side" | "widen" | "countBeats" | "readingAt" | "thumbsA" | "reading">;
}

/**
 * A line of Bach's; `demo`: played while it shows: the subject; D271: the lesson's opening notes
 * detached, or joined (legato).
 */
export interface Line {
  text: string;
  demo?: "subject" | "detached" | "legato";
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
  /** D282: the step's goal, one line, shown while it is played (and in the list of steps). */
  goal?: string;
  /** D282: on a step not passed, what fell short, in numbers ("You took turns on 4 of 10; aim for 7."). */
  short?: (r: Results) => string;
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
    const bpm = standardTempo(f.id);
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
        return { f, voice: v, from: win[0].on, until: last.on + last.dur, bpm: tempoOf(f.id) };
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

/** D225: the phone's track (phase 1): LADDER, waiting at each note (D229: SUBJECT withdrawn). Full mobile lessons come later. */
export const MOBILE_LESSONS: Lesson[] = [
  {
    id: "ladder",
    mode: "ladder",
    title: "DIE LEITER",
    english: "THE LADDER",
    intro: [{ text: "Hold the phone sideways. Touch either bar, anywhere; then higher as the tune rises, lower as it falls." }, { text: "Follow the glow. I will wait at every note." }],
    praise: [{ text: "Recht. Your thumb drew the line." }],
    again: [{ text: "Higher when it rises, lower when it falls. Again." }],
    run: () => passage({ allow: ["up", "down"], need: ["up", "down"], free: "no", heads: 10 }, "direction", true, [C_MINOR, EXAM], false, "ladder"),
    passAt: 0.9,
  },
];

/**
 * D270, THE TUTORIAL (the phone's track, the first item of play.html's list): Bach's Invention No. 1 in
 * C major, BWV 772 (data/touch/tutorial.json), on LADDER, step by step, each passed before the next:
 * the ladder (the right hand's opening entry alone, waiting at each note); D273: then at once with the
 * other voice: the right hand plays itself (drawn in the box) and the player enters with the left
 * hand's answer on the beat; the left hand again for the two thumbs (taking turns, either first),
 * legato (heard detached, then joined, then played), loud and soft, the slide (one way only: D271);
 * D278: the ornament (the right hand's two mordents in bars 1-2, played by shaking the thumb);
 * the right hand against the left for the subject; the whole invention. Every two-voice texture a fugue
 * has is here: the subject in both hands, inverted, in new keys.
 */
export const INVENTION = "inv01";
const BAR = 7680;
function invention(o: { voice?: number; fromBar?: number; toBar?: number; wait?: boolean; solo?: boolean; fail?: boolean; bpm?: number; coach?: Run["coach"] }): Run {
  // D280: every step of the tutorial is shown first (the game plays it, the thumbs drawn) and guided after.
  const f = fugueById(INVENTION);
  const from = ((o.fromBar ?? 1) - 1) * BAR;
  // D289: a passage ends on the note it leads to (the owner: "ought to end in the concluding note for
  // resolution"): the played voice's first note at or after the closing bar line is in.
  const cut = o.toBar ? (o.toBar - 1) * BAR : f.length;
  const arrival = o.toBar ? f.voices[o.voice ?? 0].find((n) => n[0] >= cut) : undefined;
  const until = arrival ? arrival[0] + 1 : cut;
  return { proto: "ladder", fail: o.fail ?? false, piece: INVENTION, voice: o.voice ?? 0, from, until, bpm: o.bpm ?? 48, wait: o.wait ?? false, solo: o.solo ?? true, easy: "direction", coach: o.coach };
}
/** The mean dynamic of the right strikes in a bar (null with none). */
const meanIn = (r: Results, bar: number) => {
  const ds = r.levels.filter((l) => l.on >= (bar - 1) * BAR && l.on < bar * BAR).map((l) => l.d);
  return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
};
/** D282: what fell short, in numbers (D283: in the language chosen). */
const need = (share: number, m: number) => Math.ceil(share * m);
const rightShort = (r: Results, share: number) => tr("You played {n} of {m} notes right; aim for {k}.", { n: r.right, m: r.of, k: need(share, r.of) });
/** D289: a skill's line when it has something to count; else what the notes came to (never "0 of 0"). */
const skillShort = (r: Results, m: number, line: () => string) => (m > 0 ? line() : rightShort(r, 0.8));
const crowdShort = (r: Results, share: number) => (r.failedBar !== null ? tr("The crowd left at bar {n}.", { n: r.failedBar }) : rightShort(r, share));

/**
 * D282, THE TUTORIAL in baby steps (the owner: "all the basic skills needed to enjoy the game to the
 * fullest, in baby steps from the beginning"), one new skill a step, each shown first by the game (D280)
 * then guided, its goal on the screen, a step not passed told what fell short:
 *   1 the ladder (height; the music waits) · 2 the beat (on time; PERFECT and GOOD) · 3 hold and let go
 *   (a note held its length, lifted at a rest) · 4 the second voice (the right hand plays itself; the
 *   left enters) · 5 two thumbs (taking turns) · 6 legato (the next before the last lifts) · 7 leaps (the
 *   other thumb takes the far note) · 8 loud and soft · 9 the slide (one way) · 10 the ornament (shaken)
 *   · 11 the subject (caught when it comes) · 12 the reading (a book's articulation: Book I's C minor
 *   subject as Keller marks it) · 13 the crowd (slips cost it; the multiplier and the run) · 14 the
 *   whole invention.
 */
export const TUTORIAL_LESSONS: Lesson[] = [
  {
    id: "t-ladder",
    mode: "ladder",
    title: "DIE LEITER",
    english: "THE LADDER",
    goal: "TOUCH A BAR AT EACH NOTE'S HEIGHT · THE MUSIC WAITS",
    intro: [{ text: "Hold the phone sideways; touch either bar, anywhere. Across it is the note's colour, never right or wrong." }, { text: "Then move up the bar for a higher note, down for a lower. I will wait for you." }],
    praise: [{ text: "Recht. Your thumb drew the line." }],
    again: [{ text: "Higher when it rises, lower when it falls. Again." }],
    short: (r) => rightShort(r, 0.85),
    run: () => invention({ toBar: 2, wait: true }),
    passAt: 0.85,
  },
  {
    id: "t-beat",
    mode: "ladder",
    title: "DER TAKT",
    english: "THE BEAT",
    goal: "TOUCH AS EACH NOTE REACHES THE LINE · PERFECT IS EXACT",
    intro: [{ text: "Now I will not wait. Touch each note as it reaches the yellow line." }, { text: "Exactly on it: PERFECT. A little early or late: GOOD. Too far off: a slip." }],
    praise: [{ text: "Good. The line and the time: that is playing." }],
    again: [{ text: "Let the note come to the line, then touch. Again." }],
    short: (r) => tr("You played {n} of {m} notes right on time; aim for {k}.", { n: r.right, m: r.of, k: need(0.8, r.of) }),
    run: () => invention({ toBar: 2 }),
    passAt: 0.8,
  },
  {
    id: "t-hold",
    mode: "ladder",
    title: "HALTEN",
    english: "HOLD AND LET GO",
    goal: "KEEP THE THUMB DOWN FOR THE WHOLE NOTE · LIFT AT A REST",
    intro: [{ text: "A long block is a long note: keep your thumb down until its end." }, { text: "Lift too soon and it is SHORT. Where the music rests, lift: hold on and it is REST!" }],
    praise: [{ text: "So. A note lives as long as you hold it." }],
    again: [{ text: "Hold each note to its end, and lift when the music rests. Again." }],
    short: (r) => skillShort(r, r.art.heldOf, () => tr("You held {n} of {m} notes their length; aim for {k}.", { n: r.art.held, m: r.art.heldOf, k: need(0.6, r.art.heldOf) })),
    run: () => invention({ fromBar: 10, toBar: 13 }),
    passAt: 0.75,
    pass: (r) => accuracy(r) >= 0.75 && r.art.heldOf > 0 && r.art.held / r.art.heldOf >= 0.6,
  },
  {
    id: "t-second",
    mode: "ladder",
    title: "DIE ZWEITE STIMME",
    english: "THE SECOND VOICE",
    goal: "WAIT FOR YOUR ENTRY · THEN PLAY THE LEFT HAND (YOU)",
    intro: [{ text: "Now the right hand plays by itself, drawn thin. Yours is outlined white and marked YOU." }, { text: "Watch its subject go by; then you enter, in the left hand, with the same subject." }],
    praise: [{ text: "Two voices, one conversation. That is counterpoint." }],
    again: [{ text: "Wait for your entry, then come in on the beat. Again." }],
    short: (r) => rightShort(r, 0.8),
    run: () => invention({ voice: 1, toBar: 3, solo: false }),
    passAt: 0.8,
  },
  {
    id: "t-thumbs",
    mode: "ladder",
    title: "ZWEI DAUMEN",
    english: "TWO THUMBS",
    goal: "QUICK NOTES: ONE THUMB, THEN THE OTHER · EITHER STARTS",
    intro: [{ text: "Quick notes want both thumbs, one after the other, as a keyboard player uses his fingers." }, { text: "Start with either; then take turns. The thumb on the bars shows whose turn it is." }],
    praise: [{ text: "So. Two thumbs walk where one would stumble." }],
    again: [{ text: "One thumb did all the work. Take turns. Again." }],
    short: (r) => skillShort(r, r.thumbs.of, () => tr("You took turns on {n} of {m} quick notes; aim for {k}.", { n: r.thumbs.alt, m: r.thumbs.of, k: need(0.7, r.thumbs.of) })),
    run: () => invention({ voice: 1, toBar: 3, solo: false, coach: "thumbs" }),
    passAt: 0.8,
    pass: (r) => accuracy(r) >= 0.8 && r.thumbs.of > 0 && r.thumbs.alt / r.thumbs.of >= 0.7,
  },
  {
    id: "t-legato",
    mode: "ladder",
    title: "LEGATO",
    english: "JOINED",
    goal: "FROM THUMB TO THUMB WITH NO GAP",
    intro: [
      { text: "Listen. First each note apart, detached.", demo: "detached" },
      { text: "Joined: strike on time, the other thumb still down; or rest early on the note: lifting the other sounds it.", demo: "legato" },
    ],
    praise: [{ text: "A cantabile manner, as my Inventions ask, is more than joined: neither glued nor clipped; it breathes." }],
    again: [{ text: "The notes fell apart. Strike before the other lifts, or rest on the note early and lift the other. Again." }],
    short: (r) => skillShort(r, r.art.legatoOf, () => tr("You joined {n} of {m} notes; aim for {k}.", { n: r.art.legato, m: r.art.legatoOf, k: need(0.6, r.art.legatoOf) })),
    run: () => invention({ voice: 1, toBar: 3, solo: false }),
    passAt: 0.8,
    pass: (r) => accuracy(r) >= 0.8 && r.art.legatoOf > 0 && r.art.legato / r.art.legatoOf >= 0.6,
  },
  {
    id: "t-leaps",
    mode: "ladder",
    title: "DER SPRUNG",
    english: "LEAPS",
    goal: "A FAR NOTE: THE OTHER THUMB, ALREADY THERE",
    intro: [{ text: "Here the line leaps. Do not drag one thumb across: rest the other thumb on the far note." }, { text: "Then lift the first as the note comes: that sounds it. Or simply touch it on time." }],
    praise: [{ text: "Good. Your thumbs now draw the line as it is drawn on the page." }],
    again: [{ text: "Rest the other thumb on the far note early; lift the first on time. Again." }],
    short: (r) => rightShort(r, 0.75),
    run: () => invention({ voice: 1, fromBar: 14, toBar: 16, solo: false }),
    passAt: 0.75,
  },
  {
    id: "t-dynamics",
    mode: "ladder",
    title: "LAUT UND LEISE",
    english: "LOUD AND SOFT",
    // D315: the words follow the strong side (touch-expr.ts STRONG_SIDE).
    goal: STRONG_SIDE === "outer" ? "SOFT: TOUCH NEAR THE BOX · LOUD: NEAR THE EDGE" : "SOFT: TOUCH NEAR THE EDGE · LOUD: NEAR THE BOX",
    intro: [{ text: STRONG_SIDE === "outer" ? "Where you touch the bar is how loud: soft by the box, loud by the edge." : "Where you touch the bar is how loud: soft by the edge, loud by the box." }, { text: "Answer softly in the first bar, loudly in the second, as an echo turned round." }],
    praise: [{ text: "A harpsichord has two keyboards for this. You have two thumbs." }],
    again: [{ text: STRONG_SIDE === "outer" ? "Soft near the box, loud near the edge. Again." : "Soft near the edge, loud near the box. Again." }],
    short: (r) => {
      const a = meanIn(r, 1);
      const b = meanIn(r, 2);
      return a === null || b === null ? rightShort(r, 0.75) : tr("Bar 1 at {a}% loud (aim under 45%), bar 2 at {b}% (aim over 55%).", { a: Math.round(100 * a), b: Math.round(100 * b) });
    },
    run: () => invention({ voice: 1, toBar: 3, solo: false, coach: "dynamics" }),
    passAt: 0.75,
    pass: (r) => {
      const a = meanIn(r, 1);
      const b = meanIn(r, 2);
      return accuracy(r) >= 0.75 && a !== null && b !== null && a <= 0.45 && b >= 0.55;
    },
  },
  {
    id: "t-slide",
    mode: "ladder",
    title: "DAS GLEITEN",
    english: "THE SLIDE",
    goal: "KEEP A THUMB DOWN AND SLIDE IT UP THE RISING NOTES",
    intro: [{ text: "Keep a thumb down and slide it up the bar: the rising notes sound joined, one after another." }, { text: "But one way only. To turn back, lift and touch again." }],
    praise: [{ text: "Good. A slide is a convenience; the thumbs are the art." }],
    again: [{ text: "Hold the thumb down and slide up with the tune. Again." }],
    short: (r) => tr("You slid {n} notes; aim for at least 2.", { n: r.slides }),
    run: () => invention({ voice: 1, toBar: 3, solo: false, coach: "slide" }),
    passAt: 0.8,
    pass: (r) => accuracy(r) >= 0.8 && r.slides >= 2,
  },
  {
    id: "t-ornament",
    mode: "ladder",
    title: "DIE MANIER",
    english: "THE ORNAMENT",
    goal: "A SIGN OVER A NOTE: TOUCH IT, THEN SHAKE YOUR THUMB",
    intro: [{ text: "A sign over a note is an ornament: touch the note, then draw its shape with your thumb, quickly." }, { text: "This one is a mordent: a quick dip and back. A trill rocks on while you want it." }],
    praise: [{ text: "So. Where I wrote a sign, play it; elsewhere a grace is your choice, sparingly." }],
    again: [{ text: "Touch the note, then a quick dip and back up. Again." }],
    short: (r) => skillShort(r, r.shakes.of, () => tr("You shook {n} of {m} ornaments; aim for {k}.", { n: r.shakes.hit, m: r.shakes.of, k: Math.min(2, r.shakes.of) })),
    run: () => invention({ voice: 0, toBar: 3, solo: false }),
    passAt: 0.75,
    pass: (r) => accuracy(r) >= 0.75 && r.shakes.of > 0 && r.shakes.hit >= Math.min(2, r.shakes.of),
  },
  {
    id: "t-subject",
    mode: "ladder",
    title: "DAS THEMA",
    english: "THE SUBJECT",
    goal: "PLAY EACH SUBJECT OF YOURS WHOLE · A TAG NAMES THE SUBJECT",
    intro: [
      { text: "This little figure is the subject; the whole piece is made of it. Listen.", demo: "subject" },
      { text: "A tag names it wherever it goes. Now the right hand: play each of your subjects whole." },
    ],
    praise: [{ text: "That is a fugue in small: one subject, passed from voice to voice." }],
    again: [{ text: "The subject must be said whole, or it is not the subject. Again." }],
    short: (r) => skillShort(r, r.entries, () => tr("You caught {n} of {m} subjects; aim for 2.", { n: r.captured, m: r.entries })),
    run: () => invention({ voice: 0, toBar: 6, solo: false }),
    passAt: 0.8,
    pass: (r) => accuracy(r) >= 0.8 && r.captured >= 2,
  },
  {
    id: "t-reading",
    mode: "ladder",
    title: "DIE LESART",
    english: "THE READING",
    goal: "PLAY THE SUBJECT AS THE MARKS SAY: ‾ JOINED · ⌒ SLUR · | DETACHED · · SHORT · > ACCENT (LIFT BEFORE, LEAN IN)",
    intro: [{ text: "Now one of my fugues. Players have written how its subject should go: some notes joined, some apart." }, { text: "The marks show it. In HEAR THE SUBJECT, choose a reading or none. Here, follow the marks." }],
    praise: [{ text: "So. You played my subject as a thinking musician would." }],
    again: [{ text: "Joined where it is joined; lift where it is apart. Again." }],
    short: (r) => {
      const q = r.sheet.qualities.find((x) => x.key === "reading");
      return tr("You followed {p}% of the marks; aim for 60%.", { p: Math.round(100 * (q?.share ?? 0)) });
    },
    run: () => ({ proto: "ladder", fail: false, piece: "wtc1f02", voice: 1, from: 0, until: 2 * 7680, bpm: 60, wait: false, solo: true, easy: "direction", reading: "keller" }),
    passAt: 0.75,
    pass: (r) => accuracy(r) >= 0.75 && (r.sheet.qualities.find((x) => x.key === "reading")?.share ?? 0) >= 0.6,
  },
  {
    id: "t-crowd",
    mode: "ladder",
    title: "DAS PUBLIKUM",
    english: "THE CROWD",
    goal: "KEEP THE CROWD (RIGHT BAR) · A RUN OF RIGHT NOTES RAISES THE ×",
    intro: [{ text: "Now a crowd listens; its meter is on the right bar. Each slip cools it; empty, it leaves." }, { text: "Right notes in a run raise your multiplier, ×2, ×3, ×4: every point counts more." }],
    praise: [{ text: "They stayed. They will come back for more." }],
    again: [{ text: "They left. Fewer slips: watch the next note, not the last. Again." }],
    short: (r) => crowdShort(r, 0.8),
    run: () => invention({ voice: 0, toBar: 7, solo: false, fail: true }),
    passAt: 0.8,
  },
  {
    id: "t-whole",
    mode: "ladder",
    title: "DIE INVENTION",
    english: "THE INVENTION",
    goal: "THE WHOLE INVENTION, RIGHT HAND · EVERYTHING YOU LEARNED",
    intro: [{ text: "Now the whole Invention, the right hand, with the left beside you. The subject comes upside down too." }, { text: "Everything you learned, at once. I will say nothing until the end." }],
    praise: [{ text: "Now go and play my fugues. Every one is open to you." }],
    again: [{ text: "Again. Hear it in your head first; then play." }],
    short: (r) => crowdShort(r, 0.8),
    run: () => invention({ solo: false, fail: true, bpm: 60 }),
    passAt: 0.8,
  },
];

/** D225: each platform's track (D270: the phone's is THE TUTORIAL). */
export const TRACKS: Record<Platform, Lesson[]> = { computer: LESSONS, mobile: TUTORIAL_LESSONS };
