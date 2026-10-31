/**
 * D379, THE FUGUE TRACK: "SO YOU WANT TO PLAY A FUGUE?" (its name after Glenn Gould's "So You Want to
 * Write a Fugue?", 1963). The owner: "Some tutorial lessons ought to be about Bach and baroque music and
 * fugues, giving the player some basic knowledge of what those things are, in an interactive way." A
 * short introduction in seven lessons, each on the game's own music and sound engine, never a slideshow:
 * he plays (LISTEN, WATCH), the player answers (QUIZ), taps as the subject comes in (SPOT), compares two
 * tunings by ear, and plays a subject (TRY, PLAY).
 *
 * Accuracy (the owner: "mark nothing as fact that is disputed"): dates and places as the standard
 * biographies give them (Eisenach 1685, Leipzig 1723–1750, Book I's title page 1722); his purpose quoted
 * only from his own title pages (the Inventions, 1723; the Well-Tempered Clavier, 1722); the disputed said
 * to be disputed: which tuning "well-tempered" meant to him, and which keyboard "Clavier" meant in each
 * piece. No jargon without its gloss in the same line (subject, answer, countersubject, episode, stretto,
 * exposition, temperament, the wolf).
 */
import type { ManualLesson, Material } from "./lessons.ts";
import { ex, INV, INV1_1_4, notesRight, RH, st } from "./kit.ts";

const I1 = "wtc1f01";
const I2 = "wtc1f02";
const P1 = "wtc1p01";
const P3 = "wtc1p03";

const UPPER_1_2 = INV1_1_4.slice(0, 24);
/** I/2's subject, the alto alone (bars 1–2, to the note bar 3 begins with). */
const I2_SUBJECT = ["C5", "B4", "C5", "G4", "A♭4", "C5", "B4", "C5", "D5", "G4", "C5", "B4", "C5", "D5", "F4", "G4", "A♭4", "G4", "F4", "E♭4"];
/** I/2's alto, bars 1–8: the subject, then the countersubject against the answer, the episode, on to the bass's entry. */
const I2_ALTO_1_8 = [
  ...I2_SUBJECT, "C5", "B4", "A4", "G4", "F4", "E♭4", "D4", "C4", "E♭5", "D5", "C5", "B♭4", "A4", "B♭4", "C5", "F♯4", "G4", "A4", "F♯4", "G4", "C4", "D4", "E♭4", "F4", "G4", "A♭4", "D4", "E♭4", "F4", "G4", "A4", "B♭4", "E♭4", "F4", "G4", "A♭4", "G4", "F4", "E♭4", "D4", "C5", "B4", "C5", "F5", "E♭5", "D5", "A♭4", "G4", "F4", "G4", "F4", "E♭4", "F4", "D4", "G4",
];
const I2_ALTO_1_9 = [...I2_ALTO_1_8, "B4", "C5", "C5", "B4", "C5", "G4", "A♭4"];
/** I/2's bass, bars 5–8: silent through the episode, then the subject, deep down. */
const I2_BASS_5_8 = ["C4", "B3", "C4", "G3", "A♭3", "C4", "B3", "C4", "D4", "G3", "C4", "B3", "C4", "D4", "F3", "G3", "A♭3", "G3", "F3", "E♭3"];
/** I/1's alto, bars 1–5: the exposition (alto, soprano, tenor, bass). */
const I1_ALTO_1_5 = ["C4", "D4", "E4", "F4", "G4", "F4", "E4", "A4", "D4", "G4", "A4", "G4", "F4", "E4", "F4", "E4", "D4", "C4", "D4", "C4", "B3", "A3", "F♯4", "G4", "F♯4", "E4", "F♯4", "D4", "G4", "F4", "E4", "D4", "C4", "G4", "F4", "E4", "F4", "F4", "E4", "D4", "C4"];
/** I/1's alto, bars 14–17: the entries crowding in (a stretto). */
const I1_ALTO_14_17 = ["C4", "D4", "E4", "F4", "G4", "F4", "E4", "A4", "D4", "G4", "A4", "G4", "F4", "E4", "E4", "F♯4", "G4", "F♯4", "A♭4", "A4", "G4", "A4", "B4", "C5", "D5", "C5", "B4", "E5", "A4", "D5", "E5", "D5", "C5", "B4"];
/** Prelude I/1, bars 1–4 (C major), and Prelude I/3, bars 1–8 (C♯ major), the upper voice. */
const P1_1_4 = ["G4", "C5", "E5", "G4", "C5", "E5", "G4", "C5", "E5", "G4", "C5", "E5", "A4", "D5", "F5", "A4", "D5", "F5", "A4", "D5", "F5", "A4", "D5", "F5", "G4", "D5", "F5", "G4", "D5", "F5", "G4", "D5", "F5", "G4", "D5", "F5", "G4", "C5", "E5", "G4", "C5", "E5", "G4", "C5", "E5", "G4", "C5", "E5", "A4"];
const P3_1_8 = ["F5", "C♯5", "A♭4", "C♯5", "F5", "C♯5", "F♯5", "C♯5", "F♯5", "C♯5", "F♯5", "C♯5", "A♭5", "C♯5", "A♭5", "C♯5", "A♭5", "C♯5", "B♭5", "C♯5", "B♭5", "C♯5", "B♭5", "C♯5", "A♭5", "C♯5", "A♭5", "C♯5", "A♭5", "C♯5", "F♯5", "F5", "E♭5", "F5", "F♯5", "E♭5", "F5", "E♭5", "C♯5", "E♭5", "F5", "C♯5", "E♭5", "F5", "E♭5", "C♯5", "C5", "B♭4", "A♭4"];

