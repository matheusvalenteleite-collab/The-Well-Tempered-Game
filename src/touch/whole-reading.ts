/**
 * D385 (WTC 1.88), A WHOLE-PIECE READING PLAYED: an edition's marks for every voice and bar (readings.ts
 * WholeReading: BUSONI for I/1, I/2, I/8, I/16, I/24) turned into what each note of the fugue is asked,
 * for the band (phrasing.ts) and the player's line (proto-game.ts). Built from the panel's report "The
 * Piano, Made Expressive" (31 Oct 2026) and the A/B/C listening test's version C (Glenn's reading); the
 * owner approved all five recommendations and removed D293 ("the subject is never louder": "let's follow
 * Busoni, eliminate my rule"). Pure: a fugue and a reading in, a plan out (memoised by fugue).
 *
 *   DYNAMICS: the printed levels per voice (LEVEL_DB: pp −11 … ff +6.5 dB about today's middle), terraced
 *     where printed (a p subito, a new level after a double bar); the ramp words (cresc., dim., poco a poco
 *     cresc.) and hairpins as ramps into the next printed level, else a local swell (HAIRPIN_DB). Entries
 *     are as loud as the edition prints them: nothing caps a subject (D293 gone).
 *   MARKS: accent ">" (+3 dB in the band, on time), marcato "^" (+4.5 dB and short: struck hard and left),
 *     wedge (shorter than a dot, +1.5), portato (held 0.82, +1), tenuto (its full value, not joined,
 *     +0.5), staccato (the engine's dot). A ">" or "^" asks the player's strong zone (touch-expr.ts).
 *   SLURS (a group, one gesture: slurShapeDb by its place in the bar), PORTATO slurs (each note a little
 *     apart, carried), PHRASES (a long arc: legato, a ±PHRASE_DB arch, a breath at its end): three
 *     dimensions besides legato (a manner of joining, even).
 *   RULES for unmarked notes (I/2's "eighths always staccato", I/1's "meno legato ma sempre molto
 *     tenuto", I/8's legato, the subject's template on entries left bare), CAESURAS (the note before let
 *     go 100 ms early: a silence, no delay).
 *   PALETTES per character word (the heading and the words in the score: PALETTES): voicing, weight in
 *     the bar, articulation defaults, a sparing half pedal (the dampers slower), tone colour, room. No
 *     tempo, no timing leans.
 *   TIME: only at a fermata where every voice holds (held 1.8 × its value) and at an ending the edition
 *     slows (endingOf: rall., allargando, sostenuto in the last bars), shaped as the automatic final
 *     ritard (phrasing.ts ritard) and scaled to the word; mid-piece tempo words are recorded, not played.
 *     Octave doublings and added notes stay off.
 */
import type { TouchFugue } from "./fugue.ts";
import type { Reading, WholeReading } from "./readings.ts";

export type WholeArt = "staccato" | "wedge" | "tenuto" | "portato" | "accent" | "marcato" | "fermata";
export type SlurPlace = "first" | "mid" | "last";

/** The printed levels (dB about today's middle, mf 0): the report's table (§1), the hybrid words between. */
export const LEVEL_DB: Readonly<Record<string, number>> = {
  pp: -11,
  p: -6.5,
  "p subito": -6.5,
  "p dolce": -6.5,
  dolce: -5,
  "mezza voce": -3,
  mp: -3,
  mf: 0,
  "poco f": 1.5,
  "meno f": 1.5,
  "quasi f": 2,
  "quasi forte": 2,
  f: 3.5,
  "più f": 5,
  ff: 6.5,
};
/** A hairpin with no printed level after it: a local swell or fall of this much (dB). */
export const HAIRPIN_DB = 3;
/** A ramp word (cresc., dim.) with no printed level within six bars: this much over its span (dB). */
export const RAMP_DB = 3;
/** The band's marks (dB, on time): the report's §2 (the band +3 dB for ">"), Glenn's version C for the rest. */
export const BAND_MARK_DB: Readonly<Record<"accent" | "marcato" | "wedge" | "portato" | "tenuto", number>> = { accent: 3, marcato: 4.5, wedge: 1.5, portato: 1, tenuto: 0.5 };
/** The player's accent in the strong zone (dB): ">" +4, "^" +6 (touch-expr.ts PIANO_ZONE_DB's strong +3 otherwise). */
export const PLAYER_ACCENT_DB: Readonly<Record<"accent" | "marcato", number>> = { accent: 4, marcato: 6 };
/** The holds (shares of the written length): a wedge shorter than a dot, portato a little apart, tenuto full. */
export const WHOLE_HOLD = { wedge: 0.3, portato: 0.82, tenuto: 0.97 } as const;
/** A caesura: the note before let go this long before the next (s). */
export const CAESURA_S = 0.1;
/** A phrase's arch (dB: from −PHRASE_DB/2 at its ends to +PHRASE_DB at its middle) and the hold of its last note (a breath). */
export const PHRASE_DB = 2.5;
export const PHRASE_BREATH_HOLD = 0.8;
/** A fermata where every voice holds: its value held this much longer (×1.8 in all). */
export const FERMATA_HOLD = 0.8;

