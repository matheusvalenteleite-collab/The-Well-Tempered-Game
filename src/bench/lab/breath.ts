/**
 * D323, THE LAB's BREATH (the owner: "the possibility of integrating microphone as a breath controller
 * … we may try out a prototype in the LAB (a blockflute or traverso, for example)"). A wind instrument
 * played as a wind player plays: the THUMBS FINGER (choose the pitch), the BREATH SOUNDS. No breath, no
 * sound; blowing harder is louder and brighter (and, on the recorder, a little sharp); a thumb moving
 * to another note while the breath goes on is a slur (no new attack); a TONGUE in the breath ("tu",
 * "du", "di-dl") re-articulates the note the thumb holds.
 *   - The pitch: ROWS (FREE PLAY's rows: the key's notes or every semitone round the voice's range, the
 *     row under the thumb, a thumb moving to another row re-fingering) or THE VOICE'S NOTES (the
 *     passage's notes of the chosen voice in order: each thumb landing fingers the next one, as Ocarina
 *     2's songbook advances, no clock: the breath decides when and how each sounds).
 *   - The breath: breath-mic.ts → breath-dsp.ts (envelope, blow-ness, gate, tongue) → breath-voice.ts.
 *   - Lines: "BREATH on", "TONGUE", "BREATH off", each fingering; the breath meter between the bars.
 * Nothing is judged or recorded for replay.
 */
import type { Chip } from "../../touch/chip.ts";
import type { TouchFugue } from "../../touch/fugue.ts";
import type { Side } from "../../touch/thumbs.ts";
import { BAR } from "../protos.ts";
import { openDbOf, type BreathLook } from "./breath-dsp.ts";
import type { BreathMic } from "./breath-mic.ts";
import { WindVoice, type WindKind } from "./breath-voice.ts";
import { freeRows, keyOf, type FreeScale } from "./free.ts";
import { pitchName } from "./replay.ts";

export type PitchMode = "rows" | "voice";

export interface BreathOptions {
  kind: WindKind;
  pitch: PitchMode;
  scale: FreeScale;
  octaves: number;
  /** The recorder's pitch rising with pressure. */
  rise: boolean;
  /** The passage's span (ticks) for THE VOICE'S NOTES. */
  from: number;
  until: number;
}

const MARGIN = 10;
/** The meter's history (looks kept, ≈5.3 ms each: about 3 s). */
const HISTORY = 560;

/** The passage's notes of a voice in its span, in order (pitches). */
export function voiceNotes(f: TouchFugue, voice: number, from: number, until: number): number[] {
  return (f.voices[voice] ?? []).filter(([on]) => on >= from && on < until).map((n) => n[2]);
}

interface Held {
  side: Side;
  row: number;
  midi: number;
  y: number;
}

export class BreathPlay {
  readonly rows: number[];
  readonly notes: number[];
  readonly voice: WindVoice;
  readonly f: TouchFugue;
  readonly o: BreathOptions;
  private held = new Map<number, Held>();
  /** Fingering order (the newest thumb down decides the pitch). */
  private order: number[] = [];
  private midi: number;
  private next = 0;
  private h = 0;
  private onAt = 0;
  private tongues = 0;
  private history: BreathLook[] = [];
  private flash: { text: string; at: number } | null = null;
  private off: () => void;
  readonly mic: BreathMic;
  private readonly line: (text: string) => void;
  /** For a test driving the page: counts of the events. */
  counts = { on: 0, off: 0, tongue: 0, fingered: 0 };

  constructor(f: TouchFugue, voiceIx: number, chip: Chip, mic: BreathMic, o: BreathOptions, line: (text: string) => void) {
    this.f = f;
    this.o = o;
    this.mic = mic;
    this.line = line;
    this.rows = freeRows(f, voiceIx, o.scale, o.octaves);
    this.notes = voiceNotes(f, voiceIx, o.from, o.until);
    this.midi = o.pitch === "voice" && this.notes.length ? this.notes[0] : this.rows[Math.floor(this.rows.length / 2)];
    this.voice = new WindVoice(chip.ctx, chip.input, o.kind, o.rise);
    this.voice.setPitch(this.midi, 0);
    mic.outMs = () => this.voice.outMs();
    this.off = mic.listen((l) => this.look(l));
  }

