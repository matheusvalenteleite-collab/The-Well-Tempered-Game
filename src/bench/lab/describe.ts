/**
 * D317, THE LAB: each engine event as one plain line, with its reason and numbers:
 *   b3.2 ♩ G4 RIGHT · +34 ms · R thumb up 34 px from its last touch (a step: ≤ 18 px the wrong way allowed)
 *   b3.3 ⌒ LEGATO ✓ other thumb still down
 *   b3.4 ⌒ NOT JOINED: gap 85 ms > 62 ms allowed
 * Shared by the lab's feed and the node replay.
 */
import type { LabEvent, LadderWhy, LegatoWhy } from "./events.ts";
import { pitchName, where } from "./replay.ts";

const px = (n: number) => `${Math.round(Math.abs(n))} px`;
const ms = (n: number) => `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n))} ms`;
const thumb = (s: string) => (s === "left" ? "L thumb" : "R thumb");
const way = (n: number) => (Math.abs(n) < 0.5 ? "level" : n > 0 ? "up" : "down");

/** What LADDER measured: "up 34 px from its last touch (a step: ≤ 18 px the wrong way allowed)". */
export function ladderLine(w: LadderWhy | undefined): string {
  if (!w) return "";
  if (w.ref === "free") return `free: ${w.freeWhy === "first note" ? "the first note" : w.freeWhy === "first touch" ? "this thumb's first touch" : w.freeWhy === "moved since" ? "the thumb travelled since its last note" : "its last touch too long ago"}`;
  const moved = w.movedPx ?? 0;
  const tune = w.steps === 0 ? "a repeat" : `the tune ${w.steps! > 0 ? "up" : "down"} ${interval(w.steps!)}`;
  let rule = "";
  if (w.rule === "repeat") rule = `needs within ${px(w.needPx ?? 0)}`;
  else if (w.rule === "step") rule = `≤ ${px(w.needPx ?? 0)} the wrong way allowed`;
  else if (w.rule === "leap") rule = `needs ≥ ${px(w.needPx ?? 0)} ${w.steps! > 0 ? "up" : "down"}`;
  else if (w.rule === "edge") rule = "at the bar's end: may stay";
  let s = `${way(moved)} ${moved ? px(moved) + " " : ""}from its last touch (${tune}; ${rule})`;
  if (w.travel) {
    const up = w.travel.steps > 0 ? "up" : "down";
    s += ` · line travel: the tune ${up} ${interval(w.travel.steps)} from an earlier touch, the thumb ${way(w.travel.movedPx)} ${px(w.travel.movedPx)} (needs ≥ ${px(w.travel.needPx)} ${up})${w.travel.ok ? "" : " ✕"}`;
  }
  return s;
}
const INTERVALS = ["a unison", "a step", "a third", "a fourth", "a fifth", "a sixth", "a seventh", "an octave"];
/** Staff steps as an interval ("a third"). */
export function interval(steps: number): string {
  const n = Math.abs(steps);
  return INTERVALS[n] ?? `${n + 1} steps`;
}

/** How the join went: "LEGATO ✓ other thumb still down", "NOT JOINED: gap 85 ms > 62 ms allowed". */
export function legatoLine(l: LegatoWhy | undefined, ok: boolean): string {
  if (!l || !l.judged || !ok) return "";
  if (l.ok) return l.holding ? "⌒ LEGATO ✓ other thumb still down" : `⌒ LEGATO ✓ handover, gap ${Math.round(l.gapMs ?? 0)} ms ≤ ${Math.round(l.allowedMs ?? 0)} ms`;
  if (!l.holding && l.gapMs !== undefined && l.allowedMs !== undefined && l.gapMs > l.allowedMs) return `⌒ NOT JOINED: gap ${Math.round(l.gapMs)} ms > ${Math.round(l.allowedMs)} ms allowed`;
  if (l.prevRight === false || l.holding || (l.gapMs !== undefined && l.allowedMs !== undefined && l.gapMs <= l.allowedMs)) return "⌒ NOT JOINED: the note before was not right";
  return "⌒ NOT JOINED: the note before was not let go (or not by this voice)";
}

/** One line per event (two for a note judged for its join). */
export function describe(piece: string, e: LabEvent): string[] {
  const at = where(piece, e.tick);
  switch (e.kind) {
    case "note": {
      const name = pitchName(piece, e.midi);
      const verdict = e.ok ? (e.slide ? "RIGHT (slid)" : e.perfect ? "RIGHT · PERFECT" : "RIGHT · GOOD") : `WRONG${e.why && e.why !== "gesture" ? ` (${e.why})` : ""}`;
      const lane = e.lane ? ` · ${e.lane === "exact" ? "its lane" : "direction only"}` : "";
      const lad = ladderLine(e.ladder);
      const out = [`${at} ♩ ${name} ${verdict} · ${ms(e.offMs)} · ${thumb(e.side)}${lad ? ` ${lad}` : ""}${lane}`];
      const lg = legatoLine(e.legato, e.ok);
      if (lg) out.push(`${at} ${lg}`);
      return out;
    }
    case "stray": {
      const n = e.near;
      return [`${at} ✕ STRAY · ${thumb(e.side)} · no note to take${n ? `; nearest ${pitchName(piece, n.midi)} ${ms(n.offMs)}${n.taken ? ` (already ${n.taken})` : ""}` : ""}`];
    }
    case "double":
      return [`${at} · DOUBLE contact ignored (${thumb(e.side)})`];
    case "miss":
      return [`${at} ○ ${pitchName(piece, e.midi)} MISSED (no touch in its window)`];
    case "slide":
      return [`${at} ↕ SLIDE fired: ${e.side} thumb moved ${px(e.movedPx)} ${way(e.movedPx)} while held`];
    case "shake":
      return [`${at} ~ SHAKE: ${e.ornament}${e.free ? " (free ornament)" : " ✓"}`];
    case "cancel":
      return [`${at} ! IOS CANCEL · ${thumb(e.side)} · ${e.mode === "lift" ? "judged as a lift" : e.ringsOn ? "rings on (another thumb down)" : "stopped there"}`];
    case "release":
      return [`${at} ${e.word} · held ${Math.round(e.heldMs)} of ${Math.round(e.lenMs)} ms`];
  }
}
