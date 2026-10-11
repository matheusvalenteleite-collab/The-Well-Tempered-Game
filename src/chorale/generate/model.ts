/**
 * Counts of an outcome in a context, backed off to coarser contexts where the fine one is thin:
 * the model of tools/chorales/harmony_plans.py (Witten-Bell style interpolation, add-one at the
 * bottom), so that the generator's probabilities are the ones the level studies measured.
 */
export type Ctx = Record<string, string>;

export class Backoff {
  readonly vocab: string[];
  readonly fields: string[];
  readonly target: string;
  private readonly base: Map<string, number>;
  private readonly levels: Map<string, Map<string, number>>[];
  private readonly cache = new Map<string, Map<string, number>>();

  constructor(rows: Ctx[], fields: string[], target: string) {
    this.fields = fields;
    this.target = target;
    const totals = new Map<string, number>();
    for (const r of rows) totals.set(r[target], (totals.get(r[target]) ?? 0) + 1);
    this.vocab = [...totals.keys()].sort();
    const n = rows.length;
    this.base = new Map(this.vocab.map((c) => [c, (totals.get(c)! + 1) / (n + this.vocab.length)]));
    this.levels = fields.map(() => new Map());
    for (const r of rows) {
      for (let k = 0; k < fields.length; k++) {
        const key = this.key(r, k);
        const m = this.levels[k].get(key) ?? new Map<string, number>();
        m.set(r[target], (m.get(r[target]) ?? 0) + 1);
        this.levels[k].set(key, m);
      }
    }
  }

  private key(c: Ctx, k: number) {
    return this.fields
      .slice(0, k + 1)
      .map((f) => c[f])
      .join("|");
  }

  /** The counts at the k-th context level (0 = the first field alone). */
  counts(c: Ctx, k: number): Map<string, number> | undefined {
    return this.levels[k].get(this.key(c, k));
  }

  /** The probability of every outcome in the vocabulary, in this context. */
  dist(c: Ctx): Map<string, number> {
    const ck = this.key(c, this.fields.length - 1);
    const hit = this.cache.get(ck);
    if (hit) return hit;
    let p = new Map(this.base);
    for (let k = 0; k < this.fields.length; k++) {
      const cnt = this.levels[k].get(this.key(c, k));
      if (!cnt) continue;
      let n = 0;
      for (const v of cnt.values()) n += v;
      const lam = n / (n + cnt.size);
      const q = new Map<string, number>();
      for (const [o, pr] of p) q.set(o, (lam * (cnt.get(o) ?? 0)) / n + (1 - lam) * pr);
      p = q;
    }
    this.cache.set(ck, p);
    return p;
  }
}

/** A distribution raised to 1/T and renormalized over `allowed` (T = 1: as counted; T < 1 sharper). */
export function temper(p: Map<string, number>, allowed: Iterable<string>, T: number): Map<string, number> {
  const out = new Map<string, number>();
  let z = 0;
  for (const o of allowed) {
    const v = Math.pow(p.get(o) ?? 0, 1 / T);
    out.set(o, v);
    z += v;
  }
  if (z > 0) for (const [o, v] of out) out.set(o, v / z);
  return out;
}

/** Draw from a distribution with a uniform number in [0, 1). */
export function draw(p: Map<string, number>, u: number): string {
  let z = 0;
  for (const v of p.values()) z += v;
  let x = u * z;
  let last = "";
  for (const [o, v] of p) {
    last = o;
    x -= v;
    if (x < 0) return o;
  }
  return last;
}
