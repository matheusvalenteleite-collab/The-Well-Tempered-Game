import { lazy, Suspense, useEffect, useState } from "react";
import { App } from "./App.tsx";
import { TrioApp } from "./TrioApp.tsx";
import { t } from "./i18n.ts";
import { Tour } from "./Tour.tsx";
import { store, stored } from "./shared.ts";
import { FUGUE_ID } from "../tutorial/fugue-id.ts";

// Loaded when first opened (the first download on a phone was one 10 MB file): the Well-Tempered
// Clavier, with its 48 pieces, and the tutorial.
const WtcApp = lazy(() => import("./WtcApp.tsx").then((m) => ({ default: m.WtcApp })));
const WtcStudy = lazy(() => import("./WtcStudy.tsx").then((m) => ({ default: m.WtcStudy })));
const Tutorial = lazy(() => import("./Tutorial.tsx").then((m) => ({ default: m.Tutorial })));
// The chorales (C4) and the WTC preludes and harmony (C6, C14), from the chorale session.
const ChoraleApp = lazy(() => import("./ChoraleApp.tsx").then((m) => ({ default: m.ChoraleApp })));
const WtcRoot = lazy(() => import("./WtcRoot.tsx").then((m) => ({ default: m.WtcRoot })));

/** The screens: two voices, three, the Well-Tempered Clavier (study and exercises), the chorales,
 * and the WTC preludes and harmony. */
export type Mode = 2 | 3 | "wtc" | "chorale" | "preludes";
const MODES: Mode[] = [2, 3, "wtc", "chorale", "preludes"];
const Loading = () => <div className="loading-screen">{t("ui.loading")}</div>;

/**
 * Two voices (Exercitium I), three (Exercitium II, D90), the Well-Tempered Clavier (D119), the
 * chorales (C4) or the WTC preludes and harmony (C6, C14): separate screens over one engine.
 * The tutorial (D140) opens over the game, which stays mounted underneath, hidden and silent, so that nothing written is lost (the Well-Tempered Clavier
 * screens, which have no such pause, close while it is open); from it the learner may be sent to
 * an exercise, or on the tour.
 */
export function Root() {
  const [voices, setVoices] = useState<Mode>(() => stored<Mode>("wtg.voices", 2, (v) => MODES.includes(v as Mode)));
  useEffect(() => store("wtg.voices", voices), [voices]);
  // The Well-Tempered Clavier opens on the study (D123); the exercises are one button away.
  const [wtcView, setWtcView] = useState<"study" | "exercises">(() => stored<"study" | "exercises">("wtg.wtcView", "study", (v) => v === "study" || v === "exercises"));
  useEffect(() => store("wtg.wtcView", wtcView), [wtcView]);
  const [screen, setScreen] = useState<"game" | "tutorial">("game");
  const [tour, setTour] = useState(false);
  const [command, setCommand] = useState<{ stepId: string; n: number } | null>(null);
  /** Open the tutorial, where it was left or at a lesson (a rule's, from the evaluation). */
  const openTutorial = (lessonId?: string) => {
    if (lessonId) store("wtg.tutorial", { ...stored<{ at: string; done: string[] }>("wtg.tutorial", { at: lessonId, done: [] }, (v) => typeof v === "object" && v !== null), at: lessonId });
    setTour(false);
    setScreen("tutorial");
  };
  /** Leave the tutorial for an exercise of the game, or for the Well-Tempered Clavier. */
  const openGame = (v: 2 | 3 | "wtc", stepId?: string) => {
    // A screen not mounted yet reads its exercise from storage; a mounted one obeys the command.
    if (stepId) {
      store(v === 3 ? "wtg.trioStep" : "wtg.stepId", stepId);
      setCommand({ stepId, n: Date.now() });
    }
    if (v === "wtc") {
      // The study, on the fugue the tutorial listened to.
      store("wtg.wtcFugue", FUGUE_ID);
      store("wtg.wtcPiece", "fugue");
      setWtcView("study");
    }
    setVoices(v);
    setScreen("game");
  };
  // A command is obeyed once (the game applies it in the same commit, before this effect runs):
  // a screen mounted later (another number of voices) must not replay it.
  useEffect(() => {
    if (command) setCommand(null);
  }, [command]);
  const link = { suspended: screen !== "game", command, onTutorial: openTutorial };
  const game =
    voices === "chorale" ? (
      screen === "game" && <ChoraleApp onMode={setVoices} />
    ) : voices === "preludes" ? (
      screen === "game" && <WtcRoot onMode={setVoices} />
    ) : voices === "wtc" ? (
      screen === "game" &&
      (wtcView === "study" ? <WtcStudy onVoices={setVoices} onExercises={() => setWtcView("exercises")} onTutorial={openTutorial} /> : <WtcApp onVoices={setVoices} onStudy={() => setWtcView("study")} onTutorial={openTutorial} />)
    ) : voices === 3 ? (
      <TrioApp onVoices={setVoices} {...link} />
    ) : (
      <App onVoices={setVoices} {...link} />
    );
  return (
    <>
      <div className="game-layer" hidden={screen !== "game"}>
        <Suspense fallback={<Loading />}>{game}</Suspense>
      </div>
      {screen === "tutorial" && (
        <Suspense fallback={<Loading />}>
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
        </Suspense>
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
    </>
  );
}
