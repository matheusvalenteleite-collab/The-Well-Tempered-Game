/**
 * Playing the other voices less like a machine (D179): each note gets a level, a length and a hair of
 * timing from its place in the music, as a player would give them.
 *   Weight: the bar's first beat a little stronger, the other beats a little, the notes between them
 *   lighter.
 *   The subject: its notes known (D293: never louder).
 *   Line: within a voice, the higher notes of a passage a shade louder (the arch of a phrase).
 *   Articulation (D302, ARTICULATION below): joined (no gap, no new attack) or detached by the
 *   reading's marks on the subject's entries, else by a rule (steps joined, leaps, repeated notes and a
 *   moving bass apart); a long note is let go just before the next.
 *   Time: a few milliseconds early or late, the same each time (no randomness from run to run).
 * Pure: notes in, shapes out.
 */
import type { OtherNote } from "./voice-mode.ts";
import { preset } from "./sound.ts";

/**
 * D294: how the instrument is played, from the sound chosen (never from the player's touch): the
 * recorded harpsichord and piano as a player of each would (the owner: "less robotic", after Wanda
 * Landowska and Rosalyn Tureck); the synthesized sounds as before.
 */
export type Style = "plain" | "harpsichord" | "piano";
export const styleOf = (soundId: string): Style => (soundId === "harpsichordSampled" ? "harpsichord" : soundId === "pianoSampled" ? "piano" : "plain");

/**
 * D294, the numbers (seconds, shares of the written length, levels):
 *   spread: a chord's notes (struck together in the others) one after another from the bass up, this
 *     far apart (the harpsichordist's arpeggiando; on the piano 0);
 *   lead: the chord's top note this much early (the pianist's "melody lead"; on the harpsichord 0);
 *   agogic: the bar's first beat this much late (the harpsichord's accent is of time, not loudness);
 *   jitter: the fixed unevenness, either way;
 *   cap: no note more than this off its written time (the game's beat stays clear);
 *   repeat, leap, long: the holds of a repeated note, a note before a leap of a fourth or more, a note of
 *     a beat or longer; overlegato: a broken chord's notes (leaps the same way in and out) held into the
 *     next, the harpsichordist's finger pedal;
 *   levels: the share of the bar's and the phrase's level kept (a harpsichord has no touch dynamics).
 */
export const TOUCH: Record<Exclude<Style, "plain">, { spread: number; lead: number; agogic: number; jitter: number; cap: number; repeat: number; leap: number; long: number; overlegato: number; levels: number }> = {
  harpsichord: { spread: 0.004, lead: 0, agogic: 0.008, jitter: 0.002, cap: 0.02, repeat: 0.72, leap: 0.8, long: 0.92, overlegato: 1.35, levels: 0.3 },
  piano: { spread: 0, lead: 0.008, agogic: 0.005, jitter: 0.002, cap: 0.02, repeat: 0.75, leap: 0.85, long: 0.95, overlegato: 1, levels: 1 },
};

export interface Shape {
  level: number;
  /** The share of its written length the note is held (D302: a joined note's, to the next note's onset). */
  hold: number;
  /** Seconds early (negative) or late. */
  nudge: number;
  /** A note of the subject (it shines whatever the player does). */
  subject: boolean;
  /** D302: how the note goes to the next of its voice (ARTICULATION). */
  art: Art;
  /** D302: joined from the note before (no fresh attack: chip.ts Play.legato). */
  legato: boolean;
  /** D302: joined to the next: held this many seconds past `hold` (the overlap, the nudges allowed for): chip.ts Play.tie. */
  over: number;
}

/**
 * D302, ARTICULATION: each note of the others joined to the next ("join": no gap, a little overlap,
 * the next not attacked anew), detached ("detach": an audible gap; "short": staccato), or neither
 * ("nonlegato": a smaller gap; "plain": held as before D302, a note before a rest or the last). Where
 * a reading marks the subject (readings.ts, Book I: Keller's and the others' slurs and dots), its
 * marks go on every entry of the subject in every voice (`marks`), as the player is asked to play it.
 * Elsewhere one simple rule, after the readings' own (steps slurred; leaps, repeated notes and a
 * moving bass's quavers apart): a step joined (a third too, among notes shorter than a beat); a
 * leap of a fourth or more, a repeated note, and the bass's notes of a third of a beat to a beat
 * nonlegato. The subject is never louder: the readings' accents are not levels here (D293).
 */
