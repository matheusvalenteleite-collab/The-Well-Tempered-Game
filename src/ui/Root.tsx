import { lazy, Suspense, useEffect, useState } from "react";
import { App } from "./App.tsx";
import { TrioApp } from "./TrioApp.tsx";
import { t } from "./i18n.ts";
import { Tour } from "./Tour.tsx";
import { store, stored } from "./shared.ts";
import { FUGUE_ID } from "../tutorial/fugue-id.ts";
import { ModeIntro, StartScreen, INTRO_LESSON } from "./Orientation.tsx";
import { HomeContext, type Family } from "./ModeSelect.tsx";
import { setBeta } from "./beta.ts";

// Loaded when first opened (the first download on a phone was one 10 MB file): the Well-Tempered
// Clavier, with its 48 pieces, and the tutorial.
const WtcApp = lazy(() => import("./WtcApp.tsx").then((m) => ({ default: m.WtcApp })));
const WtcStudy = lazy(() => import("./WtcStudy.tsx").then((m) => ({ default: m.WtcStudy })));
// The composer: a fugue on the player's own subject (docs/wtc/COMPOSE.md).
const ComposeApp = lazy(() => import("./ComposeApp.tsx").then((m) => ({ default: m.ComposeApp })));
// Four voices (D148), loaded when first opened.
const QuartetApp = lazy(() => import("./QuartetApp.tsx").then((m) => ({ default: m.QuartetApp })));
const Tutorial = lazy(() => import("./Tutorial.tsx").then((m) => ({ default: m.Tutorial })));
// The chorales (C4) and the WTC preludes and harmony (C6, C14), from the chorale session.
const ChoraleApp = lazy(() => import("./ChoraleApp.tsx").then((m) => ({ default: m.ChoraleApp })));
const WtcRoot = lazy(() => import("./WtcRoot.tsx").then((m) => ({ default: m.WtcRoot })));

/** The screens: two voices, three, the Well-Tempered Clavier (study and exercises), the chorales,
 * and the WTC preludes and harmony. */
export type Mode = 2 | 3 | 4 | "wtc" | "chorale" | "preludes";
const MODES: Mode[] = [2, 3, 4, "wtc", "chorale", "preludes"];
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
  const [wtcView, setWtcView] = useState<"study" | "exercises" | "compose">(() => stored<"study" | "exercises" | "compose">("wtg.wtcView", "study", (v) => v === "study" || v === "exercises" || v === "compose"));
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
  const openGame = (v: Mode, stepId?: string) => {
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
  // D157: every launch opens on the start screen, the three modes; a newcomer (no stars, no
  // tutorial yet) is also told what the game is (D149's welcome).
  const [home, setHome] = useState(true);
  /** The game is mounted from the first choice on, and kept (hidden) under the start screen after. */
  const [started, setStarted] = useState(false);
  const newcomer = () => !stored("wtg.welcomed", false, (v) => typeof v === "boolean") && stored<string[]>("wtg.stars", [], (v) => Array.isArray(v)).length === 0 && stored<unknown>("wtg.tutorial", null) === null;
  const [welcome] = useState(newcomer);
  /** Remounts the two-voice screen after the start screen, so that it reads the learner's choice. */
  const [welcomeKey, setWelcomeKey] = useState(0);
  const leaveHome = (beta?: boolean) => {
    // A newcomer's first choice sets the real setup (D142) unless they asked to explore everything.
    if (newcomer()) {
      setBeta(beta ?? false);
      setWelcomeKey((k) => k + 1);
    }
    store("wtg.welcomed", true);
    setHome(false);
    setStarted(true);
    // The start screen may have been scrolled (on a phone): the game opens at the top.
    window.scrollTo(0, 0);
  };
  /** A mode from the start screen: Fux on the number of voices last used, the WTC on its study. */
  const openFamily = (f: Family) => {
    if (f === "fux") setVoices(typeof voices === "number" ? voices : 2);
    else if (f === "chorale") setVoices("chorale");
    else setVoices(voices === "preludes" ? "preludes" : "wtc");
    leaveHome();
  };
  // D149: the first time a mode opens, what it is and what it asks of the learner.
  const [introSeen, setIntroSeen] = useState<string[]>(() => stored<string[]>("wtg.introSeen", [], (v) => Array.isArray(v)));
  const intro = !home && screen === "game" && String(voices) in INTRO_LESSON && !introSeen.includes(String(voices)) ? String(voices) : null;
  const closeIntro = () => {
    if (!intro) return;
    const next = [...introSeen, intro];
    setIntroSeen(next);
    store("wtg.introSeen", next);
  };
  const link = { suspended: screen !== "game" || home, command, onTutorial: openTutorial };
  // The Well-Tempered Clavier and chorale screens have no pause: they close under the tutorial and the start screen.
  const shown = screen === "game" && !home;
  const game =
    voices === "chorale" ? (
      shown && <ChoraleApp onMode={setVoices} onTutorial={openTutorial} />
    ) : voices === "preludes" ? (
      shown && <WtcRoot onMode={setVoices} onTutorial={openTutorial} />
    ) : voices === "wtc" ? (
      shown &&
      (wtcView === "study" ? (
        <WtcStudy onVoices={setVoices} onExercises={() => setWtcView("exercises")} onCompose={() => setWtcView("compose")} onTutorial={openTutorial} />
      ) : wtcView === "compose" ? (
        <ComposeApp onVoices={setVoices} onStudy={() => setWtcView("study")} onExercises={() => setWtcView("exercises")} onTutorial={openTutorial} />
      ) : (
        <WtcApp onVoices={setVoices} onStudy={() => setWtcView("study")} onCompose={() => setWtcView("compose")} onTutorial={openTutorial} />
      ))
    ) : voices === 4 ? (
      <QuartetApp onVoices={setVoices} {...link} />
    ) : voices === 3 ? (
      <TrioApp onVoices={setVoices} {...link} />
    ) : (
      <App key={welcomeKey} onVoices={setVoices} {...link} />
    );
  const start = home && screen === "game" && (
      <StartScreen
        newcomer={welcome}
        onMode={openFamily}
        onTutorial={() => {
          store("wtg.quickSeen", true); // the tutorial teaches what the quick start would
          leaveHome();
          openTutorial();
        }}
        onExplore={() => {
          store("wtg.quickSeen", true);
          leaveHome(true);
        }}
      />
  );
  return (
    <HomeContext.Provider value={() => setHome(true)}>
      {start}
      {started && (
        <div className="game-layer" hidden={screen !== "game" || home}>
          <Suspense fallback={<Loading />}>{game}</Suspense>
        </div>
      )}
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
      {intro && (
        <ModeIntro
          mode={intro}
          onClose={closeIntro}
          onLearn={(lesson) => {
            closeIntro();
            openTutorial(lesson);
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
    </HomeContext.Provider>
  );
}
