// D348: the harpsichord concertos' notes (4 MB, tools/touch/concertos.ts) typed as unknown, not inferred: tsc ran out of memory
// inferring the file's literal type (tsconfig.json allowArbitraryExtensions; read through src/touch/concertos-data.ts).
declare const data: unknown;
export default data;
