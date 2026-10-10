/**
 * Starting a playback from a setup: the lines heard (written line and its versions), Fux's line
 * for "fux" and "trio", and the continuo. Used for the live exercise and for saved pieces.
 */
import type { AudioEngine } from "../audio/engine.ts";
import { timeline, type PlayEvent } from "../counterpoint/layout.ts";
import type { ExerciseView } from "../game/exercise-view.ts";
import { deriveVersion, heardLines, VERSION_IDS, type VersionId, type Versions } from "../game/versions.ts";
import { continuoInput, continuoOptions, type PlayMode } from "../game/continuo-input.ts";
import type { ContinuoSettings } from "../game/continuo-settings.ts";
import type { TemperamentId } from "../audio/temperament.ts";
import { realizeContinuo } from "../continuo/realize.ts";
import { playContinuo } from "../continuo/audio.ts";

export interface PlaySetup {
  notes: (string | null)[];
  versions: Versions;
  mode: PlayMode;
  /** The continuo may play (allowed here): it is realized and scheduled. */
  continuo: boolean;
  /** The continuo is switched on (its channel gate, D78); default on. */
  continuoOn?: boolean;
  /** Player mode: Fux's line is scheduled alongside (it may be heard), and whether it is heard (D80). */
  fuxAlong?: boolean;
  fuxHeard?: boolean;
  continuoSettings: ContinuoSettings;
  tuning: TemperamentId;
}

/**
 * What plays follows the activators (D88): Fux's line switched on beside the player's lines is the
 * trio, Fux's alone is his own playback, otherwise the player's. Only the continuo's reading
 * depends on it; the lines themselves are heard or silenced by their gates.
 */
export function modeOf(versions: Versions, fuxHeard: boolean, fuxOpen: boolean): PlayMode {
  if (!fuxHeard || !fuxOpen) return "player";
  return versions.original || VERSION_IDS.some((id) => versions[id]) ? "trio" : "fux";
}

/** A setup in the activators' terms: an older "fux" / "trio" setup becomes the switches it meant. */
export function normalize(s: PlaySetup): PlaySetup {
  if (s.mode === "player") return s;
  const versions = s.mode === "fux" ? { ...s.versions, original: false, ...Object.fromEntries(VERSION_IDS.map((id) => [id, false])) } : s.versions;
  return { ...s, mode: "player", versions, fuxAlong: true, fuxHeard: true };
}

/**
 * The on/off state of each line as channel gates (D78): every line is always scheduled and a
 * switch only opens or closes its channel, so toggling never restarts the playback.
 */
export function gatesOf(s: Pick<PlaySetup, "versions" | "continuoOn" | "fuxHeard">): Partial<Record<"counterpoint" | VersionId | "continuo" | "fux", boolean>> {
  const g: Partial<Record<"counterpoint" | VersionId | "continuo" | "fux", boolean>> = {
    counterpoint: s.versions.original,
    continuo: s.continuoOn !== false,
    fux: s.fuxHeard === true,
  };
  for (const id of VERSION_IDS) g[id] = s.versions[id];
  return g;
}

/** The events and the continuo starter of a setup (null when it cannot play: Fux's line without one). */
export function buildPlayback(audio: AudioEngine, view: ExerciseView, s0: PlaySetup, live?: () => PlaySetup): { events: PlayEvent[]; onCycle?: (startTime: number, fromBeat: number) => void } | null {
  const s = normalize(s0);
  // Every version is scheduled, switched on or not: its channel gate decides whether it is heard.
  const derived = Object.fromEntries(VERSION_IDS.map((id) => [id, deriveVersion(id, s.notes, view.modalFinal, s.versions.canonShift)]));
  const ties = { ties: view.species === "fourth" };
  const events = timeline(view.cantus, view.layout, s.notes, undefined, undefined, s.fuxAlong && view.fux ? view.fux : undefined, derived, ties);
  // The continuo is realized at the start of each pass for the lines heard then (a switch made
  // mid-pass reaches its harmony at the next pass, without interrupting anything).
  const planFor = (x: PlaySetup) => {
    const mode = modeOf(x.versions, x.fuxHeard === true, Boolean(x.fuxAlong && view.fux));
    const lines = heardLines(x.versions, x.notes, view.modalFinal);
    const input = continuoInput(view, mode === "fux" ? view.fux! : lines.map((l) => l.notes), mode);
    return { input, realization: realizeContinuo(input, continuoOptions(mode, x.continuoSettings)) };
  };
  const plan0 = s.continuo ? planFor(s) : null;
  let first = true;
  const startContinuo = (startTime: number, fromBeat: number) => {
    const graph = audio.graph;
    const destination = audio.continuoInput();
    if (!plan0 || !graph || !destination) return;
    const now = !first && live ? live() : s;
    const plan = first || !live ? plan0 : planFor(normalize(now));
    first = false;
    const c = now.continuoSettings;
    audio.attach(
      playContinuo(plan.input, plan.realization, {
        preset: c.preset,
        audio: { ctx: graph.ctx, destination },
        includeSungVoices: false,
        startTime,
        fromBeat,
        getTempo: () => audio.tempo,
        temperament: s.tuning,
        inegal: c.inegal && c.preset !== "stileAntico",
        figuration: c.figure ? c.figuration : null,
      }),
    );
  };
  return { events, onCycle: plan0 ? startContinuo : undefined };
}

/** `fromSlot`: start at that slot (a live restart after a change); later loops start at the top. */
export function startPlayback(audio: AudioEngine, view: ExerciseView, s: PlaySetup, onSlot: (k: number) => void, fromSlot = 0, live?: () => PlaySetup): void {
  audio.setGates(gatesOf(normalize(s)));
  const b = buildPlayback(audio, view, s, live);
  if (!b) return onSlot(-1);
  const from = Math.max(0, b.events.findIndex((e) => e.slot >= fromSlot));
  void audio.playAll(b.events, onSlot, b.onCycle, fromSlot > 0 ? from : 0);
}

/**
 * Mix mode (D77): one pass per setup, in succession, as one continuous performance. `prepare(i)`
 * puts setup i on the engine (sound, drums, tempo ...) just before its pass is scheduled.
 */
export function startPasses(audio: AudioEngine, view: ExerciseView, setups: PlaySetup[], prepare: (i: number) => void, onSlot: (k: number) => void): void {
  const built = setups.map((s) => buildPlayback(audio, view, s)!);
  void audio.playAll(built[0].events, onSlot, undefined, 0, {
    prepare(i) {
      const k = i % built.length;
      prepare(i);
      audio.setGates(gatesOf(normalize(setups[k])));
      return built[k];
    },
  });
}
