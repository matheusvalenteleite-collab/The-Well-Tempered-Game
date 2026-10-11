/**
 * D152: in three voices, species 2-5, the continuo hears the moving voice in its rhythm, so it reads
 * a suspended bar from its resolution instead of holding the downbeat's chord against it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { playerStaves, trioSteps } from "../src/game/trio.ts";
import { continuoOptions, trioContinuoInput } from "../src/game/continuo-input.ts";
import { realizeContinuo } from "../src/continuo/realize.ts";
import { DEFAULT_CONTINUO_SETTINGS } from "../src/game/continuo-settings.ts";
import { parsePitch } from "../src/music/pitch.ts";

test("D152: the trio continuo's right hand does not hold a chord against a resolved suspension (Fux's fourth-species trios)", () => {
  const whole = (d: string) => {
    const [a, b] = d.split("/").map(Number);
    return a / b;
  };
  for (const S of trioSteps(data as never, 4)) {
    const mine = playerStaves(S);
    const input = trioContinuoInput(S, mine, mine.map((i) => S.fux[i]));
    // The moving voice in its rhythm: minims, the last bar whole.
    const moving = input.voices[1 + mine.indexOf(S.movingIndex!)].notes;
    assert.equal(moving.reduce((a, x) => a + whole(x.duration), 0), S.cantus.length, S.id);
    const real = realizeContinuo(input, continuoOptions("player", DEFAULT_CONTINUO_SETTINGS));
    const sung = input.voices.flatMap((v) => {
      let t = 0;
      return v.notes.map((x) => {
        const d = 2 * whole(x.duration); // beats are minims
        const o = { p: x.pitch, s: t, e: t + d };
        t += d;
        return o;
      });
    });
    let clashes = 0;
    for (const ev of real.events)
      if (ev.role !== "bass")
        for (const m of ev.midi)
          for (const x of sung)
            if (x.p && x.s < ev.startBeat + ev.durationBeats - 1e-6 && x.e > ev.startBeat + 1e-6 && [1, 2, 10, 11].includes(Math.abs(parsePitch(x.p).midi - m) % 12)) clashes++;
    // Reading the downbeats only, these exercises had 11 to 20 each.
    assert.ok(clashes <= 3, `${S.id}: ${clashes} seconds or sevenths between the right hand and a sung voice`);
  }
});
