/**
 * D922, HOW TO PLAY's drawings: each card's one picture, in the game's own look (the strips, the box with its blue
 * edges, the gold line, notes as blocks in the voice's ink rimmed in white, the thumbs' rings in BASICS' inks: the
 * left warm, the right cool; after a wrong move the two arrows BASICS draws, YOU DID dashed and dim, NEEDED gold).
 * Still pictures (SVG, crisp at any size); nothing moves, nothing flashes.
 */
import type { ReactNode } from "react";
import { lang } from "../../i18n/index.ts";
import { inkOf } from "../../touch/MusicBox.tsx";
import { THUMB_INK } from "../basics/aids2.ts";
import { L, type DrawId, type T } from "../howto-text.ts";

const say = (t: T): string => (lang() === "pt" ? t.pt : lang() === "es" ? t.es : t.en);
const BOX = "#0f1730";
const STRIP = "#1c1f2c";
const EDGE = "#4b8ef0";
const GOLD = "#f3d26b";
const DIM = "#8c88aa";
const MINE = inkOf(1, 3);
const OTHER = inkOf(0, 3);
const OTHER2 = inkOf(2, 3);

const W = 320;
const H = 150;
/** The game's proportions: each bar 22% of the width (protos.ts BAR). */
const BW = Math.round(W * 0.22);
const LINE_X = BW + Math.round((W - 2 * BW) * 0.25);

const WORD = {
  now: L("NOW", "AGORA", "AHORA"),
  perfect: L("PERFECT", "PERFEITO", "PERFECTO"),
  good: L("GOOD", "BOM", "BIEN"),
  up: L("UP", "SOBE", "SUBE"),
  down: L("DOWN", "DESCE", "BAJA"),
  same: L("SAME", "IGUAL", "IGUAL"),
  last: L("LAST TOUCH", "ÚLTIMO TOQUE", "ÚLTIMO TOQUE"),
  did: L("YOU DID", "VOCÊ FEZ", "HICISTE"),
  needed: L("NEEDED", "PRECISAVA", "HACÍA FALTA"),
  left: L("LEFT", "ESQUERDO", "IZQUIERDO"),
  right: L("RIGHT", "DIREITO", "DERECHO"),
  hold: L("HOLD", "SEGURE", "MANTÉN"),
  lift: L("LIFT", "SOLTE", "SUELTA"),
  strong: L("STRONG", "FORTE", "FUERTE"),
  normal: L("NORMAL", "NORMAL", "NORMAL"),
  soft: L("SOFT", "SUAVE", "SUAVE"),
  box: L("BOX", "CAIXA", "CAJA"),
  edge: L("EDGE", "BORDA", "BORDE"),
  joined: L("JOINED: NO GAP", "LIGADO: SEM INTERVALO", "LIGADO: SIN HUECO"),
  short: L("SHORT: LET GO AT ONCE", "CURTO: SOLTE LOGO", "CORTO: SUELTA ENSEGUIDA"),
  rock: L("TOUCH, THEN ROCK", "TOQUE E BALANCE", "TOCA Y BALANCEA"),
  half: L("HALFWAY: IT SOUNDS", "NA METADE: SOA", "A MITAD: SUENA"),
  square: L("SQUARE", "QUADRADA", "CUADRADA"),
  hollow: L("HOLLOW", "OCA", "HUECA"),
  thin: L("THIN", "FINA", "FINA"),
  yours: L("YOUR VOICE", "A SUA VOZ", "TU VOZ"),
  others: L("THE OTHERS", "AS OUTRAS", "LAS OTRAS"),
  bars: L("THUMB BARS", "BARRAS", "BARRAS"),
  subject: L("SUBJECT", "SUJEITO", "SUJETO"),
  // D1003: PSYCH's band as it is (sound.ts krautrock: Mellotron, synthesizer, two guitars, Moog bass): no piano, no organ.
  instr: L("SYNTH · MELLOTRON · GUITARS · BASS", "SYNTH · MELLOTRON · GUITARRAS · BAIXO", "SYNTH · MELLOTRON · GUITARRAS · BAJO"),
  organ: L("HELD: SWELLS SIDEWAYS", "SEGURADA: CRESCE DE LADO", "MANTENIDA: CRECE DE LADO"),
};

