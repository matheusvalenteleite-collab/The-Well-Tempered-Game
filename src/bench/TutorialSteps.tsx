/**
 * D280: the TUTORIAL's steps (play.html, a phone): each step by name, ✓ once passed; the first always
 * open, then those passed and the next one (the owner: "only completed steps available ... except 1").
 */
import { TRACKS } from "./lessons.ts";
import { nextLesson, trackState } from "./tutorial.ts";

export function TutorialSteps({ play, close }: { play: (n: number) => void; close: () => void }) {
  const track = TRACKS.mobile;
  const st = trackState("mobile");
  const next = nextLesson("mobile");
  return (
    <div className="tb-hear-wrap" role="dialog" aria-label="Tutorial steps" onClick={close}>
      <div className="tg-card tb-hear tb-steps" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tg-x tb-hear-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-hear-title">TUTORIAL · INVENTION 1 WITH HERR BACH</h2>
        <ol className="tb-steps-list">
          {track.map((l, n) => {
            const done = !!st.passed[l.id];
            const open = n === 0 || done || n === next;
            return (
              <li key={l.id}>
                <button type="button" id={`step-${l.id}`} className={`tb-step${done ? " done" : ""}${n === next && !done ? " next" : ""}`} disabled={!open} onClick={() => play(n)}>
                  <span className="tb-step-n">{n + 1}</span>
                  <span className="tb-step-name">{l.english}</span>
                  <span className="tb-step-mark">{done ? "✓" : open ? "▶" : "🔒"}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
