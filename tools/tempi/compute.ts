/**
 * D199: each fugue's NORMAL and SLOW tempo from the durations in data/tempi/recordings.csv.
 *
 *   node tools/tempi/compute.ts            # writes data/tempi/tempi.json, prints the summary table
 *
 * Every recording's duration is turned into an average quarter-note tempo (the piece's length in
 * quarters, from data/touch/pieces.json, × 60 / seconds).
 * NORMAL (D285, the tempo played; D312: the 35th percentile and 5.5 notes a second): on the slow side of the recordings (the owner: "avoid excessively
 * fast tempos in this game even if they're recommended by the experts"): the 15th percentile (85% of
 * the recordings go faster), lowered further so the busiest voice's sustained load stays at 4.5 notes
 * a second, but never under the slowest recording (a tempo some musician chose). The median is kept.
 * A duration includes the final chord's sounding and any closing ritardando, so the average is a few
 * per cent under the running tempo, alike for every recording (fugues have no repeats).
 *
 * SLOW (easy mode): 62% of NORMAL, but no more than keeps the busiest voice's sustained load (the
 * 90th percentile of its onsets in a sliding 2-second window, as the playability audit measured it)
 * at 3 notes a second, and no less than 45% of NORMAL or 30; rounded to an even number.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
type Piece = { id: string; kind: string; meter: string; tpq: number; length: number; voices: [number, number, number, number][][] };
const pieces: Piece[] = JSON.parse(readFileSync(new URL("data/touch/pieces.json", ROOT), "utf8"));

/** A CSV line's fields (double quotes as RFC 4180). */
function fields(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** "m:ss" or "h:mm:ss" to seconds. */
function seconds(d: string): number {
  return d.split(":").reduce((a, x) => a * 60 + Number(x), 0);
}

const lines = readFileSync(new URL("data/tempi/recordings.csv", ROOT), "utf8").trim().split("\n");
const head = fields(lines[0]);
const rows = lines.slice(1).map((l) => Object.fromEntries(fields(l).map((v, i) => [head[i], v])));

/** The q-th quantile, linearly interpolated (q in 0..1). */
function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const p = (s.length - 1) * q, i = Math.floor(p);
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (p - i) : s[i];
}

/** The busiest voice's 90th-percentile onsets a second (2-second window, every 0.5 s) at ♩ = 60. */
function busiest60(f: Piece): number {
  let worst = 0;
  for (const v of f.voices) {
    const ons = [...new Set(v.map((n) => n[0]))].sort((a, b) => a - b).map((t) => t / f.tpq);
    if (ons.length < 2) continue;
    const d: number[] = [];
    for (let t = ons[0]; t < ons[ons.length - 1]; t += 0.5) {
      let c = 0;
      for (const o of ons) if (o >= t && o < t + 2) c++;
      d.push(c / 2);
    }
    const s = d.sort((a, b) => a - b);
    worst = Math.max(worst, s[Math.min(s.length - 1, Math.floor(0.9 * s.length))]);
  }
  return worst;
}

/** The conventional beat of a meter: its symbol and how many of it make a quarter note. */
export function beatUnit(meter: string): { unit: string; perQuarter: number } {
  const [n, d] = meter.split("/").map(Number);
  if (d === 2) return { unit: "𝅗𝅥", perQuarter: 0.5 };
  if (d === 4) return n === 6 ? { unit: "𝅗𝅥.", perQuarter: 1 / 3 } : { unit: "♩", perQuarter: 1 };
  if (d === 8) return { unit: "♩.", perQuarter: 2 / 3 };
  if (d === 16) return { unit: "♪.", perQuarter: 4 / 3 };
  throw new Error(meter);
}

// D312: back toward the recordings (the owner: "the overall tempos have now started to sound overly slow …
// revert … or at least a little bit more in that direction, though … avoid overly fast tempos"): the
// 35th percentile (was the 15th), the busiest voice at most 5.5 notes a second (was 4.5).
const GAME_Q = 0.35, GAME_LOAD = 5.5;
const SLOW_SHARE = 0.62, MIN_SHARE = 0.45, LOAD = 3.0, FLOOR = 30;
const even = (x: number) => Math.round(x / 2) * 2;

const out: Record<string, unknown> = {};
const table: string[] = ["| piece | meter | n | median ♩ | IQR ♩ | normal | slow | unit: normal / slow | flag |", "|---|---|---|---|---|---|---|---|---|"];
for (const f of pieces) {
  if (f.kind !== "fugue" && !f.id.startsWith("bwv1080")) continue;
  const quarters = f.length / f.tpq;
  const recs = rows.filter((r) => r.piece === f.id);
  const bpms = recs.map((r) => (quarters * 60) / seconds(r.duration));
  if (!bpms.length) throw new Error(`no recordings for ${f.id}`);
  const med = quantile(bpms, 0.5), q1 = quantile(bpms, 0.25), q3 = quantile(bpms, 0.75);
  const load = busiest60(f);
  const normal = Math.round(Math.max(Math.min(...bpms), Math.min(quantile(bpms, GAME_Q), (GAME_LOAD / load) * 60)));
  const byLoad = (LOAD / load) * 60;
  const slow = Math.max(FLOOR, even(Math.max(MIN_SHARE * normal, Math.min(SLOW_SHARE * normal, byLoad))));
  const { unit, perQuarter } = beatUnit(f.meter);
  const unitBpm = { normal: Math.round(normal * perQuarter), slow: Math.round(slow * perQuarter) };
  const flag = recs.length < 5 ? "fewer than 5" : "";
  out[f.id] = {
    normal, median: Math.round(med), slow, unit, unitBpm, n: recs.length,
    iqr: [Math.round(q1), Math.round(q3)], range: [Math.round(Math.min(...bpms)), Math.round(Math.max(...bpms))],
    busiest: Math.round(load * (normal / 60) * 10) / 10,
    ...(flag ? { flag } : {}),
  };
  table.push(`| ${f.id} | ${f.meter} | ${recs.length} | ${med.toFixed(1)} | ${Math.round(q1)}–${Math.round(q3)} | ${normal} | ${slow} | ${unit} ${unitBpm.normal} / ${unitBpm.slow} | ${flag} |`);
}
const json = Object.entries(out).map(([id, t]) => `  ${JSON.stringify(id)}: ${JSON.stringify(t)}`);
writeFileSync(new URL("data/tempi/tempi.json", ROOT), `{\n${json.join(",\n")}\n}\n`);
console.log(table.join("\n"));
