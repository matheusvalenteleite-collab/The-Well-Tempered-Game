/**
 * D498, THE SOUND LAB's summary: what happens where in a fugue, in a line per moment, for the sound and the drums now
 * chosen (pure). Read from the game's own sources: form-points.ts (the seams, the climax, the pedals), fugue-form.ts
 * (D513's zones and registration), drum-presets.ts (D514's rolls, break, busier climax, flourish), Busoni's printed
 * dynamics (where his reading reaches the sound) and the sound's colour plan (where it sounds: not where Busoni leads).
 */
import { barAt, beatOf, type TouchFugue } from "../../touch/fugue.ts";
import { formOf as pointsOf } from "../../touch/form-points.ts";
import { CLIMAX_PATTERN_AT, breaksBefore, ROLL_QUICK_S } from "../../touch/drum-presets.ts";
import { styleInfo } from "../../touch/drum-library.ts";
import { padStyle } from "./drum-pad.ts";
import { FORM_REG, climaxRamp, formOf as soundFormOf } from "../../touch/fugue-form.ts";
import { busoniLeads, planOf, type Colour } from "../../touch/colour.ts";
import { busoniReaches, presetById } from "../../touch/sound.ts";
import { wholeReadingOf } from "../../touch/readings.ts";
import { tempoOf } from "../../touch/tempi.ts";
import type { LabSettings } from "./lab-state.ts";

export interface SummaryItem {
  /** The bar it starts at (the jump's target), and the bar it ends at where it is a stretch. */
  bar: number;
  to?: number;
  text: string;
  kind: "form" | "climax" | "pedal" | "busoni" | "colour" | "end";
}

const STOP_WORDS: Record<string, string> = { unison: "8′ 8′", four: "4′", lute: "lute stop", flute: "flutes", principal: "principals", reed: "reed", mixture: "mixture", trem: "tremulant", sub16: "16′" };
const regWords = (presetId: string, reg: readonly string[] | undefined): string => {
  if (!reg) return "";
  if (presetId === "harpsichordSampled") return reg.length ? `8′ ${reg.map((r) => STOP_WORDS[r]).join(" ")}` : "8′ alone";
  return reg.map((r) => STOP_WORDS[r] ?? r).join(" + ");
};
/** A colour plan's moment in a few words. */
export function colourWords(presetId: string, c: Colour): string {
  const w: string[] = [];
  if (c.reg) w.push(regWords(presetId, c.reg) || "own registration");
  if (c.tone !== undefined) w.push(c.tone < 0 ? "darker" : c.tone > 0 ? "brighter" : "own tone");
  if (c.room !== undefined) w.push(`room ${c.room}`);
  if (c.pw !== undefined) w.push(`pulse ${Math.round(c.pw * 100)}%`);
  if (c.lp !== undefined) w.push(`filter ${c.lp} Hz`);
  if (c.fm !== undefined) w.push(c.fm < 1 ? "FM mellower" : "FM brighter");
  if (c.vib !== undefined) w.push("vibrato");
  if (c.open !== undefined) w.push(c.open < 0.5 ? "vowel closed" : "vowel open");
  if (c.layer) w.push(c.layer === "soft" ? "soft layer" : "firm layer");
  if (!w.length) w.push("own colour");
  return w.join(", ") + (c.voices ? ` (${c.voices.map((v) => `v${v + 1}`).join(" ")})` : "");
}

