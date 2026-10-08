/**
 * Rhythmic layout of the counterpoint: one "slot" per note the player writes.
 *
 * First species: one whole note per bar. Second species (1725, p. 56): two half notes per bar,
 * the first in thesis (downbeat), the second in arsis (upbeat); a half rest may take the place of
 * the first note (p. 59); the final bar is a whole note, as in all of Fux's examples.
 * Third species (p. 63): four quarter notes per bar. Fourth species (p. 69): two half notes per
 * bar as in the second, the upbeat tied over the bar line to the next downbeat (the ligature); the
 * player writes the same note on both sides of the bar line and the tie follows (D61). Fux opens
 * every fourth-species example with a half rest.
 */
export type SpeciesId = "first" | "second" | "third" | "fourth";

/** The value written in a slot for a rest. */
export const REST = "r";

export interface Slot {
  bar: number;
  /** Position in the bar: 0 = thesis (downbeat); in half notes 1 = arsis; in quarters 1..3. */
  beat: 0 | 1 | 2 | 3;
  duration: "1/1" | "1/2" | "1/4";
  restAllowed: boolean;
}

export function slotLayout(species: SpeciesId, bars: number): Slot[] {
  if (bars < 2) throw new Error("an exercise needs at least two bars");
  if (species === "first") return Array.from({ length: bars }, (_, bar) => ({ bar, beat: 0, duration: "1/1", restAllowed: false }));
  const slots: Slot[] = [];
  if (species === "third") {
    for (let bar = 0; bar < bars - 1; bar++) for (const beat of [0, 1, 2, 3] as const) slots.push({ bar, beat, duration: "1/4", restAllowed: false });
    slots.push({ bar: bars - 1, beat: 0, duration: "1/1", restAllowed: false });
    return slots;
  }
  for (let bar = 0; bar < bars - 1; bar++) {
    slots.push({ bar, beat: 0, duration: "1/2", restAllowed: bar === 0 });
    slots.push({ bar, beat: 1, duration: "1/2", restAllowed: false });
  }
  slots.push({ bar: bars - 1, beat: 0, duration: "1/1", restAllowed: false });
  return slots;
}

/** Slot length in whole notes. */
export const slotLength = (s: Slot) => (s.duration === "1/1" ? 1 : s.duration === "1/2" ? 0.5 : 0.25);
/** Slot onset in whole notes from the start. */
export const slotOffset = (s: Slot) => s.bar + s.beat * slotLength(s);
/** Is the slot on the downbeat (thesis)? */
export const isDownbeat = (s: Slot) => s.beat === 0;
/** Slots per bar in this layout (1, 2 or 4; the final bar excepted). */
export const slotsPerBar = (layout: Slot[]) => layout.filter((s) => s.bar === layout[0].bar).length;

/**
 * Fourth species: is the note at slot k tied into slot k + 1 (an upbeat held over the bar line to
 * the same pitch on the next downbeat)?
 */
export function tiedToNext(layout: Slot[], notes: (string | null)[], k: number): boolean {
  const a = layout[k];
  const b = layout[k + 1];
  return !!a && !!b && a.duration === "1/2" && a.beat === 1 && b.beat === 0 && sounding(notes[k] ?? null) && notes[k] === notes[k + 1];
}

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
  /** A second counterpoint (Fux's), sounding with the player's in "trio" playback. */
  fux?: string | null;
  /** Derived versions of the player's line (inversion, retrograde, canon...), by id. */
  versions?: Record<string, string | null>;
  /** Fourth species: the length of a tied note, by voice ("counterpoint", "fux" or a version id). */
  lengths?: Record<string, number>;
}

/**
 * Playback events for bars lo..hi (inclusive). Rests and empty slots sound only the cantus.
 * `fux`, when given, adds Fux's line as a second counterpoint on the same layout.
 */
export function timeline(
  cantus: string[],
  layout: Slot[],
  notes: (string | null)[],
  lo = 0,
  hi = cantus.length - 1,
  fux?: (string | null)[],
  versions?: Record<string, (string | null)[]>,
  opts: { ties?: boolean } = {},
): PlayEvent[] {
  const slots = slotsOfBars(layout, lo, hi);
  // With ties (fourth species), a note held over the bar line sounds once, for both halves.
  const voice = (line: (string | null)[], id: string, k: number, lengths: Record<string, number>) => {
    if (opts.ties && k > 0 && tiedToNext(layout, line, k - 1) && slots.includes(k - 1)) return null;
    if (opts.ties && tiedToNext(layout, line, k) && slots.includes(k + 1)) lengths[id] = slotLength(layout[k]) + slotLength(layout[k + 1]);
    return sounding(line[k] ?? null) ? line[k] : null;
  };
  return slots.map((k) => {
    const s = layout[k];
    const lengths: Record<string, number> = {};
    const event: PlayEvent = {
      slot: k,
      at: slotOffset(s) - lo,
      length: slotLength(s),
      cantus: s.beat === 0 ? cantus[s.bar] : null,
      counterpoint: voice(notes, "counterpoint", k, lengths),
      ...(fux ? { fux: voice(fux, "fux", k, lengths) } : {}),
      ...(versions && Object.keys(versions).length ? { versions: Object.fromEntries(Object.entries(versions).map(([id, v]) => [id, voice(v, id, k, lengths)])) } : {}),
    };
    if (Object.keys(lengths).length) event.lengths = lengths;
    return event;
  });
}
