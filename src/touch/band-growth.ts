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
  /** The double's pan, this much from the voice's (toward the middle where it would leave ±0.35), where it has no seat. */
  pan: number;
  /** D616: the delay's spread either side of `late` (s), by note (unisonLate: fixed per note, the same every time). */
  jitter?: number;
  /** D616: the double's tuning (cents): two players, not one copy. */
  detune?: number;
  /** D616: the double's own seat, as the voice (top down) its instrument plays in the full choir of `seatCount` voices. */
  seat?: Partial<Record<PatchId, number>>;
  seatCount?: number;
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
  with: { bachTrumpet: ["bachHorn", "bachTrumpet"], bachTrumpetMute: ["bachHorn", "bachTrumpet"], bachHorn: ["bachTrumpet", "bachTrombone"], bachTrombone: ["bachHorn", "bachBass"], bachBass: ["bachTrombone", "bachHorn"] },
  compass: { bachTrumpet: [52, 86], bachTrumpetMute: [55, 84], bachHorn: [41, 77], bachTrombone: [40, 72], bachBass: [34, 67] },
  // D616 (v3): 6 ± 4 ms late by note (was a fixed 12 ms: where two sources fuse and comb), +3 cents, at 0.7 (was 0.8), in
  // the double's own instrument's seat in the five-voice choir (the second trumpet's, the horn's, the tenor trombone's,
  // the bass's) and so through its own lane: an entry wider, not thicker.
  level: 0.7,
  late: 0.006,
  pan: 0.12,
  jitter: 0.004,
  detune: 3,
  seat: { bachTrumpet: 1, bachHorn: 2, bachTrombone: 3, bachBass: 4 },
  seatCount: 5,
};
/** D616: a double's delay (s) for a note: `late` ± `jitter`, by the note's voice and onset (deterministic). */
export function unisonLate(spec: UnisonSpec, voice: number, tick: number): number {
  if (!spec.jitter) return spec.late;
  let h = (Math.imul(voice + 1, 0x9e3779b1) ^ Math.imul(Math.round(tick) + 7, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = (h ^ (h >>> 12)) >>> 0;
  return spec.late + spec.jitter * ((h / 0xffffffff) * 2 - 1);
}
export const BRASS_GROWTH: GrowthSpec = {
  episode: { tone: -3.5, lp: 3000, room: 0.9 },
  subject: { from: -1, to: 0.5, room: 1 },
  // D611 (v3): the climax +1.5 dB brighter (was +3: on ff recordings the brightest moment was the harshest), its room ×1.7 kept.
  climax: { tone: 1.5, room: 1.7 },
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

/**
 * D614, BACH BRASS v3: THE EPISODES' MUTES (the research's F3: Frackenpohl's mutes for a terrace, "the color created by the
 * insertion of a mute also allows the different instruments to blend more easily"). Where the growth veils an episode
 * (growthAt `veiled`), a band note of `from` within the mute's recordings (`compass`, MIDI: B-flat 3 to A5 and three
 * semitones either side) sounds on `to`, the straight-muted trumpet; open again in the subject zones and the climax. `lp`:
 * whether the episode's lowpass stays on the muted note too (the research: the veil from the mute, the lowpass only on the
 * instruments without one; measured, D614). The band's notes alone (the player's instrument is the player's).
 */
export interface MuteSpec {
  from: PatchId;
  to: PatchId;
  compass: readonly [lo: number, hi: number];
  lp: boolean;
}
// (Measured, D614, the episodes with the player on the bass: the straight mute is brighter than the veiled open trumpet,
// 2-5 kHz +1.3 to +2.1 dB, 5-12 kHz +10 dB in II/5's; with the episode's lowpass kept on it the air back to within 2.6 dB,
// the mute's colour kept: the veil stays on the muted notes too, the proposal's "lowpass off" not taken.)
export const BRASS_MUTE: MuteSpec = { from: "bachTrumpet", to: "bachTrumpetMute", compass: [55, 84], lp: true };

/** The growth at a tick: the band note's colour (a shelf, a lowpass in the episodes), its room's scaling, and whether it is veiled (an episode's, D614). */
export function growthAt(f: TouchFugue, tick: number, spec: GrowthSpec = BRASS_GROWTH): { colour: Colour; roomMul: number; veiled: boolean } {
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
  return { colour: { tone: Math.round(tone * 100) / 100, ...(lp ? { lp } : {}) }, roomMul: Math.round(room * 1000) / 1000, veiled: ph.phase === "episode" && r < 0.5 };
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
/**
 * D612, BACH BRASS v3: THE LOW BRASS'S LENGTHS (the research's F4: a quintet's bass "high, light and articulated, not low and
 * heavy"; Frackenpohl's tuba walking bass). The tenor and the bass trombone sound a running note of a quaver or shorter
 * (the next or the note before it in its voice joined to it, as short) `running` of its value, a lone quaver or a dotted
 * one `mid`, a crotchet or longer `long`: a length, never a note changed. Only where the reading has not joined the note to
 * the next (Busoni's slurs and ties, phrasing.ts art "join" or an overlap, stay as they are) and only ever shorter than
 * the reading holds it. Repeated notes re-tongued as before (BRASS_TONGUE). The band's notes alone (the player's length is
 * the player's touch).
 */
export interface LengthSpec {
  patches: readonly PatchId[];
  running: number;
  mid: number;
  long: number;
}
export const BRASS_LENGTHS: LengthSpec = { patches: ["bachTrombone", "bachBass"], running: 0.7, mid: 0.8, long: 0.9 };
/** The lengths' caps by note ("voice:onset" -> the share of its value at most), for a piece whose voices play `ids`. */
export function lengthCaps(f: TouchFugue, ids: readonly (PatchId | null)[], spec: LengthSpec = BRASS_LENGTHS): Map<string, number> {
  const out = new Map<string, number>();
  const q = f.tpq / 2;
  f.voices.forEach((vs, v) => {
    const id = ids[v];
    if (!id || !spec.patches.includes(id)) return;
    const ns = [...vs].sort((a, b) => a[0] - b[0]);
    ns.forEach((n, i) => {
      const [on, dur] = n;
      const nx = ns[i + 1];
      const pv = ns[i - 1];
      const short = (x: readonly number[] | undefined) => !!x && x[1] <= q;
      const running = dur <= q && ((!!nx && nx[0] === on + dur && short(nx)) || (!!pv && pv[0] + pv[1] === on && short(pv)));
      out.set(`${v}:${on}`, running ? spec.running : dur < f.tpq ? spec.mid : spec.long);
    });
  });
  return out;
}

export const BAND_GROWTH: Readonly<Record<string, { unison?: UnisonSpec; growth?: GrowthSpec; lengths?: LengthSpec; mute?: MuteSpec }>> = {
  bachBrass: { unison: BRASS_UNISON, growth: BRASS_GROWTH, lengths: BRASS_LENGTHS, mute: BRASS_MUTE },
  chorinho: { growth: CHORO_GROWTH },
};
/**
 * D607: II/22 on KRAUTROCK (at FAST, defaults4's): the band brightening and its room opening into the final group with the
 * trance's growth (drum-tailor.ts), the episodes a shade darker. That fugue only (KRAUTROCK's other fugues as they were).
 */
export const KRAUT22_GROWTH: GrowthSpec = {
  episode: { tone: -1, lp: 0, room: 0.9 },
  subject: { from: -0.5, to: 0.5, room: 1 },
  climax: { tone: 2, room: 1.6 },
};
/** D607: a fugue's own growth on a sound (in place of the sound's), by fugue then sound. */
export const PIECE_GROWTH: Readonly<Record<string, Readonly<Record<string, GrowthSpec>>>> = { wtc2f22: { krautrock: KRAUT22_GROWTH } };

