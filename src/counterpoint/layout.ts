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
 * Fifth species (pp. 76-81, D82): florid counterpoint, any mixture of the values of the earlier
 * species. Each bar has eight eighth-note slots; a note fills its first slot with its pitch and the
 * rest with HOLD; a HOLD at the start of a bar carries the note over the bar line (the tie).
 */
export type SpeciesId = "first" | "second" | "third" | "fourth" | "fifth";

/** The value written in a slot for a rest. */
export const REST = "r";
/** Fifth species: the slot continues the note (or rest) before it (D82). */
export const HOLD = "~";

export interface Slot {
  bar: number;
  /** Position in the bar: 0 = thesis (downbeat); in half notes 1 = arsis; in quarters 1..3; in eighths 0..7. */
  beat: number;
  duration: "1/1" | "1/2" | "1/4" | "1/8";
  restAllowed: boolean;
}

export function slotLayout(species: SpeciesId, bars: number): Slot[] {
  if (bars < 2) throw new Error("an exercise needs at least two bars");
  if (species === "first") return Array.from({ length: bars }, (_, bar) => ({ bar, beat: 0, duration: "1/1", restAllowed: false }));
  const slots: Slot[] = [];
  if (species === "fifth") {
    // A rest may open the piece, in its first half bar (Fux's half rest).
    for (let bar = 0; bar < bars - 1; bar++) for (let beat = 0; beat < 8; beat++) slots.push({ bar, beat, duration: "1/8", restAllowed: bar === 0 && beat < 4 });
    slots.push({ bar: bars - 1, beat: 0, duration: "1/1", restAllowed: false });
    return slots;
  }
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
export const slotLength = (s: Slot) => (s.duration === "1/1" ? 1 : s.duration === "1/2" ? 0.5 : s.duration === "1/4" ? 0.25 : 0.125);
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

const frac = (r: string) => {
  const [n, d] = r.split("/").map(Number);
  return n / (d ?? 1);
};

/**
 * Fifth species: Fux's notes (any values, ties across bar lines) onto the eighth-note slots: the
 * first slot of a note gets its pitch (or REST), the others HOLD; a note tied from the one before
 * is all HOLD. Fails loudly when a note does not fall on the grid.
 */
export function notesToFifthSlots(layout: Slot[], notes: { pitch: string | null; duration: string; offset?: string; tie?: string | null }[]): string[] {
  const out: (string | null)[] = layout.map(() => null);
  const indexAt = (t: number) => layout.findIndex((s) => Math.abs(slotOffset(s) - t) < 1e-9);
  let t = 0;
  for (const n of notes) {
    const start = n.offset !== undefined ? frac(n.offset) : t;
    const len = frac(n.duration);
    const k = indexAt(start);
    if (k < 0) throw new Error(`note at ${start} is off the eighth-note grid`);
    const continues = n.tie === "stop" || n.tie === "continue";
    let covered = 0;
    let j = k;
    while (covered < len - 1e-9 && j < layout.length) {
      out[j] = j === k && !continues ? (n.pitch ?? REST) : HOLD;
      covered += slotLength(layout[j]);
      j++;
    }
    if (Math.abs(covered - len) > 1e-9) throw new Error(`note at ${start}: duration ${n.duration} does not fill whole slots`);
    t = start + len;
  }
  if (out.some((x) => x === null)) throw new Error("the notes leave slots empty");
  return out as string[];
}

/** Map Fux's solution notes (pitch or null for a rest) onto the layout; fails loudly on a mismatch. */
export function notesToSlots(layout: Slot[], notes: { pitch: string | null; duration: string; offset?: string; tie?: string | null }[]): string[] {
  if (layout.some((s) => s.duration === "1/8")) return notesToFifthSlots(layout, notes);
  if (notes.length !== layout.length) throw new Error(`expected ${layout.length} notes for this layout, got ${notes.length}`);
  return notes.map((n, k) => {
    if (n.duration !== layout[k].duration) throw new Error(`slot ${k}: duration ${n.duration}, layout ${layout[k].duration}`);
    if (n.pitch === null && !layout[k].restAllowed) throw new Error(`slot ${k}: rest not allowed`);
    return n.pitch ?? REST;
  });
}

export const isRest = (x: string | null) => x === REST;
export const isHold = (x: string | null | undefined) => x === HOLD;
export const sounding = (x: string | null): x is string => x !== null && x !== REST && x !== HOLD;

/**
 * Fifth species (D82): what is drawn at each slot: the note (or rest) that begins there, or, at a
 * bar line, the continuation of a note held over it (`tied`), with its length in slots within the
 * bar; null where nothing begins.
 */
export function fifthGlyphs(line: (string | null | undefined)[], layout: Slot[], heldIn: string | null = null): ({ value: string; slots: number; tied: boolean } | null)[] {
  let held: string | null = heldIn;
  return layout.map((sl, k) => {
    const v = line[k];
    if (v === null || v === undefined) {
      held = null;
      return null;
    }
    if (v !== HOLD) held = v;
    if (v === HOLD && (sl.beat !== 0 || held === null)) return null;
    let n = 1;
    while (line[k + n] === HOLD && layout[k + n]?.bar === sl.bar) n++;
    return { value: v === HOLD ? held! : v, slots: n, tied: v === HOLD };
  });
}

/**
 * Fifth species: the note that begins at slot k (pitch or REST) and how many slots it lasts
 * (its HOLDs included, across bar lines); null when slot k is a HOLD or empty.
 */
export function noteSpan(line: (string | null | undefined)[], k: number): { value: string; slots: number } | null {
  const v = line[k];
  if (v === null || v === undefined || v === HOLD) return null;
  let n = 1;
  while (line[k + n] === HOLD) n++;
  return { value: v, slots: n };
}

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
  /** Three voices (D90): further notes on the counterpoint or Fux channel (the second written voice, Fux's second). */
  extra?: { channel: "counterpoint" | "second" | "fux"; pitch: string }[];
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
    // Fifth species: a HOLD continues the note before it; a note sounds for all its slots (D82).
    if (line[k] === HOLD) return null;
    if (line[k + 1] === HOLD) {
      const span = noteSpan(line, k)!;
      const last = Math.min(k + span.slots - 1, layout.length - 1);
      lengths[id] = slotOffset(layout[last]) + slotLength(layout[last]) - slotOffset(layout[k]);
    }
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
