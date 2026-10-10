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
import { degreeOf, entryVoice, pitchName, studyMoments, voiceNames, type Moment, type Section as StudySection } from "../wtc/study.ts";
type Section = Omit<StudySection, "kind"> & { kind: StudySection["kind"] | "toKey" | "figure"; key?: { tonic: number; minor: boolean } };
import { parsePitch, type Step } from "../music/pitch.ts";
import { VoiceRoll, type RollExtra } from "./notation/VoiceRoll.tsx";
import { WtcSheet, type Ink } from "./notation/WtcSheet.tsx";
import { KeyStrip } from "./notation/KeyStrip.tsx";
import { Navigator } from "./notation/Navigator.tsx";
import { LivePos } from "./LivePos.tsx";
import { linkOf, parseLink } from "./wtc-link.ts";
import { barIndex, engrave } from "../wtc/engrave.ts";
import { playhead } from "./playhead.ts";
import { restoreSound, type SoundState } from "../audio/sound.ts";
import { SYNTH_PRESETS } from "../audio/synth-settings.ts";
import { WELL, type TemperamentId } from "../audio/temperament.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { HFader } from "./HFader.tsx";
import { quartersAt, recording, secondsAt, trackOf } from "../audio/recording.ts";
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
  /** The bars as the encoding has them (D147: the metre can change within a piece). */
  const starts = P.barStarts;
  const bars = starts.length - 1;
  const barOf = (q: number) => barIndex(starts, q);
  const barStart = (b: number) => starts[Math.max(0, Math.min(bars, b))];
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
  /** The recording's speed (D147): slower to follow it closely, the pitch kept. */
  const [recRate, setRecRate] = useState(() => stored("wtg.wtcRecRate", 1, (v) => typeof v === "number" && v >= 0.5 && v <= 1.25));
  useEffect(() => {
    recording.setRate(recRate);
    store("wtg.wtcRecRate", recRate);
  }, [recRate]);
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
  const [span, setSpan] = useState<{ from: number; to: number } | null>(() => {
    const link = parseLink(window.location.hash);
    if (!link || link.id !== L.id || link.bar === null || link.to === null) return null;
    const b = (x: number) => Math.max(0, Math.min(P.barStarts.length - 2, x - (1 - P.pickup)));
    return { from: P.barStarts[b(link.bar)], to: P.barStarts[b(link.to) + 1] };
  });
  /** Where Play starts when nothing plays (after a pause or a click), in quarters (D147); a link may name it. */
  const [marker, setMarker] = useState<number | null>(() => {
    const link = parseLink(window.location.hash);
    return link && link.id === L.id && link.bar !== null ? P.barStarts[Math.max(0, Math.min(P.barStarts.length - 2, link.bar - (1 - P.pickup)))] : null;
  });
  /** Play the chosen passage (else the whole piece) again and again. */
  const [loop, setLoop] = useState(() => stored("wtg.wtcLoop", false, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.wtcLoop", loop), [loop]);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  /** The page follows the music. */
  const [follow, setFollow] = useState(() => stored("wtg.wtcFollow", true, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.wtcFollow", follow), [follow]);
  /** The notes' colours on the page: by voice, only the subject's entries, or none. */
  const [ink, setInk] = useState<Ink>(() => stored("wtg.wtcInk", "voices" as Ink, (v) => v === "voices" || v === "entries" || v === "plain"));
  useEffect(() => store("wtg.wtcInk", ink), [ink]);
  const [sheetZoom, setSheetZoom] = useState(() => stored("wtg.wtcSheetZoom", 1, (v) => typeof v === "number" && v >= 0.6 && v <= 2));
  useEffect(() => store("wtg.wtcSheetZoom", sheetZoom), [sheetZoom]);
  /** The reader's own notes, bar by bar, for each piece (D147): { "wtc1.02fugue": { 12: "…" } }, bars counted from 0. */
  const [annotations, setAnnotations] = useState<Record<string, Record<string, string>>>(() => stored("wtg.wtcNotes", {}, (v) => typeof v === "object" && v !== null && !Array.isArray(v)));
  useEffect(() => store("wtg.wtcNotes", annotations), [annotations]);
  /** The View menu closes on a click elsewhere. */
  const viewMenu = useRef<HTMLSpanElement>(null);
  const [viewOpen, setViewOpen] = useState(false);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      const m = viewMenu.current;
      if (m && !m.contains(e.target as Node)) setViewOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);
  /** The music alone: the bottom panel folded away (Z). */
  const [focus, setFocus] = useState(() => stored("wtg.wtcFocus", false, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.wtcFocus", focus), [focus]);
  /** The keyboard under the score, its keys pressed as the music plays. */
  const [keys, setKeys] = useState(() => stored("wtg.wtcKeys", true, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.wtcKeys", keys), [keys]);
  /** The roll, or the page of music (D147; the Score and Page views of D124 and D127 before it). */
  const [view, setView] = useState<"roll" | "sheet">(() => (stored<string>("wtg.wtcStudyView", "sheet", (v) => typeof v === "string") === "roll" ? "roll" : "sheet"));
  useEffect(() => store("wtg.wtcStudyView", view), [view]);
  const [activeMoment, setActiveMoment] = useState<string | null>(null);
  /** The harmonic reading over the roll: off, by Roman numeral, by letter (D125). */
  const [harmony, setHarmony] = useState<"off" | "roman" | "letters">(() => stored("wtg.wtcHarmony", "roman", (v) => v === "off" || v === "roman" || v === "letters"));
  useEffect(() => store("wtg.wtcHarmony", harmony), [harmony]);
  /** What is playing: to play it again (the loop), or from where it is at another tempo. */
  const current = useRef<{ from: number; to: number; only?: Set<number>; replay?: () => void } | null>(null);
  const ended = useRef<() => void>(() => undefined);
  ended.current = () => {
    playhead.stop();
    const c = current.current;
    if (loopRef.current && c) {
      if (c.replay) c.replay();
      else play(c.from, c.to, c.only);
    } else {
      setPlaying(false);
      current.current = null;
    }
  };
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
    const start = barStart(m.bar - firstBar) + (F.phase % barQ);
    return subject.map((s, k) => {
      const d = (s.midi - subject[0].midi) + edit[k] - edit[0];
      return { midi: subject[0].midi + edit[0] + m.shift + (m.inverted ? -d : d), at: start + (s.at - subject[0].at), dur: s.dur, voice: m.voice };
    });
  });
  const hidden = useMemo(() => (through !== "off" && changed ? new Set(entries.flatMap((e) => e.notes)) : new Set<number>()), [through, changed, entries]);
  const throughNotes: RollExtra[] = through !== "off" && changed ? entries.flatMap((e) => changedEntryNotes(e).map(({ i, midi }) => ({ midi, at: notes[i].at, dur: notes[i].dur }))) : [];

  /** The playhead's mapping for the game's sounds: the first event sounds at `t0`; each stretch [score from, to) at its offset in wholes. */
  const follow0 = (t0: number, first: number, parts: { at: number; from: number; to: number }[]) => {
    const whole = audio.barSeconds;
    playhead.start(() => audio.now, parts.map((x) => ({ t0: t0 + (x.at - first) * whole, t1: t0 + (x.at + (x.to - x.from) / 4 - first) * whole, q0: x.from, q1: x.to })), 4 / whole);
  };
  /** The playhead's mapping for the recording: its bar timings. */
  const followRec = () => {
    if (!track) return;
    const mean = (track.bars[track.bars.length - 1] - track.bars[0]) / Math.max(1, track.bars.length - 1);
    playhead.follow(() => {
      const sec = recording.time();
      return sec === null ? null : quartersAt(track, sec, barQ);
    }, (barQ / Math.max(0.1, mean)) * recRate);
  };
  const halt = () => {
    audio.stop();
    recording.stop();
    playhead.stop();
  };

  /** Play from `from` to `to` (quarters); `only` limits to some notes; the workshop's notes join. */
  const play = (from = 0, to = end, only?: Set<number>) => {
    halt();
    current.current = { from, to, only };
    setMarker(null);
    // D128: the recording, where there is one and nothing asks for the game's own sounds (a voice
    // alone, the workshop's subject or entries).
    if (useRec && track && !only && !(through !== "off" && changed) && !(myNotes.length && !game)) {
      setPlaying(true);
      followRec();
      void recording.play(track.urls, [[secondsAt(track, Math.max(0, from), barQ), secondsAt(track, to, barQ)]], () => undefined, () => ended.current(), volume / 100);
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
    void audio.playAll(
      evs,
      (k) => k < 0 && ended.current(),
      (t0) => follow0(t0, evs[0].at, [{ at: 0, from, to }]),
    );
  };
  /** Stop, and forget where it was. */
  const stop = () => {
    halt();
    current.current = null;
    setPlaying(false);
    setMarker(null);
  };
  /** Stop, and remember where it was (Play goes on from there). */
  const pause = () => {
    const q = playhead.pos();
    halt();
    setPlaying(false);
    setMarker(q);
  };
  /** Play, or go on: from the marker, else the chosen passage, else the start. */
  const resume = () => {
    const from = marker ?? span?.from ?? 0;
    const inSpan = span && from >= span.from - 1e-6 && from < span.to - 1e-6;
    const c = current.current;
    if (c && marker !== null && from >= c.from - 1e-6 && from < c.to - 1e-6) return play(from, c.to, c.only);
    play(from, inSpan ? span.to : end);
  };
  const toggle = () => (playing ? pause() : resume());
  /** A click on the music: play from there (to the end of the chosen passage if it is inside it). */
  const seek = (q: number) => {
    if (game) return;
    const inSpan = span && q >= span.from - 1e-6 && q < span.to - 1e-6;
    if (!inSpan) {
      setSpan(null);
      setActiveMoment(null);
    }
    play(q, inSpan ? span!.to : end);
  };
  /** A passage chosen by dragging across bars. */
  const select = (from: number, to: number) => {
    setSpan({ from, to });
    setActiveMoment(null);
    if (playing) play(from, to);
    else setMarker(from);
  };
  // A new tempo while the music plays: on from where it is, at the new tempo.
  useEffect(() => {
    if (!playing || useRec) return;
    const id = window.setTimeout(() => {
      const q = playhead.pos();
      const c = current.current;
      if (q !== null && c && !c.replay) play(q, c.to, c.only);
    }, 160);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempo]);
  const playSpan = (from: number, to: number, key: string | null, only?: Set<number>) => {
    setSpan({ from, to });
    setActiveMoment(key);
    play(Math.max(0, from), to, only);
  };
  /** The chords alone, as a skeleton: each chord's bass and its tones close above middle C, held for its span. */
  const playChords = (from = 0, to = end) => {
    halt();
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
    current.current = { from, to, replay: () => playChords(from, to) };
    setPlaying(true);
    void audio.playAll(
      evs,
      (k) => k < 0 && ended.current(),
      (t0) => follow0(t0, evs[0].at, [{ at: 0, from, to }]),
    );
  };
  const chordLabel = (c: Chord, k: number) => (harmony === "letters" ? chordName(c, flats) : romanOf(c, tonicPc, minor, k === chords.length - 1));
  const keyLabel = (tonic: number, mi: boolean) => `${(flats ? FLATS : SHARPS)[tonic].replace("#", "♯").replace(/(?<=[A-G])b/, "♭")} ${mi ? t("ui.study.h.minor") : t("ui.study.h.major")}`;
  /** Every entry in a row: alone (its own notes) or in its texture, a breath between. */
  const allEntries = (alone: boolean) => {
    halt();
    current.current = { from: 0, to: end, replay: () => allEntries(alone) };
    setMarker(null);
    if (useRec && track && !alone) {
      setPlaying(true);
      followRec();
      void recording.play(track.urls, entries.map((e) => [secondsAt(track, e.at, barQ), secondsAt(track, e.end, barQ)] as [number, number]), () => undefined, () => ended.current(), volume / 100);
      return;
    }
    const evs: PlayEvent[] = [];
    const parts: { at: number; from: number; to: number }[] = [];
    let t0 = 0;
    for (const e of entries) {
      const from = e.at;
      const to = e.end;
      parts.push({ at: t0, from, to });
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
    if (!evs.length) return;
    setPlaying(true);
    void audio.playAll(
      evs,
      (k) => k < 0 && ended.current(),
      (start) => follow0(start, evs[0].at, parts),
    );
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

  // The address names the piece and the passage (D147), so that it can be shared or kept.
  const linkHere = (): string => linkOf({ id: L.id, piece, bar: span ? barOf(span.from + 1e-6) + firstBar : marker !== null ? barOf(marker + 1e-6) + firstBar : null, to: span ? barOf(span.to - 1e-3) + firstBar : null });
  useEffect(() => {
    if (playing) return;
    try {
      window.history.replaceState(null, "", linkHere());
    } catch {
      /* not allowed here */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L.id, piece, marker, span, playing]);
  useEffect(
    () => () => {
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {
        /* not allowed here */
      }
    },
    [],
  );
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    const url = window.location.href.split("#")[0] + linkHere();
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  // Keys (D147): Space plays or pauses, Escape stops, ← → a bar back or on, Home the start, L the
  // loop, F following, [ ] the tempo, 1-6 a voice alone (again: all).
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e: KeyboardEvent) => {
    const tg = e.target as HTMLElement | null;
    if (tg && /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const here = () => playhead.pos() ?? marker ?? span?.from ?? 0;
    const jump = (q: number) => {
      const to = Math.max(0, Math.min(end - 1e-3, q));
      if (playing) seek(to);
      else setMarker(to);
    };
    if (e.key === " ") {
      e.preventDefault();
      toggle();
    } else if (e.key === "Escape") stop();
    else if (e.key === "ArrowRight") {
      e.preventDefault();
      jump(barStart(barOf(here() + 1e-3) + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const q = here();
      const b = barOf(q + 1e-3);
      // Within the first beat of a bar (or playing), back to the bar before; else to this bar's start.
      jump(barStart(q - barStart(b) < 0.75 || playing ? b - 1 : b));
    } else if (e.key === "Home") jump(0);
    else if (e.key === "l" || e.key === "L") setLoop(!loop);
    else if (e.key === "f" || e.key === "F") setFollow(!follow);
    else if (e.key === "z" || e.key === "Z") setFocus(!focus);
    else if (e.key === "k" || e.key === "K") setKeys(!keys);
    else if (e.key === "[") (useRec ? setRecRate(Math.max(0.5, Math.round((recRate - 0.05) * 100) / 100)) : setTempo(Math.max(15, tempo - 3)));
    else if (e.key === "]") (useRec ? setRecRate(Math.min(1.25, Math.round((recRate + 0.05) * 100) / 100)) : setTempo(Math.min(120, tempo + 3)));
    else if (/^[1-6]$/.test(e.key) && Number(e.key) <= count) {
      const v = Number(e.key) - 1;
      setSolo(solo === v ? null : v);
    }
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
  const sectionName = (s: Section) => (s.kind === "toKey" && s.key ? t("ui.study.section.toKey", { key: keyLabel(s.key.tonic, s.key.minor) }) : t(`ui.study.section.${s.kind}`));
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
      <p>{isPrelude ? t("ui.study.preludeOverview", { key: keyName(F.key), bars, time: timeSig, voices: count, pedals }) : t("ui.study.overview", { key: keyName(F.key), voices: count, bars, entries: entries.length, inv: inversions, strettos, pedals })}</p>
      <p className="help">{t(isPrelude ? "ui.study.preludeHelp" : "ui.study.overviewHelp")}</p>
      <h4>{t("ui.study.sections")}</h4>
      <div className="wtc-sections">
        {sections.map((s, k) => (
          <button key={k} className="chipbtn" aria-pressed={activeMoment === `s${k}`} onClick={() => playSpan(s.from, s.to, `s${k}`)} title={t("ui.study.playSection")}>
            {sectionName(s)} · {when(s)}
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
              <span style={m.voices.length === 1 ? { color: COLORS[m.voices[0] % COLORS.length] } : undefined}>{momentText(m)}</span>
            </li>
          );
        })}
      </ul>
      <p className="help">{t("ui.study.machine")}</p>
    </div>
  );

  const pieceKey = `${L.id}${piece}`;
  const mine2: Record<string, string> = annotations[pieceKey] ?? {};
  const noteBars = Object.keys(mine2).map(Number).filter((b) => mine2[b]?.trim()).sort((a, b) => a - b);
  /** The bar the notes tab writes at: where Play would start (a pause, a click, the passage chosen). */
  const noteBar = barOf((marker ?? span?.from ?? 0) + 1e-6);
  const setNote = (b: number, text: string) => {
    const next: Record<string, string> = { ...mine2, [b]: text };
    if (!text.trim()) delete next[String(b)];
    setAnnotations({ ...annotations, [pieceKey]: next });
  };
  const notesText = () => [`${isPrelude ? "Prelude" : "Fugue"} ${fugueLabel(F)}`, ...noteBars.map((b) => `${t("ui.study.bar", { a: b + firstBar })}: ${mine2[b]}`)].join("\n");
  const notesPanel = (
    <div className="guide wtc-study wtc-notes">
      <p className="help">{t("ui.study.notes.help")}</p>
      <h4>{t("ui.study.bar", { a: noteBar + firstBar })}</h4>
      <textarea
        className="wtc-note-edit"
        rows={3}
        value={mine2[noteBar] ?? ""}
        placeholder={t("ui.study.notes.placeholder")}
        onChange={(e) => setNote(noteBar, e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <div className="row">
        <button className="chipbtn" onClick={() => setMarker(barStart(Math.max(0, noteBar - 1)))} disabled={noteBar === 0}>‹ {t("ui.study.notes.prev")}</button>
        <button className="chipbtn" onClick={() => setMarker(barStart(Math.min(bars - 1, noteBar + 1)))} disabled={noteBar >= bars - 1}>{t("ui.study.notes.next")} ›</button>
        <button className="chipbtn" onClick={() => seek(barStart(noteBar))}>▶ {t("ui.study.notes.play")}</button>
        <button className="chipbtn" disabled={!noteBars.length} onClick={() => void navigator.clipboard?.writeText(notesText())}>{t("ui.study.notes.copy")}</button>
      </div>
      {noteBars.length > 0 && (
        <ul className="wtc-moments">
          {noteBars.map((b) => (
            <li key={b} className={b === noteBar ? "active" : ""}>
              <button className="chipbtn" onClick={() => seek(barStart(b))} aria-label={t("ui.study.play")}>▶</button>
              <button className="chipbtn" onClick={() => setMarker(barStart(b))} title={t("ui.study.notes.edit")}>{t("ui.study.bar", { a: b + firstBar })}</button>
              <span className="note-text">{mine2[b]}</span>
              <button className="chipbtn" onClick={() => setNote(b, "")} aria-label={t("ui.study.notes.delete")}>✕</button>
            </li>
          ))}
        </ul>
      )}
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
            const from = barStart(m.bar - firstBar);
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
  const rollHidden = useMemo(() => {
    if (gameUntil === null) return hidden;
    const h = new Set(hidden);
    notes.forEach((n, i) => n.at >= gameUntil - 1e-6 && h.add(i));
    return h;
  }, [hidden, gameUntil, notes]);
  // The page of music (D147): the engraving of the whole piece (the notes still to come hidden in the game).
  const sheetHidden = useMemo(() => {
    if (gameUntil === null) return undefined;
    return new Set(notes.map((_, i) => i).filter((i) => notes[i].at >= gameUntil - 1e-6));
  }, [gameUntil, notes]);
  const eng = useMemo(
    () => engrave({ notes, spelled: notes.map((n, i) => P.spelled[i] ?? spell(n.midi, sig, flats)), voice, count, barQuarters: barQ, time: timeSig, hidden: sheetHidden, barStarts: starts, meters: P.meters, mergeStrands: isPrelude }),
    [notes, P, voice, count, barQ, timeSig, sig, flats, sheetHidden, starts, isPrelude],
  );
  /** Each entry's first note, labelled with the degree it enters on (∀ upside down). */
  const sheetLabels = useMemo(() => {
    const m = new Map<number, string>();
    if (!showEntries) return m;
    for (const e of entries) {
      const first = [...e.notes].sort((a, b) => notes[a].at - notes[b].at)[0];
      if (first === undefined) continue;
      m.set(first, `${e.inverted ? "∀" : "S"} ${degreeOf(((e.shift - (firstEntry?.shift ?? 0)) % 12 + 12) % 12, minor)}`);
    }
    return m;
  }, [entries, notes, showEntries, firstEntry, minor]);
  const entryNotes = useMemo(() => new Set(entries.flatMap((e) => e.notes)), [entries]);
  const sheetChords = useMemo(
    () => (harmony === "off" || gameUntil !== null ? undefined : chords.map((c, k) => ({ from: c.from, text: chordLabel(c, k), title: chordName(c, flats) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [harmony, chords, gameUntil, flats, tonicPc, minor],
  );
  /** A note pointed at in the score: its voice, pitch, place, and what it belongs to. */
  const entryOf = useMemo(() => {
    const m = new Map<number, Entry>();
    for (const e of entries) for (const i of e.notes) m.set(i, e);
    return m;
  }, [entries]);
  const describe = (i: number) => {
    const n = notes[i];
    const b = barOf(n.at + 1e-6);
    const beat = Math.floor((n.at - barStart(b)) / beatOf(P.meters[b] ?? timeSig) + 1e-6) + 1;
    const e = entryOf.get(i);
    const c = chords.find((x) => x.from <= n.at + 1e-6 && n.at < x.to - 1e-6);
    const vn = names[voice[i]] ?? "";
    const parts = [
      vn.charAt(0).toUpperCase() + vn.slice(1),
      (P.spelled[i] ?? midiName(n.midi, flats)).replace("#", "♯").replace(/(?<=[A-G])b/, "♭"),
      t("ui.study.at", { bar: b + firstBar, beat }),
    ];
    if (e) parts.push(t(e.inverted ? "ui.study.info.inverted" : "ui.study.info.entry", { degree: degreeOf((((e.shift - (firstEntry?.shift ?? 0)) % 12) + 12) % 12, minor) }));
    if (c) parts.push(t("ui.study.info.chord", { chord: `${chordName(c, flats)} · ${romanOf(c, tonicPc, minor, false)}` }));
    return `${parts.filter(Boolean).join(" · ")}. ${t("ui.study.info.click")}`;
  };
  const dimSet = useMemo(() => new Set(spot === null ? [] : Array.from({ length: count }, (_, v) => v).filter((v) => v !== spot)), [spot, count]);
  const sheetBrackets = useMemo(
    () => (showEntries ? (gameUntil !== null ? entries.filter((e) => e.end <= gameUntil + 1e-6) : entries).map((e) => ({ from: e.at, to: e.end, voice: entryVoice(e, voice), inverted: e.inverted })) : undefined),
    [showEntries, entries, gameUntil, voice],
  );
  /** The keys the cadences reach, over the music where each is reached. */
  const sheetMarks = useMemo(
    () => (gameUntil !== null || harmony === "off" ? undefined : plan.map((c) => ({ at: chords[c.chord].from, text: `→ ${keyLabel(c.tonic, c.minor)}`, title: t("ui.study.m.arrival", { key: keyLabel(c.tonic, c.minor) }) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, chords, gameUntil, harmony, flats],
  );
  const sheetNotes = useMemo(() => new Map(Object.entries(annotations[`${L.id}${piece}`] ?? {}).filter(([, v]) => v.trim()).map(([b, v]) => [Number(b), v])), [annotations, L.id, piece]);
  const faintKey = [...faint].sort().join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const faintSet = useMemo(() => faint, [faintKey]);
  /** A key of the keyboard pressed: its note, in the first voice's sound. */
  const soundKey = (m: number) => void audio.playSequence([{ slot: 0, at: 0, length: 0.3, cantus: null, counterpoint: null, extra: [{ channel: "counterpoint", pitch: midiName(m, flats) }] }]);
  const posAt = (q: number) => {
    const b = barOf(q + 1e-6);
    return t("ui.study.at", { bar: b + firstBar, beat: Math.floor((q - barStart(b)) / beatOf(P.meters[b] ?? timeSig) + 1e-6) + 1 });
  };
  /** What is happening at a moment, in words: the section, the entries sounding, the chord (the caption under the music). */
  const nowAt = (q: number) => {
    const sec = sections.find((x) => x.from <= q + 1e-6 && q < x.to - 1e-6);
    const ins = entries.filter((e) => e.at <= q + 1e-6 && q < e.end - 1e-6 && (gameUntil === null || e.end <= gameUntil + 1e-6));
    const c = harmony === "off" || gameUntil !== null ? undefined : chords.find((x) => x.from <= q + 1e-6 && q < x.to - 1e-6);
    const parts = [posAt(q)];
    if (sec && gameUntil === null) parts.push(sectionName(sec));
    if (ins.length)
      parts.push(
        t("ui.study.now.entries", {
          list: ins.map((e) => `${names[entryVoice(e, voice)] ?? ""} ${e.inverted ? "∀ " : ""}${degreeOf((((e.shift - (firstEntry?.shift ?? 0)) % 12) + 12) % 12, minor)}`).join(", "),
        }),
      );
    if (c) parts.push(`${chordName(c, flats)} · ${romanOf(c, tonicPc, minor, false)}`);
    return parts.join("  ·  ");
  };
  const posLabel = marker !== null ? t("ui.study.at", { bar: bq(marker), beat: Math.floor((marker - barStart(barOf(marker + 1e-6))) / beatOf(P.meters[barOf(marker + 1e-6)] ?? timeSig) + 1e-6) + 1 }) : span ? when(span) : t("ui.study.fromStart");

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
        <div className={keys ? "score-wrap wtc with-keys" : "score-wrap wtc"}>
          <div className="wtc-view">
            {view === "sheet" ? (
              <WtcSheet
                eng={eng}
                pieceId={`${L.id}${piece}`}
                keySig={vexKey(F.key)}
                signature={sig}
                time={P.meters[0] ?? timeSig}
                barQuarters={barQ}
                firstBar={firstBar}
                notes={notes}
                voice={voice}
                colors={COLORS}
                ink={ink}
                entryNotes={entryNotes}
                labels={sheetLabels}
                chords={sheetChords}
                faint={faintSet}
                dim={dimSet}
                brackets={sheetBrackets}
                notes2={sheetNotes}
                marks={sheetMarks}
                onNote={(b) => (setMarker(barStart(b)), setTab("notes"), setFocus(false))}
                span={span}
                marker={playing ? null : marker}
                zoom={sheetZoom}
                follow={follow}
                label={fugueLabel(F)}
                describe={describe}
                onSeek={seek}
                onSelect={select}
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
                barStarts={starts}
                span={span}
                extra={gameUntil !== null ? [] : [...throughNotes, ...myNotes]}
                hidden={rollHidden}
                onSeek={seek}
                follow={follow}
                marker={playing ? null : marker}
                label={fugueLabel(F)}
                firstBar={firstBar}
                strip={harmony === "off" || gameUntil !== null ? undefined : chords.map((c, k) => ({ from: c.from, to: c.to, text: chordLabel(c, k), title: `${chordName(c, flats)} · ${romanOf(c, tonicPc, minor, k === chords.length - 1)}` }))}
                onStrip={(k) => playSpan(chords[k].from, chords[k].to, `c${k}`)}
              />
            )}
          </div>
          <LivePos className="wtc-now" idle={t("ui.study.now.idle")} format={nowAt} />
          <Navigator
            starts={starts}
            firstBar={firstBar}
            sections={gameUntil !== null ? [] : sections.map((x) => ({ from: x.from, to: x.to, kind: x.kind, label: `${sectionName(x)} · ${when(x)}` }))}
            entries={(gameUntil !== null ? entries.filter((e) => e.end <= gameUntil + 1e-6) : entries).map((e) => ({ at: e.at, end: e.end, voice: entryVoice(e, voice), inverted: e.inverted, label: `${names[entryVoice(e, voice)] ?? ""} · ${t(e.inverted ? "ui.study.info.inverted" : "ui.study.info.entry", { degree: degreeOf((((e.shift - (firstEntry?.shift ?? 0)) % 12) + 12) % 12, minor) })} · ${when({ from: e.at, to: e.end })}` }))}
            colors={COLORS}
            span={span}
            marker={playing ? null : marker}
            onSeek={seek}
            onSelect={select}
            notes={[...sheetNotes.entries()].map(([b, text]) => ({ at: barStart(b), text: `${t("ui.study.bar", { a: b + firstBar })}: ${text}` }))}
          />
          {keys && <KeyStrip notes={notes} voice={voice} colors={COLORS} faint={faintSet} onKey={soundKey} />}
        </div>
      }
      transport={
        <div className="controls">
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <div className="play-split">
              <button className="icon play" onClick={toggle} aria-label={playing ? t("ui.study.pause") : t("ui.play.player")} title={t("ui.study.playHelp")}>{playing ? "❚❚" : "▶"}</button>
            </div>
            <button className="icon" onClick={stop} disabled={!playing && marker === null} aria-label={t("ui.study.stop")} title={t("ui.study.stopHelp")}>■</button>
            <button className="icon" aria-pressed={loop} onClick={() => setLoop(!loop)} aria-label={t("ui.study.loop")} title={t("ui.study.loopHelp")}>⟲</button>
            <LivePos idle={posLabel} format={posAt} title={t("ui.study.posHelp")} />
            <button className="icon" onClick={copyLink} aria-label={t("ui.study.link")} title={t("ui.study.linkHelp")}>{copied ? "✓" : "🔗"}</button>
            {span && <button className="chipbtn" onClick={() => (setSpan(null), setActiveMoment(null), setMarker(null))} title={t("ui.study.wholeHelp")}>{t("ui.study.whole")}</button>}
            <span className="values" role="radiogroup" aria-label={t("ui.wtc.view")}>
              <button className="chipbtn" role="radio" aria-checked={view === "sheet"} aria-pressed={view === "sheet"} onClick={() => setView("sheet")} title={t("ui.study.sheetHelp")}>{t("ui.study.sheet")}</button>
              <button className="chipbtn" role="radio" aria-checked={view === "roll"} aria-pressed={view === "roll"} onClick={() => setView("roll")} title={t("ui.study.rollHelp")}>{t("ui.study.roll")}</button>
            </span>
            <button className="chipbtn" aria-pressed={focus} onClick={() => setFocus(!focus)} title={t("ui.study.focusHelp")}>{t("ui.study.focus")}</button>
            <span className="wtc-viewmenu" ref={viewMenu}>
              <button className="chipbtn" aria-expanded={viewOpen} aria-pressed={viewOpen} onClick={() => setViewOpen(!viewOpen)} title={t("ui.study.viewHelp")}>{t("ui.study.view")} ▾</button>
              {viewOpen && (
              <div className="wtc-viewpop">
                <label><input type="checkbox" checked={follow} onChange={() => setFollow(!follow)} /> {t("ui.study.follow")} <kbd>F</kbd></label>
                <label><input type="checkbox" checked={keys} onChange={() => setKeys(!keys)} /> {t("ui.study.keys")} <kbd>K</kbd></label>
                <label><input type="checkbox" checked={showEntries} onChange={(e) => setShowEntries(e.target.checked)} /> {t("ui.study.outline")}</label>
                {view === "sheet" && (
                  <>
                    <label>
                      {t("ui.study.ink")}{" "}
                      <select className="sel" value={ink} onChange={(e) => setInk(e.target.value as Ink)} aria-label={t("ui.study.ink")}>
                        {(["voices", "entries", "plain"] as const).map((x) => (
                          <option key={x} value={x}>{t(`ui.study.ink.${x}`)}</option>
                        ))}
                      </select>
                    </label>
                    <span className="row">
                      {t("ui.study.size")}{" "}
                      <button className="icon" onClick={() => setSheetZoom(Math.max(0.6, Math.round((sheetZoom - 0.1) * 10) / 10))} aria-label={t("ui.zoom.out")}>−</button>
                      <span className="help">{Math.round(sheetZoom * 100)}%</span>
                      <button className="icon" onClick={() => setSheetZoom(Math.min(2, Math.round((sheetZoom + 0.1) * 10) / 10))} aria-label={t("ui.zoom.in")}>+</button>
                    </span>
                  </>
                )}
                <button className="chipbtn" onClick={() => (setViewOpen(false), setView("sheet"), window.setTimeout(() => window.print(), 300))}>{t("ui.study.print")}</button>
                <label>
                  {t("ui.study.h.title")}{" "}
                  <select className="sel" value={harmony} onChange={(e) => setHarmony(e.target.value as "off" | "roman" | "letters")} aria-label={t("ui.study.h.title")}>
                    {(["off", "roman", "letters"] as const).map((x) => (
                      <option key={x} value={x}>{t(`ui.study.h.${x}`)}</option>
                    ))}
                  </select>
                </label>
              </div>
              )}
            </span>
            <div className="hfaders">
              {useRec ? (
                <HFader label={t("ui.study.rec.speed")} help={t("ui.study.rec.speedHelp")} value={recRate * 100} min={50} max={125} defaultValue={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => setRecRate(Math.round(v / 5) * 0.05)} />
              ) : (
                <HFader label={t("ui.tempo")} help={t("ui.wtc.tempoHelp")} value={tempo} min={15} max={120} defaultValue={36} format={(v) => `♩=${Math.round(v * 2)}`} onChange={(v) => setTempo(Math.round(v))} />
              )}
              <HFader label={t("ui.volume")} help={t("ui.volume.help")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
            </div>
            <select className="sel" value={tuning} disabled={useRec} onChange={(e) => setTuning(e.target.value as TemperamentId)} aria-label={t("ui.tuning")} title={t("ui.wtc.tuningHelp")}>
              {WELL.map((x) => (
                <option key={x} value={x}>{t(`ui.tuning.${x}`)}</option>
              ))}
            </select>
            <select className="sel" value={useRec ? "recording" : "synth"} onChange={(e) => (stop(), setSource(e.target.value === "recording" ? "recording" : "synth"))} aria-label={t("ui.study.rec.source")} title={t(track ? "ui.study.rec.help" : "ui.study.rec.none")}>
              <option value="synth">{t("ui.study.rec.synth")}</option>
              <option value="recording" disabled={!track}>{t("ui.study.rec.ishizaka")}</option>
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
      focus={focus}
      tab={isPrelude && (tab === "workshop" || tab === "next") ? "guide" : tab}
      onTab={setTab}
      idle={`${useRec ? "Recording: Kimiko Ishizaka, The Open Well-Tempered Clavier (2015), CC0; bars timed by the game. " : ""}J. S. Bach, Das wohltemperirte Clavier, ${roman(F.book)}, ${isPrelude ? "Praeludium" : "Fuga"} ${F.number} (BWV ${F.bwv}). Encoding: David Huron (Humdrum, 1994, after the Bach-Gesellschaft edition; rights to derivative electronic formats reserved, for study only); ${isPrelude ? "strands, " : "voices as encoded; entries, "}chords and cadences found by the game.`}
      tabs={[
        { id: "guide", text: true, label: t("ui.study.tab.guide"), content: guide },
        { id: "voices", label: t("ui.study.tab.voices"), content: voicesPanel },
        { id: "notes", text: true, label: noteBars.length ? `${t("ui.study.tab.notes")} (${noteBars.length})` : t("ui.study.tab.notes"), content: notesPanel },
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
