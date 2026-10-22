/**
 * Writes data/touch/fugues.json: the 48 fugues for the touch game (D167), cut from the study's corpus
 * (data/wtc/fugues.json, Humdrum encoding, true voices). Each voice is a list of [onset, duration,
 * MIDI, staff step] in ticks (the step: the note's letter and octave, 7 per octave, C0 = 0, so the
 * lanes are the staff's lines and spaces).
 * The entries of the subject are the study's (src/wtc/library.ts, found by the subject's head), each
 * taken in its voice for the subject's whole length, as the subject or as the answer (the second
 * entry), whichever its notes follow more closely. An entry's key is the subject's key moved by the
 * entry's transposition, its mode read from the third above that tonic in the entry's notes; for the
 * C minor fugue of Book I the keys were read from the score by hand (D159).
 * The sections: the exposition (until every voice has had its first entry), then sections of 4 to
 * 10 bars, each ending on the first beat of the bar where an entry lands (8 bars where none does).
 * The C minor fugue keeps the sections read by hand (D163).
 * Run: node tools/touch/extract.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { LIBRARY } from "../../src/wtc/library.ts";

const corpus: WtcPiece[] = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/wtc/fugues.json", import.meta.url)), "utf8"));

const NAMES: Record<number, string[]> = {
  2: ["Upper", "Lower"],
  3: ["Soprano", "Alto", "Bass"],
  4: ["Soprano", "Alto", "Tenor", "Bass"],
  5: ["Soprano I", "Soprano II", "Alto", "Tenor", "Bass"],
};
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// Key names in the piece's own spelling: sharps in the sharp keys, flats in the flat ones.
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_KEYS = new Set(["G", "D", "A", "E", "B", "F#", "C#", "e", "b", "f#", "c#", "g#", "d#"]);

/** Hand readings for the C minor fugue (D159, D163). */
const HAND: Record<string, { keys: string[]; cuts: [number, number, string][] }> = {
  wtc1f02: {
    keys: ["c", "g", "c", "Eb", "g", "c", "c", "c"],
    cuts: [
      [1, 9, "Exposition"],
      [9, 13, "To the E♭ entry"],
      [13, 17, "To the G minor entry"],
      [17, 22, "To the C minor entry"],
      [22, 29, "To the bass entry"],
      [29, 32, "The last entry"],
    ],
  },
};

type Note = [number, number, number, number];

const keyName = (k: string) => {
  const minor = k[0] === k[0].toLowerCase();
  return `${k[0].toUpperCase()}${k.slice(1).replace("b", "♭").replace("#", "♯")} ${minor ? "minor" : "major"}`;
};