/**
 * D385 (report §3), A SLUR SHAPED BY ITS PLACE IN THE BAR (dB, the piano): its first note leaned (more on a
 * beat), its inner notes lighter, its last −1.5 landing on a beat, −3.75 off it (the sigh); 3–4 dB between
 * the strongest and the weakest. `onBeat`: the note falls on a beat of the metre.
 */
export function slurShapeDb(place: SlurPlace, onBeat: boolean): number {
  if (place === "first") return onBeat ? 1.5 : 0.5;
  if (place === "mid") return -2.5;
  return onBeat ? -1.5 : -3.75;
}

/**
 * D385 (report §7), A PALETTE PER CHARACTER WORD: what a pianist changes besides loudness. `bassDb` the
 * lowest voice (it carries a dance, a grave tread), `weight` dB on the bar's first beat, its other beats,
 * and the notes between, `holdMul` the hold of a note not joined, `overS` added to a joined note's
 * overlap (s), `dampMul` the dampers' time (a sparing half pedal: at most 1.8), `toneDb` the colour
 * (Play.vel: a recording struck softer is darker; not a level), `roomMul` the room's send, `entryDb` an
 * entry brought out (marcato, mit Bedeutung), `othersDb` the rest stepping back.
 */
export interface Palette {
  name: PaletteName;
  bassDb: number;
  weight: readonly [number, number, number];
  holdMul: number;
  overS: number;
  dampMul: number;
  toneDb: number;
  roomMul: number;
  entryDb: number;
  othersDb: number;
}
export type PaletteName = "plain" | "light" | "heavy" | "grave" | "dolce" | "espressivo" | "even" | "marcato";
const P = (name: PaletteName, o: Partial<Omit<Palette, "name">>): Palette => ({ name, bassDb: 0, weight: [0, 0, 0], holdMul: 1, overS: 0, dampMul: 1, toneDb: 0, roomMul: 1, entryDb: 0, othersDb: 0, ...o });
export const PALETTES: Readonly<Record<PaletteName, Palette>> = {
  plain: P("plain", {}),
  // leggiero, vivacemente, scherzoso, quasi stacc.: shorter, lighter, beat-led, drier, the bass kept up.
  light: P("light", { bassDb: 1.5, weight: [1, 0.5, -1], holdMul: 0.8, dampMul: 0.8, toneDb: -2, roomMul: 0.7 }),
  // non leggiero, pesante, deciso, con fermezza: fuller, longer, weight on every beat.
  heavy: P("heavy", { weight: [1.5, 1, 0], holdMul: 1.15, overS: 0.02, dampMul: 1.3, toneDb: 3, roomMul: 1.1 }),
  // grave e solenne, severo, sostenuto, molto tenuto: a tread on the beats, a half-damped ring.
  grave: P("grave", { bassDb: 1, weight: [1.5, 1.5, -0.5], overS: 0.04, dampMul: 1.8, toneDb: 1, roomMul: 1.35 }),
  // dolce, delicato, zart, weich, mezza voce: light beats, veiled, a little ring.
  dolce: P("dolce", { weight: [0.5, 0.3, -0.5], dampMul: 1.6, toneDb: -4.5, roomMul: 1.25 }),
  // espressivo, nobilmente: shaped by the phrase (the arcs), a little ring.
  espressivo: P("espressivo", { dampMul: 1.5, roomMul: 1.15 }),
  // semplice, egualmente, ben misurato: even, as written.
  even: P("even", {}),
  // marcato, mit Bedeutung, più distintamente: the entry brought out, the others back, a little detached.
  marcato: P("marcato", { holdMul: 0.92, toneDb: 1.5, entryDb: 1.5, othersDb: -1 }),
};
/** The word's palette (null: not a character word: a level, a ramp, a label). The order matters: "non legg." before "legg.". */
export function paletteOfWord(text: string): PaletteName | null {
  const t = text.toLowerCase();
  if (/espress|nobilmente/.test(t)) return "espressivo";
  if (/non legg|pesante|deciso|fermezza|eroico/.test(t)) return "heavy";
  if (/meno legg|meno severo|semplice|egualmente|misurato|meno legato/.test(t)) return "even";
  if (/legg|vivace|scherz|quasi stacc|piacevole/.test(t)) return "light";
  if (/grave|solenne|severo|sostenuto|molto tenuto|gravit/.test(t)) return "grave";
  if (/dolce|delicat|zart|weich|mezza voce|sotto voce|calmando|tranquillo/.test(t)) return "dolce";
  if (/marc|bedeutung|distintamente/.test(t)) return "marcato";
  if (/pensieroso/.test(t)) return "dolce";
  return null;
}

