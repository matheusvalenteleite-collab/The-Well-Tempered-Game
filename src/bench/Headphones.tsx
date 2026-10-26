/**
 * D223, ⚙ HEADPHONES: the sound's delay (tapped to a click, kept per listening setup), the screen's
 * delay (tapped to a falling gem), and BLUETOOTH MODE (AUTO, ON, OFF; D299: the whole piece, the player's
 * notes too, on the schedule; the touches score, silently). `useHeadphones` watches for other headphones while the app is open:
 * the reported output latency every two seconds (a hint, not the delay) and the browser's device
 * changes; a setup seen before gets its delay back; a change raises the banner to recalibrate.
 */
import { useEffect, useRef, useState } from "react";
import { tr } from "../i18n/index.ts";
import { presetById } from "../touch/sound.ts";
import type { Chip } from "../touch/chip.ts";
import { BT_AUTO_S, BT_LAG_KEY, BT_SOUNDS, btOn, lagFor, latencyOf, OutputWatch, POLL_MS, setupKey, withLag, type BtMode, type LagBook } from "../touch/headphones.ts";
import { Choice, LagSetting, VisualTapper } from "../touch/Panels.tsx";

const BOOK_KEY = "tg-lag-book";
const MODE_KEY = "tb-bt-mode";
const VISUAL_KEY = "tg-visual";

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
    /* no storage */
  }
}

/** The default output's name, where the browser gives it (most give none without a microphone's permission). */
async function outputLabel(): Promise<string | undefined> {
  try {
    const ds = await navigator.mediaDevices?.enumerateDevices?.();
    const outs = (ds ?? []).filter((d) => d.kind === "audiooutput" && d.label);
    return (outs.find((d) => d.deviceId === "default") ?? outs[0])?.label || undefined;
  } catch {
    return undefined;
  }
}

export function useHeadphones(chip: { current: Chip | null }, applyLag: (l: number | null) => void) {
  const book = useRef<LagBook>(load<LagBook>(BOOK_KEY, {}));
  const key = useRef<string | null>(null);
  const apply = useRef(applyLag);
  apply.current = applyLag;
  const [changed, setChanged] = useState(false);
  const [mode, setModeRaw] = useState<BtMode>(() => load<BtMode>(MODE_KEY, "auto"));
  const [visual, setVisualRaw] = useState<number>(() => load<number>(VISUAL_KEY, 0));
  const visualNow = useRef(visual);
  useEffect(() => {
    const watch = new OutputWatch();
    let label: string | undefined;
    const check = (device: boolean) => {
      const ch = chip.current;
      if (!ch) return;
      const lat = latencyOf(ch.ctx);
      const jumped = watch.sample(lat);
      const k = setupKey(lat, label);
      const first = key.current === null;
      if (k === key.current && !jumped && !device) return;
      key.current = k;
      // A setup seen before: its delay back.
      const stored = lagFor(book.current, k);
      if (stored !== undefined) apply.current(stored);
      if (!first && (jumped || device)) setChanged(true);
    };
    const timer = window.setInterval(() => check(false), POLL_MS);
    const onDevice = () =>
      void outputLabel().then((l) => {
        label = l;
        // The output's latency settles a moment after the switch.
        window.setTimeout(() => check(true), 400);
      });
    navigator.mediaDevices?.addEventListener?.("devicechange", onDevice);
    void outputLabel().then((l) => (label = l));
    return () => {
      window.clearInterval(timer);
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDevice);
    };
  }, []);
  return {
    /** A new delay tapped (or reset): kept for this setup. */
    record(l: number | null) {
      const k = key.current ?? setupKey(chip.current ? latencyOf(chip.current.ctx) : undefined);
      key.current = k;
      book.current = withLag(book.current, k, l);
      save(BOOK_KEY, book.current);
      setChanged(false);
    },
    changed,
    dismiss: () => setChanged(false),
    mode,
    setMode(m: BtMode) {
      setModeRaw(m);
      save(MODE_KEY, m);
    },
    visual,
    /** A new sound chip takes the screen's delay. */
    attach(ch: Chip) {
      ch.visual = visualNow.current;
    },
    setVisual(v: number) {
      visualNow.current = v;
      setVisualRaw(v);
      save(VISUAL_KEY, v);
      if (chip.current) chip.current.visual = v;
    },
    /** BLUETOOTH MODE for a game starting now. */
    btFor(lag: number | null): boolean {
      return btOn(mode, lag, chip.current ? (latencyOf(chip.current.ctx) ?? 0) : 0);
    },
  };
}
export type Headphones = ReturnType<typeof useHeadphones>;

const MODE_NOTE = "The whole piece, your notes too, plays on time through the headphones' delay; your touches score but make no sound (a missed note sounds all the same).";