/** The summary for a fugue under a setting (the sound's id given: lab-engine.ts soundOf). */
export function summaryOf(f: TouchFugue, s: LabSettings, sound: string): SummaryItem[] {
  const bar = (t: number) => barAt(f, Math.max(0, Math.min(f.length - 1, t)));
  const pts = pointsOf(f);
  const sf = soundFormOf(f);
  const st = padStyle(s, sound);
  const drums = st ? { style: st, name: styleInfo(st).label } : null;
  const ownKit = s.kit && !drums && !!presetById(sound).groove;
  const zonesOn = s.form && sf.clear;
  const reg = FORM_REG[sound];
  const beat = beatOf(f).ticks;
  const beatS = (beat / f.tpq) * (60 / tempoOf(f.id));
  const out: SummaryItem[] = [];
  const dn = drums?.name ?? "";
  let prevEpisode = false;
  for (const sm of pts.seams) {
    if (sm.end <= sm.on) continue;
    const from = bar(sm.on);
    const to = bar(Math.max(sm.on, sm.end - 1));
    const w: string[] = [];
    if (sm.kind === "episode") {
      if (zonesOn) w.push("band lighter, darker" + (reg ? `, ${regWords(sound, reg.episode)}` : ""));
      if (drums && sf.clear && sm.on < sf.climax) w.push(`${dn} rolls out, thins to 55%`);
    } else if (sm.kind !== "coda") {
      if (sm.stretto) w.push("stretto");
      if (zonesOn && sm.on < sf.climax) w.push("band fuller, brighter" + (reg ? `, ${regWords(sound, reg.subject)}` : ""));
      if (drums && sf.clear && prevEpisode && sm.on < sf.climax && sm.kind !== "final") w.push(`${dn} rolls in`);
    }
    const name = { exposition: "exposition", episode: "episode", middle: "entries", final: "final group", coda: "coda" }[sm.kind];
    out.push({ bar: from, to, text: `${name}${w.length ? ` (${w.join("; ")})` : ""}`, kind: "form" });
    prevEpisode = sm.kind === "episode";
  }
  // The climax: its build, the drums' break and roll, the full registration, its top.
  if (s.climax) {
    const w: string[] = [];
    if (zonesOn) w.push("band builds +0.6 dB, brighter, more room");
    if (zonesOn && reg) w.push(`${regWords(sound, reg.climax)} from b.${bar(sf.finalEntry)}`);
    if (drums) {
      let busy: number | null = null;
      for (let t = sf.climax; t < f.length; t += beat) if (climaxRamp(sf, t) >= CLIMAX_PATTERN_AT) {
        busy = t;
        break;
      }
      w.push(`${dn} build to 112%${busy !== null ? `, full pattern from b.${bar(busy)}` : ""}`);
    }
    if (!w.length) w.push("no change in the band: its contrast is not clear");
    out.push({ bar: pts.climax.rise ? bar(pts.climax.rise) : 1, to: bar(pts.climax.arrival), text: `climax (${w.join("; ")}), top at b.${bar(pts.climax.peak)}`, kind: "climax" });
  }
  if (drums && breaksBefore(sf)) {
    const roll = (beatS < ROLL_QUICK_S ? 2 : 1) * beat;
    out.push({ bar: bar(sf.finalEntry - roll - f.barTicks), text: `${dn} break (a bar's silence), roll into the final entry at b.${bar(sf.finalEntry)}`, kind: "climax" });
  }
  for (const p of pts.pedals) out.push({ bar: bar(p.on), to: bar(p.end - 1), text: `pedal point${s.climax && p.on < pts.climax.arrival && p.end > pts.climax.rise ? " under the climax" : ""}`, kind: "pedal" });
  // Busoni's printed levels, where they reach the sound.
  const whole = wholeReadingOf(f.id)?.whole ?? null;
  const reaches = busoniReaches(sound);
  if (s.busoni && whole && reaches) {
    const byBar = new Map<number, string[]>();
    for (const d of whole.dyn) {
      const b = bar(d.on);
      const ms = byBar.get(b) ?? [];
      if (!ms.includes(d.mark)) ms.push(d.mark);
      byBar.set(b, ms);
    }
    for (const [b, ms] of byBar) out.push({ bar: b, text: `Busoni ${ms.join(", ")}`, kind: "busoni" });
  }
  // The colour plan, where it sounds.
  const leads = s.busoni && busoniLeads(whole, reaches);
  const plan = s.colour && !leads ? (planOf(f.id, sound) ?? []) : [];
  for (const [b, c] of plan) out.push({ bar: Math.max(1, Math.floor(b)), text: `colour: ${colourWords(sound, c)}`, kind: "colour" });
  // The last chord.
  const end: string[] = zonesOn && s.climax ? ["resolution: brightness let go, room opens"] : [];
  if (drums) end.push(`${dn} flourish`);
  if (ownKit) end.push("the band's drums close");
  out.push({ bar: bar(pts.last), text: `last chord${end.length ? ` (${end.join("; ")})` : ""}`, kind: "end" });
  const order = { form: 0, climax: 1, pedal: 2, busoni: 3, colour: 4, end: 5 };
  return out.sort((a, b) => a.bar - b.bar || order[a.kind] - order[b.kind]);
}

/** The summary as one line ("b.1–11 exposition · b.12–14 episode (…) · …"). */
export const summaryLine = (items: readonly SummaryItem[]): string => items.map((i) => `b.${i.bar}${i.to && i.to !== i.bar ? `–${i.to}` : ""} ${i.text}`).join(" · ");
