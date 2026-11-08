/**
 * D497, THE SOUND LAB's settings and its deep links (pure). A link: `soundlab.html#wtc1f12?sound=vocalSynth&drums=2&bar=40`.
 *
 *   sound   a preset id (sound.ts PRESETS, or a trial's); absent: the fugue's own (piece-sound.ts)
 *   drums   0 off, 1 2 3 the fugue's drum STYLE (drum-presets.ts drumPresetsFor, the first its default)
 *   bar     the bar to start from (Bach's numbering)
 *   tempo   slow, default, fast (tempo-steps.ts)
 *   voice   the voice Herr Bach plays (0 the top); absent: the game's first offer (the second to enter)
 *   form    0: D513's subject/episode layer off       climax 0: the climax build off
 *   busoni  0: Busoni's dynamics off                  colour 0: the colour plans off
 *   kit     0: a band's own drums off                 mute   voices muted (1,3)   solo  one voice alone
 *   lv      the mixer, dB per voice (0,-3,0,2)
 *   b       the A/B's second setting, "sound:drums" (b=pianoSampled:0)
 */
export type TempoStep = "slow" | "default" | "fast";
export interface LabSettings {
  piece: string;
  /** null: the fugue's own sound. */
  sound: string | null;
  /** 0 off, 1-3 the fugue's drum style. */
  drums: number;
  tempo: TempoStep;
  /** null: the game's first offer. */
  voice: number | null;
  form: boolean;
  climax: boolean;
  busoni: boolean;
  colour: boolean;
  kit: boolean;
  mute: number[];
  solo: number | null;
  /** dB per voice (missing: 0). */
  levels: number[];
}
export interface ABSlot {
  sound: string | null;
  drums: number;
}
export interface LabLink {
  settings: LabSettings;
  bar: number | null;
  b: ABSlot | null;
}

export const defaults = (piece: string): LabSettings => ({ piece, sound: null, drums: 0, tempo: "default", voice: null, form: true, climax: true, busoni: true, colour: true, kit: true, mute: [], solo: null, levels: [] });

const ints = (s: string | null): number[] => (s ? s.split(",").map((x) => Number(x)).filter((x) => Number.isFinite(x)) : []);

/** A link's hash (with or without the leading #) read into settings; an unknown or missing piece: `fallback`. */
export function parseLink(hash: string, valid: (id: string) => boolean, fallback = "wtc1f01"): LabLink {
  const h = hash.replace(/^#/, "");
  const [id, query = ""] = h.split("?");
  const piece = id && valid(id) ? id : fallback;
  const q = new URLSearchParams(query);
  const s = defaults(piece);
  const snd = q.get("sound");
  if (snd) s.sound = snd;
  const d = Number(q.get("drums"));
  if (q.has("drums") && Number.isInteger(d) && d >= 0 && d <= 3) s.drums = d;
  const t = q.get("tempo");
  if (t === "slow" || t === "fast" || t === "default") s.tempo = t;
  const v = Number(q.get("voice"));
  if (q.has("voice") && Number.isInteger(v) && v >= 0) s.voice = v;
  for (const k of ["form", "climax", "busoni", "colour", "kit"] as const) if (q.get(k) === "0") s[k] = false;
  s.mute = ints(q.get("mute")).filter((x) => Number.isInteger(x) && x >= 0);
  const so = Number(q.get("solo"));
  if (q.has("solo") && Number.isInteger(so) && so >= 0) s.solo = so;
  s.levels = ints(q.get("lv")).map((x) => Math.max(-24, Math.min(12, x)));
  const bar = Number(q.get("bar"));
  let b: ABSlot | null = null;
  const bq = q.get("b");
  if (bq) {
    const [bs, bd] = bq.split(":");
    const n = Number(bd);
    b = { sound: bs && bs !== "own" ? bs : null, drums: Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0 };
  }
  return { settings: s, bar: q.has("bar") && Number.isFinite(bar) && bar >= 0 ? Math.floor(bar) : null, b };
}

/** Settings (and a bar, an A/B's second slot) written as a link's hash, only what differs from the defaults. */
export function linkOf(s: LabSettings, bar?: number | null, b?: ABSlot | null): string {
  const q: string[] = [];
  if (s.sound) q.push(`sound=${encodeURIComponent(s.sound)}`);
  if (s.drums) q.push(`drums=${s.drums}`);
  if (bar !== undefined && bar !== null && bar > 0) q.push(`bar=${bar}`);
  if (s.tempo !== "default") q.push(`tempo=${s.tempo}`);
  if (s.voice !== null) q.push(`voice=${s.voice}`);
  for (const k of ["form", "climax", "busoni", "colour", "kit"] as const) if (!s[k]) q.push(`${k}=0`);
  if (s.mute.length) q.push(`mute=${s.mute.join(",")}`);
  if (s.solo !== null) q.push(`solo=${s.solo}`);
  if (s.levels.some((x) => x)) q.push(`lv=${s.levels.map((x) => x || 0).join(",")}`);
  if (b) q.push(`b=${b.sound ?? "own"}:${b.drums}`);
  return `#${s.piece}${q.length ? `?${q.join("&")}` : ""}`;
}

/** Which voices sound: solo wins over mute. */
export function audible(s: Pick<LabSettings, "mute" | "solo">, count: number): boolean[] {
  return Array.from({ length: count }, (_, v) => (s.solo !== null ? v === s.solo : !s.mute.includes(v)));
}
/** A voice's gain from the mixer (dB) and solo/mute. */
export function voiceGain(s: Pick<LabSettings, "mute" | "solo" | "levels">, v: number, count: number): number {
  return audible(s, count)[v] ? 10 ** ((s.levels[v] ?? 0) / 20) : 0;
}

/** What a change asks of the engine: "live" (applied at once, the music running on) or "relaunch" (the engine restarted at the same tick). */
export function changeKind(a: LabSettings, b: LabSettings): "none" | "live" | "relaunch" {
  if (a.piece !== b.piece || a.sound !== b.sound || a.tempo !== b.tempo || a.voice !== b.voice || a.busoni !== b.busoni) return "relaunch";
  const same = a.drums === b.drums && a.form === b.form && a.climax === b.climax && a.colour === b.colour && a.kit === b.kit && a.solo === b.solo && a.mute.join() === b.mute.join() && a.levels.join() === b.levels.join();
  return same ? "none" : "live";
}
