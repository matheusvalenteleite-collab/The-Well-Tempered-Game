/**
 * Playing the other voices less like a machine (D179): each note gets a level, a length and a hair of
 * timing from its place in the music, as a player would give them.
 *   Weight: the bar's first beat a little stronger, the other beats a little, the notes between them
 *   lighter (the synthesized sounds; D309: the sampled piano by its own model, practice.ts
 *   pianoLevels; the harpsichord and the organ flat: they have no touch dynamics).
 *   The subject: its notes known (D293: never louder).
 *   Line: within a voice, the higher notes of a passage a shade louder (the arch of a phrase).
 *   Articulation (D302, D304, D309: ARTICULATION below): each instrument's table (practice.ts), the
 *   readings' marks first.
 *   Time: a few milliseconds early or late, the same each time (no randomness from run to run).
 * Pure: notes in, shapes out.
 */
import { accompaniment, type OtherNote } from "./voice-mode.ts";
import type { TouchFugue } from "./fugue.ts";
import { preset } from "./sound.ts";
import { characterOf, type Character } from "./character.ts";
import { BREATH, dbToLevel, decide, GAP_MAX_SHARE, kindsOf, noteHash, phraseBounds, pianoLevels, suspensions, type Kind, type KeyKind } from "./practice.ts";

/**
 * D294: how the instrument is played, from the sound chosen (never from the player's touch): the
 * recorded harpsichord and piano as a player of each would (the owner: "less robotic", after Wanda
 * Landowska and Rosalyn Tureck); the synthesized sounds as before. D309: the organ (PIPE ORGAN) its
 * own (the organ's table, no levels), SOLO VOICES the singers' legato (§6.5).
 */
export type Style = "plain" | "harpsichord" | "piano" | "organ" | "sung" | "solo" | "switched";
/** D305: VOCAL SYNTH sung as singers sing (SUNG below), SWITCHED-ON's bass apart (SWITCHED); D309: PIPE ORGAN "organ", SOLO VOICES "solo"; the other synthesized sounds "plain". */
export const styleOf = (soundId: string): Style =>
  // D358: the trial LUTE plucked as the harpsichord is (one player: the chord spread, the finger pedal).
  soundId === "harpsichordSampled" || soundId === "lute" ? "harpsichord" : soundId === "pianoSampled" ? "piano" : soundId === "chamberOrgan" || soundId === "organSampled" ? "organ" : soundId === "vocalSynth" ? "sung" : soundId === "soloVoices" ? "solo" : soundId === "analog" ? "switched" : "plain";

/**
 * D294, the numbers (seconds, shares of the written length):
 *   spread: a chord's notes (struck together in the others) one after another from the bass up, this
 *     far apart (the harpsichordist's arpeggiando; on the piano 0);
 *   lead: the chord's top note this much early (the pianist's "melody lead"; on the harpsichord 0);
 *   agogic: the bar's first beat this much late (the harpsichord's accent is of time, not loudness);
 *   jitter: the fixed unevenness, either way;
 *   cap: no note more than this off its written time (the game's beat stays clear);
 *   long: the hold of a note of a beat or longer before a rest; overlegato: a broken chord's joined
 *     notes (thirds the same way in and out) held into the next, the harpsichordist's finger pedal.
 * D309: the holds of leaps and repeated notes are the tables' (practice.ts TABLES); the harpsichord's
 * level flat (D294 kept 30% of the phrasing's swing), the piano's from its model (practice.ts).
 */
export const TOUCH: Record<"harpsichord" | "piano" | "lute", { spread: number; lead: number; agogic: number; jitter: number; cap: number; long: number; overlegato: number }> = {
  // D339: the jitter 2 → 4 ms (the piano 5); the piano's melody lead 8 → 3 ms (ASAP's WTC fugues: an onset's notes
  // spread 10 ms, the top note a median 1 ms ahead: in Bach no melody leads; Repp 1996 and Goebl 2001
  // found the lead a by-product of the melody struck louder).
  harpsichord: { spread: 0.004, lead: 0, agogic: 0.008, jitter: 0.004, cap: 0.02, long: 0.92, overlegato: 1.35 },
  piano: { spread: 0, lead: 0.003, agogic: 0.005, jitter: 0.005, cap: 0.02, long: 0.95, overlegato: 1 },
  // D365: LUTE, played as the harpsichord (styleOf) but its chords spread wider from the bass up (the thumb, then
  // the fingers: about 7 ms a string, within the band's 20 ms of the written beat), the bar's first beat a little less late.
  lute: { spread: 0.007, lead: 0, agogic: 0.006, jitter: 0.004, cap: 0.02, long: 0.92, overlegato: 1.35 },
};

