/**
 * D632, THE SEATS BY RANGE: for each sound whose voices were folded an octave (D631's audit, before), each of the 48 fugues
 * and each voice, the band's instrument whose recorded compass covers the voice's written line in that fugue, as a piece's
 * own line-up (Preset.pieces, written to src/touch/octave-seats.ts):
 *   1. the voice's own instrument where it covers the line (compass ± its maxShift, else ± MAX_SHIFT_ANY);
 *   2. else the first of the band's NEAR substitutes (SUBS: the band's own instruments of the same role, in order) that covers it
 *      (within NEAR_TOL semitones: a brass voice kept brass for one note a semitone past the trumpet's reach);
 *   3. else, where the own instrument misses by more than TOL semitones, the near or FAR substitute that misses least;
 *   4. else the own instrument, its set extended to the line (sampled.ts `extend`: the nearest recording retuned).
 * The bass keeps its instrument (the phone's bass, the band's foundation): its set extended where it must be. The seat's pan
 * and level stay (the mix as it was); only the instrument changes.
 *
 *   node tools/touch/octaves/seats.ts          writes src/touch/octave-seats.ts and lists every swap
 */
import { writeFileSync } from "node:fs";
import { soundPlans } from "../../../src/touch/chip.ts";
import { nameOfMidi, sampledMidis, SAMPLED, setFor, MAX_SHIFT_ANY } from "../../../src/touch/sampled.ts";
import { OWN_PIECES, PATCHES, presetById, setPieceLayout, setPreset, type PatchId } from "../../../src/touch/sound.ts";
import { TRIO_ID, trioLayout } from "../../../src/touch/trio.ts";
import { WTC_FUGUES } from "./audit.ts";

type Slot = readonly [PatchId, number, number?];
/** Semitones past the reach a near substitute may miss by and still take the seat (its set extended that far: II/10's C3 on the trumpet, E3's recording read 4 down). */
export const NEAR_TOL = 1;
/** Semitones past the reach the own instrument may miss by before a far substitute is weighed. */
export const TOL = 3;

/** The substitutes by sound: for an instrument, the NEAR ones (taken where they cover) and the FAR (where the own misses by more than TOL). */
export const SUBS: Readonly<Record<string, Partial<Record<PatchId, { near: readonly PatchId[]; far?: readonly PatchId[] }>>>> = {
  // SALSA: the brass front line and the tres trade seats; the baby bass keeps the bass.
  salsa: { s2Trombone: { near: ["s2Trumpet", "s2Tres"] }, s2Trumpet: { near: ["s2Trombone", "s2Tres"] }, s2Tres: { near: ["s2Trumpet", "s2Trombone"] } },
  abbeyRoad: { a2Guitar: { near: ["a2Trumpet"] }, a2Trumpet: { near: ["a2Guitar"] } },
  petSounds: { psHorn: { near: ["p3Twelve"] }, p3Twelve: { near: ["psHorn"] } },
  baroqueBand: { bandOboe: { near: ["bandViola"] }, bandViolin: { near: ["bandViola"] }, bandViola: { near: ["bandViolin", "bandOboe"] } },
  oboeTrio: { trioOboe1: { near: ["trioOboe2"], far: ["trioHarpsi"] }, trioOboe2: { near: ["trioBassoon"] }, trioBassoon: { near: ["trioOboe2"] } },
  bachBrass: { bachHorn: { near: ["bachTrumpet"] }, bachTrombone: { near: ["bachHorn", "bachTrumpet"] }, bachTrumpet: { near: ["bachHorn", "bachTrombone"] }, bachTrumpetMute: { near: ["bachTrumpet"] } },
  // JAZZ QUARTET: the vibraphone stays the lead (traded only, never replaced: the band's one voice of its own).
  jazzQuartet: {},
  chorinho: { c2Flute: { near: ["c2Clarinet", "c2Bandolim"] }, c2Clarinet: { near: ["c2Flute", "c2Bandolim"] }, c2Bandolim: { near: ["c2Cavaco"] } },
  bossaNova: { b2Flute: { near: ["b2Sax", "b2Guitar"] }, b2Sax: { near: ["b2Flute", "b2Guitar"] } },
  vaudeville: { vdXylo: { near: [], far: ["vdClarinet"] }, vdClarinet: { near: ["vdBassoon"] } },
  fluteHarp: { seaFlute: { near: ["seaViola"], far: ["seaHarp"] }, seaViola: { near: ["seaHarp"] } },
  orchestraOrgan: { orViolin1: { near: ["orViola"] }, orViolin2: { near: ["orViola"] }, orViola: { near: ["orCello", "orViolin2"] } },
  stringConsort: { consViolin: { near: ["consViola"] }, consViola: { near: ["consCello", "consViolin"] } },
  trialWinds: { trialOboe: { near: ["trialClarinet"] }, trialFlute: { near: ["trialOboe", "trialClarinet"] }, trialClarinet: { near: ["trialOboe", "trialHorn", "trialBassoon"] } },
};

/** How far a line leaves a patch's base reach (0: it covers; + over the top, - under the lowest; the larger side). */
export function excess(id: PatchId, line: readonly number[]): number {
  const pt = PATCHES[id];
  const inst = pt.sample ? SAMPLED[pt.sample] : null;
  if (!inst || !line.length) return 0;
  const lim = inst.maxShift ?? MAX_SHIFT_ANY;
  let up = 0;
  let down = 0;
  for (const m of new Set(line)) {
    const ms = sampledMidis(setFor(inst, m));
    if (!ms.length) continue;
    up = Math.max(up, m - (ms[ms.length - 1] + lim));
    down = Math.max(down, ms[0] - lim - m);
  }
  return up >= down ? up : -down;
}

