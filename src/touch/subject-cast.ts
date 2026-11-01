/**
 * D372 (Mario's design report §6, the owner: "assume yes"): each subject's own effect in the music box,
 * and how strongly each of its notes shows it. Drawing only: nothing here is heard or scored, and
 * nothing here depends on whether the player hit or missed a note.
 *
 * THE CAST: one effect a subject, chosen for the fugue's character (Keller's and Bodky's words, the
 * report's table for Book I). A double or triple fugue gives each subject its own (I/4: RAYS, RIPPLE,
 * FIRE). D383: all ten of the report's effects are drawn (box-fx.ts subjectFx) and every fugue of the 48
 * is cast, Book II too (BOOK2_CAST, its reasons beside it); a piece outside the 48 falls back to GLINT.
 * The design studio: for now every subject is drawn HOP (ONLY_FX); the cast is kept as the record.
 *
 * ONE STRENGTH (D374, the owner): every subject note shows its effect equally (NOTE_WEIGHT; D372's
 * per-note weights, head, leap, long and quick, dropped). Another voice's subject notes at half
 * (OTHERS_SCALE), the player's at full.
 */

export type SubjectEffect = "FIRE" | "EMBERS" | "SHIMMER" | "GLINT" | "RIPPLE" | "PULSE" | "SMOKE" | "RAYS" | "HOP" | "TEARS";

/** Every effect the box can draw (D383: all ten). */
export const EFFECTS: readonly SubjectEffect[] = ["FIRE", "EMBERS", "SHIMMER", "GLINT", "RIPPLE", "PULSE", "SMOKE", "RAYS", "HOP", "TEARS"];

/** The report's cast for Book I: each fugue's subjects' effects (the first subject first). */
export const BOOK1_CAST: Readonly<Record<string, readonly SubjectEffect[]>> = {
  wtc1f01: ["GLINT"], // austere; in a stretto each entry flashes once at its head
  wtc1f02: ["HOP"], // capricious; the C-B-C head hops
  wtc1f03: ["SHIMMER"], // graceful, euphonious
  wtc1f04: ["RAYS", "RIPPLE", "FIRE"], // three subjects; the third has the "highest inward intensity"
  wtc1f05: ["FIRE"], // Keller: "with fire"
  wtc1f06: ["EMBERS"], // violent, marcato; sparks fly off
  wtc1f07: ["RIPPLE"], // gently moving
  wtc1f08: ["PULSE"], // searching; the augmented entries pulse at half speed
  wtc1f09: ["HOP"], // cheeky, two hops and away
  wtc1f10: ["FIRE"], // aggressive, passionate
  wtc1f11: ["SHIMMER"], // a passepied's grace
  wtc1f12: ["SMOKE"], // anguish
  wtc1f13: ["RIPPLE"], // Bodky's "Little Brook"
  wtc1f14: ["TEARS"], // Bodky's teardrops
  wtc1f15: ["EMBERS"], // "strength, fire, humour"
  wtc1f16: ["GLINT"], // quiet; a glint per entry
  wtc1f17: ["RAYS"], // noble, choral
  wtc1f18: ["SHIMMER"], // almost romantic
  wtc1f19: ["GLINT"], // the illusion: a glint where the ear is fooled
  wtc1f20: ["FIRE"], // the forge; an inverted entry's sparks fall
  wtc1f21: ["HOP"], // scherzando dance
  wtc1f22: ["RAYS"], // suffering to triumph
  wtc1f23: ["SHIMMER"], // quiet, warm
  wtc1f24: ["SMOKE"], // mourning
};

