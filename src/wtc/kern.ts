/**
 * A Humdrum **kern reader for the Well-Tempered Clavier (and keyboard music like it): voices as
 * lists of notes with onsets and durations in ticks, pitches spelled as the game spells them
 * ("C#4", "Bb3", "F##5"; C4 = middle C), ties merged, rests dropped, bar lines kept.
 *
 * Spines: each initial **kern spine is a voice (the WTC fugues are encoded one voice per spine,
 * bass first). A spine split (*^) inside a voice, for a chord or a brief divisi, is folded back
 * into that voice: the notes of its sub-spines are kept, marked by `sub` (0 = the main line).
 */

/** Ticks per quarter note: divisible by 3, 5 and powers of two down to 128th notes (dotted). */
export const TPQ = 1920;

export interface KernNote {
  /** Onset and duration in ticks (TPQ per quarter note). */
  on: number;
  dur: number;
  /** Spelled pitch, scientific notation. */
  pitch: string;
  /** Sub-spine within the voice (0 = the main line; >0 = a split, chord or divisi). */
  sub: number;
}

export interface KernPiece {
  /** Reference records (!!!COM, !!!OTL ...). */
  refs: Record<string, string>;
  /** Voices, top first. */
  voices: KernNote[][];
  /** Key from the *X: interpretation (e.g. "C", "c#", "e-"), as written. */
  key: string | null;
  /** Meter of the first *M interpretation, e.g. "4/4". */
  meter: string | null;
  /** Bar lines: number and onset (ticks). */
  bars: { n: number; on: number }[];
  /** Total length in ticks. */
  length: number;
}

const ACC: Record<string, string> = { "#": "#", "##": "##", "-": "b", "--": "bb", n: "", "": "" };

/** Pitch of a kern token, or null for a rest. */
export function kernPitch(tok: string): string | null {
  if (/r/.test(tok)) return null;
  const m = /([a-gA-G])\1*/.exec(tok);
  if (!m) return null;
  const letters = m[0];
  const lower = letters[0] === letters[0].toLowerCase();
  const octave = lower ? 3 + letters.length : 4 - letters.length;
  const after = tok.slice(m.index + letters.length);
  const acc = /^(##|--|#|-|n)?/.exec(after)![1] ?? "";
  return `${letters[0].toUpperCase()}${ACC[acc]}${octave}`;
}

/** Duration of a kern token in ticks (null for a grace note or none). */
export function kernDuration(tok: string): number | null {
  if (/[qQ]/.test(tok)) return null;
  const m = /(\d+)(%(\d+))?(\.*)/.exec(tok);
  if (!m) return null;
  const n = Number(m[1]);
  const d = m[3] ? Number(m[3]) : 1;
  // A "0" is a breve.
  let ticks = n === 0 ? 8 * TPQ : (4 * TPQ * d) / n;
  let add = ticks;
  for (let i = 0; i < m[4].length; i++) {
    add /= 2;
    ticks += add;
  }
  return Math.round(ticks);
}

interface Spine {
  voice: number;
  sub: number;
  /** Time at which this spine's next event starts. */
  t: number;
  /** Open ties: pitch -> index of the note in its voice. */
  ties: Map<string, number>;
}

export function parseKern(text: string): KernPiece {
  const refs: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  let spines: Spine[] = [];
  let kernMask: boolean[] = [];
  let nVoices = 0;
  const raw: KernNote[][] = [];
  let key: string | null = null;
  let meter: string | null = null;
  const bars: { n: number; on: number }[] = [];
  let now = 0;
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("!!!")) {
      const m = /^!!!([^:]+):\s*(.*)$/.exec(line);
      if (m) refs[m[1]] = m[2];
      continue;
    }
    if (line.startsWith("!")) continue;
    const f = line.split("\t");
    if (line.startsWith("**")) {
      kernMask = f.map((x) => x === "**kern");
      // Spines left to right are bass to top; voices are numbered top first.
      const kernCount = kernMask.filter(Boolean).length;
      nVoices = kernCount;
      let k = 0;
      spines = f.map((x) => ({ voice: x === "**kern" ? kernCount - 1 - k++ : -1, sub: 0, t: 0, ties: new Map() }));
      for (let v = 0; v < nVoices; v++) raw.push([]);
      continue;
    }
    if (line.startsWith("*")) {
      // Interpretations, and spine manipulations.
      if (f.some((x) => x === "*^" || x === "*v" || x === "*-" || x === "*+" || x === "*x")) {
        const next: Spine[] = [];
        for (let i = 0; i < f.length; i++) {
          const s = spines[i];
          const x = f[i];
          if (x === "*^") {
            next.push(s, { voice: s.voice, sub: s.sub + 1, t: s.t, ties: new Map() });
          } else if (x === "*v") {
            // Merge a run of *v into the first.
            let j = i;
            while (j + 1 < f.length && f[j + 1] === "*v") j++;
            next.push({ ...spines[i], t: Math.max(...spines.slice(i, j + 1).map((y) => y.t)) });
            i = j;
          } else if (x === "*-") {
            // spine ends
          } else next.push(s);
        }
        spines = next;
        kernMask = spines.map((s) => s.voice >= 0);
        continue;
      }
      for (let i = 0; i < f.length; i++) {
        if (!kernMask[i]) continue;
        const km = /^\*([a-gA-G][#-]?):$/.exec(f[i]);
        if (km && key === null) key = km[1];
        const mm = /^\*M(\d+\/\d+)$/.exec(f[i]);
        if (mm && meter === null) meter = mm[1];
      }
      continue;
    }
    if (line.startsWith("=")) {
      const n = /^=(\d+)/.exec(f[0]);
      const t = Math.max(...spines.filter((s) => s.voice >= 0).map((s) => s.t));
      now = t;
      if (n) bars.push({ n: Number(n[1]), on: t });
      continue;
    }
    // A data line: each kern spine's token starts at its own spine time.
    for (let i = 0; i < f.length; i++) {
      const s = spines[i];
      if (!s || s.voice < 0) continue;
      const tok = f[i];
      if (tok === ".") continue;
      let dur: number | null = null;
      for (const sub of tok.split(" ")) {
        const d = kernDuration(sub);
        if (d === null) continue;
        dur = dur === null ? d : Math.max(dur, d);
        const p = kernPitch(sub);
        if (p === null) continue;
        const voice = raw[s.voice];
        const tieEnd = sub.includes("]") || sub.includes("_");
        const open = s.ties.get(p);
        if (tieEnd && open !== undefined) {
          voice[open].dur += d;
          if (sub.includes("]")) s.ties.delete(p);
        } else {
          voice.push({ on: s.t, dur: d, pitch: p, sub: s.sub });
          if (sub.includes("[")) s.ties.set(p, voice.length - 1);
        }
      }
      if (dur !== null) s.t += dur;
    }
  }
  const voices = raw.map((v) => v.sort((a, b) => a.on - b.on || a.sub - b.sub));
  const length = Math.max(now, ...voices.flatMap((v) => v.map((x) => x.on + x.dur)));
  return { refs, voices, key, meter, bars, length };
}
