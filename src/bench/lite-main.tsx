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
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";

APP.lite = true;
APP.dev = false;
// D265: one look on every platform (CLASSIC): the other interfaces withdrawn (the owner: "disable other
// visualization modes. let's focus on making the default visualization mode as good as possible").
forceUi("classic");

markVersion();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BenchApp />
  </StrictMode>,
);
