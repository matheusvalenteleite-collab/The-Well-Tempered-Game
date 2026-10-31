/**
 * D391 (WTC 1.89), A WHOLE-PIECE READING DRAWN IN THE BOX. The owner: "confirm whether you are implementing
 * the Busoni reading in such a way that, when chosen, the music box will be allowed to include a
 * representation of all the Busoni marks which are relevant to gameplay." Until now the box drew a
 * reading's marks on the subject's entries only (readings.ts readingMarks: the subject's template); a
 * whole-piece reading (BUSONI, D385) prints every voice and bar. This module turns its plan
 * (whole-reading.ts wholePlan) into what the box draws over the player's own line, the whole piece:
 *
 *   NOTE MARKS (BoxMark, by "voice:onset"): what the judge asks (join, short, accent: the same asks
 *     proto-game.ts judges through `wholeAsk`) and the signs it is drawn by: the dot (staccato), the
 *     wedge, the marcato ^ (D387: weight on time, and short), the tenuto dash, portato (dash and dot),
 *     the fermata, an arpeggio's wavy line.
 *   SPANS (WholeLine.spans): slurs (one gesture, the lift at its end drawn: D388's missing mark), portato
 *     slurs (dotted), phrase arcs (lighter, higher: a guide, not judged).
 *   THE LINE'S GUIDES (WholeLine): the printed levels (italic letters at their onset, under the line),
 *     hairpins (thin wedges under it), character and tempo words (the original Italian or German, small,
 *     under the line; the translation in the side legend: WORD_GLOSS), caesuras (//).
 *
 * D374 kept: the blocks stay plain, the marks hang over and under them, thin and small, on the player's
 * line only. Built once per fugue, reading and voice (memoised); the painter walks it by index (D345).
 */
import type { TouchFugue } from "./fugue.ts";
import type { Reading } from "./readings.ts";
import { LEVEL_DB, wholePlan, type SlurPlace, type WholeNote, type WholePlan } from "./whole-reading.ts";
import type { Lang } from "../i18n/index.ts";

/** A note's mark as the box draws it (a superset of readings.ts MarkNote: the judge's asks first). */
export interface BoxMark {
  join: boolean | null;
  short: boolean | null;
  accent: boolean | null;
  slur?: SlurPlace;
  wedge?: boolean;
  marcato?: boolean;
  tenuto?: boolean;
  portato?: boolean;
  fermata?: boolean;
  arpeggio?: boolean;
}

/** A printed level drawn: its tokens (the level's letters in the italic face, its words in the pixel face). */
export interface LineDyn {
  on: number;
  /** The lowest step the voice plays about the onset (the letters stand under it). */
  step: number;
  text: string;
  parts: { italic: boolean; text: string }[];
  /** sf, sfz: the strong zone (the accent's orange); else the normal zone (the line plays the level). */
  strong: boolean;
}
export interface LineHairpin {
  from: number;
  to: number;
  dir: "cresc" | "dim";
  step: number;
}
export interface LineWord {
  on: number;
  step: number;
  /** As printed (Italian, German), drawn in the pixel face (upper case). */
  text: string;
  shown: string;
  gloss: Gloss;
  /** The word's picture, made once (the painter's cache; null where there is no document). */
  sprite?: unknown;
}
export interface LineSpan {
  from: number;
  to: number;
  /** The first and last notes' onsets in the voice, and the highest step over the span (the arc stands over it). */
  a: number;
  b: number;
  bEnd: number;
  top: number;
  kind: "slur" | "portato" | "phrase";
}
export interface LineBreath {
  on: number;
  /** The gap's place: the note before's end. */
  at: number;
  step: number;
}
export interface WholeLine {
  voice: number;
  dyn: LineDyn[];
  hairpins: LineHairpin[];
  words: LineWord[];
  spans: LineSpan[];
  breaths: LineBreath[];
}
export interface WholeBox {
  /** "voice:onset" → the note's mark, every note of the voices played that the reading marks. */
  marks: Map<string, BoxMark>;
  /** One line a voice played. */
  lines: WholeLine[];
}

/** D391: the translations the side legend gives (the words stay as printed in the box). */
export type Gloss = Record<Lang, string>;
const G = (en: string, pt: string, es: string): Gloss => ({ en, pt, es });
/**
 * Busoni's words in the five fugues (data/touch/readings.json `whole.text`, `whole.tempo`, the headings, the
 * level words): each to its translation. A text not here is a label (r. H., Tenor, the subject's letters,
 * (Coda)) and is not drawn: it asks nothing of the player.
 */
