/**
 * The ornaments played in the game (D205): the encodings' signs (data/wtc/ornaments.json: voice,
 * onset, pitch, kern signs, grace notes; 148 in the fugues) realised as the WTC study plays them
 * (src/music/ornaments.ts: Bach's Explication by default; P8, P23), at the tempo being played: the
 * other voices' trills and mordents sound as written. D278: on a phone (LADDER, the road) the player
 * plays the ornament: the main note struck, the thumb shaken on it (proto-game.ts, ornamentShake); on a
 * computer's keys the ornamented note, once struck, plays its ornament and holds its main note.
 */
import ornamentsData from "../../data/wtc/ornaments.json" with { type: "json" };
import { keySteps, mordentUnit, ornamentUnit, realise, trillUnit } from "../music/ornaments.ts";
import { MECH } from "../bench/mechanics.ts";
import { parsePitch } from "../music/pitch.ts";
import { beatOf, type TouchFugue, type TouchNote } from "./fugue.ts";
import type { FreeKind } from "./free-ornament.ts";

type Row = [number, number, string, string, string[]?];
const ROWS = ornamentsData as unknown as Record<string, Row[]>;

export interface Ornament {
  signs: string;
  graces: { kind: "q" | "Q"; midi: number }[];
  /** D367: the edition's own notes for it, written out ([onset, length, MIDI] in ticks): sounded as written (realiseNote) where the game plays it; the player's shake still realised by D353's rules. */
  written?: [number, number, number][];
}

const SHARPS = "FCGDAEB";
const MAJOR: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
const MINOR: Record<string, number> = { A: 0, E: 1, B: 2, "F#": 3, "C#": 4, "G#": 5, "D#": 6, "A#": 7, D: -1, G: -2, C: -3, F: -4, Bb: -5, Eb: -6, Ab: -7 };

/** The piece's key signature ("c": C minor, "Eb": E flat major), as alterations by letter. */
function signature(key: string): Record<string, number> {
  const minor = key[0] === key[0].toLowerCase();
  const name = key[0].toUpperCase() + key.slice(1);
  const n = (minor ? MINOR : MAJOR)[name] ?? 0;
  const sig: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  for (let i = 0; i < Math.abs(n); i++) sig[n > 0 ? SHARPS[i] : SHARPS[6 - i]] = n > 0 ? 1 : -1;
  return sig;
}

/**
 * D277: ornaments of the subject the books name and the encoding lacks on its first entry, by the note's
 * place in the subject (our first entry's index) and kern sign: I/12 the trill on the next-to-last note,
 * G (Bodky; half step above in F minor); I/14 the trill on the next-to-last note, G sharp, "always"
 * (Bodky; Riemann marks it); II/12 the mordent on the first F, E natural below (Keller: in several
 * manuscripts; Bodky advises it; Riemann marks an ornament there).
 */
export const SUBJECT_ORNAMENTS: Record<string, { at: number; signs: string }[]> = {
  wtc1f12: [{ at: 9, signs: "t" }],
  wtc1f14: [{ at: 16, signs: "t" }],
  wtc2f12: [{ at: 1, signs: "m" }],
};

/**
 * The encodings' names for pieces the game knows by another id: the tutorial's invention (D278), and
 * D353: MORE BACH's Inventions and Sinfonias (bwv772–786, bwv787–801), whose 310 signs ornaments.json
 * keeps as inven01–15 and sinfo01–15 (looked up as bwv772…, they played with none).
 */
export const ORNAMENT_ALIAS: Record<string, string> = { inv01: "inven01" };
for (let k = 0; k < 15; k++) {
  ORNAMENT_ALIAS[`bwv${772 + k}`] = `inven${String(k + 1).padStart(2, "0")}`;
  ORNAMENT_ALIAS[`bwv${787 + k}`] = `sinfo${String(k + 1).padStart(2, "0")}`;
}
const ALIAS = ORNAMENT_ALIAS;
const cache = new Map<string, Map<string, Ornament>>();
/**
 * A piece's ornaments by "voice:onset". D277: a fugue's subject keeps its ornaments in every entry (the
 * owner: "trills on subjects ... absent"; the books: Bodky, I/14 "always", I/23 "goes on every entry";
 * Keller, I/23 and I/24 kept "throughout"): an ornament written on a note of the subject's first entry,
 * or on the same note of two entries or more, or named by the books (SUBJECT_ORNAMENTS), is carried to
 * that note of every entry of the subject (inverted and transposed entries alike; not the augmented or
 * diminished, nor a later subject), where the note is there, a quaver or longer, and has none of its own.
 */
