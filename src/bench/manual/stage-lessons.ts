/**
 * D440, PROGRESSION MODE (the Lab only, lab.html?progression=1): each stage's tutorial, taught by Herr Bach
 * on the bars of the fugue the stage opens, in the voice a newcomer plays (D369: the second to enter). The
 * last step is always the fugue's own opening at the game's own tempo and windows, passed at 75% of the
 * notes: the share at which the crowd (proto-game.ts: +0.015 a good note, −0.045 a slip) just holds, so a
 * player who passes the tutorial can survive the fugue. Stage 1 is preceded by the BASICS (1.1–1.4).
 *
 * Kept out of MANUAL (the tutorial's map, its translations and its tests): lessons.ts `lessonById` finds
 * them too, dress-of.ts dresses them as the full screen (after 6.8). English only, as the Lab.
 * Every excerpt's notes listed here and held to data/touch/ by test/d440-progression.test.ts.
 */
import type { Check, ManualLesson, Material } from "./lessons.ts";
import * as C from "./coach.ts";
import { ex, notesRight, st } from "./kit.ts";

/** The share of the notes the last step asks: the crowd's break-even on "good" notes (0.045 / (0.045 + 0.015)). */
export const STAGE_PASS = 0.75;

const I1 = "wtc1f01";
const I23 = "wtc1f23";
const I22 = "wtc1f22";
const I18 = "wtc1f18";

/** I/1, alto, bars 1–2: the subject (and the first notes of what follows it). */
const I1_ALTO = ["C4", "D4", "E4", "F4", "G4", "F4", "E4", "A4", "D4", "G4", "A4", "G4", "F4", "E4", "F4", "E4", "D4", "C4", "D4", "C4", "B3", "A3"];
/** I/1, soprano, bars 2–3: the answer (the subject a fifth higher). */
const I1_SOP_2_3 = ["G4", "A4", "B4", "C5", "D5", "C5", "B4", "E5", "A4", "D5", "E5", "D5", "C5", "B4"];
/** I/1, soprano, bars 2–4. */
const I1_SOP_2_4 = [...I1_SOP_2_3, "G4", "A4", "B4", "C5", "B4", "C5", "D5", "E5", "D5", "E5", "F♯5", "G5", "B4", "C5"];
/** I/23, tenor, bars 1–2: the subject. */
const I23_TEN = ["B3", "B♭3", "B3", "C♯4", "F♯3", "A♭3", "B♭3", "B3", "C♯4", "E♭4", "E4", "E♭4", "C♯4", "B3"];
/** I/23, alto, bars 3–4: the answer. */
const I23_ALTO_3_4 = ["F♯4", "E♭4", "E4", "F♯4", "B3", "E♭4", "F4", "F♯4", "A♭4", "B♭4", "B4", "B♭4", "A♭4", "F♯4"];
/** I/23, alto, bars 3–6. */
const I23_ALTO_3_6 = [...I23_ALTO_3_4, "A♭4", "F♯4", "E4", "E♭4", "C♯4", "B3", "B♭3", "F♯4", "E♭4", "E4", "F♯4", "A♭4", "B♭4", "B4", "B♭4", "A♭4", "B♭4", "B4", "B♭4", "A♭4", "F♯4"];
/** I/22, soprano I, bars 1–2: the subject (B♭, F, G♭, F, E♭, D♭). */
const I22_SOP1 = ["B♭4", "F4", "F♯5", "F5", "E♭5", "C♯5"];
/** I/22, soprano II, bars 3–5: the answer, its long notes. */
const I22_SOP2_3_5 = ["F4", "B♭3", "C♯5", "C5", "B♭4", "A♭4", "G4", "A♭4", "B♭4", "C5"];
/** I/22, soprano II, bars 3–9. */
const I22_SOP2_3_9 = [...I22_SOP2_3_5, "B♭4", "A4", "B♭4", "C5", "C♯5", "C5", "B♭4", "C5", "D5", "E♭5", "C♯5", "C5", "C♯5"];
/** I/18, alto, bars 3–4: the answer; its five repeated notes short in Busoni's edition. */
const I18_ALTO_3_4 = ["E♭4", "C4", "C♯4", "E♭4", "E4", "E♭4", "C♯4", "G4", "A♭4", "B3", "C♯4", "C♯4", "E♭4", "E♭4", "A♭3"];
/** I/18, alto, bars 3–6. */
const I18_ALTO_3_6 = [...I18_ALTO_3_4, "C♯4", "B3", "C♯4", "E♭4", "D4", "E♭4", "F4", "E♭4", "F4", "F♯4", "E♭4", "F4", "D4", "E♭4"];

