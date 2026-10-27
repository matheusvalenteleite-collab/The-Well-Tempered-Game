/**
 * D333 (WTC 1.49): the owner's STUDY file (THE LAB › STUDY › SAVE FILE, wtc-study-YYYY-MM-DD.json) read
 * for the developer, as markdown (src/bench/lab/study-report.ts): per excerpt the learning curve over its
 * ten takes, the first three against the last three, the persistent errors and those that went away;
 * overall what improved and what plateaued.
 *
 *   node tools/lab/study-report.ts <study.json> [--out report.md]
 *   node tools/lab/study-report.ts <study.json> --take 3:4 > take.json   one take as a lab log
 *                                                                         (tools/lab/replay.ts reads it;
 *                                                                         replay.ts --take 3:4 does too)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseStudy, takeOf } from "../../src/bench/lab/study.ts";
import { studyMarkdown } from "../../src/bench/lab/study-report.ts";

const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!file) {
  console.error("usage: node tools/lab/study-report.ts <study.json> [--out report.md] [--take E:T]");
  process.exit(2);
}
const study = parseStudy(readFileSync(file, "utf8"));
if (args.includes("--take")) {
  console.log(JSON.stringify(takeOf(study, args[args.indexOf("--take") + 1] ?? "")));
  process.exit(0);
}
const md = studyMarkdown(study);
if (args.includes("--out")) writeFileSync(args[args.indexOf("--out") + 1], md);
else console.log(md);
