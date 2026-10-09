/**
 * The voices of a fugue (D123), found from its notes: as many lines as the most notes sounding at
 * once; at each onset the new notes, highest first, go to the free lines in the same order (voices
 * do not cross at an onset), each to the free line that keeps the order and costs least (the leap
 * from the line's last note, more for a line that has rested long). The number of voices is the
 * polyphony that holds for all but 5% of the piece; the notes of each entry of the subject (D121)
 * are kept in one line, the line its first note goes to.
 */
import type { FullNote } from "./entries.ts";

const EPS = 1e-6;

export function separateVoices(notes: FullNote[], anchors: number[][] = []): { voice: number[]; count: number } {
  const order = notes.map((_, i) => i).sort((a, b) => notes[a].at - notes[b].at || notes[b].midi - notes[a].midi);
  // The number of voices: the polyphony that holds for all but 5% of the piece's time (a final
  // chord or a spread cadence does not make a voice).
  const times = [...new Set(notes.map((n) => n.at))].sort((a, b) => a - b);
  const end = Math.max(...notes.map((n) => n.at + n.dur));
  const span: Record<number, number> = {};
  times.forEach((t, i) => {
    const n = notes.filter((m) => m.at <= t + EPS && t < m.at + m.dur - EPS).length;
    span[n] = (span[n] ?? 0) + ((times[i + 1] ?? end) - t);
  });
  let count = 1;
  let acc = 0;
  for (const n of Object.keys(span).map(Number).sort((a, b) => b - a)) {
    acc += span[n];
    if (acc > end * 0.05) {
      count = n;
      break;
    }
  }
  // Notes of an entry of the subject stay together: the first note's line takes the rest.
  const follow = new Map<number, number>();
  for (const a of anchors) for (const i of a.slice(1)) follow.set(i, a[0]);
  const voice = new Array<number>(notes.length).fill(0);
  const last: { midi: number; end: number }[] = Array.from({ length: count }, (_, v) => ({ midi: 84 - (v * 36) / Math.max(1, count - 1), end: -1e9 }));
  let k = 0;
  while (k < order.length) {
    const t = notes[order[k]].at;
    const group: number[] = [];
    while (k < order.length && Math.abs(notes[order[k]].at - t) < EPS) group.push(order[k++]);
    // Lines free at t, top to bottom (by their place in the texture, not by their last pitch).
    // Entry notes go to their entry's line first.
    for (const i of [...group]) {
      const head = follow.get(i);
      if (head === undefined) continue;
      const v = voice[head];
      voice[i] = v;
      last[v] = { midi: notes[i].midi, end: notes[i].at + notes[i].dur };
      group.splice(group.indexOf(i), 1);
    }
    const free = last.map((l, v) => ({ v, l })).filter(({ l }) => l.end <= t + EPS);
    if (!free.length) {
      // More notes than voices (a chord): each to the nearest line.
      for (const i of group) voice[i] = last.reduce((b, l, v) => (Math.abs(l.midi - notes[i].midi) < Math.abs(last[b].midi - notes[i].midi) ? v : b), 0);
      continue;
    }
    // Assign the group (highest first) to free lines in order, at least cost (dynamic programming).
    const g = group.slice(0, free.length);
    for (const i of group.slice(free.length)) voice[i] = last.reduce((b, l, v) => (Math.abs(l.midi - notes[i].midi) < Math.abs(last[b].midi - notes[i].midi) ? v : b), 0);
    const cost = (gi: number, fi: number) => {
      const l = free[fi].l;
      const rest = Math.max(0, t - l.end);
      return Math.abs(notes[g[gi]].midi - l.midi) + (l.end < -1e8 ? 0 : Math.min(6, rest));
    };
    const G = g.length;
    const F = free.length;
    const dp: number[][] = Array.from({ length: G + 1 }, () => new Array<number>(F + 1).fill(Infinity));
    const pick: boolean[][] = Array.from({ length: G + 1 }, () => new Array<boolean>(F + 1).fill(false));
    for (let f = 0; f <= F; f++) dp[0][f] = 0;
    for (let gi = 1; gi <= G; gi++)
      for (let f = gi; f <= F; f++) {
        const skip = dp[gi][f - 1];
        const take = dp[gi - 1][f - 1] + cost(gi - 1, f - 1);
        if (take <= skip) (dp[gi][f] = take), (pick[gi][f] = true);
        else dp[gi][f] = skip;
      }
    let gi = G;
    let f = F;
    while (gi > 0) {
      if (pick[gi][f]) {
        const v = free[f - 1].v;
        const n = notes[g[gi - 1]];
        voice[g[gi - 1]] = v;
        last[v] = { midi: n.midi, end: n.at + n.dur };
        gi--;
      }
      f--;
    }
  }
  // Number the voices from the top by their average pitch.
  const avg = Array.from({ length: count }, (_, v) => {
    const xs = notes.filter((_, i) => voice[i] === v);
    return xs.reduce((a, n) => a + n.midi, 0) / Math.max(1, xs.length);
  });
  const rank = avg.map((a, v) => ({ a, v })).sort((x, y) => y.a - x.a).map((x) => x.v);
  const renum = new Array<number>(count);
  rank.forEach((v, r) => (renum[v] = r));
  return { voice: voice.map((v) => renum[v]), count };
}
