/**
 * The touch game. One-voice mode (D160): the player chooses a voice and plays it through a section of
 * a fugue on a steady 8-bit beat, and hears only what they play. D163: sections; two voices at once,
 * one per thumb, once both are earned alone; timing grades and a combo; the voices' own timbres; a
 * timing calibration ("sync"). D164: the map. D166: EASY and NORMAL; the sound (and so the game's
 * clock) starts on a finished tap, as iPhones require. D167: all 48 fugues; WITH THE OTHERS (the other
 * voices play around the player); WAIT (the music waits at each note); the keys: rows of staff steps
 * under the thumbs, the same rows as the music box's, lighting up as their notes come. D168: the 48
 * preludes, played by hands (both hands at once: the left thumb the left hand).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MusicBox, inkOf, type Band, type Frame } from "./MusicBox.tsx";
import { PlayArea, type Painter, type ThumbEvents } from "./PlayArea.tsx";
import { Chip } from "./chip.ts";
import { Game, byPitch, prepare, type Grade } from "./engine.ts";
import { paintKeys } from "./paint-keys.ts";
import { PIECES, beatOf, fugueById, keyAt, keyName, shortName, type TouchFugue } from "./fugue.ts";
import { LEVELS, type Level as Difficulty } from "./lanes.ts";
import type { Side } from "./thumbs.ts";
import { EARN, accompaniment, duoOpen, level, recordKey, voicesIn, type Level } from "./voice-mode.ts";
import { lagFrom, SYNC_BEATS, SYNC_BPM } from "./sync.ts";
import { MapView } from "./MapView.tsx";

const TEMPOS = [40, 50, 60, 72];
const BEST_KEY = "tg-best-v5";
const LAG_KEY = "tg-lag-v1";
const OPEN_KEY = "tg-open-v1";
const PICK_KEY = "tg-pick-v1";
const DIFFICULTY: Record<Difficulty, { name: string; text: string }> = {
  easy: { name: "EASY", text: "Tap anywhere when a lit row's bar closes. Hold HOLD notes. Quick notes play themselves." },
  normal: { name: "NORMAL", text: "Tap the lit row on the beat (one off counts). Hold to sustain; slide a row to slur; wobble to bend." },
};

/** The keyboard on a computer (EASY): a key is a tap, held for a long note; with two voices, the left hand's keys play the lower. */
const KEYMAP: Record<string, { side: Side }> = {
  KeyA: { side: "left" },
  KeyS: { side: "left" },
  KeyD: { side: "left" },
  KeyF: { side: "left" },
  KeyJ: { side: "right" },
  KeyK: { side: "right" },
  KeyL: { side: "right" },
  Space: { side: "right" },
};
/** A key's pointer id, clear of the touches'. */
const keyId = (code: string) => 1000 + Object.keys(KEYMAP).indexOf(code);

type Phase =
  | { kind: "title" }
  | { kind: "play" }
  | { kind: "result"; results: { voice: number; got: number; of: number }[]; maxCombo: number; perfect: number }
  | { kind: "sync" }
  | { kind: "map" };

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no storage: it stays for this visit */
  }
}

const voiceName = (f: TouchFugue, v: number) => f.voiceNames[v].toUpperCase();
const bars = (f: TouchFugue, section: number) => {
  const s = f.sections[section];
  return `BARS ${s.fromBar}–${s.toBar}`;
};
/** The beat's sign: a quarter in 4/4, a dotted quarter in 6/8, a half in 2/2. */
function beatSign(f: TouchFugue): string {
  const [num, den] = f.meter.split("/").map(Number);
  const compound = num % 3 === 0 && num > 3;
  const value = compound ? den / 2 : den;
  const sign = value <= 2 ? "𝅗𝅥" : value === 4 ? "♩" : value === 8 ? "♪" : "𝅘𝅥𝅯";
  return compound ? `${sign}.` : sign;
}

