/**
 * D237: play.html, the minimal page for friends: the bench's game with `APP.lite` set before the first
 * render (the card grid, the pop-up, the game, the result; nothing else). The interface: CLASSIC (D265;
 * the others withdrawn).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "./config.ts";
import { forceUi } from "../touch/ui/index.ts";
import { BenchApp } from "./BenchApp.tsx";
import { markVersion } from "./version.ts";
import { isSurelyComputer } from "./home.ts";
import { unlocked } from "./unlock.ts";
import { MobileOnly } from "./MobileOnly.tsx";
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";
import "./tools.css";

APP.lite = true;
APP.dev = false;
// D265: one look on every platform (CLASSIC): the other interfaces withdrawn (the owner: "disable other
// visualization modes. let's focus on making the default visualization mode as good as possible").
forceUi("classic");

// D343: phones and tablets only. A computer (surely one: see isSurelyComputer) is told so, and nothing else,
// unless the device is unlocked (unlock.ts): then the game, as before, with ⚙ PLAY ON.
markVersion();
createRoot(document.getElementById("root")!).render(<StrictMode>{isSurelyComputer() && !unlocked() ? <MobileOnly /> : <BenchApp />}</StrictMode>);
