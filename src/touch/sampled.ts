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

/**
 * D292: the Salamander Grand's notes (public/samples/grand: every minor third A1-C7, two velocity layers;
 * the game plays layer 12): each 7.03 s as trimmed, the highest shorter (measured with ffprobe); taken
 * as in tune (the set was tuned when recorded; the game retunes every note by its rate anyway).
 */
const GRAND_SHORT: Record<string, number> = { A6: 6.766, C6: 6.296, C7: 4.519, Ds6: 6.87, Fs6: 6.165 };
const GRAND_NOTES = Object.fromEntries((SAMPLE_MANIFEST.grand?.notes ?? []).map((n) => [n, { cents: 0, len: GRAND_SHORT[n] ?? 7.027 }]));

/**
 * D297, the period presets' recordings (sound.ts SUPER 16-BIT, NOCTURNE 32-BIT): a set of its own per
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
}
/** D297: TRACKER's short loops (s from the onset): half a second, as a MOD's samples looped a short stretch. */
export const TRACKER_LOOP: [number, number] = [1.0, 1.5];
/** D313: where SOLO VOICES' passages are taken from (s from the onset: build_sustain.py's files are steady from 0.2 s to 3.15 s). */
export const VOICE_CHAIN: [number, number] = [0.45, 3.0];
/** D358: the cello's made loop (s from the onset): its recordings are 2.3-4.2 s, steady from about 0.5 s to 2.2 s (measured). */
export const CELLO_LOOP: [number, number] = [0.8, 2.0];
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
  // NOCTURNE 32-BIT (§6.2: 22.05 kHz; violin and oboe LP 8 kHz, harpsichord 8.8 kHz, viola 7 kHz, organ 6 kHz; 13 bits).
  violin32: { folder: "violin", rate: 22050, lp: 8000, bits: 13, loop: true },
  oboe32: { folder: "oboe", rate: 22050, lp: 8000, bits: 13, loop: true },
  harpsi32: { folder: "harpsichord", rate: 22050, lp: 8800, bits: 13 },
  harpsiRel32: { folder: "harpsichordRel", rate: 22050, lp: 8800, bits: 13 },
  viola32: { folder: "violaSus", rate: 22050, lp: 7000, bits: 13, loop: true },
  pedal32: { folder: "pipePedal", rate: 22050, lp: 6000, bits: 13 },
  manual32: { folder: "pipeOrgan", rate: 22050, lp: 6000, bits: 13 },
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
  // D358, LUTE: the classical guitar's gut-like nylon (Freesound 11573), plucked, as recorded.
  luteGuitar: { folder: "guitar", rate: 32000, lp: 11000, bits: 16 },
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
};
/**
 * D297: a period set's notes are kept at this share of the decoded rate (22.05 or 24 kHz, a rate every
 * browser's createBuffer takes): what the bake leaves is all under 10 kHz.
 */