/**
 * D339, THE BAND'S TIME SHAPED (every sound): the others as one ensemble move a little off the written
 * time, together (every voice the same offset at a tick, so a chord stays a chord), never more than
 * `cap` s either way, so the player's timing, judged against the written clock, can still lean on
 * them. Two terms, summed and soft-limited (cap · tanh(x / cap)):
 *   arc: within each phrase (practice.ts phraseBounds: between the cadences' arrivals) a little ahead in
 *     its middle and behind at its ends: `arc` · (1 - 1.5 sin πx), x the place in the phrase: quicker
 *     into the phrase, broadening out of it (Todd 1985, 1992's phrase arc; the KTH rule system's
 *     "phrase arch", Friberg, Bresin and Sundberg 2006); the piece's first phrase eased in over `settle`
 *     beats from the written time (the count-in's clicks are on it);
 *   final: the arrival of each cadence (not the piece's last: phrasing.ts ritard has it) `final` s late,
 *     reached smoothly over `before` beats (the last notes before it lengthened: phrase-final
 *     lengthening, Repp 1992; Todd 1985) and given back over `after` beats.
 * ASAP's pianists move much further (their phrase-level timeline 60 ms from a smooth one, median; 3.4%
 * in tempo): this is the part a game's time reference can bear.
 */
export const RUBATO = { arc: 0.008, final: 0.013, before: 1, after: 1.5, settle: 2, cap: 0.018 } as const;

/** D339: the band's offset (s, late +) at each tick: RUBATO's arcs and cadences. */
export function rubato(o: { first: number; lastOn: number; cadences?: readonly { on: number; kind?: string }[]; bar: number; beat: number }): (tick: number) => number {
  const bounds = phraseBounds(o.first, o.lastOn, o.cadences, o.bar);
  const R = RUBATO;
  const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  return (t: number) => {
    let a = o.first;
    let arc = 0;
    for (const c of bounds) {
      if (t <= c) {
        const x = c > a ? (t - a) / (c - a) : 1;
        arc = R.arc * (1 - 1.5 * Math.sin(Math.PI * x));
        break;
      }
      a = c;
    }
    // The first phrase eased in from the written time.
    arc *= smooth((t - o.first) / (R.settle * o.beat));
    let fin = 0;
    for (let k = 0; k < bounds.length - 1; k++) {
      const c = bounds[k];
      if (t > c - R.before * o.beat && t <= c) fin = Math.max(fin, R.final * smooth((t - (c - R.before * o.beat)) / (R.before * o.beat)));
      else if (t > c && t < c + R.after * o.beat) fin = Math.max(fin, R.final * (1 - smooth((t - c) / (R.after * o.beat))));
    }
    const x = arc + fin;
    return R.cap * Math.tanh(x / R.cap);
  };
}

export interface Shape {
  level: number;
  /** The share of its written length the note is held (D302: a joined note's, to the next note's onset). */
  hold: number;
  /** Seconds early (negative) or late. */
  nudge: number;
  /** A note of the subject (it shines whatever the player does). */
  subject: boolean;
  /** D302: how the note goes to the next of its voice (ARTICULATION). */
  art: Art;
  /** D302: joined from the note before (no fresh attack: chip.ts Play.legato). */
  legato: boolean;
  /** D302: joined to the next: held this many seconds past `hold` (the overlap, the nudges allowed for): chip.ts Play.tie. */
  over: number;
  /** D302: joined from this pitch (the note before's MIDI): chip.ts Play.from. */
  from?: number;
  /** D302: the last before a rest, or the last of all (a phrase's end): chip.ts Play.final. */
  final: boolean;
  /** D309: the piano's level in dB (practice.ts pianoLevels); none elsewhere. */
  db?: number;
  /**
   * D339: seconds added to the note's sounding length (the band's offset at its release less at its
   * onset: RUBATO), so a note let go before the next ends where the shaped time puts it; 0 when joined
   * (`over` already reaches the next note's shifted onset).
   */
  stretch: number;
}

