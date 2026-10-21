/**
 * The touch game. One-voice mode (D160): the player chooses a voice and plays it through a section of
 * the fugue (tap, hold, slide), on a steady 8-bit beat, and hears only what they play. D161: three
 * levels (rhythm, shape, notes) and the keyboard on a computer. D162: SHAPE judged against the
 * player's previous touch. D163: the whole fugue in six sections; two voices at once, one per thumb,
 * once both are earned alone; timing grades and a combo; the voices' own 8-bit timbres; a timing
 * calibration ("sync"). D164: the map of the fugue.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MusicBox, VOICE_INKS, type Frame } from "./MusicBox.tsx";
import { PlayArea, type ThumbEvents } from "./PlayArea.tsx";
import { Chip } from "./chip.ts";
import { Game, byPitch, previewFrame, type Grade } from "./engine.ts";
import { FUGUE, keyName } from "./fugue.ts";
import { LEVELS, type Level as Difficulty } from "./lanes.ts";
import type { Side } from "./thumbs.ts";
import { EARN, duoOpen, level, recordKey } from "./voice-mode.ts";
import { lagFrom, SYNC_BEATS, SYNC_BPM } from "./sync.ts";
import { MapView } from "./MapView.tsx";

const TEMPOS = [48, 60, 72];
const BEST_KEY = "tg-best-v3";
const LAG_KEY = "tg-lag-v1";
const OPEN_KEY = "tg-open-v1";
const DIFFICULTY: Record<Difficulty, { name: string; text: string }> = {
  rhythm: { name: "RHYTHM", text: "Only the time counts: tap when a note arrives, hold the long ones. Your voice plays its own notes." },
  shape: { name: "SHAPE", text: "Time and direction: tap a little higher than your last touch when the line goes up, lower when it goes down, about the same for a repeat. Or slide while holding." },
  notes: { name: "NOTES", text: "Each lane is a note of your voice: tap it in time, hold the long ones, slide to the next lane to slur." },
};

/**
 * The keyboard on a computer: a key is a tap (held for a long note), with a direction in SHAPE, for one
 * hand when two voices are played (the left hand's keys on the left of the keyboard).
 */
