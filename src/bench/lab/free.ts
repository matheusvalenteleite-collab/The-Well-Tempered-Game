/**
 * D320, THE LAB's FREE PLAY (the owner: "a free playing mode … where one gets to play freely one's
 * selected instrument. Just for easy testing of freedom of expression. Pitches assigned via vertical
 * axis of course"). No score to follow: the two thumb bars play the sound chosen, the pitch the row
 * under the thumb (the fugue's key, or every semitone, over one to three octaves round the middle of
 * the voice's range, high at the top), each touch striking the pitch under it. Every gesture the game
 * has works as it does there, through the same code and the same MECH parameters:
 *   - D311/D315, ACROSS: where the thumb lands across its bar shapes the attack (Play.touch, protos.ts
 *     barDynamic: strength by STRONG_SIDE); moving sideways while it holds, the sustain (touch-expr.ts
 *     holdValue → Sounding.shape). MECH.expression off: every attack the middle.
 *   - SLIDES: a held thumb moved into another row (at least MECH.slideMinPx and half a row) glides there
 *     (Sounding.glide; a new joined note where the sound cannot glide). MECH.slides off: no slides.
 *   - SHAKES (free-ornament.ts feedShake, MECH.shake*): down and back a mordent, up and back a short
 *     trill, a third leg a trill from the note above (ornament-play.ts freeOrnamentParts, on the key's
 *     neighbours), D319: going on while the legs keep coming, settling on the note MECH.trillStopMs after
 *     they stop (MECH.trillFollowsShake; off: two beats of trill). MECH.freeOrnaments off: none.
 *   - JOINED: a thumb landing while the other still holds takes over without a new attack (the held
 *     note gives way, Play.legato), as in the game; D318: a handover within MECH.legatoGapMs of a lift
 *     sounds joined too (MECH.joinedSound); a touch on the half whose thumb is down, the other half
 *     free, is the other thumb (MECH.thumbCross); a contact within MECH.sameThumbPx of a thumb still
 *     down is that thumb rolling, ignored (proto-game.ts thumbSide, rollOf).
 * Each event a plain line for the lab's feed (WHAT HAPPENED), as the game's are. Nothing is judged,
 * scored or logged for replay. The clock is the audio clock: ticks = seconds × tps at the tempo chosen
 * (the ornaments' speed and the metronome's beat).
 */
import { voicing, type Chip, type Play, type Sounding } from "../../touch/chip.ts";
import { beatOf, type TouchFugue } from "../../touch/fugue.ts";
import { feedShake, shakeTracker, type FreeKind, type ShakeTracker } from "../../touch/free-ornament.ts";
import { freeOrnamentParts } from "../../touch/ornament-play.ts";
import { holdValue, STRONG_SIDE, TOUCH_NEUTRAL } from "../../touch/touch-expr.ts";
import type { Side } from "../../touch/thumbs.ts";
import { MECH } from "../mechanics.ts";
import { BAR, barAcross, barDynamic, dynamic } from "../protos.ts";
import { pitchName } from "./replay.ts";

export type FreeScale = "key" | "chromatic";

/** How long a held note may ring (s), as the game's HOLD_MAX. */
const HOLD_MAX = 8;
/** The trill's notes sounded this far ahead of the clock (s), as the game's TRILL_AHEAD_S. */
const TRILL_AHEAD_S = 0.06;
/**
 * A slide waits until the thumb has stayed this long in the new row (ms): a shake's legs pass through
 * the rows faster (FREE PLAY's own: the game slides only onto the score's next note, so it needs none).
 */
export const SLIDE_DWELL_MS = 90;
/** The rows' margin at the top and the foot of the play area (px). */
const MARGIN = 10;
/** A note shown in the roll between the bars for this long (s). */
const ROLL_S = 5;

const PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** The key's tonic (pitch class) and mode ("c" C minor, "Eb" E flat major). */
export function keyOf(key: string): { tonic: number; minor: boolean } {
  let pc = PC[key[0].toLowerCase()] ?? 0;
  if (key[1] === "#") pc++;
  if (key[1] === "b") pc--;
  return { tonic: (pc + 12) % 12, minor: key[0] === key[0].toLowerCase() };
}