const full = { pct: 100 } as const;
const busoni = { reading: "busoni" } as const;
const m = (piece: string, voice: number, from: number, to: number, tempo: Material["tempo"], label: string, notes: string[], o: Partial<Material> = {}) => ex(piece, voice, from, to, tempo, label, { notes, ...busoni, ...o });

const opening = (x: Parameters<NonNullable<ManualLesson["checks"]>>[0]): Check => notesRight(x, STAGE_PASS);

export const STAGE_LESSONS: ManualLesson[] = [
  {
    id: "P.1",
    part: "P",
    title: "MY FIRST FUGUE",
    english: "MY FIRST FUGUE",
    minutes: 4,
    sound: "piano",
    aim: "What a fugue is, and how to play your voice in one: you answer the tune I play first.",
    learn: "A fugue is one tune taken up by every voice in turn. Yours comes in second.",
    music: "FUGUE 1 IN C MAJOR, BARS 1–4",
    aids: ["thumbs"],
    stages: [
      st("listen", m(I1, 1, 1, 2, { bpm: 51 }, "Fugue I/1 in C major, alto alone, bars 1–2: the subject", I1_ALTO, { solo: true }), "Listen. One voice alone plays a tune: it climbs from C to G, then turns back. This tune is the subject."),
      st("watch", m(I1, 0, 2, 3, { bpm: 40 }, "Fugue I/1, soprano, bars 2–3: the answer", I1_SOP_2_3, { widen: 2, flags: true }), "Now the soprano, your voice, takes the same tune, higher. Watch my thumbs.", { aids: ["thumbs"] }),
      st("try", m(I1, 0, 2, 3, { bpm: 40 }, "Fugue I/1, soprano, bars 2–3: the answer", I1_SOP_2_3, { widen: 2, wait: true, flags: true }), "Your turn. Each note waits for you.", { aids: ["thumbs", "trace"] }),
      st("play", m(I1, 0, 2, 4, full, "Fugue I/1, soprano, bars 2–4, as in the game", I1_SOP_2_4, { flags: true }), "Now as in the game, at its own speed: wait for my voice, then answer."),
    ],
    lens: { counts: ["Notes: 75%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x) => [opening(x)],
    before: [
      "Welcome! I am Johann Sebastian Bach, organist, teacher and, in Leipzig, Cantor of St Thomas. In 1722 I finished a book of 24 preludes and fugues, one in every key. You will play its fugues, one at a time.",
      "Each fugue you finish opens the next. This is the first in my book, in C major.",
    ],
    after: ["That is how my fugue begins. The tune will come back many times, in every voice: listen for it. Now the whole fugue. Finish it, however it goes, and the next one opens."],
    again: ["Wait for my voice, then follow the tune up and back. Again."],
  },
  {
    id: "P.2",
    part: "P",
    title: "LISTEN, THEN ANSWER",
    english: "LISTEN, THEN ANSWER",
    minutes: 3,
    sound: "piano",
    aim: "To hear the subject in another voice, low down, and to take it up yourself.",
    learn: "Listen first: the tune comes in below you, then it is yours.",
    music: "FUGUE 23 IN B MAJOR, BARS 1–6",
    aids: ["thumbs"],
    stages: [
      st("listen", m(I23, 2, 1, 2, { bpm: 60 }, "Fugue I/23 in B major, tenor alone, bars 1–2: the subject", I23_TEN, { solo: true }), "This fugue begins low, in the tenor. Listen to its tune: a little turn, a dip, and a climb."),
      st("watch", m(I23, 1, 3, 4, { bpm: 44 }, "Fugue I/23, alto, bars 3–4: the answer", I23_ALTO_3_4, { widen: 2, flags: true }), "Then the alto, you, answers it, while the tenor goes on beneath. Watch.", { aids: ["thumbs"] }),
      st("try", m(I23, 1, 3, 4, { bpm: 44 }, "Fugue I/23, alto, bars 3–4: the answer", I23_ALTO_3_4, { widen: 2, wait: true, flags: true }), "Your turn. Each note waits for you.", { aids: ["thumbs", "trace"] }),
      st("play", m(I23, 1, 3, 6, full, "Fugue I/23, alto, bars 3–6, as in the game", I23_ALTO_3_6, { flags: true }), "Now at the fugue's own speed. Let the tenor finish its tune, then come in."),
    ],
    lens: { counts: ["Notes: 75%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x) => [opening(x)],
    before: ["Five sharps! In my time, a key few composers wrote in. On your strips it makes no difference: higher is still higher."],
    after: ["You listened, then answered. In every fugue, the voices before yours tell you what is coming."],
    again: ["Let the tenor's tune end, then take it up. Again."],
  },
  {
    id: "P.3",
    part: "P",
    title: "HOLD, AMONG FIVE",
    english: "HOLD, AMONG FIVE",
    minutes: 3,
    sound: "piano",
    sign: "held",
    aim: "To hold long notes for their whole length, and keep your line among five voices.",
    learn: "Long notes: keep your thumb down until the next one starts.",
    music: "FUGUE 22 IN B♭ MINOR, BARS 1–9",
    aids: ["thumbs", "fill"],
    stages: [
      st("listen", m(I22, 0, 1, 2, { bpm: 94 }, "Fugue I/22 in B♭ minor, soprano alone, bars 1–2: the subject", I22_SOP1, { solo: true }), "A slow, grave tune: a fall, a great leap up, and a sigh down."),
      st("watch", m(I22, 1, 3, 5, { bpm: 70 }, "Fugue I/22, second soprano, bars 3–5: the answer", I22_SOP2_3_5, { widen: 2 }), "Watch: my thumb stays down for the whole of each long note.", { style: "held", aids: ["thumbs", "fill"] }),
      st("try", m(I22, 1, 3, 5, { bpm: 70 }, "Fugue I/22, second soprano, bars 3–5: the answer", I22_SOP2_3_5, { widen: 2, wait: true }), "Your turn. Hold each one; the next waits for you.", { aids: ["thumbs", "fill", "trace"] }),
      st("play", m(I22, 1, 3, 9, full, "Fugue I/22, second soprano, bars 3–9, as in the game", I22_SOP2_3_9), "Now at the fugue's speed. Hold each note until the next one starts."),
    ],
    lens: { counts: ["Notes: 75%", "Held: half"], shown: [], never: ["Which thumb"] },
    checks: (x): Check[] => [opening(x), { text: "HELD {n} OF {m}", vars: { n: x.held.ok, m: x.held.of }, ok: x.held.of > 0 && x.held.ok >= Math.ceil(x.held.of / 2), fix: C.fixHeld(x) }],
    before: ["Five voices, the most I ever wrote in this book. Yours is the second soprano. The notes are long and slow; the art is to hold them."],
    after: ["Held: in a slow fugue the long notes are the music. Five voices, and you kept yours."],
    again: ["Keep your thumb down until the next note starts. Again."],
  },
  {
    id: "P.4",
    part: "P",
    title: "SHORT NOTES",
    english: "SHORT NOTES",
    minutes: 3,
    sound: "piano",
    sign: "short",
    aim: "Busoni's first sign: the dot over a note. Touch and let go early.",
    learn: "The SHORT sign: touch, and let go before the block ends.",
    music: "FUGUE 18 IN G♯ MINOR, BARS 1–6",
    aids: ["thumbs"],
    stages: [
      st("listen", m(I18, 2, 1, 2, { bpm: 62 }, "Fugue I/18 in G♯ minor, tenor alone, bars 1–2: the subject", ["A♭3", "G3", "A♭3", "B♭3", "B3", "B♭3", "A♭3", "D4", "E♭4", "F♯3", "A♭3", "A♭3", "B♭3", "B♭3", "E♭3"], { solo: true }), "Listen to the end of this tune: notes in pairs, each played twice, light and short."),
      st("watch", m(I18, 1, 3, 4, { bpm: 44 }, "Fugue I/18, alto, bars 3–4: the answer, the repeated notes short", I18_ALTO_3_4, { widen: 2 }), "The dots over those notes are Busoni's sign: short. Watch: touch, and let go.", { aids: ["thumbs"] }),
      st("try", m(I18, 1, 3, 4, { bpm: 44 }, "Fugue I/18, alto, bars 3–4: the answer, the repeated notes short", I18_ALTO_3_4, { widen: 2, wait: true }), "Your turn: the dotted notes short.", { aids: ["thumbs", "trace"] }),
      st("play", m(I18, 1, 3, 6, full, "Fugue I/18, alto, bars 3–6, as in the game", I18_ALTO_3_6), "Now at the fugue's speed. The dotted notes short; lift fully between the repeats."),
    ],
    lens: { counts: ["Notes: 75%"], shown: ["Short"], never: ["Which thumb"] },
    checks: (x) => [opening(x)],
    shown: (x): Check[] => [{ text: "SHORT {n} OF {m}", vars: { n: x.marks.short.ok, m: x.marks.short.of }, ok: true }],
    before: [
      "Ferruccio Busoni, a great pianist who lived a century and a half after me, edited my book and marked how to play each note. The signs you see in the game are his.",
      "A dot means short. Of all the signs, it is the first to learn.",
    ],
    after: ["Short and light. You will meet the dot in many of my fugues, now you know it."],
    again: ["Touch and let go: lift fully between the repeated notes. Again."],
  },
];

/** The Lab's BASICS before stage 1's own lesson: the screen, one thumb, the other, taking turns. */
export const BASICS = ["1.1", "1.2", "1.3", "1.4"];

export const stageLessonById = (id: string): ManualLesson | undefined => STAGE_LESSONS.find((l) => l.id === id);