export const WORD_GLOSS: Readonly<Record<string, Gloss>> = {
  // The headings.
  "moderato, quasi andante.": G("MODERATE, ALMOST WALKING", "MODERADO, QUASE ANDANDO", "MODERADO, CASI ANDANDO"),
  "allegretto, vivacemente.": G("FAIRLY QUICK, LIVELY", "UM POUCO RÁPIDO, VIVO", "ALGO RÁPIDO, VIVO"),
  "andante pensieroso, non troppo accentato.": G("WALKING, THOUGHTFUL, NOT TOO ACCENTED", "ANDANDO, PENSATIVO, SEM ACENTUAR DEMAIS", "ANDANDO, PENSATIVO, SIN ACENTUAR DEMASIADO"),
  "andante con moto.": G("WALKING, WITH MOVEMENT", "ANDANDO, COM MOVIMENTO", "ANDANDO, CON MOVIMIENTO"),
  "(largo.) andante grave e solenne.": G("(BROAD) WALKING, GRAVE AND SOLEMN", "(LARGO) ANDANDO, GRAVE E SOLENE", "(LARGO) ANDANDO, GRAVE Y SOLEMNE"),
  // Character and manner.
  "ten.": G("HELD: ITS FULL VALUE", "SEGURADA: O VALOR INTEIRO", "SOSTENIDA: SU VALOR ENTERO"),
  "ten. molto": G("WELL HELD", "BEM SEGURADA", "MUY SOSTENIDA"),
  "poco espress.": G("A LITTLE EXPRESSIVE", "UM POUCO EXPRESSIVO", "UN POCO EXPRESIVO"),
  "espress.": G("EXPRESSIVE", "EXPRESSIVO", "EXPRESIVO"),
  "meno legato ma sempre molto tenuto": G("LESS JOINED, BUT ALWAYS WELL HELD", "MENOS LIGADO, MAS SEMPRE BEM SEGURADO", "MENOS LIGADO, PERO SIEMPRE MUY SOSTENIDO"),
  "marc.": G("MARKED: BROUGHT OUT", "MARCADO: EM DESTAQUE", "MARCADO: DESTACADO"),
  "poco marc.": G("A LITTLE MARKED", "UM POUCO MARCADO", "UN POCO MARCADO"),
  "poco marcato": G("A LITTLE MARKED", "UM POUCO MARCADO", "UN POCO MARCADO"),
  "più marcato": G("MORE MARKED", "MAIS MARCADO", "MÁS MARCADO"),
  "molto marc.": G("VERY MARKED", "MUITO MARCADO", "MUY MARCADO"),
  "calmando": G("CALMING", "ACALMANDO", "CALMANDO"),
  "dolce": G("SWEETLY", "DOCE", "DULCE"),
  "p dolce": G("SOFT AND SWEET", "SUAVE E DOCE", "SUAVE Y DULCE"),
  "sostenuto": G("SUSTAINED, HELD BACK", "SUSTENTADO, CONTIDO", "SOSTENIDO, CONTENIDO"),
  "quasi stacc.": G("ALMOST SHORT (STACCATO)", "QUASE CURTO (STACCATO)", "CASI CORTO (STACCATO)"),
  "meno legg.": G("LESS LIGHT", "MENOS LEVE", "MENOS LIGERO"),
  "non legg.": G("NOT LIGHT", "NÃO LEVE", "NO LIGERO"),
  "mezza voce": G("HALF VOICE", "MEIA VOZ", "MEDIA VOZ"),
  "legato": G("JOINED", "LIGADO", "LIGADO"),
  "più distintamente": G("MORE DISTINCTLY", "MAIS NÍTIDO", "MÁS NÍTIDO"),
  "delicato / zart": G("DELICATE / TENDER", "DELICADO / TERNO", "DELICADO / TIERNO"),
  "meno severo": G("LESS SEVERE", "MENOS SEVERO", "MENOS SEVERO"),
  "mit bedeutung / marcato": G("WITH MEANING / MARKED", "COM SIGNIFICADO / MARCADO", "CON SIGNIFICADO / MARCADO"),
  "marcato / mit bedeutung": G("MARKED / WITH MEANING", "MARCADO / COM SIGNIFICADO", "MARCADO / CON SIGNIFICADO"),
  "(freie stimme)": G("(A FREE VOICE)", "(VOZ LIVRE)", "(VOZ LIBRE)"),
  "nobilmente espressivo, un poco pesante": G("NOBLY EXPRESSIVE, A LITTLE HEAVY", "NOBRE E EXPRESSIVO, UM POUCO PESADO", "NOBLE Y EXPRESIVO, UN POCO PESADO"),
  "(weich)": G("(SOFT, GENTLE)", "(MACIO, SUAVE)", "(BLANDO, SUAVE)"),
  "semplice": G("SIMPLY", "SIMPLES", "SENCILLO"),
  "meno f di prima (dolce)": G("LESS LOUD THAN BEFORE (SWEETLY)", "MENOS FORTE QUE ANTES (DOCE)", "MENOS FUERTE QUE ANTES (DULCE)"),
  "egualmente": G("EVENLY", "POR IGUAL", "POR IGUAL"),
  "meno legato": G("LESS JOINED", "MENOS LIGADO", "MENOS LIGADO"),
  "poco": G("A LITTLE", "UM POUCO", "UN POCO"),
  "più": G("MORE", "MAIS", "MÁS"),
  // Growing and fading (the line plays them).
  "cresc.": G("GROWING LOUDER", "CRESCENDO", "CRECIENDO"),
  "poco cresc.": G("GROWING A LITTLE LOUDER", "CRESCENDO UM POUCO", "CRECIENDO UN POCO"),
  "più cresc.": G("GROWING STILL LOUDER", "CRESCENDO AINDA MAIS", "CRECIENDO AÚN MÁS"),
  "poco a poco cresc.": G("LOUDER LITTLE BY LITTLE", "CRESCENDO POUCO A POUCO", "CRECIENDO POCO A POCO"),
  "dim.": G("GROWING SOFTER", "DIMINUINDO", "DISMINUYENDO"),
  // The levels said in words.
  "p subito": G("SUDDENLY SOFT", "SUAVE DE REPENTE", "SUAVE DE GOLPE"),
  "meno f": G("LESS LOUD", "MENOS FORTE", "MENOS FUERTE"),
  "poco f": G("FAIRLY LOUD", "UM POUCO FORTE", "UN POCO FUERTE"),
  "quasi f": G("ALMOST LOUD", "QUASE FORTE", "CASI FUERTE"),
  "quasi forte": G("ALMOST LOUD", "QUASE FORTE", "CASI FUERTE"),
  "più f": G("LOUDER", "MAIS FORTE", "MÁS FUERTE"),
  // Time (only an ending's slowing and the fermatas move the clock: D390).
  "pochissimo riten.": G("HELD BACK, VERY SLIGHTLY", "SEGURANDO, MUITO POUCO", "RETENIENDO, MUY POCO"),
  "a tempo": G("BACK IN TIME", "DE VOLTA AO TEMPO", "DE VUELTA AL TIEMPO"),
  "poco slentando": G("SLOWING A LITTLE", "DIMINUINDO UM POUCO O ANDAMENTO", "FRENANDO UN POCO"),
  "largamente": G("BROADLY", "AMPLAMENTE", "AMPLIAMENTE"),
  "poco largamente": G("A LITTLE BROADLY", "UM POUCO AMPLO", "UN POCO AMPLIO"),
  "allargando": G("BROADENING", "ALARGANDO", "ENSANCHANDO"),
  "rall.": G("SLOWING DOWN", "DESACELERANDO", "FRENANDO"),
};
/** A printed word as the glossary keys it: lower case, the dashes of a span ("sostenuto - - -") off. */
export const wordKey = (text: string) => text.toLowerCase().replace(/(\s*-)+\s*$/, "").replace(/\s+/g, " ").trim();
export const glossOf = (text: string): Gloss | undefined => WORD_GLOSS[wordKey(text)];

