/**
 * D355, COLOUR PLANS (the owner: "if player is using harpsichord, some fugue will have moments where it's
 * common to switch manuals … the playback voices could do the switch independently of what player does
 * … each preset might have a chance of having those tailored things in specific fugues"): for a piece and
 * a sound, a list of moments, by bar, where the BAND changes colour as a player of that instrument would:
 * the harpsichord's manuals and stops (8′ alone, 8′+4′, the coupled 8′+8′+4′, the lute), the organ's
 * registration (the flutes of a second manual, the principals, the plenum), the consoles' own moves (a
 * pulse's width, the FM index, a send into the preset's echo or hall, a vowel opened, the piano's soft
 * layer). The plans are written in tools/touch/colour-plans/ (each with its reason) and packed into
 * data/touch/colour-plans.json, a chunk loaded on demand.
 *
 * The rules (test/d355-colour-plans.test.ts):
 *   - the band only: the player's note is never coloured, and the player's own stops win (TUTTI: the
 *     player registers the whole instrument, and the plan stands aside);
 *   - never louder by design: no event has a level; what a registration adds is the instrument's own
 *     (at most the coupled 8′+8′+4′, about +2 dB; on the organ at most two ranks), and an event for some
 *     voices only may only soften or veil them (never a subject brought out by loudness);
 *   - between phrases: each note reads the colour when it starts (a note already sounding keeps its own,
 *     as a plucked string or a key held keeps its stop), and the plans put the moments at cadences and
 *     section boundaries;
 *   - the bass audible on a phone: on a phone the lowest voice takes no lowpass, no lute and no darker shelf;
 *   - never judged: the plan is sound only.
 */
import type { Play, Voicing } from "./chip.ts";
import type { Registration, StopId } from "./registration.ts";
import { pulseWave } from "./touch-expr.ts";
import type { TouchFugue } from "./fugue.ts";

/** One colour of the band, from its moment until the next (fields absent: as the sound is). */
export interface Colour {
  /** HARPSICHORD (unison = a second 8′, four = the 4′, lute = the buff) or PIPE ORGAN (flute, principal, reed, mixture, trem) stops for the band; [] the sound's own. */
  reg?: StopId[];
  /** A send (0-0.35) into the sound's own effect: the SPC echo, the hall, the church, the plate, the space echo. */
  room?: number;
  /** A pulse's width (0.125, 0.25, 0.5): CLASSIC CHIP's, GAME BOY's and SID 64's pulse voices. */
  pw?: number;
  /** MEGA FM: the FM index scaled (0.5-1.6: mellower to brighter). */
  fm?: number;
  /** A high shelf (dB, −6 to +2): a timbre, darker or brighter. */
  tone?: number;
  /** A lowpass (Hz): a veiled, distant manual. */
  lp?: number;
  /** A vibrato (cents). */
  vib?: number;
  /** VOCAL SYNTH: the vowel, 0 closed to 1 open. */
  open?: number;
  /** PIANO: the recording's soft layer (an una corda's colour, not a level). */
  layer?: "soft" | "firm";
  /** BLEEPS AND BLOOPS: the mallets' hardness (0.5 soft to 1.5 hard). */
  strike?: number;
  /** The voices it applies to (0 the top); all where absent. */
  voices?: number[];
}

/** A moment: the bar (a fraction, of the bar's length, past its start) and the colour from there. */
export type ColourEvent = [bar: number, colour: Colour];
/** By piece, by sound (sound.ts PRESETS ids). */
export type ColourPlans = Readonly<Record<string, Readonly<Record<string, readonly ColourEvent[]>>>>;

let plans: ColourPlans | null = null;
let loading: Promise<ColourPlans> | null = null;
/** The plans, loaded once (a chunk of their own). */
export function loadColours(): Promise<ColourPlans> {
  loading ??= import("./colour-data.ts").then((m) => (plans = m.COLOUR_PLANS as ColourPlans));
  loading.catch(() => (loading = null));
  return loading;
}
/** The plans if loaded (null before). */
export const coloursLoaded = (): ColourPlans | null => plans;
/** D355: for tests and tools: the plans given directly. */
export function setColours(p: ColourPlans | null) {
  plans = p;
}

/** The plan for a piece on a sound (null: none, or not loaded yet). */
export function planOf(piece: string, presetId: string): readonly ColourEvent[] | null {
  return plans?.[piece]?.[presetId] ?? null;
}
/** Whether the sound has its own colours in the piece (the pop-up's ♪ hint). */
export const hasColours = (piece: string, presetId: string): boolean => !!planOf(piece, presetId)?.length;
/** The sounds with colours in a piece. */
export const colouredSounds = (piece: string): string[] => Object.keys(plans?.[piece] ?? {});

