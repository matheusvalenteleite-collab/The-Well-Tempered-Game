import { fugueById } from "./src/touch/fugue.ts";
import { formOf, phaseAt } from "./src/touch/form-points.ts";
import { scorePlan } from "./src/touch/score-drums.ts";
const f = fugueById("wtc1f02"); const fp = formOf(f);
for (const x of scorePlan(f, "scoreSynth").strokes.filter(x => x.piece === "shaker" && phaseAt(fp, x.tick).phase !== "episode")) console.log(x.tick/f.barTicks+1, phaseAt(fp,x.tick));
console.log(fp.seams.filter(s=>s.kind==="episode").map(s=>[s.on/f.barTicks+1, s.end/f.barTicks+1]));