/** The music box before play: the voices' opening, a beat before the first of them. */
function previewFrame(f: TouchFugue, levels: Level[], others: boolean, section: number): Frame {
  const first = Math.min(...levels.map((lv) => lv.first));
  const b = beatOf(f);
  return {
    now: first - b.ticks,
    tps: 1,
    key: keyAt(f, first),
    barTicks: f.barTicks,
    beatTicks: b.ticks,
    count: f.voices.length,
    bands: [...byPitch(levels)].reverse().map((lv): Band => ({ voice: lv.voice, notes: lv.notes, windows: lv.windows, held: [] })),
    others: others ? accompaniment(f, section, levels.map((lv) => lv.voice)) : [],
  };
}

/** The sync's clicks and the player's taps, in audio seconds as heard. */
interface SyncRun {
  clicks: number[];
  taps: number[];
}

interface Pick {
  fugue: string;
  section: number;
  voices: number[];
  bpm: number;
  diff: Difficulty;
  withOthers: boolean;
  wait: boolean;
}

const DEFAULT_PICK: Pick = { fugue: "wtc1f02", section: 0, voices: [1], bpm: 50, diff: "easy", withOthers: true, wait: false };

/** A pick made sound: its fugue, section and voices as they are. */
function sane(p: Pick): Pick {
  const f = fugueById(p.fugue);
  const section = Math.min(Math.max(0, p.section), f.sections.length - 1);
  const singing = voicesIn(f, section);
  let voices = p.voices.filter((v) => singing.includes(v)).slice(0, 2);
  // A fugue opens on its second voice (the first to answer), a prelude on the right hand.
  if (!voices.length) voices = [singing[f.kind === "prelude" ? 0 : Math.min(1, singing.length - 1)]];
  return { ...DEFAULT_PICK, ...p, fugue: f.id, section, voices, diff: LEVELS.includes(p.diff) ? p.diff : "easy" };
}

