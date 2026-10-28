/**
 * D272: writes data/touch/readings.json (src/touch/readings.ts) from the extractions in
 * docs/wtc/readings/*.json: each author's words on each Book I fugue (the subject's articulation, note
 * by note against our first entry; its level and shape; the tempo; a dynamic plan by bar), as read from
 * the books (docs/wtc/readings/README.md). A reading is kept where the author says something to play
 * by (the subject's articulation, a level, a plan; a tempo alone is not enough), in the order of
 * SOURCES (the first kept is the fugue's default), at most three.
 * D370 (Glenn's notes §1: slur ≠ legato): each reading also carries `legato` (the author's words ask
 * the joins as a manner or rule: "linked", "legato") and `slurs` (the groups slurred as one gesture, the
 * notes `from`..`to` of the subject, in the voice `v` of the first entry they were read against; every
 * entry takes them by place), from docs/wtc/readings/slurs.json, which says why for each reading. The
 * per-note `join` stays as it was: the derived view (a slur's notes joined inside it, plus the legato).
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
/** D370: each reading's legato rule and slur groups (docs/wtc/readings/slurs.json), by fugue and author. */
const SLURS: Record<string, Record<string, { legato: boolean; slurs: [number, number][] }>> = JSON.parse(readFileSync("docs/wtc/readings/slurs.json", "utf8"));
/** D370: the voice of each fugue's first entry (hear-sound.ts firstEntry): the voice the marks were read against. */
const FIRST_VOICE = new Map<string, number>(
  (JSON.parse(readFileSync("data/touch/pieces.json", "utf8")) as { id: string; entries?: { voice: number; on: number; theme?: number }[] }[]).flatMap((p) => {
    const e = (p.entries ?? []).filter((x) => !x.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0];
    return e ? [[p.id, e.voice] as [string, number]] : [];
  }),
);
const out: Record<string, unknown[]> = {};
for (const src of SOURCES) {
  // Book I (<id>.json) and, D275, Book II (<id>2.json).
  const rows: Extracted[] = [`docs/wtc/readings/${src.id}.json`, `docs/wtc/readings/${src.id}2.json`].filter((p) => existsSync(p)).flatMap((p) => JSON.parse(readFileSync(p, "utf8")));
  for (const x of rows) {
    const notes = x.subject.notes.map((n) => ({ join: n.to_next === "join" ? true : n.to_next === "detach" ? false : null, short: n.short ?? null, accent: n.accent ?? null }));
    const marked = notes.some((n) => n.join !== null || n.short || n.accent);
    const level = x.subject.dynamic && LEVELS.includes(x.subject.dynamic) ? x.subject.dynamic : null;
    const plan = (x.rest.dynamics_plan ?? []).filter((p) => LEVELS.includes(p.level) || p.level === "cresc" || p.level === "dim");
    if (!marked && !level && !plan.length) continue;
    const sl = SLURS[x.id]?.[src.id];
    if (notes.some((n) => n.join === true) && !sl) throw new Error(`${x.id} ${src.id}: joins with no slur/legato choice in docs/wtc/readings/slurs.json`);
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
      legato: sl?.legato ?? false,
      slurs: (sl?.slurs ?? []).map(([from, to]) => ({ v: FIRST_VOICE.get(x.id) ?? 0, from, to })),
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
