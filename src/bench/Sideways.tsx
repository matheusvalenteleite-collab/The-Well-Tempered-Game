/**
 * D369: play.html is played sideways only (the owner: "the game only runs on sideways phone … Can we make
 * it such that opening the game turns the phone sideways?"). A web page cannot turn an iPhone: Safari has
 * no orientation lock (screen.orientation.lock is refused there, and in an installed home-screen app iOS
 * ignores the manifest's orientation). So:
 *   - a phone or tablet held upright gets a full screen asking for it to be turned (a phone turning, in the
 *     player's language), over everything; a run going is paused (RESUME needs a tap: BenchApp);
 *   - where the browser allows it (Android's Chrome), the first tap asks for full screen and locks the
 *     screen sideways (`lockSideways`); a refusal is silent;
 *   - the manifest (public/play-app/manifest.webmanifest) asks for "landscape" and full screen, honoured
 *     by Android when the game is added to the home screen.
 */
import { useEffect, useState } from "react";
import { tr } from "../i18n/index.ts";

/** A phone or tablet (a coarse pointer) held upright: the media query the screen shows under. */
export const UPRIGHT_QUERY = "(orientation: portrait) and (pointer: coarse)";

/** Whether the device is now a phone or tablet held upright (false where there is no matchMedia). */
export function heldUpright(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(UPRIGHT_QUERY).matches;
  } catch {
    return false;
  }
}

/** Follows `heldUpright` (re-rendering on a turn). */
export function useUpright(): boolean {
  const [up, setUp] = useState(heldUpright);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const q = window.matchMedia(UPRIGHT_QUERY);
    const on = () => setUp(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return up;
}

let asked = false;
/**
 * The first tap on a touch device: full screen, then the screen locked sideways, where the browser allows
 * (Android's Chrome; never iOS Safari). Any failure is silent; asked once a visit.
 */
export function lockSideways() {
  if (asked) return;
  asked = true;
  try {
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;
    const el = document.documentElement;
    const so = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    const lock = () => {
      try {
        so?.lock?.("landscape").catch(() => {});
      } catch {
        /* no lock here */
      }
    };
    const full = !document.fullscreenElement && typeof el.requestFullscreen === "function" ? el.requestFullscreen({ navigationUI: "hide" }) : undefined;
    if (full) full.then(lock, lock);
    else lock();
  } catch {
    /* not offered here: nothing to do */
  }
}

/** Installs `lockSideways` on the first touch anywhere on the page (a user gesture, as the browsers ask). */
export function lockOnFirstTap() {
  if (typeof window === "undefined") return;
  const once = () => {
    window.removeEventListener("pointerup", once, true);
    lockSideways();
  };
  window.addEventListener("pointerup", once, true);
}

/** The full screen shown while the phone is upright. */
export function Sideways() {
  const up = useUpright();
  if (!up) return null;
  return (
    <div className="tb-sideways" id="sideways" role="alert" aria-live="assertive">
      <div className="tb-sideways-phone" aria-hidden="true">
        <div className="tb-sideways-screen">
          <span />
          <span />
          <span />
        </div>
      </div>
      <p className="tb-sideways-title">{tr("TURN YOUR PHONE SIDEWAYS")}</p>
      <p className="tb-sideways-why">{tr("The game is played with the phone on its side, a thumb on each bar.")}</p>
      <p className="tb-sideways-small">{tr("Rotation locked? Unlock it in the control centre.")}</p>
    </div>
  );
}
