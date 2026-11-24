// Phase 2 (code audit, finding 6): typed as unknown, not inferred, so tsc does not build a literal type for this large JSON file
// (tsconfig.json allowArbitraryExtensions; the reader casts it, as for concertos.d.json.ts, D348).
declare const data: unknown;
export default data;
