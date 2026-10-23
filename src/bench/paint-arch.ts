/**
 * D238, the fugue's architecture beside the computer's HIGHWAY (the owner: "This is a fugue game … this
 * is not simply Guitar Hero"). The road stays the player's alone (only their gems, in their lanes'
 * colours); the rest of the fugue runs beside it and above it:
 *   VOICE RAILS on the road's shoulders: each other voice a thin rail coming towards the player on the
 *   road's own time (the same perspective), the higher voices on the right, the lower on the left, the
 *   nearest in register next to the road; its notes short grey-white dashes (their lengths the notes'),
 *   a little to the right for higher, to the left for lower (the line's contour, within the rail); the
 *   voice's initial at the strike line's end. While a voice states the subject (an answer, a later
 *   subject) its rail lights in its colour (the only place the voices' colours appear), its dashes
 *   brighten and the subject's contour runs through them as one line, named at its head as it comes.
 *   THE FUGUE MAP over the horizon: the whole piece, a thin row per voice (the player's brighter), each
 *   entry a block in its voice's colour, strettos a thin orange line over them, cadences ticks under,
 *   the NOW cursor and the bar.
 * Precomputed per piece and per game (WeakMaps); a frame walks only the notes in view (a cursor).
 */
import { inkOf } from "../touch/MusicBox.tsx";
import type { TouchFugue } from "../touch/fugue.ts";
import type { ProtoGame } from "./proto-game.ts";
import { subjectLine } from "./subject-line.ts";
import { label } from "./paint-proto.ts";
import type { Road } from "./paint-desk.ts";

/** The first rail's distance outside the road's edge, and between rails (px at the strike line). */
export const RAIL0 = 34;
export const RAIL_GAP = 20;
/** The contour's swing either side of a rail (px at the strike line). */
const WOB = 6;
/** How far outside the road's edge the shoulders' furniture (the multiplier's ring, the crowd's meter) stands. */
export const SHOULDER = 150;
const DASH = "rgba(225,228,240,";
const STRETTO_INK = "#ff8a3d";
const CADENCE_INK = "#9fd3ff";

export interface Rail {
  voice: number;
  /** 1 the right shoulder (a higher voice than the player's), -1 the left. */
  side: -1 | 1;
  /** 0 next to the road, outwards from there. */
  slot: number;
  /** The voice's compass (MIDI), for the contour. */
  lo: number;
  hi: number;
  initial: string;
  ink: string;
}

/** The rails of the voices the player does not play: higher right, lower left, nearest in register next to the road. */
export function railsOf(f: TouchFugue, mine: number, played: ReadonlySet<number>): Rail[] {
  const count = f.voices.length;
  const rails: Rail[] = [];
  for (const side of [1, -1] as const) {
    // Voices are numbered from the top: the right shoulder's nearest is the voice just above.
    const vs = f.voices.map((_, v) => v).filter((v) => !played.has(v) && (side > 0 ? v < mine : v > mine));
    vs.sort((a, b) => Math.abs(a - mine) - Math.abs(b - mine));
    vs.forEach((v, slot) => {
      const ms = f.voices[v].map((n) => n[2]);
      const name = f.voiceNames[v] ?? `V${v + 1}`;
      rails.push({ voice: v, side, slot, lo: Math.min(...ms, 127), hi: Math.max(...ms, 0), initial: name[0].toUpperCase(), ink: inkOf(v, count) });
    });
  }
  return rails;
}

/** A rail's x at a depth (k the road's width scale there), for a pitch (or its middle). */
export function railX(r: Pick<Road, "cx" | "W">, rail: Rail, k: number, midi?: number): number {
  const u = midi === undefined || rail.hi <= rail.lo ? 0.5 : (midi - rail.lo) / (rail.hi - rail.lo);
  return r.cx + rail.side * (r.W / 2 + RAIL0 + RAIL_GAP * rail.slot) * k + (u - 0.5) * 2 * WOB * k;
}

