import { tr } from "../i18n/index.ts";

/** D727: an Art of Fugue tile's number and its kind ("12" RECTUS; CANON 8VE). */
export function aofLabel(id: string): { n: string; sub: string } {
  const m = /^bwv1080-(c?)(\d+)([ri]?)$/.exec(id);
  if (!m) return { n: "", sub: "" };
  if (m[1]) return { n: tr("CANON"), sub: tr(({ "14": "AUG.", "15": "8VE", "16": "10TH", "17": "12TH" } as Record<string, string>)[m[2]] ?? "") };
  return { n: String(Number(m[2])), sub: m[3] === "r" ? tr("RECTUS") : m[3] === "i" ? tr("INVERSUS") : id === "bwv1080-14" ? tr("UNFINISHED") : tr("CONTRAPUNCTUS") };
}
