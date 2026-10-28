/**
 * D351: the word on a MORE BACH or CHORALES piece's picture, after its key (emblem.ts keyLabel), in the
 * language of Bach's own title pages as the WTC's PRAELUDIUM and FUGA are (the owner: the concerto cards
 * still said "· FUGA"; "change to what is most appropriate"):
 *   - a fugue keeps FUGA (the Contrapuncti, the unfinished fugue, BWV 1061's finale, the motet's fugue);
 *   - the Art of Fugue's canons CANON; the Musical Offering's ricercars RICERCAR;
 *   - the Inventions INVENTIO and the Sinfonias SINFONIA (Bach's own words in the 1723 fair copy);
 *   - a concerto movement its tempo word, as written (ALLEGRO, ADAGIO, LARGO, VIVACE, PRESTO, ANDANTE,
 *     LARGHETTO, SICILIANO/SICILIANA: "ALLA SICILIANA" by its noun; one word, the qualifiers left to the
 *     title: "ADAGIO E PIANO SEMPRE" ADAGIO);
 *   - the motet's double-choir opening MOTETTE; the cantata's numbers ARIA; a chorale CHORAL.
 */
import type { TouchFugue } from "../touch/fugue.ts";

/** The words a concerto movement's title may start with (after its numeral and an editor's parenthesis). */
const TEMPO_WORDS = ["ALLEGRO", "ADAGIO", "LARGO", "LARGHETTO", "VIVACE", "PRESTO", "ANDANTE", "SICILIANO", "SICILIANA", "FUGA"];

export function pieceWord(f: Pick<TouchFugue, "id" | "kind" | "collection" | "short" | "title">): string {
  if (f.kind === "prelude") return "PRAELUDIUM";
  switch (f.collection) {
    case "chorale":
      return "CHORAL";
    case "aof":
      return /^bwv1080-c\d\d$/.test(f.id) ? "CANON" : "FUGA";
    case "mo":
      return "RICERCAR";
    case "inv":
      return "INVENTIO";
    case "sin":
      return "SINFONIA";
    case "motet":
      return /fugue/i.test(f.title) ? "FUGA" : "MOTETTE";
    case "cantata":
      return "ARIA";
    case "concerto":
    case "hconcerto": {
      // "BWV 1052 · I. ALLEGRO", "CONCERTO · II. LARGO MA NON TANTO", "BWV 1063 · II. ALLA SICILIANA", "BWV 1054 · I. (ALLEGRO)".
      const mv = (f.short ?? f.title).toUpperCase().match(/\b[IV]+\.\s*\(?([^)·]*)/)?.[1] ?? "";
      const word = mv.split(/\s+/).find((w) => TEMPO_WORDS.includes(w));
      return word ?? "CONCERTO";
    }
    default:
      return "FUGA";
  }
}
