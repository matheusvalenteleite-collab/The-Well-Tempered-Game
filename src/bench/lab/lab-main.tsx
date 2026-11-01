/**
 * D317: lab.html, THE LAB: the game's mechanics laid open (LabApp.tsx). The look play.html has (CLASSIC).
 * D376: lab.html?glenn=1, THE EXPRESSION LAB: play.html's selection screen and game (BenchApp) with
 * Glenn's mechanics on (MECH.glenn, glenn.ts), every collection open for this page (nothing written to
 * the device), every take recorded and kept with the Lab's RUNS, a way back in the corner.
 * D378 (WTC 1.83): Glenn's mechanics are the game's: ?glenn=1 is the game's own (PLAY ALL PIECES, no
 * badge); ?glenn=0 the same page with MECHANICS: CLASSIC (the game before WTC 1.83), its badge saying so.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "../config.ts";
import { forceUi } from "../../touch/ui/index.ts";
import { LabApp } from "./LabApp.tsx";
import { markVersion } from "../version.ts";
import { labPlayParam } from "../glenn.ts";
import { setMech } from "../mechanics.ts";
import { forceUnlocked } from "../unlock.ts";
import { installProfile } from "../progression.ts";
import { BenchApp } from "../BenchApp.tsx";
import { Sideways, lockOnFirstTap } from "../Sideways.tsx";
import "../tools.css";
import "../selection.css";
import "../fonts/press-start-2p.css";
import "../../touch/touch.css";
import "../bench.css";
import "./lab.css";

APP.lite = true;
APP.dev = false;
forceUi("classic");

markVersion();
const page = labPlayParam(location.search);
// D440: PROGRESSION MODE (lab.html?progression=1): play.html's game as a new player meets it, Book I as a path
// of stages (progression.ts), on a profile of its own (nothing of the device's progress read or written).
const progression = new URLSearchParams(location.search).get("progression") === "1";
// D441: THE GLENN PILOT (lab.html?pilot=glenn): play.html's game as a new player meets it (a profile of its
// own, as PROGRESSION MODE's), Part 1 of the tutorial hosted by Glenn, and LEARN WITH GLENN on Fugue I/1.
const pilot = new URLSearchParams(location.search).get("pilot") === "glenn";
if (pilot) {
  installProfile();
  APP.glennPilot = true;
  document.documentElement.classList.add("tb-play-page", "glenn-page");
  document.title = "WTC Lab: Glenn";
  lockOnFirstTap();
}
if (progression) {
  installProfile();
  APP.progression = true;
  document.documentElement.classList.add("tb-play-page", "glenn-page");
  document.title = "WTC Lab: Progression";
  lockOnFirstTap();
}
const glenn = page !== null;
const classic = page === "classic";
if (glenn) {
  APP.glenn = true;
  setMech({ glenn: !classic });
  forceUnlocked();
  document.documentElement.classList.add("tb-play-page", "glenn-page");
  document.title = classic ? "WTC Lab: Classic" : "WTC Lab: Play";
  lockOnFirstTap();
}
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
    ) : progression ? (
      <>
        <BenchApp />
        <Sideways />
        <div className="glenn-badge" id="prog-badge">
          <b>PROGRESSION MODE</b>
          <a href="./lab.html" id="prog-back">
            ◀ LAB
          </a>
        </div>
      </>
    ) : glenn ? (
      <>
        <BenchApp />
        <Sideways />
        <div className="glenn-badge" id="glenn-badge">
          {classic && <b>MECHANICS: CLASSIC</b>}
          <a href="./lab.html" id="glenn-back">
            ◀ LAB
          </a>
        </div>
      </>
    ) : (
      <LabApp />
    )}
  </StrictMode>,
);
