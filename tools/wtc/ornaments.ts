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
 * D206: ornaments the Bach-Gesellschaft edition (vol. 14) prints and the edition read leaves out: [bar,
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
  // D366: signs the Bach-Gesellschaft prints (the D206 audit; the Humdrum check has them) that Rother's
  // edition leaves out, where a free edition writes them too (OpenWTC; Mutopia for I/1): I/1's short
  // wavy line in bar 13, I/6's trill in bar 20, I/8's in bar 11, I/11's in bar 71, I/13's subject's
  // first short wavy line (bar 1, BGA p. 48).
  wtc1f01: [
    [13, "B4", "W", 3],
    [23, "B4", "t", 0],
  ],
  wtc1f06: [[20, "B3", "T", 1]],
  wtc1f08: [[11, "G#4", "T", 3]],
  wtc1f11: [[71, "G4", "W", 0.5]],
  wtc1f13: [[1, "C#5", "W", 3]],
  // D366: the BGA's signs D206 read by eye that the edition leaves out: II/14's four trills (D206: "the
  // other editions omit an encoded sign … II/14", the BGA has them) and I/1's in bar 23 (the encoder's
  // reading of the BGA's sign kept, D206).
  wtc2f14: [
    [3, "G#3", "T", 2],
    [6, "D#4", "T", 2],
    [11, "G#2", "T", 0],
    [16, "G#3", "T", 1],
  ],
};

/**
 * D366: the edition's sign put back to the Bach-Gesellschaft's where D206 read the BGA by eye: a sign
 * replaced ([bar, pitch, sign, beat]) or, with "", one the BGA does not print removed (the note's grace
 * notes kept). Replaced (D206: "the other editions differ only in the sign", the BGA's as encoded):
 * I/3 bar 38, I/6 bars 21 and 29, I/8 bar 74, II/6 bar 16, II/20 bar 28. Removed (D206: "not in the
 * BGA" or editorial there): I/6's turns in bars 9-11 (not in the BGA), I/13 bars 15, 20, 28
 * (parenthesised), I/20 bars 52 and 56 ("(tr)").
 */
export const BGA_SIGNS: Record<string, [number, string, string, number][]> = {
  wtc1f03: [[38, "G#5", "T", 2]],
  wtc1f06: [
    [9, "C#5", "", 2],
    [10, "B4", "", 2],
    [11, "A4", "", 2],
    [21, "A4", "O", 0],
    [29, "G4", "T", 2],
  ],
  wtc1f08: [[74, "B#3", "T", 0.5]],
  wtc1f13: [
    [15, "G#4", "", 3],
    [20, "A#2", "", 3],
    [28, "F#4", "", 3],
  ],
  wtc1f20: [
    [52, "B3", "", 1],
    [56, "E5", "", 3],
  ],
  wtc2f06: [[16, "F4", "T", 3.5]],
  wtc2f20: [[28, "E2", "T", 1]],
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
