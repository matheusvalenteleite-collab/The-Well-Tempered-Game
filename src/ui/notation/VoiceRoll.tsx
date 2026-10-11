/**
 * The whole fugue by voice (D123): every note as a bar of its length and pitch in its voice's
 * colour, the subject's entries outlined and labelled, the selected section or moment shaded, the
 * bar being played marked, and the player's own entries (the workshop) drawn on top. A tap plays
 * from that bar. Above the bars, optionally, a strip of labels (the harmonic reading, D125).
 */
import { useEffect, useRef } from "react";
import type { Entry, FullNote } from "../../wtc/entries.ts";

export interface RollExtra {
  midi: number;
  at: number;
  dur: number;
}

interface Props {
  notes: FullNote[];
  voice: number[];
  colors: string[];
  /** Voices drawn faint (muted, or not soloed). */
  faint: Set<number>;
  entries: Entry[];
  showEntries: boolean;
  barQuarters: number;
  cursor: number;
  /** A shaded span (the section or moment chosen), in quarters. */
  span: { from: number; to: number } | null;
  /** The workshop's notes, drawn on top. */
  extra: RollExtra[];
  /** Notes hidden (replaced in the workshop). */
  hidden?: Set<number>;
  onBar(bar: number): void;
  label: string;
  /** A strip of labels above the bars (the chords), each over its span; tapping one plays from there. */
  strip?: { from: number; to: number; text: string; title: string }[];
  onStrip?(k: number): void;
  /** The number of the roll's first bar (0 when it is a pickup). */
  firstBar?: number;
}

const PX_Q = 20;
const ROW = 5;
const PAD = 24;

export function VoiceRoll(p: Props) {
  const box = useRef<HTMLDivElement>(null);
  const all = [...p.notes.map((n) => n.midi), ...p.extra.map((n) => n.midi)];
  const lo = Math.min(...all) - 2;
  const hi = Math.max(...all) + 2;
  const end = Math.max(...p.notes.map((n) => n.at + n.dur), ...p.extra.map((n) => n.at + n.dur));
  const width = PAD + end * PX_Q + PAD;
  const STRIP = p.strip?.length ? 18 : 0;
  const height = STRIP + PAD + (hi - lo + 1) * ROW + PAD;
  const y = (m: number) => STRIP + PAD + (hi - m) * ROW;
  const x = (q: number) => PAD + q * PX_Q;
  const bars = Math.ceil(end / p.barQuarters - 1e-6);
  useEffect(() => {
    const el = box.current;
    if (!el || p.cursor < 0) return;
    const cx = x(p.cursor * p.barQuarters);
    if (cx < el.scrollLeft + 20 || cx > el.scrollLeft + el.clientWidth - 80) el.scrollTo({ left: Math.max(0, cx - el.clientWidth * 0.15), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.cursor]);
  useEffect(() => {
    const el = box.current;
    if (!el || !p.span) return;
    const sx = x(p.span.from);
    if (sx < el.scrollLeft || sx > el.scrollLeft + el.clientWidth - 80) el.scrollTo({ left: Math.max(0, sx - 40), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.span?.from]);
  return (
    <div className="pianoroll voiceroll" ref={box}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={p.label}
        onClick={(ev) => {
          const r = (ev.currentTarget as SVGSVGElement).getBoundingClientRect();
          const q = (ev.clientX - r.left - PAD) / PX_Q;
          if (q >= 0) p.onBar(Math.floor(q / p.barQuarters));
        }}
      >
        {p.strip?.map((c, k) => (
          <g key={`h${k}`} className="roll-chord" onClick={(ev) => (ev.stopPropagation(), p.onStrip?.(k))}>
            <title>{c.title}</title>
            <rect x={x(c.from) + 0.5} y={2} width={Math.max(2, (c.to - c.from) * PX_Q - 1)} height={STRIP - 4} rx={2} />
            {(() => {
              // The label if it fits; else without its figures; else none (the title still names it).
              const w = (c.to - c.from) * PX_Q - 4;
              const short = c.text.replace(/[⁰-⁹₀-₉]+/g, "");
              const s = c.text.length * 6 <= w ? c.text : short.length * 6 <= w ? short : "";
              return s ? <text x={x(c.from) + 3} y={STRIP - 6}>{s}</text> : null;
            })()}
          </g>
        ))}
        {p.span && <rect x={x(p.span.from)} y={STRIP + PAD - 8} width={Math.max(2, (p.span.to - p.span.from) * PX_Q)} height={height - STRIP - 2 * PAD + 8} className="roll-span" />}
        {Array.from({ length: hi - lo + 1 }, (_, k) => hi - k).filter((m) => m % 12 === 0).map((m) => (
          <g key={`c${m}`}>
            <line x1={0} x2={width} y1={y(m) + ROW} y2={y(m) + ROW} className="roll-c" />
            <text x={2} y={y(m) + ROW - 1} className="roll-label">C{Math.floor(m / 12) - 1}</text>
          </g>
        ))}
        {Array.from({ length: bars + 1 }, (_, b) => (
          <g key={`b${b}`}>
            <line x1={x(b * p.barQuarters)} x2={x(b * p.barQuarters)} y1={STRIP + PAD - 6} y2={height - PAD} className="roll-bar" />
            {b < bars && (b % 2 === 0 || bars < 30) && <text x={x(b * p.barQuarters) + 2} y={STRIP + PAD - 9} className="roll-label">{b + (p.firstBar ?? 1)}</text>}
          </g>
        ))}
        {p.cursor >= 0 && <rect x={x(p.cursor * p.barQuarters)} y={STRIP + PAD - 6} width={p.barQuarters * PX_Q} height={height - STRIP - 2 * PAD + 6} className="roll-cursor" />}
        {p.notes.map((n, i) =>
          p.hidden?.has(i) ? null : (
            <rect key={i} x={x(n.at) + 0.5} y={y(n.midi)} width={Math.max(1.5, n.dur * PX_Q - 1)} height={ROW - 0.5} rx={1} fill={p.colors[p.voice[i] % p.colors.length]} opacity={p.faint.has(p.voice[i]) ? 0.18 : 0.92} />
          ),
        )}
        {p.showEntries &&
          p.entries.map((e, k) => {
            const ns = e.notes.map((i) => p.notes[i]);
            const top = Math.max(...ns.map((n) => n.midi));
            const bot = Math.min(...ns.map((n) => n.midi));
            return (
              <g key={`e${k}`} className={e.subject ? "roll-outline later" : e.inverted ? "roll-outline inv" : "roll-outline"}>
                <rect x={x(e.at) - 2} y={y(top) - 2} width={(e.end - e.at) * PX_Q + 4} height={(top - bot + 1) * ROW + 4} rx={3} />
                <text x={x(e.at)} y={y(top) - 4} className="roll-entry">{e.subject ? `S${e.subject}` : `${e.inverted ? "∀" : "S"}${e.scale === 2 ? "×2" : e.scale === 0.5 ? "×½" : ""}`}</text>
              </g>
            );
          })}
        {p.extra.map((n, k) => (
          <rect key={`x${k}`} x={x(n.at) + 0.5} y={y(n.midi)} width={Math.max(1.5, n.dur * PX_Q - 1)} height={ROW} rx={1} className="roll-extra" />
        ))}
      </svg>
    </div>
  );
}
