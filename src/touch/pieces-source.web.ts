/**
 * Code audit, Phase 2 (D1054): the browser build's pieces (tools/touch/pieces-split.ts): each piece first as a light stub,
 * its `voices` and `entries` fetched by hydrate() and set on the same object, so everything that holds the piece sees them.
 */
import stubs from "virtual:pieces-stub";
import loaders from "virtual:pieces-loaders";

export const PIECE_DATA: unknown = stubs;
const pending = new Map<string, Promise<void>>();
const loaded = new Set<string>();
/** Whether the piece's notes are in (a piece with no loader, Contrapunctus XIV, always). */
export const isLoaded = (piece: { id: string }): boolean => loaded.has(piece.id) || !(loaders as Record<string, unknown>)[piece.id];
export function hydrate(piece: { id: string }): Promise<void> {
  const load = (loaders as Record<string, () => Promise<Record<string, unknown>>>)[piece.id];
  if (!load) return Promise.resolve();
  let p = pending.get(piece.id);
  if (!p) {
    p = load().then((notes) => {
      for (const [k, v] of Object.entries(notes)) Object.defineProperty(piece, k, { value: v, writable: true, enumerable: true, configurable: true });
      loaded.add(piece.id);
    });
    p.catch(() => pending.delete(piece.id));
    pending.set(piece.id, p);
  }
  return p;
}
