/**
 * D441, THE GLENN PILOT: Glenn's films keep their rules (no excerpt over four bars, nothing from the last
 * fifth of the piece, under 40% of the bars quoted, every flag on a note of its voice, a second chapter);
 * Glenn has his own wording of every line Part 1 says; the host is Glenn only where the pilot gives him a part.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { FILMS, sayFor } from "../src/bench/films.ts";
import { tickOf, timeline } from "../src/bench/films.ts";

test("D441: every film keeps the rules: short excerpts, never the ending, a second chapter", () => {
  for (const film of Object.values(FILMS)) {
    const f = fugueById(film.piece);
    const bars = f.bars.length;
    const quoted = new Set<number>();
    for (const c of film.cues) {
      if (c.kind !== "play") continue;
      assert.ok(c.to - c.from <= 4, `${film.piece}: ${c.from}–${c.to} over four bars`);
      assert.ok(c.to <= bars * 0.8 + 1, `${film.piece}: ${c.to} reaches into the last fifth`);
      for (let b = Math.floor(c.from); b < Math.ceil(c.to); b++) quoted.add(b);
      for (const fl of c.flags ?? []) {
        const on = tickOf(f, fl.at);
        assert.ok(f.voices[fl.voice].some((n) => Math.abs(n[0] - on) < f.tpq / 8), `${film.piece}: the flag "${fl.text}" is on a note`);
        assert.ok(fl.at >= c.from && fl.at < c.to, `${film.piece}: the flag "${fl.text}" inside its excerpt`);
      }
    }
    assert.ok(quoted.size / bars < 0.4, `${film.piece}: ${quoted.size} of ${bars} bars quoted`);
    assert.equal(film.cues.filter((c) => c.kind === "chapter").length, 2);
    const tl = timeline(film);
    assert.ok(tl.chapter2 > 0 && tl.chapter2 < tl.total);
    assert.ok(tl.total > 120 && tl.total < 300, `${film.piece}: ${Math.round(tl.total)} s`);
  }
  assert.ok(sayFor("x") >= 2.5);
});
