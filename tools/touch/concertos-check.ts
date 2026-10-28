/**
 * D348: the HARPSICHORD CONCERTOS (data/touch/concertos.json) checked against second editions, privately
 * (none of them shipped): for each movement, the bars, and how many attacks (onset from the movement's
 * start, pitch) of the whole texture and of the harpsichord(s)' top line(s) the other edition has (the best
 * of a few shifts within a bar, for an upbeat written as a full bar of rests or a pickup's place).
 *
 *   node tools/touch/concertos-check.ts DIR
 *
 * DIR holds the second editions as fetched (scratchpad/concertos/ of D348): pdmx/ (the PDMX MusicXML of
 * Arpicembalo, Leon Kopecny, Edward James Maurath, verits99's other versions and Erisceres, CC0 or public
 * domain), mutopia-1055/mids/ (Mutopia's BWV 1055, Javier Ruiz-Alma, CC BY-SA 4.0: its MIDI files) and
 * imslp-1057/x/ (Andrea Marcialis's LilyPond, WIMA/IMSLP #221098, CC BY-NC 3.0). Prints a Markdown table
 * (the one in data/sources/bach-harpsichord-concertos/SOURCE.md).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import { readMidi } from "./midi.ts";
import { readMusicXml, type Transpose } from "./musicxml.ts";
import { readLy } from "./more-bach.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = process.argv[2];
if (!DIR) throw new Error("usage: node tools/touch/concertos-check.ts DIR");
type F = { id: string; bars: { n: number; on: number }[]; voices: [number, number, number, number][][]; playable: number[]; voiceNames: string[]; barTicks: number };
const pieces: F[] = JSON.parse(readFileSync(`${ROOT}data/touch/concertos.json`, "utf8"));

/** A movement of the other edition: all its attacks, and its keyboard's. */
type Other = { bars: number; all: [number, number][]; keys: [number, number][] };
interface Second {
  bwv: number;
  label: string;
  independent: string;
  movements: (Other | null)[];
}

/** PDMX MusicXML (the measures of each movement by index; the keyboard parts by index). */
function xml(file: string, ranges: ([number, number] | null)[], keyboard: number[], transpose?: Transpose): (Other | null)[] {
  const x = readMusicXml(`${DIR}/pdmx/${file}`, transpose);
  return ranges.map((r) => {
    if (!r) return null;
    const from = x.measures[r[0]].on;
    const to = r[1] < x.measures.length ? x.measures[r[1]].on : x.length;
    const pick = (ps: number[]) => ps.flatMap((p) => x.parts[p].notes.filter((n) => n[0] >= from && n[0] < to).map((n) => [n[0] - from, parsePitch(n[2]).midi] as [number, number]));
    return { bars: r[1] - r[0], all: pick(x.parts.map((_, i) => i)), keys: pick(keyboard) };
  });
}
/** Mutopia's MIDI, a file a movement (the keyboard: the tracks "upper" and "lower"). */
function mid(files: string[]): Other[] {
  return files.map((f) => {
    const m = readMidi(readFileSync(`${DIR}/${f}`));
    const k = TPQ / m.division;
    const pick = (keep: (name: string) => boolean) => m.tracks.filter((t) => keep(t.name)).flatMap((t) => t.notes.map(([on, , midi]) => [Math.round(on * k), midi] as [number, number]));
    const all = pick(() => true);
    const sig = m.times[0] ?? { num: 4, den: 4 };
    const end = Math.max(...m.tracks.flatMap((t) => t.notes.map(([on, dur]) => (on + dur) * k)));
    return { bars: Math.round(end / ((sig.num * 4 * TPQ) / sig.den)), all, keys: pick((n) => /upper|lower/.test(n)) };
  });
}
/** LilyPond (lily_json.py): a \score a movement; the keyboard's staves named. */
function ly(file: string, scores: number[], keyStaves: string[]): Other[] {
  return scores.map((s) => {
    const r = readLy(`${DIR}/${file}`, s);
    const t = (f: string) => {
      const [n, d] = f.split("/").map(Number);
      return Math.round((n / d) * 4 * TPQ);
    };
    const notes = r.notes.filter((n) => !n.grace && n.dur !== "0/1");
    return { bars: r.measures.length, all: notes.map((n) => [t(n.on), n.midi]), keys: notes.filter((n) => keyStaves.includes(n.staff)).map((n) => [t(n.on), n.midi]) };
  });
}

