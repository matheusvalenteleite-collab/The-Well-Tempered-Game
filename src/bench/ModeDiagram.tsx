/**
 * D219: each mode's rules as a picture (the owner: "use visual representation, be concise"): pixel
 * key-caps for the computer's modes, lane and bar pictograms for the phone's. Drawn in CSS (bench.css
 * .tb-dia), on the title card, in ⚙ and in the help screen.
 */
import type { ProtoId } from "./protos.ts";
import { HOME_ROW } from "./settings-logic.ts";

const Cap = ({ k, sub, cls = "" }: { k: string; sub?: string; cls?: string }) => (
  <kbd className={`tb-cap ${cls}`}>
    {k}
    {sub && <small>{sub}</small>}
  </kbd>
);

export function ModeDiagram({ id }: { id: ProtoId }) {
  switch (id) {
    case "keys":
      return (
        <div className="tb-dia tb-dia-keys" aria-label="Left hand on A S D F, right hand on H J K L, G shared by both index fingers, thumbs on space">
          <div className="tb-dia-hands">
            <span className="tb-hand-left">◀ LEFT HAND</span>
            <span className="tb-hand-both">SHARED</span>
            <span className="tb-hand-right">RIGHT HAND ▶</span>
          </div>
          <div className="tb-dia-row">
            {HOME_ROW.map((k) => (
              <Cap key={k.key} k={k.key} cls={`tb-cap-${k.hand}`} />
            ))}
          </div>
          <Cap k="SPACE" sub="THUMBS · SAME NOTE" cls="tb-cap-space" />
        </div>
      );
    case "arrows":
      return (
        <div className="tb-dia tb-dia-arrows" aria-label="Right a step up, left a step down, up a leap up, down a leap down, space the same note">
          <div className="tb-dia-cluster">
            <span />
            <Cap k="↑" sub="LEAP ▲" />
            <span />
            <Cap k="←" sub="STEP ▼" />
            <Cap k="↓" sub="LEAP ▼" />
            <Cap k="→" sub="STEP ▲" />
          </div>
          <Cap k="SPACE" sub="SAME NOTE" cls="tb-cap-space" />
          <p className="tb-dia-note">OR W A S D</p>
        </div>
      );
    case "piano": {
      const white = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
      // The black keys, each over the gap after a white key (A is C: none after E and B).
      const black: [string, number][] = [["W", 0], ["E", 1], ["T", 3], ["Y", 4], ["U", 5], ["O", 7]];
      return (
        <div className="tb-dia tb-dia-piano" aria-label="The letters as a piano: the home row the white keys, the row above the black; Z and X change the octave">
          <div className="tb-dia-kb">
            {white.map((k) => (
              <span key={k} className="tb-white">
                {k}
              </span>
            ))}
            {black.map(([k, after]) => (
              <span key={k} className="tb-black" style={{ left: `calc(${after + 1} * var(--wk) - var(--bk) / 2)` }}>
                {k}
              </span>
            ))}
          </div>
          <div className="tb-dia-row">
            <Cap k="Z" sub="OCT −" />
            <Cap k="X" sub="OCT +" />
            <span className="tb-dia-note">OR A MIDI KEYBOARD</span>
          </div>
        </div>
      );
    }
    case "ladder":
      return (
        <div className="tb-dia tb-dia-ladder" aria-label="Two bars either side of the music; touch a bar at the height of the glowing note">
          <span className="tb-dia-bar">
            <i className="tb-dia-glow" style={{ bottom: "62%" }} />
          </span>
          <span className="tb-dia-box">
            {[20, 38, 62, 50].map((y, i) => (
              <i key={i} className={`tb-dia-note-dot${i === 2 ? " next" : ""}`} style={{ left: `${14 + i * 22}%`, bottom: `${y}%` }} />
            ))}
            <b className="tb-dia-up">▲ HIGHER</b>
          </span>
          <span className="tb-dia-bar">
            <i className="tb-dia-glow" style={{ bottom: "62%" }} />
          </span>
        </div>
      );
    case "highway":
      // D229: the phone's HIGHWAY (the preludes): five lanes, two rows of pads, the same lanes in each (D229: SUBJECT withdrawn).
      return (
        <div className="tb-dia tb-dia-lanes" aria-label="Five lanes; tap the lane as the note lands; either row of pads">
          <div className="tb-dia-road">
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className="tb-dia-lane">
                {l === 1 && <i className="tb-gem" style={{ top: "62%" }} />}
                {l === 2 && <i className="tb-gem" style={{ top: "40%" }} />}
                {l === 3 && <i className="tb-gem" style={{ top: "22%" }} />}
              </span>
            ))}
          </div>
          <div className="tb-dia-pads">
            <span>TAP THE LANE</span>
          </div>
          <div className="tb-dia-pads">
            <span>EITHER ROW</span>
          </div>
        </div>
      );
  }
}