  name(midi: number): string {
    return pitchName(this.f.id, midi);
  }
  private say(text: string) {
    this.line(`${(this.mic.ctx.currentTime % 1000).toFixed(1)}s ${text}`);
  }

  rowH(h = this.h): number {
    return Math.max(4, (h - 2 * MARGIN) / this.rows.length);
  }
  yOf(row: number, h = this.h): number {
    return MARGIN + (this.rows.length - 1 - row + 0.5) * this.rowH(h);
  }
  rowAt(y: number, h = this.h): number {
    const r = this.rows.length - 1 - Math.floor((y - MARGIN) / this.rowH(h));
    return Math.max(0, Math.min(this.rows.length - 1, r));
  }

  /** The breath's look (from the mic): loudness to the voice, events to lines. */
  look(l: BreathLook) {
    this.history.push(l);
    if (this.history.length > HISTORY) this.history.splice(0, this.history.length - HISTORY);
    this.voice.setBreath(l.pressure, l.open, l.fade);
    for (const e of l.events) {
      if (e.kind === "on") {
        this.counts.on++;
        this.onAt = l.t;
        this.tongues = 0;
        this.voice.articulate();
        this.flash = { text: "BREATH", at: performance.now() };
        this.say(`BREATH on · ${this.name(this.midi)} · ${l.envDb.toFixed(0)} dB (opens at ${openDbOf(this.mic.analyser.cal).toFixed(0)}) · blow-ness ${l.noisy.toFixed(2)} (flatness ${l.noise.flat.toFixed(2)}, periodicity ${l.noise.per.toFixed(2)})`);
      } else if (e.kind === "tongue") {
        this.counts.tongue++;
        this.tongues++;
        this.voice.articulate();
        this.flash = { text: "TONGUE", at: performance.now() };
        this.say(`TONGUE · ${this.name(this.midi)} again · the breath dipped ${e.depth?.toFixed(0)} dB and came back`);
      } else {
        this.counts.off++;
        this.say(`BREATH off after ${((l.t - this.onAt) / 1000).toFixed(2)} s${this.tongues ? ` · ${this.tongues} tongued` : ""}`);
      }
    }
  }

  private finger(midi: number, why: string) {
    const was = this.midi;
    this.midi = midi;
    this.counts.fingered++;
    const slur = this.voice.sounding && midi !== was;
    this.voice.setPitch(midi, slur ? 0.006 : 0);
    this.say(`♩ ${this.name(midi)} · ${why}${this.voice.sounding ? (slur ? ` · slurred from ${this.name(was)} (the breath goes on)` : "") : " · silent until you blow"}`);
  }

  down(id: number, half: Side, _x: number, y: number, _w: number, h: number) {
    this.h = h;
    const th = half === "left" ? "L thumb" : "R thumb";
    if (this.o.pitch === "voice") {
      if (!this.notes.length) return;
      const midi = this.notes[this.next % this.notes.length];
      const k = this.next % this.notes.length;
      this.next++;
      this.held.set(id, { side: half, row: -1, midi, y });
      this.order.push(id);
      return this.finger(midi, `${th} · note ${k + 1} of ${this.notes.length}`);
    }
    const row = this.rowAt(y);
    this.held.set(id, { side: half, row, midi: this.rows[row], y });
    this.order.push(id);
    this.finger(this.rows[row], th);
  }

  move(id: number, _x: number, y: number, _w: number, h: number) {
    this.h = h;
    const hd = this.held.get(id);
    if (!hd || this.o.pitch === "voice") return;
    const row = this.rowAt(y);
    if (row === hd.row || Math.abs(y - hd.y) < this.rowH() * 0.5) return;
    hd.row = row;
    hd.midi = this.rows[row];
    hd.y = y;
    if (this.order.at(-1) === id) this.finger(hd.midi, `${hd.side === "left" ? "L" : "R"} thumb moved`);
  }

