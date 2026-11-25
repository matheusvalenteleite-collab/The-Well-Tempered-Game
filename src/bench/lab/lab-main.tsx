/**
 * D317: lab.html, THE LAB: the game's mechanics laid open (LabApp.tsx). The look play.html has (CLASSIC).
 * D376: lab.html?glenn=1, THE EXPRESSION LAB: play.html's selection screen and game (BenchApp) with
 * Glenn's mechanics on (MECH.glenn, glenn.ts), every collection open for this page (nothing written to
 * the device), every take recorded and kept with the Lab's RUNS, a way back in the corner.
 * D378 (WTC 1.83): Glenn's mechanics are the game's: ?glenn=1 is the game's own (PLAY ALL PIECES, no badge).
 * D1055: lab.html opens on a chooser: OLD LAB (the Lab as it was, lab.html?lab=old) or NEW LAB (the same Lab with the bow on,
 * MECH.bow and its recordings: lab.html?lab=new). ?glenn and ?pilot=glenn go straight to their pages, as before.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "../config.ts";
import { LabApp } from "./LabApp.tsx";
import { markVersion } from "../version.ts";
import { labPlayParam } from "../glenn.ts";
import { lockMech, setMech } from "../mechanics.ts";
import { setBowLayersWanted } from "../../touch/sampled.ts";
import { forceUnlocked } from "../unlock.ts";
import { installProfile } from "../lab-profile.ts";
import { BenchApp } from "../BenchApp.tsx";
import { Sideways, lockOnFirstTap } from "../Sideways.tsx";
import "../tools.css";
import "../selection.css";
import "../fonts/press-start-2p.css";
import "../../touch/touch.css";
import "../bench.css";
import "./lab.css";
import { loadAllPieces } from "../../touch/fugue.ts";

APP.lite = true;
APP.dev = false;

markVersion();
const page = labPlayParam(location.search);
// D441: THE GLENN PILOT (lab.html?pilot=glenn): play.html's game as a new player meets it (a profile of its
// own: nothing of the device's progress read or written), Part 1 of the tutorial hosted by Glenn, and
// LEARN WITH GLENN on Fugue I/1.
const pilot = new URLSearchParams(location.search).get("pilot") === "glenn";
if (pilot) {
  installProfile();
  APP.glennPilot = true;
  document.documentElement.classList.add("tb-play-page", "glenn-page");
  document.title = "WTC Lab: Glenn";
  lockOnFirstTap();
}
const glenn = page === "glenn";
if (glenn) {
  APP.glenn = true;
  setMech({ glenn: true });
  forceUnlocked();
  document.documentElement.classList.add("tb-play-page", "glenn-page");
  document.title = "WTC Lab: Play";
  lockOnFirstTap();
}
// D1055: which Lab: the chooser unless ?lab= names one (or the page is Glenn's).
const which = (() => {
  const v = new URLSearchParams(location.search).get("lab");
  return v === "new" ? "new" : v === "old" ? "old" : null;
})();
const choose = !pilot && !glenn && which === null;
if (!pilot && !glenn && which === "new") {
  lockMech({ bow: true });
  setBowLayersWanted(true);
  document.title = "WTC Lab: New";
}

/** D1055: the Lab's first screen: two big buttons (the links skip it: lab.html?lab=old, lab.html?lab=new). */
function LabChooser() {
  return (
    <main className="lab-choose" id="lab-choose">
      <h1>THE LAB</h1>
      <div className="lab-choose-row">
        <a className="lab-choose-btn" id="lab-choose-old" href="?lab=old">
          <b>OLD LAB</b>
          <span>The Lab as it was</span>
        </a>
        <a className="lab-choose-btn new" id="lab-choose-new" href="?lab=new">
          <b>NEW LAB</b>
          <span>The same Lab, with the strings' new bowing</span>
        </a>
      </div>
    </main>
  );
}

if (choose)
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <LabChooser />
    </StrictMode>,
  );
// D1054: this page reads every piece's notes: they are all fetched before it is drawn.
else void loadAllPieces().then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {pilot ? (
        <>
          <BenchApp />
          <Sideways />
          <div className="glenn-badge" id="pilot-badge">
            <b>GLENN PILOT</b>
            <a href="./lab.html" id="pilot-back">
              ◀ LAB
            </a>
          </div>
        </>
      ) : glenn ? (
        <>
          <BenchApp />
          <Sideways />
          <div className="glenn-badge" id="glenn-badge">
            <a href="./lab.html" id="glenn-back">
              ◀ LAB
            </a>
          </div>
        </>
      ) : (
        <LabApp newLab={which === "new"} />
      )}
    </StrictMode>,
  ),
);
