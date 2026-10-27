/**
 * D323, BREATH's microphone: opened once (from a tap) in the chip's own AudioContext and kept open while
 * the lab is, so the permission prompt and iOS's route change come once. No voice processing:
 * echoCancellation, noiseSuppression and autoGainControl all false (Safari honours echoCancellation, and
 * with it off iOS does not put the mic through its voice processing; the other two are Chrome's). The
 * samples reach the main thread from a tiny AudioWorklet in blocks of 256 (5.3 ms at 48 kHz), where the
 * BreathAnalyser (breath-dsp.ts) turns them into looks; without AudioWorklet, an AnalyserNode is read
 * each frame (coarser: about 16 ms).
 */
import { BreathAnalyser, type BreathLook } from "./breath-dsp.ts";

const WORKLET = `class WtcBreathTap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(256); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === 256) { this.port.postMessage(this.buf); this.buf = new Float32Array(256); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("wtc-breath-tap", WtcBreathTap);`;

export type MicState = "off" | "asking" | "on" | "denied" | "unavailable";

export interface MicListener {
  (look: BreathLook): void;
}

/** The constraints asked for: no echo cancellation, noise suppression or gain control; one channel. */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  video: false,
};

export class BreathMic {
  state: MicState = "off";
  error = "";
  readonly ctx: AudioContext;
  readonly analyser: BreathAnalyser;
  /** How the samples arrive: "worklet" or "analyser" (the fallback). */
  path: "worklet" | "analyser" | "" = "";
  /** The track's settings as the browser reports them (to show what processing is really off). */
  settings: MediaTrackSettings | null = null;
  private stream: MediaStream | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private mute: GainNode | null = null;
  private poll: AnalyserNode | null = null;
  private raf = 0;
  private listeners = new Set<MicListener>();
  /** The voice's own output level (mean square), read once per block for the leak. */
  outMs: () => number = () => 0;
  /** Blocks received (for a test and the readout). */
  blocks = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.analyser = new BreathAnalyser(ctx.sampleRate);
  }

  listen(l: MicListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private feed(block: Float32Array) {
    this.blocks++;
    const looks = this.analyser.push(block, this.outMs());
    for (const look of looks) for (const l of this.listeners) l(look);
  }

  /** Open the mic (from a tap). Resolves to the state reached. */
  async open(): Promise<MicState> {
    if (this.state === "on" || this.state === "asking") return this.state;
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      this.state = "unavailable";
      this.error = "This browser gives no microphone here (it needs https, or localhost).";
      return this.state;
    }
    this.state = "asking";
    // iOS: say we record as well as play (the Audio Session API, Safari 16.4+), before asking.
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "play-and-record";
    } catch {
      /* not supported */
    }
    try {
      this.stream = await md.getUserMedia(MIC_CONSTRAINTS);
    } catch (e) {
      const name = (e as Error).name;
      this.state = name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable";
      this.error = `${name}: ${(e as Error).message}`;
      try {
        if (nav.audioSession) nav.audioSession.type = "playback";
      } catch {
        /* not supported */
      }
      return this.state;
    }
    const track = this.stream.getAudioTracks()[0];
    this.settings = track?.getSettings?.() ?? null;
    if (this.ctx.state !== "running") await this.ctx.resume().catch(() => {});
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.mute = this.ctx.createGain();
    this.mute.gain.value = 0;
    this.mute.connect(this.ctx.destination);
    if (await this.tryWorklet()) this.path = "worklet";
    else this.startPolling();
    this.state = "on";
    return this.state;
  }

  private async tryWorklet(): Promise<boolean> {
    const aw = (this.ctx as AudioContext & { audioWorklet?: AudioWorklet }).audioWorklet;
    if (!aw || typeof AudioWorkletNode === "undefined") return false;
    const urls: string[] = [];
    try {
      urls.push(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
    } catch {
      /* no blob URLs */
    }
    urls.push(`data:application/javascript;base64,${btoa(WORKLET)}`);
    for (const url of urls) {
      try {
        await aw.addModule(url);
        const node = new AudioWorkletNode(this.ctx, "wtc-breath-tap", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
        node.port.onmessage = (e: MessageEvent<Float32Array>) => this.feed(e.data);
        this.src!.connect(node).connect(this.mute!);
        this.node = node;
        return true;
      } catch {
        /* the next way */
      }
    }
    return false;
  }

  /** The fallback: read an AnalyserNode each frame, feeding the samples that are new since the last read. */
  private startPolling() {
    this.path = "analyser";
    const an = (this.poll = this.ctx.createAnalyser());
    an.fftSize = 2048;
    this.src!.connect(an);
    const buf = new Float32Array(new ArrayBuffer(an.fftSize * 4));
    let last = this.ctx.currentTime;
    const loop = () => {
      const now = this.ctx.currentTime;
      const n = Math.min(buf.length, Math.round((now - last) * this.ctx.sampleRate));
      last = now;
      if (n > 0) {
        an.getFloatTimeDomainData(buf);
        this.feed(buf.subarray(buf.length - n));
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  close() {
    cancelAnimationFrame(this.raf);
    this.node?.disconnect();
    this.poll?.disconnect();
    this.src?.disconnect();
    this.mute?.disconnect();
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.stream = null;
    this.node = null;
    this.poll = null;
    this.src = null;
    this.state = "off";
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      /* not supported */
    }
  }
}

let shared: BreathMic | null = null;
/** The lab's one microphone, in the chip's context. */
export function breathMic(ctx: AudioContext): BreathMic {
  if (!shared || shared.ctx !== ctx) shared = new BreathMic(ctx);
  return shared;
}
export function currentMic(): BreathMic | null {
  return shared;
}
