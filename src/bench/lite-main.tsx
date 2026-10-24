/**
 * D237: play.html, the minimal page for friends: the bench's game with `APP.lite` set before the first
 * render (the card grid, the pop-up, the game, the result; nothing else). The interface: on a phone the
 * one chosen in this page's ⚙ (kept apart from the bench's, D241); on a computer CLASSIC.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "./config.ts";
import { forceUi, keepUiUnder } from "../touch/ui/index.ts";
import { detectedPlatform } from "./home.ts";
import { BenchApp } from "./BenchApp.tsx";
import { markVersion } from "./version.ts";
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";

APP.lite = true;
APP.dev = false;
if (detectedPlatform() === "mobile") keepUiUnder("tb-lite-ui-v1");
else forceUi("classic");

markVersion();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BenchApp />
  </StrictMode>,
);
