/**
 * D213, experiment E1: the subject as protagonist, by ear and not by loudness. While a voice states the
 * subject (any entry, subject or answer; not the countersubjects) its notes are a little brighter, with
 * a crisper attack (Play.tone, Play.crisp: a high shelf, a timbre); the other voices meanwhile a little
 * duller (about 2 dB of shelf and half a dB of level). The cues are strongest for an entry in an inner
 * voice or the bass, slight in the top voice (which the ear already follows). Two switches, off by
 * default: a gentle vibrato on the subject's notes, and the entering voice drawn towards the centre.
 *
 * And a sound effect on the subject, subtle, tailored to each fugue of the testbench (TAILORED) and to
 * each of its subjects (I/4 and Contrapunctus XIV have three; I/8 marks its inversions and its
 * augmentations): soft layer notes played through chip.note with small patches (their nodes released
 * with the note, D210), the voice's own instrument echoed or doubled, or a send to the room. Every other
 * fugue has a gentle default (GENERIC). The player's voice is treated as the others (the voices are
 * equals, D208).
 */
import type { Chip, Play, Sounding, Voicing } from "./chip.ts";
import { beatOf, type TouchFugue } from "./fugue.ts";
import type { Patch, Wave } from "./sound.ts";

/** The LAB switches (the bench's ⚙). */
export interface Lab {
  /** The subject brighter and crisper, the others duller during an entry. */
  subject: boolean;
  /** The fugue's own sound effect on the subject. */
  effect: boolean;
  /** A gentle vibrato on the subject's notes. */
  vibrato: boolean;
  /** The entering voice drawn towards the centre. */
  stereo: boolean;
  /** D215, E3: Kimiko Ishizaka's recording fading in under a good run, the game on her tempo and pitch. */
  ishizaka: boolean;
}
export const LAB_DEFAULT: Lab = { subject: true, effect: true, vibrato: false, stereo: false, ishizaka: false };
let current: Lab = LAB_DEFAULT;
/** Set from the settings (missing switches take their default). */
export function setLab(l: Partial<Lab>) {
  current = { ...LAB_DEFAULT, ...l };
}
export const lab = (): Lab => current;

/** A note of an entry of the subject. */
export interface SubjectNote {
  voice: number;
  on: number;
  dur: number;
  midi: number;
  /** 1 the first subject; 2, 3 a double or triple fugue's later ones. */
  theme: 1 | 2 | 3;
  inverted: boolean;
  scale: 1 | 2 | 0.5;
  /** The entry's first note. */
  head: boolean;
  /** Reached by a leap (a fourth or more from the entry's note before). */
  leap: boolean;
  /** Half a beat or longer. */
  long: boolean;
  /** How strong the cues are: slight in the top voice, full in the inner voices and the bass. */
  weight: number;
}

/** D213: the register's compensation: the top voice is heard first anyway. */
export function registerWeight(voice: number, count: number): number {
  return count > 1 && voice === 0 ? 0.35 : 1;
}

/** The subject's notes of a fugue (by "voice:onset") and its entries in time, built once per game. */
export class SubjectCues {
  readonly notes = new Map<string, SubjectNote>();
  private spans: { voice: number; on: number; end: number; weight: number }[] = [];
  constructor(f: TouchFugue) {
    const count = f.voices.length;
    const half = beatOf(f).ticks / 2;
    for (const e of f.entries) {
      const weight = registerWeight(e.voice, count);
      this.spans.push({ voice: e.voice, on: e.on, end: e.end, weight });
      let prev: number | undefined;
      e.notes.forEach(([on, dur, midi], i) => {
        const key = `${e.voice}:${on}`;
        if (!this.notes.has(key))
          this.notes.set(key, {
            voice: e.voice,
            on,
            dur,
            midi,
            theme: e.theme ?? 1,
            inverted: !!e.inverted,
            scale: e.scale ?? 1,
            head: i === 0,
            leap: prev !== undefined && Math.abs(midi - prev) >= 5,
            long: dur >= half,
            weight,
          });
        prev = midi;
      });
    }
  }
  note(voice: number, on: number): SubjectNote | undefined {
    return this.notes.get(`${voice}:${on}`);
  }
  /** How much a note off the subject is dulled (0 none): by the strongest entry sounding in another voice. */
  dullness(voice: number, on: number): number {
    let w = 0;
    for (const s of this.spans) if (s.voice !== voice && s.on <= on && on < s.end) w = Math.max(w, s.weight);
    return w;
  }
}

