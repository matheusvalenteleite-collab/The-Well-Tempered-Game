/**
 * D851, THE SOLO OVER THE RIPIENO: the player's line against the band in the many-voiced pieces (the harpsichord concertos,
 * BWV 1043, BWV 54), from scan.cjs's renders.
 *
 * Two kinds of scan are read:
 *   - the per-voice scan (scan.cjs, PLAYABLE=1: the player alone in each playable voice, each band voice alone, raw): the
 *     existing measure (D508's lost voice: the player more than STRETCH_DB under the loudest band voice in a 2-s stretch,
 *     LOST for STRETCH_SEGS in a row), and the band's voices summed block by block (`blk`, about 0.1 s), with a balance
 *     applied offline: which band voice is loudest where the player is under the band;
 *   - the mix scan (scan.cjs, MIX=1, APPLIED=1: the player alone and the whole band together, as the game applies its
 *     balance): the player's margin over the band's sum, block by block, as it sounds (the band summed through its chain).
 *
 * The margin: in each block where the score has the player's voice sounding (and heard: D508's gate), the player's level
 * minus the band's (dB), on the phone path through the phone speaker model (scan.cjs `Ph`: two 550 Hz high-passes and a
 * shelf), on the computer's K-weighted. Reported per run: the median margin, its 10th percentile, the share of blocks
 * where the player is under the band's sum (margin < 0), and the masked share (the 2-s stretches the player is more than
 * STRETCH_DB under the loudest band voice).
 *
 * usage: node tools/touch/player-lift/solo.ts voices <scan.json...>        the per-voice report (before: the game's balance)
 *        node tools/touch/player-lift/solo.ts mix <scan.json...>           the mix report
 *        VOICES=<per-voice scans> node tools/touch/player-lift/solo.ts build <phone mix> <computer mix>
 *                                       SOLO_LOUD (src/touch/player-lift-solo.ts) from calibration mix scans (scan.cjs MIX=1
 *                                       APPLIED=1 SOLOCAL=1: the band as D851 plays it, the player at 0 dB), the bass floored
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fugueById, loadExtras } from "../../../src/touch/fugue.ts";
import { PIECE_SOUND } from "../../../src/touch/piece-sound.ts";
import { patchIdFor, pieceLineUp, setPieceLayout, setPreset } from "../../../src/touch/sound.ts";
import { balanceOf, bandTrimDb, liftDb, SOLO_TARGET_DB, SOLO_LIFT_MAX_DB, SOLO_LIFT_MIN_DB } from "../../../src/touch/player-lift.ts";

await loadExtras();

type Tap = { windows: number; K: number; Ph: number; seg?: (number | null)[]; segK?: (number | null)[]; blk?: [number, number][]; bsnd?: number[] };
type Run = { id: string; voice: number; sound: string; phone: boolean; voices: Record<string, Tap> };

const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
};
const db = (x: number) => 10 * Math.log10(x);
/** D508's lost voice (build.ts): more than this under the loudest sounding voice in a 2-s stretch. */
const STRETCH_DB = 6;
const STRETCH_SEGS = 4;
/**
 * D852: what SUPER 16-BIT's continuo shelf on a phone (sound.ts CONSOLE_CELLO_PHONE_LIFT, +6 dB from 700 Hz) adds to the
 * cello alone on the phone model (dB): measured with tools/touch/bass-phone/render.cjs and measure.py's filter (ebur128 after
 * two 600 Hz high-passes), the continuo alone, the first 60 s: BWV 1052/I +4.0, BWV 1057/I +4.5 (with and without the shelf).
 */
const CELLO_SHELF_DB = 4.3;
/** D852: a continuo's floor (dB) from D645's renders where the per-voice estimate fell short (see build). */
const BASS_MEASURED_FLOOR: Readonly<Record<string, number>> = { "bwv54-3": 2 };

export type Margins = { n: number; med: number; p10: number; under: number; masked?: number; lost?: number; maskers?: Record<string, number> };

/** The margins of one run's blocks: `p` the player's [K, Ph] energy, `b` the band's, `snd` where the player sounds. */
function margins(p: [number, number][], b: [number, number][], snd: number[], phone: boolean, lift = 0): { xs: number[]; idx: number[] } {
  const j = phone ? 1 : 0;
  const xs: number[] = [], idx: number[] = [];
  for (let i = 0; i < Math.min(p.length, b.length); i++) {
    if (!snd[i] || !(p[i][j] > 0) || !(b[i][j] > 0)) continue;
    xs.push(db(p[i][j]) + lift - db(b[i][j]));
    idx.push(i);
  }
  return { xs, idx };
}

