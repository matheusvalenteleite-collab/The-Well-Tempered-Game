/**
 * D366: corrections to the editions as read, applied by tools/wtc/sources.ts, each with its reason.
 * Two kinds:
 *   slip       the edition's own error (a wrong accidental, an octave slipped in LilyPond's \relative,
 *              a note left out), corrected to the reading two independent witnesses share: the
 *              free edition checked against it (the OpenWTC or verits99 MusicXML, CC0, in the
 *              repository) and the Humdrum encoding of the Bach-Gesellschaft edition (the private
 *              cross-check, never shipped);
 *   editorial  an editor's intervention, taken back to the Bach-Gesellschaft's text ("Bach is the
 *              last word", D39, D119), as Rother's own notes describe it.
 * Places are by the piece's bar (as the game numbers them), the voice (0 the highest) and the beat
 * (quarters from the bar's start). Pitches as the game spells them ("C#4").
 */
export type Correction =
  | {
      /** One note's pitch. */
      id: string;
      voice: number;
      bar: number;
      at: number;
      from: string;
      to: string;
      kind: "slip" | "editorial";
      why: string;
    }
  | {
      /** The notes of a voice within a span of a bar (from, to: quarters into the bar) replaced: "pitch@beat/length" each. */
      id: string;
      voice: number;
      bar: number;
      span: [number, number];
      notes: string;
      kind: "slip" | "editorial";
      why: string;
    }
  | {
      /**
       * A rhythm as the game plays it, throughout the piece: "triplet32" (I/5) a dotted quaver's
       * three triplet demisemiquavers (Rother's notation) played as the Bach-Gesellschaft writes them,
       * three demisemiquavers after a double-dotted quaver; "assimilate" (II/10) a dotted quaver's
       * semiquaver played with the triplets around it (the triplet's third quaver); "dotted" (II/5) the
       * other way: verits99's triplet quavers for the Bach-Gesellschaft's dotted quaver and semiquaver.
       */
      id: string;
      rhythm: "triplet32" | "assimilate" | "dotted";
      kind: "slip" | "editorial";
      why: string;
    }
  | {
      /** A voice moved an octave from a bar (to the end, or to `toBar` inclusive). */
      id: string;
      voice: number;
      fromBar: number;
      toBar?: number;
      octave: -1 | 1;
      kind: "slip" | "editorial";
      why: string;
    };

/** Why most slips are corrected: both witnesses' reading. */
const W = "the free witness (OpenWTC / verits99, CC0) and the Humdrum check agree";
const II10 = "the dotted quaver's semiquaver played as a triplet quaver, as the game has always played it (the Humdrum check and the witness align it so)";
const P1 = "Mutopia and verits99 (A = 415 Hz) agree with the Humdrum check";
const P1M = "Mutopia agrees with the Humdrum check";
const P1V = "verits99's score (A = 415 Hz) agrees with the Humdrum check";
const II3 = "the Bach-Gesellschaft's two demisemiquavers for Rother's semiquaver (the Humdrum check's \"sic\", the witness agrees)";