/** An entry's name as its rail calls it: ALTO · ANSWER, TENOR · SUBJECT 2, BASS · SUBJECT · INVERTED. */
export function railLabel(f: TouchFugue, i: number): string {
  const e = f.entries[i];
  const name = (f.voiceNames[e.voice] ?? `VOICE ${e.voice + 1}`).toUpperCase();
  const what = (e.theme ?? 1) > 1 ? `SUBJECT ${e.theme}` : e.form === "answer" ? "ANSWER" : "SUBJECT";
  const how = [e.inverted ? "INVERTED" : "", e.scale === 2 ? "AUGMENTED" : e.scale === 0.5 ? "DIMINISHED" : ""].filter(Boolean);
  return [name, what, ...how].join(" · ");
}

/** The fugue map's contents: the piece's span, its entries (one per f.entries, in order), strettos, cadences. */
export interface FugueMap {
  start: number;
  end: number;
  rows: number;
  entries: { voice: number; on: number; end: number; ink: string }[];
  strettos: { on: number; end: number }[];
  cadences: number[];
}
const maps = new WeakMap<TouchFugue, FugueMap>();
export function fugueMap(f: TouchFugue): FugueMap {
  let m = maps.get(f);
  if (!m) {
    const count = f.voices.length;
    const line = subjectLine(f, 0);
    m = {
      start: f.bars[0]?.on ?? 0,
      end: Math.max(f.length, ...f.entries.map((e) => e.end)),
      rows: count,
      entries: f.entries.map((e) => ({ voice: e.voice, on: e.on, end: e.end, ink: inkOf(e.voice, count) })),
      strettos: line.strettos.map((s) => ({ on: s.on, end: s.end })),
      cadences: (f.cadences ?? []).map((c) => c.on),
    };
    maps.set(f, m);
  }
  return m;
}

/** What the painter keeps per game: the rails, each voice's entries, the cursors. */
interface Arch {
  rails: Rail[];
  byVoice: Map<number, Rail>;
  spans: Map<number, { on: number; end: number; i: number }[]>;
  from: number;
  bar: number;
}
const arches = new WeakMap<ProtoGame, Arch>();
function archOf(g: ProtoGame): Arch {
  let a = arches.get(g);
  if (!a) {
    const played = new Set(g.tracks.map((x) => x.voice));
    const rails = railsOf(g.f, g.voice, played);
    const spans = new Map<number, { on: number; end: number; i: number }[]>();
    g.f.entries.forEach((e, i) => {
      if (played.has(e.voice)) return;
      spans.set(e.voice, [...(spans.get(e.voice) ?? []), { on: e.on, end: e.end, i }]);
    });
    a = { rails, byVoice: new Map(rails.map((r) => [r.voice, r])), spans, from: 0, bar: 0 };
    arches.set(g, a);
  }
  return a;
}

/** The rails the painter draws for a game (for the tests and the shoulders' layout). */
export function gameRails(g: ProtoGame): Rail[] {
  return archOf(g).rails;
}