export function TouchApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [pick, setPickRaw] = useState<Pick>(() => sane(load(PICK_KEY, DEFAULT_PICK)));
  const setPick = (p: Partial<Pick>) =>
    setPickRaw((cur) => {
      const next = sane({ ...cur, ...p });
      save(PICK_KEY, next);
      return next;
    });
  const [best, setBest] = useState<Record<string, number>>(() => load(BEST_KEY, {}));
  const [lag, setLag] = useState<number>(() => load(LAG_KEY, 0));
  const [openAll, setOpenAll] = useState<boolean>(() => load(OPEN_KEY, false));
  const [note, setNote] = useState("");
  const f = fugueById(pick.fugue);
  const { section, voices, bpm, diff, withOthers, wait } = pick;
  const duo = voices.length === 2;
  const levels = useMemo(() => byPitch(voices.map((v) => level(f, section, v, withOthers))), [f, voices, section, withOthers, phase.kind === "play"]);
  const frame = useRef<Frame>(previewFrame(f, levels, withOthers, section));
  const chip = useRef<Chip | null>(null);
  const game = useRef<Game | null>(null);
  const sync = useRef<SyncRun | null>(null);
  const count = useRef<HTMLDivElement>(null);
  const gradeEl = useRef<HTMLDivElement>(null);
  const paint = useRef<Painter | null>(null);
  const shownAt = useRef(0);
  const open = openAll || withOthers || duoOpen(best, f.id, section, voices, diff);
  const key = recordKey(f.id, section, voices, diff);

  // Phones start a page's sound only on a finished tap (or a click, or a key): every such gesture
  // anywhere unlocks it, so the first tap on START is never lost.
  useEffect(() => {
    const unlock = () => ensureChip();
    for (const ev of ["touchend", "pointerup", "click", "keydown"]) window.addEventListener(ev, unlock, true);
    return () => {
      for (const ev of ["touchend", "pointerup", "click", "keydown"]) window.removeEventListener(ev, unlock, true);
    };
  }, []);

  // Away from play, the box shows the opening of what is chosen.
  useEffect(() => {
    shownAt.current = performance.now();
    if (phase.kind === "title") {
      prepare(f, levels, diff);
      frame.current = previewFrame(f, levels, withOthers, section);
    }
  }, [phase, levels, diff]);

  // Playing: the engine steps every frame; at the end, the results and the records.
  useEffect(() => {
    if (phase.kind !== "play" || !chip.current) return;
    const g = new Game(f, levels, { difficulty: diff, bpm, withOthers, wait, lagMs: lag, section }, chip.current);
    game.current = g;
    paint.current = (ctx, w, h) => paintKeys(ctx, w, h, g);
    const b = beatOf(f);
    let raf = 0;
    const loop = () => {
      const done = g.step();
      frame.current = {
        now: g.now,
        tps: g.tps,
        key: g.keyNow(),
        barTicks: f.barTicks,
        beatTicks: b.ticks,
        count: f.voices.length,
        bands: g.tracks.map((t, k): Band => ({ voice: t.lv.voice, notes: t.lv.notes, windows: t.lv.windows, held: g.heldRows(k) })).reverse(),
        others: g.others,
      };
      if (count.current) {
        count.current.textContent = g.countIn() ? String(g.countIn()) : g.waiting ? "WAITING" : "";
        count.current.className = g.waiting && !g.countIn() ? "tg-count tg-count-wait" : "tg-count";
      }
      showGrade(gradeEl.current, g.grade, g.combo);
      if (done) {
        game.current = null;
        paint.current = null;
        const results = g.results();
        const got = results.reduce((s, r) => s + r.got, 0);
        const of = results.reduce((s, r) => s + r.of, 0);
        const pct = Math.round((100 * got) / of);
        // WAIT is practice: it keeps no record.
        if (!wait)
          setBest((bst) => {
            const next = { ...bst, [key]: Math.max(bst[key] ?? 0, pct) };
            save(BEST_KEY, next);
            return next;
          });
        setPhase({ kind: "result", results, maxCombo: g.maxCombo, perfect: g.perfect });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      g.stopAll();
      game.current = null;
      paint.current = null;
      if (count.current) count.current.textContent = "";
      showGrade(gradeEl.current, null, 0);
    };
  }, [phase]);

  // The sync: SYNC_BEATS clicks; the player taps along; their lag is the median of the differences.
  useEffect(() => {
    if (phase.kind !== "sync" || !chip.current) return;
    const ch = chip.current;
    const T0 = ch.ctx.currentTime + 0.6;
    const beat = 60 / SYNC_BPM;
    const run: SyncRun = { clicks: [], taps: [] };
    for (let i = 0; i < SYNC_BEATS; i++) {
      ch.tick(T0 + i * beat, i % 4 === 0, 0.25);
      run.clicks.push(T0 + i * beat + (ch.ctx.outputLatency || ch.ctx.baseLatency || 0));
    }
    sync.current = run;
    let raf = 0;
    const loop = () => {
      if (count.current) count.current.textContent = String(Math.max(0, SYNC_BEATS - run.taps.length));
      if (ch.ctx.currentTime > T0 + SYNC_BEATS * beat + 0.4) {
        const ms = lagFrom(run.clicks, run.taps);
        if (ms === null) setNote("Not enough taps to tell. Try the sync again, tapping with each click.");
        else {
          setLag(ms);
          save(LAG_KEY, ms);
          setNote(ms === 0 ? "Your taps land on the click: nothing to allow for." : `Your taps land ${Math.abs(ms)} ms ${ms > 0 ? "late" : "early"}: the game now allows for it.`);
        }
        sync.current = null;
        setPhase({ kind: "title" });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      sync.current = null;
      if (count.current) count.current.textContent = "";
    };
  }, [phase]);

  function ensureChip() {
    // A touch starts the sound: browsers allow audio only after one.
    if (!chip.current) chip.current = new Chip();
    void chip.current.resume();
  }

  /** Begins once the sound is on: the game runs on the sound's clock, which stands still until then. */
  const whenSounding = (go: () => void) => {
    ensureChip();
    const ch = chip.current!;
    if (ch.ctx.state === "running") return go();
    ch.resume()
      .then(() => (ch.ctx.state === "running" ? go() : setNote("The sound is still off: tap once more.")))
      .catch(() => setNote("The sound is still off: tap once more."));
  };

  const start = () => {
    if (performance.now() - shownAt.current < 350 || !open) return;
    whenSounding(() => {
      setNote("");
      setPhase({ kind: "play" });
    });
  };

  const startSync = () =>
    whenSounding(() => {
      setNote("");
      setPhase({ kind: "sync" });
    });

  const tapSync = (ts: number) => {
    const ch = chip.current;
    if (sync.current && ch) sync.current.taps.push(ch.heard() - (performance.now() - ts) / 1000);
  };

  // A tap lands: in play, it is judged; in the sync, timed. Away from play, the finished tap (the lift)
  // starts the game, as phones start sound only then.
  const events: ThumbEvents = {
    down: (id, side, x, y, w, h, ts) => {
      if (phase.kind === "sync") return tapSync(ts);
      game.current?.down(id, side, x, y, w, h, ts);
    },
    move: (id, x, y, w, h, ts) => game.current?.move(id, x, y, w, h, ts),
    up: (id, ts) => {
      const g = game.current;
      if (g) return g.up(id, ts);
      if (phase.kind === "title" || phase.kind === "result") start();
    },
  };

  // The keyboard: a key down is a landing, a key up a lift; on the title, space starts.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = KEYMAP[e.code];
      if (!k || e.repeat) return;
      if (phase.kind === "sync") return (e.preventDefault(), tapSync(e.timeStamp));
      const g = game.current;
      if (!g) {
        if (e.code === "Space" && (phase.kind === "title" || phase.kind === "result")) (e.preventDefault(), start());
        return;
      }
      e.preventDefault();
      g.press(keyId(e.code), duo ? k.side : null, e.timeStamp);
    };
    const up = (e: KeyboardEvent) => {
      const g = game.current;
      if (!KEYMAP[e.code] || !g) return;
      g.up(keyId(e.code), e.timeStamp);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const playing = phase.kind === "play";
  const sides = duo ? { left: levels[0].voice, right: levels[1].voice } : null;
  return (
    <div className="tg-app">
      <MusicBox
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">
              {shortName(f)} · {bars(f, section)} · {voices.map((v) => voiceName(f, v)).join(" + ")}
            </span>
            <span className="tg-hud-bar">{keyName(frame.current.key)}</span>
          </>
        }
        legend={f.voiceNames.map((name, i) => (
          <span key={name} style={{ color: inkOf(i, f.voices.length), opacity: voices.includes(i) ? 1 : withOthers ? 0.6 : 0.3 }}>
            ■ {name.toUpperCase()}
          </span>
        ))}
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        <div className="tg-grade" ref={gradeEl} aria-live="polite" />
        {phase.kind === "title" && (
          <Title
            f={f}
            pick={pick}
            setPick={setPick}
            best={best}
            open={open}
            openAll={openAll}
            setOpenAll={(v) => (setOpenAll(v), save(OPEN_KEY, v))}
            lag={lag}
            sync={startSync}
            map={() => setPhase({ kind: "map" })}
            note={note}
          />
        )}
        {phase.kind === "map" && (
          <MapView
            f={f}
            best={best}
            diff={diff}
            pick={(sec, v) => {
              setPick({ section: sec, voices: [v] });
              setPhase({ kind: "title" });
            }}
            close={() => setPhase({ kind: "title" })}
          />
        )}
        {phase.kind === "result" && <Result f={f} phase={phase} voices={voices} wait={wait} again={() => setPhase({ kind: "title" })} />}
        {phase.kind === "sync" && (
          <div className="tg-card tg-card-low">
            <h1>SYNC</h1>
            <p>Tap below (or press space) with each click.</p>
          </div>
        )}
        {phase.kind !== "play" && phase.kind !== "title" && note && <p className="tg-floating-note">{note}</p>}
      </MusicBox>
      <PlayArea
        events={events}
        paint={paint}
        labels={sides ? { left: { text: voiceName(f, sides.left), ink: inkOf(sides.left, f.voices.length) }, right: { text: voiceName(f, sides.right), ink: inkOf(sides.right, f.voices.length) } } : undefined}
        hint={playing || phase.kind === "sync" || phase.kind === "map" ? "" : open ? "TAP HERE TO START" : "LOCKED"}
      />
      <div className="tg-upright" role="alert">
        Turn the phone upright
      </div>
    </div>
  );
}

