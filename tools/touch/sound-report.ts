/**
 * D497: THE INSTRUMENTS REPORT's facts, read from the game's code (nothing typed by hand but the labels): every sound
 * offered and how it plays, and for each of the 48 fugues its own sound and why, its voices' instruments, its form,
 * what changes in the sound during a run (D513's zones, the climax, Busoni, the colour plan, the subject's effect, the
 * balance), its three drummers and what they do at the seams, and the stage's climax (D475) beside them.
 *   node tools/touch/sound-report.ts      → docs/sound/REPORT.json
 * The report's page (an artifact) is built from that file; the Sound Lab (soundlab.html) plays every moment it names.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { barAt, beatOf, cadenceName, fugueById, keyAt, type TouchFugue } from "../../src/touch/fugue.ts";
import { formOf as pointsOf, phaseAt } from "../../src/touch/form-points.ts";
import { ARC_FROM_DB, CLIMAX_DB, CLIMAX_ROOM, CLIMAX_TONE, EPISODE_DB, EPISODE_TONE, FORM_REG, MIN_EPISODES, MIN_EPISODE_SHARE, RESOLVE_ROOM, SUBJECT_DB, SUBJECT_TONE, climaxRamp, formOf as soundFormOf } from "../../src/touch/fugue-form.ts";
import { ARC_VEL, BRUSH_BEAT_S, CLIMAX_PATTERN_AT, CLIMAX_VEL, DANCE_BEAT_S, EPISODE_VEL, RESOLVE_FALL, ROCK_BEAT_S, ROLL_QUICK_S, STYLE_NAMES, breaksBefore, brushFills, drumPresetsFor, firstCharacter, stylesFor, timpaniPitches, timpaniTuned } from "../../src/touch/drum-presets.ts";
import { DRUM_SCRIPTS } from "../../src/touch/jazz-drums.ts";
import { momentsAsBars } from "../../src/touch/rock-drums.ts";
import { PIECE_SOUND } from "../../src/touch/piece-sound.ts";
import { DYNAMIC_SOUNDS, PATCHES, PRESETS, REGISTER_SOUNDS, RETIRED, TONE_SOUNDS, TRIALS, busoniReaches, creditFor, presetById, STEPPED_SOUNDS, type Preset } from "../../src/touch/sound.ts";
import { STOPS } from "../../src/touch/registration.ts";
import { hasConsortStops, CONSORT_STOPS } from "../../src/touch/consort-stops.ts";
import { exprFamily, keyboardSlide, touchFamily } from "../../src/bench/glenn.ts";
import { dragFamily } from "../../src/bench/drag.ts";
import { touchKind } from "../../src/touch/touch-expr.ts";
import { styleOf } from "../../src/touch/phrasing.ts";
import { SLIDE_SOUND, slideFamily, slideSoundFor } from "../../src/bench/slide-sound.ts";
import { wholeReadingOf } from "../../src/touch/readings.ts";
import { BUSONI_LEADS_MIN, busoniLeads } from "../../src/touch/colour.ts";
import { tempoOf } from "../../src/touch/tempi.ts";
import { stepTempi } from "../../src/bench/tempo-steps.ts";
import { BAND_ENTRY_DB, PLAYER_ENTRY_DB, bandTrimDb, balanceOf, liftDb, playerToneDb } from "../../src/touch/player-lift.ts";
import { OWN_LOUD } from "../../src/touch/player-lift-data.ts";
import { TRIO_ID, continuoMoments, trioLayout } from "../../src/touch/trio.ts";
import { GENERIC, TAILORED, SYNTH_LAYERS, SYNTH_LAYERS_SOUND, LAB_DEFAULT } from "../../src/touch/subject-fx.ts";
import { FUGUE_NAMES } from "../../src/touch/fugue-names.ts";
import { VERSION } from "../../src/bench/version.ts";
import { COLOURS } from "./colour-plans/index.ts";
import { FUGUES, bachVoice } from "../../src/bench/soundlab/lab-engine.ts";
import { defaults } from "../../src/bench/soundlab/lab-state.ts";
import { patchName, seatsOf, voiceName } from "../../src/bench/soundlab/facts.ts";

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const db = (g: number) => r1(20 * Math.log10(Math.max(1e-6, g)));

/** The stage's scripts (D475), read from stage-bg.ts's own comments: one line for each fugue. */
function stageLines(): Record<string, string> {
  const src = readFileSync(new URL("../../src/touch/stage-bg.ts", import.meta.url), "utf8");
  const out: Record<string, string> = {};
  const re = /\/\/ ([^\n]+)\n\s+(wtc[12]f\d\d): /g;
  for (let m = re.exec(src); m; m = re.exec(src)) out[m[2]] = m[1].trim();
  return out;
}

