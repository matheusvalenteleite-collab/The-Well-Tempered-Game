/**
 * The two thumbs. The play area is split down the middle; a touch belongs to the half where it
 * landed and keeps it while it slides, even across the midline, so a thumb that drifts never
 * changes hands. Pure state, so the rules can be tested without a screen.
 */
export type Side = "left" | "right";

export interface Touch {
  id: number;
  side: Side;
  /** Position in the play area, in CSS pixels from its top left. */
  x: number;
  y: number;
  /** Where it landed. */
  x0: number;
  y0: number;
  /** When it landed (ms, the event clock). */
  t0: number;
}

export type Touches = ReadonlyMap<number, Touch>;

export function sideOf(x: number, width: number): Side {
  return x < width / 2 ? "left" : "right";
}

export function touchDown(s: Touches, id: number, x: number, y: number, width: number, t: number): Touches {
  const next = new Map(s);
  next.set(id, { id, side: sideOf(x, width), x, y, x0: x, y0: y, t0: t });
  return next;
}

export function touchMove(s: Touches, id: number, x: number, y: number): Touches {
  const cur = s.get(id);
  if (!cur || (cur.x === x && cur.y === y)) return s;
  const next = new Map(s);
  next.set(id, { ...cur, x, y });
  return next;
}

/** D191: a lift the system made (pointercancel: a scroll, a system gesture), not the player: no tap. */
export const cancelled = (type: string) => type === "pointercancel";

export function touchUp(s: Touches, id: number): Touches {
  if (!s.has(id)) return s;
  const next = new Map(s);
  next.delete(id);
  return next;
}

export function onSide(s: Touches, side: Side): Touch[] {
  return [...s.values()].filter((t) => t.side === side);
}