/** The grade of the last event and the combo, drawn over the box without React. */
function showGrade(el: HTMLDivElement | null, grade: Grade | null, combo: number) {
  if (!el) return;
  const age = grade ? performance.now() - grade.at : Infinity;
  if (age > 600) {
    el.textContent = combo >= 5 ? `×${combo}` : "";
    el.className = "tg-grade";
    return;
  }
  const lean = grade!.lean ? (grade!.lean < 0 ? " EARLY" : " LATE") : "";
  el.textContent = `${grade!.text}${lean}${combo >= 5 ? ` ×${combo}` : ""}`;
  el.className = `tg-grade tg-grade-${grade!.text === "PERFECT" ? "perfect" : grade!.text === "GOOD" ? "good" : "miss"}`;
}

function Stepper({ id, label, onPrev, onNext, onLabel }: { id: string; label: string; onPrev: () => void; onNext: () => void; onLabel?: () => void }) {
  return (
    <div className="tg-stepper">
      <button type="button" id={`${id}-prev`} aria-label="Previous" onClick={onPrev}>
        ◀
      </button>
      {onLabel ? (
        <button type="button" id={`${id}-name`} className="tg-stepper-name" onClick={onLabel}>
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      <button type="button" id={`${id}-next`} aria-label="Next" onClick={onNext}>
        ▶
      </button>
    </div>
  );
}

function Title(p: {
  f: TouchFugue;
  pick: Pick;
  setPick: (p: Partial<Pick>) => void;
  best: Record<string, number>;
  open: boolean;
  openAll: boolean;
  setOpenAll: (v: boolean) => void;
  lag: number;
  sync: () => void;
  map: () => void;
  note: string;
}) {
  const { f, pick, setPick, best, open, openAll, setOpenAll, lag, sync, map, note } = p;
  const { section, voices, bpm, diff, withOthers, wait } = pick;
  const fi = PIECES.findIndex((x) => x.id === f.id);
  const nf = PIECES.length;
  const ns = f.sections.length;
  const duo = voices.length === 2;
  const singing = voicesIn(f, section);
  const solo = (v: number) => best[recordKey(f.id, section, [v], diff)];
  const toggle = (v: number) => {
    if (voices.includes(v)) setPick({ voices: voices.length > 1 ? voices.filter((x) => x !== v) : voices });
    else setPick({ voices: voices.length < 2 ? [...voices, v] : [voices[1], v] });
  };
  const s = f.sections[section];
  const goFugue = (i: number) => setPick({ fugue: PIECES[(i + nf) % nf].id, section: 0, voices: [] });
  return (
    <div className="tg-card tg-title">
      <Stepper id="fugue" label={`BOOK ${f.book === 1 ? "I" : "II"} · ${f.title.toUpperCase()}`} onPrev={() => goFugue(fi - 1)} onNext={() => goFugue(fi + 1)} />
      <Stepper id="section" label={`${bars(f, section)} · ${s.name.toUpperCase()} · MAP`} onPrev={() => setPick({ section: (section + ns - 1) % ns })} onNext={() => setPick({ section: (section + 1) % ns })} onLabel={map} />
      <div className="tg-voices" role="group" aria-label="Voices">
        {f.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={voices.includes(i) ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i)} onClick={() => toggle(i)} aria-pressed={voices.includes(i)}>
            {name.toUpperCase()}
            <small>
              {solo(i) !== undefined ? `${solo(i)}%` : "—"}
              {solo(i) >= EARN * 100 && <span className="tg-sym"> ★</span>}
            </small>
          </button>
        ))}
      </div>
      <div className="tg-voices" role="group" aria-label="Level and help">
        {LEVELS.map((d) => (
          <button key={d} type="button" id={`level-${d}`} className={d === diff ? "on tg-level" : "tg-level"} onClick={() => setPick({ diff: d })}>
            {DIFFICULTY[d].name}
          </button>
        ))}
        <button type="button" id="others" className={withOthers ? "on tg-level" : "tg-level"} onClick={() => setPick({ withOthers: !withOthers })} aria-pressed={withOthers}>
          {withOthers ? "WITH OTHERS" : "ALONE"}
        </button>
        <button type="button" id="wait" className={wait ? "on tg-level" : "tg-level"} onClick={() => setPick({ wait: !wait })} aria-pressed={wait}>
          {wait ? "WAITS" : "NO WAIT"}
        </button>
      </div>
      <p>
        {duo && !open
          ? `Earn the ${voices.map((v) => f.voiceNames[v].toLowerCase()).join(" and the ")} alone here first (${Math.round(EARN * 100)}% each), or play with the others.`
          : `${duo ? (f.kind === "prelude" ? "Left hand left thumb, right hand right. " : "Lower voice left thumb, higher right. ") : ""}${DIFFICULTY[diff].text}${withOthers ? " The others play around you." : " You hear only what you play."}${wait ? " The music waits for each note (practice)." : ""}`}
      </p>
      {note && <p className="tg-note">{note}</p>}
      <div className="tg-tempo" role="group" aria-label="Tempo">
        {TEMPOS.map((t) => (
          <button key={t} type="button" id={`tempo-${t}`} className={t === bpm ? "on" : ""} onClick={() => setPick({ bpm: t })}>
            <span className="tg-q">{beatSign(f)}</span>={t}
          </button>
        ))}
        <button type="button" id="sync" onClick={sync} title="Tap along with clicks so the game knows your timing">
          SYNC{lag ? ` ${lag > 0 ? "+" : ""}${lag}` : ""}
        </button>
      </div>
      <p className="tg-card-sub tg-keys">{diff === "normal" ? "COMPUTER: CLICK THE ROWS" : duo ? "COMPUTER: F FOR THE LEFT VOICE · J FOR THE RIGHT" : "COMPUTER: SPACE BAR (OR F AND J)"}</p>
      <label className="tg-open">
        <input type="checkbox" id="open-all" checked={openAll} onChange={(e) => setOpenAll(e.target.checked)} /> Open everything (for testing)
      </label>
    </div>
  );
}

