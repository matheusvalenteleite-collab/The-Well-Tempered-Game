/**
 * D357, ROOM (the owner, on PIPE ORGAN: "i did miss a bit of the reverb of an organ. is it something that
 * one can control via hovering? or some other way? it's nice to be able to play clean and dry like this.
 * but sometimes one wants [more]"). A touch screen has no hover: one button among the stops, cycling
 * DRY · CHURCH · CATHEDRAL, kept on the device (every piece, every visit). CHURCH is the organ as D349
 * left it (the default: what the owner heard); DRY a smaller, closer room for clean practice; CATHEDRAL a
 * long, wet one. The longer the room, the higher its send is high-passed (the pedal's fundamentals stay
 * in the direct sound: more room never swamps the bass), and higher still on a phone, whose speaker
 * smears a low tail into mud. chip.ts builds the preset's reverb from the room in force (Chip.fxInput),
 * a change heard from the next note (the old room's tail rings out).
 */
import type { Reverb } from "./chip.ts";

export type RoomId = "dry" | "church" | "cathedral";
export const ROOM_ORDER: readonly RoomId[] = ["dry", "church", "cathedral"];
export const DEFAULT_ROOM: RoomId = "church";

/**
 * A room: its decay (RT60, s) and impulse length on a computer and on a phone, the send's level against
 * CHURCH's (`send`, a gain on the reverb's input) and its high-pass (Hz; `phoneHp` on a phone).
 */
export interface Room {
  rt60: number;
  phoneRt60: number;
  seconds: number;
  phoneSeconds: number;
  send: number;
  hp: number;
  phoneHp: number;
}
export const ROOMS: Readonly<Record<RoomId, Room>> = {
  // A chapel or a choir loft: the pipes close, a short bloom after each release (about -6 dB of tail against CHURCH).
  dry: { rt60: 1.3, phoneRt60: 1.0, seconds: 1.4, phoneSeconds: 1.1, send: 0.6, hp: 110, phoneHp: 160 },
  // D349's church (REVERBS.cathedral as it was): RT60 2.6 s, 1.7 s on a phone; the default.
  church: { rt60: 2.6, phoneRt60: 1.7, seconds: 2.8, phoneSeconds: 1.7, send: 1, hp: 110, phoneHp: 110 },
  // A great stone nave (the empty Thomaskirche about 4 s, Boren 2021; a cathedral 4-6 s): RT60 4.2 s,
  // 3.0 s on a phone (its impulse 2.6 s: the last 15 dB cut, under the speaker's noise), sent 3.5 dB
  // more, its send high-passed at 160 Hz (220 on a phone): the pedal's line in the direct sound.
  cathedral: { rt60: 4.2, phoneRt60: 3.0, seconds: 4.4, phoneSeconds: 2.6, send: 1.5, hp: 160, phoneHp: 220 },
};

/** The presets the ROOM button is for (their own reverb taken from the room). */
export const ROOM_PRESETS: readonly string[] = ["chamberOrgan"];
export const hasRoom = (presetId: string) => ROOM_PRESETS.includes(presetId);

/** The next room (the button's press). */
export const nextRoom = (r: RoomId): RoomId => ROOM_ORDER[(ROOM_ORDER.indexOf(r) + 1) % ROOM_ORDER.length];

/** A preset's reverb in a room: the decay, length and high-pass replaced; the rest (pre-delay, the highs) the preset's own. */
export function roomReverb(base: Reverb, room: RoomId): Reverb {
  const r = ROOMS[room];
  return { ...base, rt60: r.rt60, phoneRt60: r.phoneRt60, seconds: r.seconds, phoneSeconds: r.phoneSeconds, hp: r.hp, phoneHp: r.phoneHp };
}

export const ROOM_KEY = "tg-organ-room-v1";
let live: RoomId | null = null;
/** The room in force (kept on the device; CHURCH where nothing is kept or it is not understood). */
export function liveRoom(): RoomId {
  if (live) return live;
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(ROOM_KEY) : null;
    live = v && (ROOM_ORDER as readonly string[]).includes(v) ? (v as RoomId) : DEFAULT_ROOM;
  } catch {
    live = DEFAULT_ROOM;
  }
  return live;
}
/** Set (and keep) the room. */
export function setRoom(r: RoomId) {
  live = r;
  try {
    localStorage.setItem(ROOM_KEY, r);
  } catch {
    /* this visit only */
  }
}
/** For tests and renders: forget the room read (the next read is the stored one). */
export function resetRoom() {
  live = null;
}