/** The slowing words of an ending, the share of the tempo they reach at the end (RIT_END 0.78 for rall.). */
const ENDING_WORDS: readonly [RegExp, number][] = [
  [/rall|rit/, 0.78],
  [/allargando/, 0.82],
  [/largamente/, 0.84],
  [/slentando/, 0.84],
  [/sostenuto/, 0.86],
];
/** An ending's word's end speed (1: no slowing): "poco" halves the slowing, "pochissimo" quarters it. */
export function endSpeedOf(text: string): number {
  const t = text.toLowerCase();
  const hit = ENDING_WORDS.find(([re]) => re.test(t));
  if (!hit) return 1;
  const k = /pochissimo/.test(t) ? 0.25 : /poco/.test(t) ? 0.5 : 1;
  return 1 - (1 - hit[1]) * k;
}
/** An ending's marks reach back at most this many bars from the end (a word earlier is mid-piece: not played). */
export const ENDING_BARS = 4;
/**
 * D385 (the owner: "when I said fermatas, I also meant … the endings … Busoni recommends slowing down"):
 * where the edition slows the end (rall., allargando, poco largamente, sostenuto … in the last
 * ENDING_BARS bars, no a tempo after), the final slowing runs from its first word to the end and reaches
 * the strongest word's speed; null where it marks none (the automatic final ritard then, phrasing.ts).
 */
export function endingOf(w: WholeReading | undefined, length: number, barTicks: number): { from: number; end: number } | null {
  if (!w?.tempo?.length) return null;
  const tail = [];
  for (const c of [...w.tempo].sort((a, b) => a.on - b.on)) {
    if (c.kind === "resume") tail.length = 0;
    else if ((c.kind === "slow" || c.kind === "broaden") && c.on >= length - ENDING_BARS * barTicks && c.on < length) tail.push(c);
  }
  if (!tail.length) return null;
  const end = Math.min(...tail.map((c) => endSpeedOf(c.text)));
  return end < 1 ? { from: tail[0].on, end } : null;
}