function Result({ f, phase, voices, wait, again }: { f: TouchFugue; phase: Extract<Phase, { kind: "result" }>; voices: number[]; wait: boolean; again: () => void }) {
  const got = phase.results.reduce((s, r) => s + r.got, 0);
  const of = phase.results.reduce((s, r) => s + r.of, 0);
  const ok = got >= EARN * of;
  const names = voices.map((v) => voiceName(f, v));
  return (
    <div className="tg-card tg-card-low">
      <h1 className={ok && !wait ? "tg-gold" : ""}>{wait ? "PRACTISED" : ok ? (names.length > 1 ? `${names.join(" & ")} TOGETHER` : `${names[0]} EARNED`) : "NOT YET"}</h1>
      {phase.results.map((r) => (
        <p key={r.voice} className="tg-card-sub" style={{ color: inkOf(r.voice, f.voices.length) }}>
          {voiceName(f, r.voice)}: {r.got} OF {r.of}
        </p>
      ))}
      <p className="tg-card-sub">
        {Math.round((100 * got) / of)}% · {Math.round(EARN * 100)}% TO EARN · MAX COMBO {phase.maxCombo} · PERFECT {phase.perfect}
      </p>
      <button type="button" id="again" className="tg-link" onClick={again}>
        Choose a fugue, section, voices or tempo
      </button>
    </div>
  );
}
