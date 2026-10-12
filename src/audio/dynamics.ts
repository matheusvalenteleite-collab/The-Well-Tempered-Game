/**
 * P25: dynamics for the Fux and WTC playback (the owner: "phrase arch and dissonance accent, as in the
 * chorales"), after revision 2 of docs/playback/CHORALE-PERFORMANCE.md:
 * - a dissonant moment is played a little louder, consonances softer (C. P. E. Bach, Versuch I, ch. 3,
 *   §29): the notes struck where the sounding notes make a second, a seventh, a tritone, or a fourth
 *   against the lowest voice, +1 dB;
 * - a short piece (an exercise: at most 16 bars of whole notes) is one phrase: every voice rises to
 *   +2 dB at its highest note and falls back by the end (Todd 1992; the KTH rules "High loud" and
 *   "Phrase arch"), less when that note stands little above the rest (a fifth or more: the whole 2 dB).
 *   A longer piece (a prelude, a fugue) gets the accents only: a phrase is not the whole piece, and the
 *   game does not yet know where its phrases end.
 * Events that already carry levels (the chorales' performance) are left as they are.
 */
import { parsePitch } from "../music/pitch.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";

/** The longest piece (in whole notes) shaped as one phrase. */
export const ONE_PHRASE = 16;
const DISSONANT = new Set([1, 2, 6, 10, 11]);

/** Each struck note of an event: its channel, pitch and length (whole notes). */
function struck(e: PlayEvent): { ch: string; pitch: string; len: number }[] {
  const out: { ch: string; pitch: string; len: number }[] = [];
  if (e.cantus) out.push({ ch: "cantus", pitch: e.cantus, len: Math.max(e.length, 1) });
  if (e.counterpoint) out.push({ ch: "counterpoint", pitch: e.counterpoint, len: e.lengths?.counterpoint ?? e.length });
  if (e.fux) out.push({ ch: "fux", pitch: e.fux, len: e.lengths?.fux ?? e.length });
  for (const [id, p] of Object.entries(e.versions ?? {})) if (p) out.push({ ch: id, pitch: p, len: e.lengths?.[id] ?? e.length });
  for (const x of e.extra ?? []) out.push({ ch: x.channel, pitch: x.pitch, len: e.length });
  return out;
}

const midiOf = (p: string) => {
  try {
    return parsePitch(p).midi;
  } catch {
    return null;
  }
};

export function shapeEvents(events: PlayEvent[]): PlayEvent[] {
  if (!events.length || events.some((e) => e.db)) return events;
  const start = events[0].at;
  const end = Math.max(...events.map((e) => e.at + e.length));
  // The arch (short pieces only): toward the highest note struck, with its height above the rest.
  let crest: { at: number; height: number } | null = null;
  if (end - start <= ONE_PHRASE) {
    let top = -Infinity;
    let topAt = start;
    let low = Infinity;
    for (const e of events)
      for (const s of struck(e)) {
        const m = midiOf(s.pitch);
        if (m === null) continue;
        if (m > top) (top = m), (topAt = e.at);
        low = Math.min(low, m);
      }
    // The span that matters is the melody's: the highest note against the top voice's lowest.
    const topVoice = events.flatMap((e) => struck(e)).filter((s) => midiOf(s.pitch) === top)[0]?.ch;
    const lineLow = Math.min(...events.flatMap((e) => struck(e).filter((s) => s.ch === topVoice).map((s) => midiOf(s.pitch) ?? Infinity)));
    const span = Number.isFinite(lineLow) ? top - lineLow : top - low;
    crest = { at: topAt, height: 2 * Math.min(1, Math.max(0, span) / 7) };
  }
  const arch = (at: number) => {
    if (!crest || crest.height === 0) return 0;
    if (at <= crest.at) return crest.at > start ? (crest.height * (at - start)) / (crest.at - start) : crest.height;
    return end > crest.at ? crest.height * Math.max(0, 1 - (at - crest.at) / (end - crest.at)) : 0;
  };
  // What sounds at each onset: every channel's latest note while it lasts.
  const sounding = new Map<string, { midi: number; until: number }>();
  return events.map((e) => {
    const notes = struck(e);
    for (const s of notes) {
      const m = midiOf(s.pitch);
      if (m !== null) sounding.set(s.ch, { midi: m, until: e.at + s.len });
    }
    const now = [...sounding.values()].filter((x) => x.until > e.at + 1e-9).map((x) => x.midi);
    const bass = Math.min(...now);
    let dissonant = false;
    for (let i = 0; i < now.length && !dissonant; i++)
      for (let j = i + 1; j < now.length && !dissonant; j++) {
        const iv = Math.abs(now[i] - now[j]) % 12;
        if (DISSONANT.has(iv) || (iv === 5 && Math.min(now[i], now[j]) === bass)) dissonant = true;
      }
    const level = arch(e.at) + (dissonant ? 1 : 0);
    if (!level || !notes.length) return e;
    const db: Record<string, number> = {};
    for (const s of notes) db[s.ch] = Math.round(level * 100) / 100;
    return { ...e, db };
  });
}