export function ornamentsOf(f: TouchFugue): Map<string, Ornament> {
  let m = cache.get(f.id);
  if (!m) {
    m = new Map();
    // D278: the tutorial's invention under its corpus name.
    for (const [v, on, , signs, graces] of ROWS[f.id] ?? ROWS[ALIAS[f.id] ?? ""] ?? [])
      m.set(`${v}:${on}`, { signs, graces: (graces ?? []).map((g) => ({ kind: g[0] as "q" | "Q", midi: parsePitch(g.slice(1)).midi })) });
    // D367: the piece's own (the harpsichord concertos' written-out trills, their notes as the edition writes them).
    for (const [v, on, signs, written] of f.ornaments ?? []) m.set(`${v}:${on}`, { signs, graces: [], ...(written ? { written } : {}) });
    if (f.kind === "fugue") carrySubjectOrnaments(f, m);
    cache.set(f.id, m);
  }
  return m;
}

/** D277: the subject's ornaments into every entry (see ornamentsOf). */
function carrySubjectOrnaments(f: TouchFugue, m: Map<string, Ornament>) {
  const entries = f.entries.filter((e) => !e.theme && !e.scale).sort((a, b) => a.on - b.on || a.voice - b.voice);
  if (!entries.length) return;
  const at = (e: (typeof entries)[number], j: number) => (e.notes[j] ? `${e.voice}:${e.notes[j][0]}` : null);
  const carried = new Map<number, string>();
  for (const { at: j, signs } of SUBJECT_ORNAMENTS[f.id] ?? []) carried.set(j, signs);
  const count = new Map<number, { n: number; signs: string }>();
  entries.forEach((e, k) =>
    e.notes.forEach((_, j) => {
      const o = m.get(at(e, j) ?? "");
      if (!o || !o.signs) return;
      if (k === 0 && !carried.has(j)) carried.set(j, o.signs);
      const c = count.get(j) ?? { n: 0, signs: o.signs };
      count.set(j, { n: c.n + 1, signs: c.signs });
    }),
  );
  for (const [j, c] of count) if (c.n >= 2 && !carried.has(j)) carried.set(j, c.signs);
  for (const e of entries)
    for (const [j, signs] of carried) {
      const key = at(e, j);
      const n = e.notes[j];
      if (!key || !n || m.has(key) || n[1] < f.tpq / 2) continue;
      m.set(key, { signs, graces: [] });
    }
}

/** The sign drawn over an ornamented note: "TR" a trill, "~" the short wavy sign, "~|" a mordent, "S" a turn. */
export function ornamentMark(o: Ornament): string {
  const s = o.signs;
  if (/[TtO]/.test(s)) return "TR";
  if (/[Mm]/.test(s)) return "~|";
  if (/[Ww]/.test(s)) return "~";
  if (/[S$]/.test(s)) return "S";
  return o.graces.length ? "·" : "";
}

/**
 * A note as it sounds with its ornament: [onset, length, MIDI] in ticks, at the tempo (quarter notes
 * a minute); the last part is the main note, held to the note's end.
 */