function Txt({ x, y, children, ink = DIM, size = 8, anchor = "middle", weight }: { x: number; y: number; children: ReactNode; ink?: string; size?: number; anchor?: "start" | "middle" | "end"; weight?: number }) {
  return (
    <text x={x} y={y} fill={ink} fontSize={size} textAnchor={anchor} fontWeight={weight} className="howto-draw-t">
      {children}
    </text>
  );
}
/** A note block: full and rimmed in white (yours), or thin and dim (the others'). */
function Block({ x, y, w, mine = true, ink = MINE, lit = false, dark = false }: { x: number; y: number; w: number; mine?: boolean; ink?: string; lit?: boolean; dark?: boolean }) {
  if (!mine) return <rect x={x} y={y + 1} width={w} height={4} fill={ink} opacity={0.5} />;
  return (
    <g opacity={dark ? 0.3 : 1}>
      <rect x={x} y={y} width={w} height={6} fill={ink} />
      <rect x={x} y={y - 1} width={w} height={1} fill="#fff" opacity={0.9} />
      <rect x={x} y={y + 6} width={w} height={1} fill="#fff" opacity={0.9} />
      {lit && <rect x={x} y={y} width={w} height={6} fill="#fff" opacity={0.35} />}
    </g>
  );
}
function Ring({ x, y, ink, dim = false, r = 10, fill = false, dashed = false }: { x: number; y: number; ink: string; dim?: boolean; r?: number; fill?: boolean; dashed?: boolean }) {
  return <circle cx={x} cy={y} r={r} fill={fill ? "rgba(255,255,255,0.22)" : "none"} stroke={ink} strokeWidth={2.5} opacity={dim ? 0.45 : 1} strokeDasharray={dashed ? "4 4" : undefined} />;
}
/** BASICS' arrow (aids2.ts): a shaft and a head; the same note a small ring (stay). */
function Arrow({ x, y0, y1, ink, dashed = false, dim = false }: { x: number; y0: number; y1: number; ink: string; dashed?: boolean; dim?: boolean }) {
  const d = Math.sign(y1 - y0);
  if (Math.abs(y1 - y0) < 6) return <circle cx={x} cy={y0} r={9} fill="none" stroke={ink} strokeWidth={3} opacity={dim ? 0.5 : 1} strokeDasharray={dashed ? "4 4" : undefined} />;
  return (
    <g opacity={dim ? 0.5 : 1}>
      <line x1={x} y1={y0 + d * 12} x2={x} y2={y1 - d * 8} stroke={ink} strokeWidth={3} strokeDasharray={dashed ? "4 4" : undefined} />
      <polygon points={`${x},${y1} ${x - 7},${y1 - d * 10} ${x + 7},${y1 - d * 10}`} fill={ink} />
    </g>
  );
}
/** The play screen's frame: two strips, the box between, its blue edges; the gold line. */
function Screen({ children, line = true }: { children?: ReactNode; line?: boolean }) {
  return (
    <>
      <rect x={0} y={0} width={W} height={H} fill={STRIP} />
      <rect x={BW} y={0} width={W - 2 * BW} height={H} fill={BOX} />
      <rect x={BW - 2} y={0} width={2} height={H} fill={EDGE} />
      <rect x={W - BW} y={0} width={2} height={H} fill={EDGE} />
      {children}
      {line && <rect x={LINE_X} y={0} width={2} height={H} fill={GOLD} />}
    </>
  );
}
/** One thumb bar alone, big, at x (for the direction and touch pictures). */
function BarAlone({ x, w, children }: { x: number; w: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={x} y={8} width={w} height={H - 30} fill={STRIP} rx={3} />
      {children}
    </g>
  );
}
function Svg({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg className="howto-draw" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      {children}
    </svg>
  );
}

