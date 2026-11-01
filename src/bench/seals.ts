/**
 * The seals judged (D196): at the end of a whole run (from the first bar to the last), the fugue's
 * seal is earned or not, by its kind's rule over the voice (or voices) played. Each kind's rule is
 * general; a card's own line names where it bites in that fugue. Kept on this device per piece and
 * voice, as the best grades are.
 *   STRETTO: every entry of the voice that overlaps another entry (any voice) captured.
 *   MIRROR: every inverted entry of the voice captured.
 *   SLOW GIANT: every augmented entry of the voice captured.
 *   SUBJECTS: an entry of every subject the voice has captured (a double or triple fugue).
 *   PERFECT LINE: every entry of the voice captured.
 *   HOLD: every long note (a beat and a half or more) held to at least seven tenths of its length.
 *   NO SLIP: no note missed or wrong from the voice's first entry to the end of its last.
 *   DUET: not offered (D219: TWO VOICES withdrawn); its cards say so (cards.ts NOT_OFFERED).
 *   TEMPERAMENT: grade A or better in a historical tuning (the one the card names, if it names one).
 */
import type { TouchFugue } from "../touch/fugue.ts";
import type { LaneNote } from "../touch/lanes.ts";
import { TEMPERAMENTS } from "../touch/tuning.ts";
import type { FugueCard } from "./cards.ts";

export interface RunFacts {
  f: TouchFugue;
  /** The voices played, with their notes as judged (SUBJECT: each voice's subject notes). */
  tracks: { voice: number; notes: LaneNote[] }[];
  entries: { voice: number; on: number; end: number; state: "open" | "captured" | "lost" }[];
  beat: number;
  grade: string;
  tuning: string;
  /** Played from the very beginning. */
  whole: boolean;
}

export interface SealVerdict {
  earned: boolean;
  /** Why not, in a line (or what was done). */
  why: string;
}

// D417: a B is good enough for every unlock.
const good = (g: string) => g === "S" || g === "A" || g === "B";

export function judgeSeal(card: FugueCard, r: RunFacts): SealVerdict {
  if (!card.ready) return { earned: false, why: "This seal is not judged yet." };
  if (!r.whole) return { earned: false, why: "A seal is earned only playing from the first bar." };
  const played = new Set(r.tracks.map((t) => t.voice));
  const fEntries = r.f.entries;
  const mine = r.entries.filter((e) => played.has(e.voice));
  const stateOf = (on: number, voice: number) => mine.find((e) => e.on === on && e.voice === voice)?.state;
  const all = (list: { on: number; voice: number }[], what: string): SealVerdict => {
    if (!list.length) return { earned: false, why: `This voice has no ${what}: try another.` };
    const got = list.filter((e) => stateOf(e.on, e.voice) === "captured").length;
    return got === list.length ? { earned: true, why: `Every ${what} captured.` } : { earned: false, why: `${got} of ${list.length} ${what}s captured.` };
  };
  switch (card.seal.kind) {
    case "STRETTO": {
      const over = fEntries.filter((a) => played.has(a.voice) && fEntries.some((b) => b !== a && b.on < a.end && a.on < b.end));
      return all(over, "stretto entry");
    }
    case "MIRROR":
      return all(fEntries.filter((e) => played.has(e.voice) && e.inverted), "inverted entry");
    case "SLOW GIANT":
      return all(fEntries.filter((e) => played.has(e.voice) && e.scale === 2), "augmented entry");
    case "SUBJECTS": {
      const themes = [...new Set(fEntries.filter((e) => played.has(e.voice)).map((e) => e.theme ?? 1))];
      if (themes.length < 2) return { earned: false, why: "This voice has only one subject: try another." };
      const missing = themes.filter((t) => !fEntries.some((e) => played.has(e.voice) && (e.theme ?? 1) === t && stateOf(e.on, e.voice) === "captured"));
      return missing.length ? { earned: false, why: `Subject ${missing.join(", ")} not captured.` } : { earned: true, why: "Every subject captured." };
    }
    case "PERFECT LINE":
      return all(fEntries.filter((e) => played.has(e.voice)), "entry");
    case "HOLD": {
      const long = r.tracks.flatMap((t) => t.notes.filter((n, i) => !n.ride && n.dur >= r.beat * 1.5 && !(i > 0 && t.notes[i - 1].on === n.on)));
      if (long.length < 3) return { earned: false, why: "This voice has too few long notes: try another." };
      const held = long.filter((n) => n.state === "hit" && (n.off === undefined || n.off >= n.on + n.dur * 0.7)).length;
      return held === long.length ? { earned: true, why: "Every long note held." } : { earned: false, why: `${held} of ${long.length} long notes held.` };
    }
    case "NO SLIP": {
      const es = fEntries.filter((e) => played.has(e.voice));
      if (!es.length) return { earned: false, why: "This voice has no entry: try another." };
      const from = Math.min(...es.map((e) => e.on));
      const to = Math.max(...es.map((e) => e.end));
      const slips = r.tracks.flatMap((t) => t.notes.filter((n) => !n.ride && n.on >= from && n.on < to && n.state !== "hit")).length;
      return slips ? { earned: false, why: `${slips} slips between the first entry and the last.` } : { earned: true, why: "No slip from the first entry to the last." };
    }
    case "DUET":
      // D219: TWO VOICES withdrawn: the seal is not offered (its cards are never ready).
      return { earned: false, why: "This seal is not offered." };
    case "TEMPERAMENT": {
      const named = TEMPERAMENTS.find((t) => t.id !== "equal" && card.seal.line.toUpperCase().includes(t.name.split(" (")[0]));
      if (named ? r.tuning !== named.id : r.tuning === "equal") return { earned: false, why: named ? `Play it in ${named.name} (⚙ TUNING).` : "Play it in a historical tuning (⚙ TUNING)." };
      return good(r.grade) ? { earned: true, why: "Grade A in a well temperament." } : { earned: false, why: "Grade A is needed." };
    }
  }
}

/** The seals earned, per piece and voice, kept on this device. */
export const SEALS_KEY = "tb-seals-v1";

export function readSeals(): Record<string, true> {
  try {
    const v = localStorage.getItem(SEALS_KEY);
    const o = v ? (JSON.parse(v) as unknown) : {};
    return o && typeof o === "object" ? (o as Record<string, true>) : {};
  } catch {
    return {};
  }
}

export function recordSeal(piece: string, voices: number[]) {
  try {
    const s = readSeals();
    for (const v of voices) s[`${piece}:${v}`] = true;
    localStorage.setItem(SEALS_KEY, JSON.stringify(s));
  } catch {
    /* not kept */
  }
}
