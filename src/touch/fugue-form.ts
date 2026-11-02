/**
 * D513, SUBJECTS AND EPISODES IN THE PLAYBACK, AND A WHOLE-FUGUE CLIMAX. The owner: "This fugue [I/12] has a sharp
 * distinction between subject moments and episodes … scripted changes in playback, specially in DRUMS (ride cymbal,
 * rolls to enter the subject, rolls to get out and become calmer in the episodes) … not only the drums … the whole
 * playback … I/24 B minor … is a bit underwhelming for its position."
 *
 * THE FORM, read from the piece's own data through the existing API (never copied: another session corrects the
 * entries against the experts, and this follows): the subject's entries (TouchFugue.entries, the same the subject's
 * cues and effects read, subject-fx.ts SubjectCues) merged into SUBJECT zones (entries less than MERGE_BEATS apart
 * are one zone); a stretch of at least EPISODE_MIN_BARS bars (and EPISODE_MIN_BEATS beats) with no entry sounding is
 * an EPISODE; the last subject zone, from its first entry, is the CLIMAX (the final entries, their stretti and the
 * pedal under them, to the final cadence), unless it begins before CLIMAX_FROM of the piece, when the climax is the
 * last CLIMAX_TAIL of it (from a bar line). A fugue gets the layer where the contrast is CLEAR by the data: at least
 * MIN_EPISODES inner episodes (between two subject zones) covering at least MIN_EPISODE_SHARE of the piece
 * (`clearContrast`; the list is in FORM_FUGUES, measured and tested).
 *
 * WHAT CHANGES (formColour; the band only, never the player's note; never the score; no tempo): in a subject zone
 * the band a shade fuller (SUBJECT_DB) and brighter (a high shelf), the harpsichord's second 8′ coupled and the
 * organ's principals; in an episode a little lighter (EPISODE_DB), darker, the harpsichord's single 8′ and the
 * organ's flutes; the whole-fugue ARC (ARC_FROM_DB at the start rising to 0 by ARC_FULL of the piece) under both;
 * in the climax the most (CLIMAX_DB), the brightest, a touch more room (CLIMAX_ROOM), the harpsichord's full
 * registration and the organ's plenum. Small and terraced (changes only at the zones' boundaries, as a player
 * changes registration): Busoni's levels lead, these ride on them (at most ±1.5 dB). The drums (drum-presets.ts)
 * read the same zones: a roll into a subject zone, a roll out into the episode, sparser in the episodes, stronger
 * in the climax, a break before the final entry, a flourish on the final cadence.
 */
import { beatOf, type TouchFugue } from "./fugue.ts";
import type { Colour } from "./colour.ts";
import type { StopId } from "./registration.ts";

export type ZoneKind = "subject" | "episode";
export interface FormZone {
  kind: ZoneKind;
  /** Ticks [from, to). */
  from: number;
  to: number;
}
export interface FugueForm {
  id: string;
  /** The zones in time, covering the piece from the first entry (an episode before it: none). */
  zones: FormZone[];
  /** The climax's start (tick): the last subject zone's first entry, or the last CLIMAX_TAIL of the piece. */
  climax: number;
  /** The final entry's start (tick): the last subject zone's (where the drums break before it). */
  finalEntry: number;
  /** The last bar's start (tick): the final cadence's bar (the drums' flourish). */
  lastBar: number;
  end: number;
  beat: number;
  barTicks: number;
  /** The inner episodes (between two subject zones) and their share of the piece. */
  episodes: number;
  episodeShare: number;
  /** Whether the contrast is clear enough for the layer (clearContrast). */
  clear: boolean;
}

/** Entries closer than this many beats are one subject zone. */
export const MERGE_BEATS = 1;
/** An episode: at least this many bars, and this many beats, with no entry sounding. */
export const EPISODE_MIN_BARS = 1.5;
export const EPISODE_MIN_BEATS = 4;
/** A clear contrast: at least this many inner episodes, covering at least this share of the piece. */
export const MIN_EPISODES = 3;
export const MIN_EPISODE_SHARE = 0.2;
/** The climax is the last subject zone where it begins after this share of the piece; else the piece's last CLIMAX_TAIL. */
export const CLIMAX_FROM = 0.6;
export const CLIMAX_TAIL = 0.15;

