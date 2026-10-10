import { useEffect, useState } from "react";
import { App } from "./App.tsx";
import { TrioApp } from "./TrioApp.tsx";
import { Tutorial, tutorialSeen } from "./Tutorial.tsx";
import { Tour } from "./Tour.tsx";
import { store, stored } from "./shared.ts";
import { tt } from "../tutorial/text.ts";

/**
 * Two voices (Exercitium I) or three (Exercitium II, D90): separate screens over one engine.
 * The tutorial (D98) opens over the game, which stays mounted underneath (hidden and silent), so
 * that nothing written is lost; from it the learner may be sent to an exercise, or on the tour.
 */
export function Root() {
  const [voices, setVoices] = useState<2 | 3>(() => stored("wtg.voices", 2, (v) => v === 2 || v === 3));
  useEffect(() => store("wtg.voices", voices), [voices]);
  const [screen, setScreen] = useState<"game" | "tutorial">("game");
  const [tour, setTour] = useState(false);
  const [command, setCommand] = useState<{ stepId: string; n: number } | null>(null);
  // First visit: an invitation to the tutorial, once (never if the tutorial or a star was ever seen).
  const [invite, setInvite] = useState(
    () => !tutorialSeen() && stored("wtg.tutorialInvite", true, (v) => typeof v === "boolean") && stored<string[]>("wtg.stars", [], (v) => Array.isArray(v)).length === 0,
  );
  const dismiss = () => {
    setInvite(false);
    store("wtg.tutorialInvite", false);
  };
  /** Open the tutorial, where it was left or at a lesson (a rule's, from the evaluation). */
  const openTutorial = (lessonId?: string) => {
    if (lessonId) store("wtg.tutorial", { ...stored<{ at: string; done: string[] }>("wtg.tutorial", { at: lessonId, done: [] }, (v) => typeof v === "object" && v !== null), at: lessonId });
    dismiss();
    setTour(false);
    setScreen("tutorial");
  };
  /** Leave the tutorial for an exercise of the game. */
  const openGame = (v: 2 | 3, stepId: string) => {
    // A screen not mounted yet reads its exercise from storage; a mounted one obeys the command.
    store(v === 3 ? "wtg.trioStep" : "wtg.stepId", stepId);
    setCommand({ stepId, n: Date.now() });
    setVoices(v);
    setScreen("game");
  };
  // A command is obeyed once (the game applies it in the same commit, before this effect runs):
  // a screen mounted later (another number of voices) must not replay it.
  useEffect(() => {
    if (command) setCommand(null);
  }, [command]);
  const link = { suspended: screen !== "game", command, onTutorial: openTutorial };
  return (
    <>
      <div className="game-layer" hidden={screen !== "game"}>
        {voices === 3 ? <TrioApp onVoices={setVoices} {...link} /> : <App onVoices={setVoices} {...link} />}
      </div>
      {screen === "tutorial" && (
        <Tutorial
          onLeave={() => setScreen("game")}
          onGame={openGame}
          onTour={() => {
            // The tour shows the two-voice screen on the learner's own exercise; nothing is moved.
            setVoices(2);
            setScreen("game");
            setTour(true);
          }}
        />
      )}
      {tour && screen === "game" && (
        <Tour
          onClose={() => setTour(false)}
          onDone={() => {
            setTour(false);
            setScreen("tutorial");
          }}
        />
      )}
      {invite && screen === "game" && (
        <div className="dialog-backdrop tut-invite" role="dialog" aria-modal="true" aria-label={tt("ui.title")}>
          <div className="dialog">
            <h2>{tt("ui.title")}</h2>
            <p>{tt("ui.welcomeBanner")}</p>
            <div className="tour-buttons">
              <button onClick={dismiss}>{tt("ui.welcomeDismiss")}</button>
              <button className="primary" onClick={() => openTutorial()}>{tt("ui.welcomeOpen")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
