import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TouchApp } from "./TouchApp.tsx";
import "./touch.css";
import { loadAllPieces } from "../touch/fugue.ts";

// D1054: this page reads every piece's notes: they are all fetched before it is drawn.
void loadAllPieces().then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <TouchApp />
    </StrictMode>,
  ),
);
