/**
 * D542, loading by priority: the opening's zones (chip.ts openingOf, soundPlans `first`) fetched before the rest, at most
 * FETCH_MAX at once; the smallest decodable copy (sampled.ts wireFormats: Opus, AAC, the MP3 last); a zone not yet loaded
 * played by the synthesizer while a zone loaded beside it plays its recording (per zone, not per preset).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, openingOf, soundPlans, voicing } from "../src/touch/chip.ts";
import { fugueById, everyNote } from "../src/touch/fugue.ts";
import { setPreset } from "../src/touch/sound.ts";
import { FETCH_MAX, loaded, setLoadPolicy, wireBytes, wireFile } from "../src/touch/sampled.ts";

const ctxOf = installFakeAudio(0, true);

test("D542: the opening is each voice's first two bars, and its zones are the instruments' own for those voices only", () => {
  const f = fugueById("wtc1f02");
  const o = openingOf(f);
  assert.equal(o.count, f.voices.length);
  // I/2 begins with one voice alone: its first two bars, no other voice's.
  assert.ok(o.notes.length > 3 && new Set(o.notes.map(([v]) => v)).size === 1, JSON.stringify(o.notes));
  setPreset("jazzQuartet");
  const plans = soundPlans(everyNote(f).map((n) => n[2]), [], null, o).flat();
  const firsts = plans.filter((e) => e.first?.length);
  assert.equal(new Set(firsts.map((e) => e.set)).size, 1, "one instrument's set (the entering voice's)");
  assert.ok(firsts[0].first!.length <= o.notes.length);
  assert.ok(plans.filter((e) => e.notes.length && !e.first?.length).length > 0, "the rest after");
  assert.ok(plans.some((e) => e.soon && e.notes.length), "the drums soon");
});

test("D542: every recording has its smaller copies, named by its MP3, and they are smaller", () => {
  for (const [set, m] of [["grand", 60], ["harpsichord", 60], ["jazzVibes", 60], ["rickBass", 40], ["latinPerc", 57]] as const) {
    const mp3 = wireFile(set, m, "mp3");
    const webm = wireFile(set, m, "webm");
    const m4a = wireFile(set, m, "m4a");
    if (!mp3?.v) continue;
    assert.ok(webm && m4a, `${set} ${m}: copies`);
    assert.equal(webm!.file, mp3.file.replace(/\.mp3$/, ".webm"));
    assert.ok(wireBytes(set, m, "webm") < mp3.v && wireBytes(set, m, "m4a") < mp3.v, `${set} ${m}`);
  }
});

test("D542: a zone not yet loaded plays the synthesizer, the zone beside it its recording, in one preset", async () => {
  setLoadPolicy({ wire: ["mp3"], queue: true });
  // Every file answers but C6's and its neighbours' (any layer; a neighbour within 3 semitones would stand in, D505).
  (globalThis as { fetch?: unknown }).fetch = (url: string) =>
    !/\/(C6|Ds6|A5)(-v\d+)?\.mp3/.test(String(url)) ? Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new Uint8Array(1024).fill(0xff).buffer) }) : Promise.resolve({ ok: false });
  setPreset("pianoSampled");
  const chip = new Chip();
  const ctx = ctxOf();
  await chip.prepare([60, 84], [60]);
  assert.ok(loaded("grand", 60), "C4 loaded");
  assert.ok(!loaded("grand", 84), "C6 not");
  const buffers = () => ctx.made.get("buffer") ?? 0;
  const oscs = () => ctx.made.get("oscillator") ?? 0;
  const b0 = buffers();
  chip.note(60, 0.1, 0.4, voicing(0, 2));
  assert.ok(buffers() > b0, "C4 from its recording");
  const o0 = oscs();
  const b1 = buffers();
  chip.note(84, 0.6, 0.4, voicing(0, 2));
  assert.ok(oscs() > o0 && buffers() === b1, "C6 synthesized meanwhile");
  setLoadPolicy({ wire: null });
});

test("D542: at most FETCH_MAX fetches at once, the opening's first", async () => {
  setLoadPolicy({ wire: ["mp3"], queue: true });
  let open = 0;
  let most = 0;
  const order: string[] = [];
  (globalThis as { fetch?: unknown }).fetch = async (url: string) => {
    open++;
    most = Math.max(most, open);
    order.push(String(url));
    await new Promise((r) => setTimeout(r, 2));
    open--;
    return { ok: true, arrayBuffer: () => Promise.resolve(new Uint8Array(1024).fill(0xff).buffer) };
  };
  setPreset("harpsichordSampled");
  const chip = new Chip();
  ctxOf();
  const f = fugueById("wtc1f01");
  const o = openingOf(f);
  await chip.prepare(everyNote(f).map((n) => n[2]), [], o);
  assert.ok(most <= FETCH_MAX, `${most} at once`);
  const firstFiles = new Set(soundPlans(everyNote(f).map((n) => n[2]), [], null, o).flat().flatMap((e) => (e.first ?? []).map((m) => `${e.set}:${m}`)));
  // The opening's files were the first asked (the queue served them before the rest).
  const firstUrls = order.slice(0, firstFiles.size).filter((u) => /\/harpsichord\//.test(u));
  assert.ok(firstUrls.length >= Math.min(firstFiles.size, FETCH_MAX) - 1);
  setLoadPolicy({ wire: null });
});