/** The rows' pitches, low to high: the key's scale (natural minor in a minor key: its signature) or every semitone, `octaves` round the middle of the voice's range. */
export function freeRows(f: TouchFugue, voice: number, scale: FreeScale, octaves: number): number[] {
  const ns = f.voices[voice] ?? f.voices[0];
  const lo = Math.min(...ns.map((n) => n[2]));
  const hi = Math.max(...ns.map((n) => n[2]));
  const mid = Math.round((lo + hi) / 2);
  const half = Math.round((octaves * 12) / 2);
  const { tonic, minor } = keyOf(f.key);
  const deg = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const inKey = new Set(deg.map((d) => (tonic + d) % 12));
  const out: number[] = [];
  for (let m = mid - half; m <= mid + half; m++) if (scale === "chromatic" || inKey.has(((m % 12) + 12) % 12)) out.push(m);
  return out;
}

interface Held {
  side: Side;
  /** The row (index into rows) sounding, and its pitch. */
  row: number;
  midi: number;
  /** Where it landed (strength 0..1) and where the pitch was last set (y, for slides). */
  land: number;
  ax: number;
  ay: number;
  setY: number;
  at: number;
  sounds: Sounding[];
  v: ReturnType<typeof voicing>;
  play: Play;
  /** The sustain values it went through (for the lift's line). */
  sMin: number;
  sMax: number;
  sNow: number;
  shapes: number;
  shake: ShakeTracker;
  /** A trill under way (D319): its notes, the next to sound, the tick of the latest leg. */
  trill?: { parts: [number, number, number][]; next: number; last: number; settled: boolean; live: { sd: Sounding; end: number }[] };
  ornament?: FreeKind;
  pts: number;
  /** The other thumb took over (joined): this one only holds, silent. */
  passive?: boolean;
  /** A slide waiting its dwell (the row reached, since when, where), and the latest shake leg's time (ms). */
  pend?: { row: number; since: number; x: number; y: number };
  lastLeg: number;
  /** Where the thumb is now (D318's rolling contact is measured from it). */
  cx: number;
  cy: number;
}

export interface FreeOptions {
  scale: FreeScale;
  octaves: number;
  bpm: number;
  click: boolean;
}

export class FreePlay {
  readonly rows: number[];
  readonly tps: number;
  private held = new Map<number, Held>();
  private lastLift: { side: Side; at: number; midi: number } | null = null;
  private nextClick = 0;
  private beatS: number;
  private perBar: number;
  private beatN = 0;
  private t0: number;
  /** The notes played (for the roll between the bars): pitch row, start and end (audio s), thumb. */
  private played: { row: number; on: number; off?: number; side: Side; id: number }[] = [];
  private h = 0;
  /** Contacts taken for a thumb rolling (D318): ignored to their lift. */
  private rolls = new Set<number>();
  /** For a test driving the page: the lines so far. */
  lines = 0;

  readonly f: TouchFugue;
  readonly voice: number;
  readonly chip: Chip;
  readonly o: FreeOptions;
  private readonly line: (text: string) => void;

  constructor(f: TouchFugue, voice: number, chip: Chip, o: FreeOptions, line: (text: string) => void) {
    this.f = f;
    this.voice = voice;
    this.chip = chip;
    this.o = o;
    this.line = line;
    this.rows = freeRows(f, voice, o.scale, o.octaves);
    this.tps = (f.tpq * o.bpm) / 60;
    const b = beatOf(f);
    this.beatS = b.ticks / this.tps;
    this.perBar = b.perBar;
    this.t0 = chip.ctx.currentTime;
    this.nextClick = this.t0 + 0.1;
  }

