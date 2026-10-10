// The data for the owner's review sheet: for a handful of fugues, what the analysis reads (subject,
// answer, exposition, entries, strettos, pedal points, cadences), each item with its span so that
// it can be heard, and the voices' notes for playback. The owner marks each item right or wrong;
// the corrections become tests. Usage: node tools/wtc/review-sheet.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { findEntriesByHead, line, predictAnswer, subjectAndAnswer } from "../../src/wtc/fugue.ts";
import { exposition, voiceNames } from "../../src/wtc/exposition.ts";
import { study } from "../../src/wtc/fugue-study.ts";
import { subjectLength } from "../../src/wtc/structure.ts";
import { label, TPQ, type WtcPiece } from "../../src/wtc/corpus.ts";
import { parsePitch } from "../../src/music/pitch.ts";

const IDS = ["wtc1f01", "wtc1f02", "wtc1f05", "wtc1f16", "wtc1f21", "wtc2f02", "wtc2f07", "wtc2f09"];
const fugues: WtcPiece[] = JSON.parse(readFileSync("data/wtc/fugues.json", "utf8"));
const LONG: Record<string, string> = { S: "soprano", A: "alto", T: "tenor", B: "bass", S1: "soprano I", S2: "soprano II", upper: "upper voice", lower: "lower voice" };
const nice = (p: string) => p.replace(/-?\d+$/, "").replace("bb", "𝄫").replace("b", "♭").replace("##", "𝄪").replace("#", "♯");

const out = IDS.map((id) => {
  const p = fugues.find((f) => f.id === id)!;
  const [num, den] = p.meter.split("/").map(Number);
  const beat = (4 * TPQ) / den;
  const where = (t: number) => {
    const b = [...p.bars].reverse().find((x) => x.on <= t) ?? { n: 1, on: 0 };
    const bt = Math.round(((t - b.on) / beat) * 4) / 4 + 1;
    return bt === 1 ? `bar ${b.n}` : `bar ${b.n}, beat ${bt}`;
  };
  const bars = (t: number) => {
    const x = Math.round((t / (num * beat)) * 4) / 4;
    return `${x} bar${x === 1 ? "" : "s"}`;
  };
  const vn = (v: number) => LONG[voiceNames(p.voices.length)[v]] ?? `voice ${v + 1}`;
  const sa = subjectAndAnswer(p);
  const { entries } = findEntriesByHead(p, sa.subject);
  const len = subjectLength(sa.subject);
  const s = study(p, sa.subject, sa.answer, entries);
  const expo = exposition(p, sa.subject, sa.answer, entries);
  const real = predictAnswer(sa.subject, p.key, p.mode, "real");
  const mutated = real.map((x, i) => (x[0] !== sa.answer[i]?.pitch[0] ? i + 1 : 0)).filter(Boolean);
  const items: { id: string; group: string; label: string; detail: string; on: number; end: number; voice: number | null }[] = [];
  const subjEnd = sa.subject[sa.subject.length - 1];
  items.push({ id: `${id}-subject`, group: "Subject and answer", label: `Subject (${vn(sa.first)}): ${sa.subject.map((n) => nice(n.pitch)).join(" ")}`, detail: `${sa.subject.length} notes, ending ${where(subjEnd.on)}. Right if this is where the subject begins and ends.`, on: sa.subject[0].on, end: subjEnd.on + subjEnd.dur, voice: sa.first });
  const ansEnd = sa.answer[sa.answer.length - 1];
  items.push({ id: `${id}-answer`, group: "Subject and answer", label: `Answer (${vn(sa.second)}): ${sa.answer.map((n) => nice(n.pitch)).join(" ")}`, detail: mutated.length ? `Tonal: note${mutated.length > 1 ? "s" : ""} ${mutated.join(", ")} answered a fourth up instead of a fifth.` : "Real: every note a fifth up.", on: sa.answer[0].on, end: ansEnd.on + ansEnd.dur, voice: sa.second });
  items.push({ id: `${id}-exposition`, group: "Subject and answer", label: `Exposition: ${expo.map((e) => `${vn(e.voice)} (${e.role === "free" ? "not found" : e.role === "other" ? e.roman : e.role})`).join(", ")}`, detail: expo.map((e, i) => (i && e.link >= beat ? `a link of ${bars(e.link)} before the ${vn(e.voice)}` : "")).filter(Boolean).join("; ") || "No links between entries.", on: 0, end: Math.max(...expo.map((e) => e.on)) + len, voice: null });
  let k = 0;
  for (const m of s.moments) {
    if (m.kind === "episode" || m.kind === "climax") continue;
    const group = { entry: "Entries of the subject", stretto: "Strettos", pedal: "Pedal points", cadence: "Cadences" }[m.kind]!;
    items.push({ id: `${id}-${m.kind}-${k++}`, group, label: m.label, detail: m.detail.replace(/bars (\d+)–\1\b/, "bar $1"), on: m.on, end: m.end, voice: m.voice });
  }
  const voices = p.voices.map((v) => line(v).map((n) => [n.on, n.dur, parsePitch(n.pitch).midi]));
  return { id, title: label(p), meter: p.meter, voices: p.voices.map((_, v) => vn(v)), entriesFound: entries.length, items, notes: voices };
});
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(out.map((f) => `${f.id}: ${f.items.length} items`).join("\n"));
