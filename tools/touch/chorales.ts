/**
 * D340 (WTC 1.54): writes data/touch/chorales.json, the CHORALES tab's pieces: Bach's 370 four-part
 * chorales as the chorale mode reads them (data/chorales/bach/chorales/bach_NNN.json, from Craig Stuart
 * Sapp's Humdrum edition, CC BY-NC-SA 4.0: data/sources/bach-370-chorales/SOURCE.md), in the touch
 * game's shape (src/touch/fugue.ts TouchFugue): the four voices (any may be played), tied notes joined,
 * as written (repeats not taken).
 * THE FERMATAS (D1006, the owner's option b: "fewer fermata slowdowns in the chorales"): two are HELD, the
 * final one and the one that closes the Stollen (the first section, where the source marks it repeated: A A B):
 * held one beat longer than written (the chord under it held, the music after it moved a beat later, the bar it
 * ends kept one beat long), and the tick where the music goes on after it kept (`fermatas`): there the band waits
 * for the player's next note (BAND TIME's WAITS, band-time.ts, D328; `bandTime: "waits"`). Every other fermata
 * plays in time, with a short breath: the chord under it let go an eighth of a beat early (no time added, no wait).
 * Computed as for the other pieces: the cadences, the keys they reach (brought home at the end).
 * Run: node tools/touch/chorales.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import { findCadences, homeward, keySpeller, type Note } from "./analysis.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = `${ROOT}data/chorales/bach/chorales/`;

interface CNote {
  pitch?: string;
  midi?: number;
  duration: string;
  offset: string;
  measure: number;
  tie?: "start" | "continue" | "stop";
  fermata?: boolean;
  rest?: boolean;
}
interface Chorale {
  id: string;
  number: number;
  bwv: string | null;
  title: { de: string | null; en: string | null };
  key: { tonic: string; mode: "major" | "minor" };
  meters: { meter: string; offset: string; measure: number }[];
  measures: { number: number; offset: string }[];
  length: string;
  voices: Record<"soprano" | "alto" | "tenor" | "bass", CNote[]>;
  /** The form as the source marks it (A A B: the Stollen repeated, the Abgesang), where it does; its sections. */
  expansion?: { full?: string[] };
  sections?: { label: string; offset: string }[];
}

const ticks = (f: string) => {
  const [n, d] = f.split("/").map(Number);
  return Math.round((n / d) * 4 * TPQ);
};
export const CHORALE_CREDIT = "CHORALE: CRAIG STUART SAPP, BACH-370-CHORALES (DÖRFFEL, BREITKOPF & HÄRTEL C. 1875) · CC BY-NC-SA 4.0";
/** D728: the words' edition (data/sources/chorale-lyrics/SOURCE.md), named on the chorales that carry them. */
export const WORDS_CREDIT = "WORDS: GERTIM ALBERDA AND JOHANNES HENTSCHEL, 389 CHORALE SETTINGS (BREITKOPF 1898) · CC BY-NC-SA 4.0";

/** D728: a setting's voice from data/sources/chorale-lyrics/alberda.json: each attack's MIDI and its syllables by verse ("0", "1": [text, syllabic]). */
type Attack = [number, Record<string, [string, string]>?];
interface Worded {
  setting: string;
  tier: string;
  voices: (Attack[] | null)[];
}
const WORDS: Record<string, Worded> = JSON.parse(readFileSync(`${ROOT}data/sources/chorale-lyrics/alberda.json`, "utf8"));
/** D728: what laying the words found, each chorale's (the importer's report). */
export const WORDS_REPORT: { id: string; voice: number; laid: number; lost: number }[] = [];

/**
 * D728: a voice's words laid on its notes: the setting's attacks matched to ours in order by pitch (the longest common
 * sequence: where the two editions' versions differ, a note one of them lacks is passed over), each matched attack's
 * syllable on our note, held to the end of the last note before the next syllable (its melisma); verse 1 as the words
 * sung, and verse 2 where a repeated section has its own line; packed as packLyrics (more-bach.ts) packs them.
 */
