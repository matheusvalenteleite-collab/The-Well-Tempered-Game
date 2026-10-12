/**
 * Episodes from a sequence (docs/wtc/COMPOSE.md, step S6): as Bach spins most of his, a fragment
 * of the subject or the countersubject in one voice, a companion line against it in the other, the
 * pair repeated a step (or a third) lower or higher each time in the key it leaves; then a free
 * tail, in the key it reaches, leading both voices into the next entry. The companion and the tail
 * come from the generator (generate.ts); the whole is verified by the player's judge.
 */
import { parsePitch } from "../../music/pitch.ts";
import type { WtcNote } from "../fugues.ts";
import { moveInScale, scaleOf } from "../workshop.ts";
import { asEvents, propose, rng } from "./generate.ts";
import { judgePair } from "./invertible.ts";
import { barQuarters, dominantOf, EPS, lengthOf, modeOf, toKey, toNotes, tonicOf, type Ev, type FugueDraft } from "./model.ts";
import type { Realised, Section } from "./plan.ts";

export type FragmentSource = "subjectHead" | "subjectTail" | "csHead";

export interface EpisodeChoice {
  source: FragmentSource;
  /** Scale steps from one repetition to the next (-1: a step down, the commonest; +1; -2: a third down). */
  step: number;
  /** The voice that carries the fragment. */
  lead: 0 | 1;
}

export interface EpisodeProposal {
  /** Events for the two voices' free passages of the episode (upper, lower). */
  voices: [Ev[], Ev[]];
  faults: number;
  repetitions: number;
}

const midi = (p: string) => parsePitch(p).midi;
const dia = (p: string) => parsePitch(p).diatonic;

/** The fragment's length: half a bar where the bar has two equal halves, else a bar. */
export function fragmentLength(time: string): number {
  const [n] = time.split("/").map(Number);
  const bar = barQuarters(time);
  return n % 2 === 0 ? bar / 2 : bar;
}

/** The fragment, timed from 0, in the key it is taken in. */
export function fragment(d: FugueDraft, source: FragmentSource): { notes: WtcNote[]; key: string } {
  const len = fragmentLength(d.time);
  const cut = (ns: WtcNote[], from: number) =>
    ns.filter((n) => n.at >= from - EPS && n.at < from + len - EPS).map((n) => ({ ...n, at: n.at - from, dur: Math.min(n.dur, from + len - n.at) }));
  if (source === "csHead") return { notes: cut(toNotes(d.countersubject), 0), key: dominantOf(d.key) };
  const subject = toNotes(d.subject);
  if (source === "subjectHead") return { notes: cut(subject, 0), key: d.key };
  const span = lengthOf(d.subject);
  return { notes: cut(subject, Math.max(0, span - len)), key: d.key };
}

const scaleFor = (key: string) => scaleOf(tonicOf(key), modeOf(key) === "major");
const moveLine = (ns: WtcNote[], steps: number, key: string) => ns.map((n) => ({ ...n, pitch: moveInScale(n.pitch, steps, scaleFor(key)) }));

