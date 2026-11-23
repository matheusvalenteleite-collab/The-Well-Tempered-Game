/**
 * D920, HOW TO PLAY's words (en, Brazilian Portuguese, es): the written companion of BASICS v2 (D686+).
 * PART A mirrors BASICS' acts in their order and with their rules (one idea a card: one or two sentences,
 * a picture, the real-thumbs clip where BASICS has one, and a TRY IT pad that runs BASICS' own stage);
 * PART B is the compact reference. Every rule is the game's as the code stands (proto-game.ts, articulation.ts,
 * mechanics.ts, scoring.ts, touch-expr.ts, slide-sound.ts; the rows named beside each card). Not taught, by the
 * owner's wish: holding one note and sounding the next by lifting it.
 */
export interface T {
  en: string;
  pt: string;
  es: string;
}
export const L = (en: string, pt: string, es: string): T => ({ en, pt, es });

/** A clip: bars of a fugue drawn and heard; `mine` the voice drawn as the player's; `slides` pairs of the player's notes joined by a slide. */
export interface Clip {
  piece: string;
  bars: [number, number];
  voices?: number[];
  mine?: number;
  thumbs?: boolean;
  slides?: [number, number][];
  /** Only the entries starting in these bars flagged (all in the clip where unset). */
  flagBars?: number[];
  /** Slower than the fugue's tempo, below 1. */
  speed?: number;
}

/** The drawings (HowTo.tsx `Drawing`), each in the game's own look. */
export type DrawId = "timing" | "direction" | "two" | "hold" | "strong" | "legato" | "shake" | "slide" | "gameboy" | "psych" | "screen";
export type Fig =
  | { kind: "draw"; draw: DrawId }
  | { kind: "clip"; clip: Clip }
  | { kind: "flags" }
  | { kind: "grades" }
  | { kind: "parts" }
  | { kind: "marks" }
  | { kind: "signs"; where: "in" | "over" }
  | { kind: "words"; words: readonly [string, string][] };

/** A TRY IT pad: a BASICS v2 stage (plan.ts ACTS), run as BASICS runs its DO (the aids on, the music waiting at the first note). */
export interface Try {
  stage: string;
  label: T;
  /** Shorter than the stage (its last bar), to keep a pad to a few notes. */
  toBar?: number;
}
/** The real-thumbs clips BASICS v2 shows (D690; src/bench/basics/clips). */
export type Video = "tap" | "up" | "down" | "same" | "leap" | "two" | "hold" | "lift";

export interface Card {
  id: string;
  title: T;
  /** One or two sentences. */
  lead: T[];
  fig: Fig;
  videos?: Video[];
  tries?: Try[];
  /** A small print line under the lead. */
  fine?: T;
}
export interface Chapter {
  id: string;
  n: string;
  title: T;
  /** A chapter with stations (6) is its cards; else one card. */
  cards: Card[];
  intro?: T;
}
export interface RefRow {
  id: string;
  title: T;
  lines: T[];
  fig?: Fig;
}

const dr = (draw: DrawId): Fig => ({ kind: "draw", draw });

