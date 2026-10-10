/**
 * A short line on one staff (VexFlow 4): a subject, an answer. Rhythm from the notes' durations
 * (whole to sixty-fourth, single-dotted; anything else split and tied), rests where the line pauses,
 * accidentals written on every altered note (no key signature); no bar lines.
 */
import { useEffect, useRef } from "react";
import { Accidental, Beam, Dot, Formatter, Renderer, Stave, StaveNote, StaveTie, Voice } from "vexflow";
import { parsePitch } from "../music/pitch.ts";
import { TPQ } from "../wtc/corpus.ts";

interface Note {
  on: number;
  dur: number;
  pitch: string;
}

const VALUES: [number, string, boolean][] = [
  [4 * TPQ, "w", false],
  [3 * TPQ, "h", true],
  [2 * TPQ, "h", false],
  [1.5 * TPQ, "q", true],
  [TPQ, "q", false],
  [0.75 * TPQ, "8", true],
  [0.5 * TPQ, "8", false],
  [0.375 * TPQ, "16", true],
  [0.25 * TPQ, "16", false],
  [0.1875 * TPQ, "32", true],
  [0.125 * TPQ, "32", false],
  [0.0625 * TPQ, "64", false],
];

/** Split a length into written values, greedily, at most a bar at a time. */
function values(len: number): [string, boolean, number][] {
  const out: [string, boolean, number][] = [];
  let left = len;
  while (left > 0) {
    const v = VALUES.find(([t]) => t <= left + 1);
    if (!v) break;
    out.push([v[1], v[2], v[0]]);
    left -= v[0];
  }
  return out;
}

const key = (p: string) => {
  const sp = parsePitch(p);
  return `${sp.step.toLowerCase()}${sp.alter > 0 ? "#".repeat(sp.alter) : "b".repeat(-sp.alter)}/${sp.octave}`;
};
const acc = (p: string) => {
  const a = parsePitch(p).alter;
  return a === 1 ? "#" : a === 2 ? "##" : a === -1 ? "b" : a === -2 ? "bb" : null;
};

export function MiniStaff({ notes, highlight = [], ink = "#1f5fbf", width }: { notes: Note[]; highlight?: number[]; ink?: string; width?: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el || !notes.length) return;
    el.innerHTML = "";
    const avg = notes.reduce((a, n) => a + parsePitch(n.pitch).midi, 0) / notes.length;
    const clef = avg < 57 ? "bass" : "treble";
    const t0 = notes[0].on;
    const W = width ?? Math.max(260, notes.length * 34 + 90);
    const r = new Renderer(el, Renderer.Backends.SVG);
    r.resize(W, 140);
    const ctx = r.getContext();
    const stave = new Stave(4, 26, W - 10);
    stave.addClef(clef).setContext(ctx).draw();
    const tickables: StaveNote[] = [];
    const ties: [StaveNote, StaveNote][] = [];
    let t = t0;
    notes.forEach((n, i) => {
      if (n.on > t) for (const [d, dot] of values(n.on - t)) {
        const rest = new StaveNote({ keys: [clef === "bass" ? "d/3" : "b/4"], duration: `${d}r`, clef });
        if (dot) Dot.buildAndAttach([rest], { all: true });
        tickables.push(rest);
      }
      const parts = values(n.dur);
      let prev: StaveNote | null = null;
      for (const [d, dot] of parts) {
        const sn = new StaveNote({ keys: [key(n.pitch)], duration: d, clef });
        const a = acc(n.pitch);
        if (a && !prev) sn.addModifier(new Accidental(a));
        if (dot) Dot.buildAndAttach([sn], { all: true });
        if (highlight.includes(i)) sn.setStyle({ fillStyle: "#c0392b", strokeStyle: "#c0392b" });
        else sn.setStyle({ fillStyle: ink, strokeStyle: ink });
        if (prev) ties.push([prev, sn]);
        tickables.push(sn);
        prev = sn;
      }
      t = n.on + n.dur;
    });
    const voice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(Voice.Mode.SOFT);
    voice.addTickables(tickables);
    // Beams by the beat (quavers and shorter, not across rests).
    const beams = Beam.generateBeams(tickables.filter((x) => !x.isRest()), { beam_rests: false, maintain_stem_directions: false });
    new Formatter().joinVoices([voice]).format([voice], W - 70);
    voice.draw(ctx, stave);
    beams.forEach((b) => b.setContext(ctx).draw());
    for (const [a, b] of ties) new StaveTie({ first_note: a, last_note: b, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
  }, [notes, highlight, ink, width]);
  return <div ref={host} className="wtc-staff" />;
}
