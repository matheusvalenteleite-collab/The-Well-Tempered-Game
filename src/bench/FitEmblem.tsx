/**
 * D499 (design studio; the owner: the pictures on the selection screen "are cropped in a weird way instead of resized in
 * a more intelligent manner"): a fugue's 64 × 40 picture shown WHOLE in its slot, never cropped. It is scaled to the
 * largest whole number of device pixels per art pixel that fits (crisp, every pixel the same size) wherever that fills at
 * least INTEGER_MIN of the slot. Where it would not (a slot a little under a whole multiple), it fits the slot exactly
 * from a 4× source drawn pixel for pixel, smoothed down, so no pixel comes out uneven. The margin round it takes the
 * picture's own edge colour, darkened, so it reads as the picture's frame.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { drawEmblem, EMBLEM_H, EMBLEM_W } from "./emblem.ts";
import { emblemUrl } from "./FuguePicker.tsx";
import { FINE_SCALE, fitOf } from "./emblem-fit.ts";

const fine = new Map<string, string>();
function fineUrl(id: string): string {
  let u = fine.get(id);
  if (u !== undefined) return u;
  if (typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.width = EMBLEM_W * FINE_SCALE;
  c.height = EMBLEM_H * FINE_SCALE;
  const g = c.getContext("2d");
  if (!g) return "";
  drawEmblem(g, id, FINE_SCALE);
  u = c.toDataURL("image/png");
  fine.set(id, u);
  return u;
}

const edges = new Map<string, string>();
/** The picture's edge colour (the mean of its border pixels), darkened by half: the frame round it. */
export function edgeOf(id: string): string {
  let e = edges.get(id);
  if (e) return e;
  if (typeof document === "undefined") return "#000";
  const c = document.createElement("canvas");
  c.width = EMBLEM_W;
  c.height = EMBLEM_H;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return "#000";
  drawEmblem(g, id, 1);
  const d = g.getImageData(0, 0, EMBLEM_W, EMBLEM_H).data;
  let r = 0, gg = 0, b = 0, n = 0;
  for (let y = 0; y < EMBLEM_H; y++) for (let x = 0; x < EMBLEM_W; x++) {
    if (x !== 0 && y !== 0 && x !== EMBLEM_W - 1 && y !== EMBLEM_H - 1) continue;
    const i = (y * EMBLEM_W + x) * 4;
    r += d[i];
    gg += d[i + 1];
    b += d[i + 2];
    n++;
  }
  e = `rgb(${Math.round((r / n) * 0.5)},${Math.round((gg / n) * 0.5)},${Math.round((b / n) * 0.5)})`;
  edges.set(id, e);
  return e;
}

const foci = new Map<string, { x: number; y: number }>();
/**
 * D499b (main board; the owner: the big picture in the right column "only occupies 50% of the square … they ought to fit
 * the whole square, with everything of the picture that is relevant visible"): where the picture is in focus (a share
 * of its width and height): the centroid of how far each pixel stands from the picture's own edge colour, i.e. of what
 * is drawn against its ground. The cover crop is centred there, so the subject stays in view.
 */
export function focusOf(id: string): { x: number; y: number } {
  let f = foci.get(id);
  if (f) return f;
  f = { x: 0.5, y: 0.5 };
  if (typeof document === "undefined") return f;
  const c = document.createElement("canvas");
  c.width = EMBLEM_W;
  c.height = EMBLEM_H;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return f;
  drawEmblem(g, id, 1);
  const d = g.getImageData(0, 0, EMBLEM_W, EMBLEM_H).data;
  let er = 0, eg = 0, eb = 0, n = 0;
  for (let y = 0; y < EMBLEM_H; y++) for (let x = 0; x < EMBLEM_W; x++) {
    if (x !== 0 && y !== 0 && x !== EMBLEM_W - 1 && y !== EMBLEM_H - 1) continue;
    const i = (y * EMBLEM_W + x) * 4;
    er += d[i]; eg += d[i + 1]; eb += d[i + 2]; n++;
  }
  er /= n; eg /= n; eb /= n;
  let sw = 0, sx = 0, sy = 0;
  for (let y = 0; y < EMBLEM_H; y++) for (let x = 0; x < EMBLEM_W; x++) {
    const i = (y * EMBLEM_W + x) * 4;
    const w = Math.abs(d[i] - er) + Math.abs(d[i + 1] - eg) + Math.abs(d[i + 2] - eb);
    sw += w; sx += w * (x + 0.5); sy += w * (y + 0.5);
  }
  if (sw > 0) f = { x: sx / sw / EMBLEM_W, y: sy / sw / EMBLEM_H };
  foci.set(id, f);
  return f;
}

/** D499b: the picture covering a slot (no margin), cropped round its focus; pixelated (at this size a pixel is 10+ device px, so a part-pixel of unevenness does not show). */
function coverOf(w: number, h: number, id: string) {
  const s = Math.max(w / EMBLEM_W, h / EMBLEM_H);
  const iw = EMBLEM_W * s, ih = EMBLEM_H * s, f = focusOf(id);
  const left = Math.min(0, Math.max(w - iw, w / 2 - f.x * iw));
  const top = Math.min(0, Math.max(h - ih, h / 2 - f.y * ih));
  return { w: iw, h: ih, left, top };
}

export function FitEmblem({ id, className, cover = false }: { id: string; className?: string; cover?: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ w: number; h: number; whole: boolean } | null>(null);
  const [slot, setSlot] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      setSlot((o) => (o && Math.abs(o.w - r.width) < 0.5 && Math.abs(o.h - r.height) < 0.5 ? o : { w: r.width, h: r.height }));
      const f = fitOf(r.width, r.height, window.devicePixelRatio || 1);
      setFit((o) => (o && Math.abs(o.w - f.w) < 0.01 && Math.abs(o.h - f.h) < 0.01 && o.whole === f.whole ? o : f));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  if (cover) {
    const c = slot ? coverOf(slot.w, slot.h, id) : null;
    return (
      <span ref={box} className={`tb-fit tb-fit-cover${className ? ` ${className}` : ""}`} style={{ position: "relative", background: edgeOf(id) }}>
        <img
          className="tb-fit-img"
          src={emblemUrl(id)}
          width={EMBLEM_W}
          height={EMBLEM_H}
          alt=""
          draggable={false}
          style={c ? { position: "absolute", left: `${c.left}px`, top: `${c.top}px`, width: `${c.w}px`, height: `${c.h}px`, imageRendering: "pixelated" } : { visibility: "hidden" }}
        />
      </span>
    );
  }
  return (
    <span ref={box} className={`tb-fit${className ? ` ${className}` : ""}`} style={{ background: edgeOf(id) }}>
      <img
        className="tb-fit-img"
        src={fit && !fit.whole ? fineUrl(id) : emblemUrl(id)}
        width={EMBLEM_W}
        height={EMBLEM_H}
        alt=""
        draggable={false}
        style={fit ? { width: `${fit.w}px`, height: `${fit.h}px`, imageRendering: fit.whole ? "pixelated" : "auto" } : { visibility: "hidden" }}
      />
    </span>
  );
}
