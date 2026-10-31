/**
 * D381: play.html watches the audio route while it is open (src/touch/route.ts decides): the output
 * latency every POLL_MS and again just after any sign of a change (`devicechange`, the AudioContext's
 * state, iOS's `audioSession`, the silent keep-alive <audio> paused by the system, the page back after a
 * while away). The headphones gone: the Bluetooth delay dropped at once and a brief notice, HEADPHONES
 * DISCONNECTED: DELAY RESET; back: the delay given back. Where the browser cannot tell, a chip, USING
 * SPEAKER? TAP TO RESET DELAY. A run playing is paused first (its timing changes with the delay).
 */
import { useEffect, useRef, useState } from "react";
import { tr } from "../i18n/index.ts";
import type { Chip } from "../touch/chip.ts";
import { latencyOf, POLL_MS, type LagBook } from "../touch/headphones.ts";
import { AWAY_MS, REREAD_MS, routeDecision, routeSign, type Held, type RouteSignal } from "../touch/route.ts";

const HELD_KEY = "tg-lag-held";
/** How long the notice stays (ms). */
const NOTICE_MS = 3500;

function heldNow(): Held | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(HELD_KEY) ?? "null") as Held | null;
    return v && typeof v.lag === "number" && typeof v.at === "number" ? v : null;
  } catch {
    return null;
  }
}
function keepHeld(h: Held | null) {
  try {
    if (h) sessionStorage.setItem(HELD_KEY, JSON.stringify(h));
    else sessionStorage.removeItem(HELD_KEY);
  } catch {
    /* this page only */
  }
}

export interface RouteDeps {
  chip: { current: Chip | null };
  /** The delay in force now. */
  lag: () => number | null;
  /** The latency reported when the delay in force was tapped (s), if one was. */
  tappedAt: () => number | undefined;
  /** D223's delays by setup. */
  book: () => LagBook;
  /** Sets the delay (null: none) with the latency it now belongs to. */
  apply: (lag: number | null) => void;
  /** A run under way: paused before its delay changes. */
  pause: () => void;
  on: boolean;
}

export type Notice = { text: string; at: number } | null;

export function useRoute(d: RouteDeps) {
  const deps = useRef(d);
  deps.current = d;
  const [notice, setNotice] = useState<Notice>(null);
  const [ask, setAsk] = useState(false);
  const [recal, setRecal] = useState(false);
  /** The chip dismissed: not asked again until the next sign of a change. */
  const quiet = useRef(false);
  const say = (text: string) => setNotice({ text, at: Date.now() });

  const check = (signal: RouteSignal) => {
    const x = deps.current;
    const ch = x.chip.current;
    if (!x.on || !ch) return;
    if (routeSign(signal)) quiet.current = false;
    const lag = x.lag();
    const act = routeDecision({ lag, reported: latencyOf(ch.ctx), tappedAt: x.tappedAt(), held: heldNow(), book: x.book(), signal });
    if (act.kind === "drop" && lag !== null) {
      x.pause();
      keepHeld({ lag, at: x.tappedAt() ?? 0 });
      x.apply(null);
      setAsk(false);
      say(tr("Headphones disconnected: delay reset"));
    } else if (act.kind === "restore") {
      x.pause();
      keepHeld(null);
      x.apply(act.lag);
      setRecal(false);
      say(tr("Headphones back: delay {ms} ms restored", { ms: Math.round(act.lag * 1000) }));
    } else if (act.kind === "ask") {
      if (!quiet.current) {
        if (routeSign(signal)) x.pause();
        setAsk(true);
      }
    } else if (act.kind === "recalibrate") setRecal(true);
    else if (lag === null || lag <= 0.08) setAsk(false);
  };

  useEffect(() => {
    if (!d.on) return;
    const timers: number[] = [];
    const sign = (s: RouteSignal) => {
      check(s);
      for (const ms of REREAD_MS) timers.push(window.setTimeout(() => check(s), ms));
    };
    const poll = window.setInterval(() => check("poll"), POLL_MS);
    const onDevice = () => sign("devicechange");
    navigator.mediaDevices?.addEventListener?.("devicechange", onDevice);
    // The AudioContext's state (iOS: "interrupted" on some route changes) and iOS's audio session.
    let ctx: AudioContext | null = null;
    let el: HTMLAudioElement | null = null;
    // Only "interrupted" (Safari's own state) counts: the game suspends and resumes its context itself.
    const onState = (e: Event) => (e.target as { state?: string } | null)?.state === "interrupted" && sign("statechange");
    // The silent keep-alive paused by the system while the page is in view: iOS pauses media when the headphones go.
    const onPause = () => !document.hidden && sign("mediapause");
    const hook = () => {
      const ch = deps.current.chip.current;
      if (ch && ch.ctx !== ctx) {
        ctx?.removeEventListener("statechange", onState);
        ctx = ch.ctx;
        ctx.addEventListener("statechange", onState);
      }
      const a = ch?.keepAliveAudio ?? null;
      if (a !== el) {
        el?.removeEventListener("pause", onPause);
        el = a;
        el?.addEventListener("pause", onPause);
      }
    };
    const hooking = window.setInterval(hook, 1000);
    const session = (navigator as Navigator & { audioSession?: EventTarget }).audioSession;
    session?.addEventListener?.("statechange", onState);
    // Back to the page after a while away (the headphones may have gone meanwhile, unseen).
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) sign("resume");
      else sign("poll");
    };
    document.addEventListener("visibilitychange", onVis);
    check("start");
    return () => {
      window.clearInterval(poll);
      window.clearInterval(hooking);
      timers.forEach((t) => window.clearTimeout(t));
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDevice);
      ctx?.removeEventListener("statechange", onState);
      el?.removeEventListener("pause", onPause);
      session?.removeEventListener?.("statechange", onState);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [d.on]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [notice]);

  return {
    notice,
    ask,
    recal,
    /** The first reading once the sound starts (the chip made on the first touch). */
    started: () => check("start"),
    /** USING SPEAKER? tapped: the delay reset (kept to give back). */
    reset() {
      const x = deps.current;
      const lag = x.lag();
      if (lag !== null) keepHeld({ lag, at: x.tappedAt() ?? 0 });
      x.apply(null);
      setAsk(false);
      say(tr("Headphones disconnected: delay reset"));
    },
    keep() {
      quiet.current = true;
      setAsk(false);
    },
    dismissRecal: () => setRecal(false),
    /** A delay tapped by hand: nothing held any more, nothing to ask. */
    tapped() {
      keepHeld(null);
      setAsk(false);
      setRecal(false);
    },
  };
}
export type Route = ReturnType<typeof useRoute>;

/** The notice (brief) and the chip (until answered), over everything but out of the way. */
export function RouteNotice({ route, busy }: { route: Route; busy: boolean }) {
  return (
    <>
      {route.notice && (
        <p className="tb-route-notice" id="route-notice" role="status" key={route.notice.at}>
          {route.notice.text}
        </p>
      )}
      {route.ask && !route.notice && !busy && (
        <div className="tb-route-chip" id="route-chip" role="status">
          <button type="button" id="route-reset" onClick={route.reset}>
            {tr("Using speaker? Tap to reset delay")}
          </button>
          <button type="button" id="route-keep" className="tg-x" aria-label={tr("Dismiss")} onClick={route.keep}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
