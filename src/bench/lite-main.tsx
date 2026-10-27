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
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";
import "./tools.css";

APP.lite = true;
APP.dev = false;
// D265: one look on every platform (CLASSIC): the other interfaces withdrawn (the owner: "disable other
// visualization modes. let's focus on making the default visualization mode as good as possible").
forceUi("classic");

// D343: phones and tablets only. A computer (surely one: see isSurelyComputer) is told so, and nothing else.
function MobileOnly() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 24, textAlign: "center", background: "#0b0d18", color: "#f4e9a8", fontFamily: '"Press Start 2P", monospace' }}>
      <div style={{ fontSize: 28, lineHeight: 1.4 }}>MOBILE ONLY</div>
      <div style={{ fontSize: 12, lineHeight: 2, color: "#a9b0d6", maxWidth: 520 }}>
        The Well-Tempered Game is played with two thumbs on a phone or tablet, held sideways. Open this page there.
      </div>
    </div>
  );
}

markVersion();
createRoot(document.getElementById("root")!).render(<StrictMode>{isSurelyComputer() ? <MobileOnly /> : <BenchApp />}</StrictMode>);
