// Checks Ledbetter's bar-number claims (data/wtc/ledbetter-claims.txt: the lab's machine claims from the
// per-piece digest on branch claude/vibrant-gates-fe6o3h, every one checked against the score there,
// docs/wtc/ledbetter/claims-score-check.md) against what the game's study shows: the entries of
// src/wtc/library.ts, the moments and sections of src/wtc/study.ts, and the keys reached
// (src/wtc/harmony.ts), as the study screen computes them. The lab ran the same claims against its own
// analysis (docs/wtc/ledbetter-check.md); this measures the game. Writes docs/wtc/ledbetter-game-check.md.
// Usage: node tools/wtc/ledbetter-game.ts
import { readFileSync, writeFileSync } from "node:fs";
import { LIBRARY, type LibPiece } from "../../src/wtc/library.ts";
import { degreeOf, entryVoice, mergeSections, studyMoments, voiceNames } from "../../src/wtc/study.ts";
import { findCadences, figurationChanges, keyPlan, readHarmony } from "../../src/wtc/harmony.ts";
import { beatOf } from "../../src/wtc/counterpoint.ts";
import { parsePitch } from "../../src/music/pitch.ts";
import type { Entry } from "../../src/wtc/entries.ts";

const claims = readFileSync("data/wtc/ledbetter-claims.txt", "utf8").split("\n").map((l) => l.trim()).filter((l) => /^wtc\d[fp]\d\d /.test(l));
const LONG: Record<string, string> = { S: "soprano", A: "alto", T: "tenor", B: "bass", S1: "soprano", upper: "soprano", lower: "bass" };
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const pcOf = (name: string) => (!/^[A-Ga-g][b#♭♯]?$/.test(name) ? -1 : ((parsePitch(`${name[0].toUpperCase()}${name.slice(1).replace("♭", "b").replace("♯", "#")}4`).midi % 12) + 12) % 12);

interface Analysis {
  piece: LibPiece;
  minor: boolean;
  tonic: number;
  entries: Entry[];
  later: Entry[];
  moments: ReturnType<typeof studyMoments>["moments"];
  sections: number[];
  arrivals: { at: number; tonic: number; minor: boolean }[];
  cadences: { at: number; tonic: number; minor: boolean }[];
  names: string[];
}
const cache = new Map<string, Analysis>();
function analyse(id: string): Analysis {
  const book = Number(id[3]);
  const number = Number(id.slice(5, 7));
  const lib = LIBRARY.find((l) => l.book === book && l.number === number)!;
  const prelude = id[4] === "p";
  const piece = prelude ? lib.prelude() : lib.fugue();
  const key = prelude ? lib.preludeKey : lib.key;
  const minor = key[0] === key[0].toLowerCase();
  const tonic = pcOf(key);
  const entries = prelude ? [] : lib.fugue().entries;
  const later = prelude ? [] : lib.fugue().later;
  const barQ = piece.barQuarters;
  const chords = readHarmony(piece.notes, barQ, beatOf(piece.time));
  const all = findCadences(chords);
  const plan = keyPlan(all);
  const base = studyMoments(piece.notes, piece.voice, piece.count, entries, barQ, minor, prelude ? undefined : { beat: beatOf(piece.time), tonicPc: tonic, later, subjectLength: (() => { const sj = lib.fugue().subject; return sj[sj.length - 1].at + sj[sj.length - 1].dur; })() });
  const end = Math.max(...piece.notes.map((n) => n.at + n.dur));
  let sections: number[];
  if (!prelude) sections = mergeSections(base.sections, piece.given, later, barQ, piece.pickup, end).map((s) => s.from);
  else {
    // As the study screen: a prelude's sections run from one key reached to the next, else from one figuration to the next.
    const figures = figurationChanges(piece.notes, barQ);
    const cuts = [0, ...(plan.length ? plan.map((c) => chords[c.chord].to) : figures.map((b) => b * barQ)).filter((q) => q > barQ && q < end - barQ)];
    const own = cuts.map((from, k) => ({ kind: "figure", from, to: cuts[k + 1] ?? end, entries: [] as number[] }));
    sections = mergeSections(own, piece.given, [], barQ, piece.pickup, end).map((s) => s.from);
  }
  return { piece, minor, tonic, entries, later, moments: base.moments, sections, arrivals: plan, cadences: all, names: voiceNames(piece.count) };
}

interface Result { claim: string; kind: string; ok: boolean | null; note: string }
const results: Result[] = [];
for (const c of claims) {
  const [id, kind, where, ...rest] = c.split(/\s+/);
  if (!cache.has(id)) cache.set(id, analyse(id));
  const a = cache.get(id)!;
  const p = a.piece;
  const bar = (q: number) => Math.floor(q / p.barQuarters + 1e-6) + 1 - p.pickup;
  const [b0, b1] = where.replace("b.", "").split("-").map((x) => Math.floor(Number(x.replace("½", ".5"))));
  const tail = rest.join(" ").replace(/\([^)]*\)|\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  const flagged = /\[(GAP|check)\]/.test(c);
  const keyName = (pc: number, minor: boolean) => (minor ? NAMES[pc].toLowerCase() : NAMES[pc]);
  const wanted = (key: string) => (/^[ivIV]+$/.test(key) ? (a.tonic + (a.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11])[ROMAN.indexOf(key.toUpperCase())]) % 12 : /^[A-Ga-g]/.test(key) ? pcOf(key) : null);
  let ok: boolean | null = null;
  let note = "";
  if (kind === "entry") {
    if (id[4] === "p") { ok = null; note = "a prelude: the study finds no entries in preludes"; }
    else if (/\(S([23])\)|(second|third) subject|subject ([23])/i.test(c)) {
      const w = /\(S([23])\)|(second|third) subject|subject ([23])/i.exec(c)!;
      const n = Number(w[1] ?? w[3] ?? (w[2].toLowerCase() === "second" ? 2 : 3));
      const hit = a.later.find((e) => e.subject === n && Math.abs(bar(e.at) - b0) <= 1);
      ok = !!hit;
      note = hit ? `found, subject ${n} in the ${a.names[entryVoice(hit, p.voice)]} at bar ${bar(hit.at)}` : a.later.some((e) => e.subject === n) ? `subject ${n} found, but not here` : `subject ${n} not identified`;
    }
    else {
      const [voiceWord, key] = tail.split(" ");
      const first = a.entries[0]?.shift ?? 0;
      const cands = a.entries.filter((e) => bar(e.at) === b0 || (bar(e.at) === b0 - 1 && bar(e.at + 1) === b0));
      const voiced = voiceWord && voiceWord !== "voice?" && voiceWord !== "voices?" ? cands.filter((e) => a.names[entryVoice(e, p.voice)] === (LONG[voiceWord] ?? voiceWord) || (/^soprano/.test(a.names[entryVoice(e, p.voice)]) && /^soprano/.test(LONG[voiceWord] ?? voiceWord))) : cands;
      ok = voiced.length > 0;
      note = cands.length ? (voiced.length ? "found" : `found in the ${a.names[entryVoice(cands[0], p.voice)]}, not the ${voiceWord}`) : "not found";
      const e = voiced[0];
      if (e && key && !e.inverted) {
        const pc = (a.tonic + e.shift - first + 120) % 12;
        const want = wanted(key);
        if (want !== null && want >= 0) note += want === pc ? `, on ${key}` : `, but on the degree ${degreeOf(e.shift - first, a.minor)} (${NAMES[pc]}), not ${key}`;
      } else if (e?.inverted) note += " (inverted)";
      if (flagged && !ok) ok = null;
    }
  } else if (kind === "cadence") {
    const key = tail.split(" ")[0];
    const want = wanted(key);
    const near = (x: { at: number; tonic: number }) => Math.abs(bar(x.at) - b0) <= 1 && (want === null || x.tonic === want);
    const shown = a.arrivals.find(near);
    const any = a.cadences.find(near);
    ok = !!shown;
    note = shown ? `shown: ${keyName(shown.tonic, shown.minor)} reached at bar ${bar(shown.at)}` : any ? `the harmony reads a cadence on ${keyName(any.tonic, any.minor)} at bar ${bar(any.at)}, not shown (the key was already reached)` : "not found";
    if (flagged && !ok) ok = null;
  } else if (kind === "stretto") {
    if (id[4] === "p") { ok = null; note = "a prelude"; }
    else {
      const hit = a.moments.find((m) => m.kind === "stretto" && Math.abs(bar(m.from) - b0) <= 1);
      ok = !!hit;
      note = hit ? `found at bar ${bar(hit.from)}` : "not found";
      if (flagged && !ok) ok = null;
    }
  } else if (kind === "pedal") {
    const hit = a.moments.find((m) => m.kind === "pedal" && bar(m.from) <= (b1 || b0) && bar(m.to - 1e-3) >= b0);
    ok = !!hit;
    note = hit ? `found, ${hit.detail.pitch}, bars ${bar(hit.from)}–${bar(hit.to - 1e-3)}` : "not found";
    if (flagged && !ok) ok = null;
  } else if (kind === "section") {
    if (b0 <= 1) { ok = null; note = "the opening"; }
    else {
      const cut = a.sections.find((q) => Math.abs(bar(q) - b0) <= 1);
      ok = cut !== undefined;
      note = cut !== undefined ? `a section starts at bar ${bar(cut)}` : "no section starts here";
      if (flagged && !ok) ok = null;
    }
  } else continue;
  results.push({ claim: c, kind, ok, note });
}

// What the study shows that Ledbetter's claims do not: strettos and first-subject entries with no claim within a bar.
const extras: string[] = [];
for (const [id, a] of cache) {
  if (id[4] !== "f") continue;
  const p = a.piece;
  const bar = (q: number) => Math.floor(q / p.barQuarters + 1e-6) + 1 - p.pickup;
  const mine = claims.filter((c) => c.startsWith(id + " "));
  const claimedBars = (k: string) => mine.filter((c) => c.split(/\s+/)[1] === k).map((c) => Math.floor(Number(c.split(/\s+/)[2].replace("b.", "").split("-")[0].replace("½", ".5"))));
  const sb = claimedBars("stretto");
  const st = a.moments.filter((m) => m.kind === "stretto" && !sb.some((b) => Math.abs(bar(m.from) - b) <= 1)).map((m) => bar(m.from));
  if (st.length && sb.length + claimedBars("entry").length > 0) extras.push(`- ${id}: strettos the study shows that no claim names, at bars ${[...new Set(st)].join(", ")}`);
}

const kinds = ["entry", "stretto", "pedal", "cadence", "section"];
const rate = (k: string, f: string) => {
  const r = results.filter((x) => x.kind === k && x.ok !== null && x.claim[4] === f);
  const y = r.filter((x) => x.ok).length;
  return r.length ? `${y} of ${r.length} (${Math.round((100 * y) / r.length)}%)` : "none";
};
const byPiece = new Map<string, Result[]>();
for (const r of results) byPiece.set(r.claim.split(" ")[0], [...(byPiece.get(r.claim.split(" ")[0]) ?? []), r]);
const out = [
  "# Ledbetter's claims, checked against what the game's study shows",
  "",
  "Generated by `node tools/wtc/ledbetter-game.ts`. The claims (data/wtc/ledbetter-claims.txt) are the lab's",
  "machine-checkable bar numbers from the per-piece digest of David Ledbetter, *Bach's Well-tempered Clavier:",
  "The 48 Preludes and Fugues* (Yale, 2002), every one of which was read in the encoded score",
  "(docs/wtc/ledbetter/claims-score-check.md: corrected claims carry the score's reading). They are run here",
  "against the game's own readings, as the study screen computes them: the entries of src/wtc/library.ts, the",
  "strettos, pedal points and sections of src/wtc/study.ts, the keys reached (src/wtc/harmony.ts). A claim holds",
  "if the study has the same thing within a bar (an entry in the bar named or just before it on an upbeat, in",
  "the voice named; a key reached on the key named; a section starting there). Claims flagged [GAP] or [check]",
  "that the study does not bear out are left uncounted, as are sections starting at bar 1. For the lab's own",
  "analysis on the same claims see docs/wtc/ledbetter-check.md.",
  "",
  "| | fugues | preludes |",
  "|---|---|---|",
  ...kinds.map((k) => `| ${k} | ${rate(k, "f")} | ${rate(k, "p")} |`),
  "",
  "## Strettos the study shows and no claim names",
  "",
  ...(extras.length ? extras : ["None."]),
  "",
  "## By piece",
  "",
];
for (const [id, rs] of byPiece) {
  const counted = rs.filter((r) => r.ok !== null);
  out.push(`### ${id}`, "", `${counted.filter((r) => r.ok).length} of ${counted.length} hold.`, "");
  for (const r of rs) out.push(`- ${r.ok === true ? "✓" : r.ok === false ? "✗" : "·"} \`${r.claim.replace(/^wtc\d\w\d\d /, "")}\`: ${r.note}`);
  out.push("");
}
writeFileSync("docs/wtc/ledbetter-game-check.md", out.join("\n"));
console.log(out.slice(13, 21).join("\n"));
