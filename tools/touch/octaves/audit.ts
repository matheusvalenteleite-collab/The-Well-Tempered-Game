/**
 * D631, THE OCTAVE AUDIT: every note of every voice of the 48 fugues, on every sound, run through the engine's own pitch
 * decision (chip.ts `soundingPitch`: the compass a patch keeps, then the recorded set's guard) for each instrument that
 * plays the line: the voice's own patch (the sound's line-up for the piece as proto-game.ts sets it: Preset.pieces, ZELENKA
 * TRIO's trioLayout), a doubling (Patch.double), a continuo or stage part (Patch.continuo, stage.ts) and the patches the
 * sound's registrations may play (Preset.also); the player's voice is one of them (the same patch, Play.lead). A note
 * "moved" when it sounds in another octave from the one written (a recording read from another pitch is a retuning, not a
 * move; the reads' largest distance is reported apart). Each fugue is planned as the game plans it (chip.ts soundPlans:
 * a slimmed band's sparse zones change what the guard sees).
 *
 *   node tools/touch/octaves/audit.ts            the table, sound by sound
 *   node tools/touch/octaves/audit.ts salsa -v   one sound, every move listed
 */
import { soundPlans, soundingPitch } from "../../../src/touch/chip.ts";
import { FUGUES, type TouchFugue } from "../../../src/touch/fugue.ts";
import { nameOfMidi, nearestSample, reachOf, sampledMidis, SAMPLED, setFor } from "../../../src/touch/sampled.ts";
import { PATCHES, PRESETS, TRAVERSO, TRIALS, patchFor, patchIdFor, pieceLineUp, preset, presetById, setPieceLayout, setPreset, type Patch } from "../../../src/touch/sound.ts";
import { TRIO_ID, trioLayout } from "../../../src/touch/trio.ts";
import { isPedal, organPatchOf } from "../../../src/touch/registration.ts";
import { BAND_GROWTH, unisonSpans } from "../../../src/touch/band-growth.ts";
import { STOP_FAMILIES } from "../../../src/touch/consort-stops.ts";

export const WTC_FUGUES: readonly TouchFugue[] = FUGUES.filter((f) => /^wtc[12]f\d\d$/.test(f.id));
/** Every sound a player can choose (and the trials and TRAVERSO, which presetById still finds). */
export const AUDIT_SOUNDS: readonly string[] = [...PRESETS, TRAVERSO, ...TRIALS].map((p) => p.id);

export interface Move {
  sound: string;
  piece: string;
  voice: number;
  /** The patch that moved it (its id in PATCHES, or "<id>:double"/":continuo"). */
  patch: string;
  written: number;
  sounding: number;
}
export interface Read {
  piece: string;
  voice: number;
  patch: string;
  written: number;
  /** The recording it is read from, and how far (semitones, signed: + read fast). */
  from: number;
  shift: number;
}
/** A note read past its set's reach before any extension (sampled.ts reachOf without `extend`): one an extension must cover. */
export interface Out {
  piece: string;
  voice: number;
  patch: string;
  written: number;
  /** Semitones past the compass's reach (+ over the top, - under the lowest), and the read's shift from its recording. */
  past: number;
  shift: number;
  /** The recorded instrument (sampled.ts SAMPLED) and how far over its top (+) or under its lowest (-) recording it is read. */
  inst: string;
  beyond: number;
}
export interface SoundAudit {
  sound: string;
  notes: number;
  moves: Move[];
  outs: Out[];
  /** Notes read past even the declared reach (sampled.ts reachOf with `extend`): none, test/d631 holds. */
  undeclared: Out[];
  /** The largest distance from a recording a note is read at (written pitch, after any move). */
  worstRead: Read | null;
  /** D635: every recorded read, one per fugue, voice, patch and pitch (`n` notes): tools/touch/stretch/audit.ts. */
  reads: (Read & { n: number; inst: string })[];
}

const idOf = new Map<Patch, string>(Object.entries(PATCHES).map(([k, v]) => [v as Patch, k]));

/**
 * The instruments that sound a voice's line (or some of its notes), with their names: its patch; its doubling (Patch.double);
 * its continuo or stage parts (Patch.continuo); the registrations' patches (CHAMBER ORGAN's plenum on a manual, its pedal's
 * on the pedal: registration.ts); STRING CONSORT's stops (consort-stops.ts: the same family's spiccato and pizzicato);
 * BACH BRASS's episodes' mute (band-growth.ts MuteSpec, the notes within its compass).
 */
