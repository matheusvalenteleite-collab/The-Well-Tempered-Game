/**
 * D237: which build of the bench is running. `lite` is the minimal page for friends (play.html;
 * lite-main.tsx sets it before the first render): the card grid, the pop-up, the game, the result;
 * no tutorial, achievements, interfaces, Kimiko, seals or Book II/XIV. `dev` (`?dev=1` in the
 * address) brings back the tutorial's entry points in the full bench (TUTORIAL, LEARN THIS MODE,
 * Herr Bach's HAVE YOU PLAYED BEFORE?).
 */
export const APP = { lite: false, dev: devFlag() };

/** `?dev=1` in the address (read in try/catch: no location in the tests). */
export function devFlag(search: string = typeof location === "undefined" ? "" : location.search): boolean {
  try {
    return new URLSearchParams(search).get("dev") === "1";
  } catch {
    return false;
  }
}
