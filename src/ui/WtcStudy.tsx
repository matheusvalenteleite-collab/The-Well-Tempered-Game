/**
 * The Well-Tempered Clavier, a study (D123, the owner: "the most deep and insightful interactions
 * with this incredible timeless piece of work"; exercises second). Each fugue whole, by voice:
 *   - the voice roll: every note in its voice's colour, the subject's entries outlined;
 *   - listening: the whole, a section, a moment; one voice alone, without one, or in the spotlight
 *     (its own sound, the others receding); every entry of the subject in a row, alone or in its
 *     texture;
 *   - the guide: the sections (exposition, entries, episodes, close) and the moments (entries with
 *     their degrees, strettos, episodes, pedal points, the highest and lowest notes, the cadence),
 *     each to hear;
 *   - the workshop: change the subject's intervals and hear it through Bach's whole plan (alone or
 *     inside his texture), or add an entry of your own anywhere, at any degree, upside down;
 *   - "Where next?": the fugue unfolds entry by entry; before each, name the degree the subject
 *     enters on (the game of the modulations).
 * The exercises of D119-D122 are one button away. D125: each fugue's prelude, whole, by voice, with
 * its sections (by the keys it reaches) and moments; and for both pieces a harmonic reading (the
 * chord of each bar or half-bar, by Roman numeral, over the roll; the chords alone as a skeleton).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { chordName, chordTones, findCadences, figurationChanges, keyPlan, readHarmony, romanOf, type Chord } from "../wtc/harmony.ts";
import { beatOf } from "../wtc/counterpoint.ts";
import { isMinor, keyName, keySignature } from "../wtc/fugues.ts";
import type { Entry, FullNote } from "../wtc/entries.ts";
import { LIBRARY } from "../wtc/library.ts";
import { commentOn, momentAt, overview, type CompanionContext } from "../wtc/commentary.ts";
import { NOTES } from "../wtc/notes.ts";
import { degreeOf, entryVoice, pitchName, studyMoments, voiceNames, type Moment, type Section as StudySection } from "../wtc/study.ts";
type Section = Omit<StudySection, "kind"> & { kind: StudySection["kind"] | "toKey" | "figure"; key?: { tonic: number; minor: boolean } };
import { parsePitch, type Step } from "../music/pitch.ts";
import { VoiceRoll, type RollExtra } from "./notation/VoiceRoll.tsx";
import { WtcPage, WtcScore, type WtcScoreVoice } from "./notation/WtcScore.tsx";
import { ZOOM_MAX, ZOOM_MIN } from "./notation/zoom.ts";
import { restoreSound, type SoundState } from "../audio/sound.ts";
import { SYNTH_PRESETS } from "../audio/synth-settings.ts";
import { WELL, type TemperamentId } from "../audio/temperament.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { HFader } from "./HFader.tsx";
import { barAt, recording, secondsAt, trackOf } from "../audio/recording.ts";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import { Shell } from "./Shell.tsx";
import { HeaderTools } from "./HeaderTools.tsx";
import { VOICE_COLORS } from "./voice-colors.ts";


const roman = (b: number) => (b === 1 ? "I" : "II");
const fugueLabel = (f: { key: string; book: number; number: number; bwv: string }) => `${keyName(f.key)} · ${roman(f.book)}/${f.number} · BWV ${f.bwv}`;
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const midiName = (m: number, flats: boolean) => `${(flats ? FLATS : SHARPS)[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
/** The voices' colours (the track colours first). */
const COLORS = VOICE_COLORS;
/** The channels the voices sound on, one each (D123). */
type Ch = "counterpoint" | "second" | "fux" | "inversion" | "retrograde" | "retroInversion";
const VOICE_CH: Ch[] = ["counterpoint", "second", "fux", "inversion", "retrograde", "retroInversion"];
const INSTRUMENTS = ["harpsichord", "fluteOrgan", "grandRoom"] as const;
type Instrument = (typeof INSTRUMENTS)[number];
/** The spotlight's sound: another instrument than the rest. */
const SPOT: Record<Instrument, string> = { harpsichord: "fluteOrgan", fluteOrgan: "harpsichord", grandRoom: "fluteOrgan" };
const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const PC_OF: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** A MIDI number spelled in the key: the step whose key-signature alteration gives it, else a natural, else a sharp (a flat in a flat key). */
function spell(m: number, sig: Record<Step, number>, flats: boolean): string {
  const pc = ((m % 12) + 12) % 12;
  const oct = (step: Step, alter: number) => Math.floor((m - PC_OF[step] - alter) / 12) - 1;
  const inKey = STEPS.find((st) => (((PC_OF[st] + sig[st]) % 12) + 12) % 12 === pc);
  if (inKey) return `${inKey}${sig[inKey] > 0 ? "#".repeat(sig[inKey]) : "b".repeat(-sig[inKey])}${oct(inKey, sig[inKey])}`;
  for (const alter of flats ? [0, -1, 1] : [0, 1, -1]) {
    const st = STEPS.find((x) => (((PC_OF[x] + alter) % 12) + 12) % 12 === pc);
    if (st) return `${st}${alter > 0 ? "#" : alter < 0 ? "b" : ""}${oct(st, alter)}`;
  }
  return midiName(m, flats);
}
/** VexFlow's key signature name ("F#", "Bbm"). */
const vexKey = (key: string) => (key[0] === key[0].toLowerCase() ? `${key[0].toUpperCase()}${key.slice(1)}m` : key);
const DEGREES = [0, 2, 3, 4, 5, 7, 8, 9, 10, 11, 1, 6];