/** The tick of a bar position (bar 12.5: half of bar 12 gone). */
export function tickOfBar(f: Pick<TouchFugue, "bars" | "barTicks" | "length">, bar: number): number {
  const n = Math.floor(bar + 1e-9);
  const b = f.bars.find((x) => x.n === n);
  const on = b ? b.on : n < (f.bars[0]?.n ?? 1) ? 0 : f.length;
  return Math.round(on + (bar - n) * f.barTicks);
}

/** A plan made ready for a piece: each voice's colours in time. */
export class ColourPlan {
  private byVoice: { on: number; c: Colour }[][];
  constructor(f: Pick<TouchFugue, "bars" | "barTicks" | "length" | "voices">, events: readonly ColourEvent[], phone = false) {
    const count = f.voices.length;
    const evs = events.map(([bar, c]) => ({ on: tickOfBar(f, bar), c })).sort((a, b) => a.on - b.on);
    this.byVoice = Array.from({ length: count }, (_, v) => evs.filter((e) => !e.c.voices || e.c.voices.includes(v)).map((e) => ({ on: e.on, c: bandColour(e.c, v, count, phone) })));
  }
  /** The colour of a voice's note starting at `tick` (null: the sound's own). */
  at(tick: number, voice: number): Colour | null {
    const list = this.byVoice[voice];
    if (!list) return null;
    let c: Colour | null = null;
    for (const e of list) {
      if (e.on > tick) break;
      c = e.c;
    }
    return c && Object.keys(c).length ? c : null;
  }
}

/** The plan for a piece on a sound, ready (null where it has none or the plans are not loaded). */
export function colourPlanFor(f: TouchFugue, presetId: string, phone = false): ColourPlan | null {
  const evs = planOf(f.id, presetId);
  return evs?.length ? new ColourPlan(f, evs, phone) : null;
}

/** The shelf's bounds (dB): never much brighter (a brighter band reads as a louder one). */
export const TONE_RANGE: readonly [number, number] = [-6, 2];
/** The most a send into the effect may be. */
export const ROOM_MAX = 0.35;

/**
 * A colour as one voice takes it: the bounds kept; on a phone the lowest voice (the bass, which a phone's
 * small speaker hears only through its overtones) without lowpass, lute, darker shelf or another pulse width.
 */
export function bandColour(c: Colour, voice: number, count: number, phone: boolean): Colour {
  const out: Colour = { ...c };
  delete out.voices;
  if (out.tone !== undefined) out.tone = Math.max(TONE_RANGE[0], Math.min(TONE_RANGE[1], out.tone));
  if (out.room !== undefined) out.room = Math.max(0, Math.min(ROOM_MAX, out.room));
  if (phone && voice === count - 1 && count > 1) {
    delete out.lp;
    // CLASSIC CHIP's phone bass is a pulse chosen for the small speaker (chip.ts voicing): its width kept.
    delete out.pw;
    if (out.tone !== undefined && out.tone < 0) delete out.tone;
    if (out.reg) out.reg = out.reg.filter((s) => s !== "lute");
  }
  return out;
}

/**
 * The registration a note takes: the player's (always for the player's own note, and for every note
 * under the player's TUTTI); else, where the band's colour has stops, those for the band.
 */
export function bandRegistration(live: Registration, p: Pick<Play, "lead" | "colour">): Registration {
  if (p.lead || !p.colour?.reg || live.tutti) return live;
  return { stops: [...p.colour.reg], tutti: true };
}

/** A band note coloured (Chip.note): its voicing (a chip pulse's width) and its playing (the rest); never the player's note, never its level. */
export function coloured(presetId: string, c: Colour, v: Voicing, p: Play): [Voicing, Play] {
  if (p.lead) return [v, p];
  const q: Play = { ...p };
  if (c.pw !== undefined) {
    // CLASSIC CHIP's pulses are voicings (no patch); the consoles' pulses read Play.pw (the SID's any width).
    if (!v.patch && v.timbre !== "triangle") v = { ...v, timbre: pulseWave(c.pw) };
    else if (v.patch) {
      q.pw = c.pw;
      if (presetId === "sid64") q.pwContinuous = true;
    }
  }
  if (c.fm !== undefined) q.fmScale = c.fm;
  if (c.tone) q.tone = (q.tone ?? 0) + c.tone;
  if (c.room) q.room = (q.room ?? 0) + c.room;
  if (c.lp) q.lp = Math.min(q.lp ?? c.lp, c.lp);
  if (c.vib) q.vib = Math.max(q.vib ?? 0, c.vib);
  if (c.open !== undefined) q.open = c.open;
  if (c.layer) q.layer = c.layer;
  if (c.strike !== undefined) q.strike = c.strike;
  // A lowpass on a note is sounded by the note's expression stage (which a band note has only so).
  if (c.lp && !q.hold) q.hold = "none";
  return [v, q];
}