const out = corpus
  .filter((p) => p.kind === "fugue")
  .sort((a, b) => a.book - b.book || a.number - b.number)
  .map((p) => {
    const libId = `wtc${p.book}.${String(p.number).padStart(2, "0")}`;
    const lib = LIBRARY.find((x) => x.id === libId)!.fugue();
    const barQ = (Number(p.meter.split("/")[0]) * 4) / Number(p.meter.split("/")[1]);
    const b1 = (p.bars.find((b) => b.n === 1)?.on ?? 0) / TPQ;
    const pad = b1 > 1e-6 ? barQ - b1 : 0;
    const spell: Record<number, string> = {};
    const voices: Note[][] = p.voices.map((v) =>
      v
        .filter(([, dur]) => dur > 0)
        .map(([on, dur, pitch]) => {
          const sp = parsePitch(pitch);
          spell[sp.midi] ??= pitch;
          return [on, dur, sp.midi, sp.diatonic] as Note;
        })
        .sort((a, b) => a[0] - b[0] || b[2] - a[2]),
    );
    const barTicks = barQ * TPQ;
    const barOn = (n: number) => p.bars.find((b) => b.n === n)?.on ?? p.length;
    const barAt = (tick: number) => p.bars.filter((b) => b.on <= tick).at(-1)?.n ?? p.bars[0].n;
    const lastBar = p.bars.at(-1)!.n;

    // The entries, in their voices, for the subject's length.
    const subj = lib.subject;
    const span = Math.round((subj[subj.length - 1].at + subj[subj.length - 1].dur - subj[0].at) * TPQ);
    const raw = lib.entries.map((e) => {
      const voice = lib.voice[e.notes[0]];
      const on = Math.round((e.at - pad) * TPQ);
      return { voice, on, shift: e.shift, notes: voices[voice].filter((n) => n[0] >= on && n[0] < on + span) };
    });
    const shape = (r: (typeof raw)[number]) => new Map(r.notes.map((n) => [n[0] - r.on, n[2] - r.notes[0]?.[2]]));
    const forms = { subject: raw[0] ? shape(raw[0]) : new Map(), answer: raw[1] ? shape(raw[1]) : new Map() };
    const fit = (r: (typeof raw)[number], form: Map<number, number>) => r.notes.filter((n) => form.get(n[0] - r.on) === n[2] - r.notes[0][2]).length;
    const tonicPc = PC[p.key[0]] + (p.key[1] === "#" ? 1 : p.key[1] === "b" ? -1 : 0);
    const hand = HAND[p.id];
    const entries = raw
      .filter((r) => r.notes.length)
      .map((r, i) => {
        const form = i > 0 && fit(r, forms.answer) > fit(r, forms.subject) ? "answer" : "subject";
        // The entry's tonic: the subject's moved by the transposition (the answer stands a fifth above).
        const pc = (((tonicPc + r.shift) % 12) + 12) % 12;
        const pcs = new Set(r.notes.map((n) => n[2] % 12));
        const third = pcs.has((pc + 4) % 12) && !pcs.has((pc + 3) % 12) ? "major" : pcs.has((pc + 3) % 12) && !pcs.has((pc + 4) % 12) ? "minor" : p.mode;
        const names = SHARP_KEYS.has(p.mode === "minor" ? p.key.toLowerCase() : p.key) ? SHARP_NAMES : FLAT_NAMES;
        const key = hand?.keys[i] ?? (third === "minor" ? names[pc].toLowerCase() : names[pc]);
        const f = forms[form];
        return {
          voice: r.voice,
          form,
          key,
          bar: barAt(r.on),
          on: r.on,
          end: r.on + span,
          notes: r.notes.map((n) => [n[0], n[1], n[2], f.get(n[0] - r.on) === n[2] - r.notes[0][2] ? 0 : 1]),
        };
      })
      .sort((a, b) => a.on - b.on);

    // The bar a section ends with: where the entry lands (its first beat), or the next bar.
    const landing = (end: number) => {
      const b = barAt(Math.min(end, p.length - 1));
      return end - barOn(b) <= TPQ ? b : Math.min(b + 1, lastBar + 1);
    };
    let cuts: [number, number, string][];
    if (hand) cuts = hand.cuts;
    else {
      cuts = [];
      const firstOf = new Map<number, number>();
      for (const e of entries) if (!firstOf.has(e.voice)) firstOf.set(e.voice, e.end);
      const expEnd = Math.max(...firstOf.values());
      const start = p.bars[0].n === 0 ? 0 : 1;
      let from = start;
      let to = Math.max(from + 2, landing(expEnd));
      cuts.push([from, to, "Exposition"]);
      from = to;
      const lands = entries.map((e) => ({ bar: landing(e.end), e })).filter((x) => x.bar > to);
      while (from <= lastBar) {
        const c = lands.find((x) => x.bar >= from + 4 && x.bar <= from + 10);
        let next = c ? c.bar : Math.min(from + 8, lastBar + 1);
        if (lastBar + 1 - next < 3) next = lastBar + 1;
        const name = c ? `To the ${keyName(c.e.key)} entry` : "Onwards";
        cuts.push([from, next, next > lastBar ? (c ? `The last entry` : "To the end") : name]);
        from = next;
      }
    }
    const sections = cuts.map(([fromBar, toBar, name]) => ({
      name,
      fromBar,
      toBar: Math.min(toBar, lastBar),
      from: barOn(fromBar),
      to: toBar > lastBar ? p.length : barOn(toBar) + TPQ,
    }));

    const minor = p.mode === "minor";
    return {
      id: p.id,
      book: p.book,
      number: p.number,
      title: `Fugue ${p.number} in ${p.key.replace("b", "♭").replace("#", "♯")} ${p.mode}`,
      key: minor ? p.key.toLowerCase() : p.key,
      bwv: p.bwv.replace(/[a-z]$/, ""),
      meter: p.meter,
      tpq: TPQ,
      length: p.length,
      barTicks,
      bars: p.bars,
      voiceNames: NAMES[voices.length] ?? voices.map((_, i) => `Voice ${i + 1}`),
      voices,
      entries,
      spell,
      sections,
    };
  });

const dir = fileURLToPath(new URL("../../data/touch/", import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}fugues.json`, JSON.stringify(out) + "\n");
const notes = out.reduce((s, f) => s + f.voices.reduce((t, v) => t + v.length, 0), 0);
console.log(`wrote data/touch/fugues.json: ${out.length} fugues, ${notes} notes, ${out.reduce((s, f) => s + f.sections.length, 0)} sections`);
for (const f of out.slice(0, 4)) console.log(`  ${f.id} ${f.voices.length} voices; sections ${f.sections.map((s) => `${s.fromBar}-${s.toBar}`).join(" ")}; entry keys ${f.entries.map((e) => e.key).join(" ")}`);
