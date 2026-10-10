/**
 * The companion (D133, the owner: the impression of "listening to this great music alongside
 * somebody else who is very knowledgeable but also a lover of this music"). For each moment of a
 * piece, a few sentences that say what is happening and why it matters, built from what the
 * analysis knows (where the subject has travelled, which voice carries it, what a stretto or a
 * pedal does), never claiming more than that; and an opening paragraph for the piece, from the
 * same facts, with the hand-written note on its character where there is one (notes.ts).
 */
import type { Entry } from "./entries.ts";
import type { Moment } from "./study.ts";
import { degreeOf } from "./study.ts";

export interface CompanionContext {
  minor: boolean;
  keyName: string;
  /** Voice names, highest first. */
  names: string[];
  count: number;
  entries: Entry[];
  /** The transposition of the subject's first statement (entries' shifts are measured from it). */
  firstShift: number;
  /** The voice each entry is in. */
  entryVoice: (e: Entry) => number;
  /** Notes in the subject. */
  subjectNotes: number;
  bars: number;
  barQ: number;
  /** Quarters → Bach's bar number. */
  barNo: (q: number) => number;
  /** The tonic's pitch class (for pedals). */
  tonicPc: number;
  /** Is the last chord major in a minor key (a Picardy third)? */
  picardy: boolean;
  prelude: boolean;
  /** Where the exposition ends (quarters), 0 if none. */
  expoEnd: number;
}

/** What a degree of transposition means as a key region. */
export function region(shift: number, minor: boolean): string {
  const d = ((shift % 12) + 12) % 12;
  const major: Record<number, string> = { 0: "the home key", 7: "the dominant", 5: "the subdominant", 9: "the relative minor", 2: "the supertonic", 4: "the mediant" };
  const min: Record<number, string> = { 0: "the home key", 7: "the dominant", 5: "the subdominant", 3: "the relative major", 8: "the submediant", 10: "the subtonic, the relative major's dominant" };
  return (minor ? min : major)[d] ?? `the degree ${degreeOf(d, minor)}`;
}

const ordinal = (n: number) => ["first", "second", "third", "fourth", "fifth", "sixth"][n] ?? `${n + 1}th`;
const pick = <T,>(xs: T[], k: number) => xs[((k % xs.length) + xs.length) % xs.length];

