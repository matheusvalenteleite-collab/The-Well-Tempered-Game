/**
 * A fake Web Audio context for node tests (D210): enough of the API for chip.ts to run, counting the
 * nodes it makes, the sources sounding at any moment, and the nodes still wired into the graph (made,
 * connected, never disconnected). Time moves only by `advance(t)`, which also fires the sources'
 * `onended` as their stop times pass, as a browser would.
 */
class FakeParam {
  value: number;
  constructor(v = 0) {
    this.value = v;
  }
  setValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
  exponentialRampToValueAtTime() {
    return this;
  }
  setTargetAtTime() {
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
  cancelAndHoldAtTime() {
    return this;
  }
}

export class FakeNode {
  readonly kind: string;
  readonly ctx: FakeAudioContext;
  outs = 0;
  disconnected = false;
  [k: string]: unknown;
  constructor(ctx: FakeAudioContext, kind: string) {
    this.ctx = ctx;
    this.kind = kind;
    ctx.made.set(kind, (ctx.made.get(kind) ?? 0) + 1);
    ctx.nodes.add(this);
  }
  connect<T>(to: T): T {
    this.outs++;
    this.disconnected = false;
    return to;
  }
  disconnect() {
    this.outs = 0;
    this.disconnected = true;
    this.ctx.nodes.delete(this);
  }
}

export class FakeSource extends FakeNode {
  startAt: number | null = null;
  stopAt = Infinity;
  ended = false;
  onended: (() => void) | null = null;
  private listeners: (() => void)[] = [];
  constructor(ctx: FakeAudioContext, kind: string) {
    super(ctx, kind);
    ctx.sources.add(this);
  }
  start(at = 0, offset = 0) {
    if (this.startAt !== null) throw new Error("started twice");
    this.startAt = Math.max(at, this.ctx.currentTime);
    // A recording not looped ends by itself at its end (at the rate it was started at).
    const buffer = this.buffer as { duration: number } | undefined;
    if (buffer && !this.loop) {
      const rate = (this.playbackRate as FakeParam).value || 1;
      this.stopAt = Math.min(this.stopAt, this.startAt + Math.max(0, buffer.duration - offset) / rate);
    }
  }
  stop(at = 0) {
    if (this.startAt === null) throw new Error("stopped before started");
    // As the spec: a later stop() replaces the earlier (the browsers take the last call); a
    // recording still ends at its own end.
    const own = this.buffer && !this.loop ? this.naturalEnd() : Infinity;
    this.stopAt = Math.min(own, Math.max(at, this.ctx.currentTime));
  }
  addEventListener(type: string, f: () => void) {
    if (type === "ended") this.listeners.push(f);
  }
  private naturalEnd() {
    const buffer = this.buffer as { duration: number };
    return (this.startAt ?? 0) + buffer.duration / ((this.playbackRate as FakeParam).value || 1);
  }
  /** Sounding at time t. */
  live(t: number) {
    return !this.ended && this.startAt !== null && this.startAt <= t && t < this.stopAt;
  }
  end() {
    this.ended = true;
    this.ctx.sources.delete(this);
    this.onended?.();
    for (const f of this.listeners) f();
  }
}

export class FakeAudioContext {
  currentTime = 0;
  sampleRate = 48000;
  state = "running";
  outputLatency = 0;
  baseLatency = 0;
  /** Nodes made, by kind. */
  made = new Map<string, number>();
  /** Nodes not yet disconnected. */
  nodes = new Set<FakeNode>();
  /** Sources not yet ended. */
  sources = new Set<FakeSource>();
  destination: FakeNode;
  constructor() {
    this.destination = new FakeNode(this, "destination");
  }
  /** Moves the clock to t, ending the sources whose stop has passed. */
  advance(t: number) {
    this.currentTime = Math.max(this.currentTime, t);
    for (const s of [...this.sources]) if (s.stopAt <= this.currentTime) s.end();
  }
  /** Sources sounding now (started, not yet stopped). */
  sounding() {
    let n = 0;
    for (const s of this.sources) if (s.live(this.currentTime)) n++;
    return n;
  }
  totalMade() {
    let n = 0;
    for (const v of this.made.values()) n += v;
    return n;
  }
  resume() {
    return Promise.resolve();
  }
  private node(kind: string, params: Record<string, number>) {
    const n = new FakeNode(this, kind);
    for (const [k, v] of Object.entries(params)) n[k] = new FakeParam(v);
    return n;
  }
  private source(kind: string, params: Record<string, number>) {
    const n = new FakeSource(this, kind);
    for (const [k, v] of Object.entries(params)) n[k] = new FakeParam(v);
    return n;
  }
  createGain() {
    return this.node("gain", { gain: 1 });
  }
  createBiquadFilter() {
    return this.node("filter", { frequency: 350, Q: 1, gain: 0 });
  }
  createStereoPanner() {
    return this.node("panner", { pan: 0 });
  }
  createWaveShaper() {
    return this.node("shaper", {});
  }
  createConvolver() {
    return this.node("convolver", {});
  }
  createDynamicsCompressor() {
    return this.node("compressor", { threshold: 0, knee: 0, ratio: 1, attack: 0, release: 0 });
  }
  createOscillator() {
    const o = this.source("oscillator", { frequency: 440, detune: 0 });
    o.setPeriodicWave = () => {};
    return o;
  }
  createBufferSource() {
    return this.source("buffer", { playbackRate: 1, detune: 0 });
  }
  createConstantSource() {
    return this.source("constant", { offset: 1 });
  }
  createPeriodicWave() {
    return {};
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (c: number) => data[c] };
  }
  /** Any bytes "decode" to a tenth of a second of a click (a recording's stand-in). */
  decodeAudioData() {
    const b = this.createBuffer(2, 4800, this.sampleRate);
    b.getChannelData(0)[100] = b.getChannelData(1)[100] = 0.5;
    return Promise.resolve(b);
  }
}

/**
 * Installs the fake as the global AudioContext (and a navigator of the given touch points) for
 * `new Chip()`. With `recordings`, every sample file "downloads" (and decodes to a click), so the
 * recorded instruments play from their recordings; without, fetches fail at once (the synthesizer).
 */
export function installFakeAudio(touchPoints = 0, recordings = false): () => FakeAudioContext {
  let last: FakeAudioContext | null = null;
  (globalThis as { AudioContext?: unknown }).AudioContext = class extends FakeAudioContext {
    constructor() {
      super();
      last = this;
    }
  };
  // Never the network in a test.
  (globalThis as { fetch?: unknown }).fetch = () =>
    recordings ? Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new Uint8Array(1024).fill(0xff).buffer) }) : Promise.reject(new Error("no network in tests"));
  Object.defineProperty(globalThis, "navigator", { value: { maxTouchPoints: touchPoints, userAgent: touchPoints ? "iPhone" : "node" }, configurable: true, writable: true });
  return () => last!;
}
