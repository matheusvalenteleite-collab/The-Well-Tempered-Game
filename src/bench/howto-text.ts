/**
 * D452: HOW TO PLAY's words, in English, Brazilian Portuguese and Spanish. Every rule here is the game's as it
 * stands (2.30): the sources are the decision rows named beside each section (docs/DECISIONS.md). The
 * examples are real bars of real fugues (HowTo.tsx clipNotes reads their notes from the game's data).
 */
export interface T {
  en: string;
  pt: string;
  es: string;
}
const L = (en: string, pt: string, es: string): T => ({ en, pt, es });

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
export type Fig = { kind: "clip"; clip: Clip } | { kind: "bar" } | { kind: "flags" } | { kind: "grades" } | { kind: "parts" } | { kind: "marks" } | { kind: "words"; words: readonly [string, string][] };
export type Block = { p: T } | { list: T[] } | { fig: Fig; cap?: T } | { sub: { id: string; title: T; blocks: Block[] } };
export interface Section {
  id: string;
  title: T;
  blocks: Block[];
}

const sub = (id: string, title: T, ...blocks: Block[]): Block => ({ sub: { id, title, blocks } });
const p = (en: string, pt: string, es: string): Block => ({ p: L(en, pt, es) });
const clip = (c: Clip, cap?: T): Block => ({ fig: { kind: "clip", clip: c }, cap });

