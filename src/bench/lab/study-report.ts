/**
 * D333 (WTC 1.49), THE LAB's STUDY read for the developer: per excerpt, the learning curve over its
 * takes (right %, PERFECT %, the timing offset's mean and spread, notes wrong by direction, misses,
 * strays, the joins), the first three takes against the last three, the notes wrong or missed in at
 * least half the takes (persistent errors, with where, the pitch and why) against those that went
 * away, and overall what improved and what stayed. Markdown. From the takes' own verdicts (as played;
 * tools/lab/replay.ts re-judges a take with other parameters). tools/lab/study-report.ts prints it.
 */
import type { LabEvent } from "./events.ts";
import type { LabLog } from "./log.ts";
import { ladderLine } from "./describe.ts";
import { pitchName, silentChip, where } from "./replay.ts";
import { labGame } from "./game.ts";
import type { StudyFile, StudyItem } from "./study.ts";
import { pieceShort } from "./study-excerpts.ts";
import { fugueById } from "../../touch/fugue.ts";

export interface TakeStats {
  take: number;
  of: number;
  right: number;
  wrong: number;
  /** Wrong by the direction rule (LADDER: the thumb's move from its reference). */
  wrongDir: number;
  missed: number;
  stray: number;
  perfect: number;
  rightPct: number;
  perfectPct: number;
  /** The right notes' timing offset (ms, + late): mean and standard deviation. */
  offMean: number;
  offSd: number;
  /** Joins judged, credited, of them with the other thumb still down (an overlap); the handovers' mean gap (ms). */
  judged: number;
  joined: number;
  overlaps: number;
  gapMean: number | null;
  /** Long notes let go early (SHORT) and held their length (HELD). */
  short: number;
  held: number;
  stopped: boolean;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sd = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};
const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

type NoteEv = Extract<LabEvent, { kind: "note" }>;
/** Each note's verdict in a take (its last, as replay.ts outcomes), by track:index. */
function noteOutcomes(events: readonly LabEvent[]) {
  const m = new Map<string, { out: "right" | "wrong" | "miss"; e?: NoteEv; tick: number; midi: number; i: number }>();
  for (const e of events) {
    if (e.kind === "note") m.set(`${e.track}:${e.i}`, { out: e.ok ? "right" : "wrong", e, tick: e.tick, midi: e.midi, i: e.i });
    else if (e.kind === "miss" && !m.has(`${e.track}:${e.i}`)) m.set(`${e.track}:${e.i}`, { out: "miss", tick: e.tick, midi: e.midi, i: e.i });
  }
  return m;
}

export function takeStats(log: LabLog, take: number): TakeStats {
  const o = noteOutcomes(log.verdicts);
  let right = 0;
  let wrong = 0;
  let wrongDir = 0;
  let missed = 0;
  let perfect = 0;
  let judged = 0;
  let joined = 0;
  let overlaps = 0;
  const offs: number[] = [];
  const gaps: number[] = [];
  for (const n of o.values()) {
    if (n.out === "miss") {
      missed++;
      continue;
    }
    const e = n.e!;
    if (n.out === "wrong") {
      wrong++;
      if (e.why === "gesture") wrongDir++;
    } else {
      right++;
      if (e.perfect) perfect++;
      offs.push(e.offMs);
    }
    if (e.legato?.judged && e.ok) {
      judged++;
      if (e.legato.ok) joined++;
      if (e.legato.holding) overlaps++;
      else if (e.legato.gapMs !== undefined) gaps.push(e.legato.gapMs);
    }
  }
  let stray = 0;
  let short = 0;
  let held = 0;
  for (const e of log.verdicts) {
    if (e.kind === "stray") stray++;
    if (e.kind === "release") {
      if (e.word.includes("TOO SOON")) short++;
      if (e.word.includes("HELD")) held++;
    }
  }
  const of = right + wrong + missed;
  return {
    take,
    of,
    right,
    wrong,
    wrongDir,
    missed,
    stray,
    perfect,
    rightPct: of ? (100 * right) / of : 0,
    perfectPct: of ? (100 * perfect) / of : 0,
    offMean: mean(offs),
    offSd: sd(offs),
    judged,
    joined,
    overlaps,
    gapMean: gaps.length ? mean(gaps) : null,
    short,
    held,
    stopped: !!log.stopped,
  };
}

