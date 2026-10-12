/**
 * The whole fugue judged and read back. Each voice against the other by the two-voice tonal rules
 * (src/wtc/counterpoint.ts with Bach's licences), every note judged; a fault heard in both
 * directions is reported once. Then the analysis that reads Bach's 48 reads the player's fugue
 * (src/wtc/fugue.ts): the entries it finds should be those the plan put there, which is what a
 * listener will hear as the subject.
 */
import { findEntries, type Note } from "../fugue.ts";
import { judgePair } from "./invertible.ts";
import { barQuarters, dominantOf, lengthOf, modeOf, place, toTicks, toNotes, EPS, type FugueDraft } from "./model.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { WtcNote } from "../fugues.ts";
import type { Remark } from "./subject.ts";
import { asPiece, type Part, type Realised } from "./plan.ts";
import { TPQ } from "../corpus.ts";
import type { CpViolation } from "../counterpoint.ts";
import { entryKey } from "../keyplan.ts";

export interface Fault extends CpViolation {
  voice: 0 | 1;
  /** The part the faulty note belongs to. */
  part: Part | null;
}

export interface Heard {
  voice: number;
  /** Onset in quarters. */
  at: number;
  key: string;
  form: "subject" | "inversion";
  /** Whether the plan put an entry there. */
  planned: boolean;
}

export interface Report {
  faults: Fault[];
  /** Free passages still empty, and passages written longer than their room. */
  empty: Part[];
  overflow: Part[];
  heard: Heard[];
  /** Planned entries the analysis does not hear. */
  missed: Part[];
  /** The close: how the fugue ends (empty until both voices have written their close). */
  close: Remark[];
}

/**
 * The close, by the clausulae of the two-voice cadence (Fux's, which Bach's two-voice fugue keeps,
 * I/10 b. 42): the last sonority on a strong beat, the lower voice on ^1 and the upper on ^1 or ^3;
 * the lower voice reaching ^1 from ^5 (a leap: the bass's clausula) or by step from ^2 or ^7, the
 * upper by step (^7 rising, ^2 falling, or to ^3 from ^2 or ^4); in minor the leading note raised.
 */
export function judgeClose(d: FugueDraft, r: Realised): Remark[] {
  const out: Remark[] = [];
  const close = r.sections.find((s) => s.id === "close")!;
  const lines = r.voices.map((v) => v.filter((n) => n.at >= close.from - EPS));
  if (lines.some((l) => l.length < 2)) return out;
  const bar = barQuarters(d.time);
  const lastOf = (l: WtcNote[]) => l[l.length - 1];
  const [a, b] = lines.map(lastOf);
  const mean = (n: WtcNote) => parsePitch(n.pitch).midi;
  const lower = mean(a) <= mean(b) ? 0 : 1;
  const lo = lines[lower];
  const hi = lines[1 - lower];
  const deg = (n: WtcNote) => place(n.pitch, d.key);
  const name = (n: WtcNote) => {
    const p = deg(n);
    return `${p.alter > 0 || p.raised ? "♯" : p.alter < 0 ? "♭" : ""}${p.deg + 1}`;
  };
  const end = Math.max(lastOf(lo).at, lastOf(hi).at);
  const err = (key: string, vars: Record<string, string | number> = {}) => out.push({ severity: "error", key, vars, examples: [] });
  const adv = (key: string, vars: Record<string, string | number> = {}) => out.push({ severity: "advice", key, vars, examples: [] });
  if (Math.abs(lastOf(lo).at - lastOf(hi).at) > EPS) adv("compose.close.together");
  if (Math.abs(((end % bar) + bar) % bar) > EPS) adv("compose.close.weak");
  const bl = deg(lastOf(lo));
  const ul = deg(lastOf(hi));
  if (bl.deg !== 0 || bl.alter !== 0) err("compose.close.bassNotTonic", { deg: name(lastOf(lo)) });
  if (!(ul.deg === 0 && ul.alter === 0) && ul.deg !== 2) err("compose.close.upperNotTonic", { deg: name(lastOf(hi)) });
  const bp = deg(lo[lo.length - 2]);
  if (bl.deg === 0 && ![4, 1, 6].includes(bp.deg)) adv("compose.close.bassApproach", { deg: name(lo[lo.length - 2]) });
  const up = hi[hi.length - 2];
  const upStep = Math.abs(parsePitch(up.pitch).diatonic - parsePitch(lastOf(hi).pitch).diatonic) === 1;
  if (!upStep) adv("compose.close.upperLeap", { deg: name(up) });
  if (modeOf(d.key) === "minor") {
    const lead = [lo[lo.length - 2], up].find((n) => deg(n).deg === 6);
    if (lead && !deg(lead).raised) err("compose.close.leadingNote", { pitch: lead.pitch });
  }
  if (!out.some((x) => x.severity !== "info")) out.push({ severity: "info", key: "compose.close.ok", vars: {}, examples: [] });
  return out;
}

export function judgeFugue(d: FugueDraft, r: Realised): Report {
  const faults: Fault[] = [];
  const seen = new Set<string>();
  for (const v of [0, 1] as const) {
    const line = r.voices[v];
    const given = r.voices[1 - v];
    for (const x of judgePair(line, given, d, [], 0)) {
      const id = `${x.ruleId}:${x.at.toFixed(4)}`;
      if (seen.has(id) && x.ruleId === "wtc.cp.parallel") continue;
      seen.add(id);
      const note = line[x.note];
      const part = r.parts.find((p) => p.voice === v && note && note.at >= p.from - EPS && note.at < p.to - EPS) ?? null;
      faults.push({ ...x, voice: v, part });
    }
  }
  faults.sort((a, b) => a.at - b.at);
  const empty = r.parts.filter((p) => p.kind === "free" && p.notes.length === 0 && !(d.free[p.slot] && lengthOf(d.free[p.slot]) > 0));
  const overflow = r.parts.filter((p) => p.overflow);

  // Read back: the subject's entries as the analysis of the 48 finds them.
  const piece = asPiece(d, r);
  const subject: Note[] = toTicks(toNotes(d.subject, d.phase));
  const planned = r.parts.filter((p) => p.kind === "subject" || p.kind === "answer");
  const heard: Heard[] = subject.length >= 3
    ? findEntries(piece, subject).map((e) => {
        const at = e.on / TPQ;
        const plan = planned.find((p) => p.voice === e.voice && Math.abs(p.from - at) < EPS);
        // A planned entry is in its section's key; another is read as the analysis of the 48 reads it.
        const key = plan ? r.sections.find((s) => s.id === plan.section)!.key : entryKey(piece, e, subject).name;
        return { voice: e.voice, at, key: plan?.kind === "answer" ? dominantOf(d.key) : key, form: e.form, planned: !!plan };
      })
    : [];
  const missed = planned.filter((p) => !heard.some((h) => h.voice === p.voice && Math.abs(h.at - p.from) < EPS));
  return { faults, empty, overflow, heard, missed, close: judgeClose(d, r) };
}