/** The companion's words on one moment. */
export function commentOn(m: Moment, c: CompanionContext, all: Moment[]): string {
  const v = (i: number) => c.names[i] ?? `voice ${i + 1}`;
  const where = (q: number) => q / Math.max(1, c.bars * c.barQ);
  switch (m.kind) {
    case "entry": {
      const k = Number(m.detail.index);
      const e = c.entries[k];
      const shift = e.shift - c.firstShift;
      const reg = region(shift, c.minor);
      const voice = v(c.entryVoice(e));
      const before = c.entries.slice(0, k);
      const newRegion = !before.some((x) => (((x.shift - c.firstShift - shift) % 12) + 12) % 12 === 0);
      const inStretto = all.some((s) => s.kind === "stretto" && s.from <= e.at + 1e-6 && e.at < s.to - 1e-6);
      const isLast = k === c.entries.length - 1;
      const bass = c.entryVoice(e) === c.count - 1 && c.count > 2;
      const parts: string[] = [];
      if (k === 0) {
        parts.push(`Alone, the ${voice} states the subject: ${c.subjectNotes} notes from which the whole ${c.prelude ? "piece" : "fugue"} will grow. It is worth humming it once; you will hear it ${c.entries.length - 1} more time${c.entries.length === 2 ? "" : "s"}.`);
      } else if (k < c.count && !e.inverted) {
        if (((shift % 12) + 12) % 12 === 7 && k === 1) parts.push(`The ${voice} answers, a fifth higher, while the first voice carries on against it: from now on the subject is never alone.`);
        else if (k === c.count - 1) parts.push(`With the ${voice}, every voice has now sung the subject: the exposition is complete, ${c.count} lines woven from one idea.`);
        else parts.push(`The ${ordinal(k)} voice, the ${voice}, enters with the subject in ${reg}; the texture thickens to ${k + 1} voices.`);
      } else if (e.inverted) {
        parts.push(pick([`Upside down: the ${voice} sings the subject in inversion, every rising step now falling, the same line seen in a mirror.`, `The subject in mirror image, in the ${voice}: where it climbed, it now descends. Bach is showing what else the idea can do.`], k));
      } else if (isLast) {
        parts.push(((shift % 12) + 12) % 12 === 0 ? `The last entry of the subject, in the ${voice}, home in the tonic: from here on the fugue only has to close.` : `The last entry, in the ${voice}, in ${reg}; what follows leads home.`);
      } else if (newRegion) {
        parts.push(pick([`For the first time the subject sounds in ${reg}: the fugue has travelled away from home, and the ${voice} is the one who takes it there.`, `A new key for the subject: ${reg}, in the ${voice}. Listen to how the same line changes colour in another key.`], k));
      } else {
        parts.push(pick([`The subject again, now in the ${voice}, in ${reg}.`, `The ${voice} takes up the subject, in ${reg}.`, `Once more the subject, in the ${voice} (${reg}).`], k));
      }
      if (bass && k > 0) parts.push("In the bass the subject carries the harmony: the upper voices have to fit themselves around it.");
      if (inStretto && k > 0 && !isLast) parts.push("And before it has finished, another voice is already entering.");
      return parts.join(" ");
    }
    case "stretto": {
      const [a, b] = m.voices.map(v);
      const beats = Number(m.detail.distance);
      const late = where(m.from) > 0.6;
      return `Stretto: the ${b} enters only ${beats} beat${beats === 1 ? "" : "s"} after the ${a}, before the subject has ended, so the subject overlaps itself. ${late ? "Bach keeps such tightening for late in the fugue, where it raises the tension towards the close." : "This is how a fugue tightens its grip: the same idea crowding in on itself."}`;
    }
    case "episode": {
      const bars = Number(m.detail.bars);
      const prev = [...c.entries].reverse().find((e) => e.end <= m.from + 1e-6);
      const next = c.entries.find((e) => e.at >= m.to - 1e-6);
      const from = prev ? region(prev.shift - c.firstShift, c.minor) : null;
      const to = next ? region(next.shift - c.firstShift, c.minor) : null;
      const n = `${bars} bar${bars === 1 ? "" : "s"}`;
      if (m.to <= c.expoEnd + 1e-6) return pick([`A link between entries (a codetta): ${n} of free counterpoint that takes the music where the next voice can enter.`, `Between two entries, ${n} of link: the voices keep moving while the next entry is prepared.`], Math.round(m.from));
      if (m.detail.last) return `The last episode: ${n} without the full subject, a breath before the final entries and the close.`;
      const move = from && to && from !== to ? `, the harmony moving from ${from} towards ${to}` : "";
      const k = c.entries.filter((e) => e.at < m.from).length;
      return pick([
        `An episode: ${n} without the full subject. Listen for fragments of it passed from voice to voice, often in sequence${move}.`,
        `The subject rests for ${n}. Episodes like this are where a fugue breathes and travels${move}.`,
        `${n.charAt(0).toUpperCase()}${n.slice(1)} of episode: small motifs, usually taken from the subject or its counterpoint, repeated step by step${move}.`,
        `A passage between entries${move}: ${n} in which you can hear the subject's pieces, but never the whole.`,
      ], k);
    }
    case "transformed": {
      const aug = m.detail.scale === 2;
      const inv = m.detail.inverted ? ", and upside down as well" : "";
      const firstOne = !all.some((x) => x.kind === "transformed" && x.detail.scale === m.detail.scale && x.from < m.from - 1e-6);
      if (aug) return firstOne ? `The subject in augmentation, in the ${v(m.voices[0])}: every note held twice as long${inv}. Against the other voices moving at their usual pace, it sounds like a cantus firmus, the subject slowed to a solemn line you can follow note by note.` : `The augmentation again, now in the ${v(m.voices[0])}${inv}: the subject at half speed, standing out against the faster parts.`;
      return firstOne ? `The subject in diminution, in the ${v(m.voices[0])}: every value halved${inv}. It passes twice as fast, and so can be crowded into the texture more often; listen for the familiar shape hurrying by.` : `The subject in diminution again, in the ${v(m.voices[0])}${inv}.`;
    }
    case "later": {
      const ord = ordinal(Number(m.detail.n) - 1);
      if (m.detail.first) return `A new subject enters, in the ${v(m.voices[0])}: the ${ord} subject of this fugue, with a shape of its own. Learn it now, as you learned the first; from here on the fugue has more than one idea to work with.`;
      const against = c.entries.some((e) => e.at < m.to - 1e-6 && m.from < e.end - 1e-6);
      return against ? `The ${ord} subject in the ${v(m.voices[0])}, sounding against an entry of the first: two subjects at once, each still recognisable.` : `The ${ord} subject again, now in the ${v(m.voices[0])}.`;
    }
    case "pedal": {
      const pc = (Number(String(m.detail.pc ?? -1)) + 12) % 12;
      const rel = (((pc - c.tonicPc) % 12) + 12) % 12;
      const bars = String(m.detail.bars);
      if (m.detail.place === "upper" || m.detail.place === "inner")
        return `A pedal held not in the bass but in the ${v(m.voices[0])}: the ${rel === 0 ? "tonic" : "dominant"} sustained for ${bars} bars while the other parts move ${m.detail.place === "upper" ? "beneath" : "around"} it.`;
      const late = where(m.from) > 0.75;
      if (rel === 0) return `A tonic pedal: the bass holds the home note for ${bars} bars while the voices above it move freely. ${late ? "It is Bach's way of saying that we have arrived." : "The ground stays still; everything above it moves."}`;
      if (rel === 7) return `A dominant pedal: the bass sits on the fifth degree for ${bars} bars, holding back the resolution. Everything above it leans towards a tonic that has not come yet.`;
      return `The bass holds ${String(m.detail.pitch).replace(/-?\d+$/, "")} for ${bars} bars: a pedal, the harmony above it straining against the held note.`;
    }
    case "highest": {
      const inEntry = c.entries.some((e) => e.at <= m.from + c.barQ && m.to - c.barQ / 2 <= e.end);
      return `The highest note of the piece, ${m.detail.pitch}, in the ${v(m.voices[0])}${where(m.from) > 0.6 ? ", late in the piece" : ""}. ${inEntry && !c.prelude ? "It falls inside an entry of the subject: the summit and the subject meet." : "A peak of register; listen to how the line falls away after it."}`;
    }
    case "lowest":
      return `The lowest note, ${m.detail.pitch}, in the ${v(m.voices[0])}: the floor of the piece${where(m.from) > 0.75 ? ", reached near the end, where the music settles" : ""}.`;
    case "cadence":
      return `The close.${all.some((x) => x.kind === "pedal" && x.detail.place !== "upper" && x.detail.place !== "inner" && x.to >= m.to - c.barQ) ? " Over the held bass" : ""} the voices gather into the final cadence${c.picardy ? ", and if you listen to the third of the last chord, Bach turns minor into major: the Picardy third, a common Baroque way of ending in light" : ""}.`;
    case "arrival":
      return `A cadence in ${String(m.detail.keyLabel ?? "a new key")}: the music settles there, for a moment, before moving on.`;
    case "figure":
      return `The figuration changes here: after holding one pattern, Bach turns to another, often the sign of a new stage in the piece.`;
  }
  return "";
}