export const BAKE_RATE = 0.5;
/** D297: the made loop of the loopless recordings (s from the onset): within the steady stretch (all hold 1-4 s, measured). */
export const WIND_LOOP: [number, number] = [1.4, 3.6];
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
  choirAahs: { B3: -12.4, B4: -0.3, D4: -20.2, D5: -25.3, F3: -25.7, F4: -11.9, F5: -4.4, Gs3: -32.1, Gs4: 6.8 },
};
/** D297: the recordings shorter than 4.545 s (s, measured). */
const SHORT: Record<string, Record<string, number>> = {
  // D358: the cello's recordings (s, measured).
  cello: { A2: 4.122, A3: 3.02, A4: 2.485, As2: 3.805, As3: 2.756, B2: 3.463, B3: 3.434, B4: 2.631, C2: 3.847, C3: 3.126, C4: 3.308, C5: 3.359, Cs3: 3.175, Cs4: 2.735, D2: 4.226, D3: 3.364, D4: 2.711, Ds2: 3.41, Ds3: 2.68, Ds4: 2.939, E2: 3.441, E3: 2.944, E4: 2.748, F2: 3.941, F3: 2.944, F4: 2.935, Fs3: 2.622, Fs4: 2.494, G2: 3.856, G3: 2.913, G4: 2.531, Gs2: 3.596, Gs3: 2.336, Gs4: 2.532 },
  // TRIALS (s, measured).
  sackbut: { As1: 4.827, As2: 5, As3: 5, C3: 5, C4: 5, Cs2: 5, Cs4: 5, D3: 5, D4: 5, Ds2: 5, Ds3: 5, Ds4: 5, F2: 5, F3: 5, F4: 5, Gs2: 5, Gs3: 5 },
  bassPizz: { A2: 2, As1: 1.794, B3: 2, C2: 1.382, Cs3: 2, D2: 2, E1: 2, E2: 1.573, E3: 2, Fs2: 2, G1: 0.9, Gs2: 2, Gs3: 1.919 },
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
const SAMPLED_NOTES: Record<string, Record<string, { cents: number; len: number; loop?: [number, number] }>> = { ...HARPSI_ORGAN, grand: GRAND_NOTES, grandSoft: GRAND_NOTES, ...PERIOD_NOTES };

/**
 * D294: a set that is another folder's velocity layer (its files "C4-v7.mp3" beside the layer played):
 * the grand's softer layer 7 as "grandSoft". Its own bank, plan and mono fold; the folder's manifest.
 */
const LAYER_SET: Record<string, { folder: string; layer: number }> = { grandSoft: { folder: "grand", layer: 7 } };
/** The folder of public/samples a set's files are in (D297: a period set's, its folder's). */
export const folderOf = (set: string) => LAYER_SET[set]?.folder ?? PERIOD[set]?.folder ?? set;

export type SampledId = "harpsichord" | "organ" | "piano" | "violin16" | "flute16" | "harpsi16" | "strings16" | "bassoon16" | "violin32" | "oboe32" | "harpsi32" | "viola32" | "organ32" | "violinMod" | "fluteMod" | "harpsiMod" | "choirMod" | "bassMod" | "voiceS" | "voiceA" | "voiceT" | "voiceB" | "choirAah" | "organPedal" | "organPleno" | "cello16" | "consortViolin" | "consortViola" | "consortCello" | "luteGuitar" | "trialOboe" | "trialFlute" | "trialClarinet" | "trialHorn" | "trialBassoon" | "trialTrumpet" | "trialTrombone" | "trialBassPizz";

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
   * D405: at most this many semitones between a note and the recording it is played from. A struck string
   * read much faster than it was recorded turns glassy (a glockenspiel), much slower muddy; a pitch past
   * the recordings' compass by more is played an octave nearer it (`foldInto`), never stretched.
   */
  maxShift?: number;
}

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
  violin32: { set: "violin32", plucked: false, gain: 2.2 },
  oboe32: { set: "oboe32", plucked: false, gain: 2.2 },
  // The key-up noise 12 dB under the note (§6.2).
  harpsi32: { set: "harpsi32", release: "harpsiRel32", relGain: 0.23, plucked: true, gain: 1.8 },
  viola32: { set: "viola32", plucked: false, gain: 2.2 },
  // The organ's pedal up to F#3 (its compass), the manual above (§6.2).
  organ32: { set: "pedal32", above: { set: "manual32", from: 55 }, plucked: false, gain: 2.5 },
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
  // D358: SUPER 16-BIT's continuo cello; STRING CONSORT's violin, viola and cello; LUTE's strings. Gains set by measurement (each voice alone, gated loudness).
  cello16: { set: "cello16", plucked: false, gain: 2.2 },
  consortViolin: { set: "consortViolin", plucked: false, gain: 2.2 },
  consortViola: { set: "consortViola", plucked: false, gain: 2.2 },
  consortCello: { set: "consortCello", plucked: false, gain: 2.2 },
  luteGuitar: { set: "luteGuitar", plucked: true, gain: 2.2 },
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
export const fileOf = (set: string, m: number) => `${nameOfMidi(m)}${LAYER.has(set) ? `-v${LAYER.get(set)}` : ""}.mp3`;

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
  let list = midisOf.get(set);
  if (!list) midisOf.set(set, (list = (SAMPLE_MANIFEST[folderOf(set)]?.notes ?? []).map(midiOfName).sort((a, b) => a - b)));
  return list;
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
export type Plan = { set: string; notes: number[] }[];

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
  if (inst.soft) plan.push({ set: inst.soft.set, notes });
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
  for (const { set, notes } of plan) {
    const ch = STEREO.has(set) && !mono ? 2 : 1;
    // D297: a period set's notes kept at half the rate.
    const rate = PERIOD[set] ? sampleRate * BAKE_RATE : sampleRate;
    for (const m of notes) total += Math.ceil((noteInfo(set, m)?.len ?? 0) * rate) * ch * 4;
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
  biquad(x, "highpass", 120, 0.7071, sr);
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
  if (banks.get(set)?.has(m) || unreachable.has(set)) return Promise.resolve();
  if (Date.now() - (failedAt.get(key) ?? -Infinity) < 20000) return Promise.resolve();
  const p = (async () => {
    const bytes = await fileBytes(set, m);
    if (!bytes) {
      failedAt.set(key, Date.now());
      failures.set(set, (failures.get(set) ?? 0) + 1);
      // Nothing answered for this set: the page has no route to the recordings.
      if ((failures.get(set) ?? 0) >= 3 && !banks.get(set)?.size && !baseOf.has(set)) unreachable.add(set);
      return;
    }
    const decoded = await slot(() => ctx.decodeAudioData(bytes));
    const period = PERIOD[set];
    const buffer = period ? baked(ctx, decoded, period) : monoSets.has(set) ? toMono(ctx, decoded) : decoded;
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
  for (const { set, notes } of plan) {
    const bank = banks.get(set);
    if (bank) for (const m of [...bank.keys()]) if (!notes.includes(m)) bank.delete(m);
  }
  return Promise.all(plan.flatMap(({ set, notes }) => notes.map((m) => loadNote(ctx, set, m)))).then(() => {});
}

/** Ask for one note's recording (a note played before the plan reached it). */
export const loadOne = (ctx: BaseAudioContext, set: string, m: number) => void loadNote(ctx, set, m);
