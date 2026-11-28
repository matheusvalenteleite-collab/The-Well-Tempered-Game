/**
 * D237: play.html, the minimal page for friends: the bench's game with `APP.lite` set before the first
 * render (the card grid, the pop-up, the game, the result; nothing else). The interface: CLASSIC (D265;
 * the others withdrawn).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "./config.ts";
import { BenchApp } from "./BenchApp.tsx";
import { markVersion } from "./version.ts";
import { isSurelyComputer } from "./home.ts";
import { unlocked } from "./unlock.ts";
import { litePlatform, startHere } from "./lite.ts";
import { loadPiecePair, prefetchPieces } from "../touch/fugue.ts";
import { MobileOnly } from "./MobileOnly.tsx";
import { Sideways, lockOnFirstTap } from "./Sideways.tsx";
import { isInstalled, watchInstall } from "./install.ts";
import { applyGuitarTilt, applyNewMech } from "./new-mech.ts";
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";
import "./tools.css";
import "./selection.css";

APP.lite = true;
APP.dev = false;
// D265: one look on every platform (CLASSIC). D1050: the other interfaces (touch/ui/) deleted.

// D343: phones and tablets only. A computer (surely one: see isSurelyComputer) is told so, and nothing else,
// unless the device is unlocked (unlock.ts): then the game, as before, with ⚙ PLAY ON.
markVersion();
// D1059/D1060: the new mechanics (the strings' bow) for every player; the developer view's NEW MECHANICS can switch them off.
applyNewMech();
// D1066: the guitars' hands for every player; the developer view's GUITAR HANDS can switch them off. D1071: the tilt retired (off unless an unlocked device turns it on).
applyGuitarTilt();
// D369: sideways only: a phone or tablet upright is asked to turn (Sideways.tsx, over everything; the run
// paused by BenchApp); the first tap asks for full screen and the landscape lock where the browser allows.
document.documentElement.classList.add("tb-play-page");
lockOnFirstTap();
// D380: Chrome's install prompt kept for ⚙ INSTALL (it fires early); the page marked when it runs installed
// (opened from the Home Screen: no browser bars; the sideways screen and the safe areas as ever).
watchInstall();
if (isInstalled()) document.documentElement.classList.add("tb-installed");
// D1054: the card grid is drawn from light stubs; the notes of the piece the game starts on (and of the default, which the game falls
// back to) are fetched first, then the rest quietly once the grid is up (fugue.ts prefetchPieces; setPick waits for any it lacks).
const first = startHere(litePlatform() === "mobile");
void Promise.all([loadPiecePair(first), loadPiecePair("wtc1f02")])
  .catch(() => undefined)
  .then(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        {isSurelyComputer() && !unlocked() ? <MobileOnly /> : <BenchApp />}
        <Sideways />
      </StrictMode>,
    );
    setTimeout(() => prefetchPieces(first), 1500);
  });