export const CORRECTIONS: Correction[] = [
  // Book I no. 4: the mezzo's "r2 cis" in bar 25 wants a "," in \relative (it sits above the soprano from
  // there to the end).
  { id: "wtc1f04", voice: 2, fromBar: 25, octave: -1, kind: "slip", why: "the mezzo an octave too high from bar 25 (a ',' missing in \\relative)" },
  // Book I no. 4, bar 103: Rother "rendered [the alto entry] to imitate the tenor entry in m. 105" (his
  // notes): the entry's E# F# G# G# given to the mezzo. Back to the alto, as the Bach-Gesellschaft has it.
  { id: "wtc1f04", voice: 1, bar: 103, span: [1, 4], notes: "", kind: "editorial", why: "Rother's alto entry given back to the alto (his note on m. 103)" },
  { id: "wtc1f04", voice: 2, bar: 103, span: [1, 4], notes: "E#4@1/0.5 F#4@1.5/0.5 G#4@2/1 G#4@3/1", kind: "editorial", why: "Rother's alto entry given back to the alto (his note on m. 103)" },
  // Book I no. 4, bars 99-100: the mezzo's D# tied over the bar.
  { id: "wtc1f04", voice: 1, bar: 99, span: [3, 4], notes: "D#5@3/2", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc1f04", voice: 1, bar: 100, span: [0, 1], notes: "", kind: "slip", why: `the tie over the bar (${W})` },
  // Book I no. 1, bar 12: G# A, not A G#; bar 14: the bass's A an octave down (a ',' missing).
  { id: "wtc1f01", voice: 0, bar: 12, span: [2.5, 3], notes: "G#4@2.5/0.25 A4@2.75/0.25", kind: "slip", why: "G# A, as the Humdrum check, OpenWTC and Mutopia have it" },
  { id: "wtc1f01", voice: 3, bar: 14, at: 0, from: "A3", to: "A2", kind: "slip", why: `the bass's cadence an octave down (a ',' missing in \\relative; ${W})` },
  // Book I no. 8, bar 48: the bass's D# a quaver, not E C# semiquavers; bar 77: E#, not E.
  { id: "wtc1f08", voice: 2, bar: 48, span: [1.5, 2], notes: "D#3@1.5/0.5", kind: "slip", why: W },
  { id: "wtc1f08", voice: 2, bar: 77, at: 0.5, from: "E3", to: "E#3", kind: "slip", why: "E#, as the Humdrum check and Mutopia have it" },
  // Book I no. 9, bar 26: Rother's bass reads C# where the Bach-Gesellschaft has E (which he prints small, an ossia).
  { id: "wtc1f09", voice: 2, bar: 26, span: [2, 4], notes: "F#2@2/0.75 E3@2.75/0.25 D#3@3/0.5 B2@3.5/0.5", kind: "editorial", why: `the Bach-Gesellschaft's E (Rother's ossia): ${W}` },
  // One note each: an accidental, an octave (\\relative), a letter (both witnesses).
  { id: "wtc1f01", voice: 3, bar: 18, at: 3.25, from: "B3", to: "Bb3", kind: "slip", why: W },
  { id: "wtc1f03", voice: 0, bar: 17, at: 0.25, from: "D#5", to: "D#4", kind: "slip", why: W },
  { id: "wtc1f03", voice: 0, bar: 17, at: 0.5, from: "E#5", to: "E#4", kind: "slip", why: W },
  { id: "wtc1f03", voice: 0, bar: 17, at: 0.75, from: "D#5", to: "D#4", kind: "slip", why: W },
  { id: "wtc1f03", voice: 2, bar: 29, at: 3.75, from: "F#3", to: "F##3", kind: "slip", why: W },
  { id: "wtc1f03", voice: 1, bar: 33, at: 2.5, from: "F#4", to: "F#3", kind: "slip", why: W },
  { id: "wtc1f03", voice: 1, bar: 33, at: 2.75, from: "D#4", to: "D#3", kind: "slip", why: W },
  { id: "wtc1f03", voice: 1, bar: 33, at: 3, from: "B#3", to: "B#2", kind: "slip", why: W },
  { id: "wtc1f03", voice: 1, bar: 34, at: 0.5, from: "F#4", to: "F#3", kind: "slip", why: W },
  { id: "wtc1f03", voice: 1, bar: 34, at: 0.75, from: "D#4", to: "D#3", kind: "slip", why: W },
  { id: "wtc1f03", voice: 1, bar: 34, at: 1, from: "B#3", to: "B#2", kind: "slip", why: W },
  { id: "wtc1f03", voice: 2, bar: 51, at: 1.75, from: "A#2", to: "G#2", kind: "slip", why: W },
  { id: "wtc1f04", voice: 3, bar: 41, at: 2.5, from: "A3", to: "A#3", kind: "slip", why: W },
  { id: "wtc1f04", voice: 2, bar: 70, at: 2, from: "G#3", to: "F#3", kind: "slip", why: W },
  { id: "wtc1f06", voice: 1, bar: 29, at: 1, from: "B4", to: "Bb4", kind: "slip", why: W },
  { id: "wtc1f06", voice: 0, bar: 33, at: 0.75, from: "A4", to: "G4", kind: "slip", why: W },
  { id: "wtc1f09", voice: 2, bar: 24, at: 2.5, from: "E3", to: "G#3", kind: "slip", why: W },
  { id: "wtc1f09", voice: 2, bar: 24, at: 3.5, from: "C#3", to: "E3", kind: "slip", why: W },
  { id: "wtc1f12", voice: 2, bar: 57, at: 1, from: "F3", to: "Ab3", kind: "slip", why: W },
  { id: "wtc1f12", voice: 0, bar: 57, at: 3, from: "Eb4", to: "E4", kind: "slip", why: W },
  { id: "wtc1f14", voice: 1, bar: 17, at: 4, from: "D#4", to: "D4", kind: "slip", why: W },
  { id: "wtc1f14", voice: 0, bar: 28, at: 0.5, from: "D5", to: "E5", kind: "slip", why: W },
  { id: "wtc1f15", voice: 2, bar: 47, at: 1, from: "E4", to: "E3", kind: "slip", why: W },
  { id: "wtc1f15", voice: 2, bar: 67, at: 0.75, from: "C3", to: "C#3", kind: "slip", why: W },
  { id: "wtc1f15", voice: 0, bar: 67, at: 1, from: "C5", to: "C#5", kind: "slip", why: W },
  { id: "wtc1f17", voice: 0, bar: 13, at: 3.75, from: "Eb5", to: "E5", kind: "slip", why: W },
  { id: "wtc1f17", voice: 1, bar: 19, at: 3.5, from: "G4", to: "Gb4", kind: "slip", why: W },
  { id: "wtc1f18", voice: 0, bar: 13, at: 3, from: "F#5", to: "D#5", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 5, at: 2, from: "F#4", to: "A4", kind: "slip", why: W },
  { id: "wtc1f19", voice: 0, bar: 19, at: 1.5, from: "D4", to: "D#4", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 52, at: 2.5, from: "A2", to: "B2", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 52, at: 2.75, from: "G#2", to: "A2", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 52, at: 3, from: "B2", to: "G#2", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 52, at: 3.25, from: "A2", to: "B2", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 52, at: 3.5, from: "G#2", to: "A2", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 52, at: 3.75, from: "F#2", to: "G#2", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 52, at: 4, from: "E2", to: "F#2", kind: "slip", why: W },
  { id: "wtc1f19", voice: 2, bar: 52, at: 4.25, from: "D2", to: "E2", kind: "slip", why: W },
  { id: "wtc1f20", voice: 1, bar: 23, at: 1, from: "G4", to: "D4", kind: "slip", why: W },
  { id: "wtc1f20", voice: 3, bar: 77, at: 2.75, from: "D3", to: "F3", kind: "slip", why: W },
  { id: "wtc1f21", voice: 0, bar: 27, at: 0, from: "D5", to: "F5", kind: "slip", why: W },
  { id: "wtc1f22", voice: 2, bar: 59, at: 1, from: "D5", to: "Db5", kind: "slip", why: W },
  { id: "wtc1f24", voice: 3, bar: 12, at: 2.25, from: "D#3", to: "F#3", kind: "slip", why: W },
  { id: "wtc1f24", voice: 1, bar: 23, at: 2, from: "G4", to: "G#4", kind: "slip", why: W },
  { id: "wtc1f24", voice: 3, bar: 75, at: 1.25, from: "E#3", to: "E3", kind: "slip", why: W },
  { id: "wtc2f01", voice: 1, bar: 33, at: 1.75, from: "D4", to: "F4", kind: "slip", why: W },
  { id: "wtc2f01", voice: 0, bar: 79, at: 0, from: "D4", to: "G4", kind: "slip", why: W },
  { id: "wtc2f03", voice: 0, bar: 21, at: 2, from: "E#4", to: "F#4", kind: "slip", why: W },
  { id: "wtc2f04", voice: 2, bar: 11, at: 1.75, from: "F#2", to: "G#2", kind: "slip", why: W },
  { id: "wtc2f04", voice: 2, bar: 11, at: 2, from: "G#2", to: "F#2", kind: "slip", why: W },
  { id: "wtc2f04", voice: 2, bar: 36, at: 1.5, from: "D#3", to: "F#3", kind: "slip", why: W },
  { id: "wtc2f04", voice: 0, bar: 54, at: 1.75, from: "E#4", to: "D5", kind: "slip", why: W },
  { id: "wtc2f04", voice: 1, bar: 70, at: 2.25, from: "D#4", to: "F#4", kind: "slip", why: W },
  { id: "wtc2f06", voice: 2, bar: 21, at: 3, from: "C3", to: "C#3", kind: "slip", why: W },
  { id: "wtc2f08", voice: 1, bar: 19, at: 2.5, from: "F##4", to: "F#4", kind: "slip", why: W },
  { id: "wtc2f09", voice: 0, bar: 15, at: 4, from: "B4", to: "B#4", kind: "slip", why: W },
  { id: "wtc2f09", voice: 0, bar: 15, at: 7, from: "B4", to: "B#4", kind: "slip", why: W },
  { id: "wtc2f09", voice: 0, bar: 19, at: 5.5, from: "E4", to: "E#4", kind: "slip", why: W },
  { id: "wtc2f10", voice: 0, bar: 45, at: 1, from: "A4", to: "A#4", kind: "slip", why: W },
  { id: "wtc2f10", voice: 1, bar: 83, at: 2, from: "A3", to: "B3", kind: "slip", why: W },
  { id: "wtc2f10", voice: 2, bar: 83, at: 2, from: "C3", to: "A2", kind: "slip", why: W },
  { id: "wtc2f11", voice: 0, bar: 77, at: 0.25, from: "F4", to: "G4", kind: "slip", why: W },
  { id: "wtc2f11", voice: 0, bar: 77, at: 0.5, from: "G4", to: "F4", kind: "slip", why: W },
  { id: "wtc2f11", voice: 0, bar: 78, at: 0.75, from: "D4", to: "F4", kind: "slip", why: W },
  { id: "wtc2f15", voice: 2, bar: 40, at: 1, from: "B3", to: "D4", kind: "slip", why: W },
  { id: "wtc2f15", voice: 0, bar: 60, at: 0.25, from: "B3", to: "Bb3", kind: "slip", why: W },
  { id: "wtc2f16", voice: 1, bar: 29, at: 0, from: "Eb4", to: "Bb4", kind: "slip", why: W },
  { id: "wtc2f16", voice: 3, bar: 49, at: 0.75, from: "C2", to: "E2", kind: "slip", why: W },
  { id: "wtc2f17", voice: 2, bar: 12, at: 3.75, from: "Gb4", to: "G4", kind: "slip", why: W },
  { id: "wtc2f17", voice: 1, bar: 44, at: 2, from: "Bbb4", to: "Bb4", kind: "slip", why: W },
  { id: "wtc2f17", voice: 1, bar: 44, at: 3, from: "Bbb4", to: "Bb4", kind: "slip", why: W },
  { id: "wtc2f19", voice: 0, bar: 20, at: 2, from: "D5", to: "E5", kind: "slip", why: W },
  { id: "wtc2f20", voice: 2, bar: 4, at: 1.75, from: "D3", to: "D#3", kind: "slip", why: W },
  { id: "wtc2f22", voice: 0, bar: 35, at: 5.5, from: "Eb5", to: "Ab5", kind: "slip", why: W },
  { id: "wtc2f22", voice: 2, bar: 39, at: 1, from: "E4", to: "Eb4", kind: "slip", why: W },
  { id: "wtc2f22", voice: 2, bar: 45, at: 3, from: "A3", to: "Ab3", kind: "slip", why: W },
  { id: "wtc2f22", voice: 2, bar: 77, at: 1, from: "F3", to: "Db4", kind: "slip", why: W },
  { id: "wtc2f23", voice: 2, bar: 70, at: 2.5, from: "G#4", to: "F#4", kind: "slip", why: W },
  { id: "wtc1f05", voice: 1, bar: 19, at: 2, from: "C4", to: "C#4", kind: "slip", why: W },
  { id: "wtc1f05", voice: 2, bar: 22, at: 2, from: "G4", to: "F#4", kind: "slip", why: W },
  { id: "wtc1f22", voice: 3, bar: 35, at: 3, from: "Eb3", to: "Gb3", kind: "slip", why: `Gb, not the bass's Eb doubled (${W})` },
  { id: "wtc1f22", voice: 2, bar: 71, at: 3, from: "Eb4", to: "Gb4", kind: "slip", why: `Gb, not the tenor's Eb doubled (${W})` },
  { id: "wtc2f02", voice: 2, bar: 7, at: 3.5, from: "Bb2", to: "B2", kind: "slip", why: "B natural, as the Humdrum check and Mutopia have it" },
  { id: "wtc2f02", voice: 0, bar: 15, at: 3, from: "Bb4", to: "B4", kind: "slip", why: "B natural, as the Humdrum check and Mutopia have it" },
  { id: "wtc2f02", voice: 1, bar: 27, at: 3.5, from: "F#4", to: "F4", kind: "slip", why: "F natural, as the Humdrum check and Mutopia have it" },
  { id: "wtc2f02", voice: 1, bar: 28, at: 0, from: "E4", to: "Eb4", kind: "slip", why: "the final chord's E flat, as the Humdrum check and Mutopia have it" },
  { id: "wtc2f08", voice: 3, bar: 33, at: 1.5, from: "E#3", to: "E3", kind: "slip", why: W },
  { id: "wtc2f17", voice: 3, bar: 50, at: 2, from: "Eb3", to: "Ab3", kind: "slip", why: `the final chord's A flat (${W})` },
  { id: "wtc2f21", voice: 0, bar: 78, at: 2.5, from: "Bb4", to: "C5", kind: "slip", why: W },

  // Notes left out or added, and ties (the free witness and the Humdrum check agree).
  { id: "wtc1f09", voice: 1, bar: 26, span: [2.5, 4], notes: "F#3@2.5/2.5", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc1f09", voice: 1, bar: 27, span: [0, 2.5], notes: "E3@1/1.5", kind: "slip", why: `the ties (${W})` },
  { id: "wtc1f19", voice: 0, bar: 38, span: [3, 4.5], notes: "F#4@3/2", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc1f19", voice: 0, bar: 39, span: [0, 0.5], notes: "", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc1f22", voice: 1, bar: 11, span: [2, 4], notes: "Eb5@2/3", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc1f22", voice: 1, bar: 12, span: [0, 1], notes: "", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc2f05", voice: 2, bar: 49, span: [2.5, 4], notes: "D3@2.5/0.5 B2@2.5/0.5 E3@3/1 A2@3/1", kind: "slip", why: `the bass divides (${W})` },
  { id: "wtc2f09", voice: 2, bar: 15, span: [2, 5], notes: "F#3@2/3", kind: "slip", why: `the tie (${W})` },
  { id: "wtc2f17", voice: 0, bar: 25, span: [3.5, 4], notes: "Eb5@3.5/1", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc2f17", voice: 0, bar: 26, span: [0, 0.5], notes: "", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc2f17", voice: 1, bar: 49, span: [3, 4], notes: "Ab3@3.5/0.5", kind: "slip", why: `the alto's A flat (${W})` },
  { id: "wtc2f18", voice: 1, bar: 80, span: [2, 3], notes: "B3@2/1.5", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc2f18", voice: 1, bar: 81, span: [0, 0.5], notes: "", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc2f18", voice: 1, bar: 87, span: [0.5, 2], notes: "C#5@0.5/1.5", kind: "slip", why: `the tie (${W})` },
  { id: "wtc2f19", voice: 2, bar: 3, span: [2, 2.5], notes: "D#4@2/0.25 B3@2.25/0.25", kind: "slip", why: W },
  { id: "wtc2f21", voice: 2, bar: 38, span: [0, 0.5], notes: "", kind: "slip", why: `no E flat on the downbeat (${W})` },
  { id: "wtc2f23", voice: 0, bar: 51, span: [3.5, 4], notes: "B4@3.5/1", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc2f23", voice: 0, bar: 52, span: [0, 0.5], notes: "", kind: "slip", why: `the tie over the bar (${W})` },
  { id: "wtc2f23", voice: 0, bar: 81, span: [2, 4], notes: "F#5@2/4.5", kind: "slip", why: `the tie (${W})` },
  { id: "wtc2f23", voice: 0, bar: 82, span: [2, 2.5], notes: "", kind: "slip", why: `the tie (${W})` },
  // Book II no. 24, bar 16: the Bach-Gesellschaft's soprano (D, F sharp held, as the witness has it) and alto (semiquavers).
  { id: "wtc2f24", voice: 0, bar: 16, span: [0, 1.5], notes: "D4@0/0.5 F#4@0.5/3", kind: "slip", why: "the Bach-Gesellschaft's soprano, as the Humdrum check and the witness have it" },
  { id: "wtc2f24", voice: 1, bar: 16, span: [0, 1.5], notes: "B3@0/0.25 C#4@0.25/0.25 D4@0.5/0.25 E4@0.75/0.25 F#4@1/0.25 E4@1.25/0.25", kind: "slip", why: "the Bach-Gesellschaft's alto, as the Humdrum check has it (the soprano's semiquavers in Rother's)" },

  // Book II no. 3: the Bach-Gesellschaft's demisemiquaver figures (two where Rother writes one
  // semiquaver; the reading Huron marks "sic", the witness's too).
  { id: "wtc2f03", voice: 0, bar: 19, span: [3, 3.25], notes: "E#5@3/0.125 F#5@3.125/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 19, span: [3.5, 3.75], notes: "C#5@3.5/0.125 D#5@3.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 20, span: [1, 1.25], notes: "D#5@1/0.125 E#5@1.125/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 20, span: [1.5, 1.75], notes: "B#4@1.5/0.125 C#5@1.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 20, span: [3, 3.25], notes: "C#5@3/0.125 D#5@3.125/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 20, span: [3.5, 3.75], notes: "G#4@3.5/0.125 A#4@3.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 26, span: [1.5, 1.75], notes: "B#4@1.5/0.125 C#5@1.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 27, span: [3.5, 3.75], notes: "C#5@3.5/0.125 B#4@3.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 1, bar: 16, span: [1.5, 1.75], notes: "B3@1.5/0.125 A#3@1.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 1, bar: 16, span: [2.5, 2.75], notes: "C#4@2.5/0.125 B#3@2.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 1, bar: 16, span: [3.5, 3.75], notes: "D#4@3.5/0.125 C#4@3.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 1, bar: 26, span: [3.5, 3.75], notes: "C#4@3.5/0.125 D#4@3.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 2, bar: 15, span: [3.5, 3.75], notes: "F##3@3.5/0.125 E#3@3.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 28, span: [0.5, 1], notes: "D#5@0.5/0.25 C#5@0.75/0.25", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 29, span: [3.25, 3.75], notes: "D#5@3.25/0.25 E5@3.5/0.125 D#5@3.625/0.125", kind: "slip", why: II3 },
  { id: "wtc2f03", voice: 0, bar: 31, span: [1, 2.625], notes: "E#5@1/1.625", kind: "slip", why: `the tie (${W})` },

  // Rother's own interventions, taken back (his notes; "Bach is the last word").
  // Book I no. 5: "in m. 3 (and subsequently) the rhythm has been rendered as a dotted 8th note plus
  // triplet 32nds": the Bach-Gesellschaft's three demisemiquavers after the double-dotted quaver.
  { id: "wtc1f05", rhythm: "triplet32", kind: "editorial", why: "Rother's triplet demisemiquavers (his note on m. 3) as the Bach-Gesellschaft writes them" },
  // Book I no. 17: "the tie in the descant voice going over the barline from m. 6 into m. 7 is
  // suggested"; the alto's ties in mm. 30-31 from "early versions" (dashed in his edition): not in the
  // Bach-Gesellschaft's text.
  { id: "wtc1f17", voice: 0, bar: 6, span: [3, 4], notes: "Ab5@3/1", kind: "editorial", why: "Rother's suggested tie (dashed; his note on m. 6) left out, as the Bach-Gesellschaft" },
  { id: "wtc1f17", voice: 0, bar: 7, span: [0, 1], notes: "Ab5@0/1", kind: "editorial", why: "Rother's suggested tie (dashed; his note on m. 6) left out, as the Bach-Gesellschaft" },
  { id: "wtc1f17", voice: 1, bar: 30, span: [3.5, 4], notes: "Eb5@3.5/0.5", kind: "editorial", why: "the early versions' tie (dashed in Rother's; his note on mm. 30-31) left out, as the Bach-Gesellschaft" },
  { id: "wtc1f17", voice: 1, bar: 31, span: [0, 0.5], notes: "Eb5@0/0.5", kind: "editorial", why: "the early versions' tie (dashed in Rother's; his note on mm. 30-31) left out, as the Bach-Gesellschaft" },
  { id: "wtc1f17", voice: 1, bar: 31, span: [1.5, 2.5], notes: "F5@1.5/0.5 F5@2/0.5", kind: "editorial", why: "the early versions' tie (dashed in Rother's; his note on mm. 30-31) left out, as the Bach-Gesellschaft" },
  // Book II no. 10: single places (before the rhythm below is applied).
  { id: "wtc2f10", voice: 2, bar: 30, at: 2 + 2 / 3, from: "B3", to: "A3", kind: "slip", why: W },
  { id: "wtc2f10", voice: 2, bar: 51, span: [1, 2 + 1 / 3], notes: "E4@1/1 E3@2/0.3333333333", kind: "slip", why: `the bass's E on the third beat (${W})` },
  { id: "wtc2f10", voice: 0, bar: 68, at: 2 + 2 / 3, from: "D4", to: "D#4", kind: "slip", why: W },
  { id: "wtc2f10", voice: 1, bar: 69, span: [2, 4], notes: "F#3@3.3333333333/0.3333333333 G3@3.6666666667/0.3333333333", kind: "slip", why: `no G on the third beat; the G struck again on the downbeat (${W})` },
  { id: "wtc2f10", voice: 1, bar: 70, span: [0, 1], notes: "G3@0/1", kind: "slip", why: `the G struck again on the downbeat (${W})` },
  // The subject's dotted figure in the exposition (bars 3-4, 9-10, 15-16), where no triplet sounds with it: as the game plays it.
  { id: "wtc2f10", voice: 0, bar: 3, span: [1, 2], notes: "B4@1/0.6666666667 D#5@1.6666666667/0.3333333333", kind: "editorial", why: II10 },
  { id: "wtc2f10", voice: 0, bar: 4, span: [1, 2], notes: "G4@1/0.6666666667 D#5@1.6666666667/0.3333333333", kind: "editorial", why: II10 },
  { id: "wtc2f10", voice: 1, bar: 9, span: [1, 2], notes: "F#4@1/0.6666666667 A#4@1.6666666667/0.3333333333", kind: "editorial", why: II10 },
  { id: "wtc2f10", voice: 1, bar: 10, span: [1, 2], notes: "D4@1/0.6666666667 A#4@1.6666666667/0.3333333333", kind: "editorial", why: II10 },
  { id: "wtc2f10", voice: 2, bar: 15, span: [1, 2], notes: "B3@1/0.6666666667 D#4@1.6666666667/0.3333333333", kind: "editorial", why: II10 },
  { id: "wtc2f10", voice: 2, bar: 16, span: [1, 2], notes: "G3@1/0.6666666667 D#4@1.6666666667/0.3333333333", kind: "editorial", why: II10 },
  { id: "wtc2f10", voice: 0, bar: 78, span: [2, 3 + 1 / 3], notes: "D#4@2/0.3333333333 C5@2.3333333333/1", kind: "editorial", why: "the semiquaver and dotted quaver played with the triplets, as the game has always played them" },
  // Book II no. 10: Rother writes the dotted rhythms literally; the game plays them with the triplets
  // around them, as before (the Humdrum check and the witness align them so).
  { id: "wtc2f10", rhythm: "assimilate", kind: "editorial", why: "the dotted quaver's semiquaver played as the triplets' third quaver, as the game has always played it" },
  // Book II no. 5, prelude: verits99 plays the dotted quavers with the triplets (written so); the
  // Bach-Gesellschaft's dotted quaver and semiquaver, as the game has always played them.
  { id: "wtc2p05", rhythm: "dotted", kind: "editorial", why: "the dotted quaver and semiquaver as written (verits99 writes them as triplets), as the game has always played them" },

  // Book I's preludes (OpenWTC): a note each, where Mutopia and verits99's score (at A = 415 Hz), or one
  // of them, agree with the Humdrum check against OpenWTC (P1: both free witnesses; P1M, P1V: one).
  { id: "wtc1p02", voice: 1, bar: 35, at: 0.25, from: "Ab2", to: "C2", kind: "slip", why: P1 },
  { id: "wtc1p05", voice: 1, bar: 20, at: 3, from: "E3", to: "G3", kind: "slip", why: P1 },
  { id: "wtc1p06", voice: 0, bar: 21, at: 3.1667, from: "Bb3", to: "B3", kind: "slip", why: P1 },
  { id: "wtc1p07", voice: 1, bar: 34, at: 1.75, from: "E3", to: "G3", kind: "slip", why: P1V },
  { id: "wtc1p08", voice: 0, bar: 12, at: 4.25, from: "Cb5", to: "C5", kind: "slip", why: P1 },
  { id: "wtc1p08", voice: 1, bar: 14, at: 4, from: "Bb2", to: "Bb3", kind: "slip", why: P1 },
  { id: "wtc1p08", voice: 0, bar: 15, at: 4, from: "C5", to: "A4", kind: "slip", why: P1 },
  { id: "wtc1p08", voice: 1, bar: 23, at: 5.5, from: "Eb3", to: "F3", kind: "slip", why: P1 },
  { id: "wtc1p10", voice: 0, bar: 33, at: 2, from: "C5", to: "A4", kind: "slip", why: P1 },
  { id: "wtc1p11", voice: 1, bar: 8, at: 4, from: "A2", to: "Bb2", kind: "slip", why: P1 },
  { id: "wtc1p12", voice: 1, bar: 5, at: 0, from: "Ab2", to: "A2", kind: "slip", why: P1 },
  { id: "wtc1p12", voice: 1, bar: 6, at: 1, from: "Eb3", to: "G3", kind: "slip", why: P1 },
  { id: "wtc1p13", voice: 1, bar: 15, at: 1.5, from: "A#3", to: "A#2", kind: "slip", why: P1V },
  { id: "wtc1p13", voice: 0, bar: 29, at: 1.75, from: "C#5", to: "A#4", kind: "slip", why: P1V },
  { id: "wtc1p15", voice: 1, bar: 13, at: 2.3333, from: "G3", to: "F#3", kind: "slip", why: P1 },
  { id: "wtc1p15", voice: 1, bar: 18, at: 2, from: "G2", to: "G3", kind: "slip", why: P1 },
  { id: "wtc1p16", voice: 1, bar: 8, at: 3.25, from: "G3", to: "Ab3", kind: "slip", why: P1 },
  { id: "wtc1p17", voice: 1, bar: 37, at: 1, from: "Bb3", to: "Ab3", kind: "slip", why: P1 },
  { id: "wtc1p18", voice: 1, bar: 20, at: 0.25, from: "D#3", to: "C#3", kind: "slip", why: P1V },
  { id: "wtc1p18", voice: 1, bar: 20, at: 0.5, from: "C#3", to: "D#3", kind: "slip", why: P1V },
  { id: "wtc1p21", voice: 1, bar: 13, at: 1.75, from: "Bb3", to: "C4", kind: "slip", why: P1V },
  { id: "wtc1p21", voice: 0, bar: 18, at: 1.5, from: "A3", to: "Ab3", kind: "slip", why: P1V },
  { id: "wtc1p21", voice: 0, bar: 18, at: 2.5, from: "A3", to: "Ab3", kind: "slip", why: P1V },
  { id: "wtc1p21", voice: 1, bar: 18, at: 3.625, from: "A3", to: "Ab3", kind: "slip", why: P1V },
  { id: "wtc1p23", voice: 0, bar: 2, at: 0.25, from: "F#5", to: "E5", kind: "slip", why: P1V },
  // Notes OpenWTC leaves out (the witnesses and the Humdrum check have them).
  { id: "wtc1p19", voice: 1, bar: 14, span: [0, 2.25], notes: "D3@0/0.5 B2@0.5/0.5 G#3@0.5/0.25 F#3@0.75/0.25 C#3@1/1 E#3@1/0.5 B3@1.5/0.5 A3@2/0.25 F#3@2/1", kind: "slip", why: "the bass's D B C# F# (OpenWTC's bar ends early); " + P1V },
  { id: "wtc1p07", voice: 1, bar: 49, span: [0, 0.25], notes: "Gb3@0/1 Bb2@0/0.25", kind: "slip", why: "the bass's B flat struck; " + P1V },
  { id: "wtc1p23", voice: 0, bar: 19, span: [1, 2], notes: "A#4@1/1 F#4@1/1", kind: "slip", why: "the F# under the A#; " + P1V },
];
