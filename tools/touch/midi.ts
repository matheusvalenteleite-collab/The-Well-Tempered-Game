/**
 * A small reader of standard MIDI files (D169): each track's notes as [onset, duration, MIDI] in the
 * file's ticks, and the file's ticks per quarter. Enough for the Mutopia Project's LilyPond exports.
 */
export interface MidiTrack {
  name: string;
  notes: [on: number, dur: number, midi: number][];
}

export function readMidi(bytes: Uint8Array): { division: number; tracks: MidiTrack[] } {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0;
  const str = (n: number) => String.fromCharCode(...bytes.subarray(p, p + n));
  if (str(4) !== "MThd") throw new Error("not a MIDI file");
  const ntracks = v.getUint16(10);
  const division = v.getUint16(12);
  if (division & 0x8000) throw new Error("SMPTE time is not read");
  p = 8 + v.getUint32(4);
  const tracks: MidiTrack[] = [];
  for (let t = 0; t < ntracks; t++) {
    if (str(4) !== "MTrk") throw new Error(`track ${t}: no MTrk`);
    const end = p + 8 + v.getUint32(p + 4);
    p += 8;
    const vlq = () => {
      let x = 0;
      for (;;) {
        const b = bytes[p++];
        x = (x << 7) | (b & 0x7f);
        if (!(b & 0x80)) return x;
      }
    };
    let tick = 0;
    let status = 0;
    let name = "";
    const open = new Map<number, number[]>();
    const notes: MidiTrack["notes"] = [];
    while (p < end) {
      tick += vlq();
      let s = bytes[p];
      if (s & 0x80) p++;
      else s = status;
      if (s === 0xff) {
        const type = bytes[p++];
        const len = vlq();
        if (type === 0x03) name = new TextDecoder().decode(bytes.subarray(p, p + len));
        p += len;
        continue;
      }
      if (s === 0xf0 || s === 0xf7) {
        p += vlq();
        continue;
      }
      status = s;
      const kind = s & 0xf0;
      const a = bytes[p++];
      const b = kind === 0xc0 || kind === 0xd0 ? 0 : bytes[p++];
      if (kind === 0x90 && b > 0) {
        if (!open.has(a)) open.set(a, []);
        open.get(a)!.push(tick);
      } else if (kind === 0x80 || (kind === 0x90 && b === 0)) {
        const on = open.get(a)?.shift();
        if (on !== undefined && tick > on) notes.push([on, tick - on, a]);
      }
    }
    p = end;
    tracks.push({ name, notes: notes.sort((x, y) => x[0] - y[0] || y[2] - x[2]) });
  }
  return { division, tracks };
}
