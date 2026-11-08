/** D497: soundlab.html, THE SOUND LAB (SoundLab.tsx). Not in the game's navigation: reached by its address only. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP } from "../config.ts";
import { SoundLab } from "./SoundLab.tsx";
import "./soundlab.css";

// The friends' page's sound (play.html sets the same before its first render).
APP.lite = true;
APP.dev = false;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SoundLab />
  </StrictMode>,
);
