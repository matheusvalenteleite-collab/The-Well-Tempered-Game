/**
 * D233: the phone LADDER's rules as an animation (after docs/mockups/finger-play.html): the phone held
 * sideways, ghost thumbs on the two side bars playing a short rising run, left and right in turn, each
 * landing before the other lets go; under it a timeline of what sounds, the overlaps gold, LEGATO ×n
 * counted as they come. CSS keyframes (bench.css .tb-fp), a 4 s loop; still under reduced motion.
 */

/** The four notes: the side, the height on the bar (y), and when each thumb is down (share of the loop). */
const RUN = [
  { side: "left", y: 104, on: 0.03, off: 0.33 },
  { side: "right", y: 82, on: 0.28, off: 0.58 },
  { side: "left", y: 60, on: 0.53, off: 0.83 },
  { side: "right", y: 38, on: 0.78, off: 0.98 },
] as const;
const TL = 240;

export function LadderPlay() {
  return (
    <figure className="tb-fp" aria-label="Two thumbs take turns on the side bars, each landing before the other lets go: the notes overlap, legato">
      <svg viewBox="0 0 300 200" role="img" aria-hidden="true">
        <rect x="20" y="8" width="260" height="122" rx="12" className="tb-fp-phone" />
        <rect x="30" y="18" width="44" height="102" className="tb-fp-bar" />
        <rect x="226" y="18" width="44" height="102" className="tb-fp-bar" />
        <rect x="80" y="22" width="140" height="94" className="tb-fp-box" />
        {RUN.map((n, i) => (
          <rect key={`n${i}`} x={96 + i * 30} y={n.y - 3} width="22" height="6" className={`tb-fp-note tb-fp-n${i + 1}`} />
        ))}
        {RUN.map((n, i) => (
          <circle key={`t${i}`} cx={n.side === "left" ? 52 : 248} cy={n.y} r="11" className={`tb-fp-thumb tb-fp-${n.side} tb-fp-t${i + 1}`} />
        ))}
        <g transform="translate(30,146)">
          <rect x="0" y="0" width={TL} height="22" className="tb-fp-box" />
          {RUN.map((n, i) => (
            <rect key={`s${i}`} x={n.on * TL} y={n.side === "left" ? 3 : 11} width={(n.off - n.on) * TL} height="8" className={`tb-fp-${n.side}`} />
          ))}
          {RUN.slice(1).map((n, i) => (
            <rect key={`g${i}`} x={n.on * TL} y="3" width={(RUN[i].off - n.on) * TL} height="16" className={`tb-fp-gold tb-fp-g${i + 1}`} />
          ))}
          <rect x="0" y="-2" width="2" height="26" className="tb-fp-head" />
        </g>
        {[1, 2, 3].map((k) => (
          <text key={k} x="150" y="194" textAnchor="middle" className={`tb-fp-legato tb-fp-l${k}`}>
            LEGATO ×{k}
          </text>
        ))}
      </svg>
      <figcaption>
        <span>Thumbs take turns: left bar, right bar.</span>
        <span>Land the next note before letting go.</span>
        <span className="tb-fp-gold-text">Gold overlap = LEGATO · more points.</span>
      </figcaption>
    </figure>
  );
}
