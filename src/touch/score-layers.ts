/**
 * D567-D574, THE NEW SCORE-DRIVEN STYLES' OWN LAYERS (score-drums.ts scorePlan calls `addLayers` once its four sources,
 * the bass's accents, the subject's rhythm, the cadences and the rolls, are planned, and before the form's levels and
 * the humanising). Pure numbers; every stroke still read from the score or the form (form-points.ts), never a loop
 * against the music:
 *
 *   MARCH       the bass drum on the bar's strong beats where the bass's accents leave them (1 and 3 of a 4/4, both
 *               beats of a 2/2 or a 6/8, 1 of a 3/4); a flam on each of the subject's strokes on a beat; a drag and a
 *               five-stroke roll into each entry; in the episodes a stick's soft tap on the bar (D600: not every beat); the clash
 *               cymbals on the arrivals only (the cadences home and the acts', form-points' and the score's).
 *   STOOGES     the temple blocks by the bass's contour (the high block where the bass leaps up); the cartoon timing of
 *               the cadences: a half beat's pause before each, a "ta-da" on the blocks into it, the bonk on it (and the
 *               slapstick on a perfect one); a rising whistle (a noise sweep) through each roll into an act.
 *   SCORE SYNTH the snare on the subject's long notes that fall on a beat, the kick on each entry's first note; the
 *               episodes' lighter figure: the shaker's sixteenths (an accent contour) and a rim off the beat.
 *   SWELL       the mallets' two toms by the bass's place (the low on the bar), a gentle cymbal swell every four bars
 *               (the sea's), a fuller one into each act and the final chord, the snare on the final group's downbeats.
 *   climaxKit   (a tweak, I/24's) the bass drum and the clash cymbals at the climax's peak, its arrival, the final chord.
 */
import type { TouchFugue } from "./fugue.ts";
import type { Form } from "./form-points.ts";
import type { Arrival, ScoreKit, ScoreStroke, ScoreStyle, TweakSet } from "./score-drums.ts";

export interface LayerCtx {
  f: TouchFugue;
  fp: Form;
  style: ScoreStyle;
  kit: ScoreKit;
  tw: Required<TweakSet>;
  beat: number;
  per: number;
  beatS: number;
  sToT: (s: number) => number;
  barOn: (t: number) => number;
  isEpisode: (t: number) => boolean;
  inRoll: (t: number) => boolean;
  arr: Arrival[];
  strokes: ScoreStroke[];
  end: number;
  windows: [number, number][];
}

/** MARCH: the flam's grace (s before), the five-stroke roll's strokes apart (s), the street beat's levels. */
export const MARCH_FLAM_S = 0.028;
export const MARCH_ROLL_S = 0.055;
export const STREET_VEL = [0.26, 0.2] as const;
/** D600: a bar at least this long (s) takes the street beat's tap every bar, a shorter one every other bar. */
export const STREET_MIN_BAR_S = 1.6;
/** STOOGES: the cartoon pause before a cadence (beats), the "ta-da" at least this far apart (s). */
export const PAUSE_BEATS = 0.5;
export const TADA_MIN_S = 0.1;
/** SWELL: the sea's swell every this many bars, at most this long (s). */
export const SEA_BARS = 4;
export const SWELL_MAX_S = 3.2;

const strongBeats = (per: number) => (per === 4 ? [0, 2] : per === 2 ? [0, 1] : per === 6 ? [0, 3] : [0]);
/** The bars' first ticks (the score's bars). */
const barTicks = (f: TouchFugue, end: number) => f.bars.map((b) => b.on).filter((t) => t < end);

export function addLayers(c: LayerCtx): void {
  if (c.style === "march") march(c);
  else if (c.style === "stooges") stooges(c);
  else if (c.style === "scoreSynth") scoreSynth(c);
  else if (c.style === "swell") swell(c);
  if (c.tw.climaxKit) climaxKit(c);
}