function linePatches(sound: string, pt: Patch, line: readonly number[], bass: boolean): [string, Patch, readonly number[]][] {
  const id = idOf.get(pt) ?? "?";
  const out: [string, Patch, readonly number[]][] = [[id, pt, line]];
  if (pt.double) out.push([`${id}:double(${idOf.get(pt.double.patch) ?? "?"})`, pt.double.patch, line]);
  // A continuo part (no `from`) on the bass alone (trio.ts ContinuoScript.at); a stage part (`from`, stage.ts) on any line.
  for (const c of pt.continuo ?? []) if (c.from !== undefined || bass) out.push([`${id}:${c.from !== undefined ? "stage" : "continuo"}(${c.patch.sample ?? "synth"})`, c.patch, line]);
  if (sound === "chamberOrgan" && organPatchOf(pt)) out.push([`${id}:pleno`, isPedal(pt) ? PATCHES.orgPedalPleno : PATCHES.orgPleno, line]);
  for (const fam of STOP_FAMILIES) if (fam[0] === pt) for (const q of fam.slice(1)) out.push([`${id}:stop(${idOf.get(q) ?? "?"})`, q, line]);
  const mute = BAND_GROWTH[sound]?.mute;
  if (mute && PATCHES[mute.from] === pt) out.push([`${id}:mute`, PATCHES[mute.to], line.filter((m) => m >= mute.compass[0] && m <= mute.compass[1])]);
  return out;
}

/** The recording a pitch is read from on a patch (null: a synthesized patch), as voiceNote finds it. */
function readOf(pt: Patch, midi: number): { from: number; shift: number } | null {
  const inst = pt.sample ? SAMPLED[pt.sample] : null;
  if (!inst) return null;
  const set = setFor(inst, midi);
  const near = nearestSample(set, midi);
  return near === null ? null : { from: near, shift: midi - near };
}

/** One sound over the 48 fugues (or `pieces`). */
export function auditSound(sound: string, pieces: readonly TouchFugue[] = WTC_FUGUES): SoundAudit {
  const was = preset();
  const p = presetById(sound);
  setPreset(p);
  const out: SoundAudit = { sound, notes: 0, moves: [], outs: [], undeclared: [], worstRead: null, reads: [] };
  try {
    for (const f of pieces) {
      const count = f.voices.length;
      const tl = p.id === TRIO_ID ? trioLayout(f) : null;
      setPieceLayout(tl ? { preset: p.id, count: tl.count, slots: tl.slots } : pieceLineUp(p.id, f));
      const all = [...f.voices.flat(), ...(f.bandVoices ?? []).flatMap((b) => b.notes)].map((n) => n[2]);
      // The game's plan for the piece (a slimmed band's sparse zones: sampled.ts setZones).
      soundPlans(all, [], null);
      const bg = BAND_GROWTH[p.id];
      const uni = bg?.unison ? unisonSpans(f, f.voices.map((_, v) => patchIdFor(v, count)), bg.unison) : [];
      for (let v = 0; v < count; v++) {
        const patch = patchFor(v, count);
        if (!patch) continue;
        const line = [...f.voices[v], ...(f.bandVoices ?? []).filter((b) => b.of === v).flatMap((b) => b.notes)].map((n) => n[2]);
        const parts = linePatches(p.id, patch, line, v === count - 1);
        // BACH BRASS's entries' doubles (band-growth.ts unisonSpans: the partner on the entry's notes).
        for (const u of uni.filter((x) => x.voice === v)) parts.push([`unison(${u.patch})`, PATCHES[u.patch], f.voices[v].filter((n) => n[0] >= u.on && n[0] < u.end).map((n) => n[2])]);
        for (const [name, q, notes] of parts) {
          for (const m of new Set(notes)) {
            const s = soundingPitch(q, m);
            const k = notes.filter((x) => x === m).length;
            out.notes += k;
            if (Math.round((s - m) / 12) !== 0) for (let i = 0; i < k; i++) out.moves.push({ sound, piece: f.id, voice: v, patch: name, written: m, sounding: s });
            const r = readOf(q, s);
            const inst = q.sample ? SAMPLED[q.sample] : null;
            if (r && inst) {
              const base = reachOf({ ...inst, extend: undefined }, setFor(inst, s));
              const past = s > base.hi ? s - base.hi : s < base.lo ? s - base.lo : 0;
              const ms = sampledMidis(setFor(inst, s));
              const beyond = s > ms[ms.length - 1] ? s - ms[ms.length - 1] : s < ms[0] ? s - ms[0] : 0;
              if (past) for (let i = 0; i < k; i++) out.outs.push({ piece: f.id, voice: v, patch: name, written: m, past, shift: r.shift, inst: q.sample!, beyond });
              const own = reachOf(inst, setFor(inst, s));
              if (s > own.hi || s < own.lo) out.undeclared.push({ piece: f.id, voice: v, patch: name, written: m, past, shift: r.shift, inst: q.sample!, beyond });
            }
            if (r && inst) out.reads.push({ piece: f.id, voice: v, patch: name, written: m, ...r, n: k, inst: q.sample! });
            if (r && (!out.worstRead || Math.abs(r.shift) > Math.abs(out.worstRead.shift))) out.worstRead = { piece: f.id, voice: v, patch: name, written: m, ...r };
          }
        }
      }
    }
  } finally {
    setPieceLayout(null);
    setPreset(was);
  }
  return out;
}

