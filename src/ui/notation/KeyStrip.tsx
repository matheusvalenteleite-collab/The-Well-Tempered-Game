/**
 * A keyboard under the score (D147): the keys of the piece's compass, each pressed as its note is
 * played (struck: the key goes down in its voice's colour; held: it stays tinted until the note
 * ends). Drawn once; the keys are lit frame by frame from the playhead, without React.
 * A tap on a key sounds it.
 */
import { useEffect, useMemo, useRef } from "react";
import { onFrames, playhead } from "../playhead.ts";

const EPS = 1e-6;
const BLACK = new Set([1, 3, 6, 8, 10]);

interface Props {
  notes: { midi: number; at: number; dur: number }[];
  voice: number[];
  colors: string[];
  /** Voices not heard (their keys are not lit). */
  faint: Set<number>;
  onKey?(midi: number): void;
}

export function KeyStrip(p: Props) {
  const box = useRef<HTMLDivElement>(null);
  // The compass, widened to whole octaves (C to B).
  const [lo, hi] = useMemo(() => {
    const ms = p.notes.map((n) => n.midi);
    const a = Math.min(...ms);
    const b = Math.max(...ms);
    return [a - (((a % 12) + 12) % 12), b + (11 - (((b % 12) + 12) % 12))];
  }, [p.notes]);
  const whites = useMemo(() => Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).filter((m) => !BLACK.has(m % 12)), [lo, hi]);
  const faintRef = useRef(p.faint);
  faintRef.current = p.faint;

  useEffect(() => {
    const order = p.notes.map((_, i) => i).sort((a, b) => p.notes[a].at - p.notes[b].at);
    const maxDur = Math.max(...p.notes.map((n) => n.dur));
    let lit = new Map<number, string>();
    return onFrames((pos) => {
      const el = box.current;
      if (!el) return;
      const next = new Map<number, string>();
      if (pos !== null) {
        const strike = Math.max(0.05, playhead.rate * 0.16);
        let lo2 = 0;
        let hi2 = order.length;
        while (lo2 < hi2) {
          const m = (lo2 + hi2) >> 1;
          if (p.notes[order[m]].at < pos - maxDur - EPS) lo2 = m + 1;
          else hi2 = m;
        }
        for (let k = lo2; k < order.length; k++) {
          const i = order[k];
          const n = p.notes[i];
          if (n.at > pos + EPS) break;
          if (pos >= n.at + n.dur - EPS || faintRef.current.has(p.voice[i])) continue;
          const c = p.colors[p.voice[i] % p.colors.length];
          const hit = pos - n.at < strike;
          // A key struck again while still held shows the strike.
          const prev = next.get(n.midi);
          if (!prev || hit) next.set(n.midi, `${hit ? "hit" : "on"}|${c}`);
        }
      }
      for (const [m] of lit) if (!next.has(m)) {
        const k = el.querySelector<HTMLElement>(`[data-m="${m}"]`);
        if (k) {
          k.classList.remove("hit", "on");
          k.style.removeProperty("--kc");
        }
      }
      for (const [m, v] of next) if (lit.get(m) !== v) {
        const k = el.querySelector<HTMLElement>(`[data-m="${m}"]`);
        if (!k) continue;
        const [cls, c] = v.split("|");
        k.classList.toggle("hit", cls === "hit");
        k.classList.toggle("on", cls === "on");
        k.style.setProperty("--kc", c);
      }
      lit = next;
    });
  }, [p.notes, p.voice, p.colors]);

  const wW = 100 / whites.length;
  return (
    <div className="keystrip" ref={box} aria-hidden="true">
      {whites.map((m, k) => (
        <div key={m} className={m % 12 === 0 ? "key white c" : "key white"} data-m={m} style={{ left: `${k * wW}%`, width: `${wW}%` }} onPointerDown={() => p.onKey?.(m)}>
          {m % 12 === 0 && <span>C{Math.floor(m / 12) - 1}</span>}
        </div>
      ))}
      {whites.map((m, k) =>
        BLACK.has((m + 1) % 12) && m + 1 <= hi ? (
          <div key={m + 1} className="key black" data-m={m + 1} style={{ left: `${(k + 1) * wW - wW * 0.3}%`, width: `${wW * 0.6}%` }} onPointerDown={() => p.onKey?.(m + 1)} />
        ) : null,
      )}
    </div>
  );
}
