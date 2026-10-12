// Review aid (I1): every cadence recorded in data/inventions/readings/*.json set against the notes. For each,
// the bass's last two notes (the one before the arrival and the one at it, or within a beat after it if the
// bass rests on the beat) and the top voice's note at the arrival, as degrees of the cadence's key. A PAC
// should show bass 5-1 and the top on 1 (the highest note sounding, chords included); an IAC 5-1 with the
// top on 3 or 5, or an inverted dominant (bass 7-1, V6; or 2-1, V4/3), as the gold protocol allows; an HC
// ends on 5. Mismatches are printed for reading by hand; nothing is changed.
// Usage: node tools/inventions/cadences-check.ts [id]
import { readdirSync, readFileSync } from "node:fs";
import { TPQ, type WtcPiece } from "../../src/wtc/corpus.ts";
import { degree, line } from "../../src/wtc/fugue.ts";
import { parsePitch } from "../../src/music/pitch.ts";

const pieces = JSON.parse(readFileSync("data/wtc/inventions.json", "utf8")) as WtcPiece[];
const only = process.argv[2];
const dir = "data/inventions/readings";

/** "G", "a", "f#", "Bb", "E flat", "c minor" → tonic letter with accidental, and mode. */
function parseKey(k: string): { tonic: string; mode: "major" | "minor" } | null {
  const m = k.trim().match(/^([A-Ga-g])\s*(#|b|flat|sharp)?\s*(major|minor)?/);
  if (!m) return null;
  const acc = m[2] === "#" || m[2] === "sharp" ? "#" : m[2] === "b" || m[2] === "flat" ? "b" : "";
  const mode = m[3] ? (m[3] as "major" | "minor") : m[1] === m[1].toLowerCase() ? "minor" : "major";
  return { tonic: m[1].toUpperCase() + acc, mode };
}

let checked = 0;
let flagged = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const r = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  if (only && r.id !== only) continue;
  const p = pieces.find((x) => x.id === r.id)!;
  const [num, den] = p.meter.split("/").map(Number);
  const barLen = (num * 4 * TPQ) / den;
  const beat = (4 * TPQ) / den;
  const first = p.bars.find((x) => x.n === 1)?.on ?? 0;
  const lines = p.voices.map(line);
  const bass = lines[lines.length - 1];
  for (const c of r.cadences ?? []) {
    const [b, bt] = String(c.at).split(":").map(Number);
    const t = first + (b - 1) * barLen + (bt - 1) * beat;
    const key = parseKey(String(c.key));
    if (!key) {
      console.log(`${r.id} ${c.at} ${c.kind}: cannot read key "${c.key}"`);
      continue;
    }
    const at = bass.find((n) => n.on <= t && n.on + n.dur > t) ?? bass.find((n) => n.on > t && n.on < t + beat);
    const before = [...bass].reverse().find((n) => n.on < (at?.on ?? t) && n.pitch !== at?.pitch);
    // The highest note sounding at the arrival, chord notes included (a final chord is written as a chord).
    const all = p.voices.flat().map(([on, dur, pitch]) => ({ on, dur, pitch }));
    const sounding = all.filter((n) => n.on <= t && n.on + n.dur > t);
    const pool = sounding.length ? sounding : all.filter((n) => n.on > t && n.on < t + beat);
    const sop = pool.sort((x, y) => parsePitch(y.pitch).midi - parsePitch(x.pitch).midi)[0];
    const deg = (n?: { pitch: string }) => (n ? degree(n.pitch, key.tonic, key.mode).deg : "-");
    const found = `${deg(before)}-${deg(at)}`;
    const topDeg = deg(sop);
    const kind = String(c.kind);
    let bad = "";
    if (kind === "PAC" && found !== "5-1") bad = `bass ${found}, not 5-1`;
    if (kind === "IAC" && !["5-1", "7-1", "2-1"].includes(found)) bad = `bass ${found}, not 5-1 or an inverted dominant`;
    if (kind === "PAC" && topDeg !== 1) bad += `${bad ? "; " : ""}top on ${topDeg}, not 1`;
    if (kind === "HC" && deg(at) !== 5) bad = `bass ends on ${deg(at)}, not 5`;
    checked++;
    if (bad) {
      flagged++;
      console.log(`${r.id} ${c.at} ${c.kind} ${c.key} (reader: bass ${c.bass ?? "?"}): ${bad} [bass ${before?.pitch}→${at?.pitch}, top ${sop?.pitch}]`);
    }
  }
}
console.log(`${checked} cadences checked, ${flagged} to read by hand`);
