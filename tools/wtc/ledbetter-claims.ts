// Checks Ledbetter's bar-number claims about the 48 fugues (data/wtc/ledbetter-claims.txt, from the
// per-piece digest on branch claude/vibrant-gates-fe6o3h, docs/wtc/ledbetter/) against the analysis:
// entries, cadences, strettos, pedal points and section starts. Writes docs/wtc/ledbetter-claims.md.
// Usage: node tools/wtc/ledbetter-claims.ts
import { readFileSync, writeFileSync } from "node:fs";
import { findEntriesByHead, findTransformed, line, subjectAndAnswer, type Entry } from "../../src/wtc/fugue.ts";
import { cadences, study } from "../../src/wtc/fugue-study.ts";
import { entryKey } from "../../src/wtc/keyplan.ts";
import { harmonies } from "../../src/wtc/trio.ts";
import { voiceNames } from "../../src/wtc/exposition.ts";
import { label, TPQ, type WtcPiece } from "../../src/wtc/corpus.ts";
import { parsePitch } from "../../src/music/pitch.ts";

const fugues: WtcPiece[] = JSON.parse(readFileSync("data/wtc/fugues.json", "utf8"));
const claims = readFileSync("data/wtc/ledbetter-claims.txt", "utf8").split("\n").map((l) => l.trim()).filter((l) => /^wtc\df\d\d /.test(l));
const LONG: Record<string, string> = { S: "soprano", A: "alto", T: "tenor", B: "bass", S1: "soprano", S2: "soprano", upper: "soprano", lower: "bass" };
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const pcOf = (name: string) => !/^[A-Ga-g][b#♭♯]?$/.test(name) ? -1 : ((parsePitch(`${name[0].toUpperCase()}${name.slice(1).replace("♭", "b").replace("♯", "#")}4`).midi % 12) + 12) % 12;

interface Result { claim: string; kind: string; ok: boolean | null; note: string }
const results: Result[] = [];
const cache = new Map<string, ReturnType<typeof analyse>>();
function analyse(p: WtcPiece) {
  const sa = subjectAndAnswer(p);
  const entries = findEntriesByHead(p, sa.subject).entries;
  const answers = findEntriesByHead(p, sa.answer).entries;
  const transformed = findTransformed(p, sa.subject);
  const s = study(p, sa.subject, sa.answer, entries);
  const lines = p.voices.map(line);
  const cads = cadences(p, lines, harmonies(lines, p.meter, p.length), p.meter);
  return { sa, entries, answers, transformed, s, cads };
}
const barOf = (p: WtcPiece, t: number) => [...p.bars].reverse().find((b) => b.on <= t)?.n ?? 1;

for (const c of claims) {
  const [id, kind, where, ...rest] = c.split(/\s+/);
  const p = fugues.find((f) => f.id === id);
  if (!p) continue;
  if (!cache.has(id)) cache.set(id, analyse(p));
  const a = cache.get(id)!;
  const names = voiceNames(p.voices.length).map((n) => LONG[n] ?? n);
  const [b0, b1] = where.replace("b.", "").split("-").map(Number);
  const tail = rest.join(" ").replace(/\([^)]*\)|\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  const flagged = /\[(GAP|check)\]/.test(c);
  const near = (t: number, slack = 1) => Math.abs(barOf(p, t) - b0) <= slack;
  if (kind === "entry") {
    const [voiceWord, key] = tail.split(" ");
    const all: (Entry & { how: string })[] = [...a.entries.map((e) => ({ ...e, how: "" })), ...a.answers.map((e) => ({ ...e, how: " (as the answer)" })), ...a.transformed.map((e) => ({ ...e, how: e.scale === 2 ? " (augmentation)" : " (diminution)" }))];
    // The bar he names, or the bar before (an entry on an upbeat).
    const cands = all.filter((e) => barOf(p, e.on) === b0 || (barOf(p, e.on) === b0 - 1 && barOf(p, e.on + TPQ) === b0));
    const voiced = voiceWord && voiceWord !== "voice?" ? cands.filter((e) => names[e.voice] === voiceWord || (voiceWord === "alto" && p.voices.length === 3 && e.voice === 1)) : cands;
    let note = cands.length ? (voiced.length ? `found${voiced[0].how}` : `found in the ${names[cands[0].voice]}, not the ${voiceWord}`) : "not found";
    let ok: boolean | null = voiced.length > 0;
    if (ok && key && !/^[ivIV]+$/.test(key) && /^[A-Ga-g]/.test(key)) {
      const k = entryKey(p, voiced[0], a.sa.subject);
      const same = pcOf(k.name) === pcOf(key) && (k.name[0] === k.name[0].toUpperCase()) === (key[0] === key[0].toUpperCase());
      note += same ? `, in ${key}` : `, but read in ${k.name}, not ${key}`;
    } else if (ok && key && /^[ivIV]+$/.test(key)) {
      const k = entryKey(p, voiced[0], a.sa.subject);
      note += k.roman.toUpperCase() === key.toUpperCase() ? `, in ${key}` : `, but read in ${k.roman}, not ${key}`;
    }
    results.push({ claim: c, kind, ok: flagged && !ok ? null : ok, note });
  } else if (kind === "cadence") {
    const key = tail.split(" ")[0];
    const home = pcOf(p.key);
    const scale = p.mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    const rootWanted = /^[ivIV]+$/.test(key) ? (home + scale[ROMAN.indexOf(key.toUpperCase())]) % 12 : /^[A-Ga-g]/.test(key) ? pcOf(key) : null;
    const hit = a.cads.find((x) => Math.abs(barOf(p, x.on) - b0) <= 1 && (rootWanted === null || x.root === rootWanted));
    results.push({ claim: c, kind, ok: hit ? true : flagged ? null : false, note: hit ? `found at bar ${barOf(p, hit.on)}${hit.perfect ? " (perfect)" : ""}` : "not found" });
  } else if (kind === "stretto") {
    const hit = a.s.moments.find((m) => m.kind === "stretto" && near(m.on, 1));
    results.push({ claim: c, kind, ok: hit ? true : flagged ? null : false, note: hit ? `found at bar ${barOf(p, hit.on)}` : "not found" });
  } else if (kind === "pedal") {
    const hit = a.s.moments.find((m) => m.kind === "pedal" && barOf(p, m.on) <= (b1 || b0) && barOf(p, m.end - 1) >= b0);
    results.push({ claim: c, kind, ok: hit ? true : flagged ? null : false, note: hit ? `found, ${hit.label.toLowerCase()}` : "not found" });
  } else if (kind === "section") {
    const cut = a.s.sections.find((x) => Math.abs(barOf(p, x.on) - b0) <= 1);
    results.push({ claim: c, kind, ok: b0 === 1 ? null : cut ? true : false, note: b0 === 1 ? "the opening" : cut ? `a section starts at bar ${barOf(p, cut.on)}` : "no section starts here" });
  }
}

const kinds = ["entry", "stretto", "pedal", "cadence", "section"];
const rate = (k: string) => {
  const r = results.filter((x) => x.kind === k && x.ok !== null);
  const y = r.filter((x) => x.ok).length;
  return `${y} of ${r.length} (${r.length ? Math.round((100 * y) / r.length) : 0}%)`;
};
const byPiece = new Map<string, Result[]>();
for (const r of results) byPiece.set(r.claim.split(" ")[0], [...(byPiece.get(r.claim.split(" ")[0]) ?? []), r]);
const out = [
  "# Ledbetter's claims about the 48 fugues, checked against the analysis",
  "",
  "Generated by `node tools/wtc/ledbetter-claims.ts`. The claims are the machine-checkable bar numbers of",
  "the per-piece digest of David Ledbetter, *Bach's Well-tempered Clavier: The 48 Preludes and Fugues*",
  "(Yale, 2002), made on branch claude/vibrant-gates-fe6o3h (docs/wtc/ledbetter/), copied to",
  "data/wtc/ledbetter-claims.txt. A claim holds if the analysis has the same thing within a bar",
  "(an entry in the bar named, or beginning just before it on an upbeat; in the voice named, if one is;",
  "a cadence on the key named; a section starting there). Claims the digest flags [GAP] or [check] that",
  "the analysis does not bear out are left uncounted, as are sections starting at bar 1.",
  "",
  ...kinds.map((k) => `- **${k}**: ${rate(k)}`),
  "",
  "Entries, strettos and pedal points are the analysis's own readings and should agree; cadences and",
  "sections are where it is known to be weak (docs/wtc/ledbetter-check.md), and his sections are the",
  "better guide.",
  "",
  "## By fugue",
  "",
];
for (const [id, rs] of byPiece) {
  const p = fugues.find((f) => f.id === id)!;
  const counted = rs.filter((r) => r.ok !== null);
  out.push(`### ${label(p)}`, "", `${counted.filter((r) => r.ok).length} of ${counted.length} hold.`, "");
  for (const r of rs) out.push(`- ${r.ok === true ? "✓" : r.ok === false ? "✗" : "·"} \`${r.claim.replace(/^wtc\d\w\d\d /, "")}\`: ${r.note}`);
  out.push("");
}
writeFileSync("docs/wtc/ledbetter-claims.md", out.join("\n"));
console.log(out.slice(10, 15).join("\n"));
