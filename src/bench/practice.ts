/**
 * D326, TOOLS (play.html; the musicians' panel's recommendations #5 and #6): what the button beside ⚙
 * keeps and what it asks of the game, apart from the drawing (ToolsPanel.tsx).
 *
 * PRACTICE: an unscored run of a bar range (no crowd to lose, no grade, no best score kept), LOOP, the
 * tempo 50-100% of the game's, WAIT FOR ME (the band waits for the next right note: the lessons' and the
 * Lab's `wait`). The passage is the Lab's (lab/game.ts `passageSpan`); the game is the game's own
 * (ProtoGame), only its options change.
 * REHEARSAL: HEAR THE OTHERS (the bars without the player's voice: the game plays the voice itself, as
 * the tutorial's demonstration does, through the player's level at zero), solo and mute per voice (the
 * band's notes of a muted voice are not sounded; still drawn), and the player's own level, −6 to +3 dB,
 * in every run, scored ones too: one fixed level for the whole run, never tied to right or wrong (a
 * mixing courtesy, not subject emphasis). A missed note still drops out (the owner: no).
 * Kept per piece on the device (`tg-tools-v1`).
 */
import type { TouchFugue } from "../touch/fugue.ts";
import type { Options } from "./protos.ts";
import { passageSpan } from "./lab/game.ts";

export const TOOLS_KEY = "tg-tools-v1";
export const TEMPO_MIN = 50;
export const TEMPO_MAX = 100;
export const BALANCE_MIN = -6;
export const BALANCE_MAX = 3;

export interface ToolsState {
  /** The bar range (the bars as numbered in the score). */
  fromBar: number;
  toBar: number;
  loop: boolean;
  /** % of the game's tempo. */
  tempo: number;
  wait: boolean;
  /** The voices muted and soloed (indices). */
  mute: number[];
  solo: number[];
  /** The player's own voice against the band, dB (0: as it is). */
  balance: number;
}

export const firstBar = (f: TouchFugue) => f.bars[0]?.n ?? 1;
export const lastBar = (f: TouchFugue) => f.bars.at(-1)?.n ?? 1;

/** A new piece's tools: its first eight bars, looped, at 75%, not waiting; every voice heard; the player's level as it is. */
export function toolsDefault(f: TouchFugue): ToolsState {
  const lo = firstBar(f);
  return { fromBar: lo, toBar: Math.min(lastBar(f), lo + 7), loop: true, tempo: 75, wait: false, mute: [], solo: [], balance: 0 };
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const num = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const voices = (x: unknown, n: number) => (Array.isArray(x) ? [...new Set(x.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < n))].sort((a, b) => a - b) : []);

/** Whatever was stored (or nothing), made sound for the piece. */
export function saneTools(f: TouchFugue, s: Partial<ToolsState> | null | undefined): ToolsState {
  const d = toolsDefault(f);
  if (!s || typeof s !== "object") return d;
  const lo = firstBar(f);
  const hi = lastBar(f);
  const fromBar = clamp(Math.round(num(s.fromBar, d.fromBar)), lo, hi);
  const toBar = clamp(Math.round(num(s.toBar, d.toBar)), fromBar, hi);
  return {
    fromBar,
    toBar,
    loop: typeof s.loop === "boolean" ? s.loop : d.loop,
    tempo: clamp(Math.round(num(s.tempo, d.tempo) / 5) * 5, TEMPO_MIN, TEMPO_MAX),
    wait: s.wait === true,
    mute: voices(s.mute, f.voices.length),
    solo: voices(s.solo, f.voices.length),
    balance: clamp(Math.round(num(s.balance, 0) * 2) / 2, BALANCE_MIN, BALANCE_MAX),
  };
}

function readAll(): Record<string, Partial<ToolsState>> {
  try {
    const v = JSON.parse(localStorage.getItem(TOOLS_KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
export function readTools(f: TouchFugue): ToolsState {
  return saneTools(f, readAll()[f.id]);
}
export function saveTools(f: TouchFugue, s: ToolsState) {
  try {
    localStorage.setItem(TOOLS_KEY, JSON.stringify({ ...readAll(), [f.id]: saneTools(f, s) }));
  } catch {
    /* this visit only */
  }
}

/** The player's level (a gain) for a balance in dB, clamped to −6..+3. */
export function balanceGain(db: number): number {
  return 10 ** (clamp(num(db, 0), BALANCE_MIN, BALANCE_MAX) / 20);
}

/** The band's voices not to be sounded: with a voice soloed, every voice but the soloed; else the muted. Never the player's own. */
export function silenced(s: Pick<ToolsState, "mute" | "solo">, count: number, own: number): number[] {
  const all = Array.from({ length: count }, (_, i) => i).filter((i) => i !== own);
  const solo = s.solo.filter((v) => v !== own);
  return solo.length ? all.filter((v) => !solo.includes(v)) : all.filter((v) => s.mute.includes(v));
}

/** A practice run (or HEAR THE OTHERS: `listen`), as the game takes it. */
export interface PracticeRun {
  piece: string;
  from: number;
  until: number;
  bpm: number;
  loop: boolean;
  wait: boolean;
  listen: boolean;
  mute: number[];
  /** "3–10 · 75%", for the run's tag. */
  bars: string;
}
export function practiceRun(f: TouchFugue, s: ToolsState, voice: number, bpm: number, listen: boolean): PracticeRun {
  const t = saneTools(f, s);
  const { from, until } = passageSpan(f, t);
  // HEAR THE OTHERS never waits (nobody plays the voice for it to wait for: the game does, on time).
  return { piece: f.id, from, until, bpm: Math.round(bpm * t.tempo) / 100, loop: t.loop, wait: listen ? false : t.wait, listen, mute: silenced(t, f.voices.length, voice), bars: practiceLabel(t) };
}

/** The game's options for a practice run, over the scored run's: no crowd, no hints; HEAR THE OTHERS played by the game. */
export function practiceOptions(p: PracticeRun): Partial<Options> & { bpm: number } {
  return { bpm: p.bpm, until: p.until, wait: p.wait, fail: false, ornHint: false, mute: p.mute, demo: p.listen, guide: false, coach: undefined };
}

/** The player's level for a run: silent while the others are heard alone; the balance otherwise (scored runs too). */
export function mineGain(balance: number, p: PracticeRun | null): number {
  return p?.listen ? 0 : balanceGain(balance);
}

/** "BARS 3–10 · 75%" for the run's tag. */
export function practiceLabel(s: ToolsState): string {
  return `${s.fromBar}–${s.toBar} · ${s.tempo}%`;
}