/** The voice rails on the shoulders (under the road's notes; outside its edges, never on it). */
export function deskRails(r: Road) {
  const { c, g, t, at, y1, ahead } = r;
  const a = archOf(g);
  if (!a.rails.length) return;
  const top = at(ahead);
  // Far away, faded (the road's own fog covers only the road).
  const fade = (d: number) => Math.max(0, Math.min(1, (1 - d) / 0.4));
  // The rails themselves: thin tracks from the horizon to the strike line.
  for (const rail of a.rails) {
    c.strokeStyle = "rgba(255,255,255,0.07)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(railX(r, rail, top.k), top.y);
    c.lineTo(railX(r, rail, 1), y1);
    c.stroke();
  }
  // Lit rails: an entry coming or under way, the rail in its voice's colour from its head to its end.
  const lit = new Set<number>();
  for (const [v, spans] of a.spans) {
    const rail = a.byVoice.get(v);
    if (!rail) continue;
    for (const s of spans) {
      if (s.end < g.now || s.on > ahead) continue;
      const p = at(Math.max(s.on, g.now));
      const q = at(Math.min(s.end, ahead));
      const live = s.on <= g.now;
      if (live) lit.add(v);
      const xp = railX(r, rail, p.k);
      const xq = railX(r, rail, q.k);
      const hw = (WOB + 3) * p.k;
      const hq = (WOB + 3) * q.k;
      c.fillStyle = rail.ink;
      c.globalAlpha = (live ? 0.13 : 0.08) * fade(p.d);
      c.beginPath();
      c.moveTo(xp - hw, p.y);
      c.lineTo(xp + hw, p.y);
      c.lineTo(xq + hq, q.y);
      c.lineTo(xq - hq, q.y);
      c.closePath();
      c.fill();
      c.strokeStyle = rail.ink;
      c.lineWidth = 1;
      c.globalAlpha = (live ? 0.6 : 0.35) * fade(p.d);
      c.beginPath();
      c.moveTo(xp, p.y);
      c.lineTo(xq, q.y);
      c.stroke();
      // The subject's contour through its notes, one line.
      const e = g.f.entries[s.i];
      c.strokeStyle = rail.ink;
      c.lineWidth = 1.5;
      c.globalAlpha = live ? 0.9 : 0.7;
      c.beginPath();
      let begun = false;
      for (const [on, dur, midi] of e.notes) {
        if (on + dur < g.now || on > ahead) continue;
        const u = at(Math.max(on, g.now));
        const v2 = at(Math.min(on + dur, ahead));
        if (begun) c.lineTo(railX(r, rail, u.k, midi), u.y);
        else c.moveTo(railX(r, rail, u.k, midi), u.y), (begun = true);
        c.lineTo(railX(r, rail, v2.k, midi), v2.y);
      }
      c.stroke();
      c.globalAlpha = 1;
      // Its name at its head, as it comes (outwards from the rail).
      if (!live) label(c, railLabel(g.f, s.i), xp + rail.side * 4, p.y - Math.max(6, 10 * p.k), rail.ink, Math.max(6, Math.round(8 * p.k)), rail.side > 0 ? "left" : "right");
    }
  }
  // The notes: short dashes, grey-white; an entry's notes in its voice's colour, brighter.
  const others = g.others;
  while (a.from < others.length && others[a.from].on < g.now - 8 * g.beat) a.from++;
  if (a.from > 0 && others[a.from - 1].on >= g.now - 8 * g.beat) a.from = 0;
  for (let j = a.from; j < others.length; j++) {
    const n = others[j];
    if (n.on > ahead) break;
    const stop = n.on + n.dur - Math.min(n.dur * 0.25, g.beat * 0.1);
    if (stop < g.now) continue;
    const rail = a.byVoice.get(n.voice);
    if (!rail) continue;
    const p = at(Math.max(n.on, g.now));
    const q = at(Math.min(stop, ahead));
    const subject = a.spans.get(n.voice)?.some((s) => n.on >= s.on && n.on < s.end) ?? false;
    const xp = railX(r, rail, p.k, n.midi);
    const xq = railX(r, rail, q.k, n.midi);
    const hw = (subject ? 2 : 1.5) * Math.max(0.6, p.k);
    if (subject) {
      c.fillStyle = rail.ink;
      c.globalAlpha = fade(p.d);
    } else {
      c.fillStyle = `${DASH}1)`;
      c.globalAlpha = 0.32 * fade(p.d);
    }
    c.beginPath();
    c.moveTo(xp - hw, p.y);
    c.lineTo(xp + hw, p.y);
    c.lineTo(xq + hw * (q.k / p.k), Math.min(q.y, p.y - 1));
    c.lineTo(xq - hw * (q.k / p.k), Math.min(q.y, p.y - 1));
    c.closePath();
    c.fill();
  }
  c.globalAlpha = 1;
  // At the strike line's end: each rail's initial, in its colour while it states the subject.
  for (const rail of a.rails) {
    const x = railX(r, rail, 1);
    const on = lit.has(rail.voice);
    if (on) {
      c.fillStyle = rail.ink;
      c.fillRect(Math.round(x) - 3, y1 - 3, 6, 6);
    }
    label(c, rail.initial, x, y1 + 14, on ? rail.ink : t.muted, on ? 9 : 7);
  }
}