/** A note's errors over the takes. */
export interface NoteErrors {
  key: string;
  at: string;
  pitch: string;
  tick: number;
  /** Takes (from 1) where it was wrong, missed, right. */
  wrongIn: number[];
  missIn: number[];
  /** Why: the direction rule and the thumb's move (the median take's), the touches near it when missed. */
  detail: string;
  /** Its offsets (ms) in the takes where it was right. */
  offs: number[];
}

function noteErrors(item: StudyItem): NoteErrors[] {
  const piece = item.piece;
  // Each note's written onset (a verdict's tick is the touch's time, a little before or after it).
  const log0 = item.takes[0];
  const g = log0 ? labGame(log0.passage, silentChip({ t: 0 })) : null;
  const onset = (k: string, tick: number) => {
    const [t, i] = k.split(":").map(Number);
    return g?.tracks[t]?.notes[i]?.on ?? tick;
  };
  const notes = new Map<string, NoteErrors & { wrongEv: NoteEv[]; nearMs: number[]; bare: number }>();
  item.takes.forEach((log, t) => {
    const o = noteOutcomes(log.verdicts);
    const near = new Map<number, number[]>();
    for (const e of log.verdicts) if (e.kind === "stray" && e.near) near.set(e.near.i, [...(near.get(e.near.i) ?? []), e.near.offMs]);
    for (const [k, n] of o) {
      let x = notes.get(k);
      if (!x) notes.set(k, (x = { key: k, at: where(piece, onset(k, n.tick)), pitch: pitchName(piece, n.midi), tick: onset(k, n.tick), wrongIn: [], missIn: [], detail: "", offs: [], wrongEv: [], nearMs: [], bare: 0 }));
      if (n.out === "wrong") (x.wrongIn.push(t + 1), x.wrongEv.push(n.e!));
      else if (n.out === "miss") {
        x.missIn.push(t + 1);
        const ms = near.get(n.i);
        if (ms?.length) x.nearMs.push(...ms);
        else x.bare++;
      } else x.offs.push(n.e!.offMs);
    }
  });
  return [...notes.values()]
    .sort((a, b) => a.tick - b.tick)
    .map((x) => {
      const parts: string[] = [];
      if (x.wrongEv.length) {
        const dir = x.wrongEv.filter((e) => e.why === "gesture" && e.ladder);
        const moved = dir.map((e) => e.ladder!.movedPx ?? 0);
        const typical = dir.find((e) => (e.ladder!.movedPx ?? 0) === moved.sort((p, q) => p - q)[moved.length >> 1]) ?? dir[0];
        const other = x.wrongEv.length - dir.length;
        if (dir.length) parts.push(`wrong ×${x.wrongEv.length}: ${ladderLine(typical.ladder)}${dir.length > 1 ? ` (moved ${sgn(Math.min(...moved))} to ${sgn(Math.max(...moved))} px over the takes, + up)` : ""}`);
        if (other) parts.push(`wrong ×${other} (${[...new Set(x.wrongEv.filter((e) => !dir.includes(e)).map((e) => e.why ?? "?"))].join(", ")})`);
      }
      if (x.missIn.length) {
        const ms = x.nearMs;
        const lead = ms.length ? `; a touch near it, ${ms.length > 1 ? "median " : ""}${median(ms) >= 0 ? "+" : "−"}${Math.round(Math.abs(median(ms)))} ms (a stray: outside its window or already taken)` : "";
        parts.push(`missed ×${x.missIn.length}${x.bare ? ` (${x.bare} with no touch near)` : ""}${lead}`);
      }
      const { wrongEv: _w, nearMs: _n, bare: _b, ...rest } = x;
      return { ...rest, detail: parts.join(" · ") };
    });
}

export interface ExcerptReport {
  item: StudyItem;
  takes: TakeStats[];
  first: TakeStats;
  last: TakeStats;
  notes: NoteErrors[];
  persistent: NoteErrors[];
  gone: NoteErrors[];
  appeared: NoteErrors[];
  /** Right notes this far off their time on average (ms), in at least half the takes. */
  offTime: NoteErrors[];
  verdict: "improved" | "plateau (already high)" | "plateau" | "worse" | "too few takes";
}

