/**
 * The subject's notes in the music box: which notes belong to an entry (membership), which subject
 * (themeOf), and how raised a voice is while its entry sounds (raiseOf). Drawing only: nothing here is
 * heard or scored.
 *
 * NO SUBJECT HUE (the design studio, the owner: tinting subject notes was "a bad idea; makes the colour
 * coding inscrutable"): D352's primaries and D368's per-voice hue turns are gone. Every note keeps its
 * voice's own ink; the subject is shown by its effect (HOP), its entry marks (box-fx.ts entryMarks) and
 * the raise. The effects' sparkle is the voice's own ink toward white (paleOf), never another hue.
 *
 * Membership is made once per list of notes (which entry each note belongs to, by voice and onset, as the
 * sound's subject cues take it: subject-fx.ts SubjectCues), so the frame looks up an index, never builds a
 * string.
 */
import type { Span } from "./box-fx.ts";

/** A subject's number (1, 2, 3) as the analysis marks it. */
export const themeOf = (s: Pick<Span, "theme">): 1 | 2 | 3 => (s.theme === 2 || s.theme === 3 ? s.theme : 1);

/** A voice's ink (#rrggbb) toward white by `k` (no hue turned), as #rrggbb. */
export function paler(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const ch = (sh: number) => Math.round(((v >> sh) & 255) + (255 - ((v >> sh) & 255)) * k);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
const paleMemo = new Map<string, string>();
/** The voice's own ink, pale (half toward white): an effect's light, kept per ink. */
export function paleOf(voiceInk: string): string {
  let p = paleMemo.get(voiceInk);
  if (!p) paleMemo.set(voiceInk, (p = paler(voiceInk, 0.5)));
  return p;
}

/** The fade of a voice raised as its entry begins and ends (ms). */
export const RAISE_FADE_MS = 150;

/**
 * How raised an entry's voice is at `now` (0 to 1): up over RAISE_FADE_MS before its first note (so it is
 * fully raised as the subject begins), held to its end, down over RAISE_FADE_MS after.
 */
export function raiseOf(s: { on: number; end: number }, now: number, tps: number): number {
  const fade = (RAISE_FADE_MS / 1000) * tps;
  if (fade <= 0) return now >= s.on && now < s.end ? 1 : 0;
  const up = (now - (s.on - fade)) / fade;
  const down = (s.end + fade - now) / fade;
  const w = Math.min(up, down, 1);
  return w <= 0 ? 0 : w * w * (3 - 2 * w);
}

type Voiced = { on: number; voice?: number };

interface Member {
  spans: readonly Span[];
  n: number;
  /** Per note: the index (into spans) of the entry it belongs to, or -1. */
  idx: Int16Array;
}
const memo = new WeakMap<readonly Voiced[], Member>();

/**
 * Which entry each note of a list belongs to (an index into `spans`, -1 for none): a note is the
 * subject's where its voice states an entry (subject, answer, inverted, augmented: every form the
 * analysis marks; not the countersubject) with a note at its onset. The first entry to claim a note keeps
 * it (as the sound's cues do). Made once per list and spans (and again if the list grows).
 * `voice` gives the voice of a note that carries none (the player's own list).
 */
export function membership(list: readonly Voiced[], spans: readonly Span[], voice = -1): Int16Array {
  const had = memo.get(list);
  if (had && had.spans === spans && had.n === list.length) return had.idx;
  const at = new Map<number, number>();
  spans.forEach((s, i) => {
    if (s.form === "counter") return;
    for (const p of s.path) {
      const k = p.on * 32 + s.voice;
      if (!at.has(k)) at.set(k, i);
    }
  });
  const idx = new Int16Array(list.length).fill(-1);
  for (let i = 0; i < list.length; i++) {
    const n = list[i];
    const v = n.voice ?? voice;
    if (v < 0) continue;
    idx[i] = at.get(n.on * 32 + v) ?? -1;
  }
  memo.set(list, { spans, n: list.length, idx });
  return idx;
}
