/**
 * D420, THUMB PISTONS (the owner: "Pistons good idea as well"): three combination pistons per instrument
 * replace the single stops while playing (registration.ts; RegistrationStops.tsx). Their contents and
 * the registration they make; the start piston from the colour plan; what is kept (old records still
 * read); a held organ note taking a new registration (chip.ts Chip.note/retake), the harpsichord's not;
 * the touch acted on at pointerdown (a click only from the keyboard).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play, type Sounding } from "../src/touch/chip.ts";
import { PATCHES, setPreset } from "../src/touch/sound.ts";
import {
  actsOn,
  clearStopChanges,
  cueMet,
  DEFAULT_PISTONS,
  DEFAULT_REG,
  defaultPistons,
  heldChange,
  HOME_PISTON,
  loadPistons,
  loadRegistration,
  organPatch,
  pedalPatch,
  pistonChanges,
  pistonFor,
  pistonRegistration,
  recordStopChange,
  registeredNote,
  REG_KEY,
  savePistons,
  saveRegistration,
  setLiveRegistration,
  stopChanges,
  togglePiston,
  UNISON,
  FOUR,
  type Pistons,
  type Registration,
} from "../src/touch/registration.ts";
import { setColours } from "../src/touch/colour.ts";

register("./tsx-hooks.mjs", import.meta.url);

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
const ctxOf = installFakeAudio(0, false);

const O = "chamberOrgan";
const H = "harpsichordSampled";
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D420: the pistons' defaults: the organ's flutes, principals, plenum; the harpsichord's buff, 8′, 8′+8′+4′", () => {
  assert.deepEqual(DEFAULT_PISTONS[O], [["flute", "sub16"], ["principal", "sub16"], ["principal", "mixture", "sub16"]]);
  assert.deepEqual(DEFAULT_PISTONS[H], [["lute"], [], ["unison", "four"]]);
  assert.equal(HOME_PISTON, 1);
  // A copy: editing one never edits the defaults.
  const d = defaultPistons(O);
  d[0].push("reed");
  assert.deepEqual(DEFAULT_PISTONS[O][0], ["flute", "sub16"]);
});

test("D420: a piston's contents as the player's registration, and what each note then plays", () => {
  const [I, II, III] = DEFAULT_PISTONS[O];
  const man = PATCHES.orgPrincipal;
  const ped = PATCHES.orgPedal;
  // A manual takes the manual's stops (the pedal's 16′ left out).
  assert.deepEqual(pistonRegistration(O, I, man, false), { stops: ["flute"], tutti: false });
  assert.deepEqual(pistonRegistration(O, III, man, true), { stops: ["principal", "mixture"], tutti: true });
  assert.equal(registeredNote(O, pistonRegistration(O, I, man, false), man, true, 64)?.patch, PATCHES.orgFlute);
  assert.equal(registeredNote(O, pistonRegistration(O, II, man, false), man, true, 64), null, "II: the principals, the voice's own");
  assert.equal(registeredNote(O, pistonRegistration(O, III, man, false), man, true, 64)?.patch, PATCHES.orgPleno, "III: D349's plenum");
  // The pedal follows the manual stops (pedalPatch): the soft pedal under the flutes, the plenum's under III; its 16′ the piston's.
  assert.deepEqual(pistonRegistration(O, I, ped, false), { stops: ["flute", "sub16"], tutti: false });
  assert.equal(registeredNote(O, pistonRegistration(O, I, ped, false), ped, true, 40)?.patch, PATCHES.orgPedalSoft);
  assert.equal(registeredNote(O, pistonRegistration(O, II, ped, false), ped, true, 40), null);
  assert.equal(registeredNote(O, pistonRegistration(O, III, ped, false), ped, true, 40)?.patch, pedalPatch(["principal", "mixture"], true));
  assert.equal(registeredNote(O, pistonRegistration(O, ["principal"], ped, false), ped, true, 40)?.patch, PATCHES.orgPedal8, "16′ pushed in");
  // An old record's pedal stops (16′, the tremulant alone) as before: the principals' pedal.
  assert.equal(registeredNote(O, { stops: ["sub16"], tutti: false }, ped, true, 40), null);
  // Not the band without TUTTI; the whole organ with it.
  assert.equal(registeredNote(O, pistonRegistration(O, I, man, false), man, false, 64), null);
  assert.equal(registeredNote(O, pistonRegistration(O, I, man, true), man, false, 64)?.patch, PATCHES.orgFlute);
  // The harpsichord: the buff, the 8′ alone, the coupled 8′+8′ and the 4′.
  const [hI, hII, hIII] = DEFAULT_PISTONS[H];
  const hp = PATCHES.harpsiSampled;
  assert.equal(registeredNote(H, pistonRegistration(H, hI, hp, false), hp, true, 64)?.lute, true);
  assert.equal(registeredNote(H, pistonRegistration(H, hII, hp, false), hp, true, 64), null);
  assert.deepEqual(registeredNote(H, pistonRegistration(H, hIII, hp, false), hp, true, 64)?.choirs, { unison: UNISON, four: FOUR });
  // Unknown stops are dropped, the preset's order kept.
  assert.deepEqual(pistonRegistration(O, ["mixture", "lute" as never, "principal"], man, false).stops, ["principal", "mixture"]);
});

test("D420: editing a piston: an organ piston never silent (MIXTURE alone draws the PRINCIPAL), the order kept", () => {
  assert.deepEqual(togglePiston(O, ["flute", "sub16"], "reed"), ["flute", "reed", "sub16"]);
  assert.deepEqual(togglePiston(O, ["flute", "sub16"], "flute"), ["flute", "sub16"], "the last foundation stop stays drawn");
  assert.deepEqual(togglePiston(O, ["principal", "mixture"], "principal"), ["principal", "mixture"]);
  assert.deepEqual(togglePiston(O, ["principal", "sub16"], "sub16"), ["principal"]);
  assert.deepEqual(togglePiston(H, [], "four"), ["four"]);
  assert.deepEqual(togglePiston(H, ["four"], "four"), [], "the harpsichord's 8′ always speaks");
});

test("D420: the piston a registration matches; the run starts on the colour plan's at bar 1, else II", async () => {
  const ps = DEFAULT_PISTONS[O];
  assert.equal(pistonFor(O, ps, ["flute"]), 0);
  assert.equal(pistonFor(O, ps, ["principal", "mixture"]), 2);
  assert.equal(pistonFor(O, ps, []), 1, "the sound's own: the principals");
  assert.equal(pistonFor(O, ps, null), 1);
  assert.equal(pistonFor(O, ps, ["flute", "principal"]), 1, "a tie: II");
  assert.equal(pistonFor(O, ps, ["reed"], true), -1);
  assert.equal(pistonFor(H, DEFAULT_PISTONS[H], ["lute"]), 0);
  assert.equal(pistonFor(H, DEFAULT_PISTONS[H], ["unison", "four"]), 2);
  assert.equal(pistonFor(H, DEFAULT_PISTONS[H], ["four"]), 1, "8′+4′ as near the 8′ as the full: II");
  const { startPiston } = await import("../src/touch/RegistrationStops.tsx");
  setColours({ p1: { [O]: [[1, { reg: ["flute"] }], [9, { reg: ["principal", "mixture"] }]] }, p2: { [O]: [[1, { reg: ["flute"], voices: [1] }]] }, p3: { [H]: [[1, { reg: ["unison", "four"] }]] } });
  assert.equal(startPiston("p1", O, 0, ps), 0);
  assert.equal(startPiston("p2", O, 0, ps), 1, "the plan's flutes are another voice's");
  assert.equal(startPiston("p2", O, 1, ps), 0);
  assert.equal(startPiston("p3", H, 0, DEFAULT_PISTONS[H]), 2);
  assert.equal(startPiston("none", O, 0, ps), 1);
  setColours(null);
  assert.equal(startPiston("p1", O, 0, ps), 1, "no plans: II");
});

test("D420: kept per piece and sound with the registration; old records read (as the defaults), TUTTI kept beside", () => {
  store.clear();
  // An old record (D322/D357): stops and TUTTI only.
  store.set(REG_KEY, JSON.stringify({ wtc1f01: { [O]: { stops: ["flute", "reed"], tutti: true } } }));
  assert.deepEqual(loadPistons("wtc1f01", O), defaultPistons(O));
  assert.deepEqual(loadRegistration("wtc1f01", O), { stops: ["flute", "reed"], tutti: true });
  const mine: Pistons = [["flute", "reed"], ["principal"], ["principal", "reed", "mixture", "sub16"]];
  savePistons("wtc1f01", O, mine);
  assert.deepEqual(loadPistons("wtc1f01", O), mine);
  assert.deepEqual(loadRegistration("wtc1f01", O), { stops: ["flute", "reed"], tutti: true }, "the old fields untouched");
  // TUTTI saved later keeps the pistons.
  saveRegistration("wtc1f01", O, { stops: null, tutti: false });
  assert.deepEqual(loadPistons("wtc1f01", O), mine);
  // Back to the defaults with nothing else: the record goes.
  savePistons("wtc1f01", O, defaultPistons(O));
  assert.equal(JSON.parse(store.get(REG_KEY)!).wtc1f01, undefined);
  // Not understood: the defaults; another sound's own.
  store.set(REG_KEY, JSON.stringify({ x: { [O]: { stops: null, tutti: false, pistons: "no" }, [H]: { stops: null, tutti: false, pistons: [["lute", "flute"], 3, ["four"]] } } }));
  assert.deepEqual(loadPistons("x", O), defaultPistons(O));
  assert.deepEqual(loadPistons("x", H), [["lute"], [], ["four"]]);
  store.clear();
});

test("D420: a piston's press kept for the run (the piston and each stop it moved): the challenges' cues still met", () => {
  clearStopChanges();
  const a: Registration = { stops: ["principal"], tutti: false };
  const b: Registration = { stops: ["principal", "mixture"], tutti: false };
  const c: Registration = { stops: ["flute"], tutti: false };
  for (const x of pistonChanges(20, 2, a, b)) recordStopChange(x);
  for (const x of pistonChanges(31, 0, b, c)) recordStopChange(x);
  assert.deepEqual(
    stopChanges().map((x) => `${x.bar}:${x.stop}:${x.drawn}`),
    ["20:III:true", "20:mixture:true", "31:I:true", "31:flute:true", "31:principal:false", "31:mixture:false"],
  );
  assert.ok(cueMet({ bar: 20, stop: "III", drawn: true }));
  assert.ok(cueMet({ bar: 22, stop: "mixture", drawn: true, early: 2 }));
  assert.ok(cueMet({ bar: 31, stop: "mixture", drawn: false }));
  assert.ok(!cueMet({ bar: 25, stop: "I", drawn: true }));
  clearStopChanges();
});

test("D420: a held organ note and a new registration (pure): ranks drawn and withdrawn, whether its sound changes", () => {
  const man = PATCHES.orgPrincipal;
  const II = pistonRegistration(O, DEFAULT_PISTONS[O][1], man, false);
  const III = pistonRegistration(O, DEFAULT_PISTONS[O][2], man, false);
  const I = pistonRegistration(O, DEFAULT_PISTONS[O][0], man, false);
  assert.deepEqual(heldChange(O, II, III, man, true, 64), { added: ["mixture"], withdrawn: [], retake: true });
  assert.deepEqual(heldChange(O, III, I, man, true, 64), { added: ["flute"], withdrawn: ["principal", "mixture"], retake: true });
  assert.deepEqual(heldChange(O, DEFAULT_REG, II, man, true, 64), { added: [], withdrawn: [], retake: false }, "the same sound: nothing done");
  assert.deepEqual(heldChange(O, II, { stops: ["principal", "trem"], tutti: false }, man, true, 64), { added: ["trem"], withdrawn: [], retake: true });
  // The band without TUTTI: untouched; with it, the whole organ.
  assert.equal(heldChange(O, II, III, man, false, 64), null);
  assert.equal(heldChange(O, { ...II, tutti: true }, { ...III, tutti: true }, man, false, 64)?.retake, true);
  // The harpsichord's string is plucked: nothing to change; nor another sound.
  assert.equal(heldChange(H, DEFAULT_REG, { stops: ["unison", "four"], tutti: false }, PATCHES.harpsiSampled, true, 64), null);
  assert.equal(heldChange("chip", DEFAULT_REG, III, man, true, 64), null);
  assert.equal(organPatch(man, ["principal"], 64), man);
});

/** Every note the chip builds (its time, length, retake) and when each was let go. */
function spy(chip: Chip) {
  const built: { midi: number; at: number; dur: number; p: Play; stopped: number | null }[] = [];
  const c = chip as unknown as { noteNow: (...a: unknown[]) => Sounding };
  const orig = c.noteNow.bind(chip);
  c.noteNow = (midi: unknown, at: unknown, dur: unknown, v: unknown, p: unknown) => {
    const sd = orig(midi, at, dur, v, p);
    const rec = { midi: midi as number, at: at as number, dur: dur as number, p: p as Play, stopped: null as number | null };
    built.push(rec);
    const s0 = sd.stop;
    sd.stop = (t?: number) => ((rec.stopped = t ?? ctxOf().currentTime), s0(t));
    return sd;
  };
  return built;
}