/** A subject note's emphasis: +3 dB of shelf and a crisp attack (scaled by its register); the vibrato if on. */
export function emphasis(sn: SubjectNote, l: Lab = current): Play {
  if (!l.subject) return {};
  return { tone: 3 * sn.weight, crisp: 0.7 * sn.weight, ...(l.vibrato ? { vib: 6 + 6 * sn.weight } : {}) };
}

/** A note off the subject during an entry: about 2 dB less shelf, half a dB less level (`level` a factor). */
export function dulling(w: number, l: Lab = current): Play {
  if (!l.subject || w <= 0) return {};
  return { tone: -2 * w, level: 1 - 0.06 * w };
}

/** The entering voice drawn towards the centre (STEREO). */
export function stereoOf(v: Voicing, sn: SubjectNote | undefined, l: Lab = current): Voicing {
  return l.stereo && sn ? { ...v, pan: v.pan * 0.35 } : v;
}

/** Which notes of an entry a layer sounds on. */
export type Trigger = "all" | "long" | "leap" | "head";
export type Layer =
  /** A soft sustained layer at an interval (a flute or organ stop: 4', 16', a twelfth). */
  | { kind: "shimmer"; interval: number; wave: Wave; level: number; on?: Trigger }
  /** A struck bell or glass at the onset, dying away over `decay` s. */
  | { kind: "ping"; interval: number; wave: Wave; level: number; decay: number; on?: Trigger }
  /** The voice's own instrument again, `delay` s later, quieter, darker, on the other side. */
  | { kind: "echo"; delay: number; level: number; on?: Trigger }
  /** The voice's own instrument doubled `cents` off (a second choir, a chorus). */
  | { kind: "halo"; cents: number; level: number; on?: Trigger }
  /** A brass bite at the attack (an FM brass blip through an opening filter). */
  | { kind: "brass"; level: number; on?: Trigger };

export interface SubjectFx {
  name: string;
  /** Why this effect for this subject. */
  why: string;
  /** A send to the room for the subject's notes (0 none). */
  room: number;
  layers: Layer[];
}

/** The gentle default: a little more room and, on the longer notes, the faintest octave above. */
export const GENERIC: SubjectFx = {
  name: "ROOM",
  why: "Any fugue: the subject stands in a slightly larger space, with the faintest 4' on its longer notes.",
  room: 0.35,
  layers: [{ kind: "shimmer", interval: 12, wave: "sine", level: 0.03, on: "long" }],
};

/** Per fugue: its subject (1), its later subjects (2, 3), its inversions and augmentations. */
export interface FugueFx {
  1: SubjectFx;
  2?: SubjectFx;
  3?: SubjectFx;
  inverted?: SubjectFx;
  augmented?: SubjectFx;
}