  /** The rows' geometry in a play area `h` px high: each row's middle (px), and its height. */
  rowH(h = this.h): number {
    return Math.max(4, (h - 2 * MARGIN) / this.rows.length);
  }
  yOf(row: number, h = this.h): number {
    return MARGIN + (this.rows.length - 1 - row + 0.5) * this.rowH(h);
  }
  rowAt(y: number, h = this.h): number {
    const r = this.rows.length - 1 - Math.floor((y - MARGIN) / this.rowH(h));
    return Math.max(0, Math.min(this.rows.length - 1, r));
  }
  private tick(): number {
    return this.chip.ctx.currentTime * this.tps;
  }
  private stamp(): string {
    return `${(this.chip.ctx.currentTime - this.t0).toFixed(1)}s`;
  }
  private say(text: string) {
    this.lines++;
    this.line(`${this.stamp()} ${text}`);
  }
  name(midi: number): string {
    return pitchName(this.f.id, midi);
  }

  /** D318 (proto-game.ts rollOf): a contact landing on a thumb still down (within MECH.sameThumbPx of where it is now) is that thumb rolling. */
  private rollOf(x: number, y: number): boolean {
    for (const o of this.held.values()) if (Math.abs(o.cy - y) <= MECH.sameThumbPx && Math.abs(o.cx - x) <= MECH.sameThumbPx) return true;
    return false;
  }
  /** D318 (proto-game.ts thumbSide, MECH.thumbCross): a touch on the half whose thumb is down while the other half has none is the other thumb. */
  private thumbSide(side: Side): Side {
    if (!MECH.thumbCross) return side;
    const sides = [...this.held.values()].map((o) => o.side);
    return sides.length && sides.every((s) => s === side) ? (side === "left" ? "right" : "left") : side;
  }

  down(id: number, half: Side, x: number, y: number, w: number, h: number, ts: number) {
    this.h = h;
    const now = this.chip.ctx.currentTime;
    // D318: a thumb rolling onto a second contact: its own, ignored (the game's double contact).
    if (this.rollOf(x, y)) {
      this.rolls.add(id);
      return this.say(`· DOUBLE contact ignored (a thumb still down within ${MECH.sameThumbPx} px: rolling)`);
    }
    const side = this.thumbSide(half);
    const row = this.rowAt(y);
    const midi = this.rows[row];
    const across = barAcross(x, w);
    const strength = barDynamic(x, w);
    const land = MECH.expression ? strength : TOUCH_NEUTRAL;
    // Joined: the other thumb still holds: it gives way, this one comes in without a new attack.
    let joined = false;
    for (const [hid, o] of this.held) {
      if (hid === id) continue;
      if (o.passive) continue;
      joined = true;
      o.passive = true;
      for (const sd of o.sounds) sd.stop(now + 0.03);
      o.sounds = [];
      if (o.trill) o.trill.settled = true;
    }
    // D318 (MECH.joinedSound): a handover within the legato gap sounds joined too (no fresh attack).
    const gap = this.lastLift ? (now - this.lastLift.at) * 1000 : Infinity;
    const handover = !joined && gap <= MECH.legatoGapMs;
    const v = voicing(this.voice, this.f.voices.length, true);
    const play: Play = { ...dynamic(0.5), lead: true, envelope: "synth", touch: land, legato: joined || (handover && MECH.joinedSound) };
    const sounds = [this.chip.note(midi, now, HOLD_MAX, v, play)];
    this.held.set(id, { side, row, midi, land, ax: x, ay: y, setY: y, at: now, sounds, v, play: { ...play, legato: true }, sMin: 0, sMax: 0, sNow: 0, shapes: 0, shake: shakeTracker(y, x, ts), pts: 1, lastLeg: -Infinity, cx: x, cy: y });
    this.played.push({ row, on: now, side, id });
    if (this.played.length > 200) this.played.splice(0, this.played.length - 200);
    const th = `${side === "left" ? "L thumb" : "R thumb"}${side !== half ? " (crossed: landed on the other half, D318)" : ""}`;
    const strong = STRONG_SIDE === "outer" ? "outer" : "inner";
    let join = "";
    if (joined) join = " · ⌒ JOINED: other thumb still down (no new attack)";
    else if (handover) join = ` · ⌒ JOINED by handover: gap ${Math.round(gap)} ms ≤ ${MECH.legatoGapMs} ms${MECH.joinedSound ? " (joined sound)" : " (a new attack: joined sound off)"}`;
    else if (gap < 1500) join = ` · NOT JOINED: gap ${Math.round(gap)} ms > ${MECH.legatoGapMs} ms`;
    this.say(`♩ ${this.name(midi)} · ${th} · across ${across.toFixed(2)} (0 by the box, 1 the edge) · strength ${strength.toFixed(2)} (strong ${strong})${MECH.expression ? "" : " · expression off: attack at the middle"}${join}`);
  }

