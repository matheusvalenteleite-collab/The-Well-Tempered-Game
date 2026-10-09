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
 * The exercises of D119-D122 are one button away.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import full from "../../data/bach/wtc/fugues-full.json" with { type: "json" };
import { FUGUES, isMinor, keyName, keySignature, type WtcFugue } from "../wtc/fugues.ts";
import { findEntries, type Entry, type FullNote } from "../wtc/entries.ts";
import { separateVoices } from "../wtc/voices.ts";
import { degreeOf, entryVoice, pitchName, studyMoments, voiceNames, type Moment } from "../wtc/study.ts";
import { parsePitch, type Step } from "../music/pitch.ts";
import { VoiceRoll, type RollExtra } from "./notation/VoiceRoll.tsx";
import { restoreSound, type SoundState } from "../audio/sound.ts";
import { SYNTH_PRESETS } from "../audio/synth-settings.ts";
import { WELL, type TemperamentId } from "../audio/temperament.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { HFader } from "./HFader.tsx";
import { audio, store, stored } from "./shared.ts";
import { t } from "./i18n.ts";
import { Shell } from "./Shell.tsx";
import { HeaderTools } from "./HeaderTools.tsx";

const FULL = (full as unknown as { notes: Record<string, number[][]> }).notes;
const roman = (b: number) => (b === 1 ? "I" : "II");
const fugueLabel = (f: WtcFugue) => `${keyName(f.key)} · ${roman(f.book)}/${f.number} · BWV ${f.bwv}`;
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const midiName = (m: number, flats: boolean) => `${(flats ? FLATS : SHARPS)[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
/** The voices' colours (the track colours first). */
const COLORS = ["#1e6fd8", "#d0491b", "#2e8b57", "#9b3fc6", "#b8860b", "#0f8f99"];
/** The channels the voices sound on, one each (D123). */
type Ch = "counterpoint" | "second" | "fux" | "inversion" | "retrograde" | "retroInversion";
const VOICE_CH: Ch[] = ["counterpoint", "second", "fux", "inversion", "retrograde", "retroInversion"];
const INSTRUMENTS = ["harpsichord", "fluteOrgan", "grandRoom"] as const;
type Instrument = (typeof INSTRUMENTS)[number];
/** The spotlight's sound: another instrument than the rest. */
const SPOT: Record<Instrument, string> = { harpsichord: "fluteOrgan", fluteOrgan: "harpsichord", grandRoom: "fluteOrgan" };
const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const DEGREES = [0, 2, 3, 4, 5, 7, 8, 9, 10, 11, 1, 6];


export function WtcStudy({ onVoices, onExercises }: { onVoices(n: 2 | 3 | "wtc"): void; onExercises(): void }) {
  const [index, setIndex] = useState(() => Math.max(0, FUGUES.findIndex((f) => f.id === stored("wtg.wtcFugue", FUGUES[0].id))));
  const F = FUGUES[index];
  useEffect(() => store("wtg.wtcFugue", F.id), [F.id]);
  const minor = isMinor(F.key);
  const sig = useMemo(() => keySignature(F.key), [F.key]);
  const flats = Object.values(sig).some((x) => x < 0);
  const notes: FullNote[] = useMemo(() => (FULL[F.id] ?? []).map(([m, o, d]) => ({ midi: m, at: o / 96, dur: d / 96 })), [F.id]);
  const subject = useMemo(() => F.subject.map((n) => ({ midi: parsePitch(n.pitch).midi, at: n.at, dur: n.dur })), [F]);
  const entries: Entry[] = useMemo(() => findEntries(notes, subject), [notes, subject]);
  const { voice, count } = useMemo(() => separateVoices(notes, entries.map((e) => e.notes)), [notes, entries]);
  const names = voiceNames(count);
  const { moments, sections } = useMemo(() => studyMoments(notes, voice, count, entries, F.barQuarters, minor), [notes, voice, count, entries, F.barQuarters, minor]);
  const end = Math.max(...notes.map((n) => n.at + n.dur));
  const bars = Math.ceil(end / F.barQuarters - 1e-6);
  const barOf = (q: number) => Math.floor(q / F.barQuarters + 1e-6);
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
  const [activeMoment, setActiveMoment] = useState<string | null>(null);

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
    const start = (m.bar - 1) * F.barQuarters + (F.phase % F.barQuarters);
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
    setPlaying(false);
    setCursor(-1);
  };
  const playSpan = (from: number, to: number, key: string | null, only?: Set<number>) => {
    setSpan({ from, to });
    setActiveMoment(key);
    play(Math.max(0, from), to, only);
  };
  /** Every entry in a row: alone (its own notes) or in its texture, a breath between. */
  const allEntries = (alone: boolean) => {
    audio.stop();
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
  const [game, setGame] = useState<{ k: number; score: number; tried: number; last: null | { ok: boolean; answer: string; right: string } } | null>(null);
  const gameEntries = entries.filter((e) => !e.inverted);
  const startGame = () => {
    // The game hides what is to come: no workshop overlays, no outlines ahead.
    setThrough("off");
    setGame({ k: 1, score: 0, tried: 0, last: null });
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
    setGame({ ...game, score: game.score + (ok ? 1 : 0), tried: game.tried + 1, last: { ok, answer: nameOf(deg), right: nameOf(rel) } });
    playSpan(e.at, e.end, null);
  };
  const nextGame = () => {
    if (!game) return;
    const k = game.k + 1;
    if (k >= gameEntries.length) return setGame({ ...game, k, last: null });
    setGame({ ...game, k, last: null });
    playSpan(gameEntries[k - 1].end, gameEntries[k].at, null);
  };
  const gameUntil = game && game.k < gameEntries.length && !game.last ? gameEntries[game.k].at : game && game.k < gameEntries.length ? gameEntries[game.k].end : null;

  const go = (k: number) => {
    if (k < 0 || k >= FUGUES.length) return;
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
  const bq = (q: number) => barOf(q) + 1;
  const when = (m: { from: number; to: number }) => (bq(m.from) === bq(m.to - 1e-6) ? t("ui.study.bar", { a: bq(m.from) }) : t("ui.study.bars", { a: bq(m.from), b: bq(m.to - 1e-6) }));
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
    }
  };
  const [filter, setFilter] = useState<"all" | "entry" | "other">("all");
  const shown = moments.filter((m) => filter === "all" || (filter === "entry" ? m.kind === "entry" : m.kind !== "entry"));
  const strettos = moments.filter((m) => m.kind === "stretto").length;
  const inversions = entries.filter((e) => e.inverted).length;
  const pedals = moments.filter((m) => m.kind === "pedal").length;

  const faint = new Set(Array.from({ length: count }, (_, v) => v).filter((v) => !audible(v)));
  const gameNotes = gameUntil !== null ? notes : notes;

  const guide = (
    <div className="guide wtc-study">
      <h3>{fugueLabel(F)}</h3>
      <p>{t("ui.study.overview", { key: keyName(F.key), voices: count, bars, entries: entries.length, inv: inversions, strettos, pedals })}</p>
      <p className="help">{t("ui.study.overviewHelp")}</p>
      <h4>{t("ui.study.sections")}</h4>
      <div className="wtc-sections">
        {sections.map((s, k) => (
          <button key={k} className="chipbtn" aria-pressed={activeMoment === `s${k}`} onClick={() => playSpan(s.from, s.to, `s${k}`)} title={t("ui.study.playSection")}>
            {t(`ui.study.section.${s.kind}`)} · {when(s)}
          </button>
        ))}
      </div>
      <h4>{t("ui.study.entriesTitle")}</h4>
      <div className="row">
        <button className="chipbtn" onClick={() => allEntries(true)}>{t("ui.study.allEntriesAlone")}</button>{" "}
        <button className="chipbtn" onClick={() => allEntries(false)}>{t("ui.study.allEntriesContext")}</button>{" "}
        <label className="help"><input type="checkbox" checked={showEntries} onChange={(e) => setShowEntries(e.target.checked)} /> {t("ui.study.outline")}</label>
      </div>
      <h4>{t("ui.study.moments")}</h4>
      <div className="row">
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
            const from = (m.bar - 1) * F.barQuarters;
            const len = subject[subject.length - 1].at + subject[subject.length - 1].dur - subject[0].at;
            return (
              <li key={k}>
                <button className="chipbtn" onClick={() => playSpan(Math.max(0, from - F.barQuarters), from + len + F.barQuarters, `my${k}`)}>▶</button>
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
              <button className="chipbtn" onClick={() => playSpan(Math.max(0, gameEntries[game.k].at - 2 * F.barQuarters), gameEntries[game.k].at, null)}>{t("ui.study.next.again")}</button>
            </div>
          )}
          {game.last && (
            <p className={game.last.ok ? "verdict ok" : "verdict bad"}>
              {game.last.ok ? t("ui.study.next.right", { right: game.last.right }) : t("ui.study.next.wrong", { answer: game.last.answer, right: game.last.right })}{" "}
              <button className="chipbtn" onClick={nextGame}>{t("ui.study.next.go")}</button>
            </p>
          )}
        </>
      )}
      {game && <p className="help">{t("ui.study.next.score", { score: game.score, tried: game.tried, n: gameEntries.length - 1 })}</p>}
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
              {FUGUES.map((f, k) => (
                <option key={f.id} value={k}>{fugueLabel(f)}</option>
              ))}
            </select>
            <button className="icon" onClick={() => go(index + 1)} disabled={index === FUGUES.length - 1} aria-label={t("ui.nav.next")}>›</button>
            <button className="chipbtn" onClick={() => (stop(), onExercises())} title={t("ui.study.exercisesHelp")}>{t("ui.study.exercises")}</button>
          </nav>
          <HeaderTools look={look} onLook={() => setLook(look === "retro" ? "classic" : "retro")} theme={theme} onTheme={() => setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")} onHelp={() => setTab("guide")} />
        </>
      }
      score={
        <div className="score-wrap wtc">
          <VoiceRoll
            notes={rollNotes}
            voice={voice}
            colors={COLORS}
            faint={faint}
            entries={gameUntil !== null ? entries.filter((e) => e.end <= gameUntil + 1e-6) : entries}
            showEntries={showEntries && through === "off"}
            barQuarters={F.barQuarters}
            cursor={cursor}
            span={span}
            extra={gameUntil !== null ? [] : [...throughNotes, ...myNotes]}
            hidden={rollHidden}
            onBar={(b) => (game ? undefined : (setSpan(null), setActiveMoment(null), play(b * F.barQuarters)))}
            label={fugueLabel(F)}
          />
        </div>
      }
      transport={
        <div className="controls">
          <div className="group listen transport" role="group" aria-label={t("ui.group.listen")}>
            <div className="play-split">
              <button className="icon play" onClick={() => (playing ? stop() : span ? play(span.from, span.to) : play())} aria-label={t("ui.play.player")} title={t("ui.study.playHelp")}>{playing ? "■" : "▶"}</button>
            </div>
            {span && <button className="chipbtn" onClick={() => (setSpan(null), setActiveMoment(null))} title={t("ui.study.wholeHelp")}>{t("ui.study.whole")}</button>}
            <div className="hfaders">
              <HFader label={t("ui.tempo")} help={t("ui.wtc.tempoHelp")} value={tempo} min={15} max={120} defaultValue={36} format={(v) => `♩=${Math.round(v * 2)}`} onChange={(v) => setTempo(Math.round(v))} />
              <HFader label={t("ui.volume")} help={t("ui.volume.help")} value={volume} min={0} max={100} defaultValue={70} format={(v) => `${Math.round(v)}%`} onChange={(v) => setVolume(Math.round(v))} />
            </div>
            <select className="sel" value={tuning} onChange={(e) => setTuning(e.target.value as TemperamentId)} aria-label={t("ui.tuning")} title={t("ui.wtc.tuningHelp")}>
              {WELL.map((x) => (
                <option key={x} value={x}>{t(`ui.tuning.${x}`)}</option>
              ))}
            </select>
            <select className="sel" value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)} aria-label={t("ui.wtc.instrument")}>
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
      tab={tab}
      onTab={setTab}
      idle={`J. S. Bach, Das wohltemperirte Clavier, ${roman(F.book)}, Fuga ${F.number} (BWV ${F.bwv}). Encoding: ASAP dataset (Foscarin et al. 2020), CC BY-NC-SA 4.0; voices and entries found by the game.`}
      tabs={[
        { id: "guide", text: true, label: t("ui.study.tab.guide"), content: guide },
        { id: "voices", label: t("ui.study.tab.voices"), content: voicesPanel },
        { id: "workshop", text: true, label: t("ui.study.tab.workshop"), content: workshop },
        { id: "next", text: true, label: t("ui.study.tab.next"), content: nextPanel },
      ]}
    />
  );
}
