/**
 * The whole fugue judged and read back. Each voice against the other by the two-voice tonal rules
 * (src/wtc/counterpoint.ts with Bach's licences), every note judged; a fault heard in both
 * directions is reported once. Then the analysis that reads Bach's 48 reads the player's fugue
 * (src/wtc/fugue.ts): the entries it finds should be those the plan put there, which is what a
 * listener will hear as the subject.
 */
import { findEntries, type Note } from "../fugue.ts";
import { judgePair } from "./invertible.ts";
import { dominantOf, lengthOf, toTicks, toNotes, EPS, type FugueDraft } from "./model.ts";
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
  return { faults, empty, overflow, heard, missed };
}
