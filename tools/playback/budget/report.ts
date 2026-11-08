/**
 * D540: the decoded-audio budget of every sound (src/touch/budget.ts): `node tools/playback/budget/report.ts [--json]`.
 * MB as a phone holds them (48 kHz Float32; stereo folded past the phone's budget; a v2's slimming), each preset's worst
 * fugue and voice, its own drums within it, the largest DRUMS kit, and the resident total with that kit.
 */
import { presetBudget, PRESET_MB, RESIDENT_MB } from "../../../src/touch/budget.ts";
import { PRESETS, TRIALS, V2_PRESETS } from "../../../src/touch/sound.ts";

const rows = [...PRESETS, ...TRIALS, ...V2_PRESETS].map((p) => presetBudget(p.id));
if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 1));
else {
  console.log(`preset                 MB   (piece, voice)      own drums  +DRUMS kit  resident   (limits ${PRESET_MB} / ${RESIDENT_MB} MB)`);
  for (const r of rows)
    console.log(`${r.id.padEnd(20)} ${r.mb.toFixed(1).padStart(6)}  ${`${r.piece} v${r.voice}`.padEnd(16)} ${r.ownDrumsMb.toFixed(1).padStart(8)} ${r.drumsOnMb.toFixed(1).padStart(10)} ${r.residentMb.toFixed(1).padStart(10)}${r.mb > PRESET_MB || r.residentMb > RESIDENT_MB ? "  OVER" : ""}`);
}