/** The fugues each sound opens (the 48's defaults). */
function usage(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of FUGUES) (out[PIECE_SOUND[id]] ??= []).push(id);
  return out;
}

function presetFacts(p: Preset, used: Record<string, string[]>, trial: boolean) {
  const layouts: Record<string, { voice: number; patch: string; name: string; pan: number; level: number; sample: string | null }[]> = {};
  for (const n of [2, 3, 4, 5]) {
    const fake = { voices: Array.from({ length: n }, () => []) } as unknown as TouchFugue;
    layouts[n] = seatsOf(p.id, fake).map((s) => ({ ...s, sample: (PATCHES as Record<string, { sample?: string }>)[s.patch]?.sample ?? null }));
  }
  const patches = [...new Set(Object.values(layouts).flatMap((l) => l.map((x) => x.patch)))];
  const slideFams = [...new Set(patches.map((pid) => slideFamily(p.id, (PATCHES as Record<string, never>)[pid] ?? null)))];
  const busoni = p.id === "pianoSampled" ? "level (the piano's own dynamics), always" : DYNAMIC_SOUNDS.has(p.id) ? "level, hairpins and palette (EXPRESSIVE_ALL: dynamic sounds)" : STEPPED_SOUNDS.has(p.id) ? "the chip's 4-bit volume steps and duty cycle (D432)" : TONE_SOUNDS.has(p.id) ? "tone: brightness through the touch's parameters, a quarter of the level within ±2 dB" : REGISTER_SOUNDS.has(p.id) ? "registration terraces by printed level, a ±2 dB shelf for hairpins" : "none";
  const fugues = used[p.id] ?? [];
  return {
    id: p.id,
    name: p.name,
    offered: !trial,
    trial,
    fx: p.fx ?? null,
    room: p.room ?? 0.16,
    gain: p.gain ?? 1,
    phoneGain: p.phoneGain ?? 1,
    ownDrums: p.groove ? { groove: p.groove, kit: p.kit ?? null } : null,
    loopDrums: p.drums ?? null,
    layouts,
    patches: patches.map((x) => ({ id: x, name: patchName(x) })),
    touch: { expr: exprFamily(p.id), touchKind: touchKind(p.id), touchFamily: touchFamily(p.id), phrasing: styleOf(p.id), drag: dragFamily(p.id), keyboardSlide: keyboardSlide(p.id) },
    slide: { families: slideFams, mode: slideSoundFor(p.id), setting: SLIDE_SOUND },
    busoni: { reaches: busoniReaches(p.id), how: busoni },
    stops: STOPS[p.id] ?? null,
    consortStops: hasConsortStops(p.id) ? CONSORT_STOPS : null,
    formReg: FORM_REG[p.id] ?? null,
    credit: creditFor(p.id),
    defaultFor: fugues,
    drumFirst: fugues.length ? firstCharacter(fugues[0]) : null,
  };
}

/** The ticks where the drums roll in (into a subject zone after an episode, into the final entry) and out (into an episode). */
function landingsOf(f: TouchFugue) {
  const form = soundFormOf(f);
  const into = new Set<number>();
  const out: number[] = [];
  if (form.clear)
    form.zones.forEach((z, i) => {
      if (i === 0 || z.from >= form.climax) return;
      if (z.kind === "subject") into.add(z.from);
      else out.push(z.from);
    });
  if (form.finalEntry > 0 && form.finalEntry < form.lastBar) into.add(form.finalEntry);
  return { into: [...into].sort((a, b) => a - b), out };
}