export function realiseNote(f: TouchFugue, o: Ornament, on: number, dur: number, midi: number, prevMidi: number | undefined, bpm: number): [number, number, number][] {
  // D367: written out in the edition: its own notes (within the note's span; the last held to its end).
  if (o.written?.length) {
    const end = on + dur;
    const w = o.written.filter((p) => p[0] < end).map((p) => [p[0], Math.min(p[1], end - p[0]), p[2]] as [number, number, number]);
    if (w.length) w[w.length - 1][1] = Math.max(1, end - w[w.length - 1][0]);
    return w.length ? w : [[on, dur, midi]];
  }
  const q = f.tpq;
  const steps = contextSteps(f, on, midi, o.signs);
  const nachschlag = /[TtO]/.test(o.signs) && !o.signs.includes("R") && nachschlagAt(f, on, midi, dur, bpm);
  const parts = realise({ midi, at: on / q, dur: dur / q }, o.signs, o.graces, { unit: ornamentUnit(bpm / 2), quick: mordentUnit(60 / bpm), trillUnit: trillUnit(60 / bpm, MECH.trillPerSecond), settle: MECH.trillSettle, prevMidi, ...steps, diatonic: true, nachschlag });
  return parts.map((p) => [Math.round(p.at * q), Math.max(1, Math.round(p.dur * q)), p.midi]);
}

/**
 * D319: a note of the band's as it sounds with its ornament, its articulation holding it for `hold` of
 * its length (D302's phrasing: a detached note stops early). A trill is realised over the note's whole
 * written length (it lasts the note: shortened first, the grid lost notes and the alternation ended
 * early: II/24's dotted quavers, held 0.87, trilled 3 notes of 6), the gap taken from its settling main
 * note (at most half of it); any other ornament over the held length, as before.
 */
export function realiseHeld(f: TouchFugue, o: Ornament, on: number, dur: number, hold: number, midi: number, prevMidi: number | undefined, bpm: number): [number, number, number][] {
  if (!/[TtO]/.test(o.signs) || hold >= 1) return realiseNote(f, o, on, dur * hold, midi, prevMidi, bpm);
  const parts = realiseNote(f, o, on, dur, midi, prevMidi, bpm);
  const last = parts[parts.length - 1];
  last[1] = Math.max(Math.round(last[1] / 2), Math.round(last[1] - dur * (1 - hold)));
  return parts;
}

/**
 * D278: how an ornament is played on a phone: the thumb shaken on the struck note, its first move up
 * (an upper note: the trill, the short trill, the turn) or down (the mordent), so many moves to finish
 * it; null for grace notes alone (they play themselves). D353: read by the contour reader, either way
 * first (D289), the sign deciding what sounds: `first` is only the way the guide thumb shows; `need`, the
 * legs that make it done (a trill four, the others a two-leg contour: the turn too, since its notes are
 * realised, not one a move).
 */
export interface Shake {
  kind: "trill" | "short" | "mordent" | "turn";
  word: string;
  first: 1 | -1;
  need: number;
}
export function shakeOf(o: Ornament): Shake | null {
  const s = o.signs;
  if (/[TtO]/.test(s)) return { kind: "trill", word: "TRILL", first: 1, need: 4 };
  if (/[Mm]/.test(s)) return { kind: "mordent", word: "MORDENT", first: -1, need: 2 };
  if (/[Ww]/.test(s)) return { kind: "short", word: "TRILL", first: 1, need: 2 };
  if (/[S$]/.test(s)) return { kind: "turn", word: "TURN", first: 1, need: 2 };
  return null;
}

/**
 * D314, a FREE ORNAMENT (free-ornament.ts), D353 named by the gesture and the music: the held note's
 * mordent ("M": the step below, then the note), Pralltriller (N U N at twice the ornament speed, no
 * faster than the beat's 32nds: I.2.3 §32's "extraordinary speed"), Schneller (N U N at the ornament
 * speed, I.2.8), short trill ("W": from the note above, Bach's short Trillo), turn ("S": U N L N) or trill
 * ("T": from the note above, alternating, the note held at the end, or closing with the Nachschlag:
 * `nachschlag`), from tick `from` to `until` (the note's written end), realised as the written ones are
 * (Bach's Explication, at the tempo, the neighbours as the bar reads them). The main note already sounds,
 * so a realisation that opens on it starts at its next note. [onset, length, MIDI] in ticks; empty when
 * too little of the note is left. D319: `written`, a written ornament's signs (a trill's closing turn R
 * kept), the player's ornament realised from the shake; `prevMidi`, the note before (a written W's
 * snapped form).
 */
