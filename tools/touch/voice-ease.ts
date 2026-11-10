/**
 * D454: bakes each fugue's per-voice difficulty (src/bench/difficulty.ts voiceDifficulty) into
 * src/bench/voice-ease.ts. Run: npx tsx tools/touch/voice-ease.ts. test/d454-voice-ease.test.ts checks the
 * baked scores still match the notes.
 */
import { writeFileSync } from "node:fs";
import { fugueById } from "../../src/touch/fugue.ts";
import { voiceDifficulty } from "../../src/bench/difficulty.ts";

const ids = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const rows = ids.map((id) => {
  const f = fugueById(id);
  return `  ${id}: [${f.voices.map((_, v) => voiceDifficulty(f, v).score).join(", ")}],`;
});
writeFileSync(
  new URL("../../src/bench/voice-ease.ts", import.meta.url),
  `/**
 * D454: each WTC fugue's voices' difficulty scores, top voice first (src/bench/difficulty.ts voiceDifficulty, at the
 * standard tempo; baked by tools/touch/voice-ease.ts). The voice offered first is the easiest (flow.ts defaultVoice).
 */
export const VOICE_SCORES: Readonly<Record<string, readonly number[]>> = {
${rows.join("\n")}
};
`,
);
console.log(rows.join("\n"));