/** A level's letters (pp … ff, sf, sfz) in the italic face; the words beside them (subito, meno, quasi) in the pixel face. */
export function dynParts(mark: string): { italic: boolean; text: string }[] {
  return mark
    .replace(/[()]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (/^[pmfsz]+$/.test(t) ? { italic: true, text: t } : { italic: false, text: t.toUpperCase() }));
}

/**
 * D391, the judge's asks of a note of a whole-piece reading (proto-game.ts: on the player's notes outside
 * the subject's entries; the subject's own asks stay the reading's template, readings.ts): `join` into
 * the next note (true: inside a slur, or a legato rule; false: detached: a portato, a slur's lift at its
 * end, a slur its edition lets go short, a caesura; null: not asked: a phrase arc is a guide), `short`
 * (staccato, wedge, marcato: let go before three fifths), `accent` (">", "^", sfz: the strong zone, on
 * time, D387).
 */
export function wholeAsk(g: WholeNote | undefined): { join: boolean | null; short: boolean | null; accent: boolean | null } {
  if (!g) return { join: null, short: null, accent: null };
  const short = g.arts.has("staccato") || g.arts.has("wedge") || g.arts.has("marcato");
  const accent = g.arts.has("accent") || g.arts.has("marcato");
  let join: boolean | null = null;
  if (!short) {
    if (g.caesura) join = false;
    else if (g.slur === "first" || g.slur === "mid") join = true;
    else if (g.slur === "last") join = g.join === true ? true : false;
    else if (g.arts.has("portato") || g.join === false) join = false;
    else if (!g.phrase && g.join === true) join = true;
  }
  return { join, short: short || null, accent: accent || null };
}

