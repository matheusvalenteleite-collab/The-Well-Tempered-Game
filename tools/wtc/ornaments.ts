// P8: the ornaments of the WTC and of the Inventions and Sinfonias, as encoded: for each piece,
// [voice, onset (ticks), pitch, signs, grace notes?] per ornamented note, voices and onsets as in
// data/wtc/{fugues,preludes,inventions}.json. Usage: node tools/wtc/ornaments.ts
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseKern } from "../../src/wtc/kern.ts";

/**
 * P23: appoggiaturas the WTC encodings leave in local comments (e.g. wtc2p23.krn: "! (16eeP/" before
 * "8dd#p\"; kern P marks an appoggiatura, p its main note): each read as a long grace (Q) on the next
 * note of its spine, so that it is heard (half the main note, two thirds of a dotted one).
 */
export function appoggiaturas(text: string): string {
  return text
    .split("\n")
    .map((l) => {
      if (!/^![^!]/.test(l) || !/\d[a-gA-G]+[#n-]*P/.test(l)) return l;
      return l
        .split("\t")
        .map((f) => {
          const m = /^!\s*\(?(\d+\.?)([a-gA-G]+[#n-]*)P/.exec(f);
          return m ? `${m[1]}${m[2]}Q` : ".";
        })
        .join("\t");
    })
    .join("\n");
}

const dirs = ["data/sources/bach-wtc/kern", "data/sources/bach-inventions/kern"];
const out: Record<string, [number, number, string, string, string[]?][]> = {};
const counts: Record<string, number> = {};
for (const dir of dirs)
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".krn")).sort()) {
    const k = parseKern(appoggiaturas(readFileSync(`${dir}/${f}`, "utf8")));
    const rows: [number, number, string, string, string[]?][] = [];
    k.voices.forEach((v, i) =>
      v.forEach((n) => {
        if (!n.orn && !n.grace) return;
        for (const c of n.orn ?? "") counts[c] = (counts[c] ?? 0) + 1;
        if (n.grace) counts.grace = (counts.grace ?? 0) + n.grace.length;
        rows.push(n.grace ? [i, n.on, n.pitch, n.orn ?? "", n.grace.map((g) => `${g.kind}${g.pitch}`)] : [i, n.on, n.pitch, n.orn ?? ""]);
      }),
    );
    if (rows.length) out[f.replace(".krn", "")] = rows;
  }
writeFileSync("data/wtc/ornaments.json", JSON.stringify(out) + "\n");
console.log(Object.keys(out).length, "pieces with ornaments;", counts);
