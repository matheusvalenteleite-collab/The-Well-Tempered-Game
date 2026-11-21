/**
 * D920, HOW TO PLAY, the written companion of BASICS v2 (the owner: "minimalistic, well designed, slick,
 * informative as the interactive tutorials but only via texts, illustrations, playable segments"). One scrolling
 * page under a row of chips: PART A, six chapters in BASICS' order (TIMING, DIRECTION, TWO THUMBS, HOLDING, A REAL
 * FUGUE, MAKE IT SING), each idea a card: a title, one or two sentences, one picture (D922's drawings, or a clip of
 * real bars), the real-thumbs clip BASICS shows (D690) one tap away, and TRY IT (D921: BASICS' own stage on the
 * game's engine, in a pad over the guide); PART B, the reference, a folded row each.
 *
 * Kept from D452: CLIPS, real bars of real fugues drawn as the box draws them (the strips, the box, the gold line,
 * each voice in its ink, the player's notes full and rimmed, the entries' flags in D493's forms) and heard through
 * the game's sound when LISTEN is tapped; the reference's still figures (the flags, the grades, the signs, the
 * words). A clip stops when another starts, when a pad opens and when the guide closes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { lang, tr } from "../i18n/index.ts";
import { barStart, fugueById, loadExtras, type TouchFugue } from "../touch/fugue.ts";
import type { Chip } from "../touch/chip.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { ORN_PIXELS, formText, formWidth, ornText, pixRaw, pixText } from "../touch/box-fx.ts";
import { markLegend } from "../touch/readings.ts";
import { SIGN_PIXELS_5, type Sign } from "../touch/chroma.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";
import { tempoOf } from "../touch/tempi.ts";
import { GRADE_INK } from "./LiteGrid.tsx";
import { PLAY, REF, UI, type Card, type Chapter, type Clip, type Fig, type RefRow, type T, type Try, type Video } from "./howto-text.ts";
import { Drawing } from "./howto/Drawings.tsx";
import { TryPad } from "./howto/TryPad.tsx";

/** A note a clip plays: its time and length in seconds from the clip's start, its pitch, its voice. */
export interface ClipNote {
  at: number;
  len: number;
  midi: number;
  voice: number;
}
export interface HowToSound {
  /** Plays the notes (the voice `mine` led); resolves with the page's clock (s) when the first is heard. */
  play: (notes: ClipNote[], voices: number, mine: number) => Promise<number>;
  stop: () => void;
}

export const say = (t: T): string => (lang() === "pt" ? t.pt : lang() === "es" ? t.es : t.en);

const BOX = "#0f1730";
const STRIP = "#1c1f2c";
const EDGE = "#4b8ef0";
const LINE = "#18223f";
const GOLD = "#f3d26b";
const FLAG_BG = "#fff3c4";
const FLAG_INK = "#2a2030";

/** A clip's notes from the fugue's own: every voice asked, between two bars, in seconds at the fugue's tempo (`speed` slower below 1). */
export function clipNotes(f: TouchFugue, c: Clip): { notes: (ClipNote & { on: number; dur: number })[]; from: number; to: number; tps: number } {
  const from = barStart(f, c.bars[0]);
  const to = barStart(f, c.bars[1] + 1);
  const tps = ((f.tpq * tempoOf(f.id)) / 60) * (c.speed ?? 1);
  const voices = c.voices ?? f.voices.map((_, i) => i);
  const notes = voices.flatMap((v) => (f.voices[v] ?? []).filter((n) => n[0] >= from && n[0] < to).map((n) => ({ on: n[0], dur: Math.min(n[1], to - n[0]), at: (n[0] - from) / tps, len: Math.min(n[1], to - n[0]) / tps, midi: n[2], voice: v })));
  return { notes: notes.sort((a, b) => a.at - b.at || a.voice - b.voice), from, to, tps };
}

