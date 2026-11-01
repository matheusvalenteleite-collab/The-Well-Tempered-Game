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
 *     are as loud as the edition prints them: nothing caps a subject (D293 gone). D404: a ramp reaches the
 *     level printed for the system, an entry's own dim. ends its emphasis, a one-voice hairpin is that voice's
 *     shaping. D407: the player's line takes 40% of a drop under mf (never under −3 dB) and is never left more than
 *     4 dB under the loudest band voice for over 2 bars; the band keeps the full range.
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
/** sf, sfz, fz (D392: Busoni's fz in I/4, I/9 …): an accent, the strong zone. D394: fp (II/22: the note forte, then p) and rinf. (II/11) too. */
export const SFZ = /sf|\bfz\b|\bfp\b|\brinf/;
/** D394: a ramp word: cresc., dim., decresc., and Busoni's "sempre aumentando" (II/1), a crescendo. */
export const RAMP = /\b(cresc|dim|decresc|aumentando)/;
export const RAMP_UP = /cresc|aumentando/;
/**
 * D421: on a phone the printed levels are played in a narrower range (×0.65 about mf: p −4.2 dB instead of
 * −6.5, pp −7.2, ff +4.2): a phone's speaker and a room's noise leave about 16 dB of usable range (D335), and
 * Busoni's p exposition sat 14 dB under the harpsichord there. The terraces, the swells and their order are his;
 * only their size is scaled. A computer plays them as printed.
 */
export const PHONE_DYN_RANGE = 0.65;
const PHONE_RANGE = () => (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 ? PHONE_DYN_RANGE : 1);
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
  // D392: the other levels Busoni prints in Book I.
  "più p": -9,
  "sotto voce": -8,
  "più dolce": -6.5,
  "meno p": -4.5,
  "non f": 0,
  "sempre f": 3.5,
  // D394: Book II's (forte spelled out, the words after the letter). D403: fp is no level: Busoni writes it on a held note
  // (II/22), an accent on that note only (SFZ); read as a lasting p it left each voice soft for forty bars after its fp
  // while the voices still at the opening f stayed loud.
  forte: 3.5,
  "f sempre": 3.5,
  "forte dolce": 3.5,
  "meno forte": 1.5,
  "non forte": 0,
  "meno dolce": -4,
};
/**
 * D404: the level a word in the score begins with (an opening's level when no level is entered there) (LEVEL_DB's names, the longest first, followed by its end, a comma, a
 * space or a bracket: "sotto voce, misterioso" sotto voce, "dolce (Tenor.)" dolce, "f tenuto" f), or null.
 */
