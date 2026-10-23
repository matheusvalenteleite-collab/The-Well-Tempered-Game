/**
 * D219: each mode's rules as a picture (the owner: "use visual representation, be concise"): pixel
 * key-caps for the computer's modes, lane and bar pictograms for the phone's. Drawn in CSS (bench.css
 * .tb-dia), on the title card, in ⚙ and in the help screen. D233: behind ? and in ⚙ only (ModeHow); the
 * phone's LADDER an animation (LadderPlay.tsx).
 */
import { protoById, SCALE_HOW, type ProtoId } from "./protos.ts";
import { LadderPlay } from "./LadderPlay.tsx";
import { HOME_ROW } from "./settings-logic.ts";
import { SCALE_DOWN, SCALE_HOME, SCALE_UP } from "./scale-keys.ts";

const Cap = ({ k, sub, cls = "" }: { k: string; sub?: string; cls?: string }) => (
  <kbd className={`tb-cap ${cls}`}>
    {k}
    {sub && <small>{sub}</small>}
  </kbd>
);

/** D230, SCALE KEYS: the three rows as a piano: the home row the scale (1 to 8), the row above raised, below lowered; the rare ones dim. */
function ScaleDiagram() {
  const key = (c: string) => c.slice(3);
  const rare = new Set(["KeyR", "KeyI", "KeyV", "KeyZ"]);
  return (
    <div className="tb-dia tb-dia-scale" aria-label="Home row A to K the home key's scale, degrees 1 to 8; raised notes on the row above (W E T Y U), lowered notes on the row below (X C B N M); space repeats a note">
      <p className="tb-dia-note tb-scale-up-tag">▲ RAISED (♯ SIDE)</p>
      <div className="tb-scale-grid">
        {SCALE_UP.map((c, d) => (
          <kbd key={c} className={`tb-cap tb-cap-up${rare.has(c) ? " rare" : ""}`} style={{ gridRow: 1, gridColumn: `${2 * d + 3} / span 2` }}>
            {key(c)}
          </kbd>
        ))}
        {SCALE_HOME.map((c, d) => (
          <kbd key={c} className={`tb-cap tb-cap-home${d === 0 || d === 7 ? " tonic" : ""}`} style={{ gridRow: 2, gridColumn: `${2 * d + 2} / span 2` }}>
            {key(c)}
            <small>{d + 1}</small>
          </kbd>
        ))}
        {SCALE_DOWN.map((c, d) => (
          <kbd key={c} className={`tb-cap tb-cap-down${rare.has(c) ? " rare" : ""}`} style={{ gridRow: 3, gridColumn: `${2 * d + 1} / span 2` }}>
            {key(c)}
          </kbd>
        ))}
      </div>
      <p className="tb-dia-note tb-scale-down-tag">▼ LOWERED (♭ SIDE)</p>
      <p className="tb-dia-note">HOME ROW: DO RE MI FA SOL LA TI DO OF THE PIECE'S KEY</p>
      <kbd className="tb-cap tb-cap-space">
        SPACE<small>SAME NOTE</small>
      </kbd>
    </div>
  );
}

export function ModeDiagram({ id, scale = false }: { id: ProtoId; scale?: boolean }) {
  if (id === "keys" && scale) return <ScaleDiagram />;
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
      // D233, MIDI CONTROLLER: a keyboard (the black keys over the gaps after C D F G A of an octave and a half).
      const black = [0, 1, 3, 4, 5, 7];
      return (
        <div className="tb-dia tb-dia-piano" aria-label="A MIDI keyboard: play the key each note falls onto">
          <div className="tb-dia-kb">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="tb-white" />
            ))}
            {black.map((after) => (
              <span key={after} className="tb-black" style={{ left: `calc(${after + 1} * var(--wk) - var(--bk) / 2)` }} />
            ))}
          </div>
          <span className="tb-dia-note">YOUR MIDI KEYBOARD</span>
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

/** D233: a mode's rules as shown behind ? and in ⚙: LADDER's animation, else the picture and its lines. */
export function ModeHow({ id, scale = false }: { id: ProtoId; scale?: boolean }) {
  if (id === "ladder") return <LadderPlay />;
  return (
    <div className="tb-how">
      <ModeDiagram id={id} scale={scale} />
      <ol className="tb-rules">
        {(id === "keys" && scale ? SCALE_HOW : protoById(id).how).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ol>
    </div>
  );
}
