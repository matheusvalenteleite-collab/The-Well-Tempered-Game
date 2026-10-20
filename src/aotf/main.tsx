import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Cp14 } from "./Cp14.tsx";
import "../ui/styles.css";
import "./cp14.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Cp14 />
  </StrictMode>,
);