export function layWords(notes: readonly Note[], attacks: readonly Attack[]): { verses: (number | string)[][]; laid: number; lost: number; shift: number; stanzas: string[] } {
  const n = notes.length;
  const m = attacks.length;
  // The setting may stand in another key (another version of the tune): matched at the transposition that matches most.
  const table = (shift: number) => {
    const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--) L[i][j] = notes[i][2] === attacks[j][0] + shift ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    return L;
  };
  let shift = 0;
  let L = table(0);
  for (let k = -12; k <= 12; k++) {
    if (k === 0) continue;
    const T = table(k);
    if (T[0][0] > L[0][0]) (L = T), (shift = k);
  }
  const at = new Map<number, number>();
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (notes[i][2] === attacks[j][0] + shift && L[i][j] === L[i + 1][j + 1] + 1) (at.set(j, i), i++, j++);
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  let lost = 0;
  let laid = 0;
  const stanzas: string[] = [];
  // Each note's lines in order: its first its words; a second only where the setting writes two (a repeated section's second pass).
  const lines = (a: Attack) => Object.keys(a[1] ?? {}).sort((x, y) => Number(x) - Number(y)).map((k) => a[1]![k]);
  const verses = [0, 1].map((verse) => {
    const syl: { i: number; text: string; joined: boolean }[] = [];
    attacks.forEach((a, j) => {
      const s = lines(a)[verse];
      if (!s) return;
      const i = at.get(j);
      if (i === undefined) {
        if (verse === 0) lost++;
        return;
      }
      if (verse === 0) laid++;
      // The edition's stanza label before a line's first word ("1. Ach", "Text 2: Ein"): not sung; the stanza kept.
      const m = /^(?:Text\s*(\d+)\s*:|(\d+)\*?\.)[\s\u00a0]*(.*)$/.exec(s[0]);
      if (m) stanzas.push(m[1] ?? m[2]);
      syl.push({ i, text: m ? m[3] : s[0], joined: s[1] === "begin" || s[1] === "middle" });
    });
    const out: (number | string)[] = [];
    let last = 0;
    syl.forEach((x, k) => {
      const upTo = k + 1 < syl.length ? syl[k + 1].i : n;
      const endNote = notes[Math.max(x.i, upTo - 1)];
      const on = notes[x.i][0];
      out.push(on - last, endNote[0] + endNote[1] - on, x.joined ? `${x.text}-` : x.text);
      last = on;
    });
    return out;
  });
  return { verses, laid, lost, shift, stanzas: [...new Set(stanzas)] };
}

/**
 * D1006: the fermatas held (ticks as written): the final one, and the Stollen's close: the Stollen the first section, or the
 * second where the first is only a pickup (shorter than a bar), where the source marks it repeated (expansion A A …, or
 * with first and second endings, A A1 A A2 …); its close the latest fermata ending within a bar before the repeat
 * (the next section, or the second ending).
 */
export function heldFermatas(c: Pick<Chorale, "expansion" | "sections">, marks: readonly number[], bar: number): number[] {
  const held = new Set<number>();
  if (marks.length) held.add(marks[marks.length - 1]);
  const full = c.expansion?.full;
  const secs = (c.sections ?? []).map((x) => ({ label: x.label, on: ticks(x.offset) })).sort((x, y) => x.on - y.on);
  const at = (label: string) => secs.find((x) => x.label === label);
  if (full && secs.length) {
    // The Stollen: the first section, or the second after a pickup.
    const first = at(full[0]);
    const afterFirst = first ? secs.find((y) => y.on > first.on)?.on : undefined;
    const i = full.length > 1 && full[1] !== full[0] && first && afterFirst !== undefined && afterFirst - first.on < bar ? 1 : 0;
    const x = full[i];
    const plain = full[i + 1] === x;
    const volta = full[i + 1] === `${x}1` && full[i + 2] === x && full[i + 3] === `${x}2`;
    const start = at(x);
    const bound = plain && start ? secs.find((y) => y.on > start.on)?.on : volta ? at(`${x}2`)?.on : undefined;
    if (bound !== undefined) {
      const close = marks.filter((m) => m <= bound && bound - m <= bar).at(-1);
      if (close !== undefined) held.add(close);
    }
  }
  return [...held].sort((a, b) => a - b);
}

