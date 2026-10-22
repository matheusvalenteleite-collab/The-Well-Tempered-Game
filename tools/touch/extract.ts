/**
 * Writes data/touch/pieces.json: the 96 preludes and fugues for the touch game (D167, D168), in the
 * book's order (each prelude before its fugue), cut from the study's corpus (data/wtc/fugues.json and
 * preludes.json, Humdrum encoding). Each voice is a list of [onset, duration,
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
 * The preludes (D168) are played by hands, not voices: most are encoded as one keyboard stream split
 * in two sub-lines, the upper (sub-line 0) the right hand and the rest the left; those encoded on two
 * staves take a staff for a hand, the higher the right; the C sharp minor prelude of Book I, written in
 * four real voices, keeps them. A prelude's sections end on the harmonic map's cadences (4 to 10 bars,
 * 6 where none falls), and its colours follow the keys those cadences reach.
 * `keys` is each piece's timeline of keys for the music box's colour: a fugue's entries, a prelude's
 * cadences.
 * D169: and the unfinished Fuga a 3 soggetti of the Art of Fugue (Contrapunctus XIV), from the Mutopia
 * Project's public-domain MIDI (data/sources/art-of-fugue/SOURCE.md), spelled as D minor spells.
 * Run: node tools/touch/extract.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { LIBRARY } from "../../src/wtc/library.ts";
import { readMidi } from "./midi.ts";

const read = (f: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../data/wtc/${f}`, import.meta.url)), "utf8"));
const corpus: WtcPiece[] = read("fugues.json");
const preludeCorpus: WtcPiece[] = read("preludes.json");
const maps: { id: string; moments: { kind: string; bar: number; onset: string; to?: string }[] }[] = read("harmonic-maps.json").pieces;

const NAMES_BY_COUNT: Record<number, string[]> = {
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

const fugues = corpus
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
      kind: "fugue",
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
      voiceNames: NAMES_BY_COUNT[voices.length] ?? voices.map((_, i) => `Voice ${i + 1}`),
      voices,
      entries,
      keys: entries.map((e) => ({ on: e.on, key: e.key })),
      spell,
      sections,
    };
  });

/** A cadence's key as the maps give it ("G", "E# minor") in the game's spelling ("G", "e#"). */
const cadenceKey = (to: string) => (/ minor$/.test(to) ? to.replace(/ minor$/, "").toLowerCase() : to.replace(/ major$/, ""));
const fraction = (s: string) => {
  const [a, b] = s.split("/").map(Number);
  return a / (b || 1);
};

const preludes = preludeCorpus
  .sort((a, b) => a.book - b.book || a.number - b.number)
  .map((p) => {
    const barQ = (Number(p.meter.split("/")[0]) * 4) / Number(p.meter.split("/")[1]);
    const b1 = (p.bars.find((b) => b.n === 1)?.on ?? 0) / TPQ;
    const pad = b1 > 1e-6 ? barQ - b1 : 0;
    const spell: Record<number, string> = {};
    // The parts: by sub-line in a one-stream encoding (0 the right hand), else by staff.
    const groups = new Map<string, Note[]>();
    p.voices.forEach((v, si) =>
      v
        .filter(([, dur]) => dur > 0)
        .forEach(([on, dur, pitch, sub]) => {
          const sp = parsePitch(pitch);
          spell[sp.midi] ??= pitch;
          const key = p.voices.length === 1 ? (sub === 0 ? "hi" : "lo") : String(si);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push([on, dur, sp.midi, sp.diatonic]);
        }),
    );
    const mean = (g: Note[]) => g.reduce((t, n) => t + n[2], 0) / g.length;
    const voices = [...groups.values()].sort((a, b) => mean(b) - mean(a)).map((g) => g.sort((a, b) => a[0] - b[0] || b[2] - a[2]));
    const voiceNames = voices.length === 2 ? ["Right hand", "Left hand"] : NAMES_BY_COUNT[voices.length] ?? voices.map((_, i) => `Part ${i + 1}`);
    const barTicks = barQ * TPQ;
    const barOn = (n: number) => p.bars.find((b) => b.n === n)?.on ?? p.length;
    const lastBar = p.bars.at(-1)!.n;
    const cadences = (maps.find((m) => m.id === p.id)?.moments ?? [])
      .filter((m) => m.kind === "cadence" && m.to)
      .map((m) => ({ bar: m.bar, on: Math.round((fraction(m.onset) * 4 - pad) * TPQ), key: cadenceKey(m.to!) }));
    const cuts: [number, number, string][] = [];
    const start = p.bars[0].n === 0 ? 0 : 1;
    for (let from = start; from <= lastBar; ) {
      const near = (lo: number, hi: number) => cadences.find((c) => c.bar >= from + lo && c.bar <= from + hi);
      const c = near(4, 8) ?? near(9, 10);
      let next = c ? c.bar : from + 6;
      if (lastBar + 1 - next < 3) next = lastBar + 1;
      const name = from === start ? "Opening" : next > lastBar ? "To the end" : c ? `To the cadence in ${keyName(c.key)}` : "Onwards";
      cuts.push([from, next, name]);
      from = next;
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
      kind: "prelude",
      book: p.book,
      number: p.number,
      title: `Prelude ${p.number} in ${p.key.replace("b", "♭").replace("#", "♯")} ${p.mode}`,
      key: minor ? p.key.toLowerCase() : p.key,
      bwv: p.bwv.replace(/[a-z]$/, ""),
      meter: p.meter,
      tpq: TPQ,
      length: p.length,
      barTicks,
      bars: p.bars,
      voiceNames,
      voices,
      entries: [],
      keys: cadences.map((c) => ({ on: c.on, key: c.key })),
      spell,
      sections,
    };
  });

