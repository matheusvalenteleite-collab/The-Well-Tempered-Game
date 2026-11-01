/**
 * D487: src/touch/player-lift-data.ts from the offline scans (scan.cjs): each of the 48 fugues on its own sound, the
 * player in every voice (OWN_LOUD: the player's loudness in each voice, and each voice's as the band plays it, K-weighted
 * and through a phone speaker, dB); and the band's balance by sound and number of voices (SOUND_LOUD: each voice's level
 * under the loudest, and what the player's way of sounding a voice adds to it), from twelve fugues on every offered sound
 * with the own-sound scans folded in.
 *
 * usage: node tools/touch/player-lift/build.ts <own.json> <sounds.json> [override.json...]
 * (an override's runs replace the same runs of the others: a re-measure after a change, e.g. the piano's line.)
 */
import { readFileSync, writeFileSync } from "node:fs";

type Tap = { windows: number; K: number; Ph: number };
type Run = { id: string; voice: number; sound: string; voices: Record<string, Tap> };
const [ownF, soundsF, ...over] = process.argv.slice(2);
const load = (f: string): Record<string, Run> => JSON.parse(readFileSync(f, "utf8"));
const own = load(ownF);
const snd = load(soundsF);
for (const f of over) {
  const o = load(f);
  for (const [k, r] of Object.entries(o)) {
    if (k.includes("@")) snd[k] = r;
    else own[k] = r;
  }
}
const r1 = (x: number) => Math.round(x * 10) / 10;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const ok = (t: Tap | undefined): t is Tap => !!t && t.windows > 50 && Number.isFinite(t.K) && Number.isFinite(t.Ph);

/** One fugue on one sound: the player's loudness by voice (where measured) and the band's by voice. */
function levels(runs: Run[]): { n: number; p: ([number, number] | null)[]; b: ([number, number] | null)[] } | null {
  const n = Math.max(...runs.map((r) => Object.keys(r.voices).filter((k) => /^v\d+$/.test(k)).map((k) => +k.slice(1) + 1)).flat(), ...runs.map((r) => r.voice + 1));
  const p: ([number, number] | null)[] = Array(n).fill(null);
  const b: ([number, number] | null)[] = Array(n).fill(null);
  for (let u = 0; u < n; u++) {
    const me = runs.find((r) => r.voice === u);
    if (me && ok(me.voices.P)) p[u] = [me.voices.P.K, me.voices.P.Ph];
    const as = runs.filter((r) => r.voice !== u).map((r) => r.voices[`v${u}`]).filter(ok);
    if (as.length) b[u] = [mean(as.map((t) => t.K)), mean(as.map((t) => t.Ph))];
  }
  return b.every((x) => x) ? { n, p, b } : null;
}
const group = (R: Record<string, Run>) => {
  const m = new Map<string, Run[]>();
  for (const [k, r] of Object.entries(R)) {
    const key = `${k.split(":")[0]}@${k.includes("@") ? k.split("@")[1] : r.sound}`;
    m.set(key, [...(m.get(key) ?? []), r]);
  }
  return m;
};

// OWN_LOUD: every voice of every fugue on its own sound.
const OWN: Record<string, { s: string; p: number[][]; b: number[][] }> = {};
for (const [key, runs] of group(own)) {
  const L = levels(runs);
  const [id, s] = key.split("@");
  if (!L || L.p.some((x) => !x)) throw new Error(`${key}: a voice not measured`);
  OWN[id] = { s, p: L.p.map((x) => x!.map(r1)), b: L.b.map((x) => x!.map(r1)) };
}
// SOUND_LOUD: by sound and number of voices, the band's levels under the loudest voice and the player's offset.
const acc = new Map<string, { b: number[][][]; off: number[][][] }>();
const add = (s: string, L: NonNullable<ReturnType<typeof levels>>) => {
  const k = `${s}:${L.n}`;
  const a = acc.get(k) ?? { b: [], off: [] };
  const top = [Math.max(...L.b.map((x) => x![0])), Math.max(...L.b.map((x) => x![1]))];
  a.b.push(L.b.map((x) => [x![0] - top[0], x![1] - top[1]]));
  a.off.push(L.p.map((x, v) => (x ? [x[0] - L.b[v]![0], x[1] - L.b[v]![1]] : [NaN, NaN])));
  acc.set(k, a);
};
for (const [key, runs] of group(snd)) {
  const L = levels(runs);
  if (L) add(key.split("@")[1], L);
}
for (const [key, runs] of group(own)) {
  const L = levels(runs);
  if (L) add(key.split("@")[1], L);
}
const SOUND: Record<string, Record<number, { b: number[][]; off: number[][] }>> = {};
for (const [k, a] of [...acc].sort()) {
  const [s, ns] = k.split(":");
  const n = +ns;
  const col = (rows: number[][][], v: number, j: number) => rows.map((r) => r[v][j]).filter(Number.isFinite);
  const offAll = (j: number) => a.off.flatMap((r) => r.map((x) => x[j])).filter(Number.isFinite);
  const b = Array.from({ length: n }, (_, v) => [r1(mean(col(a.b, v, 0))), r1(mean(col(a.b, v, 1)))]);
  const off = Array.from({ length: n }, (_, v) => [0, 1].map((j) => r1(col(a.off, v, j).length ? mean(col(a.off, v, j)) : mean(offAll(j)))));
  (SOUND[s] ??= {})[n] = { b, off };
}
const fmt = (x: unknown) => JSON.stringify(x);
const lines = [
  "/**",
  " * D487: the voices' loudness as the game sounds them, measured (tools/touch/player-lift/scan.cjs, an offline render of",
  " * the whole game; built by tools/touch/player-lift/build.ts). Each pair is [K-weighted, through a phone speaker] in dB.",
  " * OWN_LOUD: each fugue on its own sound (PIECE_SOUND), `p` the player's voice as the player sounds it, `b` each voice",
  " * as the band sounds it. SOUND_LOUD: by sound and number of voices, `b` each voice's level under the loudest (the",
  " * band's balance), `off` what the player's way of sounding that voice adds to the band's. Generated: do not edit.",
  " */",
  `export const OWN_LOUD: Readonly<Record<string, { s: string; p: number[][]; b: number[][] }>> = {`,
  ...Object.keys(OWN).sort().map((id) => `  ${id}: { s: ${fmt(OWN[id].s)}, p: ${fmt(OWN[id].p)}, b: ${fmt(OWN[id].b)} },`),
  "};",
  `export const SOUND_LOUD: Readonly<Record<string, Readonly<Record<number, { b: number[][]; off: number[][] }>>>> = {`,
  ...Object.keys(SOUND).sort().map((s) => `  ${s}: { ${Object.entries(SOUND[s]).map(([n, x]) => `${n}: { b: ${fmt(x.b)}, off: ${fmt(x.off)} }`).join(", ")} },`),
  "};",
  "",
];
writeFileSync(new URL("../../../src/touch/player-lift-data.ts", import.meta.url), lines.join("\n"));
console.log(`OWN_LOUD ${Object.keys(OWN).length} fugues, SOUND_LOUD ${Object.keys(SOUND).length} sounds`);
