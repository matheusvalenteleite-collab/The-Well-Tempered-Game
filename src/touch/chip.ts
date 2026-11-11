/**
 * The 8-bit sound: pulse- and triangle-wave notes and a ticking metronome on Web Audio, scheduled on
 * the audio clock so the beat stays steady whatever the screen does.
 * D167, a little warmer: each note has an attack, a short fall to its sustain and a release; long notes
 * take a gentle vibrato after a moment; the player can bend a held note (engine.ts); the voices stand
 * apart left to right; a soft filter takes the edge off and a small room (a generated reverb) carries
 * them; the metronome is a quiet tick.
 */
export type Timbre = "pulse12" | "pulse25" | "pulse50" | "triangle";

import { hz } from "./tuning.ts";
import { consortNote, consortStop, hasConsortStops } from "./consort-stops.ts";
import { heldChange, isPedal, liveRegistration, onLiveRegistration, organPatchOf, registeredNote, terraceStops, LUTE_LP, type Registered, type Registration } from "./registration.ts";
import { bandRegistration, coloured, type Colour } from "./colour.ts";
import { BRIGHT_SPAN, breathGain, breathTone, breathVib, brassEdgeDb, brassMix, brassOf, BRASS_EDGE, BRASS_NEUTRAL, swellBrass, swellGain, formantAt, holdMode, landing, touchLevelDb, messaGain, pulseRms, pulseWave, touchKind, tremRate, vibDepth, wahAt, widthOf, BLOOM_CENTS, BLOOM_DEFAULT, BLOOM_MOVE, BLOOM_STILL, LUTE_TAU, TOUCH_NEUTRAL, TOUCH_TAU, VOWEL_CLOSED, WAH_Q, type HoldMode } from "./touch-expr.ts";
import { deskSeatFor, BACKING_HIGHPASS_HZ, chipMeter, BACKING_LEVEL, backingOn, bowEntry, chipVolume, dutyStep, DUTY_UP_DB, expressiveAll, registerAll, STEPPED_SOUNDS, swellToneDb, toneAll, toneLevelDb, TONE_DB_SPAN, VIB_F_CENTS, VIB_F_MIN_S, VOLUME_MID, giveWayFall, type GiveWay, CONSONANTS, PATCHES, grooveHits, grooveNow, harmonicsOf, type FxKind, isShaped, preset, patchFor, placeFor, sampledNow, pieceLayoutNow, pieceLevel, pieceLineUp, setPieceLayout, SHAPES, VOWELS, type Drum, type Kit, type Patch, type ShapedWave, type Wave } from "./sound.ts";
import { type Plan, type PlanSlim, holdOff, setZones, BOSSA_KIT_FILES, BOSSA_KIT_MIDIS, BOSSA_KIT_SET, BRUSH_FILES, BRUSH_MIDIS, BRUSH_SET, LATIN_FILES, LATIN_SET, latinMidis, ROCK_KIT_MIDIS, ROCK_KIT_RMS, ROCK_KIT_SET, rockKitMidi, KIT_VOICES, kitMidi, TIMP_MIDIS, TIMP_SET, fileOf, type KitSet, chainOf, folderOf, loaded, loadedMidis, loadOne, nearestSample, noteInfo, planFor, rateFor, SAMPLED, setFor, setUnreachable, speakFrom, MAX_SHIFT_ANY, type Loaded, type SampledInstrument, loadPlanStaged } from "./sampled.ts";
import { SmoothClock } from "./headphones.ts";
import { hasRoom, liveRoom, roomReverb, ROOMS, type RoomId } from "./room.ts";
import { brushBeat, type BrushSweep, type Fill } from "./jazz-drums.ts";
import { LOUD_FROM, latinBeat, latinPlan, type LatinBand, type LatinPiece, type LatinPlan } from "./latin-drums.ts";
import { brushDb, brushFills, keyFor, kitBeat, type DrumStyle, type KitHit, type KitPiece } from "./drum-presets.ts";
import { drumPiece, drumStyleFor, styleInfo } from "./drum-library.ts";
import { GRIDS, gridPieces, type KitVoice } from "./drum-grids.ts";
import { formOf } from "./fugue-form.ts";
import { formOf as rockFormOf, rockBeat, type KitPiece as RockPiece, type RockStyle } from "./rock-drums.ts";
import { bossaBeat, bossaPlan } from "./bossa-drums.ts";
import { petBeat, petPlan, type PetHit } from "./pet-drums.ts";
import { ALL_SCORE_STYLES, isScoreStyle, scoreBeat, scoreKitPieces, type ScoreStyle } from "./score-drums.ts";
import { tailorBrushes } from "./drum-tailor.ts";
import type { TouchFugue } from "./fugue.ts";
import { tempoOf } from "./tempi.ts";
import { emitMusic, setOutputLevel, type LiveKind } from "./music-events.ts";
import { stageMode } from "./stage-bg.ts";
import { CURVE_SOUND, SFX_SOUND, flowEnv, isFlow, modsAt, sfxKindsNow, sfxPlan, shotEnv, shotLen, swellEnv, swellSurge, tpsOf, type SfxKind } from "./world-sfx.ts";
import { buildChain, type BandChain } from "./band-fx.ts";

/** D357: the ROOM in force for a preset (room.ts), or null where the preset's reverb is its own. */
const roomOf = (presetId: string): RoomId | null => (hasRoom(presetId) ? liveRoom() : null);

/**
 * D208, the player's voice: the same instrument as the others, at the same level (the voices of a
 * fugue are equals); it only rings while the thumb is down, so a release is never cut short.
 */
/**
 * D631: the pitch a patch's note of written pitch `midi` is played at: the written pitch, on every patch (D405's and D505's
 * folds, D504's compass fold, withdrawn: the owner, "no note may sound in a different octave from the one written"). Chip.note,
 * voiceNote, a slide's target and the opening's plan read it; the audit (tools/touch/octaves) and test/d631 hold it.
 */
export function soundingPitch(_pt: Patch | null | undefined, midi: number): number {
  return midi;
}

export function leadOf(pt: Patch): Patch {
  // D349: an organ's pipe is the same pipe whoever plays it (one envelope, one release). D358: and any one instrument's (Patch.one).
  if (pt.pipe || pt.one) return pt;
  // D308: a struck sound (no sustain: the vibraphone's long ring) let go is damped within 0.1 s, as a held one is (LIFT_TAU).
  return pt.amp.s === 0 ? (pt.amp.r > 0.1 ? { ...pt, amp: { ...pt.amp, r: 0.1 } } : pt) : { ...pt, amp: { ...pt.amp, r: Math.max(0.12, pt.amp.r) } };
}

// ---- D358: one instrument (docs/playback/SOUND-PRINCIPLES.md). Additive: only patches with Patch.one or Patch.bow reach it. ----
/**
 * D358, a note of one instrument (Patch.one): placed by its key across the instrument (`span` about the
 * voice's place, from `lo` to `hi`: bass left, as the player sits), its key a fixed fraction of a cent from
 * true (`cents`: by key, whoever plays it), and a lute's course (`courses`: the second string in unison,
 * an octave string below `split`) where the registration has drawn no choirs. Pure.
 */
export function oneInstrument(midi: number, v: Voicing, one: NonNullable<Patch["one"]>, p: Play, plucked: boolean): [Voicing, Play] {
  let pan = v.pan;
  if (one.span) {
    const lo = one.lo ?? 21;
    const hi = one.hi ?? 108;
    const x = Math.max(0, Math.min(1, (midi - lo) / Math.max(1, hi - lo)));
    pan = Math.max(-1, Math.min(1, v.pan + (x - 0.5) * one.span));
  }
  let q = p;
  if (one.cents) {
    const h = Math.sin(midi * 78.233 + 1.618) * 43758.5453;
    q = { ...q, detune: (q.detune ?? 0) + ((h - Math.floor(h)) * 2 - 1) * one.cents };
  }
  if (one.courses && plucked && !q.choirs) q = { ...q, choirs: midi < one.courses.split ? { four: one.courses.octave } : { unison: one.courses.unison } };
  // D365: the instrument's own balance by register (`low`: below `from`, easing over `over` semitones to `db`):
  // a lute's bass courses lighter than a guitar's low strings, whoever plays them.
  if (one.low && midi < one.low.from) q = { ...q, level: (q.level ?? 1) * 10 ** ((one.low.db * Math.min(1, (one.low.from - midi) / one.low.over)) / 20) };
  return [{ ...v, pan }, q];
}
// ---- end D358 ----

/**
 * D211: a source stopped at `at`, never throwing. A note cut short after its end was scheduled is
 * stopped a second time; the spec allows it, but older WebKit (Safari, every browser on an iPhone) threw
 * InvalidStateError there, and a throw inside the scheduler broke off the notes after it in that frame.
 */
function halt(s: AudioScheduledSourceNode, at: number) {
  try {
    s.stop(at);
  } catch {
    /* already stopped */
  }
}

/**
 * D313: how far ahead (s, at a rate of 1) a recording has run after a syllable's pitch curve (sampledNote:
 * `from` cents, a straight line to `over` in `t1` s, then back to 0 with a time constant of 45 ms)
 * against running at its pitch: a scoop from below puts it behind, a glide from above ahead.
 */
export function scoopShift(from: number, over: number, t1: number): number {
  let x = 0;
  const dt = 0.001;
  for (let s = 0; s < t1 + 0.5; s += dt) {
    const c = s < t1 ? from + ((over - from) * s) / t1 : over * Math.exp(-(s - t1) / 0.045);
    x += (2 ** (c / 1200) - 1) * dt;
  }
  return x;
}

/** D210: a phone or tablet (a touch screen): fewer notes at once (`VOICE_CAP`). */
export const isPhone = () => typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

/**
 * D210: the most notes sounding at once; past it, the oldest (not the player's own) is let go, quickly,
 * as the new one starts. A computer's is far above what a fugue asks; a phone's above what a four-voice
 * fugue with its ornaments, the riders and the rings of plucked notes usually reach.
 */
export const VOICE_CAP = { phone: 32, computer: 64, phoneSustained: 18 };
/**
 * D313, SOLO VOICES' passages (chip.ts chainOn): crossfaded over `xf` s (its gains set at `points` + 1
 * points); the best of `tries` places drawn, each within the first `spread` s of the steady stretch, so it lasts at least
 * `least` s; at most `max` of them a note.
 */
export const CHAIN = { xf: 0.3, points: 10, tries: 6, spread: 0.8, least: 1.2, max: 16 };
/**
 * D249: on a phone, a sustained recorded sound (the organ: 10-16 nodes a note, every note held on its
 * loop) has the lower cap, and ORGANO PLENO's extra pipes count against it, one each.
 */
export const sustainedSampled = () => sampledNow().some((id) => !SAMPLED[id].plucked);

/** D249: the sampled organ's swell (dyn): bounded as the harpsichord's is, at most 1.4. */
export const organSwell = (level: number) => Math.max(0.05, Math.min(1.4, level));
/** D249: ORGANO PLENO's stack (the note, the 4' at 0.45, the pedal at 0.5) brought back to about one note's level. */
export const PLENO_SCALE = 1 / 1.4;
/** D249: the output's true ceiling: a tanh soft clip (oversampled 4x) the master chain ends in. */
export const CEILING = 0.95;
/**
 * D249: the ceiling's curve, over an input pre-scaled by a half: y = CEILING · tanh(2u / CEILING), so
 * unity gain near silence, full scale (u = 0.5) softened to about 0.74, and nothing past about 0.92.
 */
export function softClipCurve(n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = CEILING * Math.tanh((2 * ((i / (n - 1)) * 2 - 1)) / CEILING);
  return c;
}
/** D346: SOLO VOICES on a phone: about 1.7 dB lower into the limiter, and a 2.5 dB dip in the low mids. */
/** D505: the metronome's click (Chip.tick): noise through a broad band-pass, its loudness matched to the old pitched tick's by measurement. */
export const TICK = { hz: 1400, accentHz: 2000, q: 1.2, decay: 0.015, gain: 6 };
export const PHONE_VOICES = { sets: ["voiceS", "voiceA", "voiceT", "voiceB", "choirAah"], trim: 0.82, dipHz: 320, dipQ: 0.8, dipDb: -2.5 };
/** D249: the room's impulse, shorter on a phone (its convolver the costliest node there). */
export const ROOM_S = { phone: 0.8, computer: 1.3 };
/** D291: the phone bass a little louder still: a pulse low down is softer to the ear than one higher. */
export const PHONE_BASS_GAIN = 1.3;
/** D365 (D358's audit): CLASSIC CHIP's voices spread within ±0.35, and its triangle 3 dB lighter. */
export const CHIP_PAN = 0.35;
export const CHIP_TRIANGLE = 10 ** (-3 / 20);

/**
 * D297, SUPER 16-BIT's echo (the report §6.1, after the S-DSP's: EDL 5 = 80 ms, a positive EFB of 0.35,
 * the 8-tap FIR's usual lowpass stood in for by a 2.8 kHz lowpass and a 300 Hz high-pass in the loop).
 * Its return is 1: a voice's `send` is its echo's level (0.10-0.22: the first repeat 13-20 dB under it).
 * Not modelled: the right channel 8 ms later (a stereo nicety, R7), the 64 ms of fast fugues.
 * D302 (SUPER 16-BIT "lush", as the SNES's ensembles were: the owner rated it 4): longer and in stereo,
 * as the later soundtracks set it: 160 ms on the left, 240 ms on the right, each repeat fed to the
 * other side (0.4), through 3.2 kHz.
 */
export const SPC_ECHO = { delay: 0.16, right: 0.24, feedback: 0.4, lp: 3200, hp: 300 };
/** D302, MEGA FM's echo: short and dark (some of the console's soundtracks spent a channel on one). */
export const FM_ECHO = { delay: 0.12, right: 0.18, feedback: 0.22, lp: 3000, hp: 300 };
/** D302: the presets' echoes (Preset.fx "spc", "echo"): each side its own delay (s), the repeats crossing over. */
export const ECHOES: Record<"spc" | "echo", { delay: number; right: number; feedback: number; lp: number; hp: number }> = { spc: SPC_ECHO, echo: FM_ECHO };
/**
 * D297, the presets' own reverbs (Preset.fx): the sends pre-delayed (`predelay` s, onsets stay clean)
 * and high-passed (`hp` Hz: no bass in the tail), a generated impulse (`darkHall`: decaying to -60 dB
 * in `rt60` s, `seconds` long, shorter on a phone where the convolver costs most, darker as it decays
 * by `brightness`), the return lowpassed (`lp` Hz). `echo`: a tape echo beside it (a delay fed back
 * through a lowpass), at `level` of the send.
 */
export interface Reverb {
  predelay: number;
  hp: number;
  lp: number;
  seconds: number;
  phoneSeconds: number;
  rt60: number;
  /** D349: a phone's own (shorter) decay, where it differs. */
  phoneRt60?: number;
  /** D357: a phone's own send high-pass (Hz), where it differs (room.ts: a long room's low tail is mud on a small speaker). */
  phoneHp?: number;
  brightness: number;
  echo?: { delay: number; feedback: number; lp: number; level: number };
}
export const REVERBS: Record<Exclude<FxKind, "spc" | "echo">, Reverb> = {
  // NOCTURNE 32-BIT's hall (§6.2: the PlayStation's half-rate reverb: dark, 5.5 kHz at most).
  hall: { predelay: 0.025, hp: 350, lp: 5500, seconds: 1.9, phoneSeconds: 1.2, rt60: 1.9, brightness: 0.3 },
  // D302, PIPE ORGAN's large church: a later first reflection (45 ms), a long and darkening tail (RT60
  // 2.8 s; on a phone 1.8 s of impulse), the highs damped (4.8 kHz): the organ's lines carried, not drowned.
  // D304: smaller (RT60 2.2 s) and a little brighter (5.5 kHz): the inner lines were muddled in it.
  // D349: one church for the whole organ: RT60 2.6 s (Boren 2021: the Thomaskirche simulated as in 1723,
  // occupied, 2.3 s at 1 kHz; empty today about 4 s; its decay as long at 125 Hz as at 1 kHz), on a phone
  // 1.7 s (the small speaker smears a long tail); the send high-passed at 110 Hz (was 250: the pedal's
  // fundamentals were left dry, as if in another room), the first reflection at 30 ms.
  cathedral: { predelay: 0.03, hp: 110, lp: 5500, seconds: 2.8, phoneSeconds: 1.7, rt60: 2.6, phoneRt60: 1.7, brightness: 0.3 },
  // D302, VOCAL SYNTH's plate: bright and short (RT60 1.5 s), the singers' consonants kept clear (D304: its highs
  // 6.5 kHz, was 8.5: no glitter in the tail).
  plate: { predelay: 0.03, hp: 300, lp: 6500, seconds: 1.5, phoneSeconds: 1.1, rt60: 1.5, brightness: 0.45 },
  // TOMITA's space: a long reverb and a tape echo (a third of a second, darkening) beside it.
  space: { predelay: 0.03, hp: 250, lp: 6500, seconds: 2.8, phoneSeconds: 1.6, rt60: 2.8, brightness: 0.45, echo: { delay: 0.33, feedback: 0.32, lp: 3000, level: 0.5 } },
  // D305, BLEEPS AND BLOOPS' small spring (an organ amplifier's tank): short (RT60 1.3 s), thin (the
  // lows out from 400 Hz) and dark (4.2 kHz), with the spring's flutter: a 37 ms echo fed back (0.35).
  spring: { predelay: 0.012, hp: 400, lp: 4200, seconds: 1.3, phoneSeconds: 1.0, rt60: 1.3, brightness: 0.4, echo: { delay: 0.037, feedback: 0.35, lp: 3500, level: 0.3 } },
  // D339, the sampled piano's and harpsichord's music room (they shared the bands' room: a second of white
  // noise, no pre-delay, as bright at its end as at its start): a salon or small hall, the first reflection
  // 18 ms on, RT60 1.4 s (on a phone 1.0 s of impulse), darkening as it decays, nothing under 180 Hz in it
  // (the bass's lines kept clear) and nothing over 6.5 kHz: the strings' release heard into a space, not
  // into a dry box, with the pedal kept off (the owner's "no sustain pedal", after Schiff).
  salon: { predelay: 0.018, hp: 180, lp: 6500, seconds: 1.4, phoneSeconds: 1.0, rt60: 1.4, brightness: 0.4 },
  // D430, BAROQUE BAND's music room: a chamber band's (a Kapelle in a hall of a court or a coffee house, a little larger
  // than the salon's two or three players), the first reflection 22 ms on, RT60 1.25 s (on a phone 0.85 s, its impulse
  // 0.9 s: a phone's speaker smears a tail), darkening as it decays, high-passed at 150 Hz (the cello's and the
  // harpsichord's lines heard in the room too, not dry under it), nothing over 6 kHz. Sent BAND_SEND (sound.ts).
  band: { predelay: 0.022, hp: 150, lp: 6000, seconds: 1.3, phoneSeconds: 0.9, rt60: 1.25, phoneRt60: 0.85, brightness: 0.38 },
  // D504, ZELENKA TRIO's room: intimate, a music room of a Dresden court with three or four players close to the
  // listener: the first reflection 14 ms on, RT60 1.05 s (on a phone 0.75 s on a 0.8 s impulse), darkening as it
  // decays, high-passed at 140 Hz (the bassoon's and the continuo's lines in the room too), nothing over 6.5 kHz
  // (the reeds' edge not glittering in the tail). Sent TRIO_SEND (sound.ts).
  chamber: { predelay: 0.014, hp: 140, lp: 6500, seconds: 1.1, phoneSeconds: 0.8, rt60: 1.05, phoneRt60: 0.75, brightness: 0.4 },
  // D503, JAZZ QUARTET's club: a small room with people in it, short and warm (RT60 0.8 s, on a phone 0.6 s), the first
  // reflection close (12 ms), darker than the salon (5 kHz at most, darkening as it decays), the bass's line in it from
  // 140 Hz. Sent JAZZ_SEND (sound.ts), the brushes a little less (JAZZ_DRUMS.send).
  club: { predelay: 0.012, hp: 140, lp: 5000, seconds: 0.9, phoneSeconds: 0.7, rt60: 0.8, phoneRt60: 0.6, brightness: 0.32 },
  // D523, ABBEY ROAD's: EMI Studio Two and its echo chamber (the room the band played in, fed to the chamber below it):
  // a first reflection 20 ms on, RT60 1.1 s (on a phone 0.8 s), a little brighter than the club (the chamber's tiled
  // walls: 6 kHz), nothing under 200 Hz (the bass and the kick kept dry, as the engineers kept them out of the chamber).
  studio: { predelay: 0.02, hp: 200, lp: 6000, seconds: 1.2, phoneSeconds: 0.9, rt60: 1.1, phoneRt60: 0.8, brightness: 0.4 },
  // D525, KRAUTROCK's: a dry working room (Can's Inner Space, a converted cinema hung with mattresses; Conny Plank's
  // studio): short (RT60 0.6 s, a phone 0.45), close (10 ms), dark (5 kHz), from 180 Hz: the motorik pulse kept tight;
  // the guitar's space its tape echo (BAND_ECHO), not the room.
  inner: { predelay: 0.01, hp: 180, lp: 5000, seconds: 0.7, phoneSeconds: 0.55, rt60: 0.6, phoneRt60: 0.45, brightness: 0.34 },
  // D521, BOSSA NOVA's studio: a small, warm room of the Rio and New York sessions (the players close, a short plate-like
  // tail): the first reflection 15 ms on, RT60 0.95 s (on a phone 0.65 s), darkening, the bass's line in it from 150 Hz,
  // nothing over 5.5 kHz (the flute's breath and the guitar's nails not glittering). Sent BOSSA_SEND (sound.ts).
  // D524, PET SOUNDS' room: the echo chamber of a 1966 Hollywood session (Gold Star's, Western's): a live, bright-ish tail
  // (RT60 1.5 s, on a phone 0.95 s), the first reflection 20 ms on, nothing under 160 Hz in it (the bass's line dry, as the
  // records kept it) and nothing over 6 kHz. Sent PET_SEND (sound.ts); the snare and the timpani a good share of it.
  goldStar: { predelay: 0.02, hp: 160, lp: 6000, seconds: 1.6, phoneSeconds: 1.0, rt60: 1.5, phoneRt60: 0.95, brightness: 0.4 },
  bossa: { predelay: 0.015, hp: 150, lp: 5500, seconds: 1.0, phoneSeconds: 0.75, rt60: 0.95, phoneRt60: 0.65, brightness: 0.36 },
};
/**
 * D503, JAZZ QUARTET's brushes (chip.ts Chip.brushes): each piece's level against the others (`tap`, `stir`, `flutter`,
 * `ride`, `foot`, the recordings first evened to `ref` dB: BRUSH_RMS), the kit's `level` (measured: under the band, the
 * bass heard through a phone's speaker), a phone's `phone` share, the cut under `hp` Hz (the bass's room), the share of
 * the club (`send`), and the seats (`pan`: Connie Kay behind, a little left; the ride left, the hi-hat right of him).
 */
export const JAZZ_DRUMS = {
  level: 2,
  phone: 1,
  hp: 150,
  send: 0.12,
  ref: -30,
  tap: 0.55,
  stir: 0.8,
  flutter: 0.5,
  ride: 0.3,
  foot: 0.32,
  pan: { tap: -0.06, stir: -0.06, flutter: -0.06, ride: -0.14, foot: 0.02 },
} as const;
/**
 * D524, PET SOUNDS' drums (chip.ts Chip.petDrums: pet-drums.ts on petKit and the timpani): each piece's level (the files as
 * recorded), the kit's `level` (measured: where JAZZ QUARTET's brushes sit against their band), a phone's share, the cut
 * under `hp` Hz (the bass's room; the bass drum's and the timpani's own `lowHp`, their thump kept), each piece's share of
 * the echo chamber, and the seats (the kit behind, a little left; the timpani behind, right).
 */
export const PET_DRUMS = {
  level: 3.5,
  phone: 1.8,
  hp: 150,
  lowHp: 45,
  kick: 0.5,
  snare: 0.35,
  tomHigh: 0.35,
  tomLow: 0.4,
  crash: 0.22,
  tamb: 0.3,
  timp: 0.55,
  /** D581: the sleigh bells (synthesised: pet-drums.ts's on the beat), their level, a shake's jingles. */
  sleigh: 0.11,
  send: { kick: 0.04, snare: 0.3, tomHigh: 0.2, tomLow: 0.2, crash: 0.15, tamb: 0.12, timp: 0.25, sleigh: 0.18 },
  pan: { kick: -0.06, snare: -0.08, tomHigh: -0.12, tomLow: -0.02, crash: -0.14, tamb: 0.1, timp: 0.16, sleigh: 0.2 },
} as const;
/**
 * D521, BOSSA NOVA's drums (chip.ts Chip.bossaDrums: bossa-drums.ts on the brush kit and Big Rusty's cross-stick and bass
 * drum): each piece's level (the brushes' recordings evened to JAZZ_DRUMS.ref first; the rim and the kick as recorded), the
 * kit's `level` (measured: where JAZZ QUARTET's brushes sit against their band), a phone's share, the cut under `hp` Hz (the
 * bass's room; the bass drum's own `kickHp`, its felt thump kept), the room's share, and the seats (behind, a little right of
 * the bass; the rim on the left of the kit, the hi-hat on the right).
 */
export const BOSSA_DRUMS = {
  level: 2.35,
  phone: 1.7,
  hp: 150,
  kickHp: 55,
  send: 0.1,
  tap: 0.5,
  stir: 0.7,
  flutter: 0.45,
  ride: 0.26,
  foot: 0.3,
  rim: 0.3,
  kick: 0.42,
  pan: { tap: 0.06, stir: 0.06, flutter: 0.06, ride: -0.02, foot: 0.12, rim: 0.0, kick: 0.06 },
} as const;
/** D521: a brush kit's levels and seats (JAZZ_DRUMS, BOSSA_DRUMS). */
export type BrushKit = { level: number; phone: number; hp: number; send: number; tap: number; stir: number; flutter: number; ride: number; foot: number; pan: { tap: number; stir: number; flutter: number; ride: number; foot: number } };
/** D503: the brush recordings' loudness as prepared (dB, K-weighted over each file: tools/playback/jazz/build_jazz.py). */
export const BRUSH_RMS: Readonly<Record<number, number>> = { 48: -46, 49: -43.8, 50: -38.7, 51: -41.1, 52: -35.5, 53: -37.3, 54: -24.6, 55: -24.8, 60: -26.9, 62: -26.9, 64: -26.9, 65: -26.9, 72: -49.7, 74: -43.8, 76: -41.5, 84: -30, 85: -29, 86: -31.4, 87: -27.9 };
/** D503: what the game tells the rhythm section about a beat (proto-game.ts): its tick and beat, the piece's fills and end (ticks), Busoni's level there. */
export interface GrooveContext {
  tick: number;
  beat: number;
  fills: readonly Fill[];
  end: number;
  dynDb?: number;
  /** D520/D522: the piece's plan for SALSA's and CHORINHO's percussion (latin-drums.ts latinPlan). */
  latin?: LatinPlan;
  /** D514, D523: the piece (the drum presets read its form, its keys, its chosen drummer; ABBEY ROAD's and KRAUTROCK's drums its form: rock-drums.ts formOf; D521: BOSSA NOVA's its form: bossa-drums.ts bossaPlan; D524: PET SOUNDS' its form and its bass, pet-drums.ts petPlan). */
  piece?: TouchFugue;
}

/**
 * D514, the drum presets' recorded kits (chip.ts Chip.kit): the kit's level against the band (`level`, measured: D514's
 * table, under the music as JAZZ QUARTET's brushes are), a phone's share, the cut under the bass (`hp`: the timpani's
 * lower, their fundamentals are the point), the room's share, each piece's level after the recordings are evened to
 * `ref` dB (KIT_RMS), and the seats (a drummer's kit as heard from the front, within ±0.3).
 */
export const KIT_DRUMS = {
  level: 4.2,
  // Each style's share (the drums alone measured against I/12's band: about 11 LU under it, D514's table); the synthesized kits on chip.ts drum's scale.
  // D529: each set to -43 LUFS alone on the phone model (I/2 bars 3-14), 15.5 dB under the bands' median there (-27.5),
  // where JAZZ QUARTET's brushes sit under theirs (14.7): D514's kits stood 7-14 dB louder (8-11 under; the timpani 1.7).
  // (jazz and machine are written styles now, drum-grids.ts SWING and 808: these their levels.)
  style: { rock: 0.44, jazz: 0.44, frame: 0.38, timpani: 0.08, chip: 3.3, machine: 3.4, brushes: 1 } satisfies Record<DrumStyle, number>,
  phone: 1.2,
  // A phone's speaker has nothing under about 600 Hz: the timpani's and the bass drum's fundamentals (87-200 Hz) are
  // lost and the drums measured -50 LUFS there. On a phone their harmonics are made (a soft clip, the way a phone's own
  // "bass enhancer" implies a fundamental it cannot play) and given above phoneLow.hp.
  // The harmonics' level by style (measured on the phone model, a 600 Hz high-pass, against the band: I/12 bars 1-11 on
  // VOCAL SYNTH, D514's table, about 10.5 LU under it): the timpani's -50 LUFS raised to it, the drum machine's sine
  // kick and toms with them; the full-band level as before, so headphones on a phone hear the kit as elsewhere.
  phoneLow: { drive: 6, hp: 450, lp: 3200, level: 1.6, style: { rock: 1, jazz: 1, frame: 1, timpani: 4.2, chip: 0, machine: 7, brushes: 0 } satisfies Record<DrumStyle, number> },
  // The jazz kit's share on a phone (its ride carries there: measured 9.4 LU under the band, so 1.4 dB less).
  phoneStyle: { rock: 1, jazz: 0.85, frame: 1, timpani: 0.84, chip: 1, machine: 0.8, brushes: 1 } satisfies Record<DrumStyle, number>,
  hp: 120,
  timpHp: 55,
  send: 0.1,
  ref: -20,
  piece: { kick: 0.8, snare: 0.62, rim: 0.5, hat: 0.34, openhat: 0.32, crash: 0.36, ride: 0.42, tomHigh: 0.58, tomLow: 0.62, clap: 0.5, tamb: 0.36, shaker: 0.3, congaHigh: 0.52, congaLow: 0.62, bongo: 0.48, triangle: 0.26, bassDrum: 0.6, timp: 0.85, sideDrum: 0.5, fieldDrum: 0.56, tabor: 0.52, drumStick: 0.34, frameDum: 0.6, frameTek: 0.42, castanets: 0.44, cymbals: 0.34, woodblock: 0.42, claves: 0.36, templeHi: 1, templeLo: 1, ratchet: 1, slapstick: 1, whistleUp: 1, whistleDown: 1, bonk: 1, malletHigh: 1, malletLow: 1, cymSwell: 1, brush: 1 } satisfies Record<KitPiece, number>,
  pan: { kick: 0, snare: -0.05, rim: -0.05, hat: 0.18, openhat: 0.18, crash: -0.22, ride: -0.18, tomHigh: 0.1, tomLow: -0.12, clap: 0, tamb: 0.22, shaker: 0.15, congaHigh: 0.12, congaLow: -0.08, bongo: 0.2, triangle: 0.25, bassDrum: 0, timp: -0.1, sideDrum: -0.06, fieldDrum: 0.04, tabor: -0.04, drumStick: -0.06, frameDum: -0.06, frameTek: 0.1, castanets: 0.14, cymbals: -0.2, woodblock: 0.16, claves: -0.14, templeHi: 0.2, templeLo: -0.12, ratchet: 0.24, slapstick: -0.1, whistleUp: 0.3, whistleDown: -0.3, bonk: 0, malletHigh: 0.12, malletLow: -0.12, cymSwell: -0.2, brush: 0.06 } satisfies Record<KitPiece, number>,
} as const;
/** D601: a fugue's first attack (any voice), memoised. */
const firstOn = new Map<string, number>();
export function firstOnset(f: TouchFugue): number {
  let t = firstOn.get(f.id);
  if (t === undefined) {
    t = Infinity;
    for (const v of f.voices) for (const n of v) if (n[0] < t) t = n[0];
    if (!Number.isFinite(t)) t = 0;
    firstOn.set(f.id, t);
  }
  return t;
}
/**
 * D601: the drums' share of the band's texture at a tick: the voices sounding over the TEXTURE_S after it (each voice
 * the share of the window its notes fill), against all the fugue's voices, as an amplitude (the energy's square root),
 * at least TEXTURE_FLOOR where any sounds; 0 where none does (before the first note, a general rest, after the last).
 */
export const TEXTURE_S = 0.4;
export const TEXTURE_FLOOR = 0.12;
/** D607: under this share (one held note dying, of four voices) the drums hold off altogether. */
export const TEXTURE_SILENT = 0.075;
/** D607: a note's share of the texture as it is held: e^(-held/HELD_S), at least HELD_MIN. */
export const HELD_S = 2;
export const HELD_MIN = 0.25;
/** D601: the texture's exponent on the amplitude (one voice of four: 1/4, 12 dB under the four (D607: 0.75 before)). */
export const TEXTURE_EXP = 1;
/** D601: the lowest voice's share of the texture (a phone's speaker hears the bass through its overtones only). */
export const BASS_TEXTURE = 0.5;
/** D601: a roll's or a fill's strokes at this share; an accent at most this; the strokes after the last chord's attack at this. */
export const ROLL_SHARE = 0.65;
export const ACCENT_MAX = 0.55;
export const RING_SHARE = 0.3;
const lastOn = new Map<string, number>();
export function lastOnset(f: TouchFugue): number {
  let t = lastOn.get(f.id);
  if (t === undefined) {
    t = 0;
    for (const v of f.voices) for (const n of v) if (n[0] > t) t = n[0];
    lastOn.set(f.id, t);
  }
  return t;
}
const texMemo = new Map<string, { span: number; at: Float32Array }>();
export function textureGain(f: TouchFugue, tick: number): number {
  let m = texMemo.get(f.id);
  if (!m) {
    // per sixteenth of a beat: the sounding voices' share of the window from there
    const span = Math.max(1, Math.round(f.tpq / 8));
    const tps = (tempoOf(f.id) * f.tpq) / 60;
    // D607: a held note's share falling as it is held (a plucked or struck note dies away; a held one counted less)
    const held = (s: number) => Math.max(HELD_MIN, Math.exp(-Math.max(0, s) / HELD_S));
    const n = Math.ceil(f.length / span) + 2;
    const cover = new Float32Array(n);
    f.voices.forEach((v, u) => {
      const w = u === f.voices.length - 1 && f.voices.length > 1 ? BASS_TEXTURE : 1;
      for (const [on, dur] of v) for (let i = Math.floor(on / span); i * span < on + dur && i < n; i++) cover[i] += w * held((i * span - on) / tps) * Math.min(1, (Math.min(on + dur, (i + 1) * span) - Math.max(on, i * span)) / span);
    });
    const win = Math.max(1, Math.round((tps * TEXTURE_S) / span));
    const at = new Float32Array(n);
    let acc = 0;
    for (let i = n - 1; i >= 0; i--) {
      acc += cover[i] - (i + win < n ? cover[i + win] : 0);
      at[i] = Math.max(0, acc / win);
    }
    m = { span, at };
    texMemo.set(f.id, m);
  }
  const i = Math.max(0, Math.min(m.at.length - 1, Math.floor(tick / m.span)));
  const s = m.at[i] / (f.voices.length > 1 ? f.voices.length - 1 + BASS_TEXTURE : 1);
  if (s < TEXTURE_SILENT) return 0;
  return Math.max(TEXTURE_FLOOR, Math.min(1, s ** TEXTURE_EXP));
}
/**
 * D623: an effect's share at a tick (world-sfx.ts, Chip.scheduleSfx): the drums' thinning (D601/D607): 0 before the first
 * note, 0 past the last chord's attack, else the band's texture over the 400 ms after it (0 in a general rest).
 */