export function HeadphonesFold({ hp, lag, setLag, chip }: { hp: Headphones; lag: number | null; setLag: (l: number | null) => void; chip: () => Chip }) {
  const [open, setOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const on = hp.btFor(lag);
  return (
    <>
      <button type="button" id="headphones-open" className="tb-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{`HEADPHONES · ${lag === null ? "DELAY NOT SET" : `${Math.round(lag * 1000)} MS`} · BT ${hp.mode.toUpperCase()}${hp.mode === "auto" ? (on ? " (ON)" : " (OFF)") : ""}`}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="tb-fold-panel" role="group" aria-label="Headphones">
          <p className="tg-panel-note">Bluetooth adds 120–300 ms. Calibrate after connecting. Wired or the phone's speaker is best.</p>
          <LagSetting lag={lag} setLag={setLag} chip={chip} />
          <div className="tg-set">
            <span>SCREEN DELAY</span>
            <span className="tg-panel-val">{hp.visual ? `${Math.round(hp.visual * 1000)} MS` : "NONE"}</span>
          </div>
          {watching ? (
            <VisualTapper done={(v) => (v !== null && hp.setVisual(v), setWatching(false))} />
          ) : (
            <div className="tg-row">
              <button type="button" id="tap-visual-open" className="tg-piece" onClick={() => setWatching(true)}>
                SET BY WATCHING
              </button>
              {hp.visual !== 0 && (
                <button type="button" id="reset-visual" className="tg-link" onClick={() => hp.setVisual(0)}>
                  Reset
                </button>
              )}
            </div>
          )}
          <Choice id="bt" label="BLUETOOTH MODE" options={[["auto", "AUTO"], ["on", "ON"], ["off", "OFF"]]} value={hp.mode} set={hp.setMode} />
          <p className="tg-panel-note">{MODE_NOTE} AUTO: on over 80 ms{hp.mode === "auto" ? ` (now ${on ? "on" : "off"})` : ""}.</p>
          <BtLite lag={lag} setLag={setLag} chip={chip} on={on} />
          <button type="button" id="headphones-done" className="tb-fold-done" onClick={() => setOpen(false)}>
            ✕ DONE
          </button>
        </div>
      )}
    </>
  );
}

/** D299: the last Bluetooth delay tapped (s), offered again on another visit; none: null. */
export function storedBtLag(): number | null {
  const v = load<number | null>(BT_LAG_KEY, null);
  return typeof v === "number" && v > BT_AUTO_S && v < 0.6 ? v : null;
}
/** D299: a delay tapped over BT_AUTO_S kept as the last Bluetooth delay. */
export function keepBtLag(l: number | null) {
  if (l !== null && l > BT_AUTO_S) save(BT_LAG_KEY, Math.round(l * 1000) / 1000);
}

/** D299: the clicks of the sync check, and their spacing (s). */
const CHECK_CLICKS = 8;
const CHECK_PERIOD = 0.6;
/**
 * D299, CHECK: eight clicks, a light flashing as each is heard by the delay in force (the audio clock
 * less the delay): the light and the click together, the delay is right; the light first, it is too
 * short; the click first, too long.
 */
export function SyncCheck({ chip, done }: { chip: () => Chip; done: () => void }) {
  const dot = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const ch = chip();
    let raf = 0;
    let t0 = Infinity;
    let timer = 0;
    void ch.resume().then(() => {
      t0 = ch.ctx.currentTime + 0.4;
      for (let i = 0; i < CHECK_CLICKS; i++) ch.tick(t0 + i * CHECK_PERIOD, i % 4 === 0, 0.35);
      timer = window.setTimeout(done, (0.4 + CHECK_CLICKS * CHECK_PERIOD + 0.6 + (ch.lag ?? 0)) * 1000);
    });
    const draw = () => {
      const heard = ch.clock() - (ch.lag ?? 0);
      const k = (heard - t0) / CHECK_PERIOD;
      const on = k >= -0.02 && k < CHECK_CLICKS && k - Math.floor(k) < 0.18;
      if (dot.current) dot.current.style.opacity = on ? "1" : "0.12";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => (cancelAnimationFrame(raf), window.clearTimeout(timer));
  }, []);
  return (
    <div className="tg-tap-pad tb-sync" id="sync-check" role="status">
      <span ref={dot} className="tb-sync-dot" aria-hidden="true" />
      <small>{tr("DOES EACH CLICK COME WITH THE LIGHT?")}</small>
    </div>
  );
}

/**
 * D299, the minimal page's Bluetooth lines under the sound's delay: what BLUETOOTH MODE does when it is
 * on (a delay tapped over 80 ms), the sounds with the clearest starts to play to, CHECK (the light and
 * the click), and the last Bluetooth delay offered again (never applied by itself: D260).
 */
export function BtLite({ lag, setLag, chip, on }: { lag: number | null; setLag: (l: number | null) => void; chip: () => Chip; on: boolean }) {
  const [checking, setChecking] = useState(false);
  const last = lag === null ? storedBtLag() : null;
  return (
    <>
      {on && <p className="tg-panel-note" id="bt-on-note">{tr("BLUETOOTH MODE is on: the whole piece plays on time through the delay; your touches score but make no sound.")}</p>}
      {on && (
        <p className="tg-panel-note" id="bt-sounds">
          {tr("Clearest sounds for Bluetooth:")} {BT_SOUNDS.map((id) => presetById(id).name).join(" · ")}
        </p>
      )}
      {last !== null && (
        <button type="button" id="bt-last" className="tg-piece" onClick={() => setLag(last)}>
          {tr("USE MY LAST BLUETOOTH DELAY ({ms} MS)", { ms: Math.round(last * 1000) })}
        </button>
      )}
      {lag !== null &&
        (checking ? (
          <SyncCheck chip={chip} done={() => setChecking(false)} />
        ) : (
          <button type="button" id="sync-check-open" className="tg-link" onClick={() => setChecking(true)}>
            {tr("CHECK THE DELAY")}
          </button>
        ))}
    </>
  );
}
