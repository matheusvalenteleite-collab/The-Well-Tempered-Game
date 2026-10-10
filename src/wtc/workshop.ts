/**
 * The workshop: a subject changed by the player (notes moved by step, intervals inverted), carried
 * through a fugue's plan as Bach laid it out: every entry at its time, in its voice and key. Each
 * note of each entry is moved from Bach's own note by as many scale steps as the player moved the
 * subject's note, in the entry's key, so that what Bach's answer mutated stays mutated and an entry
 * in the relative minor stays in it. Two results: the entries alone (the plan's skeleton), and the
 * whole fugue with the player's subject in place of Bach's wherever it enters.
 */
import { parsePitch } from "../music/pitch.ts";
import type { WtcNote, WtcPiece } from "./corpus.ts";
import { line, type Entry, type Note } from "./fugue.ts";
import { entryKey } from "./keyplan.ts";

const LETTERS = "CDEFGAB";
const NATURAL = [0, 2, 4, 5, 7, 9, 11];

interface Scale {
  /** The tonic's letter, 0 = C ... 6 = B. */
  letter: number;
  /** Pitch classes of the seven degrees, from the tonic. */
  pcs: number[];
}

/** A key's scale: major, or minor with the raised seventh (as Bach's minor runs at cadences and in subjects). */
export function scaleOf(name: string, major: boolean): Scale {
  const p = parsePitch(`${name[0].toUpperCase()}${name.slice(1)}4`);
  const tonic = ((p.midi % 12) + 12) % 12;
  const steps = major ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 11];
  return { letter: LETTERS.indexOf(p.step), pcs: steps.map((s) => (tonic + s) % 12) };
}

/** Move a pitch by `steps` letters, its accidental the scale's for the letter it lands on. */
export function moveInScale(pitch: string, steps: number, scale: Scale): string {
  if (!steps) return pitch;
  const p = parsePitch(pitch);
  const d = LETTERS.indexOf(p.step) + steps;
  const li = ((d % 7) + 7) % 7;
  const octave = p.octave + Math.floor(d / 7);
  const target = scale.pcs[(li - scale.letter + 7) % 7];
  const alter = ((target - NATURAL[li] + 18) % 12) - 6;
  return `${LETTERS[li]}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${octave}`;
}

/** The player's subject as steps from Bach's: for each note, how many letters it was moved. */
export const deltas = (subject: Note[], edited: Note[]) => subject.map((n, i) => parsePitch(edited[i].pitch).diatonic - parsePitch(n.pitch).diatonic);

/** Invert a subject: every interval turned the other way, about its first note, in the home key. */
export function invert(subject: Note[], key: string, mode: "major" | "minor"): Note[] {
  const scale = scaleOf(key, mode === "major");
  const d0 = parsePitch(subject[0].pitch).diatonic;
  return subject.map((n) => ({ ...n, pitch: moveInScale(n.pitch, 2 * (d0 - parsePitch(n.pitch).diatonic), scale) }));
}

export interface Workshop {
  /** The entries alone, the player's subject in each. */
  skeleton: WtcPiece;
  /** Bach's fugue with the player's subject in place of his wherever it enters. */
  whole: WtcPiece;
}

export function throughThePlan(p: WtcPiece, subject: Note[], entries: Entry[], edited: Note[]): Workshop {
  const d = deltas(subject, edited);
  const ioi = subject.slice(1).map((n, i) => n.on - subject[i].on);
  const replace = new Map<string, string>(); // "voice:on:pitch" -> new pitch (a voice may strike two notes at once)
  const skeleton: WtcNote[][] = p.voices.map(() => []);
  for (const e of entries) {
    const k = entryKey(p, e, subject);
    const scale = scaleOf(k.name, k.name[0] === k.name[0].toUpperCase());
    const l = line(p.voices[e.voice]);
    // The entry's notes: as long as the voice follows the subject's rhythm (an entry found by its
    // head usually carries the rest of the subject too).
    for (let i = 0; i < subject.length && e.at + i < l.length; i++) {
      if (i > 0 && l[e.at + i].on - l[e.at + i - 1].on !== ioi[i - 1]) break;
      const n = l[e.at + i];
      const pitch = moveInScale(n.pitch, e.form === "inversion" ? -d[i] : d[i], scale);
      replace.set(`${e.voice}:${n.on}:${n.pitch}`, pitch);
      skeleton[e.voice].push([n.on, n.dur, pitch, 0]);
    }
  }
  const whole = p.voices.map((v, voice) => v.map(([on, dur, pitch, sub]) => [on, dur, sub === 0 ? (replace.get(`${voice}:${on}:${pitch}`) ?? pitch) : pitch, sub] as WtcNote));
  return { skeleton: { ...p, voices: skeleton }, whole: { ...p, voices: whole } };
}