/** The mean of a few takes' stats (the first three, the last three). */
function meanStats(ts: TakeStats[]): TakeStats {
  const m = (k: keyof TakeStats) => mean(ts.map((t) => Number(t[k] ?? 0)));
  const gaps = ts.map((t) => t.gapMean).filter((g): g is number => g !== null);
  return {
    take: 0,
    of: m("of"),
    right: m("right"),
    wrong: m("wrong"),
    wrongDir: m("wrongDir"),
    missed: m("missed"),
    stray: m("stray"),
    perfect: m("perfect"),
    rightPct: m("rightPct"),
    perfectPct: m("perfectPct"),
    offMean: m("offMean"),
    offSd: m("offSd"),
    judged: m("judged"),
    joined: m("joined"),
    overlaps: m("overlaps"),
    gapMean: gaps.length ? mean(gaps) : null,
    short: m("short"),
    held: m("held"),
    stopped: false,
  };
}

export const PERSISTENT_SHARE = 0.5;
const OFF_MS = 80;

export function excerptReport(item: StudyItem): ExcerptReport {
  const takes = item.takes.map((l, i) => takeStats(l, i + 1));
  const k = Math.min(3, Math.floor(takes.length / 2)) || Math.min(1, takes.length);
  const first = meanStats(takes.slice(0, k));
  const last = meanStats(takes.slice(-k));
  const notes = noteErrors(item);
  const n = takes.length;
  const need = Math.max(1, Math.ceil(n * PERSISTENT_SHARE));
  const errIn = (x: NoteErrors) => [...x.wrongIn, ...x.missIn];
  const persistent = notes.filter((x) => errIn(x).length >= need);
  const early = (x: NoteErrors) => errIn(x).filter((t) => t <= k).length;
  const late = (x: NoteErrors) => errIn(x).filter((t) => t > n - k).length;
  // Went away: wrong or missed in at least two takes of the first half, in none of the last three.
  const firstHalf = (x: NoteErrors) => errIn(x).filter((t) => t <= Math.ceil(n / 2)).length;
  const gone = n >= 4 ? notes.filter((x) => firstHalf(x) >= 2 && late(x) === 0 && !persistent.includes(x)) : [];
  const appeared = n >= 4 ? notes.filter((x) => early(x) === 0 && late(x) >= Math.min(2, k)) : [];
  const offTime = notes.filter((x) => x.offs.length >= need && Math.abs(mean(x.offs)) >= OFF_MS);
  const dRight = last.rightPct - first.rightPct;
  const dPerf = last.perfectPct - first.perfectPct;
  const dSd = first.offSd ? (last.offSd - first.offSd) / first.offSd : 0;
  const verdict: ExcerptReport["verdict"] =
    n < 4 ? "too few takes" : dRight <= -10 ? "worse" : dRight >= 10 || (dRight >= -2 && (dPerf >= 10 || dSd <= -0.15)) ? "improved" : first.rightPct >= 95 ? "plateau (already high)" : "plateau";
  return { item, takes, first, last, notes, persistent, gone, appeared, offTime, verdict };
}

