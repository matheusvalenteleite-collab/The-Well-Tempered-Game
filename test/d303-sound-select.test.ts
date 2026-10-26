import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { soundOptions } = await import("../src/bench/SoundSelect.tsx");
const { PIECE_SOUND } = await import("../src/touch/piece-sound.ts");

test("D303: the dropdown holds every sound once, the piece's own first under THIS PIECE", () => {
  const own = PIECE_SOUND["wtc1p01"];
  const groups = soundOptions(POP_SOUNDS, own);
  assert.equal(groups[0].group, "THIS PIECE");
  assert.deepEqual(groups[0].items.map(([id]) => id), [own]);
  const ids = groups.flatMap((g) => g.items.map(([id]) => id));
  assert.deepEqual([...ids].sort(), POP_SOUNDS.map(([id]) => id).sort(), "each once");
  assert.ok(!groups.some((g) => g.group === "MORE"), "every sound has a kind");
});

test("D303: without a piece, no THIS PIECE; a sound of no kind goes under MORE", () => {
  const groups = soundOptions([...POP_SOUNDS, ["newThing", "NEW THING"]]);
  assert.notEqual(groups[0].group, "THIS PIECE");
  assert.deepEqual(groups.at(-1), { group: "MORE", items: [["newThing", "NEW THING"]] });
});
