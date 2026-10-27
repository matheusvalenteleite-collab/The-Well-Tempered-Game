/**
 * D343: play.html on a device that is surely a computer (home.ts isSurelyComputer): told so, and nothing
 * else, in the language of the browser. Its title takes the owner's seven taps (Secret.tsx), so that a
 * computer can be unlocked too (then the game, with ⚙ PLAY ON).
 */
import { tr } from "../i18n/index.ts";
import { VersionTap } from "./Secret.tsx";

export function MobileOnly() {
  return (
    <div className="tb-mobile-only" role="main">
      <h1 className="tb-mobile-only-title">
        <VersionTap id="mobile-only-title">{tr("MOBILE ONLY")}</VersionTap>
      </h1>
      <p className="tb-mobile-only-why">{tr("The Well-Tempered Game is played with two thumbs on a phone or tablet, held sideways. Open this page there.")}</p>
    </div>
  );
}