  up(id: number) {
    const hd = this.held.get(id);
    if (!hd) return;
    this.held.delete(id);
    this.order = this.order.filter((x) => x !== id);
    // The other thumb still down: its note fingered again (rows); otherwise the last fingering stays.
    const top = this.order.at(-1);
    if (top !== undefined && this.o.pitch === "rows") {
      const o = this.held.get(top)!;
      if (o.midi !== this.midi) this.finger(o.midi, `${o.side === "left" ? "L" : "R"} thumb still down`);
    }
  }

  stop() {
    this.off();
    this.mic.outMs = () => 0;
    this.voice.dispose();
  }

  /**
   * The rows (as FREE PLAY's) or the voice's next notes on the bars; between them the BREATH METER:
   * the last 3 s of the breath (envelope), the gate's open and close lines, shaded while open, ticks
   * at the tongues; a column at the right edge of the meter for the level now.
   */
  paint(g: CanvasRenderingContext2D, w: number, h: number) {
    this.h = h;
    const bw = w * BAR;
    g.save();
    const rh = this.rowH(h);
    g.font = `${Math.max(8, Math.min(11, rh * 0.6))}px ui-monospace, Menlo, monospace`;
    g.textBaseline = "middle";
    const lit = new Set([...this.held.values()].map((x) => x.row));
    if (this.o.pitch === "rows") {
      const { tonic } = keyOf(this.f.key);
      this.rows.forEach((m, r) => {
        const y = this.yOf(r, h);
        const isTonic = ((m % 12) + 12) % 12 === tonic;
        if (lit.has(r)) {
          g.fillStyle = this.voice.sounding ? "rgba(255,210,63,0.35)" : "rgba(236,234,217,0.16)";
          g.fillRect(0, y - rh / 2, bw, rh);
          g.fillRect(w - bw, y - rh / 2, bw, rh);
        }
        g.fillStyle = isTonic ? "rgba(255,243,166,0.32)" : "rgba(236,234,217,0.10)";
        g.fillRect(0, Math.round(y - rh / 2), bw, 1);
        g.fillRect(w - bw, Math.round(y - rh / 2), bw, 1);
        if (rh >= 9 || isTonic) {
          g.fillStyle = lit.has(r) ? "#fff3a6" : isTonic ? "rgba(255,243,166,0.8)" : "rgba(236,234,217,0.45)";
          const nm = this.name(m);
          g.textAlign = "right";
          g.fillText(nm, bw - 4, y);
          g.textAlign = "left";
          g.fillText(nm, w - bw + 4, y);
        }
      });
    } else {
      // The voice's notes: the one fingered and the next three, large, on each bar.
      g.font = "16px ui-monospace, Menlo, monospace";
      g.textAlign = "center";
      for (let k = 0; k < 4 && this.notes.length; k++) {
        const ix = (this.next + k) % this.notes.length;
        const txt = this.name(this.notes[ix]);
        g.fillStyle = k === 0 ? "rgba(236,234,217,0.85)" : "rgba(236,234,217,0.35)";
        const y = h * 0.5 + (k - 0.5) * 26;
        g.fillText(k === 0 ? `next ${txt}` : txt, bw / 2, y);
        g.fillText(k === 0 ? `next ${txt}` : txt, w - bw / 2, y);
      }
      g.fillStyle = this.voice.sounding ? "#ffd23f" : "rgba(236,234,217,0.6)";
      g.fillText(`♩ ${this.name(this.midi)}`, bw / 2, h * 0.5 - 52);
      g.fillText(`♩ ${this.name(this.midi)}`, w - bw / 2, h * 0.5 - 52);
    }
    // Clear of the box's title bar at the top and its legend at the foot.
    this.paintMeter(g, bw + 14, MARGIN + 52, w - 2 * bw - 28, h - 2 * MARGIN - 52 - 34);
    g.restore();
  }

