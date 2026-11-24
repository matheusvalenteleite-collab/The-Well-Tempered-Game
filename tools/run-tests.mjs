/**
 * Phase 2 (code audit, finding 5): the two test tiers.
 *   node tools/run-tests.mjs quick   everything except the files listed in test/full-tier.txt (npm test)
 *   node tools/run-tests.mjs full    every test file (npm run test:full; the Pages build runs this)
 * Any further arguments go to `node --test`.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const tier = process.argv[2] ?? "quick";
if (tier !== "quick" && tier !== "full") {
  console.error("usage: node tools/run-tests.mjs quick|full [node --test options]");
  process.exit(2);
}
const all = readdirSync("test").filter((f) => f.endsWith(".test.ts")).map((f) => `test/${f}`).sort();
const slow = readFileSync("test/full-tier.txt", "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const missing = slow.filter((f) => !existsSync(f));
if (missing.length) {
  console.error(`test/full-tier.txt names files that do not exist: ${missing.join(", ")}`);
  process.exit(2);
}
const files = tier === "full" ? all : all.filter((f) => !slow.includes(f));
console.log(`test tier ${tier}: ${files.length} of ${all.length} files`);
const r = spawnSync(process.execPath, ["--test", ...process.argv.slice(3), ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);