export function freeOrnamentParts(f: TouchFugue, kind: FreeKind, noteOn: number, midi: number, from: number, until: number, bpm: number, written?: string, opts: { prevMidi?: number; nachschlag?: boolean } = {}): [number, number, number][] {
  const q = f.tpq;
  if (until - from < q / 8) return [];
  const signs = written ?? (kind === "mordent" ? "M" : kind === "trill" ? "T" : kind === "turn" ? "S" : "W");
  const steps = contextSteps(f, noteOn, midi, signs);
  const unit = ornamentUnit(bpm / 2);
  // The Pralltriller "with extraordinary speed" (I.2.3 §32): D408, as the mordent (realise's `quick`: main, upper,
  // main back within about 80 ms at any tempo; D353's unit / 2, no faster than the beat's 32nds, was 125 ms a note at 60).
  // The up-down forms named (the Pralltriller, the Schneller: main, upper, main) are W's snapped form, from the main note.
  const prevMidi = !written && (kind === "pralltriller" || kind === "schneller") ? midi + 1 : opts.prevMidi;
  let parts = realise({ midi, at: from / q, dur: (until - from) / q }, signs, [], { unit, quick: mordentUnit(60 / bpm), trillUnit: trillUnit(60 / bpm, MECH.trillPerSecond), settle: MECH.trillSettle, prevMidi, ...steps, diatonic: true, nachschlag: !!opts.nachschlag && /[TtO]/.test(signs) && !signs.includes("R") });
  if (parts.length > 1 && parts[0].midi === midi) {
    const shift = parts[1].at - parts[0].at;
    parts = parts.slice(1).map((p, k, a) => ({ ...p, at: p.at - shift, dur: k === a.length - 1 ? p.dur + shift : p.dur }));
  }
  return parts.map((p) => [Math.round(p.at * q), Math.max(1, Math.round(p.dur * q)), p.midi]);
}

/** The voice's note sounding `midi` at `on` (any voice), its neighbours in the voice. */
function voiceNote(f: TouchFugue, on: number, midi: number): { n: TouchNote; prev?: TouchNote; next?: TouchNote } | null {
  for (const v of f.voices) {
    const j = v.findIndex((n) => n[0] === on && n[2] === midi);
    if (j >= 0) return { n: v[j], prev: v[j - 1], next: v[j + 1] };
  }
  return null;
}

/**
 * D353, THE TRILL'S ENDING by C. P. E. Bach's rule (MECH.trillEnding "rule"; Versuch I.2.3 §§13, 16):
 * the Nachschlag (the step below, then the note, the alternation beaten to it) on a note of a beat or
 * more, after a leap, or on the note before a cadence's arrival; none in a falling series (stepwise down
 * through it) or on a short note (no room for four trill notes and the Nachschlag); else the trill
 * settles on its note (the Explication's). "settle": never.
 */
export function nachschlagAt(f: TouchFugue, on: number, midi: number, dur: number, bpm: number): boolean {
  if (MECH.trillEnding !== "rule") return false;
  const g = trillUnit(60 / bpm, MECH.trillPerSecond) * f.tpq;
  if (dur < 6 * g - 1e-6) return false;
  const at = voiceNote(f, on, midi);
  const prev = at?.prev && at.prev[0] + at.prev[1] >= on ? at.prev : undefined;
  const next = at?.next;
  const step = at?.n[3];
  if (step !== undefined && prev && next && prev[3] - step === 1 && step - next[3] === 1) return false;
  if (dur >= beatOf(f).ticks) return true;
  if (step !== undefined && prev && Math.abs(prev[3] - step) >= 2) return true;
  const beat = beatOf(f).ticks;
  return (f.cadences ?? []).some((c) => on < c.on && on + dur >= c.on - f.tpq / 8 && c.on - on <= 2 * beat);
}

/**
 * D353: the two-leg shake's ornament named by the music (the owner: the gesture's clear direction wins;
 * the music names an ambiguous one and chooses between the Pralltriller and the Schneller for the
 * up-down form): down first, the mordent; up first, the Pralltriller on a note reached by a falling
 * second and joined to it (I.2.3 §§31, 34), the Schneller on a detached note shorter than half a beat
 * with falling notes after it (I.2.8 §§2–3), else Bach's short Trillo; a blurred first leg, the
 * Pralltriller on a note reached by a falling second, the mordent elsewhere.
 */
