/**
 * D347: the words in the music box (BWV 54, BWV 228): each syllable on the note it starts on, a
 * melisma carried to its last note (BWV 54/3's "Teu-" over a long run to "-fel"), hyphens, none on the
 * instruments, the edition's spelling kept, the data still in the chunk loaded on demand.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { barAt, fugueById, loadExtras, MORE_BACH, PIECES, TUTORIAL_PIECES, type TouchFugue } from "../src/touch/fugue.ts";
import { firstFrom, lyricsOf, unpackLyrics, type Syllable } from "../src/touch/lyrics.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

await loadExtras();

const bar = (f: TouchFugue, n: number) => f.bars.find((b) => b.n === n)!.on;
/** The syllables of a voice from bar a to bar b, as "text@bar+offset×notes". */
function line(id: string, v: number, a: number, b: number): string[] {
  const f = fugueById(id);
  return lyricsOf(f, v)!
    .filter((s) => barAt(f, s.on) >= a && barAt(f, s.on) <= b)
    .map((s) => `${s.text}${s.joined ? "-" : ""}@${barAt(f, s.on)}+${s.on - bar(f, barAt(f, s.on))}×${f.voices[v].filter((n) => n[0] >= s.on && n[0] < s.end).length}`);
}

test("D347: BWV 54/3's alto: \"Teu-\" carried over the run to \"-fel\" (bars 10-13, 16-17, 54-57, 60-63)", () => {
  const f = fugueById("bwv54-3");
  assert.equal(f.voiceNames[2], "Alto");
  assert.deepEqual(line("bwv54-3", 2, 9, 13), ["Wer@9+1920×1", "Sün-@9+3840×1", "de@9+5760×1", "thut,@10+0×1", "der@10+960×1", "ist@10+1920×1", "vom@10+4800×1", "Teu-@10+5760×40", "fel,@13+4800×1"]);
  const ls = lyricsOf(f, 2)!;
  const teu = ls.filter((s) => s.text === "Teu");
  assert.deepEqual(
    teu.map((s) => [barAt(f, s.on), barAt(f, s.end - 1)]),
    [
      [10, 13],
      [16, 17],
      [54, 57],
      [60, 63],
    ],
  );
  for (const s of teu) {
    const next = ls[ls.indexOf(s) + 1];
    assert.equal(next.text, "fel,");
    assert.equal(s.joined, true, "a hyphen to -fel");
    // The melisma reaches the very note before "-fel": no gap, no other syllable between.
    assert.equal(s.end, next.on);
    const notes = f.voices[2].filter((n) => n[0] >= s.on && n[0] < s.end);
    assert.equal(notes[0][0], s.on);
    assert.equal(notes.at(-1)![0] + notes.at(-1)![1], s.end);
  }
  assert.deepEqual(
    teu.map((s) => f.voices[2].filter((n) => n[0] >= s.on && n[0] < s.end).length),
    [40, 8, 40, 27],
  );
});

test("D347: BWV 228: a few places in each choir and in the fugue and chorale", () => {
  // Choir I's soprano and bass, choir II's soprano, at the start.
  assert.deepEqual(line("bwv228-1", 0, 1, 1), ["Fürch-@1+960×1", "te@1+2880×1", "dich@1+3360×1", "nicht,@1+3840×1"]);
  assert.deepEqual(line("bwv228-1", 3, 1, 1), ["Fürch-@1+0×1", "te@1+1920×1", "dich@1+2880×1", "nicht@1+3840×1", "ich@1+5760×1"]);
  assert.deepEqual(line("bwv228-1", 4, 1, 2), ["Fürch-@1+4800×1", "te@1+6720×1", "dich@1+7200×1", "nicht,@2+0×1", "ich@2+4800×1", "bin@2+5760×1", "bei@2+6720×1"]);
  // "wei-che" over two notes: the edition writes both syllables "single"; the hyphen read from elsewhere (musicxml.ts hyphensOf).
  assert.deepEqual(line("bwv228-1", 0, 10, 10), ["dir,@10+0×1", "wei-@10+960×2", "che@10+2880×1", "nicht@10+3840×1", "wei-@10+4800×2", "che@10+6720×1"]);
  // The chorale (sopranos): "Brunn al-ler Freu-den" (joined by hand: no other part sings it).
  assert.deepEqual(line("bwv228-2", 0, 84, 85), ["Hirt,@84+0×1", "Brunn@84+1920×1", "al-@84+3840×2", "ler@84+5760×1", "Freu-@85+0×2", "den,@85+3840×1"]);
  // The fugue's alto: "denn ich ha-be dich er-lö-set", "lö" over a long run.
  assert.deepEqual(line("bwv228-2", 1, 79, 81), ["denn@79+5760×1", "ich@79+6720×1", "ha-@80+0×1", "be@80+1920×1", "dich@80+3840×1", "er-@80+5760×1", "lö-@81+0×19"]);
  const f = fugueById("bwv228-2");
  const lo = lyricsOf(f, 1)!.find((s) => s.text === "lö")!;
  assert.equal(barAt(f, lo.end - 1), 83);
  // Every voice of both sections sung.
  for (const id of ["bwv228-1", "bwv228-2"]) for (let v = 0; v < 8; v++) assert.ok((lyricsOf(fugueById(id), v)?.length ?? 0) > 10, `${id} voice ${v}`);
});

