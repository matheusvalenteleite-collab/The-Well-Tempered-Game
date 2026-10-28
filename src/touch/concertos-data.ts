/**
 * D348: the HARPSICHORD CONCERTOS' notes (tools/touch/concertos.ts: BWV 1052-1058, 1060-1065, 39
 * movements), a chunk of their own beside extras-data.ts's, fetched with it on demand (fugue.ts loadExtras).
 */
import concertoData from "../../data/touch/concertos.json" with { type: "json" };

export const CONCERTO_DATA: unknown = concertoData;
