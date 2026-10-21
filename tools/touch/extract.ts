/**
 * Writes data/touch/wtc1f02.json: the C minor fugue of Book I (BWV 847) for the touch game, cut
 * from the study's corpus (data/wtc/fugues.json, Humdrum encoding, true voices) so the touch page
 * does not carry all 48 fugues. Each voice is a list of [onset, duration, MIDI] in ticks.
 * The entries of the subject are the study's (src/wtc/library.ts, found by the subject's head), each
 * taken in its voice for the subject's whole length, as the subject (bar 1) or as the tonal answer
 * (bar 3), whichever its notes follow more closely; a note neither form has at its place is marked
 * as Bach's variant. The keys of the entries are read from the score by hand (KEYS below).
 * Run: node tools/touch/extract.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { LIBRARY } from "../../src/wtc/library.ts";

const ID = "wtc1f02";
const corpus: WtcPiece[] = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/wtc/fugues.json", import.meta.url)), "utf8"));
const p = corpus.find((x) => x.id === ID);
if (!p) throw new Error(`${ID} not in the corpus`);
// The key of each entry, in order: the exposition in c, g, c; the relative major at bar 11; g at 15; c from 20.
const KEYS = ["c", "g", "c", "Eb", "g", "c", "c", "c"];

type Note = [number, number, number];
const voices: Note[][] = p.voices.map((v) => v.map(([on, dur, pitch]) => [on, dur, parsePitch(pitch).midi] as Note));
const lib = LIBRARY.find((x) => x.id === "wtc1.02")!.fugue();
const subj = lib.subject;
// The subject's span: from its first onset to the end of its last note.
const SPAN = Math.round((subj[subj.length - 1].at + subj[subj.length - 1].dur - subj[0].at) * TPQ);
if (lib.entries.length !== KEYS.length) throw new Error(`expected ${KEYS.length} entries, got ${lib.entries.length}`);

const raw = lib.entries.map((e) => {
  const voice = lib.voice[e.notes[0]];
  const on = Math.round(e.at * TPQ);
  return { voice, on, notes: voices[voice].filter((n) => n[0] >= on && n[0] < on + SPAN) };
});
// A form: each note's place (ticks from the entry's start) and pitch (semitones from its first note).
const shape = (r: (typeof raw)[number]) => new Map(r.notes.map((n) => [n[0] - r.on, n[2] - r.notes[0][2]]));
const forms = { subject: shape(raw[0]), answer: shape(raw[1]) };
const fit = (r: (typeof raw)[number], form: Map<number, number>) => r.notes.filter((n) => form.get(n[0] - r.on) === n[2] - r.notes[0][2]).length;

const entries = raw.map((r, i) => {
  const form = fit(r, forms.answer) > fit(r, forms.subject) ? "answer" : "subject";
  const f = forms[form];
  return {
    voice: r.voice,
    form,
    key: KEYS[i],
    bar: p.bars.filter((b) => b.on <= r.on).at(-1)!.n,
    on: r.on,
    end: r.on + SPAN,
    // [onset, duration, MIDI, 1 if Bach varies the form here]
    notes: r.notes.map((n) => [n[0], n[1], n[2], f.get(n[0] - r.on) === n[2] - r.notes[0][2] ? 0 : 1]),
  };
});

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
  voices,
  entries,
};
if (out.voices.length !== out.voiceNames.length) throw new Error(`expected ${out.voiceNames.length} voices, got ${out.voices.length}`);
const dir = fileURLToPath(new URL("../../data/touch/", import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}${ID}.json`, JSON.stringify(out) + "\n");
console.log(`wrote data/touch/${ID}.json: ${out.voices.map((v) => v.length).join(" + ")} notes, ${out.bars.length} bars`);
for (const e of entries)
  console.log(`  bar ${e.bar} ${out.voiceNames[e.voice]} ${e.form} in ${e.key}: ${e.notes.length} notes, ${e.notes.filter((n) => n[3]).length} varied`);
