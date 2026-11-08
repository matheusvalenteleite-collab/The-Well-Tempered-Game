/**
 * D190, the recorded instruments of the bench and the touch game: a harpsichord (VCSL "Harpsichord,
 * Unk", Harpsi4: every key A1-F6, with its key-up "thunk") and an organ (VCSL Pipe Organ, Ivy Audio's
 * loud manual every minor third C1-C6 and its loud pedal C1-F#3, looped); D292, a grand piano
 * (Salamander Grand Piano V3, Alexander Holm, CC BY 3.0: every minor third A1-C7). chip.ts plays them
 * (`sampledNote`); this module says which recordings a piece needs, fetches and decodes only those, and
 * how to retune them. D297: and the period presets' sets (`PERIOD`): the bench's VSCO recordings and
 * these made over once decoded as a console held them (`bake`).
 *
 * Why only some notes: a decoded second of stereo at 48 kHz is 384 KB, and Safari on an iPhone drops a
 * page that holds too much (research: about 150 MB of audio at most); the whole harpsichord would be
 * about 110 MB. So a piece loads the recordings of its own range (and a little either side, for bends
 * and wrong notes), the rest are let go, and a phone over budget keeps the harpsichord in mono.
 * Why per file and not the pack (D112): a file is a plain GET, which GitHub Pages serves with CORS and
 * which the browser caches; a Range request may need a CORS preflight the site does not answer.
 * Until a note's recording is decoded, the note is played by the synthesized patch (chip.ts), so a
 * piece never goes silent; a set that cannot be had at all stays synthesized (as P13's choirs).
 */
import { SAMPLE_MANIFEST } from "../audio/sample-manifest.ts";
import { SITE } from "../audio/site.ts";
import { SAMPLED_NOTES as HARPSI_ORGAN } from "./sampled-data.ts";
import type { LatinPiece } from "./latin-drums.ts";

/**
 * D292: the Salamander Grand's notes (public/samples/grand: every minor third A1-C7, two velocity layers;
 * the game plays layer 12): each 7.03 s as trimmed, the highest shorter (measured with ffprobe); taken
 * as in tune (the set was tuned when recorded; the game retunes every note by its rate anyway).
 */
const GRAND_SHORT: Record<string, number> = { A6: 6.766, C6: 6.296, C7: 4.519, Ds6: 6.87, Fs6: 6.165 };
const GRAND_NOTES = Object.fromEntries((SAMPLE_MANIFEST.grand?.notes ?? []).map((n) => [n, { cents: 0, len: GRAND_SHORT[n] ?? 7.027 }]));

/**
 * D297, the period presets' recordings (sound.ts SUPER 16-BIT; NOCTURNE 32-BIT's until D510): a set of its own per
 * voice, the files of `folder` made over once decoded (`bake`) as a console's sound memory held them:
 * mono; band-limited and resampled to `rate` (a 4-pole lowpass at 0.45 of it, then read back by linear
 * interpolation); a 2-pole lowpass (Q 0.5) at `lp` Hz standing in for the 4-point Gaussian
 * interpolation of the SNES and the PlayStation (it softens the top of each sample's band, and moves
 * with the playback rate as on the hardware); a 2-pole high-pass at 120 Hz (the report's floor for every
 * voice, R2); quantised to `bits` against the note's peak (11: BRR's grain; 13: the PlayStation's ADPCM,
 * barely there). `loop`: the recording has none (VSCO's winds and strings, 4.5 s each): one is made
 * over its steady stretch (`WIND_LOOP`, from the onset), a 0.25 s crossfade baked in, so a held note
 * lasts as it is written (SNES samples were short loops). Each its own bank and plan; on a phone they
 * cost what a mono set does (STEREO excludes them), the plan's notes only.
 */
export interface Bake {
  folder: string;
  rate: number;
  lp: number;
  bits: number;
  /** A loop made (the recording has none): `true`, WIND_LOOP; or its own (s from the onset). */
  loop?: boolean | [number, number];
  /**
   * TRACKER (D297): read back with no interpolation (each sample held until the next, as the Amiga's
   * Paula played them: the aliasing grit kept) and no Gaussian softening (`lp` then unused).
   */
  hold?: boolean;
  /**
   * D313, SOLO VOICES: never looped in the touch game (a 2 s loop heard over again was the owner's "copy
   * paste"): a note longer than its recording goes on with passages of it from random places within this
   * steady stretch (s from the onset), each crossfaded into the last (chip.ts sampledNote, CHAIN). The
   * file keeps its `loop` for the chorales (audio/voice.ts).
   */
  chain?: [number, number];
  /** D504: the high-pass under the note (Hz; 120 where not given: the presets' floor). */
  floor?: number;
}
/** D297: TRACKER's short loops (s from the onset): half a second, as a MOD's samples looped a short stretch. */
export const TRACKER_LOOP: [number, number] = [1.0, 1.5];
/** D313: where SOLO VOICES' passages are taken from (s from the onset: build_sustain.py's files are steady from 0.2 s to 3.15 s). */
export const VOICE_CHAIN: [number, number] = [0.45, 3.0];
/** D358: the cello's made loop (s from the onset): its recordings are 2.3-4.2 s, steady from about 0.5 s to 2.2 s (measured). */
export const CELLO_LOOP: [number, number] = [0.8, 2.0];
/** D504: the trio's Iowa notes' made loop (s from the onset): build_trio.py's files are 3.4 s, steady from 0.35 s to 3.15 s. */
export const TRIO_LOOP: [number, number] = [1.0, 2.9];
export const PERIOD: Record<string, Bake> = {
  // SUPER 16-BIT (§6.1: oboe 16 kHz LP 5.8 kHz, harpsichord 16 kHz 6 kHz, clarinet 14 kHz 5 kHz, violin 16 kHz 6 kHz, bassoon 12 kHz 4.3 kHz; 11 bits).
  // D302: brighter (22 kHz, 6-7.5 kHz: they were muffled), the oboe and clarinet replaced by a flute and
  // the viola section's strings (a pizzicato was tried for the plucked voice: 7-8 dB weaker than the
  // harpsichord through a phone's speaker, measured; the harpsichord kept).
  violin16: { folder: "violin", rate: 22050, lp: 7000, bits: 11, loop: true },
  flute16: { folder: "flute", rate: 22050, lp: 6500, bits: 11, loop: true },
  harpsi16: { folder: "harpsichord", rate: 22050, lp: 7500, bits: 11 },
  strings16: { folder: "violaSus", rate: 22050, lp: 6000, bits: 11, loop: true },
  bassoon16: { folder: "bassoon", rate: 16000, lp: 5000, bits: 11, loop: true },
  // D358: the concertos' continuo on a cello (the band a string band: SOUND-PRINCIPLES.md), as the console held it.
  cello16: { folder: "cello", rate: 22050, lp: 6000, bits: 11, loop: CELLO_LOOP },
  // (D510: NOCTURNE 32-BIT's sets, 22.05 kHz and 13 bits, withdrawn with it; their folders stay, others' recordings.)
  // TRACKER (the Amiga's 8-bit samples at 8-16 kHz, held, no smoothing; short loops of 0.5 s).
  violinMod: { folder: "violin", rate: 12000, lp: 0, bits: 8, loop: TRACKER_LOOP, hold: true },
  fluteMod: { folder: "flute", rate: 10000, lp: 0, bits: 8, loop: TRACKER_LOOP, hold: true },
  harpsiMod: { folder: "harpsichord", rate: 16000, lp: 0, bits: 8, hold: true },
  // D302: the choir "aah" (its loop as the chorales' take it) and the slapped electric bass, in place of the clarinet and the bassoon.
  choirMod: { folder: "choirAahs", rate: 11000, lp: 0, bits: 8, loop: [0.9, 2.5], hold: true },
  bassMod: { folder: "ebass", rate: 11000, lp: 0, bits: 8, hold: true },
  // D302, PIPE ORGAN: the VCSL organ's plenum and pedal as recorded (their own loops), kept at 22 kHz
  // (half the memory; nothing of an organ's lost under 10 kHz) with the 120 Hz floor (no boom for a
  // phone's limiter), 16 bits: no grain.
  manualOrg: { folder: "pipeOrgan", rate: 22050, lp: 9500, bits: 16 },
  pedalOrg: { folder: "pipePedal", rate: 22050, lp: 9000, bits: 16 },
  plenoOrg: { folder: "pipeOrgan", rate: 22050, lp: 9500, bits: 16 },
  // D302, SOLO VOICES: VocalSet's four singers (their own 1-3 s loops) and FluidR3's choir "aah" (its
  // loop 0.9-2.5 s, as the chorales play it), kept at 24 kHz: nothing of a voice lost under 11 kHz.
  // D358, STRING CONSORT: the violin (VSO2), the viola (D365: TinySOL's solo viola) and the cello (Freesound 12408),
  // as recorded (24 kHz, 16 bits: nothing lost under 11 kHz), each held on a made loop of its steady stretch.
  consortViolin: { folder: "violin", rate: 32000, lp: 11000, bits: 16, loop: true },
  // D365: a solo viola (TinySOL, IRCAM, CC BY 4.0), in place of VSCO 2 CE's viola section: one player to a part.
  consortViola: { folder: "violaSolo", rate: 32000, lp: 11000, bits: 16, loop: true },
  consortCello: { folder: "cello", rate: 32000, lp: 11000, bits: 16, loop: CELLO_LOOP },
  // D512, the consort's articulation stops (consort-stops.ts): VSCO 2 CE's spiccato and pizzicato (the solo violin's, the
  // viola and cello sections'), their louder layer (v2), at the consort's fidelity, played through (no loop: short notes).
  consortViolinSpicc: { folder: "violinStac", rate: 32000, lp: 11000, bits: 16 },
  consortViolaSpicc: { folder: "violaStac", rate: 32000, lp: 11000, bits: 16 },
  consortCelloSpicc: { folder: "celloStac", rate: 32000, lp: 11000, bits: 16 },
  consortViolinPizz: { folder: "violinPizz", rate: 32000, lp: 11000, bits: 16 },
  consortViolaPizz: { folder: "violaPizz", rate: 32000, lp: 11000, bits: 16 },
  consortCelloPizz: { folder: "celloPizz", rate: 32000, lp: 11000, bits: 16 },
  voiceS: { folder: "soloSoprano", rate: 32000, lp: 11000, bits: 16, loop: [1.0, 3.0], chain: VOICE_CHAIN },
  voiceA: { folder: "soloAlto", rate: 32000, lp: 11000, bits: 16, loop: [1.0, 3.0], chain: VOICE_CHAIN },
  voiceT: { folder: "soloTenor", rate: 32000, lp: 11000, bits: 16, loop: [1.0, 3.0], chain: VOICE_CHAIN },
  voiceB: { folder: "soloBass", rate: 32000, lp: 11000, bits: 16, loop: [1.0, 3.0], chain: VOICE_CHAIN },
  choirAah: { folder: "choirAahs", rate: 32000, lp: 11000, bits: 16, loop: [0.9, 2.5] },
  // TRIALS (instruments-trials): the winds, the brass and the jazz bass at full fidelity, as the consort's (32 kHz, 16 bits), the held ones on a made loop.
  trialOboe: { folder: "oboe", rate: 32000, lp: 11000, bits: 16, loop: true },
  trialFlute: { folder: "flute", rate: 32000, lp: 11000, bits: 16, loop: true },
  trialClarinet: { folder: "clarinet", rate: 32000, lp: 11000, bits: 16, loop: true },
  trialHorn: { folder: "horn", rate: 32000, lp: 11000, bits: 16, loop: true },
  trialBassoon: { folder: "bassoon", rate: 32000, lp: 11000, bits: 16, loop: true },
  trialTrumpet: { folder: "trumpet", rate: 32000, lp: 11000, bits: 16, loop: true },
  trialTrombone: { folder: "sackbut", rate: 32000, lp: 11000, bits: 16, loop: true },
  trialBassPizz: { folder: "bassPizz", rate: 32000, lp: 11000, bits: 16 },
  // D522, CHORINHO's guitars: the classical guitar's recordings (guitar/, Freesound 11573 via tonejs-instruments, CC BY 3.0)
  // at full fidelity, played through: the seven-string on Bach's bass and the cavaquinho's voice (its own brightness: sound.ts).
  choroGuitar: { folder: "guitar", rate: 32000, lp: 11000, bits: 16 },
  // D504, ZELENKA TRIO (tools/playback/trio/build_trio.py): Iowa's oboe and bassoon, every semitone, a fortissimo and a
  // mezzoforte layer and short notes cut from the same player's sustains; VSCO's vibrato oboe (its loud layer the
  // trials' oboe/, its soft layer and its staccato); at full fidelity as the consort's, the held ones on a made loop
  // of their lengthened steady stretch (TRIO_LOOP); the bassoon's floor at 50 Hz, not the presets' 120 (its Bb1 is 58 Hz).
  trioOboe1: { folder: "trioOboe", rate: 32000, lp: 11000, bits: 16, loop: TRIO_LOOP },
  trioOboe1Mf: { folder: "trioOboeMf", rate: 32000, lp: 11000, bits: 16, loop: TRIO_LOOP },
  trioOboe1Short: { folder: "trioOboeShort", rate: 32000, lp: 11000, bits: 16 },
  trioOboe2Soft: { folder: "oboeSoft", rate: 32000, lp: 11000, bits: 16, loop: true },
  trioOboe2Short: { folder: "oboeStac", rate: 32000, lp: 11000, bits: 16 },
  trioBassoon: { folder: "trioBassoon", rate: 32000, lp: 11000, bits: 16, loop: TRIO_LOOP, floor: 50 },
  trioBassoonMf: { folder: "trioBassoonMf", rate: 32000, lp: 11000, bits: 16, loop: TRIO_LOOP, floor: 50 },
  trioBassoonShort: { folder: "trioBassoonShort", rate: 32000, lp: 11000, bits: 16, floor: 50 },
  // D502, BACH BRASS: the University of Iowa's trumpet, horn, tenor and bass trombone (tools/playback/brass/build_brass.py),
  // two layers each (the forte and the piano, the same pitches: SampledInstrument.blend), at full fidelity as the
  // consort's, each held on the made loop (WIND_LOOP: the build holds every note on to 4.3 s in steady tone).
  brassTrumpet: { folder: "brassTrumpet", rate: 32000, lp: 11000, bits: 16, loop: true },
  brassTrumpetP: { folder: "brassTrumpetP", rate: 32000, lp: 11000, bits: 16, loop: true },
  brassHorn: { folder: "brassHorn", rate: 32000, lp: 11000, bits: 16, loop: true },
  brassHornP: { folder: "brassHornP", rate: 32000, lp: 11000, bits: 16, loop: true },
  brassTrombone: { folder: "brassTrombone", rate: 32000, lp: 11000, bits: 16, loop: true },
  brassTromboneP: { folder: "brassTromboneP", rate: 32000, lp: 11000, bits: 16, loop: true },
  brassBass: { folder: "brassBass", rate: 32000, lp: 11000, bits: 16, loop: true },
  brassBassP: { folder: "brassBassP", rate: 32000, lp: 11000, bits: 16, loop: true },
  // D524, PET SOUNDS: the string section (VSCO 2 CE's viola section, sustained with vibrato: a 1966 session's strings, held
  // on the made loop) and the electric bass (Karoryfer's Black And Blue "babyblue", picked: Carol Kaye's pick on a P-bass's
  // kind of line), at full fidelity as the consort's; the bass's floor at 40 Hz (its E1 is 41 Hz).
  petStrings: { folder: "violaSus", rate: 32000, lp: 11000, bits: 16, loop: true },
};
/**
 * D297: a period set's notes are kept at this share of the decoded rate (22.05 or 24 kHz, a rate every
 * browser's createBuffer takes): what the bake leaves is all under 10 kHz.
 */