/** The map's place: its top, its rows' pitch, its bottom (the callouts go under it). */
export const MAP_TOP = 8;
const ROW = 7;
export const mapBottom = (rows: number) => MAP_TOP + rows * ROW + 4;

/** The fugue map over the horizon: the whole piece at a glance, NOW and the bar. */
export function deskMap(r: Road) {
  const { c, g, t, cx, W } = r;
  if (!g.f.entries.length) return;
  const m = fugueMap(g.f);
  const a = archOf(g);
  const mw = Math.min(W * 0.8, 600);
  const x0 = Math.round(cx - mw / 2);
  const span = Math.max(1, m.end - m.start);
  const X = (tick: number) => x0 + ((tick - m.start) / span) * mw;
  const rowY = (v: number) => MAP_TOP + v * ROW;
  const played = new Set(g.tracks.map((x) => x.voice));
  // The rows: a faint track each, the player's brighter, marked at its start.
  for (let v = 0; v < m.rows; v++) {
    const mine = played.has(v);
    c.fillStyle = mine ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.09)";
    c.fillRect(x0, rowY(v) + 1, mw, mine ? 2 : 1);
    label(c, (g.f.voiceNames[v] ?? "?")[0].toUpperCase(), x0 - 8, rowY(v) + 2, mine ? "#fff6d0" : t.muted, 6, "right");
  }
  // The strettos: a thin orange line over the rows.
  c.fillStyle = STRETTO_INK;
  c.globalAlpha = 0.8;
  for (const s of m.strettos) c.fillRect(Math.round(X(s.on)), MAP_TOP - 3, Math.max(1, Math.round(X(s.end) - X(s.on))), 1);
  // The entries: blocks in their voices' colours (the player's a little taller), those gone by dimmer.
  for (const e of m.entries) {
    const mine = played.has(e.voice);
    c.fillStyle = e.ink;
    c.globalAlpha = e.end < g.now ? 0.45 : e.on <= g.now ? 1 : 0.75;
    c.fillRect(Math.round(X(e.on)), rowY(e.voice) - (mine ? 1 : 0), Math.max(2, Math.round(X(e.end) - X(e.on))), mine ? 6 : 4);
  }
  // The cadences: ticks under the rows.
  c.fillStyle = CADENCE_INK;
  c.globalAlpha = 0.6;
  for (const on of m.cadences) c.fillRect(Math.round(X(on)), rowY(m.rows) + 1, 1, 3);
  c.globalAlpha = 1;
  // NOW: a cursor through the rows; the bar beside the map.
  const nx = Math.round(X(Math.max(m.start, Math.min(m.end, g.now))));
  c.fillStyle = "#ffffff";
  c.fillRect(nx, MAP_TOP - 4, 1, m.rows * ROW + 8);
  c.fillRect(nx - 1, MAP_TOP - 5, 3, 1);
  const bars = g.f.bars;
  if (a.bar >= bars.length || (a.bar > 0 && bars[a.bar].on > g.now)) a.bar = 0;
  while (a.bar + 1 < bars.length && bars[a.bar + 1].on <= g.now) a.bar++;
  label(c, `BAR ${bars[a.bar]?.n ?? 1}`, x0 + mw + 10, MAP_TOP + (m.rows * ROW) / 2, t.muted, 6, "left");
}
