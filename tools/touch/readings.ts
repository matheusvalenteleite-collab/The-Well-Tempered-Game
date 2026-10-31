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
 * D385 (WTC 1.88): WHOLE-PIECE READINGS beside the subject-only ones. An edition transcribed for every
 * voice and bar (docs/wtc/readings/<edition>/<fugue>-<edition>.json, format "wtc-reading/2 (whole
 * piece)": marks, slurs, dynamics, hairpins, words, caesuras, rules, double bars, ornaments) is kept
 * whole as the reading's `whole` (trimmed to what the game plays: the people's fields, fingering,
 * footnotes and the checks dropped), and its subject marks (`notes`, `slurs`) derived from the marks and
 * slurs on the first entry, so everything that reads a subject-only reading reads it too. It comes after
 * the (at most three) books' readings. Today: BUSONI (1894) for I/1, I/2, I/8, I/16, I/24.
 * Run: node tools/touch/readings.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

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
type Entry = { voice: number; on: number; theme?: number; notes: [number, number, number, ...unknown[]][] };
const FIRST_ENTRY = new Map<string, Entry>(
  (JSON.parse(readFileSync("data/touch/pieces.json", "utf8")) as { id: string; entries?: Entry[] }[]).flatMap((p) => {
    const e = (p.entries ?? []).filter((x) => !x.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0];
    return e ? [[p.id, e] as [string, Entry]] : [];
  }),
);
const FIRST_VOICE = new Map<string, number>([...FIRST_ENTRY].map(([id, e]) => [id, e.voice]));
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

/** D385: the whole-piece editions (docs/wtc/readings/<edition>/), each after the books' readings. */
const EDITIONS = [{ id: "busoni", author: "BUSONI", work: "Das wohltemperirte Clavier, Erster Theil (G. Schirmer, 1894)", year: 1894 }];
// deno-lint-ignore no-explicit-any
type Any = any;
const pick = (o: Any, keys: string[]) => Object.fromEntries(keys.filter((k) => o[k] !== undefined && o[k] !== null).map((k) => [k, o[k]]));
for (const ed of EDITIONS) {
  const dir = `docs/wtc/readings/${ed.id}`;
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((n) => n.endsWith(`-${ed.id}.json`)).sort()) {
    const B: Any = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
    if (!/^wtc-reading\/2/.test(B.format)) throw new Error(`${file}: not a whole-piece reading`);
    const id = B.piece as string;
    const first = FIRST_ENTRY.get(id);
    if (!first) throw new Error(`${file}: no first entry for ${id}`);
    const whole = {
      heading: B.tempo?.text ?? null,
      // Changes of pace (rall., allargando): only an ending's slowing is played (whole-reading.ts endingOf); the rest kept as words.
      tempo: [...(B.tempo?.changes ?? []), ...(B.tempo?.notes ?? [])].map((x: Any) => pick(x, ["on", "text", "kind"])).sort((a: Any, b: Any) => a.on - b.on),
      marks: (B.marks ?? []).map((m: Any) => pick(m, ["v", "on", "art"])),
      slurs: (B.slurs ?? []).map((x: Any) => pick(x, ["v", "from", "to", "kind", "lastShort"])),
      dyn: (B.dyn ?? []).map((x: Any) => pick(x, ["on", "voices", "mark"])),
      hairpins: (B.hairpins ?? []).map((x: Any) => pick(x, ["voices", "from", "to", "dir"])),
      text: (B.text ?? []).map((x: Any) => pick(x, ["on", "voices", "text", "span"])),
      breaths: (B.breaths ?? []).map((x: Any) => pick(x, ["v", "on", "kind"])),
      rules: (B.rules ?? []).map((x: Any) => pick(x, ["scope", "art"])),
      sections: (B.sections ?? []).map((x: Any) => pick(x, ["beforeBar", "at"])),
      ornaments: (B.ornaments ?? []).map((x: Any) => pick(x, ["v", "on", "sign", "optional", "realisation"])),
    };
    // The subject's marks, derived from the first entry (the README's "superset" rule): a slur joined inside, the
    // dot, wedge and marcato short, portato detached (as the books' extractions code it), tenuto neither (full
    // value, not a join the thumbs are asked for), the accent and marcato accented.
    const ons = first.notes.map((n) => n[0]);
    const arts = (on: number) => new Set((B.marks ?? []).filter((m: Any) => m.v === first.voice && m.on === on).flatMap((m: Any) => String(m.art).split("+")));
    const slurs = (B.slurs ?? [])
      .filter((x: Any) => x.v === first.voice && x.kind === "slur")
      .map((x: Any) => [ons.findIndex((on) => on >= x.from), ons.findLastIndex((on) => on <= x.to)])
      .filter(([a, b]: number[]) => a >= 0 && b > a);
    const inSlur = (i: number) => slurs.some(([a, b]: number[]) => i >= a && i < b);
    const notes = ons.map((on, i) => {
      const a = arts(on);
      const short = a.has("staccato") || a.has("wedge") || a.has("marcato") ? true : null;
      const join = inSlur(i) && !short ? true : a.has("portato") ? false : null;
      return { join, short, accent: a.has("accent") || a.has("marcato") ? true : null };
    });
    (out[id] ??= []).push({
      id: ed.id,
      author: ed.author,
      work: ed.work,
      year: ed.year,
      pages: B.edition?.pages?.printed ? `pp. ${B.edition.pages.printed.join("-")}` : null,
      tempo: null,
      tempoText: B.tempo?.text ?? null,
      character: B.character ?? null,
      basis: "explicit",
      quote: null,
      notes,
      legato: false,
      slurs: slurs.map(([from, to]: number[]) => ({ v: first.voice, from, to })),
      level: null,
      shape: null,
      plan: [],
      restQuote: null,
      restSummary: B.dynamicPlan ?? null,
      whole,
    });
  }
}
writeFileSync("data/touch/readings.json", JSON.stringify(out));
const ids = Object.keys(out).sort();
console.log(`${ids.length} fugues with a reading:`, ids.map((id) => `${id.slice(-2)}:${out[id].length}`).join(" "));
