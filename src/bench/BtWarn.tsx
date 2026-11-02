/**
 * D494, THE BLUETOOTH WARNING. The owner: "Don't compensate for bluetooth automatically. Instead, display
 * a message if bluetooth headphones are connected as player presses PLAY on any fugue or TUTORIAL,
 * notifying player that it seems they're using bluetooth headphones or speakers, unfortunately the game
 * won't work properly... if they want the full experience, turn them off! Otherwise, go to settings for
 * calibration, but beware that you won't get the real experience that way."
 *
 * The detection is the one there is (headphones.ts btSeen: the AudioContext's reported `outputLatency`
 * over 80 ms); nothing reported is unsure, and unsure never warns. Shown at most once per app session
 * (sessionStorage), and again only after the route has read as not Bluetooth (RouteWatch's readings, or
 * a PLAY) and then Bluetooth once more.
 */
import { tr } from "../i18n/index.ts";
import { btWarnGate } from "../touch/headphones.ts";

const WARNED_KEY = "tb-bt-warned";
/** Where sessionStorage is not to be had: this page load only. */
let memo = false;

function warnedNow(): boolean {
  try {
    return sessionStorage.getItem(WARNED_KEY) === "1";
  } catch {
    return memo;
  }
}
function keepWarned(w: boolean) {
  memo = w;
  try {
    if (w) sessionStorage.setItem(WARNED_KEY, "1");
    else sessionStorage.removeItem(WARNED_KEY);
  } catch {
    /* this page only */
  }
}

/** A reading of the route (the watch's poll): a route read as not Bluetooth lets the warning come again. */
export function noteRoute(reported: number | undefined) {
  const w = warnedNow();
  const next = btWarnGate(w, reported).warned;
  // Only the reset is taken from a reading: being warned is for PLAY.
  if (w && !next) keepWarned(false);
}

/** At PLAY (a fugue, the TUTORIAL): whether to show the warning now (and, if so, it counts as shown). */
export function btWarnNow(reported: number | undefined): boolean {
  const g = btWarnGate(warnedNow(), reported);
  keepWarned(g.warned);
  return g.show;
}

export const BT_WARN_TEXT =
  "It looks like you're using Bluetooth headphones or speakers. Unfortunately the game won't work properly with them: the sound arrives late. For the full experience, turn Bluetooth off! Otherwise you can calibrate in SETTINGS, but you won't get the real experience that way.";

/** The modal: PLAY ANYWAY (on into the run) or SETTINGS (the sound's calibration). */
export function BtWarn({ play, settings }: { play: () => void; settings: () => void }) {
  return (
    <div className="tb-pop-veil tb-bt-warn-veil" role="dialog" aria-modal="true" aria-labelledby="bt-warn-title">
      <div className="tb-pop tb-bt-warn-box" id="bt-warn">
        <h1 className="tb-bt-warn-title" id="bt-warn-title">
          {tr("BLUETOOTH?")}
        </h1>
        <p className="tb-bt-warn-text">{tr(BT_WARN_TEXT)}</p>
        <div className="tb-bt-warn-row">
          <button type="button" id="bt-warn-play" className="tb-play" autoFocus onClick={play}>
            ▶ {tr("PLAY ANYWAY")}
          </button>
          <button type="button" id="bt-warn-settings" className="tb-pause-quit" onClick={settings}>
            ⚙ {tr("SETTINGS")}
          </button>
        </div>
      </div>
    </div>
  );
}
