/**
 * D497, THE SOUND LAB's engine: the game's own (ProtoGame, Chip, the samples, the readings, the balance, the form, the
 * drums), run as Herr Bach's demonstration (Options.demo: his thumbs play the voice a player would, through the
 * player's own path), so every voice sounds as in a run with no touch needed. Nothing is forked: the lab sets the same
 * switches the game sets (sound.ts setPreset, setBacking, drum-presets.ts setDrumPreset, tuning) and the five lab hooks
 * (ProtoGame.labGain, colour.ts setColourPlansOn, fugue-form.ts setClimaxLayer, sound.ts setOwnKit, sampled.ts
 * loadPlanKeep), which the game never touches. It writes nothing to the device's storage (the game's keys untouched).
 *
 * LIVE (the music runs on; applied to the next note or beat scheduled, at most about half a second ahead): DRUMS on/off
 * and STYLE, the subject/episode layer (D513), the climax build, the colour plans, a band's own kit, solo, mute and the
 * mixer. RELAUNCHED at the same tick (the game is built anew there: about one beat's silent lead, at most 0.6 s): the
 * SOUND (its layout, the balance and the plans are a piece's constants, read once as a run starts), BUSONI (the reading
 * shapes the whole plan), the TEMPO (the clock), the voice Herr Bach plays, the piece; and every seek.
 */
import { Chip } from "../../touch/chip.ts";
import { openingOf, soundPlans } from "../../touch/chip.ts";
import { barAt, barStart, everyNote, fugueById, type TouchFugue } from "../../touch/fugue.ts";
import { baseSound, V2_PRESETS, preset, PRESETS, presetById, setBacking, setDrums, setOwnKit, setPieceLayout, setPreset, TRIALS, playerSound, pieceLayoutNow } from "../../touch/sound.ts";
import { loadPlanKeep, type Plan } from "../../touch/sampled.ts";
import { setDrumStyle } from "../../touch/drum-library.ts";
import { padChoice, padStyle } from "./drum-pad.ts";
import { setClimaxLayer, setFormLayer } from "../../touch/fugue-form.ts";
import { setColourPlansOn } from "../../touch/colour.ts";
import { PIECE_SOUND } from "../../touch/piece-sound.ts";
import { wholeReadingOf } from "../../touch/readings.ts";
import { tempoOf } from "../../touch/tempi.ts";
import { setTuning } from "../../touch/tuning.ts";
import { resolveTuning } from "../../touch/instrument-tuning.ts";
import { voicesFrom } from "../../touch/voice-mode.ts";
import { chromaLiftPx, signatureOf } from "../../touch/chroma.ts";
import { TRIO_ID, trioLayout } from "../../touch/trio.ts";
import { ProtoGame, type Rows } from "../proto-game.ts";
import { protoById, type Options } from "../protos.ts";
import { defaultVoice } from "../flow.ts";
import { stepTempi } from "../tempo-steps.ts";
import { mineGain, readTools } from "../practice.ts";
import { readLite } from "../lite.ts";
import { audible, changeKind, voiceGain, type LabSettings } from "./lab-state.ts";

/** The 48 fugues, Book I then Book II. */
export const FUGUES: readonly string[] = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
/** Every sound the lab offers: the players' (PRESETS), then the trials'. */
export const LAB_SOUNDS = [...PRESETS, ...TRIALS, ...V2_PRESETS].map((p) => ({ id: p.id, name: p.name, trial: TRIALS.includes(p), v2: V2_PRESETS.includes(p) }));

/** The sound a setting plays (the fugue's own where none is chosen; a trial by its own id). */
export function soundOf(s: LabSettings): string {
  if (s.sound && LAB_SOUNDS.some((x) => x.id === s.sound)) return s.sound;
  if (s.sound) return playerSound(s.sound);
  return playerSound(PIECE_SOUND[s.piece] ?? "chip");
}
/** The voice Herr Bach plays: the one chosen, else the game's first offer (play.html's for a fugue not yet finished: the second to enter). */
export function bachVoice(f: TouchFugue, s: LabSettings): number {
  const singing = voicesFrom(f, 0);
  return s.voice !== null && singing.includes(s.voice) ? s.voice : defaultVoice(f, singing, { fresh: true });
}
/** The tempo (quarter notes a minute) of a step. */
export function bpmOf(id: string, step: LabSettings["tempo"]): number {
  const t = stepTempi(id);
  return step === "default" || !t ? tempoOf(id) : t[step];
}

/** The rows Herr Bach's thumbs aim by (CLASSIC's, D332's chromatic shift in them, as the game's box draws them). */
function rowsFor(f: TouchFugue): Rows {
  const sig = signatureOf(f.key);
  const rh = 12;
  return { yOf: (st) => 1200 - st * rh, stepAt: (y) => Math.round((1200 - y) / rh), rowH: rh, xOf: () => 400, lift: (st, m) => chromaLiftPx(rh, st, m, sig) };
}

