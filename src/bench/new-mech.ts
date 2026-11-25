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
