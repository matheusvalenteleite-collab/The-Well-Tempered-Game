/**
 * What the composer proposes at each step, from the generator (generate.ts): countersubjects
 * against the answer (invertible), codettas, and the free passages of the plan (the voice set
 * against what the other voice already has there).
 */
import { parsePitch } from "../../music/pitch.ts";
import type { WtcNote } from "../fugues.ts";
import { answerNotes } from "./answer.ts";
import { propose, type Proposal } from "./generate.ts";
import { dominantOf, EPS, lengthOf, toNotes, type FugueDraft } from "./model.ts";
import type { Part, Realised } from "./plan.ts";

const midis = (ns: WtcNote[]) => ns.map((n) => parsePitch(n.pitch).midi);
const mean = (ns: WtcNote[]) => midis(ns).reduce((a, b) => a + b, 0) / Math.max(1, ns.length);

/** Countersubjects against the answer, timed from its entry: in the answer's key, able to stand inverted. */
export function proposeCountersubject(d: FugueDraft, seed = 1, count = 3): Proposal[] {
  if (!d.answer) return [];
  const answer = answerNotes(d).map((n) => ({ ...n, at: n.at - d.answer!.at }));
  const subject = toNotes(d.subject);
  if (!answer.length || !subject.length) return [];
  const above = mean(subject) >= mean(answer);
  const reg = midis(subject);
  const codetta = toNotes(d.free[`expo:${d.first}:0`] ?? []);
  const before = (codetta.length ? codetta : subject)[(codetta.length ? codetta : subject).length - 1].pitch;
  const dominant = dominantOf(d.key);
  // The answer's head, if mutated, lies in the tonic; the rest in the dominant.
  const headEnd = answer.length > 1 ? answer[Math.min(answer.length - 1, 2)].at : 0;
  return propose({
    keyAt: (t) => (t < headEnd - EPS ? d.key : dominant),
    time: d.time,
    phase: d.phase,
    from: 0,
    to: lengthOf(d.subject),
    given: answer,
    above,
    before,
    low: Math.min(...reg) - (above ? 2 : 7),
    high: Math.max(...reg) + (above ? 7 : 2),
    invertible: true,
    seed,
    count,
    draft: d,
  });
}

/** A free passage of the plan: the voice against what the other voice has there, led into what follows. */
export function proposeFree(d: FugueDraft, r: Realised, part: Part, seed = 1, count = 3): Proposal[] {
  const other = r.voices[1 - part.voice].filter((n) => n.at < part.to - EPS && n.at + n.dur > part.from + EPS);
  const mine = r.voices[part.voice];
  const before = mine.filter((n) => n.at < part.from - EPS).pop();
  const after = mine.find((n) => n.at >= part.to - EPS);
  const sec = r.sections.find((s) => s.id === part.section)!;
  const prevSec = r.sections[r.sections.indexOf(sec) - 1];
  // An episode moves from the key before it to its own over its last bar.
  const from = sec.kind === "episode" && prevSec ? prevSec.key : sec.key;
  const turn = sec.to - (sec.to - sec.from) / 2;
  const reg = midis(mine.length ? mine : other);
  const centre = before ? parsePitch(before.pitch).midi : reg.reduce((a, b) => a + b, 0) / Math.max(1, reg.length);
  const otherMean = other.length ? mean(other) : centre + (part.voice === 0 ? -7 : 7);
  const above = part.voice === 0 ? true : centre > otherMean;
  return propose({
    keyAt: (t) => (t < turn ? from : sec.key),
    time: d.time,
    phase: 0,
    from: part.from,
    to: part.to,
    given: other,
    above,
    before: before?.pitch,
    after: after?.pitch,
    low: Math.round(centre) - 9,
    high: Math.round(centre) + 9,
    seed,
    count,
    draft: d,
  });
}

/** The codetta: the first voice alone, from the subject's end to the answer's entry, led into the countersubject. */
export function proposeCodetta(d: FugueDraft, seed = 1, count = 3): Proposal[] {
  if (!d.answer) return [];
  const subject = toNotes(d.subject);
  const len = lengthOf(d.subject);
  if (d.answer.at <= len + EPS || !subject.length) return [];
  const cs = toNotes(d.countersubject);
  const reg = midis(subject);
  return propose({
    keyAt: () => d.key,
    time: d.time,
    phase: d.phase,
    from: len,
    to: d.answer.at,
    given: [],
    above: d.first === 0,
    before: subject[subject.length - 1].pitch,
    after: cs[0]?.pitch,
    low: Math.min(...reg) - 2,
    high: Math.max(...reg) + 2,
    seed,
    count,
    draft: d,
  });
}
