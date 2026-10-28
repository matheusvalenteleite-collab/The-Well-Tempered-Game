/**
 * D352: the subject's colour in the music box (the owner: "i would like the color of the notes to change a
 * bit when the subject is playing, consistently to some hue variation of primary color; in double fugues
 * and triple etc, the color will be distinct … when a subject is playing in a distinct non-player voice, it
 * might even get as protagonistic as the player's voice").
 *
 * Each subject (the analysis's `theme`: 1 the first, 2 and 3 the later subjects of a double or triple
 * fugue) has a primary: 1 red, 2 blue, 3 yellow, the same in every piece. A subject note keeps its voice's
 * colour bent toward that primary (a hue variation of red, of blue, of yellow: the voice still told by its
 * own lean, never replaced), and a second cue that does not rely on hue: a rim of the primary round the
 * note (outline), and, while its entry sounds, the voice raised (taller, brighter). The primaries' rims are
 * of distinct lightnesses (yellow the lightest), so red and yellow stay apart where a
 * deuteranope sees both as yellows.
 *
 * Membership is made once per list of notes (which entry each note belongs to, by voice and onset, as the
 * sound's subject cues take it: subject-fx.ts SubjectCues), so the frame looks up an index, never builds a
 * string. Drawing only: nothing here is heard or scored.
 */
import type { Span } from "./box-fx.ts";

/** The subjects' primaries: hue (degrees) and the rim's colour (the outline, the band, the tag, the embers). */
export const SUBJECT_HUES = [0, 0, 218, 50] as const;
export const SUBJECT_RIMS = ["", "#ff5a5a", "#5aa0ff", "#ffe14a"] as const;
/** How far a voice's colour leans off the primary (a share of their hue distance, at most so many degrees). */
const LEAN = 0.3;
/** Red and yellow lean least (a green voice leaning red is orange, the alto's own ink; yellow leaning red is orange too). */
const LEAN_MAX = [0, 12, 20, 6];

/** A subject's number (1, 2, 3) as the analysis marks it. */
export const themeOf = (s: Pick<Span, "theme">): 1 | 2 | 3 => (s.theme === 2 || s.theme === 3 ? s.theme : 1);

function hexToHsl(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return `#${((1 << 24) | (f(0) << 16) | (f(8) << 8) | f(4)).toString(16).slice(1)}`;
}

/** The signed hue distance from `to` to `from`, in (-180, 180]. */
function hueDiff(from: number, to: number): number {
  const d = (((from - to) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** The subject's lightness (yellow lightest, red and blue darker: a cue a deuteranope keeps). */
const THEME_L = [0, 0.6, 0.56, 0.7];

/**
 * A voice's ink as a subject note of `theme` draws it: the primary's hue leaning a little toward the
 * voice's own (so the soprano's subject reads as a magenta-red, the alto's as an orange-red), saturated,
 * the voice's lightness met halfway by the subject's.
 */
export function subjectInk(voiceInk: string, theme: 1 | 2 | 3): string {
  const hsl = hexToHsl(voiceInk);
  if (!hsl) return SUBJECT_RIMS[theme];
  const [h, s, l] = hsl;
  const t = SUBJECT_HUES[theme];
  const lean = Math.max(-LEAN_MAX[theme], Math.min(LEAN_MAX[theme], hueDiff(h, t) * LEAN));
  return hslToHex((t + lean + 360) % 360, Math.max(s, 0.85), (l + THEME_L[theme]) / 2);
}

const inkMemo = new Map<string, string[]>();
/** subjectInk, kept (the frame looks it up). */
export function subjectInkOf(voiceInk: string, theme: 1 | 2 | 3): string {
  let row = inkMemo.get(voiceInk);
  if (!row) inkMemo.set(voiceInk, (row = ["", subjectInk(voiceInk, 1), subjectInk(voiceInk, 2), subjectInk(voiceInk, 3)]));
  return row[theme];
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
