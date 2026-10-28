/**
 * D341: a small reader of part-wise MusicXML (and compressed .mxl), enough for the IMSLP editions of
 * BWV 228 (Brodersen's, from Capella) and BWV 54 (Casadesus-Masanell's, from MuseScore): each part's
 * notes as [onset, duration, spelled pitch] in ticks (TPQ a quarter), tied notes joined, grace and cue
 * notes left out, chords kept; the bars (the measures as written, a repeat or da capo not taken); the
 * first time signature, the parts' names. Dynamics and layout are skipped.
 * D347: the words (`<lyric>`, the first verse: syllabic, text, extend), each syllable on the note it
 * starts on, carried to its melisma's last note (an extend, or the notes after it without words, ties
 * included, up to a rest or the next syllable).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { TPQ } from "../../src/wtc/kern.ts";

/** D347: a syllable as the edition writes it, on the note it starts on (ticks), its melisma to `end`. */
export interface XmlSyllable {
  on: number;
  /** The end of its last note: the note's own end, or the melisma's last note's. */
  end: number;
  /** As written (the edition's spelling, untouched). */
  text: string;
  syllabic: "single" | "begin" | "middle" | "end";
  /** An `<extend/>` under it. */
  extend: boolean;
  /** Its measure's number, for checking. */
  bar: number;
}
export interface XmlPart {
  id: string;
  name: string;
  notes: [on: number, dur: number, pitch: string][];
  /** D347: the words, in time; empty for a part without them. */
  lyrics: XmlSyllable[];
  /** D347: what the reader noticed (verses beyond the first, words on a rest or a tied note, phrases without words). */
  lyricNotes: string[];
}
export interface XmlScore {
  parts: XmlPart[];
  bars: { n: number; on: number }[];
  meter: string;
  length: number;
}

/** The score's text: a .mxl unzipped (its rootfile) by python's zipfile, else the file. */
export function xmlText(path: string): string {
  if (!path.endsWith(".mxl")) return readFileSync(path, "utf8");
  const py =
    "import sys,zipfile,re\nz=zipfile.ZipFile(sys.argv[1])\nc=z.read('META-INF/container.xml').decode() if 'META-INF/container.xml' in z.namelist() else ''\nm=re.search(r'full-path=\"([^\"]+)\"',c)\nn=m.group(1) if m else [x for x in z.namelist() if x.endswith(('.xml','.musicxml')) and not x.startswith('META')][0]\nsys.stdout.write(z.read(n).decode('utf-8','replace'))";
  return execFileSync("python3", ["-I", "-c", py, path], { encoding: "utf8", maxBuffer: 256 << 20 });
}

