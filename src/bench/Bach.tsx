/**
 * Herr Bach speaks (D185): his portrait in pixels (after Haussmann's of 1746: the wig, the plain coat,
 * the white cravat) and a line at a time, typed out; a key or a tap finishes the line, the next goes
 * on. The lessons' words are in lessons.ts.
 */
import { tr } from "../i18n/index.ts";
import { useEffect, useRef, useState } from "react";
import type { Line } from "./lessons.ts";

const FACE = [
  "....WWWWWWWW....",
  "...WWWWWWWWWW...",
  "..WWWwWWWWwWWW..",
  "..WWWSSSSSSWWW..",
  ".WWWSBBSSBBSWWW.",
  ".WWWSEESSEESWWW.",
  ".WwWSSSsSSSSWwW.",
  ".WWWSSSssSSSWWW.",
  ".WwWSSMMMMSSWwW.",
  ".WWWsSSSSSSsWWW.",
  "..WwWsSSSSsWwW..",
  "..WWW.sSSs.WWW..",
  "...WWCLLLLCWW...",
  "..CCCCLLLLCCCC..",
  ".CCccCCLLCCccCC.",
  "CCCCCCCLLCCCCCCC",
  "CCcCCCCCCCCCCcCC",
  "CCCCCCCCCCCCCCCC",
];
const INK: Record<string, string> = {
  W: "#ece6d6",
  w: "#bfb6a2",
  S: "#e2b38a",
  s: "#c48e66",
  E: "#2a1d14",
  B: "#6b5a48",
  M: "#9a4a3a",
  C: "#3b2f4a",
  c: "#5a4870",
  L: "#f5f1e6",
};

export function Portrait({ talking }: { talking: boolean }) {
  return (
    <svg className="tb-bach-face" viewBox="0 0 16 18" shapeRendering="crispEdges" aria-hidden="true">
      {FACE.flatMap((row, y) =>
        [...row].map((ch, x) => (INK[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={talking && ch === "M" && x > 6 && x < 9 ? "#5a2a20" : INK[ch]} /> : null)),
      )}
    </svg>
  );
}

/** The lines, one at a time; `onLine` as each begins (a demonstration to play); `onDone` after the last. */
export function BachTalk({ title, lines, onLine, onDone }: { title: string; lines: Line[]; onLine?: (l: Line) => void; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[i];
  // D283: his lines in the language chosen.
  const said = line ? tr(line.text) : "";
  const full = said.length;
  const state = useRef({ i, shown, full });
  state.current = { i, shown, full };

  useEffect(() => {
    if (line) onLine?.(line);
    setShown(0);
    const t = window.setInterval(() => setShown((s) => (s >= full ? (window.clearInterval(t), s) : s + 1)), 22);
    return () => window.clearInterval(t);
  }, [i]);

  const advance = () => {
    const { i: at, shown: s, full: n } = state.current;
    if (s < n) return setShown(n);
    if (at + 1 < lines.length) setI(at + 1);
    else onDone();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.code === "Escape" || e.code.startsWith("Shift")) return;
      e.preventDefault();
      advance();
    };
    // After a moment (the key that brought him must not also pass his first line).
    const t = window.setTimeout(() => window.addEventListener("keydown", key), 250);
    return () => (window.clearTimeout(t), window.removeEventListener("keydown", key));
  }, []);

  return (
    <div className="tb-bach" role="dialog" aria-label={`Herr Bach: ${title}`} onClick={advance}>
      <Portrait talking={shown < full} />
      <div className="tb-bach-box">
        <p className="tb-bach-title">{title}</p>
        <p className="tb-bach-line" aria-live="polite">
          {said.slice(0, shown)}
          <span className="tb-bach-rest">{said.slice(shown)}</span>
        </p>
        <p className="tb-bach-more">{shown < full ? "" : i + 1 < lines.length ? "▼" : tr("PRESS A KEY")}</p>
      </div>
    </div>
  );
}
