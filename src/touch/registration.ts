/**
 * D322, REGISTRATION (the owner approved the stop buttons, harpsichord and organ first): Bach's
 * harpsichordists and organists did not shape loudness note by note; they changed registration between
 * sections (terraced dynamics). Small instrument-specific toggles in the music box's title bar act on
 * the PLAYER'S voice; a long press applies them to every voice (TUTTI). A change sounds from the next
 * note (each note reads the registration when it starts: no click, nothing cut). Not scored.
 *
 *   HARPSICHORD (SAMPLED): the 8' always speaks (the recorded set). 8'+8' couples a second 8' choir (the
 *   neighbouring key's recording retuned, so another string: a few cents off, plucked a few ms later,
 *   a little brighter); 4' adds the octave above (quieter, brighter); LUTE the buff stop (D311's: the
 *   lowpass and the short ring), on everything that sounds.
 *   PIPE ORGAN: FLUTE (Flöte 8'), PRINCIPAL (8' with its 4'), REED (the Trompete; the Krummhorn where
 *   the voice's own is the Krummhorn), MIXTURE (a 2' and the mixture's ranks, breaking back an octave
 *   in the treble), TREMULANT (the wind shaken: an amplitude and a slight pitch tremolo, 5.6 Hz). The
 *   default is the voice's own D304 registration. The pedal (the bass) keeps its recorded pipes; when
 *   the player has it, 16' adds a Subbass an octave down, and the tremulant. Synthesized ranks only
 *   (the recorded plenum stays withdrawn: no more decoded audio, sampled.ts BUDGET untouched).
 *
 * Several stops drawn together are scaled so the full registration is at most about +4 dB over one
 * stop (measured: DECISIONS D322). Pure numbers and the state here (test/d322-registration.test.ts);
 * chip.ts makes them sound (Chip.note, by `registeredNote`), RegistrationStops.tsx draws the buttons.
 *
 * Later (the component takes them as they come): the piano's UNA CORDA, the voices' SYLLABLE, the
 * chips' WAVE.
 */
import { PATCHES, presetById, slotOf, type Patch } from "./sound.ts";

/** A voice's patch on a preset (for the buttons: which stops a voice shows, and its default), whatever preset plays now. */
export function voicePatch(presetId: string, voice: number, count: number): Patch | null {
  const pr = presetById(presetId);
  const by = pr.by?.[count];
  if (by) return PATCHES[by[Math.min(Math.max(0, voice), by.length - 1)][0]];
  return pr.slots ? PATCHES[pr.slots[slotOf(Math.max(0, voice), count)]] : null;
}

export type StopId = "unison" | "four" | "lute" | "flute" | "principal" | "reed" | "mixture" | "trem" | "sub16";

/** The buttons, by preset (in this order in the title bar). `label` is drawn as is (8′, 4′) or translated (RegistrationStops.tsx). */
export const STOPS: Readonly<Record<string, readonly StopId[]>> = {
  harpsichordSampled: ["unison", "four", "lute"],
  chamberOrgan: ["flute", "principal", "reed", "mixture", "trem", "sub16"],
};
export const hasStops = (presetId: string) => !!STOPS[presetId];

/** The organ's foundation stops (one at least always speaks on a manual). */
export const FOUNDATION: readonly StopId[] = ["flute", "principal", "reed"];

/** The player's registration for a preset: the stops drawn (null: the default), and whether every voice takes it. */
export interface Registration {
  stops: StopId[] | null;
  tutti: boolean;
}
export const DEFAULT_REG: Registration = { stops: null, tutti: false };

// ---- The organ's voices ----

const ORGAN_PATCHES = ["orgFlute", "orgPrincipal", "orgTrompete", "orgKrumm", "orgPedal"] as const;
type OrganPatch = (typeof ORGAN_PATCHES)[number];
/** Which of PIPE ORGAN's patches a voice plays (by identity), or null for any other patch. */
export function organPatchOf(pt: Patch | null | undefined): OrganPatch | null {
  for (const id of ORGAN_PATCHES) if (PATCHES[id] === pt) return id;
  return null;
}
export const isPedal = (pt: Patch | null | undefined) => organPatchOf(pt) === "orgPedal";
const HARPSI = new Set<Patch>([PATCHES.harpsiSampled, PATCHES.harpsiBassSampled]);
export const isHarpsichord = (pt: Patch | null | undefined) => !!pt && HARPSI.has(pt);

