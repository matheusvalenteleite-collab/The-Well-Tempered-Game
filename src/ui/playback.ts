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
 * The on/off state of each line as channel gates (D78): every line is always scheduled and a
 * switch only opens or closes its channel, so toggling never restarts the playback.
 */
export function gatesOf(s: Pick<PlaySetup, "versions" | "continuoOn" | "fuxHeard"> & { mode?: PlaySetup["mode"] }): Partial<Record<"counterpoint" | VersionId | "continuo" | "fux", boolean>> {
  const g: Partial<Record<"counterpoint" | VersionId | "continuo" | "fux", boolean>> = {
    counterpoint: s.versions.original || !VERSION_IDS.some((id) => s.versions[id]),
    continuo: s.continuoOn !== false,
    // In the player's playback Fux sounds only when his strip is switched on; in his own and the trio, always.
    fux: s.mode === undefined || s.mode === "player" ? s.fuxHeard === true : true,
  };
  for (const id of VERSION_IDS) g[id] = s.versions[id];
  return g;
}

/** The events and the continuo starter of a setup (null when it cannot play: Fux's line without one). */
export function buildPlayback(audio: AudioEngine, view: ExerciseView, s: PlaySetup, live?: () => PlaySetup): { events: PlayEvent[]; onCycle?: (startTime: number, fromBeat: number) => void } | null {
  if (s.mode !== "player" && !view.fux) return null;
  // Every version is scheduled, switched on or not: its channel gate decides whether it is heard.
  const derived = Object.fromEntries(VERSION_IDS.map((id) => [id, deriveVersion(id, s.notes, view.modalFinal, s.versions.canonShift)]));
  const ties = { ties: view.species === "fourth" };
  const events =
    s.mode === "player"
      ? timeline(view.cantus, view.layout, s.notes, undefined, undefined, s.fuxAlong && view.fux ? view.fux : undefined, derived, ties)
      : s.mode === "fux"
        ? timeline(view.cantus, view.layout, view.fux!, undefined, undefined, undefined, undefined, ties)
        : timeline(view.cantus, view.layout, s.notes, undefined, undefined, view.fux!, derived, ties);
  // The continuo is realized at the start of each pass for the lines heard then (a switch made
  // mid-pass reaches its harmony at the next pass, without interrupting anything).
  const planFor = (x: PlaySetup) => {
    const lines = heardLines(x.versions, x.notes, view.modalFinal);
    const input = continuoInput(view, x.mode === "fux" ? view.fux! : lines.map((l) => l.notes), x.mode);
    return { input, realization: realizeContinuo(input, continuoOptions(x.mode, x.continuoSettings)) };
  };
  const plan0 = s.continuo ? planFor(s) : null;
  let first = true;
  const startContinuo = (startTime: number, fromBeat: number) => {
    const graph = audio.graph;
    const destination = audio.continuoInput();
    if (!plan0 || !graph || !destination) return;
    const now = !first && live ? live() : s;
    const plan = first || !live ? plan0 : planFor({ ...now, mode: s.mode });
    first = false;
    const c = now.continuoSettings;
    audio.attach(
      playContinuo(plan.input, plan.realization, {
        preset: c.preset,
        audio: { ctx: graph.ctx, destination },
        includeSungVoices: false,
        startTime,
        fromBeat,
        getTempo: () => audio.tempo / audio.stretch,
        temperament: s.tuning,
        inegal: c.inegal && c.preset !== "stileAntico",
      }),
    );
  };
  return { events, onCycle: plan0 ? startContinuo : undefined };
}

/** `fromSlot`: start at that slot (a live restart after a change); later loops start at the top. */
export function startPlayback(audio: AudioEngine, view: ExerciseView, s: PlaySetup, onSlot: (k: number) => void, fromSlot = 0, live?: () => PlaySetup): void {
  audio.setGates(gatesOf({ ...s, mode: s.mode }));
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
  const built = setups.map((s) => buildPlayback(audio, view, s) ?? buildPlayback(audio, view, { ...s, mode: "player" })!);
  void audio.playAll(built[0].events, onSlot, undefined, 0, {
    prepare(i) {
      const k = i % built.length;
      prepare(i);
      audio.setGates(gatesOf(setups[k]));
      return built[k];
    },
  });
}
