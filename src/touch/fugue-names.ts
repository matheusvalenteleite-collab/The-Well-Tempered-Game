/**
 * D374: Mario's names for the 24 fugues of Book I (Mario and Luigi's design report, the emblems' table;
 * the owner likes them), with Brazilian Portuguese and Spanish. `full` the name, `short` the tile's (the
 * selection grid: no article, a word or two). The piece's own title (Fugue 1 in C major) stays beside it.
 *
 * D383: Book II's 24 in the same spirit (one character a fugue, a person, an animal or a living thing,
 * drawn in its picture, tools/pictures/book2.py), each from the fugue itself: Keller's and Bodky's
 * characterisations (docs/wtc/readings/keller2.json, bodky2.json) and the subject's shape in
 * data/touch/pieces.json. The reason beside each row. II/13 is the owner's own.
 */
import type { Lang } from "../i18n/index.ts";

type Names = { full: string; short: string };
type Row = Record<Lang, Names>;

const n = (full: string, short: string): Names => ({ full, short });

export const FUGUE_NAMES: Readonly<Record<string, Row>> = {
  wtc1f01: { en: n("The Bell-Ringer", "Bell-Ringer"), pt: n("O Sineiro", "Sineiro"), es: n("El Campanero", "Campanero") },
  wtc1f02: { en: n("The Imp", "Imp"), pt: n("O Diabrete", "Diabrete"), es: n("El Duendecillo", "Duende") },
  wtc1f03: { en: n("The Juggler", "Juggler"), pt: n("O Malabarista", "Malabarista"), es: n("El Malabarista", "Malabarista") },
  wtc1f04: { en: n("The Pilgrim", "Pilgrim"), pt: n("O Peregrino", "Peregrino"), es: n("El Peregrino", "Peregrino") },
  wtc1f05: { en: n("The Herald", "Herald"), pt: n("O Arauto", "Arauto"), es: n("El Heraldo", "Heraldo") },
  wtc1f06: { en: n("The Duellist", "Duellist"), pt: n("O Duelista", "Duelista"), es: n("El Duelista", "Duelista") },
  wtc1f07: { en: n("The Stone-Skipper", "Stone-Skipper"), pt: n("O Menino das Pedrinhas", "Pedrinhas"), es: n("El Niño de las Piedras", "Piedras") },
  wtc1f08: { en: n("The Lantern-Bearer", "Lantern"), pt: n("O Portador da Lanterna", "Lanterna"), es: n("El Portador del Farol", "Farol") },
  wtc1f09: { en: n("The Sparrow", "Sparrow"), pt: n("O Pardal", "Pardal"), es: n("El Gorrión", "Gorrión") },
  wtc1f10: { en: n("The Two Horsemen", "Horsemen"), pt: n("Os Dois Cavaleiros", "Cavaleiros"), es: n("Los Dos Jinetes", "Jinetes") },
  wtc1f11: { en: n("The Shepherdess", "Shepherdess"), pt: n("A Pastora", "Pastora"), es: n("La Pastora", "Pastora") },
  wtc1f12: { en: n("The Mourner", "Mourner"), pt: n("O Enlutado", "Enlutado"), es: n("El Doliente", "Doliente") },
  wtc1f13: { en: n("The Heron", "Heron"), pt: n("A Garça", "Garça"), es: n("La Garza", "Garza") },
  wtc1f14: { en: n("Pierrot", "Pierrot"), pt: n("Pierrô", "Pierrô"), es: n("Pierrot", "Pierrot") },
  wtc1f15: { en: n("The Acrobat", "Acrobat"), pt: n("O Acrobata", "Acrobata"), es: n("El Acróbata", "Acróbata") },
  wtc1f16: { en: n("The Knight", "Knight"), pt: n("O Cavalo do Xadrez", "Cavalo"), es: n("El Caballo de Ajedrez", "Caballo") },
  wtc1f17: { en: n("The Abbot", "Abbot"), pt: n("O Abade", "Abade"), es: n("El Abad", "Abad") },
  wtc1f18: { en: n("The Sleepwalker", "Sleepwalker"), pt: n("O Sonâmbulo", "Sonâmbulo"), es: n("El Sonámbulo", "Sonámbulo") },
  wtc1f19: { en: n("The Conjurer", "Conjurer"), pt: n("O Mágico", "Mágico"), es: n("El Ilusionista", "Ilusionista") },
  wtc1f20: { en: n("The Blacksmith", "Blacksmith"), pt: n("O Ferreiro", "Ferreiro"), es: n("El Herrero", "Herrero") },
  wtc1f21: { en: n("The Puppeteer", "Puppeteer"), pt: n("O Titereiro", "Titereiro"), es: n("El Titiritero", "Titiritero") },
  wtc1f22: { en: n("The Procession", "Procession"), pt: n("A Procissão", "Procissão"), es: n("La Procesión", "Procesión") },
  wtc1f23: { en: n("The Lamplighter", "Lamplighter"), pt: n("O Acendedor de Lampiões", "Lampiões"), es: n("El Farolero", "Farolero") },
  wtc1f24: { en: n("The Clockmaker", "Clockmaker"), pt: n("O Relojoeiro", "Relojoeiro"), es: n("El Relojero", "Relojero") },
  // Book II (D383).
  // Keller: "masculine humour … high spirits"; the subject's turn (G-F-G) is a sail coming round.
  wtc2f01: { en: n("The Miller", "Miller"), pt: n("O Moleiro", "Moleiro"), es: n("El Molinero", "Molinero") },
  // Keller: "severe … inner strength"; the subject comes back at double length, one stone twice the size.
  wtc2f02: { en: n("The Mason", "Mason"), pt: n("O Pedreiro", "Pedreiro"), es: n("El Cantero", "Cantero") },
  // Bodky: "very complicated texture"; Keller: "bathed in euphony"; many threads, one cloth.
  wtc2f03: { en: n("The Weaver", "Weaver"), pt: n("A Tecelã", "Tecelã"), es: n("La Tejedora", "Tejedora") },
  // A running gigue in 12/16 at night (C♯ minor), two subjects: a fox's two trails of prints.
  wtc2f04: { en: n("The Fox", "Fox"), pt: n("A Raposa", "Raposa"), es: n("El Zorro", "Zorro") },
  // Keller: "a vocal (choral) fugue"; Bodky: a "vocal theme"; the subject opens on three repeated notes, beaten time.
  wtc2f05: { en: n("The Cantor", "Cantor"), pt: n("O Chantre", "Chantre"), es: n("El Chantre", "Chantre") },
  // Keller: "controlled energy, elastically resilient … great forcefulness and terseness"; the rising run, a bow drawn.
  wtc2f06: { en: n("The Archer", "Archer"), pt: n("O Arqueiro", "Arqueiro"), es: n("El Arquero", "Arquero") },
  // Keller: "saturated with euphony like a choral fugue"; Bodky: "best on the (home) organ"; long notes.
  wtc2f07: { en: n("The Organist", "Organist"), pt: n("O Organista", "Organista"), es: n("El Organista", "Organista") },
  // Bodky: "a gem for connoisseurs"; Keller: "heavy melancholy and great seriousness": a dark stone cut with care.
  wtc2f08: { en: n("The Gem-Cutter", "Gem-Cutter"), pt: n("O Lapidário", "Lapidário"), es: n("El Lapidario", "Lapidario") },
  // Keller: "pure, transfigured vocal beauty … Palestrina"; Bodky: "flights of angels", a Christmas piece.
  wtc2f09: { en: n("The Angel", "Angel"), pt: n("O Anjo", "Anjo"), es: n("El Ángel", "Ángel") },
  // Keller: "energetic, impatient subject pressing forward": a hound straining after the scent.
  wtc2f10: { en: n("The Hound", "Hound"), pt: n("O Cão de Caça", "Cão de Caça"), es: n("El Sabueso", "Sabueso") },
  // Keller (Kirnberger): "fleeting and light"; Bodky: "light and airy; wing-line theme".
  wtc2f11: { en: n("The Butterfly", "Butterfly"), pt: n("A Borboleta", "Borboleta"), es: n("La Mariposa", "Mariposa") },
  // Keller: "with caprice and a certain humour"; the subject taps F-F-F, E-E-E.
  wtc2f12: { en: n("The Woodpecker", "Woodpecker"), pt: n("O Pica-Pau", "Pica-Pau"), es: n("El Pájaro Carpintero", "Carpintero") },
  // The owner's name: of the 48 subjects only this one begins with a trill (E♯-D♯-E♯-F♯).
  wtc2f13: { en: n("The Trill", "Trill"), pt: n("O Trinado", "Trinado"), es: n("El Trino", "Trino") },
  // Three subjects (Keller: "thoughtful … terse, energetic … gently flowing") combined: three flasks into one.
  wtc2f14: { en: n("The Alchemist", "Alchemist"), pt: n("O Alquimista", "Alquimista"), es: n("El Alquimista", "Alquimista") },
  // Bodky: "corrente-like 3/8 … counted in whole bars"; Keller: "delicately moving"; the D-B-D-G loops.
  wtc2f15: { en: n("The Swallow", "Swallow"), pt: n("A Andorinha", "Andorinha"), es: n("La Golondrina", "Golondrina") },
  // Keller: "declamation with raised voice, a hurled protest"; Bodky: "molto feroce; parlando theme".
  wtc2f16: { en: n("The Orator", "Orator"), pt: n("O Orador", "Orador"), es: n("El Orador", "Orador") },
  // Keller: "grace, equipoise and solemnity"; Bodky: "deep religious feeling (Sanctus symbol)".
  wtc2f17: { en: n("The Queen", "Queen"), pt: n("A Rainha", "Rainha"), es: n("La Reina", "Reina") },
  // Bodky: "double fugue: first theme, second theme, both themes"; Keller: "galant": two partners, then together.
  wtc2f18: { en: n("The Dancers", "Dancers"), pt: n("Os Dançarinos", "Dançarinos"), es: n("Los Bailarines", "Bailarines") },
  // Keller: "simple, unpretentious; a quiet walk"; Bodky: "mild".
  wtc2f19: { en: n("The Wanderer", "Wanderer"), pt: n("O Andarilho", "Andarilho"), es: n("El Caminante", "Caminante") },
  // Keller: "extraordinary outburst of temper; heavy and powerful"; Bodky: "explosive".
  wtc2f20: { en: n("The Bull", "Bull"), pt: n("O Touro", "Touro"), es: n("El Toro", "Toro") },
  // Bodky: "'cradle' peace on earth … a Christmas scene"; Keller: "serene unconcern".
  wtc2f21: { en: n("The Mother", "Mother"), pt: n("A Mãe", "Mãe"), es: n("La Madre", "Madre") },
  // Keller: "most powerful fugue; heavy, troubled"; Bodky: "the most majestic of volume II": the sky on his back.
  wtc2f22: { en: n("The Titan", "Titan"), pt: n("O Titã", "Titã"), es: n("El Titán", "Titán") },
  // Keller: "quietly flowing, singing; gentle euphony"; two subjects, a boat poled over still water.
  wtc2f23: { en: n("The Ferryman", "Ferryman"), pt: n("O Barqueiro", "Barqueiro"), es: n("El Barquero", "Barquero") },
  // Bodky: "passepied; an unassuming 'Ausklang' for the whole collection": the last tune of the night.
  wtc2f24: { en: n("The Fiddler", "Fiddler"), pt: n("O Rabequeiro", "Rabequeiro"), es: n("El Violinista", "Violinista") },
};

/** A piece's name in a language (null where it has none). */
export function fugueName(id: string, l: Lang, form: "full" | "short" = "full"): string | null {
  return FUGUE_NAMES[id]?.[l]?.[form] ?? null;
}
