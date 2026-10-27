/**
 * D237, the minimal published page (play.html): Book I's pairs as a grid of cards, prelude and fugue
 * both open from the start. The tiers by the fugue's stars (tiers.ts) appear one after another as
 * pieces are FINISHED (played to the end without the crowd leaving; preludes and fugues both count):
 * INTERMEDIATE after 5 EASY pieces, HARD after 5 INTERMEDIATE, the BOSS (I/24) after all the others.
 * Kept on the device under its own key (`tb-lite-v1`), apart from the bench's progress: the pieces
 * finished, the modes whose one-line instruction has been seen, and the volume.
 */
import { tierFugues, tierOf, TIER_ORDER, type Tier } from "./tiers.ts";
import { detectedPlatform, platformOf, type PlatformPref } from "./home.ts";
import { unlocked } from "./unlock.ts";
import type { Platform } from "./protos.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";
import { CHORALE_INDEX, fugueById, MORE_INDEX, type Collection } from "../touch/fugue.ts";
import { difficultyOf } from "./difficulty.ts";

/**
 * D340 (WTC 1.54): play.html's tabs: BOOK I, BOOK II, MORE BACH (the Art of Fugue, the Musical
 * Offering's ricercars, the Inventions, the Sinfonias, the Concerto for Two Violins: tools/touch/more-bach.ts)
 * and CHORALES (Bach's 370 four-part chorales: tools/touch/chorales.ts).
 */
export type LiteTab = "I" | "II" | "MORE" | "CHORALES";
export const LITE_TABS: readonly [LiteTab, string][] = [
  ["I", "BOOK I"],
  ["II", "BOOK II"],
  ["MORE", "MORE BACH"],
  ["CHORALES", "CHORALES"],
];
/** D343: the tabs play.html shows: Book I alone for the friends (no tab bar), all four once unlocked (unlock.ts). */
export const liteTabs = (): readonly [LiteTab, string][] => (unlocked() ? LITE_TABS : LITE_TABS.slice(0, 1));
/** D340: the MORE BACH tab's sections, in order, each its pieces (Contrapunctus 14, the unfinished fugue of pieces.json, closes the Art of Fugue). */
const SECTION_OF: readonly [Collection, string][] = [
  ["aof", "ART OF FUGUE"],
  ["mo", "MUSICAL OFFERING"],
  ["inv", "INVENTIONS"],
  ["sin", "SINFONIAS"],
  ["concerto", "CONCERTO"],
  // D341: the motet BWV 228 and the cantata BWV 54 (IMSLP editions, non-commercial licences).
  ["motet", "MOTET"],
  ["cantata", "CANTATA"],
];
export const MORE_SECTIONS: readonly { id: Collection; title: string; ids: string[] }[] = SECTION_OF.map(([id, title]) => ({
  id,
  title,
  ids: [...MORE_INDEX.filter(([, c]) => c === id).map(([f]) => f), ...(id === "aof" ? ["bwv1080-14"] : [])],
}));
// D343: from the index (the notes load on demand: fugue.ts loadExtras).
export const CHORALE_IDS: readonly string[] = CHORALE_INDEX;
const EXTRA = new Set([...MORE_SECTIONS.flatMap((s) => s.ids), ...CHORALE_IDS]);
/** D340: a piece of the MORE BACH or CHORALES tab. */
export const liteExtra = (id: string): boolean => EXTRA.has(id);
/** D340: the tab a piece is listed under. */
export const liteTabOf = (id: string): LiteTab => (CHORALE_IDS.includes(id) ? "CHORALES" : EXTRA.has(id) ? "MORE" : id.startsWith("wtc2") ? "II" : "I");
/** D340: what NEXT follows a piece with: its own tab's list. */
export function liteNextOrder(id: string, fuguesOnly = false): string[] {
  const tab = liteTabOf(id);
  // D343: Book I's last fugue ends the list for the friends (Book II behind the unlock).
  return tab === "CHORALES" ? [...CHORALE_IDS] : tab === "MORE" ? MORE_SECTIONS.flatMap((s) => s.ids) : liteAll(fuguesOnly).filter((x) => unlocked() || x.startsWith("wtc1"));
}