const KEYMAP: Record<string, { side: Side; dir: -1 | 0 | 1 }> = {
  KeyS: { side: "left", dir: 0 },
  KeyD: { side: "left", dir: 0 },
  KeyF: { side: "left", dir: 0 },
  KeyE: { side: "left", dir: 1 },
  KeyR: { side: "left", dir: 1 },
  KeyC: { side: "left", dir: -1 },
  KeyV: { side: "left", dir: -1 },
  KeyJ: { side: "right", dir: 0 },
  KeyK: { side: "right", dir: 0 },
  KeyL: { side: "right", dir: 0 },
  Space: { side: "right", dir: 0 },
  ArrowLeft: { side: "right", dir: 0 },
  ArrowRight: { side: "right", dir: 0 },
  KeyU: { side: "right", dir: 1 },
  KeyI: { side: "right", dir: 1 },
  ArrowUp: { side: "right", dir: 1 },
  KeyN: { side: "right", dir: -1 },
  KeyM: { side: "right", dir: -1 },
  ArrowDown: { side: "right", dir: -1 },
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

const voiceName = (v: number) => FUGUE.voiceNames[v].toUpperCase();
const bars = (section: number) => {
  const s = FUGUE.sections[section];
  return `BARS ${s.fromBar}–${s.toBar}`;
};

/** The sync's clicks and the player's taps, in audio seconds as heard. */
interface SyncRun {
  clicks: number[];
  taps: number[];
}

export function TouchApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [section, setSection] = useState(0);
  const [voices, setVoices] = useState<number[]>([1]);
  const [bpm, setBpm] = useState(60);
  const [diff, setDiff] = useState<Difficulty>("rhythm");
  const [best, setBest] = useState<Record<string, number>>(() => load(BEST_KEY, {}));
  const [lag, setLag] = useState<number>(() => load(LAG_KEY, 0));
  const [openAll, setOpenAll] = useState<boolean>(() => load(OPEN_KEY, false));
  const [note, setNote] = useState("");
  const [lit, setLit] = useState<number[]>([]);
  const [anchors, setAnchors] = useState<Partial<Record<Side, number>>>({});
  const [wrong, setWrong] = useState<{ lane: number; id: number } | null>(null);
  const duo = voices.length === 2;
  const levels = useMemo(() => byPitch(voices.map((v) => level(FUGUE, section, v))), [voices, section, phase.kind === "play"]);
  const frame = useRef<Frame>(previewFrame(FUGUE, levels));
  const chip = useRef<Chip | null>(null);
  const game = useRef<Game | null>(null);
  const sync = useRef<SyncRun | null>(null);
  const count = useRef<HTMLDivElement>(null);
  const gradeEl = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  const open = openAll || duoOpen(best, section, voices, diff);
  const key = recordKey(section, voices, diff);

  // NOTES is one voice's lanes: with two voices, SHAPE.
  useEffect(() => {
    if (duo && diff === "notes") setDiff("shape");
  }, [duo, diff]);

  // Away from play, the box shows the opening of what is chosen.
  useEffect(() => {
    shownAt.current = performance.now();
    if (phase.kind === "title") frame.current = previewFrame(FUGUE, levels);
  }, [phase, levels]);

  // Playing: the engine steps every frame; at the end, the results and the records.
  useEffect(() => {
    if (phase.kind !== "play" || !chip.current) return;
    const g = new Game(FUGUE, levels, diff, bpm, chip.current, lag);
    game.current = g;
    setAnchors({});
    let raf = 0;
    const loop = () => {
      const done = g.step();
      frame.current = g.frame();
      if (count.current) count.current.textContent = g.countIn() ? String(g.countIn()) : "";
      showGrade(gradeEl.current, g.grade, g.combo);
      if (done) {
        game.current = null;
        const results = g.results();
        const got = results.reduce((s, r) => s + r.got, 0);
        const of = results.reduce((s, r) => s + r.of, 0);
        const pct = Math.round((100 * got) / of);
        setBest((b) => {
          const next = { ...b, [key]: Math.max(b[key] ?? 0, pct) };
          save(BEST_KEY, next);
          return next;
        });
        setLit([]);
        setAnchors({});
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
      ch.tick(T0 + i * beat, i % 4 === 0, 0.2);
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

  const ensureChip = () => {
    // A touch starts the sound: browsers allow audio only after one.
    if (!chip.current) chip.current = new Chip();
    void chip.current.resume();
  };

  const start = () => {
    ensureChip();
    if (performance.now() - shownAt.current < 350 || !open) return;
    setNote("");
    setPhase({ kind: "play" });
  };

  const startSync = () => {
    ensureChip();
    setNote("");
    setPhase({ kind: "sync" });
  };

  const tapSync = (ts: number) => {
    const ch = chip.current;
    if (sync.current && ch) sync.current.taps.push(ch.heard() - (performance.now() - ts) / 1000);
  };

  const refresh = (g: Game) => {
    setLit(g.lit());
    setAnchors(g.anchors());
    if (g.difficulty === "notes" && g.grade?.text === "✕") {
      const l = g.lit().at(-1);
      if (l !== undefined) setWrong({ lane: l, id: g.grade.at });
    }
  };

  const events: ThumbEvents = {
    down: (id, side, y, h, ts) => {
      if (phase.kind === "sync") return tapSync(ts);
      const g = game.current;
      if (!g) return phase.kind === "map" ? undefined : start();
      g.down(id, side, y / h, ts);
      refresh(g);
    },
    move: (id, y, h, ts) => {
      const g = game.current;
      if (!g) return;
      g.move(id, y / h, ts);
      refresh(g);
    },
    up: (id, ts) => {
      const g = game.current;
      if (!g) return;
      g.up(id, ts);
      refresh(g);
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
        if (e.code === "Space" && phase.kind !== "play" && phase.kind !== "map") (e.preventDefault(), start());
        return;
      }
      e.preventDefault();
      if (g.difficulty === "notes") return;
      g.key(keyId(e.code), duo ? k.side : null, g.difficulty === "shape" ? k.dir : 0, e.timeStamp);
      refresh(g);
    };
    const up = (e: KeyboardEvent) => {
      const g = game.current;
      if (!KEYMAP[e.code] || !g) return;
      g.up(keyId(e.code), e.timeStamp);
      refresh(g);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const playing = phase.kind === "play";
  const lanes = !duo && diff === "notes" ? levels[0].lanes : [];
  const sides = duo ? { left: levels[0].voice, right: levels[1].voice } : null;
  return (
    <div className="tg-app">
      <MusicBox
        fugue={FUGUE}
        frame={frame}
        hud={
          <>
            <span className="tg-hud-title">
              {bars(section)} · {voices.map(voiceName).join(" + ")}
            </span>
            <span className="tg-hud-bar">{keyName(frame.current.key)}</span>
          </>
        }
      >
        <div className="tg-count" ref={count} aria-live="polite" />
        <div className="tg-grade" ref={gradeEl} aria-live="polite" />
        {phase.kind === "title" && (
          <Title
            section={section}
            setSection={setSection}
            voices={voices}
            setVoices={setVoices}
            bpm={bpm}
            setBpm={setBpm}
            diff={diff}
            setDiff={setDiff}
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
            best={best}
            diff={diff}
            pick={(sec, vs) => {
              setSection(sec);
              setVoices(vs);
              setPhase({ kind: "title" });
            }}
            close={() => setPhase({ kind: "title" })}
          />
        )}
        {phase.kind === "result" && <Result phase={phase} voices={voices} again={() => setPhase({ kind: "title" })} />}
        {phase.kind === "sync" && (
          <div className="tg-card tg-card-low">
            <h1>SYNC</h1>
            <p>Tap below (or press space) with each click.</p>
          </div>
        )}
      </MusicBox>
      <PlayArea
        events={events}
        lanes={lanes}
        lit={lit}
        wrong={diff === "notes" ? wrong : null}
        anchors={diff === "shape" && playing ? anchors : {}}
        split={duo}
        labels={sides ? { left: { text: voiceName(sides.left), ink: VOICE_INKS[sides.left] }, right: { text: voiceName(sides.right), ink: VOICE_INKS[sides.right] } } : undefined}
        hint={playing || phase.kind === "sync" || phase.kind === "map" ? "" : open ? "TAP HERE OR PRESS SPACE" : "LOCKED"}
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

function Title(p: {
  section: number;
  setSection: (s: number) => void;
  voices: number[];
  setVoices: (v: number[]) => void;
  bpm: number;
  setBpm: (n: number) => void;
  diff: Difficulty;
  setDiff: (d: Difficulty) => void;
  best: Record<string, number>;
  open: boolean;
  openAll: boolean;
  setOpenAll: (v: boolean) => void;
  lag: number;
  sync: () => void;
  map: () => void;
  note: string;
}) {
  const { section, setSection, voices, setVoices, bpm, setBpm, diff, setDiff, best, open, openAll, setOpenAll, lag, sync, map, note } = p;
  const n = FUGUE.sections.length;
  const duo = voices.length === 2;
  const solo = (v: number) => best[recordKey(section, [v], diff)];
  const pair = best[recordKey(section, voices, diff)];
  const toggle = (v: number) => {
    if (voices.includes(v)) setVoices(voices.length > 1 ? voices.filter((x) => x !== v) : voices);
    else setVoices(voices.length < 2 ? [...voices, v] : [voices[1], v]);
  };
  const s = FUGUE.sections[section];
  return (
    <div className="tg-card tg-title">
      <div className="tg-stepper">
        <button type="button" id="section-prev" aria-label="Previous section" onClick={() => setSection((section + n - 1) % n)}>
          ◀
        </button>
        <button type="button" id="map" className="tg-stepper-name" onClick={map} title="The map of the fugue">
          {bars(section)} · {s.name.toUpperCase()} · MAP
        </button>
        <button type="button" id="section-next" aria-label="Next section" onClick={() => setSection((section + 1) % n)}>
          ▶
        </button>
      </div>
      <div className="tg-voices" role="group" aria-label="Voices">
        {FUGUE.voiceNames.map((name, i) => (
          <button key={name} type="button" id={`voice-${i}`} className={voices.includes(i) ? "on" : ""} style={{ color: VOICE_INKS[i] }} onClick={() => toggle(i)} aria-pressed={voices.includes(i)}>
            {name.toUpperCase()}
            <small>
              {solo(i) !== undefined ? `${solo(i)}%` : "—"}
              {solo(i) >= EARN * 100 && <span className="tg-sym"> ★</span>}
            </small>
          </button>
        ))}
      </div>
      <div className="tg-voices" role="group" aria-label="Level">
        {LEVELS.map((d) => (
          <button key={d} type="button" id={`level-${d}`} className={d === diff ? "on tg-level" : "tg-level"} disabled={duo && d === "notes"} onClick={() => setDiff(d)}>
            {DIFFICULTY[d].name}
          </button>
        ))}
      </div>
      <p>
        {duo
          ? open
            ? `Two voices, one per thumb: the lower on the left, the higher on the right. You hear them together only as you play them.${pair !== undefined ? ` Best ${pair}%.` : ""}`
            : `Earn the ${voices.map((v) => FUGUE.voiceNames[v].toLowerCase()).join(" and the ")} alone here first (${Math.round(EARN * 100)}% each, ${DIFFICULTY[diff].name.toLowerCase()}): then you can play them together.`
          : `${DIFFICULTY[diff].text} You hear only what you play. Choose a second voice to play two at once.`}
      </p>
      {note && <p className="tg-note">{note}</p>}
      <div className="tg-tempo" role="group" aria-label="Tempo">
        {TEMPOS.map((t) => (
          <button key={t} type="button" id={`tempo-${t}`} className={t === bpm ? "on" : ""} onClick={() => setBpm(t)}>
            <span className="tg-q">♩</span>={t}
          </button>
        ))}
        <button type="button" id="sync" onClick={sync} title="Tap along with clicks so the game knows your timing">
          SYNC{lag ? ` ${lag > 0 ? "+" : ""}${lag}` : ""}
        </button>
      </div>
      <p className="tg-card-sub tg-keys">
        {duo ? "COMPUTER: LEFT HAND F (R ↑ V ↓) · RIGHT HAND J (U ↑ N ↓)" : diff === "notes" ? "COMPUTER: THE MOUSE ON THE LANES" : diff === "shape" ? "COMPUTER: SPACE THE SAME · ↑ HIGHER · ↓ LOWER" : "COMPUTER: SPACE BAR"}
      </p>
      <label className="tg-open">
        <input type="checkbox" id="open-all" checked={openAll} onChange={(e) => setOpenAll(e.target.checked)} /> Open everything (for testing)
      </label>
    </div>
  );
}

function Result({ phase, voices, again }: { phase: Extract<Phase, { kind: "result" }>; voices: number[]; again: () => void }) {
  const got = phase.results.reduce((s, r) => s + r.got, 0);
  const of = phase.results.reduce((s, r) => s + r.of, 0);
  const ok = got >= EARN * of;
  const names = voices.map(voiceName);
  return (
    <div className="tg-card tg-card-low">
      <h1 className={ok ? "tg-gold" : ""}>{ok ? (names.length > 1 ? `${names.join(" & ")} TOGETHER` : `${names[0]} EARNED`) : "NOT YET"}</h1>
      {phase.results.map((r) => (
        <p key={r.voice} className="tg-card-sub" style={{ color: VOICE_INKS[r.voice] }}>
          {voiceName(r.voice)}: {r.got} OF {r.of}
        </p>
      ))}
      <p className="tg-card-sub">
        {Math.round((100 * got) / of)}% · {Math.round(EARN * 100)}% TO EARN · MAX COMBO {phase.maxCombo} · PERFECT {phase.perfect}
      </p>
      <button type="button" id="again" className="tg-link" onClick={again}>
        Choose a section, voices or tempo
      </button>
    </div>
  );
}