export type Art = "join" | "detach" | "short" | "nonlegato" | "plain";
/** D302: the holds (shares of the written length): detached as HEAR THE SUBJECT plays the readings' detached notes (readings.ts). */
export const ART_HOLD = { detach: 0.62, short: 0.35, nonlegato: 0.74 } as const;
/** D302: a detached or nonlegato note's gap at most this share of a beat (a long note is not cut in half). */
export const GAP_BEATS = 0.4;
/** D302: a joined note held this far past the next one's onset (s): the crossfade of a sustained sound, a plucked note's overlegato. */
export const OVERLAP_S = 0.03;
/** D302: a reading's marks on a fugue's notes: "voice:onset" to the reading's note (readings.ts readingMarks). */
export type Marks = ReadonlyMap<string, { join: boolean | null; short: boolean | null }>;

/** `inBar`: where a tick falls in its bar (fugue.ts inBar: by the bars as encoded). D302: `marks`, a reading's; `bass`, the piece's lowest voice. */
export function phrase(notes: readonly OtherNote[], beat: number, inBar: (tick: number) => number, subject: Set<string>, style: Style = styleOf(preset().id), art: { marks?: Marks; bass?: number } = {}): Shape[] {
  const plain = phrasePlain(notes, beat, inBar, subject);
  const T = style === "plain" ? null : TOUCH[style];
  const nexts = nextIndex(notes);
  let bass = art.bass ?? -1;
  if (art.bass === undefined) for (const n of notes) bass = Math.max(bass, n.voice);
  const arts = notes.map((_, i) => articulation(notes, i, nexts.get(i), beat, art.marks, bass));
  // Each voice's note before (the first of the onset before), for a broken chord's leap in.
  const before = new Map<number, OtherNote>();
  const rank = new Map<number, { r: number; of: number }>();
  if (T) {
    const lastOn = new Map<number, { on: number; n: OtherNote }>();
    const prevOn = new Map<number, OtherNote>();
    notes.forEach((n, i) => {
      const l = lastOn.get(n.voice);
      if (l && l.on < n.on) prevOn.set(n.voice, l.n);
      if (!l || l.on < n.on) lastOn.set(n.voice, { on: n.on, n });
      const p = prevOn.get(n.voice);
      if (p) before.set(i, p);
    });
    // The notes struck together (the same onset), low to high: their place in the chord.
    const chords = new Map<number, number[]>();
    notes.forEach((n, i) => {
      const c = chords.get(n.on);
      if (c) c.push(i);
      else chords.set(n.on, [i]);
    });
    for (const c of chords.values()) {
      const voices = new Set(c.map((i) => notes[i].voice));
      if (voices.size < 2) continue;
      [...c].sort((a, b) => notes[a].midi - notes[b].midi).forEach((i, r) => rank.set(i, { r, of: c.length }));
    }
  }
  const shapes: Shape[] = plain.map((sh, i) => {
    const n = notes[i];
    const a = arts[i];
    const j = nexts.get(i);
    const after = j === undefined ? undefined : notes[j];
    let nudge = sh.nudge;
    let level = sh.level;
    if (T) {
      const h = Math.sin(n.on * 12.9898 + n.midi * 78.233 + n.voice * 37.719) * 43758.5453;
      nudge = ((h - Math.floor(h)) * 2 - 1) * T.jitter;
      const c = rank.get(i);
      if (c) nudge += c.r * T.spread - (c.r === c.of - 1 ? T.lead : 0);
      if (inBar(n.on) === 0) nudge += T.agogic;
      nudge = Math.max(-T.cap, Math.min(T.cap, nudge));
      level = 1 + (sh.level - 1) * T.levels;
    }
    // The gap of a detached note at most GAP_BEATS of a beat.
    const apart = (share: number) => Math.max(share, 1 - (GAP_BEATS * beat) / n.dur);
    let hold = 1;
    if (a === "join" && after) {
      hold = (after.on - n.on) / n.dur;
      // D294, the harpsichordist's finger pedal: a broken chord's notes held on into the next.
      const into = before.get(i);
      const out = after.step - n.step;
      const inn = into ? n.step - into.step : 0;
      if (T && T.overlegato > 1 && Math.abs(out) >= 2 && Math.abs(inn) >= 2 && Math.sign(out) === Math.sign(inn) && n.dur < beat) hold = Math.max(hold, T.overlegato);
    } else if (a === "detach") hold = apart(ART_HOLD.detach);
    else if (a === "short") hold = ART_HOLD.short;
    else if (a === "nonlegato") hold = apart(T ? (after?.midi === n.midi ? T.repeat : T.leap) : ART_HOLD.nonlegato);
    else if (n.dur >= beat) hold = T ? T.long : 0.95;
    return { level, hold, nudge, subject: sh.subject, art: a, legato: false, over: 0 };
  });
  // Joined: the next note not attacked anew, this one held past its onset (the two nudges allowed for).
  shapes.forEach((sh, i) => {
    const j = nexts.get(i);
    if (sh.art !== "join" || j === undefined) return;
    shapes[j].legato = true;
    sh.over = Math.max(0.01, OVERLAP_S + shapes[j].nudge - sh.nudge);
  });
  return shapes;
}

