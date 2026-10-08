/**
 * What the continuo staves show, derived from a realization (pure; ScoreView draws it).
 * Rhythm comes from the realization's events: a bar is one whole-note chord when nothing moves,
 * otherwise two half-note chords, with ties for the notes held through the bar.
 */
import type { ContinuoRealization, EventRole } from "../../continuo/types.ts";

export interface CueTone {
  midi: number;
  pitch: string;
}

export interface CueChord {
  bar: number;
  /** 0 or 1 (half of the bar). */
  half: 0 | 1;
  duration: "w" | "h";
  /** Low to high; empty = rest. */
  tones: CueTone[];
  /** Indices into `tones` held from the previous half (tied). */
  tiedFrom: number[];
}

export interface CueFigure {
  bar: number;
  half: 0 | 1;
  /** Figure numbers top to bottom ("6/3" -> ["6", "3"]); one entry for "c.p." or "5". */
  stack: string[];
}

function soundingAt(r: ContinuoRealization, roles: EventRole[], t: number): CueTone[] {
  const out = new Map<number, string>();
  for (const e of r.events) {
    if (!roles.includes(e.role) || e.startBeat > t || t >= e.startBeat + e.durationBeats) continue;
    e.midi.forEach((m, i) => out.set(m, e.pitches[i]));
  }
  return [...out].sort((a, b) => a[0] - b[0]).map(([midi, pitch]) => ({ midi, pitch }));
}

/** The chords of one staff ("bass": left hand; "rh": right hand, realized or doubling). */
export function cueChords(r: ContinuoRealization, staff: "bass" | "rh"): CueChord[] {
  const roles: EventRole[] = staff === "bass" ? ["bass"] : ["rh", "doubling"];
  const out: CueChord[] = [];
  for (let b = 0; b < r.bars.length; b++) {
    const s0 = soundingAt(r, roles, 2 * b);
    const s1 = soundingAt(r, roles, 2 * b + 1);
    const struck = new Set(r.events.filter((e) => roles.includes(e.role) && e.startBeat === 2 * b + 1).flatMap((e) => e.midi));
    const same = s0.length === s1.length && s0.every((x, i) => x.midi === s1[i].midi);
    if (same && struck.size === 0) {
      out.push({ bar: b, half: 0, duration: "w", tones: s0, tiedFrom: [] });
      continue;
    }
    out.push({ bar: b, half: 0, duration: "h", tones: s0, tiedFrom: [] });
    const tied = s1.map((x, i) => (!struck.has(x.midi) && s0.some((y) => y.midi === x.midi) ? i : -1)).filter((i) => i >= 0);
    out.push({ bar: b, half: 1, duration: "h", tones: s1, tiedFrom: tied });
  }
  return out;
}

/**
 * Figures under the bass: the bar's figure at the downbeat; a second figure under the upbeat
 * where the harmony changes ("5 6" over a held bass, "6/3 · 5/3" when the bass moves).
 */
export function cueFigures(r: ContinuoRealization): CueFigure[] {
  const out: CueFigure[] = [];
  for (const bi of r.bars) {
    let parts: string[];
    if (bi.figure.includes(" · ")) parts = bi.figure.split(" · ");
    else if ((bi.upbeat?.kind === "innerChange" || bi.suspension || bi.device) && bi.figure.includes(" ")) parts = bi.figure.split(" ");
    else parts = [bi.figure];
    parts.slice(0, 2).forEach((p, h) => {
      const text = p.trim();
      if (text) out.push({ bar: bi.bar, half: h as 0 | 1, stack: text === "c.p." ? [text] : text.split("/") });
    });
  }
  return out;
}
