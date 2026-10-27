/**
 * D333 (WTC 1.49), THE LAB's STUDY: a progress study, ten excerpts (study-excerpts.ts) each played ten
 * times in a row, with one configuration fixed for the whole study: the CONFIG preset STUDY_PRESET's
 * parameters as presets.ts defines them when the study starts (snapshotted here, so the study stays the
 * same over days whatever presets.ts or the sliders do since), band time FIXED, the sampled piano, no
 * reading, no WAIT FOR ME, not Bluetooth, LADDER, the game's own tempo.
 *
 * Each take is a full lab log (log.ts, the RUNS format, with `study` naming its place), saved to the
 * device after every take: the study's head under STUDY_KEY, each take under its own key (so a take's
 * save writes only that take). The whole study is exported as one JSON file (`StudyFile`), the takes
 * inline, for the developer (tools/lab/study-report.ts; tools/lab/replay.ts --take E:T).
 */
import { MECH_DEFAULTS, type Mech } from "../mechanics.ts";
import { configById, configMech } from "./presets.ts";
import type { LabLog } from "./log.ts";
import { STUDY_EXCERPTS, type StudyExcerpt } from "./study-excerpts.ts";
import { barStart, fugueById } from "../../touch/fugue.ts";

/** The CONFIG preset the study is played with (presets.ts id). One line to switch (e.g. to "B+"). */
export const STUDY_PRESET = "B";
export const TAKES_PER_EXCERPT = 10;
export const STUDY_SOUND = "pianoSampled";
/** The pause after a take, its tally shown, before the next one's count-in (ms). */
export const BETWEEN_MS = 2000;

export const STUDY_KEY = "tb-lab-study-v1";
const TAKE_KEY = "tb-lab-study-take-v1";
/** The owner's lab settings while a study session has them replaced (put back on leaving, or on the next load). */
export const STUDY_RESTORE_KEY = "tb-lab-study-restore-v1";

/** Where a take stands in the study: excerpt and take, from 0. */
export interface StudyPlace {
  id: string;
  excerpt: number;
  take: number;
}

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

export const studyDone = (s: StudyFile) => s.pos.excerpt >= s.excerpts.length;

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

export function mark(s: StudyFile, what: StudyMark["what"], now = new Date()): StudyFile {
  return { ...s, marks: [...s.marks, { at: now.toISOString(), what, excerpt: s.pos.excerpt, take: s.pos.take }] };
}

// STORAGE (every access guarded: a private window, a full device).
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
const storage = (): Store | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};
const takeKey = (id: string, e: number, t: number) => `${TAKE_KEY}:${id}:${e}:${t}`;

/** The study's head saved (no takes); false when the device refused. */
export function saveHead(s: StudyFile, st: Store | null = storage()): boolean {
  if (!st) return false;
  try {
    st.setItem(STUDY_KEY, JSON.stringify({ ...s, excerpts: s.excerpts.map((x) => ({ ...x, takes: x.takes.length })) }));
    return true;
  } catch {
    return false;
  }
}

/**
 * A text packed for the device's storage: gzip and base64 ("gz:…", about a fifth of a log's size, where
 * the browser has CompressionStream: iOS 16.4 on), else as it is.
 */
