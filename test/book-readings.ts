/**
 * D1050 (code audit A): the books' subject-only readings (KELLER, BODKY, RIEMANN), deleted from the game's data, kept
 * here as a test fixture so the engine's articulation (joins, detached notes, slurs, the fingering planner) is still
 * tested on them. allReadingsOf: a fugue's readings as before D1050 (the books' first, then the whole-piece edition).
 */
import { readFileSync } from "node:fs";
import { READINGS, readingsOf, type Reading } from "../src/touch/readings.ts";

export const BOOK_READINGS = JSON.parse(readFileSync(new URL("./fixtures/book-readings.json", import.meta.url), "utf8")) as Record<string, Reading[]>;
export const allReadingsOf = (id: string): Reading[] => [...(BOOK_READINGS[id] ?? []), ...readingsOf(id)];
export const ALL_READINGS: Record<string, Reading[]> = Object.fromEntries([...new Set([...Object.keys(BOOK_READINGS), ...Object.keys(READINGS)])].map((id) => [id, allReadingsOf(id)]));
