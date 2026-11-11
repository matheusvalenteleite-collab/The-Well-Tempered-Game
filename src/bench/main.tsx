import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BenchApp } from "./BenchApp.tsx";
import { markVersion } from "./version.ts";
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";

markVersion();
// D499b (main board): the screen's true visible height, for overlays that must reach its bottom edge (the score
// screen). iOS can report 100vh / 100dvh larger or smaller than what shows (a home-screen app in landscape, a turn).
{
  const setVh = () => document.documentElement.style.setProperty("--tb-vh", `${Math.round(window.visualViewport?.height ?? window.innerHeight)}px`);
  setVh();
  window.addEventListener("resize", setVh);
  window.addEventListener("orientationchange", () => setTimeout(setVh, 300));
  window.visualViewport?.addEventListener("resize", setVh);
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BenchApp />
  </StrictMode>,
);
