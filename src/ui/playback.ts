/**
 * Starting a playback from a setup: the lines heard (written line and its versions), Fux's line
 * for "fux" and "trio", and the continuo. Used for the live exercise and for saved pieces.
 */
import type { AudioEngine } from "../audio/engine.ts";
import { timeline } from "../counterpoint/layout.ts";
import type { ExerciseView } from "../game/exercise-view.ts";
import { heardLines, type Versions } from "../game/versions.ts";
import { continuoInput, continuoOptions, type PlayMode } from "../game/continuo-input.ts";
import type { ContinuoSettings } from "../game/continuo-settings.ts";
import type { TemperamentId } from "../audio/temperament.ts";
import { realizeContinuo } from "../continuo/realize.ts";
import { playContinuo } from "../continuo/audio.ts";

export interface PlaySetup {
  notes: (string | null)[];
  versions: Versions;
  mode: PlayMode;
  /** The continuo plays (already gated by the caller: switched on, and allowed). */
  continuo: boolean;
  continuoSettings: ContinuoSettings;
  tuning: TemperamentId;
}

/** `fromSlot`: start at that slot (a live restart after a change); later loops start at the top. */
export function startPlayback(audio: AudioEngine, view: ExerciseView, s: PlaySetup, onSlot: (k: number) => void, fromSlot = 0): void {
  if (s.mode !== "player" && !view.fux) return onSlot(-1);
  const lines = heardLines(s.versions, s.notes, view.modalFinal);
  const original = s.versions.original ? s.notes : s.notes.map(() => null);
  const derived = Object.fromEntries(lines.filter((l) => l.id !== "original").map((l) => [l.id, l.notes]));
  const ties = { ties: view.species === "fourth" };
  const events =
    s.mode === "player"
      ? timeline(view.cantus, view.layout, original, undefined, undefined, undefined, derived, ties)
      : s.mode === "fux"
        ? timeline(view.cantus, view.layout, view.fux!, undefined, undefined, undefined, undefined, ties)
        : timeline(view.cantus, view.layout, original, undefined, undefined, view.fux!, derived, ties);
  let plan: { input: ReturnType<typeof continuoInput>; realization: ReturnType<typeof realizeContinuo> } | null = null;
  if (s.continuo) {
    const input = continuoInput(view, s.mode === "fux" ? view.fux! : lines.map((l) => l.notes), s.mode);
    plan = { input, realization: realizeContinuo(input, continuoOptions(s.mode, s.continuoSettings)) };
  }
  const startContinuo = (startTime: number, fromBeat: number) => {
    const graph = audio.graph;
    const destination = audio.continuoInput();
    if (!plan || !graph || !destination) return;
    const c = s.continuoSettings;
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
  const from = Math.max(0, events.findIndex((e) => e.slot >= fromSlot));
  void audio.playAll(events, onSlot, plan ? startContinuo : undefined, fromSlot > 0 ? from : 0);
}