const L_BAR = BW / 2;
/** The box's middle (captions go there, never under a bar where a long word would be cut). */
const BOX_MID = W / 2;
const R_BAR = W - BW / 2;

function Timing() {
  // Notes drifting to the line; one on it; a ring on the bar at its height; the PERFECT and GOOD bands round the line.
  return (
    <Svg label={`${say(WORD.perfect)} · ${say(WORD.good)}`}>
      <Screen>
        <rect x={LINE_X - 22} y={0} width={44} height={H} fill={GOLD} opacity={0.07} />
        <rect x={LINE_X - 7} y={0} width={16} height={H} fill={GOLD} opacity={0.16} />
        <Block x={LINE_X - 2} y={78} w={22} lit />
        <Block x={LINE_X + 44} y={64} w={22} />
        <Block x={LINE_X + 92} y={52} w={22} />
        <Txt x={LINE_X + 130} y={98} size={14} ink={DIM}>
          ←
        </Txt>
        <Txt x={LINE_X} y={20} ink={GOLD} size={8} weight={700}>
          {say(WORD.now)}
        </Txt>
        <Txt x={LINE_X} y={H - 22} ink="#ffd23f" size={7}>
          {say(WORD.perfect)}
        </Txt>
        <Txt x={LINE_X} y={H - 10} ink="#5fdc6a" size={7}>
          {say(WORD.good)}
        </Txt>
      </Screen>
      <Ring x={R_BAR} y={81} ink={THUMB_INK.right} fill />
      <Ring x={L_BAR} y={81} ink={THUMB_INK.left} dim />
    </Svg>
  );
}

function Direction() {
  // Four bars: up, down, the same, and a wrong move with BASICS' two arrows.
  const bw = 54;
  const gap = (W - 4 * bw) / 5;
  const col = (k: number) => gap + k * (bw + gap);
  const cx = (k: number) => col(k) + bw / 2;
  const ink = THUMB_INK.right;
  return (
    <Svg label={`${say(WORD.up)}, ${say(WORD.down)}, ${say(WORD.same)}, ${say(WORD.did)} / ${say(WORD.needed)}`}>
      <rect x={0} y={0} width={W} height={H} fill={BOX} />
      {[0, 1, 2, 3].map((k) => (
        <BarAlone key={k} x={col(k)} w={bw} />
      ))}
      <Ring x={cx(0)} y={92} ink={ink} dim />
      <Arrow x={cx(0)} y0={92} y1={52} ink={ink} />
      <Ring x={cx(1)} y={52} ink={ink} dim />
      <Arrow x={cx(1)} y0={52} y1={92} ink={ink} />
      <Ring x={cx(2)} y={72} ink={ink} dim />
      <Arrow x={cx(2)} y0={72} y1={72} ink={ink} />
      <Ring x={cx(3)} y={72} ink={ink} dim />
      <Arrow x={cx(3)} y0={72} y1={104} ink={DIM} dashed dim />
      <Arrow x={cx(3) + 14} y0={72} y1={40} ink={GOLD} />
      <Txt x={cx(3) - 2} y={120} size={6} ink={DIM}>
        {say(WORD.did)}
      </Txt>
      <Txt x={cx(3) + 8} y={32} size={6} ink={GOLD}>
        {say(WORD.needed)}
      </Txt>
      {[WORD.up, WORD.down, WORD.same].map((t, k) => (
        <Txt key={k} x={cx(k)} y={H - 8} ink="#e8e4ff" size={8} weight={700}>
          {say(t)}
        </Txt>
      ))}
      <Txt x={cx(3)} y={H - 8} ink="#d8443a" size={8} weight={700}>
        ✕
      </Txt>
      <Txt x={cx(0)} y={112} size={6}>
        {say(WORD.last)}
      </Txt>
    </Svg>
  );
}

