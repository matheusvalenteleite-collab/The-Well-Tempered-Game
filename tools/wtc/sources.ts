/**
 * D366: the Well-Tempered Clavier (and the Inventions and Sinfonias) read from licence-clean editions,
 * every note the game ships built from these (docs/wtc/SOURCES.md):
 *   fugues        Kyle Rother's open-score edition (University of Cape Town, 2015; CC BY 4.0, "no rights
 *                 reserved" in its files; data/sources/wtc-uct), LilyPond, one staff a voice, read by
 *                 tools/wtc/lily.py; a few readings corrected or taken back to the Bach-Gesellschaft's
 *                 (CORRECTIONS, each with its reason);
 *   Book I        the preludes of the Open Well-Tempered Clavier (Kimiko Ishizaka and MuseScore, 2015;
 *                 CC0; data/sources/wtc-openwtc), MusicXML, the prelude cut from its prelude-and-fugue
 *                 score;
 *   Book II       the preludes of 1, 2 and 6 from the Mutopia Project (public domain;
 *                 data/wtc/sources/mutopia), the rest from verits99's MuseScore set (CC0, as the PDMX
 *                 dataset records it; data/sources/wtc-musescore), its written-out repeats taken once;
 *   Inventions    the Mutopia Project's editions (D340; data/sources/bach-inventions/mutopia).
 * Each piece in the shape of src/wtc/corpus.ts (WtcPiece: ticks at TPQ a quarter, voices top first,
 * spelled pitches, `sub` 0 for the voice's own line and 1 for a note struck while it sounds), with
 * the bars as the game has always numbered them (an upbeat before bar 1, no bar 0; a repeat's second
 * ending numbered as its first), and the ornaments written in the editions.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ, type WtcNote, type WtcPiece } from "../../src/wtc/corpus.ts";
import { readMusicXml, type XmlScore } from "../touch/musicxml.ts";
import { readLy, SPECS } from "../touch/more-bach.ts";
import { CORRECTIONS, type Correction } from "./corrections.ts";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** An ornamented note: voice, onset, pitch, signs (kern's letters, as the game reads them), grace notes ("q"/"Q" + pitch). */
export type OrnRow = [number, number, string, string, string[]?];

export interface Read {
  piece: WtcPiece;
  orn: OrnRow[];
  /** Where it came from, for the reports. */
  source: string;
  notes: string[];
}

/** Each key of the book: the tonic as spelled and the mode (lower case minor), the order of the 24. */
const KEYS = ["C", "c", "C#", "c#", "D", "d", "Eb", "d#", "E", "e", "F", "f", "F#", "f#", "G", "g", "Ab", "g#", "A", "a", "Bb", "bb", "B", "b"];
/** The prelude's key where it is spelled otherwise (Book I no. 8: E flat minor; the fugue D sharp minor). */
const PRELUDE_KEY: Record<string, string> = { wtc1p08: "eb" };

const ticks = (f: string) => {
  const [n, d] = f.split("/").map(Number);
  return Math.round((n / d) * 4 * TPQ);
};

/**
 * Notes of one voice, `sub` given: 0 for the voice's own line, 1 for a note struck while a note of the
 * line is held (a brief divisi, a held note under a moving one), as the kern encodings' split spines
 * were marked. A chord (notes struck and released together) is the line's.
 */
export function withSubs(notes: [number, number, string][]): WtcNote[] {
  const ns = [...notes].sort((a, b) => a[0] - b[0] || parsePitch(b[2]).midi - parsePitch(a[2]).midi);
  const out: WtcNote[] = [];
  let lineEnd = -1;
  let last: number | null = null;
  for (let i = 0; i < ns.length; ) {
    let j = i;
    while (j < ns.length && ns[j][0] === ns[i][0]) j++;
    const group = ns.slice(i, j);
    const on = group[0][0];
    if (on < lineEnd) {
      for (const n of group) out.push([n[0], n[1], n[2], 1]);
    } else if (group.every((n) => n[1] === group[0][1])) {
      for (const n of group) out.push([n[0], n[1], n[2], 0]);
      lineEnd = on + group[0][1];
      last = parsePitch(group[0][2]).midi;
    } else {
      // Notes struck together and released apart: the line goes on with the note nearest its last.
      const ref = last ?? parsePitch(group[0][2]).midi;
      const main = group.reduce((a, b) => (Math.abs(parsePitch(b[2]).midi - ref) < Math.abs(parsePitch(a[2]).midi - ref) ? b : a));
      for (const n of group) out.push([n[0], n[1], n[2], n === main ? 0 : 1]);
      lineEnd = on + main[1];
      last = parsePitch(main[2]).midi;
    }
    i = j;
  }
  return out.sort((a, b) => a[0] - b[0] || a[3] - b[3]);
}