export function sfxShare(f: TouchFugue, tick: number): number {
  if (tick < firstOnset(f) - 1 || tick > lastOnset(f)) return 0;
  return textureGain(f, tick);
}
/** D624: the swell's beats: each piece's filters warmed this long before it (silent), its level ramped over SWELL_XF. */
export const SWELL_WARM = 0.06;
export const SWELL_XF = 0.03;
/** D623: an effect as the choke point schedules it (the swell: one beat's piece, from `when` at `vel` to `until` at `vel1`). */
export interface SfxScheduled {
  kind: SfxKind;
  tick: number;
  end: number;
  when: number;
  until: number;
  vel: number;
  vel1: number;
  /** The plan's event's tick (the swell's start: the noise read on from there). */
  since: number;
  /** D643: a one-shot's variation (world-sfx.ts SfxEvent.seed). */
  seed?: number;
  /**
   * D643: a curve effect's levels, one curve per layer (world-sfx.ts CURVE_SOUND), from `when`, a point every `res` s:
   * a flowing one's (a bed's, a climax's shape) its envelope times its textures over the beat's piece and its crossfade,
   * thinned point by point at the choke point (`tps`: the beat's ticks a second, a point's tick read from it).
   */
  curves?: Float32Array[];
  res?: number[];
  tps?: number;
}
/** D514: the soft clip that makes the low drums' harmonics on a phone (tanh). */
const PHONE_LOW_CURVE = (() => {
  const c = new Float32Array(1025);
  for (let i = 0; i < c.length; i++) c[i] = Math.tanh(((i / 512) - 1) * 3);
  return c;
})();
/** D514: the kits' recordings' loudness (dB: the strongest 50 ms, tools/playback/drums/measure_kits.py). */
export const KIT_RMS: Readonly<Record<string, number>> = { "kitRock/kick-1": -17.9, "kitRock/kick-2": -10.1, "kitRock/snare-1": -20.8, "kitRock/snare-2": -15.6, "kitRock/rim-1": -27.4, "kitRock/rim-2": -20.0, "kitRock/hat-1": -33.7, "kitRock/hat-2": -25.2, "kitRock/openhat-1": -26.4, "kitRock/openhat-2": -22.5, "kitRock/crash-1": -25.2, "kitRock/crash-2": -21.7, "kitRock/ride-1": -35.2, "kitRock/ride-2": -28.1, "kitRock/tomHigh-1": -19.9, "kitRock/tomHigh-2": -13.8, "kitRock/tomLow-1": -20.9, "kitRock/tomLow-2": -13.6, "kitClub/kick-1": -15.3, "kitClub/kick-2": -7.5, "kitClub/snare-1": -21.2, "kitClub/snare-2": -13.2, "kitClub/rim-1": -30.3, "kitClub/rim-2": -22.3, "kitClub/hat-1": -32.8, "kitClub/hat-2": -21.6, "kitClub/openhat-1": -30.7, "kitClub/openhat-2": -18.7, "kitClub/crash-1": -23.5, "kitClub/crash-2": -17.1, "kitClub/ride-1": -32.8, "kitClub/ride-2": -27.8, "kitClub/tomHigh-1": -19.6, "kitClub/tomHigh-2": -12.3, "kitClub/tomLow-1": -19.2, "kitClub/tomLow-2": -11.3, "kitClub/cowbell-1": -28.2, "kitClub/cowbell-2": -17.3, "kitClub/tambourine-1": -22.2, "kitClub/tambourine-2": -18.5, "kitClub/shaker-1": -28.1, "kitClub/shaker-2": -19.8, "kitClub/congaHigh-1": -14.2, "kitClub/congaHigh-2": -10.4, "kitClub/congaLow-1": -20.1, "kitClub/congaLow-2": -11.2, "kitClub/bongo-1": -25.1, "kitClub/bongo-2": -15.3, "kitClub/woodblock-1": -28.2, "kitClub/woodblock-2": -22.1, "kitClub/claves-1": -35.4, "kitClub/claves-2": -29.5, "kitClub/triangle-1": -33.3, "kitClub/triangle-2": -23.2, "kitClub/guiro-1": -34.4, "kitClub/guiro-2": -27.1, "timpLoud/B2-v2": -10.7, "timpLoud/Cs3-v2": -15.1, "timpLoud/E3-v2": -18.6, "timpLoud/F2-v2": -27.0, "timpLoud/G3-v2": -20.9, "kitPeriod/sideDrum-1": -9.6, "kitPeriod/sideDrum-2": -12.4, "kitPeriod/fieldDrum-1": -10.4, "kitPeriod/fieldDrum-2": -12.5, "kitPeriod/tabor-1": -7.3, "kitPeriod/tabor-2": -11.8, "kitPeriod/drumStick-1": -15.0, "kitPeriod/drumStick-2": -15.0, "kitPeriod/frameDum-1": -8.0, "kitPeriod/frameDum-2": -9.4, "kitPeriod/frameTek-1": -7.9, "kitPeriod/frameTek-2": -14.6, "kitPeriod/tambourine-1": -10.8, "kitPeriod/tambourine-2": -12.4, "kitPeriod/castanets-1": -22.2, "kitPeriod/castanets-2": -21.9, "kitPeriod/bassDrum-1": -9.2, "kitPeriod/bassDrum-2": -9.6, "kitPeriod/cymbals-1": -14.4, "kitPeriod/cymbals-2": -13.3, "kitPeriod/triangle-1": -15.5, "kitPeriod/triangle-2": -14.0 };
/** D514: a drum piece as a style's kit plays it: the recorded set and its file's name there (null: synthesized). */
export function kitSource(style: string, piece: KitPiece): { set: KitSet; voice: string } | null {
  const voice = kitVoiceOf(style);
  if (voice === null || piece === "timp") return null;
  // D532: the score-driven styles on the period kit (VCSL's orchestral bass drum and triangle, its tambourine).
  if (voice === "kitPeriod") {
    const pv = piece === "tamb" ? "tambourine" : piece;
    if (KIT_VOICES.kitPeriod.includes(pv)) return { set: "kitPeriod", voice: pv };
    // D569: STOOGES' woodblock and claves, the club kit's.
    return KIT_VOICES.kitClub.includes(pv) && (piece === "woodblock" || piece === "claves") ? { set: "kitClub", voice: pv } : null;
  }
  const v = piece === "tamb" ? "tambourine" : piece === "clap" ? "snare" : piece === "bassDrum" ? "kick" : piece;
  if (voice === "kitRock" && KIT_VOICES.kitRock.includes(v)) return { set: "kitRock", voice: v };
  return KIT_VOICES.kitClub.includes(v) ? { set: "kitClub", voice: v } : null;
}
/**
 * D527: the kit that sounds a style kitBeat plays: a written style's own (drum-grids.ts), D514's rock on Big Rusty, its
 * jazz, frame and timpani on the club kit (null: a synthesized kit, or not a kit style: the brushes, the bands' own).
 */
export function kitVoiceOf(style: string): KitVoice | "kitClub" | "kitRock" | "kitPeriod" | null {
  const g = GRIDS[style];
  if (g) return g.kit === "kitRock" || g.kit === "kitClub" ? g.kit : null;
  if (style === "rock") return "kitRock";
  // D532: the score-driven orchestral and period styles (timpani, frame drums, side drum, tabor, castanets, Janissary, field drums).
  // D570, D572: SCORE SYNTH synthesized; SWELL's snare the club kit's (its mallets and swells synthesized).
  if (style === "scoreSynth") return null;
  if (style === "swell") return "kitClub";
  if (isScoreStyle(style)) return "kitPeriod";
  return null;
}
/** D527: the synthesized kit of a style (chip.ts drum's), or null where it is recorded. */
export function synthKitOf(style: string): Kit | null {
  if (style === "chip") return "chip";
  if (style === "scoreSynth") return "synth";
  const k = GRIDS[style]?.kit;
  return k === "analog" || k === "tr909" || k === "linn" || k === "glitch" || k === "chip" || k === "arcade" ? k : null;
}
/** D527: a kit style's level (its share of KIT_DRUMS.level; a synthesized kit's on chip.ts drum's scale), a phone's share, its low drums' harmonics on a phone. */
export function kitMix(style: string): { share: number; phone: number; low: number } {
  const sm = SCORE_MIX[style as ScoreStyle];
  if (sm) return sm;
  const L = style as DrumStyle;
  if (L in KIT_DRUMS.style) return { share: KIT_DRUMS.style[L], phone: KIT_DRUMS.phoneStyle[L], low: KIT_DRUMS.phoneLow.style[L] };
  const g = GRIDS[style];
  const sk = g?.kit;
  return { share: g?.share ?? 1, phone: g?.phone ?? 1, low: g?.low ?? (sk === "analog" || sk === "tr909" ? 7 : sk === "linn" ? 4 : sk === "glitch" ? 2 : sk === "chip" || sk === "arcade" ? 0 : 1) };
}
/**
 * D532: the score-driven styles' levels (their share of KIT_DRUMS.level, a phone's share, the low drums' harmonics on a
 * phone): measured as the other kits, the drums alone against the band (scratchpad/drumorch, NOTES.md), under it where
 * JAZZ QUARTET's brushes sit (D508, D529): 14-16 LU under on the phone model. (D529 set D514's TIMPANI to 0.08 for the
 * same reason: the drum's 0.6 stood 1.7 dB under the band.)
 */
export const SCORE_MIX: Readonly<Record<ScoreStyle, { share: number; phone: number; low: number }>> = {
  timpani: { share: 0.11, phone: 0.84, low: 4.2 },
  frame: { share: 0.8, phone: 1, low: 0.5 },
  military: { share: 0.9, phone: 1, low: 0.9 },
  tabor: { share: 0.85, phone: 0.8, low: 1 },
  castanets: { share: 1, phone: 0.85, low: 1 },
  janissary: { share: 0.53, phone: 1.2, low: 3 },
  fieldDrums: { share: 1, phone: 1, low: 0.47 },
  // D567-D572 (measured: scratchpad/fix3, NOTES.md): MARCH clearly heard under BACH BRASS (the owner: "virtually
  // inaudible"); the others where the library's styles sit (D529); SCORE SYNTH on chip.ts drum's scale.
  march: { share: 1.4, phone: 1, low: 0.9 },
  stooges: { share: 1, phone: 1, low: 1 },
  scoreSynth: { share: 4.5, phone: 0.9, low: 5 },
  swell: { share: 1.25, phone: 1, low: 1 },
};
/**
 * D532: the period kit's drums that a phone's speaker barely plays (the rope-tension drums' and the large frame drum's
 * body is under 600 Hz: the side drum measured 13 dB quieter on the phone model than in full): their harmonics made on a
 * phone, as the timpani's (lowHarmonics).
 */
// D600: not the stick (a click with no body under 600 Hz: its "harmonics" were the click itself soft-clipped, II/5's street
// beat at or over the band on the phone model).
const PHONE_LOW_PIECES: ReadonlySet<KitPiece> = new Set(["sideDrum", "fieldDrum", "frameDum", "frameTek"]);
/** D567-D572: the pieces synthesized by Chip.toon (no recording: the slapstick's and the swell's). */
export const TOON_PIECES: ReadonlySet<KitPiece> = new Set(["templeHi", "templeLo", "ratchet", "slapstick", "whistleUp", "whistleDown", "bonk", "malletHigh", "malletLow", "cymSwell", "brush"]);
/** D567-D572: each synthesized piece's level (on chip.ts drum's scale; measured with its style, scratchpad/fix3). */
export const TOON_LEVEL: Partial<Record<KitPiece, number>> = { templeHi: 1, templeLo: 1, ratchet: 1, slapstick: 1, whistleUp: 0.6, whistleDown: 0.6, bonk: 1, malletHigh: 1, malletLow: 1, cymSwell: 0.7, brush: 1 };
/** D565: the layers' mix (Chip.layer): the sub, its harmonics on a phone, the click, the snare's body and crack. */
export const LAYER_MIX = { sub: 2.2, subPhone: 0.6, click: 0.9, body: 0.8, crack: 1.1 } as const;
/** D565: a recorded kit's layers' share against its own level (the synthesized kits' layers on their own scale). */
export const LAYER_RECORDED = 1;
/** D514: the pieces each recorded style strikes (its plan, loaded when DRUMS is on). */
const STYLE_PIECES: Record<string, KitPiece[]> = {
  rock: ["kick", "snare", "rim", "hat", "openhat", "crash", "ride", "tomHigh", "tomLow"],
  // D532: the score-driven styles' pieces (score-drums.ts SCORE_KITS).
  ...Object.fromEntries(ALL_SCORE_STYLES.map((st) => [st, scoreKitPieces(st)])),
};
/** D514, D527: every file a kit style may play. */
export function kitFiles(style: string): { set: string; notes: number[] }[] {
  if (style === "brushes") return [{ set: BRUSH_SET, notes: [...BRUSH_MIDIS] }];
  if (synthKitOf(style) || kitVoiceOf(style) === null) return [];
  const pieces = GRIDS[style] ? gridPieces(GRIDS[style]) : (STYLE_PIECES[style] ?? []);
  const by = new Map<string, Set<number>>();
  for (const pc of pieces) {
    const src = kitSource(style, pc);
    if (!src) continue;
    for (const loud of [false, true]) {
      const m = kitMidi(src.set, src.voice, loud);
      if (m === null) continue;
      if (!by.has(src.set)) by.set(src.set, new Set());
      by.get(src.set)!.add(m);
    }
  }
  const out = [...by].map(([set, ms]) => ({ set, notes: [...ms].sort((a, b) => a - b) }));
  if (style === "timpani") out.push({ set: TIMP_SET, notes: [...TIMP_MIDIS] });
  return out;
}
/** D526: the band a library style's latin engine plays (SALSA's, CHORINHO's). */
export const LATIN_STYLE: Readonly<Record<string, LatinBand>> = { salsa: "salsa", choro: "chorinho" };
/** D526: the rock band a library style's engine plays (ABBEY ROAD's, KRAUTROCK's). */
export const ROCK_STYLE: Readonly<Record<string, RockStyle>> = { abbey: "abbey", motorik: "motorik" };
/** D526: every file any library style may play (its engine's recordings; none for a synthesized kit). */
export function drumFilesFor(style: string): { set: string; notes: number[] }[] {
  switch (styleInfo(style).engine) {
    case "brushes":
      return [{ set: BRUSH_SET, notes: [...BRUSH_MIDIS] }];
    case "rockBand":
      return [{ set: ROCK_KIT_SET, notes: [...ROCK_KIT_MIDIS] }];
    case "latin":
      return [{ set: LATIN_SET, notes: latinMidis(LATIN_STYLE[style] ?? "salsa") }];
    case "bossa":
      return [{ set: BRUSH_SET, notes: [...BRUSH_MIDIS] }, { set: BOSSA_KIT_SET, notes: [...BOSSA_KIT_MIDIS] }];
    case "pet":
      return [{ set: ROCK_KIT_SET, notes: [...ROCK_KIT_MIDIS] }, { set: "kitClub", notes: [kitMidi("kitClub", "tambourine", false)!, kitMidi("kitClub", "tambourine", true)!] }, { set: TIMP_SET, notes: [...TIMP_MIDIS] }];
    default:
      return kitFiles(style);
  }
}
/**
 * D526: one stroke of any drummer, as the single choke point sees it (Chip.scheduleKitHit): the engine (`voice`), the
 * style, the piece struck, the fugue's tick it falls on, the time (audio clock), the velocity played (0-1), and its role
 * where the engine knows it (a roll, a fill, a landing's accent).
 */
export interface KitEvent {
  voice: "kit" | "rock" | "latin" | "brush" | "sweep" | "bossa" | "pet" | "drum";
  style: string;
  piece: string;
  tick: number;
  when: number;
  vel: number;
  role?: "roll" | "fill" | "accent";
  /** D535: a roll's or a fill's stroke: the ticks from it to the landing. */
  dur?: number;
}
/** D536: a registration not heard for this long (s) is new when it comes (a change reported once, not per note). */
export const REG_NEW_S = 2;
/** D536: the output meter: its window (samples), its floor (dBFS: 0 there), how quickly it rises and falls (s). */
export const METER_FFT = 1024;
export const METER_FLOOR_DB = -48;
export const METER_RISE_S = 0.03;
export const METER_FALL_S = 0.3;
/** D536: the bass drums (the studio's "kick"), the snares (its "snare"), by every engine's names. */
const KICKS = new Set(["kick", "bassDrum", "surdo", "tumba", "pandBass", "bonk"]);
const SNARES = new Set(["snare", "rim", "clap", "rimshot", "pandSlap", "slap", "slapstick"]);
/**
 * D536: the studio's live event a stroke is (music-events.ts LiveKind), or null (the hats, the shakers, a brush's sweep:
 * the time-keeping, not events): a roll's or a fill's stroke, a crash, the timpani, a landing's accent, the kick, the snare.
 */
export function musicKindOf(e: KitEvent): LiveKind | null {
  if (e.voice === "sweep") return null;
  if (e.role === "roll") return "roll";
  if (e.role === "fill") return "fill";
  if (e.piece === "crash") return "crash";
  if (e.piece === "timp") return "timp";
  if (e.role === "accent") return "accent";
  if (KICKS.has(e.piece)) return "kick";
  if (SNARES.has(e.piece)) return "snare";
  return null;
}
/** D536: the studio's events are reported only while its stage is drawn (stage-bg.ts: FULL or QUIET); OFF, none. */
export const musicLive = () => stageMode() !== "off";
/**
 * D520 SALSA's and D522 CHORINHO's percussion (chip.ts Chip.latin, latin-drums.ts): the kit's `level` (measured: where
 * JAZZ QUARTET's brushes sit under their band, the bass heard through a phone's speaker), a phone's share, the cut under
 * `hp` Hz (the bass's room: the surdo and the tumba keep their thump above it), the share of the room (`send`); each
 * piece's level (the recordings evened in the build) and its seat (`pan`, seen from the room: salsa's congas right of
 * the band's middle, the bongos left, the timbales behind a little left, the clave in the middle; chorinho's pandeiro
 * in the middle, the tamborim left, the agogo right, the ganza left, the surdo behind).
 */
export const LATIN_KIT: { level: number; phone: number; hp: number; send: number; band: Readonly<Record<LatinBand, number>>; pieces: Readonly<Record<LatinPiece, readonly [level: number, pan: number]>> } = {
  level: 0.54,
  phone: 1.57,
  hp: 90,
  send: 0.1,
  // Each band's share (D522: CHORINHO's regional measured 1.4 dB under where JAZZ's brushes sit).
  band: { salsa: 1, chorinho: 1.17 },
  pieces: {
    conga: [0.9, 0.22],
    slap: [0.8, 0.22],
    tumba: [0.9, 0.3],
    bongoHi: [0.7, -0.24],
    bongoMute: [0.55, -0.24],
    bongoLo: [0.7, -0.2],
    bell: [0.42, -0.2],
    bellLow: [0.45, -0.2],
    timbalBell: [0.38, -0.1],
    clave: [0.45, 0.04],
    hembra: [0.75, -0.12],
    macho: [0.7, -0.08],
    rimshot: [0.7, -0.1],
    cascara: [0.45, -0.1],
    pandJingle: [0.5, 0.04],
    pandHit: [0.55, 0.04],
    pandBass: [0.9, 0.04],
    pandSlap: [0.75, 0.04],
    surdo: [1, 0],
    tamborim: [0.5, -0.2],
    agogoHi: [0.3, 0.22],
    agogoLo: [0.32, 0.22],
    ganza: [0.35, -0.24],
  },
};
/** D520/D522: the band a groove's percussion is. */
export const LATIN_GROOVE: Readonly<Record<string, LatinBand>> = { salsaBand: "salsa", choroBand: "chorinho" };
/**
 * D523, ABBEY ROAD's drums, and D525, KRAUTROCK's (chip.ts Chip.rockDrums: rock-drums.ts on Big Rusty Drums): each piece's
 * level against the others (the recordings first evened to `ref` LUFS: ROCK_KIT_RMS), the kit's `level` (measured: as
 * far under its band as JAZZ QUARTET's brushes under theirs, the D523 and D525 rows), a phone's `phone` share, the cut
 * under `hp` Hz (the bass's room: the kick's thump kept, its boom not), the share of the preset's room (`send`), the
 * seats (`pan`, seen from the room: the kit behind, a little left, the hi-hat left of it, the floor tom right), and the
 * strokes' own variation (`vary`: each stroke's level within ±`db` dB and its pitch within ±`cents`, a hash of its time:
 * no two strokes the same recording played the same, as no drummer strikes twice alike). `styles`: each band's own.
 */
export const ROCK_DRUMS = {
  ref: -30,
  hp: 45,
  vary: { db: 1, cents: 8 },
  pieces: { kick: 0.7, snare: 0.62, rim: 0.5, hat: 0.34, openhat: 0.32, crash: 0.42, ride: 0.3, tomHigh: 0.55, tomLow: 0.6 } as Record<RockPiece, number>,
  pan: { kick: -0.06, snare: -0.08, rim: -0.08, hat: -0.2, openhat: -0.2, crash: 0.06, ride: 0.1, tomHigh: -0.12, tomLow: 0.08 } as Record<RockPiece, number>,
  styles: {
    abbey: { level: 1, phone: 1.8, send: 0.14 },
    motorik: { level: 1, phone: 1.25, send: 0.08 },
  } as Record<RockStyle, { level: number; phone: number; send: number }>,
};
/** D523: the groove each rock band's drums play (sound.ts Preset.groove), by style. */
export const ROCK_GROOVES: Readonly<Record<string, RockStyle>> = { abbeyRock: "abbey", motorik: "motorik" };
/**
 * D525, KRAUTROCK's guitar echo (Patch.echo, its send): a tape echo (its own band, saturation, wow and flutter: D509's
 * tape's values) of `beats` of the beat as it sounds (three sixteenths of a crotchet beat: 0.75, the dotted eighth),
 * fed back `feedback`, a little to the other side (`pan`), its return `wet`: the repeats heard behind the line, never
 * over it. An effect on the guitar's own notes: nothing added to Bach's.
 */
export const BAND_ECHO = { beats: 0.75, feedback: 0.32, wet: 1, pan: 0.18, fallback: 0.36, min: 0.12, max: 0.7, hp: 320, lp: 2600, drive: 2.2, wow: { rate: 0.55, depth: 0.0011 }, flutter: { rate: 6.3, depth: 0.00004 } } as const;
export const HALL = REVERBS.hall;

/**
 * D294, CLASSIC CHIP less harsh (the owner: "perhaps too harsh. Maybe it's the fact that all voices have
 * no decay?"): a pulse note rises in 6 ms to its peak (`lift` above the old one), falls to `fall` of it
 * (time constant `fallTau`), and from `slowFrom` s sinks toward `floor` (`floorTau`), as a console's
 * volume envelope would (it held at 0.72 of its peak); its lowpass opens at `open` Hz at the attack and
 * closes over `closeTau` to `tameAt` the note (4.5 times its pitch, within 2.5-4.5 kHz). The triangle
 * (the bass on a computer) is as it was.
 */
export const CHIP_ENV = { lift: 1.06, fall: 0.6, fallTau: 0.08, slowFrom: 0.3, floor: 0.42, floorTau: 1.2, open: 9000, closeTau: 0.09 };
export const tameAt = (f0: number) => Math.max(2500, Math.min(4500, f0 * 4.5));

/** D345: how long past its own schedule's end a sound not reported ended is let go (s), and how often the chip looks (s). */
export const SWEEP_GRACE_S = 1.5;
export const SWEEP_EVERY_S = 0.5;
const OPEN = new Set<Bag>();

/**
 * D210: one sound's nodes, all disconnected once the last of its sources has ended. Nothing in chip.ts
 * was ever disconnected: Safari keeps a finished note's gains, filters and panner wired to the mix until
 * its garbage collector happens to run, and its audio thread goes on pulling them all (tens of thousands
 * over a fugue), until the sound breaks up into hiss and the page is killed.
 */
export class Bag {
  private nodes: AudioNode[] = [];
  private live = 0;
  done = false;
  onDone: (() => void) | null = null;
  /** D345: each source's start and stop as asked (s; null: not started), for the deadline (`Bag.sweep`). */
  private srcs: { s: AudioScheduledSourceNode; start: number | null; offset: number; stop: number }[] = [];
  private ctx: BaseAudioContext | null = null;
  add<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }
  /** A source of the sound: register it before starting it. */
  src<T extends AudioScheduledSourceNode>(s: T): T {
    this.add(s);
    this.live++;
    s.onended = () => {
      if (--this.live <= 0) this.free();
    };
    // D345: its start and stop noted (the browser's own calls, unchanged), so the sound can be let go by
    // its own schedule where the browser's `ended` comes late or never (Bag.sweep).
    const e = { s, start: null as number | null, offset: 0, stop: Infinity };
    this.srcs.push(e);
    if (!this.ctx) {
      this.ctx = s.context;
      OPEN.add(this);
    }
    const start = s.start;
    const stop = s.stop;
    const at = () => s.context.currentTime;
    s.start = ((when = 0, offset?: number, ...rest: number[]) => {
      (start as (...a: unknown[]) => void).call(s, when, offset, ...rest);
      e.start = Math.max(when, at());
      e.offset = offset ?? 0;
      if (rest[0] !== undefined) e.stop = Math.min(e.stop, e.start + rest[0]);
    }) as T["start"];
    s.stop = ((when = 0) => {
      stop.call(s, when);
      // As the spec: the last stop() asked is the one that holds.
      e.stop = Math.max(when, at());
    }) as T["stop"];
    return s;
  }
  /**
   * D345: when this sound is surely over (context time, s): its last source's stop, or a recording's own
   * end (at its slowest rate); Infinity while a source has no end yet (not started, or held without a stop).
   */
  deadline(): number {
    let end = -Infinity;
    for (const e of this.srcs) {
      if (e.start === null) return Infinity;
      let own = e.stop;
      const b = e.s as Partial<AudioBufferSourceNode>;
      if (b.buffer && !b.loop) own = Math.min(own, e.start + Math.max(0, b.buffer.duration - e.offset) / Math.max(0.25, Math.min(1, b.playbackRate?.value ?? 1)));
      end = Math.max(end, own);
    }
    return end;
  }
  /** D345: let go now (a note that failed to build: its sources may never start, so never end). */
  release() {
    this.free();
  }
  private free() {
    if (this.done) return;
    this.done = true;
    OPEN.delete(this);
    for (const n of this.nodes)
      try {
        n.disconnect();
      } catch {
        /* already */
      }
    this.nodes = [];
    this.srcs = [];
    this.onDone?.();
  }
  /**
   * D345, the safeguard behind D210 (the owner: an iPhone "jittering at a long concerto piece, by the
   * end"): a sound's nodes were let go only when the browser reported its sources' end (`ended`). Where
   * that report comes late or never (D211 saw it on the phone), every such note stayed wired and Safari's
   * audio thread went on pulling it: over BWV 1043 III (150 nodes a second, six voices) 36,000 nodes by
   * the end on the fake context with the reports silenced, D210's hiss and slowdown growing with the
   * piece. Now any sound whose own schedule is over (its last source's stop, a recording's end) by
   * SWEEP_GRACE_S is let go whether reported or not; a reported end still lets it go at once. Never
   * earlier than the report would (the report comes at the stop), so nothing heard changes.
   */
  static sweep(ctx: BaseAudioContext) {
    const now = ctx.currentTime;
    for (const b of OPEN) if (b.ctx === ctx && now > b.deadline() + SWEEP_GRACE_S) b.free();
  }
  /** D345: sounds not yet let go (for the tests and the measurements). */
  static open(ctx?: BaseAudioContext): number {
    let n = 0;
    for (const b of OPEN) if (!ctx || b.ctx === ctx) n++;
    return n;
  }
  /** D249: how many notes it counts as against a phone's cap (ORGANO PLENO's extra pipes, one each). */
  weight = 1;
}

/** D210: a note not yet ended: when it began, whether it is the player's, whether it was let go to make room. */
type Live = { at: number; until: number; lead: boolean; stolen: boolean; sd: Sounding; w: number };

export interface Voicing {
  timbre: Timbre;
  /** D177: the voice's instrument in the ensemble chosen (none: the classic chip sound). */
  patch?: Patch | null;
  /** -1 (left) to 1 (right). */
  pan: number;
  /** The voice's level (1 for every voice since D169). */
  gain: number;
  /** D432: the lowest voice of several (CLASSIC CHIP's triangle, or its phone pulse; GAME BOY's wave bass): never volume-stepped. */
  bass?: boolean;
}

/** How the player's own note sounds (D171): the Synth holds steady while the thumb stays down; the Piano dies away as it is held and is damped when let go. */
export type Envelope = "synth" | "piano" | "dulcimer";

export interface Play {
  envelope?: Envelope;
  /**
   * Joined to the note before without a new attack (that note is still held). D302: on every sound: no
   * fresh attack transient (the level comes in under the note before as it goes, over 15-20 ms; no
   * filter or FM-index burst, no chiff, no scoop, no consonant); a plucked or struck note is plucked
   * anyway (a harpsichord joins by holding the note before: `tie`).
   */
  legato?: boolean;
  /**
   * D424: joined as a slur (SET-AND-RELEASE, a slide): with `legato`, a bowed string's same bow, no new
   * stroke (Patch.bow skipped: the recording entered past its attack, 0.25 s, as a slur's).
   */
  slur?: boolean;
  /**
   * D429: the band's bowed note joined from the one before as a NEW BOW (STRING_BOW_CHANGE's bite and accent,
   * as the player's two-thumb join), not D358's soft stroke.
   */
  bowChange?: boolean;
  /** D429: the band's bowed note giving way, at the next note's onset (its end less `tie`), as a bow change or a slur (giveWay). */
  give?: GiveWay;
  /**
   * D420: an organ note already sounding, taken up again under a new registration (a piston pressed
   * while the key is held): its pipes enter joined (no new chiff: the ranks held on keep speaking),
   * even where a pipe would speak anew (`piped`).
   */
  retake?: boolean;
  /**
   * D302: joined to the next note: held at its level to its end (the next note's onset and a little
   * over), let go over the last `tie` s (the crossfade into the next), not released before it as a
   * note's own release would (it left a gap or a dip of 40-120 ms between joined notes).
   */
  tie?: number;
  /** D302: joined from this pitch (MIDI): a singing voice glides from it (VOCAL SYNTH; the rest ignore it). */
  from?: number;
  /** D302: the last note before a rest (a phrase's end): a singing voice falls off it (VOCAL SYNTH). */
  final?: boolean;
  /**
   * D304: detached or staccato by a reading's mark: its gap heard on every sound (a plucked synthesized
   * note damped in 30 ms, a held recording's release done by its written end). Without it a note ends
   * as before D302 (the damper 80 ms, the release from the written end): the default playing.
   */
  apart?: boolean;
  /** A level for this note alone (1: as the voice). */
  level?: number;
  /** The note can be muffled after it starts (the testbench, D175: a gesture judged wrong). */
  muffleable?: boolean;
  /** D177, the touch's expression: brightness (-1 dark to 1 bright), softness of the attack (0 to 1), an accent (0 to 1). */
  bright?: number;
  soft?: number;
  accent?: number;
  /** D179: the player's own voice: it never dies away quickly, stands a little forward, has a touch of chorus and vibrato. */
  lead?: boolean;
  /** D181, ORGANO PLENO: the note doubled an octave above and below, as on an organ's full stops. */
  pleno?: boolean;
  /** D182: a trill: the note alternating with the step above, about eight times a second. */
  trill?: boolean;
  /**
   * D213, the subject's colour (subject-fx.ts): a high shelf in dB (+ brighter, - duller; a timbre, not
   * a level), a crisper attack (0 to 1: a brief extra lift of the shelf, a quicker rise), a vibrato in
   * cents (a plucked note only a shimmer of 3), more room (a send to the reverb, 0 to 1), a detune in cents.
   */
  tone?: number;
  crisp?: number;
  vib?: number;
  room?: number;
  detune?: number;
  /** D223: where the note joins the sound in place of its bus (D299: no longer used by BLUETOOTH MODE). */
  into?: AudioNode;
  /** D252: false: not doubled by the coupling (the coupling's own notes). */
  couple?: boolean;
  /**
   * D311, the player's touch across its bar, as strength (0 the soft side, 1 the strong: touch-expr.ts STRONG_SIDE):
   * where it landed shapes the attack (Chip.note turns it into the fields below, by the preset's family),
   * and the note answers Sounding.shape (a sideways move while held). Unset: no expression (the band's notes).
   */
  touch?: number;
  /** D311: the piano's recording (layer 7 "soft", layer 12 "firm"), whatever the level. */
  layer?: "soft" | "firm" | "hard";
  /** D311: a lowpass on the note (Hz): the harpsichord's lute stop, the organ's echo manual, a singer's closed vowel. */
  lp?: number;
  /** D311: the harpsichord's lute (buff) stop: a muted, shorter pluck. */
  lute?: boolean;
  /** D349: PIPE ORGAN's echo manual (the player's touch): the note on the second manual's soft flutes. */
  echo?: boolean;
  /** D311: a pulse voice's width (0.125, 0.25, 0.5: thin, hollow, square; the SID's any between: `pwContinuous`). */
  pw?: number;
  pwContinuous?: boolean;
  /** D311: MEGA FM: the FM index scaled (the timbre throughout). */
  fmScale?: number;
  /** D311: BLEEPS AND BLOOPS: the mallet's hardness: the strike's FM burst and filter opening scaled. */
  strike?: number;
  /** D311: VOCAL SYNTH: the vowel, 0 closed (toward o or u) to 1 open (0.5 as the voice sings it). */
  open?: number;
  /** D311: how the note answers a held sideways move (set by Chip.note from `touch`). */
  hold?: HoldMode;
  /** D322: the harpsichord's registration: a second 8' choir and the 4' plucked with the note (registration.ts). */
  choirs?: Registered["choirs"];
  /**
   * D339: the piano's level as struck, dB (the band's: practice.ts pianoLevels; the player's: from
   * Play.level): a recording struck harder is brighter, not only louder (SampledInstrument.velTone).
   */
  vel?: number;
  /**
   * D339, the player's piano: the note's place in its legato group (0: struck after a gap, the group's
   * first; 1: the second, struck while the first still sounded; 2: later). A group's later note let go
   * before the next is a slur's end (released as a hand lifts: SampledInstrument.damper `slur`).
   */
  group?: number;
  /** D355: the band's colour here, by the piece's colour plan for the sound (colour.ts); never on the player's note. */
  colour?: Colour;
  /** D385: the piano's dampers this many times slower (a palette's half pedal; a trill's half-seated dampers, both strings ringing). */
  dampMul?: number;
  /** D385: the room's send scaled (a palette: drier for leggiero, larger for grave). */
  roomMul?: number;
  /**
   * D576: a second instrument in unison with this note (BACH BRASS's entries doubled: band-growth.ts), `level` of it, at
   * its own seat (`pan`), `late` s after (two players); the band's note and the player's alike, by the note's place alone.
   */
  unison?: { patch: Patch; level: number; late?: number; pan?: number; detune?: number };
  /** D385: the player's line on the piano: the reading's level here (dB about the middle), the touch's zone added (touch-expr.ts landing). */
  lineDb?: number;
  /** D426: a slid note on the piano (the hairpin slide): its level continuous across the strip (touch-expr.ts pianoHairpinDb), not the zones. */
  hairpin?: boolean;
  /** D385: the player's note is a reading's accent (">" +4, "^" +6 dB): what the strong zone gives it. */
  accentDb?: number;
  /** D385: a trill's note: the other pitch of its alternation; where both would sound one recording, this one takes the other neighbouring recording (no shared hammer). */
  altSample?: number;
  /** TRIAL (sound.ts registerAll): the printed level here (dB): the harpsichord's or the organ's registration terraced by it (registration.ts terraceStops). */
  terrace?: number;
  /** TRIAL: the hairpins' and the palette's dB here: a small brightness (sound.ts swellToneDb). */
  swell?: number;
  /**
   * D504: the basso continuo joins this note (Patch.continuo), by the piece's continuo script where the note
   * starts (trio.ts ContinuoScript: the music's structure, never the player's score); "strong": on a strong beat
   * (the harpsichord's octave below too). Unset: the bass alone.
   */
  continuo?: "on" | "strong";
  /**
   * D590: the stage of the piece's form where the note starts (stage.ts StageScript: the music's structure, never the
   * player's score): a staged sound's doubling parts (ContinuoPart.from) join it from their stage on. Unset: none join.
   */
  stage?: number;
  /**
   * D502, BACH BRASS's brassiness (0 mellow: the piano recording, darker; 1 blazing: the forte, brighter, a presence
   * shelf): the player's from the landing (touch-expr.ts landing "brass"); unset, the band's from its reading's level
   * (Play.vel: touch-expr.ts brassOf). Only an instrument with two layers (SampledInstrument.blend) hears it.
   */
  brass?: number;
}

/** D252, D322: notes sounding as one (the coupling's octave, the pedal's 16'): the second `shift` semitones from the first. */
function together([main, twin]: [Sounding, Sounding], shift = -12): Sounding {
  const both = [main, twin];
  return {
    stop: (t, how) => both.forEach((x) => x.stop(t, how)),
    bend: (cents) => both.forEach((x) => x.bend(cents)),
    glide: (m, tau) => (main.glide?.(m, tau), twin.glide?.(m + shift, tau)),
    muffle: () => both.forEach((x) => x.muffle?.()),
    dyn: (l) => both.forEach((x) => x.dyn?.(l)),
    shape: (x) => both.forEach((y) => y.shape?.(x)),
    trim: (l, at, until) => both.forEach((x) => x.trim?.(l, at, until)),
  };
}

/** D504: notes sounding as one (the continuo's instruments with the bass), each `shift` semitones from the first. */
function togetherAll(list: [Sounding, number][]): Sounding {
  const all = list.map(([s]) => s);
  return {
    stop: (t, how) => all.forEach((x, i) => (i === 0 ? x.stop(t, how) : x.stop(t))),
    bend: (cents) => all.forEach((x) => x.bend(cents)),
    glide: (m, tau) => list.forEach(([x, sh]) => x.glide?.(m + sh, tau)),
    muffle: () => all.forEach((x) => x.muffle?.()),
    dyn: (l) => all.forEach((x) => x.dyn?.(l)),
    shape: (x) => all[0].shape?.(x),
    trim: (l, at, until) => all.forEach((x) => x.trim?.(l, at, until)),
  };
}
/** D504: the harpsichord's octave below on a strong beat, against its unison (a left hand's lower note, a little lighter). */
export const CONTINUO_OCTAVE = 0.7;

/** D420: an organ note held (Chip.note), as it was asked for, its registration and what has been done to it since. */
interface Held {
  midi: number;
  at: number;
  end: number;
  v: Voicing;
  p: Play;
  sd: Sounding;
  reg: Registration;
  done: boolean;
  bend?: number;
  dyn?: number;
  shape?: number;
  muffled?: boolean;
}

/** D308: the longest time constant of a player's note let go (s): -40 dB in 4.6 of them, 115 ms. */
export const LIFT_TAU = 0.025;
/** D339: a piano string above the dampers (SampledInstrument.damper `undamped`) let go: it rings on, falling with this time constant (s). */
export const UNDAMPED_TAU = 0.6;

/** D405: the piano's dampers at most this many times slower (D389's sparing pedal, a trill's half-seated dampers). */
export const DAMP_MUL_MAX = 1.8;
/** D405: from C6 (MIDI 84) up, at most this (the top strings ring longest and brightest). */
export const DAMP_MUL_HIGH = 1.3;
export const DAMP_HIGH_FROM = 84;
/** D405: a damped piano string halted at most this long after its release (s): no tail left ringing. */
export const RELEASE_MAX_S = 1.5;
/** D405: the dampers' slowing a note takes (Play.dampMul), capped by register. */
export const dampMulFor = (midi: number, mul: number) => Math.max(0.5, Math.min(mul, midi >= DAMP_HIGH_FROM ? DAMP_MUL_HIGH : DAMP_MUL_MAX));

/** D302: VOCAL SYNTH's level against the other patches (its source normalised to its peak: measured, II/22 rendered offline). */
export const SING_GAIN = 3.4;

// D252: the player's own notes were a little brighter (2.5 dB) and louder (×1.12); D349, D358, D365: withdrawn, the player's notes the band's.

export interface Sounding {
  /** D427: `how`, a bowed note giving way to the next of its line (Patch.bow): a bow change or a slur (sound.ts giveWayFall); else its own release. */
  stop: (at?: number, how?: GiveWay) => void;
  /** Bend the note by some cents (the thumb's sideways wobble). */
  bend: (cents: number) => void;
  /** Glide to another pitch without a new attack (a held thumb slid on: glissando). D376: `tau`, the glide's time constant (s; the slide's own, glenn.ts slideGlideTau), else the sound's. */
  glide?: (midi: number, tau?: number) => void;
  /** Darken and soften it (a wrong gesture: Bach's note, but muffled). */
  muffle?: () => void;
  /** D179: the note's dynamic now (1 as struck), changed smoothly while it sounds (a swell, a diminuendo). */
  dyn?: (level: number) => void;
  /** D311: the thumb moved sideways while holding: -1 (toward the soft side) .. 1 (toward the strong) from where it landed (touch-expr.ts holdValue); smoothed. */
  shape?: (s: number) => void;
  /** D335 (the lab's DYNAMICS, the recorded instruments): the note's level set to `level` (a factor, 1 as struck) by a linear ramp from `at` to `until` (s, the audio clock): a strike read after the onset. */
  trim?: (level: number, at: number, until: number) => void;
}