function Two() {
  // A scale: the notes taken in turn, left and right; each thumb's rings climb from its own last one.
  const ys = [112, 100, 88, 76, 64, 52];
  return (
    <Svg label={`${say(WORD.left)}, ${say(WORD.right)}`}>
      <Screen>
        {ys.map((y, i) => (
          <Block key={i} x={LINE_X - 2 + i * 26} y={y} w={20} ink={i % 2 ? THUMB_INK.right : THUMB_INK.left} lit={i === 0} />
        ))}
      </Screen>
      <polyline points={ys.filter((_, i) => i % 2 === 0).map((y) => `${L_BAR},${y + 3}`).join(" ")} stroke={THUMB_INK.left} strokeWidth={1} opacity={0.5} fill="none" />
      <polyline points={ys.filter((_, i) => i % 2 === 1).map((y) => `${R_BAR},${y + 3}`).join(" ")} stroke={THUMB_INK.right} strokeWidth={1} opacity={0.5} fill="none" />
      {ys.map((y, i) => (
        <g key={i}>
          <Ring x={i % 2 ? R_BAR : L_BAR} y={y + 3} ink={i % 2 ? THUMB_INK.right : THUMB_INK.left} r={7} dim={i > 1} />
          <Txt x={i % 2 ? R_BAR : L_BAR} y={y + 6} ink="#e8e4ff" size={7}>
            {i + 1}
          </Txt>
        </g>
      ))}
      <Txt x={L_BAR} y={H - 8} ink={THUMB_INK.left} size={7} weight={700}>
        {say(WORD.left)}
      </Txt>
      <Txt x={R_BAR} y={H - 8} ink={THUMB_INK.right} size={7} weight={700}>
        {say(WORD.right)}
      </Txt>
    </Svg>
  );
}

function Hold() {
  // A long block draining while held; a rest after it: LIFT; then the next note.
  return (
    <Svg label={`${say(WORD.hold)}, ${say(WORD.lift)}`}>
      <Screen>
        <Block x={LINE_X - 40} y={70} w={110} />
        <rect x={LINE_X - 40} y={70} width={42} height={6} fill="#fff" opacity={0.45} />
        <Txt x={LINE_X + 30} y={62} ink="#e8e4ff" size={7}>
          {say(WORD.hold)}
        </Txt>
        <Txt x={LINE_X + 92} y={66} ink={GOLD} size={7} weight={700}>
          {say(WORD.lift)}
        </Txt>
        <Block x={LINE_X + 118} y={86} w={30} />
      </Screen>
      <Ring x={R_BAR} y={73} ink={THUMB_INK.right} fill />
      <Txt x={R_BAR} y={98} ink="#e8e4ff" size={6}>
        ▼ {say(WORD.hold)}
      </Txt>
    </Svg>
  );
}

/** A bar's zones across, by the box (strong) to the edge (soft): the left bar, drawn wide. */
function Zones({ zones, foot }: { zones: { t: T; ink: string; draw?: ReactNode }[]; foot?: ReactNode }) {
  const x0 = 24;
  const x1 = W - 24;
  const zw = (x1 - x0) / zones.length;
  return (
    <Svg label={zones.map((z) => say(z.t)).join(" · ")}>
      <rect x={0} y={0} width={W} height={H} fill={BOX} />
      {zones.map((z, k) => (
        <g key={k}>
          <rect x={x0 + k * zw} y={24} width={zw - 2} height={70} fill={z.ink} opacity={0.18 + 0.1 * k} />
          <Txt x={x0 + k * zw + zw / 2} y={46} ink="#e8e4ff" size={9} weight={700}>
            {say(z.t)}
          </Txt>
          {z.draw && <g transform={`translate(${x0 + k * zw + zw / 2 - 24}, 58)`}>{z.draw}</g>}
        </g>
      ))}
      <rect x={x1 - 2} y={20} width={3} height={78} fill={EDGE} />
      <Txt x={x0} y={16} anchor="start" size={7}>
        ← {say(WORD.edge)}
      </Txt>
      <Txt x={x1} y={16} anchor="end" size={7}>
        {say(WORD.box)} →
      </Txt>
      {foot}
    </Svg>
  );
}
const pulse = (duty: number) => {
  // Three periods of a pulse wave, 48 wide, 20 high.
  const p = 16;
  let d = "M0,20";
  for (let k = 0; k < 3; k++) d += ` L${k * p},2 L${k * p + p * duty},2 L${k * p + p * duty},20 L${(k + 1) * p},20`;
  return <path d={d} stroke="#9be7a6" strokeWidth={1.5} fill="none" />;
};

