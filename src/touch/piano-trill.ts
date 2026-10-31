/**
 * D385 (WTC 1.88, the panel's report §6), THE PIANISTIC TRILL. The piano's trill sounded like a typewriter:
 * its speed snapped to a subdivision of the beat (ornaments.ts trillUnit: every note the same length to a
 * millisecond), every note the same loudness, both pitches from one recording (the grand is sampled every
 * minor third), each note damped dry as the next began, and on a phone the main note heard first while
 * the shake was read. A pianist's trill leans on its first note, speeds up and settles, its upper notes
 * lighter and a little uneven, the two strings blurring into a shimmer because neither is quite damped.
 *
 * pianoTrill re-times a trill's realisation (its pitches, its span, its Nachschlag) on the piano:
 *   SPEED: unsnapped (seconds, not beats): the first note leaned (LEAN × the starting unit, +LEAN_DB),
 *     then from `rate0` accelerating (time constant ACCEL) to `rate1` a second: the character by the
 *     tempo (TRILL_CHARACTERS: relaxed 6.5→9.5, singing 7.5→11.5, brilliant 9→14, never above 14);
 *   UNEVEN: main notes UNEVEN longer than the auxiliary ones, ±JIT_MS fixed jitter (a hash: the same
 *     every run, never random), the whole stretched to its span;
 *   LIGHTER: auxiliary notes AUX_DB, ±JIT_DB fixed; a taper TAPER over a long trill;
 *   TERMINATION: the Nachschlag (lower note, main note) at the cruising speed into the next note (C. P. E.
 *     Bach's rule, as before), else a settle on the main note for the last SETTLE of the span;
 *   OVERLAP: each note held OVERLAP_S into the next, the dampers half-seated (DAMP_MUL: chip.ts
 *     Play.dampMul), and the auxiliary pitch from the other neighbouring recording (Play.altSample).
 * The start: from the upper note (Bach) unless asked from the main note (Busoni's own realisation).
 */

export type TrillCharacter = "relaxed" | "singing" | "brilliant";
export const TRILL_CHARACTERS: Readonly<Record<TrillCharacter, { rate0: number; rate1: number }>> = {
  relaxed: { rate0: 6.5, rate1: 9.5 },
  singing: { rate0: 7.5, rate1: 11.5 },
  brilliant: { rate0: 9, rate1: 14 },
};
export const PIANO_TRILL = {
  /** The speed's time constant (s) from rate0 to rate1. */
  accel: 0.35,
  /** The first note leaned: this many starting units long, this many dB over. */
  lean: 1.6,
  leanDb: 1,
  /** Main notes this share longer, auxiliary this share shorter. */
  uneven: 0.06,
  /** Fixed jitter of each onset (ms) and level (dB), by a hash of its place. */
  jitMs: 6,
  jitDb: 0.6,
  /** The auxiliary notes lighter (dB). */
  auxDb: -2.5,
  /** A long trill's taper (dB from its start to its end). */
  taper: [0.5, -3] as const,
  /** Without a Nachschlag: the last share of the span settled on the main note. */
  settle: 0.16,
  /** Each note held this far into the next (s): the finger overlap. */
  overlap: 0.018,
  /** The dampers half-seated (× their time). */
  dampMul: 1.8,
} as const;

/** The trill's character by the beat's length (s): slow pieces relaxed, quick ones brilliant. */
export const trillCharacter = (beatS: number): TrillCharacter => (beatS >= 1 ? "relaxed" : beatS <= 0.5 ? "brilliant" : "singing");

const hash = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export interface PianoTrill {
  /** [onset tick, length ticks, MIDI] as realise gives them. */
  parts: [number, number, number][];
  /** dB on each part (the lean, the lighter auxiliaries, the taper, the jitter). */
  db: number[];
  /** s each part is held past its length (the overlap). */
  over: number[];
  /** Each part an auxiliary (upper or lower) note. */
  aux: boolean[];
  /** The other pitch of the alternation (Play.altSample). */
  partner: number[];
}