export const BAKE_RATE = 0.5;
/** D297: the made loop of the loopless recordings (s from the onset): within the steady stretch (all hold 1-4 s, measured). */
export const WIND_LOOP: [number, number] = [1.4, 3.6];
/** D504: every note of a folder at one value (a set retuned when built: 0 cents; its files' one length). */
const allOf = (folder: string, v: number): Record<string, number> => Object.fromEntries((SAMPLE_MANIFEST[folder]?.notes ?? []).map((n) => [n, v]));
const zeroCents = (folder: string) => allOf(folder, 0);
/**
 * D297: the VSCO and other recordings' tuning (cents, measured: autocorrelation over 1-3 s of each file,
 * the plucked ones over 0.2-1 s); every note 4.545 s (the plucked ones as SHORT says).
 */
const VSCO_CENTS: Record<string, Record<string, number>> = {
  oboe: { As3: 1.9, As4: -0.6, As5: 3, D4: 0.5, D5: 3.6, D6: -0.1, F4: 1, F5: 0.8, F6: 0 },
  clarinet: { As3: 1.2, As4: 0.6, As5: 0.4, D3: 0.2, D4: -0.8, D5: 0.6, D6: 3, F3: -0.1, F4: 2.4, F5: 1, F6: -0.4 },
  bassoon: { C3: -0.8, C4: -0.2, C5: 1.2, E4: 0.8, G2: -0.5, G3: -0.1, G4: -0.7 },
  violin: { C4: 4.8, C5: 4.1, C6: -9.9, C7: -0.9, E4: 0.8, E5: 15.4, E6: 12, G3: -1, G4: 1.2, G5: 5.7, G6: 10.9 },
  flute: { A4: -1.4, A5: 0.6, A6: -1.2, C4: 0, C5: 1.8, C6: -3.1, C7: 1.7, E4: 0.4, E5: 1, E6: 0.5 },
  violaSus: { A4: 1.6, B3: 0, B5: -0.8, C3: 0.2, C5: -0.5, D3: -0.2, D4: -0.5, D6: 0, E3: 0.4, E5: -0.3, F4: 0.3, G3: -0.5, G5: 1.6 },
  // D365 (measured as the cello's: autocorrelation over 1-3 s; tools/playback/viola/build_viola.py).
  violaSolo: { C3: -2.5, D3: -7.8, E3: -0.5, Fs3: 1.3, Gs3: -2.6, As3: -5.7, C4: -3.1, D4: 0.2, E4: -2.2, Fs4: -1.5, Gs4: 1.7, As4: -8.7, C5: -5.9, D5: -1.8, E5: 1.1, Fs5: -0.2, Gs5: 2.2, As5: -0.7, C6: -5.6, D6: -2.5 },
  harp: { A2: -3.7, A4: -9.6, A6: -18.7, B1: -14.5, B3: -12, B5: -8.3, C3: -2.7, C5: -10.4, D2: -4.8, D4: -12.4, D6: -7.7, D7: -8, E1: -16.5, E3: -4.4, E5: -11.5, F2: -7.2, F4: -0.7, F6: -5.8, F7: 0, G1: -21.4, G3: -8, G5: -6.7 },
  horn: { A1: -0.2, A3: 0.1, C2: 0, C4: -0.2, D3: 0.6, D5: 0.2, Ds2: 0, F3: 0.1, F5: 0.1, G2: 0.3 },
  trumpet: { A3: 0.7, A5: 0.8, As4: 1, C4: -2.3, C6: 0.6, D5: 1.3, Ds4: -2.8, F3: -12.1, F5: 1.6, G4: -1.7 },
  xylophone: { C5: 9.7, C6: 15.4, C7: 16.2, C8: 21.1, G4: 2.7, G5: 15.4, G6: 3.9, G7: 17.9 },
  ebass: { As1: -0.4, As2: -0.7, As3: 0.2, As4: 3.5, Cs1: 7.8, Cs2: 0.1, Cs3: 0, Cs4: -1.3, Cs5: 0.7, E1: 6.1, E2: -1, E3: -1.7, E4: -1.6, G1: -3.4, G2: -1.9, G3: -0.3, G4: 0.3 },
  // D302 (measured likewise: YIN over 0.05-0.6 s of each plucked file, 0.5-1.5 s of the sax's; the plucked ones over 0.1-0.6 s).
  guitar: { A2: 0.8, A4: -0.8, As5: -10.4, B1: -2.2, B3: 0.2, Cs3: 0.6, Cs5: 11.5, D2: -3.4, Ds4: 0.2, E3: 0.9, E5: -2.6, Fs2: 1.4, Fs4: 1.6, G3: 0.9, G5: -3.7 },
  cleanGuitar: { As2: 15.5, As3: 12.1, As4: 2.7, As5: -10.9, Cs3: 8.1, Cs4: 8.7, Cs5: -3.5, D6: -14.7, E2: 12.5, E3: 10.4, E4: 4.5, E5: -6.7, G2: 15.4, G3: 11, G4: 5.9, G5: -9.5 },
  sax: { As3: 0, As4: -0.5, Cs3: 0.1, Cs4: 0, Cs5: -0.4, E3: 0.1, E4: 0, E5: 0.1, G3: -0.1, G4: -0.5, G5: 0.1 },
  // (D305: the singers rebuilt as straight tone, each note's pitch held steady by tools/playback/vocalset/
  // build_straight.py; measured over their loops, 1-3 s: the median of YIN frames.)
  soloSoprano: { C4: -0.4, Cs4: -0.1, D4: -0.4, Ds4: 0, E4: -0.1, F4: 0.1, Fs4: 0.2, G4: -0.1, Gs4: 0.1, A4: 0.1, As4: -0.2, B4: -0.2, C5: -0.1, Cs5: -0.1, D5: -0.4, Ds5: -0.1, E5: -0.3, F5: 0.1, Fs5: -0.1, G5: 0, Gs5: 0.3, A5: -0.1 },
  soloAlto: { F3: 0, Fs3: -0.6, G3: -0.1, Gs3: -0.4, A3: -0.1, As3: 0.1, B3: -0.1, C4: -0.1, Cs4: 0.1, D4: 0, Ds4: 0, E4: 0, F4: 0.2, Fs4: 0.4, G4: -0.2, Gs4: -0.4, A4: 0.1, As4: 0.1, B4: -0.1, C5: -0.1, Cs5: -0.2, D5: -0.2 },
  soloTenor: { B2: 0.1, C3: 0.5, Cs3: 0.2, D3: -0.4, Ds3: 0.2, E3: 0, F3: 0.1, Fs3: 0, G3: -0.3, Gs3: 2.9, A3: 2.3, As3: -0.1, B3: -0.2, C4: -0.2, Cs4: 0.2, D4: -2.9, Ds4: -0.5, E4: -0.3, F4: 0, Fs4: -0.1, G4: -0.5, Gs4: 0, A4: 0.1 },
  soloBass: { D2: -0.5, Ds2: -0.8, E2: -0.9, F2: -0.4, Fs2: 0.7, G2: 0.9, Gs2: 1.2, A2: -0.2, As2: -0.2, B2: 0.4, C3: -0.1, Cs3: -0.1, D3: 0.7, Ds3: 0.2, E3: 0.7, F3: 0.9, Fs3: 0.1, G3: -0.8, Gs3: -0.1, A3: -0.8, As3: -0.5, B3: 0, C4: 0, Cs4: 0.3, D4: 0, Ds4: -0.2, E4: -0.4, F4: -0.1, Fs4: 0.1 },
  // D358 (measured as the guitar's, autocorrelation over 0.8-2.0 s; E2 and E3 as recorded, flat).
  cello: { A2: -0.1, A3: -1.1, A4: 0.3, As2: 0.3, As3: -3.6, B2: 0, B3: 0.9, B4: 0.9, C2: -0.3, C3: -0.7, C4: 1.6, C5: 1.1, Cs3: 0.1, Cs4: 1.8, D2: -0.6, D3: -0.5, D4: 3.7, Ds2: -0.2, Ds3: -0.6, Ds4: -1, E2: -38.6, E3: -14.7, E4: 0.9, F2: -1, F3: -0.5, F4: -3.2, Fs3: 1.7, Fs4: -2.6, G2: -0.2, G3: -0.1, G4: -1.5, Gs2: 0.8, Gs3: 0.9, Gs4: -0.4 },
  // TRIALS (measured as the cello's: autocorrelation over 1-3 s; the bass pizzicato's the median of its 2nd-4th
  // partials' peaks over its first 0.95 s, the pitch of a plucked bass string being unsteady at the onset).
  sackbut: { As1: 0.1, As2: 0.3, As3: 0.3, C3: 0, C4: 0.1, Cs2: 0, Cs4: 0, D3: 0, D4: -0.9, Ds2: 0, Ds3: 0.1, Ds4: 0.1, F2: 0, F3: 0.1, F4: 0, Gs2: -0.7, Gs3: -0.4 },
  bassPizz: { A2: 14.7, As1: 5.9, B3: -9.4, C2: 4.6, Cs3: 4.2, D2: 12.2, E1: -2.6, E2: -8.3, E3: 1.2, Fs2: 1, G1: 9.3, Gs2: 9.3, Gs3: 25 },
  // D502 (build_brass.py: autocorrelation over 0.4-1.6 s of each note as built; the 1997 scales' notes up to 33 cents off, each retuned).
  brassTrumpet: { E3: 7.6, G3: -9.4, As3: -10.8, Cs4: -0.6, E4: -3.3, G4: 8.8, As4: 6.8, Cs5: 1.3, E5: 11.2, G5: 7.7, As5: 3.2, Cs6: -8.6 },
  brassTrumpetP: { E3: -10.0, G3: -13.3, As3: -28.0, Cs4: -16.7, E4: -13.3, G4: -3.1, As4: -0.8, Cs5: 0.2, E5: 16.9, G5: 12.6, As5: 16.2, Cs6: -8.6 },
  brassTrombone: { E2: 26.7, G2: -6.4, As2: -0.7, Cs3: -8.3, E3: -5.7, G3: -0.6, As3: 11.1, Cs4: 6.8, E4: 12.7, G4: 19.7, As4: 10.0, C5: 14.5 },
  brassTromboneP: { E2: 11.1, G2: 7.3, As2: -0.6, Cs3: -25.0, E3: -6.0, G3: -3.5, As3: 4.0, Cs4: 5.9, E4: 10.0, G4: 19.6, As4: 10.5, C5: 13.7 },
  brassHorn: { F2: -38.4, Gs2: -7.4, B2: -6.2, D3: 18.4, F3: 12.4, Gs3: -8.6, B3: -3.3, D4: 7.2, F4: 15.8, Gs4: 2.5, B4: 3.7, D5: -18.5, F5: -3.0 },
  brassHornP: { F2: -37.9, Gs2: -7.5, B2: -6.3, D3: 18.5, F3: 12.5, Gs3: -8.7, B3: -3.2, D4: 7.1, F4: 15.8, Gs4: 2.6, B4: 3.8, D5: -18.5, F5: -3.0 },
  brassBass: { As1: 11.5, C2: 26.6, Ds2: 14.6, Fs2: 1.3, A2: 9.3, C3: -5.0, Ds3: -3.5, Fs3: -32.7, A3: 1.1, C4: 4.2, Ds4: 17.8, G4: 0.0 },
  brassBassP: { As1: 3.1, C2: 3.6, Ds2: -11.9, Fs2: -7.7, A2: -12.2, C3: -0.3, Ds3: 0.8, Fs3: -13.0, A3: 5.7, C4: -3.7, Ds4: 9.4, G4: -16.2 },
  choirAahs: { B3: -12.4, B4: -0.3, D4: -20.2, D5: -25.3, F3: -25.7, F4: -11.9, F5: -4.4, Gs3: -32.1, Gs4: 6.8 },
  // D504 (tools/playback/trio/build_trio.py): Iowa's notes retuned to their names by resampling (measured over each
  // note's steady stretch: within 0.5 cent after; checked again by their harmonics' peaks: within 3 cents); VSCO's
  // soft oboe and its staccato as recorded (autocorrelation over 1-3 s; the staccato's over 30-180 ms).
  trioOboe: zeroCents("trioOboe"),
  trioOboeMf: zeroCents("trioOboeMf"),
  trioOboeShort: zeroCents("trioOboeShort"),
  trioBassoon: zeroCents("trioBassoon"),
  trioBassoonMf: zeroCents("trioBassoonMf"),
  trioBassoonShort: zeroCents("trioBassoonShort"),
  oboeSoft: { As3: 1.5, D4: -0.1, F4: 0.1, As4: -0.5, D5: 1.3, F5: 2.0, As5: 1.7, D6: -3.2, F6: -2.5 },
  oboeStac: { As3: -5.3, D4: 5.3, F4: -1.8, As4: -1.2, D5: 0, F5: 4.5, As5: 6.3, D6: 9.5, F6: 24.0 },
  // D512 (the louder layer, v2; autocorrelation searched within a semitone of each name: the spiccati over 40-180 ms
  // from the onset, the pizzicati over 60-300 ms, past the pluck's sharp start).
  violinStac: { A3: 0.4, A4: -0.9, A5: -8.2, A6: -0.2, C4: 3.2, C5: -0.2, C6: 2.2, C7: 0.4, E4: -9.5, E5: -1.3, E6: 0.5, G3: 5.6, G4: 0.8, G5: 1.2, G6: 0.3 },
  violinPizz: { A3: -3.8, A4: -5.5, A5: -19.0, C4: -20.1, C5: -8.1, E4: -14.3, E5: 5.6, G3: -12.2, G4: -13.1, G5: -4.9 },
  violaStac: { A4: -8.0, B3: -3.4, B5: -5.0, C3: 11.4, C5: -18.9, D4: -1.3, D6: 6.1, E3: -3.7, E5: 13.5, F4: 5.0, G3: 4.8, G5: -4.1 },
  violaPizz: { A4: -27.4, B3: -17.0, B5: -2.7, C3: 6.0, C5: -6.8, D4: -2.2, E3: 5.6, E5: -2.5, F4: 5.4, G3: 22.4, G5: -9.3 },
  celloStac: { A3: 3.4, B2: 2.9, B4: 1.8, C2: 16.7, C4: -13.2, D3: 8.3, D5: 4.1, E2: 11.1, E4: 2.6, F3: -1.5, F5: -4.1, G2: -0.8, G4: -3.8 },
  celloPizz: { A3: -5.7, B2: -21.8, B4: 1.0, C2: 1.6, C4: 6.6, D3: -13.3, D5: 15.0, E2: 22.6, E4: -10.8, F3: -5.9, F5: -9.2, G2: 0, G4: -14.7 },
};
/** D502: BACH BRASS's folders (build_brass.py), each layer its own. */
export const BRASS_FOLDERS = ["brassTrumpet", "brassTrumpetP", "brassHorn", "brassHornP", "brassTrombone", "brassTromboneP", "brassBass", "brassBassP"] as const;
/** D297: the recordings shorter than 4.545 s (s, measured). */
const SHORT: Record<string, Record<string, number>> = {
  // D358: the cello's recordings (s, measured).
  cello: { A2: 4.122, A3: 3.02, A4: 2.485, As2: 3.805, As3: 2.756, B2: 3.463, B3: 3.434, B4: 2.631, C2: 3.847, C3: 3.126, C4: 3.308, C5: 3.359, Cs3: 3.175, Cs4: 2.735, D2: 4.226, D3: 3.364, D4: 2.711, Ds2: 3.41, Ds3: 2.68, Ds4: 2.939, E2: 3.441, E3: 2.944, E4: 2.748, F2: 3.941, F3: 2.944, F4: 2.935, Fs3: 2.622, Fs4: 2.494, G2: 3.856, G3: 2.913, G4: 2.531, Gs2: 3.596, Gs3: 2.336, Gs4: 2.532 },
  // TRIALS (s, measured).
  sackbut: { As1: 4.827, As2: 5, As3: 5, C3: 5, C4: 5, Cs2: 5, Cs4: 5, D3: 5, D4: 5, Ds2: 5, Ds3: 5, Ds4: 5, F2: 5, F3: 5, F4: 5, Gs2: 5, Gs3: 5 },
  bassPizz: { A2: 2, As1: 1.794, B3: 2, C2: 1.382, Cs3: 2, D2: 2, E1: 2, E2: 1.573, E3: 2, Fs2: 2, G1: 0.9, Gs2: 2, Gs3: 1.919 },
  // D502: every note built to 4.3 s.
  ...Object.fromEntries(BRASS_FOLDERS.map((f) => [f, Object.fromEntries((SAMPLE_MANIFEST[f]?.notes ?? []).map((n) => [n, 4.3]))])),
  harp: { A2: 4.5, A4: 4.5, A6: 3.58, B1: 4.5, B3: 4.5, B5: 4.394, C3: 4.5, C5: 4.5, D2: 4.5, D4: 4.5, D6: 3.878, D7: 2.19, E1: 4.5, E3: 4.5, E5: 4.5, F2: 4.5, F4: 4.5, F6: 2.332, F7: 1.848, G1: 4.5, G3: 4.5, G5: 4.5 },
  xylophone: { C5: 3.369, C6: 1.884, C7: 1.467, C8: 1.138, G4: 3.619, G5: 2.507, G6: 1.614, G7: 1.383 },
  horn: {},
  trumpet: { F3: 4.292 },
  ebass: {},
  guitar: { A2: 4.5, A4: 3.125, As5: 1.562, B1: 4.5, B3: 3.125, Cs3: 4.5, Cs5: 1.562, D2: 4.5, Ds4: 3.125, E3: 4.166, E5: 1.438, Fs2: 4.167, Fs4: 3.125, G3: 3.124, G5: 1.562 },
  cleanGuitar: { As2: 4, As3: 4, As4: 4, As5: 3.251, Cs3: 4, Cs4: 4, Cs5: 4, D6: 2.537, E2: 4, E3: 4, E4: 4, E5: 4, G2: 4, G3: 4, G4: 4, G5: 3.303 },
  sax: { As3: 4.5, As4: 4.5, Cs3: 4.5, Cs4: 4.5, Cs5: 4.5, E3: 4.5, E4: 4.5, E5: 4.5, G3: 4.469, G4: 4.5, G5: 4.5 },
  soloSoprano: Object.fromEntries((SAMPLE_MANIFEST.soloSoprano?.notes ?? []).map((n) => [n, 3.25])),
  soloAlto: Object.fromEntries((SAMPLE_MANIFEST.soloAlto?.notes ?? []).map((n) => [n, 3.25])),
  soloTenor: Object.fromEntries((SAMPLE_MANIFEST.soloTenor?.notes ?? []).map((n) => [n, 3.25])),
  soloBass: Object.fromEntries((SAMPLE_MANIFEST.soloBass?.notes ?? []).map((n) => [n, 3.25])),
  choirAahs: Object.fromEntries((SAMPLE_MANIFEST.choirAahs?.notes ?? []).map((n) => [n, 3.08])),
  // D504: build_trio.py's lengths.
  trioOboe: allOf("trioOboe", 3.4),
  trioOboeMf: allOf("trioOboeMf", 3.4),
  trioOboeShort: allOf("trioOboeShort", 0.5),
  trioBassoon: allOf("trioBassoon", 3.4),
  trioBassoonMf: allOf("trioBassoonMf", 3.4),
  trioBassoonShort: allOf("trioBassoonShort", 0.5),
  oboeSoft: allOf("oboeSoft", 4.5),
  oboeStac: allOf("oboeStac", 0.6),
  // D512 (s, measured).
  violinStac: { A3: 0.8, A4: 0.8, A5: 0.8, A6: 0.702, C4: 0.755, C5: 0.604, C6: 0.453, C7: 0.8, E4: 0.8, E5: 0.8, E6: 0.8, G3: 0.8, G4: 0.8, G5: 0.627, G6: 0.8 },
  violinPizz: { A3: 1.5, A4: 1.5, A5: 0.917, C4: 1.347, C5: 0.685, E4: 1.5, E5: 1.5, G3: 1.5, G4: 1.004, G5: 0.755 },
  violaStac: { A4: 0.8, B3: 0.8, B5: 0.778, C3: 0.8, C5: 0.8, D4: 0.8, D6: 0.441, E3: 0.8, E5: 0.8, F4: 0.697, G3: 0.8, G5: 0.447 },
  violaPizz: { A4: 0.702, B3: 1.5, B5: 0.499, C3: 1.5, C5: 0.778, D4: 1.5, E3: 0.935, E5: 1.138, F4: 0.789, G3: 1.5, G5: 0.755 },
  celloStac: { A3: 0.8, B2: 0.8, B4: 0.8, C2: 0.8, C4: 0.8, D3: 0.8, D5: 0.8, E2: 0.8, E4: 0.8, F3: 0.8, F5: 0.54, G2: 0.8, G4: 0.8 },
  celloPizz: { A3: 1.5, B2: 1.5, B4: 0.569, C2: 1.5, C4: 1.5, D3: 1.5, D5: 0.83, E2: 1.5, E4: 1.306, F3: 1.5, F5: 0.737, G2: 1.5, G4: 1.5 },
};
/** D313: a period set's chained stretch (Bake.chain), if it is held so rather than looped. */
export const chainOf = (set: string): [number, number] | undefined => PERIOD[set]?.chain;
/** D297: a period set's made loop (s from the onset). */
const loopOf = (b: Bake): [number, number] => (b.loop === true ? WIND_LOOP : b.loop || WIND_LOOP);
const PERIOD_NOTES = Object.fromEntries(
  Object.entries(PERIOD).map(([set, b]) => [
    set,
    HARPSI_ORGAN[b.folder] ??
      // (The key-up noises have no entries, as the harpsichord's own: short, and not retuned.)
      Object.fromEntries(VSCO_CENTS[b.folder] ? (SAMPLE_MANIFEST[b.folder]?.notes ?? []).map((n) => [n, { cents: VSCO_CENTS[b.folder][n] ?? 0, len: SHORT[b.folder]?.[n] ?? 4.545, ...(b.loop ? { loop: loopOf(b) } : {}) }]) : []),
  ]),
);