/** The part of an AudioParam rampTrim uses (a test's fake has it too). */
export interface TrimParam {
  value: number;
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  cancelScheduledValues(t: number): unknown;
  cancelAndHoldAtTime?: (t: number) => unknown;
}
/** D335: a gain moved from `from` to `to` by a linear ramp over [at, until] (a step where until ≤ at), whatever was scheduled after `at` dropped: no click. */
export function rampTrim(a: TrimParam, from: number, to: number, at: number, until: number) {
  if (a.cancelAndHoldAtTime) a.cancelAndHoldAtTime(at);
  else a.cancelScheduledValues(at);
  a.setValueAtTime(from, at);
  if (until > at) a.linearRampToValueAtTime(to, until);
  else a.setValueAtTime(to, at);
}

/** D311: an automation taken from where it is now toward v, smoothly (no step, no zipper). */
function retarget(a: AudioParam, v: number, now: number, tau = TOUCH_TAU) {
  if (a.cancelAndHoldAtTime) a.cancelAndHoldAtTime(now);
  else (a.cancelScheduledValues(now), a.setValueAtTime(a.value, now));
  a.setTargetAtTime(v, now, tau);
}

/**
 * D540 (D190's, D503-D524's, taken out of Chip.prepare for the budget's test): the recordings the sound now needs for a piece,
 * as plans (each loaded with loadPlan): every instrument the ensemble plays, for every voice's pitches and the player's
 * own an octave either side, slimmed as the preset asks (Preset.slim: a plucked one's notes cut at `pluckedS`); every other
 * instrument's sets let go (a set another instrument now plays kept); the drums' sets the sound or the DRUMS `style` plays.
 */
export function soundPlans(pitches: number[], lead: number[], style: string | null, opening?: Opening): Plan[] {
  const now = sampledNow();
  const sl = preset().slim;
  const slimOf = (inst: SampledInstrument): PlanSlim | undefined => (sl ? { rate: sl.rate, ...(inst.plucked && sl.pluckedS ? { maxS: sl.pluckedS } : {}) } : undefined);
  // D540: a slimmed preset's sparse zones and its one layer (sampled.ts setZones, holdOff); any other sound's sets whole.
  const layers = (inst: SampledInstrument) => [inst.soft?.set, inst.hard?.set, inst.short?.set, inst.blend?.set].filter((s): s is string => !!s && s !== inst.set);
  const off = sl?.oneLayer ? new Set(now.flatMap((id) => layers(SAMPLED[id])).filter((set) => !sl.keep?.includes(set))) : new Set<string>();
  for (const id of Object.keys(SAMPLED) as (keyof typeof SAMPLED)[]) {
    const inst = SAMPLED[id];
    for (const set of [inst.set, ...layers(inst), inst.above?.set, inst.low, ...(inst.zones ?? []).map((z) => z.set)].filter((s): s is string => !!s)) setZones(set, sl?.stride && now.includes(id) ? (sl.strides?.[set] ?? sl.stride) : null);
  }
  holdOff(off);
  const used = now.map((id) => {
    const inst = SAMPLED[id];
    const s = slimOf(inst);
    // (A slimmed band plans no octave doubles of the player's line: ORGANO PLENO's, D181, is the organ's alone.)
    return planFor(inst, pitches, sl ? [] : lead)
      .filter((e) => !off.has(e.set))
      .map((e) => (s ? { ...e, slim: s } : e));
  });
  const wanted = new Set(used.flat().map((e) => e.set));
  // An instrument the ensemble no longer plays lets all its recordings go (but a set a playing instrument shares).
  const plans: Plan[] = [
    ...used,
    // (A layer held off is let go too: the original's soft grand, say, still held from the sound before.)
    ...[...off].filter((set) => !wanted.has(set)).map((set) => [{ set, notes: [] }]),
    ...(Object.keys(SAMPLED) as (keyof typeof SAMPLED)[])
      .filter((id) => !now.includes(id))
      .map((id) => {
        const inst = SAMPLED[id];
        return [inst.set, inst.soft?.set, inst.hard?.set, inst.short?.set, inst.blend?.set, inst.release, inst.low, inst.above?.set, ...(inst.zones ?? []).map((z) => z.set)].filter((s): s is string => !!s && !wanted.has(s)).map((set) => ({ set, notes: [] }));
      }),
  ];
  // D503: JAZZ QUARTET's brush kit (all of it: 19 short files), let go under any other sound.
  // D514: and, with DRUMS on, the chosen drummer's for the piece; the others let go.
  // D526: the drums that play: with DRUMS on the chosen style's (drum-library.ts; the sound's HOME by default), else
  // the sound's own band drummer's (D503 brushes, D520/D522 latin, D521 bossa, D523/D525 rock, D524 pet); the rest let go.
  const gl = grooveNow();
  const own = gl?.kit === "brushes" ? "brushes" : gl?.kit === "bossa" ? "bossa" : gl?.kit === "pet" ? "pet" : gl?.kit === "rock" ? "abbey" : gl?.kit === "latin" && LATIN_GROOVE[gl.groove] ? (LATIN_GROOVE[gl.groove] === "salsa" ? "salsa" : "choro") : null;
  const want = style ? drumFilesFor(style) : own ? drumFilesFor(own) : [];
  for (const set of [BRUSH_SET, "kitRock", "kitClub", "kitPeriod", TIMP_SET, LATIN_SET, ROCK_KIT_SET, BOSSA_KIT_SET]) plans.push([{ set, notes: [...new Set(want.filter((w) => w.set === set).flatMap((w) => w.notes))] }]);
  // D540: a slimmed band's drums at its rate too (their length their own: a cymbal rings).
  if (sl) for (const plan of plans.slice(used.length)) for (const e of plan) if (e.notes.length && !e.slim) e.slim = { rate: sl.rate };
  // D542: the opening's zones first: for each of the opening's notes the recording its voice's instrument plays it from (the
  // main set, the pitch guarded as it is played: no neighbours, no layers); the drums soon after (few and short), the rest last.
  if (opening?.notes.length) {
    const want = new Map<string, Set<number>>();
    for (const [v, midi] of opening.notes) {
      const pt = patchFor(v, opening.count);
      const inst = pt?.sample ? SAMPLED[pt.sample] : null;
      if (!inst) continue;
      const set = setFor(inst, midi);
      const near = nearestSample(set, soundingPitch(pt, midi));
      if (near === null) continue;
      if (!want.has(set)) want.set(set, new Set());
      want.get(set)!.add(near);
    }
    for (let i = 0; i < plans.length; i++)
      for (const e of plans[i]) {
        if (!e.notes.length) continue;
        if (i >= used.length) e.soon = true;
        else e.first = e.notes.filter((m) => want.get(e.set)?.has(m));
      }
  }
  return plans;
}
/** D542: the opening's notes (Chip.prepare `opening`): each voice's (voice, pitch) of its first `bars` bars of sound. */
export interface Opening {
  /** D578: the piece (its own line-up on the sound, Preset.pieces, set before its recordings are planned). */
  piece?: string;
  count: number;
  notes: readonly (readonly [voice: number, midi: number])[];
}
export function openingOf(f: TouchFugue, bars = 2): Opening {
  const start = Math.min(...f.voices.flat().map((n) => n[0]));
  const b0 = [...f.bars].reverse().find((b) => b.on <= start) ?? f.bars[0];
  const until = f.bars.find((b) => b.n === (b0?.n ?? 1) + bars)?.on ?? f.length;
  const notes: [number, number][] = [];
  f.voices.forEach((vs, v) => {
    for (const n of vs) if (n[0] < until && !notes.some(([w, m]) => w === v && m === n[2])) notes.push([v, n[2]]);
  });
  return { piece: f.id, count: f.voices.length, notes };
}