export function levelWord(text: string): string | null {
  const w = text.trim().toLowerCase();
  const names = Object.keys(LEVEL_DB).sort((a, b) => b.length - a.length);
  return names.find((k) => w === k || (w.startsWith(k) && /^[\s,(]/.test(w.slice(k.length)))) ?? null;
}
/** A hairpin with no printed level after it: a local swell or fall of this much (dB). */
export const HAIRPIN_DB = 3;
/** A ramp word (cresc., dim.) with no printed level within six bars: this much over its span (dB). */
export const RAMP_DB = 3;
/**
 * D404: a level first printed this many bars or more into the piece is no opening level: the voices play mf (0 dB)
 * before it (II/24 prints none until bar 50; its p had stood from bar 1).
 */
export const OPENING_BARS = 8;
/**
 * D404: a voice this far (dB) or more above the loudest other voice's printed level is brought back to it by its own
 * dim. (an entry's emphasis ended; II/15's terraced p, mp, mf, 3 dB apart, stay).
 */
export const TEXTURE_DB = 6;
/**
 * D407 (WTC 1.99): THE PLAYER'S LINE COMPRESSED UNDER mf. The owner: "Busoni's dynamic instructions make it such
 * ... that the player's voice is for long stretches at a low volume ... harms gameplay." Below mf (0 dB) the
 * player's line takes PLAYER_SHARE of Busoni's drop, eased into PLAYER_FLOOR_DB (a soft knee: tanh, so a hairpin
 * or a ramp inside a p keeps its shape, smaller): p −6.5 → −2.1, pp −11 → −2.7, never under −3. mf and louder, and
 * the accents (markDb, the strong zone's accentDb), as printed. The band keeps Busoni's full range (dynAt).
 */
export const PLAYER_SHARE = 0.4;
export const PLAYER_FLOOR_DB = -3;
export const playerDb = (d: number): number => (d >= 0 ? d : PLAYER_FLOOR_DB * Math.tanh((PLAYER_SHARE * d) / PLAYER_FLOOR_DB));
/**
 * D404, revised by D407: the safety net of the player's line (WholePlan.lineDynAt): never more than LINE_GAP_DB
 * under the loudest sounding band voice for more than LINE_GAP_BARS bars (lifted over a bar from LINE_GAP_BARS − 1).
 * D404's exemption (a printed p against a printed f) is gone: the compressed line plays inside the texture.
 */
export const LINE_GAP_DB = 4;
export const LINE_GAP_BARS = 2;
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
  [/allarg/, 0.82],
  [/largamente|largo\b/, 0.84],
  [/slentando/, 0.84],
  [/sostenuto|sostenendo/, 0.86],
  // D394: II/10's "Meno" (mosso) three bars from the end.
  [/^meno( mosso)?\.?$/, 0.88],
];
/** An ending's word's end speed (1: no slowing): "poco" halves the slowing, "pochissimo" quarters it. */
export function endSpeedOf(text: string): number {
  const t = text.toLowerCase();
  const hit = ENDING_WORDS.find(([re]) => re.test(t));
  if (!hit) return 1;
  const k = /pochissimo/.test(t) ? 0.25 : /poco/.test(t) ? 0.5 : 1;
  return 1 - (1 - hit[1]) * k;
}
/**
 * An ending's marks reach back at most this many bars from the end, or a tenth of the piece where that is
 * more (D392: I/4's largamente nine bars from the end of 115); a word earlier is mid-piece: not played.
 */
