/**
 * D283, THE LANGUAGES (play.html): English, Portuguese (Brazil) and Spanish, chosen in ⚙ SETTINGS (kept
 * on the device; first visit: the phone's language). The English text is the key: `tr("HEAR THE
 * SUBJECT")`; `{name}` placeholders filled from `vars`. Pieces, keys and voices are named the
 * language's way (solfège: DÓ MAIOR, DO MAYOR). The words drawn in the game (PERFECT, HOLD, COMBO 12)
 * go through `trCanvas`: the whole phrase if known, else word by word. The books' quotations stay in
 * their own language (English): they are quotations.
 */
import { PT } from "./pt.ts";
import { ES } from "./es.ts";

export type Lang = "en" | "pt" | "es";
export const LANGS: [Lang, string][] = [
  ["en", "ENGLISH"],
  ["pt", "PORTUGUÊS (BRASIL)"],
  ["es", "ESPAÑOL"],
];
const KEY = "tb-lang-v1";
const DICTS: Record<Lang, Record<string, string>> = { en: {}, pt: PT, es: ES };

function initial(): Lang {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (v === "en" || v === "pt" || v === "es") return v;
  } catch {
    /* no storage */
  }
  const nav = typeof navigator !== "undefined" ? (navigator.language ?? "").toLowerCase() : "";
  return nav.startsWith("pt") ? "pt" : nav.startsWith("es") ? "es" : "en";
}
let current: Lang = initial();
export const lang = (): Lang => current;
/** Chooses the language (kept); the page re-renders from the caller's state. */
export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* this visit only */
  }
}
/** D283: for tests and the bench: the language in force without storing it. */
export function useLang(l: Lang) {
  current = l;
}

const fill = (s: string, vars?: Record<string, string | number>) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);
/** The text in the language in force (the English if none). */
export function tr(text: string, vars?: Record<string, string | number>): string {
  return fill(current === "en" ? text : (DICTS[current][text] ?? text), vars);
}

/** The game's drawn words: the phrase if the dictionary has it, else each known word or phrase in it. */
export function trCanvas(text: string): string {
  if (current === "en" || !text) return text;
  const d = DICTS[current];
  if (d[text]) return d[text];
  // Whole words only (BAR in "BAR 3", not in "BAROQUE"); the longest phrases first, in one pass so a
  // translated word is never translated again.
  return text.replace(canvasRe(current), (m) => d[m] ?? m);
}
const reMemo: Partial<Record<Lang, RegExp>> = {};
function canvasRe(l: Lang): RegExp {
  const keys = Object.keys(DICTS[l])
    .filter((k) => /^[A-Z0-9 ·×!✓'’,:-]+$/.test(k) && k.length > 1)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return (reMemo[l] ??= new RegExp(`(?<![A-ZÀ-Ý])(?:${keys.join("|")})(?![A-ZÀ-Ý])`, "g"));
}

const SOLFEGE: Record<Lang, Record<string, string>> = {
  en: { C: "C", D: "D", E: "E", F: "F", G: "G", A: "A", B: "B" },
  pt: { C: "DÓ", D: "RÉ", E: "MI", F: "FÁ", G: "SOL", A: "LÁ", B: "SI" },
  es: { C: "DO", D: "RE", E: "MI", F: "FA", G: "SOL", A: "LA", B: "SI" },
};
/** A key ("c#", "Eb") named: "C♯ MINOR", "DÓ♯ MENOR", "MI♭ MAYOR". */
export function keyWordsIn(key: string, l: Lang = current): string {
  const minor = key[0] === key[0].toLowerCase();
  const acc = key.slice(1).replace(/##|x/, "𝄪").replace("#", "♯").replace("b", "♭");
  const name = SOLFEGE[l][key[0].toUpperCase()] + acc;
  const mode = l === "en" ? (minor ? "MINOR" : "MAJOR") : l === "pt" ? (minor ? "MENOR" : "MAIOR") : minor ? "MENOR" : "MAYOR";
  return `${name} ${mode}`;
}

const VOICES: Record<string, [pt: string, es: string]> = {
  SOPRANO: ["SOPRANO", "SOPRANO"],
  "SOPRANO I": ["SOPRANO I", "SOPRANO I"],
  "SOPRANO II": ["SOPRANO II", "SOPRANO II"],
  ALTO: ["CONTRALTO", "CONTRALTO"],
  TENOR: ["TENOR", "TENOR"],
  BASS: ["BAIXO", "BAJO"],
  UPPER: ["SUPERIOR", "SUPERIOR"],
  LOWER: ["INFERIOR", "INFERIOR"],
  "RIGHT HAND": ["MÃO DIREITA", "MANO DERECHA"],
  "LEFT HAND": ["MÃO ESQUERDA", "MANO IZQUIERDA"],
};
/** A voice's name in capitals ("Left hand" → "MÃO ESQUERDA"). */
export function voiceName(name: string): string {
  const up = name.toUpperCase();
  const v = VOICES[up];
  return !v || current === "en" ? up : v[current === "pt" ? 0 : 1];
}

/** A piece's name: "FUGUE IN C MAJOR", "FUGA EM DÓ MAIOR", "INVENCIÓN 1"… (kind: fugue, prelude, invention). */
export function pieceName(kind: string, key: string, number?: number): string {
  if (kind === "invention") return tr("INVENTION {n}", { n: number ?? 1 });
  const k = keyWordsIn(key);
  const word = kind === "prelude" ? tr("PRELUDE") : tr("FUGUE");
  return current === "en" ? `${word} IN ${k}` : current === "pt" ? `${word} EM ${k}` : `${word} EN ${k}`;
}
