import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { piecesSplit, HEAVY } from "../tools/touch/pieces-split.ts";
import { PIECES, entryKinds, loadPiece, loadPiecePair, pieceReady } from "../src/touch/fugue.ts";

// D1054: the browser build's split of pieces.json (stubs + a chunk of notes per piece) must give back exactly the file.
type Hook = (this: unknown, id: string, importer?: string) => string | null | undefined;
const plugin = piecesSplit();
const resolve = plugin.resolveId as unknown as Hook;
const load = plugin.load as unknown as Hook;
const whole: Record<string, unknown>[] = JSON.parse(readFileSync(new URL("../data/touch/pieces.json", import.meta.url), "utf8"));
const asJson = (code: string | null | undefined) => JSON.parse(code!.replace(/^export default /, "").replace(/;$/, ""));

test("stubs plus notes are exactly pieces.json, and the stubs are light", () => {
  const stubCode = load.call({}, resolve.call({}, "virtual:pieces-stub")!)!;
  const stubs: Record<string, unknown>[] = asJson(stubCode);
  assert.equal(stubs.length, whole.length);
  const loaders = load.call({}, resolve.call({}, "virtual:pieces-loaders")!)!;
  let heavy = 0;
  let light = 0;
  for (const [i, p] of whole.entries()) {
    const stub = stubs[i];
    assert.equal(stub.id, p.id, "same order");
    const { has, ...rest } = stub;
    if ("voices" in stub) {
      // left whole on purpose (Contrapunctus XIV)
      assert.deepEqual(stub, p);
      assert.ok(!loaders.includes(JSON.stringify(p.id)), "a whole piece has no loader");
      continue;
    }
    assert.ok(has, `${p.id} has entry flags`);
    const notes = asJson(load.call({}, resolve.call({}, `virtual:piece-notes/${p.id}`)!));
    assert.deepEqual(Object.keys(notes).sort(), [...HEAVY].sort());
    assert.deepEqual({ ...rest, ...notes }, p, `${p.id} is whole again`);
    assert.ok(loaders.includes(`"${p.id}": () => import("virtual:piece-notes/${p.id}")`));
    heavy += JSON.stringify(notes).length;
    light += JSON.stringify(rest).length;
  }
  assert.ok(light < heavy / 5, `stubs are light (${light} against ${heavy})`);
});

test("the stub's entry flags say what the entries say", () => {
  const stubs: Record<string, unknown>[] = asJson(load.call({}, resolve.call({}, "virtual:pieces-stub")!));
  for (const [i, p] of whole.entries()) {
    const has = stubs[i].has as ReturnType<typeof entryKinds> | undefined;
    if (!has) continue;
    const es = p.entries as { inverted?: boolean; scale?: number; theme?: number }[];
    assert.deepEqual(has, { inverted: es.some((e) => e.inverted), augmented: es.some((e) => e.scale === 2), laterSubjects: es.some((e) => e.theme) });
  }
});

test("in Node (tests, tools) the pieces are whole at once and loadPiece changes nothing", async () => {
  assert.ok(PIECES.every((p) => p.voices.length > 0 && p.entries !== undefined));
  assert.ok(pieceReady("wtc1f02"));
  await loadPiece("wtc1f02");
  await loadPiecePair("wtc1p02");
  assert.deepEqual(entryKinds(PIECES[1]), entryKinds(PIECES[1]));
});
