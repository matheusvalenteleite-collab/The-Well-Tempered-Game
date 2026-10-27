/**
 * D336, THE LAB's DYNAMICS in PASSAGE: D335's designs (A · PLACE × STRIKE, B · PEDAL + STRIKE, C · STRIKE
 * ONLY; dynamics.ts) on the player's own notes in real play with the band, the sampled piano only. The
 * game asks (ProtoGame.noteDyn) as each of the player's notes is about to sound: struck, a hammer-on (a
 * strike while the other thumb holds), a pull-off or a press (no strike of their own: their place or
 * pedal level and a neutral strike). The note starts at the level known then; the strike, read from the
 * motion sensor's peak after the landing (by the one calibration, adaptive: dynamics.ts AdaptiveCal),
 * corrects it over MECH.dynRampMs as in FREE PLAY; a landing long enough ago (a thumb that waited for
 * its note) has its strike read already and sounds at the whole level. Each note one line in WHAT
 * HAPPENED. Only the sound: the verdicts, points and events are the game's, with or without it
 * (test/d336-passage-dynamics.test.ts). MECH.dynWait (the attack held for the strike) is FREE PLAY's
 * only: the game's note sounds when it is judged.
 */
import type { NoteDynAnswer, NoteDynAsk } from "../proto-game.ts";
import type { Sounding } from "../../touch/chip.ts";
import { MECH } from "../mechanics.ts";
import { AdaptiveCal, correctionRamp, dynLevel, dynLine, logStrength, Pedal, pianoOnset, signedDb, zoneOf, type DynCal, type DynMode, type Zone } from "./dynamics.ts";

/** The strike's peak after a landing at `ts` (the touch's stamp): answered once read, or `waitMs` on at the latest (null: no samples). */
export type StrikeReader = (ts: number, zone: Zone | undefined, waitMs: number, done: (peak: number | null) => void) => void;

/** What one note's dynamics came to (kept for a test and the run's log). */
export interface NoteDyn {
  midi: number;
  i: number;
  gesture?: string;
  base: number;
  strike: number;
  total: number;
  peak: number | null;
  strength: number | null;
  refs: Pick<DynCal, "soft" | "hard">;
  line: string;
}

export class PassageDynamics {
  readonly pedal = new Pedal(MECH.dynPedalMs);
  readonly notes: NoteDyn[] = [];
  readonly mode: DynMode;
  readonly adapt: AdaptiveCal;
  private readonly read: StrikeReader | null;
  private readonly say: (line: string) => void;
  private readonly name: (midi: number) => string;
  private readonly audioNow: () => number;
  private readonly wall: () => number;

  constructor(o: { mode: DynMode; adapt: AdaptiveCal; read: StrikeReader | null; say: (line: string) => void; name: (midi: number) => string; audioNow: () => number; wall?: () => number }) {
    this.mode = o.mode;
    this.adapt = o.adapt;
    this.read = o.read;
    this.say = o.say;
    this.name = o.name;
    this.audioNow = o.audioNow;
    this.wall = o.wall ?? (() => performance.now());
  }

  /** ProtoGame.noteDyn. */
  ask = (n: NoteDynAsk): NoteDynAnswer | null => {
    const mode = this.mode;
    if (mode === "off") return null;
    const now = this.wall();
    this.pedal.windowMs = MECH.dynPedalMs;
    const c = mode === "place" ? n.land : mode === "pedal" ? this.pedal.add(now, n.land) : 0.5;
    const l0 = dynLevel(mode, c, null);
    const zone = n.across !== undefined ? zoneOf(n.across) : undefined;
    const none = n.gesture === "pull-off" ? "a pull-off: no strike" : n.gesture === "press" ? "a press: no strike" : n.ts === null ? "a key: no strike" : !this.read ? "the motion sensor is off" : undefined;
    const tail = `${zone ? ` · ${zone} zone` : ""} · ${n.side === "left" ? "L" : "R"} thumb${n.gesture ? ` · ${n.gesture.toUpperCase()}` : ""}${n.ok ? "" : " · a wrong note (sounded alike)"}`;
    let sounds: readonly Sounding[] = [];
    let onset = 0;
    const note = (peak: number | null, ms: number, how: string, l = dynLevel(mode, c, null), strength: number | null = null, refs = this.adapt.refs()) => {
      const line = `${dynLine(this.name(n.midi), mode, l, { strength, peak, ms, ...(none ? { none } : {}) })}${none ? "" : ` · refs ${refs.soft.toFixed(2)}/${refs.hard.toFixed(2)}`} · ${how}${tail}`;
      this.notes.push({ midi: n.midi, i: n.i, ...(n.gesture ? { gesture: n.gesture } : {}), base: l.base, strike: l.strike, total: l.total, peak, strength, refs: { soft: refs.soft, hard: refs.hard }, line });
      // After the note's own verdict line (the game reports it just after it sounds).
      void Promise.resolve().then(() => this.say(line));
    };
    if (none || !this.read || n.ts === null) {
      note(null, 0, `struck at ${signedDb(l0.total)}`);
      return { ...pianoOnset(l0.total) };
    }
    const ts = n.ts;
    // The strike read: at once if the landing was long enough ago (sounded at the whole level), else later (corrected).
    let early: { peak: number | null } | null = null;
    let asked = false;
    const strengthOf = (peak: number | null) => {
      const refs = this.adapt.refs();
      const strength = peak === null ? null : logStrength(peak, refs);
      this.adapt.add(peak);
      return { refs, strength, l: dynLevel(mode, c, strength) };
    };
    this.read(ts, zone, MECH.tapWindowMs + 40, (peak) => {
      if (!asked) return void (early = { peak });
      const { refs, strength, l } = strengthOf(peak);
      const d = l.total - l0.total;
      let how: string;
      if (sounds.length && Math.abs(d) > 0.05) {
        const ramp = correctionRamp(this.audioNow(), onset, MECH.dynRampMs);
        const k = 10 ** (d / 20);
        for (const s of sounds) s.trim?.(k, ramp.at, ramp.until);
        how = `struck at ${signedDb(l0.total)}, corrected ${signedDb(d)} over ${MECH.dynRampMs} ms, ${Math.round((ramp.at - onset) * 1000)} ms after the onset`;
      } else how = `struck at ${signedDb(l0.total)}, no correction`;
      note(peak, this.wall() - ts, how, l, strength, refs);
    });
    asked = true;
    if (early) {
      const { peak } = early as { peak: number | null };
      const { refs, strength, l } = strengthOf(peak);
      note(peak, now - ts, `the strike already read (landed ${Math.round(now - ts)} ms before): struck at the whole level`, l, strength, refs);
      return { ...pianoOnset(l.total) };
    }
    return {
      ...pianoOnset(l0.total),
      sounded: (s, at) => {
        sounds = s;
        onset = at;
      },
    };
  };
}
