/**
 * D487 → D508: src/touch/player-lift-data.ts from the offline scans (scan.cjs, raw: WTG_NOLIFT=1, nothing of the
 * balance applied). OWN_LOUD: each of the 48 fugues on its own sound, the player in every voice: `p` the player's
 * level in each voice and `b` each voice's as the band plays it ([K-weighted, phone] dB), and the balance built from
 * them (player-lift.ts): `t` the band's trims, `l` the player's level match, `h` the player's tone. SOUND_LOUD: by sound
 * and number of voices, `b` each voice's level under the loudest and `off` what the player's way of sounding a voice
 * adds (from twelve fugues on every offered sound, D487's scans, carried over unless a sounds scan is given), and the
 * balance built from them the same way.
 *
 * usage: node tools/touch/player-lift/build.ts <own.json> [sounds.json...]   (more own scans: OWN=<a.json,b.json>)
 * prints the stretches found (a voice more than STRETCH_DB under the loudest sounding voice for STRETCH_SEGS 2-s
 * stretches in a row, Busoni's printed asks excepted) before and after the balance.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fugueById } from "../../../src/touch/fugue.ts";
import { entrySpans } from "../../../src/touch/voice-mode.ts";
import { BAND_ENTRY_DB, BAND_SPREAD_DB, BAND_TRIM_MAX_DB, PLAYER_ENTRY_DB, BRIGHT_MAX_DB, BRIGHT_SLACK_DB, LIFT_MAX_DB, LIFT_MIN_DB } from "../../../src/touch/player-lift.ts";
import { SOUND_LOUD as OLD_SOUND } from "../../../src/touch/player-lift-data.ts";

type Tap = { windows: number; K: number; Ph: number; bright?: number | null; seg?: (number | null)[] };
type Run = { id: string; voice: number; sound: string; voices: Record<string, Tap>; printed?: (number[] | null)[]; segTick?: number[] };
const [ownF, ...soundFs] = process.argv.slice(2);
const load = (f: string): Record<string, Run> => JSON.parse(readFileSync(f, "utf8"));
const own: Record<string, Run> = load(ownF);
for (const f of (process.env.OWN ?? "").split(",").filter(Boolean)) Object.assign(own, load(f));
const snd: Record<string, Run> = {};
for (const f of soundFs) Object.assign(snd, load(f));
// D487's lifts as they stood, by fugue and voice (OLDLIFT=<json>), for the stretches before.
const OLD_LIFT: Record<string, number[]> = process.env.OLDLIFT ? JSON.parse(readFileSync(process.env.OLDLIFT, "utf8")) : {};
const r1 = (x: number) => Math.round(x * 10) / 10;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const ok = (t: Tap | undefined): t is Tap => !!t && t.windows > 50 && Number.isFinite(t.K) && Number.isFinite(t.Ph);
const comb = (x: readonly number[]) => (x[0] + x[1]) / 2;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** A voice more than this under the loudest sounding voice (dB, mean of K and phone) … */
export const STRETCH_DB = 6;
/** … for this many 2-s stretches in a row is a voice lost. */
export const STRETCH_SEGS = 4;
/** Busoni's printed ask: a voice printed this much (dB) or more under the loudest sounding one is meant to be under. */
const PRINTED_ASK_DB = 3;