/** The entries a clip flags: those of its voices starting inside it (or the ones it names). */
function clipEntries(f: TouchFugue, c: Clip, from: number, to: number) {
  const voices = new Set(c.voices ?? f.voices.map((_, i) => i));
  return f.entries.filter((e) => voices.has(e.voice) && e.on >= from && e.on < to && (!c.flagBars || c.flagBars.includes(e.bar)));
}

/** CLIP: real bars drawn as the box draws them; ▶ plays and scrolls them. */
function ClipFig({ c, sound, active, setActive, uid }: { c: Clip; sound?: HowToSound; active: string | null; setActive: (id: string | null) => void; uid: string }) {
  const f = fugueById(c.piece);
  const { notes, from, to, tps } = clipNotes(f, c);
  const entries = clipEntries(f, c, from, to);
  const canvas = useRef<HTMLCanvasElement>(null);
  const started = useRef<number | null>(null);
  const playing = active === uid;
  const total = (to - from) / tps;
  useEffect(() => {
    if (!playing) started.current = null;
  }, [playing]);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const cv = canvas.current;
      if (cv) {
        const t = started.current === null ? 0 : performance.now() / 1000 - started.current;
        if (started.current !== null && t > total + 0.6) {
          started.current = null;
          setActive(null);
        }
        paintClip(cv, f, c, notes, entries, from, tps, Math.max(0, t));
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });
  const play = () => {
    if (!sound) return;
    if (playing) {
      sound.stop();
      setActive(null);
      return;
    }
    setActive(uid);
    started.current = null;
    void sound.play(notes, f.voices.length, c.mine ?? -1).then((at) => (started.current = at));
  };
  return (
    <div className="howto-clip">
      <canvas ref={canvas} className="howto-clip-canvas" />
      {sound && (
        <button type="button" className={`howto-play${playing ? " on" : ""}`} id={`howto-play-${uid}`} onClick={play}>
          {playing ? "■" : "▶"} {playing ? tr("STOP") : tr("LISTEN")}
        </button>
      )}
    </div>
  );
}

/**
 * The clip's picture: the two strips, the box, the gold line at a quarter of the box; notes as blocks at
 * their pitch (one height, as the box), moving right to left as they sound; the player's voice full with a
 * white rim, the others thinner and dimmer; a flag over each entry's first note (its word in its form); a
 * slide drawn as the box's ribbon; and, where the clip shows the thumbs, a ring on the strip at the height
 * of the player's note on the line (a ring that glides, never lifts, along a slide).
 */
