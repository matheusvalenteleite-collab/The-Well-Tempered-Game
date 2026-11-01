/**
 * D332 (WTC 1.49): chromatic neighbours in the music box. Its rows are staff steps, so F and F♯ (or E♭
 * and E♮) share a row; the owner disliked them drawn at the same height. A note altered against the
 * piece's key signature (an accidental the signature does not give it) is drawn a fraction of a row up
 * when raised (♯, or ♮ on a flat of the key) and down when lowered (♭, or ♮ on a sharp of the key), with
 * a small pixel sign on its block where the block is big enough. Drawing only: LADDER judges by staff
 * steps (rows.stepAt) as before.
 */

/** Letters C D E F G A B as staff steps 0–6. */
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
/** The order sharps (F C G D A E B) and flats (B E A D G C F) enter a signature, as staff letters. */
const SHARPS = [3, 0, 4, 1, 5, 2, 6];

/** A key's signature ("c", "Eb", "f#": minor in lower case): each letter's alteration, C to B (+1 a sharp, −1 a flat). */
export function signatureOf(key: string): number[] {
  const letters: Record<string, number> = { f: -1, c: 0, g: 1, d: 2, a: 3, e: 4, b: 5 };
  const l = key[0]?.toLowerCase() ?? "c";
  let fifths = letters[l] ?? 0;
  if (key[1] === "#") fifths += 7;
  else if (key[1] === "b") fifths -= 7;
  if (key[0] && key[0] === key[0].toLowerCase()) fifths -= 3;
  const sig = [0, 0, 0, 0, 0, 0, 0];
  for (let q = 0; q < Math.min(7, Math.abs(fifths)); q++) {
    const letter = fifths > 0 ? SHARPS[q] : SHARPS[6 - q];
    sig[letter] = fifths > 0 ? 1 : -1;
  }
  return sig;
}

/** How a pitch on a staff step is altered against the signature: +1 raised (up), −1 lowered (down), 0 as the key has it. */
export function alterAgainst(step: number, midi: number, sig: readonly number[]): -1 | 0 | 1 {
  const letter = ((step % 7) + 7) % 7;
  const nat = NATURAL[letter] + 12 * (Math.floor(step / 7) + 1);
  const d = midi - nat - sig[letter];
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/** The sign written: ♯ / ♭ for a sharp or flat, ♮ for a natural against the key. */
export function signOf(step: number, midi: number): "sharp" | "flat" | "natural" | "double" {
  const letter = ((step % 7) + 7) % 7;
  const nat = NATURAL[letter] + 12 * (Math.floor(step / 7) + 1);
  const a = midi - nat;
  return a === 0 ? "natural" : a === 1 ? "sharp" : a === -1 ? "flat" : "double";
}

/** The fraction of a row an altered note is drawn off its row, by the canvas pixels a row has (at least 1 px). */
export function chromaShift(rowPx: number): number {
  return rowPx < 3 ? 0 : Math.max(1, Math.round(rowPx * 0.35));
}

/** The signs as pixel glyphs, 3 wide and 4 high ("1" a pixel). */
export const SIGN_PIXELS: Record<"sharp" | "flat" | "natural" | "double", string[]> = {
  sharp: ["101", "111", "111", "101"],
  flat: ["100", "110", "101", "110"],
  natural: ["100", "111", "111", "001"],
  double: ["101", "010", "010", "101"],
};

/**
 * D414 (WTC 2.02): how far (CSS px, up positive) the CLASSIC box draws a note above its row's middle, as
 * paintClassic does (its canvas row `rowCss / px` rounded, at least 2; the shift of an altered note), so
 * that LADDER aims a slide at the block the player sees rather than at the bare row.
 */
export function chromaLiftPx(rowCss: number, step: number, midi: number, sig: readonly number[], px = 2): number {
  return alterAgainst(step, midi, sig) * chromaShift(Math.max(2, Math.round(rowCss / px))) * px;
}
