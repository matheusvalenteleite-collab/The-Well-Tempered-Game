// Ledbetter's sections of the 48 (D137), from the section claims of data/wtc/ledbetter-claims.txt (the
// digest's claims, each read in the encoded score; a corrected claim already carries the score's bars).
// Kept: the outermost spans of each piece. Left out: episodes, interludes, links, codettas and solos
// (passages inside a section, which the study shows as moments), spans about the work's revisions
// (an insertion, a passage added in the final version), spans under two bars, and claims flagged
// [check] or [GAP].
// Writes data/wtc/ledbetter-sections.json. Usage: node tools/wtc/ledbetter-sections.ts
import { readFileSync, writeFileSync } from "node:fs";

interface Span { from: number; to: number; label: string }
const out: Record<string, Span[]> = {};
for (const line of readFileSync("data/wtc/ledbetter-claims.txt", "utf8").split("\n")) {
  const m = /^(wtc\d[fp]\d\d) section b\.([\d½]+)(?:-([\d½]+))?\s*(.*)$/.exec(line.trim());
  if (!m || /\[(check|GAP)\]/.test(line)) continue;
  const num = (s: string) => Number(s.replace("½", ".5"));
  const label = m[4].replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  if (/episode|interlude|link|codetta|solo|insertion|added/i.test(label)) continue;
  const span = { from: num(m[2]), to: num(m[3] ?? m[2]), label };
  // Two bars at least: a span of a bar or so is a moment (a closing idea), not a section.
  if (span.to - span.from < 2) continue;
  (out[m[1]] ??= []).push(span);
}
for (const [id, spans] of Object.entries(out)) {
  // The outermost spans: one inside a longer one is a subdivision; of two alike, the first is kept.
  const outer = spans.filter((g, i) => !spans.some((h, j) => j !== i && h.from <= g.from && h.to >= g.to && (h.to - h.from > g.to - g.from || j < i)));
  // Of two spans starting within a bar of each other (bb. 14–27 inversion, bb. 14½–27½ exposition inverso), the first.
  out[id] = outer.sort((a, b) => a.from - b.from).filter((g, i, all) => i === 0 || g.from - all[i - 1].from >= 1);
}
const ordered = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
writeFileSync(
  "data/wtc/ledbetter-sections.json",
  JSON.stringify({ source: "David Ledbetter, Bach's Well-tempered Clavier: The 48 Preludes and Fugues (Yale, 2002), Part Two, via the per-piece digest checked against the score (data/wtc/ledbetter-claims.txt); Bach's bars, as the encoding numbers them", pieces: ordered }, null, 1) + "\n",
);
console.log(Object.keys(ordered).length, "pieces,", Object.values(ordered).flat().length, "spans");