/** D213: the eight fugues of the testbench (cards.ts TESTBENCH), each its own effect. */
export const TAILORED: Record<string, FugueFx> = {
  wtc1f01: {
    1: {
      name: "4' FLUTE",
      why: "Serene and slow, entries crowded in stretto: a soft sine an octave above haloes every note without a new accent, so overlapping entries stay calm.",
      room: 0.5,
      layers: [{ kind: "shimmer", interval: 12, wave: "sine", level: 0.05 }],
    },
  },
  wtc1f02: {
    1: {
      name: "GLASS SPARK",
      why: "Steady sixteenths, sharp: a short glassy FM-bell ping an octave up on the eighths only, the subject's skeleton, crisp as the subject, never on every sixteenth.",
      room: 0,
      layers: [{ kind: "ping", interval: 12, wave: "fmBell", level: 0.05, decay: 0.16, on: "long" }],
    },
  },
  wtc1f04: {
    1: {
      name: "16' PEDAL",
      why: "The solemn cross-motif in long notes: a soft octave below, an organ's 16', grounds it, in a larger room.",
      room: 0.6,
      layers: [{ kind: "shimmer", interval: -12, wave: "sine", level: 0.07 }],
    },
    2: {
      name: "SECOND CHOIR",
      why: "The running quavers: the voice doubled 7 cents off (a harpsichord's second 8' choir), thicker without new attacks.",
      room: 0.15,
      layers: [{ kind: "halo", cents: 7, level: 0.28 }],
    },
    3: {
      name: "BELL",
      why: "The repeated-note figure: a small bell two octaves up on each note makes the repetitions ring.",
      room: 0.3,
      layers: [{ kind: "ping", interval: 24, wave: "sine", level: 0.04, decay: 0.3 }],
    },
  },
  wtc1f05: {
    1: {
      name: "TRUMPET BITE",
      why: "A festive French overture: a brass blip at each attack sharpens the dotted runs like trumpets.",
      room: 0.1,
      layers: [{ kind: "brass", level: 0.07 }],
    },
  },
  wtc1f08: {
    1: {
      name: "NAZARD",
      why: "Learned and slow: a faint twelfth above (an organ's 2 2/3' mutation) colours the subject as written.",
      room: 0.4,
      layers: [{ kind: "shimmer", interval: 19, wave: "sine", level: 0.03 }],
    },
    inverted: {
      name: "MIRROR 16'",
      why: "The subject inverted, its colour mirrored too: the soft layer an octave below instead of above.",
      room: 0.4,
      layers: [{ kind: "shimmer", interval: -12, wave: "sine", level: 0.05 }],
    },
    augmented: {
      name: "SLOW GIANT",
      why: "The subject in augmentation: an octave above and below at once, an organ plenum, in the largest room.",
      room: 0.8,
      layers: [
        { kind: "shimmer", interval: 12, wave: "sine", level: 0.035 },
        { kind: "shimmer", interval: -12, wave: "sine", level: 0.04 },
      ],
    },
  },
  wtc1f10: {
    1: {
      name: "TOCCATA ECHO",
      why: "Fast toccata runs in two voices: a short slapback echo on the other side, on the head and the longer notes (not every sixteenth), widens the line without blurring the runs.",
      room: 0.2,
      layers: [{ kind: "echo", delay: 0.11, level: 0.22, on: "long" }],
    },
  },
  wtc1f11: {
    1: {
      name: "LEAP SPARK",
      why: "A quick 3/8 dance of leaps: a short pluck an octave up on the head and on each note reached by a leap marks its springs.",
      room: 0.1,
      layers: [
        { kind: "ping", interval: 12, wave: "triangle", level: 0.06, decay: 0.12, on: "leap" },
        { kind: "ping", interval: 12, wave: "triangle", level: 0.06, decay: 0.12, on: "head" },
      ],
    },
  },
  "bwv1080-14": {
    1: {
      name: "4' PRINCIPAL",
      why: "Stile antico in long notes: a faint organ stop an octave above, the Art of Fugue's organ colour, in a large room.",
      room: 0.5,
      layers: [{ kind: "shimmer", interval: 12, wave: "organ", level: 0.035 }],
    },
    2: {
      name: "CHORUS",
      why: "The running second subject: a wider detuned double (a chorus) and a slapback on the other side, lively but light.",
      room: 0.2,
      layers: [
        { kind: "halo", cents: -9, level: 0.22 },
        { kind: "echo", delay: 0.08, level: 0.14, on: "long" },
      ],
    },
    3: {
      name: "B-A-C-H BELLS",
      why: "Bach's name: each of its notes rung as a bell two octaves up, over a soft 16', in the largest room.",
      room: 0.6,
      layers: [
        { kind: "ping", interval: 24, wave: "fmBell", level: 0.045, decay: 0.6 },
        { kind: "shimmer", interval: -12, wave: "sine", level: 0.035 },
      ],
    },
  },
};

/** The effect for a subject note of a fugue. */
export function fxFor(id: string, sn: Pick<SubjectNote, "theme" | "inverted" | "scale">): SubjectFx {
  const t = TAILORED[id];
  if (!t) return GENERIC;
  if (sn.scale === 2 && t.augmented) return t.augmented;
  if (sn.inverted && t.inverted) return t.inverted;
  return (sn.theme === 3 ? t[3] : sn.theme === 2 ? t[2] : undefined) ?? t[1];
}