/** D383: Book II's cast, in the same spirit (Keller's and Bodky's words; the names in fugue-names.ts). */
export const BOOK2_CAST: Readonly<Record<string, readonly SubjectEffect[]>> = {
  wtc2f01: ["HOP"], // the Miller: "masculine humour … high spirits"; the G-F-G turn bounces
  wtc2f02: ["PULSE"], // the Mason: severe, inner strength; the augmented entries pulse at half speed
  wtc2f03: ["SHIMMER"], // the Weaver: "bathed in euphony"
  wtc2f04: ["EMBERS", "GLINT"], // the Fox: a running gigue throws sparks; the second subject glints
  wtc2f05: ["RAYS"], // the Cantor: a vocal, "catholic" fugue; light from above
  wtc2f06: ["FIRE"], // the Archer: "great forcefulness and terseness", "with heavy emotion"
  wtc2f07: ["PULSE"], // the Organist: long held notes breathing like the organ's wind
  wtc2f08: ["TEARS"], // the Gem-Cutter: "heavy melancholy and great seriousness"
  wtc2f09: ["RAYS"], // the Angel: Palestrina's "transfigured vocal beauty", "flights of angels"
  wtc2f10: ["EMBERS"], // the Hound: "energetic, impatient … pressing forward"
  wtc2f11: ["SHIMMER"], // the Butterfly: "fleeting and light", a wing-line theme
  wtc2f12: ["HOP"], // the Woodpecker: "caprice and a certain humour"; the repeated notes tap
  wtc2f13: ["GLINT"], // the Trill: "high spirits, grace"; a glint on each note of the trill
  wtc2f14: ["PULSE", "EMBERS", "RIPPLE"], // the Alchemist: Keller's "thoughtful", "terse, energetic", "gently flowing"
  wtc2f15: ["RIPPLE"], // the Swallow: "delicately moving", a corrente skimming the water
  wtc2f16: ["FIRE"], // the Orator: "a hurled protest", Bodky's "molto feroce"
  wtc2f17: ["RAYS"], // the Queen: "solemnity", Bodky's Sanctus
  wtc2f18: ["SHIMMER", "RIPPLE"], // the Dancers: galant and flowing; each partner its own
  wtc2f19: ["GLINT"], // the Wanderer: "simple, unpretentious; a quiet walk"
  wtc2f20: ["FIRE"], // the Bull: "an extraordinary outburst of temper", "explosive"
  wtc2f21: ["PULSE"], // the Mother: "cradle peace"; the notes breathe like a sleeping child
  wtc2f22: ["SMOKE"], // the Titan: "heavy, troubled, sorrowful gestures"
  wtc2f23: ["RIPPLE", "SHIMMER"], // the Ferryman: "quietly flowing, singing"; the two subjects water and light
  wtc2f24: ["HOP"], // the Fiddler: a playful passepied, the last dance
};

/** The 48's cast, both books. */
export const CAST: Readonly<Record<string, readonly SubjectEffect[]>> = { ...BOOK1_CAST, ...BOOK2_CAST };

/** The effects drawn (box-fx.ts subjectFx; D383: all of them); FALLBACK_FX for a piece outside the cast. */
export const FX_BUILT: ReadonlySet<SubjectEffect> = new Set(EFFECTS);
export const FALLBACK_FX: SubjectEffect = "GLINT";

/** The effect a piece's subject (1, 2, 3) is cast as (null where the cast names none). */
export function castOf(piece: string | undefined, theme: 1 | 2 | 3): SubjectEffect | null {
  const row = piece ? CAST[piece] : undefined;
  return row?.[theme - 1] ?? null;
}

/**
 * The design studio (the owner: HOP "follows the music illustratively and shows most clearly that a
 * subject is playing"): for now HOP is the only subject effect, in every fugue, every subject. The cast
 * above stays as the report's record (castOf); set this to null to draw the cast again.
 */
export const ONLY_FX: SubjectEffect | null = "HOP";

/** The effect drawn for a piece's subject: ONLY_FX while it is set; else its cast, else GLINT. */
export function effectOf(piece: string | undefined, theme: 1 | 2 | 3): SubjectEffect {
  if (ONLY_FX) return ONLY_FX;
  const e = castOf(piece, theme);
  return e && FX_BUILT.has(e) ? e : FALLBACK_FX;
}

/** Every subject note's effect strength (D374: the same on every note). */
export const NOTE_WEIGHT = 0.85;
/** Another voice's subject notes at this share (the player's at full). */
export const OTHERS_SCALE = 0.5;