/**
 * D263: the minimal page's platform: as detected, or as chosen in its ⚙ (MOBILE · COMPUTER, kept on the
 * device); on a phone only the fugues (the owner: "eliminate all preludes from mobile mode ... the fugues
 * are much more interesting. We should focus on LADDER mobile").
 */
export const LITE_PLATFORM_KEY = "tb-lite-platform";
export function litePlatformPref(): PlatformPref {
  try {
    const v = localStorage.getItem(LITE_PLATFORM_KEY);
    return v === "mobile" || v === "computer" ? v : "auto";
  } catch {
    return "auto";
  }
}
export function saveLitePlatform(p: PlatformPref) {
  try {
    if (p === "auto") localStorage.removeItem(LITE_PLATFORM_KEY);
    else localStorage.setItem(LITE_PLATFORM_KEY, p);
  } catch {
    /* this visit only */
  }
}
/**
 * D343: play.html plays only on phones and tablets (a computer is shown MOBILE ONLY), so always the phone's
 * modes; once unlocked (unlock.ts) as detected or as chosen in ⚙ PLAY ON, as before.
 */
export const litePlatform = (): Platform => (unlocked() ? platformOf(litePlatformPref(), detectedPlatform()) : "mobile");
/** D263: where a new player starts: Prelude 1 on a computer, Fugue 1 on a phone (no preludes there). */
export const startHere = (fuguesOnly: boolean): string => (fuguesOnly ? "wtc1f01" : START_HERE);

export const LITE_KEY = "tb-lite-v1";

export interface LiteState {
  /** The pieces finished (preludes and fugues, by id). */
  beaten: string[];
  /** The modes whose instruction line has been shown and played past. */
  seen: string[];
  /** The sound's volume, 0..1. */
  volume: number;
  /** D265: the best grade each piece was finished with. */
  best: Record<string, string>;
  /** D268: the best final score each piece was finished with. */
  scores: Record<string, number>;
  /** D337: the judging each best grade in `best` was earned under (JUDGING; one without was earned before 1.52, moved to bestOld). */
  bestV: Record<string, string>;
  /** D337: the judging each best score in `scores` was made under. */
  scoresV: Record<string, string>;
  /** D337: the best grades earned before WTC 1.52 (judged otherwise: kept, shown apart, "before 1.52"). */
  bestOld: Record<string, string>;
  /** D337: the best scores made before WTC 1.52. */
  scoresOld: Record<string, number>;
}

/**
 * D337 (WTC 1.52): the game's judging became B+ · PREPARED (mechanics.ts MECH_DEFAULTS), so a best made
 * before is no longer comparable: each best is kept with the judging it was made under; those from
 * before (none named) are kept apart as "before 1.52", never deleted, and the new best is counted afresh.
 */
export const JUDGING = "1.52";
export const BEFORE_JUDGING = "BEFORE 1.52";

/** D265: a piece's sound can be changed once it is finished with a high grade (A or S); before, its own. */
export const SOUND_UNLOCK_GRADES = ["S", "A"];
// D337: a grade earned before 1.52 still unlocks (what was earned stays earned).
export const soundUnlocked = (id: string, st: LiteState = readLite()): boolean => SOUND_UNLOCK_GRADES.includes(st.best[id] ?? "") || SOUND_UNLOCK_GRADES.includes(st.bestOld[id] ?? "");
const RANK = ["D", "C", "B", "A", "S"];

export function readLite(): LiteState {
  try {
    const v = localStorage.getItem(LITE_KEY);
    const o = v ? (JSON.parse(v) as Partial<LiteState>) : {};
    const strings = (x: unknown) => (x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([, g]) => typeof g === "string")) : {}) as Record<string, string>;
    const numbers = (x: unknown) => (x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([, n]) => typeof n === "number" && Number.isFinite(n))) : {}) as Record<string, number>;
    const best = strings(o.best);
    const scores = numbers(o.scores);
    const bestV = strings(o.bestV);
    const scoresV = strings(o.scoresV);
    const bestOld = strings(o.bestOld);
    const scoresOld = numbers(o.scoresOld);
    // D337: a best with no judging named was made before 1.52: kept apart (written back with the next change).
    for (const [id, g] of Object.entries(best)) if (!bestV[id]) ((bestOld[id] ??= g), delete best[id]);
    for (const [id, n] of Object.entries(scores)) if (!scoresV[id]) ((scoresOld[id] ??= n), delete scores[id]);
    return {
      beaten: Array.isArray(o.beaten) ? o.beaten.filter((x) => typeof x === "string") : [],
      seen: Array.isArray(o.seen) ? o.seen.filter((x) => typeof x === "string") : [],
      volume: typeof o.volume === "number" && o.volume >= 0 && o.volume <= 1 ? o.volume : 1,
      best,
      scores,
      bestV,
      scoresV,
      bestOld,
      scoresOld,
    };
  } catch {
    return { beaten: [], seen: [], volume: 1, best: {}, scores: {}, bestV: {}, scoresV: {}, bestOld: {}, scoresOld: {} };
  }
}
export function writeLite(patch: Partial<LiteState>): LiteState {
  const next = { ...readLite(), ...patch };
  try {
    localStorage.setItem(LITE_KEY, JSON.stringify(next));
  } catch {
    /* no storage: this visit only */
  }
  return next;
}

