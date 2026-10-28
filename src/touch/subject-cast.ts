/**
 * D372 (Mario's design report §6, the owner: "assume yes"): each subject's own effect in the music box,
 * and how strongly each of its notes shows it. Drawing only: nothing here is heard or scored, and
 * nothing here depends on whether the player hit or missed a note.
 *
 * THE CAST: one effect a subject, chosen for the fugue's character (Keller's and Bodky's words, the
 * report's table for Book I). A double or triple fugue gives each subject its own (I/4: RAYS, RIPPLE,
 * FIRE). Built so far: FIRE, GLINT and SMOKE; a subject cast as another effect falls back to GLINT until
 * that effect is drawn (FX_BUILT), as does every piece the table does not name.
 *
 * ONE STRENGTH (D374, the owner): every subject note shows its effect equally (NOTE_WEIGHT; D372's
 * per-note weights, head, leap, long and quick, dropped). Another voice's subject notes at half
 * (OTHERS_SCALE), the player's at full.
 */

export type SubjectEffect = "FIRE" | "EMBERS" | "SHIMMER" | "GLINT" | "RIPPLE" | "PULSE" | "SMOKE" | "RAYS" | "HOP" | "TEARS";

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
  wtc1f20: ["FIRE"], // the forge
  wtc1f21: ["HOP"], // scherzando dance
  wtc1f22: ["RAYS"], // suffering to triumph
  wtc1f23: ["SHIMMER"], // quiet, warm
  wtc1f24: ["SMOKE"], // mourning
};

/** The effects drawn so far (box-fx.ts subjectFx); the others fall back to FALLBACK_FX. */
export const FX_BUILT: ReadonlySet<SubjectEffect> = new Set(["FIRE", "GLINT", "SMOKE"]);
export const FALLBACK_FX: SubjectEffect = "GLINT";

/** The effect a piece's subject (1, 2, 3) is cast as in the report's table (null where it names none). */
export function castOf(piece: string | undefined, theme: 1 | 2 | 3): SubjectEffect | null {
  const row = piece ? BOOK1_CAST[piece] : undefined;
  return row?.[theme - 1] ?? null;
}

/** The effect drawn for a piece's subject: its cast where built, else GLINT. */
export function effectOf(piece: string | undefined, theme: 1 | 2 | 3): SubjectEffect {
  const e = castOf(piece, theme);
  return e && FX_BUILT.has(e) ? e : FALLBACK_FX;
}

/** Every subject note's effect strength (D374: the same on every note). */
export const NOTE_WEIGHT = 0.85;
/** Another voice's subject notes at this share (the player's at full). */
export const OTHERS_SCALE = 0.5;
