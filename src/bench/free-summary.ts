/**
 * D327: the player's own ornaments (D314's free ones) counted for the score sheet, without points: "YOU
 * ADDED 3 MORDENTS, 2 TRILLS". Each note counts once, by what its shake became (a short trill that a
 * third leg turned into a trill is a trill). D353: read from the game's performed ornaments (the map
 * the box's overlay draws), the up-down forms named as the music named them (Pralltriller, Schneller,
 * short trill) and the turn.
 */
import { tr } from "../i18n/index.ts";
import type { FreeKind } from "../touch/free-ornament.ts";

export interface FreeTally {
  mordents: number;
  shorts: number;
  trills: number;
  pralltrillers?: number;
  schnellers?: number;
  turns?: number;
  /** D364: the hold-over's appoggiaturas. */
  appoggiaturas?: number;
}

/** The kinds each note's free ornament ended as → the tally. */
export function freeTally(kinds: Iterable<FreeKind>): FreeTally {
  const t: FreeTally = { mordents: 0, shorts: 0, trills: 0, pralltrillers: 0, schnellers: 0, turns: 0 };
  for (const k of kinds) {
    if (k === "mordent") t.mordents++;
    else if (k === "short") t.shorts++;
    else if (k === "pralltriller") t.pralltrillers!++;
    else if (k === "schneller") t.schnellers!++;
    else if (k === "turn") t.turns!++;
    else if (k === "appoggiatura") t.appoggiaturas = (t.appoggiaturas ?? 0) + 1;
    else t.trills++;
  }
  return t;
}

/** The sheet's line ("" when none were added). */
export function freeLine(t: FreeTally | undefined): string {
  if (!t) return "";
  const one = (n: number | undefined, sing: string, plur: string) => (n ? tr(n === 1 ? sing : plur, { n }) : "");
  const parts = [
    one(t.mordents, "{n} MORDENT", "{n} MORDENTS"),
    one(t.pralltrillers, "{n} PRALLTRILLER", "{n} PRALLTRILLERS"),
    one(t.schnellers, "{n} SCHNELLER", "{n} SCHNELLERS"),
    one(t.shorts, "{n} SHORT TRILL", "{n} SHORT TRILLS"),
    one(t.trills, "{n} TRILL", "{n} TRILLS"),
    one(t.turns, "{n} TURN", "{n} TURNS"),
    one(t.appoggiaturas, "{n} APPOGGIATURA", "{n} APPOGGIATURAS"),
  ].filter(Boolean);
  return parts.length ? tr("YOU ADDED {list}", { list: parts.join(", ") }) : "";
}