const asksMemo = new WeakMap<WholePlan, Map<string, BoxMark>>();
/** D391: every marked note of the plan (every voice) as the box draws it and the judge asks it, made once a plan. */
export function wholeAsks(plan: WholePlan): Map<string, BoxMark> {
  let m = asksMemo.get(plan);
  if (m) return m;
  m = new Map();
  for (const [k, g] of plan.notes) {
    const a = wholeAsk(g);
    const mk: BoxMark = { ...a };
    if (g.slur) mk.slur = g.slur;
    if (g.arts.has("wedge")) mk.wedge = true;
    if (g.arts.has("marcato")) mk.marcato = true;
    if (g.arts.has("tenuto")) mk.tenuto = true;
    if (g.arts.has("portato")) mk.portato = true;
    if (g.arts.has("fermata")) mk.fermata = true;
    if (g.spread) mk.arpeggio = true;
    const any = a.join !== null || a.short || a.accent || mk.slur || mk.tenuto || mk.portato || mk.fermata || mk.arpeggio;
    if (any) m.set(k, mk);
  }
  asksMemo.set(plan, m);
  return m;
}

const boxMemo = new WeakMap<object, Map<string, WholeBox>>();
/**
 * D391: what the box draws of reading r over the voices played, the whole piece (null: not a whole-piece
 * reading: the box draws the subject's marks as before).
 */
export function wholeBox(f: TouchFugue, r: Reading | null | undefined, voices: readonly number[]): WholeBox | null {
  const plan = wholePlan(f, r);
  const W = r?.whole;
  if (!plan || !W) return null;
  let m = boxMemo.get(plan);
  if (!m) boxMemo.set(plan, (m = new Map()));
  const id = voices.join(",");
  let box = m.get(id);
  if (box) return box;
  const all = wholeAsks(plan);
  const marks = new Map<string, BoxMark>();
  for (const v of voices) for (const [on] of f.voices[v] ?? []) {
    const mk = all.get(`${v}:${on}`);
    if (mk) marks.set(`${v}:${on}`, mk);
  }
  box = { marks, lines: voices.map((v) => lineOf(f, W, v)) };
  m.set(id, box);
  return box;
}