/** The band's level (dB) in a subject zone, an episode, the climax; the arc's start, reaching 0 at ARC_FULL of the piece. */
export const SUBJECT_DB = 0.4;
export const EPISODE_DB = -0.8;
export const CLIMAX_DB = 1;
export const ARC_FROM_DB = -0.6;
export const ARC_FULL = 0.6;
/** The band's high shelf (dB) in each (a brighter band reads as a fuller one; colour.ts TONE_RANGE bounds it). */
export const SUBJECT_TONE = 0.5;
export const EPISODE_TONE = -1.5;
export const CLIMAX_TONE = 1;
/** The send into the sound's own room added in the climax. */
export const CLIMAX_ROOM = 0.05;

/** The registrations (the band's, where no colour plan and no player's TUTTI sets one: colour.ts bandRegistration). */
export const FORM_REG: Readonly<Record<string, Readonly<Record<"subject" | "episode" | "climax", readonly StopId[]>>>> = {
  // The harpsichord: 8′ alone in the episodes, the second 8′ coupled for the entries, 8′ 8′ 4′ for the climax.
  harpsichordSampled: { episode: [], subject: ["unison"], climax: ["unison", "four"] },
  // The organ: the flutes in the episodes, the principals (8′ 4′) for the entries, the plenum for the climax.
  chamberOrgan: { episode: ["flute", "sub16"], subject: ["principal", "sub16"], climax: ["principal", "mixture", "sub16"] },
};
/** The plenum's and the full harpsichord's own loudness (measured: D513) taken back, so the climax rises by CLIMAX_DB, not more. */
export const REG_TRIM_DB: Readonly<Record<string, Readonly<Record<"subject" | "episode" | "climax", number>>>> = {
  harpsichordSampled: { episode: 0, subject: 0, climax: 0 },
  chamberOrgan: { episode: 0, subject: 0, climax: 0 },
};

const memo = new Map<string, FugueForm>();

/** The bar's start (tick) at or before `tick`. */
function barFloor(f: TouchFugue, tick: number): number {
  let on = 0;
  for (const b of f.bars) {
    if (b.on > tick) break;
    on = b.on;
  }
  return on;
}

