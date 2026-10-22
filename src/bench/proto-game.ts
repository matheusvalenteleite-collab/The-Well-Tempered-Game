/**
 * The testbench's game (D175; D178; D179): one voice of a piece played against the others, judged by
 * a prototype (protos.ts). The time picks the note (the pending one nearest in time, within the
 * window); the place judges it: right, Bach's note sounds; wrong, what was asked for sounds, muffled
 * (the PIANO's wrong key, plain), and it does not count. A held thumb slid onto the next note's place
 * plays it; a thumb moved across the dynamic axis while its note sounds swells or fades it; a thumb
 * flicked upwards as it lets go sends its note off with a swoosh. The player's voice is the lead
 * (chip.ts leadOf). It can also be played from a computer's keys or a MIDI keyboard. On the audio
 * clock as heard; the others phrased (phrasing.ts); a band's rhythm section keeps the beat.
 */
import { voicing, type Chip, type Play, type Sounding } from "../touch/chip.ts";
import type { Grade } from "../touch/engine.ts";
import { beatOf, keyAt, type TouchFugue } from "../touch/fugue.ts";
import { chordOf, laneNotes, options, strike, sweep, type LaneNote, type LaneOptions } from "../touch/lanes.ts";
import type { Keyboard } from "../touch/piano.ts";
import { phrase, type Shape } from "../touch/phrasing.ts";
import type { Side } from "../touch/thumbs.ts";
import { accompaniment, subjectMarks, type OtherNote } from "../touch/voice-mode.ts";
import { aim, columnAt, COLUMNS, pianoKey, pianoKeys } from "./placed.ts";
import { barDynamic, dynamic, levelOf, moves, stepNear, stepPitch, thumbsVerdict, type Move, type Options, type Proto } from "./protos.ts";

export const PERFECT_MS = 70;
/** How far ahead the next note shows, in ms. */
export const APPROACH_MS = 1100;
const HOLD_MAX = 8;
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
  /** The hand (TWO VOICES: which voice). */
  side?: Side;
  midi?: number;
  move?: { dir: number; big: boolean };
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
  /** Its last positions, for a flick. */
  trail: { t: number; y: number }[];
}

/** A touch as the music box shows it: when, at what step (the one asked for), right or wrong. */
export interface Mark {
  tick: number;
  step: number;
  ok: boolean;
}

