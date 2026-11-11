/**
 * D560, the sample folders after the bands' promotion: every recording the touch game can ask for exists (each instrument's
 * sets and layers, every drum style's files, in every copy the manifest lists), and every folder of public/samples is
 * named by the code that loads it (nothing left that no sound references; tools/sample-manifest.mjs's manifest aside).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { installFakeAudio } from "./fake-audio.ts";
import { SAMPLED, fileOf, folderOf, sampledMidis, setZones } from "../src/touch/sampled.ts";
import { drumFilesFor } from "../src/touch/chip.ts";
import { styleIds } from "../src/touch/drum-library.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";

installFakeAudio(0, false);
const ROOT = "public/samples";

const setsOf = (i: (typeof SAMPLED)[keyof typeof SAMPLED]) => [i.set, i.soft?.set, i.hard?.set, i.short?.set, i.blend?.set, i.release, i.low, i.above?.set, ...(i.zones ?? []).map((z) => z.set)].filter((s): s is string => !!s);
const missingFor = (set: string, notes: Iterable<number>) => {
  const out: string[] = [];
  for (const m of notes) {
    const mp3 = fileOf(set, m);
    const dir = join(ROOT, folderOf(set));
    if (!existsSync(join(dir, mp3))) out.push(`${folderOf(set)}/${mp3}`);
    const alt = SAMPLE_MANIFEST[folderOf(set)]?.alt;
    for (const w of ["webm", "m4a"] as const) {
      const f = alt?.[w]?.[mp3] ? mp3.replace(/\.mp3$/, `.${w}`) : null;
      if (f && !existsSync(join(dir, f))) out.push(`${folderOf(set)}/${f}`);
    }
  }
  return out;
};

test("D560: every recording an instrument can play exists (its sets and layers, each copy the manifest lists)", () => {
  const missing: string[] = [];
  for (const inst of Object.values(SAMPLED))
    for (const set of setsOf(inst)) {
      setZones(set, null);
      const ms = sampledMidis(set);
      assert.ok(ms.length, `${set}: recordings`);
      missing.push(...missingFor(set, ms));
    }
  assert.deepEqual(missing, []);
});

test("D560: every drum style's recordings exist", () => {
  const missing: string[] = [];
  for (const style of styleIds) for (const { set, notes } of drumFilesFor(style)) missing.push(...missingFor(set, notes));
  assert.deepEqual(missing, []);
});

test("D560: every folder of public/samples is named by the code (none left that nothing references)", () => {
  const src: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f) && !p.endsWith("sample-manifest.ts")) src.push(readFileSync(p, "utf8"));
    }
  };
  walk("src");
  const code = src.join("\n");
  const named = (name: string) => code.includes(`"${name}"`) || code.includes(`'${name}'`) || code.includes(`${name}/`) || code.includes(`/${name}"`);
  const folders = readdirSync(ROOT).filter((f) => statSync(join(ROOT, f)).isDirectory());
  const kits = readdirSync(join(ROOT, "drums")).filter((f) => statSync(join(ROOT, "drums", f)).isDirectory());
  const loose = [...folders.filter((f) => !named(f)), ...kits.filter((k) => !named(k)).map((k) => `drums/${k}`)];
  assert.deepEqual(loose, []);
  // And LICENSES.txt names every folder it holds (the credits follow the recordings).
  const lic = readFileSync(join(ROOT, "LICENSES.txt"), "utf8");
  for (const f of folders) assert.ok(lic.includes(`${f}/`), `LICENSES.txt: ${f}/`);
});
