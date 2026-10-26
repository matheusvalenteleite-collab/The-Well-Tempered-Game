/**
 * The two panels kept off the screen (D173): ⚙, the settings (the instrument, the level, the speed,
 * and the delay of the sound, measured by tapping along to a click: Bluetooth headphones add a fifth
 * of a second or more, which the phone often does not report); and ?, how to play and how to put the
 * game on the Home Screen.
 */
import { tr, trCanvas } from "../i18n/index.ts";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Chip } from "./chip.ts";
import type { Instrument } from "./engine.ts";
import type { Level as Difficulty } from "./lanes.ts";
import { offsetOf } from "./lag.ts";
import { QUICK_CLICKS, QUICK_EARLY, QUICK_PERIOD, QUICK_TAPS, quickLag, SKIP_QUICK, verdictOf } from "./headphones.ts";
import { creditFor, drums as drumsNow, PRESETS, presetById, setDrums as setDrumsNow } from "./sound.ts";
import { PITCHES, TEMPERAMENTS } from "./tuning.ts";

/** D180: the tempo, 20 to 200 quarter notes a minute (D181). */
export const BPM_MIN = 20;
export const BPM_MAX = 200;
export const saneBpm = (b: unknown) => (typeof b === "number" && b >= BPM_MIN && b <= BPM_MAX ? Math.round(b) : 54);

export function BpmSetting({ bpm, set }: { bpm: number; set: (b: number) => void }) {
  return (
    <label className="tg-set tg-bpm">
      <span>TEMPO</span>
      <span className="tg-panel-val">♩ = {bpm}</span>
      <input type="range" id="bpm" min={BPM_MIN} max={BPM_MAX} step={1} value={bpm} onChange={(e) => set(Number(e.target.value))} />
    </label>
  );
}

/** D180: the temperament and the pitch of A. */
export function TuningSetting({ id, a, set }: { id: string; a: number; set: (id: string, a: number) => void }) {
  return (
    <>
      <div className="tg-set">
        <span>TUNING</span>
        <div className="tg-seg" role="group" aria-label="A">
          {PITCHES.map((p) => (
            <button key={p} type="button" id={`a-${p}`} className={p === a ? "on" : ""} onClick={() => set(id, p)} aria-pressed={p === a}>
              A {p}
            </button>
          ))}
        </div>
      </div>
      <div className="tg-grid3" role="group" aria-label="Temperament">
        {TEMPERAMENTS.map((t) => (
          <button key={t.id} type="button" id={`temper-${t.id}`} className={t.id === id ? "on" : ""} onClick={() => set(t.id, a)} aria-pressed={t.id === id}>
            {t.name}
          </button>
        ))}
      </div>
    </>
  );
}

export interface Settings {
  inst: Instrument;
  diff: Difficulty;
  /** Quarter notes a minute (D180; D181: always the quarter note), 20 to 200. */
  bpm: number;
}

export function Panel({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.code === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);
  return (
    <div className="tg-picker tg-panel" role="dialog" aria-label={title}>
      <header>
        <h1>{tr(title)}</h1>
        <button type="button" id="close" className="tg-x" aria-label="Close" onClick={close}>
          ✕
        </button>
      </header>
      {children}
    </div>
  );
}

