/**
 * D317, THE LAB: each engine event as one plain line, with its reason and numbers:
 *   b3.2 ♩ G4 RIGHT · +34 ms · R thumb up 34 px from its last touch (a step: ≤ 18 px the wrong way allowed)
 *   b3.3 ⌒ LEGATO ✓ other thumb still down
 *   b3.4 ⌒ NOT JOINED: gap 85 ms > 62 ms allowed
 * Shared by the lab's feed and the node replay.
 */
import type { LabEvent, LadderWhy, LegatoWhy } from "./events.ts";
import { pitchName, where } from "./replay.ts";
import { dragLine } from "../drag.ts";

const px = (n: number) => `${Math.round(Math.abs(n))} px`;
const ms = (n: number) => `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n))} ms`;
const thumb = (s: string) => (s === "left" ? "L thumb" : "R thumb");
const way = (n: number) => (Math.abs(n) < 0.5 ? "level" : n > 0 ? "up" : "down");

/** What LADDER measured: "up 34 px from its last touch (a step: ≤ 18 px the wrong way allowed)". */
export function ladderLine(w: LadderWhy | undefined): string {
  if (!w) return "";
  if (w.ref === "free") return `free: ${w.freeWhy === "first note" ? "the first note" : w.freeWhy === "first touch" ? "this thumb's first touch" : w.freeWhy === "moved since" ? "the thumb travelled since its last note" : "its last touch too long ago"}`;
  const moved = w.movedPx ?? 0;
  // D332: under the run rule (RUNS "lenient"): the run's way from either thumb's last touch, no line travel.
  if (w.run && w.run.from !== "strict") {
    const runWay = w.run.dir > 0 ? "up" : "down";
    const ref = w.run.from === "other" ? "the other thumb's last touch" : "its last touch";
    const verdict = w.run.from === "none" ? "neither thumb's last touch allows it" : `from ${ref}`;
    return `RUN RULE (a fast run ${runWay}; the strict rule refused it): ${way(moved)} ${moved ? px(moved) + " " : ""}${verdict} (≤ ${px(w.needPx ?? 0)} against the run allowed, from either thumb; no line travel; stands only if the run's trend holds)`;
  }
  const tune = w.steps === 0 ? "a repeat" : `the tune ${w.steps! > 0 ? "up" : "down"} ${interval(w.steps!)}`;
  let rule = "";
  if (w.rule === "repeat") rule = `needs within ${px(w.needPx ?? 0)}`;
  else if (w.rule === "step") rule = `≤ ${px(w.needPx ?? 0)} the wrong way allowed`;
  else if (w.rule === "leap") rule = `needs ≥ ${px(w.needPx ?? 0)} ${w.steps! > 0 ? "up" : "down"}`;
  else if (w.rule === "edge") rule = "at the bar's end: may stay";
  let s = `${way(moved)} ${moved ? px(moved) + " " : ""}from ${w.ref === "held" ? "the note the other thumb holds" : "its last touch"} (${tune}; ${rule})`;
  if (w.travel) {
    const up = w.travel.steps > 0 ? "up" : "down";
    s += ` · line travel: the tune ${up} ${interval(w.travel.steps)} from an earlier touch, the thumb ${way(w.travel.movedPx)} ${px(w.travel.movedPx)} (needs ≥ ${px(w.travel.needPx)} ${up})${w.travel.ok ? "" : " ✕"}`;
  }
  if (w.run?.from === "strict") s += " · in a run (the strict rule passed it)";
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
  if (l.ok && l.drag) return "⌒ JOINED by the drag (connect: the chain kept, no bonus)";
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
      const gest = e.gesture ? ` · ${e.gesture.toUpperCase()}` : "";
      const out = [`${at} ♩ ${name} ${verdict}${gest} · ${ms(e.offMs)} · ${thumb(e.side)}${lad ? ` ${lad}` : ""}${lane}`];
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
    case "drag": {
      const name = (m: number) => pitchName(piece, m);
      const took = e.dragMs !== undefined ? ` · the drag took ${Math.round(e.dragMs)} ms` : "";
      if (e.how === "glide") return [`${at} ↝ ${dragLine(name, e.from, e.to, { glideMs: e.ms ?? 0 })}${took}`];
      // D426: the lute's left-hand slur (no pluck), its glissando over a fourth or more.
      if (e.how === "slur" || e.how === "gliss") return [`${at} ↝ DRAG: lute ${e.how === "gliss" ? "glissando" : "slur"}, no pluck (${name(e.from)} → ${name(e.to)})${took}`];
      return [`${at} ↝ ${dragLine(name, e.from, e.to, { fill: { kind: e.how, notes: e.fill ?? [] } })}${took}`];
    }
    case "shake":
      // D319: the player's trill settled on its main note (the shaking stopped).
      if (e.ornament.startsWith("settled")) return [`${at} ~ TRILL SETTLED on the main note (${e.ornament.slice(9)})`];
      return [`${at} ~ SHAKE: ${e.ornament}${e.free ? " (free ornament)" : " ✓"}`];
    case "cancel":
      return [`${at} ! IOS CANCEL · ${thumb(e.side)} · ${e.mode === "lift" ? "judged as a lift" : e.ringsOn ? "rings on (another thumb down)" : "stopped there"}`];
    case "wait":
      return [`${at} … SLUR: ${thumb(e.side)} down ${Math.round(e.earlyMs)} ms early, waits for its note while the other holds`];
    case "prep":
      return [prepLine(at, pitchName(piece, e.midi), e, e.grace !== undefined ? pitchName(piece, e.grace) : null)];
    case "takeover":
      return [`${at} ⌒ TAKEN OVER: ${thumb(e.side)} landed on the note the other thumb had just taken (its drift's slide, or landing early): this one plays it`];
    case "run":
      // D332: the run's trend at its last note (the notes stay as judged; no score).
      return [`${at} ${e.ok ? "RUN ✓" : "RUN ✗"} · ${e.notes} notes ${e.dir > 0 ? "up" : "down"}: the landings ${e.touches < 3 ? `too few (${e.touches})` : `travel ${e.travelPx >= 0 ? "the run's way" : "against it"} ${Math.abs(e.travelPx)} px over ${e.touches} touches (fitted; needs ${e.needPx}–${e.maxPx} px)`}${e.ok ? "" : ": its RUN RULE notes re-judged WRONG"}`];
    case "revoked":
      return [`${at} ✕ ${pitchName(piece, e.midi)} RE-JUDGED WRONG (RUN ✗: it was right only by the run rule) · ${thumb(e.side)} · −${Math.round(e.pts)} pts`];
    case "release":
      return [`${at} ${e.word} · held ${Math.round(e.heldMs)} of ${Math.round(e.lenMs)} ms`];
    case "band":
      return [bandLine(at, e)];
  }
}