function march(c: LayerCtx) {
  const { f, beat, per, strokes, end, beatS } = c;
  const bassAt = strokes.filter((s) => s.src === "bass").map((s) => s.tick);
  const barS = (f.barTicks / beat) * beatS;
  let streetBar = 0;
  // The bass drum on the strong beats (where the bass's own accents leave them), the street beat in the episodes.
  for (const b0 of barTicks(f, end)) {
    for (let k = 0; k < per; k++) {
      const t = b0 + k * beat;
      if (t >= end || c.inRoll(t)) continue;
      if (c.isEpisode(t)) {
        // D600: the street beat a stick's tap on the bar's first beat only (every other bar where a bar is shorter than
        // STREET_MIN_BAR_S), the taps a little uneven: 2.52's stick on every beat and its half (II/5: every crotchet at one
        // level) was "a click track ... louder than the music" (the owner).
        if (k === 0) {
          const n = streetBar++;
          const every = barS >= STREET_MIN_BAR_S;
          if (every || n % 2 === 0) strokes.push({ tick: t, dt: 0, piece: "drumStick", vel: STREET_VEL[(every ? n : n >> 1) % 2], src: "bass" });
        }
        continue;
      }
      if (!strongBeats(per).includes(k)) continue;
      if (bassAt.some((x) => Math.abs(x - t) < beat / 4)) continue;
      strokes.push({ tick: t, dt: 0, piece: "bassDrum", vel: k === 0 ? 0.5 : 0.4, src: "bass" });
    }
  }
  // The subject's strokes on a beat flammed.
  for (const s of strokes.filter((x) => x.src === "subject" && x.piece === "sideDrum")) {
    if ((s.tick - c.barOn(s.tick)) % beat === 0) strokes.push({ tick: s.tick, dt: -MARCH_FLAM_S, piece: "sideDrum", vel: s.vel * 0.4, src: "subject", grace: true });
  }
  // A drag and a five-stroke roll into each entry (not inside a roll into an act, nor in an episode).
  if (c.tw.entryRolls) {
    for (const e of f.entries) {
      if (e.on >= end || e.on < beat || c.inRoll(e.on) || c.isEpisode(e.on)) continue;
      // Only the clear entries (none begun in the bar before: a stretto's entries are not each rolled into).
      if (f.entries.some((x) => x !== e && x.on < e.on && x.on >= e.on - f.barTicks)) continue;
      for (let j = 4; j >= 1; j--) strokes.push({ tick: e.on, dt: -j * MARCH_ROLL_S, piece: "sideDrum", vel: 0.16 + 0.05 * (4 - j) * (j % 2 ? 0.9 : 1), role: "roll", src: "roll" });
    }
  }
  // The cymbals on the arrivals only.
  for (const a of c.arr) if ((a.kind === "act" || a.kind === "cadence") && a.tick < end - beat / 2) strokes.push({ tick: a.tick, dt: 0, piece: "cymbals", vel: a.kind === "act" ? 0.42 : 0.36, role: "accent", src: "arrival" });
}

/** The bass line's note at a tick (its attack there), and the one before. */
function bassPair(f: TouchFugue, tick: number): [number, number] | null {
  let low: number | null = null;
  for (const v of f.voices) for (const n of v) if (n[0] === tick && (low === null || n[2] < low)) low = n[2];
  if (low === null) return null;
  let prev: number | null = null;
  let prevOn = -Infinity;
  for (const v of f.voices) for (const n of v) if (n[0] < tick && n[0] + n[1] >= tick - 1 && n[0] >= prevOn && (prev === null || n[0] > prevOn || n[2] < prev)) (prev = n[2]), (prevOn = n[0]);
  return prev === null ? null : [low, prev];
}

function stooges(c: LayerCtx) {
  const { f, beat, strokes, end, beatS } = c;
  // The temple blocks by the bass's contour.
  for (const s of strokes) {
    if (s.src !== "bass" || s.piece !== "templeLo") continue;
    const p = bassPair(f, s.tick);
    if (p && p[0] - p[1] >= 3) s.piece = "templeHi";
  }
  // The cartoon timing of the cadences.
  const cads = f.cadences.filter((x) => x.on < end - beat / 2 && x.on > beat && (c.tw.cadences === "all" || x.kind === "perfect") && !c.tw.skip.includes(x.bar));
  for (const k of cads) {
    const from = k.on - PAUSE_BEATS * beat;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if ((s.src === "bass" || s.src === "subject") && s.tick >= from && s.tick < k.on) strokes.splice(i, 1);
    }
    const q = beat / 4;
    if ((q / beat) * beatS >= TADA_MIN_S) {
      strokes.push({ tick: k.on - 2 * q, dt: 0, piece: "templeHi", vel: 0.36, src: "cadence" });
      strokes.push({ tick: k.on - q, dt: 0, piece: "templeLo", vel: 0.44, src: "cadence" });
    }
    if (k.kind === "perfect") strokes.push({ tick: k.on, dt: 0, piece: "slapstick", vel: 0.5, role: "accent", src: "cadence" });
  }
  // A rising whistle through each roll into an act.
  for (const [a, z] of c.windows) strokes.push({ tick: a, dt: 0, piece: "whistleUp", vel: 0.3, role: "roll", src: "roll", len: ((z - a) / beat) * beatS });
}

