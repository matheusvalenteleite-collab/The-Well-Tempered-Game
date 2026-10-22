import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BenchApp } from "./BenchApp.tsx";
import "./fonts/press-start-2p.css";
import "../touch/touch.css";
import "./bench.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BenchApp />
  </StrictMode>,
);