export const HOWTO: Section[] = [
  {
    id: "minute",
    title: L("THE GAME IN A MINUTE", "O JOGO EM UM MINUTO", "EL JUEGO EN UN MINUTO"),
    blocks: [
      p(
        "A fugue is music for several voices that take up the same tune in turn. You play one of those voices with your two thumbs; the game plays all the others.",
        "Uma fuga é música para várias vozes que retomam a mesma melodia, uma depois da outra. Você toca uma dessas vozes com os dois polegares; o jogo toca todas as outras.",
        "Una fuga es música para varias voces que retoman la misma melodía, una tras otra. Tú tocas una de esas voces con los dos pulgares; el juego toca todas las demás.",
      ),
      p(
        "Hold the phone sideways. Choose a fugue in the middle of the selection screen, choose YOUR VOICE on the right, and press PLAY. New to it? The TUTORIAL on the left teaches the same things with your thumbs.",
        "Segure o celular deitado. Escolha uma fuga no meio da tela de seleção, escolha SUA VOZ à direita e toque em TOCAR. É a primeira vez? O TUTORIAL, à esquerda, ensina tudo isto com os seus polegares.",
        "Sostén el móvil de lado. Elige una fuga en el centro de la pantalla de selección, elige TU VOZ a la derecha y pulsa TOCAR. ¿Es tu primera vez? El TUTORIAL, a la izquierda, enseña todo esto con tus pulgares.",
      ),
      clip(
        { piece: "wtc1f02", bars: [1, 4], mine: 1, thumbs: true },
        L(
          "Fugue 2 in C minor, its first bars. Your voice (here the alto) is drawn full and rimmed in white; the others are thinner. The rings are your thumbs.",
          "Fuga 2 em dó menor, os primeiros compassos. A sua voz (aqui o contralto) é desenhada cheia, com contorno branco; as outras são mais finas. Os anéis são os seus polegares.",
          "Fuga 2 en do menor, los primeros compases. Tu voz (aquí el contralto) se dibuja llena, con borde blanco; las otras son más finas. Los anillos son tus pulgares.",
        ),
      ),
    ],
  },
  {
    id: "screen",
    title: L("THE PLAY SCREEN", "A TELA DE JOGO", "LA PANTALLA DE JUEGO"),
    blocks: [
      sub(
        "box",
        L("The music box", "A caixa de música", "La caja de música"),
        p(
          "In the middle is the music box. The notes come in from the right and move left; the gold line near the left is now. Height is pitch: a higher note sits higher. Every note is a block of the same height, and each voice keeps its own colour and its place (the bass always below the soprano).",
          "No meio fica a caixa de música. As notas entram pela direita e andam para a esquerda; a linha dourada, perto da esquerda, é o agora. A altura é o tom: uma nota mais aguda fica mais acima. Cada nota é um bloco da mesma altura, e cada voz mantém a sua cor e o seu lugar (o baixo sempre abaixo do soprano).",
          "En el centro está la caja de música. Las notas entran por la derecha y avanzan hacia la izquierda; la línea dorada, cerca de la izquierda, es el ahora. La altura es el tono: una nota más aguda está más arriba. Cada nota es un bloque de la misma altura, y cada voz conserva su color y su lugar (el bajo siempre por debajo del soprano).",
        ),
        p(
          "Your notes are full, with a white rim; the other voices are thinner and dimmer, and the game plays them for you. A note you hit shines; a missed one goes dark and shakes. The box takes the colour of the fugue's key, and its top names the fugue.",
          "As suas notas são cheias, com contorno branco; as outras vozes são mais finas e apagadas, e o jogo as toca por você. Uma nota acertada brilha; uma perdida escurece e treme. A caixa ganha a cor da tonalidade da fuga, e o topo dela diz o nome da fuga.",
          "Tus notas son llenas, con borde blanco; las otras voces son más finas y apagadas, y el juego las toca por ti. Una nota acertada brilla; una fallada se oscurece y tiembla. La caja toma el color de la tonalidad de la fuga, y en su parte superior aparece el nombre de la fuga.",
        ),
      ),
      sub(
        "bars",
        L("The two bars", "As duas barras", "Las dos barras"),
        p(
          "Left and right of the box are two bars, one for each thumb. You can touch anywhere along a bar. At the top of the bars: the score, the crowd, and the words SOFT and STRONG. On the right bar, your PERFORMANCE so far.",
          "À esquerda e à direita da caixa ficam duas barras, uma para cada polegar. Você pode tocar em qualquer ponto da barra. No alto das barras: a pontuação, a plateia e as palavras SUAVE e FORTE. Na barra direita, a sua INTERPRETAÇÃO até agora.",
          "A la izquierda y a la derecha de la caja hay dos barras, una para cada pulgar. Puedes tocar en cualquier punto de la barra. Arriba de las barras: la puntuación, el público y las palabras SUAVE y FUERTE. En la barra derecha, tu INTERPRETACIÓN hasta el momento.",
        ),
      ),
      sub(
        "words",
        L("The words you see", "As palavras que aparecem", "Las palabras que aparecen"),
        { fig: { kind: "words", words: [["PERFECT", "#ffd23f"], ["GOOD", "#5fdc6a"], ["MISS", "#d8443a"], ["✕ WRONG", "#d8443a"], ["HELD", "#5fdc6a"], ["TOO SOON", "#f0784a"], ["REST!", "#f0784a"]] } },
        p(
          "PERFECT and GOOD flash briefly; the words for a slip stay a little longer, so you can read them. A pause resumes with a 3-2-1 count, from exactly where you stopped.",
          "PERFEITO e BOM aparecem rapidamente; as palavras de um deslize ficam um pouco mais, para dar tempo de ler. Uma pausa recomeça com uma contagem 3-2-1, exatamente de onde você parou.",
          "PERFECTO y BIEN aparecen un instante; las palabras de un fallo se quedan un poco más, para que puedas leerlas. Una pausa se reanuda con una cuenta 3-2-1, exactamente desde donde paraste.",
        ),
      ),
    ],
  },
  {
    id: "notes",
    title: L("PLAYING THE NOTES", "TOCANDO AS NOTAS", "TOCAR LAS NOTAS"),
    blocks: [
      sub(
        "tap",
        L("A tap is a note", "Um toque é uma nota", "Un toque es una nota"),
        p(
          "Touch either bar as your note reaches the gold line. Touch higher on the bar when the tune goes up, lower when it goes down. You don't need the exact height, only the right direction. Taking turns, left thumb then right, is the easiest way to keep up.",
          "Toque em qualquer uma das barras quando a sua nota chegar à linha dourada. Toque mais acima na barra quando a melodia sobe, mais abaixo quando desce. Não é preciso acertar a altura exata, só a direção certa. Alternar os polegares, esquerdo e depois direito, é o jeito mais fácil de acompanhar.",
          "Toca cualquiera de las dos barras cuando tu nota llegue a la línea dorada. Toca más arriba en la barra cuando la melodía sube, más abajo cuando baja. No hace falta la altura exacta, solo la dirección correcta. Alternar los pulgares, izquierdo y luego derecho, es la forma más fácil de seguir el ritmo.",
        ),
        clip(
          { piece: "wtc1f02", bars: [1, 2], voices: [1], mine: 1, thumbs: true, speed: 0.75 },
          L("The subject of Fugue 2, played by two thumbs taking turns (a little slower).", "O sujeito da Fuga 2, tocado por dois polegares alternados (um pouco mais devagar).", "El sujeto de la Fuga 2, tocado con los dos pulgares alternados (un poco más despacio)."),
        ),
      ),
      sub(
        "time",
        L("On time", "No tempo", "A tiempo"),
        p(
          "The moment your thumb lands is the note. Right on the line is PERFECT; a little early or late is GOOD. A wrong direction is ✕ WRONG, and a note you let go by is MISS.",
          "O momento em que o polegar toca é a nota. Bem em cima da linha é PERFEITO; um pouco antes ou depois é BOM. Uma direção errada é ✕ ERRADO, e uma nota que passa sem ser tocada é ERROU.",
          "El momento en que el pulgar toca es la nota. Justo en la línea es PERFECTO; un poco antes o después es BIEN. Una dirección equivocada es ✕ MAL, y una nota que dejas pasar es FALLO.",
        ),
      ),
      sub(
        "hold",
        L("Holding, and rests", "Segurar, e as pausas", "Mantener, y los silencios"),
        p(
          "A long note is held: keep the thumb down for its length (HELD). Lifting before half the note shows TOO SOON. Where your voice has a rest, lift; holding through a rest shows REST!.",
          "Uma nota longa é segurada: mantenha o polegar apoiado durante toda a duração dela (SUSTENTOU). Levantar antes da metade da nota mostra CEDO DEMAIS. Onde a sua voz tem uma pausa, levante; segurar durante a pausa mostra PAUSA!.",
          "Una nota larga se mantiene: deja el pulgar apoyado durante toda su duración (SOSTENIDA). Levantarlo antes de la mitad de la nota muestra DEMASIADO PRONTO. Donde tu voz tiene un silencio, levanta el pulgar; mantenerlo durante el silencio muestra ¡SILENCIO!.",
        ),
      ),
    ],
  },
  {
    id: "slides",
    title: L("SLIDES", "DESLIZES", "DESLIZAMIENTOS"),
    blocks: [
      sub(
        "slide",
        L("Sliding to the next note", "Deslizar até a próxima nota", "Deslizar hasta la nota siguiente"),
        p(
          "Instead of lifting and tapping again, you can keep your thumb down and slide it toward the next note, in the direction the tune goes. Once you are at least halfway there, the next note plays. Going past it is fine; going far past shows TOO FAR. Arriving early, it waits for its time.",
          "Em vez de levantar e tocar de novo, você pode manter o polegar apoiado e deslizá-lo em direção à próxima nota, no sentido em que a melodia vai. Quando você chega pelo menos à metade do caminho, a próxima nota soa. Passar um pouco do ponto não tem problema; passar muito mostra LONGE DEMAIS. Se chegar cedo, a nota espera a hora dela.",
          "En lugar de levantar y volver a tocar, puedes dejar el pulgar apoyado y deslizarlo hacia la nota siguiente, en la dirección en que va la melodía. Cuando llegas al menos a la mitad del camino, la nota siguiente suena. Pasarte un poco no importa; pasarte mucho muestra DEMASIADO LEJOS. Si llegas antes, la nota espera su momento.",
        ),
        p(
          "A slide goes one way only, and only to the next note: to turn back, lift and strike again. The box joins a slide's two notes with a ribbon. Each sound colours a slide its own way: a quick shake on the harpsichord, a grace note on the piano, a glide on strings and voices.",
          "Um deslize vai num só sentido, e só até a próxima nota: para voltar, levante e toque de novo. A caixa une as duas notas de um deslize com uma fita. Cada som colore o deslize do seu jeito: um trinado rápido no cravo, uma apojatura no piano, um glissando nas cordas e nas vozes.",
          "Un deslizamiento va en un solo sentido, y solo hasta la nota siguiente: para volver, levanta y toca de nuevo. La caja une las dos notas de un deslizamiento con una cinta. Cada sonido colorea el deslizamiento a su manera: un trino rápido en el clave, una apoyatura en el piano, un glissando en las cuerdas y las voces.",
        ),
        clip(
          { piece: "wtc1f02", bars: [1, 1], voices: [1], mine: 1, thumbs: true, slides: [[1, 2]], speed: 0.6 },
          L("The second and third notes joined by a slide: the thumb stays down and glides.", "A segunda e a terceira notas unidas por um deslize: o polegar continua apoiado e desliza.", "La segunda y la tercera nota unidas por un deslizamiento: el pulgar sigue apoyado y se desliza."),
        ),
        p(
          "When a slide fails, the box says why, in amber, by your thumb: FURTHER, TOO FAR, TOO EARLY, TOO LATE, LIFTED, or LIFT TO TURN.",
          "Quando um deslize falha, a caixa diz por quê, em âmbar, ao lado do polegar: MAIS LONGE, LONGE DEMAIS, CEDO DEMAIS, TARDE DEMAIS, LEVANTOU ou LEVANTE PARA VOLTAR.",
          "Cuando un deslizamiento falla, la caja dice por qué, en ámbar, junto a tu pulgar: MÁS LEJOS, DEMASIADO LEJOS, DEMASIADO PRONTO, DEMASIADO TARDE, LEVANTADO o LEVANTA PARA VOLVER.",
        ),
      ),
      sub(
        "slidein",
        L("Sliding in", "Entrar deslizando", "Entrar deslizando"),
        p(
          "After a rest, or before your first note, you can also slide into a note: up to two beats ahead, put your thumb down above or below the coming note and slide in. The note sounds when you are halfway there and is judged as a tap (PERFECT or GOOD). Putting the thumb down is never counted as a mistake.",
          "Depois de uma pausa, ou antes da sua primeira nota, você também pode entrar numa nota deslizando: até dois tempos antes, apoie o polegar acima ou abaixo da nota que vem e deslize até ela. A nota soa quando você chega à metade do caminho e é avaliada como um toque (PERFEITO ou BOM). Apoiar o polegar nunca conta como erro.",
          "Después de un silencio, o antes de tu primera nota, también puedes entrar en una nota deslizando: hasta dos tiempos antes, apoya el pulgar por encima o por debajo de la nota que viene y deslízate hasta ella. La nota suena cuando llegas a la mitad del camino y se juzga como un toque (PERFECTO o BIEN). Apoyar el pulgar nunca cuenta como error.",
        ),
      ),
    ],
  },
  {
    id: "touch",
    title: L("TOUCH: SOFT, STRONG, AND BUSONI'S SIGNS", "TOQUE: SUAVE, FORTE E OS SINAIS DE BUSONI", "TOQUE: SUAVE, FUERTE Y LOS SIGNOS DE BUSONI"),
    blocks: [
      sub(
        "soft",
        L("Soft and strong, across the bar", "Suave e forte, na largura da barra", "Suave y fuerte, a lo ancho de la barra"),
        { fig: { kind: "bar" } },
        p(
          "Across each bar, the side by the box is STRONG (firmer, brighter) and the outer edge is SOFT (gentler, darker). A held thumb moved sideways shapes the note as it sounds. This is yours to use: it never costs or earns points. On the piano the bar has three zones: soft, normal and strong.",
          "Na largura de cada barra, o lado junto à caixa é FORTE (mais firme, mais brilhante) e a borda de fora é SUAVE (mais delicada, mais escura). Um polegar segurando uma nota e movido para o lado molda a nota enquanto ela soa. Isto é seu para usar: nunca tira nem dá pontos. No piano a barra tem três zonas: suave, normal e forte.",
          "A lo ancho de cada barra, el lado junto a la caja es FUERTE (más firme, más brillante) y el borde exterior es SUAVE (más delicado, más oscuro). Un pulgar que mantiene una nota y se mueve hacia el lado moldea la nota mientras suena. Es tuyo para usarlo: nunca quita ni da puntos. En el piano la barra tiene tres zonas: suave, normal y fuerte.",
        ),
      ),
      sub(
        "busoni",
        L("Busoni's signs", "Os sinais de Busoni", "Los signos de Busoni"),
        p(
          "Every fugue comes with the markings of Ferruccio Busoni's edition, drawn over your notes. They tell you how each note is touched. You can turn them off in SETTINGS (BUSONI'S MARKINGS); then you play with your own articulation.",
          "Cada fuga vem com as marcações da edição de Ferruccio Busoni, desenhadas sobre as suas notas. Elas dizem como cada nota é tocada. Você pode desligá-las em CONFIGURAÇÕES (MARCAÇÕES DE BUSONI); aí você toca com a sua própria articulação.",
          "Cada fuga trae las indicaciones de la edición de Ferruccio Busoni, dibujadas sobre tus notas. Te dicen cómo se toca cada nota. Puedes desactivarlas en AJUSTES (INDICACIONES DE BUSONI); entonces tocas con tu propia articulación.",
        ),
        { fig: { kind: "marks" } },
        p(
          "Accents are a hard tap: strike harder, anywhere on the bar (SETTINGS › TAP STRENGTH teaches the phone your soft and hard taps; without a motion sensor, use the strong side). Ornaments (a trill, a mordent): touch the note, then rock the thumb; they are never scored. Busoni's words (dolce and the like) appear at the side, with their meaning.",
          "Os acentos são um toque forte: bata com mais força, em qualquer ponto da barra (CONFIGURAÇÕES › FORÇA DO TOQUE ensina ao celular os seus toques suaves e fortes; sem sensor de movimento, use o lado forte). Ornamentos (um trinado, um mordente): toque a nota e depois balance o polegar; eles nunca contam pontos. As palavras de Busoni (dolce e outras) aparecem ao lado, com o seu significado.",
          "Los acentos son un toque fuerte: golpea con más fuerza, en cualquier punto de la barra (AJUSTES › FUERZA DEL TOQUE enseña al móvil tus toques suaves y fuertes; sin sensor de movimiento, usa el lado fuerte). Los ornamentos (un trino, un mordente): toca la nota y luego balancea el pulgar; nunca puntúan. Las palabras de Busoni (dolce y otras) aparecen al lado, con su significado.",
        ),
      ),
    ],
  },
  {
    id: "fugue",
    title: L("WHAT IS IN A FUGUE", "O QUE HÁ NUMA FUGA", "QUÉ HAY EN UNA FUGA"),
    blocks: [
      p(
        "The box marks the fugue's events as they come, so you can hear its plan while you play. The examples below are Bach's own bars; tap LISTEN.",
        "A caixa marca os acontecimentos da fuga à medida que chegam, para você ouvir o plano dela enquanto toca. Os exemplos abaixo são compassos do próprio Bach; toque em OUVIR.",
        "La caja marca los acontecimientos de la fuga a medida que llegan, para que oigas su plan mientras tocas. Los ejemplos de abajo son compases del propio Bach; pulsa ESCUCHAR.",
      ),
      sub(
        "subject",
        L("The subject", "O sujeito", "El sujeto"),
        p(
          "The subject is the tune the whole fugue is made from. It is heard first alone, in one voice. Each time a voice states it, a flag saying SUBJECT appears over its first note, in the voice's colour, and stays at the top of the box while the entry lasts. Your own subject notes have a thin gold rim.",
          "O sujeito é a melodia da qual a fuga inteira é feita. Ele é ouvido primeiro sozinho, numa voz. Cada vez que uma voz o apresenta, uma bandeira com a palavra SUJEITO aparece sobre a primeira nota, na cor da voz, e fica no alto da caixa enquanto a entrada dura. As notas do sujeito na sua voz têm um fino contorno dourado.",
          "El sujeto es la melodía de la que está hecha toda la fuga. Se oye primero solo, en una voz. Cada vez que una voz lo presenta, una bandera con la palabra SUJETO aparece sobre su primera nota, en el color de la voz, y se queda arriba de la caja mientras dura la entrada. Las notas del sujeto en tu voz tienen un fino borde dorado.",
        ),
        clip({ piece: "wtc1f02", bars: [1, 2], voices: [1], mine: 1 }, L("Fugue 2: the subject, alone in the alto.", "Fuga 2: o sujeito, sozinho no contralto.", "Fuga 2: el sujeto, solo en el contralto.")),
      ),
      sub(
        "answer",
        L("The answer and the countersubject", "A resposta e o contrassujeito", "La respuesta y el contrasujeto"),
        p(
          "Then a second voice enters with the subject a fifth higher: the answer. The game flags it as a SUBJECT too. Meanwhile the first voice goes on with a counter-melody, the countersubject (not marked in the box). One by one, every voice enters this way: that opening is the exposition.",
          "Depois uma segunda voz entra com o sujeito uma quinta acima: a resposta. O jogo também a marca como SUJEITO. Enquanto isso, a primeira voz continua com uma contramelodia, o contrassujeito (que a caixa não marca). Uma a uma, todas as vozes entram assim: essa abertura é a exposição.",
          "Después una segunda voz entra con el sujeto una quinta más arriba: la respuesta. El juego también la marca como SUJETO. Mientras tanto, la primera voz sigue con una contramelodía, el contrasujeto (que la caja no marca). Una a una, todas las voces entran así: esa apertura es la exposición.",
        ),
        clip({ piece: "wtc1f02", bars: [1, 4], voices: [0, 1], mine: 1 }, L("Fugue 2, bars 1–4: the alto's subject, then the soprano's answer over the alto's countersubject.", "Fuga 2, compassos 1–4: o sujeito no contralto, depois a resposta no soprano sobre o contrassujeito do contralto.", "Fuga 2, compases 1–4: el sujeto en el contralto, luego la respuesta en el soprano sobre el contrasujeto del contralto.")),
      ),
      sub(
        "episode",
        L("Episodes", "Episódios", "Episodios"),
        p(
          "Between entries come episodes: passages built from bits of the subject, often in sequence, that travel to a new key. No flag marks them; you can tell them by the absence of flags. The tutorial's Part F (EPISODES AND STRETTO) plays them for you.",
          "Entre as entradas vêm os episódios: passagens feitas de pedaços do sujeito, muitas vezes em sequência, que levam a uma nova tonalidade. Nenhuma bandeira os marca; você os reconhece pela falta de bandeiras. A Parte F do tutorial (EPISÓDIOS E STRETTO) mostra exemplos.",
          "Entre las entradas vienen los episodios: pasajes hechos con trozos del sujeto, a menudo en secuencia, que llevan a una nueva tonalidad. Ninguna bandera los marca; los reconoces por la ausencia de banderas. La Parte F del tutorial (EPISODIOS Y STRETTO) los muestra.",
        ),
        clip({ piece: "wtc1f02", bars: [5, 6], mine: 1 }, L("Fugue 2, bars 5–6: an episode, all three voices, no entry.", "Fuga 2, compassos 5–6: um episódio, as três vozes, nenhuma entrada.", "Fuga 2, compases 5–6: un episodio, las tres voces, ninguna entrada.")),
      ),
      sub(
        "stretto",
        L("Stretto", "Stretto", "Stretto"),
        p(
          "In a stretto the entries overlap: a voice starts the subject before the last one has finished. The flags stack, a row for each entry, and the fugue's stage reacts.",
          "Num stretto as entradas se sobrepõem: uma voz começa o sujeito antes que a anterior tenha terminado. As bandeiras se empilham, uma fileira para cada entrada, e o cenário da fuga reage.",
          "En un stretto las entradas se superponen: una voz empieza el sujeto antes de que la anterior haya terminado. Las banderas se apilan, una fila por entrada, y el escenario de la fuga reacciona.",
        ),
        clip({ piece: "wtc1f01", bars: [7, 8], mine: 0 }, L("Fugue 1 in C major, bars 7–8: the soprano and the tenor enter together, in stretto.", "Fuga 1 em dó maior, compassos 7–8: o soprano e o tenor entram juntos, em stretto.", "Fuga 1 en do mayor, compases 7–8: el soprano y el tenor entran juntos, en stretto.")),
      ),
      sub(
        "forms",
        L("Inversion, augmentation, diminution", "Inversão, aumentação, diminuição", "Inversión, aumentación, disminución"),
        p(
          "Bach also brings the subject back changed. Inverted: upside down, every step that rose now falls; its flag is turned upside down. Augmented: every note twice as long; its flag is twice as wide. Diminished: every note twice as short; its flag is pressed together.",
          "Bach também traz o sujeito de volta transformado. Invertido: de cabeça para baixo, cada passo que subia agora desce; a bandeira fica de cabeça para baixo. Aumentado: cada nota duas vezes mais longa; a bandeira fica duas vezes mais larga. Diminuído: cada nota duas vezes mais curta; a bandeira fica comprimida.",
          "Bach también trae de vuelta el sujeto transformado. Invertido: al revés, cada paso que subía ahora baja; su bandera aparece al revés. Aumentado: cada nota el doble de larga; su bandera es el doble de ancha. Disminuido: cada nota la mitad de larga; su bandera aparece comprimida.",
        ),
        { fig: { kind: "flags" } },
        clip({ piece: "wtc1f08", bars: [30, 31], voices: [0], mine: 0 }, L("Fugue 8 in D♯ minor, bar 30: the subject inverted, in the soprano.", "Fuga 8 em ré♯ menor, compasso 30: o sujeito invertido, no soprano.", "Fuga 8 en re♯ menor, compás 30: el sujeto invertido, en el soprano.")),
        clip({ piece: "wtc1f08", bars: [62, 64], voices: [2], mine: 2 }, L("Fugue 8, bar 62: the subject augmented, in the bass.", "Fuga 8, compasso 62: o sujeito aumentado, no baixo.", "Fuga 8, compás 62: el sujeto aumentado, en el bajo.")),
        clip({ piece: "wtc2f09", bars: [26, 27], voices: [0], mine: 0 }, L("Book II, Fugue 9 in E major, bar 26: the subject diminished, in the soprano.", "Livro II, Fuga 9 em mi maior, compasso 26: o sujeito diminuído, no soprano.", "Libro II, Fuga 9 en mi mayor, compás 26: el sujeto disminuido, en el soprano.")),
      ),
      sub(
        "subjects",
        L("Fugues with more than one subject", "Fugas com mais de um sujeito", "Fugas con más de un sujeto"),
        p(
          "A few fugues have a second or third subject (Book I: 4; Book II: 4, 14, 18 and 23). There the flags are numbered: SUBJECT 1, SUBJECT 2, SUBJECT 3.",
          "Algumas fugas têm um segundo ou terceiro sujeito (Livro I: 4; Livro II: 4, 14, 18 e 23). Nelas as bandeiras são numeradas: SUJEITO 1, SUJEITO 2, SUJEITO 3.",
          "Algunas fugas tienen un segundo o tercer sujeto (Libro I: 4; Libro II: 4, 14, 18 y 23). En ellas las banderas van numeradas: SUJETO 1, SUJETO 2, SUJETO 3.",
        ),
        clip({ piece: "wtc1f04", bars: [35, 36], voices: [0, 3], mine: 0, flagBars: [35] }, L("Fugue 4 in C♯ minor, bar 35: the second subject in the soprano, the first in the tenor below it.", "Fuga 4 em dó♯ menor, compasso 35: o segundo sujeito no soprano, o primeiro no tenor, abaixo dele.", "Fuga 4 en do♯ menor, compás 35: el segundo sujeto en el soprano, el primero en el tenor, debajo.")),
      ),
      sub(
        "cadence",
        L("Cadences", "Cadências", "Cadencias"),
        p(
          "A cadence is a point of arrival, where the music closes in a key. The box shows each one as a gold tick at its foot, named (for example FULL CADENCE · G MINOR), and it flares as you reach it.",
          "Uma cadência é um ponto de chegada, onde a música fecha numa tonalidade. A caixa mostra cada uma como uma marca dourada no pé dela, com nome (por exemplo CADÊNCIA CONCLUSIVA · SOL MENOR), que brilha quando você chega lá.",
          "Una cadencia es un punto de llegada, donde la música cierra en una tonalidad. La caja muestra cada una como una marca dorada en su parte inferior, con su nombre (por ejemplo CADENCIA CONCLUSIVA · SOL MENOR), que brilla cuando llegas a ella.",
        ),
        p(
          "Where the entries come from: every entry of the 48 is placed as the published analyses give it (Prout, Iliffe, Busoni, Ledbetter), not guessed by the game.",
          "De onde vêm as entradas: cada entrada das 48 é marcada como as análises publicadas a dão (Prout, Iliffe, Busoni, Ledbetter), não adivinhada pelo jogo.",
          "De dónde vienen las entradas: cada entrada de las 48 se marca como la dan los análisis publicados (Prout, Iliffe, Busoni, Ledbetter), no adivinada por el juego.",
        ),
      ),
    ],
  },
  {
    id: "score",
    title: L("SCORE, GRADES AND THE CROWD", "PONTUAÇÃO, NOTAS E A PLATEIA", "PUNTUACIÓN, NOTAS Y EL PÚBLICO"),
    blocks: [
      sub(
        "performance",
        L("Your performance and your grade", "A sua interpretação e a sua nota", "Tu interpretación y tu nota"),
        p(
          "PERFORMANCE, from 0 to 100, says how well you played. It has four parts: the notes right (60), timing (15: PERFECT counts in full, GOOD three quarters), touch (15: holds, rests, joins and Busoni's signs) and the subject's entries (10, each by the share of its notes you got right).",
          "A INTERPRETAÇÃO, de 0 a 100, diz quão bem você tocou. Ela tem quatro partes: as notas certas (60), o tempo (15: PERFEITO vale inteiro, BOM três quartos), o toque (15: notas seguradas, pausas, ligaduras e os sinais de Busoni) e as entradas do sujeito (10, cada uma pela parte das notas que você acertou).",
          "La INTERPRETACIÓN, de 0 a 100, dice lo bien que tocaste. Tiene cuatro partes: las notas acertadas (60), el tiempo (15: PERFECTO cuenta entero, BIEN tres cuartos), el toque (15: notas mantenidas, silencios, ligaduras y los signos de Busoni) y las entradas del sujeto (10, cada una según la parte de sus notas que acertaste).",
        ),
        { fig: { kind: "parts" } },
        p(
          "Your grade comes from the performance alone: S from 95, A from 90, B from 80, C from 70, D below.",
          "A sua nota vem só da interpretação: S a partir de 95, A a partir de 90, B a partir de 80, C a partir de 70, D abaixo disso.",
          "Tu nota sale solo de la interpretación: S desde 95, A desde 90, B desde 80, C desde 70, D por debajo.",
        ),
        { fig: { kind: "grades" } },
      ),
      sub(
        "points",
        L("The score", "A pontuação", "La puntuación"),
        p(
          "The score is for bragging. Each note earns points (PERFECT 2, GOOD 1), and so do held notes, the subject's entries and the cadences. A streak of right notes raises them: +10% for every 16 in a row, up to +50%, and a slip takes one step off. At the end the points are multiplied by your performance. Your best is kept for each fugue and each voice; a run at SLOW tempo is kept apart.",
          "A pontuação é para se gabar. Cada nota vale pontos (PERFEITO 2, BOM 1), e também as notas seguradas, as entradas do sujeito e as cadências. Uma sequência de notas certas aumenta os pontos: +10% a cada 16 seguidas, até +50%, e um deslize tira um degrau. No fim, os pontos são multiplicados pela sua interpretação. O seu recorde fica guardado para cada fuga e cada voz; uma partida em andamento LENTO fica à parte.",
          "La puntuación es para presumir. Cada nota da puntos (PERFECTO 2, BIEN 1), y también las notas mantenidas, las entradas del sujeto y las cadencias. Una racha de notas acertadas los aumenta: +10% por cada 16 seguidas, hasta +50%, y un fallo quita un escalón. Al final, los puntos se multiplican por tu interpretación. Tu récord se guarda para cada fuga y cada voz; una partida en tempo LENTO se guarda aparte.",
        ),
      ),
      sub(
        "crowd",
        L("The crowd", "A plateia", "El público"),
        p(
          "The crowd listens to how you are playing now: roughly your last dozen notes. A wrong note bothers it less than a note let go by. If your playing stays poor for a while, the crowd leaves and the round ends. It never leaves during your first eight notes.",
          "A plateia escuta como você está tocando agora: mais ou menos as suas últimas doze notas. Uma nota errada a incomoda menos que uma nota que passa sem ser tocada. Se você continuar tocando mal por um tempo, a plateia vai embora e a partida acaba. Ela nunca sai durante as suas primeiras oito notas.",
          "El público escucha cómo estás tocando ahora: más o menos tus últimas doce notas. Una nota equivocada le molesta menos que una nota que dejas pasar. Si sigues tocando mal durante un rato, el público se va y la partida termina. Nunca se va durante tus primeras ocho notas.",
        ),
      ),
    ],
  },
  {
    id: "unlocks",
    title: L("WHAT YOU UNLOCK", "O QUE VOCÊ DESBLOQUEIA", "LO QUE DESBLOQUEAS"),
    blocks: [
      p(
        "Every fugue of both books is open from the start. The label on each card (EASY, NORMAL, HARD) is a guide, not a lock.",
        "Todas as fugas dos dois livros estão abertas desde o início. A etiqueta de cada cartão (FÁCIL, NORMAL, DIFÍCIL) é um guia, não uma tranca.",
        "Todas las fugas de los dos libros están abiertas desde el principio. La etiqueta de cada carta (FÁCIL, NORMAL, DIFÍCIL) es una guía, no un candado.",
      ),
      p(
        "Finish a fugue with a B or better and you unlock two things for that fugue: its TEMPO button (SLOW, DEFAULT, FAST) and its SOUND choice.",
        "Termine uma fuga com B ou mais e você desbloqueia duas coisas para essa fuga: o botão ANDAMENTO (LENTO, PADRÃO, RÁPIDO) e a escolha de SOM.",
        "Termina una fuga con B o más y desbloqueas dos cosas para esa fuga: el botón TEMPO (LENTO, NORMAL, RÁPIDO) y la elección de SONIDO.",
      ),
    ],
  },
  {
    id: "extras",
    title: L("TEMPO, SOUND, DRUMS, OBBLIGATO, PISTONS", "ANDAMENTO, SOM, BATERIA, OBBLIGATO, PISTÕES", "TEMPO, SONIDO, BATERÍA, OBBLIGATO, PISTONES"),
    blocks: [
      sub(
        "tempo",
        L("Tempo and sound", "Andamento e som", "Tempo y sonido"),
        p(
          "TEMPO, once unlocked, cycles SLOW (three quarters of the speed), DEFAULT and FAST (about 1.4 times). Each fugue has its own sound; once unlocked, SOUND lets you pick another.",
          "O ANDAMENTO, depois de desbloqueado, alterna entre LENTO (três quartos da velocidade), PADRÃO e RÁPIDO (cerca de 1,4 vez). Cada fuga tem o seu próprio som; depois de desbloqueado, SOM deixa você escolher outro.",
          "El TEMPO, una vez desbloqueado, alterna entre LENTO (tres cuartos de la velocidad), NORMAL y RÁPIDO (alrededor de 1,4 veces). Cada fuga tiene su propio sonido; una vez desbloqueado, SONIDO te deja elegir otro.",
        ),
      ),
      sub(
        "drums",
        L("Drums", "Bateria", "Batería"),
        p(
          "DRUMS, on the right of the selection screen, add a backing beat under the fugue: on or off, and, where the fugue has them, a choice of styles (STYLE). They are sound only, never scored.",
          "BATERIA, à direita da tela de seleção, acrescenta uma batida de acompanhamento sob a fuga: ligada ou desligada e, onde a fuga tiver, uma escolha de estilos (ESTILO). É só som, nunca conta pontos.",
          "BATERÍA, a la derecha de la pantalla de selección, añade un ritmo de acompañamiento bajo la fuga: activada o desactivada y, donde la fuga los tenga, una elección de estilos (ESTILO). Es solo sonido, nunca puntúa.",
        ),
      ),
      sub(
        "obbligato",
        L("Obbligato", "Obbligato", "Obbligato"),
        p(
          "Play the bars before one of your own subject entries cleanly (no miss, no wrong note, mostly PERFECT) and the bars turn sea-green: an OBBLIGATO button appears at their foot. Tap it with a free thumb before the entry begins, and your entry takes the effect the button names: OCTAVE (your notes doubled an octave away), TAPE ECHO or CHORUS (with a gentle vibrato). It changes nothing in the score; if you don't tap it, nothing is lost.",
          "Toque os compassos antes de uma das entradas do sujeito na sua voz sem erros (nenhuma nota perdida ou errada, quase tudo PERFEITO) e as barras ficam verde-mar: um botão OBBLIGATO aparece no pé delas. Toque nele com o polegar livre antes de a entrada começar, e a sua entrada ganha o efeito que o botão diz: OITAVA (suas notas dobradas uma oitava acima ou abaixo), ECO DE FITA ou CHORUS (com um vibrato suave). Isso não muda nada na pontuação; se você não tocar, nada se perde.",
          "Toca sin errores los compases anteriores a una de las entradas del sujeto en tu voz (ninguna nota fallada ni equivocada, casi todo PERFECTO) y las barras se vuelven verde mar: aparece un botón OBBLIGATO al pie de ellas. Púlsalo con el pulgar libre antes de que empiece la entrada, y tu entrada toma el efecto que nombra el botón: OCTAVA (tus notas dobladas una octava arriba o abajo), ECO DE CINTA o CHORUS (con un vibrato suave). No cambia nada en la puntuación; si no lo pulsas, no pierdes nada.",
        ),
      ),
      sub(
        "pistons",
        L("Pistons (organ and harpsichord)", "Pistões (órgão e cravo)", "Pistones (órgano y clave)"),
        p(
          "On the organ and the harpsichord, three pistons stand on the inner edges of the box: each draws a set of stops at one touch, even while your other thumb holds a note. What each piston holds is set in SETTINGS › PISTONS for the chosen fugue.",
          "No órgão e no cravo, três pistões ficam nas bordas internas da caixa: cada um aciona um conjunto de registros com um toque, mesmo enquanto o outro polegar segura uma nota. O que cada pistão aciona se escolhe em CONFIGURAÇÕES › PISTÕES, para a fuga escolhida.",
          "En el órgano y el clave, tres pistones están en los bordes interiores de la caja: cada uno activa un conjunto de registros con un toque, incluso mientras el otro pulgar mantiene una nota. Lo que activa cada pistón se elige en AJUSTES › PISTONES, para la fuga elegida.",
        ),
      ),
    ],
  },
  {
    id: "selection",
    title: L("THE SELECTION SCREEN", "A TELA DE SELEÇÃO", "LA PANTALLA DE SELECCIÓN"),
    blocks: [
      p(
        "Each card shows the fugue's picture, its number and key, its name, its level and your best grade; NEXT marks a good one to play next. Tap a card to choose it; the right column shows it, with YOUR VOICE, TEMPO, SOUND and DRUMS.",
        "Cada cartão mostra a imagem da fuga, o número e a tonalidade, o nome, o nível e a sua melhor nota; PRÓXIMA marca uma boa para tocar em seguida. Toque num cartão para escolhê-lo; a coluna da direita mostra a fuga, com SUA VOZ, ANDAMENTO, SOM e BATERIA.",
        "Cada carta muestra la imagen de la fuga, su número y tonalidad, su nombre, su nivel y tu mejor nota; SIGUIENTE marca una buena para tocar después. Toca una carta para elegirla; la columna de la derecha la muestra, con TU VOZ, TEMPO, SONIDO y BATERÍA.",
      ),
      p(
        "Tap the glowing picture on the right to open the fugue's box: HEAR THE SUBJECT (press ▶ to hear it and watch it drawn), how many entries, strettos and cadences it has, a note on the piece, and Busoni's own words about it.",
        "Toque na imagem que brilha, à direita, para abrir a caixa da fuga: OUÇA O SUJEITO (toque em ▶ para ouvi-lo e vê-lo desenhado), quantas entradas, strettos e cadências ela tem, uma nota sobre a peça e as palavras do próprio Busoni sobre ela.",
        "Toca la imagen que brilla, a la derecha, para abrir la caja de la fuga: ESCUCHA EL SUJETO (pulsa ▶ para oírlo y verlo dibujado), cuántas entradas, strettos y cadencias tiene, una nota sobre la pieza y las palabras del propio Busoni sobre ella.",
      ),
    ],
  },
  {
    id: "settings",
    title: L("SETTINGS", "CONFIGURAÇÕES", "AJUSTES"),
    blocks: [
      { list: [
        L("LANGUAGE and VOLUME.", "IDIOMA e VOLUME.", "IDIOMA y VOLUMEN."),
        L("BUSONI'S MARKINGS: on (the default) or off.", "MARCAÇÕES DE BUSONI: ligadas (o padrão) ou desligadas.", "INDICACIONES DE BUSONI: activadas (por defecto) o desactivadas."),
        L("STAGE: each fugue's world behind the box: FULL, QUIET or OFF.", "CENÁRIO: o mundo de cada fuga atrás da caixa: CHEIO, DISCRETO ou DESLIGADO.", "ESCENARIO: el mundo de cada fuga detrás de la caja: COMPLETO, DISCRETO o APAGADO."),
        L("PISTONS: for the chosen fugue, when its sound is the organ or the harpsichord.", "PISTÕES: para a fuga escolhida, quando o som dela é o órgão ou o cravo.", "PISTONES: para la fuga elegida, cuando su sonido es el órgano o el clave."),
        L("SOUND DELAY: wired headphones and the phone's speaker need nothing (0 ms, the default). Bluetooth sound arrives late, so the game warns you when you press PLAY: for the real experience turn Bluetooth off; otherwise calibrate here, tapping along to the clicks.", "ATRASO DO SOM: fones com fio e o alto-falante do celular não precisam de nada (0 ms, o padrão). O som por Bluetooth chega atrasado, por isso o jogo avisa quando você toca em TOCAR: para a experiência de verdade, desligue o Bluetooth; senão, calibre aqui, tocando junto com os cliques.", "RETARDO DEL SONIDO: los auriculares con cable y el altavoz del móvil no necesitan nada (0 ms, por defecto). El sonido por Bluetooth llega tarde, así que el juego te avisa al pulsar TOCAR: para la experiencia de verdad, desactiva el Bluetooth; si no, calibra aquí, tocando al ritmo de los clics."),
        L("TAP STRENGTH: six soft taps, then six hard, so the phone knows your accents.", "FORÇA DO TOQUE: seis toques suaves e depois seis fortes, para o celular reconhecer os seus acentos.", "FUERZA DEL TOQUE: seis toques suaves y luego seis fuertes, para que el móvil reconozca tus acentos."),
      ] },
    ],
  },
  {
    id: "tutorial",
    title: L("THE TUTORIAL", "O TUTORIAL", "EL TUTORIAL"),
    blocks: [
      p(
        "Everything here, done with your own thumbs, step by step: the TUTORIAL on the left of the selection screen.",
        "Tudo o que está aqui, feito com os seus próprios polegares, passo a passo: o TUTORIAL, à esquerda da tela de seleção.",
        "Todo lo que está aquí, hecho con tus propios pulgares, paso a paso: el TUTORIAL, a la izquierda de la pantalla de selección.",
      ),
      { list: [
        L("Part 1 · First notes: the screen, each thumb alone, taking turns, playing with Bach.", "Parte 1 · Primeiras notas: a tela, cada polegar sozinho, alternando, tocando com Bach.", "Parte 1 · Primeras notas: la pantalla, cada pulgar solo, alternando, tocando con Bach."),
        L("Part 2 · High and low: steps and leaps, the same note again, quick runs.", "Parte 2 · Agudo e grave: graus e saltos, a mesma nota de novo, escalas rápidas.", "Parte 2 · Agudo y grave: grados y saltos, la misma nota otra vez, escalas rápidas."),
        L("Part 3 · How long: held, short, detached and legato, accents.", "Parte 3 · Quanto dura: segurada, curta, destacada e ligada, acentos.", "Parte 3 · Cuánto dura: mantenida, corta, picada y ligada, acentos."),
        L("Part 4 · Playing with Bach: the tune that comes back, leading, answering, three voices.", "Parte 4 · Tocando com Bach: a melodia que volta, conduzir, responder, três vozes.", "Parte 4 · Tocando con Bach: la melodía que vuelve, conducir, responder, tres voces."),
        L("Part 5 · Time and breath: breathing at a phrase's end, letting the end come, lingering.", "Parte 5 · Tempo e respiração: respirar no fim da frase, deixar o fim chegar, demorar-se.", "Parte 5 · Tiempo y respiración: respirar al final de la frase, dejar llegar el final, detenerse."),
        L("Part 6 · Shakes, sighs and slurs: trills, sighs, colour, sliding into a slur.", "Parte 6 · Trinados, suspiros e ligaduras: trinados, suspiros, cor, deslizar para uma ligadura.", "Parte 6 · Trinos, suspiros y ligaduras: trinos, suspiros, color, deslizar hacia una ligadura."),
        L("Part F · So you want to play a fugue?: who was Bach, his keyboards, why well-tempered, what a fugue is, episodes and stretto, how to listen.", "Parte F · Então você quer tocar uma fuga?: quem foi Bach, os teclados dele, por que bem temperado, o que é uma fuga, episódios e stretto, como ouvir.", "Parte F · ¿Así que quieres tocar una fuga?: quién fue Bach, sus teclados, por qué bien temperado, qué es una fuga, episodios y stretto, cómo escuchar."),
      ] },
    ],
  },
];
