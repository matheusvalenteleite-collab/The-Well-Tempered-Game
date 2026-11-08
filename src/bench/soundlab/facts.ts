/**
 * D497, THE SOUND LAB: what a sound plays on each voice of a piece, in words, read from the game's own data (sound.ts
 * PRESETS, trio.ts trioLayout), for the Sound Lab's page and the instruments report (tools/touch/sound-report.ts).
 * Nothing here changes a sound.
 */
import type { TouchFugue } from "../../touch/fugue.ts";
import { baseSound, presetById, slotOf, type Preset } from "../../touch/sound.ts";
import { TRIO_ID, trioLayout } from "../../touch/trio.ts";

/** Each patch an offered sound plays, in plain words. */
export const PATCH_NAMES: Readonly<Record<string, string>> = {
  gbLead: "Game Boy pulse 1 (lead)",
  gbHarm: "Game Boy pulse 2",
  gbWave: "Game Boy wave channel",
  gbThin: "Game Boy thin pulse",
  gbBass: "Game Boy wave bass",
  harpsiSampled: "harpsichord (recorded)",
  pianoSampled: "grand piano (Salamander, recorded)",
  solLead: "Moog-style lead",
  solSquare: "square wave",
  solNasal: "nasal reed synth",
  solBloop: "bloop synth",
  solBass: "Moog-style bass",
  s16Violin: "16-bit violin",
  s16Flute: "16-bit flute",
  s16Harpsi: "16-bit harpsichord",
  s16Strings: "16-bit string section",
  s16Bassoon: "16-bit bassoon",
  s16Cello: "16-bit cello",
  fmLead: "FM lead (fed back)",
  fmBrass: "FM brass",
  fmPiano: "FM electric piano",
  fmClav: "FM clavinet",
  fmBass: "FM slap bass",
  sidLead: "SID pulse lead (moving width)",
  sidThin: "SID thin fast pulse",
  sidSaw: "SID sawtooth",
  sidTri: "SID triangle",
  sidBass: "SID filtered pulse bass",
  trkViolin: "tracker violin",
  trkFlute: "tracker flute",
  trkHarpsi: "tracker harpsichord",
  trkChoir: "tracker 8-bit choir",
  trkBass: "tracker slapped bass",
  orgPrincipal: "organ manual, Principal 8′ 4′ (recorded)",
  orgPedal: "organ pedal 16′ 8′ 4′ (recorded)",
  orgPleno: "organ plenum (recorded)",
  orgPedalPleno: "organ pedal plenum (recorded)",
  vocLa: "synth singer \"la\"",
  vocMi: "synth singer \"mi\"",
  vocRo: "synth singer \"ro\"",
  vocNe: "synth singer \"ne\"",
  vocDa: "synth singer \"da\"",
  singS: "soprano (VocalSet)",
  singS2: "second soprano (VocalSet)",
  singA: "alto (VocalSet)",
  singT: "tenor (VocalSet)",
  singB: "bass (VocalSet)",
  tomWhistle: "Tomita whistle",
  tomStrings: "Tomita synth strings",
  tomFlute: "Tomita synth flute",
  tomChoir: "Tomita synth choir",
  tomBass: "Tomita synth bass",
  consViolin: "violin (recorded)",
  consViola: "viola (recorded)",
  consCello: "cello (recorded)",
  bandViolin: "violin (recorded)",
  bandOboe: "oboe (recorded)",
  bandViola: "viola (recorded)",
  bandCello: "cello with the continuo harpsichord",
  trioOboe1: "oboe I (recorded)",
  trioOboe2: "oboe II (recorded)",
  trioHarpsi: "harpsichord, the continuo's right hand",
  trioBassoon: "bassoon (with its continuo script)",
  trioCello: "continuo cello (with the harpsichord where scripted)",
  bachTrumpet: "trumpet (recorded)",
  bachHorn: "horn (recorded)",
  bachTrombone: "tenor trombone (recorded)",
  bachBass: "bass trombone (recorded)",
  jqVibes: "vibraphone (recorded)",
  jqPiano: "piano (recorded)",
  jqBass: "double bass pizzicato (recorded)",
  abGuitar: "Gretsch electric guitar (recorded)",
  abGuitar2: "second electric guitar (recorded)",
  abPiano: "rock piano (recorded)",
  abBass: "picked electric bass (recorded)",
  krPiano: "piano (recorded)",
  krGuitar: "electric guitar with tape echo (recorded)",
  krOrgan: "combo organ (synthesized)",
  krBass: "picked electric bass (recorded)",
  trialFlute: "flute (recorded)",
  trialOboe: "oboe (recorded)",
  trialClarinet: "clarinet (recorded)",
  trialHorn: "horn (recorded)",
  trialBassoon: "bassoon (recorded)",
  traverso: "traverso",
  organFlute: "organ flute",
};
export const patchName = (id: string): string => PATCH_NAMES[id] ?? id;

/** CLASSIC CHIP's voices (no patches: chip.ts's own 2A03 voicing). */
const CHIP_VOICES = ["2A03 pulse (lead)", "2A03 pulse", "2A03 pulse", "2A03 pulse", "2A03 triangle bass (a pulse bass on a phone)"];

export interface VoiceSeat {
  voice: number;
  patch: string;
  name: string;
  pan: number;
  level: number;
}

/** The seat of each voice of a piece on a sound, top down (its patch, pan and level), as the game lays them out. */
export function seatsOf(presetId: string, f: Pick<TouchFugue, "voices">): VoiceSeat[] {
  const p: Preset = presetById(presetId);
  const n = f.voices.length;
  const by = baseSound(p.id) === TRIO_ID ? trioLayout(f).slots : p.by?.[n];
  return f.voices.map((_, v) => {
    if (by) {
      const s = by[Math.min(v, by.length - 1)];
      return { voice: v, patch: s[0], name: patchName(s[0]), pan: s[1], level: s[2] ?? 1 };
    }
    if (!p.slots) return { voice: v, patch: "chip", name: CHIP_VOICES[v === n - 1 ? 4 : Math.min(v, 3)], pan: 0, level: 1 };
    const id = p.slots[slotOf(v, n)];
    return { voice: v, patch: id, name: patchName(id), pan: 0, level: 1 };
  });
}

/** A voice's name by its place among n (SOPRANO … BASS). */
export function voiceName(v: number, n: number): string {
  const names: Record<number, string[]> = { 2: ["UPPER", "LOWER"], 3: ["SOPRANO", "ALTO", "BASS"], 4: ["SOPRANO", "ALTO", "TENOR", "BASS"], 5: ["SOPRANO I", "SOPRANO II", "ALTO", "TENOR", "BASS"] };
  return (names[n] ?? [])[v] ?? `VOICE ${v + 1}`;
}
