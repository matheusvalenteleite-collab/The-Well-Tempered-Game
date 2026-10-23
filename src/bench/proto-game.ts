/**
 * The testbench's game (D175; D178; D179): one voice of a piece played against the others, judged by
 * a prototype (protos.ts). The time picks the note (the pending one nearest in time, within the
 * window); the place judges it: right, Bach's note sounds; wrong, what was asked for sounds, muffled
 * (the PIANO's wrong key, plain), and it does not count. A held thumb slid onto the next note's place
 * plays it; a thumb moved across the dynamic axis while its note sounds swells or fades it; a thumb
 * flicked upwards as it lets go sends its note off with a swoosh. The player's voice sounds as the
 * others do (D208; chip.ts leadOf). It can also be played from a computer's keys or a MIDI keyboard. On the audio
 * clock as heard; the others phrased (phrasing.ts); a band's rhythm section keeps the beat. A note
 * too quick to strike at the tempo played rides after the note before (D191: lanes.ts quickRides):
 * it sounds by itself once that note is played right, and is neither judged nor counted.
 */
import { ornamentsOf, realiseNote, type Ornament } from "../touch/ornament-play.ts";
import type { Arrow } from "../touch/MusicBox.tsx";
import type { Burst, Pop } from "../touch/box-fx.ts";
import { isPhone, voicing, type Chip, type Play, type Sounding } from "../touch/chip.ts";
import type { Grade } from "../touch/engine.ts";
import { barAt, beatOf, cadenceName, countInStart, inBar, keyAt, type TouchFugue } from "../touch/fugue.ts";
import { chordOf, laneNotes, options, quickRides, strike, sweep, type LaneNote, type LaneOptions } from "../touch/lanes.ts";
import type { Keyboard } from "../touch/piano.ts";
import { follow, phrase, ritard, type Shape } from "../touch/phrasing.ts";
import type { Side } from "../touch/thumbs.ts";
import { accompaniment, subjectMarks, type OtherNote } from "../touch/voice-mode.ts";
import { SubjectSound } from "../touch/subject-fx.ts";
import { pianoKey, pianoKeys } from "./placed.ts";
import type { Clock } from "./her-clock.ts";
import { lineKey, subjectLine, type LineEntry, type SubjectLine } from "./subject-line.ts";
import { barDynamic, contourCue, contourOk, dynamic, HOME_LANES, keyPlace, LADDER_AREA, planLanes, levelOf, moves, stepNear, stepPitch, type Move, type Options, type Proto, laneOk } from "./protos.ts";

export const PERFECT_MS = 70;
/** The multiplier's step (notes right in a row), and CON FUOCO's run. */
export const STEP_NOTES = 8;
export const FUOCO_NOTES = 24;
/** How far ahead the next note shows, in ms. */
export const APPROACH_MS = 1100;
const HOLD_MAX = 8;
/** D191: notes gone by are swept as missed this long (s) after their window closes: a frame's grace. */
export const SWEEP_GRACE_S = 0.035;
/** A thumb let go moving upwards at least this fast (px per ms), over this far (px): a swoosh. */
const SWOOSH_V = 0.7;
const SWOOSH_PX = 30;

