/**
 * D700, THE EXTRAS' SEATS LOADED WITH THEIR NOTES: the per-piece line-ups D641 chose for MORE BACH, the concertos and the
 * chorales (tools/touch/octaves/seats.ts writes them to src/touch/seats/) kept out of the play bundle, each its own chunk,
 * and merged into the presets' Preset.pieces (sound.ts mergeSeats) by loadExtras (fugue.ts) before any of those pieces is
 * registered: a piece of theirs is found (fugueById) only once its seats are in, so none is prepared or played on a band's
 * generic line-up (test/d700-seats-lazy.test.ts). The 48 fugues', the preludes', the tutorial's and the Art of Fugue XIV's
 * seats stay in octave-seats.ts, with their notes in the main bundle.
 */
import { mergeSeats } from "./sound.ts";

let loading: Promise<void> | null = null;
/** The three chunks, fetched together and merged once (later calls share the first). */
export function loadExtraSeats(): Promise<void> {
  loading ??= Promise.all([import("./seats/more-bach.ts"), import("./seats/concertos.ts"), import("./seats/chorales.ts")]).then((ms) => {
    for (const m of ms) mergeSeats(m.SEATS);
  });
  loading.catch(() => (loading = null));
  return loading;
}
