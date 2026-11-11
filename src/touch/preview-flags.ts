/**
 * Design studio (D480-D484 previews; the owner's play-screen batch): test-build flags, read once from the address, so
 * the owner can play each proposal on the phone before choosing. Nothing changes without a flag.
 *   ?line=center  the play line in the middle, the same seconds a pixel (less look-ahead)
 *   ?line=wide    the play line in the middle, the span widened so the look-ahead is unchanged (notes narrower)
 *   ?map=strip    THE FUGUE'S BUILDING as a strip over the voice legend at the box's foot
 *   ?map=inline   the map inside the legend's own line, beside the voices
 *   ?inner=fill|pulse|shimmer  a sounding note's animation inside its block, every voice
 *   ?arch=1       every voice's notes full height and clearly lit; the subject's light and skin on top
 */
const q = (k: string): string | null => {
  try {
    return typeof location !== "undefined" ? new URLSearchParams(location.search).get(k) : null;
  } catch {
    return null;
  }
};
const LINE = q("line");
export const lineFlag: "center" | "wide" | null = LINE === "center" || LINE === "wide" ? LINE : null;
/** The play line's place across the box between the bars (0.25 today). */
export const playheadShare = (): number => (lineFlag ? 0.5 : 0.25);
/** The span's factor: 1, or 1.5 so the look-ahead (the share after the line) stays what it was. */
export const spanFactor = (): number => (lineFlag === "wide" ? 1.5 : 1);
const MAP = q("map");
export const mapFlag: "strip" | "inline" | null = MAP === "strip" || MAP === "inline" ? MAP : null;
const INNER = q("inner");
export const innerFlag: "fill" | "pulse" | "shimmer" | null = INNER === "fill" || INNER === "pulse" || INNER === "shimmer" ? INNER : null;
export const archFlag: boolean = q("arch") === "1";
if (mapFlag && typeof document !== "undefined") document.documentElement.classList.add(`tb-map-${mapFlag}`);
