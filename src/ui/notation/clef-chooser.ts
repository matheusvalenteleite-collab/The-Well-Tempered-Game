/**
 * P6: the clefs of an open score, chosen staff by staff and passage by passage (the owner, through
 * the chorale session): G and F clefs only, never a C clef; a clef change marked where a voice moves
 * into another register, as engravers do (a tenor in the F clef taking the G clef where it lies
 * high); the octave clefs (G with an 8 below, F with an 8 above) more rarely than marked changes.
 *
 * Pure: the pitches of each bar of each staff in, a clef for each bar of each staff out. The clef
 * minimises the ledger lines, a change of clef costs a fixed price (so the clef does not flicker
 * for a note or two), and an octave clef costs something in every bar it holds (so that it is taken
 * only where it saves much more than a change would).
 */
import { positionOfPitch, type ClefId } from "./clefs.ts";

export type OpenClef = "treble" | "bass" | "treble_8vb" | "bass_8va";

export interface ClefOptions {
  /** The clefs allowed (default: G, F, and their octave forms). */
  clefs?: readonly OpenClef[];
  /** The price of a change of clef, in ledger lines (default 6). */
  change?: number;
  /** The price of an octave clef, in ledger lines a bar (default 2). */
  octave?: number;
  /** The clef a staff should rather start in and keep through its empty bars, when the choice is even (by index). */
  prefer?: readonly (OpenClef | undefined)[];
}

const ALL: OpenClef[] = ["treble", "bass", "treble_8vb", "bass_8va"];

/**
 * Ledger lines a note needs on a clef, weighted so that far notes cost more than near ones
 * (one ledger line costs 1, two cost 3, three cost 6 ...). Notes inside the staff cost nothing.
 */
export function ledgerCost(clef: ClefId, pitch: string): number {
  const p = positionOfPitch(clef, pitch); // 0 = bottom line, 8 = top line
  const n = p < 0 ? Math.floor(-p / 2) : p > 8 ? Math.floor((p - 8) / 2) : 0;
  return (n * (n + 1)) / 2;
}

/**
 * The clef of every bar of every staff. `bars[s][b]`: the pitches sounding in bar b of staff s
 * (an empty bar takes whatever is cheapest around it). Returns `clefs[s][b]`.
 */
export function chooseClefs(bars: readonly (readonly (readonly string[])[])[], o: ClefOptions = {}): OpenClef[][] {
  const options = o.clefs ?? ALL;
  const change = o.change ?? 6;
  const octave = o.octave ?? 2;
  return bars.map((staff, s) => {
    const n = staff.length;
    if (n === 0) return [];
    // Viterbi over the bars: cost[b][c] the best total ending in clef c at bar b.
    const prefer = o.prefer?.[s];
    // An empty bar (nothing written yet, or a rest) leans to the staff's own clef, its register's.
    const barCost = (b: number, c: OpenClef) => staff[b].reduce((t, p) => t + ledgerCost(c, p), 0) + (c === "treble_8vb" || c === "bass_8va" ? octave : 0) + (!staff[b].length && prefer && c !== prefer ? 0.5 : 0);
    let cost = options.map((c) => barCost(0, c) + (prefer && c !== prefer ? 0.5 : 0));
    const back: number[][] = [];
    for (let b = 1; b < n; b++) {
      const next: number[] = [];
      const from: number[] = [];
      options.forEach((c, j) => {
        let best = Infinity;
        let arg = 0;
        options.forEach((_, i) => {
          const x = cost[i] + (i === j ? 0 : change);
          if (x < best - 1e-9) (best = x), (arg = i);
        });
        next.push(best + barCost(b, c));
        from.push(arg);
      });
      cost = next;
      back.push(from);
    }
    let j = cost.indexOf(Math.min(...cost));
    const out: OpenClef[] = new Array(n);
    for (let b = n - 1; b >= 0; b--) {
      out[b] = options[j];
      if (b > 0) j = back[b - 1][j];
    }
    return out;
  });
}
