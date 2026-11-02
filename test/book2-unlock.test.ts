/**
 * D382: Book II opens on play.html once every Book I fugue has been finished (played to its end, whatever
 * the grade); the owner's passphrase still opens everything; a note on the selection until seen.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BOOK_ONE_FUGUES, bookTwoEarned, bookTwoNews, bookTwoOpen, LITE_KEY, liteNextOrder, liteTabs, writeLite } from "../src/bench/lite.ts";
import { setUnlocked, UNLOCK_KEY } from "../src/bench/unlock.ts";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
beforeEach(() => store.clear());

test("D382: Book I's 24 fugues are the condition, preludes not needed", () => {
  assert.equal(BOOK_ONE_FUGUES.length, 24);
  assert.equal(BOOK_ONE_FUGUES[0], "wtc1f01");
  assert.equal(BOOK_ONE_FUGUES[23], "wtc1f24");
  assert.equal(bookTwoEarned([]), false);
  assert.equal(bookTwoEarned(BOOK_ONE_FUGUES.slice(0, 23)), false, "23 of 24 is not enough");
  assert.equal(bookTwoEarned([...BOOK_ONE_FUGUES]), true);
  assert.equal(bookTwoEarned(BOOK_ONE_FUGUES.map((f) => f.replace("f", "p"))), false, "preludes do not count for fugues");
});

test("D489: Book II open from the start for the friends: its tab and NEXT order, with no fugue finished", () => {
  assert.equal(bookTwoOpen(), true);
  assert.deepEqual(liteTabs().map(([t]) => t), ["I", "II"], "MORE BACH and CHORALES stay behind the passphrase");
  assert.ok(liteNextOrder("wtc1f24", true).includes("wtc2f01"), "NEXT goes on into Book II");
});

test("D382: the passphrase unlock still opens everything without Book I finished", () => {
  setUnlocked(true);
  assert.equal(store.get(UNLOCK_KEY), "1");
  assert.equal(bookTwoOpen(), true);
  assert.deepEqual(liteTabs().map(([t]) => t), ["I", "II", "MORE", "CHORALES"]);
  assert.equal(bookTwoNews(), false, "no celebration for the owner's unlock");
});

test("D489: no 'Book II unlocked' note, since it was never locked", () => {
  assert.equal(bookTwoNews(), false);
  writeLite({ beaten: [...BOOK_ONE_FUGUES] });
  assert.equal(bookTwoNews(), false);
  assert.ok(store.has(LITE_KEY));
});

test("D382: the selection shows the note and play.html lets Book II's fugues be picked once earned", () => {
  const sel = src("src/bench/Selection.tsx");
  assert.match(sel, /id="book2-news"/);
  assert.match(sel, /BOOK II UNLOCKED!/);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /\/\^wtc2f\\d\\d\$\/\.test\(pair\) && bookTwoOpen\(\)/);
  for (const d of ["pt", "es"]) {
    const dict = src(`src/i18n/${d}.ts`);
    for (const k of ["BOOK II UNLOCKED!", "You finished all 24 fugues of Book I. 24 more await.", "OPEN BOOK II"]) assert.ok(dict.includes(`"${k}"`), `${d}: ${k}`);
  }
});
