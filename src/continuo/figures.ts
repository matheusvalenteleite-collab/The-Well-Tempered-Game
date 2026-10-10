/**
 * Figures as a thorough-bass player reads them (D101), from the full interval stack the realizer
 * computes ("5/3", "♯6/3", "8/5/3", "7/5/♯3"). The conventions of the figured-bass treatises
 * (e.g. Heinichen 1728, C. P. E. Bach 1762; summarised in F. T. Arnold, The Art of Accompaniment
 * from a Thorough-Bass, 1931):
 *   - the common chord (5/3, with or without the octave) is not figured at all;
 *   - only the characteristic numbers are written: 6 for 6/3, 6/4, 7 for 7/5/3, 6/5 for 6/5/3,
 *     4/3 for 6/4/3, 4/2 for 6/4/2, 9 for 9/5/3;
 *   - an accidental standing alone alters the third (♯, ♭, ♮);
 *   - an accidental before a number alters that interval (♭7, ♮6), except that a raised sixth
 *     or fourth is written with a stroke through the numeral (6⃥, 4⃥);
 *   - suspensions and passing figures are written as the succession of their numbers (4 3, 7 6).
 * The stroke is marked here by a trailing "\" for the renderer to draw.
 */

type Token = { n: number; acc: string };

const parse = (fig: string): Token[] =>
  fig
    .split("/")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const m = /^([♯♭♮#b]*)(\d+)$/.exec(t);
      return m ? { n: Number(m[2]), acc: m[1].replace(/#/g, "♯").replace(/b/g, "♭") } : { n: NaN, acc: t };
    });

/** One number with its accidental: a raised 6 or 4 takes the stroke. */
const numeral = (t: Token) => (t.acc === "♯" && (t.n === 6 || t.n === 4) ? `${t.n}\\` : `${t.acc}${t.n}`);

/** The figure of one chord, as stacked lines (top first); [] for an unfigured common chord. */
export function conventionalFigure(fig: string): string[] {
  const tokens = parse(fig);
  if (tokens.some((t) => Number.isNaN(t.n))) return fig ? [fig] : [];
  // The octave (and unison) is never figured unless altered.
  const ts = tokens.filter((t) => !((t.n === 8 || t.n === 1) && !t.acc));
  const has = (n: number) => ts.find((t) => t.n === n);
  const set = ts.map((t) => t.n).sort((a, b) => a - b).join(",");
  const third = has(3);
  /** The altered third, shown as its accidental alone, under the numbers. */
  const thirdMark = third?.acc ? [third.acc] : [];
  const show = (...ns: number[]) => ns.map((n) => numeral(has(n)!));
  switch (set) {
    case "":
    case "3":
    case "5":
    case "3,5": {
      const fifth = has(5);
      return [...(fifth?.acc ? [numeral(fifth)] : []), ...thirdMark];
    }
    case "3,6":
    case "6":
      return [...show(6), ...thirdMark];
    case "4,6":
      return show(6, 4);
    case "3,5,7":
    case "3,7":
    case "5,7":
      return [...show(7), ...thirdMark];
    case "3,5,6":
    case "5,6":
      return show(6, 5);
    case "3,4,6":
    case "3,4":
      return show(4, 3);
    case "2,4,6":
    case "2,4":
      return show(4, 2);
    case "3,5,9":
    case "3,9":
      return [...show(9), ...thirdMark];
    default:
      return [...ts].sort((a, b) => b.n - a.n).map(numeral);
  }
}
