/**
 * D576/D577, BACH BRASS'S ENTRIES DOUBLED AND ITS SOUND GROWING WITH THE FORM. The owner: "Perhaps we need to double the
 * voices during critical moments (fugal entrances)"; "Underwhelming. Very few variations, no real climactic modifications
 * in the sound."
 *
 * THE DOUBLING (`unisonFor`): within an entry's span (voice-mode.ts entrySpans: the subject's and the answer's, the
 * countersubjects left out), the entering voice's notes sound with a second brass instrument in unison (Play.unison, as
 * one note: no new pitch, no octave), the instrument chosen once per entry (the first of the voice's own instrument's
 * partners whose compass holds the whole entry: a trumpet's entry the horn, the horn's the trumpet, the trombone's the
 * horn, the bass trombone's the tenor trombone), in its own seat, a moment late (two players, not one louder one).
 *
 * THE GROWTH (`growthAt`), by timbre and space only (never the player's notes, right or wrong; the score's form alone,
 * form-points.ts phaseAt): the EPISODES veiled (a lowpass and a darker shelf: the brass played softly, as with a cup mute),
 * the subject zones open, brighter act by act, and the CLIMAX (phaseAt's ramp, from two bars before the final group to
 * the last entry) the brightest, the church's room growing with it (the reverb's send by roomMul), held through the
 * resolution. A colour on the band's notes as the form layer's (fugue-form.ts), merged with it (withForm).
 */
import type { Colour } from "./colour.ts";
import { formOf, phaseAt } from "./form-points.ts";
import type { TouchFugue } from "./fugue.ts";
import type { PatchId } from "./sound.ts";
import { entrySpans } from "./voice-mode.ts";

/** A sound's doubling partners by instrument (the first whose compass holds the entry), the double's level, delay and seat offset. */
export interface UnisonSpec {
  with: Partial<Record<PatchId, readonly PatchId[]>>;
  compass: Partial<Record<PatchId, readonly [lo: number, hi: number]>>;
  level: number;
  late: number;
  /** The double's pan, this much from the voice's (toward the middle where it would leave ±0.35). */
  pan: number;
}
/** The growth's colours (Colour: a shelf, a lowpass) and the room's scaling (roomMul), by where the form is. */
export interface GrowthSpec {
  episode: { tone: number; lp: number; room: number };
  /** A subject zone's shelf at the first act and at the last; its room. */
  subject: { from: number; to: number; room: number };
  climax: { tone: number; room: number };
}

/**
 * BACH BRASS's partners and compasses (MIDI, the recordings' and the instruments' own: Iowa MIS trumpet E3-C♯6 played to
 * D6, horn F2-F5, tenor trombone E2-C5, bass trombone B♭1-G4).
 */
export const BRASS_UNISON: UnisonSpec = {
  with: { bachTrumpet: ["bachHorn", "bachTrumpet"], bachHorn: ["bachTrumpet", "bachTrombone"], bachTrombone: ["bachHorn", "bachBass"], bachBass: ["bachTrombone", "bachHorn"] },
  compass: { bachTrumpet: [52, 86], bachHorn: [41, 77], bachTrombone: [40, 72], bachBass: [34, 67] },
  level: 0.8,
  late: 0.012,
  pan: 0.12,
};
export const BRASS_GROWTH: GrowthSpec = {
  episode: { tone: -3.5, lp: 3000, room: 0.9 },
  subject: { from: -1, to: 0.5, room: 1 },
  climax: { tone: 3, room: 1.7 },
};

export interface UnisonSpan {
  voice: number;
  on: number;
  end: number;
  patch: PatchId;
}

/** The entries' doubles for a piece whose voices play `ids` (top down: the patch of each voice). */
export function unisonSpans(f: TouchFugue, ids: readonly (PatchId | null)[], spec: UnisonSpec = BRASS_UNISON): UnisonSpan[] {
  const out: UnisonSpan[] = [];
  for (const e of entrySpans(f)) {
    if (e.form === "counter") continue;
    const own = ids[e.voice];
    if (!own) continue;
    const notes = (f.voices[e.voice] ?? []).filter((n) => n[0] >= e.on && n[0] < e.end).map((n) => n[2]);
    if (!notes.length) continue;
    const lo = Math.min(...notes);
    const hi = Math.max(...notes);
    const partner = (spec.with[own] ?? []).find((p) => {
      const c = spec.compass[p];
      return c && lo >= c[0] && hi <= c[1];
    });
    if (partner) out.push({ voice: e.voice, on: e.on, end: e.end, patch: partner });
  }
  return out;
}

/** The double for a note (its voice, its onset), or null. */
export const unisonAt = (spans: readonly UnisonSpan[], voice: number, tick: number): UnisonSpan | null => spans.find((s) => s.voice === voice && tick >= s.on && tick < s.end) ?? null;

/** The growth at a tick: the band note's colour (a shelf, a lowpass in the episodes) and its room's scaling. */
export function growthAt(f: TouchFugue, tick: number, spec: GrowthSpec = BRASS_GROWTH): { colour: Colour; roomMul: number } {
  const form = formOf(f);
  const ph = phaseAt(form, tick);
  const lastAct = Math.max(1, form.acts - 1);
  const base =
    ph.phase === "episode"
      ? { tone: spec.episode.tone, lp: spec.episode.lp, room: spec.episode.room }
      : { tone: spec.subject.from + ((spec.subject.to - spec.subject.from) * Math.min(ph.act, lastAct)) / lastAct, lp: 0, room: spec.subject.room };
  // The climax over both (its ramp to the last entry, held through the resolution): the brightest, the room the largest.
  const r = Math.max(ph.climax, ph.resolved);
  const tone = base.tone + (spec.climax.tone - base.tone) * r;
  const room = base.room + (spec.climax.room - base.room) * r;
  const lp = base.lp && r < 0.5 ? base.lp : 0;
  return { colour: { tone: Math.round(tone * 100) / 100, ...(lp ? { lp } : {}) }, roomMul: Math.round(room * 1000) / 1000 };
}

/** The sounds that double their entries and grow with the form (by preset id). */
/**
 * D604: CHORINHO's growth (the owner on II/1: "didn't really feel any climax … very little variation"): the episodes a
 * little darker (the regional playing softly, no lowpass: the flute and the bandolim keep their attack), the subject
 * zones opening act by act, the final group brightest and in more of the room (its drums grow with it: latin-drums.ts
 * choroStage). Timbre and space only; the bass's shelf is a treble shelf (a phone hears the seven-string as before).
 */
export const CHORO_GROWTH: GrowthSpec = {
  episode: { tone: -2, lp: 0, room: 0.85 },
  subject: { from: -1.5, to: 0.5, room: 1 },
  climax: { tone: 2, room: 1.5 },
};
export const BAND_GROWTH: Readonly<Record<string, { unison?: UnisonSpec; growth?: GrowthSpec }>> = {
  bachBrass: { unison: BRASS_UNISON, growth: BRASS_GROWTH },
  chorinho: { growth: CHORO_GROWTH },
};
