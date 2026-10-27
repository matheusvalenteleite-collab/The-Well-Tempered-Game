/**
 * D342, THE MANUAL's drills (design 4.3): a small text format for purpose-made drills, compiled into the
 * touch game's own format (TouchFugue) when the manual loads, so that a drill is played, demonstrated,
 * judged and logged exactly as an excerpt of Bach is. The owner writes one in a minute:
 *
 *   drill "Treppe" key C meter 4/4 tempo 72 wait
 *   voice  C4 q  D4 q  E4 q  F4 q | G4 q  F4 q  E4 q  D4 q | C4 h  r h
 *   band   drone C3
 *
 * The head: the drill's name (its id is "drill-" and the name in lower case), its key (minor in lower
 * case: "d"), its metre, its tempo (crotchets a minute) and, optionally, `wait` (WAIT FOR ME).
 * `voice`: the player's line, a note at a time: a pitch (C4, F#4, Bb3) or `r` (a rest), then its value:
 * w h q e s t (whole to thirty-second), a dot after it for a dotted value. `|` is a bar line, and each
 * bar must be full. `band` is one of:
 *   none                no band; no click past the count-in
 *   click               the metronome's click all through
 *   click fade A B      the click full for A beats, fading to nothing at beat B (counted from the start)
 *   drone C3            the pitch held under every bar
 *   voice …             a written second voice, in the same notation (a small duet)
 * Lines starting with # are comments.
 */
import type { TouchFugue, TouchNote } from "../../touch/fugue.ts";

export const DRILL_TPQ = 1920;
const VALUES: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 0.125 };
const LETTERS = "CDEFGAB";
const SEMIS = [0, 2, 4, 5, 7, 9, 11];

export interface DrillBand {
  kind: "none" | "click" | "drone" | "voice";
  /** click fade: full for this many beats, gone at this beat. */
  fade?: [number, number];
}

export interface Drill {
  id: string;
  name: string;
  key: string;
  meter: string;
  /** Crotchets a minute. */
  tempo: number;
  wait: boolean;
  band: DrillBand;
  /** The piece made (the player's line is voice `voice`). */
  piece: TouchFugue;
  voice: number;
  /** The click in ticks (Options.click), where the band asks for one. */
  click?: { full: number; gone: number };
}

/** A pitch named as the score spells it ("F#4", "Bb3"): its MIDI number and staff step (7 to the octave, C4 = 28). */
export function pitchOf(name: string): { midi: number; step: number } {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/.exec(name);
  if (!m) throw new Error(`not a pitch: ${name}`);
  const li = LETTERS.indexOf(m[1]);
  const oct = Number(m[3]);
  const acc = !m[2] ? 0 : m[2][0] === "#" ? m[2].length : -m[2].length;
  return { midi: 12 * (oct + 1) + SEMIS[li] + acc, step: 7 * oct + li };
}

interface Parsed {
  notes: TouchNote[];
  spell: Record<string, string>;
  length: number;
}

/** A line of notes read: [onset, duration, MIDI, step] in ticks; each bar checked full. */
export function parseLine(text: string, barTicks: number): Parsed {
  const notes: TouchNote[] = [];
  const spell: Record<string, string> = {};
  let at = 0;
  let barFrom = 0;
  const toks = text.trim().split(/\s+/).filter(Boolean);
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t === "|") {
      if (at - barFrom !== barTicks) throw new Error(`a bar of ${(at - barFrom) / DRILL_TPQ} crotchets, not ${barTicks / DRILL_TPQ}: before token ${k}`);
      barFrom = at;
      continue;
    }
    const v = toks[++k];
    if (v === undefined) throw new Error(`no value after ${t}`);
    const vm = /^([whqest])(\.?)$/.exec(v);
    if (!vm) throw new Error(`not a value: ${v}`);
    const dur = Math.round(VALUES[vm[1]] * (vm[2] ? 1.5 : 1) * DRILL_TPQ);
    if (t !== "r") {
      const p = pitchOf(t);
      notes.push([at, dur, p.midi, p.step]);
      spell[String(p.midi)] = t;
    }
    at += dur;
  }
  if (at - barFrom !== barTicks) throw new Error(`the last bar holds ${(at - barFrom) / DRILL_TPQ} crotchets, not ${barTicks / DRILL_TPQ}`);
  return { notes, spell, length: at };
}

const mean = (ns: TouchNote[]) => (ns.length ? ns.reduce((a, n) => a + n[2], 0) / ns.length : 0);

