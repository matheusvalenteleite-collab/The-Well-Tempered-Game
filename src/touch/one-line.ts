/**
 * D456, ONE NOTE AT A TIME (the owner: "Whenever there are 'double notes', the player's voice should be assigned only one
 * of them. The additional ones should be assigned to the game to play … there's no indication of which one the player
 * should aim to play, and this creates unwanted errors which are unfair"). The player's line gets exactly one note per
 * onset: the one that continues the voice's line, nearest to the note kept before it and to the notes after it; on a
 * tie, the top note for an upper voice, the bottom note for the lowest (the bass, the left hand). The others are the
 * game's: they still sound, drawn and played as the accompaniment, never a target, never scored. Pure.
 */
export interface Onset {
  on: number;
  midi: number;
}

/** Splits a voice's notes (sorted by onset) into the player's line, one note per onset, and the notes left to the game. */
export function oneLine<N extends Onset>(notes: readonly N[], lowest: boolean): { kept: N[]; extra: N[] } {
  const groups: N[][] = [];
  for (const n of notes) {
    const g = groups.at(-1);
    if (g && g[0].on === n.on) g.push(n);
    else groups.push([n]);
  }
  const kept: N[] = [];
  const extra: N[] = [];
  let prev: number | null = null;
  groups.forEach((g, i) => {
    let pick = g[0];
    if (g.length > 1) {
      const next = groups[i + 1];
      const cost = (m: number) => (prev === null ? 0 : Math.abs(m - prev)) + (next ? Math.min(...next.map((x) => Math.abs(m - x.midi))) : 0);
      pick = g.reduce((best, n) => {
        const d = cost(n.midi) - cost(best.midi);
        if (d < 0) return n;
        if (d > 0) return best;
        return lowest ? (n.midi < best.midi ? n : best) : n.midi > best.midi ? n : best;
      });
      for (const n of g) if (n !== pick) extra.push(n);
    }
    kept.push(pick);
    prev = pick.midi;
  });
  return { kept, extra };
}
