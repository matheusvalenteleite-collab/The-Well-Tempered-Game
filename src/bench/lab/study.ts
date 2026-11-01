/**
 * D333 (WTC 1.49), THE LAB's STUDY: a progress study, ten excerpts (study-excerpts.ts) each played ten
 * times in a row, with one configuration fixed for the whole study: the CONFIG preset STUDY_PRESET's
 * parameters as presets.ts defines them when the study starts (snapshotted here, so the study stays the
 * same over days whatever presets.ts or the sliders do since), band time FIXED, the sampled piano, no
 * reading, no WAIT FOR ME, not Bluetooth, LADDER, the game's own tempo.
 *
 * Each take is a full lab log (log.ts, the RUNS format, with `study` naming its place). The whole study
 * is one JSON file (`StudyFile`), the takes inline, for the developer (tools/lab/study-report.ts;
 * tools/lab/replay.ts --take E:T; tools/lab/study-synth.ts). The Lab's STUDY tab is gone: what stays is
 * the file's format, read for the owner's recorded studies (test/fixtures) and the tools.
 */
import type { Mech } from "../mechanics.ts";
import { configById, configMech } from "./presets.ts";
import type { LabLog } from "./log.ts";
import { STUDY_EXCERPTS, type StudyExcerpt } from "./study-excerpts.ts";

/** The CONFIG preset the study is played with (presets.ts id). One line to switch (e.g. to "B+"). */
export const STUDY_PRESET = "B+";
export const TAKES_PER_EXCERPT = 10;
export const STUDY_SOUND = "pianoSampled";

/** Something that happened, for the developer: when he paused, listened, a take discarded. */
export interface StudyMark {
  at: string;
  what: "start" | "listen" | "pause" | "discard" | "resume" | "done" | "export";
  excerpt: number;
  take: number;
}

export interface StudyItem extends StudyExcerpt {
  /** Quarter notes a minute (the game's tempo, 100%). */
  bpm: number;
  /** HEAR IT FIRST played (not counted). */
  heard: number;
  takes: LabLog[];
}

export interface StudyFile {
  kind: "wtc-study";
  v: 1;
  id: string;
  /** The version the study was started on, and every version a take was played on. */
  app: string;
  apps: string[];
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  /** The preset as it was when the study started: its id, name and its own values. */
  preset: { id: string; name: string; values: Partial<Mech> };
  /** Every parameter in force for every take (the preset's on the game's defaults, band time FIXED). */
  mech: Mech;
  sound: string;
  reading: null;
  wait: false;
  bt: false;
  proto: "ladder";
  tempoPct: 100;
  takesPer: number;
  /** The next take to play: its excerpt, and the takes done in it. */
  pos: { excerpt: number; take: number };
  marks: StudyMark[];
  excerpts: StudyItem[];
}

/** The study's mechanics: the preset as presets.ts defines it now, band time FIXED. */
export function studyMech(presetId = STUDY_PRESET): Mech {
  const c = configById(presetId);
  if (!c) throw new Error(`no preset ${presetId}`);
  return { ...configMech(c), bandTime: "fixed" } as Mech;
}

export function newStudy(app: string, bpmOf: (piece: string) => number, now = new Date(), presetId = STUDY_PRESET): StudyFile {
  const c = configById(presetId)!;
  const at = now.toISOString();
  return {
    kind: "wtc-study",
    v: 1,
    id: `study-${at}`,
    app,
    apps: [app],
    startedAt: at,
    updatedAt: at,
    preset: { id: c.id, name: c.name, values: { ...c.values } },
    mech: studyMech(presetId),
    sound: STUDY_SOUND,
    reading: null,
    wait: false,
    bt: false,
    proto: "ladder",
    tempoPct: 100,
    takesPer: TAKES_PER_EXCERPT,
    pos: { excerpt: 0, take: 0 },
    marks: [{ at, what: "start", excerpt: 0, take: 0 }],
    excerpts: STUDY_EXCERPTS.map((e) => ({ ...e, bpm: bpmOf(e.piece), heard: 0, takes: [] })),
  };
}

/** The take just played added (its place recorded on its log), the position moved on. */
export function addTake(s: StudyFile, log: LabLog, app: string, now = new Date()): StudyFile {
  const { excerpt, take } = s.pos;
  const item = s.excerpts[excerpt];
  const tagged: LabLog = { ...log, study: { id: s.id, excerpt, take } };
  const takes = [...item.takes.slice(0, take), tagged];
  const excerpts = s.excerpts.map((x, i) => (i === excerpt ? { ...x, takes } : x));
  const next = take + 1 >= s.takesPer ? { excerpt: excerpt + 1, take: 0 } : { excerpt, take: take + 1 };
  const at = now.toISOString();
  const done = next.excerpt >= s.excerpts.length;
  return {
    ...s,
    excerpts,
    pos: next,
    updatedAt: at,
    apps: s.apps.includes(app) ? s.apps : [...s.apps, app],
    ...(done ? { finishedAt: at, marks: [...s.marks, { at, what: "done" as const, excerpt, take }] } : {}),
  };
}

/** A study read back from a file (or pasted text, read from its first "{"); throws a plain message. */
export function parseStudy(text: string): StudyFile {
  const at = text.indexOf("{");
  const s = JSON.parse(at > 0 ? text.slice(at) : text) as StudyFile;
  if (!s || s.kind !== "wtc-study" || !Array.isArray(s.excerpts)) throw new Error("not a WTC study file");
  return s;
}

/** One take of a study file as a lab log (for tools/lab/replay.ts): "3:4" is excerpt 3, take 4, counted from 1. */
export function takeOf(s: StudyFile, where: string): LabLog {
  const [e, t] = where.split(":").map(Number);
  const log = s.excerpts[e - 1]?.takes[t - 1];
  if (!log) throw new Error(`no take ${where} (excerpt:take, from 1)`);
  return log;
}
