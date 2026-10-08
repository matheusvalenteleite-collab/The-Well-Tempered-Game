/**
 * Rhythmic layout of the counterpoint: one "slot" per note the player writes.
 *
 * First species: one whole note per bar. Second species (1725, p. 56): two half notes per bar,
 * the first in thesis (downbeat), the second in arsis (upbeat); a half rest may take the place of
 * the first note (p. 59); the final bar is a whole note, as in all of Fux's examples.
 */
export type SpeciesId = "first" | "second";

/** The value written in a slot for a rest. */
export const REST = "r";

export interface Slot {
  bar: number;
  /** 0 = thesis (downbeat), 1 = arsis (upbeat). */
  beat: 0 | 1;
  duration: "1/1" | "1/2";
  restAllowed: boolean;
}

export function slotLayout(species: SpeciesId, bars: number): Slot[] {
  if (bars < 2) throw new Error("an exercise needs at least two bars");
  if (species === "first") return Array.from({ length: bars }, (_, bar) => ({ bar, beat: 0, duration: "1/1", restAllowed: false }));
  const slots: Slot[] = [];
  for (let bar = 0; bar < bars - 1; bar++) {
    slots.push({ bar, beat: 0, duration: "1/2", restAllowed: bar === 0 });
    slots.push({ bar, beat: 1, duration: "1/2", restAllowed: false });
  }
  slots.push({ bar: bars - 1, beat: 0, duration: "1/1", restAllowed: false });
  return slots;
}

/** Slot onset in whole notes from the start. */
export const slotOffset = (s: Slot) => s.bar + (s.beat ? 0.5 : 0);
/** Slot length in whole notes. */
export const slotLength = (s: Slot) => (s.duration === "1/1" ? 1 : 0.5);

/** Indices of the slots of bars lo..hi (inclusive). */
export function slotsOfBars(layout: Slot[], lo: number, hi: number): number[] {
  return layout.flatMap((s, k) => (s.bar >= lo && s.bar <= hi ? [k] : []));
}

/** Map Fux's solution notes (pitch or null for a rest) onto the layout; fails loudly on a mismatch. */
export function notesToSlots(layout: Slot[], notes: { pitch: string | null; duration: string }[]): string[] {
  if (notes.length !== layout.length) throw new Error(`expected ${layout.length} notes for this layout, got ${notes.length}`);
  return notes.map((n, k) => {
    if (n.duration !== layout[k].duration) throw new Error(`slot ${k}: duration ${n.duration}, layout ${layout[k].duration}`);
    if (n.pitch === null && !layout[k].restAllowed) throw new Error(`slot ${k}: rest not allowed`);
    return n.pitch ?? REST;
  });
}

export const isRest = (x: string | null) => x === REST;
export const sounding = (x: string | null): x is string => x !== null && x !== REST;

/** One onset for playback: the cantus sounds at each bar start, the counterpoint at each slot. */
export interface PlayEvent {
  slot: number;
  /** Onset in whole notes, relative to the first bar played. */
  at: number;
  /** Length of the counterpoint note in whole notes. */
  length: number;
  /** Cantus note starting here (bar starts only), or null. */
  cantus: string | null;
  counterpoint: string | null;
}

/** Playback events for bars lo..hi (inclusive). Rests and empty slots sound only the cantus. */
export function timeline(cantus: string[], layout: Slot[], notes: (string | null)[], lo = 0, hi = cantus.length - 1): PlayEvent[] {
  return slotsOfBars(layout, lo, hi).map((k) => {
    const s = layout[k];
    return {
      slot: k,
      at: slotOffset(s) - lo,
      length: slotLength(s),
      cantus: s.beat === 0 ? cantus[s.bar] : null,
      counterpoint: sounding(notes[k]) ? notes[k] : null,
    };
  });
}