export interface WholeNote {
  arts: Set<WholeArt>;
  /** dB from the printed dynamics (levels, ramps, hairpins). */
  dyn: number;
  /** The band's dB from the marks (BAND_MARK_DB). */
  markDb: number;
  /** Its place in a slur (one gesture). */
  slur?: SlurPlace;
  /** Its place in a phrase arc (0..1) and whether it ends it. */
  phrase?: { x: number; last: boolean };
  /** The note before a caesura: let go CAESURA_S early. */
  caesura?: boolean;
  /** Joined to the next (inside a slur or a phrase, a legato rule); false: apart (portato slur). */
  join?: boolean;
  /** s added to the onset (Busoni's arpeggio, from the bass). */
  spread?: number;
}
export interface WholePlan {
  /** "voice:onset" to the note's asks (every voice, every bar). */
  notes: Map<string, WholeNote>;
  /** Each voice's printed level at a tick (dB): the player's line's base. */
  dynAt: (v: number, tick: number) => number;
  /** The palette in force for voice v at a tick. */
  paletteAt: (v: number, tick: number) => Palette;
  /** The edition's final slowing, or null (the automatic one). */
  ending: { from: number; end: number } | null;
  /** The fermatas held: from tick a, its value d, x ticks added. */
  fermatas: { a: number; d: number; x: number }[];
  /** The subject's notes ("voice:onset"): an entry brought out where a palette asks. */
  subject: Set<string>;
}

const memo = new WeakMap<WholeReading, Map<string, WholePlan>>();
/** The plan of reading r on fugue f (null: not a whole-piece reading). */
export function wholePlan(f: TouchFugue, r: Reading | null | undefined): WholePlan | null {
  const w = r?.whole;
  if (!w) return null;
  let m = memo.get(w);
  if (!m) memo.set(w, (m = new Map()));
  let plan = m.get(f.id);
  if (!plan) m.set(f.id, (plan = buildWhole(f, w)));
  return plan;
}

const key = (v: number, on: number) => `${v}:${on}`;

