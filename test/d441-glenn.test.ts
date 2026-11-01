/**
 * D441, THE GLENN PILOT: Glenn's films keep their rules (no excerpt over four bars, nothing from the last
 * fifth of the piece, under 40% of the bars quoted, every flag on a note of its voice, a second chapter);
 * Glenn has his own wording of every line Part 1 says; the host is Glenn only where the pilot gives him a part.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { MANUAL, TOUR } from "../src/bench/manual/lessons.ts";
import { DRESS } from "../src/bench/manual/dress.ts";
import { FILMS, sayFor } from "../src/bench/films.ts";
import { tickOf, timeline } from "../src/bench/films.ts";
import { APP } from "../src/bench/config.ts";
import { GLENN_LINES, glennHosts, hostLine, setHost } from "../src/bench/glenn-host.ts";

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

test("D441: Glenn has his own wording of every line of Part 1, and hosts only in the pilot", () => {
  const p1 = MANUAL.filter((l) => l.part === "1");
  const lines = [...TOUR.map((t) => t.text), ...p1.flatMap((l) => [...l.before, ...l.after, ...l.again, ...l.stages.map((s) => s.say ?? "")]), ...DRESS.filter((d) => d.at.startsWith("1.")).map((d) => d.line.text)].filter(Boolean);
  for (const t of lines) assert.ok(GLENN_LINES[t], `Glenn's wording of: ${t}`);
  assert.equal(glennHosts("1"), false, "off outside the pilot");
  APP.glennPilot = true;
  assert.equal(glennHosts("1"), true);
  assert.equal(glennHosts("2"), false);
  setHost("glenn");
  assert.notEqual(hostLine(TOUR[0].text), TOUR[0].text);
  setHost("bach");
  assert.equal(hostLine(TOUR[0].text), TOUR[0].text);
  APP.glennPilot = false;
});
