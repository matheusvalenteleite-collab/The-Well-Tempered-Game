/**
 * D540, the bands' cost in a browser (tools/playback/cpu/*.mjs drive it under Playwright, on the dev server): a fugue played
 * through the game's own engine (ProtoGame + Chip, Herr Bach on one voice, the band on the others) while the audio clock's
 * underruns (AudioContext.playbackStats), the scheduler's late notes and the main thread's long tasks are counted; a
 * sound's recordings loaded and timed (Chip.prepare); the decoded audio held (sampled.ts residentBytes). The page's
 * <base href="/"> keeps the recordings on the dev server (samples/…), never the public site.
 */
import { presetById, setPreset, V2_SLIM } from "../../../src/touch/sound.ts";
import { Chip, openingOf, soundPlans } from "../../../src/touch/chip.ts";
import { barStart, everyNote, fugueById } from "../../../src/touch/fugue.ts";
import { ProtoGame } from "../../../src/bench/proto-game.ts";
import { easyOf, protoById } from "../../../src/bench/protos.ts";
import { playReading } from "../../../src/touch/readings.ts";
import { loaded, residentBytes, setLoadPolicy } from "../../../src/touch/sampled.ts";
import { tempoOf } from "../../../src/touch/tempi.ts";

const W = window as unknown as Record<string, unknown>;
// (Every recording counted: the dev server's hundreds of modules fill the default buffer of 250.)
performance.setResourceTimingBufferSize(100000);
let chip: Chip | null = null;
const longTasks: number[] = [];
try {
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) longTasks.push(e.duration);
  }).observe({ type: "longtask", buffered: true });
} catch {
  /* no long-task timing */
}
/** The sound by its id, or slimmed as a v2 is (V2_SLIM). */
function use(sound: string, slim = false) {
  const p = presetById(sound);
  setPreset(slim ? { ...p, slim: V2_SLIM } : p);
}
function theChip(): Chip {
  if (!chip) chip = new Chip();
  return chip;
}
const stats = (ctx: AudioContext) => {
  const s = (ctx as unknown as { playbackStats?: { toJSON?: () => Record<string, number> } & Record<string, number> }).playbackStats;
  if (!s) return null;
  const j = s.toJSON ? s.toJSON() : s;
  return { underrunEvents: j.underrunEvents, underrunDuration: j.underrunDuration, totalDuration: j.totalDuration };
};

/**
 * Load a sound's recordings for a piece (the player on `voice`), timed: until the opening's zones are in (the first notes
 * with real samples: chip.ts openingOf, soundPlans' `first`, polled every 20 ms) and until all are; the bytes the
 * recordings took on the wire. `before`: the loading as it was (MP3 only, every fetch at once, no opening first).
 */