function paintClip(cv: HTMLCanvasElement, f: TouchFugue, c: Clip, notes: ReturnType<typeof clipNotes>["notes"], entries: TouchFugue["entries"], from: number, tps: number, t: number) {
  const W = cv.clientWidth || 300;
  const H = cv.clientHeight || 120;
  const dpr = Math.min(3, devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) (cv.width = Math.round(W * dpr)), (cv.height = Math.round(H * dpr));
  const g = cv.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  const bar = Math.max(30, Math.round(W * 0.09));
  g.fillStyle = STRIP;
  g.fillRect(0, 0, W, H);
  g.fillStyle = BOX;
  g.fillRect(bar, 0, W - 2 * bar, H);
  g.fillStyle = EDGE;
  g.fillRect(bar - 2, 0, 2, H);
  g.fillRect(W - bar, 0, 2, H);
  const boxW = W - 2 * bar;
  const lineX = bar + Math.round(boxW * 0.25);
  // The window: the whole clip fits the box at rest (the line at its start); it scrolls as it sounds.
  const span = notes.length ? Math.max(...notes.map((n) => n.at + n.len)) : 1;
  const pps = (boxW * 0.72) / Math.max(1, span);
  const xOf = (s: number) => lineX + (s - t) * pps;
  const midis = notes.map((n) => n.midi);
  const lo = Math.min(...midis) - 1;
  const hi = Math.max(...midis) + 1;
  const top = 14;
  const bot = H - 6;
  const bh = Math.max(3, Math.min(6, Math.floor((bot - top) / Math.max(8, hi - lo + 1))));
  const yOf = (m: number) => Math.round(bot - bh - ((m - lo) / Math.max(1, hi - lo)) * (bot - top - bh));
  g.save();
  g.beginPath();
  g.rect(bar, 0, boxW, H);
  g.clip();
  for (let m = lo; m <= hi; m++)
    if (m % 12 === 0) {
      g.fillStyle = LINE;
      g.fillRect(bar, yOf(m) + bh / 2, boxW, 1);
    }
  // The slides' ribbons (under the notes).
  for (const [i, j] of c.slides ?? []) {
    const mine = notes.filter((n) => n.voice === c.mine);
    const a = mine[i];
    const b = mine[j];
    if (!a || !b) continue;
    g.fillStyle = "rgba(255, 226, 120, 0.35)";
    const x0 = xOf(a.at + a.len * 0.5);
    const x1 = xOf(b.at);
    const y0 = yOf(a.midi) + bh / 2;
    const y1 = yOf(b.midi) + bh / 2;
    for (let x = x0; x <= x1; x++) g.fillRect(Math.round(x), Math.round(y0 + ((x - x0) / Math.max(1, x1 - x0)) * (y1 - y0)) - 1, 1, 3);
  }
  for (const n of notes) {
    const x = xOf(n.at);
    const w = Math.max(2, n.len * pps - 1);
    if (x > W || x + w < bar) continue;
    const ink = inkOf(n.voice, f.voices.length);
    const mine = n.voice === c.mine || c.mine === undefined;
    const sounding = t > 0 && n.at <= t && t < n.at + n.len;
    const y = yOf(n.midi);
    if (mine) {
      g.fillStyle = ink;
      g.globalAlpha = sounding ? 1 : 0.9;
      g.fillRect(Math.round(x), y, Math.round(w), bh);
      if (c.mine !== undefined) {
        g.fillStyle = "#ffffff";
        g.globalAlpha = 0.9;
        g.fillRect(Math.round(x), y - 1, Math.round(w), 1);
        g.fillRect(Math.round(x), y + bh, Math.round(w), 1);
      }
    } else {
      g.fillStyle = ink;
      g.globalAlpha = 0.5;
      g.fillRect(Math.round(x), y + 1, Math.round(w), Math.max(1, bh - 2));
    }
    if (sounding) {
      g.globalAlpha = 0.35;
      g.fillStyle = "#ffffff";
      g.fillRect(Math.round(x), y, Math.round(w), bh);
    }
    g.globalAlpha = 1;
  }
  // The flags (D372, D493): the word in its form over the entry's first note.
  for (const e of entries) {
    const first = notes.find((n) => n.voice === e.voice && n.on >= e.on);
    if (!first) continue;
    const word = `${tr("SUBJECT")}${e.theme ? ` ${e.theme}` : ""}`;
    const form = { inverted: e.inverted, scale: e.scale };
    const fw = formWidth(word, form) + 2;
    const px = Math.round(xOf(first.at));
    const fy = Math.max(0, yOf(first.midi) - 10);
    if (px > W || px + fw < bar) continue;
    g.fillStyle = FLAG_BG;
    g.fillRect(px, fy, 1, yOf(first.midi) - fy);
    g.fillRect(px - fw >= bar ? px - fw : px + 1, fy, fw, 7);
    g.fillStyle = inkOf(e.voice, f.voices.length);
    g.fillRect(px - fw >= bar ? px - fw : px + 1, fy + 7, fw, 1);
    formText(g, word, (px - fw >= bar ? px - fw : px + 1) + 1, fy + 1, FLAG_INK, form);
  }
  g.restore();
  // The gold line, now.
  g.fillStyle = GOLD;
  g.fillRect(lineX, 0, 2, H);
  // The thumbs: a ring on the strip at the height of the player's note on the line.
  if (c.thumbs && c.mine !== undefined) {
    const mine = notes.filter((n) => n.voice === c.mine);
    const k = mine.findIndex((n) => n.at <= t && t < n.at + n.len);
    if (t > 0 && k >= 0) {
      const n = mine[k];
      const sliding = (c.slides ?? []).find(([a]) => a === k);
      let y = yOf(n.midi) + bh / 2;
      if (sliding) {
        const b = mine[sliding[1]];
        const p = Math.max(0, Math.min(1, (t - (n.at + n.len * 0.5)) / Math.max(0.05, b.at - (n.at + n.len * 0.5))));
        y += p * (yOf(b.midi) - yOf(n.midi));
      }
      // Alternate thumbs (D: taking turns), a slide's two notes on one.
      let side = 0;
      for (let i = 1; i <= k; i++) if (!(c.slides ?? []).some(([a, b]) => a === i - 1 && b === i)) side = 1 - side;
      const cx = side === 0 ? bar / 2 : W - bar / 2;
      g.strokeStyle = "#ffffff";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, y, Math.max(6, bar * 0.28), 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "rgba(255, 255, 255, 0.25)";
      g.fill();
    }
  }
  // The clip's caption in the box's corner: the fugue and the bars.
  pixText(g, `${f.book === 1 || f.book === 2 ? `${f.book === 1 ? "I" : "II"}/${f.number}` : (f.short ?? f.title).toUpperCase()} · ${c.bars[0] === c.bars[1] ? `${tr("BAR")} ${c.bars[0]}` : `${tr("BARS")} ${c.bars[0]}-${c.bars[1]}`}`, bar + 4, 3, "#8c88aa");
}

