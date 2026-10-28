/**
 * D361: every playable voice is one line. A voice the player may take (`playable`, all where unset) in
 * every piece the game plays (the 48 fugues, MORE BACH with the harpsichord concertos, the chorales,
 * the tutorial) has no two notes sounding at once, but for:
 *   - a chord: notes struck together and released together (a final chord, BWV 1043's double stops),
 *     which the game strikes and lets go whole with one touch (lanes.ts chordOf); none in a sung part,
 *     a chorale or a harpsichord concerto (one note at a time there, D348), where the test is strict;
 *   - the passages listed in DIVISI below, each the edition's own: the kern encodings of the 48 split a
 *     voice's spine for a chord or a brief divisi (src/wtc/kern.ts, folded back into the voice), and
 *     Mutopia's Art of Fugue writes extra voices on a staff at the final cadences (Contrapunctus 5, 6)
 *     and in Contrapunctus 7's last six bars (staff1/v2), which more-bach.ts gives to the staff's voice.
 *     The engine carries a note held under the next (engine.ts `overlaps`). They are listed, bar by
 *     bar, so that a new one (as BWV 54/1's alto in bar 26 was: D347, fixed by more-bach.ts sungLine)
 *     fails here, and one fixed must leave the list.
 * The preludes are played by hands (D168: chords and held notes are a keyboard hand's), and are not
 * checked.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { barAt, CHORALES, loadExtras, MORE_BACH, PIECES, TUTORIAL_PIECES, type TouchFugue } from "../src/touch/fugue.ts";
import { sungLine, SPECS } from "../tools/touch/more-bach.ts";
import { readMusicXml } from "../tools/touch/musicxml.ts";

await loadExtras();

/** "id:voice" → the bars where a note begins under another of the voice still sounding, or a chord's notes end apart. */
const DIVISI: Record<string, string> = {
  // The 48 (kern sub-spines).
  "wtc1f01:0": "9",
  "wtc1f06:0": "43",
  "wtc1f07:0": "37",
  "wtc1f15:0": "85 86",
  "wtc1f15:2": "84 85",
  "wtc1f20:0": "80 81 82 83 85 86 87",
  "wtc1f20:3": "87",
  "wtc1f24:1": "75",
  "wtc2f02:0": "26",
  "wtc2f02:1": "27",
  "wtc2f03:0": "19 20 27 28",
  "wtc2f03:1": "16 26 32",
  "wtc2f03:2": "15 29 30 32 33 34 35",
  "wtc2f06:0": "14",
  "wtc2f06:1": "8",
  "wtc2f08:0": "14",
  "wtc2f08:1": "36 45 46",
  "wtc2f10:1": "86",
  "wtc2f10:2": "51",
  "wtc2f16:0": "83",
  "wtc2f17:0": "6",
  "wtc2f17:2": "48 49 50",
  "wtc2f20:1": "6",
  // The Art of Fugue (Mutopia's extra voices on a staff).
  "bwv1080-05:0": "88 89",
  "bwv1080-05:1": "86",
  "bwv1080-05:3": "87 89",
  "bwv1080-06:0": "76 77 78",
  "bwv1080-07:0": "56 57 58 59 60 61",
};

/** Strict: not even a chord. */
const STRICT = new Set(["hconcerto", "cantata", "motet", "chorale"]);

/** A voice's notes sounding together: the bars of each note beginning under another (or ending apart from its chord), and of each chord. */
function clashes(f: TouchFugue, v: number): { divisi: number[]; chords: number[] } {
  const notes = f.voices[v];
  const divisi = new Set<number>();
  const chords = new Set<number>();
  for (const n of notes)
    for (const m of notes) {
      if (m === n) continue;
      const under = m[0] < n[0] && n[0] < m[0] + m[1];
      const together = m[0] === n[0];
      if (under || (together && m[1] !== n[1])) divisi.add(barAt(f, n[0]));
      else if (together) chords.add(barAt(f, n[0]));
    }
  return { divisi: [...divisi].sort((a, b) => a - b), chords: [...chords].sort((a, b) => a - b) };
}

const playable = (f: TouchFugue) => f.voices.map((_, v) => v).filter((v) => !f.playable || f.playable.includes(v));
const ALL = [...PIECES.filter((p) => p.kind !== "prelude"), ...MORE_BACH, ...CHORALES, ...TUTORIAL_PIECES.filter((p) => p.kind !== "prelude")];

test("D361: every piece is checked: the 48 fugues, MORE BACH (and its concertos), the chorales, the tutorial", () => {
  assert.equal(PIECES.filter((p) => p.kind === "fugue" && p.id.startsWith("wtc")).length, 48);
  assert.ok(MORE_BACH.length >= 100, `${MORE_BACH.length} MORE BACH pieces`);
  assert.ok(MORE_BACH.filter((p) => p.collection === "hconcerto").length >= 42);
  assert.ok(CHORALES.length >= 300);
});

test("D361: every playable voice of every piece is monophonic, but for chords and the documented divisi", () => {
  const found: Record<string, string> = {};
  for (const f of ALL)
    for (const v of playable(f)) {
      const c = clashes(f, v);
      if (c.divisi.length) found[`${f.id}:${v}`] = c.divisi.join(" ");
    }
  assert.deepEqual(found, DIVISI);
});

test("D361: a sung part, a chorale's voice and a harpsichord concerto's line are strictly one note at a time (no chord either)", () => {
  let checked = 0;
  for (const f of ALL.filter((p) => STRICT.has(p.collection ?? "")))
    for (const v of playable(f)) {
      const c = clashes(f, v);
      assert.deepEqual([...c.divisi, ...c.chords], [], `${f.id} ${f.voiceNames[v]}`);
      checked++;
    }
  assert.ok(checked > 1000, `${checked} voices`);
});

test("D361: BWV 54/1's alto in bar 26 is the sung line alone; the edition's second voice under it doubles the band and is left out", () => {
  const f = MORE_BACH.find((p) => p.id === "bwv54-1")!;
  const alto = f.voiceNames.indexOf("Alto");
  assert.ok(playable(f).includes(alto));
  const b26 = f.bars.find((b) => b.n === 26)!.on;
  const b27 = f.bars.find((b) => b.n === 27)!.on;
  // Bb4 Ab4 G4 F4 (semiquavers), Eb4 (quaver), F4 D4 (semiquavers), as the words are sung.
  const sung = f.voices[alto].filter((n) => n[0] >= b26 + 5760 - 1 && n[0] < b27).map((n) => [n[0] - b26, n[1], n[2]]);
  assert.deepEqual(sung, [
    [5760, 240, 70],
    [6000, 240, 68],
    [6240, 240, 67],
    [6480, 240, 65],
    [6720, 480, 63],
    [7200, 240, 65],
    [7440, 240, 62],
  ]);
  // The import: the two crotchets of the alto staff's voice 2, each doubled by a string part.
  const s = SPECS.find((x) => x.id === "bwv54-1")!;
  const x = readMusicXml(new URL(`../data/sources/${s.dir}/imslp/${s.xml}`, import.meta.url).pathname);
  const kept = s.xmlParts!;
  const { dropped } = sungLine(x, kept[alto], kept);
  assert.deepEqual(
    dropped.map((n) => [n[2], n[4]]),
    [
      ["Bb4", "2"],
      ["G4", "2"],
    ],
  );
  // The words are on the line kept.
  assert.ok(x.parts[kept[alto]].lyrics.every((l) => l.voice === "1"));
});
