/**
 * D441: Glenn's portrait in pixels, after Glenn Gould as the photographs of the 1950s show him: the
 * swept-back hair, the long face and strong brows, eyes cast down to the keys, the scarf over a dark coat.
 * The same grid as Herr Bach's (Bach.tsx), so either fits every bubble. `GlennAtPiano`: the film's scene,
 * Glenn on his low chair at the piano, turned to the player.
 */
const FACE = [
  "....hHHHHHh.....",
  "...HHHHHHHHHh...",
  "..HHHhHHHHHHHH..",
  "..HHSSSSSSSHHH..",
  ".HHSSSSSSSSSHH..",
  ".HHSBBSSSBBSHH..",
  ".HHSEESSSEESH...",
  "..HSSSSNSSSSH...",
  "..HSSSSNSSSSs...",
  "..sSSSNNSSSSs...",
  "...SSSSSSSSS....",
  "...sSSMMMSSs....",
  "....sSSSSSs.....",
  ".....sSSSs......",
  "...KKKKKKKKK....",
  "..KKkKKKKkKKKC..",
  ".CCKKKkKKKKCCCC.",
  "CCCCCKKKKCCCCCCC",
];
const INK: Record<string, string> = {
  H: "#4a3424",
  h: "#6e5038",
  S: "#e6c09c",
  s: "#c49470",
  N: "#c9a07c",
  E: "#3a2a20",
  B: "#3b2a1e",
  M: "#9a5a4a",
  K: "#6f7d68",
  k: "#55604f",
  C: "#262c3c",
};

function cells(rows: string[], ox: number, oy: number, talking: boolean) {
  return rows.flatMap((row, y) =>
    [...row].map((ch, x) => (INK[ch] ? <rect key={`${ox}-${x}-${y}`} x={ox + x} y={oy + y} width={1} height={1} fill={talking && ch === "M" ? "#5a2a20" : INK[ch]} /> : null)),
  );
}

export function GlennFace({ talking }: { talking: boolean }) {
  return (
    <svg className="tb-bach-face tb-glenn-face" viewBox="0 0 16 18" shapeRendering="crispEdges" aria-hidden="true">
      {cells(FACE, 0, 0, talking)}
    </svg>
  );
}

/** The film's scene: the piano (a grand, side on), Glenn on his low chair turned to the player. */
export function GlennAtPiano({ talking, className }: { talking: boolean; className?: string }) {
  return (
    <svg className={className ?? "glenn-scene"} viewBox="0 0 64 40" shapeRendering="crispEdges" aria-hidden="true">
      {/* the floor */}
      <rect x={0} y={37} width={64} height={3} fill="#1b1622" />
      {/* the grand piano: lid, case, keys, legs */}
      <rect x={30} y={14} width={32} height={3} fill="#0d0b10" />
      <rect x={28} y={17} width={34} height={8} fill="#16131b" />
      <rect x={28} y={17} width={34} height={1} fill="#2c2733" />
      <rect x={24} y={22} width={6} height={2} fill="#eeeadf" />
      <rect x={24} y={22} width={6} height={1} fill="#1a1a1a" />
      <rect x={31} y={25} width={2} height={12} fill="#0d0b10" />
      <rect x={58} y={25} width={2} height={12} fill="#0d0b10" />
      {/* the low chair */}
      <rect x={6} y={31} width={14} height={2} fill="#5a4030" />
      <rect x={7} y={33} width={1} height={4} fill="#3e2c20" />
      <rect x={18} y={33} width={1} height={4} fill="#3e2c20" />
      {/* Glenn, the head turned to us, the body to the keys, low */}
      {cells(FACE, 5, 13, talking)}
      <rect x={20} y={25} width={5} height={2} fill="#262c3c" />
      <rect x={23} y={23} width={2} height={2} fill="#e6c09c" />
    </svg>
  );
}