type Verdict = { ok: boolean; wrong?: number; why?: "gesture" | "legato" };

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
  readonly tps: number;
  readonly opt: LaneOptions;
  readonly proto: Proto;
  readonly o: Options;
  /** The sideways PIANO's keyboard. */
  readonly kb: Keyboard;
  /** LADDER: the box's rows, as laid out now. */
  rows: Rows | null = null;
  now = 0;
  combo = 0;
  grade: Grade | null = null;
  /** SIDEWAYS: the window's middle (a staff step, fractional), following the passage. */
  pan = 0;
  /** The touches, for the music box. */
  readonly marks: Mark[] = [];
  private chip: Chip;
  private beat: number;
  private perBar: number;
  private anchorAt: number;
  private anchorTick: number;
  private nextBeat: number;
  private nextOther = 0;
  private readonly shapes: Shape[];
  private held = new Map<number, Held>();
  private stepAt = 0;

  constructor(f: TouchFugue, voices: number | number[], from: number, proto: Proto, o: Options & { bpm: number }, chip: Chip) {
    this.f = f;
    this.proto = proto;
    this.o = o;
    this.chip = chip;
    const b = beatOf(f);
    this.beat = b.ticks;
    this.perBar = b.perBar;
    this.tracks = (Array.isArray(voices) ? voices : [voices]).map((v) => {
      const notes = laneNotes(
        f.voices[v].filter(([on]) => on >= from),
        this.beat,
        v,
      );
      return { voice: v, notes, moves: moves(notes, this.beat) };
    });
    [{ voice: this.voice, notes: this.notes, moves: this.moves }] = this.tracks;
    const played = this.tracks.map((t) => t.voice);
    this.others = accompaniment(f, from, played[0]).filter((n) => !played.includes(n.voice));
    this.shapes = phrase(this.others, this.beat, f.barTicks, subjectMarks(f).subject);
    this.start = from - 4 * this.beat;
    this.entry = from;
    this.end = f.length + this.beat;
    this.tps = (this.beat * o.bpm) / 60;
    this.opt = options(this.beat, o.bpm, "easy");
    this.anchorAt = chip.ctx.currentTime + 0.15;
    this.anchorTick = this.start;
    this.nextBeat = this.start;
    this.kb = pianoKeys(this.notes);
    this.pan = aim(this.notes, from, f.barTicks) ?? this.notes[0].step;
  }

  private tickAt(t: number) {
    return this.anchorTick + (t - this.anchorAt) * this.tps;
  }
  private timeAt(tick: number) {
    return this.anchorAt + (tick - this.anchorTick) / this.tps;
  }
  private tickOf(ts: number) {
    return this.tickAt(this.chip.heard() - (performance.now() - ts) / 1000);
  }

  /** One frame: the beat (or the band) and the others scheduled ahead; the window panned; notes gone by marked missed. True at the end. */
  step(): boolean {
    const ch = this.chip;
    this.now = this.tickAt(ch.heard());
    const horizon = Math.min(this.tickAt(ch.ctx.currentTime + 0.25), this.end);
    while (this.nextBeat <= horizon) {
      const n = Math.round((this.nextBeat - this.start) / this.beat);
      const accent = n % this.perBar === 0;
      // D177: past the count-in, a band's rhythm section plays the beat instead of the click.
      const compound = this.beat !== this.f.tpq * (4 / Number(this.f.meter.split("/")[1]));
      const band = this.nextBeat >= this.entry && ch.groove?.(this.timeAt(this.nextBeat), this.beat / this.tps, n % this.perBar, Math.floor(n / this.perBar), this.perBar, compound);
      if (!band) ch.tick(this.timeAt(this.nextBeat), accent, this.nextBeat < this.entry ? 0.12 : 0.02);
      this.nextBeat += this.beat;
    }
    while (this.nextOther < this.others.length && this.others[this.nextOther].on <= horizon) {
      const n = this.others[this.nextOther++];
      if (n.on < this.now - this.beat) continue;
      const sh = this.shapes[this.nextOther - 1];
      ch.note(n.midi, Math.max(ch.ctx.currentTime, this.timeAt(n.on) + sh.nudge), (n.dur * sh.hold) / this.tps, voicing(n.voice, this.f.voices.length, false), { level: sh.level });
    }
    // SIDEWAYS: the window glides towards the passage ahead (on the audio clock), always holding the next note.
    const clock = ch.ctx.currentTime;
    const dt = this.stepAt ? Math.max(0, Math.min(0.1, clock - this.stepAt)) : 0;
    this.stepAt = clock;
    const target = aim(this.notes, this.now, this.f.barTicks);
    if (target !== null) this.pan += (target - this.pan) * Math.min(1, dt * 1.5);
    const nx = this.next();
    if (nx >= 0) {
      const room = COLUMNS / 2 - 1;
      this.pan = Math.max(this.notes[nx].step - room, Math.min(this.notes[nx].step + room, this.pan));
    }
    if (this.tracks.map((t) => sweep(t.notes, this.now, this.opt)).some(Boolean)) {
      this.combo = 0;
      this.grade = { text: "MISS", at: performance.now() };
    }
    if (this.now > this.end) {
      this.stopAll();
      return true;
    }
    return false;
  }

  countIn(): number {
    return this.now < this.entry ? Math.min(4, Math.ceil((this.entry - this.now) / this.beat)) : 0;
  }

  keyNow(): string {
    return keyAt(this.f, this.now);
  }

  /** The next note to play (index) in a voice (the first by default), if any. */
  next(k = 0): number {
    const notes = this.tracks[k].notes;
    return notes.findIndex((n, i) => n.state === "pending" && n.on >= this.now - this.opt.late && !(i > 0 && notes[i - 1].on === n.on));
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

  /** The place under a touch: LADDER a row and SIDEWAYS a column (staff steps), the PIANO a key. */
  cellAt(c: Contact): number | undefined {
    if (this.proto.id === "sideways") return columnAt(c.x, this.pan, c.w);
    if (this.proto.id === "piano") return pianoKey(this.kb, c.x / c.w, c.y / c.h);
    if (this.proto.id === "ladder" && this.rows) return this.rows.stepAt(c.y);
    return undefined;
  }

  /** The dynamic of a touch, 0 (pp) to 1 (ff). */
  dynamicAt(c: Contact): number {
    if (this.proto.layout === "bars") return barDynamic(c.x, c.w);
    if (this.proto.id === "sideways") return 1 - c.y / c.h;
    return 0.55;
  }

  /** The note before note i (the top of its chord), in a voice. */
  private before(i: number, k = 0): number {
    const notes = this.tracks[k].notes;
    let j = i - 1;
    while (j >= 0 && notes[j].on === notes[i].on) j--;
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
    // TWO VOICES: the time only.
    if (this.proto.id === "duo") return { ok: true };
    if (at.key?.midi !== undefined) {
      const k = at.key.midi;
      const ok = this.proto.id === "piano" ? chord.some((x) => x.midi === k) : chord.some((x) => Math.abs(stepNear(k, x) - x.step) <= 1);
      return ok ? { ok } : { ok, wrong: k, why: "gesture" };
    }
    if (at.key?.move) {
      const mv = at.key.move;
      if (m.size < 0) return { ok: true };
      const ok = mv.dir === m.dir && (m.dir === 0 || mv.big === m.size >= 2);
      return ok ? { ok } : { ok, wrong: asked(mv.dir * (mv.big ? 3 : 1)), why: "gesture" };
    }
    const c = at.c!;
    switch (this.proto.id) {
      case "ladder": {
        if (!this.rows) return { ok: true };
        const near = Math.max(1.5 * this.rows.rowH, 20);
        if (chord.some((x) => Math.abs(c.y - this.rows!.yOf(x.step)) <= near)) return { ok: true };
        return { ok: false, wrong: stepPitch(this.rows.stepAt(c.y), n), why: "gesture" };
      }
      case "thumbs": {
        const v = thumbsVerdict(m, c.side);
        return v.ok ? { ok: true } : { ok: false, wrong: v.steps === undefined ? undefined : asked(v.steps), why: "gesture" };
      }
      case "sideways": {
        const col = columnAt(c.x, this.pan, c.w);
        return chord.some((x) => Math.abs(x.step - col) <= 1) ? { ok: true } : { ok: false, wrong: stepPitch(col, n), why: "gesture" };
      }
      case "piano": {
        const key = pianoKey(this.kb, c.x / c.w, c.y / c.h);
        return chord.some((x) => x.midi === key) ? { ok: true } : { ok: false, wrong: key, why: "gesture" };
      }
    }
  }

  /** SIDEWAYS LEGATO: a note joined in the score must be struck while the note before still sounds under another thumb (or key). */
  private legatoOk(i: number, id: number): boolean {
    if (this.proto.id !== "sideways" || !this.o.legato || !this.moves[i].joined) return true;
    const prev = this.before(i, 0);
    for (const [hid, h] of this.held) if (hid !== id && h.sounds.length && h.chord.includes(prev)) return true;
    return false;
  }

  down(id: number, c: Contact, ts: number) {
    const d = this.dynamicAt(c);
    const h: Held = { side: c.side, k: this.trackOf(c.side), x0: c.x, ax: c.x, ay: c.y, note: -1, chord: [], sounds: [], midi: 0, cell: this.cellAt(c), d0: d, trail: [{ t: ts, y: c.y }] };
    this.held.set(id, h);
    this.strikeWith(id, h, ts, { c }, d);
  }

  /** A computer key or a MIDI key goes down. */
  keyDown(id: number, k: KeyPress, ts: number) {
    const d = k.velocity ?? 0.6;
    const h: Held = { side: k.side ?? "left", k: this.trackOf(k.side ?? "left"), x0: 0, ax: 0, ay: 0, note: -1, chord: [], sounds: [], midi: 0, cell: k.midi, d0: d, trail: [] };
    this.held.set(id, h);
    this.strikeWith(id, h, ts, { key: k }, d);
  }

  keyUp(id: number, ts: number) {
    this.up(id, ts);
  }

  private strikeWith(id: number, h: Held, ts: number, at: { c?: Contact; key?: KeyPress }, d: number) {
    const i = strike(this.tracks[h.k].notes, this.tickOf(ts), this.opt);
    if (i < 0) {
      this.grade = { text: "✕", at: performance.now(), side: h.side, why: "time" };
      // A keyboard: the key struck is heard all the same.
      const key = at.key?.midi ?? (this.proto.id === "piano" ? h.cell : undefined);
      if (key !== undefined) {
        h.midi = key;
        h.sounds = [this.chip.note(key, this.chip.ctx.currentTime, HOLD_MAX, voicing(this.tracks[h.k].voice, this.f.voices.length, true), { ...dynamic(d), lead: true, envelope: "piano" })];
      }
      return;
    }
    let v = this.verdict(i, at, h.k);
    if (v.ok && !this.legatoOk(i, id)) v = { ok: false, why: "legato" };
    this.play(id, h, i, v, false, d);
  }

  move(id: number, c: Contact, ts: number) {
    const h = this.held.get(id);
    if (!h) return;
    h.trail.push({ t: ts, y: c.y });
    while (h.trail.length > 2 && ts - h.trail[0].t > 120) h.trail.shift();
    // Across the dynamic axis while it sounds: a swell or a diminuendo.
    const d = this.dynamicAt(c);
    for (const s of h.sounds) s.dyn?.(levelOf(d) / levelOf(h.d0));
    const t = this.tickOf(ts);
    if (this.proto.id === "ladder" && this.rows) {
      if (Math.abs(c.y - h.ay) < this.rows.rowH * 0.8) return;
      const cell = this.rows.stepAt(c.y);
      if (cell === h.cell) return;
      h.cell = cell;
      this.slideTo(id, h, c, t);
    } else if (this.proto.id === "sideways" || this.proto.id === "piano") {
      // Only the thumb's own travel counts (the window moving under a still thumb does not).
      const unit = this.proto.id === "sideways" ? c.w / COLUMNS : c.w / this.kb.whites / 2;
      if (Math.abs(c.x - h.ax) < unit * 0.6) return;
      const cell = this.cellAt(c);
      if (cell === h.cell) return;
      h.cell = cell;
      h.ax = c.x;
      this.slideTo(id, h, c, t);
    }
  }

  /** A held thumb reaches another place: the next note there, if it is there and due. */
  private slideTo(id: number, h: Held, c: Contact, t: number) {
    const i = strike(this.tracks[h.k].notes, t, this.opt, (j) => !h.chord.includes(j) && this.verdict(j, { c }, h.k).ok);
    if (i < 0) return;
    h.ay = c.y;
    this.play(id, h, i, { ok: true }, true, this.dynamicAt(c));
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
        this.chip.swoosh(h.midi, voicing(this.tracks[h.k].voice, this.f.voices.length, true), levelOf(h.d0));
        return;
      }
    }
    for (const sd of h.sounds) sd.stop();
  }

  /** Sounds note i (or what was asked for instead, muffled) and grades it. A slide glides on; the piano strikes again. */
  private play(id: number, h: Held, i: number, v: Verdict, slide: boolean, d: number) {
    const notes = this.tracks[h.k].notes;
    const voiceV = voicing(this.tracks[h.k].voice, this.f.voices.length, true);
    const piano = this.proto.id === "piano";
    const chord = chordOf(notes, i);
    const expr: Play = { ...dynamic(d), muffleable: true, lead: true, envelope: piano ? "piano" : "synth" };
    const pitches = v.ok || v.wrong === undefined ? chord.map((j) => notes[j].midi) : [v.wrong];
    if (slide && !piano && h.sounds.length === 1 && pitches.length === 1) {
      h.sounds[0].glide?.(pitches[0]);
    } else {
      for (const sd of h.sounds) sd.stop();
      // Joined to the note the other thumb still holds: that one gives way.
      let legato = slide;
      for (const [hid, o] of this.held) {
        if (hid === id || !o.sounds.length || o.k !== h.k) continue;
        legato = true;
        for (const sd of o.sounds) sd.stop(this.chip.ctx.currentTime + 0.03);
        o.sounds = [];
      }
      h.sounds = pitches.map((m) => this.chip.note(m, this.chip.ctx.currentTime, HOLD_MAX, voiceV, { ...expr, legato: legato && !piano }));
      if (!v.ok && !(piano && v.wrong !== undefined)) for (const sd of h.sounds) sd.muffle?.();
    }
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
      this.grade = { text: "✕", at, side: h.side, why: v.why === "legato" ? "legato" : "gesture" };
      return;
    }
    const offMs = (((n.at ?? n.on) - n.on) / this.tps) * 1000;
    this.combo++;
    this.grade = Math.abs(offMs) <= PERFECT_MS ? { text: "PERFECT", at, side: h.side } : { text: "GOOD", lean: offMs < 0 ? -1 : 1, at, side: h.side };
  }

  stopAll() {
    for (const h of this.held.values()) for (const sd of h.sounds) sd.stop();
    this.held.clear();
  }

  /** The notes (a chord once): played right, played wrong, missed. */
  results(): { right: number; wrong: number; missed: number; of: number } {
    const r = { right: 0, wrong: 0, missed: 0, of: 0 };
    for (const { notes } of this.tracks)
      notes.forEach((n, i) => {
        if (i > 0 && notes[i - 1].on === n.on) return;
        r.of++;
        if (n.state === "hit") r.right++;
        else if (n.wrong) r.wrong++;
        else r.missed++;
      });
    return r;
  }
}
