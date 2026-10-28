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
 *   PIPE ORGAN (D349: one organ, as an organist registers it): every manual voice plays the same
 *   registration on the same manual, the default PRINCIPAL (Principal 8' and Octave 4'); FLUTE the
 *   flutes (Gedackt 8', Rohrflöte 4'); MIXTURE the plenum (the VCSL organ's recorded Principal 8' to
 *   Mixture, its recorded pedal under it); REED the Trompete (alone a solo reed: a cantus firmus; with
 *   the foundation, in the chorus); TREMULANT (the wind shaken: an amplitude and a slight pitch tremolo,
 *   5.6 Hz). Without TUTTI the stops are the player's voice alone, on a second manual (a solo, never
 *   louder: one level for every registration); under TUTTI the whole organ takes them (the band's
 *   manual, and the pedal's family: the flutes' soft pedal, the plenum's recorded one). The pedal
 *   (the bass): Subbass 16', Octavbass 8', Choralbass 4'; its 16′ button (drawn by default) and the
 *   tremulant when the player has it.
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

const MANUALS = ["orgPrincipal", "orgFlute", "orgTrompete", "orgPleno"] as const;
const PEDALS = ["orgPedal", "orgPedal8", "orgPedalSoft", "orgPedalPleno"] as const;
type OrganPatch = (typeof MANUALS)[number] | (typeof PEDALS)[number];
/** Which of PIPE ORGAN's patches a voice plays (by identity), or null for any other patch. */
export function organPatchOf(pt: Patch | null | undefined): OrganPatch | null {
  for (const id of [...MANUALS, ...PEDALS]) if (PATCHES[id] === pt) return id;
  return null;
}
export const isPedal = (pt: Patch | null | undefined) => (PEDALS as readonly string[]).includes(organPatchOf(pt) ?? "");
export const isManual = (pt: Patch | null | undefined) => (MANUALS as readonly string[]).includes(organPatchOf(pt) ?? "");
const HARPSI = new Set<Patch>([PATCHES.harpsiSampled, PATCHES.harpsiBassSampled]);
export const isHarpsichord = (pt: Patch | null | undefined) => !!pt && HARPSI.has(pt);

/** A voice's default registration, as stops (D349: every manual the Principal 8' and 4'; the pedal with its 16'). */
export function defaultStops(presetId: string, pt: Patch | null | undefined): StopId[] {
  if (presetId !== "chamberOrgan") return [];
  return isPedal(pt) ? ["sub16"] : organPatchOf(pt) ? ["principal"] : [];
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

/** ORGAN: the mixture's ranks (synthesized, with a reed in the chorus): a 2', a 1 1/3' and a 1' (a 2', 2 2/3' and 1 1/3' from c'', broken back an octave). */
export function mixturePatch(midi: number): Patch {
  const k = midi >= 72 ? 1 : 2;
  return {
    osc: [
      { wave: "stopPrincipal", octave: k, gain: 0.6 },
      { wave: "sine", octave: k + Math.log2(1.5), detune: 1.4, gain: 0.32 },
      { wave: "sine", octave: k + 1, detune: -1.2, gain: 0.26 },
    ],
    amp: { a: 0.028, d: 0.05, s: 1, r: 0.06 },
    level: PATCHES.orgPrincipal.level,
  };
}

const STOP_PATCH = (stop: StopId, midi: number): Patch | null =>
  stop === "flute" ? PATCHES.orgFlute : stop === "principal" ? PATCHES.orgPrincipal : stop === "reed" ? PATCHES.orgTrompete : stop === "mixture" ? mixturePatch(midi) : null;

/** ORGAN: a patch with the tremulant: the level shaken about its own (chip.ts takes depth/2 off the mean: given back), a slight pitch wobble with it. */
export const tremulant = (pt: Patch): Patch => ({ ...pt, level: pt.level / (1 - TREMULANT.depth / 2), trem: { depth: TREMULANT.depth, rate: TREMULANT.rate }, vib: { depth: TREMULANT.cents, rate: TREMULANT.rate, delay: 0 } });

const merged = new Map<string, Patch>();
/**
 * ORGAN: one manual note's patch for the stops drawn (D349: whichever voice: one manual). One stop, its
 * own patch; MIXTURE without the reed, the recorded plenum (the foundation under it is in it); several
 * others, their ranks in one note (one envelope, one chiff: a single key opening several ranks), each
 * scaled by the sum's share, the Principal leading where drawn; the tremulant where drawn.
 */
export function organPatch(_own: Patch, stops: readonly StopId[], midi: number): Patch {
  let ranks: StopId[] = stops.filter((s) => s !== "trem" && s !== "sub16");
  if (!ranks.some((s) => FOUNDATION.includes(s))) ranks = ["principal", ...ranks];
  const trem = stops.includes("trem");
  const key = `${ranks.join(",")}|${trem}|${ranks.includes("mixture") ? (midi >= 72 ? 1 : 2) : 0}`;
  const hit = merged.get(key);
  if (hit) return hit;
  let pt: Patch;
  if (ranks.length === 1) pt = STOP_PATCH(ranks[0], midi)!;
  else if (ranks.includes("mixture") && !ranks.includes("reed")) pt = PATCHES.orgPleno;
  else {
    const lead = STOP_PATCH((["principal", "flute", "reed"] as StopId[]).find((s) => ranks.includes(s))!, midi)!;
    const weights = ranks.map((s) => (s === "mixture" ? MIXTURE_WEIGHT : 1));
    const target = 10 ** (ORGAN_SUM_DB[Math.min(4, ranks.length)] / 20);
    const scale = target / weights.reduce((a, w) => a + w ** ORGAN_SUM_P, 0) ** (1 / ORGAN_SUM_P);
    const osc = ranks.flatMap((s, i) => {
      const sp = STOP_PATCH(s, midi)!;
      const g = (sp.level / lead.level) * weights[i] * scale;
      return sp.osc.map((o) => ({ ...o, detune: (o.detune ?? 0) + (RANK_CENTS[s] ?? 0), gain: (o.gain ?? 1) * g }));
    });
    // A reed's own lowpass (5 kHz) and floor kept only where the reed leads; the mixture's ranks would be dulled under another's.
    // D357: the reed's speech and body (Patch.reed: its bloom, rattle, formant, compass) carried into the chorus, by its share of it.
    const ri = ranks.indexOf("reed");
    const reed = ri >= 0 && lead.reed === undefined ? PATCHES.orgTrompete.reed : undefined;
    const share = reed ? weights[ri] ** ORGAN_SUM_P / weights.reduce((a, w) => a + w ** ORGAN_SUM_P, 0) : 0;
    pt = { ...lead, osc, ...(reed ? { reed: { ...reed, share: Math.max(0.5, share) } } : {}) };
  }
  if (trem) pt = tremulant(pt);
  merged.set(key, pt);
  return pt;
}

/** D357: the plenum's recorded pedal with its 16' pushed in (the synthesized Subbass under it, Patch.under, withdrawn). */
export const PEDAL_PLENO_8: Patch = { ...PATCHES.orgPedalPleno, under: undefined };

/**
 * ORGAN: the pedal's patch: its family by the manual's registration (the plenum's recorded pedal under
 * MIXTURE, the soft one under the flutes alone, else the principals), without its 16' where the
 * player pushed it in (D357: the plenum's too: its Subbass is synthesized, its recordings at 8'), with
 * the tremulant where drawn.
 */
export function pedalPatch(manual: readonly StopId[] | null, sixteen = true, trem = false): Patch {
  const m = manual ?? ["principal"];
  const pleno = m.includes("mixture");
  const soft = !pleno && m.includes("flute") && !m.includes("principal") && !m.includes("reed");
  const pt = pleno ? (sixteen ? PATCHES.orgPedalPleno : PEDAL_PLENO_8) : !sixteen ? PATCHES.orgPedal8 : soft ? PATCHES.orgPedalSoft : PATCHES.orgPedal;
  return trem ? tremulant(pt) : pt;
}

/**
 * D349, ORGANO PLENO (the game's zone, an entry captured): the organist draws the mixture for the
 * section: a manual's note crowned (the plenum; a reed's with the mixture's ranks), the pedal's the
 * plenum's. Null where nothing changes (another sound, a plenum already).
 */
export function crowned(pt: Patch | null | undefined, pedal: boolean, stops: readonly StopId[] | null, midi: number): Patch | null {
  if (!pt?.pipe) return null;
  if (pedal) return pt === PATCHES.orgPedalPleno ? null : PATCHES.orgPedalPleno;
  const now = stops ?? ["principal"];
  if (now.includes("mixture") || pt === PATCHES.orgPleno || pt === PATCHES.orgFlute) return null;
  return organPatch(pt, [...now, "mixture"], midi);
}

/** What the registration makes of one note: its patch (the organ), the harpsichord's choirs and lute. */
export interface Registered {
  patch?: Patch;
  choirs?: { unison?: typeof UNISON; four?: typeof FOUR };
  lute?: boolean;
}

/**
 * The registration's answer for a note of the preset playing, of the voice whose patch is `pt`;
 * `lead` whether it is the player's. Null: the note as it was (another voice without TUTTI, another
 * sound, a patch the preset does not register, or the default registration). D349: the organ's pedal
 * follows the band's manual (its family) whoever plays it.
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
    if (!organPatchOf(pt)) return null;
    // The pedal's 16′ pushed in only from the pedal (the player's); the tremulant the player's, or every voice's under TUTTI.
    const patch = isPedal(pt) ? pedalPatch(reg.tutti ? st : null, !lead || st.includes("sub16"), st.includes("trem")) : organPatch(pt, st, midi);
    return patch === pt ? null : { patch };
  }
  return null;
}

// ---- The state: the registration in force (read by every note), kept per piece on the device ----

let live: { presetId: string; reg: Registration } = { presetId: "", reg: DEFAULT_REG };
const listeners = new Set<(presetId: string, reg: Registration) => void>();
/** The registration in force for the preset now playing (set by the title bar's buttons and when a piece opens). */
export function setLiveRegistration(presetId: string, reg: Registration) {
  live = { presetId, reg };
  // D357: whoever shows it (the stop row) follows a change made elsewhere.
  for (const f of listeners) f(presetId, reg);
}
/** D357: told of every change of the registration in force (the stop row redraws); returns the unsubscribe. */
export function onLiveRegistration(f: (presetId: string, reg: Registration) => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
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

// ---- D357: the stop changes made while playing (for the special challenges to come) ----

/**
 * The owner (D357): "coordinating stop changes will be relevant to some special challenges". Every
 * change the player makes at the stop row is kept for the run: the bar it was made in (the game's
 * clock), the stop (or TUTTI), drawn or pushed in, and the registration after it. A challenge can then
 * ask "draw X at bar N" (`StopCue`) and check it (`cueMet`); nothing scores it yet.
 */
export type StopKnob = StopId | "tutti";
export interface StopChange {
  /** The bar the change was made in (null: not while playing). */
  bar: number | null;
  stop: StopKnob;
  drawn: boolean;
  reg: Registration;
}
let changes: StopChange[] = [];
/** The changes made since the run began (oldest first). */
export const stopChanges = (): readonly StopChange[] => changes;
/** A run begins (or ends): the changes forgotten. */
export function clearStopChanges() {
  changes = [];
}
/** Keep a change (the stop row, as a button is pressed). */
export function recordStopChange(c: StopChange) {
  changes.push(c);
}
/** A challenge's ask: `stop` drawn (or pushed in: `drawn` false) in bar `bar`, or up to `early` bars before it (0: that bar exactly). */
export interface StopCue {
  bar: number;
  stop: StopKnob;
  drawn: boolean;
  early?: number;
}
/** Whether the changes meet a cue: the stop's last change made by the cue's bar falls within its window and is the one asked for. */
export function cueMet(cue: StopCue, log: readonly StopChange[] = changes): boolean {
  const last = log.filter((c) => c.stop === cue.stop && c.bar !== null && c.bar <= cue.bar).at(-1);
  return !!last && last.drawn === cue.drawn && last.bar! >= cue.bar - (cue.early ?? 0);
}