/** Every recorded note's measured tuning, length and loop (the harpsichord and organ's, D190; D288: the ensembles' withdrawn; D292: the grand piano's; D297: the period sets'). */
/**
 * D503, JAZZ QUARTET's recordings (tools/playback/jazz/build_jazz.py): the University of Iowa MIS vibraphone (motor
 * off, pedal down) at mf every semitone C3-F6, at pp and ff every whole tone; the double bass pizzicato at mf every
 * semitone E1-G4, at ff every whole tone; Karoryfer's Swirly Drums brushes (jazzBrushes, BRUSH_FILES). The tuning
 * measured there (cents: the harmonic sum's peak over 0.25-1.25 s, the bass's over 0.12-0.7 s; the vibraphone was
 * tuned about 10 cents sharp, A = 442.6); the lengths as trimmed.
 */
const JAZZ_CENTS: Record<string, Record<string, number>> = {
  jazzVibes: { C3: 10.5, Cs3: 10.5, D3: 10.5, Ds3: 10.5, E3: 10.5, F3: 10.5, Fs3: 12, G3: 10.5, Gs3: 11.5, A3: 10.5, As3: 10.5, B3: 11, C4: 10.5, Cs4: 10.5, D4: 10, Ds4: 10.5, E4: 10.5, F4: 10.5, Fs4: 10.5, G4: 10, Gs4: 10, A4: 10.5, As4: 10.5, B4: 10.5, C5: 11, Cs5: 10.5, D5: 10.5, Ds5: 10.5, E5: 10.5, F5: 10, Fs5: 9.5, G5: 10.5, Gs5: 10, A5: 10, As5: 10, B5: 10.5, C6: 10.5, Cs6: 10.5, D6: 10, Ds6: 10, E6: 10.5, F6: 10.5 },
  jazzVibesSoft: { C3: 15.5, D3: 13.5, E3: 9, Fs3: 15.5, Gs3: 13.5, As3: 12, C4: 11, D4: 9.5, Fs4: 12, Gs4: 7.5, As4: 12, C5: 11, D5: 9, E5: 12.5, Fs5: 11.5, Gs5: 8, As5: 10.5, C6: 10, D6: 9.5, E6: 10 },
  jazzVibesHard: { C3: 9.5, D3: 10, E3: 9.5, Fs3: 11, Gs3: 11, As3: 10.5, C4: 10.5, D4: 10.5, E4: 10.5, Fs4: 10.5, Gs4: 10, As4: 10.5, C5: 10.5, D5: 10, E5: 10.5, Fs5: 9.5, Gs5: 10, As5: 10, C6: 10, D6: 10, E6: 10 },
  jazzBass: { E1: 0, F1: -2.5, Fs1: 2.5, G1: 11, Gs1: 12, A1: 4, As1: 11.5, B1: 0, C2: 7.5, Cs2: 9, D2: -10.5, Ds2: 12, E2: -2.5, F2: 2.5, Fs2: 3.5, G2: -4, Gs2: 1.5, A2: -4.5, As2: -2.5, B2: 1.5, C3: -6.5, Cs3: -8, D3: -1.5, Ds3: 7, E3: -4.5, F3: -5, Fs3: -8.5, G3: 0.5, Gs3: -3, A3: -2.5, As3: -14, B3: 3.5, C4: 2, Cs4: 14, D4: -0.5, Ds4: -9.5, E4: -8, F4: -4.5, Fs4: -7.5, G4: -9.5 },
  jazzBassHard: { E1: 15, Fs1: 1, Gs1: 19.5, As1: 4, C2: 0, D2: -7.5, E2: -2.5, Fs2: 35, Gs2: 6.5, As2: -0.5, C3: -4.5, D3: 3, E3: -1, Fs3: -7, Gs3: -2.5, As3: -6.5, C4: 0.5, D4: 7, E4: -11.5, Fs4: -3 },
};
/**
 * D510, the bass on a phone: each recording's pluck through the 600 Hz phone model (its first 0.15 s) differs from its
 * neighbours' by a median 3.3 dB (mf; ff 3.0), up to 11 dB from the line over pitch (the overtones the small speaker
 * hears vary note by note: D2 and D#2 bright, C#2 dull): a line's notes jumped in and out of hearing on a leap. Each
 * recording's trim (dB, on a phone only: chip.ts sampledNote) against a straight fit over pitch (0.68 dB a semitone
 * kept: the register's own), within -6 and +4 (a boost no more than 4 dB, for the limiter): the neighbours then a median
 * 0.8 dB apart (ff 1.3). Measured by scratchpad realloc/phonetrim.py (D510).
 */