/** The per-voice scan: the band's voices summed with the trims `t` (dB per voice), the player with `l` (dB). */
function voicesRun(r: Run, t: readonly number[], l: number): Margins {
  const P = r.voices.P;
  const n = Math.max(...Object.keys(r.voices).filter((k) => /^v\d+$/.test(k)).map((k) => +k.slice(1))) + 1;
  const len = P.blk!.length;
  const band: [number, number][] = Array.from({ length: len }, () => [0, 0]);
  for (let u = 0; u < n; u++) {
    const T = r.voices[`v${u}`];
    if (!T?.blk) continue;
    const g = 10 ** ((t[u] ?? 0) / 10);
    for (let i = 0; i < len && i < T.blk.length; i++) (band[i][0] += T.blk[i][0] * g), (band[i][1] += T.blk[i][1] * g);
  }
  const { xs, idx } = margins(P.blk!, band, P.bsnd!, r.phone, l);
  // which band voice is loudest where the player is under the band's sum
  const maskers: Record<string, number> = {};
  const j = r.phone ? 1 : 0;
  let under = 0;
  xs.forEach((x, k) => {
    if (x >= 0) return;
    under++;
    const i = idx[k];
    let best = -1, e = 0;
    for (let u = 0; u < n; u++) {
      const T = r.voices[`v${u}`];
      const x2 = (T?.blk?.[i]?.[j] ?? 0) * 10 ** ((t[u] ?? 0) / 10);
      if (x2 > e) (e = x2), (best = u);
    }
    if (best >= 0) maskers[best] = (maskers[best] ?? 0) + 1;
  });
  for (const k of Object.keys(maskers)) maskers[k] = Math.round((100 * maskers[k]) / Math.max(1, under));
  // D508's measure, 2-s stretch by stretch: the player (with l) more than STRETCH_DB under the loudest band voice (with its trim)
  const seg = (T: Tap | undefined) => (r.phone ? T?.seg : (T?.segK ?? T?.seg))?.map((x) => (x != null && x < -90 ? null : x));
  const ps = seg(P) ?? [];
  let masked = 0, count = 0, run = 0, lost = 0;
  for (let i = 0; i < ps.length; i++) {
    const me = ps[i];
    if (me == null) { run = 0; continue; }
    count++;
    let loud = -Infinity;
    for (let u = 0; u < n; u++) {
      const x = seg(r.voices[`v${u}`])?.[i];
      if (x != null) loud = Math.max(loud, x + (t[u] ?? 0));
    }
    const m = loud - (me + l) > STRETCH_DB;
    if (m) masked++;
    run = m ? run + 1 : 0;
    if (run === STRETCH_SEGS) lost++;
  }
  return { n: xs.length, med: r1(pct(xs, 50)), p10: r1(pct(xs, 10)), under: Math.round((100 * under) / Math.max(1, xs.length)), masked: Math.round((100 * masked) / Math.max(1, count)), lost, maskers };
}

/** The mix scan: the player's render against the whole band's. */
function mixRun(r: Run, lift = 0): Margins {
  const { xs } = margins(r.voices.P.blk!, r.voices.B.blk!, r.voices.P.bsnd!, r.phone, lift);
  return { n: xs.length, med: r1(pct(xs, 50)), p10: r1(pct(xs, 10)), under: Math.round((100 * xs.filter((x) => x < 0).length) / Math.max(1, xs.length)) };
}

const load = (fs: string[]): Record<string, Run> => Object.assign({}, ...fs.map((f) => JSON.parse(readFileSync(f, "utf8"))));
const [mode, ...files] = process.argv.slice(2);
const nameOf = (id: string, v: number) => fugueById(id).voiceNames?.[v] ?? `v${v}`;