/** PART A, as BASICS v2: I TIMING, II DIRECTION, III TWO THUMBS, IV HOLDING, V A REAL FUGUE, VI MAKE IT SING. */
export const PLAY: Chapter[] = [
  {
    id: "timing",
    n: "1",
    title: L("TIMING", "TEMPO", "TIEMPO"),
    cards: [
      {
        id: "timing",
        title: L("TIMING", "TEMPO", "TIEMPO"),
        lead: [
          L(
            "Notes drift from right to left. When one reaches the gold line, touch a bar, either one: the moment your thumb lands is the note.",
            "As notas vêm da direita para a esquerda. Quando uma chega à linha dourada, toque numa barra, qualquer uma: o instante em que o polegar pousa é a nota.",
            "Las notas avanzan de derecha a izquierda. Cuando una llega a la línea dorada, toca una barra, cualquiera: el instante en que el pulgar se apoya es la nota.",
          ),
          L(
            "On the line is PERFECT; a little early or late is GOOD. A note you let go by is MISS.",
            "Em cima da linha é PERFEITO; um pouco antes ou depois é BOM. Uma nota que você deixa passar é ERROU.",
            "Sobre la línea es PERFECTO; un poco antes o después es BIEN. Una nota que dejas pasar es FALLO.",
          ),
        ],
        fig: dr("timing"),
        videos: ["tap"],
        tries: [
          { stage: "1.1", label: L("ONE NOTE", "UMA NOTA", "UNA NOTA") },
          { stage: "1.2", label: L("A PULSE", "UM PULSO", "UN PULSO") },
        ],
      },
    ],
  },
  {
    id: "direction",
    n: "2",
    title: L("DIRECTION", "DIREÇÃO", "DIRECCIÓN"),
    cards: [
      {
        id: "direction",
        title: L("DIRECTION", "DIREÇÃO", "DIRECCIÓN"),
        lead: [
          L(
            "It's not where you touch, it's where you go. Each touch is compared with that same thumb's last touch: higher for up, lower for down, the same spot for a repeated note.",
            "Não importa onde você toca, e sim para onde vai. Cada toque é comparado com o último toque do mesmo polegar: mais alto para subir, mais baixo para descer, o mesmo lugar para uma nota repetida.",
            "No importa dónde tocas, sino hacia dónde vas. Cada toque se compara con el último toque del mismo pulgar: más arriba para subir, más abajo para bajar, el mismo sitio para una nota repetida.",
          ),
          L(
            "The exact height never matters, so a big leap needs only a small move the right way. The wrong way is a ✕.",
            "A altura exata nunca importa: um salto grande pede só um pequeno movimento para o lado certo. Para o lado errado é um ✕.",
            "La altura exacta nunca importa: un salto grande pide solo un pequeño movimiento hacia el lado correcto. Hacia el lado equivocado es una ✕.",
          ),
        ],
        fine: L(
          "A thumb's first touch, and its first after a pause of about three beats, is free: any height is right.",
          "O primeiro toque de um polegar, e o primeiro depois de uma pausa de uns três tempos, é livre: qualquer altura está certa.",
          "El primer toque de un pulgar, y el primero tras una pausa de unos tres tiempos, es libre: cualquier altura vale.",
        ),
        fig: dr("direction"),
        videos: ["up", "down", "same", "leap"],
        tries: [
          { stage: "2.4", label: L("UP, DOWN, SAME", "SOBE, DESCE, IGUAL", "SUBE, BAJA, IGUAL") },
          { stage: "2.5", label: L("A LEAP", "UM SALTO", "UN SALTO") },
        ],
      },
    ],
  },
  {
    id: "two",
    n: "3",
    title: L("TWO THUMBS", "DOIS POLEGARES", "DOS PULGARES"),
    cards: [
      {
        id: "two",
        title: L("TWO THUMBS", "DOIS POLEGARES", "DOS PULGARES"),
        lead: [
          L(
            "Share the notes between your thumbs: left, right, left. It's quicker, and it sounds better.",
            "Divida as notas entre os polegares: esquerdo, direito, esquerdo. É mais rápido e soa melhor.",
            "Reparte las notas entre los pulgares: izquierdo, derecho, izquierdo. Es más rápido y suena mejor.",
          ),
          L(
            "Each thumb follows its own last touch, never the other's: a right-thumb note goes up from where the right thumb last was.",
            "Cada polegar segue o seu próprio último toque, nunca o do outro: uma nota do polegar direito sobe a partir de onde o direito tocou por último.",
            "Cada pulgar sigue su propio último toque, nunca el del otro: una nota del pulgar derecho sube desde donde tocó el derecho por última vez.",
          ),
        ],
        fine: L(
          "In the tutorials a dot under each note says which thumb: filled, the thumb you start with; hollow, the other. Each bar wears its own dot. The game never checks which thumb you use.",
          "Nos tutoriais, um ponto embaixo de cada nota diz qual polegar: cheio, o polegar com que você começa; vazio, o outro. Cada barra tem o seu ponto. O jogo nunca confere qual polegar você usa.",
          "En los tutoriales, un punto bajo cada nota dice qué pulgar: lleno, el pulgar con el que empiezas; vacío, el otro. Cada barra lleva su propio punto. El juego nunca comprueba qué pulgar usas.",
        ),
        fig: dr("two"),
        videos: ["two"],
        tries: [{ stage: "3.1", label: L("A SCALE", "UMA ESCALA", "UNA ESCALA") }],
      },
    ],
  },
  {
    id: "hold",
    n: "4",
    title: L("HOLDING", "SEGURAR", "MANTENER"),
    cards: [
      {
        id: "hold",
        title: L("HOLDING AND RESTS", "SEGURAR E PAUSAS", "MANTENER Y SILENCIOS"),
        lead: [
          L(
            "Your thumb is the key: keep it down and the note sings on, lift it and the note stops. Hold a long block to its end: HELD. Lifting before about half of it is TOO SOON.",
            "O polegar é a tecla: mantenha-o apoiado e a nota continua; levante-o e ela para. Segure um bloco longo até o fim: SUSTENTOU. Levantar antes de mais ou menos a metade é CEDO DEMAIS.",
            "El pulgar es la tecla: mantenlo apoyado y la nota sigue sonando; levántalo y se detiene. Mantén un bloque largo hasta el final: SOSTENIDA. Levantar antes de más o menos la mitad es DEMASIADO PRONTO.",
          ),
          L(
            "Where your voice rests, lift. Holding on through a rest is REST!",
            "Onde a sua voz pausa, levante. Segurar por cima de uma pausa é PAUSA!",
            "Donde tu voz calla, levanta. Mantener a través de un silencio es ¡SILENCIO!",
          ),
        ],
        fig: dr("hold"),
        videos: ["hold", "lift"],
        tries: [
          { stage: "4.1", label: L("LONG NOTES", "NOTAS LONGAS", "NOTAS LARGAS") },
          { stage: "4.2", label: L("RESTS", "PAUSAS", "SILENCIOS") },
        ],
      },
    ],
  },
  {
    id: "fugue",
    n: "5",
    title: L("A REAL FUGUE", "UMA FUGA DE VERDADE", "UNA FUGA DE VERDAD"),
    cards: [
      {
        id: "fugue",
        title: L("A REAL FUGUE", "UMA FUGA DE VERDADE", "UNA FUGA DE VERDAD"),
        lead: [
          L(
            "In a fugue every voice takes up the same tune in turn. You play one voice; the game plays the others.",
            "Numa fuga, cada voz retoma a mesma melodia, uma depois da outra. Você toca uma voz; o jogo toca as outras.",
            "En una fuga, cada voz retoma la misma melodía, una tras otra. Tú tocas una voz; el juego toca las demás.",
          ),
          L(
            "Yours are bright, rimmed in white; the others are dim and play themselves. Here: The Art of Fugue, Contrapunctus 1. You begin, alone, in the alto; at bar 5 the soprano answers with your tune.",
            "As suas são claras, com contorno branco; as outras são apagadas e tocam sozinhas. Aqui: A Arte da Fuga, Contrapunctus 1. Você começa, sozinho, no contralto; no compasso 5 o soprano responde com a sua melodia.",
            "Las tuyas son claras, con borde blanco; las otras son tenues y suenan solas. Aquí: El arte de la fuga, Contrapunctus 1. Empiezas tú, solo, en el contralto; en el compás 5 el soprano responde con tu melodía.",
          ),
        ],
        fig: { kind: "clip", clip: { piece: "bwv1080-01", bars: [1, 6], mine: 1 } },
        tries: [{ stage: "5.2", label: L("THE OPENING", "A ABERTURA", "EL COMIENZO"), toBar: 6 }],
      },
    ],
  },
  {
    id: "sing",
    n: "6",
    title: L("MAKE IT SING", "FAÇA CANTAR", "HAZLO CANTAR"),
    intro: L(
      "How a note sounds is yours: none of this ever costs or earns points, and right or wrong, the sound is the same.",
      "Como a nota soa é com você: nada disto tira ou dá pontos e, certo ou errado, o som é o mesmo.",
      "Cómo suena la nota es cosa tuya: nada de esto quita ni da puntos y, bien o mal, el sonido es el mismo.",
    ),
    cards: [
      {
        id: "strong",
        title: L("PIANO · STRONG AND SOFT", "PIANO · FORTE E SUAVE", "PIANO · FUERTE Y SUAVE"),
        lead: [
          L(
            "Across each bar, the side by the box is STRONG and the outer edge is SOFT. On the piano the bar has three zones: soft, normal, strong.",
            "Na largura de cada barra, o lado junto à caixa é FORTE e a borda de fora é SUAVE. No piano a barra tem três zonas: suave, normal, forte.",
            "A lo ancho de cada barra, el lado junto a la caja es FUERTE y el borde exterior es SUAVE. En el piano la barra tiene tres zonas: suave, normal, fuerte.",
          ),
        ],
        fig: dr("strong"),
        tries: [{ stage: "6.1", label: L("STRONG, SOFT", "FORTE, SUAVE", "FUERTE, SUAVE"), toBar: 3 }],
      },
      {
        id: "legato",
        title: L("PIANO · JOINED AND DETACHED", "PIANO · LIGADO E DESTACADO", "PIANO · LIGADO Y PICADO"),
        lead: [
          L(
            "To join two notes, pass the note from one thumb to the other with no gap: the next thumb lands as the first lets go.",
            "Para ligar duas notas, passe a nota de um polegar para o outro sem intervalo: o próximo polegar pousa quando o primeiro solta.",
            "Para ligar dos notas, pasa la nota de un pulgar al otro sin hueco: el siguiente pulgar se apoya cuando el primero suelta.",
          ),
          L(
            "For a short, detached note, touch and let go at once.",
            "Para uma nota curta, destacada, toque e solte logo.",
            "Para una nota corta, picada, toca y suelta enseguida.",
          ),
        ],
        fig: dr("legato"),
        tries: [
          { stage: "6.2", label: L("JOINED", "LIGADO", "LIGADO"), toBar: 3 },
          { stage: "6.3", label: L("SHORT", "CURTO", "CORTO"), toBar: 3 },
        ],
      },
      {
        id: "shake",
        title: L("HARPSICHORD · THE SHAKE", "CRAVO · O TRINADO", "CLAVE · EL TRINO"),
        lead: [
          L(
            "Where Bach prints a trill over a note, touch the note, then rock your thumb: the shake follows your rocking.",
            "Onde Bach imprime um trinado sobre a nota, toque a nota e depois balance o polegar: o trinado segue o seu balanço.",
            "Donde Bach imprime un trino sobre la nota, toca la nota y luego balancea el pulgar: el trino sigue tu balanceo.",
          ),
        ],
        fig: dr("shake"),
        tries: [{ stage: "6.4", label: L("A TRILL", "UM TRINADO", "UN TRINO") }],
      },
      {
        id: "slide",
        title: L("SOLO VOICES · THE SLIDE", "VOZES SOLO · O DESLIZE", "VOCES SOLISTAS · EL DESLIZAMIENTO"),
        lead: [
          L(
            "Keep your thumb down and glide it toward the next note, the way the tune goes: from halfway there, the next note sounds. Only one way, only to the next note; to turn back, lift.",
            "Mantenha o polegar apoiado e deslize-o em direção à próxima nota, no sentido da melodia: a partir da metade do caminho, a próxima nota soa. Só num sentido e só até a próxima nota; para voltar, levante.",
            "Mantén el pulgar apoyado y deslízalo hacia la nota siguiente, en el sentido de la melodía: a partir de la mitad del camino, suena la nota siguiente. Solo en un sentido y solo hasta la nota siguiente; para volver, levanta.",
          ),
        ],
        fine: L(
          "Each sound slides its own way: voices and strings glide, the piano adds a grace note, the harpsichord a quick shake.",
          "Cada som desliza à sua maneira: vozes e cordas deslizam, o piano põe uma apojatura, o cravo um trinado rápido.",
          "Cada sonido se desliza a su manera: voces y cuerdas se deslizan, el piano añade una apoyatura, el clave un trino rápido.",
        ),
        fig: dr("slide"),
        tries: [{ stage: "6.5", label: L("SLIDES", "DESLIZES", "DESLIZAMIENTOS"), toBar: 3 }],
      },
      {
        id: "gameboy",
        title: L("GAME BOY", "GAME BOY", "GAME BOY"),
        lead: [
          L(
            "Where you land picks the wave: the soft side a round square, the middle a hollow pulse, the strong side a thin, bright one. A held note moved sideways changes wave as you cross each third (the console's duty); a slide is the chip's quick pitch slide.",
            "Onde você pousa escolhe a onda: o lado suave uma quadrada redonda, o meio um pulso oco, o lado forte um pulso fino e brilhante. Uma nota segurada e movida para o lado troca de onda a cada terço que você cruza (o duty do console); um deslize é o rápido glissando do chip.",
            "Donde te apoyas elige la onda: el lado suave una cuadrada redonda, el centro un pulso hueco, el lado fuerte un pulso fino y brillante. Una nota mantenida y movida de lado cambia de onda en cada tercio que cruzas (el duty de la consola); un deslizamiento es el rápido glissando del chip.",
          ),
        ],
        fine: L(
          "In BASICS, its station plays the alto of Contrapunctus 1 on a pulse channel, over the console's own drums (CHIP KIT): play it your way.",
          "No BASICS, a estação dele toca o contralto do Contrapunctus 1 num canal de pulso, sobre a bateria do próprio console (CHIP KIT): toque do seu jeito.",
          "En BASICS, su estación toca la contralto del Contrapunctus 1 en un canal de pulso, sobre la batería de la propia consola (CHIP KIT): tócala a tu manera.",
        ),
        fig: dr("gameboy"),
        tries: [{ stage: "6.6", label: L("PLAY IT", "TOCAR", "TOCAR"), toBar: 3 }],
      },
      {
        id: "psych",
        title: L("PSYCH", "PSYCH", "PSYCH"),
        lead: [
          L(
            "A band of the late sixties: Mellotron, synthesizer, clean and fuzz guitars, Moog bass. The piano's three zones set each instrument's strength and colour; a held synthesizer, Mellotron or bass note swells as you move it sideways. A held guitar note moved sideways shakes into a guitarist's vibrato.",
            "Uma banda do fim dos anos sessenta: Mellotron, sintetizador, guitarras limpa e com fuzz, baixo Moog. As três zonas do piano dão a força e a cor de cada instrumento; uma nota segurada no sintetizador, no Mellotron ou no baixo cresce quando você a move para o lado. Uma nota segurada na guitarra, movida para o lado, ganha o vibrato do guitarrista.",
            "Una banda de finales de los sesenta: Mellotron, sintetizador, guitarras limpia y con fuzz, bajo Moog. Las tres zonas del piano dan la fuerza y el color de cada instrumento; una nota mantenida en el sintetizador, el Mellotron o el bajo crece cuando la mueves de lado. Una nota mantenida en la guitarra, movida de lado, toma el vibrato del guitarrista.",
          ),
        ],
        fine: L(
          "In BASICS, its station plays the alto of Contrapunctus 1 on the synthesizer, over LIEBEZEIT's drums: play it your way.",
          "No BASICS, a estação dele toca o contralto do Contrapunctus 1 no sintetizador, sobre a bateria LIEBEZEIT: toque do seu jeito.",
          "En BASICS, su estación toca la contralto del Contrapunctus 1 en el sintetizador, sobre la batería LIEBEZEIT: tócala a tu manera.",
        ),
        fig: dr("psych"),
        tries: [{ stage: "6.7", label: L("PLAY IT", "TOCAR", "TOCAR"), toBar: 3 }],
      },
    ],
  },
];

