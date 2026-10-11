/**
 * A chorale melody on one treble staff, broken into systems, with a marker under each fermata (the
 * player's cadence choice at level 1). Drawn in SVG from the data; no notation library.
 * The edition's bar lines are kept: dashed inside the lines of the hymn, solid at their ends, the
 * repeat sign where the first section repeats.
 */
import type { Chorale, MelodyNote } from "../../chorale/level1.ts";
import { frac } from "../../chorale/level1.ts";
import { parsePitch } from "../../music/pitch.ts";

const S = 8; // staff space
const W = 1500; // system width (viewBox units)
const TOP = 34; // staff top within a system
const SYS_H = TOP + 4 * S + 56; // staff, ledger room, marker row
const E4 = 30; // diatonic index of the bottom line (E4)
const SHARPS = [38, 35, 39, 36, 33, 37, 34]; // F5 C5 G5 D5 A4 E5 B4
const FLATS = [34, 37, 33, 36, 32, 35, 31]; // B4 E5 A4 D5 G4 C5 F4

export type MarkerState = "empty" | "chosen" | "bach" | "kittel" | "other";

interface Props {
  chorale: Chorale;
  picks: (string | null)[];
  selected: number;
  states: MarkerState[];
  cursor: number | null; // time in whole notes, or null
  onSelect(phrase: number): void;
  /** the melody notes that carry a marker (default: the fermatas); narrow markers when many */
  markerAt?: number[];
  /** the bass clef (chorale level 4: one of Kittel's basses) */
  clef?: "treble" | "bass";
}

const yOf = (diatonic: number) => TOP + 4 * S - (diatonic - E4) * (S / 2);

