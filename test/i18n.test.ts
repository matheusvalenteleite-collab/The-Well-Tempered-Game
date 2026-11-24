/** D283: Portuguese (Brazil) and Spanish: every English text the game translates has both. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { keyWordsIn, pieceName, tr, trCanvas, useLang, voiceName } from "../src/i18n/index.ts";
import { TUTORIAL_LESSONS } from "../src/bench/lessons.ts";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

/** Every `tr("…")` literal in the source, and every tutorial step's words. */
function keys(): Set<string> {
  const out = new Set<string>();
  for (const f of files("src").filter((f) => !f.includes("i18n"))) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/\btr\(\s*"((?:[^"\\]|\\.)*)"/g)) out.add(m[1].replace(/\\(.)/g, "$1"));
  }
  for (const l of TUTORIAL_LESSONS) {
    out.add(l.english);
    if (l.goal) out.add(l.goal);
    for (const line of [...l.intro, ...l.praise, ...l.again]) out.add(line.text);
  }
  return out;
}

test("D283: every translated text has Portuguese and Spanish, with the same blanks", () => {
  const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  const wrong: string[] = [];
  for (const k of keys()) {
    for (const [name, d] of [["pt", PT], ["es", ES]] as const) {
      if (!d[k]) wrong.push(`${name} lacks: ${k}`);
      else if (vars(d[k]) !== vars(k)) wrong.push(`${name} blanks differ: ${k}`);
    }
  }
  assert.deepEqual(wrong, []);
});

test("D283: drawn words translate whole words, once", () => {
  useLang("pt");
  assert.equal(trCanvas("BAR 3"), "COMPASSO 3");
  assert.equal(trCanvas("PERFECT"), "PERFEITO");
  assert.equal(trCanvas("HOLD · LEFT THUMB"), "SEGURE · POLEGAR ESQUERDO");
  assert.equal(trCanvas("BAROQUE BAND · SYNTH"), "CONJUNTO BARROCO · SINTETIZADO");
  assert.equal(keyWordsIn("f#"), "FÁ♯ MENOR");
  assert.equal(voiceName("BASS"), "BAIXO");
  assert.equal(tr("You played {n} of {m} notes right; aim for {k}.", { n: 3, m: 9, k: 7 }), "Você acertou 3 de 9 notas; a meta é 7.");
  useLang("es");
  assert.equal(trCanvas("✕ OFF TIME"), "✕ FUERA DE TIEMPO");
  assert.equal(keyWordsIn("Eb"), "MI♭ MAYOR");
  assert.match(pieceName("fugue", "c"), /^FUGA EN DO MENOR/);
  useLang("en");
  assert.equal(trCanvas("BAR 3"), "BAR 3");
  assert.equal(tr("HEAR THE SUBJECT"), "HEAR THE SUBJECT");
});
