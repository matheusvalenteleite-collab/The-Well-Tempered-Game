/**
 * Code audit, Phase 2 (D1054): the 97 pieces of data/touch/pieces.json for the browser build, split in two: a light STUB of each
 * (everything but `voices` and `entries`, 12% of the file) in one module the page loads at once, and each piece's notes
 * (`voices`, `entries`) in a chunk of its own, fetched when the piece is opened (src/touch/fugue.ts loadPiece). Tests and tools
 * never see this: they import pieces.json whole (src/touch/pieces-source.ts), and the alias below applies to the Vite build only.
 *
 * Virtual modules (all built from pieces.json, so nothing is stored twice):
 *   virtual:pieces-stub     the stubs
 *   virtual:pieces-loaders  { [id]: () => import("virtual:piece-notes/<id>") }
 *   virtual:piece-notes/<id>  { voices, entries } of that piece
 * With PIECES_TRAP=1 in the environment the stubs carry `voices` and `entries` as accessors that log an early read to the
 * console (a diagnostic build: it finds code that reads a piece's notes before loadPiece has run).
 */
import type { Plugin } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const HEAVY = ["voices", "entries"] as const;
/** Pieces left whole in the stubs: Contrapunctus XIV, whose notes the title page's music is cut from at load (src/bench/intro-sound.ts). */
const KEEP_WHOLE = ["bwv1080-14"];
const SRC = fileURLToPath(new URL("../../data/touch/pieces.json", import.meta.url));
const STUB = "\0virtual:pieces-stub";
const LOADERS = "\0virtual:pieces-loaders";
const NOTES = "\0virtual:piece-notes/";

export function piecesSplit(): Plugin {
  type Piece = Record<string, unknown> & { id: string };
  let all: Piece[] | null = null;
  const pieces = (): Piece[] => (all ??= JSON.parse(readFileSync(SRC, "utf8")) as Piece[]);
  return {
    name: "pieces-split",
    enforce: "pre",
    resolveId(id, importer) {
      // The swap: the page's pieces-source.ts becomes pieces-source.web.ts (tests and tools, which do not run Vite, keep the first).
      if (/(^|\/)pieces-source\.ts$/.test(id) && importer && !importer.includes("\0")) return fileURLToPath(new URL("../../src/touch/pieces-source.web.ts", import.meta.url));
      if (id === "virtual:pieces-stub") return STUB;
      if (id === "virtual:pieces-loaders") return LOADERS;
      if (id.startsWith("virtual:piece-notes/")) return "\0" + id;
      return null;
    },
    load(id) {
      if (id === STUB) {
        const stubs = pieces().map((p) => {
          if (KEEP_WHOLE.includes(p.id as string)) return p;
          // What the card grid asks of the entries (src/bench/cards.ts), kept in the stub as flags.
          const es = (p.entries ?? []) as { inverted?: boolean; scale?: number; theme?: number }[];
          const has = { inverted: es.some((e) => e.inverted), augmented: es.some((e) => e.scale === 2), laterSubjects: es.some((e) => e.theme) };
          return { ...Object.fromEntries(Object.entries(p).filter(([k]) => !(HEAVY as readonly string[]).includes(k))), has };
        });
        if (!process.env.PIECES_TRAP) return `export default ${JSON.stringify(stubs)};`;
        return (
          `const stubs = ${JSON.stringify(stubs)};\n` +
          `for (const s of stubs) if (!("voices" in s)) for (const k of ${JSON.stringify(HEAVY)}) Object.defineProperty(s, k, { configurable: true, enumerable: true, ` +
          `get() { console.error("EARLY READ " + s.id + "." + k + " " + new Error().stack.split("\\n").slice(2, 5).join(" | ")); return []; } });\n` +
          `export default stubs;`
        );
      }
      if (id === LOADERS) {
        const rows = pieces().filter((p) => !KEEP_WHOLE.includes(p.id as string)).map((p) => `  ${JSON.stringify(p.id)}: () => import(${JSON.stringify("virtual:piece-notes/" + p.id)}).then((m) => m.default)`);
        return `export default {\n${rows.join(",\n")}\n};`;
      }
      if (id.startsWith(NOTES)) {
        const p = pieces().find((x) => x.id === id.slice(NOTES.length));
        if (!p) return null;
        return `export default ${JSON.stringify(Object.fromEntries(HEAVY.map((k) => [k, p[k]])))};`;
      }
      return null;
    },
  };
}
