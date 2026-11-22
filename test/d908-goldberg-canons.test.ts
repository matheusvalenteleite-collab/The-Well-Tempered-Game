/**
 * D908: THE GOLDBERG CANONS' SECOND LINE AND BASS WHOLE (Vars. 6, 12, 15, 21, 24): the layers' four voices folded into
 * the three real parts by tools/touch/more-bach.ts `joinCanon`. Not one note's onset or pitch changed (the fixture: the
 * notes before, from the data as it was); each line one note at a time; every part offered; the canon paired.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { echoPairs } from "../src/touch/canon-echo.ts";

const BEFORE: Record<string, string> = JSON.parse(readFileSync(new URL("./fixtures/d908-goldberg-canons.json", import.meta.url), "utf8"));
const IDS = Object.keys(BEFORE);
before(loadExtras);

test("D908: the five canons in three parts, every note where it was (onset and pitch, the divisi too)", () => {
  assert.deepEqual(IDS, ["bwv988-06", "bwv988-12", "bwv988-15", "bwv988-21", "bwv988-24"]);
  for (const id of IDS) {
    const f = fugueById(id);
    assert.equal(f.voices.length, 3, id);
    const now = [...f.voices.flat(), ...(f.bandVoices ?? []).flatMap((b) => b.notes)].map((n) => `${n[0]}:${n[2]}`).sort();
    assert.equal(now.join(" "), BEFORE[id], `${id}: a note moved or changed`);
  }
});

test("D908: the second canonic line one note at a time, whole; all three parts offered", () => {
  for (const id of IDS) {
    const f = fugueById(id);
    const line = f.voices[1];
    for (let i = 0; i + 1 < line.length; i++) assert.ok(line[i][0] + line[i][1] <= line[i + 1][0], `${id}: the line overlaps itself at ${line[i][0]}`);
    assert.ok(!(f.bandVoices ?? []).some((b) => b.of === 1), `${id}: no divisi in the line`);
    assert.deepEqual(f.playable, [0, 1, 2], id);
  }
});

test("D908: the canon answered within the two upper parts: most of the follower's notes paired", () => {
  for (const id of IDS) {
    const f = fugueById(id);
    const pairs = echoPairs(f);
    const lineNotes = f.voices[1].length;
    const inLine = new Set(pairs.flatMap((p) => [p.a, p.b]).filter((n) => n.voice === 1).map((n) => n.on));
    assert.ok(inLine.size / lineNotes > 0.85, `${id}: ${inLine.size}/${lineNotes} of the line in the canon`);
    assert.ok(!pairs.some((p) => p.a.voice === 2 || p.b.voice === 2), `${id}: the bass in no canonic pair`);
  }
});
