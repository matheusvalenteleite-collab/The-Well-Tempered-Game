/**
 * D343: the MORE BACH and CHORALES tabs' notes (D340, D341), in a module of their own so that they are
 * a chunk loaded on demand (fugue.ts loadExtras), not part of every page's first download.
 */
import moreData from "../../data/touch/more-bach.json" with { type: "json" };
import choraleData from "../../data/touch/chorales.json" with { type: "json" };

export const MORE_DATA: unknown = moreData;
export const CHORALE_DATA: unknown = choraleData;
