/**
 * D284: HEAR THE SUBJECT as it sounds: the subject's notes as the reading plays them, each ornament
 * realised as the game realises it (the owner: "The trills are not sounding in the hear the subject").
 */
import { fugueById, type TouchFugue } from "../touch/fugue.ts";
import { ornamentsOf, realiseNote } from "../touch/ornament-play.ts";
import type { performSubject } from "../touch/readings.ts";

export type Performed = ReturnType<typeof performSubject>;

/** The fugue's first entry of its (first) subject. */
export function firstEntry(id: string) {
  const f = fugueById(id);
  return [...f.entries].filter((e) => !e.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0];
}

/** What sounds: each performed note, or its ornament's notes (the last, the main note, to the note's end). */
export function subjectSounds(f: TouchFugue, e: ReturnType<typeof firstEntry>, perf: Performed, bpm: number): Performed {
  const orns = ornamentsOf(f);
  const tps = (f.tpq * bpm) / 60;
  return perf.flatMap((p, i) => {
    const [on, dur, midi] = e.notes[i];
    const o = orns.get(`${e.voice}:${on}`);
    if (!o) return [p];
    const parts = realiseNote(f, o, on, dur, midi, i > 0 ? e.notes[i - 1][2] : undefined, bpm);
    return parts.map(([pon, pdur, pm], q) => {
      const at = p.at + (pon - on) / tps;
      const len = q === parts.length - 1 ? Math.max(0.03, p.at + p.len - at) : pdur / tps;
      return { at, len, midi: pm, d: p.d };
    });
  });
}

/** A voice's notes ([onset, length, MIDI] in ticks) as they sound, ornaments realised. */
export function ornamented(f: TouchFugue, voice: number, notes: [number, number, number, ...unknown[]][], bpm: number): [number, number, number][] {
  const orns = ornamentsOf(f);
  return notes.flatMap(([on, dur, midi], i) => {
    const o = orns.get(`${voice}:${on}`);
    return o ? realiseNote(f, o, on, dur, midi, i > 0 ? notes[i - 1][2] : undefined, bpm) : [[on, dur, midi] as [number, number, number]];
  });
}
