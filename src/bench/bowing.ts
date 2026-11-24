/**
 * D1055-D1058, THE BOW FROM THE THUMBS (MECH.bow): the glue between a held thumb and its notes' sound, for FREE PLAY (lab/free.ts)
 * and the game (proto-game.ts: THE NEW LAB's PASSAGE, play.html's developer view with NEW MECHANICS on). Each held note's thumb has
 * a BowHand: its moves along its own bar (strength × the bar's width, so the mirrored bars read alike) fed to a bow.ts BowTracker,
 * its colour, bite, bow changes and spiccato sent to the notes it sounds (Sounding.bow), and, at a join, the bow decided from the
 * bow giving way (bow.ts joinOf). Nothing is judged or scored by it. Only STRING CONSORT is bowed (bowedNow): its violin, viola and
 * cello have the pp and ff layers (sampled.ts bowLayers); every other sound, and MECH.bow off, exactly as before.
 */
import { BowTracker, joinOf, outBowOf, type OutBow } from "../touch/bow.ts";
import type { Sounding } from "../touch/chip.ts";
import { preset } from "../touch/sound.ts";
import { MECH } from "./mechanics.ts";

/** The sounds bowed (their instruments have the layers). */
export const BOWED_PRESETS: ReadonlySet<string> = new Set(["stringConsort"]);
/** Whether the player's notes are bowed now (MECH.bow on, a bowed sound). */
export const bowedNow = (): boolean => MECH.bow && BOWED_PRESETS.has(preset().id);

/** One held thumb's bow on the notes it sounds. `say` gets a line for the Lab's feed (the attack, a bow change, a join). */
export class BowHand {
  readonly tr: BowTracker;
  private sent = 0;
  private join: { out: OutBow; done: boolean; at: number; away: -1 | 0 | 1 } | null;
  constructor(tMs: number, pos: number, barPx: number, out: OutBow | null = null) {
    this.tr = new BowTracker(tMs, pos, barPx);
    this.join = null;
    if (out) this.joined(out, tMs);
  }
  /** D1058: this thumb's note joined from `out` at tMs: a moving bow given way to, the join decided once this bow has a way (joinOf). */
  joined(out: OutBow, tMs: number) {
    if (joinOf(out, 0, 0).kind !== "pending") return;
    this.join = { out, done: false, at: tMs, away: this.tr.away };
    this.sent = out.colour;
  }
  /** D1058: whether this note enters as a slur under the note given way to (the bow giving way moving: decided after the landing). */
  get carried(): boolean {
    return this.join !== null;
  }
  /** The colour the note starts at (a carried join, the bow's; else today's). */
  get start(): number {
    return this.join ? this.join.out.colour : 0;
  }
  move(tMs: number, pos: number, sounds: readonly Sounding[], say?: (l: string) => void) {
    this.apply(tMs, this.tr.move(tMs, pos), sounds, say);
  }
  tick(tMs: number, sounds: readonly Sounding[], say?: (l: string) => void) {
    this.apply(tMs, this.tr.tick(tMs), sounds, say);
  }
  private apply(tMs: number, evs: ReturnType<BowTracker["tick"]>, sounds: readonly Sounding[], say?: (l: string) => void) {
    const send = (c: Parameters<NonNullable<Sounding["bow"]>>[0]) => sounds.forEach((s) => s.bow?.(c));
    const j = this.join;
    if (j && !j.done) {
      // (a thumb resting before its join, a prepared one: its way from the join on)
      const r = joinOf(j.out, j.away === 0 ? this.tr.away : this.tr.dir, tMs - j.at);
      if (r.kind === "carry") (j.done = true), say?.("⌒ BOW CARRIED ON: the same way along its bar (a slur)");
      else if (r.kind === "change") (j.done = true), send({ kind: "change", aud: r.aud }), say?.(`⌒ BOW CHANGE at the join: the other way (${r.aud < 0.2 ? "a quick turn, nearly seamless" : r.aud < 1 ? "a short stall" : "a stall: a fresh attack"})`);
    }
    for (const e of evs) {
      if (e.kind === "bite") send({ kind: "bite" }), say?.("⚡ BOW: a flick, a biting attack");
      else if (e.kind === "soft") say?.("BOW: a soft start, swelling in");
      else send({ kind: "change", aud: e.aud }), say?.(`↔ BOW CHANGE on the held note (stall ${e.stallMs} ms${e.aud < 0.2 ? ", nearly seamless" : ""})`);
    }
    const c = this.tr.colour(tMs);
    if (Math.abs(c - this.sent) > 0.01 || (c === 0 && this.sent !== 0)) {
      this.sent = c;
      send({ kind: "colour", c });
    }
  }
  /** At the lift: a flick lifted within SPICC_LIFT_MS ends on the spiccato (true: the notes have ended themselves). */
  lift(tMs: number, sounds: readonly Sounding[], say?: (l: string) => void): boolean {
    if (this.tr.lift(tMs) !== "spicc" || !sounds.some((s) => s.bow)) return false;
    sounds.forEach((s) => s.bow?.({ kind: "spicc" }));
    say?.("• BOW: flick and lift, a spiccato");
    return true;
  }
  /** The bow as it gives way to the next note (for that note's join). */
  out(tMs: number): OutBow | null {
    return outBowOf(this.tr, tMs);
  }
}