const JAZZ_PHONE_DB: Record<string, Record<string, number>> = {
  jazzBass: { E1: -2.5, F1: -3, Fs1: 1, G1: -6, Gs1: -3, A1: 2, As1: 4, B1: 3, C2: 0.5, Cs2: 4, D2: -6, Ds2: -6, E2: -2, F2: -0.5, Fs2: 1.5, G2: 3, Gs2: -2.5, A2: 1.5, As2: 1.5, B2: -1, C3: 0, Cs3: -4.5, D3: 3, Ds3: 4, E3: -1.5, F3: 3, Fs3: 4, G3: 4, Gs3: 2.5, A3: 4, As3: -1.5, B3: -5.5, C4: -6, Cs4: -5, D4: -6, Ds4: -4.5, E4: 1.5, F4: 2.5, Fs4: -5, G4: 2 },
  jazzBassHard: { E1: -3, Fs1: -1, Gs1: -2, As1: 0.5, C2: -1, D2: -4.5, E2: 0, Fs2: 4, Gs2: 1.5, As2: 2, C3: 3, D3: 1.5, E3: 0.5, Fs3: 4, Gs3: 4, As3: -2, C4: -4.5, D4: -5.5, E4: -0.5, Fs4: -5 },
};
const JAZZ_LEN: Record<string, number> = { jazzVibes: 4, jazzVibesSoft: 4, jazzVibesHard: 4, jazzBass: 2.6, jazzBassHard: 2.6 };
/**
 * D503: the brush kit's pieces, filed under note names in jazzBrushes (build_jazz.py): the brushed snare's taps at
 * four dynamics, two strokes each (C3-G3, soft to loud: Swirly's layers 4, 6, 8, 12); the two stirs (C4 softer, D4
 * firmer: the brush circling the head, 4 s loops); the two flutters (E4, F4: the buzz roll, 3 s loops); the brushed
 * ride at three dynamics (C5, D5, E5: layers 6, 9, 12); the hi-hat's foot at two (C6/C#6 soft, D6/D#6 firm, two strokes).
 */
export const BRUSH_FILES = {
  tap: [[48, 49], [50, 51], [52, 53], [54, 55]],
  stir: [60, 62],
  flutter: [64, 65],
  ride: [72, 74, 76],
  foot: [[84, 85], [86, 87]],
} as const;
export const BRUSH_SET = "jazzBrushes";
const BRUSH_LEN: Record<number, number> = { 48: 0.9, 49: 0.9, 50: 0.9, 51: 0.9, 52: 0.9, 53: 0.9, 54: 0.9, 55: 0.9, 60: 4, 62: 4, 64: 3, 65: 3, 72: 2.5, 74: 2.5, 76: 2.5, 84: 0.6, 85: 0.6, 86: 0.6, 87: 0.6 };
/** D503: every brush file (MIDI), for the kit's plan. */
export const BRUSH_MIDIS: readonly number[] = Object.keys(BRUSH_LEN).map(Number);
/**
 * D520/D522, SALSA's and CHORINHO's percussion (tools/playback/latin/build_latin.py, from VCSL, CC0): each piece's
 * files in latinPerc under note names from C2 (MIDI 36), [dynamic layer: soft, loud][round robin]; each file's
 * loudness over its first 0.15 s evened in the build (the levels per piece are chip.ts LATIN_KIT's).
 */
export const LATIN_FILES: Readonly<Record<LatinPiece, readonly (readonly number[])[]>> = {
  conga: [[36, 37], [38, 39]],
  slap: [[40, 41], [42, 43]],
  tumba: [[44, 45], [46, 47]],
  bongoHi: [[48, 49], [50, 51]],
  bongoMute: [[52, 53], [54, 55]],
  bongoLo: [[56, 57], [58, 59]],
  bell: [[60], [61]],
  bellLow: [[62]],
  timbalBell: [[63], [64]],
  clave: [[65, 66], [67, 68]],
  hembra: [[69, 70], [71, 72]],
  macho: [[73, 74], [75, 76]],
  rimshot: [[77, 78]],
  cascara: [[79, 80]],
  pandJingle: [[81, 82]],
  pandHit: [[83], [84]],
  pandBass: [[85, 86]],
  pandSlap: [[87, 88]],
  surdo: [[89, 90], [91, 92]],
  tamborim: [[93, 94]],
  agogoHi: [[95], [96]],
  agogoLo: [[97]],
  ganza: [[98, 99], [100, 101]],
};
export const LATIN_SET = "latinPerc";
const LATIN_LEN: Record<number, number> = { 36: 0.79, 37: 0.75, 38: 0.8, 39: 0.8, 40: 0.67, 41: 0.8, 42: 0.8, 43: 0.8, 44: 0.8, 45: 0.72, 46: 0.8, 47: 0.8, 48: 0.8, 49: 0.8, 50: 0.8, 51: 0.8, 52: 0.8, 53: 0.8, 54: 0.8, 55: 0.8, 56: 0.8, 57: 0.8, 58: 0.8, 59: 0.8, 60: 0.9, 61: 0.9, 62: 0.9, 63: 0.9, 64: 0.9, 65: 0.8, 66: 0.8, 67: 0.8, 68: 0.8, 69: 0.8, 70: 0.8, 71: 0.8, 72: 0.8, 73: 0.7, 74: 0.7, 75: 0.71, 76: 0.62, 77: 0.8, 78: 0.8, 79: 0.3, 80: 0.3, 81: 0.3, 82: 0.3, 83: 0.8, 84: 0.8, 85: 0.8, 86: 0.8, 87: 0.8, 88: 0.8, 89: 1.4, 90: 1.4, 91: 1.4, 92: 1.4, 93: 0.4, 94: 0.4, 95: 0.9, 96: 0.9, 97: 1.1, 98: 0.17, 99: 0.18, 100: 0.25, 101: 0.25 };
/** D520/D522: the files a band's percussion plays (MIDI), for its plan: salsa's pieces or chorinho's. */
export const LATIN_BAND_PIECES: Readonly<Record<"salsa" | "chorinho", readonly LatinPiece[]>> = {
  salsa: ["conga", "slap", "tumba", "bongoHi", "bongoMute", "bongoLo", "bell", "bellLow", "timbalBell", "clave", "hembra", "macho", "rimshot", "cascara"],
  chorinho: ["pandJingle", "pandHit", "pandBass", "pandSlap", "surdo", "tamborim", "agogoHi", "agogoLo", "ganza"],
};
export const latinMidis = (band: "salsa" | "chorinho"): number[] => LATIN_BAND_PIECES[band].flatMap((p) => LATIN_FILES[p].flat());
const noteName = (m: number) => `${["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"][m % 12]}${Math.floor(m / 12) - 1}`;
const JAZZ_NOTES: Record<string, Record<string, { cents: number; len: number; phoneDb?: number }>> = {
  ...Object.fromEntries(Object.entries(JAZZ_CENTS).map(([set, cs]) => [set, Object.fromEntries(Object.entries(cs).map(([n, cents]) => [n, { cents, len: JAZZ_LEN[set], ...(JAZZ_PHONE_DB[set]?.[n] ? { phoneDb: JAZZ_PHONE_DB[set][n] } : {}) }]))])),
  [BRUSH_SET]: Object.fromEntries(Object.entries(BRUSH_LEN).map(([m, len]) => [noteName(Number(m)), { cents: 0, len }])),
  [LATIN_SET]: Object.fromEntries(Object.entries(LATIN_LEN).map(([m, len]) => [noteName(Number(m)), { cents: 0, len }])),
};

/**
 * D523, ABBEY ROAD's and D525, KRAUTROCK's recordings, all already in public/samples (no new files): Karoryfer's
 * Black And Green Guitars' green Gretsch Anniversary (cleanGuitar/, CC0: George Harrison's Gretsch), Karoryfer's
 * electric guitar via tonejs-instruments (eguitar/, CC BY 3.0: the second guitar, John Lennon's Casino's part), Black
 * And Blue Basses' "babyblue", a Thunderbird-style bass played with a pick (rickBass/, CC0: Paul McCartney's picked
 * Rickenbacker of 1967-69, and Holger Czukay's picked bass). Measured here (scratchpad bands/tools/tune.py): the
 * tuning (cents: the harmonic sum's peak over 0.15-0.9 s), and each recording's trim (`db`, everywhere) to a straight
 * line over pitch of the first 0.3 s's loudness (the Gretsch's notes were 3.2 dB about it, up to 12 dB apart; the
 * electric guitar's 2.0; the bass's 1.0), within -6 and +4 dB, and then on a phone (`phoneDb`) the same through the
 * 600 Hz phone model: the line's notes as even as the jazz bass's (D510).
 */
const ROCK_CENTS: Record<string, Record<string, number>> = {
  cleanGuitar: { E2: 10.5, G2: 13.5, As2: 16, Cs3: 8, E3: 10.5, G3: 9.5, As3: 11.5, Cs4: 8, E4: 4.5, G4: 5.5, As4: 2.5, Cs5: -3.5, E5: -7.5, G5: -9.5, As5: -11.5, D6: -15 },
  eguitar: { Cs2: -0.5, E2: -1, A2: 0.5, C3: -1, Ds3: -0.5, Fs3: -1.5, A3: -1, C4: -3, Ds4: -0.5, Fs4: -0.5, A4: 0, C5: -0.5, Ds5: 3, Fs5: 6, A5: 1, C6: 0 },
  rickBass: { E1: 5.5, G1: 11.5, As1: 4, Cs2: -0.5, E2: -2, G2: 3, As2: -2, Cs3: -6.5, E3: -10, G3: -4.5 },
};
const ROCK_DB: Record<string, Record<string, number>> = {
  cleanGuitar: { E2: -2, G2: -0.5, As2: 1, Cs3: -1.5, E3: 2, G3: -3.5, As3: -3, Cs4: -1, E4: 4, G4: 1.5, As4: 2, Cs5: 4, E5: 4, G5: -3, As5: -3, D6: -5.5 },
  eguitar: { Cs2: 4, E2: 0, A2: -1, C3: -0.5, Ds3: -1.5, Fs3: 1, A3: -1, C4: 0, Ds4: -2, Fs4: -0.5, A4: -3, C5: -1, Ds5: -2.5, Fs5: 3, A5: 3.5, C6: 0.5 },
  rickBass: { E1: -1, G1: -0.5, As1: 0.5, Cs2: 0.5, E2: 1.5, G2: -0.5, As2: 1.5, Cs3: 0.5, E3: -0.5, G3: -1 },
};
const ROCK_PHONE_DB: Record<string, Record<string, number>> = {
  cleanGuitar: { E2: 1, G2: 2.5, As2: 1, Cs3: 1.5, G3: -2.5, As3: -2, Cs4: -2.5, E4: -1.5, G4: -2, As4: -1, Cs5: 1.5, E5: 2, As5: 0.5, D6: 1.5 },
  eguitar: { Cs2: -0.5, E2: -1.5, A2: 1.5, C3: 2.5, Ds3: 1.5, Fs3: -0.5, A3: -1, C4: -0.5, Ds4: -2.5, Fs4: -1.5, C5: 1.5, Fs5: -0.5, C6: 0.5 },
  rickBass: { E1: -2, G1: 0.5, Cs2: 1, G2: 2, As2: -1, Cs3: 1, E3: 0.5, G3: -1.5 },
};
const ROCK_LEN: Record<string, number> = { cleanGuitar: 4, eguitar: 4.2, rickBass: 4 };
const ROCK_NOTES: Record<string, Record<string, { cents: number; len: number; db?: number; phoneDb?: number }>> = Object.fromEntries(
  Object.entries(ROCK_CENTS).map(([set, cs]) => [
    set,
    Object.fromEntries(Object.entries(cs).map(([n, cents]) => [n, { cents, len: Math.min(ROCK_LEN[set], (SHORT[set]?.[n] as number | undefined) ?? ROCK_LEN[set]), ...(ROCK_DB[set]?.[n] ? { db: ROCK_DB[set][n] } : {}), ...(ROCK_PHONE_DB[set]?.[n] ? { phoneDb: ROCK_PHONE_DB[set][n] } : {}) }])),
  ]),
);
/**
 * D523, D525: the rock kit, Karoryfer's Big Rusty Drums (CC0; public/samples/drums/bigRusty, as the Lab's kits keep it:
 * "<piece>-1.mp3" soft, "<piece>-2.mp3" loud), filed here under MIDI numbers (ROCK_KIT_FILES) so the touch game's
 * loader plans and keeps it as any set (`fileOf`, `folderOf`); its loudness as prepared (ROCK_KIT_RMS: ffmpeg's
 * integrated loudness of each file, LUFS), so each piece is evened before its level is set (chip.ts ROCK_DRUMS).
 */
export const ROCK_KIT_SET = "rockKit";
const ROCK_KIT_PIECES = ["kick", "snare", "rim", "hat", "openhat", "crash", "ride", "tomHigh", "tomLow"] as const;
export const ROCK_KIT_FILES: Readonly<Record<number, string>> = Object.fromEntries(ROCK_KIT_PIECES.flatMap((p, i) => [[36 + 2 * i, `${p}-1`], [37 + 2 * i, `${p}-2`]]));
/** The MIDI of a piece's soft (`loud` false) or loud recording in the rock kit. */
export const rockKitMidi = (piece: (typeof ROCK_KIT_PIECES)[number], loud: boolean) => 36 + 2 * ROCK_KIT_PIECES.indexOf(piece) + (loud ? 1 : 0);
export const ROCK_KIT_MIDIS: readonly number[] = Object.keys(ROCK_KIT_FILES).map(Number);
export const ROCK_KIT_RMS: Readonly<Record<number, number>> = Object.fromEntries(
  Object.entries({ kick: [-31, -22.5], snare: [-33, -27.3], rim: [-37.5, -30.5], hat: [-41.3, -32.7], openhat: [-34.2, -31], crash: [-36.5, -33], ride: [-47.4, -40.8], tomHigh: [-33.8, -27.4], tomLow: [-33.8, -27.5] }).flatMap(([p, [a, b]]) => [
    [rockKitMidi(p as (typeof ROCK_KIT_PIECES)[number], false), a],
    [rockKitMidi(p as (typeof ROCK_KIT_PIECES)[number], true), b],
  ]),
);
const ROCK_KIT_LEN: Record<string, number> = { kick: 0.85, snare: 1.1, rim: 0.86, hat: 0.84, openhat: 1.23, crash: 3.03, ride: 3.03, tomHigh: 1.46, tomLow: 1.6 };

