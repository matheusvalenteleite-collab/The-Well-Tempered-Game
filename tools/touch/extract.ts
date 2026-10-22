/**
 * Writes data/touch/pieces.json: the 96 preludes and fugues for the touch game (D167, D168), in the
 * book's order (each prelude before its fugue), cut from the study's corpus (data/wtc/fugues.json and
 * preludes.json, Humdrum encoding). Each voice is a list of [onset, duration,
 * MIDI, staff step] in ticks (the step: the note's letter and octave, 7 per octave, C0 = 0, so the
 * lanes are the staff's lines and spaces).
 * The entries of the subject are the study's (src/wtc/library.ts, found by the subject's head, and,
 * D189, in augmentation and diminution), each taken in its voice for the subject's whole length
 * (scaled), less two the library finds wrongly (NOT_ENTRIES). D189: an entry's key is read from its
 * own notes and the music sounding with it, its level kept unless they contradict it, and spelled
 * as the score spells; it is the answer where that key is the dominant's (tools/touch/analysis.ts);
 * for the C minor fugue of Book I the keys were read from the score by hand (D159), and the reading
 * agrees. D189: each fugue's cadences, and its countersubject against each entry where it has a
 * regular one (analysis.ts).
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
 * Project's public-domain MIDI (data/sources/art-of-fugue/SOURCE.md), spelled as D minor spells;
 * D189: its three subjects' entries and its cadences.
 * Run: node tools/touch/extract.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { LIBRARY } from "../../src/wtc/library.ts";
import { findEntriesByHead, subjectAndAnswer } from "../../src/wtc/fugue.ts";
import { laterSubjects } from "../../src/wtc/subjects.ts";
import { readMidi } from "./midi.ts";
import { buildEntries, countersubjects, findCadences, keySpeller, type RawEntry } from "./analysis.ts";

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

/**
 * D189: entries the library finds that are not statements of the subject, by Bach's bar and voice
 * (0 the highest). Book I no. 8, b. 17, bass (F♯ F♯ E♯ D♯ C♯ B♯…: the subject's rhythm, an octave
 * leap for its fifth, then a scale) and b. 33, alto (G♯ A♯ G♯ F♯ E♯ D♯…: the rhythm again, not the
 * intervals): rhythm-only matches of entries.ts's finder, read in the score by the music audit of
 * 22 October 2026 (item 6); Ledbetter's claims for the fugue (data/wtc/ledbetter-claims.txt) name
 * no entry at either bar.
 */
const NOT_ENTRIES: Record<string, [bar: number, voice: number][]> = {
  wtc1f08: [
    [17, 2],
    [33, 1],
  ],
};

/**
 * D197: the fugues whose later subjects (data/wtc/later-subjects.json, Ledbetter 2002) are carried
 * into the touch entries: Book I no. 4 (second subject b. 35, third b. 49), Book II no. 4 (the
 * chromatic second subject, b. 35), no. 14 (bb. 20 and 36), no. 18 (b. 61) and no. 23 (b. 28).
 * Not Book II no. 9: Ledbetter's "two new subjects in double counterpoint, bb. 16-22" live only in
 * those bars (the fugue's later sections are the first subject's, in stretto and diminution), may
 * as well be read as new counterpoints to the first subject (its head sounds with them, alto
 * bb. 16-17), and the notes give only one of the two (three statements): a doubtful reading, kept
 * out of the game (the study screen still shows the library's).
 */
const LATER_SUBJECTS = new Set(["wtc1f04", "wtc2f04", "wtc2f14", "wtc2f18", "wtc2f23"]);

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

    // The entries (D189): the library's, in their voices, for the subject's length (scaled in
    // augmentation and diminution), less those standard analyses do not count; keyed, and told
    // subject or answer, by tools/touch/analysis.ts.
    const subj = lib.subject;
    const span = Math.round((subj[subj.length - 1].at + subj[subj.length - 1].dur - subj[0].at) * TPQ);
    const hand = HAND[p.id];
    const speller = keySpeller(p.voices.flatMap((v) => v.map((n) => n[2])));
    const piece = { tpq: TPQ, meter: p.meter, bars: p.bars, length: p.length, voices, key: p.mode === "minor" ? p.key.toLowerCase() : p.key };
    const raw: RawEntry[] = [...lib.entries, ...lib.transformed]
      .map((e) => ({
        voice: lib.voice[e.notes[0]],
        on: Math.round((e.at - pad) * TPQ),
        len: Math.round(span * (e.scale ?? 1)),
        shift: e.shift,
        inverted: e.inverted,
        scale: e.scale ?? 1,
        theme: 1,
      }))
      .filter((r) => !(NOT_ENTRIES[p.id] ?? []).some(([bar, voice]) => bar === barAt(r.on) && voice === r.voice));
    // D197: the later subjects of the double and triple fugues (the library's: where each first
    // enters is Ledbetter's, its statements are found in the notes), as theme 2 and 3.
    if (LATER_SUBJECTS.has(p.id))
      for (const e of lib.later)
        raw.push({ voice: lib.voice[e.notes[0]], on: Math.round((e.at - pad) * TPQ), len: Math.round((e.end - e.at) * TPQ), shift: e.shift, inverted: false, scale: 1, theme: e.subject ?? 2 });
    const entries = buildEntries(piece, raw, speller, hand?.keys);
    // The sections and the countersubject are the first subject's, as before D197.
    const firstTheme = entries.filter((e) => !e.theme);
    const cadences = findCadences(piece, speller);
    const countersubject = countersubjects(
      p,
      entries.map((e) => ({ voice: e.voice, on: e.on, plain: !e.inverted && !e.scale && !e.theme })),
    ).map(({ entry, voice, on, end }) => ({ entry, voice, on, end }));

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
      for (const e of firstTheme) if (!firstOf.has(e.voice)) firstOf.set(e.voice, e.end);
      const expEnd = Math.max(...firstOf.values());
      const start = p.bars[0].n === 0 ? 0 : 1;
      let from = start;
      let to = Math.max(from + 2, landing(expEnd));
      cuts.push([from, to, "Exposition"]);
      from = to;
      const lands = firstTheme.map((e) => ({ bar: landing(e.end), e })).filter((x) => x.bar > to);
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
      cadences,
      countersubject,
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
      cadences: [],
      countersubject: [],
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
  const { entries, cadences } = contrapunctusAnalysis(voices, spell, bars, length);
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
    entries,
    keys: entries.map((e) => ({ on: e.on, key: e.key })),
    spell,
    sections: [{ name: "Whole", fromBar: 1, toBar: bars.length, from: 0, to: length }],
    cadences,
    countersubject: [],
  };
}

