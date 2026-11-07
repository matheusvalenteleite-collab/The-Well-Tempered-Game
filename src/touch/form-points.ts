/**
 * Design studio (D474; the owner: a run "starts and ends and nothing happens that is surprising"; "Don't meddle with
 * the MUSIC. Make the music shine"): each fugue's form, read from its own data only (the experts' entries, D493, and
 * the cadences): where the exposition ends, where the episodes run (no entry sounding for a bar or more), the groups
 * of middle entries, the final group (a stretto where its entries overlap), the climax and the last chord. One pure
 * source for the stage's scenes (stage-bg.ts) and the sound's sections (Instruments' D513/D514), so what is seen and
 * what is heard turn on the same bars. Nothing here is scored or random; every tick is the score's.
 */
import type { TouchFugue } from "./fugue.ts";

export type SeamKind = "exposition" | "episode" | "middle" | "final" | "coda";
export interface Seam {
  kind: SeamKind;
  on: number;
  end: number;
  /** The scene (act) this stretch belongs to: 0 the exposition, the last the final group; episodes travel to the next. */
  act: number;
  /** A group of entries that overlap (a stretto). */
  stretto?: boolean;
}
export interface Form {
  seams: Seam[];
  /** How many acts (3 or 4: the exposition, one or two middles, the final group). */
  acts: number;
  /** Where each act's look is reached in full; the episode before it is the way there. */
  actOn: number[];
  /** The climax: it builds from `rise` to `peak` (the last entry's onset) and holds to `arrival` (the last cadence). */
  climax: { rise: number; peak: number; arrival: number };
  /** Held bass notes (a bar and a half or more) in the last quarter: the pedal points. */
  pedals: { on: number; end: number }[];
  end: number;
}

const memo = new Map<string, Form>();

export function formOf(f: TouchFugue): Form {
  const hit = memo.get(f.id);
  if (hit) return hit;
  const bar = f.barTicks;
  const ents = [...f.entries].sort((a, b) => a.on - b.on);
  const end = f.length;
  const nv = f.voices.length;
  // The exposition: until every voice has entered once (or the first nv entries, where one voice enters twice).
  const seen = new Set<number>();
  let ei = 0;
  while (ei < ents.length && seen.size < nv) seen.add(ents[ei++].voice);
  const expoEnd = ents.slice(0, Math.max(1, ei)).reduce((m, e) => Math.max(m, e.end), 0);
  // The later entries in groups: an entry beginning before the group's last ends (or within a bar of it) joins it.
  const groups: { on: number; end: number; n: number; stretto: boolean }[] = [];
  for (const e of ents.slice(ei)) {
    const g = groups[groups.length - 1];
    if (g && e.on < g.end + bar) {
      if (e.on < g.end) g.stretto = true;
      g.end = Math.max(g.end, e.end);
      g.n++;
    } else groups.push({ on: e.on, end: e.end, n: 1, stretto: false });
  }
  // An entry group still inside the exposition's tail folds into it.
  while (groups.length && groups[0].on < expoEnd) groups.shift();
  const final = groups.pop();
  // The acts: the exposition, the middle entries (two acts where there are two or more groups, split nearest 60%), the final.
  const split = groups.length >= 2 ? nearest(groups.slice(1).map((g) => g.on), end * 0.55) : -1;
  const acts = final ? (split >= 0 ? 4 : groups.length ? 3 : 2) : 1;
  const actOf = (on: number) => (final && on >= final.on ? acts - 1 : split >= 0 && on >= split ? 2 : on >= expoEnd ? 1 : 0);
  const seams: Seam[] = [{ kind: "exposition", on: 0, end: expoEnd, act: 0 }];
  let t = expoEnd;
  for (const g of [...groups, ...(final ? [final] : [])]) {
    if (g.on - t >= bar * 0.75) seams.push({ kind: "episode", on: t, end: g.on, act: actOf(g.on) });
    seams.push({ kind: g === final ? "final" : "middle", on: g.on, end: g.end, act: actOf(g.on), ...(g.stretto ? { stretto: true } : {}) });
    t = g.end;
  }
  const lastCad = f.cadences.length ? Math.max(...f.cadences.map((c) => c.on)) : end;
  // The arrival: the last cadence (where it falls after the last entry has begun), else the last group's end.
  const lastOn = ents.length ? ents[ents.length - 1].on : 0;
  const arrival = lastCad > lastOn + bar ? Math.min(end, lastCad) : Math.max(t, Math.min(end, lastCad));
  if (arrival - t >= bar * 0.75) seams.push({ kind: "episode", on: t, end: arrival, act: acts - 1 });
  if (end - arrival >= bar * 0.5) seams.push({ kind: "coda", on: arrival, end, act: acts - 1 });
  const actOn = [0];
  for (let a = 1; a < acts; a++) actOn.push(seams.find((s) => s.act === a && s.kind !== "episode")?.on ?? end);
  const lastEntry = ents.length ? lastOn : end;
  const rise = Math.max(0, (final?.on ?? lastEntry) - 2 * bar);
  // The pedals: the lowest voice's notes held a bar and a half or more in the last quarter.
  const low = f.voices[nv - 1] ?? [];
  const pedals = low.filter((n) => n[0] >= end * 0.75 && n[1] >= bar * 1.5).map((n) => ({ on: n[0], end: n[0] + n[1] }));
  const form: Form = { seams, acts, actOn, climax: { rise, peak: Math.max(rise, lastEntry), arrival }, pedals, end };
  memo.set(f.id, form);
  return form;
}

function nearest(xs: number[], to: number): number {
  let best = -1;
  for (const x of xs) if (best < 0 || Math.abs(x - to) < Math.abs(best - to)) best = x;
  return best;
}

/** Where the music is: the stretch (and its act), the act's look 0..1 reached (eased through the episode before it). */
export function formAt(form: Form, tick: number): { seam: Seam; act: number; mix: number; episode: boolean; climax: number; resolved: number } {
  const seam = form.seams.find((s) => tick >= s.on && tick < s.end) ?? form.seams[form.seams.length - 1];
  const episode = seam.kind === "episode";
  // An episode travels from the act before to its own act: the look turns across it, arriving with the entry.
  const act = seam.act;
  const mix = episode && act > 0 && seam.end === form.actOn[act] ? smooth((tick - seam.on) / Math.max(1, seam.end - seam.on)) : 1;
  const c = form.climax;
  const climax = tick < c.rise ? 0 : tick < c.peak ? smooth((tick - c.rise) / Math.max(1, c.peak - c.rise)) : 1;
  const resolved = tick < c.arrival ? 0 : smooth((tick - c.arrival) / Math.max(1, (form.end - c.arrival) * 0.6 || 1));
  return { seam, act, mix, episode, climax, resolved };
}

const smooth = (x: number) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
};
