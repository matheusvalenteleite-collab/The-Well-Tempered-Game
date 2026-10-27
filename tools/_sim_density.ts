import { installFakeAudio } from "../test/fake-audio.ts";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { setPreset } from "../src/touch/sound.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";
const piece = process.argv[2] ?? "bwv1043-3";
const preset = process.argv[3] ?? "super16";
const ctxOf = installFakeAudio(5);
await loadExtras();
const { Chip } = await import("../src/touch/chip.ts");
const { ProtoGame } = await import("../src/bench/proto-game.ts");
setPreset(preset);
const chip = new Chip();
const ctx = ctxOf();
const f = fugueById(piece)!;
const g: any = new ProtoGame(f, [0], startTick(f, 0), protoById("ladder"), { bpm: Number(process.env.BPM ?? 90), legato: false, fail: false } as never, chip);
let w = 0, pw = 0, ps = 0, pn = 0, m0 = ctx.totalMade();
for (let t = 0; ; t += 1 / 60) {
  ctx.advance(t);
  const done = g.step();
  pw = Math.max(pw, ctx.nodes.size); ps = Math.max(ps, ctx.sounding()); pn = Math.max(pn, chip.sounding());
  if (Math.floor(t / 20) > w || done) {
    w = Math.floor(t / 20);
    console.log(`${t.toFixed(0)}s made/s=${((ctx.totalMade() - m0) / 20).toFixed(0)} peakWired=${pw} peakSources=${ps} peakNotes=${pn} cap=${chip.cap} stolen=${chip.stolen}`);
    pw = ps = pn = 0; m0 = ctx.totalMade();
  }
  if (done) break;
}
