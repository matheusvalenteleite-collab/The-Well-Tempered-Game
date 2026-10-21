import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TouchApp } from "./TouchApp.tsx";
import "./touch.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TouchApp />
  </StrictMode>,
);
