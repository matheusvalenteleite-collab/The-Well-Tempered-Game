/** D355: every piece's colours (the WTC's fugues, the Art of Fugue, MORE BACH's other pieces, chorales aside). */
import { BOOK1 } from "./book1.ts";
import type { PieceColours } from "./kit.ts";

export const COLOURS: Readonly<Record<string, PieceColours>> = { ...BOOK1 };
