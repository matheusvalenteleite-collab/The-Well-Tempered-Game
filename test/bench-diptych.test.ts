/** D234: the wheel's pair cards as a diptych: each prelude its own picture, the formal titles first, the key and kind in the corner. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { bookCards, cardById, pieceBwv, preludeLook } from "../src/bench/cards.ts";
import { drawLabel, EMBLEM_H, EMBLEM_W, emblemPixels, keyLabel, labelWidth } from "../src/bench/emblem.ts";
import { fugueById } from "../src/touch/fugue.ts";

// The browser the picker expects: storage, a document whose canvas has no context (the emblems left blank).
const g0 = globalThis as unknown as Record<string, unknown>;
const store = new Map<string, string>();
g0.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
g0.document ??= { createElement: () => ({ getContext: () => null }) };
register("./tsx-hooks.mjs", import.meta.url);

test("every Book I prelude has its own look and an emblem distinct from its fugue's", () => {
  for (const c of bookCards(1)) {
    const p = c.id.replace("wtc1f", "wtc1p");
    const look = preludeLook(p);
    assert.ok(look, p);
    assert.ok(look.trait.length > 10, p);
    assert.notDeepEqual([look.scene, look.figure, look.props], [c.scene, c.figure, c.props], `${p}: a look of its own`);
    const a = emblemPixels(p);
    assert.equal(a.length, EMBLEM_W * EMBLEM_H);
    assert.notEqual(a.join(""), emblemPixels(c.id).join(""), `${p} differs from its fugue`);
  }
  const all = new Set(bookCards(1).map((c) => emblemPixels(c.id.replace("wtc1f", "wtc1p")).join("")));
  assert.equal(all.size, 24, "every prelude's emblem its own");
  assert.equal(preludeLook("wtc1f01"), undefined);
  assert.equal(preludeLook("wtc2p01"), undefined);
});

test("the pair numbered under its one BWV; the label names key and kind and stays in its corner", () => {
  const c = cardById("wtc1f01")!;
  assert.equal(pieceBwv(c, "prelude"), "BWV 846/1");
  assert.equal(pieceBwv(c), "BWV 846/2");
  assert.equal(pieceBwv(cardById("bwv1080-14")!), "BWV 1080/19");
  assert.equal(keyLabel("C", "prelude"), "C · PRAELUDIUM");
  assert.equal(keyLabel("c#", "fugue"), "c♯ · FUGA");
  assert.equal(keyLabel("eb", "prelude"), "e♭ · PRAELUDIUM");
  const rects: [number, number, number, number][] = [];
  const g = { fillStyle: "" as unknown, fillRect: (x: number, y: number, w: number, h: number) => void rects.push([x, y, w, h]) };
  drawLabel(g, keyLabel("Bb", "prelude"), 5);
  for (const [x, y, w, h] of rects) assert.ok(x >= EMBLEM_W * 5 * 0.4 && x + w <= EMBLEM_W * 5 && y >= 0 && y + h <= EMBLEM_H * 5 * 0.3, `${x},${y}`);
  // Discreet: under half the picture's width.
  assert.ok(labelWidth("C♯ · PRAELUDIUM") * 2 < EMBLEM_W * 5 * 0.5);
});

test("the card: the formal titles first, the fugue panel locked until its prelude is beaten", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { FuguePicker, formalTitle } = await import("../src/bench/FuguePicker.tsx");
  // The server renderer's note that layout effects do not run there: expected, not shown.
  const err = console.error;
  console.error = (...a: unknown[]) => void (String(a[0]).includes("useLayoutEffect") || err(...a));
  const html = renderToStaticMarkup(React.createElement(FuguePicker, { current: "wtc1f01", pick: () => {} }));
  assert.match(html, /BWV 846\/1 · PRELUDE IN C MAJOR/);
  assert.match(html, /BWV 846\/2 · FUGUE IN C MAJOR/);
  assert.match(html, /class="tb-diptych"/);
  assert.match(html, /id="wheel-play-fugue"[^>]*disabled[^>]*>🔒 BEAT THE PRELUDE</);
  assert.match(html, /id="wheel-play-prelude" class="tb-play"/);
  assert.match(html, /aria-label="Fugue"/);
  // I/8: the prelude in E♭ minor, its fugue in D♯ minor.
  assert.equal(formalTitle(cardById("wtc1f08")!, "prelude"), "BWV 853/1 · PRELUDE IN E♭ MINOR");
  assert.equal(formalTitle(cardById("wtc1f08")!), "BWV 853/2 · FUGUE IN D♯ MINOR");
  assert.equal(fugueById("wtc1p08").key, "eb");
  // Once the prelude is beaten, the fugue's PLAY opens.
  store.set("tb-stages-v1", JSON.stringify({ wtc1p01: { beaten: "2026-10-23", best: "B" } }));
  const open = renderToStaticMarkup(React.createElement(FuguePicker, { current: "wtc1f01", pick: () => {} }));
  assert.match(open, /id="wheel-play-fugue" class="tb-play"[^>]*>PLAY FUGUE ▶</);
  assert.match(open, /✓ BEATEN/);
  // Book II: one panel, the same hierarchy.
  const two = renderToStaticMarkup(React.createElement(FuguePicker, { current: "wtc2f02", pick: () => {} }));
  assert.match(two, /tb-diptych tb-diptych-one/);
  assert.match(two, /BWV 871\/2 · FUGUE IN C MINOR/);
  assert.equal(formalTitle(cardById("bwv1080-14")!), "BWV 1080/19 · CONTRAPUNCTUS XIV");
});