/**
 * D302, ARTICULATION: each note of the others joined to the next ("join": no gap, a little overlap,
 * the next not attacked anew), detached ("detach": an audible gap; "short": staccato), or neither
 * ("nonlegato": a rule's gap; "plain": held as before D302, a long note, a note before a rest or the
 * last). D304: detached and staccato only where a reading marks them (readings.ts: its marks on every
 * entry of the subject in every voice, `marks`). D309 (the practice report §6): the rest by each
 * instrument's table (practice.ts TABLES: the harpsichord's, the piano's, the organ's; a synthesized
 * plucked or decaying voice the harpsichord's, a sustaining one the organ's): a hold fraction of the
 * time to the next onset with its gap clamped in milliseconds, by the interval, the note's pace, the
 * voice (the bass a little more apart on leaps), the fugue's character (character.ts), in this order
 * of precedence: the reading's marks; ties and suspensions (a dissonance joined to its resolution);
 * an upper voice's cadence arrival before a new start (f 0.85); a repeated note; the interval. The
 * subject is never louder: the readings' accents are not levels here (D293).
 */
export type Art = "join" | "detach" | "short" | "nonlegato" | "plain" | "syllable";
/**
 * D305, the singers' way (style "sung": VOCAL SYNTH): a singer carries the line: a step, a third and a
 * fourth joined (one vowel, the pitch gliding); a leap of a fifth or more, a repeated note, and the
 * lowest voice's notes of a third of a beat to a beat (a sung bass's syllables: the moving bass D302
 * set apart by a silence, now by its consonant) begun anew: "syllable", held to the next onset (no
 * gap) and the next sung on a new syllable (its consonant and scoop: chip.ts singNote without
 * Play.legato). A reading's detached and staccato marks, and a rest, as for the others. `leap`: the
 * smallest leap sung on a new syllable (semitones); `bass`: the bass's notes so sung (shares of a beat).
 */
export const SUNG = { leap: 7, bass: [1 / 3, 1] as const };
/**
 * D305, SWITCHED-ON (style "switched"; the owner: "the bass was less off-putting in the previous
 * detached version … still sounds better than legato over that massive line which over fills the
 * texture"): the lowest voice's notes of a third of a beat to a beat, before the next without a rest,
 * held `hold` of their value (nonlegato: D302's bass rule, a little longer than its 0.74); the rest as
 * its voices' tables (D309).
 */
export const SWITCHED = { hold: 0.8, bass: [1 / 3, 1] as const };
/**
 * The holds of a reading's marks (shares of the written length). D304: a reading's detached note held
 * three quarters of its value (the owner: "75%?"), staccato half. D309: the rule's holds are the
 * tables' (practice.ts).
 */
export const ART_HOLD = { detach: 0.75, short: 0.5 } as const;
/** D302: a reading's detached or staccato note's gap at most this share of a beat (a long note is not cut in half). */
export const GAP_BEATS = 0.4;
/** D302: a joined note held this far past the next one's onset (s) on a sustained sound: its crossfade (D309: the sampled harpsichord and piano by their tables' overlaps). */
export const OVERLAP_S = 0.03;
/** D339: a table's gap varied by up to this share either way, fixed per note (practice.ts noteHash). */
export const ART_SPREAD = 0.15;
/**
 * D349, PIPE ORGAN: an organist's ensemble: the manual's voices speak together (no note's own scatter:
 * one player's hands on one wind), each gap varied a third as much (a release is an organist's one
 * control, kept even), the phrase's shaped time half the others' (RUBATO: an organ's tone does not
 * decay to shape a line, and the church carries it).
 */
export const ORGAN_ENSEMBLE = { spread: 0.05, rubato: 0.5 } as const;
/** D302: a reading's marks on a fugue's notes: "voice:onset" to the reading's note (readings.ts readingMarks). */
export type Marks = ReadonlyMap<string, { join: boolean | null; short: boolean | null }>;