/** The recordings a sound and the drums need for a piece (as Chip.prepare asks them, nothing let go); `drums` the style (D530 padStyle), null off; a number: D497's drums 0-3. */
export function planOf(soundId: string, f: TouchFugue, voice: number, drums: string | null | number): Plan {
  const was = preset();
  const wasLayout = pieceLayoutNow();
  setPreset(soundId);
  const tl = baseSound(soundId) === TRIO_ID ? trioLayout(f) : null;
  setPieceLayout(tl ? { preset: soundId, count: tl.count, slots: tl.slots } : null);
  const pitches = everyNote(f).map((n) => n[2]);
  const lead = (f.voices[voice] ?? []).map((n) => n[2]);
  // D526: the style's files, whatever its engine (D530: the style the pad chose, else the sound's HOME).
  const style = typeof drums === "number" ? padStyle({ piece: f.id, drums, style: null }, soundId) : drums;
  // D542: as the game plans it (chip.ts soundPlans: a v2's slimming, zones and one layer too; the style's drums), the opening first.
  const plan: Plan = soundPlans(pitches, lead, style ?? null, openingOf(f))
    .flat()
    .filter((e) => e.notes.length);
  setPreset(was);
  setPieceLayout(wasLayout);
  // (The zones and the held-off layers are the sound heard now's again: soundPlans set them for this one.)
  soundPlans(pitches, lead, null);
  return plan;
}

export interface LabStatus {
  playing: boolean;
  loading: boolean;
  /** The tick heard now (or where play will start). */
  tick: number;
  bar: number;
  /** The last seek or relaunch: ms from asking to the first note's time, and the engine's build. */
  seekMs: number | null;
  buildMs: number | null;
  /** The audio clock (s), for the checks. */
  audioTime: number;
  sound: string;
  bach: number;
  bpm: number;
  error: string | null;
}

export class LabEngine {
  chip: Chip | null = null;
  game: ProtoGame | null = null;
  private opts: (Options & { bpm: number }) | null = null;
  s: LabSettings;
  f: TouchFugue;
  private pos = 0;
  private playing = false;
  private loading = false;
  private raf = 0;
  private seekAt: number | null = null;
  private seekFrom = 0;
  seekMs: number | null = null;
  /** Every seek's time (ms), for the checks. */
  readonly seekLog: number[] = [];
  buildMs: number | null = null;
  private error: string | null = null;
  /** A section looped (ticks [from, to)), or null. */
  loop: { from: number; to: number } | null = null;
  private listeners = new Set<() => void>();
  private gen = 0;

  constructor(s: LabSettings) {
    this.s = s;
    this.f = fugueById(s.piece);
  }

  on(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    for (const fn of this.listeners) fn();
  }

  status(): LabStatus {
    const tick = this.tick();
    return { playing: this.playing, loading: this.loading, tick, bar: barAt(this.f, Math.max(0, tick)), seekMs: this.seekMs, buildMs: this.buildMs, audioTime: this.chip?.ctx.currentTime ?? 0, sound: soundOf(this.s), bach: bachVoice(this.f, this.s), bpm: bpmOf(this.f.id, this.s.tempo), error: this.error };
  }
  tick(): number {
    return this.game && this.playing ? Math.max(this.seekFrom, Math.min(this.f.length, this.game.now)) : this.pos;
  }

  /** The audio started (from a tap: a browser starts sound only from one). */
  ensureChip(): Chip {
    if (!this.chip) {
      this.chip = new Chip();
      this.chip.setVolume(readLite().volume);
    }
    void this.chip.resume();
    return this.chip;
  }

  /** The game's switches set as a run of this piece and setting would set them. */
  private applyGlobals() {
    const s = this.s;
    const snd = soundOf(s);
    setPreset(snd);
    const t = resolveTuning("instrument", snd);
    setTuning(t.id, t.a);
    // play.html's DRUMS (LiteDrums.tsx applyLiteDrums): CLASSIC CHIP's own loop off, the backing on or off; the style chosen.
    setDrums(false);
    setBacking(s.drums > 0);
    if (s.drums > 0) setDrumStyle(s.piece, padChoice(s, snd));
    setFormLayer(s.form);
    setClimaxLayer(s.climax);
    setColourPlansOn(s.colour);
    setOwnKit(s.kit);
  }

  /** The live part: the switches above, the drums' recordings asked for, the voices' gains. */
  private applyLive() {
    this.applyGlobals();
    const g = this.game;
    const ch = this.chip;
    if (!g || !ch || !this.opts) return;
    const n = this.f.voices.length;
    const bach = bachVoice(this.f, this.s);
    const heard = audible(this.s, n);
    this.opts.mute = heard.flatMap((on, v) => (on || v === bach ? [] : [v]));
    g.labGain = this.f.voices.map((_, v) => voiceGain(this.s, v, n));
    ch.mine.gain.value = mineGain(readTools(this.f).balance, null) * g.lift * voiceGain(this.s, bach, n);
    if (this.s.drums > 0) ch.drumsFor(this.f);
  }

