/**
 * Developer configuration. Not a player setting: nothing here is surfaced in the UI.
 */
export interface DevConfig {
  /** Adds the hidden "modern-additions" rules on top of fux-strict. Off by default. */
  enableModernAdditions: boolean;
  /** Generic interval size for modern.voice-distance-limit (10 = tenth, 12 = twelfth); undecided. */
  modernVoiceDistanceLimit: number | null;
}

export const DEFAULT_DEV_CONFIG: Readonly<DevConfig> = Object.freeze({
  enableModernAdditions: false,
  modernVoiceDistanceLimit: null,
});
