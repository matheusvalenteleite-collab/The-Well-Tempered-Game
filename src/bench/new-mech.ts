/**
 * D1059, NEW MECHANICS IN THE DEVELOPER VIEW (the owner: try bowing in real fugues on STRING CONSORT): play.html's SETTINGS, unlocked
 * only (unlock.ts `unlocked`), a switch kept on the device, default OFF. ON: the bow (MECH.bow, D1055-D1058) and its recordings, as
 * THE NEW LAB has them, from the page's next load. A device not unlocked never reads it: nothing changes for any player.
 * D1060 (WTC 3.36): the owner ("I like new mechanics, it can ship to main game as default for string instruments"): the bow is
 * play.html's default for every player; the developer view's switch now turns it OFF (kept as "off"), unlocked devices only.
 */
import { lockMech } from "./mechanics.ts";
import { setBowLayersWanted } from "../touch/sampled.ts";
import { unlocked } from "./unlock.ts";

export const NEW_MECH_KEY = "tg-new-mechanics-v1";

/** D1060: the switch as kept (ON where nothing is kept or storage is out of reach: the game's default). */
export function newMechStored(): boolean {
  try {
    return typeof localStorage === "undefined" || localStorage.getItem(NEW_MECH_KEY) !== "off";
  } catch {
    return true;
  }
}
export function saveNewMech(on: boolean) {
  try {
    if (on) localStorage.removeItem(NEW_MECH_KEY);
    else localStorage.setItem(NEW_MECH_KEY, "off");
  } catch {
    /* this visit only */
  }
}
/** At the page's start (play.html): the new mechanics on for every player (D1060), unless an unlocked device switched them off. Returns whether they are. */
export function applyNewMech(): boolean {
  const on = !unlocked() || newMechStored();
  if (on) {
    lockMech({ bow: true });
    setBowLayersWanted(true);
  }
  return on;
}

/**
 * D1066, GUITAR & TILT (Batch 2: the guitars' hands, D1061-D1064; PSYCH's tilt, D1065). The owner ("directly to main game, I
 * believe you"): on for every player at play.html's load, as the bow (D1060); the developer view's switch (unlocked devices only)
 * turns it OFF (kept as "off", GUITAR_TILT_KEY). MECH_DEFAULTS keeps both off: THE OLD LAB, the Lab's pages and takes recorded
 * without them replay as before (a take's notes carry Play.guitar, set by the game as each note starts).
 */
export const GUITAR_TILT_KEY = "tg-guitar-tilt-v1";
export function guitarTiltStored(): boolean {
  try {
    return typeof localStorage === "undefined" || localStorage.getItem(GUITAR_TILT_KEY) !== "off";
  } catch {
    return true;
  }
}
export function saveGuitarTilt(on: boolean) {
  try {
    if (on) localStorage.removeItem(GUITAR_TILT_KEY);
    else localStorage.setItem(GUITAR_TILT_KEY, "off");
  } catch {
    /* this visit only */
  }
}
/** D1066: at play.html's start: the guitars' hands and PSYCH's tilt on for every player, unless an unlocked device switched them off. */
export function applyGuitarTilt(): boolean {
  const on = !unlocked() || guitarTiltStored();
  if (on) lockMech({ guitar: true, tilt: true });
  return on;
}
