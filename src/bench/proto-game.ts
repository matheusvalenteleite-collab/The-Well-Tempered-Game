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
import { isPhone, voicing, type Chip, type Gate, type Play, type Sounding } from "../touch/chip.ts";
import type { Grade } from "../touch/engine.ts";
import { barAt, beatOf, cadenceName, countInStart, inBar, keyAt, type TouchFugue } from "../touch/fugue.ts";
import { echoHalves, repeatHalves } from "./echo.ts";
/** D247: the smallest row (CSS px) LADDER judges a touch by (the voice's range filled rows of about 18 to 24). */
export const LADDER_ROW_MIN = 18;
import { chordOf, laneNotes, options, preludeRides, quickRides, release, strike, sweep, type LaneNote, type LaneOptions } from "../touch/lanes.ts";
import type { Keyboard } from "../touch/piano.ts";
import { follow, phrase, ritard, withSpeed, type Shape } from "../touch/phrasing.ts";
import { arcOf, handsAt, liftAt, lineAt, pedalSpans, stepAt, type Arc } from "./arc.ts";
import { PATCHES } from "../touch/sound.ts";
import type { Side } from "../touch/thumbs.ts";
import { accompaniment, subjectMarks, type OtherNote } from "../touch/voice-mode.ts";
import { SubjectSound } from "../touch/subject-fx.ts";
import { pianoKey, pianoKeys } from "./placed.ts";
import type { Clock } from "./her-clock.ts";
import type { ArtFlash, ArtStats } from "./articulation.ts";
import { CLEAN_INK, HELD_INK, holdBonus, LEGATO_GAP_MS, LEGATO_INK, legatoBonus, releaseVerdict, restAfter } from "./articulation.ts";
import { scaleFits, scaleKeys, keyPitch, SCALE_LANES, type ScaleKey } from "./scale-keys.ts";
import { preludeRideMs } from "./tiers.ts";
import { lineKey, subjectLine, type LineEntry, type Stretto, type SubjectLine } from "./subject-line.ts";
import { barDynamic, contourCue, contourOk, dynamic, HOME_LANES, keyPlace, LADDER_AREA, planLanes, levelOf, moves, stepNear, stepPitch, type Move, type Options, type Proto, laneOk, isRepeat } from "./protos.ts";

export const PERFECT_MS = 70;
/** The multiplier's step (notes right in a row), and CON FUOCO's run. */
export const STEP_NOTES = 8;
export const FUOCO_NOTES = 24;
/** How far ahead the next note shows, in ms. */
export const APPROACH_MS = 1100;
const HOLD_MAX = 8;
/**
 * D223, BLUETOOTH MODE: the player's notes are sounded ahead, on the band's schedule, so that they are
 * heard at their written times: armed at this level, raised to full by a touch in the window, faded
 * fast if none has come this long (ms, as heard) after the written time; the window's late side this
 * much wider (the headphones' jitter).
 */
export const ARM_LEVEL = 0.3;
export const ARM_WAIT_MS = 90;
export const BT_LATE_MS = 20;

/** D223: a note of the player's sounded ahead (its chord, its ornament, the notes riding after it). */
interface Armed {
  k: number;
  i: number;
  gate: Gate;
  sounds: Sounding[];
  riders: Sounding[];
  state: "armed" | "confirmed" | "faded";
  /** When (audio clock) its gate may be closed; the riders' end. */
  closeAt: number;
  ridersEnd: number;
}
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
  /** D218: its note struck right and not yet judged for its end (HELD, SHORT, CLEAN, REST!). */
  open?: boolean;
}

/** A touch as the music box shows it: when, at what step (the one asked for), right or wrong. */
export interface Mark {
  tick: number;
  step: number;
  ok: boolean;
}

/**
 * D239: a right note on a HIGHWAY (the computer's keys, the phone's lanes) in DIRECTION or LEAPS: in
 * its planned lane ("exact": full points, a chime) or only the right way from the last ("relative":
 * half the points, the note duller); none where the lane plays no part (TIMING, a free note).
 */
export type LaneGrade = "exact" | "relative";
/** D239: a relative note's share of the points, and its sound's darkening (Play.bright). */
export const RELATIVE_SHARE = 0.5;
export const RELATIVE_DULL = 0.4;
/** D239: points as shown: a relative note's half point as ½ ("1½"). */
export function ptsText(p: number): string {
  const w = Math.floor(p);
  return p - w >= 0.5 ? `${w || ""}½` : String(w);
}
/** D239: the results' line: "LANE 72% · DIRECTION 28%" (empty with no lane-graded note). */
export function laneLine(t: { exact: number; relative: number }): string {
  const n = t.exact + t.relative;
  if (!n) return "";
  const e = Math.round((100 * t.exact) / n);
  return `LANE ${e}% · DIRECTION ${100 - e}%`;
}

type Verdict = { ok: boolean; wrong?: number; why?: "gesture" | "legato" | "hand" | "height" | "dynamic"; lane?: LaneGrade; at?: number };

/** A voice the player plays: its notes as judged, and their moves. */
export interface Track {
  voice: number;
  notes: LaneNote[];
  moves: Move[];
  /** D214, D217: the onsets that start a new contour (an entry's first note; a stretto's first lower-row note): free. */
  fresh?: Set<number>;
}

/** D249: a slip costs the streak a quarter, at least this many notes. */
export const SLIP_LOSS_MIN = 4;
/** D249: a second slip within this many right notes of the one before costs a multiplier step. */
export const SLIP_NEAR = 8;
/** D249: the streak (or combo) after a slip: a quarter lost, at least SLIP_LOSS_MIN, never below 0. */
export function slipLoss(n: number): number {
  return Math.max(0, n - Math.max(SLIP_LOSS_MIN, Math.ceil(n / 4)));
}