/**
 * D264: every piece open from the start (the owner: "All fugues unlocked from the start, but each card
 * has the color of its difficulty, and also says EASY in green, or NORMAL yellow, HARD in red"): Book I
 * in Bach's order, each pair's prelude then its fugue (on a phone the fugues only).
 */
export const liteAll = (fuguesOnly = false): string[] =>
  [
    ...Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, "0")).flatMap((n) => (fuguesOnly ? [`wtc1f${n}`] : [`wtc1p${n}`, `wtc1f${n}`])),
    // D275: then Book II's fugues.
    ...Array.from({ length: 24 }, (_, i) => `wtc2f${String(i + 1).padStart(2, "0")}`),
  ];
/** D264: a piece's difficulty as its card shows it (its fugue's tier): EASY green, NORMAL yellow, HARD red (the BOSS among the hard). */
export const LITE_LEVELS = { EASY: { label: "EASY", ink: "#5fdc6a" }, NORMAL: { label: "NORMAL", ink: "#e8c94a" }, HARD: { label: "HARD", ink: "#ec5a4a" } } as const;
const extraLevels = new Map<string, { label: string; ink: string }>();
export function liteLevel(id: string): { label: string; ink: string } {
  // D340: the MORE BACH and CHORALES tabs' pieces by their own stars (difficulty.ts, measured as the WTC's: ★–★★ EASY, ★★★ NORMAL, more HARD).
  if (liteExtra(id)) {
    const hit = extraLevels.get(id);
    if (hit) return hit;
    const s = difficultyOf(fugueById(id)).stars;
    const lv = s <= 2 ? LITE_LEVELS.EASY : s === 3 ? LITE_LEVELS.NORMAL : LITE_LEVELS.HARD;
    extraLevels.set(id, lv);
    return lv;
  }
  const t = tierOf(id);
  return t === "EASY" ? LITE_LEVELS.EASY : t === "INTERMEDIATE" ? LITE_LEVELS.NORMAL : LITE_LEVELS.HARD;
}

/** A tier's cards, in Bach's order, each pair's prelude then its fugue. */
export const litePieces = (t: Tier, fuguesOnly = false): string[] => tierFugues(t).flatMap((f) => (fuguesOnly ? [f] : [f.replace(/^wtc1f/, "wtc1p"), f]));

/** Pieces finished in a tier that show the next one (the BOSS: every other piece). */
export const LITE_STEP = 5;

/** How many more pieces must be finished to show a tier (0: its condition met). */
export function liteToGo(t: Tier, beaten: ReadonlySet<string>, fuguesOnly = false): number {
  const i = TIER_ORDER.indexOf(t);
  if (i <= 0) return 0;
  const left = (ids: string[]) => ids.filter((id) => !beaten.has(id)).length;
  if (t === "BOSS") return left(TIER_ORDER.filter((x) => x !== "BOSS").flatMap((x) => litePieces(x, fuguesOnly)));
  const before = litePieces(TIER_ORDER[i - 1], fuguesOnly);
  return Math.max(0, LITE_STEP - (before.length - left(before)));
}

/** The tiers shown, in order (each needs the one before it shown). */
export function liteTiers(beaten: ReadonlySet<string>, fuguesOnly = false): Tier[] {
  const out: Tier[] = [];
  for (const t of TIER_ORDER) {
    if (liteToGo(t, beaten, fuguesOnly) > 0) break;
    out.push(t);
  }
  return out;
}

