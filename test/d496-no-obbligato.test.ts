/**
 * D496 (the owner: "I hate the Obbligato right now… Let's scrape it."): OBBLIGATO retired. Nothing offers it any
 * more: no offer, no button, no window or played-well test, no effects or layers on the player's voice, no slot at
 * the roll's foot, no HOW TO PLAY section. D508's balance (the player's +2 dB on its own subject notes, +1 dB on
 * the other voices' entries) is not OBBLIGATO's and stays.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { HOWTO } from "../src/bench/howto-text.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { BAND_ENTRY_DB, PLAYER_ENTRY_DB } from "../src/touch/player-lift.ts";

const root = new URL("..", import.meta.url).pathname;
const src = (p: string) => readFileSync(join(root, p), "utf8");
const files = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : /\.(tsx?|css)$/.test(f) ? [join(d, f)] : []));

test("D496: no OBBLIGATO in the game's code: its modules gone, no offer, boost, layer or voice effect", () => {
  assert.ok(!existsSync(join(root, "src/bench/obbligato.ts")) && !existsSync(join(root, "src/bench/ObbligatoOffer.tsx")));
  for (const f of files(join(root, "src"))) {
    const s = readFileSync(f, "utf8");
    assert.doesNotMatch(s, /from "\.\/(obbligato|ObbligatoOffer)(\.tsx?)?"/, f);
    assert.doesNotMatch(s, /tb-obbligato|obbligatoOn|acceptOffer|offerEffect|voiceFx|VOICE_FX|recordedOnly|OBB_TINGE|\bboosts\b|\blayerOf\b/, f);
  }
  const g = src("src/bench/proto-game.ts");
  assert.doesNotMatch(g, /\boffer\b\s*:/, "no offer on the game");
  assert.doesNotMatch(g, /obbStep|obbFx|obbPlans|obbGrade/);
  assert.doesNotMatch(src("src/bench/protos.ts"), /obbligato\?|obbRng/);
  assert.doesNotMatch(src("src/bench/BenchApp.tsx"), /obbligato: true/);
});

test("D496: the foot measures only what covers it (the legend, the stops): no invisible slot", () => {
  assert.match(src("src/touch/MusicBox.tsx"), /const FOOT_OVER = "\.tg-legend, \.tb-stops-side";/);
});

test("D496: HOW TO PLAY says nothing of OBBLIGATO, in English, Portuguese or Spanish; its words untranslated no more", () => {
  const all = JSON.stringify(HOWTO);
  assert.doesNotMatch(all, /obbligato/i);
  for (const d of [PT, ES]) for (const k of ["OBBLIGATO", "OCTAVE", "TAPE ECHO"]) assert.equal((d as Record<string, string>)[k], undefined, k);
});

test("D496: D508's balance kept (the player +2 dB on its own subject notes, +1 dB on the other voices' entries)", () => {
  assert.equal(PLAYER_ENTRY_DB, 2);
  assert.equal(BAND_ENTRY_DB, 1);
});