/** D217: the two rows of pads meet this far (px) above the play area's foot (paint-proto.ts padRows: the strike line 196 px up). */
export const PAD_SPLIT = 135;

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
   * STEP_NOTES right in a row, and falls a step (not to ×1) on a slip (D249: on a second slip close to
   * the one before). An entry of the subject played
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
  /** D216, KIMIKO (D219: WITH KIMIKO ISHIZAKA, a switch in LADDER and SUBJECT): her clock (her-clock.ts), the game on Kimiko Ishizaka's time. */
  readonly clock: Clock | null = null;
  /** D215: the notes played right and the slips, so far (counted only; the fade went with D216). */
  hits = 0;
  slips = 0;
  /** How the player has been playing, 0 (pp) to 1 (ff): the others follow, a little. */
  private feel = 0.55;

  /**
   * D216, KIMIKO: `o.clock` puts the game on her time (her-clock.ts), in place of the steady tempo and
   * the final ritard: the windows (in ticks) at her mean tempo over the passage. D219: taken only WITH
   * KIMIKO ISHIZAKA (`o.her`); then the game sounds nothing but the player's voice: no other voices, no
   * band, no subject effects, no click past a quiet count-in.
   */
  constructor(f: TouchFugue, voices: number | number[], from: number, proto: Proto, o: Options & { bpm: number; clock?: Clock }, chip: Chip) {
    this.f = f;
    this.proto = proto;
    this.ornaments = ornamentsOf(f);
    this.subj = new SubjectSound(f);
    this.o = o;
    this.chip = chip;
    if (chip.coupling) chip.coupling = { up: 0, down: 0, split: 48 };
    const b = beatOf(f);
    this.beat = b.ticks;
    this.perBar = b.perBar;
    // D181: the tempo counts quarter notes, whatever the metre (in 2/2 the beat was a half note: twice as fast).
    this.tps = (f.tpq * o.bpm) / 60;
    if (o.clock && o.her) (this.rit = o.clock), (this.tps = o.clock.tps), (this.clock = o.clock);
    else if (o.until === undefined || o.until >= f.length) this.rit = ritard(f.length, f.barTicks);
    // D250: a prelude's arc (arc.ts): its tempo rising subtly, its notes passing to the player by section.
    const arc = o.her || proto.id === "subject" ? undefined : arcOf(f);
    this.arc = arc;
    if (arc && !(o.clock && o.her)) this.rit = withSpeed(this.rit, (t) => lineAt(f, arc.tempo, t), f.length, f.tpq / 4);
    // D191: how far apart two ticks sound, in ms (at this tempo, the final ritard included).
    const msBetween = (a: number, c: number) => ((this.rit.warp(c) - this.rit.warp(a)) / this.tps) * 1000;
    // D214, SUBJECT: one line, the subject's notes in every entry, whichever voice (subject-line.ts).
    const line = proto.id === "subject" ? subjectLine(f, from, o.until) : null;
    this.line = line;
    // D252, BOTH HANDS: where the arc gives the left hand to the left thumb (the right hand's game on a
    // phone's road or the computer's keys), it is a second track, its notes those of the sections it
    // plays (outside the pedals, which are the left thumb's).
    const spans = pedalSpans(f, arc);
    const inPedal = (on: number) => spans.some((p) => on >= p.on && on < p.end);
    const handsOn = !!arc?.hands && !line && (proto.id === "highway" || proto.id === "keys") && (Array.isArray(voices) ? voices : [voices]).join() === "0" && f.voices.length > 1;
    this.hands = handsOn;
    const lhMine = (on: number) => handsOn && handsAt(f, arc, on) !== null && !inPedal(on);
    const voiceList = handsOn ? [0, 1] : Array.isArray(voices) ? voices : [voices];
    this.tracks = line ? this.lineTracks(line, msBetween) : voiceList.map((v) => {
      const notes = laneNotes(
        f.voices[v].filter(([on]) => on >= from && (o.until === undefined || on < o.until) && (!handsOn || v !== 1 || lhMine(on))),
        this.beat,
        v,
      );
      // D191: the notes too quick to strike ride after the note before; D229: in a prelude, more of them (the strong notes struck; D232: its threshold by its fugue's tier).
      const rideMs = preludeRideMs(f.id);
      const lhFactor = (t: number) => handsAt(f, arc, t) ?? 1;
      if (f.kind === "prelude") preludeRides(notes, this.beat, msBetween, (t) => inBar(f, t), this.beat === f.tpq * (4 / Number(f.meter.split("/")[1])) * 3 ? 3 : 2, arc ? (t: number) => rideMs * (handsOn && v === 1 ? lhFactor(t) : stepAt(f, arc.rides, t)) : rideMs);
      else quickRides(notes, this.beat, msBetween);
      const mv = moves(notes, this.beat);
      return { voice: v, notes, moves: mv };
    });
    [{ voice: this.voice, notes: this.notes, moves: this.moves }] = this.tracks;
    const played = this.tracks.map((t) => t.voice);
    this.others = o.solo || o.her ? [] : line ? accompaniment(f, from, -1).filter((n) => !line.keys.has(lineKey(n.voice, n.on, n.midi)) && (o.until === undefined || n.on < o.until)) : handsOn ? accompaniment(f, from, 0).filter((n) => !(n.voice === 1 && lhMine(n.on)) && (o.until === undefined || n.on < o.until)) : accompaniment(f, from, played[0]).filter((n) => !played.includes(n.voice) && (o.until === undefined || n.on < o.until));
    this.shapes = phrase(this.others, this.beat, (t) => inBar(f, t), subjectMarks(f).subject);
    // Waiting (the lessons): no count-in, the clock stops at each note until it is struck.
    this.start = o.wait ? from - this.beat : countInStart(f, from);
    this.entry = from;
    this.end = (o.until ?? f.length) + this.beat;
    this.opt = options(f.tpq, this.bpm, "easy");
    // D223: BLUETOOTH MODE (not while the music waits for each note): the late side a little wider.
    this.bt = !!o.bt && !o.wait;
    if (this.bt) this.opt = { ...this.opt, late: this.opt.late + (BT_LATE_MS / 1000) * this.tps };
    this.anchorAt = chip.ctx.currentTime + 0.15;
    this.anchorTick = this.start;
    this.nextBeat = this.start;
    // D250: THE PEDAL (the right hand's game only): its own lane, the figure around it, free at both ends.
    // D252: several, one after another; with both hands each in its own lane of the left thumb's.
    if (spans.length && this.tracks[0]?.voice === 0 && !line && (handsOn || this.tracks.length === 1)) {
      this.pedalList = spans.map((ps) => ({ ...ps, lane: handsOn ? ps.lane : 0, id: null, from: null, held: 0, announced: false, done: false, share: 0, sounds: [] }));
      for (const t of this.tracks) {
        const fresh = new Set(t.fresh ?? []);
        for (const ps of spans) {
          const first = t.notes.find((n) => n.on >= ps.on);
          const after = t.notes.find((n) => n.on >= ps.end);
          if (first) fresh.add(first.on);
          if (after) fresh.add(after.on);
        }
        t.fresh = fresh;
      }
    }
    if (arc?.finalChord) this.finalOn = this.tracks[0]?.notes.at(-1)?.on;
    if (line) for (const e of line.entries) this.entries.push({ voice: e.voice, k: 0, on: e.on, end: e.end, ons: e.ons, state: "open" });
    else
      this.tracks.forEach((t, k) => {
        for (const e of f.entries) if (e.voice === t.voice && e.on >= from) this.entries.push({ voice: e.voice, k, on: e.on, end: e.end, ons: e.notes.map((x) => x[0]), state: "open" });
      });
    this.kb = pianoKeys(this.notes);
  }

  /** D214, SUBJECT: the subject line (its entries, their labels), or null. */
  readonly line: SubjectLine | null;
  /**
   * D214: the line as a track: each note in its own voice; an entry's first note never rides (it is
   * free: any lane). D217: and the second line (the older entry in a stretto, the lower row) as a
   * second track, reduced to its "special moves": only its notes on a beat or of half a beat or more
   * are struck, the quicker ones ride (D191, played for the player); each stretto's first note there
   * is struck and free.
   */
  private lineTracks(line: SubjectLine, msBetween: (a: number, c: number) => number): Track[] {
    const asNotes = (ns: SubjectLine["notes"]): LaneNote[] => ns.map(([on, dur, midi, step, voice]) => ({ on, dur, midi, step, long: dur >= this.beat, state: "pending", voice }));
    const notes = asNotes(line.notes);
    quickRides(notes, this.beat, msBetween);
    const heads = new Set(line.entries.map((e) => e.on));
    for (const n of notes) if (heads.has(n.on)) n.ride = false;
    const second = asNotes(line.second);
    quickRides(second, this.beat, msBetween);
    const fresh2 = new Set(line.secondHeads);
    for (const n of second) {
      if (inBar(this.f, n.on) % this.beat !== 0 && n.dur < this.beat / 2) n.ride = true;
      if (fresh2.has(n.on)) n.ride = false;
    }
    return [
      { voice: line.entries[0]?.voice ?? 0, notes, moves: moves(notes, this.beat), fresh: heads },
      { voice: line.entries.find((e) => e.on === line.second[0]?.[0])?.voice ?? line.second[0]?.[4] ?? 0, notes: second, moves: moves(second, this.beat), fresh: fresh2 },
    ];
  }
  /** D217, SUBJECT: the stretto sounding now (or about to, within `ahead` ticks), if any. */
  strettoNow(ahead = 0): Stretto | null {
    return this.line?.strettos.find((s) => s.on - ahead <= this.now && this.now < s.end) ?? null;
  }
  /** D217: the row a touch is in (the pads' split, as painted: 135 px above the screen's foot), and the track it plays. */
  private rowTrack(c: Contact, ts: number): number {
    if (!this.line || this.tracks.length < 2 || c.y < c.h - PAD_SPLIT) return 0;
    // The lower row plays the second line during a stretto; outside one, either row plays the single entry.
    const t = this.tickOf(ts);
    return this.inStretto(t) || this.nearestPending(1, t) >= 0 ? 1 : 0;
  }
  /** D217: within a stretto (from the newer entry's arrival until the second line's last note ends). */
  private inStretto(t: number): boolean {
    return !!this.line?.strettos.some((s) => s.on <= t && t < s.end);
  }
  /** D214: the entry sounding now and the next to come (SUBJECT's banner and count-in). */
  entryNow(): { current: LineEntry | null; next: LineEntry | null } {
    const es = this.line?.entries ?? [];
    const j = es.findIndex((e) => e.on > this.now);
    const current = (j < 0 ? es.at(-1) : es[j - 1]) ?? null;
    // D217: of two entries beginning together, the main line's (listed last).
    let k = j;
    while (k >= 0 && k + 1 < es.length && es[k + 1].on === es[j].on) k++;
    return { current: current && this.now < current.end ? current : null, next: k < 0 ? null : es[k] };
  }
  /** A note's own voice (D214: SUBJECT's line moves between voices; it sounds in each one's voicing). */
  private voiceOf(k: number, i: number): number {
    return this.tracks[k].notes[i]?.voice ?? this.tracks[k].voice;
  }
  /** HIGHWAY's road and lanes: HIGHWAY, and SUBJECT on it (D214). */
  get road(): boolean {
    return this.proto.id === "highway" || this.proto.id === "subject";
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

  /** D223: the tick drawn now (the clock as heard, plus the screen's delay: Chip.visual). */
  viewNow = 0;
  /** D223: paints with `now` as drawn (the screen's delay taken in), the game's own clock kept. */
  view<T>(paint: () => T): T {
    const now = this.now;
    this.now = this.viewNow;
    try {
      return paint();
    } finally {
      this.now = now;
    }
  }

  /** D223, BLUETOOTH MODE: on for this game. */
  readonly bt: boolean;
  /** D223: the player's notes sounded ahead ("track:onset"), and where each track's arming has reached. */
  private armed = new Map<string, Armed>();
  private armNext: number[] = [];
  /**
   * D223: each of the player's notes coming within the horizon sounded ahead at its written time (the
   * band's schedule: heard on time through the headphones' delay), soft, through its own gate; its
   * chord, its ornament and the notes riding after it with it.
   */
  private arm(horizon: number) {
    const ch = this.chip;
    const piano = this.proto.id === "piano";
    const count = this.f.voices.length;
    const envelope = piano ? "piano" : "synth";
    this.tracks.forEach((t, k) => {
      const notes = t.notes;
      let i = this.armNext[k] ?? 0;
      for (; i < notes.length && notes[i].on <= horizon; i++) {
        const n = notes[i];
        if (n.ride || n.state !== "pending" || (i > 0 && notes[i - 1].on === n.on)) continue;
        const at = this.timeAt(n.on);
        if (at < ch.ctx.currentTime) continue;
        const voice = this.voiceOf(k, i);
        const voiceV = voicing(voice, count, true);
        const sv = this.o.her ? null : this.subj.shape(voice, n.on, voiceV);
        const gate = ch.gate(ARM_LEVEL);
        let expr: Play = { ...dynamic(this.feel), muffleable: true, lead: true, pleno: this.pleno, envelope, legato: !piano && this.joinedAt(i, k) };
        if (sv) expr = { ...expr, ...sv.play, level: (expr.level ?? 1) * (sv.play.level ?? 1) };
        expr.into = gate.node;
        // The notes riding after it (D191), at their times; the note gives way to the first.
        let j = i + 1;
        while (j < notes.length && notes[j].on === n.on) j++;
        const riders: Sounding[] = [];
        let first = Infinity;
        let ridersEnd = 0;
        for (; j < notes.length && notes[j].ride; j++) {
          const r = notes[j];
          if (r.state !== "pending") continue;
          const rat = this.timeAt(r.on);
          const len = Math.max(0.03, this.timeAt(r.on + r.dur) - rat);
          first = Math.min(first, rat);
          const rv = r.voice ?? t.voice;
          const rs = this.subj.shape(rv, r.on, voicing(rv, count, true));
          riders.push(ch.note(r.midi, rat, len, rs.v, { ...rs.play, lead: true, envelope, into: gate.node }));
          ridersEnd = Math.max(ridersEnd, rat + len + 0.6);
        }
        const hold = Number.isFinite(first) ? Math.max(0.03, first - at) : HOLD_MAX;
        const chord = chordOf(notes, i);
        const orn = chord.length === 1 ? this.ornaments.get(`${voice}:${n.on}`) : undefined;
        let sounds: Sounding[];
        if (orn) {
          const prev = this.before(i, k);
          const parts = realiseNote(this.f, orn, n.on, n.dur, n.midi, prev >= 0 ? notes[prev].midi : undefined, this.bpm);
          sounds = parts.map(([pon, pdur, pmidi], q) => {
            const pat = Math.max(at, this.timeAt(pon));
            const last = q === parts.length - 1;
            return ch.note(pmidi, pat, last ? Math.max(0.03, hold - (pat - at)) : this.timeAt(pon + pdur) - this.timeAt(pon), sv?.v ?? voiceV, { ...expr, legato: q > 0 || expr.legato });
          });
        } else sounds = chord.map((c) => ch.note(notes[c].midi, at, hold, sv?.v ?? voiceV, expr));
        this.armed.set(`${k}:${n.on}`, { k, i, gate, sounds, riders, state: "armed", closeAt: at + HOLD_MAX + 1, ridersEnd });
      }
      this.armNext[k] = i;
    });
  }
  /** D223: the armed note at a track's onset, if any. */
  armedAt(k: number, on: number): { state: Armed["state"] } | undefined {
    return this.armed.get(`${k}:${on}`);
  }
  /** D223: an armed note no touch has confirmed: faded out fast (heard briefly, through the headphones' delay). */
  private fadeArmed(a: Armed) {
    const t = this.chip.ctx.currentTime;
    a.state = "faded";
    a.gate.fade();
    for (const sd of [...a.sounds, ...a.riders]) sd.stop(t + 0.06);
    a.closeAt = t + 0.3;
  }
  /** D223: armed notes past their wait (or played wrong) faded; gates closed once their notes are done. */
  private watchArmed() {
    const t = this.chip.ctx.currentTime;
    for (const [key, a] of this.armed) {
      const n = this.tracks[a.k].notes[a.i];
      if (a.state === "armed" && (n.state !== "pending" || this.msOf(n.on, this.now) > ARM_WAIT_MS)) this.fadeArmed(a);
      else if (a.state === "confirmed" && ![...this.held.values()].some((h) => h.sounds === a.sounds) && !this.pedalled.some((sd) => a.sounds.includes(sd))) a.closeAt = Math.min(a.closeAt, Math.max(t + 1, a.ridersEnd));
      if (t > a.closeAt) {
        a.gate.close();
        this.armed.delete(key);
      }
    }
  }

  /** One frame: the beat (or the band) and the others scheduled ahead; the window panned; notes gone by marked missed. True at the end. */
  step(): boolean {
    const ch = this.chip;
    this.now = this.tickAt(ch.heard());
    this.pedalStep();
    this.arcCues();
    // D252, LIFT: the doublings as the music grows (a 4′ from a quarter of the way, a 16′ from two thirds).
    if (this.arc?.lift) {
      const l = liftAt(this.f, this.arc, this.now + this.tps * 0.5);
      ch.coupling = { up: l > 0.25 ? 0.18 + 0.27 * Math.min(1, (l - 0.25) / 0.75) : 0, down: l > 0.66 ? 0.4 * Math.min(1, (l - 0.66) / 0.34) : 0, split: 48 };
    }
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
    // D223: what is drawn runs the screen's own delay ahead of the clock as heard (none: the same).
    this.viewNow = ch.visual && !this.o.wait ? this.tickAt(ch.heard() + ch.visual) : this.now;
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
      const kimiko = !!this.o.her;
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
      // D250: the bass's pedal sounds only while the player holds it.
      const bp = this.bassPedal;
      if (bp && n.midi === bp.midi && n.on >= bp.on && n.on < bp.end && bp.id === null) continue;
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
    if (this.bt) {
      this.arm(horizon);
      this.watchArmed();
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
      for (let s = 0; s < missed; s++) this.slip();
      this.grade = { text: "MISS", at: performance.now() };
    }
    this.judgeEntries();
    this.judgeStrettos();
    this.judgeCadences();
    this.sustain();
    // D218: a note held on into the rest written after it: judged (REST!) as soon as it overstays.
    for (const h of this.held.values()) if (h.open && this.overstays(h)) this.judgeEnd(h, this.now);
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

  /** D217: a voice's pending struck note nearest a tick within the window (none: -1), not taken. */
  private nearestPending(k: number, t: number): number {
    let best = -1;
    this.tracks[k].notes.forEach((n, i) => {
      if (n.state !== "pending" || n.ride || t < n.on - this.opt.early || t > n.on + this.opt.late) return;
      if (best < 0 || Math.abs(t - n.on) < Math.abs(t - this.tracks[k].notes[best].on)) best = i;
    });
    return best;
  }

  /** The voice a thumb plays. */
  private trackOf(side: Side): number {
    if (this.hands) return 0;
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
  /**
   * D229, the computer's HIGHWAY: a repeated note (struck with SPACE) is drawn as a gem in the lane of
   * the note before, so the line goes on, marked SPACE (paint-proto.ts). The judging is as before.
   */
  spaceGem(i: number, k = 0): boolean {
    return this.proto.id === "keys" && this.before(i, k) >= 0 && isRepeat(this.tracks[k].moves[i]);
  }
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
    // EASY: the time, or (D187) the way along the keys too.
    if (this.proto.id === "keys") {
      const lvl = this.o.easy ?? "timing";
      const code = at.key?.code;
      // D230, SCALE KEYS: every note its own key (the level ignored but TIMING: any key on time).
      const sk = this.scale;
      if (sk && lvl !== "timing" && code) return this.scaleVerdict(sk, i, code, prev);
      if (lvl === "timing" || !code || this.isFree(i, k)) return { ok: true };
      // D208, EXACT LANES: the planned lane's key (in any row: the rows give the dynamic), or for a repeat the space bar.
      if (lvl === "exact") {
        if (code === "Space") return m.dir === 0 || m.steps === 0 ? { ok: true } : { ok: false, wrong: asked(0), why: "gesture" };
        return keyPlace(code)?.col === this.lanes[i] ? { ok: true } : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
      }
      // D239: right in the planned lane (SPACE on a repeat), or only the right way from the last key.
      const col = keyPlace(code)?.col;
      const exact = code === "Space" ? m.dir === 0 || m.steps === 0 : col === this.lanesOf(k)[i];
      const graded = (): Verdict => ({ ok: true, lane: exact ? "exact" : "relative", at: col ?? this.lanesOf(k)[i] });
      // D252: with both hands each judged from its own last key.
      const prevKey = this.hands ? this.keyBy[k] : this.lastKey;
      if (!prevKey || exact) return graded();
      return contourOk(m, prevKey, code, lvl === "leaps") ? graded() : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
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
        const R = this.ladderRow;
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
      case "subject": {
        // D207: EASY on a phone: the lane tapped, judged as the keys are (D187), by lanes.
        const lvl = this.o.easy ?? "timing";
        if (lvl === "timing" || this.isFree(i, k)) return { ok: true };
        if (lvl === "exact") return this.laneOfX(c.x, c.w) === this.lanesOf(k)[i] ? { ok: true } : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
        // D217: each row (SUBJECT's two lines in a stretto) judged from its own last lane.
        const last = this.line || this.hands ? this.laneBy[k] : this.lastLane;
        // D239: the planned lane, or only the right way from the last. D252: the row too, where the
        // arc asks for rows (the repeat on the lower row): the wrong row is only the right way.
        const lane = this.laneOfX(c.x, c.w);
        const rowRight = !this.arc?.rows || (c.y >= c.h - PAD_SPLIT ? 1 : 0) === this.rowOf(i, k);
        const graded: Verdict = { ok: true, lane: lane === this.lanesOf(k)[i] && rowRight ? "exact" : "relative", at: lane };
        // D252: the planned lane is always right (a hand's few lanes cannot always skip one for a leap).
        if (last < 0 || lane === this.lanesOf(k)[i]) return graded;
        const r = this.hands ? this.laneRegion(k) : { from: 0, count: this.laneCount };
        return laneOk(m, last - r.from, lane - r.from, lvl === "leaps", r.count) ? graded : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
      }
    }
  }

  /**
   * D230, SCALE KEYS: the key of each of the line's notes (scale-keys.ts: the home row the home key's
   * scale, raised notes the row above, lowered below), or null when the layout is off.
   */
  get scale(): ScaleKey[] | null {
    if (!this.o.scale || this.proto.id !== "keys") return null;
    return (this.scaleMemo ??= scaleKeys(this.notes, this.f.key));
  }
  private scaleMemo?: ScaleKey[];
  /** D230: right if the key is a chord note's key (the tonic at home: A or K), or SPACE on a repeated pitch; a wrong key sounds its own pitch. */
  private scaleVerdict(sk: ScaleKey[], i: number, code: string, prev: number): Verdict {
    const notes = this.notes;
    const chord = chordOf(notes, i);
    const n = notes[i];
    if (code === "Space") {
      // A pitch of the chord before sounded again (a chord: any of its notes).
      const before = prev >= 0 ? chordOf(notes, prev).map((j) => notes[j].midi) : [];
      return chord.some((j) => before.includes(notes[j].midi)) ? { ok: true } : { ok: false, wrong: before[0], why: "gesture" };
    }
    if (chord.some((j) => sk[j] && scaleFits(sk[j], code))) return { ok: true };
    return { ok: false, wrong: keyPitch(code, n.midi, this.f.key), why: "gesture" };
  }

  /** D207, HIGHWAY: the lane a tap falls in, and the lane tapped last (-1: none yet). */
  lastLane = -1;
  /** D217: the lane tapped last in each line (SUBJECT's two rows in a stretto). */
  private readonly laneBy = [-1, -1];
  laneOfX(x: number, w: number): number {
    return Math.max(0, Math.min(this.laneCount - 1, Math.floor((x / Math.max(1, w)) * this.laneCount)));
  }
  get laneCount(): number {
    return this.road ? 5 : this.scale ? SCALE_LANES : HOME_LANES;
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
    if (this.road && this.pedalTake(id, this.laneOfX(c.x, c.w))) return;
    this.finalStrike(id, ts);
    const d = this.dynamicAt(c);
    const h: Held = { side: c.side, k: this.line ? this.rowTrack(c, ts) : this.hands && this.road ? this.laneTrack(this.laneOfX(c.x, c.w)) : this.trackOf(c.side), x0: c.x, ax: c.x, ay: c.y, note: -1, chord: [], sounds: [], midi: 0, cell: this.cellAt(c), d0: d, trail: [{ t: ts, y: c.y }] };
    this.held.set(id, h);
    this.strikeWith(id, h, ts, { c }, d);
    // HIGHWAY: where the hand is now.
    if (this.road) (this.lastLane = this.laneBy[h.k] = this.laneOfX(c.x, c.w)), (this.touchW = c.w);
  }

  /** A computer key or a MIDI key goes down. */
  keyDown(id: number, k: KeyPress, ts: number) {
    // The same key again without its release (lost while the window was away): let the first go.
    if (this.held.has(id)) this.up(id, ts);
    if (this.pedalTake(id, keyPlace(k.code ?? "")?.col ?? -1)) return;
    this.finalStrike(id, ts);
    const d = k.velocity ?? 0.6;
    const struck = k.code;
    const h: Held = { side: k.side ?? "left", k: this.hands ? this.laneTrack(keyPlace(k.code ?? "")?.col ?? 8) : this.trackOf(k.side ?? "left"), x0: 0, ax: 0, ay: 0, note: -1, chord: [], sounds: [], midi: 0, cell: k.midi, d0: d, trail: [] };
    this.held.set(id, h);
    this.strikeWith(id, h, ts, { key: k }, d);
    // Where the hand is now: the next key is judged from it.
    if (struck) (this.lastKey = struck), (this.keyBy[h.k] = struck);
  }

  /** EASY's DIRECTION: the key struck last. */
  lastKey: string | null = null;
  /** D252: each hand's last key (both hands). */
  private readonly keyBy: (string | null)[] = [null, null];
  /**
   * A note the hand may take anywhere (an open bar across the road): D217, only the first, a new
   * contour's start (SUBJECT: an entry's first note, a stretto's first lower-row note), and a note
   * after a real rest: a beat at least (half a bar where a beat passes in under half a second). A long
   * note no longer frees the next (D187 freed it, and after any rest of a quarter beat: crossbars
   * everywhere); there the lanes recentre silently (`soft`).
   */
  isFree(i: number, k = 0): boolean {
    const t = this.tracks[k];
    const n = t.notes[i];
    if (!n || t.fresh?.has(n.on)) return true;
    return this.restBefore(i, k) >= this.restMin;
  }
  /** D217: the rest before note i (from the end of whatever sounded last, the riding notes included), in ticks; Infinity for the first. */
  private restBefore(i: number, k: number): number {
    const notes = this.tracks[k].notes;
    const j = this.before(i, k);
    if (j < 0) return Infinity;
    let end = -Infinity;
    for (let q = i - 1; q >= 0 && notes[q].on >= notes[j].on; q--) if (notes[q].on < notes[i].on) end = Math.max(end, notes[q].on + notes[q].dur);
    return notes[i].on - end;
  }
  private get restMin(): number {
    return this.beat / this.tps < 0.5 ? Math.max(this.beat, this.f.barTicks / 2) : this.beat;
  }
  /**
   * D217: a note where the lanes may recentre without an open bar: after a long note (a beat or more)
   * or a short rest (a quarter beat): the planner may take any lane the right way there (any lane
   * further right for a rise, further left for a fall), which DIRECTION accepts as it is.
   */
  private soft(i: number, k: number): boolean {
    const j = this.before(i, k);
    if (j < 0) return false;
    return this.tracks[k].notes[j].dur >= this.beat || this.restBefore(i, k) >= this.beat / 4;
  }
  /** What the box draws over each note in DIRECTION (none in TIMING). */
  get cues(): Arrow[] | undefined {
    const lvl = this.o.easy ?? "timing";
    if (this.proto.id !== "keys" || lvl === "timing" || this.scale) return undefined;
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
    // D217: in a stretto, a note is right only in its row: the other row's note, struck here, is wrong.
    if (i < 0 && this.line && this.tracks.length > 1) {
      const o = 1 - h.k;
      const j = this.nearestPending(o, tk);
      if (j >= 0) {
        h.k = o;
        this.play(id, h, j, { ok: false, why: "hand" }, false, d);
        return;
      }
    }
    // D191: a strike on a note that rides (the player striking it anyway) is no slip; it is played for them.
    if (i < 0 && notesK.some((n) => n.ride && Math.abs(n.on - tk) <= Math.max(this.opt.early, this.opt.late))) return;
    if (i < 0) {
      this.grade = { text: "✕", at: performance.now(), side: h.side, why: "time" };
      // A strike on no note is a slip, and counts against the accuracy (mashing scores nothing).
      this.stray++;
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
      if (Math.abs(c.y - h.ay) < this.ladderRow * 1.5) return;
      this.slideTo(id, h, c, t);
    } else if (this.road) {
      // D208: a held thumb slid into another lane plays the next note there, joined (legato): only
      // once it has crossed most of a lane's width, so a rolling thumb does not slide by itself.
      const lane = this.laneOfX(c.x, c.w);
      if (lane === h.cell || Math.abs(c.x - h.ax) < (c.w / this.laneCount) * 0.75) return;
      h.cell = lane;
      h.ax = c.x;
      if (this.slideTo(id, h, c, t)) this.lastLane = this.laneBy[h.k] = lane;
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

  /**
   * A touch or key let go. D249: `cancelled` when the system took the touch back (pointercancel: an
   * edge gesture, a sixth finger): its sound stops, but it is no release, so its end is not judged.
   */
  up(id: number, ts: number, cancelled = false) {
    if (this.pedalLeave(id, ts)) return;
    const h = this.held.get(id);
    if (!h) return;
    this.held.delete(id);
    if (cancelled) {
      h.open = false;
      for (const sd of [...h.sounds, ...(h.fx ?? [])]) sd.stop();
      return;
    }
    // D218: the note's end judged as it is let go.
    if (h.open) this.judgeEnd(h, this.tickOf(ts));
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
    // D218: struck by a new touch or key while the note before still sounds (held by another thumb or
    // key, or let go no more than LEGATO_GAP_MS, and a tenth of its length, before): legato. A slide is
    // not (the owner: "slide is cheap"): it sounds joined but earns nothing and breaks the chain. The
    // notes giving way end here (judged).
    const tk = notes[i].at ?? this.now;
    let over = false;
    for (const [hid, o] of this.held) if (hid !== id && o.k === h.k && o.sounds.length && !o.passive && o.note >= 0) over = true;
    const lo = this.lastOff;
    if (lo && lo.k === h.k && lo.i === this.before(i, h.k)) {
      const p = notes[lo.i];
      if (this.msOf(lo.tick, tk) <= Math.min(LEGATO_GAP_MS, 0.1 * this.msOf(p.on, p.on + p.dur))) over = true;
    }
    if (h.open) this.judgeEnd(h, tk);
    for (const [hid, o] of this.held) if (hid !== id && o.k === h.k && o.open) this.judgeEnd(o, tk);
    const voiceV = voicing(this.voiceOf(h.k, i), this.f.voices.length, true);
    const piano = this.proto.id === "piano";
    const chord = chordOf(notes, i);
    const fuoco = this.streak >= FUOCO_NOTES;
    const base = dynamic(d);
    // D239: a note right only by its direction (not in its lane) sounds a little duller.
    const dull = v.ok && v.lane === "relative" ? RELATIVE_DULL : 0;
    let expr: Play = { ...base, trill: this.trillNext, bright: (base.bright ?? 0) + (fuoco ? 0.35 : 0) - dull, muffleable: true, lead: true, pleno: v.ok && this.pleno, envelope: piano ? "piano" : "synth" };
    // D213: the player's voice as the others: its subject brighter (and its effect), duller during another's entry.
    // D219: WITH KIMIKO ISHIZAKA the player's voice is plain (no subject effects over her piano).
    const sv = v.ok && !this.o.her ? this.subj.shape(this.voiceOf(h.k, i), notes[i].on, voiceV) : null;
    if (sv) expr = { ...expr, ...sv.play, level: (expr.level ?? 1) * (sv.play.level ?? 1) };
    const pitches = v.ok || v.wrong === undefined ? chord.map((j) => notes[j].midi) : [v.wrong];
    // D213: the subject's effect under the note (the note's own sound below, its last made).
    for (const sd of h.fx ?? []) sd.stop();
    const n1 = notes[i];
    h.fx = sv ? this.subj.layers(this.chip, sv.sn, pitches[0], this.chip.ctx.currentTime, this.timeAt(n1.on + n1.dur) - this.timeAt(n1.on), sv.v, expr.level ?? 1) : [];
    // D223, BLUETOOTH MODE: the note already sounding ahead (armed) is confirmed by a right touch (raised,
    // then held while the touch lasts); a wrong touch never confirms it: it fades, and the wrong note
    // sounds as it always has.
    const armed = this.bt ? this.armed.get(`${h.k}:${notes[i].on}`) : undefined;
    if (armed?.state === "armed" && !v.ok) this.fadeArmed(armed);
    if (armed?.state === "armed" && v.ok) {
      for (const sd of h.sounds) sd.stop();
      for (const [hid, o] of this.held) {
        if (hid === id || o.k !== h.k) continue;
        o.passive = true;
        for (const sd of o.sounds) sd.stop(this.chip.ctx.currentTime + 0.03);
        o.sounds = [];
      }
      armed.state = "confirmed";
      armed.gate.confirm();
      h.sounds = armed.sounds;
    } else if (slide && !piano && h.sounds.length === 1 && pitches.length === 1) {
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
    this.sinceSlip++;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    // D198: the crowd warms; a long run called out, every fifty.
    this.crowd = Math.min(1, this.crowd + (perfect ? 0.025 : 0.015));
    this.flames.push({ i, at, k: h.k, lane: v.at, grade: v.lane });
    if (this.flames.length > 24) this.flames.splice(0, 12);
    if (this.streak % 50 === 0) this.banner = { text: `${this.streak} NOTE STREAK!`, at };
    if (this.streak % STEP_NOTES === 0 && this.mult < 4) this.mult++;
    if (this.streak === FUOCO_NOTES) this.banner = { text: "CON FUOCO!", at };
    h.pts = (perfect ? 2 : 1) * this.mult * (this.pleno ? 2 : 1);
    // D239: the planned lane scores in full, with a small bright chime over Bach's note; the right
    // direction in another lane half (the streak and the multiplier kept).
    if (v.lane === "relative") (h.pts *= RELATIVE_SHARE), this.laneTally.relative++;
    if (v.lane === "exact") {
      this.laneTally.exact++;
      this.chip.chime?.(pitches[0], this.chip.ctx.currentTime, levelOf(d));
    }
    h.open = true;
    // D218: a note joined in the score, struck legato, scores more, and more along an unbroken chain;
    // struck detached it scores as it is (Bach's articulation is open) but the chain is broken.
    const step = Math.max(...chord.map((j) => notes[j].step));
    if (this.joinedAt(i, h.k)) {
      this.art.legatoOf++;
      const p = this.before(i, h.k);
      if (!slide && over && p >= 0 && notes[p].state === "hit") {
        this.chain++;
        this.art.legato++;
        this.art.chain = Math.max(this.art.chain, this.chain);
        const bonus = legatoBonus(h.pts, this.chain);
        h.pts += bonus;
        const text = this.chain > 1 ? `LEGATO ×${this.chain}` : "LEGATO";
        this.flash = { text, at, good: true, kind: "legato" };
        this.ties.push({ k: h.k, a: p, b: i, at });
        if (this.ties.length > 12) this.ties.splice(0, 6);
        this.pops.push({ tick: n.on, step, text, at, gold: false, from: { tick: notes[p].on, step: notes[p].step }, ink: LEGATO_INK });
      } else this.chain = 0;
    }
    this.score += h.pts;
    // D186: the points rise from the note.
    this.pops.push({ tick: n.on, step, text: `+${ptsText(h.pts)}`, at, gold: perfect });
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
    // D223: sounded ahead with the note confirmed (BLUETOOTH MODE): only shown as they sound.
    const pre = this.bt && this.armed.get(`${h.k}:${notes[i].on}`)?.state === "confirmed";
    for (; j < notes.length && notes[j].ride; j++) {
      const n = notes[j];
      if (n.state !== "pending") continue;
      if (pre) {
        this.riders.push({ k: h.k, j, at: this.timeAt(n.on) });
        continue;
      }
      const at = Math.max(ch.ctx.currentTime, this.timeAt(n.on) + offS);
      const len = Math.max(0.03, this.timeAt(n.on + n.dur) - this.timeAt(n.on));
      if (first) for (const sd of h.sounds) sd.stop(at);
      first = false;
      const nv = n.voice ?? this.tracks[h.k].voice;
      const sv = this.subj.shape(nv, n.on, voicing(nv, this.f.voices.length, true));
      const sd = ch.note(n.midi, at, len, sv.v, { ...sv.play, lead: true, envelope: this.proto.id === "piano" ? "piano" : "synth" });
      if (sd) this.band.push({ sd, until: at + len + 0.6 });
      if (!this.o.her) for (const x of this.subj.layers(ch, sv.sn, n.midi, at, len, sv.v, sv.play.level ?? 1)) this.band.push({ sd: x, until: at + len + 0.8 });
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



  /**
   * A slip. D249 (small mistakes don't cost the whole run): the streak and the combo lose a quarter (at
   * least SLIP_LOSS_MIN), and the multiplier falls a step only on a slip within SLIP_NEAR notes (right
   * ones) of the slip before. CON FUOCO lasts while the streak holds FUOCO_NOTES. The feats that mean
   * "no mistakes" count the slips themselves (`slips`, the wrong and missed notes), never the streak.
   */
  private slip() {
    this.slips++;
    this.chain = 0;
    this.crowd = Math.max(0, this.crowd - 0.045);
    const fuoco = this.streak >= FUOCO_NOTES;
    this.streak = slipLoss(this.streak);
    this.combo = slipLoss(this.combo);
    if (fuoco && this.streak < FUOCO_NOTES) this.banner = null;
    if (this.sinceSlip < SLIP_NEAR) this.mult = Math.max(1, this.mult - 1);
    this.sinceSlip = 0;
  }
  /** D249: the right notes since the last slip (none yet: Infinity). */
  private sinceSlip = Infinity;

  /** The entries of the subject in the voices played: captured once every note of one is played right; lost at a slip. */
  private judgeEntries() {
    for (const e of this.entries) {
      if (e.state !== "open") continue;
      // D191: the riding notes are not the player's to capture.
      // D217: SUBJECT's entry over both lines (its older part may go on in the lower row).
      const notes = (this.line ? this.tracks.flatMap((t) => t.notes.filter((n) => n.voice === e.voice)) : this.tracks[e.k].notes).filter((n) => !n.ride && e.ons.includes(n.on));
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
   * D217, SUBJECT: each stretto announced a beat before it begins (STRETTO!, the painter's two-row
   * cue), and cleared when every struck note of both lines within it is right: a bonus twice an
   * entry's (STRETTO ×2); its entries are captured as usual.
   */
  readonly strettoState: ("coming" | "open" | "cleared" | "lost")[] = [];
  private judgeStrettos() {
    const ss = this.line?.strettos ?? [];
    ss.forEach((s, j) => {
      const st = this.strettoState[j] ?? "coming";
      if (st === "coming" && this.now >= s.on - this.beat && this.now < s.end) {
        this.strettoState[j] = "open";
        this.banner = { text: "STRETTO!", at: performance.now() };
      }
      if (this.strettoState[j] !== "open") return;
      const notes = this.tracks.flatMap((t) => t.notes.filter((n) => !n.ride && n.on >= s.on && n.on < s.end));
      if (notes.some((n) => n.state === "miss")) this.strettoState[j] = "lost";
      else if (notes.length && notes.every((n) => n.state === "hit")) {
        this.strettoState[j] = "cleared";
        this.score += 40 * this.mult;
        this.banner = { text: "STRETTO ×2!", at: performance.now() };
      }
    });
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
      // D249: the run held, four right notes at least since the last slip (the streak no longer falls to 0).
      if (c.on < this.entry || c.on > this.end || this.streak < 4 || this.sinceSlip < 4) continue;
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
  /** D239: lane: the lane struck (HIGHWAY), grade: its note's lane grade. */
  readonly flames: { i: number; at: number; k?: number; lane?: number; grade?: LaneGrade }[] = [];
  /** D239: the notes right in their planned lane, and right only by their direction. */
  readonly laneTally = { exact: 0, relative: 0 };
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
  /**
   * D218, articulation: legato where the score joins the notes (a bonus growing along an unbroken
   * chain), a note held its written length (HELD) or let go far too soon (SHORT), a rest respected
   * (CLEAN) or held through (REST!). Counted for the result screen.
   */
  readonly art: ArtStats = { legato: 0, legatoOf: 0, chain: 0, held: 0, heldOf: 0, clean: 0, cleanOf: 0 };
  /** The legato chain now (legato strikes in a row). */
  chain = 0;
  /** The last articulation called (a short word under the verdict). */
  flash: ArtFlash | null = null;
  /** The legato strikes, for the slur drawn between the two notes (note a to note b of track k). */
  readonly ties: { k: number; a: number; b: number; at: number }[] = [];
  /** The last note let go (its track, index and tick): a strike just after it is still legato. */
  private lastOff: { k: number; i: number; tick: number } | null = null;
  /** Milliseconds between two ticks, as heard. */
  private msOf(a: number, b: number) {
    return (this.timeAt(b) - this.timeAt(a)) * 1000;
  }
  /** D218: note i joined in the score to the note before it (any note, the riders too; no rest between). */
  joinedAt(i: number, k = 0): boolean {
    const notes = this.tracks[k].notes;
    const n = notes[i];
    if (!n || n.ride || (i > 0 && notes[i - 1].on === n.on) || this.before(i, k) < 0) return false;
    // The note just before by onset (a chord by its longest).
    let end = -Infinity;
    let j = i - 1;
    while (j >= 0 && notes[j].on === n.on) j--;
    if (j < 0) return false;
    for (let q = j; q >= 0 && notes[q].on === notes[j].on; q--) end = Math.max(end, notes[q].on + notes[q].dur);
    return n.on - end < this.beat / 4;
  }
  /** The note after note i: whether it rides (D191: then the end of note i is not the player's), and the rest before it. */
  private after(i: number, k: number): { riders: boolean; rest: number } {
    const notes = this.tracks[k].notes;
    let j = i + 1;
    while (j < notes.length && notes[j].on === notes[i].on) j++;
    if (j >= notes.length) return { riders: false, rest: 0 };
    return { riders: !!notes[j].ride, rest: restAfter(notes, i) };
  }
  /** D218: a held note gone on past the rest written after it (its tolerance included). */
  private overstays(h: Held): boolean {
    const n = this.tracks[h.k].notes[h.note];
    if (!n) return false;
    const { riders, rest } = this.after(h.note, h.k);
    if (riders || rest < this.beat / 4) return false;
    const len = this.msOf(n.on, n.on + n.dur);
    const restMs = this.msOf(n.on + n.dur, n.on + n.dur + rest);
    return this.msOf(n.on, this.now) > releaseVerdict(len, len, restMs).deadline;
  }
  /** D218: the end of a note struck right (let go, given way to the next, or held into a rest), judged once. */
  private judgeEnd(h: Held, off: number) {
    h.open = false;
    const notes = this.tracks[h.k].notes;
    const i = h.note;
    const n = notes[i];
    if (!n || n.state !== "hit") return;
    release(notes, i, off);
    this.lastOff = { k: h.k, i, tick: off };
    const { riders, rest } = this.after(i, h.k);
    if (riders) return;
    const len = this.msOf(n.on, n.on + n.dur);
    const restMs = rest >= this.beat / 4 ? this.msOf(n.on + n.dur, n.on + n.dur + rest) : 0;
    const r = releaseVerdict(len, this.msOf(n.on, off), restMs);
    const at = performance.now();
    const step = Math.max(...chordOf(notes, i).map((j) => notes[j].step));
    if (r.rest === "over") {
      // Held through the rest: the crowd cools, the chain is broken (no slip: the note was right).
      this.art.cleanOf++;
      this.chain = 0;
      this.crowd = Math.max(0, this.crowd - 0.03);
      this.flash = { text: "REST!", at, good: false, kind: "rest" };
      return;
    }
    let pts = 0;
    let word: ArtFlash | null = null;
    if (r.hold !== "none") this.art.heldOf++;
    if (r.hold === "short") {
      this.crowd = Math.max(0, this.crowd - 0.01);
      word = { text: "SHORT", at, good: false, kind: "short" };
    } else if (r.hold === "held") {
      this.art.held++;
      pts += holdBonus(n.dur / this.beat) * this.mult;
      word = { text: "HELD", at, good: true, kind: "held" };
    }
    if (r.rest !== "none") {
      this.art.cleanOf++;
      this.art.clean++;
      if (r.rest === "clean" && r.hold !== "short") {
        pts += this.mult;
        word = { text: word ? "HELD · CLEAN" : "CLEAN", at, good: true, kind: "clean" };
      }
    }
    if (pts) {
      this.score += pts;
      this.pops.push({ tick: n.on + n.dur, step, text: `+${pts}`, at, gold: false, ink: word?.kind === "clean" ? CLEAN_INK : HELD_INK });
    }
    if (word) this.flash = word;
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
    return this.lanesOf(0);
  }
  /** D217: a track's lanes (SUBJECT's second line has its own). */
  lanesOf(k: number): number[] {
    if (this.lanesMemo[k]) return this.lanesMemo[k];
    // D230, SCALE KEYS: the lane is the key's place (a raised or lowered note between two home lanes).
    const sk = k === 0 ? this.scale : null;
    if (sk) return (this.lanesMemo[k] = sk.map((x) => x.pos));
    const { notes, moves: mv } = this.tracks[k];
    const heads = notes.map((n, i) => !n.ride && !(i > 0 && notes[i - 1].on === n.on));
    // D252, BOTH HANDS: each hand planned in its own lanes (laneRegion), then placed there.
    if (this.hands) {
      const r = this.laneRegion(k);
      const freeH = notes.map((_, i) => this.isFree(i, k) && !this.spaceGem(i, k));
      const softH = notes.map((_, i) => this.soft(i, k));
      const local = planLanes(mv, heads, freeH, r.count, this.proto.id === "keys", softH);
      const plainH = notes.map((_, i) => heads[i] && !this.isFree(i, k) && !this.spaceGem(i, k));
      this.echoMemo[k] = echoHalves(this.f, notes, mv, heads, plainH, local, r.count);
      return (this.lanesMemo[k] = local.map((l) => l + r.from));
    }
    // D229: on a computer a repeat goes on in the lane of the note before (a SPACE gem), even after a rest (where any key still answers it).
    const free = notes.map((_, i) => this.isFree(i, k) && !this.spaceGem(i, k));
    const soft = notes.map((_, i) => this.soft(i, k));
    const lanes = planLanes(mv, heads, free, this.laneCount, this.proto.id === "keys", soft);
    // D244: a figure stated twice in a prelude's bar keeps its lanes the second time.
    const plain = notes.map((_, i) => heads[i] && !this.isFree(i, k) && !this.spaceGem(i, k));
    this.echoMemo[k] = echoHalves(this.f, notes, mv, heads, plain, lanes, this.laneCount);
    // D250: while the pedal is held in the first lane, the figure is laid in the others.
    const pl = k === 0 ? this.pedalList : [];
    if (pl.length) {
      const sub = planLanes(mv, heads, free, this.laneCount - 1, this.proto.id === "keys", soft);
      const echoSub = echoHalves(this.f, notes, mv, heads, plain, sub, this.laneCount - 1);
      const inSpan = (i: number) => pl.some((bp) => notes[i].on >= bp.on && notes[i].on < bp.end);
      notes.forEach((_, i) => {
        if (inSpan(i)) lanes[i] = sub[i] + 1;
      });
      this.echoMemo[k] = new Set([...this.echoMemo[k]].filter((i) => !inSpan(i)).concat([...echoSub].filter(inSpan)));
    }
    this.lanesMemo[k] = lanes;
    return lanes;
  }
  private lanesMemo: number[][] = [];
  private echoMemo: Set<number>[] = [];
  /** D250: the prelude's arc (arc.ts), if it has one. */
  readonly arc: Arc | undefined;
  /** D252: both hands played (the right hand track 0, the left track 1), each in its own lanes. */
  readonly hands: boolean = false;
  /** D252: a hand's lanes: the left hand the leftmost (two on a phone, four on the computer's keys), the right the rest. */
  laneRegion(k: number): { from: number; count: number } {
    const split = this.road ? 2 : 4;
    return k === 1 ? { from: 0, count: split } : { from: split, count: this.laneCount - split };
  }
  /** D252: the hand a lane belongs to (both hands), else the first track. */
  private laneTrack(lane: number): number {
    return this.hands && lane < this.laneRegion(0).from ? 1 : 0;
  }
  /** D252: the row a note asks for (rows: the repeat of a figure within its bar on the lower row, 1), else 0. */
  rowOf(i: number, k = 0): 0 | 1 {
    if (!this.arc?.rows || !this.road || !this.tracks[k]) return 0;
    const t = this.tracks[k];
    this.repeatMemo[k] ??= repeatHalves(this.f, t.notes, t.notes.map((n, j) => !n.ride && !(j > 0 && t.notes[j - 1].on === n.on)));
    return this.repeatMemo[k].has(i) ? 1 : 0;
  }
  private repeatMemo: Set<number>[] = [];
  /**
   * D250, THE PEDAL: the bass's long note held by the player in its own lane (the touch or key holding
   * it, from when, how long held so far, the share held at its end).
   */
  private pedalList: { on: number; end: number; midi: number; name: string; lane: number; id: number | null; from: number | null; held: number; announced: boolean; done: boolean; share: number; sounds: Sounding[] }[] = [];
  /** The pedal now or next (D252: the first not yet over), or null. */
  get bassPedal() {
    return this.pedalList.find((p) => !p.done) ?? null;
  }
  /** D252: every pedal (the painter's and the tests'). */
  get pedals() {
    return this.pedalList;
  }
  /** D250: the final chord's onset (both thumbs together: a bonus), and the touches on it. */
  private finalOn: number | undefined;
  private finalTouches: { id: number; ts: number }[] = [];
  /** D250: the final chord's onset while its bonus is still to win (the painter's cue). */
  get finalCue(): number | undefined {
    return this.finalDone ? undefined : this.finalOn;
  }
  private finalDone = false;
  /** D250: a touch (key) on the pedal's lane takes the pedal: true if it did. */
  private pedalTake(id: number, lane: number) {
    const p = this.bassPedal;
    if (!p || p.done || p.id !== null || lane !== p.lane || this.now < p.on - this.beat) return false;
    // Not while a note is due in that lane (the last before the pedal).
    const k = this.laneTrack(lane);
    const lanes = this.lanesOf(k);
    const due = this.tracks[k].notes.some((n, i) => n.state === "pending" && !n.ride && lanes[i] === lane && n.on <= this.now + this.opt.early && n.on >= this.now - this.opt.late);
    if (due) return false;
    p.id = id;
    p.from = Math.max(this.now, p.on);
    // D252: the big pedal begins to sound on the touch: a 16′ and 8′ bourdon under the bass, to the pedal's end.
    const at = Math.max(this.chip.ctx.currentTime, this.timeAt(p.from));
    const until = this.timeAt(p.end);
    const v = { timbre: "triangle" as const, pan: 0, gain: 1, patch: PATCHES.pedalBourdon };
    if (until > at) p.sounds = [this.chip.note(p.midi, at, until - at, v, { level: 1.2, lead: true }), this.chip.note(p.midi - 12, at, until - at, v, { level: 0.9, lead: true })];
    return true;
  }
  /** D250: the pedal let go: true if this touch (key) held it. */
  private pedalLeave(id: number, ts: number) {
    const p = this.pedalList.find((x) => x.id === id);
    if (!p) return false;
    for (const sd of p.sounds) sd.stop();
    p.sounds = [];
    if (p.from !== null && !p.done) p.held += Math.max(0, Math.min(this.tickOf(ts), p.end) - p.from);
    p.id = null;
    p.from = null;
    return true;
  }
  /**
   * D252: each new thing announced as it first comes (one new mechanic at a time, taught where it
   * begins): the lower row, a beat before its first note; the left hand, a bar before it joins.
   */
  private arcCues() {
    if (!this.arc || this.o.wait) return;
    const ahead = (on: number, by: number) => on - this.now <= by && on >= this.now;
    if (!this.cued.has("row") && this.arc.rows && this.road) {
      const i = this.notes.findIndex((n, j) => !n.ride && this.rowOf(j, 0) === 1);
      if (i >= 0 && ahead(this.notes[i].on, 2 * this.beat)) {
        this.cued.add("row");
        this.banner = { text: "THE FIGURE AGAIN: THE LOWER ROW", at: performance.now() };
      }
    }
    if (!this.cued.has("hands") && this.hands) {
      const first = this.tracks[1].notes.find((n) => !n.ride);
      if (first && ahead(first.on, this.f.barTicks)) {
        this.cued.add("hands");
        this.banner = { text: this.road ? "LEFT THUMB: THE LEFT HAND" : "LEFT KEYS: THE LEFT HAND", at: performance.now() };
      }
    }
  }
  private cued = new Set<string>();
  /** D250: the pedal's announcement two bars ahead, its end scored (a bonus by the share held). */
  private pedalStep() {
    const p = this.bassPedal;
    if (!p || p.done) return;
    if (!p.announced && this.now >= p.on - 2 * this.f.barTicks) {
      p.announced = true;
      const key = "ASDF"[p.lane] ?? "A";
      this.banner = { text: this.road ? `LEFT THUMB: HOLD THE ${p.name} PEDAL` : `HOLD ${key}: THE ${p.name} PEDAL`, at: performance.now() };
    }
    if (this.now < p.end) return;
    if (p.from !== null) p.held += Math.max(0, p.end - p.from);
    p.from = p.id !== null ? p.end : null;
    p.done = true;
    p.share = Math.min(1, p.held / Math.max(1, p.end - p.on));
    const bonus = Math.round(40 * p.share) * this.mult;
    this.score += bonus;
    this.pops.push({ tick: p.end, step: 0, text: `PEDAL ${Math.round(p.share * 100)}%${bonus ? ` +${bonus}` : ""}`, at: performance.now(), gold: p.share >= 0.9 });
  }
  /** D250: a strike near the final chord: two touches (keys) together score its bonus. */
  private finalStrike(id: number, ts: number) {
    if (this.finalOn === undefined || this.finalDone || Math.abs(this.now - this.finalOn) > this.beat) return;
    this.finalTouches = this.finalTouches.filter((x) => ts - x.ts < 150 && x.id !== id);
    this.finalTouches.push({ id, ts });
    if (this.finalTouches.length < 2) return;
    this.finalDone = true;
    const bonus = 20 * this.mult;
    this.score += bonus;
    this.pops.push({ tick: this.finalOn, step: 0, text: `BOTH HANDS +${bonus}`, at: performance.now(), gold: true });
  }
  /** D247: LADDER's row for judging a touch: the box's, but no smaller than LADDER_ROW_MIN (the whole piece in the box). */
  get ladderRow(): number {
    return Math.max(this.rows?.rowH ?? LADDER_ROW_MIN, LADDER_ROW_MIN);
  }
  /** D244: the notes of a track that repeat the first half of their bar (their lanes the first half's). */
  echoOf(k = 0): Set<number> {
    this.lanesOf(k);
    return this.echoMemo[k] ?? new Set();
  }

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
    // D252: no coupling left on for the next game; the pedals' bourdons stopped.
    if (this.chip.coupling) this.chip.coupling = { up: 0, down: 0, split: 48 };
    for (const p of this.pedalList) for (const sd of p.sounds) sd.stop();
    for (const b of this.band) b.sd.stop();
    this.band = [];
    for (const sd of this.pedalled) sd.stop();
    this.pedalled = [];
    for (const h of this.held.values()) for (const sd of [...h.sounds, ...(h.fx ?? [])]) sd.stop();
    this.held.clear();
    // D223: the notes sounded ahead.
    for (const a of this.armed.values()) {
      for (const sd of [...a.sounds, ...a.riders]) sd.stop();
      // Closed once the notes' release has passed (closed at once, it would click).
      setTimeout(a.gate.close, 300);
    }
    this.armed.clear();
  }

  /** The notes (a chord once): played right, played wrong, missed; the score, the entries captured. */
  /** Strikes on no note. */
  stray = 0;
  results(): { right: number; wrong: number; missed: number; stray: number; of: number; score: number; grade: string; captured: number; entries: number; maxStreak: number; stars: number; failedBar: number | null; art: ArtStats; lanes: { exact: number; relative: number } } {
    const r = { right: 0, wrong: 0, missed: 0, stray: this.stray, of: 0, score: Math.floor(this.score), grade: "", captured: this.entries.filter((e) => e.state === "captured").length, entries: this.entries.length, maxStreak: this.maxStreak };
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
    return { ...r, art: { ...this.art }, lanes: { ...this.laneTally }, stars: this.failedAt !== null ? 0 : this.starsOf(r.score, r.of), failedBar: this.failedAt !== null ? barAt(this.f, this.failedAt) : null };
  }
}