export function Choice<T extends string>({ id, label, options, value, set }: { id: string; label: string; options: [T, string][]; value: T; set: (v: T) => void }) {
  return (
    <div className="tg-set">
      <span>{tr(label)}</span>
      <div className="tg-seg" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" id={`${id}-${v}`} className={v === value ? "on" : ""} onClick={() => set(v)} aria-pressed={v === value}>
            {trCanvas(text)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel(p: { settings: Settings; set: (s: Partial<Settings>) => void; lag: number | null; setLag: (s: number | null) => void; sound: string; setSound: (id: string) => void; tuning: { id: string; a: number }; setTuning: (id: string, a: number) => void; chip: () => Chip; close: () => void }) {
  const { settings: s, set } = p;
  return (
    <Panel title="SETTINGS" close={p.close}>
      <Choice id="inst" label="INSTRUMENT" options={[["synth", "SYNTH"], ["piano", "PIANO"]]} value={s.inst} set={(inst) => set({ inst })} />
      <p className="tg-panel-note">{s.inst === "synth" ? "Upright. The thumb gives the way the tune goes, the height how far." : "Sideways. A keyboard of every semitone; the notes fall onto their keys."}</p>
      <Choice id="level" label="LEVEL" options={[["easy", "EASY"], ["normal", "NORMAL"]]} value={s.diff} set={(diff) => set({ diff })} />
      <BpmSetting bpm={s.bpm} set={(bpm) => set({ bpm })} />
      <SoundSetting value={p.sound} set={p.setSound} />
      <TuningSetting id={p.tuning.id} a={p.tuning.a} set={p.setTuning} />
      <LagSetting lag={p.lag} setLag={p.setLag} chip={p.chip} />
      <p className="tg-panel-note">With Bluetooth headphones the sound comes late. Set the delay with them on: tap along to the clicks.</p>
    </Panel>
  );
}

/** The ensemble (D177): a family, then one of its presets. */
/** D181, D193: ACOUSTIC's, CHIP's and MOOG's drums, on (the default) or off, kept on the device. */
const DRUMS_KEY = "tg-drums";
export function loadDrums() {
  try {
    // D193: on unless turned off (the bossa's groove is much of its charm).
    setDrumsNow(localStorage.getItem(DRUMS_KEY) !== "false");
  } catch {
    /* no storage */
  }
}

export function SoundSetting({ value, set }: { value: string; set: (id: string) => void }) {
  return (
    <>
      <div className="tg-set">
        <span>SOUND</span>
        <span className="tg-panel-val">{presetById(value).name}</span>
      </div>
      <SoundChoices value={value} set={set} />
    </>
  );
}

/** The sounds (D292: the five) and DRUMS where the sound has them; D233: also the bench's folded SOUND. */
export function SoundChoices({ value, set }: { value: string; set: (id: string) => void }) {
  const [drums, setDrumsState] = useState(drumsNow());
  const setDrums = (on: boolean) => {
    setDrumsState(on);
    setDrumsNow(on);
    try {
      localStorage.setItem(DRUMS_KEY, String(on));
    } catch {
      /* no storage */
    }
  };
  // D292: five sounds, no family tabs; DRUMS (CLASSIC CHIP's loop) where the sound chosen has drums.
  return (
    <>
      <div className="tg-grid3" role="group" aria-label="Sound">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" id={`sound-${p.id}`} className={p.id === value ? "on" : ""} onClick={() => set(p.id)} aria-pressed={p.id === value}>
            {p.name}
          </button>
        ))}
        {presetById(value).drums && (
          <button type="button" id="drums" className={`tg-toggle${drums ? " on" : ""}`} onClick={() => setDrums(!drums)} aria-pressed={drums}>
            DRUMS {drums ? "ON" : "OFF"}
          </button>
        )}
      </div>
      {creditFor(value) && <p className="tg-credit">{creditFor(value)}</p>}
    </>
  );
}