/** The cards shown, in the grid's order. */
export const liteOrder = (beaten: ReadonlySet<string>, fuguesOnly = false): string[] => liteTiers(beaten, fuguesOnly).flatMap((t) => litePieces(t, fuguesOnly));

/** "5 MORE TO UNLOCK INTERMEDIATE"; empty once every tier is shown. */
export function liteLine(beaten: ReadonlySet<string>, fuguesOnly = false): string {
  const shown = liteTiers(beaten, fuguesOnly);
  const t = TIER_ORDER.find((x) => !shown.includes(x));
  return t ? `${liteToGo(t, beaten, fuguesOnly)} MORE TO UNLOCK ${t}` : "";
}

/**
 * A run ended: a piece finished (to its end, `failed` false) is kept. Returns the tiers this run
 * showed (for the result's line).
 */
export function recordLite(piece: string, failed: boolean, fuguesOnly = false, grade?: string): Tier[] {
  const st = readLite();
  // D265: the best grade kept (a finished run's). D337: against the bests of today's judging only, kept with it.
  if (!failed && grade && RANK.indexOf(grade) > RANK.indexOf(st.best[piece] ?? "")) writeLite({ best: { ...st.best, [piece]: grade }, bestV: { ...st.bestV, [piece]: JUDGING } });
  // D340: the MORE BACH and CHORALES pieces are kept as finished too (their ✓).
  if (failed || st.beaten.includes(piece) || !(/^wtc1[pf]\d\d$|^wtc2f\d\d$/.test(piece) || liteExtra(piece))) return [];
  const before = liteTiers(new Set(st.beaten), fuguesOnly);
  const beaten = [...st.beaten, piece];
  writeLite({ beaten });
  return liteTiers(new Set(beaten), fuguesOnly).filter((t) => !before.includes(t));
}

/**
 * D268: a finished run's final score against the piece's best: the best before it, and whether it is a new
 * one (kept). D337: against today's judging's best only (kept with JUDGING); `old`, the best from before
 * 1.52 (another judging: shown apart, never beaten or replaced).
 */
export function recordLiteBest(piece: string, final: number): { before: number | null; fresh: boolean; old: number | null } {
  const st = readLite();
  const before = st.scores[piece] ?? null;
  const fresh = before === null || final > before;
  if (fresh) writeLite({ scores: { ...st.scores, [piece]: final }, scoresV: { ...st.scoresV, [piece]: JUDGING } });
  return { before, fresh, old: st.scoresOld[piece] ?? null };
}

/** The one-line instruction shown at the start of the first game in each mode (D239: the two grades of a right note). */
export const LITE_HINT: Record<string, string> = {
  ladder: "touch either bar at the note's height · hand over from thumb to thumb with no gap",
  highway: "tap the note's lane as it lands: full points · another lane the right way (right = up, left = down): half",
  keys: "press the lane's key as the note lands: full points · another key the right way: half · SPACE repeats",
};

/**
 * D239: how each mode is played, behind ? HOW TO PLAY on the pop-up (bench and play.html): a few
 * short lines, the two grades of a right note on the HIGHWAYs spelled out. D344 (WTC 1.56; the owner:
 * "can be long, as long as you divide into BASICS, INTERMEDIARY, and ADVANCED"): each mode's lines in
 * three levels, folded on the pop-up (BASICS open); RULES keeps them in one list, in that order.
 * Checked against the game's mechanics as of WTC 1.52+ (B+ · PREPARED: a landing is the strike, the
 * prepared note and the pull-off, runs judged as a whole, the reading's accent by time, ornaments unscored).
 */