  move(id: number, x: number, y: number, w: number, h: number, ts: number) {
    const hd = this.held.get(id);
    if (!hd) return;
    hd.cx = x;
    hd.cy = y;
    if (hd.passive) return;
    this.h = h;
    hd.pts++;
    // D311: the sustain, sideways from where it landed.
    if (MECH.expression) {
      const sv = holdValue(barDynamic(x, w) - hd.land);
      if (Math.abs(sv - hd.sNow) > 0.05) {
        hd.sNow = sv;
        hd.shapes++;
        hd.sMin = Math.min(hd.sMin, sv);
        hd.sMax = Math.max(hd.sMax, sv);
        for (const s of hd.sounds) s.shape?.(sv);
        for (const l of hd.trill?.live ?? []) l.sd.shape?.(sv);
      }
    }
    const t = this.tick();
    // D314/D319: a shake along the bar: a free ornament; once begun, no slides.
    if (MECH.freeOrnaments) {
      const legs = hd.shake.count;
      const kind = feedShake(hd.shake, x, y, ts, Math.max(MECH.shakeReachMinPx, this.rowH() * MECH.shakeReachRows));
      if (hd.shake.count > legs) (hd.lastLeg = ts), hd.shake.count >= 2 && (hd.pend = undefined);
      if (kind) return this.ornament(hd, kind, t);
      if (hd.shake.count > legs && hd.trill && !hd.trill.settled) hd.trill.last = Math.max(hd.trill.last, t);
      if (hd.shake.kind) return;
    }
    // A slide: the held thumb travelled into another row and stayed there a moment (SLIDE_DWELL_MS: a
    // shake's legs pass through the rows faster), not while a shake's legs are coming (two or more).
    if (!MECH.slides || hd.trill || hd.ornament) return;
    const row = this.rowAt(y);
    if (row === hd.row || Math.abs(y - hd.setY) < Math.max(MECH.slideMinPx, this.rowH() * 0.5)) return void (hd.pend = undefined);
    if (hd.pend?.row !== row) hd.pend = { row, since: ts, x, y };
    else (hd.pend.x = x), (hd.pend.y = y);
    this.trySlide(id, hd, ts);
  }

  /** A slide waiting its dwell: taken once the thumb has stayed in the new row SLIDE_DWELL_MS, no shake leg meanwhile. */
  private trySlide(id: number, hd: Held, ts: number) {
    const p = hd.pend;
    if (!p || ts - p.since < SLIDE_DWELL_MS || (hd.shake.count >= 2 && ts - hd.lastLeg < MECH.shakeWindowMs) || hd.shake.kind) return;
    hd.pend = undefined;
    const { row, x, y } = p;
    const from = hd.midi;
    const midi = this.rows[row];
    const now = this.chip.ctx.currentTime;
    const one = hd.sounds.length === 1 ? hd.sounds[0] : null;
    if (one?.glide) one.glide(midi);
    else {
      for (const s of hd.sounds) s.stop(now + 0.02);
      hd.sounds = [this.chip.note(midi, now, HOLD_MAX, hd.v, hd.play)];
    }
    const last = [...this.played].reverse().find((q) => q.id === id && q.off === undefined);
    if (last) last.off = now;
    this.played.push({ row, on: now, side: hd.side, id });
    this.say(`↕ SLIDE ${this.name(from)} → ${this.name(midi)} (${hd.side === "left" ? "L" : "R"} thumb moved ${Math.round(Math.abs(y - hd.setY))} px ${y < hd.setY ? "up" : "down"} while held)${one?.glide ? "" : " · this sound cannot glide: a new joined note"}`);
    hd.row = row;
    hd.midi = midi;
    hd.setY = y;
    hd.shake = shakeTracker(y, x, ts);
  }