const PDMX = {
  arpicembalo1052: "mxl/15/34/QmXNoQc8cTQn7Wfzae84RUAYsjkR2ViWAe7N1HE8zLsDjG.mxl",
  kopecny1052a: "mxl/12/55/QmUYYW8Knxf2ncUGxrqTZ4vVCfE4g4GMMxXie4ZjcH8ZN2.mxl",
  kopecny1052b: "mxl/4/36/QmepUekZmUeg2xojRfyGQKxfZTnYmYZKRkqYu3o6n4cy3D.mxl",
  maurath1053: "mxl/13/42/QmVstGqipBJjZZSta9FNjmCBRSiLz5Nz8TtnVTTQ5HQvyf.mxl",
  maurath1054: "mxl/10/28/QmSkgjsxcvoSJU4ab5NaugrGUwCxSf8SWMgUPCJYiWMHTy.mxl",
  maurath1055: "mxl/3/19/QmdfEs8oLM3KFDdQUVDJ82go6CYrpqKuVoCrZ8gHDNgg4m.mxl",
  verits1060: "mxl/2/19/Qmcf9N7MsWndP4F6mv5usrvviHTi4CpT7CsRCA6EmrxyQh.mxl",
  verits1061: "mxl/2/37/QmcP8PE2NLhdFM8bAQ23QVTnRCTFRGMzmt8DiF3GL33oWg.mxl",
  verits1062: "mxl/11/51/QmTWSMZE4PrFdpLAPyJ219ar4oe64hGwKjBXrWnynUCKu8.mxl",
  erisceres1065: "mxl/2/17/Qmceecd5h2GccrU97UVk8PzEny2Pf3XxXRXxmnBGCKxaL3.mxl",
};
const IND = "yes";
const SECONDS: Second[] = [
  { bwv: 1052, label: "Arpicembalo (MuseScore 6362714, CC0)", independent: IND, movements: xml(PDMX.arpicembalo1052, [[0, 190], [190, 277], [277, 563]], [5]) },
  {
    bwv: 1052, label: "Leon Kopecny (MuseScore 5994893, 6001078, CC0)", independent: IND,
    movements: [...xml(PDMX.kopecny1052a, [[0, 190]], [4]), ...xml(PDMX.kopecny1052b, [[0, 87]], [4]), null],
  },
  { bwv: 1053, label: "Edward James Maurath (MuseScore 5989124, CC0; PDMX flags a licence conflict)", independent: "partly (Maurath's other concertos credit verits99)", movements: xml(PDMX.maurath1053, [[0, 176], [176, 213], [213, 608]], [5, 6]) },
  { bwv: 1054, label: "Edward James Maurath (MuseScore 5073330, CC0; licence conflict flagged)", independent: "no (\"includes some work by verits99\")", movements: xml(PDMX.maurath1054, [[0, 174], [174, 231], [231, 391]], [5, 6]) },
  {
    bwv: 1055, label: "Mutopia 2050, Javier Ruiz-Alma (BGA 1869; CC BY-SA 4.0): its MIDI", independent: IND,
    movements: mid(["bwv1055-mov1-allegro.mid", "bwv1055-mov2-larghetto.mid", "bwv1055-mov3-allegro-manontanto.mid"].map((f) => `mutopia-1055/mids/${f}`)),
  },
  { bwv: 1055, label: "Edward James Maurath (MuseScore 5073314, CC0; licence conflict flagged)", independent: "no (\"based partly on the work of verits99\")", movements: xml(PDMX.maurath1055, [[0, 105], [105, 144], [144, 345]], [5, 6]) },
  { bwv: 1057, label: "Andrea Marcialis (WIMA, IMSLP #221098, LilyPond; CC BY-NC 3.0)", independent: IND, movements: ly("imslp-1057/x/score.ly", [0, 1, 2], ["up", "down"]) },
  { bwv: 1060, label: "verits99's version for four keyboards (MuseScore 33725, CC0)", independent: "no (the same editor)", movements: xml(PDMX.verits1060, [[0, 110], [110, 148], [148, 327]], [0, 1]) },
  { bwv: 1061, label: "verits99's version for four keyboards (MuseScore 33724, CC0)", independent: "no (the same editor)", movements: xml(PDMX.verits1061, [[0, 167], [167, 231], [231, 371]], [0, 1]) },
  { bwv: 1062, label: "verits99's version for four keyboards (MuseScore 33723, CC0)", independent: "no (the same editor)", movements: xml(PDMX.verits1062, [[0, 88], [88, 139], [139, 294]], [0, 1]) },
  { bwv: 1065, label: "Erisceres, III only (MuseScore 1536826, public domain mark; work in progress)", independent: IND, movements: [null, null, ...xml(PDMX.erisceres1065, [[0, 123]], [5, 6, 7, 8])] },
];

