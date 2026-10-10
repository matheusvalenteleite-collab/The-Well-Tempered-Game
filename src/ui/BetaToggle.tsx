/** The BETA / real setup switch (D141), in the top bar of every screen. */
import { setBeta, useBeta } from "./beta.ts";
import { tt } from "../tutorial/text.ts";

export function BetaToggle() {
  const beta = useBeta();
  return (
    <button className={beta ? "beta-toggle on" : "beta-toggle"} aria-pressed={beta} onClick={() => setBeta(!beta)} title={tt(beta ? "ui.betaOnHelp" : "ui.betaOffHelp")}>
      {tt(beta ? "ui.betaOn" : "ui.betaOff")}
    </button>
  );
}