  /** D314: a shake became an ornament: its notes from now, on the key's neighbours; a trill (D319) goes on while the shake does. */
  private ornament(hd: Held, kind: FreeKind, t: number) {
    const long = MECH.trillFollowsShake ? HOLD_MAX * this.tps : 2 * this.beatS * this.tps;
    const parts = freeOrnamentParts(this.f, kind, -1, hd.midi, t, t + (kind === "trill" ? long : HOLD_MAX * this.tps), this.o.bpm);
    if (!parts.length) return;
    const now = this.chip.ctx.currentTime;
    for (const s of hd.sounds) s.stop(now + 0.02);
    hd.sounds = [];
    hd.ornament = kind;
    if (kind === "trill") {
      hd.trill = { parts, next: 0, last: t, settled: false, live: [] };
      this.trillStep(hd, t);
    } else
      hd.sounds = parts.map(([pon, pdur, pm], k) => {
        const at = now + Math.max(0, (pon - t) / this.tps);
        const last = k === parts.length - 1;
        return this.chip.note(pm, at, last ? HOLD_MAX : Math.max(0.03, pdur / this.tps), hd.v, hd.play);
      });
    const notes = kind === "trill" ? "" : ` (${parts.map((p) => this.name(p[2])).join(" ")})`;
    this.say(`~ SHAKE: ${kind === "mordent" ? "mordent (down and back)" : kind === "short" ? "short trill (up and back)" : `trill from ${this.name(parts[0][2])} (a third leg)${MECH.trillFollowsShake ? ", on while you shake" : ", two beats"}`} on ${this.name(hd.midi)}${notes}`);
  }

  private trillStep(hd: Held, now: number) {
    const r = hd.trill!;
    const t0 = this.chip.ctx.currentTime;
    const audioAt = (tick: number) => t0 + Math.max(0, (tick - now) / this.tps);
    const keep = (sd: Sounding, end: number) => {
      r.live = r.live.filter((x) => x.end > t0);
      r.live.push({ sd, end });
      hd.sounds = r.live.map((x) => x.sd);
    };
    if (r.next < r.parts.length && MECH.trillFollowsShake && now - r.last > (MECH.trillStopMs / 1000) * this.tps) {
      const prev = r.parts[r.next - 1];
      const from = prev ? Math.max(now, prev[0] + prev[1]) : now;
      const at = audioAt(from);
      keep(this.chip.note(hd.midi, at, HOLD_MAX, hd.v, hd.play), at + HOLD_MAX);
      this.say(`~ TRILL SETTLED on ${this.name(hd.midi)} after ${r.next} trill notes (no leg for ${MECH.trillStopMs} ms)`);
      r.next = r.parts.length;
      r.settled = true;
      return;
    }
    const ahead = now + TRILL_AHEAD_S * this.tps;
    while (r.next < r.parts.length && r.parts[r.next][0] <= ahead) {
      const [pon, pdur, pm] = r.parts[r.next];
      const last = r.next === r.parts.length - 1;
      const at = audioAt(pon);
      const len = last ? HOLD_MAX : Math.max(0.03, pdur / this.tps);
      keep(this.chip.note(pm, at, len, hd.v, hd.play), at + len);
      r.next++;
    }
    if (r.next >= r.parts.length) r.settled = true;
  }

  up(id: number, _ts: number, cancelled: boolean) {
    if (this.rolls.delete(id)) return;
    const hd = this.held.get(id);
    if (!hd) return;
    this.held.delete(id);
    const now = this.chip.ctx.currentTime;
    for (const s of hd.sounds) s.stop(now);
    if (hd.trill) hd.trill.settled = true;
    const p = [...this.played].reverse().find((q) => q.id === id && q.off === undefined);
    if (p) p.off = now;
    this.lastLift = { side: hd.side, at: now, midi: hd.midi };
    const held = Math.round((now - hd.at) * 1000);
    const sus = !MECH.expression ? "" : hd.shapes ? ` · sustain moves: ${hd.shapes}, from ${hd.sMin.toFixed(2)} to ${hd.sMax.toFixed(2)} (−1 toward the soft side, +1 the strong)` : " · no sustain move";
    this.say(`${cancelled ? "! IOS CANCEL" : "↑ LIFT"} ${this.name(hd.midi)} after ${held} ms${sus}${hd.ornament ? ` · ${hd.ornament}` : ""}`);
  }