/** One fugue on one sound: the player's loudness by voice (where measured), the band's by voice, their brightness. */
function levels(runs: Run[]) {
  const n = Math.max(...runs.map((r) => Object.keys(r.voices).filter((k) => /^v\d+$/.test(k)).map((k) => +k.slice(1) + 1)).flat(), ...runs.map((r) => r.voice + 1));
  const p: ([number, number] | null)[] = Array(n).fill(null);
  const b: ([number, number] | null)[] = Array(n).fill(null);
  const pb: (number | null)[] = Array(n).fill(null);
  const bb: (number | null)[] = Array(n).fill(null);
  for (let u = 0; u < n; u++) {
    const me = runs.find((r) => r.voice === u);
    if (me && ok(me.voices.P)) (p[u] = [me.voices.P.K, me.voices.P.Ph]), (pb[u] = me.voices.P.bright ?? null);
    const as = runs.filter((r) => r.voice !== u).map((r) => r.voices[`v${u}`]).filter(ok);
    if (as.length) b[u] = [mean(as.map((t) => t.K)), mean(as.map((t) => t.Ph))];
    const br = as.map((t) => t.bright).filter((x): x is number => typeof x === "number");
    if (br.length) bb[u] = mean(br);
  }
  return b.every((x) => x) ? { n, p, b: b as [number, number][], pb, bb } : null;
}
const group = (R: Record<string, Run>) => {
  const m = new Map<string, Run[]>();
  for (const [k, r] of Object.entries(R)) {
    const key = `${k.split(":")[0]}@${k.includes("@") ? k.split("@")[1] : r.sound}`;
    m.set(key, [...(m.get(key) ?? []), r]);
  }
  return m;
};

/** The trims and the player's level from the levels (dB, the mean of K and phone). */
function balance(b: readonly (readonly number[])[], off: readonly number[]) {
  const top = Math.max(...b.map(comb));
  const t = b.map((x) => r1(clamp(top - BAND_SPREAD_DB - comb(x), 0, BAND_TRIM_MAX_DB)));
  const l = b.map((_, v) => r1(clamp(t[v] - off[v], LIFT_MIN_DB, LIFT_MAX_DB)));
  return { t, l };
}

/** The lost stretches of one run (the player in `r.voice`), with the balance `t`, `l` applied to its 2-s levels. */
function stretches(r: Run, n: number, t: readonly number[], l: readonly number[], raw = false): { u: number; segs: number; worst: number }[] {
  const seg = (u: number) => (u === r.voice ? r.voices.P : r.voices[`v${u}`])?.seg;
  const S = Array.from({ length: n }, (_, u) => seg(u));
  const len = Math.max(0, ...S.map((s) => s?.length ?? 0));
  const out: { u: number; segs: number; worst: number }[] = [];
  // The subject's entries forward as the game plays them (the player's PLAYER_ENTRY_DB, the band's BAND_ENTRY_DB), by the stretch's middle.
  const spans = entrySpans(fugueById(r.id)).filter((e) => e.form !== "counter");
  const ent = (k: number, i: number) => {
    const tk = r.segTick?.[i];
    return !raw && tk !== undefined && spans.some((e) => e.voice === k && e.on <= tk && tk < e.end) ? (k === r.voice ? PLAYER_ENTRY_DB : BAND_ENTRY_DB) : 0;
  };
  for (let u = 0; u < n; u++) {
    let run = 0, best = 0, worst = 0;
    for (let i = 0; i < len; i++) {
      const lv = (k: number) => { const x = S[k]?.[i]; return x == null ? null : x + (k === r.voice ? l[k] : t[k]) + ent(k, i); };
      const me = lv(u);
      const others = [...Array(n).keys()].filter((k) => k !== u && lv(k) !== null);
      const pr = r.printed?.[i];
      let lost = false;
      if (me !== null && others.length) {
        const loud = others.reduce((a, k) => (lv(k)! > lv(a)! ? k : a), others[0]);
        const gap = lv(loud)! - me;
        const asked = pr ? pr[loud] - pr[u] >= PRINTED_ASK_DB : false;
        lost = gap > STRETCH_DB && !asked;
        if (lost) worst = Math.max(worst, gap);
      }
      run = lost ? run + 1 : 0;
      best = Math.max(best, run);
    }
    if (best >= STRETCH_SEGS) out.push({ u, segs: best, worst: r1(worst) });
  }
  return out;
}