export class Chip {
  readonly ctx: AudioContext;
  private master: GainNode;
  private bus: AudioNode;
  /** D213: the reverb's input, for a note's own send (Play.room). */
  private roomIn: AudioNode;
  private waves = new Map<string, PeriodicWave>();
  private keepAlive: HTMLAudioElement | null = null;
  /** D381: the silent keep-alive <audio> (iPhone), watched for the system's pause when the headphones go. */
  get keepAliveAudio(): HTMLAudioElement | null {
    return this.keepAlive;
  }
  private wet: GainNode;
  /** D297: the shared room (unwired from the master while a preset with `room: 0` plays). */
  private room: ConvolverNode;
  /** D237: the volume (0..1) over the master's own level (0.4, D181). */
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.levelNow();
  }
  private volume = 1;
  /** D593: the piece's own level on the sound now (sound.ts pieceLevel), the whole mix's. */
  private pieceK = 1;
  /**
   * D593: a fugue's own level on the sound (Preset.levels), set as the piece starts (proto-game.ts) and when its
   * recordings are planned with its opening: at the master, so the band, the player, the rooms and the drums move alike.
   */
  pieceLevel(f: { id: string }) {
    this.pieceK = pieceLevel(preset().id, f.id, this.phone);
    this.levelNow();
  }
  private levelNow() {
    const k = this.volume * this.pieceK;
    this.master.gain.value = 0.4 * k;
    // D249: the notes' own sends to the room follow the volume too (they bypassed it).
    this.sends.gain.value = k;
    // D593: and a recording's way in (past the master) the piece's level.
    this.recIn.gain.value = this.pieceK;
  }
  /** D249: the notes' own room sends (Play.room), through the volume, into the room. */
  private sends: GainNode;
  /** D249: the true ceiling at the end of the chain (a tanh soft clip, 4x oversampled). */
  readonly ceiling: WaveShaperNode;
  private readonly phone = isPhone();
  /**
   * The delay between the audio clock and what the player hears and does, in seconds, measured by
   * tapping along (D173: Bluetooth headphones add a fifth of a second or more, which the system often
   * does not report). Null: none (D494: wired, 0 ms; the system's own figure, `outputLatency`, is never
   * taken off by itself: nothing compensates for Bluetooth unless the player taps a delay).
   */
  lag: number | null = null;
  /**
   * D223: the delay between drawing and what the player sees and does, in seconds, measured by tapping
   * along to a gem crossing a line (the screen's and the touch's own delay): the box and the road are
   * drawn this far ahead of the clock as heard. 0: none.
   */
  visual = 0;
  /** D210: the notes not yet ended (oldest first), and how many may sound at once. */
  private voices: Live[] = [];
  get cap(): number {
    return this.phone ? (sustainedSampled() ? VOICE_CAP.phoneSustained : VOICE_CAP.phone) : VOICE_CAP.computer;
  }
  /** D210: how many notes were let go early to keep within the cap (for the measurements); D211: how many failed to start. */
  stolen = 0;
  failed = 0;

  constructor() {
    // iOS: play through the silent switch (Safari 16.4+), as a game should.
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      /* not supported */
    }
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    const ctx = this.ctx;
    this.master = ctx.createGain();
    // D181: lower, and a limiter at the end, so many voices, a band and the room never clip (as they
    // did on an iPhone: the ensembles' voices and the drums add up past full scale).
    this.master.gain.value = 0.4;
    // The master's brightness, fixed. D482: no longer moved by the zones (ORGANO PLENO, CON FUOCO):
    // no sound depends on the streak, the combo, the accuracy or the hits.
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 6500;
    soften.Q.value = 0.5;
    const squeeze = ctx.createDynamicsCompressor();
    squeeze.threshold.value = -18;
    squeeze.ratio.value = 4;
    squeeze.attack.value = 0.005;
    squeeze.release.value = 0.2;
    // D249: the limiter lower and slower to let go (it clipped on an iPhone: the compressors' makeup
    // gain and no true ceiling), the trim lower, and a soft clip at the very end as the ceiling.
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -10;
    limit.knee.value = 0;
    limit.ratio.value = 20;
    limit.attack.value = 0.003;
    limit.release.value = 0.25;
    const trim = ctx.createGain();
    trim.gain.value = 0.7;
    const ceilIn = ctx.createGain();
    ceilIn.gain.value = 0.5;
    const ceiling = (this.ceiling = ctx.createWaveShaper());
    ceiling.curve = softClipCurve();
    ceiling.oversample = "4x";
    this.master.connect(soften).connect(squeeze).connect(limit).connect(trim).connect(ceilIn).connect(ceiling).connect(ctx.destination);
    // D536: the output's meter (sound.ts outputLevel, the studio's music-events.ts): read only when asked for.
    chipMeter(() => this.meterLevel(), setOutputLevel);
    // The room: a second of decaying noise, a little of it under everything (more for the bands).
    const room = (this.room = ctx.createConvolver());
    room.buffer = impulse(ctx, this.phone ? ROOM_S.phone : ROOM_S.computer);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.16;
    this.master.connect(room).connect(this.wet).connect(squeeze);
    this.sends = ctx.createGain();
    this.sends.connect(room);
    this.roomIn = this.sends;
    // D482: CON FUOCO's warm drive (D249) gone: a streak never changes the sound.
    // D540: the notes join the band's way in (straight to the master, or through a band's chain: Chip.period).
    this.bandIn = ctx.createGain();
    this.bandIn.connect(this.master);
    this.bus = this.bandIn;
    // D216: the player's own notes (lead) through their own level (KIMIKO: YOUR VOICE ON / SOFT / OFF),
    // and a recording's way in, past the room and the compressor (it has its own room), into the limiter.
    this.mine = ctx.createGain();
    this.mine.connect(this.bandIn);
    this.recIn = ctx.createGain();
    this.recIn.connect(limit);
  }

  /** D536: the meter on the output (post-limiter, past the soft clip), made on the first reading: none, no cost. */
  private meter: { an: AnalyserNode; buf: Float32Array<ArrayBuffer>; level: number; at: number } | null = null;
  /**
   * D536: the output's level now, 0..1 (the RMS of the last METER_FFT samples after the limiter and the ceiling, on a
   * dB scale from METER_FLOOR_DB to full scale; smoothed: quick to rise, METER_FALL_S to fall).
   */
  meterLevel(): number {
    if (!this.meter) {
      if (!this.ctx.createAnalyser) return 0;
      const an = this.ctx.createAnalyser();
      an.fftSize = METER_FFT;
      this.ceiling.connect(an);
      this.meter = { an, buf: new Float32Array(METER_FFT), level: 0, at: this.ctx.currentTime };
    }
    const m = this.meter;
    let sum = 0;
    if (m.an.getFloatTimeDomainData) {
      m.an.getFloatTimeDomainData(m.buf);
      for (let i = 0; i < m.buf.length; i++) sum += m.buf[i] * m.buf[i];
    }
    const rms = Math.sqrt(sum / m.buf.length);
    const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    const now = Math.max(0, Math.min(1, (db - METER_FLOOR_DB) / -METER_FLOOR_DB));
    const t = this.ctx.currentTime;
    const dt = Math.max(0, t - m.at);
    m.at = t;
    m.level = now >= m.level ? m.level + (now - m.level) * Math.min(1, dt / METER_RISE_S + 0.5) : m.level + (now - m.level) * Math.min(1, dt / METER_FALL_S);
    return Number.isFinite(m.level) ? m.level : 0;
  }

  /** D216: the player's own notes' level (1: as they are). */
  readonly mine: GainNode;
  /** D215: where a recording joins the sound (past the room and the compressor). */
  readonly recIn: GainNode;
  /**
   * Where a note joins the sound: the player's own (lead) through their level, the others straight to the master. D540: a
   * band's note into its patch's lane of the band's chain (Patch.lane, Preset.lanes), the player's through the lane's
   * own copy of their level.
   */
  private busOf(p: Play, pt?: Patch | null): AudioNode {
    if (p.into) return p.into;
    const lane = this.chain && pt ? this.laneOf(pt) : null;
    if (lane) {
      if (!p.lead) return lane;
      let m = this.laneMine.get(lane);
      if (!m) {
        m = this.ctx.createGain();
        m.connect(lane);
        this.laneMine.set(lane, m);
        this.chain!.nodes.push(m);
      }
      m.gain.value = this.mine.gain.value;
      return m;
    }
    return p.lead ? this.mine : this.bus;
  }
  /** D540: the band's chain playing now (a band preset's `chain`), built at its first note; its lanes' copies of `mine`. */
  private chain: BandChain | null = null;
  private laneMine = new Map<AudioNode, GainNode>();
  /** D540: where every note joins (the master, or the chain's input). */
  private bandIn: GainNode;
  /** D540: a patch's lane in the preset now (Preset.lanes by its id, else Patch.lane). */
  private laneOf(pt: Patch): AudioNode | null {
    const pr = preset();
    let name = pt.lane;
    if (pr.lanes) for (const [id, l] of Object.entries(pr.lanes)) if (PATCHES[id as keyof typeof PATCHES] === pt) name = l;
    return this.chain?.lane(name) ?? null;
  }
  /** D540: the band chain the preset now asks for, built or taken down (its tail let ring out, then disconnected). */
  private bandChain() {
    const spec = preset().chain ?? null;
    if ((this.chain?.spec ?? null) === spec) return;
    const old = this.chain;
    this.chain = null;
    this.laneMine.clear();
    try {
      this.bandIn.disconnect();
    } catch {
      /* none */
    }
    if (old) {
      const t = this.ctx.currentTime;
      const g = this.ctx.createGain();
      // The old chain rings out from its last notes (its input no longer fed), then is taken down.
      old.output.disconnect();
      old.output.connect(g).connect(this.master);
      g.gain.setValueAtTime(1, t);
      g.gain.setTargetAtTime(0, t + Math.min(2, old.tail), 0.2);
      setTimeout(() => (old.dispose(), g.disconnect()), (Math.min(2, old.tail) + 1.2) * 1000);
    }
    if (spec) {
      this.chain = buildChain(this.ctx, spec, { phone: this.phone });
      this.bandIn.connect(this.chain.input);
      this.chain.output.connect(this.master);
      if (this.lastBeatS) this.chain.setBeat(this.lastBeatS);
    } else this.bandIn.connect(this.master);
  }

  /** Where a voice of one's own joins the sound (the testbench's instruments, D170). */
  get input(): AudioNode {
    return this.bus;
  }

  /** A pulse of the given duty (as on the NES), built once. */
  wave(timbre: Timbre): PeriodicWave | "triangle" {
    if (timbre === "triangle") return "triangle";
    let w = this.waves.get(timbre);
    if (!w) {
      const duty = timbre === "pulse12" ? 0.125 : timbre === "pulse25" ? 0.25 : 0.5;
      const N = 48;
      const real = new Float32Array(N);
      const imag = new Float32Array(N);
      for (let n = 1; n < N; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(timbre, w);
    }
    return w;
  }

  /**
   * Call from a finished tap, a click or a key: browsers start audio only then. On an iPhone it also
   * starts a silent looping <audio>, which moves the page's sound to the media channel, so the ring/
   * silent switch does not mute the game (older iOS, without audioSession).
   */
  resume(): Promise<void> {
    if (!this.keepAlive && typeof Audio !== "undefined" && navigator.maxTouchPoints > 0) {
      try {
        const a = new Audio(silentWav());
        a.loop = true;
        a.setAttribute("playsinline", "");
        void a.play().catch(() => {});
        this.keepAlive = a;
      } catch {
        /* no <audio>: the switch may mute the game */
      }
    } else if (this.keepAlive?.paused) {
      // D191: iOS pauses it at an interruption (a call, Siri, the app in the background); played
      // again from the next gesture, or the switch would mute the game from then on.
      void this.keepAlive.play().catch(() => {});
    }
    return this.ctx.state === "running" ? Promise.resolve() : this.ctx.resume();
  }

  /** The audio clock as the ear hears it (the output's latency taken off), for drawing in sync. */
  heard(): number {
    return (this.smooth ? this.clock() : this.ctx.currentTime) - (this.lag ?? 0);
  }

  /**
   * D299: `heard()` on the smoothed clock (BLUETOOTH MODE sets it for its game). `currentTime` moves in
   * steps, one per block the system takes (larger and less regular on a Bluetooth route), so a picture
   * drawn from it each frame judders and a touch's time is off by up to a block.
   */
  smooth = false;
  private readonly smoothed = new SmoothClock();
  /** D299: the audio clock read smoothly (headphones.ts SmoothClock), for drawing and for timing touches. */
  clock(nowMs = performance.now()): number {
    return this.smoothed.read(this.ctx.currentTime, nowMs, this.ctx.state === "running");
  }

  /** A note from `at` for `dur` seconds; stop() cuts it short (the thumb let go). */
  /**
   * D252, the coupling (a prelude's LIFT, arc.ts): notes from `split` up doubled an octave above at `up`
   * (a 4′), notes below it an octave below at `down` (a 16′); 0 off. Set by the game as the music grows.
   */
  coupling = { up: 0, down: 0, split: 48 };

  /** D420: the organ notes sounding that a registration change reaches (the player's; every voice's under TUTTI). */
  private held: Held[] = [];
  private heldWatch: (() => void) | null = null;

  note(midi: number, at: number, dur: number, v: Voicing, p: Play = {}): Sounding {
    // D436: the sound's own level (Preset.gain, phoneGain: the quiet sounds matched), on every note.
    const pr = preset();
    const pg = (pr.gain ?? 1) * (this.phone ? (pr.phoneGain ?? 1) : 1);
    if (pg !== 1) v = { ...v, gain: v.gain * pg };
    // D631: the written pitch, on every patch (D504's compass no longer folds a note an octave nearer: trio.ts chooses the layout).
    midi = soundingPitch(v.patch, midi);
    const sd = this.noteNow(midi, at, dur, v, p);
    // D420: on the organ a registration changed under a held key reaches it (thumb pistons): the note kept to be taken up again.
    const id = preset().id;
    if (id !== "chamberOrgan" || p.couple === false || p.retake || !organPatchOf(v.patch)) return sd;
    const live = liveRegistration(id);
    if (!p.lead && !live.tutti) return sd;
    const h: Held = { midi, at, end: at + dur, v, p, sd, reg: bandRegistration(live, p), done: false };
    const now = this.ctx.currentTime;
    this.held = this.held.filter((x) => !x.done && x.end > now);
    this.held.push(h);
    this.heldWatch ??= onLiveRegistration((pid, reg) => {
      if (pid !== preset().id) return;
      const t = this.ctx.currentTime;
      this.held = this.held.filter((x) => !x.done && x.end > t);
      for (const x of this.held) {
        // A note scheduled ahead and not yet begun keeps what it was given (as every note did before; the lookahead is short).
        if (x.at > t) continue;
        const after = bandRegistration(reg, x.p);
        if (heldChange(pid, x.reg, after, x.v.patch, !!x.p.lead, x.midi)?.retake) this.retake(x);
        x.reg = after;
      }
    });
    return {
      stop: (t, how) => ((h.done = true), h.sd.stop(t, how)),
      bend: (c) => ((h.bend = c), h.sd.bend(c)),
      glide: sd.glide && ((m, tau) => ((h.midi = m), h.sd.glide?.(m, tau))),
      muffle: () => ((h.muffled = true), h.sd.muffle?.()),
      dyn: (l) => ((h.dyn = l), h.sd.dyn?.(l)),
      shape: (s) => ((h.shape = s), h.sd.shape?.(s)),
      trim: (l, a, u) => h.sd.trim?.(l, a, u),
    };
  }

  /**
   * D420: a held organ note under its new registration: the old pipes let go (their short release), the
   * new registration's pipes speaking from now, joined (Play.retake: no new chiff), the thumb's bend,
   * the note's dynamic and shape carried over.
   */
  private retake(h: Held) {
    const now = this.ctx.currentTime;
    if (h.done || now >= h.end) return;
    h.sd.stop(now);
    const sd = this.noteNow(h.midi, now, h.end - now, h.v, { ...h.p, retake: true });
    if (h.bend) sd.bend(h.bend);
    if (h.dyn !== undefined) sd.dyn?.(h.dyn);
    if (h.shape !== undefined) sd.shape?.(h.shape);
    if (h.muffled) sd.muffle?.();
    h.sd = sd;
  }

  private noteNow(midi: number, at: number, dur: number, v: Voicing, p: Play): Sounding {
    // D576: an entry's unison double (Play.unison: BACH BRASS's), sounding as one note with it: the second player's own
    // attack, a moment late, in its seat (no touch of its own: the band's note however the player's lands).
    const uni = p.unison;
    if (uni) {
      const late = uni.late ?? 0;
      const main = this.noteNow(midi, at, dur, v, { ...p, unison: undefined });
      const twin = this.noteNow(midi, at + late, Math.max(0.03, dur - late), { ...v, patch: uni.patch, ...(uni.pan !== undefined ? { pan: uni.pan } : {}) }, { ...p, unison: undefined, couple: false, lead: false, touch: undefined, trill: undefined, level: (p.level ?? 1) * uni.level, ...(uni.detune ? { detune: (p.detune ?? 0) + uni.detune } : {}) });
      return together([main, twin], 0);
    }
    // D311: the player's touch across its bar: its landing shapes the attack, by the preset's family.
    // TRIAL (sound.ts toneAll): the reading's planned level as the tone on a chip, console or synthesizer.
    // D432: on CLASSIC CHIP and GAME BOY the channel's volume step, its duty and a long note's vibrato (Chip.stepped), after the landing.
    const fresh = p.hold === undefined;
    // D512: STRING CONSORT's articulation stop (consort-stops.ts), read as the note starts (a change sounds from the
    // next note): the player's voice, every consort voice under its TUTTI. SPICCATO, PIZZICATO and TREMOLO their own
    // patch (before the landing: a plucked note answers no sway); CON SORDINO the mute, after it (below).
    const cons = p.couple === false || !hasConsortStops(preset().id) ? null : consortNote(preset().id, consortStop(preset().id), v.patch, !!p.lead);
    if (cons?.patch) v = { ...v, patch: cons.patch };
    const stepped = fresh && toneAll(preset().id) && STEPPED_SOUNDS.has(preset().id);
    const own = p.touch;
    if (fresh && !stepped && toneAll(preset().id)) [p, v] = this.toned(midi, v, p);
    if (p.touch !== undefined && p.hold === undefined) [p, v] = this.landed(midi, v, p, own);
    if (stepped) [p, v] = this.stepped(dur, v, p);
    // D252: the player's own a touch brighter and louder.
    // D349: not on the organ: the player's pipes are the band's (same manual, never louder).
    // D358: nor on one instrument or one ensemble (Patch.one: the owner's rule, SOUND-PRINCIPLES.md). D365: nor anywhere:
    // the consoles' and synthesizers' player's notes are the band's too (the lift, 1 dB and 2.5 dB of treble, withdrawn).
    // D322: the registration (the player's voice; every voice under TUTTI), read as the note starts: a change sounds from the next note.
    const id = preset().id;
    // D355: the band's colour by the piece's plan (colour.ts): its effects here, its stops as the band's registration (the player's own stops win).
    if (p.colour && !p.lead) [v, p] = coloured(id, p.colour, v, p);
    const live0 = liveRegistration(id);
    let live = bandRegistration(live0, p);
    // TRIAL (sound.ts registerAll): Busoni's printed level terraces the registration (the colour plan's stops, the
    // player's TUTTI and the player's own stops on the player's note win); his hairpins a little brightness.
    if (registerAll(id)) {
      if (p.terrace !== undefined && !(p.colour?.reg && !p.lead) && !live0.tutti && !(p.lead && live0.stops)) live = { stops: terraceStops(id, p.terrace), tutti: true };
      if (p.swell) p = { ...p, tone: (p.tone ?? 0) + swellToneDb(p.swell) };
    }
    const pedal = isPedal(v.patch);
    const reg = p.couple === false ? null : registeredNote(id, live, v.patch, !!p.lead, midi);
    // D536: a change of registration reported to the studio (music-events.ts), only while its stage is drawn.
    if (reg && musicLive()) this.noteRegistration(id, live, !!p.lead, at);
    if (reg) {
      if (reg.patch) v = { ...v, patch: reg.patch };
      if (reg.choirs) p = { ...p, choirs: reg.choirs };
      // The buff stop on every note so registered (the touch's own lute, D311, may darken it further).
      if (reg.lute) p = { ...p, lute: true, lp: Math.min(p.lp ?? LUTE_LP, LUTE_LP), hold: p.hold ?? "none" };
    }
    // D512: CON SORDINO, the mute on the bridge: darker (the touch's own lowpass may darken it further) and softer.
    if (cons?.lp) p = { ...p, lp: Math.min(p.lp ?? cons.lp, cons.lp), level: (p.level ?? 1) * (cons.level ?? 1), hold: p.hold ?? "none" };
    if (id === "chamberOrgan" && p.couple !== false) {
      // D482: ORGANO PLENO no longer draws the mixture (D349's crowning): a bonus earned by right notes never changes the sound.
      // D349, the echo manual (the player's touch toward the box): the note on the second manual's soft
      // flutes (Gedackt 8', Rohrflöte 4'), quieter and a little veiled (its lowpass: a Brustwerk behind its doors).
      if (p.echo && !pedal) v = { ...v, patch: PATCHES.orgFlute };
    }
    // D357: a rank under the note (Patch.under: the plenum pedal's Subbass 16'), sounding as one with it.
    const under = v.patch?.under;
    if (under && p.couple !== false) {
      const main = this.coupled(midi, at, dur, v, p);
      const twin = this.single(midi - 12, at, dur, { ...v, patch: under }, { ...p, couple: false });
      return together([main, twin], -12);
    }
    // D430: a second instrument on the same note (Patch.double: BAROQUE BAND's continuo harpsichord), in its own
    // seat and a moment late (its pluck heard as its own entrance); a slur's or a joined note's too (a harpsichordist
    // plays every note of the line: no bow to change).
    const dbl = v.patch?.double;
    if (dbl && p.couple !== false) {
      const main = this.coupled(midi, at, dur, v, p);
      const late = dbl.late ?? 0;
      const twin = this.single(midi, at + late, Math.max(0.03, dur - late), { ...v, patch: dbl.patch, ...(dbl.pan !== undefined ? { pan: dbl.pan } : {}) }, { ...p, couple: false, slur: false, bowChange: false, give: undefined, legato: false, level: (p.level ?? 1) * (this.phone ? (dbl.phoneLevel ?? dbl.level) : dbl.level) });
      return together([main, twin], 0);
    }
    // D504: the basso continuo on the bass line (Patch.continuo: ZELENKA TRIO's cello and harpsichord), only where the
    // piece's continuo script gives the note to it (Play.continuo: trio.ts, by the music's structure, the band's
    // note and the player's alike, never by the score); each in its seat, a moment late, at its level; on a strong
    // beat the harpsichordist's left hand takes the octave below too, spread from the bass up.
    // D590: a staged sound's parts (ContinuoPart.from) join from their stage of the form on (Play.stage), in unison.
    const cont = v.patch?.continuo?.filter((c) => (c.from === undefined ? !!p.continuo : (p.stage ?? -1) >= c.from && (c.until === undefined || (p.stage ?? -1) < c.until)));
    if (cont?.length && p.couple !== false) {
      const main = this.coupled(midi, at, dur, v, p);
      const parts: [Sounding, number][] = [[main, 0]];
      for (const c of cont) {
        const late = c.late ?? 0;
        // D631: the part in unison at the written pitch (D504's compass fold withdrawn); its octave below only within its compass.
        const m = soundingPitch(c.patch, midi);
        const cv: Voicing = { ...v, patch: c.patch, ...(c.pan !== undefined ? { pan: c.pan } : {}) };
        const plucked = !!(c.patch.sample && SAMPLED[c.patch.sample].plucked);
        const cp: Play = { level: (p.level ?? 1) * (this.phone ? (c.phoneLevel ?? c.level) : c.level), couple: false, ...(p.apart ? { apart: true } : {}), ...(p.vel !== undefined ? { vel: p.vel } : {}), ...(p.roomMul ? { roomMul: p.roomMul } : {}), ...(!plucked && p.tie ? { tie: p.tie } : {}), ...(!plucked && p.legato ? { legato: true } : {}) };
        const low = c.octave && p.continuo === "strong" && c.patch.compass ? m - 12 >= c.patch.compass.lo : false;
        if (low) parts.push([this.single(m - 12, at + late, Math.max(0.03, dur - late), cv, { ...cp, level: (cp.level ?? 1) * CONTINUO_OCTAVE }), m - 12 - midi]);
        const up = late + (low ? (c.spread ?? 0) : 0);
        parts.push([this.single(m, at + up, Math.max(0.03, dur - up), cv, cp), m - midi]);
      }
      return togetherAll(parts);
    }
    return this.coupled(midi, at, dur, v, p);
  }

  /** D252: a note with the coupling's octave where it is on (a prelude's LIFT). */
  private coupled(midi: number, at: number, dur: number, v: Voicing, p: Play): Sounding {
    const c = this.coupling;
    const g = p.couple === false ? 0 : midi >= c.split ? c.up : c.down;
    if (g > 0.01) {
      const main = this.single(midi, at, dur, v, p);
      const twin = this.single(midi >= c.split ? midi + 12 : midi - 12, at, dur, v, { ...p, couple: false, level: (p.level ?? 1) * g });
      return together([main, twin], midi >= c.split ? 12 : -12);
    }
    return this.single(midi, at, dur, v, p);
  }

  /**
   * TRIAL (sound.ts toneAll, EXPRESSIVE_ALL): a reading's planned level (dB) on a chip, console or synthesizer
   * made its tone, by family, through the touch's own parameters (touch-expr.ts landing at a strength moved
   * by dB / TONE_DB_SPAN): (D432: CLASSIC CHIP and GAME BOY now by Chip.stepped; the trials gave them the pulse width, 12.5, 25, 50% as p to f, and, louder, a
   * little vibrato); SID 64 its PWM width and its filter's cutoff; MEGA FM the FM index (×0.62-1.62); SWITCHED-ON
   * and TOMITA the filter's cutoff and its envelope's opening (Play.bright); SUPER 16-BIT, NOCTURNE 32-BIT and
   * TRACKER a brightness and the echo's send; BLEEPS AND BLOOPS the mallet's hardness. Its loudness a quarter of
   * the plan's (within ±2 dB). The player's note: its landing moved so (the touch kept); the band's: the plan's
   * dB alone (Play.vel, phrasing.ts) as a landing.
   */
  private toned(midi: number, v: Voicing, p: Play): [Play, Voicing] {
    const id = preset().id;
    const kind = touchKind(id);
    const db = p.touch !== undefined ? p.lineDb : p.vel;
    if (!kind || db === undefined || !Number.isFinite(db)) return [p, v];
    const x = Math.max(0, Math.min(1, (p.touch ?? TOUCH_NEUTRAL) + db / TONE_DB_SPAN));
    const pt = v.patch ?? null;
    let q: Play = { ...p };
    // The band's level already carries its quarter (phrasing.ts); the player's line here.
    if (p.touch !== undefined) q.level = (p.level ?? 1) * 10 ** (toneLevelDb(db) / 20);
    if (kind === "chip" && !pt?.fm) q.vib = (q.vib ?? 0) + Math.max(0, Math.min(8, db)) * 1.2;
    if (id === "sid64") q.bright = BRIGHT_SPAN.chip * (x - 0.5);
    if (kind === "console") q.roomMul = (q.roomMul ?? 1) * Math.max(0.6, Math.min(1.5, 1 + db / 24));
    if (p.touch !== undefined) return [{ ...q, touch: x }, v];
    const l = landing(kind, x, midi, pt, !pt && v.timbre !== "triangle");
    for (const k of ["bright", "pw", "pwContinuous", "fmScale", "strike"] as const) if (l[k] !== undefined) (q as Record<string, unknown>)[k] = l[k];
    if (!pt && v.timbre !== "triangle" && l.pw !== undefined) v = { ...v, timbre: pulseWave(l.pw) };
    return [q, v];
  }

  /**
   * D432 (sound.ts STEPPED_SOUNDS): Busoni's planned level on CLASSIC CHIP and GAME BOY as a chip composer writes
   * it: the channel's volume step (chipVolume: the level quantised to the 4-bit register), the duty a step wider
   * at f and narrower at p (dutyStep: CLASSIC CHIP's pulse voicing, GAME BOY's pulse patches' Play.pw), and a
   * vibrato (VIB_F_CENTS) on a long note at f. The bass is left as it is (the triangle has no volume). The
   * band's notes' level (Play.vel) and the player's line (Play.lineDb), the player's own landing kept.
   */
  private stepped(dur: number, v: Voicing, p: Play): [Play, Voicing] {
    const db = p.touch !== undefined ? p.lineDb : p.vel;
    if (db === undefined || !Number.isFinite(db) || v.bass) return [p, v];
    const q: Play = { ...p, level: (p.level ?? 1) * (chipVolume(db) / VOLUME_MID) };
    const pt = v.patch ?? null;
    if (!pt && v.timbre !== "triangle") v = { ...v, timbre: pulseWave(dutyStep(widthOf(v.timbre) ?? 0.25, db)) };
    else if (pt && !pt.pwm) {
      const w = pt.osc.find((o) => o.wave === "pulse12" || o.wave === "pulse25" || o.wave === "pulse50")?.wave;
      if (w) q.pw = dutyStep(q.pw ?? widthOf(w) ?? 0.25, db);
    }
    if (db >= DUTY_UP_DB && dur >= VIB_F_MIN_S) q.vib = Math.max(q.vib ?? 0, VIB_F_CENTS);
    return [q, v];
  }

  /**
   * D311: a landing turned into the note's attack (touch-expr.ts landing: the piano's layer and level,
   * the lute stop, the echo manual, the vowel, the pulse width, the FM index, the filter's brightness,
   * the mallet's hardness) and how it will answer a sideways move (`hold`). The brightness replaces the
   * touch's (D293 left it at the neutral dynamic's); the level and tone multiply and add.
   */
  private landed(midi: number, v: Voicing, p: Play, own = p.touch): [Play, Voicing] {
    const kind = touchKind(preset().id);
    if (!kind) return [{ ...p, hold: "none" }, v];
    const pt = v.patch ?? null;
    const pulse = !pt && v.timbre !== "triangle";
    const l0 = landing(kind, p.touch ?? TOUCH_NEUTRAL, midi, pt, pulse, { lineDb: p.lineDb, accentDb: p.accentDb, ...(p.hairpin ? { hairpin: true } : {}) });
    // D349: the pedal has no echo manual (an organist's feet stay on the one pedalboard); D511: the swell box's brightness it has.
    const l = kind === "organ" && isPedal(pt) ? (l0.tone ? { tone: l0.tone } : {}) : l0;
    const inst = pt?.sample ? SAMPLED[pt.sample] : null;
    const plucked = inst ? inst.plucked : pt ? pt.amp.s === 0 : false;
    const q: Play = { ...p, hold: holdMode(kind, pt, plucked) };
    if (l.level !== undefined) q.level = (p.level ?? 1) * l.level;
    // D511: the landing's level on every offered sound (TOUCH_LEVEL_DB), from where the thumb landed (`own`: not moved by the reading's tone).
    const tl = touchLevelDb(preset().id, own ?? TOUCH_NEUTRAL);
    if (tl) q.level = (q.level ?? p.level ?? 1) * 10 ** (tl / 20);
    // TRIAL (sound.ts EXPRESSIVE_ALL): the reading's line level on a sustaining sound (the piano's own is in its landing, pianoDb).
    // (D503: JAZZ QUARTET's landing has the line's level in it, as the piano's.)
    if (kind !== "piano" && kind !== "jazz" && p.lineDb !== undefined && expressiveAll(preset().id)) q.level = (q.level ?? p.level ?? 1) * 10 ** (p.lineDb / 20);
    if (l.tone) q.tone = (p.tone ?? 0) + l.tone;
    if (l.bright !== undefined) q.bright = l.bright;
    // D385: the piano's colour by the level struck (the line's and the zone's), when the note has none of its own.
    if (l.vel !== undefined && p.vel === undefined) q.vel = l.vel + 20 * Math.log10(Math.max(1e-3, p.level ?? 1));
    for (const k of ["layer", "lp", "lute", "pw", "pwContinuous", "fmScale", "strike", "open", "echo", "soft", "brass"] as const) if (l[k] !== undefined) (q as Record<string, unknown>)[k] = l[k];
    // The classic chip: the pulse of that width (its level by the chip's own table: voiceNote).
    if (pulse && l.pw !== undefined) v = { ...v, timbre: pulseWave(l.pw) };
    return [q, v];
  }

  /**
   * D349, an organ's pipe (Patch.pipe): the note placed by its key in the case (the C side left of the
   * voice's place, the C♯ side right), its pipe a fixed fraction of a cent from true (by key: the same
   * pipe whoever plays it), on a phone the patch's upper ranks added; and a joined note's pipe speaking
   * anew (its own attack and chiff: another pipe; the organist's legato is in the release, Play.tie).
   */
  private piped(midi: number, v: Voicing, pt: Patch, p: Play): [Voicing, Patch, Play] {
    const pp = pt.pipe!;
    const side = (((midi % 12) + 12) % 12) % 2 === 0 ? -1 : 1;
    const h = Math.sin(midi * 12.9898 + 4.1414) * 43758.5453;
    const cents = ((h - Math.floor(h)) * 2 - 1) * pp.cents;
    const pt2 = this.phone && pp.phoneOsc ? { ...pt, osc: [...pt.osc, ...pp.phoneOsc] } : pt;
    return [{ ...v, pan: Math.max(-1, Math.min(1, v.pan + side * pp.case)) }, pt2, { ...p, legato: !!p.retake, detune: (p.detune ?? 0) + cents }];
  }

  /**
   * D357, a reed's body (Patch.reed): its formant (a peak), its compass (a low shelf at twice the note,
   * fuller low, thinner high) and, on a new note, the tongue's rattle (the level beaten by a square wave
   * for a moment). The gestures scaled by the reed's share of the chorus.
   */
  private reedBody(src: AudioNode, r: NonNullable<Patch["reed"]>, f0: number, midi: number, t: number, joined: boolean, bag: Bag): AudioNode {
    const ctx = this.ctx;
    const k = r.share ?? 1;
    const pk = bag.add(ctx.createBiquadFilter());
    pk.type = "peaking";
    pk.frequency.value = r.formant;
    pk.Q.value = r.q;
    pk.gain.value = r.db * k;
    const sh = bag.add(ctx.createBiquadFilter());
    sh.type = "lowshelf";
    sh.frequency.value = Math.min(4000, f0 * 2);
    const x = Math.max(0, Math.min(1, (midi - 36) / 48));
    sh.gain.value = (r.compass.low + (r.compass.high - r.compass.low) * x) * k;
    let out: AudioNode = src.connect(pk).connect(sh);
    if (!joined && r.rattle.depth > 0) {
      const rg = bag.add(ctx.createGain());
      rg.gain.value = 1;
      const lfo = bag.src(ctx.createOscillator());
      lfo.type = "square";
      lfo.frequency.value = r.rattle.rate;
      const d = bag.add(ctx.createGain());
      d.gain.setValueAtTime((r.rattle.depth * k) / 2, t);
      d.gain.setTargetAtTime(0, t + 0.004, r.rattle.time / 3);
      lfo.connect(d).connect(rg.gain);
      lfo.start(t);
      halt(lfo, t + r.rattle.time * 1.5 + 0.02);
      out = out.connect(rg);
    }
    return out;
  }

  /** D311: the player's note's expression stage: the landing's lowpass, and for holding a swell (messa di voce) or a wah's peak (at rest, none). */
  private touchStage(src: AudioNode, p: Play, f0: number, bag: Bag): { out: AudioNode; messa?: GainNode; wah?: { node: BiquadFilterNode; f0: number }; breath?: { gain: GainNode; shelf: BiquadFilterNode } } {
    const ctx = this.ctx;
    let out = src;
    if (p.lp) {
      const f = bag.add(ctx.createBiquadFilter());
      f.type = "lowpass";
      f.Q.value = 0.7071;
      f.frequency.value = p.lp;
      out = out.connect(f);
    }
    let wah: { node: BiquadFilterNode; f0: number } | undefined;
    let messa: GainNode | undefined;
    if (p.hold === "wah") {
      const node = bag.add(ctx.createBiquadFilter());
      node.type = "peaking";
      node.Q.value = WAH_Q;
      node.frequency.value = wahAt(0, f0).hz;
      node.gain.value = 0;
      out = out.connect(node);
      wah = { node, f0 };
    }
    if (p.hold === "messa" || p.hold === "swell") {
      messa = bag.add(ctx.createGain());
      messa.gain.value = 1;
      out = out.connect(messa);
    }
    // D504: a wind's swell (touch-expr.ts "breath"): the level and, with it, the brightness (a high shelf).
    let breath: { gain: GainNode; shelf: BiquadFilterNode } | undefined;
    if (p.hold === "breath") {
      const gain = bag.add(ctx.createGain());
      gain.gain.value = 1;
      const shelf = bag.add(ctx.createBiquadFilter());
      shelf.type = "highshelf";
      shelf.frequency.value = Math.max(1500, Math.min(4000, f0 * 4));
      shelf.gain.value = 0;
      out = out.connect(gain).connect(shelf);
      breath = { gain, shelf };
    }
    return { out, messa, wah, breath };
  }

  /** D311: the player's vibrato (in place of the voice's own): `base` cents after `delay`, its depth then the thumb's (vibDepth). */
  private touchVibrato(params: AudioParam[], t: number, base: number, delay: number, rate: number, bag: Bag, lfos: AudioScheduledSourceNode[]): GainNode | null {
    if (!params.length) return null;
    const lfo = bag.src(this.ctx.createOscillator());
    lfos.push(lfo);
    lfo.frequency.value = rate;
    const depth = bag.add(this.ctx.createGain());
    depth.gain.setValueAtTime(0, t);
    if (base > 0) {
      depth.gain.setValueAtTime(0, t + delay);
      depth.gain.linearRampToValueAtTime(base, t + delay + 0.25);
    }
    lfo.connect(depth);
    for (const p of params) depth.connect(p);
    lfo.start(t);
    return depth;
  }

  /** D311: a held note's answer to the thumb's sideways move (Sounding.shape), from the parts it has. */
  private touchShape(parts: { messa?: GainNode; wah?: { node: BiquadFilterNode; f0: number }; vib?: { depth: GainNode; base: number }; trem?: { lfo: OscillatorNode; rate: number }; breath?: { gain: GainNode; shelf: BiquadFilterNode }; breathVib?: GainNode; swell?: boolean; blend?: { forte: GainNode; piano: GainNode; b0: number } }, live: () => boolean): (s: number) => void {
    const ctx = this.ctx;
    return (s: number) => {
      if (!live()) return;
      const now = ctx.currentTime;
      // D502: BACH BRASS's swell: its own range (±BRASS_SWELL_DB), the layers' crossfade following (brighter as it swells).
      if (parts.messa) parts.messa.gain.setTargetAtTime(parts.swell ? swellGain(s) : messaGain(s), now, TOUCH_TAU);
      if (parts.blend) {
        const mx = brassMix(swellBrass(parts.blend.b0, s));
        parts.blend.forte.gain.setTargetAtTime(mx.forte, now, TOUCH_TAU);
        parts.blend.piano.gain.setTargetAtTime(mx.piano, now, TOUCH_TAU);
      }
      if (parts.breath) {
        parts.breath.gain.gain.setTargetAtTime(breathGain(s), now, TOUCH_TAU);
        parts.breath.shelf.gain.setTargetAtTime(breathTone(s), now, TOUCH_TAU);
      }
      if (parts.breathVib) retarget(parts.breathVib.gain, breathVib(0, s), now);
      if (parts.wah) {
        const w = wahAt(s, parts.wah.f0);
        parts.wah.node.frequency.setTargetAtTime(w.hz, now, TOUCH_TAU);
        parts.wah.node.gain.setTargetAtTime(w.db, now, TOUCH_TAU);
      }
      if (parts.vib) retarget(parts.vib.depth.gain, vibDepth(parts.vib.base, s), now);
      if (parts.trem) parts.trem.lfo.frequency.setTargetAtTime(tremRate(parts.trem.rate, s), now, TOUCH_TAU);
    };
  }

  private single(midi: number, at: number, dur: number, v: Voicing, p: Play): Sounding {
    // D210: within the cap (the oldest let go first), and every node disconnected once the note has ended.
    const t = Math.max(at, this.ctx.currentTime);
    this.makeRoom(t);
    this.sweep();
    const bag = new Bag();
    let sd: Sounding;
    try {
      this.period();
      sd = this.voiceNote(midi, at, dur, v, p, bag);
    } catch {
      // D211: one note's failure is never the others' (the scheduler goes on to the next).
      this.failed++;
      // D345: and what it had built is let go (a source never started never reports an end).
      bag.release();
      return { stop: () => {}, bend: () => {} };
    }
    if (bag.done) return sd;
    // D211: a note counts against the cap only until its written end (and a moment of its tail), not
    // until its nodes report their end: where a browser is slow to report it (or never does), the
    // count grew past the cap and every new note cut the oldest still sounding: the long notes of
    // the other voices went silent and the fugue sounded as if on one monophonic instrument.
    const entry: Live = { at: t, until: Math.max(t, at + dur) + 0.4, lead: !!p.lead, stolen: false, sd, w: bag.weight };
    this.voices.push(entry);
    bag.onDone = () => {
      const i = this.voices.indexOf(entry);
      if (i >= 0) this.voices.splice(i, 1);
    };
    const stop = sd.stop;
    sd.stop = (when?: number, how?: GiveWay) => {
      entry.until = Math.min(entry.until, (when ?? this.ctx.currentTime) + 0.4);
      stop(when, how);
    };
    return sd;
  }

  private sweptAt = -Infinity;
  /** D345: every sound past its own schedule let go, reported ended or not (Bag.sweep), twice a second at most. */
  sweep() {
    const now = this.ctx.currentTime;
    if (now - this.sweptAt < SWEEP_EVERY_S) return;
    this.sweptAt = now;
    Bag.sweep(this.ctx);
  }

  /** D210: the notes sounding (not let go to make room, not past their end). */
  sounding(t = this.ctx.currentTime): number {
    let n = 0;
    for (const v of this.voices) if (!v.stolen && v.until > t) n += v.w;
    return n;
  }

  /**
   * D213: the subject's high shelf (Play.tone, dB) and its crisp attack (Play.crisp: the shelf lifted a
   * few dB more for the first 50 ms), one filter; none when neither is asked for.
   */
  private shelf(src: AudioNode, hzAt: number, t: number, db: number, crisp: number, bag: Bag): AudioNode {
    if (!db && !crisp) return src;
    const sh = bag.add(this.ctx.createBiquadFilter());
    sh.type = "highshelf";
    sh.frequency.value = hzAt;
    if (crisp > 0) {
      sh.gain.setValueAtTime(db + crisp * 6, t);
      sh.gain.setTargetAtTime(db, t + 0.004, 0.045);
    } else sh.gain.value = db;
    return src.connect(sh);
  }
  /** D213: a vibrato of `cents` on the pitches given, after a moment (Play.vib); two nodes, stopped with the note. */
  private vibrato(params: AudioParam[], t: number, end: number, cents: number, bag: Bag, lfos: AudioScheduledSourceNode[]) {
    if (!cents || !params.length || end - t < 0.3) return;
    const lfo = bag.src(this.ctx.createOscillator());
    lfos.push(lfo);
    lfo.frequency.value = 5.3;
    const depth = bag.add(this.ctx.createGain());
    depth.gain.setValueAtTime(0, t);
    depth.gain.setValueAtTime(0, t + 0.15);
    depth.gain.linearRampToValueAtTime(cents, t + 0.4);
    lfo.connect(depth);
    for (const p of params) depth.connect(p);
    lfo.start(t);
  }
  /** D213: a note's own send to the room (Play.room), one gain. */
  private send(from: AudioNode, amount: number | undefined, bag: Bag) {
    if (!amount) return;
    const g = bag.add(this.ctx.createGain());
    g.gain.value = amount;
    // D339: where the shared room is off (a preset with its own reverb, as the piano's salon), into that reverb.
    from.connect(g).connect((this.dry ? this.fxInput() : null) ?? this.roomIn);
  }

  /** D297: a note's send to its preset's own effect (Patch.send), one gain; nothing where the preset has none. */
  private fxSend(from: AudioNode, amount: number | undefined, bag: Bag) {
    if (!amount) return;
    const into = this.fxInput();
    if (!into) return;
    const g = bag.add(this.ctx.createGain());
    g.gain.value = amount;
    from.connect(g).connect(into);
  }

  /** D297: the period presets' effect now (Preset.fx), built at its first note, its nodes (the input first, the return last). */
  private fx: { kind: FxKind; nodes: AudioNode[]; room: RoomId | null; seconds: number } | null = null;
  /** D297: whether the shared room is off (a preset with `room: 0`). */
  private dry = false;
  /**
   * D297, at every note: the period presets' state set from the preset now. A preset with `room: 0`
   * plays without the shared room (its input unwired: the convolver idles); the effect of another
   * preset is taken down (its nodes disconnected) once a note of a preset without it is played.
   */
  private period() {
    const pr = preset();
    this.bandChain();
    const dry = pr.room === 0;
    if (dry !== this.dry) {
      this.dry = dry;
      const t = this.ctx.currentTime;
      this.wet.gain.cancelScheduledValues(t);
      this.wet.gain.setValueAtTime(dry ? 0 : 0.16, t);
      this.roomGoal = NaN;
      if (dry) this.master.disconnect(this.room);
      else this.master.connect(this.room);
    }
    if (this.fx && this.fx.kind !== pr.fx) {
      for (const n of this.fx.nodes)
        try {
          n.disconnect();
        } catch {
          /* already */
        }
      this.fx = null;
    } else if (this.fx && this.fx.room !== roomOf(pr.id)) {
      // D357: another ROOM: no new sound into the old one, its tail left to ring out, then taken down.
      const old = this.fx;
      this.fx = null;
      const t = this.ctx.currentTime;
      const input = old.nodes[0] as GainNode;
      input.gain.setTargetAtTime(0, t, 0.01);
      setTimeout(() => {
        for (const n of old.nodes)
          try {
            n.disconnect();
          } catch {
            /* already */
          }
      }, (old.seconds + 0.5) * 1000);
    }
  }

  /** D297: the input of the preset's own effect (built once, kept while the preset plays), or null. */
  private fxInput(): AudioNode | null {
    // D540: a band's own reverb (its chain's one convolver) in place of the preset's effect.
    if (this.chain?.send) return this.chain.send;
    const kind = preset().fx;
    if (!kind) return null;
    const room = roomOf(preset().id);
    if (this.fx?.kind === kind && this.fx.room === room) return this.fx.nodes[0];
    const ctx = this.ctx;
    const node = <T extends AudioNode>(n: T, nodes: AudioNode[]) => (nodes.push(n), n);
    const filter = (type: BiquadFilterType, f: number, q: number, nodes: AudioNode[]) => {
      const b = node(ctx.createBiquadFilter(), nodes);
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    const nodes: AudioNode[] = [];
    let seconds = 0.5;
    const input = node(ctx.createGain(), nodes);
    const ret = ctx.createGain();
    if (kind === "spc" || kind === "echo") {
      // An echo (ECHOES): e.g. the SNES's (§6.1; D302: longer and in stereo): each side its own delay,
      // its output, through the FIR's stand-in (a lowpass and a high-pass), both heard and fed back
      // into the other side's delay (each repeat darker, softer, and across the stereo field).
      const E = ECHOES[kind];
      const merge = node(ctx.createChannelMerger(2), nodes);
      const side = (time: number) => {
        const sum = node(ctx.createGain(), nodes);
        const delay = node(ctx.createDelay(0.5), nodes);
        delay.delayTime.value = time;
        const lp = filter("lowpass", E.lp, 0.5, nodes);
        const hp = filter("highpass", E.hp, 0.5, nodes);
        const fb = node(ctx.createGain(), nodes);
        fb.gain.value = E.feedback;
        input.connect(sum).connect(delay).connect(lp).connect(hp).connect(fb);
        return { sum, hp, fb };
      };
      const l = side(E.delay);
      const r = side(E.right);
      l.fb.connect(r.sum);
      r.fb.connect(l.sum);
      l.hp.connect(merge, 0, 0);
      r.hp.connect(merge, 0, 1);
      merge.connect(ret);
    } else {
      // A reverb (REVERBS): e.g. the PlayStation's hall (§6.2): the sends pre-delayed 25 ms and
      // high-passed at 350 Hz (the organ's pedal does not flood the tail), a dark generated impulse,
      // the return lowpassed at 5.5 kHz (its half-rate core).
      // D357: PIPE ORGAN's church as the ROOM button sets it (room.ts), its send's level on the input.
      const r = room ? roomReverb(REVERBS[kind], room) : REVERBS[kind];
      if (room) input.gain.value = ROOMS[room].send;
      seconds = this.phone ? r.phoneSeconds : r.seconds;
      if (r.echo) {
        const e = r.echo;
        const sum = node(ctx.createGain(), nodes);
        const delay = node(ctx.createDelay(1), nodes);
        delay.delayTime.value = e.delay;
        const lp = filter("lowpass", e.lp, 0.5, nodes);
        const fb = node(ctx.createGain(), nodes);
        fb.gain.value = e.feedback;
        const lvl = node(ctx.createGain(), nodes);
        lvl.gain.value = e.level;
        input.connect(sum).connect(delay).connect(lp);
        lp.connect(fb).connect(sum);
        lp.connect(lvl).connect(ret);
      }
      const pre = node(ctx.createDelay(0.1), nodes);
      pre.delayTime.value = r.predelay;
      const hp = filter("highpass", this.phone ? (r.phoneHp ?? r.hp) : r.hp, 0.7071, nodes);
      const conv = node(ctx.createConvolver(), nodes);
      conv.buffer = darkHall(ctx, this.phone ? r.phoneSeconds : r.seconds, this.phone ? (r.phoneRt60 ?? r.rt60) : r.rt60, r.brightness);
      const lp = filter("lowpass", r.lp, 0.7071, nodes);
      input.connect(pre).connect(hp).connect(conv).connect(lp).connect(ret);
    }
    // The return through the master (the volume, the limiter), not into the shared room.
    ret.connect(this.master);
    nodes.push(ret);
    this.fx = { kind, nodes, room, seconds };
    return input;
  }

  /** D302, MEGA FM: a modulator fed back on itself by `fb` (sin(x + fb·sin(x + fb·sin x)): the YM2612's operator feedback, nearer a sawtooth as fb grows), built once per amount. */
  private feedback(fb: number): PeriodicWave {
    const key = `fb${fb}`;
    let pw = this.waves.get(key);
    if (!pw) {
      const { real, imag } = harmonicsOf((x) => Math.sin(2 * Math.PI * x + fb * Math.sin(2 * Math.PI * x + fb * Math.sin(2 * Math.PI * x))));
      pw = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(key, pw);
    }
    return pw;
  }

  /** D297: a staircase of 2^bits levels over -1..1 for a WaveShaper (Patch.bits), built once per depth. */
  private stairCurves = new Map<number, Float32Array<ArrayBuffer>>();
  private stairs(bits: number): Float32Array<ArrayBuffer> {
    let c = this.stairCurves.get(bits);
    if (!c) this.stairCurves.set(bits, (c = stairCurve(bits)));
    return c;
  }

  /** D210: at the cap, the oldest notes (never the player's own) let go at `t`, quickly. */
  private makeRoom(t: number) {
    // Entries long past their end (their end never reported) are forgotten.
    if (this.voices.length > 4 * this.cap) this.voices = this.voices.filter((v) => v.until > t - 2);
    let n = this.sounding(t);
    while (n >= this.cap) {
      let old: Live | null = null;
      for (const v of this.voices) if (!v.stolen && !v.lead && v.until > t && (!old || v.at < old.at)) old = v;
      if (!old) return;
      old.stolen = true;
      try {
        old.sd.stop(t);
      } catch {
        /* D211: never break off the new note */
      }
      this.stolen++;
      n -= old.w;
    }
  }

  private voiceNote(midi: number, at: number, dur: number, v: Voicing, p: Play, bag: Bag): Sounding {
    // D190: a recorded instrument plays its recording once loaded; until then (or where it cannot be
    // had) the patch's synthesized sound stands in, so no note is lost.
    const inst = v.patch?.sample ? SAMPLED[v.patch.sample] : null;
    // D297: an organ's manual above its pedal's compass (sampled.ts setFor).
    const main = inst ? setFor(inst, midi) : "";
    if (v.patch && inst && !setUnreachable(main)) {
      // D631: the written pitch, read from the nearest recording (D405's and D505's octave folds withdrawn: sampled.ts reachOf).
      midi = soundingPitch(v.patch, midi);
      let near = nearestSample(main, midi);
      // D385: a piano trill's two pitches never from one recording: the one not recorded itself takes the other
      // neighbouring recording (G#4 from F#4 up where A4 sounds A4), where that recording is loaded.
      if (p.altSample !== undefined && near !== null && near !== midi && nearestSample(main, p.altSample) === near && !(near !== p.altSample && midi < p.altSample)) {
        const other = nearestSample(main, midi, (m) => m !== near && Math.abs(m - midi) <= (inst.maxShift ?? MAX_SHIFT_ANY));
        if (other !== null && loaded(main, other)) near = other;
      }
      // D294: a lighter note (the phrasing's level under `below`) on the softer layer, where the
      // instrument has one; either layer stands in for the other until it has loaded.
      // D311: the player's touch chooses the piano's recording (Play.layer), whatever the level.
      // D503: layers of their own notes (JAZZ QUARTET's vibraphone at pp and ff, its bass at ff: every whole tone): the
      // band's softer or louder notes (or the player's soft or strong zone) on them, the main set standing in until loaded.
      if (inst.hard || (inst.soft && folderOf(inst.soft.set) !== folderOf(inst.set))) {
        const hard = inst.hard && (p.layer ? p.layer === "hard" : (p.level ?? 1) > inst.hard.above) ? inst.hard.set : null;
        const lighter = inst.soft && (p.layer ? p.layer === "soft" : (p.level ?? 1) < inst.soft.below) ? inst.soft.set : null;
        const alt = hard ?? lighter;
        const an = alt ? nearestSample(alt, midi) : null;
        const ar = alt && an !== null && Math.abs(an - midi) <= (inst.maxShift ?? MAX_SHIFT_ANY) ? loaded(alt, an) : undefined;
        if (alt && an !== null && ar) return this.sampledNote(midi, at, dur, v, v.patch, p, inst, alt, an, ar, bag);
        if (alt && an !== null) loadOne(this.ctx, alt, an);
        const mr = near === null ? undefined : loaded(main, near);
        if (mr && near !== null) return this.sampledNote(midi, at, dur, v, v.patch, p, inst, main, near, mr, bag);
        if (near !== null) loadOne(this.ctx, main, near);
        // D505: a loaded neighbour within the guard before the synthesized stand-in (as below).
        const nb = nearestSample(main, midi, (m) => m !== near && Math.abs(m - midi) <= (inst.maxShift ?? MAX_SHIFT_ANY) && !!loaded(main, m));
        const nr = nb === null ? undefined : loaded(main, nb);
        if (nb !== null && nr) return this.sampledNote(midi, at, dur, v, v.patch, p, inst, main, nb, nr, bag);
        return v.patch.sing ? this.singNote(midi, at, dur, v, v.patch, p, bag) : this.patchNote(midi, at, dur, v, p.lead ? leadOf(v.patch) : v.patch, p, bag);
      }
      const soft = inst.soft && (p.layer ? p.layer === "soft" : (p.level ?? 1) < inst.soft.below) ? inst.soft.set : null;
      let set = soft ?? main;
      let rec = near === null ? undefined : loaded(set, near);
      if (!rec && near !== null && inst.soft) {
        loadOne(this.ctx, set, near);
        set = soft ? inst.set : inst.soft.set;
        rec = loaded(set, near);
      }
      // D504: a short note (as written, not joined) from the instrument's own short recordings (a tongued short
      // note), where its recording has loaded; else the sustain, as before.
      const sh = inst.short;
      if (sh && near !== null && dur <= sh.under && !p.legato) {
        const sn = nearestSample(sh.set, midi);
        const sr = sn === null ? undefined : loaded(sh.set, sn);
        if (sr && sn !== null) return this.sampledNote(midi, at, dur, v, v.patch, p, inst, sh.set, sn, sr, bag);
        if (sn !== null) loadOne(this.ctx, sh.set, sn);
      }
      if (rec && near !== null) return this.sampledNote(midi, at, dur, v, v.patch, p, inst, set, near, rec, bag);
      if (near !== null) loadOne(this.ctx, main, near);
      // D505: its own recording still on its way (a slow phone): a neighbour already loaded, retuned within the
      // set's guard, rather than the synthesized stand-in (a different instrument, D190's); the stand-in only where none is.
      const nb = nearestSample(main, midi, (m) => m !== near && Math.abs(m - midi) <= (inst.maxShift ?? MAX_SHIFT_ANY) && !!loaded(main, m));
      const nr = nb === null ? undefined : loaded(main, nb);
      if (nb !== null && nr) return this.sampledNote(midi, at, dur, v, v.patch, p, inst, main, nb, nr, bag);
    }
    if (v.patch?.sing) return this.singNote(midi, at, dur, v, v.patch, p, bag);
    if (v.patch) return this.patchNote(midi, at, dur, v, p.lead ? leadOf(v.patch) : v.patch, p, bag);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.04, at + dur - 0.01);
    const o = bag.src(ctx.createOscillator());
    const g = bag.add(ctx.createGain());
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    const w = this.wave(v.timbre);
    if (w === "triangle") o.type = "triangle";
    else o.setPeriodicWave(w);
    o.frequency.value = hz(midi);
    if (p.detune) o.detune.value = p.detune;
    // The triangle is quieter than the pulses at the same amplitude.
    const pulse = v.timbre !== "triangle";
    const E = CHIP_ENV;
    // D365: the triangle (the bass on a computer) 3 dB lighter (it stood 10-13 dB over the pulses: D358); on a phone as before (its bass a pulse).
    const peak = (v.timbre === "triangle" ? 0.36 * (this.phone ? 1 : CHIP_TRIANGLE) : v.timbre === "pulse50" ? 0.15 : 0.19) * v.gain * (p.level ?? 1) * (pulse ? E.lift : 1);
    // D294: a pulse falls from its attack to a lower level and, held, sinks a little further (a console's
    // volume envelope); the triangle holds (the NES triangle has no volume control).
    const sustain = peak * (pulse ? E.fall : 0.72);
    const piano = p.envelope === "piano" || p.envelope === "dulcimer";
    const slow = pulse && !piano && end - 0.04 > t + E.slowFrom;
    /** The level the envelope has reached at `x` (after the attack). */
    const levelAt = (x: number) => {
      if (!pulse || p.legato) return sustain;
      const fell = sustain + (peak - sustain) * Math.exp(-Math.max(0, Math.min(x, t + E.slowFrom) - t - 0.01) / E.fallTau);
      return x <= t + E.slowFrom ? fell : peak * E.floor + (fell - peak * E.floor) * Math.exp(-(x - t - E.slowFrom) / E.floorTau);
    };
    g.gain.setValueAtTime(0, t);
    if (piano) {
      // Struck: at once loud, then dying away, the low notes slower.
      g.gain.linearRampToValueAtTime(peak * 1.15, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.01, (p.envelope === "dulcimer" ? 0.45 : 1.4) * 2 ** (-(midi - 60) / 24));
    } else if (p.legato) {
      // Joined: no new attack, the level of the note before.
      g.gain.linearRampToValueAtTime(sustain, t + 0.015);
    } else {
      g.gain.linearRampToValueAtTime(peak, t + (p.crisp ? 0.003 : 0.006));
      g.gain.setTargetAtTime(sustain, t + 0.01, pulse ? E.fallTau : 0.06);
      if (slow && !p.legato) g.gain.setTargetAtTime(peak * E.floor, t + E.slowFrom, E.floorTau);
    }
    if (!piano) {
      // D302: joined to the next, held to the crossfade.
      const rel = Math.max(t + 0.02, end - (p.tie ? Math.min(0.04, p.tie / 2) : 0.04));
      g.gain.setValueAtTime(levelAt(rel), rel);
      g.gain.linearRampToValueAtTime(0, end);
    }
    // A gentle vibrato on a long note, after a moment (not on a piano). D311: the player's, its depth the thumb's (held sideways).
    const lfos0: AudioScheduledSourceNode[] = [];
    const xvib = p.hold === "vibrato" && !piano ? this.touchVibrato([o.detune], t, end - t > 0.45 ? 9 : 0, 0.28, 5.4, bag, lfos0) : null;
    if (!xvib && !piano && end - t > 0.45) {
      const lfo = bag.src(ctx.createOscillator());
      const depth = bag.add(ctx.createGain());
      lfo.frequency.value = 5.4;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + 0.28);
      depth.gain.linearRampToValueAtTime(9, t + 0.55);
      lfo.connect(depth).connect(o.detune);
      lfo.start(t);
      halt(lfo, end + 0.05);
    }
    // D213: the subject's vibrato (a long note's own vibrato aside).
    const vibs: AudioScheduledSourceNode[] = [...lfos0];
    this.vibrato([o.detune], t, end, p.vib ?? 0, bag, vibs);
    let src: AudioNode = this.shelf(o, Math.max(1200, Math.min(3500, hz(midi) * 4)), t, p.tone ?? 0, p.crisp ?? 0, bag);
    if (pulse) {
      // D294: the pulse's top tamed once it has spoken: open at the attack (the edge that makes it
      // forward), then a gentle lowpass a few harmonics up (2.5 to 4.5 kHz), where its buzz was harsh.
      const lp = bag.add(ctx.createBiquadFilter());
      lp.type = "lowpass";
      lp.Q.value = 0.6;
      // D302: joined, no edge: the filter as the note before had it.
      lp.frequency.setValueAtTime(p.legato ? tameAt(hz(midi)) : E.open, t);
      lp.frequency.setTargetAtTime(tameAt(hz(midi)), t + 0.006, E.closeTau);
      src = src.connect(lp);
    }
    const dull = p.muffleable ? bag.add(ctx.createBiquadFilter()) : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 12000;
      src = src.connect(dull);
    }
    let stopped = false;
    const xs = p.hold ? this.touchStage(src, p, hz(midi), bag) : null;
    if (xs) src = xs.out;
    const shape = p.hold ? this.touchShape({ ...xs, vib: xvib ? { depth: xvib, base: end - t > 0.45 ? 9 : 0 } : undefined }, () => !stopped) : undefined;
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(pan).connect(this.busOf(p, v.patch));
    } else src.connect(g).connect(this.busOf(p, v.patch));
    this.send(pan ?? g, p.room, bag);
    o.start(t);
    halt(o, end + 0.05);
    for (const l of vibs) halt(l, end + 0.05);
    return {
      shape,
      stop: (when = ctx.currentTime) => {
        if (stopped || when >= end) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        // Held at its level, then let go (a piano's damper takes a little longer).
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else {
          g.gain.cancelScheduledValues(s);
          g.gain.setValueAtTime(piano ? peak * 0.3 : levelAt(s), s);
        }
        g.gain.linearRampToValueAtTime(0, s + (piano ? 0.07 : p.legato ? 0.02 : 0.04));
        halt(o, s + 0.1);
        for (const l of vibs) halt(l, s + 0.1);
      },
      bend: (cents: number) => {
        if (!stopped) o.detune.setTargetAtTime(cents + (p.detune ?? 0), ctx.currentTime, 0.02);
      },
      glide: (to: number, tau?: number) => {
        if (!stopped) o.frequency.setTargetAtTime(hz(to), ctx.currentTime, tau ?? 0.025);
      },
      muffle: () => {
        if (stopped || !dull) return;
        dull.frequency.setTargetAtTime(600, ctx.currentTime, 0.01);
        o.detune.setTargetAtTime(-35, ctx.currentTime, 0.02);
      },
    };
  }

  /**
   * D190: load the recordings the ensemble needs for a piece: every voice's pitches, and the player's
   * own an octave either side (ORGANO PLENO). A phone keeps less (sampled.ts BUDGET). Notes played
   * before their recording arrives are synthesized.
   */
  prepare(pitches: number[], lead: number[] = [], opening?: Opening): Promise<void> {
    const phone = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    // D578: a piece's own line-up on the sound (Preset.pieces) before its recordings are planned (its own alone loaded);
    // another piece's let go.
    if (opening?.piece) {
      const own = pieceLineUp(preset().id, { id: opening.piece, voices: { length: opening.count } as unknown[] });
      if (own) setPieceLayout(own);
      else if (pieceLayoutNow()?.only) setPieceLayout(null);
      this.pieceLevel({ id: opening.piece });
    }
    const plans = soundPlans(pitches, lead, backingOn() ? this.drumStyle() : null, opening);
    const staged = plans.map((plan) => loadPlanStaged(this.ctx, plan, phone));
    // D542: the opening's zones (the first bars' recordings) awaited apart: the first notes with real samples.
    this.openingReady = Promise.all(staged.map((x) => x.first)).then(() => {});
    return Promise.all(staged.map((x) => x.all)).then(() => {});
  }
  /** D542: the last prepare's opening zones loaded (resolved at once where no `opening` was given). */
  openingReady: Promise<void> = Promise.resolve();

  /**
   * The recording to play for pitch `m` of a set: its own if loaded (else asked for), or the nearest loaded within
   * MAX_SHIFT_ANY, retuned. D505: it took the nearest loaded within an octave: the harpsichord's 4' (and second 8')
   * choir could read a string up to twelve semitones fast, a glassy ring an octave over the note.
   */
  private nearestLoaded(set: string, m: number): { set: string; m: number; rec: Loaded } | null {
    const own = nearestSample(set, m);
    if (own === null || Math.abs(own - m) > 2) return null;
    const rec = loaded(set, own);
    if (rec) return { set, m: own, rec };
    loadOne(this.ctx, set, own);
    const alt = nearestSample(set, m, (x) => loadedMidis(set).includes(x) && Math.abs(x - m) <= MAX_SHIFT_ANY);
    const altRec = alt === null ? undefined : loaded(set, alt);
    return alt !== null && altRec ? { set, m: alt, rec: altRec } : null;
  }

  /**
   * D313, SOLO VOICES (sampled.ts Bake.chain): a note longer than its recording is not looped (D305's
   * 2 s loop, heard again and again, was the owner's "copy paste") but goes on with passages of the same
   * recording from places within its steady stretch `chain` that differ each time (a hash of the note's
   * pitch and time, so a render repeats), each crossfaded into the one before over CHAIN.xf before the
   * one before runs out (its rate allowing for a bend of 150 cents). A held straight tone is nearly
   * periodic, so two passages of it are correlated by their phase (D313 measured the sine law swelling
   * and sagging a crossfade by up to ±3 dB: a slow tremolo): each passage starts where its waveform
   * best matches the outgoing one's (`align`, within one period of the place drawn), and the crossfade's
   * gains are held to constant power for the two passages' correlation measured at each of its points
   * (`rho`; the recording's own samples); the first passage's place allows for the syllable's scoop or
   * glide (`scoop`: s of the recording gained or lost by it, scoopShift). Two nodes a passage (a source and its gain), only past the
   * recording's length (in the fugues 1% of notes outlast 3 s); after CHAIN.max passages the last loops.
   */
  private chainOn(first: AudioBufferSourceNode, g0: GainNode, gain: number, r: Loaded, chain: [number, number], t: number, from: number, until: number, midi: number, fileHz: number, scoop: number, out: AudioNode, bag: Bag, add: (s: AudioBufferSourceNode) => void) {
    const ctx = this.ctx;
    const rate0 = first.playbackRate.value;
    const rate = rate0 * 2 ** (150 / 1200);
    const xf = CHAIN.xf;
    const data = typeof r.buffer.getChannelData === "function" ? r.buffer.getChannelData(0) : null;
    const sr = r.buffer.sampleRate || 44100;
    /** The normalised correlation of the recording at a and b (s) over w s (every `step`th sample). */
    const corr = (a: number, b: number, w: number, step = 2) => {
      if (!data) return 0;
      const i0 = Math.round(a * sr), j0 = Math.round(b * sr), n = Math.round(w * sr);
      if (i0 < 0 || j0 < 0 || i0 + n > data.length || j0 + n > data.length) return 0;
      let xy = 0, xx = 0, yy = 0;
      for (let i = 0; i < n; i += step) {
        const x = data[i0 + i], y = data[j0 + i];
        xy += x * y;
        xx += x * x;
        yy += y * y;
      }
      return xy / (Math.sqrt(xx * yy) + 1e-12);
    };
    const period = 1 / fileHz;
    /** The place within one period after `b` whose waveform best matches the recording at `a` (every
     * fourth sample, then the best's neighbours). */
    const align = (a: number, b: number) => {
      let best = -2, at = b;
      for (let d = 0; d < period; d += 4 / sr) {
        const c = corr(a, b + d, 0.02, 3);
        if (c > best) (best = c), (at = b + d);
      }
      const coarse = at;
      for (let d = -3; d <= 3; d++) {
        const c = corr(a, coarse + d / sr, 0.02, 1);
        if (d === -3 || c > best) (best = c), (at = coarse + d / sr);
      }
      return at;
    };
    const N = CHAIN.points;
    let src = first;
    let g = g0;
    let at = t;
    let pos = from;
    for (let k = 1; ; k++) {
      const runsOut = at + (r.onset + chain[1] - pos) / rate;
      if (runsOut >= until) return;
      const next = Math.max(at + xf, runsOut - xf);
      if (k > CHAIN.max) {
        // (A note held past every passage, e.g. the player's longest hold: the last one loops.)
        src.loop = true;
        src.loopStart = r.onset + chain[0];
        src.loopEnd = r.onset + chain[1];
        return;
      }
      const s = bag.src(ctx.createBufferSource());
      s.buffer = r.buffer;
      s.playbackRate.value = rate0;
      const spread = Math.max(0, chain[1] - chain[0] - CHAIN.least);
      const outAt = pos + (next - at) * rate0 + (k === 1 ? scoop * rate0 : 0);
      /** The two passages' correlation at each point of the crossfade, the incoming one from `b`. */
      const rhos = (b: number) =>
        Array.from({ length: N + 1 }, (_, q) => {
          const dx = ((q / N) * xf - 0.015) * rate0;
          return q === 0 || q === N ? 0 : corr(outAt + dx, b + dx, 0.03);
        });
      // Of CHAIN.tries places drawn, each aligned, the one whose waveform stays with the outgoing one
      // through the crossfade (the highest least correlation): the recording's slow wander of a few cents
      // can turn two passages aligned at its start against each other by its end.
      let best = -2;
      let rho: number[] = [];
      for (let j = 0; j < (data ? CHAIN.tries : 1); j++) {
        const h = Math.sin(midi * 78.233 + t * 12.9898 + k * 39.425 + j * 17.719) * 43758.5453;
        const b = align(outAt, r.onset + chain[0] + (h - Math.floor(h)) * Math.min(spread, CHAIN.spread));
        const rs = rhos(b);
        const score = Math.min(...rs.slice(1, N));
        if (score > best) (best = score), (pos = b), (rho = rs);
      }
      const gn = bag.add(ctx.createGain());
      for (let q = 0; q <= N; q++) {
        const x = q / N;
        const wa = Math.cos((x * Math.PI) / 2), wb = Math.sin((x * Math.PI) / 2);
        const c = 1 / Math.sqrt(wa * wa + wb * wb + 2 * wa * wb * Math.max(-0.6, Math.min(1, rho[q])));
        const when = next + x * xf;
        if (q === 0) (g.gain.setValueAtTime(gain, when), gn.gain.setValueAtTime(0, when));
        else (g.gain.linearRampToValueAtTime(gain * wa * c, when), gn.gain.linearRampToValueAtTime(gain * wb * c, when));
      }
      s.connect(gn).connect(out);
      s.start(next, pos);
      halt(src, next + xf + 0.02);
      add(s);
      src = s;
      g = gn;
      at = next;
    }
  }

  /**
   * D190: a note on a recorded instrument: the nearest recording, retuned by its playback rate to the
   * tuning's pitch (hz(): every temperament, A = 415), through brightness, the muffle, the envelope and
   * the dynamic. A harpsichord's note dies away by itself; at the written end (or when let go) its
   * damper stops it over 50-150 ms (the bass slower) and the key-up noise sounds, softer the longer
   * the note was held; a note that has died away makes none. An organ's note is held on its loop and
   * stops in 30 ms (the room is the recording's and the reverb's). The harpsichord has no loudness of
   * touch: an accent is 1.5 dB and nothing else, and dyn() moves it at most 3 dB either way; the organ's
   * dyn() is a swell box (level and a lowpass from about 2 to 18 kHz).
   */
  private sampledNote(midi: number, at: number, dur: number, v: Voicing, pt: Patch, p: Play, inst: SampledInstrument, set: string, near: number, rec: Loaded, bag: Bag): Sounding {
    if (pt.pipe) [v, pt, p] = this.piped(midi, v, pt, p);
    if (pt.one) [v, p] = oneInstrument(midi, v, pt.one, p, inst.plucked);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.05, at + dur - 0.01);
    const plucked = inst.plucked;
    const layer = inst.soft && set === inst.soft.set ? inst.soft.gain : inst.hard && set === inst.hard.set ? inst.hard.gain : 1;
    // D510: on a phone a recording's own trim (sampled.ts JAZZ_PHONE_DB: the jazz bass's plucks evened through the phone model).
    // D523: and everywhere a recording's own (sampled.ts ROCK_DB: the guitars' and the bass's plucks evened).
    const trimDb = (noteInfo(set, near)?.db ?? 0) + (this.phone ? (noteInfo(set, near)?.phoneDb ?? 0) : 0);
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5 * inst.gain * layer * (plucked ? 1 + (p.accent ?? 0) * 0.19 : 1) * (trimDb ? 10 ** (trimDb / 20) : 1);
    const mix = bag.add(ctx.createGain());
    // D249: ORGANO PLENO's three sources brought back to about one note's level.
    if (p.pleno) mix.gain.value = PLENO_SCALE;
    const srcs: { src: AudioBufferSourceNode; set: string; m: number; mult: number }[] = [];
    let baseHz = hz(midi);
    // D358: a bowed string's joined note a new bow stroke (Patch.bow), not a slur. D424: a slur (Play.slur) keeps the bow.
    // D427: how a joined bowed note enters (sound.ts bowEntry): the player's bow change its bite and accent, a slur under the note before.
    const entry = bowEntry(pt.bow, p, plucked);
    const play = (set: string, m: number, r: Loaded, mult: number, gain: number, choir?: { delay: number; shelf: number }) => {
      const src = bag.src(ctx.createBufferSource());
      src.buffer = r.buffer;
      src.playbackRate.value = rateFor(set, m, baseHz * mult) * 2 ** ((p.detune ?? 0) / 1200);
      const loop = noteInfo(set, m)?.loop;
      const chain = plucked ? undefined : chainOf(set);
      if (loop && !plucked && !chain) {
        src.loop = true;
        src.loopStart = r.onset + loop[0];
        src.loopEnd = r.onset + loop[1];
      }
      const g = bag.add(ctx.createGain());
      g.gain.value = gain;
      // D322: another choir (the harpsichord's 8'+8' and 4'): a little brighter, plucked a little later.
      if (choir?.shelf) {
        const sh = bag.add(ctx.createBiquadFilter());
        sh.type = "highshelf";
        sh.frequency.value = 2500;
        sh.gain.value = choir.shelf;
        src.connect(g).connect(sh).connect(mix);
      } else src.connect(g).connect(mix);
      // Joined on the organ (legato): the pipe already speaking, past its attack. D358: a bowed string's a new stroke (Patch.bow).
      // D357: a new note on a recorded pipe enters its speech near where it sounds (SampledInstrument.speak).
      const from = r.onset + (p.legato && !plucked ? (entry ? entry.skip : 0.25) : plucked ? 0 : speakFrom(inst, r));
      src.start(t + (choir?.delay ?? 0), from);
      srcs.push({ src, set, m, mult });
      if (chain) this.chainOn(src, g, gain, r, chain, t, from, end + 0.5, midi, 440 * 2 ** ((m - 69) / 12), pt.syllable ? scoopShift(p.legato && p.from !== undefined ? (p.from - midi) * 100 : -pt.syllable.scoop, (p.legato && p.from !== undefined ? Math.sign(midi - p.from) || 1 : 1) * pt.syllable.over, p.legato ? 0.08 : 0.07) : 0, mix, bag, (s) => srcs.push({ src: s, set, m, mult }));
      return g;
    };
    const g0 = play(set, near, rec, 1, 1);
    // D502, BACH BRASS: the second dynamic layer (SampledInstrument.blend: the piano recording at the same pitch) with
    // the forte, crossfaded by the note's brassiness (the player's landing, else the band's reading's level), at equal
    // power (touch-expr.ts brassMix); the forte alone until the piano layer has loaded.
    let blend: { forte: GainNode; piano: GainNode; b0: number } | undefined;
    const brass = inst.blend ? (p.brass ?? brassOf(BRASS_NEUTRAL, p.vel ?? 0)) : undefined;
    if (inst.blend && brass !== undefined) {
      const pr = loaded(inst.blend.set, near);
      if (pr) {
        const mx = brassMix(brass);
        g0.gain.value = mx.forte;
        blend = { forte: g0, piano: play(inst.blend.set, near, pr, 1, mx.piano), b0: brass };
      } else loadOne(ctx, inst.blend.set, near);
    }
    if (p.choirs && plucked) {
      // D322, the harpsichord's registration: the second 8' (the neighbouring key's string retuned: another
      // string, not a copy; a few cents off, a few ms later) and the 4' (the octave above), in this note.
      const u = p.choirs.unison;
      const nb = u ? (this.nearestLoaded(set, midi + 1) ?? this.nearestLoaded(set, midi - 1) ?? { set, m: near, rec }) : null;
      if (u && nb) play(nb.set, nb.m, nb.rec, 2 ** (u.cents / 1200), u.gain, { delay: u.delay, shelf: u.shelf });
      const f = p.choirs.four;
      const up = f ? this.nearestLoaded(set, midi + 12) : null;
      if (f && up) play(up.set, up.m, up.rec, 2, f.gain, { delay: 0, shelf: f.shelf });
    }
    if (p.pleno) {
      // ORGANO PLENO (D181): the octave above (a 4'), and below (the organ's pedal where it reaches).
      const up = this.nearestLoaded(set, midi + 12);
      if (up) play(up.set, up.m, up.rec, 2, 0.45);
      const down = (inst.low ? this.nearestLoaded(inst.low, midi - 12) : null) ?? this.nearestLoaded(set, midi - 12);
      if (down) play(down.set, down.m, down.rec, 0.5, 0.5);
      // D249: on a phone a sustained note's extra pipes count against the cap.
      if (this.phone && !plucked) bag.weight = srcs.length;
    }
    let src: AudioNode = mix;
    // D346, SOLO VOICES on a phone's speaker (the owner: "too warm and distorted … just a little bit less"):
    // the singers a little lower into the limiter and its soft clip (PHONE_VOICES.trim) and the low mids a
    // little thinner (a gentle dip where the small speaker booms); a computer as before.
    if (this.phone && PHONE_VOICES.sets.includes(set)) {
      mix.gain.value *= PHONE_VOICES.trim;
      const dip = bag.add(ctx.createBiquadFilter());
      dip.type = "peaking";
      dip.frequency.value = PHONE_VOICES.dipHz;
      dip.Q.value = PHONE_VOICES.dipQ;
      dip.gain.value = PHONE_VOICES.dipDb;
      src = mix.connect(dip);
    }
    // D365: on a phone, an instrument's upper partials lifted where its small speaker hears them (Patch.phoneLift:
    // STRING CONSORT's cello, its bow and overtones carrying the bass line; never its fundamental), whoever plays it.
    const dry = src;
    if (this.phone && pt.phoneLift) {
      const lift = bag.add(ctx.createBiquadFilter());
      lift.type = "highshelf";
      lift.frequency.value = pt.phoneLift.hz;
      lift.gain.value = pt.phoneLift.db;
      src = src.connect(lift);
      // D503: the fundamental under the small speaker's band cut (Patch.phoneLift.cut): it only fed the limiter.
      if (pt.phoneLift.cut) {
        const cut = bag.add(ctx.createBiquadFilter());
        cut.type = "highpass";
        cut.frequency.value = pt.phoneLift.cut;
        cut.Q.value = 0.7;
        src = src.connect(cut);
      }
    }
    // D645: on a phone, the bass's harmonics made from its own low band (Patch.phoneExcite), its lift and cut on the note's own path.
    if (this.phone && pt.phoneExcite) src = this.excite(bag, dry, src, pt.phoneExcite);
    // D503: the patch's own voicing (Patch.shelf: JAZZ QUARTET's piano a little brighter than the solo grand).
    if (pt.shelf) {
      const sh = bag.add(ctx.createBiquadFilter());
      sh.type = "highshelf";
      sh.frequency.value = pt.shelf.hz;
      sh.gain.value = pt.shelf.db;
      src = src.connect(sh);
    }
    // D502: on a phone, a low instrument high-passed under the useful range of its fundamental there (Patch.phoneHp:
    // BACH BRASS's bass): the small speaker gives nothing of it, and it only fed the limiter (the "air" it took up).
    if (this.phone && pt.phoneHp) {
      const hp = bag.add(ctx.createBiquadFilter());
      hp.type = "highpass";
      hp.frequency.value = pt.phoneHp;
      hp.Q.value = 0.7071;
      src = src.connect(hp);
    }
    // D502: BACH BRASS's presence shelf by its brassiness (touch-expr.ts brassEdgeDb): darker mellow, the edge blazing.
    if (brass !== undefined) {
      const edge = bag.add(ctx.createBiquadFilter());
      edge.type = "highshelf";
      edge.frequency.value = BRASS_EDGE.hz;
      edge.gain.value = brassEdgeDb(brass);
      src = src.connect(edge);
    }
    // D302, SOLO VOICES: a new syllable's consonant: the voice opening from a lowpass (CONSONANTS.open),
    // softer at first; joined, none (the vowel goes on).
    const syl = pt.syllable && !p.legato ? CONSONANTS[pt.syllable.cons] : null;
    if (syl) {
      const lp = bag.add(ctx.createBiquadFilter());
      lp.type = "lowpass";
      lp.Q.value = 0.8;
      lp.frequency.setValueAtTime(syl.open, t);
      // (D304: opening over about 50 ms, no longer a tick of highs at each onset.)
      lp.frequency.setTargetAtTime(16000, t + syl.time * 0.4, Math.max(0.018, syl.time / 2));
      const sg = bag.add(ctx.createGain());
      sg.gain.setValueAtTime(Math.max(0.3, syl.voiced), t);
      sg.gain.setTargetAtTime(1, t + syl.time * 0.4, syl.time / 3);
      src = src.connect(lp).connect(sg);
    }
    const bright = p.bright ?? 0;
    if (bright < 0) {
      const tone = bag.add(ctx.createBiquadFilter());
      tone.type = "lowpass";
      tone.frequency.value = 18000 * 2 ** (bright * 2.8);
      src = src.connect(tone);
    }
    // The touch's brightness and (D213) the subject's colour share one high shelf.
    const subj = !!(p.tone || p.crisp);
    // D339: a piano struck harder is brighter (SampledInstrument.velTone): the band's level as its model
    // gives it (Play.vel), the player's from its level (D365: no lift to take out any more).
    const vt = inst.velTone;
    const velDb = vt ? (p.vel ?? (p.lead ? 20 * Math.log10(Math.max(1e-3, p.level ?? 1)) : 0)) : 0;
    const velTone = vt ? Math.max(vt.min, Math.min(vt.max, vt.perDb * velDb)) : 0;
    src = this.shelf(src, subj ? Math.max(1200, Math.min(3500, baseHz * 4)) : vt ? vt.hz : 2500, t, Math.max(0, bright) * 5 + (p.tone ?? 0) + velTone, p.crisp ?? 0, bag);
    const dull = p.muffleable ? bag.add(ctx.createBiquadFilter()) : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 16000;
      src = src.connect(dull);
    }
    const swellAt = (level: number) => Math.min(18000, 2000 * 2 ** ((level - 0.25) * 3.4));
    const swell = plucked ? null : bag.add(ctx.createBiquadFilter());
    if (swell) {
      swell.type = "lowpass";
      swell.frequency.value = swellAt(1);
      src = src.connect(swell);
    }
    // D311: the player's touch: the lute stop's or the echo manual's or a closed vowel's lowpass; a singer's swell.
    const xs = p.hold ? this.touchStage(src, p, baseHz, bag) : null;
    if (xs) src = xs.out;
    // D322: the organ's tremulant on a recorded pipe (the pedal): the level shaken (Patch.trem), as patchNote does.
    let tremLfo: OscillatorNode | null = null;
    if (pt.trem && !plucked) {
      tremLfo = bag.src(ctx.createOscillator());
      tremLfo.frequency.value = pt.trem.rate;
      const depth = bag.add(ctx.createGain());
      const tg = bag.add(ctx.createGain());
      depth.gain.value = pt.trem.depth * 0.5;
      tg.gain.value = 1 - pt.trem.depth * 0.5;
      tremLfo.connect(depth).connect(tg.gain);
      src = src.connect(tg);
      tremLfo.start(t);
    }
    // D503: the vibraphone's motor (Patch.motor; the recordings are motor off): the level beaten at its rate, struck
    // notes too, the beating coming in over `rise` after the strike; the LFO started on the clock's phase (one motor for
    // every bar: a cosine from its peak at whole periods of the audio clock); the player's held note's SWAY its speed.
    let motor: { lfo: OscillatorNode; rate: number } | undefined;
    if (pt.motor) {
      const mo = pt.motor;
      const lfo = bag.src(ctx.createOscillator());
      lfo.frequency.value = mo.rate;
      const depth = bag.add(ctx.createGain());
      const tg = bag.add(ctx.createGain());
      // The level 1 - depth/2 + depth/2·sin: from 1 down to 1 - depth; the depth in over `rise` s.
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(mo.depth * 0.5, t + mo.rise);
      tg.gain.setValueAtTime(1, t);
      tg.gain.linearRampToValueAtTime(1 - mo.depth * 0.5, t + mo.rise);
      lfo.connect(depth).connect(tg.gain);
      src = src.connect(tg);
      const period = 1 / mo.rate;
      const phase = t - Math.floor(t / period) * period;
      lfo.start(Math.max(ctx.currentTime, t - phase));
      motor = { lfo, rate: mo.rate };
    }
    const g = bag.add(ctx.createGain());
    g.gain.setValueAtTime(0, t);
    // D297: a period preset's envelope on the recording (Patch.rec): its attack, a fall to its sustain,
    // then, held, an exponential fall toward silence (the SNES's sustain that is not one); a joined
    // (legato) note comes in at the sustain. Without `rec`, the recording's own envelope, as before.
    const re = pt.rec;
    const atk = re && !(p.legato && !plucked) ? re.a + (p.soft ?? 0) * (plucked ? 0.01 : 0.08) : plucked ? 0.002 + (p.soft ?? 0) * 0.01 : p.legato ? (entry ? entry.still + entry.a : 0.015) : 0.01 + (p.soft ?? 0) * 0.08;
    const top = re && p.legato && !plucked ? peak * re.s : peak;
    if (entry?.still) {
      // D427, the bow change: the bow still a moment at the reversal (gripping, `floor`), then the stroke's bite and its accent.
      const at0 = t + entry.still;
      g.gain.linearRampToValueAtTime(top * entry.floor, t + 0.003);
      g.gain.setValueAtTime(top * entry.floor, at0);
      g.gain.linearRampToValueAtTime(top * 10 ** (entry.accentDb / 20), at0 + entry.a);
      if (entry.accentDb) g.gain.setTargetAtTime(top, at0 + entry.a, entry.accentS / 3);
    } else g.gain.linearRampToValueAtTime(top, t + Math.max(0.001, atk));
    /** Where the envelope is at `x` (after the attack): for a browser without cancelAndHoldAtTime. */
    let levelAt = (_x: number) => peak;
    // D311: the lute (buff) stop: the string damped by its felt, a short ring.
    if (plucked && p.lute) {
      g.gain.setTargetAtTime(0, t + 0.03, LUTE_TAU);
      levelAt = (x) => peak * Math.exp(-Math.max(0, x - t - 0.03) / LUTE_TAU);
    }
    if (re && !plucked) {
      const a = t + Math.max(0.001, atk);
      if (re.s < 1 && top > peak * re.s) g.gain.setTargetAtTime(peak * re.s, a, Math.max(0.01, re.d / 3));
      if (re.fade) g.gain.setTargetAtTime(0, a + re.d, re.fade);
      levelAt = (x) => peak * re.s * (re.fade && x > a + re.d ? Math.exp(-(x - a - re.d) / re.fade) : 1);
    }
    // D427: a bow change's accent, falling back (the level a giveWay starts from).
    if (entry?.accentDb) {
      const base = levelAt;
      const from = t + entry.still + entry.a;
      const over = 10 ** (entry.accentDb / 20) - 1;
      levelAt = (x) => base(x) * (1 + (x < from ? 0 : over * Math.exp(-(x - from) / (entry.accentS / 3))));
    }
    const dyn = bag.add(ctx.createGain());
    /** D335: the level the last trim left (Sounding.trim). */
    let trimmed = 1;
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(dyn).connect(pan).connect(this.busOf(p, pt));
    } else src.connect(g).connect(dyn).connect(this.busOf(p, pt));
    this.send(pan ?? dyn, p.room, bag);
    // D297: the preset's own effect (the echo, the hall), from this voice's patch.
    // D385: a whole-piece reading's palette (Play.roomMul): more or less of the room.
    this.fxSend(pan ?? dyn, pt.send !== undefined && p.roomMul ? pt.send * p.roomMul : pt.send, bag);
    // D525: KRAUTROCK's guitar into the band's tape echo (Patch.echo).
    if (pt.echo) this.echoSend(pan ?? dyn, pt.echo, bag);
    // D182, a trill: the step above and back, about eight times a second (the rate's square wave).
    const lfos: AudioScheduledSourceNode[] = [...(tremLfo ? [tremLfo] : []), ...(motor ? [motor.lfo] : [])];
    // D305, SOLO VOICES: a long note's messa di voce (Patch.syllable.messa, dB; from its length alone);
    // joined to the next (tie), back to its level by then (no step into the next).
    const messa = pt.syllable?.messa ?? 0;
    if (messa && !p.lead && end - t >= 0.9) {
      const up = 10 ** (messa / 20);
      dyn.gain.setValueAtTime(1, t);
      dyn.gain.linearRampToValueAtTime(up, t + 0.4 * (end - t));
      dyn.gain.linearRampToValueAtTime(p.tie ? 1 : 1 / up, end);
    }
    // D504, a wind player's long note shaded (Patch.swell: the band's; the player's is the thumb's sway): a gentle
    // swell to two fifths of it and back, a little brighter at its top (the reed opening), from its length alone.
    const sw = pt.swell;
    if (sw && !p.lead && !plucked && end - t >= sw.min) {
      const up = 10 ** (sw.db / 20);
      const top = t + 0.4 * (end - t);
      dyn.gain.setValueAtTime(1, t + 0.05);
      dyn.gain.linearRampToValueAtTime(up, top);
      dyn.gain.linearRampToValueAtTime(p.tie ? 1 : 1 / up, end);
      if (sw.tone && pan) {
        const br = bag.add(ctx.createBiquadFilter());
        br.type = "highshelf";
        br.frequency.value = Math.max(1500, Math.min(4000, baseHz * 4));
        br.gain.setValueAtTime(0, t + 0.05);
        br.gain.linearRampToValueAtTime(sw.tone, top);
        br.gain.linearRampToValueAtTime(0, end);
        dyn.disconnect();
        dyn.connect(br).connect(pan);
      }
    }
    if (p.trill && ctx.createConstantSource) {
      const lfo = bag.src(ctx.createOscillator());
      lfo.type = "square";
      lfo.frequency.value = 7.5;
      const centre = bag.src(ctx.createConstantSource());
      lfos.push(lfo, centre);
      for (const x of srcs) {
        const half = (x.src.playbackRate.value * (2 ** (200 / 1200) - 1)) / 2;
        const depth = bag.add(ctx.createGain());
        depth.gain.value = half;
        const mid = bag.add(ctx.createGain());
        mid.gain.value = half;
        lfo.connect(depth).connect(x.src.playbackRate);
        centre.connect(mid).connect(x.src.playbackRate);
      }
      lfo.start(t + 0.06);
      centre.start(t + 0.06);
    }
    // D213: the subject's vibrato (a plucked string's only a shimmer); where a recording's detune exists.
    const det = srcs.map((x) => x.src.detune).filter((d): d is AudioParam => !!d);
    this.vibrato(det, t, end, plucked ? Math.min(3, p.vib ?? 0) : (p.vib ?? 0), bag, lfos);
    // D302: TRACKER's tone portamento into a joined note (Patch.slide).
    if (pt.slide && !pt.syllable && p.legato && p.from !== undefined && p.from !== midi)
      for (const d of det) {
        d.setValueAtTime((p.from - midi) * 100, t);
        d.setTargetAtTime(0, t, pt.slide / 3);
      }
    if (pt.syllable && det.length) {
      // D302, SOLO VOICES: the pitch scooped into a new syllable, or glided from the note before when
      // joined, with a small overshoot; a phrase's end falls.
      const sy = pt.syllable;
      const from = p.legato && p.from !== undefined ? (p.from - midi) * 100 : -sy.scoop;
      const dir = p.legato && p.from !== undefined ? Math.sign(midi - p.from) || 1 : 1;
      for (const d of det) {
        d.setValueAtTime(from, t);
        d.linearRampToValueAtTime(dir * sy.over, t + (p.legato ? 0.08 : 0.07));
        d.setTargetAtTime(0, t + (p.legato ? 0.08 : 0.07), 0.045);
        if (p.final && !p.tie && sy.fall && end - t > 0.35) {
          d.setValueAtTime(0, Math.max(t + 0.25, end - 0.16));
          d.linearRampToValueAtTime(-sy.fall, end);
        }
      }
      // D304: no synthesized burst on a recorded voice (the d's, 2 ms of noise at 3.5 kHz on every new
      // note of the bass, out of a silent gap, were the "clickers" the owner heard): the consonant is
      // the voice opening from the lowpass, and its level coming in (CONSONANTS.open, voiced).
    }
    // D311: the player's held recording: its vibrato's depth the thumb's (the patch's own the base).
    const xvib = p.hold === "vibrato" && !plucked ? this.touchVibrato(det, t, pt.vib?.depth ?? 0, pt.vib?.delay ?? 0.3, pt.vib?.rate ?? 5.5, bag, lfos) : null;
    // D504: a wind's swell held (touch-expr.ts "breath"): on a patch with a vibrato (oboe II), more of it as it swells (none at rest).
    const bvib = p.hold === "breath" && pt.vib && !plucked ? this.touchVibrato(det, t, 0, pt.vib.delay, pt.vib.rate, bag, lfos) : null;
    // D297: the patch's own vibrato on a held recording (its rate, depth and delay: each voice's its own, R4).
    if (!xvib && pt.vib && pt.vib.depth > 0 && !plucked && det.length && end - t > pt.vib.delay + 0.1) {
      const lfo = bag.src(ctx.createOscillator());
      lfos.push(lfo);
      lfo.frequency.value = pt.vib.rate;
      const depth = bag.add(ctx.createGain());
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + pt.vib.delay);
      depth.gain.linearRampToValueAtTime(pt.vib.depth, t + pt.vib.delay + 0.25);
      lfo.connect(depth);
      for (const d of det) depth.connect(d);
      lfo.start(t);
    }
    // The recording's own end, in the context's time (a plucked note dies away by then).
    const life = (noteInfo(set, near)?.len ?? 4) / Math.max(0.25, srcs[0].src.playbackRate.value) - rec.onset;
    let thunk: GainNode | null = null;
    /** The note's own release (time constant, s): the recording's, a damper's (the bass slower), else 30 ms. */
    // D339: a piano's dampers by register (SampledInstrument.damper; 0: an undamped string, left to ring).
    const dm = inst.damper;
    const damp = dm ? (midi >= dm.undamped ? 0 : dm.high + (dm.low - dm.high) * Math.max(0, Math.min(1, (84 - midi) / 48))) : 0;
    const ownTau = re ? Math.max(0.005, re.r / 3) : dm ? damp || UNDAMPED_TAU : plucked ? 0.012 + 0.02 * Math.max(0, Math.min(1, (72 - midi) / 36)) : 0.03;
    /** `handover`: let go as the next note of its voice is struck (a legato's overlap), not lifted alone. */
    const letGo = (s: number, tie = 0, lift = false, handover = false) => {
      if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
      else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(levelAt(s), s)); // flat after the attack, unless Patch.rec shapes it
      // D302: a held note joined to the next goes over the crossfade (`tie`), not its own release.
      // D308: the player's note let go (a thumb lifted): -40 dB within 120 ms, whatever the recording's
      // own release (NOCTURNE 32-BIT's violin, 53 ms a time constant, was -20 dB then: no staccato).
      let tau = tie && !plucked ? Math.max(0.004, tie / 6) : lift ? Math.min(ownTau, LIFT_TAU) : ownTau;
      // D339, the piano's dampers: the player's staccato (a short hold) crisp; a slur's end (a later note of
      // a legato group lifted alone) set down softly, as a hand lifts off; any other lift, a handover and
      // the band's notes the damper of its register, with the felt's slower last contact (`tail`).
      let tail = 0;
      if (dm && !damp) tau = UNDAMPED_TAU;
      else if (dm) {
        const stacc = lift && s - t < dm.stacc;
        tau = stacc ? Math.min(damp, dm.crisp) : lift && !handover && (p.group ?? 0) >= 1 ? damp * dm.slur : damp;
        if (!stacc && (!lift || handover || (p.group ?? 0) >= 1)) tail = tau * dm.tail;
      }
      // D503: the vibraphone's pedal, the bass's left hand (SampledInstrument.pedal): by how long the note was held.
      // (D308: a thumb lifted is -40 dB within 120 ms all the same.)
      if (inst.pedal && !tie) tau = Math.min(s - t < inst.pedal.short ? inst.pedal.shortTau : inst.pedal.tau, lift ? LIFT_TAU : Infinity);
      // D385: a palette's sparing half pedal, a trill's half-seated dampers (Play.dampMul: the dampers slower).
      // D405: never past DAMP_MUL_MAX (D389's x1.8), nor DAMP_MUL_HIGH from C6, where a ringing string carries most.
      const mul = dm && damp && p.dampMul ? dampMulFor(midi, p.dampMul) : 1;
      if (dm && mul !== 1) {
        tau *= mul;
        tail = tail ? tail * mul : tau * dm.tail;
      }
      g.gain.setTargetAtTime(0, s, tau);
      if (tail) g.gain.setTargetAtTime(0, s + 3 * tau, tail);
      // D405: a damped string halted within RELEASE_MAX_S of its release, whatever the palette.
      const gone = Math.min(dm && damp ? RELEASE_MAX_S : Infinity, tail ? 3 * tau + tail * 6 : tau * 9);
      for (const x of srcs) halt(x.src, s + gone + 0.02);
      for (const l of lfos) halt(l, s + gone + 0.05);
      if (thunk) (thunk.disconnect(), (thunk = null));
      const held = s - t;
      const r = inst.release ? loaded(inst.release, near) : undefined;
      // (D210: a note already ended and disconnected makes no key-up noise.)
      if (!r || held > life - 0.3 || bag.done) return;
      // The jacks falling back and the dampers: softer the longer the string has rung.
      const rs = bag.src(ctx.createBufferSource());
      rs.buffer = r.buffer;
      rs.playbackRate.value = srcs[0].src.playbackRate.value;
      thunk = bag.add(ctx.createGain());
      thunk.gain.value = peak * (inst.relGain ?? 0.9) * Math.max(0.2, Math.exp(-held / Math.max(0.5, life / 3)));
      rs.connect(thunk).connect(dyn);
      rs.start(s, r.onset);
    };
    /**
     * D427: a bowed note given way to at `s` (the next note's onset): a bow change stops it quickly (the bow
     * reversing), a slur holds it to the onset and crosses into the next (sound.ts giveWayFall).
     */
    const giveWay = (s: number, how: GiveWay) => {
      const f = giveWayFall(how);
      // From the level as the envelope gives it (levelAt), not cancelAndHoldAtTime: with it, rendered in
      // Chromium, the first slur after a tap notched to -46 dB for a few ms.
      const lv = levelAt(s);
      g.gain.cancelScheduledValues(s);
      g.gain.setValueAtTime(lv, s);
      if (f.tau) g.gain.setTargetAtTime(0, s, f.tau);
      else for (const [dt, k] of f.points) g.gain.linearRampToValueAtTime(lv * k, s + dt);
      for (const x of srcs) halt(x.src, s + f.gone + 0.02);
      for (const l of lfos) halt(l, s + f.gone + 0.05);
    };
    // D184: damped at the written end (a lead note's end is its longest hold), unless it has died away first.
    if (plucked && end > t + life) {
      for (const x of srcs) halt(x.src, t + life + 0.05);
      for (const l of lfos) halt(l, t + life + 0.1);
    } else if (p.give && pt.bow && !plucked) giveWay(Math.max(t + 0.02, end - (p.tie ?? 0)), p.give);
    else if (p.tie && !plucked) letGo(Math.max(t + 0.02, end - p.tie / 2), p.tie);
    // D302: a held note's release done by its written end, as a synthesized note's is (it began there,
    // and rang on a fifth of a second past it: a detached note's gap filled). D304: only a detached
    // note's (Play.apart: a reading's mark), plucked or held, its release -30 dB by its end, so
    // the gap the reading asks for is heard; every other note let go at its end, as before D302.
    // D357: not an organ's recorded pipe (Patch.pipe): its notes let go at their written end, as the
    // synthesized pipes' are (D349: the phrasing's hold is the organist's release); its release begun
    // 30 ms in left the plenum pedal's detached 16ths (0.11 s) 13 dB under their neighbours.
    else if (!p.lead && p.apart && !pt.pipe) letGo(Math.max(t + atk + 0.02, end - 3.5 * ownTau));
    else letGo(end);
    let stopped = false;
    let cents = 0;
    let muffled = false;
    const shape = p.hold ? this.touchShape({ ...xs, vib: xvib ? { depth: xvib, base: pt.vib?.depth ?? 0 } : undefined, ...(bvib ? { breathVib: bvib } : {}), swell: p.hold === "swell", blend, trem: p.hold === "trem" ? motor : undefined }, () => !stopped) : undefined;
    const retune = (tc: number) => {
      const off = 2 ** ((cents + (p.detune ?? 0) + (muffled ? -35 : 0)) / 1200);
      for (const x of srcs) x.src.playbackRate.setTargetAtTime(rateFor(x.set, x.m, baseHz * x.mult) * off, ctx.currentTime, tc);
    };
    return {
      shape,
      stop: (when = ctx.currentTime, how?: GiveWay) => {
        if (stopped || when >= end) return;
        stopped = true;
        // D427: a bowed note giving way to the next of its line: a bow change or a slur (giveWay).
        if (how && pt.bow && !plucked) return giveWay(Math.max(when, t + 0.02), how);
        // D339: a stop set ahead (the game's handover: the next note struck, this one let go 30 ms on) is a legato's, not a lift.
        letGo(Math.max(when, t + 0.02), 0, !!p.lead, when > ctx.currentTime + 0.005);
      },
      bend: (c: number) => {
        if (stopped) return;
        cents = c;
        retune(0.02);
      },
      glide: (to: number, tau?: number) => {
        if (stopped) return;
        // D510, D631: the slide's target at its written pitch, as the note itself (voiceNote: no octave fold).
        baseHz = hz(soundingPitch(v.patch, to));
        retune(tau ?? 0.025);
      },
      muffle: () => {
        if (stopped || !dull) return;
        dull.frequency.setTargetAtTime(500, ctx.currentTime, 0.01);
        muffled = true;
        retune(0.02);
      },
      dyn: (level: number) => {
        if (stopped) return;
        const now = ctx.currentTime;
        if (swell) {
          // D249: the swell bounded (unbounded, a crescendo pushed the organ past full scale).
          dyn.gain.setTargetAtTime(organSwell(level), now, 0.08);
          swell.frequency.setTargetAtTime(swellAt(organSwell(level)), now, 0.08);
        } else dyn.gain.setTargetAtTime(Math.max(0.7, Math.min(1.4, level)), now, 0.06);
      },
      trim: (level: number, at: number, until: number) => {
        if (stopped) return;
        rampTrim(dyn.gain, trimmed, level, at, until);
        trimmed = level;
      },
    };
  }

  /** An oscillator of a wave (D177): the native shapes, the NES pulses, and three of our own. */
  private osc(w: Wave): OscillatorNode {
    const o = this.ctx.createOscillator();
    if (w === "saw") o.type = "sawtooth";
    else if (w === "square" || w === "triangle" || w === "sine") o.type = w;
    else if (w === "pulse12" || w === "pulse25" || w === "pulse50") o.setPeriodicWave(this.wave(w) as PeriodicWave);
    else if (isShaped(w)) o.setPeriodicWave(this.shaped(w));
    else o.setPeriodicWave(this.custom(w));
    return o;
  }

  /** D209: a console's wave shape (the NES triangle's stair, a Game Boy wave sample, the VRC6 saw, FM), built once. */
  private shaped(w: ShapedWave): PeriodicWave {
    let pw = this.waves.get(w);
    if (!pw) {
      const { real, imag } = harmonicsOf(SHAPES[w]);
      pw = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(w, pw);
    }
    return pw;
  }

  /** The organ (drawbars 8', 4', 2 2/3', 2'), the reed (strong odd and some even partials, nasal), the bell (inharmonic-ish upper partials). */
  private custom(w: "organ" | "reed" | "bell"): PeriodicWave {
    let pw = this.waves.get(w);
    if (pw) return pw;
    const amps: Record<string, number[]> = {
      organ: [0, 1, 0.8, 0.6, 0.5, 0, 0.3, 0, 0.25],
      reed: [0, 1, 0.35, 0.8, 0.3, 0.6, 0.25, 0.45, 0.2, 0.3, 0.15, 0.2],
      bell: [0, 1, 0, 0, 0.5, 0, 0, 0.35, 0, 0, 0.2, 0, 0.15],
    };
    const a = amps[w];
    const real = new Float32Array(a.length);
    const imag = new Float32Array(a);
    pw = this.ctx.createPeriodicWave(real, imag);
    this.waves.set(w, pw);
    return pw;
  }

  private noiseBuf: AudioBuffer | null = null;
  private noise(): AudioBufferSourceNode {
    if (!this.noiseBuf) {
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      let seed = 99;
      for (let i = 0; i < len; i++) d[i] = (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1);
    }
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    n.loop = true;
    return n;
  }

  /**
   * A note on an instrument of the ensemble (D177): its oscillators, breath, drive, filter (or vowel),
   * envelope, vibrato and tremolo; shaped by the touch (brightness, a soft or accented attack, level).
   */
  private patchNote(midi: number, at: number, dur: number, v: Voicing, pt: Patch, p: Play, bag: Bag): Sounding {
    if (pt.pipe) [v, pt, p] = this.piped(midi, v, pt, p);
    if (pt.one) [v, p] = oneInstrument(midi, v, pt.one, p, false);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    // D297, the analog drift (Patch.drift): the note's tuning off by a slow sine of the clock (no nodes).
    if (pt.drift) p = { ...p, detune: (p.detune ?? 0) + pt.drift.cents * Math.sin(2 * Math.PI * pt.drift.rate * t + pt.drift.rate * 40) };
    const pluck = pt.amp.s === 0;
    const tail = pluck || p.envelope === "piano" || p.envelope === "dulcimer";
    const end = Math.max(t + 0.05, at + dur - 0.01);
    const f0 = hz(midi);
    const bright = 2 ** ((p.bright ?? 0) * 1.3);
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5;
    const mix = bag.add(ctx.createGain());
    const oscs: OscillatorNode[] = [];
    /** D297: the pulse-width sweeps (SID 64), stopped with the note. */
    const pwmLfos: OscillatorNode[] = [];
    for (const o of pt.osc) {
      // D311: a pulse voice's width from the player's touch (GAME BOY's pulses), its loudness kept (pulseRms).
      const w0 = widthOf(o.wave);
      const wave = p.pw !== undefined && !p.pwContinuous && w0 !== undefined && o.wave !== "square" ? pulseWave(p.pw) : o.wave;
      const n = bag.src(this.osc(wave));
      n.frequency.value = f0 * 2 ** (o.octave ?? 0);
      const det = (o.detune ?? 0) + (p.detune ?? 0);
      n.detune.value = det;
      if (pt.scoop && !(p.legato && !pluck)) {
        // D209: the pitch comes in from off and settles (no extra nodes: the oscillator's own detune).
        // D302: not on a joined note (it would mark a new attack).
        n.detune.setValueAtTime(det + pt.scoop.cents, t);
        n.detune.setTargetAtTime(det, t, pt.scoop.time);
      }
      // D357: a reed's pitch speaking a little flat as its tongue settles (Patch.reed.bloom; joined, none).
      if (pt.reed && !pt.scoop && !(p.legato && !pluck)) {
        n.detune.setValueAtTime(det - pt.reed.bloom.cents * (pt.reed.share ?? 1), t);
        n.detune.setTargetAtTime(det, t, pt.reed.bloom.time);
      }
      const g = bag.add(ctx.createGain());
      g.gain.value = (o.gain ?? 1) * (wave !== o.wave && w0 !== undefined ? pulseRms(w0) / pulseRms(widthOf(wave) ?? w0) : 1);
      if (pt.pwm && o.wave === "saw") {
        // D297, SID 64's pulse-width modulation: the sawtooth less itself `width` of a period later is a
        // pulse of that width (halved: within ±1); the delay swung by an LFO moves the width.
        // D311: the SID's width from the player's touch (12.5% to 50%, any between), its loudness kept, its sweep within it.
        const width = p.pwContinuous && p.pw !== undefined ? p.pw : pt.pwm.width;
        const pw = { ...pt.pwm, width, depth: Math.min(pt.pwm.depth, Math.max(0, width - 0.03)) };
        if (width !== pt.pwm.width) g.gain.value *= pulseRms(pt.pwm.width) / pulseRms(width);
        const f = f0 * 2 ** (o.octave ?? 0);
        const half = bag.add(ctx.createGain());
        half.gain.value = 0.5;
        const late = bag.add(ctx.createDelay(0.05));
        late.delayTime.value = pw.width / f;
        const neg = bag.add(ctx.createGain());
        neg.gain.value = -0.5;
        n.connect(half).connect(g);
        n.connect(late).connect(neg).connect(g);
        // D305: following the clock (SWITCHED-ON's slow PWM: one free-running LFO across the notes).
        if (pw.depth && pw.rate && pw.clock) clocked(late.delayTime, t, end + pt.amp.r, (x) => (pw.width + pw.depth * Math.sin(2 * Math.PI * pw.rate * x)) / f, 0.05);
        else if (pw.depth && pw.rate) {
          const lfo = bag.src(ctx.createOscillator());
          lfo.frequency.value = pw.rate;
          const sweep = bag.add(ctx.createGain());
          sweep.gain.value = pw.depth / f;
          lfo.connect(sweep).connect(late.delayTime);
          lfo.start(t);
          pwmLfos.push(lfo);
        }
        g.connect(mix);
      } else n.connect(g).connect(mix);
      oscs.push(n);
    }
    // D297, two-operator FM (Patch.fm): a sine modulator at `ratio` times the note into every
    // oscillator's frequency, its depth (index x the modulator's frequency, Hz) from `index` to `to`
    // over `time` (a time constant of a third of it), through `rise` first where given; a second
    // modulator at a fixed index. The modulators follow the vibrato and the bends (ratios kept).
    const mods: { o: OscillatorNode; ratio: number; det: number }[] = [];
    if (pt.fm) {
      const fm = pt.fm;
      const mod = (ratio: number, det = 0) => {
        const o = bag.src(ctx.createOscillator());
        // D302: the modulator fed back on itself (the YM2612's operator 1: a brighter, saw-like wave).
        if (fm.fb) o.setPeriodicWave(this.feedback(fm.fb));
        o.frequency.value = f0 * ratio;
        o.detune.value = (p.detune ?? 0) + det;
        const depth = bag.add(ctx.createGain());
        o.connect(depth);
        for (const n of oscs) depth.connect(n.frequency);
        mods.push({ o, ratio, det });
        return depth.gain;
      };
      // D311: MEGA FM's index (the timbre throughout: fmScale) and BLEEPS' mallet (the strike's burst: strike), from the player's touch.
      const xi = p.fmScale ?? 1;
      const xs0 = p.strike ?? 1;
      const hz1 = f0 * fm.ratio * xi;
      // D302: the modulator a few cents off its ratio (the chip's DT1: a slow beating in the timbre).
      const d = mod(fm.ratio, fm.detune ?? 0);
      // D302: a joined note goes on at the body's index (no bright onset: the YM2612 legato, no key-on).
      const joinedOn = p.legato && !pluck;
      d.setValueAtTime((joinedOn ? fm.to : fm.index * xs0) * hz1, t);
      let from = t;
      if (fm.rise && !joinedOn) {
        d.linearRampToValueAtTime(fm.rise.to * xs0 * hz1, t + fm.rise.time);
        from = t + fm.rise.time;
      }
      d.setTargetAtTime(fm.to * hz1, from, fm.time / 3);
      if (fm.mod2) {
        // A second modulator: a fixed index, or (D302) its own fall (an e-piano's tine, a slap's click).
        const m2 = fm.mod2;
        const g2 = mod(m2.ratio, -(fm.detune ?? 0) / 2);
        const hz2 = f0 * m2.ratio * xi;
        if (m2.to !== undefined && m2.time) {
          g2.setValueAtTime((joinedOn ? m2.to : m2.index * xs0) * hz2, t);
          g2.setTargetAtTime(m2.to * hz2, t, m2.time / 3);
        } else g2.value = m2.index * hz2;
      }
    }
    /** Every oscillator whose pitch moves with the note (the carriers and, D297, the modulators). */
    const tuned = [...oscs, ...mods.map((m) => m.o)];
    // D302, a portamento into a joined note (Patch.slide: TOMITA's whistle, TRACKER's tone portamento).
    if (pt.slide && p.legato && p.from !== undefined && p.from !== midi) {
      for (const [i, n] of oscs.entries()) {
        const k = 2 ** (pt.osc[i].octave ?? 0);
        n.frequency.setValueAtTime(hz(p.from) * k, t);
        n.frequency.setTargetAtTime(f0 * k, t, pt.slide / 3);
      }
    }
    let breath: AudioBufferSourceNode | null = null;
    if (pt.breath) {
      breath = bag.src(this.noise());
      const bp = bag.add(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.frequency.value = Math.min(9000, f0 * 2);
      bp.Q.value = 2;
      const bg = bag.add(ctx.createGain());
      bg.gain.value = pt.breath * 2;
      breath.connect(bp).connect(bg).connect(mix);
    }
    let src: AudioNode = mix;
    if (pt.bits) {
      // D297: the DAC's grain: the oscillators' sum (within ±1) on 2^bits levels, before the envelope.
      const sh = bag.add(ctx.createWaveShaper());
      sh.curve = this.stairs(pt.bits);
      src = src.connect(sh);
    }
    if (pt.drive) {
      const sh = bag.add(ctx.createWaveShaper());
      const k = pt.drive * 6;
      const curve = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        const x = (i / 511) * 2 - 1;
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      sh.curve = curve;
      src = src.connect(sh);
    }
    if (pt.vowel) {
      // Two formants in parallel: a sung vowel.
      const out = bag.add(ctx.createGain());
      for (const [i, f] of pt.vowel.entries()) {
        const bp = bag.add(ctx.createBiquadFilter());
        bp.type = "bandpass";
        bp.frequency.value = f * (1 + ((p.bright ?? 0) * 0.15));
        bp.Q.value = 6;
        const g = bag.add(ctx.createGain());
        g.gain.value = i ? 0.7 : 1.4;
        src.connect(bp).connect(g).connect(out);
      }
      src = out;
    }
    const fl = pt.filter ? bag.add(ctx.createBiquadFilter()) : null;
    if (fl && pt.filter) {
      fl.type = pt.filter.type ?? "lowpass";
      fl.Q.value = pt.filter.q ?? 0.7;
      const base = Math.min(16000, (pt.filter.hz ? pt.filter.freq : f0 * pt.filter.freq) * bright);
      // D302: joined, the filter does not open anew (no "wah" of an attack).
      // D311: BLEEPS' mallet: a harder strike opens the filter further (never under the base).
      const top = p.legato && !pluck ? base : Math.min(18000, base * Math.max(1, (pt.filter.env ?? 1) * (p.strike ?? 1)) * (1 + (p.accent ?? 0) * 0.8) * (1 + (p.crisp ?? 0) * 0.6));
      fl.frequency.setValueAtTime(top, t);
      fl.frequency.setTargetAtTime(base, t + 0.005, pt.filter.envDecay ?? 0.1);
      src = src.connect(fl);
      if (pt.filter.poles === 4) {
        // D294: a second pole pair, the same sweep (24 dB an octave, the resonance on the first alone).
        const f2 = bag.add(ctx.createBiquadFilter());
        f2.type = fl.type;
        f2.Q.value = 0.6;
        f2.frequency.setValueAtTime(top, t);
        f2.frequency.setTargetAtTime(base, t + 0.005, pt.filter.envDecay ?? 0.1);
        src = src.connect(f2);
      }
      // D302, TOMITA: the filter sweeping slowly with the clock (continuous from note to note).
      const sw = pt.filter.sweep;
      if (sw) {
        const at = (x: number) => Math.min(16000, base * 2 ** (sw.octaves * Math.sin(2 * Math.PI * sw.rate * x)));
        for (const f of [fl, ...(pt.filter.poles === 4 && src !== fl ? [src as BiquadFilterNode] : [])]) clocked(f.frequency, t + Math.max(0.12, (pt.filter.envDecay ?? 0.1) * 4), end + pt.amp.r, at);
      }
    } else if (bright !== 1) {
      const tone = bag.add(ctx.createBiquadFilter());
      tone.type = "lowpass";
      tone.frequency.value = Math.min(16000, f0 * 8 * bright);
      src = src.connect(tone);
    }
    if (pt.hp) {
      // D297: the 120 Hz floor (12 dB an octave): the bass's pitch from its harmonics, no boom.
      const hp = bag.add(ctx.createBiquadFilter());
      hp.type = "highpass";
      hp.frequency.value = pt.hp;
      hp.Q.value = 0.7071;
      src = src.connect(hp);
    }
    // D645: on a phone, a synthesized bass's upper partials lifted as a recorded one's are (Patch.phoneLift, D365, not a recording's stand-in; its cut
    // under them), and its harmonics made from its own low band (Patch.phoneExcite).
    if (this.phone && pt.phoneLift && !pt.sample) src = this.phoneLift(bag, src, pt.phoneLift);
    if (this.phone && pt.phoneExcite && !pt.sample) src = this.excite(bag, src, src, pt.phoneExcite);
    if (pt.reed) src = this.reedBody(src, pt.reed, f0, midi, t, !!(p.legato && !pluck), bag);
    if (pt.phaser) {
      // D302, TOMITA's phased strings: two allpass stages swept with the clock, beside the dry sound: moving notches.
      const ph = pt.phaser;
      const wet = bag.add(ctx.createGain());
      wet.gain.value = 0.5;
      const dry = bag.add(ctx.createGain());
      dry.gain.value = 0.5;
      const sum = bag.add(ctx.createGain());
      let chain: AudioNode = src;
      for (let k = 0; k < 2; k++) {
        const ap = bag.add(ctx.createBiquadFilter());
        ap.type = "allpass";
        ap.Q.value = 0.6;
        clocked(ap.frequency, t, end + pt.amp.r, (x) => ph.lo * (ph.hi / ph.lo) ** (0.5 + 0.5 * Math.sin(2 * Math.PI * ph.rate * x + k * 0.6)));
        chain = chain.connect(ap);
      }
      chain.connect(wet).connect(sum);
      src.connect(dry).connect(sum);
      src = sum;
    }
    // D311: the player's touch: a lowpass (the echo manual, the lute stop, a closed singer), the wah's peak, a swell.
    const xs = p.hold ? this.touchStage(src, p, f0, bag) : null;
    if (xs) src = xs.out;
    src = this.shelf(src, Math.max(1200, Math.min(3500, f0 * 4)), t, p.tone ?? 0, p.crisp ?? 0, bag);
    const dull = p.muffleable ? bag.add(ctx.createBiquadFilter()) : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 16000;
      src = src.connect(dull);
    }
    const g = bag.add(ctx.createGain());
    const a = Math.max(0.002, pt.amp.a * (1 + (p.soft ?? 0) * 4) * (1 - (p.crisp ?? 0) * 0.5));
    const st = pt.steps;
    const sus = st ? (peak * st.to) / st.from : peak * pt.amp.s;
    // D302: joined to the next: held to the crossfade, not released before it.
    const relAt = Math.max(t + a + 0.02, end - (p.tie ? Math.min(pt.amp.r, p.tie / 2) : pt.amp.r));
    g.gain.setValueAtTime(0, t);
    if (p.legato && !pluck) g.gain.linearRampToValueAtTime(sus || peak * 0.7, t + 0.02);
    else {
      g.gain.linearRampToValueAtTime(peak * (1 + (p.accent ?? 0) * 0.7), t + a);
      // D311: the lute stop (a harpsichord's stand-in before its recording): the shorter ring.
      if (pluck) g.gain.setTargetAtTime(0, t + a, p.lute ? LUTE_TAU : pt.amp.d * 2 ** (-(midi - 60) / 30));
      else if (st) {
        // D294: the Game Boy's volume envelope: a step of 1/15 every period/64 s, abrupt, down to its floor.
        for (let k = 1; k <= st.from - st.to; k++) {
          const at = t + a + (k * st.period) / 64;
          if (at >= relAt) break;
          g.gain.setValueAtTime((peak * (st.from - k)) / st.from, at);
        }
      } else g.gain.setTargetAtTime(sus, t + a, pt.amp.d / 3);
    }
    if (!tail) {
      const held = st && !p.legato ? (peak * Math.max(st.to, st.from - Math.floor(((relAt - t - a) * 64) / st.period))) / st.from : sus;
      g.gain.setValueAtTime(held, relAt);
      g.gain.linearRampToValueAtTime(0, end);
    }
    // The LFOs, stopped with the note (D184: they ran on 2 s past its end, and past an early stop).
    const lfos: AudioScheduledSourceNode[] = [...pwmLfos];
    let xtrem: { lfo: OscillatorNode; rate: number } | undefined;
    if (pt.trem) {
      const lfo = bag.src(ctx.createOscillator());
      // D311: the vibraphone's motor, its speed the thumb's (held sideways).
      if (p.hold === "trem") xtrem = { lfo, rate: pt.trem.rate };
      lfos.push(lfo);
      const depth = bag.add(ctx.createGain());
      const tg = bag.add(ctx.createGain());
      lfo.frequency.value = pt.trem.rate;
      depth.gain.value = pt.trem.depth * 0.5;
      tg.gain.value = 1 - pt.trem.depth * 0.5;
      lfo.connect(depth).connect(tg.gain);
      src = src.connect(tg);
      lfo.start(t);
    }
    // D311: the player's vibrato, its depth the thumb's (the patch's own the base).
    const xvib = p.hold === "vibrato" ? this.touchVibrato(tuned.map((o) => o.detune), t, pt.vib?.depth ?? 0, pt.vib?.delay ?? 0.3, pt.vib?.rate ?? 5.5, bag, lfos) : null;
    if (!xvib && pt.vib && end - t > pt.vib.delay + 0.1) {
      const lfo = bag.src(ctx.createOscillator());
      lfos.push(lfo);
      const depth = bag.add(ctx.createGain());
      lfo.frequency.value = pt.vib.rate;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + pt.vib.delay);
      depth.gain.linearRampToValueAtTime(pt.vib.depth, t + pt.vib.delay + 0.25);
      lfo.connect(depth);
      for (const o of tuned) depth.connect(o.detune);
      lfo.start(t);
    }
    // D213: the subject's vibrato (a plucked patch only a shimmer).
    this.vibrato(tuned.map((o) => o.detune), t, end, pluck ? Math.min(3, p.vib ?? 0) : (p.vib ?? 0), bag, lfos);
    if (p.trill && ctx.createConstantSource) {
      // A whole tone above and back: a square wave of 0 or 200 cents.
      const lfo = bag.src(ctx.createOscillator());
      lfo.type = "square";
      lfo.frequency.value = 7.5;
      const depth = bag.add(ctx.createGain());
      depth.gain.value = 100;
      const centre = bag.src(ctx.createConstantSource());
      lfos.push(lfo, centre);
      centre.offset.value = 100;
      lfo.connect(depth);
      for (const o of tuned) (depth.connect(o.detune), centre.connect(o.detune));
      lfo.start(t + 0.06);
      centre.start(t + 0.06);
    }
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    const dyn = bag.add(ctx.createGain());
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      // D302, TOMITA's theatrical stereo: the voice wandering slowly about its place (within ±0.35, a phone's mix).
      const ap = pt.autopan;
      if (ap) clocked(pan.pan, t, end + pt.amp.r, (x) => Math.max(-0.35, Math.min(0.35, v.pan + ap.depth * Math.sin(2 * Math.PI * ap.rate * x))));
      src.connect(g).connect(dyn).connect(pan).connect(this.busOf(p, pt));
    } else src.connect(g).connect(dyn).connect(this.busOf(p, pt));
    this.send(pan ?? dyn, p.room, bag);
    // D297: the preset's own effect (the echo, the hall), from this voice's patch.
    this.fxSend(pan ?? dyn, pt.send, bag);
    if (pt.chiff && !p.legato) {
      // D297, CHAMBER ORGAN: the pipe's chiff: band-passed noise about the `at`th harmonic, past the
      // envelope (the pipe's slower speech), up in 3 ms and gone within `time`.
      const ch = pt.chiff;
      const nz = bag.src(this.noise());
      const bp = bag.add(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.frequency.value = Math.min(9000, f0 * ch.at);
      bp.Q.value = 2;
      const cg = bag.add(ctx.createGain());
      cg.gain.setValueAtTime(0, t);
      cg.gain.linearRampToValueAtTime(peak * ch.level * 2, t + 0.003);
      cg.gain.setTargetAtTime(0, t + 0.003, ch.time / 3);
      nz.connect(bp).connect(cg).connect(dyn);
      nz.start(t);
      halt(nz, t + ch.time * 2 + 0.03);
    }
    // D184: a plucked or struck note is damped at its written end (it rang 6 s whatever its length:
    // fifty voices at once on a phone); a lead note's end is its hold, so it rings as it would.
    const damp = tail && end + 0.5 < t + 6;
    // D302: the damper quicker for a detached note (80 ms let a detached pluck ring into the next: no gap
    // heard); D304: only a detached note's, the rest ring as they did.
    if (damp) g.gain.setTargetAtTime(0, Math.max(t + a + 0.01, end), p.apart ? 0.03 : 0.08);
    const last = tail ? (damp ? end + 0.5 : t + 6) : end + 0.05;
    for (const l of lfos) halt(l, last + 0.1);
    for (const o of tuned) (o.start(t), halt(o, last));
    if (breath) (breath.start(t), halt(breath, last));
    let stopped = false;
    const shape = p.hold ? this.touchShape({ ...xs, vib: xvib ? { depth: xvib, base: pt.vib?.depth ?? 0 } : undefined, trem: xtrem }, () => !stopped) : undefined;
    return {
      shape,
      stop: (when = ctx.currentTime) => {
        if (stopped) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(sus || peak * 0.3, s));
        g.gain.linearRampToValueAtTime(0, s + Math.max(0.02, p.legato ? 0.02 : pt.amp.r));
        for (const o of tuned) halt(o, s + pt.amp.r + 0.1);
        if (breath) halt(breath, s + pt.amp.r + 0.1);
        for (const l of lfos) halt(l, s + pt.amp.r + 0.15);
      },
      bend: (cents: number) => {
        if (stopped) return;
        for (const [i, o] of oscs.entries()) o.detune.setTargetAtTime((pt.osc[i].detune ?? 0) + (p.detune ?? 0) + cents, ctx.currentTime, 0.02);
        for (const m of mods) m.o.detune.setTargetAtTime((p.detune ?? 0) + m.det + cents, ctx.currentTime, 0.02);
      },
      glide: (to: number, tau?: number) => {
        if (stopped) return;
        const f = hz(to);
        for (const [i, o] of oscs.entries()) o.frequency.setTargetAtTime(f * 2 ** (pt.osc[i].octave ?? 0), ctx.currentTime, tau ?? 0.025);
        for (const m of mods) m.o.frequency.setTargetAtTime(f * m.ratio, ctx.currentTime, tau ?? 0.025);
      },
      muffle: () => {
        if (stopped || !dull) return;
        dull.frequency.setTargetAtTime(500, ctx.currentTime, 0.01);
      },
      dyn: (level: number) => {
        if (!stopped) dyn.gain.setTargetAtTime(Math.max(0.05, level), ctx.currentTime, 0.06);
      },
    };
  }

  /**
   * D302, VOCAL SYNTH: a sung note (Patch.sing; sound.ts Sing, VOWELS, CONSONANTS): the glottal source
   * and breath through five formant band-passes in parallel, a new syllable's consonant (the formants
   * moving from the consonant's into the vowel's, a burst or a murmur), the pitch's scoop and overshoot
   * at the onset (or, joined, its glide from the note before: the vowel goes on, no consonant), the
   * late vibrato, the fall at a phrase's end; the bright "ring" a lift at 3 kHz. About 23 nodes a
   * note (two sources and an LFO).
   */
  private singNote(midi: number, at: number, dur: number, v: Voicing, pt: Patch, p: Play, bag: Bag): Sounding {
    const ctx = this.ctx;
    const sg = pt.sing!;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.06, at + dur - 0.01);
    const f0 = hz(midi);
    // (SING_GAIN: the source's flat pulse train, normalised to its peak, is quieter than a sawtooth.)
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5 * SING_GAIN;
    const joined = !!p.legato;
    const det0 = p.detune ?? 0;
    // D304: each voice its own glottis (Patch.osc's first wave: glottal, glottalWarm, glottalLow).
    const o = bag.src(this.osc(pt.osc[0]?.wave ?? "glottal"));
    // The pitch: joined, from the note before (a glide of about 70 ms); else scooped up from below.
    if (joined && p.from !== undefined) {
      o.frequency.setValueAtTime(hz(p.from), t);
      o.frequency.setTargetAtTime(f0, t + 0.005, 0.025);
    } else o.frequency.value = f0;
    const dir = joined && p.from !== undefined ? Math.sign(midi - p.from) || 1 : 1;
    o.detune.setValueAtTime(det0 + (joined ? 0 : -sg.scoop), t);
    o.detune.linearRampToValueAtTime(det0 + dir * sg.over, t + (joined ? 0.09 : 0.07));
    o.detune.setTargetAtTime(det0, t + (joined ? 0.09 : 0.07), 0.045);
    // A phrase's end: the fall as the voice lets go.
    const fallAt = Math.max(t + 0.25, end - 0.16);
    if (p.final && !p.tie && sg.fall && end - t > 0.35) {
      o.detune.setValueAtTime(det0, fallAt);
      o.detune.linearRampToValueAtTime(det0 - sg.fall, end);
    }
    const voiced = bag.add(ctx.createGain());
    o.connect(voiced);
    // Breath: noise under the voice (and a consonant's burst through it).
    const nz = bag.src(this.noise());
    const air = bag.add(ctx.createGain());
    nz.connect(air);
    const src = bag.add(ctx.createGain());
    voiced.connect(src);
    air.connect(src);
    const cons = CONSONANTS[sg.cons];
    const ct = joined ? 0 : cons.time;
    voiced.gain.setValueAtTime(joined ? 1 : cons.voiced, t);
    if (!joined) {
      if (cons.voiced === 0) voiced.gain.setValueAtTime(0, t + ct * 0.4);
      voiced.gain.setTargetAtTime(1, t + ct * 0.4, ct / 3);
    }
    const breath = sg.breath * 0.35;
    air.gain.setValueAtTime(breath, t);
    if (!joined && cons.burst) {
      // D304: the burst comes in over a few ms (a step was a click on every new note).
      air.gain.linearRampToValueAtTime(cons.burst, t + ct * 0.35);
      air.gain.setTargetAtTime(breath, t + ct * 0.35 + 0.004, 0.008);
    } else if (!joined) air.gain.setTargetAtTime(breath, t, 0.02);
    // D305: an aspirated onset (Sing.aspirate): more breath as the syllable begins.
    if (!joined && sg.aspirate) {
      air.gain.setValueAtTime(breath + sg.aspirate, t + ct * 0.35 + 0.006);
      air.gain.setTargetAtTime(breath, t + ct * 0.35 + 0.01, 0.025);
    }
    // The formants, the singer's size on them; from the consonant's into the vowel's.
    const out = bag.add(ctx.createGain());
    const scale = (sg.type === "bass" || sg.type === "tenor" ? 1 : 1.12) * sg.size;
    for (const [i, [f, db, bw]] of VOWELS[sg.type][sg.vowel].entries()) {
      const bp = bag.add(ctx.createBiquadFilter());
      bp.type = "bandpass";
      // D305: the first formant tuned up to the pitch (Sing.tune), a soprano's on her high notes.
      // D311: the player's touch: the vowel closed toward the soft side, opened toward the strong (touch-expr.ts formantAt).
      const fx = p.open === undefined ? f : formantAt(f, VOWELS[sg.type][VOWEL_CLOSED[sg.vowel] ?? "o"][i]?.[0] ?? f, i, p.open);
      const tuned = (m: number) => (i === 0 && sg.tune ? Math.max(fx * sg.size, sg.tune * hz(m)) : fx * sg.size);
      const fv = Math.min(ctx.sampleRate * 0.45, tuned(midi));
      bp.Q.value = (f * sg.size) / (bw * sg.size * (sg.bw ?? 1));
      if (!joined && i < 3) {
        bp.frequency.setValueAtTime(Math.max(cons.f[i] * scale, fv - f * sg.size + cons.f[i] * scale), t);
        bp.frequency.setTargetAtTime(fv, t + ct * 0.5, ct / 2.5);
      } else if (joined && p.from !== undefined && i === 0 && sg.tune && tuned(p.from) !== tuned(midi)) {
        bp.frequency.setValueAtTime(Math.min(ctx.sampleRate * 0.45, tuned(p.from)), t);
        bp.frequency.setTargetAtTime(fv, t + 0.005, 0.03);
      } else bp.frequency.value = fv;
      const g = bag.add(ctx.createGain());
      g.gain.value = 10 ** ((db + (i >= 2 ? (sg.upper ?? 0) : 0)) / 20);
      src.connect(bp).connect(g).connect(out);
    }
    let tail: AudioNode = out;
    // D304: nothing above the singer's formants (the harmonics leaking through their skirts glittered).
    if (sg.top) {
      const lp = bag.add(ctx.createBiquadFilter());
      lp.type = "lowpass";
      lp.frequency.value = Math.min(ctx.sampleRate * 0.45, sg.top * sg.size);
      lp.Q.value = 0.6;
      tail = tail.connect(lp);
    }
    if (sg.ring) {
      const sh = bag.add(ctx.createBiquadFilter());
      sh.type = "peaking";
      sh.frequency.value = 3000;
      sh.Q.value = 0.9;
      sh.gain.value = sg.ring;
      tail = tail.connect(sh);
    }
    // D311: the player's swell (messa di voce), and a closed singer's lowpass (SOLO VOICES before its recording).
    const xs = p.hold ? this.touchStage(tail, p, f0, bag) : null;
    if (xs) tail = xs.out;
    tail = this.shelf(tail, Math.max(1200, Math.min(3500, f0 * 4)), t, p.tone ?? 0, p.crisp ?? 0, bag);
    const g = bag.add(ctx.createGain());
    const a = joined ? 0.02 : Math.max(0.006, pt.amp.a);
    const relAt = Math.max(t + a + 0.02, end - (p.tie ? Math.min(pt.amp.r, p.tie / 2) : pt.amp.r));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, relAt);
    g.gain.linearRampToValueAtTime(0, end);
    // The vibrato: late, ramped in (Patch.vib); and the subject's own (Play.vib).
    const lfos: AudioScheduledSourceNode[] = [];
    // D311: VOCAL SYNTH, the player's note: straight while the thumb moves; held still BLOOM_STILL s, it blooms
    // into a little vibrato (the voice's own, at most BLOOM_CENTS; the bass, which has none, BLOOM_DEFAULT).
    const bloomCents = Math.min(BLOOM_CENTS, pt.vib?.depth ?? BLOOM_DEFAULT);
    const bloom = p.open !== undefined && p.hold === "messa" ? this.touchVibrato([o.detune], t, 0, 0, pt.vib?.rate ?? 5.4, bag, lfos) : null;
    if (bloom) bloom.gain.setTargetAtTime(bloomCents, t + BLOOM_STILL, 0.12);
    if (!bloom && pt.vib && end - t > pt.vib.delay + 0.1) {
      const lfo = bag.src(ctx.createOscillator());
      lfos.push(lfo);
      const depth = bag.add(ctx.createGain());
      lfo.frequency.value = pt.vib.rate;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + pt.vib.delay);
      depth.gain.linearRampToValueAtTime(pt.vib.depth, t + pt.vib.delay + 0.3);
      lfo.connect(depth).connect(o.detune);
      lfo.start(t);
    }
    this.vibrato([o.detune], t, end, p.vib ?? 0, bag, lfos);
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    const dyn = bag.add(ctx.createGain());
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      tail.connect(g).connect(dyn).connect(pan).connect(this.busOf(p, pt));
    } else tail.connect(g).connect(dyn).connect(this.busOf(p, pt));
    this.send(pan ?? dyn, p.room, bag);
    this.fxSend(pan ?? dyn, pt.send, bag);
    o.start(t);
    nz.start(t);
    halt(o, end + 0.05);
    halt(nz, end + 0.05);
    for (const l of lfos) halt(l, end + 0.05);
    let stopped = false;
    const swell = p.hold ? this.touchShape({ ...xs }, () => !stopped) : undefined;
    /** Where the thumb last moved to (a move of BLOOM_MOVE or more starts the stillness over). */
    let anchor = 0;
    const shape = swell
      ? (x: number) => {
          swell(x);
          if (!bloom || stopped || Math.abs(x - anchor) < BLOOM_MOVE) return;
          anchor = x;
          const now = ctx.currentTime;
          retarget(bloom.gain, 0, now, 0.08);
          bloom.gain.setTargetAtTime(bloomCents, now + BLOOM_STILL, 0.12);
        }
      : undefined;
    return {
      shape,
      stop: (when = ctx.currentTime) => {
        if (stopped) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(peak, s));
        const r = Math.max(0.02, p.legato ? 0.03 : pt.amp.r);
        g.gain.linearRampToValueAtTime(0, s + r);
        for (const x of [o, nz, ...lfos]) halt(x, s + r + 0.05);
      },
      bend: (cents: number) => {
        if (!stopped) o.detune.setTargetAtTime(det0 + cents, ctx.currentTime, 0.02);
      },
      glide: (to: number, tau?: number) => {
        if (!stopped) o.frequency.setTargetAtTime(hz(to), ctx.currentTime, tau ?? 0.03);
      },
      dyn: (level: number) => {
        if (!stopped) dyn.gain.setTargetAtTime(Math.max(0.05, level), ctx.currentTime, 0.06);
      },
    };
  }

  /**
   * D179, the swoosh: a note flicked upwards as it is let go flies up (its pitch an octave higher, a
   * filter opening, a breath of air) and comes down bouncing, quicker and quicker, softer and softer,
   * like a ping-pong ball settling, but faster.
   */
  swoosh(midi: number, v: Voicing, level = 1) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const f0 = hz(midi);
    const bag = new Bag();
    const out = bag.add(ctx.createGain());
    out.gain.value = 0.22 * level;
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    if (pan) (pan.pan.value = Math.max(-1, Math.min(1, v.pan)), out.connect(pan).connect(this.bus));
    else out.connect(this.bus);
    // The flight: a sawtooth gliding up an octave through an opening filter, and a whoosh of air.
    const o = bag.src(ctx.createOscillator());
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 2, t + 0.18);
    const fl = bag.add(ctx.createBiquadFilter());
    fl.type = "lowpass";
    fl.Q.value = 6;
    fl.frequency.setValueAtTime(400, t);
    fl.frequency.exponentialRampToValueAtTime(7000, t + 0.18);
    const og = bag.add(ctx.createGain());
    og.gain.setValueAtTime(0.9, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(fl).connect(og).connect(out);
    o.start(t);
    halt(o, t + 0.26);
    const n = bag.src(this.noise());
    const nf = bag.add(ctx.createBiquadFilter());
    nf.type = "bandpass";
    nf.Q.value = 3;
    nf.frequency.setValueAtTime(800, t);
    nf.frequency.exponentialRampToValueAtTime(6000, t + 0.2);
    const ng = bag.add(ctx.createGain());
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    n.connect(nf).connect(ng).connect(out);
    n.start(t);
    halt(n, t + 0.26);
    // The bounces: ever shorter gaps, ever softer.
    let at = t + 0.24;
    let gap = 0.11;
    let gain = 0.7;
    for (let k = 0; k < 9; k++) {
      const b = bag.src(ctx.createOscillator());
      b.type = "triangle";
      b.frequency.value = f0 * 2 * (1 + k * 0.01);
      const bg = bag.add(ctx.createGain());
      bg.gain.setValueAtTime(gain, at);
      bg.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
      b.connect(bg).connect(out);
      b.start(at);
      halt(b, at + 0.035);
      at += gap;
      gap *= 0.72;
      gain *= 0.7;
    }
  }

  /** The rhythm section (D177; D181): a synthesized kit (a band's, a console's, an analog machine's), quiet under the music. */
  drum(d: Drum, at: number, vel: number, kit: Kit = "acoustic", gain = 1, low = 0) {
    const ctx = this.ctx;
    const bag = new Bag();
    const g = bag.add(ctx.createGain());
    // D514: on a phone, a drum machine's low drums' harmonics (lowHarmonics), `low` their level.
    if (low > 0 && (d === "kick" || d === "tomLow" || d === "tomHigh")) this.lowHarmonics(bag, g, this.master, low);
    // D344: the friends' backing drums below and behind: softer, and nothing under BACKING_HIGHPASS_HZ (the bass's room).
    const back = backingOn();
    if (back) {
      const hp = bag.add(ctx.createBiquadFilter());
      hp.type = "highpass";
      hp.frequency.value = BACKING_HIGHPASS_HZ;
      hp.Q.value = 0.7;
      g.connect(hp).connect(this.master);
    } else g.connect(this.master);
    const lvl = 0.22 * vel * gain * (back ? BACKING_LEVEL : 1);
    const noise = (type: BiquadFilterType, f: number, q: number, len: number, attack = 0.001) => {
      const n = bag.src(this.noise());
      const fl = bag.add(ctx.createBiquadFilter());
      fl.type = type;
      fl.frequency.value = f;
      fl.Q.value = q;
      const ng = bag.add(ctx.createGain());
      ng.gain.setValueAtTime(0, at);
      ng.gain.linearRampToValueAtTime(lvl, at + attack);
      ng.gain.exponentialRampToValueAtTime(0.0001, at + len);
      n.connect(fl).connect(ng).connect(g);
      n.start(at, Math.random() * 0.5);
      halt(n, at + len + 0.02);
    };
    const tone = (type: OscillatorType, f0: number, f1: number, len: number, level = lvl) => {
      const o = bag.src(ctx.createOscillator());
      o.type = type;
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + len * 0.6);
      const og = bag.add(ctx.createGain());
      og.gain.setValueAtTime(level, at);
      og.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(og).connect(g);
      o.start(at);
      halt(o, at + len + 0.02);
    };
    if (kit === "chip") {
      // A console's noise channel and a pulse dropping in pitch.
      switch (d) {
        case "kick":
          return tone("square", 180, 50, 0.1, lvl * 0.9);
        case "snare":
        case "clap":
          return noise("highpass", 1200, 0.5, 0.09);
        case "hat":
        case "shaker":
        case "ride":
        case "brush":
          return noise("highpass", 9000, 0.5, 0.025);
        case "rim":
          return tone("square", 1200, 1150, 0.025, lvl * 0.5);
        // D514: CHIP DRUMS' crash and open hat (the noise channel held longer), its toms (the pulse falling slower).
        case "crash":
          return noise("highpass", 5000, 0.5, 0.5);
        case "openhat":
          return noise("highpass", 8000, 0.5, 0.14);
        case "tomHigh":
          return tone("square", 320, 160, 0.14, lvl * 0.7);
        case "tomLow":
          return tone("square", 200, 90, 0.18, lvl * 0.8);
      }
    }
    if (kit === "analog") {
      // An analog drum machine: a booming sine kick, a snappy snare, metallic hats, a clap.
      switch (d) {
        case "kick":
          return tone("sine", 95, 42, 0.55, lvl * 2.4);
        case "snare":
          noise("bandpass", 2200, 0.6, 0.18);
          return tone("triangle", 190, 170, 0.1, lvl * 0.9);
        case "clap":
          for (const k of [0, 0.011, 0.022]) {
            const n = bag.src(this.noise());
            const fl = bag.add(ctx.createBiquadFilter());
            fl.type = "bandpass";
            fl.frequency.value = 1200;
            const ng = bag.add(ctx.createGain());
            ng.gain.setValueAtTime(lvl, at + k);
            ng.gain.exponentialRampToValueAtTime(0.0001, at + k + (k === 0.022 ? 0.14 : 0.012));
            n.connect(fl).connect(ng).connect(g);
            n.start(at + k);
            halt(n, at + k + 0.16);
          }
          return;
        case "hat":
        case "ride":
          noise("highpass", 8000, 1.2, d === "ride" ? 0.3 : 0.04);
          return tone("square", 540, 540, 0.04, lvl * 0.08);
        case "rim":
          return tone("triangle", 820, 800, 0.03, lvl * 0.8);
        case "shaker":
        case "brush":
          return noise("highpass", 6500, 0.8, 0.05, 0.008);
        // D514: DRUM MACHINE's cymbal, open hat and toms (the analog machines' sine toms).
        case "crash":
          noise("highpass", 4500, 0.7, 1.1);
          return tone("square", 540, 540, 0.3, lvl * 0.05);
        case "openhat":
          noise("highpass", 8000, 1.2, 0.28);
          return tone("square", 540, 540, 0.1, lvl * 0.06);
        case "tomHigh":
          return tone("sine", 260, 170, 0.32, lvl * 1.6);
        case "tomLow":
          return tone("sine", 170, 100, 0.4, lvl * 1.8);
      }
    }
    // D527: the drum library's synthesized machines (drum-grids.ts kit): a 909 (house, techno), a LinnDrum (80s synth-pop),
    // a glitch kit (IDM: clicks, blips, cut-short noise).
    const clap = (f: number, tail: number) => {
      for (const k of [0, 0.01, 0.021]) {
        const n = bag.src(this.noise());
        const fl = bag.add(ctx.createBiquadFilter());
        fl.type = "bandpass";
        fl.frequency.value = f;
        const ng = bag.add(ctx.createGain());
        ng.gain.setValueAtTime(lvl, at + k);
        ng.gain.exponentialRampToValueAtTime(0.0001, at + k + (k === 0.021 ? tail : 0.011));
        n.connect(fl).connect(ng).connect(g);
        n.start(at + k);
        halt(n, at + k + tail + 0.02);
      }
    };
    if (kit === "tr909") {
      switch (d) {
        case "kick":
          noise("highpass", 3000, 0.7, 0.012);
          return tone("sine", 160, 48, 0.38, lvl * 2.4);
        case "snare":
          noise("bandpass", 3200, 0.5, 0.2);
          return tone("triangle", 205, 180, 0.09, lvl * 0.9);
        case "clap":
          return clap(1150, 0.16);
        case "hat":
        case "shaker":
          noise("highpass", 9000, 1.4, 0.045);
          return tone("square", 620, 610, 0.03, lvl * 0.06);
        case "openhat":
          noise("highpass", 8500, 1.2, 0.32);
          return tone("square", 620, 610, 0.12, lvl * 0.05);
        case "ride":
          noise("bandpass", 7000, 1.6, 0.6);
          return tone("square", 760, 755, 0.4, lvl * 0.07);
        case "crash":
          return noise("highpass", 5000, 0.6, 1.2);
        case "rim":
          return tone("triangle", 1650, 1600, 0.025, lvl * 0.9);
        case "brush":
          return noise("highpass", 6500, 0.8, 0.05, 0.008);
        case "tomHigh":
          return tone("sine", 240, 160, 0.3, lvl * 1.6);
        case "tomLow":
          return tone("sine", 150, 95, 0.36, lvl * 1.8);
      }
    }
    if (kit === "linn") {
      switch (d) {
        case "kick":
          return tone("sine", 120, 52, 0.26, lvl * 2.3);
        case "snare":
          noise("bandpass", 1800, 0.6, 0.26);
          return tone("triangle", 185, 165, 0.12, lvl * 1.0);
        case "clap":
          return clap(1400, 0.2);
        case "hat":
        case "shaker":
        case "brush":
          return noise("highpass", 7200, 0.9, 0.05);
        case "openhat":
          return noise("highpass", 7000, 0.9, 0.3);
        case "ride":
          return noise("bandpass", 5500, 1.2, 0.5);
        case "crash":
          return noise("highpass", 4200, 0.6, 1.3);
        case "rim":
          return tone("square", 1500, 1450, 0.03, lvl * 0.6);
        case "tomHigh":
          return tone("sine", 280, 150, 0.32, lvl * 1.6);
        case "tomLow":
          return tone("sine", 180, 92, 0.38, lvl * 1.8);
      }
    }
    // D568: ARCADE's chip kit (a pinball's, a coin-op's): the kick a pulse's chirp swept down, the noise channel's snare,
    // square clicks for the hats, the toms a pulse falling.
    if (kit === "arcade") {
      switch (d) {
        case "kick":
          tone("square", 240, 46, 0.11, lvl * 0.85);
          return tone("triangle", 130, 42, 0.16, lvl * 1.5);
        case "snare":
        case "clap":
          noise("highpass", 1500, 0.6, 0.11);
          return tone("square", 360, 300, 0.022, lvl * 0.45);
        case "hat":
        case "shaker":
        case "brush":
          noise("highpass", 9500, 0.7, 0.012);
          return tone("square", 6200, 6100, 0.01, lvl * 0.2);
        case "openhat":
          noise("highpass", 7600, 0.6, 0.12);
          return tone("square", 6200, 6100, 0.02, lvl * 0.16);
        case "ride":
          noise("highpass", 6800, 0.8, 0.09);
          return tone("square", 5200, 5150, 0.05, lvl * 0.16);
        case "crash":
          return noise("highpass", 4200, 0.5, 0.6);
        case "rim":
          return tone("square", 1450, 1400, 0.02, lvl * 0.55);
        case "tomHigh":
          return tone("square", 420, 180, 0.12, lvl * 0.7);
        case "tomLow":
          return tone("square", 260, 90, 0.16, lvl * 0.8);
      }
    }
    // D570: SCORE SYNTH's kit: a modern analog machine (a sine kick with a click, a noise snare over its tone, a clap,
    // short noise hats, the toms' sines).
    if (kit === "synth") {
      switch (d) {
        case "kick":
          noise("highpass", 4000, 0.7, 0.008);
          return tone("sine", 125, 44, 0.42, lvl * 2.4);
        case "snare":
          noise("bandpass", 2400, 0.7, 0.17);
          return tone("triangle", 200, 180, 0.1, lvl * 0.9);
        case "clap":
          return clap(1250, 0.18);
        case "hat":
        case "brush":
          return noise("highpass", 8500, 1, 0.035);
        case "shaker":
          return noise("highpass", 7000, 0.9, 0.05, 0.006);
        case "openhat":
          return noise("highpass", 8000, 1, 0.25);
        case "ride":
          return noise("bandpass", 6500, 1.4, 0.4);
        case "crash":
          return noise("highpass", 4600, 0.6, 1.2);
        case "rim":
          return tone("triangle", 1200, 1180, 0.03, lvl * 0.8);
        case "tomHigh":
          return tone("sine", 220, 150, 0.3, lvl * 1.6);
        case "tomLow":
          return tone("sine", 140, 90, 0.36, lvl * 1.8);
      }
    }
    if (kit === "glitch") {
      switch (d) {
        case "kick":
          return tone("sine", 210, 40, 0.13, lvl * 2.4);
        case "snare":
        case "clap":
          noise("highpass", 2600, 0.9, 0.06);
          return tone("square", 330, 300, 0.02, lvl * 0.5);
        case "hat":
        case "shaker":
        case "brush":
          return noise("highpass", 10000, 1.5, 0.014);
        case "openhat":
          return noise("bandpass", 9000, 3, 0.09);
        case "ride":
          return tone("square", 2900, 2850, 0.05, lvl * 0.12);
        case "crash":
          return noise("bandpass", 6000, 1.2, 0.35);
        case "rim":
          return tone("square", 2400, 2300, 0.012, lvl * 0.7);
        case "tomHigh":
          return tone("square", 420, 260, 0.08, lvl * 0.7);
        case "tomLow":
          return tone("square", 260, 150, 0.1, lvl * 0.8);
      }
    }
    switch (d) {
      case "clap":
        return noise("bandpass", 1300, 0.7, 0.12);
      case "kick":
        return tone("sine", 140, 45, 0.3, lvl * 2.2);
      case "snare":
        noise("bandpass", 1900, 0.8, 0.16);
        return tone("triangle", 220, 160, 0.08, lvl * 0.8);
      case "hat":
        return noise("highpass", 7500, 0.7, 0.05);
      case "ride":
        noise("bandpass", 6000, 1.5, 0.45);
        return tone("square", 820, 800, 0.3, lvl * 0.12);
      case "rim":
        return tone("square", 1700, 1600, 0.03, lvl * 0.7);
      case "brush":
        return noise("lowpass", 3500, 0.5, 0.22, 0.05);
      case "shaker":
        return noise("highpass", 6000, 0.8, 0.07, 0.01);
      // D514: the kit's stand-ins till its recordings arrive.
      case "crash":
        return noise("highpass", 4500, 0.6, 1.2);
      case "openhat":
        return noise("highpass", 7000, 0.7, 0.28);
      case "tomHigh":
        return tone("sine", 260, 170, 0.25, lvl * 1.6);
      case "tomLow":
        return tone("sine", 170, 105, 0.3, lvl * 1.8);
    }
  }

  /**
   * The rhythm section's hits for one beat (the ensemble's groove), scheduled at `at`, a beat lasting
   * `beatS` seconds. D482: D186's layers that grew with the player's run (shaker, clap, kick) gone.
   */
  groove(at: number, beatS: number, b: number, bar: number, per: number, compound: boolean, cx?: GrooveContext) {
    this.roomTo();
    // D540: a band's echoes follow the beat.
    if (this.chain && beatS > 0) this.chain.setBeat(beatS);
    this.sweep();
    // D514, D526: the friends' DRUMS: the style chosen for the piece (drum-library.ts; else the sound's HOME), in place of
    // any sound's own drums (never two drummers): a written or D514 pattern on a kit, or a band's own drummer.
    const piece = cx?.piece ?? this.drumF;
    this.lastBeatS = beatS;
    // D536: the clock's tick (the studio's registration events land on it).
    if (cx && beatS > 0) this.tickClock = { tick: cx.tick, at, tps: cx.beat / beatS };
    const tickOf = (a: number) => (cx?.tick ?? 0) + a * (cx?.beat ?? 1);
    // D623: the pilot world's effects in this beat (world-sfx.ts; whatever the drums do).
    if (cx && beatS > 0) this.worldBeat(at, beatS, cx);
    if (backingOn() && piece) {
      if (piece !== this.drumF) this.drumsFor(piece);
      const style = drumStyleFor(piece.id);
      const pcx: GrooveContext = { tick: cx?.tick ?? 0, beat: cx?.beat ?? 1, fills: cx?.fills ?? [], end: cx?.end ?? piece.length, dynDb: cx?.dynDb ?? 0, piece };
      switch (styleInfo(style).engine) {
        case "brushes": {
          const fills = brushFills(piece, pcx.beat, per);
          return (this.brushes(at, beatS, b, per, compound, { ...pcx, fills, dynDb: (cx?.dynDb ?? 0) + brushDb(piece, pcx.tick) }, style), true);
        }
        case "rockBand":
          return (this.rockDrums(ROCK_STYLE[style] ?? "abbey", at, beatS, b, per, compound, pcx), true);
        case "latin":
          return (this.latin(LATIN_STYLE[style] ?? "salsa", at, beatS, { ...pcx, latin: latinPlan(piece, pcx.beat, per) }, style), true);
        case "bossa":
          return (this.bossaDrums(at, beatS, b, per, compound, pcx), true);
        case "pet":
          return (this.petDrums(at, beatS, b, per, compound, pcx), true);
        case "score": {
          // D532: the score-driven orchestral and period styles (score-drums.ts): the plan's strokes in this beat, each
          // logged at the tick it belongs to (a flam's grace a few ms before it).
          if (!isScoreStyle(style)) break;
          for (const h of scoreBeat(piece, style, pcx.tick, pcx.beat, beatS, cx?.dynDb ?? 0)) this.scheduleKitHit({ voice: "kit", style, piece: h.piece, tick: h.tick ?? tickOf(h.at), when: at + h.at * beatS, vel: h.vel, ...(h.role ? { role: h.role } : {}) }, (w, v) => this.kit(style, { ...h, vel: v }, w));
          return true;
        }
      }
      const hits = kitBeat(style, { b, per, compound, beatS, tick: pcx.tick, beat: pcx.beat, form: formOf(piece), dynDb: cx?.dynDb ?? 0, keyAt: keyFor(piece), home: piece.key, piece: piece.id });
      for (const h of hits) this.scheduleKitHit({ voice: "kit", style, piece: h.piece, tick: tickOf(h.at), when: at + h.at * beatS, vel: h.vel, ...(h.role ? { role: h.role } : {}), ...(h.dur !== undefined ? { dur: h.dur } : {}) }, (w, v) => this.kit(style, { ...h, vel: v }, w));
      return true;
    }
    const gr = grooveNow();
    if (!gr) return false;
    // D503: JAZZ QUARTET's brushes: their pattern, Busoni's level and the piece's fills (jazz-drums.ts), recorded.
    if (gr.kit === "brushes") return (this.brushes(at, beatS, b, per, compound, cx), true);
    // D520/D522: SALSA's and CHORINHO's percussion: the piece's plan, Busoni's level, recorded (latin-drums.ts).
    if (gr.kit === "latin" && LATIN_GROOVE[gr.groove] && cx?.latin) return (this.latin(LATIN_GROOVE[gr.groove], at, beatS, cx), true);
    // D523, D525: ABBEY ROAD's and KRAUTROCK's kit: their pattern, the fugue's form and Busoni's level (rock-drums.ts), recorded.
    if (gr.kit === "rock") return (this.rockDrums(ROCK_GROOVES[gr.groove] ?? "abbey", at, beatS, b, per, compound, cx), true);
    // D521: BOSSA NOVA's drums: the bossa on the score's eighths, the piece's form (bossa-drums.ts), recorded.
    if (gr.kit === "bossa") return (this.bossaDrums(at, beatS, b, per, compound, cx), true);
    // D524: PET SOUNDS' drums: the ballad's kit, the tambourine, the timpani on the bass's note; the piece's form (pet-drums.ts).
    if (gr.kit === "pet") return (this.petDrums(at, beatS, b, per, compound, cx), true);
    for (const h of grooveHits(gr.groove, b, bar, per, compound)) this.scheduleKitHit({ voice: "drum", style: gr.groove, piece: h.drum, tick: tickOf(h.at), when: at + h.at * beatS, vel: h.vel }, (w, v) => this.drum(h.drum, w, v, gr.kit));
    return true;
  }

  /** D526: every stroke scheduled (the tests, and the studio's music events later: the tick and the velocity played). */
  readonly kitEvents: KitEvent[] = [];
  /**
   * D526, THE SINGLE CHOKE POINT: every drummer's every stroke (the library's styles, the bands' own drummers, CLASSIC
   * CHIP's loop; the rolls, fills and landings too) is scheduled here, with the fugue's tick it falls on, its time on the
   * audio clock and the velocity it is played at; `sound` then strikes it.
   */
  scheduleKitHit(e: KitEvent, sound: (when: number, vel: number) => void) {
    // D601: never over silence: no stroke before the fugue's first note (a style's bar begun before an upbeat subject:
    // I/3's kit, I/5's march struck alone a beat or more before the music; the drums sit under the band, and there is none).
    const f = this.drumF;
    if (f && e.tick < firstOnset(f) - 1) return;
    // D601: and under the band's texture: a stroke as soft as the voices sounding over the 400 ms after it are few (the
    // energy with the share of the voices sounding: one voice of four 6 dB under the four), none where none sounds.
    // The rolls' and fills' dense strokes a share under their written level, an accent at most ACCENT_MAX; past the last
    // chord's attack (and with it, but its accent) the drums let it ring (RING_SHARE).
    if (f) {
      let g = textureGain(f, e.tick);
      if (g <= 0) return;
      if (e.role === "roll" || e.role === "fill") g *= ROLL_SHARE;
      if (e.tick > lastOnset(f) + f.tpq / 4) {
        // past the last chord: only a roll dying under it (the timpani's), softly; no groove on a chord left to ring
        if (e.role !== "roll") return;
        g *= RING_SHARE;
      }
      else if (e.tick >= lastOnset(f) - 1 && e.role !== "accent") g *= RING_SHARE * RING_SHARE;
      let v = e.vel * g;
      if (e.role === "accent") v = Math.min(v, ACCENT_MAX);
      if (v !== e.vel) e = { ...e, vel: v };
    }
    this.kitEvents.push(e);
    if (this.kitEvents.length > 1024) this.kitEvents.splice(0, 512);
    sound(e.when, e.vel);
    // D536: the studio's live events (music-events.ts): the stroke as played, its level the velocity; a roll its length.
    if (musicLive()) {
      const kind = musicKindOf(e);
      if (kind) emitMusic({ tick: e.tick, kind, level: Math.max(0, Math.min(1, e.vel)), piece: e.piece, ...(e.dur !== undefined ? { dur: e.dur } : kind === "roll" ? { dur: 0 } : {}) });
    }
  }
  /**
   * D623, THE PILOT WORLDS' EFFECTS (world-sfx.ts): the game names the piece whose world its box shows (ProtoGame; null:
   * none, the tutorial's box, Kimiko's recording); each beat its effects falling in the beat are scheduled through
   * scheduleSfx. The swell is cut into the beats (each a piece of one noise, ramped beat to beat), so nothing outlasts
   * the schedule's horizon (a pause stops it within the beat).
   */
  private world: { f: TouchFugue; shown: boolean } | null = null;
  worldFor(f: TouchFugue | null, shown = true) {
    this.world = f ? { f, shown } : null;
  }
  /** D623: every effect scheduled (the tests): its kind, tick, time, velocity as played (the swell: each beat's piece, its end's too). */
  readonly sfxEvents: SfxScheduled[] = [];
  private worldBeat(at: number, beatS: number, cx: GrooveContext) {
    const w = this.world;
    if (!w) return;
    const kinds = sfxKindsNow(w.f, w.shown);
    if (!kinds.length) return;
    const f = w.f;
    const t0 = cx.tick;
    const t1 = cx.tick + cx.beat;
    const when = (t: number) => at + ((t - t0) / cx.beat) * beatS;
    for (const e of sfxPlan(f, kinds)) {
      if (e.kind === "swell") {
        if (e.end <= t0 || e.tick >= t1) continue;
        const a = Math.max(t0, e.tick);
        const b = Math.min(t1, e.end);
        const k = swellSurge(Math.round(t0 / cx.beat));
        const k1 = swellSurge(Math.round(t1 / cx.beat));
        const v1 = swellEnv(f, b) * (b === t1 ? k1 : k) * sfxShare(f, b);
        this.scheduleSfx({ kind: "swell", tick: a, end: b, when: when(a), until: when(b), vel: swellEnv(f, a) * k, vel1: v1, since: e.tick }, (x) => this.sfxSound(x));
      } else if (isFlow(e.kind)) {
        // D643: a bed or a climax's shape: this beat's piece, each layer's curve its envelope times its textures,
        // faded in over SWELL_XF from the beat (the last beat's piece fading out over the same), on SWELL_XF past it.
        if (e.end <= t0 || e.tick >= t1) continue;
        const a = Math.max(t0, e.tick);
        const b = Math.min(t1, e.end);
        const tps = cx.beat / beatS;
        const from = when(a);
        const until = when(b);
        const spec = CURVE_SOUND[e.kind]!;
        const nomTps = tpsOf(f);
        const curves: Float32Array[] = [];
        const res: number[] = [];
        for (const L of spec.layers) {
          const n = Math.max(2, Math.ceil((until + SWELL_XF - from) / L.res) + 1);
          const c = new Float32Array(n);
          for (let i = 0; i < n; i++) {
            const t = from + i * L.res;
            const tk = Math.min(e.end, a + (t - from) * tps);
            const xf = Math.max(0, Math.min(1, (t - from) / SWELL_XF, (until + SWELL_XF - t) / SWELL_XF));
            c[i] = flowEnv(f, e.kind, tk) * modsAt(f, L, tk, tk / nomTps) * xf;
          }
          c[n - 1] = 0;
          curves.push(c);
          res.push(L.res);
        }
        this.scheduleSfx({ kind: e.kind, tick: a, end: b, when: from, until, vel: flowEnv(f, e.kind, a), vel1: flowEnv(f, e.kind, Math.min(b, e.end - 1)), since: e.tick, curves, res, tps }, (x) => this.sfxSound(x));
      } else if (e.tick >= t0 && e.tick < t1) this.scheduleSfx({ kind: e.kind, tick: e.tick, end: e.tick, when: when(e.tick), until: when(e.tick), vel: e.vel, vel1: 0, since: e.tick, ...(e.seed !== undefined ? { seed: e.seed } : {}) }, (x) => this.sfxSound(x));
    }
  }
  /**
   * D623, THE EFFECTS' CHOKE POINT, beside the drums' (scheduleKitHit) with its thinning: none before the first note, none
   * past the last chord's attack (an effect never rings on it), at the band's texture over the 400 ms after it
   * (textureGain: none in a general rest).
   */
  scheduleSfx(e: SfxScheduled, sound: (e: SfxScheduled) => void) {
    const f = this.world?.f;
    if (!f) return;
    const g = sfxShare(f, e.tick);
    if (g <= 0 && !e.curves) return;
    if (e.curves && e.tps) {
      // D6xx-SFX2-2: a flowing effect thinned point by point (a general rest inside the beat dips it to nothing).
      const tps = e.tps;
      const curves = e.curves.map((c, li) => {
        const r = e.res![li];
        const out = new Float32Array(c.length);
        for (let i = 0; i < c.length; i++) out[i] = c[i] * sfxShare(f, Math.min(e.end, e.tick + i * r * tps));
        return out;
      });
      e = { ...e, curves, vel: e.vel * g, vel1: e.vel1 * sfxShare(f, e.end) };
      if (curves.every((c) => c.every((x) => x <= 1e-5))) return;
    } else e = { ...e, vel: e.vel * g };
    if (e.vel <= 1e-4 && e.vel1 <= 1e-4 && !e.curves) return;
    this.sfxEvents.push(e);
    if (this.sfxEvents.length > 1024) this.sfxEvents.splice(0, 512);
    sound(e);
  }
  /** D623: the effects' own noise (7.3 s, not the drums' one-second loop: a swell's repeats unheard), made once. */
  private sfxNoiseBuf: AudioBuffer | null = null;
  /** D624: the swell's noise read by the audio clock from its first beat's piece (so the beats' pieces are one noise). */
  private swellAnchor: { since: number; at: number } | null = null;
  private sfxNoise(): AudioBufferSourceNode {
    if (!this.sfxNoiseBuf) {
      const len = Math.round(this.ctx.sampleRate * 7.3);
      this.sfxNoiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.sfxNoiseBuf.getChannelData(0);
      let seed = 4242;
      for (let i = 0; i < len; i++) d[i] = ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    }
    const n = this.ctx.createBufferSource();
    n.buffer = this.sfxNoiseBuf;
    n.loop = true;
    return n;
  }
  /** D624-D627: an effect sounded (world-sfx.ts SFX_SOUND: noise through low-Q filters), into the master as the drums are. */
  private sfxSound(e: SfxScheduled) {
    if (CURVE_SOUND[e.kind]) return this.curveSound(e);
    const ctx = this.ctx;
    const spec = SFX_SOUND[e.kind];
    if (!spec) return;
    const bag = new Bag();
    const out = bag.add(ctx.createGain());
    out.gain.value = spec.gain;
    out.connect(this.master);
    const at = Math.max(e.when, ctx.currentTime);
    const len = this.sfxNoiseBuf ? this.sfxNoiseBuf.duration : 7.3;
    for (const L of spec.layers) {
      const n = bag.src(this.sfxNoise());
      let node: AudioNode = n;
      const fls: BiquadFilterNode[] = [];
      for (const [type, hz, q] of L.filters) {
        const fl = bag.add(ctx.createBiquadFilter());
        fl.type = type;
        fl.frequency.value = hz;
        fl.Q.value = q;
        node.connect(fl);
        node = fl;
        fls.push(fl);
      }
      const g = bag.add(ctx.createGain());
      node.connect(g).connect(out);
      if (e.kind === "swell") {
        // one noise across the swell's beats (the buffer read on from where the last beat's piece was), the filters
        // warmed for SWELL_WARM before the beat (silent), each beat's level ramped to the next's over SWELL_XF.
        const from = at - SWELL_WARM;
        if (!this.swellAnchor || this.swellAnchor.since !== e.since || from < this.swellAnchor.at) this.swellAnchor = { since: e.since, at: from };
        const off = (from - this.swellAnchor.at) % len;
        g.gain.setValueAtTime(0, from);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(L.level * e.vel, at + SWELL_XF);
        g.gain.linearRampToValueAtTime(L.level * e.vel1, Math.max(at + SWELL_XF, e.until));
        g.gain.linearRampToValueAtTime(0, Math.max(at + SWELL_XF, e.until) + SWELL_XF);
        const go = Math.max(ctx.currentTime, from);
        n.start(go, (off + go - from) % len);
        halt(n, Math.max(at + SWELL_XF, e.until) + SWELL_XF + 0.01);
        continue;
      }
      const v = L.level * e.vel;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(v, at + L.attack);
      if (L.hold > 0) g.gain.setValueAtTime(v, at + L.attack + L.hold);
      g.gain.exponentialRampToValueAtTime(Math.max(1e-5, v * 1e-3), at + L.len);
      if (spec.sweep) {
        // the band's centre up and back `cycles` times (exponential ramps), over the sound's length
        const { lo, hi, cycles } = spec.sweep;
        const bp = fls.find((x) => x.type === "bandpass");
        if (bp) {
          bp.frequency.setValueAtTime(lo, at);
          const step = L.len / (2 * cycles);
          for (let i = 1; i <= 2 * cycles; i++) bp.frequency.exponentialRampToValueAtTime(i % 2 ? hi : lo, at + i * step);
        }
      }
      n.start(at, (e.tick * 0.000137) % len);
      halt(n, at + L.len + 0.02);
    }
  }
  /** D643: the flowing effects' noise read on by the audio clock from each effect's first piece (one noise across its beats). */
  private flowAnchor = new Map<string, number>();
  /**
   * D6xx-SFX2-3, D644, D6xx-SFX2-1..3, THE SECOND BATCH's sounds (world-sfx.ts CURVE_SOUND): per layer the effects' noise through its low-Q filters,
   * its gain the layer's curve (a flowing effect's: the choke point's, warmed SWELL_WARM before the piece; a one-shot's: its
   * envelope times its textures, at the velocity played), into the master as the drums are.
   */
  private curveSound(e: SfxScheduled) {
    const ctx = this.ctx;
    const spec = CURVE_SOUND[e.kind]!;
    const f = this.world?.f;
    if (!f) return;
    const bag = new Bag();
    const out = bag.add(ctx.createGain());
    out.gain.value = spec.gain;
    out.connect(this.master);
    const now = ctx.currentTime;
    const flow = !!e.curves;
    const from = flow ? e.when : Math.max(e.when, now);
    const key = `${e.kind}:${e.since}`;
    if (flow) {
      const an = this.flowAnchor.get(key);
      if (an === undefined || from - SWELL_WARM < an) this.flowAnchor.set(key, from - SWELL_WARM);
    }
    const nom = tpsOf(f);
    spec.layers.forEach((L, li) => {
      let c: Float32Array;
      if (e.curves) c = e.curves[li];
      else {
        // a one-shot: its envelope times its textures, at the velocity played
        const n = Math.max(2, Math.ceil((L.len ?? shotLen(e.kind)) / L.res) + 1);
        c = new Float32Array(n);
        const sd = e.seed ?? 0;
        for (let i = 0; i < n; i++) {
          const s = i * L.res;
          c[i] = e.vel * shotEnv(L, s) * modsAt(f, L, e.tick + s * nom, s, sd);
        }
        c[n - 1] = 0;
      }
      const res = flow ? e.res![li] : L.res;
      // the curve from now where the piece is late (its start cut)
      let skip = 0;
      while (from + skip * res < now && skip < c.length - 2) skip++;
      const cv = new Float32Array(c.length - skip);
      for (let i = 0; i < cv.length; i++) cv[i] = c[i + skip] * L.level;
      const t0 = from + skip * res;
      const dur = (cv.length - 1) * res;
      if (!(cv.some((x) => x > 1e-6))) return;
      const nsrc = bag.src(this.sfxNoise());
      const len = this.sfxNoiseBuf ? this.sfxNoiseBuf.duration : 7.3;
      let node: AudioNode = nsrc;
      for (const [type, hz, q] of L.filters) {
        const fl = bag.add(ctx.createBiquadFilter());
        fl.type = type;
        fl.frequency.value = hz;
        fl.Q.value = q;
        node.connect(fl);
        node = fl;
      }
      const g = bag.add(ctx.createGain());
      node.connect(g).connect(out);
      const warm = Math.max(now, t0 - SWELL_WARM);
      // silent while the filters warm (no event at the curve's own start: a curve may not overlap one)
      g.gain.value = 0;
      if (warm < t0 - 1e-3) g.gain.setValueAtTime(0, warm);
      g.gain.setValueCurveAtTime(cv, t0, Math.max(1e-3, dur));
      const off = flow ? (warm - this.flowAnchor.get(key)! + li * 1.37) % len : ((e.tick * 0.000137) + (e.seed ?? 0) * 0.61 + li * 1.37) % len;
      nsrc.start(warm, off);
      halt(nsrc, t0 + dur + 0.02);
    });
  }
  /** D536: the fugue's tick at a time on the audio clock (from the last beat the rhythm section was given), or null. */
  private tickClock: { tick: number; at: number; tps: number } | null = null;
  tickAtTime(t: number): number | null {
    const c = this.tickClock;
    return c ? Math.round(c.tick + (t - c.at) * c.tps) : null;
  }
  /** D536: the registrations last heard (a key of the stops: the time last used), to report a change once. */
  private regSeen = new Map<string, number>();
  /** D536: a note's registration (the organ's, the harpsichord's), reported to the studio when it is new (not heard in REG_NEW_S). */
  private noteRegistration(id: string, live: Registration, lead: boolean, at: number) {
    if (!musicLive()) return;
    const key = `${id}:${lead ? "L" : "B"}:${live.tutti ? "T" : ""}${live.stops ? live.stops.join("+") : "-"}`;
    const last = this.regSeen.get(key);
    this.regSeen.set(key, at);
    if (last !== undefined && at - last < REG_NEW_S) return;
    // The first registration of a run is no change.
    const first = ![...this.regSeen.entries()].some(([k, t]) => k !== key && k.startsWith(`${id}:${lead ? "L" : "B"}:`) && at - t < REG_NEW_S * 4);
    if (first) return;
    const tick = this.tickAtTime(at);
    if (tick !== null) emitMusic({ tick, kind: "registration", level: lead ? 1 : 0.6, piece: live.stops ? live.stops.join(" ") : live.tutti ? "tutti" : "default" });
  }

  /** D514: the piece the drums play for (set as a piece starts, proto-game.ts; else from the first beat's context). */
  private drumF: TouchFugue | null = null;
  /** D514: the drums of a piece: its chosen drummer's recordings asked for now (when DRUMS is on), ahead of its first beat. */
  drumsFor(f: TouchFugue) {
    this.drumF = f;
    if (!backingOn()) return;
    for (const plan of drumFilesFor(drumStyleFor(f.id))) for (const m of plan.notes) loadOne(this.ctx, plan.set, m);
  }
  /** D514: the style the drums play now: for the piece playing, else the piece last chosen on the selection screen. */
  private drumStyle(): string | null {
    const id = this.drumF?.id ?? drumPiece();
    return id ? drumStyleFor(id) : null;
  }
  /** D514: the drum hits asked for (the tests: the style, the piece, its time, its level, a timpani's pitch). */
  readonly kitLog: { style: string; piece: KitPiece; at: number; vel: number; midi?: number }[] = [];
  /**
   * D514: one stroke of a drum preset: the synthesized kits (CHIP DRUMS on the console's kit, DRUM MACHINE on the analog
   * one, chip.ts drum: the backing's level and its cut under the bass), or a recording (the kit's piece at the layer of
   * its strength, evened by KIT_RMS; the timpani retuned to the key's tonic or dominant by rate) through the kit's way.
   */
  private kit(style: string, h: KitHit, at: number) {
    this.kitLog.push({ style, piece: h.piece, at, vel: h.vel, ...(h.midi !== undefined ? { midi: h.midi } : {}) });
    if (this.kitLog.length > 512) this.kitLog.splice(0, 256);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const synth = (k: Kit, v: number) => {
      const STAND: Partial<Record<KitPiece, Drum>> = { tamb: "shaker", triangle: "shaker", castanets: "rim", drumStick: "rim", cymbals: "crash", congaHigh: "tomHigh", bongo: "tomHigh", frameTek: "tomHigh", congaLow: "tomLow", timp: "tomLow", bassDrum: "tomLow", frameDum: "tomLow", sideDrum: "snare", fieldDrum: "snare", tabor: "tomHigh" };
      const d: Drum = STAND[h.piece] ?? (h.piece as Drum);
      // (the low drums' harmonics with the level: D529, a synthesized kit's share against D514's 5)
      this.drum(d, t, v, k, mx.share * (this.phone ? mx.phone : 1), this.phone ? KIT_DRUMS.phoneLow.level * mx.low * 0.25 * (mx.share / 5) : 0);
    };
    const mx = kitMix(style);
    // D567-D572: the synthesized pieces (the slapstick's, the swell's).
    if (TOON_PIECES.has(h.piece)) return this.toon(h.piece, t, h.vel, mx.share * (this.phone ? mx.phone : 1), h.len);
    const sk = synthKitOf(style);
    // D565: a style's layers under its kick and over its snare (weight: the sub and the click, the body and the crack).
    const lay = GRIDS[style]?.layer;
    if (lay) {
      const lg = (sk ? mx.share : mx.share * LAYER_RECORDED) * (this.phone ? mx.phone : 1);
      if (lay.kick && h.piece === "kick") this.layer("kick", t, h.vel * lay.kick, lg);
      if (lay.snare && (h.piece === "snare" || h.piece === "clap")) this.layer("snare", t, h.vel * lay.snare, lg);
    }
    if (sk) return synth(sk, h.vel);
    let set: string;
    let m: number;
    let rate = 1;
    if (h.piece === "timp") {
      const want = h.midi ?? 45;
      m = TIMP_MIDIS.reduce((a, c) => (Math.abs(c - want) < Math.abs(a - want) ? c : a), TIMP_MIDIS[0]);
      rate = 2 ** ((want - m) / 12);
      set = TIMP_SET;
    } else {
      const src = kitSource(style, h.piece);
      const mm = src ? kitMidi(src.set, src.voice, h.vel >= 0.55) : null;
      if (!src || mm === null) return synth("acoustic", h.vel * 0.6);
      set = src.set;
      m = mm;
    }
    const rec = loaded(set, m);
    if (!rec) {
      loadOne(ctx, set, m);
      return synth("acoustic", h.vel * 0.6);
    }
    const bag = new Bag();
    const src = bag.src(ctx.createBufferSource());
    src.buffer = rec.buffer;
    src.playbackRate.value = rate * (h.piece === "timp" ? 1 : (GRIDS[style]?.rate ?? 1));
    const g = bag.add(ctx.createGain());
    const rms = KIT_RMS[`${set}/${fileOf(set, m).replace(/\.mp3$/, "")}`] ?? KIT_DRUMS.ref;
    g.gain.value = KIT_DRUMS.piece[h.piece] * h.vel * 10 ** ((KIT_DRUMS.ref - rms) / 20);
    const hp = bag.add(ctx.createBiquadFilter());
    hp.type = "highpass";
    hp.frequency.value = h.piece === "timp" || h.piece === "bassDrum" ? KIT_DRUMS.timpHp : KIT_DRUMS.hp;
    hp.Q.value = 0.7;
    const out = bag.add(ctx.createGain());
    out.gain.value = KIT_DRUMS.level * mx.share * (this.phone ? KIT_DRUMS.phone * mx.phone : 1);
    src.connect(g).connect(hp);
    // D527: a written style's dulled top (trip-hop's, lo-fi's: a sampled break's colour).
    const lpHz = GRIDS[style]?.lp;
    let pre: AudioNode = hp;
    if (lpHz) {
      const lp = bag.add(ctx.createBiquadFilter());
      lp.type = "lowpass";
      lp.frequency.value = lpHz;
      lp.Q.value = 0.7;
      pre = hp.connect(lp);
    }
    pre.connect(out);
    // On a phone the low drums' harmonics (their pitch the same: the tonic or the dominant, implied).
    if (this.phone && (h.piece === "timp" || h.piece === "bassDrum" || (isScoreStyle(style) && PHONE_LOW_PIECES.has(h.piece)))) this.lowHarmonics(bag, hp, out, KIT_DRUMS.phoneLow.level * mx.low);
    let last: AudioNode = out;
    if (ctx.createStereoPanner) {
      const p = bag.add(ctx.createStereoPanner());
      p.pan.value = KIT_DRUMS.pan[h.piece];
      last = out.connect(p);
    }
    last.connect(this.master);
    // D566: a dry, close kit's smaller share of the room (LIEBEZEIT).
    this.fxSend(last, GRIDS[style]?.send ?? KIT_DRUMS.send, bag);
    src.start(t, rec.onset);
    halt(src, t + (h.piece === "crash" || h.piece === "ride" || h.piece === "timp" || h.piece === "cymbals" || h.piece === "triangle" ? 3 : h.piece === "bassDrum" ? 2 : 1.6));
  }
  /**
   * D565: a synthesized layer under a style's kick or over its snare (drum-grids.ts `layer`): the kick's SUB (a sine from
   * 62 to 40 Hz) and its CLICK (the beater's tick, noise at 3-6 kHz and a 1.8 kHz blip), the snare's BODY (the shell's
   * thump, a triangle at 195 Hz falling) and its CRACK (noise at 3.5 kHz and a hiss over 6 kHz); behind the band as a
   * backing (the bass's room kept clear: BACKING_HIGHPASS_HZ, the sub's harmonics on a phone).
   */
  layer(what: "kick" | "snare", at: number, vel: number, gain: number) {
    const ctx = this.ctx;
    const bag = new Bag();
    const g = bag.add(ctx.createGain());
    g.gain.value = (backingOn() ? BACKING_LEVEL : 1) * 0.22 * vel * gain;
    g.connect(this.master);
    const env = (node: AudioNode, peak: number, len: number, attack = 0.001) => {
      const e = bag.add(ctx.createGain());
      e.gain.setValueAtTime(0, at);
      e.gain.linearRampToValueAtTime(peak, at + attack);
      e.gain.exponentialRampToValueAtTime(0.0001, at + len);
      node.connect(e).connect(g);
      return e;
    };
    const noise = (type: BiquadFilterType, f: number, q: number, peak: number, len: number) => {
      const n = bag.src(this.noise());
      const fl = bag.add(ctx.createBiquadFilter());
      fl.type = type;
      fl.frequency.value = f;
      fl.Q.value = q;
      env(n.connect(fl), peak, len);
      n.start(at, Math.random() * 0.5);
      halt(n, at + len + 0.02);
    };
    const osc = (type: OscillatorType, f0: number, f1: number, peak: number, len: number) => {
      const o = bag.src(ctx.createOscillator());
      o.type = type;
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + len * 0.5);
      const e = env(o, peak, len);
      o.start(at);
      halt(o, at + len + 0.02);
      return e;
    };
    if (what === "kick") {
      const sub = osc("sine", 62, 40, LAYER_MIX.sub, 0.36);
      if (this.phone) this.lowHarmonics(bag, sub, g, KIT_DRUMS.phoneLow.level * LAYER_MIX.subPhone);
      noise("bandpass", 4200, 0.9, LAYER_MIX.click, 0.012);
      osc("square", 1800, 1700, LAYER_MIX.click * 0.25, 0.006);
    } else {
      osc("triangle", 195, 170, LAYER_MIX.body, 0.09);
      noise("bandpass", 3500, 0.8, LAYER_MIX.crack, 0.14);
      noise("highpass", 6000, 0.7, LAYER_MIX.crack * 0.5, 0.06);
    }
  }
  /**
   * D567-D572: the synthesized pieces of STOOGES (the temple blocks' wooden knock, the ratchet's click, the slapstick's
   * two boards, the whistle-like noise sweeps, the cartoon bonk) and of SWELL (mallets on the toms, a cymbal swelled with
   * mallets, a brush). All noise through filters or a membrane's thump: unpitched (the owner: "Percussion is unpitched").
   * `len` a swell's or a whistle's length (s).
   */
  toon(piece: KitPiece, at: number, vel: number, gain: number, len?: number) {
    const ctx = this.ctx;
    const bag = new Bag();
    const g = bag.add(ctx.createGain());
    const back = backingOn();
    g.gain.value = (back ? BACKING_LEVEL : 1) * 0.22 * vel * gain * (TOON_LEVEL[piece] ?? 1);
    let out: AudioNode = g;
    if (ctx.createStereoPanner) {
      const p = bag.add(ctx.createStereoPanner());
      p.pan.value = KIT_DRUMS.pan[piece];
      out = g.connect(p);
    }
    out.connect(this.master);
    this.fxSend(out, piece === "cymSwell" ? 0.18 : 0.08, bag);
    const env = (node: AudioNode, peak: number, dur: number, attack = 0.001, from = at) => {
      const e = bag.add(ctx.createGain());
      e.gain.setValueAtTime(0, from);
      e.gain.linearRampToValueAtTime(peak, from + attack);
      e.gain.exponentialRampToValueAtTime(0.0001, from + attack + dur);
      node.connect(e).connect(g);
      return e;
    };
    const noise = (type: BiquadFilterType, f: number, q: number, peak: number, dur: number, attack = 0.001, from = at, f1?: number) => {
      const n = bag.src(this.noise());
      const fl = bag.add(ctx.createBiquadFilter());
      fl.type = type;
      fl.frequency.setValueAtTime(f, from);
      if (f1) fl.frequency.exponentialRampToValueAtTime(f1, from + attack + dur * 0.7);
      fl.Q.value = q;
      const e = env(n.connect(fl), peak, dur, attack, from);
      n.start(from, Math.random() * 0.5);
      halt(n, from + attack + dur + 0.02);
      return e;
    };
    const thump = (f0: number, f1: number, peak: number, dur: number, attack = 0.002) => {
      const o = bag.src(ctx.createOscillator());
      o.type = "sine";
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + dur * 0.6);
      const e = env(o, peak, dur, attack);
      o.start(at);
      halt(o, at + attack + dur + 0.02);
      return e;
    };
    switch (piece) {
      case "templeHi":
      case "templeLo": {
        const f = piece === "templeHi" ? 1150 : 720;
        noise("bandpass", f, 7, 3.2, 0.07);
        noise("bandpass", f * 2.6, 4, 0.6, 0.02);
        return;
      }
      case "ratchet":
        noise("bandpass", 2600, 2.2, 1.6, 0.012);
        return noise("highpass", 5000, 0.7, 0.4, 0.006);
      case "slapstick":
        noise("highpass", 1800, 0.7, 1.4, 0.035);
        noise("bandpass", 2600, 1.2, 1.2, 0.03);
        return noise("highpass", 1800, 0.7, 1.1, 0.04, 0.001, at + 0.014);
      case "whistleUp":
      case "whistleDown": {
        const d = Math.max(0.25, Math.min(1.6, len ?? 0.8));
        const up = piece === "whistleUp";
        return noise("bandpass", up ? 700 : 2600, 14, 4, d * 0.65, d * 0.35, at, up ? 2600 : 600);
      }
      case "bonk": {
        noise("bandpass", 380, 4, 3.4, 0.16, 0.002, at, 150);
        noise("lowpass", 500, 0.7, 1.2, 0.09);
        if (this.phone) this.lowHarmonics(bag, g, this.master, 0.6 * gain * vel);
        return noise("bandpass", 1500, 5, 0.6, 0.03);
      }
      case "malletLow":
      case "malletHigh": {
        const hi = piece === "malletHigh";
        const th = thump(hi ? 255 : 165, hi ? 215 : 135, 1.4, hi ? 0.42 : 0.55, 0.008);
        noise("lowpass", hi ? 900 : 650, 0.7, 0.35, 0.12, 0.006);
        if (this.phone) this.lowHarmonics(bag, th, this.master, 0.8 * gain * vel);
        return;
      }
      case "cymSwell": {
        const d = Math.max(0.4, Math.min(4, len ?? 1.5));
        noise("bandpass", 6200, 0.6, 1, 1.6, d);
        return noise("highpass", 9000, 0.7, 0.45, 1.2, d);
      }
      case "brush":
        return noise("lowpass", 3800, 0.5, 1, 0.2, 0.04);
      default:
        return;
    }
  }
  /**
   * D514: a phone's speaker plays nothing under about 600 Hz: a low drum's harmonics made (a soft clip, as a phone's own
   * "bass enhancer" implies a fundamental it cannot play), kept between phoneLow.hp and .lp, added at `level` from
   * `from` into `to`. Above the speaker's floor only: through headphones the drum's own low end is as before.
   */
  private lowHarmonics(bag: Bag, from: AudioNode, to: AudioNode, level: number) {
    const ctx = this.ctx;
    const L = KIT_DRUMS.phoneLow;
    const pre = bag.add(ctx.createGain());
    pre.gain.value = L.drive;
    const ws = bag.add(ctx.createWaveShaper());
    ws.curve = PHONE_LOW_CURVE;
    const bh = bag.add(ctx.createBiquadFilter());
    bh.type = "highpass";
    bh.frequency.value = L.hp;
    bh.Q.value = 0.7;
    const bl = bag.add(ctx.createBiquadFilter());
    bl.type = "lowpass";
    bl.frequency.value = L.lp;
    bl.Q.value = 0.7;
    const xg = bag.add(ctx.createGain());
    xg.gain.value = level / L.drive;
    from.connect(pre).connect(ws).connect(bh).connect(bl).connect(xg).connect(to);
  }
  /**
   * D645: a bass's harmonics on a phone (Patch.phoneExcite; D514's lowHarmonics for an instrument): the note's low band
   * (`from` through a lowpass at x.lp) driven through the soft clip, its new upper harmonics high-passed (2 poles at x.hp:
   * nothing of it under the small speaker's band), mixed in x.db under the note (`main`): the line's fundamentals, which
   * the speaker cannot give, implied by their harmonics where it can. A constant of the patch: the band's notes and the player's alike.
   */
  /** D365, D645: a phone's lift of a low instrument's upper partials (Patch.phoneLift: a high shelf, and a high-pass under them where `cut`). */
  private phoneLift(bag: Bag, src: AudioNode, l: NonNullable<Patch["phoneLift"]>): AudioNode {
    const lift = bag.add(this.ctx.createBiquadFilter());
    lift.type = "highshelf";
    lift.frequency.value = l.hz;
    lift.gain.value = l.db;
    src = src.connect(lift);
    if (l.cut) {
      const cut = bag.add(this.ctx.createBiquadFilter());
      cut.type = "highpass";
      cut.frequency.value = l.cut;
      cut.Q.value = 0.7;
      src = src.connect(cut);
    }
    return src;
  }
  private excite(bag: Bag, from: AudioNode, main: AudioNode, x: NonNullable<Patch["phoneExcite"]>): AudioNode {
    const ctx = this.ctx;
    const lp = bag.add(ctx.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = x.lp;
    lp.Q.value = 0.7071;
    const pre = bag.add(ctx.createGain());
    pre.gain.value = x.drive;
    const ws = bag.add(ctx.createWaveShaper());
    ws.curve = PHONE_LOW_CURVE;
    const hp1 = bag.add(ctx.createBiquadFilter());
    const hp2 = bag.add(ctx.createBiquadFilter());
    for (const h of [hp1, hp2]) ((h.type = "highpass"), (h.frequency.value = x.hp), (h.Q.value = 0.7071));
    const wet = bag.add(ctx.createGain());
    wet.gain.value = 10 ** (x.db / 20) / x.drive;
    const sum = bag.add(ctx.createGain());
    main.connect(sum);
    from.connect(lp).connect(pre).connect(ws).connect(hp1).connect(hp2).connect(wet).connect(sum);
    return sum;
  }
  /** D503: the brushes asked for (the tests: each piece, its time in the context's clock, its level). */
  readonly brushLog: { piece: string; at: number; vel: number; len?: number }[] = [];
  /** D503: where the stir and the flutter loops have got to (s into the recording): one brush going on, beat to beat. */
  private brushPos = { stir: 0, flutter: 0 };
  private brushRr = 0;
  /**
   * D503: one beat of JAZZ QUARTET's brushes (jazz-drums.ts brushBeat) on its recordings (sampled.ts BRUSH_FILES): the
   * taps, the ride and the foot struck; the stir and the flutter swept, each beat's stretch taken on from where the last
   * left off (one brush circling, one roll) and shaped by its swell, crossfaded 30 ms into the next. Behind the band
   * (JAZZ_DRUMS: seated behind, a little left; under 150 Hz nothing, the bass's room), in the club at a little of its send.
   */
  private brushes(at: number, beatS: number, b: number, per: number, compound: boolean, cx?: GrooveContext, style = "brushes") {
    // D573: a fugue's own tailoring of the brushes (drum-tailor.ts: I/6's subject on the taps).
    const bb = tailorBrushes(cx?.piece ?? this.drumF, cx?.tick ?? 0, cx?.beat ?? 1, beatS, brushBeat(b, per, compound, cx?.tick ?? 0, cx?.beat ?? 1, cx?.fills ?? [], cx?.dynDb ?? 0, cx?.end ?? Infinity, beatS));
    const tk = (a: number) => (cx?.tick ?? 0) + a * (cx?.beat ?? 1);
    for (const h of bb.hits) this.scheduleKitHit({ voice: "brush", style, piece: h.piece, tick: tk(h.at), when: at + h.at * beatS, vel: h.vel, ...(h.role ? { role: h.role } : {}), ...(h.dur !== undefined ? { dur: h.dur } : {}) }, (w, v) => this.brushHit(h.piece, w, v));
    for (const s of bb.sweeps) this.scheduleKitHit({ voice: "sweep", style, piece: s.piece, tick: tk(s.at), when: at + s.at * beatS, vel: s.peak }, (w, v) => this.brushSweep({ ...s, peak: v }, w, s.len * beatS)); // D607: at the level the choke point gives it
  }

  /** D503: the brush kit's output for one sound: its level, its seat, the cut under the bass, and its share of the club. */
  private brushOut(bag: Bag, pan: number, kit: BrushKit = JAZZ_DRUMS, hpHz = kit.hp): AudioNode {
    const ctx = this.ctx;
    const hp = bag.add(ctx.createBiquadFilter());
    hp.type = "highpass";
    hp.frequency.value = hpHz;
    hp.Q.value = 0.7;
    const g = bag.add(ctx.createGain());
    g.gain.value = kit.level * (this.phone ? kit.phone : 1);
    hp.connect(g);
    let out: AudioNode = g;
    if (ctx.createStereoPanner) {
      const p = bag.add(ctx.createStereoPanner());
      p.pan.value = pan;
      out = g.connect(p);
    }
    out.connect(this.master);
    this.fxSend(out, kit.send, bag);
    return hp;
  }

  private brushHit(piece: "tap" | "ride" | "foot", at: number, vel: number, kit: BrushKit = JAZZ_DRUMS) {
    this.brushLog.push({ piece, at, vel });
    if (this.brushLog.length > 512) this.brushLog.splice(0, 256);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const rr = this.brushRr++ % 2;
    // The recording of that strength (its colour), its level set by `vel` (the recordings evened: BRUSH_RMS).
    const m = piece === "tap" ? BRUSH_FILES.tap[Math.min(3, Math.floor(vel / 0.22))][rr] : piece === "ride" ? BRUSH_FILES.ride[vel < 0.38 ? 0 : vel < 0.6 ? 1 : 2] : BRUSH_FILES.foot[vel < 0.42 ? 0 : 1][rr];
    const rec = loaded(BRUSH_SET, m);
    if (!rec) {
      loadOne(ctx, BRUSH_SET, m);
      return this.drum(piece === "tap" ? "brush" : piece === "ride" ? "ride" : "hat", t, vel * 0.6);
    }
    const bag = new Bag();
    const src = bag.src(ctx.createBufferSource());
    src.buffer = rec.buffer;
    const g = bag.add(ctx.createGain());
    g.gain.value = kit[piece] * vel * 10 ** ((JAZZ_DRUMS.ref - (BRUSH_RMS[m] ?? JAZZ_DRUMS.ref)) / 20);
    src.connect(g).connect(this.brushOut(bag, kit.pan[piece], kit));
    src.start(t, rec.onset);
    halt(src, t + (piece === "ride" ? 2.4 : 0.9));
  }

  private brushSweep(s: BrushSweep, at: number, len: number, kit: BrushKit = JAZZ_DRUMS) {
    this.brushLog.push({ piece: s.piece, at, vel: s.peak, len });
    if (this.brushLog.length > 512) this.brushLog.splice(0, 256);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const m = BRUSH_FILES[s.piece][s.firm ? 1 : 0];
    const rec = loaded(BRUSH_SET, m);
    if (!rec) {
      loadOne(ctx, BRUSH_SET, m);
      if (s.piece === "flutter") this.drum("brush", t, s.peak * 0.5);
      return;
    }
    const xf = 0.03;
    const loopLen = (s.piece === "stir" ? 4 : 3) - 0.3;
    let pos = this.brushPos[s.piece];
    if (pos + len + xf > loopLen) pos = 0.05 + ((pos * 7.31) % 0.5);
    this.brushPos[s.piece] = pos + len;
    const bag = new Bag();
    const src = bag.src(ctx.createBufferSource());
    src.buffer = rec.buffer;
    const g = bag.add(ctx.createGain());
    const k = kit[s.piece] * 10 ** ((JAZZ_DRUMS.ref - (BRUSH_RMS[m] ?? JAZZ_DRUMS.ref)) / 20);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(k * s.from, t + xf);
    g.gain.linearRampToValueAtTime(k * s.peak, t + Math.max(xf * 1.5, s.peakAt * len));
    g.gain.linearRampToValueAtTime(k * s.to, t + len);
    g.gain.linearRampToValueAtTime(0, t + len + xf);
    src.connect(g).connect(this.brushOut(bag, kit.pan[s.piece], kit));
    src.start(t, pos);
    halt(src, t + len + xf + 0.01);
  }

  /** D520/D522: the percussion asked for (the tests: each piece, its time, its level). */
  readonly latinLog: { piece: LatinPiece; at: number; vel: number }[] = [];
  private latinRr = 0;
  /**
   * D520/D522: one beat of SALSA's or CHORINHO's percussion (latin-drums.ts latinBeat) on its recordings (sampled.ts
   * LATIN_FILES): each stroke the louder recording from LOUD_FROM, the round robins alternating, its level by `vel`; a
   * muted stroke (`damp`: the surdo's left hand, the pandeiro's thumb pressed) damped after that long. Seated by
   * LATIN_KIT, under its cut, in the band's room at a little of its send.
   */
  private latin(band: LatinBand, at: number, beatS: number, cx: GrooveContext, style: string = band === "salsa" ? "salsa" : "choro") {
    for (const h of latinBeat(band, cx.latin!, cx.tick, cx.beat, cx.dynDb ?? 0, beatS)) this.scheduleKitHit({ voice: "latin", style, piece: h.piece, tick: cx.tick + h.at * cx.beat, when: at + h.at * beatS, vel: h.vel, ...(h.role ? { role: h.role } : {}), ...(h.dur !== undefined ? { dur: h.dur } : {}) }, (w, v) => this.latinHit(h.piece, w, v, h.damp, LATIN_KIT.band[band]));
  }

  private latinHit(piece: LatinPiece, at: number, vel: number, damp?: number, share = 1) {
    this.latinLog.push({ piece, at, vel });
    if (this.latinLog.length > 1024) this.latinLog.splice(0, 512);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const layers = LATIN_FILES[piece];
    const row = layers[vel >= LOUD_FROM ? layers.length - 1 : 0];
    const m = row[this.latinRr++ % row.length];
    const rec = loaded(LATIN_SET, m);
    if (!rec) {
      loadOne(ctx, LATIN_SET, m);
      return;
    }
    const [lv, pan] = LATIN_KIT.pieces[piece];
    const bag = new Bag();
    const src = bag.src(ctx.createBufferSource());
    src.buffer = rec.buffer;
    const g = bag.add(ctx.createGain());
    const k = LATIN_KIT.level * (this.phone ? LATIN_KIT.phone : 1) * share * lv * vel;
    g.gain.setValueAtTime(k, t);
    if (damp) g.gain.setTargetAtTime(0, t + damp, 0.03);
    const hp = bag.add(ctx.createBiquadFilter());
    hp.type = "highpass";
    hp.frequency.value = LATIN_KIT.hp;
    hp.Q.value = 0.7;
    src.connect(g).connect(hp);
    let out: AudioNode = hp;
    if (ctx.createStereoPanner) {
      const p = bag.add(ctx.createStereoPanner());
      p.pan.value = pan;
      out = hp.connect(p);
    }
    out.connect(this.master);
    this.fxSend(out, LATIN_KIT.send, bag);
    src.start(t, rec.onset);
    halt(src, t + (damp ? damp + 0.2 : 1.5));
  }

  /** D525: the beat's length as it last sounded (s): BAND_ECHO's time. */
  private lastBeatS = 0;
  /** D523: the kit's strokes asked for (the tests: each piece, its time in the context's clock, its level). */
  readonly rockLog: { piece: RockPiece; at: number; vel: number }[] = [];
  /**
   * D523, D525: one beat of a rock band's drums (rock-drums.ts rockBeat, by the fugue's form: formOf) on the rock kit's
   * recordings (sampled.ts ROCK_KIT: Big Rusty Drums), each stroke from the recording of its strength, evened
   * (ROCK_KIT_RMS) and set by its level, a little varied; behind the band (ROCK_DRUMS), in the preset's room at a little of its send.
   */
  private rockDrums(style: RockStyle, at: number, beatS: number, b: number, per: number, compound: boolean, cx?: GrooveContext) {
    const f = cx?.piece;
    const beat = cx?.beat ?? 1;
    const form = f ? rockFormOf(f, beat, style) : { intro: 0, moments: [], episodes: [], finalAt: Infinity };
    for (const h of rockBeat(style, b, per, compound, cx?.tick ?? 0, beat, beatS, form, cx?.dynDb ?? 0)) this.scheduleKitHit({ voice: "rock", style, piece: h.piece, tick: (cx?.tick ?? 0) + h.at * beat, when: at + h.at * beatS, vel: h.vel, ...(h.role ? { role: h.role } : {}), ...(h.dur !== undefined ? { dur: h.dur } : {}) }, (w, v) => this.kitHit(style, h.piece, w, v));
  }

  private kitHit(style: RockStyle, piece: RockPiece, at: number, vel: number) {
    this.rockLog.push({ piece, at, vel });
    if (this.rockLog.length > 512) this.rockLog.splice(0, 256);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const m = rockKitMidi(piece, vel >= 0.5);
    const rec = loaded(ROCK_KIT_SET, m);
    if (!rec) {
      loadOne(ctx, ROCK_KIT_SET, m);
      const syn: Drum = piece === "kick" ? "kick" : piece === "snare" || piece === "tomHigh" || piece === "tomLow" ? "snare" : piece === "rim" ? "rim" : piece === "crash" || piece === "ride" ? "ride" : "hat";
      return this.drum(syn, t, vel * 0.6);
    }
    const S = ROCK_DRUMS.styles[style];
    const h = Math.sin(at * 91.137 + m * 12.9898) * 43758.5453;
    const r = h - Math.floor(h) - 0.5;
    const bag = new Bag();
    const src = bag.src(ctx.createBufferSource());
    src.buffer = rec.buffer;
    src.playbackRate.value = 2 ** ((ROCK_DRUMS.vary.cents * 2 * r) / 1200);
    const g = bag.add(ctx.createGain());
    g.gain.value = S.level * (this.phone ? S.phone : 1) * ROCK_DRUMS.pieces[piece] * vel * 10 ** ((ROCK_DRUMS.ref - (ROCK_KIT_RMS[m] ?? ROCK_DRUMS.ref) + ROCK_DRUMS.vary.db * 2 * r) / 20);
    const hp = bag.add(ctx.createBiquadFilter());
    hp.type = "highpass";
    hp.frequency.value = ROCK_DRUMS.hp;
    hp.Q.value = 0.7;
    src.connect(g).connect(hp);
    let out: AudioNode = hp;
    if (ctx.createStereoPanner) {
      const p = bag.add(ctx.createStereoPanner());
      p.pan.value = ROCK_DRUMS.pan[piece];
      out = hp.connect(p);
    }
    out.connect(this.master);
    this.fxSend(out, S.send, bag);
    src.start(t, rec.onset);
    // A closed hat or a stroke soon choked by the next is let go short; the cymbals ring.
    halt(src, t + (piece === "crash" || piece === "ride" ? 3 : piece === "openhat" ? 1.2 : piece === "tomLow" || piece === "tomHigh" ? 1.5 : 0.9));
  }

  /** D525: the band's echo (BAND_ECHO), built at its first send; its delay follows the beat as it sounds. */
  private echoBus: { input: GainNode; delay: DelayNode } | null = null;
  private echoSend(from: AudioNode, amount: number, bag: Bag) {
    const ctx = this.ctx;
    const len = Math.max(BAND_ECHO.min, Math.min(BAND_ECHO.max, this.lastBeatS ? BAND_ECHO.beats * this.lastBeatS : BAND_ECHO.fallback));
    if (!this.echoBus) {
      const E = BAND_ECHO;
      const input = ctx.createGain();
      const sat = ctx.createWaveShaper();
      const n = 1024;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(E.drive * x) / E.drive;
      }
      sat.curve = curve;
      const sum = ctx.createGain();
      const delay = ctx.createDelay(2);
      delay.delayTime.value = len;
      const lfo = (rate: number, depth: number) => {
        const o = ctx.createOscillator();
        o.frequency.value = rate;
        const d = ctx.createGain();
        d.gain.value = depth;
        o.connect(d).connect(delay.delayTime);
        o.start();
      };
      lfo(E.wow.rate, E.wow.depth);
      lfo(E.flutter.rate, E.flutter.depth);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = E.hp;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = E.lp;
      const fb = ctx.createGain();
      fb.gain.value = E.feedback;
      const wet = ctx.createGain();
      wet.gain.value = E.wet;
      input.connect(hp).connect(sum).connect(sat).connect(delay).connect(lp);
      lp.connect(fb).connect(sum);
      let out: AudioNode = lp.connect(wet);
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = E.pan;
        out = wet.connect(p);
      }
      out.connect(this.master);
      this.echoBus = { input, delay };
    } else if (Math.abs(this.echoBus.delay.delayTime.value - len) > 0.01) this.echoBus.delay.delayTime.setTargetAtTime(len, ctx.currentTime, 0.05);
    const g = bag.add(ctx.createGain());
    g.gain.value = amount;
    from.connect(g).connect(this.echoBus.input);
  }

  /**
   * D521: one beat of BOSSA NOVA's drums (bossa-drums.ts bossaBeat, the piece's plan) on the brush kit (taps, stir, flutter,
   * ride, the hi-hat's foot: jazz's recordings and their sweeps) and Big Rusty's cross-stick and bass drum, at BOSSA_DRUMS'
   * levels and seats. Without the piece (a test's bare call): the plan of no form, the pattern alone.
   */
  private bossaDrums(at: number, beatS: number, b: number, per: number, compound: boolean, cx?: GrooveContext) {
    const beat = cx?.beat ?? 1;
    const f = cx?.piece;
    const plan = f ? bossaPlan(f, beat, per) : { moments: [], quiet: [], bars: [0], end: Infinity };
    const bb = bossaBeat(b, per, compound, cx?.tick ?? 0, beat, f?.tpq ?? beat, plan, cx?.dynDb ?? 0, beatS);
    const tk = (a: number) => (cx?.tick ?? 0) + a * beat;
    for (const h of bb.hits) {
      const t = at + h.at * beatS;
      this.scheduleKitHit({ voice: "bossa", style: "bossa", piece: h.piece, tick: tk(h.at), when: t, vel: h.vel, ...(h.role ? { role: h.role } : {}), ...(h.dur !== undefined ? { dur: h.dur } : {}) }, (w, v) => (h.piece === "kick" || h.piece === "rim" ? this.bossaHit(h.piece, w, v) : this.brushHit(h.piece, w, v, BOSSA_DRUMS)));
    }
    for (const s of bb.sweeps) this.scheduleKitHit({ voice: "sweep", style: "bossa", piece: s.piece, tick: tk(s.at), when: at + s.at * beatS, vel: s.peak }, (w, v) => this.brushSweep({ ...s, peak: v }, w, s.len * beatS, BOSSA_DRUMS));
  }

  /** D521: the cross-stick or the bass drum (Big Rusty's, as recorded: the soft or the firm stroke by `vel`). */
  private bossaHit(piece: "kick" | "rim", at: number, vel: number) {
    this.brushLog.push({ piece, at, vel });
    if (this.brushLog.length > 512) this.brushLog.splice(0, 256);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const m = BOSSA_KIT_FILES[piece][vel < 0.45 ? 0 : 1];
    const rec = loaded(BOSSA_KIT_SET, m);
    if (!rec) {
      loadOne(ctx, BOSSA_KIT_SET, m);
      return this.drum(piece, t, vel * 0.6);
    }
    const bag = new Bag();
    const src = bag.src(ctx.createBufferSource());
    src.buffer = rec.buffer;
    const g = bag.add(ctx.createGain());
    // The firm recording is about 5 dB over the soft as recorded: its level scaled so `vel` alone sets the loudness.
    g.gain.value = BOSSA_DRUMS[piece] * vel * (m === BOSSA_KIT_FILES[piece][1] ? 0.56 : 1);
    src.connect(g).connect(this.brushOut(bag, BOSSA_DRUMS.pan[piece], BOSSA_DRUMS, piece === "kick" ? BOSSA_DRUMS.kickHp : BOSSA_DRUMS.hp));
    src.start(t, rec.onset);
    halt(src, t + 0.9);
  }

  /** D524: one beat of PET SOUNDS' drums (pet-drums.ts petBeat, the piece's plan); without the piece the pattern alone. */
  private petDrums(at: number, beatS: number, b: number, per: number, compound: boolean, cx?: GrooveContext) {
    const beat = cx?.beat ?? 1;
    const f = cx?.piece;
    const plan = f ? petPlan(f, beat, per) : { moments: [], quiet: [], bass: [], end: Infinity };
    for (const h of petBeat(b, per, compound, cx?.tick ?? 0, beat, plan, cx?.dynDb ?? 0, beatS)) this.scheduleKitHit({ voice: "pet", style: "pet", piece: h.piece, tick: (cx?.tick ?? 0) + h.at * beat, when: at + h.at * beatS, vel: h.vel, ...(h.role ? { role: h.role } : {}), ...(h.dur !== undefined ? { dur: h.dur } : {}) }, (w, v) => this.petHit({ ...h, vel: v }, w));
  }

  /** D524: one stroke: the soft or the firm recording by its strength, the timpani's drum nearest its pitch (retuned to it). */
  private petHit(h: PetHit, at: number) {
    this.brushLog.push({ piece: h.piece, at, vel: h.vel });
    if (this.brushLog.length > 512) this.brushLog.splice(0, 256);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const firm = h.vel >= 0.45 ? 1 : 0;
    let set: string = ROCK_KIT_SET;
    let m: number;
    let rate = 1;
    // (the timpani's loud recordings only, D514's: their soft layer uneven; a soft stroke the loud one at its level)
    let scale = firm ? 0.56 : 1;
    if (h.piece === "sleigh") return this.sleighBells(t, h.vel, at);
    if (h.piece === "timp") {
      set = TIMP_SET;
      const want = h.midi ?? TIMP_MIDIS[0];
      m = TIMP_MIDIS.reduce((a, x) => (Math.abs(x - want) < Math.abs(a - want) ? x : a), TIMP_MIDIS[0]);
      rate = 2 ** ((want - m) / 12);
      scale = 0.56;
    } else if (h.piece === "tamb") {
      set = "kitClub";
      m = kitMidi("kitClub", "tambourine", firm === 1)!;
    } else m = rockKitMidi(h.piece, firm === 1);
    const rec = loaded(set, m);
    if (!rec) {
      loadOne(ctx, set, m);
      const stand: Record<PetHit["piece"], Drum> = { kick: "kick", snare: "snare", tomHigh: "snare", tomLow: "kick", crash: "ride", tamb: "shaker", timp: "kick", sleigh: "shaker" };
      return this.drum(stand[h.piece], t, h.vel * 0.6);
    }
    const bag = new Bag();
    const src = bag.src(ctx.createBufferSource());
    src.buffer = rec.buffer;
    src.playbackRate.value = rate;
    const g = bag.add(ctx.createGain());
    // The firm recordings are about 5 dB over the soft as recorded: scaled so `vel` alone sets the loudness.
    g.gain.value = PET_DRUMS[h.piece] * h.vel * scale;
    const hp = bag.add(ctx.createBiquadFilter());
    hp.type = "highpass";
    hp.frequency.value = h.piece === "kick" || h.piece === "timp" ? PET_DRUMS.lowHp : PET_DRUMS.hp;
    hp.Q.value = 0.7;
    const lv = bag.add(ctx.createGain());
    lv.gain.value = PET_DRUMS.level * (this.phone ? PET_DRUMS.phone : 1);
    src.connect(g).connect(hp).connect(lv);
    let out: AudioNode = lv;
    if (ctx.createStereoPanner) {
      const p = bag.add(ctx.createStereoPanner());
      p.pan.value = PET_DRUMS.pan[h.piece];
      out = lv.connect(p);
    }
    out.connect(this.master);
    this.fxSend(out, PET_DRUMS.send[h.piece], bag);
    src.start(t, rec.onset);
    halt(src, t + (h.piece === "crash" ? 3 : h.piece === "timp" ? 2.5 : 1.5));
  }

  /**
   * D581: a shake of sleigh bells, synthesised (unpitched: no recording, no pitch of its own): noise through three narrow
   * bands where small bells ring (5.4, 7.3, 9.6 kHz), its level in four jingles 14 ms apart (the bells striking as the
   * strap is shaken, each softer), then a short ring (90 ms). Each shake a little different (its time on the clock).
   */
  private sleighBells(t: number, vel: number, at: number) {
    const ctx = this.ctx;
    const bag = new Bag();
    const nz = bag.src(this.noise());
    const env = bag.add(ctx.createGain());
    env.gain.value = 0;
    const k = PET_DRUMS.sleigh * vel * PET_DRUMS.level * (this.phone ? PET_DRUMS.phone : 1);
    const wob = Math.sin(at * 37.7) * 0.5 + 0.5;
    for (let j = 0; j < 4; j++) {
      const tj = t + j * (0.012 + 0.004 * wob);
      const pk = k * (j === 0 ? 1 : 0.75 - 0.15 * j);
      env.gain.setValueAtTime(0.0001, tj);
      env.gain.linearRampToValueAtTime(pk, tj + 0.002);
      env.gain.setTargetAtTime(pk * 0.25, tj + 0.002, 0.006);
    }
    env.gain.setTargetAtTime(0, t + 0.06, 0.09);
    const out = bag.add(ctx.createGain());
    for (const [hz, g] of [[5400, 0.8], [7300, 1], [9600, 0.7]] as const) {
      const bp = bag.add(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.frequency.value = hz * (0.98 + 0.04 * wob);
      bp.Q.value = 9;
      const bg = bag.add(ctx.createGain());
      bg.gain.value = g * 3;
      env.connect(bp).connect(bg).connect(out);
    }
    nz.connect(env);
    let o: AudioNode = out;
    if (ctx.createStereoPanner) {
      const p = bag.add(ctx.createStereoPanner());
      p.pan.value = PET_DRUMS.pan.sleigh;
      o = out.connect(p);
    }
    o.connect(this.master);
    this.fxSend(o, PET_DRUMS.send.sleigh, bag);
    nz.start(t);
    halt(nz, t + 0.6);
  }

  private roomTo() {
    const base = preset().room ?? 0.16;
    // D482: the preset's own room, never more for a zone earned by right notes.
    const room = base;
    // D345: asked again only when it changes (it was asked every beat: an automation event a beat, never
    // let go where the room idles, as under a period preset, 1,350 over a 15-minute piece). The same
    // value approached again is the same sound.
    if (room === this.roomGoal) return;
    this.roomGoal = room;
    this.wet.gain.setTargetAtTime(room, this.ctx.currentTime, 0.4);
  }
  /** D345: the room's level last asked for (NaN: set directly since, by `period`). */
  private roomGoal = NaN;

  /**
   * A metronome tick: a short, soft click, brighter on the bar's first beat. D505: no longer a pitch: it was a
   * square wave at C7 (2093 Hz) or G6 dying over 30 ms, a tiny struck bell (partials at 2.1, 6.3, 10.5 kHz, as a
   * glockenspiel's bar), heard as one over the count-in and after a pause; now a wooden click, a burst of noise
   * through a broad band-pass (Q 1.2, 1.4 or 2 kHz), gone in 15 ms: no narrow partial anywhere.
   */
  tick(at: number, accent: boolean, gain = 0.1) {
    const ctx = this.ctx;
    const bag = new Bag();
    const n = bag.src(this.noise());
    const bp = bag.add(ctx.createBiquadFilter());
    bp.type = "bandpass";
    bp.frequency.value = accent ? TICK.accentHz : TICK.hz;
    bp.Q.value = TICK.q;
    const g = bag.add(ctx.createGain());
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain * TICK.gain, at + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, at + TICK.decay);
    n.connect(bp).connect(g).connect(this.master);
    n.start(at, (at * 7.31) % 0.9);
    halt(n, at + TICK.decay + 0.01);
  }

}

