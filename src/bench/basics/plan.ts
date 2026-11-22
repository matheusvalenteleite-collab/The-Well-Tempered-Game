/**
 * D686 (design studio; BASICS v2, the owner's plan): the tutorial's acts and their stages. One new idea a stage;
 * each runs SHOW (a 2 s clip of real thumbs, from above) → DO (the aids on; the music waits for the first tap) →
 * PROVE (the aids fade); a stage is left on success, never on a timer. Help comes in steps and the player never
 * fails out: the first miss nothing, the second a hint line, the third the clip again, the fourth a notch slower.
 * Each act opens with Glenn's line (his still portrait) and an I KNOW THIS that skips it.
 *
 * Only the game's real rules are taught: direction is judged against the same thumb's last touch, so the music of
 * the direction act is one thumb, or pairs after a rest, where that and "the note before" agree. Holding and
 * lifting to make a note sound is not taught.
 */
import type { Results } from "../lessons.ts";
import type { LensStats } from "../manual/lens.ts";
import "./exercises.ts";

export type ClipId = "tap" | "up" | "down" | "same" | "leap" | "two" | "hold" | "lift" | "strong" | "legato" | "short" | "shake" | "slide";
/** D992: "signs", the thumbs' ● ○ (not drawn in BASICS on a stage without it: not yet introduced). */
export type Aid = "rings" | "arrow" | "gold" | "drain" | "lift" | "made" | "sides" | "join" | "signs";

export type PassRule =
  | { kind: "right"; need: number }
  | { kind: "moves"; need: number }
  /** A clean run: every note right but at most `slips` (the weak player's test: 1; strictly clean is too strict). */
  | { kind: "clean"; slips: number }
  | { kind: "holds"; holds: number; rests: number }
  | { kind: "share"; share: number }
  | { kind: "tries"; what: "colour" | "joins" | "short" | "shake" | "slide" | "any"; need: number };

export interface Stage {
  id: string;
  clip: ClipId | null;
  piece: string;
  voice: number;
  fromBar?: number;
  toBar?: number;
  /** Crotchets a minute. */
  bpm: number;
  pass: PassRule;
  /** The music waits at every note (1.1), or at the first only (each new idea, the rest). */
  wait: "all" | "first";
  easy?: "timing";
  /** One thumb (Act II): the hints and the rings on that side. */
  side?: "left" | "right";
  aids: Aid[];
  /** The sound (sound.ts preset), else the piano. */
  sound?: string;
  /** The other voices: off, or played by the game (Act V). */
  solo: boolean;
  /** The second miss's line (one short line, translated). */
  hint: string;
  /** A passage that starts or ends inside a bar (6.4): notes skipped from the first bar's line, and how many. */
  skip?: number;
  count?: number;
  /** The signs over the notes asked for (6.4's trill: touch, then rock). */
  ornaments?: boolean;
  /** Act VI's stations: a light rule (the idea tried a few times): no PROVE; passed when the idea is heard, or after three takes. */
  light?: boolean;
  /** D941: Act VI's drums where the station names its own (6.7 PSYCH: LIEBEZEIT, D932's calmed style), else the sound's as the game plays it. */
  drums?: string;
  /** D995: no PROVE (one passed DO and the stage is done): Acts I-II (the owner: "Doing them once seems good enough") and 5.2. */
  noProve?: boolean;
  /** D996: the clip's line: what the idea is for (shown while the clip loops; neither Glenn's act line nor the in-play hint). */
  why?: string;
  /** D994: Glenn's line before the stage's clip (3.2: the thumbs' ● ○ introduced). */
  intro?: string;
  /** A line said at a moment of the music (5.2: at the soprano's entry), by bar. */
  cue?: { bar: number; text: string };
}

export interface Act {
  n: number;
  title: string;
  glenn: string;
  stages: Stage[];
}

const PIANO = "pianoSampled";
/** D994: Glenn's line introducing the thumbs' ● ○ (the owner approved it, via the board), before 3.2's clip. */
export const SIGNS_LINE = "From now on, a dot under each note says which thumb. Filled: the thumb you start with. Hollow: the other. Each bar wears its own dot.";
const ex = (id: string, o: Partial<Stage> & Pick<Stage, "piece" | "bpm" | "pass" | "hint" | "clip">): Stage => ({ id, voice: 0, wait: "first", aids: ["rings", "gold", "signs"], solo: true, ...o });

