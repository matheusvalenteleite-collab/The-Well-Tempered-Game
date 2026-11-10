/**
 * D602, THE HARPSICHORD'S TWO MANUALS SCRIPTED (the owner on II/2: "boring, hard to hear the strettos"). A harpsichordist
 * playing a fugue on a two-manual instrument puts the voices on two keyboards of contrasting registration and changes
 * stops between sections; here the band's voices are so played, by the score alone:
 *
 *   - each voice plays on the LOWER manual (the brighter: 8′+4′, or coupled 8′+8′+4′) for the span of its own entries
 *     (the subject or the answer, f.entries: the data form-points.ts reads), on the UPPER manual (8′, or the buff stop
 *     where the texture is thin) otherwise, so an entering subject is heard by its colour, not by its loudness;
 *   - the manuals' stops change at the form's points only (form-points.ts: the exposition, its strettos (the first entry
 *     that begins inside another's), the final group, the coda): the buff on the upper manual in the plain exposition, the
 *     upper's plain 8′ and the lower coupled from the first stretto, the upper's 8′+8′ in the final group, the whole
 *     instrument coupled (8′+8′+4′) for the last chord;
 *   - no note added, none taken away, nothing timed differently: only which choirs a band note's string sounds
 *     (registration.ts registeredNote's), read as the note starts (a plucked string keeps its stop);
 *   - the bass audible on a phone: the lowest voice never takes the buff on a phone (colour.ts bandColour);
 *   - never judged: the plan is the piece's, the same for every run; the player's own stops and TUTTI win (colour.ts
 *     bandRegistration); Busoni's printed terraces stand aside for the band where the script plays (his marks fall on
 *     its points: II/2's "dolce" from bar 1, "meno dolce" at the first stretto, "forte" in the final group).
 *
 * The script is a colour plan (colour.ts ColourEvent, one moment a voice per change) for the pieces in SCRIPTED on the
 * harpsichord; proto-game.ts plays it in place of the sound's colour plan and reports each change (music-events.ts).
 */
import type { TouchFugue } from "./fugue.ts";
import { formOf } from "./form-points.ts";
import type { ColourEvent } from "./colour.ts";
import type { StopId } from "./registration.ts";

/** The pieces whose band is so registered, by sound (the harpsichord only). */
export const SCRIPTED: Readonly<Record<string, readonly string[]>> = { harpsichordSampled: ["wtc2f02"] };
export const hasManualScript = (pieceId: string, presetId: string): boolean => !!SCRIPTED[presetId]?.includes(pieceId);

/** A stretch of the form: its manuals' stops (the lower for the entries, the upper for the rest). */
export interface ManualStage {
  /** The stage's name (for the tests and the Sound Lab's line). */
  name: "exposition" | "stretti" | "final" | "coda";
  on: number;
  lower: readonly StopId[];
  upper: readonly StopId[];
}
/** The stages' registrations (8′ always speaks: four = the 4′, unison = the second 8′, lute = the buff). */
export const STAGE_STOPS: Readonly<Record<ManualStage["name"], { lower: readonly StopId[]; upper: readonly StopId[] }>> = {
  exposition: { lower: ["four"], upper: ["lute"] },
  stretti: { lower: ["unison", "four"], upper: [] },
  final: { lower: ["unison", "four"], upper: ["unison"] },
  coda: { lower: ["unison", "four"], upper: ["unison", "four"] },
};

/** The script's stages for a fugue (by its form): the exposition, the first stretto, the final group, the coda. */
export function manualStages(f: TouchFugue): ManualStage[] {
  const fp = formOf(f);
  const ents = [...f.entries].sort((a, b) => a.on - b.on);
  const fin = fp.seams.find((s) => s.kind === "final");
  const coda = fp.seams.find((s) => s.kind === "coda");
  // The first stretto: the first entry that begins inside the first half of another's (an answer taking over as the
  // subject ends is the exposition's, not a stretto).
  const str = ents.find((e, i) => i > 0 && ents.slice(0, i).some((x) => x.voice !== e.voice && x.on < e.on && x.end - e.on >= (x.end - x.on) / 2));
  const out: ManualStage[] = [{ name: "exposition", on: 0, ...STAGE_STOPS.exposition }];
  if (str && (!fin || str.on < fin.on)) out.push({ name: "stretti", on: str.on, ...STAGE_STOPS.stretti });
  if (fin) out.push({ name: "final", on: fin.on, ...STAGE_STOPS.final });
  // The last chord (the coda where the form has one, else the last attack).
  out.push({ name: "coda", on: coda?.on ?? fp.last, ...STAGE_STOPS.coda });
  return out;
}

/** Whether a voice is inside one of its own entries at a tick. */
const inEntry = (f: TouchFugue, voice: number, tick: number) => f.entries.some((e) => e.voice === voice && tick >= e.on && tick < e.end);

/**
 * The script as a colour plan: for each voice, a moment wherever its manual or its manual's stops change (an entry's
 * start and end, a stage's start), as a bar position (colour.ts tickOfBar's inverse).
 */
export function manualScript(f: TouchFugue): ColourEvent[] {
  const stages = manualStages(f);
  const points = new Set<number>(stages.map((s) => s.on));
  for (const e of f.entries) (points.add(e.on), points.add(e.end));
  const ticks = [...points].filter((t) => t >= 0 && t < f.length).sort((a, b) => a - b);
  const out: ColourEvent[] = [];
  for (let v = 0; v < f.voices.length; v++) {
    let last = "";
    for (const t of ticks) {
      const st = [...stages].reverse().find((s) => s.on <= t) ?? stages[0];
      const stops = inEntry(f, v, t) ? st.lower : st.upper;
      const key = stops.join("+");
      if (key === last) continue;
      last = key;
      out.push([barOf(f, t), { reg: [...stops], voices: [v] }]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/** A tick as a bar position (bar n plus the fraction of its length gone), as colour.ts tickOfBar reads it back. */
function barOf(f: TouchFugue, tick: number): number {
  let b = f.bars[0];
  for (const x of f.bars) if (x.on <= tick) b = x;
  if (!b) return 1 + tick / f.barTicks;
  return b.n + (tick - b.on) / f.barTicks;
}

/** The stops a voice's band note takes at a tick under the script (for the tests and the studio's events). */
export function manualAt(f: TouchFugue, voice: number, tick: number): readonly StopId[] {
  const st = [...manualStages(f)].reverse().find((s) => s.on <= tick) ?? manualStages(f)[0];
  return inEntry(f, voice, tick) ? st.lower : st.upper;
}
