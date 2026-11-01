/**
 * D284: HEAR THE SUBJECT as it sounds: the subject's notes as the reading plays them, each ornament
 * realised as the game realises it (the owner: "The trills are not sounding in the hear the subject").
 */
import { fugueById, type TouchFugue } from "../touch/fugue.ts";
import { ornamentsOf, realiseNote, shakeOf } from "../touch/ornament-play.ts";
import type { performSubject, Reading } from "../touch/readings.ts";
import { planFingerings, type Fingering, type PlanNote } from "./fingering.ts";

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
      // D302: the ornament's first note joined from the note before as the note was, its last joined to the next.
      return { at, len, midi: pm, d: p.d, ...(q === 0 && p.legato ? { legato: true, from: p.from } : {}), ...(q === parts.length - 1 && p.tie ? { tie: p.tie } : {}), ...(q === parts.length - 1 && p.final ? { final: true } : {}), ...(q === parts.length - 1 && p.apart ? { apart: true } : {}) };
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

/**
 * D370: HEAR THE SUBJECT's thumbs: the subject's notes as the fingering planner reads them: the reading's
 * marks, else the joins and gaps it is played with here (`perf`), the ornaments shaken. D409: each note's
 * staff step from the voice (the entry's fourth field is its "varied" flag, which the plan had read as the
 * step, so no contour or travel was ever counted here), and a written rest told from the ticks (a detached
 * note's shortened sound is no rest).
 */
export function subjectPlanNotes(f: TouchFugue, e: ReturnType<typeof firstEntry>, perf: Performed, reading: Reading | null): PlanNote[] {
  const orns = ornamentsOf(f);
  const steps = new Map(f.voices[e.voice].map((n) => [`${n[0]}:${n[2]}`, n[3]]));
  return perf.map((p, i) => {
    const [on, dur, midi] = e.notes[i];
    const o = orns.get(`${e.voice}:${on}`);
    const rn = reading?.notes[i];
    const follows = i + 1 < perf.length && e.notes[i + 1][0] <= on + dur;
    const marked = rn && (rn.join !== null || rn.short);
    const rest = i > 0 && on > e.notes[i - 1][0] + e.notes[i - 1][1];
    return { at: p.at, dur: p.len, step: p.midi, st: steps.get(`${on}:${midi}`) ?? midi, rest, join: rn?.join ?? null, short: rn?.short ?? null, accent: rn?.accent ?? null, ...(marked || !follows ? {} : { intent: p.tie !== undefined ? ("join" as const) : ("detach" as const) }), d: p.d, shake: o ? shakeOf(o) : null };
  });
}

/** D370/D409: HEAR THE SUBJECT's fingering suggestions (alternation first; mirrors one; each with its sparse marks). */
export function subjectFingerings(f: TouchFugue, e: ReturnType<typeof firstEntry>, perf: Performed, reading: Reading | null): Fingering[] {
  return planFingerings(subjectPlanNotes(f, e, perf, reading), { overlap: 0.04 });
}