W.__load = async (o: { sound: string; piece: string; voice?: number; slim?: boolean; before?: boolean }) => {
  use(o.sound, o.slim);
  setLoadPolicy(o.before ? { wire: ["mp3"], queue: false } : { wire: null, queue: true });
  const ch = theChip();
  await ch.resume();
  const f = fugueById(o.piece);
  const all = everyNote(f).map((n) => n[2]);
  const lead = (f.voices[o.voice ?? 0] ?? []).map((n) => n[2]);
  const opening = openingOf(f);
  const firsts = soundPlans(all, lead, null, opening)
    .flat()
    .flatMap((e) => (e.first ?? []).map((m) => [e.set, m] as const));
  const t0 = performance.now();
  let tFirst = firsts.length ? -1 : 0;
  const poll = setInterval(() => {
    if (tFirst < 0 && firsts.every(([s, m]) => loaded(s, m))) tFirst = performance.now() - t0;
  }, 20);
  await ch.prepare(all, lead, o.before ? undefined : opening);
  const ms = performance.now() - t0;
  clearInterval(poll);
  if (tFirst < 0) tFirst = ms;
  const files = performance.getEntriesByType("resource").filter((e) => /\/samples\//.test(e.name)) as PerformanceResourceTiming[];
  const bytes = files.reduce((t, e) => t + (e.encodedBodySize || e.transferSize || 0), 0);
  return { ms, firstMs: tFirst, firstNotes: firsts.length, residentMB: residentBytes() / 1e6, files: files.length, wireMB: bytes / 1e6, formats: [...new Set(files.map((e) => e.name.split("?")[0].split(".").pop()))], rate: ch.ctx.sampleRate };
};
W.__resident = () => residentBytes() / 1e6;

/** Play bars of a fugue on a sound (loaded first), counting underruns, late notes and long tasks. */
W.__play = async (o: { sound: string; piece: string; voice: number; fromBar: number; toBar: number; slim?: boolean }) => {
  use(o.sound, o.slim);
  const ch = theChip();
  await ch.resume();
  const f = fugueById(o.piece);
  await ch.prepare(everyNote(f).map((n) => n[2]), (f.voices[o.voice] ?? []).map((n) => n[2]));
  await new Promise((r) => setTimeout(r, 500));
  const from = barStart(f, o.fromBar);
  const until = barStart(f, o.toBar + 1);
  const proto = protoById("ladder");
  const g = new ProtoGame(f, [o.voice], from, proto, { bpm: tempoOf(f.id), legato: false, easy: easyOf(proto.id), fail: false, until, reading: playReading(f.id), ornHint: false, scale: false, demo: true } as never, ch);
  const st = g.notes.map((n: { step: number }) => n.step);
  const mid = (Math.min(...st) + Math.max(...st)) / 2;
  const rowH = 14;
  (g as unknown as { rows: unknown }).rows = { yOf: (s: number) => 200 + mid * rowH - s * rowH, stepAt: (y: number) => Math.round((200 + mid * rowH - y) / rowH), rowH, xOf: () => 0 };
  let notes = 0;
  let late = 0;
  let worstLate = 0;
  const orig = ch.note.bind(ch);
  (ch as unknown as { note: typeof ch.note }).note = (m, at, dur, v, pl = {}) => {
    notes++;
    const behind = ch.ctx.currentTime - at;
    if (behind > 0.005) (late++, (worstLate = Math.max(worstLate, behind)));
    return orig(m, at, dur, v, pl);
  };
  const s0 = stats(ch.ctx);
  const lt0 = longTasks.length;
  const ts0 = ch.ctx.getOutputTimestamp();
  const wall0 = performance.now();
  let frames = 0;
  let worstFrame = 0;
  let last = performance.now();
  await new Promise<void>((res) => {
    const loop = () => {
      const now = performance.now();
      worstFrame = Math.max(worstFrame, now - last);
      last = now;
      frames++;
      const done = g.step();
      if (done || g.now >= until + 1) return res();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await new Promise((r) => setTimeout(r, 1500));
  (ch as unknown as { note: typeof ch.note }).note = orig;
  const s1 = stats(ch.ctx);
  const ts1 = ch.ctx.getOutputTimestamp();
  const wall = (performance.now() - wall0) / 1000;
  // The audio clock against the wall's: a context that fell behind (frames not rendered in time) lags.
  const audio = ((ts1.contextTime ?? 0) - (ts0.contextTime ?? 0));
  const lt = longTasks.slice(lt0);
  return {
    sound: o.sound,
    secs: wall,
    notes,
    lateNotes: late,
    worstLateMs: worstLate * 1000,
    underrunEvents: s0 && s1 ? s1.underrunEvents - s0.underrunEvents : null,
    underrunMs: s0 && s1 ? (s1.underrunDuration - s0.underrunDuration) * 1000 : null,
    clockLagMs: ((ts1.performanceTime ?? 0) - (ts0.performanceTime ?? 0)) - audio * 1000,
    longTasks: lt.length,
    longestTaskMs: lt.length ? Math.max(...lt) : 0,
    worstFrameMs: worstFrame,
    fps: frames / wall,
    stolen: ch.stolen,
    failed: ch.failed,
    residentMB: residentBytes() / 1e6,
  };
};
W.__ready = true;
