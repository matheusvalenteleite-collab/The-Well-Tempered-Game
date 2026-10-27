/**
 * D340: the MORE BACH pieces (data/touch/more-bach.json) checked against a second source, privately:
 * the bars and the voices, and how many attacks (onset, pitch) agree.
 *   - the Inventions and Sinfonias against the Humdrum encodings held for study (data/wtc/inventions.json:
 *     Huron 1994 and Sapp 2024, never published);
 *   - the Art of Fugue and the ricercars against Craig Sapp's 2024 kern (github.com/craigsapp/
 *     art-of-the-fugue, bach-musical-offering; no licence stated: read here, never shipped), given as folders;
 *   - BWV 1043 against CCARH's MuseData (bitbucket.org/musedata/bach, bg/orch/1043/stage2; personal
 *     research use only: read here, never shipped): the bars of each part.
 *
 *   node tools/touch/more-bach-check.ts [--aof DIR] [--mo DIR] [--musedata-1043 DIR]
 *
 * Prints a Markdown table (the one in data/sources/*\/SOURCE.md).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { parseKern } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
type F = { id: string; bars: { n: number; on: number }[]; voices: [number, number, number, number][][]; length: number };
const more: F[] = JSON.parse(readFileSync(`${ROOT}data/touch/more-bach.json`, "utf8"));
const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const lastBar = (bars: { n: number }[]) => bars.at(-1)?.n ?? 0;
/** The share of a's attacks (onset from its first, MIDI) that b holds, both shifted to begin at 0. */
function agree(a: [number, number][], b: [number, number][]): number {
  const a0 = Math.min(...a.map((x) => x[0]));
  const b0 = Math.min(...b.map((x) => x[0]));
  // Either notated at other values (the Canon alla Decima: Mutopia's 12/8 against Sapp's 4/4, every value half again): the best of a few uniform scales.
  // Aligned at their first notes, or at 0 (a note one edition has before the other's first).
  return Math.max(
    ...[1, 1.5, 2 / 3, 2, 0.5].flatMap((k) =>
      [
        [a0, b0],
        [0, 0],
      ].map(([x0, y0]) => {
        const s = new Set(b.map(([on, m]) => `${Math.round((on - y0) * k)}:${m}`));
        return a.filter(([on, m]) => s.has(`${on - x0}:${m}`)).length / Math.max(1, a.length);
      }),
    ),
  );
}
const attacks = (f: F) => f.voices.flat().map((n) => [n[0], n[2]] as [number, number]);
const rows: string[] = ["| piece | bars (Mutopia) | bars (other) | voices | voices (other) | attacks agreeing |", "|---|---|---|---|---|---|"];
const row = (id: string, b1: number, b2: number | string, v1: number, v2: number | string, share: number | null) =>
  rows.push(`| ${id} | ${b1} | ${b2} | ${v1} | ${v2} | ${share === null ? "—" : `${(share * 100).toFixed(1)}%`} |`);

// The Inventions and Sinfonias against the study's Humdrum.
const inv: WtcPiece[] = JSON.parse(readFileSync(`${ROOT}data/wtc/inventions.json`, "utf8"));
for (const f of more.filter((x) => /^bwv(7[789]\d|80[01])$/.test(x.id))) {
  const n = Number(f.id.slice(3));
  const other = inv.find((p) => p.id === (n <= 786 ? `inven${String(n - 771).padStart(2, "0")}` : `sinfo${String(n - 786).padStart(2, "0")}`));
  if (!other) continue;
  const oa = other.voices.flat().filter((x) => x[1] > 0).map((x) => [x[0], parsePitch(x[2]).midi] as [number, number]);
  row(f.id, lastBar(f.bars), lastBar(other.bars), f.voices.length, other.voices.length, agree(attacks(f), oa));
}

