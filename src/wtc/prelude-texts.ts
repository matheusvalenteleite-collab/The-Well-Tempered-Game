/**
 * D941 (the board: "write pt-BR and es for the six prelude notes and the PRELUDE_LOOKS lines … keep the meaning exact and
 * invent nothing"): ABOUT THIS PRELUDE's words in Brazilian Portuguese and Spanish (the game's tú). The English stay where
 * they were (notes.ts NOTES' `prelude`, cards.ts PRELUDE_LOOKS); each line here says the same, its metres, tempo words and
 * comparisons kept. Terms: semiquaver semicolcheia / semicorchea; bar compasso / compás; walking bass baixo caminhante /
 * bajo caminante; trio sonata sonata em trio / sonata en trío.
 */
import { lang } from "../i18n/index.ts";
import { preludeLook } from "../bench/cards.ts";
import { NOTES } from "./notes.ts";
export const NOTES_PRELUDE_I18N: Record<string, { pt: string; es: string }> = {
  "wtc1.01": {
    pt: "Uma só figura, um acorde arpejado, repetida pela peça inteira: o que muda é apenas a harmonia por baixo, compasso a compasso. Por isso é a lição mais pura de como ouvir uma progressão, e a razão pela qual Gounod pôde mais tarde pôr sobre ela uma melodia (a sua Ave Maria) sem mudar nada.",
    es: "Una sola figura, un acorde arpegiado, repetida a lo largo de toda la pieza: lo único que cambia es la armonía de abajo, compás a compás. Por eso es la lección más pura de cómo escuchar una progresión, y la razón por la que Gounod pudo más tarde poner encima una melodía (su Ave María) sin cambiar nada.",
  },
  "wtc1.02": {
    pt: "Um moto-perpétuo nas duas mãos, como um estudo, até que perto do fim a música se solta em mudanças de andamento (Presto, Adagio, Allegro): uma improvisação escrita antes da fuga rigorosa.",
    es: "Un movimiento perpetuo en las dos manos, como un estudio, hasta que cerca del final la música se libera en cambios de tempo (Presto, Adagio, Allegro): una improvisación escrita antes de la fuga estricta.",
  },
  "wtc1.07": {
    pt: "Mais que um prelúdio: depois de uma abertura à maneira de tocata, torna-se uma ampla peça fugada própria, mais longa e mais densa que a fuga que vem depois.",
    es: "Más que un preludio: tras una apertura a la manera de una tocata, se convierte en una amplia pieza fugada propia, más larga y de más peso que la fuga que la sigue.",
  },
  "wtc1.08": {
    pt: "Lento, grave, os acordes espalhados como os de um alaúde: uma das peças mais profundamente sentidas da coleção.",
    es: "Lento, grave, con los acordes desplegados como los de un laúd: una de las piezas más hondamente sentidas de la colección.",
  },
  "wtc1.10": {
    pt: "Uma melodia cantada e ornamentada sobre um acompanhamento constante, até que a segunda metade se transforma num Presto rápido.",
    es: "Una melodía cantable y ornamentada sobre un acompañamiento constante, hasta que la segunda mitad se convierte en un Presto rápido.",
  },
  "wtc1.24": {
    pt: "Uma peça em duas partes, cada uma repetida, com um baixo caminhante e duas linhas superiores em diálogo, como uma sonata em trio.",
    es: "Una pieza en dos partes, cada una repetida, con un bajo caminante y dos líneas superiores en diálogo, como una sonata en trío.",
  },
};

/** D234's lines, I/1-I/24, in order. */
export const PRELUDE_TRAITS_I18N: readonly { pt: string; es: string }[] = [
  { pt: "Cada compasso um acorde, arpejado na mesma figura fluente.", es: "Cada compás un acorde, arpegiado en la misma figura fluida." },
  { pt: "Moto-perpétuo nas duas mãos, até que um Presto e um Adagio o interrompem.", es: "Movimiento perpetuo en las dos manos, hasta que un Presto y un Adagio lo interrumpen." },
  { pt: "Figuras rápidas lançadas de uma mão para a outra, em 3/8.", es: "Figuras rápidas lanzadas de una mano a la otra, en 3/8." },
  { pt: "Uma peça lenta e cantada, em 6/4.", es: "Una pieza lenta y cantable, en 6/4." },
  { pt: "Semicolcheias correndo sobre um baixo destacado.", es: "Semicorcheas que corren sobre un bajo destacado." },
  { pt: "Tercinas de semicolcheias sobre um baixo caminhante.", es: "Tresillos de semicorcheas sobre un bajo caminante." },
  { pt: "Um prelúdio amplo que se torna uma fuga própria.", es: "Un preludio amplio que se convierte en una fuga propia." },
  { pt: "Acordes lentos e uma melodia de luto, em 3/2.", es: "Acordes lentos y una melodía doliente, en 3/2." },
  { pt: "Uma pastoral em 12/8.", es: "Una pastoral en 12/8." },
  { pt: "Uma melodia ornamentada sobre um baixo constante, depois um Presto.", es: "Una melodía ornamentada sobre un bajo constante, luego un Presto." },
  { pt: "Uma peça rápida a duas vozes, em 12/8.", es: "Una pieza rápida a dos voces, en 12/8." },
  { pt: "Uma peça grave de figuras suspirantes.", es: "Una pieza grave de figuras suspirantes." },
  { pt: "Uma peça suave e fluente a duas vozes, em 12/16.", es: "Una pieza suave y fluida a dos voces, en 12/16." },
  { pt: "Duas vozes em semicolcheias constantes.", es: "Dos voces en semicorcheas constantes." },
  { pt: "Figuras brilhantes e corridas, em 24/16.", es: "Figuras brillantes y veloces, en 24/16." },
  { pt: "Longos trinados sobre vozes em movimento.", es: "Largos trinos sobre voces en movimiento." },
  { pt: "Festivo, à maneira de um concerto, em 3/4.", es: "Festivo, a la manera de un concierto, en 3/4." },
  { pt: "Uma peça tranquila a três vozes, em 6/8.", es: "Una pieza tranquila a tres voces, en 6/8." },
  { pt: "Uma invenção leve a três vozes.", es: "Una invención ligera a tres voces." },
  { pt: "Uma peça vigorosa a duas vozes, em 9/8.", es: "Una pieza enérgica a dos voces, en 9/8." },
  { pt: "Floreios como os de uma tocata, as mãos se revezando.", es: "Floreos como los de una tocata, las manos turnándose." },
  { pt: "Um lamento solene, em acordes.", es: "Un lamento solemne, en acordes." },
  { pt: "Uma peça calma a três vozes.", es: "Una pieza tranquila a tres voces." },
  { pt: "Duas melodias sobre um baixo caminhante, em duas metades repetidas.", es: "Dos melodías sobre un bajo caminante, en dos mitades repetidas." },
];

/** A WTC prelude's companion note in the language in force (English where no translation is written). */
export function preludeNote(id: string): string | undefined {
  const m = /^wtc([12])p(\d\d)$/.exec(id);
  if (!m) return undefined;
  const key = `wtc${m[1]}.${m[2]}`;
  const en = NOTES[key]?.prelude;
  const l = lang();
  return en && l !== "en" ? (NOTES_PRELUDE_I18N[key]?.[l] ?? en) : en;
}

/** D234's one line of a Book I prelude's character, in the language in force. */
export function preludeTrait(id: string): string | undefined {
  const en = preludeLook(id)?.trait;
  const l = lang();
  if (!en || l === "en") return en;
  return PRELUDE_TRAITS_I18N[Number(id.slice(-2)) - 1]?.[l] ?? en;
}
