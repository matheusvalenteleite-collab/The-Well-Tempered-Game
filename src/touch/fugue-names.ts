/**
 * D374: Mario's names for the 24 fugues of Book I (Mario and Luigi's design report, the emblems' table;
 * the owner likes them), with Brazilian Portuguese and Spanish. `full` the name, `short` the tile's (the
 * selection grid: no article, a word or two). The piece's own title (Fugue 1 in C major) stays beside it.
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
};

/** A piece's name in a language (null where it has none). */
export function fugueName(id: string, l: Lang, form: "full" | "short" = "full"): string | null {
  return FUGUE_NAMES[id]?.[l]?.[form] ?? null;
}