export const ACTS: readonly Act[] = [
  {
    n: 1,
    title: "TIMING",
    glenn: "Watch the notes drift towards the gold line. The moment one arrives, touch a bar, either one. Timing is everything.",
    stages: [
      ex("1.1", { why: "The music waits for you. Touch either bar the moment the note reaches the gold line.", noProve: true, clip: "tap", piece: "basics-1-1", bpm: 60, wait: "all", easy: "timing", aids: ["gold", "rings"], pass: { kind: "right", need: 4 }, hint: "Touch as the note meets the gold line." }),
      ex("1.2", { why: "Now the music keeps going. One touch for each note, right on the gold line.", noProve: true, clip: "tap", piece: "basics-1-2", bpm: 60, easy: "timing", aids: ["gold", "rings"], pass: { kind: "right", need: 4 }, hint: "One touch for each note, as it arrives." }),
    ],
  },
  {
    n: 2,
    title: "DIRECTION",
    glenn: "It's not where you touch, it's where you go. Tune goes up, reach higher than your last touch. Down, go lower. Same note, same spot.",
    stages: [
      ex("2.1", { why: "Higher than your last touch: the tune goes up. How far doesn't matter, only the way.", noProve: true, clip: "up", piece: "basics-2-1", bpm: 72, side: "right", aids: ["rings", "arrow", "made", "gold"], pass: { kind: "moves", need: 3 }, hint: "Higher than your last touch." }),
      ex("2.2", { why: "Lower than your last touch: the tune goes down.", noProve: true, clip: "down", piece: "basics-2-2", bpm: 72, side: "right", aids: ["rings", "arrow", "made", "gold"], pass: { kind: "moves", need: 3 }, hint: "Lower than your last touch." }),
      ex("2.3", { why: "The same note again: touch the same spot. Don't move.", noProve: true, clip: "same", piece: "basics-2-3", bpm: 72, side: "right", aids: ["rings", "arrow", "made", "gold"], pass: { kind: "moves", need: 3 }, hint: "Same note: touch the same spot." }),
      ex("2.4", { why: "Up, down or the same: each touch follows the tune's way from the one before.", noProve: true, clip: "up", piece: "basics-2-4", bpm: 72, side: "right", aids: ["rings", "arrow", "made", "gold"], pass: { kind: "moves", need: 6 }, hint: "Up, down or the same: follow the tune." }),
      ex("2.5", { why: "Even a big leap needs only a small move, the right way.", noProve: true, clip: "leap", piece: "basics-2-5", bpm: 80, side: "right", aids: ["rings", "arrow", "made", "gold"], pass: { kind: "clean", slips: 1 }, hint: "A big jump needs only a small move the right way." }),
    ],
  },
  {
    n: 3,
    title: "TWO THUMBS",
    glenn: "One thumb? Nobody plays the piano with one finger. Share the notes between your thumbs: left, right, left. It's quicker, and it sounds better.",
    stages: [
      ex("3.1", { why: "Two thumbs take turns. Each one follows its own last touch.", clip: "two", piece: "basics-3-1", bpm: 60, aids: ["rings", "arrow", "sides", "made", "gold"], pass: { kind: "clean", slips: 1 }, hint: "Left, right, left: take turns." }),
      ex("3.2", { why: "Faster now. Taking turns is what makes it possible.", clip: "two", piece: "basics-3-1", bpm: 120, intro: SIGNS_LINE, aids: ["rings", "arrow", "sides", "made", "gold", "signs"], pass: { kind: "clean", slips: 1 }, hint: "Take turns; each thumb follows its own last touch." }),
    ],
  },
  {
    n: 4,
    title: "HOLDING",
    glenn: "Your thumb is the key. Keep it down and the note sings on; lift it and the note stops. Long notes, long holds.",
    stages: [
      ex("4.1", { why: "A long note sounds as long as your thumb stays down. Hold it to the end of the block.", clip: "hold", piece: "basics-4-1", bpm: 66, aids: ["rings", "drain", "gold", "signs"], pass: { kind: "holds", holds: 3, rests: 0 }, hint: "Keep your thumb down until the block runs out." }),
      ex("4.2", { why: "A rest is silence: lift your thumb and let the note stop.", clip: "lift", piece: "basics-4-2", bpm: 66, aids: ["rings", "drain", "lift", "gold", "signs"], pass: { kind: "holds", holds: 0, rests: 1 }, hint: "At a rest, lift your thumb." }),
    ],
  },
  {
    n: 5,
    title: "A REAL FUGUE",
    glenn: "Now, a real fugue. Four voices, from one of his last works, and a damn fine one. You begin, alone, in the alto. The others will follow you.",
    stages: [
      ex("5.1", { clip: null, piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 4, bpm: 44, aids: ["rings", "arrow", "gold", "drain", "lift", "signs"], pass: { kind: "share", share: 0.6 }, hint: "Follow the tune: up, down, the same." }),
      ex("5.2", { noProve: true, clip: null, piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 8, bpm: 44, solo: false, aids: ["rings", "gold", "drain", "lift", "signs"], pass: { kind: "share", share: 0.55 }, hint: "Yours are bright; the others play themselves.", cue: { bar: 5, text: "Listen: someone answers you with your own tune. That's a fugue. Theirs are dim, yours are bright. Keep going." } }),
    ],
  },
  {
    n: 6,
    title: "MAKE IT SING",
    glenn: "Right notes at the right time: that's the game. Now make it music. Every sound listens to your thumbs in its own way, and none of it costs you points. Start with the piano: near the box it sings out, near the edge it whispers.",
    stages: [
      ex("6.1", { why: "Near the box a note sounds strong; out at the edge, soft. Same note, two colours.", clip: "strong", piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 4, bpm: 44, light: true, sound: PIANO, aids: ["rings", "gold", "signs"], pass: { kind: "tries", what: "colour", need: 3 }, hint: "By the box: strong. By the edge: soft." }),
      ex("6.2", { why: "Touch the next note before you lift the last: the sound joins, no gap.", clip: "legato", piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 4, bpm: 44, light: true, sound: PIANO, aids: ["rings", "gold", "join", "signs"], pass: { kind: "tries", what: "joins", need: 3 }, hint: "Pass the note from thumb to thumb, no gap." }),
      ex("6.3", { why: "Touch and let go at once: a short, crisp note.", clip: "short", piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 4, bpm: 44, light: true, sound: PIANO, aids: ["rings", "gold", "signs"], pass: { kind: "tries", what: "short", need: 3 }, hint: "Touch and let go at once: short." }),
      ex("6.4", { why: "A sign over a note: touch it, then rock your thumb. That's a trill.", clip: "shake", piece: "bwv1080-04", voice: 2, fromBar: 50, toBar: 53, skip: 2, count: 13, ornaments: true, light: true, bpm: 44, sound: "harpsichordSampled", aids: ["rings", "gold", "signs"], pass: { kind: "tries", what: "shake", need: 1 }, hint: "Touch the note, then rock your thumb." }),
      ex("6.5", { why: "Keep your thumb down and glide to the next note: the sound slides.", clip: "slide", piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 4, bpm: 44, light: true, sound: "soloVoices", aids: ["rings", "gold", "signs"], pass: { kind: "tries", what: "slide", need: 2 }, hint: "Keep your thumb down and glide to the next note." }),
      ex("6.6", { clip: null, piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 4, bpm: 44, light: true, sound: "gameboy", aids: ["rings", "gold", "signs"], pass: { kind: "tries", what: "any", need: 1 }, hint: "Play it your way." }),
      ex("6.7", { clip: null, piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 4, bpm: 44, light: true, sound: "krautrock", drums: "liebezeit", aids: ["rings", "gold", "signs"], pass: { kind: "tries", what: "any", need: 1 }, hint: "Play it your way." }),
    ],
  },
];