/**
 * A trill's realisation `parts` (from realise: its span, its pitches) re-timed on the piano, `tps` ticks
 * a second. `start`: the upper note first (Bach) or the main (Busoni); `nachschlag`: end with it.
 * Undefined where there is no room for an alternation (the realisation as it was).
 */
export function pianoTrill(parts: readonly (readonly [number, number, number])[], main: number, tps: number, o: { start?: "upper" | "main"; nachschlag?: boolean; character?: TrillCharacter } = {}): PianoTrill | undefined {
  if (parts.length < 3) return undefined;
  const T = PIANO_TRILL;
  const ch = TRILL_CHARACTERS[o.character ?? "singing"];
  const t0 = parts[0][0];
  const lastP = parts[parts.length - 1];
  const span = (lastP[0] + lastP[1] - t0) / tps;
  const ps = [...new Set(parts.map((p) => p[2]))];
  const ups = ps.filter((p) => p > main);
  const U = ups.length ? Math.min(...ups) : main + 2;
  const lows = ps.filter((p) => p < main);
  const L = lows.length ? Math.max(...lows) : main - (U - main === 1 ? 2 : 1);
  const nach = o.nachschlag ?? lows.length > 0;
  const rate = (t: number) => ch.rate1 + (ch.rate0 - ch.rate1) * Math.exp(-t / T.accel);
  const endU = 1 / ch.rate1;
  const altEnd = nach ? span - 2 * endU : span * (1 - T.settle);
  const startUpper = o.start !== "main";
  const seq: { s: number; d: number; p: number; aux: boolean }[] = [];
  let t = 0;
  for (let i = 0; ; i++) {
    const aux = startUpper ? i % 2 === 0 : i % 2 === 1;
    let d = 1 / rate(t);
    if (i === 0) d *= T.lean;
    d *= aux ? 1 - T.uneven : 1 + T.uneven;
    if (t + d > altEnd + 1e-6) break;
    seq.push({ s: t, d, p: aux ? U : main, aux });
    t += d;
  }
  // The alternation ends on a main note.
  while (seq.length && seq[seq.length - 1].aux) seq.pop();
  if (seq.length < 2) return undefined;
  // Stretched to fill its time exactly, then each onset (never the first) a few fixed ms off.
  const have = seq[seq.length - 1].s + seq[seq.length - 1].d;
  const k = altEnd / have;
  for (const x of seq) (x.s *= k), (x.d *= k);
  const jit = T.jitMs / 1000;
  for (let j = 1; j < seq.length; j++) {
    const dj = Math.max(-0.3 * seq[j - 1].d, Math.min(0.3 * seq[j].d, (hash(j) - 0.5) * 2 * jit));
    seq[j].s += dj;
    seq[j - 1].d += dj;
    seq[j].d -= dj;
  }
  if (nach) seq.push({ s: altEnd, d: endU, p: L, aux: true }, { s: altEnd + endU, d: span - altEnd - endU, p: main, aux: false });
  else seq[seq.length - 1].d = span - seq[seq.length - 1].s;
  const n = seq.length;
  const db = seq.map((x, j) => {
    const f = j / Math.max(1, n - 1);
    return (x.aux ? T.auxDb : 0) + T.taper[0] + (T.taper[1] - T.taper[0]) * f + (j === 0 ? T.leanDb : 0) + (hash(j + 7) - 0.5) * 2 * T.jitDb;
  });
  return {
    parts: seq.map((x) => [t0 + x.s * tps, Math.max(1, x.d * tps), x.p] as [number, number, number]),
    db,
    over: seq.map((_x, j) => (j < n - 1 ? T.overlap : 0)),
    aux: seq.map((x) => x.aux),
    partner: seq.map((x) => (x.p === main ? (x.aux ? main : U) : main)),
  };
}