/** The voices' timbres and places (D167): the bass a triangle, the top voice the thinnest pulse, the inner ones fuller; spread left (low) to right (high). */
export function voicing(voice: number, count: number, _played = true): Voicing {
  const fromTop = voice;
  const bass = count > 1 && fromTop === count - 1;
  // D291: a phone's speaker gives almost nothing below 500 Hz, where the triangle has nearly all its
  // sound: there the bass is a pulse (its overtones carry the pitch), the one no voice near it uses.
  const phoneBass = bass && isPhone();
  const timbre: Timbre = phoneBass ? (count > 3 ? "pulse25" : "pulse50") : bass || count === 1 ? "triangle" : fromTop === 0 ? "pulse12" : fromTop === 1 && count > 3 ? "pulse25" : count > 3 ? "pulse50" : "pulse25";
  // D297: a period preset places its voices itself (within ±0.35) and may set an inner voice a shade lighter.
  const place = placeFor(voice, count);
  // D615: a computer's seat where the preset gives one (Preset.desk: BACH BRASS's two choirs); a phone's as before.
  const desk = isPhone() ? null : deskSeatFor(voice, count);
  // D365: CLASSIC CHIP (no patches) within ±0.35 (it spread ±0.45, the widest of any sound: D358); the others as before.
  const pan = desk !== null ? desk : place ? place.pan : count > 1 ? (0.5 - fromTop / (count - 1)) * (preset().slots === null ? 2 * CHIP_PAN : 0.9) : 0;
  // D169: the voice played is no louder than the others; it stands out by its colour in the box.
  // D645: and a sound's own bass on a phone (Preset.phoneBass: CLASSIC CHIP's).
  return { timbre, pan, gain: (phoneBass ? PHONE_BASS_GAIN * (preset().phoneBass ?? 1) : 1) * (place?.level ?? 1), patch: patchFor(voice, count), ...(bass ? { bass: true } : {}) };
}