const fires = (on: Trigger | undefined, sn: SubjectNote) => (on === "long" ? sn.long || sn.head : on === "leap" ? sn.leap : on === "head" ? sn.head : true);

/** The small patches of the layers (built once). */
const patches = new Map<string, Patch>();
function patchOf(l: Layer): Patch {
  const key = l.kind === "shimmer" || l.kind === "ping" ? `${l.kind}:${l.wave}:${l.level}:${l.kind === "ping" ? l.decay : 0}` : `${l.kind}:${l.level}`;
  let p = patches.get(key);
  if (!p) {
    if (l.kind === "shimmer") p = { osc: [{ wave: l.wave }], amp: { a: 0.04, d: 0.3, s: 0.85, r: 0.12 }, level: l.level };
    else if (l.kind === "ping") p = { osc: [{ wave: l.wave }], amp: { a: 0.002, d: l.decay, s: 0, r: 0.08 }, level: l.level };
    else p = { osc: [{ wave: "fmBrass" }], filter: { freq: 4, q: 1, env: 2.5, envDecay: 0.07 }, amp: { a: 0.006, d: 0.12, s: 0.25, r: 0.05 }, level: l.level };
    patches.set(key, p);
  }
  return p;
}

/**
 * D213: the effect's layers for one subject note (at `at`, `len` s, in voicing `v`, at the note's
 * level): returns their sounds, to be stopped with the game. Layers out of the keyboard's range are left out.
 */
export function playFx(chip: Chip, fx: SubjectFx, sn: SubjectNote, midi: number, at: number, len: number, v: Voicing, level = 1): Sounding[] {
  const out: Sounding[] = [];
  for (const l of fx.layers) {
    if (!fires(l.on, sn)) continue;
    if (l.kind === "echo") {
      out.push(chip.note(midi, at + l.delay, len * 0.9, { ...v, pan: v.pan ? -v.pan * 0.8 : 0.4 }, { level: level * l.level, tone: -4, room: fx.room }));
    } else if (l.kind === "halo") {
      out.push(chip.note(midi, at, len, { ...v, pan: v.pan * 0.6 }, { level: level * l.level, detune: l.cents }));
    } else {
      const m = midi + (l.kind === "brass" ? 0 : l.interval);
      if (m < 24 || m > 108) continue;
      const dur = l.kind === "ping" ? Math.min(len, l.decay * 3) : l.kind === "brass" ? Math.min(len, 0.25) : len;
      out.push(chip.note(m, at, Math.max(0.05, dur), { ...v, patch: patchOf(l) }, { level, room: fx.room }));
    }
  }
  return out;
}

/** D213: everything a game needs: the cues, the effects, the switches as they were when it began. */
export class SubjectSound {
  readonly f: TouchFugue;
  readonly cues: SubjectCues;
  readonly lab: Lab;
  constructor(f: TouchFugue, l: Lab = current) {
    this.f = f;
    this.cues = new SubjectCues(f);
    this.lab = l;
  }
  /** A note's voicing and its Play (`level` a factor on the note's own), and its subject note if any. */
  shape(voice: number, on: number, v: Voicing): { v: Voicing; play: Play; sn?: SubjectNote } {
    const sn = this.cues.note(voice, on);
    if (sn) {
      const fx = this.lab.effect ? fxFor(this.f.id, sn) : null;
      return { v: stereoOf(v, sn, this.lab), play: { ...emphasis(sn, this.lab), ...(fx?.room ? { room: fx.room } : {}) }, sn };
    }
    return { v, play: dulling(this.cues.dullness(voice, on), this.lab) };
  }
  /** The effect's layers for a subject note (none when the effect is off). */
  layers(chip: Chip, sn: SubjectNote | undefined, midi: number, at: number, len: number, v: Voicing, level = 1): Sounding[] {
    if (!sn || !this.lab.effect) return [];
    return playFx(chip, fxFor(this.f.id, sn), sn, midi, at, len, v, level);
  }
}