function scoreSynth(c: LayerCtx) {
  const { f, fp, beat, strokes, end, beatS, sToT } = c;
  const gap = sToT(0.15);
  const ents = [...f.entries].sort((a, b) => a.on - b.on);
  let lastSnare = -Infinity;
  ents.forEach((e, i) => {
    const next = ents[i + 1];
    const to = Math.min(e.end, next ? next.on : Infinity, end);
    if (!c.inRoll(e.on) && !c.isEpisode(e.on) && e.on < end) strokes.push({ tick: e.on, dt: 0, piece: "kick", vel: 0.5, src: "subject" });
    for (const n of f.voices[e.voice] ?? []) {
      if (n[0] < e.on || n[0] >= to || n[1] < beat / 2 || (n[0] - c.barOn(n[0])) % beat !== 0) continue;
      if (c.inRoll(n[0]) || c.isEpisode(n[0]) || n[0] - lastSnare < gap) continue;
      lastSnare = n[0];
      strokes.push({ tick: n[0], dt: 0, piece: "snare", vel: n[0] === e.on ? 0.3 : 0.38, src: "subject" });
    }
  });
  // The episodes' lighter figure: the shaker's sixteenths (or eighths at a quick beat), a rim off the beat.
  const subs = beatS / 4 >= 0.1 ? 4 : beatS / 2 >= 0.1 ? 2 : 1;
  const contour = subs === 4 ? [0.3, 0.13, 0.22, 0.15] : subs === 2 ? [0.3, 0.18] : [0.28];
  for (const s of fp.seams) {
    if (s.kind !== "episode") continue;
    for (let t = Math.ceil(s.on / beat) * beat; t < Math.min(s.end, end); t += beat) {
      if (c.inRoll(t)) continue;
      for (let j = 0; j < subs; j++) if (c.isEpisode(t + (j * beat) / subs)) strokes.push({ tick: t + (j * beat) / subs, dt: 0, piece: "shaker", vel: contour[j], src: "bass" });
      if (beatS / 2 >= 0.2 && c.isEpisode(t + beat / 2)) strokes.push({ tick: t + beat / 2, dt: 0, piece: "rim", vel: 0.26, src: "bass" });
    }
  }
}

function swell(c: LayerCtx) {
  const { f, fp, beat, strokes, end, beatS, sToT } = c;
  // The mallets' two toms: the low on the bar, the high elsewhere.
  for (const s of strokes) if (s.src === "bass" && s.piece === "malletLow" && s.tick !== c.barOn(s.tick)) s.piece = "malletHigh";
  const bars = barTicks(f, end);
  const barS = (f.barTicks / beat) * beatS;
  // The sea's swell every SEA_BARS bars (rising over two bars into the next group's downbeat), softer in the episodes.
  for (let i = SEA_BARS; i < bars.length; i += SEA_BARS) {
    const to = bars[i];
    const lenS = Math.min(2 * barS, SWELL_MAX_S);
    const from = to - sToT(lenS);
    if (from < 0 || c.inRoll(to) || c.windows.some(([a, z]) => from < z && to > a)) continue;
    strokes.push({ tick: Math.round(from), dt: 0, piece: "cymSwell", vel: c.isEpisode(to) ? 0.13 : 0.17, src: "bass", len: lenS });
  }
  // A fuller swell into each act's arrival and the final chord.
  for (const to of [...c.windows.map((w) => w[1]), end]) {
    const lenS = Math.min(barS, SWELL_MAX_S);
    strokes.push({ tick: Math.max(0, Math.round(to - sToT(lenS))), dt: 0, piece: "cymSwell", vel: 0.3, role: "roll", src: "roll", len: lenS });
  }
  // The snare on the final group's downbeats (a few structural bars only).
  const fin = fp.seams.find((s) => s.kind === "final");
  if (fin) for (const b of bars) if (b >= fin.on && b < Math.min(fin.end, end) && !c.inRoll(b)) strokes.push({ tick: b, dt: 0, piece: "snare", vel: 0.26, src: "arrival" });
}

function climaxKit(c: LayerCtx) {
  const { fp, strokes, end, beat } = c;
  const at = [fp.climax.peak, fp.climax.arrival].filter((t, i, a) => t > 0 && t < end - beat && a.indexOf(t) === i);
  for (const t of at) {
    strokes.push({ tick: t, dt: 0, piece: "bassDrum", vel: 0.62, role: "accent", src: "arrival" });
    strokes.push({ tick: t, dt: 0, piece: "cymbals", vel: 0.5, role: "accent", src: "arrival" });
  }
  strokes.push({ tick: end, dt: 0, piece: "cymbals", vel: 0.55, role: "accent", src: "final" });
  if (c.style !== "timpani" || !c.kit.final.includes("bassDrum")) strokes.push({ tick: end, dt: 0, piece: "bassDrum", vel: 0.6, role: "accent", src: "final" });
}
