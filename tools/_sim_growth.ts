import { installFakeAudio } from "../test/fake-audio.ts";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { setPreset } from "../src/touch/sound.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";
const piece = process.argv[2] ?? "bwv1043-3";
const preset = process.argv[3] ?? "super16";
const voice = Number(process.argv[4] ?? 0);
const ctxOf = installFakeAudio(5);
await loadExtras();
const { Chip } = await import("../src/touch/chip.ts");
const { ProtoGame } = await import("../src/bench/proto-game.ts");
setPreset(preset);
const chip = new Chip();
const ctx = ctxOf();
const f = fugueById(piece)!;
console.log(piece, (f as any).voices?.length, "voices");
const g: any = new ProtoGame(f, [voice], startTick(f, voice), protoById("ladder"), { bpm: 120, legato: false, fail: false, demo: process.env.DEMO === "1" } as never, chip);
let sec = 0;
const sizes = () => {
  const out: string[] = [];
  for (const k of Object.keys(g)) {
    const v = g[k];
    if (Array.isArray(v) && v.length > 50) out.push(`${k}=${v.length}`);
    else if (v instanceof Map && v.size > 50) out.push(`${k}=${v.size}m`);
    else if (v instanceof Set && v.size > 50) out.push(`${k}=${v.size}s`);
  }
  for (const k of Object.keys(chip)) {
    const v = (chip as any)[k];
    if (Array.isArray(v) && v.length > 20) out.push(`chip.${k}=${v.length}`);
    else if (v instanceof Map && v.size > 20) out.push(`chip.${k}=${v.size}m`);
  }
  let ev = 0, worst = 0, wk = "";
  for (const n of ctx.nodes as Set<any>) for (const k of Object.keys(n)) { const v = n[k]; if (v && Array.isArray(v.events)) { ev += v.events.length; if (v.events.length > worst) { worst = v.events.length; wk = n.kind + "." + k; } } }
  out.push(`paramEvents=${ev} worst=${worst} ${wk}`);
  return out.join(" ");
};
for (let t = 0; ; t += 1 / 60) {
  ctx.advance(t);
  const done = g.step();
  if (Math.floor(t / 30) > sec) {
    sec = Math.floor(t / 30);
    console.log(`t=${t.toFixed(0)}s wired=${ctx.nodes.size} sources=${ctx.sounding()} notes=${chip.sounding()} made=${ctx.totalMade()} ${sizes()}`);
  }
  if (done || t > 1200) break;
}
{ const owners: string[] = []; const seen = new Set();
  const walk = (o: any, path: string, d: number) => { if (!o || typeof o !== "object" || seen.has(o) || d > 4) return; seen.add(o);
    for (const k of Object.keys(o)) { const v = o[k]; if (v && v.gain && Array.isArray(v.gain.events) && v.gain.events.length > 30) owners.push(path + "." + k + "=" + v.gain.events.length + " " + JSON.stringify(v.gain.events.slice(-4))); else if (v && typeof v === "object" && !(v.ctx && v.kind)) walk(v, path + "." + k, d + 1); } };
  walk(chip, "chip", 0); walk(g, "g", 0); console.log(owners.join("\n")); }
console.log("end", ctx.currentTime.toFixed(0), "s wired", ctx.nodes.size);
