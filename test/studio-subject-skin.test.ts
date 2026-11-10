/**
 * The design studio (D478): the subject lit in every voice; seven skins in place of D465's twelve travellers.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SKIN_CAST, SKINS, drawSkin, skinOf } from "../src/touch/subject-skin.ts";
import { STAGE_IDS } from "../src/touch/stage-bg.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D478: every world has its skin, from the seven; II/3 BOLT, II/5 bronze COMET, II/6 FIRE as previewed", () => {
  for (const id of STAGE_IDS) assert.ok(SKINS.includes(skinOf(id).skin), id);
  assert.equal(Object.keys(SKIN_CAST).length, 48);
  assert.deepEqual(skinOf("wtc2f03"), { skin: "BOLT", metal: "gold" });
  assert.deepEqual(skinOf("wtc2f05"), { skin: "COMET", metal: "bronze" });
  assert.equal(skinOf("wtc2f06").skin, "FIRE");
  for (const sk of SKINS) assert.ok(Object.values(SKIN_CAST).some((c) => (Array.isArray(c) ? c[0] : c) === sk), `${sk} cast somewhere`);
});

test("D478: each skin draws only rectangles, within its budget, stateless; nothing outside the entry but its burst", () => {
  const ns = [0, 480, 960, 1440].map((on, i) => ({ on, dur: 480, top: 40 - i * 4 }));
  for (const sk of SKINS) {
    for (const now of [100, 700, 1500]) {
      let rects = 0;
      const other: string[] = [];
      const g = new Proxy({} as CanvasRenderingContext2D, {
        get: (_, k) => (k === "fillRect" ? () => rects++ : typeof k === "string" && /^(fillStyle|globalAlpha)$/.test(k) ? undefined : () => other.push(String(k))),
        set: () => true,
      });
      const used = drawSkin(sk, "gold", ns, { g, xOf: (t) => t / 10, now, beat: 480, t: 3.2, ink: "#5cb2ff", rowH: 6 }, 400);
      assert.deepEqual(other, [], `${sk}: rectangles only`);
      assert.ok(used <= 400 && rects < 1200, `${sk}: ${rects}`);
    }
  }
});

test("D478: the others' subject drawn full and outlined; light and shadow with the stage; QUIET no skin; nothing judged", () => {
  const mb = src("src/touch/MusicBox.tsx");
  assert.match(mb, /if \(si >= 0 && full && spans!\[si\]\.form !== "counter"\) \{/);
  assert.match(mb, /if \(staged && spans && stageMode\(\) !== "off"\) lightAndShadow\(/);
  assert.match(src("src/touch/box-fx.ts"), /if \(stageMode\(\) === "quiet"\) continue;/);
  const s = src("src/touch/subject-skin.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/"hit"|"miss"|score|state\b/.test(s));
  // No strobe: a bolt's path changes at most 8 times a second; its colours are constants.
  assert.match(src("src/touch/subject-skin.ts"), /const BOLT_HZ = 8;/);
});
