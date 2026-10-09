// Are Fux's precepts independent of one another? For each precept (error rule) of each species, a
// search (first from Fux's own solutions changed by one or two notes, then a beam search) for a witness: a line over one of Fux's own cantus firmi that breaks that precept and no
// other. A witness proves independence (the rule forbids something the others allow); no witness
// after the search is evidence, not proof, that the rule follows from the others on these cantus
// firmi (for first species the search is then made exhaustive). Written to
// docs/fux/independence-study.md. Usage: node tools/lab/independence-study.ts [species...]
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { evaluate } from "../../src/counterpoint/engine.ts";
import { loadFuxRepository } from "../../src/music/fux/load-node.ts";
import { lastStepOf } from "../../src/counterpoint/choices/audit.ts";
import { AUDIT_SPECIES, choiceUnits, fuxLines, type FuxLine } from "../../src/counterpoint/choices/corpus.ts";
import { rng } from "../../src/counterpoint/choices/cantus.ts";
import { barRhythms } from "../../src/counterpoint/choices/florid.ts";
import { fuxAccidentals, pitchesBetween, registerWindow } from "../../src/counterpoint/choices/vocabulary.ts";
import { rulesForStep } from "../../src/counterpoint/curriculum/index.ts";
import { HOLD, REST, slotLayout, sounding, type SpeciesId } from "../../src/counterpoint/layout.ts";
import type { Rule, Violation } from "../../src/counterpoint/rules/types.ts";

const repo = loadFuxRepository();
const acc = fuxAccidentals(repo);
const ENDING = /cadence|final|prefer-imperfect|ligature-where-possible/;

function judge(l: FuxLine, bars: number, line: string[], rules: Rule[]) {
  const layout = slotLayout(l.species, bars);
  return evaluate(
    {
      species: l.species,
      modalFinal: l.modalFinal,
      cantusVoice: l.cantusVoice,
      cantus: l.cantus.slice(0, bars).map((p) => ({ pitch: p, duration: "1/1" })),
      counterpoint: line.map((p, k) => ({ pitch: p === HOLD ? HOLD : sounding(p) ? p : null, duration: layout[k].duration })),
    },
    rules,
  );
}

interface Witness {
  line: string[];
  violations: Violation[];
}

/**
 * Beam search for a line over l's cantus that breaks `target` and none of `others`. Prefixes are
 * judged at each bar line: a finding of the others (not on the prefix's last slot, and not about the
 * ending) removes the state; findings of the target are rewarded. The rhythm is Fux's own in fifth
 * species (pitches vary, not values).
 */
function search(l: FuxLine, target: Rule, others: Rule[], seed: number, width = 24): Witness | null {
  const layout = l.layout;
  const [lo, hi] = registerWindow(l.cantus, l.cantusVoice, l.line);
  const vocab = pitchesBetween(lo, hi, acc[l.modalFinal]);
  const r = rng(seed);
  const rhythm = l.species === "fifth" ? barRhythms(l.layout, l.line).join("") : null;
  const prefixOthers = others.filter((x) => !ENDING.test(x.id));
  let beam: { line: string[]; cost: number }[] = [{ line: [], cost: 0 }];
  for (let k = 0; k < layout.length; k++) {
    const s = layout[k];
    const fixed = rhythm ? (rhythm[k] === "~" ? HOLD : rhythm[k] === "r" ? REST : null) : k === 0 && l.species === "fourth" ? REST : null;
    const options = fixed ? [fixed] : vocab;
    const next: typeof beam = [];
    for (const st of beam) for (const p of options) next.push({ line: [...st.line, p], cost: st.cost + r() });
    const last = k === layout.length - 1;
    const judged: typeof beam = [];
    for (const st of next) {
      if (s.beat === 0 && s.bar >= 1 && !last) {
        let ev;
        try {
          ev = judge(l, s.bar + 1, st.line, [...prefixOthers, target]);
        } catch {
          continue;
        }
        if (ev.errors.some((v) => v.ruleId !== target.id && !v.positions.includes(k))) continue;
        st.cost -= 3 * ev.errors.filter((v) => v.ruleId === target.id).length;
      }
      judged.push(st);
    }
    judged.sort((a, b) => a.cost - b.cost);
    beam = last ? judged : judged.slice(0, width);
  }
  for (const st of beam) {
    let ev;
    try {
      ev = judge(l, l.cantus.length, st.line, [...others, target]);
    } catch {
      continue;
    }
    const broken = new Set(ev.errors.map((v) => v.ruleId));
    if (broken.size === 1 && broken.has(target.id)) return { line: st.line, violations: ev.errors };
  }
  return null;
}

/**
 * Local search from Fux's own solution (legal under every precept): change one note (a fourth-
 * species ligature as one), then two neighbouring notes, and look for a line that breaks the target
 * and nothing else. Far stronger than a blind search where the precepts are dense.
 */
function perturb(l: FuxLine, target: Rule, others: Rule[]): Witness | null {
  const [lo, hi] = registerWindow(l.cantus, l.cantusVoice, l.line);
  const vocab = pitchesBetween(lo, hi, acc[l.modalFinal]);
  const units = choiceUnits(l.layout, l.line).filter((u) => sounding(l.line[u[0]]));
  const rules = [...others, target];
  const test = (line: string[]): Witness | null => {
    let ev;
    try {
      ev = judge(l, l.cantus.length, line, rules);
    } catch {
      return null;
    }
    const broken = new Set(ev.errors.map((v) => v.ruleId));
    return broken.size === 1 && broken.has(target.id) ? { line, violations: ev.errors } : null;
  };
  const put = (line: string[], u: number[], p: string) => line.map((q, k) => (u.includes(k) ? p : q));
  for (const u of units) for (const p of vocab) {
    const w = test(put(l.line, u, p));
    if (w) return w;
  }
  for (let i = 0; i + 1 < units.length; i++) {
    for (const p of vocab) {
      const once = put(l.line, units[i], p);
      for (const q of vocab) {
        const w = test(put(once, units[i + 1], q));
        if (w) return w;
      }
    }
  }
  return null;
}

