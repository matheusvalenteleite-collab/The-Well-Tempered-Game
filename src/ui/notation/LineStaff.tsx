/**
 * One melodic line on a single staff (treble or bass, by its register), drawn in SVG: noteheads
 * spaced by duration, accidentals, ledger lines. For the WTC answers (subject and answer); no
 * beams or flags: the line's shape and spelling are what matters there.
 */
import { parsePitch } from "../../music/pitch.ts";

const S = 8;
const TOP = 34;

interface Props {
  lines: { notes: string[]; durations: string[]; label: string; marks?: number[]; className?: string }[];
}

const frac = (s: string) => {
  const [a, b] = s.split("/").map(Number);
  return b ? a / b : a;
};

export function LineStaff({ lines }: Props) {
  const all = lines.flatMap((l) => l.notes.map((n) => parsePitch(n).diatonic));
  const mean = all.reduce((a, b) => a + b, 0) / Math.max(1, all.length);
  const treble = mean >= 27; // from B3 up on average: treble clef
  const bottom = treble ? 30 : 18; // E4 or G2: the bottom line
  const W = 1500;
  const H = TOP + 4 * S + 40;
  const y = (d: number) => TOP + 4 * S - (d - bottom) * (S / 2);
  return (
    <div className="line-staff">
      {lines.map((l, li) => {
        const total = l.notes.reduce((a, _, i) => a + Math.max(frac(l.durations[i] ?? "1/8"), 1 / 16), 0);
        const unit = (W - 140) / Math.max(total, 1);
        let x = 110;
        return (
          <svg key={li} viewBox={`0 0 ${W} ${H}`} className={`line-staff-svg ${l.className ?? ""}`} role="img" aria-label={l.label}>
            <text x={92} y={12} className="ls-label">{l.label}</text>
            {[0, 1, 2, 3, 4].map((k) => <line key={k} x1={90} x2={W - 10} y1={TOP + k * S} y2={TOP + k * S} className="ls-line" />)}
            <text x={92} y={TOP + (treble ? 3 : 1) * S + 2} className="ls-clef">{treble ? "𝄞" : "𝄢"}</text>
            {l.notes.map((n, i) => {
              const p = parsePitch(n);
              const d = frac(l.durations[i] ?? "1/8");
              const cx = x + 18;
              x += Math.max(d, 1 / 16) * unit;
              const cy = y(p.diatonic);
              const ledgers: number[] = [];
              for (let k = bottom - 2; k >= p.diatonic; k -= 2) ledgers.push(k);
              for (let k = bottom + 10; k <= p.diatonic; k += 2) ledgers.push(k);
              const marked = l.marks?.includes(i);
              return (
                <g key={i} className={marked ? "ls-note marked" : "ls-note"}>
                  {ledgers.map((k) => <line key={k} x1={cx - 9} x2={cx + 9} y1={y(k)} y2={y(k)} className="ls-line" />)}
                  {p.alter !== 0 && <text x={cx - 20} y={cy + 5} className="ls-acc">{p.alter > 0 ? "♯".repeat(p.alter) : "♭".repeat(-p.alter)}</text>}
                  <ellipse cx={cx} cy={cy} rx={5.5} ry={4.2} transform={`rotate(-20 ${cx} ${cy})`} className={d >= 0.5 ? "ls-head open" : "ls-head"} />
                  <line x1={cx + 5} x2={cx + 5} y1={cy} y2={cy - 26} className="ls-stem" />
                  <title>{n}</title>
                </g>
              );
            })}
          </svg>
        );
      })}
    </div>
  );
}