/** A decaying stereo noise, for the room. */
function impulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 1234 + c * 77;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  return b;
}

/**
 * D297, NOCTURNE 32-BIT's hall (and CHAMBER ORGAN's church): stereo noise decaying to -60 dB in `rt60` s, thin for its first
 * 12 ms (the early reflections) and darkening as it decays (a one-pole lowpass closing, as effects.ts's
 * hall with its brightness, 0.3 for the hall); `seconds` long. Seeded: the same hall every time.
 */
export function darkHall(ctx: BaseAudioContext, seconds: number, rt60 = HALL.rt60, brightness = HALL.brightness): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const b = ctx.createBuffer(2, len, sr);
  const tau = rt60 / Math.log(1000);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 4321 + c * 97;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      const t = i / sr;
      const k = Math.min(0.98, (1 - brightness) * 0.6 + (t / seconds) * 0.35);
      lp = lp * k + ((seed / 2147483647) * 2 - 1) * (1 - k);
      // Sparse before 12 ms: one sample in eight.
      const early = t < 0.012 ? (i % 8 === 0 ? 2.5 : 0) : 1;
      d[i] = lp * early * Math.exp(-t / tau) * Math.min(1, (len - i) / (0.05 * sr));
    }
  }
  return b;
}

/**
 * D302: a parameter moved with the clock from `from` to `to` (s), by `at` (a function of the clock),
 * in straight lines every `step` s: a sweep that goes on from note to note (it follows the clock, not
 * the note), as a single LFO across all the notes would.
 */
export function clocked(param: AudioParam, from: number, to: number, at: (x: number) => number, step = 0.08) {
  param.setValueAtTime(at(from), from);
  for (let x = from + step; x < to + step; x += step) param.linearRampToValueAtTime(at(x), x);
}

/** D297: a WaveShaper curve quantising -1..1 to 2^bits levels (a staircase, 8 points a step). */
export function stairCurve(bits: number): Float32Array<ArrayBuffer> {
  const levels = 2 ** bits;
  const n = Math.min(65536, levels * 8);
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.max(-1, Math.min(1, Math.round((x * levels) / 2) / (levels / 2)));
  }
  return c;
}

/** A tenth of a second of silence as a WAV (16-bit mono, 8 kHz), as a blob URL. */
function silentWav(): string {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
