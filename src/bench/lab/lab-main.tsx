/**
 * D317: lab.html, THE LAB: the game's mechanics laid open (LabApp.tsx). The look play.html has (CLASSIC).
 * D376: lab.html?glenn=1, THE EXPRESSION LAB: play.html's selection screen and game (BenchApp) with
 * Glenn's mechanics on (MECH.glenn, glenn.ts), every collection open for this page (nothing written to
 * the device), every take recorded and kept with the Lab's RUNS, a badge in the corner and a way back.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "../config.ts";
import { forceUi } from "../../touch/ui/index.ts";
import { LabApp } from "./LabApp.tsx";
import { markVersion } from "../version.ts";
import { glennParam } from "../glenn.ts";
import { setMech } from "../mechanics.ts";
import { forceUnlocked } from "../unlock.ts";
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
const glenn = glennParam(location.search);
if (glenn) {
  APP.glenn = true;
  setMech({ glenn: true });
  forceUnlocked();
  document.documentElement.classList.add("tb-play-page", "glenn-page");
  document.title = "WTC Expression Lab";
  lockOnFirstTap();
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {glenn ? (
      <>
        <BenchApp />
        <Sideways />
        <div className="glenn-badge" id="glenn-badge">
          <b>GLENN MECHANICS ON</b>
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