/** THE FLAGS: an entry's word in each of its forms (D493), drawn by the box's own lettering. */
function FlagsFig() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const forms: [string, { inverted?: boolean; scale?: 2 | 0.5 }, string][] = [
    [tr("SUBJECT"), {}, "SUBJECT"],
    [tr("SUBJECT"), { inverted: true }, "INVERTED"],
    [tr("SUBJECT"), { scale: 2 }, "AUGMENTED"],
    [tr("SUBJECT"), { scale: 0.5 }, "DIMINISHED"],
    [`${tr("SUBJECT")} 2`, {}, "SUBJECT 2"],
  ];
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const z = 3;
    const rowH = 12;
    const W = 4 + Math.max(...forms.map(([w, f]) => formWidth(w, f) + 4));
    const H = forms.length * rowH + 2;
    const dpr = Math.min(3, devicePixelRatio || 1);
    cv.width = W * z * dpr;
    cv.height = H * z * dpr;
    cv.style.width = `${W * z}px`;
    cv.style.height = `${H * z}px`;
    const g = cv.getContext("2d");
    if (!g) return;
    g.setTransform(z * dpr, 0, 0, z * dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = BOX;
    g.fillRect(0, 0, W, H);
    forms.forEach(([w, f], i) => {
      const y = 2 + i * rowH;
      g.fillStyle = FLAG_BG;
      g.fillRect(2, y, formWidth(w, f) + 2, 7);
      g.fillRect(2, y + 7, 1, 3);
      formText(g, w, 3, y + 1, FLAG_INK, f);
    });
  }, [lang()]);
  return (
    <div className="howto-flags">
      <canvas ref={canvas} className="howto-flags-canvas" />
      <ul className="howto-flags-names">
        {forms.map(([, , name]) => (
          <li key={name}>{tr(name)}</li>
        ))}
      </ul>
    </div>
  );
}

/** THE GRADES in their inks (D446), with the performance each needs (D445). */
function GradesFig() {
  const rows: [string, string][] = [
    ["S", "95"],
    ["A", "90"],
    ["B", "80"],
    ["C", "70"],
    ["D", "< 70"],
  ];
  return (
    <div className="howto-grades">
      {rows.map(([g, p]) => (
        <span key={g} className="howto-grade" style={{ color: GRADE_INK[g], borderColor: GRADE_INK[g] }}>
          <b>{g}</b> {p}
        </span>
      ))}
    </div>
  );
}