/** A drill's text compiled into a playable piece. Throws a plain message on a mistake. */
export function compileDrill(text: string): Drill {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const head = lines.find((l) => l.startsWith("drill "));
  if (!head) throw new Error("no drill line");
  const name = /drill\s+"([^"]+)"/.exec(head)?.[1];
  if (!name) throw new Error("the drill has no name");
  const word = (w: string) => new RegExp(`\\b${w}\\s+(\\S+)`).exec(head)?.[1];
  const key = word("key") ?? "C";
  const meter = word("meter") ?? "4/4";
  const tempo = Number(word("tempo") ?? 60);
  const wait = /\bwait\b/.test(head);
  const [num, den] = meter.split("/").map(Number);
  if (!num || !den || !tempo) throw new Error(`bad head: ${head}`);
  const barTicks = (num * 4 * DRILL_TPQ) / den;
  const voiceLine = lines.find((l) => l.startsWith("voice "));
  if (!voiceLine) throw new Error("no voice line");
  const own = parseLine(voiceLine.slice(6), barTicks);
  const bandLine = lines.find((l) => l.startsWith("band "))?.slice(5).trim() ?? "none";
  let band: DrillBand = { kind: "none" };
  let second: TouchNote[] | null = null;
  const spell = { ...own.spell };
  const bars = own.length / barTicks;
  if (bandLine.startsWith("drone")) {
    const p = pitchOf(bandLine.split(/\s+/)[1] ?? "C3");
    second = Array.from({ length: bars }, (_, b) => [b * barTicks, barTicks, p.midi, p.step] as TouchNote);
    spell[String(p.midi)] = bandLine.split(/\s+/)[1];
    band = { kind: "drone" };
  } else if (bandLine.startsWith("voice")) {
    const b = parseLine(bandLine.slice(5), barTicks);
    if (b.length !== own.length) throw new Error("the band's voice is not as long as the player's");
    second = b.notes;
    Object.assign(spell, b.spell);
    band = { kind: "voice" };
  } else if (bandLine.startsWith("click")) {
    const f = /fade\s+(\d+)\s+(\d+)/.exec(bandLine);
    band = { kind: "click", ...(f ? { fade: [Number(f[1]), Number(f[2])] as [number, number] } : {}) };
  } else if (bandLine !== "none") throw new Error(`unknown band: ${bandLine}`);
  // The parts highest first, as the game's pieces are.
  const parts = second ? [own.notes, second].map((ns, i) => ({ ns, i })).sort((a, b) => mean(b.ns) - mean(a.ns)) : [{ ns: own.notes, i: 0 }];
  const voice = parts.findIndex((p) => p.i === 0);
  const id = `drill-${name.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-")}`;
  const beatTicks = num % 3 === 0 && num > 3 ? (3 * 4 * DRILL_TPQ) / den : (4 * DRILL_TPQ) / den;
  const piece: TouchFugue = {
    id,
    kind: "fugue",
    book: 0,
    number: 0,
    title: `Drill: ${name}`,
    key,
    bwv: "",
    meter,
    tpq: DRILL_TPQ,
    length: own.length,
    barTicks,
    bars: Array.from({ length: bars }, (_, b) => ({ n: b + 1, on: b * barTicks })),
    voiceNames: parts.map((p) => (p.i === 0 ? "Drill" : "Band")),
    voices: parts.map((p) => p.ns),
    entries: [],
    keys: [{ on: 0, key }],
    spell,
    sections: [{ name: name, fromBar: 1, toBar: bars, from: 0, to: own.length }],
    cadences: [],
    countersubject: [],
  };
  const click = band.kind === "click" ? (band.fade ? { full: band.fade[0] * beatTicks, gone: band.fade[1] * beatTicks } : { full: Infinity, gone: Infinity }) : band.kind === "none" ? { full: 0, gone: 0 } : undefined;
  return { id, name, key, meter, tempo, wait, band, piece, voice, ...(click ? { click } : {}) };
}

/** What a line of notes does, move by move: steps (a second), small leaps (a third), leaps (a fourth or more), repeats. */
export function movesOf(ns: readonly TouchNote[]): { steps: number; thirds: number; leaps: number; repeats: number } {
  const out = { steps: 0, thirds: 0, leaps: 0, repeats: 0 };
  for (let i = 1; i < ns.length; i++) {
    const d = Math.abs(ns[i][3] - ns[i - 1][3]);
    if (d === 0) out.repeats++;
    else if (d === 1) out.steps++;
    else if (d === 2) out.thirds++;
    else out.leaps++;
  }
  return out;
}