const inv1 = (o: Partial<Material> = {}) => ex(INV, RH, 1, 2, { bpm: 48 }, "Invention 1, bars 1–2, both voices", { notes: UPPER_1_2, ...o });
const i2 = (voice: number, from: number, to: number, label: string, notes: string[], o: Partial<Material> = {}) => ex(I2, voice, from, to, { bpm: 52 }, label, { notes, ...o });

export const FUGUE_TRACK: ManualLesson[] = [
  {
    id: "F.1",
    part: "F",
    title: "WHO WAS BACH?",
    english: "WHO WAS BACH?",
    minutes: 2,
    sound: "harpsichord",
    aim: "Who I was, when I lived, and what kind of music I wrote.",
    learn: "Who Bach was, when he lived, and what Baroque music is.",
    music: "INVENTION 1",
    aids: [],
    stages: [
      st("listen", inv1(), "Listen first: my first Invention, on a harpsichord, as it might have sounded in my house."),
      st("quiz", inv1(), "A question.", {
        quiz: {
          ask: "When did I live?",
          answers: [
            { text: "ABOUT 100 YEARS AGO", why: "Earlier than that: I was born in 1685 and died in 1750." },
            { text: "ABOUT 300 YEARS AGO", right: true, why: "Yes: from 1685 to 1750, almost three hundred years ago." },
            { text: "ABOUT 600 YEARS AGO", why: "Not so long ago: I was born in 1685." },
          ],
        },
      }),
      st("quiz", inv1(), "One more.", {
        quiz: {
          ask: "Music from about 1600 to 1750, like mine, is called…",
          answers: [
            { text: "ROMANTIC", why: "No: Romantic music came later, in the 1800s." },
            { text: "MEDIEVAL", why: "No: medieval music is much older, before 1400 or so." },
            { text: "BAROQUE", right: true, why: "Yes, Baroque: a steady pulse, a busy bass line, and many little ornaments." },
          ],
        },
      }),
    ],
    lens: { counts: ["Both questions answered"], shown: [], never: ["How many tries"] },
    before: ["My name is Johann Sebastian Bach. I was born in Eisenach, in Germany.", "I was an organist, then a court musician, and for my last 27 years music director at St Thomas's church in Leipzig."],
    after: ["I wrote for church, for court and for teaching. My Inventions I wrote for my pupils: to play two voices cleanly, and to play singing."],
    again: [],
    sources: ["J. S. Bach, title page of the Inventions and Sinfonias (1723): to play cleanly in two parts, and to acquire a singing style."],
  },
  {
    id: "F.2",
    part: "F",
    title: "THE KEYBOARDS OF MY TIME",
    english: "THE KEYBOARDS OF MY TIME",
    minutes: 3,
    sound: "harpsichord",
    aim: "The harpsichord, the clavichord and the organ, and the piano, new in my old age.",
    learn: "The keyboards of Bach's time, by ear: harpsichord, organ, and the new piano.",
    music: "INVENTION 1, ON THREE INSTRUMENTS",
    aids: [],
    stages: [
      st("listen", inv1({ sound: "harpsichord" }), "First the harpsichord: each key plucks a string with a small quill."),
      st("listen", inv1({ sound: "organ" }), "Now the organ: pipes, blown by air. In church, I played the organ."),
      st("quiz", inv1(), "Did you hear the difference?", {
        quiz: {
          ask: "Which of the two plucks its strings?",
          answers: [
            { text: "THE ORGAN", why: "No: the organ has no strings, only pipes and air." },
            { text: "THE HARPSICHORD", right: true, why: "Yes: a quill plucks each string. Pressing harder does not make it louder." },
          ],
        },
      }),
      st("listen", inv1({ sound: "piano" }), "And the piano. In my time it was new and rare; I tried some late in my life. Today most people play my music on it."),
      st("quiz", inv1(), "My title pages say I wrote for the Clavier.", {
        quiz: {
          ask: "What does Clavier mean?",
          answers: [
            { text: "ONLY THE PIANO", why: "No: the word is older than the piano." },
            { text: "ANY KEYBOARD INSTRUMENT", right: true, why: "Yes: harpsichord, clavichord, organ. Which one I meant for each piece, players still discuss." },
            { text: "ONLY THE ORGAN", why: "No: the organ is one keyboard among several." },
          ],
        },
      }),
    ],
    lens: { counts: ["Both questions answered"], shown: [], never: ["How many tries"] },
    before: ["At home people played the harpsichord, or the clavichord, very soft: its strings are touched by small metal blades. In church: the organ."],
    after: ["In the game you can play my music on all of them, and on others I never heard."],
    again: [],
  },
  {
    id: "F.3",
    part: "F",
    title: "WHY WELL-TEMPERED?",
    english: "WHY WELL-TEMPERED?",
    minutes: 3,
    sound: "harpsichord",
    aim: "Why my book of preludes and fugues is called the Well-Tempered Clavier: hear two tunings, and choose.",
    learn: "What a tuning (a temperament) is, and why every key could be played on a well-tempered keyboard.",
    music: "PRELUDES 1 AND 3, BOOK I",
    aids: [],
    stages: [
      st("listen", ex(P1, 0, 1, 4, { pct: 80 }, "Prelude 1 in C major, bars 1–4, in quarter-comma meantone", { notes: P1_1_4, tuning: "meantone" }), "First, C major, on a tuning many keyboards had when I was young. Hear how sweet it is."),
      st("listen", ex(P3, 0, 1, 8, { pct: 80 }, "Prelude 3 in C♯ major, bars 1–8, in quarter-comma meantone", { notes: P3_1_8, tuning: "meantone" }), "Now C sharp major, on the same tuning."),
      st("quiz", ex(P3, 0, 1, 8, { pct: 80 }, "Prelude 3 in C♯ major, bars 1–8", { notes: P3_1_8 }), "Which one sounded wrong?", {
        quiz: {
          ask: "Which one sounded out of tune?",
          answers: [
            { text: "THE SECOND, IN C SHARP MAJOR", right: true, why: "Yes. On that tuning the far keys are sour, and some chords howl: players called that the wolf." },
            { text: "THE FIRST, IN C MAJOR", why: "Listen again: C major was sweet on that tuning; C sharp major was the sour one." },
          ],
        },
      }),
      st("listen", ex(P3, 0, 1, 8, { pct: 80 }, "Prelude 3 in C♯ major, bars 1–8, well-tempered (Werckmeister III)", { notes: P3_1_8, tuning: "werckmeister" }), "Now the same C sharp major, well-tempered: tuned so that every key can be played. Here in Werckmeister's tuning of 1691, one of several of my time."),
      st("quiz", ex(P3, 0, 1, 8, { pct: 80 }, "Prelude 3 in C♯ major, bars 1–8", { notes: P3_1_8 }), "So:", {
        quiz: {
          ask: "Why is my book called the Well-Tempered Clavier?",
          answers: [
            { text: "BECAUSE THE MUSIC IS CALM", why: "No: here tempered means tuned, not calm." },
            { text: "BECAUSE IT USES ALL 24 KEYS", right: true, why: "Yes: a prelude and a fugue in every major and minor key, which only a well-tempered keyboard can play. Which tuning I used exactly, nobody knows for sure: musicians still argue about it." },
          ],
        },
      }),
    ],
    lens: { counts: ["Both questions answered"], shown: [], never: ["How many tries"] },
    before: ["A keyboard is tuned before you play, and no tuning can make every key perfectly in tune. A tuning is a choice: it is called a temperament."],
    after: ["Twenty-four keys, each with its own colour. My first book of them is dated 1722; a second followed about twenty years later."],
    again: [],
    sources: ["J. S. Bach, title page of the Well-Tempered Clavier, Book I (1722): preludes and fugues through all the tones and semitones.", "A. Werckmeister, Musicalische Temperatur (1691)."],
  },
  {
    id: "F.4",
    part: "F",
    title: "WHAT IS A FUGUE?",
    english: "WHAT IS A FUGUE?",
    minutes: 4,
    sound: "harpsichord",
    aim: "A fugue's beginning: the subject alone, the answer, the countersubject; then find each entry by ear.",
    learn: "Subject, answer, countersubject: how a fugue begins, heard and spotted.",
    music: "FUGUE 2 IN C MINOR, BOOK I",
    aids: [],
    stages: [
      st("listen", i2(1, 1, 2, "Fugue I/2 in C minor, alto alone, bars 1–2: the subject", I2_SUBJECT, { solo: true }), "A fugue begins with one voice alone, playing its tune: the subject. Here is the subject of my fugue in C minor."),
      st("watch", i2(1, 1, 8, "Fugue I/2 in C minor, bars 1–8: subject, answer, and the bass's entry", I2_ALTO_1_8, { flags: true }), "Then a second voice enters with the same tune, higher: the answer. The first voice goes on against it with a new line: the countersubject. Watch the flags.", { aids: ["point"] }),
      st("quiz", i2(1, 1, 8, "Fugue I/2 in C minor, bars 1–8", I2_ALTO_1_8), "Now:", {
        quiz: {
          ask: "What is the answer?",
          answers: [
            { text: "A NEW TUNE", why: "No: the new line against it is the countersubject. The answer is the subject itself." },
            { text: "THE SUBJECT AGAIN, IN ANOTHER VOICE, ON ANOTHER NOTE", right: true, why: "Yes: the same tune, in a new voice, starting higher (or lower)." },
            { text: "THE LAST NOTE", why: "No: the answer comes near the beginning, as the second voice enters." },
          ],
        },
      }),
      st("spot", i2(1, 1, 9, "Fugue I/2 in C minor, bars 1–9, no flags", I2_ALTO_1_9), "Now without flags. Tap a strip each time the subject comes in: three times, the last deep in the bass.", { spot: { need: 3, strays: 2 } }),
    ],
    lens: { counts: ["Entries found: 3 of 3", "Stray taps: 2 at most"], shown: [], never: ["Which strip you tap"] },
    before: ["Fugue comes from the Latin word for flight: the voices seem to chase one another."],
    after: ["Subject, answer, countersubject: the beginning of a fugue. Musicians call it the exposition."],
    again: ["Tap as the subject begins: a quick turn around one note, then a jump down."],
  },
  {
    id: "F.5",
    part: "F",
    title: "EPISODES AND STRETTO",
    english: "EPISODES AND STRETTO",
    minutes: 3,
    sound: "harpsichord",
    aim: "Between entries, the episodes; near the end, sometimes, the entries crowding in: a stretto.",
    learn: "Episodes, where the subject rests, and stretto, where the entries crowd in.",
    music: "FUGUES 2 AND 1, BOOK I",
    aids: [],
    stages: [
      st("watch", i2(2, 5, 8, "Fugue I/2 in C minor, bars 5–8: an episode, then the subject in the bass", I2_BASS_5_8, { flags: true }), "Between entries the music wanders, made from pieces of the subject: an episode. Then, in bar 7, the subject returns in the bass.", { aids: ["point"] }),
      st("spot", i2(2, 5, 8, "Fugue I/2 in C minor, bars 5–8, no flags", I2_BASS_5_8), "Again without flags. Wait through the episode, and tap once, when the subject comes back.", { spot: { need: 1, strays: 1 } }),
      st("watch", ex(I1, 1, 14, 17, { bpm: 50 }, "Fugue I/1 in C major, bars 14–17: the entries crowding in", { notes: I1_ALTO_14_17, flags: true }), "In a stretto the entries crowd in: a new voice starts the subject before the last one has finished. Watch the flags pile up.", { aids: ["point"] }),
      st("quiz", ex(I1, 1, 14, 17, { bpm: 50 }, "Fugue I/1 in C major, bars 14–17", { notes: I1_ALTO_14_17 }), "So:", {
        quiz: {
          ask: "What happens in a stretto?",
          answers: [
            { text: "ONLY ONE VOICE PLAYS", why: "No: in a stretto several voices play the subject, overlapping." },
            { text: "THE VOICES START THE SUBJECT BEFORE THE LAST ONE HAS FINISHED", right: true, why: "Yes: the entries overlap, like voices interrupting one another." },
            { text: "THE MUSIC STOPS", why: "No: it grows busier, not quieter." },
          ],
        },
      }),
    ],
    lens: { counts: ["The entry found", "Stray taps: 1 at most"], shown: [], never: ["Which strip you tap"] },
    before: ["A fugue is not only entries. Between them come episodes; and sometimes the entries crowd together."],
    after: ["Entries, episodes, stretto: now you can follow a fugue from start to end."],
    again: ["Wait through the episode; tap only when the subject comes back."],
  },
  {
    id: "F.6",
    part: "F",
    title: "PLAY A SUBJECT",
    english: "PLAY A SUBJECT",
    minutes: 3,
    sound: "harpsichord",
    aim: "Play the subject of my fugue in C minor yourself.",
    learn: "To play a fugue's subject: the tune every voice will take up.",
    music: "FUGUE 2 IN C MINOR, BARS 1–2",
    aids: ["thumbs"],
    stages: [
      st("watch", i2(1, 1, 2, "Fugue I/2 in C minor, alto alone, bars 1–2: the subject", I2_SUBJECT, { solo: true, widen: 2, tempo: { bpm: 40 } }), "Watch: a quick turn around C, a jump down, and the turn again.", { aids: ["thumbs", "point"] }),
      st("try", i2(1, 1, 2, "Fugue I/2 in C minor, alto alone, bars 1–2: the subject", I2_SUBJECT, { solo: true, widen: 2, wait: true, tempo: { bpm: 40 } }), "Your turn. Each note waits for you.", { aids: ["thumbs", "trace"] }),
      st("play", i2(1, 1, 2, "Fugue I/2 in C minor, alto alone, bars 1–2: the subject", I2_SUBJECT, { solo: true, widen: 2, tempo: { bpm: 40 } }), "In time, slowly. Every voice of the fugue will play this tune after you."),
    ],
    lens: { counts: ["Notes: 70%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x) => [notesRight(x, 0.7)],
    before: ["You have heard it; now play it."],
    after: ["That is the subject every voice of this fugue takes up. In the game, it is yours to play among them."],
    again: ["A quick turn, a jump down, the turn again. Again."],
  },
  {
    id: "F.7",
    part: "F",
    title: "HOW TO LISTEN TO A FUGUE",
    english: "HOW TO LISTEN TO A FUGUE",
    minutes: 3,
    sound: "harpsichord",
    aim: "Learn the subject by heart, then count the voices as they come in, high, middle, low.",
    learn: "How to follow a fugue: the subject by heart, then every voice that takes it up.",
    music: "FUGUE 1 IN C MAJOR, BARS 1–5",
    aids: [],
    stages: [
      st("watch", ex(I1, 1, 1, 5, { bpm: 50 }, "Fugue I/1 in C major, bars 1–5: four voices enter", { notes: I1_ALTO_1_5, flags: true }), "My first fugue has four voices. Follow the flags: one voice, then another, until all four are playing.", { aids: ["point"] }),
      st("quiz", ex(I1, 1, 1, 5, { bpm: 50 }, "Fugue I/1 in C major, bars 1–5", { notes: I1_ALTO_1_5 }), "Before you try alone:", {
        quiz: {
          ask: "What is the best way to follow a fugue?",
          answers: [
            { text: "LISTEN ONLY TO THE TOP VOICE", why: "No: the subject goes everywhere, often in the middle or the bass." },
            { text: "KNOW THE SUBJECT BY HEART, THEN LISTEN FOR IT IN EVERY VOICE", right: true, why: "Yes. And listen hardest for the bass: it is the easiest entry to miss." },
          ],
        },
      }),
      st("spot", ex(I1, 1, 1, 5, { bpm: 50 }, "Fugue I/1 in C major, bars 1–5, no flags", { notes: I1_ALTO_1_5 }), "Now alone, without flags: tap each time the subject comes in.", { spot: { need: 3, strays: 2 } }),
    ],
    lens: { counts: ["Entries found: 3 of 4", "Stray taps: 2 at most"], shown: [], never: ["Which strip you tap"] },
    before: ["How to listen to a fugue: first learn the subject by heart. Then count the voices as they come in."],
    after: ["The pianist Glenn Gould once wrote a funny piece called So You Want to Write a Fugue? You only want to play one: that is easier."],
    again: ["Hum the subject first; then tap each time a voice takes it up."],
    checkpoint: true,
  },
];