test("D420: on the organ a piston reaches the held note (the old pipes let go, the new ones joined from now); the harpsichord's from the next pluck", () => {
  setPreset(O);
  const II = pistonRegistration(O, DEFAULT_PISTONS[O][1], PATCHES.orgPrincipal, false);
  const I = pistonRegistration(O, DEFAULT_PISTONS[O][0], PATCHES.orgPrincipal, false);
  setLiveRegistration(O, II);
  const chip = new Chip();
  const built = spy(chip);
  const ctx = ctxOf();
  const v = voicing(0, 4, true);
  const held = chip.note(64, 0.1, 3, v, { lead: true });
  const band = chip.note(55, 0.1, 3, voicing(1, 4, true), {});
  held.bend(12);
  assert.equal(built.length, 2);
  ctx.advance(1);
  setLiveRegistration(O, I);
  assert.equal(built.length, 3, "the player's note taken up again; the band's not (no TUTTI)");
  assert.equal(built[0].stopped, 1, "the old pipes let go now");
  assert.equal(built[1].stopped, null);
  assert.deepEqual([built[2].midi, built[2].at, built[2].dur, built[2].p.retake], [64, 1, 2.1, true]);
  // The same sound again: nothing done.
  ctx.advance(1.5);
  setLiveRegistration(O, { stops: ["flute"], tutti: false });
  assert.equal(built.length, 3);
  // Let go: no more.
  held.stop(1.6);
  assert.equal(built[2].stopped, 1.6);
  ctx.advance(1.7);
  setLiveRegistration(O, II);
  assert.equal(built.length, 3);
  // TUTTI: the band's held note too.
  setLiveRegistration(O, { ...II, tutti: true });
  const b2 = chip.note(48, 1.8, 2, voicing(2, 4, true), {});
  void b2;
  ctx.advance(2);
  setLiveRegistration(O, { ...I, tutti: true });
  assert.equal(built.at(-1)!.midi, 48);
  assert.equal(built.at(-1)!.p.retake, true);
  void band;
  setLiveRegistration(O, DEFAULT_REG);

  // The harpsichord: a plucked string keeps its registration; the next pluck takes the new one.
  setPreset(H);
  setLiveRegistration(H, { stops: [], tutti: false });
  const hc = new Chip();
  const hb = spy(hc);
  hc.note(64, ctx.currentTime, 2, voicing(0, 3, true), { lead: true });
  setLiveRegistration(H, { stops: ["unison", "four"], tutti: false });
  assert.equal(hb.length, 1);
  assert.equal(hb[0].stopped, null);
  setLiveRegistration(H, DEFAULT_REG);
  setPreset("chip");
});

