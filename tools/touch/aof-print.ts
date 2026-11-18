/**
 * D871: THE ART OF FUGUE'S PRINTED ARTICULATION, as a whole-piece reading ("THE PRINT"): the slurs, staccato dots and
 * strokes, accents and fermatas of the Bach-Gesellschaft text (BG 25.1, ed. Rust, 1878), kept where two independent
 * transcriptions of it agree at the same note: the Mutopia typesetting the game's notes come from (public domain,
 * tools/touch/more-bach.ts) and Craig Sapp's encoding of BG 25.1 (github.com/craigsapp/art-of-the-fugue; no licence
 * stated: read here as a check, never shipped). A mark only one of them has is left out (nothing editorial, nothing
 * uncertain). Written as docs/wtc/readings/print/<id>-print.json (format wtc-reading/2), read by tools/touch/readings.ts
 * into data/touch/readings.json.
 *
 *   node tools/touch/aof-print.ts PATH/TO/art-of-the-fugue
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseKern } from "../../src/wtc/kern.ts";
import { parsePitch } from "../../src/music/pitch.ts";
import { build, readLy, SPECS } from "./more-bach.ts";

const SAPP: Record<string, string> = {
  "bwv1080-c15": "artfugue-012.krn",
  "bwv1080-c17": "artfugue-013.krn",
  "bwv1080-c16": "artfugue-014.krn",
  "bwv1080-c14": "artfugue-015.krn",
  "bwv1080-13r": "artfugue-016a.krn",
  "bwv1080-13i": "artfugue-016b.krn",
  "bwv1080-12r": "artfugue-018a.krn",
  "bwv1080-12i": "artfugue-018b.krn",
};
for (let i = 1; i <= 11; i++) SAPP[`bwv1080-${String(i).padStart(2, "0")}`] = `artfugue-${String(i).padStart(3, "0")}.krn`;

const ticks = (f: string) => {
  const [n, d] = f.split("/").map(Number);
  return Math.round((n / d) * 4 * 1920);
};
type Mark = { on: number; midi: number; art: string };
type Span = { from: [number, number]; to: [number, number] };
/** Slurs paired in each stream by time: an opening at a note, the next closing in that stream ends it. */
function pair(notes: { on: number; midi: number; stream: string; slur?: string[] }[]): Span[] {
  const open = new Map<string, [number, number][]>();
  const out: Span[] = [];
  for (const n of [...notes].sort((a, b) => a.on - b.on)) {
    for (const c of n.slur ?? []) {
      const st = open.get(n.stream) ?? [];
      if (c === "(") st.push([n.on, n.midi]);
      else {
        const from = st.pop();
        if (from) out.push({ from, to: [n.on, n.midi] });
      }
      open.set(n.stream, st);
    }
  }
  return out;
}

const dir = process.argv[2];
if (!dir) throw new Error("usage: node tools/touch/aof-print.ts PATH/TO/art-of-the-fugue");
mkdirSync("docs/wtc/readings/print", { recursive: true });
const report: string[] = [];
for (const s of SPECS.filter((x) => x.collection === "aof" && SAPP[x.id])) {
  const { f } = build(s);
  const ly = readLy(`data/sources/${s.dir}/mutopia/${s.mutopia}/${s.ly}`, s.score ?? 0);
  // The mirror fugues: their LilyPond holds both forms, the inversus after the rectus.
  const shift = s.fromMidi ? ticks(ly.length) - f.length : 0;
  const voiceAt = (on: number, midi: number) => f.voices.findIndex((v) => v.some((n) => n[0] === on && n[2] === midi));
  const lyNotes = ly.notes
    .filter((n) => !n.grace && n.dur !== "0/1")
    .map((n) => {
      let on = ticks(n.on);
      if (shift && voiceAt(on, n.midi) < 0 && voiceAt(on - shift, n.midi) >= 0) on -= shift;
      return { on, midi: n.midi, stream: n.voice, art: n.art ?? [], slur: n.slur };
    })
    .filter((n) => voiceAt(n.on, n.midi) >= 0);
  const k = parseKern(readFileSync(`${dir}/kern/${SAPP[s.id]}`, "utf8"));
  // The two may write the note values at different scales (Contrapunctus 16 is notated in halved values in BG 25.1):
  // the scale under which most of the kern's notes land on the game's.
  const scale = [1, 1.5, 2, 0.5, 2 / 3].map((x) => [x, k.voices.flat().filter((n) => voiceAt(Math.round(n.on * x), parsePitch(n.pitch).midi) >= 0).length]).sort((a, b) => b[1] - a[1])[0][0];
  const kNotes = k.voices.flatMap((v, vi) => v.map((n) => ({ on: Math.round(n.on * scale), midi: parsePitch(n.pitch).midi, stream: `${vi}:${n.sub}`, art: n.art ?? [], slur: n.slur })));
  const key = (m: Mark) => `${m.on}:${m.midi}:${m.art}`;
  const lyMarks: Mark[] = lyNotes.flatMap((n) => n.art.map((art) => ({ on: n.on, midi: n.midi, art: art.replace(/^(short|long|verylong)fermata$/, "fermata") })));
  const kMarks = new Set(kNotes.flatMap((n) => n.art.map((art) => key({ on: n.on, midi: n.midi, art }))));
  const marks = [...new Map(lyMarks.filter((m) => kMarks.has(key(m))).map((m) => [key(m), m])).values()];
  const spanKey = (x: Span) => `${x.from.join(":")}-${x.to.join(":")}`;
  const kSlurs = new Set(pair(kNotes).map(spanKey));
  const lySlurs = pair(lyNotes);
  const slurs = lySlurs.filter((x) => kSlurs.has(spanKey(x)));
  const bar = (on: number) => [...f.bars].reverse().find((b) => b.on <= on)?.n ?? 1;
  writeFileSync(
    `docs/wtc/readings/print/${s.id}-print.json`,
    JSON.stringify(
      {
        format: "wtc-reading/2 (whole piece)",
        piece: s.id,
        edition: {
          name: "The print: the Bach-Gesellschaft text, Band 25.1 (ed. Wilhelm Rust, 1878)",
          method: "the marks two independent transcriptions of it agree on at the same note: the Mutopia typesetting the game's notes come from and Craig Sapp's encoding of BG 25.1 (tools/touch/aof-print.ts)",
        },
        marks: marks.map((m) => ({ v: voiceAt(m.on, m.midi), on: m.on, art: m.art, p: m.midi, bar: bar(m.on) })),
        slurs: slurs.map((x) => {
          const v = voiceAt(x.from[0], x.from[1]);
          return { v, from: x.from[0], to: x.to[0], kind: "slur", bar: bar(x.from[0]) };
        }).filter((x) => x.v >= 0 && voiceAt(...(lySlurs.find((y) => y.from[0] === x.from)!.to)) === x.v),
      },
      null,
      1,
    ) + "\n",
  );
  report.push(`${s.id.padEnd(12)} ×${scale} marks ${marks.length} (Mutopia ${lyMarks.length}, Sapp ${kMarks.size}) · slurs ${slurs.length} (Mutopia ${lySlurs.length}, Sapp ${kSlurs.size})`);
}
console.log(report.join("\n"));
