/**
 * Code audit, Phase 2 (D1054): where fugue.ts gets the 97 WTC pieces. Here (tests, tools, Node) the whole of
 * data/touch/pieces.json, notes included; the Vite build swaps this file for pieces-source.web.ts (vite.config.ts), which gives
 * light stubs and fetches each piece's notes when it is opened.
 */
import data from "../../data/touch/pieces.json" with { type: "json" };

export const PIECE_DATA: unknown = data;
/** Brings a piece's notes (voices, entries) into its object; already there in this build. */
/** Whether the piece's notes are in. */
export const isLoaded = (_piece: { id: string }): boolean => true;
export const hydrate = (_piece: { id: string }): Promise<void> => Promise.resolve();