function Strong() {
  return (
    <Zones
      zones={[
        { t: WORD.soft, ink: "#5c6bc0" },
        { t: WORD.normal, ink: "#7e8bd8" },
        { t: WORD.strong, ink: "#f3d26b" },
      ]}
      foot={<Ring x={W - 60} y={110} ink={THUMB_INK.left} fill />}
    />
  );
}
function GameBoy() {
  return (
    <Zones
      zones={[
        { t: WORD.square, ink: "#3f8f4f", draw: pulse(0.5) },
        { t: WORD.hollow, ink: "#57a865", draw: pulse(0.25) },
        { t: WORD.thin, ink: "#9be7a6", draw: pulse(0.125) },
      ]}
      foot={
        <Txt x={W / 2} y={H - 18} size={7}>
          {say(WORD.soft)} · {say(WORD.strong)}
        </Txt>
      }
    />
  );
}
function Psych() {
  return (
    <Zones
      zones={[
        { t: WORD.soft, ink: "#8e44ad" },
        { t: WORD.normal, ink: "#b05cc8" },
        { t: WORD.strong, ink: "#ff7ad9" },
      ]}
      foot={
        <>
          <Txt x={W / 2} y={H - 30} size={7} ink="#e8e4ff">
            {say(WORD.instr)}
          </Txt>
          <Txt x={W / 2} y={H - 16} size={7}>
            {say(WORD.organ)}
          </Txt>
        </>
      }
    />
  );
}

function Legato() {
  // JOINED: the left thumb's hold ends as the right's begins (no gap); SHORT: each touch let go at once.
  const row = (y: number, gaps: boolean) => {
    const xs = [40, 100, 160, 220];
    return xs.map((x, i) => {
      const w = gaps ? 18 : 58;
      const ink = i % 2 ? THUMB_INK.right : THUMB_INK.left;
      return (
        <g key={i}>
          <Block x={x} y={y - (i % 2 ? 6 : 0) - i * 3} w={58} lit={!gaps} />
          <rect x={x} y={y + 14} width={w} height={4} fill={ink} />
        </g>
      );
    });
  };
  return (
    <Svg label={`${say(WORD.joined)}; ${say(WORD.short)}`}>
      <rect x={0} y={0} width={W} height={H} fill={BOX} />
      <Txt x={40} y={20} anchor="start" ink="#e8e4ff" size={8} weight={700}>
        {say(WORD.joined)}
      </Txt>
      {row(42, false)}
      <Txt x={40} y={92} anchor="start" ink="#e8e4ff" size={8} weight={700}>
        {say(WORD.short)}
      </Txt>
      {row(114, true)}
    </Svg>
  );
}

function Shake() {
  // A note with its printed trill (TR) over it; the thumb on its bar, rocking.
  return (
    <Svg label={say(WORD.rock)}>
      <Screen>
        <Block x={LINE_X - 4} y={78} w={74} lit />
        <Txt x={LINE_X + 4} y={70} ink={GOLD} size={10} weight={700} anchor="start">
          TR
        </Txt>
        <Block x={LINE_X + 84} y={92} w={24} />
      </Screen>
      <Ring x={R_BAR} y={81} ink={THUMB_INK.right} fill />
      <path d={`M${R_BAR - 16},60 q8,-10 16,0 q8,10 16,0`} stroke={THUMB_INK.right} strokeWidth={2} fill="none" />
      <path d={`M${R_BAR - 16},104 q8,-10 16,0 q8,10 16,0`} stroke={THUMB_INK.right} strokeWidth={2} fill="none" />
      <Txt x={BOX_MID} y={H - 12} ink="#e8e4ff" size={7}>
        {say(WORD.rock)}
      </Txt>
    </Svg>
  );
}