  /** The recordings of the setting (and, where given, another sound's: the A/B's), awaited. */
  async load(extra: { sound: string | null; drums: number; style?: string | null }[] = []): Promise<void> {
    const ch = this.ensureChip();
    const phone = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    const bach = bachVoice(this.f, this.s);
    const styleOf = (x: { sound: string | null; drums: number; style?: string | null }) => padStyle({ piece: this.s.piece, drums: x.drums, style: x.style ?? null }, soundOf({ ...this.s, sound: x.sound }));
    const plans = [planOf(soundOf(this.s), this.f, bach, styleOf(this.s)), ...extra.map((x) => planOf(soundOf({ ...this.s, sound: x.sound }), this.f, bach, styleOf(x)))];
    this.loading = true;
    this.emit();
    try {
      for (const p of plans) await loadPlanKeep(ch.ctx, p, phone);
    } finally {
      this.loading = false;
      this.emit();
    }
  }

  /** The game built at a tick and run (Herr Bach's demonstration from there). */
  private launch(from: number) {
    const ch = this.ensureChip();
    this.stopGame();
    this.applyGlobals();
    const f = this.f;
    const t0 = performance.now();
    const bach = bachVoice(f, this.s);
    const reading = this.s.busoni ? wholeReadingOf(f.id) : null;
    this.opts = { bpm: bpmOf(f.id, this.s.tempo), legato: false, fail: false, demo: true, ornHint: false, reading, mute: [] };
    const g = new ProtoGame(f, [bach], from, protoById("ladder"), this.opts, ch);
    g.rows = rowsFor(f);
    this.game = g;
    this.buildMs = performance.now() - t0;
    this.seekFrom = from;
    this.applyLive();
    this.playing = true;
    const gen = ++this.gen;
    const loop = () => {
      if (gen !== this.gen) return;
      const ended = g.step();
      if (this.seekAt !== null && g.now >= this.seekFrom) {
        this.seekMs = performance.now() - this.seekAt;
        this.seekLog.push(this.seekMs);
        this.seekAt = null;
      }
      if (this.loop && g.now >= this.loop.to) return void this.relaunch(this.loop.from);
      if (ended) {
        this.playing = false;
        this.pos = 0;
        this.game = null;
        this.emit();
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.emit();
  }
  private stopGame() {
    this.gen++;
    cancelAnimationFrame(this.raf);
    this.game?.stopAll();
    this.game = null;
  }
  private relaunch(from: number) {
    this.seekAt = performance.now();
    this.seekMs = null;
    this.pos = from;
    this.launch(from);
  }

  async play(): Promise<void> {
    if (this.playing) return;
    this.ensureChip();
    this.error = null;
    try {
      await this.load();
    } catch (e) {
      this.error = String(e);
    }
    this.seekAt = performance.now();
    this.launch(this.pos);
  }
  pause() {
    if (!this.playing) return;
    this.pos = this.tick();
    this.playing = false;
    this.stopGame();
    this.emit();
  }
  toggle() {
    if (this.playing) this.pause();
    else void this.play();
  }
  /** To a tick (a bar's start, a section's): at once, playing or not. */
  seek(tick: number) {
    const t = Math.max(0, Math.min(this.f.length - 1, Math.round(tick)));
    if (this.playing) this.relaunch(t);
    else {
      this.pos = t;
      this.emit();
    }
  }
  seekBar(bar: number) {
    this.seek(barStart(this.f, bar));
  }

  /** A new setting: live where it can be, else the game rebuilt at the tick heard (once the recordings are in). */
  async set(next: LabSettings, extra: { sound: string | null; drums: number; style?: string | null }[] = []): Promise<void> {
    const kind = changeKind(this.s, next);
    if (kind === "none") return;
    const pieceChanged = next.piece !== this.s.piece;
    const at = pieceChanged ? 0 : this.tick();
    this.s = next;
    if (pieceChanged) {
      this.f = fugueById(next.piece);
      this.loop = null;
    }
    if (kind === "live") {
      this.applyLive();
      if (this.playing && next.drums > 0) void this.load().catch(() => {});
      this.emit();
      return;
    }
    if (!this.playing) {
      this.pos = at;
      this.applyGlobals();
      this.emit();
      return;
    }
    await this.load(extra).catch(() => {});
    // (Paused or moved on meanwhile: the latest wins.)
    if (!this.playing || this.s !== next) return;
    this.relaunch(pieceChanged ? 0 : at);
  }

  /** D531: a whole setting loaded and played from a bar (an IDEA): the old run stopped, the recordings awaited, then the bar. */
  async start(next: LabSettings, bar: number): Promise<void> {
    this.pause();
    await this.set(next);
    this.seekBar(bar);
    await this.play();
  }

  /** Whether the fugue has Busoni's whole reading at all. */
  hasBusoni(): boolean {
    return !!wholeReadingOf(this.f.id)?.whole;
  }
  dispose() {
    this.stopGame();
    this.playing = false;
  }
}

/** A preset's name by id. */
export const soundName = (id: string) => presetById(id).name;
