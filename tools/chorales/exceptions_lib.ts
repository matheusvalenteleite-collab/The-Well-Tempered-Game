/**
 * Excerpts of Bach's chorales for the rating pages (X1, X4): from the bar before a moment to the bar
 * after, in ABC notation (for abcjs) and as notes to play, the moment marked; and the rating page
 * (tools/chorales/exceptions-page.html) filled with moments.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { BachChorale } from "../../src/chorale/generate/corpus.ts";
import type { StudyChorale } from "../../src/chorale/generate/diminution.ts";
import { midiOf } from "../../src/chorale/generate/theory.ts";
import type { Note } from "../../src/chorale/level6.ts";

/** What an excerpt needs of a moment: its onset (32nds), its bar, the voice concerned (null: the chord). */
export interface Spot {
  at: number;
  bar: number;
  voice: number | null;
}

export const thirty = (t: string) => {
  const [a, b] = t.split("/").map(Number);
  return Math.round((32 * a) / (b ?? 1));
};

/** The bar of an onset in a chorale. */
export function barAt(c: BachChorale, time: number): number {
  let bar = c.notes[0].m;
  for (const n of c.notes) if (thirty(n.t) <= time) bar = n.m;
  return bar;
}

// ---- excerpts: from the bar before to the bar after, in ABC notation and as notes to play ----
const ORDER = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
function sigAlter(sig: number, letter: string) {
  const order = sig > 0 ? "FCGDAEB" : "BEADGCF";
  return order.slice(0, Math.abs(sig)).includes(letter) ? Math.sign(sig) : 0;
}
function barStarts(c: BachChorale, s: StudyChorale): Map<number, number> {
  const out = new Map<number, number>();
  for (const n of c.notes) if (!out.has(n.m)) out.set(n.m, thirty(n.t));
  // bars where no melody note starts (a held note over the bar line) are filled from the meter
  const [num, den] = s.meter.split("/").map(Number);
  const len = (32 * num) / den;
  const bars = [...out.keys()].sort((a, b) => a - b);
  for (let k = bars[0]; k <= bars[bars.length - 1] + 1; k++) if (!out.has(k)) out.set(k, (out.get(k - 1) ?? 0) + len);
  return out;
}
function abcPitch(p: string, state: Map<string, number>, sig: number): string {
  const m = /^([A-G])([#b]*)(-?\d+)$/.exec(p)!;
  const alter = [...m[2]].reduce((a, ch) => a + (ch === "#" ? 1 : -1), 0);
  const key = m[1] + m[3];
  const current = state.has(key) ? state.get(key)! : sigAlter(sig, m[1]);
  let acc = "";
  if (current !== alter) {
    acc = alter === 0 ? "=" : alter > 0 ? "^".repeat(alter) : "_".repeat(-alter);
    state.set(key, alter);
  }
  const oct = Number(m[3]);
  const letter = oct >= 5 ? m[1].toLowerCase() + "'".repeat(oct - 5) : m[1] + ",".repeat(4 - oct);
  return acc + letter;
}
/** A length in 32nds as written note values (dotted where they fit), largest first. */
function values(d: number): number[] {
  const out: number[] = [];
  for (const v of [32, 28, 24, 16, 14, 12, 8, 7, 6, 4, 3, 2, 1])
    while (d >= v) {
      out.push(v);
      d -= v;
    }
  return out;
}
const len = (v: number) => (v === 1 ? "" : String(v));

/** An excerpt from the bar before the moment to the bar after (`whole`: the whole chorale). */
export function excerpt(c: BachChorale, s: StudyChorale, x: Spot, whole = false) {
  const starts = barStarts(c, s);
  const first = whole ? Math.min(...starts.keys()) : Math.max(Math.min(...starts.keys()), x.bar - 1);
  const from = whole ? 0 : starts.get(first)!;
  const to = whole ? s.length : Math.min(starts.get(x.bar + 2) ?? s.length, s.length);
  const lines = [...starts.entries()].filter(([, t]) => t > from && t < to).map(([, t]) => t);
  const cuts = [...new Set([...lines, x.at])].sort((a, b) => a - b);
  const play: [number, number, number, number][] = [];
  const voiceAbc = s.voices.map((line: Note[], v) => {
    let out = "";
    let t = from;
    let state = new Map<string, number>();
    const notes = line.filter((n) => n[0] + n[1] > from && n[0] < to);
    const piece = (start: number, end: number, body: string, tie: boolean) => {
      // split at bar lines and at the moment, tied
      let a = start;
      const bounds = cuts.filter((u) => u > start && u < end);
      for (const b of [...bounds, end]) {
        if (lines.includes(a) && a !== from) {
          out += " | ";
          state = new Map();
        }
        const mark = a === x.at && (x.voice === null ? v === 0 : x.voice === v) ? '"^▼"' : "";
        out += mark + values(b - a).map((v) => body.replace("@", len(v))).join(" ") + (b < end || tie ? "-" : "") + " ";
        a = b;
      }
    };
    for (const n of notes) {
      const on = Math.max(n[0], from),
        off = Math.min(n[0] + n[1], to);
      if (on > t) piece(t, on, "z@", false);
      const head = (n[3] && v === 0 ? "!fermata!" : "") + abcPitch(n[2], state, s.sig);
      // a new note after a bar line re-reads its accidental: written per piece
      let a = on;
      const bounds = cuts.filter((u) => u > on && u < off);
      for (const b of [...bounds, off]) {
        if (lines.includes(a) && a !== from) {
          out += " | ";
          state = new Map();
        }
        const mark = a === x.at && (x.voice === null ? v === 0 : x.voice === v) ? '"^▼"' : "";
        const ph = a === on ? head : abcPitch(n[2], state, s.sig);
        const plain = ph.replace("!fermata!", "");
        out += mark + values(b - a).map((v, k) => (k ? plain : ph) + len(v)).join("- ") + (b < off ? "-" : "") + " ";
        a = b;
      }
      play.push([v, on - from, off - on, midiOf(n[2])]);
      t = off;
    }
    if (t < to) piece(t, to, "z@", false);
    return out.trim() + " |]";
  });
  const key = ORDER[s.sig + 7] ?? "C";
  const abc = [
    "X:1",
    `M:${s.meter}`,
    "L:1/32",
    `K:${key}`,
    "%%score (S A) (T B)",
    "V:S clef=treble stem=up",
    "V:A clef=treble stem=down",
    "V:T clef=bass stem=up",
    "V:B clef=bass stem=down",
    ...["S", "A", "T", "B"].map((name, v) => `[V:${name}] ${voiceAbc[v]}`),
  ].join("\n");
  return { abc, play, mark: x.at - from, length: to - from, fromBar: first };
}


/** The rating page: the template with the moments (and the page's settings) filled in. */
export function writePage(path: URL, moments: unknown[], settings: Record<string, unknown> = {}) {
  const template = readFileSync(new URL("./exceptions-page.html", import.meta.url), "utf8");
  writeFileSync(path, template.replace("/*__MOMENTS__*/[]", JSON.stringify(moments)).replace("/*__SETTINGS__*/{}", JSON.stringify(settings)));
}
