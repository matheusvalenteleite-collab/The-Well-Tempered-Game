/**
 * D352: the subject's colour in the music box: which notes are the subject's (made once per list), which
 * subject (1 red, 2 blue, 3 yellow: I/4's three, Contrapunctus XIV's three), the colours distinct within a
 * piece and still the voice's own lean, the voice raised over 150 ms either side of its entry; and nothing
 * of it reaches the sound or the score.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, FUGUES, type TouchFugue } from "../src/touch/fugue.ts";
import { accompaniment, entrySpans } from "../src/touch/voice-mode.ts";
import { membership, raiseOf, RAISE_FADE_MS, SUBJECT_SHIFT, subjectInk, subjectInkOf, themeOf } from "../src/touch/subject-hue.ts";
import { SubjectCues } from "../src/touch/subject-fx.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
/** The box's voice inks (MusicBox.tsx INKS: a .tsx the tests cannot load), read from its source. */
const INKS: Record<number, string[]> = Object.fromEntries(
  [...src("src/touch/MusicBox.tsx").matchAll(/^  (\d): \[([^\]]+)\],$/gm)].map((m) => [Number(m[1]), [...m[2].matchAll(/"(#[0-9a-f]{6})"/g)].map((x) => x[1])]),
);
const inkOf = (v: number, count: number) => INKS[count][v];
const barOn = (f: TouchFugue, n: number) => f.bars.find((b) => b.n === n)!.on;

/** A voice's own notes as the player's list carries them (no voice on each: the list's voice given). */
const own = (f: TouchFugue, v: number) => f.voices[v].map(([on, dur, midi, step]) => ({ on, dur, midi, step }));

/** The theme of the entry a note belongs to, or 0. */
function themeAt(f: TouchFugue, v: number, on: number): number {
  const spans = entrySpans(f);
  const list = own(f, v);
  const idx = membership(list, spans, v);
  const i = list.findIndex((n) => n.on === on);
  assert.ok(i >= 0, `${f.id}: no note of voice ${v} at ${on}`);
  return idx[i] < 0 ? 0 : themeOf(spans[idx[i]]);
}

test("I/2: the alto's first entry and the soprano's answer at bar 3 are the subject's; the soprano before it is not", () => {
  const f = fugueById("wtc1f02");
  const sop = f.entries.find((e) => e.voice === 0 && e.bar === 3)!;
  assert.ok(sop, "the soprano's entry at bar 3");
  assert.equal(themeAt(f, 1, f.entries[0].on), 1);
  for (const [on] of sop.notes) assert.equal(themeAt(f, 0, on), 1);
  // The others' list (the player the alto): the soprano's entry notes marked, the bass's notes before its entry not.
  const spans = entrySpans(f);
  const others = accompaniment(f, 0, 1);
  const idx = membership(others, spans);
  const marked = others.filter((_, i) => idx[i] >= 0);
  for (const [on] of sop.notes) assert.ok(marked.some((n) => n.voice === 0 && n.on === on), `soprano ${on}`);
  const bassEntry = f.entries.find((e) => e.voice === 2)!;
  assert.ok(!others.some((n, i) => n.voice === 2 && n.on < bassEntry.on && idx[i] >= 0));
  // The countersubject is never the subject's.
  const cs = spans.filter((s) => s.form === "counter");
  assert.ok(cs.length > 0);
  for (const c of cs) for (const p of c.path) if (!f.entries.some((e) => e.voice === c.voice && e.notes.some(([on]) => on === p.on))) assert.equal(themeAt(f, c.voice, p.on), 0);
});

test("I/4: its three subjects told apart (soprano I's second subject at bar 36, the alto's third at bar 49, the bass's first at bar 1)", () => {
  const f = fugueById("wtc1f04");
  const at = (v: number, theme: number, bar: number) => f.entries.find((e) => e.voice === v && (e.theme ?? 1) === theme && e.bar === bar)!;
  assert.equal(themeAt(f, 4, at(4, 1, 1).on), 1);
  assert.equal(themeAt(f, 0, at(0, 2, 36).on), 2);
  assert.equal(themeAt(f, 2, at(2, 3, 49).on), 3);
  // Every entry's notes carry its own theme (the first entry to claim a note keeps it, as the ear's cues do).
  const cues = new SubjectCues(f);
  for (const e of f.entries) for (const [on] of e.notes) if (f.voices[e.voice].some((n) => n[0] === on)) assert.equal(themeAt(f, e.voice, on), cues.note(e.voice, on)!.theme);
});

