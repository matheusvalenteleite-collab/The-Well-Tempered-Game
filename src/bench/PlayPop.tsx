/**
 * D237, the pop-up that replaced the title card: a small box over the cards with the piece's formal
 * title, the voice (or hand) to play, preselected (flow.ts `defaultVoice`), and a big ▶ PLAY straight
 * into the count-in; ✕ (or Escape) closes it, back to the cards.
 */
import { useEffect, useState, type ReactNode } from "react";
import { fugueById } from "../touch/fugue.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { cardById } from "./cards.ts";
import { formalTitle } from "./FuguePicker.tsx";
import { fugueOf, isPrelude } from "./stages.ts";

/** The pop-up's title: "BWV 846/1 · PRELUDE IN C MAJOR" (the piece's own title where it has no card). */
export function popTitle(id: string): string {
  const c = cardById(fugueOf(id));
  return c ? formalTitle(c, isPrelude(id) ? "prelude" : "fugue") : fugueById(id).title.toUpperCase();
}

export function PlayPop({ id, voice, singing, setVoice, play, close, learn, rules, children }: { id: string; voice: number; singing: readonly number[]; setVoice: (v: number) => void; play: () => void; close: () => void; learn?: () => void; rules?: readonly string[]; children?: ReactNode }) {
  const f = fugueById(id);
  // D239: ? HOW TO PLAY: the mode's rules, folded under PLAY.
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [close]);
  return (
    <div className="tb-pop-veil" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="tb-pop" role="dialog" aria-modal="true" aria-label={popTitle(id)}>
        <button type="button" id="pop-close" className="tg-x tb-pop-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-pop-title">{popTitle(id)}</h2>
        <p className="tb-pop-ask">{f.kind === "prelude" ? "YOUR HAND" : "YOUR VOICE"}</p>
        <div className="tg-voices" role="group" aria-label="Voice">
          {f.voiceNames.map((name, i) => (
            <button key={name} type="button" id={`voice-${i}`} className={i === voice ? "on" : ""} style={{ color: inkOf(i, f.voices.length) }} disabled={!singing.includes(i)} onClick={() => setVoice(i)} aria-pressed={i === voice}>
              {name.toUpperCase()}
            </button>
          ))}
        </div>
        {children}
        <button type="button" id="play" className="tb-play tb-pop-play" autoFocus onClick={play}>
          ▶ PLAY
        </button>
        {rules && rules.length > 0 && (
          <button type="button" id="pop-help" className="tb-pop-help" aria-expanded={help} onClick={() => setHelp(!help)}>
            ? HOW TO PLAY
          </button>
        )}
        {help && rules && (
          <ul className="tb-pop-rules" id="pop-rules">
            {rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {learn && (
          <button type="button" id="learn" className="tb-learn" onClick={learn}>
            LEARN THIS MODE
          </button>
        )}
      </div>
    </div>
  );
}
