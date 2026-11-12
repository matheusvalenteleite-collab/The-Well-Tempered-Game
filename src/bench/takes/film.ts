/**
 * D725, RECORD YOUR FUGUE (phase 4): MY FUGUE as a video, filmed as it plays (LISTEN TO MY FUGUE): the
 * music box and its world, as drawn, put each frame into a 16:9 picture with the fugue's title above and
 * its voices below (who played each: YOU or THE GAME), with the sound as heard (the engine's last node),
 * recorded by the browser's own recorder (MediaRecorder) as an MP4 where it can (iPhone Safari, Chrome
 * 126+), else WebM. Filmed in real time: the video takes as long as the fugue. Measured as it goes, for
 * the owner's iPhone test: frames drawn, length, the finishing time, the file's size and kind, its rate.
 *
 * (Rendered faster than real time, frame by frame, would need the box drawn away from the screen and an
 * encoder the iPhone's Safari does not yet give for sound in MP4 reliably (WebKit bug 302253): left for later.)
 */

/** The file kinds tried, in order: MP4 (H.264, AAC) as WhatsApp prefers, else WebM. */
export const FILM_TYPES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
/** The picture: 1280 × 720, 30 frames a second, about 1.2 Mbit/s (a four-minute fugue near 40 MB: under WhatsApp's 100 MB and the share sheet's 50 MB). */
export const FILM_W = 1280;
export const FILM_H = 720;
export const FILM_FPS = 30;
export const FILM_VIDEO_BPS = 1_200_000;
export const FILM_AUDIO_BPS = 128_000;

export interface FilmStats {
  type: string;
  width: number;
  height: number;
  frames: number;
  seconds: number;
  /** From the end of the music to the file's being ready (ms). */
  finishMs: number;
  mb: number;
  kbps: number;
  heapMb: number | null;
}

export interface FilmVoice {
  name: string;
  colour: string;
  who: string;
}

export function filmType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return FILM_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

/** The extension and plain kind of a recorded type ("mp4", "video/mp4"). */
export function filmFile(type: string): { ext: string; mime: string } {
  return type.startsWith("video/mp4") ? { ext: "mp4", mime: "video/mp4" } : { ext: "webm", mime: "video/webm" };
}

export class Filmer {
  private readonly out: HTMLCanvasElement;
  private readonly c: CanvasRenderingContext2D;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private raf = 0;
  private frames = 0;
  private t0 = 0;
  private readonly dest: MediaStreamAudioDestinationNode;
  readonly type: string;
  private readonly source: HTMLCanvasElement;
  private readonly tap: AudioNode;
  private readonly title: string;
  private readonly sub: string;
  private readonly voices: readonly FilmVoice[];
  constructor(source: HTMLCanvasElement, ctx: AudioContext, tap: AudioNode, title: string, sub: string, voices: readonly FilmVoice[]) {
    this.source = source;
    this.tap = tap;
    this.title = title;
    this.sub = sub;
    this.voices = voices;
    const type = filmType();
    if (!type) throw new Error("this browser cannot record video");
    this.type = type;
    this.out = document.createElement("canvas");
    this.out.width = FILM_W;
    this.out.height = FILM_H;
    this.c = this.out.getContext("2d")!;
    this.dest = ctx.createMediaStreamDestination();
  }
  /** Every frame: the box as drawn, into the picture with its title and its voices. */
  private draw = () => {
    const c = this.c;
    c.fillStyle = "#0b0e20";
    c.fillRect(0, 0, FILM_W, FILM_H);
    const top = 86;
    const foot = 64;
    const s = this.source;
    if (s.width && s.height) {
      const room = { w: FILM_W - 48, h: FILM_H - top - foot };
      const k = Math.min(room.w / s.width, room.h / s.height);
      const w = Math.round(s.width * k);
      const h = Math.round(s.height * k);
      c.imageSmoothingEnabled = false;
      c.drawImage(s, Math.round((FILM_W - w) / 2), top + Math.round((room.h - h) / 2), w, h);
    }
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#ffd76a";
    c.font = `22px "Press Start 2P", ui-monospace, monospace`;
    c.fillText(this.title, FILM_W / 2, 34, FILM_W - 60);
    c.fillStyle = "#a6a3c4";
    c.font = `13px "Press Start 2P", ui-monospace, monospace`;
    c.fillText(this.sub, FILM_W / 2, 66, FILM_W - 60);
    // The voices, each in its colour, who played it.
    const parts = this.voices.map((v) => `${v.name} · ${v.who}`);
    c.font = `13px "Press Start 2P", ui-monospace, monospace`;
    const widths = parts.map((p) => c.measureText(p).width + 34);
    let x = (FILM_W - widths.reduce((a, b) => a + b, 0)) / 2;
    const y = FILM_H - foot / 2;
    c.textAlign = "left";
    this.voices.forEach((v, i) => {
      c.fillStyle = v.colour;
      c.fillRect(Math.round(x), Math.round(y - 6), 12, 12);
      c.fillStyle = "#ece9f6";
      c.fillText(parts[i], x + 18, y + 1);
      x += widths[i];
    });
    this.frames++;
    this.raf = requestAnimationFrame(this.draw);
  };
  start() {
    this.draw();
    const video = (this.out as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(FILM_FPS);
    this.tap.connect(this.dest);
    const stream = new MediaStream([...video.getVideoTracks(), ...this.dest.stream.getAudioTracks()]);
    this.rec = new MediaRecorder(stream, { mimeType: this.type, videoBitsPerSecond: FILM_VIDEO_BPS, audioBitsPerSecond: FILM_AUDIO_BPS });
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(1000);
    this.t0 = performance.now();
  }
  /** The film finished: the file and the measurements. */
  stop(): Promise<{ blob: Blob; stats: FilmStats }> {
    const seconds = (performance.now() - this.t0) / 1000;
    const end = performance.now();
    cancelAnimationFrame(this.raf);
    return new Promise((resolve, reject) => {
      const rec = this.rec;
      if (!rec) return reject(new Error("not filming"));
      rec.onstop = () => {
        try {
          this.tap.disconnect(this.dest);
        } catch {
          /* already */
        }
        const { mime } = filmFile(this.type);
        const blob = new Blob(this.chunks, { type: mime });
        const m = (performance as { memory?: { usedJSHeapSize: number } }).memory;
        resolve({ blob, stats: { type: this.type, width: FILM_W, height: FILM_H, frames: this.frames, seconds: Math.round(seconds * 10) / 10, finishMs: Math.round(performance.now() - end), mb: Math.round(blob.size / 1e5) / 10, kbps: Math.round((blob.size * 8) / Math.max(0.1, seconds) / 1000), heapMb: m ? Math.round(m.usedJSHeapSize / 1e5) / 10 : null } });
      };
      rec.onerror = () => reject(new Error("the recorder failed"));
      rec.stop();
    });
  }
  /** Stopped before the end (✕): nothing kept. */
  abort() {
    cancelAnimationFrame(this.raf);
    try {
      this.rec?.stop();
      this.tap.disconnect(this.dest);
    } catch {
      /* already */
    }
  }
}
