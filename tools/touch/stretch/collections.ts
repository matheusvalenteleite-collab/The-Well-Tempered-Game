/**
 * D640, THE AUDITS OVER EVERY PLAYABLE PIECE: D631's written octave and D635's stretch (tools/touch/octaves/audit.ts,
 * tools/touch/stretch/audit.ts) over every collection a player can play, each on every sound offered (PlayPop.tsx
 * POP_SOUNDS: one list for every piece) and the trials: the 48 fugues, the 48 preludes and the Art of Fugue's XIV (pieces.json), the tutorial's
 * pieces (tutorial.json), MORE BACH (more-bach.json: the Art of Fugue, the Musical Offering, the Inventions and Sinfonias,
 * the cantata and motet, BWV 1043), the harpsichord concertos (concertos.json) and the chorales (chorales.json).
 *
 *   node tools/touch/stretch/collections.ts          the table, collection by collection
 *   node tools/touch/stretch/collections.ts -v       and every stretched read and undeclared note, by sound
 */
import { PIECES, TUTORIAL_PIECES, type TouchFugue } from "../../../src/touch/fugue.ts";
import { MORE_DATA, CHORALE_DATA } from "../../../src/touch/extras-data.ts";
import { CONCERTO_DATA } from "../../../src/touch/concertos-data.ts";
import { nameOfMidi, STRETCH_MAX } from "../../../src/touch/sampled.ts";
import { AUDIT_SOUNDS, auditSound, extensions } from "../octaves/audit.ts";

export const COLLECTIONS: readonly (readonly [name: string, pieces: readonly TouchFugue[]])[] = [
  ["WTC fugues", PIECES.filter((p) => /^wtc[12]f\d\d$/.test(p.id))],
  ["WTC preludes", PIECES.filter((p) => p.kind === "prelude")],
  // (pieces.json's one other: the Art of Fugue's unfinished XIV, bwv1080-14.)
  ["other fugues", PIECES.filter((p) => p.kind === "fugue" && !/^wtc[12]f\d\d$/.test(p.id))],
  ["tutorial", TUTORIAL_PIECES],
  ["more bach", MORE_DATA as unknown as TouchFugue[]],
  ["concertos", CONCERTO_DATA as unknown as TouchFugue[]],
  ["chorales", CHORALE_DATA as unknown as TouchFugue[]],
];

export interface Found {
  collection: string;
  sound: string;
  piece: string;
  voice: number;
  patch: string;
  inst: string;
  written: number;
  from: number;
  shift: number;
  n: number;
}

/** One collection on every sound: notes checked, octave moves, notes past their set's declared reach, stretched reads. */
export function auditCollection(name: string, pieces: readonly TouchFugue[], sounds: readonly string[] = AUDIT_SOUNDS) {
  let notes = 0;
  let moves = 0;
  const undeclared: Found[] = [];
  const stretched: Found[] = [];
  for (const sound of sounds) {
    const a = auditSound(sound, pieces);
    notes += a.notes;
    moves += a.moves.length;
    for (const o of a.undeclared) undeclared.push({ collection: name, sound, piece: o.piece, voice: o.voice, patch: o.patch, inst: o.inst, written: o.written, from: o.written - o.shift, shift: o.shift, n: 1 });
    for (const r of a.reads) if (Math.abs(r.shift) > STRETCH_MAX) stretched.push({ collection: name, sound, ...r });
  }
  return { name, pieces: pieces.length, notes, moves, undeclared, stretched };
}

/**
 * D640: the extensions every set needs (sampled.ts `extend`): the 48 fugues' every note past its compass (D631), and beyond
 * them each note read within STRETCH_MAX (a further one is D641's stretch, no extension of its set).
 */
export function allExtensions(sounds: readonly string[] = AUDIT_SOUNDS) {
  const need = extensions(sounds);
  for (const [name, pieces] of COLLECTIONS) if (name !== "WTC fugues") extensions(sounds, pieces, STRETCH_MAX, need);
  return need;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes("-x")) {
  for (const [inst, e] of Object.entries(allExtensions())) console.log(`${inst.padEnd(18)} up ${e.up} down ${e.down}   (${e.where.slice(0, 2).join("; ")})`);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const verbose = process.argv.includes("-v");
  console.log("collection     pieces     notes  moves  undeclared  stretched (notes/pieces/worst)");
  for (const [name, pieces] of COLLECTIONS) {
    const r = auditCollection(name, pieces);
    const st = r.stretched.reduce((a, s) => a + s.n, 0);
    let worst: Found | null = null;
    for (const s of r.stretched) if (!worst || Math.abs(s.shift) > Math.abs(worst.shift)) worst = s;
    const w = worst ? `${worst.shift > 0 ? "+" : ""}${worst.shift} ${worst.sound} ${worst.piece} v${worst.voice} ${worst.patch} ${nameOfMidi(worst.written)}` : "-";
    console.log(`${name.padEnd(14)} ${String(r.pieces).padStart(6)} ${String(r.notes).padStart(9)} ${String(r.moves).padStart(6)} ${String(r.undeclared.length).padStart(11)}  ${st}/${new Set(r.stretched.map((s) => s.piece)).size}/${w}`);
    if (verbose) {
      const g = new Map<string, { n: number; max: number; pieces: Set<string> }>();
      for (const s of [...r.stretched.map((x) => ({ ...x, k: "S" })), ...r.undeclared.map((x) => ({ ...x, k: "U" }))]) {
        const key = `${s.k} ${s.sound} ${s.inst} ${s.patch}`;
        const e = g.get(key) ?? { n: 0, max: 0, pieces: new Set() };
        e.n += s.n;
        if (Math.abs(s.shift) > Math.abs(e.max)) e.max = s.shift;
        e.pieces.add(s.piece);
        g.set(key, e);
      }
      for (const [k, e] of [...g].sort()) console.log(`   ${k}: ${e.n} notes in ${e.pieces.size} (${[...e.pieces].slice(0, 6).join(" ")}), worst ${e.max}`);
    }
  }
}