/** THE PERFORMANCE's parts (D445): NOTES 60, TIMING 15, TOUCH 15, ENTRIES 10. */
function PartsFig() {
  const parts: [string, number, string][] = [
    ["NOTES", 60, "#5fdc6a"],
    ["TIMING", 15, "#5cb2ff"],
    ["TOUCH", 15, "#c78bff"],
    ["ENTRIES", 10, "#ffd23f"],
  ];
  return (
    <div className="howto-parts" role="img" aria-label={parts.map(([n, w]) => `${tr(n)} ${w}`).join(", ")}>
      {parts.map(([n, w, ink]) => (
        <span key={n} style={{ flexGrow: w, background: ink }}>
          {tr(n)} {w}
        </span>
      ))}
    </div>
  );
}

/** Busoni's signs as the box draws them (readings.ts markLegend: the words already in the player's language). */
function MarksFig() {
  return (
    <ul className="howto-marks">
      {markLegend(STRONG_SIDE).map((l) => (
        <li key={l.kind}>
          <b className={`tb-mark tb-mark-${l.kind}`}>{l.sym}</b> {l.text}
        </li>
      ))}
    </ul>
  );
}

/**
 * D657: the signs as the box draws them, each on a block in the player's ink (a pixel an SVG square, crisp at any
 * size), and the ornaments' signs as the box writes them over a note (pixText's own pixels).
 */