/** PART B: the reference, a row each, one or two lines. */
export const REF: RefRow[] = [
  {
    id: "screen",
    title: L("THE SCREEN", "A TELA", "LA PANTALLA"),
    lines: [
      L(
        "The box in the middle, a thumb bar on each side, the gold line near the left: now. Height is pitch; each voice keeps its colour and its place. Yours are full and rimmed in white; a note you hit shines, a missed one goes dark. The box takes the colour of the key.",
        "A caixa no meio, uma barra para cada polegar dos lados, a linha dourada perto da esquerda: o agora. A altura é o tom; cada voz mantém a sua cor e o seu lugar. As suas são cheias, com contorno branco; uma nota acertada brilha, uma perdida escurece. A caixa ganha a cor da tonalidade.",
        "La caja en el centro, una barra para cada pulgar a los lados, la línea dorada cerca de la izquierda: el ahora. La altura es el tono; cada voz conserva su color y su lugar. Las tuyas son llenas, con borde blanco; una nota acertada brilla, una fallada se oscurece. La caja toma el color de la tonalidad.",
      ),
    ],
    fig: dr("screen"),
  },
  {
    id: "words",
    title: L("THE WORDS", "AS PALAVRAS", "LAS PALABRAS"),
    lines: [
      L(
        "Said by your thumb as you play. The slide's, in amber, say why one failed: FURTHER, TOO FAR, TOO EARLY, TOO LATE, LIFTED, LIFT TO TURN.",
        "Ditas junto ao polegar enquanto você toca. As do deslize, em âmbar, dizem por que ele falhou: MAIS LONGE, LONGE DEMAIS, CEDO DEMAIS, TARDE DEMAIS, LEVANTOU, LEVANTE PARA VOLTAR.",
        "Aparecen junto al pulgar mientras tocas. Las del deslizamiento, en ámbar, dicen por qué falló: MÁS LEJOS, DEMASIADO LEJOS, DEMASIADO PRONTO, DEMASIADO TARDE, LEVANTADO, LEVANTA PARA VOLVER.",
      ),
    ],
    fig: { kind: "words", words: [["PERFECT", "#ffd23f"], ["GOOD", "#5fdc6a"], ["✕", "#d8443a"], ["MISS", "#d8443a"], ["HELD", "#5fdc6a"], ["TOO SOON", "#f0784a"], ["REST!", "#f0784a"]] },
  },
  {
    id: "grade",
    title: L("SCORE AND GRADE", "PONTUAÇÃO E NOTA", "PUNTUACIÓN Y NOTA"),
    lines: [
      L(
        "PERFORMANCE, 0 to 100: the notes right (60), timing (15: GOOD counts three quarters), touch (15: holds, rests, joins, Busoni's signs) and the subject's entries (10). The grade comes from it alone: S from 95, A 90, B 80, C 70, D below.",
        "INTERPRETAÇÃO, de 0 a 100: notas certas (60), tempo (15: BOM vale três quartos), toque (15: notas seguradas, pausas, ligaduras, sinais de Busoni) e entradas do sujeito (10). A nota vem só dela: S a partir de 95, A 90, B 80, C 70, D abaixo.",
        "INTERPRETACIÓN, de 0 a 100: notas acertadas (60), tiempo (15: BIEN cuenta tres cuartos), toque (15: notas mantenidas, silencios, ligados, signos de Busoni) y entradas del sujeto (10). La nota sale solo de ella: S desde 95, A 90, B 80, C 70, D por debajo.",
      ),
      L(
        "The score is for bragging: PERFECT 2, GOOD 1, plus holds, entries and cadences; +10% for every 16 right in a row (up to +50%), a slip a step off; at the end × your performance. Your best is kept per fugue and voice.",
        "A pontuação é para se gabar: PERFEITO 2, BOM 1, mais notas seguradas, entradas e cadências; +10% a cada 16 certas seguidas (até +50%), um erro tira um degrau; no fim, × a sua interpretação. O seu recorde fica guardado por fuga e por voz.",
        "La puntuación es para presumir: PERFECTO 2, BIEN 1, más notas mantenidas, entradas y cadencias; +10% por cada 16 seguidas (hasta +50%), un fallo resta un escalón; al final, × tu interpretación. Tu récord se guarda por fuga y por voz.",
      ),
    ],
    fig: { kind: "grades" },
  },
  {
    id: "crowd",
    title: L("THE CROWD", "A PLATEIA", "EL PÚBLICO"),
    lines: [
      L(
        "The crowd hears the last few seconds of your playing. A wrong note bothers it less than a note let go by; about six seconds with nothing right and it leaves, ending the round. A two-second slip never empties it.",
        "A plateia ouve os últimos segundos do que você toca. Uma nota errada a incomoda menos que uma nota que você deixa passar; uns seis segundos sem nada certo e ela vai embora, e a partida acaba. Um deslize de dois segundos nunca a esvazia.",
        "El público escucha los últimos segundos de lo que tocas. Una nota equivocada le molesta menos que una que dejas pasar; unos seis segundos sin nada bien y se va, y la partida termina. Un tropiezo de dos segundos nunca lo vacía.",
      ),
    ],
  },
  {
    id: "flags",
    title: L("THE FUGUE'S FLAGS", "AS BANDEIRAS DA FUGA", "LAS BANDERAS DE LA FUGA"),
    lines: [
      L(
        "A flag in the voice's colour marks each entry of the subject: upside down when inverted, wide when augmented, pressed when diminished, numbered where there are several subjects. Overlapping flags are a stretto. With ⚙ CANONS & FUGUES on MORPH, an inverted, augmented or diminished entry is seen being made from the subject (or from the entry before it), and in the canons a ribbon carries the leader's line to its follower.",
        "Uma bandeira na cor da voz marca cada entrada do sujeito: de cabeça para baixo quando invertido, larga quando aumentado, apertada quando diminuído, numerada onde há vários sujeitos. Bandeiras sobrepostas são um stretto. Com ⚙ CÂNONES E FUGAS em ANIMADOS, uma entrada invertida, aumentada ou diminuída é vista sendo feita a partir do sujeito (ou da entrada anterior), e nos cânones uma faixa leva a linha de quem conduz até quem a segue.",
        "Una bandera del color de la voz marca cada entrada del sujeto: boca abajo si está invertido, ancha si está aumentado, apretada si está disminuido, numerada donde hay varios sujetos. Banderas superpuestas son un stretto. Con ⚙ CÁNONES Y FUGAS en ANIMADOS, una entrada invertida, aumentada o disminuida se ve hecha a partir del sujeto (o de la entrada anterior), y en los cánones una cinta lleva la línea de quien guía hasta quien la sigue.",
      ),
    ],
    fig: { kind: "flags" },
  },
  {
    id: "signs",
    title: L("SIGNS AND ORNAMENTS", "SINAIS E ORNAMENTOS", "SIGNOS Y ORNAMENTOS"),
    lines: [
      L(
        "A sharp or flat sits at the start of its block, the block a little off its row; play it as any note. An ornament is drawn over its note: touch, then rock. Busoni's markings over your notes say how each is touched (SETTINGS turns them off).",
        "Um sustenido ou bemol fica no início do bloco, o bloco um pouco fora da sua fileira; toque como qualquer nota. Um ornamento vem desenhado sobre a nota: toque e balance. As marcações de Busoni sobre as suas notas dizem como tocar cada uma (CONFIGURAÇÕES as desliga).",
        "Un sostenido o bemol va al principio de su bloque, el bloque un poco fuera de su fila; tócalo como cualquier nota. Un ornamento se dibuja sobre su nota: toca y balancea. Las indicaciones de Busoni sobre tus notas dicen cómo tocar cada una (AJUSTES las apaga).",
      ),
    ],
    fig: { kind: "signs", where: "over" },
  },
  {
    id: "sound",
    title: L("SOUND, TEMPO, DRUMS", "SOM, ANDAMENTO, BATERIA", "SONIDO, TEMPO, BATERÍA"),
    lines: [
      L(
        "Each fugue has its own sound; SOUND picks another (piano, harpsichord, organ, voices, GAME BOY, PSYCH and more). TEMPO: SLOW, DEFAULT, FAST. DRUMS adds a beat, never points: one knob turns it ON or OFF, the other shows its style (HOME, the sound's own, or another) and opens the grid of every style. Choosing another piece puts its sound, tempo and voice back to their defaults.",
        "Cada fuga tem o seu som; SOM escolhe outro (piano, cravo, órgão, vozes, GAME BOY, PSYCH e mais). ANDAMENTO: LENTO, PADRÃO, RÁPIDO. BATERIA acrescenta uma batida, nunca pontos: um botão a deixa LIGADA ou DESLIGADA, o outro mostra o estilo (DA CASA, o do próprio som, ou outro) e abre a grade com todos os estilos. Escolher outra peça devolve o som, o andamento e a voz ao padrão.",
        "Cada fuga tiene su sonido; SONIDO elige otro (piano, clave, órgano, voces, GAME BOY, PSYCH y más). TEMPO: LENTO, NORMAL, RÁPIDO. BATERÍA añade un ritmo, nunca puntos: un botón la deja ACTIVADA o DESACTIVADA, el otro muestra su estilo (DE LA CASA, el del propio sonido, u otro) y abre la cuadrícula con todos los estilos. Elegir otra pieza devuelve el sonido, el tempo y la voz a sus valores por defecto.",
      ),
    ],
  },
  {
    id: "settings",
    title: L("SETTINGS", "CONFIGURAÇÕES", "AJUSTES"),
    lines: [
      L(
        "LANGUAGE, VOLUME; BUSONI'S MARKINGS on or off; STAGE (each fugue's world behind the box: FULL, QUIET, OFF) and its WORLD SOUNDS; CANONS & FUGUES (MORPH or OFF: the canons' ribbon and the fugues' morphs); PISTONS for the organ and the harpsichord; SOUND DELAY: nothing to do on the speaker or wired headphones; with Bluetooth, tap along to the clicks.",
        "IDIOMA, VOLUME; MARCAÇÕES DE BUSONI ligadas ou não; CENÁRIO (o mundo de cada fuga atrás da caixa: CHEIO, DISCRETO, DESLIGADO) e os SONS DO CENÁRIO; CÂNONES E FUGAS (ANIMADOS ou DESLIGADOS: a faixa dos cânones e as transformações das fugas); PISTÕES para o órgão e o cravo; ATRASO DO SOM: nada a fazer no alto-falante ou com fone com fio; com Bluetooth, toque junto com os cliques.",
        "IDIOMA, VOLUMEN; INDICACIONES DE BUSONI sí o no; ESCENARIO (el mundo de cada fuga detrás de la caja: COMPLETO, DISCRETO, APAGADO) y sus SONIDOS; CÁNONES Y FUGAS (ANIMADOS o APAGADOS: la cinta de los cánones y las transformaciones de las fugas); PISTONES para el órgano y el clave; RETARDO DEL SONIDO: nada que hacer con el altavoz o auriculares con cable; con Bluetooth, toca al ritmo de los clics.",
      ),
    ],
  },
];

