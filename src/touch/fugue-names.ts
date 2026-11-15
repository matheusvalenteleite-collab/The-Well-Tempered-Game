/**
 * The 48 fugues' names, en / pt (Brazilian) / es, `full` the name, `short` the tile's (the selection grid:
 * no article, a word or two). The piece's own title (Fugue 1 in C major) stays beside it.
 *
 * D374 named Book I and D383 Book II, one character a fugue, drawn in its picture (tools/pictures/). D664: the
 * Art of Fugue's 20 (the 14 contrapuncti with 12 and 13 as rectus and inversus, and the four canons).
 * WTC 1.92: the owner's own 48 (docs/design/FUGUE-NAMES-48.md on the design studio's branch, chosen over
 * two rounds of the studio's proposals, 31 Oct 2026) replace them where they differ; kept: I/2, 9, 10, 11,
 * 14, 16, 18, 22 and II/7, 11, 19. The owner's picture for each on the line above it. Where a figure is a
 * woman the Portuguese and Spanish say so (A Peregrina, La Peregrina): no masculine as the default.
 */
import type { Lang } from "../i18n/index.ts";

type Names = { full: string; short: string };
type Row = Record<Lang, Names>;

const n = (full: string, short: string): Names => ({ full, short });

export const FUGUE_NAMES: Readonly<Record<string, Row>> = {
  // Four singers, women and men, in a staggered row, each mouth opening a beat after the last.
  wtc1f01: { en: n("The Canon", "Canon"), pt: n("O Cânone", "Cânone"), es: n("El Canon", "Canon") },
  // Kept (D374): the imp hopping C-B-C.
  wtc1f02: { en: n("The Imp", "Imp"), pt: n("O Diabrete", "Diabrete"), es: n("El Duendecillo", "Duende") },
  // Little Red Riding Hood skipping a stone across a pond, basket on her arm (moved here from I/7).
  wtc1f03: { en: n("The Stone-Skipper", "Stone-Skipper"), pt: n("A Menina das Pedrinhas", "Pedrinhas"), es: n("La Niña de las Piedras", "Piedras") },
  // A great wooden cross on a hill at dusk, five candles at its foot.
  wtc1f04: { en: n("The Cross", "Cross"), pt: n("A Cruz", "Cruz"), es: n("La Cruz", "Cruz") },
  // A crown lowered onto a queen's bowed head in a cathedral, banners above.
  wtc1f05: { en: n("The Coronation", "Coronation"), pt: n("A Coroação", "Coroação"), es: n("La Coronación", "Coronación") },
  // A rider on a forest road, figures half-hidden behind the trees.
  wtc1f06: { en: n("The Ambush", "Ambush"), pt: n("A Emboscada", "Emboscada"), es: n("La Emboscada", "Emboscada") },
  // A girl on an old high bicycle, ribbon flying, ringing the bell.
  wtc1f07: { en: n("The Bicycle", "Bicycle"), pt: n("A Bicicleta", "Bicicleta"), es: n("La Bicicleta", "Bicicleta") },
  // A pilgrim, a woman, with staff and shell on a long road at dusk, a shrine far off.
  wtc1f08: { en: n("The Pilgrim", "Pilgrim"), pt: n("A Peregrina", "Peregrina"), es: n("La Peregrina", "Peregrina") },
  // Kept (D374).
  wtc1f09: { en: n("The Sparrow", "Sparrow"), pt: n("O Pardal", "Pardal"), es: n("El Gorrión", "Gorrión") },
  // Kept (D374).
  wtc1f10: { en: n("The Two Horsemen", "Horsemen"), pt: n("Os Dois Cavaleiros", "Cavaleiros"), es: n("Los Dos Jinetes", "Jinetes") },
  // Kept (D374); her face redrawn (the owner: "looks off").
  wtc1f11: { en: n("The Shepherdess", "Shepherdess"), pt: n("A Pastora", "Pastora"), es: n("La Pastora", "Pastora") },
  // A choir in black behind a bier, candles in a row.
  wtc1f12: { en: n("The Requiem", "Requiem"), pt: n("O Réquiem", "Réquiem"), es: n("El Réquiem", "Réquiem") },
  // A child watching fish drift in a big glass aquarium (Bodky's serene "Little Brook").
  wtc1f13: { en: n("The Aquarium", "Aquarium"), pt: n("O Aquário", "Aquário"), es: n("El Acuario", "Acuario") },
  // Kept (D374).
  wtc1f14: { en: n("Pierrot", "Pierrot"), pt: n("Pierrô", "Pierrô"), es: n("Pierrot", "Pierrot") },
  // A pinball machine, the ball mid-flight among lit bumpers (Brazil's fliperama).
  wtc1f15: { en: n("The Pinball", "Pinball"), pt: n("O Fliperama", "Fliperama"), es: n("El Pinball", "Pinball") },
  // Kept (D374): the chess knight's L.
  wtc1f16: { en: n("The Knight", "Knight"), pt: n("O Cavalo do Xadrez", "Cavalo"), es: n("El Caballo de Ajedrez", "Caballo") },
  // A girl writing in a diary by a summer window, a pressed flower on the page.
  wtc1f17: { en: n("The Diary", "Diary"), pt: n("O Diário", "Diário"), es: n("El Diario", "Diario") },
  // Kept (D374); face and nightcap redrawn (the owner).
  wtc1f18: { en: n("The Sleepwalker", "Sleepwalker"), pt: n("O Sonâmbulo", "Sonâmbulo"), es: n("El Sonámbulo", "Sonámbulo") },
  // Three slapstick comedians in silent-film sepia (generic figures, not portraits; the titles the films had).
  wtc1f19: { en: n("The Three Stooges", "Stooges"), pt: n("Os Três Patetas", "Patetas"), es: n("Los Tres Chiflados", "Chiflados") },
  // A steam locomotive at full power, pistons driving, smoke streaming.
  wtc1f20: { en: n("The Locomotive", "Locomotive"), pt: n("A Locomotiva", "Locomotiva"), es: n("La Locomotora", "Locomotora") },
  // Three marionettes dancing in step, strings rising out of frame.
  wtc1f21: { en: n("The Marionettes", "Marionettes"), pt: n("As Marionetes", "Marionetes"), es: n("Las Marionetas", "Marionetas") },
  // Kept (D374).
  wtc1f22: { en: n("The Procession", "Procession"), pt: n("A Procissão", "Procissão"), es: n("La Procesión", "Procesión") },
  // An old gramophone with a horn in a quiet room, a cat asleep.
  wtc1f23: { en: n("The Gramophone", "Gramophone"), pt: n("O Gramofone", "Gramofone"), es: n("El Gramófono", "Gramófono") },
  // A scholar (here a woman) in her study at night, a book open, a sign glowing in the air.
  wtc1f24: { en: n("Faust", "Faust"), pt: n("Fausto", "Fausto"), es: n("Fausto", "Fausto") },
  // Book II.
  // An athlete on the podium, laurel crowned, arms up: a woman (the owner), so the champion's word is hers.
  wtc2f01: { en: n("The Olympian", "Olympian"), pt: n("A Campeã Olímpica", "Campeã"), es: n("La Campeona Olímpica", "Campeona") },
  // Figures walking at sunset, their shadows twice their length (the subject at double length, D383).
  wtc2f02: { en: n("The Shadows", "Shadows"), pt: n("As Sombras", "Sombras"), es: n("Las Sombras", "Sombras") },
  // An operator at an old telephone switchboard, cords crossing; each entry plugs a cord.
  wtc2f03: { en: n("The Switchboard", "Switchboard"), pt: n("A Central Telefônica", "Central"), es: n("La Centralita", "Centralita") },
  // D479 (the owner renamed it): a night road, the bandits fleeing and the police in pursuit, the imitation as the chase.
  wtc2f04: { en: n("The Chase", "Chase"), pt: n("A Perseguição", "Perseguição"), es: n("La Persecución", "Persecución") },
  // A bell tower at evening, one bell swinging, others waiting; the final stretto, all four.
  wtc2f05: { en: n("The Bell Tower", "Bell Tower"), pt: n("O Campanário", "Campanário"), es: n("El Campanario", "Campanario") },
  // A siege catapult at the instant of release; each entry draws the arm back.
  wtc2f06: { en: n("The Catapult", "Catapult"), pt: n("A Catapulta", "Catapulta"), es: n("La Catapulta", "Catapulta") },
  // Kept (D383): "saturated with euphony like a choral fugue"; Bodky: "best on the (home) organ".
  wtc2f07: { en: n("The Organist", "Organist"), pt: n("O Organista", "Organista"), es: n("El Organista", "Organista") },
  // Rain falling on a dark street, one lit window; the repeated opening notes, drops on the sill.
  wtc2f08: { en: n("The Rain", "Rain"), pt: n("A Chuva", "Chuva"), es: n("La Lluvia", "Lluvia") },
  // A congregation standing, hymn books open, singing; each entry lights a line of the hymn.
  wtc2f09: { en: n("The Chorale", "Chorale"), pt: n("O Coral", "Coral"), es: n("El Coral", "Coral") },
  // The owner's name: a pickpocket in a long coat lifting a purse at a crowded fair.
  wtc2f10: { en: n("The Crook", "Crook"), pt: n("O Larápio", "Larápio"), es: n("El Ratero", "Ratero") },
  // Kept (D383): "fleeting and light"; Bodky: "light and airy; wing-line theme".
  wtc2f11: { en: n("The Butterfly", "Butterfly"), pt: n("A Borboleta", "Borboleta"), es: n("La Mariposa", "Mariposa") },
  // A masked ball, masks and cloaks in a candlelit hall; the fan opens at each cadence.
  wtc2f12: { en: n("The Masquerade", "Masquerade"), pt: n("O Baile de Máscaras", "Máscaras"), es: n("El Baile de Máscaras", "Máscaras") },
  // A rotary telephone, its bell shaking: the opening trill (the owner's Trill, D383, rung).
  wtc2f13: { en: n("The Telephone", "Telephone"), pt: n("O Telefone", "Telefone"), es: n("El Teléfono", "Teléfono") },
  // The owner's name: three sisters of three ages under one tree (three subjects, combined).
  wtc2f14: { en: n("The Three Sisters", "Three Sisters"), pt: n("As Três Irmãs", "Três Irmãs"), es: n("Las Tres Hermanas", "Tres Hermanas") },
  // The owner's name: a girl hopping across chalk squares (Bodky: counted in whole bars).
  wtc2f15: { en: n("Hopscotch", "Hopscotch"), pt: n("Amarelinha", "Amarelinha"), es: n("La Rayuela", "Rayuela") },
  // The owner's name: a jury box, the forewoman on her feet, the others shouting; four notes hammered.
  wtc2f16: { en: n("The Jury", "Jury"), pt: n("O Júri", "Júri"), es: n("El Jurado", "Jurado") },
  // A woman before a tall mirror, her reflection looking back, symmetrical.
  wtc2f17: { en: n("The Mirror", "Mirror"), pt: n("O Espelho", "Espelho"), es: n("El Espejo", "Espejo") },
  // A couple dancing a jig on a tavern floor, a fiddler on a barrel; both themes together, they spin.
  wtc2f18: { en: n("The Gigue", "Gigue"), pt: n("A Giga", "Giga"), es: n("La Giga", "Giga") },
  // Kept (D383): "simple, unpretentious; a quiet walk"; Bodky: "mild".
  wtc2f19: { en: n("The Wanderer", "Wanderer"), pt: n("O Andarilho", "Andarilho"), es: n("El Caminante", "Caminante") },
  // A city street splitting, a lamp-post leaning; each entry, the crack lengthens.
  wtc2f20: { en: n("The Earthquake", "Earthquake"), pt: n("O Terremoto", "Terremoto"), es: n("El Terremoto", "Terremoto") },
  // A father rocking a cradle by the fire (the owner: mother or father); it rocks once a bar.
  wtc2f21: { en: n("The Cradle", "Cradle"), pt: n("O Berço", "Berço"), es: n("La Cuna", "Cuna") },
  // A giant statue over a harbour, ships small at its feet; each entry, the statue firmer.
  wtc2f22: { en: n("The Colossus", "Colossus"), pt: n("O Colosso", "Colosso"), es: n("El Coloso", "Coloso") },
  // A poet reading by a grave under a willow; the branches move slowly, then still.
  wtc2f23: { en: n("The Elegy", "Elegy"), pt: n("A Elegia", "Elegia"), es: n("La Elegía", "Elegía") },
  // Two dancers in an emptying ballroom, the candles burning low; the end, one candle.
  wtc2f24: { en: n("The Last Dance", "Last Dance"), pt: n("A Última Dança", "Última Dança"), es: n("El Último Baile", "Último Baile") },
  // ---- THE ART OF FUGUE (D664, design studio; the owner approved the cards and the Lamplighter cycle) ----
  // A woman on a ladder lighting a street lamp at dusk: the subject, plain (the cycle's Lamplighter).
  "bwv1080-01": { en: n("The Lamplighter", "Lamplighter"), pt: n("A Acendedora de Lampiões", "Acendedora"), es: n("La Farolera", "Farolera") },
  // A boy drummer mid-stride: the subject against a dotted, marching figure.
  "bwv1080-02": { en: n("The Drummer", "Drummer"), pt: n("O Tamborileiro", "Tamborileiro"), es: n("El Tamborilero", "Tamborilero") },
  // A town upside down in still water: the subject inverted, a chromatic mist creeping.
  "bwv1080-03": { en: n("The Lake", "Lake"), pt: n("O Lago", "Lago"), es: n("El Lago", "Lago") },
  // A trapeze artist hanging upside down under the big top: the inverted subject.
  "bwv1080-04": { en: n("The Acrobat", "Acrobat"), pt: n("A Acrobata", "Acrobata"), es: n("La Acróbata", "Acróbata") },
  // Two dancers in a mirror pose: the counter-fugue, the subject answered by its inversion.
  "bwv1080-05": { en: n("The Dancers", "Dancers"), pt: n("Os Dançarinos", "Dançarinos"), es: n("Los Bailarines", "Bailarines") },
  // A king in a gold sun mask, mid-ballet: in Stylo Francese.
  "bwv1080-06": { en: n("The Sun King", "Sun King"), pt: n("O Rei Sol", "Rei Sol"), es: n("El Rey Sol", "Rey Sol") },
  // A giant, a man and a mouse on one road: per Augmentationem et Diminutionem.
  "bwv1080-07": { en: n("The Giant", "Giant"), pt: n("O Gigante", "Gigante"), es: n("El Gigante", "Gigante") },
  // Three streams meeting under a stone bridge: the triple fugue a 3.
  "bwv1080-08": { en: n("The Three Rivers", "Three Rivers"), pt: n("Os Três Rios", "Três Rios"), es: n("Los Tres Ríos", "Tres Ríos") },
  // A hare leaping past a tortoise: the fast new subject against the main one in long notes.
  "bwv1080-09": { en: n("The Hare and the Tortoise", "Tortoise"), pt: n("A Lebre e a Tartaruga", "Tartaruga"), es: n("La Liebre y la Tortuga", "Tortuga") },
  // Two halves of a stone bridge reaching for each other: the double fugue alla Decima.
  "bwv1080-10": { en: n("The Bridge", "Bridge"), pt: n("A Ponte", "Ponte"), es: n("El Puente", "Puente") },
  // Three weavers at a loom, three threads crossing: the triple fugue a 4.
  "bwv1080-11": { en: n("The Weavers", "Weavers"), pt: n("As Tecelãs", "Tecelãs"), es: n("Las Tejedoras", "Tejedoras") },
  // A farmhouse and its tree at noon: the mirror fugue's rectus.
  "bwv1080-12r": { en: n("The Day", "Day"), pt: n("O Dia", "Dia"), es: n("El Día", "Día") },
  // The same farmhouse upside down under stars: its inversus, the exact mirror.
  "bwv1080-12i": { en: n("The Night", "Night"), pt: n("A Noite", "Noite"), es: n("La Noche", "Noche") },
  // An hourglass running: the mirror fugue a 3, rectus.
  "bwv1080-13r": { en: n("The Hourglass", "Hourglass"), pt: n("A Ampulheta", "Ampulheta"), es: n("El Reloj de Arena", "Reloj") },
  // The hourglass turned over: its inversus.
  "bwv1080-13i": { en: n("The Hourglass Turned", "Turned Glass"), pt: n("A Ampulheta Virada", "Virada"), es: n("El Reloj de Arena Volteado", "Volteado") },
  // A kite and its shadow, larger and the other way: the canon by augmentation in contrary motion.
  "bwv1080-c14": { en: n("The Kite", "Kite"), pt: n("A Pipa", "Pipa"), es: n("La Cometa", "Cometa") },
  // A hiker's call returning across a gorge: the canon at the octave.
  "bwv1080-c15": { en: n("The Echo", "Echo"), pt: n("O Eco", "Eco"), es: n("El Eco", "Eco") },
  // Two swallows in parallel, one a little below: the canon at the tenth.
  "bwv1080-c16": { en: n("The Two Swallows", "Swallows"), pt: n("As Duas Andorinhas", "Andorinhas"), es: n("Las Dos Golondrinas", "Golondrinas") },
  // Two sets of footprints in snow, one in the other's: the canon at the twelfth.
  "bwv1080-c17": { en: n("The Footprints", "Footprints"), pt: n("As Pegadas", "Pegadas"), es: n("Las Huellas", "Huellas") },
  // A composer's desk at night, one candle, the quill stopped mid-line: unfinished, B-A-C-H.
  "bwv1080-14": { en: n("The Last Candle", "Last Candle"), pt: n("A Última Vela", "Última Vela"), es: n("La Última Vela", "Última Vela") },
};

/** A piece's name in a language (null where it has none). */
export function fugueName(id: string, l: Lang, form: "full" | "short" = "full"): string | null {
  return FUGUE_NAMES[id]?.[l]?.[form] ?? null;
}
