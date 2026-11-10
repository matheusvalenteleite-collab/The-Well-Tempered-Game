/**
 * D601: every drum stroke a fugue's DRUMS schedule over the whole fugue, through the game's own path (Chip.groove, its one
 * choke point Chip.scheduleKitHit), with no audio (test/fake-audio.ts): the tick, the time (s, the fugue's tempo, no
 * ritard), the piece, the velocity played, the role. Busoni's level as ProtoGame gives it (bandDynAt). Pure of the play.
 */
import { installFakeAudio } from "./fake-audio.ts";
import type { TouchFugue } from "../src/touch/fugue.ts";

let ready: Promise<typeof import("../src/touch/chip.ts")> | null = null;
export interface Stroke { tick: number; t: number; piece: string; vel: number; role: string | null; style: string; voice: string }

export async function strokesOf(f: TouchFugue, sound: string, style: string, phone = true): Promise<Stroke[]> {
  if (!ready) {
    installFakeAudio(phone ? 5 : 0, true);
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
    ready = import("../src/touch/chip.ts");
  }
  const { Chip } = await ready;
  const { setBacking, setPreset, busoniReaches } = await import("../src/touch/sound.ts");
  const { setDrumStyle } = await import("../src/touch/drum-library.ts");
  const { beatOf } = await import("../src/touch/fugue.ts");
  const { tempoOf } = await import("../src/touch/tempi.ts");
  const { fillsFor } = await import("../src/touch/jazz-drums.ts");
  const { latinPlan, LATIN_SOUNDS } = await import("../src/touch/latin-drums.ts");
  const { playReading } = await import("../src/touch/readings.ts");
  const { wholePlan } = await import("../src/touch/whole-reading.ts");
  setPreset(sound);
  setBacking(true);
  setDrumStyle(f.id, style);
  const chip = new Chip();
  chip.drumsFor(f);
  const b = beatOf(f);
  const per = b.perBar;
  const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  const tps = (f.tpq * tempoOf(f.id)) / 60;
  const beatS = b.ticks / tps;
  const W = wholePlan(f, playReading(f.id));
  const dynAt = (tick: number) => {
    if (!W || !busoniReaches(sound)) return 0;
    let s = 0;
    for (let v = 0; v < f.voices.length; v++) s += W.dynAt(v, tick);
    return s / f.voices.length;
  };
  const fills = fillsFor(f, b.ticks, per);
  const out: Stroke[] = [];
  const first = f.bars[0]?.on ?? 0;
  for (let tick = 0; tick < f.length; tick += b.ticks) {
    chip.kitEvents.length = 0;
    const at = 1 + tick / tps;
    // the beat's place in its bar, as ProtoGame counts it (by the bars as written)
    let bar0 = first;
    for (const x of f.bars) if (x.on <= tick) bar0 = x.on;
    const inBarBeat = Math.round((tick - bar0) / b.ticks) % per;
    chip.groove(at, beatS, inBarBeat, Math.floor(tick / f.barTicks), per, compound, { tick, beat: b.ticks, fills, end: f.length, dynDb: dynAt(tick), piece: f, ...((LATIN_SOUNDS as Record<string, unknown>)[sound] ? { latin: latinPlan(f, b.ticks, per) } : {}) } as never);
    for (const e of chip.kitEvents) out.push({ tick: e.tick, t: e.when - 1, piece: e.piece, vel: e.vel, role: (e as { role?: string }).role ?? null, style: e.style, voice: e.voice });
  }
  setBacking(false);
  return out;
}
