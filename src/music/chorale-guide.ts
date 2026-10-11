/**
 * P17: the listening guide to Bach's chorales (the owner: "describing special moments in the piece,
 * unexpected moments, whatever a specialist lover of that kind of music would point out to someone
 * listening to the piece for the first time").
 *
 * These are the moments read off the notes, for every chorale: the major chord that ends a minor
 * chorale, a cadence that swerves (deceptive) or hangs on a half step (Phrygian), a line that comes
 * to rest in a far key, a chromatic line, a diminished seventh, a Neapolitan chord, a false relation,
 * a chain of suspensions, a pedal, a chord borrowed from the minor, the melody's summit. Each is a
 * fact about the notes; the guide's sentences (src/content/en.json, "guide") say what to listen for
 * and claim nothing about Bach's intentions. Notes written by hand for some chorales, each resting on
 * a published commentary, are to join them.
 */
import { parsePitch } from "./pitch.ts";

/** A chorale as the study holds it (src/chorale/study-data.ts): times in 32nds of a whole note. */
export interface GuideChorale {
  tonic: string;
  mode: string;
  voices: [number, number, string, 1?][][];
  harmony: [number, string, string, string, [number, number][]?][];
  cadences: [number, string, string][];
}

export type GuideKind =
  | "picardy"
  | "deceptive"
  | "phrygian"
  | "farKey"
  | "relativeMajor"
  | "chromatic"
  | "diminished"
  | "neapolitan"
  | "falseRelation"
  | "suspensions"
  | "pedal"
  | "borrowed"
  | "summit";

export interface GuideNote {
  /** Where the moment begins (32nds of a whole note from the chorale's start). */
  at: number;
  kind: GuideKind;
  /** The words for the sentence: voice names, pitches, chords. */
  vars: Record<string, string>;
}

