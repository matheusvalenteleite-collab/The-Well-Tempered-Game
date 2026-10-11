/**
 * Bach's 370 chorales as the study holds them (C15; data/chorales/study.json, written by
 * tools/chorales/study_data.py), loaded when first needed: the study of his settings (level 0)
 * and the diminution (level 6, C19) read them.
 */
import { useEffect, useState } from "react";

export type Note = [number, number, string, 1?];
export type Onset = [number, string, string, string, [number, number][]?];
export interface StudyChorale {
  n: number;
  bwv: string;
  title: string;
  tonic: string;
  mode: string;
  sig: number;
  meter: string;
  pickup: number;
  length: number;
  scan: string | null;
  kittel?: number[];
  voices: Note[][];
  harmony: Onset[];
  cadences: [number, string, string][];
}
export interface StudyData {
  kinds: string[];
  chorales: StudyChorale[];
}


let cache: StudyData | null = null;
export function useStudyData(): StudyData | null {
  const [d, setD] = useState<StudyData | null>(cache);
  useEffect(() => {
    if (cache) return;
    void import("../../data/chorales/study.json").then((m) => {
      cache = (m.default ?? m) as unknown as StudyData;
      setD(cache);
    });
  }, []);
  return d;
}