export function MelodyScore({ chorale, picks, selected, states, cursor, onSelect, markerAt, clef = "treble" }: Props) {
  // the bass clef drawn as the treble: a note shown 12 diatonic steps higher (G2 on E4's line), the
  // key signature's places two steps lower than the treble's
  const shift = clef === "bass" ? 12 : 0;
  const ks = chorale.keySignature;
  const prefix = 34 + 9 * Math.abs(ks) + (chorale.meterSign ? 0 : 0);
  // bar widths: proportional to length, with room for every note
  const notesIn = (m: number) => chorale.melody.filter((n) => n.measure === m && !n.grace).length;
  const graceIn = (m: number) => chorale.melody.filter((n) => n.measure === m && n.grace).length;
  const per = markerAt ? 38 : 30; // room per note (a marker under every note at level 2)
  const bars = chorale.measures.map((m) => ({ ...m, w: Math.max(frac(m.length) * 150, notesIn(m.number) * per + graceIn(m.number) * 12 + 18) }));
  // systems
  const systems: (typeof bars)[] = [[]];
  let used = prefix;
  for (const b of bars) {
    if (used + b.w > W - 8 && systems[systems.length - 1].length) {
      systems.push([]);
      used = prefix;
    }
    systems[systems.length - 1].push(b);
    used += b.w;
  }
  const fermataIdx = markerAt ?? chorale.melody.map((n, i) => (n.fermata ? i : -1)).filter((i) => i >= 0);
  const mw = markerAt ? 30 : 44; // marker width

  return (
    <svg viewBox={`0 0 ${W} ${systems.length * SYS_H}`} className="melody-score" role="img" aria-label={chorale.title}>
      {systems.map((sys, si) => {
        const y0 = si * SYS_H;
        // stretch the system to the full width
        const natural = sys.reduce((a, b) => a + b.w, 0);
        const scale = si < systems.length - 1 || natural > (W - prefix) * 0.7 ? (W - prefix - 4) / natural : 1;
        let x = prefix;
        const placed = sys.map((b) => {
          const r = { ...b, x, w: b.w * scale };
          x += b.w * scale;
          return r;
        });
        const xAt = (t: number) => {
          const b = placed.find((p) => t >= frac(p.offset) - 1e-9 && t < frac(p.offset) + frac(p.length) - 1e-9) ?? placed[placed.length - 1];
          const pad = 14;
          return b.x + pad + ((t - frac(b.offset)) / frac(b.length)) * (b.w - pad - 8);
        };
        const inSys = (n: MelodyNote) => placed.some((p) => p.number === n.measure);
        return (
          <g key={si} transform={`translate(0 ${y0})`}>
            {[0, 1, 2, 3, 4].map((k) => (
              <line key={k} x1={4} x2={x} y1={TOP + k * S} y2={TOP + k * S} className="staff-line" />
            ))}
            {clef === "bass" ? <text x={6} y={TOP + 2 * S + 4} className="clef">𝄢</text> : <text x={6} y={TOP + 4 * S - 1} className="clef">𝄞</text>}
            {Array.from({ length: Math.abs(ks) }, (_, k) => (
              <text key={k} x={30 + k * 9} y={yOf((ks > 0 ? SHARPS : FLATS)[k] - (clef === "bass" ? 2 : 0)) + 4} className="accidental">{ks > 0 ? "♯" : "♭"}</text>
            ))}
            {si === 0 && chorale.meterSign === "C" && <text x={prefix - 12} y={TOP + 2 * S + 5} className="meter">𝄴</text>}
            {placed.map((b) => (
              <Barline key={b.number} x={b.x + b.w} style={b.barline} />
            ))}
            {placed.map((b) => (
              <text key={`n${b.number}`} x={b.x + 2} y={TOP - 14} className="bar-number">{b.number}</text>
            ))}
            {chorale.melody.map((n, i) => (inSys(n) ? <Note key={i} n={n} shift={shift} x={n.grace ? xAt(frac(n.offset)) - 11 : xAt(frac(n.offset))} /> : null))}
            {fermataIdx.map((ni, p) => {
              const n = chorale.melody[ni];
              if (!n || !inSys(n)) return null;
              const cx = xAt(frac(n.offset)) + 4;
              const label = picks[p] ?? "?";
              return (
                <g key={`m${p}`} className={`marker marker-${states[p]}${selected === p ? " selected" : ""}`} onClick={() => onSelect(p)} role="button" aria-label={`phrase ${p + 1}: ${label}`}>
                  <rect x={cx - mw / 2} y={TOP + 4 * S + 22} width={mw} height={24} rx={5} />
                  <text x={cx} y={TOP + 4 * S + 39} textAnchor="middle" className={markerAt ? "marker-small" : undefined}>{label}</text>
                </g>
              );
            })}
            {cursor !== null && placed.some((b) => cursor >= frac(b.offset) && cursor < frac(b.offset) + frac(b.length)) && (
              <line x1={xAt(cursor) + 4} x2={xAt(cursor) + 4} y1={TOP - 8} y2={TOP + 4 * S + 8} className="play-cursor" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Barline({ x, style }: { x: number; style: string | null }) {
  const st = style ?? "dashed";
  const y1 = TOP;
  const y2 = TOP + 4 * S;
  if (st.includes("end-repeat")) {
    return (
      <g className="barline">
        <circle cx={x - 9} cy={TOP + 1.5 * S} r={1.6} />
        <circle cx={x - 9} cy={TOP + 2.5 * S} r={1.6} />
        <line x1={x - 5} x2={x - 5} y1={y1} y2={y2} />
        <line x1={x - 1.5} x2={x - 1.5} y1={y1} y2={y2} strokeWidth={3} />
      </g>
    );
  }
  if (st.includes("thick")) {
    return (
      <g className="barline">
        <line x1={x - 5} x2={x - 5} y1={y1} y2={y2} />
        <line x1={x - 1.5} x2={x - 1.5} y1={y1} y2={y2} strokeWidth={3} />
      </g>
    );
  }
  return <line className="barline" x1={x} x2={x} y1={y1} y2={y2} strokeDasharray={st.startsWith("dashed") ? "3 3" : undefined} />;
}

function Note({ n, x, shift = 0 }: { n: MelodyNote; x: number; shift?: number }) {
  if (!n.pitch) {
    // a rest: half (on the middle line), whole (hanging from the fourth), shorter as a glyph
    const d = frac(n.duration);
    if (d >= 0.5) {
      const y = d >= 1 ? TOP + S : TOP + 2 * S - 4;
      return <rect x={x - 6} y={y} width={12} height={4} className="rest" />;
    }
    return <text x={x - 4} y={TOP + 2.5 * S} className="rest-glyph">𝄽</text>;
  }
  const p0 = parsePitch(n.pitch);
  const p = { ...p0, diatonic: p0.diatonic + shift };
  const y = yOf(p.diatonic);
  const d = frac(n.duration);
  const small = Boolean(n.grace);
  const k = small ? 0.65 : 1;
  const hollow = !small && d >= 0.5;
  const dotted = [0.75, 0.375, 1.5, 0.1875].some((v) => Math.abs(d - v) < 1e-9);
  const stemUp = p.diatonic < 34;
  const rx = 5.2 * k;
  const ry = 3.9 * k;
  const ledgers: number[] = [];
  for (let dd = 28; dd >= p.diatonic; dd -= 2) ledgers.push(dd);
  for (let dd = 40; dd <= p.diatonic; dd += 2) ledgers.push(dd);
  const stemX = stemUp ? x + rx - 0.6 : x - rx + 0.6;
  const stemEnd = stemUp ? y - 26 * k : y + 26 * k;
  return (
    <g className={small ? "note grace" : "note"}>
      {ledgers.map((dd) => (
        <line key={dd} x1={x - 9} x2={x + 9} y1={yOf(dd)} y2={yOf(dd)} className="staff-line" />
      ))}
      {n.accidental_shown && (
        <text x={x - 16 * k} y={y + 4} className="accidental">{p.alter > 0 ? "♯" : p.alter < 0 ? "♭" : "♮"}</text>
      )}
      <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(-20 ${x} ${y})`} className={hollow ? "head hollow" : "head"} />
      {(d < 1 || small) && <line x1={stemX} x2={stemX} y1={y} y2={stemEnd} className="stem" />}
      {(small || (d <= 0.125 + 1e-9 && d > 0)) && <path d={stemUp ? `M${stemX} ${stemEnd} q 6 6 6 12` : `M${stemX} ${stemEnd} q 6 -6 6 -12`} className="flag" />}
      {dotted && <circle cx={x + 9} cy={p.diatonic % 2 === 0 ? y - S / 2 : y} r={1.6} className="dot" />}
      {n.fermata && (
        <g className="fermata">
          <path d={`M${x - 8} ${Math.min(TOP - 6, y - 14)} a 8 7 0 0 1 16 0`} />
          <circle cx={x} cy={Math.min(TOP - 6, y - 14) - 2} r={1.5} />
        </g>
      )}
    </g>
  );
}
