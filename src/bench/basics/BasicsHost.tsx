/**
 * D688 (design studio; BASICS v2): what the tutorial shows over the play screen between the takes. Each act opens
 * with Glenn's line, said by his small still portrait (no animation), with I KNOW THIS beside CONTINUE; each idea
 * with a 2 s clip of real thumbs on the phone, seen from above (tap to skip); between takes, at most one short
 * line (the second miss's hint). None of it shows while the music plays.
 */
import { useEffect, useRef } from "react";
import { tr } from "../../i18n/index.ts";
import { GlennFace } from "../GlennFace.tsx";

/**
 * D941 (the owner's playtest: "We should have them quickly playing through the exact same exercise player will soon be
 * offered"): one clip a stage, its own first version played by the thumbs the game plans, in order, at 1.75x its tempo,
 * back at rest at the end (D699).
 */
export const CLIPS: Readonly<Record<string, string>> = {
  "1.1": new URL("./clips/1-1.mp4", import.meta.url).href,
  "1.2": new URL("./clips/1-2.mp4", import.meta.url).href,
  "2.1": new URL("./clips/2-1.mp4", import.meta.url).href,
  "2.2": new URL("./clips/2-2.mp4", import.meta.url).href,
  "2.3": new URL("./clips/2-3.mp4", import.meta.url).href,
  "2.4": new URL("./clips/2-4.mp4", import.meta.url).href,
  "2.5": new URL("./clips/2-5.mp4", import.meta.url).href,
  "3.1": new URL("./clips/3-1.mp4", import.meta.url).href,
  "3.2": new URL("./clips/3-2.mp4", import.meta.url).href,
  "4.1": new URL("./clips/4-1.mp4", import.meta.url).href,
  "4.2": new URL("./clips/4-2.mp4", import.meta.url).href,
  "6.1": new URL("./clips/6-1.mp4", import.meta.url).href,
  "6.2": new URL("./clips/6-2.mp4", import.meta.url).href,
  "6.3": new URL("./clips/6-3.mp4", import.meta.url).href,
  "6.4": new URL("./clips/6-4.mp4", import.meta.url).href,
  "6.5": new URL("./clips/6-5.mp4", import.meta.url).href,
};

export type HostView =
  | { kind: "card"; act: number; title: string; line: string; go: () => void; skip: () => void }
  | { kind: "clip"; stage: string; done: () => void }
  | { kind: "hint"; text: string; done: () => void }
  | { kind: "finale"; line: string; done: () => void };

function Card({ act, title, line, children }: { act?: number; title?: string; line: string; children: React.ReactNode }) {
  return (
    <div className="basics2-card" role="dialog" aria-modal="true">
      <div className="basics2-glenn" aria-hidden="true">
        <GlennFace talking={false} />
      </div>
      <div className="basics2-words">
        {title && (
          <p className="basics2-act">
            {act ? `${["I", "II", "III", "IV", "V", "VI"][act - 1]} · ` : ""}
            {tr(title)}
          </p>
        )}
        <p className="basics2-line">{tr(line)}</p>
        <div className="basics2-buttons">{children}</div>
      </div>
    </div>
  );
}

export function BasicsHost({ view }: { view: HostView | null }) {
  const vid = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (view?.kind !== "hint") return;
    const t = window.setTimeout(view.done, 2200);
    return () => window.clearTimeout(t);
  }, [view]);
  if (!view) return null;
  if (view.kind === "card")
    return (
      <div className="basics2-layer">
        <Card act={view.act} title={view.title} line={view.line}>
          <button type="button" id="basics2-go" className="basics2-go" onClick={view.go}>
            ▶ {tr("CONTINUE")}
          </button>
          <button type="button" id="basics2-skip" className="basics2-skip" onClick={view.skip}>
            {tr("I KNOW THIS")}
          </button>
        </Card>
      </div>
    );
  if (view.kind === "finale")
    return (
      <div className="basics2-layer">
        <Card line={view.line}>
          <button type="button" id="basics2-go" className="basics2-go" onClick={view.done}>
            ▶ {tr("TO THE GAME")}
          </button>
        </Card>
      </div>
    );
  if (view.kind === "clip")
    return (
      <div className="basics2-layer basics2-cliplayer" onClick={view.done}>
        <video ref={vid} className="basics2-clip" src={CLIPS[view.stage]} autoPlay muted playsInline onEnded={view.done} onError={view.done} aria-label={tr("Thumbs on the phone")} />
      </div>
    );
  return (
    <div className="basics2-layer basics2-hintlayer" onClick={view.done}>
      <p className="basics2-hint">{tr(view.text)}</p>
    </div>
  );
}