// OWN_LOUD: every voice of every fugue on its own sound.
const OWN: Record<string, { s: string; p: number[][]; b: number[][]; t: number[]; l: number[]; h: number[] }> = {};
const report: string[] = [];
let lostBefore = 0, lostAfter = 0;
const mixUp: number[] = [];
for (const [key, runs] of group(own)) {
  const L = levels(runs);
  const [id, s] = key.split("@");
  if (!L || L.p.some((x) => !x)) throw new Error(`${key}: a voice not measured`);
  const off = L.p.map((x, v) => comb(x!) - comb(L.b[v]));
  let { t, l } = balance(L.b, off);
  const zero = Array(L.n).fill(0);
  // the D487 lift as it stood (to the loudest other voice and 1 dB over, K or phone): for the before
  const old = OLD_LIFT[id]?.length === L.n ? OLD_LIFT[id] : L.p.map((x, v) => clamp(Math.max(...L.b.flatMap((y, u) => (u === v ? [] : [y[0] - x![0], y[1] - x![1]]))) + 1, 0, 10));
  const before = runs.flatMap((r) => stretches(r, L.n, zero, old, true));
  lostBefore += before.length;
  // A voice still lost for a long stretch: brought up by half a dB more until it is not (or at the most).
  for (let k = 0; k < 40; k++) {
    const lost = runs.flatMap((r) => stretches(r, L.n, t, l));
    if (!lost.length) break;
    let moved = false;
    for (const u of new Set(lost.map((x) => x.u)))
      if (t[u] < BAND_TRIM_MAX_DB) (t = t.map((x, i) => (i === u ? r1(Math.min(BAND_TRIM_MAX_DB, x + 0.5)) : x))), (moved = true);
    if (!moved) break;
    // no common gain: the least-trimmed voice at 0 (the band brought into balance, not made louder all through)
    const m = Math.min(...t);
    if (m > 0) t = t.map((x) => r1(x - m));
    l = L.b.map((_, v) => r1(clamp(t[v] - off[v], LIFT_MIN_DB, LIFT_MAX_DB)));
  }
  const after = runs.flatMap((r) => stretches(r, L.n, t, l));
  lostAfter += after.length;
  const h = L.p.map((_, v) => (L.pb[v] != null && L.bb[v] != null ? r1(-clamp(L.pb[v]! - L.bb[v]! - BRIGHT_SLACK_DB, 0, BRIGHT_MAX_DB)) : 0));
  const pow = (tt: readonly number[]) => 10 * Math.log10(L.b.reduce((acc, x, u) => acc + 10 ** ((comb(x) + tt[u]) / 10), 0));
  mixUp.push(pow(t) - pow(zero));
  report.push(`${id} ${s} mix +${r1(pow(t) - pow(zero))} dB t=${JSON.stringify(t)} l=${JSON.stringify(l)} h=${JSON.stringify(h)} old=${JSON.stringify(old.map(r1))} lost before ${before.map((x) => `v${x.u}:${x.segs}x2s(${x.worst})`).join(",") || "-"} after ${after.map((x) => `v${x.u}:${x.segs}x2s(${x.worst})`).join(",") || "-"}`);
  OWN[id] = { s, p: L.p.map((x) => x!.map(r1)), b: L.b.map((x) => x.map(r1)), t, l, h };
}
// SOUND_LOUD: by sound and number of voices; D487's measured balance carried over, a sound re-measured replaced.
const SOUND: Record<string, Record<number, { b: number[][]; off: number[][]; t: number[]; l: number[]; h: number[] }>> = {};
for (const [s, by] of Object.entries(OLD_SOUND)) for (const [n, x] of Object.entries(by)) (SOUND[s] ??= {})[+n] = { b: x.b, off: x.off, t: [], l: [], h: [] };
const acc = new Map<string, { b: number[][][]; off: number[][][] }>();
for (const [key, runs] of group(snd)) {
  const L = levels(runs);
  if (!L) continue;
  const k = `${key.split("@")[1]}:${L.n}`;
  const a = acc.get(k) ?? { b: [], off: [] };
  const top = [Math.max(...L.b.map((x) => x[0])), Math.max(...L.b.map((x) => x[1]))];
  a.b.push(L.b.map((x) => [x[0] - top[0], x[1] - top[1]]));
  a.off.push(L.p.map((x, v) => (x ? [x[0] - L.b[v][0], x[1] - L.b[v][1]] : [NaN, NaN])));
  acc.set(k, a);
}
for (const [k, a] of acc) {
  const [s, ns] = k.split(":");
  const n = +ns;
  const col = (rows: number[][][], v: number, j: number) => rows.map((r) => r[v][j]).filter(Number.isFinite);
  const offAll = (j: number) => a.off.flatMap((r) => r.map((x) => x[j])).filter(Number.isFinite);
  const b = Array.from({ length: n }, (_, v) => [r1(mean(col(a.b, v, 0))), r1(mean(col(a.b, v, 1)))]);
  const off = Array.from({ length: n }, (_, v) => [0, 1].map((j) => r1(col(a.off, v, j).length ? mean(col(a.off, v, j)) : mean(offAll(j)))));
  (SOUND[s] ??= {})[n] = { b, off, t: [], l: [], h: [] };
}
for (const by of Object.values(SOUND))
  for (const x of Object.values(by)) {
    const B = balance(x.b, x.off.map(comb));
    x.t = B.t;
    x.l = B.l;
    x.h = x.b.map(() => 0);
  }
