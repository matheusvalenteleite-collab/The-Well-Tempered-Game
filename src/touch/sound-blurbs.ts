/**
 * D630: a sound's line in a few plain words, for the sound list: what you hear (the instruments on the voices, and the
 * drums or the room where they are the sound's own), read from each preset's line-up in sound.ts (PRESETS: its slots and
 * its `by` layouts) and the colour plans' soundWhy notes. One line, at most 60 characters, in English, Brazilian
 * Portuguese and Spanish.
 */

export type BlurbLang = "en" | "pt" | "es";

const BLURBS: Readonly<Record<string, Readonly<Record<BlurbLang, string>>>> = {
  // INSTRUMENTS
  harpsichordSampled: {
    en: "Recorded harpsichord on every voice, in a music room",
    pt: "Cravo gravado em todas as vozes, numa sala de música",
    es: "Clave grabado en todas las voces, en una sala de música",
  },
  pianoSampled: {
    en: "Recorded grand piano on every voice, in a music room",
    pt: "Piano de cauda gravado em todas as vozes, numa sala",
    es: "Piano de cola grabado en todas las voces, en una sala",
  },
  chamberOrgan: {
    en: "Pipe organ: principal stops, pedal bass, large church",
    pt: "Órgão de tubos: principais, pedaleira, igreja grande",
    es: "Órgano de tubos: principales, pedal, iglesia grande",
  },
  // ENSEMBLES
  stringConsort: {
    en: "Strings one to a part: violins, violas, cello",
    pt: "Cordas, uma por voz: violinos, violas, violoncelo",
    es: "Cuerdas, una por voz: violines, violas, violonchelo",
  },
  baroqueBand: {
    en: "Violins, oboe, viola, cello and continuo harpsichord",
    pt: "Violinos, oboé, viola, violoncelo e cravo no contínuo",
    es: "Violines, oboe, viola, violonchelo y clave de continuo",
  },
  oboeTrio: {
    en: "Two oboes, bassoon, cello and continuo harpsichord",
    pt: "Dois oboés, fagote, violoncelo e cravo no contínuo",
    es: "Dos oboes, fagot, violonchelo y clave de continuo",
  },
  bachBrass: {
    en: "Brass choir: trumpets, horn, tenor and bass trombones",
    pt: "Metais: trompetes, trompa, trombone tenor e baixo",
    es: "Metales: trompetas, trompa, trombón tenor y bajo",
  },
  jazzQuartet: {
    en: "Vibraphone, piano, plucked double bass, brushed drums",
    pt: "Vibrafone, piano, contrabaixo e bateria de vassourinha",
    es: "Vibráfono, piano, contrabajo y batería con escobillas",
  },
  salsa: {
    en: "Trumpet, trombones, tres, baby bass, Latin percussion",
    pt: "Trompete, trombones, tres, baby bass e percussão latina",
    es: "Trompeta, trombones, tres, baby bass y percusión latina",
  },
  chorinho: {
    en: "Flute, clarinet, bandolim, cavaquinho, 7-string, pandeiro",
    pt: "Flauta, clarinete, bandolim, cavaco, 7 cordas, pandeiro",
    es: "Flauta, clarinete, bandolim, cavaquinho, 7 cuerdas, pandeiro",
  },
  abbeyRoad: {
    en: "Moog, Leslie guitar, trumpet, Hammond, bass and drums",
    pt: "Moog, guitarra no Leslie, trompete, Hammond, baixo, bateria",
    es: "Moog, guitarra con Leslie, trompeta, Hammond, bajo, batería",
  },
  krautrock: {
    en: "Mellotron flute, synth, guitars, Moog bass, motorik drums",
    pt: "Flauta de Mellotron, synth, guitarras, baixo Moog, motorik",
    es: "Flauta de Mellotron, sinte, guitarras, bajo Moog, motorik",
  },
  bossaNova: {
    en: "Alto flute, Rhodes, tenor sax, nylon guitar, bass, drums",
    pt: "Flauta contralto, Rhodes, sax tenor, violão, baixo, bateria",
    es: "Flauta alto, Rhodes, saxo tenor, guitarra, bajo, batería",
  },
  petSounds: {
    en: "Tack piano, 12-string, accordion, horn, bass and drums",
    pt: "Piano de tachinhas, 12 cordas, acordeom, trompa, baixo",
    es: "Piano de chinchetas, guitarra de 12, acordeón, trompa, bajo",
  },
  vaudeville: {
    en: "Xylophone, clarinets, bassoon and bass trombone",
    pt: "Xilofone, clarinetes, fagote e trombone baixo",
    es: "Xilófono, clarinetes, fagot y trombón bajo",
  },
  fluteHarp: {
    en: "Alto flute, harp, viola and cello, in a hall",
    pt: "Flauta contralto, harpa, viola e violoncelo, num salão",
    es: "Flauta contralto, arpa, viola y violonchelo, en una sala",
  },
  orchestraOrgan: {
    en: "String quartet joined by oboes, bassoon, horn and organ",
    pt: "Quarteto de cordas, depois oboés, fagote, trompa e órgão",
    es: "Cuarteto de cuerdas, luego oboes, fagot, trompa y órgano",
  },
  // GAME CONSOLES
  chip: {
    en: "Console pulse waves over a triangle bass",
    pt: "Ondas de pulso de videogame sobre um baixo triangular",
    es: "Ondas de pulso de consola sobre un bajo triangular",
  },
  gameboy: {
    en: "Handheld console: two pulse channels and a wave channel",
    pt: "Portátil: dois canais de pulso e um canal de onda",
    es: "Consola portátil: dos canales de pulso y uno de onda",
  },
  super16: {
    en: "16-bit console: violin, flute, harpsichord, strings, bassoon",
    pt: "Console 16 bits: violino, flauta, cravo, cordas, fagote",
    es: "Consola de 16 bits: violín, flauta, clave, cuerdas, fagot",
  },
  megaFm: {
    en: "FM synth: lead, brass, e-piano, clav, slap bass",
    pt: "FM: solo, metais, piano elétrico, clavinete, baixo slap",
    es: "FM: solista, metales, piano eléctrico, clavinet, bajo slap",
  },
  sid64: {
    en: "Home computer chip: pulse lead, saw, triangle, pulse bass",
    pt: "Chip de computador: pulso, dente de serra, triângulo, baixo",
    es: "Chip de ordenador: pulso, diente de sierra, triángulo, bajo",
  },
  tracker: {
    en: "Tracker: violin, flute, harpsichord, 8-bit choir, slap bass",
    pt: "Tracker: violino, flauta, cravo, coro 8 bits, baixo slap",
    es: "Tracker: violín, flauta, clave, coro de 8 bits, bajo slap",
  },
  // SYNTHESIZERS
  analog: {
    en: "Moog-style synth lines over a snapping synth bass, dry",
    pt: "Linhas de Moog sobre um baixo de sintetizador, som seco",
    es: "Líneas de Moog sobre un bajo de sintetizador, en seco",
  },
  berlinSchool: {
    en: "Synth lead, sequencer pluck, string machine, bass, echo",
    pt: "Solo de synth, sequenciador, string machine, baixo, eco",
    es: "Solista de sinte, secuenciador, string machine, bajo, eco",
  },
  tomita: {
    en: "Synth whistle, strings, flute, choir and bass, space echo",
    pt: "Synth: assobio, cordas, flauta, coro e baixo, com eco",
    es: "Sinte: silbido, cuerdas, flauta, coro y bajo, con eco",
  },
  // VOICES
  vocalSynth: {
    en: "Synthesized singers on every voice, bright plate reverb",
    pt: "Cantores sintetizados em todas as vozes, reverb brilhante",
    es: "Cantantes sintetizados en todas las voces, reverb brillante",
  },
  soloVoices: {
    en: "Recorded singers, soprano to bass, one to a part",
    pt: "Cantores gravados, do soprano ao baixo, um por voz",
    es: "Cantantes grabados, de soprano a bajo, uno por voz",
  },
};

/** A sound's one-line description (at most 60 characters), or "" for an id with none. */
export function soundBlurb(soundId: string, lang: BlurbLang = "en"): string {
  return Object.hasOwn(BLURBS, soundId) ? BLURBS[soundId][lang] : "";
}

/** A short clip of the piece on the sound, to audition it before choosing. */
export function auditionUrl(pieceId: string, soundId: string): string | null {
  // Pre-rendered audition clips will fill this in later (a clip per piece and sound); until then there are none.
  void pieceId;
  void soundId;
  return null;
}
