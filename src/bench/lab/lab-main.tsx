/**
 * D317: lab.html, THE LAB: the game's mechanics laid open (LabApp.tsx). The look play.html has (CLASSIC).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "../config.ts";
import { forceUi } from "../../touch/ui/index.ts";
import { LabApp } from "./LabApp.tsx";
import { markVersion } from "../version.ts";
import "../fonts/press-start-2p.css";
import "../../touch/touch.css";
import "../bench.css";
import "./lab.css";

APP.lite = true;
APP.dev = false;
forceUi("classic");

markVersion();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LabApp />
  </StrictMode>,
);
