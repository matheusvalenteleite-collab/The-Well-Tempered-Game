/**
 * D723, RECORD YOUR FUGUE (phase 3): MY FUGUE as a MIDI file (type 1): a track a voice, the player's takes
 * as they were played (each note's own place, early or late, its wrong pitch, its length as held, its
 * strength as velocity) and the voices not recorded as the score has them. Opens in GarageBand, MuseScore
 * or any sequencer. The tempo is the set's, one for the whole file (the game's ritardandi and fermatas
 * are not written).
 */
import { fugueById } from "../../touch/fugue.ts";
import type { Take } from "./take.ts";

/** Ticks a quarter in the file (the game's 1920 divided by 4). */
export const MIDI_PPQ = 480;

const vlq = (n: number): number[] => {
  let v = Math.max(0, Math.round(n));
  const out = [v & 0x7f];
  while ((v >>= 7)) out.unshift((v & 0x7f) | 0x80);
  return out;
};
const text = (s: string) => [...new TextEncoder().encode(s)];
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

interface Ev {
  at: number;
  bytes: number[];
  /** Note-offs before note-ons at the same tick. */
  order: number;
}

function track(events: Ev[]): number[] {
  events.sort((a, b) => a.at - b.at || a.order - b.order);
  const body: number[] = [];
  let last = 0;
  for (const e of events) {
    body.push(...vlq(e.at - last), ...e.bytes);
    last = e.at;
  }
  body.push(0, 0xff, 0x2f, 0);
  return [...text("MTrk"), ...u32(body.length), ...body];
}

/** A note's strength as a velocity: the touch across the bar (0 soft .. 1 strong), else a middle one. */
export function velocityOf(play: Record<string, unknown>): number {
  const t = typeof play.touch === "number" ? play.touch : null;
  const v = t === null ? 80 : 44 + 72 * t;
  return Math.max(1, Math.min(127, Math.round(v * (typeof play.level === "number" ? Math.min(1.3, Math.max(0.5, play.level)) : 1))));
}

/** The take's notes as [on, off, midi, velocity] in the game's ticks (a note held to its release's tick). */
export function takeNotes(t: Take): [number, number, number, number][] {
  const stops = new Map<number, number>();
  for (const c of t.calls) if (c[2] === "stop" && !stops.has(c[1])) stops.set(c[1], c[0]);
  return t.notes.map((n) => {
    const off = n[3] >= 0 ? n[1] + n[3] : (stops.get(n[0]) ?? n[1] + 480);
    return [n[1], Math.max(off, n[1] + 1), n[2], velocityOf(n[5])];
  });
}

/** The MIDI file: `set` the takes by voice; `names` each voice's name; `bpm` quarters a minute. */
export function midiOf(piece: string, set: ReadonlyMap<number, Take>, names: readonly string[], bpm: number): Uint8Array {
  const f = fugueById(piece);
  const scale = MIDI_PPQ / f.tpq;
  const head: Ev[] = [
    { at: 0, order: 0, bytes: [0xff, 0x03, ...vlq(text(f.title ?? piece).length), ...text(f.title ?? piece)] },
    { at: 0, order: 0, bytes: [0xff, 0x51, 3, ...u32(Math.round(60e6 / bpm)).slice(1)] },
  ];
  const tracks = [track(head)];
  f.voices.forEach((score, v) => {
    const ch = v % 16;
    const take = set.get(v);
    const name = `${names[v] ?? `VOICE ${v + 1}`}${take ? "" : " (THE GAME)"}`;
    const evs: Ev[] = [{ at: 0, order: 0, bytes: [0xff, 0x03, ...vlq(text(name).length), ...text(name)] }];
    const notes: [number, number, number, number][] = take ? takeNotes(take) : score.map((n) => [n[0], n[0] + n[1], n[2], 72]);
    for (const [on, off, midi, vel] of notes) {
      if (midi < 0 || midi > 127) continue;
      const a = Math.max(0, on * scale);
      evs.push({ at: a, order: 1, bytes: [0x90 | ch, midi, vel] });
      evs.push({ at: Math.max(a + 1, off * scale), order: 0, bytes: [0x80 | ch, midi, 0] });
    }
    tracks.push(track(evs));
  });
  const header = [...text("MThd"), ...u32(6), 0, 1, (tracks.length >> 8) & 255, tracks.length & 255, (MIDI_PPQ >> 8) & 255, MIDI_PPQ & 255];
  return new Uint8Array([...header, ...tracks.flat()]);
}
