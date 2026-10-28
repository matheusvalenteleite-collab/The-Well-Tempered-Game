// P8: the ornaments of the WTC and of the Inventions and Sinfonias, as the editions write them: for
// each piece, [voice, onset (ticks), pitch, signs, grace notes?] per ornamented note, voices and onsets
// as in data/wtc/{fugues,preludes,inventions}.json. D366: data/wtc/ornaments.json is written by
// tools/wtc/import.ts from the licence-clean editions' signs (tools/wtc/sources.ts: LilyPond's \\trill,
// \\prall, \\mordent, \\turn…, MusicXML's <ornaments>, the grace notes) with the tables below; the
// Humdrum encodings (the kern letters these signs keep) are no longer read.

/**
 * P23: appoggiaturas the WTC encodings leave in local comments (e.g. wtc2p23.krn: "! (16eeP/" before
 * "8dd#p\"; kern P marks an appoggiatura, p its main note): each read as a long grace (Q) on the next
 * note of its spine, so that it is heard (half the main note, two thirds of a dotted one).
 */
export function appoggiaturas(text: string): string {
  return text
    .split("\n")
    .map((l) => {
      if (!/^![^!]/.test(l) || !/\d[a-gA-G]+[#n-]*P/.test(l)) return l;
      return l
        .split("\t")
        .map((f) => {
          const m = /^!\s*\(?(\d+\.?)([a-gA-G]+[#n-]*)P/.exec(f);
          return m ? `${m[1]}${m[2]}Q` : ".";
        })
        .join("\t");
    })
    .join("\n");
}

/**
 * D206: in the fugues, the encoding's M stands for the Bach-Gesellschaft's plain short wavy line (no
 * stroke), Bach's Trillo / Pralltriller, not the Mordant: the BGA prints that sign at every one of
 * them looked at (I/11, I/13, II/13), and the Mutopia and ASAP editions write it there as \prall /
 * inverted-mordent at all 22 they share. Read as W, so it is not played as a lower mordent.
 */
export function fugueSign(id: string, signs: string): string {
  return /^wtc[12]f\d\d$/.test(id) ? signs.replace(/M/g, "W").replace(/m/g, "w") : signs;
}

/**
 * D206: ornaments the Bach-Gesellschaft edition (vol. 14) prints and the encoding leaves out: [bar,
 * pitch, signs, beat (quarters into the bar, where the pitch comes twice)]. II/1: the mordents (with their stroke) on the subject's second note, bars 2, 6 and
 * 10 (BGA p. 94), and the alto's trill in bar 28 (p. 94; Mutopia and ASAP have all four).
 */
export const ADDED: Record<string, [number, string, string, number?][]> = {
  wtc2f01: [
    [2, "A4", "M"],
    [6, "E5", "M"],
    [10, "A3", "M"],
    [28, "G#4", "T", 1],
  ],
};

/**
 * D206: Contrapunctus XIV (not in kern; the game's notes are from the Mutopia MIDI, D169): the two
 * signs of the Mutopia LilyPond source (from the Breitkopf & Härtel edition, BGA vol. 25), a \prall
 * on the tenor's C#4 in bar 196 and a \turn on the soprano's D#5 in bar 220, at the game's voices
 * (highest first) and ticks.
 */
export const CONTRAPUNCTUS: [number, number, string, string][] = [
  [2, 1501440, "C#4", "W"],
  [0, 1687680, "D#5", "S"],
];
