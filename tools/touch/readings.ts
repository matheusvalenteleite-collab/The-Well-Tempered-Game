/**
 * D272: writes data/touch/readings.json (src/touch/readings.ts) from the extractions in
 * docs/wtc/readings/*.json: each author's words on each Book I fugue (the subject's articulation, note
 * by note against our first entry; its level and shape; the tempo; a dynamic plan by bar), as read from
 * the books (docs/wtc/readings/README.md). A reading is kept where the author says something to play
 * by (the subject's articulation, a level, a plan; a tempo alone is not enough), in the order of
 * SOURCES (the first kept is the fugue's default), at most three.
 * Run: node tools/touch/readings.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

interface Extracted {
  id: string;
  pages: string | null;
  tempo: { quarter_bpm: number | null; as_written: string | null };
  character: string | null;
  subject: {
    basis: "explicit" | "rule" | "none";
    quote: string | null;
    notes: { i: number; to_next: "join" | "detach" | null; short: boolean | null; accent: boolean | null }[];
    dynamic: string | null;
    shape: "crescendo" | "diminuendo" | "arch" | null;
  };
  rest: { articulation_quote: string | null; articulation_summary: string | null; dynamics_plan: { bar: number; level: string }[] };
}

const SOURCES = [
  { id: "keller", author: "KELLER", work: "The Well-Tempered Clavier (1965; Eng. 1976)", year: 1965 },
  { id: "bodky", author: "BODKY", work: "The Interpretation of Bach's Keyboard Works", year: 1960 },
  { id: "riemann", author: "RIEMANN", work: "Analysis of J. S. Bach's Wohltemperirtes Clavier (1890; Eng. 1893)", year: 1890 },
];
const LEVELS = ["pp", "p", "mp", "mf", "f", "ff"];
const out: Record<string, unknown[]> = {};
for (const src of SOURCES) {
  const path = `docs/wtc/readings/${src.id}.json`;
  if (!existsSync(path)) continue;
  const rows: Extracted[] = JSON.parse(readFileSync(path, "utf8"));
  for (const x of rows) {
    const notes = x.subject.notes.map((n) => ({ join: n.to_next === "join" ? true : n.to_next === "detach" ? false : null, short: n.short ?? null, accent: n.accent ?? null }));
    const marked = notes.some((n) => n.join !== null || n.short || n.accent);
    const level = x.subject.dynamic && LEVELS.includes(x.subject.dynamic) ? x.subject.dynamic : null;
    const plan = (x.rest.dynamics_plan ?? []).filter((p) => LEVELS.includes(p.level) || p.level === "cresc" || p.level === "dim");
    if (!marked && !level && !plan.length) continue;
    (out[x.id] ??= []).push({
      id: src.id,
      author: src.author,
      work: src.work,
      year: src.year,
      pages: x.pages ? (/^p/.test(x.pages) ? x.pages : `pp. ${x.pages}`) : null,
      tempo: x.tempo.quarter_bpm ? Math.round(x.tempo.quarter_bpm) : null,
      tempoText: x.tempo.as_written,
      character: x.character,
      basis: marked ? x.subject.basis : "none",
      quote: x.subject.quote,
      notes,
      level,
      shape: x.subject.shape,
      plan,
      restQuote: x.rest.articulation_quote,
      restSummary: x.rest.articulation_summary,
    });
  }
}
for (const id of Object.keys(out)) out[id] = out[id].slice(0, 3);
writeFileSync("data/touch/readings.json", JSON.stringify(out));
const ids = Object.keys(out).sort();
console.log(`${ids.length} fugues with a reading:`, ids.map((id) => `${id.slice(-2)}:${out[id].length}`).join(" "));
