const R = "/home/user/wt-synth";
const { presetBudget } = await import(`${R}/src/touch/budget.ts`);
const { PATCHES } = await import(`${R}/src/touch/sound.ts`);
const synth = process.argv[2] === "synth";
if (synth) for (const id of ["bandViolin", "consViolin", "bandCello", "consCello"]) (PATCHES as any)[id].sample = undefined;
for (const id of ["stringConsort", "baroqueBand"]) { const b = presetBudget(id); console.log(synth ? "synth strings" : "today", id, b.mb.toFixed(1), "MB decoded,", b.residentMb.toFixed(1), "resident"); }