if (mode === "voices") {
  // The game's balance as it stands (balanceOf), and none (raw), on each run.
  const R = load(files);
  console.log("piece | voice | path | raw: med p10 under% masked% lost | game's balance (l; trims): med p10 under% masked% lost | maskers (where under, % of blocks)");
  for (const [k, r] of Object.entries(R)) {
    if (k.includes("#mix")) continue;
    const f = fugueById(r.id);
    const n = f.voices.length;
    const t = f.voices.map((_, u) => bandTrimDb(r.id, r.sound, u, n, r.phone));
    const l = liftDb(r.id, r.sound, r.voice, n, r.phone);
    const raw = voicesRun(r, Array(n).fill(0), 0);
    const g = voicesRun(r, t, l);
    const ms = Object.entries(g.maskers ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([u, x]) => `${nameOf(r.id, +u)} ${x}%`).join(", ");
    console.log(`${r.id} | ${nameOf(r.id, r.voice)} | ${r.phone ? "phone" : "computer"} | ${raw.med} ${raw.p10} ${raw.under} ${raw.masked} ${raw.lost} | (l ${r1(l)}; t ${t.map(r1).join(",")}) ${g.med} ${g.p10} ${g.under} ${g.masked} ${g.lost} | ${ms}`);
  }
} else if (mode === "mix") {
  const R = load(files);
  console.log("piece | voice | path | applied | blocks | med p10 under%");
  for (const [k, r] of Object.entries(R)) {
    if (!k.includes("#mix")) continue;
    const m = mixRun(r);
    console.log(`${r.id} | ${nameOf(r.id, r.voice)} | ${r.phone ? "phone" : "computer"} | ${(r as Run & { applied?: boolean }).applied ? "applied" : "raw"} | ${m.n} | ${m.med} ${m.p10} ${m.under}`);
  }
} else if (mode === "build") {
  // SOLO_LOUD from calibration mix scans (the new band, the player raw): per piece and playable voice, the player's level
  // that puts the median of its margin at SOLO_TARGET_DB on each path (within SOLO_LIFT_MIN_DB..SOLO_LIFT_MAX_DB).
  // On a phone the bass floored (D645, D703's way): from the per-voice scans (VOICES=<a.json,b.json>: each voice alone, its
  // level through the phone model), the continuo brought up by half a dB until it is within BASS_GAP_DB - 0.5 of the loudest
  // voice alone in every run (the player at its level), the player's level then raised by what the bass adds to the band.
  const [phoneF, deskF] = files;
  const ph = load([phoneF]);
  const dk = deskF ? load([deskF]) : {};
  const V = load((process.env.VOICES ?? "").split(",").filter(Boolean));
  const rows: Record<string, { s: string; v: number[]; l: number[]; d?: number[]; tb?: number; m: number[]; md?: number[] }> = {};
  // (TARGET=<dB>: another target, for comparing; the calibration scans made with the cello's shelf already in: CALSHELF=1)
  const TARGET = process.env.TARGET !== undefined ? +process.env.TARGET : SOLO_TARGET_DB;
  const calShelf = process.env.CALSHELF === "1";
  const clampL = (x: number) => r1(Math.max(SOLO_LIFT_MIN_DB, Math.min(SOLO_LIFT_MAX_DB, x)));
  for (const r of Object.values(ph)) {
    if (!r.voices.B) continue;
    // (a piece on another sound than its own, a trial's: keyed `<piece>@<sound>`)
    const key = r.sound === PIECE_SOUND[r.id] ? r.id : `${r.id}@${r.sound}`;
    const row = (rows[key] ??= { s: r.sound, v: [], l: [], m: [] });
    const m = mixRun(r);
    row.v.push(r.voice);
    row.m.push(m.med);
    row.l.push(clampL(TARGET - m.med));
  }
  for (const [key, row] of Object.entries(rows)) {
    const id = key.split("@")[0];
    const runs = row.v.map((v) => Object.values(V).find((r) => r.id === id && r.sound === row.s && r.voice === v && !r.voices.B));
    if (runs.some((r) => !r)) { console.error(`${key}: no per-voice scan for every voice: no bass floor`); continue; }
    const n = fugueById(id).voices.length, bass = n - 1;
    const lv = (t: Tap | undefined) => (t && t.windows > 50 && Number.isFinite(t.Ph) ? t.Ph : -Infinity);
    // a continuo that does not play (BWV 1061's Largo, the two harpsichords alone): no floor
    if (runs.every((r) => r!.voice !== bass && lv(r!.voices[`v${bass}`]) === -Infinity)) continue;
    // the continuo's phone shelf (sound.ts CONSOLE_CELLO_PHONE_LIFT) on SUPER 16-BIT, as it adds on the phone model
    // (only where the continuo is seated on that cello: BWV 54's second aria has it on the bassoon)
    setPreset(row.s);
    setPieceLayout(pieceLineUp(row.s, fugueById(id)));
    const shelf = patchIdFor(bass, n) === "s16Cello" ? CELLO_SHELF_DB : 0;
    setPieceLayout(null);
    const gapOf = (i: number, tb: number) => {
      const r = runs[i]!;
      // (the player on the continuo itself, BWV 54's: the bass is the player's line at its level, D645's player run)
      if (r.voice === bass) return Math.max(...[...Array(bass).keys()].map((u) => lv(r.voices[`v${u}`]))) - (lv(r.voices.P) + row.l[i]);
      const others = [lv(r.voices.P) + row.l[i], ...[...Array(bass).keys()].filter((u) => u !== r.voice).map((u) => lv(r.voices[`v${u}`]))];
      return Math.max(...others) - (lv(r.voices[`v${bass}`]) + tb + shelf);
    };
    // what the bass's trim adds to the band's sum where the player sounds (the median, dB)
    const addOf = (i: number, tb: number) => {
      const r = runs[i]!, P = r.voices.P, len = P.blk!.length;
      const xs: number[] = [];
      for (let k = 0; k < len; k++) {
        if (!P.bsnd![k]) continue;
        let B = 0;
        for (let u = 0; u < n; u++) B += r.voices[`v${u}`]?.blk?.[k]?.[1] ?? 0;
        const b = r.voices[`v${bass}`]?.blk?.[k]?.[1] ?? 0;
        // (the calibration's bass already shelved: its trim on the shelved level; else both added)
        const add = calShelf ? 10 ** (shelf / 10) * (10 ** (tb / 10) - 1) : 10 ** ((tb + shelf) / 10) - 1;
        if (B > 0) xs.push(db((B + b * add) / B));
      }
      return pct(xs, 50) || 0;
    };
    const base = [...row.l];
    let tb = 0;
    row.l = base.map((x, i) => clampL(x + addOf(i, 0)));
    for (let k = 0; k < 24 && tb < 6 && Math.max(...row.v.map((_, i) => gapOf(i, tb))) > 6 - 0.5; k++) {
      tb = r1(tb + 0.5);
      row.l = base.map((x, i) => clampL(x + addOf(i, tb)));
    }
    // D645's own measure where it read the estimate wrong (bass-phone/render.cjs, measure.py's filter, the first 90 s): BWV 54's
    // second aria, the alto at its level, the bassoon alone 7.4 LU under it: floored 2 dB more, to 5.4.
    tb = Math.max(tb, BASS_MEASURED_FLOOR[key] ?? 0);
    if (tb) row.tb = tb;
  }
  for (const r of Object.values(dk)) {
    const key = r.sound === PIECE_SOUND[r.id] ? r.id : `${r.id}@${r.sound}`;
    if (!r.voices.B || !rows[key]) continue;
    const row = rows[key];
    const i = row.v.indexOf(r.voice);
    if (i < 0) continue;
    const m = mixRun(r);
    (row.d ??= row.v.map(() => 0))[i] = r1(Math.max(SOLO_LIFT_MIN_DB, Math.min(SOLO_LIFT_MAX_DB, TARGET - m.med)));
    (row.md ??= row.v.map(() => NaN))[i] = m.med;
  }
  // voices in order
  for (const row of Object.values(rows)) {
    const o = row.v.map((_, i) => i).sort((a, b) => row.v[a] - row.v[b]);
    for (const key of ["v", "l", "d", "m", "md"] as const) if (row[key]) (row as Record<string, number[]>)[key] = o.map((i) => row[key]![i]);
  }
  const fmt = (x: unknown) => JSON.stringify(x);
  const lines = [
    "/**",
    " * D851: THE SOLO OVER THE RIPIENO, the player's level in the many-voiced pieces (player-lift.ts soloLiftDb), measured: the",
    " * calibration mix scans (tools/touch/player-lift/scan.cjs MIX=1 APPLIED=1, the band as the game plays it with D851's",
    " * room, the player at 0 dB), built by tools/touch/player-lift/solo.ts. Per piece on its own sound `s`: the playable",
    " * voices `v`, the player's level `l` on a phone and `d` on a computer (dB), each the level that puts the median margin",
    " * of the player's line over the whole band at SOLO_TARGET_DB; `tb` the continuo's floor on a phone (D645: within 6 LU of",
    " * the loudest voice alone, the player at its level); `m`/`md` the medians measured at 0 dB (phone / computer).",
    " * Generated: do not edit.",
    " */",
    "export const SOLO_LOUD: Readonly<Record<string, { s: string; v: number[]; l: number[]; d?: number[]; tb?: number; tbd?: number; m?: number[]; md?: (number | null)[] }>> = {",
    ...Object.keys(rows).sort().map((id) => `  ${fmt(id)}: { s: ${fmt(rows[id].s)}, v: ${fmt(rows[id].v)}, l: ${fmt(rows[id].l)}${rows[id].d ? `, d: ${fmt(rows[id].d)}` : ""}${rows[id].tb ? `, tb: ${rows[id].tb}` : ""}, m: ${fmt(rows[id].m)}${rows[id].md ? `, md: ${fmt(rows[id].md!.map((x) => (Number.isFinite(x) ? x : null)))}` : ""} },`),
    "};",
    "",
  ];
  if (!process.env.DRY) writeFileSync(new URL("../../../src/touch/player-lift-solo.ts", import.meta.url), lines.join("\n"));
  console.log(lines.join("\n"));
  void balanceOf;
} else {
  console.error("usage: solo.ts voices|mix|build <scan.json...>");
  process.exit(1);
}
