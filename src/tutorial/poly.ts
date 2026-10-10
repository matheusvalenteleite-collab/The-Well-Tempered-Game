/**
 * Clips of several voices for the tutorial (D144): Fux's three-voice examples with a moving voice,
 * and passages of a fugue of the Well-Tempered Clavier, from the study's library (D126). Every fact
 * the fugue lessons state about the piece (its voices, its answer, its strettos, its entries) is
 * computed here from the same data the study reads, and checked in test/tutorial.test.ts.
 */
import { HOLD, REST } from "../counterpoint/layout.ts";
import type { TrioStep } from "../game/trio.ts";
import type { LibFugue } from "../wtc/library.ts";
import type { PolyNote } from "./model.ts";

/** A three-voice exercise as notes: whole notes, and the moving voice by its slots (ties and holds joined). */
export function trioNotes(s: TrioStep, lines: string[][] = s.fux): PolyNote[] {
  const out: PolyNote[] = [];
  lines.forEach((line, voice) => {
    if (voice !== s.movingIndex) {
      line.forEach((pitch, bar) => out.push({ pitch, at: bar, len: 1, voice }));
      return;
    }
    const per = s.per;
    // Slot k starts k/per whole notes in (the last slot, alone in the last bar, at its downbeat).
    const at = (k: number) => k / per;
    let last: PolyNote | null = null;
    line.forEach((x, k) => {
      const len = k === line.length - 1 ? 1 : 1 / per;
      if (x === HOLD && last) return void (last.len += len);
      // Fourth species: the upbeat tied into the downbeat (the same pitch over the bar line) sounds once.
      if (s.species === 4 && last && k % per === 0 && x === last.pitch && Math.abs(last.at + last.len - at(k)) < 1e-9) return void (last.len += len);
      if (x === REST || x === HOLD || !x) return void (last = null);
      last = { pitch: x, at: at(k), len, voice };
      out.push(last);
    });
  });
  return out.sort((a, b) => a.at - b.at || a.voice - b.voice);
}

/** Notes of a fugue between two times (quarters), optionally only some of them, moved to start at 0 (whole notes). */
export function fugueNotes(f: LibFugue, from: number, to: number, only?: number[]): PolyNote[] {
  const keep = only ? new Set(only) : null;
  return f.notes
    .map((n, i) => ({ n, i }))
    .filter(({ n, i }) => n.at >= from - 1e-6 && n.at < to - 1e-6 && (!keep || keep.has(i)))
    .map(({ n, i }) => ({ pitch: f.spelled[i], at: (n.at - from) / 4, len: Math.min(n.dur, to - n.at) / 4, voice: f.voice[i], bar: Math.floor(n.at / f.barQuarters + 1e-9) }));
}

/** The facts the fugue lessons rely on. */
export function fugueFacts(f: LibFugue) {
  const expo = f.entries.slice(0, f.count);
  /** The first two entries that overlap in time (a stretto), if any. */
  let stretto: [number, number] | null = null;
  for (let i = 0; i + 1 < f.entries.length && !stretto; i++) if (f.entries[i + 1].at < f.entries[i].end - 1e-6) stretto = [i, i + 1];
  const end = Math.max(...f.notes.map((n) => n.at + n.dur));
  return {
    voices: f.count,
    /** Semitones of the second entry from the subject (7: a fifth above; -5: a fourth below). */
    answerShift: f.entries[1]?.shift ?? 0,
    exposition: { from: 0, to: expo[expo.length - 1].end },
    stretto,
    entries: f.entries.length,
    bars: Math.round(end / f.barQuarters),
  };
}
