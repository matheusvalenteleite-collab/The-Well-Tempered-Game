/**
 * D317, THE LAB offline: a run's log (the lab's COPY LOG, pasted into a file) played again through the
 * engine, with parameters changed, printing the verdicts and what changed.
 *
 *   node tools/lab/replay.ts <log.json> [--set key=value ...] [--verdicts] [--all] [--json]
 *
 *   --set legatoGapMs=120 --set slides=false   change parameters (src/bench/mechanics.ts MECH keys)
 *   --verdicts   print every verdict of the replay, one line each (the lab's feed)
 *   --all        with --verdicts, also the original's lines beside
 *   --json       the replay's tally, summary and changed notes as JSON
 *   --keys       list the parameters, their defaults and the log's values
 *
 * Without --set it checks the replay against the log (the same parameters: identical verdicts
 * expected). The file may hold text before the log (a pasted message): it is read from the first "{".
 */
import { readFileSync } from "node:fs";
import { MECH_DEFAULTS, MECH_SPEC, setMech, MECH, resetMech, type Mech } from "../../src/bench/mechanics.ts";
import { parseLog } from "../../src/bench/lab/log.ts";
import { diff, replay } from "../../src/bench/lab/replay.ts";
import { describe } from "../../src/bench/lab/describe.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--set"));
if (!file) {
  console.error("usage: node tools/lab/replay.ts <log.json> [--set key=value ...] [--verdicts] [--all] [--json] [--keys]");
  process.exit(2);
}
const log = parseLog(readFileSync(file, "utf8"));
const sets: Record<string, string> = {};
args.forEach((a, i) => {
  const kv = a.startsWith("--set=") ? a.slice(6) : a === "--set" ? args[i + 1] : null;
  if (!kv) return;
  const [k, v] = kv.split("=");
  if (!(k in MECH_DEFAULTS)) {
    console.error(`unknown parameter "${k}" (--keys lists them)`);
    process.exit(2);
  }
  sets[k] = v;
});
if (args.includes("--keys")) {
  for (const s of MECH_SPEC) console.log(`${s.key.padEnd(16)} default ${String(MECH_DEFAULTS[s.key]).padEnd(8)} log ${String(log.mech[s.key] ?? "-").padEnd(8)} ${s.label}`);
  process.exit(0);
}
// The changes on top of the log's parameters, coerced to their types.
resetMech();
setMech(log.mech);
setMech(sets);
const after: Mech = { ...MECH };
resetMech();

const p = log.passage;
const r = replay(log, after);
const d = diff(log, log.verdicts, r.events, r.mech);
if (args.includes("--json")) {
  console.log(JSON.stringify({ passage: p, line: d.line, changed: d.changed, before: d.before, after: d.after, summary: r.summary, notes: d.notes }, null, 1));
  process.exit(0);
}
console.log(`${p.piece} voice ${p.voice} bars ${p.fromBar}-${p.toBar} · ${Math.round(p.bpm)} bpm (${p.tempoPct}%) · ${p.proto}${p.bt ? " · BLUETOOTH" : ""}${p.wait ? " · WAIT" : ""}${p.reading ? ` · reading ${p.reading}` : ""}`);
console.log(`recorded ${log.at} · ${log.app} · ${log.device.ua.slice(0, 80)}`);
console.log(`screen ${log.device.w}x${log.device.h} @${log.device.dpr} · play area ${log.area.w}x${log.area.h} · rows ${log.rows ? `${log.rows.rowH} px` : "none"} · output latency ${log.device.outputLatency ?? "?"} · delay ${log.device.lag ?? "none"}`);
const t = (x: typeof d.before) => `right ${x.right} · wrong ${x.wrong} · missed ${x.missed} · stray ${x.stray} · joined ${x.joined} (not ${x.notJoined}) · slides ${x.slides} · shakes ${x.shakes} · cancels ${x.cancels}`;
console.log(`original: ${t(d.before)}`);
console.log(`replay:   ${t(d.after)}`);
console.log(d.line);
if (args.includes("--verdicts")) {
  console.log("");
  if (args.includes("--all")) {
    console.log("— original —");
    for (const e of log.verdicts) for (const l of describe(p.piece, e)) console.log(l);
    console.log("— replay —");
  }
  for (const e of r.events) for (const l of describe(p.piece, e)) console.log(l);
}
if (d.notes.length) {
  console.log("");
  console.log(`${d.notes.length} note${d.notes.length === 1 ? "" : "s"} changed:`);
  for (const n of d.notes.slice(0, 200)) console.log(`  ${n}`);
}