/** The share of a's attacks in b, at the best shift (multiples of a quaver within a bar either way). */
function agree(a: [number, number][], b: [number, number][], barTicks: number): { share: number; shift: number } {
  const sb = new Set(b.map(([on, m]) => `${on}:${m}`));
  let best = { share: 0, shift: 0 };
  for (let d = -barTicks; d <= barTicks; d += TPQ / 2) {
    const share = a.filter(([on, m]) => sb.has(`${on + d}:${m}`)).length / Math.max(1, a.length);
    if (share > best.share + 1e-9) best = { share, shift: d };
  }
  return best;
}
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const rows = ["| movement | second edition | independent | bars (ours / other) | attacks of ours in the other | the other's in ours | harpsichord top line(s) in the other's keyboard |", "|---|---|---|---|---|---|---|"];
for (const s of SECONDS)
  s.movements.forEach((o, i) => {
    if (!o) return;
    const f = pieces.find((p) => p.id === `bwv${s.bwv}-${i + 1}`)!;
    const ours = f.voices.flat().map((n) => [n[0], n[2]] as [number, number]);
    const a = agree(ours, o.all, f.barTicks);
    const back = agree(o.all, ours.map(([on, mm]) => [on, mm]), f.barTicks);
    const tops = f.voiceNames.flatMap((n, v) => (/right hand/.test(n) ? f.voices[v].map((x) => [x[0], x[2]] as [number, number]) : []));
    const sk = new Set(o.keys.map(([on, mm]) => `${on}:${mm}`));
    const top = tops.filter(([on, mm]) => sk.has(`${on + a.shift}:${mm}`)).length / Math.max(1, tops.length);
    const shift = a.shift ? ` (shifted ${a.shift / TPQ} ♩)` : "";
    rows.push(`| ${f.id} | ${s.label} | ${s.independent} | ${f.bars.length} / ${o.bars} | ${pct(a.share)}${shift} | ${pct(back.share)} | ${pct(top)} |`);
  });
// BWV 1062 is Bach's own arrangement of BWV 1043 a tone lower: its strings against Mutopia's BWV 1043
// (data/touch/more-bach.json, D340) read down a tone, and each harpsichord's top line against a solo violin.
const more: F[] = JSON.parse(readFileSync(`${ROOT}data/touch/more-bach.json`, "utf8"));
for (let m = 1; m <= 3; m++) {
  const f = pieces.find((p) => p.id === `bwv1062-${m}`)!;
  const g = more.find((p) => p.id === `bwv1043-${m}`)!;
  const pick = (x: F, names: RegExp, shift = 0) => x.voiceNames.flatMap((n, v) => (names.test(n) ? x.voices[v].map((q) => [q[0], q[2] + shift] as [number, number]) : []));
  const strings = agree(pick(f, /^(Violin I|Violin II|Viola|Continuo)$/), pick(g, /^(Violin I|Violin II|Viola|Continuo)$/, -2), f.barTicks);
  const solo = (h: string, s: string) => agree(pick(f, new RegExp(`^Harpsichord ${h}, right hand$`)), pick(g, new RegExp(`^Solo Violin ${s}$`), -2), f.barTicks).share;
  rows.push(`| ${f.id} | Mutopia 3, BWV 1043 (its model), a tone lower: strings; Harpsichord I's and II's top lines against Solo Violin I and II | yes (another work) | ${f.bars.length} / ${g.bars.length} | strings ${pct(strings.share)} | — | ${pct(solo("I", "I"))} / ${pct(solo("II", "II"))} |`);
}
console.log(rows.join("\n"));