export const FINALE = "That's it. You've played your first fugue, well, its beginning. You're ready for the main game.";

/** The acts open (all six). */
export const ACTS_READY = 6;

/**
 * D941 (design studio; the owner's playtest: "We need a beat during exercises to help player out. Maybe a simple metronome
 * in the beginning. Then it might become drums as the tutorial goes along"): the beat under a stage. Acts I-II a soft click
 * on every beat (the downbeat accented), none where the music waits at every note (1.1: no beat to keep); Acts III-IV the
 * library's plain ROCK kit; Act V a lighter click while the alto is alone (5.1), nothing once it is answered (5.2: the
 * voices keep the time); Act VI each station's sound's own drums, as the game plays them for that piece (drum-library
 * homeFor; PSYCH the calmed LIEBEZEIT, D932). Never louder for a right or a wrong note; it follows the tempo (a notch slower, the beat slower).
 */
export type Beat = { kind: "click"; gain: number } | { kind: "drums"; style: string } | null;
export function beatFor(st: Stage): Beat {
  const act = Number(st.id.split(".")[0]);
  if (st.wait === "all") return null;
  if (act <= 2) return { kind: "click", gain: 0.07 };
  if (act <= 4) return { kind: "drums", style: "rock" };
  if (act === 5) return st.solo ? { kind: "click", gain: 0.05 } : null;
  return { kind: "drums", style: st.drums ?? "home" };
}

/** The help a miss brings, by how many misses the stage has had (1st nothing, 2nd the hint, 3rd the clip, 4th slower). */
export function helpFor(misses: number): "none" | "hint" | "clip" | "slower" {
  if (misses <= 1) return "none";
  if (misses === 2) return "hint";
  if (misses === 3) return "clip";
  return misses % 4 === 0 ? "slower" : "hint";
}
/** A notch slower: 12% of the stage's tempo a notch, at most three notches. */
export const slower = (bpm: number, notches: number) => Math.round(bpm * (1 - 0.12 * Math.min(3, notches)));

/** Whether a take met its stage's rule (the game's own tally and the tutorial's lens). */
export function stagePassed(st: Stage, r: Results): boolean {
  const x = (r as Results & { lens?: LensStats }).lens;
  const p = st.pass;
  switch (p.kind) {
    case "right":
      return r.right >= p.need;
    case "moves":
      return !!x && x.direction.ok >= p.need;
    case "clean":
      return r.of > 0 && r.right >= r.of - p.slips && r.stray <= 1;
    case "holds":
      return !!x && x.held.ok >= p.holds && x.rests.ok >= p.rests;
    case "share":
      return r.of > 0 && r.right >= p.share * r.of;
    case "tries": {
      if (!x) return false;
      const n = p.what === "colour" ? Math.min(x.colour.firm, x.colour.soft) : p.what === "joins" ? x.joins.ok : p.what === "short" ? (x.marks.short.ok || Object.values(x.words).filter((w) => /SHORT|CLEAN/.test(w)).length) : p.what === "shake" ? x.orn.read + x.orn.free : p.what === "slide" ? x.slides : r.right;
      return n >= p.need;
    }
  }
}
