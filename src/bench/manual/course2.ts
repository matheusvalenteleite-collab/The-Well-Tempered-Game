/**
 * D379, THE TUTORIAL'S PARTS 4–6, rebuilt in the new format (WATCH → TRY → PLAY on the real play screen,
 * D373), after Luigi's curriculum (Luigi and Mario's report of 28 October 2026, §7) in the owner's order:
 * voices and the tune that comes back, time and breath, then the graces. They replace the older Parts
 * III–V (retired.ts), whose records carry over (store.ts CARRY4). Inventions and Sinfonias only; every
 * excerpt's notes listed here and held to data/touch/ by test/d379-tutorial.test.ts.
 *
 * 4 · PLAYING WITH BACH: the tune that comes back (SPOT: tap as it comes in; then it has its name, the
 * subject, and its flag), you lead, you answer, three voices (Sinfonia 1), and a check (Invention 1 to the
 * cadence in G). 5 · TIME AND BREATH: a breath at the end of a phrase, the end let come, lingering on a
 * strong note (Sinfonia 9), a check (Invention 1's last page). 6 · SHAKES, SIGHS AND SLURS: the quick
 * shake and the long one (the signs of the edition), the sigh held over (a suspension: D364's hold-over)
 * and the sigh struck (an appoggiatura's strong-then-soft, Glenn's report §4.3: by the landing, or a slide),
 * colour (where the thumb lands across the strip, D311: the mechanics report's free dimension), the slide
 * that makes a slur and the note left ringing (Glenn's mechanics, D376/D378).
 *
 * The graces are never required (D342's decision 3): those lessons pass on the notes, and what was read
 * is shown. The colour, the slur and the ring are asked where a lesson is about them, never by loudness
 * (D311: the sound is the player's touch, whatever the verdict).
 */
import type { Check, ManualLesson, Material } from "./lessons.ts";
import * as C from "./coach.ts";
import { atLeast, ex, graceLine, INV, INV1_1_4, INV8, notesRight, RH, st } from "./kit.ts";
import { I2_SUBJECT } from "./fugue-track.ts";
import { REAL_TOUR } from "./dress.ts";

const SINF1 = "bwv787";
const SINF7 = "bwv793";
const SINF9 = "bwv795";

/** Invention 1's lower voice, bars 1–4 (the answer, an octave down, half a bar after the upper). */
const LOWER_1_4 = ["C3", "D3", "E3", "F3", "D3", "E3", "C3", "G3", "G2", "G3", "A3", "B3", "C4", "A3", "B3", "G3", "C4", "B3", "C4", "D4", "E4", "G3", "A3", "B3", "C4", "E3", "F♯3", "G3", "A3", "B3", "C4", "D3"];
/** Invention 1's upper voice, bars 1–7: to the cadence in G. */
const UPPER_1_7 = [
  ...INV1_1_4.slice(0, 56), "D4", "C5", "D5", "B4", "A4", "G4", "F♯4", "E4", "G4", "F♯4", "A4", "G4", "B4", "A4", "C5", "B4", "D5", "C5", "E5", "D5", "B4", "C5", "D5", "G5", "B4", "A4", "G4", "G4", "G4", "A4", "B4", "C5", "A4", "B4", "G4", "F♯4",
];
/** Sinfonia 1's alto, bars 1–2: the answer to the soprano's rising scale (it comes in at bar 2). */
const SINF1_ALTO = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "B4", "C5", "D5", "C5", "E5", "D5", "C5", "B4"];
/** Invention 1, upper voice, bars 6–9: the phrase that closes in G, and on. */
const UPPER_6_9 = ["G4", "B4", "A4", "C5", "B4", "D5", "C5", "E5", "D5", "B4", "C5", "D5", "G5", "B4", "A4", "G4", "G4", "G4", "A4", "B4", "C5", "A4", "B4", "G4", "F♯4", "A4", "B4", "C5", "D5", "B4", "C5", "A4", "B4", "D5", "C5", "B4", "A4", "C5", "B4", "D5", "C5"];
/** Invention 1, upper voice, bars 20–22: the end (the last chord the voice's own). */
const UPPER_20_22 = ["F5", "G5", "A5", "B5", "C6", "A5", "B5", "G5", "C6", "G5", "E5", "D5", "C5", "C5", "B♭4", "A4", "G4", "F4", "A4", "G4", "B♭4", "A4", "B4", "C5", "E4", "D4", "C5", "F4", "B4", "C5", "G4", "E4"];
/** Invention 1, upper voice, bars 15–22: the last page. */
const UPPER_15_22 = [
  "A4", "A5", "G5", "F5", "E5", "G5", "F5", "A5", "G5", "E5", "F5", "G5", "A5", "F5", "G5", "E5", "F5", "G5", "F5", "E5", "D5", "F5", "E5", "G5", "F5", "D5", "E5", "F5", "G5", "E5", "F5", "D5", "E5", "C5", "D5", "E5", "F5", "D5", "E5", "C5", "D5", "E5", "F5", "G5", "A5", "F5", "G5", "E5",
  ...UPPER_20_22,
];
/** Sinfonia 9's alto, bars 3–5: the answer, a falling chromatic line, the crotchets aching downward. */
const SINF9_ALTO = ["A♭4", "C5", "B4", "B♭4", "A4", "A♭4", "G4", "C5", "B4", "C5", "C5", "C♯5", "C5", "B♭4", "C5"];
/** Sinfonia 9's soprano, bars 3–4: the sighs (a note leaned on, then a step down). */
const SINF9_SOP = ["C5", "E♭5", "D5", "D5", "F5", "E5", "F5", "B5", "C6", "B♭5", "A♭5", "G5", "F5", "E♭5"];
/** Invention 1, upper voice, bars 1–2: the quick shakes on B and F (the edition's signs). */
const UPPER_1_2 = INV1_1_4.slice(0, 24);
/** Sinfonia 7's soprano, bars 42–44: the long shake on D♯ before the end. */
const SINF7_END = ["B5", "A5", "G5", "F♯5", "A5", "E♭5", "E5", "F♯5", "B5", "E♭5", "E5", "E5", "E♭5", "E5"];
/** Invention 8, upper voice, bar 1: the leaps, and the next note. */
const INV8_LEAPS = ["F4", "A4", "F4", "C5", "F4", "F5", "E5"];
/** Invention 1, upper voice, bar 1: the first idea. */
const FIRST8 = INV1_1_4.slice(0, 8);

