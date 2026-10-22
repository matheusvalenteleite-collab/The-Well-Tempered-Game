import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BenchApp } from "./BenchApp.tsx";
import "../touch/touch.css";
import "./bench.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BenchApp />
  </StrictMode>,
);
