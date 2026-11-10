/**
 * D628: every effect a pilot world schedules over the whole fugue, through the game's own path (Chip.groove, its effects'
 * choke point Chip.scheduleSfx), with no audio (test/fake-audio.ts), as drum-strokes.ts does the drums: the kind, the tick,
 * the time (s, the fugue's tempo, no ritard), the velocity played (the swell's beat: at its start and its end), its end.
 * `shown` as ProtoGame gives it (the world drawn); the drums off (the effects play whatever the drums do).
 */
import { installFakeAudio } from "./fake-audio.ts";
import type { TouchFugue } from "../src/touch/fugue.ts";

export interface Sfx { kind: string; tick: number; end: number; t: number; until: number; vel: number; vel1: number }
let ready: Promise<typeof import("../src/touch/chip.ts")> | null = null;

export async function sfxOf(f: TouchFugue, sound: string, shown = true): Promise<Sfx[]> {
  if (!ready) {
    installFakeAudio(5, true);
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
    ready = import("../src/touch/chip.ts");
  }
  const { Chip } = await ready;
  const { setBacking, setPreset } = await import("../src/touch/sound.ts");
  const { beatOf } = await import("../src/touch/fugue.ts");
  const { tempoOf } = await import("../src/touch/tempi.ts");
  setPreset(sound);
  setBacking(false);
  const chip = new Chip();
  chip.drumsFor(f);
  chip.worldFor(f, shown);
  const b = beatOf(f);
  const tps = (f.tpq * tempoOf(f.id)) / 60;
  const beatS = b.ticks / tps;
  const out: Sfx[] = [];
  for (let tick = 0; tick < f.length; tick += b.ticks) {
    chip.sfxEvents.length = 0;
    chip.groove(1 + tick / tps, beatS, 0, Math.floor(tick / f.barTicks), b.perBar, false, { tick, beat: b.ticks, fills: [], end: f.length, dynDb: 0, piece: f });
    for (const e of chip.sfxEvents) out.push({ kind: e.kind, tick: e.tick, end: e.end, t: e.when - 1, until: e.until - 1, vel: e.vel, vel1: e.vel1 });
  }
  return out;
}