/** The guide's own labels. */
export const UI = {
  title: L("HOW TO PLAY", "COMO JOGAR", "CÓMO JUGAR"),
  ref: L("REFERENCE", "REFERÊNCIA", "REFERENCIA"),
  tryIt: L("TRY IT", "EXPERIMENTE", "PRUÉBALO"),
  again: L("AGAIN", "DE NOVO", "OTRA VEZ"),
  done: L("DONE", "PRONTO", "LISTO"),
  thumbs: L("THUMBS", "POLEGARES", "PULGARES"),
  picture: L("PICTURE", "DESENHO", "DIBUJO"),
  listen: L("LISTEN", "OUVIR", "ESCUCHAR"),
  stop: L("STOP", "PARAR", "PARAR"),
  loading: L("TUNING UP…", "AFINANDO…", "AFINANDO…"),
  waiting: L("The music waits for your first touch.", "A música espera o seu primeiro toque.", "La música espera tu primer toque."),
  passed: L("✓ THAT'S IT", "✓ ISSO MESMO", "✓ ASÍ ES"),
  right: L("{n} OF {of} RIGHT", "{n} DE {of} CERTAS", "{n} DE {of} BIEN"),
};

/** Everything above, for the tests (D496: no retired words anywhere in the guide). */
export const HOWTO = { play: PLAY, ref: REF, ui: UI };
