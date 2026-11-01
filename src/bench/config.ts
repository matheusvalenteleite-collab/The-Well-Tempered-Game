/**
 * D237: which build of the bench is running. `lite` is the minimal page for friends (play.html;
 * lite-main.tsx sets it before the first render): the card grid, the pop-up, the game, the result;
 * no tutorial, achievements, interfaces, Kimiko, seals or Book II/XIV. `dev` (`?dev=1` in the
 * address) brings back the tutorial's entry points in the full bench (TUTORIAL, LEARN THIS MODE,
 * Herr Bach's HAVE YOU PLAYED BEFORE?).
 */
/** D376: `glenn`, THE EXPRESSION LAB (lab.html?glenn=1: Glenn's mechanics on, every collection open, each take kept in the Lab's RUNS). */
/** D441: `glennPilot`, THE GLENN PILOT (lab.html?pilot=glenn: Part 1 hosted by Glenn, and Fugue I/1's LEARN film; glenn-host.ts, GlennFilm.tsx). */
/** D440: `progression`, PROGRESSION MODE (lab.html?progression=1: Book I as a path of stages, each with its own tutorial; progression.ts). */
export const APP = { lite: false, dev: devFlag(), glenn: false, progression: false, glennPilot: false };

/** `?dev=1` in the address (read in try/catch: no location in the tests). */
export function devFlag(search: string = typeof location === "undefined" ? "" : location.search): boolean {
  try {
    return new URLSearchParams(search).get("dev") === "1";
  } catch {
    return false;
  }
}