test("Contrapunctus XIV: the first subject, the running second (bar 114) and B-A-C-H (bar 193) each their own", () => {
  const f = fugueById("bwv1080-14");
  const first = (theme: number) => f.entries.find((e) => (e.theme ?? 1) === theme)!;
  assert.equal(first(1).bar, 1);
  assert.equal(first(2).bar, 114);
  assert.equal(first(3).bar, 193);
  for (const t of [1, 2, 3]) assert.equal(themeAt(f, first(t).voice, first(t).on), t);
  assert.ok(barOn(f, 193) <= first(3).on);
});

test("the box's subject notes are exactly the ear's (SubjectCues), in every fugue", () => {
  for (const f of FUGUES) {
    if (!f.entries.length) continue;
    const spans = entrySpans(f);
    const cues = new SubjectCues(f);
    for (let v = 0; v < f.voices.length; v++) {
      const list = own(f, v);
      const idx = membership(list, spans, v);
      list.forEach((n, i) => {
        const sn = cues.note(v, n.on);
        assert.equal(idx[i] >= 0, !!sn, `${f.id} voice ${v} at ${n.on}`);
        if (sn) assert.equal(themeOf(spans[idx[i]]), sn.theme, `${f.id} voice ${v} at ${n.on}: theme`);
      });
    }
  }
});

test("made once per list: the same answer object every frame, made again only when the list grows", () => {
  const f = fugueById("wtc1f02");
  const spans = entrySpans(f);
  const list = own(f, 1);
  const a = membership(list, spans, 1);
  assert.equal(membership(list, spans, 1), a);
  list.push({ on: f.length + 1, dur: 1, midi: 60, step: 30 });
  const b = membership(list, spans, 1);
  assert.notEqual(b, a);
  assert.equal(b.length, list.length);
  assert.equal(b[list.length - 1], -1);
});

test("D368: the colours: each voice its own hue, modified by its subject; distinct within a piece", () => {
  const hue = (hex: string) => {
    const v = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => x / 255);
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return h * 60;
  };
  const dist = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
  for (const count of [2, 3, 4, 5]) {
    for (let v = 0; v < count; v++) {
      const ink = inkOf(v, count);
      const [s1, s2, s3] = ([1, 2, 3] as const).map((t) => subjectInk(ink, t));
      // D368: the voice's own hue, modified: subject 1 on it, 2 and 3 turned ±34° off it.
      ([s1, s2, s3] as string[]).forEach((c, k) => assert.ok(dist(hue(c), (hue(ink) + SUBJECT_SHIFT[k + 1] + 360) % 360) <= 8, `${ink} theme ${k + 1}: ${c}`));
      assert.ok(dist(hue(s2), hue(s3)) > 50, `${ink}: ${s2} ${s3}`);
      assert.equal(subjectInkOf(ink, 2), s2);
    }
    // Two voices' subject never the same colour (each its own lean, or its own lightness).
    const s = Array.from({ length: count }, (_, v) => subjectInk(inkOf(v, count), 1));
    assert.equal(new Set(s).size, count);
  }
});

test("the voice raised: up over 150 ms before the entry, held, down over 150 ms after", () => {
  const tps = 960;
  const fade = (RAISE_FADE_MS / 1000) * tps;
  const s = { on: 10_000, end: 20_000 };
  assert.equal(raiseOf(s, s.on - fade - 1, tps), 0);
  assert.ok(raiseOf(s, s.on - fade / 2, tps) > 0 && raiseOf(s, s.on - fade / 2, tps) < 1);
  assert.equal(raiseOf(s, s.on, tps), 1);
  assert.equal(raiseOf(s, 15_000, tps), 1);
  assert.equal(raiseOf(s, s.end, tps), 1);
  assert.ok(raiseOf(s, s.end + fade / 2, tps) < 1);
  assert.equal(raiseOf(s, s.end + fade + 1, tps), 0);
});

test("drawing only: the sound, the loudness and the score never read the subject's colours", () => {
  for (const p of ["src/bench/proto-game.ts", "src/touch/lanes.ts", "src/touch/chip.ts", "src/touch/subject-fx.ts", "src/touch/piece-sound.ts", "src/touch/engine.ts", "src/bench/articulation.ts", "src/bench/practice.ts"]) {
    assert.ok(!/subject-hue/.test(src(p)), p);
  }
  // Only painters import it.
  assert.ok(/subject-hue\.ts/.test(src("src/touch/MusicBox.tsx")));
  assert.ok(/subject-hue\.ts/.test(src("src/touch/box-fx.ts")));
});