const tag = (s: string, t: string) => new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`).exec(s)?.[1];
const ALTER: Record<string, string> = { "-2": "bb", "-1": "b", "0": "", "1": "#", "2": "##" };

type XmlNote = XmlPart["notes"][number];
type Sung = Omit<XmlSyllable, "on" | "end">;

export function readMusicXml(path: string): XmlScore {
  const t = xmlText(path);
  const names = new Map<string, string>();
  for (const m of t.matchAll(/<score-part id="([^"]+)">([\s\S]*?)<\/score-part>/g)) names.set(m[1], (tag(m[2], "part-name") ?? m[1]).trim());
  const parts: XmlPart[] = [];
  let bars: { n: number; on: number }[] = [];
  let meter = "";
  let length = 0;
  for (const pm of t.matchAll(/<part id="([^"]+)">([\s\S]*?)<\/part>/g)) {
    const notes: XmlPart["notes"] = [];
    const sung = new Map<XmlNote, Sung>();
    const voiceOf = new Map<XmlNote, string>();
    const lyricNotes: string[] = [];
    const open = new Map<string, [number, number, string]>();
    const pbars: { n: number; on: number }[] = [];
    let divisions = 1;
    let at = 0;
    for (const mm of pm[2].matchAll(/<measure\b([^>]*)>([\s\S]*?)<\/measure>/g)) {
      const num = Number(/number="([^"]+)"/.exec(mm[1])?.[1]);
      const start = at;
      let cursor = start;
      let reach = start;
      let lastOn = start;
      if (Number.isFinite(num)) pbars.push({ n: num, on: start });
      // The measure's elements in order.
      for (const em of mm[2].matchAll(/<(attributes|note|backup|forward)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
        const [, kind, body] = em;
        if (kind === "attributes") {
          const d = tag(body, "divisions");
          if (d) divisions = Number(d);
          const beats = tag(body, "beats");
          const type = tag(body, "beat-type");
          if (!meter && beats && type) meter = `${beats}/${type}`;
          continue;
        }
        const dur = Math.round((Number(tag(body, "duration") ?? 0) / divisions) * TPQ);
        if (kind === "backup") {
          cursor -= dur;
          continue;
        }
        if (kind === "forward") {
          cursor += dur;
          reach = Math.max(reach, cursor);
          continue;
        }
        if (/<grace\b/.test(body) || /<cue\s*\/>/.test(body)) continue;
        const chord = /<chord\s*\/>/.test(body);
        const on = chord ? lastOn : cursor;
        if (!chord) cursor += dur;
        lastOn = on;
        reach = Math.max(reach, on + dur);
        const syl = lyricOf(body, num, lyricNotes);
        if (/<rest\b/.test(body)) {
          if (syl) lyricNotes.push(`bar ${num}: words "${syl.text}" on a rest, left out`);
          continue;
        }
        const p = tag(body, "pitch");
        if (!p) continue;
        const name = `${tag(p, "step")}${ALTER[String(Number(tag(p, "alter") ?? 0))] ?? ""}${tag(p, "octave")}`;
        const voice = tag(body, "voice") ?? "1";
        const stop = /<tie type="stop"\s*\/>/.test(body);
        const begin = /<tie type="start"\s*\/>/.test(body);
        const key = `${voice}:${name}`;
        const prev = open.get(key);
        if (stop && prev && prev[0] + prev[1] === on) {
          prev[1] += dur;
          if (syl) lyricNotes.push(`bar ${num}: words "${syl.text}" on a tied note, left out`);
          if (!begin) open.delete(key);
          continue;
        }
        const n: [number, number, string] = [on, dur, name];
        notes.push(n);
        if (syl && !chord) sung.set(n, syl);
        voiceOf.set(n, voice);
        if (begin) open.set(key, n);
        else open.delete(key);
      }
      at = Math.max(reach, start);
    }
    notes.sort((a, b) => a[0] - b[0]);
    parts.push({ id: pm[1], name: names.get(pm[1]) ?? pm[1], notes, lyrics: melismas(notes, sung, voiceOf, lyricNotes), lyricNotes });
    if (!bars.length) bars = pbars;
    length = Math.max(length, at);
  }
  return { parts, bars, meter: meter || "4/4", length };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescape = (t: string) =>
  t.replace(/&(amp|lt|gt|quot|apos|#(\d+)|#x([0-9a-f]+));/gi, (m, n: string, d?: string, x?: string) => (d ? String.fromCodePoint(Number(d)) : x ? String.fromCodePoint(parseInt(x, 16)) : (ENTITIES[n] ?? m)));

/** D347: a note's syllable of the first verse (the lowest number), if it has words. */
function lyricOf(body: string, bar: number, report: string[]): Sung | null {
  const all = [...body.matchAll(/<lyric\b([^>]*)>([\s\S]*?)<\/lyric>/g)].map((m) => ({ n: Number(/number="(\d+)"/.exec(m[1])?.[1] ?? 1), b: m[2] }));
  if (!all.length) return null;
  all.sort((a, b) => a.n - b.n);
  if (all.length > 1 || all[0].n !== 1) report.push(`bar ${bar}: verse ${all.map((a) => a.n).join("+")}, the first taken`);
  const b = all[0].b;
  // Two texts on one note (an elision) joined by the elision's tie.
  const text = [...b.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => unescape(m[1])).join("‿");
  // A text of underscores only (BWV 228's edition writes "_" on a few tied notes) is an extender, not a syllable.
  if (!text.trim() || /^[_\s]+$/.test(text)) return null;
  const syllabic = (/<syllabic>\s*(single|begin|middle|end)\s*<\/syllabic>/.exec(b)?.[1] ?? "single") as XmlSyllable["syllabic"];
  return { text, syllabic, extend: /<extend\b(?![^>]*type="stop")/.test(b), bar };
}

/**
 * D347: each syllable carried to its melisma's last note: the notes after it that have no words and
 * follow without a rest (a tied note is one note already). Phrases (after a rest) that begin without
 * words are counted, for the report. Within the syllable's own voice of the staff (MusicXML's
 * `<voice>`): BWV 54/1's alto writes a second voice under the sung one in bar 26.
 */
function melismas(all: XmlPart["notes"], sung: Map<XmlNote, Sung>, voiceOf: Map<XmlNote, string>, report: string[]): XmlSyllable[] {
  const out: XmlSyllable[] = [];
  let orphans = 0;
  for (const v of new Set(all.map((n) => voiceOf.get(n)))) {
    const notes = all.filter((n) => voiceOf.get(n) === v);
    if (!notes.some((n) => sung.has(n))) continue;
    for (let i = 0; i < notes.length; i++) {
      const s = sung.get(notes[i]);
      if (!s) {
        const prev = notes[i - 1];
        if (!prev || prev[0] + prev[1] < notes[i][0]) orphans++;
        continue;
      }
      let j = i;
      while (j + 1 < notes.length && !sung.has(notes[j + 1]) && notes[j + 1][0] <= notes[j][0] + notes[j][1]) j++;
      out.push({ ...s, on: notes[i][0], end: notes[j][0] + notes[j][1] });
    }
  }
  if (orphans) report.push(`${orphans} phrase(s) beginning without words`);
  return out.sort((a, b) => a.on - b.on);
}

/**
 * D347: where a word's syllables are written apart though they belong to one word (BWV 228's edition,
 * from Capella, loses the hyphen after a syllable sung to a melisma: "wei" "che" both "single", "er-hal"
 * begin and end then "te" single), the hyphen is read from the same two syllables elsewhere in the
 * score (any part): a syllable written "single" or "end", not ending in punctuation, is joined to the
 * next where those two are written joined (begin or middle, then middle or end) more often than
 * written apart (the next one a "begin"); and where a pair is given by hand (`joins`, "al|ler": words
 * only BWV 228's chorale sings, never written joined anywhere). Punctuation is ignored in comparing. The words themselves are never changed. Returns, per part, which of its
 * syllables a hyphen follows (written or read so), and how many were read so.
 */
export function hyphensOf(parts: XmlPart[], joins: readonly string[] = []): { joined: boolean[][]; inferred: number; pairs: Map<string, number> } {
  const joinedAt = new Map<string, number>();
  const apartAt = new Map<string, number>();
  const bare = (t: string) => t.toLowerCase().replace(/[\p{P}\s]+$/u, "");
  const key = (s: XmlSyllable, nx: XmlSyllable) => `${bare(s.text)}|${bare(nx.text)}`;
  const given = new Set(joins);
  const cont = (s: XmlSyllable) => s.syllabic === "begin" || s.syllabic === "middle";
  for (const p of parts)
    p.lyrics.forEach((s, i) => {
      const nx = p.lyrics[i + 1];
      if (!nx) return;
      const k = key(s, nx);
      if (cont(s) && (nx.syllabic === "middle" || nx.syllabic === "end")) joinedAt.set(k, (joinedAt.get(k) ?? 0) + 1);
      if (!cont(s) && nx.syllabic === "begin") apartAt.set(k, (apartAt.get(k) ?? 0) + 1);
    });
  let inferred = 0;
  const pairs = new Map<string, number>();
  const joined = parts.map((p) =>
    p.lyrics.map((s, i) => {
      if (cont(s)) return true;
      const nx = p.lyrics[i + 1];
      if (!nx || /[\p{P}]$/u.test(s.text)) return false;
      const pair = key(s, nx);
      // Joined elsewhere more often than written apart (a slip joining "bei" to "dei-nem" once is outvoted).
      // A pair given by hand (a word only the chorale sings, never written joined: "al" "ler") is joined too.
      if ((joinedAt.get(pair) ?? 0) <= (apartAt.get(pair) ?? 0) && !given.has(pair)) return false;
      inferred++;
      pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
      return true;
    }),
  );
  return { joined, inferred, pairs };
}
