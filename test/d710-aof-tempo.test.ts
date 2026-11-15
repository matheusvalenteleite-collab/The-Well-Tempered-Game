/**
 * D710: THE ART OF FUGUE'S OPENING TEMPO WITHIN THE RECORDINGS'. data/tempi/aof-recordings.csv: track durations on
 * Apple Music's store pages (nine releases, their URLs), each turned into the average quarter-note tempo over the
 * piece's length as the game has it (a canon's repeat not taken). For every piece of BWV 1080 (Contrapunctus 14
 * besides, from the recordings of D199), the tempo it opens on (tempi.ts tempoOf: DEFAULT, or FAST where OPENING_STEP
 * says) lies between the slowest and the fastest recording used. Where DEFAULT alone lay under them, FAST is the opening.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { AOF_FAST, MORE_TEMPO, OPENING_STEP, TEMPO, tempoOf } from "../src/touch/tempi.ts";

before(async () => {
  await loadExtras();
});

/** CSV rows, quotes respected. */
const rows = readFileSync(new URL("../data/tempi/aof-recordings.csv", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((l) => [...l.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map((m) => m[2] ?? m[1]).slice(0, 7));
const IDS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12r", "12i", "13r", "13i", "c14", "c15", "c16", "c17"].map((k) => `bwv1080-${k}`);

function implied(id: string): number[] {
  const f = fugueById(id);
  const q = f.length / f.tpq;
  return rows
    .filter((r) => r[0] === id && r[6] === "yes")
    .map((r) => {
      const [m, s] = r[4].split(":").map(Number);
      return q / ((m * 60 + s) / 60);
    })
    .sort((a, b) => a - b);
}

test("D710: every Art of Fugue piece opens at a tempo inside its recordings' range (at least seven recordings each, each with its store page)", () => {
  assert.ok(rows.every((r) => /^https:\/\/classical\.music\.apple\.com\//.test(r[5]) && /^\d+:\d\d$/.test(r[4])));
  for (const id of IDS) {
    const t = implied(id);
    assert.ok(t.length >= 7, `${id}: ${t.length} recordings`);
    const bpm = tempoOf(id);
    assert.ok(bpm >= t[0] && bpm <= t.at(-1)!, `${id}: ${bpm} outside ${t[0].toFixed(1)}-${t.at(-1)!.toFixed(1)}`);
    // FAST only where DEFAULT lies under every recording.
    assert.equal(OPENING_STEP[id] === "fast", MORE_TEMPO[id].normal < t[0], id);
  }
  assert.equal(AOF_FAST.length, 10);
  // Contrapunctus 14 on DEFAULT, inside D199's recordings (25) and these.
  const xiv = TEMPO["bwv1080-14"];
  assert.ok(tempoOf("bwv1080-14") === xiv.normal && xiv.normal >= xiv.range[0] && xiv.normal <= xiv.range[1]);
  const x = implied("bwv1080-14");
  assert.ok(x.length >= 7 && tempoOf("bwv1080-14") >= x[0] && tempoOf("bwv1080-14") <= x.at(-1)!);
});

test("D710: Contrapunctus 14 ends in tempo where the text stops (no final ritard); Contrapunctus 1 keeps D181's", async () => {
  const { ProtoGame } = await import("../src/bench/proto-game.ts");
  const { protoById } = await import("../src/bench/protos.ts");
  const { BREAKS_OFF } = await import("../src/touch/tempi.ts");
  const chip = { ctx: { currentTime: 0 }, heard: () => 0, note: () => ({ stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }), swoosh() {}, tick() {} } as never;
  const beatAt = (id: string, fromEnd: number) => {
    const f = fugueById(id);
    const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: 60, legato: false, solo: true, easy: "direction", fail: false, reading: null }, chip);
    const t = f.length - fromEnd * f.tpq;
    return g.timeAt(t) - g.timeAt(t - f.tpq);
  };
  assert.ok(BREAKS_OFF.has("bwv1080-14") && BREAKS_OFF.size === 1);
  assert.ok(Math.abs(beatAt("bwv1080-14", 0) - beatAt("bwv1080-14", 40)) < 1e-6, "XIV: the last beat as long as one 10 bars before");
  assert.ok(beatAt("bwv1080-01", 0) > beatAt("bwv1080-01", 40) * 1.1, "C1: the automatic ritard");
  // Bach's text: the last note of Contrapunctus 14 ends with bar 239, the game's last.
  const xiv = fugueById("bwv1080-14");
  assert.equal(xiv.bars.at(-1)!.n, 239);
  assert.equal(Math.max(...xiv.voices.flat().map((n) => n[0] + n[1])), xiv.length);
});
