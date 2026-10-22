/**
 * The two panels kept off the screen (D173): ⚙, the settings (the instrument, the level, the speed,
 * and the delay of the sound, measured by tapping along to a click: Bluetooth headphones add a fifth
 * of a second or more, which the phone often does not report); and ?, how to play and how to put the
 * game on the Home Screen.
 */
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Chip } from "./chip.ts";
import type { Instrument } from "./engine.ts";
import type { Level as Difficulty } from "./lanes.ts";
import { CLICKS, lagOf, offsetOf, PERIOD, SKIP } from "./lag.ts";
import { drums as drumsNow, FAMILIES, presetById, setDrums as setDrumsNow } from "./sound.ts";
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
        <h1>{title}</h1>
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
      <span>{label}</span>
      <div className="tg-seg" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" id={`${id}-${v}`} className={v === value ? "on" : ""} onClick={() => set(v)} aria-pressed={v === value}>
            {text}
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
/** D181: CHIP's and MOOG's drums, on or off, kept on the device. */
const DRUMS_KEY = "tg-drums";
export function loadDrums() {
  try {
    setDrumsNow(localStorage.getItem(DRUMS_KEY) === "true");
  } catch {
    /* no storage */
  }
}

export function SoundSetting({ value, set }: { value: string; set: (id: string) => void }) {
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
  const [family, setFamily] = useState(() => FAMILIES.findIndex((f) => f.presets.some((p) => p.id === value)));
  const fam = FAMILIES[Math.max(0, family)];
  return (
    <>
      <div className="tg-set">
        <span>SOUND</span>
        <span className="tg-panel-val">{presetById(value).name}</span>
      </div>
      <div className="tg-tabs" role="group" aria-label="Sound family">
        {FAMILIES.map((f, i) => (
          <button key={f.name} type="button" id={`family-${i}`} className={i === family ? "on" : ""} onClick={() => setFamily(i)}>
            {f.name}
          </button>
        ))}
      </div>
      <div className="tg-grid3" role="group" aria-label="Sound">
        {fam.presets.map((p) => (
          <button key={p.id} type="button" id={`sound-${p.id}`} className={p.id === value ? "on" : ""} onClick={() => set(p.id)} aria-pressed={p.id === value}>
            {p.name}
          </button>
        ))}
        {fam.presets.some((p) => p.drums) && (
          <button type="button" id="drums" className={`tg-toggle${drums ? " on" : ""}`} onClick={() => setDrums(!drums)} aria-pressed={drums}>
            DRUMS {drums ? "ON" : "OFF"}
          </button>
        )}
      </div>
    </>
  );
}

/** The sound's delay: what is set, and setting it by tapping along. */
export function LagSetting({ lag, setLag, chip }: { lag: number | null; setLag: (s: number | null) => void; chip: () => Chip }) {
  const [tapping, setTapping] = useState(false);
  return (
    <>
      <div className="tg-set">
        <span>SOUND DELAY</span>
        <span className="tg-panel-val">{lag === null ? "AS THE PHONE SAYS" : `${Math.round(lag * 1000)} MS`}</span>
      </div>
      {tapping ? (
        <Tapper chip={chip} done={(lag) => (lag !== null && setLag(lag), setTapping(false))} />
      ) : (
        <div className="tg-row">
          <button type="button" id="tap-lag" className="tg-piece" onClick={() => setTapping(true)}>
            SET BY TAPPING
          </button>
          {lag !== null && (
            <button type="button" id="reset-lag" className="tg-link" onClick={() => setLag(null)}>
              Reset
            </button>
          )}
        </div>
      )}
    </>
  );
}

function Tapper({ chip, done }: { chip: () => Chip; done: (lag: number | null) => void }) {
  const t0 = useRef(0);
  const offs = useRef<number[]>([]);
  const [n, setN] = useState(0);
  const [msg, setMsg] = useState("TAP HERE ON EACH CLICK");
  useEffect(() => {
    const ch = chip();
    let timer = 0;
    void ch.resume().then(() => {
      t0.current = ch.ctx.currentTime + 0.6;
      for (let i = 0; i < CLICKS; i++) ch.tick(t0.current + i * PERIOD, i % 4 === 0, 0.35);
      timer = window.setTimeout(finish, (0.6 + CLICKS * PERIOD + 0.5) * 1000);
    });
    return () => window.clearTimeout(timer);
  }, []);
  function finish() {
    const r = lagOf(offs.current);
    if (!r) return (setMsg("TOO FEW TAPS"), window.setTimeout(() => done(null), 1200));
    if (r.spread > 0.09) return (setMsg("TOO UNEVEN: TRY AGAIN"), window.setTimeout(() => done(null), 1400));
    done(r.lag);
  }
  const tap = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const ch = chip();
    const at = ch.ctx.currentTime - (performance.now() - e.timeStamp) / 1000;
    const o = offsetOf(at, t0.current);
    if (!o || o.click < SKIP || o.click >= CLICKS) return;
    offs.current.push(o.off);
    setN(offs.current.length);
  };
  return (
    <button type="button" id="tap-pad" className="tg-tap-pad" onPointerDown={tap}>
      {msg}
      <small>{n ? `${n} TAPS` : "LISTEN, THEN JOIN IN"}</small>
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