/** A voice's own (D304) registration, as stops. The pedal: none drawn (its recorded pipes). */
export function defaultStops(presetId: string, pt: Patch | null | undefined): StopId[] {
  if (presetId !== "chamberOrgan") return [];
  switch (organPatchOf(pt)) {
    case "orgFlute":
      return ["flute"];
    case "orgPrincipal":
      return ["principal"];
    case "orgTrompete":
    case "orgKrumm":
      return ["reed"];
    default:
      return [];
  }
}

/** The buttons shown for the player's voice: the organ's pedal shows 16' and the tremulant; a manual every stop but 16'. */
export function stopsShown(presetId: string, pt: Patch | null | undefined): StopId[] {
  const all = STOPS[presetId] ?? [];
  if (presetId !== "chamberOrgan") return [...all];
  return isPedal(pt) ? ["sub16", "trem"] : all.filter((s) => s !== "sub16");
}

/** The stops drawn for the player's voice now (the default where nothing was chosen). */
export const stopsOf = (presetId: string, reg: Registration, pt: Patch | null | undefined): StopId[] => reg.stops ?? defaultStops(presetId, pt);

/**
 * A button pressed: the stops drawn after it. A manual's last foundation stop cannot be pushed in (the
 * organ never goes silent; MIXTURE alone draws the PRINCIPAL under it).
 */
export function toggle(presetId: string, reg: Registration, pt: Patch | null | undefined, stop: StopId): Registration {
  const now = new Set(stopsOf(presetId, reg, pt));
  if (now.has(stop)) now.delete(stop);
  else now.add(stop);
  if (presetId === "chamberOrgan" && !isPedal(pt)) {
    if (!FOUNDATION.some((s) => now.has(s))) {
      if (stop === "mixture") now.add("principal");
      else return reg;
    }
  }
  const order = STOPS[presetId] ?? [];
  const stops = order.filter((s) => now.has(s));
  const def = defaultStops(presetId, pt);
  // Under TUTTI the stops stay explicit (every voice takes them, the player's default included).
  return { ...reg, stops: !reg.tutti && stops.length === def.length && stops.every((s) => def.includes(s)) ? null : stops };
}

/** A long press: TUTTI on or off. On, the player's stops (the default made explicit) go to every voice; off, back to the player's voice alone. */
export function setTutti(presetId: string, reg: Registration, pt: Patch | null | undefined, on: boolean): Registration {
  if (on) return { stops: stopsOf(presetId, reg, pt), tutti: true };
  const def = defaultStops(presetId, pt);
  const st = reg.stops;
  return { stops: st && st.length === def.length && st.every((s) => def.includes(s)) ? null : st, tutti: false };
}

// ---- What a note plays ----

/** HARPSICHORD: the second 8' (gain, cents off, ms later, a high shelf in dB) and the 4' (gain, shelf). */
export const UNISON = { gain: 0.72, cents: 3, delay: 0.005, shelf: 2 };
export const FOUR = { gain: 0.34, shelf: 1.5 };
/** HARPSICHORD: the LUTE button's lowpass (D311's stop at its start: LUTE_HZ[0]). */
export const LUTE_LP = 2000;

/** ORGAN: a stop's ranks a little off the others' (cents: ranks never quite in tune: slow beats, not a louder unison). */
const RANK_CENTS: Partial<Record<StopId, number>> = { flute: 0, principal: 1.1, reed: -0.9, mixture: 0.7 };
/**
 * ORGAN: the stops drawn together, each scaled so the whole is about +0, +2, +3, +4 dB over one stop.
 * The ranks of one key start together and a cent apart, so their fundamentals add nearly in phase
 * within a note (more than by power): the sum is taken as a p-norm between the two (ORGAN_SUM_P;
 * measured, DECISIONS D322).
 */