/** The companion's opening words on a piece. */
export function overview(c: CompanionContext, moments: Moment[]): string {
  if (c.prelude) {
    const pedals = moments.filter((m) => m.kind === "pedal").length;
    return `A prelude in ${c.keyName}, ${c.bars} bars. ${pedals ? `Watch for the bass holding a note (${pedals} pedal point${pedals === 1 ? "" : "s"}): in a prelude those are often the pillars the piece is built on.` : ""}`.trim();
  }
  const seen: string[] = [];
  for (const e of c.entries.filter((x) => !x.inverted)) {
    const r = region(e.shift - c.firstShift, c.minor);
    if (!seen.includes(r) && r !== "the home key" && r !== "the dominant") seen.push(r);
  }
  const list = seen.length > 1 ? `${seen.slice(0, -1).join(", ")} and ${seen[seen.length - 1]}` : seen[0];
  const plan = seen.length ? ` Beyond the home key and the dominant, its entries visit ${list}.` : " Its entries stay in the home key and the dominant: a fugue that never travels far.";
  const inv = c.entries.filter((e) => e.inverted).length;
  const str = moments.filter((m) => m.kind === "stretto").length;
  const extra = [inv ? `${inv} entr${inv === 1 ? "y is" : "ies are"} upside down` : "", str ? `in ${str} place${str === 1 ? "" : "s"} entries overlap in stretto` : ""].filter(Boolean).join("; ");
  const aug = moments.filter((m) => m.kind === "transformed" && m.detail.scale === 2).length;
  const dim = moments.filter((m) => m.kind === "transformed" && m.detail.scale !== 2).length;
  const scaled = [aug ? `${aug} time${aug === 1 ? "" : "s"} in augmentation (its values doubled)` : "", dim ? `${dim} time${dim === 1 ? "" : "s"} in diminution (halved)` : ""].filter(Boolean).join(" and ");
  const more = moments.filter((m) => m.kind === "later" && m.detail.first).length;
  const subjects = more ? ` Later ${more === 1 ? "a second subject enters" : `${more === 2 ? "a second and a third subject enter" : `${more} more subjects enter`}`}, and the fugue works with them too.` : "";
  return `A fugue in ${c.count} voices in ${c.keyName}, ${c.bars} bars, on a subject of ${c.subjectNotes} notes heard ${c.entries.length} times${extra ? `; ${extra}` : ""}.${scaled ? ` The subject also comes ${scaled}.` : ""}${plan}${subjects}`;
}

/** The moment to show while the piece plays at quarter `q`: the most telling one sounding. */
export function momentAt(moments: Moment[], q: number): Moment | null {
  const rank: Record<string, number> = { stretto: 0, entry: 1, later: 1, transformed: 1, pedal: 2, cadence: 3, highest: 4, lowest: 5, arrival: 6, episode: 7, figure: 8 };
  const here = moments.filter((m) => m.from <= q + 1e-6 && q < m.to - 1e-6);
  return here.sort((a, b) => rank[a.kind] - rank[b.kind] || b.from - a.from)[0] ?? null;
}