export async function pack(text: string): Promise<string> {
  if (typeof CompressionStream === "undefined") return text;
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `gz:${btoa(bin)}`;
  } catch {
    return text;
  }
}
export async function unpack(stored: string): Promise<string> {
  if (!stored.startsWith("gz:")) return stored;
  const bin = atob(stored.slice(3));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

/** One take saved under its own key (packed); false when the device refused (its storage full). */
export async function saveTake(s: StudyFile, e: number, t: number, st: Store | null = storage()): Promise<boolean> {
  const log = s.excerpts[e]?.takes[t];
  if (!st || !log) return false;
  const text = await pack(JSON.stringify(log));
  try {
    st.setItem(takeKey(s.id, e, t), text);
    return true;
  } catch {
    return false;
  }
}

/** The study saved on this device, its takes read back (those that were saved). */
export async function loadStudy(st: Store | null = storage()): Promise<StudyFile | null> {
  if (!st) return null;
  try {
    const raw = st.getItem(STUDY_KEY);
    if (!raw) return null;
    const head = JSON.parse(raw) as Omit<StudyFile, "excerpts"> & { excerpts: (Omit<StudyItem, "takes"> & { takes: number })[] };
    if (head.kind !== "wtc-study" || head.v !== 1) return null;
    const excerpts: StudyItem[] = [];
    for (const [e, x] of head.excerpts.entries()) {
      const takes: LabLog[] = [];
      for (let t = 0; t < x.takes; t++) {
        const r = st.getItem(takeKey(head.id, e, t));
        if (!r) break;
        try {
          takes.push(JSON.parse(await unpack(r)) as LabLog);
        } catch {
          break;
        }
      }
      excerpts.push({ ...x, takes });
    }
    // A take that was not saved (the device full) is played again: the position follows what was kept.
    let pos = head.pos;
    const short = excerpts.findIndex((x, e) => x.takes.length < (e < head.pos.excerpt ? head.takesPer : e === head.pos.excerpt ? head.pos.take : 0));
    if (short >= 0) pos = { excerpt: short, take: excerpts[short].takes.length };
    return { ...head, excerpts, pos, finishedAt: short >= 0 ? undefined : head.finishedAt };
  } catch {
    return null;
  }
}

/** Every key of a study's takes removed (a new study replacing it). */
export function clearStudy(st: Store | null = storage()) {
  if (!st) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < st.length; i++) {
      const k = st.key(i);
      if (k && (k === STUDY_KEY || k.startsWith(`${TAKE_KEY}:`))) keys.push(k);
    }
    for (const k of keys) st.removeItem(k);
  } catch {
    /* nothing kept */
  }
}

// EXPORT.

/** The file's name: wtc-study-2026-10-27.json (the local date). */
export function studyFileName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `wtc-study-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

export function studyText(s: StudyFile): string {
  return JSON.stringify(s);
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

/** The parameters of the study that differ from the game's (for the screen). */
export function studyChanges(s: StudyFile): string[] {
  return (Object.keys(s.mech) as (keyof Mech)[]).filter((k) => s.mech[k] !== MECH_DEFAULTS[k]);
}

/** An excerpt's length in seconds at its tempo (bars by the score's bar lines). */
export function excerptSeconds(it: Pick<StudyExcerpt, "piece" | "fromBar" | "toBar">, bpm: number): number {
  const f = fugueById(it.piece);
  const from = barStart(f, it.fromBar);
  const until = barStart(f, it.toBar + 1);
  return ((until - from) / f.tpq) * (60 / bpm);
}

// THE OWNER'S SETTINGS while a study session replaces them in memory (never saved over them): the stored
// values of `keys` kept aside when a session begins, put back when it ends, or on the next load when the
// page was closed during one.
export function holdSettings(keys: string[], st: Store | null = storage()) {
  if (!st) return;
  try {
    if (st.getItem(STUDY_RESTORE_KEY) !== null) return;
    st.setItem(STUDY_RESTORE_KEY, JSON.stringify(Object.fromEntries(keys.map((k) => [k, st.getItem(k)]))));
  } catch {
    /* nothing to put back */
  }
}
/** The settings kept aside put back; true when there were some. */
export function releaseSettings(st: Store | null = storage()): boolean {
  if (!st) return false;
  try {
    const raw = st.getItem(STUDY_RESTORE_KEY);
    if (raw === null) return false;
    const kept = JSON.parse(raw) as Record<string, string | null>;
    for (const [k, v] of Object.entries(kept)) v === null ? st.removeItem(k) : st.setItem(k, v);
    st.removeItem(STUDY_RESTORE_KEY);
    return true;
  } catch {
    return false;
  }
}
