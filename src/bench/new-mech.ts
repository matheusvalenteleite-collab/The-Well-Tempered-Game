/**
 * D1059, NEW MECHANICS IN THE DEVELOPER VIEW (the owner: try bowing in real fugues on STRING CONSORT): play.html's SETTINGS, unlocked
 * only (unlock.ts `unlocked`), a switch kept on the device, default OFF. ON: the bow (MECH.bow, D1055-D1058) and its recordings, as
 * THE NEW LAB has them, from the page's next load. A device not unlocked never reads it: nothing changes for any player.
 */
import { lockMech } from "./mechanics.ts";
import { setBowLayersWanted } from "../touch/sampled.ts";
import { unlocked } from "./unlock.ts";

export const NEW_MECH_KEY = "tg-new-mechanics-v1";

/** The switch as kept (off where nothing is kept or storage is out of reach). */
export function newMechStored(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(NEW_MECH_KEY) === "on";
  } catch {
    return false;
  }
}
export function saveNewMech(on: boolean) {
  try {
    if (on) localStorage.setItem(NEW_MECH_KEY, "on");
    else localStorage.removeItem(NEW_MECH_KEY);
  } catch {
    /* this visit only */
  }
}
/** At the page's start: the new mechanics on, only on an unlocked device that switched them on. Returns whether they are. */
export function applyNewMech(): boolean {
  const on = unlocked() && newMechStored();
  if (on) {
    lockMech({ bow: true });
    setBowLayersWanted(true);
  }
  return on;
}
