/**
 * The listening guide's observations (the owner's split: this module finds the moments, the
 * playback session draws them beside the score). For each of Bach's 370 chorales, the moments a
 * first-time listener may be shown, computed from the library's readings (Kirnberger's categories,
 * C22-C24) by tools/chorales/listening_notes.py; loaded when first needed.
 */
import { useEffect, useState } from "react";
import { t } from "../ui/i18n.ts";

export type ListeningKind =
  | "picardy" | "phrygian" | "deceptive" | "foreignClose" | "dim7" | "improperSeventh" | "unpreparedSeventh"
  | "suspensionChain" | "chromaticLine" | "crossRelation" | "crossing" | "peak";
type Row = [number, number | null, number[], ListeningKind, Record<string, string | number>];
export interface ListeningData {
  chorales: Record<string, Row[]>;
}
export interface ListeningNote {
  /** Onset (and end, for a span) in 32nds of a whole note, the grid of study.json. */
  at: number;
  end?: number;
  /** The voices concerned, 0 soprano .. 3 bass. */
  voices: number[];
  kind: ListeningKind;
  /** The sentence to show, in the interface's language. */
  text: string;
}

let cache: ListeningData | null = null;
export function useListeningNotes(): ListeningData | null {
  const [d, setD] = useState<ListeningData | null>(cache);
  useEffect(() => {
    if (cache) return;
    void import("../../data/chorales/listening.json").then((m) => {
      cache = (m.default ?? m) as unknown as ListeningData;
      setD(cache);
    });
  }, []);
  return d;
}

const VOICE_WORDS = new Set(["voice", "a", "b", "upper", "lower"]);

/** The observations for Bach's chorale `n`, in time order, each with its sentence. */
export function notesFor(data: ListeningData, n: number): ListeningNote[] {
  return (data.chorales[String(n)] ?? []).map(([at, end, voices, kind, vars]) => {
    const v: Record<string, string | number> = {};
    for (const [k, x] of Object.entries(vars)) v[k] = VOICE_WORDS.has(k) && typeof x === "string" ? t(`chorale.guide.voice.${x}`) : x;
    if (kind === "chromaticLine") v.dir = t(`chorale.guide.dir.${vars.dir}`);
    return { at, ...(end !== null ? { end } : {}), voices, kind, text: t(`chorale.guide.${kind}`, v) };
  });
}