/**
 * D521, BOSSA NOVA's nylon guitar (tools/playback/bossa/build_bossa.py): the University of Iowa MIS guitar (a Raimundo 118
 * classical guitar, 2011, anechoic) at mf every semitone E2-B5 (C5 not cut from its scale and E3's cut a breath, not a pluck: read from
 * their neighbours), at pp every whole tone (E2 and E3 likewise), each from the string a bossa guitarist would take it on. The tuning measured there (cents: the
 * harmonic sum's peak over 0.15-0.9 s: the guitar was tuned about 20 cents flat, its low strings flatter); 3.5 s as trimmed.
 * And the rhythm section's cross-stick and bass drum (bossaKit: Big Rusty's, CC0, BOSSA_KIT_FILES).
 */
const BOSSA_CENTS: Record<string, Record<string, number>> = {
  bossaGuitar: { E2: -39.5, F2: -31.5, Fs2: -34.5, G2: -37.5, Gs2: -31, A2: -37, As2: -21.5, B2: -22, C3: -23.5, Cs3: -19.5, D3: -25, Ds3: -18.5, F3: -19, Fs3: -14.5, G3: -30, Gs3: -12.5, A3: -14, As3: -11, B3: -10.5, C4: -13, Cs4: -13.5, D4: -12.5, Ds4: -8.5, E4: -25.5, F4: -20.5, Fs4: -19.5, G4: -19, Gs4: -18, A4: -19.5, As4: -17.5, B4: -17.5, Cs5: -21, D5: -21.5, Ds5: -17, E5: -19, F5: -20.5, Fs5: -20, G5: -16.5, Gs5: -21, A5: -24.5, As5: -21.5, B5: -15.5 },
  bossaGuitarSoft: { Fs2: -35, Gs2: -32, As2: -24, C3: -24.5, D3: -24.5, Fs3: -16.5, Gs3: -13.5, As3: -13, C4: -14.5, D4: -13.5, E4: -25, Fs4: -19.5, Gs4: -18, As4: -21, C5: -18.5, D5: -20, E5: -14, Fs5: -18, Gs5: -9.5, As5: -24 },
};
/** D521: the cross-stick (soft, firm) and the bass drum (soft, firm), filed under note names in bossaKit. */
export const BOSSA_KIT_FILES = { rim: [48, 50], kick: [36, 38] } as const;
export const BOSSA_KIT_SET = "bossaKit";
const BOSSA_KIT_LEN: Record<number, number> = { 36: 0.84, 38: 0.73, 48: 0.86, 50: 0.73 };
/** D521: every file of the kit (MIDI), for the plan. */
export const BOSSA_KIT_MIDIS: readonly number[] = Object.keys(BOSSA_KIT_LEN).map(Number);
const BOSSA_NOTES: Record<string, Record<string, { cents: number; len: number }>> = {
  ...Object.fromEntries(Object.entries(BOSSA_CENTS).map(([set, cs]) => [set, Object.fromEntries(Object.entries(cs).map(([n, cents]) => [n, { cents, len: 3.5 }]))])),
  [BOSSA_KIT_SET]: Object.fromEntries(Object.entries(BOSSA_KIT_LEN).map(([m, len]) => [noteName(Number(m)), { cents: 0, len }])),
};

/** D510: `phoneDb`, a recording's own trim on a phone (JAZZ_PHONE_DB); D523: `db`, its own trim everywhere (ROCK_DB). */
const SAMPLED_NOTES: Record<string, Record<string, { cents: number; len: number; loop?: [number, number]; phoneDb?: number; db?: number }>> = {
  ...HARPSI_ORGAN,
  grand: GRAND_NOTES,
  grandSoft: GRAND_NOTES,
  ...PERIOD_NOTES,
  ...JAZZ_NOTES,
  ...ROCK_NOTES,
  ...BOSSA_NOTES,
  [ROCK_KIT_SET]: Object.fromEntries(Object.entries(ROCK_KIT_FILES).map(([m, f]) => [noteName(Number(m)), { cents: 0, len: ROCK_KIT_LEN[f.split("-")[0]] }])),
};

/**
 * D294: a set that is another folder's velocity layer (its files "C4-v7.mp3" beside the layer played):
 * the grand's softer layer 7 as "grandSoft". Its own bank, plan and mono fold; the folder's manifest.
 */
// D514: and the timpani's loud hits (VSCO-2 CE, public/samples/timpani; their soft layer is uneven, -26 to -54 dB), for TIMPANI.
const LAYER_SET: Record<string, { folder: string; layer: number }> = { grandSoft: { folder: "grand", layer: 7 }, timpLoud: { folder: "timpani", layer: 2 } };
/**
 * D514, the drum presets' recorded kits (drum-presets.ts): the one-shots of public/samples/drums/<kit>/ (D107's, each
 * piece soft "-1" and loud "-2"), read in place as a set: piece i of KIT_VOICES at MIDI 24 + 2i (soft) and 25 + 2i
 * (loud). Big Rusty Drums (ROCK KIT) and Virtuosity Drums (JAZZ KIT, FRAME DRUMS, and TIMPANI's cymbal, bass drum and
 * triangle), both Karoryfer's, CC0. And the timpani (TIMP_SET: VSCO-2's loud layer, F2 B2 C#3 E3 G3, retuned by rate).
 */
export type KitSet = "kitRock" | "kitClub";
export const KIT_FOLDER: Readonly<Record<KitSet, string>> = { kitRock: "drums/bigRusty", kitClub: "drums/virtuosity" };
export const KIT_VOICES: Readonly<Record<KitSet, readonly string[]>> = {
  kitRock: ["kick", "snare", "rim", "hat", "openhat", "crash", "ride", "tomHigh", "tomLow"],
  kitClub: ["kick", "snare", "rim", "hat", "openhat", "crash", "ride", "tomHigh", "tomLow", "cowbell", "tambourine", "shaker", "congaHigh", "congaLow", "bongo", "woodblock", "claves", "triangle", "guiro"],
};
/** A kit piece's file as its set's MIDI number (null: the kit has no such piece). */
export function kitMidi(set: KitSet, voice: string, loud: boolean): number | null {
  const i = KIT_VOICES[set].indexOf(voice);
  return i < 0 ? null : 24 + 2 * i + (loud ? 1 : 0);
}
export const TIMP_SET = "timpLoud";
/** The timpani's recorded drums (MIDI): F2, B2, C#3, E3, G3. */
export const TIMP_MIDIS: readonly number[] = [41, 47, 49, 52, 55];
/** The folder of public/samples a set's files are in (D297: a period set's, its folder's; D514: a kit's, drums/<kit>; D523: the rock kit's). */
export const folderOf = (set: string) => (set === ROCK_KIT_SET ? "drums/bigRusty" : (KIT_FOLDER[set as KitSet] ?? LAYER_SET[set]?.folder ?? PERIOD[set]?.folder ?? set));

export type SampledId = "harpsichord" | "organ" | "piano" | "violin16" | "flute16" | "harpsi16" | "strings16" | "bassoon16" | "consortViolinSpicc" | "consortViolaSpicc" | "consortCelloSpicc" | "consortViolinPizz" | "consortViolaPizz" | "consortCelloPizz" | "violinMod" | "fluteMod" | "harpsiMod" | "choirMod" | "bassMod" | "voiceS" | "voiceA" | "voiceT" | "voiceB" | "choirAah" | "organPedal" | "organPleno" | "cello16" | "consortViolin" | "consortViola" | "consortCello" | "trialOboe" | "trialFlute" | "trialClarinet" | "trialHorn" | "trialBassoon" | "trialTrumpet" | "trialTrombone" | "trialBassPizz" | "trioOboe1" | "trioOboe2" | "trioBassoon" | "brassTrumpet" | "brassHorn" | "brassTrombone" | "brassBass" | "jazzVibes" | "jazzBass" | "choroGuitar" | "rockGuitar" | "rockGuitar2" | "rockBass" | "bossaGuitar" | "petStrings";

export interface SampledInstrument {
  /** The recordings (a folder of public/samples). */
  set: string;
  /** The key-up noises, one per note of `set` (the harpsichord's jacks and dampers). */
  release?: string;
  /** The pedal's recordings, for ORGANO PLENO's octave below. */
  low?: string;
  /** Plucked: dies away by itself, damped at the written end; else held (looped) until let go. */
  plucked: boolean;
  /** Level against the synthesized patches (measured in a browser: equal RMS over a note's first second at C4). */
  gain: number;
  /** D292: the velocity layer played, where the set has several (its files named "C4-v12.mp3"). */
  layer?: number;
  /**
   * D294: a softer layer (a set of LAYER_SET), played for the notes the phrasing gives a level under
   * `below` (the lighter notes of the bar), at `gain` against the main layer (so the two differ more in
   * colour than in loudness: layer 7 is about 5 dB under layer 12 as recorded).
   */
  soft?: { set: string; below: number; gain: number };
  /**
   * D503: a harder layer (its own set), played for the notes the phrasing gives a level over `above` (the band's
   * louder notes: Busoni's f) or a landing in the strong zone (Play.layer "hard"), at `gain` against the main one:
   * the vibraphone's hard mallet, the bass's stronger pluck. Its notes may be fewer (every whole tone): the nearest.
   */
  hard?: { set: string; above: number; gain: number };
  /**
   * D503, the vibraphone's pedal and the bass's left hand (chip.ts sampledNote): a note held under `short` s is
   * damped at its end with a time constant of `shortTau` (a dead stroke: the mallet or the finger on the bar or the
   * string), a longer one with `tau` (the pedal let up as the next note sounds: a little ring into it).
   */
  pedal?: { short: number; shortTau: number; tau: number };
  /** D297: the key-up noise's level against the note (0.9 if not given). */
  relGain?: number;
  /**
   * D357: a recorded pipe's speech kept on a new note (s): the recording entered that long before it
   * reaches half its level (Loaded.speech), at most SPEAK_MAX in. D349 gave every organ note its own
   * attack (no joined note entered past its speech): the VCSL pedal's 55-120 ms of speech then left a
   * short detached note (the plenum's pedal, I/2's 16ths of 0.11 s) 13 dB under its neighbours: the
   * owner's "the bass in the beginning is cutting".
   */
  speak?: number;
  /** D297: the pitches from `from` up played from `set` (an organ's manual above its pedal's compass). */
  above?: { set: string; from: number };
  /**
   * D339, a piano's dampers (chip.ts sampledNote): the release's time constant (s) from `low` (A1 and
   * under) to `high` (C6 and over), the strings from `undamped` (MIDI) up left to ring (a grand's top
   * octave and a half has no dampers); the felt's last contact a slower `tail` (that many times the
   * time constant, from 3 of them on: the residue a damper leaves, Repp 1995, 1997); the player's lifts:
   * a staccato (held under `stacc` s) at most `crisp`, a slur's end (Play.group) `slur` times slower.
   */
  damper?: { low: number; high: number; undamped: number; tail: number; stacc: number; crisp: number; slur: number };
  /** D339: dB of brightness (a high shelf at `hz`) per dB of level struck (Play.vel), within [min, max]. */
  velTone?: { perDb: number; hz: number; min: number; max: number };
  /**
   * D502, BACH BRASS: a second dynamic layer recorded at the same pitches (`set`: the piano recordings), played with the
   * main (the forte) and crossfaded by the note's brassiness (Play.brass, 0 the piano layer to 1 the forte: equal power,
   * touch-expr.ts brassMix), live while held (Sounding.shape: the swell's brightness follows).
   */
  blend?: { set: string };
  /**
   * D405: at most this many semitones between a note and the recording it is played from. A struck string
   * read much faster than it was recorded turns glassy (a glockenspiel), much slower muddy; a pitch past
   * the recordings' compass by more is played an octave nearer it (`foldInto`), never stretched.
   */
  maxShift?: number;
  /**
   * D504: a short note's own recordings: a note written `under` s or shorter (not joined) played from `set` (a
   * tongued short note, not a sustain cut off), where it has loaded; else the sustain.
   */
  short?: { set: string; under: number };
}

/** D504: the trio's softer layer under this level (-1.5 dB, as the piano's), at this gain against the loud one (-1.5 dB). */
export const TRIO_SOFT_BELOW = 0.8414;
export const TRIO_SOFT_GAIN = 0.84;
/** D504: a note this short (s, as written and not joined) the trio's short recordings play. */
export const TRIO_SHORT_S = 0.16;

/** D510: the band's level from which the jazz bass plays its ff recordings (+4.1 dB). */
export const JAZZ_BASS_HARD_ABOVE = 1.6;
/** D512: the consort's spiccato and pizzicato sets' gains (measured against the arco: DECISIONS D512). */
export const CONSORT_STOP_GAIN = { violinSpicc: 3.5, violaSpicc: 2.47, celloSpicc: 2.93, violinPizz: 3.91, violaPizz: 1.75, celloPizz: 4.92 } as const;