/** D302: how note i goes to its next (index j): by the reading's mark where it has one, else by the rule (ARTICULATION). */
function articulation(notes: readonly OtherNote[], i: number, j: number | undefined, beat: number, marks: Marks | undefined, bass: number): Art {
  const n = notes[i];
  const after = j === undefined ? undefined : notes[j];
  // Before a rest, or the last: as it was.
  if (!after || after.on > n.on + n.dur) return "plain";
  const mark = marks?.get(`${n.voice}:${n.on}`);
  if (mark?.short) return "short";
  if (mark?.join === false) return "detach";
  if (mark?.join === true) return after.on === n.on + n.dur ? "join" : "plain";
  // Notes overlapping in one voice (a chord held under the next): as it was.
  if (after.on !== n.on + n.dur) return "plain";
  const semis = Math.abs(after.midi - n.midi);
  if (semis === 0) return "nonlegato";
  if (n.voice === bass && n.dur >= beat / 3 && n.dur <= beat) return "nonlegato";
  if (semis <= 2) return "join";
  if (semis <= 4 && n.dur < beat) return "join";
  return "nonlegato";
}

/** D302: each note's next note in its voice, by index (the first of the next onset; D191: a chord's partner, struck with it, is not "the next note"). */
function nextIndex(notes: readonly OtherNote[]): Map<number, number | undefined> {
  const byVoice = new Map<number, number[]>();
  for (let i = 0; i < notes.length; i++) {
    const v = byVoice.get(notes[i].voice);
    if (v) v.push(i);
    else byVoice.set(notes[i].voice, [i]);
  }
  const next = new Map<number, number | undefined>();
  for (const idx of byVoice.values()) {
    let after: number | undefined;
    for (let k = idx.length - 1; k >= 0; k--) {
      if (k + 1 < idx.length && notes[idx[k + 1]].on > notes[idx[k]].on) after = idx[k + 1];
      next.set(idx[k], after);
    }
  }
  return next;
}

/**
 * D302: how a note of the others is sounded, from its shape: joined from the one before (no new
 * attack: Play.legato), joined to the next (held over it, crossfaded out over `tie` s: Play.tie).
 */
export function joins(sh: Shape): { legato?: boolean; tie?: number } {
  return { ...(sh.legato ? { legato: true } : {}), ...(sh.over > 0 ? { tie: sh.over } : {}) };
}