test("D420: the pistons act at touch-down (a tap while the other thumb holds a note); a click only from the keyboard", () => {
  assert.equal(actsOn("pointerdown", 0), true);
  assert.equal(actsOn("pointerdown", 0, 2), false, "not a right button");
  assert.equal(actsOn("click", 1), false, "a tap's click: already taken at its pointerdown");
  assert.equal(actsOn("click", 0), true, "Enter or Space");
  const s = src("src/touch/RegistrationStops.tsx");
  assert.match(s, /onPointerDown=\{\(e: ReactPointerEvent\) => \{\s*if \(!actsOn\("pointerdown", 0, e\.button\)\) return;\s*e\.preventDefault\(\);\s*press\(i\);/);
  assert.match(s, /onClick=\{\(e: ReactMouseEvent\) => actsOn\("click", e\.detail\) && press\(i\)\}/);
  // The pop-up holds the single stops; the game's PlayPop shows it for the two instruments.
  assert.match(src("src/bench/BenchApp.tsx"), /<PistonSettings presetId=\{presetById\(soundNow\)\.id\} piece=\{f\.id\} \/>/);
  for (const f of ["src/i18n/pt.ts", "src/i18n/es.ts"]) {
    const d = src(f);
    for (const k of ["PISTONS", "PISTON", "FLUTES", "PRINCIPALS", "PLENUM", "DEFAULTS"]) assert.match(d, new RegExp(`\\n  ${k}: "`), `${f} ${k}`);
  }
});