/** D309: what the phrasing knows of the piece beyond the notes it shapes (phraseContext). */
export interface PhraseContext {
  /** D302: a reading's marks (none: the default playing only). */
  marks?: Marks;
  /** D305: the lowest voice (else the lowest among the notes). */
  bass?: number;
  /** D309: seconds a tick at the playing tempo (else a beat of half a second). */
  spt?: number;
  /** D309: every note of the piece, every voice (suspensions, the piano's levels: from the score, never from the player's part). */
  score?: readonly OtherNote[];
  /** D309: the piece's cadences (fugue.ts cadences). */
  cadences?: readonly { on: number; kind?: string }[];
  /** D309: a bar's ticks. */
  bar?: number;
  character?: Character;
  /** D309: a quaver's ticks (the character moves quavers and longer; else half a beat). */
  quaver?: number;
  /** D309: each voice's way (else from the sound: practice.ts kindsOf). */
  kinds?: readonly Kind[];
}

/** D309: the context of a piece at a tempo (quarter notes a minute), for phrase(). */
export function phraseContext(f: TouchFugue, bpm: number, marks?: Marks): PhraseContext {
  return { ...(marks ? { marks } : {}), bass: f.voices.length - 1, spt: 60 / (bpm * f.tpq), score: accompaniment(f, 0, -1), cadences: f.cadences ?? [], bar: f.barTicks, quaver: f.tpq / 2, character: characterOf(f.id) };
}

/** D309: each voice's way under a style (the synthesized sounds by their patches). */
function kindsFor(style: Style, count: number): Kind[] {
  if (style === "harpsichord" || style === "piano" || style === "organ" || style === "sung" || style === "solo") return Array.from({ length: count }, () => style);
  return kindsOf(preset().id, count).map((k) => (k === "sung" || k === "solo" ? "organ" : k));
}

