/**
 * D366: the licence-clean corpus (tools/wtc/sources.ts) checked against the Humdrum encodings it
 * replaces (data/sources/bach-wtc/kern, data/sources/bach-inventions/kern: kept in the repository
 * as a private cross-check only, never shipped), piece by piece: bars, metre, length, voices, and the
 * attacks (onset and pitch, MIDI) each holds that the other does not, by bar and voice.
 * Writes docs/wtc/SOURCES-CHECK.md. Run: node tools/wtc/sources-check.ts [ids…]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parsePitch } from "../../src/music/pitch.ts";
import { parseKern } from "../../src/wtc/kern.ts";
import { pieceFromKern, type WtcPiece } from "../../src/wtc/corpus.ts";
import { ROOT } from "./sources.ts";
import { readMusicXml } from "../touch/musicxml.ts";

/** A third witness's attacks by bar (bar → "offset:MIDI" counts): the OpenWTC fugues (Book I) and verits99's (Book II), MusicXML, CC0. */
export function witness(id: string): Map<number, Map<string, number>> | null {
  const m = /^wtc(\d)f(\d\d)$/.exec(id);
  if (!m) return null;
  const dir = m[1] === "1" ? "wtc-openwtc" : "wtc-musescore";
  const idx = JSON.parse(readFileSync(`${ROOT}data/sources/${dir}/index.json`, "utf8")) as { id: string; file: string }[];
  const row = idx.find((r) => r.id === (m[1] === "1" ? `wtc1p${m[2]}` : id));
  if (!row) return null;
  const x = readMusicXml(`${ROOT}data/sources/${dir}/${row.file}`);
  // Book I: the fugue is the second half of the prelude-and-fugue score.
  const from = m[1] === "1" ? x.measures.findIndex((mm, i) => i > 0 && (mm.n === "1" || mm.n === "0") && Number(x.measures[i - 1].n) > 1) : 0;
  const ms = x.measures.slice(from);
  const out = new Map<number, Map<string, number>>();
  ms.forEach((mm, i) => {
    const a = mm.on;
    const b = i + 1 < ms.length ? ms[i + 1].on : x.length;
    const n = Number(mm.n) || 0;
    const c = out.get(n) ?? new Map<string, number>();
    for (const nn of x.parts[0].notes)
      if (nn[0] >= a && nn[0] < b) {
        const k = `${nn[0] - a}:${parsePitch(nn[2]).midi}`;
        c.set(k, (c.get(k) ?? 0) + 1);
      }
    out.set(n, c);
  });
  return out;
}

/** A piece's attacks by bar, as witness() gives them (the upbeat is bar 0). */
export function attacksByBar(p: WtcPiece): Map<number, Map<string, number>> {
  const out = new Map<number, Map<string, number>>();
  const starts = p.bars[0].on > 0 ? [{ n: 0, on: 0 }, ...p.bars] : p.bars;
  for (const n of p.voices.flat()) {
    if (n[1] <= 0) continue;
    const b = starts.filter((x) => x.on <= n[0]).at(-1)!;
    const c = out.get(b.n) ?? new Map<string, number>();
    const k = `${n[0] - b.on}:${parsePitch(n[2]).midi}`;
    c.set(k, (c.get(k) ?? 0) + 1);
    out.set(b.n, c);
  }
  return out;
}

/**
 * The notes of a kern file's ossia sub-spines (*S/ossia … *S/fin: an editor's alternative printed beside
 * the Bach-Gesellschaft's text, "sic"), which kern.ts folds into the voice like a divisi: "onset:MIDI".
 */