/** A LilyPond file read by lily.py (through lily_json.py). */
function readFile(path: string, asWritten: boolean) {
  return readLy(path, 0, asWritten);
}

/** A note as read, before `sub` is given: onset, duration, pitch (and, in a keyboard score, its staff's voice). */
export type Raw = [number, number, string, string?];

const transposeOctave =(pitch: string, k: number) => pitch.replace(/(-?\d+)$/, (o) => String(Number(o) + k));

/**
 * A piece's corrections (corrections.ts) applied to its voices as read ([onset, duration, pitch] per
 * voice, before `sub` is given); each must find what it corrects. Returns what was done, for the report.
 */
export function applyCorrections(id: string, voices: Raw[][], bars: { n: number; on: number }[]): string[] {
  const done: string[] = [];
  const barOn = (n: number) => {
    const b = bars.find((x) => x.n === n);
    if (!b) throw new Error(`${id}: no bar ${n}`);
    return b.on;
  };
  const q = (beats: number) => Math.round(beats * TPQ);
  for (const c of CORRECTIONS.filter((x: Correction) => x.id === id)) {
    if ("rhythm" in c) {
      let k = 0;
      for (const v of voices) {
        v.sort((x, y) => x[0] - y[0]);
        for (let i = 0; i + 1 < v.length; i++) {
          const n = v[i];
          if (n[1] !== q(0.75) || n[0] % q(0.5) !== 0) continue;
          if (c.rhythm === "triplet32") {
            const t = v.slice(i + 1, i + 4);
            if (t.length < 3 || !t.every((x, j) => x[1] === q(0.75) / 9 && x[0] === n[0] + q(0.75) + (j * q(0.25)) / 3)) continue;
            n[1] = q(0.625);
            t.forEach((x, j) => ((x[0] = n[0] + q(0.625) + j * q(0.125)), (x[1] = q(0.125))));
            k++;
          }
        }
        if (c.rhythm === "dotted")
          // A dotted quaver's semiquaver written (or played) as a triplet's third quaver, as written:
          // the note on the beat's last triplet quaver after one of two thirds of the beat.
          for (const s of v) {
            if (s[0] % q(1) !== q(2 / 3) || s[1] !== q(1 / 3)) continue;
            const p = v.find((x) => x !== s && x[0] === s[0] - q(2 / 3) && x[1] === q(2 / 3));
            if (!p) continue;
            p[1] = q(0.75);
            s[0] = p[0] + q(0.75);
            s[1] = q(0.25);
            k++;
          }
        if (c.rhythm === "assimilate")
          // Every note struck on a beat's last semiquaver (after a dotted quaver, or a tied note ending
          // there) moves to the beat's last triplet quaver; the note before ends there; a note that
          // ended on the beat still does.
          for (let i = 0; i < v.length; i++) {
            const s = v[i];
            if (s[0] % q(1) !== q(0.75)) continue;
            // Only among triplets: another voice struck on the beat's second or third triplet quaver,
            // or this voice in the beat before or after (the subject's own triplets).
            const beat = s[0] - q(0.75);
            const triplet = (x: [number, number, string], b: number) => x[0] === b + q(1 / 3) || x[0] === b + q(2 / 3);
            if (!voices.some((u) => u !== v && u.some((x) => triplet(x, beat))) && !v.some((x) => triplet(x, beat - q(1)) || triplet(x, beat + q(1)))) continue;
            const shift = q(0.75) - q(2 / 3);
            for (const p of v) if (p !== s && p[0] < s[0] && p[0] + p[1] === s[0]) p[1] -= shift;
            const endsOnBeat = (s[0] + s[1]) % q(1) === 0;
            s[0] -= shift;
            if (endsOnBeat) s[1] += shift;
            k++;
          }
      }
      if (!k) throw new Error(`${id}: rhythm ${c.rhythm} found nothing`);
      done.push(`${k} figures: ${c.rhythm} (${c.kind}: ${c.why})`);
      continue;
    }
    const v = voices[c.voice];
    if ("octave" in c) {
      const from = barOn(c.fromBar);
      const to = c.toBar === undefined ? Infinity : (bars.find((x) => x.n === c.toBar! + 1)?.on ?? Infinity);
      let k = 0;
      for (const n of v) if (n[0] >= from && n[0] < to) (n[2] = transposeOctave(n[2], c.octave)), k++;
      if (!k) throw new Error(`${id}: octave correction from b. ${c.fromBar} moved nothing`);
      done.push(`b. ${c.fromBar}${c.toBar ? `-${c.toBar}` : "-end"}, voice ${c.voice}: ${k} notes an octave ${c.octave < 0 ? "lower" : "higher"} (${c.kind}: ${c.why})`);
    } else if ("from" in c) {
      const t = barOn(c.bar) + q(c.at);
      const n = v.find((x) => x[0] === t && x[2] === c.from);
      if (!n) throw new Error(`${id}: b. ${c.bar} voice ${c.voice} beat ${c.at}: no ${c.from}`);
      n[2] = c.to;
      done.push(`b. ${c.bar}, voice ${c.voice}, beat ${c.at}: ${c.from} → ${c.to} (${c.kind}: ${c.why})`);
    } else {
      const a = barOn(c.bar) + q(c.span[0]);
      const b = barOn(c.bar) + q(c.span[1]);
      const old = v.filter((x) => x[0] >= a && x[0] < b);
      const neu = c.notes
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((tok) => {
          const m = /^([A-G](?:#{1,2}|b{1,2})?-?\d+)@([\d.]+)\/([\d.]+)$/.exec(tok);
          if (!m) throw new Error(`${id}: bad note ${tok}`);
          return [barOn(c.bar) + q(Number(m[2])), q(Number(m[3])), m[1]] as Raw;
        });
      for (const o of old) v.splice(v.indexOf(o), 1);
      v.push(...neu);
      v.sort((x, y) => x[0] - y[0]);
      done.push(`b. ${c.bar}, voice ${c.voice}, beats ${c.span[0]}-${c.span[1]}: ${old.map((o) => o[2]).join(" ") || "nothing"} → ${neu.map((o) => o[2]).join(" ") || "nothing"} (${c.kind}: ${c.why})`);
    }
  }
  return done;
}

/** Ornament signs (LilyPond's and MusicXML's names) as the kern letters the game reads (src/music/ornaments.ts). */
const SIGN: Record<string, string> = {
  trill: "T",
  startTrillSpan: "T",
  "trill-mark": "T",
  prall: "W",
  "inverted-mordent": "W",
  prallprall: "W",
  upprall: "W",
  downprall: "W",
  lineprall: "W",
  pralldown: "W",
  prallup: "W",
  mordent: "M",
  prallmordent: "WM",
  upmordent: "M",
  downmordent: "M",
  turn: "S",
  "delayed-turn": "S",
  reverseturn: "$",
  "inverted-turn": "$",
  "delayed-inverted-turn": "$",
  shake: "T",
};
const signsOf = (names: string[]) => {
  const s = [...new Set(names.map((n) => SIGN[n] ?? "O"))].join("");
  // A trill with its wavy line written as both \trill and \startTrillSpan is one trill.
  return s.replace(/T+/g, "T");
};

function meta(book: 0 | 1 | 2, number: number, kind: WtcPiece["kind"]) {
  const id = `wtc${book}${kind === "fugue" ? "f" : "p"}${String(number).padStart(2, "0")}`;
  const k = (kind === "prelude" && PRELUDE_KEY[id]) || KEYS[number - 1];
  const minor = k[0] === k[0].toLowerCase();
  return { id, book, number, kind, key: k[0].toUpperCase() + k.slice(1), mode: (minor ? "minor" : "major") as WtcPiece["mode"], bwv: String(845 + (book - 1) * 24 + number) };
}

/** The bars as the game numbers them: an upbeat (LilyPond's bar 0) is before bar 1 and has no entry. */
const gameBars = (measures: { n: number; on: number }[], length: number) => measures.filter((b) => b.n >= 1 && b.on < length);

// --- The fugues: Rother's open score ----------------------------------------------------------------

/** The fugues whose extra staff is an ossia (cue-size, another reading), not a voice dividing. */
const OSSIA_STAFF = new Set(["wtc1f09"]);

export function readFugue(book: 1 | 2, number: number): Read {
  const m = meta(book, number, "fugue");
  const path = `${ROOT}data/sources/wtc-uct/book${book}/fugue${String(number).padStart(2, "0")}.ly`;
  const ly = readFile(path, false);
  // A voice dividing onto an extra staff (I/6, II/1, II/3) is still that voice; I/9's small staff in
  // bar 26 is an ossia (another reading of the bass, printed small), left out.
  if (OSSIA_STAFF.has(m.id)) ly.notes = ly.notes.filter((n) => !n.host);
  for (const n of ly.notes) if (n.host) n.part = n.host;
  const sounding = ly.notes.filter((n) => !n.grace && n.dur !== "0/1");
  // lily.py names the two staves of a two-staff score "upper" and "lower".
  const named = new Set(sounding.map((n) => n.part));
  const parts = named.has("upper") && named.has("lower") && named.size === 2 ? ["upper", "lower"] : ly.staves.filter((s) => named.has(s));
  const length = ticks(ly.length);
  const bars = gameBars(ly.measures.map((b) => ({ n: b.n, on: ticks(b.on) })), length);
  const raw = parts.map((p) => sounding.filter((n) => n.part === p).map((n) => [ticks(n.on), ticks(n.dur), n.pitch] as [number, number, string]));
  const applied = applyCorrections(m.id, raw, bars);
  const voices = raw.map(withSubs);
  const piece: WtcPiece = { ...m, meter: METER[m.id] ?? ly.times[0]?.text ?? "4/4", voices, bars, length };
  const orn: OrnRow[] = [];
  parts.forEach((p, vi) => {
    const mine = ly.notes.filter((n) => n.part === p);
    for (const n of mine) {
      if (n.grace) continue;
      const on = ticks(n.on);
      const gr = mine.filter((g) => g.grace && ticks(g.on) === on);
      if (!n.orn && !gr.length) continue;
      const row: OrnRow = [vi, on, n.pitch, n.orn ? signsOf(n.orn) : ""];
      if (gr.length) row.push(gr.map((g) => `${g.graceKind === "appoggiatura" ? "Q" : "q"}${g.pitch}`));
      orn.push(row);
    }
  });
  return { piece, orn, source: `data/sources/wtc-uct/book${book}/fugue${String(number).padStart(2, "0")}.ly`, notes: applied };
}

// --- The preludes ----------------------------------------------------------------------------------

/** A keyboard score's two staves as the game's two parts, top first; `sub` the staff's voice (0 its first). */
function handsOf(notes: { on: number; dur: number; pitch: string; staff: string; voice: string }[], staves: string[]): WtcNote[][] {
  return staves.map((st) => {
    const mine = notes.filter((n) => n.staff === st);
    const vs = [...new Set(mine.map((n) => n.voice))].sort((a, b) => mine.filter((n) => n.voice === b).length - mine.filter((n) => n.voice === a).length);
    return mine.map((n) => [n.on, n.dur, n.pitch, vs.indexOf(n.voice)] as WtcNote).sort((a, b) => a[0] - b[0] || a[3] - b[3]);
  });
}

/** The prelude of an OpenWTC score (prelude and fugue in one): its measures up to the fugue's first. */
function cutPrelude(x: XmlScore) {
  // The fugue's first measure: numbered from 1 (or 0) again, or headed "Fuga" (verits99's scores at A = 415).
  const at = x.measures.findIndex((mm, i) => i > 0 && (((mm.n === "1" || mm.n === "0") && Number(x.measures[i - 1].n) > 1) || (mm.words ?? []).some((w) => /^Fug/i.test(w))));
  if (at < 0) return { measures: x.measures, end: x.length };
  return { measures: x.measures.slice(0, at), end: x.measures[at].on };
}

/** An XML measure's content, to find a written-out repeat: its notes relative to its start. */
function measureKey(x: XmlScore, i: number, end: number) {
  const a = x.measures[i].on;
  const b = i + 1 < x.measures.length ? x.measures[i + 1].on : end;
  return x.parts[0].notes
    .filter((n) => n[0] >= a && n[0] < b)
    .map((n) => `${n[0] - a}:${n[1]}:${n[2]}`)
    .sort()
    .join(" ");
}

/**
 * A score whose repeats are written out (verits99's Book II: A A B B) as the game plays it, each
 * section once, as printed: A, the second ending (A's last bars where the repeat differs: the 1st
 * ending's bars, then the 2nd's, numbered alike), B, its second ending. Returns the measures kept, in
 * order, with the number each takes. The halves are found from the notes: the longest run of measures
 * repeated at once (a section of four bars or more), its last two bars allowed to differ.
 */
function asPrinted(x: XmlScore, end: number): { i: number; n: number }[] {
  const N = x.measures.filter((mm) => mm.on < end).length;
  const keys = Array.from({ length: N }, (_, i) => measureKey(x, i, end));
  const out: { i: number; n: number }[] = [];
  let i = 0;
  let n = x.measures[0].implicit || x.measures[0].n === "0" ? 0 : 1;
  while (i < N) {
    // A section starting at i, of length L, repeated at once (all but its last `e` bars equal).
    // verits99 varies a few bars in a repeat (its ornaments played otherwise): three in four bars
    // alike is a repeat; its last bars that differ (at most two) are the endings.
    let found: { L: number; e: number } | null = null;
    for (let L = Math.floor((N - i) / 2); L >= 4 && !found; L--) {
      let same = 0;
      for (let k = 0; k < L; k++) if (keys[i + k] === keys[i + L + k]) same++;
      if (same < 0.75 * L) continue;
      let e = 0;
      while (e < 2 && keys[i + L - 1 - e] !== keys[i + 2 * L - 1 - e]) e++;
      found = { L, e };
    }
    if (!found) {
      out.push({ i, n: n++ });
      i++;
      continue;
    }
    const { L, e } = found;
    const first = n;
    // The piece's last section ends once, as the second time (its final bar), no first ending kept.
    const last = i + 2 * L >= N;
    for (let k = 0; k < L; k++) out.push({ i: last && k >= L - e ? i + L + k : i + k, n: n++ });
    if (!last) for (let k = L - e; k < L; k++) out.push({ i: i + L + k, n: first + k });
    i += 2 * L;
  }
  return out;
}

/** The notes of the measures kept, laid end to end; their onsets moved accordingly. */
function relaid(x: XmlScore, keep: { i: number; n: number }[], end: number) {
  const notes: { on: number; dur: number; pitch: string; staff: string; voice: string }[] = [];
  const bars: { n: number; on: number }[] = [];
  const shift = new Map<number, number>();
  let t = 0;
  for (const { i, n } of keep) {
    const a = x.measures[i].on;
    const b = i + 1 < x.measures.length ? Math.min(x.measures[i + 1].on, end) : end;
    shift.set(i, t - a);
    bars.push({ n, on: t });
    for (const nn of x.parts[0].notes) if (nn[0] >= a && nn[0] < b) notes.push({ on: nn[0] + t - a, dur: nn[1], pitch: nn[2], staff: String(nn[3]), voice: `${nn[3]}/${nn[4]}` });
    t += b - a;
  }
  const move = (on: number) => {
    const i = x.measures.findLastIndex((mm) => mm.on <= on);
    return shift.has(i) ? on + shift.get(i)! : null;
  };
  return { notes, bars, length: t, move };
}

/** The metres where an edition leaves the time signature out (verits99's II/13 has none). */
const METER: Record<string, string> = {
  // verits99 writes no time signature in II/13's prelude (its bars are of three crotchets).
  wtc2p13: "3/4",
  // OpenWTC writes I/15's 24/16 as words over a 4/4 (the bars the same).
  wtc1p15: "24/16",
  // verits99 writes ¢ (2/2) for the Bach-Gesellschaft's C in II/22 and II/24 (the bars the same; the
  // game's beat is the crotchet, as before).
  wtc2p22: "4/4",
  wtc2p24: "4/4",
  // Rother writes II/9's bars of four minims as 2/1; the game counts them in minims, 4/2, as before.
  wtc2f09: "4/2",
  // Mutopia's I/4 prelude writes 3/2 on its lower staff for the 6/4 of its upper (the bars the same).
  wtc1p04: "6/4",
};

function xmlOrnaments(x: XmlScore, move: (on: number) => number | null, voices: WtcNote[][], staves: string[]): OrnRow[] {
  const p = x.parts[0];
  const rows: OrnRow[] = [];
  const at = (on: number, pitch: string, staff: number) => {
    const t = move(on);
    if (t === null) return null;
    const vi = staves.indexOf(String(staff));
    return voices[vi]?.some((n) => n[0] === t && n[2] === pitch) ? { vi, t } : null;
  };
  for (const o of p.ornaments) {
    const w = at(o.on, o.pitch, o.staff);
    if (w) rows.push([w.vi, w.t, o.pitch, signsOf(o.signs)]);
  }
  for (const g of p.graces) {
    const t = move(g.on);
    if (t === null) continue;
    const vi = staves.indexOf(String(g.staff));
    // The note it leads to: the next of its staff at its onset (its own voice first, else the highest).
    const target = voices[vi]?.filter((n) => n[0] === t).sort((a, b) => parsePitch(b[2]).midi - parsePitch(a[2]).midi)[0];
    if (!target) continue;
    let row = rows.find((r) => r[0] === vi && r[1] === t && r[2] === target[2]);
    if (!row) rows.push((row = [vi, t, target[2], ""]));
    (row[4] ??= []).push(`${g.slash ? "q" : "Q"}${g.pitch}`);
  }
  return rows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/**
 * verits99's Book II writes its trills out (it was made for playback): a run of six or more
 * demisemiquavers or shorter, in one voice, each starting as the one before ends, between two pitches a
 * step apart. Each such run is folded back into one note, the lower pitch (the trilled note: the run
 * starts on the step above), as long as the run, with a trill sign; what the run hid (an appoggiatura
 * before the trill, a Nachschlag) is lost. Returns the trills, as [onset, pitch, staff].
 */
export function foldTrills(notes: { on: number; dur: number; pitch: string; staff: string; voice: string }[]): { on: number; pitch: string; staff: string }[] {
  const trills: { on: number; pitch: string; staff: string }[] = [];
  const byVoice = new Map<string, typeof notes>();
  for (const n of notes) (byVoice.get(n.voice) ?? byVoice.set(n.voice, []).get(n.voice)!).push(n);
  const drop = new Set<(typeof notes)[number]>();
  for (const vs of byVoice.values()) {
    // One note at a time: the voice's own line (a chord's notes are not a run).
    const line = vs.filter((n, i) => !vs.some((m, j) => j !== i && m.on === n.on)).sort((a, b) => a.on - b.on);
    for (let i = 0; i < line.length; ) {
      let j = i;
      const pa = parsePitch(line[i].pitch).midi;
      const pb = line[i + 1] ? parsePitch(line[i + 1].pitch).midi : NaN;
      const short = (n: (typeof line)[number]) => n.dur <= TPQ / 8;
      if (!short(line[i]) || !(Math.abs(pa - pb) >= 1 && Math.abs(pa - pb) <= 2)) {
        i++;
        continue;
      }
      while (j + 1 < line.length && short(line[j + 1]) && line[j + 1].on === line[j].on + line[j].dur && parsePitch(line[j + 1].pitch).midi === ((j + 1 - i) % 2 ? pb : pa)) j++;
      if (j - i + 1 >= 6) {
        // The trilled note: the note just before the run, struck on one of its two pitches and
        // ending where it starts (the trill begun after it), else the lower pitch.
        const prev = line[i - 1];
        const before = prev && prev.on + prev.dur === line[i].on && [pa, pb].includes(parsePitch(prev.pitch).midi) ? prev : null;
        const lo = before ?? (pa < pb ? line[i] : line[i + 1]);
        const start = before ? before.on : line[i].on;
        const keep = { ...lo, on: start, dur: line[j].on + line[j].dur - start };
        if (before) drop.add(before);
        for (let k = i; k <= j; k++) drop.add(line[k]);
        notes.push(keep);
        trills.push({ on: keep.on, pitch: keep.pitch, staff: keep.staff });
        i = j + 1;
      } else i++;
    }
  }
  for (let k = notes.length - 1; k >= 0; k--) if (drop.has(notes[k])) notes.splice(k, 1);
  return trills;
}

/**
 * A prelude from MusicXML: OpenWTC's (Book I) or verits99's (Book II). `witness`: verits99's score at
 * A = 415 Hz instead (the prelude and fugue in one, repeats written out), read alike but uncorrected,
 * for the cross-check only (tools/wtc/sources-check.ts).
 */
export function readXmlPrelude(book: 1 | 2, number: number, witness = false): Read {
  const m = meta(book, number, "prelude");
  const dir = book === 1 && !witness ? "wtc-openwtc" : "wtc-musescore";
  const rowId = witness ? `wtc${book}-${String(number).padStart(2, "0")}` : m.id;
  const row = (JSON.parse(readFileSync(`${ROOT}data/sources/${dir}/index.json`, "utf8")) as { id: string; file: string }[]).find((r) => r.id === rowId);
  if (!row) throw new Error(`${rowId}: no score`);
  const file = row.file;
  const x = readMusicXml(`${ROOT}data/sources/${dir}/${file}`);
  const { end } = book === 1 || witness ? cutPrelude(x) : { end: x.length };
  const keep = book === 1 && !witness ? x.measures.filter((mm) => mm.on < end).map((mm, i) => ({ i, n: Number(mm.n) })) : asPrinted(x, end);
  const r = relaid(x, keep, end);
  const staves = ["1", "2"];
  const trills = book === 2 || witness ? foldTrills(r.notes) : [];
  const bars = gameBars(r.bars, r.length);
  // The corrections, on each hand's notes as read.
  const raw = staves.map((st) => r.notes.filter((n) => n.staff === st).map((n) => [n.on, n.dur, n.pitch, n.voice] as Raw));
  const applied = witness ? [] : applyCorrections(m.id, raw, bars);
  r.notes.splice(0, r.notes.length, ...raw.flatMap((v, k) => v.map(([on, dur, pitch, voice]) => ({ on, dur, pitch, staff: staves[k], voice: voice ?? `${staves[k]}/1` }))));
  const voices = handsOf(r.notes, staves);
  const meter = METER[m.id] ?? x.meter;
  const piece: WtcPiece = { ...m, meter, voices, bars, length: r.length };
  const notes = book === 2 && keep.length < x.measures.filter((mm) => mm.on < end).length ? [`written-out repeats taken once (${x.measures.filter((mm) => mm.on < end).length} measures → ${keep.length})`] : [];
  if (trills.length) notes.push(`${trills.length} written-out trills folded back into their notes`);
  notes.push(...applied);
  const orn = xmlOrnaments(x, r.move, voices, staves);
  for (const t of trills) orn.push([staves.indexOf(t.staff), t.on, t.pitch, "T"]);
  orn.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { piece, orn, source: `data/sources/${dir}/${file}`, notes };
}

/** Book II nos. 1, 2 and 6 from the Mutopia Project (public domain), as printed (each repeat once). */
const MUTOPIA_PRELUDES: Record<number, string> = {
  1: "data/wtc/sources/mutopia/BachJS/BWV870/wtk2prelude1/wtk2prelude1.ly",
  2: "data/wtc/sources/mutopia/BachJS/BWV871/wtk2-prelude2/wtk2-prelude2.ly",
  6: "data/wtc/sources/mutopia/BachJS/BWV875/bwv875a/bwv875a.ly",
};

export function readLyPrelude(number: number): Read {
  const m = meta(2, number, "prelude");
  const ly = readFile(`${ROOT}${MUTOPIA_PRELUDES[number]}`, true);
  const applied: string[] = [];
  const sounding = ly.notes.filter((n) => !n.grace && n.dur !== "0/1");
  const length = ticks(ly.length);
  const parts = ["upper", "lower"];
  const voices = handsOf(
    sounding.map((n) => ({ on: ticks(n.on), dur: ticks(n.dur), pitch: n.pitch, staff: n.part, voice: n.voice })),
    parts,
  );
  const piece: WtcPiece = { ...m, meter: ly.times[0]?.text ?? "4/4", voices, bars: gameBars(ly.measures.map((b) => ({ n: b.n, on: ticks(b.on) })), length), length };
  const orn: OrnRow[] = [];
  parts.forEach((p, vi) => {
    const mine = ly.notes.filter((n) => n.part === p);
    for (const n of mine) {
      if (n.grace) continue;
      const on = ticks(n.on);
      const gr = mine.filter((g) => g.grace && ticks(g.on) === on && g.voice === n.voice);
      if (!n.orn && !gr.length) continue;
      const row: OrnRow = [vi, on, n.pitch, n.orn ? signsOf(n.orn) : ""];
      if (gr.length) row.push(gr.map((g) => `${g.graceKind === "appoggiatura" ? "Q" : "q"}${g.pitch}`));
      orn.push(row);
    }
  });
  return { piece, orn, source: MUTOPIA_PRELUDES[number], notes: applied };
}

/**
 * Book I no. 4, in four real voices (the game keeps them, not hands): from the Mutopia Project's
 * edition (Davide Castellone, public domain), whose voices are the four (OpenWTC writes the tenor and
 * the bass as one voice). Its third voice of the upper staff (a few notes) is the alto's.
 */
function readFourVoicePrelude(): Read {
  const m = meta(1, 4, "prelude");
  const path = "data/wtc/sources/mutopia/BachJS/BWV849/bwv849a/bwv849a.ly";
  const ly = readFile(`${ROOT}${path}`, true);
  const sounding = ly.notes.filter((n) => !n.grace && n.dur !== "0/1");
  const ids = [["upper:1"], ["upper:2", "upper:3"], ["lower:1"], ["lower:2"]];
  const unknown = sounding.filter((n) => !ids.flat().includes(n.voice));
  if (unknown.length) throw new Error(`wtc1p04: voices ${[...new Set(unknown.map((n) => n.voice))].join(", ")}`);
  const length = ticks(ly.length);
  const bars = gameBars(ly.measures.map((b) => ({ n: b.n, on: ticks(b.on) })), length);
  const raw = ids.map((vs) => sounding.filter((n) => vs.includes(n.voice)).map((n) => [ticks(n.on), ticks(n.dur), n.pitch] as Raw));
  // The lower staff's two voices as tenor and bass by register (Mutopia's voice 1 of the staff is the
  // stems-up voice, the tenor or, where it rests, the bass): a note sounding alone on the staff is the
  // bass's (the climax, bb. 29-31: the bass's run); of notes sounding together, the lowest.
  const lower = [...raw[2], ...raw[3]].sort((a, b) => a[0] - b[0]);
  const midiOf = (r: Raw) => parsePitch(r[2]).midi;
  raw[2] = [];
  raw[3] = [];
  for (const n of lower) {
    const others = lower.filter((x) => x !== n && x[0] < n[0] + n[1] && n[0] < x[0] + x[1]);
    (others.some((x) => midiOf(x) < midiOf(n)) ? raw[2] : raw[3]).push(n);
  }
  const applied = applyCorrections(m.id, raw, bars);
  const piece: WtcPiece = { ...m, meter: METER[m.id] ?? ly.times[0]?.text ?? "6/4", voices: raw.map((v) => withSubs(v as [number, number, string][])), bars, length };
  const orn: OrnRow[] = [];
  ids.forEach((vs, vi) => {
    for (const n of ly.notes.filter((x) => vs.includes(x.voice) && !x.grace && x.orn)) orn.push([vi, ticks(n.on), n.pitch, signsOf(n.orn!)]);
  });
  return { piece, orn, source: path, notes: applied };
}

export function readPrelude(book: 1 | 2, number: number): Read {
  if (book === 1 && number === 4) return readFourVoicePrelude();
  return book === 2 && MUTOPIA_PRELUDES[number] ? readLyPrelude(number) : readXmlPrelude(book, number);
}

// --- The Inventions and Sinfonias: Mutopia (D340) -----------------------------------------------------

export function readInvention(kind: "invention" | "sinfonia", number: number): Read {
  const bwv = (kind === "invention" ? 771 : 786) + number;
  const s = SPECS.find((x) => x.id === `bwv${bwv}`)!;
  const path = `${ROOT}data/sources/${s.dir}/mutopia/${s.mutopia}/${s.ly}`;
  const ly = readLy(path, s.score ?? 0, true);
  const sounding = ly.notes.filter((n) => !n.grace && n.dur !== "0/1");
  const ids = s.lyVoices!;
  const home = (v: string) => (ids.includes(v) ? v : ids.includes(v.split(/[:/]/)[0]) ? v.split(/[:/]/)[0] : null);
  const voices = ids.map((id) => withSubs(sounding.filter((n) => home(n.voice) === id).map((n) => [ticks(n.on), ticks(n.dur), n.pitch])));
  const length = Math.max(...voices.flat().map((n) => n[0] + n[1]));
  const k = s.key;
  const id = `${kind === "invention" ? "inven" : "sinfo"}${String(number).padStart(2, "0")}`;
  const piece: WtcPiece = {
    id,
    book: 0,
    number,
    kind,
    key: k[0].toUpperCase() + k.slice(1),
    mode: k[0] === k[0].toLowerCase() ? "minor" : "major",
    bwv: String(bwv),
    meter: ly.times[0]?.text ?? "4/4",
    voices,
    bars: gameBars(ly.measures.map((b) => ({ n: b.n, on: ticks(b.on) })), length),
    length,
  };
  const orn: OrnRow[] = [];
  ids.forEach((v, vi) => {
    const mine = ly.notes.filter((n) => home(n.voice) === v);
    for (const n of mine) {
      if (n.grace) continue;
      const on = ticks(n.on);
      const gr = mine.filter((g) => g.grace && ticks(g.on) === on);
      if (!n.orn && !gr.length) continue;
      const row: OrnRow = [vi, on, n.pitch, n.orn ? signsOf(n.orn) : ""];
      if (gr.length) row.push(gr.map((g) => `${g.graceKind === "appoggiatura" ? "Q" : "q"}${g.pitch}`));
      orn.push(row);
    }
  });
  return { piece, orn, source: `data/sources/${s.dir}/mutopia/${s.mutopia}/${s.ly}`, notes: [] };
}
