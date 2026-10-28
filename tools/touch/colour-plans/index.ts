/** D355: every piece's colours (the WTC's fugues, the Art of Fugue, MORE BACH's other pieces, chorales aside). */
import { AOF } from "./aof.ts";
import { BOOK1 } from "./book1.ts";
import { BOOK2 } from "./book2.ts";
import type { PieceColours } from "./kit.ts";
import { MORE } from "./more.ts";

export const COLOURS: Readonly<Record<string, PieceColours>> = { ...BOOK1, ...BOOK2, ...AOF, ...MORE };