// MARKDOWN.
const f0 = (x: number) => String(Math.round(x));
const pct = (x: number) => `${Math.round(x)}%`;
const sgn = (x: number, unit = "") => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.round(Math.abs(x))}${unit}`;
const BARS = "▁▂▃▄▅▆▇█";
/** A curve in eight heights (0–100). */
export function spark(xs: number[]): string {
  return xs.map((x) => BARS[Math.max(0, Math.min(7, Math.round((x / 100) * 7)))]).join("");
}
function takesList(ts: number[]): string {
  return ts.join(",");
}

export function studyMarkdown(s: StudyFile): string {
  const out: string[] = [];
  const reps = s.excerpts.map(excerptReport);
  const played = reps.filter((r) => r.takes.length);
  out.push(`# WTC study ${s.startedAt.slice(0, 10)}`, "");
  out.push(`Preset **${s.preset.name}** (as defined when the study started), band time FIXED, ${s.sound}, no reading, LADDER at the game's tempo; ${s.takesPer} takes an excerpt. Started ${s.startedAt.replace("T", " ").slice(0, 16)} on ${s.app}${s.apps.length > 1 ? ` (also ${s.apps.slice(1).join(", ")})` : ""}; ${s.finishedAt ? `finished ${s.finishedAt.replace("T", " ").slice(0, 16)}` : `unfinished: ${played.reduce((a, r) => a + r.takes.length, 0)} takes played`}.`, "");
  const pauses = s.marks.filter((m) => m.what === "pause").length;
  const discards = s.marks.filter((m) => m.what === "discard").length;
  if (pauses || discards) out.push(`Paused ${pauses} time${pauses === 1 ? "" : "s"}; ${discards} take${discards === 1 ? "" : "s"} interrupted and played again (not counted).`, "");
  out.push("## Overall", "");
  out.push("| # | excerpt | skill | takes | right first 3 → last 3 | PERFECT | timing SD (ms) | wrong dir. | missed | stray | curve (right %) | verdict |", "|---|---|---|---|---|---|---|---|---|---|---|---|");
  reps.forEach((r, i) => {
    const it = r.item;
    if (!r.takes.length) return void out.push(`| ${i + 1} | ${pieceShort(it.piece)} ${fugueById(it.piece).voiceNames[it.voice]?.toLowerCase()} b${it.fromBar}–${it.toBar} | ${it.skill} | 0 | | | | | | | | not played |`);
    out.push(
      `| ${i + 1} | ${pieceShort(it.piece)} ${fugueById(it.piece).voiceNames[it.voice]?.toLowerCase()} b${it.fromBar}–${it.toBar} | ${it.skill} | ${r.takes.length} | ${pct(r.first.rightPct)} → ${pct(r.last.rightPct)} | ${pct(r.first.perfectPct)} → ${pct(r.last.perfectPct)} | ${f0(r.first.offSd)} → ${f0(r.last.offSd)} | ${r.first.wrongDir.toFixed(1)} → ${r.last.wrongDir.toFixed(1)} | ${r.first.missed.toFixed(1)} → ${r.last.missed.toFixed(1)} | ${r.first.stray.toFixed(1)} → ${r.last.stray.toFixed(1)} | ${spark(r.takes.map((t) => t.rightPct))} | ${r.verdict} |`,
    );
  });
  out.push("");
  const by = (v: string) => played.filter((r) => r.verdict.startsWith(v)).map((r) => `${pieceShort(r.item.piece)} (${r.item.skill})`);
  const improved = by("improved");
  const plateau = by("plateau");
  const worse = by("worse");
  if (improved.length) out.push(`- **Improved:** ${improved.join(", ")}.`);
  if (plateau.length) out.push(`- **Plateaued:** ${plateau.join(", ")}.`);
  if (worse.length) out.push(`- **Worse at the end:** ${worse.join(", ")}.`);
  const pers = played.flatMap((r) => r.persistent.map((x) => ({ r, x })));
  out.push(`- **Persistent errors** (wrong or missed in at least half the takes): ${pers.length ? pers.length : "none"}${pers.length ? `, in ${[...new Set(pers.map((p) => pieceShort(p.r.item.piece)))].join(", ")}` : ""}.`);
  const gone = played.reduce((a, r) => a + r.gone.length, 0);
  out.push(`- **Errors that went away** (in two or more takes of the first half, none in the last three): ${gone}.`);
  const dirFirst = mean(played.map((r) => r.first.wrongDir));
  const dirLast = mean(played.map((r) => r.last.wrongDir));
  const sdFirst = mean(played.map((r) => r.first.offSd));
  const sdLast = mean(played.map((r) => r.last.offSd));
  out.push(`- Across the excerpts, a take's notes wrong by direction ${dirFirst.toFixed(1)} → ${dirLast.toFixed(1)}; the timing's spread ${f0(sdFirst)} → ${f0(sdLast)} ms; mean offset ${sgn(mean(played.map((r) => r.first.offMean)), " ms")} → ${sgn(mean(played.map((r) => r.last.offMean)), " ms")} (+ late).`, "");

  reps.forEach((r, i) => {
    const it = r.item;
    const f = fugueById(it.piece);
    out.push(`## ${i + 1}. ${pieceShort(it.piece)} · ${f.voiceNames[it.voice]?.toLowerCase()} · bars ${it.fromBar}–${it.toBar} · ${it.skill}`, "");
    out.push(`${it.tests} ♩ = ${Math.round(it.bpm)}.${it.heard ? ` Heard first ${it.heard}×.` : ""}`, "");
    if (!r.takes.length) return void out.push("Not played.", "");
    out.push("| take | right | PERFECT | offset mean ± SD (ms) | wrong (dir.) | missed | stray | joined / judged | overlaps | gap (ms) | SHORT |", "|---|---|---|---|---|---|---|---|---|---|---|");
    for (const t of r.takes)
      out.push(`| ${t.take}${t.stopped ? " (stopped)" : ""} | ${t.right}/${t.of} ${pct(t.rightPct)} | ${pct(t.perfectPct)} | ${sgn(t.offMean)} ± ${f0(t.offSd)} | ${t.wrong} (${t.wrongDir}) | ${t.missed} | ${t.stray} | ${t.joined}/${t.judged} | ${t.overlaps} | ${t.gapMean === null ? "–" : f0(t.gapMean)} | ${t.short} |`);
    const a = r.first;
    const b = r.last;
    out.push(
      `| **first 3** | ${pct(a.rightPct)} | ${pct(a.perfectPct)} | ${sgn(a.offMean)} ± ${f0(a.offSd)} | ${a.wrong.toFixed(1)} (${a.wrongDir.toFixed(1)}) | ${a.missed.toFixed(1)} | ${a.stray.toFixed(1)} | ${a.joined.toFixed(1)}/${a.judged.toFixed(1)} | ${a.overlaps.toFixed(1)} | ${a.gapMean === null ? "–" : f0(a.gapMean)} | ${a.short.toFixed(1)} |`,
      `| **last 3** | ${pct(b.rightPct)} | ${pct(b.perfectPct)} | ${sgn(b.offMean)} ± ${f0(b.offSd)} | ${b.wrong.toFixed(1)} (${b.wrongDir.toFixed(1)}) | ${b.missed.toFixed(1)} | ${b.stray.toFixed(1)} | ${b.joined.toFixed(1)}/${b.judged.toFixed(1)} | ${b.overlaps.toFixed(1)} | ${b.gapMean === null ? "–" : f0(b.gapMean)} | ${b.short.toFixed(1)} |`,
      "",
    );
    out.push(`Right ${pct(a.rightPct)} → ${pct(b.rightPct)} (${sgn(b.rightPct - a.rightPct, " points")}), PERFECT ${sgn(b.perfectPct - a.perfectPct, " points")}, timing spread ${f0(a.offSd)} → ${f0(b.offSd)} ms: **${r.verdict}**.`, "");
    if (r.persistent.length) {
      out.push(`**Persistent errors** (wrong or missed in ≥ ${Math.ceil(r.takes.length * PERSISTENT_SHARE)} of ${r.takes.length} takes):`, "");
      for (const x of r.persistent) out.push(`- ${x.at} ${x.pitch}: ${x.detail} (takes ${takesList([...x.wrongIn, ...x.missIn].sort((p, q) => p - q))})`);
      out.push("");
    } else out.push("No persistent errors.", "");
    if (r.offTime.length) {
      out.push(`**Right but off time** (mean offset ≥ ${OFF_MS} ms over ≥ half the takes):`, "");
      for (const x of r.offTime) out.push(`- ${x.at} ${x.pitch}: ${sgn(mean(x.offs), " ms")} ± ${f0(sd(x.offs))} over ${x.offs.length} takes`);
      out.push("");
    }
    if (r.gone.length) {
      out.push("**Went away** (wrong or missed in two or more takes of the first half, in none of the last three):", "");
      for (const x of r.gone) out.push(`- ${x.at} ${x.pitch}: ${x.detail} (takes ${takesList([...x.wrongIn, ...x.missIn].sort((p, q) => p - q))})`);
      out.push("");
    }
    if (r.appeared.length) {
      out.push("**Appeared late** (none in the first three takes):", "");
      for (const x of r.appeared) out.push(`- ${x.at} ${x.pitch}: ${x.detail} (takes ${takesList([...x.wrongIn, ...x.missIn].sort((p, q) => p - q))})`);
      out.push("");
    }
  });
  return out.join("\n");
}
