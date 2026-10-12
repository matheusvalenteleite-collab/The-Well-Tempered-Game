/**
 * Roman numerals in the textbooks' convention, in the local key (C32, C33): the same rules as
 * tools/chorales/local_numerals.py, which names every chord of levels 2-4. A tonicisation is an
 * applied chord of the key (V/V, vii°/ii); a modulation is shown by the new key's name where its
 * region begins, and the pivot read in both keys. In minor the degrees are the minor scale's (III,
 * VI, VII), V and vii° with the raised leading tone, IV and ii with the raised sixth.
 */
export type Mode = "major" | "minor";
export type Quality = "major" | "minor" | "diminished";
export interface Key {
  tonic: string;
  mode: Mode;
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const pcOf = (name: string): number => (PC[name[0]] + [...name.slice(1)].reduce((a, ch) => a + (ch === "#" ? 1 : ch === "b" ? -1 : 0), 0) + 120) % 12;
const SCALE: Record<Mode, number[]> = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const DEGREES: Record<Mode, string[]> = {
  major: ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"],
  minor: ["I", "bII", "II", "III", "#III", "IV", "#IV", "V", "VI", "#VI", "VII", "VII"],
};
const TARGETS: Record<Mode, Record<number, Quality>> = {
  major: { 2: "minor", 4: "minor", 5: "major", 7: "major", 9: "minor" },
  minor: { 3: "major", 5: "minor", 7: "major", 8: "major", 10: "major" },
};

/** The plain numeral of a chord in a key. */
export function label(root: number, q: Quality, key: Key): string {
  const n = DEGREES[key.mode][(root - pcOf(key.tonic) + 12) % 12];
  return q === "minor" ? n.toLowerCase() : q === "diminished" ? n.toLowerCase() + "°" : n;
}

const triad = (root: number, q: Quality) => [root, (root + (q === "major" ? 4 : 3)) % 12, (root + (q === "diminished" ? 6 : 7)) % 12];

export function diatonic(root: number, q: Quality, key: Key): boolean {
  const t = pcOf(key.tonic);
  const scale = new Set(SCALE[key.mode].map((x) => (t + x) % 12));
  if (key.mode === "minor") [9, 11].forEach((x) => scale.add((t + x) % 12));
  return triad(root, q).every((p) => scale.has(p));
}

/** A chord in the convention: diatonic, else applied to a degree of the key, else chromatic. */
export function inKey(root: number, q: Quality, key: Key): string {
  if (diatonic(root, q, key)) return label(root, q, key);
  const t = pcOf(key.tonic);
  for (const [target, kind] of [[(root + 5) % 12, "V"], [(root + 1) % 12, "vii°"]] as const) {
    if ((kind === "V" && q !== "major") || (kind === "vii°" && q !== "diminished") || target === t) continue;
    const tq = TARGETS[key.mode][(target - t + 12) % 12];
    if (tq) return `${kind}/${label(target, tq, key)}`;
  }
  return label(root, q, key);
}

/** A convention label read back: its root and quality in the key ("V/ii", "bVII", "vii°", "III"). */
export function parse(lab: string, key: Key): { root: number; quality: Quality } | null {
  const applied = /^(V|vii°)(7)?\/(.+)$/.exec(lab);
  if (applied) {
    const target = parse(applied[3], key);
    if (!target) return null;
    return applied[1] === "V" ? { root: (target.root + 7) % 12, quality: "major" } : { root: (target.root + 11) % 12, quality: "diminished" };
  }
  const m = /^([b#]?)([ivIV]+)(°)?7?$/.exec(lab);
  if (!m) return null;
  const name = (m[1] + m[2].toUpperCase());
  const deg = DEGREES[key.mode].indexOf(name);
  // In minor VII names both the subtonic (10) and the raised leading tone (11): the diminished chord is the latter.
  const semis = key.mode === "minor" && m[2].toUpperCase() === "VII" && m[3] ? 11 : deg;
  if (semis < 0) return null;
  const quality: Quality = m[3] ? "diminished" : m[2] === m[2].toUpperCase() ? "major" : "minor";
  return { root: (pcOf(key.tonic) + semis) % 12, quality };
}

/** A key's name as the score shows it at the start of its region ("D", "Bm"). */
export const keyName = (key: Key): string => key.tonic + (key.mode === "minor" ? "m" : "");

/** The pivot: a chord read in the old key, and in the new one if it belongs to it (else null). */
export function pivot(lab: string, from: Key, to: Key): string | null {
  const c = parse(lab, from);
  return c && diatonic(c.root, c.quality, to) ? label(c.root, c.quality, to) : null;
}