export function proposeEpisode(d: FugueDraft, r: Realised, id: Section["id"], choice: EpisodeChoice, seed = 1, count = 3): EpisodeProposal[] {
  const sec = r.sections.find((s) => s.id === id);
  if (!sec || sec.kind !== "episode") return [];
  const prevSec = r.sections[r.sections.indexOf(sec) - 1];
  const fromKey = prevSec?.key ?? d.key;
  const frag = fragment(d, choice.source);
  if (frag.notes.length < 2) return [];
  const len = fragmentLength(d.time);
  const span = sec.to - sec.from;
  // As many repetitions as fit, the last fragment's room left to the tail.
  const reps = Math.max(1, Math.floor(span / len + EPS) - 1);
  const lead = choice.lead;
  const other = (1 - lead) as 0 | 1;
  const prevNote = (v: 0 | 1) => r.voices[v].filter((n) => n.at < sec.from - EPS).pop();
  const nextNote = (v: 0 | 1) => r.voices[v].find((n) => n.at >= sec.to - EPS);
  // The fragment carried into the key the episode leaves, placed near the lead voice's last note.
  let f = toKey(frag.notes, frag.key, fromKey);
  const prevLead = prevNote(lead);
  if (prevLead) {
    // A descending sequence starts a step above the note before, an ascending one a step below.
    f = moveLine(f, dia(prevLead.pitch) - dia(f[0].pitch) + (choice.step < 0 ? 1 : -1), fromKey);
  }
  const leadAbove = lead === 0;
  const out: EpisodeProposal[] = [];
  const rand = rng(seed);
  const tries = count * 3;
  for (let k = 0; k < tries && out.length < count * 2; k++) {
    const sd = Math.floor(rand() * 1e9);
    const leadFirst = f.map((n) => ({ ...n, at: n.at + sec.from }));
    const prevOther = prevNote(other);
    const centre = prevOther ? midi(prevOther.pitch) : midi(leadFirst[0].pitch) + (leadAbove ? -9 : 9);
    const companion = propose({
      keyAt: () => fromKey,
      time: d.time,
      phase: 0,
      from: sec.from,
      to: sec.from + len,
      given: leadFirst,
      above: !leadAbove,
      before: prevOther?.pitch,
      low: centre - 8,
      high: centre + 8,
      seed: sd,
      count: 1,
      draft: d,
    })[0];
    if (!companion) continue;
    const lines: [WtcNote[], WtcNote[]] = [[], []];
    for (let i = 0; i < reps; i++) {
      const t = i * len;
      lines[lead].push(...moveLine(leadFirst, i * choice.step, fromKey).map((n) => ({ ...n, at: n.at + t })));
      lines[other].push(...moveLine(companion.notes, i * choice.step, fromKey).map((n) => ({ ...n, at: n.at + t })));
    }
    // The tail: the other voice free into its next note, then the lead voice against it.
    const tailFrom = sec.from + reps * len;
    if (tailFrom < sec.to - EPS) {
      const nOther = nextNote(other);
      const lastOther = lines[other][lines[other].length - 1];
      const tailOther = propose({
        keyAt: () => sec.key,
        time: d.time,
        phase: 0,
        from: tailFrom,
        to: sec.to,
        given: [],
        above: !leadAbove,
        before: lastOther?.pitch,
        after: nOther?.pitch,
        low: midi(lastOther.pitch) - 8,
        high: midi(lastOther.pitch) + 8,
        seed: sd + 1,
        count: 1,
        draft: d,
      })[0];
      if (!tailOther) continue;
      lines[other].push(...tailOther.notes);
      const nLead = nextNote(lead);
      const lastLead = lines[lead][lines[lead].length - 1];
      const tailLead = propose({
        keyAt: () => sec.key,
        time: d.time,
        phase: 0,
        from: tailFrom,
        to: sec.to,
        given: tailOther.notes,
        above: leadAbove,
        before: lastLead.pitch,
        after: nLead?.pitch,
        low: midi(lastLead.pitch) - 8,
        high: midi(lastLead.pitch) + 8,
        seed: sd + 2,
        count: 1,
        draft: d,
      })[0];
      if (!tailLead) continue;
      lines[lead].push(...tailLead.notes);
    }
    const faults = judgePair(lines[0], lines[1], d, [], 0).filter((v) => v.severity === "error").length;
    out.push({ voices: [asEvents(lines[0], sec.from), asEvents(lines[1], sec.from)], faults, repetitions: reps });
  }
  out.sort((a, b) => a.faults - b.faults);
  const distinct: EpisodeProposal[] = [];
  for (const p of out) {
    if (distinct.every((q) => JSON.stringify(q.voices) !== JSON.stringify(p.voices))) distinct.push(p);
    if (distinct.length >= count) break;
  }
  return distinct;
}
