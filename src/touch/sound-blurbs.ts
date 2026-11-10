/**
 * D630: a sound's line in a few plain words, for the sound list: what to expect (the instruments on the voices, and the
 * groove or the room where they are the sound's own), read from each preset's line-up in sound.ts (PRESETS: its slots and
 * its `by` layouts), its drums (drum-library.ts: a band's own drummer, a sound's HOME) and the colour plans' soundWhy
 * notes. One line, at most 60 characters, in English, Brazilian Portuguese and Spanish. And each sound's audition clip:
 * one fixed phrase, the same on every sound (public/audition/, tools/touch/audition/), fetched only when tapped.
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
    en: "Violins, violas and cello one to a part, in a music room",
    pt: "Violinos, violas e violoncelo, um por voz, numa sala",
    es: "Violines, violas y violonchelo, uno por voz, en una sala",
  },
  baroqueBand: {
    en: "Violins, oboe, viola, cello, harpsichord continuo; a hall",
    pt: "Violinos, oboé, viola, violoncelo e cravo; num salão",
    es: "Violines, oboe, viola, violonchelo y clave; en una sala",
  },
  oboeTrio: {
    en: "Two oboes, bassoon, cello and harpsichord, in a small room",
    pt: "Dois oboés, fagote, violoncelo e cravo, numa sala pequena",
    es: "Dos oboes, fagot, violonchelo y clave, en una sala pequeña",
  },
  bachBrass: {
    en: "Brass choir: trumpets, horn, trombones, in a church",
    pt: "Metais: trompetes, trompa e trombones, numa igreja",
    es: "Metales: trompetas, trompa y trombones, en una iglesia",
  },
  jazzQuartet: {
    en: "Vibraphone, piano, double bass; brushes swing the beat",
    pt: "Vibrafone, piano, contrabaixo; vassourinhas no swing",
    es: "Vibráfono, piano, contrabajo; swing con escobillas",
  },
  salsa: {
    en: "Salsa: trumpet, trombones, tres, bass, clave and timbales",
    pt: "Salsa: trompete, trombones, tres, baixo, clave e timbales",
    es: "Salsa: trompeta, trombones, tres, bajo, clave y timbales",
  },
  chorinho: {
    en: "Choro: flute, bandolim, cavaquinho, 7-string, pandeiro",
    pt: "Choro: flauta, bandolim, cavaco, sete cordas e pandeiro",
    es: "Choro: flauta, bandolim, cavaquinho, 7 cuerdas, pandeiro",
  },
  abbeyRoad: {
    en: "Moog, Leslie guitar, Hammond, trumpet, bass, rock drums",
    pt: "Moog, guitarra no Leslie, Hammond, trompete, baixo, rock",
    es: "Moog, guitarra con Leslie, Hammond, trompeta, bajo, rock",
  },
  krautrock: {
    en: "Krautrock: Mellotron, synth, guitars, Moog bass, motorik",
    pt: "Krautrock: Mellotron, synth, guitarras, baixo Moog, motorik",
    es: "Krautrock: Mellotron, sinte, guitarras, bajo Moog, motorik",
  },
  bossaNova: {
    en: "Bossa nova: alto flute, Rhodes, sax, nylon guitar, bass",
    pt: "Bossa nova: flauta, Rhodes, sax, violão e baixo",
    es: "Bossa nova: flauta, Rhodes, saxo, guitarra y bajo",
  },
  petSounds: {
    en: "Tack piano, 12-string, accordion, horn, bass, soft backbeat",
    pt: "Piano de tachinhas, 12 cordas, acordeom, trompa, baixo",
    es: "Piano de chinchetas, 12 cuerdas, acordeón, trompa, bajo",
  },
  vaudeville: {
    en: "Pit band: xylophone, clarinet, bassoon, bass trombone",
    pt: "Banda de teatro: xilofone, clarinete, fagote, trombone",
    es: "Banda de foso: xilófono, clarinete, fagot, trombón bajo",
  },
  fluteHarp: {
    en: "Alto flute, harp, viola and cello, in a hall",
    pt: "Flauta contralto, harpa, viola e violoncelo, num salão",
    es: "Flauta contralto, arpa, viola y violonchelo, en una sala",
  },
  orchestraOrgan: {
    en: "String quartet, then winds, horn and organ, in a church",
    pt: "Quarteto de cordas, depois sopros, trompa e órgão; igreja",
    es: "Cuarteto de cuerdas, luego vientos, trompa y órgano; iglesia",
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
    en: "16-bit console: violin, flute, harpsichord, strings; echo",
    pt: "Console 16 bits: violino, flauta, cravo, cordas; eco",
    es: "Consola de 16 bits: violín, flauta, clave, cuerdas; eco",
  },
  megaFm: {
    en: "FM synth: lead, brass, e-piano, clav, slap bass; echo",
    pt: "FM: solo, metais, piano elétrico, clavinete, baixo; eco",
    es: "FM: solista, metales, piano eléctrico, clavinet, bajo; eco",
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
    en: "Synth lead, sequencer, string machine, bass; tape echo",
    pt: "Synth solo, sequenciador, string machine, baixo; eco",
    es: "Sinte solista, secuenciador, string machine, bajo; eco",
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

/**
 * The sounds with an audition clip (public/audition/<id>.mp3, made by tools/touch/audition/: I/2 from bar 7, 3.5 s, the
 * phone mix with the sound's own drums, matched to -23 LUFS on the phone model; public/audition/clips.json the measurements).
 */
export const AUDITION_SOUNDS: readonly string[] = [
  "harpsichordSampled", "pianoSampled", "chamberOrgan",
  "stringConsort", "baroqueBand", "oboeTrio", "bachBrass", "jazzQuartet", "salsa", "chorinho", "abbeyRoad", "krautrock", "bossaNova", "petSounds", "vaudeville", "fluteHarp", "orchestraOrgan",
  "chip", "gameboy", "super16", "megaFm", "sid64", "tracker",
  "analog", "berlinSchool", "tomita",
  "vocalSynth", "soloVoices",
];

/** A sound's audition clip, relative to the page (fetched only when the player taps it: never preloaded, never in sample memory); null for a sound without one. */
export function auditionUrl(soundId: string): string | null {
  return AUDITION_SOUNDS.includes(soundId) ? `audition/${soundId}.mp3` : null;
}