export interface RuleLevels {
  basics: readonly string[];
  intermediate: readonly string[];
  advanced: readonly string[];
}
export const RULE_LEVELS: Record<string, RuleLevels> = {
  keys: {
    basics: [
      "Notes come down the road. Press the key of their lane (A S D F · G · H J K L) as they reach the line.",
      "THE LANE'S KEY: full points, a bright chime and LANE ✓.",
      "The wrong way or off the beat: a miss. SPACE plays the same note again. Miss too many and the crowd leaves.",
    ],
    intermediate: ["ANOTHER KEY THE RIGHT WAY (further right as the tune rises, left as it falls): half the points, a duller note and ~. Your streak is kept."],
    advanced: [],
  },
  highway: {
    basics: [
      "Notes come down five lanes. Tap the note's lane as it reaches the line.",
      "THE NOTE'S LANE: full points, a bright chime and LANE ✓.",
      "The wrong way or off the beat: a miss. Miss too many and the crowd leaves.",
    ],
    intermediate: ["ANOTHER LANE THE RIGHT WAY (further right as the tune rises, left as it falls): half the points, a duller note and ~. Your streak is kept."],
    advanced: [],
  },
  ladder: {
    basics: [
      "Hold the phone sideways, a thumb on each bar.",
      "Touch either bar, anywhere along it, as the note reaches the line: higher as the tune rises, lower as it falls.",
      // D344: the game's own words for a note's grades and its end (proto-game.ts: PERFECT, GOOD, HELD, SHORT, REST!).
      "Your thumb's landing is the note: on the line, PERFECT; a little early or late, GOOD.",
      "Keep the thumb down for the note's length (HELD); lifted too soon is SHORT. Where the music rests, lift: held through a rest is REST!",
      "Let the thumbs take turns, each note on the other thumb: the easiest way to keep up.",
      "Miss too many and the crowd leaves.",
      // D344: the friends' backing track (LiteDrums.tsx).
      "DRUMS ON (on this box, before you play) adds a backing track. It never changes the score.",
    ],
    intermediate: [
      // D337 (WTC 1.52): B+ · PREPARED, the game's: a landing is the strike; a thumb resting early sounds on the other's lift.
      "To join two notes: strike the next on time while the other thumb holds, or rest it on its note early and lift the other: the lift sounds it (a pull-off). Nothing sounds by itself.",
      // D325: articulation by intention (intention.ts), no longer "LEGATO scores more".
      "Your touch is yours: joined (legato), ordinary or detached. ARTICULATION scores a touch kept even, not legato itself.",
      // D314: the ornaments, as THE ORNAMENT lesson teaches them (D338: unscored).
      "A sign over a note (TR, ~|) is an ornament: touch the note, then shake your thumb up and down along the bar (a mordent: down and back). Done before the note ends: TRILL ✓; done or not, it never scores or costs.",
      // D344: the subject's marks (readings.ts); their legend follows on the pop-up.
      "Marks over the subject (dot, stroke, slur, wedge) come from a book on playing the fugue: follow them and the subject's notes earn a little more; missing them costs nothing. HEAR THE SUBJECT plays and draws them.",
    ],
    advanced: [
      "In fast runs either thumb may lead: keep the run moving the right way, and it is judged as a whole.",
      // D325b: expressive time.
      "Time is a little yours too: a strong beat or a dissonance held back, a breath at a rest or a cadence, a broadening at the end are still PERFECT if you come back to the beat.",
      // D338: the reading's accent by time.
      "An accent (>) is made with time, not force: let go of the note before a moment early, lean into the accent a hair late and hold it its full length. Loudness is never judged.",
      // D186, D194: the bonuses.
      "Bonuses: a whole entry of the subject without a miss (ORGANO PLENO!; a voice's last entry is its BOSS), and a cadence reached on an unbroken run.",
      // D311: the across axis, the player's (shapes the sound, never the score). D314: its strong side by STRONG_SIDE.
      STRONG_SIDE === "outer"
        ? "Across the bar is yours: by the box softer and darker, by the edge firmer and brighter; move a held thumb sideways to shape the note. It never costs or earns points."
        : "Across the bar is yours: by the edge softer and darker, by the box firmer and brighter; move a held thumb sideways to shape the note. It never costs or earns points.",
      "Any other note you hold may take your own ornament: shake quickly along the bar (down and back: a mordent; on and on: a trill). It sounds, and never scores or costs.",
    ],
  },
};
/** Every mode's lines in one list (BASICS, then INTERMEDIATE, then ADVANCED). */
export const RULES: Record<string, string[]> = Object.fromEntries(Object.entries(RULE_LEVELS).map(([id, l]) => [id, [...l.basics, ...l.intermediate, ...l.advanced]]));

/** The piece every new player starts on: Prelude 1 in C major. */
export const START_HERE = "wtc1p01";
