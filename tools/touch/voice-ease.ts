/**
 * D454: bakes each fugue's per-voice difficulty (src/bench/difficulty.ts voiceDifficulty) into
 * src/bench/voice-ease.ts. Run: npx tsx tools/touch/voice-ease.ts. test/d454-voice-ease.test.ts checks the
 * baked scores still match the notes.
 */
import { writeFileSync } from "node:fs";
import { fugueById, loadExtras, MORE_INDEX } from "../../src/touch/fugue.ts";
import { voiceDifficulty } from "../../src/bench/difficulty.ts";

// D727: and THE ART OF FUGUE's twenty pieces (its own tab on play.html), its notes loaded first; D750: and the 30 Inventions and Sinfonias.
await loadExtras();
const ids = [...[1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`)), ...MORE_INDEX.filter(([, c]) => c === "aof").map(([id]) => id), "bwv1080-14", ...MORE_INDEX.filter(([, c]) => c === "inv" || c === "sin").map(([id]) => id)];
const rows = ids.map((id) => {
  const f = fugueById(id);
  return `  ${JSON.stringify(id)}: [${f.voices.map((_, v) => voiceDifficulty(f, v).score).join(", ")}],`;
});
writeFileSync(
  new URL("../../src/bench/voice-ease.ts", import.meta.url),
  `/**
 * D454: each WTC fugue's voices' difficulty scores (D727: and THE ART OF FUGUE's), top voice first (src/bench/difficulty.ts voiceDifficulty, at the
 * standard tempo; baked by tools/touch/voice-ease.ts). The voice offered first is the easiest (flow.ts defaultVoice).
 */
export const VOICE_SCORES: Readonly<Record<string, readonly number[]>> = {
${rows.join("\n")}
};
`,
);
console.log(rows.join("\n"));