export function kernOssia(text: string): Set<string> {
  const lines = text.split(/\r?\n/);
  const open = new Set<number>();
  const rested = lines.map((l) => {
    if (l.startsWith("*")) {
      l.split("\t").forEach((x, i) => {
        if (x === "*S/ossia") open.add(i);
        if (x === "*S/fin") open.delete(i);
      });
      return l;
    }
    if (!open.size || l.startsWith("!") || l.startsWith("=")) return l;
    return l
      .split("\t")
      .map((x, i) => (open.has(i) && x !== "." ? x.replace(/[a-gA-G]+(#+|-+|n)?/g, "r").replace(/[\[\]_]/g, "") : x))
      .join("\t");
  });
  const midis = (p: WtcPiece) => new Set(p.voices.flat().map((n) => `${n[0]}:${parsePitch(n[2]).midi}`));
  const all = midis(pieceFromKern("wtc1f01", parseKern(text)));
  const kept = midis(pieceFromKern("wtc1f01", parseKern(rested.join("\n"))));
  return new Set([...all].filter((k) => !kept.has(k)));
}

export function kernPieces(): Map<string, WtcPiece> {
  const out = new Map<string, WtcPiece>();
  for (const dir of ["data/sources/bach-wtc/kern", "data/sources/bach-inventions/kern"])
    for (const f of readdirSync(`${ROOT}${dir}`).filter((x) => x.endsWith(".krn"))) {
      const id = f.replace(".krn", "");
      out.set(id, pieceFromKern(id, parseKern(readFileSync(`${ROOT}${dir}/${f}`, "utf8"))));
    }
  return out;
}

export interface Diff {
  id: string;
  /** Attacks (onset, MIDI) of the kern found in the new, as a share. */
  agree: number;
  attacksNew: number;
  attacksOld: number;
  /** The same, each voice's own (voice i against voice i). */
  voiceAgree: number[];
  bars: string;
  meter: string;
  length: string;
  /** Differences, by bar: "b. 25 v1: +C#5@1/2 −C#4@1/2". */
  places: string[];
}

const barOf = (p: WtcPiece, t: number) => p.bars.filter((b) => b.on <= t).at(-1)?.n ?? 0;

export function compare(nw: WtcPiece, old: WtcPiece): Diff {
  const key = (n: [number, number, string, number]) => `${n[0]}:${parsePitch(n[2]).midi}`;
  const count = (ns: [number, number, string, number][]) => {
    const m = new Map<string, number>();
    for (const n of ns) if (n[1] > 0) m.set(key(n), (m.get(key(n)) ?? 0) + 1);
    return m;
  };
  const inter = (a: Map<string, number>, b: Map<string, number>) => [...a].reduce((s, [k, c]) => s + Math.min(c, b.get(k) ?? 0), 0);
  const A = count(nw.voices.flat());
  const B = count(old.voices.flat());
  const tot = (m: Map<string, number>) => [...m.values()].reduce((s, c) => s + c, 0);
  const voiceAgree = old.voices.map((v, i) => {
    const b = count(v);
    return tot(b) ? inter(count(nw.voices[i] ?? []), b) / tot(b) : 1;
  });
  // The places: per bar, per voice, what each has that the other lacks.
  const places: string[] = [];
  const byBar = new Map<string, { plus: string[]; minus: string[] }>();
  const nv = Math.max(nw.voices.length, old.voices.length);
  for (let v = 0; v < nv; v++) {
    const a = count(nw.voices[v] ?? []);
    const b = count(old.voices[v] ?? []);
    const name = (k: string, p: WtcPiece, vs: [number, number, string, number][]) => {
      const [on] = k.split(":").map(Number);
      const n = vs.find((x) => key(x) === k)!;
      const bar = barOf(p, on);
      const b0 = p.bars.find((x) => x.n === bar)?.on ?? 0;
      return { bar, s: `${n[2]}@${(on - b0) / 1920}${n[1] ? `/${n[1] / 1920}` : ""}` };
    };
    for (const [k, c] of a) for (let i = 0; i < c - (b.get(k) ?? 0); i++) {
      const x = name(k, nw, nw.voices[v]);
      const g = byBar.get(`${x.bar}:${v}`) ?? { plus: [], minus: [] };
      g.plus.push(x.s);
      byBar.set(`${x.bar}:${v}`, g);
    }
    for (const [k, c] of b) for (let i = 0; i < c - (a.get(k) ?? 0); i++) {
      const x = name(k, old, old.voices[v]);
      const g = byBar.get(`${x.bar}:${v}`) ?? { plus: [], minus: [] };
      g.minus.push(x.s);
      byBar.set(`${x.bar}:${v}`, g);
    }
  }
  for (const [k, g] of [...byBar].sort((x, y) => Number(x[0].split(":")[0]) - Number(y[0].split(":")[0]) || Number(x[0].split(":")[1]) - Number(y[0].split(":")[1]))) {
    const [bar, v] = k.split(":");
    places.push(`b. ${bar} v${v}: ${g.plus.map((s) => `+${s}`).join(" ")} ${g.minus.map((s) => `−${s}`).join(" ")}`.trim());
  }
  const sameBars = JSON.stringify(nw.bars) === JSON.stringify(old.bars);
  const barDiff = sameBars
    ? "same"
    : `${nw.bars.length} vs ${old.bars.length}; first differing: ${JSON.stringify(nw.bars.find((b, i) => JSON.stringify(b) !== JSON.stringify(old.bars[i])))} vs ${JSON.stringify(old.bars.find((b, i) => JSON.stringify(b) !== JSON.stringify(nw.bars[i])))}`;
  return {
    id: nw.id,
    agree: tot(B) ? inter(A, B) / tot(B) : 1,
    attacksNew: tot(A),
    attacksOld: tot(B),
    voiceAgree,
    bars: barDiff,
    meter: nw.meter === old.meter ? "same" : `${nw.meter} vs ${old.meter}`,
    length: nw.length === old.length ? "same" : `${nw.length} vs ${old.length}`,
    places,
  };
}

/**
 * The attacks (all voices pooled) one has in a bar and the other lacks, with the third witness's word
 * where there is one (the fugues): "new" where it has the edition's notes and not the kern's, "kern"
 * the other way, "both"/"neither" otherwise.
 */
function pooled(nw: WtcPiece, old: WtcPiece, wit: Map<number, Map<string, number>> | null): string[] {
  const a = attacksByBar(nw);
  const b = attacksByBar(old);
  const out: string[] = [];
  const name = (k: string) => {
    const [off, midi] = k.split(":").map(Number);
    return `${"C C# D Eb E F F# G Ab A Bb B".split(" ")[midi % 12]}${Math.floor(midi / 12) - 1}@${off / 1920}`;
  };
  for (const bar of [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => x - y)) {
    const A = a.get(bar) ?? new Map<string, number>();
    const B = b.get(bar) ?? new Map<string, number>();
    const plus = [...A].filter(([k, c]) => c > (B.get(k) ?? 0)).map(([k]) => k);
    const minus = [...B].filter(([k, c]) => c > (A.get(k) ?? 0)).map(([k]) => k);
    if (!plus.length && !minus.length) continue;
    let says = "";
    const W = wit?.get(bar);
    if (W) {
      // As many strikes of the key as the one side has (a unison written twice is struck once).
      const p = plus.length && plus.every((k) => (W.get(k) ?? 0) > (B.get(k) ?? 0));
      const m = minus.length && minus.every((k) => (W.get(k) ?? 0) > (A.get(k) ?? 0));
      says = p && !m ? " (witness: new)" : m && !p ? " (witness: kern)" : p && m ? " (witness: both)" : " (witness: neither)";
    }
    out.push(`b. ${bar}: ${plus.map((k) => `+${name(k)}`).join(" ")} ${minus.map((k) => `−${name(k)}`).join(" ")}`.replace(/\s+/g, " ").trim() + says);
  }
  return out;
}

function main() {
  const only = new Set(process.argv.slice(2));
  const kern = kernPieces();
  const read = (f: string): WtcPiece[] => JSON.parse(readFileSync(`${ROOT}data/wtc/${f}`, "utf8"));
  const pieces = [...read("fugues.json"), ...read("preludes.json"), ...read("inventions.json")].filter((p) => !only.size || only.has(p.id));
  pieces.sort((x, y) => x.book - y.book || x.number - y.number || (x.kind === "prelude" ? 0 : 1) - (y.kind === "prelude" ? 0 : 1) || x.id.localeCompare(y.id));
  const rows: string[] = [];
  const detail: string[] = [];
  let total = 0;
  for (const p of pieces) {
    const old = kern.get(p.id);
    if (!old) continue;
    const d = compare(p, old);
    const wit = witness(p.id);
    const places = pooled(p, old, wit);
    total += places.length;
    const voices = d.voiceAgree.map((x) => (100 * x).toFixed(1)).join(" / ");
    // By bar (bar number and place in the bar): where one barred a bar otherwise, the bars after it still meet.
    const A = attacksByBar(p);
    const B = attacksByBar(old);
    let hit = 0;
    let all = 0;
    for (const [bar, m] of B)
      for (const [k, c] of m) {
        all += c;
        hit += Math.min(c, A.get(bar)?.get(k) ?? 0);
      }
    rows.push(`| ${p.id} | ${(100 * d.agree).toFixed(1)}% | ${((100 * hit) / all).toFixed(1)}% | ${voices} | ${d.attacksNew} / ${d.attacksOld} | ${d.bars === "same" ? "same" : "differ"} | ${d.meter} | ${places.length} |`);
    if (places.length) detail.push(`### ${p.id}`, "", ...places.map((s) => `- ${s}`), "");
  }
  const doc = [
    "# The licence-clean corpus against the Humdrum cross-check",
    "",
    "Generated by `node tools/wtc/sources-check.ts` (D366). Each piece of the game's corpus (data/wtc, from the editions in",
    "docs/wtc/SOURCES.md, corrections applied) against the Humdrum encoding of the Bach-Gesellschaft edition the game was built",
    "from before (data/sources/bach-wtc, bach-inventions: a private cross-check, never shipped). **agree**: the encoding's attacks",
    "(onset, MIDI; all voices pooled) the corpus has too; **by bar**: the same by bar number and place in the bar (where one's bar lines differ the bars after still meet: I/8, II/4, II/11, whose encodings mis-bar a bar); **voices**: the same voice by voice (a voice's notes given to another",
    "voice count against it); **attacks**: the corpus's / the encoding's. Lengths (ties) are not compared here.",
    "",
    "Below the table, every bar where the pooled attacks differ: `+` the corpus's note the encoding lacks, `−` the encoding's",
    "the corpus lacks (pitch@crotchets into the bar; the upbeat is bar 0). For the fugues the third witness (OpenWTC's fugues",
    "for Book I, verits99's for Book II; MusicXML, CC0) is asked: *new* where it has the corpus's notes and not the",
    "encoding's, *kern* the other way. Where the corpus and a witness agree against the encoding the corpus is kept; where",
    "two witnesses agree against the edition, tools/wtc/corrections.ts corrects it. Book II's preludes (verits99) have no",
    "second free witness: their differences are left as verits99 has them, to be proofread against the BGA (Band 14).",
    "",
    `${rows.length} pieces; ${total} bars with a difference.`,
    "",
    "| piece | agree | by bar | voices | attacks | bars | metre | bars differing |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## The bars that differ",
    "",
    ...detail,
  ];
  writeFileSync(`${ROOT}docs/wtc/SOURCES-CHECK.md`, doc.join("\n"));
  console.log(`${rows.length} pieces; ${total} bars differ`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) main();