export function buildWhole(f: TouchFugue, W: WholeReading): WholePlan {
  const beat = f.tpq;
  const nv = f.voices.length;
  const notes = new Map<string, WholeNote>();
  const get = (k: string) => {
    let g = notes.get(k);
    if (!g) notes.set(k, (g = { arts: new Set(), dyn: 0, markDb: 0 }));
    return g;
  };
  const onsetsOf = (v: number) => [...new Set((f.voices[v] ?? []).map((n) => n[0]))].sort((a, b) => a - b);
  const exists = (v: number, on: number) => f.voices[v]?.some((n) => n[0] === on) ?? false;

  // --- marks
  for (const m of W.marks) for (const a of m.art.split("+")) if (exists(m.v, m.on)) get(key(m.v, m.on)).arts.add(a.trim() as WholeArt);
  // --- slurs, portato slurs, phrases
  const inSpan = new Set<string>();
  for (const s of W.slurs) {
    const ons = onsetsOf(s.v).filter((on) => on >= s.from && on <= s.to);
    if (ons.length < 2) continue;
    ons.forEach((on, i) => {
      const k = key(s.v, on);
      const g = get(k);
      const last = i === ons.length - 1;
      inSpan.add(k);
      if (s.kind === "portato") {
        g.arts.add("portato");
        g.join = false;
      } else if (s.kind === "phrase") {
        g.phrase = { x: i / (ons.length - 1), last };
        if (!last && g.join === undefined) g.join = true;
      } else {
        g.slur = i === 0 ? "first" : last ? "last" : "mid";
        if (!last) g.join = true;
        else if (s.lastShort) g.join = false;
      }
    });
  }
  // --- rules into notes
  const subject = new Set<string>();
  for (const e of f.entries) if (!e.theme) for (const [on] of e.notes) subject.add(key(e.voice, on));
  const bare = (k: string) => !inSpan.has(k) && !notes.get(k)?.arts.size;
  // The subject's template (the first entry's marks, by place) onto entries left (nearly) bare.
  if (W.rules.some((r) => r.scope?.entries)) {
    const ents = f.entries.filter((e) => !e.theme).sort((a, b) => a.on - b.on);
    const first = ents[0];
    if (first) {
      const tmpl = first.notes.map(([on]) => notes.get(key(first.voice, on)));
      const firstMarked = tmpl.filter((g) => g?.arts.size).length;
      for (const e of ents.slice(1)) {
        if (e.notes.length !== first.notes.length) continue;
        const marked = e.notes.filter(([on]) => notes.get(key(e.voice, on))?.arts.size).length;
        if (marked >= Math.max(2, firstMarked / 2)) continue;
        e.notes.forEach(([on], j) => {
          const t = tmpl[j];
          const k = key(e.voice, on);
          if (!t || !bare(k)) return;
          const g = get(k);
          for (const a of t.arts) if (a !== "fermata") g.arts.add(a);
          if (t.slur && g.slur === undefined) g.slur = t.slur;
          if (t.join !== undefined && g.join === undefined) g.join = t.join;
        });
      }
    }
  }
  for (const r of W.rules) {
    const sc = r.scope ?? {};
    if (sc.from === undefined || sc.to === undefined) continue;
    const vs = sc.voices ?? [...Array(nv).keys()];
    for (const v of vs)
      for (const [on, dur] of f.voices[v] ?? []) {
        if (on < sc.from || on >= sc.to) continue;
        const k = key(v, on);
        if (!bare(k) || notes.get(k)?.join !== undefined) continue;
        if (r.art === "staccato") {
          // I/2: "the counterpoint in eighth notes is always staccato" (not the subject's).
          if (dur === beat / 2 && !subject.has(k)) get(k).arts.add("staccato");
        } else if (/sempre molto tenuto/.test(r.art)) get(k).arts.add("tenuto");
        else if (r.art === "legato") get(k).join = true;
      }
  }
  // --- caesuras: the note before let go early, not joined over
  for (const b of W.breaths) {
    const prev = (f.voices[b.v] ?? []).filter((n) => n[0] < b.on).pop();
    if (!prev) continue;
    const g = get(key(b.v, prev[0]));
    g.caesura = true;
    g.join = false;
  }
  // --- an arpeggio (wavy line): the chord spread from the bass, on the beat
  for (const o of W.ornaments) {
    if (!/arpeggio/.test(o.sign)) continue;
    const chord = f.voices.flatMap((ns, v) => ns.filter((n) => n[0] === o.on).map((n) => ({ v, midi: n[2] }))).sort((a, b) => a.midi - b.midi);
    chord.forEach((c, r) => (get(key(c.v, o.on)).spread = r * 0.04));
  }

  // --- dynamics: per voice, events in time
  type Ev = { t: number; kind: "set"; db: number } | { t: number; kind: "ramp"; t1: number; db1: number | null; rel: number };
  const evs: Ev[][] = Array.from({ length: nv }, () => []);
  const lv = (mark: string) => LEVEL_DB[mark.trim()];
  const levels = W.dyn.filter((d) => lv(d.mark) !== undefined).sort((a, b) => a.on - b.on);
  const firstLevel = levels.length ? lv(levels[0].mark) : 0;
  const nextLevel = (v: number, t: number, within: number) => {
    const l = levels.find((d) => d.voices.includes(v) && d.on > t && d.on <= t + within);
    return l ? { t: l.on, db: lv(l.mark) } : null;
  };
  const levelAt = (v: number, t: number) => {
    const l = levels.filter((d) => d.voices.includes(v) && d.on <= t).pop();
    return l ? lv(l.mark) : firstLevel;
  };
  for (const d of levels) for (const v of d.voices) if (v < nv) evs[v].push({ t: d.on, kind: "set", db: lv(d.mark) });
  const ramps = /\b(cresc|dim|decresc)/;
  const rampWords = [
    ...W.dyn.filter((d) => lv(d.mark) === undefined && ramps.test(d.mark)).map((d) => ({ on: d.on, voices: d.voices, up: /cresc/.test(d.mark), span: undefined as number | undefined })),
    ...W.text
      .filter((d) => ramps.test(d.text) && !W.dyn.some((x) => x.on === d.on && ramps.test(x.mark)))
      .map((d) => {
        const sp = d.span ? String(d.span).split(/[–-]/).map(Number) : [];
        return { on: d.on, voices: d.voices ?? [...Array(nv).keys()], up: /cresc/.test(d.text), span: sp.length === 2 && sp[1] > sp[0] ? sp[1] - sp[0] : undefined };
      }),
  ];
  for (const w of rampWords)
    for (const v of w.voices) {
      if (v >= nv) continue;
      const nx = nextLevel(v, w.on, 6 * f.barTicks);
      const here = levelAt(v, w.on);
      if (nx && (w.up ? nx.db > here : nx.db < here)) evs[v].push({ t: w.on, kind: "ramp", t1: nx.t, db1: nx.db, rel: 0 });
      else evs[v].push({ t: w.on, kind: "ramp", t1: w.on + (w.span ?? 2) * f.barTicks, db1: null, rel: w.up ? RAMP_DB : -RAMP_DB });
    }
  // Hairpins: into a printed level (a ramp to it); a long one (a bar or more) a ramp of ±(HAIRPIN_DB + 1); a short one a local swell, back over a beat.
  type Env = { v: number; a: number; b: number; hold: number; peak: number; back: number };
  const envs: Env[] = [];
  const hps = [...W.hairpins].sort((a, b) => a.from - b.from);
  const paired = new Set<(typeof hps)[number]>();
  for (const h of hps) {
    if (paired.has(h)) continue;
    for (const v of h.voices) {
      if (v >= nv) continue;
      const nx = nextLevel(v, h.to - beat, 2 * beat);
      if (nx) {
        evs[v].push({ t: h.from, kind: "ramp", t1: nx.t, db1: nx.db, rel: 0 });
        continue;
      }
      const sgn = h.dir === "cresc" ? 1 : -1;
      if (h.to - h.from >= f.barTicks) {
        evs[v].push({ t: h.from, kind: "ramp", t1: h.to, db1: null, rel: sgn * (HAIRPIN_DB + 1) });
        continue;
      }
      const mate = hps.find((x) => x !== h && x.dir !== h.dir && x.voices.includes(v) && Math.abs(x.from - h.to) <= beat / 8);
      if (mate && sgn > 0) {
        paired.add(mate);
        envs.push({ v, a: h.from, b: h.to, hold: 0, peak: HAIRPIN_DB, back: Math.max(1, mate.to - h.to) });
      } else envs.push({ v, a: h.from, b: h.to, hold: beat, peak: sgn * HAIRPIN_DB, back: beat });
    }
  }
  for (const e of evs) e.sort((a, b) => a.t - b.t || (a.kind === "set" ? -1 : 1));
  const base = (v: number, t: number) => {
    let cur = firstLevel;
    for (const e of evs[v] ?? []) {
      if (e.t > t) break;
      if (e.kind === "set") cur = e.db;
      else {
        const target = e.db1 ?? cur + e.rel;
        if (t >= e.t1) cur = target;
        else return cur + ((target - cur) * (t - e.t)) / Math.max(1, e.t1 - e.t);
      }
    }
    return cur;
  };
  const env = (v: number, t: number) => {
    let d = 0;
    for (const e of envs) {
      if (e.v !== v || t < e.a) continue;
      if (t <= e.b) d += (e.peak * (t - e.a)) / Math.max(1, e.b - e.a);
      else if (t <= e.b + e.hold) d += e.peak;
      else if (t <= e.b + e.hold + e.back) d += e.peak * (1 - (t - e.b - e.hold) / e.back);
    }
    return d;
  };
  const dynAt = (v: number, t: number) => base(v, t) + env(v, t);
  for (let v = 0; v < nv; v++) for (const [on] of f.voices[v]) get(key(v, on)).dyn = dynAt(v, on);
  for (const d of W.dyn) if (/sfz/.test(d.mark)) for (const v of d.voices) if (exists(v, d.on)) get(key(v, d.on)).arts.add("accent");
  for (const g of notes.values())
    g.markDb = g.arts.has("marcato") ? BAND_MARK_DB.marcato : g.arts.has("accent") ? BAND_MARK_DB.accent : g.arts.has("wedge") ? BAND_MARK_DB.wedge : g.arts.has("portato") ? BAND_MARK_DB.portato : g.arts.has("tenuto") ? BAND_MARK_DB.tenuto : 0;

  // --- palettes: the heading from the start; a word from its tick to the next word or double bar (in its voices)
  const heading = (W.heading && paletteOfWord(W.heading)) || "plain";
  const seams = W.sections.map((s) => s.at ?? (s.beforeBar ? (f.bars.find((b) => b.n === s.beforeBar)?.on ?? null) : null)).filter((x): x is number => x !== null);
  // The words in the score and the levels that are characters too (dolce, p dolce, mezza voce), in their voices.
  const words = [...W.text.map((t) => ({ on: t.on, voices: t.voices ?? [...Array(nv).keys()], text: t.text })), ...W.dyn.map((d) => ({ on: d.on, voices: d.voices, text: d.mark }))]
    .flatMap((t) => {
      const p = paletteOfWord(t.text);
      return p ? [{ on: t.on, voices: t.voices, p }] : [];
    })
    .sort((a, b) => a.on - b.on);
  const paletteAt = (v: number, t: number): Palette => {
    const w = words.filter((x) => x.on <= t && x.voices.includes(v)).pop();
    if (!w) return PALETTES[heading];
    // A double bar after the word closes it (the heading's again).
    if (seams.some((s) => s > w.on && s <= t)) return PALETTES[heading];
    return PALETTES[w.p];
  };

  // --- fermatas: time held only where every voice holds the chord
  const fermatas: WholePlan["fermatas"] = [];
  const ferOns = [...new Set(W.marks.filter((m) => /fermata/.test(m.art)).map((m) => m.on))].sort((a, b) => a - b);
  for (const on of ferOns) {
    const vs = W.marks.filter((m) => /fermata/.test(m.art) && m.on === on).map((m) => m.v);
    const d = Math.max(0, ...vs.map((v) => f.voices[v]?.find((n) => n[0] === on)?.[1] ?? 0));
    if (!d) continue;
    if (f.voices.some((ns) => ns.some((n) => n[0] > on && n[0] < on + d))) continue;
    fermatas.push({ a: on, d, x: FERMATA_HOLD * d });
  }
  return { notes, dynAt, paletteAt, ending: endingOf(W, f.length, f.barTicks), fermatas, subject };
}

