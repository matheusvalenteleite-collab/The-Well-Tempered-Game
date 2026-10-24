import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BenchApp } from "./BenchApp.tsx";
import { markVersion } from "./version.ts";
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";

markVersion();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BenchApp />
  </StrictMode>,
);