function permutations(xs: readonly number[]): number[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
}

export function seatsFor(sound: string) {
  const p = presetById(sound);
  setPreset(p);
  const out: Record<string, Record<number, Slot[]>> = {};
  const log: string[] = [];
  const subs = SUBS[sound] ?? {};
  for (const f of WTC_FUGUES) {
    const count = f.voices.length;
    const own = OWN_PIECES[sound]?.[f.id]?.[count];
    const base: readonly Slot[] | undefined = own ?? (sound === TRIO_ID ? trioLayout(f, false).slots : p.by?.[count]);
    if (!base) continue;
    setPieceLayout({ preset: sound, count, slots: base, only: true });
    // The game's plan for the piece with this line-up (a slimmed band's sparse zones).
    soundPlans(f.voices.flat().map((n) => n[2]), [], null);
    const lines = f.voices.map((vs, v) => [...vs, ...(f.bandVoices ?? []).filter((b) => b.of === v).flatMap((b) => b.notes)].map((n) => n[2]));
    const seatOf = (v: number) => base[Math.min(v, base.length - 1)];
    // First the line-up's own instruments traded among the upper voices (the bass keeps its seat): the order that leaves
    // fewest voices uncovered, then the least missed, then the fewest moved (the line-up itself where it covers).
    const upper = [...Array(count - 1).keys()];
    let order = upper;
    let best = [Infinity, Infinity, Infinity];
    for (const perm of permutations(upper)) {
      const ex = perm.map((from, v) => excess(seatOf(from)[0], lines[v]));
      const key = [ex.filter((e) => e !== 0).length, ex.reduce((a, e) => a + Math.abs(e), 0), perm.filter((from, v) => seatOf(from)[0] !== seatOf(v)[0]).length];
      if (key[0] < best[0] || (key[0] === best[0] && (key[1] < best[1] || (key[1] === best[1] && key[2] < best[2])))) (best = key), (order = perm);
    }
    const slots: Slot[] = [];
    let changed = false;
    for (let v = 0; v < count; v++) {
      const seat = seatOf(v);
      const line = lines[v];
      const traded = v < count - 1 ? seatOf(order[v])[0] : seat[0];
      const mine = excess(traded, line);
      const s = subs[traded];
      let pick: PatchId = traded;
      if (mine !== 0 && s && v < count - 1) {
        const near = s.near.find((c) => Math.abs(excess(c, line)) <= NEAR_TOL && Math.abs(excess(c, line)) < Math.abs(mine));
        if (near) pick = near;
        else if (Math.abs(mine) > TOL) {
          let least = Math.abs(mine);
          for (const c of [...s.near, ...(s.far ?? [])]) if (Math.abs(excess(c, line)) < least) (least = Math.abs(excess(c, line))), (pick = c);
        }
      }
      if (pick !== seat[0]) {
        changed = true;
        const lo = Math.min(...line);
        const hi = Math.max(...line);
        log.push(`${sound} ${f.id} v${v} (${nameOfMidi(lo)}-${nameOfMidi(hi)}): ${seat[0]} (misses by ${excess(seat[0], line)}) → ${pick} (${excess(pick, line)})${traded !== seat[0] && pick === traded ? " (traded)" : ""}`);
      }
      slots.push(seat.length > 2 ? [pick, seat[1], seat[2]] : [pick, seat[1]]);
    }
    if (changed) out[f.id] = { [count]: slots };
  }
  setPieceLayout(null);
  return { seats: out, log };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all: Record<string, Record<string, Record<number, Slot[]>>> = {};
  const lines: string[] = [];
  for (const sound of Object.keys(SUBS)) {
    const { seats, log } = seatsFor(sound);
    if (Object.keys(seats).length) all[sound] = seats;
    lines.push(...log);
  }
  for (const l of lines) console.log(l);
  console.log(`${lines.length} seats changed`);
  const body = Object.entries(all)
    .map(([s, fs]) => `  ${s}: {\n${Object.entries(fs).map(([f, c]) => `    ${f}: { ${Object.entries(c).map(([n, sl]) => `${n}: [${sl.map((x) => `[${x.map((y) => JSON.stringify(y)).join(", ")}]`).join(", ")}]`).join(", ")} },`).join("\n")}\n  },`)
    .join("\n");
  writeFileSync(
    new URL("../../../src/touch/octave-seats.ts", import.meta.url),
    `/**
 * D632, generated by tools/touch/octaves/seats.ts (do not edit by hand: change SUBS there and run it): each sound's per-fugue
 * line-ups where a voice's own instrument does not cover its written line in that fugue (the owner: "no note may sound in a
 * different octave from the one written"; D631: no fold, so the instrument is chosen by the line's range). Merged into
 * Preset.pieces (sound.ts), each as that piece's own line-up (D578): the seat's pan and level kept, its instrument the band's.
 */
import type { PatchId } from "./sound.ts";

type Slot = readonly [PatchId, number, number?];
export const OCTAVE_SEATS: Readonly<Record<string, Readonly<Record<string, Partial<Record<number, readonly Slot[]>>>>>> = {
${body}
};
`,
  );
}