export function WtcStudy({ onVoices, onExercises, onTutorial }: { onVoices(n: 2 | 3 | "wtc"): void; onExercises(): void; onTutorial?: (lessonId?: string) => void }) {
  const [index, setIndex] = useState(() => Math.max(0, LIBRARY.findIndex((f) => f.id === stored("wtg.wtcFugue", LIBRARY[0].id))));
  const L = LIBRARY[index];
  useEffect(() => store("wtg.wtcFugue", L.id), [L.id]);
  /** The prelude or the fugue (D125). */
  const [piece, setPiece] = useState<"prelude" | "fugue">(() => stored("wtg.wtcPiece", "fugue", (v) => v === "prelude" || v === "fugue"));
  useEffect(() => store("wtg.wtcPiece", piece), [piece]);
  // D126: all 48 from the corpus (true voices in the fugues); the piece shown.
  const isPrelude = piece === "prelude";
  const FG = L.fugue();
  const P = isPrelude ? L.prelude() : FG;
  const F = { id: L.id, book: L.book, number: L.number, bwv: L.bwv, key: isPrelude ? L.preludeKey : L.key, subject: FG.subject, phase: FG.phase };
  const barQ = P.barQuarters;
  const timeSig = P.time;
  /** Bar numbers as Bach's: a pickup bar is bar 0. */
  const firstBar = 1 - P.pickup;
  const minor = isMinor(F.key);
  const sig = useMemo(() => keySignature(F.key), [F.key]);
  const flats = Object.values(sig).some((x) => x < 0);
  const notes: FullNote[] = P.notes;
  const subject = useMemo(() => FG.subject.map((n) => ({ midi: parsePitch(n.pitch).midi, at: n.at, dur: n.dur })), [FG]);
  const entries: Entry[] = isPrelude ? [] : FG.entries;
  const { voice, count } = P;
  const names = voiceNames(count);
  const tonicPc = parsePitch(`${F.key[0].toUpperCase()}${F.key.slice(1)}4`).midi % 12;
  // The harmonic reading (D125): the chords, the cadences, the keys reached.
  const chords: Chord[] = useMemo(() => readHarmony(notes, barQ, beatOf(timeSig)), [notes, barQ, timeSig]);
  const plan = useMemo(() => keyPlan(findCadences(chords)), [chords]);
  const { moments, sections } = useMemo(() => {
    const base = studyMoments(notes, voice, count, entries, barQ, minor);
    const arrivals: Moment[] = plan.map((c) => ({ kind: "arrival", from: chords[c.chord - 1].from, to: chords[c.chord].to, voices: [], detail: { tonic: c.tonic, minor: c.minor } }));
    if (!isPrelude) return { moments: [...base.moments, ...arrivals].sort((a, b) => a.from - b.from), sections: base.sections };
    // A prelude: no subject; its sections run from one key reached to the next (else from one figuration to the next).
    const figures = figurationChanges(notes, barQ);
    const moments: Moment[] = [
      ...base.moments.filter((m) => m.kind === "pedal" || m.kind === "highest" || m.kind === "lowest" || m.kind === "cadence"),
      ...arrivals,
      ...figures.map((b): Moment => ({ kind: "figure", from: Math.max(0, (b - 1) * barQ), to: (b + 1) * barQ, voices: [], detail: { bar: b + 1 } })),
    ].sort((a, b) => a.from - b.from);
    const end = Math.max(...notes.map((n) => n.at + n.dur));
    const cuts = (plan.length ? plan.map((c) => chords[c.chord].to) : figures.map((b) => b * barQ)).filter((q) => q > barQ && q < end - barQ);
    const bounds = [0, ...cuts, end];
    const sections: Section[] = bounds.slice(1).map((to, k) => ({ kind: k === bounds.length - 2 && plan.length ? "close" : plan.length ? "toKey" : "figure", from: bounds[k], to, entries: [], ...(plan.length && k < bounds.length - 2 ? { key: plan[k] } : {}) }));
    return { moments, sections };
  }, [notes, voice, count, entries, barQ, minor, isPrelude, plan, chords]);
  const end = Math.max(...notes.map((n) => n.at + n.dur));
  const bars = Math.ceil(end / barQ - 1e-6);
  const barOf = (q: number) => Math.floor(q / barQ + 1e-6);
  const firstEntry = entries.find((e) => e.shift === 0 && !e.inverted) ?? entries[0];
  const tonicMidi = firstEntry ? notes[firstEntry.notes[0]].midi - (subject[0].midi - parsePitch(`${F.key[0].toUpperCase()}${F.key.slice(1)}4`).midi) : 60;

  const [tab, setTab] = useState<string>(() => stored("wtg.wtcStudyTab", "guide", (v) => typeof v === "string"));
  useEffect(() => store("wtg.wtcStudyTab", tab), [tab]);
  const [tempo, setTempo] = useState(() => stored("wtg.wtcTempo", 36, (v) => typeof v === "number" && v >= 15 && v <= 120));
  useEffect(() => {
    audio.tempo = tempo;
    store("wtg.wtcTempo", tempo);
  }, [tempo]);
  const [volume, setVolume] = useState(() => stored("wtg.volume", 70, (v) => typeof v === "number"));
  useEffect(() => audio.setVolume(volume / 100), [volume]);
  const [tuning, setTuning] = useState<TemperamentId>(() => stored("wtg.wtcTuning", "werckmeister3" as TemperamentId, (v) => WELL.includes(v as TemperamentId)));
  useEffect(() => {
    audio.temperament = tuning;
    store("wtg.wtcTuning", tuning);
  }, [tuning]);
  const [instrument, setInstrument] = useState<Instrument>(() => stored("wtg.wtcInstrument", "harpsichord" as Instrument, (v) => INSTRUMENTS.includes(v as Instrument)));
  useEffect(() => store("wtg.wtcInstrument", instrument), [instrument]);
  /** The game's sounds, or Kimiko Ishizaka's recording where there is one (Book I; D128). */
  const [source, setSource] = useState<"synth" | "recording">(() => stored("wtg.wtcSource", "synth", (v) => v === "synth" || v === "recording"));
  useEffect(() => store("wtg.wtcSource", source), [source]);
  const track = useMemo(() => trackOf(L.id, isPrelude), [L.id, isPrelude]);
  const useRec = source === "recording" && !!track;
  // Voices: solo, mute, spotlight.
  const [solo, setSolo] = useState<number | null>(null);
  const [muted, setMuted] = useState<Set<number>>(new Set());
  const [spot, setSpot] = useState<number | null>(null);
  const [showEntries, setShowEntries] = useState(true);
  const [look, setLook] = useState<"retro" | "classic">(() => stored("wtg.look", "retro", (v) => v === "retro" || v === "classic"));
  useEffect(() => {
    document.documentElement.dataset.look = look;
    store("wtg.look", look);
  }, [look]);
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(() => stored("wtg.theme", "auto", (v) => v === "auto" || v === "light" || v === "dark"));
  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    store("wtg.theme", theme);
  }, [theme]);

  // The sound: one channel a voice; the spotlight in another instrument, the rest receding.
  const sound = useMemo<SoundState>(() => {
    const s = restoreSound(null);
    const base = SYNTH_PRESETS.find((p) => p.id === instrument)!.settings;
    const lit = SYNTH_PRESETS.find((p) => p.id === SPOT[instrument])!.settings;
    VOICE_CH.forEach((ch, v) => {
      const set = spot === v ? { ...lit } : { ...base };
      if (ch === "counterpoint" || ch === "second" || ch === "fux") s.synth[ch] = set;
      else s.versionSynth[ch] = set;
      s.mix[ch].volume = spot === null || spot === v ? 1 : 0.4;
      s.mix[ch].pan = count > 1 ? -0.5 + (v / Math.max(1, count - 1)) * 1 * 0.6 + 0.2 : 0;
    });
    return s;
  }, [instrument, spot, count]);
  useEffect(() => audio.setSoundState(sound), [sound]);
  const audible = (v: number) => (solo === null ? !muted.has(v) : solo === v);
  useEffect(() => {
    const gates: Record<string, boolean> = { cantus: false, continuo: false, canon: true };
    VOICE_CH.forEach((ch, v) => (gates[ch] = audible(v)));
    gates.canon = true; // the workshop's own entries
    audio.setGates(gates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo, muted, count]);
  useEffect(() => {
    audio.loop = false;
    audio.drums = false;
    return () => audio.stop();
  }, []);

  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [span, setSpan] = useState<{ from: number; to: number } | null>(null);
  /** The roll, or the chosen bars in notation (D124). */
  const [view, setView] = useState<"roll" | "score" | "page">(() => stored("wtg.wtcStudyView", "roll", (v) => v === "roll" || v === "score" || v === "page"));
  useEffect(() => store("wtg.wtcStudyView", view), [view]);
  const [zoom, setZoom] = useState(() => stored("wtg.wtcZoom", 1, (v) => typeof v === "number" && v >= ZOOM_MIN && v <= ZOOM_MAX));
  const [activeMoment, setActiveMoment] = useState<string | null>(null);
  /** The harmonic reading over the roll: off, by Roman numeral, by letter (D125). */
  const [harmony, setHarmony] = useState<"off" | "roman" | "letters">(() => stored("wtg.wtcHarmony", "roman", (v) => v === "off" || v === "roman" || v === "letters"));
  useEffect(() => store("wtg.wtcHarmony", harmony), [harmony]);

  // The workshop: the subject changed note by note (semitones from Bach's), and the player's own entries.
  const [edits, setEdits] = useState<Record<string, number[]>>({});
  const edit = edits[F.id] ?? F.subject.map(() => 0);
  const changed = edit.some((x) => x !== 0);
  const [through, setThrough] = useState<"off" | "alone" | "texture">("off");
  const [mine, setMine] = useState<Record<string, { bar: number; shift: number; inverted: boolean; voice: number }[]>>({});
  const myEntries = mine[F.id] ?? [];
  const [wsSel, setWsSel] = useState(0);
  const [newEntry, setNewEntry] = useState({ bar: 1, shift: 7, inverted: false, voice: 0 });

  // The subject as changed, at an entry's place: the entry's notes moved by the edit (upside down for an inversion).
  const changedEntryNotes = (e: Entry): { i: number; midi: number }[] =>
    e.notes.map((i) => {
      const k = subject.findIndex((s) => Math.abs(s.at - subject[0].at - (notes[i].at - e.at)) < 1e-6);
      const d = k >= 0 ? edit[k] : 0;
      return { i, midi: notes[i].midi + (e.inverted ? -d : d) };
    });
  /** The player's own entries as notes (the subject, edited, from the chosen bar). */
  const myNotes: (RollExtra & { voice: number })[] = myEntries.flatMap((m) => {
    const start = (m.bar - firstBar) * barQ + (F.phase % barQ);
    return subject.map((s, k) => {
      const d = (s.midi - subject[0].midi) + edit[k] - edit[0];
      return { midi: subject[0].midi + edit[0] + m.shift + (m.inverted ? -d : d), at: start + (s.at - subject[0].at), dur: s.dur, voice: m.voice };
    });
  });
  const hidden = useMemo(() => (through !== "off" && changed ? new Set(entries.flatMap((e) => e.notes)) : new Set<number>()), [through, changed, entries]);
  const throughNotes: RollExtra[] = through !== "off" && changed ? entries.flatMap((e) => changedEntryNotes(e).map(({ i, midi }) => ({ midi, at: notes[i].at, dur: notes[i].dur }))) : [];

  /** Play from `from` to `to` (quarters); `only` limits to some notes; the workshop's notes join. */
  const play = (from = 0, to = end, only?: Set<number>) => {
    audio.stop();
    recording.stop();
    // D128: the recording, where there is one and nothing asks for the game's own sounds (a voice
    // alone, the workshop's subject or entries).
    if (useRec && track && !only && !(through !== "off" && changed) && !(myNotes.length && !game)) {
      setPlaying(true);
      void recording.play(track.urls, [[secondsAt(track, Math.max(0, from), barQ), secondsAt(track, to, barQ, end)]], (sec) => setCursor(barAt(track, sec)), () => (setPlaying(false), setCursor(-1)), volume / 100);
      return;
    }
    const evs: PlayEvent[] = [];
    const add = (midi: number, at: number, dur: number, ch: Ch | "canon") => {
      if (at < from - 1e-6 || at >= to - 1e-6) return;
      const pitch = midiName(midi, flats);
      const len = Math.min(dur, to - at) / 4;
      const e: PlayEvent = { slot: barOf(at), at: (at - from) / 4, length: len, cantus: null, counterpoint: null };
      if (ch === "counterpoint" || ch === "second" || ch === "fux") e.extra = [{ channel: ch, pitch }];
      else (e.versions = { [ch]: pitch }), (e.lengths = { [ch]: len });
      evs.push(e);
    };
    const edited = new Map<number, number>();
    if (through !== "off" && changed) for (const e of entries) for (const { i, midi } of changedEntryNotes(e)) edited.set(i, midi);
    const entryNote = new Set(entries.flatMap((e) => e.notes));
    notes.forEach((n, i) => {
      if (only && !only.has(i)) return;
      if (through === "alone" && changed && !entryNote.has(i)) return;
      add(edited.get(i) ?? n.midi, n.at, n.dur, VOICE_CH[voice[i]] ?? "second");
    });
    if (!only && !game) for (const n of myNotes) add(n.midi, n.at, n.dur, "canon");
    evs.sort((a, b) => a.at - b.at);
    if (!evs.length) return;
    setPlaying(true);
    void audio.playAll(evs, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    });
  };
  const stop = () => {
    audio.stop();
    recording.stop();
    setPlaying(false);
    setCursor(-1);
  };
  const playSpan = (from: number, to: number, key: string | null, only?: Set<number>) => {
    setSpan({ from, to });
    setActiveMoment(key);
    play(Math.max(0, from), to, only);
  };
  /** The chords alone, as a skeleton: each chord's bass and its tones close above middle C, held for its span. */
  const playChords = (from = 0, to = end) => {
    audio.stop();
    recording.stop();
    const evs: PlayEvent[] = [];
    for (const c of chords) {
      if (c.to <= from + 1e-6 || c.from >= to - 1e-6) continue;
      const at = Math.max(c.from, from);
      const len = (Math.min(c.to, to) - at) / 4;
      const bass = c.bassMidi < 60 ? c.bassMidi : c.bassMidi - 12;
      const upper = chordTones(c).map((pc) => 60 + ((pc - 0 + 12) % 12)).sort((a, b) => a - b);
      for (const m of [bass, ...upper]) evs.push({ slot: barOf(at), at: (at - from) / 4, length: len, cantus: null, counterpoint: null, versions: { canon: midiName(m, flats) }, lengths: { canon: len } });
    }
    evs.sort((a, b) => a.at - b.at);
    if (!evs.length) return;
    setPlaying(true);
    void audio.playAll(evs, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    });
  };
  const chordLabel = (c: Chord, k: number) => (harmony === "letters" ? chordName(c, flats) : romanOf(c, tonicPc, minor, k === chords.length - 1));
  const keyLabel = (tonic: number, mi: boolean) => `${(flats ? FLATS : SHARPS)[tonic].replace("#", "♯").replace(/(?<=[A-G])b/, "♭")} ${mi ? t("ui.study.h.minor") : t("ui.study.h.major")}`;
  /** Every entry in a row: alone (its own notes) or in its texture, a breath between. */
  const allEntries = (alone: boolean) => {
    audio.stop();
    recording.stop();
    if (useRec && track && !alone) {
      setPlaying(true);
      void recording.play(track.urls, entries.map((e) => [secondsAt(track, e.at, barQ), secondsAt(track, e.end, barQ)] as [number, number]), (sec) => setCursor(barAt(track, sec)), () => (setPlaying(false), setCursor(-1)), volume / 100);
      return;
    }
    const evs: PlayEvent[] = [];
    let t0 = 0;
    for (const e of entries) {
      const from = e.at;
      const to = e.end;
      const pick = notes.map((n, i) => ({ n, i })).filter(({ n, i }) => n.at >= from - 1e-6 && n.at < to - 1e-6 && (!alone || e.notes.includes(i)));
      for (const { n, i } of pick) {
        const ch = VOICE_CH[voice[i]] ?? "second";
        const pitch = midiName(n.midi, flats);
        const len = Math.min(n.dur, to - n.at) / 4;
        const ev: PlayEvent = { slot: barOf(n.at), at: t0 + (n.at - from) / 4, length: len, cantus: null, counterpoint: null };
        if (ch === "counterpoint" || ch === "second" || ch === "fux") ev.extra = [{ channel: ch, pitch }];
        else (ev.versions = { [ch]: pitch }), (ev.lengths = { [ch]: len });
        evs.push(ev);
      }
      t0 += (to - from) / 4 + 0.25;
    }
    evs.sort((a, b) => a.at - b.at);
    setPlaying(true);
    void audio.playAll(evs, (k) => {
      setCursor(k);
      if (k < 0) setPlaying(false);
    });
  };

  // "Where next?": the fugue unfolds entry by entry.
  /**
   * The game (D124, the owner's "write the response"): before each entry, name the degree; then write
   * its first notes by letter (the key signature applied, ♯ ♭ to alter); then hear it.
   */
  type GameLast = { ok: boolean; answer: string; right: string; phase: "notes" | "done"; written: number[]; notesOk: boolean | null };
  const [game, setGame] = useState<{ k: number; score: number; tried: number; notesScore: number; last: null | GameLast } | null>(null);
  const gameEntries = entries.filter((e) => !e.inverted);
  const startGame = () => {
    // The game hides what is to come: no workshop overlays, no outlines ahead.
    setThrough("off");
    setGame({ k: 1, score: 0, tried: 0, notesScore: 0, last: null });
    const e = gameEntries[1];
    if (e) playSpan(0, e.at, null);
  };
  const guess = (deg: number) => {
    if (!game) return;
    const e = gameEntries[game.k];
    // The transposition from the subject's first statement (the key region of the entry).
    const rel = ((((e.shift - (firstEntry?.shift ?? 0)) % 12) + 12) % 12);
    const ok = rel === deg;
    const nameOf = (s: number) => `${degreeOf(s, minor)} (${pitchName(tonicMidi + s).replace(/-?\d+$/, "")})`;
    setGame({ ...game, score: game.score + (ok ? 1 : 0), tried: game.tried + 1, last: { ok, answer: nameOf(deg), right: nameOf(rel), phase: "notes", written: [], notesOk: null } });
  };
  /** The entry's first notes (up to four), in time order. */
  const entryHead = (e: Entry) => [...e.notes].sort((a, b) => notes[a].at - notes[b].at).slice(0, 4).map((i) => notes[i].midi);
  const writeLetter = (step: Step) => {
    if (!game?.last || game.last.phase !== "notes") return;
    const e = gameEntries[game.k];
    const head = entryHead(e);
    if (game.last.written.length >= head.length) return;
    const pc = (((PC_OF[step] + sig[step]) % 12) + 12) % 12;
    setGame({ ...game, last: { ...game.last, written: [...game.last.written, pc] } });
    void audio.playSequence([{ slot: 0, at: 0, length: 0.2, cantus: null, counterpoint: null, extra: [{ channel: "counterpoint", pitch: midiName(60 + pc, flats) }] }]);
  };
  const alterLast = (d: number) => {
    if (!game?.last || game.last.phase !== "notes" || !game.last.written.length) return;
    const w = [...game.last.written];
    w[w.length - 1] = (((w[w.length - 1] + d) % 12) + 12) % 12;
    setGame({ ...game, last: { ...game.last, written: w } });
  };
  const checkNotes = (skip = false) => {
    if (!game?.last) return;
    const e = gameEntries[game.k];
    const head = entryHead(e).map((m) => ((m % 12) + 12) % 12);
    const ok = !skip && head.length === game.last.written.length && head.every((x, i) => x === game.last!.written[i]);
    setGame({ ...game, notesScore: game.notesScore + (ok ? 1 : 0), last: { ...game.last, phase: "done", notesOk: skip ? null : ok } });
    playSpan(e.at, e.end, null);
  };
  const nextGame = () => {
    if (!game) return;
    const k = game.k + 1;
    if (k >= gameEntries.length) return setGame({ ...game, k, last: null });
    setGame({ ...game, k, last: null });
    playSpan(gameEntries[k - 1].end, gameEntries[k].at, null);
  };
  const gameUntil = game && game.k < gameEntries.length && game.last?.phase !== "done" ? gameEntries[game.k].at : game && game.k < gameEntries.length ? gameEntries[game.k].end : null;

  const choosePiece = (x: "prelude" | "fugue") => {
    if (x === piece) return;
    stop();
    setSpan(null);
    setActiveMoment(null);
    setSolo(null);
    setMuted(new Set());
    setSpot(null);
    setGame(null);
    setThrough("off");
    setPiece(x);
    if (x === "prelude" && (tab === "workshop" || tab === "next")) setTab("guide");
  };
  const go = (k: number) => {
    if (k < 0 || k >= LIBRARY.length) return;
    stop();
    setSpan(null);
    setSolo(null);
    setMuted(new Set());
    setSpot(null);
    setGame(null);
    setThrough("off");
    setIndex(k);
  };

  // Keys: Space plays (the chosen span, else from the start), Escape stops.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e: KeyboardEvent) => {
    const tg = e.target as HTMLElement | null;
    if (tg && /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)) return;
    if (e.key === " ") {
      e.preventDefault();
      if (playing) stop();
      else if (span) play(span.from, span.to);
      else play();
    } else if (e.key === "Escape") stop();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Texts.
  const bq = (q: number) => barOf(q) + firstBar;
  // The last bar a span sounds in (a span ending on a bar line ends in the bar before).
  const lastBar = (q: number) => bq(q - barQ / 96);
  const when = (m: { from: number; to: number }) => (bq(m.from) === lastBar(m.to) ? t("ui.study.bar", { a: bq(m.from) }) : t("ui.study.bars", { a: bq(m.from), b: lastBar(m.to) }));
  const momentText = (m: Moment) => {
    const v = m.voices.map((x) => names[x] ?? `${x + 1}`).join(" · ");
    switch (m.kind) {
      case "entry":
        return t(m.detail.inverted ? "ui.study.m.entryInv" : "ui.study.m.entry", { voice: v, degree: String(m.detail.degree), start: String(m.detail.start) });
      case "stretto":
        return t("ui.study.m.stretto", { voices: v, beats: String(m.detail.distance) });
      case "episode":
        return t(m.detail.last ? "ui.study.m.episodeLast" : "ui.study.m.episode", { bars: String(m.detail.bars) });
      case "pedal":
        return t("ui.study.m.pedal", { pitch: String(m.detail.pitch).replace(/-?\d+$/, ""), bars: String(m.detail.bars) });
      case "highest":
        return t("ui.study.m.highest", { pitch: String(m.detail.pitch), voice: v });
      case "lowest":
        return t("ui.study.m.lowest", { pitch: String(m.detail.pitch), voice: v });
      case "cadence":
        return t("ui.study.m.cadence");
      case "arrival":
        return t("ui.study.m.arrival", { key: keyLabel(Number(m.detail.tonic), Boolean(m.detail.minor)) });
      case "figure":
        return t("ui.study.m.figure", { bar: String(m.detail.bar) });
    }
  };
  // D133: the companion: what each moment does, and a line that follows the music while it plays.
  const lastChord = chords[chords.length - 1];
  const companion: CompanionContext = {
    minor, keyName: keyName(F.key), names, count, entries, firstShift: firstEntry?.shift ?? 0, entryVoice: (e) => entryVoice(e, voice),
    subjectNotes: F.subject.length, bars, barQ, barNo: bq, tonicPc,
    picardy: minor && !!lastChord && lastChord.quality === "maj" && lastChord.root === tonicPc, prelude: isPrelude,
    expoEnd: sections.find((x) => x.kind === "exposition")?.to ?? 0,
  };
  const say = (m: Moment) => (m.kind === "arrival" ? momentText(m) : commentOn(m, companion, moments));
  const [listening, setListening] = useState(() => stored("wtg.wtcCompanion", true, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.wtcCompanion", listening), [listening]);
  const nowMoment = playing && cursor >= 0 && listening ? momentAt(moments, cursor * barQ + barQ / 2) : null;
  const note = NOTES[F.id]?.[isPrelude ? "prelude" : "fugue"];
  const [filter, setFilter] = useState<"all" | "entry" | "other">("all");
  const shown = moments.filter((m) => filter === "all" || isPrelude || (filter === "entry" ? m.kind === "entry" : m.kind !== "entry"));
  const strettos = moments.filter((m) => m.kind === "stretto").length;
  const inversions = entries.filter((e) => e.inverted).length;
  const pedals = moments.filter((m) => m.kind === "pedal").length;

  const faint = new Set(Array.from({ length: count }, (_, v) => v).filter((v) => !audible(v)));
  const gameNotes = gameUntil !== null ? notes : notes;

  const guide = (
    <div className="guide wtc-study">
      <h3>{isPrelude ? t("ui.study.preludeOf", { label: fugueLabel(F) }) : fugueLabel(F)}</h3>
      {isPrelude && <p>{t("ui.study.preludeOverview", { key: keyName(F.key), bars, time: timeSig, voices: count, pedals })}</p>}
      <p className="companion-intro">{overview(companion, moments)}</p>
      {note && <p className="companion-note">{note}</p>}
      <label className="help"><input type="checkbox" checked={listening} onChange={(e) => setListening(e.target.checked)} /> {t("ui.study.listening")}</label>
      <p className="help">{t(isPrelude ? "ui.study.preludeHelp" : "ui.study.overviewHelp")}</p>
      <h4>{t("ui.study.sections")}</h4>
      <div className="wtc-sections">
        {sections.map((s, k) => (
          <button key={k} className="chipbtn" aria-pressed={activeMoment === `s${k}`} onClick={() => playSpan(s.from, s.to, `s${k}`)} title={t("ui.study.playSection")}>
            {s.kind === "toKey" && s.key ? t("ui.study.section.toKey", { key: keyLabel(s.key.tonic, s.key.minor) }) : t(`ui.study.section.${s.kind}`)} · {when(s)}
          </button>
        ))}
      </div>
      {!isPrelude && (
        <>
          <h4>{t("ui.study.entriesTitle")}</h4>
          <div className="row">
            <button className="chipbtn" onClick={() => allEntries(true)}>{t("ui.study.allEntriesAlone")}</button>{" "}
            <button className="chipbtn" onClick={() => allEntries(false)}>{t("ui.study.allEntriesContext")}</button>{" "}
            <label className="help"><input type="checkbox" checked={showEntries} onChange={(e) => setShowEntries(e.target.checked)} /> {t("ui.study.outline")}</label>
          </div>
        </>
      )}
      <h4>{t("ui.study.h.title")}</h4>
      <div className="row">
        <span className="values" role="radiogroup" aria-label={t("ui.study.h.title")}>
          {(["off", "roman", "letters"] as const).map((x) => (
            <button key={x} className="chipbtn" role="radio" aria-checked={harmony === x} aria-pressed={harmony === x} onClick={() => setHarmony(x)}>{t(`ui.study.h.${x}`)}</button>
          ))}
        </span>{" "}
        <button className="chipbtn" onClick={() => (span ? playChords(span.from, span.to) : playChords())} title={t("ui.study.h.skeletonHelp")}>{t("ui.study.h.skeleton")}</button>
      </div>
      <p>{plan.length ? t("ui.study.h.plan", { keys: [keyLabel(tonicPc, minor), ...plan.map((c) => `${keyLabel(c.tonic, c.minor)} (${t("ui.study.bar", { a: bq(c.at) })})`)].join(" → ") }) : t("ui.study.h.noPlan")}</p>
      {harmony !== "off" && (
        <div className="wtc-chords" aria-label={t("ui.study.h.title")}>
          {chords.map((c, k) => (
            <span key={k} style={{ display: "contents" }}>
              {(k === 0 || barOf(c.from) !== barOf(chords[k - 1].from)) && <span className="barno">{bq(c.from)}</span>}
              <button className="chipbtn" aria-pressed={activeMoment === `c${k}`} title={`${chordName(c, flats)} · ${romanOf(c, tonicPc, minor, k === chords.length - 1)}`} onClick={() => playSpan(c.from, c.to, `c${k}`)}>{chordLabel(c, k)}</button>
            </span>
          ))}
        </div>
      )}
      <p className="help">{t("ui.study.h.honest")}</p>
      <h4>{t("ui.study.moments")}</h4>
      <div className="row" hidden={isPrelude}>
        {(["all", "entry", "other"] as const).map((x) => (
          <button key={x} className="chipbtn" aria-pressed={filter === x} onClick={() => setFilter(x)}>{t(`ui.study.filter.${x}`)}</button>
        ))}
      </div>
      <ul className="wtc-moments">
        {shown.map((m, k) => {
          const key = `${m.kind}${m.from}${k}`;
          return (
            <li key={key} className={activeMoment === key ? "active" : ""}>
              <button className="chipbtn" onClick={() => playSpan(m.from, m.to, key)} aria-label={t("ui.study.play")}>▶</button>
              {m.kind === "entry" && (
                <button className="chipbtn" onClick={() => { setActiveMoment(key); setSpan({ from: m.from, to: m.to }); play(m.from, m.to, new Set(entries[Number(m.detail.index)].notes)); }} title={t("ui.study.aloneHelp")}>{t("ui.study.alone")}</button>
              )}
              <span className="when">{when(m)}</span>
              <span style={m.voices.length === 1 ? { borderLeft: `3px solid ${COLORS[m.voices[0] % COLORS.length]}`, paddingLeft: 6 } : undefined}>{say(m)}</span>
            </li>
          );
        })}
      </ul>
      <p className="help">{t("ui.study.machine")}</p>
    </div>
  );

  const voicesPanel = (
    <div className="guide wtc-study">
      <p className="help">{t("ui.study.voicesHelp")}</p>
      <div className="wtc-voices">
        {Array.from({ length: count }, (_, v) => (
          <div key={v} className="wtc-voice" style={{ ["--chip" as string]: COLORS[v % COLORS.length] }}>
            <span className="dot" aria-hidden="true" />
            <span className="vname">{names[v]}</span>
            <button className="chipbtn" aria-pressed={solo === v} onClick={() => setSolo(solo === v ? null : v)} title={t("ui.study.soloHelp")}>{t("ui.study.solo")}</button>
            <button className="chipbtn" aria-pressed={muted.has(v)} onClick={() => { const m = new Set(muted); if (m.has(v)) m.delete(v); else m.add(v); setMuted(m); }} title={t("ui.study.muteHelp")}>{t("ui.study.mute")}</button>
            <button className="chipbtn" aria-pressed={spot === v} onClick={() => setSpot(spot === v ? null : v)} title={t("ui.study.spotHelp")}>{t("ui.study.spot")}</button>
            <span className="help">{t("ui.study.voiceEntries", { n: entries.filter((e) => entryVoice(e, voice) === v).length })}</span>
          </div>
        ))}
      </div>
      <p className="help">{t("ui.study.voicesNote")}</p>
    </div>
  );

  const subjNow = F.subject.map((n, k) => {
    const p = parsePitch(n.pitch);
    // Spell the edited note on the key's degrees: move by the edit in semitones, nearest step.
    if (!edit[k]) return n.pitch;
    const target = p.midi + edit[k];
    for (const dd of [0, 1, -1, 2, -2]) {
      const d = p.diatonic + Math.round((edit[k] * 7) / 12) + dd;
      const step = STEPS[((d % 7) + 7) % 7];
      const oct = Math.floor(d / 7);
      const nat = 12 * (oct + 1) + [0, 2, 4, 5, 7, 9, 11][STEPS.indexOf(step)];
      const alter = target - nat;
      if (Math.abs(alter) <= 2) return `${step}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${oct}`;
    }
    return midiName(target, flats);
  });
  const setEdit = (k: number, d: number) => {
    const next = [...edit];
    next[k] += d;
    setEdits({ ...edits, [F.id]: next });
    void audio.playSequence([{ slot: 0, at: 0, length: 0.25, cantus: null, counterpoint: null, extra: [{ channel: "counterpoint", pitch: midiName(subject[k].midi + next[k], flats) }] }]);
  };
  /** A diatonic step from the current note (the key signature's alteration). */
  const stepEdit = (k: number, dir: 1 | -1) => {
    const cur = parsePitch(subjNow[k]);
    const d = cur.diatonic + dir;
    const step = STEPS[((d % 7) + 7) % 7];
    const nat = 12 * (Math.floor(d / 7) + 1) + [0, 2, 4, 5, 7, 9, 11][STEPS.indexOf(step)] + sig[step];
    setEdit(k, nat - cur.midi);
  };
  const workshop = (
    <div className="guide wtc-study wtc-workshop">
      <h4>{t("ui.study.ws.subject")}</h4>
      <p className="help">{t("ui.study.ws.subjectHelp")}</p>
      <div className="row">
        {subjNow.map((p, k) => (
          <button key={k} className="chipbtn" aria-pressed={wsSel === k} onClick={() => setWsSel(k)} style={edit[k] ? { color: "var(--accent, #e07b00)" } : undefined}>
            {p.replace(/-?\d+$/, "").replace("#", "♯").replace(/(?<=[A-G])b/, "♭")}
          </button>
        ))}
      </div>
      <div className="row">
        <button className="chipbtn" onClick={() => stepEdit(wsSel, 1)}>{t("ui.study.ws.up")}</button>
        <button className="chipbtn" onClick={() => stepEdit(wsSel, -1)}>{t("ui.study.ws.down")}</button>
        <button className="chipbtn" onClick={() => setEdit(wsSel, 1)}>♯</button>
        <button className="chipbtn" onClick={() => setEdit(wsSel, -1)}>♭</button>
        <button className="chipbtn" onClick={() => setEdits({ ...edits, [F.id]: F.subject.map(() => 0) })} disabled={!changed}>{t("ui.study.ws.reset")}</button>
        <button className="chipbtn" onClick={() => playSpan(firstEntry?.at ?? 0, firstEntry?.end ?? 4, null, new Set(firstEntry?.notes ?? []))}>{t("ui.study.ws.hearBach")}</button>
      </div>
      <p className="help">{subjNow.slice(1).map((p, k) => {
        const a = parsePitch(subjNow[k]).midi;
        const b = parsePitch(p).midi;
        return `${b - a > 0 ? "+" : ""}${b - a}`;
      }).join(" ")} {t("ui.study.ws.semitones")}</p>
      <h4>{t("ui.study.ws.through")}</h4>
      <p className="help">{t("ui.study.ws.throughHelp")}</p>
      <div className="row">
        {(["off", "alone", "texture"] as const).map((x) => (
          <button key={x} className="chipbtn" aria-pressed={through === x} disabled={x !== "off" && !changed} onClick={() => setThrough(x)}>{t(`ui.study.ws.through.${x}`)}</button>
        ))}
      </div>
      <h4>{t("ui.study.ws.new")}</h4>
      <p className="help">{t("ui.study.ws.newHelp")}</p>
      <div className="row">
        <label>{t("ui.study.ws.bar")} <input type="number" min={1} max={bars} value={newEntry.bar} onChange={(e) => setNewEntry({ ...newEntry, bar: Math.max(1, Math.min(bars, Number(e.target.value))) })} style={{ width: "4em" }} /></label>
        <label>{t("ui.study.ws.degree")}{" "}
          <select className="sel" value={newEntry.shift} onChange={(e) => setNewEntry({ ...newEntry, shift: Number(e.target.value) })}>
            {[-12, -7, -5, 0, 2, 3, 4, 5, 7, 8, 9, 10, 12].map((s) => (
              <option key={s} value={s}>{`${degreeOf(s, minor)}${s >= 12 ? " ↑8" : s < 0 ? " ↓" : ""} (${pitchName(subject[0].midi + s)})`}</option>
            ))}
          </select>
        </label>
        <label><input type="checkbox" checked={newEntry.inverted} onChange={(e) => setNewEntry({ ...newEntry, inverted: e.target.checked })} /> {t("ui.study.ws.inverted")}</label>
        <button className="chipbtn" onClick={() => setMine({ ...mine, [F.id]: [...myEntries, { ...newEntry }] })}>{t("ui.study.ws.add")}</button>
        <button className="chipbtn" disabled={!myEntries.length} onClick={() => setMine({ ...mine, [F.id]: [] })}>{t("ui.study.ws.clear")}</button>
      </div>
      {myEntries.length > 0 && (
        <ul className="wtc-moments">
          {myEntries.map((m, k) => {
            const from = (m.bar - firstBar) * barQ;
            const len = subject[subject.length - 1].at + subject[subject.length - 1].dur - subject[0].at;
            return (
              <li key={k}>
                <button className="chipbtn" onClick={() => playSpan(Math.max(0, from - barQ), from + len + barQ, `my${k}`)}>▶</button>
                <span>{t("ui.study.ws.mine", { bar: m.bar, degree: degreeOf(m.shift, minor), inv: m.inverted ? t("ui.study.ws.inv") : "" })}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="help">{t("ui.study.ws.honest")}</p>
    </div>
  );

  const nextPanel = (
    <div className="guide wtc-study">
      <h4>{t("ui.study.next.title")}</h4>
      <p>{t("ui.study.next.intro")}</p>
      {!game && <button className="primary" onClick={startGame} disabled={gameEntries.length < 2}>{t("ui.study.next.start")}</button>}
      {game && game.k < gameEntries.length && (
        <>
          <p>{t("ui.study.next.question", { n: game.k + 1, bar: bq(gameEntries[game.k].at) })}</p>
          {!game.last && (
            <div className="row">
              {DEGREES.map((d) => (
                <button key={d} className="chipbtn" onClick={() => guess(d)}>{`${degreeOf(d, minor)} · ${pitchName(tonicMidi + d).replace(/-?\d+$/, "")}`}</button>
              ))}
              <button className="chipbtn" onClick={() => playSpan(Math.max(0, gameEntries[game.k].at - 2 * barQ), gameEntries[game.k].at, null)}>{t("ui.study.next.again")}</button>
            </div>
          )}
          {game.last && (
            <p className={game.last.ok ? "verdict ok" : "verdict bad"}>
              {game.last.ok ? t("ui.study.next.right", { right: game.last.right }) : t("ui.study.next.wrong", { answer: game.last.answer, right: game.last.right })}
            </p>
          )}
          {game.last && game.last.phase === "notes" && (
            <>
              <p>{t("ui.study.next.writeNotes", { n: entryHead(gameEntries[game.k]).length })}</p>
              <div className="row">
                {(["C", "D", "E", "F", "G", "A", "B"] as Step[]).map((st) => (
                  <button key={st} className="chipbtn" onClick={() => writeLetter(st)}>{`${st}${sig[st] > 0 ? "♯" : sig[st] < 0 ? "♭" : ""}`}</button>
                ))}
                <button className="chipbtn" onClick={() => alterLast(1)} title={t("ui.accidental.sharp.help")}>♯</button>
                <button className="chipbtn" onClick={() => alterLast(-1)} title={t("ui.accidental.flat.help")}>♭</button>
                <button className="chipbtn" onClick={() => game.last && setGame({ ...game, last: { ...game.last, written: game.last.written.slice(0, -1) } })}>⌫</button>
              </div>
              <p className="help">{t("ui.study.next.written", { notes: game.last.written.map((pc) => midiName(60 + pc, flats).replace(/-?\d+$/, "").replace("#", "♯").replace(/(?<=[A-G])b/, "♭")).join(" ") || "–" })}</p>
              <div className="row">
                <button className="primary" onClick={() => checkNotes()} disabled={game.last.written.length < entryHead(gameEntries[game.k]).length}>{t("ui.study.next.check")}</button>
                <button className="chipbtn" onClick={() => checkNotes(true)}>{t("ui.study.next.skip")}</button>
              </div>
            </>
          )}
          {game.last && game.last.phase === "done" && (
            <p className={game.last.notesOk === false ? "verdict bad" : "verdict ok"}>
              {game.last.notesOk === null ? "" : game.last.notesOk ? t("ui.study.next.notesRight") : t("ui.study.next.notesWrong", { bach: entryHead(gameEntries[game.k]).map((m) => spell(m, sig, flats).replace(/-?\d+$/, "").replace("#", "♯").replace(/(?<=[A-G])b/, "♭")).join(" ") })}{" "}
              <button className="chipbtn" onClick={nextGame}>{t("ui.study.next.go")}</button>
            </p>
          )}
        </>
      )}
      {game && <p className="help">{t("ui.study.next.score", { score: game.score, tried: game.tried, n: gameEntries.length - 1, notes: game.notesScore })}</p>}
      {game && game.k >= gameEntries.length && <button className="chipbtn" onClick={startGame}>{t("ui.study.next.again2")}</button>}
      <p className="help">{t("ui.study.next.help")}</p>
    </div>
  );

  const rollNotes = gameNotes;
  // The score view: the chosen span's bars (or four from the bar playing), at most eight.
  const scoreFrom = span ? barOf(span.from) : Math.floor(Math.max(0, cursor) / 4) * 4; // pages of four bars while it plays
  const scoreTo = Math.min(bars - 1, span ? Math.max(barOf(span.to - 1e-6), scoreFrom) : scoreFrom + 3, scoreFrom + 7);
  /**
   * Each voice's staff, bar by bar (D134): the highest voice on the treble staff and the lowest on
   * the bass throughout; a middle voice on the staff its register needs, switching only when it
   * clearly leaves the other (above D4 or below A3 on average in the bar), as an engraver would.
   */
  const staffOf = useMemo(() => {
    const out = Array.from({ length: count }, () => new Array<0 | 1>(bars).fill(0));
    for (let v = 0; v < count; v++) {
      let cur: 0 | 1 | null = null;
      for (let b = 0; b < bars; b++) {
        const ms = notes.filter((n, i) => voice[i] === v && n.at < (b + 1) * barQ - 1e-6 && n.at + n.dur > b * barQ + 1e-6).map((n) => n.midi);
        if (count >= 2 && v === 0) cur = 0;
        else if (count >= 2 && v === count - 1) cur = 1;
        else if (ms.length) {
          const mean = ms.reduce((a, m) => a + m, 0) / ms.length;
          if (cur === null) cur = mean >= 60 ? 0 : 1;
          else if (cur === 1 && mean >= 62) cur = 0;
          else if (cur === 0 && mean <= 57) cur = 1;
        }
        out[v][b] = cur ?? (v < count / 2 ? 0 : 1);
      }
    }
    return out;
  }, [notes, voice, count, bars, barQ]);
  /**
   * The voices of bars `fromBar`..`toBar` for the score, from the bar's start: each voice split by
   * the staff it is on in each bar; notes struck together in one voice drawn as a chord (those of
   * the same length; a shorter one is left out).
   */
  const voicesFor = (fromBar: number, toBar: number): WtcScoreVoice[] => {
    const q0 = fromBar * barQ;
    const q1 = (toBar + 1) * barQ;
    const starts = new Map<number, string>();
    for (const e of entries) starts.set(e.notes[0], e.inverted ? "∀" : "S");
    const out: WtcScoreVoice[] = [];
    for (let v = 0; v < count; v++) {
      const all = notes
        .map((n, i) => ({ n, i }))
        .filter(({ n, i }) => voice[i] === v && n.at < q1 - 1e-6 && n.at + n.dur > q0 + 1e-6 && !(gameUntil !== null && n.at >= gameUntil - 1e-6))
        .sort((a, b) => a.n.at - b.n.at || b.n.midi - a.n.midi);
      // Chords: notes struck together; the first (highest) carries the others of its length.
      const heads: { n: FullNote; i: number; chord: string[] }[] = [];
      for (const x of all) {
        const h = heads[heads.length - 1];
        if (h && Math.abs(h.n.at - x.n.at) < 1e-6) {
          if (Math.abs(h.n.dur - x.n.dur) < 1e-6 && x.n.midi !== h.n.midi) h.chord.push(P.spelled[x.i] ?? spell(x.n.midi, sig, flats));
        } else heads.push({ ...x, chord: [] });
      }
      for (const st of [0, 1] as const) {
        const mine = heads.filter(({ n }) => staffOf[v][Math.max(0, Math.min(bars - 1, barOf(Math.max(n.at, q0))))] === st);
        if (!mine.length) continue;
        out.push({
          notes: mine.map(({ n, i, chord }, k) => {
            const at = Math.max(n.at, q0);
            // A note overlapping the next in its voice is cut where the next begins.
            const next = mine[k + 1]?.n.at ?? Infinity;
            const end = Math.min(n.at + n.dur, q1, next);
            return { pitch: P.spelled[i] ?? spell(n.midi, sig, flats), at: at - q0, dur: Math.max(1 / 96, end - at), ...(chord.length ? { chord } : {}), ...(starts.has(i) && n.at >= q0 ? { label: starts.get(i) } : {}) };
          }),
          staff: st,
          ink: COLORS[v % COLORS.length],
          editable: false,
        });
      }
    }
    return out;
  };
  const scoreVoices: WtcScoreVoice[] = useMemo(() => voicesFor(scoreFrom, scoreTo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoreFrom, scoreTo, P, barQ, entries, count, notes, voice, sig, flats, gameUntil, staffOf]);
  // The page (D127): rows of a few bars, the row playing on top (else the chosen span's, else the first), three rows.
  // As many bars to a row as fill it: the score's width per bar grows with the busiest voice's notes
  // (WtcScore: 46 + 30 per note, 150 at least); a row is about 1800 wide before scaling.
  const rowBars = useMemo(() => {
    const perBar = Array.from({ length: bars }, (_, b) => {
      const on = new Map<number, Set<number>>();
      notes.forEach((n, i) => {
        if (n.at >= b * barQ - 1e-6 && n.at < (b + 1) * barQ - 1e-6) (on.get(voice[i]) ?? on.set(voice[i], new Set()).get(voice[i])!).add(Math.round(n.at * 96));
      });
      return Math.max(150, 46 + 30 * Math.max(1, ...[...on.values()].map((x) => x.size)));
    });
    const mean = perBar.reduce((a, x) => a + x, 0) / Math.max(1, bars);
    return Math.max(2, Math.min(8, Math.floor(1700 / mean)));
  }, [notes, voice, bars, barQ]);
  const [pageTop, setPageTop] = useState(0);
  useEffect(() => {
    if (cursor >= 0) setPageTop(Math.floor(cursor / rowBars));
  }, [cursor, rowBars]);
  useEffect(() => {
    if (span) setPageTop(Math.floor(barOf(span.from) / rowBars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [span?.from, rowBars]);
  useEffect(() => setPageTop(0), [L.id, isPrelude]);
  const pageRows = useMemo(() => {
    const out = [];
    for (let r = pageTop; r < pageTop + 3 && r * rowBars < bars; r++) {
      const a = r * rowBars;
      const z = Math.min(bars - 1, a + rowBars - 1);
      out.push({ key: `${L.id}${isPrelude}${r}`, bars: z - a + 1, voices: voicesFor(a, z), cursor: cursor >= a && cursor <= z ? cursor - a : -1, label: `${fugueLabel(F)}, ${t("ui.study.bars", { a: a + firstBar, b: z + firstBar })}` });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTop, rowBars, bars, cursor, P, entries, staffOf, gameUntil, sig, flats]);
  const rollHidden = useMemo(() => {
    if (gameUntil === null) return hidden;
    const h = new Set(hidden);
    notes.forEach((n, i) => n.at >= gameUntil - 1e-6 && h.add(i));
    return h;
  }, [hidden, gameUntil, notes]);

  return (
    <Shell
      header={
        <>
          <h1 className="brand">{t("ui.title")}</h1>
          <nav className="exercise-nav" aria-label={t("ui.nav.label")}>
            <button className="icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("ui.nav.prev")}>‹</button>
            <select id="voices" className="sel sel-voices" value="wtc" aria-label={t("ui.nav.voices")} onChange={(e) => (stop(), onVoices(e.target.value === "wtc" ? "wtc" : (Number(e.target.value) as 2 | 3)))}>
              <option value={2}>{t("ui.nav.voicesN", { n: 2 })}</option>
              <option value={3}>{t("ui.nav.voicesN", { n: 3 })}</option>
              <option value="wtc">{t("ui.wtc.mode")}</option>
            </select>
            <select id="exercise" className="sel sel-exercise" value={index} onChange={(e) => go(Number(e.target.value))} aria-label={t("ui.wtc.fugue")}>
              {LIBRARY.map((f, k) => (
                <option key={f.id} value={k}>{fugueLabel(f)}</option>
              ))}
            </select>
            <button className="icon" onClick={() => go(index + 1)} disabled={index === LIBRARY.length - 1} aria-label={t("ui.nav.next")}>›</button>
            <span className="values" role="radiogroup" aria-label={t("ui.study.piece")}>
              <button className="chipbtn" role="radio" aria-checked={isPrelude} aria-pressed={isPrelude} onClick={() => choosePiece("prelude")}>{t("ui.study.prelude")}</button>
              <button className="chipbtn" role="radio" aria-checked={!isPrelude} aria-pressed={!isPrelude} onClick={() => choosePiece("fugue")}>{t("ui.study.fugue")}</button>
            </span>
            <button className="chipbtn" onClick={() => (stop(), onExercises())} title={t("ui.study.exercisesHelp")}>{t("ui.study.exercises")}</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("guide")} onTutorial={onTutorial} />
        </>
      }
      score={
        <div className="score-wrap wtc">
          {nowMoment && (
            <div className="companion-now" aria-live="polite">
              <span className="companion-label">{t("ui.study.listeningNow", { bar: bq(cursor * barQ) })}</span> {say(nowMoment)}
            </div>
          )}
          {view === "page" ? (
            <WtcPage rows={pageRows} keySig={vexKey(F.key)} signature={sig} time={timeSig} barQuarters={barQ} selected={null} onSlot={() => undefined} />
          ) : view === "score" ? (
            <WtcScore
              voices={scoreVoices}
              keySig={vexKey(F.key)}
              signature={sig}
              time={timeSig}
              barQuarters={barQ}
              selected={null}
              cursor={cursor >= scoreFrom && cursor <= scoreTo ? cursor - scoreFrom : -1}
              label={`${fugueLabel(F)}, ${t("ui.study.bars", { a: scoreFrom + firstBar, b: scoreTo + firstBar })}`}
              onSlot={() => undefined}
              zoom={zoom}
              onZoom={setZoom}
              zoomLabels={{ in: t("ui.zoom.in"), out: t("ui.zoom.out"), reset: t("ui.zoom.reset") }}
              tools={<span className="help">{t("ui.study.scoreBars", { a: scoreFrom + firstBar, b: scoreTo + firstBar })}</span>}
            />
          ) : (
          <VoiceRoll
            notes={rollNotes}
            voice={voice}
            colors={COLORS}
            faint={faint}
            entries={gameUntil !== null ? entries.filter((e) => e.end <= gameUntil + 1e-6) : entries}
            showEntries={showEntries && through === "off"}
            barQuarters={barQ}
            cursor={cursor}
            span={span}
            extra={gameUntil !== null ? [] : [...throughNotes, ...myNotes]}
            hidden={rollHidden}
            onBar={(b) => (game ? undefined : (setSpan(null), setActiveMoment(null), play(b * barQ)))}
            label={fugueLabel(F)}
            firstBar={firstBar}
            strip={harmony === "off" || gameUntil !== null ? undefined : chords.map((c, k) => ({ from: c.from, to: c.to, text: chordLabel(c, k), title: `${chordName(c, flats)} · ${romanOf(c, tonicPc, minor, k === chords.length - 1)}` }))}
            onStrip={(k) => playSpan(chords[k].from, chords[k].to, `c${k}`)}
          />
          )}
        </div>
      }
      transport={
        <div className="controls">
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <div className="play-split">
              <button className="icon play" onClick={() => (playing ? stop() : span ? play(span.from, span.to) : play())} aria-label={t("ui.play.player")} title={t("ui.study.playHelp")}>{playing ? "■" : "▶"}</button>
            </div>
            {span && <button className="chipbtn" onClick={() => (setSpan(null), setActiveMoment(null))} title={t("ui.study.wholeHelp")}>{t("ui.study.whole")}</button>}
            <span className="values" role="radiogroup" aria-label={t("ui.wtc.view")}>
              <button className="chipbtn" role="radio" aria-checked={view === "roll"} aria-pressed={view === "roll"} onClick={() => setView("roll")} title={t("ui.study.rollHelp")}>{t("ui.study.roll")}</button>
              <button className="chipbtn" role="radio" aria-checked={view === "score"} aria-pressed={view === "score"} onClick={() => setView("score")} title={t("ui.study.scoreHelp")}>{t("ui.study.score")}</button>
              <button className="chipbtn" role="radio" aria-checked={view === "page"} aria-pressed={view === "page"} onClick={() => setView("page")} title={t("ui.study.pageHelp")}>{t("ui.study.page")}</button>
              {view === "page" && (
                <>
                  <button className="icon" onClick={() => setPageTop(Math.max(0, pageTop - 1))} disabled={pageTop === 0} aria-label={t("ui.study.pageUp")}>▲</button>
                  <button className="icon" onClick={() => setPageTop(Math.min(Math.ceil(bars / rowBars) - 1, pageTop + 1))} disabled={(pageTop + 1) * rowBars >= bars} aria-label={t("ui.study.pageDown")}>▼</button>
                </>
              )}
            </span>
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.wtc.tempoHelp")} value={tempo} min={15} max={120} defaultValue={36} format={(v) => `♩=${Math.round(v * 2)}`} onChange={(v) => setTempo(Math.round(v))} />
              <HFader label={t("ui.volume")} help={t("ui.volume.help")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
            </div>
            <select className="sel" value={tuning} disabled={useRec} onChange={(e) => setTuning(e.target.value as TemperamentId)} aria-label={t("ui.tuning")} title={t("ui.wtc.tuningHelp")}>
              {WELL.map((x) => (
                <option key={x} value={x}>{t(`ui.tuning.${x}`)}</option>
              ))}
            </select>
            <select className="sel" value={useRec ? "recording" : "synth"} onChange={(e) => (stop(), setSource(e.target.value === "recording" ? "recording" : "synth"))} aria-label={t("ui.study.rec.source")} title={t(track ? "ui.study.rec.help" : "ui.study.rec.none")}>
              <option value="synth">{t("ui.study.rec.synth")}</option>
              <option value="recording" disabled={!track}>{track ? t("ui.study.rec.of", { performer: track.performer }) : t("ui.study.rec.ishizaka")}</option>
            </select>
            <select className="sel" value={instrument} disabled={useRec} onChange={(e) => setInstrument(e.target.value as Instrument)} aria-label={t("ui.wtc.instrument")}>
              {INSTRUMENTS.map((x) => (
                <option key={x} value={x}>{t(`ui.wtc.instrument.${x}`)}</option>
              ))}
            </select>
          </div>
          <div className="group" role="group" aria-label={t("ui.study.voices")}>
            {Array.from({ length: count }, (_, v) => (
              <button key={v} className="chipbtn" aria-pressed={spot === v} style={spot === v ? { background: COLORS[v % COLORS.length], color: "#fff", fontWeight: 700 } : { color: COLORS[v % COLORS.length], fontWeight: 700 }} onClick={() => setSpot(spot === v ? null : v)} title={t("ui.study.spotHelp")}>
                {names[v]}
              </button>
            ))}
          </div>
        </div>
      }
      tab={isPrelude && (tab === "workshop" || tab === "next") ? "guide" : tab}
      onTab={setTab}
      idle={`${useRec && track ? `Recording: ${track.performer === "Kimiko Ishizaka" ? "Kimiko Ishizaka, The Open Well-Tempered Clavier (2015)" : "Arthur Loesser (1964), via the Internet Archive"}, ${track.licence}; bars timed by the game. ` : ""}J. S. Bach, Das wohltemperirte Clavier, ${roman(F.book)}, ${isPrelude ? "Praeludium" : "Fuga"} ${F.number} (BWV ${F.bwv}). Encoding: David Huron (Humdrum, 1994, after the Bach-Gesellschaft edition; rights to derivative electronic formats reserved, for study only); ${isPrelude ? "strands, " : "voices as encoded; entries, "}chords and cadences found by the game.`}
      tabs={[
        { id: "guide", text: true, label: t("ui.study.tab.guide"), content: guide },
        { id: "voices", label: t("ui.study.tab.voices"), content: voicesPanel },
        ...(isPrelude
          ? []
          : [
              { id: "workshop", text: true, label: t("ui.study.tab.workshop"), content: workshop },
              { id: "next", text: true, label: t("ui.study.tab.next"), content: nextPanel },
            ]),
      ]}
    />
  );
}
