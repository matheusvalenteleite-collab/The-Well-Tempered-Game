/**
 * P22: the listening guide's written notes: what published commentators said of particular
 * chorales (Pirro, Spitta, Schweitzer, Whittaker, Parry), each note pinned to its bar and carrying
 * its citation (data/playback/chorale-commentary.json; the research in docs/playback/LISTENING-GUIDE.md).
 */
import data from "../../data/playback/chorale-commentary.json" with { type: "json" };

/** A note of the guide: the chorale session's observations (C28) or a commentator's. */
export interface GuideItem {
  at: number;
  kind: string;
  text: string;
  /** For a commentator's note: author, title, year, page. */
  cite?: string;
}

interface Row { n: number; bar: number; work: string; page: string; text: string }
const D = data as unknown as { works: Record<string, string>; notes: Row[] };

/**
 * The commentators' notes on Bach's chorale `n`. Bars are the edition's measures (an upbeat is bar 0);
 * `barUnits` and `pickup` (32nds) place them on the study's grid.
 */
export function commentaryFor(n: number, barUnits: number, pickup: number): GuideItem[] {
  const shift = pickup ? barUnits - pickup : 0;
  return D.notes
    .filter((r) => r.n === n)
    .map((r) => {
      const drawn = pickup ? r.bar : Math.max(0, r.bar - 1);
      return { at: Math.max(0, drawn * barUnits - shift), kind: "commentary", text: r.text, cite: `${D.works[r.work]}, p. ${r.page}` };
    });
}

/** The guide's notes in time order: the commentators' first where both fall at one onset. */
export function mergeGuide(observed: GuideItem[], written: GuideItem[]): GuideItem[] {
  return [...written, ...observed].sort((a, b) => a.at - b.at);
}