// The Art of Fugue and the ricercars against Sapp's kern.
const KERN: Record<string, [string, string]> = {
  "bwv1079-ric3": ["--mo", "offering-001.krn"],
  "bwv1079-ric6": ["--mo", "offering-002.krn"],
  "bwv1080-c15": ["--aof", "artfugue-012.krn"],
  "bwv1080-c17": ["--aof", "artfugue-013.krn"],
  "bwv1080-c16": ["--aof", "artfugue-014.krn"],
  "bwv1080-c14": ["--aof", "artfugue-015.krn"],
  "bwv1080-13r": ["--aof", "artfugue-016a.krn"],
  "bwv1080-13i": ["--aof", "artfugue-016b.krn"],
  "bwv1080-12r": ["--aof", "artfugue-018a.krn"],
  "bwv1080-12i": ["--aof", "artfugue-018b.krn"],
};
for (let i = 1; i <= 11; i++) KERN[`bwv1080-${String(i).padStart(2, "0")}`] = ["--aof", `artfugue-${String(i).padStart(3, "0")}.krn`];
for (const f of more) {
  const k = KERN[f.id];
  const dir = k && arg(k[0]);
  if (!k || !dir || !existsSync(`${dir}/${k[1]}`)) continue;
  const p = parseKern(readFileSync(`${dir}/${k[1]}`, "utf8"));
  const oa = p.voices.flat().filter((x) => x.dur > 0).map((x) => [x.on, parsePitch(x.pitch).midi] as [number, number]);
  row(f.id, lastBar(f.bars), lastBar(p.bars), f.voices.length, p.voices.length, agree(attacks(f), oa));
}

// BWV 1043 against MuseData: each part's last bar.
const md = arg("--musedata-1043");
if (md)
  for (let m = 1; m <= 3; m++) {
    const f = more.find((x) => x.id === `bwv1043-${m}`)!;
    const dir = `${md}/${String(m).padStart(2, "0")}`;
    if (!existsSync(dir)) continue;
    const parts = readdirSync(dir)
      .filter((x) => /^\d+$/.test(x))
      .sort()
      .map((x) => {
        const lines = readFileSync(`${dir}/${x}`, "latin1").split("\n");
        const name = lines[8]?.trim() ?? x;
        const bars = lines.filter((l) => /^measure\s+\d+/.test(l)).map((l) => Number(l.split(/\s+/)[1]));
        return `${name} ${Math.max(0, ...bars)}`;
      });
    row(f.id, lastBar(f.bars), parts.join("; "), f.voices.length, parts.length, null);
  }
// D341: BWV 228 against MuseData (bg/vocal/0228/stage2/01, its 8 parts as files 01-08): each part's last
// bar, and its notes against Brodersen's (both sections' together; MuseData writes choir II out where the
// choirs sing together, bars 78-148, Brodersen's edition gives those bars to choir I's staves alone).
const md228 = arg("--musedata-228");
if (md228 && existsSync(md228)) {
  const a = more.find((x) => x.id === "bwv228-1")!;
  const b = more.find((x) => x.id === "bwv228-2")!;
  const parts = readdirSync(md228)
    .filter((x) => /^\d+$/.test(x))
    .sort()
    .map((x, i) => {
      const lines = readFileSync(`${md228}/${x}`, "latin1").split("\n");
      const bars = lines.filter((l) => /^measure\s+\d+/.test(l)).map((l) => Number(l.split(/\s+/)[1]));
      const notes = lines.filter((l) => /^[A-G][#f]*\d /.test(l)).length;
      const ours = a.voices[i].length + b.voices[i].length;
      return `${lines[8]?.trim() ?? x} ${i < 4 ? "I" : "II"}: ${Math.max(0, ...bars)} bars, ${notes} notes (Brodersen ${ours})`;
    });
  rows.push(`| bwv228 | ${lastBar(b.bars)} | ${parts.join("; ")} | 8 | ${parts.length} | — |`);
}
// D341: BWV 54 against MuseData (bg/cant/0054/stage1: never proofread): each part's last bar, movements 1 and 3.
const md54 = arg("--musedata-54");
if (md54)
  for (const m of [1, 3]) {
    const f = more.find((x) => x.id === `bwv54-${m}`)!;
    const dir = `${md54}/${String(m).padStart(2, "0")}`;
    if (!existsSync(dir)) continue;
    const parts = readdirSync(dir)
      .filter((x) => /^\d+$/.test(x))
      .sort()
      .map((x) => {
        const lines = readFileSync(`${dir}/${x}`, "latin1").split("\n");
        const bars = lines.filter((l) => /^measure\s+\d+/.test(l)).map((l) => Number(l.split(/\s+/)[1]));
        return `${lines[8]?.trim() ?? x} ${Math.max(0, ...bars)}`;
      });
    rows.push(`| ${f.id} | ${lastBar(f.bars)} | ${parts.join("; ")} | ${f.voices.length} | ${parts.length} | — |`);
  }
console.log(rows.join("\n"));