function Slide() {
  // Two notes joined by the box's ribbon; the thumb's path on its bar, the next note sounding from halfway.
  const y0 = 100;
  const y1 = 56;
  return (
    <Svg label={say(WORD.half)}>
      <Screen>
        <Block x={LINE_X - 30} y={y0 - 3} w={40} />
        <path d={`M${LINE_X + 4},${y0} L${LINE_X + 30},${y1}`} stroke="rgba(255,226,120,0.6)" strokeWidth={3} />
        <Block x={LINE_X + 30} y={y1 - 3} w={40} />
      </Screen>
      <line x1={R_BAR} y1={y0} x2={R_BAR} y2={y1} stroke={THUMB_INK.right} strokeWidth={2} strokeDasharray="3 3" />
      <Ring x={R_BAR} y={y0} ink={THUMB_INK.right} dim />
      <Ring x={R_BAR} y={(y0 + y1) / 2} ink={THUMB_INK.right} fill />
      <rect x={R_BAR - 18} y={(y0 + y1) / 2 - 1} width={36} height={2} fill={GOLD} />
      <Txt x={BOX_MID} y={H - 12} ink={GOLD} size={7}>
        {say(WORD.half)}
      </Txt>
    </Svg>
  );
}

function ScreenMap() {
  // The play screen named: the box, the bars, the gold line, your voice and the others, a subject's flag.
  return (
    <Svg label={`${say(WORD.yours)}, ${say(WORD.others)}, ${say(WORD.bars)}`}>
      <Screen>
        <Block x={BW + 6} y={40} w={60} mine={false} ink={OTHER} />
        <Block x={BW + 70} y={34} w={40} mine={false} ink={OTHER} />
        <Block x={BW + 10} y={110} w={80} mine={false} ink={OTHER2} />
        <Block x={LINE_X - 8} y={74} w={30} lit />
        <Block x={LINE_X + 26} y={66} w={30} />
        <Block x={LINE_X + 60} y={80} w={30} />
        <rect x={LINE_X + 26} y={50} width={1} height={16} fill="#fff3c4" />
        <rect x={LINE_X + 27} y={50} width={40} height={9} fill="#fff3c4" />
        <Txt x={LINE_X + 47} y={57} ink="#2a2030" size={6} weight={700}>
          {say(WORD.subject)}
        </Txt>
        <Txt x={LINE_X + 64} y={100} ink="#e8e4ff" size={7}>
          {say(WORD.yours)}
        </Txt>
        <Txt x={BW + 40} y={28} size={7}>
          {say(WORD.others)}
        </Txt>
        <Txt x={LINE_X} y={H - 6} ink={GOLD} size={7} weight={700}>
          {say(WORD.now)}
        </Txt>
      </Screen>
      {/* Upright along each bar, so the word stays inside it whatever its length. */}
      {[L_BAR, R_BAR].map((x) => (
        <g key={x} transform={`rotate(-90 ${x} ${H / 2})`}>
          <Txt x={x} y={H / 2 + 3} size={7}>
            {say(WORD.bars)}
          </Txt>
        </g>
      ))}
    </Svg>
  );
}

export function Drawing({ id }: { id: DrawId }) {
  switch (id) {
    case "timing":
      return <Timing />;
    case "direction":
      return <Direction />;
    case "two":
      return <Two />;
    case "hold":
      return <Hold />;
    case "strong":
      return <Strong />;
    case "legato":
      return <Legato />;
    case "shake":
      return <Shake />;
    case "slide":
      return <Slide />;
    case "gameboy":
      return <GameBoy />;
    case "psych":
      return <Psych />;
    case "screen":
      return <ScreenMap />;
  }
}

/** Every word the drawings write, for the test (three languages each). */
export const DRAW_WORDS: T[] = Object.values(WORD);