export const SAMPLED: Record<SampledId, SampledInstrument> = {
  harpsichord: { set: "harpsichord", release: "harpsichordRel", plucked: true, gain: 1.8 },
  organ: { set: "pipeOrgan", low: "pipePedal", plucked: false, gain: 5 },
  // D292: the grand piano, struck (it dies away by itself, damped at the written end), one layer only
  // (12 of Salamander's 16, forte: its hammer and overtones carry on a phone's speaker; layer 7 is 5 dB
  // softer and duller). Its gain set by measurement: II/22 rendered offline through chip.ts, all four
  // voices, as loud as CLASSIC CHIP and the harpsichord (about -22 LUFS) with the patches' level 0.3.
  // D294: and layer 7 for the lighter notes (a Tureck-like clarity: the strong beats and the tops of
  // phrases struck firmer, the notes between lighter, as a pianist's touch varies), 2 dB under layer 12.
  // D309: the level is the piano's model's (phrasing.ts, practice.ts pianoLevels: ±4 dB from the score);
  // layer 7 for the notes it puts under -1.5 dB (practice.ts DYN.soft), brought up to layer 12's level
  // (measured: 3.0-5.0 dB under it, 4.1 dB on average over 0.5 s of A2-A5, C3, C4), so the layer is a
  // colour and the level the model's alone.
  // D339: its dampers by register (the top undamped) and its colour by the level struck: Salamander's layer 7
  // against layer 12 at C4, level matched, is 8.6 dB darker at 2-4 kHz and 14.6 at 4-8 kHz for about 4
  // dB of level (measured here): about 1.5 dB of brightness a dB, as a shelf, within -8..+5.
  piano: {
    set: "grand",
    plucked: true,
    gain: 3.8,
    layer: 12,
    soft: { set: "grandSoft", below: 0.8414, gain: 1.6 },
    damper: { low: 0.045, high: 0.016, undamped: 89, tail: 2.5, stacc: 0.16, crisp: 0.02, slur: 1.25 },
    velTone: { perDb: 1.5, hz: 1800, min: -8, max: 5 },
    // D405: recorded every minor third, so 1.5 semitones at most to the nearest and 2 to a trill's other neighbour (Play.altSample).
    maxShift: 3,
  },
  // D297: the period presets' instruments (PERIOD's sets); the winds and strings held on their made
  // loops, the harpsichords plucked. Gains set by measurement (II/22 and I/2 rendered offline through
  // chip.ts, each voice alone): the voices of a preset within about 1.5 dB of each other (R8).
  violin16: { set: "violin16", plucked: false, gain: 2.2 },
  flute16: { set: "flute16", plucked: false, gain: 2.2 },
  harpsi16: { set: "harpsi16", plucked: true, gain: 1.8 },
  strings16: { set: "strings16", plucked: false, gain: 2.2 },
  bassoon16: { set: "bassoon16", plucked: false, gain: 2.2 },
  // TRACKER's.
  violinMod: { set: "violinMod", plucked: false, gain: 2.2 },
  fluteMod: { set: "fluteMod", plucked: false, gain: 2.2 },
  harpsiMod: { set: "harpsiMod", plucked: true, gain: 1.8 },
  choirMod: { set: "choirMod", plucked: false, gain: 2.2 },
  bassMod: { set: "bassMod", plucked: true, gain: 2.2 },
  voiceS: { set: "voiceS", plucked: false, gain: 2.2 },
  voiceA: { set: "voiceA", plucked: false, gain: 2.2 },
  voiceT: { set: "voiceT", plucked: false, gain: 2.2 },
  voiceB: { set: "voiceB", plucked: false, gain: 2.2 },
  choirAah: { set: "choirAah", plucked: false, gain: 2.2 },
  // D302, PIPE ORGAN's recorded plenum and pedal (the pedal retuned up to B3, past its compass; the plenum above, as an organist takes a high bass on a manual).
  organPedal: { set: "pedalOrg", above: { set: "manualOrg", from: 60 }, plucked: false, gain: 5, speak: 0.02 },
  // D349, PIPE ORGAN's PLENUM: the same organ's recorded plenum on the manuals (a set of its own, so its plan and the pedal's never let go of each other's notes).
  organPleno: { set: "plenoOrg", plucked: false, gain: 5, speak: 0.02 },
  // D358: SUPER 16-BIT's continuo cello; STRING CONSORT's violin, viola and cello (D510: LUTE's strings withdrawn; the guitar's folder stays, the Lab's). Gains set by measurement (each voice alone, gated loudness).
  cello16: { set: "cello16", plucked: false, gain: 2.2 },
  consortViolin: { set: "consortViolin", plucked: false, gain: 2.2 },
  consortViola: { set: "consortViola", plucked: false, gain: 2.2 },
  consortCello: { set: "consortCello", plucked: false, gain: 2.2 },
  // D512, the consort's stops (consort-stops.ts): spiccato and pizzicato, the louder layer (v2), each dying away by itself
  // and damped at the written end; retuned 2-3 semitones at most (recorded every minor or major third), then an octave
  // nearer. Gains measured against the arco (DECISIONS D512: the same phrase, the voice alone, through the phone model too).
  consortViolinSpicc: { set: "consortViolinSpicc", plucked: true, gain: CONSORT_STOP_GAIN.violinSpicc, layer: 2, maxShift: 2 },
  consortViolaSpicc: { set: "consortViolaSpicc", plucked: true, gain: CONSORT_STOP_GAIN.violaSpicc, layer: 2, maxShift: 3 },
  consortCelloSpicc: { set: "consortCelloSpicc", plucked: true, gain: CONSORT_STOP_GAIN.celloSpicc, layer: 2, maxShift: 3 },
  consortViolinPizz: { set: "consortViolinPizz", plucked: true, gain: CONSORT_STOP_GAIN.violinPizz, layer: 2, maxShift: 2 },
  consortViolaPizz: { set: "consortViolaPizz", plucked: true, gain: CONSORT_STOP_GAIN.violaPizz, layer: 2, maxShift: 3 },
  consortCelloPizz: { set: "consortCelloPizz", plucked: true, gain: CONSORT_STOP_GAIN.celloPizz, layer: 2, maxShift: 3 },
  // TRIALS (instruments-trials). `maxShift` (D405) where a voice leaves the instrument's compass: past the
  // recordings by more, the note an octave nearer (the oboe under F#3, the clarinet under C3, the trumpet under
  // D#3 and over D6, the horn and the trombone 3 semitones past theirs; the bassoon's 7 notes, G2-C5: retuned
  // within them (at most 3.5 semitones), 5 under G2 to D2, the bass's rarer notes under D2 an octave up).
  trialOboe: { set: "trialOboe", plucked: false, gain: 2.2, maxShift: 4 },
  trialFlute: { set: "trialFlute", plucked: false, gain: 2.2, maxShift: 3 },
  trialClarinet: { set: "trialClarinet", plucked: false, gain: 2.2, maxShift: 2 },
  trialHorn: { set: "trialHorn", plucked: false, gain: 2.2, maxShift: 3 },
  trialBassoon: { set: "trialBassoon", plucked: false, gain: 2.2, maxShift: 5 },
  trialTrumpet: { set: "trialTrumpet", plucked: false, gain: 2.2, maxShift: 2 },
  trialTrombone: { set: "trialTrombone", plucked: false, gain: 2.2, maxShift: 3 },
  trialBassPizz: { set: "trialBassPizz", plucked: true, gain: 2.2, maxShift: 4 },
  // D504, ZELENKA TRIO: a lighter note (the phrasing's level under -1.5 dB, as the piano's soft layer) or the player's
  // soft side on the mezzoforte (oboe II: VSCO's soft) layer, its loudness evened with the loud one's when built and
  // brought 1.5 dB under it here, so the layer is the colour and the level the reading's; short notes their own.
  trioOboe1: { set: "trioOboe1", plucked: false, gain: 2.2, maxShift: 2, soft: { set: "trioOboe1Mf", below: TRIO_SOFT_BELOW, gain: TRIO_SOFT_GAIN }, short: { set: "trioOboe1Short", under: TRIO_SHORT_S } },
  trioOboe2: { set: "trialOboe", plucked: false, gain: 2.2, maxShift: 2, soft: { set: "trioOboe2Soft", below: TRIO_SOFT_BELOW, gain: TRIO_SOFT_GAIN }, short: { set: "trioOboe2Short", under: TRIO_SHORT_S } },
  trioBassoon: { set: "trioBassoon", plucked: false, gain: 2.2, maxShift: 2, soft: { set: "trioBassoonMf", below: TRIO_SOFT_BELOW, gain: TRIO_SOFT_GAIN }, short: { set: "trioBassoonShort", under: TRIO_SHORT_S } },
  // D502, BACH BRASS (every minor third: 1.5 semitones at most to the nearest). `maxShift` (D405) 3 past the compass,
  // then an octave nearer: the trumpet under C#3 and over E6, the horn under D2 and over G#5, the trombone under C#2 and
  // over D#5, the bass under G1 and over A#4 (the folds: test/d502-brass.test.ts).
  brassTrumpet: { set: "brassTrumpet", plucked: false, gain: 2.2, maxShift: 3, blend: { set: "brassTrumpetP" } },
  brassHorn: { set: "brassHorn", plucked: false, gain: 2.2, maxShift: 3, blend: { set: "brassHornP" } },
  brassTrombone: { set: "brassTrombone", plucked: false, gain: 2.2, maxShift: 3, blend: { set: "brassTromboneP" } },
  brassBass: { set: "brassBass", plucked: false, gain: 2.2, maxShift: 3, blend: { set: "brassBassP" } },
  // D503, JAZZ QUARTET: the vibraphone (pp, mf, ff: the mallet's hardness), struck, its pedal by the note's length,
  // a harder strike a little brighter too (velTone), retuned a whole tone at most (the pp and ff sets' every other
  // note); the double bass pizzicato (mf, ff), a bass line folded an octave in only where it leaves E1-G4 by more than 3.
  jazzVibes: { set: "jazzVibes", plucked: true, gain: 5.5, soft: { set: "jazzVibesSoft", below: 0.794, gain: 1 }, hard: { set: "jazzVibesHard", above: 1.26, gain: 1 }, pedal: { short: 0.22, shortTau: 0.03, tau: 0.11 }, velTone: { perDb: 0.6, hz: 2600, min: -3, max: 3 }, maxShift: 2 },
  // D510: the band's bass on its ff recordings only from +4 dB (Busoni's f with an accent), not +2: at +2 the line's notes
  // flipped between the two sets (every whole tone, each its own tuning and colour) on 24 of I/8's first 75 notes, 6 now.
  // D522, CHORINHO: the classical guitar (recorded every minor third or so, B1-A#5), plucked, its fingers' damping by the note's
  // length (a short note stopped at once, a longer one let ring a little into the next), retuned 3 semitones at most.
  choroGuitar: { set: "choroGuitar", plucked: true, gain: 2.2, pedal: { short: 0.2, shortTau: 0.04, tau: 0.09 }, velTone: { perDb: 0.5, hz: 2000, min: -2.5, max: 2.5 }, maxShift: 3 },
  jazzBass: { set: "jazzBass", plucked: true, gain: 2.2, hard: { set: "jazzBassHard", above: JAZZ_BASS_HARD_ABOVE, gain: 1 }, pedal: { short: 0.18, shortTau: 0.03, tau: 0.06 }, velTone: { perDb: 0.5, hz: 1100, min: -2.5, max: 2.5 }, maxShift: 3 },
  // D523, ABBEY ROAD (and D525, KRAUTROCK): the Gretsch (cleanGuitar/, every minor third E2-D6), the second electric
  // guitar (eguitar/, every minor third C#2-C6), the picked bass (rickBass/, every minor third E1-G3): plucked strings,
  // dying away by themselves, damped at the written end by the fretting hand (a short note at once, a longer one ringing
  // a little into the next: `pedal`), a firmer pluck a little brighter (velTone); retuned 2 semitones at most (the
  // nearest within a minor third: 1.5; the bass 3, its line over A#3 an octave down), then an octave nearer.
  rockGuitar: { set: "cleanGuitar", plucked: true, gain: 2.2, pedal: { short: 0.2, shortTau: 0.04, tau: 0.08 }, velTone: { perDb: 0.6, hz: 2200, min: -3, max: 3 }, maxShift: 2 },
  rockGuitar2: { set: "eguitar", plucked: true, gain: 2.2, pedal: { short: 0.2, shortTau: 0.04, tau: 0.08 }, velTone: { perDb: 0.6, hz: 2200, min: -3, max: 3 }, maxShift: 2 },
  rockBass: { set: "rickBass", plucked: true, gain: 2.2, pedal: { short: 0.18, shortTau: 0.03, tau: 0.06 }, velTone: { perDb: 0.5, hz: 1100, min: -2.5, max: 2.5 }, maxShift: 3 },
  // D521, BOSSA NOVA's nylon guitar (mf, and pp for the lighter notes and the soft side: the thumb's rounder stroke), plucked,
  // the left hand's damping by the note's length (a short note stopped by the finger lifting, a longer one ringing a little into
  // the next, as a guitarist lets a line sing), a firmer stroke a little brighter (velTone: the nail), retuned a tone at most.
  bossaGuitar: { set: "bossaGuitar", plucked: true, gain: 2.2, soft: { set: "bossaGuitarSoft", below: 0.794, gain: 1 }, pedal: { short: 0.2, shortTau: 0.04, tau: 0.1 }, velTone: { perDb: 0.6, hz: 2200, min: -3, max: 3 }, maxShift: 2 },
  // D524, PET SOUNDS: the string section held on its loop, retuned 3 semitones at most (recorded every major or minor third);
  // its bass is ABBEY ROAD's (rockBass: the same picked babyblue, D523's trims).
  petStrings: { set: "petStrings", plucked: false, gain: 2.2, maxShift: 3 },
};
/** D357: at most this far into a recorded pipe's speech (s). */
export const SPEAK_MAX = 0.12;
/** D357: where a new note enters its recording (s past the onset): its speech shortened to `speak` (SampledInstrument.speak). */
export const speakFrom = (inst: SampledInstrument, r: Loaded) => (inst.speak === undefined ? 0 : Math.max(0, Math.min(SPEAK_MAX, (r.speech ?? 0) - inst.speak)));

/** D297: the set a pitch of an instrument is played from (an organ's manual above its pedal). */
export const setFor = (inst: SampledInstrument, midi: number) => (inst.above && midi >= inst.above.from ? inst.above.set : inst.set);

/** D292: the layer each layered set plays (its files' suffix); D294: and the layer sets'. */
const LAYER = new Map([...Object.values(SAMPLED).filter((i) => i.layer).map((i) => [i.set, i.layer!] as const), ...Object.entries(LAYER_SET).map(([s, l]) => [s, l.layer] as const)]);
/** A note's file in its set: "Cs4.mp3", or with the layer played "Cs4-v12.mp3". */
export const fileOf = (set: string, m: number) => {
  // D523: the rock kit's piece by its MIDI number.
  if (set === ROCK_KIT_SET) return `${ROCK_KIT_FILES[m]}.mp3`;
  // D514: a drum kit's piece ("kick-2.mp3").
  const kit = KIT_VOICES[set as KitSet];
  if (kit) return `${kit[Math.floor((m - 24) / 2)]}-${(m - 24) % 2 ? 2 : 1}.mp3`;
  return `${nameOfMidi(m)}${LAYER.has(set) ? `-v${LAYER.get(set)}` : ""}.mp3`;
};