export function chorale(c: Chorale) {
  const meter = c.meters[0].meter;
  const [num, den] = meter.split("/").map(Number);
  const beat = (4 * TPQ) / den;
  const spelled: string[] = [];
  const spell: Record<number, string> = {};
  // Each voice: [on, dur, midi, step], ties joined; the fermatas' ends.
  const ends = new Set<number>();
  const voices: Note[][] = (["soprano", "alto", "tenor", "bass"] as const).map((name) => {
    const out: Note[] = [];
    let open: Note | null = null;
    for (const n of c.voices[name]) {
      const on = ticks(n.offset);
      const dur = ticks(n.duration);
      if (n.fermata) ends.add(on + dur);
      if (n.rest || !n.pitch || n.midi === undefined) {
        open = null;
        continue;
      }
      if (open && (n.tie === "stop" || n.tie === "continue") && open[2] === n.midi && open[0] + open[1] === on) {
        open[1] += dur;
        if (n.tie === "stop") open = null;
        continue;
      }
      const note: Note = [on, dur, n.midi, parsePitch(n.pitch).diatonic];
      spell[n.midi] ??= n.pitch;
      spelled.push(n.pitch);
      out.push(note);
      open = n.tie === "start" ? note : null;
    }
    return out;
  });
  // A fermata's end: where some voice's fermata note ends; a cluster of them (the voices' fermatas a
  // little apart) counts once, at the latest.
  const all = [...ends].sort((a, b) => a - b).filter((t, i, a) => !(i + 1 < a.length && a[i + 1] - t < beat));
  // D1006: the held ones: the last, and the Stollen's close (the latest fermata within a bar before the section that
  // follows the repeated first one).
  const marks = heldFermatas(c, all, (num * 4 * TPQ) / den);
  // Hold each one a beat: every note from its end on moves a beat later (all the earlier holds too),
  // the notes sounding into it are held a beat longer. The others: a breath, the chord under them let go early.
  const breath = beat / 8;
  const shiftAt = (t: number) => marks.filter((m) => m <= t).length * beat;
  for (const v of voices)
    for (const n of v) {
      const end = n[0] + n[1];
      const held = marks.some((m) => m === end);
      const breathe = !held && all.includes(end) && n[1] > 4 * breath;
      n[0] += shiftAt(n[0]);
      n[1] = end + shiftAt(end - 1) + (held ? beat : 0) - n[0] - (breathe ? breath : 0);
    }
  const fermatas = marks.map((m) => m + shiftAt(m));
  const lengthAsWritten = ticks(c.length);
  const length = lengthAsWritten + shiftAt(lengthAsWritten);
  const bars = c.measures.map((m) => ({ n: m.number, on: ticks(m.offset) + shiftAt(ticks(m.offset)) })).filter((b) => b.on < length);
  const key = c.key.mode === "minor" ? c.key.tonic.toLowerCase() : c.key.tonic;
  const piece = { tpq: TPQ, meter, bars, length, voices, key };
  const speller = keySpeller(spelled);
  const cadences = findCadences(piece, speller);
  const name = c.title.de ?? c.title.en ?? `Chorale ${c.number}`;
  const f = {
    id: `chor${String(c.number).padStart(3, "0")}`,
    kind: "fugue" as const,
    book: 4,
    number: c.number,
    title: name,
    key,
    bwv: c.bwv ?? "",
    meter,
    tpq: TPQ,
    length,
    barTicks: (num * 4 * TPQ) / den,
    bars,
    voiceNames: ["Soprano", "Alto", "Tenor", "Bass"],
    voices,
    entries: [],
    keys: cadences.map((x) => ({ on: x.on, key: x.key })),
    spell,
    sections: [{ name: "Whole", fromBar: bars[0]?.n ?? 0, toBar: bars.at(-1)?.n ?? 1, from: 0, to: length }],
    cadences,
    countersubject: [],
    collection: "chorale",
    short: `CHORALE ${c.number}`,
    credit: CHORALE_CREDIT,
    source: `https://github.com/craigsapp/bach-370-chorales/blob/main/kern/chor${String(c.number).padStart(3, "0")}.krn`,
    fermatas,
    bandTime: "waits",
    defaultVoice: 0,
  };
  homeward(f);
  if (!f.keys.length) f.keys = [{ on: 0, key }];
  // D728: the words, where the 389 have this chorale: verse 1 on each voice the setting gives words, verse 2 where it has one.
  const w = WORDS[f.id];
  if (!w) return f;
  const laid = w.voices.map((a, vi) => {
    if (!a) return null;
    const r = layWords(voices[vi], a);
    WORDS_REPORT.push({ id: f.id, voice: vi, laid: r.laid, lost: r.lost });
    return r;
  });
  const second = laid.map((r) => r?.verses[1] ?? []);
  return {
    ...f,
    credit: `${CHORALE_CREDIT} · ${WORDS_CREDIT}`,
    lyrics: laid.map((r) => r?.verses[0] ?? []),
    ...(second.some((v) => v.length) ? { lyricsSecond: second } : {}),
    words: { setting: w.setting, match: w.tier, ...(laid[0]?.stanzas.length ? { stanzas: laid[0].stanzas } : {}) },
  };
}

export function allChorales() {
  return readdirSync(DIR)
    .filter((f) => /^bach_\d+\.json$/.test(f))
    .sort()
    .map((f) => chorale(JSON.parse(readFileSync(`${DIR}${f}`, "utf8"))));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = allChorales();
  writeFileSync(`${ROOT}data/touch/chorales.json`, JSON.stringify(out) + "\n");
  const n = out.reduce((t, f) => t + f.voices.flat().length, 0);
  console.log(`wrote data/touch/chorales.json: ${out.length} chorales, ${n} notes, ${out.reduce((t, f) => t + f.fermatas.length, 0)} fermatas held (${out.filter((f) => f.fermatas.length >= 2).length} with a Stollen hold)`);
  // D728: the words laid, and any the setting has that found no note of ours (its version differing there).
  const sop = WORDS_REPORT.filter((r) => r.voice === 0);
  const sum = (rs: typeof WORDS_REPORT, k: "laid" | "lost") => rs.reduce((t, r) => t + r[k], 0);
  console.log(`words: ${sop.length} chorales' sopranos, ${sum(sop, "laid")} syllables laid, ${sum(sop, "lost")} lost; ${WORDS_REPORT.length - sop.length} lower voices, ${sum(WORDS_REPORT.filter((r) => r.voice > 0), "laid")} laid, ${sum(WORDS_REPORT.filter((r) => r.voice > 0), "lost")} lost`);
  for (const r of WORDS_REPORT.filter((x) => x.lost > 0).sort((a, b) => b.lost - a.lost).slice(0, 12)) console.log(`  ${r.id} v${r.voice}: ${r.laid} laid, ${r.lost} lost`);
  for (const f of out.slice(0, 3)) console.log(`  ${f.id} ${f.title} ${f.key} ${f.meter} bars ${f.bars.length} fermatas ${f.fermatas.length} cadences ${f.cadences.length}`);
}
