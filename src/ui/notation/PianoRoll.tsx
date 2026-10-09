/**
 * The whole fugue as a roll (D121): every note as a bar of its length at its pitch, the bar lines,
 * and the subject's entries in colour (upside down in another), with the bar being played marked.
 * A tap on an entry plays the fugue from there.
 */
import { useEffect, useRef } from "react";
import type { Entry, FullNote } from "../../wtc/entries.ts";

interface Props {
  notes: FullNote[];
  entries: Entry[];
  barQuarters: number;
  /** The bar being played, or -1. */
  cursor: number;
  onEntry(e: Entry): void;
  label: string;
}

const PX_Q = 22;
const ROW = 5;
const PAD = 24;

export function PianoRoll(p: Props) {
  const box = useRef<HTMLDivElement>(null);
  const lo = Math.min(...p.notes.map((n) => n.midi)) - 2;
  const hi = Math.max(...p.notes.map((n) => n.midi)) + 2;
  const end = Math.max(...p.notes.map((n) => n.at + n.dur));
  const width = PAD + end * PX_Q + PAD;
  const height = PAD + (hi - lo + 1) * ROW + PAD;
  const y = (m: number) => PAD + (hi - m) * ROW;
  const x = (q: number) => PAD + q * PX_Q;
  const inEntry = new Map<number, Entry>();
  for (const e of p.entries) for (const i of e.notes) inEntry.set(i, e);
  const bars = Math.ceil(end / p.barQuarters);
  // Follow the cursor.
  useEffect(() => {
    const el = box.current;
    if (!el || p.cursor < 0) return;
    const cx = x(p.cursor * p.barQuarters);
    if (cx < el.scrollLeft + 20 || cx > el.scrollLeft + el.clientWidth - 60) el.scrollTo({ left: Math.max(0, cx - el.clientWidth * 0.15), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.cursor]);
  return (
    <div className="pianoroll" ref={box}>
      <svg width={width} height={height} role="img" aria-label={p.label}>
        {Array.from({ length: hi - lo + 1 }, (_, k) => hi - k).filter((m) => m % 12 === 0).map((m) => (
          <g key={`c${m}`}>
            <line x1={0} x2={width} y1={y(m) + ROW} y2={y(m) + ROW} className="roll-c" />
            <text x={2} y={y(m) + ROW - 1} className="roll-label">C{Math.floor(m / 12) - 1}</text>
          </g>
        ))}
        {Array.from({ length: bars + 1 }, (_, b) => (
          <g key={`b${b}`}>
            <line x1={x(b * p.barQuarters)} x2={x(b * p.barQuarters)} y1={PAD - 6} y2={height - PAD} className="roll-bar" />
            {b < bars && b % 2 === 0 && <text x={x(b * p.barQuarters) + 2} y={PAD - 9} className="roll-label">{b + 1}</text>}
          </g>
        ))}
        {p.cursor >= 0 && <rect x={x(p.cursor * p.barQuarters)} y={PAD - 6} width={p.barQuarters * PX_Q} height={height - 2 * PAD + 6} className="roll-cursor" />}
        {p.notes.map((n, i) => {
          const e = inEntry.get(i);
          return <rect key={i} x={x(n.at) + 0.5} y={y(n.midi)} width={Math.max(1.5, n.dur * PX_Q - 1)} height={ROW - 0.5} rx={1} className={e ? (e.inverted ? "roll-note inv" : "roll-note subj") : "roll-note"} />;
        })}
        {p.entries.map((e, k) => (
          <text key={`e${k}`} x={x(e.at)} y={y(Math.max(...e.notes.map((i) => p.notes[i].midi))) - 3} className={e.inverted ? "roll-entry inv" : "roll-entry"} onClick={() => p.onEntry(e)}>
            {e.inverted ? "∀" : "S"}
          </text>
        ))}
      </svg>
    </div>
  );
}
