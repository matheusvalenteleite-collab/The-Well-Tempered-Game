/**
 * D500: the intro's B-A-C-H on STRING CONSORT's cello, each note its own bow (no slurs), then BAROQUE
 * BAND's close from the cello's D: the tonic minor, the dominant with a prepared 4–3 suspension and its
 * seventh, the perfect cadence into D major, voiced without parallel fifths or octaves.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

type N = { part: string; midi: number; at: number; len: number };
const pc = (m: number) => ((m % 12) + 12) % 12;
const CONSONANT = new Set([0, 3, 4, 7, 8, 9]);

async function parts() {
  const m = await import("../src/bench/intro-sound.ts");
  // The cello's line in seconds from the D, a part with the band's.
  const solo: N[] = m.bachNotes().map((x) => ({ part: "solo", midi: x.midi, at: x.at - m.INTRO_RESOLVE_S, len: x.len }));
  const all: N[] = [...solo, ...m.INTRO_BAND.map((x) => ({ ...x }))];
  const names = [...new Set(all.map((x) => x.part))];
  const at = (part: string, t: number) => all.find((x) => x.part === part && x.at <= t + 1e-9 && t < x.at + x.len - 1e-9);
  const onsets = [...new Set(all.map((x) => +x.at.toFixed(6)))].sort((a, b) => a - b);
  return { m, all, names, at, onsets };
}

test("D500: no parallel fifths or octaves (or unisons) between any two parts, the cello's line among them", async () => {
  const { names, at, onsets } = await parts();
  const bad: string[] = [];
  for (let k = 1; k < onsets.length; k++) {
    const [t0, t1] = [onsets[k - 1], onsets[k]];
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        const [a0, a1, b0, b1] = [at(names[i], t0), at(names[i], t1), at(names[j], t0), at(names[j], t1)];
        if (!a0 || !a1 || !b0 || !b1 || a0.midi === a1.midi || b0.midi === b1.midi) continue;
        const [i0, i1] = [pc(Math.abs(a0.midi - b0.midi)), pc(Math.abs(a1.midi - b1.midi))];
        if (i0 === i1 && (i0 === 0 || i0 === 7)) bad.push(`${names[i]}/${names[j]} ${t0}→${t1}`);
      }
  }
  assert.deepEqual(bad, []);
});

test("D500: a 4–3 suspension over the dominant, prepared, struck as the bass moves, held ≥ 0.5 s, resolved down by step", async () => {
  const { m, all, at } = await parts();
  const bass = all.filter((x) => x.part === "cello");
  const found = all.filter((s) => {
    if (s.part === "cello" || s.part === "solo") return false;
    const change = bass.find((b) => b.at > s.at + 1e-9 && b.at < s.at + s.len - 1e-9);
    if (!change) return false;
    const prep = at("cello", s.at)!;
    const next = all.find((x) => x.part === s.part && Math.abs(x.at - (s.at + s.len)) < 1e-9);
    if (!next) return false;
    const under = at("cello", next.at)!;
    return (
      CONSONANT.has(pc(s.midi - prep.midi)) && // prepared: a consonance
      pc(s.midi - change.midi) === 5 && // struck: the 4th over the new bass
      s.at + s.len - change.at >= 0.5 && // heard
      s.midi - next.midi >= 1 && s.midi - next.midi <= 2 && // resolved down by step
      under === change && pc(next.midi - under.midi) === 4 // onto the dominant's major third
    );
  });
  assert.equal(found.length, 1, "one suspension");
  const s = found[0];
  assert.equal(pc(s.midi), 2, "the D held over A");
  assert.equal(pc(at("cello", s.at + s.len)!.midi), 9, "over the dominant, A");
  // Nothing else sounds the resolution's C♯ while the 4th is held.
  const change = bass.find((b) => b.at > s.at && b.at < s.at + s.len)!;
  for (let t = change.at; t < s.at + s.len - 1e-6; t += 0.05) for (const p of new Set(all.map((x) => x.part))) assert.notEqual(pc(at(p, t)?.midi ?? -1), 1, `${p} sounds C♯ against the suspension at ${t}`);
  assert.ok(m.CAD_RESOLVE_S - m.CAD_DOMINANT_S >= 0.5);
});

test("D500: the perfect cadence: A → D in the bass, the dominant's seventh resolving down, the last chord D major, the third once", async () => {
  const { m, all, names, at } = await parts();
  const last = Math.max(...all.map((x) => x.at));
  assert.equal(last, m.CAD_TONIC_S);
  const fin = names.map((p) => at(p, last)).filter((x): x is N => !!x);
  assert.deepEqual([...new Set(fin.map((x) => pc(x.midi)))].sort((a, b) => a - b), [2, 6, 9], "D major");
  assert.equal(pc(at("cello", last)!.midi), 2);
  assert.equal(pc(at("cello", last - 0.01)!.midi), 9, "from the dominant");
  assert.equal(fin.filter((x) => pc(x.midi) === 6).length, 1, "the Picardy third not doubled");
  assert.equal(pc(at("violin", last)!.midi), 6, "the violin on F♯");
  const dom = names.map((p) => at(p, last - 0.01)).filter((x): x is N => !!x);
  assert.equal(dom.filter((x) => pc(x.midi) === 1).length, 1, "the leading tone not doubled");
  // The seventh (G) resolves down to F♯ in its own part; the leading tone up to D.
  const sev = dom.find((x) => pc(x.midi) === 7)!;
  assert.equal(at(sev.part, last)!.midi, sev.midi - 1);
  const lt = dom.find((x) => pc(x.midi) === 1)!;
  assert.equal(at(lt.part, last)!.midi, lt.midi + 1);
  // The first chord the tonic minor under the cello's D, the minor third become the Picardy third in the same part.
  const first = names.map((p) => at(p, 0)).filter((x): x is N => !!x);
  assert.deepEqual([...new Set(first.map((x) => pc(x.midi)))].sort((a, b) => a - b), [2, 5, 9]);
  assert.equal(pc(at("violin", 0)!.midi), 5);
  // The parts never cross; the harpsichord's right hand between the bass and the viola.
  for (const t of [0, m.CAD_DOMINANT_S, m.CAD_RESOLVE_S, m.CAD_SEVENTH_S, m.CAD_TONIC_S]) {
    const order = ["violin", "oboe", "viola", "rhUpper", "rhLower", "cello"].map((p) => at(p, t)!.midi);
    assert.ok(order.every((x, i) => i === 0 || x < order[i - 1]), `no crossing at ${t}`);
  }
});

test("D500: the cello's line: each note its own bow, a little apart, the H longest, C♯ → D on the band's first chord", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const notes = m.bachNotes();
  assert.deepEqual(notes.slice(-2).map((x) => x.midi), [61, 62], "C♯ → D");
  assert.equal(m.INTRO_PRESET.slots?.[0], "consCello");
  for (let i = 1; i < notes.length; i++) {
    const gap = notes[i].at - (notes[i - 1].at + notes[i - 1].len);
    assert.ok(gap >= 0.04 && gap <= 0.1, `a slight separation before note ${i}`);
  }
  const lens = notes.slice(0, 5).map((x) => x.len);
  assert.equal(Math.max(...lens), lens[3], "the H the longest");
  assert.ok(notes.every((x) => x.midi >= 48 && x.midi <= 67), "the cello's comfortable register");
  // The cadence and the page: the title page gone as the tonic lands; the close rings on over the selection.
  assert.ok(m.INTRO_CROSS_S >= m.CAD_TONIC_S && m.INTRO_CROSS_S <= m.CAD_TONIC_S + 0.5, "the title page gone as the tonic lands");
  assert.ok(m.CAD_TONIC_S - m.INTRO_LOOKAHEAD_S < m.INTRO_CROSS_S, "the tonic handed to the chip while the intro's sound still plays");
  assert.ok(m.INTRO_TAIL_S - m.CAD_TONIC_S >= 2.5, "the tonic held, then faded");
  assert.ok(m.INTRO_S <= 10);
  // The cello's D gone before the bass moves to A (it would double the suspension against its resolution).
  assert.ok(notes[5].len < m.CAD_DOMINANT_S);
});