function fugueFacts(id: string, stage: Record<string, string>) {
  const f = fugueById(id);
  const n = f.voices.length;
  const sound = PIECE_SOUND[id];
  const col = COLOURS[id];
  const bar = (t: number) => barAt(f, Math.max(0, Math.min(f.length - 1, t)));
  const b = beatOf(f);
  const bpm = tempoOf(id);
  const beatS = (b.ticks / f.tpq) * (60 / bpm);
  const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  const pts = pointsOf(f);
  const sf = soundFormOf(f);
  const bach = bachVoice(f, defaults(id));
  const reading = wholeReadingOf(id)?.whole ?? null;
  const leads = busoniLeads(reading, busoniReaches(sound));
  const plan = col?.plans[sound] ?? [];
  const bal = balanceOf(id, sound, n);
  const own = OWN_LOUD[id];
  const lb = landingsOf(f);
  const rollBeats = beatS < ROLL_QUICK_S ? 2 : 1;
  const breakBar = breaksBefore(sf) ? bar(sf.finalEntry - rollBeats * b.ticks - f.barTicks) : null;
  // Where the climax's busier pattern begins (its build past CLIMAX_PATTERN_AT).
  let busyAt: number | null = null;
  for (let t = sf.climax; t < f.length; t += b.ticks) if (climaxRamp(sf, t) >= CLIMAX_PATTERN_AT) {
    busyAt = t;
    break;
  }
  // The timpani away from the home key: the share of bars the bass drum stands in.
  const bars = f.bars.map((x) => x.on);
  const away = bars.filter((t) => !timpaniTuned(f.key, keyAt(f, t))).length;
  const styles = stylesFor(id);
  const presets = drumPresetsFor(id).map((p, i) => ({ n: i + 1, id: p.id, name: p.name, style: p.style }));
  const fx = TAILORED[id];
  const fxOf = (x: typeof GENERIC) => ({ name: x.name, why: x.why, room: x.room, layers: x.layers.map((l) => ({ kind: l.kind, heard: SYNTH_LAYERS_SOUND || !SYNTH_LAYERS.has(l.kind) })) });
  const seats = seatsOf(sound, f);
  const sumDur = (v: number) => f.voices[v].reduce((a, x) => a + x[1], 0);
  return {
    id,
    tag: `${f.book === 1 ? "I" : "II"}/${f.number}`,
    book: f.book,
    number: f.number,
    name: FUGUE_NAMES[id]?.en.full ?? id,
    title: f.title,
    key: f.key,
    meter: f.meter,
    voices: n,
    bars: f.bars[f.bars.length - 1]?.n ?? 0,
    tempo: { bpm, steps: stepTempi(id), beatS: r2(beatS), perBar: b.perBar, compound },
    sound: { id: sound, name: presetById(sound).name, why: col?.soundWhy ?? null, character: col?.character ?? null, otherPlans: col ? Object.keys(col.plans).filter((x) => x !== sound && (col.plans[x]?.length ?? 0) > 0) : [] },
    bachVoice: bach,
    seats: seats.map((s) => ({
      ...s,
      voiceName: voiceName(s.voice, n),
      trimDb: r1(bandTrimDb(id, sound, s.voice, n)),
      playerLiftDb: r1(liftDb(id, sound, s.voice, n)),
      playerToneDb: r1(playerToneDb(id, sound, s.voice, n)),
      notes: f.voices[s.voice].length,
      lo: Math.min(...f.voices[s.voice].map((x) => x[2])),
      hi: Math.max(...f.voices[s.voice].map((x) => x[2])),
      busy: r2(f.voices[s.voice].length / Math.max(1, sumDur(s.voice) / f.tpq)),
    })),
    balance: { measured: !!(own && own.s === sound), t: bal?.t.map(r1) ?? null },
    trio: sound === TRIO_ID ? { alt: trioLayout(f).alt, continuo: continuoMoments(f).map(([bar_, io, why]) => ({ bar: bar_, io, why })) } : null,
    form: {
      seams: pts.seams.map((s) => ({ kind: s.kind, from: bar(s.on), to: bar(Math.max(s.on, s.end - 1)), act: s.act + 1, stretto: !!s.stretto })),
      acts: pts.acts,
      actOn: pts.actOn.map(bar),
      climax: { rise: bar(pts.climax.rise), peak: bar(pts.climax.peak), arrival: bar(pts.climax.arrival) },
      pedals: pts.pedals.map((p) => ({ from: bar(p.on), to: bar(p.end - 1) })),
      last: bar(pts.last),
      cadences: f.cadences.map((c) => ({ bar: c.bar, name: cadenceName(c) })),
      entries: f.entries.length,
      climaxOverPedal: pts.pedals.some((p) => p.on < pts.climax.arrival && p.end > pts.climax.rise),
    },
    zones: {
      clear: sf.clear,
      episodes: sf.episodes,
      episodeShare: r2(sf.episodeShare),
      list: sf.zones.map((z) => ({ kind: z.kind, from: bar(z.from), to: bar(Math.max(z.from, z.to - 1)) })),
      climaxFrom: bar(sf.climax),
      finalEntry: bar(sf.finalEntry),
      peak: bar(sf.peak),
      arrival: bar(sf.arrival),
      lastBar: bar(sf.lastBar),
      formReg: FORM_REG[sound] ?? null,
    },
    busoni: reading
      ? { has: true, heading: reading.heading, dyn: reading.dyn.length, hairpins: reading.hairpins.length, marks: reading.marks.length, slurs: reading.slurs.length, reaches: busoniReaches(sound), leads: leads, firstDyn: reading.dyn.slice(0, 6).map((d) => ({ bar: bar(d.on), mark: d.mark })) }
      : { has: false, reaches: busoniReaches(sound), leads: false },
    colourPlan: { active: plan.length > 0 && !leads, moments: plan.map((m) => ({ bar: r2(m.bar), c: m.c, why: m.why })), standsAsideForBusoni: plan.length > 0 && leads },
    subjectFx: { tailored: !!fx, s1: fxOf(fx?.[1] ?? GENERIC), s2: fx?.[2] ? fxOf(fx[2]) : null, s3: fx?.[3] ? fxOf(fx[3]) : null, inverted: fx?.inverted ? fxOf(fx.inverted) : null, augmented: fx?.augmented ? fxOf(fx.augmented) : null },
    drums: {
      presets,
      styles,
      rollBeats,
      rollsInto: lb.into.map(bar),
      rollsOut: lb.out.map(bar),
      breakBar,
      flourishBar: bar(sf.lastBar),
      busyFrom: busyAt === null ? null : bar(busyAt),
      timpani: { ...timpaniPitches(f.key), awayBars: away, ofBars: bars.length },
      brushes: Object.values(styles).includes("brushes") ? brushFills(f, b.ticks, b.perBar).map((x) => ({ kind: x.kind, bar: bar(x.at), why: x.why })) : null,
      jazzScript: DRUM_SCRIPTS[id] ? DRUM_SCRIPTS[id].map((m) => ({ bar: m.bar, kind: m.kind, why: m.why })) : null,
      ownKit: presetById(sound).groove ? { groove: presetById(sound).groove!, moments: presetById(sound).kit === "rock" ? momentsAsBars(f, b.ticks, sound === "krautrock" ? "motorik" : "abbey").map((m) => ({ bar: m.bar, kind: m.kind, why: m.why })) : null } : null,
    },
    stage: stage[id] ?? null,
  };
}

