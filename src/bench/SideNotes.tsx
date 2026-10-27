/**
 * D327: the round's opening words moved off the first subject (the panel: "On I/2 the banner and the
 * legend sit on top of the subject at the very moment I need to read it"). On the two bars (LADDER) the
 * mode's one-line instruction stands in the left side bar and the reading's marks explained (D314) in the
 * right one, under ACCURACY, SUBJECTS and the crowd; the box keeps the music. The legend fades by the
 * game's clock (BenchApp sets the ref's opacity); neither takes a touch.
 */
import type { Ref } from "react";
import { legendLines, type Mark } from "./side-notes.ts";

export function SideHint({ text }: { text: string }) {
  return (
    <p className="tb-lite-hint tb-side-hint" id="lite-hint" role="status">
      {text}
    </p>
  );
}

export function SideLegend({ marks, legendRef }: { marks: Iterable<Mark>; legendRef: Ref<HTMLDivElement> }) {
  const lines = legendLines(marks);
  if (!lines.length) return null;
  return (
    <div className="tb-side-legend" id="side-legend" ref={legendRef} aria-hidden="true">
      {lines.map((l) => (
        <p key={l.kind}>
          <b className={`tb-mark tb-mark-${l.kind}`}>{l.sym}</b> {l.text}
        </p>
      ))}
    </div>
  );
}