/** `inBar`: where a tick falls in its bar (fugue.ts inBar: by the bars as encoded). */
export function phrase(notes: readonly OtherNote[], beat: number, inBar: (tick: number) => number, subject: Set<string>, style: Style = styleOf(preset().id), art: PhraseContext = {}): Shape[] {
  const plain = phrasePlain(notes, beat, inBar, subject);
  const T = style === "harpsichord" || style === "piano" ? TOUCH[style === "harpsichord" && preset().id === "lute" ? "lute" : style] : null;
  const nexts = nextIndex(notes);
  const prevs = new Map<number, number>();
  for (const [i, j] of nexts) if (j !== undefined && notes[j].on === notes[i].on + notes[i].dur) prevs.set(j, i);
  // D305: the lowest voice (given, else the lowest among these notes).
  const bass = art.bass ?? notes.reduce((m, n) => Math.max(m, n.voice), 0);
  const kinds = art.kinds ?? kindsFor(style, bass + 1);
  const kindOf = (v: number): Kind => kinds[Math.min(v, kinds.length - 1)] ?? "organ";
  const spt = art.spt ?? 0.5 / beat;
  const score = art.score ?? notes;
  const harmony = suspensions(score, beat, inBar);
  const cadOn = new Set((art.cadences ?? []).map((c) => c.on));
  // D309: a sampled harpsichord's or piano's join overlaps by its table; a sustained sound's crossfades (D302).
  const struck = style === "harpsichord" || style === "piano";
  const inBass = (n: OtherNote, [lo, hi]: readonly [number, number]) => n.voice === bass && n.dur >= lo * beat - 1e-9 && n.dur <= hi * beat + 1e-9;
  // Each voice's note before (the first of the onset before), for a broken chord's leap in.
  const before = new Map<number, OtherNote>();
  const rank = new Map<number, { r: number; of: number }>();
  if (T) {
    const lastOn = new Map<number, { on: number; n: OtherNote }>();
    const prevOn = new Map<number, OtherNote>();
    notes.forEach((n, i) => {
      const l = lastOn.get(n.voice);
      if (l && l.on < n.on) prevOn.set(n.voice, l.n);
      if (!l || l.on < n.on) lastOn.set(n.voice, { on: n.on, n });
      const p = prevOn.get(n.voice);
      if (p) before.set(i, p);
    });
    // The notes struck together (the same onset), low to high: their place in the chord.
    const chords = new Map<number, number[]>();
    notes.forEach((n, i) => {
      const c = chords.get(n.on);
      if (c) c.push(i);
      else chords.set(n.on, [i]);
    });
    for (const c of chords.values()) {
      const voices = new Set(c.map((i) => notes[i].voice));
      if (voices.size < 2) continue;
      [...c].sort((a, b) => notes[a].midi - notes[b].midi).forEach((i, r) => rank.set(i, { r, of: c.length }));
    }
  }
  // D309: the piano's levels from the whole score (practice.ts pianoLevels).
  const dbs = style === "piano" ? pianoLevels(score, { beat, inBar, bar: art.bar ?? 4 * beat, cadences: art.cadences, harmony }) : null;
  // D339, D293: the subject never louder. The terms know no subject, but with D339's wider terms the music's
  // own shape could lift it (II/16's by 0.5 dB): in each voice and octave, the subject's notes brought down
  // to the others' mean where theirs is over it (never raised).
  if (dbs && subject.size) {
    const bins = new Map<string, { s: string[]; o: number[] }>();
    for (const x of score) {
      const k = `${x.voice}:${Math.floor(x.midi / 12)}`;
      const b = bins.get(k) ?? { s: [], o: [] };
      const key = `${x.voice}:${x.on}:${x.midi}`;
      if (subject.has(`${x.voice}:${x.on}`)) b.s.push(key);
      else b.o.push(dbs.get(key) ?? 0);
      bins.set(k, b);
    }
    for (const b of bins.values()) {
      if (!b.s.length || !b.o.length) continue;
      const over = b.s.reduce((a, k) => a + (dbs.get(k) ?? 0), 0) / b.s.length - b.o.reduce((a, c) => a + c, 0) / b.o.length;
      if (over > 0) for (const k of b.s) dbs.set(k, (dbs.get(k) ?? 0) - over);
    }
  }
  const overS: number[] = [];
  // D339: the band's time shaped (RUBATO), where the piece's phrases are known (phraseContext); none for a bare list.
  const scoreOns = score.length ? score.map((x) => x.on) : [0];
  const rb0 = art.bar !== undefined && art.cadences !== undefined && notes.length ? rubato({ first: Math.min(...scoreOns), lastOn: Math.max(...scoreOns), cadences: art.cadences, bar: art.bar, beat }) : null;
  const organ = style === "organ";
  const rb = rb0 && organ ? (t: number) => rb0(t) * ORGAN_ENSEMBLE.rubato : rb0;
  const shapes: Shape[] = plain.map((sh, i) => {
    const n = notes[i];
    const j = nexts.get(i);
    const after = j === undefined ? undefined : notes[j];
    let nudge = organ ? 0 : sh.nudge;
    let level = sh.level;
    if (T) {
      const h = Math.sin(n.on * 12.9898 + n.midi * 78.233 + n.voice * 37.719) * 43758.5453;
      nudge = ((h - Math.floor(h)) * 2 - 1) * T.jitter;
      const c = rank.get(i);
      if (c) nudge += c.r * T.spread - (c.r === c.of - 1 ? T.lead : 0);
      if (inBar(n.on) === 0) nudge += T.agogic;
      nudge = Math.max(-T.cap, Math.min(T.cap, nudge));
    }
    // D339: the ensemble's shaped time on top, the whole within ±20 ms of the written beat.
    if (rb) nudge = Math.max(-0.02, Math.min(0.02, nudge + rb(n.on)));
    let db: number | undefined;
    if (dbs) {
      db = dbs.get(`${n.voice}:${n.on}:${n.midi}`) ?? 0;
      level = dbToLevel(db);
    } else if (style === "harpsichord" || style === "organ") level = 1;
    // A reading's detached note's gap at most GAP_BEATS of a beat.
    const apart = (share: number) => Math.max(share, 1 - (GAP_BEATS * beat) / n.dur);
    const gapped = (gap: number) => Math.max(1 - GAP_MAX_SHARE, 1 - gap / (n.dur * spt));
    let a: Art;
    let hold = 1;
    overS[i] = OVERLAP_S;
    if (style === "sung") a = sung(notes, i, j, beat, art.marks, bass);
    else {
      const m = marked(notes, i, j, art.marks);
      if (m !== null) a = m;
      else if (style === "solo" || kindOf(n.voice) === "solo") {
        // §6.5: joined, a repeated note on a new syllable, a breath at a cadence arrival.
        if (after!.midi === n.midi) a = "syllable";
        else if (n.voice !== bass && cadOn.has(n.on)) {
          a = "nonlegato";
          const ioi = (after!.on - n.on) * spt;
          hold = gapped(Math.max(BREATH.min / 1000, Math.min(BREATH.max / 1000, (1 - BREATH.f) * ioi)));
        } else a = "join";
      } else if (style === "switched" && inBass(n, SWITCHED.bass)) {
        // D305: SWITCHED-ON's bass apart.
        a = "nonlegato";
        hold = apart(SWITCHED.hold);
      } else {
        const kind = kindOf(n.voice) as KeyKind;
        const prev = prevs.get(i);
        const interval = after!.midi - n.midi;
        const key = `${n.voice}:${n.on}`;
        const d = decide(kind, {
          interval,
          ioi: (after!.on - n.on) * spt,
          bass: n.voice === bass,
          arrival: prev !== undefined && Math.abs(n.midi - notes[prev].midi) >= 5 && Math.abs(interval) >= 1 && Math.abs(interval) <= 2,
          resolution: harmony.dissonance.has(key) && harmony.resolution.has(`${after!.voice}:${after!.on}`),
          cadence: cadOn.has(n.on),
          character: art.character,
          quaver: n.dur >= (art.quaver ?? beat / 2) - 1e-9,
        });
        if ("join" in d) {
          a = "join";
          if (struck) overS[i] = d.join;
        } else {
          a = "nonlegato";
          // D339: no two gaps alike (±15%, fixed per note): a player's hand, not a sewing machine.
          hold = gapped(d.gap * (1 + (organ ? ORGAN_ENSEMBLE.spread : ART_SPREAD) * noteHash(n.on, n.midi, n.voice, 2)));
        }
      }
    }
    if ((a === "join" || a === "syllable") && after) {
      hold = (after.on - n.on) / n.dur;
      // D294, the harpsichordist's finger pedal: a broken chord's notes held on into the next.
      const into = before.get(i);
      const out = after.step - n.step;
      const inn = into ? n.step - into.step : 0;
      if (T && T.overlegato > 1 && Math.abs(out) >= 2 && Math.abs(inn) >= 2 && Math.sign(out) === Math.sign(inn) && n.dur < beat) hold = Math.max(hold, T.overlegato);
    } else if (a === "detach") hold = apart(ART_HOLD.detach);
    else if (a === "short") hold = apart(ART_HOLD.short);
    else if (a === "plain") hold = n.dur >= beat ? (T ? T.long : 0.95) : 1;
    const final = !after || after.on > n.on + n.dur;
    const stretch = rb && a !== "join" && a !== "syllable" ? rb(n.on + n.dur * hold) - rb(n.on) : 0;
    return { level, hold, nudge, subject: sh.subject, art: a, legato: false, over: 0, final, stretch, ...(db !== undefined ? { db } : {}) };
  });
  // Joined: the next note not attacked anew, this one held past its onset (the two nudges allowed for).
  // D305: a "syllable" held over too, the next begun anew (its consonant: no gap, no glide).
  shapes.forEach((sh, i) => {
    const j = nexts.get(i);
    if ((sh.art !== "join" && sh.art !== "syllable") || j === undefined) return;
    if (sh.art === "join") {
      shapes[j].legato = true;
      shapes[j].from = notes[i].midi;
    }
    sh.over = Math.max(struck ? 0.002 : 0.01, overS[i] + shapes[j].nudge - sh.nudge);
  });
  return shapes;
}

