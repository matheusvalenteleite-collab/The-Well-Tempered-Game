/**
 * The harmonic view (modern, never graded): figures and Roman numerals under each bar of a
 * three-voice score, placed under the score's own columns (read from its data-geometry).
 */
import { useLayoutEffect, useRef, useState } from "react";
import type { ModalFinal } from "../music/fux/index.ts";
import { harmonyOf } from "../counterpoint/choices/harmony.ts";

const TRIO_NOTE_X = 24;

export function HarmonyRow({ chords, final, scoreHost }: { chords: string[][]; final: ModalFinal; scoreHost: React.RefObject<HTMLElement | null> }) {
  const [xs, setXs] = useState<{ x: number; offset: number }[]>([]);
  const own = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const read = () => {
      const host = scoreHost.current?.querySelector<HTMLElement>("[data-geometry]");
      if (!host || !own.current) return;
      const g = JSON.parse(host.dataset.geometry ?? "{}") as { scale?: number; columns?: { x?: number; left: number }[] };
      const offset = host.getBoundingClientRect().left - own.current.getBoundingClientRect().left;
      // The two-staff score gives each column's note x; the three-staff one its left edge (notes
      // stand a fixed pad to the right of it, TrioScore's NOTE_PAD, plus half a note head).
      setXs((g.columns ?? []).map((c) => ({ x: (c.x ?? c.left + TRIO_NOTE_X) * (g.scale ?? 1), offset })));
    };
    read();
    const id = window.setTimeout(read, 120);
    window.addEventListener("resize", read);
    return () => (clearTimeout(id), window.removeEventListener("resize", read));
  }, [chords, scoreHost]);
  return (
    <div className="lab-harmony" ref={own} aria-label="Harmonic view (modern)">
      <span className="lab-harmony-tag" title="A later lens (figured bass with Rameau's roots and Weber's numerals), not Fux's: never graded">modern view</span>
      {chords.map((c, k) => {
        if (c.some((p) => !p) || !xs[k]) return null;
        const h = harmonyOf(c, final);
        return (
          <span key={k} className={`lab-harmony-bar${h.guessed ? " lab-harmony-guess" : ""}`} style={{ left: xs[k].offset + xs[k].x }} title={h.guessed ? "incomplete chord: the root is a guess" : undefined}>
            <span className="lab-figures">{h.figures.map((f, i) => <span key={i}>{f}</span>)}</span>
            <span className="lab-roman">{h.guessed ? `(${h.roman})` : h.roman}</span>
          </span>
        );
      })}
    </div>
  );
}
