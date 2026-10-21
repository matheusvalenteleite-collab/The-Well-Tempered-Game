/**
 * Writes data/touch/wtc1f02.json: the C minor fugue of Book I (BWV 847) for the touch game, cut
 * from the study's corpus (data/wtc/fugues.json, Humdrum encoding, true voices) so the touch page
 * does not carry all 48 fugues. Each voice is a list of [onset, duration, MIDI] in ticks.
 * Run: node tools/touch/extract.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";

const ID = "wtc1f02";
const corpus: WtcPiece[] = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/wtc/fugues.json", import.meta.url)), "utf8"));
const p = corpus.find((x) => x.id === ID);
if (!p) throw new Error(`${ID} not in the corpus`);
const out = {
  id: p.id,
  title: "Fugue 2 in C minor",
  book: p.book,
  bwv: p.bwv,
  meter: p.meter,
  tpq: TPQ,
  length: p.length,
  bars: p.bars,
  voiceNames: ["Soprano", "Alto", "Bass"],
  voices: p.voices.map((v) => v.map(([on, dur, pitch]) => [on, dur, parsePitch(pitch).midi])),
};
if (out.voices.length !== out.voiceNames.length) throw new Error(`expected ${out.voiceNames.length} voices, got ${out.voices.length}`);
const dir = fileURLToPath(new URL("../../data/touch/", import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}${ID}.json`, JSON.stringify(out) + "\n");
console.log(`wrote data/touch/${ID}.json: ${out.voices.map((v) => v.length).join(" + ")} notes, ${out.bars.length} bars`);