const SIGN_ROWS: [Sign, T][] = [
  ["sharp", { en: "SHARP: a half step higher", pt: "SUSTENIDO: meio tom acima", es: "SOSTENIDO: medio tono más alto" }],
  ["flat", { en: "FLAT: a half step lower", pt: "BEMOL: meio tom abaixo", es: "BEMOL: medio tono más bajo" }],
  ["natural", { en: "NATURAL: the key's sharp or flat cancelled", pt: "BEQUADRO: o sustenido ou bemol do tom cancelado", es: "BECUADRO: el sostenido o bemol de la tonalidad cancelado" }],
  ["double", { en: "DOUBLE SHARP: two half steps higher, a small x as in print", pt: "DOBRADO SUSTENIDO: dois meios tons acima, um x pequeno como na partitura", es: "DOBLE SOSTENIDO: dos medios tonos más alto, una x pequeña como en la partitura" }],
  ["doubleFlat", { en: "DOUBLE FLAT: two half steps lower", pt: "DOBRADO BEMOL: dois meios tons abaixo", es: "DOBLE BEMOL: dos medios tonos más bajo" }],
];
const ORN_ROWS: [string, T][] = [
  ["TR", { en: "TRILL: the note and the one above, quickly in turn", pt: "TRINADO: a nota e a de cima, rápido, alternadas", es: "TRINO: la nota y la de arriba, rápido, alternadas" }],
  ["(TR)", { en: "A TRILL BUSONI LEAVES TO YOU", pt: "UM TRINADO QUE BUSONI DEIXA A SEU CRITÉRIO", es: "UN TRINO QUE BUSONI DEJA A TU ELECCIÓN" }],
  ["~", { en: "SHORT TRILL (PRALLTRILLER): from the note above, a few beats", pt: "TRINADO CURTO (PRALLTRILLER): da nota de cima, poucas batidas", es: "TRINO CORTO (PRALLTRILLER): desde la nota de arriba, pocas batidas" }],
  ["~|", { en: "MORDENT: the note, the step below, the note", pt: "MORDENTE: a nota, o grau abaixo, a nota", es: "MORDENTE: la nota, el grado de abajo, la nota" }],
  ["S", { en: "TURN: above, the note, below, the note", pt: "GRUPETO: acima, a nota, abaixo, a nota", es: "GRUPETO: arriba, la nota, abajo, la nota" }],
];
function pixSvg(rects: [number, number][], w: number, h: number, ink: string, block?: string) {
  return (
    <svg className="howto-sign" viewBox={`0 0 ${w} ${h}`} width={w * 3} height={h * 3} aria-hidden="true" shapeRendering="crispEdges">
      {block && <rect x={0} y={0} width={w} height={h} fill={block} />}
      {rects.map(([x, y]) => (
        <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} fill={ink} />
      ))}
    </svg>
  );
}
function SignsFig({ where }: { where: "in" | "over" }) {
  if (where === "in")
    return (
      <ul className="howto-signs">
        {SIGN_ROWS.map(([k, t]) => {
          const g = SIGN_PIXELS_5[k];
          const rects: [number, number][] = [];
          g.forEach((row, y) => [...row].forEach((on, x) => on === "1" && rects.push([x + 2, y + 1])));
          return (
            <li key={k}>
              {pixSvg(rects, 14, 7, "rgba(0,0,0,0.72)", inkOf(1, 3))}
              <span>{say(t)}</span>
            </li>
          );
        })}
      </ul>
    );
  return (
    <ul className="howto-signs">
      {ORN_ROWS.map(([mk, t]) => {
        const rects: [number, number][] = [];
        const at = { fillStyle: "", fillRect: (x: number, y: number) => void rects.push([x, y]) };
        const wd = ORN_PIXELS[mk] ? (ornText(at as unknown as CanvasRenderingContext2D, mk, 0, 0, "", 1), ORN_PIXELS[mk][0].length) : pixRaw(at, mk, 0, 0, "", 1);
        return (
          <li key={mk}>
            {pixSvg(rects, wd, 5, "#ffd23f")}
            <span>{say(t)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The words the box writes as you play (the game's own, in the player's language). */
function WordsFig({ words }: { words: readonly [string, string][] }) {
  return (
    <ul className="howto-words">
      {words.map(([w, ink]) => (
        <li key={w} style={{ color: ink }}>
          {tr(w)}
        </li>
      ))}
    </ul>
  );
}


/** BASICS v2's real-thumbs clips (D690), by name (each 2 s, muted, looping). */
const VIDEOS: Record<Video, string> = {
  tap: new URL("./basics/clips/tap.mp4", import.meta.url).href,
  up: new URL("./basics/clips/up.mp4", import.meta.url).href,
  down: new URL("./basics/clips/down.mp4", import.meta.url).href,
  same: new URL("./basics/clips/same.mp4", import.meta.url).href,
  leap: new URL("./basics/clips/leap.mp4", import.meta.url).href,
  two: new URL("./basics/clips/two.mp4", import.meta.url).href,
  hold: new URL("./basics/clips/hold.mp4", import.meta.url).href,
  lift: new URL("./basics/clips/lift.mp4", import.meta.url).href,
};
const VIDEO_WORD: Record<Video, T> = {
  tap: { en: "TAP", pt: "TOQUE", es: "TOQUE" },
  up: { en: "UP", pt: "SOBE", es: "SUBE" },
  down: { en: "DOWN", pt: "DESCE", es: "BAJA" },
  same: { en: "SAME", pt: "IGUAL", es: "IGUAL" },
  leap: { en: "LEAP", pt: "SALTO", es: "SALTO" },
  two: { en: "TWO", pt: "DOIS", es: "DOS" },
  hold: { en: "HOLD", pt: "SEGURE", es: "MANTÉN" },
  lift: { en: "LIFT", pt: "SOLTE", es: "SUELTA" },
};

function Figure({ fig, sound, active, setActive, uid }: { fig: Fig; sound?: HowToSound; active: string | null; setActive: (id: string | null) => void; uid: string }) {
  switch (fig.kind) {
    case "draw":
      return <Drawing id={fig.draw} />;
    case "clip":
      return <ClipFig c={fig.clip} sound={sound} active={active} setActive={setActive} uid={uid} />;
    case "flags":
      return <FlagsFig />;
    case "grades":
      return (
        <>
          <PartsFig />
          <GradesFig />
        </>
      );
    case "parts":
      return <PartsFig />;
    case "marks":
      return <MarksFig />;
    case "signs":
      return (
        <>
          <SignsFig where="in" />
          <SignsFig where={fig.where} />
          <MarksFig />
        </>
      );
    case "words":
      return <WordsFig words={fig.words} />;
  }
}

/**
 * The picture's slot: the drawing (or the clip), or BASICS' real thumbs when THUMBS is chosen; a card with several
 * clips shows a chip for each. The slot keeps its size whichever is shown (the studio's later clips go in here).
 */
function Visual({ card, sound, active, setActive }: { card: Card; sound?: HowToSound; active: string | null; setActive: (id: string | null) => void }) {
  const [shown, setShown] = useState<Video | null>(null);
  const vids = card.videos ?? [];
  return (
    <div className="howto-visual">
      <div className="howto-visual-frame">
        {shown ? <video key={shown} className="howto-video" src={VIDEOS[shown]} autoPlay loop muted playsInline aria-label={say(VIDEO_WORD[shown])} /> : <Figure fig={card.fig} sound={sound} active={active} setActive={setActive} uid={card.id} />}
      </div>
      {vids.length > 0 && (
        <div className="howto-visual-tabs" role="group">
          <button type="button" className={`howto-tab${shown ? "" : " on"}`} id={`howto-pic-${card.id}`} onClick={() => setShown(null)}>
            {say(UI.picture)}
          </button>
          {vids.map((v) => (
            <button key={v} type="button" className={`howto-tab${shown === v ? " on" : ""}`} id={`howto-vid-${card.id}-${v}`} onClick={() => setShown(v)}>
              ▶ {vids.length > 1 ? say(VIDEO_WORD[v]) : say(UI.thumbs)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CardView({ card, sound, active, setActive, tryIt, alone }: { card: Card; sound?: HowToSound; active: string | null; setActive: (id: string | null) => void; tryIt: (t: Try, title: string) => void; alone: boolean }) {
  return (
    <article className="howto-card" id={`howto-card-${card.id}`}>
      <div className="howto-card-text">
        {!alone && <h3>{say(card.title)}</h3>}
        {card.lead.map((t, i) => (
          <p key={i}>{say(t)}</p>
        ))}
        {card.fine && <p className="howto-fine">{say(card.fine)}</p>}
        {card.tries && (
          <div className="howto-tries" role="group" aria-label={say(UI.tryIt)}>
            <span className="howto-try-k">{say(UI.tryIt)}</span>
            {card.tries.map((t) => (
              <button key={t.stage} type="button" className="howto-try" id={`howto-try-${t.stage}`} onClick={() => tryIt(t, `${say(card.title)} · ${say(t.label)}`)}>
                <span aria-hidden="true">▶</span> {say(t.label)}
              </button>
            ))}
          </div>
        )}
      </div>
      <Visual card={card} sound={sound} active={active} setActive={setActive} />
    </article>
  );
}

function ChapterView({ ch, sound, active, setActive, tryIt }: { ch: Chapter; sound?: HowToSound; active: string | null; setActive: (id: string | null) => void; tryIt: (t: Try, title: string) => void }) {
  return (
    <section className="howto-chapter" id={`howto-${ch.id}`} data-chip={ch.id}>
      <h2>
        <span className="howto-n">{ch.n}</span> {say(ch.title)}
      </h2>
      {ch.intro && <p className="howto-intro">{say(ch.intro)}</p>}
      {ch.cards.map((c) => (
        <CardView key={c.id} card={c} sound={sound} active={active} setActive={setActive} tryIt={tryIt} alone={ch.cards.length === 1} />
      ))}
    </section>
  );
}

function RefView({ row, sound, active, setActive }: { row: RefRow; sound?: HowToSound; active: string | null; setActive: (id: string | null) => void }) {
  return (
    <details className="howto-ref" id={`howto-ref-${row.id}`}>
      <summary>{say(row.title)}</summary>
      <div className="howto-ref-body">
        <div className="howto-ref-text">
          {row.lines.map((t, i) => (
            <p key={i}>{say(t)}</p>
          ))}
        </div>
        {row.fig && (
          <div className="howto-ref-fig">
            <Figure fig={row.fig} sound={sound} active={active} setActive={setActive} uid={`ref-${row.id}`} />
          </div>
        )}
      </div>
    </details>
  );
}

const CHIPS = [...PLAY.map((c) => ({ id: c.id, n: c.n, t: c.title })), { id: "ref", n: "i", t: UI.ref }];

/**
 * HOW TO PLAY: the ✕ and the chips always in view (a chip scrolls to its chapter, the one in view lit), the page
 * scrolling under them; TRY IT opens its pad over the guide (DONE comes back to the same place).
 */
export function HowTo({ close, sound, chip, restore }: { close: () => void; sound?: HowToSound; chip?: () => Chip; restore?: () => void }) {
  const [active, setActive] = useState<string | null>(null);
  const [pad, setPad] = useState<{ t: Try; title: string } | null>(null);
  const [inView, setInView] = useState(CHIPS[0].id);
  const [, loaded] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  useEffect(() => () => soundRef.current?.stop(), []);
  // The Art of Fugue's bars (chapter 5) are an extra: loaded with the guide.
  useEffect(() => {
    if (fugueById("bwv1080-01").id !== "bwv1080-01") void loadExtras().then(() => loaded((n) => n + 1));
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), pad ? setPad(null) : close());
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [close, pad]);
  const pick = (id: string | null) => {
    if (id === null || id !== active) soundRef.current?.stop();
    setActive(id);
  };
  const tryIt = (t: Try, title: string) => {
    pick(null);
    setPad({ t, title });
  };
  const noRestore = useCallback(() => {}, []);
  // The chip of the chapter at the top of the page.
  const onScroll = () => {
    const b = body.current;
    if (!b) return;
    const top = b.getBoundingClientRect().top + 8;
    let id = CHIPS[0].id;
    for (const c of CHIPS) {
      const el = b.querySelector<HTMLElement>(`#howto-${c.id}`);
      if (el && el.getBoundingClientRect().top <= top + 40) id = c.id;
    }
    if (id !== inView) setInView(id);
  };
  const go = (id: string) => {
    const b = body.current;
    const el = b?.querySelector<HTMLElement>(`#howto-${id}`);
    if (b && el) b.scrollTo({ top: el.offsetTop - b.offsetTop - 4, behavior: "smooth" });
  };
  return (
    <div className="howto-veil" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="howto" role="dialog" aria-modal="true" aria-label={say(UI.title)} id="howto">
        <header className="howto-head">
          <h1>{say(UI.title)}</h1>
          <nav className="howto-chips" aria-label={say(UI.title)}>
            {CHIPS.map((c) => (
              <button key={c.id} type="button" className={`howto-chip${inView === c.id ? " on" : ""}`} id={`howto-chip-${c.id}`} onClick={() => go(c.id)}>
                <b>{c.n}</b>
                <span>{say(c.t)}</span>
              </button>
            ))}
          </nav>
          <button type="button" id="howto-close" className="tg-x" aria-label="Close" onClick={close}>
            ✕
          </button>
        </header>
        <div className="howto-body" id="howto-body" ref={body} onScroll={onScroll}>
          {PLAY.map((ch) => (
            <ChapterView key={ch.id} ch={ch} sound={sound} active={active} setActive={pick} tryIt={tryIt} />
          ))}
          <section className="howto-chapter howto-refs" id="howto-ref" data-chip="ref">
            <h2>
              <span className="howto-n">i</span> {say(UI.ref)}
            </h2>
            {REF.map((r) => (
              <RefView key={r.id} row={r} sound={sound} active={active} setActive={pick} />
            ))}
          </section>
        </div>
        {pad && chip && <TryPad key={pad.t.stage} t={pad.t} title={pad.title} chip={chip} restore={restore ?? noRestore} close={() => setPad(null)} />}
      </div>
    </div>
  );
}
