/**
 * The finished fugue as a Standard MIDI File (format 1: a tempo track and a track per voice), to
 * take into a notation program. Pitches keep only their MIDI numbers; the key signature is written
 * so that the program spells them in the key.
 */
import { parsePitch } from "../../music/pitch.ts";
import type { WtcNote } from "../fugues.ts";
import { keySignature, isMinor } from "../fugues.ts";

const PPQ = 480;

function vlq(n: number): number[] {
  const out = [n & 0x7f];
  for (n >>= 7; n > 0; n >>= 7) out.unshift((n & 0x7f) | 0x80);
  return out;
}
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0) & 0x7f);

function chunk(type: string, data: number[]): number[] {
  return [...ascii(type), ...u32(data.length), ...data];
}

/** Absolute-time events to a track's bytes (with end of track). */
function track(events: { t: number; bytes: number[] }[]): number[] {
  // At one time: metas and programme changes first, then notes off, then notes on.
  const rank = (b: number) => (b === 0xff || (b & 0xf0) === 0xc0 ? 0 : (b & 0xf0) === 0x80 ? 1 : 2);
  events.sort((a, b) => a.t - b.t || rank(a.bytes[0]) - rank(b.bytes[0]));
  const out: number[] = [];
  let last = 0;
  for (const e of events) {
    out.push(...vlq(e.t - last), ...e.bytes);
    last = e.t;
  }
  out.push(0, 0xff, 0x2f, 0);
  return chunk("MTrk", out);
}

export function fugueMidi(voices: WtcNote[][], opts: { key: string; time: string; tempo: number; title: string }): Uint8Array {
  const [num, den] = opts.time.split("/").map(Number);
  const sharps = Object.values(keySignature(opts.key)).reduce((a, b) => a + b, 0);
  const usPerQuarter = Math.round(60_000_000 / opts.tempo);
  const meta: { t: number; bytes: number[] }[] = [
    { t: 0, bytes: [0xff, 0x03, ...vlq(opts.title.length), ...ascii(opts.title)] },
    { t: 0, bytes: [0xff, 0x51, 3, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff] },
    { t: 0, bytes: [0xff, 0x58, 4, num, Math.round(Math.log2(den)), 24, 8] },
    { t: 0, bytes: [0xff, 0x59, 2, sharps & 0xff, isMinor(opts.key) ? 1 : 0] },
  ];
  const tracks = [track(meta)];
  voices.forEach((v, i) => {
    const ch = i & 0x0f;
    const evs: { t: number; bytes: number[] }[] = [{ t: 0, bytes: [0xc0 | ch, 6] }]; // harpsichord
    for (const n of v) {
      const m = parsePitch(n.pitch).midi;
      const on = Math.round(n.at * PPQ);
      const off = Math.round((n.at + n.dur) * PPQ);
      evs.push({ t: on, bytes: [0x90 | ch, m, 80] }, { t: off, bytes: [0x80 | ch, m, 0] });
    }
    tracks.push(track(evs));
  });
  return new Uint8Array([...chunk("MThd", [...u16(1), ...u16(tracks.length), ...u16(PPQ)]), ...tracks.flat()]);
}