/** D179: the synthesized sounds' phrasing (and the base of the others'): each note's level and its fixed unevenness (D302: the holds are ARTICULATION's). */
function phrasePlain(notes: readonly OtherNote[], beat: number, inBar: (tick: number) => number, subject: Set<string>): { level: number; nudge: number; subject: boolean }[] {
  // Each voice's notes in order, to see the voice's range around each note.
  // (D191: built by pushing; copying the list for every note made it O(n²).)
  const byVoice = new Map<number, number[]>();
  for (let i = 0; i < notes.length; i++) {
    const v = byVoice.get(notes[i].voice);
    if (v) v.push(i);
    else byVoice.set(notes[i].voice, [i]);
  }
  const local = new Map<number, number>();
  for (const idx of byVoice.values()) {
    idx.forEach((i, k) => {
      // Where the note stands between the lowest and highest of its neighbours (0 to 1).
      const near = idx.slice(Math.max(0, k - 6), k + 7).map((j) => notes[j].midi);
      const lo = Math.min(...near);
      const hi = Math.max(...near);
      local.set(i, hi > lo ? (notes[i].midi - lo) / (hi - lo) : 0.5);
    });
  }
  return notes.map((n, i) => {
    const pos = inBar(n.on);
    const weight = pos === 0 ? 1.12 : pos % beat === 0 ? 1.04 : 0.94;
    const inSubject = subject.has(`${n.voice}:${n.on}`);
    // D293: the subject no louder than its neighbours (the owner: banging the subject every time is
    // "patronising"); it is marked by its effect's soft layers (subject-fx.ts), not by level.
    const subj = 1;
    const arch = 0.92 + 0.16 * (local.get(i) ?? 0.5);
    // A fixed, small unevenness: a hash of the note.
    const h = Math.sin(n.on * 12.9898 + n.midi * 78.233 + n.voice * 37.719) * 43758.5453;
    const nudge = ((h - Math.floor(h)) * 2 - 1) * 0.006;
    return { level: weight * subj * arch, nudge, subject: inSubject };
  });
}

/**
 * D181, the accompaniment listening: how the player has been playing (0 pp to 1 ff, a running
 * average) moves the others a little with them (from 0.88 to 1.12 of their level). D293: only where
 * touch dynamics are heard (proto-game.ts touchDynamics); elsewhere `feel` stays put.
 */
export function follow(sh: Shape, feel: number): number {
  const f = 0.88 + 0.24 * Math.max(0, Math.min(1, feel));
  return sh.level * f;
}

/**
 * D181, the last cadence held back: over the last two bars the tempo slows evenly to RIT_END of
 * itself. `warp` turns score ticks into ticks of steady time, `unwarp` back.
 */
export const RIT_END = 0.78;

/** A warp of score ticks into ticks of steady time, and back. */
export interface Warp {
  warp: (tick: number) => number;
  unwarp: (w: number) => number;
}

/**
 * D250: a warp with a tempo curve laid over it: `speed(tick)` a factor on the tempo (1.06: 6% quicker),
 * from tick 0 to `length` (before it the warp as it was, after it the last speed). Tabled every `step`
 * ticks (straight lines between), inverted by search.
 */
export function withSpeed(base: Warp, speed: (tick: number) => number, length: number, step: number): Warp {
  const n = Math.max(1, Math.ceil(length / step));
  const at = new Float64Array(n + 1);
  at[0] = base.warp(0);
  for (let k = 0; k < n; k++) {
    const a = k * step;
    const b = Math.min(length, a + step);
    at[k + 1] = at[k] + (base.warp(b) - base.warp(a)) / Math.max(0.25, speed((a + b) / 2));
  }
  const last = Math.max(0.25, speed(length));
  return {
    warp: (tick) => {
      if (tick <= 0) return base.warp(tick);
      if (tick >= length) return at[n] + (base.warp(tick) - base.warp(length)) / last;
      const k = Math.floor(tick / step);
      const a = k * step;
      const b = Math.min(length, a + step);
      return at[k] + ((at[k + 1] - at[k]) * (tick - a)) / Math.max(1e-9, b - a);
    },
    unwarp: (w) => {
      if (w <= at[0]) return base.unwarp(w);
      if (w >= at[n]) return base.unwarp(base.warp(length) + (w - at[n]) * last);
      let lo = 0;
      let hi = n;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (at[mid] <= w) lo = mid;
        else hi = mid;
      }
      const a = lo * step;
      const b = Math.min(length, a + step);
      return a + ((b - a) * (w - at[lo])) / Math.max(1e-9, at[lo + 1] - at[lo]);
    },
  };
}
export function ritard(length: number, barTicks: number): Warp {
  const from = Math.max(0, length - 2 * barTicks);
  const L = length - from;
  const a = 1 - RIT_END;
  const end = from - (L / a) * Math.log(1 - a);
  return {
    warp: (tick) => {
      if (tick <= from) return tick;
      if (tick >= length) return end + (tick - length) / RIT_END;
      const x = (tick - from) / L;
      return from - (L / a) * Math.log(1 - a * x);
    },
    unwarp: (w) => {
      if (w <= from) return w;
      if (w >= end) return length + (w - end) * RIT_END;
      return from + (L * (1 - Math.exp((-a * (w - from)) / L))) / a;
    },
  };
}
