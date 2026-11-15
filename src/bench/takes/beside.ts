/**
 * D726, BACH PLAYS WITH YOU: a take laid beside Kimiko Ishizaka's recording of the same fugue (Book I only:
 * hers is the recording the game has timed beat by beat, D216; CC0), bar by bar: where she moves on (a
 * bar quicker than her own usual bar) or holds back (slower), and where the player was ahead of the
 * beat (early) or behind it (late). The two are not the same measure: she sets her own tempo, the player
 * plays against the game's steady band, so the comparison is of leanings: ahead with her moving on,
 * behind with her holding back, "with her"; the other way, "against her". It compares the player with one
 * pianist, not with an ideal.
 */
import { barStart, fugueById, type TouchFugue } from "../../touch/fugue.ts";
import { herMap, secAt, type HerMap } from "../her-clock.ts";
import type { Take } from "./take.ts";

/** A bar's leanings. `her`: % quicker (+) or slower (-) than her median bar; `you`: mean ms early (-) or late (+), null with under two notes matched. */
export interface BarLean {
  bar: number;
  her: number;
  you: number | null;
  notes: number;
  /** Both lean clearly, the same way (ahead and quicker; behind and slower), or the other. */
  with: "with" | "against" | null;
}

/** Leanings clear enough to count (her tempo by this %; the player's by these ms). */
export const HER_CLEAR_PCT = 4;
export const YOU_CLEAR_MS = 15;

export interface Beside {
  piece: string;
  bars: BarLean[];
  withHer: number;
  againstHer: number;
  /** Her slowest bars (her broadenings, the cadences) and how the player met them. */
  herSlowest: BarLean[];
}

/** The player's offset (ms) of each note of the take matched to the score's nearest onset of its voice (within half a beat). */
export function offsets(t: Take, f: TouchFugue = fugueById(t.piece)): { tick: number; ms: number }[] {
  const onsets = [...new Set((f.voices[t.voice] ?? []).map((n) => n[0]))].sort((a, b) => a - b);
  const tps = (f.tpq * t.bpm) / 60;
  const half = f.tpq / 2;
  const out: { tick: number; ms: number }[] = [];
  let j = 0;
  for (const n of [...t.notes].sort((a, b) => a[1] - b[1])) {
    const at = n[1];
    while (j + 1 < onsets.length && Math.abs(onsets[j + 1] - at) <= Math.abs(onsets[j] - at)) j++;
    const on = onsets[j];
    if (on === undefined || Math.abs(at - on) > half) continue;
    out.push({ tick: on, ms: ((at - on) / tps) * 1000 });
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/** The take beside her, bar by bar; null where she has not recorded the fugue. */
export function besideHer(t: Take, m: HerMap | null = herMap(t.piece)): Beside | null {
  if (!m) return null;
  const f = fugueById(t.piece);
  const first = f.bars[0]?.n ?? 1;
  const last = f.bars.at(-1)?.n ?? first;
  const secs: number[] = [];
  for (let b = first; b <= last; b++) {
    const a = barStart(f, b);
    const z = b === last ? f.length : barStart(f, b + 1);
    secs.push(secAt(m, z) - secAt(m, a));
  }
  const usual = median(secs.filter((s) => s > 0));
  const offs = offsets(t, f);
  const bars: BarLean[] = [];
  let k = 0;
  for (let b = first; b <= last; b++) {
    const a = barStart(f, b);
    const z = b === last ? f.length + 1 : barStart(f, b + 1);
    const mine = offs.filter((o) => o.tick >= a && o.tick < z).map((o) => o.ms);
    const her = secs[k] > 0 ? Math.round((usual / secs[k] - 1) * 1000) / 10 : 0;
    k++;
    const you = mine.length >= 2 ? Math.round(mine.reduce((x, y) => x + y, 0) / mine.length) : null;
    const clear = you !== null && Math.abs(her) >= HER_CLEAR_PCT && Math.abs(you) >= YOU_CLEAR_MS;
    // Quicker with early (ahead), slower with late (behind): with her.
    bars.push({ bar: b, her, you, notes: mine.length, with: clear ? (Math.sign(her) === -Math.sign(you!) ? "with" : "against") : null });
  }
  const played = bars.filter((b) => b.you !== null);
  return {
    piece: t.piece,
    bars,
    withHer: bars.filter((b) => b.with === "with").length,
    againstHer: bars.filter((b) => b.with === "against").length,
    herSlowest: [...played].filter((x) => x.her <= -2).sort((a, b) => a.her - b.her).slice(0, 3),
  };
}