/** A summary row: notes moved, the fugues they fall in, the worst (the largest move, then the most notes). */
export function summary(a: SoundAudit) {
  const pieces = new Set(a.moves.map((m) => m.piece));
  let worst: Move | null = null;
  for (const m of a.moves) if (!worst || Math.abs(m.sounding - m.written) > Math.abs(worst.sounding - worst.written)) worst = m;
  // The fugue and voice with the most moved notes.
  const by = new Map<string, number>();
  for (const m of a.moves) by.set(`${m.piece} v${m.voice} ${m.patch}`, (by.get(`${m.piece} v${m.voice} ${m.patch}`) ?? 0) + 1);
  const most = [...by].sort((x, y) => y[1] - x[1])[0];
  return { sound: a.sound, notes: a.notes, moved: a.moves.length, fugues: pieces.size, worst, most, worstRead: a.worstRead };
}

/** D631: the extension each recorded instrument needs over the 48 on every sound (semitones past its top and its lowest recording). */
export function extensions(sounds: readonly string[] = AUDIT_SOUNDS): Record<string, { up: number; down: number; where: string[] }> {
  const out: Record<string, { up: number; down: number; where: string[] }> = {};
  for (const id of sounds)
    for (const o of auditSound(id).outs) {
      const e = (out[o.inst] ??= { up: 0, down: 0, where: [] });
      const w = `${id} ${o.piece} v${o.voice} ${nameOfMidi(o.written)}`;
      if (o.beyond > e.up) (e.up = o.beyond), e.where.unshift(w);
      if (-o.beyond > e.down) (e.down = -o.beyond), e.where.unshift(w);
    }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes("-x")) {
  for (const [inst, e] of Object.entries(extensions())) console.log(`${inst.padEnd(16)} up ${e.up} down ${e.down}   (${e.where.slice(0, 2).join("; ")})`);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2] && !process.argv[2].startsWith("-") ? [process.argv[2]] : AUDIT_SOUNDS;
  const verbose = process.argv.includes("-v");
  console.log("sound                 notes  moved fugues  worst move                                   most moved (piece voice patch: notes)      largest read");
  for (const id of only) {
    const a = auditSound(id);
    const s = summary(a);
    const w = s.worst ? `${s.worst.piece} v${s.worst.voice} ${s.worst.patch} ${nameOfMidi(s.worst.written)}→${nameOfMidi(s.worst.sounding)} (${s.worst.sounding - s.worst.written})` : "-";
    const r = s.worstRead ? `${s.worstRead.shift > 0 ? "+" : ""}${s.worstRead.shift} (${s.worstRead.piece} v${s.worstRead.voice} ${s.worstRead.patch} ${nameOfMidi(s.worstRead.written)} from ${nameOfMidi(s.worstRead.from)})` : "-";
    console.log(`${id.padEnd(20)} ${String(s.notes).padStart(6)} ${String(s.moved).padStart(6)} ${String(s.fugues).padStart(6)}  ${w.padEnd(44)} ${(s.most ? `${s.most[0]}: ${s.most[1]}` : "-").padEnd(42)} ${r}`);
    if (verbose) {
      const g = new Map<string, number>();
      for (const m of a.moves) {
        const k = `${m.piece} v${m.voice} ${m.patch} ${nameOfMidi(m.written)}(${m.written})→${nameOfMidi(m.sounding)}`;
        g.set(k, (g.get(k) ?? 0) + 1);
      }
      for (const [k, n] of g) console.log(`   ${k} ×${n}`);
    }
    if (process.argv.includes("-o") && a.outs.length) {
      // The notes past the base reach, by fugue, voice and patch: how many, the furthest, the largest read.
      const g = new Map<string, { n: number; past: number; shift: number; lo: number; hi: number }>();
      for (const o of a.outs) {
        const k = `${o.piece} v${o.voice} ${o.patch}`;
        const e = g.get(k) ?? { n: 0, past: 0, shift: 0, lo: 999, hi: -999 };
        e.n++;
        if (Math.abs(o.past) > Math.abs(e.past)) e.past = o.past;
        if (Math.abs(o.shift) > Math.abs(e.shift)) e.shift = o.shift;
        e.lo = Math.min(e.lo, o.written);
        e.hi = Math.max(e.hi, o.written);
        g.set(k, e);
      }
      for (const [k, e] of g) console.log(`   OUT ${k}: ${e.n} notes ${nameOfMidi(e.lo)}-${nameOfMidi(e.hi)}, past the reach by ${e.past}, read ${e.shift > 0 ? "+" : ""}${e.shift}`);
    }
  }
}