export const ORGAN_SUM_DB = [0, 0, 2, 3, 4];
export const ORGAN_SUM_P = 1.25;
/** ORGAN: the mixture against a foundation stop (its share of the sum: a crown, not a stop of its own). */
export const MIXTURE_WEIGHT = 0.55;
/** ORGAN: the tremulant: amplitude depth (0-1), rate (Hz), and its slight pitch wobble (cents). */
export const TREMULANT = { depth: 0.22, rate: 5.6, cents: 5 };
/** ORGAN: the Subbass 16' under the pedal (its level against the pedal's). */
export const SUB16_LEVEL = 0.55;

/** ORGAN: the mixture's ranks: a 2', a 1 1/3' and a 1' (a 2', 2 2/3' and 1 1/3' from c'', broken back an octave). */
export function mixturePatch(midi: number): Patch {
  const k = midi >= 72 ? 1 : 2;
  return {
    osc: [
      { wave: "stopPrincipal", octave: k, gain: 0.6 },
      { wave: "sine", octave: k + Math.log2(1.5), detune: 1.4, gain: 0.32 },
      { wave: "sine", octave: k + 1, detune: -1.2, gain: 0.26 },
    ],
    amp: { a: 0.02, d: 0.05, s: 1, r: 0.09 },
    level: 0.3,
  };
}
/** ORGAN: the Subbass 16' (a stopped pipe an octave down), played as its own note under the pedal's. */
export const SUBBASS: Patch = { osc: [{ wave: "stopGedackt" }], chiff: { level: 0.15, time: 0.03, at: 3 }, amp: { a: 0.04, d: 0.05, s: 1, r: 0.12 }, send: 0.1, hp: 28, level: 0.3 };

const STOP_PATCH = (stop: StopId, own: OrganPatch | null, midi: number): Patch | null =>
  stop === "flute" ? PATCHES.orgFlute : stop === "principal" ? PATCHES.orgPrincipal : stop === "reed" ? (own === "orgKrumm" ? PATCHES.orgKrumm : PATCHES.orgTrompete) : stop === "mixture" ? mixturePatch(midi) : null;

/** ORGAN: a patch with the tremulant: the level shaken about its own (chip.ts takes depth/2 off the mean: given back), a slight pitch wobble with it. */
export const tremulant = (pt: Patch): Patch => ({ ...pt, level: pt.level / (1 - TREMULANT.depth / 2), trem: { depth: TREMULANT.depth, rate: TREMULANT.rate }, vib: { depth: TREMULANT.cents, rate: TREMULANT.rate, delay: 0 } });

const merged = new Map<string, Patch>();
/**
 * ORGAN: one manual note's patch for the stops drawn: the stops' oscillators in one note (one envelope,
 * one chiff: a single key opening several ranks), each scaled by its own level and the sum's share;
 * the voice's own patch itself where the stops are its own (the default bit for bit), with the tremulant
 * where drawn.
 */
export function organPatch(own: Patch, stops: readonly StopId[], midi: number): Patch {
  const id = organPatchOf(own);
  const def = defaultStops("chamberOrgan", own);
  let ranks: StopId[] = stops.filter((s) => s !== "trem" && s !== "sub16");
  if (!ranks.some((s) => FOUNDATION.includes(s))) ranks = [...def, ...ranks];
  const trem = stops.includes("trem");
  const same = ranks.length === def.length && ranks.every((s) => def.includes(s));
  const key = `${id}|${ranks.join(",")}|${trem}|${ranks.includes("mixture") ? (midi >= 72 ? 1 : 2) : 0}`;
  const hit = merged.get(key);
  if (hit) return hit;
  let pt: Patch;
  if (same) pt = own;
  else {
    // The voice's own stop leads where drawn (its envelope, chiff, filter, send), else the first foundation stop; the others' ranks join it.
    const lead = STOP_PATCH(ranks.find((s) => def.includes(s)) ?? ranks.find((s) => FOUNDATION.includes(s))!, id, midi)!;
    const weights = ranks.map((s) => (s === "mixture" ? MIXTURE_WEIGHT : 1));
    const target = 10 ** (ORGAN_SUM_DB[Math.min(4, ranks.length)] / 20);
    const scale = target / weights.reduce((a, w) => a + w ** ORGAN_SUM_P, 0) ** (1 / ORGAN_SUM_P);
    const osc = ranks.flatMap((s, i) => {
      const sp = STOP_PATCH(s, id, midi)!;
      const g = (sp.level / lead.level) * weights[i] * scale;
      return sp.osc.map((o) => ({ ...o, detune: (o.detune ?? 0) + (RANK_CENTS[s] ?? 0), gain: (o.gain ?? 1) * g }));
    });
    // A reed's own lowpass (5 kHz) and floor kept only where the reed leads; the mixture's ranks would be dulled under another's.
    pt = { ...lead, osc };
  }
  if (trem) pt = tremulant(pt);
  merged.set(key, pt);
  return pt;
}