/** D302: a note's way by the reading's mark, or "plain" before a rest, the last, a chord held under the next; null: the rules decide (D309). */
function marked(notes: readonly OtherNote[], i: number, j: number | undefined, marks: Marks | undefined): Art | null {
  const n = notes[i];
  const after = j === undefined ? undefined : notes[j];
  // Before a rest, or the last: as it was.
  if (!after || after.on > n.on + n.dur) return "plain";
  const mark = marks?.get(`${n.voice}:${n.on}`);
  if (mark?.short) return "short";
  if (mark?.join === false) return "detach";
  if (mark?.join === true) return after.on === n.on + n.dur ? "join" : "plain";
  // Notes overlapping in one voice (a chord held under the next): as it was.
  if (after.on !== n.on + n.dur) return "plain";
  return null;
}

/** D305: how note i goes to its next in the singers' way (SUNG): a reading's marks and the rests as for the others. */
function sung(notes: readonly OtherNote[], i: number, j: number | undefined, beat: number, marks: Marks | undefined, bass: number): Art {
  const a = marked(notes, i, j, marks);
  if (a !== null) return a;
  const n = notes[i];
  const after = notes[j!];
  const semis = Math.abs(after.midi - n.midi);
  if (semis === 0 || semis >= SUNG.leap) return "syllable";
  if (n.voice === bass && n.dur >= SUNG.bass[0] * beat - 1e-9 && n.dur <= SUNG.bass[1] * beat + 1e-9) return "syllable";
  return "join";
}