/** A fugue's form (memoised by its id and its entries' count and ends, so a corrected entry list is read anew). */
export function formOf(f: TouchFugue): FugueForm {
  const key = `${f.id}:${f.entries.length}:${f.entries.reduce((s, e) => s + e.on * 3 + e.end, 0)}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const beat = beatOf(f).ticks;
  const spans = f.entries.map((e) => [e.on, e.end] as [number, number]).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const s of spans) {
    const l = merged[merged.length - 1];
    if (l && s[0] <= l[1] + MERGE_BEATS * beat) l[1] = Math.max(l[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  const minGap = Math.max(EPISODE_MIN_BARS * f.barTicks, EPISODE_MIN_BEATS * beat);
  // Gaps too short for an episode join the zones either side.
  const subj: [number, number][] = [];
  for (const m of merged) {
    const l = subj[subj.length - 1];
    if (l && m[0] - l[1] < minGap) l[1] = Math.max(l[1], m[1]);
    else subj.push([m[0], m[1]]);
  }
  const zones: FormZone[] = [];
  let inner = 0;
  let innerTicks = 0;
  subj.forEach(([a, b], i) => {
    const prev = zones[zones.length - 1];
    if (prev && a > prev.to) {
      zones.push({ kind: "episode", from: prev.to, to: a });
      inner++;
      innerTicks += a - prev.to;
    }
    zones.push({ kind: "subject", from: a, to: b });
    if (i === subj.length - 1 && b < f.length) zones.push({ kind: "episode", from: b, to: f.length });
  });
  if (!zones.length) zones.push({ kind: "subject", from: 0, to: f.length });
  const lastSubject = [...zones].reverse().find((z) => z.kind === "subject")!;
  const climax = lastSubject.from >= CLIMAX_FROM * f.length ? lastSubject.from : barFloor(f, f.length * (1 - CLIMAX_TAIL));
  const lastBar = f.bars.length ? f.bars[f.bars.length - 1].on : Math.max(0, f.length - f.barTicks);
  const episodeShare = f.length ? innerTicks / f.length : 0;
  const form: FugueForm = {
    id: f.id,
    zones,
    climax,
    finalEntry: lastSubject.from,
    lastBar,
    end: f.length,
    beat,
    barTicks: f.barTicks,
    episodes: inner,
    episodeShare,
    clear: f.kind === "fugue" && inner >= MIN_EPISODES && episodeShare >= MIN_EPISODE_SHARE,
  };
  memo.set(key, form);
  return form;
}

/** Whether a fugue's subjects and episodes are clearly apart by the data (the layer applies). */
export const clearContrast = (f: TouchFugue): boolean => formOf(f).clear;

export type FormKind = ZoneKind | "climax";
/** Where a tick is in the form: its zone's kind (the climax over both from its start), the zone, the arc (0-1). */
export interface FormAt {
  kind: FormKind;
  zone: FormZone | null;
  /** The piece's progress (0 at the start, 1 at the end). */
  progress: number;
}
export function formAt(form: FugueForm, tick: number): FormAt {
  const progress = form.end ? Math.max(0, Math.min(1, tick / form.end)) : 0;
  const zone = form.zones.find((z) => tick >= z.from && tick < z.to) ?? null;
  if (tick >= form.climax) return { kind: "climax", zone, progress };
  // Before the first entry (an upbeat): as a subject (the exposition is under way).
  return { kind: zone?.kind ?? "subject", zone, progress };
}

/** The whole-fugue arc's level (dB) at a share of the piece: ARC_FROM_DB rising to 0 by ARC_FULL. */
export const arcDb = (progress: number): number => ARC_FROM_DB * Math.max(0, 1 - progress / ARC_FULL);

/** What the form does to a band note here: its level (dB), its colour (shelf, room, the registration). */
export interface FormColour {
  db: number;
  colour: Colour;
}

/**
 * The band's colour by the form at a note's onset, on a sound (presetId), or null where the layer does not apply
 * (a fugue without a clear contrast, or not a fugue).
 */
export function formColour(form: FugueForm, presetId: string, tick: number): FormColour | null {
  if (!form.clear) return null;
  const at = formAt(form, tick);
  const k = at.kind;
  const reg = FORM_REG[presetId]?.[k];
  const trim = REG_TRIM_DB[presetId]?.[k] ?? 0;
  const db = (k === "climax" ? CLIMAX_DB : k === "subject" ? SUBJECT_DB + arcDb(at.progress) : EPISODE_DB + arcDb(at.progress)) + trim;
  const colour: Colour = { tone: k === "climax" ? CLIMAX_TONE : k === "subject" ? SUBJECT_TONE : EPISODE_TONE };
  if (k === "climax") colour.room = CLIMAX_ROOM;
  if (reg) colour.reg = [...reg];
  return { db, colour };
}

/**
 * A colour plan's colour and the form's together (the band note's): the plan's stops win (an arranger's choice for
 * that sound), the shelves and the rooms add, the rest the plan's.
 */
export function withForm(plan: Colour | null, form: Colour | null): Colour | null {
  if (!form) return plan;
  if (!plan) return form;
  const out: Colour = { ...form, ...plan };
  if (plan.reg === undefined && form.reg) out.reg = form.reg;
  if (form.tone || plan.tone) out.tone = (plan.tone ?? 0) + (form.tone ?? 0);
  if (form.room || plan.room) out.room = (plan.room ?? 0) + (form.room ?? 0);
  return out;
}

/** A band-note form layer for a game: built once for a piece, asked per note. */
export class FormLayer {
  readonly form: FugueForm;
  constructor(f: TouchFugue) {
    this.form = formOf(f);
  }
  at(presetId: string, tick: number): FormColour | null {
    return layerOn ? formColour(this.form, presetId, tick) : null;
  }
}

/** The layer's switch (on by default; off: the band as before D513, for comparison renders and the Lab). */
let layerOn = true;
export function setFormLayer(on: boolean) {
  layerOn = on;
}
export const formLayerOn = () => layerOn;