  private paintMeter(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    if (w < 40 || h < 40) return;
    const cal = this.mic.analyser.cal;
    const lo = Math.min(cal.floorDb - 10, -80);
    const hi = Math.max(cal.strongDb + 6, -6);
    const yOf = (db: number) => y + h - ((Math.max(lo, Math.min(hi, db)) - lo) / (hi - lo)) * h;
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(x, y, w, h);
    const openDb = openDbOf(cal);
    const closeDb = openDb - this.mic.analyser.tune.hysteresisDb;
    const n = this.history.length;
    const colW = Math.max(6, w * 0.06);
    const gw = w - colW - 6;
    const dx = gw / HISTORY;
    // Open stretches shaded.
    g.fillStyle = "rgba(255,210,63,0.10)";
    for (let i = 0; i < n; i++) if (this.history[i].open) g.fillRect(x + gw - (n - i) * dx, y, dx + 0.5, h);
    // Lines: the gate's open (solid) and close (dashed), "strong".
    g.lineWidth = 1;
    g.strokeStyle = "rgba(255,210,63,0.8)";
    g.beginPath();
    g.moveTo(x, yOf(openDb));
    g.lineTo(x + w, yOf(openDb));
    g.stroke();
    g.setLineDash([3, 3]);
    g.strokeStyle = "rgba(255,210,63,0.5)";
    g.beginPath();
    g.moveTo(x, yOf(closeDb));
    g.lineTo(x + w, yOf(closeDb));
    g.stroke();
    g.strokeStyle = "rgba(236,234,217,0.35)";
    g.beginPath();
    g.moveTo(x, yOf(cal.strongDb));
    g.lineTo(x + w, yOf(cal.strongDb));
    g.stroke();
    g.setLineDash([]);
    // The envelope (white), the mic's raw level (faint), tongues (ticks).
    g.strokeStyle = "rgba(236,234,217,0.25)";
    g.beginPath();
    for (let i = 0; i < n; i++) g[i ? "lineTo" : "moveTo"](x + gw - (n - 1 - i) * dx, yOf(this.history[i].micDb));
    g.stroke();
    g.strokeStyle = "#ecead9";
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < n; i++) g[i ? "lineTo" : "moveTo"](x + gw - (n - 1 - i) * dx, yOf(this.history[i].envDb));
    g.stroke();
    g.fillStyle = "#ff7fbf";
    for (let i = 0; i < n; i++) if (this.history[i].events.some((e) => e.kind === "tongue")) g.fillRect(x + gw - (n - 1 - i) * dx - 1, y, 2, 10);
    // Now: the level column, coloured by blow-ness.
    const now = this.history.at(-1);
    if (now) {
      const top = yOf(now.envDb);
      g.fillStyle = now.open ? "#ffd23f" : now.noisy >= this.mic.analyser.tune.minNoisy ? "rgba(236,234,217,0.7)" : "rgba(140,170,255,0.7)";
      g.fillRect(x + w - colW, top, colW, y + h - top);
    }
    g.font = "10px ui-monospace, Menlo, monospace";
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillStyle = "rgba(236,234,217,0.7)";
    g.fillText(`BREATH ${now ? `${now.envDb.toFixed(0)} dB · pressure ${now.pressure.toFixed(2)} · blow-ness ${now.noisy.toFixed(2)}` : "…waiting for the mic"}`, x + 4, y + 12);
    g.fillStyle = "rgba(255,210,63,0.8)";
    g.fillText(`opens ${openDb.toFixed(0)} dB`, x + 4, yOf(openDb) - 3);
    if (this.flash && performance.now() - this.flash.at < 400) {
      g.font = "bold 18px ui-monospace, Menlo, monospace";
      g.textAlign = "center";
      g.fillStyle = this.flash.text === "TONGUE" ? "#ff7fbf" : "#ffd23f";
      g.globalAlpha = 1 - (performance.now() - this.flash.at) / 400;
      g.fillText(this.flash.text, x + w / 2, y + h * 0.35);
      g.globalAlpha = 1;
    }
  }
}
