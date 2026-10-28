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