/** Contrapunctus XIV (D169): the four voices of the MIDI, the highest first, on the WTC's ticks. */
function contrapunctus() {
  const m = readMidi(readFileSync(fileURLToPath(new URL("../../data/sources/art-of-fugue/contrapunctus-xiv/contrapunctusXIX.mid", import.meta.url))));
  const k = TPQ / m.division;
  // D minor's spelling of the twelve pitch classes (both forms of the sixth and seventh, C sharp, F sharp, G sharp, E flat).
  const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
  const spell: Record<number, string> = {};
  const parts = m.tracks
    .filter((t) => t.notes.length)
    .map((t) =>
      t.notes.map(([on, dur, midi]) => {
        const name = `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
        spell[midi] ??= name;
        return [Math.round(on * k), Math.round(dur * k), midi, parsePitch(name).diatonic] as Note;
      }),
    );
  const mean = (g: Note[]) => g.reduce((t, n) => t + n[2], 0) / g.length;
  const voices = parts.sort((a, b) => mean(b) - mean(a));
  const length = Math.max(...voices.flat().map((n) => n[0] + n[1]));
  const barTicks = 4 * TPQ;
  const bars = Array.from({ length: Math.ceil(length / barTicks) }, (_, i) => ({ n: i + 1, on: i * barTicks }));
  return {
    id: "bwv1080-14",
    kind: "fugue",
    book: 0,
    number: 14,
    title: "Contrapunctus XIV (unfinished)",
    key: "d",
    bwv: "1080",
    meter: "4/4",
    tpq: TPQ,
    length,
    barTicks,
    bars,
    voiceNames: NAMES_BY_COUNT[4],
    voices,
    entries: [],
    keys: [],
    spell,
    sections: [{ name: "Whole", fromBar: 1, toBar: bars.length, from: 0, to: length }],
  };
}

const out = [...preludes, ...fugues, contrapunctus()].sort((a, b) => (a.book || 9) - (b.book || 9) || a.number - b.number || (a.kind === "prelude" ? -1 : 1));

const dir = fileURLToPath(new URL("../../data/touch/", import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}pieces.json`, JSON.stringify(out) + "\n");
const notes = out.reduce((s, f) => s + f.voices.reduce((t, v) => t + v.length, 0), 0);
console.log(`wrote data/touch/pieces.json: ${out.length} pieces, ${notes} notes, ${out.reduce((s, f) => s + f.sections.length, 0)} sections`);
for (const f of out.slice(0, 4)) console.log(`  ${f.id} ${f.voiceNames.join("/")}; sections ${f.sections.map((s) => `${s.fromBar}-${s.toBar}`).join(" ")}; keys ${f.keys.map((k) => k.key).join(" ")}`);