/** D402, THE REAL THING: Fugue I/2's subject, the alto alone (bars 1–2), on the organ, flagged, by BUSONI's reading as the game plays it, at the game's own windows. */
const real = () => ex("wtc1f02", 1, 1, 2, { bpm: 44 }, "Fugue I/2 in C minor, alto, bars 1–2: the subject, as in the game", { notes: I2_SUBJECT, flags: true, reading: "busoni", sound: "organ" });
const flagged = { flags: true } as const;
/** Invention 1's upper voice; the SUBJECT flags only where asked (Part 4: the subject being the point there; elsewhere they would crowd the box). */
const inv1Upper = (from: number, to: number, bpm: number, label: string, notes: string[], o: Partial<Material> = {}) => ex(INV, RH, from, to, { bpm }, label, { notes, ...o });

const colourLine = (x: { colour: { firm: number; soft: number } }): Check => ({ text: "BY THE BOX {f} · BY THE RIM {s}", vars: { f: x.colour.firm, s: x.colour.soft }, ok: x.colour.firm >= 2 && x.colour.soft >= 2, fix: { text: "Land some notes right by the box, and some out by the edge of the phone." } });

export const COURSE2: ManualLesson[] = [
  // PART 4 · PLAYING WITH BACH · voices, and the tune that comes back
  {
    id: "4.1",
    part: "4",
    title: "THE TUNE THAT COMES BACK",
    english: "THE TUNE THAT COMES BACK",
    minutes: 3,
    sound: "piano",
    aim: "My music is built from one little tune that keeps coming back, high and low. You will learn to hear it come in.",
    learn: "To hear the tune that keeps coming back, in either voice: its name is the subject.",
    music: "INVENTION 1, BARS 1–3",
    aids: [],
    stages: [
      st("watch", inv1Upper(1, 3, 43, "Invention 1, bars 1–3, both voices: the tune flagged each time it begins", INV1_1_4.slice(0, 40), flagged), "Watch the flags: each one marks the tune beginning again. First up high, then down low, then up again.", { aids: [] }),
      st("spot", inv1Upper(1, 3, 43, "Invention 1, bars 1–3, both voices, no flags", INV1_1_4.slice(0, 40), { flags: false }), "Now without flags. Each time you hear the tune begin, high or low, tap a strip.", { spot: { need: 4, strays: 3 } }),
    ],
    lens: { counts: ["Entries found: 4 of 6", "Stray taps: 3 at most"], shown: [], never: ["Which strip you tap"] },
    before: ["Listen: the music I write is made of one small tune, which comes back again and again."],
    after: ["That tune has a name: the subject. From now on it has its flag in the box, as in the game."],
    again: ["Tap when the tune begins: up, up, up, a little down, then a jump."],
  },
  {
    id: "4.2",
    part: "4",
    title: "YOU LEAD",
    english: "YOU LEAD",
    minutes: 3,
    sound: "piano",
    aim: "You play the upper voice and begin; I answer you below.",
    learn: "To lead: you begin the subject, and I answer it.",
    music: "INVENTION 1, BARS 1–4",
    aids: ["thumbs"],
    stages: [
      st("watch", inv1Upper(1, 4, 48, "Invention 1, upper voice, bars 1–4, with the lower voice", INV1_1_4, { ...flagged, widen: 2 }), "This time the upper voice is yours. Watch: it begins alone, and my lower voice answers it.", { aids: ["thumbs"] }),
      st("try", inv1Upper(1, 4, 48, "Invention 1, upper voice, bars 1–4, with the lower voice", INV1_1_4, { ...flagged, widen: 2, wait: true }), "Your turn. Each note waits for you; my voice waits with it.", { aids: ["thumbs", "trace"] }),
      st("play", inv1Upper(1, 4, 48, "Invention 1, upper voice, bars 1–4, with the lower voice", INV1_1_4, { ...flagged, widen: 2 }), "In time now. You begin; I answer."),
    ],
    lens: { counts: ["Notes: 75%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.75)],
    before: ["In 1.5 I began and you answered. Now you begin."],
    after: ["You led, and I followed you."],
    again: ["Begin with the subject; then keep going while I answer. Again."],
  },
  {
    id: "4.3",
    part: "4",
    title: "YOU ANSWER",
    english: "YOU ANSWER",
    minutes: 3,
    sound: "piano",
    aim: "I begin up high; you answer with the same tune, lower down, and keep going.",
    learn: "To answer: the same tune, lower, while the other voice goes on.",
    music: "INVENTION 1, BARS 1–4",
    aids: ["thumbs", "answer"],
    stages: [
      st("watch", ex(INV, 1, 1, 4, { bpm: 48 }, "Invention 1, lower voice, bars 1–4", { notes: LOWER_1_4, widen: 2, ...flagged }), "Your voice is the lower one. It waits for half a bar, then answers with the subject, lower down.", { aids: ["thumbs", "answer"] }),
      st("try", ex(INV, 1, 1, 4, { bpm: 48 }, "Invention 1, lower voice, bars 1–4", { notes: LOWER_1_4, widen: 2, wait: true, ...flagged }), "Your turn. Wait for my tune, then answer it. Each note waits for you.", { aids: ["thumbs", "answer", "trace"] }),
      st("play", ex(INV, 1, 1, 4, { bpm: 48 }, "Invention 1, lower voice, bars 1–4", { notes: LOWER_1_4, widen: 2, ...flagged }), "In time. I begin; you answer, and go on to the end of bar 4."),
    ],
    lens: { counts: ["Notes: 75%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.75)],
    before: ["The other way round now, and longer than in 1.5: four bars."],
    after: ["You answered, and kept your own line under mine."],
    again: ["Wait for my tune, then answer it lower down. Again."],
  },
  {
    id: "4.4",
    part: "4",
    title: "THREE VOICES",
    english: "THREE VOICES",
    minutes: 3,
    sound: "piano",
    aim: "In a Sinfonia there are three voices: the top one begins, you come in the middle, the bass holds us up.",
    learn: "To keep your line in the middle of three voices.",
    music: "SINFONIA 1, BARS 1–2",
    aids: ["thumbs", "answer"],
    stages: [
      st("watch", ex(SINF1, 1, 1, 2, { bpm: 38 }, "Sinfonia 1, middle voice, bars 1–2", { notes: SINF1_ALTO, widen: 2, ...flagged }), "Three voices. The top one climbs a scale; in bar 2 the middle voice, yours, climbs the same scale.", { aids: ["thumbs", "answer"] }),
      st("try", ex(SINF1, 1, 1, 2, { bpm: 38 }, "Sinfonia 1, middle voice, bars 1–2", { notes: SINF1_ALTO, widen: 2, wait: true, ...flagged }), "Your turn, in the middle. Each note waits for you.", { aids: ["thumbs", "answer", "trace"] }),
      st("play", ex(SINF1, 1, 1, 2, { bpm: 38 }, "Sinfonia 1, middle voice, bars 1–2", { notes: SINF1_ALTO, widen: 2, ...flagged }), "In time. Listen for the top voice above you, and the bass below."),
    ],
    lens: { counts: ["Notes: 70%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.7)],
    before: ["My Sinfonias have three voices. You take the middle one."],
    after: ["One line among three, and you held it."],
    again: ["Wait for bar 2, then climb with the scale. Again."],
  },
  {
    id: "4.5",
    part: "4",
    title: "CHECK: INVENTION 1'S FIRST PHRASE",
    english: "CHECK: INVENTION 1'S FIRST PHRASE",
    minutes: 4,
    sound: "piano",
    aim: "The first page of my first Invention, to the end of its first phrase.",
    learn: "To play a whole first page with me, the subject coming and going.",
    music: "INVENTION 1, BARS 1–7",
    aids: ["thumbs"],
    stages: [
      st("watch", inv1Upper(1, 7, 48, "Invention 1, upper voice, bars 1–7, with the lower voice", UPPER_1_7, flagged), "Seven bars, to the end of the first phrase. Watch for the subject's flags as it comes and goes.", { aids: ["thumbs"] }),
      st("play", inv1Upper(1, 7, 48, "Invention 1, upper voice, bars 1–7, with the lower voice", UPPER_1_7, flagged), "Seven bars. I will say nothing until the end."),
    ],
    lens: { counts: ["Notes: 75%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.75)],
    before: ["The whole first phrase of my first Invention, with me."],
    after: ["The first page of my Inventions is yours."],
    again: ["Sing the subject in your head as it comes back. Again."],
    checkpoint: true,
  },
  // PART 5 · TIME AND BREATH · where the music waits
  {
    id: "5.1",
    part: "5",
    title: "A BREATH AT THE END OF A PHRASE",
    english: "A BREATH AT THE END OF A PHRASE",
    minutes: 3,
    sound: "organ",
    aim: "Where a phrase ends, take a small breath: lift, and come back a hair late.",
    learn: "To breathe where a phrase ends: a small silence, and a slightly late new start.",
    music: "INVENTION 1, BARS 6–9",
    aids: ["thumbs", "breath"],
    stages: [
      st("watch", inv1Upper(6, 9, 48, "Invention 1, upper voice, bars 6–9: the phrase ends in bar 7", UPPER_6_9), "Watch the comma over the box: the phrase ends there. I lift, breathe, and come back a hair late.", { style: "breath", aids: ["thumbs", "breath"] }),
      st("play", inv1Upper(6, 9, 48, "Invention 1, upper voice, bars 6–9: the phrase ends in bar 7", UPPER_6_9), "At the comma, lift and breathe. Coming back a little late counts as on time there."),
    ],
    lens: { counts: ["A breath taken", "Notes: 70%"], shown: [], never: ["How long you breathe"] },
    checks: (x): Check[] => [{ text: "BREATHS {n} (AIM 1)", vars: { n: x.graces.breath }, ok: x.graces.breath >= 1, fix: C.fixBreath() }, notesRight(x, 0.7)],
    before: ["A singer breathes where the words end. Music has places like that too. Here, on the organ: you hear every silence."],
    after: ["You breathed, and the next phrase began fresh."],
    again: ["At the comma: lift, wait a moment, then go on. Again."],
  },
  {
    id: "5.2",
    part: "5",
    title: "LETTING THE END COME",
    english: "LETTING THE END COME",
    minutes: 3,
    sound: "piano",
    aim: "At the very end, slow down a little, and stay on the last notes.",
    learn: "To slow a little at the very end, and hold the last chord.",
    music: "INVENTION 1, BARS 20–22",
    aids: ["thumbs"],
    stages: [
      st("watch", inv1Upper(20, 22, 48, "Invention 1, upper voice, bars 20–22: the end", UPPER_20_22), "The last bars of my Invention. Watch: I slow down a little, and stay on the end.", { style: "broaden", aids: ["thumbs"] }),
      st("play", inv1Upper(20, 22, 48, "Invention 1, upper voice, bars 20–22: the end", UPPER_20_22), "Let the last bars widen a little. Don't hurry to the end, and hold the last chord."),
    ],
    lens: { counts: ["The last notes held", "Notes: 70%"], shown: ["Notes let a little late at the end"], never: ["How much you slow"] },
    checks: (x): Check[] => [{ text: "THE LAST NOTE {w}", vars: { w: !x.last.hit ? "MISSED" : x.last.word === "TOO SOON" ? "TOO SOON" : "HELD" }, ok: x.last.hit && x.last.word !== "TOO SOON", fix: C.fixLast(x) }, notesRight(x, 0.7)],
    shown: (x): Check[] => [{ text: "BROADENED {n}", vars: { n: x.graces.broaden }, ok: true }],
    before: ["The end of a piece comes to you. Don't run to meet it."],
    after: ["The end came to you, and you stayed with it."],
    again: ["Slow a little in the last bar, and hold the last chord. Again."],
  },
  {
    id: "5.3",
    part: "5",
    title: "LINGERING ON A STRONG NOTE",
    english: "LINGERING ON A STRONG NOTE",
    minutes: 3,
    sound: "piano",
    aim: "On a strong beat, arrive a moment late; the next note is back in time.",
    learn: "To linger on a strong note: arrive a moment late, then walk on in time.",
    music: "SINFONIA 9, BARS 3–5",
    aids: ["thumbs"],
    stages: [
      st("watch", ex(SINF9, 1, 3, 5, { bpm: 40 }, "Sinfonia 9, middle voice, bars 3–5: a line falling by half steps", { notes: SINF9_ALTO }), "A sad, slow line. Watch: on the first beat of each bar I arrive a moment late, then walk on in time.", { style: "lean", aids: ["thumbs"] }),
      st("try", ex(SINF9, 1, 3, 5, { bpm: 40 }, "Sinfonia 9, middle voice, bars 3–5: a line falling by half steps", { notes: SINF9_ALTO, wait: true }), "Your turn, slowly: feel each step down. Each note waits for you.", { aids: ["thumbs", "trace"] }),
      st("play", ex(SINF9, 1, 3, 5, { bpm: 40 }, "Sinfonia 9, middle voice, bars 3–5: a line falling by half steps", { notes: SINF9_ALTO }), "In time. On the strong beats, linger a moment; then back in time."),
    ],
    lens: { counts: ["Two lingerings kept", "Notes: 70%"], shown: ["Lingerings taken back"], never: ["Which beats you choose"] },
    checks: (x): Check[] => [{ text: "LEANS KEPT {n} (AIM 2)", vars: { n: x.graces.agogic }, ok: x.graces.agogic >= 2, fix: C.fixLean(x) }, notesRight(x, 0.7)],
    shown: (x): Check[] => [{ text: "TAKEN BACK {n}", vars: { n: x.graces.revoked }, ok: true }],
    before: ["My ninth Sinfonia is a lament. Some notes ask you to stay on them a moment."],
    after: ["Late on the strong note, then in time again: that is lingering."],
    again: ["Arrive a moment late on the beat; the next note on time. Again."],
  },
  {
    id: "5.4",
    part: "5",
    title: "CHECK: THE LAST PAGE",
    english: "CHECK: THE LAST PAGE",
    minutes: 4,
    sound: "piano",
    aim: "The last page of my first Invention: the long notes held, a breath where you like, the end let come.",
    learn: "To shape a whole page in time: holds, breaths, and an end that comes to you.",
    music: "INVENTION 1, BARS 15–22",
    aids: ["thumbs"],
    stages: [
      st("watch", inv1Upper(15, 22, 48, "Invention 1, upper voice, bars 15–22: to the end", UPPER_15_22), "The last page. Watch the long notes: I hold them while the lower voice moves.", { aids: ["thumbs"] }),
      st("play", inv1Upper(15, 22, 48, "Invention 1, upper voice, bars 15–22: to the end", UPPER_15_22), "To the end. Hold the long notes, breathe where you like, and let the end come."),
    ],
    lens: { counts: ["Notes: 75%", "The last notes held"], shown: ["Breaths, leans, the end"], never: ["Where you breathe or linger"] },
    checks: (x): Check[] => [notesRight(x, 0.75), { text: "THE LAST NOTE {w}", vars: { w: !x.last.hit ? "MISSED" : x.last.word === "TOO SOON" ? "TOO SOON" : "HELD" }, ok: x.last.hit && x.last.word !== "TOO SOON", fix: C.fixLast(x) }],
    shown: (x): Check[] => [{ text: "BREATHS {b} · LEANS {a} · BROADENED {c}", vars: { b: x.graces.breath, a: x.graces.agogic, c: x.graces.broaden }, ok: true }],
    before: ["Eight bars, to the end of my first Invention. I will say nothing until the end."],
    after: ["Now the music has time to speak."],
    again: ["Hold the long notes, and don't hurry the end. Again."],
    told: (x) => (x.graces.breath > 0 ? { text: "I heard you breathe where a singer would." } : x.graces.agogic > 0 ? { text: "I heard you linger, and come back." } : null),
    checkpoint: true,
  },
  // PART 6 · SHAKES, SIGHS AND SLURS · the graces (never required: D342's decision 3), and the player's own colour
  {
    id: "6.1",
    part: "6",
    title: "THE QUICK SHAKE",
    english: "THE QUICK SHAKE",
    minutes: 3,
    sound: "harpsichord",
    aim: "On a note with the little wavy sign, give your thumb a tiny quick shake: down and up, as if shivering.",
    learn: "The quick shake: a tiny shiver of the thumb on the note with the sign.",
    music: "INVENTION 1, BARS 1–2",
    aids: ["thumbs"],
    ornaments: true,
    stages: [
      st("watch", inv1Upper(1, 2, 40, "Invention 1, upper voice, bars 1–2: two shakes, on B and on F", UPPER_1_2), "See the little wavy signs, on the B and on the F? Watch my thumb shiver on those two notes.", { aids: ["thumbs"] }),
      st("try", inv1Upper(1, 2, 40, "Invention 1, upper voice, bars 1–2: two shakes, on B and on F", UPPER_1_2, { wait: true }), "Your turn. On the sign, touch the note, then a tiny quick shake. Each note waits for you.", { aids: ["thumbs"] }),
      st("play", inv1Upper(1, 2, 40, "Invention 1, upper voice, bars 1–2: two shakes, on B and on F", UPPER_1_2), "In time. A tiny shiver on the signs; the other notes plain."),
    ],
    lens: { counts: ["Notes: 70%"], shown: ["The shakes read"], never: ["The shakes (they are never required)"] },
    checks: (x): Check[] => [notesRight(x, 0.7)],
    shown: (x): Check[] => [graceLine(x)],
    before: ["A sign over a note asks for a little ornament. The commonest is a quick shake."],
    after: ["A shiver on the note: the most common ornament in my music."],
    again: ["Touch the note, then shake small and quick. Again."],
    told: (x) => (x.orn.of && x.orn.read < x.orn.of ? { text: "Not every shake was heard. Touch the note, then a tiny quick shake, down and up." } : x.orn.of ? { text: "Both shakes heard. Good." } : null),
    sources: ["J. S. Bach, Clavier-Büchlein vor Wilhelm Friedemann Bach (1720): the Explication of the signs."],
  },
  {
    id: "6.2",
    part: "6",
    title: "THE LONG SHAKE",
    english: "THE LONG SHAKE",
    minutes: 3,
    sound: "harpsichord",
    aim: "Just before the end of a piece, a long note shakes for as long as it lasts.",
    learn: "The long shake: keep shaking for the whole note, then stop.",
    music: "SINFONIA 7, BARS 42–44",
    aids: ["thumbs"],
    ornaments: true,
    stages: [
      st("watch", ex(SINF7, 0, 42, 44, { bpm: 40 }, "Sinfonia 7, top voice, bars 42–44: the long shake before the end", { notes: SINF7_END, widen: 2 }), "Near the end, the long note with the sign: watch, I keep shaking until the next note.", { aids: ["thumbs"] }),
      st("try", ex(SINF7, 0, 42, 44, { bpm: 40 }, "Sinfonia 7, top voice, bars 42–44: the long shake before the end", { notes: SINF7_END, widen: 2, wait: true }), "Your turn. On the sign, shake and keep shaking. Each note waits for you.", { aids: ["thumbs"] }),
      st("play", ex(SINF7, 0, 42, 44, { bpm: 40 }, "Sinfonia 7, top voice, bars 42–44: the long shake before the end", { notes: SINF7_END, widen: 2 }), "In time. Shake through the long note, then land on the last one."),
    ],
    lens: { counts: ["Notes: 70%"], shown: ["The shake read"], never: ["The shake (it is never required)", "How fast you shake"] },
    checks: (x): Check[] => [notesRight(x, 0.7)],
    shown: (x): Check[] => [graceLine(x)],
    before: ["Before the end of a piece I often shake a note for longer."],
    after: ["A long shake, and then rest: the end feels like an end."],
    again: ["Keep the shake going while the note lasts. Again."],
    told: (x) => (x.orn.of && x.orn.read < x.orn.of ? { text: "The shake was not heard. Shake small and quick, and keep going." } : null),
    sources: ["C. P. E. Bach, Versuch (1753), I, ch. 2, sect. 3: the trill, and its ending."],
  },
  {
    id: "6.3",
    part: "6",
    title: "THE SIGH, HELD OVER",
    english: "THE SIGH, HELD OVER",
    minutes: 4,
    sound: "piano",
    aim: "Keep holding the old note after the new one is due; then let go, and the new note arrives late and soft, like a sigh.",
    learn: "The held-over sigh: the old note kept into the new beat, then let go.",
    music: "SINFONIA 9, BARS 3–5",
    aids: ["thumbs", "prepared"],
    ornaments: true,
    stages: [
      st("watch", ex(SINF9, 1, 3, 5, { bpm: 40 }, "Sinfonia 9, middle voice, bars 3–5: three sighs held over", { notes: SINF9_ALTO, widen: 2 }), "Watch: my free thumb rests on the next note early. I keep holding the old one past the beat, then let go: the new note sighs in.", { style: "appoggiatura", aids: ["thumbs", "prepared"] }),
      st("try", ex(SINF9, 1, 3, 5, { bpm: 40 }, "Sinfonia 9, middle voice, bars 3–5: three sighs held over", { notes: SINF9_ALTO, widen: 2, wait: true }), "Your turn, slowly. Rest the free thumb on the next note, then lift the other.", { aids: ["thumbs", "prepared"] }),
      st("play", ex(SINF9, 1, 3, 5, { bpm: 40 }, "Sinfonia 9, middle voice, bars 3–5: three sighs held over", { notes: SINF9_ALTO, widen: 2 }), "In time. Where you like, hold the old note past the beat, about half the new note, then let go."),
    ],
    lens: { counts: ["Notes: 85%"], shown: ["The sighs held over", "How long, against the textbook half"], never: ["The sighs (they are never required)", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.85)],
    shown: (x): Check[] => [
      { text: "HELD OVER {n} OF {m}", vars: { n: x.appo.made, m: x.appo.of }, ok: true },
      { text: "HELD {p}% OF THE NOTE · THE TEXTBOOK: HALF", vars: { p: x.appo.shares.length ? Math.round((100 * x.appo.shares.reduce((a, b) => a + b, 0)) / x.appo.shares.length) : "—" }, ok: true },
    ],
    before: ["A sigh: the old note will not let go when the new beat comes, so they rub together; then it gives way. Musicians call this a suspension."],
    after: ["The rub, and then the answer: that is a sigh held over."],
    again: ["Rest the free thumb on the next note, and hold the old one past the beat. Again."],
    told: (x) => {
      if (!x.appo.made) return { text: "None held over. Rest the free thumb on the next note, then hold past the beat." };
      const m = x.appo.shares.reduce((a, b) => a + b, 0) / x.appo.shares.length;
      return m < 0.35 ? { text: "Short and light. You may hold it longer: half the note." } : m > 0.65 ? { text: "Long, and full of feeling." } : { text: "Half the note, as my son teaches it." };
    },
    sources: ["C. P. E. Bach, Versuch (1753), I, ch. 2, sect. 2: the long appoggiatura, half the note, the note after it softer.", "J. J. Quantz, Versuch (1752), ch. VIII: the appoggiatura held, then resolved softly."],
  },
  {
    id: "6.4",
    part: "6",
    title: "COLOUR: WHERE YOU LAND",
    english: "COLOUR: WHERE YOU LAND",
    minutes: 3,
    sound: "piano",
    aim: "Where your thumb lands across the strip changes the sound: by the music box firmer and brighter, out by the edge softer and darker.",
    learn: "Colour: land by the box for a firmer note, by the edge for a softer one. It is never right or wrong; it is yours.",
    music: "INVENTION 1, BARS 1–2",
    aids: ["thumbs", "colour"],
    stages: [
      st("watch", inv1Upper(1, 2, 40, "Invention 1, upper voice, bars 1–2: bar 1 by the box, bar 2 by the edge", UPPER_1_2, { coach: "colour" }), "Watch where my thumb lands: in bar 1 right by the box, firm; in bar 2 out by the edge, soft, like an echo.", { aids: ["thumbs", "colour"] }),
      st("try", inv1Upper(1, 2, 40, "Invention 1, upper voice, bars 1–2: bar 1 by the box, bar 2 by the edge", UPPER_1_2, { coach: "colour", wait: true }), "Your turn. Bar 1 by the box, bar 2 by the edge. Hear the difference? Each note waits for you.", { aids: ["thumbs", "colour"] }),
      st("play", inv1Upper(1, 2, 40, "Invention 1, upper voice, bars 1–2: bar 1 by the box, bar 2 by the edge", UPPER_1_2, { coach: "colour" }), "In time: bar 1 firm, by the box; bar 2 soft, by the edge."),
    ],
    lens: { counts: ["Both colours used: two notes each", "Notes: 70%"], shown: [], never: ["Which colour you choose in the game", "Loudness, as right or wrong"] },
    checks: (x): Check[] => [colourLine(x), notesRight(x, 0.7)],
    before: ["Here is something few players know: across the strip, not only up and down, your thumb has a choice. On the piano you hear it best."],
    after: ["The colour is yours, in every piece: nobody will ever mark it wrong."],
    again: ["Land by the box in bar 1, out by the edge in bar 2. Again."],
  },
  {
    id: "6.5",
    part: "6",
    title: "THE SIGH, STRUCK",
    english: "THE SIGH, STRUCK",
    minutes: 3,
    sound: "piano",
    aim: "A sigh can also be struck: lean on the first note, by the box, and let the step down be soft, by the edge, or slide down to it.",
    learn: "The struck sigh: the first note leaned on, the step down soft.",
    music: "SINFONIA 9, BARS 3–4",
    aids: ["thumbs", "colour"],
    stages: [
      st("watch", ex(SINF9, 0, 3, 4, { bpm: 40 }, "Sinfonia 9, top voice, bars 3–4: sighs, each a note and a step down", { notes: SINF9_SOP, widen: 2, coach: "sigh" }), "Each step down is a sigh. Watch: I lean on the first note by the box, and let the next one fall softly, by the edge.", { aids: ["thumbs", "colour"] }),
      st("try", ex(SINF9, 0, 3, 4, { bpm: 40 }, "Sinfonia 9, top voice, bars 3–4: sighs, each a note and a step down", { notes: SINF9_SOP, widen: 2, wait: true, coach: "sigh" }), "Your turn: firm, then soft, on every step down. Each note waits for you.", { aids: ["thumbs", "colour"] }),
      st("play", ex(SINF9, 0, 3, 4, { bpm: 40 }, "Sinfonia 9, top voice, bars 3–4: sighs, each a note and a step down", { notes: SINF9_SOP, widen: 2, coach: "sigh" }), "In time. Lean, then soft. Or slide your thumb down the step: the slide softens it for you."),
    ],
    lens: { counts: ["Two sighs shaped", "Notes: 70%"], shown: [], never: ["How strong or soft", "Loudness, as right or wrong"] },
    checks: (x): Check[] => [{ text: "SIGHS SHAPED {n} OF {m}", vars: { n: x.sighs.ok, m: x.sighs.of }, ok: x.sighs.ok >= 2, fix: { text: "On each step down: the first note by the box, the second by the edge, or slide down to it." } }, notesRight(x, 0.7)],
    before: ["The held-over sigh hangs on to the old note. This one is struck fresh and leaned on, then lets go: players shape an appoggiatura the same way."],
    after: ["Strong, then soft: a sigh you can strike."],
    again: ["Lean on the first by the box; the step down by the edge. Again."],
  },
  {
    id: "6.6",
    part: "6",
    title: "SLIDE INTO A SLUR",
    english: "SLIDE INTO A SLUR",
    minutes: 3,
    sound: "piano",
    aim: "Slide your thumb to the next note without lifting: it plays the note and ties the two together, a slur. Lift, and the slur ends.",
    learn: "A slide makes a slur: the notes joined in one gesture, each a little softer than the first.",
    music: "INVENTION 1, BAR 1",
    aids: ["thumbs"],
    stages: [
      st("watch", inv1Upper(1, 1, 36, "Invention 1, upper voice, bar 1: the first idea, its steps up slid", FIRST8, { count: 8, solo: true, coach: "slide" }), "Watch: on the steps up my thumb does not lift, it slides. The notes join into one gesture, and fade a little.", { aids: ["thumbs"] }),
      st("try", inv1Upper(1, 1, 36, "Invention 1, upper voice, bar 1: the first idea, its steps up slid", FIRST8, { count: 8, solo: true, coach: "slide", wait: true }), "Your turn. Land on the first note, then slide up to the next without lifting. Each note waits for you.", { aids: ["thumbs"] }),
      st("play", inv1Upper(1, 1, 36, "Invention 1, upper voice, bar 1: the first idea, its steps up slid", FIRST8, { count: 8, solo: true, coach: "slide" }), "In time. Slide up the steps; lift to end the slur."),
    ],
    lens: { counts: ["Two notes slid to", "Notes: 70%"], shown: [], never: ["Where you end the slur"] },
    checks: (x): Check[] => [{ text: "SLID {n} (AIM 2)", vars: { n: x.slides }, ok: x.slides >= 2, fix: { text: "Keep the thumb down and slide it to the next note, without lifting." } }, notesRight(x, 0.7)],
    before: ["Two ways to join notes: two thumbs, one after the other, or one thumb sliding. On a keyboard the slide makes a slur."],
    after: ["Slid, and joined: a slur, one gesture."],
    again: ["Don't lift: slide the thumb up to the next note. Again."],
  },
  {
    id: "6.7",
    part: "6",
    title: "LET IT RING",
    english: "LET IT RING",
    minutes: 3,
    sound: "harpsichord",
    aim: "Keep the old note down a little after the next one sounds: on the harpsichord it rings on, and the notes melt together.",
    learn: "Letting a note ring: hold it a moment past the next, and the notes melt together.",
    music: "INVENTION 8, BAR 1",
    aids: ["thumbs"],
    stages: [
      st("watch", ex(INV8, 0, 1, 1, { bpm: 50 }, "Invention 8, upper voice, bar 1: the leaps, each note left ringing", { count: 7, notes: INV8_LEAPS, solo: true, coach: "ring" }), "Watch: each thumb stays down a moment after the other lands. The notes overlap and ring, like a chord.", { aids: ["thumbs"] }),
      st("play", ex(INV8, 0, 1, 1, { bpm: 50 }, "Invention 8, upper voice, bar 1: the leaps, each note left ringing", { count: 7, notes: INV8_LEAPS, solo: true, coach: "ring" }), "In time. Land the next note, then lift the old one a moment later."),
    ],
    lens: { counts: ["Three notes left ringing", "Notes: 70%"], shown: [], never: ["How long you let them ring"] },
    checks: (x): Check[] => [{ text: "RANG ON {n} OF {m}", vars: { n: x.rings.ok, m: x.rings.of }, ok: x.rings.ok >= 3 && atLeast(x.rings.ok, x.rings.of, 0.5), fix: { text: "Lift the old thumb a moment after the new one lands, not before." } }, notesRight(x, 0.7)],
    before: ["Harpsichord players hold notes a little longer than written, so they ring into each other. You can too."],
    after: ["Held over, and ringing: the harpsichord sings."],
    again: ["Land the next note first; lift the old one a moment later. Again."],
  },
  // D402 (the design studio's brief, STUDIO-REAL-SCREEN.md): the last lesson before the fugue track: the
  // whole play screen toured, one element lit at a time, then a fugue subject played on it, on the organ.
  {
    id: "6.8",
    part: "6",
    title: "THE REAL THING",
    english: "THE REAL THING",
    minutes: 3,
    sound: "organ",
    aim: "The whole play screen, every part of it, and a fugue subject played on it as in the game.",
    learn: "The real screen, the one you will play on: score, crowd, the subject, the stops, pause.",
    music: "FUGUE 2 IN C MINOR, BARS 1–2",
    aids: ["thumbs"],
    stages: [
      st("tour", real(), "The real screen, one part at a time.", { tour: REAL_TOUR }),
      st("watch", real(), "Watch me play the subject of my fugue in C minor, on the organ. The flag marks where it enters.", { aids: ["thumbs"] }),
      st("play", real(), "Now you, on the real screen. The subject is yours: play it whole."),
    ],
    lens: { counts: ["Notes: 70%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.7)],
    before: ["You have learned every part of the screen. Now the screen of the game itself, all of it at once."],
    after: ["That was the real thing. Every fugue of mine is played on this screen."],
    again: ["A quick turn, a jump down, the turn again. Again."],
    checkpoint: true,
  },
];