  /** Each frame: the trills' next notes, the metronome's clicks scheduled a moment ahead. */
  frame() {
    const t = this.tick();
    for (const hd of this.held.values()) if (hd.trill && !hd.trill.settled) this.trillStep(hd, t);
    const ms = performance.now();
    for (const [id, hd] of this.held) if (hd.pend && !hd.passive) this.trySlide(id, hd, ms);
    if (!this.o.click) return;
    const now = this.chip.ctx.currentTime;
    while (this.nextClick < now + 0.15) {
      if (this.nextClick >= now - 0.02) this.chip.tick(this.nextClick, this.beatN % this.perBar === 0, 0.08);
      this.nextClick += this.beatS;
      this.beatN++;
    }
  }

  stop() {
    const now = this.chip.ctx.currentTime;
    for (const hd of this.held.values()) for (const s of hd.sounds) s.stop(now);
    this.held.clear();
  }

  /**
   * The rows over the whole play area: a faint line a row (the key's tonic brighter), the note names
   * along each bar's inner edge; a held row lit in the thumb's colour; between the bars, the last few
   * seconds of what was played as a roll (time right to left, the newest at the right).
   */
  paint(g: CanvasRenderingContext2D, w: number, h: number) {
    this.h = h;
    const rh = this.rowH(h);
    const bw = w * BAR;
    const { tonic } = keyOf(this.f.key);
    const now = this.chip.ctx.currentTime;
    const lit = new Map<number, Side>();
    for (const hd of this.held.values()) lit.set(hd.row, hd.side);
    g.save();
    g.font = `${Math.max(8, Math.min(11, rh * 0.6))}px ui-monospace, Menlo, monospace`;
    g.textBaseline = "middle";
    this.rows.forEach((m, r) => {
      const y = this.yOf(r, h);
      const isTonic = ((m % 12) + 12) % 12 === tonic;
      const side = lit.get(r);
      if (side) {
        g.fillStyle = side === "left" ? "rgba(185,164,255,0.28)" : "rgba(255,127,191,0.28)";
        g.fillRect(0, y - rh / 2, bw, rh);
        g.fillRect(w - bw, y - rh / 2, bw, rh);
      }
      g.fillStyle = isTonic ? "rgba(255,243,166,0.32)" : "rgba(236,234,217,0.10)";
      g.fillRect(0, Math.round(y - rh / 2), bw, 1);
      g.fillRect(w - bw, Math.round(y - rh / 2), bw, 1);
      if (rh >= 9 || isTonic) {
        g.fillStyle = side ? "#fff3a6" : isTonic ? "rgba(255,243,166,0.8)" : "rgba(236,234,217,0.45)";
        const nm = this.name(m);
        g.textAlign = "right";
        g.fillText(nm, bw - 4, y);
        g.textAlign = "left";
        g.fillText(nm, w - bw + 4, y);
      }
    });
    // The roll between the bars.
    const x0 = bw + 6;
    const x1 = w - bw - 6;
    const xOf = (s: number) => x1 - ((now - s) / ROLL_S) * (x1 - x0);
    for (const p of this.played) {
      const a = xOf(p.on);
      const b = xOf(p.off ?? now);
      if (b < x0) continue;
      const y = this.yOf(p.row, h);
      g.fillStyle = p.side === "left" ? "#b9a4ff" : "#ff7fbf";
      g.globalAlpha = p.off === undefined ? 0.95 : 0.6;
      g.fillRect(Math.max(x0, a), y - Math.min(4, rh / 3), Math.max(2, b - Math.max(x0, a)), Math.max(3, Math.min(8, (rh * 2) / 3)));
    }
    g.restore();
  }
}
