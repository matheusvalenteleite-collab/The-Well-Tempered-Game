/**
 * D366: the game's pieces (data/touch/pieces.json) built from the licence-clean editions, against the
 * same file as it was built from the Humdrum encodings (a copy given as the first argument), piece by
 * piece: the attacks (onset and MIDI, all voices pooled, then voice by voice), the bars, the entries
 * (bar, voice, key, form), the sections, the cadences, the keys, the band's own voices (D363).
 * Usage: node tools/wtc/sources-diff.ts OLD/pieces.json [NEW/pieces.json] [--md]
 */
import { readFileSync } from "node:fs";

type Note = [number, number, number, number];
interface P {
  id: string;
  kind: string;
  bars: { n: number; on: number }[];
  length: number;
  voices: Note[][];
  bandVoices?: { of: number; notes: Note[] }[];
  entries: { bar: number; voice: number; key: string; inverted?: boolean; scale?: number; theme?: number }[];
  sections: { fromBar: number; toBar: number; name: string }[];
  cadences: { bar: number; key: string }[];
  keys: { key: string }[];
  meter: string;
}
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const md = process.argv.includes("--md");
const load = (f: string): P[] => JSON.parse(readFileSync(f, "utf8"));
const OLD = new Map(load(args[0]).map((p) => [p.id, p]));
const NEW = load(args[1] ?? new URL("../../data/touch/pieces.json", import.meta.url).pathname);
const bag = (ns: Note[], bars: P["bars"]) => {
  const m = new Map<string, number>();
  for (const n of ns) {
    const b = [{ n: 0, on: 0 }, ...bars].filter((x) => x.on <= n[0]).at(-1)!;
    const k = `${b.n}:${n[0] - b.on}:${n[2]}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};
const inter = (a: Map<string, number>, b: Map<string, number>) => [...a].reduce((s, [k, c]) => s + Math.min(c, b.get(k) ?? 0), 0);
const tot = (a: Map<string, number>) => [...a.values()].reduce((s, c) => s + c, 0);
const rows: string[] = [];
if (md) rows.push("| piece | attacks (of the Humdrum build's) | voice by voice | bars | entries | sections | cadences | keys | band voices |", "|---|---|---|---|---|---|---|---|---|");
for (const p of NEW) {
  const o = OLD.get(p.id);
  if (!o) continue;
  const all = (x: P) => [...x.voices.flat(), ...(x.bandVoices ?? []).flatMap((b) => b.notes)];
  const A = bag(all(p), p.bars), B = bag(all(o), o.bars);
  const agree = `${((100 * inter(A, B)) / tot(B)).toFixed(1)}% (${tot(A)}/${tot(B)})`;
  const per = o.voices.map((v, i) => ((100 * inter(bag(p.voices[i] ?? [], p.bars), bag(v, o.bars))) / Math.max(1, v.length)).toFixed(0)).join("/");
  const ek = (e: P["entries"][number]) => `${e.bar}v${e.voice}${e.key}${e.inverted ? "i" : ""}${e.scale ? "x" + e.scale : ""}${e.theme ? "t" + e.theme : ""}`;
  const ne = new Set(p.entries.map(ek)), oe = new Set(o.entries.map(ek));
  const eAdd = [...ne].filter((x) => !oe.has(x)), eDel = [...oe].filter((x) => !ne.has(x));
  const sec = (x: P) => x.sections.map((s) => `${s.fromBar}-${s.toBar}`).join(" ");
  const cad = (x: P) => x.cadences.map((c) => `${c.bar}${c.key}`).join(" ");
  const keys = (x: P) => x.keys.map((k) => k.key).join(" ");
  const bars = JSON.stringify(p.bars) === JSON.stringify(o.bars) ? "same" : `${p.bars.length}/${o.bars.length}, first at b. ${p.bars.find((b, i) => JSON.stringify(b) !== JSON.stringify(o.bars[i]))?.n ?? "end"}`;
  const nb = (x: P) => (x.bandVoices ?? []).map((b) => `v${b.of}:${b.notes.length}`).join(",") || "-";
  const band = nb(p) === nb(o) ? (nb(p) === "-" ? "-" : `same (${nb(p)})`) : `${nb(p)} (was ${nb(o)})`;
  const cells = [
    p.id,
    agree,
    per,
    bars,
    eAdd.length || eDel.length ? `${p.entries.length}/${o.entries.length}: +${eAdd.join(",")} −${eDel.join(",")}` : `same (${p.entries.length})`,
    sec(p) === sec(o) ? "same" : `${sec(p)} (was ${sec(o)})`,
    cad(p) === cad(o) ? "same" : `${p.cadences.length}/${o.cadences.length}`,
    keys(p) === keys(o) ? "same" : `${keys(p)} (was ${keys(o)})`,
    band,
  ];
  rows.push(md ? `| ${cells.join(" | ")} |` : cells.join("  "));
}
console.log(rows.join("\n"));