/** D302: each note's next note in its voice, by index (the first of the next onset; D191: a chord's partner, struck with it, is not "the next note"). */
function nextIndex(notes: readonly OtherNote[]): Map<number, number | undefined> {
  const byVoice = new Map<number, number[]>();
  for (let i = 0; i < notes.length; i++) {
    const v = byVoice.get(notes[i].voice);
    if (v) v.push(i);
    else byVoice.set(notes[i].voice, [i]);
  }
  const next = new Map<number, number | undefined>();
  for (const idx of byVoice.values()) {
    let after: number | undefined;
    for (let k = idx.length - 1; k >= 0; k--) {
      if (k + 1 < idx.length && notes[idx[k + 1]].on > notes[idx[k]].on) after = idx[k + 1];
      next.set(idx[k], after);
    }
  }
  return next;
}

/**
 * D302: how a note of the others is sounded, from its shape: joined from the one before (no new
 * attack: Play.legato), joined to the next (held over it, crossfaded out over `tie` s: Play.tie).
 * D304: `apart`, detached or staccato by a reading's mark (Play.apart: its gap heard on every sound).
 * D339: `vel`, the piano's level in dB (Play.vel: its colour, brighter struck harder).
 */
export function joins(sh: Shape): { legato?: boolean; tie?: number; from?: number; final?: boolean; apart?: boolean; vel?: number } {
  return { ...(sh.legato ? { legato: true, ...(sh.from !== undefined ? { from: sh.from } : {}) } : {}), ...(sh.over > 0 ? { tie: sh.over } : {}), ...(sh.final ? { final: true } : {}), ...(sh.art === "detach" || sh.art === "short" ? { apart: true } : {}), ...(sh.db !== undefined ? { vel: sh.db } : {}) };
}

/** D179: the synthesized sounds' phrasing (and the base of the others'): each note's level and its fixed unevenness (D302: the holds are ARTICULATION's). */
function phrasePlain(notes: readonly OtherNote[], beat: number, inBar: (tick: number) => number, subject: Set<string>): { level: number; nudge: number; subject: boolean }[] {
  // Each voice's notes in order, to see the voice's range around each note.
  // (D191: built by pushing; copying the list for every note made it O(n²).)
  const byVoice = new Map<number, number[]>();
  for (let i = 0; i < notes.length; i++) {
    const v = byVoice.get(notes[i].voice);
    if (v) v.push(i);
    else byVoice.set(notes[i].voice, [i]);
  }
  const local = new Map<number, number>();
  for (const idx of byVoice.values()) {
    idx.forEach((i, k) => {
      // Where the note stands between the lowest and highest of its neighbours (0 to 1).
      const near = idx.slice(Math.max(0, k - 6), k + 7).map((j) => notes[j].midi);
      const lo = Math.min(...near);
      const hi = Math.max(...near);
      local.set(i, hi > lo ? (notes[i].midi - lo) / (hi - lo) : 0.5);
    });
  }
  return notes.map((n, i) => {
    const pos = inBar(n.on);
    const weight = pos === 0 ? 1.12 : pos % beat === 0 ? 1.04 : 0.94;
    const inSubject = subject.has(`${n.voice}:${n.on}`);
    // D293: the subject no louder than its neighbours (the owner: banging the subject every time is
    // "patronising"); it is marked by its effect's soft layers (subject-fx.ts), not by level.
    const subj = 1;
    const arch = 0.92 + 0.16 * (local.get(i) ?? 0.5);
    // A fixed, small unevenness: a hash of the note.
    const h = Math.sin(n.on * 12.9898 + n.midi * 78.233 + n.voice * 37.719) * 43758.5453;
    const nudge = ((h - Math.floor(h)) * 2 - 1) * 0.006;
    return { level: weight * subj * arch, nudge, subject: inSubject };
  });
}

