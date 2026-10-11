/**
 * Master styles (D111): one choice on the Master strip that sets every track at once — the sound of
 * the voices (the upper and the lower line each its own; Fux and the versions with the player's
 * line), the drums, the continuo and its figuration, the tuning, the tempo and the master effects.
 * Afterwards each track can be changed on its own; the style is a starting point, not a lock.
 */
import type { PresetId } from "../continuo/types.ts";
import type { FigurationId } from "../continuo/figuration.ts";
import { freshDrums, type DrumSettings } from "./drums.ts";
import { DEFAULT_MASTER_FX, type MasterFx, type SoundState } from "./sound.ts";
import { SYNTH_PRESETS, type SynthSettings } from "./synth-settings.ts";
import type { TemperamentId } from "./temperament.ts";

export type StyleId = "stileAntico" | "baroque" | "gould" | "rockShow" | "analog" | "techno";
export const STYLES: StyleId[] = ["stileAntico", "baroque", "gould", "rockShow", "analog", "techno"];

interface Style {
  /** Synth presets of the upper and the lower line. */
  high: string;
  low: string;
  continuo: { preset: PresetId; figuration?: FigurationId } | null;
  /** A drum pattern id, or none. */
  drums: string | null;
  tuning: TemperamentId;
  /** Half notes a minute. */
  tempo: number;
  master: Partial<MasterFx>;
}

const STYLE: Record<StyleId, Style> = {
  // Fux's own world: voices, a soft chamber organ under them, quarter-comma meantone, a church.
  stileAntico: { high: "choir", low: "monks", continuo: { preset: "stileAntico" }, drums: null, tuning: "meantone", tempo: 56, master: { reverbMode: "cathedral", reverbMix: 0.18 } },
  // A violin and a cello over a harpsichord, in a well temperament, in a room.
  baroque: { high: "violinSampled", low: "celloSampled", continuo: { preset: "cembalo" }, drums: null, tuning: "werckmeister3", tempo: 72, master: { reverbMode: "room", reverbMix: 0.14 } },
  // The recorded grand, dry and close; no continuo, no drums.
  gould: { high: "grand", low: "grand", continuo: null, drums: null, tuning: "equal", tempo: 66, master: { reverbMode: "off" } },
  // Guitar and bass on the lines, the rock band under them, a recorded kit.
  rockShow: { high: "eguitarSampled", low: "ebassSampled", continuo: { preset: "rockBand" }, drums: "nakedRock", tuning: "equal", tempo: 62, master: { reverbMode: "room", reverbMix: 0.12 } },
  // A tape-echo lead and a slapback bass line over pads, a CR-78.
  analog: { high: "spaceEcho", low: "slapback", continuo: { preset: "analogPads" }, drums: "newwave", tuning: "equal", tempo: 60, master: { reverbMode: "plate", reverbMix: 0.16 } },
  // Wavefolders, arpeggiated pads in sixteenths' worth of eighths, a 909 at 128.
  techno: { high: "acidFold", low: "buzz", continuo: { preset: "analogPads", figuration: "arpUp" }, drums: "techno", tuning: "equal", tempo: 64, master: { reverbMode: "plate", reverbMix: 0.12, delayMode: "pingpong", delayTime: 0.35, delayMix: 0.12 } },
};

const synth = (id: string): SynthSettings => ({ ...SYNTH_PRESETS.find((p) => p.id === id)!.settings, preset: id });

export interface StyleTarget {
  sound: SoundState;
  drumsOn: boolean;
  drumKit: DrumSettings;
  continuoOn: boolean;
  continuo: { preset: PresetId; figuration: FigurationId; figure: boolean };
  tuning: TemperamentId;
  tempo: number;
}

/**
 * The settings after choosing a style. `cantusHigh`: the cantus is the upper line. In three voices
 * (D113) `trio` says which of the player's two voices are high (treble staff).
 */
export function applyStyle(id: StyleId, now: StyleTarget, cantusHigh: boolean, trio?: { counterpointHigh: boolean; secondHigh: boolean; thirdHigh?: boolean }): StyleTarget {
  const s = STYLE[id];
  const high = synth(s.high);
  const low = synth(s.low);
  const line = trio ? (trio.counterpointHigh ? high : low) : cantusHigh ? low : high;
  const second = trio ? (trio.secondHigh ? high : low) : line;
  const third = trio?.thirdHigh === undefined ? second : trio.thirdHigh ? high : low;
  const sound: SoundState = {
    ...now.sound,
    synth: { cantus: cantusHigh ? high : low, counterpoint: line, second: { ...second }, third: { ...third }, fux: { ...line } },
    versionFollows: { inversion: true, retrograde: true, retroInversion: true, canon: true },
    master: { ...DEFAULT_MASTER_FX, ...s.master },
  };
  return {
    sound,
    drumsOn: s.drums !== null,
    drumKit: s.drums ? freshDrums(s.drums, now.drumKit.level) : now.drumKit,
    continuoOn: s.continuo !== null,
    continuo: s.continuo
      ? { ...now.continuo, preset: s.continuo.preset, figure: !!s.continuo.figuration, figuration: s.continuo.figuration ?? now.continuo.figuration }
      : now.continuo,
    tuning: s.tuning,
    tempo: s.tempo,
  };
}