/** What the registration makes of one note: its patch (the organ), the harpsichord's choirs and lute, the pedal's 16'. */
export interface Registered {
  patch?: Patch;
  choirs?: { unison?: typeof UNISON; four?: typeof FOUR };
  lute?: boolean;
  sub16?: boolean;
}

/**
 * The registration's answer for a note of the preset playing, of the voice whose patch is `pt`;
 * `lead` whether it is the player's. Null: the note as it was (another voice without TUTTI, another
 * sound, a patch the preset does not register, or the default registration).
 */
export function registeredNote(presetId: string, reg: Registration, pt: Patch | null | undefined, lead: boolean, midi: number): Registered | null {
  if (!reg.stops || !pt || (!lead && !reg.tutti)) return null;
  const st = reg.stops;
  if (presetId === "harpsichordSampled") {
    if (!isHarpsichord(pt)) return null;
    const r: Registered = {};
    if (st.includes("unison") || st.includes("four")) r.choirs = { unison: st.includes("unison") ? UNISON : undefined, four: st.includes("four") ? FOUR : undefined };
    if (st.includes("lute")) r.lute = true;
    return r.choirs || r.lute ? r : null;
  }
  if (presetId === "chamberOrgan") {
    const id = organPatchOf(pt);
    if (!id) return null;
    if (id === "orgPedal") {
      const r: Registered = {};
      if (st.includes("trem")) r.patch = tremulant(pt);
      if (st.includes("sub16")) r.sub16 = true;
      return r.patch || r.sub16 ? r : null;
    }
    const patch = organPatch(pt, st, midi);
    return patch === pt ? null : { patch };
  }
  return null;
}

// ---- The state: the registration in force (read by every note), kept per piece on the device ----

let live: { presetId: string; reg: Registration } = { presetId: "", reg: DEFAULT_REG };
/** The registration in force for the preset now playing (set by the title bar's buttons and when a piece opens). */
export function setLiveRegistration(presetId: string, reg: Registration) {
  live = { presetId, reg };
}
export function liveRegistration(presetId: string): Registration {
  return live.presetId === presetId ? live.reg : DEFAULT_REG;
}

export const REG_KEY = "tg-registration-v1";
type Stored = Record<string, Record<string, Registration>>;
function readAll(): Stored {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(REG_KEY) : null;
    const o = v ? (JSON.parse(v) as unknown) : {};
    return o && typeof o === "object" ? (o as Stored) : {};
  } catch {
    return {};
  }
}
/** The registration kept for a piece on a preset (the default if none, or if what is kept is not understood). */
export function loadRegistration(piece: string, presetId: string): Registration {
  const r = readAll()[piece]?.[presetId];
  if (!r || typeof r !== "object") return DEFAULT_REG;
  const ok = STOPS[presetId] ?? [];
  const stops = Array.isArray(r.stops) ? r.stops.filter((s): s is StopId => ok.includes(s as StopId)) : null;
  return { stops, tutti: r.tutti === true };
}
export function saveRegistration(piece: string, presetId: string, reg: Registration) {
  try {
    const all = readAll();
    const mine = { ...(all[piece] ?? {}) };
    if (!reg.stops && !reg.tutti) delete mine[presetId];
    else mine[presetId] = reg;
    if (Object.keys(mine).length) all[piece] = mine;
    else delete all[piece];
    localStorage.setItem(REG_KEY, JSON.stringify(all));
  } catch {
    /* this visit only */
  }
}