const fmt = (x: unknown) => JSON.stringify(x);
const lines = [
  "/**",
  " * D487 → D508: the voices' loudness as the game sounds them, measured raw (tools/touch/player-lift/scan.cjs, an offline",
  " * render of the whole game, nothing of the balance applied; built by tools/touch/player-lift/build.ts), and the",
  " * balance built from it (player-lift.ts). Each pair is [K-weighted, through a phone speaker] in dB. OWN_LOUD: each fugue",
  " * on its own sound (PIECE_SOUND), `p` the player's voice as the player sounds it, `b` each voice as the band sounds it;",
  " * `t` the band's trim per voice, `l` the player's level per voice, `h` the player's tone per voice (dB). SOUND_LOUD: by",
  " * sound and number of voices, `b` each voice's level under the loudest, `off` what the player's way of sounding that",
  " * voice adds, and `t`, `l`, `h` the same. Generated: do not edit.",
  " */",
  `export const OWN_LOUD: Readonly<Record<string, { s: string; p: number[][]; b: number[][]; t: number[]; l: number[]; h: number[] }>> = {`,
  ...Object.keys(OWN).sort().map((id) => `  ${id}: { s: ${fmt(OWN[id].s)}, p: ${fmt(OWN[id].p)}, b: ${fmt(OWN[id].b)}, t: ${fmt(OWN[id].t)}, l: ${fmt(OWN[id].l)}, h: ${fmt(OWN[id].h)} },`),
  "};",
  `export const SOUND_LOUD: Readonly<Record<string, Readonly<Record<number, { b: number[][]; off: number[][]; t: number[]; l: number[]; h: number[] }>>>> = {`,
  ...Object.keys(SOUND).sort().map((s) => `  ${s}: { ${Object.entries(SOUND[s]).map(([n, x]) => `${n}: { b: ${fmt(x.b)}, off: ${fmt(x.off)}, t: ${fmt(x.t)}, l: ${fmt(x.l)}, h: ${fmt(x.h)} }`).join(", ")} },`),
  "};",
  "",
];
if (!process.env.DRY) writeFileSync(new URL("../../../src/touch/player-lift-data.ts", import.meta.url), lines.join("\n"));
console.log(report.join("\n"));
console.log(`the band's mix brought up by the trims: mean ${r1(mean(mixUp))} dB, most ${r1(Math.max(...mixUp))} dB`);
console.log(`OWN_LOUD ${Object.keys(OWN).length} fugues, SOUND_LOUD ${Object.keys(SOUND).length} sounds; lost stretches (voice x run): before ${lostBefore}, after ${lostAfter}`);