/**
 * D181, the accompaniment listening: how the player has been playing (0 pp to 1 ff, a running
 * average) moves the others a little with them (from 0.88 to 1.12 of their level). D293: only where
 * touch dynamics are heard (proto-game.ts touchDynamics); elsewhere `feel` stays put.
 */
export function follow(sh: Shape, feel: number): number {
  const f = 0.88 + 0.24 * Math.max(0, Math.min(1, feel));
  return sh.level * f;
}

/**
 * D181, the last cadence held back: over the last two bars the tempo slows evenly to RIT_END of
 * itself. `warp` turns score ticks into ticks of steady time, `unwarp` back.
 */
export const RIT_END = 0.78;

/** A warp of score ticks into ticks of steady time, and back. */
export interface Warp {
  warp: (tick: number) => number;
  unwarp: (w: number) => number;
}

/**
 * D250: a warp with a tempo curve laid over it: `speed(tick)` a factor on the tempo (1.06: 6% quicker),
 * from tick 0 to `length` (before it the warp as it was, after it the last speed). Tabled every `step`
 * ticks (straight lines between), inverted by search.
 */
export function withSpeed(base: Warp, speed: (tick: number) => number, length: number, step: number): Warp {
  const n = Math.max(1, Math.ceil(length / step));
  const at = new Float64Array(n + 1);
  at[0] = base.warp(0);
  for (let k = 0; k < n; k++) {
    const a = k * step;
    const b = Math.min(length, a + step);
    at[k + 1] = at[k] + (base.warp(b) - base.warp(a)) / Math.max(0.25, speed((a + b) / 2));
  }
  const last = Math.max(0.25, speed(length));
  return {
    warp: (tick) => {
      if (tick <= 0) return base.warp(tick);
      if (tick >= length) return at[n] + (base.warp(tick) - base.warp(length)) / last;
      const k = Math.floor(tick / step);
      const a = k * step;
      const b = Math.min(length, a + step);
      return at[k] + ((at[k + 1] - at[k]) * (tick - a)) / Math.max(1e-9, b - a);
    },
    unwarp: (w) => {
      if (w <= at[0]) return base.unwarp(w);
      if (w >= at[n]) return base.unwarp(base.warp(length) + (w - at[n]) * last);
      let lo = 0;
      let hi = n;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (at[mid] <= w) lo = mid;
        else hi = mid;
      }
      const a = lo * step;
      const b = Math.min(length, a + step);
      return a + ((b - a) * (w - at[lo])) / Math.max(1e-9, at[lo + 1] - at[lo]);
    },
  };
}
export function ritard(length: number, barTicks: number): Warp {
  const from = Math.max(0, length - 2 * barTicks);
  const L = length - from;
  const a = 1 - RIT_END;
  const end = from - (L / a) * Math.log(1 - a);
  return {
    warp: (tick) => {
      if (tick <= from) return tick;
      if (tick >= length) return end + (tick - length) / RIT_END;
      const x = (tick - from) / L;
      return from - (L / a) * Math.log(1 - a * x);
    },
    unwarp: (w) => {
      if (w <= from) return w;
      if (w >= end) return length + (w - end) * RIT_END;
      return from + (L * (1 - Math.exp((-a * (w - from)) / L))) / a;
    },
  };
}
