/**
 * D223, ⚙ HEADPHONES: the sound's delay (tapped to a click, kept per listening setup), the screen's
 * delay (tapped to a falling gem), and BLUETOOTH MODE (AUTO, ON, OFF: the player's notes sounded
 * ahead at their written times). `useHeadphones` watches for other headphones while the app is open:
 * the reported output latency every two seconds (a hint, not the delay) and the browser's device
 * changes; a setup seen before gets its delay back; a change raises the banner to recalibrate.
 */
import { useEffect, useRef, useState } from "react";
import type { Chip } from "../touch/chip.ts";
import { btOn, lagFor, latencyOf, OutputWatch, POLL_MS, setupKey, withLag, type BtMode, type LagBook } from "../touch/headphones.ts";
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

const MODE_NOTE = "Your notes sound ahead at their written times, soft until your touch confirms them (a miss is heard briefly).";

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
          <button type="button" id="headphones-done" className="tb-fold-done" onClick={() => setOpen(false)}>
            ✕ DONE
          </button>
        </div>
      )}
    </>
  );
}