/** Sets recorded in stereo (the struck string's image); the rest are mono. */
const STEREO = new Set(["harpsichord", "grand", "grandSoft"]);

const PCS: Record<string, number> = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
const NAMES = Object.keys(PCS);

/** "Cs4" (the files' names; C4 is middle C, MIDI 60) to its MIDI number. */
export function midiOfName(n: string): number {
  const m = /^([A-G]s?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`not a note name: ${n}`);
  return 12 * (Number(m[2]) + 1) + PCS[m[1]];
}
export const nameOfMidi = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

const midisOf = new Map<string, number[]>();
/** The MIDI numbers recorded in a set, low to high. */
export function sampledMidis(set: string): number[] {
  const z = zoned.get(set);
  if (z) return z;
  return recordedMidis(set);
}
function recordedMidis(set: string): number[] {
  let list = midisOf.get(set);
  if (!list) midisOf.set(set, (list = (SAMPLE_MANIFEST[folderOf(set)]?.notes ?? []).map(midiOfName).sort((a, b) => a - b)));
  return list;
}
/**
 * D540, sparse zones (Slim.stride): while a slimmed preset plays, a set's recordings thinned to one every `stride` semitones
 * or more (from its lowest up), so its plan, its nearest recording and its folds all see only those (a chromatic set's every
 * third note: a third of its memory, each note retuned 1.5 semitones at most). Null: all of them again.
 */
const zoned = new Map<string, number[]>();
export function zonesOf(midis: readonly number[], stride: number): number[] {
  const out: number[] = [];
  for (const m of midis) if (!out.length || m - out[out.length - 1] >= stride) out.push(m);
  return out;
}
export function setZones(set: string, stride: number | null) {
  if (!stride || stride <= 1) zoned.delete(set);
  else zoned.set(set, zonesOf(recordedMidis(set), stride));
}
/** D540: sets held off while a slimmed preset plays (its one-layer rule, Slim.oneLayer): never loaded, their instrument's main set standing in. */
const heldOff = new Set<string>();
export function holdOff(sets: Iterable<string>) {
  heldOff.clear();
  for (const s of sets) heldOff.add(s);
}

/** The recording nearest a pitch (the lower of two equally near), among those `have` allows. */
export function nearestSample(set: string, midi: number, have: (m: number) => boolean = () => true): number | null {
  let best: number | null = null;
  for (const m of sampledMidis(set)) if (have(m) && (best === null || Math.abs(m - midi) < Math.abs(best - midi))) best = m;
  return best;
}

/**
 * D405: the pitch to play `midi` at on a set retuned at most `maxShift` semitones (SampledInstrument.maxShift):
 * itself where a recording is that near, else the nearest octave of it within the recordings' compass
 * widened by `maxShift` (a doubling or a layer above the top recording, a contra note under the lowest).
 */
export function foldInto(set: string, midi: number, maxShift: number): number {
  const ms = sampledMidis(set);
  if (!ms.length) return midi;
  const lo = ms[0] - maxShift;
  const hi = ms[ms.length - 1] + maxShift;
  let m = midi;
  while (m > hi && m - 12 >= lo) m -= 12;
  while (m < lo && m + 12 <= hi) m += 12;
  return m;
}

/**
 * D505: every recorded set's guard against the glassy read (the piano's D405 maxShift was the only one): a pitch
 * more than MAX_SHIFT_ANY semitones over the set's top recording is played an octave (or two) lower, never read
 * fast. Below the compass nothing changes where the instrument sets no maxShift (a slow read is dull, not a bell,
 * and folding a bass up would cross the voices: the scan's downward reads, D505, are the period sets' inner voices).
 */
export const MAX_SHIFT_ANY = 3;
export function foldDown(set: string, midi: number, maxShift = MAX_SHIFT_ANY): number {
  const ms = sampledMidis(set);
  if (!ms.length) return midi;
  let m = midi;
  while (m > ms[ms.length - 1] + maxShift && m - 12 >= ms[0] - maxShift) m -= 12;
  return m;
}
/** D505: the pitch a recorded instrument's note is read at: its own maxShift both ways (D405), else the upward guard (singers excepted: an alto's high note read a few semitones fast is not a bell, an octave down would break its line). */
export function guardedPitch(inst: SampledInstrument, set: string, midi: number, sung = false): number {
  if (inst.maxShift !== undefined) return foldInto(set, midi, inst.maxShift);
  return sung ? midi : foldDown(set, midi);
}

/** The pitch a recording actually sounds (Hz): its name at A = 440, corrected by what was measured. */
export function sampleHz(set: string, m: number): number {
  const cents = SAMPLED_NOTES[set]?.[nameOfMidi(m)]?.cents ?? 0;
  return 440 * 2 ** ((m - 69) / 12 + cents / 1200);
}

/**
 * The playback rate that makes recording `m` sound `targetHz`. The target comes from tuning.ts's hz(),
 * so every temperament and A = 415 apply to the recordings as to the synthesizer.
 */
export const rateFor = (set: string, m: number, targetHz: number) => targetHz / sampleHz(set, m);

/** A recording's length (s) and, for a looped one, its loop (s from the onset). */
export const noteInfo = (set: string, m: number) => SAMPLED_NOTES[set]?.[nameOfMidi(m)];

/**
 * The recordings a piece needs: for every pitch it uses, those nearest it and nearest the pitches up to
 * `pad` semitones either side (a bend, a glide, a wrong note asked for: D178).
 */
export function notesFor(set: string, pitches: Iterable<number>, pad = 2): number[] {
  const out = new Set<number>();
  for (const p of new Set(pitches)) {
    for (let d = -pad; d <= pad; d++) {
      const n = nearestSample(set, p + d);
      if (n !== null) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** What to load, set by set. */
/**
 * D540, the bands v2's memory policy (sound.ts V2_SLIM, Preset.slim): a set's recordings decoded at `rate` (Hz, by an
 * offline context of that rate: the browser's own resampler), folded to one channel, and a plucked instrument's cut at
 * `pluckedS` s with a 60 ms fade (PlanSlim.maxS). Decoded audio is Float32 at the context's rate whatever the file's:
 * a 32 kHz mono note holds a third of a 48 kHz stereo one.
 */
export interface Slim {
  rate: number;
  pluckedS?: number;
  /** Sparse zones: a recording every `stride` semitones at least (setZones). */
  stride?: number;
  /** One dynamic layer: the instruments' soft, hard, short and blend sets held off (holdOff). */
  oneLayer?: boolean;
}
/** D540: one set's slimming in a plan (Slim, for one instrument: maxS only where it is plucked). */
export interface PlanSlim {
  rate: number;
  maxS?: number;
}
export type Plan = { set: string; notes: number[]; slim?: PlanSlim }[];

/**
 * The plan for an instrument: every voice's pitches (`pitches`), and the player's own (`lead`) also an
 * octave either side, for ORGANO PLENO's doubling (D181); the harpsichord's key-up noises for the same
 * notes; the organ's pedal for the octave below the player's lowest notes.
 */
export function planFor(inst: SampledInstrument, pitches: Iterable<number>, lead: Iterable<number> = []): Plan {
  const all = [...pitches];
  const own = [...lead];
  const wanted = [...all, ...own.flatMap((m) => [m - 12, m + 12])];
  // D297: an organ's manual for the pitches above its pedal's compass.
  const above = inst.above;
  const notes = notesFor(inst.set, above ? wanted.filter((m) => m < above.from) : wanted);
  const plan: Plan = [{ set: inst.set, notes }];
  if (above) plan.push({ set: above.set, notes: notesFor(above.set, wanted.filter((m) => m >= above.from)) });
  // D503: a layer's own notes (the jazz sets' pp and ff every whole tone; the grand's layers the same keys).
  if (inst.soft) plan.push({ set: inst.soft.set, notes: inst.soft.set === "grandSoft" ? notes : notesFor(inst.soft.set, wanted) });
  if (inst.hard) plan.push({ set: inst.hard.set, notes: notesFor(inst.hard.set, wanted) });
  // D504: the short notes' own recordings, for the same pitches.
  if (inst.short) plan.push({ set: inst.short.set, notes: notesFor(inst.short.set, wanted) });
  // D502: the second dynamic layer, the same pitches (SampledInstrument.blend).
  if (inst.blend) plan.push({ set: inst.blend.set, notes });
  if (inst.release) plan.push({ set: inst.release, notes: notes.filter((m) => sampledMidis(inst.release!).includes(m)) });
  if (inst.low) {
    const lows = sampledMidis(inst.low);
    const below = own.map((m) => m - 12).filter((m) => m >= lows[0] - 2 && m <= lows[lows.length - 1] + 2);
    if (below.length) plan.push({ set: inst.low, notes: notesFor(inst.low, below) });
  }
  return plan;
}

/** Bytes the plan's recordings take once decoded (Float32 at the context's rate), stereo where recorded so unless `mono`. */
export function decodedBytes(plan: Plan, sampleRate = 48000, mono = false): number {
  let total = 0;
  for (const { set, notes, slim } of plan) {
    // D540: a slimmed set one channel at its own rate, a plucked one's notes no longer than maxS.
    const sl = slim && !PERIOD[set] ? slim : null;
    const ch = STEREO.has(set) && !mono && !sl ? 2 : 1;
    // D297: a period set's notes kept at half the rate.
    const rate = sl ? sl.rate : PERIOD[set] ? sampleRate * BAKE_RATE : sampleRate;
    for (const m of notes) total += Math.ceil(Math.min(noteInfo(set, m)?.len ?? 0, sl?.maxS ?? Infinity) * rate) * ch * 4;
  }
  return total;
}

/** How much decoded audio a page may hold (bytes): a phone (research: an iPhone's page is killed past roughly 1-1.5 GB in all), a computer. */
export const BUDGET = { phone: 96e6, computer: 320e6 };

/** Keep the stereo recordings in stereo when the plan fits the budget, else fold them to mono. */
export const monoFor = (plan: Plan, sampleRate: number, budget: number) => decodedBytes(plan, sampleRate) > budget;

/**
 * Where the recording begins in a decoded buffer (s): the first sample above 1% of the opening's peak,
 * less a millisecond. Measured, not assumed: decoders differ in whether they remove the MP3 encoder's
 * delay (LAME: 1105 samples), so the same file can begin 0 or 25 ms in.
 */
export function onsetOf(data: Float32Array, sampleRate: number): number {
  const n = Math.min(data.length, Math.floor(sampleRate * 0.5));
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
  const at = peak * 0.01;
  for (let i = 0; i < n; i++) if (Math.abs(data[i]) > at) return Math.max(0, i / sampleRate - 0.001);
  return 0;
}

/**
 * D357: how long a recording takes to speak (s from its onset): the first 10 ms window whose RMS
 * reaches half (-6 dB) of the steady level (0.6-1.6 s past the onset, or what the file has). The VCSL
 * organ's pipes take 20-120 ms (measured: the pedal 55-120, the plenum 20-100).
 */
export function speechOf(data: Float32Array, sampleRate: number, onset: number): number {
  const o = Math.floor(onset * sampleRate);
  const a = Math.min(data.length, o + Math.floor(0.6 * sampleRate));
  const b = Math.min(data.length, o + Math.floor(1.6 * sampleRate));
  if (b - a < sampleRate * 0.1) return 0;
  let e = 0;
  for (let i = a; i < b; i++) e += data[i] * data[i];
  const half = Math.sqrt(e / (b - a)) * 0.5;
  const w = Math.floor(0.01 * sampleRate);
  const step = Math.max(1, Math.floor(w / 2));
  for (let i = o; i + w <= Math.min(data.length, o + sampleRate); i += step) {
    let r = 0;
    for (let j = i; j < i + w; j++) r += data[j] * data[j];
    if (Math.sqrt(r / w) >= half) return (i - o) / sampleRate;
  }
  return 0;
}

/** D297: a biquad (RBJ's cookbook: "lowpass" or "highpass" at f Hz, quality q) run over x in place. */
function biquad(x: Float32Array, type: "lowpass" | "highpass", f: number, q: number, sr: number) {
  const w = (2 * Math.PI * Math.min(f, sr * 0.49)) / sr;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const b1 = (type === "lowpass" ? 1 - cos : -(1 + cos)) / a0;
  const b0 = Math.abs(b1) / 2;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i];
    const y0 = b0 * x0 + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    x[i] = y0;
  }
}
/** x read at a fractional index (linear interpolation, clamped at the ends). */
const lerpAt = (x: Float32Array, p: number) => {
  const i = Math.min(x.length - 1, Math.max(0, Math.floor(p)));
  const j = Math.min(x.length - 1, i + 1);
  return x[i] + (x[j] - x[i]) * (p - i);
};

/**
 * D297: a decoded recording made over as a console held it (PERIOD, which says how): its channels
 * folded to one, band-limited and resampled to `rate` and back, softened (the Gaussian's stand-in),
 * high-passed at 120 Hz, quantised to `bits` against its peak, and (`loop`) the end of its made loop
 * crossfaded into the stretch before the loop's start, so the loop joins without a click.
 */
export function bake(chans: Float32Array[], sr0: number, b: Bake): Float32Array {
  const n0 = chans[0]?.length ?? 0;
  const x0 = new Float32Array(n0);
  for (const c of chans) for (let i = 0; i < n0; i++) x0[i] += c[i] / chans.length;
  // Band-limited for the lower rate (a 4-pole Butterworth lowpass at 0.45 of it), then resampled to
  // it and read back by linear interpolation (the images softened, not removed) at half the decoded
  // rate (BAKE_RATE: nothing is left above a quarter of it, and the note takes half the memory).
  biquad(x0, "lowpass", 0.45 * b.rate, 0.5412, sr0);
  biquad(x0, "lowpass", 0.45 * b.rate, 1.3066, sr0);
  const step = sr0 / b.rate;
  const low = new Float32Array(Math.max(1, Math.floor((n0 - 1) / step) + 1));
  for (let j = 0; j < low.length; j++) low[j] = lerpAt(x0, j * step);
  const sr = sr0 * BAKE_RATE;
  const n = Math.max(1, Math.ceil(n0 * BAKE_RATE));
  const x = new Float32Array(n);
  if (b.hold) for (let i = 0; i < n; i++) x[i] = low[Math.min(low.length - 1, Math.floor((i * b.rate) / sr))];
  else for (let i = 0; i < n; i++) x[i] = lerpAt(low, (i * b.rate) / sr);
  // The Gaussian interpolation's dulling (2 poles, Q 0.5; not on a tracker's held samples), and the 120 Hz floor.
  if (!b.hold) biquad(x, "lowpass", b.lp, 0.5, sr);
  biquad(x, "highpass", b.floor ?? 120, 0.7071, sr);
  // The grain: so many bits against the note's peak (no dither, as the hardware).
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(x[i]));
  if (peak > 0) {
    const q = peak / 2 ** (b.bits - 1);
    for (let i = 0; i < n; i++) x[i] = Math.round(x[i] / q) * q;
  }
  if (b.loop && !b.chain) {
    // (D313: not a chained set's: its file is one take after another, played through, never looped here.)
    // The made loop (WIND_LOOP or its own, from the onset): its last 0.25 s (a third of a short loop) faded into the same before its start
    // (equal power), so that playing on from its start sounds what the end had become.
    const on = onsetOf(x, sr);
    const [a, z] = loopOf(b);
    const l0 = Math.round((on + a) * sr);
    const l1 = Math.round((on + z) * sr);
    // (A third of a short loop at most.)
    const xf = Math.round(Math.min(0.25, (z - a) / 3) * sr);
    if (l0 - xf >= 0 && l1 <= n) {
      for (let k = 0; k < xf; k++) {
        const w = (k / xf) * (Math.PI / 2);
        x[l1 - xf + k] = x[l1 - xf + k] * Math.cos(w) + x[l0 - xf + k] * Math.sin(w);
      }
    }
  }
  return x;
}