export function buildReport() {
  const used = usage();
  const stage = stageLines();
  return {
    generated: new Date().toISOString().slice(0, 10),
    version: VERSION,
    constants: {
      form: { SUBJECT_DB, EPISODE_DB, CLIMAX_DB, ARC_FROM_DB, SUBJECT_TONE, EPISODE_TONE, CLIMAX_TONE, CLIMAX_ROOM, RESOLVE_ROOM, MIN_EPISODES, MIN_EPISODE_SHARE },
      drums: { EPISODE_VEL, CLIMAX_VEL, ARC_VEL, CLIMAX_PATTERN_AT, RESOLVE_FALL, BRUSH_BEAT_S, ROCK_BEAT_S, DANCE_BEAT_S, ROLL_QUICK_S, STYLE_NAMES },
      balance: { PLAYER_ENTRY_DB, BAND_ENTRY_DB },
      busoni: { BUSONI_LEADS_MIN },
      subjectFx: { LAB_DEFAULT, SYNTH_LAYERS_SOUND },
      slideSound: SLIDE_SOUND,
    },
    presets: [...PRESETS.map((p) => presetFacts(p, used, false)), ...TRIALS.map((p) => presetFacts(p, used, true))],
    retired: Object.entries(RETIRED).map(([from, to]) => ({ from, to })),
    fugues: FUGUES.map((id) => fugueFacts(id, stage)),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = buildReport();
  mkdirSync(new URL("../../docs/sound/", import.meta.url), { recursive: true });
  writeFileSync(new URL("../../docs/sound/REPORT.json", import.meta.url), JSON.stringify(r, null, 1) + "\n");
  console.log(`docs/sound/REPORT.json: ${r.presets.length} sounds, ${r.fugues.length} fugues (${VERSION})`);
}
export { db };
