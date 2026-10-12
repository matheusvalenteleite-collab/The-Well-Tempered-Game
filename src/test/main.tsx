import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TestBench } from "./TestBench.tsx";
import "../ui/styles.css";
import "./bench.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TestBench />
  </StrictMode>,
);
