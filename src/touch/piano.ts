/**
 * The Piano (D172): the phone held sideways, a keyboard of every semitone across the bottom, over
 * the voice's whole range (a step of room either side, at least an octave and a half), the notes
 * falling onto their keys from above. The black keys stand in the upper part of the keyboard and on
 * up through the falling notes, so a key is a tall column: a thumb can strike it anywhere above the
 * white keys' lower edge. EASY: any key on time plays Bach's note; NORMAL: the right key, or the key
 * struck sounds as it is (a wrong note is heard). Pure geometry.
 */
const BLACK = new Set([1, 3, 6, 8, 10]);
export const isBlack = (midi: number) => BLACK.has(((midi % 12) + 12) % 12);

export interface Keyboard {
  /** The lowest and highest keys, both white. */
  lo: number;
  hi: number;
  /** How many white keys. */
  whites: number;
}

/** The keyboard for a voice's notes: their range, a white key of room either side, 11 white keys at least. */
export function keyboard(midis: number[]): Keyboard {
  let lo = Math.min(...midis) - 1;
  let hi = Math.max(...midis) + 1;
  while (isBlack(lo)) lo--;
  while (isBlack(hi)) hi++;
  let whites = countWhites(lo, hi);
  while (whites < 11) {
    if (whites % 2) do lo--; while (isBlack(lo));
    else do hi++; while (isBlack(hi));
    whites = countWhites(lo, hi);
  }
  return { lo, hi, whites };
}

function whitesOf(kb: Keyboard): number[] {
  const out: number[] = [];
  for (let m = kb.lo; m <= kb.hi; m++) if (!isBlack(m)) out.push(m);
  return out;
}

function countWhites(lo: number, hi: number): number {
  let n = 0;
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) n++;
  return n;
}

/** A key's span across the width, as fractions [x0, x1). */
export function keySpan(kb: Keyboard, midi: number): [number, number] {
  const w = 1 / kb.whites;
  let i = 0;
  for (let m = kb.lo; m < midi; m++) if (!isBlack(m)) i++;
  if (!isBlack(midi)) return [i * w, (i + 1) * w];
  return [i * w - w * 0.32, i * w + w * 0.32];
}

/** The share of the keyboard's height (from its bottom) where only white keys are struck. */
export const WHITE_ONLY = 0.42;

/**
 * The key under a touch: x across the width, `low` whether it is in the white keys' lower part
 * (below the black keys). Off the ends, the end keys.
 */
export function keyAt(kb: Keyboard, x: number, low: boolean): number {
  const w = 1 / kb.whites;
  const i = Math.max(0, Math.min(kb.whites - 1, Math.floor(x / w)));
  const white = whitesOf(kb)[i];
  if (low) return white;
  const into = x / w - i;
  if (into < 0.32 && white - 1 >= kb.lo && isBlack(white - 1)) return white - 1;
  if (into > 0.68 && white + 1 <= kb.hi && isBlack(white + 1)) return white + 1;
  return white;
}
