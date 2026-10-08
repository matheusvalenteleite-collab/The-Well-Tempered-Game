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

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * One file in a .zip (stored, not compressed: audio does not compress). The claude.ai artifact
 * viewer saves only some file types (zip among them, not mp3 or wav), so there the export is zipped.
 */
export function zipOne(name: string, data: Uint8Array): Blob {
  const enc = new TextEncoder().encode(name);
  const crc = crc32(data);
  const local = new DataView(new ArrayBuffer(30));
  local.setUint32(0, 0x04034b50, true);
  local.setUint16(4, 20, true);
  local.setUint16(6, 0x0800, true); // UTF-8 name
  local.setUint16(8, 0, true); // stored
  local.setUint32(14, crc, true);
  local.setUint32(18, data.length, true);
  local.setUint32(22, data.length, true);
  local.setUint16(26, enc.length, true);
  const central = new DataView(new ArrayBuffer(46));
  central.setUint32(0, 0x02014b50, true);
  central.setUint16(4, 20, true);
  central.setUint16(6, 20, true);
  central.setUint16(8, 0x0800, true);
  central.setUint32(16, crc, true);
  central.setUint32(20, data.length, true);
  central.setUint32(24, data.length, true);
  central.setUint16(28, enc.length, true);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, 1, true);
  end.setUint16(10, 1, true);
  end.setUint32(12, 46 + enc.length, true);
  end.setUint32(16, 30 + enc.length + data.length, true);
  return new Blob([local.buffer, enc, data as BlobPart, central.buffer, enc, end.buffer], { type: "application/zip" });
}

type Saver = { save(r: { filename: string; data: Blob }): Promise<{ status: string }> };
/** The artifact viewer's save capability, when the page runs inside it (D74). */
const viewerSaver: Promise<Saver | null> = (() => {
  const c = (globalThis as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  return c?.use ? (c.use("downloads") as Promise<Saver | null>).catch(() => null) : Promise.resolve(null);
})();

/**
 * Save the file: inside the claude.ai viewer through its save dialog (zipped, see zipOne); anywhere
 * else as an ordinary download. Resolves to what happened.
 */
export async function saveFile(blob: Blob, name: string): Promise<"saved" | "zipped" | "declined" | "failed"> {
  const viewer = await viewerSaver;
  if (!viewer) {
    download(blob, name);
    return "saved";
  }
  try {
    const zip = zipOne(name, new Uint8Array(await blob.arrayBuffer()));
    await viewer.save({ filename: name.replace(/\.[a-z0-9]+$/i, "") + ".zip", data: zip });
    return "zipped";
  } catch (e) {
    return (e as { code?: string })?.code === "declined" ? "declined" : "failed";
  }
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