/** D334 (B+): "b3.2 … PREPARED F5 · R thumb rests 340 ms early while the other holds (armed: sounds on its lift)". */
function prepLine(at: string, name: string, e: Extract<LabEvent, { kind: "prep" }>, g: string | null = null): string {
  const n = (x?: number) => Math.round(x ?? 0);
  switch (e.what) {
    case "rest":
      return `${at} … PREPARED ${name} · ${thumb(e.side)} rests ${n(e.earlyMs)} ms early while the other holds (armed: sounds when the other lifts)`;
    case "pull-off":
      return `${at} ⌒ PULL-OFF ${name} · the other thumb lifted: sounded now`;
    case "press":
      return `${at} ⌒ PRESS ${name} · moved ${n(e.px)} px down/in: sounded now${e.holding ? ", the other still down (over-legato)" : ""}`;
    case "early-lift":
      return `${at} … PREPARED ${name} · the other thumb lifted ${n(e.earlyMs)} ms before its window: not sounded (still resting)`;
    case "early-press":
      return `${at} … PREPARED ${name} · pressed ${n(e.earlyMs)} ms before its window: not sounded (press again)`;
    case "let-go":
      return `${at} … PREPARED ${name} · let go unsounded`;
    case "overlap":
      return `${at} ⌒ OVER-LEGATO ${n(e.ms)} ms (${name} pressed while the other held)`;
    // D364 (the report's WHAT HAPPENED line): "♪ APPOGGIATURA D5 → C5 · held 410 ms (0.53 of the note)".
    case "hold-over":
      return `${at} … HOLD-OVER ${g ? `${g} → ` : ""}${name} · the note before held past the beat: the lift resolves it`;
    case "appoggiatura":
      return `${at} ♪ APPOGGIATURA ${g ? `${g} → ` : ""}${name} · held ${n(e.ms)} ms (${(e.share ?? 0).toFixed(2)} of the note)${e.short ? ", short" : ""}`;
  }
}

const WAIT_AT ={ cadence: "at the cadence", final: "at the final chord", breath: "after your breath" } as const;
/** D328: "b11.1 ⏸ BAND WAITED 230 ms at the cadence", "b12.3 ♩ BAND TEMPO 97% (60 ms behind the written time)". */
export function bandLine(at: string, e: Extract<LabEvent, { kind: "band" }>): string {
  if (e.what === "wait") return `${at} ⏸ BAND WAITED ${Math.round(e.ms)} ms ${WAIT_AT[e.at]}${e.expired ? " (the most: went on without you)" : ""}`;
  const d = Math.round(e.driftMs);
  return `${at} ♩ BAND TEMPO ${e.pct}%${Math.abs(d) >= 5 ? ` (${Math.abs(d)} ms ${d > 0 ? "behind" : "ahead of"} the written time)` : ""}`;
}
