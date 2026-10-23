/**
 * D210: how much Web Audio the bench's game makes: a fugue played through by the real Chip on a fake
 * context (test/fake-audio.ts), the player's voice (the top) left unplayed, the band at its fullest
 * (×4). Prints, per preset, the nodes made per second (on average, and in the busiest second), the
 * most sources and notes sounding at once, and the most nodes wired into the graph at once.
 * Run: node tools/audio-load.ts [fugue] [touchPoints: 0 a computer, 5 a phone]
 */
import { installFakeAudio } from "../test/fake-audio.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { setPreset } from "../src/touch/sound.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";

const piece = process.argv[2] ?? "bwv1080-14";
const touch = Number(process.argv[3] ?? 0);
const ctxOf = installFakeAudio(touch);
const { Chip } = await import("../src/touch/chip.ts");
const { ProtoGame } = await import("../src/bench/proto-game.ts");

for (const preset of ["harpsichordSampled", "strings", "baroque", "bossa", "chip", "carlos"]) {
  setPreset(preset);
  const chip = new Chip();
  const ctx = ctxOf();
  const f = fugueById(piece);
  const g = new ProtoGame(f, [0], startTick(f, 0), protoById("ladder"), { bpm: 80, legato: false, fail: false } as never, chip);
  let peakSrc = 0;
  let peakNodes = 0;
  let peakNotes = 0;
  const made0 = ctx.totalMade();
  let worst = 0;
  let prev = made0;
  let sec = 0;
  for (let t = 0; ; t += 1 / 60) {
    ctx.advance(t);
    g.mult = 4;
    const done = g.step();
    peakSrc = Math.max(peakSrc, ctx.sounding());
    peakNodes = Math.max(peakNodes, ctx.nodes.size);
    peakNotes = Math.max(peakNotes, chip.sounding());
    if (Math.floor(t) > sec) {
      sec = Math.floor(t);
      worst = Math.max(worst, ctx.totalMade() - prev);
      prev = ctx.totalMade();
    }
    if (done) break;
  }
  const dur = ctx.currentTime;
  console.log(
    `${piece} ${preset.padEnd(19)} ${dur.toFixed(0)} s  nodes made/s ${((ctx.totalMade() - made0) / dur).toFixed(0)} (busiest second ${worst})  most sources ${peakSrc}  most notes ${peakNotes} (cap ${chip.cap}, ${chip.stolen} let go early)  most wired ${peakNodes}`,
  );
}
