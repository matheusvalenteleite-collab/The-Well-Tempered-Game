/**
 * Export of what the game plays as an audio file (D74): the master output is captured while one
 * pass of the piece plays, then encoded as MP3 (small, plays everywhere, accepted by WhatsApp as
 * an audio file) or WAV (16-bit PCM, lossless, about ten times larger). Pure functions here; the
 * capture itself is in the engine.
 */
import { Mp3Encoder } from "@breezystack/lamejs";

export type ExportFormat = "mp3" | "wav";
export const EXPORT_FORMATS: ExportFormat[] = ["mp3", "wav"];

/** Float samples (-1..1) to 16-bit integers, clipped. */
export function toInt16(x: Float32Array): Int16Array {
  const out = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const v = Math.max(-1, Math.min(1, x[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

/** A stereo (or mono) 16-bit PCM WAV file. */
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const n = channels[0]?.length ?? 0;
  const ch = channels.length;
  const data = n * ch * 2;
  const buf = new ArrayBuffer(44 + data);
  const v = new DataView(buf);
  const text = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + data, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, ch, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, data, true);
  const ints = channels.map(toInt16);
  let at = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++, at += 2) v.setInt16(at, ints[c][i], true);
  return new Blob([buf], { type: "audio/wav" });
}

/** An MP3 file (constant bit rate, default 192 kbps). */
export function encodeMp3(channels: Float32Array[], sampleRate: number, kbps = 192): Blob {
  const stereo = channels.length > 1;
  const enc = new Mp3Encoder(stereo ? 2 : 1, sampleRate, kbps);
  const left = toInt16(channels[0]);
  const right = stereo ? toInt16(channels[1]) : undefined;
  const parts: Uint8Array[] = [];
  const BLOCK = 1152 * 8;
  for (let i = 0; i < left.length; i += BLOCK) {
    const chunk = enc.encodeBuffer(left.subarray(i, i + BLOCK), right?.subarray(i, i + BLOCK));
    if (chunk.length) parts.push(chunk.slice());
  }
  const end = enc.flush();
  if (end.length) parts.push(end.slice());
  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}

export function encode(format: ExportFormat, channels: Float32Array[], sampleRate: number): Blob {
  return format === "mp3" ? encodeMp3(channels, sampleRate) : encodeWav(channels, sampleRate);
}

/** Offer a file to the browser's downloads. */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