/**
 * D189: the entries of Contrapunctus XIV's three subjects, found in the notes as the WTC's are
 * (src/wtc/fugue.ts, src/wtc/subjects.ts). The first subject: the bass's opening as far as the
 * tenor's answer follows it, its entries found by its head and by the answer's (the answer is
 * tonal: A D for D A), upright and inverted. The second and third: the recurring figures that
 * first enter at b. 114 (the running second subject, the alto's F4 on beat 2) and b. 193 (the
 * third, B-A-C-H, the tenor's B♭3 on beat 3), the bars the music audit of 22 October 2026 gives
 * (item 6) and the notes confirm; the plan of three sections, each opening with a new subject,
 * the third combining all three, is the usual description (for one, Wolff, "The Last Fugue:
 * Unfinished?", 1991). Their shapes and all their statements are read from the notes. In
 * augmentation or diminution none is found.
 */
function contrapunctusAnalysis(voices: Note[][], spell: Record<number, string>, bars: { n: number; on: number }[], length: number) {
  const wp: WtcPiece = {
    id: "bwv1080-14",
    book: 0,
    number: 14,
    kind: "fugue",
    key: "D",
    mode: "minor",
    bwv: "1080",
    meter: "4/4",
    voices: voices.map((v) => v.map(([on, dur, midi]) => [on, dur, spell[midi], 0])),
    bars,
    length,
  };
  const { subject, answer } = subjectAndAnswer(wp);
  const midi = (pitch: string) => parsePitch(pitch).midi;
  const span = (ns: { on: number; dur: number }[]) => ns[ns.length - 1].on + ns[ns.length - 1].dur - ns[0].on;
  const answerLevel = midi(answer[0].pitch) - midi(subject[0].pitch);
  const raw: RawEntry[] = [];
  for (const [model, level] of [
    [subject, 0],
    [answer, answerLevel],
  ] as const) {
    for (const e of findEntriesByHead(wp, [...model]).entries) {
      // An entry found by both the subject's head and the answer's is one entry.
      if (raw.some((r) => r.voice === e.voice && Math.abs(r.on - e.on) < span(subject))) continue;
      raw.push({ voice: e.voice, on: e.on, len: span(subject), shift: midi(e.pitch) - midi(model[0].pitch) + level, inverted: e.form === "inversion", scale: 1, theme: 1 });
    }
  }
  laterSubjects(wp, subject, answer, [114, 193]).forEach((ls, k) => {
    const first = midi(wp.voices[ls.occurrences[0].voice].find((n) => n[0] === ls.occurrences[0].on)![2]);
    for (const o of ls.occurrences) {
      const at = wp.voices[o.voice].find((n) => n[0] === o.on);
      if (at) raw.push({ voice: o.voice, on: o.on, len: o.end - o.on, shift: midi(at[2]) - first, inverted: false, scale: 1, theme: k + 2 });
    }
  });
  const piece = { tpq: TPQ, meter: "4/4", bars, length, voices, key: "d" };
  const speller = keySpeller(Object.values(spell));
  return { entries: buildEntries(piece, raw, speller), cadences: findCadences(piece, speller, false) };
}

const out = [...preludes, ...fugues, contrapunctus()].sort((a, b) => (a.book || 9) - (b.book || 9) || a.number - b.number || (a.kind === "prelude" ? -1 : 1));

const dir = fileURLToPath(new URL("../../data/touch/", import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}pieces.json`, JSON.stringify(out) + "\n");
const notes = out.reduce((s, f) => s + f.voices.reduce((t, v) => t + v.length, 0), 0);
console.log(`wrote data/touch/pieces.json: ${out.length} pieces, ${notes} notes, ${out.reduce((s, f) => s + f.sections.length, 0)} sections`);
for (const f of out.slice(0, 4)) console.log(`  ${f.id} ${f.voiceNames.join("/")}; sections ${f.sections.map((s) => `${s.fromBar}-${s.toBar}`).join(" ")}; keys ${f.keys.map((k) => k.key).join(" ")}`);
