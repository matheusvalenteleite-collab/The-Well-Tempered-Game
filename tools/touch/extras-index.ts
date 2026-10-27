/**
 * D343: the small index of play.html's MORE BACH and CHORALES pieces (their ids, and each MORE BACH
 * piece's collection), so that the page knows its tabs, sections and ids without loading the notes:
 * those (data/touch/more-bach.json, chorales.json, about 3.9 MB) load on demand (src/touch/fugue.ts
 * loadExtras). Run after more-bach.ts or chorales.ts: node tools/touch/extras-index.ts
 * (test/d343-minimal.test.ts checks that it matches the data).
 */
import { readFileSync, writeFileSync } from "node:fs";

type Piece = { id: string; collection?: string };
const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), "utf8")) as Piece[];

export function extrasIndex(more: readonly Piece[], chorales: readonly Piece[]) {
  return { more: more.map((f) => [f.id, f.collection ?? ""]), chorales: chorales.map((f) => f.id) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = extrasIndex(read("data/touch/more-bach.json"), read("data/touch/chorales.json"));
  writeFileSync(new URL("../../data/touch/extras-index.json", import.meta.url), JSON.stringify(out) + "\n");
  console.log(`extras-index.json: ${out.more.length} MORE BACH, ${out.chorales.length} chorales`);
}
