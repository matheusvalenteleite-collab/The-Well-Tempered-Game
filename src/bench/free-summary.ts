/**
 * D327: the player's own ornaments (D314's free ones) counted for the score sheet, without points: "YOU
 * ADDED 3 MORDENTS, 2 TRILLS". Each note counts once, by what its shake became (a short trill that a
 * third leg turned into a trill is a trill).
 */
import { tr } from "../i18n/index.ts";
import type { FreeKind } from "../touch/free-ornament.ts";

export interface FreeTally {
  mordents: number;
  shorts: number;
  trills: number;
}

/** The kinds each note's free ornament ended as → the tally. */
export function freeTally(kinds: Iterable<FreeKind>): FreeTally {
  const t: FreeTally = { mordents: 0, shorts: 0, trills: 0 };
  for (const k of kinds) {
    if (k === "mordent") t.mordents++;
    else if (k === "short") t.shorts++;
    else t.trills++;
  }
  return t;
}

/** The sheet's line ("" when none were added). */
export function freeLine(t: FreeTally | undefined): string {
  if (!t) return "";
  const parts = [
    t.mordents ? tr(t.mordents === 1 ? "{n} MORDENT" : "{n} MORDENTS", { n: t.mordents }) : "",
    t.shorts ? tr(t.shorts === 1 ? "{n} SHORT TRILL" : "{n} SHORT TRILLS", { n: t.shorts }) : "",
    t.trills ? tr(t.trills === 1 ? "{n} TRILL" : "{n} TRILLS", { n: t.trills }) : "",
  ].filter(Boolean);
  return parts.length ? tr("YOU ADDED {list}", { list: parts.join(", ") }) : "";
}