test("D347: every syllable starts on a note of its voice and ends with a note; a melisma is the notes between, without words", () => {
  for (const id of ["bwv228-1", "bwv228-2", "bwv54-1", "bwv54-3"]) {
    const f = fugueById(id);
    f.voices.forEach((notes, v) => {
      const ls = lyricsOf(f, v);
      if (!ls) return;
      const ons = new Set(notes.map((n) => n[0]));
      const ends = new Set(notes.map((n) => n[0] + n[1]));
      ls.forEach((s, i) => {
        assert.ok(ons.has(s.on), `${id} v${v} "${s.text}" at ${s.on}: on a note`);
        assert.ok(ends.has(s.end) && s.end > s.on, `${id} v${v} "${s.text}": ends with a note`);
        if (i) assert.ok(ls[i - 1].end <= s.on, `${id} v${v} "${s.text}": after the last syllable's melisma`);
      });
    });
  }
});

test("D347: no words on the instruments; only the sung pieces have any", () => {
  const sung = (id: string) => fugueById(id).voices.map((_, v) => !!lyricsOf(fugueById(id), v));
  assert.deepEqual(sung("bwv54-1"), [false, false, false, false, true, false], "violins, violas, alto, continuo");
  assert.deepEqual(sung("bwv54-3"), [false, false, true, false], "violins, violas, alto, continuo");
  for (const f of [...MORE_BACH, ...PIECES, ...TUTORIAL_PIECES]) {
    if (["bwv228-1", "bwv228-2", "bwv54-1", "bwv54-3"].includes(f.id)) assert.equal(f.lyrics?.length, f.voices.length, f.id);
    else assert.equal(f.lyrics, undefined, f.id);
  }
});

test("D347: the edition's spelling kept (its slips too: reported, not corrected)", () => {
  const words = (id: string, v: number) => {
    const out: string[] = [];
    let w = "";
    for (const s of lyricsOf(fugueById(id), v)!) {
      w += s.text;
      if (!s.joined) (out.push(w), (w = ""));
    }
    return out;
  };
  const alto = words("bwv54-3", 2);
  assert.equal(alto.slice(0, 7).join(" "), "Wer Sünde thut, der ist vom Teufel,");
  // "An-dacht", "gleich", "auf-ge-bracht", "schnö-den" (Bach's text) as the edition has them.
  for (const slip of ["Andahct", "Andacjt", "g;eich", "auggebracht,", "schöden", "schönden"]) assert.ok(alto.includes(slip), slip);
  assert.ok(words("bwv54-1", 4).includes("tifft"), "the edition's \"tifft\" (trifft)");
  assert.ok(words("bwv228-2", 0).includes("Laß"));
});

test("D347: unpacking, and where drawing starts", () => {
  const ls: Syllable[] = unpackLyrics([0, 10, "Teu-", 10, 5, "fel,", 7, 2, "wer"]);
  assert.deepEqual(
    ls.map((s) => [s.on, s.end, s.text, s.joined, s.shown]),
    [
      [0, 10, "Teu", true, "TEU"],
      [10, 15, "fel,", false, "FEL,"],
      [17, 19, "wer", false, "WER"],
    ],
  );
  assert.equal(firstFrom(ls, 0), 0);
  assert.equal(firstFrom(ls, 9), 0, "Teu's melisma still sounding");
  assert.equal(firstFrom(ls, 10), 1);
  assert.equal(firstFrom(ls, 16), 2);
  assert.equal(firstFrom(ls, 99), 3);
});

test("D347: the words travel with the MORE BACH notes, in the chunk loaded on demand", () => {
  for (const p of ["src/touch/lyrics.ts", "src/touch/MusicBox.tsx", "src/touch/fugue.ts"]) assert.doesNotMatch(src(p), /^import .*(more-bach|chorales)\.json/m, p);
  assert.doesNotMatch(src("data/touch/pieces.json"), /"lyrics"/);
  assert.match(src("data/touch/more-bach.json"), /"lyrics"/);
  // Small beside the notes: well under a tenth of the chunk.
  const more = JSON.parse(src("data/touch/more-bach.json")) as TouchFugue[];
  const size = more.reduce((t, f) => t + (f.lyrics ? JSON.stringify(f.lyrics).length : 0), 0);
  assert.ok(size < 80_000, `${size} bytes`);
});
