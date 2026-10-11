/**
 * A link to a passage of the 48 (D147): "#wtc1.02f@12" is Book I no. 2's fugue at bar 12,
 * "#wtc2.03p@25-32" bars 25 to 32 of Book II no. 3's prelude (bars as the score numbers them).
 */
export interface WtcLink {
  id: string;
  piece: "prelude" | "fugue";
  bar: number | null;
  to: number | null;
}

export function parseLink(hash: string): WtcLink | null {
  const m = /^#wtc([12])\.(\d{2})([pf])(?:@(-?\d+)(?:-(-?\d+))?)?$/.exec(hash);
  if (!m) return null;
  return { id: `wtc${m[1]}.${m[2]}`, piece: m[3] === "p" ? "prelude" : "fugue", bar: m[4] !== undefined ? Number(m[4]) : null, to: m[5] !== undefined ? Number(m[5]) : null };
}

export function linkOf(l: WtcLink): string {
  return `#${l.id}${l.piece === "prelude" ? "p" : "f"}${l.bar !== null ? `@${l.bar}${l.to !== null && l.to !== l.bar ? `-${l.to}` : ""}` : ""}`;
}
