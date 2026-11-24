/**
 * D441, GLENN AS THE TUTORIAL'S HOST: who speaks in a bubble (the face, the name, the words). D1050 (code audit A): THE
 * MANUAL, whose Part 1 Glenn hosted, deleted with his wording of its lines; Herr Bach speaks the bubbles left (BachTalk),
 * and `glennShown` still marks the developer view's Glenn (D865).
 */
import { unlocked } from "./unlock.ts";
import { APP } from "./config.ts";

export type Host = "bach" | "glenn";
export const host = (): Host => "bach";
export const hostName = (): string => "Herr Bach";
/**
 * D865: Glenn's pilot (Part 1 hosted by him, Fugue I/1's film) also in the developer view of play.html (the owner: "I wanna see
 * the one film with Glenn that we already have ... Same for the tutorial part 1. Can we add this to the developer version of the
 * game? (I.e. Only if one inputs ricercar)"): only the film and the host, not the pilot's preludes or reveal arcs.
 */
export const glennShown = (): boolean => !!APP.glennPilot || (APP.lite && unlocked());

/** The line as the host says it. */
export const hostLine = (text: string): string => text;