function lineOf(f: TouchFugue, W: NonNullable<Reading["whole"]>, v: number): WholeLine {
  const ns = f.voices[v] ?? [];
  const beat = f.tpq;
  const mine = (voices: number[] | undefined) => !voices || voices.includes(v);
  /** The lowest step the voice plays from a tick over a beat (else the nearest note's). */
  const lowAt = (t: number, t1 = t + beat) => {
    let lo = Infinity;
    for (const n of ns) if (n[0] + n[1] > t && n[0] < t1) lo = Math.min(lo, n[3]);
    if (lo < Infinity) return lo;
    let best = ns[0];
    for (const n of ns) if (Math.abs(n[0] - t) < Math.abs((best?.[0] ?? 0) - t)) best = n;
    return best ? best[3] : 0;
  };
  const dyn: LineDyn[] = [];
  const words: LineWord[] = [];
  const word = (on: number, text: string) => {
    const gloss = glossOf(text);
    if (!gloss || words.some((w) => w.on === on && wordKey(w.text) === wordKey(text))) return;
    const shown = text.replace(/(\s*-)+\s*$/, "").trim();
    words.push({ on, step: lowAt(on), text, shown: shown.toUpperCase(), gloss });
  };
  for (const d of W.dyn) {
    if (!d.voices.includes(v)) continue;
    const mark = d.mark.trim();
    // A level or an accent (sf, sfz): letters; a ramp or a character said as a level (dim., dolce): a word.
    if (LEVEL_DB[mark] !== undefined && !/^(dolce|mezza voce)$/.test(mark)) {
      const parts = dynParts(mark);
      dyn.push({ on: d.on, step: lowAt(d.on), text: mark, parts, strong: false });
      // Its words translated too ("p subito", "meno f").
      if (parts.some((p) => !p.italic)) words.push({ on: d.on, step: lowAt(d.on), text: mark, shown: "", gloss: glossOf(mark) ?? G(mark, mark, mark) });
    } else if (/sf/.test(mark)) dyn.push({ on: d.on, step: lowAt(d.on), text: mark, parts: dynParts(mark), strong: true });
    else word(d.on, mark);
  }
  // The heading over the player's first note; the words in the score in this voice; the changes of pace (every voice).
  if (W.heading && ns.length) word(ns[0][0], W.heading);
  for (const t of W.text) if (mine(t.voices) && t.text !== W.heading) word(t.on, t.text);
  for (const t of W.tempo) word(t.on, t.text);
  const hairpins: LineHairpin[] = W.hairpins.filter((h) => h.voices.includes(v)).map((h) => ({ from: h.from, to: h.to, dir: h.dir, step: lowAt(h.from, h.to) }));
  const spans: LineSpan[] = [];
  for (const s of W.slurs) {
    if (s.v !== v) continue;
    const inside = ns.filter((n) => n[0] >= s.from && n[0] <= s.to);
    if (inside.length < 2) continue;
    const last = inside[inside.length - 1];
    spans.push({ from: s.from, to: s.to, a: inside[0][0], b: last[0], bEnd: last[0] + last[1], top: Math.max(...inside.map((n) => n[3])), kind: s.kind });
  }
  const breaths: LineBreath[] = [];
  for (const b of W.breaths) {
    if (b.v !== v) continue;
    const prev = ns.filter((n) => n[0] < b.on).pop();
    const at = ns.find((n) => n[0] >= b.on);
    breaths.push({ on: b.on, at: prev ? Math.min(b.on, prev[0] + prev[1]) : b.on, step: Math.max(prev?.[3] ?? -Infinity, at?.[3] ?? -Infinity) });
  }
  const byOn = (a: { on: number }, b: { on: number }) => a.on - b.on;
  dyn.sort(byOn);
  words.sort(byOn);
  breaths.sort(byOn);
  hairpins.sort((a, b) => a.from - b.from);
  spans.sort((a, b) => a.a - b.a);
  return { voice: v, dyn, hairpins, words, spans, breaths };
}

/** D391: the first index of a list in time order whose onset is at or after `tick` (no allocation: the painter's). */
export function firstOn(list: readonly { on: number }[], tick: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].on < tick) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * D391: what a whole reading's line has, for the legends (the start of a round's in the box, the side
 * bar's): the judged signs come from readings.ts marksHas; these are BUSONI's others.
 */
export type WholeKind = "wedge" | "marcato" | "tenuto" | "portato" | "lift" | "phrase" | "breath" | "fermata" | "dynamics" | "hairpin" | "words";
export function wholeHas(box: WholeBox): Record<WholeKind, boolean> {
  const ms = [...box.marks.values()];
  const ls = box.lines;
  return {
    wedge: ms.some((m) => m.wedge),
    marcato: ms.some((m) => m.marcato),
    tenuto: ms.some((m) => m.tenuto),
    portato: ms.some((m) => m.portato),
    lift: ls.some((l) => l.spans.some((s) => s.kind !== "phrase")),
    phrase: ls.some((l) => l.spans.some((s) => s.kind === "phrase")),
    breath: ls.some((l) => l.breaths.length > 0),
    fermata: ms.some((m) => m.fermata),
    dynamics: ls.some((l) => l.dyn.length > 0),
    hairpin: ls.some((l) => l.hairpins.length > 0),
    words: ls.some((l) => l.words.some((w) => w.shown)),
  };
}
