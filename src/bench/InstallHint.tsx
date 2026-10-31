/**
 * D380: the Home Screen, gently. `InstallHint`: on iPhone Safari, not installed, once (kept on the device
 * when first shown), dismissible, only on the selection screen (never while a piece plays): "Add to Home
 * Screen for full screen: tap Share ⎙ then Add to Home Screen". `InstallButton`: Android's Chrome, in ⚙
 * SETTINGS, while the browser offers its install prompt (install.ts).
 */
import { useEffect, useState } from "react";
import { tr } from "../i18n/index.ts";
import { browserEnv, canInstall, hintSeen, install, markHintSeen, onInstallChange, shouldHint } from "./install.ts";

export function InstallHint({ busy }: { busy: boolean }) {
  // Decided once per visit: shown on this visit (until dismissed), never again after.
  const [show, setShow] = useState(() => shouldHint(browserEnv(), hintSeen(), false));
  useEffect(() => {
    if (show) markHintSeen();
  }, [show]);
  if (!show || busy) return null;
  return (
    <div className="tb-install-hint" id="install-hint" role="status">
      <span className="tb-install-icon" aria-hidden="true">
        ⎙
      </span>
      <span className="tb-install-text">{tr("Add to Home Screen for full screen: tap Share ⎙ then Add to Home Screen")}</span>
      <button type="button" id="install-hint-x" className="tg-x" aria-label={tr("Dismiss")} onClick={() => setShow(false)}>
        ✕
      </button>
    </div>
  );
}

export function InstallButton() {
  const [can, setCan] = useState(canInstall);
  useEffect(() => onInstallChange(() => setCan(canInstall())), []);
  if (!can) return null;
  return (
    <div className="tg-set tb-install-set">
      <span>{tr("INSTALL THE GAME")}</span>
      <button type="button" id="install-app" className="tg-piece" onClick={() => void install()}>
        {tr("INSTALL")}
      </button>
      <p className="tg-panel-note">{tr("Installed, it opens full screen and plays offline.")}</p>
    </div>
  );
}
