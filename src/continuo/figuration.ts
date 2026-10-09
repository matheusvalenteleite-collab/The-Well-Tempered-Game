/**
 * Figuration of the right hand (D110): the realized chords broken into arpeggios or repeated in a
 * rhythm, on a grid that keeps to the bar (a bar is two half-note beats), whatever the preset.
 * The last bar keeps its held chord; a trill keeps its note. Each figured note remembers its rank
 * in the chord it came from (0 = the top), so an ensemble keeps giving each part its own notes.
 */
export type FigurationId =
  | "arpUp" | "arpDown" | "alberti" | "triplets" | "arpeggiando"
  | "quarters" | "eighths" | "afterbeat" | "dotted" | "tresillo";
export const ARPEGGIOS: FigurationId[] = ["arpUp", "arpDown", "alberti", "triplets", "arpeggiando"];
export const PATTERNS: FigurationId[] = ["quarters", "eighths", "afterbeat", "dotted", "tresillo"];
export const FIGURATIONS: FigurationId[] = [...ARPEGGIOS, ...PATTERNS];

interface Held {
  start: number;
  end: number;
  midi: number;
  bar: number;
  ornament?: string;
}
export type Figured<T> = T & { rank?: number; low?: boolean };

/** Hits of a rhythmic pattern within one bar: [beat offset, length], in half-note beats. */
const RHYTHM: Record<string, [number, number][]> = {
  quarters: [0, 0.5, 1, 1.5].map((t) => [t, 0.45]),
  eighths: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75].map((t) => [t, 0.22]),
  afterbeat: [0.25, 0.75, 1.25, 1.75].map((t) => [t, 0.2]),
  dotted: [[0, 0.7], [0.75, 0.22], [1, 0.7], [1.75, 0.22]],
  tresillo: [[0, 0.7], [0.75, 0.7], [1.5, 0.45]],
};
/** Arpeggios: the step (beats) and the order of the chord's notes (0 = lowest). */
const ARPEGGIO: Record<string, { step: number; order: (size: number, i: number) => number }> = {
  arpUp: { step: 0.25, order: (n, i) => i % n },
  arpDown: { step: 0.25, order: (n, i) => n - 1 - (i % n) },
  alberti: { step: 0.25, order: (n, i) => [0, n - 1, Math.min(1, n - 1), n - 1][i % 4] },
  triplets: { step: 1 / 3, order: (n, i) => i % n },
};

const EPS = 1e-9;

export function figure<T extends Held>(rh: T[], id: FigurationId, lastBar: number): Figured<T>[] {
  const keep = rh.filter((n) => n.ornament === "trill" || n.bar >= lastBar);
  const notes = rh.filter((n) => !keep.includes(n));
  const cuts = [...new Set(notes.flatMap((n) => [n.start, n.end]))].sort((a, b) => a - b);
  const out: Figured<T>[] = keep.map((n) => ({ ...n }));
  for (let c = 0; c + 1 < cuts.length; c++) {
    const a = cuts[c];
    const b = cuts[c + 1];
    const chord = notes.filter((n) => n.start <= a + EPS && n.end >= b - EPS).sort((x, y) => x.midi - y.midi);
    if (!chord.length) continue;
    const tagged = chord.map((n, i) => ({ ...n, rank: chord.length - 1 - i, low: i === 0 }));
    const add = (n: (typeof tagged)[number], from: number, to: number) => {
      if (Math.min(b, to) - from > EPS) out.push({ ...n, start: from, end: Math.min(b, to) });
    };
    if (id === "arpeggiando") {
      // A harp's roll: the chord spread upwards from the start and from every beat, then held.
      const beats = [a];
      for (let t = Math.floor(a + EPS) + 1; t < b - EPS; t++) beats.push(t);
      for (const t of beats) tagged.forEach((n, i) => add(n, Math.min(t + i / 16, b - 0.01), t + 1));
      continue;
    }
    const rhythm = RHYTHM[id];
    if (rhythm) {
      const hits: [number, number][] = [];
      for (let bar = Math.floor(a / 2 + EPS) * 2; bar < b - EPS; bar += 2) for (const [o, d] of rhythm) if (bar + o >= a - EPS && bar + o < b - EPS) hits.push([bar + o, d]);
      if (id !== "afterbeat" && (!hits.length || hits[0][0] > a + EPS)) hits.unshift([a, Math.min(0.45, hits.length ? hits[0][0] - a : b - a)]);
      for (const [t, d] of hits) for (const n of tagged) add(n, t, t + d);
      continue;
    }
    const arp = ARPEGGIO[id];
    const first = Math.ceil(a / arp.step - EPS) || 0; // not -0
    if (first * arp.step > a + EPS) add(tagged[tagged.length - 1], a, first * arp.step);
    for (let k = first; k * arp.step < b - EPS; k++) {
      const t = k * arp.step;
      // The order counts from the bar line, so that a chord change does not restart the figure.
      const i = k - Math.round((Math.floor(t / 2 + EPS) * 2) / arp.step);
      add(tagged[arp.order(tagged.length, i)], t, t + arp.step * 0.95);
    }
  }
  return out.sort((x, y) => x.start - y.start || x.midi - y.midi);
}