/** The sound's delay: what is set, and setting it by tapping along. */
export function LagSetting({ lag, setLag, chip }: { lag: number | null; setLag: (s: number | null) => void; chip: () => Chip }) {
  const [tapping, setTapping] = useState(false);
  return (
    <>
      <div className="tg-set">
        <span>{tr("SOUND DELAY")}</span>
        <span className="tg-panel-val">{lag === null ? tr("AS THE PHONE SAYS") : `${Math.round(lag * 1000)} MS · ${trCanvas(verdictOf(lag))}`}</span>
      </div>
      {tapping ? (
        <Tapper chip={chip} done={(lag) => (lag !== null && setLag(lag), setTapping(false))} />
      ) : (
        <div className="tg-row">
          <button type="button" id="tap-lag" className="tg-piece" onClick={() => setTapping(true)}>
            {tr("SET BY TAPPING")}
          </button>
          {lag !== null && (
            <button type="button" id="reset-lag" className="tg-link" onClick={() => setLag(null)}>
              {tr("Reset")}
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * D223: the quick calibration (about 5 s): QUICK_CLICKS clicks, the first three to settle in, then
 * eight taps counted; the median, the taps far from it left out (headphones.ts quickLag); the result
 * shown in ms with its verdict (WIRED-LIKE, BLUETOOTH) before it is kept.
 */
export function Tapper({ chip, done }: { chip: () => Chip; done: (lag: number | null) => void }) {
  const t0 = useRef(0);
  const offs = useRef<number[]>([]);
  const over = useRef(false);
  const [n, setN] = useState(0);
  const [msg, setMsg] = useState(tr("TAP HERE ON EACH CLICK"));
  useEffect(() => {
    const ch = chip();
    let timer = 0;
    void ch.resume().then(() => {
      t0.current = ch.ctx.currentTime + 0.5;
      for (let i = 0; i < QUICK_CLICKS; i++) ch.tick(t0.current + i * QUICK_PERIOD, i % 4 === 0, 0.35);
      timer = window.setTimeout(finish, (0.5 + QUICK_CLICKS * QUICK_PERIOD + 0.4) * 1000);
    });
    return () => window.clearTimeout(timer);
  }, []);
  function finish() {
    if (over.current) return;
    over.current = true;
    const r = quickLag(offs.current);
    if (!r) return (setMsg(offs.current.length < 5 ? tr("TOO FEW TAPS") : tr("TOO UNEVEN: TRY AGAIN")), window.setTimeout(() => done(null), 1300));
    setMsg(`${Math.round(r.lag * 1000)} MS · ${verdictOf(r.lag)}`);
    window.setTimeout(() => done(r.lag), 1100);
  }
  const tap = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (over.current) return;
    const ch = chip();
    // D299: on the smoothed audio clock (currentTime moves in blocks: up to a block off a tap).
    const at = ch.clock() - (performance.now() - e.timeStamp) / 1000;
    const o = offsetOf(at, t0.current, QUICK_PERIOD, QUICK_EARLY);
    if (!o || o.click < SKIP_QUICK || o.click >= QUICK_CLICKS) return;
    offs.current.push(o.off);
    setN(offs.current.length);
    if (offs.current.length >= QUICK_TAPS) finish();
  };
  return (
    <button type="button" id="tap-pad" className="tg-tap-pad" onPointerDown={tap}>
      {msg}
      <small>{n ? `${n} / ${QUICK_TAPS} TAPS` : "LISTEN, THEN JOIN IN"}</small>
    </button>
  );
}

/**
 * D223: the screen's delay, apart from the sound's: a gem falls onto a line, once every QUICK_PERIOD;
 * the player taps as it crosses (seen, not heard: no click). The median lateness, as quickLag takes it,
 * is how far ahead the box and the road are drawn.
 */
export function VisualTapper({ done }: { done: (visual: number | null) => void }) {
  const t0 = useRef(performance.now() + 900);
  const offs = useRef<number[]>([]);
  const over = useRef(false);
  const gem = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const [msg, setMsg] = useState("TAP AS THE GEM CROSSES THE LINE");
  const P = QUICK_PERIOD * 1000;
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const k = (performance.now() - t0.current) / P;
      // The gem falls over the period before each crossing; the line flashes as it crosses.
      const ph = ((k % 1) + 1) % 1;
      if (gem.current) gem.current.style.top = `${ph * 100}%`;
      if (gem.current) gem.current.style.opacity = k < -1 || k > QUICK_CLICKS - 0.9 ? "0" : "1";
      if (line.current) line.current.style.opacity = ph > 0.92 || ph < 0.08 ? "1" : "0.35";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const timer = window.setTimeout(finish, 900 + QUICK_CLICKS * P + 400);
    return () => (cancelAnimationFrame(raf), window.clearTimeout(timer));
  }, []);
  function finish() {
    if (over.current) return;
    over.current = true;
    const r = quickLag(offs.current);
    if (!r) return (setMsg(offs.current.length < 5 ? tr("TOO FEW TAPS") : tr("TOO UNEVEN: TRY AGAIN")), window.setTimeout(() => done(null), 1300));
    setMsg(`${Math.round(r.lag * 1000)} MS`);
    window.setTimeout(() => done(r.lag), 1100);
  }
  const tap = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (over.current) return;
    // The gem crosses the line at the end of each fall: at t0, then every period.
    const o = offsetOf(e.timeStamp / 1000, t0.current / 1000, QUICK_PERIOD, QUICK_EARLY);
    if (!o || o.click < SKIP_QUICK || o.click >= QUICK_CLICKS) return;
    offs.current.push(o.off);
    setN(offs.current.length);
    if (offs.current.length >= QUICK_TAPS) finish();
  };
  return (
    <button type="button" id="tap-visual" className="tg-tap-pad tg-tap-visual" onPointerDown={tap}>
      <span className="tg-tap-lane" aria-hidden="true">
        <span ref={gem} className="tg-tap-gem" />
        <span ref={line} className="tg-tap-line" />
      </span>
      {msg}
      <small>{n ? `${n} / ${QUICK_TAPS} TAPS` : "WATCH, THEN JOIN IN"}</small>
    </button>
  );
}

export function HelpPanel({ close }: { close: () => void }) {
  return (
    <Panel title="HOW TO PLAY" close={close}>
      <section className="tg-help">
        <h2>THE GAME</h2>
        <p>Choose a prelude or fugue and a voice; the other voices play around you. The box above shows every voice; yours is outlined. The subject is dotted along its top, and a ◆ marks each entry as it comes (gold when it is yours).</p>
        <h2>SYNTH (UPRIGHT)</h2>
        <p>You play the shape, the game the pitches. Right thumb: the next note is higher. Left thumb: lower. A repeat: either. EASY wants the way and the time. NORMAL wants how far too: tap low for a repeat, higher for a step, a third, a leap (the bands are marked).</p>
        <p>A note lasts while your thumb stays down: a quick tap is staccato. Hold one thumb and tap with the other: the notes join (legato). Slide a held thumb up or down: the next note, rising or falling, joined. Wobble sideways: vibrato.</p>
        <h2>PIANO (SIDEWAYS)</h2>
        <p>The notes fall onto their keys. EASY: any key on time. NORMAL: the right key, or you hear the wrong one. A key is struck anywhere in its column. The note dies away as you hold it and stops when you let go.</p>
        <h2>SOUND</h2>
        <p>⚙ SOUND: an ensemble for the voices, each voice its own instrument: acoustic sets, bands with a rhythm section, chip sets, Moog sets.</p>
        <h2>TIMING</h2>
        <p>Late with headphones? ⚙ → SET BY TAPPING.</p>
        <h2>PUT IT ON THE HOME SCREEN</h2>
        <p>It then opens full screen, with no browser bars.</p>
        <p>
          <b>iPhone:</b> open this page in Safari, tap Share (the square with the arrow), then Add to Home Screen, then Add. Open the game from its new icon.
        </p>
        <p>
          <b>Android:</b> in Chrome, tap ⋮, then Add to Home screen (or Install app).
        </p>
      </section>
    </Panel>
  );
}
