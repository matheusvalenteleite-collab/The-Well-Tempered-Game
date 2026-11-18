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
  // The non-WTC ornament audit (docs/audits/ORNAMENTS-NON-WTC.md): signs the Bach-Gesellschaft prints
  // (vol. 3, 1853, read on the scan) that the Mutopia editions leave out, each also in the Humdrum
  // encodings (study only): Invention 7's mordent on the soprano's C5 at the start of bar 10 (BGA p. 9);
  // Sinfonia 1's short wavy line on the soprano's E5 in bar 14 (p. 19; the motif of bar 5, where the
  // edition puts it and the BGA has none).
  inven07: [[10, "C5", "M", 0]],
  // D877: Invention 9's mordent on the C5 of bar 33 (BG p. 11), D878: and the turn after it.
  inven09: [[33, "C5", "MJ", 0]],
  sinfo01: [[14, "E5", "W", 2.5]],
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
  // The non-WTC ornament audit (docs/audits/ORNAMENTS-NON-WTC.md): signs the Mutopia sinfonias
  // (Vermersch, source not stated) add where the Bach-Gesellschaft (vol. 3, read on the scan) prints none,
  // nor does the Humdrum encoding of the BGA: Sinfonia 1 bar 5 (p. 19), Sinfonia 13 bars 3 and 7 (p. 38).
  // D874: and Sinfonia 7's trill in bar 43 (not the BGA's nor in the encoding; THE TUTORIAL's lesson 6.2 moved to
  // Sinfonia 2's printed long trill).
  // D877: the hooked signs, read on the scan (BG vol. 3) after the Explication: the Doppelt-Cadence from below (D) or
  // from above (U), with a stroke "und Mordant" (R); Invention 9's longer wavy line with a stroke, Trillo und Mordant.
  inven02: [2, 4, 12, 14, 24].map((bar, i) => [bar, ["D5", "D4", "A3", "A4", "D5"][i], "D", 3] as [number, string, string, number]),
  inven03: [
    [3, "C#5", "UR", 1],
    [45, "C#5", "UR", 1],
  ],
  inven05: [[32, "F5", "DR", 1]],
  inven09: [
    [15, "B4", "D", 0],
    [15, "C5", "TRJ", 2],
    [16, "D5", "U", 1],
    [33, "G4", "D", 1],
  ],
  inven11: [
    [10, "D5", "MJ", 2],
    [10, "E5", "UR", 3],
  ],
  inven12: [1, 3, 9, 18, 20].map((bar, i) => [bar, ["B4", "F#3", "G#4", "B2", "D3"][i], "UR", 3] as [number, string, string, number]),
  sinfo01: [[5, "B4", "", 2.5]],
  sinfo07: [[43, "D#5", "", 2]],
  sinfo13: [
    [3, "B4", "", 0.5],
    [7, "F#4", "", 0.5],
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

/**
 * D875: SINFONIA 5's ornaments as the Bach-Gesellschaft prints them (vol. 3, pp. 24-25, read on the scan: the
 * ornamented text, with its small notes), in place of the edition's one sign: [voice, bar, beat, pitch, signs,
 * graces?]. The small notes are quavers slurred to their notes (the Explication's Accent), played as long
 * appoggiaturas (Q); the two runs of small demisemiquavers (bars 12, 16) as short graces (q) before the sign.
 * The turn printed after a mordant, over the dot (bars 1, 2, 8, 13, 14, 29, 30, 37), played after it (J, D878).
 * Not played: the arpeggio of bar 21.
 */
export const SINFONIA5: [number, number, number, string, string, string[]?][] = [
  [0, 1, 2, "Eb5", "MJ"],
  [0, 2, 0, "D5", "", ["QEb5"]],
  [1, 2, 2, "Bb4", "MJ"],
  [0, 3, 0, "C5", "", ["QDb5"]],
  [1, 3, 0, "Ab4", "", ["QBb4"]],
  [0, 3, 2, "F5", "", ["QC5"]],
  [1, 3, 2, "Ab4", "", ["QG4"]],
  [0, 4, 0, "Eb5", "", ["QF5"]],
  [1, 4, 0, "G4", "", ["QAb4"]],
  [0, 4, 2, "Eb5", "", ["QD5"]],
  [0, 5, 0, "D5", "", ["QEb5"]],
  [1, 5, 0, "Bb4", "", ["QC5"]],
  [0, 5, 2, "G5", "", ["QD5"]],
  [0, 6, 0, "C5", "", ["QG5"]],
  [1, 6, 1, "Ab4", "S"],
  [0, 6, 2, "F5", "", ["QC5"]],
  [0, 7, 0, "Bb4", "", ["QF5"]],
  [0, 7, 1, "Eb5", "M"],
  [1, 7, 2, "C5", "", ["QG4"]],
  [1, 8, 0, "F4", "", ["QC5"]],
  [1, 8, 2, "Bb4", "MJ"],
  [0, 9, 0, "Eb5", "", ["QD5"]],
  [1, 9, 0, "G4", "", ["QAb4"]],
  [1, 9, 2, "C5", "M"],
  [1, 10, 0, "C5", "S"],
  [0, 10, 2, "D5", "M"],
  [0, 11, 0, "D5", "S"],
  [1, 11, 1, "B4", "", ["QC5"]],
  [0, 11, 2, "F5", "", ["QEb5"]],
  [1, 11, 2, "D5", "", ["QC5"]],
  [0, 12, 2, "D5", "D", ["qF5", "qEb5", "qD5", "qC5", "qD5"]],
  [0, 13, 0, "C5", "M"],
  [1, 13, 0, "C5", "M"],
  [1, 13, 2, "C5", "MJ"],
  [1, 14, 0, "A4", "", ["QBb4"]],
  [0, 14, 2, "F5", "MJ"],
  [0, 15, 0, "D5", "", ["QEb5"]],
  [0, 15, 2, "F5", "", ["QEb5"]],
  [1, 15, 2, "D5", "", ["QC5"]],
  [0, 16, 0, "Eb5", "", ["QF5"]],
  [1, 16, 0, "C5", "", ["QD5"]],
  [0, 16, 2, "C5", "D", ["qEb5", "qC5", "qBb4", "qA4", "qBb4", "qEb5", "qC5"]],
  [0, 17, 0, "Bb4", "M"],
  [1, 17, 0, "Bb4", "M"],
  [0, 17, 2, "Ab5", "D"],
  [0, 18, 0, "G5", "", ["QAb5"]],
  [1, 18, 2, "Db5", "D"],
  [1, 19, 0, "C5", "", ["QDb5"]],
  [0, 19, 1, "E5", "", ["QF5"]],
  [1, 19, 2, "Bb4", "", ["QC5"]],
  [1, 20, 0, "Ab4", "", ["QBb4"]],
  [0, 20, 1, "Db5", "", ["QEb5"]],
  [0, 20, 2, "F5", "", ["QC5"]],
  [1, 20, 2, "Ab4", "", ["QG4"]],
  [0, 21, 0, "E5", "", ["QF5"]],
  [1, 22, 0, "Db5", "S"],
  [0, 22, 2, "Bb5", "", ["QF5"]],
  [0, 23, 1, "E5", "D"],
  [0, 23, 2, "F5", "", ["QE5"]],
  [1, 23, 2, "Ab4", "", ["QBb4"]],
  [0, 24, 0, "F5", "", ["QE5"]],
  [1, 24, 0, "Ab4", "", ["QG4"]],
  [0, 24, 2, "E5", "D"],
  [1, 25, 0, "Ab4", "M"],
  [1, 25, 2, "F5", "", ["QC5"]],
  [1, 26, 0, "Db5", "", ["QC5"]],
  [0, 27, 0, "G5", "", ["QF5"]],
  [0, 27, 2, "Db5", "", ["QEb5"]],
  [0, 28, 2, "Bb4", "D"],
  [0, 29, 2, "Ab4", "MJ"],
  [0, 30, 0, "G4", "", ["QAb4"]],
  [1, 30, 2, "Eb4", "MJ"],
  [1, 31, 0, "D4", "", ["QEb4"]],
  [0, 31, 2, "Bb4", "", ["QF4"]],
  [1, 31, 2, "Db4", "", ["QC4"]],
  [0, 32, 0, "Ab4", "", ["QBb4"]],
  [1, 32, 0, "C4", "", ["QDb4"]],
  [0, 32, 2, "Ab4", "", ["QG4"]],
  [1, 32, 2, "F4", "", ["QC4"]],
  [0, 33, 0, "G4", "", ["QAb4"]],
  [1, 33, 0, "Eb4", "", ["QF4"]],
  [1, 33, 2, "Eb4", "", ["QD4"]],
  [1, 34, 0, "D4", "", ["QEb4"]],
  [0, 34, 1, "Bb4", "S"],
  [1, 34, 2, "G4", "M"],
  [1, 35, 0, "C4", "", ["QG4"]],
  [0, 35, 1, "Ab4", "S"],
  [1, 35, 2, "F4", "M"],
  [1, 36, 0, "Bb3", "", ["QF4"]],
  [0, 36, 2, "C5", "W"],
  [0, 37, 0, "F4", "", ["QC5"]],
  [1, 37, 1, "D4", "", ["QEb4"]],
  [0, 37, 2, "Bb4", "MJ"],
];