/** First species: every line over the cantus (pitches of the window), pruned by the others; does any break only the target? */
function exhaustive(l: FuxLine, target: Rule, others: Rule[], budget = 400000): { found: Witness | null; complete: boolean; visited: number } {
  const [lo, hi] = registerWindow(l.cantus, l.cantusVoice, l.line);
  const vocab = pitchesBetween(lo, hi, acc[l.modalFinal]);
  const n = l.cantus.length;
  const prefixOthers = others.filter((x) => !ENDING.test(x.id));
  let visited = 0;
  let found: Witness | null = null;
  const walk = (line: string[]): boolean => {
    if (++visited > budget) return true;
    const k = line.length;
    if (k === n) {
      const ev = judge(l, n, line, [...others, target]);
      const broken = new Set(ev.errors.map((v) => v.ruleId));
      if (broken.size === 1 && broken.has(target.id)) {
        found = { line, violations: ev.errors };
        return true;
      }
      return false;
    }
    for (const p of vocab) {
      const next = [...line, p];
      if (next.length >= 2 && next.length < n) {
        const ev = judge(l, next.length, next, prefixOthers);
        if (ev.errors.some((v) => !v.positions.includes(next.length - 1))) continue;
      }
      if (walk(next)) return true;
    }
    return false;
  };
  walk([]);
  return { found, complete: visited <= budget && !found ? true : !!found, visited };
}

const want = (process.argv.slice(2) as SpeciesId[]).filter((s) => AUDIT_SPECIES.includes(s));
const speciesList = want.length ? want : AUDIT_SPECIES;
const out: string[] = [];
for (const species of speciesList) {
  const rules = rulesForStep(lastStepOf(species));
  const errors = rules.filter((x) => x.severity === "error");
  const lines = fuxLines(repo, species);
  out.push(`## ${species[0].toUpperCase()}${species.slice(1)} species`, "");
  out.push(`${errors.length} precepts (errors) at the species' last step; witnesses searched over Fux's ${lines.length} cantus firmi of the species${species === "fifth" ? " (with Fux's own rhythms: precepts about rhythm alone cannot be broken by pitches)" : ""}.`, "");
  out.push("| precept | independent? | witness |", "|---|---|---|");
  for (const target of errors) {
    const others = errors.filter((x) => x !== target);
    let w: Witness | null = null;
    let where: FuxLine | null = null;
    for (const l of lines) {
      w = perturb(l, target, others);
      if (w) {
        where = l;
        break;
      }
    }
    for (const l of w ? [] : lines) {
      for (const seed of [1, 2]) {
        w = search(l, target, others, seed * 7919 + lines.indexOf(l));
        if (w) break;
      }
      if (w) {
        where = l;
        break;
      }
    }
    let verdict = w ? "yes" : "no witness found";
    if (!w && species === "first") {
      const tries = lines.slice(0, 3).map((l) => ({ l, r: exhaustive(l, target, others) }));
      const hit = tries.find((t) => t.r.found);
      if (hit) {
        w = hit.r.found;
        where = hit.l;
        verdict = "yes (exhaustive search)";
      } else verdict = tries.every((t) => t.r.complete) ? `**none exists** over Figs. ${tries.map((t) => t.l.figure).join(", ")} (exhaustive)` : "no witness found (exhaustive search cut short)";
    }
    const witness = w && where ? `Fig. ${where.figure} cantus (${where.cantusVoice === "lower" ? "below" : "above"}): ${w.line.filter(sounding).join(" ")}; breaks it at slot${w.violations[0].positions.length > 1 ? "s" : ""} ${w.violations[0].positions.map((p) => p + 1).join(", ")}` : "–";
    out.push(`| \`${target.id}\` | ${verdict} | ${witness} |`);
    console.log(species, target.id, verdict);
  }
  out.push("");
}
const header = [
  "# Are Fux's precepts independent?",
  "",
  "Generated by `node tools/lab/independence-study.ts`. For every precept (error rule) in force at the",
  "last step of each two-voice species, a search for a **witness**: a line over one of Fux's own",
  "cantus firmi that breaks that precept and no other. A witness shows the precept does work the others",
  "do not; a precept with no witness may follow from the others (on these cantus firmi), which is",
  "evidence, not proof, unless the search was exhaustive (first species).",
  "",
];
// Keep sections for species not rerun.
const path = "docs/fux/independence-study.md";
const old = existsSync(path) ? readFileSync(path, "utf8") : "";
const sections = new Map<string, string>();
for (const part of old.split(/\n(?=## )/).slice(1)) if (!part.startsWith("## Reading")) sections.set(part.split("\n")[0], part.trimEnd());
for (const part of out.join("\n").split(/\n(?=## )/)) if (part.startsWith("## ")) sections.set(part.split("\n")[0], part.trimEnd());
const order = AUDIT_SPECIES.map((s) => `## ${s[0].toUpperCase()}${s.slice(1)} species`);
// The reading (written for the run of October 2026; revise it if the results change).
const reading = readFileSync(new URL("./independence-reading.md", import.meta.url), "utf8");
writeFileSync(path, [...header, ...order.filter((h) => sections.has(h)).map((h) => sections.get(h)! + "\n"), reading].join("\n"));