/** A note's place in the metre: 0 the bar's first beat, 1 another beat, 2 between (the palettes' weight, the slur's shape). `inBar`: fugue.ts inBar. */
export function metricPlace(inBar: (tick: number) => number, tick: number, beat: number): 0 | 1 | 2 {
  const pos = inBar(tick);
  return pos === 0 ? 0 : pos % beat === 0 ? 1 : 2;
}

/** The plan's marks as the articulation reads them (phrasing.ts Marks): joined, short (dot, wedge, marcato), its slur place. */
export function wholeMarks(plan: WholePlan): Map<string, { join: boolean | null; short: boolean | null; slur?: SlurPlace }> {
  const m = new Map<string, { join: boolean | null; short: boolean | null; slur?: SlurPlace }>();
  for (const [k, g] of plan.notes) {
    const short = g.arts.has("staccato") || g.arts.has("wedge") || g.arts.has("marcato");
    const join = short ? null : (g.join ?? null);
    if (join !== null || short || g.slur) m.set(k, { join, short: short || null, ...(g.slur ? { slur: g.slur } : {}) });
  }
  return m;
}

/**
 * The dB a note of the band takes from the plan on the piano: its printed level, its mark, its slur's
 * shape by place, its phrase's arch, the palette's voicing and weight. Nothing caps a subject (D293 gone).
 */
export function bandDb(plan: WholePlan, inBar: (tick: number) => number, v: number, on: number, beat: number, bass: number): number {
  const g = plan.notes.get(key(v, on));
  const pal = plan.paletteAt(v, on);
  const place = metricPlace(inBar, on, beat);
  let db = (g?.dyn ?? plan.dynAt(v, on)) + (g?.markDb ?? 0) + pal.weight[place];
  if (v === bass) db += pal.bassDb;
  if (pal.entryDb || pal.othersDb) db += plan.subject.has(key(v, on)) ? pal.entryDb : pal.othersDb;
  if (g?.slur) db += slurShapeDb(g.slur, place < 2);
  if (g?.phrase) db += phraseArchDb(g.phrase.x);
  return db;
}
/** A phrase's arch at its place x (0..1): −PHRASE_DB/2 at its ends, +PHRASE_DB at its middle. */
export const phraseArchDb = (x: number) => -PHRASE_DB / 2 + 1.5 * PHRASE_DB * Math.sin(Math.PI * Math.max(0, Math.min(1, x)));