// ---- Loading (the browser only).

export interface Loaded {
  buffer: AudioBuffer;
  /** Where the recording begins (s). */
  onset: number;
  /** D357: how long the recorded pipe takes to speak (s from the onset to half its steady level: speechOf). */
  speech?: number;
}
const banks = new Map<string, Map<number, Loaded>>();
const inFlight = new Map<string, Promise<void>>();
/** Notes whose file could not be had: not asked again for a while. */
const failedAt = new Map<string, number>();
/** Sets folded to mono on this device (decided once, at the first plan over budget). */
const monoSets = new Set<string>();
/** Each set's base that answered (the page's own folder, or the website). */
const baseOf = new Map<string, string>();
/** Sets that could not be had from anywhere (three notes failed, none came): synthesized (as P13). */
const unreachable = new Set<string>();
const failures = new Map<string, number>();
/** D540: each set's slimming now (PlanSlim's key; "" none), and its generation (a decode finishing after a release, or after the slimming changed, is dropped). */
const slimKey = new Map<string, string>();
const slimNow = new Map<string, PlanSlim>();
const generation = new Map<string, number>();
const keyOfSlim = (s?: PlanSlim) => (s ? `${s.rate}/${s.maxS ?? ""}` : "");
/** D540: the decoded audio held now (bytes): every set's loaded recordings (the budget's resident figure). */
export function residentBytes(): number {
  let total = 0;
  for (const bank of banks.values()) for (const r of bank.values()) total += r.buffer.length * r.buffer.numberOfChannels * 4;
  return total;
}

/** The decoded recording of a note, if it is ready. */
export const loaded = (set: string, m: number): Loaded | undefined => banks.get(set)?.get(m);
export const setUnreachable = (set: string) => unreachable.has(set);

/** Every decoded recording of a set, for picking the nearest one ready. */
export const loadedMidis = (set: string): number[] => [...(banks.get(set)?.keys() ?? [])];

let decoding = 0;
const queue: (() => void)[] = [];
/** At most four decodes at once (iOS decodes slowly, and each decode holds its whole file twice). */
async function slot<T>(f: () => Promise<T>): Promise<T> {
  if (decoding >= 4) await new Promise<void>((r) => queue.push(r));
  decoding++;
  try {
    return await f();
  } finally {
    decoding--;
    queue.shift()?.();
  }
}

/** A note's file: from the browser's cache, else the page's own folder, else the website (P13). */
async function fileBytes(set: string, m: number): Promise<ArrayBuffer | null> {
  const file = fileOf(set, m);
  // The file's length versions the URL: a re-made recording is fetched anew, past the site's own cache.
  const v = SAMPLE_MANIFEST[folderOf(set)]?.pack[file]?.[1] ?? 0;
  const here = typeof document !== "undefined" ? document.baseURI : SITE;
  const bases = [...new Set([baseOf.get(set), here, SITE].filter((b): b is string => !!b))];
  let cache: Cache | null = null;
  try {
    cache = typeof caches !== "undefined" ? await caches.open("wtg-samples-v1") : null;
  } catch {
    cache = null; // a private window, or no Cache Storage
  }
  for (const base of bases) {
    const url = new URL(`samples/${folderOf(set)}/${file}?v=${v}`, base).href;
    try {
      const hit = cache ? await cache.match(url) : undefined;
      if (hit) return (baseOf.set(set, base), await hit.arrayBuffer());
    } catch {
      /* the cache refused: fetch it */
    }
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) continue;
    const bytes = await res.arrayBuffer();
    // A page that serves its own index for a missing file (some hosts) is not a recording.
    if (bytes.byteLength < 256 || /^\s*</.test(new TextDecoder().decode(bytes.slice(0, 16)))) continue;
    baseOf.set(set, base);
    if (cache) cache.put(url, new Response(bytes.slice(0), { headers: { "content-type": "audio/mpeg" } })).catch(() => {});
    return bytes;
  }
  return null;
}

/** An AudioBuffer folded to one channel (half the memory). */
function toMono(ctx: BaseAudioContext, b: AudioBuffer): AudioBuffer {
  if (b.numberOfChannels === 1) return b;
  const out = ctx.createBuffer(1, b.length, b.sampleRate);
  const d = out.getChannelData(0);
  const l = b.getChannelData(0);
  const r = b.getChannelData(1);
  let pl = 0;
  let pm = 0;
  for (let i = 0; i < d.length; i++) {
    d[i] = 0.5 * (l[i] + r[i]);
    pl += l[i] * l[i] + r[i] * r[i];
    pm += d[i] * d[i];
  }
  // D421: the fold keeps the recording's power. A spaced pair (the Salamander grand's channels correlate
  // about 0.15) averaged to one channel lost 3-4 dB on a phone (the budget's fold, monoFor): the piano was
  // the quietest sound there. Scaled back to the channels' mean power (at most +6 dB).
  const k = pm > 0 ? Math.min(2, Math.sqrt(pl / 2 / pm)) : 1;
  if (k !== 1) for (let i = 0; i < d.length; i++) d[i] *= k;
  return out;
}

/** D540: offline contexts by rate, to decode a slimmed set at its own rate (null where there is none: decoded, then resampled here). */
const decoders = new Map<number, BaseAudioContext | null>();
function decoderAt(rate: number): BaseAudioContext | null {
  if (!decoders.has(rate)) {
    let c: BaseAudioContext | null = null;
    try {
      c = typeof OfflineAudioContext !== "undefined" ? new OfflineAudioContext(1, 1, rate) : null;
    } catch {
      c = null;
    }
    decoders.set(rate, c);
  }
  return decoders.get(rate) ?? null;
}
/**
 * D540: a decoded recording slimmed (Slim): one channel (its power kept, as toMono), at `rate` (linear interpolation where
 * the browser did not decode it there), no longer than `maxS` with a 60 ms fade at its end.
 */
export function slimData(chans: Float32Array[], sr: number, slim: PlanSlim): Float32Array {
  const n0 = chans[0].length;
  let mono: Float32Array;
  if (chans.length === 1) mono = chans[0];
  else {
    mono = new Float32Array(n0);
    let pl = 0;
    let pm = 0;
    for (let i = 0; i < n0; i++) {
      let x = 0;
      for (const c of chans) (x += c[i]), (pl += c[i] * c[i]);
      x /= chans.length;
      mono[i] = x;
      pm += x * x;
    }
    // The channels' mean power kept (as toMono), and 3 dB more: a mono note through its seat's StereoPannerNode at the
    // middle leaves at cos(π/4) a side where the stereo recording passed whole (measured: the slimmed harpsichord 3.2 LU
    // under its stereo self on II/2's opening, level with it so).
    const k = pm > 0 ? Math.min(2, Math.sqrt(pl / chans.length / pm)) * Math.SQRT2 : 1;
    if (k !== 1) for (let i = 0; i < n0; i++) mono[i] *= k;
  }
  const ratio = sr / slim.rate;
  const n1 = Math.floor(n0 / ratio);
  const keep = Math.min(n1, slim.maxS ? Math.floor(slim.maxS * slim.rate) : n1);
  const out = new Float32Array(keep);
  if (ratio === 1) out.set(mono.subarray(0, keep));
  else
    for (let i = 0; i < keep; i++) {
      const x = i * ratio;
      const j = Math.floor(x);
      const f = x - j;
      out[i] = (mono[j] ?? 0) * (1 - f) + (mono[j + 1] ?? 0) * f;
    }
  if (keep < n1) {
    const fade = Math.min(keep, Math.floor(0.06 * slim.rate));
    for (let i = 0; i < fade; i++) out[keep - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fade);
  }
  return out;
}

/** D297: a decoded recording made over for a period set (`bake`), one channel at half its rate; the decoded one let go. */
function baked(ctx: BaseAudioContext, b: AudioBuffer, spec: Bake): AudioBuffer {
  const chans = Array.from({ length: b.numberOfChannels }, (_, c) => b.getChannelData(c));
  const data = bake(chans, b.sampleRate, spec);
  const out = ctx.createBuffer(1, data.length, b.sampleRate * BAKE_RATE);
  out.getChannelData(0).set(data);
  return out;
}

function loadNote(ctx: BaseAudioContext, set: string, m: number): Promise<void> {
  const key = `${set}:${m}`;
  const busy = inFlight.get(key);
  if (busy) return busy;
  if (banks.get(set)?.has(m) || unreachable.has(set) || heldOff.has(set)) return Promise.resolve();
  if (Date.now() - (failedAt.get(key) ?? -Infinity) < 20000) return Promise.resolve();
  const gen = generation.get(set) ?? 0;
  const p = (async () => {
    const bytes = await fileBytes(set, m);
    if (!bytes) {
      failedAt.set(key, Date.now());
      failures.set(set, (failures.get(set) ?? 0) + 1);
      // Nothing answered for this set: the page has no route to the recordings.
      if ((failures.get(set) ?? 0) >= 3 && !banks.get(set)?.size && !baseOf.has(set)) unreachable.add(set);
      return;
    }
    const period = PERIOD[set];
    const slim = period ? undefined : slimNow.get(set);
    const decoder = slim ? (decoderAt(slim.rate) ?? ctx) : ctx;
    const decoded = await slot(() => decoder.decodeAudioData(bytes));
    // D540: released (or its slimming changed) while it was fetched and decoded: not kept.
    if ((generation.get(set) ?? 0) !== gen) return;
    let buffer: AudioBuffer;
    if (period) buffer = baked(ctx, decoded, period);
    else if (slim) {
      const data = slimData(Array.from({ length: decoded.numberOfChannels }, (_, c) => decoded.getChannelData(c)), decoded.sampleRate, slim);
      buffer = ctx.createBuffer(1, Math.max(1, data.length), slim.rate);
      buffer.getChannelData(0).set(data);
    } else buffer = monoSets.has(set) ? toMono(ctx, decoded) : decoded;
    let bank = banks.get(set);
    if (!bank) banks.set(set, (bank = new Map()));
    const onset = onsetOf(buffer.getChannelData(0), buffer.sampleRate);
    bank.set(m, { buffer, onset, speech: speechOf(buffer.getChannelData(0), buffer.sampleRate, onset) });
  })()
    .catch(() => void failedAt.set(key, Date.now()))
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

/**
 * Load a plan's recordings, and let go of the ones it no longer needs (a sounding note keeps its own
 * buffer until it ends). Over the budget, the stereo sets are folded to mono as they are decoded.
 */
export function loadPlan(ctx: BaseAudioContext, plan: Plan, phone: boolean): Promise<void> {
  if (monoFor(plan, ctx.sampleRate, phone ? BUDGET.phone : BUDGET.computer)) for (const { set } of plan) if (STEREO.has(set)) monoSets.add(set);
  for (const { set, notes, slim } of plan) {
    slimFor(set, slim);
    const bank = banks.get(set);
    if (bank) for (const m of [...bank.keys()]) if (!notes.includes(m)) bank.delete(m);
    // D540: a set let go entirely: the decodes still on their way are dropped when they land.
    if (!notes.length) generation.set(set, (generation.get(set) ?? 0) + 1);
  }
  return Promise.all(plan.flatMap(({ set, notes }) => notes.map((m) => loadNote(ctx, set, m)))).then(() => {});
}

/**
 * D497, THE SOUND LAB: a plan's recordings asked for and awaited, nothing let go (its A/B keeps two sounds ready; the
 * game's own loading is loadPlan above). Folded to mono over the budget as loadPlan folds them.
 */
export function loadPlanKeep(ctx: BaseAudioContext, plan: Plan, phone: boolean): Promise<void> {
  if (monoFor(plan, ctx.sampleRate, phone ? BUDGET.phone : BUDGET.computer)) for (const { set } of plan) if (STEREO.has(set)) monoSets.add(set);
  for (const { set, notes, slim } of plan) if (notes.length) slimFor(set, slim);
  return Promise.all(plan.flatMap(({ set, notes }) => notes.map((m) => loadNote(ctx, set, m)))).then(() => {});
}

/** D540: a set's slimming as a plan asks (a change lets its recordings go, to be decoded again the new way). */
function slimFor(set: string, slim: PlanSlim | undefined) {
  const k = keyOfSlim(slim);
  if ((slimKey.get(set) ?? "") === k) return;
  slimKey.set(set, k);
  if (slim) slimNow.set(set, slim);
  else slimNow.delete(set);
  banks.get(set)?.clear();
  generation.set(set, (generation.get(set) ?? 0) + 1);
}

/** Ask for one note's recording (a note played before the plan reached it). */
export const loadOne = (ctx: BaseAudioContext, set: string, m: number) => void loadNote(ctx, set, m);