export const ENDING_BARS = 4;
export const ENDING_SHARE = 0.1;
/** D394: a word that says it runs to the end ("più largamente sino al fine", II/3; "Sostenendo sino al Fine", II/8) is an ending wherever it stands. */
export const TO_THE_END = /sino al fine/i;
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
    else if ((c.kind === "slow" || c.kind === "broaden") && (c.on >= length - Math.max(ENDING_BARS * barTicks, ENDING_SHARE * length) || TO_THE_END.test(c.text)) && c.on < length) tail.push(c);
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
  /** Each voice's printed level at a tick (dB): the band's base. */
  dynAt: (v: number, tick: number) => number;
  /** D404/D407: the player's line's base: dynAt compressed under mf (playerDb), lifted where it would sit too long too far under the loudest voice. */
  lineDynAt: (v: number, tick: number) => number;
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
  // D404: a level printed late in the piece is no opening level (OPENING_BARS): before it the level word of the opening
  // (I/4's "sotto voce, misterioso", I/6's dolce, entered among the words), else mf (II/10's ff of bar 82 had stood
  // from bar 1, II/24's p of bar 50 too).
  const opening = OPENING_BARS * f.barTicks;
  const openingWord = W.text.filter((t) => t.on < opening && levelWord(t.text)).sort((a, b) => a.on - b.on)[0];
  const firstLevel = levels.length && levels[0].on < opening ? lv(levels[0].mark) : openingWord ? lv(levelWord(openingWord.text)!) : 0;
  const nextLevel = (v: number, t: number, within: number) => {
    const l = levels.find((d) => d.voices.includes(v) && d.on > t && d.on <= t + within);
    return l ? { t: l.on, db: lv(l.mark) } : null;
  };
  // D404: a ramp with no level of its own ahead goes into the level Busoni prints for the other voices there (the
  // system's level: II/6's cresc. into the alto's f, II/12's into the f of bar 72, II/11's dim. into the bass's p):
  // the first such level, the loudest for a crescendo, the softest for a diminuendo.
  const otherLevel = (v: number, t: number, within: number, up: boolean) => {
    const ls = levels.filter((d) => !d.voices.includes(v) && d.on > t && d.on <= t + within);
    if (!ls.length) return null;
    const dbs = ls.filter((d) => d.on === ls[0].on).map((d) => lv(d.mark));
    return { t: ls[0].on, db: up ? Math.max(...dbs) : Math.min(...dbs) };
  };
  const levelAt = (v: number, t: number) => {
    const l = levels.filter((d) => d.voices.includes(v) && d.on <= t).pop();
    return l ? lv(l.mark) : firstLevel;
  };
  const sounding = (u: number, t: number) => (f.voices[u] ?? []).some((n) => n[0] < t + f.barTicks && n[0] + n[1] > t - f.barTicks);
  // D404: a diminuendo with no level ahead, in a voice standing TEXTURE_DB or more above the loudest other voice's
  // printed level, brings it back to that level (II/6's bass after its entry, where the upper voices' p is printed
  // after theirs; II/13's alto after its f): an entry's emphasis ends with its own dim., it does not stay.
  const textureDim = (v: number, t: number) => {
    const others = [...Array(nv).keys()].filter((u) => u !== v && sounding(u, t)).map((u) => levelAt(u, t));
    if (!others.length) return null;
    const tex = Math.max(...others);
    return levelAt(v, t) - tex >= TEXTURE_DB ? tex : null;
  };
  for (const d of levels) for (const v of d.voices) if (v < nv) evs[v].push({ t: d.on, kind: "set", db: lv(d.mark) });
  const ramps = RAMP;
  const rampWords = [
    ...W.dyn.filter((d) => lv(d.mark) === undefined && ramps.test(d.mark)).map((d) => ({ on: d.on, voices: d.voices, up: RAMP_UP.test(d.mark), span: undefined as number | undefined })),
    ...W.text
      .filter((d) => ramps.test(d.text) && !W.dyn.some((x) => x.on === d.on && ramps.test(x.mark)))
      .map((d) => {
        const sp = d.span ? String(d.span).split(/[–-]/).map(Number) : [];
        return { on: d.on, voices: d.voices ?? [...Array(nv).keys()], up: RAMP_UP.test(d.text), span: sp.length === 2 && sp[1] > sp[0] ? sp[1] - sp[0] : undefined };
      }),
  ];
  for (const w of rampWords)
    for (const v of w.voices) {
      if (v >= nv) continue;
      const here = levelAt(v, w.on);
      const own = nextLevel(v, w.on, 6 * f.barTicks);
      const nx = own ?? otherLevel(v, w.on, 6 * f.barTicks, w.up);
      const tex = !w.up && !own ? textureDim(v, w.on) : null;
      if (nx && (w.up ? nx.db > here : nx.db < here)) evs[v].push({ t: w.on, kind: "ramp", t1: nx.t, db1: nx.db, rel: 0 });
      else if (tex !== null) evs[v].push({ t: w.on, kind: "ramp", t1: w.on + (w.span ?? 2) * f.barTicks, db1: tex, rel: 0 });
      else evs[v].push({ t: w.on, kind: "ramp", t1: w.on + (w.span ?? 2) * f.barTicks, db1: null, rel: w.up ? RAMP_DB : -RAMP_DB });
    }
  // Hairpins: into their voice's printed level at their end, in their direction (D404: not a cresc. into a p; II/24's
  // swells on the sequences each restarting at p had been flattened), or, printed for every voice, into the level
  // printed there for any voice (D404: II/12's cresc. into the f of bar 72, printed for two); a hairpin answered at once by its opposite
  // (<>, ><) a swell and back, of any length (D404: a long <> had left its voice 4 dB up for good), its answer still landing on its voice's level or, after a dim., the texture's;
  // a lone diminuendo in a voice above the texture back to it (textureDim); a lone long one (a bar or more) a ramp of
  // ±(HAIRPIN_DB + 1), lasting only where printed for every voice (D404: in fewer voices it rises, holds a beat and
  // returns over a bar, that voice's shaping, not a new level: II/14's soprano had stayed 8 dB over the others to
  // the end); a short one a local swell, back over a beat. A hairpin at a ramp word of its direction in the same
  // voice is that ramp, not another (D404: I/4's cresc. word and hairpin had stacked +7 dB over più f).
  type Env = { v: number; a: number; b: number; hold: number; peak: number; back: number };
  const envs: Env[] = [];
  const hps = [...W.hairpins].sort((a, b) => a.from - b.from);
  const paired = new Set<(typeof hps)[number]>();
  for (const h of hps) {
    if (paired.has(h)) continue;
    const sgn = h.dir === "cresc" ? 1 : -1;
    const long = h.to - h.from >= f.barTicks;
    const everyVoice = [...Array(nv).keys()].every((u) => h.voices.includes(u));
    for (const v of h.voices) {
      if (v >= nv) continue;
      if (rampWords.some((w) => w.voices.includes(v) && w.up === sgn > 0 && Math.abs(w.on - h.from) <= beat)) continue;
      const toward = (x: { db: number } | null, s: number, at: number) => x !== null && (s > 0 ? x.db > levelAt(v, at) : x.db < levelAt(v, at));
      const own = nextLevel(v, h.to - beat, 2 * beat);
      const nx = own ?? (everyVoice ? otherLevel(v, h.to - beat, 2 * beat, sgn > 0) : null);
      if (nx && toward(nx, sgn, h.from)) {
        evs[v].push({ t: h.from, kind: "ramp", t1: nx.t, db1: nx.db, rel: 0 });
        continue;
      }
      const mate = hps.find((x) => x !== h && x.dir !== h.dir && x.voices.includes(v) && Math.abs(x.from - h.to) <= beat / 8);
      if (mate) {
        paired.add(mate);
        envs.push({ v, a: h.from, b: h.to, hold: 0, peak: sgn * (long ? HAIRPIN_DB + 1 : HAIRPIN_DB), back: Math.max(1, mate.to - h.to) });
        const mOwn = nextLevel(v, mate.to - beat, 2 * beat);
        if (mOwn && toward(mOwn, -sgn, mate.from)) evs[v].push({ t: mate.from, kind: "ramp", t1: mOwn.t, db1: mOwn.db, rel: 0 });
        else if (!mOwn && sgn > 0) {
          const tex = textureDim(v, mate.from);
          if (tex !== null) evs[v].push({ t: mate.from, kind: "ramp", t1: mate.to, db1: tex, rel: 0 });
        }
        continue;
      }
      const tex = sgn < 0 && !own ? textureDim(v, h.from) : null;
      if (tex !== null) evs[v].push({ t: h.from, kind: "ramp", t1: h.to, db1: tex, rel: 0 });
      else if (long && everyVoice) evs[v].push({ t: h.from, kind: "ramp", t1: h.to, db1: null, rel: sgn * (HAIRPIN_DB + 1) });
      else if (long) envs.push({ v, a: h.from, b: h.to, hold: beat, peak: sgn * (HAIRPIN_DB + 1), back: f.barTicks });
      else envs.push({ v, a: h.from, b: h.to, hold: beat, peak: sgn * HAIRPIN_DB, back: beat });
    }
  }
  // D403: fp on a held note: struck forte (its accent, SFZ), then p for the rest of that note, and back to the
  // surrounding level over a beat (not a lasting p).
  const fpDrop = new Map<number, { on: number; dur: number }[]>();
  for (const d of W.dyn)
    if (/^fp$/.test(d.mark.trim()))
      for (const v of d.voices) {
        const n = f.voices[v]?.find((x) => x[0] === d.on);
        if (n) fpDrop.set(v, [...(fpDrop.get(v) ?? []), { on: d.on, dur: n[1] }]);
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
  // D404: a swell ends at the next level printed in its voice after it (I/2's poco … più cresc. into the p subito of
  // bar 15: the cresc. heard, then the p, not the swell's way back over it).
  const cutOf = new Map<Env, number>();
  for (const e of envs) cutOf.set(e, levels.find((d) => d.voices.includes(e.v) && d.on > e.a)?.on ?? Infinity);
  const env = (v: number, t: number) => {
    let d = 0;
    for (const e of envs) {
      if (e.v !== v || t < e.a || t >= cutOf.get(e)!) continue;
      if (t <= e.b) d += (e.peak * (t - e.a)) / Math.max(1, e.b - e.a);
      else if (t <= e.b + e.hold) d += e.peak;
      else if (t <= e.b + e.hold + e.back) d += e.peak * (1 - (t - e.b - e.hold) / e.back);
    }
    return d;
  };
  const fpAt = (v: number, t: number) => {
    for (const x of fpDrop.get(v) ?? []) {
      if (t <= x.on || t > x.on + x.dur + beat) continue;
      const drop = LEVEL_DB.p - base(v, x.on);
      if (drop >= 0) return 0;
      return t <= x.on + x.dur ? drop : drop * (1 - (t - x.on - x.dur) / beat);
    }
    return 0;
  };
  const dynAt = (v: number, t: number) => PHONE_RANGE() * (base(v, t) + env(v, t) + fpAt(v, t));
  // D404/D407: the player's line: dynAt compressed under mf (playerDb), then its safety net, by beats: where the voice
  // sounds with others, the gap under the loudest of them counted while over LINE_GAP_DB (reset where it is not; a rest
  // of the voice neither counts nor resets), and past LINE_GAP_BARS − 1 bars lifted, over a bar, to LINE_GAP_DB under it.
  const lift = new Map<number, Float32Array>();
  const nBeats = Math.ceil(f.length / beat) + 1;
  const soundsAt = (u: number, t: number) => (f.voices[u] ?? []).some((n) => n[0] <= t && n[0] + n[1] > t);
  const liftOf = (v: number) => {
    const have = lift.get(v);
    if (have) return have;
    const out = new Float32Array(nBeats);
    let run = 0;
    for (let i = 0; i < nBeats; i++) {
      const t = i * beat + 1;
      if (!soundsAt(v, t)) continue;
      const others = [...Array(nv).keys()].filter((u) => u !== v && soundsAt(u, t));
      if (!others.length) continue;
      const loud = Math.max(...others.map((u) => dynAt(u, t)));
      const gap = loud - playerDb(dynAt(v, t));
      if (gap <= LINE_GAP_DB) {
        run = 0;
        continue;
      }
      run += beat;
      const x = (run - (LINE_GAP_BARS - 1) * f.barTicks) / f.barTicks;
      if (x > 0) out[i] = (gap - LINE_GAP_DB) * Math.min(1, x);
    }
    lift.set(v, out);
    return out;
  };
  const lineDynAt = (v: number, t: number) => playerDb(dynAt(v, t)) + (v >= 0 && v < nv ? (liftOf(v)[Math.min(nBeats - 1, Math.max(0, Math.floor((t - 1) / beat)))] ?? 0) : 0);
  for (let v = 0; v < nv; v++) for (const [on] of f.voices[v]) get(key(v, on)).dyn = dynAt(v, on);
  for (const d of W.dyn) if (SFZ.test(d.mark)) for (const v of d.voices) if (exists(v, d.on)) get(key(v, d.on)).arts.add("accent");
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
  return { notes, dynAt, lineDynAt, paletteAt, ending: endingOf(W, f.length, f.barTicks), fermatas, subject };
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