export interface Contact {
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A key of a computer or a MIDI keyboard: a pitch (MIDI), or a move (the computer's arrows and WASD). */
export interface KeyPress {
  /** EASY (computer): a trill on the note. */
  trill?: boolean;
  /** The hand (TWO VOICES: which voice). */
  side?: Side;
  midi?: number;
  move?: { dir: number; big: boolean };
  /** EASY's DIRECTION (D187): the key struck. */
  code?: string;
  /** 0 to 1. */
  velocity?: number;
}

/** The bars' screens: the music box's rows and time in the play area's coordinates (set by the app as the screen is laid out). */
export interface Rows {
  yOf(step: number): number;
  stepAt(y: number): number;
  rowH: number;
  /** Where a tick is drawn across the box. */
  xOf(tick: number): number;
}

interface Held {
  side: Side;
  /** The voice it plays (TWO VOICES: the left thumb the first, the right the second). */
  k: number;
  /** Where it landed, and where it last played a note (for the next slide). */
  x0: number;
  ax: number;
  ay: number;
  /** The note it plays (-1 none), its chord, its sound, the pitch sounding, its place (column, key, row). */
  note: number;
  chord: number[];
  sounds: Sounding[];
  midi: number;
  cell?: number;
  /** The dynamic it struck at (0 pp to 1 ff). */
  d0: number;
  /** D208: another thumb has struck since on this voice: this one is on its way off and slides no more. */
  passive?: boolean;
  /** Its last positions, for a flick. */
  trail: { t: number; y: number }[];
  /** The points its note scored (taken back if its articulation fails). */
  pts?: number;
  /** D213: the subject's effect layers under its note, stopped with it. */
  fx?: Sounding[];
}

/** A touch as the music box shows it: when, at what step (the one asked for), right or wrong. */
export interface Mark {
  tick: number;
  step: number;
  ok: boolean;
}

type Verdict = { ok: boolean; wrong?: number; why?: "gesture" | "legato" | "hand" | "height" | "dynamic" };

/** A voice the player plays: its notes as judged, and their moves. */
export interface Track {
  voice: number;
  notes: LaneNote[];
  moves: Move[];
}

export class ProtoGame {
  readonly f: TouchFugue;
  /** The voices played: one, or two (TWO VOICES, one per thumb). The first's are also `voice`, `notes`, `moves`. */
  readonly tracks: Track[];
  readonly voice: number;
  readonly notes: LaneNote[];
  readonly moves: Move[];
  readonly others: OtherNote[];
  readonly start: number;
  readonly entry: number;
  readonly end: number;
  tps: number;
  opt: LaneOptions;
  readonly proto: Proto;
  readonly o: Options;
  /** The sideways PIANO's keyboard. */
  readonly kb: Keyboard;
  /** LADDER: the box's rows, as laid out now. */
  rows: Rows | null = null;
  now = 0;
  combo = 0;
  grade: Grade | null = null;
  /** EASY (computer): the keys down now (their codes), for the screen. */
  readonly keysDown = new Set<string>();
  /** PIANO on a computer: the typing keys' octave (Z down, X up). */
  octave = 0;
  /** EASY (computer): Shift held, the pedal: notes let go ring on until it is lifted. */
  private pedalled: Sounding[] = [];
  private pedalDown = false;
  /** LADDER: the touch that played the last note (its thumb, its height). */
  lastTouch: { side: Side; y: number } | null = null;
  /** The touches, for the music box. */
  readonly marks: Mark[] = [];
  /**
   * D181, the score (after Guitar Hero and Rock Band, Frequency, Hi-Fi Rush): a note right scores 2
   * (PERFECT) or 1 (GOOD) times the multiplier; the multiplier climbs ×1 to ×4, a step for every
   * STEP_NOTES right in a row, and falls a step (not to ×1) on a slip. An entry of the subject played
   * through without a slip is captured: its ◆ turns gold, it scores a bonus, and ORGANO PLENO follows,
   * every note doubled in points and in sound (an octave above and below) until the next entry. A run
   * of FUOCO_NOTES right ignites CON FUOCO, the notes brighter and glowing, until a slip.
   */
  score = 0;
  mult = 1;
  streak = 0;
  maxStreak = 0;
  /** The entries of the voices played: when each starts (its ◆), whether captured, whether lost. */
  readonly entries: { voice: number; k: number; on: number; end: number; ons: number[]; state: "open" | "captured" | "lost" }[] = [];
  /** ORGANO PLENO: until this tick (none: -1). */
  plenoUntil = -1;
  get pleno() {
    return this.plenoUntil >= 0 && this.now < this.plenoUntil;
  }
  /** When a banner was raised (performance.now()), and which. */
  banner: { text: string; at: number } | null = null;
  private chip: Chip;
  beat: number;
  private perBar: number;
  private anchorAt: number;
  private anchorTick: number;
  private nextBeat: number;
  private nextOther = 0;
  private readonly shapes: Shape[];
  private held = new Map<number, Held>();
  private readonly rit: ReturnType<typeof ritard> = { warp: (t: number) => t, unwarp: (w: number) => w };
  /** D216, KIMIKO: her clock (her-clock.ts), the game on Kimiko Ishizaka's time (no other prototype has one). */
  readonly clock: Clock | null = null;
  /** D215: the notes played right and the slips, so far (counted only; the fade went with D216). */
  hits = 0;
  slips = 0;
  /** How the player has been playing, 0 (pp) to 1 (ff): the others follow, a little. */
  private feel = 0.55;

  /**
   * D216, KIMIKO: `o.clock` puts the game on her time (her-clock.ts), in place of the steady tempo and
   * the final ritard: the windows (in ticks) at her mean tempo over the passage. Only KIMIKO takes it
   * (every other prototype keeps the steady tempo and its ritard); KIMIKO has no other voices, no band.
   */
  constructor(f: TouchFugue, voices: number | number[], from: number, proto: Proto, o: Options & { bpm: number; clock?: Clock }, chip: Chip) {
    this.f = f;
    this.proto = proto;
    this.ornaments = ornamentsOf(f);
    this.subj = new SubjectSound(f);
    this.o = o;
    this.chip = chip;
    const b = beatOf(f);
    this.beat = b.ticks;
    this.perBar = b.perBar;
    // D181: the tempo counts quarter notes, whatever the metre (in 2/2 the beat was a half note: twice as fast).
    this.tps = (f.tpq * o.bpm) / 60;
    if (o.clock && proto.id === "kimiko") (this.rit = o.clock), (this.tps = o.clock.tps), (this.clock = o.clock);
    else if (o.until === undefined || o.until >= f.length) this.rit = ritard(f.length, f.barTicks);
    // D191: how far apart two ticks sound, in ms (at this tempo, the final ritard included).
    const msBetween = (a: number, c: number) => ((this.rit.warp(c) - this.rit.warp(a)) / this.tps) * 1000;
    // D214, SUBJECT: one line, the subject's notes in every entry, whichever voice (subject-line.ts).
    const line = proto.id === "subject" ? subjectLine(f, from, o.until) : null;
    this.line = line;
    this.tracks = line ? [this.lineTrack(line, msBetween)] : (Array.isArray(voices) ? voices : [voices]).map((v) => {
      const notes = laneNotes(
        f.voices[v].filter(([on]) => on >= from && (o.until === undefined || on < o.until)),
        this.beat,
        v,
      );
      // D191: the notes too quick to strike ride after the note before.
      quickRides(notes, this.beat, msBetween);
      const mv = moves(notes, this.beat);
      return { voice: v, notes, moves: mv };
    });
    [{ voice: this.voice, notes: this.notes, moves: this.moves }] = this.tracks;
    const played = this.tracks.map((t) => t.voice);
    this.others = o.solo || proto.id === "kimiko" ? [] : line ? accompaniment(f, from, -1).filter((n) => !line.keys.has(lineKey(n.voice, n.on, n.midi)) && (o.until === undefined || n.on < o.until)) : accompaniment(f, from, played[0]).filter((n) => !played.includes(n.voice) && (o.until === undefined || n.on < o.until));
    this.shapes = phrase(this.others, this.beat, (t) => inBar(f, t), subjectMarks(f).subject);
    // Waiting (the lessons): no count-in, the clock stops at each note until it is struck.
    this.start = o.wait ? from - this.beat : countInStart(f, from);
    this.entry = from;
    this.end = (o.until ?? f.length) + this.beat;
    this.opt = options(f.tpq, this.bpm, "easy");
    // TWO VOICES: the windows a quarter wider (two lines at once).
    if (proto.id === "duo") this.opt = { ...this.opt, early: this.opt.early * 1.25, late: this.opt.late * 1.25 };
    this.anchorAt = chip.ctx.currentTime + 0.15;
    this.anchorTick = this.start;
    this.nextBeat = this.start;
    if (line) for (const e of line.entries) this.entries.push({ voice: e.voice, k: 0, on: e.on, end: e.end, ons: e.ons, state: "open" });
    else
      this.tracks.forEach((t, k) => {
        for (const e of f.entries) if (e.voice === t.voice && e.on >= from) this.entries.push({ voice: e.voice, k, on: e.on, end: e.end, ons: e.notes.map((x) => x[0]), state: "open" });
      });
    this.kb = pianoKeys(this.notes);
  }

  /** D214, SUBJECT: the subject line (its entries, their labels), or null. */
  readonly line: SubjectLine | null;
  /** D214: the line as a track: each note in its own voice; an entry's first note never rides (it is free: any lane). */
  private lineTrack(line: SubjectLine, msBetween: (a: number, c: number) => number): Track {
    const notes: LaneNote[] = line.notes.map(([on, dur, midi, step, voice]) => ({ on, dur, midi, step, long: dur >= this.beat, state: "pending", voice }));
    quickRides(notes, this.beat, msBetween);
    const heads = new Set(line.entries.map((e) => e.on));
    for (const n of notes) if (heads.has(n.on)) n.ride = false;
    return { voice: line.entries[0]?.voice ?? 0, notes, moves: moves(notes, this.beat) };
  }
  /** D214: the entry sounding now and the next to come (SUBJECT's banner and count-in). */
  entryNow(): { current: LineEntry | null; next: LineEntry | null } {
    const es = this.line?.entries ?? [];
    const j = es.findIndex((e) => e.on > this.now);
    const current = (j < 0 ? es.at(-1) : es[j - 1]) ?? null;
    return { current: current && this.now < current.end ? current : null, next: j < 0 ? null : es[j] };
  }
  /** A note's own voice (D214: SUBJECT's line moves between voices; it sounds in each one's voicing). */
  private voiceOf(k: number, i: number): number {
    return this.tracks[k].notes[i]?.voice ?? this.tracks[k].voice;
  }
  /** HIGHWAY's road and lanes: HIGHWAY, and SUBJECT on it (D214). */
  get road(): boolean {
    return this.proto.id === "highway" || this.proto.id === "subject" || this.proto.id === "kimiko";
  }

  /** The clock, with the last cadence held back (phrasing.ts ritard). */
  private tickAt(t: number) {
    return this.rit.unwarp(this.rit.warp(this.anchorTick) + (t - this.anchorAt) * this.tps);
  }
  /** The tick sounding at a time on the audio clock (D216: KIMIKO paints its road by time). */
  tickAtTime(t: number) {
    return this.tickAt(t);
  }
  /** When a tick sounds, on the audio clock. */
  timeAt(tick: number) {
    return this.anchorAt + (this.rit.warp(tick) - this.rit.warp(this.anchorTick)) / this.tps;
  }
  private tickOf(ts: number) {
    return this.tickAt(this.chip.heard() - (performance.now() - ts) / 1000);
  }

  /** One frame: the beat (or the band) and the others scheduled ahead; the window panned; notes gone by marked missed. True at the end. */
  step(): boolean {
    const ch = this.chip;
    this.now = this.tickAt(ch.heard());
    if (this.o.wait) {
      const nx = this.next();
      const on = nx >= 0 ? this.notes[nx].on : null;
      if (on !== null && on >= this.entry && this.now > on) {
        // Held at the note: time given, not the note.
        this.anchorTick = on;
        this.anchorAt = ch.heard();
        this.now = on;
      }
    }
    // D211: a phone schedules further ahead (a frame held up by the screen or the collector must not leave the others late).
    const horizon = Math.min(this.tickAt(ch.ctx.currentTime + (isPhone() ? 0.5 : 0.25)), this.end);
    while (this.nextBeat <= horizon) {
      // Beats gone by while the clock ran unwatched (a hidden tab): not played late in a burst.
      if (this.timeAt(this.nextBeat) < ch.ctx.currentTime - 0.03) {
        this.nextBeat += this.beat;
        continue;
      }
      // The beat's place in its bar, by the bars as written (D184: counted from the count-in, a bar of
      // three put the downbeat on its last beat).
      const n = Math.round((this.nextBeat - this.start) / this.beat);
      const inBarBeat = Math.round(inBar(this.f, this.nextBeat) / this.beat) % this.perBar;
      const accent = inBarBeat === 0;
      // D177: past the count-in, a band's rhythm section plays the beat instead of the click.
      const compound = this.beat !== this.f.tpq * (4 / Number(this.f.meter.split("/")[1]));
      if (this.o.wait) {
        this.nextBeat += this.beat;
        continue;
      }
      // The beat's length as it sounds (D191: the final ritard included, the drums' off-beats with it).
      const beatS = this.timeAt(this.nextBeat + this.beat) - this.timeAt(this.nextBeat);
      // D216, KIMIKO: her recording alone keeps the time: no band, no click past a quiet count-in.
      const kimiko = this.proto.id === "kimiko";
      if (kimiko && this.nextBeat >= this.entry) {
        this.nextBeat += this.beat;
        continue;
      }
      const band = this.nextBeat >= this.entry && !this.o.solo && !kimiko && ch.groove?.(this.timeAt(this.nextBeat), beatS, inBarBeat, Math.floor(n / this.perBar), this.perBar, compound, this.mult - 1);
      if (!band) ch.tick(this.timeAt(this.nextBeat), accent, this.nextBeat < this.entry ? (kimiko ? 0.05 : 0.12) : 0.02);
      this.nextBeat += this.beat;
    }
    while (this.nextOther < this.others.length && this.others[this.nextOther].on <= horizon) {
      const n = this.others[this.nextOther++];
      if (n.on < this.now - this.beat) continue;
      const sh = this.shapes[this.nextOther - 1];
      const len = this.timeAt(n.on + n.dur * sh.hold) - this.timeAt(n.on);
      const at = Math.max(ch.ctx.currentTime, this.timeAt(n.on) + sh.nudge);
      // D213: the subject brighter and crisper, the others duller during an entry; the fugue's effect on the subject.
      const sv = this.subj.shape(n.voice, n.on, voicing(n.voice, this.f.voices.length, false));
      const vv = sv.v;
      const prev = this.lastOther.get(n.voice);
      this.lastOther.set(n.voice, n.midi);
      // D205: an ornamented note sounds its ornament (its parts on the audio clock), its main note last.
      const orn = this.ornaments.get(`${n.voice}:${n.on}`);
      const parts = orn ? realiseNote(this.f, orn, n.on, n.dur * sh.hold, n.midi, prev, this.bpm) : [[n.on, 0, n.midi] as [number, number, number]];
      for (const [pon, pdur, pmidi] of parts) {
        const pat = orn ? Math.max(ch.ctx.currentTime, this.timeAt(pon) + sh.nudge) : at;
        const plen = orn ? this.timeAt(pon + pdur) - this.timeAt(pon) : len;
        const sd = ch.note(pmidi, pat, plen, vv, { ...sv.play, level: follow(sh, this.feel) * (sv.play.level ?? 1) });
        if (sd) this.band.push({ sd, until: pat + plen + 0.6 });
      }
      for (const sd of this.subj.layers(ch, sv.sn, n.midi, at, len, vv, follow(sh, this.feel))) this.band.push({ sd, until: at + len + 0.8 });
    }
    if (this.band.length > 64) this.band = this.band.filter((b) => b.until > ch.ctx.currentTime);
    this.sounding();
    // Notes gone by unplayed: missed, a frame's grace late (D191: a tap at the window's very end,
    // handled after the frame, was refused); each one missed (a chord once) a slip.
    const grace = SWEEP_GRACE_S * this.tps;
    let missed = 0;
    for (const t of this.tracks) {
      const ons = new Set<number>();
      for (const n of t.notes) if (n.state === "pending" && !n.ride && this.now - grace > n.on + this.opt.late) ons.add(n.on);
      if (!ons.size) continue;
      sweep(t.notes, this.now - grace, this.opt);
      missed += ons.size;
    }
    if (missed) {
      this.combo = 0;
      for (let s = 0; s < missed; s++) this.slip();
      this.grade = { text: "MISS", at: performance.now() };
    }
    this.judgeEntries();
    this.judgeCadences();
    this.sustain();
    // D198: the crowd lost: the run ends here (not in the lessons, nor with NO FAIL).
    if (this.o.fail && this.crowd <= 0 && this.failedAt === null) {
      this.failedAt = this.now;
      this.stopAll();
      return true;
    }
    ch.zone?.(this.zone);
    if (this.now > this.end) {
      this.stopAll();
      return true;
    }
    return false;
  }

  countIn(): number {
    return this.now < this.entry ? Math.ceil((this.entry - this.now) / this.beat) : 0;
  }

  keyNow(): string {
    return keyAt(this.f, this.now);
  }

  /** The next note to play (index) in a voice (the first by default), if any. */
  next(k = 0): number {
    const notes = this.tracks[k].notes;
    return notes.findIndex((n, i) => n.state === "pending" && !n.ride && n.on >= this.now - this.opt.late && !(i > 0 && notes[i - 1].on === n.on));
  }

  /** The voice a thumb plays. */
  private trackOf(side: Side): number {
    return this.tracks.length > 1 && side === "right" ? 1 : 0;
  }

  heldSides(): { side: Side; y: number }[] {
    return [...this.held.values()].map((h) => ({ side: h.side, y: h.ay }));
  }

  /** The places held now (columns, keys, rows). */
  heldCells(): number[] {
    return [...this.held.values()].flatMap((h) => (h.cell === undefined ? [] : [h.cell]));
  }

  holding(i: number, k = 0): boolean {
    for (const h of this.held.values()) if (h.k === k && h.chord.includes(i)) return true;
    return false;
  }

  /** The place under a touch: LADDER a row (a staff step), the PIANO a key. */
  cellAt(c: Contact): number | undefined {
    if (this.proto.id === "piano") return pianoKey(this.kb, c.x / c.w, c.y / c.h);
    if (this.proto.id === "ladder" && this.rows) return this.rows.stepAt(c.y);
    if (this.road) return this.laneOfX(c.x, c.w);
    return undefined;
  }

  /** The dynamic of a touch, 0 (pp) to 1 (ff). */
  dynamicAt(c: Contact): number {
    if (this.proto.layout === "bars") return barDynamic(c.x, c.w);
    return 0.55;
  }

  /** The note struck before note i (the top of its chord; D191: the riding notes passed over), in a voice. */
  private before(i: number, k = 0): number {
    const notes = this.tracks[k].notes;
    let j = i - 1;
    while (j >= 0 && (notes[j].on === notes[i].on || notes[j].ride)) j--;
    return j;
  }

  /** Judges a touch or a key on note i: right, or what to sound instead. */
  private verdict(i: number, at: { c?: Contact; key?: KeyPress }, k = 0): Verdict {
    const { notes, moves } = this.tracks[k];
    const n = notes[i];
    const chord = chordOf(notes, i).map((j) => notes[j]);
    const prev = this.before(i, k);
    const m = moves[i];
    const asked = (steps: number) => (prev >= 0 ? stepPitch(notes[prev].step + steps, notes[prev]) : undefined);
    // TWO VOICES: the time only. EASY: the time, or (D187) the way along the keys too.
    if (this.proto.id === "duo") return { ok: true };
    if (this.proto.id === "keys") {
      const lvl = this.o.easy ?? "timing";
      const code = at.key?.code;
      if (lvl === "timing" || !code || this.isFree(i, k)) return { ok: true };
      // D208, EXACT LANES: the planned lane's key (in any row: the rows give the dynamic), or for a repeat the space bar.
      if (lvl === "exact") {
        if (code === "Space") return m.dir === 0 || m.steps === 0 ? { ok: true } : { ok: false, wrong: asked(0), why: "gesture" };
        return keyPlace(code)?.col === this.lanes[i] ? { ok: true } : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
      }
      if (!this.lastKey) return { ok: true };
      return contourOk(m, this.lastKey, code, lvl === "leaps") ? { ok: true } : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
    }
    if (at.key?.midi !== undefined) {
      const k = at.key.midi;
      const ok = this.proto.id === "piano" ? chord.some((x) => x.midi === k) : chord.some((x) => Math.abs(stepNear(k, x) - x.step) <= 1);
      return ok ? { ok } : { ok, wrong: k, why: "gesture" };
    }
    if (at.key?.move) {
      const mv = at.key.move;
      if (m.size < 0) return { ok: true };
      // A third takes the step or the leap (D184).
      const ok = mv.dir === m.dir && (m.dir === 0 || m.size === 2 || mv.big === m.size >= 3);
      return ok ? { ok } : { ok, wrong: asked(mv.dir * (mv.big ? 3 : 1)), why: "gesture" };
    }
    const c = at.c!;
    switch (this.proto.id) {
      case "ladder": {
        // D181: forgiving. A broad area round where the note is drawn (LADDER_AREA rows either side);
        // within it, the way the tune goes from the touch before: firm for the same thumb, lenient
        // between the two (two thumbs far apart never land quite level).
        if (!this.rows) return { ok: true };
        const R = this.rows.rowH;
        const asked = stepPitch(this.rows.stepAt(c.y), n);
        const near = Math.min(...chord.map((x) => Math.abs(c.y - this.rows!.yOf(x.step))));
        if (near > LADDER_AREA * R) return { ok: false, wrong: asked, why: "gesture" };
        const last = this.lastTouch;
        if (!last || m.size < 0) return { ok: true };
        const same = last.side === c.side;
        const up = last.y - c.y;
        let ok: boolean;
        // D208, more forgiving still: a repeat (or the same staff step altered, E flat to E natural)
        // about level; a move, the same thumb not the wrong way (a leap a row at least), the other
        // thumb anywhere short of clearly the wrong way.
        if (m.dir === 0 || m.steps === 0) ok = Math.abs(up) <= (same ? 2 : 3.5) * R;
        else {
          const way = up * m.dir;
          ok = same ? way >= 0 && (m.size < 3 || way >= R) : way >= -2.5 * R;
        }
        return ok ? { ok } : { ok, wrong: asked, why: "gesture" };
      }
      case "piano": {
        const key = pianoKey(this.kb, c.x / c.w, c.y / c.h);
        return chord.some((x) => x.midi === key) ? { ok: true } : { ok: false, wrong: key, why: "gesture" };
      }
      case "arrows":
        // A click, not a key: the time only.
        return { ok: true };
      case "highway":
      case "kimiko":
      case "subject": {
        // D207: EASY on a phone: the lane tapped, judged as the keys are (D187), by lanes.
        const lvl = this.o.easy ?? "timing";
        if (lvl === "timing" || this.isFree(i, k)) return { ok: true };
        if (lvl === "exact") return this.laneOfX(c.x, c.w) === this.lanes[i] ? { ok: true } : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
        if (this.lastLane < 0) return { ok: true };
        return laneOk(m, this.lastLane, this.laneOfX(c.x, c.w), lvl === "leaps", this.laneCount) ? { ok: true } : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
      }
    }
  }

  /** D207, HIGHWAY: the lane a tap falls in, and the lane tapped last (-1: none yet). */
  lastLane = -1;
  laneOfX(x: number, w: number): number {
    return Math.max(0, Math.min(this.laneCount - 1, Math.floor((x / Math.max(1, w)) * this.laneCount)));
  }
  get laneCount(): number {
    return this.road ? 5 : HOME_LANES;
  }
  /** The lanes under the fingers now (HIGHWAY), and how far down each finger is (px; for the two rows of pads). */
  get heldLanes(): number[] {
    return [...this.held.values()].map((h) => h.cell ?? this.laneOfX(h.x0, this.touchW));
  }
  get heldPads(): { lane: number; y: number }[] {
    return [...this.held.values()].map((h) => ({ lane: h.cell ?? this.laneOfX(h.x0, this.touchW), y: h.trail.at(-1)?.y ?? h.ay }));
  }
  private touchW = 1;



  down(id: number, c: Contact, ts: number) {
    if (this.held.has(id)) this.up(id, ts);
    const d = this.dynamicAt(c);
    const h: Held = { side: c.side, k: this.trackOf(c.side), x0: c.x, ax: c.x, ay: c.y, note: -1, chord: [], sounds: [], midi: 0, cell: this.cellAt(c), d0: d, trail: [{ t: ts, y: c.y }] };
    this.held.set(id, h);
    this.strikeWith(id, h, ts, { c }, d);
    // HIGHWAY: where the hand is now.
    if (this.road) (this.lastLane = this.laneOfX(c.x, c.w)), (this.touchW = c.w);
  }

  /** A computer key or a MIDI key goes down. */
  keyDown(id: number, k: KeyPress, ts: number) {
    // The same key again without its release (lost while the window was away): let the first go.
    if (this.held.has(id)) this.up(id, ts);
    const d = k.velocity ?? 0.6;
    const struck = k.code;
    const h: Held = { side: k.side ?? "left", k: this.trackOf(k.side ?? "left"), x0: 0, ax: 0, ay: 0, note: -1, chord: [], sounds: [], midi: 0, cell: k.midi, d0: d, trail: [] };
    this.held.set(id, h);
    this.strikeWith(id, h, ts, { key: k }, d);
    // Where the hand is now: the next key is judged from it.
    if (struck) this.lastKey = struck;
  }

  /** EASY's DIRECTION: the key struck last. */
  lastKey: string | null = null;
  /** A note the hand may take anywhere: the first, or after a rest or a long note (D187). */
  isFree(i: number, k = 0): boolean {
    // D214: an entry's first note starts a new contour.
    if (this.line && this.entries.some((e) => e.on === this.tracks[k].notes[i]?.on)) return true;
    const j = this.before(i, k);
    if (j < 0) return true;
    const notes = this.tracks[k].notes;
    const p = notes[j];
    return p.dur >= this.beat || notes[i].on - (p.on + p.dur) >= this.beat / 4;
  }
  /** What the box draws over each note in DIRECTION (none in TIMING). */
  get cues(): Arrow[] | undefined {
    const lvl = this.o.easy ?? "timing";
    if (this.proto.id !== "keys" || lvl === "timing") return undefined;
    return (this.cuesMemo ??= this.notes.map((_, i) => contourCue(this.moves[i], this.isFree(i), lvl === "leaps")));
  }
  private cuesMemo?: Arrow[];

  keyUp(id: number, ts: number) {
    this.up(id, ts);
  }

  private trillNext = false;
  private strikeWith(id: number, h: Held, ts: number, at: { c?: Contact; key?: KeyPress }, d: number) {
    this.trillNext = !!at.key?.trill;
    const notesK = this.tracks[h.k].notes;
    const tk = this.tickOf(ts);
    // A pitched key (PIANO, MIDI): the note of that pitch in the window first, else the nearest in time
    // (D184: a right key a little late took the next note, and both were lost).
    const key = at.key?.midi;
    let i = key !== undefined ? strike(notesK, tk, this.opt, (j) => chordOf(notesK, j).some((x) => notesK[x].midi === key)) : -1;
    if (i < 0) i = strike(notesK, tk, this.opt);
    // D191: a strike on a note that rides (the player striking it anyway) is no slip; it is played for them.
    if (i < 0 && notesK.some((n) => n.ride && Math.abs(n.on - tk) <= Math.max(this.opt.early, this.opt.late))) return;
    if (i < 0) {
      this.grade = { text: "✕", at: performance.now(), side: h.side, why: "time" };
      // A strike on no note is a slip, and counts against the accuracy (mashing scores nothing).
      this.stray++;
      this.combo = 0;
      this.slip();
      // A keyboard: the key struck is heard all the same. Elsewhere (Hi-Fi Rush: every touch makes
      // music) the voice's nearest note sounds, soft and muffled, and is not used up.
      let key = at.key?.midi ?? (this.proto.id === "piano" ? h.cell : undefined);
      let muffled = false;
      let nearV: number | undefined;
      if (key === undefined) {
        const t = this.tickOf(ts);
        const near = this.tracks[h.k].notes.filter((n) => Math.abs(n.on - t) < this.beat).sort((a, b) => Math.abs(a.on - t) - Math.abs(b.on - t))[0];
        if (near) (key = near.midi), (muffled = true), (nearV = near.voice);
      }
      if (key !== undefined) {
        h.midi = key;
        h.sounds = [this.chip.note(key, this.chip.ctx.currentTime, HOLD_MAX, voicing(nearV ?? this.tracks[h.k].voice, this.f.voices.length, true), { ...dynamic(muffled ? d * 0.5 : d), lead: true, muffleable: muffled, envelope: this.proto.id === "piano" ? "piano" : "synth" })];
        if (muffled) h.sounds[0].muffle?.();
      }
      return;
    }
    let v = this.verdict(i, at, h.k);
    this.play(id, h, i, v, false, d);
  }

  move(id: number, c: Contact, ts: number) {
    const h = this.held.get(id);
    if (!h) return;
    // The thumb is the one that went down (D184: slides were all judged as the left's).
    c = { ...c, side: h.side };
    h.trail.push({ t: ts, y: c.y });
    while (h.trail.length > 2 && ts - h.trail[0].t > 120) h.trail.shift();
    // Across the dynamic axis while it sounds: a swell or a diminuendo.
    const d = this.dynamicAt(c);
    for (const s of h.sounds) s.dyn?.(levelOf(d) / levelOf(h.d0));
    const t = this.tickOf(ts);
    if (h.passive) return;
    if (this.proto.id === "ladder" && this.rows) {
      // D208: a slide plays on only after a deliberate travel (a row and a half from where it last
      // played): a thumb's contact point wanders a row or so as it rolls and lifts, and that wander
      // took the next note from the other thumb (the overlap legato lost its notes as slips).
      if (Math.abs(c.y - h.ay) < this.rows.rowH * 1.5) return;
      this.slideTo(id, h, c, t);
    } else if (this.road) {
      // D208: a held thumb slid into another lane plays the next note there, joined (legato): only
      // once it has crossed most of a lane's width, so a rolling thumb does not slide by itself.
      const lane = this.laneOfX(c.x, c.w);
      if (lane === h.cell || Math.abs(c.x - h.ax) < (c.w / this.laneCount) * 0.75) return;
      h.cell = lane;
      h.ax = c.x;
      if (this.slideTo(id, h, c, t)) this.lastLane = lane;
    } else if (this.proto.id === "piano") {
      // Only the thumb's own travel counts.
      const unit = c.w / this.kb.whites / 2;
      if (Math.abs(c.x - h.ax) < unit * 0.6) return;
      const cell = this.cellAt(c);
      if (cell === h.cell) return;
      h.cell = cell;
      h.ax = c.x;
      this.slideTo(id, h, c, t);
    }
  }

  /** A held thumb reaches another place: the next note there, if it is there and due. */
  private slideTo(id: number, h: Held, c: Contact, t: number): boolean {
    // D208: only onto the next note still to play, and not before its time is near (half the early window).
    const notes = this.tracks[h.k].notes;
    const next = notes.findIndex((n) => n.state === "pending" && !n.ride);
    if (next < 0 || t < notes[next].on - this.opt.early / 2) return false;
    const i = strike(notes, t, this.opt, (j) => chordOf(notes, next).includes(j) && !h.chord.includes(j) && this.verdict(j, { c }, h.k).ok);
    if (i < 0) return false;
    h.ay = c.y;
    this.play(id, h, i, { ok: true }, true, this.dynamicAt(c));
    return true;
  }

  up(id: number, ts: number) {
    const h = this.held.get(id);
    if (!h) return;
    this.held.delete(id);
    // Flicked upwards as it let go: the swoosh.
    const tr = h.trail;
    if (h.sounds.length && tr.length >= 2) {
      const a = tr[0];
      const b = tr[tr.length - 1];
      const dy = b.y - a.y;
      const dt = Math.max(1, b.t - a.t);
      if (-dy >= SWOOSH_PX && -dy / dt >= SWOOSH_V) {
        for (const sd of h.sounds) sd.stop(this.chip.ctx.currentTime + 0.02);
        this.chip.swoosh(h.midi, voicing(h.note >= 0 ? this.voiceOf(h.k, h.note) : this.tracks[h.k].voice, this.f.voices.length, true), levelOf(h.d0));
        return;
      }
    }
    if (this.pedalDown) this.pedalled.push(...h.sounds, ...(h.fx ?? []));
    else for (const sd of [...h.sounds, ...(h.fx ?? [])]) sd.stop();
  }

  /** Sounds note i (or what was asked for instead, muffled) and grades it. A slide glides on; the piano strikes again. */
  private play(id: number, h: Held, i: number, v: Verdict, slide: boolean, d: number) {
    const notes = this.tracks[h.k].notes;
    const voiceV = voicing(this.voiceOf(h.k, i), this.f.voices.length, true);
    const piano = this.proto.id === "piano";
    const chord = chordOf(notes, i);
    const fuoco = this.streak >= FUOCO_NOTES;
    const base = dynamic(d);
    let expr: Play = { ...base, trill: this.trillNext, bright: (base.bright ?? 0) + (fuoco ? 0.35 : 0), muffleable: true, lead: true, pleno: v.ok && this.pleno, envelope: piano ? "piano" : "synth" };
    // D213: the player's voice as the others: its subject brighter (and its effect), duller during another's entry.
    const sv = v.ok ? this.subj.shape(this.voiceOf(h.k, i), notes[i].on, voiceV) : null;
    if (sv) expr = { ...expr, ...sv.play, level: (expr.level ?? 1) * (sv.play.level ?? 1) };
    const pitches = v.ok || v.wrong === undefined ? chord.map((j) => notes[j].midi) : [v.wrong];
    // D213: the subject's effect under the note (the note's own sound below, its last made).
    for (const sd of h.fx ?? []) sd.stop();
    const n1 = notes[i];
    h.fx = sv ? this.subj.layers(this.chip, sv.sn, pitches[0], this.chip.ctx.currentTime, this.timeAt(n1.on + n1.dur) - this.timeAt(n1.on), sv.v, expr.level ?? 1) : [];
    if (slide && !piano && h.sounds.length === 1 && pitches.length === 1) {
      h.sounds[0].glide?.(pitches[0]);
    } else {
      for (const sd of h.sounds) sd.stop();
      // Joined to the note the other thumb still holds: that one gives way.
      let legato = slide;
      for (const [hid, o] of this.held) {
        if (hid === id || o.k !== h.k) continue;
        o.passive = true;
        if (!o.sounds.length) continue;
        legato = true;
        for (const sd of o.sounds) sd.stop(this.chip.ctx.currentTime + 0.03);
        o.sounds = [];
      }
      // D205: an ornamented note, struck right, plays its ornament from the moment it is struck, then holds its main note.
      const n0 = notes[i];
      const orn = v.ok && pitches.length === 1 ? this.ornaments.get(`${this.voiceOf(h.k, i)}:${n0.on}`) : undefined;
      if (orn) {
        const t0 = this.chip.ctx.currentTime;
        const prev = this.before(i, h.k);
        const parts = realiseNote(this.f, orn, n0.on, n0.dur, n0.midi, prev >= 0 ? notes[prev].midi : undefined, this.bpm);
        h.sounds = parts.map(([pon, pdur, pmidi], k) => {
          const at = t0 + (this.timeAt(pon) - this.timeAt(n0.on));
          const last = k === parts.length - 1;
          return this.chip.note(pmidi, at, last ? HOLD_MAX : this.timeAt(pon + pdur) - this.timeAt(pon), sv?.v ?? voiceV, { ...expr, legato: k > 0 || (legato && !piano) });
        });
      } else h.sounds = pitches.map((m) => this.chip.note(m, this.chip.ctx.currentTime, HOLD_MAX, sv?.v ?? voiceV, { ...expr, legato: legato && !piano }));
      if (!v.ok && !(piano && v.wrong !== undefined)) for (const sd of h.sounds) sd.muffle?.();
    }
    // A touch on the screen (not a key) is the next note's reference.
    if (h.trail.length) this.lastTouch = { side: h.side, y: h.ay };
    h.midi = pitches[0];
    h.note = i;
    h.chord = chord;
    h.d0 = d;
    const n = notes[i];
    const at = performance.now();
    this.marks.push({ tick: this.now, step: v.ok || v.wrong === undefined ? n.step : stepNear(v.wrong, n), ok: v.ok });
    if (this.marks.length > 400) this.marks.splice(0, 100);
    if (!v.ok) {
      for (const j of chord) Object.assign(notes[j], { state: "miss", wrong: true });
      this.combo = 0;
      this.slip();
      this.grade = { text: "✕", at, side: h.side, why: v.why ?? "gesture" };
      return;
    }
    this.feel += (d - this.feel) * 0.25;
    // As heard (D191: the final ritard included; the steady tempo made PERFECT up to 22% wider there).
    const offMs = (this.timeAt(n.at ?? n.on) - this.timeAt(n.on)) * 1000;
    const perfect = Math.abs(offMs) <= PERFECT_MS;
    this.combo++;
    this.hits++;
    this.streak++;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    // D198: the crowd warms; a long run called out, every fifty.
    this.crowd = Math.min(1, this.crowd + (perfect ? 0.025 : 0.015));
    this.flames.push({ i, at });
    if (this.flames.length > 24) this.flames.splice(0, 12);
    if (this.streak % 50 === 0) this.banner = { text: `${this.streak} NOTE STREAK!`, at };
    if (this.streak % STEP_NOTES === 0 && this.mult < 4) this.mult++;
    if (this.streak === FUOCO_NOTES) this.banner = { text: "CON FUOCO!", at };
    h.pts = (perfect ? 2 : 1) * this.mult * (this.pleno ? 2 : 1);
    this.score += h.pts;
    // D186: the points rise from the note.
    this.pops.push({ tick: n.on, step: Math.max(...chord.map((j) => notes[j].step)), text: `+${h.pts}`, at, gold: perfect });
    if (this.pops.length > 40) this.pops.splice(0, 20);
    this.grade = perfect ? { text: "PERFECT", at, side: h.side } : { text: "GOOD", lean: offMs < 0 ? -1 : 1, at, side: h.side };
    this.ride(h, i, offMs / 1000);
  }

  /**
   * D191: the notes riding after note i (too quick to strike) are played for the player: each at its
   * time, moved by as much as note i was early or late, the note struck giving way to the first.
   */
  private ride(h: Held, i: number, offS: number) {
    const notes = this.tracks[h.k].notes;
    let j = i + 1;
    while (j < notes.length && notes[j].on === notes[i].on) j++;
    const ch = this.chip;
    let first = true;
    for (; j < notes.length && notes[j].ride; j++) {
      const n = notes[j];
      if (n.state !== "pending") continue;
      const at = Math.max(ch.ctx.currentTime, this.timeAt(n.on) + offS);
      const len = Math.max(0.03, this.timeAt(n.on + n.dur) - this.timeAt(n.on));
      if (first) for (const sd of h.sounds) sd.stop(at);
      first = false;
      const nv = n.voice ?? this.tracks[h.k].voice;
      const sv = this.subj.shape(nv, n.on, voicing(nv, this.f.voices.length, true));
      const sd = ch.note(n.midi, at, len, sv.v, { ...sv.play, lead: true, envelope: this.proto.id === "piano" ? "piano" : "synth" });
      if (sd) this.band.push({ sd, until: at + len + 0.6 });
      for (const x of this.subj.layers(ch, sv.sn, n.midi, at, len, sv.v, sv.play.level ?? 1)) this.band.push({ sd: x, until: at + len + 0.8 });
      this.riders.push({ k: h.k, j, at });
    }
  }

  /** D191: the riding notes played for the player, shown as they sound. */
  private riders: { k: number; j: number; at: number }[] = [];
  private sounding() {
    if (!this.riders.length) return;
    const t = this.chip.ctx.currentTime;
    this.riders = this.riders.filter((r) => {
      if (r.at > t) return true;
      const n = this.tracks[r.k].notes[r.j];
      if (n.state === "pending") Object.assign(n, { state: "hit", at: n.on });
      return false;
    });
  }



  /** A slip: the multiplier a step down, the run (and CON FUOCO) ended. */
  private slip() {
    this.slips++;
    this.crowd = Math.max(0, this.crowd - 0.045);
    if (this.streak >= FUOCO_NOTES) this.banner = null;
    this.streak = 0;
    this.mult = Math.max(1, this.mult - 1);
  }

  /** The entries of the subject in the voices played: captured once every note of one is played right; lost at a slip. */
  private judgeEntries() {
    for (const e of this.entries) {
      if (e.state !== "open") continue;
      // D191: the riding notes are not the player's to capture.
      const notes = this.tracks[e.k].notes.filter((n) => !n.ride && e.ons.includes(n.on));
      if (notes.some((n) => n.state === "miss")) {
        e.state = "lost";
        if (this.isBoss(e)) this.banner = { text: "THE BOSS GOT AWAY", at: performance.now() };
        continue;
      }
      if (notes.length && notes.every((n) => n.state === "hit")) {
        e.state = "captured";
        this.score += 20 * this.mult;
        // D186: it bursts; the voice's last entry is its BOSS.
        const boss = this.isBoss(e);
        this.bursts.push({ at: performance.now(), points: notes.map((n) => ({ tick: n.on, step: n.step })), boss });
        if (this.bursts.length > 8) this.bursts.shift();
        // ORGANO PLENO until the next entry, in any voice.
        // (the first entry still to come: the next has often begun before this one ends)
        const next = this.f.entries.map((x) => x.on).filter((on) => on > this.now).sort((a, b) => a - b)[0];
        this.plenoUntil = next ?? this.f.length;
        this.banner = { text: boss ? "BOSS DEFEATED!" : "ORGANO PLENO!", at: performance.now() };
      }
    }
  }

  /**
   * D194: a cadence reached while the player's run holds (no slip since the last one) is a small
   * bonus, named: the music's own punctuation, rewarded.
   */
  private cadenceAt = 0;
  private judgeCadences() {
    const cads = this.f.cadences ?? [];
    while (this.cadenceAt < cads.length && cads[this.cadenceAt].on <= this.now) {
      const c = cads[this.cadenceAt++];
      if (c.on < this.entry || c.on > this.end || this.streak < 4) continue;
      this.score += 10 * this.mult;
      this.banner = { text: cadenceName(c), at: performance.now() };
    }
  }

  /**
   * D198, after Guitar Hero: the crowd (0 to 1, from a half: a right note warms it, a slip cools it;
   * empty, the run fails); the hits' flames; the sustain (a long note held after it is struck scores
   * as it sounds, a point a beat at the multiplier); the run's stars.
   */
  crowd = 0.6;
  failedAt: number | null = null;
  readonly flames: { i: number; at: number }[] = [];
  private sustainAt = 0;
  private sustainAcc = 0;
  private sustain() {
    const dt = this.now - this.sustainAt;
    this.sustainAt = this.now;
    if (dt <= 0 || dt > this.beat) return;
    for (const h of this.held.values()) {
      if (h.note < 0 || !h.sounds.length) continue;
      const n = this.tracks[h.k].notes[h.note];
      if (n.state !== "hit" || n.dur < this.beat || this.now >= n.on + n.dur || this.now < n.on) continue;
      n.held = true;
      this.sustainAcc += (dt / this.beat) * this.mult * (this.pleno ? 2 : 1);
    }
    const whole = Math.floor(this.sustainAcc);
    if (whole > 0) (this.score += whole), (this.sustainAcc -= whole);
  }
  /** The tempo, quarter notes a minute. */
  get bpm(): number {
    return (this.tps * 60) / this.f.tpq;
  }
  /** One to five stars: the score against two points a note (all PERFECT at ×1). */
  starsOf(score: number, of: number): number {
    const ratio = score / Math.max(1, 2 * of);
    return ratio >= 4.5 ? 5 : ratio >= 3 ? 4 : ratio >= 2 ? 3 : ratio >= 1 ? 2 : 1;
  }
  /**
   * HIGHWAY's lanes (D198; D208): the lane each note comes down, a fingering of the line planned over
   * the whole passage (protos.ts planLanes): on a computer the nine home-row keys, no finger twice
   * running; on a phone five lanes.
   */
  get lanes(): number[] {
    if (this.lanesMemo) return this.lanesMemo;
    const notes = this.notes;
    const heads = notes.map((n, i) => !n.ride && !(i > 0 && notes[i - 1].on === n.on));
    const free = notes.map((_, i) => this.isFree(i));
    this.lanesMemo = planLanes(this.moves, heads, free, this.laneCount, this.proto.id === "keys");
    return this.lanesMemo;
  }
  private lanesMemo?: number[];

  /** D213: the subject's sound (the cues, the fugue's effect, the LAB switches as the game began). */
  readonly subj: SubjectSound;
  /** D205: the piece's ornaments ("voice:onset"), and each other voice's last note (for the snapped trill). */
  readonly ornaments: Map<string, Ornament>;
  private lastOther = new Map<number, number>();

  /** D186: what the box draws of the player's playing: points, bursts, the zone. */
  readonly pops: Pop[] = [];
  readonly bursts: Burst[] = [];
  get zone(): "pleno" | "fuoco" | null {
    return this.streak >= FUOCO_NOTES ? "fuoco" : this.pleno ? "pleno" : null;
  }
  /** The voice's last entry (D208: no bosses in LADDER for now). */
  private isBoss(e: { voice: number; on: number }) {
    if (this.proto.id === "ladder") return false;
    return e.on === Math.max(...this.entries.filter((x) => x.voice === e.voice).map((x) => x.on));
  }

  /** The grade, after osu! and the like: S (95% and every entry captured), A, B, C, D. */
  gradeOf(r: { right: number; of: number; stray?: number }): string {
    // A stray strike weighs half a note.
    const acc = r.right / Math.max(1, r.of + (r.stray ?? 0) / 2);
    const all = this.entries.every((e) => e.state === "captured");
    return acc >= 0.95 && all ? "S" : acc >= 0.9 ? "A" : acc >= 0.8 ? "B" : acc >= 0.7 ? "C" : "D";
  }

  /** EASY (computer): the pedal down or up (up: what rang on stops). */
  pedal(down: boolean) {
    this.pedalDown = down;
    if (!down) {
      for (const sd of this.pedalled) sd.stop();
      this.pedalled = [];
    }
  }
  get pedalOn() {
    return this.pedalDown;
  }

  /** EASY (computer): Space flings the note sounding now off, with the swoosh. */
  swooshNow() {
    for (const h of [...this.held.values()].reverse()) {
      if (!h.sounds.length) continue;
      for (const sd of h.sounds) sd.stop(this.chip.ctx.currentTime + 0.02);
      h.sounds = [];
      this.chip.swoosh(h.midi, voicing(this.tracks[h.k].voice, this.f.voices.length, true), levelOf(h.d0));
      return;
    }
  }

  /** EASY (computer): the held notes bent (cents). */
  bendHeld(cents: number) {
    for (const h of this.held.values()) for (const sd of h.sounds) sd.bend(cents);
  }

  /** The window lost (blur, a hidden tab): every key and the pedal let go, as if released now. */
  releaseAll(ts: number) {
    for (const id of [...this.held.keys()]) this.up(id, ts);
    this.pedal(false);
    this.keysDown.clear();
  }

  /** The others' notes sounding or to sound (stopped on quitting; D184). */
  private band: { sd: Sounding; until: number }[] = [];

  stopAll() {
    this.chip.zone?.(null);
    for (const b of this.band) b.sd.stop();
    this.band = [];
    for (const sd of this.pedalled) sd.stop();
    this.pedalled = [];
    for (const h of this.held.values()) for (const sd of [...h.sounds, ...(h.fx ?? [])]) sd.stop();
    this.held.clear();
  }

  /** The notes (a chord once): played right, played wrong, missed; the score, the entries captured. */
  /** Strikes on no note. */
  stray = 0;
  results(): { right: number; wrong: number; missed: number; stray: number; of: number; score: number; grade: string; captured: number; entries: number; maxStreak: number; stars: number; failedBar: number | null } {
    const r = { right: 0, wrong: 0, missed: 0, stray: this.stray, of: 0, score: this.score, grade: "", captured: this.entries.filter((e) => e.state === "captured").length, entries: this.entries.length, maxStreak: this.maxStreak };
    for (const { notes } of this.tracks)
      notes.forEach((n, i) => {
        // D191: the riding notes are not counted.
        if ((i > 0 && notes[i - 1].on === n.on) || n.ride) return;
        // A failed run: only the notes before the end count.
        if (this.failedAt !== null && n.on > this.failedAt) return;
        r.of++;
        if (n.state === "hit") r.right++;
        else if (n.wrong) r.wrong++;
        else r.missed++;
      });
    r.grade = this.gradeOf(r);
    return { ...r, stars: this.failedAt !== null ? 0 : this.starsOf(r.score, r.of), failedBar: this.failedAt !== null ? barAt(this.f, this.failedAt) : null };
  }
}
