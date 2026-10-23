/**
 * D237: play.html, the minimal page for friends: the bench's game with `APP.lite` set before the first
 * render (the card grid, the pop-up, the game, the result; nothing else) and the interface CLASSIC
 * whatever the bench has stored on this device.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "./config.ts";
import { forceUi } from "../touch/ui/index.ts";
import { BenchApp } from "./BenchApp.tsx";
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";

APP.lite = true;
APP.dev = false;
forceUi("classic");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BenchApp />
  </StrictMode>,
);