const VOICES = ["soprano", "alto", "tenor", "bass"];
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = (name: string) => {
  const m = /^([A-G])(#{1,2}|b{1,2})?/.exec(name);
  if (!m) return 0;
  const alter = m[2] ? (m[2][0] === "#" ? m[2].length : -m[2].length) : 0;
  return (((PC[m[1]] + alter) % 12) + 12) % 12;
};
/** The pitch name without its octave, as a reader names it ("F#", "Bb"); flats and sharps as signs. */
const nameOf = (pitch: string) => pitch.replace(/-?\d+$/, "").replace(/#/g, "♯").replace(/b/g, "♭");
const minorish = (mode: string) => mode === "minor" || mode === "dorian" || mode === "phrygian";

/**
 * The chords on which Bach's phrases commonly close, by their root above the tonic (semitones) and
 * whether they are minor: each at least 2% of the phrase ends in its mode in the 370 chorales. A
 * phrase closing on any other chord closes where he seldom does.
 */
const COMMON_MAJOR = new Set(["0", "2m", "4", "5", "7", "9", "9m"]);
const COMMON_MINOR = new Set(["0", "0m", "3", "5", "5m", "7", "7m", "8", "10"]);
const chordName = (root: string, quality: string) => `${nameOf(root)}${quality === "m" ? " minor" : quality === "o" || quality === "ø7" ? " diminished" : " major"}`;
/** At most this many moments a chorale, the most telling first, so that the guide is not a catalogue. */
export const MOST = 8;
/** The order in which moments are kept when there are too many. */
const PRIORITY: GuideKind[] = ["picardy", "neapolitan", "deceptive", "farKey", "chromatic", "falseRelation", "diminished", "phrygian", "suspensions", "borrowed", "pedal", "relativeMajor", "summit"];

/** What sounds in each voice at a time: [pitch, onset] of the note sounding then, or null. */
function sounding(c: GuideChorale, v: number, t: number): [string, number] | null {
  for (const [at, len, p] of c.voices[v]) if (at <= t && t < at + len) return [p, at];
  return null;
}

export function guideNotes(c: GuideChorale): GuideNote[] {
  const out: GuideNote[] = [];
  const tonicPc = pcOf(c.tonic);
  const minor = minorish(c.mode);
  const last = c.harmony[c.harmony.length - 1];

  // The last chord major in a chorale in the minor (a "Picardy third").
  if (minor && last) {
    const at = last[0];
    const pcs = c.voices.map((_, v) => sounding(c, v, at)).filter((x): x is [string, number] => x !== null).map(([p]) => pcOf(p));
    if (pcs.includes((tonicPc + 4) % 12) && pcs.includes(tonicPc)) out.push({ at, kind: "picardy", vars: { tonic: nameOf(c.tonic) } });
  }

  // The cadences: deceptive, Phrygian, on a far degree; the first turn to the relative major.
  let relative = false;
  for (const [at, cls] of c.cadences) {
    const h = [...c.harmony].reverse().find((x) => x[0] <= at);
    if (!h) continue;
    const chord = chordName(h[1], h[2]);
    const where = `${(pcOf(h[1]) - tonicPc + 12) % 12}${h[2] === "m" ? "m" : ""}`;
    if (cls === "deceptive") out.push({ at, kind: "deceptive", vars: { chord } });
    else if (cls === "Phrygian half") out.push({ at, kind: "phrygian", vars: {} });
    else if (!(minor ? COMMON_MINOR : COMMON_MAJOR).has(where)) out.push({ at, kind: "farKey", vars: { chord, tonic: nameOf(c.tonic) } });
    else if (minor && where === "3" && !relative && !cls.startsWith("half")) {
      relative = true;
      out.push({ at, kind: "relativeMajor", vars: { chord } });
    }
  }

  // Chromatic lines: four or more notes in one direction, each a semitone from the last.
  c.voices.forEach((notes, v) => {
    let run = 1;
    for (let i = 1; i <= notes.length; i++) {
      const step = i < notes.length ? parsePitch(notes[i][2]).midi - parsePitch(notes[i - 1][2]).midi : 0;
      const prev = i > 1 ? parsePitch(notes[i - 1][2]).midi - parsePitch(notes[i - 2][2]).midi : 0;
      if (Math.abs(step) === 1 && (run === 1 || step === prev)) run++;
      else {
        if (run >= 4) {
          const first = notes[i - run];
          out.push({ at: first[0], kind: "chromatic", vars: { voice: VOICES[v], from: nameOf(first[2]), to: nameOf(notes[i - 1][2]), way: prev < 0 ? "down" : "up" } });
        }
        run = Math.abs(step) === 1 ? 2 : 1;
      }
    }
  });

  // Chords: the diminished seventh (the first), the Neapolitan, a chord borrowed from the minor.
  let dim = 0;
  let borrowed = false;
  for (const [at, root, quality, figure] of c.harmony) {
    const pcs = [...new Set(c.voices.map((_, v) => sounding(c, v, at)).filter((x): x is [string, number] => x !== null).map(([p]) => pcOf(p)))].sort((a, b) => a - b);
    const isDim7 = pcs.length === 4 && pcs.every((p, i) => (pcs[(i + 1) % 4] - p + 12) % 12 === 3);
    if (isDim7 && dim < 1) {
      dim++;
      out.push({ at, kind: "diminished", vars: {} });
    }
    const rootPc = pcOf(root);
    if (minor && rootPc === (tonicPc + 1) % 12 && quality === "" && figure.startsWith("6")) out.push({ at, kind: "neapolitan", vars: { chord: nameOf(root) } });
    if (!minor && !borrowed && ((rootPc === (tonicPc + 5) % 12 && quality === "m") || (rootPc === (tonicPc + 8) % 12 && quality === ""))) {
      borrowed = true;
      out.push({ at, kind: "borrowed", vars: { chord: chordName(root, quality), tonic: nameOf(c.tonic) } });
    }
  }

  // A false relation: a note in one voice, its chromatic other in another voice at the next chord.
  const onsets = [...new Set(c.voices.flatMap((n) => n.map((x) => x[0])))].sort((a, b) => a - b);
  let falseRel = 0;
  for (let i = 1; i < onsets.length && falseRel < 1; i++) {
    const before = c.voices.map((_, v) => sounding(c, v, onsets[i - 1]));
    const now = c.voices.map((_, v) => sounding(c, v, onsets[i]));
    for (let a = 0; a < 4 && falseRel < 1; a++)
      for (let b = 0; b < 4 && falseRel < 1; b++) {
        const x = before[a];
        const y = now[b];
        if (a === b || !x || !y || y[1] !== onsets[i]) continue;
        const px = parsePitch(x[0]);
        const py = parsePitch(y[0]);
        // The voice that sang the first note does not itself move to the altered one.
        const own = now[a] ? parsePitch(now[a]![0]) : null;
        // Nor does the second voice reach its note by a chromatic step of its own (that is a line, not a clash).
        const was = before[b] ? parsePitch(before[b]![0]) : null;
        if (px.step === py.step && px.alter !== py.alter && !(own && own.step === py.step) && !(was && was.step === py.step)) {
          falseRel++;
          out.push({ at: onsets[i - 1], kind: "falseRelation", vars: { first: nameOf(x[0]), firstVoice: VOICES[a], second: nameOf(y[0]), secondVoice: VOICES[b] } });
        }
      }
  }

  // A chain of suspensions: three or more within the span of two whole-note bars' worth (64).
  const SUSPENSION = 2;
  const sus = c.harmony.filter((h) => (h[4] ?? []).some(([, k]) => k === SUSPENSION)).map((h) => h[0]);
  for (let i = 0; i + 2 < sus.length; i++)
    if (sus[i + 2] - sus[i] <= 32) {
      out.push({ at: sus[i], kind: "suspensions", vars: {} });
      break;
    }

  // A pedal: the bass on one pitch (held or struck again) under three or more chords.
  const bass = c.voices[3];
  for (let i = 0; i < bass.length; i++) {
    let j = i;
    while (j + 1 < bass.length && bass[j + 1][2] === bass[i][2] && bass[j + 1][0] === bass[j][0] + bass[j][1]) j++;
    const from = bass[i][0];
    const to = bass[j][0] + bass[j][1];
    const chords = new Set(c.harmony.filter((h) => h[0] >= from && h[0] < to).map((h) => `${h[1]}${h[2]}`));
    if (to - from >= 24 && chords.size >= 3) {
      out.push({ at: from, kind: "pedal", vars: { note: nameOf(bass[i][2]) } });
      break;
    }
    i = j;
  }

  // The melody's summit, when it is reached once.
  const sop = c.voices[0];
  const top = Math.max(...sop.map((n) => parsePitch(n[2]).midi));
  const tops = sop.filter((n) => parsePitch(n[2]).midi === top);
  if (tops.length === 1) out.push({ at: tops[0][0], kind: "summit", vars: { note: nameOf(tops[0][2]) } });

  // The most telling, at most MOST, in the order they are heard.
  const kept = [...out].sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind) || a.at - b.at).slice(0, MOST);
  return kept.sort((a, b) => a.at - b.at);
}