export function twoLegKind(f: TouchFugue, on: number, midi: number, dur: number, form: "down" | "up" | "blur"): FreeKind {
  const at = voiceNote(f, on, midi);
  const prev = at?.prev;
  const next = at?.next;
  const step = at?.n[3];
  const joined = !!prev && prev[0] + prev[1] >= on;
  const fallingSecond = !!prev && step !== undefined && prev[3] - step === 1 && prev[2] > midi;
  if (form === "down") return "mordent";
  if (form === "blur") return fallingSecond ? "pralltriller" : "mordent";
  if (fallingSecond && joined) return "pralltriller";
  if (dur < beatOf(f).ticks / 2 && next && next[2] < midi) return "schneller";
  return "short";
}

/** D353: whether the note `on` (sounding `midi`) is followed in its voice by a falling second (the turn after it is "preferably not" there, I.2.4 §22). */
export function fallingSecondAfter(f: TouchFugue, on: number, midi: number): boolean {
  const at = voiceNote(f, on, midi);
  return !!at?.next && at.n[3] - at.next[3] === 1 && at.next[2] < midi;
}

const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
/**
 * D281: an ornamented note's neighbours as a player reads them, the next letter up (down) with its
 * accidental: (1) as the bar shows it: the last note of that letter in any voice since the bar began
 * (up to the note itself); else (2) as the sign says where it says a half step (t, w, m: kern's
 * lower case, written deliberately: II/12's mordents on the tonic with the leading note below); else
 * (3) the key signature's. The encodings' upper case (T, W, M: a whole step) is not trusted: it is
 * their plain default (II/13: a whole-step trill on B sharp and on A sharp in F sharp major).
 */
export function contextSteps(f: TouchFugue, on: number, midi: number, signs = ""): { stepAbove(m: number): number; stepBelow(m: number): number } {
  const read = readSteps(f, on, midi, signs);
  // D367: a trill the edition writes out (the concertos): its upper note as written (the player's shake too).
  const w = f.ornaments?.find(([, o, , notes]) => o === on && notes?.some((p) => p[2] === midi))?.[3];
  const up = w ? Math.max(...w.map((p) => p[2])) - midi : 0;
  return up === 1 || up === 2 ? { stepAbove: () => up, stepBelow: read.stepBelow } : read;
}

function readSteps(f: TouchFugue, on: number, midi: number, signs: string): { stepAbove(m: number): number; stepBelow(m: number): number } {
  const sig = keySteps(signature(f.key));
  let step: number | null = null;
  for (const v of f.voices) for (const n of v) if (n[0] === on && n[2] === midi) step = n[3];
  if (step === null) return sig;
  const barOn = [...f.bars].reverse().find((b) => b.on <= on)?.on ?? 0;
  const alter = signature(f.key);
  const pcOf = (m: number) => ((m % 12) + 12) % 12;
  const neighbour = (dir: 1 | -1): number | null => {
    const letter = ((((step as number) + dir) % 7) + 7) % 7;
    const dist = (pc: number) => (dir > 0 ? (pc - pcOf(midi) + 12) % 12 : (pcOf(midi) - pc + 12) % 12);
    let best: [number, number] | null = null;
    for (const v of f.voices) for (const n of v) if (n[0] >= barOn && n[0] <= on && (((n[3] % 7) + 7) % 7) === letter && !(n[0] === on && n[2] === midi) && (!best || n[0] >= best[0])) best = [n[0], pcOf(n[2])];
    if (best && (dist(best[1]) === 1 || dist(best[1]) === 2)) return dist(best[1]);
    if (dir > 0 ? /[tw]/.test(signs) : /m/.test(signs)) return 1;
    const fromSig = pcOf(LETTER_PC[letter] + (alter["CDEFGAB"[letter]] ?? 0));
    return dist(fromSig) === 1 || dist(fromSig) === 2 ? dist(fromSig) : null;
  };
  // Nothing fits (a letter the signature puts an augmented second away): a whole step.
  return { stepAbove: () => neighbour(1) ?? 2, stepBelow: () => neighbour(-1) ?? 2 };
}
