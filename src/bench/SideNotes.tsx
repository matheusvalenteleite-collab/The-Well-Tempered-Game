/**
 * D327: the round's opening words moved off the first subject (the panel: "On I/2 the banner and the
 * legend sit on top of the subject at the very moment I need to read it"). On the two bars (LADDER) the
 * mode's one-line instruction stands in the left side bar and the reading's marks explained (D314) in the
 * right one, under ACCURACY, SUBJECTS and the crowd; the box keeps the music. The legend fades by the
 * game's clock (BenchApp sets the ref's opacity); neither takes a touch.
 */
import type { Ref } from "react";
import { legendLines, shortLegend, type Mark } from "./side-notes.ts";
import { tr } from "../i18n/index.ts";
import { wholeLegend, type WholeBox } from "../touch/whole-marks.ts";

/** D359: `fade`: THE MANUAL's demonstration names its manner, then the hint fades off the bar the thumbs play on. */
/** Design studio (D397): placed in the box behind the gold line by BenchApp each frame (`hintRef`). */
export function SideHint({ text, fade = false, hintRef }: { text: string; fade?: boolean; hintRef?: Ref<HTMLParagraphElement> }) {
  return (
    <p className={`tb-lite-hint tb-side-hint${fade ? " tb-side-hint-fade" : ""}`} id="lite-hint" role="status" ref={hintRef}>
      {text}
    </p>
  );
}

/**
 * D391: with a whole-piece reading (BUSONI) its other signs follow the judged ones (whole-marks.ts
 * wholeLegend), and under the legend, kept while it fades, the word in force on the player's line as
 * printed and translated (BenchApp sets it through `glossRef` as each word is passed).
 */
export function SideLegend({ marks, legendRef, whole, glossRef }: { marks: Iterable<Mark>; legendRef: Ref<HTMLDivElement>; whole?: WholeBox; glossRef?: Ref<HTMLParagraphElement> }) {
  const lines = legendLines(marks);
  const more = whole ? wholeLegend(whole) : [];
  if (!lines.length && !more.length) return null;
  // D483: with BUSONI's signs, the short lines (they fit between the crowd and the stops at 375 px).
  const say = (l: { kind: string; text: string }) => {
    const s = more.length ? shortLegend(l.kind) : undefined;
    return s ? tr(s) : l.text;
  };
  return (
    <>
      <div className={`tb-side-legend${more.length ? " tb-side-legend-whole" : ""}`} id="side-legend" ref={legendRef} aria-hidden="true">
        {lines.map((l) => (
          <p key={l.kind}>
            <b className={`tb-mark tb-mark-${l.kind}`}>{l.sym}</b> {say(l)}
          </p>
        ))}
        {more.map((l) => (
          <p key={`w-${l.kind}`}>
            <b className={`tb-mark tb-mark-w-${l.kind}`}>{l.sym}</b> {say(l)}
          </p>
        ))}
      </div>
      {whole && <p className="tb-side-gloss" id="side-gloss" ref={glossRef} aria-live="polite" />}
    </>
  );
}
